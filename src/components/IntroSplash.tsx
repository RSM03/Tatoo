'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Intro de entrada "Tatoo AI"
 * Una chispa dorada traza cada letra (como la punta de la aguja), la letra se
 * rellena de tinta y la pantalla hace zoom hacia la app. Sale una vez por sesión.
 * Es solo una capa por encima: no cambia nada de la app.
 */

const GLYPHS: { ch: string; ai: boolean; subs: string[]; full: string }[] = [{"ch": "T", "ai": false, "subs": ["M171.4 132.7L171.4 132.7L171.4 42.6L176.7 37.5L166.0 37.5Q155.6 37.5 154.2 43.1L154.2 43.1L150.5 43.1L140.8 29.1Q142.8 25.9 146.1 23.3Q149.3 20.8 152.4 20.8L152.4 20.8L197.2 20.8Q207.6 20.8 209.0 15.2L209.0 15.2L212.7 15.2L222.4 29.1Q220.4 32.4 217.1 34.9Q213.9 37.5 210.8 37.5L210.8 37.5L191.8 37.5L191.8 123.8Q191.8 130.1 193.2 132.8Q194.5 135.6 198.8 135.6L198.8 135.6L198.8 140.8L163.9 155.4L161.2 150.0Q164.9 150.0 168.3 145.6L168.3 145.6Q171.4 141.3 171.4 132.7Z"], "full": "M171.4 132.7L171.4 132.7L171.4 42.6L176.7 37.5L166.0 37.5Q155.6 37.5 154.2 43.1L154.2 43.1L150.5 43.1L140.8 29.1Q142.8 25.9 146.1 23.3Q149.3 20.8 152.4 20.8L152.4 20.8L197.2 20.8Q207.6 20.8 209.0 15.2L209.0 15.2L212.7 15.2L222.4 29.1Q220.4 32.4 217.1 34.9Q213.9 37.5 210.8 37.5L210.8 37.5L191.8 37.5L191.8 123.8Q191.8 130.1 193.2 132.8Q194.5 135.6 198.8 135.6L198.8 135.6L198.8 140.8L163.9 155.4L161.2 150Q164.9 150 168.3 145.6L168.3 145.6Q171.4 141.3 171.4 132.7Z"}, {"ch": "a", "ai": false, "subs": ["M273.9 75.5L273.9 75.5L273.9 123.7Q273.9 129.9 276.0 132.4Q278.0 134.9 282.3 135.9L282.3 135.9L282.3 139.6L263.7 150.0Q260.0 148.5 256.8 145.0Q253.5 141.5 253.5 138.6L253.5 138.6L232.3 150.0Q231.8 149.7 230.7 149.1Q229.7 148.5 227.3 146.5Q224.8 144.6 222.9 142.3L222.9 142.3Q217.8 136.7 217.8 129.6L217.8 129.6L217.8 101.7Q217.8 99.0 226.7 94.8Q235.5 90.5 244.3 87.8L244.3 87.8L253.3 84.9Q253.3 75.2 248.2 71.4Q243.1 67.5 228.5 67.5L228.5 67.5L228.5 62.4Q254.9 53.1 258.1 53.1L258.1 53.1Q263.7 53.1 268.8 60.4Q273.9 67.7 273.9 75.5Z", "M238.2 123.5Q238.2 127.9 240.9 130.7Q243.5 133.5 246.7 133.5Q249.9 133.5 253.5 131.0L253.5 131.0L253.5 92.5Q249.3 94.1 247.1 95.1Q245.0 96.1 242.6 98.3L242.6 98.3Q238.2 102.4 238.2 112.4L238.2 112.4L238.2 123.5Z"], "full": "M273.9 75.5L273.9 75.5L273.9 123.7Q273.9 129.9 276.0 132.4Q278 134.9 282.3 135.9L282.3 135.9L282.3 139.6L263.7 150Q260.0 148.5 256.8 145.0Q253.5 141.5 253.5 138.6L253.5 138.6L232.3 150Q231.8 149.7 230.7 149.1Q229.7 148.5 227.3 146.5Q224.8 144.6 222.9 142.3L222.9 142.3Q217.8 136.7 217.8 129.6L217.8 129.6L217.8 101.7Q217.8 99 226.7 94.8Q235.5 90.5 244.3 87.8L244.3 87.8L253.3 84.9Q253.3 75.2 248.2 71.4Q243.1 67.5 228.5 67.5L228.5 67.5L228.5 62.4Q254.9 53.1 258.1 53.1L258.1 53.1Q263.7 53.1 268.8 60.4Q273.9 67.7 273.9 75.5ZM238.2 123.5Q238.2 127.9 240.9 130.7Q243.5 133.5 246.7 133.5Q249.9 133.5 253.5 131.0L253.5 131.0L253.5 92.5Q249.3 94.1 247.1 95.1Q245.0 96.1 242.6 98.3L242.6 98.3Q238.2 102.4 238.2 112.4L238.2 112.4L238.2 123.5Z"}, {"ch": "t", "ai": false, "subs": ["M306.6 35.4L311.3 35.4L311.3 55.6L320.0 55.6L318.3 64.0L311.3 64.0L311.3 124.8Q311.3 135.2 318.3 136.6L318.3 136.6L318.3 140.3L301.1 150.0Q297.4 148.5 294.1 145.0Q290.9 141.5 290.9 138.4L290.9 138.4L290.9 64.1L283.9 64.1L285.6 57.0Q290.7 57.0 298.0 50.1Q305.2 43.2 306.6 35.4L306.6 35.4Z"], "full": "M306.6 35.4L311.3 35.4L311.3 55.6L320.0 55.6L318.3 64.0L311.3 64.0L311.3 124.8Q311.3 135.2 318.3 136.6L318.3 136.6L318.3 140.3L301.1 150Q297.4 148.5 294.1 145.0Q290.9 141.5 290.9 138.4L290.9 138.4L290.9 64.1L283.9 64.1L285.6 57.0Q290.7 57.0 298.0 50.1Q305.2 43.2 306.6 35.4L306.6 35.4Z"}, {"ch": "o", "ai": false, "subs": ["M328.3 125.2L328.3 125.2L328.3 68.7Q328.3 67.5 347.7 60.3Q367.1 53.1 370.0 53.1Q372.9 53.1 378.7 60.1Q384.6 67.0 384.6 72.6L384.6 72.6L384.6 134.2Q384.6 135.6 366.0 142.8Q347.4 150.0 343.2 150.0Q339.0 150.0 333.7 142.7Q328.3 135.4 328.3 125.2Z", "M357.4 134.4L357.4 134.4Q360.6 134.4 364.0 131.6L364.0 131.6L364.0 81.5Q364.0 68.9 355.3 68.9L355.3 68.9Q351.9 68.9 348.7 71.5L348.7 71.5L348.7 121.8Q348.7 134.4 357.4 134.4Z"], "full": "M328.3 125.2L328.3 125.2L328.3 68.7Q328.3 67.5 347.7 60.3Q367.1 53.1 370.0 53.1Q372.9 53.1 378.7 60.1Q384.6 67.0 384.6 72.6L384.6 72.6L384.6 134.2Q384.6 135.6 366.0 142.8Q347.4 150 343.2 150Q339.0 150 333.7 142.7Q328.3 135.4 328.3 125.2ZM357.4 134.4L357.4 134.4Q360.6 134.4 364.0 131.6L364.0 131.6L364.0 81.5Q364.0 68.9 355.3 68.9L355.3 68.9Q351.9 68.9 348.7 71.5L348.7 71.5L348.7 121.8Q348.7 134.4 357.4 134.4Z"}, {"ch": "o", "ai": false, "subs": ["M401.6 125.2L401.6 125.2L401.6 68.7Q401.6 67.5 421.0 60.3Q440.3 53.1 443.2 53.1Q446.1 53.1 452.0 60.1Q457.9 67.0 457.9 72.6L457.9 72.6L457.9 134.2Q457.9 135.6 439.2 142.8Q420.6 150.0 416.5 150.0Q412.3 150.0 406.9 142.7Q401.6 135.4 401.6 125.2Z", "M430.7 134.4L430.7 134.4Q433.9 134.4 437.3 131.6L437.3 131.6L437.3 81.5Q437.3 68.9 428.6 68.9L428.6 68.9Q425.2 68.9 422.0 71.5L422.0 71.5L422.0 121.8Q422.0 134.4 430.7 134.4Z"], "full": "M401.6 125.2L401.6 125.2L401.6 68.7Q401.6 67.5 421.0 60.3Q440.3 53.1 443.2 53.1Q446.1 53.1 452.0 60.1Q457.9 67.0 457.9 72.6L457.9 72.6L457.9 134.2Q457.9 135.6 439.2 142.8Q420.6 150 416.5 150Q412.3 150 406.9 142.7Q401.6 135.4 401.6 125.2ZM430.7 134.4L430.7 134.4Q433.9 134.4 437.3 131.6L437.3 131.6L437.3 81.5Q437.3 68.9 428.6 68.9L428.6 68.9Q425.2 68.9 422.0 71.5L422.0 71.5L422.0 121.8Q422.0 134.4 430.7 134.4Z"}, {"ch": "A", "ai": true, "subs": ["M507.2 132.7L507.2 132.7L507.2 35.1Q507.2 33.9 526.5 26.7Q545.9 19.4 548.8 19.4Q551.7 19.4 557.6 26.4Q563.4 33.4 563.4 39.0L563.4 39.0L563.4 83.5L571.8 83.5L571.8 87.6L563.4 91.9L563.4 124.8Q563.4 134.2 571.6 135.9L571.6 135.9L571.6 139.6L553.1 150.0Q549.3 148.5 546.1 145.0Q542.9 141.5 542.9 138.4L542.9 138.4L542.9 91.9L527.6 91.9L527.6 123.8Q527.6 130.1 528.9 132.8Q530.3 135.6 534.5 135.6L534.5 135.6L534.5 140.8L499.7 155.4L497.0 150.0Q500.7 150.0 504.1 145.6L504.1 145.6Q507.2 141.3 507.2 132.7Z", "M534.2 35.2L534.2 35.2Q530.8 35.2 527.6 37.8L527.6 37.8L527.6 87.9L537.6 83.5L542.9 83.5L542.9 47.8Q542.9 35.2 534.2 35.2Z"], "full": "M507.2 132.7L507.2 132.7L507.2 35.1Q507.2 33.9 526.5 26.7Q545.9 19.4 548.8 19.4Q551.7 19.4 557.6 26.4Q563.4 33.4 563.4 39.0L563.4 39.0L563.4 83.5L571.8 83.5L571.8 87.6L563.4 91.9L563.4 124.8Q563.4 134.2 571.6 135.9L571.6 135.9L571.6 139.6L553.1 150Q549.3 148.5 546.1 145.0Q542.9 141.5 542.9 138.4L542.9 138.4L542.9 91.9L527.6 91.9L527.6 123.8Q527.6 130.1 528.9 132.8Q530.3 135.6 534.5 135.6L534.5 135.6L534.5 140.8L499.7 155.4L497.0 150Q500.7 150 504.1 145.6L504.1 145.6Q507.2 141.3 507.2 132.7ZM534.2 35.2L534.2 35.2Q530.8 35.2 527.6 37.8L527.6 37.8L527.6 87.9L537.6 83.5L542.9 83.5L542.9 47.8Q542.9 35.2 534.2 35.2Z"}, {"ch": "I", "ai": true, "subs": ["M580.4 128.2L580.4 128.2L580.4 50.5Q580.4 44.3 579.1 41.5Q577.7 38.8 573.5 38.8L573.5 38.8L573.5 33.5L608.3 18.9L611.0 24.4Q607.3 24.4 603.9 28.8L603.9 28.8Q600.8 33.0 600.8 41.7L600.8 41.7L600.8 121.6Q600.8 126.2 602.4 128.2Q603.9 130.1 607.6 130.1L607.6 130.1L607.6 134.9Q573.1 150.0 572.9 150.0L572.9 150.0L570.2 144.6Q571.6 144.6 573.5 143.4Q575.5 142.2 576.9 140.7L576.9 140.7Q580.4 136.6 580.4 128.2Z"], "full": "M580.4 128.2L580.4 128.2L580.4 50.5Q580.4 44.3 579.1 41.5Q577.7 38.8 573.5 38.8L573.5 38.8L573.5 33.5L608.3 18.9L611.0 24.4Q607.3 24.4 603.9 28.8L603.9 28.8Q600.8 33.0 600.8 41.7L600.8 41.7L600.8 121.6Q600.8 126.2 602.4 128.2Q603.9 130.1 607.6 130.1L607.6 130.1L607.6 134.9Q573.1 150 572.9 150L572.9 150L570.2 144.6Q571.6 144.6 573.5 143.4Q575.5 142.2 576.9 140.7L576.9 140.7Q580.4 136.6 580.4 128.2Z"}];

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
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const g = lettersRef.current, pen = penRef.current;
    if (!g || !pen) return;
    const NS = 'http://www.w3.org/2000/svg';
    let raf = 0; const timers: number[] = [];
    const glyphs = GLYPHS.map((o) => {
      const fill = document.createElementNS(NS, 'path');
      fill.setAttribute('d', o.full); fill.setAttribute('fill', o.ai ? '#c9bb92' : '#efeae2'); fill.setAttribute('fill-opacity', '0');
      g.appendChild(fill);
      const subs = o.subs.map((d) => {
        const p = document.createElementNS(NS, 'path') as SVGPathElement;
        p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#c9bb92');
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
      <div className="tatoo-intro-bg" />
      <div className="tatoo-intro-vig" />
      <div className={`tatoo-intro-stage ${zoom ? 'is-zoom' : ''}`}>
        <svg className="tatoo-intro-svg" viewBox="0 0 760 190">
          <defs>
            <radialGradient id="tatoo-halo"><stop offset="0" stopColor="rgba(227,207,154,.45)" /><stop offset="1" stopColor="rgba(227,207,154,0)" /></radialGradient>
            <radialGradient id="tatoo-halo2"><stop offset="0" stopColor="rgba(255,244,220,.95)" /><stop offset="1" stopColor="rgba(227,207,154,0)" /></radialGradient>
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
