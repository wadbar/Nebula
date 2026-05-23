import { useMemo } from 'react';
import { BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const SearchTrends = ({ searchHistory }: { searchHistory: string[] }) => {
  const searchStats = useMemo(() => {
    if (!searchHistory || searchHistory.length === 0) return [];
    const counts = searchHistory.reduce((acc: Record<string, number>, term: string) => {
      acc[term] = (acc[term] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [searchHistory]);

  const chartKey = useMemo(() => {
    return searchStats.map(s => `${s.name}:${s.count}`).join('|');
  }, [searchStats]);

  if (searchStats.length === 0) return null;

  return (
    <section className="bg-surface-container rounded-3xl p-6 border border-outline-variant shadow-sm w-full xl:w-1/2 min-h-[250px]">
      <h3 className="text-[10px] sm:text-sm font-black text-on-surface-variant mb-4 flex items-center gap-2">
        <BarChart2 className="w-3 h-3 sm:w-4 sm:h-4 text-brand-cyan" />
        SEARCH FREQUENCY INDEX
      </h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart key={chartKey} data={searchStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" opacity={0.3} vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="var(--md-sys-color-on-surface-variant)" 
              fontSize={9} 
              tick={{ fill: 'var(--md-sys-color-on-surface-variant)', fontWeight: 'bold' }} 
              axisLine={false} 
              tickLine={false} 
              padding={{ left: 10, right: 10 }}
            />
            <YAxis 
              stroke="var(--md-sys-color-on-surface-variant)" 
              fontSize={9} 
              tick={{ fill: 'var(--md-sys-color-on-surface-variant)' }} 
              axisLine={false} 
              tickLine={false} 
              allowDecimals={false} 
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'var(--md-sys-color-surface-container-high)', 
                borderColor: 'var(--md-sys-color-outline-variant)', 
                borderRadius: '12px', 
                fontSize: '10px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              itemStyle={{ color: 'var(--md-sys-color-primary)' }}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar 
              dataKey="count" 
              fill="#06b6d4" 
              radius={[4, 4, 0, 0]} 
              animationBegin={0}
              animationDuration={800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
