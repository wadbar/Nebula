/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Radio, 
  Video, 
  Globe, 
  Terminal, 
  Shield, 
  Activity, 
  Volume2, 
  Maximize2, 
  Play, 
  Pause,
  Square,
  ExternalLink,
  Cpu,
  Monitor,
  Zap,
  Star,
  Trash2,
  ChevronRight,
  Command,
  Lock,
  Clock,
  Cpu as CpuIcon,
  Settings,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Fingerprint,
  Unlink,
  ShieldCheck,
  List,
  Grid,
  Map as MapIcon,
  Navigation,
  SkipForward,
  Download,
  Captions as SubtitlesIcon,
  PlusSquare,
  Image as ImageIcon,
  FileText,
  Gamepad2,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import Hls from "hls.js";
import { APIProvider, Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

interface NodeLocation {
  lat: number;
  lng: number;
  id: string;
  status: 'active' | 'latency';
}

interface DownloadTask {
  id: string;
  media: MediaResult;
  progress: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error' | 'canceled';
  loaded: number;
  total: number;
  error?: string;
  timestamp: number;
}

interface MediaResult {
  name: string;
  url: string;
  type: "radio" | "video" | "live_cam" | "media" | "image" | "document" | "rom";
  category?: string;
  description: string;
  tags: string[];
  health?: 'optimal' | 'degraded' | 'unknown';
  relevance_score?: number;
  rating?: number;
  engagement?: "low" | "medium" | "high";
  traffic?: 'minimal' | 'low' | 'medium' | 'high' | 'heavy' | 'extreme';
  threat?: 'none' | 'minimal' | 'low' | 'guarded' | 'high' | 'critical';
  chain_verified?: boolean;
  registry_hash?: string;
  last_block?: number;
}

interface ValidationResult {
  valid: boolean;
  integrity_score: number;
  consensus_nodes: number;
  nodes: NodeLocation[];
  signature: string;
  block_timestamp: string;
}

const DARK_MAP_ID = "dark_mesh_v1";

const NetworkMap = ({ nodes, active }: { nodes: NodeLocation[], active: boolean }) => {
  const map = useMap();
  
  useEffect(() => {
    if (map && nodes.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      nodes.forEach(node => bounds.extend(node));
      map.fitBounds(bounds);
    }
  }, [map, nodes]);

  if (!active) return null;

  return (
    <>
      {nodes.map((node) => (
        <AdvancedMarker
          key={node.id}
          position={{ lat: node.lat, lng: node.lng }}
        >
          <div className="relative">
             <div className={`w-3 h-3 rounded-full ${node.status === 'active' ? 'bg-brand-green shadow-[0_0_10px_#00FF41]' : 'bg-red-500 shadow-[0_0_10px_#EF4444]'} animate-pulse`} />
             <div className="absolute -inset-2 bg-brand-green/10 rounded-full animate-ping opacity-20" />
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
};

interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'warn' | 'success' | 'security';
  timestamp: string;
}

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [results, setResults] = useState<MediaResult[]>([]);
  const [favorites, setFavorites] = useState<MediaResult[]>([]);
  const [history, setHistory] = useState<MediaResult[]>([]);
  const [playlists, setPlaylists] = useState<{ id: string; name: string; items: MediaResult[] }[]>([]);
  const [downloads, setDownloads] = useState<DownloadTask[]>(() => {
    const saved = localStorage.getItem('nebula_downloads');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((t: DownloadTask) => ({
          ...t,
          status: (t.status === 'downloading' || t.status === 'queued') ? 'paused' : t.status
        }));
      } catch (e) {}
    }
    return [];
  });
  
  useEffect(() => {
    // Save all except we don't need to do anything special here as long as we parse it properly on load.
    // However, saving Uint8Arrays (the partial chunks) won't work across reloads natively unless indexedDB
    // We will just lose partial local chunks if they reload, so "progress" might reset to what was saved in task.loaded
    localStorage.setItem('nebula_downloads', JSON.stringify(downloads.map(t => ({ ...t, loaded: t.loaded, total: t.total }))));
  }, [downloads]);
  const [showDownloads, setShowDownloads] = useState(false);
  const downloadControllers = useRef<Record<string, AbortController | null>>({});
  const maxConcurrentDownloads = 2;
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = ["All", "Security", "Infrastructure", "Intelligence", "Public", "Natureza"];
  const categoryIcons: Record<string, any> = {
    All: Globe,
    Security: Shield,
    Infrastructure: CpuIcon,
    Intelligence: Fingerprint,
    Public: Activity,
    Natureza: Zap
  };
  const [currentMedia, setCurrentMedia] = useState<MediaResult | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "radio" | "video" | "live_cam" | "media" | "image" | "document" | "rom" | "favorites" | "history" | "playlists">("all");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [eqPreset, setEqPreset] = useState<"flat" | "bass_boost" | "treble_boost" | "balanced">("flat");
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLogs, setTerminalLogs] = useState<{role: 'user' | 'system', text: string}[]>([]);
  const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
  const [streamQuality, setStreamQuality] = useState<"low" | "med" | "high">(() => {
    const saved = localStorage.getItem('nebula_stream_quality');
    return (saved as "low" | "med" | "high") || "med";
  });

  useEffect(() => {
    localStorage.setItem('nebula_stream_quality', streamQuality);
  }, [streamQuality]);
  const [intelBrief, setIntelBrief] = useState<string | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [systemStats, setSystemStats] = useState({ cpu: 12, ram: 22, net: 45, uptime: "00:00:00" });
  const [workerActive, setWorkerActive] = useState(false);
  const [scannerStep, setScannerStep] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [isValidatingRegistry, setIsValidatingRegistry] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [isVideoFloating, setIsVideoFloating] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);
  
  // Subtitles State
  const [subtitles, setSubtitles] = useState<string>("");
  const [isSubtitleEnabled, setIsSubtitleEnabled] = useState(false);
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000; // 3 seconds

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initializing Hardware-Offloaded Signal Processor (Web Worker)
    workerRef.current = new Worker(new URL('./workers/signalWorker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      if (e.data.type === 'SIGNAL_PROCESSED') {
        const { results } = e.data;
        addLog(`[KERNEL] Node ${results.nodeId.substring(0, 8)} sanitized via Worker thread. Health: ${results.health_score}`, "success");
        setWorkerActive(false);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const startTime = Date.now();
    const itv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
      const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      
      setSystemStats({
        cpu: Math.floor(Math.random() * 15) + 5,
        ram: 24,
        net: Math.floor(Math.random() * 50) + 20,
        uptime: `${h}:${m}:${s}`
      });
    }, 1000);
    return () => clearInterval(itv);
  }, []);

  const fetchIntel = async (signal: MediaResult) => {
    setIntelLoading(true);
    setIntelBrief(null);
    try {
      const res = await fetch("/api/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retrieve intelligence");
      setIntelBrief(data.brief);
    } catch (err: any) {
      addLog(`Intel error: ${err.message || "Failed to retrieve signal intelligence."}`, "warn");
    } finally {
      setIntelLoading(false);
    }
  };

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);

  const EQ_FREQUENCIES = [60, 250, 1000, 4000, 12000];
  const PRESETS = {
    flat: [0, 0, 0, 0, 0],
    bass_boost: [10, 7, 0, -2, -4],
    treble_boost: [-5, -2, 0, 7, 11],
    balanced: [4, 2, 0, 2, 4]
  };

  // Initialize Web Audio EQ
  useEffect(() => {
    if (!audioRef.current) return;

    const initAudio = async () => {
      if (audioCtxRef.current) {
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
        return;
      }
      
      // Ensure audio element allows cross-origin for Web Audio manipulation
      if (audioRef.current) {
        audioRef.current.crossOrigin = "anonymous";
      }

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      
      const source = ctx.createMediaElementSource(audioRef.current!);
      sourceRef.current = source;

      // Analyser Node
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Create 5-band EQ
      const filters = EQ_FREQUENCIES.map((freq, i) => {
        const filter = ctx.createBiquadFilter();
        filter.type = i === 0 ? 'lowshelf' : i === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        
        // Use current preset immediately
        const initialGains = PRESETS[eqPreset as keyof typeof PRESETS] || PRESETS.flat;
        filter.gain.value = initialGains[i];
        
        return filter;
      });

      // Chain filters
      source.connect(filters[0]);
      for (let i = 0; i < filters.length - 1; i++) {
        filters[i].connect(filters[i + 1]);
      }
      filters[filters.length - 1].connect(analyser);
      analyser.connect(ctx.destination);
      filtersRef.current = filters;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    };

    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    return () => document.removeEventListener('click', handleInteraction);
  }, []);

  // Update EQ Gains when preset changes
  useEffect(() => {
    const gains = PRESETS[eqPreset];
    filtersRef.current.forEach((filter, i) => {
      filter.gain.setTargetAtTime(gains[i], audioCtxRef.current?.currentTime || 0, 0.1);
    });
    addLog(`[DSP] Signal matrix reconfigured. Profile: ${eqPreset.toUpperCase().replace('_', ' ')}. Phase alignment optimal.`, "success");
  }, [eqPreset]);

  // Load favorites and state from localStorage
  useEffect(() => {
    const savedFavs = localStorage.getItem('nebula_favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));
    
    const savedPlaylists = localStorage.getItem('nebula_playlists');
    if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));
    
    const savedHistory = localStorage.getItem('nebula_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedSignal = localStorage.getItem('nebula_last_signal');
    if (savedSignal) {
      const signal = JSON.parse(savedSignal);
      setCurrentMedia(signal);
      addLog(`[SYSTEM] Persistent signal context restored: ${signal.name}`, "info");
    }
    
    addLog("Nebula OS Kernel Loaded Successfully", "success");
    addLog("Encrypted mesh connection established: 12 peer nodes", "info");
  }, []);

  // Sync favorites
  useEffect(() => {
    localStorage.setItem('nebula_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Sync playlists
  useEffect(() => {
    localStorage.setItem('nebula_playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Sync history
  useEffect(() => {
    localStorage.setItem('nebula_history', JSON.stringify(history));
  }, [history]);

  // Sync last stream
  useEffect(() => {
    if (currentMedia) {
      localStorage.setItem('nebula_last_signal', JSON.stringify(currentMedia));
    }
  }, [currentMedia]);

  // Auto-scrolling for logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [systemLogs]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Simulated live security logs
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const routes = ["TOR_NODE_DE", "I2P_EXIT_US", "ONION_RELAY_FR", "AES_V4_ENC"];
        const route = routes[Math.floor(Math.random() * routes.length)];
        addLog(`Packet routed via ${route}: Integrity verified`, "security");
      }
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    setSystemLogs(prev => [...prev.slice(-15), {
      id: Math.random().toString(36),
      text,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const handleSearch = async (e?: React.FormEvent, manualQuery?: string) => {
    if (e) e.preventDefault();
    const finalQuery = manualQuery || query;
    if (!finalQuery) return;
    
    setLoading(true);
    setScanProgress(0);
    setScannerStep(1);
    addLog(`[MESH] DEEP_SCAN_INITIATED for: "${finalQuery.toUpperCase()}"`, "info");
    
    const steps = [
      "INITIALIZING NEBULA_CORE_V3 DEEP ROUTER...",
      "ESTABLISHING ONION TUNNELS & PROXY CHAINS...",
      "SCANNING GLOBAL MESH: OTAKU, CAM & BROADCAST NODES...",
      "BYPASSING REGIONAL FILTERS & VALIDATING INTEGRITY...",
      "ONION TUNNELS SECURED. DECRYPTING STREAM METADATA...",
      "DEEP WEB PROTOCOL ESTABLISHED."
    ];

    try {
      let searchType = activeTab;
      if (activeTab === "favorites" || activeTab === "history") {
        setActiveTab("all");
        searchType = "all";
      }

      const fetchPromise = fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery, type: searchType }),
      });

      for (let i = 0; i < steps.length; i++) {
        setScannerStep(i + 1);
        setScanProgress(((i + 1) / steps.length) * 100);
        addLog(`[KERNEL] ${steps[i]}`, i === steps.length - 1 ? "success" : "info");
        await new Promise(r => setTimeout(r, 600));
      }

      const response = await fetchPromise;
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error === "QUERY_EMPTY" ? "Search query is empty." : (data.detail || "Discovery failed."));
      }
      
      if (Array.isArray(data)) {
        setResults(data);
        addLog(`[SUCCESS] Discovery complete. ${data.length} authenticated nodes resolved.`, "success");
        if (data.length === 0) {
          addLog("[ALERT] No high-integrity nodes found. Switching to sub-mesh passive mode.", "warn");
        }
      }
    } catch (error: any) {
      if (error.message.includes("Content restricted")) {
        addLog(`[FIREWALL BLOCK] Deep Web Safety Policies intercepted query. Adult/NSFW content is restricted by some nodes, retrying open relays.`, "security");
      } else {
        addLog(`Search error: ${error.message}`, "warn");
      }
    } finally {
      setLoading(false);
      setScanProgress(0);
      setScannerStep(0);
    }
  };

  const toggleFavorite = (media: MediaResult) => {
    const isFav = favorites.find(f => f.url === media.url);
    let newFavs;
    if (isFav) {
      newFavs = favorites.filter(f => f.url !== media.url);
      addLog(`Node removed from priority matrix: ${media.name}`, "warn");
    } else {
      newFavs = [...favorites, media];
      addLog(`Node successfully favorited: ${media.name}`, "success");
    }
    setFavorites(newFavs);
    localStorage.setItem("nebula_favorites", JSON.stringify(newFavs));
  };

  const generateSubtitles = async (media: MediaResult) => {
    setIsGeneratingSubtitles(true);
    setSubtitles("");
    addLog(`[AI] Generating subtitles for ${media.name}...`, "info");
    try {
        const res = await fetch("/api/generate-subtitles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ media })
        });
        const data = await res.json();
        if (data.success) {
            setSubtitles(data.content);
            addLog(`[AI] Subtitles generated successfully.`, "success");
        } else {
            throw new Error(data.error || "Generation failed");
        }
    } catch (err: any) {
        addLog(`[AI] Subtitle generation failed: ${err.message}`, "warn");
    } finally {
        setIsGeneratingSubtitles(false);
    }
  };

  const playMedia = async (media: MediaResult, isRetry = false) => {
    if (!isRetry) {
      setReconnectCount(0);
      setIsReconnecting(false);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      addLog(`Connecting to signal: ${media.name}...`, "info");
    } else {
      addLog(`[RECOVERY] Attempting reconnection (${reconnectCount + 1}/${MAX_RECONNECT_ATTEMPTS}) for ${media.name}...`, "warn");
    }

    fetchIntel(media);
    
    // Registry Verification Sequence
    setIsValidatingRegistry(true);
    setValidationData(null);
    try {
      const vRes = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: media.url })
      });
      const vData = await vRes.json();
      
      if (!vRes.ok) {
        throw new Error(vData.error || "Validation failed.");
      }
      
      setValidationData(vData);
      if (vData.valid) {
        addLog(`[MESH] Decentralized Consensus Verified. Integrity Score: ${(vData.integrity_score * 100).toFixed(2)}%`, "success");
      } else {
        addLog(`[ALERT] SEC_VALIDATION_FAILURE: Registry mismatch detected for ${media.name}.`, "warn");
      }
    } catch (err: any) {
      addLog(`Validation error: ${err.message || "Matrix Registry unreachable."}`, "warn");
    } finally {
      setIsValidatingRegistry(false);
    }

    // Offload analysis to background thread
    setWorkerActive(true);
    workerRef.current?.postMessage({ 
      type: 'ANALYZE_SIGNAL', 
      data: { id: media.url, name: media.name } 
    });
    
    if (media.health && media.health !== 'optimal') {
      addLog(`[WARNING] Signal health ${media.health.toUpperCase()}. Playback may be unstable.`, "warn");
    }

    setCurrentMedia(media);
    setIsPlaying(true);
    
    if ((media.type === 'video' || media.type === 'media') && isSubtitleEnabled) {
        generateSubtitles(media);
    }
    
    // Add to history
    setHistory(prev => {
      const filtered = prev.filter(item => item.url !== media.url);
      return [media, ...filtered].slice(0, 50);
    });

    // Resume AudioContext if suspended
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }

    if (media.type === "radio" && audioRef.current) {
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.src = "";
        }
        audioRef.current.src = media.url;
        audioRef.current.onerror = (e) => {
            console.error("Radio playback error:", e);
            handleStreamError(media);
        };
        audioRef.current.onplay = () => {
            setIsReconnecting(false);
            if (isRetry) addLog(`[SUCCESS] Signal restored for ${media.name}.`, "success");
        };
        audioRef.current.play().catch(e => {
          console.error("Playback error:", e);
          addLog("Playback connection refused by peer node.", "warn");
          handleStreamError(media);
        });
    } else if ((media.type === "video" || media.type === "live_cam" || media.type === "media" || media.type === "image" || media.type === "document" || media.type === "rom")) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }

        const isYouTube = media.url.includes("youtube.com") || media.url.includes("youtu.be");
        if (isYouTube) {
          setIsPlaying(true);
          setIsReconnecting(false);
          setReconnectCount(0);
          addLog(`YouTube Feed linked: ${media.name}`, "info");
        } else if (media.type === "image" || media.type === "document" || media.type === "rom") {
          setIsPlaying(true);
          setIsReconnecting(false);
          setReconnectCount(0);
          addLog(`${media.type.toUpperCase()} Feed linked: ${media.name}`, "info");
        } else if (videoRef.current) {
          const video = videoRef.current;
          if (Hls.isSupported() && media.url.includes('.m3u8')) {
          const hls = new Hls({
            autoStartLoad: true,
            capLevelToPlayerSize: true,
            manifestLoadingMaxRetry: 3,
            levelLoadingMaxRetry: 3
          });
          hls.loadSource(media.url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            applyQualityToHls(hls, streamQuality);
            video.play();
            setIsReconnecting(false);
            if (isRetry) addLog(`[SUCCESS] Signal restored for ${media.name}.`, "success");
          });

          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('[HLS_ERROR]', event, data);
            if (data.fatal) {
              addLog(`[HLS_FATAL_ERROR] ${data.type}: ${data.details}`, "warn");
              handleStreamError(media);
              hls.destroy();
              hlsRef.current = null;
            } else {
              addLog(`[HLS_WARN] ${data.type}: ${data.details}`, "warn");
            }
          });

          hlsRef.current = hls;
        } else {
          video.src = media.url;
          video.onplay = () => {
            setIsReconnecting(false);
            if (isRetry) addLog(`[SUCCESS] Signal restored for ${media.name}.`, "success");
          };
          video.onerror = () => handleStreamError(media);
          video.play().catch(e => {
            console.error("Playback error", e);
            addLog(`Native video playback failed: ${e.message}`, "warn");
            handleStreamError(media);
          });
        }
      }
    }
  };

  const handleStreamError = (media: MediaResult) => {
    if (reconnectCount < MAX_RECONNECT_ATTEMPTS) {
      setIsReconnecting(true);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        setReconnectCount(prev => prev + 1);
        playMedia(media, true);
      }, RECONNECT_DELAY);
    } else {
      setIsReconnecting(false);
      setReconnectCount(0);
      addLog(`[CRITICAL] Stream recovery failed after ${MAX_RECONNECT_ATTEMPTS} attempts. Signal lost.`, "warn");
      setIsPlaying(false);
    }
  };

  const applyQualityToHls = (hls: Hls, quality: "low" | "med" | "high") => {
    if (!hls.levels || hls.levels.length === 0) return;
    
    // Quality mapping
    const levels = hls.levels;
    let targetIdx = -1;

    if (quality === "low") targetIdx = 0; // First level (usually lowest)
    else if (quality === "high") targetIdx = levels.length - 1; // Last level (usually highest)
    else targetIdx = Math.floor(levels.length / 2); // Middle

    hls.currentLevel = targetIdx;
    addLog(`[HLS] Bandwidth constrained to ${quality.toUpperCase()} tier. Level ${targetIdx} active.`, "info");
  };

  // Sync Quality Changes
  useEffect(() => {
    if (hlsRef.current) {
      applyQualityToHls(hlsRef.current, streamQuality);
    }
  }, [streamQuality]);

  // Visualizer Animation
  useEffect(() => {
    const draw = () => {
      if (!canvasRef.current || !analyserRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#00FF41');
        gradient.addColorStop(1, '#003B00');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        
        x += barWidth;
      }
      
      requestRef.current = requestAnimationFrame(draw);
    };

    if (isPlaying) {
      requestRef.current = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(requestRef.current);
    }

    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying]);

  const handleSystemCommand = (cmd: string) => {
    const input = cmd.toLowerCase().trim();
    
    if (input.startsWith('volume ')) {
      const val = parseFloat(input.split(' ')[1]);
      if (!isNaN(val)) {
        setVolume(Math.max(0, Math.min(1, val / 100)));
        return `SYSTEM_RES: VOLUME_SET_TO_${val}%`;
      }
    }
    
    if (input.startsWith('preset ')) {
      const preset = input.split(' ')[1] as any;
      if (PRESETS[preset as keyof typeof PRESETS]) {
        setEqPreset(preset);
        return `SYSTEM_RES: DSP_PROFILE_SWITCHED_TO_${preset.toUpperCase()}`;
      }
    }

    if (input.startsWith('quality ')) {
      const q = input.split(' ')[1] as any;
      if (['low', 'med', 'high'].includes(q)) {
        setStreamQuality(q);
        return `SYSTEM_RES: BANDWIDTH_UPPER_BOUND_SET_TO_${q.toUpperCase()}`;
      }
    }
    
    if (input === 'stop') {
      handleStop();
      return "SYSTEM_RES: SIGNAL_TERMINATED";
    }
    
    if (input === 'play') {
      handlePlay();
      return "SYSTEM_RES: SIGNAL_ENGAGED";
    }
    
    if (input === 'help') {
      return `NEBULA KERNEL COMMANDS:
      - help: Show this directory.
      - volume {0-100}: Set master output level.
      - preset {flat|bass_boost|treble_boost|balanced}: Switch DSP matrix.
      - quality {low|med|high}: Adjust stream resolution/bandwidth.
      - play/stop: Toggle signal engagement.
      - clear logs: Purge system buffer.
      - stats: View kernel performance metrics.
      - roadmap: Reveal system evolution plan.`;
    }

    if (input === 'roadmap') {
      return `NEBULA OS EVOLUTION PLAN:
      [PHASE_1] [COMPLETED] Kernel Resilience & Multi-tier Fallback.
      [PHASE_2] [COMPLETED] Signal Matrix & Deep Scan Matrix Discovery.
      [PHASE_3] [COMPLETED] Hardware Offloading & Autonomous Diagnostics.
      [PHASE_4] [IN_PROGRESS] Neural Mesh Sync & Global Node Mapping.`;
    }
    
    if (input === 'stats') {
      return `KERNEL_STATS:
      - ACTIVE_PROVIDERS: 3 (Ollama, Gemini, Nvidia)
      - UPTIME: ${Math.floor(performance.now() / 1000)}s
      - CACHE_STATUS: ACTIVE
      - DSP_STATUS: STABLE`;
    }

    return null;
  };

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput) return;

    const userText = terminalInput;
    setTerminalInput("");
    setTerminalLogs(prev => [...prev, { role: 'user', text: userText }]);
    
    // Check for direct system commands
    const systemRes = handleSystemCommand(userText);
    if (systemRes) {
      setTerminalLogs(prev => [...prev, { role: 'system', text: systemRes }]);
      return;
    }
    
    try {
      const response = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userText, context: currentMedia }),
      });
      const data = await response.json();
      setTerminalLogs(prev => [...prev, { role: 'system', text: data.text }]);
    } catch (error) {
      setTerminalLogs(prev => [...prev, { role: 'system', text: "KERNEL_ERR: SYSTEM_UNRESPONSIVE" }]);
    }
  };

  const handleStop = () => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
    }
    setCurrentMedia(null);
    addLog("Signal terminated by user.", "info");
  };

  const handleDownload = (media: MediaResult) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(7);
    const newTask: DownloadTask = {
      id,
      media,
      progress: 0,
      status: 'queued',
      loaded: 0,
      total: 0,
      timestamp: Date.now()
    };
    setDownloads(prev => [...prev, newTask]);
    setShowDownloads(true);
  };

  useEffect(() => {
    const activeCount = downloads.filter(d => d.status === 'downloading').length;
    if (activeCount >= maxConcurrentDownloads) return;

    const queuedTask = downloads.find(d => d.status === 'queued');
    if (queuedTask) {
       startDownload(queuedTask.id);
    }
  }, [downloads]);

  // Keep a map of downloaded chunks to combine them upon completion
  const downloadChunks = useRef<Record<string, Uint8Array[]>>({});

  const startDownload = async (taskId: string, resumeMode = false) => {
    const task = downloads.find(d => d.id === taskId);
    if (!task) return;

    const startByte = resumeMode ? task.loaded : 0;
    if (!resumeMode) {
      downloadChunks.current[taskId] = [];
    }

    const controller = new AbortController();
    downloadControllers.current[taskId] = controller;

    setDownloads(prev => prev.map(t => t.id === taskId ? { ...t, status: 'downloading' } : t));

    try {
      const headers = new Headers();
      if (startByte > 0) {
        headers.append('Range', `bytes=${startByte}-`);
      }
      
      const response = await fetch(task.media.url, { headers, signal: controller.signal });
      if (!response.ok && response.status !== 206) throw new Error(`HTTP error! status: ${response.status}`);
      
      const contentLength = response.headers.get('content-length');
      const total = response.status === 206 
         ? startByte + (contentLength ? parseInt(contentLength, 10) : 0)
         : (contentLength ? parseInt(contentLength, 10) : 0);
         
      let loaded = startByte;

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No readable stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        downloadChunks.current[taskId].push(value);
        loaded += value.length;
        setDownloads(prev => prev.map(t => t.id === taskId ? { 
          ...t, 
          loaded, 
          total: total || Math.max(loaded, t.total), 
          progress: total ? (loaded / total) * 100 : t.progress + 0.1 
        } : t));
      }
      
      const combined = new Blob(downloadChunks.current[taskId]);
      const url = window.URL.createObjectURL(combined);
      const a = document.createElement('a');
      a.href = url;
      a.download = task.media.name || 'download';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        delete downloadChunks.current[taskId];
      }, 1000);

      setDownloads(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', progress: 100 } : t));
      addLog(`Download complete: ${task.media.name}`, "success");
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Just keep the loaded chunks for potential resume
      } else {
        setDownloads(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: err.message } : t));
        addLog(`Download failed: ${err.message}`, "warn");
        delete downloadChunks.current[taskId];
      }
    } finally {
      delete downloadControllers.current[taskId];
    }
  };

  const cancelDownload = (taskId: string) => {
    downloadControllers.current[taskId]?.abort();
    setDownloads(prev => prev.map(t => t.id === taskId ? { ...t, status: 'canceled' } : t));
    delete downloadChunks.current[taskId];
  };

  const pauseDownload = (taskId: string) => {
    downloadControllers.current[taskId]?.abort();
    setDownloads(prev => prev.map(t => t.id === taskId ? { ...t, status: 'paused' } : t));
  };

  const resumeDownload = (taskId: string) => {
    setDownloads(prev => prev.map(t => t.id === taskId ? { ...t, status: 'queued' } : t));
  };
  
  const clearFailedDownloads = () => {
    setDownloads(prev => prev.filter(t => t.status !== 'error' && t.status !== 'canceled'));
  };

  const clearCompletedDownloads = () => {
    setDownloads(prev => prev.filter(t => t.status !== 'completed'));
  };

  const handleSkip = async () => {
    if (activePlaylistId) {
      const playlist = playlists.find(p => p.id === activePlaylistId);
      if (playlist && playlist.items.length > 0) {
        const currentIndex = currentMedia ? playlist.items.findIndex(r => r.url === currentMedia.url) : -1;
        const nextIndex = (currentIndex + 1) % playlist.items.length;
        const nextMedia = playlist.items[nextIndex];
        
        addLog(`Skipping to next in playlist ${playlist.name}: ${nextMedia.name}`, "info");
        playMedia(nextMedia);
        return;
      }
    }

    const list = activeTab === "favorites" 
      ? favorites 
      : activeTab === "history" 
      ? history 
      : results.filter(r => (activeCategory === "All" || r.category === activeCategory) && (activeTab === 'all' || r.type === activeTab));

    if (list.length === 0) {
      addLog("No results in category. Initiating deep scan for 'trending media'...", "info");
      setQuery('trending media');
      await handleSearch(undefined, 'trending media'); 
      return;
    }

    const currentIndex = currentMedia ? list.findIndex(r => r.url === currentMedia.url) : -1;
    const nextIndex = (currentIndex + 1) % list.length;
    const nextMedia = list[nextIndex];
    
    addLog(`Skipping to next signal: ${nextMedia.name}`, "info");
    playMedia(nextMedia);
  };

  const addToPlaylist = (playlistId: string, media: MediaResult) => {
    setPlaylists(prev => prev.map(p => 
      p.id === playlistId ? { ...p, items: [...p.items, media] } : p
    ));
    addLog(`Added ${media.name} to playlist`, "success");
  };

  const createPlaylist = (name: string) => {
    setPlaylists(prev => [...prev, { id: Date.now().toString(), name, items: [] }]);
    addLog(`Created playlist ${name}`, "success");
  };

  const handlePause = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      addLog("Stream paused.", "info");
    }
  };

  const handlePlay = () => {
    if (!isPlaying && audioRef.current && currentMedia) {
      audioRef.current.play().catch(e => {
        addLog("Error resuming stream.", "warn");
      });
      setIsPlaying(true);
    }
  };

  const displayedResults = activeTab === "favorites" 
    ? favorites 
    : activeTab === "history" 
    ? history 
    : results.filter(r => (activeCategory === "All" || r.category === activeCategory) && (activeTab === 'all' || r.type === activeTab));

  const MapOverlay = () => {
    if (!GOOGLE_MAPS_API_KEY) {
      return (
        <div className="w-full h-full bg-black/40 flex flex-col items-center justify-center p-6 text-center border border-white/5 rounded-2xl">
          <Shield className="w-8 h-8 text-white/20 mb-4" />
          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Maps API Key Required</p>
          <p className="text-[8px] text-white/20 uppercase max-w-[200px]">Provide GOOGLE_MAPS_PLATFORM_KEY in settings to enable global mesh visualization.</p>
        </div>
      );
    }

    return (
      <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 relative">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            defaultCenter={{ lat: 20, lng: 0 }}
            defaultZoom={1}
            mapId={DARK_MAP_ID}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            <NetworkMap nodes={validationData?.nodes || []} active={!!validationData} />
          </Map>
        </APIProvider>
        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded border border-white/10 backdrop-blur-md">
           <span className="text-[8px] font-black text-brand-green uppercase tracking-widest">Mesh_Live_Distribution</span>
        </div>
        {validationData && (
          <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded border border-brand-green/20 backdrop-blur-md">
             <span className="text-[8px] font-mono text-brand-green uppercase">{validationData.consensus_nodes} VALIDATOR_NODES_LOCALIZED</span>
          </div>
        )}
      </div>
    );
  };

  const PlaylistViewer = () => {
    const [themeInput, setThemeInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const generatePlaylist = async (theme: string) => {
        setIsGenerating(true);
        addLog(`[AI] Generating playlist for theme: ${theme}...`, "info");
        try {
            const response = await fetch("/api/discover", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: `Create playlist from AI analysis of "${theme}"`, type: 'all' }),
            });
            const data = await response.json();
            
            if (Array.isArray(data)) {
                setPlaylists(prev => [...prev, { id: Date.now().toString(), name: `AI: ${theme}`, items: data }]);
                addLog(`[AI] Playlist '${theme}' created with ${data.length} items.`, "success");
            } else {
                throw new Error("Generation failed");
            }
        } catch (err: any) {
            addLog(`[AI] Playlist generation failed: ${err.message}`, "warn");
        } finally {
            setIsGenerating(false);
            setThemeInput("");
        }
    };

    return (
        <div className="space-y-6">
            <div className="bento-card p-4 bg-white/5 border border-white/10 space-y-4">
                <h3 className="text-sm font-black text-white uppercase">Generate Playlist</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={themeInput} 
                        onChange={(e) => setThemeInput(e.target.value)}
                        placeholder="Theme, e.g. 'ambient nature sounds'..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-green/30"
                    />
                    <button 
                        onClick={() => generatePlaylist(themeInput)}
                        disabled={isGenerating || !themeInput}
                        className="bg-brand-green/20 hover:bg-brand-green/30 text-brand-green px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 border border-brand-green/20"
                    >
                        {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <PlusSquare className="w-3 h-3" />}
                        GENERATE
                    </button>
                </div>
            </div>
            {playlists.map((playlist) => (
                <div key={playlist.id} className="bento-card p-4 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white uppercase">{playlist.name}</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setActivePlaylistId(playlist.id);
                        if (playlist.items.length > 0) playMedia(playlist.items[0]);
                      }}
                      className="bg-brand-green/20 hover:bg-brand-green/30 text-brand-green px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> PLAY
                    </button>
                    <button 
                      onClick={() => setPlaylists(prev => prev.filter(p => p.id !== playlist.id))}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <Reorder.Group axis="y" values={playlist.items} onReorder={(items) => {
                    setPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, items } : p));
                }} className="space-y-2">
                    {playlist.items.map((item) => (
                    <Reorder.Item key={item.url} value={item} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center gap-4 cursor-grab transition-colors">
                        <div className="text-white/20"><List className="w-4 h-4" /></div>
                        <div className="flex-1 text-xs text-white truncate">{item.name}</div>
                        <button onClick={() => {
                          setActivePlaylistId(playlist.id);
                          playMedia(item);
                        }} className="text-white/40 hover:text-brand-green transition-colors">
                          <Play className="w-4 h-4" />
                        </button>
                    </Reorder.Item>
                    ))}
                </Reorder.Group>
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-white p-4 font-sans select-none overflow-hidden flex flex-col gap-4">
      {/* GLOBAL STATUS BAR */}
      <div className="h-8 shrink-0 flex items-center justify-between px-6 bg-white/5 border border-white/10 rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-green/5 via-transparent to-brand-green/5 animate-pulse pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-white/80 uppercase">Nebula_V3_Kernel</span>
          </div>
          {workerActive && (
            <div className="flex items-center gap-2 text-brand-cyan/80 animate-pulse border-l border-white/10 pl-6 h-4">
              <Cpu className="w-3 h-3" />
              <span className="text-[9px] font-black tracking-widest uppercase">HDW_OFFLOAD_ACTIVE</span>
            </div>
          )}
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-4 text-[9px] font-mono text-white/40 uppercase">
            <span className="flex items-center gap-1.5"><CpuIcon className="w-3 h-3" /> CPU: {systemStats.cpu}%</span>
            <span className="flex items-center gap-1.5"><Activity className="w-3 h-3" /> NET: {systemStats.net}mbps</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> UPTIME: {systemStats.uptime}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 relative z-10">
          <button 
            onClick={() => setShowDownloads(!showDownloads)}
            className={`flex items-center gap-2 text-[10px] font-black tracking-widest transition-colors ${downloads.filter(d => d.status === 'downloading').length > 0 ? 'text-brand-green animate-pulse' : 'text-white/60 hover:text-white'}`}
          >
            <Download className="w-3 h-3" />
            {downloads.filter(d => d.status === 'downloading').length > 0 ? 'DOWNLOADING...' : 'DOWNLOADS'}
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-brand-cyan/80">
            <Globe className="w-3 h-3" />
            GLOBAL_MESH: ACTIVE
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="text-[10px] font-mono text-white/60">
            {new Date().toLocaleTimeString('en-US', { hour12: false })}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-6 min-h-0">
        
        {/* Left Column: Navigation & Stats */}
        <aside className="col-span-3 row-span-4 bento-card p-6 flex flex-col justify-between overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Layers className="w-32 h-32 rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-brand-green rounded flex items-center justify-center shadow-[0_0_10px_rgba(0,255,65,0.3)]">
                <Search className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-widest uppercase">OS_NEBULA</h1>
                <p className="text-[8px] text-brand-green font-mono uppercase opacity-60">System Version 3.4.0</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { id: 'all', icon:Globe, label: 'GLOBAL MESH' },
                { id: 'radio', icon:Radio, label: 'FM_WAVES' },
                { id: 'video', icon:Video, label: 'NERD / OTAKU / SCENE' },
                { id: 'live_cam', icon:Monitor, label: 'MORTAL KOMBAT' },
                { id: 'media', icon:Zap, label: 'DARK ARCHIVES' },
                { id: 'image', icon:ImageIcon, label: 'IMAGE BOARDS' },
                { id: 'document', icon:FileText, label: 'LEAKED DOCS' },
                { id: 'rom', icon:Gamepad2, label: 'RETRO ROMS' },
                { id: 'favorites', icon:Star, label: 'SAVED_NODES' },
                { id: 'history', icon:Clock, label: 'SIGNAL_HISTORY' },
                { id: 'playlists', icon:List, label: 'TUNNELS' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                    activeTab === tab.id 
                    ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' 
                    : 'text-white/40 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${tab.id === 'favorites' && favorites.length > 0 ? 'fill-current text-yellow-500' : ''}`} />
                  <span className="text-[10px] font-black tracking-widest">{tab.label}</span>
                  {tab.id === 'favorites' && favorites.length > 0 && (
                    <span className="ml-auto text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-white/40">{favorites.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t border-white/5">
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-white/30 uppercase tracking-tighter">
                   <span>Throughput</span>
                   <span className="text-brand-green">820 MB/S</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-brand-green w-[82%] shadow-[0_0_10px_#00FF41]" />
                </div>
             </div>
             <div className="text-[9px] text-white/20 font-mono leading-tight">
               SYSTEM_KERNEL: HARDENED_V4.1<br/>
               IP_ADDR: [REDACTED]<br/>
               LOC: UNKNOWN
             </div>
          </div>
        </aside>

        {/* Center Main Module: Search & Featured */}
        <div className="col-span-6 row-span-4 bento-card flex flex-col p-8 gap-6 relative overflow-hidden">
          {/* DEEP SCAN OVERLAY */}
          <AnimatePresence>
            {scannerStep > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-[#050505]/95 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="relative mb-12">
                   <div className="w-32 h-32 border-2 border-brand-green/10 rounded-full animate-ping" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 border-2 border-brand-green/20 rounded-full animate-spin border-t-brand-green" />
                   </div>
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-brand-green animate-pulse" />
                   </div>
                </div>
                
                <h2 className="text-2xl font-black text-white tracking-[0.4em] uppercase mb-4">Kernel_Deep_Scan</h2>
                <div className="flex gap-2 mb-10">
                   {[1,2,3,4,5].map(i => (
                     <div key={i} className={`w-16 h-1 rounded-full transition-all duration-700 ${i <= scannerStep ? 'bg-brand-green shadow-[0_0_15px_#00FF41]' : 'bg-white/5'}`} />
                   ))}
                </div>
                
                <div className="space-y-4 max-w-sm w-full">
                   <div className="flex justify-between text-[10px] font-mono text-brand-green uppercase tracking-widest">
                      <span>{scanProgress < 100 ? 'ANALYZING_NODES...' : 'SIGNAL_STABILIZED'}</span>
                      <span className="font-black">{Math.floor(scanProgress)}%</span>
                   </div>
                   <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${scanProgress}%` }}
                        className="h-full bg-brand-green shadow-[0_0_20px_#00FF41]"
                      />
                   </div>
                   <p className="text-[10px] font-mono text-white/40 uppercase mt-6 animate-pulse leading-relaxed">
                     [KERNEL] Executing recursive signal discovery across global mesh nodes...
                   </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between gap-4">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ENTER DISCOVERY PARAMETERS..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-6 pr-24 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green/30 transition-all font-mono tracking-wider placeholder:text-white/10 uppercase"
              />
              <button 
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green px-6 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 border border-brand-green/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                DEEP_SCAN
              </button>
            </form>
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
               <button 
                 onClick={() => setViewMode('list')}
                 className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-brand-green' : 'text-white/20 hover:text-white'}`}
               >
                 <List className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setViewMode('matrix')}
                 className={`p-2 rounded-lg transition-all ${viewMode === 'matrix' ? 'bg-white/10 text-brand-cyan' : 'text-white/20 hover:text-white'}`}
               >
                 <Grid className="w-4 h-4" />
               </button>
            </div>
          </div>

          {(activeTab === 'favorites' || activeTab === 'history') && (
            <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex items-center gap-3">
                {activeTab === 'favorites' ? <Star className="w-5 h-5 text-yellow-500" /> : <Clock className="w-5 h-5 text-brand-green" />}
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  {activeTab === 'favorites' ? 'Priority Nodes' : 'Signal History'}
                </h3>
              </div>
              {activeTab === 'history' && history.length > 0 && (
                <button 
                  onClick={() => {
                    setHistory([]);
                    addLog("Signal history purged.", "warn");
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-black hover:bg-red-500 hover:text-white transition-all uppercase"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Log
                </button>
              )}
            </div>
          )}

          {/* CATEGORY SELECTOR */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
             {categories.map((cat) => {
               const Icon = categoryIcons[cat];
               return (
                 <button
                   key={cat}
                   onClick={() => setActiveCategory(cat)}
                   className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border transition-all whitespace-nowrap ${
                     activeCategory === cat
                       ? "bg-brand-green/10 text-brand-green border-brand-green/20"
                       : "bg-white/5 text-white/30 border-transparent hover:bg-white/10 hover:text-white"
                   }`}
                 >
                   <Icon className="w-3 h-3" />
                   {cat}
                 </button>
               );
             })}
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pt-2">
            {activeTab === 'playlists' ? (
              <PlaylistViewer />
            ) : viewMode === 'matrix' && results.length > 0 && activeTab !== 'favorites' && activeTab !== 'history' ? (
              <div className="grid grid-cols-2 gap-4 auto-rows-max">
                 <AnimatePresence mode="popLayout">
                    {displayedResults.map((item, idx) => (
                      <motion.div
                        key={item.url + idx}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        layout
                        onClick={() => playMedia(item)}
                        className={`bento-card p-4 group cursor-pointer relative overflow-hidden transition-all border-white/5 hover:border-brand-green/30 ${currentMedia?.url === item.url ? 'border-brand-green/30 bg-brand-green/5' : 'bg-white/5 hover:bg-white/[0.08]'}`}
                      >
                         <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center border border-white/10 group-hover:border-brand-green/30 transition-all">
                               {item.type === 'radio' && <Radio className="w-4 h-4 text-brand-cyan" />}
                               {item.type === 'video' && <Video className="w-4 h-4 text-brand-cyan" />}
                               {item.type === 'live_cam' && <Monitor className="w-4 h-4 text-brand-green" />}
                               {item.type === 'media' && <Zap className="w-4 h-4 text-yellow-500" />}
                               {item.type === 'image' && <ImageIcon className="w-4 h-4 text-purple-400" />}
                               {item.type === 'document' && <FileText className="w-4 h-4 text-blue-400" />}
                               {item.type === 'rom' && <Gamepad2 className="w-4 h-4 text-orange-400" />}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                               <span className="text-[10px] font-black text-brand-green">{(item.relevance_score! * 100).toFixed(0)}%</span>
                               {item.traffic && (
                                  <span className={`text-[6px] font-mono px-1 rounded ${item.traffic === 'extreme' ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-white/40'}`}>
                                     {item.traffic.toUpperCase()}
                                  </span>
                               )}
                            </div>
                         </div>
                         <h4 className="text-xs font-black text-white leading-tight uppercase group-hover:text-brand-green transition-all line-clamp-1 mb-1 flex items-center gap-2">
                            {item.type === 'radio' && <Radio className="w-3 h-3 text-brand-cyan" />}
                            {item.type === 'video' && <Video className="w-3 h-3 text-brand-cyan" />}
                            {item.type === 'live_cam' && <Monitor className="w-3 h-3 text-brand-green" />}
                            {item.type === 'media' && <Zap className="w-3 h-3 text-yellow-500" />}
                            {item.type === 'image' && <ImageIcon className="w-3 h-3 text-purple-400" />}
                            {item.type === 'document' && <FileText className="w-3 h-3 text-blue-400" />}
                            {item.type === 'rom' && <Gamepad2 className="w-3 h-3 text-orange-400" />}
                            {item.name}
                         </h4>
                         <p className="text-[9px] text-white/40 line-clamp-1 mb-4 italic">{item.description}</p>
                         <div className="flex items-center justify-between">
                            <div className="flex gap-1">
                               {item.tags.slice(0, 2).map(t => (
                                 <span key={t} className="text-[7px] px-1 bg-white/5 rounded text-white/30 uppercase">{t}</span>
                               ))}
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                              className={`p-1 rounded bg-white/5 transition-all ${favorites.find(f => f.url === item.url) ? 'text-yellow-500' : 'text-white/20 hover:text-white'}`}
                            >
                              <Star className={`w-3 h-3 ${favorites.find(f => f.url === item.url) ? 'fill-current' : ''}`} />
                            </button>
                         </div>
                      </motion.div>
                    ))}
                 </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-4">
                 <AnimatePresence mode="popLayout">
                    {displayedResults.length > 0 ? (
                      displayedResults.map((item, idx) => (
                        <motion.div
                          key={item.url}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ delay: idx * 0.03, duration: 0.2 }}
                          className={`group relative p-4 bg-white/5 rounded-2xl border transition-all flex items-center gap-6 overflow-hidden ${currentMedia?.url === item.url ? 'border-brand-green/30 bg-brand-green/5 shadow-[0_0_20px_rgba(0,255,65,0.05)]' : 'border-white/5 hover:bg-white/[0.08] hover:border-white/20'}`}
                        >
                      {/* Scanning line effect */}
                      <div className="absolute inset-x-0 top-0 h-[1px] bg-brand-green/50 opacity-0 group-hover:opacity-100 animate-scan pointer-events-none" />

                      <div className="w-12 h-12 bg-black flex items-center justify-center rounded-xl border border-white/10 shrink-0 group-hover:border-brand-green/40 transition-colors cursor-pointer" onClick={() => playMedia(item)}>
                        {item.type === 'radio' && <Radio className="w-5 h-5 text-brand-cyan" />}
                        {item.type === 'video' && <Video className="w-5 h-5 text-brand-cyan" />}
                        {item.type === 'live_cam' && <Monitor className="w-5 h-5 text-brand-green" />}
                        {item.type === 'media' && <Zap className="w-5 h-5 text-yellow-500" />}
                        {item.type === 'image' && <ImageIcon className="w-5 h-5 text-purple-400" />}
                        {item.type === 'document' && <FileText className="w-5 h-5 text-blue-400" />}
                        {item.type === 'rom' && <Gamepad2 className="w-5 h-5 text-orange-400" />}
                      </div>
                      
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playMedia(item)}>
                         <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {item.health === 'optimal' && (
                              <span className="flex h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" title="Optimal Signal" />
                            )}
                            {item.relevance_score !== undefined && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/20">
                                REL: {(item.relevance_score * 100).toFixed(0)}%
                              </span>
                            )}
                            {item.rating !== undefined && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-0.5">
                                <Star className="w-2 h-2 fill-current" /> {item.rating.toFixed(1)}
                              </span>
                            )}
                            {item.engagement && (
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border ${
                                item.engagement === 'high' ? 'text-purple-400 bg-purple-400/10 border-purple-400/20' : 
                                item.engagement === 'medium' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : 
                                'text-white/20 bg-white/5 border-white/10'
                              }`}>
                                {item.engagement}
                              </span>
                            )}
                            {item.traffic && (
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border ${
                                item.traffic === 'extreme' || item.traffic === 'heavy' ? 'text-orange-400 bg-orange-400/10 border-orange-400/20' : 
                                'text-white/40 bg-white/5 border-white/10'
                              }`}>
                                NET: {item.traffic}
                              </span>
                            )}
                            {item.threat && (
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border ${
                                item.threat === 'critical' || item.threat === 'high' ? 'text-red-500 bg-red-500/10 border-red-500/20 animate-pulse' : 
                                item.threat === 'guarded' ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' :
                                'text-brand-green/40 bg-brand-green/5 border-brand-green/10'
                              }`}>
                                THREAT: {item.threat}
                              </span>
                            )}
                            {item.chain_verified && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter text-brand-green bg-brand-green/10 border border-brand-green/20 flex items-center gap-1">
                                <Fingerprint className="w-2 h-2" /> {item.registry_hash}
                              </span>
                            )}
                         </div>
                         <h4 className="text-sm font-black text-white truncate group-hover:text-brand-green transition-colors flex items-center gap-2">
                            {item.type === 'radio' && <Radio className="w-3 h-3 text-brand-cyan" />}
                            {item.type === 'video' && <Video className="w-3 h-3 text-brand-cyan" />}
                            {item.type === 'live_cam' && <Monitor className="w-3 h-3 text-brand-green" />}
                            {item.type === 'media' && <Zap className="w-3 h-3 text-yellow-500" />}
                            {item.type === 'image' && <ImageIcon className="w-3 h-3 text-purple-400" />}
                            {item.type === 'document' && <FileText className="w-3 h-3 text-blue-400" />}
                            {item.type === 'rom' && <Gamepad2 className="w-3 h-3 text-orange-400" />}
                            {item.name}
                         </h4>
                         <p className="text-[10px] text-white/40 truncate mt-0.5">{item.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleFavorite(item)}
                          className={`p-2 rounded-xl transition-all ${favorites.find(f => f.url === item.url) ? 'text-yellow-500 bg-yellow-500/20 border border-yellow-500/20' : 'text-white/20 hover:text-white hover:bg-white/10'}`}
                        >
                          <Star className={`w-3.5 h-3.5 ${favorites.find(f => f.url === item.url) ? 'fill-current' : ''}`} />
                        </button>
                        <button 
                          onClick={() => handleDownload(item)}
                          className="p-2 rounded-xl bg-white/5 text-white/20 hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setIsSubtitleEnabled(!isSubtitleEnabled)}
                          className={`p-2 rounded-xl transition-all ${isSubtitleEnabled ? 'text-brand-green bg-brand-green/20' : 'text-white/20 hover:text-white'}`}
                          title="Toggle Subtitles"
                        >
                          <SubtitlesIcon className="w-3.5 h-3.5" />
                        </button>
                        <div className="p-2 rounded-xl bg-white/5 text-white/20 group-hover:text-brand-green group-hover:bg-brand-green/10 transition-all cursor-pointer" onClick={() => playMedia(item)}>
                          <Play className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full grid grid-cols-2 gap-4 p-4 overflow-hidden">
                    <div className="bento-card bg-brand-green/5 border-brand-green/20 p-6 flex flex-col justify-between group overflow-hidden relative">
                      <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Activity className="w-32 h-32" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                           <Activity className="w-4 h-4 text-brand-green" />
                           <span className="text-[10px] font-black tracking-widest text-brand-green uppercase">Kernel_Pulse</span>
                        </div>
                        <h3 className="text-lg font-black text-white leading-tight uppercase mb-4">Neural Mesh Connectivity</h3>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-white/40">OLLAMA_NODE</span>
                              <span className="text-brand-green">ACTIVE [92ms]</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-white/40">GEMINI_RELAY</span>
                              <span className="text-brand-green">SYNCED [450ms]</span>
                           </div>
                           <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-white/40">NVIDIA_CORE</span>
                              <span className="text-brand-cyan">STANDBY</span>
                           </div>
                        </div>
                      </div>
                      <div className="text-[8px] font-mono text-white/20 mt-4 uppercase">Multi-tier fallback protocol engaged</div>
                    </div>

                    <div className="grid grid-rows-2 gap-4">
                       <div className="bento-card border-white/10 p-6 flex items-center gap-6 group hover:bg-white/5 transition-all">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:border-brand-green/40 transition-all border border-white/5">
                             <CpuIcon className="w-6 h-6 text-white/40 group-hover:text-brand-green" />
                          </div>
                          <div>
                             <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Signal Health</div>
                             <div className="text-sm font-black text-white">99.8% PACKET_INTEGRITY</div>
                          </div>
                       </div>
                       <div className="bento-card border-brand-cyan/20 bg-brand-cyan/5 p-6 flex flex-col justify-center relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-2 opacity-10">
                             <Globe className="w-8 h-8" />
                          </div>
                          <div className="text-[10px] font-black text-brand-cyan uppercase tracking-widest mb-1">Global Traffic</div>
                          <div className="text-lg font-black text-white">12.4 TB/s</div>
                          <div className="flex gap-1 mt-2">
                             {[1,2,3,4,5,6].map(i => <div key={i} className="h-1 flex-1 bg-brand-cyan/20 rounded-full" />)}
                          </div>
                       </div>
                    </div>

                    <div className="col-span-2 bento-card bg-white/5 border-white/5 p-8 flex items-center justify-center gap-12 group cursor-pointer hover:border-white/20 transition-all" onClick={() => setShowTerminal(true)}>
                       <div className="relative">
                          <Terminal className="w-12 h-12 text-white/20 group-hover:text-brand-green transition-all" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-green rounded-full animate-ping opacity-20" />
                       </div>
                       <div className="text-center">
                          <p className="text-[10px] font-black text-white tracking-[0.3em] uppercase mb-1">Ready for connection</p>
                          <p className="text-[8px] font-mono text-white/20 uppercase">Input search parameters or execute terminal commands</p>
                       </div>
                       <ChevronRight className="w-6 h-6 text-white/10 group-hover:text-white transition-all translate-x-0 group-hover:translate-x-2" />
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

        {/* Right Column: Visual Matrix (Cams) + Mini Map */}
        <div className="col-span-3 row-span-4 rounded-[2rem] gap-6 flex flex-col">
           <div className="flex-1 bento-card p-6 flex flex-col">
              <h3 className="text-xs font-mono text-brand-green mb-4 tracking-widest uppercase opacity-80">Feed Matrix</h3>
              <div className="flex-1 grid grid-cols-1 gap-4">
                 {(currentMedia?.type === 'video' || currentMedia?.type === 'live_cam' || currentMedia?.type === 'media' || currentMedia?.type === 'webcam' || currentMedia?.type === 'stream' || currentMedia?.type === 'image' || currentMedia?.type === 'document' || currentMedia?.type === 'rom') ? (
                    <>
                    {isVideoFloating && !isVideoMinimized && (
                        <div className="bg-black/40 rounded-2xl border border-dashed border-white/20 relative flex items-center justify-center flex-1 opacity-30">
                            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Feed Detached</span>
                        </div>
                    )}
                    {(isVideoFloating && isVideoMinimized) && (
                        <div className="flex-1" />
                    )}
                    <motion.div
                        drag={isVideoFloating}
                        dragMomentum={false}
                        initial={false}
                        animate={
                          isVideoMinimized ? { scale: 0, opacity: 0, y: 200 } :
                          isVideoFloating ? { scale: 1, opacity: 1, position: 'fixed', top: 20, right: 20, zIndex: 100, width: "400px", aspectRatio: "16/9" } :
                          { scale: 1, opacity: 1, position: 'relative', width: '100%', height: '100%', top: 'auto', right: 'auto', zIndex: 1, y: 0 }
                        }
                        className={`${isVideoFloating ? "shadow-2xl border border-brand-green/30 cursor-move backdrop-blur-xl" : "flex-1 border border-brand-green/20"} bg-black rounded-2xl relative overflow-hidden flex items-center justify-center group`}
                    >
                      {currentMedia?.type === 'image' ? (
                        <img src={currentMedia.url} className="w-full h-full object-contain bg-black" alt={currentMedia.name} crossOrigin="anonymous" />
                      ) : currentMedia?.type === 'document' || currentMedia?.type === 'rom' ? (
                        <iframe src={currentMedia.url} className="w-full h-full bg-white" title={currentMedia.name} />
                      ) : currentMedia?.url?.includes('youtube.com') || currentMedia?.url?.includes('youtu.be') ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${currentMedia.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1] ?? ''}?autoplay=1&mute=0&controls=1`}
                          className="w-full h-full object-cover"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video ref={videoRef} className={`w-full h-full object-cover transition-opacity duration-700 ${isReconnecting ? 'opacity-20' : 'opacity-100'}`} controls={false} muted={false} crossOrigin="anonymous" />
                      )}
                      
                       {isSubtitleEnabled && (subtitles || isGeneratingSubtitles) && (
                          <div className="absolute bottom-4 left-4 right-4 bg-black/70 p-2 text-center text-xs font-mono text-white rounded backdrop-blur-sm border border-white/10">
                              {isGeneratingSubtitles ? "Generating subtitles..." : subtitles}
                          </div>
                      )}
                      
                      <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-2 py-1 rounded">
                        <div className={`w-1.5 h-1.5 rounded-full ${isReconnecting ? 'bg-red-500 animate-pulse' : 'bg-brand-green animate-pulse'}`} />
                        <span className="text-[8px] font-mono opacity-80 uppercase tracking-tighter">
                          {isReconnecting ? 'RECONNECTING_SIGNAL...' : `LIVE_FEED: ${currentMedia.name}`}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         {isVideoFloating && (
                           <button onClick={() => setIsVideoMinimized(true)} className="bg-black/60 p-1.5 rounded hover:bg-white/10 transition-colors border border-white/10" title="Minimize to tray">
                             <Command className="w-3.5 h-3.5 text-white/70 hover:text-white" />
                           </button>
                         )}
                         <button
                           onClick={() => {
                              setIsVideoFloating(!isVideoFloating);
                              if (isVideoFloating) setIsVideoMinimized(false);
                           }}
                           className="bg-black/60 p-1.5 rounded hover:bg-white/10 transition-colors border border-white/10"
                           title={isVideoFloating ? "Dock Video" : "Detach Video"}
                         >
                           {isVideoFloating ? <ChevronRight className="w-3.5 h-3.5 text-white/70 hover:text-white" /> : <ExternalLink className="w-3.5 h-3.5 text-white/70 hover:text-white" />}
                         </button>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <div className={`flex items-center gap-1 bg-black/60 px-2 py-1 rounded text-[8px] font-mono uppercase tracking-tighter ${isReconnecting ? 'text-red-500' : 'text-brand-green'}`}>
                          {isReconnecting ? (
                            <RefreshCw className="w-2 h-2 animate-spin" />
                          ) : (
                            <Activity className="w-2 h-2" />
                          )}
                          {isReconnecting ? `RETRY_${reconnectCount + 1}` : 'SYNC_OK'}
                        </div>
                      </div>
                      {isReconnecting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                           <div className="flex gap-1 mb-2">
                             {[...Array(MAX_RECONNECT_ATTEMPTS)].map((_, i) => (
                               <div key={i} className={`w-8 h-1 rounded-full ${i <= reconnectCount ? 'bg-brand-green shadow-[0_0_8px_#00FF41]' : 'bg-white/10'}`} />
                             ))}
                           </div>
                           <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Mesh Re-indexing In Progress</span>
                        </div>
                      )}
                    </motion.div>
                    </>
                 ) : (
                   [1, 2, 3].map(i => (
                     <div key={i} className="bg-black/60 rounded-2xl border border-white/5 relative overflow-hidden flex items-center justify-center group flex-1">
                       <div className="absolute top-3 left-3 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                         <span className="text-[8px] font-mono opacity-50">CAM_NODE_0{i}</span>
                       </div>
                       <Monitor className="w-8 h-8 text-white/5 group-hover:text-brand-green/20 transition-colors" />
                     </div>
                   ))
                 )}
              </div>
           </div>
           <div className="flex-1 bento-card p-2">
              <MapOverlay />
           </div>
        </div>

        {/* Bottom Wide: Player Module placeholder (if floating) */}
        {isFloating && !isMinimized && (
           <div className="col-span-8 row-span-2 bento-card p-8 flex items-center justify-center opacity-30 border border-dashed border-white/20">
              <span className="text-xs font-mono text-white/50 uppercase tracking-widest">Player Module Detached</span>
           </div>
        )}
        {(isFloating && isMinimized) && (
           <div className="col-span-8 row-span-2" />
        )}

        {/* Player Module */}
        <motion.div 
           drag={isFloating}
           dragMomentum={false}
           initial={false}
           animate={
             isMinimized ? { scale: 0, opacity: 0, y: 200 } :
             isFloating ? { scale: 1, opacity: 1, position: 'fixed', bottom: 20, left: 20, zIndex: 100, width: "600px", y: 0 } :
             { scale: 1, opacity: 1, position: 'relative', width: 'auto', bottom: 'auto', left: 'auto', zIndex: 1, y: 0 }
           }
           className={`${isFloating ? "shadow-2xl border border-brand-green/30 cursor-move backdrop-blur-xl" : "col-span-8 row-span-2"} bento-card p-8 flex items-center gap-12 bg-gradient-to-r from-brand-green/5 to-black/80 group/player`}
        >
           {/* Detach / Minimize Controls */}
           <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/player:opacity-100 transition-opacity z-50">
             {isFloating && (
               <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white" title="Minimize to tray">
                 <Command className="w-3 h-3" />
               </button>
             )}
             <button onClick={() => setIsFloating(!isFloating)} className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white" title={isFloating ? "Dock Player" : "Detach Player"}>
               {isFloating ? <ChevronRight className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
             </button>
           </div>
           <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full border-4 border-white/5 flex items-center justify-center p-1">
                 <Shield className={`w-10 h-10 ${isPlaying ? 'text-brand-green animate-pulse opacity-100' : 'text-white opacity-20'}`} />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-brand-green/20 rounded-full flex items-center justify-center border border-brand-green/40">
                <Lock className={`w-3 h-3 ${isPlaying ? 'text-brand-green' : 'text-white/20'}`} />
              </div>
           </div>
           <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-2 bg-brand-green/10 border border-brand-green/20 px-2 py-1 rounded-md">
                   {currentMedia?.type === 'radio' && <Radio className="w-3 h-3 text-brand-cyan" />}
                   {currentMedia?.type === 'video' && <Video className="w-3 h-3 text-brand-cyan" />}
                   {currentMedia?.type === 'live_cam' && <Monitor className="w-3 h-3 text-brand-green" />}
                   {currentMedia?.type === 'media' && <Zap className="w-3 h-3 text-yellow-500" />}
                   {currentMedia?.type === 'image' && <ImageIcon className="w-3 h-3 text-purple-400" />}
                   {currentMedia?.type === 'document' && <FileText className="w-3 h-3 text-blue-400" />}
                   {currentMedia?.type === 'rom' && <Gamepad2 className="w-3 h-3 text-orange-400" />}
                   <span className="text-[8px] font-black text-white uppercase tracking-widest">{currentMedia?.type.replace('_', ' ')}</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                     {currentMedia ? currentMedia.name : "NO_SIGNAL_CONNECTED"}
                   </h3>
                   {isReconnecting && (
                     <motion.div 
                       initial={{ opacity: 0 }}
                       animate={{ opacity: [0.5, 1, 0.5] }}
                       transition={{ repeat: Infinity, duration: 1.5 }}
                       className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-md"
                     >
                       <RefreshCw className="w-3 h-3 animate-spin" />
                       RECONNECTING ({reconnectCount + 1}/{MAX_RECONNECT_ATTEMPTS})
                     </motion.div>
                   )}
                 </div>
                 {currentMedia && (
                    <span className={`px-2 py-0.5 text-[8px] font-black rounded border ${
                      isReconnecting ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' :
                      isPlaying ? 'bg-brand-green/10 text-brand-green border-brand-green/20' : 
                      'bg-white/5 text-white/40 border-white/10'
                    }`}>
                      {isReconnecting ? 'BUFFERING...' : isPlaying ? 'LIVE' : 'ARCHIVED'}
                    </span>
                 )}
               </div>

              {/* INTELLIGENCE BRIEFING & REGISTRY VALIDATION PANEL */}
              <div className="mb-4 grid grid-cols-5 gap-4">
                <div className="col-span-3 h-20 bg-white/[0.03] border border-white/5 rounded-xl p-3 flex flex-col justify-center relative overflow-hidden group">
                   <div className="absolute top-0 right-3 flex gap-1 pt-1 opacity-20">
                      <span className="w-1 h-1 bg-brand-green rounded-full" />
                      <span className="w-1 h-1 bg-brand-green rounded-full" />
                   </div>
                   {intelLoading ? (
                     <div className="flex items-center gap-3">
                        <RefreshCw className="w-3 h-3 text-brand-green animate-spin" />
                        <span className="text-[9px] font-mono text-brand-green uppercase animate-pulse">Retrieving Signal Intelligence...</span>
                     </div>
                   ) : intelBrief ? (
                     <div className="flex gap-4 items-start">
                        <Lock className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                        <p className="text-[10px] text-white/60 leading-relaxed font-mono line-clamp-2 italic">
                          {intelBrief}
                        </p>
                     </div>
                   ) : (
                     <div className="flex items-center gap-3 opacity-30">
                        <Shield className="w-3 h-3 text-white" />
                        <span className="text-[9px] font-mono text-white uppercase italic">No intelligence briefing available for this signal node.</span>
                     </div>
                   )}
                </div>

                <div className="col-span-2 h-20 bg-brand-green/[0.03] border border-brand-green/10 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <Fingerprint className={`w-3 h-3 ${validationData?.valid ? 'text-brand-green' : 'text-white/20'}`} />
                         <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Mesh Registry Integrity</span>
                      </div>
                      {isValidatingRegistry && (
                        <RefreshCw className="w-3 h-3 text-brand-green animate-spin" />
                      )}
                      {validationData?.valid && (
                        <div className="flex items-center gap-1">
                           <span className="w-1 h-1 rounded-full bg-brand-green animate-pulse" />
                           <span className="text-[8px] font-mono text-brand-green">BLOCK_SYNCED</span>
                        </div>
                      )}
                   </div>

                   <div className="flex flex-col gap-1">
                      {validationData ? (
                        <>
                          <div className="flex justify-between text-[8px] font-mono">
                             <span className="text-white/20 uppercase">Registry Hash</span>
                             <span className="text-brand-green/80 flex items-center gap-1.5 hover:text-brand-green cursor-default transition-colors">
                               {currentMedia?.registry_hash} <ShieldCheck className="w-2.5 h-2.5" />
                             </span>
                          </div>
                          <div className="flex justify-between text-[8px] font-mono">
                             <span className="text-white/20 uppercase">Consensus Nodes</span>
                             <span className="text-white/60">{validationData.consensus_nodes} ACTIVE_VALIDATORS</span>
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                           <span className="text-[8px] font-mono text-white/10 uppercase italic">Awaiting consensus verification...</span>
                        </div>
                      )}
                   </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-12">
                 <div className="flex-1">
                    <p className="text-[10px] text-white/40 font-mono mb-4 truncate w-full max-w-md">
                      {currentMedia ? `SOURCE [${currentMedia.url}] | TYPE: ${currentMedia.type}` : "AWAITING SECURE STREAM CONNECTION. ENCRYPTION PROTOCOLS STANDING BY."}
                    </p>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center bg-white/5 rounded-2xl border border-white/10 p-1 overflow-hidden">
                          <button 
                            onClick={handlePlay}
                            disabled={!currentMedia || isPlaying}
                            className={`p-3 transition-all rounded-xl ${!currentMedia || isPlaying ? 'opacity-20 pointer-events-none' : 'hover:bg-brand-green hover:text-black text-white'}`}
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                          <button 
                            onClick={handlePause}
                            disabled={!currentMedia || !isPlaying}
                            className={`p-3 transition-all rounded-xl ${!currentMedia || !isPlaying ? 'opacity-20 pointer-events-none' : 'hover:bg-white hover:text-black text-white'}`}
                          >
                            <Pause className="w-4 h-4 fill-current" />
                          </button>
                          <button 
                            onClick={handleStop}
                            disabled={!currentMedia}
                            className={`p-3 transition-all rounded-xl ${!currentMedia ? 'opacity-20 pointer-events-none' : 'hover:bg-red-500 hover:text-white text-white/60'}`}
                          >
                            <Square className="w-4 h-4 fill-current" />
                          </button>
                          <motion.button 
                             whileTap={{ scale: 0.9 }}
                             onClick={handleSkip}
                             className={`p-3 transition-all rounded-xl hover:bg-brand-green hover:text-black text-white/60 ${!currentMedia && displayedResults.length === 0 ? 'opacity-20 pointer-events-none' : ''}`}
                          >
                             <SkipForward className="w-4 h-4 fill-current" />
                          </motion.button>
                       </div>
                       
                       <div className="flex items-center gap-3 px-4 group/vol">
                          <Volume2 className={`w-4 h-4 transition-colors ${volume === 0 ? 'text-red-500' : 'text-white/40 group-hover/vol:text-brand-green'}`} />
                          <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.01" 
                            value={volume} 
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="w-24 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-brand-green group-hover/vol:bg-white/20 transition-all"
                          />
                       </div>

                       <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5 ml-2">
                          {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((preset) => (
                            <button
                              key={preset}
                              onClick={() => setEqPreset(preset)}
                              className={`px-2 py-1 text-[8px] font-black rounded-lg transition-all uppercase tracking-tighter ${
                                eqPreset === preset 
                                ? 'bg-brand-green text-black px-3' 
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {preset.replace('_', ' ')}
                            </button>
                          ))}
                       </div>

                       <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5 ml-2">
                          {([ 'low', 'med', 'high' ] as const).map((q) => (
                            <button
                              key={q}
                              onClick={() => setStreamQuality(q)}
                              className={`px-2 py-1 text-[8px] font-black rounded-lg transition-all uppercase tracking-tighter ${
                                streamQuality === q 
                                ? 'bg-blue-500 text-white px-3 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                : 'text-white/40 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                       </div>
                    </div>
                 </div>
                 <div className="w-48 h-12 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center p-2 overflow-hidden pointer-events-none">
                    <canvas ref={canvasRef} width="200" height="40" className="w-full h-full" />
                 </div>
              </div>
           </div>
        </motion.div>

        {/* System Terminal Log (Bottom Right) */}
        <div className="col-span-4 row-span-2 bento-card p-6 flex flex-col gap-3 bg-black">
           <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black tracking-widest text-brand-green/80 uppercase">System Intelligence Log</span>
              <Activity className="w-3 h-3 text-brand-green/40" />
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 terminal-text space-y-1">
              {systemLogs.map(log => (
                <div key={log.id} className="flex gap-2 opacity-80 border-l border-white/5 pl-2 py-0.5">
                   <span className="text-white/20 text-[8px] whitespace-nowrap">[{log.timestamp}]</span>
                   <span className={`
                     ${log.type === 'success' ? 'text-brand-green' : ''}
                     ${log.type === 'warn' ? 'text-red-500' : ''}
                     ${log.type === 'security' ? 'text-brand-cyan' : ''}
                     ${log.type === 'info' ? 'text-white/60' : ''}
                   `}>
                     {log.text}
                   </span>
                </div>
              ))}
              <div ref={logEndRef} />
           </div>
        </div>

      </div>

      {/* Footer Section */}
      <footer className="h-6 flex items-center justify-between text-[10px] font-mono text-white/20 uppercase tracking-[0.2em] px-2 shrink-0 relative z-50">
        <div className="flex items-center gap-4">
           <span>Nebula OS Build 05.16</span>
           <span className="text-brand-green/50 opacity-40">● L-KERNEL ACTIVE</span>
           <AnimatePresence>
             {(isFloating && isMinimized) && (
               <motion.button
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 onClick={() => setIsMinimized(false)}
                 className="flex items-center gap-2 bg-brand-green/20 hover:bg-brand-green/30 border border-brand-green/40 px-2 py-0.5 rounded text-brand-green transition-colors z-[100] cursor-pointer"
               >
                 <Maximize2 className="w-3 h-3" />
                 <span>RESTORE PLAYER</span>
               </motion.button>
             )}
             {(isVideoFloating && isVideoMinimized) && (
               <motion.button
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9 }}
                 onClick={() => setIsVideoMinimized(false)}
                 className="flex items-center gap-2 bg-brand-cyan/20 hover:bg-brand-cyan/30 border border-brand-cyan/40 px-2 py-0.5 rounded text-brand-cyan transition-colors z-[100] cursor-pointer ml-2"
               >
                 <Maximize2 className="w-3 h-3" />
                 <span>RESTORE VIDEO</span>
               </motion.button>
             )}
           </AnimatePresence>
        </div>
        <div className="flex items-center gap-4">
          <span>{results.length} Nodes Indexed</span>
          <span>{favorites.length} Saved Protocols</span>
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3" />
            E2E_ENCRYPTION_VERIFIED
          </div>
        </div>
      </footer>

      {/* Download Manager Overlay */}
      <AnimatePresence>
        {showDownloads && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-12 right-6 w-96 max-h-[80vh] flex flex-col z-[150] shadow-2xl bento-card p-0 border border-brand-green/20 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-brand-green" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Download Manager</h3>
              </div>
              <div className="flex items-center gap-2">
                <button title="Clear completed" onClick={clearCompletedDownloads} className="text-white/40 hover:text-white transition-colors">
                  <CheckCircle className="w-3.5 h-3.5" />
                </button>
                <button title="Clear failed" onClick={clearFailedDownloads} className="text-white/40 hover:text-white transition-colors">
                  <AlertCircle className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowDownloads(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 bg-black/95 custom-scrollbar space-y-2">
              {downloads.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40 font-mono">No active downloads</div>
              ) : (
                downloads.slice().reverse().map(task => (
                  <div key={task.id} className="p-3 bg-white/5 border border-white/10 rounded-xl relative group overflow-hidden">
                    {task.status === 'downloading' && (
                      <div className="absolute top-0 left-0 bottom-0 bg-brand-green/10" style={{ width: `${task.progress}%` }} />
                    )}
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-1">
                         <span className="text-xs text-white font-bold truncate pr-4">{task.media.name}</span>
                         <span className="text-[10px] font-mono whitespace-nowrap text-brand-green">{task.progress.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <div className="text-[10px] font-mono text-white/40 uppercase">
                          {task.status === 'downloading' ? `${(task.loaded / 1024 / 1024).toFixed(1)} MB / ${(task.total / 1024 / 1024).toFixed(1)} MB` : task.status}
                        </div>
                        <div className="flex gap-1">
                          {task.status === 'downloading' && (
                            <button onClick={() => pauseDownload(task.id)} className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                              <Pause className="w-3 h-3" />
                            </button>
                          )}
                          {task.status === 'paused' && (
                            <button onClick={() => resumeDownload(task.id)} className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                              <Play className="w-3 h-3" />
                            </button>
                          )}
                          {(task.status === 'queued' || task.status === 'downloading' || task.status === 'paused') && (
                            <button onClick={() => cancelDownload(task.id)} className="p-1.5 rounded-lg bg-black/40 hover:bg-red-500/20 text-white/60 hover:text-red-500 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                          {(task.status === 'error' || task.status === 'canceled') && (
                            <button onClick={() => resumeDownload(task.id)} className="p-1.5 rounded-lg bg-black/40 hover:bg-brand-green/20 text-white/60 hover:text-brand-green transition-colors" title="Retry">
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {task.error && (
                         <div className="mt-2 text-[9px] text-red-400 font-mono truncate">{task.error}</div>
                      )}
                      
                      <div className="h-1 mt-2 w-full bg-black/40 rounded-full overflow-hidden flex">
                        <div className={`h-full ${task.status === 'error' || task.status === 'canceled' ? 'bg-red-500/50' : task.status === 'completed' ? 'bg-brand-green' : 'bg-brand-cyan shadow-[0_0_8px_#00E5FF]'}`} style={{ width: `${task.progress}%` }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Terminal Overlay */}
      <AnimatePresence>
         {showTerminal && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-12"
           >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-4xl h-full bento-card p-0 flex flex-col overflow-hidden border-brand-green/20"
              >
                 <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-4">
                       <Terminal className="w-6 h-6 text-brand-green" />
                       <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tighter">OS_INTEL_SYSTEM</h3>
                          <p className="text-[10px] text-white/40 uppercase">AI REFINEMENT ENGINE v2.0</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => setShowTerminal(false)}
                      className="px-4 py-2 border border-white/10 rounded-xl text-[10px] font-black text-white/40 hover:text-white transition-all uppercase"
                    >
                      Close Protocol
                    </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-black/40">
                    <div className="flex gap-4">
                       <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center text-brand-green shrink-0">
                          <CpuIcon className="w-4 h-4" />
                       </div>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-white/80 max-w-2xl leading-relaxed terminal-text">
                          PROMPT RECEIVED. I AM THE NEBULA KERNEL AI. YOU MAY DISCOVER SPECIFIC MEDIA PARAMETERS, REVISE SEARCH PROTOCOLS, OR REQUEST SIGNAL INTELLIGENCE. HOW PROCEED?
                       </div>
                    </div>

                    {terminalLogs.map((log, i) => (
                      <div key={i} className={`flex gap-4 ${log.role === 'user' ? 'flex-row-reverse' : ''}`}>
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${log.role === 'user' ? 'bg-white/10 text-white' : 'bg-brand-green/10 text-brand-green'}`}>
                            {log.role === 'user' ? <ChevronRight className="w-4 h-4" /> : <CpuIcon className="w-4 h-4" />}
                         </div>
                         <div className={`p-4 rounded-2xl border border-white/10 text-xs leading-relaxed terminal-text max-w-2xl ${log.role === 'user' ? 'bg-brand-green/5 text-white' : 'bg-white/5 text-white/80'}`}>
                            {log.text}
                         </div>
                      </div>
                    ))}
                 </div>

                 <form onSubmit={handleTerminalSubmit} className="p-8 bg-black/60 border-t border-white/10">
                    <div className="relative">
                       <input 
                         autoFocus
                         type="text" 
                         value={terminalInput}
                         onChange={(e) => setTerminalInput(e.target.value)}
                         placeholder="INPUT COMMAND OR REFINEMENT PARAMETER..."
                         className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-24 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green/30 font-mono uppercase tracking-widest placeholder:text-white/10"
                       />
                       <button className="absolute right-3 top-3 bottom-3 px-6 bg-brand-green text-black rounded-xl text-[10px] font-black hover:bg-white transition-all uppercase">
                          Encrypt & Send
                       </button>
                    </div>
                    <p className="mt-4 text-[9px] text-white/20 uppercase text-center tracking-[0.3em]">Warning: Direct kernel access is monitored for integrity.</p>
                 </form>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>

      {/* Hidden Audio */}
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
    </div>
  );
}
