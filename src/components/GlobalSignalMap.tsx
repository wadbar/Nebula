import React, { useState, useMemo, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { MediaResult } from '../types';
import { Play, Shield, Activity, Laptop, Flame, X, Globe } from 'lucide-react';

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

const GlobalSignalMap = React.memo(function GlobalSignalMap({
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
      <div className="flex flex-col items-center justify-center p-8 text-center h-[550px] bg-surface-container-high/40 rounded-[28px] border border-outline-variant font-mono">
        <div className="max-w-md w-full bg-surface-container rounded-[28px] p-6 sm:p-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-error/30" />
          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-error/20">
            <Activity className="w-8 h-8 text-error animate-pulse" />
          </div>
          
          <h2 className="text-on-surface text-lg font-black tracking-widest mb-3 uppercase">Maps Platform Constraint</h2>
          <p className="text-sm text-on-surface-variant mb-8 leading-relaxed font-sans">
            Realtime geo-spatial telemetry on global signal grids is disabled due to missing active platform key constraints.
          </p>

          <div className="text-left space-y-5 mb-8 bg-on-surface/[0.03] p-6 rounded-[24px] border border-outline-variant text-[11px] leading-relaxed">
            <div>
              <span className="text-primary font-black uppercase tracking-tighter mr-2">Step 01</span>{' '}
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-secondary hover:underline hover:text-secondary/80 font-black transition-colors"
                id="gmp-console-link"
              >
                Acquire Google Maps API Key
              </a>
            </div>
            <div>
              <span className="text-primary font-black uppercase tracking-tighter mr-2">Step 02</span> Inject via AI Studio Secrets:
              <ul className="list-disc list-inside mt-3 pl-2 space-y-2 text-on-surface-variant font-sans">
                <li>Access <Laptop className="w-3.5 h-3.5 inline mx-0.5" /> <b>Settings</b> in top-right menu</li>
                <li>Navigate to <b>Secrets</b> sub-module</li>
                <li>Provision key named <code className="text-secondary bg-secondary/5 px-2 py-0.5 rounded font-black text-[10px]">GOOGLE_MAPS_PLATFORM_KEY</code></li>
                <li>Commit values to trigger automatic hardware re-initialization</li>
              </ul>
            </div>
          </div>
          
          <div className="text-[10px] text-on-surface-variant/40 italic font-sans">
            Applet automatically refreshes state following build-time secret injection.
          </div>
        </div>
      </div>
    );
  }

  // Determine marker pin features based on latency and health
  const getMarkerPinConfig = (health: string, isPlaying: boolean, latency?: number) => {
    if (isPlaying) {
      return {
        background: '#D1FF1A',
        borderColor: '#99CC00',
        glyphColor: '#000',
        scale: 1.4
      };
    }

    // Default latency if not provided
    const lat = latency || 32;

    // Latency-based background color
    let background = '#D1FF1A'; // optimal (lime)
    if (lat > 150) {
      background = '#FF5252'; // poor (error red)
    } else if (lat > 50) {
      background = '#FFB74D'; // stable/degraded (amber)
    }

    // Health-based overrides
    if (health === 'broken') background = '#FF5252';

    return { 
      background, 
      borderColor: 'rgba(0,0,0,0.3)', 
      glyphColor: '#fff', 
      scale: 1.0 
    };
  };

  return (
    <div className="relative h-[600px] w-full rounded-[28px] overflow-hidden border border-outline-variant bg-surface-container-high/20 flex flex-col lg:flex-row-reverse min-h-0">
      {/* Sidebar Control Widget inside Map View */}
      <div className="w-full lg:w-80 shrink-0 bg-surface-container p-6 flex flex-col justify-between overflow-y-auto custom-scrollbar select-none z-10 shadow-2xl">
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant">
            <span className="font-black tracking-[0.2em] text-[10px] text-primary uppercase">Signal Network</span>
            <div className="flex items-center gap-1.5 text-[9px] text-primary font-black">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              RADAR ACTIVE
            </div>
          </div>

          <p className="text-[11px] text-on-surface-variant/80 mb-6 leading-relaxed italic border-l-2 border-primary/20 pl-4 font-sans">
            Viewing {enrichedResults.length} index nodes parsed globally. Interact with vector markers to Review orbital locations and trigger relays.
          </p>
          
          <div className="flex flex-col gap-2 mb-6">
            <button 
               onClick={() => setZoomTrigger(prev => prev + 1)}
               className="m3-button-tonal w-full py-3 text-[10px] rounded-2xl"
            >
               ZOOM_TO_CLUSTER
            </button>

            <button 
               onClick={() => {
                  setShowHeatmap(!showHeatmap);
                  addLog(`Latent Heatmap layer ${!showHeatmap ? 'activated' : 'deactivated'}.`, 'info');
               }}
               className={`m3-button w-full py-3 text-[10px] rounded-2xl flex items-center justify-center gap-2 border transition-all ${showHeatmap ? 'bg-secondary/20 text-secondary border-secondary/40 animate-pulse' : 'bg-surface-container-highest/50 text-on-surface-variant border-transparent hover:bg-surface-container-highest'}`}
            >
               <Flame className={`w-3.5 h-3.5 ${showHeatmap ? 'animate-pulse' : ''}`} />
               LATENCY_HEAT_GRID
            </button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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
                  className={`w-full text-left p-4 rounded-[20px] border transition-all flex flex-col gap-2 ${
                    isPlaying 
                      ? 'bg-primary/10 border-primary/40' 
                      : isSelected 
                      ? 'bg-surface-container-highest border-outline' 
                      : 'bg-surface-container-high/40 border-outline-variant hover:border-outline hover:bg-surface-container-high'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-black truncate text-on-surface block text-[10px] uppercase tracking-wide">{node.name}</span>
                    <span className={`text-[8px] font-black rounded-full px-2 py-0.5 border ${
                      node.health === 'broken' ? 'bg-error/10 text-error border-error/20' :
                      node.health === 'degraded' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-primary/10 text-primary border-primary/20'
                    }`}>
                      {node.health.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono font-black">
                    <span className="text-on-surface-variant opacity-60 uppercase">{node.locationName}</span>
                    <span className="text-secondary tracking-tighter">{node.latency ? `${node.latency}ms` : '32ms'}</span>
                  </div>
                </button>
              );
            })}
            {enrichedResults.length === 0 && (
              <div className="text-center py-12 text-on-surface-variant/30 italic uppercase text-[10px] tracking-[0.2em] p-6 border-2 border-dashed border-outline-variant rounded-[24px]">
                No active signal nodes parsed.
              </div>
            )}
          </div>
        </div>

        {selectedNode && (
          <div className="mt-6 p-4 bg-surface-container-highest rounded-[24px] border border-outline shadow-xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-secondary uppercase tracking-[0.1em]">Node Analytics</span>
              <button title="Close" onClick={() => setSelectedNode(null)} className="text-on-surface-variant hover:text-on-surface p-1 hover:bg-on-surface/5 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-black text-on-surface uppercase text-[11px] leading-tight truncate">{selectedNode.name}</span>
              <span className="text-[9px] text-on-surface-variant font-mono truncate opacity-60">{selectedNode.url}</span>
              <div className="flex items-center gap-2 mt-2">
                <Globe className="w-3.5 h-3.5 text-secondary" />
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-tighter">{selectedNode.locationName}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => {
                  playMedia(selectedNode);
                  addLog(`Mapping server relay to node: ${selectedNode.name}`, "success");
                }}
                className="m3-button-filled !py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] tracking-widest"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                RELAY
              </button>
              <button
                onClick={() => {
                  fetchIntel(selectedNode);
                  openIntelPanel(selectedNode);
                }}
                className="m3-button-tonal !py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] tracking-widest"
              >
                <Shield className="w-3.5 h-3.5" />
                INTEL
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
              const config = getMarkerPinConfig(node.health || 'optimal', isPlaying, node.latency);
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
                <div className="p-3 bg-surface text-on-surface max-w-xs font-sans rounded-xl border border-outline-variant shadow-2xl">
                  <h4 className="font-black text-on-surface border-b border-outline-variant pb-2 mb-2 truncate uppercase tracking-tighter text-xs">{selectedNode.name}</h4>
                  <div className="space-y-1.5 text-[10px] text-on-surface-variant mb-4 font-mono">
                    <p className="truncate"><span className="opacity-40 font-black">DIR:</span> {selectedNode.url}</p>
                    <p><span className="opacity-40 font-black">REG:</span> {selectedNode.locationName}</p>
                    <p><span className="opacity-40 font-black">HLS:</span> <span className="uppercase font-black text-primary">{selectedNode.health || 'optimal'}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => playMedia(selectedNode)}
                      className="bg-primary text-on-primary rounded-lg px-3 py-1.5 font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all flex-1"
                    >
                      Init Relay
                    </button>
                    <button
                      onClick={() => {
                        fetchIntel(selectedNode);
                        openIntelPanel(selectedNode);
                      }}
                      className="bg-surface-container-highest text-on-surface-variant rounded-lg px-3 py-1.5 font-black text-[9px] uppercase tracking-widest hover:bg-on-surface/5 transition-all flex-1 border border-outline-variant"
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
});

export default GlobalSignalMap;
