'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import ArtistPortal from '@/components/dashboard/ArtistPortal';
import {
  Users,
  Clock,
  Mail,
  Star,
  Plus,
  Save,
  CheckCircle2,
  Calendar,
  Percent,
  Sparkles,
  Copy,
  ExternalLink,
  X,
  LogIn,
  UserCheck,
  MapPin
} from 'lucide-react';
import StudioMapView from '@/components/dashboard/StudioMapView';

const DEFAULT_REMINDER_SUBJECT = '🔔 Recordatorio de tu cita en {studio_name} para el {date}';
const DEFAULT_REMINDER_BODY = `¡Hola {client_name}! Te recordamos tu cita de {appointment_type} programada para el {date} a las {time} con {artist_name} en {studio_name} ({studio_address}).

Consejos importantes antes de acudir:
• Ven bien hidratado/a y descansado/a.
• Come algo nutritivo 1 hora antes de la cita.
• No consumas alcohol ni anticoagulantes en las 24 horas previas.
• Viste ropa cómoda que permita acceso cómodo a la zona a tatuar.

{consent_status}
Puedes revisar o firmar tu consentimiento aquí: {consent_url}

¡Nos vemos pronto!`;

const DEFAULT_NEWSLETTER_SUBJECT = '🔥 Nuevos flashes y trabajos del mes en {studio_name} - {artist_name}';
const DEFAULT_NEWSLETTER_BODY = `¡Hola {client_name}! Esperamos que tu piel luzca increíble.

Este mes, {artist_name} ha preparado {works_count} nuevos diseños exclusivos y flashes disponibles en el estudio.

{works_summary}

Puedes ver todos los diseños en alta resolución y reservar tu próximo flash antes de que se agote en:
{gallery_link}

¿Tienes una nueva idea en mente? Recuerda que puedes pedir presupuesto directamente desde la web.`;

const DEFAULT_REENGAGEMENT_SUBJECT = '🖤 ¿Ganas de nueva tinta, {client_name}? Te regalamos un {discount_percent}% de descuento';
const DEFAULT_REENGAGEMENT_BODY = `¡Hola {client_name}!

Ya han pasado 4 meses desde tu última sesión de tatuaje en {studio_name} con {artist_name} y queríamos saber cómo va tu tatuaje.

Si estás pensando en una nueva pieza, un repaso o añadir complementos a tu diseño, queremos premiar tu fidelidad:
👉 Usa tu código exclusivo: {discount_code}
👉 Disfruta de un {discount_percent}% de descuento en tu próxima reserva.

Puedes solicitar cita o consultar tu idea directamente aquí:
{booking_link}

¡Un abrazo del equipo de {studio_name}!`;

