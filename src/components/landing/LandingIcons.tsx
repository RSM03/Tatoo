import React from 'react';

// Pequeños iconos de la web: estrella de adorno, flecha y banderas de idioma.
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
