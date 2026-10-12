import * as THREE from '../lib/three.module.min.js';
import { buildCharacter, poseCharacter, disposeObject, DEFAULT_CHAR, CHAR_SCHEMA, randomChar } from './character.js';
import { buildGun, computeStats, statBars, DEFAULT_GUN, GUN_SCHEMA, GUN_PRESETS, RECEIVERS, PARTS, randomGun } from './gun.js';
import { buildPanel, renderStats } from './ui.js';
import { Input } from './input.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- renderer
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let W = innerWidth, H = innerHeight;

// ---------------------------------------------------------------- persistence
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};
let charCfg = { ...DEFAULT_CHAR, ...store.get('rr_char', {}) };
let gunCfg = { ...DEFAULT_GUN, ...store.get('rr_gun', {}) };
let best = store.get('rr_best', 0);

// ---------------------------------------------------------------- shared textures
function gradientTex(stops) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
  const x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([p, c]) => g.addColorStop(p, c));
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const skyTex = gradientTex([[0, '#1a1233'], [0.42, '#5e2a6e'], [0.72, '#d6566c'], [1, '#ffb066']]);
const studioTex = gradientTex([[0, '#20163a'], [0.6, '#3b2558'], [1, '#6a3466']]);

function windowTextures() {
  const mk = () => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; return c; };
  const a = mk(), e = mk(), xa = a.getContext('2d'), xe = e.getContext('2d');
  xa.fillStyle = '#8a8a96'; xa.fillRect(0, 0, 64, 128);
  xe.fillStyle = '#000'; xe.fillRect(0, 0, 64, 128);
  for (let cx = 0; cx < 4; cx++) for (let cy = 0; cy < 8; cy++) {
    const lit = Math.random() < 0.35, col = ['#ffd27a', '#ffb35c', '#fff0c0', '#9fd8ff'][Math.floor(Math.random() * 4)];
    xa.fillStyle = lit ? col : '#2a2a36'; xa.fillRect(cx * 16 + 4, cy * 16 + 4, 8, 9);
    if (lit) { xe.fillStyle = col; xe.fillRect(cx * 16 + 4, cy * 16 + 4, 8, 9); }
  }
  const t1 = new THREE.CanvasTexture(a), t2 = new THREE.CanvasTexture(e);
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; }
  return [t1, t2];
}
const [winMap, winEmit] = windowTextures();

function crateTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#b5773e'; x.fillRect(0, 0, 64, 64);
  x.strokeStyle = '#6e4220'; x.lineWidth = 6; x.strokeRect(3, 3, 58, 58);
  x.beginPath(); x.moveTo(6, 6); x.lineTo(58, 58); x.moveTo(58, 6); x.lineTo(6, 58); x.stroke();
  x.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 6; i++) x.fillRect(0, i * 11, 64, 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,230,160,.9)'); g.addColorStop(1, 'rgba(255,140,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const flareTex = glowTex();

function uvBox(w, h, d, us, vs) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * us, uv.getY(i) * vs);
  return g;
}

// ================================================================ PREVIEW (menus / customiser)
const pv = {
  scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, 1, 0.05, 100),
  turn: new THREE.Group(), gunStand: new THREE.Group(),
  rot: -0.45, vel: 0, char: null, gun: null, gunView: null, dirty: true,
  focus: new THREE.Vector3(0, 1, 0), dist: 4.4,
};
pv.scene.background = studioTex;
pv.scene.add(new THREE.HemisphereLight('#ffe2c4', '#2a1a40', 1.4));
{
  const d = new THREE.DirectionalLight('#fff1e0', 2.2); d.position.set(3, 6, 5); d.castShadow = true;
  d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 });
  pv.scene.add(d);
  const rim = new THREE.DirectionalLight('#ff7a4a', 1.3); rim.position.set(-4, 3, -4); pv.scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.12, 40), new THREE.MeshStandardMaterial({ color: '#2d2046', roughness: 0.9 }));
  floor.position.y = -0.06; floor.receiveShadow = true; pv.scene.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.02, 6, 60), new THREE.MeshBasicMaterial({ color: '#ff8a2a' }));
  ring.rotation.x = Math.PI / 2; pv.scene.add(ring);
}
pv.scene.add(pv.turn, pv.gunStand);

function rebuildPreview() {
  if (pv.char) { pv.turn.remove(pv.char.root); disposeObject(pv.char.root); }
  if (pv.gunView) { pv.gunStand.remove(pv.gunView.group); disposeObject(pv.gunView.group); }
  pv.char = buildCharacter(charCfg);
  pv.gun = buildGun(gunCfg);
  pv.gun.group.rotation.x = Math.PI / 2;
  pv.char.hand.add(pv.gun.group);
  pv.turn.add(pv.char.root);
  pv.gunView = buildGun(gunCfg);
  pv.gunView.group.position.copy(pv.gunView.center).multiplyScalar(-1);
  pv.gunStand.add(pv.gunView.group);
  pv.dirty = false;
}

let previewMode = 'menu';
function previewLayout() {
  const c = pv.cam; c.aspect = W / H;
  const land = W >= H;
  c.clearViewOffset();
  if (previewMode === 'char' || previewMode === 'gun') {
    if (land) c.setViewOffset(W, H, Math.min(W * 0.46, 440) / 2, 0, W, H);
    else c.setViewOffset(W, H, 0, H * 0.24, W, H);
  } else if (land) c.setViewOffset(W, H, -W * 0.2, 0, W, H);
  else c.setViewOffset(W, H, 0, H * 0.06, W, H);
  c.updateProjectionMatrix();
}

function updatePreview(dt, t) {
  if (pv.dirty) rebuildPreview();
  const gunMode = previewMode === 'gun';
  pv.turn.visible = !gunMode; pv.gunStand.visible = gunMode;
  if (!dragging) {
    pv.rot += pv.vel * dt; pv.vel = damp(pv.vel, previewMode === 'menu' ? 0.35 : 0, 2, dt);
  }
  const land = W >= H;
  const h = pv.char.height;
  let focus, dist;
  if (gunMode) {
    pv.gunStand.position.set(0, 1.0, 0);
    pv.gunStand.rotation.set(0.12, pv.rot + Math.PI / 2 + 0.45, 0);
    const frac = land ? 1 - Math.min(W * 0.46, 440) / W : 1;
    const aspect = W / H;
    const L = pv.gunView.length + 0.1;
    dist = clamp(L * 1.25 / (0.63 * aspect * frac), 0.9, 6);
    if (!land) dist = Math.max(dist, L * 1.25 / (0.63 * aspect));
    focus = new THREE.Vector3(0, 1.0, 0);
  } else {
    pv.turn.rotation.y = pv.rot;
    poseCharacter(pv.char, { t, aim: previewMode === 'menu' ? -0.35 : -0.15, speed: 0 });
    focus = new THREE.Vector3(0, h * 0.52, 0);
    dist = land ? (previewMode === 'menu' ? 4.6 : 4.0) * (h / 1.9) + 0.6 : (previewMode === 'menu' ? 8.5 : 9.5) * (h / 1.9);
  }
  pv.focus.lerp(focus, 1 - Math.exp(-8 * dt));
  pv.dist = damp(pv.dist, dist, 8, dt);
  pv.cam.position.set(pv.focus.x, pv.focus.y + pv.dist * 0.16, pv.focus.z + pv.dist);
  pv.cam.lookAt(pv.focus);
}

