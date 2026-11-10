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

function interiorTexture() {
  const [c, g] = canvas(512, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#5a3418'); gr.addColorStop(0.55, '#c98545'); gr.addColorStop(1, '#3a2010');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3; i++) {
    const x = 100 + i * 156, y = 120;
    const rg = g.createRadialGradient(x, y, 0, x, y, 90);
    rg.addColorStop(0, 'rgba(255,240,210,1)'); rg.addColorStop(0.25, 'rgba(255,190,110,.75)'); rg.addColorStop(1, 'rgba(255,160,80,0)');
    g.fillStyle = rg; g.fillRect(x - 90, y - 90, 180, 180);
    g.fillStyle = 'rgba(30,18,10,.7)'; g.fillRect(x - 1, 0, 2, y - 12);
  }
  g.fillStyle = 'rgba(28,16,8,.92)'; g.fillRect(0, 360, 512, 152);
  g.fillStyle = 'rgba(255,205,140,.6)'; g.fillRect(0, 360, 512, 5);
  g.fillStyle = 'rgba(240,232,216,.9)';
  for (let i = 0; i < 7; i++) g.fillRect(60 + i * 58, 320, 22, 40);
  return tex(c);
}

export async function createBuild3D(canvasEl) {
  await Promise.all([
    document.fonts.load('600 64px Montserrat', 'вкладення окупність'),
    document.fonts.load('800 60px Montserrat', 'ВІДЧИНЕНО 30 днів поруч'),
    document.fonts.load('400 100px "Marck Script"', 'Ваш заклад формат'),
  ]).catch(() => {});

  const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc2ad, 1.7));
  const sun = new THREE.DirectionalLight(0xfff4e6, 1.6);
  sun.position.set(6, 10, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
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
  const wallMesh = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: brickTexture(), roughness: 0.9 }));
  wallMesh.castShadow = true;
  walls.add(wallMesh);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 0.3, D + 0.4), new THREE.MeshStandardMaterial({ color: 0xf1e8d8, roughness: 0.8 }));
  roof.position.y = H + 0.15;
  roof.castShadow = true;
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
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), frameMat);
    fr.position.set(x, y, FRONT + 0.03);
    facade.add(fr);
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
      const phase = t * u.speed * 7 + u.z * 3;
      stride(f, phase, 1);
      f.position.set(u.x, Math.abs(Math.sin(phase)) * 0.03, u.z);
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
    street.scale.setScalar(Math.max(0.001, show));

    const flick = stage >= 6 && v[6] < 0.7 ? (Math.sin(t * 50) > 0 ? 1 : 0.3) : 1;
    glassMat.color.setScalar(0.25 + v[6] * 1.05 * flick);
    bulbMat.emissiveIntensity = v[6] * 2.4 * flick;
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
    for (const p of plants) p.scale.setScalar(v[7]);
    badge.material.opacity = v[7];
    badge.position.y = H + 0.9 + Math.sin(t * 2) * 0.06;

    // камера повільно оглядає макет
    const portrait = camera.aspect < 1;
    const az = 0.55 + Math.sin(t * 0.22) * 0.38;
    const r = portrait ? 21 : 16.5;
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
