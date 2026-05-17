import React, { useEffect } from 'react';
import { AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Radio, Video, Camera, Activity } from 'lucide-react';
import { NodeLocation, MediaResult } from '../types';

export const NetworkMap = ({ 
    nodes, 
    results, 
    active, 
    onSelect 
}: { 
    nodes: NodeLocation[], 
    results: MediaResult[], 
    active: boolean, 
    onSelect?: (item: MediaResult) => void 
}) => {
  const map = useMap();
  
  useEffect(() => {
    if (map && (nodes.length > 0 || results.length > 0)) {
      const bounds = new google.maps.LatLngBounds();
      nodes.forEach(node => bounds.extend(node));
      results.forEach(res => {
        if (res.lat !== undefined && res.lng !== undefined) {
          bounds.extend({ lat: res.lat, lng: res.lng });
        }
      });
      map.fitBounds(bounds, 50);
    }
  }, [map, nodes, results]);

  if (!active && results.length === 0) return null;

  return (
    <>
      {/* Consensus Validator Nodes */}
      {nodes.map((node) => (
        <AdvancedMarker
          key={node.id}
          position={{ lat: node.lat, lng: node.lng }}
        >
          <div className="relative group/validator">
             <div className={`w-2 h-2 rounded-full ${node.status === 'active' ? 'bg-brand-green/40 shadow-[0_0_5px_#00FF41]' : 'bg-red-500/40'} animate-pulse`} />
             <div className="absolute inset-0 bg-brand-green/5 rounded-full animate-ping opacity-10" />
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover/validator:opacity-100 transition-opacity bg-black/80 border border-white/10 px-2 py-1 rounded whitespace-nowrap pointer-events-none z-[200]">
                <span className="text-[7px] font-mono text-brand-green">VALIDATOR_{node.id}</span>
             </div>
          </div>
        </AdvancedMarker>
      ))}

      {/* Media Feed Nodes */}
      {results.map((res, i) => (
        res.lat !== undefined && res.lng !== undefined && (
          <AdvancedMarker
            key={`${res.url}-${i}`}
            position={{ lat: res.lat, lng: res.lng }}
            onClick={() => onSelect?.(res)}
          >
            <div className="relative group/node cursor-pointer">
               <div className={`w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center transition-transform hover:scale-125 ${res.health === 'optimal' ? 'bg-brand-green shadow-[0_0_15px_rgba(0,255,65,0.4)]' : 'bg-yellow-500'}`}>
                  {res.type === 'radio' && <Radio className="w-2 h-2 text-black" />}
                  {res.type === 'video' && <Video className="w-2 h-2 text-black" />}
                  {['live_cam', 'webcam', 'stream'].includes(res.type) && <Camera className="w-2 h-2 text-black" />}
                  {!['radio', 'video', 'live_cam', 'webcam', 'stream'].includes(res.type) && <Activity className="w-2 h-2 text-black" />}
               </div>
               
               {/* Marker Tooltip */}
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/node:opacity-100 transition-all bg-[#0a0a0a]/95 border border-brand-green/30 p-2 rounded-lg shadow-2xl backdrop-blur-xl min-w-[140px] z-[210] pointer-events-none">
                  <div className="flex items-center gap-2 mb-1">
                     <div className={`w-1 h-1 rounded-full ${res.health === 'optimal' ? 'bg-brand-green' : 'bg-yellow-500'} animate-pulse`} />
                     <span className="text-[10px] font-black text-white uppercase truncate">{res.name}</span>
                  </div>
                  <div className="flex justify-between text-[7px] font-mono text-white/40 uppercase">
                     <span>{res.type}</span>
                     <span className="text-brand-green">NODE_LINKED</span>
                  </div>
               </div>
            </div>
          </AdvancedMarker>
        )
      ))}
    </>
  );
};
