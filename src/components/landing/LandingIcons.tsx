import React, { useId } from 'react';

const useGoldId = (name: string) => `gold-${name}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

// Iconos dorados "grabados" de la portada. Cada uno lleva su propio degradado (ids únicos).
const INK = '#3a2313';

function Gold({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor="#fdeabb" />
        <stop offset="0.38" stopColor="#e2b571" />
        <stop offset="0.7" stopColor="#a8743a" />
        <stop offset="1" stopColor="#efcb88" />
      </linearGradient>
    </defs>
  );
}

const svgProps = { viewBox: '0 0 96 96', 'aria-hidden': true, focusable: false } as const;

export function CalendarIcon({ className }: { className?: string }) {
  const id = useGoldId('cal');
  const g = `url(#${id})`;
  return (
    <svg {...svgProps} className={className}>
      <Gold id={id} />
      <rect x="9" y="17" width="78" height="66" rx="8" fill={g} stroke={INK} strokeWidth="1.6" />
      <path d="M9 33h78" stroke={INK} strokeWidth="1.6" />
      <rect x="15" y="38" width="66" height="40" rx="3" fill="#f6dfaa" opacity="0.35" />
      {[0, 1, 2, 3].map(c =>
        [0, 1, 2].map(r => (
          <rect key={`${c}-${r}`} x={20 + c * 15} y={41 + r * 12} width="10" height="8" rx="1.2" fill="none" stroke={INK} strokeWidth="1.8" />
        ))
      )}
      <path d="M87 63v12a8 8 0 0 1-8 8H67z" fill="#7c5326" stroke={INK} strokeWidth="1.4" />
      <path d="M67 83l20-20" stroke={INK} strokeWidth="1.4" />
      {[22, 34, 46, 58, 70].map(x => (
        <rect key={x} x={x - 2.8} y="9" width="5.6" height="15" rx="2.8" fill={g} stroke={INK} strokeWidth="1.3" />
      ))}
    </svg>
  );
}

function sealPath(cx: number, cy: number, rOut: number, rIn: number, n: number) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOut : rIn;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

export function ScalesIcon({ className }: { className?: string }) {
  const id = useGoldId('scl');
  const g = `url(#${id})`;
  return (
    <svg {...svgProps} className={className}>
      <Gold id={id} />
      <path d={sealPath(48, 48, 46, 41, 28)} fill={g} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="48" cy="48" r="36" fill="#2a190e" stroke={INK} strokeWidth="1.4" />
      <circle cx="48" cy="48" r="33" fill="none" stroke={g} strokeWidth="1.4" />
      <g stroke={g} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M48 27v42M28 34h40M28 34l-6 16M28 34l6 16M68 34l-6 16M68 34l6 16" />
        <path d="M40 69h16l3 5H37z" fill={g} />
      </g>
      <path d="M20 50q8 9 16 0z" fill={g} stroke={INK} strokeWidth="1" />
      <path d="M60 50q8 9 16 0z" fill={g} stroke={INK} strokeWidth="1" />
      <circle cx="48" cy="26" r="3.2" fill={g} stroke={INK} strokeWidth="0.8" />
    </svg>
  );
}

export function CameraIcon({ className }: { className?: string }) {
  const id = useGoldId('cam');
  const g = `url(#${id})`;
  return (
    <svg {...svgProps} className={className}>
      <Gold id={id} />
      <path d="M34 30l5-10h18l5 10z" fill={g} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="13" y="23" width="13" height="7" rx="1.5" fill={g} stroke={INK} strokeWidth="1.3" />
      <rect x="7" y="29" width="82" height="50" rx="7" fill={g} stroke={INK} strokeWidth="1.6" />
      <rect x="7" y="40" width="82" height="28" fill="#5a3a1c" opacity="0.45" />
      <path d="M7 40h82M7 68h82" stroke={INK} strokeWidth="1.2" />
      <circle cx="48" cy="54" r="21" fill={g} stroke={INK} strokeWidth="1.6" />
      <circle cx="48" cy="54" r="16" fill="#24160c" stroke={INK} strokeWidth="1.2" />
      <circle cx="48" cy="54" r="12.5" fill="none" stroke={g} strokeWidth="1.8" />
      <circle cx="48" cy="54" r="7" fill="#3b2614" stroke={g} strokeWidth="1.2" />
      <circle cx="44" cy="50" r="2.6" fill="#fdeabb" opacity="0.85" />
      <circle cx="78" cy="35" r="2.6" fill="#24160c" stroke={g} strokeWidth="1" />
      <circle cx="71" cy="35" r="2.6" fill="#24160c" stroke={g} strokeWidth="1" />
    </svg>
  );
}

export function ScrollIcon({ className }: { className?: string }) {
  const id = useGoldId('scr');
  const g = `url(#${id})`;
  return (
    <svg {...svgProps} className={className}>
      <Gold id={id} />
      <path d="M20 14h44v64H20z" fill={g} stroke={INK} strokeWidth="1.5" />
      <rect x="14" y="8" width="56" height="11" rx="5.5" fill={g} stroke={INK} strokeWidth="1.5" />
      <path d="M17 80h50a6 6 0 0 0 0-12H23a6 6 0 0 0 0 12" fill={g} stroke={INK} strokeWidth="1.5" />
      <g stroke={INK} strokeWidth="1.8" strokeLinecap="round">
        {[27, 34, 41, 48, 55].map((y, i) => (
          <path key={y} d={`M27 ${y}H${i === 4 ? 46 : 57}`} />
        ))}
      </g>
      <path d="M27 63c3-4 5 2 8-1s4-3 6 0" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M88 10c-12 9-23 27-30 52l4 2c8-22 18-39 28-50z" fill={g} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M86 14c-9 10-18 26-25 46" fill="none" stroke={INK} strokeWidth="0.9" />
      <g stroke={INK} strokeWidth="0.9" strokeLinecap="round">
        <path d="M80 20l5 3M76 27l5 3M72 34l5 3M68 42l5 3M65 50l4 2" />
      </g>
      <path d="M58 62l-3 9 6-6" fill={INK} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export function StarOrnament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d="M12 1l1.8 7.2L21 6l-4.5 6L21 18l-7.2-2.2L12 23l-1.8-7.2L3 18l4.5-6L3 6l7.2 2.2z" fill="currentColor" />
      <circle cx="12" cy="12" r="2.2" fill="#1d130d" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

export function FlagIcon({ lang, className }: { lang: 'es' | 'en'; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`flag-${lang}`}>
          <circle cx="10" cy="10" r="9" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-${lang})`}>
        {lang === 'es' ? (
          <>
            <rect width="20" height="20" fill="#c60b1e" />
            <rect y="5" width="20" height="10" fill="#ffc400" />
          </>
        ) : (
          <>
            <rect width="20" height="20" fill="#012169" />
            <path d="M0 0l20 20M20 0L0 20" stroke="#fff" strokeWidth="4" />
            <path d="M0 0l20 20M20 0L0 20" stroke="#c8102e" strokeWidth="1.6" />
            <path d="M10 0v20M0 10h20" stroke="#fff" strokeWidth="6" />
            <path d="M10 0v20M0 10h20" stroke="#c8102e" strokeWidth="3.4" />
          </>
        )}
      </g>
      <circle cx="10" cy="10" r="9" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="1" />
    </svg>
  );
}
