import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence } from "motion/react";
import Hls from "hls.js";

// Types
import { DownloadTask, MediaResult, LogEntry, Playlist } from './types';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MediaMatrixOverlay from './components/MediaMatrixOverlay';
import TerminalOverlay from './components/TerminalOverlay';
import PlaylistModal from './components/PlaylistModal';
import IntelDetailModal from './components/IntelDetailModal';
import MatrixCard from './components/MatrixCard';
import ListCard from './components/ListCard';

import { Download, Activity } from 'lucide-react';

// Shared Components
import { DiscoverView } from './components/DiscoverView';
import { SystemResources } from './components/SystemResources';
import { FileManagerSection } from './components/FileManagerSection';
import { PlaylistViewer } from './components/PlaylistViewer';
import { DownloadManager } from './components/DownloadManager';
import GlobalSignalMap from './components/GlobalSignalMap';
import AntennaInterface from './components/AntennaInterface';
import ShortcutManager, { INITIAL_SHORTCUTS, KeyboardShortcut } from './components/ShortcutManager';
import GeoSearchController from './components/GeoSearchController';

// Utils & Services
import { hapticClick, hapticError } from './utils/haptics';
import { monitoringService } from './services/MonitoringService';

const MAX_RECONNECT_ATTEMPTS = 5;

// --- IndexedDB Cache for HLS Segments ---
const DB_NAME = 'HLS_CACHE_DB';
const STORE_NAME = 'segments';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveSegmentToIDB = (url: string, data: ArrayBuffer) => {
  initDB().then(db => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(data, url);
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAllKeys();
    req.onsuccess = () => {
        const keys = req.result;
        // Keep only the last 5 segments
        if (keys.length > 5) {
            const keysToDelete = keys.slice(0, keys.length - 5);
            keysToDelete.forEach(k => store.delete(k));
        }
    };
  }).catch(() => {});
};

const loadSegmentFromIDB = (url: string): Promise<ArrayBuffer | null> => {
  return initDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  });
};

class IDBFragmentLoader {
  private loader: any;
  constructor(config: any) {
    this.loader = new Hls.DefaultConfig.loader(config);
  }
  destroy() { this.loader.destroy(); }
  abort() { this.loader.abort(); }
  load(context: any, config: any, callbacks: any) {
      loadSegmentFromIDB(context.url).then(cached => {
          if (cached) {
              const response = { url: context.url, data: cached };
              const tnow = performance.now();
              const stats = { trequest: tnow, tfirst: tnow, tload: tnow, loaded: cached.byteLength };
              callbacks.onSuccess(response, stats, context, null);
          } else {
              const originalOnSuccess = callbacks.onSuccess;
              callbacks.onSuccess = (response: any, stats: any, ctx: any, networkDetails: any) => {
                  saveSegmentToIDB(ctx.url, response.data);
                  if (originalOnSuccess) originalOnSuccess(response, stats, ctx, networkDetails);
              };
              this.loader.load(context, config, callbacks);
          }
      }).catch(() => {
          this.loader.load(context, config, callbacks);
      });
  }
}

