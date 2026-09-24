'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Phone,
  Clock,
  Sparkles,
  Building2,
  ExternalLink,
  ChevronRight,
  Layers,
  CheckCircle2,
  Calendar,
  X,
  Edit2,
  Compass,
  LocateFixed,
  Maximize2,
  Minimize2,
  Info,
  RotateCcw
} from 'lucide-react';

export interface StudioLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  bio?: string;
  logo_url?: string;
  opening_hours?: any;
  latitude?: number;
  longitude?: number;
  artists_count?: number;
}

// Coordenadas geográficas reales (Latitud, Longitud) de ciudades españolas
const REAL_CITY_COORDINATES: Record<string, [number, number]> = {
  madrid: [40.4168, -3.7038],
  barcelona: [41.3874, 2.1686],
  valencia: [39.4699, -0.3763],
  sevilla: [37.3891, -5.9845],
  malaga: [36.7213, -4.4214],
  málaga: [36.7213, -4.4214],
  bilbao: [43.2630, -2.9350],
  zaragoza: [41.6488, -0.8891],
  alicante: [38.3452, -0.4810],
  murcia: [37.9922, -1.1307],
  granada: [37.1773, -3.5986],
  vigo: [42.2406, -8.7207],
  coruña: [43.3623, -8.4115],
  'a coruña': [43.3623, -8.4115],
  palma: [39.5696, 2.6502],
  mallorca: [39.5696, 2.6502],
  santander: [43.4623, -3.8099],
  valladolid: [41.6523, -4.7245],
  cordoba: [37.8882, -4.7794],
  córdoba: [37.8882, -4.7794],
  salamanca: [40.9701, -5.6635],
  donostia: [43.3183, -1.9812],
  'san sebastián': [43.3183, -1.9812]
};