export default function StudioPortal({ user, profile }: { user: any; profile: any }) {
  const [activeTab, setActiveTab] = useState<'artists' | 'schedule' | 'location' | 'emails' | 'reviews'>('artists');
  const [studio, setStudio] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Persona Switcher (Studio vs specific Artist console)
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);

  // New Artist Modal State
  const [isNewArtistOpen, setIsNewArtistOpen] = useState(false);
  const [newArtistName, setNewArtistName] = useState('');
  const [newArtistSpecialties, setNewArtistSpecialties] = useState('');
  const [newArtistHourlyRate, setNewArtistHourlyRate] = useState(80);
  const [newArtistMinFee, setNewArtistMinFee] = useState(60);
  const [newArtistInstagram, setNewArtistInstagram] = useState('');
  const [creatingArtist, setCreatingArtist] = useState(false);

  // Email Templates State
  const [reminderSubject, setReminderSubject] = useState(DEFAULT_REMINDER_SUBJECT);
  const [reminderBody, setReminderBody] = useState(DEFAULT_REMINDER_BODY);
  const [newsletterSubject, setNewsletterSubject] = useState(DEFAULT_NEWSLETTER_SUBJECT);
  const [newsletterBody, setNewsletterBody] = useState(DEFAULT_NEWSLETTER_BODY);
  const [reengagementSubject, setReengagementSubject] = useState(DEFAULT_REENGAGEMENT_SUBJECT);
  const [reengagementBody, setReengagementBody] = useState(DEFAULT_REENGAGEMENT_BODY);
  const [discountCode, setDiscountCode] = useState('TATOO4M');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [savingEmails, setSavingEmails] = useState(false);

  // EmailJS Code Viewer Modal
  const [isEmailJsModalOpen, setIsEmailJsModalOpen] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  // Opening Hours State (Monday to Sunday)
  const [openingHours, setOpeningHours] = useState<any>({
    monday: { open: '10:00', close: '20:00', closed: false },
    tuesday: { open: '10:00', close: '20:00', closed: false },
    wednesday: { open: '10:00', close: '20:00', closed: false },
    thursday: { open: '10:00', close: '20:00', closed: false },
    friday: { open: '10:00', close: '20:00', closed: false },
    saturday: { open: '11:00', close: '19:00', closed: false },
    sunday: { open: '00:00', close: '00:00', closed: true },
  });
  const [savingHours, setSavingHours] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadStudioData();
  }, []);

  const loadStudioData = async () => {
    setLoading(true);
    try {
      // 1. Fetch studio record
      const { data: std } = await supabase
        .from('studios')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (std) {
        setStudio(std);
        if (std.opening_hours) setOpeningHours(std.opening_hours);

        const emailTpl = std.email_templates || {};
        setReminderSubject(emailTpl.reminder_subject || DEFAULT_REMINDER_SUBJECT);
        setReminderBody(emailTpl.reminder_body || DEFAULT_REMINDER_BODY);
        setNewsletterSubject(emailTpl.newsletter_subject || DEFAULT_NEWSLETTER_SUBJECT);
        setNewsletterBody(emailTpl.newsletter_body || DEFAULT_NEWSLETTER_BODY);
        setReengagementSubject(emailTpl.reengagement_subject || DEFAULT_REENGAGEMENT_SUBJECT);
        setReengagementBody(emailTpl.reengagement_body || DEFAULT_REENGAGEMENT_BODY);
        setDiscountCode(emailTpl.discount_code || 'TATOO4M');
        setDiscountPercent(emailTpl.discount_percent ?? 10);

        // 2. Fetch studio artists
        const { data: arts } = await supabase
          .from('artists')
          .select('*')
          .eq('studio_id', std.id);
        setArtists(arts || []);

        // 3. Fetch reviews
        const { data: revs } = await supabase
          .from('reviews')
          .select(`
            *,
            clients (profiles (full_name)),
            artists (display_name)
          `)
          .eq('studio_id', std.id)
          .order('created_at', { ascending: false });
        setReviews(revs || []);
      }
    } catch (err) {
      console.error('Error loading studio portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new artist to studio
  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio || !newArtistName.trim()) return;
    setCreatingArtist(true);

    try {
      const { data: createdArt, error } = await supabase
        .from('artists')
        .insert({
          profile_id: user.id, // Associated to this studio account
          studio_id: studio.id,
          display_name: newArtistName.trim(),
          specialties: newArtistSpecialties ? newArtistSpecialties.split(',').map(s => s.trim()) : [],
          hourly_rate: Number(newArtistHourlyRate) || 80,
          minimum_fee: Number(newArtistMinFee) || 60,
          instagram_handle: newArtistInstagram.trim() || null,
          pricing_rules: {
            minimum_fee: Number(newArtistMinFee) || 60,
            hourly_rate: Number(newArtistHourlyRate) || 80,
            size_rates: {
              small: { max_cm: 5, base_price: Number(newArtistMinFee) || 60 },
              medium: { max_cm: 15, base_price: 140 },
              large: { max_cm: 25, base_price: 260 },
              xlarge: { max_cm: 999, base_price: 450 }
            },
            color_multiplier: 1.25,
            complex_placement_multiplier: 1.15
          }
        })
        .select()
        .single();

      if (error) throw error;

      setArtists(prev => [...prev, createdArt]);
      setIsNewArtistOpen(false);
      setNewArtistName('');
      setNewArtistSpecialties('');
      setNewArtistInstagram('');
      alert(`¡Tatuador "${createdArt.display_name}" añadido al estudio con éxito! Ya puedes entrar en su consola.`);
    } catch (err: any) {
      alert(`Error al añadir tatuador: ${err.message}`);
    } finally {
      setCreatingArtist(false);
    }
  };

  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio) return;
    setSavingHours(true);

    try {
      const { error } = await supabase
        .from('studios')
        .update({ opening_hours: openingHours, updated_at: new Date().toISOString() })
        .eq('id', studio.id);

      if (error) throw error;
      alert('¡Horarios de apertura del estudio actualizados con éxito!');
    } catch (err: any) {
      alert(`Error al guardar horarios: ${err.message}`);
    } finally {
      setSavingHours(false);
    }
  };

  const handleSaveEmailTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studio) return;
    setSavingEmails(true);

    const updatedTemplates = {
      reminder_subject: reminderSubject,
      reminder_body: reminderBody,
      newsletter_subject: newsletterSubject,
      newsletter_body: newsletterBody,
      reengagement_subject: reengagementSubject,
      reengagement_body: reengagementBody,
      discount_code: discountCode.trim().toUpperCase(),
      discount_percent: Number(discountPercent)
    };

    try {
      const { error } = await supabase
        .from('studios')
        .update({ email_templates: updatedTemplates, updated_at: new Date().toISOString() })
        .eq('id', studio.id);

      if (error) throw error;
      alert('¡Plantillas de correo y promociones guardadas con éxito!');
    } catch (err: any) {
      alert(`Error al guardar plantillas de correo: ${err.message}`);
    } finally {
      setSavingEmails(false);
    }
  };

  const copyToClipboard = (text: string, templateKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(templateKey);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  // If a tattoo artist is currently selected, render that artist's console
  if (selectedArtistId) {
    return (
      <ArtistPortal
        user={user}
        profile={profile}
        artistId={selectedArtistId}
        onBackToStudio={() => setSelectedArtistId(null)}
      />
    );
  }

  const daysList = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
    { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
      {/* Studio Header with Active Persona Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 bg-ink-900/60 p-5 rounded-3xl border border-white/5">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">Panel de Estudio</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            {studio?.name || 'Mi Estudio de Tatuaje'}
          </h1>
          <p className="text-xs text-ink-400 mt-0.5">
            {artists.length} {artists.length === 1 ? 'tatuador asociado' : 'tatuadores asociados'} · Dirección: {studio?.address || 'Por configurar'}
          </p>
        </div>

        {/* Persona Selector: "Quién eres hoy" */}
        <div className="flex items-center gap-3 bg-ink-950 p-2 rounded-2xl border border-white/10">
          <div className="flex flex-col">
            <span className="text-[10px] text-ink-400 font-bold uppercase tracking-wider px-1">¿Quién eres hoy?</span>
            <select
              value={selectedArtistId || 'studio'}
              onChange={(e) => {
                if (e.target.value === 'studio') setSelectedArtistId(null);
                else setSelectedArtistId(e.target.value);
              }}
              className="px-3 py-1.5 rounded-xl bg-ink-900 border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="studio">🏢 Vista General del Estudio</option>
              <optgroup label="Tatuadores del Estudio:">
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    🎨 {a.display_name} (Consola Tatuador)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <button
            onClick={() => setIsNewArtistOpen(true)}
            className="flex items-center gap-1.5 bg-crimson-600 hover:bg-crimson-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-md shadow-crimson-600/25 transition-all self-end"
            title="Añadir nuevo tatuador al estudio"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tatuador</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 mb-8 pb-3">
        <button
          onClick={() => setActiveTab('artists')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'artists' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4 text-amber-400" />
          <span>Tatuadores del Estudio ({artists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'schedule' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4 text-crimson-500" />
          <span>Horario de Apertura</span>
        </button>

        <button
          onClick={() => setActiveTab('location')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'location' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-400" />
          <span>Ubicación y Mapa</span>
        </button>

        <button
          onClick={() => setActiveTab('emails')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'emails' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4 text-blue-400" />
          <span>Plantillas de Email & Descuentos</span>
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'reviews' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <Star className="w-4 h-4 text-amber-400" />
          <span>Reseñas de Clientes ({reviews.length})</span>
        </button>
      </div>

      {/* TAB 1: ARTISTS LIST */}
      {activeTab === 'artists' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-400">
              Cada tatuador puede acceder a su espacio individual seleccionando su perfil en el menú superior o haciendo clic en <strong>Acceder a su Consola</strong>.
            </p>
            <button
              onClick={() => setIsNewArtistOpen(true)}
              className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold px-3.5 py-1.5 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir Tatuador</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {artists.map((art) => (
              <div key={art.id} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-amber-500/30 transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-crimson-600 to-amber-500 text-white flex items-center justify-center font-bold text-base shadow-md">
                      {art.display_name?.charAt(0) || 'A'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{art.display_name}</h3>
                      <span className="text-xs text-ink-400">Mínimo: {art.minimum_fee}€ · Hora: {art.hourly_rate}€</span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] text-ink-400 font-semibold block uppercase tracking-wider">Especialidades:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {art.specialties?.length > 0 ? (
                        art.specialties.map((spec: string, idx: number) => (
                          <span key={idx} className="text-[10px] bg-white/5 text-ink-300 px-2 py-0.5 rounded-md border border-white/5">
                            {spec}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-ink-500">Todos los estilos</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Asistente IA Activo
                  </span>

                  <button
                    onClick={() => setSelectedArtistId(art.id)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white transition-all shadow-md shadow-crimson-600/20"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Acceder a su Consola</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: STUDIO OPENING HOURS */}
      {activeTab === 'schedule' && (
        <div className="max-w-2xl glass-panel p-8 rounded-3xl border border-white/10">
          <h2 className="font-display text-xl font-bold text-white mb-1">Horario General de Apertura</h2>
          <p className="text-xs text-ink-400 mb-6">
            Define los días y franjas en los que el estudio acepta citas presenciales.
          </p>

          <form onSubmit={handleSaveHours} className="space-y-3 text-xs">
            {daysList.map((day) => {
              const dayData = openingHours[day.key] || { open: '10:00', close: '20:00', closed: false };

              return (
                <div key={day.key} className="flex items-center justify-between p-3 rounded-xl bg-ink-900/70 border border-white/5">
                  <span className="font-bold text-white w-24 text-sm">{day.label}</span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!dayData.closed}
                      onChange={(e) => {
                        setOpeningHours((prev: any) => ({
                          ...prev,
                          [day.key]: { ...dayData, closed: !e.target.checked }
                        }));
                      }}
                    />
                    <span className={dayData.closed ? 'text-crimson-400' : 'text-emerald-400 font-semibold'}>
                      {dayData.closed ? 'Cerrado' : 'Abierto'}
                    </span>
                  </label>

                  {!dayData.closed ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={dayData.open}
                        onChange={(e) => {
                          setOpeningHours((prev: any) => ({
                            ...prev,
                            [day.key]: { ...dayData, open: e.target.value }
                          }));
                        }}
                        className="bg-ink-950 border border-white/10 px-2 py-1 rounded text-white"
                      />
                      <span>a</span>
                      <input
                        type="time"
                        value={dayData.close}
                        onChange={(e) => {
                          setOpeningHours((prev: any) => ({
                            ...prev,
                            [day.key]: { ...dayData, close: e.target.value }
                          }));
                        }}
                        className="bg-ink-950 border border-white/10 px-2 py-1 rounded text-white"
                      />
                    </div>
                  ) : (
                    <span className="text-ink-500 italic">No disponible para reservas</span>
                  )}
                </div>
              );
            })}

            <button
              type="submit"
              disabled={savingHours}
              className="mt-6 w-full py-3 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm shadow-lg shadow-crimson-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingHours ? 'Guardando...' : 'Guardar Horario de Apertura'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB LOCATION: STUDIO MAP & ADDRESS CONFIGURATION */}
      {activeTab === 'location' && studio && (
        <div className="space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase mb-1">
                  <MapPin className="w-4 h-4" />
                  <span>Geo-Localización & Mapa Territorial</span>
                </div>
                <h2 className="font-display text-xl font-bold text-white">Ubicación y Cobertura de tu Estudio</h2>
                <p className="text-xs text-ink-400 mt-1 max-w-xl">
                  Configura la dirección física y la ciudad para que los clientes encuentren tu estudio en el mapa interactivo y calculen rutas directas con Google Maps.
                </p>
              </div>
            </div>

            <StudioMapView
              studios={[{
                ...studio,
                artists_count: artists.length
              }]}
              isOwnerView={true}
              onUpdateStudioAddress={async (studioId, address, city) => {
                const res = await fetch('/api/studios/update-location', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ studioId, address, city })
                });
                const data = await res.json();
                if (!res.ok || data.error) throw new Error(data.error || 'Error al actualizar dirección');
                setStudio((prev: any) => ({ ...prev, address, city }));
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 3: EMAIL TEMPLATES & 4-MONTH RE-ENGAGEMENT */}
      {activeTab === 'emails' && (
        <div className="max-w-3xl glass-panel p-8 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-xs font-mono font-bold uppercase mb-1">
                <Mail className="w-4 h-4" />
                <span>Automatización con EmailJS</span>
              </div>
              <h2 className="font-display text-xl font-bold text-white">Plantillas de Email & Promociones</h2>
            </div>

            <button
              type="button"
              onClick={() => setIsEmailJsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>📋 Ver Plantillas Listas para EmailJS</span>
            </button>
          </div>

          <p className="text-xs text-ink-400 mb-6 leading-relaxed">
            Personaliza el contenido de los correos automáticos. Las plantillas ya vienen precargadas por defecto con un diseño probado y profesional.
          </p>

          <form onSubmit={handleSaveEmailTemplates} className="space-y-6 text-sm">
            {/* 1. Recordatorio 48h */}
            <div className="space-y-2 p-5 rounded-2xl bg-ink-900/60 border border-white/5">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                1. Recordatorio 48 horas antes de la cita
              </span>
              <div>
                <label className="block text-xs text-ink-400 mb-1">Asunto</label>
                <input
                  type="text"
                  value={reminderSubject}
                  onChange={(e) => setReminderSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ink-950 border border-white/10 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-400 mb-1">Cuerpo del mensaje</label>
                <textarea
                  rows={4}
                  value={reminderBody}
                  onChange={(e) => setReminderBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ink-950 border border-white/10 text-white text-xs"
                />
              </div>
            </div>

            {/* 2. Newsletter mensual */}
            <div className="space-y-2 p-5 rounded-2xl bg-ink-900/60 border border-white/5">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                2. Newsletter Mensual de Flashes & Diseños (Share)
              </span>
              <div>
                <label className="block text-xs text-ink-400 mb-1">Asunto</label>
                <input
                  type="text"
                  value={newsletterSubject}
                  onChange={(e) => setNewsletterSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ink-950 border border-white/10 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-400 mb-1">Cuerpo del mensaje</label>
                <textarea
                  rows={4}
                  value={newsletterBody}
                  onChange={(e) => setNewsletterBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ink-950 border border-white/10 text-white text-xs"
                />
              </div>
            </div>

            {/* 3. Reactivación a los 4 meses */}
            <div className="space-y-3 p-5 rounded-2xl bg-amber-950/20 border border-amber-500/20">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                3. Correo de Reactivación (4 meses sin citas)
              </span>
              <div>
                <label className="block text-xs text-ink-400 mb-1">Asunto</label>
                <input
                  type="text"
                  value={reengagementSubject}
                  onChange={(e) => setReengagementSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ink-950 border border-white/10 text-white text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-400 mb-1">Cuerpo del mensaje</label>
                <textarea
                  rows={4}
                  value={reengagementBody}
                  onChange={(e) => setReengagementBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ink-950 border border-white/10 text-white text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs text-amber-300 mb-1">Código de Descuento</label>
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-ink-950 border border-white/10 text-white font-mono uppercase text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs text-amber-300 mb-1">% de Descuento</label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-ink-950 border border-white/10 text-white text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingEmails}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingEmails ? 'Guardando...' : 'Guardar Plantillas y Promociones'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reviews.length === 0 ? (
              <div className="col-span-3 glass-panel p-12 text-center rounded-2xl border border-white/5 text-ink-500 text-sm">
                Aún no hay reseñas registradas para este estudio.
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="glass-panel p-5 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white text-sm">{r.clients?.profiles?.full_name || 'Cliente'}</span>
                    <span className="text-amber-400 text-xs">{'★'.repeat(r.rating)}</span>
                  </div>
                  <p className="text-xs text-ink-300 mb-2 italic">"{r.comment}"</p>
                  <span className="text-[10px] text-ink-500">Tatuador: {r.artists?.display_name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: AÑADIR TATUADOR AL ESTUDIO */}
      {isNewArtistOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 sm:p-8 rounded-3xl border border-white/10 relative">
            <button
              onClick={() => setIsNewArtistOpen(false)}
              className="absolute top-5 right-5 text-ink-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-display text-xl font-bold text-white mb-1">Añadir Tatuador al Estudio</h2>
            <p className="text-xs text-ink-400 mb-6">
              El tatuador tendrá su propia consola para gestionar citas, chats con IA y flashes.
            </p>

            <form onSubmit={handleCreateArtist} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                  Nombre del Tatuador / Artístico *
                </label>
                <input
                  type="text"
                  required
                  value={newArtistName}
                  onChange={(e) => setNewArtistName(e.target.value)}
                  placeholder="Ej: Marcos Vega"
                  className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                  Especialidades (separadas por coma)
                </label>
                <input
                  type="text"
                  value={newArtistSpecialties}
                  onChange={(e) => setNewArtistSpecialties(e.target.value)}
                  placeholder="Ej: Blackwork, Fine Line, Tradicional"
                  className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                    Tarifa Mínima (€)
                  </label>
                  <input
                    type="number"
                    value={newArtistMinFee}
                    onChange={(e) => setNewArtistMinFee(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                    Precio / Hora (€)
                  </label>
                  <input
                    type="number"
                    value={newArtistHourlyRate}
                    onChange={(e) => setNewArtistHourlyRate(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                  Instagram Handle (Opcional)
                </label>
                <input
                  type="text"
                  value={newArtistInstagram}
                  onChange={(e) => setNewArtistInstagram(e.target.value)}
                  placeholder="@marcos_tattoo"
                  className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewArtistOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingArtist}
                  className="px-5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold"
                >
                  {creatingArtist ? 'Añadiendo...' : 'Añadir Tatuador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISOR DE PLANTILLAS PARA EMAILJS */}
      {isEmailJsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl p-6 sm:p-8 rounded-3xl border border-white/10 relative max-h-[88vh] overflow-y-auto">
            <button
              onClick={() => setIsEmailJsModalOpen(false)}
              className="absolute top-5 right-5 text-ink-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-purple-400 text-xs font-mono font-bold uppercase mb-1">
              <Mail className="w-4 h-4" />
              <span>Plantillas EmailJS Oficiales</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Código para EmailJS</h2>
            <p className="text-xs text-ink-400 mb-6">
              Copia y pega este código HTML en el editor de plantillas de tu cuenta de EmailJS.
            </p>

            <div className="space-y-6 text-xs">
              {/* Plantilla 1 */}
              <div className="p-4 rounded-2xl bg-ink-950 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-amber-400 text-sm">1. Recordatorio de Cita (48h)</span>
                  <button
                    onClick={() => copyToClipboard(`<!-- Plantilla 48h para EmailJS -->
<div style="font-family: Arial, sans-serif; background-color: #0b0c0e; color: #f8f9fa; padding: 30px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #262930;">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #e63946; margin: 0; font-size: 26px;">{{studio_name}}</h1>
    <p style="color: #adb5bd; font-size: 13px;">Recordatorio de tu próxima sesión</p>
  </div>
  <div style="background-color: #131519; padding: 25px; border-radius: 12px;">
    <h2 style="color: #ffffff; font-size: 18px;">¡Hola, {{client_name}}!</h2>
    <p style="color: #ced4da; font-size: 14px; line-height: 1.6;">
      Te recordamos tu cita de <strong>{{appointment_type}}</strong> con <strong>{{artist_name}}</strong> en <strong>{{studio_name}}</strong>.
    </p>
    <div style="background-color: #0b0c0e; padding: 15px; border-radius: 8px; border-left: 4px solid #e63946;">
      <p style="margin: 4px 0;">📅 <strong>Fecha:</strong> {{appointment_date}}</p>
      <p style="margin: 4px 0;">⏰ <strong>Hora:</strong> {{appointment_time}}</p>
      <p style="margin: 4px 0;">📍 <strong>Dirección:</strong> {{studio_address}}</p>
    </div>
    <div style="margin-top: 25px; text-align: center;">
      <p style="color: #fbbf24; font-weight: bold;">{{consent_status}}</p>
      <a href="{{consent_url}}" style="display: inline-block; background-color: #e63946; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Firmar Consentimiento Informado Online
      </a>
    </div>
  </div>
</div>`, 'reminder')}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedTemplate === 'reminder' ? '¡Copiado!' : 'Copiar HTML'}</span>
                  </button>
                </div>
                <span className="text-ink-400 block mb-2 font-mono">Template ID: <code>template_reminder_48h</code></span>
              </div>

              {/* Plantilla 2 */}
              <div className="p-4 rounded-2xl bg-ink-950 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-purple-400 text-sm">2. Newsletter Mensual de Flashes (Share)</span>
                  <button
                    onClick={() => copyToClipboard(`<!-- Plantilla Newsletter para EmailJS -->
<div style="font-family: Arial, sans-serif; background-color: #0b0c0e; color: #f8f9fa; padding: 30px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #262930;">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #e63946; margin: 0; font-size: 26px;">{{studio_name}}</h1>
    <p style="color: #adb5bd; font-size: 13px;">Nuevos flashes de {{artist_name}}</p>
  </div>
  <div style="background-color: #131519; padding: 25px; border-radius: 12px;">
    <h2 style="color: #ffffff; font-size: 18px;">¡Hola, {{client_name}}!</h2>
    <p style="color: #ced4da; font-size: 14px; line-height: 1.6;">
      Este mes, <strong>{{artist_name}}</strong> ha publicado <strong>{{works_count}} nuevos diseños exclusivos</strong> en el estudio.
    </p>
    <div style="background-color: #0b0c0e; padding: 15px; border-radius: 8px;">
      <p style="color: #f8f9fa; white-space: pre-line; margin: 0;">{{works_summary}}</p>
    </div>
    <div style="text-align: center; margin-top: 25px;">
      <a href="{{gallery_link}}" style="display: inline-block; background-color: #7928ca; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Ver Galería y Reservar Flash
      </a>
    </div>
  </div>
</div>`, 'newsletter')}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedTemplate === 'newsletter' ? '¡Copiado!' : 'Copiar HTML'}</span>
                  </button>
                </div>
                <span className="text-ink-400 block mb-2 font-mono">Template ID: <code>template_newsletter_monthly</code></span>
              </div>

              {/* Plantilla 3 */}
              <div className="p-4 rounded-2xl bg-ink-950 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-crimson-400 text-sm">3. Reactivación a los 4 Meses (Descuento)</span>
                  <button
                    onClick={() => copyToClipboard(`<!-- Plantilla Reactivación 4 Meses para EmailJS -->
<div style="font-family: Arial, sans-serif; background-color: #0b0c0e; color: #f8f9fa; padding: 30px 20px; max-width: 600px; margin: 0 auto; border-radius: 16px; border: 1px solid #262930;">
  <div style="text-align: center; margin-bottom: 25px;">
    <h1 style="color: #e63946; margin: 0; font-size: 26px;">{{studio_name}}</h1>
    <p style="color: #adb5bd; font-size: 13px;">Te echamos de menos</p>
  </div>
  <div style="background-color: #131519; padding: 25px; border-radius: 12px;">
    <h2 style="color: #ffffff; font-size: 18px;">¡Hola, {{client_name}}!</h2>
    <p style="color: #ced4da; font-size: 14px; line-height: 1.6;">
      Han pasado 4 meses desde tu última sesión de tatuaje con <strong>{{artist_name}}</strong> en <strong>{{studio_name}}</strong>.
    </p>
    <div style="background: rgba(251,191,36,0.1); border: 2px dashed #fbbf24; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
      <span style="font-size: 12px; color: #fbbf24; font-weight: bold;">Tu código exclusivo:</span>
      <span style="display: block; font-size: 26px; font-weight: bold; color: #ffffff; margin: 6px 0; font-family: monospace;">{{discount_code}}</span>
      <span style="font-size: 14px; color: #f8f9fa;">Disfruta de un <strong>{{discount_percent}} de descuento</strong> en tu próxima reserva.</span>
    </div>
    <div style="text-align: center; margin-top: 25px;">
      <a href="{{booking_link}}" style="display: inline-block; background-color: #e63946; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        Pedir Cita con Descuento
      </a>
    </div>
  </div>
</div>`, 'reengagement')}
                    className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedTemplate === 'reengagement' ? '¡Copiado!' : 'Copiar HTML'}</span>
                  </button>
                </div>
                <span className="text-ink-400 block mb-2 font-mono">Template ID: <code>template_reengagement_4m</code></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
