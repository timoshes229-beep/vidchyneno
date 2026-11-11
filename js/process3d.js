import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// «Як ми працюємо» у 3D: заклад будується на макеті з кожним етапом
// слабкий пристрій: менше пікселів у 3D, той самий вигляд
const WEAK = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const SMALL = matchMedia('(max-width: 760px)').matches;
const W = 6, H = 3.2, D = 4;
const FRONT = D / 2;
const BLUE = 0x3b67a8;
const INK = 0x15110e;

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function brickTexture() {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#e8ddd0'; g.fillRect(0, 0, 512, 512);
  const rows = 16, cols = 6, bh = 512 / rows, bw = 512 / cols;
  for (let r = 0; r < rows; r++) {
    for (let i = -1; i <= cols; i++) {
      const x = i * bw + (r % 2) * bw / 2, y = r * bh;
      const v = Math.random() * 18;
      g.fillStyle = `rgb(${150 + v},${86 + v * 0.6},${62 + v * 0.5})`;
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(W / 1.5, H / 1.5);
  return t;
}

// підпис-спрайт: текст завжди дивиться в камеру
function label(text, { font = '600 64px Montserrat', color = '#3b67a8', height = 0.4, bg = null, pad = 24, round = 18 } = {}) {
  const [m, mg] = canvas(8, 8);
  mg.font = font;
  const w = Math.ceil(mg.measureText(text).width) + pad * 2;
  const h = parseInt(font.match(/(\d+)px/)[1], 10) * 1.5 + pad;
  const [c, g] = canvas(w, h);
  if (bg) {
    g.fillStyle = bg;
    g.beginPath(); g.roundRect(0, 0, w, h, round); g.fill();
  }
  g.font = font; g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false }));
  s.scale.set(height * w / h, height, 1);
  return s;
}

function tileTexture() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#cfc8bd'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = Math.random() * 14;
    g.fillStyle = `rgb(${200 + v},${194 + v},${184 + v})`;
    g.fillRect(x * 64 + 2, y * 64 + 2, 60, 60);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(14, 3);
  return t;
}

function roadTexture() {
  const [c, g] = canvas(512, 128);
  g.fillStyle = '#3a3836'; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * 512, Math.random() * 128, 2, 2); }
  g.fillStyle = '#efe6d2';
  for (let x = 0; x < 512; x += 64) g.fillRect(x + 8, 60, 36, 6);
  const t = tex(c);
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}

function neonTexture(name) {
  const [c, g] = canvas(1024, 200);
  g.fillStyle = '#15110e';
  g.beginPath(); g.roundRect(0, 0, 1024, 200, 30); g.fill();
  let size = 120;
  do { g.font = `400 ${size}px "Marck Script"`; size -= 4; } while (g.measureText(name).width > 900 && size > 30);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff9a3c';
  for (const blur of [40, 18, 0]) { g.shadowBlur = blur; g.fillStyle = blur ? '#ffd9a8' : '#fffaf2'; g.fillText(name, 512, 104); }
  return tex(c);
}

// людина: тулуб, голова з волоссям, руки й ноги на шарнірах для кроку
function person({ shirt, pants = 0x2b2f3a, skin = 0xe8b996, hair = 0x2a1d15 }) {
  const f = new THREE.Group();
  const m = (c, r = 0.75) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const shirtM = m(shirt), pantsM = m(pants), skinM = m(skin, 0.6), hairM = m(hair, 0.9), shoeM = m(0x1a1714, 0.5);
  const limb = (r, len, mat) => {
    const g = new THREE.CapsuleGeometry(r, len, 4, 10);
    g.translate(0, -len / 2 - r, 0);
    return new THREE.Mesh(g, mat);
  };
  const legs = [-0.1, 0.1].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.92, 0);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.26), shoeM);
    shoe.position.set(0, -0.88, 0.05);
    pivot.add(limb(0.078, 0.68, pantsM), shoe);
    f.add(pivot);
    return pivot;
  });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 12), shirtM);
  torso.position.y = 1.22;
  torso.scale.z = 0.72;
  const arms = [-0.25, 0.25].map((x) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.48, 0);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), skinM);
    hand.position.y = -0.63;
    pivot.add(limb(0.055, 0.46, shirtM), hand);
    f.add(pivot);
    return pivot;
  });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), skinM);
  neck.position.y = 1.6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), skinM);
  head.position.y = 1.76;
  head.scale.set(0.95, 1.08, 1);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.138, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM);
  hairCap.position.set(0, 1.78, -0.01);
  hairCap.rotation.x = -0.25;
  f.add(torso, neck, head, hairCap);
  f.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  f.userData.limbs = { legs, arms };
  return f;
}

