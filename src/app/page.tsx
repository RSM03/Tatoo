'use client';

import React from 'react';
import Link from 'next/link';
import { literata } from '@/lib/fonts';
import { ArrowRightIcon, CalendarIcon, CameraIcon, ScalesIcon, ScrollIcon, StarOrnament } from '@/components/landing/LandingIcons';
import s from './landing.module.css';

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');

const FEATURES = [
  { title: 'Agenda', text: 'Huecos libres, descansos y vacaciones', Icon: CalendarIcon },
  { title: 'Presupuestos', text: 'Precio orientativo por tamaño, zona y color', Icon: ScalesIcon },
  { title: 'Curación', text: 'El cliente te manda fotos y ves cómo evoluciona', Icon: CameraIcon },
  { title: 'Consentimiento', text: 'Firmado desde el móvil, sin papeles', Icon: ScrollIcon },
];

const STUDIO_POINTS = [
  'Cambias de tatuador desde arriba, con un clic',
  'Recordatorios automáticos: 48 h antes, novedades del mes y aviso a los 4 meses',
  'Horarios, descansos y vacaciones del estudio',
  'Presupuestos con los precios de cada tatuador',
];

const CLIENT_POINTS = [
  'Reserva de consulta o de sesión',
  'Consentimiento informado, firmado en digital',
  'Chat con el asistente, o con el tatuador en persona',
  'Galería con los flashes disponibles',
];

// Marco dorado con esquinas cortadas (doble filo).
function Frame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx(s.card, className)}>
      <div className={cx(s.frame, s.notch)}>
        <div className={cx(s.frameBody, s.notch)}>{children}</div>
      </div>
    </div>
  );
}

function Ctas({ primary = 'Empezar ahora', secondary = 'Acceder al panel' }: { primary?: string; secondary?: string }) {
  return (
    <div className={s.ctas}>
      <Link href="/register" className={cx(s.btn, s.btnPrimary)}>
        <span>{primary}</span>
        <ArrowRightIcon />
      </Link>
      <Link href="/login" className={cx(s.btn, s.btnGhost)}>
        {secondary}
      </Link>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className={cx(literata.variable, s.page)}>
      {/* 1. Portada */}
      <section className={s.hero}>
        <h1 className={s.title}>
          <span>Tú tatúas.</span>
          <span className={s.titleB}>Nosotros llevamos la agenda.</span>
        </h1>

        <div className={s.divider}>
          <span className={s.rule} />
          <StarOrnament className={s.star} />
          <span>Para estudios de tatuaje</span>
          <StarOrnament className={s.star} />
          <span className={s.rule} />
        </div>

        <p className={s.lead}>
          Citas, presupuestos y consentimientos en un solo sitio.
          <br />
          Para que dediques el día a tatuar, no a contestar mensajes.
        </p>

        <Ctas />

        <p className={s.styles}>
          Blackwork <i>·</i> Tradicional <i>·</i> Realismo <i>·</i> Fine line
        </p>

        <div className={s.features}>
          {FEATURES.map(({ title, text, Icon }) => (
            <Frame key={title}>
              <div className={s.cardContent}>
                <h3 className={s.cardTitle}>{title}</h3>
                <Icon className={s.icon} />
                <p className={s.cardText}>{text}</p>
              </div>
            </Frame>
          ))}
        </div>
      </section>

      {/* 2. Cómo funciona: estudio y cliente */}
      <section className={s.section}>
        <div className={s.sectionHead}>
          <span className={s.kicker}>
            <StarOrnament className={s.star} />
            Cómo funciona
            <StarOrnament className={s.star} />
          </span>
          <h2 className={s.h2}>
            Un panel para el estudio. <em>Una web para el cliente.</em>
          </h2>
          <p className={s.sub}>El estudio y sus tatuadores trabajan desde el mismo sitio. El cliente reserva, firma y pregunta desde el móvil.</p>
        </div>

        <div className={s.panels}>
          <Frame>
            <div className={s.panelContent}>
              <CalendarIcon className={s.panelIcon} />
              <span className={s.panelKicker}>Para el estudio</span>
              <h3 className={s.panelTitle}>Tu estudio y tu equipo</h3>
              <p className={s.panelText}>
                Añade a tus tatuadores fijos e invitados. Cada uno lleva su agenda, sube sus flashes y puede contestar él mismo cuando quiera, en lugar del asistente.
              </p>
              <ul className={s.list}>
                {STUDIO_POINTS.map(p => (
                  <li key={p}>
                    <StarOrnament className={s.star} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </Frame>

          <Frame>
            <div className={s.panelContent}>
              <ScrollIcon className={s.panelIcon} />
              <span className={s.panelKicker}>Para el cliente</span>
              <h3 className={s.panelTitle}>Tus clientes</h3>
              <p className={s.panelText}>
                Piden cita sin esperar a que contestes, ven un precio orientativo según el tamaño, firman el consentimiento desde el móvil y te mandan fotos de la curación.
              </p>
              <ul className={s.list}>
                {CLIENT_POINTS.map(p => (
                  <li key={p}>
                    <StarOrnament className={s.star} />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </Frame>
        </div>
      </section>

      {/* 3. Llamada final */}
      <section className={s.section}>
        <Frame className={s.cta}>
          <div className={s.ctaContent}>
            <h2 className={s.h2}>
              Menos tiempo en el móvil. <em>Más tiempo tatuando.</em>
            </h2>
            <p className={s.sub}>
              La agenda, los presupuestos y los recordatorios se llevan solos. Menos clientes que no aparecen y menos horas contestando WhatsApp.
            </p>
            <Ctas primary="Registrar mi estudio gratis" secondary="Iniciar sesión" />
          </div>
        </Frame>
      </section>
    </div>
  );
}
