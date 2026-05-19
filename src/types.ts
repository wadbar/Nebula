
export interface NodeLocation {
  lat: number;
  lng: number;
  id: string;
  status: 'active' | 'latency';
}

export interface MediaResult {
  name: string;
  url: string;
  type: "radio" | "audio" | "video" | "video_stream" | "tv" | "live_cam" | "media" | "image" | "document" | "rom" | "book" | "audio_stream";
  service?: string;
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

export interface DownloadTask {
  id: string;
  media: MediaResult;
  progress: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'error' | 'canceled';
  loaded: number;
  total: number;
  error?: string;
  timestamp: number;
  downloadSpeed?: number;
  timeRemaining?: number;
}

export interface ValidationResult {
  valid: boolean;
  integrity_score: number;
  consensus_nodes: number;
  nodes: NodeLocation[];
  signature: string;
  block_timestamp: string;
}

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'warn' | 'success' | 'security';
  timestamp: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: MediaResult[];
}