// drag-to-rotate in menus
let dragging = false, dragX = 0;
canvas.addEventListener('pointerdown', e => { if (state === 'play') return; dragging = true; dragX = e.clientX; pv.vel = 0; });
addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - dragX; dragX = e.clientX; pv.rot += dx * 0.012; pv.vel = dx * 0.6; });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointercancel', () => { dragging = false; });

// ================================================================ GAME WORLD
const G = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(42, 1, 0.1, 400) };
G.scene.background = skyTex;
G.scene.fog = new THREE.Fog('#b94c6c', 28, 120);
const hemi = new THREE.HemisphereLight('#ffd7b0', '#3b2650', 1.25); G.scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffe0bd', 2.1); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 10, bottom: -8, near: 1, far: 70 });
sun.shadow.bias = -0.0008;
G.scene.add(sun, sun.target);
const rimLight = new THREE.DirectionalLight('#ff7a4a', 0.9); rimLight.position.set(10, 6, -12); G.scene.add(rimLight);
const flashLight = new THREE.PointLight('#ffb050', 0, 14, 1.5); G.scene.add(flashLight);
const muzzleLight = new THREE.PointLight('#ffd080', 0, 8, 1.5); G.scene.add(muzzleLight);
const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(10, 40), new THREE.MeshBasicMaterial({ color: '#ffd59a', fog: false }));
G.scene.add(sunDisc);

const world = new THREE.Group(); G.scene.add(world);

// shared geometry & materials
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  bullet: new THREE.BoxGeometry(0.6, 0.06, 0.06),
  orb: new THREE.IcosahedronGeometry(0.13, 1),
  coin: new THREE.CylinderGeometry(0.26, 0.26, 0.07, 14),
  rotor: new THREE.CylinderGeometry(0.22, 0.22, 0.02, 10),
  nade: new THREE.IcosahedronGeometry(0.12, 0),
};
GEO.coin.rotateX(Math.PI / 2);
const MAT = {
  roofTop: new THREE.MeshStandardMaterial({ color: '#9a8aa8', roughness: 0.9, flatShading: true }),
  roofEdge: new THREE.MeshStandardMaterial({ color: '#c9b9c9', roughness: 0.8 }),
  scaffold: new THREE.MeshStandardMaterial({ color: '#5a6072', roughness: 0.5, metalness: 0.6 }),
  stripe: new THREE.MeshStandardMaterial({ color: '#ffcc33', roughness: 0.6, emissive: '#ff9900', emissiveIntensity: 0.15 }),
  pole: new THREE.MeshStandardMaterial({ color: '#3a3d4a', roughness: 0.6, metalness: 0.5 }),
  crate: new THREE.MeshStandardMaterial({ map: crateTex(), roughness: 0.85 }),
  decor: new THREE.MeshStandardMaterial({ color: '#6c6478', roughness: 0.8, flatShading: true }),
  decorDark: new THREE.MeshStandardMaterial({ color: '#3d3448', roughness: 0.8 }),
  enemy: new THREE.MeshStandardMaterial({ color: '#2c2f3a', roughness: 0.5, metalness: 0.5, flatShading: true }),
  enemyHeavy: new THREE.MeshStandardMaterial({ color: '#6a2c2c', roughness: 0.5, metalness: 0.5, flatShading: true }),
  enemyTrim: new THREE.MeshStandardMaterial({ color: '#ff8a2a', roughness: 0.5 }),
  eye: new THREE.MeshBasicMaterial({ color: '#ff2a3a' }),
  flash: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  enemyShot: new THREE.MeshBasicMaterial({ color: '#ff3355' }),
  coin: new THREE.MeshStandardMaterial({ color: '#ffcc33', metalness: 0.9, roughness: 0.25, emissive: '#aa6600', emissiveIntensity: 0.4 }),
  health: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff3355', emissiveIntensity: 0.6 }),
  nade: new THREE.MeshStandardMaterial({ color: '#55602f', roughness: 0.6 }),
  laser: new THREE.LineBasicMaterial({ color: '#ff2020', transparent: true, opacity: 0.75 }),
};

// ---------------- background city
const bgLayers = [
  { z: -16, col: '#3b2a52', minH: -6, maxH: 3, minW: 3, maxW: 7, win: true, items: [], next: -100 },
  { z: -36, col: '#4c2d5e', minH: -2, maxH: 12, minW: 4, maxW: 9, win: true, items: [], next: -140 },
  { z: -70, col: '#7a3d70', minH: 4, maxH: 30, minW: 6, maxW: 14, win: false, items: [], next: -200 },
];
for (const L of bgLayers) {
  L.mat = L.win
    ? new THREE.MeshStandardMaterial({ color: L.col, map: winMap, emissive: '#ffffff', emissiveMap: winEmit, emissiveIntensity: 0.45, roughness: 0.9 })
    : new THREE.MeshStandardMaterial({ color: L.col, roughness: 1 });
}
const bgGroup = new THREE.Group(); G.scene.add(bgGroup);
function updateBackground(camX) {
  for (const L of bgLayers) {
    const span = 120 + -L.z * 1.6;
    while (L.next < camX + span) {
      const w = rand(L.minW, L.maxW), h = rand(L.minH, L.maxH), d = rand(4, 8);
      const m = new THREE.Mesh(uvBox(w, h + 40, d, w / 4, (h + 40) / 8), L.mat);
      m.position.set(L.next + w / 2, (h - 40) / 2, L.z + rand(-2, 2));
      if (L.z > -20) m.receiveShadow = true;
      bgGroup.add(m); L.items.push(m);
      if (Math.random() < 0.3) { // rooftop antenna / water tank
        const a = new THREE.Mesh(GEO.box, MAT.decorDark);
        if (Math.random() < 0.5) { a.scale.set(0.15, rand(1.5, 4), 0.15); } else { a.scale.set(1.4, 1.2, 1.4); }
        a.position.set(m.position.x + rand(-w / 3, w / 3), h + a.scale.y / 2, m.position.z);
        m.userData.extra = a; bgGroup.add(a);
      }
      L.next += w + rand(0.3, L.win ? 2.5 : 1);
    }
    while (L.items.length && L.items[0].position.x < camX - span) {
      const m = L.items.shift(); bgGroup.remove(m); m.geometry.dispose();
      if (m.userData.extra) bgGroup.remove(m.userData.extra);
    }
  }
}
function resetBackground() {
  for (const L of bgLayers) { for (const m of L.items) { bgGroup.remove(m); m.geometry.dispose(); if (m.userData.extra) bgGroup.remove(m.userData.extra); } L.items = []; L.next = -150; }
}

// ---------------- level state
let platforms = [], enemies = [], bullets = [], enemyShots = [], particles = [], pickups = [], nades = [];
let genX = 0, groundTop = 0;
const P = { x: 0, y: 0, vx: 0, vy: 0, w: 0.6, h: 1.8 };
let char = null, gun = null, stats = null, playerRoot = null, mirror = null, laserLine = null, muzzleFlash = null;
let kills = 0, coins = 0, maxX = 0, shake = 0, time = 0;
let camX = 0, camY = 2, camLook = 2;

