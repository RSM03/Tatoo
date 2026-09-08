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
  FileSignature
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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-crimson-600/20 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-crimson-400 mb-6 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Potenciado con IA Multimodal (Eden AI + GPT-4o-mini)</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
            El Asistente Inteligente definitivo para <span className="bg-gradient-to-r from-crimson-500 via-amber-400 to-crimson-400 bg-clip-text text-transparent">Tatuadores y Estudios</span>
          </h1>

          {/* Subtitle */}
          <p className="text-ink-400 text-lg sm:text-xl max-w-2xl font-normal leading-relaxed mb-10">
            Automatiza presupuestos según tus propias reglas, analiza fotos de curación con visión artificial, programa citas con recordatorios de 48h y firma consentimientos legales en segundos.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-base shadow-xl shadow-crimson-600/30 flex items-center justify-center gap-2.5 transition-all hover:scale-105"
            >
              <span>Comenzar Gratis</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ink-200 font-semibold text-base transition-colors flex items-center justify-center gap-2"
            >
              <span>Acceder a Mi Panel</span>
            </Link>
          </div>

          {/* Fast Features Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-16 border-t border-white/5 mt-16 w-full max-w-4xl">
            <div className="flex flex-col items-center gap-2">
              <Calendar className="w-6 h-6 text-crimson-500" />
              <span className="text-sm font-semibold text-white">Citas Diseño y Tatuaje</span>
              <span className="text-xs text-ink-500">Con descansos y walk-ins</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              <span className="text-sm font-semibold text-white">Presupuestos con IA</span>
              <span className="text-xs text-ink-500">Tus reglas por cm y color</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Camera className="w-6 h-6 text-crimson-500" />
              <span className="text-sm font-semibold text-white">Visión de Curación</span>
              <span className="text-xs text-ink-500">Detecta pus y anomalías</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <FileSignature className="w-6 h-6 text-amber-400" />
              <span className="text-sm font-semibold text-white">Consentimiento Digital</span>
              <span className="text-xs text-ink-500">Firma ágil con validez legal</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE THREE ROLES ECOSYSTEM */}
      <section className="py-20 px-4 bg-ink-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-crimson-500 text-xs font-mono font-bold tracking-widest uppercase">Ecosistema 3 en 1</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">Diseñado para cada integrante del estudio</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Estudio */}
            <div className="glass-panel p-8 rounded-2xl border border-white/5 relative group hover:border-amber-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Para Estudios</h3>
              <p className="text-sm text-ink-400 mb-6 leading-relaxed">
                Centraliza a todos tus tatuadores residentes e invitados. Configura horarios de apertura, días de vacaciones y plantillas de correo.
              </p>
              <ul className="space-y-2.5 text-xs text-ink-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Gestión multi-tatuador</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Email automático a los 4 meses inactivo</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Descuentos y promociones editables</li>
              </ul>
            </div>

            {/* Card 2: Tatuador */}
            <div className="glass-panel p-8 rounded-2xl border border-crimson-500/30 relative group hover:border-crimson-500 transition-all glow-effect">
              <div className="w-12 h-12 rounded-xl bg-crimson-500/10 border border-crimson-500/20 text-crimson-500 flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Para Tatuadores</h3>
              <p className="text-sm text-ink-400 mb-6 leading-relaxed">
                Tu copiloto con IA. Atiende chats 24/7 calculando precios con tus tarifas y te avisa cuando un cliente manda una foto de cicatrización para que intervengas si lo deseas.
              </p>
              <ul className="space-y-2.5 text-xs text-ink-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Reglas de presupuesto por tamaño/color</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Takeover humano (pausa IA con 1 clic)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Sección Share con newsletter mensual</li>
              </ul>
            </div>

            {/* Card 3: Cliente */}
            <div className="glass-panel p-8 rounded-2xl border border-white/5 relative group hover:border-blue-500/40 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Para Clientes</h3>
              <p className="text-sm text-ink-400 mb-6 leading-relaxed">
                Pide cita online sin esperas, consulta presupuestos instantáneos, firma el consentimiento legal desde tu móvil y haz seguimiento de la curación de tu piel.
              </p>
              <ul className="space-y-2.5 text-xs text-ink-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> Citas para diseño o tatuar</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> Recordatorio por email 48h antes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> Firma de consentimiento informada y ágil</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CTA SECTION */}
      <section className="py-20 px-4 text-center border-t border-white/5">
        <div className="max-w-4xl mx-auto glass-panel p-10 sm:p-14 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-crimson-600/10 rounded-full blur-3xl pointer-events-none" />
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Lleva tu estudio de tatuaje al siguiente nivel
          </h2>
          <p className="text-ink-400 text-base max-w-xl mx-auto mb-8">
            Empieza a ahorrar horas de atención al cliente, evita no-shows con recordatorios automáticos y protege tu trabajo con consentimientos informados digitales.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm transition-all hover:scale-105 shadow-lg shadow-crimson-600/30"
            >
              Crear Cuenta Ahora
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ink-200 font-semibold text-sm transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
