import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactPlayer from 'react-player';
import { ChevronDown, ExternalLink, Headphones, Radio, Play, Pause, SkipBack, SkipForward, RefreshCw, Fingerprint, Waves, Maximize, Monitor as VlcIcon } from 'lucide-react';
import { MediaResult } from '../types';
import AudioVisualizer from './AudioVisualizer';

interface MediaMatrixOverlayProps {
  currentMedia: MediaResult | null;
  isVideoFloating: boolean;
  isVideoMinimized: boolean;
  setIsVideoFloating: (val: boolean) => void;
  setIsVideoMinimized: (val: boolean) => void;
  isBuffering: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackSpeed: number;
  isSubtitleEnabled: boolean;
  subtitles: string;
  isGeneratingSubtitles: boolean;
  streamInfo: any;
  systemStats: any;
  isReconnecting: boolean;
  reconnectCount: number;
  MAX_RECONNECT_ATTEMPTS: number;
  handleTogglePlayback: () => void;
  handleSkipBackward: () => void;
  handleSkip: () => void;
  handleToggleSubtitles: () => void;
  handleFullscreen: () => void;
  setStreamQuality: (q: string) => void;
  streamQuality: string;
  setVolume: (v: number) => void;
  setPlaybackSpeed: (s: number) => void;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setIsBuffering: (b: boolean) => void;
  setIsPlaying: (p: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  mediaContainerRef: React.RefObject<HTMLDivElement | null>;
  getProxyUrl: (url: string) => string;
  getViewerUrl: (url: string) => string;
  onShowInfo: () => void;
  openInVlc: (url: string, useAdvancedArgs?: boolean) => void;
}

const MediaMatrixOverlay: React.FC<MediaMatrixOverlayProps> = ({
  currentMedia,
  isVideoFloating,
  isVideoMinimized,
  setIsVideoFloating,
  setIsVideoMinimized: _setIsVideoMinimized,
  isBuffering,
  isPlaying,
  currentTime,
  duration,
  volume,
  playbackSpeed: _playbackSpeed,
  isSubtitleEnabled,
  subtitles,
  isGeneratingSubtitles,
  streamInfo: _streamInfo,
  systemStats,
  isReconnecting,
  reconnectCount,
  MAX_RECONNECT_ATTEMPTS,
  handleTogglePlayback,
  handleSkipBackward,
  handleSkip,
  handleToggleSubtitles,
  handleFullscreen,
  setStreamQuality,
  streamQuality,
  setVolume,
  setPlaybackSpeed: _setPlaybackSpeed,
  setCurrentTime,
  setDuration,
  setIsBuffering,
  setIsPlaying,
  videoRef,
  audioRef: _audioRef,
  mediaContainerRef,
  getProxyUrl,
  getViewerUrl,
  onShowInfo,
  openInVlc,
}) => {
  const [vlcPotentMode, setVlcPotentMode] = React.useState(true);

  if (!currentMedia) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 m3-card flex flex-col">
      <div className="flex justify-between items-center mb-6">
         <h3 className="text-xs font-mono text-primary tracking-widest uppercase opacity-80 flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
           Feed Matrix
         </h3>
         <button 
           onClick={onShowInfo} 
           className="text-[10px] font-black uppercase text-on-surface-variant hover:text-on-surface transition-all bg-surface-container-high border border-outline-variant px-3 py-1.5 rounded-full"
         >
           Signal Intel
         </button>
      </div>
      
      <div className="flex-1 grid grid-cols-1 gap-4 h-full relative">
        {isVideoFloating && !isVideoMinimized && (
           <div className="absolute inset-0 z-10 bg-surface-container-highest/90 flex flex-col items-center justify-center opacity-80 gap-3 rounded-3xl border border-dashed border-white/20">
               <span className="text-[10px] font-mono text-on-surface/50 uppercase tracking-widest">Feed Detached</span>
               <button onClick={() => setIsVideoFloating(false)} className="px-4 py-1.5 bg-secondary text-on-primary hover:bg-secondary-400 rounded-lg text-[10px] font-black uppercase transition-colors">Dock Feed</button>
           </div>
        )}

        <motion.div 
            drag={isVideoFloating}
            dragMomentum={false}
            initial={false}
            animate={
              isVideoMinimized ? { scale: 0, opacity: 0, y: 100 } :
              isVideoFloating ? { scale: 1, opacity: 1, position: 'fixed', zIndex: 110, y: 0 } :
              { scale: 1, opacity: 1, position: 'relative', width: '100%', height: '100%', left: 0, bottom: 'auto', right: 'auto', zIndex: 1, y: 0 }
            }
            className={`${
              isVideoFloating 
                ? "fixed bottom-[140px] left-4 right-4 sm:left-auto sm:right-5 sm:w-[320px] md:w-[480px] shadow-[0_30px_100px_rgba(0,0,0,0.8)] border border-brand-green/30 cursor-move backdrop-blur-3xl rounded-[2rem] overflow-hidden" 
                : "flex-1 rounded-[2rem] overflow-hidden border border-[var(--md-sys-color-outline-variant)] shadow-2xl"
            } grid grid-cols-1 bg-surface-container-highest relative items-center justify-center overflow-hidden group/video aspect-video`}
        >
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover/video:opacity-100 transition-opacity z-[100]">
              <button 
                onClick={() => setIsVideoFloating(!isVideoFloating)} 
                className="p-2.5 bg-surface-container-highest/90 hover:bg-primary/20 rounded-xl border border-outline-variant text-on-surface/50 hover:text-primary backdrop-blur shadow-xl transition-all"
                title={isVideoFloating ? "Dock Video" : "Detach Video"}
              >
                {isVideoFloating ? <ChevronDown className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
              </button>
            </div>
            
            {['radio', 'audio', 'audio_stream'].includes(currentMedia.type) ? (
               <div className="w-48 h-48 rounded-full border border-brand-green/10 flex flex-col items-center justify-center relative">
                  <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse transition-all group-hover/video:scale-110" />
                  {currentMedia.type === 'audio' ? <Headphones className="w-16 h-16 text-primary animate-pulse" /> : <Radio className="w-16 h-16 text-primary animate-pulse" />}
                  <div className="absolute inset-[-20px] border border-brand-green/5 rounded-full animate-[ping_4s_linear_infinite]" />
                  <div className="absolute inset-[-40px] border border-brand-cyan/5 rounded-full animate-[ping_6s_linear_infinite]" />
                  <div className="absolute -bottom-16 w-64 h-16 left-1/2 -translate-x-1/2 overflow-hidden rounded-xl">
                    <AudioVisualizer 
                      mediaElement={_audioRef.current} 
                      isActive={isPlaying} 
                    />
                  </div>
               </div>
            ) : currentMedia.type === 'image' ? (
              <img crossOrigin="anonymous" src={getProxyUrl(currentMedia.url)} className="w-full h-full object-contain bg-surface-container-highest" alt={currentMedia.name} />
            ) : (currentMedia.type === 'document' || currentMedia.type === 'rom' || currentMedia.type === 'book') ? (
              <iframe src={getViewerUrl(currentMedia.url)} className="w-full h-full bg-white relative z-[1]" title={currentMedia.name} />
            ) : (currentMedia.url?.includes('youtube.com') || currentMedia.url?.includes('youtu.be')) ? (
              <div className="w-full h-full relative group/yt bg-surface-container-highest">
                <ReactPlayer 
                  url={currentMedia.url} 
                  width="100%" 
                  height="100%" 
                  playing={isPlaying} 
                  controls={true}
                  onProgress={(s: any) => setCurrentTime(s.playedSeconds)}
                  onDuration={setDuration}
                  onBuffer={() => setIsBuffering(true)}
                  onBufferEnd={() => setIsBuffering(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  config={{
                    youtube: {
                      // @ts-ignore
                      playerVars: {
                        modestbranding: 1,
                        fs: 1,
                        playsinline: 1,
                        controls: 1
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div ref={mediaContainerRef} id="video-container" className="relative w-full h-full group overflow-hidden flex items-center justify-center bg-surface-container-highest">
                <video 
                  ref={videoRef} 
                  onEnded={() => {}}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onWaiting={() => setIsBuffering(true)}
                  onPlaying={() => setIsBuffering(false)}
                  onCanPlay={() => setIsBuffering(false)}
                  className={`max-h-full max-w-full transition-opacity duration-700 ${isReconnecting ? 'opacity-20' : 'opacity-100'}`} 
                  controls={false} 
                  muted={false} 
                />
                
                <AnimatePresence>
                  {isBuffering && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex items-center justify-center bg-surface-container-highest/60 z-30"
                    >
                      <div className="w-12 h-12 border-2 border-brand-green border-t-transparent rounded-full animate-spin shadow-[0_0_15px_#00FF41]"></div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/95 via-black/40 to-transparent flex flex-col gap-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 backdrop-blur-[4px]">
                  <div className="flex items-center justify-center gap-4">
                    <button onClick={handleSkipBackward} className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-on-surface/10 transition-colors"><SkipBack className="w-6 h-6" /></button>
                    <button onClick={handleTogglePlayback} className="w-14 h-14 flex items-center justify-center bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-all transform hover:scale-110 active:scale-95 shadow-lg">
                      {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                    </button>
                    <button onClick={handleSkip} className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-on-surface/10 transition-colors"><SkipForward className="w-6 h-6" /></button>
                    
                    <div className="flex-1 flex flex-col gap-2 mx-4 relative">
                      <div className="absolute -top-12 left-0 right-0 h-10 pointer-events-none overflow-hidden rounded-lg">
                        <AudioVisualizer 
                          mediaElement={videoRef.current} 
                          isActive={isPlaying && !isBuffering} 
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
                         <span>{formatTime(currentTime)}</span>
                         <span>{currentMedia.type === 'live_cam' ? 'Live Stream' : formatTime(duration)}</span>
                      </div>
                      <div className="relative h-1.5 bg-surface-container-high rounded-full overflow-hidden group/progress cursor-pointer">
                         <div 
                           className="absolute top-0 left-0 h-full bg-primary transition-all"
                           style={{ width: `${duration > 0 ? (currentTime/duration)*100 : 0}%` }}
                         />
                      </div>
                    </div>

                     <div className="flex items-center gap-3">
                       <button 
                          onClick={() => setVlcPotentMode(!vlcPotentMode)}
                          className={`px-3 py-2 text-[10px] font-bold uppercase rounded-xl border transition-all ${vlcPotentMode ? 'text-[#FF8800] border-[#FF8800]/50 bg-[#FF8800]/10' : 'text-on-surface-variant border-outline-variant'}`}
                          title="Toggle Potent Networking Params"
                       >
                         {vlcPotentMode ? 'POTENT: ON' : 'POTENT: OFF'}
                       </button>
                       <button 
                          onClick={() => openInVlc(currentMedia.url, vlcPotentMode)}
                          className="px-4 py-2 text-on-surface font-bold bg-gradient-to-r from-[#FF8800]/20 to-transparent hover:from-[#FF8800]/40 rounded-xl border border-[#FF8800]/40 hover:border-[#FF8800] hover:shadow-[0_0_15px_rgba(255,136,0,0.5)] transition-all flex items-center gap-2 relative overflow-hidden group shadow-[0_0_5px_rgba(255,136,0,0.2)]"
                          title="Bypass DOM & Open Feed in VLC Core"
                       >
                          <div className="absolute inset-0 bg-[#FF8800]/10 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
                          <VlcIcon className="w-5 h-5 relative z-10 animate-bounce group-hover:animate-none" />
                          <span className="text-xs font-black font-mono tracking-widest relative z-10 hidden sm:inline-block">VLC ENGINE</span>
                       </button>
                       <button onClick={handleToggleSubtitles} className={`p-2 rounded-xl transition-all ${isSubtitleEnabled ? 'text-primary bg-primary/10 border border-brand-green/30 shadow-[0_0_10px_rgba(0,255,136,0.2)]' : 'text-on-surface-variant hover:text-on-surface border border-transparent'}`}>
                          <Fingerprint className="w-5 h-5" />
                       </button>
                       <button onClick={handleFullscreen} className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
                          <Maximize className="w-5 h-5" />
                       </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant pt-4 mt-2">
                     <div className="flex gap-1.5">
                       {['balanced', 'bandwidth', 'resolution'].map(q => (
                         <button 
                           key={q} 
                           onClick={() => setStreamQuality(q)} 
                           className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${streamQuality === q ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'}`}
                         >
                           {q}
                         </button>
                       ))}
                     </div>
                     <div className="flex items-center gap-3 bg-surface-container-high/60 backdrop-blur px-4 py-2 rounded-full border border-outline-variant">
                        <Waves className="w-4 h-4 text-primary opacity-60" />
                        <input 
                           type="range" min="0" max="1" step="0.1" value={volume} 
                           onChange={(e) => setVolume(parseFloat(e.target.value))}
                           className="w-24 h-1 bg-on-surface/10 rounded-full appearance-none accent-primary cursor-pointer"
                        />
                     </div>
                  </div>
                </div>
              </div>
            )}
            
            {isSubtitleEnabled && (subtitles || isGeneratingSubtitles) && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-surface-container-highest/90 p-4 text-center text-sm font-mono text-on-surface rounded-2xl backdrop-blur-md border border-brand-green/20 z-[60] shadow-2xl">
                    {isGeneratingSubtitles ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex gap-1">
                           {[1,2,3].map(i => <div key={i} className="w-1 h-3 bg-primary rounded-full animate-bounce" style={{animationDelay: `${i*100}ms`}} />)}
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-primary">Decrypting Audio Latency...</span>
                      </div>
                    ) : subtitles}
                </div>
            )}
            
            <div className="absolute top-6 left-6 flex flex-col gap-2 z-50">
               <div className="flex items-center gap-3 bg-surface-container-highest/60 backdrop-blur border border-outline-variant px-3 py-2 rounded-2xl">
                  <div className={`w-2 h-2 rounded-full ${isReconnecting ? 'bg-red-500 animate-pulse' : 'bg-primary animate-pulse'}`} />
                  <span className="text-[10px] font-black text-on-surface uppercase tracking-widest truncate max-w-[200px]">
                    {currentMedia.name}
                  </span>
               </div>
               {isReconnecting && (
                 <div className="flex items-center gap-2 bg-red-500/20 text-red-500 text-[10px] font-black px-3 py-1.5 rounded-xl border border-red-500/30 backdrop-blur animate-pulse uppercase tracking-widest">
                   <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                   Attempting Sync {reconnectCount}/{MAX_RECONNECT_ATTEMPTS}
                 </div>
               )}
            </div>

            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50 opacity-0 group-hover:opacity-100 transition-all">
                <div className="flex items-center gap-3 bg-surface-container-highest/90 backdrop-blur border border-outline-variant px-4 py-3 rounded-[1.5rem]">
                   <div className="flex flex-col">
                      <span className="text-[7px] font-black uppercase text-on-surface/30">Jitter</span>
                      <span className="text-[10px] font-mono text-primary">{systemStats.latency.toFixed(0)}ms</span>
                   </div>
                   <div className="h-6 w-px bg-surface-container-high mx-1" />
                   <div className="flex flex-col">
                      <span className="text-[7px] font-black uppercase text-on-surface/30">Loss</span>
                      <span className="text-[10px] font-mono text-red-500">{(systemStats.packetLoss*100).toFixed(2)}%</span>
                   </div>
                </div>
            </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MediaMatrixOverlay;
