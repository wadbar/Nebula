import { useState, useEffect } from 'react';
import { Keyboard, RotateCcw, ShieldCheck, X } from 'lucide-react';

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  defaultCode: string;
  currentCode: string;
  category: string;
}

export const INITIAL_SHORTCUTS: KeyboardShortcut[] = [
  { id: 'toggle_playback', name: 'Toggle Playback', description: 'Play or pause the active multimedia stream', defaultCode: 'Space', currentCode: 'Space', category: 'Playback' },
  { id: 'mute', name: 'Mute / Unmute', description: 'Toggle speaker audio output instantly', defaultCode: 'KeyM', currentCode: 'KeyM', category: 'Audio' },
  { id: 'volume_up', name: 'Volume Increase', description: 'Raise scalar volume increment by 10%', defaultCode: 'ArrowUp', currentCode: 'ArrowUp', category: 'Audio' },
  { id: 'volume_down', name: 'Volume Decrease', description: 'Lower scalar volume increment by 10%', defaultCode: 'ArrowDown', currentCode: 'ArrowDown', category: 'Audio' },
  { id: 'seek_forward', name: 'Seek Forward', description: 'Skip 10 seconds ahead in the stream buffer', defaultCode: 'ArrowRight', currentCode: 'ArrowRight', category: 'Navigation' },
  { id: 'seek_backward', name: 'Seek Backward', description: 'Rewind 10 seconds behind in the stream buffer', defaultCode: 'ArrowLeft', currentCode: 'ArrowLeft', category: 'Navigation' },
  { id: 'fullscreen', name: 'Toggle Fullscreen', description: 'Toggle fullscreen video rendering canvas', defaultCode: 'KeyF', currentCode: 'KeyF', category: 'Playback' },
  { id: 'next_category', name: 'Next Signal Category', description: 'Advance forward through core signal tags', defaultCode: 'BracketRight', currentCode: 'BracketRight', category: 'Interface' },
  { id: 'prev_category', name: 'Previous Signal Category', description: 'Jump backward through core signal tags', defaultCode: 'BracketLeft', currentCode: 'BracketLeft', category: 'Interface' },
];

interface ShortcutManagerProps {
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
  setShortcuts: (updated: KeyboardShortcut[]) => void;
  addLog: (text: string, type: 'info' | 'warn' | 'success' | 'security') => void;
}

