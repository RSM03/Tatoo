'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar,
  Clock,
  Sparkles,
  Camera,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileSignature,
  X,
  MessageSquare,
  Plus,
  Info,
  Flame,
  ShieldCheck,
  Compass,
  CornerDownRight
} from 'lucide-react';
import SignaturePad from 'signature_pad';

export default function ClientPortal({ user, profile }: { user: any; profile: any }) {
  const [activeTab, setActiveTab] = useState<'appointments' | 'chat' | 'history'>('appointments');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [studios, setStudios] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>({
    id: 'client-chat-session',
    ai_enabled: true,
    status_badge: 'quoting'
  });
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [loading, setLoading] = useState(true);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedStudioId, setSelectedStudioId] = useState('');
  const [selectedArtistId, setSelectedArtistId] = useState('');
  const [bookingType, setBookingType] = useState('tattoo_session');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('11:00');
  const [bookingDescription, setBookingDescription] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Consent Modal State
  const [selectedConsentApp, setSelectedConsentApp] = useState<any>(null);
  const [dniNie, setDniNie] = useState('');
  const [allergiesAns, setAllergiesAns] = useState('no');
  const [medicationAns, setMedicationAns] = useState('no');
  const [signingConsent, setSigningConsent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // Initialize signature pad when modal opens
  useEffect(() => {
    if (selectedConsentApp && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement?.clientWidth || 450;
      canvas.height = 180;
      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        penColor: '#ffffff'
      });
    }
  }, [selectedConsentApp]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get client ID from clients table if available
      const { data: clientRec } = await supabase
        .from('clients')
        .select('id, dni_nie')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (clientRec?.dni_nie) setDniNie(clientRec.dni_nie);
      const clientId = clientRec?.id;

      // 2. Fetch appointments
      if (clientId) {
        const { data: apps } = await supabase
          .from('appointments')
          .select(`
            *,
            studios (id, name, address),
            artists (id, display_name),
            consent_forms (id, signed_at)
          `)
          .eq('client_id', clientId)
          .order('start_time', { ascending: true });

        setAppointments(apps || []);
      }

      // 3. Fetch studios & artists
      const { data: stds } = await supabase.from('studios').select('id, name, address');
      const { data: arts } = await supabase.from('artists').select('id, display_name, studio_id, specialties');
      setStudios(stds || []);
      setArtists(arts || []);

      const defaultStudio = stds?.[0]?.id || '';
      const defaultArtist = arts?.[0]?.id || '';
      if (defaultStudio) setSelectedStudioId(defaultStudio);
      if (defaultArtist) setSelectedArtistId(defaultArtist);

      // 4. Initialize Chat Session via Admin-backed server endpoint
      try {
        const sessionRes = await fetch('/api/chat/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientProfileId: user.id,
            artistId: defaultArtist,
            studioId: defaultStudio
          })
        });

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData.chat) setActiveChat(sessionData.chat);
          if (sessionData.messages && sessionData.messages.length > 0) {
            setMessages(sessionData.messages);
          }
        }
      } catch (chatInitErr) {
        console.warn('Chat session init fallback:', chatInitErr);
      }

    } catch (err) {
      console.error('Error loading client portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, uploadedImgUrl?: string, promptOverride?: string) => {
    if (e) e.preventDefault();
    const textToSend = (promptOverride || inputText).trim();
    if ((!textToSend && !uploadedImgUrl) || sendingMsg) return;

    setInputText('');
    setSendingMsg(true);
    setIsAiThinking(true);

    // Optimistic UI push
    const tempId = 'temp-' + Date.now();
    const optimisticMsg = {
      id: tempId,
      sender_role: 'client',
      content: textToSend || (uploadedImgUrl ? 'Foto adjunta' : ''),
      image_url: uploadedImgUrl,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChat?.id && !activeChat.id.startsWith('client-chat') ? activeChat.id : undefined,
          content: textToSend,
          imageUrl: uploadedImgUrl,
          senderRole: 'client',
          lang: profile?.language || 'es',
          clientProfileId: user?.id,
          artistId: selectedArtistId || artists[0]?.id,
          studioId: selectedStudioId || studios[0]?.id
        })
      });

      const data = await res.json();
      if (data.chat) {
        setActiveChat(data.chat);
      }
      if (data.aiResponse) {
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempId),
          data.message || optimisticMsg,
          data.aiResponse
        ]);
      } else if (data.message) {
        setMessages(prev => [...prev.filter(m => m.id !== tempId), data.message]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSendingMsg(false);
      setIsAiThinking(false);
    }
  };

  // Handle Photo upload for tattoo healing tracking
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      handleSendMessage(undefined, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Handle New Booking Creation using server-side API (bypasses RLS recursion)
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSubmitting(true);

    try {
      const { data: clientRec } = await supabase
        .from('clients')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      let clientId = clientRec?.id;
      if (!clientId) {
        const { data: createdClient } = await supabase
          .from('clients')
          .insert({ profile_id: user.id })
          .select('id')
          .single();
        clientId = createdClient?.id;
      }

      const startDateTime = new Date(`${bookingDate}T${bookingTime}:00`);
      const durationHours = bookingType === 'design_consultation' ? 0.75 : 3;
      const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);

      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId: selectedStudioId,
          artistId: selectedArtistId,
          clientId,
          appointmentType: bookingType,
          title: bookingType === 'design_consultation' ? 'Consulta de Diseño' : 'Sesión de Tatuaje',
          description: bookingDescription,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          status: 'pending'
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al solicitar cita.');
      }

      setAppointments(prev => [...prev, data.appointment]);
      setIsBookingOpen(false);
      setBookingDescription('');
      alert('⚡ ¡Cita solicitada con éxito! El estudio confirmará el espacio en su agenda.');
    } catch (err: any) {
      alert(`Error al reservar cita: ${err.message}`);
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Handle Signing Legal Consent
  const handleSignConsent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      return alert('Por favor, estampa tu firma en el recuadro antes de confirmar.');
    }

    setSigningConsent(true);
    const signatureDataUrl = signaturePadRef.current.toDataURL();

    try {
      const res = await fetch('/api/consent/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedConsentApp.id,
          clientId: selectedConsentApp.client_id,
          artistId: selectedConsentApp.artist_id,
          fullName: profile?.full_name || user.email,
          dniNie: dniNie.trim(),
          signatureDataUrl,
          medicalDisclaimers: {
            hasAllergies: allergiesAns === 'yes',
            takesMedication: medicationAns === 'yes',
            isAdultConfirmed: true
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('🛡️ ¡Consentimiento informado firmado y validado legalmente!');
      setSelectedConsentApp(null);
      loadData();
    } catch (err: any) {
      alert(`Error al firmar consentimiento: ${err.message}`);
    } finally {
      setSigningConsent(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
      {/* Header with Tattoo Studio Atmosphere */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-ink-900/90 via-ink-950 to-ink-900/90 p-6 rounded-3xl border border-crimson-500/20 shadow-xl shadow-black/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-crimson-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-crimson-400 font-bold bg-crimson-500/10 px-2.5 py-0.5 rounded-full border border-crimson-500/20 flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-crimson-400" />
              Tattoo Client Atelier
            </span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400/80 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 hidden sm:inline-flex">
              ⚡ Blackwork & Custom Ink
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Hola, {profile?.full_name || 'Coleccionista de Tinta'}
          </h1>
          <p className="text-xs text-ink-400 mt-1 max-w-xl">
            Gestiona tus citas con aguja y tinta, resuelve dudas con el asistente del artista y realiza seguimiento fotográfico de tu cicatrización.
          </p>
        </div>

        <button
          onClick={() => setIsBookingOpen(true)}
          className="relative z-10 flex items-center gap-2 bg-gradient-to-r from-crimson-600 to-crimson-700 hover:from-crimson-500 hover:to-crimson-600 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-lg shadow-crimson-600/30 transition-all hover:scale-105 border border-crimson-500/40"
        >
          <Plus className="w-4 h-4" />
          <span>Solicitar Cita de Tatuaje</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-3 border-b border-white/10 mb-8 pb-3">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'appointments'
              ? 'bg-crimson-600/20 text-crimson-400 border border-crimson-500/30 shadow-md shadow-crimson-600/10'
              : 'text-ink-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar className="w-4 h-4 text-crimson-500" />
          <span>Mis Citas ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'chat'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/10'
              : 'text-ink-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Asistente IA del Estudio & Visión</span>
        </button>
      </div>

      {/* TAB 1: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {appointments.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-3xl border border-white/10 bg-ink-950/60">
              <div className="w-16 h-16 rounded-2xl bg-crimson-500/10 border border-crimson-500/20 text-crimson-400 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No tienes sesiones programadas</h3>
              <p className="text-sm text-ink-400 max-w-md mx-auto mb-6 leading-relaxed">
                Elige si prefieres una consulta gratuita de diseño (30-45 min) para definir tu pieza o una sesión completa de tatuaje en piel.
              </p>
              <button
                onClick={() => setIsBookingOpen(true)}
                className="inline-flex items-center gap-2 bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-crimson-600/30 transition-all hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span>Pedir Primera Cita</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {appointments.map((app) => {
                const startDate = new Date(app.start_time);
                const isSigned = app.consent_forms && app.consent_forms.length > 0;

                return (
                  <div key={app.id} className="glass-panel p-6 rounded-3xl border border-white/10 bg-ink-900/60 hover:border-crimson-500/40 transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                          app.appointment_type === 'design_consultation'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-crimson-500/15 text-crimson-400 border-crimson-500/30'
                        }`}>
                          {app.appointment_type === 'design_consultation' ? '📜 Consulta Diseño' : '🩸 Sesión Tatuaje'}
                        </span>

                        <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-white/5 text-ink-300 border border-white/5">
                          {app.status === 'confirmed' ? '✅ Confirmada' : app.status === 'pending' ? '⏳ Pendiente' : app.status}
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-white mb-1.5 group-hover:text-crimson-400 transition-colors">
                        {app.title || 'Cita con ' + app.artists?.display_name}
                      </h3>
                      <p className="text-xs text-ink-400 mb-4">
                        Artista: <strong className="text-ink-200">{app.artists?.display_name}</strong> · Estudio: <strong className="text-ink-200">{app.studios?.name}</strong> ({app.studios?.address})
                      </p>

                      <div className="flex items-center gap-4 text-xs text-ink-200 mb-4 bg-ink-950/80 p-3.5 rounded-2xl border border-white/5 font-mono">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-crimson-500" />
                          <span>{startDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>{startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Legal Consent Signing Status */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        {isSigned ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Consentimiento firmado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" /> Consentimiento pendiente
                          </span>
                        )}
                      </div>

                      {!isSigned && (
                        <button
                          onClick={() => setSelectedConsentApp(app)}
                          className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3.5 py-1.5 rounded-xl transition-all hover:scale-105"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          <span>Firmar Ahora</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI & ARTIST CHAT (WITH VISION AFTERCARE) */}
      {activeTab === 'chat' && (
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[700px] bg-ink-950/70 shadow-2xl relative">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10 bg-ink-900/90 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-crimson-600 via-crimson-500 to-amber-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md shadow-crimson-600/30">
                AI
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Asistente del Tatuador ({artists[0]?.display_name || 'Estudio'})</span>
                  {activeChat?.ai_enabled ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      IA Activa 24/7
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                      ● Tatuador en directo
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-ink-400">Presupuestos por cm, recomendaciones de estilo y scanner de cicatrización</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-ink-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-crimson-500" />
              <span>Eden AI (GPT-4o-mini)</span>
            </div>
          </div>

          {/* Quick Action Prompt Chips */}
          <div className="px-4 py-2 bg-ink-900/40 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleSendMessage(undefined, undefined, '¿Cuánto costaría aproximadamente un tatuaje de 15 cm a color en el antebrazo?')}
              className="text-xs whitespace-nowrap px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1"
            >
              <span>🩸 Presupuesto 15cm color</span>
            </button>
            <button
              onClick={() => handleSendMessage(undefined, undefined, '¿Cómo debo limpiar y cuidar el tatuaje durante los primeros 3 días?')}
              className="text-xs whitespace-nowrap px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1"
            >
              <span>🩹 Cuidados iniciales</span>
            </button>
            <button
              onClick={() => handleSendMessage(undefined, undefined, '¿Qué diferencia hay entre una consulta de diseño y una sesión de tatuaje?')}
              className="text-xs whitespace-nowrap px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1"
            >
              <span>📜 Consulta vs Sesión</span>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-16 text-ink-400 text-xs max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">¡Bienvenido al Chat del Estudio!</h4>
                <p className="leading-relaxed">
                  Indica qué idea tienes, las medidas en centímetros (ej: "12 cm") o pulsa en 📷 para enviar una foto de curación o referencia.
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const isClient = msg.sender_role === 'client';
              const isAi = msg.sender_role === 'ai_assistant';

              return (
                <div key={msg.id} className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[88%] sm:max-w-[78%] p-4 rounded-2xl text-sm leading-relaxed ${
                    isClient
                      ? 'bg-crimson-600 text-white rounded-br-xs shadow-md shadow-crimson-600/20'
                      : isAi
                      ? 'bg-ink-900 border border-white/10 text-ink-100 rounded-bl-xs shadow-md'
                      : 'bg-amber-600/20 border border-amber-500/30 text-amber-200 rounded-bl-xs'
                  }`}>
                    {/* Role Label */}
                    <span className="block text-[10px] uppercase font-mono font-bold tracking-wider mb-1 opacity-75">
                      {isClient ? 'Tú (Cliente)' : isAi ? '✦ Asistente IA del Estudio' : '⚡ Tatuador (Respuesta Directa)'}
                    </span>

                    {/* Attached Image (e.g. healing tattoo) */}
                    {msg.image_url && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-white/15 max-w-xs shadow-lg">
                        <img src={msg.image_url} alt="Foto tatuaje" className="w-full h-auto object-cover max-h-56" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="whitespace-pre-line text-xs sm:text-sm">{msg.content}</div>

                    {/* Healing status badge if analyzed */}
                    {msg.healing_status && (
                      <div className="mt-2.5 pt-2 border-t border-white/10 text-xs flex items-center gap-1.5 font-semibold">
                        {msg.healing_status === 'normal' && <span className="text-emerald-400 font-bold">✅ Cicatrización Fisiológica Normal</span>}
                        {msg.healing_status === 'redness_mild' && <span className="text-amber-400 font-bold">⚠️ Enrojecimiento Leve Esperable</span>}
                        {msg.healing_status === 'alert_infection' && <span className="text-crimson-400 font-bold">🚨 Alerta: Posible Irritación Severa o Supuración</span>}
                      </div>
                    )}

                    {/* Quote Card if calculation generated */}
                    {msg.quote_data && (
                      <div className="mt-3 p-3 rounded-xl bg-black/40 border border-amber-500/30 text-xs space-y-1">
                        <div className="font-bold text-amber-400 flex items-center gap-1">
                          <span>💰 Estimación: {msg.quote_data.estimated_min}€ - {msg.quote_data.estimated_max}€</span>
                        </div>
                        <p className="text-[11px] text-ink-400">{msg.quote_data.disclaimer}</p>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-ink-500 mt-1 px-1 font-mono">
                    {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {/* Live Typing Indicator */}
            {isAiThinking && (
              <div className="flex flex-col items-start">
                <div className="p-3.5 rounded-2xl bg-ink-900 border border-crimson-500/30 text-ink-300 rounded-bl-xs flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-crimson-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-crimson-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs font-mono text-ink-400">El Asistente está escribiendo...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={(e) => handleSendMessage(e)} className="p-3.5 border-t border-white/10 bg-ink-900/90 backdrop-blur-md flex items-center gap-2">
            {/* Camera Button for healing tracker photos */}
            <label className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white cursor-pointer transition-colors border border-white/5 flex items-center justify-center shrink-0" title="Subir foto de tu tatuaje para análisis o referencia">
              <Camera className="w-5 h-5 text-crimson-500" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ej: Quiero presupuesto para pieza de 15cm a color en el antebrazo..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-ink-950 border border-white/10 text-sm text-white placeholder-ink-500 focus:outline-none focus:border-crimson-500 transition-colors"
            />

            <button
              type="submit"
              disabled={sendingMsg || (!inputText.trim())}
              className="p-3 rounded-xl bg-crimson-600 hover:bg-crimson-500 disabled:opacity-40 text-white transition-all shadow-md shadow-crimson-600/30 shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* BOOKING MODAL */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-crimson-500/30 bg-ink-950/95 relative shadow-2xl">
            <button
              onClick={() => setIsBookingOpen(false)}
              className="absolute top-5 right-5 text-ink-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-crimson-400 text-xs font-mono font-bold uppercase mb-1">
              <Calendar className="w-4 h-4" />
              <span>Agenda del Estudio</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-1">Reservar Cita</h2>
            <p className="text-xs text-ink-400 mb-6">Elige estudio, artista y selecciona el tipo de sesión</p>

            <form onSubmit={handleCreateBooking} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Estudio</label>
                <select
                  value={selectedStudioId}
                  onChange={(e) => setSelectedStudioId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500"
                >
                  {studios.map(s => <option key={s.id} value={s.id}>{s.name} ({s.address})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Tatuador</label>
                <select
                  value={selectedArtistId}
                  onChange={(e) => setSelectedArtistId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500"
                >
                  {artists.map(a => <option key={a.id} value={a.id}>{a.display_name} ({a.specialties?.join(', ') || 'Todo estilo'})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBookingType('design_consultation')}
                  className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition-all ${
                    bookingType === 'design_consultation'
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-md shadow-blue-500/10'
                      : 'bg-ink-900 text-ink-400 border-white/5'
                  }`}
                >
                  <span className="block font-bold mb-0.5">📜 Consulta de Diseño</span>
                  <span className="text-[10px] font-normal text-ink-400">30-45 min para planificar boceto</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingType('tattoo_session')}
                  className={`p-3.5 rounded-2xl border text-xs font-bold text-left transition-all ${
                    bookingType === 'tattoo_session'
                      ? 'bg-crimson-600/20 text-crimson-400 border-crimson-500/50 shadow-md shadow-crimson-600/10'
                      : 'bg-ink-900 text-ink-400 border-white/5'
                  }`}
                >
                  <span className="block font-bold mb-0.5">🩸 Sesión de Tatuaje</span>
                  <span className="text-[10px] font-normal text-ink-400">Aguja y tinta en cabina</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Fecha</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Hora</label>
                  <input
                    type="time"
                    required
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Descripción de la pieza / Zona anatómica</label>
                <textarea
                  rows={2}
                  value={bookingDescription}
                  onChange={(e) => setBookingDescription(e.target.value)}
                  placeholder="Ej: Daga con serpiente neotradicional en antebrazo derecho..."
                  className="w-full px-4 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500"
                />
              </div>

              <button
                type="submit"
                disabled={bookingSubmitting}
                className="w-full py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm shadow-lg shadow-crimson-600/30 transition-all hover:scale-[1.02]"
              >
                {bookingSubmitting ? 'Confirmando...' : 'Confirmar Reserva de Cita'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONSENT SIGNING MODAL WITH SIGNATURE PAD */}
      {selectedConsentApp && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-ink-950/95 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setSelectedConsentApp(null)}
              className="absolute top-5 right-5 text-ink-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Validez Sanitaria & RGPD</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-2">Consentimiento Informado</h2>
            <p className="text-xs text-ink-400 mb-6">
              Para la cita del {new Date(selectedConsentApp.start_time).toLocaleDateString('es-ES')} con {selectedConsentApp.artists?.display_name}.
            </p>

            <form onSubmit={handleSignConsent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">
                  DNI / NIE / Pasaporte *
                </label>
                <input
                  type="text"
                  required
                  value={dniNie}
                  onChange={(e) => setDniNie(e.target.value)}
                  placeholder="12345678X"
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white uppercase text-sm focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div className="bg-ink-900/80 p-4 rounded-2xl border border-white/5 space-y-3 text-ink-300">
                <div>
                  <span className="font-semibold block text-white mb-1">¿Padeces alguna alergia conocida (látex, tintas, metales, antisépticos)?</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="allergies" value="no" checked={allergiesAns === 'no'} onChange={() => setAllergiesAns('no')} />
                      <span>No</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="allergies" value="yes" checked={allergiesAns === 'yes'} onChange={() => setAllergiesAns('yes')} />
                      <span>Sí</span>
                    </label>
                  </div>
                </div>

                <div>
                  <span className="font-semibold block text-white mb-1">¿Tomas medicación anticoagulante o padeces problemas de coagulación o dérmicos?</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="medication" value="no" checked={medicationAns === 'no'} onChange={() => setMedicationAns('no')} />
                      <span>No</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="medication" value="yes" checked={medicationAns === 'yes'} onChange={() => setMedicationAns('yes')} />
                      <span>Sí</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Digital Signature Canvas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-ink-300 uppercase tracking-wider">
                    Firma Digital (con dedo o ratón) *
                  </label>
                  <button
                    type="button"
                    onClick={() => signaturePadRef.current?.clear()}
                    className="text-[11px] text-crimson-400 hover:text-crimson-300 underline"
                  >
                    Borrar firma
                  </button>
                </div>
                <div className="rounded-2xl border border-white/20 bg-ink-950 overflow-hidden shadow-inner">
                  <canvas ref={canvasRef} className="w-full cursor-crosshair touch-none" />
                </div>
              </div>

              <div className="text-[11px] text-ink-500 leading-tight">
                Al pulsar confirmar, aceptas que tu firma y los datos técnicos de verificación (IP y timestamp) quedarán registrados legalmente conforme a la normativa sanitaria.
              </div>

              <button
                type="submit"
                disabled={signingConsent}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
              >
                {signingConsent ? 'Registrando firma legal...' : 'Firmar Consentimiento Informado'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
