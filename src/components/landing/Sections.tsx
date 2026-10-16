'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRightIcon, StarOrnament } from '@/components/landing/LandingIcons';
import FlashCard, { type Crop } from '@/components/landing/FlashCard';
import { strokesOf, type InkArt } from '@/components/landing/inkArt';
import s from './landing.module.css';

// Piezas de la portada, compartidas por las distintas versiones.

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');

// Cada función del producto es una lámina flash (motivo recortado de la lámina de tatuajes del estudio)
const FEATURES: Array<{ title: string; text: string; motif: string; crop: Crop }> = [
  { title: 'Agenda', text: 'Huecos libres, descansos y vacaciones', motif: 'Dragón', crop: { x: 30, y: 20, w: 330, h: 440 } },
  { title: 'Presupuestos', text: 'Precio orientativo por tamaño, zona y color', motif: 'Koi', crop: { x: 420, y: 0, w: 270, h: 360 } },
  { title: 'Curación', text: 'El cliente te manda fotos y ves cómo evoluciona', motif: 'Rosa', crop: { x: 5, y: 500, w: 270, h: 360 } },
  { title: 'Consentimiento', text: 'Firmado desde el móvil, sin papeles', motif: 'Tigre', crop: { x: 1373, y: 0, w: 300, h: 400 } },
];

// Lo que el estudio deja atrás (se tacha) y cómo lo resuelve la app
const PAINS = [
  { pain: 'Mensajes a las tantas', fix: 'El cliente pide cita solo, a cualquier hora.' },
  { pain: 'Papeles que firmar', fix: 'El consentimiento se firma desde el móvil.' },
  { pain: 'Huecos muertos en la agenda', fix: 'Solo se ofrecen los huecos que de verdad están libres.' },
  { pain: 'Clientes que no aparecen', fix: 'Recordatorio automático 48 h antes de la cita.' },
];

const STEPS: Array<{ title: string; text: string; art: InkArt }> = [
  { title: 'Pide cita', art: 'calendar', text: 'Elige tatuador, tamaño y zona, y solo ve los huecos donde cabe su sesión.' },
  { title: 'Ve el precio', art: 'scales', text: 'Un precio orientativo con tus tarifas. Sin idas y venidas por mensaje.' },
  { title: 'Firma desde el móvil', art: 'scroll', text: 'El consentimiento le llega antes de la cita y lo firma con el dedo.' },
  { title: 'Te manda la curación', art: 'rose', text: 'Fotos desde el chat para que veas cómo va cicatrizando.' },
];

const EDGE_LEFT = 'Agenda ✦ Presupuestos ✦ Curación ✦ Consentimiento ✦ ';
const EDGE_RIGHT = 'Blackwork ✦ Tradicional ✦ Realismo ✦ Fine line ✦ Japonés ✦ ';

// Texto partido en palabras para que cada una pueda subir por separado
export function Words({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span className={s.word}>
            <span className={s.wordIn} data-w>
              {w}
            </span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </>
  );
}

