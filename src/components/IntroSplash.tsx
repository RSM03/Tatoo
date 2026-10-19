'use client';

import React, { useEffect, useRef, useState } from 'react';
import { INTRO_GLYPHS as GLYPHS } from './introGlyphs';

/**
 * Intro de entrada "Tattoo AI"
 * Una chispa dorada traza cada letra (como la punta de la aguja), la letra se
 * rellena de tinta y la pantalla hace zoom hacia la app. Sale una vez por sesión.
 * Es solo una capa por encima: no cambia nada de la app.
 */

export default function IntroSplash() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [ruleOn, setRuleOn] = useState(false);
  const [tagOn, setTagOn] = useState(false);
  const lettersRef = useRef<SVGGElement>(null);
  const penRef = useRef<SVGGElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('tatoo-intro-vista')) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      sessionStorage.setItem('tatoo-intro-vista', '1');
    } catch { /* si no hay sessionStorage, se muestra igual */ }
    // Aviso para la portada: espera a que termine la intro antes de animar
    document.documentElement.dataset.intro = 'on';
    setShow(true);
  }, []);

  const wasShown = useRef(false);
  useEffect(() => {
    if (show) {
      wasShown.current = true;
      return;
    }
    if (!wasShown.current) return;
    delete document.documentElement.dataset.intro;
    window.dispatchEvent(new Event('tatoo-intro-done'));
  }, [show]);

  useEffect(() => {
    if (!show) return;
    const g = lettersRef.current, pen = penRef.current;
    if (!g || !pen) return;
    const NS = 'http://www.w3.org/2000/svg';
    let raf = 0; const timers: number[] = [];
    const glyphs = GLYPHS.map((o) => {
      const fill = document.createElementNS(NS, 'path');
      fill.setAttribute('d', o.full); fill.setAttribute('fill', o.ai ? '#e6c48c' : '#f4e7d0'); fill.setAttribute('fill-opacity', '0');
      g.appendChild(fill);
      const subs = o.subs.map((d) => {
        const p = document.createElementNS(NS, 'path') as SVGPathElement;
        p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#e6c48c');
        p.setAttribute('stroke-width', '1.3'); p.setAttribute('stroke-linejoin', 'round');
        g.appendChild(p);
        const L = p.getTotalLength(); p.style.strokeDasharray = `${L}`; p.style.strokeDashoffset = `${L}`;
        return { p, L };
      });
      return { fill, subs, doneAt: 0, filled: false };
    });

    const START = 800, PER = 430, HOP = 90; let t = START;
    type Step = { hop: boolean; t0: number; t1: number; s: { p: SVGPathElement; L: number } };
    const plan: Step[] = [];
    glyphs.forEach((gl, gi) => {
      const tot = gl.subs.reduce((a, s) => a + s.L, 0);
      gl.subs.forEach((s, si) => {
        if (si > 0 || gi > 0) { plan.push({ hop: true, t0: t, t1: t + HOP, s }); t += HOP; }
        const d = (PER * s.L) / tot; plan.push({ hop: false, t0: t, t1: t + d, s }); t += d;
      });
      gl.doneAt = t;
    });
    const END = t;
    let last = { x: 0, y: 0 }; let finished = false;
    const at = (s: { p: SVGPathElement; L: number }, f: number) => s.p.getPointAtLength(s.L * f);
    const T0 = performance.now();

    const frame = (now: number) => {
      const e = now - T0; let pos: { x: number; y: number } | null = null; let vis = 1;
      if (e < START) { const f = Math.max(0, (e - (START - 500)) / 500); const p0 = at(plan[0].s, 0); pos = { x: p0.x, y: p0.y }; vis = f; }
      else if (e < END) {
        for (const st of plan) {
          if (e > st.t1) { if (!st.hop) st.s.p.style.strokeDashoffset = '0'; continue; }
          const f = (e - st.t0) / (st.t1 - st.t0);
          if (st.hop) { const b = at(st.s, 0); pos = { x: last.x + (b.x - last.x) * f, y: last.y + (b.y - last.y) * f }; }
          else { st.s.p.style.strokeDashoffset = `${st.s.L * (1 - f)}`; const p = at(st.s, f); pos = { x: p.x, y: p.y }; last = pos; }
          break;
        }
      } else { const f = Math.min(1, (e - END) / 500); pos = last; vis = 1 - f; }
      glyphs.forEach((gl) => {
        if (e > gl.doneAt - 120 && !gl.filled) {
          gl.filled = true;
          gl.fill.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], { duration: 650, easing: 'ease-out', fill: 'forwards' });
          gl.subs.forEach((s) => s.p.animate([{ strokeOpacity: 1 }, { strokeOpacity: 0 }], { duration: 650, delay: 250, fill: 'forwards' }));
        }
      });
      if (pos) { pen.setAttribute('transform', `translate(${pos.x.toFixed(1)},${pos.y.toFixed(1)})`); pen.setAttribute('opacity', `${vis}`); }
      if (e > END + 100 && !finished) {
        finished = true;
        timers.push(window.setTimeout(() => setRuleOn(true), 150));
        timers.push(window.setTimeout(() => setTagOn(true), 450));
        timers.push(window.setTimeout(() => { setZoom(true); setLeaving(true); }, 1700));
        timers.push(window.setTimeout(() => setShow(false), 2400));
      }
      if (e < END + 2600) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`tatoo-intro ${leaving ? 'is-leaving' : ''}`}
      onClick={() => setShow(false)}
      role="presentation"
      aria-hidden="true"
    >
      <div className={`tatoo-intro-stage ${zoom ? 'is-zoom' : ''}`}>
        <svg className="tatoo-intro-svg" viewBox="0 0 760 190">
          <defs>
            <radialGradient id="tatoo-halo"><stop offset="0" stopColor="rgba(236,200,140,.45)" /><stop offset="1" stopColor="rgba(236,200,140,0)" /></radialGradient>
            <radialGradient id="tatoo-halo2"><stop offset="0" stopColor="rgba(255,244,220,.95)" /><stop offset="1" stopColor="rgba(236,200,140,0)" /></radialGradient>
          </defs>
          <g ref={lettersRef} />
          <g ref={penRef} opacity={0}>
            <circle r={26} fill="url(#tatoo-halo)" />
            <circle r={9} fill="url(#tatoo-halo2)" />
            <circle r={2.2} fill="#fff7e6" />
          </g>
        </svg>
        <div className={`tatoo-intro-rule ${ruleOn ? 'is-on' : ''}`} />
        <div className={`tatoo-intro-tag ${tagOn ? 'is-on' : ''}`}>Agenda para estudios de tatuaje</div>
      </div>
    </div>
  );
}
