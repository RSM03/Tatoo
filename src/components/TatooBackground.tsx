'use client';

import React from 'react';

export default function TatooBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none">
      {/* 1. Deep Obsidian Base Void */}
      <div className="absolute inset-0 bg-[#050608]" />

      {/* 2. Studio Interior Atmosphere Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.20] mix-blend-screen scale-105"
        style={{
          backgroundImage: "url('/tattoo-studio-bg.jpg')",
          maskImage: 'radial-gradient(ellipse at 50% 40%, black 30%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 40%, black 30%, transparent 85%)'
        }}
      />

      {/* 3. High-Definition Tattoo Linework & Smoke Swirls */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-[0.32] mix-blend-screen scale-110 transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: "url('/tattoo-smoke-bg.jpg')",
          maskImage: 'radial-gradient(ellipse at 50% 30%, black 35%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 30%, black 35%, transparent 80%)'
        }}
      />

      {/* 4. Vivid Atmospheric Glowing Light Orbs */}
      {/* Orb 1: Intense Blood Crimson Ink Pool */}
      <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-crimson-600/25 blur-[120px] animate-float-slow" />

      {/* Orb 2: Warm Incandescent Studio Filament Amber */}
      <div className="absolute -bottom-[10%] -right-[10%] w-[55vw] h-[55vw] rounded-full bg-amber-500/20 blur-[130px] animate-float-reverse" />

      {/* Orb 3: Deep Blood Velvet Heart Core */}
      <div className="absolute top-[35%] right-[25%] w-[40vw] h-[40vw] rounded-full bg-crimson-700/18 blur-[140px] animate-pulse-slow" />

      {/* Orb 4: Antique Gold Studio Accent */}
      <div className="absolute bottom-[25%] left-[20%] w-[35vw] h-[35vw] rounded-full bg-amber-600/12 blur-[110px] animate-float-slow" />

      {/* 5. Tattoo Studio Watermark Matrix (Geometric & Needle Points) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.06] text-crimson-400"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
      >
        <defs>
          <pattern id="tattoo-grid-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="40" cy="40" r="1.5" fill="currentColor" />
            <path d="M 40 0 L 40 10 M 40 70 L 40 80 M 0 40 L 10 40 M 70 40 L 80 40" stroke="currentColor" strokeWidth="0.8" fill="none" />
            {/* Subtle diamond point */}
            <path d="M 38 40 L 40 38 L 42 40 L 40 42 Z" fill="currentColor" opacity="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#tattoo-grid-pattern)" />
      </svg>

      {/* 6. Subtle Gothic Corner Filigree Accents */}
      <div className="absolute top-0 left-0 w-48 h-48 border-t-2 border-l-2 border-crimson-500/20 opacity-40 pointer-events-none rounded-tl-3xl m-3" />
      <div className="absolute top-0 right-0 w-48 h-48 border-t-2 border-r-2 border-amber-500/20 opacity-40 pointer-events-none rounded-tr-3xl m-3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 border-b-2 border-l-2 border-amber-500/20 opacity-40 pointer-events-none rounded-bl-3xl m-3" />
      <div className="absolute bottom-0 right-0 w-48 h-48 border-b-2 border-r-2 border-crimson-500/20 opacity-40 pointer-events-none rounded-br-3xl m-3" />

      {/* 7. Deep Studio Vignette Frame */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050608]/75 via-transparent to-[#050608]/85" />
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 45%, transparent 35%, rgba(5, 6, 8, 0.85) 100%)'
        }}
      />
    </div>
  );
}
