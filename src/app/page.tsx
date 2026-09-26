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
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 px-4">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-crimson-600/[0.06] via-amber-500/[0.03] to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
          {/* Etiqueta superior */}
          <div className="flex items-center gap-4 mb-8 text-[11px] uppercase tracking-[0.3em] text-ink-400 font-medium">
            <span className="h-px w-10 bg-ink-600/60" />
            <span>Para estudios de tatuaje</span>
            <span className="h-px w-10 bg-ink-600/60" />
          </div>

          {/* Título */}
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-ink-50 max-w-5xl leading-[1.05] mb-7">
            <span className="block">Tú tatúas.</span>
            <span className="block text-crimson-300 italic font-semibold lg:whitespace-nowrap">Nosotros llevamos la agenda.</span>
          </h1>

          {/* Subtítulo */}
          <p className="text-ink-300 text-lg sm:text-xl max-w-xl font-normal leading-relaxed mb-10">
            Citas, presupuestos y consentimientos en un solo sitio. Para que dediques el día a tatuar, no a contestar mensajes.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-crimson-600 hover:bg-crimson-700 text-ink-50 font-bold text-base shadow-md flex items-center justify-center gap-2.5 transition-colors border border-crimson-500/40"
            >
              <span>Empezar ahora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-transparent hover:bg-white/5 border border-ink-400/40 text-ink-100 font-bold text-base transition-colors flex items-center justify-center gap-2 hover:border-ink-300/60"
            >
              <span>Acceder al panel</span>
            </Link>
          </div>

          {/* Estilos */}
          <p className="mt-10 text-xs uppercase tracking-[0.25em] text-ink-500">
            Blackwork <span className="mx-2 text-ink-600">·</span> Tradicional <span className="mx-2 text-ink-600">·</span> Realismo <span className="mx-2 text-ink-600">·</span> Fine line
          </p>

          {/* Fast Features Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 pt-14 border-t border-white/10 mt-14 w-full max-w-4xl">
            <div className="tattoo-card p-5 rounded-2xl flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-crimson-600/15 border border-crimson-500/30 flex items-center justify-center text-crimson-400">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-white">Agenda</span>
              <span className="text-xs text-ink-400">Huecos libres, descansos y vacaciones</span>
            </div>
            <div className="tattoo-card p-5 rounded-2xl flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-white">Presupuestos</span>
              <span className="text-xs text-ink-400">Precio orientativo por tamaño, zona y color</span>
            </div>
            <div className="tattoo-card p-5 rounded-2xl flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-crimson-600/15 border border-crimson-500/30 flex items-center justify-center text-crimson-400">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-white">Curación</span>
              <span className="text-xs text-ink-400">El cliente te manda fotos y ves cómo evoluciona</span>
            </div>
            <div className="tattoo-card p-5 rounded-2xl flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FileSignature className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-white">Consentimiento</span>
              <span className="text-xs text-ink-400">Firmado desde el móvil, sin papeles</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THE TWO PORTALS: ESTUDIOS & CLIENTES */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-ink-400 text-[11px] font-medium tracking-[0.3em] uppercase">Cómo funciona</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mt-2">
              Un panel para el estudio. <span className="italic font-semibold text-crimson-300">Una web para el cliente.</span>
            </h2>
            <p className="text-sm text-ink-400 mt-3">
              El estudio y sus tatuadores trabajan desde el mismo sitio. El cliente reserva, firma y pregunta desde el móvil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Card 1: Estudio & Tatuadores */}
            <div className="tattoo-card p-8 rounded-3xl border border-crimson-500/30 relative group hover:border-crimson-500/70 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-crimson-500/10 border border-crimson-500/20 text-crimson-500 flex items-center justify-center mb-6 shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-crimson-400 uppercase tracking-widest font-bold block mb-1">
                Para el estudio
              </span>
              <h3 className="font-display text-2xl font-bold text-white mb-2">Tu estudio y tu equipo</h3>
              <p className="text-sm text-ink-400 mb-6 leading-relaxed">
                Añade a tus tatuadores fijos e invitados. Cada uno lleva su agenda, sube sus flashes y puede contestar él mismo cuando quiera, en lugar del asistente.
              </p>
              <ul className="space-y-3 text-xs text-ink-300 border-t border-white/5 pt-4">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Cambias de tatuador desde arriba, con un clic</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Recordatorios automáticos: 48 h antes, novedades del mes y aviso a los 4 meses</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Horarios, descansos y vacaciones del estudio</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-crimson-500 shrink-0" /> Presupuestos con los precios de cada tatuador</li>
              </ul>
            </div>

            {/* Card 2: Clientes */}
            <div className="tattoo-card p-8 rounded-3xl border border-white/10 relative group hover:border-amber-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-6 shadow-inner">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-widest font-bold block mb-1">
                Para el cliente
              </span>
              <h3 className="font-display text-2xl font-bold text-white mb-2">Tus clientes</h3>
              <p className="text-sm text-ink-400 mb-6 leading-relaxed">
                Piden cita sin esperar a que contestes, ven un precio orientativo según el tamaño, firman el consentimiento desde el móvil y te mandan fotos de la curación.
              </p>
              <ul className="space-y-3 text-xs text-ink-300 border-t border-white/5 pt-4">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Reserva de consulta o de sesión</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Consentimiento informado, firmado en digital</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Chat con el asistente, o con el tatuador en persona</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" /> Galería con los flashes disponibles</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CTA SECTION */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto tattoo-card p-10 sm:p-14 rounded-3xl border border-crimson-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-crimson-600/[0.06] rounded-full blur-3xl pointer-events-none" />
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Menos tiempo en el móvil. <span className="block italic font-semibold text-crimson-300">Más tiempo tatuando.</span>
          </h2>
          <p className="text-ink-400 text-base max-w-xl mx-auto mb-8">
            La agenda, los presupuestos y los recordatorios se llevan solos. Menos clientes que no aparecen y menos horas contestando WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 rounded-xl bg-crimson-600 hover:bg-crimson-500 text-white font-bold text-sm transition-colors shadow-md border border-crimson-500/40"
            >
              Registrar mi estudio gratis
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 rounded-xl bg-ink-900 hover:bg-white/10 border border-white/15 text-ink-200 font-semibold text-sm transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
