'use client';

import React, { useState, useMemo } from 'react';
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
  Sliders,
  CheckCircle2,
  Calendar,
  X,
  Edit2
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

// Fallback normalized coordinates for Spanish cities on the vector map
const CITY_COORDINATES: Record<string, { x: number; y: number }> = {
  madrid: { x: 50, y: 48 },
  barcelona: { x: 82, y: 32 },
  valencia: { x: 74, y: 56 },
  sevilla: { x: 34, y: 78 },
  malaga: { x: 42, y: 86 },
  málaga: { x: 42, y: 86 },
  bilbao: { x: 55, y: 16 },
  zaragoza: { x: 67, y: 36 },
  galicia: { x: 18, y: 18 },
  vigo: { x: 16, y: 22 },
  alicante: { x: 76, y: 64 },
  murcia: { x: 70, y: 70 },
  granada: { x: 48, y: 82 }
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [activeStudioId, setActiveStudioId] = useState<string | null>(
    studios[0]?.id || null
  );
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Edit Address Modal State (for studio owner)
  const [editingStudio, setEditingStudio] = useState<StudioLocation | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Extract unique cities
  const cities = useMemo(() => {
    const set = new Set<string>();
    studios.forEach((s) => {
      if (s.city) set.add(s.city.trim());
    });
    return Array.from(set);
  }, [studios]);

  // Filter studios
  const filteredStudios = useMemo(() => {
    return studios.filter((s) => {
      const matchCity =
        selectedCity === 'all' ||
        (s.city && s.city.toLowerCase() === selectedCity.toLowerCase());
      const query = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        s.name.toLowerCase().includes(query) ||
        (s.address && s.address.toLowerCase().includes(query)) ||
        (s.city && s.city.toLowerCase().includes(query));
      return matchCity && matchSearch;
    });
  }, [studios, selectedCity, searchTerm]);

  // Currently focused studio
  const activeStudio = useMemo(() => {
    return (
      filteredStudios.find((s) => s.id === activeStudioId) ||
      filteredStudios[0] ||
      null
    );
  }, [filteredStudios, activeStudioId]);

  // Compute 2D position for each studio on interactive radar canvas
  const getCoordinates = (studio: StudioLocation, index: number) => {
    const cityKey = (studio.city || '').toLowerCase().trim();
    if (CITY_COORDINATES[cityKey]) {
      // Deterministic slight offset per studio in same city
      const offset = (index % 4) * 2.5 - 2.5;
      return {
        x: Math.max(8, Math.min(92, CITY_COORDINATES[cityKey].x + offset)),
        y: Math.max(8, Math.min(92, CITY_COORDINATES[cityKey].y + offset))
      };
    }
    // Fallback pseudo-coords
    const hash = studio.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return {
      x: 25 + (hash % 50),
      y: 25 + ((hash * 7) % 50)
    };
  };

  const handleOpenEdit = (studio: StudioLocation) => {
    setEditingStudio(studio);
    setEditAddress(studio.address || '');
    setEditCity(studio.city || '');
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudio || !onUpdateStudioAddress) return;

    setIsSavingAddress(true);
    try {
      await onUpdateStudioAddress(editingStudio.id, editAddress.trim(), editCity.trim());
      editingStudio.address = editAddress.trim();
      editingStudio.city = editCity.trim();
      setEditingStudio(null);
      alert('📍 ¡Dirección del estudio actualizada con éxito en el mapa!');
    } catch (err: any) {
      alert(`Error al actualizar dirección: ${err.message}`);
    } finally {
      setIsSavingAddress(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-3xl bg-ink-950/80 border border-white/10 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-crimson-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Navigation className="w-4 h-4 text-crimson-500 animate-pulse" />
            <span>Red Geográfica de Estudios de Tatuaje</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Mapa de Estudios Oficiales
          </h2>
          <p className="text-xs text-ink-400 mt-0.5">
            Encuentra estudios certificados cerca de ti, consulta sus horarios y reserva sesión directamente en el taller.
          </p>
        </div>

        {/* View Toggle (Map vs List) */}
        <div className="flex items-center gap-2 bg-ink-900 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'map'
                ? 'bg-crimson-600 text-white shadow-md shadow-crimson-600/30'
                : 'text-ink-400 hover:text-white'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Mapa</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-crimson-600 text-white shadow-md shadow-crimson-600/30'
                : 'text-ink-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Listado ({filteredStudios.length})</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-ink-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar estudio por nombre, dirección o calle..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-ink-950/70 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500 transition-colors shadow-inner"
          />
        </div>

        <div>
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-ink-950/70 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500 cursor-pointer"
          >
            <option value="all">Todas las Ciudades ({studios.length} estudios)</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                📍 {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* VISTA MAPA INTERACTIVO */}
      {viewMode === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Map Canvas */}
          <div className="lg:col-span-2 relative h-[440px] sm:h-[500px] rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-br from-[#07090e] via-[#0b0f19] to-[#06080c] shadow-2xl flex items-center justify-center p-4 group">
            {/* Grid & Geographic Radar lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293d15_1px,transparent_1px),linear-gradient(to_bottom,#1f293d15_1px,transparent_1px)] bg-[size:3rem_3rem]" />
            <div className="absolute inset-0 bg-radial-vignette opacity-70 pointer-events-none" />

            {/* Ambient Red Glow around center */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-crimson-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Stylized Vector Territory Shape (Watermark) */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-4 w-full h-full opacity-15 pointer-events-none stroke-white/20 fill-white/[0.02]"
            >
              <polygon points="12,18 35,12 60,10 75,18 88,26 84,48 76,68 62,82 44,92 28,88 20,72 10,48" />
              <circle cx="50" cy="48" r="32" strokeDasharray="2 4" />
              <circle cx="50" cy="48" r="46" strokeDasharray="3 6" />
            </svg>

            {/* Studio Interactive Pins */}
            {filteredStudios.map((studio, idx) => {
              const coords = getCoordinates(studio, idx);
              const isActive = activeStudio?.id === studio.id;

              return (
                <div
                  key={studio.id}
                  onClick={() => setActiveStudioId(studio.id)}
                  style={{
                    left: `${coords.x}%`,
                    top: `${coords.y}%`
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-20 group/pin`}
                >
                  {/* Radar pulse for active pin */}
                  {isActive && (
                    <span className="absolute -inset-2.5 rounded-full bg-crimson-500/30 animate-ping pointer-events-none" />
                  )}

                  {/* Marker Pin Icon */}
                  <div
                    className={`flex items-center justify-center rounded-2xl transition-all shadow-xl ${
                      isActive
                        ? 'w-11 h-11 bg-gradient-to-tr from-crimson-600 to-crimson-500 text-white scale-110 ring-4 ring-crimson-500/40 shadow-crimson-600/50'
                        : 'w-8 h-8 bg-ink-900/90 text-crimson-400 border border-white/20 hover:scale-110 hover:border-crimson-400'
                    }`}
                  >
                    <MapPin className={`${isActive ? 'w-6 h-6' : 'w-4 h-4'}`} />
                  </div>

                  {/* Tooltip Label */}
                  <div
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap pointer-events-none transition-all ${
                      isActive
                        ? 'bg-ink-950 text-white border border-crimson-500/50 shadow-lg scale-100 opacity-100'
                        : 'bg-black/90 text-ink-300 border border-white/10 opacity-0 group-hover/pin:opacity-100'
                    }`}
                  >
                    <span>{studio.name}</span>
                    <span className="text-crimson-400 ml-1">({studio.city})</span>
                  </div>
                </div>
              );
            })}

            {/* Map Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 text-[10px] font-mono text-ink-400 bg-ink-950/90 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-crimson-500 animate-pulse" />
              <span>{filteredStudios.length} Estudios Activos en la Red</span>
            </div>

            {/* Compass Indicator */}
            <div className="absolute top-4 right-4 z-10 text-[10px] font-mono text-ink-400 bg-ink-950/80 p-2 rounded-xl border border-white/10 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-crimson-400" />
              <span>Norte</span>
            </div>
          </div>

          {/* Active Studio Information Card */}
          <div className="h-full flex flex-col">
            {activeStudio ? (
              <div className="glass-panel p-6 rounded-3xl border border-white/15 bg-ink-950/90 flex flex-col justify-between h-full shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-crimson-600/10 rounded-full blur-2xl pointer-events-none" />

                <div>
                  {/* Studio Header & City badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-crimson-500/15 text-crimson-400 border border-crimson-500/30 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-crimson-500" />
                      {activeStudio.city || 'España'}
                    </span>

                    {isOwnerView && (
                      <button
                        onClick={() => handleOpenEdit(activeStudio)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-ink-300 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition-colors"
                        title="Editar dirección para el mapa"
                      >
                        <Edit2 className="w-3 h-3 text-amber-400" />
                        <span>Editar Ubicación</span>
                      </button>
                    )}
                  </div>

                  <h3 className="font-display text-2xl font-extrabold text-white mb-2 leading-tight">
                    {activeStudio.name}
                  </h3>

                  <p className="text-xs text-ink-300 mb-5 leading-relaxed">
                    {activeStudio.bio ||
                      'Estudio homologado con instalaciones esterilizadas, cabinas privadas y especialistas en múltiples estilos de tatuaje.'}
                  </p>

                  {/* Contact and Address Details */}
                  <div className="space-y-2.5 text-xs text-ink-200 bg-ink-900/80 p-4 rounded-2xl border border-white/5 font-mono mb-6">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-crimson-500 shrink-0 mt-0.5" />
                      <span>{activeStudio.address || 'Dirección no especificada'}</span>
                    </div>

                    {activeStudio.phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                        <a
                          href={`tel:${activeStudio.phone}`}
                          className="hover:underline text-ink-100"
                        >
                          {activeStudio.phone}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Lun - Sáb: 10:00 - 20:00h</span>
                    </div>
                  </div>
                </div>

                {/* Card CTA Actions */}
                <div className="space-y-2.5 pt-4 border-t border-white/10">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${activeStudio.name}, ${activeStudio.address}, ${activeStudio.city}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-ink-200 hover:text-white font-semibold text-xs border border-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-3.5 h-3.5 text-crimson-400" />
                    <span>Abrir en Google Maps / GPS</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>

                  {onSelectStudio && (
                    <button
                      onClick={() => onSelectStudio(activeStudio)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-500 hover:to-crimson-600 text-white font-bold text-xs shadow-lg shadow-crimson-600/30 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Ver Artistas & Reservar Cita</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-panel p-8 text-center rounded-3xl border border-white/10 flex flex-col items-center justify-center h-full text-ink-500">
                <MapPin className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">Selecciona un estudio del mapa para ver detalles</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* VISTA LISTADO EN GRID */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStudios.map((studio) => (
            <div
              key={studio.id}
              className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-crimson-500/40 bg-ink-950/70 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-crimson-500/10 text-crimson-400 border border-crimson-500/20">
                    📍 {studio.city}
                  </span>
                  {isOwnerView && (
                    <button
                      onClick={() => handleOpenEdit(studio)}
                      className="text-ink-400 hover:text-white p-1 rounded-lg"
                      title="Editar dirección"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  )}
                </div>

                <h3 className="font-display text-lg font-bold text-white mb-2 group-hover:text-crimson-400 transition-colors">
                  {studio.name}
                </h3>
                <p className="text-xs text-ink-400 mb-4 line-clamp-2">
                  {studio.bio || 'Estudio certificado de tatuaje y piercing profesional.'}
                </p>

                <div className="space-y-1.5 text-xs text-ink-300 bg-ink-900/60 p-3 rounded-xl border border-white/5 font-mono mb-4">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-crimson-500 shrink-0" />
                    <span className="truncate">{studio.address}</span>
                  </div>
                  {studio.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{studio.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${studio.name}, ${studio.address}, ${studio.city}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white border border-white/10 transition-colors"
                  title="Abrir mapa externo"
                >
                  <Navigation className="w-3.5 h-3.5 text-crimson-400" />
                </a>

                {onSelectStudio && (
                  <button
                    onClick={() => onSelectStudio(studio)}
                    className="flex-1 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-crimson-600/20"
                  >
                    <span>Ver Estudio</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: EDITAR DIRECCIÓN Y UBICACIÓN DEL ESTUDIO */}
      {editingStudio && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-amber-500/30 bg-ink-950/95 relative shadow-2xl">
            <button
              onClick={() => setEditingStudio(null)}
              className="absolute top-5 right-5 text-ink-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase mb-1">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Configuración de Geolocalización</span>
            </div>
            <h2 className="font-display text-xl font-bold text-white mb-1">
              Dirección del Estudio
            </h2>
            <p className="text-xs text-ink-400 mb-6">
              Actualiza la calle y ciudad de <strong>{editingStudio.name}</strong> para que aparezca correctamente posicionado en el mapa interactivo.
            </p>

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  Dirección Completa (Calle, Número, Piso) *
                </label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Ej: Calle Fuencarral 42, 2ºB"
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  Ciudad / Municipio *
                </label>
                <input
                  type="text"
                  required
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="Ej: Madrid, Barcelona, Valencia..."
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStudio(null)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white font-semibold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSavingAddress ? 'Guardando...' : 'Guardar Ubicación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
