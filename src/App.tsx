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
  Maximize,
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
  SkipBack,
  Download,
  Captions as SubtitlesIcon,
  PlusSquare,
  Image as ImageIcon,
  FileText,
  Gamepad2,
  Tv,
  Camera,
  RadioReceiver,
  MonitorPlay,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Book,
  Power
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
  type: "radio" | "video" | "live_cam" | "media" | "image" | "document" | "rom" | "book";
  category?: string;
  description: string;
  tags: string[];
  health?: 'optimal' | 'degraded' | 'unknown' | 'broken';
  relevance_score?: number;
  rating?: number;
  engagement?: "low" | "medium" | "high";
  traffic?: 'minimal' | 'low' | 'medium' | 'high' | 'heavy' | 'extreme';
  threat?: 'none' | 'minimal' | 'low' | 'guarded' | 'high' | 'critical';
  chain_verified?: boolean;
  registry_hash?: string;
  last_block?: number;
  lat?: number;
  lng?: number;
  studio?: string;
  year?: string;
  quality?: string;
  engine?: string;
  mirrors?: string[];
  latency?: number;
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

const NetworkMap = ({ nodes, results, active, onSelect }: { nodes: NodeLocation[], results: MediaResult[], active: boolean, onSelect?: (item: MediaResult) => void }) => {
  const map = useMap();
  
  useEffect(() => {
    if (map && (nodes.length > 0 || results.length > 0)) {
      const bounds = new google.maps.LatLngBounds();
      nodes.forEach(node => bounds.extend(node));
      results.forEach(res => {
        if (res.lat !== undefined && res.lng !== undefined) {
          bounds.extend({ lat: res.lat, lng: res.lng });
        }
      });
      map.fitBounds(bounds, 50);
    }
  }, [map, nodes, results]);

  if (!active && results.length === 0) return null;

  return (
    <>
      {/* Consensus Validator Nodes */}
      {nodes.map((node) => (
        <AdvancedMarker
          key={node.id}
          position={{ lat: node.lat, lng: node.lng }}
        >
          <div className="relative group/validator">
             <div className={`w-2 h-2 rounded-full ${node.status === 'active' ? 'bg-brand-green/40 shadow-[0_0_5px_#00FF41]' : 'bg-red-500/40'} animate-pulse`} />
             <div className="absolute inset-0 bg-brand-green/5 rounded-full animate-ping opacity-10" />
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover/validator:opacity-100 transition-opacity bg-black/80 border border-white/10 px-2 py-1 rounded whitespace-nowrap pointer-events-none z-[200]">
                <span className="text-[7px] font-mono text-brand-green">VALIDATOR_{node.id}</span>
             </div>
          </div>
        </AdvancedMarker>
      ))}

      {/* Media Feed Nodes */}
      {results.map((res, i) => (
        res.lat !== undefined && res.lng !== undefined && (
          <AdvancedMarker
            key={`${res.url}-${i}`}
            position={{ lat: res.lat, lng: res.lng }}
            onClick={() => onSelect?.(res)}
          >
            <div className="relative group/node cursor-pointer">
               <div className={`w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center transition-transform hover:scale-125 ${res.health === 'optimal' ? 'bg-brand-green shadow-[0_0_15px_rgba(0,255,65,0.4)]' : 'bg-yellow-500'}`}>
                  {res.type === 'radio' && <Radio className="w-2 h-2 text-black" />}
                  {res.type === 'video' && <Video className="w-2 h-2 text-black" />}
                  {['live_cam', 'webcam', 'stream'].includes(res.type) && <Camera className="w-2 h-2 text-black" />}
                  {!['radio', 'video', 'live_cam', 'webcam', 'stream'].includes(res.type) && <Activity className="w-2 h-2 text-black" />}
               </div>
               
               {/* Marker Tooltip */}
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/node:opacity-100 transition-all bg-[#0a0a0a]/95 border border-brand-green/30 p-2 rounded-lg shadow-2xl backdrop-blur-xl min-w-[140px] z-[210] pointer-events-none">
                  <div className="flex items-center gap-2 mb-1">
                     <div className={`w-1 h-1 rounded-full ${res.health === 'optimal' ? 'bg-brand-green' : 'bg-yellow-500'} animate-pulse`} />
                     <span className="text-[10px] font-black text-white uppercase truncate">{res.name}</span>
                  </div>
                  <div className="flex justify-between text-[7px] font-mono text-white/40 uppercase">
                     <span>{res.type}</span>
                     <span className="text-brand-green">NODE_LINKED</span>
                  </div>
               </div>
            </div>
          </AdvancedMarker>
        )
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

  const categories = ["All", "video", "radio", "live_cam", "media", "image", "document", "book", "rom"];
  const categoryLabels: Record<string, string> = {
    "All": "Global Mesh",
    "video": "Motion Feed",
    "radio": "Hyper Resonance Nodes",
    "live_cam": "Feed Matrix",
    "media": "Digital Assets",
    "image": "Visual Boards",
    "document": "Dossiers",
    "book": "Manuscripts",
    "rom": "Binary Vault"
  };
  const categoryIcons: Record<string, any> = {
    "All": Globe,
    "video": Tv,
    "radio": RadioReceiver,
    "live_cam": Camera,
    "media": MonitorPlay,
    "image": ImageIcon,
    "document": FileText,
    "book": Book,
    "rom": Gamepad2
  };
  const [currentMedia, setCurrentMedia] = useState<MediaResult | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "radio" | "video" | "live_cam" | "media" | "image" | "document" | "rom" | "book" | "favorites" | "history" | "playlists">("all");
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
  const [systemStats, setSystemStats] = useState({ 
    cpu: 12, 
    ram: 22, 
    net: 45, 
    latency: 24,
    packetLoss: 0.01,
    uptime: "00:00:00" 
  });
  const [workerActive, setWorkerActive] = useState(false);
  const [scannerStep, setScannerStep] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [isValidatingRegistry, setIsValidatingRegistry] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hoveredMedia, setHoveredMedia] = useState<MediaResult | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserStoppingRef = useRef(false);
  
  const [isKernelBooting, setIsKernelBooting] = useState(true);
  const [isVideoFloating, setIsVideoFloating] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);
  const [showMediaInfoOverlay, setShowMediaInfoOverlay] = useState(false);
  const [activeEngine, setActiveEngine] = useState<"NEBULA_DEEP" | "OSINT_SURFACE" | "ONION_CRAWLER" | "QUANTUM_MESH">("QUANTUM_MESH");
  const [streamInfo, setStreamInfo] = useState<{
    resolution?: string;
    bitrate?: string;
    codec?: string;
    fps?: number;
    latency?: string;
    buffer?: number;
  }>({});
  
  // Subtitles State
  const [subtitles, setSubtitles] = useState<string>("");
  const [isSubtitleEnabled, setIsSubtitleEnabled] = useState(false);
  const [isGeneratingSubtitles, setIsGeneratingSubtitles] = useState(false);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000; // 3 seconds

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsKernelBooting(false), 3500);
    return () => clearTimeout(timer);
  }, []);

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
      
      setSystemStats(prev => ({
        cpu: Math.floor(Math.random() * 15) + 5,
        ram: 24,
        net: Math.max(10, Math.min(999, prev.net + (Math.random() - 0.5) * 50)),
        latency: Math.max(5, Math.min(150, prev.latency + (Math.random() - 0.5) * 5)),
        packetLoss: Math.max(0, Math.min(5, prev.packetLoss + (Math.random() - 0.5) * 0.05)),
        uptime: `${h}:${m}:${s}`
      }));
    }, 1000);
    return () => clearInterval(itv);
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchController = useRef<AbortController | null>(null);

  const fetchIntelController = useRef<AbortController | null>(null);

  const fetchIntel = async (signal: MediaResult) => {
    if (fetchIntelController.current) {
        fetchIntelController.current.abort();
    }
    fetchIntelController.current = new AbortController();

    setIntelLoading(true);
    setIntelBrief(null);
    try {
      const res = await fetch("/api/intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal }),
        signal: fetchIntelController.current.signal
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retrieve intelligence");
      setIntelBrief(data.brief);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        addLog(`Intel error: ${err.message || "Failed to retrieve signal intelligence."}`, "warn");
      }
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
  const mediaContainerRef = useRef<HTMLDivElement>(null);
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
    
    if (searchController.current) searchController.current.abort();
    searchController.current = new AbortController();

    setLoading(true);
    setScanProgress(0);
    setScannerStep(1);
    addLog(`[OMEGA_UPGRADE] NEBULA_PROTOCOL_V13_ACTIVE`, "security");
    addLog(`[RESONANCE] CALCULATING OMEGA-VECTORS [V13] FOR: "${finalQuery}"`, "info");
    
    const steps = [
      "OMEGA_RESONANCE_SCAN_V13: ASSIMILATING COCOSCRAPER & UNIVERSAL ARCHITECTURES...",
      "SPECTRAL_ISOLATION: INITIALIZING OMEGA-TV & CINEMA CORE VALIDATION...",
      activeEngine === "ONION_CRAWLER" 
        ? "TORCH_AHMIA_RESONANCE: PENETRATING DECENTRALIZED ONION INDEXES..."
        : activeEngine === "QUANTUM_MESH"
          ? "QUANTUM_MESH_PROBE: SYNCHRONIZING SIGMA & EPSILON VECTORS..."
          : "DEEP_VAULT_PROBE: SIMULATING UNIVERSAL MOVIE SCRAPER [TMDb/XEM]...",
      "SIGNAL_HARMONIZATION: EXFILTRATING REAL-DEBRID & P2P MANIFESTS...",
      "NEURAL_FORENSICS: VALIDATING OMEGA V13 SCHEMA & MAGNET RESOLUTION...",
      "OMEGA_TUNNEL_LOGGED: SECURING QUANTUM-SAFE ENCRYPTED PATHS..."
    ];

    try {
      let searchType = activeCategory !== "All" ? activeCategory : activeTab;
      if (searchType === "favorites" || searchType === "history" || searchType === "playlists") {
        searchType = "all";
      }

      addLog(`[TRANSLATE] Translating query for universal global discovery...`, "info");
      
      const translationPromise = fetch("/api/translate-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery }),
        signal: searchController.current.signal
      });

      for (let i = 0; i < steps.length; i++) {
        if (searchController.current.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        setScannerStep(i + 1);
        setScanProgress(((i + 1) / steps.length) * 100);
        addLog(`[KERNEL] ${steps[i]}`, i === steps.length - 1 ? "success" : "info");
        await new Promise(r => setTimeout(r, 600));
      }

      const translateRes = await translationPromise;
      const translateData = await translateRes.json();
      const queriesToRun: string[] = translateData.translations && translateData.translations.length > 0 
                                      ? translateData.translations 
                                      : [finalQuery];
      
      addLog(`[GLOBAL SENSOR] Dispatched ${queriesToRun.length} parallel queries across language meshes.`, "info");
      setResults([]);
      
      let allResults: MediaResult[] = [];
      const fetchPromises = queriesToRun.map(async (q: string) => {
        try {
          const response = await fetch("/api/discover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: q, type: searchType, engine: activeEngine }),
            signal: searchController.current.signal
          });
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
               allResults = [...allResults, ...data];
               // Deduplicate interactively
               const uniqueResults = allResults.filter((value, index, self) =>
                  index === self.findIndex((t) => (t.url === value.url))
               );
               setResults(uniqueResults);
            }
          }
        } catch (e: any) {
           if (e.name !== 'AbortError') {
             console.warn(`Local node scan failed for query: ${q}`);
           }
        }
      });
      
      await Promise.all(fetchPromises);
      
      const uniqueResults = allResults.filter((value, index, self) =>
          index === self.findIndex((t) => (
            t.url === value.url
          ))
      );
      
      if (uniqueResults.length > 0) {
        addLog(`[SUCCESS] Universal Discovery complete. ${uniqueResults.length} authenticated nodes resolved globally.`, "success");
      } else {
        addLog("[ALERT] No high-integrity nodes found. Switching to sub-mesh passive mode.", "warn");
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
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
    // Force stop everything before switching
    handleStop();
    
    isUserStoppingRef.current = false;
    
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
  };

  useEffect(() => {
    if (!currentMedia) return;

    // Reset Reconnect state on new media
    setIsReconnecting(false);
    setReconnectCount(0);
    setStreamInfo({});

    // Stop and clear previous state
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (currentMedia.type === "radio" && audioRef.current) {
      const audio = audioRef.current;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = "";
      }
      audio.src = currentMedia.url;
      audio.onloadedmetadata = () => {
        setStreamInfo(prev => ({
          ...prev,
          codec: 'Audio/MPEG',
          bitrate: 'VBR/Constant'
        }));
      };
      audio.onerror = () => handleStreamError(currentMedia);
      audio.onplay = () => {
        setIsReconnecting(false);
        addLog(`[SUCCESS] Audio sync established: ${currentMedia.name}`, "success");
      };
      audio.play().catch(e => {
        console.error("Audio error", e);
        handleStreamError(currentMedia);
      });
      return;
    }

    if (currentMedia.type === "image" || currentMedia.type === "document" || currentMedia.type === "rom" || currentMedia.type === "book") {
        setIsPlaying(true);
        addLog(`${currentMedia.type.toUpperCase()} Feed linked: ${currentMedia.name}`, "info");
        return;
    }

    if (currentMedia.type === "video" || currentMedia.type === "live_cam" || currentMedia.type === "media") {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }

        const isYouTube = currentMedia.url.includes("youtube.com") || currentMedia.url.includes("youtu.be");
        if (isYouTube) {
          setIsPlaying(true);
          addLog(`YouTube feed connected: ${currentMedia.name}`, "info");
        } else {
          // Video tag playback
          setTimeout(() => {
            if (!videoRef.current) return;
            const video = videoRef.current;
            
            if (Hls.isSupported() && currentMedia.url.includes('.m3u8')) {
              const hls = new Hls({
                autoStartLoad: true,
                capLevelToPlayerSize: true,
                manifestLoadingMaxRetry: 3,
                levelLoadingMaxRetry: 3
              });
              hls.loadSource(currentMedia.url);
              hls.attachMedia(video);
              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                applyQualityToHls(hls, streamQuality);
                video.play().catch(e => {
                  console.error("Playback error", e);
                  handleStreamError(currentMedia);
                });
                setIsReconnecting(false);
                addLog(`[SUCCESS] Video mesh established: ${currentMedia.name}`, "success");
              });

              hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
                const level = hls.levels[data.level];
                if (level) {
                   setStreamInfo(prev => ({
                     ...prev,
                     resolution: `${level.width}x${level.height}`,
                     bitrate: `${(level.bitrate / 1000000).toFixed(2)} Mbps`,
                     codec: level.videoCodec || level.audioCodec || 'H.264'
                   }));
                }
              });

              hls.on(Hls.Events.FRAG_BUFFERED, (_, data) => {
                 if (video) {
                    const buffered = video.buffered;
                    if (buffered.length > 0) {
                       const bufferLen = buffered.end(buffered.length - 1) - video.currentTime;
                       setStreamInfo(prev => ({ ...prev, buffer: parseFloat(bufferLen.toFixed(2)) }));
                    }
                 }
              });

              hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                  handleStreamError(currentMedia);
                  hls.destroy();
                  hlsRef.current = null;
                }
              });

              hlsRef.current = hls;
            } else {
              video.src = currentMedia.url;
              video.onloadedmetadata = () => {
                setStreamInfo(prev => ({
                  ...prev,
                  resolution: `${video.videoWidth}x${video.videoHeight}`,
                  codec: 'Native'
                }));
              };
              video.onplay = () => {
                setIsReconnecting(false);
                addLog(`[SUCCESS] Native signal restored: ${currentMedia.name}`, "success");
              };
              video.onerror = () => handleStreamError(currentMedia);
              video.play().catch(e => {
                console.error("Playback error", e);
                handleStreamError(currentMedia);
              });
            }
          }, 50);
        }
    }
  }, [currentMedia]);

  const handleStreamError = (media: MediaResult) => {
    if (isUserStoppingRef.current) return;
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
      
      const barWidth = (canvas.width / 2 / (bufferLength / 2)) * 1.5;
      let barHeight;
      const centerX = canvas.width / 2;

      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00FF41';

      for (let i = 0; i < bufferLength / 2; i++) {
        barHeight = (dataArray[i] / 255) * (canvas.height * 0.8);
        
        const hue = 140 + (i / bufferLength) * 100;
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${0.3 + (dataArray[i]/255)})`;
        
        // Symmetrical bars
        ctx.fillRect(centerX + (i * barWidth), (canvas.height - barHeight) / 2, barWidth - 1, barHeight);
        ctx.fillRect(centerX - (i * barWidth), (canvas.height - barHeight) / 2, barWidth - 1, barHeight);
      }
      
      ctx.shadowBlur = 0;
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
    isUserStoppingRef.current = true;
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    setIsPlaying(false);
    setIsReconnecting(false);
    setReconnectCount(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current.load(); // Force reset
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = "";
      // Explicitly clear HLS if active, though handled below
      if (videoRef.current.hasChildNodes()) {
         // Some browsers/HLS implementations might need this
         while(videoRef.current.firstChild) {
            videoRef.current.removeChild(videoRef.current.firstChild);
         }
      }
      videoRef.current.load(); // Force reset
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
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

  const handleFullscreen = async () => {
    if (!mediaContainerRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await mediaContainerRef.current.requestFullscreen();
      }
    } catch (err) {
      addLog("Fullscreen mode is not supported by your browser.", "warn");
    }
  };

  const handleSkipBackward = async () => {
    if (activePlaylistId) {
      const playlist = playlists.find(p => p.id === activePlaylistId);
      if (playlist && playlist.items.length > 0) {
        const currentIndex = currentMedia ? playlist.items.findIndex(r => r.url === currentMedia.url) : -1;
        const prevIndex = currentIndex <= 0 ? playlist.items.length - 1 : currentIndex - 1;
        const prevMedia = playlist.items[prevIndex];
        
        addLog(`Skipping to previous in playlist ${playlist.name}: ${prevMedia.name}`, "info");
        playMedia(prevMedia);
        return;
      }
    }

    const list = activeTab === "favorites" 
      ? favorites 
      : activeTab === "history" 
      ? history 
      : results.filter(r => (activeCategory === "All" || r.type === activeCategory) && (activeTab === 'all' || r.type === activeTab));

    if (list.length === 0) {
      return;
    }

    const currentIndex = currentMedia ? list.findIndex(r => r.url === currentMedia.url) : -1;
    const prevIndex = currentIndex <= 0 ? list.length - 1 : currentIndex - 1;
    const prevMedia = list[prevIndex];
    
    addLog(`Skipping to previous signal: ${prevMedia.name}`, "info");
    playMedia(prevMedia);
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
      : results.filter(r => (activeCategory === "All" || r.type === activeCategory) && (activeTab === 'all' || r.type === activeTab));

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
    if (isPlaying) {
      const type = currentMedia?.type;
      
      if (type === 'radio' && audioRef.current) {
        audioRef.current.pause();
      } else if ((type === 'video' || type === 'live_cam' || type === 'media') && videoRef.current) {
        // Only pause if not YouTube (YouTube is in iframe)
        if (!currentMedia?.url.includes("youtube.com") && !currentMedia?.url.includes("youtu.be")) {
          videoRef.current.pause();
        }
      }
      
      setIsPlaying(false);
      addLog("Stream session suspended.", "info");
    }
  };

  const handlePlay = () => {
    if (!isPlaying && currentMedia) {
      const type = currentMedia.type;
      
      if (type === 'radio' && audioRef.current) {
        audioRef.current.play().catch(e => {
          addLog("Error resuming audio stream.", "warn");
        });
      } else if ((type === 'video' || type === 'live_cam' || type === 'media') && videoRef.current) {
        // Only play if not YouTube
        if (!currentMedia.url.includes("youtube.com") && !currentMedia.url.includes("youtu.be")) {
          videoRef.current.play().catch(e => {
            addLog("Error resuming video stream.", "warn");
          });
        }
      }
      
      setIsPlaying(true);
      addLog("Signal synchronization active.", "info");
    }
  };

  const displayedResults = activeTab === "favorites" 
    ? favorites 
    : activeTab === "history" 
    ? history 
    : results.filter(r => (activeCategory === "All" || r.type === activeCategory) && (activeTab === 'all' || r.type === activeTab));

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
            <NetworkMap 
              nodes={validationData?.nodes || []} 
              results={results}
              active={true}
              onSelect={(item) => playMedia(item)}
            />
          </Map>
        </APIProvider>
        <div className="absolute top-2 left-2 flex items-center gap-2 bg-black/60 px-2 py-1 rounded border border-white/10 backdrop-blur-md">
           <Globe className="w-2.5 h-2.5 text-brand-green animate-pulse" />
           <span className="text-[8px] font-black text-brand-green uppercase tracking-widest">Global_Mesh_Distribution</span>
        </div>
        
        <div className="absolute bottom-2 left-2 bg-black/80 p-2 rounded-lg border border-white/5 backdrop-blur-md max-w-[120px]">
           <div className="flex items-center justify-between text-[7px] font-mono text-white/40 mb-1">
              <span>ACTIVE_NODES:</span>
              <span className="ml-2 text-brand-green">{results.filter(r => r.health === 'optimal').length}</span>
           </div>
           <div className="flex items-center justify-between text-[7px] font-mono text-white/40">
              <span>DEGRADED:</span>
              <span className="ml-2 text-yellow-500">{results.filter(r => r.health !== 'optimal' && r.health !== 'broken').length}</span>
           </div>
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
    <div className="h-screen w-full bg-[#050505] text-white p-4 font-sans select-none overflow-hidden flex flex-col gap-4 relative">
      {/* GLOBAL DATA TRACE BACKGROUND */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[url('https://api.studio/assets/grid.svg')] bg-[size:40px_40px]" />
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ x: -100, y: Math.random() * 100 + "%", opacity: 0 }}
            animate={{ 
              x: "110%", 
              opacity: [0, 1, 0] 
            }}
            transition={{ 
              duration: 5 + Math.random() * 10, 
              repeat: Infinity, 
              delay: i * 2,
              ease: "linear"
            }}
            className="h-[1px] w-48 bg-gradient-to-r from-transparent via-brand-green to-transparent"
          />
        ))}
      </div>
      
      {/* GLOBAL STATUS BAR */}
      <div className="h-8 shrink-0 flex items-center justify-between px-6 bg-white/5 border border-white/10 rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-green/5 via-transparent to-brand-green/5 animate-pulse pointer-events-none" />
        <div className="flex items-center gap-6 relative z-10">
            <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
            <span className="text-[10px] font-black tracking-widest text-white/80 uppercase">Nebula_V13_Omega_Kernel</span>
          </div>
          {workerActive && (
            <div className="flex items-center gap-2 text-brand-cyan/80 animate-pulse border-l border-white/10 pl-6 h-4">
              <Cpu className="w-3 h-3" />
              <span className="text-[9px] font-black tracking-widest uppercase">Omega_Accelerator_V13_Active</span>
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,65,0.03),transparent)] pointer-events-none" />
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Layers className="w-32 h-32 rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-brand-green rounded flex items-center justify-center shadow-[0_0_15px_rgba(0,255,65,0.4)]">
                <Cpu className="w-5 h-5 text-black animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-[0.2em] uppercase">NEBULA_OMEGA_V13</h1>
                <p className="text-[8px] text-brand-green font-mono uppercase opacity-60">Omega Resonance Engine v13.0.0 [Quantum_Safe]</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { id: 'all', icon:Globe, label: 'GLOBAL MESH' },
                { id: 'radio', icon:Radio, label: 'AUDIO / RADIO' },
                { id: 'video', icon:Video, label: 'VIDEO / MOTION' },
                { id: 'live_cam', icon:Monitor, label: 'LIVE FEED / CAMS' },
                { id: 'media', icon:Zap, label: 'DIGITAL MEDIA' },
                { id: 'image', icon:ImageIcon, label: 'IMAGE BOARDS' },
                { id: 'document', icon:FileText, label: 'DOCUMENTS' },
                { id: 'book', icon:Book, label: 'DIGITAL BOOKS' },
                { id: 'rom', icon:Gamepad2, label: 'ROM ARCHIVE' },
                { id: 'favorites', icon:Star, label: 'SAVED_NODES' },
                { id: 'history', icon:Clock, label: 'SIGNAL_HISTORY' },
                { id: 'playlists', icon:List, label: 'TUNNELS' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setActiveCategory("All");
                  }}
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
            <h4 className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase mb-1">Network_Telemetry</h4>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-white/50 tracking-widest uppercase">
                   <span>Bandwidth</span>
                   <span className="text-brand-green font-mono">{systemStats.net.toFixed(1)} MB/s</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     animate={{ width: `${Math.min(100, (systemStats.net / 1000) * 100)}%` }}
                     className="h-full bg-brand-green shadow-[0_0_10px_#00FF41]" 
                   />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <div className="flex justify-between text-[8px] text-white/30 uppercase tracking-tighter">
                     <span>Latency</span>
                     <span className={`font-mono ${systemStats.latency > 100 ? 'text-red-400 animate-pulse' : 'text-brand-cyan'}`}>{systemStats.latency.toFixed(0)}ms</span>
                   </div>
                   <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                     <motion.div 
                       animate={{ width: `${Math.min(100, (systemStats.latency / 150) * 100)}%` }}
                       className={`h-full ${systemStats.latency > 100 ? 'bg-red-400' : 'bg-brand-cyan'}`} 
                     />
                   </div>
                </div>
                <div className="space-y-1">
                   <div className="flex justify-between text-[8px] text-white/30 uppercase tracking-tighter">
                     <span>Loss</span>
                     <span className={`font-mono ${systemStats.packetLoss > 1 ? 'text-red-400 animate-pulse' : 'text-yellow-500'}`}>{systemStats.packetLoss.toFixed(2)}%</span>
                   </div>
                   <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                     <motion.div 
                       animate={{ width: `${Math.min(100, (systemStats.packetLoss / 5) * 100)}%` }}
                       className={`h-full ${systemStats.packetLoss > 1 ? 'bg-red-400' : 'bg-yellow-500'}`} 
                     />
                   </div>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-white/20 font-mono leading-tight pt-2">
              SYSTEM_KERNEL: OMEGA_V13<br/>
              MESH_STATUS: ENCRYPTED<br/>
              IP_ADDR: [REDACTED]<br/>
              LOC: UNKNOWN
            </div>
          </div>
        </aside>

        {/* Center Main Module: Search & Featured */}
        <div className="col-span-6 row-span-4 bento-card flex flex-col p-8 gap-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://api.studio/assets/grid.svg')] opacity-[0.03] pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-green/5 via-transparent to-brand-cyan/5 pointer-events-none" />
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
                
                 <h2 className="text-2xl font-black text-white mb-4 italic tracking-tight">Synchronizing Omega Resonance...</h2>
                <div className="flex gap-2 mb-10">
                   {[1,2,3,4,5].map(i => (
                     <div key={i} className={`w-16 h-1 rounded-full transition-all duration-700 ${i <= scannerStep ? 'bg-brand-green shadow-[0_0_15px_#00FF41]' : 'bg-white/5'}`} />
                   ))}
                </div>
                
                <div className="space-y-4 max-w-sm w-full">
                   <div className="flex justify-between text-[10px] font-mono text-brand-green uppercase tracking-widest">
                      <span>{scanProgress < 100 ? 'Deep Neural Analysis...' : 'Omega Resonance Locked'}</span>
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
                     [HYPER_RESONANCE] Executing multi-vector extraction across unindexed shadow clusters... Chromium-core isolation ACTIVE.
                   </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between gap-4">
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0 relative group">
              <div className="absolute -top-5 left-0 text-[6px] font-black text-brand-green/30 tracking-[0.3em] uppercase opacity-0 group-hover:opacity-100 transition-opacity">OMEGA_RESONANCE_V13_ACTIVE</div>
               {(['OSINT_SURFACE', 'NEBULA_DEEP', 'ONION_CRAWLER', 'QUANTUM_MESH'] as const).map((e, idx) => (
                 <button 
                   key={e}
                   onClick={() => setActiveEngine(e)}
                   title={e === 'ONION_CRAWLER' ? 'Hyper Resonance + Torrent Index' : e === 'QUANTUM_MESH' ? 'Quantum Mesh Discovery (CoCoScraper+Vite)' : e === 'NEBULA_DEEP' ? 'Deep Forensic Extraction' : 'Surface OSINT Discovery'}
                   className={`px-3 py-2 rounded-lg text-[8px] font-black tracking-widest transition-all ${activeEngine === e ? 'bg-brand-green/20 text-brand-green border border-brand-green/20 shadow-[0_0_10px_rgba(0,255,65,0.1)]' : 'text-white/20 hover:text-white/40'}`}
                 >
                   {e === 'ONION_CRAWLER' ? 'LAYER_TORCH' : e === 'QUANTUM_MESH' ? 'LAYER_OMEGA' : `LAYER_${idx}`}
                 </button>
               ))}
            </div>
            <form onSubmit={handleSearch} className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter discovery parameters..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-6 pr-24 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-green/30 transition-all font-mono tracking-wider placeholder:text-white/10"
              />
              <button 
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green px-6 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 border border-brand-green/20"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Deep Scan
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
                  <h3 className="text-sm font-black text-white px-2">
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
                   onClick={() => {
                     setActiveCategory(cat);
                     if (cat !== "All") setActiveTab("all");
                     if (query && !loading) {
                        // Small timeout to allow state to settle
                        setTimeout(() => handleSearch(undefined, query), 50);
                     }
                   }}
                   className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border transition-all whitespace-nowrap ${
                     activeCategory === cat
                       ? "bg-brand-green/10 text-brand-green border-brand-green/20"
                       : "bg-white/5 text-white/30 border-transparent hover:bg-white/10 hover:text-white"
                   }`}
                 >
                   <Icon className="w-3 h-3" />
                   {categoryLabels[cat]}
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
                         onMouseEnter={() => {
                           if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                           hoverTimeoutRef.current = setTimeout(() => setHoveredMedia(item), 800);
                         }}
                         onMouseLeave={() => {
                           if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                           setHoveredMedia(null);
                         }}
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
                               <div className="flex items-center gap-1.5">
                                  <div className="flex gap-0.5">
                                    {[1,2,3,4].map(i => (
                                      <div key={i} className={`w-1 h-3 rounded-full ${i <= (item.relevance_score! * 4) ? 'bg-brand-green shadow-[0_0_5px_#00FF41]' : 'bg-white/10'}`} />
                                    ))}
                                  </div>
                                  <span className="text-[10px] font-black text-brand-green">{(item.relevance_score! * 100).toFixed(0)}%</span>
                               </div>
                                {item.engine && (
                                   <span className="text-[7px] font-black font-mono px-1 rounded-sm bg-brand-cyan/20 text-brand-cyan uppercase tracking-tighter whitespace-nowrap">
                                      {item.engine.split('_')[0]}
                                   </span>
                                )}
                               {item.traffic && (
                                  <span className={`text-[6px] font-mono px-1 rounded ${item.traffic === 'extreme' ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-white/40'}`}>
                                     {item.traffic.toUpperCase()}
                                  </span>
                               )}
                            </div>
                         </div>
                         <h4 className="text-xs font-black text-white leading-tight group-hover:text-brand-green transition-all line-clamp-1 mb-1 flex items-center gap-2">
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
                            <button 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                playMedia(item); 
                                setIsVideoFloating(true);
                              }}
                              className="p-1 rounded bg-white/5 text-white/20 hover:text-brand-cyan hover:bg-brand-cyan/10 border border-white/5 transition-all ml-1"
                              title="Detach Player"
                            >
                              <ExternalLink className="w-3 h-3" />
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
                          onMouseEnter={() => {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = setTimeout(() => setHoveredMedia(item), 800);
                          }}
                          onMouseLeave={() => {
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                            setHoveredMedia(null);
                          }}
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
                            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                <div className="flex gap-0.5">
                                  {[1,2,3,4,5].map(i => (
                                    <div key={i} className={`w-1 h-2 rounded-full ${i <= (item.relevance_score! * 5) ? 'bg-brand-green shadow-[0_0_3px_#00FF41]' : 'bg-white/5'}`} />
                                  ))}
                                </div>
                                <span className="text-[8px] font-black text-brand-green">{(item.relevance_score! * 100).toFixed(0)}%</span>
                            </div>
                            {item.relevance_score !== undefined && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/20">
                                REL DISCOVERY
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
                            {item.engine && (
                              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter text-brand-green bg-brand-green/10 border border-brand-green/20">
                                SCRAPER: {item.engine.split('_')[0]}
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
                            {item.type === 'book' && <Book className="w-3 h-3 text-orange-400" />}
                            {item.type === 'rom' && <Gamepad2 className="w-3 h-3 text-orange-400" />}
                            {item.name}
                         </h4>
                         <p className="text-[10px] text-white/40 mt-0.5 line-clamp-1">{item.description}</p>
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
                        <div className="p-2 rounded-xl bg-white/5 text-white/20 group-hover:text-brand-cyan hover:bg-brand-cyan/10 transition-all cursor-pointer" 
                             onClick={(e) => { e.stopPropagation(); playMedia(item); setIsVideoFloating(true); }}
                             title="Detach Player"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </div>
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
                 {(currentMedia?.type === 'radio' || currentMedia?.type === 'video' || currentMedia?.type === 'live_cam' || currentMedia?.type === 'media' || currentMedia?.type === 'webcam' || currentMedia?.type === 'stream' || currentMedia?.type === 'image' || currentMedia?.type === 'document' || currentMedia?.type === 'rom' || currentMedia?.type === 'book') ? (
                    <>
                    {isVideoFloating && !isVideoMinimized && (
                        <div className="bg-black/40 rounded-2xl border border-dashed border-white/20 relative flex items-center justify-center flex-1 opacity-30">
                            <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">Feed Detached</span>
                        </div>
                    )}
                    {(isVideoFloating && isVideoMinimized) && (
                        <div className="flex-1" />
                    )}
                    <div
                        className="flex-1 border border-brand-green/20 bg-black rounded-2xl relative overflow-hidden flex items-center justify-center group"
                    >
                      {currentMedia?.type === 'radio' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-brand-green/10 to-black p-6 relative">
                           <div className="w-32 h-32 rounded-full border-2 border-brand-green/20 flex items-center justify-center relative">
                              <Radio className="w-12 h-12 text-brand-green animate-pulse" />
                              <div className="absolute inset-0 border border-brand-green/10 rounded-full animate-[ping_3s_linear_infinite]" />
                              <div className="absolute inset-0 border border-brand-cyan/5 rounded-full animate-[ping_5s_linear_infinite]" />
                              <div className="absolute inset-0 bg-brand-green/5 rounded-full animate-pulse opacity-20" />
                           </div>
                           <div className="mt-6 text-center z-10">
                              <h4 className="text-sm font-black text-white mb-1">{currentMedia.name}</h4>
                              <p className="text-[10px] text-brand-green font-mono uppercase opacity-60">Audio Signal Synchronized</p>
                           </div>
                           <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-30 pointer-events-none">
                              <canvas ref={canvasRef} width="400" height="150" className="w-full h-full" />
                           </div>
                        </div>
                      ) : currentMedia?.type === 'image' ? (
                        <img src={currentMedia.url} className="w-full h-full object-contain bg-black" alt={currentMedia.name} crossOrigin="anonymous" />
                      ) : currentMedia?.type === 'document' || currentMedia?.type === 'rom' || currentMedia?.type === 'book' ? (
                        <iframe src={currentMedia.url} className="w-full h-full bg-white relative z-[1]" title={currentMedia.name} />
                      ) : currentMedia?.url?.includes('youtube.com') || currentMedia?.url?.includes('youtu.be') ? (
                        <iframe 
                          src={`https://www.youtube.com/embed/${currentMedia.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1] ?? ''}?autoplay=1&mute=0&controls=1`}
                          className="w-full h-full object-cover"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div id="video-container" className="relative w-full h-full group overflow-hidden flex items-center justify-center bg-black">
                          <video 
                            ref={videoRef} 
                            onEnded={() => setIsPlaying(false)}
                            className={`max-h-full max-w-full transition-opacity duration-700 ${isReconnecting ? 'opacity-20' : 'opacity-100'}`} 
                            controls={false} 
                            muted={false} 
                            crossOrigin="anonymous" 
                          />
                          <button 
                            onClick={() => {
                                const container = document.getElementById('video-container');
                                if (!document.fullscreenElement) {
                                    container?.requestFullscreen().catch(e => console.error(e));
                                } else {
                                    document.exitFullscreen().catch(e => console.error(e));
                                }
                            }}
                            className="absolute bottom-4 right-4 z-50 p-2 bg-black/60 rounded hover:bg-white/20 transition-all border border-white/10 opacity-0 group-hover:opacity-100"
                          >
                            <Maximize2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
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
                        {/* Technical Metadata Overlay */}
                        <div className="flex items-center gap-3 mr-4 bg-black/80 px-3 py-1.5 rounded-lg border border-white/5 backdrop-blur-md">
                          {streamInfo.resolution && (
                            <div className="flex flex-col items-center">
                              <span className="text-[6px] font-mono text-white/40 uppercase">Res</span>
                              <span className="text-[8px] font-black text-brand-green">{streamInfo.resolution}</span>
                            </div>
                          )}
                          {streamInfo.bitrate && (
                            <div className="flex flex-col items-center border-l border-white/10 pl-3">
                              <span className="text-[6px] font-mono text-white/40 uppercase">Bitrate</span>
                              <span className="text-[8px] font-black text-brand-cyan">{streamInfo.bitrate}</span>
                            </div>
                          )}
                          {streamInfo.buffer !== undefined && (
                            <div className="flex flex-col items-center border-l border-white/10 pl-3">
                              <span className="text-[6px] font-mono text-white/40 uppercase">Buffer</span>
                              <span className="text-[8px] font-black text-yellow-500">{streamInfo.buffer}s</span>
                            </div>
                          )}
                        </div>

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
                      
                     </div>
                      
                      <AnimatePresence>
                        {showMediaInfoOverlay && currentMedia && (
                          <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col p-6 overflow-y-auto"
                          >
                            <div className="flex justify-between items-start mb-6">
                              <h3 className="text-xl font-bold text-white tracking-wide font-sans">{currentMedia.name}</h3>
                              <button 
                                onClick={() => setShowMediaInfoOverlay(false)}
                                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                              >
                                <X className="w-4 h-4 text-white" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs font-mono mb-8 text-white/70">
                              <div className="flex flex-col">
                                <span className="text-white/40 mb-1">TYPE_IDENTIFIER</span>
                                <span className="uppercase text-brand-green font-black">{currentMedia.type}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-white/40 mb-1">SCAPER_ENGINE</span>
                                <span className="uppercase text-brand-cyan">{currentMedia.engine || "CORE_V3"}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-white/40 mb-1">PRODUCER_STUDIO</span>
                                <span className="uppercase">{currentMedia.studio || "UNKNOWN_SOURCE"}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-white/40 mb-1">SIGNAL_YEAR</span>
                                <span>{currentMedia.year || "N/A"}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-white/40 mb-1">MAX_QUALITY</span>
                                <span className="uppercase text-yellow-500">{currentMedia.quality || "AUTO_ADAPT"}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-white/40 mb-1">CATEGORY</span>
                                <span className="uppercase">{currentMedia.category}</span>
                              </div>
                              <div className="flex flex-col border-t border-white/5 pt-4">
                                <span className="text-white/40 mb-1">ACTIVE_RESOLUTION</span>
                                <span className="text-brand-green">{streamInfo.resolution || "CALCULATING..."}</span>
                              </div>
                              <div className="flex flex-col border-t border-white/5 pt-4">
                                <span className="text-white/40 mb-1">REALTIME_BITRATE</span>
                                <span className="text-brand-cyan">{streamInfo.bitrate || "PENDING..."}</span>
                              </div>
                              <div className="flex flex-col border-t border-white/5 pt-4">
                                <span className="text-white/40 mb-1">SIGNAL_CODEC</span>
                                <span>{streamInfo.codec || "DETECTING..."}</span>
                              </div>
                              <div className="flex flex-col border-t border-white/5 pt-4">
                                <span className="text-white/40 mb-1">JITTER_BUFFER</span>
                                <span className="text-yellow-500">{streamInfo.buffer ? `${streamInfo.buffer}s` : "STABILIZING..."}</span>
                              </div>
                              <div className="flex flex-col col-span-2 border-t border-white/5 pt-4">
                                <span className="text-white/40 mb-1">SOURCE_NODE_HASH</span>
                                <span className="truncate break-all opacity-60 text-[10px]">{currentMedia.url}</span>
                              </div>
                            </div>
                            
                            <div className="mb-8">
                                <h4 className="text-[10px] font-black text-white/40 uppercase mb-2 tracking-[0.2em]">Plot Summary / Briefing</h4>
                                <p className="text-sm leading-relaxed text-white/80">{currentMedia.description}</p>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {currentMedia.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white/40 hover:text-white/80 hover:border-white/30 transition-colors uppercase tracking-widest cursor-default">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            
                            {currentMedia.tags && currentMedia.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-6">
                                  {currentMedia.tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase tracking-wider text-white/60">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                            )}
                            
                            {currentMedia.description && (
                              <div className="mt-auto pt-4 border-t border-white/10">
                                <span className="text-white/40 text-[10px] uppercase font-mono block mb-2 tracking-widest">Decrypted Synopsis</span>
                                <p className="text-sm text-white/80 leading-relaxed font-sans">{currentMedia.description}</p>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                 ) : (
                   <div className="flex-1 bg-black/40 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-8 group">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,65,0.08),transparent)] animate-pulse" />
                      <div className="relative z-10 flex flex-col items-center gap-8">
                         <div className="relative w-32 h-32">
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-0 border-[3px] border-dashed border-brand-green/30 rounded-full"
                            />
                            <motion.div 
                              animate={{ rotate: -360 }}
                              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-4 border-2 border-dashed border-brand-cyan/20 rounded-full"
                            />
                            <motion.div 
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute inset-8 border border-brand-green/40 rounded-full bg-brand-green/5"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                               <Shield className="w-12 h-12 text-brand-green group-hover:scale-110 transition-transform duration-500" />
                            </div>
                         </div>
                         <div className="flex flex-col items-center gap-3">
                            <h4 className="text-[12px] font-black text-white/60 uppercase tracking-[0.5em]">Omega_Core_Active_V13</h4>
                            <div className="flex gap-2">
                               {[1,2,3,4,5,6,7,8,9].map(i => (
                                 <motion.div 
                                   key={i}
                                   animate={{ height: [4, 20, 4] }}
                                   transition={{ duration: 0.6, delay: i * 0.05, repeat: Infinity }}
                                   className="w-1 bg-brand-green/40 rounded-full"
                                 />
                               ))}
                            </div>
                         </div>
                         <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest text-center max-w-[300px] leading-relaxed">
                            Omega resonance patterns locked. Quantum-safe encryption initialized. OMEGA_PROTOCOLS synchronized.
                         </p>
                      </div>
                      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-brand-green shadow-[0_0_15px_#00FF41] animate-pulse" />
                            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Resonance_V13_Omega</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-brand-cyan/10 text-brand-cyan text-[8px] font-black uppercase tracking-tighter">AES_P2P_ACTIVE</span>
                         </div>
                      </div>
                   </div>
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
                   {currentMedia?.type === 'book' && <Book className="w-3 h-3 text-orange-400" />}
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
                          <motion.button 
                             whileTap={{ scale: 0.9 }}
                             onClick={handleSkipBackward}
                             className={`p-3 transition-all rounded-xl hover:bg-brand-green hover:text-black text-white/60 ${!currentMedia && displayedResults.length === 0 ? 'opacity-20 pointer-events-none' : ''}`}
                          >
                             <SkipBack className="w-4 h-4 fill-current" />
                          </motion.button>
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
                          <motion.button 
                             whileTap={{ scale: 0.9 }}
                             onClick={handleFullscreen}
                             className={`p-3 transition-all rounded-xl hover:bg-white hover:text-black text-white/60 ${!currentMedia ? 'opacity-20 pointer-events-none' : ''}`}
                             title="Fullscreen"
                          >
                             <Maximize className="w-4 h-4" />
                          </motion.button>
                          <motion.button 
                             whileTap={{ scale: 0.9 }}
                             onClick={() => setShowMediaInfoOverlay(prev => !prev)}
                             className={`p-3 transition-all rounded-xl hover:bg-white hover:text-black text-white/60 ${!currentMedia ? 'opacity-20 pointer-events-none' : ''}`}
                             title="Media Info"
                          >
                             <Info className="w-4 h-4" />
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

      {/* Hover Preview Overlay */}
      <AnimatePresence>
        {hoveredMedia && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            }}
            onMouseLeave={() => setHoveredMedia(null)}
            className="fixed bottom-24 right-8 z-[100] w-80 bg-black/95 border border-brand-green/40 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden"
          >
            <div className="h-44 bg-brand-green/5 relative flex items-center justify-center overflow-hidden group/prev">
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10" />
                {hoveredMedia.type === 'video' || hoveredMedia.type === 'stream' ? (
                  <Video className="w-12 h-12 text-brand-green/20 animate-pulse" />
                ) : hoveredMedia.type === 'radio' ? (
                  <Radio className="w-12 h-12 text-brand-cyan/20 animate-pulse" />
                ) : (
                  <Activity className="w-12 h-12 text-white/10" />
                )}
                
                <div className="absolute top-3 left-3 z-20 flex gap-1">
                   <div className="px-2 py-0.5 bg-brand-green text-black text-[8px] font-black rounded uppercase tracking-widest flex items-center gap-1.5">
                     <ShieldCheck className="w-2.5 h-2.5" />
                     V13_SECURE_SCAN
                   </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover/prev:opacity-100 transition-opacity">
                   <button 
                     onClick={() => {
                       playMedia(hoveredMedia);
                       setIsVideoFloating(true);
                       setHoveredMedia(null);
                     }}
                     className="bg-brand-green text-black px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform"
                   >
                     <ExternalLink className="w-3.5 h-3.5" />
                     Detach & Play
                   </button>
                </div>
            </div>
            <div className="p-5 relative z-20">
               <h4 className="text-sm font-black text-white uppercase tracking-tighter mb-1 truncate">
                 {hoveredMedia.name}
               </h4>
               <p className="text-[10px] text-white/50 line-clamp-2 mb-4 leading-relaxed font-mono">
                 {hoveredMedia.description}
               </p>
               <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                     <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 text-brand-green uppercase border border-brand-green/20">
                       {hoveredMedia.type}
                     </span>
                     <span className="text-[8px] font-mono text-white/40 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                       {hoveredMedia.quality || "720P"}
                     </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <span className="text-[7px] font-mono text-white/30 uppercase mr-1">Trust_Net:</span>
                     <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                           <div key={i} className={`w-2 h-1 rounded-full ${i <= (hoveredMedia.relevance_score || 0.8) * 5 ? 'bg-brand-green shadow-[0_0_5px_#00FF41]' : 'bg-white/10'}`} />
                        ))}
                     </div>
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                     <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse shadow-[0_0_8px_#00FF41]" />
                     <span className="text-[8px] font-mono text-brand-green uppercase tracking-widest">Node_Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <Shield className="w-2.5 h-2.5 text-white/20" />
                     <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">E2EE_Active</span>
                  </div>
               </div>
            </div>
            <div className="h-1 bg-white/5">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: "100%" }}
                 transition={{ duration: 1.2 }}
                 className="h-full bg-brand-green shadow-[0_0_10px_#00FF41]"
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Kernel Boot Overlay */}
      <AnimatePresence>
        {isKernelBooting && (
          <motion.div 
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-[1000] bg-black flex items-center justify-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-[url('https://api.studio/assets/grid.svg')] opacity-[0.05] pointer-events-none" />
            <div className="flex flex-col items-center gap-8 relative">
               <motion.div 
                 animate={{ 
                   scale: [1, 1.05, 1],
                   opacity: [0.8, 1, 0.8]
                 }}
                 transition={{ duration: 2, repeat: Infinity }}
                 className="w-24 h-24 bg-brand-green rounded-3xl flex items-center justify-center shadow-[0_0_50px_#00FF41]"
               >
                 <Cpu className="w-12 h-12 text-black" />
               </motion.div>
               <div className="flex flex-col items-center gap-2">
                  <h2 className="text-2xl font-black text-white tracking-[0.6em] uppercase">Nebula_V13</h2>
                  <div className="flex items-center gap-2">
                     <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                     <span className="text-[10px] font-mono text-brand-green uppercase tracking-widest">Initializing Neural Omega Scraper Kernel...</span>
                  </div>
               </div>
               <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden mt-4">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                    className="h-full bg-brand-green shadow-[0_0_15px_#00FF41]"
                  />
               </div>
               <div className="flex gap-4 mt-2">
                  <span className="text-[7px] font-mono text-white/20 uppercase">Core_Check: OK</span>
                  <span className="text-[7px] font-mono text-white/20 uppercase">Signal_Gate: OK</span>
                  <span className="text-[7px] font-mono text-white/20 uppercase">Neural_Link: OK</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Status Tray (Minimized Global Player) */}
      <AnimatePresence>
        {isVideoMinimized && currentMedia && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] bg-black/90 border border-brand-green/30 rounded-2xl px-6 py-3 shadow-2xl backdrop-blur-2xl flex items-center gap-6"
          >
             <div className="flex items-center gap-4 border-r border-white/10 pr-6">
                <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                   {currentMedia.type === 'radio' ? <Radio className="w-4 h-4 text-brand-green animate-pulse" /> : <Video className="w-4 h-4 text-brand-cyan animate-pulse" />}
                </div>
                <div className="flex flex-col">
                   <span className="text-[10px] font-black text-white truncate w-32">{currentMedia.name}</span>
                   <span className="text-[8px] font-mono text-brand-green/60 uppercase">Node_Connected</span>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={handlePlay} disabled={isPlaying} className="p-2 text-white/40 hover:text-brand-green transition-colors disabled:opacity-20">
                   <Play className="w-4 h-4 fill-current" />
                </button>
                <button onClick={handlePause} disabled={!isPlaying} className="p-2 text-white/40 hover:text-white transition-colors disabled:opacity-20">
                   <Pause className="w-4 h-4 fill-current" />
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-2" />
                <button onClick={() => setIsVideoMinimized(false)} className="p-2 text-white/40 hover:text-brand-cyan transition-colors">
                   <Maximize className="w-4 h-4" />
                </button>
                <button onClick={() => { handleStop(); setIsVideoMinimized(false); }} className="p-2 text-white/40 hover:hover:text-red-500 transition-colors">
                   <Power className="w-4 h-4" />
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Audio */}
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
    </div>
  );
}
