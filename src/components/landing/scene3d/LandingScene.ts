import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createAgenda, createCamera, createScales, createScroll, disposeTree, type Piece } from './objects';

/**
 * Escena 3D de la sección "Servicios" de la portada (Three.js, sin React).
 *
 * La cámara sigue el scroll (lo calcula GSAP/ScrollTrigger fuera y lo lee `getState`):
 *   llegada  → la cámara baja hasta la primera pieza mientras el lienzo aparece
 *   servicios→ viaja de pieza en pieza (agenda, presupuestos, curación, consentimiento)
 * Encima: parallax con el ratón y "hover" con Raycaster (la pieza crece, gira más rápido y su oro brilla).
 *
 * Rendimiento: un solo requestAnimationFrame, no dibuja si el lienzo está invisible,
 * resolución limitada, sin sombras y geometría con pocos polígonos.
 */

export interface SceneState {
  /** 0→1 llegando a la sección de servicios */
  enter: number;
  /** 0→3 recorriendo las cuatro piezas */
  svc: number;
  /** Opacidad del lienzo (0 = no se dibuja) */
  opacity: number;
}

export interface LandingSceneHandle {
  dispose: () => void;
}

const ROW_GAP = 7; // separación entre piezas
const FOV = 35;

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const damp = (cur: number, target: number, lambda: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

export function createLandingScene(canvas: HTMLCanvasElement, getState: () => SceneState): LandingSceneHandle {
  const isPhone = () => window.innerWidth / window.innerHeight < 0.8;

  // ---------- Renderer, escena y cámara ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

  // ---------- Luces: ambiente cálido, luz principal dorada y un contraluz verde (el del botón) ----------
  scene.add(new THREE.AmbientLight(0xffe6c4, 0.45));
  const key = new THREE.DirectionalLight(0xffdcae, 2.4);
  key.position.set(4, 6, 6);
  const rim = new THREE.DirectionalLight(0x8fc2ac, 1.1);
  rim.position.set(-6, 2, -5);
  scene.add(key, rim, key.target, rim.target);

  // ---------- Piezas, en fila ----------
  const pieces: Piece[] = [createAgenda(), createScales(), createCamera(), createScroll()];
  pieces.forEach((p, i) => {
    p.group.position.set(i * ROW_GAP, 0, 0);
    scene.add(p.group);
  });
  const fx = pieces.map((_, i) => ({ hover: 0, phase: i * 1.7 }));

  // ---------- Tamaño ----------
  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isPhone() ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  // ---------- Ratón: parallax y hover ----------
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, ndc: new THREE.Vector2(9, 9), moved: false };
  const onPointer = (e: PointerEvent) => {
    pointer.x = e.clientX / window.innerWidth - 0.5;
    pointer.y = e.clientY / window.innerHeight - 0.5;
    pointer.ndc.set(pointer.x * 2, -pointer.y * 2);
    pointer.moved = true;
  };
  const onLeave = () => pointer.ndc.set(9, 9);
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  const raycaster = new THREE.Raycaster();
  let hovered = -1;

  // ---------- Encuadres de cámara ----------
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();

  // Pieza k a la derecha (ordenador) o arriba (móvil), dejando sitio al texto
  const svcPose = (k: number, outPos: THREE.Vector3, outLook: THREE.Vector3) => {
    const phone = isPhone();
    const d = phone ? 10.5 : 7.4;
    const halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * d;
    const halfW = halfH * camera.aspect;
    const x = k * ROW_GAP;
    if (phone) outLook.set(x, -0.4 * halfH, 0);
    else outLook.set(x - 0.46 * halfW, -0.05 * halfH, 0);
    outPos.set(outLook.x, outLook.y + 0.35, d);
  };

  // ---------- Bucle ----------
  const cur: SceneState = { enter: 0, svc: 0, opacity: 0 };
  let raf = 0;
  let last = performance.now();
  let t = 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    const target = getState();
    cur.enter = damp(cur.enter, target.enter, 5, dt);
    cur.svc = damp(cur.svc, target.svc, 4.5, dt);
    cur.opacity = damp(cur.opacity, target.opacity, 8, dt);

    canvas.style.opacity = cur.opacity.toFixed(3);
    if (cur.opacity < 0.01) return; // invisible: no se dibuja

    t += dt;

    // Cámara: llegada desde arriba y después de pieza en pieza
    const s = Math.min(3, Math.max(0, cur.svc));
    const k = Math.min(2, Math.floor(s));
    const f = smooth(s - k);
    svcPose(k, pos, look);
    svcPose(k + 1, tmpPos, tmpLook);
    pos.lerp(tmpPos, f);
    look.lerp(tmpLook, f);
    pos.z += Math.sin(Math.PI * f) * 2;
    const rise = 1 - smooth(clamp01(cur.enter));
    pos.y += rise * 4;
    pos.z += rise * 3;

    // Parallax del ratón
    pointer.sx = damp(pointer.sx, pointer.x, 3, dt);
    pointer.sy = damp(pointer.sy, pointer.y, 3, dt);
    camera.position.set(pos.x + pointer.sx * 0.7, pos.y - pointer.sy * 0.45, pos.z);
    camera.lookAt(look.x + pointer.sx * 0.15, look.y - pointer.sy * 0.1, look.z);

    // Hover con Raycaster (solo si el lienzo se ve bien)
    if (pointer.moved || hovered >= 0) {
      pointer.moved = false;
      hovered = -1;
      if (cur.opacity > 0.5) {
        raycaster.setFromCamera(pointer.ndc, camera);
        for (let i = 0; i < pieces.length; i++) {
          if (raycaster.intersectObject(pieces[i].group, true).length) {
            hovered = i;
            break;
          }
        }
      }
    }

    pieces.forEach((p, i) => {
      const e = fx[i];
      e.hover = damp(e.hover, hovered === i ? 1 : 0, 7, dt);
      e.phase += dt * (0.35 + e.hover * 2.4); // gira más rápido con el ratón encima
      p.group.scale.setScalar(1 + e.hover * 0.1);
      p.group.rotation.y = Math.sin(e.phase) * 0.55;
      p.group.rotation.x = Math.sin(e.phase * 0.7) * 0.08;
      p.group.position.y = Math.sin(t * 0.8 + i) * 0.08;
      p.gold.emissiveIntensity = e.hover * 0.45;
      p.tick(t);
    });

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('pointerleave', onLeave);
      pieces.forEach((p) => disposeTree(p.group));
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
