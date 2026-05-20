export interface GeoHub {
  name: string;
  city: string;
  state: string;
  country: string;
  continent: string;
  hemisphere: 'Northern' | 'Southern' | 'Eastern' | 'Western' | 'Equatorial' | 'Deep Space';
  isSpace: boolean;
  lat: number;
  lng: number;
}

export const GEO_HUBS: GeoHub[] = [
  {
    name: "INCRA Node [BRASIL-FEDERAL]",
    city: "Brasília",
    state: "Distrito Federal",
    country: "Brazil",
    continent: "South America",
    hemisphere: "Southern",
    isSpace: false,
    lat: -15.7975,
    lng: -47.8919
  },
  {
    name: "São Paulo Anchor [SA-EAST]",
    city: "São Paulo",
    state: "São Paulo",
    country: "Brazil",
    continent: "South America",
    hemisphere: "Southern",
    isSpace: false,
    lat: -23.5505,
    lng: -46.6333
  },
  {
    name: "New York Hub [US-EAST]",
    city: "New York",
    state: "New York",
    country: "United States",
    continent: "North America",
    hemisphere: "Northern",
    isSpace: false,
    lat: 40.7128,
    lng: -74.0060
  },
  {
    name: "San Francisco Node [US-WEST]",
    city: "San Francisco",
    state: "California",
    country: "United States",
    continent: "North America",
    hemisphere: "Northern",
    isSpace: false,
    lat: 37.7749,
    lng: -122.4194
  },
  {
    name: "London Relay [EU-WEST]",
    city: "London",
    state: "England",
    country: "United Kingdom",
    continent: "Europe",
    hemisphere: "Northern",
    isSpace: false,
    lat: 51.5074,
    lng: -0.1278
  },
  {
    name: "Frankfurt Core [EU-CENTRAL]",
    city: "Frankfurt",
    state: "Hesse",
    country: "Germany",
    continent: "Europe",
    hemisphere: "Northern",
    isSpace: false,
    lat: 50.1109,
    lng: 8.6821
  },
  {
    name: "Tokyo Terminal [AP-NORTHEAST]",
    city: "Tokyo",
    state: "Tokyo",
    country: "Japan",
    continent: "Asia",
    hemisphere: "Northern",
    isSpace: false,
    lat: 35.6762,
    lng: 139.6503
  },
  {
    name: "Singapore Gateway [AP-SOUTHEAST]",
    city: "Singapore",
    state: "Singapore",
    country: "Singapore",
    continent: "Asia",
    hemisphere: "Northern",
    isSpace: false,
    lat: 1.3521,
    lng: 103.8198
  },
  {
    name: "Sydney Node [AP-SOUTHEAST]",
    city: "Sydney",
    state: "New South Wales",
    country: "Australia",
    continent: "Oceania",
    hemisphere: "Southern",
    isSpace: false,
    lat: -33.8688,
    lng: 151.2093
  },
  {
    name: "Cape Town Station [AF-SOUTH]",
    city: "Cape Town",
    state: "Western Cape",
    country: "South Africa",
    continent: "Africa",
    hemisphere: "Southern",
    isSpace: false,
    lat: -33.9249,
    lng: 18.4241
  },
  {
    name: "Iceland Relay [EU-NORTH]",
    city: "Reykjavík",
    state: "Capital Region",
    country: "Iceland",
    continent: "Europe",
    hemisphere: "Northern",
    isSpace: false,
    lat: 64.1466,
    lng: -21.9426
  },
  {
    name: "Orbital Uplink Alpha [LEO-SATELLITE]",
    city: "LEO Orbit-42",
    state: "Exosphere Sat",
    country: "Orbital Space",
    continent: "Low Earth Orbit",
    hemisphere: "Equatorial",
    isSpace: true,
    lat: -0.1823,
    lng: -12.1923
  },
  {
    name: "Lunar Gateway Core [MOON-RELAY]",
    city: "Artemis Base",
    state: "Lunar Surface",
    country: "Moon Relay",
    continent: "Luna",
    hemisphere: "Deep Space",
    isSpace: true,
    lat: -28.1824,
    lng: 154.2182
  },
  {
    name: "Copernicus Space Station [MARS-EMULATOR]",
    city: "Olympus City",
    state: "Martian Basin",
    country: "Mars Relays",
    continent: "Sol-System",
    hemisphere: "Deep Space",
    isSpace: true,
    lat: -43.2983,
    lng: -125.8492
  }
];

