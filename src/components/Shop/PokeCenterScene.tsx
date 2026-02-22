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
    ambient: THREE.AmbientLight;
  } | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    /* ═══ SCENE — NO FOG, warm background ═══ */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#342820');

    /* ═══ CAMERA — tilted to show full room including back wall ═══ */
    const frustumSize = 14;
    const aspect = w / h;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2, frustumSize * aspect / 2,
      frustumSize / 2, -frustumSize / 2, 0.1, 100,
    );
    camera.position.set(0, 10, 12);
    camera.lookAt(0, 3, -1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    /* ═══ ENVIRONMENT MAP ═══ */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color('#fff0d8');
    envScene.add(new THREE.AmbientLight('#fff0d8', 1.2));
    scene.environment = pmrem.fromScene(envScene, 0, 0.1, 100).texture;
    pmrem.dispose();

    /* ═══ AGGRESSIVE LIGHTING — illuminate everything ═══ */
    const ambient = new THREE.AmbientLight('#ffeedd', 0.6);
    scene.add(ambient);

    const hemi = new THREE.HemisphereLight('#ffe8cc', '#8b7355', 1.0);
    scene.add(hemi);

    // Main sun — high + forward
    const dir = new THREE.DirectionalLight('#fff5e0', 1.4);
    dir.position.set(4, 16, 10);
    dir.castShadow = true;
    dir.shadow.mapSize.setScalar(2048);
    dir.shadow.camera.near = 1;
    dir.shadow.camera.far = 50;
    dir.shadow.camera.left = -16;
    dir.shadow.camera.right = 16;
    dir.shadow.camera.top = 16;
    dir.shadow.camera.bottom = -16;
    dir.shadow.bias = -0.0008;
    dir.shadow.normalBias = 0.02;
    scene.add(dir);

    // Fill from left
    const fill = new THREE.DirectionalLight('#c8ddf0', 0.5);
    fill.position.set(-8, 8, 8);
    scene.add(fill);

    // Back wall illumination — critical!
    const backWallLight = new THREE.DirectionalLight('#ffe8cc', 0.8);
    backWallLight.position.set(0, 8, 4);
    backWallLight.target.position.set(0, 4, -6);
    scene.add(backWallLight);
    scene.add(backWallLight.target);

    // Rim light from behind
    const rim = new THREE.DirectionalLight('#ffcc88', 0.3);
    rim.position.set(0, 10, -12);
    scene.add(rim);

    // Wall sconce spotlights — illuminate TV, clock, notice board
    const tvSpot = new THREE.SpotLight('#ffffff', 2.0, 8, Math.PI / 4, 0.5);
    tvSpot.position.set(0, 8, -2);
    tvSpot.target.position.set(0, 5.5, -6);
    scene.add(tvSpot); scene.add(tvSpot.target);

    const leftWallSpot = new THREE.SpotLight('#ffe8cc', 1.0, 8, Math.PI / 4, 0.5);
    leftWallSpot.position.set(-6, 8, -2);
    leftWallSpot.target.position.set(-6.5, 5, -6);
    scene.add(leftWallSpot); scene.add(leftWallSpot.target);

    const rightWallSpot = new THREE.SpotLight('#ffe8cc', 1.0, 8, Math.PI / 4, 0.5);
    rightWallSpot.position.set(6, 8, -2);
    rightWallSpot.target.position.set(6.5, 5, -6);
    scene.add(rightWallSpot); scene.add(rightWallSpot.target);

    lightsRef.current = { hemi, dir, fill, ambient };

    /* ═══ VIBRANT MATERIAL PALETTE ═══ */
    const mat = (color: string, roughness = 0.7, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });

    const matE = (color: string, emissive: string, eI: number, roughness = 0.3, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: eI });

    // Walls — brighter warm wood
    const woodWall = mat('#d08850', 0.65, 0.08);
    const woodDark = mat('#7a5030', 0.75);
    const woodTrim = mat('#b07040', 0.6);
    const moldingLight = mat('#e0a070', 0.45, 0.12);
    const panelLight = mat('#d89868', 0.65);
    const panelInner = mat('#c08850', 0.7);

    // Counter — polished
    const counterBody = mat('#d8d8e0', 0.2, 0.65);
    const counterTop = mat('#dd0000', 0.12, 0.35);
    const counterAccent = mat('#dd2828', 0.2, 0.2);
    const counterBase = mat('#b0b0b8', 0.3, 0.5);

    // Metal
    const metalDark = mat('#606068', 0.4, 0.3);
    const chrome = mat('#f0f0f8', 0.08, 0.92);
    const brass = mat('#e0b840', 0.18, 0.75);

    // Nature — vivid greens
    const greenLeaf = mat('#3fc088', 0.55);
    const greenDark = mat('#288848', 0.65);
    const greenBright = mat('#90d060', 0.45);
    const potBrown = mat('#9b6030', 0.6);

    // Furniture
    const fabric = mat('#3848d0', 0.88);
    const whiteClean = mat('#f4f4fc', 0.25, 0.12);
    const cream = mat('#f4ece0', 0.55);

    // Glass
    const glassMat = mat('#b0e0f0', 0.05, 0.1);
    glassMat.transparent = true;
    glassMat.opacity = 0.45;

    /* ═══ HELPERS ═══ */
    const place = (
      geo: THREE.BufferGeometry,
      material: THREE.Material,
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

    /* ════════════════════════════════════════════
     *  FLOOR — vibrant golden checkerboard
     * ════════════════════════════════════════════ */
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = floorCanvas.height = 512;
    const fctx = floorCanvas.getContext('2d')!;
    const ts = 64;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const v = Math.random() * 6 - 3;
        fctx.fillStyle = (r + c) % 2 === 0
          ? `rgb(${235 + v}, ${195 + v}, ${80 + v})`
          : `rgb(${218 + v}, ${175 + v}, ${60 + v})`;
        fctx.fillRect(c * ts, r * ts, ts, ts);
        fctx.strokeStyle = 'rgba(0,0,0,0.1)';
        fctx.lineWidth = 1.5;
        fctx.strokeRect(c * ts + 0.5, r * ts + 0.5, ts - 1, ts - 1);
        fctx.strokeStyle = 'rgba(255,255,230,0.1)';
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
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.4, metalness: 0.06 }),
      0, 0, 0, { rx: -Math.PI / 2, shadow: 'receive' },
    );

    // Baseboard trim
    box(20, 0.18, 0.12, woodTrim, 0, 0.09, 7);
    box(0.12, 0.18, 14, woodTrim, -10, 0.09, 0);
    box(0.12, 0.18, 14, woodTrim, 10, 0.09, 0);

    // Pokeball emblem — bold vibrant
    const pbCanvas = document.createElement('canvas');
    pbCanvas.width = pbCanvas.height = 512;
    const pctx = pbCanvas.getContext('2d')!;
    // outer
    pctx.strokeStyle = 'rgba(210,170,50,0.5)';
    pctx.lineWidth = 10;
    pctx.beginPath(); pctx.arc(256, 256, 200, 0, Math.PI * 2); pctx.stroke();
    // top red
    pctx.fillStyle = 'rgba(230,60,60,0.2)';
    pctx.beginPath(); pctx.arc(256, 256, 195, Math.PI, 0); pctx.closePath(); pctx.fill();
    // center line
    pctx.strokeStyle = 'rgba(210,170,50,0.6)';
    pctx.lineWidth = 8;
    pctx.beginPath(); pctx.moveTo(56, 256); pctx.lineTo(456, 256); pctx.stroke();
    // rings
    pctx.lineWidth = 5;
    pctx.beginPath(); pctx.arc(256, 256, 55, 0, Math.PI * 2); pctx.stroke();
    pctx.lineWidth = 4;
    pctx.beginPath(); pctx.arc(256, 256, 22, 0, Math.PI * 2); pctx.stroke();
    pctx.fillStyle = 'rgba(210,170,50,0.45)';
    pctx.beginPath(); pctx.arc(256, 256, 14, 0, Math.PI * 2); pctx.fill();
    place(
      new THREE.PlaneGeometry(5.5, 5.5),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(pbCanvas), transparent: true, roughness: 0.55 }),
      0, 0.013, 2.5, { rx: -Math.PI / 2 },
    );

    // Welcome mat
    const matCanvas = document.createElement('canvas');
    matCanvas.width = 512; matCanvas.height = 256;
    const mctx = matCanvas.getContext('2d')!;
    mctx.fillStyle = '#8b2020';
    mctx.fillRect(0, 0, 512, 256);
    mctx.strokeStyle = '#d4af37';
    mctx.lineWidth = 10;
    mctx.strokeRect(12, 12, 488, 232);
    mctx.strokeStyle = '#ffd700';
    mctx.lineWidth = 4;
    mctx.strokeRect(24, 24, 464, 208);
    mctx.fillStyle = '#ffd700';
    mctx.font = 'bold 38px sans-serif';
    mctx.textAlign = 'center';
    mctx.fillText('WELCOME', 256, 142);
    place(
      new THREE.PlaneGeometry(3.2, 1.6),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(matCanvas), roughness: 0.9 }),
      0, 0.015, 6, { rx: -Math.PI / 2 },
    );

    /* ════════════════════════════════════════
     *  WALLS — bright warm wood, visible!
     * ════════════════════════════════════════ */
    box(20, 8, 0.35, woodWall, 0, 4, -6.2, 'receive');
    box(0.35, 8, 14, mat('#c07848', 0.7, 0.05), -10, 4, 0, 'receive');
    box(0.35, 8, 14, mat('#c07848', 0.7, 0.05), 10, 4, 0, 'receive');

    // Crown molding + chair rail + baseboard
    const trimDark = mat('#905828', 0.55, 0.1);
    box(20, 0.32, 0.2, moldingLight, 0, 7.84, -5.9);
    box(20, 0.22, 0.16, trimDark, 0, 0.11, -5.93);
    box(20, 0.2, 0.16, trimDark, 0, 3.8, -5.93);

    // Wainscoting panels (5 columns × 2 rows)
    for (let i = -2; i <= 2; i++) {
      const px = i * 3.8;
      rbox(3.0, 2.8, 0.12, 0.1, panelLight, px, 1.9, -5.85);
      rbox(2.4, 2.2, 0.08, 0.07, panelInner, px, 1.9, -5.79);
      rbox(3.0, 2.8, 0.12, 0.1, panelLight, px, 5.4, -5.85);
      rbox(2.4, 2.2, 0.08, 0.07, panelInner, px, 5.4, -5.79);
    }

    // Ceiling
    box(20, 0.22, 14, mat('#4a3828', 0.8), 0, 8, 0);

    // Pendant lamps — 5 warm glow lights across the room
    for (const lx of [-6, -3, 0, 3, 6]) {
      place(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 12), mat('#999', 0.3, 0.5), lx, 7.3, 0);
      place(new THREE.CylinderGeometry(0.08, 0.5, 0.5, 24), mat('#f8e8d0', 0.35, 0.12), lx, 6.6, 0, { shadow: 'cast' });
      place(new THREE.SphereGeometry(0.14, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff0c0' }), lx, 6.3, 0);
      const lamp = new THREE.PointLight('#ffe0a0', 0.6, 12);
      lamp.position.set(lx, 6.2, 0);
      scene.add(lamp);
    }

    // Wall sconces on back wall — illuminate decorations
    for (const sx of [-4.5, 4.5]) {
      place(new THREE.CylinderGeometry(0.06, 0.12, 0.25, 16), mat('#d0a060', 0.3, 0.4), sx, 7.2, -5.7);
      place(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe8b0' }), sx, 7.0, -5.6);
      const sconce = new THREE.PointLight('#ffe0a0', 0.5, 6);
      sconce.position.set(sx, 7.0, -5.2);
      scene.add(sconce);
    }

    /* ══════════════════════════════════════
     *  TV — big glowing screen, VISIBLE
     * ══════════════════════════════════════ */
    rbox(4.4, 3.0, 0.35, 0.15, mat('#1a1a20', 0.2, 0.35), 0, 5.8, -5.6, 'cast');
    rbox(4.0, 2.6, 0.1, 0.08, mat('#080810', 0.15, 0.2), 0, 5.8, -5.42);
    const tvScreen = place(
      new THREE.PlaneGeometry(3.6, 2.2),
      new THREE.MeshBasicMaterial({ color: '#50e0ff' }),
      0, 5.8, -5.32,
    );
    // TV glow light
    const tvGlow = new THREE.PointLight('#40d0f0', 1.2, 6);
    tvGlow.position.set(0, 5.8, -4.5);
    scene.add(tvGlow);

    // TV stand
    box(0.35, 0.6, 0.18, mat('#222230', 0.3, 0.4), 0, 4.1, -5.6);
    box(1.3, 0.12, 0.55, mat('#222230', 0.3, 0.4), 0, 3.82, -5.6);

    // Pokeball logo overlay on TV
    const tvLogoCanvas = document.createElement('canvas');
    tvLogoCanvas.width = tvLogoCanvas.height = 256;
    const tctx = tvLogoCanvas.getContext('2d')!;
    tctx.globalAlpha = 0.3;
    tctx.strokeStyle = '#ffffff';
    tctx.lineWidth = 5;
    tctx.beginPath(); tctx.arc(128, 128, 70, 0, Math.PI * 2); tctx.stroke();
    tctx.lineWidth = 4;
    tctx.beginPath(); tctx.moveTo(58, 128); tctx.lineTo(198, 128); tctx.stroke();
    tctx.beginPath(); tctx.arc(128, 128, 20, 0, Math.PI * 2); tctx.stroke();
    tctx.fillStyle = '#ffffff';
    tctx.beginPath(); tctx.arc(128, 128, 10, 0, Math.PI * 2); tctx.fill();
    place(
      new THREE.PlaneGeometry(2.4, 2.2),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tvLogoCanvas), transparent: true }),
      0, 5.8, -5.31,
    );

    // Red cross — bright emissive
    const crossMat = matE('#ff4040', '#ff2020', 0.6, 0.25);
    place(new THREE.BoxGeometry(0.5, 1.6, 0.16), crossMat, 0, 7.4, -5.72);
    place(new THREE.BoxGeometry(1.6, 0.5, 0.16), crossMat, 0, 7.4, -5.72);

    // Wall clock — visible
    place(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 48), mat('#fffff0', 0.35), 6.5, 6, -5.68, { rx: Math.PI / 2 });
    place(new THREE.TorusGeometry(0.72, 0.07, 12, 48), mat('#5a3018', 0.35, 0.25), 6.5, 6, -5.58);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      place(new THREE.SphereGeometry(0.03, 8, 8), mat('#333', 0.5), 6.5 + Math.sin(a) * 0.55, 6 + Math.cos(a) * 0.55, -5.56);
    }
    place(new THREE.BoxGeometry(0.04, 0.45, 0.03), mat('#222', 0.5), 6.5, 6.12, -5.55);
    place(new THREE.BoxGeometry(0.03, 0.32, 0.03), mat('#222', 0.5), 6.62, 6.05, -5.55, { rz: -Math.PI / 4 });

    // Notice board — bright notes
    rbox(2.6, 1.9, 0.2, 0.1, mat('#c88040', 0.6), -6.5, 5.5, -5.68, 'cast');
    rbox(2.2, 1.5, 0.1, 0.05, mat('#dab070', 0.8), -6.5, 5.5, -5.56);
    for (const [nx, ny, nc] of [[-0.5, 0.3, '#ffe060'], [0.3, -0.2, '#60c0ff'], [-0.2, -0.4, '#ff7070'], [0.5, 0.4, '#70ff80']] as const) {
      place(new THREE.PlaneGeometry(0.6, 0.5), mat(nc, 0.75), -6.5 + nx, 5.5 + ny, -5.5, { rz: (Math.random() - 0.5) * 0.3 });
      place(new THREE.SphereGeometry(0.04, 12, 10), mat('#dd3030', 0.3), -6.5 + nx, 5.5 + ny + 0.18, -5.47);
    }

    // Map poster
    rbox(2.2, 1.6, 0.14, 0.08, cream, 3.5, 5.5, -5.68);
    place(new THREE.PlaneGeometry(1.8, 1.2), mat('#80c040', 0.6), 3.5, 5.5, -5.55);
    for (let i = 0; i < 4; i++) {
      place(new THREE.SphereGeometry(0.07, 8, 8), mat('#dd3030', 0.35), 3.15 + i * 0.25, 5.35 + (i % 2) * 0.25, -5.53);
    }

    /* ════════════════════════════════════════
     *  COUNTER — premium polished centerpiece
     * ════════════════════════════════════════ */
    rbox(12.4, 0.22, 2.8, 0.08, counterBase, 0, 0.11, -3.2, 'receive');
    rbox(12, 1.5, 2.5, 0.12, counterBody, 0, 0.86, -3.2, 'both');
    rbox(12.2, 0.15, 2.6, 0.1, counterTop, 0, 1.68, -3.2, 'both');
    rbox(11.5, 0.1, 0.06, 0.03, counterAccent, 0, 1.2, -1.92);
    for (const xOff of [-3, 0, 3]) {
      box(0.03, 1.3, 0.05, metalDark, xOff, 0.86, -1.92);
    }
    box(11.8, 0.02, 0.02, mat('#e8e8f0', 0.12, 0.75), 0, 1.61, -1.92);

    /* ── Healing machine — chrome dome ── */
    rbox(2.6, 0.48, 2.0, 0.1, chrome, -2, 1.99, -3.2, 'cast');
    rbox(2.0, 0.12, 1.5, 0.08, mat('#e4e4ec', 0.12, 0.65), -2, 2.29, -3.2);

    const domeMat2 = new THREE.MeshStandardMaterial({
      color: '#e0f0f8', roughness: 0.06, metalness: 0.18,
      transparent: true, opacity: 0.35,
    });
    place(
      new THREE.SphereGeometry(0.85, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      domeMat2, -2, 2.33, -3.2, { shadow: 'cast' },
    );
    place(new THREE.TorusGeometry(0.85, 0.06, 16, 48), mat('#c8c8d0', 0.18, 0.65), -2, 2.33, -3.2, { rx: Math.PI / 2 });
    place(new THREE.CylinderGeometry(0.12, 0.18, 0.1, 24), chrome, -2, 3.18, -3.2);

    // 6 pokeball slots
    for (let row = 0; row < 2; row++) {
      for (let col = -1; col <= 1; col++) {
        const sx = -2 + col * 0.45, sz = -3.0 + row * 0.42;
        place(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), mat('#1a1a22', 0.4, 0.5), sx, 2.27, sz);
        place(new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e03030', 0.22, 0.3), sx, 2.37, sz, { shadow: 'cast' });
        place(new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), whiteClean, sx, 2.37, sz);
        place(new THREE.TorusGeometry(0.11, 0.015, 8, 24), mat('#111', 0.5), sx, 2.37, sz, { rx: Math.PI / 2 });
      }
    }

    // Green healer pulse
    const healerLight = new THREE.PointLight('#44ff44', 1.0, 5);
    healerLight.position.set(-2, 3.3, -3);
    scene.add(healerLight);
    const healerGlow = place(
      new THREE.SphereGeometry(0.12, 24, 16),
      new THREE.MeshBasicMaterial({ color: '#44ff44' }),
      -2, 3.3, -3.2,
    );

    // Control panel
    rbox(0.5, 0.38, 0.1, 0.04, mat('#353d48', 0.4, 0.2), -0.55, 2.1, -2.2);
    for (let i = 0; i < 3; i++) {
      place(
        new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12),
        matE(i === 0 ? '#44dd44' : i === 1 ? '#dddd44' : '#dd4444', i === 0 ? '#44dd44' : i === 1 ? '#dddd44' : '#dd4444', 0.4, 0.3),
        -0.55 + (i - 1) * 0.15, 2.18, -2.17, { rx: Math.PI / 2 },
      );
    }

    /* ── PC terminal ── */
    rbox(1.3, 1.2, 0.65, 0.08, mat('#2a2a30', 0.3, 0.2), 3, 2.36, -3.3, 'cast');
    const pcScreen = place(
      new THREE.PlaneGeometry(1.0, 0.85),
      new THREE.MeshBasicMaterial({ color: '#48d8f0' }),
      3, 2.39, -2.95,
    );
    for (let i = 0; i < 4; i++) {
      place(new THREE.PlaneGeometry(0.7, 0.04), new THREE.MeshBasicMaterial({ color: '#88ecff' }), 3, 2.56 - i * 0.14, -2.94);
    }
    place(new THREE.CylinderGeometry(0.12, 0.22, 0.18, 16), mat('#2a2a30', 0.3, 0.2), 3, 1.83, -3.3);
    rbox(0.9, 0.42, 0.07, 0.04, mat('#353d48', 0.5, 0.1), 3, 1.79, -2.3);
    for (let kr = 0; kr < 4; kr++) {
      for (let kc = 0; kc < 7; kc++) {
        place(new THREE.BoxGeometry(0.08, 0.06, 0.02), mat('#444', 0.5, 0.1), 2.67 + kc * 0.1, 1.83, -2.42 + kr * 0.1);
      }
    }
    // PC screen glow
    const pcGlow = new THREE.PointLight('#40d0f0', 0.5, 3);
    pcGlow.position.set(3, 2.4, -2.5);
    scene.add(pcGlow);

    /* ── Counter bell ── */
    place(new THREE.SphereGeometry(0.16, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), brass, 0.5, 1.76, -2.3);
    place(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 24), mat('#d0a030', 0.2, 0.65), 0.5, 1.76, -2.3);
    place(new THREE.SphereGeometry(0.04, 12, 10), mat('#ccc', 0.18, 0.82), 0.5, 1.92, -2.3);

    /* ── Flower baskets ── */
    const fColors = ['#ff3838', '#ffd040', '#40e0f0', '#ff80d0', '#40e080', '#ff6060', '#ffe040'];
    for (const cx of [-5, 5]) {
      const potProfile = new THREE.Shape();
      potProfile.moveTo(0, 0);
      potProfile.lineTo(0.3, 0);
      potProfile.quadraticCurveTo(0.32, 0.15, 0.24, 0.3);
      potProfile.lineTo(0.22, 0.35);
      potProfile.quadraticCurveTo(0.28, 0.42, 0.35, 0.48);
      potProfile.lineTo(0.35, 0.52);
      potProfile.lineTo(0, 0.52);
      place(new THREE.LatheGeometry(potProfile.getPoints(16), 24), potBrown, cx, 1.76, -3.2, { shadow: 'cast' });
      place(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24), mat('#3e2723', 0.82), cx, 2.23, -3.2);
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2;
        const fr = 0.08 + Math.random() * 0.14;
        place(new THREE.SphereGeometry(0.08, 16, 12), mat(fColors[i % 7], 0.45), cx + Math.cos(angle) * fr, 2.38 + Math.random() * 0.12, -3.2 + Math.sin(angle) * fr);
      }
      for (let i = 0; i < 6; i++) {
        const la = (i / 6) * Math.PI * 2;
        place(new THREE.SphereGeometry(0.1, 12, 10), i % 2 === 0 ? greenLeaf : greenBright, cx + Math.cos(la) * 0.2, 2.26, -3.2 + Math.sin(la) * 0.2);
      }
    }

    // Tissue box
    rbox(0.35, 0.25, 0.3, 0.05, mat('#fff8dc', 0.65), 1.5, 1.88, -2.5, 'cast');
    place(new THREE.PlaneGeometry(0.14, 0.1), mat('#fffff8', 0.82), 1.5, 2.06, -2.5);

    // Pen holder
    place(new THREE.CylinderGeometry(0.1, 0.08, 0.28, 16), mat('#353d48', 0.45, 0.25), 4.2, 1.9, -2.8);
    for (let i = 0; i < 3; i++) {
      const pa = (i / 3) * Math.PI * 2 + 0.5;
      place(
        new THREE.CylinderGeometry(0.015, 0.015, 0.48, 8),
        mat(i === 0 ? '#2244dd' : i === 1 ? '#dd2244' : '#22dd44', 0.45),
        4.2 + Math.cos(pa) * 0.04, 2.19, -2.8 + Math.sin(pa) * 0.04,
        { rz: (i - 1) * 0.1 },
      );
    }

    // Cactus
    place(new THREE.CylinderGeometry(0.1, 0.12, 0.15, 24), mat('#d84315', 0.65), -4, 1.83, -2.5);
    place(new THREE.SphereGeometry(0.12, 24, 20), mat('#30a030', 0.5), -4, 1.99, -2.5);
    place(new THREE.SphereGeometry(0.03, 12, 10), mat('#ffeb3b', 0.28), -4, 2.11, -2.5);

    // Papers
    for (let i = 0; i < 4; i++) {
      place(new THREE.BoxGeometry(0.22, 0.012, 0.16), mat('#fafafa', 0.65), 2 + i * 0.006, 1.77 + i * 0.012, -2.8 - i * 0.004);
    }

    /* ════════════════════════════
     *  BOOKSHELVES — colorful
     * ════════════════════════════ */
    const bColors = ['#dd3030', '#3060dd', '#40b040', '#d0a030', '#8830d0', '#d06020', '#28a8b8'];
    for (const bsx of [-8, 8]) {
      rbox(2.1, 4.2, 1.15, 0.08, mat('#8a6040', 0.65), bsx, 2.1, -5.2, 'cast');
      for (let sr = 0; sr < 5; sr++) {
        box(2.0, 0.07, 1.1, mat('#6a4228', 0.6), bsx, 0.2 + sr * 0.95, -5.2);
      }
      rbox(2.2, 0.15, 1.2, 0.05, mat('#7a5430', 0.6), bsx, 4.25, -5.2);
      for (let sr = 0; sr < 4; sr++) {
        let bx = bsx - 0.7;
        const numBooks = 5 + Math.floor(Math.random() * 3);
        for (let b = 0; b < numBooks; b++) {
          const bkw = 0.1 + Math.random() * 0.08;
          const bkh = 0.5 + Math.random() * 0.3;
          rbox(bkw, bkh, 0.55, 0.02, mat(bColors[b % bColors.length], 0.6), bx + bkw / 2, 0.52 + sr * 0.95 + bkh / 2, -5.2, 'cast');
          bx += bkw + 0.03;
        }
      }
    }

    /* ════════════════
     *  POTTED PLANTS
     * ════════════════ */
    for (const [ppx, ppz] of [[-7, 0.5], [7, 0.5], [-7, 4.5], [7, 4.5]] as const) {
      const potShape = new THREE.Shape();
      potShape.moveTo(0, 0);
      potShape.lineTo(0.35, 0);
      potShape.quadraticCurveTo(0.38, 0.2, 0.28, 0.5);
      potShape.quadraticCurveTo(0.3, 0.58, 0.38, 0.62);
      potShape.lineTo(0.38, 0.68);
      potShape.lineTo(0, 0.68);
      place(new THREE.LatheGeometry(potShape.getPoints(16), 24), potBrown, ppx, 0, ppz, { shadow: 'cast' });
      place(new THREE.CylinderGeometry(0.04, 0.05, 0.65, 12), mat('#3a6020', 0.6), ppx, 0.98, ppz);
      const leafSizes = [0.5, 0.38, 0.42, 0.34];
      const leafOff: [number, number, number][] = [[0, 0, 0], [0.22, 0.1, 0.16], [-0.16, -0.05, -0.14], [0.06, 0.2, -0.12]];
      leafOff.forEach(([ox, oy, oz], i) => {
        place(new THREE.SphereGeometry(leafSizes[i], 24, 16), i % 2 === 0 ? greenLeaf : greenDark, ppx + ox, 1.44 + oy, ppz + oz, { shadow: 'cast' });
      });
    }

    /* ════════════════
     *  BENCHES
     * ════════════════ */
    const legMat = mat('#444', 0.3, 0.55);
    for (const bbx of [-4.5, 4.5]) {
      for (const [lx, lz] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]] as const) {
        place(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 12), legMat, bbx + lx, 0.225, 3.5 + lz);
      }
      rbox(1.8, 0.1, 0.85, 0.04, legMat, bbx, 0.48, 3.5);
      rbox(1.7, 0.16, 0.75, 0.08, fabric, bbx, 0.6, 3.5, 'cast');
      rbox(1.7, 0.85, 0.1, 0.06, fabric, bbx, 1.02, 3.1, 'cast');
    }

    /* ═══════════════════
     *  VENDING MACHINE
     * ═══════════════════ */
    rbox(1.5, 3.3, 1.1, 0.1, mat('#dd2020', 0.25, 0.18), -9, 1.65, -3, 'cast');
    rbox(1.2, 1.9, 0.06, 0.06, glassMat, -9, 2.1, -2.38);
    rbox(1.35, 0.5, 0.06, 0.04, mat('#1a3a90', 0.35), -9, 3.05, -2.38);
    place(new THREE.PlaneGeometry(0.9, 0.28), new THREE.MeshBasicMaterial({ color: '#fff' }), -9, 3.05, -2.33);
    // Vending glow
    const vendGlow = new THREE.PointLight('#ffffff', 0.3, 3);
    vendGlow.position.set(-9, 2, -2);
    scene.add(vendGlow);
    const drinkColors = ['#ff4444', '#4488ff', '#44dd44', '#ffcc44', '#ff88cc', '#44dddd', '#ff8844', '#aa66ff', '#88ff44'];
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        place(
          new THREE.CylinderGeometry(0.08, 0.08, 0.26, 12),
          mat(drinkColors[(dr * 3 + dc) % 9], 0.25, 0.55),
          -9.25 + dc * 0.25, 1.35 + dr * 0.55, -2.53,
        );
      }
    }
    rbox(0.15, 0.25, 0.06, 0.02, mat('#999', 0.25, 0.55), -8.5, 1.85, -2.38);
    rbox(0.9, 0.25, 0.32, 0.04, mat('#2a2a2a', 0.45, 0.35), -9, 0.3, -2.23);

    /* ═══════════════ TRASH BIN ═══════════════ */
    place(new THREE.CylinderGeometry(0.3, 0.24, 0.8, 24), mat('#606870', 0.4, 0.35), -3, 0.4, 5, { shadow: 'cast' });
    place(new THREE.TorusGeometry(0.3, 0.04, 12, 24), mat('#707880', 0.3, 0.45), -3, 0.8, 5, { rx: Math.PI / 2 });

    /* ═══════════════ ROPE BARRIERS ═══════════════ */
    for (const rpx of [-3, 3]) {
      place(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 16), brass, rpx, 0.6, 0, { shadow: 'cast' });
      place(new THREE.SphereGeometry(0.13, 20, 16), mat('#ffd700', 0.15, 0.75), rpx, 1.24, 0);
      place(new THREE.CylinderGeometry(0.2, 0.22, 0.08, 16), mat('#c09830', 0.2, 0.55), rpx, 0.04, 0);
    }
    place(new THREE.CylinderGeometry(0.025, 0.025, 6.05, 12), mat('#9b2020', 0.65), 0, 0.96, 0, { rz: Math.PI / 2 });

    /* ═══════════════ MEDICINE SHELVES ═══════════════ */
    const bottleColors = ['#ff5050', '#5050ff', '#50d050', '#ffc844'];
    for (const shX of [-3.5, 3.5]) {
      box(1.8, 0.1, 0.5, woodDark, shX, 3.2, -5.6);
      for (let bi = 0; bi < 4; bi++) {
        place(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16), mat(bottleColors[bi], 0.28, 0.08), shX - 0.45 + bi * 0.3, 3.42, -5.5, { shadow: 'cast' });
        place(new THREE.CylinderGeometry(0.06, 0.08, 0.05, 16), whiteClean, shX - 0.45 + bi * 0.3, 3.59, -5.5);
      }
    }

    // Pokeball decoration
    place(new THREE.SphereGeometry(0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e02020', 0.28), -3.5, 3.6, -5.3);
    place(new THREE.SphereGeometry(0.16, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), whiteClean, -3.5, 3.6, -5.3);

    /* ═══════════════ DOOR FRAME ═══════════════ */
    const doorMat2 = mat('#9a7050', 0.55);
    rbox(0.6, 4, 0.6, 0.08, doorMat2, -2.5, 2, 7, 'cast');
    rbox(0.6, 4, 0.6, 0.08, doorMat2, 2.5, 2, 7, 'cast');
    rbox(5.6, 0.5, 0.6, 0.08, doorMat2, 0, 4.25, 7, 'cast');
    // Pokecenter sign — emissive red
    rbox(3.2, 0.65, 0.1, 0.05, matE('#dd2020', '#dd2020', 0.3, 0.3), 0, 4.25, 7.35);
    place(new THREE.PlaneGeometry(2.6, 0.38), new THREE.MeshBasicMaterial({ color: '#fff' }), 0, 4.25, 7.41);

    // Open sign — glowing
    rbox(0.5, 0.3, 0.06, 0.04, matE('#40c040', '#40c040', 0.5, 0.35), 1.5, 1.5, 5.5, 'cast');
    place(new THREE.PlaneGeometry(0.35, 0.18), new THREE.MeshBasicMaterial({ color: '#fff' }), 1.5, 1.5, 5.54);

    /* ═══════════════ NEON POKECENTER SIGN on back wall ═══════════════ */
    const neonPink = matE('#ff40a0', '#ff40a0', 1.0, 0.15, 0.1);
    const neonBlue = matE('#40c0ff', '#40c0ff', 0.8, 0.15, 0.1);
    // "P" shape
    rbox(0.15, 1.0, 0.08, 0.03, neonPink, -8.5, 7.0, -5.6);
    rbox(0.5, 0.15, 0.08, 0.03, neonPink, -8.25, 7.35, -5.6);
    rbox(0.5, 0.15, 0.08, 0.03, neonPink, -8.25, 7.05, -5.6);
    rbox(0.15, 0.5, 0.08, 0.03, neonPink, -8.0, 7.2, -5.6);
    // "C" shape
    rbox(0.15, 1.0, 0.08, 0.03, neonBlue, 8.5, 7.0, -5.6);
    rbox(0.5, 0.15, 0.08, 0.03, neonBlue, 8.75, 7.35, -5.6);
    rbox(0.5, 0.15, 0.08, 0.03, neonBlue, 8.75, 6.65, -5.6);
    // Neon glow lights
    const neonL1 = new THREE.PointLight('#ff40a0', 0.4, 4);
    neonL1.position.set(-8.3, 7.0, -5);
    scene.add(neonL1);
    const neonL2 = new THREE.PointLight('#40c0ff', 0.4, 4);
    neonL2.position.set(8.6, 7.0, -5);
    scene.add(neonL2);

    /* ════════════════════════════
     *  ANIMATION LOOP
     * ════════════════════════════ */
    let t = 0;
    const tick = () => {
      frameRef.current = requestAnimationFrame(tick);
      t += 0.016;
      // Healer pulse
      healerLight.intensity = 0.5 + Math.sin(t * 2.5) * 0.5;
      healerGlow.scale.setScalar(0.8 + Math.sin(t * 2.5) * 0.25);
      // Screen flicker
      (tvScreen.material as THREE.MeshBasicMaterial).color.setHSL(0.52, 0.75, 0.58 + Math.sin(t * 3) * 0.03);
      (pcScreen.material as THREE.MeshBasicMaterial).color.setHSL(0.52, 0.65, 0.55 + Math.sin(t * 5) * 0.03);
      // Neon flicker
      neonL1.intensity = 0.35 + Math.sin(t * 8) * 0.05;
      neonL2.intensity = 0.35 + Math.sin(t * 7 + 1) * 0.05;
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
    const { hemi, dir, fill, ambient } = lightsRef.current;
    hemi.intensity = dimmed ? 0.15 : 1.0;
    dir.intensity = dimmed ? 0.2 : 1.4;
    fill.intensity = dimmed ? 0.08 : 0.5;
    ambient.intensity = dimmed ? 0.1 : 0.6;
  }, [dimmed]);

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  );
}
