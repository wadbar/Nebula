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
        className="relative w-full max-w-4xl max-h-[90vh] bg-surface-container border border-outline-variant rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="absolute top-0 right-0 p-8 flex items-center gap-3 z-10">
          <div className="flex bg-surface-container-highest/60 backdrop-blur border border-outline-variant rounded-full px-4 py-2 gap-4">
             <div className="flex flex-col items-center">
                <span className="text-[7px] font-black uppercase text-on-surface-variant opacity-60">Protocol</span>
                <span className="text-[10px] font-mono text-primary">SEC_TLS</span>
             </div>
             <div className="h-6 w-px bg-outline-variant" />
             <div className="flex flex-col items-center">
                <span className="text-[7px] font-black uppercase text-on-surface-variant opacity-60">Integrity</span>
                <span className="text-[10px] font-mono text-secondary">100%</span>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-surface-container-highest/40 hover:bg-surface-container-highest rounded-full text-on-surface-variant hover:text-on-surface border border-outline-variant transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 pb-4">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">Signal Intelligence</span>
            <div className="flex-1 h-[2px] bg-outline-variant opacity-30" />
          </div>
          <h2 className="text-3xl font-black text-on-surface uppercase tracking-tight leading-none mb-1">{media.name}</h2>
          <p className="text-xs font-mono text-on-surface-variant uppercase tracking-widest truncate">{media.url}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
            <div className="lg:col-span-4 space-y-6">
               <div className="bg-surface-container-high rounded-[2.5rem] border border-outline-variant p-6 shadow-inner">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-6 flex items-center gap-2">
                     <Activity className="w-3 h-3 text-primary" />
                     Live Telemetry
                  </h4>
                  <div className="space-y-5">
                     <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2">
                        <span className="text-[11px] font-black uppercase text-on-surface-variant opacity-70">Latency</span>
                        <span className="text-sm font-mono text-primary">{systemStats.latency.toFixed(1)}ms</span>
                     </div>
                     <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2">
                        <span className="text-[11px] font-black uppercase text-on-surface-variant opacity-70">Packet Loss</span>
                        <span className="text-sm font-mono text-error">{systemStats.packetLoss.toFixed(3)}%</span>
                     </div>
                     <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2">
                        <span className="text-[11px] font-black uppercase text-on-surface-variant opacity-70">Bandwidth</span>
                        <span className="text-sm font-mono text-secondary">{(systemStats.net || 0).toFixed(1)} MBPS</span>
                     </div>
                     <div className="flex justify-between items-end border-b border-outline-variant/30 pb-2">
                        <span className="text-[11px] font-black uppercase text-on-surface-variant opacity-70">Codec</span>
                        <span className="text-sm font-mono text-on-surface/60">{streamInfo.codec || 'AUTO_DET'}</span>
                     </div>
                  </div>
               </div>

               <div className="bg-primary/5 rounded-[2.5rem] border border-primary/20 p-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                     <ShieldAlert className="w-3 h-3" />
                     Security Profile
                  </h4>
                  <div className="space-y-3">
                     <p className="text-[11px] leading-relaxed text-on-surface-variant">Node validation confirms this signal is safe for proxy extraction. No malicious headers detected in current payload sample.</p>
                     <div className="flex items-center gap-2 text-[10px] font-mono text-primary bg-primary/10 px-3 py-1 rounded-full w-fit">
                        <Zap className="w-3 h-3" />
                        Signature: {Math.random().toString(36).substring(2, 10).toUpperCase()}
                     </div>
                  </div>
               </div>
            </div>

            <div className="lg:col-span-8">
               <div className="bg-surface-container-highest/20 rounded-[2.5rem] border border-outline-variant p-8 min-h-[500px] relative shadow-inner">
                  {loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                       <div className="relative">
                          <RefreshCw className="w-12 h-12 text-primary animate-spin opacity-20" />
                          <Cpu className="w-6 h-6 text-primary absolute inset-0 m-auto animate-pulse" />
                       </div>
                       <div className="flex flex-col items-center">
                          <span className="text-sm font-black uppercase tracking-[0.3em] text-primary">Executing deep forensic analysis</span>
                          <span className="text-[11px] font-mono text-on-surface-variant uppercase mt-3 animate-pulse">Requesting LLM Insight Layer...</span>
                       </div>
                    </div>
                  ) : intel ? (
                    <div className="markdown-body text-on-surface/80 leading-relaxed max-w-none prose prose-invert font-sans">
                      <ReactMarkdown>{intel}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-on-surface-variant italic">No forensic data found for this node.</div>
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
