'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { translations, type Language } from '@/lib/i18n';
import {
  Calendar,
  Sparkles,
  ShieldCheck,
  Camera,
  Mail,
  Clock,
  ArrowRight,
  CheckCircle2,
  Sliders,
  HeartHandshake,
  Users,
  Eye,
  FileSignature,
  Flame,
  Palette,
  Droplets,
  Layers
} from 'lucide-react';

export default function HomePage() {
  const [lang, setLang] = useState<Language>('es');

  useEffect(() => {
    const saved = localStorage.getItem('tatoo_lang') as Language;
    if (saved) setLang(saved);

    const handleLangChange = () => {
      const updated = localStorage.getItem('tatoo_lang') as Language;
      if (updated) setLang(updated);
    };

    window.addEventListener('languageChange', handleLangChange);
    return () => window.removeEventListener('languageChange', handleLangChange);
  }, []);

  const t = translations[lang];

  return (
    <div className="flex flex-col flex-1">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 px-4 border-b border-white/5">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-crimson-600/25 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
          {/* Marked Tattoo Studio Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-crimson-950/70 border border-crimson-500/50 text-xs font-mono font-bold text-crimson-300 mb-6 backdrop-blur-md shadow-xl shadow-crimson-600/20">
            <span className="text-amber-400">✦</span>
            <Flame className="w-4 h-4 text-crimson-500 animate-pulse" />
            <span className="tracking-wider uppercase">SISTEMA PROFESIONAL PARA ESTUDIOS DE TATUAJE & ARTE CORPORAL</span>
            <span className="text-amber-400">✦</span>
          </div>

          {/* Main Headline with Dramatic Ink Styling */}
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white max-w-5xl leading-[1.08] mb-6 tattoo-heading">
            El Ecosistema Inteligente de <span className="bg-gradient-to-r from-crimson-500 via-amber-300 to-crimson-400 bg-clip-text text-transparent drop-shadow-[0_4px_25px_rgba(217,4,41,0.5)]">Aguja, Tinta y Citas</span>
          </h1>

          {/* Subtitle */}
          <p className="text-ink-300 text-lg sm:text-xl max-w-2xl font-normal leading-relaxed mb-10">
            Cotiza piezas automáticamente según centímetros y colores, supervisa la cicatrización con visión artificial contra infecciones, agenda citas en tiempo real y firma consentimientos sanitarios con validez legal.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-crimson-600 via-crimson-600 to-crimson-700 hover:from-crimson-500 hover:to-crimson-600 text-white font-extrabold text-base shadow-2xl shadow-crimson-600/40 flex items-center justify-center gap-2.5 transition-all hover:scale-105 border border-crimson-400/50"
            >
              <span>Comenzar Ahora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-ink-950/90 hover:bg-white/10 border border-white/20 text-white font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg hover:border-crimson-500/50"
            >
              <span>Acceder al Panel</span>
            </Link>
          </div>

          {/* Marked Tattoo Style Showcase Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
            <span className="text-xs font-mono font-bold tracking-wider px-3.5 py-1 rounded-xl bg-ink-950/90 border border-crimson-500/40 text-ink-200 shadow-md flex items-center gap-1.5">
              <span className="text-crimson-500">✦</span> BLACKWORK & DARK ART
            </span>
            <span className="text-xs font-mono font-bold tracking-wider px-3.5 py-1 rounded-xl bg-ink-950/90 border border-crimson-500/40 text-ink-200 shadow-md flex items-center gap-1.5">
              <span className="text-crimson-500">🩸</span> TRADICIONAL & NEO
            </span>
            <span className="text-xs font-mono font-bold tracking-wider px-3.5 py-1 rounded-xl bg-ink-950/90 border border-amber-500/40 text-ink-200 shadow-md flex items-center gap-1.5">
              <span className="text-amber-400">🗡️</span> REALISMO & MICRO-INK
            </span>
            <span className="text-xs font-mono font-bold tracking-wider px-3.5 py-1 rounded-xl bg-ink-950/90 border border-amber-500/40 text-ink-200 shadow-md flex items-center gap-1.5">
              <span className="text-amber-400">⚡</span> FINE LINE & GEOMÉTRICO
            </span>
          </div>

          {/* Fast Features Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 pt-14 border-t border-white/10 mt-14 w-full max-w-4xl">
            <div className="tattoo-card p-5 rounded-2xl flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-crimson-600/15 border border-crimson-500/30 flex items-center justify-center text-crimson-400">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-white">Agenda & Horarios</span>
              <span className="text-xs text-ink-400">Huecos libres y privacidad RGPD</span>
            </div>
            <div className="tattoo-card p-5 rounded-2xl flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-white">Presupuestos con IA</span>
              <span className="text-xs text-ink-400">Cálculo exacto por cm, zona y color</span>
            </div>
            <div className="tattoo-card p-5 rounded-2xl flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-crimson-600/15 border border-crimson-500/30 flex items-center justify-center text-crimson-400">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-white">Scanner Curación</span>
              <span className="text-xs text-ink-400">Visión IA contra infecciones dérmicas</span>
            </div>
            <div className="tattoo-card p-5 rounded-2xl flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FileSignature className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-white">Consentimiento Digital</span>
              <span className="text-xs text-ink-400">Firma ágil con validez legal sanitaria</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE TWO PORTALS: ESTUDIOS & CLIENTES */}
      <section className="py-20 px-4 bg-ink-950/80">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-crimson-500 text-xs font-mono font-bold tracking-widest uppercase">Estructura Adaptada</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
              Pensado para el flujo real del estudio de tatuaje
            </h2>
            <p className="text-sm text-ink-400 mt-3">
              Un único panel centralizado para el estudio y sus tatuadores, y una experiencia directa para el cliente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Card 1: Estudio & Tatuadores */}
            <div className="tattoo-card p-8 rounded-3xl border border-crimson-500/30 relative group hover:border-crimson-500/70 transition-all glow-effect">
              <div className="w-12 h-12 rounded-2xl bg-crimson-500/10 border border-crimson-500/20 text-crimson-500 flex items-center justify-center mb-6 shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-crimson-400 uppercase tracking-widest font-bold block mb-1">
                Panel de Administración
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">Para el Estudio de Tatuajes</h3>
              <p className="text-sm text-ink-400 mb-6 leading-relaxed">
                Añade a tus tatuadores residentes e invitados. Cada tatuador puede cambiar de perfil ("¿Quién eres hoy?") para gestionar su propia agenda, subir flashes y pausar la IA cuando desee intervenir personalmente.
              </p>
              <ul className="space-y-3 text-xs text-ink-300 border-t border-white/5 pt-4">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Selector ágil de tatuador en la cabecera</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Plantillas EmailJS precargadas (48h antes, Newsletter mensual y Reenganche 4 meses)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Horarios de apertura, descansos y vacaciones del estudio</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Asistente de presupuestos personalizado por artista</li>
              </ul>
            </div>

            {/* Card 2: Clientes */}
            <div className="tattoo-card p-8 rounded-3xl border border-white/10 relative group hover:border-amber-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 shadow-inner">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold block mb-1">
                Experiencia del Cliente
              </span>
              <h3 className="text-2xl font-bold text-white mb-2">Para Clientes & Coleccionistas</h3>
              <p className="text-sm text-ink-400 mb-6 leading-relaxed">
                Pide cita online sin esperas, consulta precios aproximados al instante indicando el tamaño en centímetros, firma el consentimiento legal desde el móvil y sube fotos de curación para descartar anomalías.
              </p>
              <ul className="space-y-3 text-xs text-ink-300 border-t border-white/5 pt-4">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Reserva de consulta de diseño o sesión en aguja</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Firma de consentimiento informado sanitaria y digital</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Chat con el asistente del tatuador (o intervención humana)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Explorador de galería Share con flashes disponibles</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CTA SECTION */}
      <section className="py-20 px-4 text-center border-t border-white/5">
        <div className="max-w-4xl mx-auto tattoo-card p-10 sm:p-14 rounded-3xl border border-crimson-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-crimson-600/15 rounded-full blur-3xl pointer-events-none" />
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Profesionaliza tu estudio con la potencia de la IA
          </h2>
          <p className="text-ink-400 text-base max-w-xl mx-auto mb-8">
            Ahorra horas en WhatsApp cotizando tatuajes, elimina los no-shows con recordatorios automáticos y da tranquilidad médica a tus clientes con el scanner de curación.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm transition-all hover:scale-105 shadow-lg shadow-crimson-600/30 border border-crimson-500/40"
            >
              Registrar Mi Estudio Gratis
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl bg-ink-900 hover:bg-white/10 border border-white/15 text-ink-200 font-semibold text-sm transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
