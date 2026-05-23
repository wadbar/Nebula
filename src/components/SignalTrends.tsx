import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MediaResult } from '../types';
import { Activity } from 'lucide-react';

interface SignalTrendsProps {
  results: MediaResult[];
}

const SignalTrends: React.FC<SignalTrendsProps> = ({ results }) => {
  const data = useMemo(() => {
    if (!results || results.length === 0) return [];
    
    const categoryCounts: Record<string, number> = {};
    results.forEach(item => {
      const cat = item.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    return Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [results]);

  // Use fixed key to prevent chart flickering during transitions
  const chartKey = "deterministic-pie-chart";

  const COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#f59e0b', '#ef4444'];

  if (data.length === 0) return null;

  return (
    <motion.section 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      key="signal-trends-container"
      className="bg-surface-container rounded-3xl p-6 border border-outline-variant shadow-sm w-full xl:w-1/2 flex flex-col min-h-[250px]"
    >
      <h3 className="text-[10px] sm:text-sm font-black text-on-surface-variant mb-4 flex items-center gap-2">
        <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-brand-green" />
        RELEVANT SIGNAL CATEGORIES
      </h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart key={chartKey}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={5}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
              isAnimationActive={true}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ 
                backgroundColor: 'var(--md-sys-color-surface-container-high)', 
                borderColor: 'var(--md-sys-color-outline-variant)', 
                borderRadius: '12px', 
                fontSize: '10px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
              itemStyle={{ color: 'var(--md-sys-color-on-surface)' }}
            />
            <Legend 
              verticalAlign="middle" 
              align="right" 
              layout="vertical"
              formatter={(value) => <span className="text-[9px] uppercase tracking-wider text-white/60 font-bold">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
};

export default SignalTrends;