function addMesh(m) { world.add(m); return m; }
function addGround(x0, x1, top) {
  const L = x1 - x0, depth = 6;
  const g = new THREE.Group();
  const body = new THREE.Mesh(uvBox(L, top + 40, depth, L / 4, (top + 40) / 8), bgLayers[0].mat);
  body.position.set(0, (top - 40) / 2 - 0.2, 0); body.receiveShadow = true; g.add(body);
  const cap = new THREE.Mesh(GEO.box, MAT.roofTop); cap.scale.set(L + 0.3, 0.4, depth + 0.3); cap.position.y = top - 0.2; cap.receiveShadow = true; g.add(cap);
  const lip = new THREE.Mesh(GEO.box, MAT.roofEdge); lip.scale.set(L + 0.4, 0.18, 0.25); lip.position.set(0, top + 0.02, depth / 2 + 0.05); g.add(lip);
  // rooftop props behind the play lane
  const n = Math.floor(L / 6);
  for (let i = 0; i < n; i++) {
    const d = new THREE.Mesh(GEO.box, Math.random() < 0.5 ? MAT.decor : MAT.decorDark);
    const kind = Math.random();
    if (kind < 0.4) d.scale.set(rand(1.2, 2.2), rand(0.8, 1.4), 1.2);      // AC unit
    else if (kind < 0.7) d.scale.set(0.5, rand(0.8, 1.8), 0.5);            // vent
    else d.scale.set(0.12, rand(2, 4), 0.12);                              // antenna
    d.position.set(-L / 2 + (i + 0.5) * (L / n) + rand(-1, 1), top + d.scale.y / 2, -2.2 + rand(-0.5, 0.3));
    d.castShadow = true; d.receiveShadow = true; g.add(d);
  }
  g.position.x = x0 + L / 2;
  addMesh(g);
  g.userData.own = [body.geometry];
  platforms.push({ x0, x1, y0: -60, y1: top, mesh: g, solid: true });
}
function addScaffold(x0, x1, top, groundY) {
  const L = x1 - x0, g = new THREE.Group();
  const deck = new THREE.Mesh(GEO.box, MAT.scaffold); deck.scale.set(L, 0.35, 2.6); deck.position.y = top - 0.175; deck.castShadow = deck.receiveShadow = true; g.add(deck);
  const st = new THREE.Mesh(GEO.box, MAT.stripe); st.scale.set(L, 0.1, 0.04); st.position.set(0, top - 0.12, 1.32); g.add(st);
  const ph = top - groundY - 0.35;
  if (ph > 0.2) for (const sx of [-1, 1]) {
    const p = new THREE.Mesh(GEO.box, MAT.pole); p.scale.set(0.14, ph, 0.14); p.position.set(sx * (L / 2 - 0.3), groundY + ph / 2, -1); p.castShadow = true; g.add(p);
  }
  g.position.x = x0 + L / 2; addMesh(g);
  platforms.push({ x0, x1, y0: top - 0.35, y1: top, mesh: g, oneWay: true });
}
function addCrate(x, y, s = 1) {
  const m = new THREE.Mesh(GEO.box, MAT.crate); m.scale.set(s, s, s); m.position.set(x, y + s / 2, rand(-0.2, 0.2));
  m.castShadow = m.receiveShadow = true; addMesh(m);
  platforms.push({ x0: x - s / 2, x1: x + s / 2, y0: y, y1: y + s, mesh: m, solid: true, crate: { hp: 45 * s } });
}
function addCoin(x, y) {
  const m = new THREE.Mesh(GEO.coin, MAT.coin); m.position.set(x, y, 0); m.castShadow = true; addMesh(m);
  pickups.push({ kind: 'coin', x, y, mesh: m });
}
function addHealth(x, y) {
  const g = new THREE.Group();
  const a = new THREE.Mesh(GEO.box, MAT.health); a.scale.set(0.5, 0.16, 0.16); g.add(a);
  const b = new THREE.Mesh(GEO.box, MAT.health); b.scale.set(0.16, 0.5, 0.16); g.add(b);
  g.position.set(x, y, 0); addMesh(g);
  pickups.push({ kind: 'health', x, y, mesh: g });
}

// ---------------- enemies
function makeWalker(heavy) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const bm = heavy ? MAT.enemyHeavy : MAT.enemy, parts = [];
  const part = (sx, sy, sz, x, y, z, m = bm, parent = inner) => { const o = new THREE.Mesh(GEO.box, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; parent.add(o); if (m === bm) parts.push(o); return o; };
  part(0.62, 0.62, 0.55, 0, 0.95, 0);
  part(0.66, 0.1, 0.58, 0, 0.7, 0, MAT.enemyTrim);
  part(0.46, 0.34, 0.46, 0, 1.45, 0);
  part(0.04, 0.09, 0.36, 0.24, 1.47, 0, MAT.eye);
  const legs = [];
  for (const z of [-0.16, 0.16]) {
    const pv = new THREE.Group(); pv.position.set(0, 0.65, z); inner.add(pv);
    part(0.18, 0.62, 0.18, 0, -0.31, 0, bm, pv); part(0.28, 0.08, 0.22, 0.05, -0.62, 0, MAT.enemyTrim, pv);
    legs.push(pv);
  }
  part(0.5, 0.12, 0.12, 0.4, 1.0, 0.33);
  part(0.08, 0.08, 0.08, 0.67, 1.0, 0.33, MAT.eye);
  if (heavy) { part(0.7, 0.2, 0.7, 0, 1.68, 0); inner.scale.setScalar(1.35); }
  return { g, inner, legs, parts };
}
function makeDrone() {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const parts = [], rotors = [];
  const part = (sx, sy, sz, x, y, z, m = MAT.enemy) => { const o = new THREE.Mesh(GEO.box, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); o.castShadow = true; inner.add(o); if (m === MAT.enemy) parts.push(o); return o; };
  part(0.6, 0.28, 0.6, 0, 0, 0);
  part(0.04, 0.08, 0.3, 0.31, 0, 0, MAT.eye);
  part(0.95, 0.06, 0.08, 0, 0.12, 0, MAT.enemyTrim); part(0.08, 0.06, 0.95, 0, 0.12, 0, MAT.enemyTrim);
  part(0.3, 0.08, 0.08, 0.25, -0.18, 0);
  for (const [x, z] of [[-0.45, 0], [0.45, 0], [0, -0.45], [0, 0.45]]) {
    const r = new THREE.Mesh(GEO.rotor, MAT.decorDark); r.position.set(x, 0.18, z); inner.add(r); rotors.push(r);
  }
  return { g, inner, parts, rotors };
}
function spawnEnemy(type, x, y, bounds) {
  const d = Math.max(0, x);
  let e;
  if (type === 'drone') {
    const m = makeDrone();
    e = { type, x, y, baseY: y, w: 0.8, h: 0.5, hp: 30 + d * 0.04, ...m, cd: rand(1, 2.5), t: rand(0, 6) };
  } else {
    const heavy = type === 'heavy', m = makeWalker(heavy);
    const s = heavy ? 1.35 : 1;
    e = { type, x, y, w: 0.65 * s, h: 1.65 * s, hp: (heavy ? 160 : 40) + d * (heavy ? 0.12 : 0.05), ...m, cd: rand(0.8, 2), dir: Math.random() < 0.5 ? -1 : 1, x0: bounds[0], x1: bounds[1], phase: 0 };
  }
  e.maxHp = e.hp; e.facing = -1; e.alive = true; e.flash = 0; e.burn = 0; e.burnTick = 0; e.slow = 0;
  e.g.position.set(x, y, 0); addMesh(e.g);
  enemies.push(e);
}

