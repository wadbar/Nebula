import React, { useState } from 'react';
import { Play, Trash2, List, PlusSquare, RefreshCw } from 'lucide-react';
import { Reorder } from 'motion/react';
import { MediaResult, Playlist } from '../types';

export const PlaylistViewer = ({
    playlists,
    setPlaylists,
    playMedia,
    addLog,
    setActivePlaylistId,
}: {
    playlists: Playlist[],
    setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>,
    playMedia: (media: MediaResult) => void,
    addLog: (text: string, type: 'info' | 'warn' | 'success' | 'security') => void,
    setActivePlaylistId: React.Dispatch<React.SetStateAction<string | null>>,
}) => {
    const [themeInput, setThemeInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    const generatePlaylist = async (theme: string) => {
        setIsGenerating(true);
        addLog(`[AI] Generating playlist for theme: ${theme}...`, "info");
        try {
            const response = await fetch("/api/discover", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: `Create playlist from AI analysis of "${theme}"`, type: 'all' }),
            });
            const data = await response.json();
            
            if (Array.isArray(data)) {
                setPlaylists(prev => [...prev, { id: Date.now().toString(), name: `AI: ${theme}`, items: data }]);
                addLog(`[AI] Playlist '${theme}' created with ${data.length} items.`, "success");
            } else {
                throw new Error("Generation failed");
            }
        } catch (err: any) {
            addLog(`[AI] Playlist generation failed: ${err.message}`, "warn");
        } finally {
            setIsGenerating(false);
            setThemeInput("");
        }
    };

    const createPlaylist = ({ name }: { name: string }) => {
        if (!name) return;
        setPlaylists(prev => [...prev, { id: Date.now().toString(), name, items: [] }]);
        addLog(`Playlist '${name}' created.`, "success");
    };

    return (
        <div className="space-y-6">
            <div className="bento-card p-4 bg-white/5 border border-white/10 space-y-4">
                <h3 className="text-sm font-black text-white uppercase">New Playlist</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={themeInput} 
                        onChange={(e) => setThemeInput(e.target.value)}
                        placeholder="Playlist name..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-green/30"
                    />
                    <button 
                        onClick={() => {
                            createPlaylist({ name: themeInput });
                            setThemeInput("");
                        }}
                        disabled={!themeInput}
                        className="bg-brand-green/20 hover:bg-brand-green/30 text-brand-green px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 border border-brand-green/20"
                    >
                        <PlusSquare className="w-3 h-3" />
                        CREATE
                    </button>
                    <button 
                        onClick={() => generatePlaylist(themeInput)}
                        disabled={isGenerating || !themeInput}
                        className="bg-brand-green/10 hover:bg-brand-green/20 text-brand-green/70 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 border border-brand-green/10"
                    >
                        {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <List className="w-3 h-3" />}
                        AI_GEN
                    </button>
                </div>
            </div>
            {playlists.map((playlist) => (
                <div key={playlist.id} className="bento-card p-4 bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white uppercase">{playlist.name}</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setActivePlaylistId(playlist.id);
                        if (playlist.items.length > 0) playMedia(playlist.items[0]);
                      }}
                      className="bg-brand-green/20 hover:bg-brand-green/30 text-brand-green px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" /> PLAY
                    </button>
                    <button 
                      onClick={() => setPlaylists(prev => prev.filter(p => p.id !== playlist.id))}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <Reorder.Group axis="y" values={playlist.items} onReorder={(items) => {
                    setPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, items } : p));
                }} className="space-y-2">
                    {playlist.items.map((item) => (
                    <Reorder.Item key={item.url} value={item} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center gap-4 cursor-grab transition-colors">
                        <div className="text-white/20"><List className="w-4 h-4" /></div>
                        <div className="flex-1 text-xs text-white truncate">{item.name}</div>
                        <button onClick={() => {
                          setActivePlaylistId(playlist.id);
                          playMedia(item);
                        }} className="text-white/40 hover:text-brand-green transition-colors">
                          <Play className="w-4 h-4" />
                        </button>
                    </Reorder.Item>
                    ))}
                </Reorder.Group>
                </div>
            ))}
        </div>
    );
};
