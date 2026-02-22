import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  dimmed: boolean;
}

/* ═══════════════════════════════════════════════════════════
 *  ENDESGA 32 PALETTE — 32 colors, warm RPG fantasy
 *  Every pixel on screen will be snapped to one of these.
 * ═══════════════════════════════════════════════════════════ */
const ENDESGA32 = [
  0xbe4a2f, 0xd77643, 0xead4aa, 0xe4a672,
  0xb86f50, 0x733e39, 0x3e2731, 0xa22633,
  0xe43b44, 0xf77622, 0xfeae34, 0xfee761,
  0x63c74d, 0x3e8948, 0x265c42, 0x193c3e,
  0x124e89, 0x0099db, 0x2ce8f5, 0xffffff,
  0xc0cbdc, 0x8b9bb4, 0x5a6988, 0x3a4466,
  0x262b44, 0x181425, 0xff0044, 0x68386c,
  0xb55088, 0xf6757a, 0xe8b796, 0xc28569,
];

/* ── Snap a THREE.Color to nearest palette color ── */
function palSnap(hex: number): number {
  const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
  let best = ENDESGA32[0], bestD = Infinity;
  for (const c of ENDESGA32) {
    const cr = (c >> 16) & 0xff, cg = (c >> 8) & 0xff, cb = c & 0xff;
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

/* ── Create palette as a DataTexture for the quantize shader ── */
function makePaletteTexture(): THREE.DataTexture {
  const data = new Uint8Array(32 * 4);
  for (let i = 0; i < 32; i++) {
    data[i * 4 + 0] = (ENDESGA32[i] >> 16) & 0xff;
    data[i * 4 + 1] = (ENDESGA32[i] >> 8) & 0xff;
    data[i * 4 + 2] = ENDESGA32[i] & 0xff;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 32, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/* ── Force pixel art on any texture ── */
function pixelTex(tex: THREE.Texture): THREE.Texture {
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

/* ── Grid snap ── */
const GRID = 0.5;
function snap(v: number): number { return Math.round(v / GRID) * GRID; }

/* ═══════════════════════════════════════════════════════════
 *  PIXEL ART TEXTURE GENERATORS (canvas, palette-constrained)
 * ═══════════════════════════════════════════════════════════ */

function palColor(hex: number): string {
  return '#' + palSnap(hex).toString(16).padStart(6, '0');
}

/** 16×16 checkerboard floor tile */
function makeFloorTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  const light = palColor(0xead4aa);
  const dark = palColor(0xe4a672);
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 2; col++) {
      x.fillStyle = (r + col) % 2 === 0 ? light : dark;
      x.fillRect(col * 8, r * 8, 8, 8);
    }
  }
  // Subtle edge pixels
  x.fillStyle = palColor(0xb86f50);
  x.fillRect(0, 0, 16, 1);
  x.fillRect(0, 0, 1, 16);
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}

/** 16×16 wood wall tile */
function makeWallTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  x.fillStyle = palColor(0xb86f50);
  x.fillRect(0, 0, 16, 16);
  // Planks
  x.fillStyle = palColor(0xd77643);
  x.fillRect(0, 0, 16, 7);
  x.fillStyle = palColor(0xe4a672);
  x.fillRect(1, 1, 14, 5);
  // Grain lines
  x.fillStyle = palColor(0xb86f50);
  x.fillRect(4, 1, 1, 5);
  x.fillRect(11, 1, 1, 5);
  x.fillRect(2, 9, 1, 5);
  x.fillRect(9, 9, 1, 5);
  x.fillRect(14, 9, 1, 5);
  // Panel groove
  x.fillStyle = palColor(0x733e39);
  x.fillRect(0, 7, 16, 1);
  x.fillRect(0, 15, 16, 1);
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}

/** 8×8 counter top tile (white/red) */
function makeCounterTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  x.fillStyle = palColor(0xc0cbdc);
  x.fillRect(0, 0, 8, 8);
  x.fillStyle = palColor(0xe43b44);
  x.fillRect(0, 0, 8, 2);
  x.fillStyle = palColor(0x8b9bb4);
  x.fillRect(0, 7, 8, 1);
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}

/** 16×16 bookshelf tile */
function makeBookshelfTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  x.fillStyle = palColor(0x733e39);
  x.fillRect(0, 0, 16, 16);
  // Shelves
  x.fillStyle = palColor(0xb86f50);
  x.fillRect(0, 0, 16, 2);
  x.fillRect(0, 7, 16, 1);
  x.fillRect(0, 14, 16, 2);
  // Books row 1
  const bookColors = [0xe43b44, 0x3e8948, 0x124e89, 0xfeae34, 0x68386c, 0x0099db];
  let bx = 1;
  for (let i = 0; i < 5; i++) {
    const bw = 2 + (i % 2);
    x.fillStyle = palColor(bookColors[i % bookColors.length]);
    x.fillRect(bx, 2, bw, 5);
    bx += bw + 1;
  }
  // Books row 2
  bx = 2;
  for (let i = 0; i < 4; i++) {
    const bw = 2 + ((i + 1) % 2);
    x.fillStyle = palColor(bookColors[(i + 3) % bookColors.length]);
    x.fillRect(bx, 8, bw, 6);
    bx += bw + 1;
  }
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}