// ---------------- generation
function genChunk() {
  const d = genX;
  if (d > 30 && Math.random() < Math.min(0.5, 0.22 + d / 2500)) genX += rand(1.8, Math.min(3.4, 2.2 + d / 600));
  if (d > 30 && Math.random() < 0.45) groundTop = clamp(groundTop + [-1.5, -1, 1, 1.25][Math.floor(Math.random() * 4)], -2, 2.5);
  const L = d < 0 ? 55 : rand(10, 20);
  const x0 = genX, x1 = genX + L;
  addGround(x0, x1, groundTop);
  if (x0 > 10) {
    const diff = Math.min(1, x0 / 900);
    // scaffolds
    const np = Math.floor(rand(0, 2.6));
    const plats = [];
    for (let i = 0; i < np; i++) {
      const pw = rand(2.6, 5), px = rand(x0 + 1, x1 - pw - 1), py = groundTop + rand(2.0, 2.4);
      if (plats.some(p => px < p[1] + 1 && px + pw > p[0] - 1)) continue;
      addScaffold(px, px + pw, py, groundTop); plats.push([px, px + pw, py]);
      if (Math.random() < 0.3) { const qw = rand(2.4, 3.6), qx = px + rand(-0.5, pw - qw + 0.5); addScaffold(qx, qx + qw, py + 2.2, py); plats.push([qx, qx + qw, py + 2.2]); }
    }
    // crates
    const nc = Math.floor(rand(0, 2.4));
    for (let i = 0; i < nc; i++) {
      const cx = rand(x0 + 1.5, x1 - 1.5);
      if (plats.some(p => cx > p[0] - 0.8 && cx < p[1] + 0.8)) continue;
      addCrate(cx, groundTop); if (Math.random() < 0.25) addCrate(cx + rand(-0.15, 0.15), groundTop + 1, 0.8);
    }
    // enemies
    if (x0 > 22) {
      const ne = Math.floor(rand(1, 2 + diff * 2.5));
      for (let i = 0; i < ne; i++) {
        const r = Math.random();
        if (r < 0.25 && plats.length) { const p = plats[Math.floor(Math.random() * plats.length)]; spawnEnemy('walker', rand(p[0] + 0.7, p[1] - 0.7), p[2], [p[0] + 0.5, p[1] - 0.5]); }
        else if (r < 0.25 + 0.25 * Math.min(1, x0 / 150)) spawnEnemy('drone', rand(x0 + 2, x1), groundTop + rand(3.2, 5));
        else if (x0 > 250 && Math.random() < 0.15 + diff * 0.2) spawnEnemy('heavy', rand(x0 + 3, x1 - 3), groundTop, [x0 + 1, x1 - 1]);
        else spawnEnemy('walker', rand(x0 + 2, x1 - 2), groundTop, [x0 + 1, x1 - 1]);
      }
    }
    // coins
    if (Math.random() < 0.7) {
      const cx = rand(x0 + 2, x1 - 5), arc = Math.random() < 0.5;
      for (let i = 0; i < 5; i++) addCoin(cx + i * 0.8, groundTop + 0.9 + (arc ? Math.sin(i / 4 * Math.PI) * 1.4 : 0));
    }
    for (const p of plats) if (Math.random() < 0.4) addCoin((p[0] + p[1]) / 2, p[2] + 0.8);
    if (Math.random() < 0.09) addHealth(rand(x0 + 2, x1 - 2), groundTop + 0.8);
  }
  genX = x1;
}

// ---------------- pools: bullets, particles
const bulletPool = [], particlePool = [];
function spawnBullet(x, y, z, ang, s) {
  let m = bulletPool.pop();
  if (!m) m = new THREE.Mesh(GEO.bullet, new THREE.MeshBasicMaterial({ color: '#fff' }));
  m.material.color.set(s.tracer);
  const sc = clamp(0.7 + s.dmg / 60, 0.7, 2.2);
  m.scale.set(s.energy ? 1.1 : 1, sc, sc);
  m.position.set(x, y, z); m.rotation.set(0, 0, ang); world.add(m);
  bullets.push({ x, y, vx: Math.cos(ang) * s.speed, vy: Math.sin(ang) * s.speed, life: s.range / s.speed, dmg: s.dmg, pierce: s.ammo === 'ap' ? 3 : 1, hit: new Set(), ammo: s.ammo, mesh: m });
}
function freeBullet(b) { world.remove(b.mesh); bulletPool.push(b.mesh); }

function spawnParticles(x, y, z, color, n, spd = 4, life = 0.5, size = 0.12, grav = 10) {
  for (let i = 0; i < n; i++) {
    let m = particlePool.pop();
    if (!m) m = new THREE.Mesh(GEO.box, new THREE.MeshBasicMaterial({ color: '#fff', transparent: true }));
    m.material.color.set(Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color);
    m.material.opacity = 1;
    const s = size * rand(0.6, 1.3); m.scale.set(s, s, s);
    m.position.set(x, y, z); m.rotation.set(rand(0, 3), rand(0, 3), 0); world.add(m);
    const a = rand(0, Math.PI * 2), v = rand(0.3, 1) * spd;
    particles.push({ m, vx: Math.cos(a) * v, vy: Math.sin(a) * v + spd * 0.3, vz: rand(-1, 1) * spd * 0.4, life: life * rand(0.6, 1.2), max: life, grav, s });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt;
    if (p.life <= 0) { world.remove(p.m); particlePool.push(p.m); particles.splice(i, 1); continue; }
    p.vy -= p.grav * dt; p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
    p.m.rotation.x += dt * 5; const k = p.life / p.max; p.m.material.opacity = Math.min(1, k * 2); p.m.scale.setScalar(p.s * (0.4 + k * 0.6));
  }
}

function explode(x, y, r, dmg) {
  spawnParticles(x, y, 0.3, ['#ffd23f', '#ff8a2a', '#ff4d2a', '#ffffff'], 26, 7, 0.55, 0.22, 4);
  spawnParticles(x, y, 0.3, ['#3a3040', '#5a5060'], 10, 3, 0.9, 0.3, -1);
  flashLight.position.set(x, y + 0.5, 2); flashLight.intensity = 30;
  shake = Math.max(shake, 0.35);
  for (const e of enemies) if (e.alive) { const d = Math.hypot(e.x - x, e.y + e.h / 2 - y); if (d < r + 0.5) damageEnemy(e, dmg * (1 - d / (r + 1) * 0.5)); }
  for (const p of [...platforms]) if (p.crate) { const cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2; if (Math.hypot(cx - x, cy - y) < r + 0.5) damageCrate(p, dmg); }
}

// ---------------- combat
function damageEnemy(e, d) {
  if (!e.alive) return;
  e.hp -= d; e.flash = 0.07;
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.alive = false; kills++;
  const cx = e.x, cy = e.y + e.h / 2;
  spawnParticles(cx, cy, 0, ['#2c2f3a', '#45495a', '#ff8a2a', '#ff2a3a'], 18, 6, 0.8, 0.18, 14);
  spawnParticles(cx, cy, 0, ['#ffd23f', '#ff8a2a'], 8, 4, 0.35, 0.15, 0);
  world.remove(e.g);
  if (Math.random() < 0.45) addCoin(cx, cy);
  if (Math.random() < 0.06) addHealth(cx + 0.5, cy);
}
function damageCrate(p, d) {
  p.crate.hp -= d;
  spawnParticles(p.mesh.position.x, p.mesh.position.y, 0.4, ['#b5773e', '#6e4220'], 3, 3, 0.4, 0.1);
  if (p.crate.hp <= 0) {
    spawnParticles(p.mesh.position.x, p.mesh.position.y, 0.3, ['#b5773e', '#6e4220', '#d39a5a'], 16, 5, 0.8, 0.18, 14);
    world.remove(p.mesh); platforms.splice(platforms.indexOf(p), 1);
    if (Math.random() < 0.5) addCoin(p.mesh.position.x, p.mesh.position.y + 0.3);
    else if (Math.random() < 0.15) addHealth(p.mesh.position.x, p.mesh.position.y + 0.3);
  }
}
function hurtPlayer(d) {
  if (P.inv > 0 || state !== 'play') return;
  P.hp -= d; P.inv = 0.45; shake = Math.max(shake, 0.25);
  $('dmg').style.opacity = 1; setTimeout(() => $('dmg').style.opacity = 0, 120);
  spawnParticles(P.x, P.y + P.h * 0.6, 0.3, '#ff3355', 6, 3, 0.4, 0.1);
  if (P.hp <= 0) gameOver();
}

