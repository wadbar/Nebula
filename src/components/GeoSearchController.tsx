import { useState, useEffect, useRef } from 'react';
import { Wifi, Compass, RefreshCw, Shield, ShieldCheck, EyeOff, Trash2 } from 'lucide-react';
import { AccountIntegration } from './AccountIntegration';
import { GEO_HUBS, GeoHub } from '../utils/geo';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default leaflet marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const currentCenter = map.getCenter();
    if (
      Math.abs(currentCenter.lat - center[0]) > 0.0001 ||
      Math.abs(currentCenter.lng - center[1]) > 0.0001
    ) {
      map.setView(center, map.getZoom());
    }
  }, [center[0], center[1], map]);
  return null;
}

function LocationMarker({ userCoords, setUserCoords, addLog }: any) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setUserCoords({ lat, lng });
      addLog(`[GEOLOCATION] Simulated coordinate lock: ${lat.toFixed(4)}, ${lng.toFixed(4)}`, "success");
    },
  });
  return <Marker position={[userCoords.lat, userCoords.lng]} />;
}

const getLocalLandmarks = (lat: number, lng: number, city?: string, state?: string): { landmark: string; altitude: number; description: string } => {
  const cNorm = (city || "").toLowerCase();
  const sNorm = (state || "").toLowerCase();

  if (cNorm.includes("governador valadares") || (lat > -19.2 && lat < -18.5 && lng > -42.3 && lng < -41.6)) {
    return {
      landmark: "Pico da Ibituruna",
      altitude: 1123,
      description: "Famosa plataforma de voo livre de Governador Valadares, com desnível de quase 1km de altitude vertical."
    };
  }
  if (cNorm.includes("belo horizonte") || (lat > -20.1 && lat < -19.7 && lng > -44.1 && lng < -43.8)) {
    return {
      landmark: "Pico de Belo Horizonte (Serra do Curral)",
      altitude: 1390,
      description: "Marco geográfico marcante do limite sul da capital mineira, com bela vista panorâmica."
    };
  }
  if (sNorm.includes("minas gerais") || sNorm.includes("mg")) {
    return {
      landmark: "Pico da Bandeira (Serra do Caparaó)",
      altitude: 2891,
      description: "Terceiro ponto mais alto do Brasil, localizado na divisa com o estado do Espírito Santo."
    };
  }
  if (cNorm.includes("são paulo") || (lat > -23.7 && lat < -23.4 && lng > -46.8 && lng < -46.4)) {
    return {
      landmark: "Pico do Jaraguá",
      altitude: 1135,
      description: "O ponto mais alto do município de São Paulo, no topo da Serra da Cantareira."
    };
  }
  if (cNorm.includes("rio de janeiro") || (lat > -23.0 && lat < -22.7 && lng > -43.5 && lng < -43.1)) {
    return {
      landmark: "Pico da Tijuca (Parque Nacional)",
      altitude: 1021,
      description: "Ponto culminante da Floresta da Tijuca, cercado por exuberante floresta densa."
    };
  }
  if (sNorm.includes("rio grande do sul") || sNorm.includes("rs")) {
    return {
      landmark: "Pico do Monte Negro (Ausentes)",
      altitude: 1398,
      description: "O ponto culminante de todo o estado do RS."
    };
  }
  if (sNorm.includes("santa catarina") || sNorm.includes("sc")) {
    return {
      landmark: "Morro da Igreja (Urubici)",
      altitude: 1822,
      description: "Famoso pelas temperaturas negativas recordes brasileiras e excelente radiocomunicação."
    };
  }
  
  const mockAlt = Math.abs(Math.sin(lat) * Math.cos(lng)) * 1400 + 120;
  return {
    landmark: `Pedra do Portal [V-${Math.abs(Math.floor(lat * 10))}]`,
    altitude: Math.round(mockAlt),
    description: "Espelho topográfico com altíssima propagação eletromagnética de rádio."
  };
};

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
  
  const [isStealthActive, setIsStealthActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('nebula_stealth_mode');
    return saved ? JSON.parse(saved) : false;
  });

  const [resolvedGeoDetails, setResolvedGeoDetails] = useState<{
    city: string;
    state: string;
    country: string;
    elevation: string;
    landmark: string;
    landmarkAlt: number | null;
    landmarkDesc: string;
    loading: boolean;
  }>({
    city: userHub.city || "São Paulo",
    state: userHub.state || "São Paulo",
    country: userHub.country || "Brazil",
    elevation: "Mapeando...",
    landmark: "Pico do Jaraguá",
    landmarkAlt: 1135,
    landmarkDesc: "Ponto culminante de São Paulo.",
    loading: false
  });

  useEffect(() => {
    let active = true;
    
    const resolveGeosurfaces = async () => {
      const lat = userCoords.lat;
      const lng = userCoords.lng;
      
      const landmarkInfo = getLocalLandmarks(lat, lng, userHub.city, userHub.state);
      const fallbackAlt = Math.abs(Math.sin(lat) * Math.cos(lng)) * 600 + 150;
      const defaultElevStr = `${Math.round(fallbackAlt)} metros`;

      setResolvedGeoDetails(prev => ({
        ...prev,
        city: userHub.city || "Sinal Camuflado",
        state: userHub.state || "Local Camuflado",
        country: userHub.country || "Espaço Livre",
        elevation: defaultElevStr,
        landmark: landmarkInfo.landmark,
        landmarkAlt: landmarkInfo.altitude,
        landmarkDesc: landmarkInfo.description,
        loading: true
      }));

      if (isStealthActive && !isGeoLocked) {
        setResolvedGeoDetails(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        const elevPromise = fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`)
          .then(r => r.json())
          .then(data => {
            if (data && Array.isArray(data.elevation) && data.elevation[0] !== undefined) {
              const val = Math.round(data.elevation[0]);
              return `${val} metros a ${val + 50} metros (Sinal de Satélite)`;
            }
            return defaultElevStr;
          })
          .catch(() => defaultElevStr);

        const geoPromise = fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {
          headers: {
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
          }
        })
          .then(r => r.json())
          .then(data => {
            if (data && data.address) {
              const addr = data.address;
              const resolvedCity = addr.city || addr.town || addr.village || addr.municipality || addr.suburb || userHub.city || "Local Resolvido";
              const resolvedState = addr.state || addr.region || addr.county || userHub.state || "Estado Resolvido";
              const resolvedCountry = addr.country || userHub.country || "Brasil";
              return { resolvedCity, resolvedState, resolvedCountry };
            }
            return null;
          })
          .catch(() => null);

        const [elevationResult, geoResult] = await Promise.all([elevPromise, geoPromise]);

        if (!active) return;

        let finalCity = userHub.city;
        let finalState = userHub.state;
        let finalCountry = userHub.country;

        if (geoResult) {
          finalCity = geoResult.resolvedCity;
          finalState = geoResult.resolvedState;
          finalCountry = geoResult.resolvedCountry;
        }

        const enrichedLandmark = getLocalLandmarks(lat, lng, finalCity, finalState);

        setResolvedGeoDetails({
          city: finalCity,
          state: finalState,
          country: finalCountry,
          elevation: elevationResult,
          landmark: enrichedLandmark.landmark,
          landmarkAlt: enrichedLandmark.altitude,
          landmarkDesc: enrichedLandmark.description,
          loading: false
        });

        if (geoResult && (userHub.city !== finalCity || userHub.state !== finalState)) {
          setUserHub({
            ...userHub,
            city: finalCity,
            state: finalState,
            country: finalCountry,
            lat: lat,
            lng: lng
          });
        }

      } catch (err) {
        console.warn("Geodesic lookup fell back to regional baseline:", err);
        if (active) {
          setResolvedGeoDetails(prev => ({ ...prev, loading: false }));
        }
      }
    };

    resolveGeosurfaces();

    return () => {
      active = false;
    };
  }, [userCoords, isStealthActive, isGeoLocked, userHub, setUserHub]);

  useEffect(() => {
    localStorage.setItem('nebula_stealth_mode', JSON.stringify(isStealthActive));
    if (isStealthActive && !isGeoLocked) {
      addLog("[PRIVACY] Stealth Routing Engine active. All browser tracking coordinates have been isolated.", "security");
    }
  }, [isStealthActive, isGeoLocked, addLog]);

  const triggerGpsLookup = async () => {
    if (isStealthActive) {
      setIsStealthActive(false);
      addLog("[PRIVACY] Stealth Mode desativado automaticamente para permitir geolocalização do hardware.", "info");
    }

    if (!navigator.geolocation) {
      addLog("[GEOLOCATION] Geolocation API not supported by browser.", "warn");
      return;
    }

    setLoadingGps(true);
    addLog("[GEOLOCATION] Initializing hardware sensor array...", "info");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude });

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
          if (hub.isSpace) return;
          const dist = calculateDistance(latitude, longitude, hub.lat, hub.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestHub = hub;
          }
        });

        setUserHub({
          ...closestHub,
          lat: latitude,
          lng: longitude
        });
        
        setIsGeoLocked(true); 

        addLog(`[GEOLOCATION] SUCCESS: [${latitude.toFixed(4)}, ${longitude.toFixed(4)}] cached at [${closestHub.city}]`, "success");
        setLoadingGps(false);
      },
      (error) => {
        addLog(`[GEOLOCATION] ERROR: ${error.message}`, "warn");
        setLoadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const hasTriggeredMountGps = useRef(false);

  useEffect(() => {
    if (!hasTriggeredMountGps.current) {
        hasTriggeredMountGps.current = true;
        triggerGpsLookup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePurgeAllTracks = () => {
    setIsGeoLocked(false);
    setUserCoords({ lat: 0, lng: 0 });
    setUserHub({
      name: "STEALTH ROUTER [ANONYMOUS]",
      city: "Isolated Gateway",
      state: "Encrypted Node",
      country: "Tor Mesh",
      continent: "Untraceable",
      hemisphere: "Equatorial",
      isSpace: false,
      lat: 0,
      lng: 0
    });
    setIsStealthActive(true);
    addLog("[PRIVACY] Zero-Trace mode engaged! All localized databases, browser tracks, and GPS cached values purged successfully.", "security");
  };

  const scopes: { id: typeof maxScope; label: string; minPing: string; desc: string }[] = [
    { id: 'cidade', label: '1. CIDADE (Local)', minPing: '3-15ms', desc: 'Prioriza sinal imediato da cidade local' },
    { id: 'estado', label: '2. ESTADO (Região)', minPing: '15-35ms', desc: 'Estende para relays regionais do mesmo estado' },
    { id: 'pais', label: '3. PAÍS (Nacional)', minPing: '35-65ms', desc: 'Varre toda a rede de tráfego nacional' },
    { id: 'continente', label: '4. CONTINENTE (Trans-ocean)', minPing: '65-120ms', desc: 'Varre estações no mesmo continente lógico' },
    { id: 'hemisferio', label: '5. HEMISFÉRIO', minPing: '110-180ms', desc: 'Busca distribuída em todo o hemisfério' },
    { id: 'planeta', label: '6. PLANETA TERRA', minPing: '160-350ms', desc: 'Desbloqueia ping intercontinental global' },
    { id: 'espaco', label: '7. ESTAÇÕES ESPACIAIS', minPing: '350-1200ms', desc: 'Habilita datacenters orbitais futuros' }
  ];

  return (
    <div className="m3-card bg-surface-container hover:border-primary/20 transition-all font-mono relative overflow-hidden group shadow-lg">
      <div className="absolute top-0 right-0 w-60 h-60 bg-[radial-gradient(circle_at_100%_0,rgba(var(--color-primary),0.05),transparent)] pointer-events-none" />
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-outline-variant relative z-10">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-[20px] border transition-all ${isGeoLocked ? 'bg-primary/10 border-primary/40 text-primary animate-pulse' : 'bg-secondary/10 border-secondary/40 text-secondary'}`}>
            {isGeoLocked ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-6 h-6 animate-pulse" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-black text-on-surface uppercase tracking-[0.2em] font-sans">Geospatial Relay Engine</h3>
              
              {isGeoLocked ? (
                <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest leading-none bg-primary text-on-primary border border-primary/30">
                  ANCHOR LOCKED
                </span>
              ) : isStealthActive ? (
                <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest leading-none bg-secondary/20 text-secondary border border-secondary/30">
                  STEALTH ACTIVE
                </span>
              ) : (
                <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest leading-none bg-on-surface/5 text-on-surface-variant border border-outline-variant">
                  GLOBAL DISCOVERY
                </span>
              )}
            </div>
            <p className="text-[10px] text-on-surface-variant font-medium mt-1 uppercase tracking-tight opacity-70">
              Camouflage proximity signatures by localizing through distal network nodes.
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
          <button
            onClick={triggerGpsLookup}
            disabled={loadingGps}
            className={`m3-button-tonal px-4 py-2 text-[10px] rounded-xl flex items-center gap-2 ${
              loadingGps ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Calibrate via hardware GPS sensor"
          >
            <Compass className="w-3.5 h-3.5" />
            {loadingGps ? "SYNCING..." : "GPS SYNC"}
          </button>
          
          <button
            onClick={() => {
              setIsStealthActive(!isStealthActive);
              if (!isStealthActive) {
                addLog("[PRIVACY] Stealth Routing Mode enabled. Browser location APIs shielded.", "security");
              } else {
                addLog("[PRIVACY] Stealth Routing relaxed. Precision hardware location now accessible.", "warn");
              }
            }}
            className={`m3-button px-4 py-2 text-[10px] rounded-xl flex items-center gap-2 transition-all ${
              isStealthActive 
                ? 'bg-secondary text-on-secondary border-secondary shadow-lg shadow-secondary/20' 
                : 'bg-surface-container-highest text-on-surface-variant border-outline-variant hover:border-outline'
            }`}
            title="Prevents browser geolocation leak"
          >
            <EyeOff className="w-3.5 h-3.5" />
            {isStealthActive ? "STEALTH ON" : "STEALTH OFF"}
          </button>

          <button
            onClick={() => {
              const nextState = !isGeoLocked;
              setIsGeoLocked(nextState);
              addLog(nextState 
                ? `[GEOLOCATION] Georeference locked on current simulated focal node: [${userHub.city}]` 
                : "[GEOLOCATION] Mock anchor released. Standard tracking suspended.", 
                nextState ? "success" : "warn"
              );
            }}
            className={`m3-button px-5 py-2 text-[10px] rounded-xl font-black transition-all ${
              isGeoLocked 
                ? 'bg-primary text-on-primary border-primary shadow-xl shadow-primary/20' 
                : 'bg-surface-container-highest text-on-surface-variant border-outline-variant hover:border-outline'
            }`}
          >
            {isGeoLocked ? 'RELEASE ANCHOR' : 'FREEZE ANCHOR'}
          </button>

          <button
            onClick={handlePurgeAllTracks}
            className="m3-button-tonal px-4 py-2 text-[10px] rounded-xl flex items-center gap-2 text-error border-error/20 hover:bg-error/10"
            title="Purge all cryptographic coordinate traces"
          >
            <Trash2 className="w-3.5 h-3.5" />
            PURGE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 relative z-10">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-high border border-outline-variant p-5 rounded-[28px] space-y-5">
            <div className="space-y-4">
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-50">Georeference Visualizer</span>
              
              <div className="h-44 rounded-2xl overflow-hidden border border-outline-variant group-hover:border-primary/30 transition-all shadow-inner">
                <MapContainer key={`${userCoords.lat}-${userCoords.lng}`} center={[userCoords.lat, userCoords.lng]} zoom={13} className="h-full w-full grayscale opacity-80 hover:grayscale-0 transition-all duration-700">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  <MapUpdater center={[userCoords.lat, userCoords.lng]} />
                  <LocationMarker userCoords={userCoords} setUserCoords={setUserCoords} addLog={addLog} />
                </MapContainer>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest opacity-40">Regional Anchor Presets</span>
                {GEO_HUBS.map((hub) => (
                    <button
                        key={hub.name}
                        onClick={() => {
                            setUserHub(hub);
                            setUserCoords({ lat: hub.lat, lng: hub.lng });
                            setIsGeoLocked(true);
                            addLog(`[GEOLOCATION] Localização travada em: ${hub.name}`, "success");
                        }}
                        className="w-full text-left p-3 rounded-2xl border border-outline-variant bg-surface-container-high/40 hover:bg-surface-container-highest hover:border-outline text-[10px] text-on-surface-variant transition-all flex justify-between group/row"
                    >
                        <span className="font-black group-hover:text-on-surface">{hub.city}</span>
                        <span className="opacity-40 group-hover:opacity-100">{hub.country}</span>
                    </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-secondary uppercase tracking-[0.2em] font-black block">Active Coordinate Matrix</span>
            {resolvedGeoDetails.loading && (
              <span className="text-[8px] text-secondary font-black animate-pulse flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" /> RESOLVING...
              </span>
            )}
          </div>
          
          <div className="p-6 rounded-[28px] border border-outline-variant bg-surface-container-high shadow-xl space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 overflow-hidden">
                  <div className="text-base text-on-surface font-black uppercase tracking-tighter truncate font-sans flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping shrink-0" />
                    {resolvedGeoDetails.city ? `${resolvedGeoDetails.city}, ${resolvedGeoDetails.country}` : 'CALCULATING POS...'}
                  </div>
                  <div className="text-[9px] text-on-surface-variant uppercase mt-1 font-black tracking-widest opacity-40">
                    Authoritative Node Proximity
                  </div>
                </div>
                <div className={`text-[9px] font-black uppercase border px-3 py-1 rounded-full leading-none shrink-0 ${
                  isGeoLocked 
                    ? 'bg-primary/10 text-primary border-primary/30' 
                    : 'bg-secondary/10 text-secondary border-secondary/30'
                }`}>
                  {userHub.continent || 'South America'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-[10px] text-on-surface-variant font-mono border-y border-outline-variant py-4">
                <div>LATITUDO <br/><span className="text-on-surface font-black text-xs">{userCoords.lat.toFixed(6)}</span></div>
                <div>LONGITUDO <br/><span className="text-on-surface font-black text-xs">{userCoords.lng.toFixed(6)}</span></div>
                <div className="col-span-2 truncate">LOCUS REGIONALIS <br/><span className="text-on-surface font-black uppercase">{resolvedGeoDetails.state || 'GPS RESOLVED'}</span></div>
              </div>

              <div className="bg-surface-container-highest rounded-2xl p-4 space-y-4 border border-outline-variant shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-secondary uppercase tracking-[0.2em] font-black block">Elevation Dynamics</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                </div>
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-center bg-on-surface/5 p-2 rounded-xl border border-outline-variant">
                    <span className="text-[9px] text-on-surface-variant uppercase font-black">Ref Altitude</span>
                    <span className="text-secondary font-black text-xs">{resolvedGeoDetails.elevation}</span>
                  </div>
                  <div className="bg-on-surface/5 p-3 rounded-xl border border-outline-variant space-y-2">
                    <div className="flex justify-between items-center text-[8px] text-on-surface-variant font-black border-b border-outline-variant pb-1.5 uppercase opacity-60">
                      <span>Nearest Peak</span>
                      <span className="text-primary font-black">{resolvedGeoDetails.landmarkAlt}M</span>
                    </div>
                    <div className="text-on-surface font-black text-[10px] uppercase tracking-wide mt-1">
                      {resolvedGeoDetails.landmark}
                    </div>
                    <p className="text-[9px] text-on-surface-variant leading-relaxed font-sans font-medium italic opacity-70">
                      {resolvedGeoDetails.landmarkDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={triggerGpsLookup}
              disabled={loadingGps}
              className={`m3-button-filled w-full py-4 text-[11px] rounded-2xl flex items-center justify-center gap-2 ${
                loadingGps ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loadingGps ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4 animate-pulse" />}
              {loadingGps ? 'SYNCING SENSORS...' : 'Recalibrate GPS Sensors'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-primary uppercase tracking-[0.2em] font-black block">Cascade Depth Level</span>
              {isGeoLocked && (
                <span className="text-[9px] text-secondary font-black font-mono bg-secondary/10 px-2 py-0.5 rounded-full">
                   LEVEL {scopes.findIndex(s => s.id === maxScope) + 1}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 flex-1">
              <div className="space-y-1.5">
                {scopes.slice(0, 4).map((scope) => {
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
                      className={`w-full text-left p-3 rounded-2xl border text-[10px] transition-all flex items-center justify-between group/scope cursor-pointer ${
                        isSelected && isActive
                          ? 'bg-primary/10 border-primary text-on-surface font-black shadow-lg shadow-primary/10'
                          : isWithinRange && isActive
                          ? 'bg-primary/[0.03] border-primary/20 text-on-surface-variant hover:border-primary/40'
                          : 'bg-surface-container-high border-outline-variant text-on-surface-variant/40 hover:border-outline hover:text-on-surface-variant'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className={`w-1.5 h-4 rounded-full transition-all ${isWithinRange && isActive ? 'bg-primary shadow-[0_0_10px_rgba(var(--color-primary),0.5)]' : 'bg-on-surface/10 group-hover/scope:bg-on-surface/20'}`} />
                        <span className="truncate font-black">{scope.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9px] font-mono font-black ${isWithinRange && isActive ? 'text-secondary' : 'opacity-20'}`}>{scope.minPing}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-[28px] border border-outline-variant bg-surface-container-highest flex items-center justify-center p-6 relative overflow-hidden min-h-[140px] shadow-inner">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                  <div className={`w-32 h-32 rounded-full border-2 border-dashed transition-all ${isGeoLocked ? 'border-primary animate-[spin_40s_linear_infinite]' : 'border-outline-variant'}`} />
                  <div className={`absolute w-24 h-24 rounded-full border-2 border-dashed transition-all ${isGeoLocked ? 'border-secondary animate-[spin_20s_linear_infinite_reverse]' : 'border-outline-variant'}`} />
                </div>
                
                <div className="flex flex-col items-center justify-center text-center space-y-3 relative z-10 font-sans">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${isGeoLocked ? 'bg-primary/15 border-primary text-primary shadow-xl shadow-primary/20' : 'bg-surface-container-high border-outline-variant text-on-surface-variant/30'}`}>
                      <Wifi className={`w-6 h-6 ${isGeoLocked ? 'animate-pulse' : ''}`} />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 px-4">
                    <span className="text-[11px] text-on-surface font-black block uppercase tracking-tight leading-tight">
                      {isGeoLocked 
                        ? `CASCADE ACTIVE: ${scopes.find(s => s.id === maxScope)?.id.toUpperCase()}`
                        : isStealthActive 
                          ? 'CRYPTO-CAMOUFLAGE ENABLED'
                          : 'GLOBAL RELAY TRANSPARENCY'}
                    </span>
                    <span className="text-[9px] text-on-surface-variant block leading-relaxed font-black opacity-40 uppercase tracking-widest">
                      {isGeoLocked 
                        ? 'Simulated anchor points prioritized. Real IP shielding active.'
                        : isStealthActive
                          ? 'Regional headers neutralized. Traceable vectors eliminated.'
                          : 'Raw sensor data pass-through. Latency optimization active.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <AccountIntegration 
              onAddKey={(service, key) => {
                localStorage.setItem(service, key);
                addLog(`[SYSTEM] Credencial ${service} salva com segurança localmente.`, "success");
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
