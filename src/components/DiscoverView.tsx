import { Sparkles, TrendingUp, Star } from 'lucide-react';
import { MediaResult } from '../types';

export const DiscoverView = ({ playMedia }: { playMedia: (m: MediaResult) => void }) => {
  // Mock data - in a production app, these would come from an API
  const trending: MediaResult[] = [
    { id: '1', name: 'Global Signal Monitor', url: '#', type: 'video_stream', category: 'Live', description: 'Real-time global signal.', tags: [] },
    { id: '2', name: 'Tech Deep Dive', url: '#', type: 'video', category: 'Education', description: 'Tech deep dive session.', tags: [] },
    { id: '3', name: 'Ambient Synthesis', url: '#', type: 'audio', category: 'Music', description: 'Ambient sounds.', tags: [] },
    { id: '4', name: 'Open Architecture Lab', url: '#', type: 'media', category: 'Tech', description: 'Lab session.', tags: [] },
  ];
  
  const curated: MediaResult[] = [
    { id: '5', name: 'Open Source Waves', url: '#', type: 'audio', category: 'Music', description: 'Open source music.', tags: [] },
    { id: '6', name: 'Neural Network Visuals', url: '#', type: 'video', category: 'Visuals', description: 'Visual neural network.', tags: [] },
  ];

  return (
    <div className="p-6 space-y-8 h-full overflow-y-auto">
      <h2 className="text-xl font-black text-white flex items-center gap-2"><Sparkles className="text-brand-cyan" /> DISCOVER_SYNC</h2>
      
      <section>
        <h3 className="text-sm font-black text-white/40 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-green" /> TRENDING_SIGNALS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trending.map(item => (
            <div key={item.id} onClick={() => playMedia(item)} className="bento-card p-4 cursor-pointer hover:border-brand-green/20 transition-all group">
                <p className="text-white font-mono text-sm group-hover:text-brand-green">{item.name}</p>
                <span className="text-[10px] text-white/40 uppercase tracking-widest">{item.category}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-black text-white/40 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> CURATED_TUNNELS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {curated.map(item => (
            <div key={item.id} onClick={() => playMedia(item)} className="bento-card p-4 cursor-pointer hover:border-brand-cyan/20 transition-all group">
                <p className="text-white font-mono text-sm group-hover:text-brand-cyan">{item.name}</p>
                <span className="text-[10px] text-white/40 uppercase tracking-widest">{item.category}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
