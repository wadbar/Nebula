import { useState, useMemo, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MediaResult } from '../types';
import { Play, Shield, Activity, Laptop, Flame } from 'lucide-react';

// Heatmap Sub-component
function LatencyHeatmapLayer({ results, enabled }: { results: EnrichedMediaResult[], enabled: boolean }) {
  const map = useMap();
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);

  useEffect(() => {
    if (!map || !window.google?.maps?.visualization) return;

    if (enabled) {
      const data = results.map(node => {
        const weight = (node.latency || 32) / 100; // Normalize weight
        return {
          location: new window.google.maps.LatLng(node.lat, node.lng),
          weight: Math.min(weight, 1)
        };
      });

      if (!heatmapRef.current) {
        heatmapRef.current = new window.google.maps.visualization.HeatmapLayer({
          data,
          map,
          radius: 40,
          opacity: 0.6,
          gradient: [
            'rgba(0, 255, 255, 0)',
            'rgba(0, 255, 255, 1)',
            'rgba(0, 191, 255, 1)',
            'rgba(0, 127, 255, 1)',
            'rgba(0, 63, 255, 1)',
            'rgba(0, 0, 255, 1)',
            'rgba(0, 0, 223, 1)',
            'rgba(0, 0, 191, 1)',
            'rgba(0, 0, 159, 1)',
            'rgba(0, 0, 127, 1)',
            'rgba(63, 0, 91, 1)',
            'rgba(127, 0, 63, 1)',
            'rgba(191, 0, 31, 1)',
            'rgba(255, 0, 0, 1)'
          ]
        });
      } else {
        heatmapRef.current.setData(data);
        heatmapRef.current.setMap(map);
      }
    } else if (heatmapRef.current) {
      heatmapRef.current.setMap(null);
    }

    return () => {
      if (heatmapRef.current) {
        heatmapRef.current.setMap(null);
      }
    };
  }, [map, results, enabled]);

  return null;
}

interface EnrichedMediaResult extends MediaResult {
  lat: number;
  lng: number;
  locationName: string;
  health: NonNullable<MediaResult['health']>;
}

function MapBoundsController({ results, trigger }: { results: EnrichedMediaResult[], trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map || results.length === 0 || !window.google?.maps) return;
    const bounds = new window.google.maps.LatLngBounds();
    results.forEach(result => {
      bounds.extend({ lat: Number(result.lat), lng: Number(result.lng) });
    });
    map.fitBounds(bounds);
  }, [map, results, trigger]);
  return null;
}

interface GlobalSignalMapProps {
  results: MediaResult[];
  playMedia: (media: MediaResult) => void;
  currentMedia: MediaResult | null;
  addLog: (text: string, type: 'info' | 'warn' | 'success' | 'security') => void;
  fetchIntel: (media: MediaResult) => void;
  openIntelPanel: (media: MediaResult) => void;
}

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY.trim() !== '';

// Deterministic location dictionary based on node signature
export const getDeterministicCoordinates = (name: string, url: string): { lat: number; lng: number; locationName: string } => {
  const hash = Math.abs(
    (name + url).split('').reduce((acc, char) => {
      return (acc << 5) - acc + char.charCodeAt(0);
    }, 0)
  );

  const locations = [
    { locationName: "New York Hub [US-EAST]", lat: 40.7128, lng: -74.0060 },
    { locationName: "San Francisco Node [US-WEST]", lat: 37.7749, lng: -122.4194 },
    { locationName: "London Relay [EU-WEST]", lat: 51.5074, lng: -0.1278 },
    { locationName: "Frankfurt Core [EU-CENTRAL]", lat: 50.1109, lng: 8.6821 },
    { locationName: "Tokyo Terminal [AP-NORTHEAST]", lat: 35.6762, lng: 139.6503 },
    { locationName: "Singapore Gateway [AP-SOUTHEAST]", lat: 1.3521, lng: 103.8198 },
    { locationName: "Sydney Node [AP-SOUTHEAST]", lat: -33.8688, lng: 151.2093 },
    { locationName: "São Paulo Anchor [SA-EAST]", lat: -23.5505, lng: -46.6333 },
    { locationName: "Cape Town Station [AF-SOUTH]", lat: -33.9249, lng: 18.4241 },
    { locationName: "Iceland Relay [EU-NORTH]", lat: 64.1466, lng: -21.9426 }
  ];

  return locations[hash % locations.length];
};

