import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Radio, 
  Video, 
  Headphones, 
  Tv, 
  MonitorPlay, 
  Monitor, 
  Zap, 
  Image as ImageIcon, 
  FileText, 
  Gamepad2, 
  Book, 
  AlertCircle, 
  Link as LinkIcon, 
  Star, 
  ListPlus, 
  Download,
  Fingerprint,
  Play,
  Globe,
  Subtitles,
  Mic,
  Monitor as VlcIcon
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { MediaResult } from '../types';
import RenderTextWithLinks from './RenderTextWithLinks';
import ListCardSkeleton from './ListCardSkeleton';
import SignalHealthBadge from './SignalHealthBadge';
import { hapticHover } from '../utils/haptics';

interface ListCardProps {
  item: MediaResult;
  idx: number;
  isPlayingNow: boolean;
  playMedia: (item: MediaResult) => void;
  toggleFavorite: (item: MediaResult) => void;
  isFavorite: boolean;
  handleDownload: (item: MediaResult) => void;
  onHover: (item: MediaResult | null) => void;
  isSubtitleEnabled: boolean;
  setIsSubtitleEnabled: (val: boolean) => void;
  onAddToPlaylist: (item: MediaResult) => void;
  openInVlc: (url: string) => void;
}

const getWebcamCategory = (item: MediaResult): string => {
  const text = `${item.name || ''} ${item.description || ''} ${Array.isArray(item.tags) ? item.tags.join(' ') : String(item.tags || '')} ${item.url || ''}`.toLowerCase();
  
  if (text.match(/beach|forest|mountain|ocean|river|park|lake|sky|scenic|nature|garden|sunset|surf|earthcam|external|view|park|outdoor/)) return "Nature";
  if (text.match(/square|plaza|times square|street|city|skyline|downtown|brussel|tokyo|paris|london|view|broadway|capital|cityscape/)) return "City";
  if (text.match(/highway|road|intersection|bridge|traffic|underpass|railway|train|cam_highway|crossing/)) return "Traffic";
  if (text.match(/nest|zoo|animal|bird|panda|bear|aquarium|fish|wildlife|safari|eagle|cat|dog|mammal|invertebrate/)) return "Wildlife";
  if (text.match(/office|studio|lobby|mall|museum|indoor|room|cafe|restaurant|station|control room|desk/)) return "Indoor";
  
  const code = (item.name || '').charCodeAt(0) || 0;
  const categories = ["Nature", "City", "Traffic", "Wildlife", "Indoor"];
  return categories[code % categories.length];
};

