import { useState } from 'react';
import { MapPin, Wifi, Compass, Orbit, RefreshCw, Layers } from 'lucide-react';
import { GEO_HUBS, GeoHub } from '../utils/geo';
import { motion, AnimatePresence } from 'motion/react';

interface GeoSearchControllerProps {
  isGeoLocked: boolean;
  setIsGeoLocked: (val: boolean) => void;
  userHub: GeoHub;
  setUserHub: (hub: GeoHub) => void;
  userCoords: { lat: number; lng: number };
  setUserCoords: (coords: { lat: number; lng: number }) => void;
  maxScope: 'cidade' | 'estado' | 'pais' | 'continente' | 'hemisferio' | 'planeta' | 'espaco';
  setMaxScope: (scope: any) => void;
  addLog: (msg: string, type: 'info' | 'success' | 'warn' | 'security') => void;
}

export default function GeoSearchController({
  isGeoLocked,
  setIsGeoLocked,
  userHub,
  setUserHub,
  userCoords,
  setUserCoords,
  maxScope,
  setMaxScope,
  addLog
}: GeoSearchControllerProps) {
  const [loadingGps, setLoadingGps] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Trigger geolocation fetching
  const triggerGpsLookup = () => {
    if (!navigator.geolocation) {
      addLog("[GEOLOCATION] Geolocation API not supported by browser. Falling back to default relay.", "warn");
      return;
    }

    setLoadingGps(true);
    addLog("[GEOLOCATION] Initializing satellite signal geolocation query...", "info");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        // Find the closest GEO_HUB based on coordinates
        let closestHub = GEO_HUBS[0];
        let minDistance = parseFloat('Infinity');

        const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const R = 6371;
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };

        GEO_HUBS.forEach((hub) => {
          if (hub.isSpace) return; // skip space nodes for Earth proximity
          const dist = calculateDistance(latitude, longitude, hub.lat, hub.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestHub = hub;
          }
        });

        setUserHub({
          ...closestHub,
          city: "Dispositivo Local",
          state: "GPS Resolvido",
          lat: latitude,
          lng: longitude
        });

        addLog(`[GEOLOCATION] Lat/Lng resolved: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. Proximal Gateway: ${closestHub.city}`, "success");
        setLoadingGps(false);
      },
      (error) => {
        console.error(error);
        addLog(`[GEOLOCATION] Signal lookup blocked: ${error.message}. Resolving from global fallback node [São Paulo]`, "warn");
        setLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSelectPresetHub = (hub: GeoHub) => {
    setUserHub(hub);
    setUserCoords({ lat: hub.lat, lng: hub.lng });
    addLog(`[GEOLOCATION] Manual coordinate override: ${hub.name} (${hub.lat.toFixed(4)}, ${hub.lng.toFixed(4)})`, "info");
    setShowPresets(false);
  };

  const scopes: { id: typeof maxScope; label: string; minPing: string; desc: string }[] = [
    { id: 'cidade', label: '1. CIDADE (Local)', minPing: '3-15ms', desc: 'Prioriza sinal imediato da cidade local' },
    { id: 'estado', label: '2. ESTADO (Região)', minPing: '15-35ms', desc: 'Estende para relays regionais do mesmo estado' },
    { id: 'pais', label: '3. PAÍS (Nacional)', minPing: '35-65ms', desc: 'Varre toda a rede de tráfego nacional' },
    { id: 'continente', label: '4. CONTINENTE (Trans-ocean)', minPing: '65-120ms', desc: 'Varre estações no mesmo continente lógico' },
    { id: 'hemisferio', label: '5. HEMISFÉRIO', minPing: '110-180ms', desc: 'Busca distribuída em todo o hemisfério' },
    { id: 'planeta', label: '6. PLANETA TERRA', minPing: '160-350ms', desc: 'Desbloqueia ping intercontinental global' },
    { id: 'espaco', label: '7. ESTAÇÕES ESPACIAIS', minPing: '350-1200ms', desc: 'Habilita datacenters orbitais futuros (Satélite, Lua, Marte)' }
  ];

  return (
    <div className="bento-card p-5 bg-black/60 border border-white/5 hover:border-brand-green/20 transition-all font-mono rounded-2xl relative overflow-hidden group">
      {/* Dynamic ambient pulse indicators */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_100%_0,rgba(0,255,100,0.03),transparent)] pointer-events-none" />
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-all ${isGeoLocked ? 'bg-brand-green/10 border-brand-green/40 text-brand-green animate-pulse' : 'bg-white/5 border-white/10 text-white/40'}`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-white uppercase tracking-widest">SISTEMA DE BUSCA GEORREFERENCIADO V4</h3>
              <span className={`text-[7px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest leading-none ${isGeoLocked ? 'bg-brand-green/25 text-brand-green border border-brand-green/45' : 'bg-white/5 text-white/30 border border-white/10'}`}>
                {isGeoLocked ? 'TRAVADO (CASCADE ON)' : 'REDUNDÂNCIA GLOBAL'}
              </span>
            </div>
            <p className="text-[9px] text-white/50 mt-0.5 uppercase tracking-wider">
              Prioridade Inteligente por Cascata Local: Menor Ping, Conteúdo Local e Resiliência Física.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={() => {
              const nextState = !isGeoLocked;
              setIsGeoLocked(nextState);
              addLog(nextState 
                ? "[GEOLOCATION] Georeference lock active! Cascading crawl algorithm enabled." 
                : "[GEOLOCATION] Redundancy lock disabled. Reverting search fallback to direct universal index.", 
                nextState ? "success" : "warn"
              );
            }}
            id="toggle-geolock-btn"
            className={`flex-1 md:flex-none px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer select-none text-center ${
              isGeoLocked 
                ? 'bg-brand-green/20 text-brand-green border-brand-green/50 shadow-[0_0_15px_rgba(34,197,94,0.15)] hover:bg-brand-green/30' 
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            {isGeoLocked ? 'Desativar Filtro Regional' : 'Ativar Filtro Regional'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 relative z-10">
        {/* Left Side: Center Anchor Configuration */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-[8px] text-brand-cyan uppercase tracking-widest font-black block">ANCDOR GEOGRÁFICO DE CONTROLE (Sua Localização)</span>
            
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-white/80 font-bold uppercase truncate">
                  {userHub.city ? `${userHub.city}, ${userHub.country}` : 'Localização Não Definida'}
                </div>
                <div className="text-[9px] text-brand-green font-mono uppercase bg-brand-green/10 border border-brand-green/25 px-1.5 py-0.5 rounded leading-none">
                  {userHub.continent}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[9px] text-white/40 font-mono">
                <div>LATITUDO: <span className="text-white font-bold">{userCoords.lat.toFixed(6)}</span></div>
                <div>LONGITUDO: <span className="text-white font-bold">{userCoords.lng.toFixed(6)}</span></div>
                <div>ESTADO: <span className="text-white font-bold">{userHub.state}</span></div>
                <div>HEMISFÉRIO: <span className="text-white font-bold">{userHub.hemisphere}</span></div>
              </div>

              {userHub.isSpace && (
                <div className="text-[8px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded text-center animate-pulse tracking-widest font-bold uppercase">
                  ⚠ ANCORADO EM ÓRBITA COMERCIAL EXTRATERRESTRE
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={triggerGpsLookup}
              disabled={loadingGps}
              id="gps-lock-btn"
              className="flex-1 px-3 py-2 border border-brand-cyan/20 hover:border-brand-cyan/50 text-brand-cyan hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-brand-cyan/5 hover:bg-brand-cyan/10 flex items-center justify-center gap-1.5"
            >
              {loadingGps ? <RefreshCw className="w-3 h-3 animate-spin text-brand-cyan" /> : <Compass className="w-3 h-3" />}
              {loadingGps ? 'Buscando...' : 'Obter via GPS'}
            </button>
            
            <div className="relative flex-1">
              <button
                onClick={() => setShowPresets(!showPresets)}
                id="preset-hubs-btn"
                className="w-full px-3 py-2 border border-white/10 hover:border-white/30 text-white/60 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all bg-white/5 flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3 h-3" />
                Alterar Âncora
              </button>
              
              <AnimatePresence>
                {showPresets && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute bottom-full left-0 right-0 mb-2 max-h-56 overflow-y-auto bg-[#0a0d11] border border-white/10 rounded-2xl p-1.5 z-40 shadow-2xl custom-scrollbar"
                  >
                    <div className="text-[7px] text-white/30 uppercase tracking-widest px-2.5 py-1 font-bold border-b border-white/5 mb-1 select-none">TERRESTRE / ORBITAL HUBS</div>
                    {GEO_HUBS.map((hub) => (
                      <button
                        key={hub.name}
                        onClick={() => handleSelectPresetHub(hub)}
                        className={`w-full text-left px-2.5 py-2 text-[9px] rounded-lg transition-all hover:bg-white/5 flex items-center justify-between ${userHub.name === hub.name ? 'text-brand-green font-bold bg-brand-green/5' : 'text-white/60 hover:text-white'}`}
                      >
                        <span className="truncate mr-2">{hub.name}</span>
                        {hub.isSpace ? (
                          <Orbit className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                        ) : (
                          <span className="text-[7px] text-white/30 scale-90">{hub.continent.split(' ')[0]}</span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Side: Cascading Target Radar & Constraint Scope Selection */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-brand-green uppercase tracking-widest font-black block">PROFUNDIDADE DE CASCA (Máximo Nível Permitido)</span>
              {isGeoLocked && (
                <span className="text-[8px] text-brand-cyan uppercase tracking-widest font-black font-mono">
                  TRAVADO EM: {scopes.findIndex(s => s.id === maxScope) + 1} / 7
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                {scopes.map((scope) => {
                  const isActive = isGeoLocked;
                  const idx = scopes.findIndex(s => s.id === maxScope);
                  const thisIdx = scopes.findIndex(s => s.id === scope.id);
                  const isWithinRange = thisIdx <= idx;
                  const isSelected = maxScope === scope.id;

                  return (
                    <button
                      key={scope.id}
                      onClick={() => {
                        setMaxScope(scope.id);
                        addLog(`[GEOLOCATION] Georeference search boundary updated to: ${scope.label}`, "info");
                      }}
                      className={`w-full text-left p-2 rounded-xl border text-[9px] transition-all flex items-center justify-between group/scope cursor-pointer ${
                        isSelected && isActive
                          ? 'bg-brand-green/10 border-brand-green/50 text-brand-green font-bold'
                          : isWithinRange && isActive
                          ? 'bg-brand-green/[0.02] border-brand-green/20 text-white/80 hover:border-brand-green/30'
                          : 'bg-white/[0.01] border-white/5 text-white/30 hover:border-white/10 hover:text-white/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-1 h-3 rounded-full ${isWithinRange && isActive ? 'bg-brand-green shadow-[0_0_5px_rgba(0,255,100,0.4)]' : 'bg-white/10 group-hover/scope:bg-white/20'}`} />
                        <span className="truncate">{scope.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {scope.id === 'espaco' && <Orbit className="w-2.5 h-2.5 text-purple-400" />}
                        <span className={`text-[8px] font-mono ${isWithinRange && isActive ? 'text-brand-cyan' : 'text-white/20'}`}>{scope.minPing}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Schematic Ring Visualizer */}
              <div className="rounded-2xl border border-white/5 bg-black/40 flex items-center justify-center p-4 min-h-[160px] relative overflow-hidden">
                {/* Simulated Georef Lock Targets Radar */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                  <div className={`w-32 h-32 rounded-full border border-dashed transition-all ${isGeoLocked ? 'border-brand-green animate-[spin_40s_linear_infinite]' : 'border-white/5'}`} />
                  <div className={`absolute w-24 h-24 rounded-full border border-dashed transition-all ${isGeoLocked ? 'border-brand-cyan animate-[spin_20s_linear_infinite_reverse]' : 'border-white/5'}`} />
                </div>
                
                <div className="flex flex-col items-center justify-center text-center space-y-2.5 relative z-10">
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isGeoLocked ? 'bg-brand-green/15 border-brand-green/45 text-brand-green animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-white/5 border-white/10 text-white/30'}`}>
                      <Wifi className="w-6 h-6" />
                    </div>
                    {isGeoLocked && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-green rounded-full border-2 border-black animate-ping" />
                    )}
                  </div>
                  
                  <div className="space-y-0.5">
                    <span className="text-[8px] tracking-[0.2em] font-black uppercase text-brand-cyan block">CONCENTRIC DISPATCH</span>
                    <span className="text-[10px] text-white/70 block uppercase">
                      {isGeoLocked 
                        ? `Cascade ativada de Cidade a ${scopes.find(s => s.id === maxScope)?.id.toUpperCase()}`
                        : 'Sinal global irrestrito (Todas as Regiões)'}
                    </span>
                    <span className="text-[8px] text-white/40 block leading-tight font-mono">
                      {isGeoLocked 
                        ? 'Prioriza Nodes locais eliminando congestionamento de rotas e jitter.'
                        : 'Recepção de alta sensibilidade com dispersão de sinal internacional.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