// ---------------- player
function buildPlayer() {
  if (playerRoot) { world.remove(playerRoot); disposeObject(playerRoot); }
  char = buildCharacter(charCfg);
  gun = buildGun(gunCfg); gun.group.rotation.x = Math.PI / 2; char.hand.add(gun.group);
  stats = computeStats(gunCfg);
  playerRoot = new THREE.Group(); mirror = new THREE.Group(); playerRoot.add(mirror);
  char.root.rotation.y = Math.PI / 2; mirror.add(char.root);
  char.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  world.add(playerRoot);
  if (!laserLine) {
    laserLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), MAT.laser);
    laserLine.frustumCulled = false;
  }
  G.scene.add(laserLine); laserLine.visible = stats.laser;
  if (!muzzleFlash) { muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); G.scene.add(muzzleFlash); }
  muzzleFlash.visible = false;
  P.h = char.height * 0.95; P.w = clamp(char.width * 0.75, 0.5, 0.9);
}

function resetGame() {
  if (playerRoot) disposeObject(playerRoot);
  for (const c of [...world.children]) { world.remove(c); if (c.userData.own) c.userData.own.forEach(g => g.dispose()); }
  for (const b of bullets) bulletPool.push(b.mesh);
  for (const p of particles) particlePool.push(p.m);
  platforms = []; enemies = []; bullets = []; enemyShots = []; particles = []; pickups = []; nades = [];
  playerRoot = null;
  genX = -30; groundTop = 0;
  while (genX < 80) genChunk();
  resetBackground();
  buildPlayer();
  Object.assign(P, { x: 0, y: 0, vx: 0, vy: 0, hp: 100, inv: 0, onGround: true, facing: 1, coyote: 0, jumpBuf: 0, airJumps: 0, cut: false, jet: 0, glide: false, drop: 0,
    ammo: stats.mag, reload: 0, fireCd: 0, burstLeft: 0, burstT: 0, nadeCd: 0, aim: 0, recoil: 0, phase: 0, flash: 0 });
  kills = 0; coins = 0; maxX = 0; shake = 0; camX = 2; camY = 2; camLook = 2;
  $('gunName').textContent = gunCfg.name || RECEIVERS[gunCfg.receiver].label;
  $('btnNade').classList.toggle('hidden', !stats.launcher);
  updateBackground(0);
}

function overlaps(a, p) { return a.x + a.w / 2 > p.x0 && a.x - a.w / 2 < p.x1 && a.y + a.h > p.y0 && a.y < p.y1; }
function solidAt(x, y, includeOneWay = false) {
  for (const p of platforms) if (x > p.x0 && x < p.x1 && y > p.y0 && y < p.y1 && (includeOneWay || !p.oneWay)) return p;
  return null;
}

function movePlayer(dt) {
  P.x += P.vx * dt;
  for (const p of platforms) {
    if (p.oneWay || !overlaps(P, p)) continue;
    if (P.y >= p.y1 - 0.05) continue;
    const pushL = P.x + P.w / 2 - p.x0, pushR = p.x1 - (P.x - P.w / 2);
    if (pushL < pushR) P.x -= pushL + 1e-4; else P.x += pushR + 1e-4;
    P.vx = 0;
  }
  const prevY = P.y;
  P.y += P.vy * dt; P.onGround = false;
  for (const p of platforms) {
    if (P.x + P.w / 2 <= p.x0 + 0.02 || P.x - P.w / 2 >= p.x1 - 0.02) continue;
    if (p.oneWay) {
      if (P.vy <= 0 && prevY >= p.y1 - 0.06 && P.y <= p.y1 && P.drop <= 0) { P.y = p.y1; P.vy = 0; P.onGround = true; }
      continue;
    }
    if (P.y < p.y1 && P.y + P.h > p.y0) {
      if (P.vy <= 0 && prevY >= p.y1 - 0.35) { P.y = p.y1; P.vy = 0; P.onGround = true; }
      else if (P.vy > 0) { P.y = p.y0 - P.h; P.vy = 0; }
    }
  }
}

const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function pickTarget() {
  const sy = P.y + char.shoulderH;
  let bestE = null, bestScore = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - P.x, dy = e.y + e.h * 0.55 - sy, d = Math.hypot(dx, dy);
    if (d > Math.min(stats.range * 0.95, 22) || Math.abs(dx) < 0.2) continue;
    const behind = Math.sign(dx) !== P.facing;
    const score = d + (behind ? 4 : 0);
    if (score < bestScore) { bestScore = score; bestE = e; }
  }
  return bestE;
}

