'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRightIcon, StarOrnament } from '@/components/landing/LandingIcons';
import FlashCard from '@/components/landing/FlashCard';
import { strokesOf, type InkArt } from '@/components/landing/inkArt';
import s from './landing.module.css';

// Piezas de la portada, compartidas por las distintas versiones.

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ');

// Cada función del producto es una lámina flash (motivo recortado de la lámina de tatuajes del estudio)
const FEATURES: Array<{ title: string; text: string; caption: string; art: InkArt }> = [
  { title: 'Agenda', text: 'Huecos libres, descansos y vacaciones', caption: 'Citas', art: 'calendar' },
  { title: 'Presupuestos', text: 'Precio orientativo por tamaño, zona y color', caption: 'Precio', art: 'scales' },
  { title: 'Curación', text: 'El cliente te manda fotos y ves cómo evoluciona', caption: 'Fotos', art: 'camera' },
  { title: 'Consentimiento', text: 'Firmado desde el móvil, sin papeles', caption: 'Firma', art: 'scroll' },
];

// Iconos de línea de los avisos del móvil
const NOTIF_ICONS = {
  cita: 'M7 3v3M17 3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5zM9 14.5l2 2 4-4',
  firma: 'M15 4.5l4.5 4.5L9 19.5H4.5V15L15 4.5zM4 21h16',
  hueco: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 7.5V12l3 2',
  aviso: 'M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14l1.5-2zM10 20.5a2 2 0 0 0 4 0',
};

// Lo que el estudio deja atrás (se tacha), cómo lo resuelve la app y el aviso que le llega al tatuador
const PAINS: Array<{ pain: string; fix: string; notif: { icon: keyof typeof NOTIF_ICONS; title: string; meta: string; time: string } }> = [
  {
    pain: 'Mensajes a las tantas',
    fix: 'El cliente pide cita solo, a cualquier hora.',
    notif: { icon: 'cita', title: 'Nueva cita · Laura M.', meta: 'Jueves a las 17:00 · Fine line', time: '23:48' },
  },
  {
    pain: 'Papeles que firmar',
    fix: 'El consentimiento se firma desde el móvil.',
    notif: { icon: 'firma', title: 'Consentimiento firmado', meta: 'Marcos R. · desde su móvil', time: '12:41' },
  },
  {
    pain: 'Huecos muertos en la agenda',
    fix: 'Solo se ofrecen los huecos que de verdad están libres.',
    notif: { icon: 'hueco', title: 'Hueco cubierto', meta: 'Martes 10:00 · sesión de 2 h', time: '09:15' },
  },
  {
    pain: 'Clientes que no aparecen',
    fix: 'Recordatorio automático 48 h antes de la cita.',
    notif: { icon: 'aviso', title: 'Recordatorio enviado', meta: 'Cita de pasado mañana · Ana P.', time: '10:00' },
  },
];

const STEPS: Array<{ title: string; text: string; art: InkArt }> = [
  { title: 'Pide cita', art: 'calendar', text: 'Elige tatuador, tamaño y zona, y solo ve los huecos donde cabe su sesión.' },
  { title: 'Ve el precio', art: 'scales', text: 'Un precio orientativo con tus tarifas. Sin idas y venidas por mensaje.' },
  { title: 'Firma desde el móvil', art: 'scroll', text: 'El consentimiento le llega antes de la cita y lo firma con el dedo.' },
  { title: 'Te manda la curación', art: 'rose', text: 'Fotos desde el chat para que veas cómo va cicatrizando.' },
];

// Cada lámina, a fondo: una pieza 3D por servicio (la escena está en scene3d/)
const SERVICES = [
  {
    title: 'Agenda',
    head: 'Tu agenda se llena sola.',
    text: 'Tus clientes ven solo los huecos libres de verdad y piden cita sin escribirte.',
    points: ['Descansos, vacaciones y varios tatuadores', 'Cada sesión dura lo que pide su tamaño', 'Recordatorio automático 48 h antes'],
  },
  {
    title: 'Presupuestos',
    head: 'Un precio claro desde el principio.',
    text: 'Precio orientativo con tus tarifas, según tamaño, zona y color.',
    points: ['Tarifa por hora y mínimo de cada tatuador', 'Sin idas y venidas por mensaje', 'El cliente llega sabiendo lo que cuesta'],
  },
  {
    title: 'Curación',
    head: 'Sigue cada tatuaje después de la sesión.',
    text: 'El cliente te manda fotos desde el chat y ves cómo va cicatrizando.',
    points: ['Todo queda en la ficha del cliente', 'Ves a tiempo si algo no va bien', 'Más confianza para que vuelva'],
  },
  {
    title: 'Consentimiento',
    head: 'Firmado en el móvil, sin papeles.',
    text: 'Le llega antes de la cita y lo firma con el dedo.',
    points: ['Con sus datos y DNI, listo para imprimir', 'Guardado junto a cada cita', 'Nada que escanear ni archivar'],
  },
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
                    <FlashCard art={f.art} caption={f.caption} classes={{ face: s.face, art: s.faceArt, ring: s.faceRing, cap: s.faceCap }} />
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

// 2. Servicios: la pantalla se queda fija y la cámara 3D viaja de pieza en pieza mientras cambia el texto
export function Services() {
  return (
    <section className={s.services} data-services>
      <div className={s.svcInner}>
        <div className={s.svcText}>
          <span className={s.kicker}>
            <StarOrnament className={s.star} />
            Cada lámina, a fondo
          </span>
          <div className={s.svcPanels}>
            {SERVICES.map((sv, i) => (
              <article key={sv.title} className={s.svcPanel} data-svc-panel>
                <span className={s.svcNum}>
                  0{i + 1} <i>/ 04</i> · {sv.title}
                </span>
                <h2 className={s.svcHead}>{sv.head}</h2>
                <p className={s.svcLead}>{sv.text}</p>
                <ul className={s.svcList}>
                  {sv.points.map((pt) => (
                    <li key={pt}>
                      <StarOrnament className={s.star} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className={s.svcBars} aria-hidden="true">
            {SERVICES.map((sv) => (
              <span key={sv.title} data-svc-bar />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// 3. Lo que dejas atrás: cada problema se tacha al llegar y debajo aparece cómo lo resuelve la app
export function Statement() {
  return (
    <section className={s.statement} data-statement>
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
      {/* El móvil del tatuador: le llegan los avisos de lo que la app ha resuelto sola */}
      <div className={s.phone} role="img" aria-label="Avisos de Tattoo AI en el móvil del tatuador">
        <span className={s.phoneNotch} />
        <div className={s.phoneHead}>
          <span className={s.phoneDay}>Hoy</span>
          <span className={s.phoneApp}>Tattoo AI</span>
        </div>
        <ul className={s.notifs}>
          {PAINS.map(({ notif }) => (
            <li key={notif.title} className={s.notif} data-notif>
              <span className={s.notifIcon}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={NOTIF_ICONS[notif.icon]} />
                </svg>
              </span>
              <span className={s.notifBody}>
                <span className={s.notifTitle}>{notif.title}</span>
                <span className={s.notifMeta}>{notif.meta}</span>
              </span>
              <span className={s.notifTime}>{notif.time}</span>
            </li>
          ))}
        </ul>
        <p className={s.phoneFoot}>Sin contestar un solo mensaje.</p>
      </div>
    </section>
  );
}

// 4. Cómo funciona: cuatro pasos unidos por una línea dorada que se llena al bajar
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

// 5. Cierre
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