export default function ShortcutManager({
  onClose,
  shortcuts,
  setShortcuts,
  addLog
}: ShortcutManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  // Monitor keys for assignment
  useEffect(() => {
    if (!editingId) return;

      const handleKeyCapture = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let newCode = "";
      if (e.ctrlKey) newCode += "Ctrl+";
      if (e.altKey) newCode += "Alt+";
      if (e.shiftKey) newCode += "Shift+";
      newCode += e.code;
      
      if (!e.code) return;

      // Check duplicate biddings
      const isDuplicated = shortcuts.find(s => s.currentCode === newCode && s.id !== editingId);

      // Perform validation check
      if (isDuplicated) {
        addLog(`Collision: Key code "${newCode}" is already bound to "${isDuplicated.name}"`, "warn");
        return;
      }

      const updated = shortcuts.map(s => {
        if (s.id === editingId) {
          return { ...s, currentCode: newCode };
        }
        return s;
      });

      setShortcuts(updated);
      localStorage.setItem('nebula_custom_shortcuts', JSON.stringify(updated));
      addLog(`Re-bound shortcut "${shortcuts.find(s => s.id === editingId)?.name}" to key [${newCode}]`, "success");
      setEditingId(null);
    };

    window.addEventListener('keydown', handleKeyCapture, true);
    return () => window.removeEventListener('keydown', handleKeyCapture, true);
  }, [editingId, shortcuts, setShortcuts, addLog]);

  const handleReset = () => {
    const updated = shortcuts.map(s => ({ ...s, currentCode: s.defaultCode }));
    setShortcuts(updated);
    localStorage.removeItem('nebula_custom_shortcuts');
    addLog(`All interface key-bindings reset to standard OMEGA constraints.`, "info");
  };

  const getReadableKey = (code: string) => {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    if (code === 'Space') return 'Spacebar';
    if (code === 'BracketLeft') return '[';
    if (code === 'BracketRight') return ']';
    if (code === 'ArrowRight') return '→';
    if (code === 'ArrowLeft') return '←';
    if (code === 'ArrowUp') return '↑';
    if (code === 'ArrowDown') return '↓';
    return code;
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 font-mono text-xs select-none">
      <div className="bg-[#070707] border border-brand-green/20 rounded-2xl w-full max-w-2xl p-6 sm:p-8 flex flex-col max-h-[90vh] shadow-[0_0_30px_rgba(0,255,65,0.05)] relative overflow-hidden">
        {/* Neon accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-green/45 via-brand-cyan/25 to-transparent animate-pulse" />
        
        {/* Title Block */}
        <div className="flex justify-between items-start border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center border border-brand-green/20">
              <Keyboard className="w-4 h-4 text-brand-green animate-pulse" />
            </div>
            <div>
              <h3 className="text-white text-sm font-black tracking-widest uppercase">INTERFACE HOTKEYS & KEYBINDINGS</h3>
              <p className="text-[9px] text-white/40 uppercase">Re-verify calibration arrays and map custom hardware event-listeners</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
          >
            <X className="w-3.5 h-3.5 text-white/70 hover:text-white" />
          </button>
        </div>

        {/* Warning notification */}
        <div className="bg-brand-green/[0.02] border border-brand-green/10 rounded-xl p-3 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-4.5 h-4.5 text-brand-green shrink-0 mt-0.5 animate-pulse" />
          <p className="text-[10px] text-white/60 leading-relaxed">
            Custom binds are persistent across browser sessions using localStorage layers. To change a key, click <b>Re-bind</b> and click the target physical button on your physical board. Avoid binding browser system registers (F5, F11, etc.).
          </p>
        </div>

        {/* Shortcuts table */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 mb-6">
          {['Playback', 'Audio', 'Navigation', 'Interface'].map((cat) => {
            const catShortcuts = shortcuts.filter(s => s.category === cat);
            return (
              <div key={cat} className="space-y-1.5">
                <h4 className="text-[9px] font-black text-brand-cyan uppercase tracking-widest border-b border-white/5 pb-1 select-none">{cat} Vectors</h4>
                <div className="space-y-0.5 text-white/80">
                  {catShortcuts.map((s) => {
                    const isEditing = editingId === s.id;
                    return (
                      <div 
                        key={s.id} 
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                          isEditing 
                            ? 'bg-brand-green/5 border-brand-green/30' 
                            : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="max-w-[65%]">
                          <div className="font-bold text-[10px] text-white uppercase">{s.name}</div>
                          <div className="text-[9px] text-white/40 mt-0.5 leading-relaxed">{s.description}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded bg-black border font-extrabold text-[10px] min-w-[50px] text-center border-white/10 select-none shadow-inner ${
                            isEditing ? 'text-brand-green border-brand-green/40 shadow-brand-green/10 animate-pulse bg-brand-green/5' : 'text-brand-cyan'
                          }`}>
                            {isEditing ? 'PRESS...' : getReadableKey(s.currentCode)}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) setEditingId(null);
                              else setEditingId(s.id);
                            }}
                            className={`px-2.5 py-1 rounded font-black text-[9px] uppercase tracking-wider transition-all select-none ${
                              isEditing 
                                ? 'bg-amber-500 text-black font-extrabold hover:bg-amber-400' 
                                : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {isEditing ? 'Cancel' : 'Re-bind'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer controls */}
        <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors uppercase text-[9px] font-black tracking-widest py-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            RESET FACTORY CALIBRATION
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-brand-green text-black hover:bg-brand-green/80 font-black tracking-widest text-[10px] uppercase transition-all shadow-[0_0_15px_rgba(0,255,65,0.2)]"
          >
            DISPATCH CONFIG
          </button>
        </div>
      </div>
    </div>
  );
}