function updatePlayer(dt) {
  const s = stats, mv = input.move;
  const maxSpeed = 6.4 * s.mob;
  const accel = P.onGround ? 55 : 32;
  const target = mv * maxSpeed;
  P.vx += clamp(target - P.vx, -accel * dt, accel * dt);

  if (input.consume('jump')) P.jumpBuf = 0.14;
  P.jumpBuf -= dt; P.coyote = P.onGround ? 0.1 : P.coyote - dt; P.drop -= dt; P.jet -= dt; P.inv -= dt;
  if ((input.stickY < -0.75 || input.keys.has('KeyS') || input.keys.has('ArrowDown')) && P.onGround) P.drop = 0.25;
  if (P.jumpBuf > 0 && P.coyote > 0) {
    P.vy = 12.6; P.jumpBuf = 0; P.coyote = 0; P.onGround = false; P.cut = false;
    P.airJumps = char.back === 'jetpack' ? 1 : 0;
    spawnParticles(P.x, P.y + 0.05, 0, '#d9c9e0', 5, 2, 0.3, 0.1, 2);
  } else if (P.jumpBuf > 0 && !P.onGround && P.airJumps > 0) {
    P.vy = 11.5; P.airJumps--; P.jumpBuf = 0; P.jet = 0.35; P.cut = false;
    spawnParticles(P.x, P.y + 0.6, -0.3, ['#ffb02e', '#ff6a2a', '#ffe08a'], 10, 3, 0.35, 0.12, -2);
  }
  if (!input.jumpHeld && P.vy > 0 && !P.cut) { P.vy *= 0.55; P.cut = true; }
  P.vy -= 32 * dt;
  P.glide = false;
  if (char.back === 'wings' && input.jumpHeld && P.vy < -2.2) { P.vy = -2.2; P.glide = true; }
  P.vy = Math.max(P.vy, -26);
  movePlayer(dt);
  maxX = Math.max(maxX, P.x);
  if (P.y < -16) { P.hp = 0; gameOver(); return; }

  // ---- aiming
  const sy = P.y + char.shoulderH;
  let wantAim = 0, face = mv !== 0 ? Math.sign(mv) : P.facing;
  if (input.mouse.active && !input.touchMode) {
    raycaster.setFromCamera(new THREE.Vector2(input.mouse.x / W * 2 - 1, -(input.mouse.y / H) * 2 + 1), G.cam);
    raycaster.ray.intersectPlane(plane, tmpV);
    const dx = tmpV.x - P.x, dy = tmpV.y - sy;
    if (Math.abs(dx) > 0.3) face = Math.sign(dx);
    wantAim = Math.atan2(dy, Math.abs(dx));
  } else {
    const t = pickTarget();
    if (t && (input.fire || Math.abs(t.x - P.x) < 14)) {
      const dx = t.x - P.x, dy = t.y + t.h * 0.55 - sy;
      if (input.fire || mv === 0 || Math.sign(dx) === Math.sign(mv)) face = Math.sign(dx);
      if (Math.sign(dx) === face) wantAim = Math.atan2(dy, Math.abs(dx));
    }
    if (Math.abs(input.stickY) > 0.45 && !(input.stickY < -0.75 && P.onGround)) wantAim = clamp(input.stickY, -1, 1) * 1.1;
  }
  P.facing = face;
  P.aim = damp(P.aim, clamp(wantAim, -1.2, 1.35), 16, dt);
  P.recoil = Math.max(0, P.recoil - dt * 4);

  // ---- weapon
  P.fireCd -= dt; P.burstT -= dt; P.nadeCd -= dt;
  if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) P.ammo = s.mag; }
  if (input.consume('reload') && P.reload <= 0 && P.ammo < s.mag) startReload();
  if (P.burstLeft > 0) {
    if (P.burstT <= 0 && P.ammo > 0) { shoot(); P.burstLeft--; P.burstT = 0.07; if (P.burstLeft === 0) P.fireCd = 1.6 / s.rof; }
    if (P.ammo <= 0) P.burstLeft = 0;
  } else if (input.fire && P.fireCd <= 0 && P.reload <= 0) {
    if (P.ammo <= 0) startReload();
    else if (s.mode === 'burst') { P.burstLeft = 3; P.burstT = 0; }
    else { shoot(); P.fireCd = 1 / s.rof; }
  }
  if (P.ammo <= 0 && P.reload <= 0 && P.burstLeft === 0) startReload();
  if (input.consume('nade') && s.launcher && P.nadeCd <= 0) throwNade();

  // ---- visuals
  playerRoot.position.set(P.x, P.y, 0);
  mirror.scale.x = P.facing;
  const moveDir = Math.sign(P.vx) * P.facing;
  P.phase += dt * Math.abs(P.vx) * 1.8 * (moveDir < 0 ? -1 : 1);
  poseCharacter(char, { phase: P.phase, speed: Math.abs(P.vx) / maxSpeed, air: !P.onGround, aim: P.aim, recoil: P.recoil, t: time, jet: P.jet > 0, glide: P.glide });
  const reloadDip = P.reload > 0 ? Math.sin(Math.min(1, 1 - P.reload / s.reload) * Math.PI) : 0;
  if (reloadDip) { char.armR.pivot.rotation.x += reloadDip * 0.9; char.armL.pivot.rotation.x += reloadDip * 1.2; }
  playerRoot.visible = !(P.inv > 0 && Math.floor(time * 30) % 2 === 0);
  playerRoot.updateMatrixWorld(true);
}

function startReload() { if (P.reload > 0) return; P.reload = stats.reload; P.burstLeft = 0; }

function aimAngle() { return P.facing > 0 ? P.aim : Math.PI - P.aim; }

function shoot() {
  const s = stats;
  gun.muzzle.getWorldPosition(tmpV);
  const base = aimAngle();
  const spread = s.spread * DEG * (1 + P.recoil * 0.8);
  for (let i = 0; i < s.pellets; i++) spawnBullet(tmpV.x, tmpV.y, tmpV.z, base + (Math.random() - 0.5) * spread * (s.pellets > 1 ? 1 : 1.2), s);
  P.ammo--;
  P.recoil = Math.min(1, P.recoil + s.recoil * 0.55);
  P.vx -= Math.cos(base) * s.recoil * 1.5;
  shake = Math.max(shake, s.recoil * 0.12);
  P.flash = s.quiet ? 0.03 : 0.05;
  muzzleFlash.position.copy(tmpV);
  muzzleFlash.material.color.set(s.energy ? s.tracer : '#ffffff');
  const fs = (s.quiet ? 0.35 : 0.7) * (0.8 + s.dmg / 80);
  muzzleFlash.scale.set(fs * rand(0.8, 1.2), fs * rand(0.8, 1.2), 1);
  muzzleLight.position.copy(tmpV); muzzleLight.intensity = s.quiet ? 2 : 6;
  muzzleLight.color.set(s.energy ? s.tracer : '#ffc070');
  if (!s.energy) spawnParticles(tmpV.x - Math.cos(base) * 0.4, tmpV.y, tmpV.z, '#e6b422', 1, 3, 0.6, 0.05, 18);
}

function throwNade() {
  gun.muzzle.getWorldPosition(tmpV);
  const a = aimAngle() + (P.facing > 0 ? 0.35 : -0.35);
  const m = new THREE.Mesh(GEO.nade, MAT.nade); m.position.copy(tmpV); m.castShadow = true; world.add(m);
  nades.push({ x: tmpV.x, y: tmpV.y, vx: Math.cos(a) * 14 + P.vx * 0.5, vy: Math.sin(a) * 14, life: 2.5, m });
  P.nadeCd = 3;
  shake = Math.max(shake, 0.1);
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const sp = Math.hypot(b.vx, b.vy), steps = Math.max(1, Math.ceil(sp * dt / 0.35));
    let dead = false;
    for (let k = 0; k < steps && !dead; k++) {
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
      const p = solidAt(b.x, b.y);
      if (p) {
        dead = true;
        if (p.crate) damageCrate(p, b.dmg);
        spawnParticles(b.x, b.y, 0.3, ['#ffe08a', '#ffffff'], 3, 4, 0.2, 0.06, 10);
        if (b.ammo === 'explosive') explode(b.x, b.y, 1.8, b.dmg * 0.8);
        break;
      }
      for (const e of enemies) {
        if (!e.alive || b.hit.has(e)) continue;
        if (b.x > e.x - e.w / 2 && b.x < e.x + e.w / 2 && b.y > e.y && b.y < e.y + e.h) {
          b.hit.add(e);
          damageEnemy(e, b.dmg);
          if (b.ammo === 'incendiary') { e.burn = 2.5; }
          if (b.ammo === 'frost') { e.slow = 2.5; }
          spawnParticles(b.x, b.y, 0.3, b.ammo === 'frost' ? ['#bff4ff', '#6fd8ff'] : b.ammo === 'incendiary' ? ['#ffb02e', '#ff5a1f'] : ['#ffd23f', '#ff8a2a', '#ffffff'], 5, 4, 0.25, 0.08, 6);
          if (b.ammo === 'explosive') { explode(b.x, b.y, 1.8, b.dmg * 0.8); dead = true; break; }
          if (--b.pierce <= 0) { dead = true; break; }
        }
      }
    }
    b.life -= dt;
    if (dead || b.life <= 0) { freeBullet(b); bullets.splice(i, 1); continue; }
    b.mesh.position.set(b.x, b.y, b.mesh.position.z);
  }
  // grenades
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i]; n.vy -= 22 * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.life -= dt;
    n.m.position.set(n.x, n.y, n.m.position.z); n.m.rotation.z += dt * 10;
    const hitE = enemies.some(e => e.alive && n.x > e.x - e.w / 2 && n.x < e.x + e.w / 2 && n.y > e.y && n.y < e.y + e.h);
    if (hitE || solidAt(n.x, n.y, true) || n.life <= 0) { explode(n.x, n.y, 3, 130); world.remove(n.m); nades.splice(i, 1); }
  }
}

