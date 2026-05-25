import React, { useState } from 'react';
import { Play, Trash2, List, PlusSquare, RefreshCw, Edit2, Download, Check, Upload } from 'lucide-react';
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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

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

    const handleM3UImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            const lines = text.split(/\r?\n/);
            const items: MediaResult[] = [];
            let currentItem: Partial<MediaResult> = {};

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#EXTM3U')) {
                    continue;
                }
                if (trimmed.startsWith('#EXTINF:')) {
                    const nameParts = trimmed.split(',');
                    const name = nameParts.length > 1 ? nameParts.slice(1).join(',').trim() : "Unnamed Track";
                    const groupMatch = trimmed.match(/group-title="([^"]+)"/i);
                    
                    currentItem = {
                        name,
                        type: 'video_stream',
                        category: groupMatch ? groupMatch[1] : 'M3U Stream',
                        description: `Imported via M3U playlist file: ${file.name}`,
                        relevance_score: 1.0
                    };
                } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                    if (currentItem.name) {
                        const extension = trimmed.toLowerCase().split('?')[0].split('.').pop();
                        let type: "video" | "audio" | "radio" | "video_stream" | "live_cam" | "tv" = "video_stream";
                        if (extension === 'mp3' || extension === 'ogg' || extension === 'aac') {
                            type = "audio";
                        } else if (extension === 'm3u8') {
                            type = "tv";
                        } else if (extension === 'mp4' || extension === 'mkv') {
                            type = "video";
                        }

                        items.push({
                            ...(currentItem as MediaResult),
                            url: trimmed,
                            type,
                            id: `m3u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
                        });
                        currentItem = {};
                    } else {
                        const name = trimmed.split('/').pop()?.split('?')[0] || "Stream Code";
                        items.push({
                            id: `m3u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                            name,
                            url: trimmed,
                            type: 'video_stream',
                            service: 'M3U Parser',
                            category: 'M3U StreamCode',
                            description: 'Direct stream link.',
                            relevance_score: 0.9,
                            tags: []
                        });
                    }
                }
            }

            if (items.length > 0) {
                const playlistName = file.name.substring(0, file.name.lastIndexOf('.')) || "M3U Playlist";
                setPlaylists(prev => [...prev, {
                    id: Date.now().toString(),
                    name: playlistName,
                    items
                }]);
                addLog(`Imported playlist '${playlistName}' with ${items.length} items.`, "success");
            } else {
                addLog("Could not find any stream URLs in the M3U file.", "warn");
            }
        };
        reader.readAsText(file);
        event.target.value = "";
    };

    const handleExport = (playlist: Playlist) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(playlist, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `playlist_${playlist.name.replace(/\s+/g, '_')}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        addLog(`Exported playlist: ${playlist.name}`, "info");
    };

    const saveRename = (id: string) => {
        if (!editingName.trim()) {
            setEditingId(null);
            return;
        }
        setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: editingName } : p));
        setEditingId(null);
        addLog(`Renamed playlist.`, "success");
    };

    return (
        <div className="space-y-6">
            <div className="m3-card p-4 bg-surface-container border border-outline-variant space-y-4">
                <h3 className="text-sm font-black text-on-surface uppercase">New Playlist</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={themeInput} 
                        onChange={(e) => setThemeInput(e.target.value)}
                        placeholder="Playlist name..."
                        className="flex-1 bg-black/40 border border-outline-variant rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-brand-green/30"
                    />
                    <button 
                        onClick={() => {
                            createPlaylist({ name: themeInput });
                            setThemeInput("");
                        }}
                        disabled={!themeInput}
                        className="bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 border border-brand-green/20"
                    >
                        <PlusSquare className="w-3 h-3" />
                        CREATE
                    </button>
                    <button 
                        onClick={() => generatePlaylist(themeInput)}
                        disabled={isGenerating || !themeInput}
                        className="bg-primary/10 hover:bg-primary/20 text-primary/70 px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 border border-brand-green/10"
                    >
                        {isGenerating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <List className="w-3 h-3" />}
                        AI_GEN
                    </button>
                    <label className="bg-secondary/20 hover:bg-secondary/30 text-secondary px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 border border-brand-cyan/20 cursor-pointer">
                        <Upload className="w-3 h-3" />
                        IMPORT M3U
                        <input 
                            type="file" 
                            accept=".m3u,.m3u8,.txt" 
                            onChange={handleM3UImport} 
                            className="hidden" 
                        />
                    </label>
                </div>
            </div>
            {playlists.map((playlist) => (
                <div key={playlist.id} className="m3-card p-4 bg-surface-container border border-outline-variant">
                <div className="flex items-center justify-between mb-4">
                  {editingId === playlist.id ? (
                      <div className="flex items-center gap-2 flex-1 mr-4">
                          <input 
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveRename(playlist.id)}
                              className="flex-1 bg-black/40 border border-brand-green/50 rounded-lg px-2 py-1 text-xs text-on-surface focus:outline-none"
                              autoFocus
                          />
                          <button onClick={() => saveRename(playlist.id)} className="text-primary hover:text-on-surface transition-colors">
                              <Check className="w-4 h-4" />
                          </button>
                      </div>
                  ) : (
                      <h3 className="text-sm font-black text-on-surface uppercase flex items-center gap-2 group flex-1">
                          {playlist.name}
                          <button 
                              onClick={() => { setEditingId(playlist.id); setEditingName(playlist.name); }} 
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-on-surface"
                          >
                              <Edit2 className="w-3 h-3" />
                          </button>
                      </h3>
                  )}
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => handleExport(playlist)}
                      className="bg-surface-container hover:bg-surface-container-high text-on-surface-variant px-2 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 border border-outline-variant"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => {
                        setActivePlaylistId(playlist.id);
                        if (playlist.items.length > 0) playMedia(playlist.items[0]);
                      }}
                      className="bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1"
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
                    <Reorder.Item key={item.url} value={item} className="p-3 bg-surface-container hover:bg-surface-container-high rounded-xl border border-outline-variant flex items-center gap-4 cursor-grab transition-colors">
                        <div className="text-on-surface-variant"><List className="w-4 h-4" /></div>
                        <div className="flex-1 text-xs text-on-surface truncate text-left">{item.name}</div>
                        <div className="flex items-center gap-2" onPointerDown={e => e.stopPropagation()}>
                          <button 
                            onClick={() => {
                              setActivePlaylistId(playlist.id);
                              playMedia(item);
                            }} 
                            className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer p-1"
                            title="Play"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              setPlaylists(prev => prev.map(p => p.id === playlist.id ? { ...p, items: p.items.filter(i => i.url !== item.url) } : p));
                              addLog(`Removed from playlist: ${item.name}`, "info");
                            }}
                            className="text-on-surface-variant hover:text-red-500 transition-colors cursor-pointer p-1"
                            title="Remove from Playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                    </Reorder.Item>
                    ))}
                </Reorder.Group>
                </div>
            ))}
        </div>
    );
};