/** 16×16 TV screen (animated frame support) */
function makeTVTex(frame: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  // Screen glow
  x.fillStyle = palColor(0x0099db);
  x.fillRect(0, 0, 16, 16);
  x.fillStyle = palColor(0x2ce8f5);
  x.fillRect(1, 1, 14, 14);
  // Pokeball logo silhouette
  x.fillStyle = palColor(0x0099db);
  x.beginPath();
  const cx2 = 8, cy = 8, r = 5;
  for (let py = -r; py <= r; py++) {
    for (let px = -r; px <= r; px++) {
      if (px * px + py * py <= r * r) {
        if (py < 0) x.fillStyle = palColor(0xe43b44);
        else if (py === 0) x.fillStyle = palColor(0x262b44);
        else x.fillStyle = palColor(0xffffff);
        x.fillRect(cx2 + px, cy + py, 1, 1);
      }
    }
  }
  // Center button
  x.fillStyle = palColor(0xffffff);
  x.fillRect(7, 7, 2, 2);
  x.fillStyle = palColor(0x262b44);
  x.fillRect(6, 7, 1, 2);
  x.fillRect(9, 7, 1, 2);
  // Scanline flicker
  if (frame % 3 === 0) {
    x.fillStyle = 'rgba(0,0,0,0.08)';
    for (let sy = 0; sy < 16; sy += 2) x.fillRect(0, sy, 16, 1);
  }
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}

/** 8×8 pokeball emblem for floor */
function makePokeballEmblemTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  // transparent bg
  const cx2 = 8, cy = 8, r = 6;
  for (let py = -r; py <= r; py++) {
    for (let px = -r; px <= r; px++) {
      if (px * px + py * py <= r * r) {
        if (py < 0) x.fillStyle = palColor(0xe43b44);
        else if (py === 0) x.fillStyle = palColor(0x262b44);
        else x.fillStyle = palColor(0xead4aa);
        x.fillRect(cx2 + px, cy + py, 1, 1);
      }
    }
  }
  // Outline ring
  for (let py = -r - 1; py <= r + 1; py++) {
    for (let px = -r - 1; px <= r + 1; px++) {
      const d = px * px + py * py;
      if (d > r * r && d <= (r + 1) * (r + 1)) {
        x.fillStyle = palColor(0x733e39);
        x.fillRect(cx2 + px, cy + py, 1, 1);
      }
    }
  }
  // Center circle
  x.fillStyle = palColor(0xffffff);
  x.fillRect(7, 7, 2, 2);
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}

/** 16×16 vending machine face */
function makeVendingTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  x.fillStyle = palColor(0xe43b44);
  x.fillRect(0, 0, 16, 16);
  // Glass window
  x.fillStyle = palColor(0x124e89);
  x.fillRect(2, 2, 12, 8);
  x.fillStyle = palColor(0x0099db);
  x.fillRect(3, 3, 10, 6);
  // Drink cans
  const dColors = [0xe43b44, 0x0099db, 0x63c74d, 0xfeae34];
  for (let i = 0; i < 4; i++) {
    x.fillStyle = palColor(dColors[i]);
    x.fillRect(4 + i * 2, 4, 1, 4);
  }
  // Slot
  x.fillStyle = palColor(0x262b44);
  x.fillRect(3, 11, 10, 3);
  x.fillStyle = palColor(0x3a4466);
  x.fillRect(4, 12, 8, 1);
  // Label
  x.fillStyle = palColor(0xffffff);
  x.fillRect(5, 1, 6, 1);
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}

/** 16×16 notice board */
function makeNoticeBoardTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  // Cork board
  x.fillStyle = palColor(0xd77643);
  x.fillRect(0, 0, 16, 16);
  x.fillStyle = palColor(0xb86f50);
  x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1);
  x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16);
  // Notes pinned
  x.fillStyle = palColor(0xfee761); x.fillRect(2, 2, 5, 4);
  x.fillStyle = palColor(0x2ce8f5); x.fillRect(9, 3, 5, 5);
  x.fillStyle = palColor(0xf6757a); x.fillRect(3, 8, 4, 5);
  x.fillStyle = palColor(0x63c74d); x.fillRect(9, 10, 5, 4);
  // Pins
  x.fillStyle = palColor(0xe43b44);
  x.fillRect(4, 2, 1, 1); x.fillRect(11, 3, 1, 1);
  x.fillRect(5, 8, 1, 1); x.fillRect(11, 10, 1, 1);
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}

