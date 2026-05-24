import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Cpu, HardDrive } from 'lucide-react';
import { motion } from 'motion/react';

export const SystemResources = React.memo(() => {
  const [data, setData] = useState<{ time: string; cpu: number; memory: number }[]>([]);
  const [isHistoricalMode, setIsHistoricalMode] = useState(false);

  useEffect(() => {
    let worker: Worker;
    let interval: NodeJS.Timeout;

    try {
      worker = new Worker(new URL('../workers/telemetryWorker.ts', import.meta.url), { type: 'module' });

      worker.onmessage = (e) => {
        if (e.data.type === 'HISTORICAL_DATA' || e.data.type === 'LIVE_DATA') {
          setData(e.data.data);
        } else if (e.data.type === 'TICK_DATA') {
          setData((prev) => {
            const newData = [...prev.slice(1)];
            newData.push(e.data.data);
            return newData;
          });
        }
      };

      if (isHistoricalMode) {
        worker.postMessage({ type: 'GENERATE_HISTORICAL', length: 60 });
      } else {
        worker.postMessage({ type: 'GENERATE_INITIAL_LIVE', length: 20 });
        interval = setInterval(() => {
          setData((prev) => {
            const lastValue = prev[prev.length - 1] || { cpu: 20, memory: 40 };
            worker.postMessage({ type: 'TICK_LIVE', lastValue });
            return prev; // State update happens in onmessage
          });
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to initialize telemetry worker:', err);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (worker) worker.terminate();
    };
  }, [isHistoricalMode]);

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 h-full overflow-y-auto relative custom-scrollbar pb-32">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
            <Activity className="text-primary w-5 h-5" /> SYSTEM DASHBOARD
         </h2>
         <label className="flex items-center gap-3 cursor-pointer bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container-highest transition-colors">
            <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Historical Mode (60m)</span>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
              <input 
                type="checkbox" 
                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-surface-container border-2 border-outline-variant appearance-none cursor-pointer checked:bg-primary checked:border-primary checked:translate-x-5 transition-all duration-300"
                checked={isHistoricalMode}
                onChange={(e) => setIsHistoricalMode(e.target.checked)}
              />
              <label className={`toggle-label block overflow-hidden h-5 rounded-full bg-outline-variant cursor-pointer ${isHistoricalMode ? '!bg-primary/50' : ''}`}></label>
            </div>
         </label>
       </div>

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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-on-surface-variant)" opacity={0.2} vertical={false} />
                  <XAxis dataKey="time" stroke="var(--color-on-surface-variant)" fontSize={10} tick={{ fill: 'var(--color-on-surface)' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--color-on-surface-variant)" fontSize={10} tick={{ fill: 'var(--color-on-surface)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-on-surface-variant)" opacity={0.2} vertical={false} />
                  <XAxis dataKey="time" stroke="var(--color-on-surface-variant)" fontSize={10} tick={{ fill: 'var(--color-on-surface)' }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--color-on-surface-variant)" fontSize={10} tick={{ fill: 'var(--color-on-surface)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
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
});
