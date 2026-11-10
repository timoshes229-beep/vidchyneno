import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Палітра сцени: синя година, кирпич, тепле світло 2700K, штукатурка, помаранчева табличка
const COL = {
  night: 0x141a24,
  lamp: 0xffc27a,
  plaster: 0xd8cbb4,
  sign: '#f26a1b',
  ink: '#15110e',
  cream: '#e9dfcf',
};

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// Розміри дверного прорізу (метри)
const DW = 1.8;
const DH = 2.9;
const SILL = 0.14;

/* ---------- процедурні текстури ---------- */

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function brickTextures() {
  const S = 1024;
  const [c, g] = canvas(S, S);
  const [b, gb] = canvas(S, S);
  g.fillStyle = '#26211e'; g.fillRect(0, 0, S, S);
  gb.fillStyle = '#000'; gb.fillRect(0, 0, S, S);
  const rows = 16, cols = 6, bh = S / rows, bw = S / cols, m = 7;
  const tones = [[70, 50, 43], [58, 43, 38], [84, 59, 48], [49, 38, 34], [92, 66, 53], [64, 47, 40]];
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * bw / 2;
    for (let i = -1; i <= cols; i++) {
      const x = i * bw + off, y = r * bh;
      const t = tones[Math.floor(Math.random() * tones.length)];
      const v = (Math.random() - 0.5) * 16;
      g.fillStyle = `rgb(${t[0] + v},${t[1] + v},${t[2] + v})`;
      g.fillRect(x + m / 2, y + m / 2, bw - m, bh - m);
      gb.fillStyle = `rgb(${200 + Math.random() * 40},${200},${200})`;
      gb.fillRect(x + m / 2, y + m / 2, bw - m, bh - m);
      for (let k = 0; k < 50; k++) {
        const px = x + Math.random() * bw, py = y + Math.random() * bh;
        const light = Math.random() < 0.5;
        g.fillStyle = light ? 'rgba(255,230,210,.05)' : 'rgba(0,0,0,.12)';
        g.fillRect(px, py, 2 + Math.random() * 5, 2 + Math.random() * 3);
        gb.fillStyle = light ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.35)';
        gb.fillRect(px, py, 2 + Math.random() * 4, 2 + Math.random() * 3);
      }
    }
  }
  const map = tex(c);
  const bump = tex(b, false);
  for (const t of [map, bump]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / 1.5, 1 / 1.5);
  }
  return { map, bump };
}