function enemyFire(e, ang, spd) {
  const m = new THREE.Mesh(GEO.orb, MAT.enemyShot);
  const ox = e.x + e.facing * (e.type === 'drone' ? 0.45 : 0.7 * (e.type === 'heavy' ? 1.35 : 1));
  const oy = e.y + (e.type === 'drone' ? -0.18 : 1.0 * (e.type === 'heavy' ? 1.35 : 1));
  m.position.set(ox, oy, 0.3); world.add(m);
  enemyShots.push({ x: ox, y: oy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 3, m });
  spawnParticles(ox, oy, 0.3, '#ff3355', 2, 2, 0.15, 0.06, 0);
}

function updateEnemies(dt) {
  const pcx = P.x, pcy = P.y + P.h * 0.55;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (!e.alive || e.x < P.x - 45) { if (e.alive) world.remove(e.g); enemies.splice(i, 1); continue; }
    if (e.x > P.x + 30) continue; // asleep until near
    const sm = e.slow > 0 ? 0.4 : 1;
    e.slow -= dt;
    if (e.burn > 0) { e.burn -= dt; e.burnTick -= dt; if (e.burnTick <= 0) { e.burnTick = 0.35; damageEnemy(e, 6); spawnParticles(e.x, e.y + e.h * 0.6, 0.2, ['#ffb02e', '#ff5a1f'], 3, 1.5, 0.4, 0.1, -3); } if (!e.alive) continue; }
    const dx = pcx - e.x, dist = Math.abs(dx);
    const ey = e.type === 'drone' ? e.y : e.y + e.h * 0.6;
    const toP = Math.atan2(pcy - ey, dx);
    if (e.type === 'drone') {
      e.t += dt;
      if (dist < 18) {
        const want = pcx - Math.sign(dx) * 7;
        e.x += clamp(want - e.x, -1, 1) * 2.6 * sm * dt;
        e.baseY = damp(e.baseY, Math.max(pcy + 2.2, e.baseY - 0.01), 0.5, dt);
        e.facing = Math.sign(dx) || 1;
        e.cd -= dt * sm;
        if (e.cd <= 0 && state === 'play') { enemyFire(e, toP, 9); e.cd = rand(1.8, 2.6); }
      }
      e.y = e.baseY + Math.sin(e.t * 2.2) * 0.35;
      for (const r of e.rotors) r.rotation.y += dt * 40;
      e.inner.rotation.z = clamp(-(e.x - (e.px ?? e.x)) * 8, -0.3, 0.3); e.px = e.x;
    } else {
      const aggro = dist < 15 && Math.abs(pcy - ey) < 5;
      if (aggro) {
        e.facing = Math.sign(dx) || 1;
        e.cd -= dt * sm;
        if (e.cd <= 0 && state === 'play') {
          if (e.type === 'heavy') { for (const o of [-0.15, 0, 0.15]) enemyFire(e, toP + o, 8.5); e.cd = rand(2.2, 3); }
          else { enemyFire(e, toP, 10); e.cd = rand(1.4, 2.1); }
        }
        e.phase = damp(e.phase, 0, 10, dt);
      } else {
        e.x += e.dir * 1.4 * sm * dt; e.facing = e.dir;
        if (e.x < e.x0) { e.x = e.x0; e.dir = 1; } if (e.x > e.x1) { e.x = e.x1; e.dir = -1; }
        e.phase += dt * 8 * sm;
      }
      e.legs[0].rotation.z = Math.sin(e.phase) * 0.5; e.legs[1].rotation.z = -Math.sin(e.phase) * 0.5;
    }
    e.g.position.set(e.x, e.y, 0);
    e.g.scale.x = e.facing;
    if (e.flash > 0) { e.flash -= dt; for (const p of e.parts) p.material = MAT.flash; }
    else { const m = e.type === 'heavy' ? MAT.enemyHeavy : MAT.enemy; for (const p of e.parts) p.material = m; }
    // contact damage
    if (Math.abs(P.x - e.x) < (P.w + e.w) / 2 && P.y < e.y + e.h && P.y + P.h > e.y) hurtPlayer(e.type === 'heavy' ? 25 : 12);
  }
  for (let i = enemyShots.length - 1; i >= 0; i--) {
    const s = enemyShots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; s.m.position.x = s.x; s.m.position.y = s.y;
    let dead = s.life <= 0 || !!solidAt(s.x, s.y);
    if (!dead && s.x > P.x - P.w / 2 && s.x < P.x + P.w / 2 && s.y > P.y && s.y < P.y + P.h) { hurtPlayer(10); dead = true; }
    if (dead) { world.remove(s.m); enemyShots.splice(i, 1); }
  }
}

function updatePickups(dt) {
  const cx = P.x, cy = P.y + P.h * 0.5;
  for (let i = pickups.length - 1; i >= 0; i--) {
    const k = pickups[i];
    if (k.x < P.x - 40) { world.remove(k.mesh); pickups.splice(i, 1); continue; }
    k.mesh.rotation.y += dt * 3;
    k.mesh.position.y = k.y + Math.sin(time * 3 + k.x) * 0.08;
    const d = Math.hypot(k.x - cx, k.y - cy);
    if (k.kind === 'coin' && d < 2) { k.x = damp(k.x, cx, 8, dt); k.y = damp(k.y, cy, 8, dt); k.mesh.position.x = k.x; }
    if (d < 0.75) {
      if (k.kind === 'coin') { coins++; spawnParticles(k.x, k.y, 0, ['#ffd23f', '#fff3a0'], 5, 2.5, 0.3, 0.07, 0); }
      else if (P.hp < 100) { P.hp = Math.min(100, P.hp + 35); spawnParticles(k.x, k.y, 0, ['#ff3355', '#ffffff'], 10, 3, 0.4, 0.08, 0); }
      else continue;
      world.remove(k.mesh); pickups.splice(i, 1);
    }
  }
}

function cullWorld() {
  for (let i = platforms.length - 1; i >= 0; i--) {
    const p = platforms[i];
    if (p.x1 < P.x - 45) { world.remove(p.mesh); if (p.mesh.userData.own) p.mesh.userData.own.forEach(g => g.dispose()); platforms.splice(i, 1); }
  }
  while (genX < P.x + 70) genChunk();
}

function updateLaser() {
  if (!stats.laser) return;
  const o = gun.laserOrigin || gun.muzzle;
  o.getWorldPosition(tmpV);
  const a = aimAngle(), dx = Math.cos(a), dy = Math.sin(a);
  let len = 0;
  for (; len < 24; len += 0.25) {
    const x = tmpV.x + dx * len, y = tmpV.y + dy * len;
    if (solidAt(x, y)) break;
    if (enemies.some(e => e.alive && x > e.x - e.w / 2 && x < e.x + e.w / 2 && y > e.y && y < e.y + e.h)) break;
  }
  const pos = laserLine.geometry.attributes.position;
  pos.setXYZ(0, tmpV.x, tmpV.y, tmpV.z); pos.setXYZ(1, tmpV.x + dx * len, tmpV.y + dy * len, tmpV.z); pos.needsUpdate = true;
}

function step(dt) {
  time += dt;
  updatePlayer(dt);
  if (state !== 'play') return;
  updateBullets(dt);
  updateEnemies(dt);
  updatePickups(dt);
  updateParticles(dt);
  cullWorld();
  updateLaser();
  P.flash -= dt;
  muzzleFlash.visible = P.flash > 0;
  muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 80);
  flashLight.intensity = Math.max(0, flashLight.intensity - dt * 120);
}