// Capas de teselas cartográficas de producción
const TILE_LAYERS = {
  dark: {
    id: 'dark',
    name: 'Tinta Atelier (Oscuro)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  },
  streets: {
    id: 'streets',
    name: 'Callejero Detallado (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: 'abc',
    maxZoom: 19
  },
  satellite: {
    id: 'satellite',
    name: 'Satélite HD (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Earthstar Geographics',
    subdomains: 'abc',
    maxZoom: 18
  }
};

interface StudioMapViewProps {
  studios: StudioLocation[];
  onSelectStudio?: (studio: StudioLocation) => void;
  onBookAtStudio?: (studio: StudioLocation) => void;
  isOwnerView?: boolean;
  onUpdateStudioAddress?: (studioId: string, address: string, city: string) => Promise<void>;
}

export default function StudioMapView({
  studios = [],
  onSelectStudio,
  onBookAtStudio,
  isOwnerView = false,
  onUpdateStudioAddress
}: StudioMapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<'dark' | 'streets' | 'satellite'>('dark');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [activeStudioId, setActiveStudioId] = useState<string | null>(studios[0]?.id || null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Edit Studio Address Modal
  const [editingStudio, setEditingStudio] = useState<StudioLocation | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [geocodedCoord, setGeocodedCoord] = useState<[number, number] | null>(null);

  // Extraer ciudades únicas
  const cities = useMemo(() => {
    const set = new Set<string>();
    studios.forEach((s) => {
      if (s.city) set.add(s.city.trim());
    });
    return Array.from(set);
  }, [studios]);

  // Resolver coordenadas reales con hash determinista para estudios sin lat/lng
  const getStudioCoordinates = useCallback((studio: StudioLocation): [number, number] => {
    if (typeof studio.latitude === 'number' && typeof studio.longitude === 'number' && !isNaN(studio.latitude)) {
      return [studio.latitude, studio.longitude];
    }

    const cityKey = (studio.city || '').toLowerCase().trim();
    const baseCoords = REAL_CITY_COORDINATES[cityKey] || REAL_CITY_COORDINATES.madrid;

    // Dispersión sutil si hay varios estudios en la misma ciudad para evitar solapamiento exacto de pines
    let hash = 0;
    for (let i = 0; i < (studio.id || studio.name || '').length; i++) {
      hash = (hash << 5) - hash + (studio.id || studio.name).charCodeAt(i);
      hash |= 0;
    }
    const offsetLat = ((Math.abs(hash) % 100) - 50) * 0.00035;
    const offsetLng = ((Math.abs(hash * 31) % 100) - 50) * 0.00035;

    return [baseCoords[0] + offsetLat, baseCoords[1] + offsetLng];
  }, []);

  // 1. Cargar dinámicamente Leaflet CSS y JS sin problemas de SSR en Next.js
  useEffect(() => {
    let isMounted = true;

    const loadLeafletAssets = () => {
      if (!document.getElementById('leaflet-css-cdn')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-cdn';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      if ((window as any).L) {
        if (isMounted) setIsLeafletReady(true);
        return;
      }

      if (!document.getElementById('leaflet-js-cdn')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js-cdn';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.crossOrigin = '';
        script.onload = () => {
          if (isMounted) setIsLeafletReady(true);
        };
        document.body.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if ((window as any).L) {
            clearInterval(checkInterval);
            if (isMounted) setIsLeafletReady(true);
          }
        }, 80);
      }
    };

    loadLeafletAssets();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Inicializar mapa Leaflet cuando el contenedor y la librería estén listos
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      // Coordenadas iniciales: centro de España o primer estudio
      const initialCoords = studios[0] ? getStudioCoordinates(studios[0]) : [40.4168, -3.7038];

      const map = L.map(mapContainerRef.current, {
        center: initialCoords,
        zoom: studios.length === 1 ? 14 : 7,
        zoomControl: false,
        attributionControl: true
      });

      // Añadir control de zoom personalizado en la esquina superior derecha
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Añadir capa de teselas
      const layerConfig = TILE_LAYERS[currentLayer];
      const tileLayer = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        subdomains: layerConfig.subdomains,
        maxZoom: layerConfig.maxZoom
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      markersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      // Evento de clic en mapa para el modo estudio
      map.on('click', (e: any) => {
        if (isOwnerView && editingStudio) {
          const { lat, lng } = e.latlng;
          setGeocodedCoord([lat, lng]);
          reverseGeocode(lat, lng);
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletReady]);

  // 3. Cambiar capa de teselas (Dark / Streets / Satellite)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const layerConfig = TILE_LAYERS[currentLayer];
    const newLayer = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      subdomains: layerConfig.subdomains,
      maxZoom: layerConfig.maxZoom
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [currentLayer]);

  // 4. Actualizar pines y marcadores reales de estudios
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current || !isLeafletReady) return;
    const L = (window as any).L;
    if (!L) return;

    markersGroupRef.current.clearLayers();

    const filtered = studios.filter((st) => {
      const matchSearch =
        !searchTerm ||
        st.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.address?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCity = selectedCity === 'all' || st.city?.toLowerCase() === selectedCity.toLowerCase();
      return matchSearch && matchCity;
    });

    const bounds = L.latLngBounds([]);

    filtered.forEach((studio) => {
      const coords = getStudioCoordinates(studio);
      bounds.extend(coords);
      const isActive = studio.id === activeStudioId;

      // Pin personalizado con carmesí tattoo glow y SVG
      const customPinHtml = `
        <div class="custom-tattoo-pin-wrapper cursor-pointer" id="pin-${studio.id}">
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full ${
              isActive ? 'bg-crimson-500/40 animate-ping' : 'bg-crimson-500/20'
            }"></div>
            <div class="w-9 h-9 rounded-2xl ${
              isActive
                ? 'bg-gradient-to-tr from-crimson-600 via-crimson-500 to-amber-500 shadow-lg shadow-crimson-500/60 scale-115'
                : 'bg-ink-950 border border-crimson-500/60 hover:border-crimson-400 hover:scale-110'
            } text-white flex items-center justify-center transition-all duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-crimson-600 rotate-45"></div>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'tattoo-real-marker',
        html: customPinHtml,
        iconSize: [36, 42],
        iconAnchor: [18, 42],
        popupAnchor: [0, -42]
      });

      const marker = L.marker(coords, { icon });

      // Popup enriquecido profesional
      const artistsText = studio.artists_count
        ? `${studio.artists_count} ${studio.artists_count === 1 ? 'tatuador residente' : 'tatuadores residentes'}`
        : 'Tatuadores residentes';

      const gmapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${studio.name} ${studio.address || ''} ${studio.city || ''}`
      )}`;

      const popupHtml = `
        <div class="p-4 max-w-xs font-sans text-white">
          <div class="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
            <div class="w-8 h-8 rounded-xl bg-crimson-600/30 border border-crimson-500/50 flex items-center justify-center text-crimson-400">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
            </div>
            <div>
              <h4 class="font-bold text-sm text-white leading-tight">${studio.name}</h4>
              <span class="text-[10px] text-amber-400 font-mono">${artistsText}</span>
            </div>
          </div>

          <div class="text-xs text-ink-300 space-y-1 mb-3">
            <div class="flex items-start gap-1.5 text-gray-300">
              <span class="text-crimson-400 mt-0.5">📍</span>
              <span>${studio.address || 'Dirección por configurar'} ${studio.city ? `· ${studio.city}` : ''}</span>
            </div>
            ${
              studio.phone
                ? `<div class="flex items-center gap-1.5 text-gray-400 text-[11px]"><span class="text-amber-400">📞</span> <a href="tel:${studio.phone}" class="hover:underline">${studio.phone}</a></div>`
                : ''
            }
          </div>

          <div class="flex flex-col gap-1.5 pt-1">
            <button
              id="btn-select-${studio.id}"
              class="w-full py-2 px-3 bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-500 hover:to-crimson-600 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span>Ver Artistas & Reservar</span>
              <span>→</span>
            </button>
            <a
              href="${gmapsLink}"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full py-1.5 px-3 bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white rounded-xl text-[11px] font-semibold text-center border border-white/10 transition-colors flex items-center justify-center gap-1"
            >
              <span>Cómo llegar en Google Maps</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { minWidth: 260 });

      marker.on('click', () => {
        setActiveStudioId(studio.id);
      });

      marker.on('popupopen', () => {
        const selectBtn = document.getElementById(`btn-select-${studio.id}`);
        if (selectBtn) {
          selectBtn.onclick = () => {
            if (onSelectStudio) onSelectStudio(studio);
          };
        }
      });

      marker.addTo(markersGroupRef.current);
    });

    // Ajustar encuadre si hay múltiples marcadores
    if (filtered.length > 1 && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [studios, searchTerm, selectedCity, activeStudioId, isLeafletReady, getStudioCoordinates, onSelectStudio]);

  // 5. Centrar y abrir popup del estudio activo seleccionado
  const flyToStudio = useCallback(
    (studio: StudioLocation, zoomLevel = 15) => {
      setActiveStudioId(studio.id);
      if (!mapInstanceRef.current) return;
      const coords = getStudioCoordinates(studio);
      mapInstanceRef.current.flyTo(coords, zoomLevel, {
        duration: 1.2,
        easeLinearity: 0.25
      });
    },
    [getStudioCoordinates]
  );

  // 6. Geolocalización del cliente ("Localízame")
  const handleLocateMe = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) {
      alert('La geolocalización no está disponible en tu navegador.');
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const L = (window as any).L;
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setIsLocatingUser(false);

        if (userMarkerRef.current) {
          mapInstanceRef.current.removeLayer(userMarkerRef.current);
        }

        const userPinHtml = `
          <div class="relative flex items-center justify-center">
            <div class="w-6 h-6 rounded-full bg-blue-500/40 animate-ping absolute"></div>
            <div class="w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
              <div class="w-2 h-2 rounded-full bg-white"></div>
            </div>
          </div>
        `;

        const userIcon = L.divIcon({
          className: 'user-gps-marker',
          html: userPinHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        userMarkerRef.current = L.marker(coords, { icon: userIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup('<strong class="text-xs text-white">📍 Tu ubicación actual</strong>')
          .openPopup();

        mapInstanceRef.current.flyTo(coords, 14, { duration: 1.5 });
      },
      (err) => {
        setIsLocatingUser(false);
        alert(`No se pudo obtener tu ubicación: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // 7. Geocodificación directa de dirección mediante Nominatim OpenStreetMap
  const geocodeAddress = async (query: string) => {
    if (!query.trim()) return;
    setIsGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1&countrycodes=es`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setGeocodedCoord([lat, lon]);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lon], 16, { duration: 1.2 });
        }
      } else {
        alert('No se encontraron coordenadas exactas para esta dirección. Puedes hacer clic en el mapa para ubicarla manualmente.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // 8. Geocodificación inversa al hacer clic en el mapa
  const reverseGeocode = async (lat: number, lon: number) => {
    setIsGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
      const data = await res.json();
      if (data && data.address) {
        const road = data.address.road || data.address.pedestrian || data.address.suburb || '';
        const houseNumber = data.address.house_number ? ` ${data.address.house_number}` : '';
        const city = data.address.city || data.address.town || data.address.village || data.address.municipality || '';
        if (road) setEditAddress(`${road}${houseNumber}`);
        if (city) setEditCity(city);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // 9. Guardar dirección actualizada en base de datos
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudio || !onUpdateStudioAddress) return;
    if (!editAddress.trim() || !editCity.trim()) {
      alert('La dirección y la ciudad son obligatorias.');
      return;
    }

    setIsSavingAddress(true);
    try {
      await onUpdateStudioAddress(editingStudio.id, editAddress.trim(), editCity.trim());
      setEditingStudio(null);
      alert('¡Ubicación del estudio actualizada con éxito en el mapa!');
    } catch (err: any) {
      alert(`Error al guardar ubicación: ${err.message}`);
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Filtrado de estudios para la lista lateral
  const filteredStudios = useMemo(() => {
    return studios.filter((st) => {
      const matchSearch =
        !searchTerm ||
        st.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.address?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCity = selectedCity === 'all' || st.city?.toLowerCase() === selectedCity.toLowerCase();
      return matchSearch && matchCity;
    });
  }, [studios, searchTerm, selectedCity]);

  const activeStudio = useMemo(() => {
    return studios.find((s) => s.id === activeStudioId) || filteredStudios[0] || studios[0];
  }, [studios, activeStudioId, filteredStudios]);

  return (
    <div className="space-y-4 w-full">
      {/* MAP VIEW CONTAINER WITH REAL LEAFLET ENGINE */}
      <div className="relative rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-ink-950 min-h-[580px] h-[72vh] flex flex-col md:flex-row">
        {/* SIDEBAR: STUDIO EXPLORER & QUICK SELECTION */}
        <div
          className={`${
            sidebarOpen ? 'w-full md:w-80 lg:w-96' : 'w-0 hidden md:flex md:w-14'
          } bg-ink-950/95 backdrop-blur-xl border-r border-white/10 flex flex-col z-20 transition-all duration-300 shrink-0`}
        >
          {sidebarOpen ? (
            <div className="flex flex-col h-full p-4 overflow-hidden">
              {/* Header / Search Controls */}
              <div className="pb-3 border-b border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Building2 className="w-4 h-4 text-crimson-500" />
                    <span>Estudios ({filteredStudios.length})</span>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-ink-400 hover:text-white transition-colors"
                    title="Ocultar barra lateral"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar estudio o calle..."
                    className="w-full pl-9 pr-7 py-2 rounded-xl bg-ink-900 border border-white/10 text-xs text-white placeholder-ink-500 focus:outline-none focus:border-crimson-500/50"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* City filters */}
                {cities.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                    <button
                      onClick={() => setSelectedCity('all')}
                      className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all ${
                        selectedCity === 'all'
                          ? 'bg-crimson-600 text-white font-bold'
                          : 'bg-white/5 text-ink-400 hover:text-white'
                      }`}
                    >
                      Todas ({studios.length})
                    </button>
                    {cities.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setSelectedCity(c);
                          const cityCoords = REAL_CITY_COORDINATES[c.toLowerCase()];
                          if (cityCoords && mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo(cityCoords, 13, { duration: 1.2 });
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all ${
                          selectedCity === c
                            ? 'bg-crimson-600 text-white font-bold'
                            : 'bg-white/5 text-ink-400 hover:text-white'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Studios List Container */}
              <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
                {filteredStudios.length === 0 ? (
                  <div className="text-center py-10 text-ink-500 text-xs">
                    No se encontraron estudios con los filtros indicados.
                  </div>
                ) : (
                  filteredStudios.map((st) => {
                    const isSelected = st.id === activeStudioId;
                    return (
                      <div
                        key={st.id}
                        onClick={() => flyToStudio(st, 15)}
                        className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-crimson-950/40 border-crimson-500/60 shadow-lg shadow-crimson-950/50'
                            : 'bg-ink-900/60 border-white/5 hover:border-white/20 hover:bg-ink-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                              <span>{st.name}</span>
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-crimson-500 animate-pulse"></span>
                              )}
                            </h4>
                            <p className="text-[11px] text-ink-400 truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{st.address || 'Por configurar'}</span>
                              {st.city && <span className="shrink-0">· {st.city}</span>}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-ink-300 border border-white/10">
                              {st.artists_count || 1} {st.artists_count === 1 ? 'art.' : 'arts.'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectStudio) onSelectStudio(st);
                            }}
                            className="flex-1 py-1.5 px-2.5 rounded-xl bg-crimson-600/30 hover:bg-crimson-600 text-crimson-300 hover:text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <span>Ver Artistas</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>

                          {isOwnerView && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingStudio(st);
                                setEditAddress(st.address || '');
                                setEditCity(st.city || '');
                              }}
                              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-400 transition-colors"
                              title="Editar dirección física del estudio"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick instructions / Help tag */}
              <div className="pt-2 border-t border-white/10 text-[10px] text-ink-500 flex items-center gap-1.5">
                <Info className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Haz clic en un estudio para volar automáticamente a su posición GPS.</span>
              </div>
            </div>
          ) : (
            <div className="py-4 flex flex-col items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white transition-colors"
                title="Mostrar lista de estudios"
              >
                <Maximize2 className="w-4 h-4 text-crimson-400" />
              </button>
              <div className="writing-mode-vertical text-[11px] font-mono uppercase tracking-widest text-ink-500 py-4">
                Estudios ({filteredStudios.length})
              </div>
            </div>
          )}
        </div>

        {/* REAL LEAFLET MAP CANVAS CONTAINER */}
        <div className="relative flex-1 h-full min-h-[450px]">
          {/* Real Leaflet DOM Mount */}
          <div ref={mapContainerRef} className="w-full h-full min-h-[450px] z-10" />

          {/* Fallback loading overlay while Leaflet scripts load */}
          {!isLeafletReady && (
            <div className="absolute inset-0 z-30 bg-ink-950 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-2 border-crimson-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-mono text-ink-400">Cargando mapa cartográfico de producción...</span>
            </div>
          )}

          {/* FLOATING MAP TOOLBAR (Top Left) */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            {/* GPS Locate Button */}
            <button
              onClick={handleLocateMe}
              disabled={isLocatingUser}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-ink-900/90 hover:bg-ink-800 text-white text-xs font-bold border border-white/10 shadow-xl backdrop-blur-md transition-all hover:scale-105"
              title="Centrar en mi ubicación actual GPS"
            >
              <LocateFixed className={`w-3.5 h-3.5 text-blue-400 ${isLocatingUser ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Mi Ubicación</span>
            </button>

            {/* Layer Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-ink-900/90 hover:bg-ink-800 text-white text-xs font-bold border border-white/10 shadow-xl backdrop-blur-md transition-all hover:scale-105"
                title="Cambiar capa de mapa"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Capas</span>
              </button>

              {showLayerMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 p-2 rounded-2xl bg-ink-950/95 border border-white/15 shadow-2xl backdrop-blur-xl z-30 space-y-1">
                  {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setCurrentLayer(key as any);
                        setShowLayerMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${
                        currentLayer === key
                          ? 'bg-crimson-600 text-white'
                          : 'text-ink-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{layer.name}</span>
                      {currentLayer === key && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Reset View Button */}
            <button
              onClick={() => {
                if (mapInstanceRef.current) {
                  mapInstanceRef.current.flyTo([40.4168, -3.7038], 6, { duration: 1.2 });
                }
              }}
              className="p-2 rounded-2xl bg-ink-900/90 hover:bg-ink-800 text-ink-300 hover:text-white text-xs border border-white/10 shadow-xl backdrop-blur-md transition-all hover:scale-105"
              title="Restablecer vista a toda la península"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ACTIVE STUDIO QUICK CARD OVERLAY (Bottom of Map) */}
          {activeStudio && (
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-20">
              <div className="glass-panel p-4 rounded-3xl border border-white/15 bg-ink-950/90 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-crimson-400 font-bold">
                      Estudio Seleccionado
                    </span>
                    <h3 className="font-display text-base font-bold text-white mt-0.5">{activeStudio.name}</h3>
                    <p className="text-xs text-ink-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{activeStudio.address || 'Dirección sin registrar'}</span>
                      {activeStudio.city && <span>· {activeStudio.city}</span>}
                    </p>
                  </div>

                  {activeStudio.phone && (
                    <a
                      href={`tel:${activeStudio.phone}`}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/10 transition-colors shrink-0"
                      title="Llamar al estudio"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectStudio) onSelectStudio(activeStudio);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-500 hover:to-crimson-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Ver Artistas & Agendas</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${activeStudio.name} ${activeStudio.address || ''} ${activeStudio.city || ''}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white border border-white/10 transition-colors shrink-0"
                    title="Abrir indicaciones en Google Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: EDITAR UBICACIÓN EXACTA DEL ESTUDIO (STUDIO OWNER) */}
      {editingStudio && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/15 max-w-lg w-full bg-ink-950 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase">
                <MapPin className="w-4 h-4" />
                <span>Configurar Ubicación en el Mapa Real</span>
              </div>
              <button
                onClick={() => setEditingStudio(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-ink-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-ink-400 mb-6 leading-relaxed">
              Introduce la dirección exacta del estudio. Puedes buscar las coordenadas mediante geolocalización o hacer clic directamente en el mapa para situar la puerta de tu local.
            </p>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-300 uppercase tracking-wider mb-1.5">
                  Dirección Física (Calle, Número, Local)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Ej: Calle de Fuencarral 45, Local 2"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                  />
                  <button
                    type="button"
                    disabled={isGeocoding || !editAddress}
                    onClick={() => geocodeAddress(`${editAddress}, ${editCity || 'España'}`)}
                    className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold shrink-0 transition-colors"
                  >
                    {isGeocoding ? 'Buscando...' : 'Localizar'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-300 uppercase tracking-wider mb-1.5">
                  Ciudad o Municipio
                </label>
                <input
                  type="text"
                  required
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="Ej: Madrid, Barcelona, Valencia..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-xs focus:outline-none focus:border-crimson-500"
                />
              </div>

              {geocodedCoord && (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Coordenadas fijadas: <strong>{geocodedCoord[0].toFixed(5)}, {geocodedCoord[1].toFixed(5)}</strong>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingStudio(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="flex-1 py-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white text-xs font-bold shadow-lg shadow-crimson-600/30 transition-all hover:scale-105"
                >
                  {isSavingAddress ? 'Guardando...' : 'Guardar en el Mapa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
