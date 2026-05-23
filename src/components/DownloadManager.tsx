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
          className="fixed top-12 right-6 w-96 max-h-[80vh] flex flex-col z-[150] shadow-2xl m3-card !p-0 border-outline-variant bg-surface-container-highest/95 backdrop-blur-xl"
        >
          <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-surface-container/80 backdrop-blur-md">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-primary animate-bounce" />
                <h3 className="text-xs font-black text-on-surface uppercase tracking-widest">Download Matrix</h3>
              </div>
              {(activeCount > 0 || queuedCount > 0) && (
                <span className="text-[9px] font-mono text-on-surface-variant uppercase mt-0.5">
                  Queue Active • {activeCount} processing, {queuedCount} waiting
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button title="Clear Completed Tasks" onClick={onClearCompleted} className="text-on-surface-variant hover:text-primary transition-colors p-2 hover:bg-on-surface/5 rounded-full">
                <CheckCircle className="w-4 h-4" />
              </button>
              <button title="Clear Failed/Canceled" onClick={onClearFailed} className="text-on-surface-variant hover:text-error transition-colors p-2 hover:bg-on-surface/5 rounded-full">
                <AlertCircle className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-2 hover:bg-on-surface/5 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 bg-surface-container/30 custom-scrollbar space-y-3 max-h-[60vh]">
            <AnimatePresence initial={false}>
              {downloads.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 text-center text-xs text-on-surface-variant font-mono uppercase tracking-[0.2em]"
                >
                  No active downloads
                </motion.div>
              ) : (
                downloads.slice().reverse().map(task => {
                  let statusBadgeColor = 'bg-surface-container text-on-surface-variant border-outline-variant';
                  let statusLabel: string = task.status;

                  switch(task.status) {
                    case 'queued':
                      statusBadgeColor = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
                      statusLabel = 'queued';
                      break;
                    case 'downloading':
                      statusBadgeColor = 'bg-secondary/10 text-secondary border-secondary/20';
                      statusLabel = 'syncing';
                      break;
                    case 'paused':
                      statusBadgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                      statusLabel = 'paused';
                      break;
                    case 'completed':
                      statusBadgeColor = 'bg-primary/10 text-primary border-primary/20';
                      statusLabel = 'success';
                      break;
                    case 'error':
                      statusBadgeColor = 'bg-error/10 text-error border-error/20';
                      statusLabel = 'failed';
                      break;
                    case 'canceled':
                      statusBadgeColor = 'bg-on-surface/10 text-on-surface-variant border-outline-variant';
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
                      className="p-4 bg-surface-container-high border border-outline-variant rounded-[24px] relative group overflow-hidden shadow-sm"
                    >
                      {task.status === 'downloading' && (
                        <div className="absolute top-0 left-0 bottom-0 bg-secondary/5 transition-all duration-300" style={{ width: `${task.progress}%` }} />
                      )}
                      <div className="relative z-10">
                        <div className="flex justify-between items-start gap-4 mb-2">
                          <span className="text-xs text-on-surface font-black truncate flex-1 uppercase tracking-tight">{task.media.name}</span>
                          <span className={`text-[8px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full border ${statusBadgeColor}`}>
                            {statusLabel}
                          </span>
                        </div>

                        <div className="flex justify-between items-end mt-4">
                          <div className="flex flex-col gap-1 flex-1 min-w-0 pr-4">
                            {/* Loaded metrics */}
                            <div className="text-[10px] font-mono text-on-surface-variant uppercase flex items-center gap-2">
                              {task.status === 'downloading' || task.status === 'paused' || task.status === 'completed' ? (
                                <>
                                  <span className="text-on-surface font-black">{(task.loaded / 1024 / 1024).toFixed(1)} MB</span>
                                  {task.total > 0 && (
                                    <>
                                      <span className="opacity-20">/</span>
                                      <span>{(task.total / 1024 / 1024).toFixed(1)} MB</span>
                                    </>
                                  )}
                                </>
                              ) : (
                                <span className="opacity-40 uppercase">{task.status}</span>
                              )}
                            </div>

                            {/* Speed and Time indicators */}
                            {task.status === 'downloading' && (
                              <div className="flex flex-col gap-1 mt-2">
                                <div className="text-[9px] font-mono flex items-center gap-2 flex-wrap">
                                  {/* Speed visual badge with speed tier colors */}
                                  {(() => {
                                    const speedInMb = task.downloadSpeed ? (task.downloadSpeed / 1024 / 1024) : 0;
                                    let speedColor = "text-on-surface-variant bg-surface-container border-outline-variant";
                                    let speedLabel = "Slow";
                                    if (speedInMb >= 10) {
                                      speedColor = "text-primary bg-primary/10 border-primary/30 animate-pulse";
                                      speedLabel = "Hyper";
                                    } else if (speedInMb >= 2) {
                                      speedColor = "text-secondary bg-secondary/10 border-secondary/30";
                                      speedLabel = "Fast";
                                    } else if (speedInMb > 0) {
                                      speedColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                                      speedLabel = "Normal";
                                    }

                                    return (
                                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${speedColor}`}>
                                        <span className="w-1 h-1 rounded-full bg-current" />
                                        {speedLabel}
                                      </span>
                                    );
                                  })()}

                                  {/* Speed reading */}
                                  <span className="text-secondary font-black">
                                    {task.downloadSpeed ? `${(task.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s` : 'Analyzing Sync...'}
                                  </span>

                                  {/* ETA formatting helper */}
                                  {task.timeRemaining !== undefined && task.timeRemaining !== null && !isNaN(task.timeRemaining) && task.timeRemaining !== Infinity ? (
                                    <>
                                      <span className="opacity-20">•</span>
                                      <span className="text-on-surface-variant font-medium">
                                        {(() => {
                                          const s = task.timeRemaining;
                                          if (s >= 3600) {
                                            const h = Math.floor(s / 3600);
                                            const m = Math.floor((s % 3600) / 60);
                                            return `${h}h ${m}m Left`;
                                          }
                                          if (s >= 60) {
                                            const m = Math.floor(s / 60);
                                            const sec = Math.ceil(s % 60);
                                            return `${m}m ${sec}s Left`;
                                          }
                                          return `${Math.ceil(s)}s Left`;
                                        })()}
                                      </span>
                                    </>
                                  ) : task.status === 'downloading' ? (
                                    <>
                                      <span className="opacity-20">•</span>
                                      <span className="opacity-30 italic">Calculating...</span>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Control actions */}
                          <div className="flex gap-2">
                            {task.status === 'downloading' && (
                              <button onClick={() => onPause(task.id)} className="p-2 rounded-full bg-surface-container-highest hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface transition-colors" title="Pause Download">
                                <Pause className="w-4 h-4" />
                              </button>
                            )}
                            {task.status === 'paused' && (
                              <button onClick={() => onResume(task.id)} className="p-2 rounded-full bg-surface-container-highest hover:bg-on-surface/10 text-on-surface-variant hover:text-on-surface transition-colors" title="Resume Download">
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {(task.status === 'queued' || task.status === 'downloading' || task.status === 'paused') && (
                              <button onClick={() => onCancel(task.id)} className="p-2 rounded-full bg-surface-container-highest hover:bg-error/20 text-on-surface-variant hover:text-error transition-colors" title="Cancel Download">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                            {(task.status === 'error' || task.status === 'canceled') && (
                              <button onClick={() => onResume(task.id)} className="p-2 rounded-full bg-surface-container-highest hover:bg-primary/20 text-on-surface-variant hover:text-primary transition-colors" title="Retry/Re-add to queue">
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {task.error && (
                          <div className="mt-4 text-[10px] text-error font-mono bg-error/10 p-3 border border-error/20 rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span className="truncate">{task.error}</span>
                          </div>
                        )}
                        
                        <div className="h-1.5 mt-4 w-full bg-on-surface/5 rounded-full overflow-hidden flex relative">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              task.status === 'error' 
                                ? 'bg-error shadow-[0_0_8px_rgba(var(--color-error),0.4)]' 
                                : task.status === 'canceled'
                                ? 'bg-on-surface/20'
                                : task.status === 'completed' 
                                ? 'bg-primary shadow-[0_0_8px_rgba(var(--color-primary),0.4)]' 
                                : task.status === 'paused'
                                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                : 'bg-secondary shadow-[0_0_8px_rgba(var(--color-secondary),0.4)]'
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
