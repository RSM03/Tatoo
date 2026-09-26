'use client';

import React from 'react';

/**
 * Fondo "Flash de estudio"
 * Láminas de tatuaje en relieve (dragón, koi, calavera, tigre, golondrina...)
 * a los lados, centro limpio para el contenido. Tono cálido y muy suave para
 * que se lea cómodo durante horas.
 */
export default function TatooBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none" aria-hidden="true">
      {/* 1. Base carbón cálido */}
      <div className="absolute inset-0 bg-[#131210]" />

      {/* 2. Lámina de tatuajes en relieve */}
      <div
        className="absolute inset-0 bg-cover bg-center max-md:bg-[length:auto_100%] max-md:bg-[position:22%_center] max-md:opacity-80"
        style={{
          backgroundImage: "url('/tattoo-flash-bg.jpg')",
          filter: 'brightness(2.2) contrast(1.12) sepia(0.3) saturate(0.9)',
        }}
      />

      {/* 3. Toque cálido y un susurro de verde botella */}
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{ background: 'linear-gradient(180deg, rgba(176,148,102,0.18) 0%, rgba(47,90,71,0.12) 100%)' }}
      />

      {/* 4. Centro más oscuro para que el texto se lea perfecto */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 45% 60% at 50% 45%, rgba(19,18,16,0.55) 0%, transparent 100%)' }}
      />

      {/* 5. Viñeta suave en bordes */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(12,11,10,0.6) 100%)' }}
      />
    </div>
  );
}
