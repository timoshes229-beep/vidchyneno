import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

// «Як ми працюємо» у 3D: заклад будується на макеті з кожним етапом
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

function figure(color) {
  const f = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.5, 4, 10), mat);
  body.position.y = 0.45;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mat);
  head.position.y = 1.0;
  f.add(body, head);
  return f;
}

export async function createBuild3D(canvasEl) {
  await Promise.all([
    document.fonts.load('600 64px Montserrat', 'вкладення окупність'),
    document.fonts.load('400 100px "Marck Script"', 'Ваш заклад формат'),
  ]).catch(() => {});

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc2ad, 1.7));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.6);
  sun.position.set(6, 10, 8);
  scene.add(sun);

  // макет: аркуш з сіткою
  const grid = new THREE.GridHelper(18, 18, 0xb7c4d8, 0xd3dbe7);
  grid.material.transparent = true; grid.material.opacity = 0.45;
  scene.add(grid);

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
    const f = figure(i % 3 === 0 ? 0xf26a1b : 0x3a3530);
    f.userData = { speed: 0.6 + Math.random() * 0.6, dir: i % 2 ? 1 : -1, z: FRONT + 1.4 + (i % 3) * 0.55, x: -7 + i * 2.4 };
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
  const wallMesh = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: brickTexture(), roughness: 0.9 }));
  walls.add(wallMesh);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.3, D + 0.4), new THREE.MeshStandardMaterial({ color: 0xf1e8d8, roughness: 0.8 }));
  roof.position.y = H + 0.15;
  walls.add(roof);
  walls.scale.y = 0.001;

  const facade = new THREE.Group();
  scene.add(facade);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, emissive: 0xffb35c, emissiveIntensity: 0, roughness: 0.3, transparent: true, opacity: 0 });
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
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), frameMat);
    fr.position.set(x, y, FRONT + 0.03);
    facade.add(fr);
  }
  const awningMat = new THREE.MeshStandardMaterial({ color: 0xf26a1b, roughness: 0.6, transparent: true, opacity: 0 });
  for (const x of [-1.8, 1.8]) {
    const aw = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.6), awningMat);
    aw.position.set(x, 2.62, FRONT + 0.3);
    aw.rotation.x = 0.35;
    facade.add(aw);
  }

  /* 6. відчинено: вивіска з назвою, світло */
  const neonMat = new THREE.MeshBasicMaterial({ map: neonTexture('Ваш заклад'), transparent: true, opacity: 0 });
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.55), neonMat);
  neon.position.set(0, 2.86, FRONT + 0.03);
  scene.add(neon);
  const openSign = label('ВІДЧИНЕНО', { font: '800 60px Montserrat', color: '#15110e', bg: '#f26a1b', height: 0.26, pad: 18, round: 14 });
  openSign.position.set(0, 1.55, FRONT + 0.08);
  openSign.material.opacity = 0;
  scene.add(openSign);
  const warm = new THREE.PointLight(0xffb35c, 0, 9, 2);
  warm.position.set(0, 1.6, FRONT + 1.2);
  scene.add(warm);

  /* 7. супровід: перший гість, зелень, 30 днів */
  const guest = figure(0xf26a1b);
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
    p.position.set(x, 0, FRONT + 0.35);
    p.scale.setScalar(0);
    scene.add(p);
    plants.push(p);
  }
  const badge = label('30 днів поруч', { font: '800 56px Montserrat', color: '#15110e', bg: '#f26a1b', height: 0.42, pad: 26, round: 40 });
  badge.position.set(W / 2 + 0.3, H + 0.9, FRONT);
  badge.material.opacity = 0;
  scene.add(badge);

  /* розмір і камера */
  function resize() {
    const w = canvasEl.clientWidth, h = canvasEl.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    lineMat.resolution.set(w, h);
    dimMat.resolution.set(w, h);
  }
  resize();
  addEventListener('resize', resize);

  const v = [0, 0, 0, 0, 0, 0, 0, 0];
  let stage = 0, running = false, raf = 0;
  const clock = new THREE.Clock();
  const target = new THREE.Vector3(0, 1.4, 0);

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    for (let k = 1; k <= 7; k++) v[k] += ((stage >= k ? 1 : 0) - v[k]) * Math.min(1, dt * 2.6);

    lineGeo.instanceCount = Math.ceil(v[1] * totalSegs);
    lineMat.color.lerpColors(new THREE.Color(BLUE), new THREE.Color(INK), v[4]);
    lineMat.opacity = 1 - v[5] * 0.6;

    walkers.forEach((f) => {
      const u = f.userData;
      u.x += u.speed * u.dir * dt;
      if (u.x > 8) u.x = -8; if (u.x < -8) u.x = 8;
      f.position.set(u.x, Math.abs(Math.sin(t * 6 + u.speed * 10)) * 0.04, u.z);
      f.rotation.y = u.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      f.scale.setScalar(v[2] * (1 - v[7] * 0.5));
    });
    formatTag.material.opacity = v[2] * (1 - v[6]);
    formatTag.position.y = H + 1.1 + Math.sin(t * 1.6) * 0.08;

    dimMat.opacity = v[3] * (1 - v[6] * 0.7);
    for (const l of dimLabels) l.material.opacity = v[3] * (1 - v[6] * 0.8);

    pad.material.opacity = v[4] * 0.8;

    walls.scale.y = Math.max(0.001, v[5]);
    const show = Math.max(0, (v[5] - 0.6) / 0.4);
    glassMat.opacity = doorMat.opacity = frameMat.opacity = awningMat.opacity = show;

    const flick = stage >= 6 && v[6] < 0.7 ? (Math.sin(t * 50) > 0 ? 1 : 0.3) : 1;
    glassMat.emissiveIntensity = v[6] * 1.5 * flick;
    doorMat.emissiveIntensity = v[6] * 0.6 * flick;
    warm.intensity = v[6] * 14 * flick;
    neonMat.opacity = v[6];
    openSign.material.opacity = v[6];

    const walk = v[7];
    guest.scale.setScalar(walk > 0.01 ? 1 : 0);
    guest.position.set(3.6 * (1 - walk), Math.abs(Math.sin(t * 6)) * 0.04 * (1 - walk), FRONT + 0.6 + 0.9 * (1 - walk));
    guest.rotation.y = -Math.PI / 2 + walk * (Math.PI / 2 - 0.2);
    for (const p of plants) p.scale.setScalar(v[7]);
    badge.material.opacity = v[7];
    badge.position.y = H + 0.9 + Math.sin(t * 2) * 0.06;

    // камера повільно оглядає макет
    const portrait = camera.aspect < 1;
    const az = 0.55 + Math.sin(t * 0.22) * 0.38;
    const r = portrait ? 19 : 15;
    camera.position.set(Math.sin(az) * r, 6.2, Math.cos(az) * r);
    camera.lookAt(target);
    renderer.render(scene, camera);
  }

  return {
    setStage(n) { stage = n; },
    setName(name) { neonMat.map?.dispose(); neonMat.map = neonTexture(name || 'Ваш заклад'); neonMat.needsUpdate = true; },
    start() { if (running) return; running = true; clock.getDelta(); frame(); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
