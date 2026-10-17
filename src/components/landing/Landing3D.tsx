'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { SceneState } from './scene3d/LandingScene';
import s from './landing.module.css';

/**
 * Lienzo 3D fijo detrás de la sección "Servicios". Three.js se carga aparte (no retrasa la primera pintura)
 * y solo si hay WebGL y el usuario no pidió "reducir movimiento".
 * El recorrido de la cámara sale del ScrollTrigger fijo de la sección (id 'services')
 * y de dos más que se crean aquí: la llegada (aparece) y la salida (se desvanece).
 */
export default function Landing3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    import('./scene3d/LandingScene')
      .then(({ createLandingScene }) => {
        if (disposed) return;
        gsap.registerPlugin(ScrollTrigger);

        const q = (sel: string) => document.querySelector(sel);
        const make = (trigger: Element | null, start: string, end: string) =>
          trigger ? ScrollTrigger.create({ trigger, start, end }) : undefined;
        const enterST = make(q('[data-services]'), 'top bottom', 'top top');
        const outST = make(q('[data-statement]'), 'top 75%', 'top 15%');
        const triggers = [enterST, outST];

        const getState = (): SceneState => {
          const enter = enterST?.progress ?? 0;
          const svc = ScrollTrigger.getById('services');
          return {
            enter,
            svc: (svc?.progress ?? 0) * 3,
            // Aparece en la segunda mitad de la llegada y se desvanece al pasar a la siguiente sección
            opacity: Math.min(1, Math.max(0, (enter - 0.35) / 0.5)) * (1 - (outST?.progress ?? 0)),
          };
        };

        let handle: ReturnType<typeof createLandingScene>;
        try {
          handle = createLandingScene(canvas, getState);
        } catch {
          // Sin WebGL: la portada sigue funcionando sin el fondo 3D
          triggers.forEach((t) => t?.kill());
          return;
        }

        ScrollTrigger.sort();
        ScrollTrigger.refresh();

        cleanup = () => {
          triggers.forEach((t) => t?.kill());
          handle.dispose();
        };
      })
      .catch(() => {});

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return <canvas ref={canvasRef} className={s.scene3d} aria-hidden="true" />;
}