export default function GlobalSignalMap({
  results,
  playMedia,
  currentMedia,
  addLog,
  fetchIntel,
  openIntelPanel
}: GlobalSignalMapProps) {
  const [selectedNode, setSelectedNode] = useState<EnrichedMediaResult | null>(null);
  const [zoomTrigger, setZoomTrigger] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Map and enrich discovered signals with coordinates
  const enrichedResults = useMemo<EnrichedMediaResult[]>(() => {
    return results.map(node => {
      const geo = getDeterministicCoordinates(node.name, node.url);
      return {
        ...node,
        lat: node.lat || geo.lat,
        lng: node.lng || geo.lng,
        locationName: geo.locationName,
        health: node.health || 'optimal'
      };
    });
  }, [results]);

  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[550px] bg-black/40 rounded-2xl border border-white/5 font-mono">
        <div className="max-w-md w-full bg-[#0a0a0a] border border-red-500/20 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/30" />
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <Activity className="w-6 h-6 text-red-500 animate-pulse" />
          </div>
          
          <h2 className="text-white text-md font-bold tracking-wider mb-2 uppercase">Google Maps API Key Required</h2>
          <p className="text-xs text-white/50 mb-6 leading-relaxed">
            Realtime geo-spatial telemetry on global signal grids is disabled due to missing active platform key constraints.
          </p>

          <div className="text-left space-y-4 mb-6 bg-white/[0.02] p-4 rounded-xl border border-white/5 text-xs">
            <div>
              <span className="text-brand-green font-black">STEP 1:</span>{' '}
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-cyan hover:underline hover:text-brand-cyan/80 transition-colors"
                id="gmp-console-link"
              >
                Acquire Google Maps API Key
              </a>
            </div>
            <div>
              <span className="text-brand-green font-black">STEP 2:</span> Paste into AI Studio Secrets:
              <ul className="list-disc list-inside mt-1.5 pl-2 space-y-1 text-white/60">
                <li>Click the <Laptop className="w-3.5 h-3.5 inline mx-0.5" /> <b>Settings</b> gear icon in the top-right</li>
                <li>Go to <b>Secrets</b> sub-menu</li>
                <li>Add key named <code className="text-brand-cyan bg-white/5 px-1 rounded font-bold">GOOGLE_MAPS_PLATFORM_KEY</code></li>
                <li>Confirm value and click save. The system compiles automatically</li>
              </ul>
            </div>
          </div>
          
          <div className="text-[10px] text-white/30 italic">
            Applet automatically refreshes state following build-time secret injection.
          </div>
        </div>
      </div>
    );
  }

  // Determine marker pin features based on medical node state
  const getMarkerPinConfig = (health: string, isPlaying: boolean) => {
    if (isPlaying) {
      return {
        background: '#00fa9a',
        borderColor: '#001a0a',
        glyphColor: '#000',
        scale: 1.2
      };
    }
    switch (health) {
      case 'broken':
        return { background: '#ef4444', borderColor: '#4a0e0e', glyphColor: '#fff', scale: 1.0 };
      case 'degraded':
        return { background: '#f59e0b', borderColor: '#4a320d', glyphColor: '#000', scale: 1.0 };
      case 'unknown':
        return { background: '#0ea5e9', borderColor: '#083b54', glyphColor: '#fff', scale: 1.0 };
      case 'optimal':
      default:
        return { background: '#10b981', borderColor: '#042f1a', glyphColor: '#fff', scale: 1.0 };
    }
  };

  return (
    <div className="relative h-[600px] w-full rounded-2xl overflow-hidden border border-white/5 bg-black/20 flex flex-col lg:flex-row-reverse min-h-0">
      {/* Sidebar Control Widget inside Map View */}
      <div className="w-full lg:w-80 shrink-0 bg-[#070707] border-t lg:border-t-0 lg:border-r border-white/5 p-4 flex flex-col justify-between overflow-y-auto font-mono text-xs text-white/80 select-none">
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
            <span className="font-extrabold tracking-widest text-[10px] text-brand-green uppercase">SIGNAL NETWORK MAP</span>
            <div className="flex items-center gap-1.5 text-[9px] text-white/40">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              ONLINE
            </div>
          </div>

          <p className="text-[10px] text-white/40 mb-4 leading-relaxed">
            Viewing {enrichedResults.length} index nodes parsed globally. Click markers to review orbital locations, latency statistics, and trigger instant high-fidelity audio/video relays.
          </p>
          
          <button 
             onClick={() => {
                setZoomTrigger(prev => prev + 1);
             }}
             className="w-full text-center text-[9px] font-black tracking-widest bg-white/5 hover:bg-white/10 text-white uppercase py-2 rounded-lg mb-2 transition-colors"
          >
             ZOOM_TO_CLUSTER
          </button>

          <button 
             onClick={() => {
                setShowHeatmap(!showHeatmap);
                addLog(`Latent Heatmap layer ${!showHeatmap ? 'activated' : 'deactivated'}.`, 'info');
             }}
             className={`w-full text-center text-[9px] font-black tracking-widest px-4 py-2 rounded-lg mb-4 transition-all flex items-center justify-center gap-2 border ${showHeatmap ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-white/5 text-white/40 border-transparent hover:bg-white/10'}`}
          >
             <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'animate-pulse' : ''}`} />
             LATENCY_HEAT_GRID
          </button>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {enrichedResults.slice(0, 15).map((node, i) => {
              const isSelected = selectedNode?.url === node.url;
              const isPlaying = currentMedia?.url === node.url;
              return (
                <button
                  key={node.url + i}
                  onClick={() => {
                    setSelectedNode(node);
                    addLog(`Grounded map query to node: ${node.name}`, "info");
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-1 ${
                    isPlaying 
                      ? 'bg-brand-green/10 border-brand-green/30' 
                      : isSelected 
                      ? 'bg-white/5 border-white/20' 
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold truncate text-white block fill-current text-[10px] uppercase tracking-wide">{node.name}</span>
                    <span className={`text-[8px] font-black rounded-sm px-1 ${
                      node.health === 'broken' ? 'bg-red-500/10 text-red-400' :
                      node.health === 'degraded' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {node.health.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] text-white/40">
                    <span>{node.locationName}</span>
                    <span className="text-brand-cyan">{node.latency ? `${node.latency}ms` : '32ms'}</span>
                  </div>
                </button>
              );
            })}
            {enrichedResults.length === 0 && (
              <div className="text-center py-8 text-white/25 italic uppercase text-[10px] tracking-wider">
                No active signal nodes parsed. Execute search above to acquire vectors.
              </div>
            )}
          </div>
        </div>

        {selectedNode && (
          <div className="mt-4 p-3 bg-white/[0.02] rounded-xl border border-white/5 flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-brand-cyan uppercase">Selected Node Details</span>
              <button onClick={() => setSelectedNode(null)} className="text-white/40 hover:text-white pb-0.5">×</button>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-white uppercase text-[10px] leading-tight">{selectedNode.name}</span>
              <span className="text-[9px] text-white/40 leading-relaxed truncate">{selectedNode.url}</span>
              <span className="text-[9px] text-brand-green/80 mt-1">🌍 Position: {selectedNode.locationName}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => {
                  playMedia(selectedNode);
                  addLog(`Mapping server relay to node: ${selectedNode.name}`, "success");
                }}
                className="flex items-center justify-center gap-1 bg-brand-green text-black hover:bg-brand-green/80 font-black py-1.5 rounded-lg text-[9px] uppercase tracking-wider transition-colors"
              >
                <Play className="w-3 h-3 fill-current" />
                RELAY
              </button>
              <button
                onClick={() => {
                  fetchIntel(selectedNode);
                  openIntelPanel(selectedNode);
                }}
                className="flex items-center justify-center gap-1 bg-white/5 text-white border border-white/10 hover:bg-white/10 font-bold py-1.5 rounded-lg text-[9px] uppercase tracking-wider transition-colors"
              >
                <Shield className="w-3 h-3" />
                ANALYZE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actual Map element */}
      <div className="flex-1 relative min-h-[350px]">
        <APIProvider apiKey={API_KEY} version="weekly" libraries={['visualization']}>
          <Map
            defaultCenter={{ lat: 21.0, lng: 10.0 }}
            defaultZoom={2}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
            gestureHandling="greedy"
            disableDefaultUI={false}
          >
            <MapBoundsController results={enrichedResults} trigger={zoomTrigger} />
            <LatencyHeatmapLayer results={enrichedResults} enabled={showHeatmap} />
            {enrichedResults.map((node, i) => {
              const isPlaying = currentMedia?.url === node.url;
              const config = getMarkerPinConfig(node.health || 'optimal', isPlaying);
              return (
                <AdvancedMarker
                  key={node.url + i}
                  position={{ lat: Number(node.lat), lng: Number(node.lng) }}
                  title={node.name}
                  onClick={() => {
                    setSelectedNode(node);
                    addLog(`Queried geo node: ${node.name}`, "info");
                  }}
                >
                  <Pin 
                    background={config.background} 
                    borderColor={config.borderColor} 
                    glyphColor={config.glyphColor}
                    scale={config.scale}
                  />
                </AdvancedMarker>
              );
            })}

            {selectedNode && (
              <InfoWindow
                position={{ lat: Number(selectedNode.lat), lng: Number(selectedNode.lng) }}
                onCloseClick={() => setSelectedNode(null)}
              >
                <div className="p-1 text-black font-sans max-w-xs text-xs">
                  <h4 className="font-bold text-gray-900 border-b pb-1 mb-1 truncate">{selectedNode.name}</h4>
                  <div className="space-y-1 text-gray-500 mb-2">
                    <p className="truncate"><span className="text-gray-400 font-bold">URL:</span> {selectedNode.url}</p>
                    <p><span className="text-gray-400 font-bold">Region:</span> {selectedNode.locationName}</p>
                    <p><span className="text-gray-400 font-bold">Health:</span> <span className="uppercase font-bold text-emerald-600">{selectedNode.health || 'optimal'}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => playMedia(selectedNode)}
                      className="bg-emerald-600 text-white rounded px-2 py-1 font-bold text-[10px] hover:bg-emerald-700 transition-colors"
                    >
                      Play Node
                    </button>
                    <button
                      onClick={() => {
                        fetchIntel(selectedNode);
                        openIntelPanel(selectedNode);
                      }}
                      className="bg-gray-800 text-white rounded px-2 py-1 font-bold text-[10px] hover:bg-gray-900 transition-colors"
                    >
                      AI Intel
                    </button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
