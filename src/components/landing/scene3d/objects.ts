import * as THREE from 'three';

/**
 * Piezas 3D de la portada: cristal ahumado con filos de oro,
 * una por servicio: esfera de agenda, balanza, cámara y pergamino.
 * Todo es geometría sencilla (pocos polígonos) y sin sombras dinámicas.
 */

export interface Piece {
  group: THREE.Group;
  /** Mallas que cuentan para el "hover" del ratón */
  hit: THREE.Object3D[];
  /** Oro propio de la pieza (para que brille solo la que tiene el ratón encima) */
  gold: THREE.MeshPhysicalMaterial;
  /** Animación propia (agujas, balanza, firma...) */
  tick: (t: number) => void;
}

// ---------- Materiales ----------

// Cristal: casi transparente de frente y reflejante en los bordes (efecto Fresnel), así se ve el fondo a través
function glassMaterial(side: THREE.Side, edge = 0.95, center = 0.14) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0x2a2320,
    metalness: 0,
    roughness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    specularIntensity: 1,
    specularColor: new THREE.Color(0xfff0d8),
    envMapIntensity: 2.4,
    iridescence: 0.3,
    iridescenceIOR: 1.3,
    transparent: true,
    depthWrite: false,
    side,
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float fres = pow(1.0 - abs(dot(normal, geometryViewDir)), 2.2);
       diffuseColor.a = mix(${center.toFixed(3)}, ${edge.toFixed(3)}, fres);
       #include <opaque_fragment>`
    );
  };
  return m;
}
const GLASS_FRONT = () => glassMaterial(THREE.FrontSide);
const GLASS_BACK = () => glassMaterial(THREE.BackSide, 0.55, 0.08);

export function goldMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xd9b07a,
    metalness: 1,
    roughness: 0.24,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.5,
    emissive: new THREE.Color(0xffb35c),
    emissiveIntensity: 0,
  });
}

// Malla de cristal: cara de atrás y de delante por separado para que se ordenen bien
function glass(geo: THREE.BufferGeometry): THREE.Group {
  const g = new THREE.Group();
  const back = new THREE.Mesh(geo, GLASS_BACK());
  const front = new THREE.Mesh(geo, GLASS_FRONT());
  back.renderOrder = 1;
  front.renderOrder = 2;
  g.add(back, front);
  return g;
}

function piece(build: (gold: THREE.MeshPhysicalMaterial, add: (o: THREE.Object3D) => THREE.Object3D) => (t: number) => void): Piece {
  const group = new THREE.Group();
  const gold = goldMaterial();
  const tick = build(gold, (o) => {
    group.add(o);
    return o;
  });
  return { group, gold, tick, hit: [group] };
}

const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => new THREE.Mesh(geo, mat);

// ---------- Agenda: esfera de reloj-calendario ----------
export function createAgenda(): Piece {
  return piece((gold, add) => {
    const dial = add(glass(new THREE.CylinderGeometry(1.0, 1.0, 0.24, 72, 1)));
    dial.rotation.x = Math.PI / 2;

    const rim = add(mesh(new THREE.TorusGeometry(1.0, 0.04, 12, 96), gold));
    rim.position.z = 0.12;
    const rimBack = add(mesh(new THREE.TorusGeometry(1.0, 0.025, 8, 96), gold));
    rimBack.position.z = -0.12;

    // Marcas de las horas (las de los cuartos, más largas)
    for (let i = 0; i < 12; i++) {
      const long = i % 3 === 0;
      const tickMesh = mesh(new THREE.BoxGeometry(0.045, long ? 0.22 : 0.12, 0.03), gold);
      const a = (i / 12) * Math.PI * 2;
      const rr = long ? 0.74 : 0.79;
      tickMesh.position.set(Math.sin(a) * rr, Math.cos(a) * rr, 0.13);
      tickMesh.rotation.z = -a;
      add(tickMesh);
    }

    // Agujas
    const hand = (len: number, w: number) => {
      const g = new THREE.Group();
      const m = mesh(new THREE.BoxGeometry(w, len, 0.025), gold);
      m.position.y = len / 2 - 0.06;
      g.add(m);
      g.position.z = 0.15;
      return add(g);
    };
    const hour = hand(0.42, 0.06);
    const minute = hand(0.62, 0.035);
    add(mesh(new THREE.SphereGeometry(0.07, 16, 8), gold)).position.z = 0.16;

    // Anillas de calendario arriba
    [-0.36, 0.36].forEach((x) => {
      const ring = mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 32), gold);
      ring.position.set(x, 1.02, 0);
      ring.rotation.y = Math.PI / 2;
      add(ring);
    });

    return (t) => {
      minute.rotation.z = -t * 0.6;
      hour.rotation.z = -t * 0.05 - 1.1;
    };
  });
}