/** 8×8 healing machine top */
function makeHealerTex(glow: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  x.fillStyle = palColor(0xc0cbdc);
  x.fillRect(0, 0, 16, 16);
  // Pokeball slots (2×3 grid)
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 3; col++) {
      const bx = 2 + col * 4, by = 3 + r * 5;
      x.fillStyle = palColor(0x262b44);
      x.fillRect(bx, by, 3, 3);
      x.fillStyle = palColor(0xe43b44);
      x.fillRect(bx, by, 3, 1);
      x.fillStyle = palColor(0xffffff);
      x.fillRect(bx, by + 2, 3, 1);
      x.fillStyle = palColor(0x262b44);
      x.fillRect(bx + 1, by + 1, 1, 1);
    }
  }
  // Glow overlay
  if (glow) {
    x.fillStyle = palColor(0x63c74d);
    x.globalAlpha = 0.3;
    x.fillRect(0, 0, 16, 16);
    x.globalAlpha = 1;
  }
  // Edge
  x.fillStyle = palColor(0x8b9bb4);
  x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1);
  x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16);
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}

/** 8×8 PC screen */
function makePCTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  x.fillStyle = palColor(0x262b44);
  x.fillRect(0, 0, 16, 16);
  x.fillStyle = palColor(0x0099db);
  x.fillRect(1, 1, 14, 12);
  // Text lines
  x.fillStyle = palColor(0x2ce8f5);
  x.fillRect(3, 3, 8, 1);
  x.fillRect(3, 5, 10, 1);
  x.fillRect(3, 7, 6, 1);
  x.fillRect(3, 9, 9, 1);
  // Cursor blink
  x.fillStyle = palColor(0xffffff);
  x.fillRect(3, 11, 2, 1);
  // Base
  x.fillStyle = palColor(0x5a6988);
  x.fillRect(5, 14, 6, 2);
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}

/** 16×16 welcome mat */
function makeWelcomeMatTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32; c.height = 16;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  x.fillStyle = palColor(0xa22633);
  x.fillRect(0, 0, 32, 16);
  // Gold border
  x.fillStyle = palColor(0xfeae34);
  x.fillRect(0, 0, 32, 1); x.fillRect(0, 15, 32, 1);
  x.fillRect(0, 0, 1, 16); x.fillRect(31, 0, 1, 16);
  x.fillRect(1, 1, 30, 1); x.fillRect(1, 14, 30, 1);
  // "WELCOME" text (simple pixel letters)
  x.fillStyle = palColor(0xfee761);
  // W
  x.fillRect(4, 5, 1, 6); x.fillRect(5, 10, 1, 1); x.fillRect(6, 8, 1, 2); x.fillRect(7, 10, 1, 1); x.fillRect(8, 5, 1, 6);
  // E
  x.fillRect(10, 5, 1, 6); x.fillRect(11, 5, 2, 1); x.fillRect(11, 8, 2, 1); x.fillRect(11, 10, 2, 1);
  // L
  x.fillRect(14, 5, 1, 6); x.fillRect(15, 10, 2, 1);
  // C
  x.fillRect(18, 5, 1, 6); x.fillRect(19, 5, 2, 1); x.fillRect(19, 10, 2, 1);
  // O
  x.fillRect(22, 5, 1, 6); x.fillRect(23, 5, 1, 1); x.fillRect(23, 10, 1, 1); x.fillRect(24, 5, 1, 6);
  // M
  x.fillRect(26, 5, 1, 6); x.fillRect(27, 6, 1, 1); x.fillRect(28, 7, 1, 1); x.fillRect(29, 6, 1, 1); x.fillRect(30, 5, 1, 6);
  return pixelTex(new THREE.CanvasTexture(c)) as THREE.CanvasTexture;
}


/* ═══════════════════════════════════════════════════════════
 *  SHADERS — Cel shade + Bayer dither + palette quantize
 * ═══════════════════════════════════════════════════════════ */