function updateCamera(dt) {
  camLook = damp(camLook, P.facing * 2.4, 1.8, dt);
  camX = damp(camX, P.x + camLook, 6, dt);
  camY = damp(camY, Math.max(P.y, -2) + 1.3, 4, dt);
  const portrait = W < H;
  const dist = portrait ? 20 : 12.5;
  shake = Math.max(0, shake - dt * 1.6);
  const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
  G.cam.position.set(camX + sx, camY + 2.4 + sy, dist);
  G.cam.lookAt(camX + sx * 0.5, camY + 0.5, 0);
  sun.position.set(camX - 9, camY + 18, 14); sun.target.position.set(camX, camY - 2, 0);
  sunDisc.position.set(camX + 14, camY + 9, -150);
  updateBackground(camX);
}

// ---------------- HUD
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
function score() { return Math.floor(maxX) + kills * 50 + coins * 10; }
function updateHUD() {
  const hp = Math.max(0, Math.ceil(P.hp));
  $('hpFill').style.width = hp + '%'; setText('hpTxt', String(hp));
  setText('scoreTxt', String(score()));
  setText('distTxt', `${Math.floor(maxX)} m · ${kills} ✕ · ${coins} ◉`);
  setText('ammoTxt', String(P.ammo)); setText('magTxt', '/' + stats.mag);
  $('reloadTxt').classList.toggle('hidden', !(P.reload > 0));
}

// ================================================================ STATE MACHINE / UI
let state = 'menu';
const input = new Input();
input.bindMouse(canvas);
input.bindTouch({ zone: $('stickZone'), base: $('stickBase'), knob: $('stickKnob'), buttons: { fire: $('btnFire'), jump: $('btnJump'), reload: $('btnReload'), nade: $('btnNade') } });
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (isTouch) input.touchMode = true;

function show(id, on) { $(id).classList.toggle('hidden', !on); }
function setState(s) {
  state = s;
  show('menu', s === 'menu'); show('custom', s === 'char' || s === 'gun');
  show('hud', s === 'play' || s === 'pause'); show('touch', s === 'play' && isTouch);
  show('pause', s === 'pause'); show('over', s === 'over');
  document.body.classList.toggle('playing', s === 'play');
  if (s === 'menu' || s === 'char' || s === 'gun') { previewMode = s; previewLayout(); }
  if (s === 'menu') {
    $('bestTxt').textContent = best ? `Best score: ${best}` : '';
    $('tipTxt').textContent = isTouch ? 'Tip: Add to Home Screen for full-screen play' : 'A/D move · W/Space jump · mouse aim & shoot · R reload · G grenade · S drop';
  }
  input.clear();
}

let panel = null;
function openCustom(kind) {
  setState(kind);
  const isGun = kind === 'gun';
  $('customTitle').textContent = isGun ? 'Gunsmith' : 'Character';
  const pres = $('presets'); pres.innerHTML = '';
  if (isGun) for (const [name, cfg] of Object.entries(GUN_PRESETS)) {
    const b = document.createElement('button'); b.textContent = name;
    b.onclick = () => { gunCfg = { ...DEFAULT_GUN, ...cfg }; changed(); panel.refresh(); };
    pres.appendChild(b);
  }
  panel = buildPanel({
    tabsEl: $('tabs'), contentEl: $('content'), schema: isGun ? GUN_SCHEMA : CHAR_SCHEMA,
    getCfg: () => isGun ? gunCfg : charCfg,
    onChange: (k, v) => {
      if (isGun) { gunCfg[k] = v; if (k === 'receiver') { gunCfg.fireMode = RECEIVERS[v].mode; panel.refresh(); } }
      else charCfg[k] = v;
      changed();
    },
  });
  changed();
}
function changed() {
  store.set('rr_char', charCfg); store.set('rr_gun', gunCfg);
  pv.dirty = true;
  if (state === 'gun') {
    const s = computeStats(gunCfg);
    const notes = [];
    notes.push(`DPS <b>${Math.round(s.dps)}</b>`);
    notes.push({ semi: 'Semi-auto', burst: '3-round burst', auto: 'Full auto' }[s.mode]);
    if (s.pellets > 1) notes.push(`${s.pellets} pellets`);
    notes.push(PARTS.ammo[s.ammo].label);
    if (s.laser) notes.push('Laser sight');
    if (s.launcher) notes.push('💣 Grenade button');
    renderStats($('stats'), statBars(s), notes.join(' · '));
  } else {
    $('stats').innerHTML = `<div class="statx">Your look is saved automatically. <b>Jetpack</b> gives a double jump, <b>Wings</b> let you glide (hold jump).</div>`;
  }
}

$('charBtn').onclick = () => openCustom('char');
$('gunBtn').onclick = () => openCustom('gun');
$('backBtn').onclick = () => setState('menu');
$('randBtn').onclick = () => {
  if (state === 'gun') gunCfg = { ...DEFAULT_GUN, ...randomGun() }; else charCfg = { ...DEFAULT_CHAR, ...randomChar() };
  changed(); panel.refresh();
};
$('playBtn').onclick = startGame;
$('retryBtn').onclick = startGame;
$('menuBtn').onclick = () => setState('menu');
$('quitBtn').onclick = () => setState('menu');
$('resumeBtn').onclick = () => setState('play');
$('pauseBtn').onclick = () => { if (state === 'play') setState('pause'); };
addEventListener('keydown', e => { if (e.code === 'Escape' && state === 'pause') setState('play'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') setState('pause'); });

function startGame() {
  resetGame();
  setState('play');
  updateCamera(1);
}
function gameOver() {
  if (state !== 'play') return;
  const sc = score();
  const newBest = sc > best;
  if (newBest) { best = sc; store.set('rr_best', best); }
  spawnParticles(P.x, P.y + 1, 0.3, ['#ff3355', '#ffd23f'], 20, 5, 0.8, 0.14);
  $('finalTxt').innerHTML = `Score <b>${sc}</b>${newBest ? ' — new best!' : ''}<br>Distance <b>${Math.floor(maxX)} m</b> · Kills <b>${kills}</b> · Coins <b>${coins}</b>`;
  setState('over');
}

// prevent iOS page scroll / zoom gestures (except inside scrollable panels)
document.addEventListener('touchmove', e => { if (!e.target.closest('.scroll')) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

// ---------------- resize & loop
function resize() {
  W = innerWidth; H = innerHeight;
  renderer.setSize(W, H);
  G.cam.aspect = W / H; G.cam.updateProjectionMatrix();
  previewLayout();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();

let last = performance.now(), ptime = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play') {
    if (input.consume('pause')) { setState('pause'); }
    else {
      const n = dt > 1 / 50 ? 2 : 1;
      for (let i = 0; i < n && state === 'play'; i++) step(dt / n);
      updateHUD();
    }
    updateCamera(dt);
    renderer.render(G.scene, G.cam);
  } else if (state === 'pause' || state === 'over') {
    if (state === 'over') { time += dt; updateParticles(dt); updateCamera(dt); }
    renderer.render(G.scene, G.cam);
  } else {
    ptime += dt;
    updatePreview(dt, ptime);
    renderer.render(pv.scene, pv.cam);
  }
}
setState('menu');
requestAnimationFrame(frame);

// debug hook for automated testing
window.__game = { get state() { return state; }, P, get enemies() { return enemies; }, input, startGame, openCustom };