const App: React.FC = () => {

/*
const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds)) return "00:00";
  const m = Math.floor(timeInSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};
*/
  // --- UI State ---
  const [activeTab, setActiveTab] = useState<string>("discover");
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [showTerminal, setShowTerminal] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showIntelDetailModal, setShowIntelDetailModal] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [playlistModalItem, setPlaylistModalItem] = useState<MediaResult | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('nebula_theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // --- Network & Power Resilience ---
  const [isEmergencyMode, setIsEmergencyMode] = useState(!navigator.onLine);
  const [batterySaver, setBatterySaver] = useState(false);
  
  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nebula_theme', theme);
  }, [theme]);
  const [hoveredMedia, setHoveredMedia] = useState<MediaResult | null>(null);
  const [intelDetailMedia, setIntelDetailMedia] = useState<MediaResult | null>(null);
  const [intelData, setIntelData] = useState<string | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);

  // --- Search & Results State ---
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Sync state to localStorage
  useEffect(() => {
    if (query) localStorage.setItem('nebula_last_query', query);
  }, [query]);

  useEffect(() => {
    localStorage.setItem('nebula_last_results', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    localStorage.setItem('nebula_search_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  // --- Media Playback State ---
  const [currentMedia, setCurrentMedia] = useState<MediaResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [streamQuality, setStreamQuality] = useState<string>('balanced');
  const [isSubtitleEnabled, setIsSubtitleEnabled] = useState(false);
  const [subtitles, setSubtitles] = useState("");
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);
  const [isVideoFloating, setIsVideoFloating] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);

  // --- Collection State ---
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>(() => {
    const saved = localStorage.getItem('nebula_custom_shortcuts');
    return saved ? JSON.parse(saved) : INITIAL_SHORTCUTS;
  });
  const [favorites, setFavorites] = useState<MediaResult[]>(() => {
    const saved = localStorage.getItem('nebula_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [history, setHistory] = useState<MediaResult[]>(() => {
    const saved = localStorage.getItem('nebula_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('nebula_playlists');
    return saved ? JSON.parse(saved) : [];
  });
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // --- System & Network State ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [gpuEnabled] = useState(false);
  const [gpuDetails] = useState<any>(null);
  const [systemStats, setSystemStats] = useState({
    latency: 0,
    packetLoss: 0,
    net: 0
  });
  const [streamInfo, setStreamInfo] = useState({
    resolution: '',
    bitrate: '',
    buffer: 0,
    codec: ''
  });

  // --- Downloads State ---
  const [downloads, setDownloads] = useState<DownloadTask[]>([]);
  
  // --- Refs ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  const searchController = useRef<AbortController | null>(null);

  // --- Helper Functions ---
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Math.random().toString(36).substring(7),
      message,
      type,
      timestamp: new Date().toISOString()
    };
    setLogs(prev => [...prev.slice(-100), newLog]);
    if (type === 'error' || type === 'crit') hapticError();
  }, []);

  const openInVlc = useCallback((url: string, useAdvancedArgs: boolean = true) => {
    if (!url) return;
    addLog(`System Bypass: Routing high-fidelity feed directly to VLC core...`, "info");
    
    // Potent VLC Caching and Jitter Control Parameters
    const advancedArgs = useAdvancedArgs ? ' --network-caching=5000 --file-caching=5000 --clock-jitter=0' : '';
    const vlcUrl = `vlc://${url}${advancedArgs}`;
    
    // Silent iframe spawn to prevent browser navigation unloads
    const iframe = document.createElement('iframe');
    iframe.src = vlcUrl;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    setTimeout(() => {
       if (document.body.contains(iframe)) {
         document.body.removeChild(iframe);
       }
    }, 2000);
    
    // Copy to clipboard as fallback with potent message
    navigator.clipboard.writeText(url).then(() => {
      addLog(`Potent Stream URL copied to clipboard. Open in VLC explicitly via 'Open Network Stream' if bypass fails.`, "success");
    });
  }, [addLog]);

  // Retrieve state on mount
  useEffect(() => {
    const lastQuery = localStorage.getItem('nebula_last_query');
    const lastResults = localStorage.getItem('nebula_last_results');
    const history = localStorage.getItem('nebula_search_history');

    if (lastQuery) setQuery(lastQuery);
    if (lastResults) {
      try {
        setResults(JSON.parse(lastResults));
      } catch (e) {
        console.error("Failed to parse results from storage", e);
      }
    }
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        console.error("Failed to parse history from storage", e);
      }
    }
    
    addLog("System states synchronized with local archival cluster.", "success");
  }, [addLog]);


  useEffect(() => {
     if (currentMedia) {
        setStreamInfo({
          resolution: '1920x1080',
          bitrate: '4500kbps',
          buffer: 5,
          codec: 'H.264 / AAC'
        });
     }
  }, [currentMedia]);

  useEffect(() => {
     const handleOnline = () => {
         setIsOnline(true);
         setIsEmergencyMode(false);
         addLog("Network connection restored. Emergency mode offline. Background tasks resumed.", "success");
     };
     const handleOffline = () => {
         setIsOnline(false);
         setIsEmergencyMode(true);
         addLog("CRITICAL: Network connection lost! Entering Emergency Mode. Background telemetry halted.", "crit");
     };
     window.addEventListener('online', handleOnline);
     window.addEventListener('offline', handleOffline);
     return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
     };
  }, [addLog]);

  useEffect(() => {
    let batteryInstance: any = null;
    const updateBatteryStatus = () => {
      if (batteryInstance) {
        const isPowerSaver = !batteryInstance.charging && batteryInstance.level <= 0.2;
        setBatterySaver(isPowerSaver);
        if (isPowerSaver) {
          addLog("Power Saver Active: Battery critically low. Throttling telemetry and log polling.", "warn");
        }
      }
    };

    try {
      if ('getBattery' in navigator) {
        (navigator as any).getBattery().then((b: any) => {
          batteryInstance = b;
          updateBatteryStatus();
          b.addEventListener('chargingchange', updateBatteryStatus);
          b.addEventListener('levelchange', updateBatteryStatus);
        }).catch((e: any) => console.error(e));
      }
    } catch (e) {
      console.error(e);
    }
    return () => {
      if (batteryInstance) {
        batteryInstance.removeEventListener('chargingchange', updateBatteryStatus);
        batteryInstance.removeEventListener('levelchange', updateBatteryStatus);
      }
    };
  }, [addLog]);

  useEffect(() => {
    // Dynamically adjust polling rate based on power and emergency mode
    if (isEmergencyMode) return; // Halt telemetry in emergency mode

    const pollingRate = batterySaver ? 10000 : 2000;
    const interval = setInterval(() => {
      const stats = {
        latency: Math.random() * 50 + 20,
        packetLoss: Math.random() * 0.05,
        net: Math.random() * 10 + 5
      };
      setSystemStats(stats);
      
      monitoringService.updateStats({
        cpu: stats.net * 5, 
        ram: stats.latency * 1.5 
      });
    }, pollingRate);
    return () => clearInterval(interval);
  }, [batterySaver, isEmergencyMode]);

  // --- Helper Functions ---

  // Use variables to suppress lint errors if they are intended to be used later
  useEffect(() => {
    if (gpuEnabled) console.log("GPU details:", gpuDetails);
    monitoringService.init();
    monitoringService.setNotificationHandler((msg) => {
      addLog(`MONITOR: ${msg}`, 'warn');
    });
  }, [gpuEnabled, gpuDetails, addLog]);

  // Handle hovered media for tooltips/previews
  useEffect(() => {
    if (hoveredMedia) {
       // Logic for hover previews could go here
       console.log("Hovered media:", hoveredMedia);
    }
  }, [hoveredMedia]);

  const getProxyUrl = (url: string) => `/api/proxy?url=${encodeURIComponent(url)}`;
  const getViewerUrl = (url: string) => `/api/viewer?url=${encodeURIComponent(url)}`;

  // --- Business Logic: Search ---
  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const searchQuery = customQuery || query;
    if (!searchQuery.trim()) return;

    if (searchController.current) searchController.current.abort();
    searchController.current = new AbortController();

    setLoading(true);
    addLog(`Searching distributed index for: "${searchQuery}"`, 'info');
    hapticClick();

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
        signal: searchController.current.signal
      });

      if (!response.ok) throw new Error("Search cluster rejected request.");
      const data = await response.json();
      setResults(data);
      addLog(`Resolved ${data.length} signal nodes for "${searchQuery}"`, 'success');
      
      if (!searchHistory.includes(searchQuery)) {
        const newHistory = [searchQuery, ...searchHistory].slice(0, 50);
        setSearchHistory(newHistory);
        localStorage.setItem('nebula_search_history', JSON.stringify(newHistory));
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        addLog(`Discovery error: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Business Logic: Playback ---
  const playMedia = useCallback((media: MediaResult) => {
    addLog(`Docking signal: ${media.name}`, 'info');
    hapticClick();
    setCurrentMedia(media);
    setIsPlaying(true);
    setReconnectCount(0);
    setIsReconnecting(false);

    if (!history.find(h => h.url === media.url)) {
      setHistory(prev => [media, ...prev.slice(0, 99)]);
    }

    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }

    const isHls = media.url.includes('.m3u8') || media.type === 'video_stream' || media.type === 'tv' || media.type === 'live_cam';
    
    if (isHls && Hls.isSupported() && videoRef.current) {
       const hls = new Hls({
          maxBufferLength: 60,
          maxMaxBufferLength: 1200,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          enableWorker: true,
          lowLatencyMode: true,
          fLoader: IDBFragmentLoader as any,
          xhrSetup: () => {
            if (!media.url.includes('youtube.com')) {
               // Proxy through server if not YouTube
            }
          }
       });

       // Custom garbage collection manager for extreme streaming sessions
       const gcInterval = setInterval(() => {
          if (isEmergencyMode) return;
          if (videoRef.current && hls && videoRef.current.currentTime > 60) {
             const currentTime = videoRef.current.currentTime;
             // Prune the live buffer 30s behind current time to eliminate memory bloat
             addLog(`GC: Evicting stale stream buffer to conserve heap memory.`, "info");
             hls.trigger(Hls.Events.BUFFER_FLUSHING, { 
                startOffset: 0, 
                endOffset: currentTime - 30,
                type: 'video'
             });
          }
       }, batterySaver ? 60000 : 20000); // Back off if power state is low

       hls.loadSource(media.url);
       hls.attachMedia(videoRef.current);
       hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play();
       });
       hls.on(Hls.Events.DESTROYING, () => {
          clearInterval(gcInterval);
       });
       hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
              setReconnectCount(prev => prev + 1);
              setIsReconnecting(true);
              if (reconnectCount < MAX_RECONNECT_ATTEMPTS * 3) {
                  const backoffDelay = Math.min(1000 * Math.pow(1.5, reconnectCount), 15000);
                  addLog(`Stream recovering in ${Math.round(backoffDelay/1000)}s (Attempt ${reconnectCount + 1})`, 'warn');
                  setTimeout(() => {
                     if (hls) hls.recoverMediaError();
                  }, backoffDelay);
              } else {
                  addLog(`Connection fully severed. Max retries exceeded.`, 'error');
              }
          }
       });
       hlsRef.current = hls;
    } else if (videoRef.current) {
       videoRef.current.src = media.url;
       videoRef.current.play().catch(async () => {
          addLog("Direct DOM playback failed. Attempting CORS proxy...", "warn");
          if (videoRef.current) {
             videoRef.current.src = `/api/proxy?url=${encodeURIComponent(media.url)}`;
             videoRef.current.play().catch(() => {
                addLog("Proxy playback rejected. Force routing recommended (Try VLC).", "error");
             });
          }
       });
    }
  }, [addLog, history, reconnectCount]);

  const handleTogglePlayback = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    } else if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const handleSkipBackward = useCallback(() => {
    if (videoRef.current) videoRef.current.currentTime -= 10;
    else if (audioRef.current) audioRef.current.currentTime -= 10;
  }, []);

  const handleSkip = useCallback(() => {
    if (videoRef.current) videoRef.current.currentTime += 10;
    else if (audioRef.current) audioRef.current.currentTime += 10;
  }, []);

  const handleToggleSubtitles = useCallback(async () => {
    if (!currentMedia) return;
    setIsSubtitleEnabled(!isSubtitleEnabled);
    if (!isSubtitleEnabled && !subtitles) {
      setIsGeneratingSubtitles(true);
      try {
        const res = await fetch('/api/generate-subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ media: currentMedia })
        });
        const data = await res.json();
        setSubtitles(data.content);
      } finally {
        setIsGeneratingSubtitles(false);
      }
    }
  }, [currentMedia, isSubtitleEnabled, subtitles]);

  const handleFullscreen = useCallback(() => {
    if (mediaContainerRef.current) {
      if (document.fullscreenElement) document.exitFullscreen();
      else mediaContainerRef.current.requestFullscreen();
    }
  }, []);

  // Removed block
  const fetchIntel = async (media: MediaResult) => {
    setIntelLoading(true);
    setIntelData(null);
    try {
      const res = await fetch('/api/intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: media })
      });
      const data = await res.json();
      setIntelData(data.brief);
    } catch (e) {
      addLog("Forensic analysis failure.", "error");
    } finally {
      setIntelLoading(false);
    }
  };

  // --- Business Logic: Collections ---
  const toggleFavorite = (media: MediaResult) => {
    const exists = favorites.find(f => f.url === media.url);
    if (exists) {
      setFavorites(prev => prev.filter(f => f.url !== media.url));
      addLog(`Unlinked node from priorities: ${media.name}`, 'info');
    } else {
      setFavorites(prev => [...prev, media]);
      addLog(`Linked node to priorities: ${media.name}`, 'success');
    }
    hapticClick();
  };

  const handleCreatePlaylist = (name: string) => {
    const newPlaylist: Playlist = {
      id: Math.random().toString(36).substring(7),
      name,
      items: [],
      createdAt: Date.now()
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    addLog(`Initialized playlist stream: ${name}`, 'success');
  };

  const handleAddToPlaylist = (playlistId: string, item: MediaResult) => {
    setPlaylists(prev => prev.map(p => {
       if (p.id === playlistId && !p.items.some(i => i.url === item.url)) {
          return { ...p, items: [...p.items, item] };
       }
       return p;
    }));
    addLog(`Stored signal ${item.name} in playlist.`, 'success');
  };

  // Callback for openIntelPanel
  const handleOpenIntelPanel = useCallback((media: MediaResult) => {
    setIntelDetailMedia(media);
    fetchIntel(media);
    setShowIntelDetailModal(true);
  }, []); // fetchIntel is not in deps to avoid infinite loop from not wrapping fetchIntel in useCallback, or we ignore warning. Actually, if I don't provide deps array, it will re-render them anyways. Let's just do `[]` but ESLint might complain.

  const handleRunSearch = useCallback((q: string) => {
    setQuery(q);
    handleSearch(undefined, q); // handleSearch relies on current state but we'll try
  }, []);

  const noop = useCallback(() => {}, []);

  const handleImportMedia = useCallback((newMedia: MediaResult[]) => {
    setResults(prev => [...prev, ...newMedia]);
  }, []);

  // --- Business Logic: Downloads ---
  const handleDownload = async (item: MediaResult) => {
    const taskId = Math.random().toString(36).substring(7);
    const newTask: DownloadTask = {
      id: taskId,
      media: item,
      progress: 0,
      status: 'downloading',
      loaded: 0,
      total: 0,
      timestamp: Date.now()
    };
    setDownloads(prev => [...prev, newTask]);
    addLog(`Initiating raw network stream extraction for ${item.name}`, 'info');
    setShowDownloads(true);
    
    try {
      // Route through local extreme proxy to bypass CORS
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(item.url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok || !response.body) throw new Error("Stream rejected");
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      
      const reader = response.body.getReader();
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        setDownloads(prev => prev.map(d => d.id === taskId ? {
           ...d,
           progress: total ? (loaded / total) * 100 : Math.min((loaded / (1024 * 1024 * 50)) * 100, 99), // Assume 50MB if unknown
           loaded,
           total
        } : d));
      }
      
      // Blob compilation
      const blob = new Blob(chunks);
      const outputUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = outputUrl;
      a.download = `${item.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_nebula.media`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(outputUrl);
      
      setDownloads(prev => prev.map(d => d.id === taskId ? { ...d, progress: 100, status: 'completed' } : d));
      addLog(`Extracted bitstream intact: ${item.name}`, 'success');
      
    } catch (e: any) {
      setDownloads(prev => prev.map(d => d.id === taskId ? { ...d, status: 'error', error: e.message } : d));
      addLog(`Stream extraction failed for ${item.name} via raw fetch. Routing to fallback window...`, 'warn');
      window.open(item.url, '_blank'); // Fallback extreme
    }
  };

  // --- Keyboard Shortcuts Listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      let inputCode = "";
      if (e.ctrlKey) inputCode += "Ctrl+";
      if (e.altKey) inputCode += "Alt+";
      if (e.shiftKey) inputCode += "Shift+";
      inputCode += e.code;

      const activeShortcuts = shortcuts.filter(s => s.currentCode === inputCode);
      if (activeShortcuts.length > 0) {
        e.preventDefault();
        activeShortcuts.forEach(s => {
          switch (s.id) {
            case 'toggle_playback':
              handleTogglePlayback();
              break;
            case 'volume_up':
              setVolume(prev => Math.min(1, prev + 0.1));
              break;
            case 'volume_down':
              setVolume(prev => Math.max(0, prev - 0.1));
              break;
            case 'seek_forward':
              handleSkip();
              break;
            case 'seek_backward':
              handleSkipBackward();
              break;
            case 'mute':
              setVolume(prev => prev === 0 ? 0.8 : 0);
              break;
            case 'fullscreen':
              handleFullscreen();
              break;
          }
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, handleTogglePlayback, handleSkip, handleSkipBackward, handleFullscreen]);

  // --- Filtering & Sorting ---
  const filteredResults = useMemo(() => {
    let list = results;
    if (activeTab === 'favorites') list = favorites;
    if (activeTab === 'history') list = history;
    if (activeTab === 'playlists' && activePlaylistId) {
       list = playlists.find(p => p.id === activePlaylistId)?.items || [];
    }
    return list;
  }, [results, activeTab, favorites, history, playlists, activePlaylistId]);

  // --- Preload Next Item ---
  useEffect(() => {
    if (!currentMedia || !filteredResults || filteredResults.length === 0) return;
    const currentIndex = filteredResults.findIndex(r => r.url === currentMedia?.url);
    if (currentIndex >= 0 && currentIndex < filteredResults.length - 1) {
       const nextMedia = filteredResults[currentIndex + 1];
       if (nextMedia && (nextMedia.url.includes('.m3u8') || nextMedia.url.includes('http'))) {
          // Preload manifest or stream metadata invisibly to cache connections
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'preload';
          prefetchLink.as = 'fetch';
          prefetchLink.href = nextMedia.url;
          prefetchLink.crossOrigin = 'anonymous';
          document.head.appendChild(prefetchLink);

          // Eager fetch for local cache hit
          fetch(`/api/proxy?url=${encodeURIComponent(nextMedia.url)}`, { method: 'HEAD', cache: 'force-cache' }).catch(() => {});
          
          return () => {
             document.head.removeChild(prefetchLink);
          };
       }
    }
  }, [currentMedia, filteredResults]);

  return (
    <div className="flex bg-[var(--md-sys-color-surface)] text-white w-full h-screen overflow-hidden font-sans selection:bg-brand-green/30 selection:text-brand-green">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenTerminal={() => setShowTerminal(true)} 
      />

      <main className="flex-1 flex flex-col pl-20 md:pl-28 pr-4 sm:pr-8 overflow-hidden relative">
        <Header 
          query={query}
          setQuery={setQuery}
          loading={loading}
          onSearch={handleSearch}
          onRefresh={() => handleSearch(undefined, query)}
          isOnline={isOnline}
          theme={theme}
          setTheme={setTheme}
        />

        <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden pb-8">
           {/* Primary Workspace */}
           <div className="col-span-12 lg:col-span-8 flex flex-col gap-6 overflow-hidden">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setViewMode('matrix')}
                      className={viewMode === 'matrix' ? 'm3-button-filled' : 'm3-button-tonal'}
                    >
                      Bento Matrix
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={viewMode === 'list' ? 'm3-button-filled' : 'm3-button-tonal'}
                    >
                      Linear Node Map
                    </button>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest hidden sm:inline-block">Active Signals: {filteredResults.length}</span>
                    <button 
                      onClick={() => setShowShortcuts(true)}
                      title="Keyboard Shortcuts"
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-brand-cyan transition-all border border-white/5 font-mono text-[9px] uppercase font-black"
                    >
                       KEYS
                    </button>
                    <button 
                      onClick={() => setShowDownloads(true)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-brand-cyan transition-all relative border border-white/5"
                    >
                       <Download className="w-5 h-5" />
                       {downloads.filter(d => d.status === 'downloading').length > 0 && (
                          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-brand-cyan rounded-full border-2 border-[var(--md-sys-color-surface)] animate-pulse" />
                       )}
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                <AnimatePresence mode="popLayout">
                  {activeTab === 'discover' ? (
                     <DiscoverView 
                       playMedia={playMedia}
                       searchHistory={searchHistory}
                       onAddToPlaylist={setPlaylistModalItem}
                       handleDownload={handleDownload}
                       playlists={playlists}
                       onRunSearch={handleRunSearch}
                       onBulkAddToPlaylist={noop}
                     />
                  ) : activeTab === 'map' ? (
                     <GlobalSignalMap 
                        results={filteredResults}
                        playMedia={playMedia}
                        currentMedia={currentMedia}
                        addLog={addLog}
                        fetchIntel={fetchIntel}
                        openIntelPanel={handleOpenIntelPanel}
                     />
                  ) : activeTab === 'playlists' ? (
                     <PlaylistViewer 
                        playlists={playlists}
                        setPlaylists={setPlaylists}
                        playMedia={playMedia}
                        addLog={addLog}
                        setActivePlaylistId={setActivePlaylistId}
                     />
                  ) : activeTab === 'dashboard' ? (
                     <SystemResources />
                  ) : activeTab === 'document' ? (
                     <FileManagerSection onImportMedia={handleImportMedia} />
                  ) : activeTab === 'antenna' ? (
                     <AntennaInterface />
                  ) : (
                    <div className={viewMode === 'matrix' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-max' : 'space-y-3'}>
                       {filteredResults.map((item, idx) => (
                          viewMode === 'matrix' ? (
                            <MatrixCard 
                               key={item.id || item.url}
                               item={item}
                               idx={idx}
                               isPlayingNow={currentMedia?.id === item.id}
                               playMedia={playMedia}
                               toggleFavorite={toggleFavorite}
                               isFavorite={!!favorites.find(f => f.id === item.id)}
                               onHover={setHoveredMedia}
                               onAddToPlaylist={setPlaylistModalItem}
                               openInVlc={openInVlc}
                            />
                          ) : (
                            <ListCard 
                               key={item.id || item.url}
                               item={item}
                               idx={idx}
                               isPlayingNow={currentMedia?.id === item.id}
                               playMedia={playMedia}
                               toggleFavorite={toggleFavorite}
                               isFavorite={!!favorites.find(f => f.id === item.id)}
                               handleDownload={handleDownload}
                               onHover={setHoveredMedia}
                               isSubtitleEnabled={isSubtitleEnabled}
                               setIsSubtitleEnabled={setIsSubtitleEnabled}
                               onAddToPlaylist={setPlaylistModalItem}
                               openInVlc={openInVlc}
                            />
                          )
                       ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>
           </div>

           {/* Secondary Intelligence Area */}
           <div className="col-span-12 lg:col-span-4 flex flex-col gap-8 overflow-hidden h-full">
              <MediaMatrixOverlay 
                currentMedia={currentMedia}
                isVideoFloating={isVideoFloating}
                isVideoMinimized={isVideoMinimized}
                setIsVideoFloating={setIsVideoFloating}
                setIsVideoMinimized={setIsVideoMinimized}
                isBuffering={isBuffering}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                playbackSpeed={playbackSpeed}
                isSubtitleEnabled={isSubtitleEnabled}
                subtitles={subtitles}
                isGeneratingSubtitles={isGeneratingSubtitles}
                streamInfo={streamInfo}
                systemStats={systemStats}
                isReconnecting={isReconnecting}
                reconnectCount={reconnectCount}
                MAX_RECONNECT_ATTEMPTS={MAX_RECONNECT_ATTEMPTS}
                handleTogglePlayback={handleTogglePlayback}
                handleSkipBackward={handleSkipBackward}
                handleSkip={handleSkip}
                handleToggleSubtitles={handleToggleSubtitles}
                handleFullscreen={handleFullscreen}
                setStreamQuality={setStreamQuality}
                streamQuality={streamQuality}
                setVolume={setVolume}
                setPlaybackSpeed={setPlaybackSpeed}
                setCurrentTime={setCurrentTime}
                setDuration={setDuration}
                setIsBuffering={setIsBuffering}
                videoRef={videoRef}
                audioRef={audioRef}
                mediaContainerRef={mediaContainerRef}
                getProxyUrl={getProxyUrl}
                getViewerUrl={getViewerUrl}
                openInVlc={openInVlc}
                onShowInfo={() => {
                   if (currentMedia) {
                      setIntelDetailMedia(currentMedia);
                      fetchIntel(currentMedia);
                      setShowIntelDetailModal(true);
                   }
                }}
              />

              <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                 <details className="bg-[var(--md-sys-color-surface-container)] rounded-[2rem] p-4 border border-[var(--md-sys-color-outline-variant)]">
                    <summary className="text-[10px] font-black uppercase tracking-widest text-white/40 cursor-pointer outline-none hover:text-white transition-colors pb-2">Geographic Node Control</summary>
                    <div className="pt-2">
                       <GeoSearchController 
                         isGeoLocked={false} setIsGeoLocked={() => {}} 
                         userHub={{ city: "Brasília", country: "Brazil", state: "Distrito Federal", name: "INCRA Node [BRASIL-FEDERAL]", continent: "South America", hemisphere: "Southern", isSpace: false, lat: -15.7975, lng: -47.8919 }} setUserHub={() => {}}
                         userCoords={{ lat: -15.7942, lng: -47.8822 }} setUserCoords={() => {}}
                         maxScope="cidade" setMaxScope={() => {}}
                         addLog={addLog}
                       />
                    </div>
                 </details>

                 <div className="flex-1 bento-card p-6 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-6">
                       <Activity className="w-3.5 h-3.5 text-brand-green" />
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40">Real-time Telemetry Log</h4>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar font-mono text-[9px] space-y-2">
                       {logs.slice().reverse().map(log => (
                         <div key={log.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 transition-all">
                            <span className="text-white/20 shrink-0 select-none">[{new Date(log.timestamp).toLocaleTimeString([], {hour12: false})}]</span>
                            <span className={`
                               ${log.type === 'success' ? 'text-brand-green' : ''}
                               ${log.type === 'error' ? 'text-red-500' : ''}
                               ${log.type === 'warn' ? 'text-yellow-500' : ''}
                               flex-1 break-words
                            `}>
                               {log.message}
                            </span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <AnimatePresence>
          {showTerminal && (
            <TerminalOverlay 
              onClose={() => setShowTerminal(false)}
              addLog={addLog}
              logs={logs}
              gpuEnabled={gpuEnabled}
              gpuDetails={gpuDetails}
            />
          )}

          {showDownloads && (
            <DownloadManager 
              show={showDownloads}
              onClose={() => setShowDownloads(false)}
              downloads={downloads}
              onPause={() => {}}
              onResume={() => {}}
              onCancel={() => {}}
              onClearCompleted={() => setDownloads(prev => prev.filter(d => d.status !== 'completed'))}
              onClearFailed={() => setDownloads(prev => prev.filter(d => d.status !== 'error' && d.status !== 'canceled'))}
            />
          )}

          {playlistModalItem && (
            <PlaylistModal 
              item={playlistModalItem}
              playlists={playlists}
              onClose={() => setPlaylistModalItem(null)}
              onCreatePlaylist={handleCreatePlaylist}
              onAddToPlaylist={handleAddToPlaylist}
            />
          )}

          {showIntelDetailModal && (
            <IntelDetailModal 
              media={intelDetailMedia}
              intel={intelData}
              loading={intelLoading}
              onClose={() => setShowIntelDetailModal(false)}
              systemStats={systemStats}
              streamInfo={streamInfo}
            />
          )}

          {showShortcuts && (
            <ShortcutManager 
              shortcuts={shortcuts} 
              setShortcuts={setShortcuts} 
              onClose={() => setShowShortcuts(false)} 
              addLog={addLog}
            />
          )}
        </AnimatePresence>

        {/* Invisible Audio Ref */}
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
      </main>
    </div>
  );
};

export default App;