function stride(f, phase, amount) {
  const s = Math.sin(phase) * 0.55 * amount;
  const { legs, arms } = f.userData.limbs;
  legs[0].rotation.x = s; legs[1].rotation.x = -s;
  arms[0].rotation.x = -s * 0.8; arms[1].rotation.x = s * 0.8;
}

function interiorTexture(format = 'restaurant') {
  const [c, g] = canvas(512, 512);
  const bgs = {
    restaurant: ['#5a3418', '#c98545', '#3a2010'],
    coffee: ['#4a2c1a', '#b9834e', '#2c1a10'],
    pizza: ['#3a160c', '#9a4420', '#24100a'],
    burger: ['#2a1810', '#7a3a1a', '#1a0f0a'],
  }[format] || ['#5a3418', '#c98545', '#3a2010'];
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, bgs[0]); gr.addColorStop(0.55, bgs[1]); gr.addColorStop(1, bgs[2]);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const glow = (x, y, r) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,240,210,1)'); rg.addColorStop(0.25, 'rgba(255,190,110,.75)'); rg.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  if (format === 'pizza') {
    glow(256, 90, 80);
    g.fillStyle = '#6a3020'; g.beginPath(); g.ellipse(256, 360, 170, 190, 0, Math.PI, 0); g.fill();
    const f = g.createRadialGradient(256, 340, 4, 256, 330, 100);
    f.addColorStop(0, '#fff0b4'); f.addColorStop(0.4, '#ff8c28'); f.addColorStop(1, '#782010');
    g.fillStyle = f; g.beginPath(); g.ellipse(256, 360, 86, 76, 0, Math.PI, 0); g.fill();
  } else if (format === 'burger') {
    g.save(); g.shadowColor = '#ffb400'; g.shadowBlur = 24; g.strokeStyle = '#fff3bf'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(150, 200); g.quadraticCurveTo(150, 110, 256, 110); g.quadraticCurveTo(362, 110, 362, 200); g.closePath();
    g.moveTo(140, 240); g.lineTo(372, 240); g.moveTo(150, 280); g.lineTo(362, 280); g.quadraticCurveTo(362, 310, 330, 310); g.lineTo(182, 310); g.quadraticCurveTo(150, 310, 150, 280);
    g.stroke(); g.restore();
  } else if (format === 'coffee') {
    for (const x of [110, 256, 402]) glow(x, 90, 70);
    g.fillStyle = 'rgba(30,18,10,.8)'; g.fillRect(40, 200, 432, 8);
    g.fillStyle = 'rgba(250,244,232,.95)'; for (let i = 0; i < 9; i++) g.fillRect(56 + i * 46, 168, 26, 32);
    g.fillStyle = '#9a9aa0'; g.fillRect(290, 270, 170, 90);
  } else {
    for (let i = 0; i < 3; i++) { glow(100 + i * 156, 120, 90); g.fillStyle = 'rgba(30,18,10,.7)'; g.fillRect(100 + i * 156 - 1, 0, 2, 108); }
  }
  g.fillStyle = 'rgba(28,16,8,.92)'; g.fillRect(0, 360, 512, 152);
  g.fillStyle = 'rgba(255,205,140,.6)'; g.fillRect(0, 360, 512, 5);
  return tex(c);
}

