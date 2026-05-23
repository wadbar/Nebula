import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, RefreshCw, X, Terminal } from 'lucide-react';

interface HeaderProps {
  query: string;
  setQuery: (q: string) => void;
  loading: boolean;
  onSearch: (e?: React.FormEvent, customQuery?: string) => void;
  onRefresh: () => void;
  isOnline: boolean;
}

const Header: React.FC<HeaderProps> = ({ query, setQuery, loading, onSearch, onRefresh, isOnline }) => {
  return (
    <header className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 mt-4 animate-in fade-in slide-in-from-top-6 duration-700">
      <div className="flex flex-col gap-1 items-center sm:items-start">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-brand-green/10 border border-brand-green/30 rounded-lg text-[10px] font-black uppercase text-brand-green tracking-widest flex items-center gap-2">
             <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-brand-green' : 'bg-red-500'} animate-pulse`} />
             Node_Alpha
          </div>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-xs font-mono text-white/30 uppercase tracking-[0.2em]">Universal_Signal_Bus</span>
        </div>
        <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none group cursor-default">
           Distributed <span className="text-brand-green group-hover:text-brand-cyan transition-colors">OSINT</span> Matrix
        </h2>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto relative group/search">
        <form onSubmit={onSearch} className="flex-1 sm:w-96 relative">
          <div className="absolute inset-x-0 -bottom-10 opacity-0 group-focus-within/search:opacity-100 transition-opacity pointer-events-none">
             <div className="flex items-center gap-2 text-[8px] font-mono text-brand-green/40 uppercase tracking-widest pl-4">
                <Terminal className="w-2.5 h-2.5" /> Direct Kernel Query Mode Active
             </div>
          </div>
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Global Signals (Radio, HLS, Audio, Documents)..." 
            className="w-full bg-white/[0.03] border border-white/5 rounded-3xl pl-14 pr-6 py-4.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:bg-white/[0.05] focus:border-brand-green/40 focus:ring-4 focus:ring-brand-green/5 transition-all duration-500 font-sans shadow-2xl"
          />
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2 className="w-5 h-5 text-brand-green animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-white/20 group-focus-within/search:text-brand-green transition-colors" />
            )}
          </div>
          <AnimatePresence>
            {query && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button" 
                onClick={() => setQuery("")}
                className="absolute right-16 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-full transition-colors text-white/20 hover:text-white"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
          <button 
             type="submit"
             className="absolute right-1.5 top-1.5 bottom-1.5 px-6 bg-brand-green text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-green-400 hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] active:scale-95 transition-all outline-none"
          >
             Exec
          </button>
        </form>
        
        <button 
          onClick={onRefresh}
          className="p-4.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 rounded-3xl transition-all group/refresh hover:border-brand-cyan/40 shadow-2xl"
          title="Force Synchro Re-scan"
        >
          <RefreshCw className={`w-5 h-5 text-white/20 group-hover/refresh:text-brand-cyan group-hover/refresh:rotate-180 transition-all duration-700 ${loading ? 'animate-spin text-brand-cyan' : ''}`} />
        </button>
      </div>
    </header>
  );
};

export default Header;
