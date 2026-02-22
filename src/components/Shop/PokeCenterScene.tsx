import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  dimmed: boolean;
}

/* ─── Rounded-rectangle extrude helper ─── */
function rrShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  r = Math.min(r, hw, hh);
  s.moveTo(-hw + r, -hh);
  s.lineTo(hw - r, -hh);
  s.quadraticCurveTo(hw, -hh, hw, -hh + r);
  s.lineTo(hw, hh - r);
  s.quadraticCurveTo(hw, hh, hw - r, hh);
  s.lineTo(-hw + r, hh);
  s.quadraticCurveTo(-hw, hh, -hw, hh - r);
  s.lineTo(-hw, -hh + r);
  s.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return s;
}

function rrBox(w: number, h: number, d: number, r = 0.06): THREE.ExtrudeGeometry {
  const shape = rrShape(w, h, r);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: Math.min(r * 0.5, 0.04),
    bevelSize: Math.min(r * 0.5, 0.04),
    bevelSegments: 3,
    curveSegments: 6,
  });
  geo.translate(0, 0, -d / 2);
  return geo;
}

export function PokeCenterScene({ dimmed }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const lightsRef = useRef<{
    hemi: THREE.HemisphereLight;
    dir: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
  } | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    /* ═══ SCENE + CAMERA + RENDERER ═══ */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#2a2018');
    scene.fog = new THREE.FogExp2('#2a2018', 0.018);

    const frustumSize = 12;
    const aspect = w / h;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2, frustumSize * aspect / 2,
      frustumSize / 2, -frustumSize / 2, 0.1, 100,
    );
    camera.position.set(0, 9, 10);
    camera.lookAt(0, 1.5, -1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    /* ═══ ENVIRONMENT MAP ═══ */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color('#ffe8cc');
    envScene.add(new THREE.AmbientLight('#ffe8cc', 1));
    scene.environment = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
    pmrem.dispose();

    /* ═══ LIGHTING ═══ */
    const hemi = new THREE.HemisphereLight('#ffeedd', '#8b7355', 0.7);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight('#fff5e0', 1.0);
    dir.position.set(5, 14, 8);
    dir.castShadow = true;
    dir.shadow.mapSize.setScalar(2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 40;
    dir.shadow.camera.left = -14;
    dir.shadow.camera.right = 14;
    dir.shadow.camera.top = 14;
    dir.shadow.camera.bottom = -14;
    dir.shadow.bias = -0.0008;
    dir.shadow.normalBias = 0.02;
    scene.add(dir);

    const fill = new THREE.DirectionalLight('#c8ddf0', 0.3);
    fill.position.set(-6, 6, 10);
    scene.add(fill);

    const rim = new THREE.DirectionalLight('#ffcc88', 0.2);
    rim.position.set(0, 8, -10);
    scene.add(rim);

    lightsRef.current = { hemi, dir, fill };

    /* ═══ MATERIAL PALETTE ═══ */
    const mat = (color: string, roughness = 0.7, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });

    const woodWall = mat('#b87848', 0.8);
    const woodDark = mat('#6a4020', 0.85);
    const woodTrim = mat('#8a5030', 0.7);
    const metalGrey = mat('#b0b0b8', 0.35, 0.4);
    const metalDark = mat('#606068', 0.4, 0.3);
    const redGloss = mat('#cc2828', 0.25, 0.1);
    const whiteClean = mat('#e8e8f0', 0.45, 0.05);
    const cream = mat('#f0e8d8', 0.6);
    const greenLeaf = mat('#3a9848', 0.7);
    const greenDark = mat('#2a6830', 0.75);
    const potBrown = mat('#8b5a2b', 0.65);
    const fabric = mat('#3060a0', 0.92);
    const glassMat = mat('#a8d8e8', 0.05, 0.1);
    glassMat.transparent = true;
    glassMat.opacity = 0.6;

    /* ═══ HELPERS ═══ */
    const place = (
      geo: THREE.BufferGeometry,
      material: THREE.Material | THREE.Material[],
      x: number, y: number, z: number,
      opts?: { rx?: number; ry?: number; rz?: number; shadow?: 'cast' | 'receive' | 'both' },
    ): THREE.Mesh => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      if (opts?.rx) m.rotation.x = opts.rx;
      if (opts?.ry) m.rotation.y = opts.ry;
      if (opts?.rz) m.rotation.z = opts.rz;
      if (opts?.shadow === 'cast' || opts?.shadow === 'both') m.castShadow = true;
      if (opts?.shadow === 'receive' || opts?.shadow === 'both') m.receiveShadow = true;
      scene.add(m);
      return m;
    };

    const box = (
      bw: number, bh: number, bd: number,
      material: THREE.Material, x: number, y: number, z: number,
      shadow?: 'cast' | 'receive' | 'both',
    ) => place(new THREE.BoxGeometry(bw, bh, bd), material, x, y, z, { shadow });

    const rbox = (
      bw: number, bh: number, bd: number, r: number,
      material: THREE.Material, x: number, y: number, z: number,
      shadow?: 'cast' | 'receive' | 'both',
    ) => place(rrBox(bw, bh, bd, r), material, x, y, z, { shadow });

    /* ═══ FLOOR ═══ */
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d')!;
    const ts = 64;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        fctx.fillStyle = (r + c) % 2 === 0 ? '#d8b050' : '#c8a040';
        fctx.fillRect(c * ts, r * ts, ts, ts);
        fctx.strokeStyle = 'rgba(0,0,0,0.08)';
        fctx.lineWidth = 1.5;
        fctx.strokeRect(c * ts + 0.5, r * ts + 0.5, ts - 1, ts - 1);
        fctx.strokeStyle = 'rgba(255,255,255,0.04)';
        fctx.strokeRect(c * ts + 3, r * ts + 3, ts - 6, ts - 6);
      }
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(3, 2);
    floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    place(
      new THREE.PlaneGeometry(20, 14),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6, metalness: 0.05 }),
      0, 0, 0, { rx: -Math.PI / 2, shadow: 'receive' },
    );

    // Baseboard trim
    box(20, 0.15, 0.1, woodTrim, 0, 0.075, 7);
    box(0.1, 0.15, 14, woodTrim, -10, 0.075, 0);
    box(0.1, 0.15, 14, woodTrim, 10, 0.075, 0);

    // Pokeball emblem
    const pbCanvas = document.createElement('canvas');
    pbCanvas.width = pbCanvas.height = 256;
    const pctx = pbCanvas.getContext('2d')!;
    pctx.strokeStyle = 'rgba(180,140,40,0.3)';
    pctx.lineWidth = 5;
    pctx.beginPath(); pctx.arc(128, 128, 90, 0, Math.PI * 2); pctx.stroke();
    pctx.lineWidth = 3;
    pctx.beginPath(); pctx.moveTo(38, 128); pctx.lineTo(218, 128); pctx.stroke();
    pctx.beginPath(); pctx.arc(128, 128, 25, 0, Math.PI * 2); pctx.stroke();
    pctx.beginPath(); pctx.arc(128, 128, 10, 0, Math.PI * 2); pctx.stroke();
    place(
      new THREE.PlaneGeometry(4.5, 4.5),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(pbCanvas), transparent: true, roughness: 0.7 }),
      0, 0.01, 2.5, { rx: -Math.PI / 2 },
    );

    // Welcome mat
    const matCanvas = document.createElement('canvas');
    matCanvas.width = 256; matCanvas.height = 128;
    const mctx = matCanvas.getContext('2d')!;
    mctx.fillStyle = '#8b3030';
    mctx.fillRect(0, 0, 256, 128);
    mctx.strokeStyle = '#c84040';
    mctx.lineWidth = 8;
    mctx.strokeRect(12, 12, 232, 104);
    mctx.fillStyle = '#e0c080';
    mctx.font = 'bold 28px sans-serif';
    mctx.textAlign = 'center';
    mctx.fillText('WELCOME', 128, 72);
    place(
      new THREE.PlaneGeometry(3, 1.5),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(matCanvas), roughness: 0.95 }),
      0, 0.015, 6, { rx: -Math.PI / 2 },
    );

    /* ═══ WALLS ═══ */
    box(20, 8, 0.35, woodWall, 0, 4, -6.2, 'receive');
    box(0.35, 8, 14, mat('#a06838', 0.8), -10, 4, 0, 'receive');
    box(0.35, 8, 14, mat('#a06838', 0.8), 10, 4, 0, 'receive');

    const trimMat = mat('#704020', 0.65);
    box(20, 0.25, 0.15, trimMat, 0, 7.88, -5.95);
    box(20, 0.25, 0.15, trimMat, 0, 0.12, -5.95);
    box(20, 0.15, 0.15, trimMat, 0, 3.8, -5.95);

    const panelLight = mat('#c89060', 0.75);
    const panelInner = mat('#b07840', 0.78);
    for (let i = -2; i <= 2; i++) {
      const px = i * 3.8;
      rbox(3.0, 2.8, 0.08, 0.08, panelLight, px, 1.9, -5.9);
      rbox(2.4, 2.2, 0.06, 0.06, panelInner, px, 1.9, -5.86);
      rbox(3.0, 2.8, 0.08, 0.08, panelLight, px, 5.4, -5.9);
      rbox(2.4, 2.2, 0.06, 0.06, panelInner, px, 5.4, -5.86);
    }

    // Ceiling
    box(20, 0.2, 14, mat('#3a2a1a', 0.9), 0, 8, 0);

    // Pendant lamps
    for (const lx of [-4, 0, 4]) {
      place(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8), mat('#888', 0.3, 0.5), lx, 7.15, 0);
      place(new THREE.CylinderGeometry(0.1, 0.6, 0.5, 16), mat('#e8d8c0', 0.6), lx, 6.35, 0, { shadow: 'cast' });
      place(new THREE.SphereGeometry(0.15, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe8a0' }), lx, 6.05, 0);
      const lamp = new THREE.PointLight('#ffe0a0', 0.3, 8);
      lamp.position.set(lx, 6.0, 0);
      scene.add(lamp);
    }

    /* ═══ TV ═══ */
    rbox(4.2, 2.8, 0.35, 0.12, mat('#2a2a30', 0.3, 0.2), 0, 5.8, -5.7, 'cast');
    rbox(3.8, 2.4, 0.1, 0.06, mat('#1a1a20', 0.2, 0.1), 0, 5.8, -5.5);
    const tvScreen = place(
      new THREE.PlaneGeometry(3.4, 2.0),
      new THREE.MeshBasicMaterial({ color: '#48c8e8' }),
      0, 5.8, -5.42,
    );
    box(0.3, 0.6, 0.15, mat('#333340', 0.3, 0.3), 0, 4.1, -5.7);
    box(1.2, 0.1, 0.5, mat('#333340', 0.3, 0.3), 0, 3.85, -5.7);

    const tvLogoCanvas = document.createElement('canvas');
    tvLogoCanvas.width = tvLogoCanvas.height = 128;
    const tctx = tvLogoCanvas.getContext('2d')!;
    tctx.strokeStyle = 'rgba(255,255,255,0.2)';
    tctx.lineWidth = 3;
    tctx.beginPath(); tctx.arc(64, 64, 36, 0, Math.PI * 2); tctx.stroke();
    tctx.lineWidth = 2;
    tctx.beginPath(); tctx.moveTo(28, 64); tctx.lineTo(100, 64); tctx.stroke();
    tctx.beginPath(); tctx.arc(64, 64, 10, 0, Math.PI * 2); tctx.stroke();
    place(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tvLogoCanvas), transparent: true }),
      0, 5.8, -5.41,
    );

    // Red cross
    const crossMat = new THREE.MeshStandardMaterial({ color: '#e04040', roughness: 0.3, emissive: '#400808', emissiveIntensity: 0.3 });
    place(new THREE.BoxGeometry(0.5, 1.5, 0.15), crossMat, 0, 7.4, -5.8);
    place(new THREE.BoxGeometry(1.5, 0.5, 0.15), crossMat, 0, 7.4, -5.8);

    // Wall clock
    place(new THREE.CylinderGeometry(0.65, 0.65, 0.12, 32), mat('#f5f0e8', 0.5), 6.5, 6, -5.8, { rx: Math.PI / 2 });
    place(new THREE.TorusGeometry(0.65, 0.06, 8, 32), mat('#6a4020', 0.4, 0.2), 6.5, 6, -5.7);
    place(new THREE.BoxGeometry(0.04, 0.5, 0.03), mat('#333', 0.5), 6.5, 6.12, -5.68);
    place(new THREE.BoxGeometry(0.03, 0.35, 0.03), mat('#333', 0.5), 6.62, 6.05, -5.68, { rz: -Math.PI / 4 });

    // Notice board
    rbox(2.5, 1.8, 0.15, 0.08, mat('#c08040', 0.7), -6.5, 5.5, -5.8, 'cast');
    rbox(2.1, 1.4, 0.06, 0.04, mat('#d4a860', 0.9), -6.5, 5.5, -5.7);
    for (const [nx, ny, nc] of [[-0.5, 0.3, '#ffe0a0'], [0.3, -0.2, '#a0d8ff'], [-0.2, -0.4, '#ffa0a0'], [0.5, 0.4, '#a0ffa0']] as const) {
      place(new THREE.PlaneGeometry(0.6, 0.5), mat(nc, 0.85), -6.5 + nx, 5.5 + ny, -5.63, { rz: (Math.random() - 0.5) * 0.3 });
      place(new THREE.SphereGeometry(0.04, 8, 8), mat('#cc3333', 0.3), -6.5 + nx, 5.5 + ny + 0.18, -5.6);
    }

    // Map poster
    rbox(2.2, 1.6, 0.12, 0.06, cream, 3.5, 5.5, -5.8);
    place(new THREE.PlaneGeometry(1.8, 1.2), mat('#80b860', 0.7), 3.5, 5.5, -5.68);
    for (let i = 0; i < 3; i++) {
      place(new THREE.PlaneGeometry(0.12, 0.12), mat('#c83838', 0.5), 3.2 + i * 0.35, 5.4 + (i % 2) * 0.2, -5.66);
    }

    /* ═══ COUNTER ═══ */
    rbox(12, 1.5, 2.5, 0.1, metalGrey, 0, 0.75, -3.2, 'both');
    box(12.1, 0.12, 2.6, redGloss, 0, 1.56, -3.2);
    rbox(12, 0.08, 0.06, 0.02, redGloss, 0, 1.15, -1.92);
    for (const xOff of [-3, 0, 3]) {
      box(0.03, 1.3, 0.05, mat('#9a9aa0', 0.4, 0.3), xOff, 0.75, -1.92);
    }
    rbox(12.4, 0.18, 2.7, 0.06, metalDark, 0, 0.09, -3.2, 'receive');

    /* ── Healing machine ── */
    rbox(2.6, 0.45, 2.0, 0.08, whiteClean, -2, 1.83, -3.2, 'cast');
    rbox(2.0, 0.1, 1.5, 0.06, mat('#d8d8e0', 0.4, 0.05), -2, 2.1, -3.2);

    place(
      new THREE.SphereGeometry(0.8, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: '#d8d8e0', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.85 }),
      -2, 2.15, -3.2, { shadow: 'cast' },
    );
    place(new THREE.TorusGeometry(0.8, 0.05, 12, 32), mat('#b0b0b8', 0.3, 0.4), -2, 2.15, -3.2, { rx: Math.PI / 2 });

    for (let row = 0; row < 2; row++) {
      for (let col = -1; col <= 1; col++) {
        const sx = -2 + col * 0.45, sz = -3.0 + row * 0.4;
        place(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 16), mat('#a8a8b0', 0.4, 0.3), sx, 2.08, sz);
        place(new THREE.SphereGeometry(0.1, 16, 12), mat('#e03030', 0.3), sx, 2.18, sz, { shadow: 'cast' });
      }
    }

    const healerLight = new THREE.PointLight('#44ff44', 0.6, 4);
    healerLight.position.set(-2, 2.9, -3);
    scene.add(healerLight);
    const healerGlow = place(
      new THREE.SphereGeometry(0.1, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#44ff44' }),
      -2, 2.95, -3.2,
    );

    // Control panel
    rbox(0.5, 0.35, 0.08, 0.03, mat('#404850', 0.4, 0.2), -0.55, 2.0, -2.25);
    for (let i = 0; i < 3; i++) {
      place(
        new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8),
        mat(i === 0 ? '#44cc44' : i === 1 ? '#cccc44' : '#cc4444', 0.4),
        -0.55 + (i - 1) * 0.14, 2.08, -2.22, { rx: Math.PI / 2 },
      );
    }

    /* ── PC terminal ── */
    rbox(1.2, 1.1, 0.6, 0.06, mat('#353d48', 0.35, 0.15), 3, 2.15, -3.3, 'cast');
    const pcScreen = place(
      new THREE.PlaneGeometry(0.9, 0.7),
      new THREE.MeshBasicMaterial({ color: '#40a8d0' }),
      3, 2.2, -2.98,
    );
    for (let i = 0; i < 3; i++) {
      place(new THREE.PlaneGeometry(0.6, 0.04), new THREE.MeshBasicMaterial({ color: '#80d8f0' }), 3, 2.35 - i * 0.15, -2.97);
    }
    place(new THREE.CylinderGeometry(0.15, 0.25, 0.15, 12), mat('#353d48', 0.35, 0.15), 3, 1.67, -3.3);
    rbox(1.0, 0.4, 0.06, 0.04, mat('#404850', 0.5, 0.1), 3, 1.65, -2.3);
    for (let kr = 0; kr < 3; kr++) {
      for (let kc = 0; kc < 6; kc++) {
        place(new THREE.BoxGeometry(0.1, 0.08, 0.02), mat('#555', 0.6, 0.1), 2.7 + kc * 0.12, 1.69, -2.45 + kr * 0.12);
      }
    }

    /* ── Counter bell ── */
    place(new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#d4a838', 0.2, 0.7), 0.5, 1.62, -2.3);
    place(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), mat('#c09830', 0.25, 0.6), 0.5, 1.62, -2.3);
    place(new THREE.SphereGeometry(0.04, 8, 8), mat('#aaa', 0.2, 0.8), 0.5, 1.77, -2.3);

    /* ── Flower baskets on counter ends ── */
    const fColors = ['#ff6b6b', '#ffcd75', '#48dbfb', '#ff9ff3', '#50c878'];
    for (const cx of [-5, 5]) {
      const potProfile = new THREE.Shape();
      potProfile.moveTo(0, 0);
      potProfile.lineTo(0.3, 0);
      potProfile.quadraticCurveTo(0.32, 0.15, 0.25, 0.3);
      potProfile.lineTo(0.22, 0.35);
      potProfile.quadraticCurveTo(0.28, 0.4, 0.35, 0.45);
      potProfile.lineTo(0.35, 0.5);
      potProfile.lineTo(0, 0.5);
      place(new THREE.LatheGeometry(potProfile.getPoints(12), 16), potBrown, cx, 1.62, -3.2, { shadow: 'cast' });
      place(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16), mat('#4a3020', 0.9), cx, 2.07, -3.2);
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const fr = 0.12 + Math.random() * 0.1;
        place(new THREE.SphereGeometry(0.1, 12, 10), mat(fColors[i % 5], 0.6), cx + Math.cos(angle) * fr, 2.2 + Math.random() * 0.1, -3.2 + Math.sin(angle) * fr);
      }
      for (let i = 0; i < 5; i++) {
        const la = (i / 5) * Math.PI * 2;
        place(new THREE.SphereGeometry(0.12, 8, 6), greenLeaf, cx + Math.cos(la) * 0.2, 2.1, -3.2 + Math.sin(la) * 0.2);
      }
    }

    // Tissue box
    rbox(0.35, 0.25, 0.3, 0.04, mat('#e8e0d0', 0.7), 1.5, 1.75, -2.5, 'cast');
    place(new THREE.PlaneGeometry(0.15, 0.12), mat('#f8f4f0', 0.9), 1.5, 1.93, -2.5);

    // Pen holder
    place(new THREE.CylinderGeometry(0.12, 0.1, 0.3, 12), mat('#404850', 0.5, 0.2), 4.2, 1.77, -2.8);
    for (let i = 0; i < 3; i++) {
      const pa = (i / 3) * Math.PI * 2 + 0.5;
      place(
        new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6),
        mat(i === 0 ? '#2244cc' : i === 1 ? '#cc2244' : '#22cc44', 0.5),
        4.2 + Math.cos(pa) * 0.05, 2.05, -2.8 + Math.sin(pa) * 0.05,
        { rz: (i - 1) * 0.12 },
      );
    }

    /* ═══ BOOKSHELVES ═══ */
    const bColors = ['#c83838', '#3868c8', '#48a848', '#c8a838', '#8838c8', '#c86828', '#2898a8'];
    for (const bsx of [-8, 8]) {
      rbox(2.0, 4.0, 1.1, 0.06, mat('#7a5838', 0.75), bsx, 2, -5.3, 'cast');
      for (let sr = 0; sr < 5; sr++) {
        box(1.9, 0.06, 1.05, mat('#5a3a22', 0.7), bsx, 0.15 + sr * 0.95, -5.3);
      }
      rbox(2.1, 0.12, 1.15, 0.04, mat('#6a4828', 0.7), bsx, 4.05, -5.3);
      for (let sr = 0; sr < 4; sr++) {
        let bx = bsx - 0.65;
        const numBooks = 5 + Math.floor(Math.random() * 3);
        for (let b = 0; b < numBooks; b++) {
          const bkw = 0.1 + Math.random() * 0.08;
          const bkh = 0.5 + Math.random() * 0.3;
          rbox(bkw, bkh, 0.5, 0.02, mat(bColors[b % bColors.length], 0.7), bx + bkw / 2, 0.45 + sr * 0.95 + bkh / 2, -5.3, 'cast');
          bx += bkw + 0.03;
        }
      }
    }

    /* ═══ POTTED PLANTS ═══ */
    for (const [ppx, ppz] of [[-7, 0.5], [7, 0.5], [-7, 4.5], [7, 4.5]] as const) {
      const potShape = new THREE.Shape();
      potShape.moveTo(0, 0);
      potShape.lineTo(0.35, 0);
      potShape.quadraticCurveTo(0.38, 0.2, 0.3, 0.5);
      potShape.quadraticCurveTo(0.32, 0.55, 0.38, 0.6);
      potShape.lineTo(0.38, 0.65);
      potShape.lineTo(0, 0.65);
      place(new THREE.LatheGeometry(potShape.getPoints(12), 16), potBrown, ppx, 0, ppz, { shadow: 'cast' });
      place(new THREE.CylinderGeometry(0.05, 0.06, 0.6, 8), mat('#4a6a28', 0.7), ppx, 0.95, ppz);
      const leafSizes = [0.5, 0.38, 0.42, 0.35];
      const leafOffsets: [number, number, number][] = [[0, 0, 0], [0.2, 0.1, 0.15], [-0.15, -0.05, -0.12], [0.05, 0.18, -0.1]];
      leafOffsets.forEach(([ox, oy, oz], i) => {
        place(new THREE.SphereGeometry(leafSizes[i], 16, 12), i % 2 === 0 ? greenLeaf : greenDark, ppx + ox, 1.4 + oy, ppz + oz, { shadow: 'cast' });
      });
    }

    /* ═══ BENCHES ═══ */
    const legMat = mat('#555', 0.4, 0.3);
    for (const bbx of [-4.5, 4.5]) {
      for (const [lx, lz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]] as const) {
        place(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), legMat, bbx + lx, 0.225, 3.5 + lz);
      }
      rbox(1.8, 0.08, 0.85, 0.04, legMat, bbx, 0.48, 3.5);
      rbox(1.7, 0.15, 0.75, 0.08, fabric, bbx, 0.59, 3.5, 'cast');
      rbox(1.7, 0.8, 0.1, 0.06, fabric, bbx, 1.0, 3.1, 'cast');
    }

    /* ═══ VENDING MACHINE ═══ */
    rbox(1.4, 3.2, 1.0, 0.08, mat('#cc3030', 0.4, 0.1), -9, 1.6, -3, 'cast');
    rbox(1.1, 1.8, 0.06, 0.06, glassMat, -9, 2.0, -2.45);
    rbox(1.3, 0.5, 0.06, 0.04, mat('#2040a0', 0.4), -9, 3.0, -2.45);
    place(new THREE.PlaneGeometry(0.8, 0.25), new THREE.MeshBasicMaterial({ color: '#fff' }), -9, 3.0, -2.4);
    const drinkColors = ['#ff4444', '#4488ff', '#44cc44', '#ffcc44', '#ff88cc'];
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        place(
          new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8),
          mat(drinkColors[(dr * 3 + dc) % 5], 0.3, 0.1),
          -9.25 + dc * 0.25, 1.3 + dr * 0.55, -2.6,
        );
      }
    }
    rbox(0.15, 0.25, 0.06, 0.02, mat('#888', 0.3, 0.5), -8.5, 1.8, -2.45);
    rbox(0.8, 0.25, 0.3, 0.04, mat('#333', 0.5, 0.2), -9, 0.3, -2.3);

    /* ═══ TRASH BIN ═══ */
    place(new THREE.CylinderGeometry(0.3, 0.25, 0.8, 16), mat('#606870', 0.5, 0.2), -3, 0.4, 5, { shadow: 'cast' });
    place(new THREE.TorusGeometry(0.3, 0.04, 8, 16), mat('#707880', 0.4, 0.3), -3, 0.8, 5, { rx: Math.PI / 2 });

    /* ═══ ROPE BARRIERS ═══ */
    for (const rpx of [-3, 3]) {
      place(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 12), mat('#c09830', 0.25, 0.6), rpx, 0.6, 0, { shadow: 'cast' });
      place(new THREE.SphereGeometry(0.12, 12, 10), mat('#d4a838', 0.2, 0.7), rpx, 1.22, 0);
      place(new THREE.CylinderGeometry(0.18, 0.2, 0.08, 12), mat('#b08828', 0.3, 0.5), rpx, 0.04, 0);
    }
    place(new THREE.CylinderGeometry(0.02, 0.02, 6.05, 8), mat('#8b2020', 0.7), 0, 0.95, 0, { rz: Math.PI / 2 });

    /* ═══ MEDICINE SHELVES ═══ */
    const bottleColors = ['#ff6060', '#6060ff', '#60c060', '#ffcc44'];
    for (const shX of [-3.5, 3.5]) {
      box(1.8, 0.08, 0.5, woodDark, shX, 3.2, -5.7);
      for (let bi = 0; bi < 4; bi++) {
        place(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 10), mat(bottleColors[bi], 0.3, 0.05), shX - 0.45 + bi * 0.3, 3.4, -5.6, { shadow: 'cast' });
        place(new THREE.CylinderGeometry(0.06, 0.08, 0.05, 10), mat('#fff', 0.4), shX - 0.45 + bi * 0.3, 3.57, -5.6);
      }
    }

    /* ═══ DOOR FRAME ═══ */
    const doorMat = mat('#8a6040', 0.65);
    rbox(0.6, 4, 0.6, 0.06, doorMat, -2.5, 2, 7, 'cast');
    rbox(0.6, 4, 0.6, 0.06, doorMat, 2.5, 2, 7, 'cast');
    rbox(5.6, 0.5, 0.6, 0.06, doorMat, 0, 4.25, 7, 'cast');
    rbox(3, 0.6, 0.08, 0.04, mat('#cc2828', 0.4), 0, 4.25, 7.35);
    place(new THREE.PlaneGeometry(2.5, 0.35), new THREE.MeshBasicMaterial({ color: '#fff' }), 0, 4.25, 7.4);

    /* ═══ POKEBALL ON SHELF ═══ */
    place(new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e03030', 0.35), -3.5, 3.57, -5.4);
    place(new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), whiteClean, -3.5, 3.57, -5.4);

    /* ═══ ANIMATION LOOP ═══ */
    let t = 0;
    const tick = () => {
      frameRef.current = requestAnimationFrame(tick);
      t += 0.016;
      healerLight.intensity = 0.3 + Math.sin(t * 2.5) * 0.3;
      healerGlow.scale.setScalar(0.8 + Math.sin(t * 2.5) * 0.2);
      (tvScreen.material as THREE.MeshBasicMaterial).color.setHSL(0.52, 0.65, 0.53 + Math.sin(t * 4) * 0.015);
      (pcScreen.material as THREE.MeshBasicMaterial).color.setHSL(0.52, 0.55, 0.5 + Math.sin(t * 6) * 0.02);
      renderer.render(scene, camera);
    };
    tick();

    /* ═══ RESIZE ═══ */
    const onResize = () => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      const na = nw / nh;
      camera.left = -frustumSize * na / 2;
      camera.right = frustumSize * na / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    /* ═══ CLEANUP ═══ */
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            if (m instanceof THREE.Material) {
              if ('map' in m && m.map) (m.map as THREE.Texture).dispose();
              m.dispose();
            }
          });
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!lightsRef.current) return;
    const { hemi, dir, fill } = lightsRef.current;
    hemi.intensity = dimmed ? 0.12 : 0.7;
    dir.intensity = dimmed ? 0.15 : 1.0;
    fill.intensity = dimmed ? 0.05 : 0.3;
  }, [dimmed]);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  );
}