export async function createBuild3D(canvasEl) {
  await Promise.all([
    document.fonts.load('600 64px Montserrat', 'вкладення окупність'),
    document.fonts.load('800 60px Montserrat', 'ВІДЧИНЕНО 30 днів поруч'),
    document.fonts.load('400 100px "Marck Script"', 'Ваш заклад формат'),
  ]).catch(() => {});

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, WEAK ? 1.2 : SMALL ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const BG = 0xf4ece0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 24, 46);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc2ad, 1.35));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.9);
  sun.position.set(6, 10, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(WEAK || SMALL ? 1024 : 2048);
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 30 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 }));
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.position.y = 0.004;
  shadowFloor.receiveShadow = true;
  scene.add(shadowFloor);

  // макет: аркуш з сіткою
  const grid = new THREE.GridHelper(18, 18, 0xb7c4d8, 0xd3dbe7);
  grid.material.transparent = true; grid.material.opacity = 0.45;
  scene.add(grid);

  const streetMats = [];
  const fadeMat = (m) => { m.transparent = true; m.opacity = 0; streetMats.push(m); return m; };
  const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(26, 4.4), fadeMat(new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.85 })));
  sidewalk.rotation.x = -Math.PI / 2;
  sidewalk.position.set(0, 0.006, FRONT + 2.2);
  sidewalk.receiveShadow = true;
  const curb = new THREE.Mesh(new THREE.BoxGeometry(26, 0.12, 0.22), fadeMat(new THREE.MeshStandardMaterial({ color: 0xe6dfd2, roughness: 0.7 })));
  curb.position.set(0, 0.06, FRONT + 4.45);
  curb.receiveShadow = true;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(26, 4), fadeMat(new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.95 })));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.004, FRONT + 6.55);
  road.receiveShadow = true;
  scene.add(sidewalk, curb, road);

  /* 1. креслення: лінії, що промальовуються */
  const pts = [];
  const seg = (a, b) => pts.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
  const box = (x0, x1, y0, y1, z0, z1) => {
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) seg(c[a], c[b]);
  };
  const rect = (x0, x1, y0, y1, z) => { seg([x0, y0, z], [x1, y0, z]); seg([x1, y0, z], [x1, y1, z]); seg([x1, y1, z], [x0, y1, z]); seg([x0, y1, z], [x0, y0, z]); };
  box(-W / 2, W / 2, 0, H, -D / 2, D / 2);
  const fz = FRONT + 0.01;
  rect(-0.5, 0.5, 0, 2.2, fz);
  rect(-2.6, -1, 0.7, 2.5, fz);
  rect(1, 2.6, 0.7, 2.5, fz);
  rect(-1.4, 1.4, 2.62, 3.04, fz);
  // товсті лінії, що промальовуються відрізок за відрізком
  const flat = (arr) => arr.flatMap((p) => [p.x, p.y, p.z]);
  const lineGeo = new LineSegmentsGeometry().setPositions(flat(pts));
  const lineMat = new LineMaterial({ color: BLUE, linewidth: 2.6, transparent: true });
  const lines = new LineSegments2(lineGeo, lineMat);
  scene.add(lines);
  const totalSegs = pts.length / 2;
  lineGeo.instanceCount = 0;

  /* 2. консультація: люди проходять повз, формат під питанням */
  const walkers = [];
  for (let i = 0; i < 6; i++) {
    const shirts = [0x3b67a8, 0xf26a1b, 0xe9dfcf, 0x5f8a4a, 0x8a3b2b, 0x2a2420];
    const skins = [0xf1c9a5, 0xd9a47c, 0xe8b996, 0xb57b52];
    const hairs = [0x2a1d15, 0x6b4423, 0xc9a26b, 0x111111];
    const f = person({ shirt: shirts[i], pants: i % 2 ? 0x2b2f3a : 0x4a3b30, skin: skins[i % 4], hair: hairs[(i + 1) % 4] });
    Object.assign(f.userData, { speed: 0.7 + Math.random() * 0.5, dir: i % 2 ? 1 : -1, z: FRONT + 1.5 + (i % 3) * 0.6, x: -7 + i * 2.4 });
    f.scale.setScalar(0);
    scene.add(f);
    walkers.push(f);
  }
  const formatTag = label('формат?', { font: '400 90px "Marck Script"', height: 0.6 });
  formatTag.position.set(0, H + 1.1, FRONT);
  scene.add(formatTag);

  /* 3. прорахунок: розміри та цифри */
  const dimPts = [];
  const dseg = (a, b) => dimPts.push(new THREE.Vector3(...a), new THREE.Vector3(...b));
  dseg([-W / 2, 0.02, FRONT + 0.7], [W / 2, 0.02, FRONT + 0.7]);
  dseg([-W / 2, 0.02, FRONT + 0.55], [-W / 2, 0.02, FRONT + 0.85]);
  dseg([W / 2, 0.02, FRONT + 0.55], [W / 2, 0.02, FRONT + 0.85]);
  dseg([-W / 2 - 0.6, 0, FRONT], [-W / 2 - 0.6, H, FRONT]);
  dseg([-W / 2 - 0.75, 0, FRONT], [-W / 2 - 0.45, 0, FRONT]);
  dseg([-W / 2 - 0.75, H, FRONT], [-W / 2 - 0.45, H, FRONT]);
  const dimMat = new LineMaterial({ color: BLUE, linewidth: 1.8, transparent: true, opacity: 0 });
  const dims = new LineSegments2(new LineSegmentsGeometry().setPositions(flat(dimPts)), dimMat);
  scene.add(dims);
  const at = (sprite, x, y, z) => { sprite.position.set(x, y, z); return sprite; };
  const dimLabels = [
    at(label('6 м', { height: 0.36 }), 0, 0.25, FRONT + 1.05),
    at(label('3,2 м', { height: 0.36 }), -W / 2 - 1.2, H / 2, FRONT),
    at(label('вкладення', { font: '400 80px "Marck Script"', height: 0.5 }), W / 2 + 1.6, H + 0.2, 0),
    at(label('окупність', { font: '400 80px "Marck Script"', height: 0.5 }), W / 2 + 1.6, H - 0.5, 0),
  ];
  for (const l of dimLabels) { l.material.opacity = 0; scene.add(l); }

  /* 4. договір: майданчик під будівлю */
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(W + 1.2, D + 1.2), new THREE.MeshStandardMaterial({ color: 0xd9cdb8, transparent: true, opacity: 0 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.005;
  scene.add(pad);

  /* 5. запуск: стіни ростуть, з'являються вікна, двері, дах */
  const walls = new THREE.Group();
  scene.add(walls);
  const wallGeo = new THREE.BoxGeometry(W, H, D);
  wallGeo.translate(0, H / 2, 0);
  const brickMap = brickTexture();
  const wallMesh = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: brickMap, roughness: 0.9 }));
  wallMesh.castShadow = true;
  walls.add(wallMesh);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.3, D + 0.4), new THREE.MeshStandardMaterial({ color: 0xf1e8d8, roughness: 0.8 }));
  roof.position.y = H + 0.15;
  roof.castShadow = true;
  const parapetM = new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.8 });
  for (const [w, d, x, z] of [[W + 0.4, 0.14, 0, D / 2 + 0.13], [W + 0.4, 0.14, 0, -D / 2 - 0.13], [0.14, D + 0.4, W / 2 + 0.13, 0], [0.14, D + 0.4, -W / 2 - 0.13, 0]]) {
    const pp = new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, d), parapetM);
    pp.position.set(x, H + 0.44, z);
    pp.castShadow = true;
    walls.add(pp);
  }
  const ac = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0xc9c6c0, roughness: 0.4, metalness: 0.3 }));
  ac.position.set(-1.6, H + 0.55, -0.8);
  ac.castShadow = true;
  walls.add(ac);
  walls.add(roof);
  walls.scale.y = 0.001;

  const facade = new THREE.Group();
  scene.add(facade);
  const glassMat = new THREE.MeshBasicMaterial({ map: interiorTexture(), transparent: true, opacity: 0 });
  glassMat.color.setScalar(0.25);
  const winGeo = new THREE.PlaneGeometry(1.6, 1.8);
  for (const x of [-1.8, 1.8]) {
    const win = new THREE.Mesh(winGeo, glassMat);
    win.position.set(x, 1.6, FRONT + 0.02);
    facade.add(win);
  }
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x1d1916, emissive: 0xffb35c, emissiveIntensity: 0, transparent: true, opacity: 0 });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.2), doorMat);
  door.position.set(0, 1.1, FRONT + 0.02);
  facade.add(door);
  const frameMat = new THREE.MeshStandardMaterial({ color: INK, transparent: true, opacity: 0 });
  for (const [w, h, x, y] of [[1.72, 0.08, -1.8, 2.5], [1.72, 0.08, -1.8, 0.7], [1.72, 0.08, 1.8, 2.5], [1.72, 0.08, 1.8, 0.7], [0.08, 2.3, 0.54, 1.1], [0.08, 2.3, -0.54, 1.1], [1.16, 0.08, 0, 2.22]]) {
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), frameMat);
    fr.position.set(x, y, FRONT + 0.06);
    fr.castShadow = true;
    facade.add(fr);
  }
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xc8a062, metalness: 1, roughness: 0.25, transparent: true, opacity: 0 });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 10), brassMat);
  handle.position.set(0.32, 1.1, FRONT + 0.1);
  facade.add(handle);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.8, transparent: true, opacity: 0 });
  const bloomMats = [new THREE.MeshStandardMaterial({ color: 0x5f8a4a, roughness: 0.9, transparent: true, opacity: 0 }), new THREE.MeshStandardMaterial({ color: 0xe36b8a, roughness: 0.8, transparent: true, opacity: 0 }), new THREE.MeshStandardMaterial({ color: 0xf2d16b, roughness: 0.8, transparent: true, opacity: 0 })];
  for (const x of [-1.8, 1.8]) {
    const fb = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 0.3), boxMat);
    fb.position.set(x, 0.55, FRONT + 0.17);
    fb.castShadow = true;
    facade.add(fb);
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11 + (i % 3) * 0.02, 0), bloomMats[i % 3 === 0 ? 1 : i % 4 === 0 ? 2 : 0]);
      b.position.set(x - 0.72 + i * 0.18, 0.72 + (i % 2) * 0.05, FRONT + 0.17 + ((i % 3) - 1) * 0.06);
      facade.add(b);
    }
  }
  const awningMat = new THREE.MeshStandardMaterial({ color: 0xf26a1b, roughness: 0.6, transparent: true, opacity: 0 });
  for (const x of [-1.8, 1.8]) {
    const aw = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.6), awningMat);
    aw.position.set(x, 2.62, FRONT + 0.3);
    aw.rotation.x = 0.35;
    aw.castShadow = true;
    facade.add(aw);
  }

  const street = new THREE.Group();
  scene.add(street);
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0x6b4a32 }));
  trunk.position.y = 0.75;
  const leafM = new THREE.MeshStandardMaterial({ color: 0x6f9a52, flatShading: true, roughness: 0.9 });
  const crownA = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 1), leafM);
  crownA.position.y = 2.0;
  const crownB = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), leafM);
  crownB.position.set(0.45, 2.5, 0.1);
  tree.add(trunk, crownA, crownB);
  tree.position.set(-4.7, 0, FRONT + 2.1);
  street.add(tree);
  const lamp = new THREE.Group();
  const poleM = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3, 10), poleM);
  pole.position.y = 1.5;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), poleM);
  arm.position.set(-0.28, 2.95, 0);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc27a, emissiveIntensity: 0 });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), bulbMat);
  bulb.position.set(-0.55, 2.82, 0);
  lamp.add(pole, arm, bulb);
  lamp.position.set(4.3, 0, FRONT + 0.45);
  lamp.rotation.y = -0.5;
  street.add(lamp);
  street.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  street.scale.setScalar(0.001);

  /* конструктор: тераса й гірлянда */
  const terrace = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.7 });
  const metalM = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.45 });
  const umbrellaMat = new THREE.MeshStandardMaterial({ color: 0xf26a1b, roughness: 0.6, side: THREE.DoubleSide });
  for (const [x, z] of [[1.7, FRONT + 1.35], [3.3, FRONT + 1.6]]) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 24), wood);
    top.position.set(x, 0.75, z);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.75, 8), metalM);
    leg.position.set(x, 0.37, z);
    terrace.add(top, leg);
    for (const dx of [-0.55, 0.55]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.36), wood);
      seat.position.set(x + dx, 0.45, z);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.36), wood);
      back.position.set(x + dx * 1.3, 0.68, z);
      const cl = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), metalM);
      cl.position.set(x + dx, 0.22, z);
      terrace.add(seat, back, cl);
    }
  }
  const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 8), metalM);
  pole2.position.set(2.5, 1.15, FRONT + 1.5);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.45, 8, 1, true), umbrellaMat);
  canopy.position.set(2.5, 2.35, FRONT + 1.5);
  terrace.add(pole2, canopy);
  terrace.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  terrace.scale.setScalar(0.001);
  scene.add(terrace);

  const garland = new THREE.Group();
  const garlandPts = [];
  const bulbMatG = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffc27a, emissiveIntensity: 0 });
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const p = new THREE.Vector3(-2.9 + 5.8 * u, 3.0 - Math.sin(u * Math.PI * 3) ** 2 * 0.22, FRONT + 0.7);
    garlandPts.push(p);
    if (i % 2 === 0) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), bulbMatG);
      b.position.copy(p).add(new THREE.Vector3(0, -0.07, 0));
      garland.add(b);
    }
  }
  garland.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(garlandPts), new THREE.LineBasicMaterial({ color: 0x2a2420 })));
  garland.scale.setScalar(0.001);
  scene.add(garland);

  /* 6. відчинено: вивіска з назвою, світло */
  const neonMat = new THREE.MeshBasicMaterial({ map: neonTexture('Ваш заклад'), transparent: true, opacity: 0 });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.55), neonMat);
  neon.position.set(0, 2.86, FRONT + 0.03);
  scene.add(neon);
  const openSign = label('ВІДЧИНЕНО', { font: '800 60px Montserrat', color: '#15110e', bg: '#f26a1b', height: 0.17, pad: 16, round: 12 });
  openSign.position.set(0, 1.62, FRONT + 0.05);
  openSign.material.opacity = 0;
  scene.add(openSign);
  const warm = new THREE.PointLight(0xffb35c, 0, 9, 2);
  warm.position.set(0, 1.6, FRONT + 1.2);
  scene.add(warm);

  /* 7. супровід: перший гість, зелень, 30 днів */
  const guest = person({ shirt: 0xf26a1b, pants: 0x2b2f3a, skin: 0xe8b996, hair: 0x6b4423 });
  guest.scale.setScalar(0);
  scene.add(guest);
  const plants = [];
  for (const x of [-0.85, 0.85]) {
    const p = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.28, 16), new THREE.MeshStandardMaterial({ color: 0x8a6a4a }));
    pot.position.y = 0.14;
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0x5f8a4a }));
    leaves.position.y = 0.62;
    p.add(pot, leaves);
    p.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    p.position.set(x, 0, FRONT + 0.35);
    p.scale.setScalar(0);
    scene.add(p);
    plants.push(p);
  }
  const badge = label('30 днів поруч', { font: '800 56px Montserrat', color: '#15110e', bg: '#f26a1b', height: 0.42, pad: 26, round: 40 });
  badge.position.set(W / 2 + 0.3, H + 0.9, FRONT);
  badge.material.opacity = 0;
  scene.add(badge);

  /* конфеті на відкритті */
  const CONF = 140;
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.15), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONF);
  const palette = [0xf26a1b, 0xffc27a, 0xe9dfcf, 0x5f8a4a, 0xe36b8a, 0x3b67a8].map((c) => new THREE.Color(c));
  const cf = Array.from({ length: CONF }, (_, i) => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), life: 0 }));
  const dummy = new THREE.Object3D();
  for (let i = 0; i < CONF; i++) {
    confetti.setColorAt(i, palette[i % palette.length]);
    dummy.scale.setScalar(0); dummy.updateMatrix(); confetti.setMatrixAt(i, dummy.matrix);
  }
  scene.add(confetti);
  function burst() {
    for (const c of cf) {
      c.p.set((Math.random() - 0.5) * 0.8, 2.4 + Math.random() * 0.4, FRONT + 0.4);
      const a = Math.random() * Math.PI * 2;
      c.v.set(Math.cos(a) * (1 + Math.random() * 2.2), 3 + Math.random() * 3, 1.2 + Math.random() * 2.4);
      c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      c.w.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
      c.life = 2.4 + Math.random() * 0.8;
    }
  }
  function stepConfetti(dt) {
    let any = false;
    cf.forEach((c, i) => {
      if (c.life > 0) {
        any = true;
        c.life -= dt;
        c.v.y -= 6 * dt;
        c.v.multiplyScalar(1 - dt * 0.9);
        c.p.addScaledVector(c.v, dt);
        if (c.p.y < 0.03) { c.p.y = 0.03; c.v.set(0, 0, 0); c.w.set(0, 0, 0); }
        c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
        dummy.position.copy(c.p); dummy.rotation.copy(c.r);
        dummy.scale.setScalar(Math.min(1, c.life * 2));
      } else dummy.scale.setScalar(0);
      dummy.updateMatrix();
      confetti.setMatrixAt(i, dummy.matrix);
    });
    if (any) confetti.instanceMatrix.needsUpdate = true;
  }

  /* постобробка: світіння неону, вікон і гірлянди */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.4, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* розмір і камера */
  function resize() {
    const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    composer.setSize(w, h);
    bloom.resolution.set(w / (WEAK || SMALL ? 3 : 2), h / (WEAK || SMALL ? 3 : 2));
    lineMat.resolution.set(w, h);
    dimMat.resolution.set(w, h);
  }
  resize();
  addEventListener('resize', resize);

  const v = [0, 0, 0, 0, 0, 0, 0, 0];
  const cfg = { build: false, terrace: false, flowers: true, garland: false };
  const ex = { terrace: 0, garland: 0, build: 0 };
  let stage = 0, prevStage = 0, running = false, raf = 0;
  const cam = { r: 16.5, h: 6.4, ty: 1.4 };
  const clock = new THREE.Clock();
  const target = new THREE.Vector3(0, 1.4, 0);

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (let k = 1; k <= 7; k++) v[k] += ((stage >= k ? 1 : 0) - v[k]) * Math.min(1, dt * 4.2);
    if (stage >= 6 && prevStage < 6) burst();
    prevStage = stage;
    stepConfetti(dt);
    const ease = Math.min(1, dt * 4);
    ex.build += ((cfg.build ? 1 : 0) - ex.build) * ease;
    ex.terrace += ((cfg.build && cfg.terrace ? 1 : 0) - ex.terrace) * ease;
    ex.garland += ((cfg.build && cfg.garland ? 1 : 0) - ex.garland) * ease;
    terrace.scale.setScalar(Math.max(0.001, ex.terrace));
    garland.scale.setScalar(Math.max(0.001, ex.garland));
    const hideDraft = 1 - ex.build;

    lineGeo.instanceCount = Math.ceil(v[1] * totalSegs);
    lineMat.color.lerpColors(new THREE.Color(BLUE), new THREE.Color(INK), v[4]);
    lineMat.opacity = (1 - v[5] * 0.6) * hideDraft;

    walkers.forEach((f) => {
      const u = f.userData;
      u.x += u.speed * u.dir * dt;
      if (u.x > 8) u.x = -8; if (u.x < -8) u.x = 8;
      const phase = t * u.speed * 7 + u.z * 3;
      stride(f, phase, 1);
      f.position.set(u.x, Math.abs(Math.sin(phase)) * 0.03, u.z);
      f.rotation.y = u.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      f.scale.setScalar(v[2] * (1 - v[7] * 0.5));
    });
    formatTag.material.opacity = v[2] * (1 - v[6]) * hideDraft;
    formatTag.position.y = H + 1.1 + Math.sin(t * 1.6) * 0.08;

    dimMat.opacity = v[3] * (1 - v[6] * 0.7) * hideDraft;
    for (const l of dimLabels) l.material.opacity = v[3] * (1 - v[6] * 0.8) * hideDraft;

    pad.material.opacity = v[4] * 0.8;

    walls.scale.y = Math.max(0.001, v[5]);
    const show = Math.max(0, (v[5] - 0.6) / 0.4);
    glassMat.opacity = doorMat.opacity = frameMat.opacity = awningMat.opacity = brassMat.opacity = boxMat.opacity = show;
    for (const m of bloomMats) m.opacity = show;
    for (const m of streetMats) m.opacity = show;
    grid.material.opacity = 0.45 * (1 - show * 0.85);
    street.scale.setScalar(Math.max(0.001, show));

    const flick = stage >= 6 && v[6] < 0.7 ? (Math.sin(t * 50) > 0 ? 1 : 0.3) : 1;
    glassMat.color.setScalar(0.25 + v[6] * 1.05 * flick);
    bulbMat.emissiveIntensity = v[6] * 2.4 * flick;
    bulbMatG.emissiveIntensity = v[6] * 3 * flick;
    doorMat.emissiveIntensity = v[6] * 0.6 * flick;
    warm.intensity = v[6] * 14 * flick;
    neonMat.opacity = v[6];
    openSign.material.opacity = v[6];

    const walk = v[7];
    // гість іде до дверей і зупиняється збоку, щоб не закривати табличку
    guest.scale.setScalar(walk > 0.01 ? 1 : 0);
    const moving = walk < 0.97 ? 1 : 0;
    stride(guest, t * 7, moving);
    guest.position.set(-4.4 + 3.1 * walk, Math.abs(Math.sin(t * 7)) * 0.03 * moving, FRONT + 1.9 - 1.15 * walk);
    guest.rotation.y = moving ? Math.PI / 2 + 0.35 : Math.PI - 0.5;
    for (const p of plants) p.scale.setScalar(Math.max(0.001, v[7] * (cfg.build && !cfg.flowers ? 0 : 1)));
    badge.material.opacity = v[7] * hideDraft;
    badge.position.y = H + 0.9 + Math.sin(t * 2) * 0.06;

    // камера повільно оглядає макет
    const portrait = camera.aspect < 1;
    // на кресленні камера далі, до відкриття під'їжджає до фасаду
    const close = cfg.build ? 0.6 : Math.max(0, Math.min(1, (v[5] + v[6] + v[7]) / 3));
    const goal = { r: (portrait ? 21 : 16.5) - close * (portrait ? 3 : 3), h: 6.6 - close * 1.8, ty: 1.4 + close * 0.1 };
    const k = Math.min(1, dt * 1.6);
    cam.r += (goal.r - cam.r) * k; cam.h += (goal.h - cam.h) * k; cam.ty += (goal.ty - cam.ty) * k;
    const az = 0.5 + Math.sin(t * 0.22) * 0.34;
    camera.position.set(Math.sin(az) * cam.r, cam.h, Math.cos(az) * cam.r);
    target.y = cam.ty;
    camera.lookAt(target);
    composer.render();
  }

  return {
    setStage(n) { stage = n; },
    setBuild(on) { cfg.build = on; },
    setFacade(kind) {
      const m = wallMesh.material;
      m.map = kind === 'brick' ? brickMap : null;
      m.color.set(kind === 'plaster' ? 0xe9dfcf : kind === 'dark' ? 0x34302c : 0xffffff);
      m.needsUpdate = true;
    },
    setAwning(color) { awningMat.color.set(color); umbrellaMat.color.set(color); },
    setExtras({ terrace: t, flowers, garland: gl }) { cfg.terrace = t; cfg.flowers = flowers; cfg.garland = gl; },
    setFormat(format) { glassMat.map?.dispose(); glassMat.map = interiorTexture(format); glassMat.needsUpdate = true; },
    setName(name) { neonMat.map?.dispose(); neonMat.map = neonTexture(name || 'Ваш заклад'); neonMat.needsUpdate = true; },
    start() { if (running) return; running = true; clock.getDelta(); frame(); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
