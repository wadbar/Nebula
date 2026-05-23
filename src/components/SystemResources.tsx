import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, HardDrive } from 'lucide-react';
import { motion } from 'motion/react';

export const SystemResources = () => {
  const [data, setData] = useState<{ time: string; cpu: number; memory: number }[]>([]);

  useEffect(() => {
    // Initial data
    const initialData = Array.from({ length: 20 }).map((_, i) => ({
      time: new Date(Date.now() - (19 - i) * 2000).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
      cpu: Math.floor(Math.random() * 40) + 10,
      memory: Math.floor(Math.random() * 20) + 40,
    }));
    setData(initialData);

    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [...prev.slice(1)];
        const lastValue = prev[prev.length - 1];
        
        let nextCpu = lastValue.cpu + (Math.random() * 20 - 10);
        nextCpu = Math.max(5, Math.min(95, nextCpu));
        
        let nextMemory = lastValue.memory + (Math.random() * 10 - 5);
        nextMemory = Math.max(20, Math.min(85, nextMemory));

        newData.push({
          time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
          cpu: Math.floor(nextCpu),
          memory: Math.floor(nextMemory)
        });
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 h-full overflow-y-auto relative custom-scrollbar pb-32">
       <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
          <Activity className="text-primary w-5 h-5" /> SYSTEM DASHBOARD
       </h2>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bento-card p-6 bg-surface-container/50 border border-outline-variant rounded-3xl"
         >
           <h3 className="text-xs font-black text-on-surface flex items-center gap-2 mb-4 uppercase tracking-widest">
             <Cpu className="w-4 h-4 text-brand-cyan" /> CPU Usage
           </h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" opacity={0.3} vertical={false} />
                  <XAxis dataKey="time" stroke="var(--md-sys-color-on-surface-variant)" fontSize={10} tick={{ fill: 'var(--md-sys-color-on-surface-variant)' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--md-sys-color-on-surface-variant)" fontSize={10} tick={{ fill: 'var(--md-sys-color-on-surface-variant)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--md-sys-color-surface-container-high)', borderColor: 'var(--md-sys-color-outline-variant)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: 'var(--color-brand-cyan)', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="cpu" name="CPU (%)" stroke="var(--color-brand-cyan)" strokeWidth={3} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
           </div>
         </motion.div>

         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.1 }}
           className="bento-card p-6 bg-surface-container/50 border border-outline-variant rounded-3xl"
         >
           <h3 className="text-xs font-black text-on-surface flex items-center gap-2 mb-4 uppercase tracking-widest">
             <HardDrive className="w-4 h-4 text-brand-green" /> Memory Usage
           </h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline-variant)" opacity={0.3} vertical={false} />
                  <XAxis dataKey="time" stroke="var(--md-sys-color-on-surface-variant)" fontSize={10} tick={{ fill: 'var(--md-sys-color-on-surface-variant)' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--md-sys-color-on-surface-variant)" fontSize={10} tick={{ fill: 'var(--md-sys-color-on-surface-variant)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--md-sys-color-surface-container-high)', borderColor: 'var(--md-sys-color-outline-variant)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: 'var(--color-brand-green)', fontWeight: 'bold' }}
                  />
                  <Line type="monotone" dataKey="memory" name="Memory (%)" stroke="var(--color-brand-green)" strokeWidth={3} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
           </div>
         </motion.div>
       </div>
    </div>
  );
};