function radialTex(inner = 'rgba(255,255,255,1)') {
  const [c, g] = canvas(256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, inner);
  gr.addColorStop(0.35, 'rgba(255,255,255,.35)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return tex(c);
}

function verticalTex() {
  const [c, g] = canvas(16, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, 'rgba(255,255,255,.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 256);
  return tex(c);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function fitFont(g, text, weight, family, maxW, start) {
  let size = start;
  do { g.font = `${weight} ${size}px ${family}`; size -= 4; } while (g.measureText(text).width > maxW && size > 20);
  return size + 4;
}

function signTexture(open) {
  const W = 1024, H = 634;
  const [c, g] = canvas(W, H);
  const bg = open ? COL.sign : COL.ink;
  const fg = open ? COL.ink : COL.cream;
  roundRect(g, 4, 4, W - 8, H - 8, 80);
  g.fillStyle = bg; g.fill();
  roundRect(g, 34, 34, W - 68, H - 68, 56);
  g.lineWidth = 10; g.strokeStyle = fg; g.stroke();
  g.fillStyle = fg;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const word = open ? 'ВІДЧИНЕНО' : 'ЗАЧИНЕНО';
  fitFont(g, word, 800, 'Geologica', W - 200, 170);
  g.fillText(word, W / 2, H / 2 - 30);
  g.font = '500 44px Geologica';
  g.globalAlpha = 0.85;
  g.fillText(open ? 'від ідеї до першого гостя' : 'але вже зовсім скоро', W / 2, H / 2 + 100);
  return tex(c);
}

// Формати закладу: колір неону та що видно у вітринах
const FORMATS = {
  restaurant: { neon: '#ffd9a8', glow: '#ff9a3c' },
  coffee: { neon: '#fff1dc', glow: '#ffae5c' },
  pizza: { neon: '#ffe1c8', glow: '#ff5a2e' },
  burger: { neon: '#fff3bf', glow: '#ffb400' },
};

function glowText(g, text, x, y, f) {
  g.shadowColor = f.glow;
  for (const blur of [60, 30, 12]) {
    g.shadowBlur = blur;
    g.fillStyle = f.neon;
    g.fillText(text, x, y);
  }
  g.shadowBlur = 0;
  g.fillStyle = '#fffaf2';
  g.fillText(text, x, y);
}

function neonTexture(name, format) {
  const f = FORMATS[format] || FORMATS.restaurant;
  const W = 2048, H = 560;
  const [c, g] = canvas(W, H);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (name) {
    fitFont(g, 'Ласкаво просимо до', 400, '"Marck Script"', W - 300, 170);
    glowText(g, 'Ласкаво просимо до', W / 2, H * 0.3, f);
    fitFont(g, `«${name}»`, 400, '"Marck Script"', W - 260, 230);
    glowText(g, `«${name}»`, W / 2, H * 0.7, f);
  } else {
    fitFont(g, 'Ласкаво просимо', 400, '"Marck Script"', W - 260, 300);
    glowText(g, 'Ласкаво просимо', W / 2, H / 2, f);
  }
  return tex(c);
}

// значки форматів, намальовані «неоновою трубкою»
function drawIcon(g, format, x, y, s) {
  g.save();
  g.translate(x, y);
  g.scale(s / 100, s / 100);
  g.beginPath();
  if (format === 'coffee') {
    g.moveTo(-34, -18); g.lineTo(-28, 34); g.lineTo(22, 34); g.lineTo(28, -18); g.closePath();
    g.moveTo(28, -6); g.bezierCurveTo(52, -6, 52, 22, 25, 22);
    g.moveTo(-12, -32); g.bezierCurveTo(-2, -40, -18, -48, -8, -58);
    g.moveTo(8, -32); g.bezierCurveTo(18, -40, 2, -48, 12, -58);
  } else if (format === 'pizza') {
    g.moveTo(-40, -36); g.quadraticCurveTo(0, -52, 40, -36); g.lineTo(0, 44); g.closePath();
    g.moveTo(-14, -18); g.arc(-12, -18, 6, 0, Math.PI * 2);
    g.moveTo(16, -12); g.arc(12, -12, 6, 0, Math.PI * 2);
    g.moveTo(4, 12); g.arc(0, 12, 6, 0, Math.PI * 2);
  } else if (format === 'burger') {
    g.moveTo(-42, -6); g.quadraticCurveTo(-42, -44, 0, -44); g.quadraticCurveTo(42, -44, 42, -6); g.closePath();
    g.moveTo(-46, 8); g.quadraticCurveTo(-34, 0, -22, 8); g.quadraticCurveTo(-10, 16, 2, 8); g.quadraticCurveTo(14, 0, 26, 8); g.quadraticCurveTo(38, 16, 46, 8);
    g.moveTo(-42, 24); g.lineTo(42, 24); g.quadraticCurveTo(42, 40, 26, 40); g.lineTo(-26, 40); g.quadraticCurveTo(-42, 40, -42, 24);
  } else {
    g.moveTo(-46, 26); g.lineTo(46, 26);
    g.moveTo(-38, 26); g.quadraticCurveTo(-38, -30, 0, -30); g.quadraticCurveTo(38, -30, 38, 26);
    g.moveTo(-6, -36); g.lineTo(6, -36); g.moveTo(0, -36); g.lineTo(0, -30);
  }
  g.restore();
  // товщина лінії після restore, щоб stroke() малював у масштабі значка
  g.lineWidth = 7 * s / 100; g.lineCap = 'round'; g.lineJoin = 'round';
}

function signageTexture(name, format) {
  const f = FORMATS[format] || FORMATS.restaurant;
  const W = 2048, H = 360;
  const [c, g] = canvas(W, H);
  const text = name || 'Ваш заклад';
  g.textBaseline = 'middle';
  const size = fitFont(g, text, 400, '"Marck Script"', W - 560, 230);
  const tw = g.measureText(text).width;
  const icon = 190, gap = 50;
  const x0 = (W - (icon + gap + tw)) / 2;
  g.shadowColor = f.glow;
  for (const blur of [50, 24, 10, 0]) {
    g.shadowBlur = blur;
    g.strokeStyle = blur ? f.neon : '#fffaf2';
    g.fillStyle = blur ? f.neon : '#fffaf2';
    drawIcon(g, format, x0 + icon / 2, H / 2, icon);
    g.stroke();
    g.font = `400 ${size}px "Marck Script"`;
    g.textAlign = 'left';
    g.fillText(text, x0 + icon + gap, H / 2 + 6);
  }
  return tex(c);
}

function windowTexture(format, seed) {
  const W = 512, H = 512;
  const [c, g] = canvas(W, H);
  const glowAt = (x, y, r, inner = 'rgba(255,236,200,1)', mid = 'rgba(255,190,110,.7)') => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, inner); rg.addColorStop(0.22, mid); rg.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  const bg = (top, mid, bottom) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, top); gr.addColorStop(0.55, mid); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  };
  const counter = (y, color = 'rgba(24,14,8,.92)') => {
    g.fillStyle = color; g.fillRect(0, y, W, H - y);
    g.fillStyle = 'rgba(255,200,130,.55)'; g.fillRect(0, y, W, 4);
  };

  if (format === 'coffee') {
    bg('#3a2416', '#a0683a', '#2a180e');
    for (let i = 0; i < 3; i++) glowAt(110 + i * 150 + seed % 20, 70, 70);
    // крейдяна дошка з меню
    g.fillStyle = 'rgba(20,22,20,.9)'; g.fillRect(36, 110, 170, 150);
    g.strokeStyle = 'rgba(240,235,220,.7)'; g.lineWidth = 3;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(56, 140 + i * 24); g.lineTo(150 + (i * 23 % 40), 140 + i * 24); g.stroke(); }
    // полиця з чашками
    g.fillStyle = 'rgba(30,18,10,.8)'; g.fillRect(250, 190, 230, 8);
    g.fillStyle = 'rgba(250,244,232,.92)';
    for (let i = 0; i < 6; i++) g.fillRect(262 + i * 36, 160, 24, 30);
    // кавомашина
    g.fillStyle = 'rgba(160,160,165,.95)'; g.fillRect(280, 268, 170, 92);
    g.fillStyle = 'rgba(60,60,66,.95)'; g.fillRect(300, 300, 130, 24);
    counter(360);
  } else if (format === 'pizza') {
    bg('#2a120a', '#6e3016', '#1e0c06');
    glowAt(120, 60, 60); glowAt(400, 60, 60);
    // піч із вогнем
    g.fillStyle = '#5a2a1a';
    g.beginPath(); g.ellipse(256, 360, 170, 200, 0, Math.PI, 0); g.fill();
    const fire = g.createRadialGradient(256, 340, 4, 256, 330, 110);
    fire.addColorStop(0, 'rgba(255,240,180,1)'); fire.addColorStop(0.35, 'rgba(255,140,40,.95)'); fire.addColorStop(1, 'rgba(120,30,10,1)');
    g.fillStyle = fire;
    g.beginPath(); g.ellipse(256, 360, 90, 80, 0, Math.PI, 0); g.fill();
    counter(360, 'rgba(30,14,8,.95)');
    // піци на стійці
    for (const x of [90, 420]) {
      g.fillStyle = '#e8c27a'; g.beginPath(); g.ellipse(x, 392, 62, 16, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c0391f'; g.beginPath(); g.ellipse(x, 390, 50, 11, 0, 0, Math.PI * 2); g.fill();
    }
  } else if (format === 'burger') {
    bg('#1d1410', '#4e2612', '#140c08');
    // неоновий бургер у вікні
    g.save();
    g.shadowColor = '#ffb400'; g.strokeStyle = '#fff3bf';
    for (const blur of [30, 12, 0]) { g.shadowBlur = blur; g.beginPath(); drawIcon(g, 'burger', 256, 170, 210); g.stroke(); }
    g.restore();
    counter(340);
    // барні стільці
    g.fillStyle = 'rgba(12,8,6,.95)';
    for (const x of [100, 256, 412]) {
      g.beginPath(); g.ellipse(x, 420, 46, 12, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(x - 4, 420, 8, 92);
    }
  } else {
    bg('#3b2414', '#8a5427', '#2a180e');
    for (let i = 0; i < 4; i++) {
      const x = 60 + i * 130 + (seed * 37 % 40), y = 120 + (i % 2) * 40;
      glowAt(x, y, 90);
      g.fillStyle = 'rgba(20,12,8,.6)'; g.fillRect(x - 1, 0, 2, y - 10);
    }
    g.fillStyle = 'rgba(18,10,6,.85)';
    for (let i = 0; i < 3; i++) {
      const x = 50 + i * 160 + seed * 11 % 30;
      g.fillRect(x, 360, 110, 10);
      g.fillRect(x + 50, 370, 8, 110);
      g.fillRect(x - 25, 330, 6, 150);
      g.fillRect(x + 130, 330, 6, 150);
    }
    g.fillStyle = 'rgba(14,20,10,.8)';
    g.beginPath(); g.ellipse(470, 300, 50, 110, 0, 0, Math.PI * 2); g.fill();
  }
  return tex(c);
}

/* ---------- сцена ---------- */

export async function createHero(canvasEl) {
  await Promise.all([
    document.fonts.load('800 100px Geologica', 'ВІДЧИНЕНОЗАЧ'),
    document.fonts.load('500 40px Geologica', 'від ідеї до першого гостя але вже зовсім скоро'),
    document.fonts.load('400 100px "Marck Script"', 'Ласкаво просимо'),
  ]).catch(() => {});

  const lowPower = matchMedia('(max-width: 760px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.night);
  scene.fog = new THREE.Fog(COL.night, 10, 34);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 80);

  const std = (p) => new THREE.MeshStandardMaterial({ envMapIntensity: 0.06, ...p });
  const glow = (color, level = 1) => {
    const m = new THREE.MeshBasicMaterial({ color, toneMapped: true });
    m.userData.base = new THREE.Color(color);
    m.color.copy(m.userData.base).multiplyScalar(level);
    return m;
  };
  const additive = (map, color, opacity) => new THREE.MeshBasicMaterial({
    map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false,
  });

  // освітлення: прохолодна синя година зовні, тепло всередині
  scene.add(new THREE.HemisphereLight(0x51617f, 0x1c130d, 0.9));
  const moon = new THREE.DirectionalLight(0x8fa3c8, 0.45);
  moon.position.set(-6, 10, 8);
  scene.add(moon);

  const metal = std({ color: 0x0d0d0e, metalness: 0.7, roughness: 0.38, envMapIntensity: 0.5 });
  const brass = std({ color: 0xc8a062, metalness: 1, roughness: 0.22, envMapIntensity: 1.1 });
  const plaster = std({ color: COL.plaster, roughness: 0.85 });

  /* фасад з прорізом */
  const bricks = brickTextures();
  const W = 26, H = 12;
  const notch = new THREE.Shape();
  notch.moveTo(-W / 2, 0);
  notch.lineTo(-DW / 2, 0); notch.lineTo(-DW / 2, DH + SILL); notch.lineTo(DW / 2, DH + SILL); notch.lineTo(DW / 2, 0);
  notch.lineTo(W / 2, 0); notch.lineTo(W / 2, H); notch.lineTo(-W / 2, H); notch.closePath();
  const wallGeo = new THREE.ShapeGeometry(notch);
  const wall = new THREE.Mesh(wallGeo, std({ map: bricks.map, bumpMap: bricks.bump, bumpScale: 2.2, roughness: 0.92 }));
  scene.add(wall);

  const innerWall = new THREE.Mesh(wallGeo, std({ color: 0x6b5442, roughness: 0.9 }));
  innerWall.rotation.y = Math.PI;
  innerWall.position.z = -0.36;
  scene.add(innerWall);

  // відкоси прорізу
  for (const s of [-1, 1]) {
    const reveal = new THREE.Mesh(new THREE.PlaneGeometry(0.36, DH + SILL), std({ color: 0x1b1714, roughness: 0.9 }));
    reveal.rotation.y = -s * Math.PI / 2;
    reveal.position.set(s * DW / 2, (DH + SILL) / 2, -0.18);
    scene.add(reveal);
  }
  const head = new THREE.Mesh(new THREE.PlaneGeometry(DW, 0.36), std({ color: 0x1b1714 }));
  head.rotation.x = Math.PI / 2;
  head.position.set(0, DH + SILL, -0.18);
  scene.add(head);

  // металева рама прорізу
  const jambGeo = new THREE.BoxGeometry(0.1, DH + 0.1, 0.42);
  for (const s of [-1, 1]) {
    const j = new THREE.Mesh(jambGeo, metal);
    j.position.set(s * (DW / 2 + 0.03), SILL + DH / 2, -0.12);
    scene.add(j);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(DW + 0.16, 0.1, 0.42), metal);
  lintel.position.set(0, SILL + DH + 0.03, -0.12);
  scene.add(lintel);

  /* підлога, сходинка з LED-стрічкою */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), std({ color: 0x24211f, roughness: 0.32, metalness: 0.15, envMapIntensity: 0.25 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 18;
  scene.add(ground);

  const step = new THREE.Mesh(new THREE.BoxGeometry(4.2, SILL, 1.5), std({ color: 0x3a3632, roughness: 0.4, envMapIntensity: 0.2 }));
  step.position.set(0, SILL / 2, 0.75);
  scene.add(step);
  const stepLed = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.02, 0.02), glow(COL.lamp, 0));
  stepLed.position.set(0, 0.012, 1.51);
  scene.add(stepLed);
  const stepGlow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.2), additive(verticalTex(), COL.lamp, 0));
  stepGlow.rotation.x = -Math.PI / 2;
  stepGlow.position.set(0, 0.004, 2.1);
  stepGlow.rotation.z = Math.PI;
  scene.add(stepGlow);

  /* кремовий карниз з підсвіткою знизу, як на фасадах Grey Stone та Eat it */
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(W, 0.75, 0.7), plaster);
  cornice.position.set(0, 3.95, 0.35);
  scene.add(cornice);
  const corniceTop = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, 0.84), plaster);
  corniceTop.position.set(0, 4.36, 0.42);
  scene.add(corniceTop);
  const signage = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 0.457),
    new THREE.MeshBasicMaterial({ map: signageTexture('', 'restaurant'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  signage.material.color.setScalar(0);
  signage.position.set(0, 3.35, 0.03);
  scene.add(signage);
  const led = new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, 0.05), glow(COL.lamp, 0));
  led.position.set(0, 3.56, 0.66);
  scene.add(led);
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(W, 1.9), additive(verticalTex(), COL.lamp, 0));
  wash.position.set(0, 2.62, 0.02);
  scene.add(wash);

  /* колони */
  const colGeo = new THREE.CylinderGeometry(0.26, 0.3, 3.58, 40);
  const baseGeo = new THREE.BoxGeometry(0.72, 0.3, 0.72);
  for (const s of [-1, 1]) {
    const col = new THREE.Mesh(colGeo, plaster);
    col.position.set(s * 3.1, 1.79, 0.62);
    scene.add(col);
    const base = new THREE.Mesh(baseGeo, plaster);
    base.position.set(s * 3.1, 0.15, 0.62);
    scene.add(base);
    const cap = new THREE.Mesh(baseGeo, plaster);
    cap.scale.set(1, 0.6, 1);
    cap.position.set(s * 3.1, 3.5, 0.62);
    scene.add(cap);
  }

  /* бра біля дверей */
  const sconces = [];
  for (const s of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.05), glow(COL.lamp, 0));
    bar.position.set(s * 1.24, 2.25, 0.05);
    scene.add(bar);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.7, 0.03), metal);
    plate.position.set(s * 1.24, 2.25, 0.015);
    scene.add(plate);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.6), additive(radialTex(), COL.lamp, 0));
    halo.position.set(s * 1.24, 2.25, 0.03);
    scene.add(halo);
    const light = new THREE.PointLight(COL.lamp, 0, 5, 2);
    light.position.set(s * 1.24, 2.25, 0.35);
    scene.add(light);
    sconces.push({ bar, halo, light });
  }

  /* вітрини з теплим залом */
  const windows = [];
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * 5.1, SILL, 0.01);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.7), glow(0xffffff, 0));
    pane.material.map = windowTexture('restaurant', s > 0 ? 3 : 7);
    pane.userData.seed = s > 0 ? 3 : 7;
    pane.position.y = 0.4 + 1.35;
    g.add(pane);
    const fr = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), metal); m.position.set(x, y, 0.03); g.add(m); };
    fr(2.62, 0.08, 0, 0.4); fr(2.62, 0.08, 0, 3.1); fr(0.08, 2.78, -1.29, 1.75); fr(0.08, 2.78, 1.29, 1.75);
    fr(0.05, 2.7, 0, 1.75); fr(2.5, 0.05, 0, 2.55);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 0.3), plaster);
    sill.position.set(0, 0.37, 0.12);
    g.add(sill);
    scene.add(g);
    windows.push(pane);
  }

  /* двері: шарнір ліворуч, відчиняються всередину */
  const door = new THREE.Group();
  const DOOR_W = DW - 0.04, DOOR_H = DH - 0.02;
  door.position.set(-DW / 2 + 0.02, SILL, -0.06);
  scene.add(door);
  const part = (w, h, d, x, y, z = 0, mat = metal) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    door.add(m);
    return m;
  };
  part(0.09, DOOR_H, 0.06, 0.045, DOOR_H / 2);
  part(0.09, DOOR_H, 0.06, DOOR_W - 0.045, DOOR_H / 2);
  part(DOOR_W, 0.09, 0.06, DOOR_W / 2, DOOR_H - 0.045);
  part(DOOR_W, 0.22, 0.06, DOOR_W / 2, 0.11);
  const glassH = DOOR_H - 0.31;
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(DOOR_W - 0.18, glassH),
    new THREE.MeshStandardMaterial({
      color: 0x101a24, transparent: true, opacity: 0.32, roughness: 0.04, metalness: 0.9,
      envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  glass.position.set(DOOR_W / 2, 0.22 + glassH / 2, 0);
  door.add(glass);
  // латунна ручка-штанга
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 1.15, 24), brass);
  handle.position.set(DOOR_W - 0.22, 1.2, 0.11);
  door.add(handle);
  for (const y of [0.72, 1.68]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 12), brass);
    st.rotation.x = Math.PI / 2;
    st.position.set(DOOR_W - 0.22, y, 0.055);
    door.add(st);
  }

  /* табличка на присосці: гойдається, перевертається */
  const signPivot = new THREE.Group();
  signPivot.position.set(DOOR_W / 2, 2.2, 0.05);
  door.add(signPivot);
  const hook = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), brass);
  signPivot.add(hook);
  const strings = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.36, -0.2, 0),
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.36, -0.2, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0x8a7a66 }),
  );
  signPivot.add(strings);
  const flip = new THREE.Group();
  flip.position.y = -0.2 - 0.3;
  signPivot.add(flip);
  const front = signTexture(true), back = signTexture(false);
  const side = new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 0.6 });
  const face = (map) => new THREE.MeshStandardMaterial({
    map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0, transparent: true, alphaTest: 0.5, roughness: 0.55, envMapIntensity: 0.2,
  });
  const frontMat = face(front), backMat = face(back);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.607, 0.016), [side, side, side, side, frontMat, backMat]);
  flip.add(board);
  flip.rotation.y = Math.PI; // спочатку «ЗАЧИНЕНО»

  /* зал усередині */
  const room = new THREE.Group();
  scene.add(room);
  const RD = 12.6;
  const wood = std({ color: 0x3d2a1d, roughness: 0.55, envMapIntensity: 0.2 });
  const roomWall = std({ color: 0x9a7a5e, roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, RD), wood);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, SILL, -0.36 - RD / 2);
  room.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8, RD), std({ color: 0x1d1612 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.7, -0.36 - RD / 2);
  room.add(ceil);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(RD, 3.6), roomWall);
    w.rotation.y = -s * Math.PI / 2;
    w.position.set(s * 4, 1.9, -0.36 - RD / 2);
    room.add(w);
  }
  const backWall = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape().moveTo(-4, -1.8).lineTo(4, -1.8).lineTo(4, 1.8).lineTo(-4, 1.8).closePath()), std({ map: bricks.map, bumpMap: bricks.bump, bumpScale: 2, color: 0x8a7a70, roughness: 0.9 }));
  backWall.position.set(0, 1.9, -0.36 - RD);
  room.add(backWall);

  // барна стійка з підсвіткою
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 5.5), wood);
  bar.position.set(2.7, SILL + 0.55, -5.6);
  room.add(bar);
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 5.7), std({ color: 0xbfb3a0, roughness: 0.25, envMapIntensity: 0.4 }));
  barTop.position.set(2.7, SILL + 1.13, -5.6);
  room.add(barTop);
  const barLed = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 5.5), glow(COL.lamp, 0));
  barLed.position.set(2.12, SILL + 1.08, -5.6);
  room.add(barLed);

  // столики
  for (const [x, z] of [[-1.9, -3], [-1.9, -6], [-1.9, -9], [0.2, -7.6]]) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 32), wood);
    top.position.set(x, SILL + 0.76, z);
    room.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.74, 12), metal);
    leg.position.set(x, SILL + 0.38, z);
    room.add(leg);
  }

  // підвісні світильники
  const pendants = [];
  for (const z of [-2.2, -4.8, -7.4, -10]) {
    for (const x of [-1.9, 0.2]) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), glow(COL.lamp, 0));
      bulb.position.set(x, 2.55, z);
      room.add(bulb);
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.1, 6), metal);
      cord.position.set(x, 3.15, z);
      room.add(cord);
      pendants.push(bulb);
    }
  }
  const roomLights = [];
  for (const z of [-2.5, -7.5]) {
    const l = new THREE.PointLight(COL.lamp, 0, 9, 2);
    l.position.set(0, 2.6, z);
    room.add(l);
    roomLights.push(l);
  }
  const doorSpill = new THREE.PointLight(COL.lamp, 0, 7, 2);
  doorSpill.position.set(0, 1.6, -0.9);
  scene.add(doorSpill);

  // неон «Ласкаво просимо» на задній стіні
  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 1.26),
    new THREE.MeshBasicMaterial({ map: neonTexture('', 'restaurant'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  neon.material.color.setScalar(0);
  neon.position.set(0, 2.25, -0.36 - RD + 0.02);
  room.add(neon);

  /* пил у світлі */
  const DUST = lowPower ? 160 : 380;
  const dustPos = new Float32Array(DUST * 3);
  const dustSpeed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 6;
    dustPos[i * 3 + 1] = Math.random() * 3.6;
    dustPos[i * 3 + 2] = Math.random() * 4 - 1.5;
    dustSpeed[i] = 0.02 + Math.random() * 0.06;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: COL.lamp, size: 0.018, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(dust);

  /* постобробка */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.5, 0.5, 0.86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* траєкторія камери */
  let camPath, lookPath, portrait = false;
  function buildPaths() {
    const a = camera.aspect;
    portrait = a < 0.9;
    const start = portrait ? new THREE.Vector3(0, 1.55, 11.2) : new THREE.Vector3(0, 1.6, 7.6);
    const startLook = portrait ? new THREE.Vector3(0, 0.55, 0) : new THREE.Vector3(0, 1.62, 0);
    camPath = new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(0, 1.58, 3.4),
      new THREE.Vector3(0, 1.6, 0.6),
      new THREE.Vector3(0.1, 1.65, -2.8),
      new THREE.Vector3(0, 1.85, -8.9),
    ]);
    lookPath = new THREE.CatmullRomCurve3([
      startLook,
      new THREE.Vector3(0, 1.5, -1),
      new THREE.Vector3(0, 1.6, -4),
      new THREE.Vector3(0, 1.9, -9),
      new THREE.Vector3(0, 2.2, -12.6),
    ]);
  }

  function resize() {
    const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 42 : 35;
    camera.updateProjectionMatrix();
    buildPaths();
  }
  resize();
  addEventListener('resize', resize);

  /* стан */
  const state = {
    target: 0, p: 0,
    lights: 0, lightsTarget: 0, lightsStart: 0,
    flip: Math.PI, flipVel: 0, flipTarget: Math.PI,
    swing: 0.05, swingVel: 0, swingX: 0,
    doorPrev: 0,
    mouse: new THREE.Vector2(), mouseSmooth: new THREE.Vector2(), mousePrevX: 0,
    hover: false,
  };
  const listeners = { hover: () => {}, layout: () => {}, door: () => {} };

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-9, -9);
  addEventListener('pointermove', (e) => {
    const r = canvasEl.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    state.mouse.set(ndc.x, ndc.y);
  });
  canvasEl.addEventListener('click', () => {
    if (!state.hover) return;
    state.flipTarget = state.flipTarget === 0 ? Math.PI : 0;
    state.swingVel += 1.6;
  });

  const tmp = new THREE.Vector3();
  const project = (x, y, z) => {
    tmp.set(x, y, z).project(camera);
    return [(tmp.x + 1) / 2 * canvasEl.clientWidth, (1 - tmp.y) / 2 * canvasEl.clientHeight];
  };

  const clock = new THREE.Clock();
  let running = true;

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    state.p += (state.target - state.p) * Math.min(1, dt * 5);
    const p = state.p;

    // увімкнення світла з мерехтінням
    state.lights += (state.lightsTarget - state.lights) * Math.min(1, dt * 2.2);
    const since = t - state.lightsStart;
    const flicker = state.lightsTarget && since < 0.7 ? (Math.sin(since * 90) > 0.1 ? 1 : 0.15) : 1;
    const L = state.lights;
    const open = smooth(0.06, 0.5, p);

    for (const s of sconces) {
      const v = L * flicker;
      s.bar.material.color.copy(s.bar.material.userData.base).multiplyScalar(v * 1.5);
      s.halo.material.opacity = v * 0.2;
      s.light.intensity = v * 2.2;
    }
    led.material.color.copy(led.material.userData.base).multiplyScalar(L * 3);
    wash.material.opacity = L * 0.42;
    signage.material.color.setScalar(L * flicker * 1.15);
    stepLed.material.color.copy(stepLed.material.userData.base).multiplyScalar(L * 3);
    stepGlow.material.opacity = L * 0.35;
    for (const w of windows) w.material.color.setScalar(L * 1.05);
    const inside = L * (0.55 + open * 0.9);
    for (const b of pendants) b.material.color.copy(b.material.userData.base).multiplyScalar(inside * 3.4);
    barLed.material.color.copy(barLed.material.userData.base).multiplyScalar(inside * 2.5);
    for (const l of roomLights) l.intensity = inside * 45;
    doorSpill.intensity = L * open * 5;
    neon.material.color.setScalar(L * (0.45 + smooth(0.45, 0.85, p) * 0.6));
    dust.material.opacity = L * (0.35 + open * 0.4);
    frontMat.emissiveIntensity = L * 0.16;
    backMat.emissiveIntensity = L * 0.12;

    if (open > 0.08 && !state.belled) { state.belled = true; listeners.door(); }
    if (open < 0.02) state.belled = false;

    // двері
    const doorAngle = open * 1.7;
    door.rotation.y = doorAngle;
    state.swingVel += (doorAngle - state.doorPrev) * 6;
    state.doorPrev = doorAngle;

    // фізика таблички
    const mdx = state.mouse.x - state.mousePrevX;
    state.mousePrevX = state.mouse.x;
    if (state.hover) state.swingVel += mdx * 3;
    state.swingVel += (-state.swing * 14 - state.swingVel * 1.1) * dt;
    state.swing += state.swingVel * dt;
    state.flipVel += ((state.flipTarget - state.flip) * 38 - state.flipVel * 6.5) * dt;
    state.flip += state.flipVel * dt;
    signPivot.rotation.z = state.swing + Math.sin(t * 0.9) * 0.012;
    signPivot.rotation.x = Math.sin(t * 0.7) * 0.02;
    flip.rotation.y = state.flip;

    // пил
    const arr = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST; i++) {
      arr[i * 3 + 1] += dustSpeed[i] * dt;
      arr[i * 3] += Math.sin(t * 0.3 + i) * 0.0008;
      if (arr[i * 3 + 1] > 3.6) arr[i * 3 + 1] = 0.1;
    }
    dustGeo.attributes.position.needsUpdate = true;

    // камера
    state.mouseSmooth.lerp(state.mouse, Math.min(1, dt * 3));
    const e = p;
    camPath.getPointAt(e, camera.position);
    const look = lookPath.getPointAt(e);
    const par = 1 - smooth(0.3, 0.7, p);
    camera.position.x += state.mouseSmooth.x * 0.32 * par;
    camera.position.y += state.mouseSmooth.y * 0.14 * par;
    camera.lookAt(look);

    // наведення на табличку
    ray.setFromCamera(ndc, camera);
    const hit = p < 0.2 && ray.intersectObject(board).length > 0;
    if (hit !== state.hover) { state.hover = hit; listeners.hover(hit); }

    // межі дверей на екрані для розкладки заголовка
    const [lx, my] = project(-DW / 2 - 0.1, SILL + DH * 0.55, 0);
    const [rx] = project(DW / 2 + 0.1, SILL + DH * 0.55, 0);
    const [, top] = project(0, SILL + DH + 0.1, 0);
    const [, bottom] = project(0, SILL, 0);
    listeners.layout({ left: lx, right: rx, mid: my, top, bottom, portrait });

    composer.render();
  }

  return {
    start() { clock.start(); frame(); },
    setProgress(v) { state.target = clamp(v); },
    lightsOn() { state.lightsTarget = 1; state.lightsStart = clock.elapsedTime; setTimeout(() => { state.flipTarget = 0; state.swingVel += 1.2; }, 650); },
    onHover(fn) { listeners.hover = fn; },
    onDoor(fn) { listeners.door = fn; },
    setPlace({ name, format }) {
      const swap = (mat, t) => { mat.map?.dispose(); mat.map = t; mat.needsUpdate = true; };
      swap(signage.material, signageTexture(name, format));
      swap(neon.material, neonTexture(name, format));
      for (const w of windows) swap(w.material, windowTexture(format, w.userData.seed));
    },
    onLayout(fn) { listeners.layout = fn; },
    pause() {
      running = false;
      if (state.hover) { state.hover = false; listeners.hover(false); }
    },
    resume() { if (!running) { running = true; clock.getDelta(); frame(); } },
  };
}
