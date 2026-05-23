import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, ListPlus, Plus, ChevronRight, Music } from 'lucide-react';
import { MediaResult, Playlist } from '../types';

interface PlaylistModalProps {
  item: MediaResult | null;
  playlists: Playlist[];
  onClose: () => void;
  onCreatePlaylist: (name: string) => void;
  onAddToPlaylist: (playlistId: string, item: MediaResult) => void;
}

const PlaylistModal: React.FC<PlaylistModalProps> = ({ item, playlists, onClose, onCreatePlaylist, onAddToPlaylist }) => {
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)] rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-green/30 to-transparent" />
        
        <div className="flex justify-between items-start mb-8">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-3">
              <ListPlus className="w-6 h-6 text-brand-green" />
              Add to Playlist
            </h3>
            <p className="text-[10px] uppercase font-black tracking-widest text-white/30 mt-1">Assign Node: {item.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white/40" />
          </button>
        </div>

        <div className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {playlists.map(p => (
            <motion.button 
              key={p.id}
              whileHover={{ x: 4 }}
              onClick={() => {
                onAddToPlaylist(p.id, item);
                onClose();
              }}
              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl group transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-black/50 flex items-center justify-center border border-white/10 group-hover:border-brand-green/30">
                  <Music className="w-5 h-5 text-brand-green/60" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white uppercase tracking-tight">{p.name}</div>
                  <div className="text-[10px] text-white/30">{p.items.length} signals stored</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-brand-green" />
            </motion.button>
          ))}
          {playlists.length === 0 && !showCreate && (
             <div className="text-center py-8 text-white/20 text-xs italic">No operational playlists found.</div>
          )}
        </div>

        {showCreate ? (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (newPlaylistName.trim()) {
                onCreatePlaylist(newPlaylistName.trim());
                setNewPlaylistName("");
                setShowCreate(false);
              }
            }}
            className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4"
          >
            <input 
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Playlist name..."
              autoFocus
              className="w-full bg-black/50 border border-[var(--md-sys-color-outline-variant)] rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-green/50 transition-all"
            />
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setShowCreate(false)}
                className="flex-1 p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-black uppercase text-white/40 transition-all"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 p-4 bg-brand-green text-black rounded-2xl text-xs font-black uppercase hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] transition-all"
              >
                Create
              </button>
            </div>
          </form>
        ) : (
          <button 
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 p-4 border border-dashed border-white/20 rounded-2xl text-xs font-black uppercase text-white/50 hover:bg-white/5 hover:border-white/40 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create New Playlist
          </button>
        )}
      </motion.div>
    </div>
  );
};

export default PlaylistModal;
