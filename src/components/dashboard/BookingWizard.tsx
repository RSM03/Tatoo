'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import s from './BookingWizard.module.css';

// Asistente "Pedir cita" del cliente en 4 pasos: tatuador → tu idea → día y hora → revisar.
// Solo enseña huecos reales: horario del estudio menos las citas que ya tiene el tatuador.

const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

type TypeId = 'tattoo_session' | 'design_consultation';

const TYPES: Array<{ id: TypeId; name: string; sub: string }> = [
  { id: 'design_consultation', name: 'Consulta de diseño', sub: 'Gratis · 30–45 min para preparar el boceto' },
  { id: 'tattoo_session', name: 'Sesión de tatuaje', sub: 'El día que te tatúas' },
];

const SIZES = [
  { id: 'mini', name: 'Mini', cm: 'hasta 5 cm', px: 34, dur: 1, durText: '1 h', multi: false },
  { id: 'peq', name: 'Pequeño', cm: '5 – 10 cm', px: 54, dur: 1.5, durText: '1 h 30 min', multi: false },
  { id: 'med', name: 'Mediano', cm: '10 – 15 cm', px: 76, dur: 2.5, durText: '2 h 30 min', multi: false },
  { id: 'gran', name: 'Grande', cm: '15 – 25 cm', px: 98, dur: 4, durText: '4 h', multi: false },
  { id: 'manga', name: 'Manga / espalda', cm: 'varias sesiones', px: 140, dur: 5, durText: '5 h', multi: true },
];

const ZONES = ['Brazo', 'Antebrazo', 'Pierna', 'Costilla', 'Espalda', 'Otra'];
const NAMES = ['Tatuador', 'Tu idea', 'Día y hora', 'Revisar'];

const CONSULT_HOURS = 0.75;
const CONSULT_TEXT = '45 min';
const LOOKAHEAD_DAYS = 56;
const MIN_NOTICE_MS = 60 * 60 * 1000;

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DEFAULT_HOURS: Record<string, { open: string; close: string; closed: boolean }> = {
  monday: { open: '10:00', close: '20:00', closed: false },
  tuesday: { open: '10:00', close: '20:00', closed: false },
  wednesday: { open: '10:00', close: '20:00', closed: false },
  thursday: { open: '10:00', close: '20:00', closed: false },
  friday: { open: '10:00', close: '20:00', closed: false },
  saturday: { open: '11:00', close: '19:00', closed: false },
  sunday: { open: '00:00', close: '00:00', closed: true },
};

interface Busy {
  artist_id: string;
  start: number;
  end: number;
}

export interface BookingWizardProps {
  user: any;
  studios: any[];
  artists: any[];
  initial?: { studioId?: string; artistId?: string; date?: string; time?: string };
  onClose: () => void;
  onCreated: (appointment: any) => void;
  onSignConsent: (appointment: any) => void;
  onViewAppointments: () => void;
}

const toMin = (hhmm: string) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function freeSlots(day: Date, hours: number, busy: Busy[], studio: any): string[] {
  const conf = studio?.opening_hours?.[DAY_KEYS[day.getDay()]] ?? DEFAULT_HOURS[DAY_KEYS[day.getDay()]];
  if (!conf || conf.closed) return [];
  const open = toMin(conf.open);
  const close = toMin(conf.close);
  const durMin = Math.round(hours * 60);
  const stepMin = hours < 1 ? 30 : 60;
  const earliest = Date.now() + MIN_NOTICE_MS;
  const out: string[] = [];
  for (let m = open; m + durMin <= close; m += stepMin) {
    const st = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, m).getTime();
    const en = st + durMin * 60000;
    if (st < earliest) continue;
    if (busy.some(b => b.start < en && b.end > st)) continue;
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  }
  return out;
}

