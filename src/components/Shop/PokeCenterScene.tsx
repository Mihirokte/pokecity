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
    bevelSegments: 4,
    curveSegments: 8,
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
    scene.background = new THREE.Color('#1e1610');
    scene.fog = new THREE.FogExp2('#1e1610', 0.014);

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
    renderer.toneMappingExposure = 1.25;
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
    const hemi = new THREE.HemisphereLight('#ffeedd', '#8b7355', 0.8);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight('#fff5e0', 1.1);
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

    const fill = new THREE.DirectionalLight('#c8ddf0', 0.35);
    fill.position.set(-6, 6, 10);
    scene.add(fill);

    const rim = new THREE.DirectionalLight('#ffcc88', 0.25);
    rim.position.set(0, 8, -10);
    scene.add(rim);

    lightsRef.current = { hemi, dir, fill };

    /* ═══ VIBRANT MATERIAL PALETTE ═══ */
    const mat = (color: string, roughness = 0.7, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });

    const matE = (color: string, emissive: string, eI: number, roughness = 0.3, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: eI });

    // Walls
    const woodWall = mat('#c07848', 0.7, 0.1);
    const woodDark = mat('#6a4020', 0.8);
    const woodTrim = mat('#a06838', 0.65);
    const moldingLight = mat('#d89060', 0.5, 0.15);
    const panelLight = mat('#c89060', 0.7);
    const panelInner = mat('#b07840', 0.75);

    // Counter
    const counterBody = mat('#d0d0d8', 0.25, 0.6);
    const counterTop = mat('#cc0000', 0.15, 0.3);
    const counterAccent = mat('#cc2828', 0.25, 0.2);
    const counterBase = mat('#a0a0a8', 0.35, 0.5);

    // Metal
    const metalDark = mat('#606068', 0.4, 0.3);
    const chrome = mat('#e8e8f0', 0.1, 0.9);
    const brass = mat('#d4a838', 0.2, 0.7);

    // Nature
    const greenLeaf = mat('#43a889', 0.6);
    const greenDark = mat('#2a6830', 0.7);
    const greenBright = mat('#91be6f', 0.5);
    const potBrown = mat('#8b5a2b', 0.65);

    // Furniture
    const fabric = mat('#3b4cca', 0.92);
    const whiteClean = mat('#f0f0f8', 0.3, 0.1);
    const cream = mat('#f0e8d8', 0.6);

    // Glass
    const glassMat = mat('#a8d8e8', 0.05, 0.1);
    glassMat.transparent = true;
    glassMat.opacity = 0.5;

    // Ceiling
    const ceilingMat = mat('#3a2a1a', 0.85);

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

    /* ═══════════════════════════════════════════════════
     *  FLOOR — golden checkerboard with pokeball emblem
     * ═══════════════════════════════════════════════════ */
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d')!;
    const ts = 64;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const v = Math.random() * 8 - 4;
        fctx.fillStyle = (r + c) % 2 === 0
          ? `rgb(${225 + v}, ${188 + v}, ${72 + v})`    // bright saffron
          : `rgb(${210 + v}, ${168 + v}, ${55 + v})`;   // deeper gold
        fctx.fillRect(c * ts, r * ts, ts, ts);
        // grout
        fctx.strokeStyle = 'rgba(0,0,0,0.12)';
        fctx.lineWidth = 1.5;
        fctx.strokeRect(c * ts + 0.5, r * ts + 0.5, ts - 1, ts - 1);
        // inner highlight
        fctx.strokeStyle = 'rgba(255,255,220,0.08)';
        fctx.lineWidth = 1;
        fctx.strokeRect(c * ts + 3, r * ts + 3, ts - 6, ts - 6);
      }
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(3, 2);
    floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    place(
      new THREE.PlaneGeometry(20, 14),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.45, metalness: 0.08 }),
      0, 0, 0, { rx: -Math.PI / 2, shadow: 'receive' },
    );

    // Baseboard trim
    box(20, 0.18, 0.12, woodTrim, 0, 0.09, 7);
    box(0.12, 0.18, 14, woodTrim, -10, 0.09, 0);
    box(0.12, 0.18, 14, woodTrim, 10, 0.09, 0);

    // Pokeball emblem — detailed, vibrant
    const pbCanvas = document.createElement('canvas');
    pbCanvas.width = pbCanvas.height = 512;
    const pctx = pbCanvas.getContext('2d')!;
    // outer circle
    pctx.strokeStyle = 'rgba(200,160,40,0.4)';
    pctx.lineWidth = 8;
    pctx.beginPath(); pctx.arc(256, 256, 200, 0, Math.PI * 2); pctx.stroke();
    // top half fill (red tint)
    pctx.fillStyle = 'rgba(220,50,50,0.15)';
    pctx.beginPath(); pctx.arc(256, 256, 195, Math.PI, 0); pctx.closePath(); pctx.fill();
    // center line
    pctx.strokeStyle = 'rgba(200,160,40,0.5)';
    pctx.lineWidth = 6;
    pctx.beginPath(); pctx.moveTo(56, 256); pctx.lineTo(456, 256); pctx.stroke();
    // outer ring
    pctx.lineWidth = 4;
    pctx.beginPath(); pctx.arc(256, 256, 55, 0, Math.PI * 2); pctx.stroke();
    // inner circle
    pctx.lineWidth = 3;
    pctx.beginPath(); pctx.arc(256, 256, 22, 0, Math.PI * 2); pctx.stroke();
    // center dot
    pctx.fillStyle = 'rgba(200,160,40,0.35)';
    pctx.beginPath(); pctx.arc(256, 256, 12, 0, Math.PI * 2); pctx.fill();
    place(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(pbCanvas), transparent: true, roughness: 0.6 }),
      0, 0.012, 2.5, { rx: -Math.PI / 2 },
    );

    // Welcome mat — vibrant red with gold border
    const matCanvas = document.createElement('canvas');
    matCanvas.width = 512; matCanvas.height = 256;
    const mctx = matCanvas.getContext('2d')!;
    mctx.fillStyle = '#8b2020';
    mctx.fillRect(0, 0, 512, 256);
    mctx.strokeStyle = '#d4af37';
    mctx.lineWidth = 10;
    mctx.strokeRect(12, 12, 488, 232);
    mctx.strokeStyle = '#ffd700';
    mctx.lineWidth = 3;
    mctx.strokeRect(24, 24, 464, 208);
    mctx.fillStyle = '#ffd700';
    mctx.font = 'bold 36px sans-serif';
    mctx.textAlign = 'center';
    mctx.fillText('WELCOME', 256, 140);
    place(
      new THREE.PlaneGeometry(3.2, 1.6),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(matCanvas), roughness: 0.92 }),
      0, 0.015, 6, { rx: -Math.PI / 2 },
    );

    /* ═══════════════════════════════════
     *  WALLS — wainscoting + crown molding
     * ═══════════════════════════════════ */
    box(20, 8, 0.35, woodWall, 0, 4, -6.2, 'receive');
    box(0.35, 8, 14, mat('#a86838', 0.75, 0.05), -10, 4, 0, 'receive');
    box(0.35, 8, 14, mat('#a86838', 0.75, 0.05), 10, 4, 0, 'receive');

    // Crown molding + chair rail + baseboard
    const trimDark = mat('#704020', 0.6, 0.1);
    box(20, 0.3, 0.18, moldingLight, 0, 7.85, -5.92);
    box(20, 0.22, 0.15, trimDark, 0, 0.11, -5.95);
    box(20, 0.18, 0.15, trimDark, 0, 3.8, -5.95);

    // Wainscoting panels (5 columns × 2 rows)
    for (let i = -2; i <= 2; i++) {
      const px = i * 3.8;
      rbox(3.0, 2.8, 0.1, 0.1, panelLight, px, 1.9, -5.88);
      rbox(2.4, 2.2, 0.07, 0.07, panelInner, px, 1.9, -5.83);
      rbox(3.0, 2.8, 0.1, 0.1, panelLight, px, 5.4, -5.88);
      rbox(2.4, 2.2, 0.07, 0.07, panelInner, px, 5.4, -5.83);
    }

    // Ceiling
    box(20, 0.22, 14, ceilingMat, 0, 8, 0);

    // Pendant lamps — 3 warm glow lights
    for (const lx of [-4, 0, 4]) {
      place(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 12), mat('#888', 0.3, 0.5), lx, 7.15, 0);
      place(new THREE.CylinderGeometry(0.08, 0.55, 0.55, 24), mat('#f4e4c0', 0.4, 0.15), lx, 6.35, 0, { shadow: 'cast' });
      place(new THREE.SphereGeometry(0.15, 24, 16), new THREE.MeshBasicMaterial({ color: '#ffe8a0' }), lx, 6.05, 0);
      const lamp = new THREE.PointLight('#ffe0a0', 0.4, 10);
      lamp.position.set(lx, 6.0, 0);
      scene.add(lamp);
    }

    /* ═══════════════════════════════
     *  TV — glowing screen with logo
     * ═══════════════════════════════ */
    rbox(4.4, 3.0, 0.35, 0.15, mat('#1a1a20', 0.25, 0.3), 0, 5.8, -5.65, 'cast');
    rbox(4.0, 2.6, 0.1, 0.08, mat('#0a0a10', 0.2, 0.15), 0, 5.8, -5.48);
    const tvScreen = place(
      new THREE.PlaneGeometry(3.6, 2.2),
      new THREE.MeshBasicMaterial({ color: '#48d8f0' }),
      0, 5.8, -5.38,
    );
    // TV stand
    box(0.35, 0.65, 0.18, mat('#222230', 0.3, 0.4), 0, 4.05, -5.65);
    box(1.3, 0.12, 0.55, mat('#222230', 0.3, 0.4), 0, 3.78, -5.65);

    // Pokeball logo overlay on TV
    const tvLogoCanvas = document.createElement('canvas');
    tvLogoCanvas.width = tvLogoCanvas.height = 256;
    const tctx = tvLogoCanvas.getContext('2d')!;
    tctx.globalAlpha = 0.25;
    tctx.strokeStyle = '#ffffff';
    tctx.lineWidth = 4;
    tctx.beginPath(); tctx.arc(128, 128, 70, 0, Math.PI * 2); tctx.stroke();
    tctx.lineWidth = 3;
    tctx.beginPath(); tctx.moveTo(58, 128); tctx.lineTo(198, 128); tctx.stroke();
    tctx.beginPath(); tctx.arc(128, 128, 18, 0, Math.PI * 2); tctx.stroke();
    tctx.fillStyle = '#ffffff';
    tctx.beginPath(); tctx.arc(128, 128, 8, 0, Math.PI * 2); tctx.fill();
    place(
      new THREE.PlaneGeometry(2.2, 2.2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tvLogoCanvas), transparent: true }),
      0, 5.8, -5.37,
    );

    // Red cross — emissive glow
    const crossMat = matE('#e04040', '#600808', 0.4, 0.3);
    place(new THREE.BoxGeometry(0.5, 1.6, 0.15), crossMat, 0, 7.4, -5.78);
    place(new THREE.BoxGeometry(1.6, 0.5, 0.15), crossMat, 0, 7.4, -5.78);

    // Wall clock — detailed face
    place(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 48), mat('#fff8e8', 0.4), 6.5, 6, -5.75, { rx: Math.PI / 2 });
    place(new THREE.TorusGeometry(0.7, 0.06, 12, 48), mat('#5a3018', 0.4, 0.2), 6.5, 6, -5.65);
    // hour markers
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      place(new THREE.SphereGeometry(0.025, 8, 8), mat('#333', 0.5), 6.5 + Math.sin(a) * 0.55, 6 + Math.cos(a) * 0.55, -5.63);
    }
    place(new THREE.BoxGeometry(0.04, 0.45, 0.03), mat('#222', 0.5), 6.5, 6.12, -5.62);
    place(new THREE.BoxGeometry(0.03, 0.32, 0.03), mat('#222', 0.5), 6.62, 6.05, -5.62, { rz: -Math.PI / 4 });

    // Notice board
    rbox(2.6, 1.9, 0.18, 0.1, mat('#c08040', 0.65), -6.5, 5.5, -5.75, 'cast');
    rbox(2.2, 1.5, 0.08, 0.05, mat('#d4a860', 0.85), -6.5, 5.5, -5.65);
    for (const [nx, ny, nc] of [[-0.5, 0.3, '#ffe0a0'], [0.3, -0.2, '#a0d8ff'], [-0.2, -0.4, '#ffa0a0'], [0.5, 0.4, '#a0ffa0']] as const) {
      place(new THREE.PlaneGeometry(0.6, 0.5), mat(nc, 0.8), -6.5 + nx, 5.5 + ny, -5.58, { rz: (Math.random() - 0.5) * 0.3 });
      place(new THREE.SphereGeometry(0.04, 12, 10), mat('#cc3333', 0.3), -6.5 + nx, 5.5 + ny + 0.18, -5.55);
    }

    // Map poster
    rbox(2.2, 1.6, 0.14, 0.08, cream, 3.5, 5.5, -5.75);
    place(new THREE.PlaneGeometry(1.8, 1.2), mat('#7cb342', 0.65), 3.5, 5.5, -5.62);
    for (let i = 0; i < 4; i++) {
      place(new THREE.SphereGeometry(0.06, 8, 8), mat('#cc3030', 0.4), 3.2 + i * 0.25, 5.35 + (i % 2) * 0.25, -5.60);
    }

    /* ═══════════════════════════════════════════
     *  COUNTER — premium polished centerpiece
     * ═══════════════════════════════════════════ */
    // Base
    rbox(12.4, 0.2, 2.8, 0.08, counterBase, 0, 0.1, -3.2, 'receive');
    // Body
    rbox(12, 1.5, 2.5, 0.12, counterBody, 0, 0.85, -3.2, 'both');
    // Red top slab
    rbox(12.2, 0.14, 2.6, 0.1, counterTop, 0, 1.67, -3.2, 'both');
    // Front accent strip
    rbox(11.5, 0.1, 0.06, 0.03, counterAccent, 0, 1.2, -1.92);
    // Panel grooves
    for (const xOff of [-3, 0, 3]) {
      box(0.03, 1.3, 0.05, metalDark, xOff, 0.85, -1.92);
    }
    // Edge highlight
    box(11.8, 0.02, 0.02, mat('#e0e0e8', 0.15, 0.7), 0, 1.6, -1.92);

    /* ── Healing machine — chrome & glass ── */
    rbox(2.6, 0.48, 2.0, 0.1, chrome, -2, 1.98, -3.2, 'cast');
    rbox(2.0, 0.12, 1.5, 0.08, mat('#e0e0e8', 0.15, 0.6), -2, 2.28, -3.2);

    // Glass dome — high-poly hemisphere
    const domeMat = new THREE.MeshStandardMaterial({
      color: '#d8e8f0', roughness: 0.08, metalness: 0.15,
      transparent: true, opacity: 0.35,
    });
    place(
      new THREE.SphereGeometry(0.85, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      domeMat, -2, 2.32, -3.2, { shadow: 'cast' },
    );
    place(new THREE.TorusGeometry(0.85, 0.06, 16, 48), mat('#c0c0c8', 0.2, 0.6), -2, 2.32, -3.2, { rx: Math.PI / 2 });

    // Chrome cap
    place(new THREE.CylinderGeometry(0.12, 0.18, 0.1, 24), chrome, -2, 3.17, -3.2);

    // 6 pokeball slots (2 rows × 3)
    for (let row = 0; row < 2; row++) {
      for (let col = -1; col <= 1; col++) {
        const sx = -2 + col * 0.45, sz = -3.0 + row * 0.42;
        place(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), mat('#1a1a22', 0.4, 0.5), sx, 2.26, sz);
        // Pokeball — red top + white bottom
        place(new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#dd3333', 0.25, 0.3), sx, 2.36, sz, { shadow: 'cast' });
        place(new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), whiteClean, sx, 2.36, sz);
        place(new THREE.TorusGeometry(0.11, 0.015, 8, 24), mat('#111', 0.5), sx, 2.36, sz, { rx: Math.PI / 2 });
      }
    }

    // Healer green status light — pulsing
    const healerLight = new THREE.PointLight('#44ff44', 0.8, 5);
    healerLight.position.set(-2, 3.3, -3);
    scene.add(healerLight);
    const healerGlow = place(
      new THREE.SphereGeometry(0.1, 24, 16),
      new THREE.MeshBasicMaterial({ color: '#44ff44' }),
      -2, 3.28, -3.2,
    );

    // Control panel
    rbox(0.5, 0.38, 0.1, 0.04, mat('#353d48', 0.4, 0.2), -0.55, 2.1, -2.2);
    for (let i = 0; i < 3; i++) {
      place(
        new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12),
        mat(i === 0 ? '#44cc44' : i === 1 ? '#cccc44' : '#cc4444', 0.35, 0.1),
        -0.55 + (i - 1) * 0.15, 2.18, -2.17, { rx: Math.PI / 2 },
      );
    }

    /* ── PC terminal — detailed monitor + keyboard ── */
    rbox(1.3, 1.2, 0.65, 0.08, mat('#2a2a30', 0.3, 0.2), 3, 2.35, -3.3, 'cast');
    const pcScreen = place(
      new THREE.PlaneGeometry(1.0, 0.85),
      new THREE.MeshBasicMaterial({ color: '#40c8e0' }),
      3, 2.38, -2.95,
    );
    // Screen content lines
    for (let i = 0; i < 4; i++) {
      place(new THREE.PlaneGeometry(0.7, 0.04), new THREE.MeshBasicMaterial({ color: '#80e0f8' }), 3, 2.55 - i * 0.14, -2.94);
    }
    // Monitor stand
    place(new THREE.CylinderGeometry(0.12, 0.22, 0.18, 16), mat('#2a2a30', 0.3, 0.2), 3, 1.82, -3.3);
    // Keyboard
    rbox(0.9, 0.42, 0.07, 0.04, mat('#353d48', 0.5, 0.1), 3, 1.78, -2.3);
    for (let kr = 0; kr < 4; kr++) {
      for (let kc = 0; kc < 7; kc++) {
        place(new THREE.BoxGeometry(0.08, 0.06, 0.02), mat('#444', 0.5, 0.1), 2.67 + kc * 0.1, 1.82, -2.42 + kr * 0.1);
      }
    }

    /* ── Counter bell ── */
    place(new THREE.SphereGeometry(0.15, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), brass, 0.5, 1.75, -2.3);
    place(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24), mat('#c09830', 0.25, 0.6), 0.5, 1.75, -2.3);
    place(new THREE.SphereGeometry(0.04, 12, 10), mat('#bbb', 0.2, 0.8), 0.5, 1.9, -2.3);

    /* ── Flower baskets on counter ends ── */
    const fColors = ['#ff4444', '#ffcd75', '#48dbfb', '#ff9ff3', '#50c878', '#ff6b6b', '#ffd93d'];
    for (const cx of [-5, 5]) {
      const potProfile = new THREE.Shape();
      potProfile.moveTo(0, 0);
      potProfile.lineTo(0.3, 0);
      potProfile.quadraticCurveTo(0.32, 0.15, 0.24, 0.3);
      potProfile.lineTo(0.22, 0.35);
      potProfile.quadraticCurveTo(0.28, 0.42, 0.35, 0.48);
      potProfile.lineTo(0.35, 0.52);
      potProfile.lineTo(0, 0.52);
      place(new THREE.LatheGeometry(potProfile.getPoints(16), 24), potBrown, cx, 1.75, -3.2, { shadow: 'cast' });
      place(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24), mat('#3e2723', 0.85), cx, 2.22, -3.2);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const fr = 0.1 + Math.random() * 0.12;
        place(new THREE.SphereGeometry(0.08, 16, 12), mat(fColors[i % 7], 0.5), cx + Math.cos(angle) * fr, 2.35 + Math.random() * 0.1, -3.2 + Math.sin(angle) * fr);
      }
      for (let i = 0; i < 6; i++) {
        const la = (i / 6) * Math.PI * 2;
        place(new THREE.SphereGeometry(0.1, 12, 10), i % 2 === 0 ? greenLeaf : greenBright, cx + Math.cos(la) * 0.2, 2.25, -3.2 + Math.sin(la) * 0.2);
      }
    }

    // Tissue box
    rbox(0.35, 0.25, 0.3, 0.05, mat('#fff8dc', 0.7), 1.5, 1.87, -2.5, 'cast');
    place(new THREE.PlaneGeometry(0.14, 0.1), mat('#fffff0', 0.85), 1.5, 2.05, -2.5);

    // Pen holder
    place(new THREE.CylinderGeometry(0.1, 0.08, 0.28, 16), mat('#353d48', 0.5, 0.2), 4.2, 1.89, -2.8);
    for (let i = 0; i < 3; i++) {
      const pa = (i / 3) * Math.PI * 2 + 0.5;
      place(
        new THREE.CylinderGeometry(0.015, 0.015, 0.48, 8),
        mat(i === 0 ? '#2244cc' : i === 1 ? '#cc2244' : '#22cc44', 0.5),
        4.2 + Math.cos(pa) * 0.04, 2.18, -2.8 + Math.sin(pa) * 0.04,
        { rz: (i - 1) * 0.1 },
      );
    }

    // Small cactus
    place(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 24), mat('#d84315', 0.7), -4, 1.82, -2.5);
    place(new THREE.SphereGeometry(0.12, 24, 20), mat('#2e7d32', 0.55), -4, 1.98, -2.5);
    place(new THREE.SphereGeometry(0.03, 12, 10), mat('#ffeb3b', 0.3), -4, 2.1, -2.5);

    // Paper stack
    for (let i = 0; i < 4; i++) {
      place(new THREE.BoxGeometry(0.22, 0.012, 0.16), mat('#fafafa', 0.7), 2 + i * 0.006, 1.76 + i * 0.012, -2.8 - i * 0.004);
    }

    /* ═══════════════════════════
     *  BOOKSHELVES — rich colors
     * ═══════════════════════════ */
    const bColors = ['#cc3030', '#3060c8', '#40a040', '#c8a030', '#8030c0', '#c86020', '#2898a8'];
    for (const bsx of [-8, 8]) {
      rbox(2.1, 4.2, 1.15, 0.08, mat('#7a5838', 0.7), bsx, 2.1, -5.3, 'cast');
      for (let sr = 0; sr < 5; sr++) {
        box(2.0, 0.07, 1.1, mat('#5a3a22', 0.65), bsx, 0.2 + sr * 0.95, -5.3);
      }
      rbox(2.2, 0.15, 1.2, 0.05, mat('#6a4828', 0.65), bsx, 4.25, -5.3);
      for (let sr = 0; sr < 4; sr++) {
        let bx = bsx - 0.7;
        const numBooks = 5 + Math.floor(Math.random() * 3);
        for (let b = 0; b < numBooks; b++) {
          const bkw = 0.1 + Math.random() * 0.08;
          const bkh = 0.5 + Math.random() * 0.3;
          rbox(bkw, bkh, 0.55, 0.02, mat(bColors[b % bColors.length], 0.65), bx + bkw / 2, 0.52 + sr * 0.95 + bkh / 2, -5.3, 'cast');
          bx += bkw + 0.03;
        }
      }
    }

    /* ═══════════════════
     *  POTTED PLANTS
     * ═══════════════════ */
    for (const [ppx, ppz] of [[-7, 0.5], [7, 0.5], [-7, 4.5], [7, 4.5]] as const) {
      const potShape = new THREE.Shape();
      potShape.moveTo(0, 0);
      potShape.lineTo(0.35, 0);
      potShape.quadraticCurveTo(0.38, 0.2, 0.28, 0.5);
      potShape.quadraticCurveTo(0.3, 0.58, 0.38, 0.62);
      potShape.lineTo(0.38, 0.68);
      potShape.lineTo(0, 0.68);
      place(new THREE.LatheGeometry(potShape.getPoints(16), 24), potBrown, ppx, 0, ppz, { shadow: 'cast' });
      place(new THREE.CylinderGeometry(0.04, 0.05, 0.65, 12), mat('#3a5a20', 0.65), ppx, 0.98, ppz);
      const leafSizes = [0.48, 0.36, 0.4, 0.32];
      const leafOff: [number, number, number][] = [[0, 0, 0], [0.2, 0.1, 0.15], [-0.15, -0.05, -0.12], [0.05, 0.18, -0.1]];
      leafOff.forEach(([ox, oy, oz], i) => {
        place(new THREE.SphereGeometry(leafSizes[i], 24, 16), i % 2 === 0 ? greenLeaf : greenDark, ppx + ox, 1.42 + oy, ppz + oz, { shadow: 'cast' });
      });
    }

    /* ═══════════════════
     *  BENCHES — blue
     * ═══════════════════ */
    const legMat = mat('#444', 0.35, 0.5);
    for (const bbx of [-4.5, 4.5]) {
      for (const [lx, lz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]] as const) {
        place(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 12), legMat, bbx + lx, 0.225, 3.5 + lz);
      }
      rbox(1.8, 0.1, 0.85, 0.04, legMat, bbx, 0.48, 3.5);
      rbox(1.7, 0.16, 0.75, 0.08, fabric, bbx, 0.6, 3.5, 'cast');
      rbox(1.7, 0.85, 0.1, 0.06, fabric, bbx, 1.02, 3.1, 'cast');
    }

    /* ═══════════════════════
     *  VENDING MACHINE — red
     * ═══════════════════════ */
    rbox(1.5, 3.3, 1.1, 0.1, mat('#cc2020', 0.3, 0.15), -9, 1.65, -3, 'cast');
    rbox(1.2, 1.9, 0.06, 0.06, glassMat, -9, 2.1, -2.4);
    rbox(1.35, 0.5, 0.06, 0.04, mat('#1a3a80', 0.4), -9, 3.05, -2.4);
    place(new THREE.PlaneGeometry(0.9, 0.28), new THREE.MeshBasicMaterial({ color: '#fff' }), -9, 3.05, -2.35);
    const drinkColors = ['#ff4444', '#4488ff', '#44cc44', '#ffcc44', '#ff88cc', '#44dddd', '#ff8844', '#aa66ff', '#88ff44'];
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        place(
          new THREE.CylinderGeometry(0.08, 0.08, 0.26, 12),
          mat(drinkColors[(dr * 3 + dc) % 9], 0.3, 0.5),
          -9.25 + dc * 0.25, 1.35 + dr * 0.55, -2.55,
        );
      }
    }
    rbox(0.15, 0.25, 0.06, 0.02, mat('#888', 0.3, 0.5), -8.5, 1.85, -2.4);
    rbox(0.9, 0.25, 0.32, 0.04, mat('#2a2a2a', 0.5, 0.3), -9, 0.3, -2.25);

    /* ═══════════════════
     *  TRASH BIN
     * ═══════════════════ */
    place(new THREE.CylinderGeometry(0.3, 0.24, 0.8, 24), mat('#606870', 0.45, 0.3), -3, 0.4, 5, { shadow: 'cast' });
    place(new THREE.TorusGeometry(0.3, 0.04, 12, 24), mat('#707880', 0.35, 0.4), -3, 0.8, 5, { rx: Math.PI / 2 });

    /* ═══════════════════
     *  ROPE BARRIERS
     * ═══════════════════ */
    for (const rpx of [-3, 3]) {
      place(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 16), brass, rpx, 0.6, 0, { shadow: 'cast' });
      place(new THREE.SphereGeometry(0.12, 20, 16), mat('#ffd700', 0.2, 0.7), rpx, 1.22, 0);
      place(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 16), mat('#b08828', 0.25, 0.5), rpx, 0.04, 0);
    }
    place(new THREE.CylinderGeometry(0.025, 0.025, 6.05, 12), mat('#8b2020', 0.7), 0, 0.95, 0, { rz: Math.PI / 2 });

    /* ═══════════════════════
     *  MEDICINE SHELVES
     * ═══════════════════════ */
    const bottleColors = ['#ff5050', '#5050ff', '#50c050', '#ffcc44'];
    for (const shX of [-3.5, 3.5]) {
      box(1.8, 0.1, 0.5, woodDark, shX, 3.2, -5.68);
      for (let bi = 0; bi < 4; bi++) {
        place(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16), mat(bottleColors[bi], 0.3, 0.05), shX - 0.45 + bi * 0.3, 3.42, -5.58, { shadow: 'cast' });
        place(new THREE.CylinderGeometry(0.06, 0.08, 0.05, 16), whiteClean, shX - 0.45 + bi * 0.3, 3.59, -5.58);
      }
    }

    // Pokeball on shelf
    place(new THREE.SphereGeometry(0.15, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#dd2020', 0.3), -3.5, 3.59, -5.38);
    place(new THREE.SphereGeometry(0.15, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), whiteClean, -3.5, 3.59, -5.38);

    /* ═══════════════════
     *  DOOR FRAME
     * ═══════════════════ */
    const doorMat = mat('#8a6040', 0.6);
    rbox(0.6, 4, 0.6, 0.08, doorMat, -2.5, 2, 7, 'cast');
    rbox(0.6, 4, 0.6, 0.08, doorMat, 2.5, 2, 7, 'cast');
    rbox(5.6, 0.5, 0.6, 0.08, doorMat, 0, 4.25, 7, 'cast');
    rbox(3.2, 0.65, 0.1, 0.05, mat('#cc2020', 0.35), 0, 4.25, 7.35);
    place(new THREE.PlaneGeometry(2.6, 0.38), new THREE.MeshBasicMaterial({ color: '#fff' }), 0, 4.25, 7.4);

    // Open sign near entrance
    rbox(0.5, 0.3, 0.06, 0.04, mat('#4caf50', 0.4), 1.5, 1.5, 5.5, 'cast');
    place(new THREE.PlaneGeometry(0.35, 0.18), new THREE.MeshBasicMaterial({ color: '#fff' }), 1.5, 1.5, 5.54);

    /* ═══════════════════════════
     *  ANIMATION LOOP
     * ═══════════════════════════ */
    let t = 0;
    const tick = () => {
      frameRef.current = requestAnimationFrame(tick);
      t += 0.016;
      // Healer pulse
      healerLight.intensity = 0.4 + Math.sin(t * 2.5) * 0.4;
      healerGlow.scale.setScalar(0.8 + Math.sin(t * 2.5) * 0.2);
      // Screen flicker
      (tvScreen.material as THREE.MeshBasicMaterial).color.setHSL(0.52, 0.7, 0.55 + Math.sin(t * 4) * 0.02);
      (pcScreen.material as THREE.MeshBasicMaterial).color.setHSL(0.52, 0.6, 0.52 + Math.sin(t * 6) * 0.02);
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
    hemi.intensity = dimmed ? 0.12 : 0.8;
    dir.intensity = dimmed ? 0.15 : 1.1;
    fill.intensity = dimmed ? 0.05 : 0.35;
  }, [dimmed]);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  );
}
