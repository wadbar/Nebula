import { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Star, Loader2, AlertCircle } from 'lucide-react';
import { MediaResult } from '../types';

export const DiscoverView = ({ playMedia }: { playMedia: (m: MediaResult) => void }) => {
  const [trending, setTrending] = useState<MediaResult[]>([]);
  const [curated, setCurated] = useState<MediaResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRealData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch real trending data from Radio Browser API (Global Open Source Radio Index)
        const [trendingRes, curatedRes] = await Promise.all([
          fetch('https://de1.api.radio-browser.info/json/stations/topvote/8'),
          fetch('https://de1.api.radio-browser.info/json/stations/topclick/8')
        ]);

        if (!trendingRes.ok || !curatedRes.ok) throw new Error('Failed to fetch global signals.');

        const trendingData = await trendingRes.json();
        const curatedData = await curatedRes.json();

        if (isMounted) {
          setTrending(trendingData.map((s: any) => ({
            id: s.stationuuid,
            name: s.name.trim() || 'Unknown Signal',
            url: s.url_resolved || s.url,
            type: 'audio_stream',
            category: s.tags ? s.tags.split(',')[0].trim() : 'Live Radio',
            description: `Codec: ${s.codec} | Bitrate: ${s.bitrate}kbps`,
            tags: s.tags ? s.tags.split(',') : []
          })));

          setCurated(curatedData.map((s: any) => ({
            id: s.stationuuid,
            name: s.name.trim() || 'Unknown Node',
            url: s.url_resolved || s.url,
            type: 'audio_stream',
            category: s.tags ? s.tags.split(',')[0].trim() : 'Curated',
            description: `Country: ${s.country} | Votes: ${s.votes}`,
            tags: s.tags ? s.tags.split(',') : []
          })));
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Signal interception failed');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRealData();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="p-6 space-y-8 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-white flex items-center gap-2"><Sparkles className="text-brand-cyan" /> DISCOVER_SYNC</h2>
        {isLoading && <Loader2 className="w-5 h-5 text-brand-green animate-spin" />}
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-mono">{error}</p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <section>
            <h3 className="text-sm font-black text-white/40 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-brand-green" /> TRENDING_SIGNALS (GLOBAL TOP VOTES)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trending.map(item => (
                <div key={item.id} onClick={() => playMedia(item)} className="bento-card p-4 cursor-pointer hover:border-brand-green/50 transition-all group relative overflow-hidden bg-black/40">
                    <p className="text-white font-mono text-sm group-hover:text-brand-green truncate mb-2">{item.name}</p>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest truncate">{item.category || 'VHF/UHF'}</span>
                        <span className="text-[10px] text-brand-cyan/60 truncate">{item.description}</span>
                    </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-black text-white/40 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> CURATED_TUNNELS (MOST ACTIVE)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {curated.map(item => (
                <div key={item.id} onClick={() => playMedia(item)} className="bento-card p-4 cursor-pointer hover:border-brand-cyan/50 transition-all group relative overflow-hidden bg-black/40">
                    <p className="text-white font-mono text-sm group-hover:text-brand-cyan truncate mb-2">{item.name}</p>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest truncate">{item.category || 'VHF/UHF'}</span>
                        <span className="text-[10px] text-brand-green/60 truncate">{item.description}</span>
                    </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
