// Web Worker for processing telemetry data
self.onmessage = function(e) {
  if (e.data.type === 'GENERATE_HISTORICAL') {
    const { length } = e.data;
    const historicalData = Array.from({ length }).map((_, i) => ({
      time: new Date(Date.now() - ((length - 1) - i) * 60000).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' }),
      cpu: Math.floor(Math.random() * 60) + 20,
      memory: Math.floor(Math.random() * 40) + 40,
    }));
    self.postMessage({ type: 'HISTORICAL_DATA', data: historicalData });
  } else if (e.data.type === 'GENERATE_INITIAL_LIVE') {
    const { length } = e.data;
    const initialData = Array.from({ length }).map((_, i) => ({
      time: new Date(Date.now() - ((length - 1) - i) * 2000).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
      cpu: Math.floor(Math.random() * 40) + 10,
      memory: Math.floor(Math.random() * 20) + 40,
    }));
    self.postMessage({ type: 'LIVE_DATA', data: initialData });
  } else if (e.data.type === 'TICK_LIVE') {
    const { lastValue } = e.data;
    let nextCpu = lastValue.cpu + (Math.random() * 20 - 10);
    nextCpu = Math.max(5, Math.min(95, nextCpu));
    
    let nextMemory = lastValue.memory + (Math.random() * 10 - 5);
    nextMemory = Math.max(20, Math.min(85, nextMemory));

    const newPoint = {
      time: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
      cpu: Math.floor(nextCpu),
      memory: Math.floor(nextMemory)
    };
    self.postMessage({ type: 'TICK_DATA', data: newPoint });
  }
};