function nextFreeLabel(dayOffset: number, day: Date): string {
  if (dayOffset === 0) return 'hoy';
  if (dayOffset === 1) return 'mañana';
  if (dayOffset < 7) return day.toLocaleDateString('es-ES', { weekday: 'long' });
  if (dayOffset < 14) return 'la semana que viene';
  return `en ${Math.round(dayOffset / 7)} semanas`;
}

function priceText(artist: any, size: (typeof SIZES)[number]): string {
  const hourly = Number(artist?.hourly_rate) || 80;
  const minimum = Number(artist?.minimum_fee) || 60;
  const r10 = (n: number) => Math.round(n / 10) * 10;
  if (size.multi) return `desde ${r10(hourly * size.dur)} €/sesión`;
  const lo = r10(Math.max(minimum, hourly * size.dur * 0.85));
  const hi = Math.max(lo + 10, r10(hourly * size.dur * 1.1));
  return `${lo} – ${hi} €`;
}

const initials = (name: string) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

const Check = () => (
  <span className={s.chk}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  </span>
);

export default function BookingWizard({ user, studios, artists, initial, onClose, onCreated, onSignConsent, onViewAppointments }: BookingWizardProps) {
  const supabase = useMemo(() => createClient(), []);
  const initialArtist = artists.find(a => a.id === initial?.artistId);

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'fwd' | 'back'>('fwd');
  const [studioId, setStudioId] = useState<string>(initial?.studioId || initialArtist?.studio_id || studios[0]?.id || '');
  const [pickingStudio, setPickingStudio] = useState(false);
  const [artistId, setArtistId] = useState<string | null>(initialArtist?.id ?? null);
  const [type, setType] = useState<TypeId>('tattoo_session');
  const [sizeId, setSizeId] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(initial?.date ?? null);
  const [slot, setSlot] = useState<string | null>(initial?.time ?? null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [idea, setIdea] = useState('');
  const [busy, setBusy] = useState<Busy[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<any>(null);

  const studio = studios.find(st => st.id === studioId);
  const studioArtists = artists.filter(a => a.studio_id === studioId);
  const artist = artists.find(a => a.id === artistId);
  const size = SIZES.find(z => z.id === sizeId);
  const consult = type === 'design_consultation';
  const hours = consult ? CONSULT_HOURS : size?.dur ?? 1;
  const durText = consult ? CONSULT_TEXT : size?.durText ?? '1 h';
  const artistFirst = artist?.display_name?.split(/\s+/)[0] || 'tu tatuador';

  // Citas ya ocupadas de los tatuadores del estudio (solo horas, sin datos de otros clientes).
  useEffect(() => {
    const ids = studioArtists.map(a => a.id);
    if (!ids.length) {
      setBusy([]);
      return;
    }
    let cancelled = false;
    setBusy(null);
    const from = startOfDay(new Date());
    const to = addDays(from, LOOKAHEAD_DAYS + 1);
    supabase
      .from('appointments')
      .select('artist_id, start_time, end_time')
      .in('artist_id', ids)
      .neq('status', 'cancelled')
      .lt('start_time', to.toISOString())
      .gt('end_time', from.toISOString())
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) console.error('Error cargando huecos:', err);
        setBusy((data || []).map((r: any) => ({ artist_id: r.artist_id, start: new Date(r.start_time).getTime(), end: new Date(r.end_time).getTime() })));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studioId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const busyFor = (id: string | null) => (busy || []).filter(b => b.artist_id === id);

  const nextFree = useMemo(() => {
    const map: Record<string, string> = {};
    if (!busy) return map;
    const today = startOfDay(new Date());
    for (const a of studioArtists) {
      const mine = busy.filter(b => b.artist_id === a.id);
      let label = '';
      for (let i = 0; i <= LOOKAHEAD_DAYS; i++) {
        const d = addDays(today, i);
        if (freeSlots(d, hours, mine, studio).length) {
          label = nextFreeLabel(i, d);
          break;
        }
      }
      map[a.id] = label;
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, studioId, hours]);

  const days = useMemo(() => {
    const first = addDays(startOfDay(new Date()), weekOffset * 7);
    const mine = busyFor(artistId);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(first, i);
      const slots = busy ? freeSlots(d, hours, mine, studio) : [];
      return {
        key: isoDay(d),
        date: d,
        w: cap(d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')),
        n: d.getDate(),
        long: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }),
        slots,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, artistId, hours, weekOffset, studioId]);

  const monthLabel = useMemo(() => {
    const a = cap(days[0].date.toLocaleDateString('es-ES', { month: 'long' }));
    const b = cap(days[6].date.toLocaleDateString('es-ES', { month: 'long' }));
    return a === b ? a : `${a} – ${b}`;
  }, [days]);

  // Si venía un día preseleccionado (desde la agenda pública), abre su semana.
  useEffect(() => {
    if (!initial?.date) return;
    const diff = Math.round((new Date(`${initial.date}T00:00:00`).getTime() - startOfDay(new Date()).getTime()) / 86400000);
    if (diff >= 0) setWeekOffset(Math.min(7, Math.floor(diff / 7)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedDayInfo = (() => {
    if (!day) return null;
    const inWeek = days.find(d => d.key === day);
    if (inWeek) return inWeek;
    const d = new Date(`${day}T00:00:00`);
    return { key: day, date: d, long: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' }), slots: busy ? freeSlots(d, hours, busyFor(artistId), studio) : [] };
  })();
  const slotValid = !!(selectedDayInfo && slot && selectedDayInfo.slots.includes(slot));

  const ready = [!!artistId, !!(type && (consult || size) && zone), slotValid, true];
  const helps = ['Elige un tatuador para seguir', consult ? 'Elige la zona para seguir' : 'Elige tamaño y zona para seguir', 'Elige un día y una hora', ''];
  const labels = ['Continuar', 'Ver huecos libres', 'Revisar cita', 'Pedir cita'];
  const done = step === 4;

  const go = (to: number) => {
    setDir(to < step ? 'back' : 'fwd');
    setStep(to);
    setError('');
  };

  const price = consult ? 'Gratis' : size ? priceText(artist, size) : '';
  const whenText = selectedDayInfo && slot ? `${cap(selectedDayInfo.long)} · ${slot}` : '';
  const sizeZoneText = [size?.name, zone].filter(Boolean).join(' · ');

  const submit = async () => {
    if (!artist || !day || !slot) return;
    setSubmitting(true);
    setError('');
    try {
      const { data: clientRec } = await supabase.from('clients').select('id').eq('profile_id', user.id).maybeSingle();
      let clientId = clientRec?.id;
      if (!clientId) {
        const { data: createdClient } = await supabase.from('clients').insert({ profile_id: user.id }).select('id').single();
        clientId = createdClient?.id;
      }

      const start = new Date(`${day}T${slot}:00`);
      const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
      const details = [
        size ? `Tamaño: ${size.name} (${size.cm})` : '',
        zone ? `Zona: ${zone}` : '',
      ].filter(Boolean).join(' · ');

      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioId: artist.studio_id || studioId,
          artistId: artist.id,
          clientId,
          appointmentType: type,
          title: consult ? 'Consulta de Diseño' : 'Sesión de Tatuaje',
          description: [details, idea.trim()].filter(Boolean).join('\n'),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          status: 'pending',
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'No se pudo pedir la cita.');

      const appointment = { ...data.appointment, artists: { id: artist.id, display_name: artist.display_name } };
      setCreated(appointment);
      onCreated(appointment);
      go(4);
    } catch (err: any) {
      setError(err.message || 'No se pudo pedir la cita.');
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (done) return onViewAppointments();
    if (!ready[step] || submitting) return;
    if (step === 3) return void submit();
    go(step + 1);
  };

  const help = error || (done ? '' : ready[step] ? '' : helps[step]);

  return (
    <div className={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={s.rs} role="dialog" aria-modal="true" aria-label="Pedir cita">
        {/* Barra superior: volver + progreso */}
        <header className={s.header}>
          <div className={s.headRow}>
            <button type="button" className={cx(s.ib, (step === 0 || done) && s.hide)} onClick={() => step > 0 && go(step - 1)} aria-label="Volver al paso anterior">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className={s.headText}>
              <span className={s.stepLabel}>{done ? 'Listo' : `Paso ${step + 1} de 4`}</span>
              <span className={s.stepName}>{done ? 'Cita pedida' : NAMES[step]}</span>
            </div>
            <button type="button" className={s.ib} onClick={onClose} aria-label="Cerrar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className={s.segs} aria-hidden="true">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={cx(s.seg, (i < step || done || (i === step && ready[step])) && s.on)}>
                <i />
              </div>
            ))}
          </div>
        </header>

        {/* Contenido de cada paso */}
        <div className={s.body}>
          {step === 0 && (
            <section key="s0" className={cx(s.section, s.sectionTight, s[dir])}>
              <h1 className={s.disp}>
                ¿Con quién te quieres <em>tatuar</em>?
              </h1>
              {studio && (
                <button type="button" className={cx(s.chip, s.studioChip)} onClick={() => studios.length > 1 && setPickingStudio(p => !p)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 7a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z" />
                  </svg>
                  <span>{[studio.name, studio.city].filter(Boolean).join(' · ')}</span>
                  {studios.length > 1 && <span className={s.change}>{pickingStudio ? 'Cerrar' : 'Cambiar'}</span>}
                </button>
              )}

              {pickingStudio ? (
                studios.map((st, i) => (
                  <button
                    key={st.id}
                    type="button"
                    className={cx(s.card, s.stag, st.id === studioId && s.sel)}
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => {
                      if (st.id !== studioId) {
                        setStudioId(st.id);
                        setArtistId(null);
                        setDay(null);
                        setSlot(null);
                      }
                      setPickingStudio(false);
                    }}
                  >
                    <span className={s.av}>{initials(st.name)}</span>
                    <span className={s.artistInfo}>
                      <span className={s.artistName}>{st.name}</span>
                      <span className={s.typeSub}>{[st.address, st.city].filter(Boolean).join(', ') || 'Dirección no indicada'}</span>
                    </span>
                    {st.id === studioId && <Check />}
                  </button>
                ))
              ) : studioArtists.length === 0 ? (
                <p className={s.center}>Este estudio todavía no tiene tatuadores con agenda.</p>
              ) : (
                studioArtists.map((a, i) => {
                  const sel = a.id === artistId;
                  const nf = nextFree[a.id];
                  const tags: string[] = a.specialties?.length ? a.specialties.slice(0, 3) : ['Todo estilo'];
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={cx(s.card, s.stag, sel && s.sel)}
                      style={{ animationDelay: `${i * 70}ms` }}
                      onClick={() => {
                        setArtistId(a.id);
                        if (a.id !== artistId) setSlot(null);
                      }}
                    >
                      <span className={s.av}>{initials(a.display_name)}</span>
                      <span className={s.artistInfo}>
                        <span className={s.artistName}>{a.display_name}</span>
                        <span className={s.tags}>
                          {tags.map(t => (
                            <span key={t} className={s.tag}>
                              {t}
                            </span>
                          ))}
                        </span>
                        <span className={cx(s.next, busy && !nf && s.nextNone)}>
                          {!busy ? 'Buscando huecos…' : nf ? `Próximo hueco: ${nf}` : 'Sin huecos en las próximas semanas'}
                        </span>
                      </span>
                      {sel && <Check />}
                    </button>
                  );
                })
              )}
            </section>
          )}

          {step === 1 && (
            <section key="s1" className={cx(s.section, s[dir])}>
              <h1 className={s.disp}>¿Qué te quieres hacer?</h1>
              <div className={s.grid2}>
                {TYPES.map(t => (
                  <button key={t.id} type="button" className={cx(s.card, s.typeCard, type === t.id && s.sel)} onClick={() => setType(t.id)}>
                    <span className={s.typeName}>{t.name}</span>
                    <span className={s.typeSub}>{t.sub}</span>
                    {type === t.id && <Check />}
                  </button>
                ))}
              </div>

              <div className={s.group}>
                <span className={s.label}>Tamaño aproximado</span>
                <div className={s.sizeStage} aria-hidden="true">
                  <div className={s.sizeDot} style={{ width: size?.px ?? 20, height: size?.px ?? 20 }} />
                  <span className={s.sizeRuler}>{size ? size.cm : 'Elige un tamaño'}</span>
                </div>
                <div className={s.chips}>
                  {SIZES.map(z => (
                    <button
                      key={z.id}
                      type="button"
                      className={cx(s.chip, sizeId === z.id && s.sel)}
                      onClick={() => {
                        setSizeId(z.id);
                        setSlot(null);
                      }}
                    >
                      {z.name}
                    </button>
                  ))}
                </div>
                <span className={s.hint}>
                  {consult
                    ? 'Para la consulta basta con una idea del tamaño.'
                    : size
                      ? `Sesión de unas ${size.durText} · ${priceText(artist, size)} orientativo`
                      : 'El círculo crece para que veas la escala.'}
                </span>
              </div>

              <div className={s.group}>
                <span className={s.label}>¿En qué zona?</span>
                <div className={s.chips}>
                  {ZONES.map(n => (
                    <button key={n} type="button" className={cx(s.chip, zone === n && s.sel)} onClick={() => setZone(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section key="s2" className={cx(s.section, s[dir])}>
              <h1 className={s.disp}>Elige día y hora</h1>
              <div className={s.note}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#8FC2AC" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 7v5l3 2M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z" />
                </svg>
                <span>
                  Solo te enseñamos huecos donde caben tus <strong>{durText}</strong> con {artistFirst}.
                </span>
              </div>
              <div className={s.monthRow}>
                <div className={s.monthNav}>
                  <button type="button" className={s.navBtn} disabled={weekOffset === 0} onClick={() => setWeekOffset(w => Math.max(0, w - 1))} aria-label="Semana anterior">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </button>
                  <span className={s.label}>{monthLabel}</span>
                  <button type="button" className={s.navBtn} disabled={weekOffset >= 7} onClick={() => setWeekOffset(w => Math.min(7, w + 1))} aria-label="Semana siguiente">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                </div>
                <span className={s.legend}>
                  <span className={s.dots}>
                    <i />
                  </span>
                  = hueco libre
                </span>
              </div>
              <div className={s.grid7}>
                {days.map(d => {
                  const off = d.slots.length === 0;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      className={cx(s.day, day === d.key && s.sel)}
                      disabled={off}
                      onClick={() => {
                        setDay(d.key);
                        setSlot(null);
                      }}
                      aria-label={`${d.long}${off ? ', completo' : `, ${d.slots.length} huecos`}`}
                    >
                      <span className={s.dayW}>{d.w}</span>
                      <span className={s.dayN}>{d.n}</span>
                      <span className={s.dots}>
                        {d.slots.slice(0, 3).map(t => (
                          <i key={t} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
              {!busy && <p className={s.center}>Buscando huecos libres…</p>}
              {busy && selectedDayInfo && selectedDayInfo.slots.length > 0 && (
                <div key={selectedDayInfo.key} className={cx(s.group, s.stag)}>
                  <span className={s.label}>Horas libres el {selectedDayInfo.long}</span>
                  <div className={s.grid3}>
                    {selectedDayInfo.slots.map((t, i) => (
                      <button key={t} type="button" className={cx(s.chip, s.stag, slot === t && s.sel)} style={{ animationDelay: `${i * 60}ms` }} onClick={() => setSlot(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {busy && (!selectedDayInfo || selectedDayInfo.slots.length === 0) && (
                <p className={s.center}>
                  {days.every(d => d.slots.length === 0) ? 'No quedan huecos esta semana. Prueba con la siguiente.' : 'Toca un día con puntos verdes para ver sus horas.'}
                </p>
              )}
            </section>
          )}

          {step === 3 && (
            <section key="s3" className={cx(s.section, s[dir])}>
              <h1 className={s.disp}>Revisa tu cita</h1>
              <div className={s.summary}>
                {[
                  { k: 'Tatuador', v: artist?.display_name ?? '', to: 0 },
                  { k: 'Qué', v: TYPES.find(t => t.id === type)?.name ?? '', to: 1 },
                  { k: 'Tamaño y zona', v: sizeZoneText, to: 1 },
                  { k: 'Cuándo', v: whenText, to: 2 },
                ].map(r => (
                  <div key={r.k} className={s.row}>
                    <b>{r.k}</b>
                    <span className={s.rowVal}>
                      {r.v}
                      <button type="button" className={s.edit} onClick={() => go(r.to)}>
                        Cambiar
                      </button>
                    </span>
                  </div>
                ))}
                <div className={s.priceRow}>
                  <span className={s.priceLabel}>Precio orientativo</span>
                  <span className={s.price}>{price}</span>
                </div>
                <p className={s.small}>Calculado con las tarifas de {artistFirst}. El precio final lo confirma en persona.</p>
              </div>
              <label className={s.idea}>
                Cuéntale tu idea (opcional)
                <textarea rows={3} value={idea} onChange={e => setIdea(e.target.value)} placeholder="Ej.: una rosa de línea fina con el tallo largo" />
              </label>
            </section>
          )}

          {done && (
            <section key="s4" className={cx(s.done, s.fwd)}>
              <div className={s.okWrap}>
                <span className={s.ring} />
                <div className={s.ok}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              </div>
              <h1 className={s.disp}>¡Cita pedida!</h1>
              <p className={s.doneText}>
                {cap(artistFirst)} la confirmará en menos de 24 h. Te avisamos por email y la verás en &quot;Mis citas&quot;.
              </p>
              <div className={s.nextSteps}>
                <span className={s.kicker}>LO QUE VIENE AHORA</span>
                <div className={cx(s.stepCard, s.stepCardMain, s.stag)} style={{ animationDelay: '.5s' }}>
                  <span className={s.num}>1</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 700 }}>Firma el consentimiento</span>
                    <span style={{ fontSize: 13, color: 'var(--mut)', lineHeight: 1.45 }}>Dos minutos desde el móvil. Así el día de la cita no esperas.</span>
                    <button type="button" className={cx(s.chip, s.sel)} style={{ alignSelf: 'flex-start' }} onClick={() => created && onSignConsent(created)}>
                      Firmar ahora
                    </button>
                  </div>
                </div>
                <div className={cx(s.stepCard, s.stag)} style={{ animationDelay: '.6s' }}>
                  <span className={s.num}>2</span>
                  <span>
                    Te recordamos la cita <strong>48 h antes</strong> por email.
                  </span>
                </div>
                <div className={cx(s.stepCard, s.stag)} style={{ animationDelay: '.7s' }}>
                  <span className={s.num}>3</span>
                  <span>Después, mándale fotos de la curación desde el chat.</span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Botón principal fijo abajo */}
        <footer className={s.footer}>
          <span className={cx(s.help, error && s.error)}>{help}</span>
          <button type="button" className={s.cta} disabled={(!done && !ready[step]) || submitting} onClick={next}>
            <span>{submitting ? 'Pidiendo cita…' : done ? 'Ver mis citas' : labels[step]}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </footer>
      </div>
    </div>
  );
}
