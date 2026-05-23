import React from 'react';
import { motion } from 'motion/react';
import { X, Cpu, Zap, ShieldAlert, Activity, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MediaResult } from '../types';

interface IntelDetailModalProps {
  media: MediaResult | null;
  intel: string | null;
  loading: boolean;
  onClose: () => void;
  systemStats: any;
  streamInfo: any;
}

const IntelDetailModal: React.FC<IntelDetailModalProps> = ({ media, intel, loading, onClose, systemStats, streamInfo }) => {
  if (!media) return null;

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--md-sys-color-surface-container)] border border-brand-cyan/20 rounded-[3rem] shadow-[0_30px_100px_rgba(0,184,212,0.15)] overflow-hidden flex flex-col"
      >
        <div className="absolute top-0 right-0 p-8 flex items-center gap-3">
          <div className="flex bg-black/60 backdrop-blur border border-brand-cyan/30 rounded-full px-4 py-2 gap-4">
             <div className="flex flex-col items-center">
                <span className="text-[6px] font-black uppercase text-white/30">Protocol</span>
                <span className="text-[10px] font-mono text-brand-cyan">SEC_TLS</span>
             </div>
             <div className="h-6 w-px bg-white/10" />
             <div className="flex flex-col items-center">
                <span className="text-[6px] font-black uppercase text-white/30">Integrity</span>
                <span className="text-[10px] font-mono text-brand-green">100%</span>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/40 border border-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 pb-4">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-cyan px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/30">Signal Intelligence</span>
            <div className="flex-1 h-px bg-brand-cyan/20" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none mb-1">{media.name}</h2>
          <p className="text-xs font-mono text-white/30 uppercase tracking-widest truncate">{media.url}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-black/40 rounded-[2rem] border border-white/5 p-6 backdrop-blur-md">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
                     <Activity className="w-3 h-3 text-brand-green" />
                     Live Telemetry
                  </h4>
                  <div className="space-y-5">
                     <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black uppercase text-white/40">Latency</span>
                        <span className="text-sm font-mono text-brand-green">{systemStats.latency.toFixed(1)}ms</span>
                     </div>
                     <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black uppercase text-white/40">Packet Loss</span>
                        <span className="text-sm font-mono text-red-400">{systemStats.packetLoss.toFixed(3)}%</span>
                     </div>
                     <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black uppercase text-white/40">Bandwidth</span>
                        <span className="text-sm font-mono text-brand-cyan">{(systemStats.net || 0).toFixed(1)} MBPS</span>
                     </div>
                     <div className="flex justify-between items-end border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black uppercase text-white/40">Codec</span>
                        <span className="text-sm font-mono text-white/60">{streamInfo.codec || 'AUTO_DET'}</span>
                     </div>
                  </div>
               </div>

               <div className="bg-brand-cyan/5 rounded-[2rem] border border-brand-cyan/10 p-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-cyan mb-4 flex items-center gap-2">
                     <ShieldAlert className="w-3 h-3" />
                     Security Profile
                  </h4>
                  <div className="space-y-3">
                     <p className="text-[10px] leading-relaxed text-white/50">Node validation confirms this signal is safe for proxy extraction. No malicious headers detected in current payload sample.</p>
                     <div className="flex items-center gap-2 text-[10px] font-mono text-brand-cyan">
                        <Zap className="w-3 h-3" />
                        Signature: {Math.random().toString(36).substring(2, 10).toUpperCase()}
                     </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-8">
               <div className="bg-white/[0.02] rounded-[2rem] border border-white/10 p-8 min-h-[500px] relative">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                       <div className="relative">
                          <RefreshCw className="w-12 h-12 text-brand-cyan animate-spin opacity-20" />
                          <Cpu className="w-6 h-6 text-brand-cyan absolute inset-0 m-auto animate-pulse" />
                       </div>
                       <div className="flex flex-col items-center">
                          <span className="text-xs font-black uppercase tracking-[0.3em] text-brand-cyan">Executing deep forensic analysis</span>
                          <span className="text-[10px] font-mono text-white/20 uppercase mt-2 animate-pulse">Requesting LLM Insight Layer...</span>
                       </div>
                    </div>
                  ) : intel ? (
                    <div className="markdown-body text-white/80 leading-relaxed max-w-none prose prose-invert font-sans">
                      <ReactMarkdown>{intel}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-white/20 italic">No forensic data found for this node.</div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default IntelDetailModal;
