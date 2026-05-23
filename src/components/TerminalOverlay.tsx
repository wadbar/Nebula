import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Terminal, 
  ChevronRight, 
  Network, 
  ShieldAlert,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface TerminalOverlayProps {
  onClose: () => void;
  addLog: (msg: string, type?: "info" | "success" | "warn" | "error" | "crit") => void;
  logs: any[];
  gpuEnabled: boolean;
  gpuDetails: any;
}

const TerminalOverlay: React.FC<TerminalOverlayProps> = ({ onClose, addLog, logs, gpuEnabled, gpuDetails }) => {
  const [terminalInput, setTerminalInput] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    
    const cmd = terminalInput.trim();
    setTerminalInput("");
    addLog(`Executing: ${cmd}`, "info");

    try {
      const response = await fetch('/api/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           prompt: cmd, 
           gpuEnabled, 
           gpuDetails 
        })
      });
      const data = await response.json();
      if (data.text) {
          addLog(data.text, "info");
      }
    } catch (err) {
      addLog(`Terminal execution failure: ${String(err)}`, "error");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`fixed ${isMaximized ? 'inset-0' : 'bottom-24 right-6 w-full max-w-2xl h-[500px]'} z-[200] bg-black/90 backdrop-blur-2xl border border-brand-green/30 rounded-3xl shadow-[0_0_50px_rgba(0,255,65,0.2)] overflow-hidden flex flex-col`}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-brand-green/20 bg-brand-green/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center border border-brand-green/30">
            <Terminal className="w-4 h-4 text-brand-green" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white tracking-widest uppercase">System Control Unit</h3>
            <p className="text-[8px] font-mono text-brand-green/60 uppercase">Kernel v3.4.0-DEB4-S77</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setIsMaximized(!isMaximized)}
             className="p-2 hover:bg-white/10 rounded-lg text-white/40 transition-colors"
           >
             {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
           </button>
           <button 
             onClick={onClose}
             className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-white/40 transition-colors"
           >
             <X className="w-4 h-4" />
           </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto font-mono text-[11px] space-y-4 custom-scrollbar" ref={scrollRef}>
        <div className="space-y-1 mb-8">
           <p className="text-brand-green">Initializing NEBULA_OS Core...</p>
           <p className="text-white/40 italic">-- Logic parity detected --</p>
           <p className="text-white/40 italic">-- GPU acceleration: {gpuEnabled ? 'ENABLED' : 'DISABLED'} --</p>
           <p className="text-brand-cyan">Matrix Handshake: SUCCESSFUL (Node 0x1F2A)</p>
        </div>

        {logs.map((log, i) => (
          <div key={i} className="flex gap-4 group">
            <span className="text-white/20 shrink-0 select-none">[{new Date(log.timestamp).toLocaleTimeString([], {hour12: false})}]</span>
            <span className={`
              ${log.type === 'success' ? 'text-brand-green' : ''}
              ${log.type === 'error' ? 'text-red-500 font-bold' : ''}
              ${log.type === 'crit' ? 'text-red-600 font-black animate-pulse bg-red-500/10 px-1' : ''}
              ${log.type === 'warn' ? 'text-yellow-500' : ''}
              ${log.type === 'info' ? 'text-white/70' : ''}
              break-words flex-1
            `}>
              <span className="mr-2 opacity-50">{log.type?.toUpperCase()} &gt;</span>
              {log.message}
            </span>
          </div>
        ))}
        <div className="h-4" />
      </div>

      <div className="p-4 bg-brand-green/5 border-t border-brand-green/20">
        <form onSubmit={handleCommand} className="flex items-center gap-3 bg-black/60 border border-brand-green/30 rounded-xl px-4 py-2 focus-within:border-brand-green transition-all shadow-inner">
           <ChevronRight className="w-4 h-4 text-brand-green shrink-0 animate-pulse" />
           <input 
             value={terminalInput}
             onChange={(e) => setTerminalInput(e.target.value)}
             placeholder="Enter kernel command..."
             className="bg-transparent border-none outline-none text-brand-green font-mono text-xs flex-1 placeholder:text-brand-green/20"
             autoFocus
           />
           <div className="flex items-center gap-2 opacity-40">
              <ShieldAlert className="w-3 h-3 text-red-500" />
              <Network className="w-3 h-3 text-brand-cyan" />
           </div>
        </form>
      </div>
      
      {!isMaximized && (
        <div className="bg-brand-green h-0.5 animate-scan" style={{width: '100%'}} />
      )}
    </motion.div>
  );
};

export default TerminalOverlay;