const FULLSCREEN_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** Combined post-process: cel shading bands + bayer dither + palette quantize */
const POSTPROCESS_FRAG = `
  uniform sampler2D uScene;
  uniform sampler2D uPalette;
  uniform vec2 uResolution;
  uniform float uDimmed;
  varying vec2 vUv;

  // Bayer 4x4 dither matrix (fits 16-bit aesthetic tightly)
  float bayer4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int idx = y * 4 + x;
    // unrolled 4x4 bayer
    if (idx ==  0) return  0.0/16.0;
    if (idx ==  1) return  8.0/16.0;
    if (idx ==  2) return  2.0/16.0;
    if (idx ==  3) return 10.0/16.0;
    if (idx ==  4) return 12.0/16.0;
    if (idx ==  5) return  4.0/16.0;
    if (idx ==  6) return 14.0/16.0;
    if (idx ==  7) return  6.0/16.0;
    if (idx ==  8) return  3.0/16.0;
    if (idx ==  9) return 11.0/16.0;
    if (idx == 10) return  1.0/16.0;
    if (idx == 11) return  9.0/16.0;
    if (idx == 12) return 15.0/16.0;
    if (idx == 13) return  7.0/16.0;
    if (idx == 14) return 13.0/16.0;
    return  5.0/16.0;
  }

  float colorDist(vec3 a, vec3 b) {
    vec3 d = a - b;
    return dot(d, d);
  }

  void main() {
    vec3 color = texture2D(uScene, vUv).rgb;

    // ── Cel shade: quantize luminance to 4 bands ──
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    float cel;
    if      (lum > 0.72) cel = 1.0;
    else if (lum > 0.42) cel = 0.65;
    else if (lum > 0.18) cel = 0.38;
    else                 cel = 0.12;

    float origLum = max(lum, 0.001);
    color = color * (cel / origLum);
    color = clamp(color, 0.0, 1.0);

    // ── Bayer dither: add noise before palette snap ──
    vec2 fragPixel = gl_FragCoord.xy;
    float dither = bayer4(fragPixel) - 0.5;
    color += dither * 0.08;
    color = clamp(color, 0.0, 1.0);

    // ── Palette quantize: snap to nearest ENDESGA-32 color ──
    vec3 closest = vec3(0.0);
    float minDist = 1e9;
    for (float i = 0.0; i < 32.0; i++) {
      vec3 pc = texture2D(uPalette, vec2((i + 0.5) / 32.0, 0.5)).rgb;
      float d = colorDist(color, pc);
      if (d < minDist) {
        minDist = d;
        closest = pc;
      }
    }

    // ── Dithered depth fog (fade to dark at distance) ──
    // Using UV.y as a depth proxy in ortho view (top = far)
    float depthFog = smoothstep(0.0, 0.15, vUv.y);
    float fogDither = step(bayer4(fragPixel), depthFog);
    vec3 fogColor = texture2D(uPalette, vec2(24.5 / 32.0, 0.5)).rgb; // dark blue #262b44
    closest = mix(fogColor, closest, fogDither);

    // ── Dimmed overlay ──
    closest = mix(closest, closest * 0.15, uDimmed);

    gl_FragColor = vec4(closest, 1.0);
  }
`;


/* ═══════════════════════════════════════════════════════════
 *  MAIN COMPONENT
 * ═══════════════════════════════════════════════════════════ */