export function Ctas({ primary = 'Empezar ahora', secondary = 'Acceder al panel' }: { primary?: string; secondary?: string }) {
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

export function Edges() {
  return (
    <>
      {[
        { text: EDGE_LEFT, side: s.edgeLeft },
        { text: EDGE_RIGHT, side: s.edgeRight },
      ].map(e => (
        <div key={e.side} className={cx(s.edge, e.side)} aria-hidden="true">
          <div className={s.edgeTrack}>{e.text.repeat(8)}</div>
        </div>
      ))}
    </>
  );
}

// Título, separador, frase y botones de la portada
function HeroIntro() {
  return (
    <>
      <h1 className={s.title} data-hero>
        <span>
          <Words text="Tú tatúas." />
        </span>
        <span className={s.gold}>
          <Words text="Nosotros llevamos la agenda." />
        </span>
      </h1>
      <div className={s.divider} data-hero-fade>
        <span className={s.rule} />
        <StarOrnament className={s.star} />
        <span>Para estudios de tatuaje</span>
        <StarOrnament className={s.star} />
        <span className={s.rule} />
      </div>
      <p className={s.lead} data-hero-fade>
        Citas, presupuestos y consentimientos en un solo sitio. Para que dediques el día a tatuar, no a contestar mensajes.
      </p>
      <div data-hero-fade>
        <Ctas />
      </div>
    </>
  );
}

// Las cuatro láminas con su marco numerado; salen volando desde alrededor del título.
function FeatureSlots() {
  return (
    <div className={s.slots} data-slots>
      <h2 className={s.slotsHead} data-slots-head>
        Todo tu estudio, <em>en cuatro láminas.</em>
      </h2>
      <div className={s.slotGrid}>
        {FEATURES.map((f, i) => (
          <div key={f.title} className={s.slot} data-slot>
            <div className={s.slotFrame}>
              <span className={s.slotOutline} data-slot-outline />
              <span className={s.slotNum} data-slot-outline>
                #0{i + 1}
              </span>
              <div className={s.card} data-card>
                <div className={s.tilt} data-tilt>
                  <div className={s.float} data-pop style={{ ['--delay' as string]: `${-i * 1.4}s` }}>
                    <FlashCard crop={f.crop} caption={f.motif} classes={{ face: s.face, art: s.faceArt, cap: s.faceCap }} />
                  </div>
                </div>
              </div>
            </div>
            <div className={s.slotLabel} data-slot-label>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 1. Portada: título y láminas flash que, al bajar, vuelan a su marco
export function HeroCards() {
  return (
    <section className={s.stage} data-stage>
      <span className={cx(s.micro, s.microBL, s.scrollHint)} data-micro-hint>
        <i /> Desliza
      </span>
      <span className={cx(s.micro, s.microBR)}>Blackwork · Tradicional · Realismo · Fine line</span>
      <div className={s.heroText} data-hero-text>
        <HeroIntro />
      </div>
      <FeatureSlots />
    </section>
  );
}

// 2. Lo que dejas atrás: cada problema se tacha al llegar y debajo aparece cómo lo resuelve la app
export function Statement() {
  return (
    <section className={s.statement}>
      <div>
        <span className={s.kicker} data-reveal>
          <StarOrnament className={s.star} />
          Lo que dejas atrás
        </span>
        <h2 className={s.h2} data-reveal-words>
          <Words text="Menos líos," /> <em><Words text="más tiempo para tatuar." /></em>
        </h2>
        <ul className={s.pains}>
          {PAINS.map(p => (
            <li key={p.pain} className={s.painRow} data-pain>
              <span className={s.pain}>
                <span className={s.painText} data-pain-text>
                  {p.pain}
                </span>
                <span className={s.strike} data-strike aria-hidden="true" />
              </span>
              <span className={s.fix} data-fix>
                <StarOrnament className={s.star} />
                {p.fix}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className={s.stPhoto} data-st-photo>
        <div className={s.stImg} data-st-img />
        <span className={s.stTag}>✦ Hecho para el estudio</span>
      </div>
    </section>
  );
}

// 3. Cómo funciona: cuatro pasos unidos por una línea dorada que se llena al bajar
export function HowSteps() {
  return (
    <section className={s.howSteps}>
      <div className={s.howHead}>
        <span className={s.kicker} data-reveal>
          <StarOrnament className={s.star} />
          Cómo funciona
          <StarOrnament className={s.star} />
        </span>
        <h2 className={s.h2} data-reveal-words>
          <Words text="De la cita" /> <em><Words text="a la curación." /></em>
        </h2>
      </div>
      <ol className={s.track} data-track>
        <span className={s.trackLine} aria-hidden="true">
          <span className={s.trackFill} data-track-fill />
        </span>
        {STEPS.map((st, i) => (
          <li key={st.title} className={s.stepItem} data-step>
            <span className={s.medal} data-medal>
              <svg viewBox="0 0 200 200" aria-hidden="true">
                {strokesOf(st.art).map((d, k) => (
                  <path key={k} d={d} data-step-path />
                ))}
              </svg>
            </span>
            <span className={s.stepBody}>
              <span className={s.stepNum} data-step-text>
                0{i + 1}
              </span>
              <h3 className={s.stepTitle} data-step-text>
                {st.title}
              </h3>
              <p className={s.stepText} data-step-text>
                {st.text}
              </p>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// 4. Cierre
export function Final() {
  return (
    <section className={s.final}>
      <h2 className={s.bigTitle} data-reveal-words>
        <span>
          <Words text="Menos móvil." />
        </span>
        <span className={s.gold}>
          <Words text="Más tatuaje." />
        </span>
      </h2>
      <p className={s.finalSub} data-reveal>
        Menos clientes que no aparecen y menos horas contestando WhatsApp. Empieza hoy y deja que la agenda se lleve sola.
      </p>
      <div data-reveal>
        <Ctas primary="Registrar mi estudio gratis" secondary="Iniciar sesión" />
      </div>
    </section>
  );
}

export const pageClass = s.page;