// ---------- Presupuestos: balanza ----------
export function createScales(): Piece {
  return piece((gold, add) => {
    const base = add(glass(new THREE.CylinderGeometry(0.62, 0.7, 0.16, 48)));
    base.position.y = -1.12;
    const baseRim = add(mesh(new THREE.TorusGeometry(0.66, 0.02, 8, 64), gold));
    baseRim.rotation.x = Math.PI / 2;
    baseRim.position.y = -1.04;

    const post = add(mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.95, 16), gold));
    post.position.y = -0.1;
    add(mesh(new THREE.SphereGeometry(0.085, 16, 8), gold)).position.y = 0.93;

    const beam = new THREE.Group();
    beam.position.y = 0.82;
    add(beam);
    beam.add(mesh(new THREE.BoxGeometry(2.15, 0.05, 0.06), gold));

    // Platillos colgando de los extremos (siempre horizontales)
    const bowlGeo = new THREE.SphereGeometry(0.44, 40, 12, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38);
    const pans = [-1.02, 1.02].map((x) => {
      const hang = new THREE.Group();
      hang.position.x = x;
      beam.add(hang);
      const string = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.78, 6), gold);
      string.position.y = -0.39;
      hang.add(string);
      const bowl = glass(bowlGeo);
      bowl.position.y = -0.78 + 0.44 * Math.cos(Math.PI * 0.62) * -1;
      hang.add(bowl);
      const lip = mesh(new THREE.TorusGeometry(0.44 * Math.sin(Math.PI * 0.62), 0.016, 8, 48), gold);
      lip.rotation.x = Math.PI / 2;
      lip.position.y = -0.78;
      hang.add(lip);
      return hang;
    });

    return (t) => {
      beam.rotation.z = Math.sin(t * 0.9) * 0.13;
      pans.forEach((p) => (p.rotation.z = -beam.rotation.z));
    };
  });
}

// ---------- Curación: cámara de fotos ----------
function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function createCamera(): Piece {
  return piece((gold, add) => {
    const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(2.0, 1.28, 0.24), {
      depth: 0.5,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 4,
      curveSegments: 10,
    });
    bodyGeo.center();
    add(glass(bodyGeo));

    // Visor arriba
    const topGeo = new THREE.ExtrudeGeometry(roundedRect(0.62, 0.3, 0.08), { depth: 0.36, bevelEnabled: false, curveSegments: 6 });
    topGeo.center();
    const top = add(glass(topGeo));
    top.position.set(-0.32, 0.76, 0);

    // Objetivo: aro de oro, tubo de cristal, lente abombada y aro interior
    const lensRing = add(mesh(new THREE.TorusGeometry(0.47, 0.055, 12, 64), gold));
    lensRing.position.z = 0.33;
    const barrel = add(glass(new THREE.CylinderGeometry(0.43, 0.43, 0.3, 48, 1, true)));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = 0.48;
    const dome = add(glass(new THREE.SphereGeometry(0.43, 40, 16, 0, Math.PI * 2, 0, Math.PI * 0.32)));
    dome.rotation.x = Math.PI / 2;
    dome.position.z = 0.42;
    const inner = add(mesh(new THREE.TorusGeometry(0.27, 0.018, 8, 48), gold));
    inner.position.z = 0.63;
    const front = add(mesh(new THREE.TorusGeometry(0.43, 0.02, 8, 48), gold));
    front.position.z = 0.63;

    // Disparador y flash
    const shutter = add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 24), gold));
    shutter.position.set(0.62, 0.7, 0);
    const flash = add(mesh(new THREE.BoxGeometry(0.22, 0.12, 0.04), gold));
    flash.position.set(0.66, 0.36, 0.33);

    return (t) => {
      inner.rotation.z = t * 0.5;
    };
  });
}

// ---------- Consentimiento: pergamino firmado ----------
export function createScroll(): Piece {
  return piece((gold, add) => {
    // Hoja ligeramente curvada
    const sheetGeo = new THREE.PlaneGeometry(1.5, 1.95, 24, 1);
    const pos = sheetGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, -0.18 * Math.cos((x / 0.75) * (Math.PI / 2)));
    }
    sheetGeo.computeVertexNormals();
    add(glass(sheetGeo));

    // Rodillos arriba y abajo
    [1.0, -1.0].forEach((y) => {
      const rod = mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.72, 24), gold);
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, y, -0.08);
      add(rod);
      [-0.9, 0.9].forEach((x) => {
        const knob = mesh(new THREE.SphereGeometry(0.1, 16, 8), gold);
        knob.position.set(x, y, -0.08);
        add(knob);
      });
    });

    // Renglones de texto
    [0.6, 0.44, 0.28, 0.12, -0.04].forEach((y, i) => {
      const w = i === 4 ? 0.62 : 1.02;
      const line = mesh(new THREE.BoxGeometry(w, 0.028, 0.01), gold);
      line.position.set(-0.08 - (1.02 - w) / 2, y, 0.02);
      add(line);
    });

    // Firma: un trazo de oro que se dibuja y se borra en bucle
    const curve = new THREE.CatmullRomCurve3(
      [
        [-0.52, -0.5], [-0.36, -0.32], [-0.3, -0.58], [-0.16, -0.36], [-0.08, -0.56],
        [0.06, -0.38], [0.14, -0.55], [0.3, -0.42], [0.5, -0.5],
      ].map(([x, y]) => new THREE.Vector3(x, y, 0.03))
    );
    const sigGeo = new THREE.TubeGeometry(curve, 120, 0.018, 6, false);
    const sig = add(mesh(sigGeo, gold)) as THREE.Mesh;
    const under = add(mesh(new THREE.BoxGeometry(1.1, 0.012, 0.01), gold));
    under.position.set(0, -0.68, 0.02);
    const total = sigGeo.index ? sigGeo.index.count : 0;

    return (t) => {
      const k = (t * 0.25) % 1.3;
      const f = Math.min(1, k / 0.9);
      sig.geometry.setDrawRange(0, Math.floor(total * f / 6) * 6);
    };
  });
}

/** Libera la memoria de la GPU de un grupo y sus hijos */
export function disposeTree(root: THREE.Object3D) {
  const seen = new Set<unknown>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry && !seen.has(m.geometry)) {
      seen.add(m.geometry);
      m.geometry.dispose();
    }
    const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    mats.forEach((mat) => {
      if (!seen.has(mat)) {
        seen.add(mat);
        mat.dispose();
      }
    });
  });
}
