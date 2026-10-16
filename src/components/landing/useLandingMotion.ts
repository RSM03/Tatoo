'use client';

import { useEffect, useLayoutEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// Dónde flota cada lámina al principio (fracción del ancho/alto de la pantalla) y cómo va girada.
const SCATTER = [
  { x: 0.12, y: 0.25, r: -14, ry: 24 },
  { x: 0.88, y: 0.25, r: 12, ry: -26 },
  { x: 0.15, y: 0.75, r: 9, ry: 18 },
  { x: 0.85, y: 0.74, r: -11, ry: -20 },
];

/**
 * Animaciones de la portada (GSAP + ScrollTrigger):
 *  - Ordenador: la portada se queda fija y, al bajar, las láminas vuelan desde alrededor del título a sus marcos.
 *  - Móvil: las láminas aparecen al llegar a ellas, sin fijar la pantalla.
 *  - Con "reducir movimiento" activado no se anima nada y todo se ve en su sitio.
 */
export function useLandingMotion(rootRef: RefObject<HTMLElement>) {
  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add(
        { desktop: '(min-width: 900px)', motion: '(prefers-reduced-motion: no-preference)' },
        (c) => {
          const { desktop, motion } = c.conditions as { desktop: boolean; motion: boolean };
          if (!motion) return;

          const q = gsap.utils.selector(root);
          const stage = q('[data-stage]')[0] as HTMLElement | undefined;
          const cards = q('[data-card]') as HTMLElement[];

          // Entrada del título (espera a que acabe la intro si se está mostrando)
          // Se crea ya (así arranca oculto) y se reproduce al acabar la intro
          const heroTl = gsap.timeline({ paused: true });
          const words = q('[data-hero] [data-w]');
          const pops = q('[data-pop]');
          const fades = q('[data-hero-fade]');
          if (words.length) heroTl.from(words, { yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: 0.06 }, 0);
          if (pops.length) heroTl.from(pops, { autoAlpha: 0, scale: 0.7, duration: 1, ease: 'back.out(1.6)', stagger: 0.09 }, 0.3);
          if (fades.length) heroTl.from(fades, { autoAlpha: 0, y: 18, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 0.45);
          const heroIn = () => heroTl.play();

          if (document.documentElement.dataset.intro === 'on') {
            window.addEventListener('tatoo-intro-done', heroIn, { once: true });
          } else {
            heroIn();
          }

          if (desktop && stage) {
            stage.dataset.scene = 'on';

            const offset = (card: HTMLElement, i: number) => {
              const slot = (card.parentElement as HTMLElement).getBoundingClientRect();
              const sr = stage.getBoundingClientRect();
              return {
                x: sr.left + sr.width * SCATTER[i].x - (slot.left + slot.width / 2),
                y: sr.top + sr.height * SCATTER[i].y - (slot.top + slot.height / 2),
              };
            };

            const tl = gsap.timeline({
              defaults: { ease: 'power2.inOut' },
              scrollTrigger: { trigger: stage, start: 'top top', end: '+=150%', scrub: 0.8, pin: true, pinSpacing: true, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1 },
            });
            cards.forEach((card, i) => {
              tl.fromTo(
                card,
                { x: () => offset(card, i).x, y: () => offset(card, i).y, rotation: SCATTER[i].r, rotationY: SCATTER[i].ry, scale: 1.05 },
                { x: 0, y: 0, rotation: 0, rotationY: 0, scale: 1, duration: 1 },
                i * 0.07
              );
            });
            tl.to(q('[data-hero-text]'), { autoAlpha: 0, y: -70, scale: 0.94, duration: 0.55, ease: 'power2.in' }, 0)
              .to(q('[data-micro-hint]'), { autoAlpha: 0, duration: 0.2 }, 0)
              .fromTo(q('[data-slots-head]'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.35 }, 0.72)
              .fromTo(q('[data-slot-outline]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, stagger: 0.05 }, 0.55)
              .fromTo(q('[data-slot-label]'), { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.07 }, 0.8);

            // Las láminas se inclinan un poco siguiendo el ratón
            const tilts = q('[data-tilt]') as HTMLElement[];
            const onMove = (e: PointerEvent) => {
              const nx = e.clientX / window.innerWidth - 0.5;
              const ny = e.clientY / window.innerHeight - 0.5;
              tilts.forEach((t, i) => {
                const k = 0.7 + (i % 2) * 0.5;
                t.style.setProperty('--ry', `${nx * 18 * k}deg`);
                t.style.setProperty('--rx', `${-ny * 14 * k}deg`);
              });
            };
            stage.addEventListener('pointermove', onMove);
            return () => {
              window.removeEventListener('tatoo-intro-done', heroIn);
              stage.removeEventListener('pointermove', onMove);
              delete stage.dataset.scene;
              tilts.forEach((t) => {
                t.style.removeProperty('--rx');
                t.style.removeProperty('--ry');
              });
            };
          }

          // Móvil: las láminas y sus textos aparecen al llegar
          const slots = q('[data-slot]');
          if (slots.length) {
            gsap.from(slots, {
              autoAlpha: 0,
              y: 40,
              duration: 0.8,
              ease: 'power3.out',
              stagger: 0.1,
              scrollTrigger: { trigger: q('[data-slots]')[0], start: 'top 85%' },
            });
          }
          return () => window.removeEventListener('tatoo-intro-done', heroIn);

        }
      );

      // Animaciones comunes a ordenador y móvil
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const q = gsap.utils.selector(root);

        // Lo que dejas atrás: cada problema se tacha al llegar y aparece la solución
        (q('[data-pain]') as HTMLElement[]).forEach((row) => {
          gsap
            .timeline({ scrollTrigger: { trigger: row, start: 'top 82%' } })
            .fromTo(row.querySelector('[data-pain-text]'), { color: '#f4e7d0' }, { color: '#a08a6c', duration: 0.5 }, 0.55)
            .from(row.querySelector('[data-strike]'), { scaleX: 0, duration: 0.6, ease: 'power2.inOut' }, 0.35)
            .from(row.querySelector('[data-fix]'), { autoAlpha: 0, y: 10, duration: 0.6, ease: 'power3.out' }, 0.75);
        });
        // La foto se abre y se acerca
        const photo = q('[data-st-photo]')[0];
        if (photo) {
          gsap.fromTo(photo, { clipPath: 'inset(16% 12% 16% 12% round 8px)' }, { clipPath: 'inset(0% 0% 0% 0% round 8px)', ease: 'none', scrollTrigger: { trigger: photo, start: 'top 88%', end: 'center 55%', scrub: true } });
          gsap.fromTo(q('[data-st-img]'), { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true } });
        }

        // Títulos que suben palabra a palabra al llegar
        (q('[data-reveal-words]') as HTMLElement[]).forEach((el) => {
          gsap.from(el.querySelectorAll('[data-w]'), { yPercent: 115, duration: 1, ease: 'power4.out', stagger: 0.05, scrollTrigger: { trigger: el, start: 'top 82%' } });
        });
        // Cómo funciona: la línea dorada se llena al bajar y cada paso aparece y dibuja su icono al llegar
        const track = q('[data-track]')[0];
        if (track) {
          gsap.fromTo(q('[data-track-fill]'), { '--p': 0 }, { '--p': 1, ease: 'none', scrollTrigger: { trigger: track, start: 'top 75%', end: 'bottom 60%', scrub: true } });
          (q('[data-step]') as HTMLElement[]).forEach((step) => {
            const paths = Array.from(step.querySelectorAll<SVGPathElement>('[data-step-path]'));
            paths.forEach((path) => {
              const L = path.getTotalLength();
              gsap.set(path, { strokeDasharray: L, strokeDashoffset: L });
            });
            gsap
              .timeline({ scrollTrigger: { trigger: step, start: 'top 78%' } })
              .from(step.querySelector('[data-medal]'), { autoAlpha: 0, scale: 0.7, duration: 0.7, ease: 'back.out(1.7)' })
              .to(paths, { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut', stagger: 0.06 }, 0.2)
              .from(step.querySelectorAll('[data-step-text]'), { autoAlpha: 0, y: 16, duration: 0.6, ease: 'power3.out', stagger: 0.08 }, 0.25);
          });
        }

        // Bloques que aparecen suavemente
        ScrollTrigger.batch(q('[data-reveal]') as HTMLElement[], {
          start: 'top 88%',
          onEnter: (els) => gsap.fromTo(els, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, overwrite: true }),
        });
      });
    }, root);

    // La escena de la máquina (más abajo) se crea antes que esta: ordena y recalcula para que mida con el hueco ya puesto
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    // Las medidas cambian cuando carga la letra: recalcula
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => ctx.revert();
  }, []);
}
