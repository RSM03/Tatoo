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
  Info
} from 'lucide-react';
import SignaturePad from 'signature_pad';

export default function ClientPortal({ user, profile }: { user: any; profile: any }) {
  const [activeTab, setActiveTab] = useState<'appointments' | 'chat' | 'history'>('appointments');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [studios, setStudios] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
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
  }, [messages]);

  // Initialize signature pad when modal opens
  useEffect(() => {
    if (selectedConsentApp && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement?.clientWidth || 450;
      canvas.height = 180;
      signaturePadRef.current = new SignaturePad(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        penColor: '#ffffff'
      });
    }
  }, [selectedConsentApp]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get client ID from clients table
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

      // 3. Fetch studios & artists for booking & chat
      const { data: stds } = await supabase.from('studios').select('id, name, address');
      const { data: arts } = await supabase.from('artists').select('id, display_name, studio_id, specialties');
      setStudios(stds || []);
      setArtists(arts || []);

      if (stds && stds.length > 0) setSelectedStudioId(stds[0].id);
      if (arts && arts.length > 0) setSelectedArtistId(arts[0].id);

      // 4. Fetch or create active chat with primary artist
      if (clientId && arts && arts.length > 0) {
        const primaryArtist = arts[0];
        let { data: chat } = await supabase
          .from('chats')
          .select('*')
          .eq('client_id', clientId)
          .eq('artist_id', primaryArtist.id)
          .maybeSingle();

        if (!chat) {
          const { data: newChat } = await supabase
            .from('chats')
            .insert({
              studio_id: primaryArtist.studio_id || stds?.[0]?.id,
              artist_id: primaryArtist.id,
              client_id: clientId,
              ai_enabled: true,
              status_badge: 'quoting'
            })
            .select()
            .single();
          chat = newChat;
        }

        setActiveChat(chat);
        if (chat) {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: true });
          setMessages(msgs || []);
        }
      }

    } catch (err) {
      console.error('Error loading client portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, uploadedImgUrl?: string) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !uploadedImgUrl) || !activeChat || sendingMsg) return;

    const userText = inputText.trim();
    setInputText('');
    setSendingMsg(true);

    // Optimistic UI push
    const tempId = 'temp-' + Date.now();
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        sender_role: 'client',
        content: userText || 'Foto adjunta',
        image_url: uploadedImgUrl,
        created_at: new Date().toISOString()
      }
    ]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChat.id,
          content: userText,
          imageUrl: uploadedImgUrl,
          senderRole: 'client',
          lang: profile?.language || 'es'
        })
      });

      const data = await res.json();
      if (data.aiResponse) {
        setMessages(prev => [...prev.filter(m => m.id !== tempId), data.message, data.aiResponse]);
      } else if (data.message) {
        setMessages(prev => [...prev.filter(m => m.id !== tempId), data.message]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSendingMsg(false);
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

  // Handle New Booking Creation
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
      // Duration: 45 min for consultation, 3h for tattoo session
      const durationHours = bookingType === 'design_consultation' ? 0.75 : 3;
      const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);

      const { data: newApp, error } = await supabase
        .from('appointments')
        .insert({
          studio_id: selectedStudioId,
          artist_id: selectedArtistId,
          client_id: clientId,
          appointment_type: bookingType,
          title: bookingType === 'design_consultation' ? 'Consulta de Diseño' : 'Sesión de Tatuaje',
          description: bookingDescription,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: 'pending'
        })
        .select(`
          *,
          studios (id, name, address),
          artists (id, display_name)
        `)
        .single();

      if (error) throw error;

      setAppointments(prev => [...prev, newApp]);
      setIsBookingOpen(false);
      setBookingDescription('');
      alert('¡Cita solicitada con éxito! El estudio la revisará y confirmará.');
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

      alert('¡Consentimiento informado firmado legalmente con éxito!');
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
      {/* Client Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-blue-400 font-bold">Portal del Cliente</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            Hola, {profile?.full_name || 'Cliente'}
          </h1>
        </div>

        <button
          onClick={() => setIsBookingOpen(true)}
          className="flex items-center gap-2 bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-crimson-600/30 transition-all hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Reservar Cita</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-white/10 mb-8 pb-3">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'appointments' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 text-crimson-500" />
          <span>Mis Citas ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'chat' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>Chat Asistente IA & Tatuador</span>
        </button>
      </div>

      {/* TAB 1: APPOINTMENTS */}
      {activeTab === 'appointments' && (
        <div className="space-y-6">
          {appointments.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl border border-white/5">
              <Calendar className="w-12 h-12 text-ink-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No tienes citas programadas</h3>
              <p className="text-sm text-ink-400 max-w-sm mx-auto mb-6">
                Reserva una consulta de diseño o una sesión completa de tatuaje con tu artista favorito.
              </p>
              <button
                onClick={() => setIsBookingOpen(true)}
                className="inline-flex items-center gap-2 bg-crimson-600 hover:bg-crimson-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Pedir Primera Cita</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((app) => {
                const startDate = new Date(app.start_time);
                const isSigned = app.consent_forms && app.consent_forms.length > 0;

                return (
                  <div key={app.id} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          app.appointment_type === 'design_consultation'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-crimson-500/10 text-crimson-400 border-crimson-500/20'
                        }`}>
                          {app.appointment_type === 'design_consultation' ? 'Consulta Diseño' : 'Sesión de Tatuaje'}
                        </span>

                        <span className="text-xs text-ink-400 font-mono">
                          {app.status === 'confirmed' ? '✅ Confirmada' : app.status === 'pending' ? '⏳ Pendiente' : app.status}
                        </span>
                      </div>

                      <h3 className="font-display text-lg font-bold text-white mb-1">
                        {app.title || 'Cita con ' + app.artists?.display_name}
                      </h3>
                      <p className="text-xs text-ink-400 mb-4">
                        Artista: <strong className="text-ink-200">{app.artists?.display_name}</strong> · Estudio: <strong className="text-ink-200">{app.studios?.name}</strong> ({app.studios?.address})
                      </p>

                      <div className="flex items-center gap-4 text-xs text-ink-300 mb-4 bg-ink-900/60 p-3 rounded-xl border border-white/5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-crimson-500" />
                          <span>{startDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>{startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Legal Consent Signing Status */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        {isSigned ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-4 h-4" /> Consentimiento firmado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                            <AlertTriangle className="w-4 h-4" /> Firma pendiente
                          </span>
                        )}
                      </div>

                      {!isSigned && (
                        <button
                          onClick={() => setSelectedConsentApp(app)}
                          className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          <span>Firmar Consentimiento</span>
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
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[650px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10 bg-ink-900/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-crimson-600 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                AI
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Asistente de {artists[0]?.display_name || 'Tatuador'}</span>
                  {activeChat?.ai_enabled ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      ● IA Activa
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                      ● Tatuador en directo
                    </span>
                  )}
                </h3>
                <p className="text-xs text-ink-400">Pregunta dudas, pide presupuesto por cm o envía foto de curación</p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-ink-500 text-xs">
                <Sparkles className="w-8 h-8 text-amber-400/50 mx-auto mb-2" />
                <p>Escribe tu mensaje para calcular presupuestos o pulsa en 📷 para enviar foto de tu tatuaje.</p>
              </div>
            )}

            {messages.map((msg) => {
              const isClient = msg.sender_role === 'client';
              const isAi = msg.sender_role === 'ai_assistant';

              return (
                <div key={msg.id} className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed ${
                    isClient
                      ? 'bg-crimson-600 text-white rounded-br-xs'
                      : isAi
                      ? 'bg-ink-900 border border-white/10 text-ink-100 rounded-bl-xs'
                      : 'bg-amber-600/20 border border-amber-500/30 text-amber-200 rounded-bl-xs'
                  }`}>
                    {/* Role Label */}
                    <span className="block text-[10px] uppercase font-bold tracking-wider mb-1 opacity-70">
                      {isClient ? 'Tú' : isAi ? 'Asistente IA' : 'Tatuador (Intervención)'}
                    </span>

                    {/* Attached Image (e.g. healing tattoo) */}
                    {msg.image_url && (
                      <div className="mb-2.5 rounded-xl overflow-hidden border border-white/10 max-w-xs">
                        <img src={msg.image_url} alt="Foto tatuaje" className="w-full h-auto object-cover max-h-56" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="whitespace-pre-line">{msg.content}</div>

                    {/* Healing status badge if analyzed */}
                    {msg.healing_status && (
                      <div className="mt-2 pt-2 border-t border-white/10 text-xs flex items-center gap-1.5 font-semibold">
                        {msg.healing_status === 'normal' && <span className="text-emerald-400">✅ Cicatrización Normal</span>}
                        {msg.healing_status === 'redness_mild' && <span className="text-amber-400">⚠️ Enrojecimiento Leve</span>}
                        {msg.healing_status === 'alert_infection' && <span className="text-crimson-400">🚨 Posible Inflamación / Pus</span>}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-ink-500 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={(e) => handleSendMessage(e)} className="p-3 border-t border-white/10 bg-ink-900/60 flex items-center gap-2">
            {/* Camera Button for healing tracker photos */}
            <label className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white cursor-pointer transition-colors" title="Subir foto de curación o referencia">
              <Camera className="w-5 h-5 text-crimson-500" />
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ej: Quiero presupuesto para pieza de 15cm a color en antebrazo..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-ink-950 border border-white/10 text-sm text-white placeholder-ink-600 focus:outline-none focus:border-crimson-500 transition-colors"
            />

            <button
              type="submit"
              disabled={sendingMsg || !inputText.trim()}
              className="p-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 disabled:opacity-40 text-white transition-all shadow-md shadow-crimson-600/30"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {/* BOOKING MODAL */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-white/10 relative">
            <button
              onClick={() => setIsBookingOpen(false)}
              className="absolute top-5 right-5 text-ink-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-display text-xl font-bold text-white mb-1">Reservar Cita</h2>
            <p className="text-xs text-ink-400 mb-6">Elige tu estudio, artista y modalidad de cita</p>

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
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    bookingType === 'design_consultation'
                      ? 'bg-blue-600/20 text-blue-400 border-blue-500/40'
                      : 'bg-ink-900 text-ink-400 border-white/5'
                  }`}
                >
                  <span className="block font-bold">Consulta de Diseño</span>
                  <span className="text-[10px] font-normal text-ink-400">30-45 min para planificar pieza</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingType('tattoo_session')}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all ${
                    bookingType === 'tattoo_session'
                      ? 'bg-crimson-600/20 text-crimson-400 border-crimson-500/40'
                      : 'bg-ink-900 text-ink-400 border-white/5'
                  }`}
                >
                  <span className="block font-bold">Sesión de Tatuaje</span>
                  <span className="text-[10px] font-normal text-ink-400">Tatuar pieza en piel</span>
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
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Descripción de la idea / Zona</label>
                <textarea
                  rows={2}
                  value={bookingDescription}
                  onChange={(e) => setBookingDescription(e.target.value)}
                  placeholder="Ej: Lobo geométrico en el antebrazo derecho..."
                  className="w-full px-4 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm focus:outline-none focus:border-crimson-500"
                />
              </div>

              <button
                type="submit"
                disabled={bookingSubmitting}
                className="w-full py-3 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm shadow-lg shadow-crimson-600/30 transition-all"
              >
                {bookingSubmitting ? 'Confirmando...' : 'Confirmar Reserva'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONSENT SIGNING MODAL WITH SIGNATURE PAD */}
      {selectedConsentApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-white/10 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedConsentApp(null)}
              className="absolute top-5 right-5 text-ink-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase mb-1">
              <FileSignature className="w-4 h-4" />
              <span>Validez Legal & RGPD</span>
            </div>
            <h2 className="font-display text-xl font-bold text-white mb-2">Consentimiento Informado</h2>
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

              <div className="bg-ink-900/80 p-4 rounded-xl border border-white/5 space-y-3 text-ink-300">
                <div>
                  <span className="font-semibold block text-white mb-1">¿Padeces alguna alergia conocida (látex, tintas, metales)?</span>
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
                  <span className="font-semibold block text-white mb-1">¿Tomas medicación anticoagulante o padeces problemas dérmicos?</span>
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
                <div className="rounded-xl border border-white/20 bg-ink-950 overflow-hidden">
                  <canvas ref={canvasRef} className="w-full cursor-crosshair touch-none" />
                </div>
              </div>

              <div className="text-[11px] text-ink-500 leading-tight">
                Al pulsar confirmar, aceptas que tu firma y los datos técnicos de verificación (IP y timestamp) quedarán registrados legalmente conforme a la normativa sanitaria.
              </div>

              <button
                type="submit"
                disabled={signingConsent}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-ink-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all"
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
