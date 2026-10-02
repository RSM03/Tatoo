'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Clock, CheckCircle2, AlertCircle, RefreshCw, RotateCcw } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface ArtistCopilotChatProps {
  artist: any;
  appointments: any[];
  onRefreshAppointments?: () => void;
}

interface CopilotMessage {
  id: string;
  sender: 'artist' | 'ai';
  text: string;
  createdAt: string;
}

const buildWelcomeMessage = (artistName?: string): CopilotMessage => ({
  id: 'welcome',
  sender: 'ai',
  text: `¡Hola, **${artistName || 'Tatuador'}**! 👋 Soy tu Copilot personal de Tatoo.\n\nPuedo ayudarte a gestionar tu trabajo diario sin rodeos:\n\n• 📅 **Consultar tu agenda:** Pregúntame qué citas tienes hoy, mañana o esta semana.\n• ➕ **Crear citas:** Pídeme que agende una cita (ej: *"crea una cita para mañana a las 11 con Laura"*).\n• 🔒 **Bloquear descansos:** Pídeme que bloquee huecos para comidas o descansos (ej: *"bloquea mañana de 14:00 a 15:30 para comer"*).\n• 📋 **Consentimientos legales:** Pregúntame quién no ha firmado su consentimiento informado.\n• ❓ **Dudas sobre la app:** Pregúntame cómo configurar tarifas, cómo descargar PDF de consentimientos o cómo funciona la suscripción de 50€/mes con Stripe.\n\n¿En qué te ayudo ahora?`,
  createdAt: new Date().toISOString()
});

export default function ArtistCopilotChat({
  artist,
  appointments,
  onRefreshAppointments
}: ArtistCopilotChatProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>(() => {
    if (typeof window !== 'undefined' && artist?.id) {
      try {
        const saved = localStorage.getItem(`tatoo_copilot_chat_${artist.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error reading saved copilot chat', e);
      }
    }
    return [buildWelcomeMessage(artist?.display_name)];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync state if artist changes
  useEffect(() => {
    if (!artist?.id || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(`tatoo_copilot_chat_${artist.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Error loading copilot chat for artist', e);
    }
    setMessages([buildWelcomeMessage(artist?.display_name)]);
  }, [artist?.id, artist?.display_name]);

  // Persist messages whenever updated
  useEffect(() => {
    if (!artist?.id || typeof window === 'undefined') return;
    try {
      localStorage.setItem(`tatoo_copilot_chat_${artist.id}`, JSON.stringify(messages));
    } catch (e) {
      console.warn('Error saving copilot chat', e);
    }
  }, [messages, artist?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleResetChat = () => {
    if (window.confirm('¿Quieres reiniciar la conversación con tu Copilot?')) {
      if (artist?.id && typeof window !== 'undefined') {
        localStorage.removeItem(`tatoo_copilot_chat_${artist.id}`);
      }
      setMessages([
        {
          id: 'welcome-' + Date.now(),
          sender: 'ai',
          text: `¡Hola, **${artist?.display_name || 'Tatuador'}**! Conversación reiniciada. ¿En qué te ayudo hoy con tu agenda o tus clientes?`,
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  const quickPrompts = [
    '📅 ¿Qué citas tengo hoy?',
    '➕ Crea una cita para mañana a las 11',
    '⏰ ¿Cuál es mi próxima cita?',
    '📋 ¿Quién no ha firmado el consentimiento?',
    '🔒 Bloquear 1 hora mañana para descanso',
    '💶 ¿Cómo configuro mis tarifas?'
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setInput('');
    const userMsg: CopilotMessage = {
      id: 'msg-' + Date.now(),
      sender: 'artist',
      text,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Send the last 8 messages for context so the LLM remembers previous turns
      const conversationHistory = messages.slice(-8).map(m => ({
        role: m.sender === 'artist' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await fetch('/api/chat/artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: artist?.id,
          studioId: artist?.studio_id,
          content: text,
          history: conversationHistory
        })
      });

      const data = await res.json();
      const aiReply = data.reply || 'He recibido tu solicitud.';

      setMessages(prev => [
        ...prev,
        {
          id: 'ai-' + Date.now(),
          sender: 'ai',
          text: aiReply,
          createdAt: new Date().toISOString()
        }
      ]);

      if ((data.data?.newBlock || data.data?.newAppointment || data.data?.deletedAppointmentId || data.data?.updatedAppointment) && onRefreshAppointments) {
        onRefreshAppointments();
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'ai-err-' + Date.now(),
          sender: 'ai',
          text: '⚠️ Disculpa, hubo un problema al conectar con tu asistente. Por favor, inténtalo de nuevo.',
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-ink-950/80 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col h-[720px] max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-crimson-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
              <span>Copilot IA del Tatuador</span>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                ONLINE
              </span>
            </h2>
            <p className="text-xs text-ink-400">
              Gestión directa de tu agenda, citas, descansos, consentimientos y soporte de la app
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetChat}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-400 hover:text-white transition-colors"
            title="Reiniciar conversación"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {onRefreshAppointments && (
            <button
              onClick={() => onRefreshAppointments()}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-400 hover:text-white transition-colors"
              title="Sincronizar agenda"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none text-xs">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 hover:text-white border border-white/5 hover:border-amber-500/30 transition-all font-medium"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m) => {
          const isAi = m.sender === 'ai';
          return (
            <div
              key={m.id}
              className={`flex gap-3 max-w-[85%] sm:max-w-[78%] ${
                isAi ? 'mr-auto items-start' : 'ml-auto flex-row-reverse items-start'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold ${
                  isAi
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-crimson-600 text-white shadow-md'
                }`}
              >
                {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  isAi
                    ? 'bg-ink-900 border border-white/10 text-ink-100 shadow-md'
                    : 'bg-crimson-600/90 text-white rounded-tr-none shadow-lg'
                }`}
              >
                {isAi ? (
                  <MarkdownRenderer content={m.text} />
                ) : (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                )}
                <span className="block text-[9.5px] opacity-40 mt-1.5 font-mono">
                  {new Date(m.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 items-center mr-auto">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl bg-ink-900 border border-white/10 text-xs text-ink-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Consultando tu agenda y procesando...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="pt-4 border-t border-white/10 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe a tu asistente (ej: '¿qué citas tengo hoy?' o 'bloquear mañana de 14:00 a 16:00')..."
          className="flex-1 px-4 py-3 rounded-2xl bg-ink-900 border border-white/10 text-white placeholder-ink-500 text-xs sm:text-sm focus:outline-none focus:border-amber-500/50 shadow-inner"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-crimson-600 hover:from-amber-500 hover:to-crimson-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-crimson-600/30 flex items-center gap-2 transition-all hover:scale-[1.02]"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
}