const ListCard: React.FC<ListCardProps> = ({ 
  item, 
  idx, 
  isPlayingNow, 
  playMedia, 
  toggleFavorite, 
  isFavorite, 
  handleDownload,
  onHover,
  isSubtitleEnabled,
  setIsSubtitleEnabled,
  onAddToPlaylist,
  openInVlc
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const [telemetryData, setTelemetryData] = useState<{value: number}[]>(() => {
    return Array.from({length: 20}).map(() => ({ value: (item.latency || 100) + Math.random() * 40 - 20 }));
  });
  
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setTelemetryData(prev => [...prev.slice(1), { value: Math.max(0, (item.latency || 100) + Math.random() * 40 - 20) }]);
    }, 1000);
    return () => clearInterval(interval);
  }, [isVisible, item.latency]);

  const [localTags, setLocalTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('nebula_tags');
    if (saved) {
       const parsed = JSON.parse(saved);
       return parsed[item.url] || item.tags || [];
    }
    return item.tags || [];
  });
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!tagInput.trim()) return;
    const newTags = [...localTags, tagInput.trim()];
    setLocalTags(newTags);
    setTagInput("");
    const saved = localStorage.getItem('nebula_tags');
    const parsed = saved ? JSON.parse(saved) : {};
    parsed[item.url] = newTags;
    localStorage.setItem('nebula_tags', JSON.stringify(parsed));
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, {
      rootMargin: '100px 0px',
      threshold: 0.01
    });

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!isVisible) {
    return (
      <div ref={cardRef} className="w-full">
        <ListCardSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      key={item.url}
      layout
      onMouseEnter={() => {
        hapticHover();
        onHover(item);
      }}
      onMouseLeave={() => onHover(null)}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: "0 10px 30px -15px rgba(0,255,65,0.1)" }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, delay: (idx % 20) * 0.05 }}
      className={`group relative p-4 bg-[var(--md-sys-color-surface-container)] rounded-3xl border transition-all flex items-center gap-6 overflow-hidden ${isPlayingNow ? 'border-brand-green/30 bg-brand-green/5 shadow-[0_0_20px_rgba(0,255,65,0.05)]' : 'border-[var(--md-sys-color-outline-variant)] hover:bg-white/[0.08] hover:border-white/20'} ${(item.health === 'broken' || item.health === 'degraded') ? 'border-red-500/30 bg-red-500/[0.02]' : ''}`}
    >
      {(item.health === 'broken' || item.health === 'degraded') && (
        <div className="absolute inset-0 border border-red-500/20 rounded-3xl animate-pulse pointer-events-none" />
      )}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-brand-green/50 opacity-0 group-hover:opacity-100 animate-scan pointer-events-none" />
      <div className="w-12 h-12 bg-black flex items-center justify-center rounded-xl border border-[var(--md-sys-color-outline-variant)] shrink-0 group-hover:border-brand-green/40 transition-colors cursor-pointer" onClick={() => playMedia(item)}>
        {item.type === 'radio' && <Radio className="w-5 h-5 text-brand-cyan" />}
        {item.type === 'audio' && <Headphones className="w-5 h-5 text-brand-cyan" />}
        {item.type === 'tv' && <Tv className="w-5 h-5 text-brand-cyan" />}
        {item.type === 'video_stream' && <MonitorPlay className="w-5 h-5 text-brand-cyan" />}
        {item.type === 'video' && <Video className="w-5 h-5 text-brand-cyan" />}
        {item.type === 'live_cam' && <Monitor className="w-5 h-5 text-brand-green" />}
        {item.type === 'media' && <Zap className="w-5 h-5 text-yellow-500" />}
        {item.type === 'image' && <ImageIcon className="w-5 h-5 text-purple-400" />}
        {item.type === 'document' && <FileText className="w-5 h-5 text-blue-400" />}
        {item.type === 'book' && <Book className="w-5 h-5 text-orange-400" />}
        {item.type === 'rom' && <Gamepad2 className="w-5 h-5 text-orange-400" />}
        {(item.health === 'broken' || (item.relevance_score !== undefined && item.relevance_score < 0.3)) && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border border-[var(--md-sys-color-outline-variant)] z-10 animate-bounce">
            <AlertCircle className="w-2.5 h-2.5" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playMedia(item)}>
         <div className="flex items-center gap-2 mb-1 flex-wrap">
            <SignalHealthBadge health={item.health} />
            {item.type === 'live_cam' && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter text-brand-green bg-brand-green/15 border border-brand-green/35">
                {getWebcamCategory(item)}
              </span>
            )}
            <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-[var(--md-sys-color-outline-variant)]">
                <span className="text-[8px] font-black text-brand-green uppercase tracking-tighter">Rel: {(item.relevance_score! * 100).toFixed(0)}%</span>
            </div>
            {item.service && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/20">
                {item.service.split('_')[0]}
              </span>
            )}
            {item.quality && (
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter text-white/30 bg-white/5 border border-white/10">
                {item.quality}
              </span>
            )}
            {item.language && (
               <span className="flex items-center gap-1 text-[8px] text-brand-cyan/60 uppercase font-black bg-brand-cyan/5 px-1.5 py-0.5 rounded border border-brand-cyan/10">
                 <Globe className="w-3 h-3" />
                 {item.language}
               </span>
            )}
            {item.is_dubbed && <span title="Dubbed"><Mic className="w-3 h-3 text-brand-green/60" /></span>}
            {item.is_subtitled && <span title="Subtitled"><Subtitles className="w-3 h-3 text-brand-cyan/60" /></span>}
         </div>
          <h4 className="text-sm font-black text-white truncate group-hover:text-brand-green transition-colors flex items-center gap-2">
            {item.name}
          </h4>
          <RenderTextWithLinks text={item.description} className="text-[10px] text-white/40 line-clamp-1 italic mt-1" />
          
          <div className="h-8 mt-2 opacity-70 relative pointer-events-none rounded overflow-hidden border border-[var(--md-sys-color-outline-variant)] bg-black/20 max-w-sm hidden sm:block">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={telemetryData}>
                 <Line type="monotone" dataKey="value" stroke={item.latency! < 100 ? "#00FF41" : "#00f0ff"} strokeWidth={1} dot={false} isAnimationActive={false} />
               </LineChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end">
                <span className="text-[6px] font-mono text-white/30 uppercase tracking-widest pl-1 pb-1">Telemetry 60s Track</span>
             </div>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <form onSubmit={handleAddTag} className="flex gap-1 items-center" onClick={(e) => e.stopPropagation()}>
              <input 
                type="text" 
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add tag..."
                className="bg-black/50 border border-[var(--md-sys-color-outline-variant)] rounded px-2 py-0.5 text-[8px] text-white focus:outline-none focus:border-brand-green/30 w-20"
              />
              <button type="submit" className="bg-brand-green/20 text-brand-green text-[8px] px-1.5 py-0.5 rounded hover:bg-brand-green/30">+</button>
            </form>
            {localTags.slice(0, 3).map((t: string, idx: number) => (
               <span key={`${item.id}-tag-${idx}`} className="text-[7px] px-1.5 py-0.5 bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded text-white/50 uppercase">{t}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 overflow-hidden">
            <a 
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-brand-cyan/70 truncate flex-1 flex items-center gap-2 bg-black/40 px-3 py-2 rounded-xl border border-[var(--md-sys-color-outline-variant)] font-mono hover:text-brand-cyan hover:bg-brand-cyan/5 transition-all"
            >
               <LinkIcon className="w-4 h-4 text-brand-cyan" />
               <span className="truncate">{item.url}</span>
            </a>
         </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={(e) => { e.stopPropagation(); onAddToPlaylist(item); }}
          className="m3-button-tonal !w-12 !h-12 !p-0 !min-w-0"
          title="Add to Playlist"
        >
          <ListPlus className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => { 
             e.stopPropagation(); 
             openInVlc(item.url);
          }}
          title="Bypass & Execute in VLC Engine"
          className="m3-button-tonal !w-12 !h-12 !p-0 !min-w-0 bg-[#FF8800]/20 hover:!bg-[#FF8800]/40 text-[#FF8800] border border-[#FF8800]/50 shadow-[0_0_10px_rgba(255,136,0,0.3)] transition-all transform hover:scale-110"
        >
          <VlcIcon className="w-5 h-5" />
        </button>
        <button 
          onClick={() => toggleFavorite(item)}
          className={`m3-button-tonal !w-12 !h-12 !p-0 !min-w-0 ${isFavorite ? '!text-yellow-500 !bg-yellow-500/20' : ''}`}
        >
          <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        <button 
          onClick={() => handleDownload(item)}
          className="m3-button-tonal !w-12 !h-12 !p-0 !min-w-0"
        >
          <Download className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setIsSubtitleEnabled(!isSubtitleEnabled)}
          className={`m3-button-tonal !w-12 !h-12 !p-0 !min-w-0 ${isSubtitleEnabled ? '!text-primary !bg-primary/20' : ''}`}
          title="Toggle Subtitles"
        >
          <Fingerprint className="w-5 h-5" />
        </button>
        <div className="m3-button-filled !w-12 !h-12 !p-0 !min-w-0 cursor-pointer" onClick={() => playMedia(item)}>
          <Play className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(ListCard);
