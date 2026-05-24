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
  ExternalLink,
  Globe,
  Subtitles,
  Mic,
  Monitor as VlcIcon
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { MediaResult } from '../types';
import RenderTextWithLinks from './RenderTextWithLinks';
import MatrixCardSkeleton from './MatrixCardSkeleton';
import { hapticHover } from '../utils/haptics';

interface MatrixCardProps {
  item: MediaResult;
  idx: number;
  isPlayingNow: boolean;
  playMedia: (item: MediaResult) => void;
  toggleFavorite: (item: MediaResult) => void;
  isFavorite: boolean;
  onHover: (item: MediaResult | null) => void;
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

const MatrixCard: React.FC<MatrixCardProps> = ({ 
  item, 
  idx,
  isPlayingNow, 
  playMedia, 
  toggleFavorite, 
  isFavorite, 
  onHover,
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
        <MatrixCardSkeleton />
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      onMouseEnter={() => {
        hapticHover();
        onHover(item);
      }}
      onMouseLeave={() => onHover(null)}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 10px 30px -15px rgba(0,255,65,0.2)" }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay: (idx % 20) * 0.05 }}
      layout
      onClick={() => playMedia(item)}
      className={`m3-card group cursor-pointer relative transition-all border-outline-variant hover:border-primary/30 ${isPlayingNow ? 'border-primary/50 shadow-[0_0_15px_rgba(var(--md-sys-color-primary-rgb),0.15)] bg-primary-container/20' : 'bg-surface-container hover:bg-surface-container-high'} ${(item.health === 'broken' || item.health === 'degraded') ? 'border-red-500/50 shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]' : ''}`}
    >
        {(item.health === 'broken' || item.health === 'degraded') && (
           <div className="absolute inset-0 border border-red-500/40 rounded-[24px] animate-pulse pointer-events-none" />
        )}
        <div className="flex justify-between items-start mb-4">
          <motion.div 
            animate={isPlayingNow ? {
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7]
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`w-10 h-10 bg-black rounded-lg flex items-center justify-center border transition-all ${isPlayingNow ? 'border-primary shadow-[0_0_10px_rgba(var(--md-sys-color-primary-rgb),0.3)]' : 'border-outline-variant group-hover:border-primary/30'}`}
          >
            {item.type === 'radio' && <Radio className={`w-4 h-4 ${isPlayingNow ? 'text-primary' : 'text-brand-cyan'}`} />}
            {item.type === 'audio' && <Headphones className={`w-4 h-4 ${isPlayingNow ? 'text-primary' : 'text-brand-cyan'}`} />}
            {item.type === 'tv' && <Tv className={`w-4 h-4 ${isPlayingNow ? 'text-primary' : 'text-brand-cyan'}`} />}
            {item.type === 'video_stream' && <MonitorPlay className={`w-4 h-4 ${isPlayingNow ? 'text-primary' : 'text-brand-cyan'}`} />}
            {item.type === 'video' && <Video className={`w-4 h-4 ${isPlayingNow ? 'text-primary' : 'text-brand-cyan'}`} />}
            {item.type === 'live_cam' && <Monitor className="w-4 h-4 text-primary" />}
            {item.type === 'media' && <Zap className="w-4 h-4 text-yellow-500" />}
            {item.type === 'image' && <ImageIcon className="w-4 h-4 text-purple-400" />}
            {item.type === 'document' && <FileText className="w-4 h-4 text-blue-400" />}
            {item.type === 'rom' && <Gamepad2 className="w-4 h-4 text-orange-400" />}
            {item.type === 'book' && <Book className="w-4 h-4 text-amber-500" />}
          </motion.div>
          {(item.health === 'broken' || (item.relevance_score !== undefined && item.relevance_score < 0.3)) && (
             <div className="absolute top-2 left-12 flex items-center justify-center bg-red-500/20 text-red-500 p-0.5 rounded-full border border-red-500/30 animate-[bounce_1s_infinite]">
                <AlertCircle className="w-3 h-3" />
             </div>
          )}
          <div className="flex flex-col items-end gap-1">
             <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1,2,3,4].map(i => (
                    <div key={`${item.id}-bar-${i}`} className={`w-1 h-3 rounded-full ${i <= (item.relevance_score! * 4) ? 'bg-primary shadow-[0_0_5px_rgba(var(--md-sys-color-primary-rgb),0.5)]' : 'bg-outline-variant/30'}`} />
                  ))}
                </div>
                <span className="text-[10px] font-black text-primary">{(item.relevance_score! * 100).toFixed(0)}%</span>
             </div>
              {item.service && (
                 <span className="text-[7px] font-black font-mono px-1 rounded-sm bg-brand-cyan/20 text-brand-cyan uppercase tracking-tighter whitespace-nowrap">
                    {item.service.split('_')[0]}
                 </span>
              )}
          </div>
        </div>
        <h4 className="text-xs font-black text-on-surface leading-tight group-hover:text-primary transition-all line-clamp-1 mb-1 items-center gap-2 flex">
           {item.name}
           {item.quality && <span className="text-[7px] px-1 bg-surface-container-highest rounded-sm font-mono text-on-surface-variant">{item.quality}</span>}
        </h4>
        <div className="flex items-center gap-2 mb-2">
           {item.language && (
             <span className="flex items-center gap-1 text-[8px] text-brand-cyan/60 uppercase font-bold">
               <Globe className="w-2.5 h-2.5" />
               {item.language}
             </span>
           )}
           {item.is_dubbed && <span title="Dubbed"><Mic className="w-2.5 h-2.5 text-primary/60" /></span>}
           {item.is_subtitled && <span title="Subtitled"><Subtitles className="w-2.5 h-2.5 text-brand-cyan/60" /></span>}
        </div>
        <div className="flex items-center gap-2 mb-3 overflow-hidden">
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[9px] text-on-surface-variant truncate flex-1 flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-lg border border-outline-variant shadow-inner font-mono hover:text-primary hover:bg-primary/5 transition-all"
          >
             <LinkIcon className="w-3 h-3 text-on-surface-variant" />
             <span className="truncate">{item.url}</span>
          </a>
        </div>
        <RenderTextWithLinks text={item.description} className="text-[9px] text-on-surface-variant line-clamp-1 mb-2 italic" />
        