export function PokeCenterScene({ dimmed }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef(dimmed);
  dimRef.current = dimmed;
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    /* ═══ SACRED RESOLUTION ═══ */
    const W = 384, H = 216;

    /* ═══ RENDERER — antialias: false, pixelRatio: 1 ═══ */
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // NO tone mapping — palette shader handles everything
    renderer.toneMapping = THREE.NoToneMapping;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated';
    (canvas.style as any).imageRendering = 'crisp-edges'; // Firefox
    canvas.style.imageRendering = 'pixelated'; // Chrome wins
    mount.appendChild(canvas);

    /* ═══ LOW-RES RENDER TARGET ═══ */
    const pixelTarget = new THREE.WebGLRenderTarget(W, H, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    /* ═══ FULLSCREEN QUAD for upscale + post-process ═══ */
    const paletteTex = makePaletteTexture();
    const postMat = new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: pixelTarget.texture },
        uPalette: { value: paletteTex },
        uResolution: { value: new THREE.Vector2(W, H) },
        uDimmed: { value: 0.0 },
      },
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: POSTPROCESS_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    const postQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      postMat,
    );
    const postScene = new THREE.Scene();
    postScene.add(postQuad);
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    /* ═══ SCENE ═══ */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palSnap(0x262b44));

    /* ═══ CAMERA — orthographic isometric ═══ */
    const frustumSize = 14;
    const aspect = W / H;
    const camera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2, frustumSize * aspect / 2,
      frustumSize / 2, -frustumSize / 2, 0.1, 100,
    );
    camera.position.set(snap(0), snap(10), snap(12));
    camera.lookAt(snap(0), snap(3), snap(-1));

    /* ═══ LIGHTING — minimal, cel-shade friendly ═══ */
    const ambient = new THREE.AmbientLight(palSnap(0xe4a672), 0.8);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(palSnap(0xfee761), 1.6);
    sun.position.set(snap(4), snap(12), snap(8));
    sun.castShadow = false; // NEVER
    scene.add(sun);

    // Single warm fill for back wall visibility
    const fill = new THREE.DirectionalLight(palSnap(0xd77643), 0.6);
    fill.position.set(snap(0), snap(8), snap(-4));
    scene.add(fill);

    /* ═══ MATERIAL HELPERS — MeshLambertMaterial only ═══ */
    const mat = (color: number) =>
      new THREE.MeshLambertMaterial({ color: palSnap(color) });

    const matEmit = (color: number, emissive: number, eI = 1.0) =>
      new THREE.MeshLambertMaterial({
        color: palSnap(color),
        emissive: palSnap(emissive),
        emissiveIntensity: eI,
      });

    const matBasic = (color: number) =>
      new THREE.MeshBasicMaterial({ color: palSnap(color) });

    /* ═══ PLACEMENT HELPERS — grid-snapped ═══ */
    const place = (
      geo: THREE.BufferGeometry,
      material: THREE.Material,
      x: number, y: number, z: number,
      opts?: { rx?: number; ry?: number; rz?: number },
    ): THREE.Mesh => {
      const m = new THREE.Mesh(geo, material);
      m.position.set(snap(x), snap(y), snap(z));
      if (opts?.rx) m.rotation.x = opts.rx;
      if (opts?.ry) m.rotation.y = opts.ry;
      if (opts?.rz) m.rotation.z = opts.rz;
      scene.add(m);
      return m;
    };

    const box = (
      bw: number, bh: number, bd: number,
      material: THREE.Material,
      x: number, y: number, z: number,
    ) => place(new THREE.BoxGeometry(bw, bh, bd), material, x, y, z);


    /* ════════════════════════════════════════
     *  FLOOR — pixel art checkerboard
     * ════════════════════════════════════════ */
    const floorTex = makeFloorTex();
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(10, 7);
    place(
      new THREE.PlaneGeometry(20, 14),
      new THREE.MeshLambertMaterial({ map: floorTex }),
      0, 0, 0, { rx: -Math.PI / 2 },
    );

    // Pokeball emblem on floor
    const pbTex = makePokeballEmblemTex();
    place(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshBasicMaterial({ map: pbTex, transparent: true, alphaTest: 0.1 }),
      0, 0.01, 2.5, { rx: -Math.PI / 2 },
    );

    // Welcome mat
    const matTex = makeWelcomeMatTex();
    place(
      new THREE.PlaneGeometry(3, 1.5),
      new THREE.MeshBasicMaterial({ map: matTex }),
      0, 0.01, 6, { rx: -Math.PI / 2 },
    );

    // Baseboard
    box(20, 0.5, 0.5, mat(0x733e39), 0, 0, 7);

    /* ════════════════════════════════════════
     *  WALLS — pixel art wood panels
     * ════════════════════════════════════════ */
    const wallTex = makeWallTex();
    wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(10, 4);
    place(
      new THREE.PlaneGeometry(20, 8),
      new THREE.MeshLambertMaterial({ map: wallTex }),
      0, 4, -6.5, {},
    );

    // Side walls (flat color — less important)
    box(0.5, 8, 14, mat(0xb86f50), -10, 4, 0);
    box(0.5, 8, 14, mat(0xb86f50), 10, 4, 0);

    // Crown molding
    box(20, 0.5, 0.5, mat(0xd77643), 0, 8, -6);
    // Chair rail
    box(20, 0.5, 0.5, mat(0x733e39), 0, 4, -6);
    // Baseboard
    box(20, 0.5, 0.5, mat(0x733e39), 0, 0, -6.5);

    // Ceiling
    box(20, 0.5, 14, mat(0x3a4466), 0, 8, 0);

    /* ════════════════════════════════════════
     *  PENDANT LAMPS — pixel glowing orbs
     * ════════════════════════════════════════ */
    for (const lx of [-5, 0, 5]) {
      box(0.5, 2, 0.5, mat(0x5a6988), lx, 7, 0);
      box(1, 0.5, 1, mat(0xead4aa), lx, 6, 0);
      // Glow orb
      place(
        new THREE.BoxGeometry(0.5, 0.5, 0.5),
        matBasic(0xfee761),
        lx, 5.5, 0,
      );
      const lamp = new THREE.PointLight(palSnap(0xfeae34), 0.5, 8);
      lamp.position.set(snap(lx), snap(5.5), snap(0));
      scene.add(lamp);
    }

    /* ════════════════════════════════════════
     *  TV — pixel art screen on wall
     * ════════════════════════════════════════ */
    // TV frame
    box(5, 3.5, 0.5, mat(0x262b44), 0, 6, -6);
    // TV screen (will be updated in animation loop)
    const tvTex = makeTVTex(0);
    const tvScreen = place(
      new THREE.PlaneGeometry(4, 2.5),
      new THREE.MeshBasicMaterial({ map: tvTex }),
      0, 6, -5.5,
    );

    // Red cross above TV
    box(0.5, 1.5, 0.5, matEmit(0xe43b44, 0xe43b44, 0.5), 0, 7.5, -6);
    box(1.5, 0.5, 0.5, matEmit(0xe43b44, 0xe43b44, 0.5), 0, 7.5, -6);

    // Wall clock
    box(1.5, 1.5, 0.5, mat(0xead4aa), 6.5, 6, -6);
    box(1, 1, 0.5, mat(0xffffff), 6.5, 6, -5.5);
    // Clock hands (simple cross)
    box(0.5, 0.1, 0.1, matBasic(0x262b44), 6.5, 6.5, -5.5);
    box(0.1, 0.5, 0.1, matBasic(0x262b44), 6.5, 6, -5.5);

    // Notice board
    const nbTex = makeNoticeBoardTex();
    box(3, 2, 0.5, mat(0xb86f50), -6.5, 5.5, -6);
    place(
      new THREE.PlaneGeometry(2.5, 1.5),
      new THREE.MeshBasicMaterial({ map: nbTex }),
      -6.5, 5.5, -5.5,
    );

    /* ════════════════════════════════════════
     *  COUNTER — the centerpiece
     * ════════════════════════════════════════ */
    const counterTex = makeCounterTex();
    counterTex.wrapS = counterTex.wrapT = THREE.RepeatWrapping;
    counterTex.repeat.set(6, 1);

    // Counter base
    box(12, 1.5, 2.5, mat(0xc0cbdc), 0, 0.5, -3);
    // Counter top — red stripe
    box(12.5, 0.5, 3, mat(0xe43b44), 0, 1.5, -3);
    // Counter front face accent
    place(
      new THREE.PlaneGeometry(12, 1),
      new THREE.MeshLambertMaterial({ map: counterTex }),
      0, 0.5, -1.5,
    );
    // Metal edge line
    box(12, 0.1, 0.1, matBasic(0xc0cbdc), 0, 1.5, -1.5);

    /* ── Healing machine ── */
    box(3, 0.5, 2, mat(0xc0cbdc), -2, 2, -3);
    const healTex = makeHealerTex(false);
    const healTexGlow = makeHealerTex(true);
    const healerTop = place(
      new THREE.PlaneGeometry(2.5, 1.5),
      new THREE.MeshBasicMaterial({ map: healTex }),
      -2, 2.5, -3, { rx: -Math.PI / 2 },
    );
    // Glass dome (low-poly)
    const domeMat2 = new THREE.MeshLambertMaterial({
      color: palSnap(0x2ce8f5),
      transparent: true,
      opacity: 0.3,
    });
    place(
      new THREE.SphereGeometry(1, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
      domeMat2, -2, 2.5, -3,
    );
    // Healer glow
    const healerLight = new THREE.PointLight(palSnap(0x63c74d), 0.8, 4);
    healerLight.position.set(snap(-2), snap(3), snap(-3));
    scene.add(healerLight);

    // Control panel buttons
    for (let i = 0; i < 3; i++) {
      box(0.5, 0.5, 0.5,
        matEmit(
          i === 0 ? 0x63c74d : i === 1 ? 0xfee761 : 0xe43b44,
          i === 0 ? 0x63c74d : i === 1 ? 0xfee761 : 0xe43b44,
          0.4,
        ),
        -0.5 + i * 0.5, 2, -1.5,
      );
    }

    /* ── PC Terminal ── */
    const pcTex = makePCTex();
    box(1.5, 1.5, 1, mat(0x3a4466), 3, 2.5, -3.5);
    place(
      new THREE.PlaneGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({ map: pcTex }),
      3, 2.5, -2.5,
    );
    // PC glow
    const pcGlow = new THREE.PointLight(palSnap(0x0099db), 0.4, 3);
    pcGlow.position.set(snap(3), snap(2.5), snap(-2));
    scene.add(pcGlow);

    // Keyboard
    box(1, 0.1, 0.5, mat(0x5a6988), 3, 2, -2);
    // Keys (4×2 grid of tiny boxes)
    for (let kr = 0; kr < 2; kr++) {
      for (let kc = 0; kc < 4; kc++) {
        box(0.1, 0.1, 0.1,
          mat(0x3a4466),
          2.5 + kc * 0.25, 2, -2.1 + kr * 0.2,
        );
      }
    }

    /* ── Counter bell ── */
    box(0.5, 0.5, 0.5, mat(0xfeae34), 0.5, 2, -2);
    box(0.1, 0.25, 0.1, matBasic(0xffffff), 0.5, 2.5, -2);

    /* ── Flower pots on counter ── */
    for (const fx of [-5, 5]) {
      box(0.5, 0.5, 0.5, mat(0xb86f50), fx, 2, -3);
      // Dirt
      box(0.5, 0.1, 0.5, mat(0x733e39), fx, 2.5, -3);
      // Flowers (pixel spheres → boxes)
      box(0.5, 0.5, 0.5, mat(0x63c74d), fx, 2.5, -3);
      box(0.25, 0.25, 0.25, mat(0xe43b44), fx + 0.25, 3, -3);
      box(0.25, 0.25, 0.25, mat(0xfee761), fx - 0.25, 3, -3);
      box(0.25, 0.25, 0.25, mat(0xf6757a), fx, 3, -2.5);
    }

    // Tissue box
    box(0.5, 0.5, 0.5, mat(0xead4aa), 1.5, 2, -2.5);
    box(0.25, 0.1, 0.25, matBasic(0xffffff), 1.5, 2.5, -2.5);

    // Pen cup
    box(0.5, 0.5, 0.5, mat(0x5a6988), 4, 2, -2.5);
    box(0.1, 0.5, 0.1, mat(0x124e89), 4, 2.5, -2.5);
    box(0.1, 0.5, 0.1, mat(0xe43b44), 4.25, 2.5, -2.5);

    /* ════════════════════════════════════════
     *  BOOKSHELVES — pixel art texture
     * ════════════════════════════════════════ */
    const bsTex = makeBookshelfTex();
    for (const bsx of [-8, 8]) {
      box(2, 4, 1, mat(0x733e39), bsx, 2, -5.5);
      // Bookshelf face
      place(
        new THREE.PlaneGeometry(2, 4),
        new THREE.MeshBasicMaterial({ map: bsTex }),
        bsx, 2, -4.5,
      );
      // Top trim
      box(2.5, 0.5, 1.5, mat(0xb86f50), bsx, 4, -5.5);
    }

    /* ════════════════════════════════════════
     *  POTTED PLANTS — blocky
     * ════════════════════════════════════════ */
    for (const [px, pz] of [[-7, 0.5], [7, 0.5], [-7, 4.5], [7, 4.5]] as const) {
      box(0.5, 1, 0.5, mat(0xb86f50), px, 0.5, pz);
      box(0.5, 0.5, 0.5, mat(0x733e39), px, 1, pz);
      // Trunk
      box(0.25, 1, 0.25, mat(0x265c42), px, 1.5, pz);
      // Foliage (3 boxes)
      box(1, 1, 1, mat(0x3e8948), px, 2, pz);
      box(0.5, 0.5, 0.5, mat(0x63c74d), px + 0.5, 2.5, pz);
      box(0.5, 0.5, 0.5, mat(0x63c74d), px - 0.5, 2.5, pz);
    }

    /* ════════════════════════════════════════
     *  BENCHES — simple blocky
     * ════════════════════════════════════════ */
    for (const bx of [-4.5, 4.5]) {
      // Legs
      box(0.25, 0.5, 0.25, mat(0x5a6988), bx - 0.5, 0.5, 3.5);
      box(0.25, 0.5, 0.25, mat(0x5a6988), bx + 0.5, 0.5, 3.5);
      // Seat
      box(2, 0.25, 1, mat(0x124e89), bx, 0.5, 3.5);
      // Back
      box(2, 1, 0.25, mat(0x124e89), bx, 1, 3);
    }

    /* ════════════════════════════════════════
     *  VENDING MACHINE — pixel art face
     * ════════════════════════════════════════ */
    const vendTex = makeVendingTex();
    box(1.5, 3.5, 1, mat(0xe43b44), -9, 1.5, -3);
    place(
      new THREE.PlaneGeometry(1.5, 3),
      new THREE.MeshBasicMaterial({ map: vendTex }),
      -9, 1.5, -2,
    );
    // Vending light
    const vendGlow = new THREE.PointLight(palSnap(0x0099db), 0.3, 3);
    vendGlow.position.set(snap(-9), snap(2), snap(-2));
    scene.add(vendGlow);

    /* ════════════════════════════════════════
     *  TRASH BIN
     * ════════════════════════════════════════ */
    box(0.5, 1, 0.5, mat(0x5a6988), -3, 0.5, 5);
    box(0.5, 0.1, 0.5, mat(0x8b9bb4), -3, 1, 5);

    /* ════════════════════════════════════════
     *  ROPE BARRIERS
     * ════════════════════════════════════════ */
    for (const rpx of [-3, 3]) {
      box(0.25, 1.5, 0.25, mat(0xfeae34), rpx, 0.5, 0);
      box(0.5, 0.25, 0.5, mat(0xfeae34), rpx, 1.5, 0);
      box(0.5, 0.25, 0.5, mat(0xd77643), rpx, 0, 0);
    }
    box(6, 0.1, 0.1, matEmit(0xa22633, 0xa22633, 0.3), 0, 1, 0);

    /* ════════════════════════════════════════
     *  MEDICINE SHELVES
     * ════════════════════════════════════════ */
    const bottleC = [0xe43b44, 0x124e89, 0x63c74d, 0xfeae34];
    for (const sx of [-3.5, 3.5]) {
      box(2, 0.25, 0.5, mat(0x733e39), sx, 3.5, -5.5);
      for (let i = 0; i < 4; i++) {
        box(0.25, 0.5, 0.25, mat(bottleC[i]), sx - 0.5 + i * 0.35, 3.5, -5.5);
        box(0.25, 0.1, 0.25, mat(0xffffff), sx - 0.5 + i * 0.35, 4, -5.5);
      }
    }

    /* ════════════════════════════════════════
     *  DOOR FRAME
     * ════════════════════════════════════════ */
    box(0.5, 4, 0.5, mat(0xb86f50), -2.5, 2, 7);
    box(0.5, 4, 0.5, mat(0xb86f50), 2.5, 2, 7);
    box(5.5, 0.5, 0.5, mat(0xb86f50), 0, 4, 7);
    // Sign
    box(3, 0.5, 0.5, matEmit(0xe43b44, 0xe43b44, 0.4), 0, 4.5, 7);
    box(2, 0.25, 0.1, matBasic(0xffffff), 0, 4.5, 7.5);

    // Neon "P" and "C" on back wall
    const neonP = matEmit(0xb55088, 0xb55088, 0.8);
    const neonC = matEmit(0x0099db, 0x0099db, 0.8);
    // P
    box(0.25, 1.5, 0.25, neonP, -8.5, 7, -6);
    box(0.75, 0.25, 0.25, neonP, -8.25, 7.5, -6);
    box(0.75, 0.25, 0.25, neonP, -8.25, 7, -6);
    box(0.25, 0.5, 0.25, neonP, -7.75, 7.5, -6);
    // C
    box(0.25, 1.5, 0.25, neonC, 8.5, 7, -6);
    box(0.75, 0.25, 0.25, neonC, 8.75, 7.5, -6);
    box(0.75, 0.25, 0.25, neonC, 8.75, 6.5, -6);

    // Neon glow
    const neonL1 = new THREE.PointLight(palSnap(0xb55088), 0.4, 4);
    neonL1.position.set(snap(-8.5), snap(7), snap(-5));
    scene.add(neonL1);
    const neonL2 = new THREE.PointLight(palSnap(0x0099db), 0.4, 4);
    neonL2.position.set(snap(8.5), snap(7), snap(-5));
    scene.add(neonL2);

    /* ════════════════════════════════════════
     *  ANIMATION LOOP — stepped at 12 FPS
     * ════════════════════════════════════════ */
    const ANIM_FPS = 12;
    let animAccum = 0;
    let animFrame = 0;
    let lastTime = performance.now();

    const tick = () => {
      frameRef.current = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      animAccum += dt;

      // Step animations at 12 FPS
      if (animAccum >= 1 / ANIM_FPS) {
        animAccum -= 1 / ANIM_FPS;
        animFrame++;

        // Healer pulse (toggle between frames)
        healerLight.intensity = animFrame % 4 < 2 ? 0.8 : 0.3;
        const hMat = healerTop.material as THREE.MeshBasicMaterial;
        if (animFrame % 8 < 4) {
          hMat.map = healTexGlow;
        } else {
          hMat.map = healTex;
        }
        hMat.needsUpdate = true;

        // TV screen flicker (regenerate pixel art)
        if (animFrame % 6 === 0) {
          const newTvTex = makeTVTex(animFrame);
          (tvScreen.material as THREE.MeshBasicMaterial).map = newTvTex;
          (tvScreen.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }

        // Neon flicker
        neonL1.intensity = animFrame % 3 === 0 ? 0.2 : 0.4;
        neonL2.intensity = animFrame % 5 === 0 ? 0.2 : 0.4;
      }

      // Update dimmed uniform
      postMat.uniforms.uDimmed.value = dimRef.current ? 1.0 : 0.0;

      // ── Render pipeline: scene → low-res target → post-process upscale ──
      renderer.setRenderTarget(pixelTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCamera);
    };
    tick();

    /* ═══ RESIZE — resolution stays fixed, CSS fills ═══ */
    const onResize = () => {
      // Canvas fills via CSS — internal resolution is sacred
    };
    window.addEventListener('resize', onResize);

    /* ═══ CLEANUP ═══ */
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameRef.current);
      pixelTarget.dispose();
      paletteTex.dispose();
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

  return (
    <div
      ref={mountRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  );
}
