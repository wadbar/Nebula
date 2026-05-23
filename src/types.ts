
export type MediaResultType = 'radio' | 'audio' | 'video' | 'video_stream' | 'tv' | 'live_cam' | 'media' | 'image' | 'document' | 'rom' | 'book' | 'software' | 'audio_stream';

export interface MediaResult {
  id: string;
  name: string;
  url: string;
  type: MediaResultType;
  category: string;
  description: string;
  service: string;
  relevance_score?: number;
  quality?: string;
  year?: string;
  studio?: string;
  tags?: string[];
  latency?: number;
  health?: 'optimal' | 'stable' | 'broken' | 'degraded' | 'unknown';
  metadata?: any;
  lat?: number;
  lng?: number;
  language?: string;
  audio_languages?: string[];
  subtitle_languages?: string[];
  is_dubbed?: boolean;
  is_subtitled?: boolean;
  bitrate?: string;
  codec?: string;
}

export interface NodeLocation {
  lat: number;
  lng: number;
  id: string;
  status: 'active' | 'latency';
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
  message: string;
  type: 'info' | 'warn' | 'success' | 'security' | 'error' | 'crit';
  timestamp: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: MediaResult[];
  createdAt?: number;
}
