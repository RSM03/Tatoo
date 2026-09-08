'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calendar,
  Clock,
  Sparkles,
  Sliders,
  Share2,
  FileText,
  MessageSquare,
  Plus,
  Coffee,
  AlertCircle,
  Camera,
  Send,
  UserCheck,
  Tag,
  CheckCircle,
  Save,
  Trash2
} from 'lucide-react';

export default function ArtistPortal({
  user,
  profile,
  artistId,
  onBackToStudio
}: {
  user: any;
  profile: any;
  artistId?: string;
  onBackToStudio?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'calendar' | 'chats' | 'pricing' | 'healing' | 'shares'>('calendar');
  const [artist, setArtist] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [artistInputText, setArtistInputText] = useState('');
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual Appointment / Break Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'walk_in' | 'break' | 'vacation'>('walk_in');
  const [modalTitle, setModalTitle] = useState('');
  const [modalDate, setModalDate] = useState('');
  const [modalStartTime, setModalStartTime] = useState('11:00');
  const [modalEndTime, setModalEndTime] = useState('14:00');
  const [walkInClientName, setWalkInClientName] = useState('');
  const [walkInClientPhone, setWalkInClientPhone] = useState('');

  // Pricing Rules State
  const [minFee, setMinFee] = useState(60);
  const [hourlyRate, setHourlyRate] = useState(80);
  const [smallPrice, setSmallPrice] = useState(60);
  const [mediumPrice, setMediumPrice] = useState(140);
  const [largePrice, setLargePrice] = useState(260);
  const [colorMultiplier, setColorMultiplier] = useState(1.25);
  const [savingPricing, setSavingPricing] = useState(false);

  // Healing Templates State
  const [normalHealingMsg, setNormalHealingMsg] = useState('');
  const [rednessHealingMsg, setRednessHealingMsg] = useState('');
  const [alertInfectionMsg, setAlertInfectionMsg] = useState('');
  const [savingHealing, setSavingHealing] = useState(false);

  // Share / Flash Upload State
  const [shareTitle, setShareTitle] = useState('');
  const [shareDesc, setShareDesc] = useState('');
  const [sharePriceHint, setSharePriceHint] = useState('');
  const [shareIsFlash, setShareIsFlash] = useState(true);
  const [shareImgUrl, setShareImgUrl] = useState('');
  const [uploadingShare, setUploadingShare] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadArtistData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadArtistData = async () => {
    setLoading(true);
    try {
      // 1. Fetch artist record (by specific artistId or user.id)
      let artQuery = supabase.from('artists').select('*');
      if (artistId) {
        artQuery = artQuery.eq('id', artistId);
      } else {
        artQuery = artQuery.eq('profile_id', user.id);
      }
      const { data: art } = await artQuery.maybeSingle();

      if (art) {
        setArtist(art);
        const rules = art.pricing_rules || {};
        setMinFee(rules.minimum_fee ?? 60);
        setHourlyRate(rules.hourly_rate ?? 80);
        setSmallPrice(rules.size_rates?.small?.base_price ?? 60);
        setMediumPrice(rules.size_rates?.medium?.base_price ?? 140);
        setLargePrice(rules.size_rates?.large?.base_price ?? 260);
        setColorMultiplier(rules.color_multiplier ?? 1.25);

        const hTemplates = art.healing_templates || {};
        setNormalHealingMsg(hTemplates.normal?.es || 'El tatuaje muestra una evolución normal de cicatrización.');
        setRednessHealingMsg(hTemplates.redness_mild?.es || 'Enrojecimiento leve propio de los primeros días.');
        setAlertInfectionMsg(hTemplates.alert_infection?.es || 'El tatuaje está supurando pus o con inflamación severa, necesitas...');

        // 2. Fetch artist appointments
        const { data: apps } = await supabase
          .from('appointments')
          .select(`
            *,
            clients (id, dni_nie, profiles (full_name, email, phone)),
            consent_forms (id, signed_at)
          `)
          .eq('artist_id', art.id)
          .order('start_time', { ascending: true });
        setAppointments(apps || []);

        // 3. Fetch chats with AI summaries & client names
        const { data: chatList } = await supabase
          .from('chats')
          .select(`
            *,
            clients (
              id,
              profiles (full_name, email, avatar_url)
            )
          `)
          .eq('artist_id', art.id)
          .order('updated_at', { ascending: false });

        setChats(chatList || []);
        if (chatList && chatList.length > 0) {
          selectChat(chatList[0]);
        }

        // 4. Fetch shares
        const { data: shrs } = await supabase
          .from('shares')
          .select('*')
          .eq('artist_id', art.id)
          .order('created_at', { ascending: false });
        setShares(shrs || []);
      }
    } catch (err) {
      console.error('Error loading artist data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectChat = async (chat: any) => {
    setSelectedChat(chat);
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: true });
    setChatMessages(msgs || []);
  };

  // Human Takeover: Toggle AI on / off for selected chat
  const handleToggleAi = async () => {
    if (!selectedChat) return;
    const newAiState = !selectedChat.ai_enabled;

    await supabase
      .from('chats')
      .update({
        ai_enabled: newAiState,
        status_badge: newAiState ? 'quoting' : 'takeover',
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedChat.id);

    setSelectedChat((prev: any) => ({ ...prev, ai_enabled: newAiState, status_badge: newAiState ? 'quoting' : 'takeover' }));
    setChats(prev => prev.map(c => c.id === selectedChat.id ? { ...c, ai_enabled: newAiState, status_badge: newAiState ? 'quoting' : 'takeover' } : c));
  };

  // Artist sends direct human reply in chat
  const handleSendArtistMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistInputText.trim() || !selectedChat) return;

    const content = artistInputText.trim();
    setArtistInputText('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChat.id,
          content,
          senderRole: 'artist'
        })
      });

      const data = await res.json();
      if (data.message) {
        setChatMessages(prev => [...prev, data.message]);
        setSelectedChat((prev: any) => ({ ...prev, ai_enabled: false, status_badge: 'takeover' }));
      }
    } catch (err) {
      console.error('Error sending artist message:', err);
    }
  };

  // Save updated pricing rules
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist) return;
    setSavingPricing(true);

    const updatedRules = {
      minimum_fee: Number(minFee),
      hourly_rate: Number(hourlyRate),
      size_rates: {
        small: { max_cm: 5, base_price: Number(smallPrice) },
        medium: { max_cm: 15, base_price: Number(mediumPrice) },
        large: { max_cm: 25, base_price: Number(largePrice) },
        xlarge: { max_cm: 999, base_price: Number(largePrice) * 1.8 }
      },
      color_multiplier: Number(colorMultiplier),
      complex_placement_multiplier: 1.15
    };

    try {
      const { error } = await supabase
        .from('artists')
        .update({ pricing_rules: updatedRules })
        .eq('id', artist.id);

      if (error) throw error;
      alert('¡Reglas de presupuesto actualizadas! El modelo de IA las utilizará inmediatamente.');
    } catch (err: any) {
      alert(`Error al guardar tarifas: ${err.message}`);
    } finally {
      setSavingPricing(false);
    }
  };

  // Save updated healing templates
  const handleSaveHealing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist) return;
    setSavingHealing(true);

    const updatedTemplates = {
      normal: { es: normalHealingMsg, en: normalHealingMsg },
      redness_mild: { es: rednessHealingMsg, en: rednessHealingMsg },
      alert_infection: { es: alertInfectionMsg, en: alertInfectionMsg }
    };

    try {
      const { error } = await supabase
        .from('artists')
        .update({ healing_templates: updatedTemplates })
        .eq('id', artist.id);

      if (error) throw error;
      alert('¡Plantillas de curación guardadas con éxito!');
    } catch (err: any) {
      alert(`Error al guardar plantillas: ${err.message}`);
    } finally {
      setSavingHealing(false);
    }
  };

  // Create Manual Walk-in or Break Space
  const handleCreateScheduleBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist) return;

    try {
      const startDateTime = new Date(`${modalDate}T${modalStartTime}:00`);
      const endDateTime = new Date(`${modalDate}T${modalEndTime}:00`);

      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artist.id,
          studioId: artist.studio_id,
          appointmentType: modalType === 'walk_in' ? 'tattoo_session' : modalType === 'break' ? 'break_blocked' : 'vacation',
          title: modalTitle || (modalType === 'walk_in' ? 'Cita Walk-in' : modalType === 'break' ? 'Espacio de Descanso' : 'Vacaciones'),
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          walkInName: modalType === 'walk_in' ? (walkInClientName.trim() || 'Cliente No Registrado') : null,
          walkInPhone: modalType === 'walk_in' ? walkInClientPhone.trim() : null,
          status: 'confirmed'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar evento');

      setAppointments(prev => [...prev, data.appointment]);
      setIsModalOpen(false);
      setWalkInClientName('');
      setWalkInClientPhone('');
      setModalTitle('');
      alert('¡Bloque añadido al calendario con éxito!');
    } catch (err: any) {
      alert(`Error al añadir evento: ${err.message}`);
    }
  };

  // Upload new photo to Share section
  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist || !shareImgUrl) return;
    setUploadingShare(true);

    try {
      const { data, error } = await supabase
        .from('shares')
        .insert({
          artist_id: artist.id,
          studio_id: artist.studio_id || (await supabase.from('studios').select('id').limit(1).single()).data?.id,
          title: shareTitle.trim() || 'Nuevo Trabajo',
          description: shareDesc.trim(),
          image_url: shareImgUrl,
          is_flash: shareIsFlash,
          price_hint: sharePriceHint ? Number(sharePriceHint) : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setShares(prev => [data, ...prev]);
      setShareTitle('');
      setShareDesc('');
      setSharePriceHint('');
      setShareImgUrl('');
      alert('¡Foto subida a la sección Share! Se incluirá automáticamente en la newsletter mensual.');
    } catch (err: any) {
      alert(`Error al publicar en Share: ${err.message}`);
    } finally {
      setUploadingShare(false);
    }
  };

  const handleShareFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setShareImgUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
      {onBackToStudio && (
        <div className="mb-6 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <span className="font-bold">Consola Individual de Tatuador:</span>
            <span className="underline font-semibold">{artist?.display_name || 'Tatuador'}</span>
          </div>
          <button
            onClick={onBackToStudio}
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            ← Volver a la Vista General del Estudio
          </button>
        </div>
      )}

      {/* Artist Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-crimson-400 font-bold">Panel del Tatuador</span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            {artist?.display_name || profile?.full_name || 'Tatuador'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setModalType('walk_in'); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-crimson-500" />
            <span>+ Cita Walk-in</span>
          </button>
          <button
            onClick={() => { setModalType('break'); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Descanso / Vacaciones</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 mb-8 pb-3">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'calendar' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <Calendar className="w-4 h-4 text-crimson-500" />
          <span>Agenda & Citas ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('chats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'chats' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>Bandeja de Chats ({chats.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'pricing' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 text-blue-400" />
          <span>Reglas de Presupuesto (IA)</span>
        </button>

        <button
          onClick={() => setActiveTab('healing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'healing' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Plantillas de Curación</span>
        </button>

        <button
          onClick={() => setActiveTab('shares')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === 'shares' ? 'bg-white/10 text-white' : 'text-ink-400 hover:text-white'
          }`}
        >
          <Share2 className="w-4 h-4 text-purple-400" />
          <span>Sección Share & Newsletter</span>
        </button>
      </div>

      {/* TAB 1: CALENDAR & APPOINTMENTS */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {appointments.map((app) => {
              const startDate = new Date(app.start_time);
              const endDate = new Date(app.end_time);
              const isBreak = app.appointment_type === 'break_blocked' || app.appointment_type === 'vacation';
              const clientName = app.clients?.profiles?.full_name || app.walk_in_name || 'Cita Bloqueada';
              const isSigned = app.consent_forms && app.consent_forms.length > 0;

              return (
                <div key={app.id} className={`p-5 rounded-2xl border flex flex-col justify-between ${
                  isBreak ? 'bg-amber-950/20 border-amber-500/20 text-amber-200' : 'glass-panel border-white/5'
                }`}>
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                        {app.appointment_type === 'design_consultation' ? 'Consulta Diseño' : isBreak ? 'Descanso/Bloqueo' : 'Sesión Tatuaje'}
                      </span>
                      <span className="text-xs font-mono opacity-80">{app.status}</span>
                    </div>

                    <h3 className="font-bold text-white text-base mb-1">{clientName}</h3>
                    {app.description && <p className="text-xs text-ink-400 mb-3 line-clamp-2">{app.description}</p>}

                    <div className="flex items-center gap-3 text-xs text-ink-300 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-crimson-500" />
                        <span>{startDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {!isBreak && (
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className={isSigned ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                        {isSigned ? '✓ Consentimiento firmado' : '⚠️ Firma pendiente'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CHATS WITH AI SUMMARY & HUMAN TAKEOVER */}
      {activeTab === 'chats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[700px]">
          {/* Left Column: Chat list with AI 1-line summary descriptors */}
          <div className="glass-panel rounded-2xl border border-white/10 p-3 overflow-y-auto space-y-2">
            <h3 className="text-xs font-bold text-ink-400 uppercase tracking-wider px-2 py-1">Conversaciones</h3>
            {chats.map((c) => {
              const clientName = c.clients?.profiles?.full_name || 'Cliente';
              const isSelected = selectedChat?.id === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => selectChat(c)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-crimson-600/15 border-crimson-500/40 text-white'
                      : 'bg-ink-900/60 border-white/5 text-ink-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">{clientName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      c.ai_enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {c.ai_enabled ? 'IA' : 'HUMANO'}
                    </span>
                  </div>

                  {/* AI Generated 1-Line Summary Descriptor */}
                  <p className="text-xs text-amber-300/90 font-medium line-clamp-2">
                    ✨ {c.ai_summary || 'Consulta en curso...'}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Chat Window with Takeover Control */}
          <div className="md:col-span-2 glass-panel rounded-2xl border border-white/10 flex flex-col overflow-hidden">
            {selectedChat ? (
              <>
                {/* Chat Top Bar with Human Takeover Button */}
                <div className="p-4 border-b border-white/10 bg-ink-900/80 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {selectedChat.clients?.profiles?.full_name || 'Cliente'}
                    </h3>
                    <p className="text-xs text-ink-400">
                      Estado: <strong className="text-amber-400 font-mono">{selectedChat.status_badge}</strong>
                    </p>
                  </div>

                  <button
                    onClick={handleToggleAi}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedChat.ai_enabled
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{selectedChat.ai_enabled ? 'Pausar IA (Tomar Control)' : 'Reanudar Asistente IA'}</span>
                  </button>
                </div>

                {/* Messages Container */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  {chatMessages.map((msg) => {
                    const isClient = msg.sender_role === 'client';
                    const isAi = msg.sender_role === 'ai_assistant';

                    return (
                      <div key={msg.id} className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}>
                        <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm ${
                          isClient
                            ? 'bg-ink-900 border border-white/10 text-white'
                            : isAi
                            ? 'bg-white/5 border border-white/10 text-ink-200'
                            : 'bg-crimson-600 text-white'
                        }`}>
                          <span className="block text-[10px] uppercase font-bold tracking-wider mb-1 opacity-70">
                            {isClient ? 'Cliente' : isAi ? 'Asistente IA' : 'Tú (Tatuador)'}
                          </span>

                          {msg.image_url && (
                            <div className="mb-2 rounded-xl overflow-hidden border border-white/10 max-w-xs">
                              <img src={msg.image_url} alt="Adjunto" className="w-full h-auto object-cover max-h-56" />
                            </div>
                          )}

                          <div className="whitespace-pre-line">{msg.content}</div>

                          {msg.healing_status && (
                            <div className="mt-2 pt-2 border-t border-white/10 text-xs font-semibold">
                              {msg.healing_status === 'normal' && <span className="text-emerald-400">✅ Curación Normal</span>}
                              {msg.healing_status === 'redness_mild' && <span className="text-amber-400">⚠️ Enrojecimiento Leve</span>}
                              {msg.healing_status === 'alert_infection' && <span className="text-crimson-400">🚨 Alerta: Supuración / Pus</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Direct Artist Reply Bar */}
                <form onSubmit={handleSendArtistMessage} className="p-3 border-t border-white/10 bg-ink-900/60 flex items-center gap-2">
                  <input
                    type="text"
                    value={artistInputText}
                    onChange={(e) => setArtistInputText(e.target.value)}
                    placeholder="Escribe como tatuador (pausará automáticamente la IA)..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-ink-950 border border-white/10 text-sm text-white placeholder-ink-600 focus:outline-none focus:border-crimson-500"
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white transition-all shadow-md shadow-crimson-600/30"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">
                Selecciona una conversación para intervenir
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PRICING RULES (FOLLOWED BY EDEN AI) */}
      {activeTab === 'pricing' && (
        <div className="max-w-2xl glass-panel p-8 rounded-3xl border border-white/10">
          <div className="flex items-center gap-2 text-crimson-500 text-xs font-mono font-bold uppercase mb-2">
            <Sliders className="w-4 h-4" />
            <span>Tarifas y Reglas para el Modelo IA</span>
          </div>
          <h2 className="font-display text-xl font-bold text-white mb-2">Reglas de Presupuesto</h2>
          <p className="text-xs text-ink-400 mb-6 leading-relaxed">
            El modelo IA seguirá estrictamente estas reglas cuando un cliente le pida un presupuesto aproximado en el chat.
          </p>

          <form onSubmit={handleSavePricing} className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  Tarifa Mínima de Apertura (€)
                </label>
                <input
                  type="number"
                  value={minFee}
                  onChange={(e) => setMinFee(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white focus:outline-none focus:border-crimson-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                  Precio por Hora (€)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white focus:outline-none focus:border-crimson-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 space-y-3">
              <span className="block text-xs font-bold text-white uppercase tracking-wider">Tramos por Medidas (cm)</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-ink-400 mb-1">Pequeño (&lt;5cm)</label>
                  <input
                    type="number"
                    value={smallPrice}
                    onChange={(e) => setSmallPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-400 mb-1">Medio (5-15cm)</label>
                  <input
                    type="number"
                    value={mediumPrice}
                    onChange={(e) => setMediumPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-400 mb-1">Grande (&gt;15cm)</label>
                  <input
                    type="number"
                    value={largePrice}
                    onChange={(e) => setLargePrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">
                Multiplicador por Color (Ej: 1.25 = +25%)
              </label>
              <input
                type="number"
                step="0.05"
                value={colorMultiplier}
                onChange={(e) => setColorMultiplier(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white focus:outline-none focus:border-crimson-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingPricing}
              className="mt-4 w-full py-3 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm shadow-lg shadow-crimson-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingPricing ? 'Guardando...' : 'Actualizar Reglas de Presupuesto'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: HEALING PREDEFINED RESPONSES */}
      {activeTab === 'healing' && (
        <div className="max-w-2xl glass-panel p-8 rounded-3xl border border-white/10">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase mb-2">
            <Camera className="w-4 h-4" />
            <span>Pautas Clínicas Predefinidas por el Tatuador</span>
          </div>
          <h2 className="font-display text-xl font-bold text-white mb-2">Respuestas de Cicatrización</h2>
          <p className="text-xs text-ink-400 mb-6 leading-relaxed">
            Cuando un cliente mande una foto de su tatuaje al chatbot, la IA evaluará la imagen y le responderá con tus pautas exactas para cada caso.
          </p>

          <form onSubmit={handleSaveHealing} className="space-y-5 text-sm">
            <div>
              <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">
                1. Estado Normal / Buena evolución
              </label>
              <textarea
                rows={3}
                value={normalHealingMsg}
                onChange={(e) => setNormalHealingMsg(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                2. Enrojecimiento Leve (Primeros 3-4 días)
              </label>
              <textarea
                rows={3}
                value={rednessHealingMsg}
                onChange={(e) => setRednessHealingMsg(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-crimson-400 uppercase tracking-wider mb-1.5">
                3. Alerta de Supuración / Pus / Posible Infección
              </label>
              <textarea
                rows={3}
                value={alertInfectionMsg}
                onChange={(e) => setAlertInfectionMsg(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white focus:outline-none focus:border-crimson-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingHealing}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{savingHealing ? 'Guardando...' : 'Guardar Pautas de Curación'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: SHARE SECTION & MONTHLY NEWSLETTER PUBLISHER */}
      {activeTab === 'shares' && (
        <div className="space-y-8">
          {/* Upload Form */}
          <div className="max-w-2xl glass-panel p-6 sm:p-8 rounded-3xl border border-white/10">
            <h2 className="font-display text-xl font-bold text-white mb-1">Subir a Sección Share</h2>
            <p className="text-xs text-ink-400 mb-6">
              Las fotos que subas aquí se envían automáticamente el día 1 de cada mes en la newsletter a los clientes que se hayan tatuado contigo.
            </p>

            <form onSubmit={handleCreateShare} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Título del diseño / Flash</label>
                  <input
                    type="text"
                    required
                    value={shareTitle}
                    onChange={(e) => setShareTitle(e.target.value)}
                    placeholder="Ej: Flash Tigre Tradicional"
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Precio orientativo (€)</label>
                  <input
                    type="number"
                    value={sharePriceHint}
                    onChange={(e) => setSharePriceHint(e.target.value)}
                    placeholder="Ej: 120"
                    className="w-full px-4 py-2.5 rounded-xl bg-ink-900 border border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-300 uppercase tracking-wider mb-1.5">Seleccionar Foto</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleShareFileSelected}
                  className="w-full text-xs text-ink-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-crimson-600 file:text-white hover:file:bg-crimson-500 cursor-pointer"
                />
              </div>

              {shareImgUrl && (
                <div className="max-w-xs rounded-xl overflow-hidden border border-white/10">
                  <img src={shareImgUrl} alt="Preview" className="w-full h-auto object-cover max-h-48" />
                </div>
              )}

              <button
                type="submit"
                disabled={uploadingShare || !shareImgUrl}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all"
              >
                {uploadingShare ? 'Publicando...' : 'Publicar en Share'}
              </button>
            </form>
          </div>

          {/* Grid of uploaded shares */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Tus Publicaciones Recientes ({shares.length})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {shares.map((s) => (
                <div key={s.id} className="glass-panel rounded-2xl overflow-hidden border border-white/5 group">
                  <div className="h-48 w-full bg-ink-900 overflow-hidden relative">
                    <img src={s.image_url} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    {s.price_hint && (
                      <span className="absolute bottom-2 right-2 bg-black/80 text-amber-400 font-bold text-xs px-2 py-0.5 rounded-md backdrop-blur-md">
                        {s.price_hint} €
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-sm text-white truncate">{s.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL WALK-IN OR BREAK BLOCK */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/10 relative">
            <h2 className="font-display text-xl font-bold text-white mb-4">
              {modalType === 'walk_in' ? 'Añadir Cita Manual (Walk-in)' : 'Bloquear Descanso o Vacaciones'}
            </h2>

            <form onSubmit={handleCreateScheduleBlock} className="space-y-4 text-xs">
              {modalType === 'walk_in' ? (
                <>
                  <div>
                    <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">Nombre del Cliente *</label>
                    <input
                      type="text"
                      required
                      value={walkInClientName}
                      onChange={(e) => setWalkInClientName(e.target.value)}
                      placeholder="Cliente sin registro"
                      className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">Teléfono</label>
                    <input
                      type="tel"
                      value={walkInClientPhone}
                      onChange={(e) => setWalkInClientPhone(e.target.value)}
                      placeholder="+34 600 000 000"
                      className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">Motivo del Bloqueo</label>
                  <input
                    type="text"
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    placeholder="Ej: Descanso almuerzo / Viaje convención"
                    className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">Fecha *</label>
                <input
                  type="date"
                  required
                  value={modalDate}
                  onChange={(e) => setModalDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">Hora Inicio *</label>
                  <input
                    type="time"
                    required
                    value={modalStartTime}
                    onChange={(e) => setModalStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-ink-300 uppercase tracking-wider mb-1">Hora Fin *</label>
                  <input
                    type="time"
                    required
                    value={modalEndTime}
                    onChange={(e) => setModalEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-ink-900 border border-white/10 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold"
                >
                  Guardar en Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
