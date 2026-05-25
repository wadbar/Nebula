import React, { memo } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Compass, 
  Monitor, 
  Waves, 
  FileText, 
  Database,
  History,
  Star,
  Layers,
  Map as MapIcon,
  Terminal as TerminalIcon
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenTerminal: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onOpenTerminal }) => {
  const navItems = [
    { id: 'discover', icon: Compass, label: 'Discover' },
    { id: 'antenna', icon: Waves, label: 'Signals' },
    { id: 'live_cam', icon: Monitor, label: 'Live Matrix' },
    { id: 'map', icon: MapIcon, label: 'Spatial Node' },
    { id: 'history', icon: History, label: 'Logbook' },
    { id: 'favorites', icon: Star, label: 'Priority' },
    { id: 'playlists', icon: Layers, label: 'Playlists' },
    { id: 'document', icon: FileText, label: 'Data Hub' },
    { id: 'dashboard', icon: Database, label: 'Kernel' },
  ];

  return (
    <aside className="w-20 md:w-24 fixed left-0 top-0 bottom-0 bg-[var(--md-sys-color-surface-container)] border-r border-[var(--md-sys-color-outline-variant)] flex flex-col py-8 z-50 transition-all group/sidebar hover:w-64">
      <div className="px-6 mb-12 flex flex-col items-center group-hover/sidebar:items-start transition-all">
        <div className="w-10 h-10 bg-primary/10 border border-brand-green/30 rounded-2xl flex items-center justify-center group-hover/sidebar:w-12 group-hover/sidebar:h-12 transition-all">
          <div className="w-5 h-5 bg-primary rounded-full animate-pulse shadow-[0_0_15px_#00FF41]" />
        </div>
        <div className="hidden group-hover/sidebar:block mt-4 animate-in fade-in slide-in-from-left-4">
           <h1 className="text-xs font-black text-on-surface tracking-[0.4em] uppercase">Nebula OS</h1>
           <p className="text-[8px] font-mono text-primary/60 uppercase mt-1">Core Kernel Active</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-2 px-4">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`
              flex items-center gap-6 p-4 rounded-full transition-all relative group
              ${isActive 
                ? 'bg-primary/10 text-primary' 
                : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'}
            `}
          >
            <item.icon className={`w-6 h-6 shrink-0 transition-all ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className={`
              text-[10px] font-black uppercase tracking-widest whitespace-nowrap hidden group-hover/sidebar:block
              animate-in fade-in slide-in-from-left-4 duration-300
            `}>
              {item.label}
            </span>
            {isActive && (
              <motion.div 
                layoutId="active-indicator"
                className="absolute left-0 w-1.5 h-10 bg-primary rounded-r-full shadow-[0_0_15px_rgba(45,212,191,0.4)]"
              />
            )}
          </button>
          );
        })}
      </nav>

       <div className="px-4 mt-auto flex flex-col gap-2">
          <button 
            onClick={onOpenTerminal}
            className="flex items-center gap-6 p-4 rounded-full text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all group"
          >
            <TerminalIcon className="w-6 h-6 shrink-0 group-hover:scale-110" />
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap hidden group-hover/sidebar:block">Terminal</span>
          </button>
          <button className="flex items-center gap-6 p-4 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5 transition-all group">
            <Settings className="w-6 h-6 shrink-0 group-hover:rotate-45" />
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap hidden group-hover/sidebar:block">Settings</span>
          </button>
       </div>
    </aside>
  );
};

export default memo(Sidebar);
