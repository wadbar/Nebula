import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity } from 'lucide-react';

export interface TrendData {
  name: string;
  count: number;
}

export interface SearchTrendsProps {
  history: string[];
  maxItems?: number;
  onSearch: (term: string) => void;
  className?: string;
}

export const SearchTrends: React.FC<SearchTrendsProps> = ({ 
  history, 
  maxItems = 10,
  onSearch,
  className = ""
}) => {
  const data = useMemo<TrendData[]>(() => {
    if (!history || history.length === 0) return [];
    
    // Utilizando Map para performance otimizada em grandes volumes de dados O(n)
    const counts = new Map<string, number>();
    
    for (let i = 0; i < history.length; i++) {
        const term = history[i];
        if (!term) continue;
        
        const normalized = term.toLowerCase().trim();
        if (!normalized) continue;
        
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }

    // Conversão e ordenação eficiente
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxItems);
  }, [history, maxItems]);

  if (history.length === 0 || data.length === 0) return null;

  return (
    <div className={`m3-card p-6 flex flex-col gap-4 animate-in fade-in transition-all w-full min-h-[300px] ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-primary animate-pulse" />
        <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Global Search Trends</h3>
      </div>
      
      <div className="flex-1 min-h-[220px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }} 
              width={100}
            />
            <Tooltip 
              cursor={{ fill: 'var(--color-surface-container-highest)', opacity: 0.2 }}
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: '1px solid var(--color-outline-variant)', 
                borderRadius: '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                backdropFilter: 'blur(8px)'
              }}
              labelStyle={{ display: 'none' }}
              itemStyle={{ color: 'var(--color-primary)' }}
              formatter={(value: any) => [`${value} queries`, 'Volume']}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20} className="cursor-pointer" onClick={(payload: any) => onSearch(payload?.name || '')}>
              {data.map((_, index) => (
                <Cell key={`trend-cell-${index}`} className="fill-primary/60 hover:fill-primary transition-all duration-300" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-outline-variant">
        {data.slice(0, 5).map((trend, i) => (
          <button 
            key={`trend-btn-${i}`}
            onClick={() => onSearch(trend.name)}
            className="text-[10px] uppercase font-mono tracking-wider px-3 py-1.5 bg-surface-container hover:bg-surface-container-high border border-outline-variant rounded-full text-on-surface-variant hover:text-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={`Search for ${trend.name}`}
          >
            #{trend.name}
          </button>
        ))}
      </div>
    </div>
  );
};
