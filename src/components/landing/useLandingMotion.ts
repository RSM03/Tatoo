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

        // Servicios: la sección se queda fija 3 pantallas; el texto cambia a mitad de camino entre pieza y pieza
        // (la cámara 3D lee el progreso de este mismo ScrollTrigger, id 'services')
        const svc = q('[data-services]')[0] as HTMLElement | undefined;
        if (svc) {
          svc.dataset.scene = 'on';
          const panels = q('[data-svc-panel]') as HTMLElement[];
          const bars = q('[data-svc-bar]') as HTMLElement[];
          gsap.set(panels.slice(1), { autoAlpha: 0, y: 30 });
          gsap.set(bars, { '--p': 0 });
          gsap.set(bars[0], { '--p': 1 });
          const tl = gsap.timeline({
            defaults: { duration: 0.3 },
            scrollTrigger: { id: 'services', trigger: svc, start: 'top top', end: '+=300%', scrub: 0.6, pin: true, pinSpacing: true, anticipatePin: 1 },
          });
          tl.to({}, { duration: 3 }, 0);
          for (let k = 1; k < panels.length; k++) {
            tl.to(panels[k - 1], { autoAlpha: 0, y: -30, ease: 'power2.in' }, k - 0.8)
              .fromTo(panels[k], { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, ease: 'power2.out' }, k - 0.5)
              .to(bars[k], { '--p': 1, ease: 'none' }, k - 0.5);
          }
          // Entrada del primer texto al llegar
          gsap.from(panels[0].children, { autoAlpha: 0, y: 24, duration: 0.8, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: svc, start: 'top 70%' } });
        }

        // Lo que dejas atrás: cada problema se tacha al llegar, aparece la solución y al móvil le llega su aviso
        // (en ordenador el aviso sale a la vez que su frase; en móvil, al llegar al propio móvil)
        const wide = window.matchMedia('(min-width: 900px)').matches;
        const notifs = q('[data-notif]') as HTMLElement[];
        (q('[data-pain]') as HTMLElement[]).forEach((row, i) => {
          if (notifs[i]) {
            gsap.from(notifs[i], { autoAlpha: 0, y: 18, scale: 0.97, duration: 0.6, ease: 'power3.out', delay: wide ? 0.6 : 0.1 * i, scrollTrigger: { trigger: wide ? row : notifs[i], start: wide ? 'top 82%' : 'top 92%' } });
          }
          gsap
            .timeline({ scrollTrigger: { trigger: row, start: 'top 82%' } })
            .fromTo(row.querySelector('[data-pain-text]'), { color: '#f4e7d0' }, { color: '#a08a6c', duration: 0.5 }, 0.55)
            .from(row.querySelector('[data-strike]'), { scaleX: 0, duration: 0.6, ease: 'power2.inOut' }, 0.35)
            .from(row.querySelector('[data-fix]'), { autoAlpha: 0, y: 10, duration: 0.6, ease: 'power3.out' }, 0.75);
        });

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

        return () => {
          if (svc) delete svc.dataset.scene;
        };
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