        <div className="h-10 mb-4 opacity-70 relative pointer-events-none rounded overflow-hidden border border-outline-variant bg-black/10">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={telemetryData}>
                <Line type="monotone" dataKey="value" stroke="var(--md-sys-color-primary)" strokeWidth={1} dot={false} isAnimationActive={false} />
             </LineChart>
           </ResponsiveContainer>
           <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end">
              <span className="text-[6px] font-mono text-on-surface-variant uppercase tracking-widest pl-1 pb-1">Telemetry 60s Track</span>
           </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <form onSubmit={handleAddTag} className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <input 
              type="text" 
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag..."
              className="bg-surface-container border border-outline-variant rounded px-2 py-1 text-[8px] text-on-surface focus:outline-none focus:border-primary/30 flex-1"
            />
            <button type="submit" className="bg-primary/20 text-primary text-[8px] px-2 rounded hover:bg-primary/30">+</button>
          </form>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1 flex-1 h-[20px] overflow-hidden">
               {item.type === 'live_cam' && (
                 <span className="text-[7px] px-1 h-[14px] flex items-center bg-primary/15 text-primary border border-primary/35 rounded uppercase font-black">{getWebcamCategory(item)}</span>
               )}
               {localTags.slice(0, 3).map((t: string, idx: number) => (
                 <span key={`${item.id}-tag-${idx}`} className="text-[7px] px-1 h-[14px] flex items-center bg-surface-container-high border border-outline-variant rounded text-on-surface-variant uppercase">{t}</span>
               ))}
            </div>
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={(e) => { e.stopPropagation(); toggleFavorite(item); }}
                className={`m3-button-tonal !w-10 !h-10 !p-0 !min-w-0 ${isFavorite ? '!text-yellow-500 !bg-yellow-500/20' : ''}`}
              >
                <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onAddToPlaylist(item); }}
                className="m3-button-tonal !w-10 !h-10 !p-0 !min-w-0"
                title="Add to Playlist"
              >
                <ListPlus className="w-4 h-4" />
              </button>
              <button 
                onClick={(e) => { 
                   e.stopPropagation(); 
                   openInVlc(item.url);
                }}
                title="Bypass & Execute in VLC Engine"
                className="m3-button-tonal !w-10 !h-10 !p-0 !min-w-0 bg-[#FF8800]/20 hover:!bg-[#FF8800]/40 text-[#FF8800] border border-[#FF8800]/50 shadow-[0_0_10px_rgba(255,136,0,0.3)] transition-all transform hover:scale-110"
              >
                <VlcIcon className="w-4 h-4" />
              </button>
              <a 
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="m3-button-tonal !w-10 !h-10 !p-0 !min-w-0 flex items-center justify-center hover:!bg-brand-cyan/10 hover:!text-brand-cyan"
                title="Open Externally"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
    </motion.div>
  );
};

export default React.memo(MatrixCard);