export interface EnrichedGeographicDetails {
  hub: GeoHub;
  distanceKm: number;
  pingMs: number;
  tier: 'cidade' | 'estado' | 'pais' | 'continente' | 'hemisferio' | 'planeta' | 'espaco';
  tierLabel: string;
}

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const getDeterministicHub = (name: string, url: string): GeoHub => {
  let hash = 0;
  const combined = name + url;
  for (let i = 0; i < combined.length; i++) {
    hash = combined.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  return GEO_HUBS[hash % GEO_HUBS.length];
};

export const enrichGeographicDetails = (
  name: string,
  url: string,
  userLat: number,
  userLng: number,
  userHub?: GeoHub
): EnrichedGeographicDetails => {
  const hub = getDeterministicHub(name, url);
  
  let distanceKm = 0;
  let pingMs = 0;

  if (hub.isSpace) {
    if (hub.name.includes("LEO")) {
      distanceKm = 400 + Math.abs(userLat); // Low Earth Orbit distance
      pingMs = 120 + Math.floor(Math.random() * 20);
    } else if (hub.name.includes("MOON")) {
      distanceKm = 384400; // Earth to Moon
      pingMs = 1280 + Math.floor(Math.random() * 50); // propagation delay 1.28s
    } else {
      distanceKm = 225000000; // Earth to Mars avg
      pingMs = 5000 + Math.floor(Math.random() * 300); // mars delay
    }
  } else {
    distanceKm = calculateDistance(userLat, userLng, hub.lat, hub.lng);
    
    // Calculate adaptive ping inspired by regional cascading rules
    if (userHub && hub.city === userHub.city) {
      pingMs = 4 + Math.round(distanceKm * 0.05); // City speed
    } else if (userHub && hub.state === userHub.state) {
      pingMs = 14 + Math.round(distanceKm * 0.04); // State speed
    } else if (userHub && hub.country === userHub.country) {
      pingMs = 28 + Math.round(distanceKm * 0.03); // Country speed
    } else if (userHub && hub.continent === userHub.continent) {
      pingMs = 60 + Math.round(distanceKm * 0.02); // Continent speed
    } else if (userHub && hub.hemisphere === userHub.hemisphere) {
      pingMs = 110 + Math.round(distanceKm * 0.015); // Hemisphere speed
    } else {
      pingMs = 160 + Math.round(distanceKm * 0.012); // Planet speed
    }
  }

  // Cap minimum ping at 3ms
  pingMs = Math.max(3, pingMs);

  // Now determine the cascading tier
  let tier: EnrichedGeographicDetails['tier'] = 'planeta';
  let tierLabel = 'Global Relay';

  if (hub.isSpace) {
    tier = 'espaco';
    tierLabel = 'Deep Space Node';
  } else if (userHub) {
    if (hub.city === userHub.city) {
      tier = 'cidade';
      tierLabel = 'Cidade / Local';
    } else if (hub.state === userHub.state) {
      tier = 'estado';
      tierLabel = 'Estado / Região';
    } else if (hub.country === userHub.country) {
      tier = 'pais';
      tierLabel = 'País / Nacional';
    } else if (hub.continent === userHub.continent) {
      tier = 'continente';
      tierLabel = 'Continente';
    } else if (hub.hemisphere === userHub.hemisphere) {
      tier = 'hemisferio';
      tierLabel = 'Estação Hemisférica';
    } else {
      tier = 'planeta';
      tierLabel = 'Rede Planeta';
    }
  } else {
    // If no userHub, calculate strictly by distance bounds
    if (distanceKm < 100) {
      tier = 'cidade';
      tierLabel = 'Cidade / Local';
    } else if (distanceKm < 600) {
      tier = 'estado';
      tierLabel = 'Estado / Região';
    } else if (distanceKm < 2000) {
      tier = 'pais';
      tierLabel = 'País / Nacional';
    } else if (distanceKm < 8000) {
      tier = 'continente';
      tierLabel = 'Continente';
    } else {
      tier = 'planeta';
      tierLabel = 'Rede Planeta';
    }
  }

  return {
    hub,
    distanceKm: Math.round(distanceKm),
    pingMs,
    tier,
    tierLabel
  };
};
