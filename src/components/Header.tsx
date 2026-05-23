import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Loader2, RefreshCw, X, Terminal, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  query: string;
  setQuery: (q: string) => void;
  loading: boolean;
  onSearch: (e?: React.FormEvent, customQuery?: string) => void;
  onRefresh: () => void;
  isOnline: boolean;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}

const Header: React.FC<HeaderProps> = ({ query, setQuery, loading, onSearch, onRefresh, isOnline, theme, setTheme }) => {
  return (
    <header className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 mt-4 animate-in fade-in slide-in-from-top-6 duration-700">
      <div className="flex flex-col gap-1 items-center sm:items-start">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-primary/10 border border-primary/30 rounded-lg text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2">
             <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-primary' : 'bg-brand-red'} animate-pulse`} />
             Node_Alpha
          </div>
          <div className="h-4 w-px bg-outline-variant" />
          <span className="text-xs font-mono text-on-surface-variant uppercase tracking-[0.2em]">Universal_Signal_Bus</span>
        </div>
        <h2 className="text-3xl font-black text-on-surface uppercase tracking-tight leading-none group cursor-default">
           Distributed <span className="text-primary group-hover:text-brand-cyan transition-colors">OSINT</span> Matrix
        </h2>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto relative group/search">
        <form onSubmit={onSearch} className="flex-1 sm:w-96 relative">
          <div className="absolute inset-x-0 -bottom-10 opacity-0 group-focus-within/search:opacity-100 transition-opacity pointer-events-none">
             <div className="flex items-center gap-2 text-[8px] font-mono text-primary/40 uppercase tracking-widest pl-4">
                <Terminal className="w-2.5 h-2.5" /> Direct Kernel Query Mode Active
             </div>
          </div>
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Global Signals..." 
            className="m3-input pl-14 pr-16"
          />
          <div className="absolute left-5 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-on-surface-variant group-focus-within/search:text-primary transition-colors" />
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
                className="absolute right-16 top-1/2 -translate-y-1/2 p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant hover:text-on-surface"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
          <button 
             type="submit"
             className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-primary text-on-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all outline-none"
          >
             Exec
          </button>
        </form>
        
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-2xl transition-all shadow-sm text-on-surface-variant hover:text-on-surface"
          title="Toggle System Theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button 
          onClick={onRefresh}
          className="p-3 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-2xl transition-all group/refresh shadow-sm"
          title="Force Synchro Re-scan"
        >
          <RefreshCw className={`w-5 h-5 text-on-surface-variant group-hover/refresh:text-primary group-hover/refresh:rotate-180 transition-all duration-700 ${loading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>
    </header>
  );
};

export default Header;
