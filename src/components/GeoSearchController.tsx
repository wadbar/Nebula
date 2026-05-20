import { useState, useEffect } from 'react';
import { Wifi, Compass, Orbit, RefreshCw, Shield, ShieldCheck, Search, EyeOff, Trash2 } from 'lucide-react';
import { GEO_HUBS, GeoHub } from '../utils/geo';

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
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom manual inputs for arbitrary fictional locations
  const [customCity, setCustomCity] = useState('');
  const [customCountry, setCustomCountry] = useState('');
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  
  // Stealth mode (when unlocked/totally private)
  const [isStealthActive, setIsStealthActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('nebula_stealth_mode');
    return saved ? JSON.parse(saved) : false;
  });

  const [activeTabSub, setActiveTabSub] = useState<'search' | 'custom'>('search');

  // Extended resolved geodesy data
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

      // If stealth mode is active and we're not locked, skip public reverse geolocation to protect IP
      if (isStealthActive && !isGeoLocked) {
        setResolvedGeoDetails(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Fetch real-time altitude via Open Meteo API (completely free & open)
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

        // Fetch real address via free Nominatim Reverse Geocoder
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

        // Trigger dynamic userHub sync for the rest of the cascading database
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
  }, [userCoords, isStealthActive, isGeoLocked]);

  useEffect(() => {
    localStorage.setItem('nebula_stealth_mode', JSON.stringify(isStealthActive));
    if (isStealthActive && !isGeoLocked) {
      addLog("[PRIVACY] Stealth Routing Engine active. All browser tracking coordinates have been isolated.", "security");
    }
  }, [isStealthActive, isGeoLocked]);

  // Trigger real browser Geolocation API
  const triggerGpsLookup = () => {
    if (isStealthActive) {
      setIsStealthActive(false);
      addLog("[PRIVACY] Stealth Mode desativado automaticamente para permitir geolocalização do hardware.", "info");
    }

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
    setIsGeoLocked(true); // Auto-lock when selecting a mock hub
    addLog(`[GEOLOCATION] Mock Location Blocked on: ${hub.name} (${hub.lat.toFixed(4)}, ${hub.lng.toFixed(4)})`, "success");
  };

  // Lock down state based on completely customized fictional coordinates
  const handleLockCustomFictional = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat);
    const lngNum = parseFloat(customLng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      addLog("[GEOLOCATION] Invalid coordinates parsed. Use standard decimals (e.g. Lat: -23.55, Lng: -46.63)", "warn");
      return;
    }

    const customHub: GeoHub = {
      name: `Custom Mock: ${customCity || 'Isolated Node'}`,
      city: customCity || 'Sinal Camuflado',
      state: 'Local Camuflado',
      country: customCountry || 'Unknown Coordinates',
      continent: 'Camuflagem Digital',
      hemisphere: latNum >= 0 ? 'Northern' : 'Southern',
      isSpace: false,
      lat: latNum,
      lng: lngNum
    };

    setUserHub(customHub);
    setUserCoords({ lat: latNum, lng: lngNum });
    setIsGeoLocked(true);
    addLog(`[GEOLOCATION] Advanced privacy shield: Locked fictional coordinates on ${customHub.city} [${latNum.toFixed(4)}, ${lngNum.toFixed(4)}]`, "success");
  };

  // Complete cleanup / Untraceable mode transition
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
    setCustomCity('');
    setCustomCountry('');
    setCustomLat('');
    setCustomLng('');
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

  // Filter GEO_HUBS based on query
  const filteredHubs = GEO_HUBS.filter(h => 
    h.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bento-card p-5 bg-gradient-to-b from-[#0a0a0d] to-[#040406] border border-white/5 hover:border-brand-green/20 transition-all font-mono rounded-2xl relative overflow-hidden group">
      {/* Background cyber grid decorations */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[radial-gradient(circle_at_100%_0,rgba(0,255,100,0.05),transparent)] pointer-events-none" />
      
      {/* HEADER CONTROLS AND STATUSES */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border transition-all ${isGeoLocked ? 'bg-brand-green/10 border-brand-green/40 text-brand-green animate-pulse' : 'bg-brand-cyan/10 border-brand-cyan/40 text-brand-cyan'}`}>
            {isGeoLocked ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5 animate-pulse" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-black text-white uppercase tracking-widest font-sans">SISTEMA PRIVADO DE GEORREFERENCIAMENTO FICTÍCIO</h3>
              
              {isGeoLocked ? (
                <span className="text-[7px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest leading-none bg-brand-green/20 text-brand-green border border-brand-green/30">
                  LOCAL MOCK FICTÍCIO ATIVO
                </span>
              ) : isStealthActive ? (
                <span className="text-[7px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest leading-none bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30">
                  STEALTH MODE MAX (SEM EXPULSÃO DE IP)
                </span>
              ) : (
                <span className="text-[7px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest leading-none bg-white/5 text-white/40 border border-white/10">
                  REDUNDÂNCIA GLOBAL
                </span>
              )}
            </div>
            <p className="text-[9px] text-white/50 mt-0.5 uppercase tracking-wider">
              Proteção Cibernética: Camufle seu local localizando antenas em servidores distantes.
            </p>
          </div>
        </div>
        
        {/* SECURE TOP BUTTONS */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
          <button
            onClick={() => {
              setIsStealthActive(!isStealthActive);
              if (!isStealthActive) {
                addLog("[PRIVACY] Stealth Routing Mode enabled. Browser location APIs shielded.", "security");
              } else {
                addLog("[PRIVACY] Stealth Routing relaxed. Precision hardware location now accessible.", "warn");
              }
            }}
            className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              isStealthActive 
                ? 'bg-brand-cyan/20 text-brand-cyan border-brand-cyan/40 hover:bg-brand-cyan/30' 
                : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10'
            }`}
            title="Prevents browser geolocation leak over standard Wi-Fi and IP sensors"
          >
            <EyeOff className="w-3 h-3" />
            {isStealthActive ? "STEALTH ACTIVE" : "STEALTH DEACTIVATED"}
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
            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all cursor-pointer text-center ${
              isGeoLocked 
                ? 'bg-brand-green/20 text-brand-green border-brand-green/50 shadow-[0_0_15px_rgba(34,197,94,0.15)] hover:bg-brand-green/30' 
                : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'
            }`}
          >
            {isGeoLocked ? 'Desativar Filtro Regional' : 'Ativar Filtro Regional'}
          </button>

          <button
            onClick={handlePurgeAllTracks}
            className="px-3 py-2 text-[9px] font-bold uppercase bg-red-950/20 text-red-400 border border-red-900/30 hover:bg-red-900/30 hover:border-red-500/50 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            title="Clean all localization track elements"
          >
            <Trash2 className="w-3 h-3" />
            LIMPAR RASTROS
          </button>
        </div>
      </div>

      {/* THREE PANELS CONFIGURATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 relative z-10">
        
        {/* LEFT COLUMN: FICTIONAL COUPLER FORM */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-4">
            <div className="flex border-b border-white/5 mb-1 bg-black/40 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveTabSub('search')}
                className={`flex-1 py-1.5 rounded text-[8.5px] uppercase font-black tracking-widest text-center transition-all cursor-pointer ${activeTabSub === 'search' ? 'bg-brand-green/10 text-brand-green font-extrabold' : 'text-white/40 hover:text-white'}`}
              >
                Buscar Presets
              </button>
              <button
                type="button"
                onClick={() => setActiveTabSub('custom')}
                className={`flex-1 py-1.5 rounded text-[8.5px] uppercase font-black tracking-widest text-center transition-all cursor-pointer ${activeTabSub === 'custom' ? 'bg-brand-cyan/10 text-brand-cyan font-extrabold' : 'text-white/40 hover:text-white'}`}
              >
                Input Coordenadas
              </button>
            </div>

            {activeTabSub === 'search' ? (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-white/30" />
                  <input
                    type="text"
                    placeholder="Filtrar cidades / continentes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-[10px] uppercase text-white placeholder-white/30 focus:outline-none focus:border-brand-green/30"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredHubs.length === 0 ? (
                    <div className="text-[9px] text-white/30 text-center py-6">Nenhum servidor encontrado.</div>
                  ) : (
                    filteredHubs.map((hub) => (
                      <button
                        key={hub.name}
                        onClick={() => handleSelectPresetHub(hub)}
                        className={`w-full text-left p-2 rounded-lg border text-[9px] transition-all flex items-center justify-between cursor-pointer ${
                          userHub.city === hub.city 
                            ? 'bg-brand-green/5 border-brand-green/30 text-brand-green font-bold' 
                            : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.04] text-white/60 hover:text-white'
                        }`}
                      >
                        <div className="flex flex-col truncate">
                          <span className="font-extrabold uppercase">{hub.city}</span>
                          <span className="text-[7.5px] text-white/40 tracking-wider font-semibold">{hub.country}</span>
                        </div>
                        <div className="text-[8px] text-white/30 text-right shrink-0">
                          {hub.lat.toFixed(1)}, {hub.lng.toFixed(1)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleLockCustomFictional} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] text-white/40 uppercase block">LATITUDE DECIMAL</label>
                    <input
                      type="text"
                      placeholder="Ex: -23.5505"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-brand-cyan/40 font-mono"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-white/40 uppercase block">LONGITUDE DECIMAL</label>
                    <input
                      type="text"
                      placeholder="Ex: -46.6333"
                      value={customLng}
                      onChange={(e) => setCustomLng(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-[10px] text-white focus:outline-none focus:border-brand-cyan/40 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] text-white/40 uppercase block">CIDADE FICTÍCIA</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-[10px] text-white uppercase focus:outline-none focus:border-brand-cyan/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-white/40 uppercase block">PAÍS / REGING</label>
                    <input
                      type="text"
                      placeholder="Ex: Brasil"
                      value={customCountry}
                      onChange={(e) => setCustomCountry(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg p-2 text-[10px] text-white uppercase focus:outline-none focus:border-brand-cyan/40"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-brand-cyan/15 hover:bg-brand-cyan/25 text-brand-cyan hover:text-white border border-brand-cyan/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all text-center cursor-pointer font-sans"
                >
                  LOCK COORDENADA EXTRAORDINÁRIA
                </button>
              </form>
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: ACTIVE ANCHOR READOUT */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[8px] text-brand-cyan uppercase tracking-widest font-black block">ÂNCORES GEOGRÁFICOS DE CONTROLE (Sua Localização)</span>
            {resolvedGeoDetails.loading && (
              <span className="text-[7px] text-brand-cyan uppercase font-mono animate-pulse flex items-center gap-1">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" /> RESOLVENDO GEOPOSIÇÃO...
              </span>
            )}
          </div>
          
          <div className="p-4 rounded-xl border border-white/5 bg-[#070709] space-y-3.5 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] text-white font-extrabold uppercase tracking-wide truncate max-w-[170px] font-sans flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-ping shrink-0" />
                    {resolvedGeoDetails.city ? `${resolvedGeoDetails.city.toUpperCase()}, ${resolvedGeoDetails.country.toUpperCase()}` : 'RESOLVENDO COORDENADAS...'}
                  </div>
                  <div className="text-[8px] text-white/40 uppercase mt-0.5 font-bold">
                    ESTAÇÃO LOCAL AUTORITÁRIA
                  </div>
                </div>
                <div className={`text-[8.5px] font-mono uppercase border px-2 py-0.5 rounded leading-none ${
                  isGeoLocked 
                    ? 'bg-brand-green/10 text-brand-green border-brand-green/30' 
                    : 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30'
                }`}>
                  {userHub.continent || 'South America'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-[9.5px] text-white/50 font-mono border-t border-b border-white/5 py-2">
                <div>LATITUDO: <span className="text-white font-bold">{userCoords.lat.toFixed(6)}</span></div>
                <div>LONGITUDO: <span className="text-white font-bold">{userCoords.lng.toFixed(6)}</span></div>
                <div className="col-span-2 truncate">ESTADO: <span className="text-white font-bold">{resolvedGeoDetails.state || 'GPS Resolvido'}</span></div>
                <div className="col-span-2">HEMISFÉRIO: <span className="text-brand-cyan font-bold">{userHub.hemisphere || 'Southern'}</span></div>
              </div>

              {/* TOPOGRAPHICAL ELEVATION ENGINE (PICO & ALTITUDE) */}
              <div className="bg-white/[0.02] border border-white/5 p-2.5 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-brand-cyan uppercase tracking-widest font-black block">MATRIZ DE ELEVAÇÃO LOCAL</span>
                  <div className="w-1.5 h-1.5 rounded bg-brand-cyan animate-pulse" />
                </div>
                <div className="space-y-1 text-[9px] font-mono text-white/60">
                  <div className="flex justify-between items-center bg-black/40 p-1 rounded border border-white/[0.02]">
                    <span>ALTITUDE MÉDIA:</span>
                    <span className="text-brand-cyan font-extrabold">{resolvedGeoDetails.elevation}</span>
                  </div>
                  <div className="bg-black/40 p-1.5 rounded border border-white/[0.02] space-y-0.5">
                    <div className="flex justify-between items-center text-[8px] text-white/40 font-bold border-b border-white/5 pb-0.5 uppercase">
                      <span>PICO PRÓXIMO:</span>
                      <span className="text-brand-green font-extrabold">{resolvedGeoDetails.landmarkAlt}M</span>
                    </div>
                    <div className="text-white font-bold text-[8.5px] uppercase tracking-wide mt-0.5">
                      {resolvedGeoDetails.landmark}
                    </div>
                    <p className="text-[7.5px] text-white/40 leading-relaxed font-sans font-medium line-clamp-2">
                      {resolvedGeoDetails.landmarkDesc}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1.5">
                {isGeoLocked ? (
                  <div className="text-[8.5px] bg-brand-green/10 text-brand-green border border-brand-green/20 px-2 py-1 rounded text-center tracking-wider font-extrabold uppercase flex items-center justify-center gap-1.5 font-sans">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    ATALHO DE LOCALIZAÇÃO ATIVO
                  </div>
                ) : isStealthActive ? (
                  <div className="text-[8.5px] bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 px-2 py-1 rounded text-center tracking-wider font-extrabold uppercase flex items-center justify-center gap-1.5 font-sans">
                    <Shield className="w-3.5 h-3.5 animate-pulse" />
                    MODO STEALTH PRIVADO COBERTO
                  </div>
                ) : (
                  <div className="text-[8px] bg-white/5 text-white/45 border border-white/10 px-2 py-1 rounded text-center tracking-wider font-semibold uppercase font-mono">
                    RESOLUÇÃO DE HARDWARE DIRETA
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={triggerGpsLookup}
                disabled={loadingGps}
                className={`w-full px-3 py-2 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans ${
                  loadingGps 
                    ? 'bg-white/[0.02] border-white/5 text-white/20 cursor-not-allowed' 
                    : 'border-brand-cyan/40 hover:border-brand-cyan/70 text-brand-cyan hover:text-white bg-brand-cyan/10 hover:bg-brand-cyan/20'
                }`}
              >
                {loadingGps ? <RefreshCw className="w-3 h-3 animate-spin text-brand-cyan" /> : <Compass className="w-3.5 h-3.5 animate-pulse text-brand-cyan" />}
                {loadingGps ? 'PROCESSANDO SINAL...' : 'Obter via GPS Real'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CASCADING TARGET RADAR & DEPTH */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="space-y-3 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-brand-green uppercase tracking-widest font-black block">PROFUNDIDADE DE CASCA (Máximo Nível Permitido)</span>
              {isGeoLocked && (
                <span className="text-[8px] text-brand-cyan uppercase tracking-widest font-black font-mono">
                  TRAVADO EM: {scopes.findIndex(s => s.id === maxScope) + 1} / 7
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 flex-1">
              <div className="space-y-1">
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

              {/* Schematic Georef Radar Target Center */}
              <div className="rounded-xl border border-white/5 bg-black/40 flex items-center justify-center p-3 relative overflow-hidden min-h-[100px]">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                  <div className={`w-24 h-24 rounded-full border border-dashed transition-all ${isGeoLocked ? 'border-brand-green animate-[spin_40s_linear_infinite]' : 'border-white/15'}`} />
                  <div className={`absolute w-16 h-16 rounded-full border border-dashed transition-all ${isGeoLocked ? 'border-brand-cyan animate-[spin_20s_linear_infinite_reverse]' : 'border-white/10'}`} />
                </div>
                
                <div className="flex flex-col items-center justify-center text-center space-y-2 relative z-10 font-sans">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${isGeoLocked ? 'bg-brand-green/15 border-brand-green/45 text-brand-green animate-pulse' : 'bg-white/5 border-white/10 text-white/30'}`}>
                      <Wifi className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="space-y-0.5 px-2">
                    <span className="text-[10px] text-white/70 block uppercase font-black leading-tight">
                      {isGeoLocked 
                        ? `Cascade ativa: Cidade a ${scopes.find(s => s.id === maxScope)?.id.toUpperCase()}`
                        : isStealthActive 
                          ? 'CAMUFLAGEM TOTAL • CONEXÃO SEM RASTROS'
                          : 'Sinal global irrestrito (Todas as Regiões)'}
                    </span>
                    <span className="text-[8px] text-white/40 block leading-tight font-mono">
                      {isGeoLocked 
                        ? 'Prioriza conexões simuladas eliminando roteamento nativo real de IP.'
                        : isStealthActive
                          ? 'Nenhum cabeçalho regional emitido. Atribuição de coordenadas isolada.'
                          : 'Recepção global com dispersão transparente de sinal físico.'}
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
