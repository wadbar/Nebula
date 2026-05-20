import { motion, AnimatePresence } from 'motion/react';
import { Download, CheckCircle, AlertCircle, X, Pause, Play, RefreshCw } from 'lucide-react';
import { DownloadTask } from '../types';

interface DownloadManagerProps {
  show: boolean;
  onClose: () => void;
  downloads: DownloadTask[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onClearCompleted: () => void;
  onClearFailed: () => void;
}

export function DownloadManager({
  show,
  onClose,
  downloads,
  onPause,
  onResume,
  onCancel,
  onClearCompleted,
  onClearFailed
}: DownloadManagerProps) {
  const activeCount = downloads.filter(d => d.status === 'downloading').length;
  const queuedCount = downloads.filter(d => d.status === 'queued').length;

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="fixed top-12 right-6 w-96 max-h-[80vh] flex flex-col z-[150] shadow-2xl bento-card p-0 border border-brand-green/20 overflow-hidden bg-black/95 backdrop-blur-xl"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-md">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-brand-green animate-bounce" />
                <h3 className="text-xs font-black text-white uppercase tracking-widest">Download Matrix</h3>
              </div>
              {(activeCount > 0 || queuedCount > 0) && (
                <span className="text-[9px] font-mono text-white/40 uppercase mt-0.5">
                  Queue Active • {activeCount} processing, {queuedCount} waiting
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button title="Clear Completed Tasks" onClick={onClearCompleted} className="text-white/40 hover:text-brand-green transition-colors p-1 hover:bg-white/5 rounded">
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
              <button title="Clear Failed/Canceled" onClick={onClearFailed} className="text-white/40 hover:text-red-400 transition-colors p-1 hover:bg-white/5 rounded">
                <AlertCircle className="w-3.5 h-3.5" />
              </button>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 hover:bg-white/5 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 bg-black/95 custom-scrollbar space-y-2 max-h-[60vh]">
            <AnimatePresence initial={false}>
              {downloads.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8 text-center text-xs text-white/40 font-mono"
                >
                  No active downloads
                </motion.div>
              ) : (
                downloads.slice().reverse().map(task => {
                  let statusBadgeColor = 'bg-white/5 text-white/40 border-white/10';
                  let statusLabel: string = task.status;

                  switch(task.status) {
                    case 'queued':
                      statusBadgeColor = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                      statusLabel = 'queued';
                      break;
                    case 'downloading':
                      statusBadgeColor = 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20';
                      statusLabel = 'syncing';
                      break;
                    case 'paused':
                      statusBadgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                      statusLabel = 'paused';
                      break;
                    case 'completed':
                      statusBadgeColor = 'bg-brand-green/10 text-brand-green border-brand-green/20';
                      statusLabel = 'success';
                      break;
                    case 'error':
                      statusBadgeColor = 'bg-red-500/10 text-red-500 border-red-500/20';
                      statusLabel = 'failed';
                      break;
                    case 'canceled':
                      statusBadgeColor = 'bg-white/10 text-white/50 border-white/20';
                      statusLabel = 'canceled';
                      break;
                  }

                  return (
                    <motion.div 
                      key={task.id} 
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="p-3 bg-white/5 border border-white/10 rounded-xl relative group overflow-hidden"
                    >
                      {task.status === 'downloading' && (
                        <div className="absolute top-0 left-0 bottom-0 bg-brand-cyan/5 transition-all duration-300" style={{ width: `${task.progress}%` }} />
                      )}
                      <div className="relative z-10">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className="text-xs text-white font-bold truncate flex-1">{task.media.name}</span>
                          <span className={`text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded border ${statusBadgeColor}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="flex justify-between items-end mt-2">
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0 pr-2">
                            {/* Loaded metrics */}
                            <div className="text-[10px] font-mono text-white/50 uppercase flex items-center gap-1.5">
                              {task.status === 'downloading' || task.status === 'paused' || task.status === 'completed' ? (
                                <>
                                  <span>{(task.loaded / 1024 / 1024).toFixed(1)} MB</span>
                                  {task.total > 0 && (
                                    <>
                                      <span className="text-white/20">/</span>
                                      <span>{(task.total / 1024 / 1024).toFixed(1)} MB</span>
                                    </>
                                  )}
                                </>
                              ) : (
                                <span className="text-white/30 uppercase">{task.status}</span>
                              )}
                            </div>

                            {/* Speed and Time indicators */}
                            {task.status === 'downloading' && (
                              <div className="flex flex-col gap-1 mt-1">
                                <div className="text-[10px] font-mono flex items-center gap-1.5 flex-wrap">
                                  {/* Speed visual badge with speed tier colors */}
                                  {(() => {
                                    const speedInMb = task.downloadSpeed ? (task.downloadSpeed / 1024 / 1024) : 0;
                                    let speedColor = "text-white/40 bg-white/5 border-white/10";
                                    let speedLabel = "Slow";
                                    if (speedInMb >= 10) {
                                      speedColor = "text-brand-green bg-brand-green/15 border-brand-green/30 animate-pulse";
                                      speedLabel = "Hyper";
                                    } else if (speedInMb >= 2) {
                                      speedColor = "text-brand-cyan bg-brand-cyan/15 border-brand-cyan/30";
                                      speedLabel = "Fast";
                                    } else if (speedInMb > 0) {
                                      speedColor = "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
                                      speedLabel = "Normal";
                                    }

                                    return (
                                      <span className={`text-[8px] font-black uppercase tracking-tighter px-1 py-0.5 rounded border flex items-center gap-1 ${speedColor}`}>
                                        <span className="w-1 h-1 rounded-full bg-current" />
                                        {speedLabel}
                                      </span>
                                    );
                                  })()}

                                  {/* Speed reading */}
                                  <span className="text-brand-cyan font-black">
                                    {task.downloadSpeed ? `${(task.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s` : 'Calculating...'}
                                  </span>

                                  {/* ETA formatting helper */}
                                  {task.timeRemaining !== undefined && task.timeRemaining !== null && !isNaN(task.timeRemaining) && task.timeRemaining !== Infinity ? (
                                    <>
                                      <span className="text-white/20">•</span>
                                      <span className="text-white/60 font-medium">
                                        {(() => {
                                          const s = task.timeRemaining;
                                          if (s >= 3600) {
                                            const h = Math.floor(s / 3600);
                                            const m = Math.floor((s % 3600) / 60);
                                            return `${h}h ${m}m remaining`;
                                          }
                                          if (s >= 60) {
                                            const m = Math.floor(s / 60);
                                            const sec = Math.ceil(s % 60);
                                            return `${m}m ${sec}s remaining`;
                                          }
                                          return `${Math.ceil(s)}s remaining`;
                                        })()}
                                      </span>
                                    </>
                                  ) : task.status === 'downloading' ? (
                                    <>
                                      <span className="text-white/20">•</span>
                                      <span className="text-white/30 italic">Calculating ETA...</span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Control actions */}
                          <div className="flex gap-1">
                            {task.status === 'downloading' && (
                              <button onClick={() => onPause(task.id)} className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Pause Download">
                                <Pause className="w-3 h-3" />
                              </button>
                            )}
                            {task.status === 'paused' && (
                              <button onClick={() => onResume(task.id)} className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Resume Download">
                                <Play className="w-3 h-3" />
                              </button>
                            )}
                            {(task.status === 'queued' || task.status === 'downloading' || task.status === 'paused') && (
                              <button onClick={() => onCancel(task.id)} className="p-1.5 rounded-lg bg-black/40 hover:bg-red-500/20 text-white/60 hover:text-red-500 transition-colors" title="Cancel Download">
                                <X className="w-3 h-3" />
                              </button>
                            )}
                            {(task.status === 'error' || task.status === 'canceled') && (
                              <button onClick={() => onResume(task.id)} className="p-1.5 rounded-lg bg-black/40 hover:bg-brand-green/25 text-white/60 hover:text-brand-green transition-colors" title="Retry/Re-add to queue">
                                <RefreshCw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {task.error && (
                          <div className="mt-2 text-[9px] text-red-400 font-mono bg-red-500/5 p-1 px-2 border border-red-500/10 rounded-lg flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{task.error}</span>
                          </div>
                        )}
                        
                        <div className="h-1 mt-2 w-full bg-black/40 rounded-full overflow-hidden flex relative">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              task.status === 'error' 
                                ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' 
                                : task.status === 'canceled'
                                ? 'bg-white/20'
                                : task.status === 'completed' 
                                ? 'bg-brand-green shadow-[0_0_5px_#22c55e]' 
                                : task.status === 'paused'
                                ? 'bg-amber-500 shadow-[0_0_5px_#f59e0b]'
                                : 'bg-brand-cyan shadow-[0_0_8px_#00E5FF]'
                            }`} 
                            style={{ width: `${task.progress}%` }} 
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
