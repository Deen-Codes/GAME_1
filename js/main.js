import * as THREE from '../lib/three.module.min.js';
import { buildCharacter, poseCharacter, disposeObject, DEFAULT_CHAR, CHAR_SCHEMA } from './character.js';
import { computeStats, statBars, DEFAULT_GUN, RECEIVERS, PARTS, buildGun } from './gun.js';
import { buildCar, computeCarStats, carStatBars, DEFAULT_CAR, CAR_SCHEMA, CAR_PRESETS, CAR_PARTS, BODIES, randomCar, trafficCar } from './car.js';
import { WORLD, CHUNK, CITIES, MATS, WATER_Y, SPAWN, LABELS, SIGN, buildChunk, parkedIn, resolve, walkable, onPier, roadAt, cityAt, zoneName, groundH, solidPoint, drawMap, sandLine, shoreLine, removeCollider } from './world.js';
import { PLACES, PROPERTIES, GOODS, dealerPrices, OUTFITS, STYLE_NAMES, BARBER_PRICES, RACE, CHOP_VALUE } from './places.js';
import { buildPanel, renderStats } from './ui.js';
import { Input } from './input.js';
import { audio, sfx, engine as engineSound, ambience, radioOn, radioTick, radioSet, radioIndex, STATIONS, setMuted } from './audio.js';
import { runMinigame } from './minigames.js';
import { Peds, bakeCfg, figure } from './peds.js';
import { SLOTS, SLOT, newArsenal, slotStats, maxReserve, ammoBox, smithSchema, SMITH_PRICES, buildWeaponModel, iconSVG, DEFAULT_CFGS } from './weapons.js';
import { findRoute } from './nav.js';
import { attachWheel } from './wheel.js';
import { Talk } from './talk.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const DEG = Math.PI / 180;
const fmt = n => '$' + Math.floor(n).toLocaleString('en-US');
const VERSION = 'v5';

// ================================================================ renderer & save data
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let W = innerWidth, H = innerHeight;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};
let charCfg = { ...DEFAULT_CHAR, ...store.get('rr_char', {}) };
let carCfg = { ...DEFAULT_CAR, ...store.get('bc_car', {}) };
let save = store.get('bc_save', null);
let money = save?.money ?? 500;
let stash = save?.stash || {};
let owned = new Set(save?.owned || []);
let waypoint = save?.waypoint || null;
let settings = { sound: true, shadows: true, ...store.get('bc_settings', {}) };
let arsenal = store.get('bc_arsenal', null) || newArsenal(store.get('rr_gun', null));
for (const s of SLOTS) { arsenal.ammo[s.id] ||= { mag: 0, res: 0 }; if (s.kind === 'gun') arsenal.cfg[s.id] ||= { ...DEFAULT_CFGS[s.id] }; }
const stashCap = () => 40 + owned.size * 20;
const stashCount = () => Object.values(stash).reduce((a, b) => a + b, 0);

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,230,160,.85)'); g.addColorStop(1, 'rgba(255,140,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
const flareTex = glowTex();
const emojiTexCache = new Map();
function emojiTex(e, bg) {
  const k = e + (bg || ''); if (emojiTexCache.has(k)) return emojiTexCache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 6; x.strokeStyle = '#fff'; x.stroke(); }
  x.font = '78px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; emojiTexCache.set(k, t); return t;
}
const bakedMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.35, flatShading: true });
function bakeGroup(group) {
  group.updateMatrixWorld(true);
  const Pp = [], N = [], Cc = [], nm = new THREE.Matrix3(), c = new THREE.Color(), v = new THREE.Vector3();
  group.traverse(m => {
    if (!m.isMesh || m.material.blending === THREE.AdditiveBlending) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const p = g.attributes.position, n = g.attributes.normal;
    nm.getNormalMatrix(m.matrixWorld);
    c.copy(m.material.color); if (m.material.map) c.set('#6b6b6b');
    if (m.material.emissive && m.material.emissiveIntensity > 0.3) c.lerp(m.material.emissive, 0.6);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); Pp.push(v.x, v.y, v.z); v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z); Cc.push(c.r, c.g, c.b); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  g.computeBoundingSphere(); return g;
}
const carLib = [];
function ensureCarLib() {
  if (carLib.length) return;
  let s = 12345; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) { const cfg = trafficCar(r), car = buildCar(cfg); carLib.push({ cfg, geo: bakeGroup(car.group), len: car.length }); disposeObject(car.group); }
}

// ================================================================ see-through fade
const fadeU = { uPlayer: { value: new THREE.Vector3() }, uCam: { value: new THREE.Vector3() }, uFade: { value: 1 } };
function addFade(mat) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, fadeU);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vWP;\nuniform vec3 uPlayer;\nuniform vec3 uCam;\nuniform float uFade;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (uFade > 0.5 && vWP.y > uPlayer.y + 1.8) {
        vec3 ab = uCam - uPlayer; float t = clamp(dot(vWP - uPlayer, ab) / dot(ab, ab), 0.0, 1.0);
        float d = length(vWP - (uPlayer + ab * t));
        float rad = 2.5 + t * 9.0;
        if (t > 0.01 && d < rad) { vec2 g = floor(gl_FragCoord.xy * 0.5); if (d < rad - 1.5 || mod(g.x + g.y, 2.0) < 1.0) discard; }
      }`);
  };
  mat.needsUpdate = true;
}
addFade(MATS.solid); addFade(MATS.win); addFade(MATS.glow);

// ================================================================ PREVIEW (customisers & shops)
const pv = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, 1, 0.05, 200), turn: new THREE.Group(), gunStand: new THREE.Group(), carStand: new THREE.Group(), rot: -0.5, vel: 0, dirty: true, focus: new THREE.Vector3(0, 1, 0), dist: 6 };
{
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256; const x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#1d2547'); g.addColorStop(0.6, '#3b3a68'); g.addColorStop(1, '#6a4a76'); x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; pv.scene.background = t;
  pv.scene.add(new THREE.HemisphereLight('#ffe8cc', '#2a2440', 1.4));
  const d = new THREE.DirectionalLight('#fff1e0', 2.2); d.position.set(3, 7, 5); d.castShadow = true;
  d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -4, right: 4, top: 4, bottom: -3 }); pv.scene.add(d);
  const rim = new THREE.DirectionalLight('#7aa8ff', 1.1); rim.position.set(-4, 3, -4); pv.scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.5, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#2a2a48', roughness: 0.9 }));
  floor.position.y = -0.06; floor.receiveShadow = true; pv.scene.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.025, 6, 80), new THREE.MeshBasicMaterial({ color: '#ff8a2a' })); ring.rotation.x = Math.PI / 2; pv.scene.add(ring);
}
pv.scene.add(pv.turn, pv.gunStand, pv.carStand);
let previewCfg = null, pvGunCfg = DEFAULT_GUN;
function rebuildPreview() {
  if (pv.char) { pv.turn.remove(pv.char.root); disposeObject(pv.char.root); }
  if (pv.gunView) { pv.gunStand.remove(pv.gunView.group); disposeObject(pv.gunView.group); }
  if (pv.car) { pv.carStand.remove(pv.car.group); disposeObject(pv.car.group); }
  pv.char = buildCharacter(previewCfg || charCfg); pv.turn.add(pv.char.root);
  pv.gunView = buildGun(pvGunCfg); pv.gunView.group.position.copy(pv.gunView.center).multiplyScalar(-1); pv.gunStand.add(pv.gunView.group);
  pv.car = buildCar(carCfg); pv.carStand.add(pv.car.group);
  pv.dirty = false;
}
let previewMode = 'char';
function previewLayout() { const c = pv.cam; c.aspect = W / H; c.clearViewOffset(); c.setViewOffset(W, H, 0, H * 0.24, W, H); c.updateProjectionMatrix(); }
function updatePreview(dt, t) {
  if (pv.dirty) rebuildPreview();
  const m = previewMode;
  if (!dragging) { pv.rot += pv.vel * dt; pv.vel = damp(pv.vel, 0, 2, dt); }
  pv.gunStand.visible = m === 'gun'; pv.carStand.visible = m === 'car'; pv.turn.visible = !pv.gunStand.visible && !pv.carStand.visible;
  const aspect = W / H, h = pv.char.height;
  let focus, dist;
  if (m === 'gun') { pv.gunStand.position.set(0, 1.2, 0); pv.gunStand.rotation.set(0.12, pv.rot + Math.PI / 2 + 0.45, 0); dist = clamp((pv.gunView.length + 0.15) * 1.25 / (0.63 * aspect), 1, 8); focus = new THREE.Vector3(0, 1.2, 0); }
  else if (m === 'car') { pv.carStand.rotation.y = pv.rot + 0.6; dist = clamp((pv.car.length + 0.6) * 1.05 / (0.63 * aspect), 4, 24); focus = new THREE.Vector3(0, 0.7, 0); }
  else { pv.turn.rotation.y = pv.rot; poseCharacter(pv.char, { t, aim: -1.45, speed: 0 }); const head = m === 'barber'; dist = head ? 3.4 : 9.5 * (h / 1.9); focus = new THREE.Vector3(0, head ? h * 0.86 : h * 0.52, 0); }
  pv.focus.lerp(focus, 1 - Math.exp(-8 * dt)); pv.dist = damp(pv.dist, dist, 8, dt);
  pv.cam.position.set(pv.focus.x, pv.focus.y + pv.dist * 0.22, pv.focus.z + pv.dist); pv.cam.lookAt(pv.focus);
}
let dragging = false, dragX = 0;
canvas.addEventListener('pointerdown', e => { if (state !== 'play') { dragging = true; dragX = e.clientX; pv.vel = 0; } });
addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - dragX; dragX = e.clientX; pv.rot += dx * 0.012; pv.vel = dx * 0.6; });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointercancel', () => dragging = false);

// ================================================================ GAME WORLD
const G = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(40, 1, 1, 700) };
G.scene.background = new THREE.Color('#a8d8f0');
G.scene.fog = new THREE.Fog('#a8d8f0', 70, 180);
const hemi = new THREE.HemisphereLight('#e8f4ff', '#5a6a40', 1.15); G.scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d8', 2); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 260 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
G.scene.add(sun, sun.target);
const lantern = new THREE.PointLight('#ffd9a0', 0, 14, 1.6); G.scene.add(lantern);
const muzzleLight = new THREE.PointLight('#ffd080', 0, 9, 1.6); G.scene.add(muzzleLight);
const boomLight = new THREE.PointLight('#ffa040', 0, 30, 1.4); G.scene.add(boomLight);
const water = new THREE.Mesh(new THREE.PlaneGeometry(1600, 700), new THREE.MeshStandardMaterial({ color: '#3e94d4', roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.88 }));
water.rotation.x = -Math.PI / 2; water.position.set(120, WATER_Y, 700); water.receiveShadow = true; G.scene.add(water);
const world = new THREE.Group(); G.scene.add(world);
const dyn = new THREE.Group(); G.scene.add(dyn);
const peds = new Peds(dyn);
const talk = new Talk();
function applySettings() {
  setMuted(!settings.sound);
  renderer.shadowMap.enabled = settings.shadows; sun.castShadow = settings.shadows;
  G.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  store.set('bc_settings', settings);
}

// ---- BAYWOOD sign
{
  const g = new THREE.Group(), letters = SIGN.text.split('');
  letters.forEach((ch, i) => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 160; const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.font = '900 150px Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 86);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 7.5), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.15 }));
    const lx = SIGN.x + (i - (letters.length - 1) / 2) * 6.6, lz = SIGN.z + Math.sin(i * 0.9) * 0.8, gy = groundH(lx, lz);
    m.position.set(lx, gy + 4.6, lz); m.rotation.x = -0.35; m.castShadow = true; g.add(m);
    for (const sx of [-1.8, 1.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), new THREE.MeshStandardMaterial({ color: '#555' })); p.position.set(lx + sx, gy + 1.5, lz - 0.8); g.add(p); }
  });
  G.scene.add(g);
}
// ---- a plane that takes off now and then
const flyer = (() => {
  const g = new THREE.Group(), w = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, flatShading: true }), a = new THREE.MeshStandardMaterial({ color: '#2f80ed', flatShading: true });
  const add = (sx, sy, sz, x, y, z, m = w) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); };
  add(26, 4, 4, 0, 0, 0); add(3, 3, 3.2, 14, 0.3, 0); add(5.5, 0.5, 30, 1, 0, 0); add(4, 5, 0.5, -15, 2.5, 0, a); add(2.6, 0.4, 10, -15, 2.2, 0); add(22, 0.6, 4.2, 3, 1.1, 0, a);
  g.position.set(-220, 2.2, -705); G.scene.add(g);
  return { g, v: 0, phase: 'wait', wait: 20 };
})();
function updateFlyer(dt) {
  const f = flyer;
  if (f.phase === 'wait') { f.wait -= dt; f.g.position.set(-220, 2.2, -705); f.g.rotation.set(0, 0, 0); if (f.wait <= 0) { f.phase = 'roll'; f.v = 0; } return; }
  f.v = Math.min(70, f.v + dt * (f.phase === 'roll' ? 9 : 4)); f.g.position.x += f.v * dt;
  if (f.g.position.x > 20) { f.phase = 'climb'; f.g.position.y += dt * f.v * 0.22; f.g.rotation.z = damp(f.g.rotation.z, 0.2, 2, dt); }
  if (f.g.position.x > 1100) { f.phase = 'wait'; f.wait = 50 + Math.random() * 40; }
}

// ---------------- chunk streaming
const loaded = new Map();
let loadBudget = 2;
function updateChunks(px, pz, radius) {
  const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK), want = [];
  for (let i = -radius; i <= radius; i++) for (let j = -radius; j <= radius; j++) {
    const cx = ccx + i, cz = ccz + j;
    if ((cx + 1) * CHUNK < WORLD.x0 - 64 || cx * CHUNK > WORLD.x1 + 64 || (cz + 1) * CHUNK < WORLD.z0 - 64 || cz * CHUNK > WORLD.z1 + 220) continue;
    const k = cx + ',' + cz; if (!loaded.has(k)) want.push([i * i + j * j, cx, cz, k]);
  }
  want.sort((a, b) => a[0] - b[0]);
  for (let n = 0; n < Math.min(want.length, loadBudget); n++) {
    const [, cx, cz, k] = want[n];
    const g = buildChunk(cx, cz);
    ensureCarLib();
    for (const p of parkedIn(cx, cz)) {
      if (p.taken) continue;
      const lib = carLib[Math.floor(p.seed * carLib.length)];
      const m = new THREE.Mesh(lib.geo, bakedMat); m.position.set(p.x, 0.17, p.z); m.rotation.y = p.rot; m.castShadow = true; g.add(m); p.mesh = m;
    }
    world.add(g); loaded.set(k, g);
  }
  for (const [k, g] of loaded) {
    const [cx, cz] = k.split(',').map(Number);
    if (Math.abs(cx - ccx) > radius + 1 || Math.abs(cz - ccz) > radius + 1) { world.remove(g); g.traverse(o => { if (o.isMesh && o.material !== bakedMat) o.geometry.dispose(); }); loaded.delete(k); }
  }
}

// ---------------- day / night
const KEYS = [
  [0, '#0c1330', '#46568f', '#14141f', 0.42, '#9fb4ff', 0.35, 1], [5, '#161a3c', '#535a8a', '#1c1c2a', 0.48, '#a6b4ff', 0.3, 1],
  [6.4, '#f2a27c', '#ffc9a2', '#4a3a40', 0.8, '#ffb070', 1.1, 0.5], [7.6, '#a8d8f0', '#e8f4ff', '#5a6a40', 1.15, '#fff0d8', 2.0, 0],
  [17, '#a8d8f0', '#e8f4ff', '#5a6a40', 1.15, '#fff0d8', 2.0, 0], [18.6, '#ff9c6c', '#ffc290', '#5a4040', 0.9, '#ff9a50', 1.35, 0.35],
  [19.8, '#4a2e6a', '#7a6aa0', '#2a2030', 0.6, '#c090ff', 0.45, 0.85], [21, '#0c1330', '#46568f', '#14141f', 0.42, '#9fb4ff', 0.35, 1],
  [24, '#0c1330', '#46568f', '#14141f', 0.42, '#9fb4ff', 0.35, 1],
];
const cA = new THREE.Color(), cB = new THREE.Color();
let night = 0;
function lerpCol(target, a, b, t) { target.copy(cA.set(a)).lerp(cB.set(b), t); }
function applyTime(h, px, pz) {
  let i = 0; while (i < KEYS.length - 2 && h >= KEYS[i + 1][0]) i++;
  const k0 = KEYS[i], k1 = KEYS[i + 1], t = clamp((h - k0[0]) / (k1[0] - k0[0]), 0, 1);
  lerpCol(G.scene.background, k0[1], k1[1], t); G.scene.fog.color.copy(G.scene.background);
  lerpCol(hemi.color, k0[2], k1[2], t); lerpCol(hemi.groundColor, k0[3], k1[3], t);
  hemi.intensity = k0[4] + (k1[4] - k0[4]) * t;
  lerpCol(sun.color, k0[5], k1[5], t); sun.intensity = k0[6] + (k1[6] - k0[6]) * t;
  night = k0[7] + (k1[7] - k0[7]) * t;
  const day = h >= 6 && h < 18.5, a = day ? (h - 6) / 12.5 * Math.PI : ((h + 5.5) % 24) / 11.5 * Math.PI;
  sun.position.set(px + Math.cos(a) * 70, 90 * Math.max(0.4, Math.sin(a)) + 25, pz + 40); sun.target.position.set(px, 0, pz);
  MATS.win.emissiveIntensity = night * 1.1; MATS.glow.emissiveIntensity = 0.15 + night * 1.6; MATS.pool.opacity = night * 0.28;
  lantern.intensity = night * 14;
  water.material.color.lerpColors(cA.set('#3e94d4'), cB.set('#173a66'), night);
}

// ---------------- particles
const particles = [], ppool = [], pgeo = new THREE.BoxGeometry(1, 1, 1);
function spawnParticles(x, y, z, color, n, spd = 4, life = 0.5, size = 0.12, grav = 10) {
  for (let i = 0; i < n; i++) {
    let m = ppool.pop(); if (!m) m = new THREE.Mesh(pgeo, new THREE.MeshBasicMaterial({ transparent: true }));
    m.material.color.set(Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color); m.material.opacity = 1;
    const s = size * rand(0.6, 1.3); m.scale.setScalar(s); m.position.set(x, y, z); dyn.add(m);
    const a = rand(0, Math.PI * 2), e = rand(-0.2, 1), v = rand(0.3, 1) * spd;
    particles.push({ m, vx: Math.cos(a) * v, vy: e * spd * 0.7, vz: Math.sin(a) * v, life: life * rand(0.6, 1.2), max: life, grav, s });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.life -= dt;
    if (p.life <= 0) { dyn.remove(p.m); ppool.push(p.m); particles.splice(i, 1); continue; }
    p.vy -= p.grav * dt; p.m.position.x += p.vx * dt; p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt); p.m.position.z += p.vz * dt;
    const k = p.life / p.max; p.m.material.opacity = Math.min(1, k * 2); p.m.scale.setScalar(p.s * (0.4 + k * 0.6));
  }
}

// ---------------- cash pickups
const cashDrops = [];
function dropCash(x, z, amt) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex('💵'), depthWrite: false }));
  s.scale.set(1.3, 1.3, 1); s.position.set(x, 0.8, z); dyn.add(s); cashDrops.push({ x, z, amt, s, t: 0 });
}
function updateCash(dt) {
  for (let i = cashDrops.length - 1; i >= 0; i--) {
    const c = cashDrops[i]; c.t += dt; c.s.position.y = 0.8 + Math.sin(c.t * 4) * 0.15;
    const d = Math.hypot(c.x - P.x, c.z - P.z);
    if (d < (ride ? 3 : 1.4)) { addMoney(c.amt, true); dyn.remove(c.s); cashDrops.splice(i, 1); }
    else if (d > 120 || c.t > 90) { dyn.remove(c.s); cashDrops.splice(i, 1); }
  }
}
function addMoney(n, quiet) { money += n; if (n > 0) { quiet ? sfx.coin() : sfx.cash(); floatMoney(n); } saveGame(); }
function spend(n) { money -= n; floatMoney(-n); sfx.cash(); saveGame(); }
function floatMoney(n) { const el = $('moneyFloat'); el.textContent = (n >= 0 ? '+' : '−') + fmt(Math.abs(n)); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }

// ================================================================ player & weapons
const P = { hp: 100, dead: false, deadT: 0, hurtT: 99, hitCd: 0, kx: 0, kz: 0, x: SPAWN.x, z: SPAWN.z, y: 0, vy: 0, face: Math.PI, phase: 0, recoil: 0, fireCd: 0, burst: 0, burstT: 0, reload: 0, flash: 0, swing: 0, swingHit: false };
let hero = null, heroRoot = null, heroW = null, ws = null, muzzleFlash = null;
const am = () => arsenal.ammo[arsenal.cur];
function buildHero() {
  if (heroRoot) { dyn.remove(heroRoot); disposeObject(heroRoot); }
  hero = buildCharacter(charCfg); heroW = null;
  heroRoot = new THREE.Group(); heroRoot.add(hero.root); dyn.add(heroRoot);
  hero.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  if (!muzzleFlash) { muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); dyn.add(muzzleFlash); muzzleFlash.visible = false; }
  equipWeapon();
  heroRoot.visible = !ride && !P.dead;
}
function equipWeapon() {
  if (heroW) { heroW.group.parent?.remove(heroW.group); disposeObject(heroW.group); heroW = null; }
  const id = arsenal.cur; ws = slotStats(id, arsenal.cfg[id]);
  if (id !== 'fist') { heroW = buildWeaponModel(id, arsenal.cfg[id]); heroW.group.rotation.x = Math.PI / 2; hero.hand.add(heroW.group); heroW.group.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
  const a = am(); if (ws.mag && a.mag > ws.mag) { a.res += a.mag - ws.mag; a.mag = ws.mag; }
  P.reload = 0; P.burst = 0; P.fireCd = 0.15;
  hudCache.wpn = null;
}
function hasAmmo(id) { const a = arsenal.ammo[id]; return a.mag + a.res > 0; }
function selectWeapon(id) {
  if (!arsenal.owned.includes(id)) { toast(`🔒 ${SLOT[id].name} — buy one at 🔫 Bay Arms`); sfx.fail(); return; }
  if (id !== 'fist') arsenal.last = id;
  arsenal.cur = id; equipWeapon(); sfx.equip(); saveGame();
}
function holsterToggle() { selectWeapon(arsenal.cur === 'fist' ? (arsenal.owned.includes(arsenal.last) ? arsenal.last : 'fist') : 'fist'); }
function finishReload() { const a = am(), take = Math.min(ws.mag - a.mag, a.res); a.mag += take; a.res -= take; }
function startReload() { const a = am(); if (P.reload <= 0 && a.res > 0 && a.mag < ws.mag) P.reload = ws.reload; }

const vehicles = [];
let ride = null, myCar = null, headSpot = null, headTarget = null;
function makeVehicle(cfg, x, z, h, personal) {
  const b = buildCar(cfg); dyn.add(b.group);
  const v = { cfg, b, st: computeCarStats(cfg), s: { x, z, h, v: 0, vx: 0, vz: 0, steer: 0, braking: false }, personal };
  vehicles.push(v); placeVehicle(v); return v;
}
function removeVehicle(v) { dyn.remove(v.b.group); disposeObject(v.b.group); vehicles.splice(vehicles.indexOf(v), 1); if (ride === v) ride = null; }
function rebuildMyCar() {
  const s = myCar ? { ...myCar.s } : { x: SPAWN.carX, z: SPAWN.carZ, h: SPAWN.carH }, wasRiding = myCar && ride === myCar;
  if (myCar) removeVehicle(myCar);
  myCar = makeVehicle(carCfg, s.x, s.z, s.h, true);
  if (wasRiding) ride = myCar;
  if (!headSpot) { headSpot = new THREE.SpotLight('#fff4dd', 0, 45, 0.55, 0.6, 1.2); headTarget = new THREE.Object3D(); G.scene.add(headSpot, headTarget); headSpot.target = headTarget; }
}
function placeVehicle(v) { const s = v.s, g = v.b.group; g.position.set(s.x, roadAt(s.x, s.z) ? 0.04 : Math.max(groundH(s.x, s.z), 0), s.z); g.rotation.y = s.h; }

// ---------------- traffic
const traffic = [];
function cityNear(x, z, m = 140) { let best = null, bd = 1e9; for (const c of CITIES) { const dx = Math.max(c.x0 - x, 0, x - c.x1), dz = Math.max(c.z0 - z, 0, z - c.z1), d = Math.hypot(dx, dz); if (d < bd) { bd = d; best = c; } } return bd < m ? best : null; }
function trafficPose(t) { const fx = t.axis === 'x' ? t.dir : 0, fz = t.axis === 'z' ? t.dir : 0; t.fx = fx; t.fz = fz; t.x = (t.axis === 'x' ? t.pos : t.line) - fz * 3; t.z = (t.axis === 'z' ? t.pos : t.line) + fx * 3; t.h = Math.atan2(fx, fz); }
function spawnTraffic(px, pz) {
  const c = cityNear(px, pz); if (!c) return;
  for (let tries = 0; tries < 14; tries++) {
    const ix = c.kx[0] + Math.floor(Math.random() * (c.kx[1] - c.kx[0] + 1)), iz = c.kz[0] + Math.floor(Math.random() * (c.kz[1] - c.kz[0] + 1));
    const nx = c.cx + ix * 48, nz = c.cz + iz * 48, d = Math.hypot(nx - px, nz - pz);
    if (d < 40 || d > 130) continue;
    const axis = Math.random() < 0.5 ? 'x' : 'z', k = axis === 'x' ? ix : iz, range = axis === 'x' ? c.kx : c.kz;
    let dir = Math.random() < 0.5 ? 1 : -1; if (k + dir > range[1] || k + dir < range[0]) dir = -dir;
    ensureCarLib();
    const lib = carLib[Math.floor(Math.random() * carLib.length)];
    const mesh = new THREE.Mesh(lib.geo, bakedMat); mesh.castShadow = true; dyn.add(mesh);
    const t = { c, lib, axis, line: axis === 'x' ? nz : nx, pos: axis === 'x' ? nx : nz, dir, next: (axis === 'x' ? nx : nz) + dir * 48, speed: 0, cruise: rand(8, 13), mesh, stun: 0, honk: 0 };
    trafficPose(t); t.rx = t.x; t.rz = t.z; t.rh = t.h; traffic.push(t); return;
  }
}
function updateTraffic(dt) {
  const ox = P.x, oz = P.z;
  if (traffic.length < (cityNear(ox, oz) ? 12 : 0)) spawnTraffic(ox, oz);
  for (let i = traffic.length - 1; i >= 0; i--) {
    const t = traffic[i];
    if (Math.hypot(t.x - ox, t.z - oz) > 170) { dyn.remove(t.mesh); traffic.splice(i, 1); continue; }
    let block = false;
    const check = (x, z, rad) => { const dx = x - t.x, dz = z - t.z, al = dx * t.fx + dz * t.fz, lat = Math.abs(-dx * t.fz + dz * t.fx); if (al > 0 && al < 7 + t.speed * 0.4 && lat < rad) block = true; };
    check(ox, oz, ride ? 2.6 : 1.8);
    for (const o of traffic) if (o !== t && o.axis === t.axis && o.dir === t.dir) check(o.x, o.z, 1.6);
    for (const p of peds.list) if (p.state === 'cross' || p.state === 'flee' || p.state === 'talk') check(p.x, p.z, 1.6);
    t.stun -= dt; t.honk -= dt;
    const want = block || t.stun > 0 ? 0 : t.cruise;
    t.speed = damp(t.speed, want, want < t.speed ? 6 : 1.2, dt);
    if (block && t.honk <= 0 && Math.random() < 0.01) { t.honk = 4; if (Math.hypot(t.x - ox, t.z - oz) < 30) sfx.horn(); }
    t.pos += t.dir * t.speed * dt;
    if ((t.dir > 0 && t.pos >= t.next) || (t.dir < 0 && t.pos <= t.next)) {
      const node = t.next, c = t.c;
      const idxAlong = Math.round((node - (t.axis === 'x' ? c.cx : c.cz)) / 48), idxLine = Math.round((t.line - (t.axis === 'x' ? c.cz : c.cx)) / 48);
      const rA = t.axis === 'x' ? c.kx : c.kz, rL = t.axis === 'x' ? c.kz : c.kx, opts = [];
      if (idxAlong + t.dir >= rA[0] && idxAlong + t.dir <= rA[1]) opts.push('s', 's');
      if (idxLine + 1 <= rL[1]) opts.push('+'); if (idxLine - 1 >= rL[0]) opts.push('-');
      const ch = opts.length ? pick(opts) : 'u';
      if (ch === 's') t.next = node + t.dir * 48;
      else if (ch === 'u') { t.dir = -t.dir; t.next = node + t.dir * 48; }
      else { const nd = ch === '+' ? 1 : -1, oldLine = t.line; t.axis = t.axis === 'x' ? 'z' : 'x'; t.line = node; t.pos = oldLine; t.dir = nd; t.next = oldLine + nd * 48; }
    }
    trafficPose(t);
    t.rx = damp(t.rx, t.x, 7, dt); t.rz = damp(t.rz, t.z, 7, dt); t.rh += wrapA(t.h - t.rh) * (1 - Math.exp(-7 * dt));
    t.mesh.position.set(t.rx, 0.04, t.rz); t.mesh.rotation.y = t.rh;
    if (t.speed > 3) for (const p of peds.list) if (Math.hypot(p.x - t.rx, p.z - t.rz) < 1.8 && peds.knock(p, t.fx, t.fz, t.speed * 0.7)) { sfx.thud(); t.stun = 2; }
    if (ride) {
      const s = ride.s, dx = s.x - t.rx, dz = s.z - t.rz, d = Math.hypot(dx, dz);
      if (d < 3.2 && d > 0.01) { s.x += dx / d * (3.2 - d); s.z += dz / d * (3.2 - d); if (Math.abs(s.v) > 6) { spawnParticles(t.rx + dx / 2, 0.8, t.rz + dz / 2, ['#ffd23f', '#ffffff'], 6, 4, 0.3, 0.1); shake = 0.3; t.stun = 2; sfx.thud(); } s.v *= 0.6; s.vx *= 0.6; s.vz *= 0.6; }
    } else {
      const dx = P.x - t.rx, dz = P.z - t.rz, d = Math.hypot(dx, dz);
      if (d < 2.0 && d > 0.01 && !P.dead) { P.x = t.rx + dx / d * 2.0; P.z = t.rz + dz / d * 2.0; if (t.speed > 4 && P.hitCd <= 0) { hurt(t.speed * 2.6); sfx.thud(); P.hitCd = 1; P.kx = dx / d * t.speed * 0.9; P.kz = dz / d * t.speed * 0.9; P.vy = 5; t.stun = 2.5; t.speed = 0; } }
    }
  }
}

// ---------------- bullets, rockets, grenades, explosions
const tmpV = new THREE.Vector3();
const bullets = [], bpool = [], bgeo = new THREE.BoxGeometry(0.06, 0.06, 0.7);
function shoot() {
  const s = ws; heroW.muzzle.getWorldPosition(tmpV);
  for (let i = 0; i < s.pellets; i++) {
    const a = P.face + (Math.random() - 0.5) * s.spread * DEG * (1 + P.recoil);
    let m = bpool.pop(); if (!m) m = new THREE.Mesh(bgeo, new THREE.MeshBasicMaterial());
    m.material.color.set(s.tracer); m.position.copy(tmpV); m.rotation.set(0, a, 0); dyn.add(m);
    bullets.push({ x: tmpV.x, y: tmpV.y, z: tmpV.z, vx: Math.sin(a) * s.speed, vz: Math.cos(a) * s.speed, life: s.range / s.speed, m, ammo: s.ammo });
  }
  am().mag--; P.recoil = Math.min(1, P.recoil + s.recoil * 0.5); shake = Math.max(shake, s.recoil * 0.1);
  flash(tmpV, (s.quiet ? 0.4 : 0.8) * (0.8 + s.dmg / 80), s.energy ? s.tracer : '#ffffff', s.quiet ? 3 : 8);
  sfx.shot(s.quiet, s.energy);
  if (!s.quiet) peds.scare(P.x, P.z, 26);
  if (!s.energy) spawnParticles(tmpV.x, tmpV.y, tmpV.z, '#e6b422', 1, 2, 0.5, 0.05, 14);
}
function flash(pos, size, col, light) { P.flash = 0.05; muzzleFlash.position.copy(pos); muzzleFlash.scale.set(size, size, 1); muzzleFlash.material.color.set(col); muzzleLight.position.copy(pos); muzzleLight.intensity = light; }
function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i], steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vz) * dt / 0.4));
    let dead = false;
    for (let k = 0; k < steps && !dead; k++) {
      b.x += b.vx * dt / steps; b.z += b.vz * dt / steps;
      if (solidPoint(b.x, b.z, b.y)) dead = true;
      for (const t of traffic) if (Math.hypot(t.rx - b.x, t.rz - b.z) < 1.6 && b.y < 2) { dead = true; t.stun = 3; }
      for (const p of peds.list) if (p.state !== 'down' && Math.hypot(p.x - b.x, p.z - b.z) < 0.6) {
        dead = true; const d = Math.hypot(b.vx, b.vz); peds.knock(p, b.vx / d, b.vz / d, 4); peds.scare(p.x, p.z, 20);
        spawnParticles(b.x, b.y, b.z, ['#ffffff', '#ffd23f'], 4, 2, 0.3, 0.08); if (Math.random() < 0.5) dropCash(p.x, p.z, 5 + Math.floor(Math.random() * 30)); break;
      }
      if (dead) {
        if (b.ammo === 'explosive') explode(b.x, b.y, b.z, 2.2, 0.35);
        else spawnParticles(b.x, b.y, b.z, b.ammo === 'frost' ? ['#bff4ff', '#6fd8ff'] : b.ammo === 'incendiary' ? ['#ffb02e', '#ff5a1f'] : ['#ffe08a', '#ffffff'], 4, 3, 0.35, 0.07, 6);
      }
    }
    b.life -= dt;
    if (dead || b.life <= 0) { dyn.remove(b.m); bpool.push(b.m); bullets.splice(i, 1); continue; }
    b.m.position.set(b.x, b.y, b.z);
  }
}
const projectiles = [];
const rocketGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.55, 8).rotateX(Math.PI / 2), rocketMat = new THREE.MeshStandardMaterial({ color: '#55602f', emissive: '#ff8a2a', emissiveIntensity: 0.4 });
const nadeGeo = new THREE.IcosahedronGeometry(0.12, 0), nadeMat = new THREE.MeshStandardMaterial({ color: '#55602f', flatShading: true });
function fireRocket() {
  heroW.muzzle.getWorldPosition(tmpV);
  const m = new THREE.Mesh(rocketGeo, rocketMat); m.position.copy(tmpV); m.rotation.y = P.face; dyn.add(m);
  projectiles.push({ kind: 'rocket', x: tmpV.x, y: tmpV.y, z: tmpV.z, vx: Math.sin(P.face) * ws.speed, vz: Math.cos(P.face) * ws.speed, vy: 0, life: ws.range / ws.speed, m });
  am().mag--; flash(tmpV, 1.4, '#ffd080', 10); sfx.launch(); shake = Math.max(shake, 0.3); P.recoil = 1;
  peds.scare(P.x, P.z, 30);
}
function throwGrenade() {
  hero.hand.getWorldPosition(tmpV);
  const m = new THREE.Mesh(nadeGeo, nadeMat); m.position.copy(tmpV); m.castShadow = true; dyn.add(m);
  projectiles.push({ kind: 'nade', x: tmpV.x, y: tmpV.y + 0.3, z: tmpV.z, vx: Math.sin(P.face) * 12, vz: Math.cos(P.face) * 12, vy: 6.5, life: 1.9, m });
  am().res--; sfx.whoosh();
}
function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; p.life -= dt;
    let boom = p.life <= 0;
    if (p.kind === 'rocket') {
      const steps = 4;
      for (let k = 0; k < steps && !boom; k++) {
        p.x += p.vx * dt / steps; p.z += p.vz * dt / steps;
        if (solidPoint(p.x, p.z, p.y)) boom = true;
        for (const t of traffic) if (Math.hypot(t.rx - p.x, t.rz - p.z) < 1.8) boom = true;
        for (const v of vehicles) if (v !== ride && Math.hypot(v.s.x - p.x, v.s.z - p.z) < 1.8) boom = true;
        for (const q of peds.list) if (Math.hypot(q.x - p.x, q.z - p.z) < 0.8) boom = true;
      }
      if (Math.random() < 0.8) spawnParticles(p.x, p.y, p.z, ['#9a9a9a', '#cfcfcf', '#ffb02e'], 1, 0.5, 0.7, 0.3, -1.5);
    } else {
      p.vy -= 22 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const gy = baseY(p.x, p.z) + 0.12;
      if (p.y < gy) { p.y = gy; p.vy = Math.abs(p.vy) * 0.35; p.vx *= 0.6; p.vz *= 0.6; if (Math.abs(p.vy) > 1) sfx.click(); }
      if (solidPoint(p.x, p.z, p.y)) { p.vx *= -0.4; p.vz *= -0.4; p.x += p.vx * dt * 2; p.z += p.vz * dt * 2; }
      p.m.rotation.x += dt * 10;
    }
    p.m.position.set(p.x, p.y, p.z);
    if (boom) { explode(p.x, p.y, p.z, p.kind === 'rocket' ? 6 : 5.5, 1); dyn.remove(p.m); projectiles.splice(i, 1); }
  }
}
function explode(x, y, z, r, power) {
  spawnParticles(x, y + 0.5, z, ['#ffd23f', '#ff8a2a', '#ff4d2a', '#ffffff'], Math.round(30 * power) + 6, 9 * power + 3, 0.6, 0.35 * power + 0.15, 4);
  spawnParticles(x, y + 0.5, z, ['#3a3040', '#5a5060', '#777'], Math.round(16 * power) + 3, 3, 1.3, 0.6 * power + 0.2, -2);
  boomLight.position.set(x, y + 2, z); boomLight.intensity = 60 * power;
  shake = Math.max(shake, 0.25 + 0.6 * power); sfx.boom(); navigator.vibrate?.([40, 20, 80]);
  if (power < 0.5) return;
  for (const p of peds.list) { const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz); if (d < r) { peds.knock(p, dx / (d || 1), dz / (d || 1), 14 * (1 - d / r) + 3); if (Math.random() < 0.4) dropCash(p.x, p.z, 10 + Math.floor(Math.random() * 40)); } }
  peds.scare(x, z, 45);
  for (const t of traffic) if (Math.hypot(t.rx - x, t.rz - z) < r + 2) { t.stun = 6; t.speed = 0; spawnParticles(t.rx, 1.2, t.rz, ['#ff8a2a', '#333'], 8, 3, 0.8, 0.3, -1); }
  for (const v of vehicles) { const dx = v.s.x - x, dz = v.s.z - z, d = Math.hypot(dx, dz); if (d < r + 2) { v.s.vx += dx / (d || 1) * 10; v.s.vz += dz / (d || 1) * 10; } }
  const f = focusPos(), d = Math.hypot(f.x - x, f.z - z);
  if (d < r) hurt((ride ? 30 : 70) * (1 - d / r));
}
function meleeHit() {
  const fx = Math.sin(P.face), fz = Math.cos(P.face);
  let hit = false;
  for (const p of peds.list) {
    const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz);
    if (d < ws.reach && (dx * fx + dz * fz) / (d || 1) > 0.35 && peds.knock(p, fx, fz, ws.power)) { hit = true; spawnParticles(p.x, 1.4, p.z, ['#ffffff', '#ffd23f'], 6, 3, 0.3, 0.08); if (Math.random() < 0.35) dropCash(p.x, p.z, 5 + Math.floor(Math.random() * 25)); peds.scare(p.x, p.z, 14); }
  }
  for (const t of traffic) if (Math.hypot(t.rx - P.x, t.rz - P.z) < ws.reach + 1.4) { t.stun = 2; t.honk = 0; hit = true; }
  if (hit) { sfx.punch(); shake = Math.max(shake, 0.15); navigator.vibrate?.(15); }
}

// ---------------- health
let time = 0, clockH = 8, dayN = 1, shake = 0, saveT = 0, toastT = 0, hurtFlash = 0, timeScale = 1;
function toast(msg, dur = 2.4) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); toastT = dur; }
function hurt(d) { if (P.dead || d <= 0) return; P.hp = Math.max(0, P.hp - d); P.hurtT = 0; hurtFlash = 0.35; shake = Math.max(shake, 0.3); navigator.vibrate?.(30); if (P.hp <= 0) die(); }
function die() {
  P.dead = true; P.deadT = 3.2; if (ride) exitCar();
  const lost = Math.floor(money * 0.1); money -= lost;
  $('deathScreen').querySelector('span').textContent = `Hospital bill: ${fmt(lost)}. Waking up…`;
  $('deathScreen').classList.add('on');
}
function homeSpot() {
  let best = null, bd = 1e9;
  for (const p of PROPERTIES) if (owned.has(p.id)) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; best = p; } }
  return best ? { x: best.x, z: best.z, name: best.name } : { x: SPAWN.x, z: SPAWN.z, name: 'Downtown Clinic' };
}
function respawn() {
  const h = homeSpot();
  P.dead = false; P.hp = 100; P.hurtT = 99; P.kx = P.kz = 0;
  Object.assign(P, { x: h.x, z: h.z, face: Math.PI }); P.y = baseY(P.x, P.z);
  heroRoot.visible = true; hero.root.rotation.x = 0;
  $('deathScreen').classList.remove('on'); updateCamera(0, true); toast(`You woke up at ${h.name}`);
}
function updateHealth(dt) {
  P.hurtT += dt; P.hitCd -= dt;
  if (!P.dead && P.hurtT > 6 && P.hp < 100) P.hp = Math.min(100, P.hp + 4 * dt);
  if (P.dead) { P.deadT -= dt; if (P.deadT <= 0) respawn(); }
  hurtFlash = Math.max(0, hurtFlash - dt);
  const low = P.hp < 40 ? (1 - P.hp / 40) : 0, rate = 1.2 + low * 1.6, ph = (time * rate) % 1;
  const beat = Math.max(Math.exp(-ph * 9), 0.7 * Math.exp(-Math.abs(ph - 0.22) * 14));
  $('hurt').style.opacity = Math.min(1, low * (0.35 + 0.65 * beat) + hurtFlash * 2.2).toFixed(3);
}

// ---------------- on foot
function baseY(x, z) { if (onPier(x, z)) return 0.28; if (roadAt(x, z)) return 0.04; if (cityAt(x, z, -6)) return 0.17; return groundH(x, z); }
function updateFoot(dt) {
  const st = P.dead ? { x: 0, y: 0, m: 0 } : input.stick;
  P.x += P.kx * dt; P.z += P.kz * dt; P.kx = damp(P.kx, 0, 4, dt); P.kz = damp(P.kz, 0, 4, dt);
  const sp = (st.m > 0.85 ? 7.2 : 4.6) * st.m * (ws.mob || 1), ox = P.x, oz = P.z;
  if (st.m > 0.1) { const mx = st.x / st.m, mz = -st.y / st.m; P.x += mx * sp * dt; P.z += mz * sp * dt; P.face += wrapA(Math.atan2(mx, mz) - P.face) * (1 - Math.exp(-14 * dt)); }
  resolve(P, 0.4, Math.max(0, P.y - baseY(P.x, P.z)));
  for (const p of peds.list) { const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz); if (d < 0.7 && d > 0.01 && p.state !== 'down') { p.x -= dx / d * (0.7 - d); p.z -= dz / d * (0.7 - d); } }
  for (const n of npcs) { const dx = P.x - n.x, dz = P.z - n.z, d = Math.hypot(dx, dz); if (d < 0.75 && d > 0.01) { P.x = n.x + dx / d * 0.75; P.z = n.z + dz / d * 0.75; } }
  if (!walkable(P.x, P.z)) { P.x = ox; P.z = oz; }
  const gy = baseY(P.x, P.z);
  if (input.consume('b') && P.y <= gy + 0.01 && !P.dead) P.vy = 7.5;
  P.vy -= 24 * dt; P.y += P.vy * dt; if (P.y <= gy) { P.y = gy; P.vy = 0; }
  // ---- weapon use
  P.fireCd -= dt; P.burstT -= dt; P.recoil = Math.max(0, P.recoil - dt * 4); P.swing = Math.max(0, P.swing - dt);
  const a = am(), kind = ws.kind, firing = !P.dead && input.held('x');
  if (kind === 'gun' || kind === 'rpg') {
    if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) finishReload(); }
    if (input.consume('y')) startReload();
    if (kind === 'rpg') { if (firing && P.fireCd <= 0 && P.reload <= 0) { if (a.mag > 0) { fireRocket(); P.fireCd = 1 / ws.rof; } else if (a.res > 0) startReload(); else if (input.consume('x')) { sfx.fail(); toast('Out of rockets'); } } }
    else if (P.burst > 0) { if (P.burstT <= 0 && a.mag > 0) { shoot(); P.burst--; P.burstT = 0.07; if (!P.burst) P.fireCd = 1.6 / ws.rof; } if (a.mag <= 0) P.burst = 0; }
    else if (firing && P.fireCd <= 0 && P.reload <= 0) {
      if (a.mag <= 0) { if (a.res > 0) startReload(); else if (input.consume('x')) { sfx.click(); toast('Out of ammo — buy more at 🔫 Bay Arms'); } }
      else if (ws.mode === 'burst') { P.burst = 3; P.burstT = 0; }
      else { shoot(); P.fireCd = 1 / ws.rof; }
    }
    if (a.mag <= 0 && a.res > 0 && P.reload <= 0 && !P.burst) startReload();
  } else if (kind === 'melee') {
    input.consume('y');
    if (firing && P.fireCd <= 0) { P.swing = 0.3; P.swingHit = false; P.fireCd = ws.cd; sfx.whoosh(); }
    if (P.swing > 0 && P.swing < 0.18 && !P.swingHit) { P.swingHit = true; meleeHit(); }
  } else if (kind === 'grenade') {
    input.consume('y');
    if (input.consume('x') && P.fireCd <= 0 && !P.dead) { if (a.res > 0) { P.swing = 0.35; P.swingHit = false; P.fireCd = 1 / ws.rof; } else { sfx.fail(); toast('No grenades — buy some at 🔫 Bay Arms'); } }
    if (P.swing > 0 && P.swing < 0.2 && !P.swingHit) { P.swingHit = true; throwGrenade(); if (a.res <= 0) { toast('Out of grenades'); } }
  }
  input.consume('x');
  if (input.consume('a') && !P.dead && action) doAction(action);
  // ---- pose
  const moved = Math.hypot(P.x - ox, P.z - oz) / Math.max(dt, 1e-4);
  P.phase += dt * moved * 1.8;
  heroRoot.position.set(P.x, P.y, P.z); hero.root.rotation.y = P.face;
  hero.root.rotation.x = P.dead ? damp(hero.root.rotation.x, -Math.PI / 2, 8, dt) : 0;
  const gunReady = (kind === 'gun' || kind === 'rpg') && (firing || P.fireCd > -0.6);
  poseCharacter(hero, { phase: P.phase, speed: Math.min(1, moved / 7), air: P.y > gy + 0.05, aim: gunReady ? 0 : -0.55, recoil: P.recoil, t: time });
  if (kind === 'melee' || kind === 'grenade') {
    const sw = Math.sin(P.phase) * Math.min(1, moved / 5) * 0.6;
    hero.armL.pivot.rotation.set(sw, 0, -0.08);
    if (P.swing > 0) {
      const k = 1 - P.swing / (kind === 'grenade' ? 0.35 : 0.3);
      if (kind === 'grenade') hero.armR.pivot.rotation.set(k < 0.5 ? 0.9 + k * 1.2 : 1.5 - (k - 0.5) * 6.4, 0, 0.1);
      else if (arsenal.cur === 'bat') hero.armR.pivot.rotation.set(-1.6, 1.2 - k * 2.6, 0.2);
      else hero.armR.pivot.rotation.set(-1.55 * Math.sin(k * Math.PI), 0, 0.15);
    } else hero.armR.pivot.rotation.set(-sw, 0, 0.08);
  }
  if (P.reload > 0 && ws.reload) { const k = Math.sin(Math.min(1, 1 - P.reload / ws.reload) * Math.PI); hero.armR.pivot.rotation.x += k * 0.9; hero.armL.pivot.rotation.x += k * 1.2; }
  heroRoot.updateMatrixWorld(true);
  P.flash -= dt; muzzleFlash.visible = P.flash > 0; muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 90);
}

// ---------------- vehicles
function enterVehicle(v) {
  ride = v; heroRoot.visible = false; muzzleFlash.visible = false; audio();
  radioOn(true);
  toast(v.personal ? (carCfg.name || 'Your car') : `${BODIES[v.cfg.body]?.label || 'Car'} (stolen)`, 1.6);
}
function exitCar() {
  const v = ride; if (!v) return;
  const s = v.s, h = s.h, lx = Math.cos(h), lz = -Math.sin(h);
  const spots = [[lx * 2.4, lz * 2.4], [-lx * 2.4, -lz * 2.4], [-Math.sin(h) * 3.8, -Math.cos(h) * 3.8], [Math.sin(h) * 3.8, Math.cos(h) * 3.8]];
  let placed = false;
  for (const [dx, dz] of spots) { const p = { x: s.x + dx, z: s.z + dz }; if (!walkable(p.x, p.z)) continue; const bx = p.x, bz = p.z; resolve(p, 0.4, 0); if (Math.hypot(p.x - bx, p.z - bz) < 0.6) { P.x = p.x; P.z = p.z; placed = true; break; } }
  if (!placed) { P.x = s.x + lx * 2.4; P.z = s.z + lz * 2.4; }
  ride = null; P.y = baseY(P.x, P.z); heroRoot.visible = !P.dead; P.face = h;
  s.v = 0; s.vx = s.vz = 0; radioOn(false);
}
function jackTraffic(t) {
  traffic.splice(traffic.indexOf(t), 1); dyn.remove(t.mesh);
  const v = makeVehicle(t.lib.cfg, t.rx, t.rz, t.rh, false);
  peds.spawnLoose(t.rx + Math.cos(t.rh) * 2.4, t.rz - Math.sin(t.rh) * 2.4, P.x, P.z);
  peds.scare(t.rx, t.rz, 15); enterVehicle(v); sfx.thud();
}
async function breakIntoParked(p) {
  setState('mini');
  const r1 = await runMinigame('smash');
  if (!r1.win) { setState('play'); toast(r1.quit ? 'You walked away' : '🚨 Car alarm! Better leave it.'); if (!r1.quit) peds.scare(p.x, p.z, 30); return; }
  const r2 = await runMinigame('hotwire', { wires: Math.random() < 0.35 ? 4 : 3 });
  setState('play');
  if (!r2.win) { toast(r2.quit ? 'You walked away' : '🚨 Too slow, the alarm went off!'); peds.scare(p.x, p.z, 30); return; }
  p.taken = true; if (p.mesh) p.mesh.parent?.remove(p.mesh); removeCollider(p.col);
  ensureCarLib(); enterVehicle(makeVehicle(carLib[Math.floor(p.seed * carLib.length)].cfg, p.x, p.z, p.rot, false));
}
const carPos = { x: 0, z: 0 };
function updateVehicles(dt) {
  for (const v of [...vehicles]) {
    const c = v.s, s = v.st, b = v.b, driving = v === ride;
    if (!driving && Math.abs(c.v) < 0.05 && Math.abs(c.vx) + Math.abs(c.vz) < 0.05) { if (!v.personal && Math.hypot(c.x - P.x, c.z - P.z) > 220) removeVehicle(v); continue; }
    c.braking = false;
    if (driving && !P.dead) {
      const st = input.stick;
      const gas = input.held('b') || input.keys.has('KeyW') || input.keys.has('ArrowUp');
      const brk = input.held('x') || input.keys.has('KeyS') || input.keys.has('ArrowDown');
      const onRoad = !!roadAt(c.x, c.z), sand = c.z > sandLine(c.x), hill = c.x < -300 && !onRoad;
      const top = s.top * (onRoad ? 1 : Math.min(1, (sand ? 0.45 : hill ? 0.55 : 0.65) * s.off));
      if (gas && !brk) { if (c.v < -0.3) c.v = Math.min(0, c.v + 16 * dt); else if (c.v < top) c.v = Math.min(top, c.v + s.acc * dt * (1 - Math.max(0, c.v) / (s.top * 1.15))); }
      else if (brk) { if (c.v > 0.3) { c.v = Math.max(0, c.v - 18 * dt); c.braking = true; } else c.v = Math.max(-s.top * 0.32, c.v - s.acc * 0.6 * dt); }
      else c.v = damp(c.v, 0, 0.8, dt);
      if (c.v > top + 0.5) c.v = damp(c.v, top, 1.5, dt);
      c.steer = damp(c.steer, clamp(-st.x, -1, 1), 9, dt);
      if (input.consume('y')) sfx.horn();
      input.consume('b'); input.consume('x');
      if (input.consume('a')) { if (action) doAction(action); else exitCar(); }
    } else { c.v = damp(c.v, 0, 3, dt); c.steer = damp(c.steer, 0, 6, dt); }
    const spd = Math.abs(c.v);
    const turn = c.steer * s.turn * clamp(spd / 6, 0, 1) * (1 - Math.min(0.45, spd / s.top * 0.45)) * Math.sign(c.v || 1);
    c.h = wrapA(c.h + turn * dt);
    const fx = Math.sin(c.h), fz = Math.cos(c.h);
    const grip = (c.braking && spd > 12 && Math.abs(c.steer) > 0.3 ? 1.8 : 7) * s.grip;
    c.vx = damp(c.vx, fx * c.v, grip, dt); c.vz = damp(c.vz, fz * c.v, grip, dt);
    const ox = c.x, oz = c.z; c.x += c.vx * dt; c.z += c.vz * dt;
    const half = b.length * 0.3, r = b.width * 0.55;
    let hit = false;
    for (const sgn of [1, -1]) { carPos.x = c.x + fx * half * sgn; carPos.z = c.z + fz * half * sgn; if (resolve(carPos, r, 0)) { c.x = carPos.x - fx * half * sgn; c.z = carPos.z - fz * half * sgn; hit = true; } }
    if (!walkable(c.x, c.z, false)) { c.x = ox; c.z = oz; hit = true; }
    if (hit) { if (spd > 9) { spawnParticles(c.x + fx * 2, 0.7, c.z + fz * 2, ['#ffd23f', '#ffffff', '#888'], 10, 5, 0.4, 0.1); shake = Math.max(shake, Math.min(0.6, spd / 40)); sfx.thud(); } if (driving && spd > 15) hurt((spd - 15) * 1.6); c.v *= -0.25; c.vx *= 0.2; c.vz *= 0.2; }
    if (driving && spd > 4) for (const p of peds.list) if (Math.hypot(p.x - c.x, p.z - c.z) < r + 0.9 && peds.knock(p, c.vx / spd, c.vz / spd, spd * 0.8)) { sfx.thud(); c.v *= 0.85; if (Math.random() < 0.4) dropCash(p.x, p.z, 5 + Math.floor(Math.random() * 25)); peds.scare(p.x, p.z, 20); }
    if (c.braking && spd > 12) spawnParticles(c.x - fx * 1.8, 0.2, c.z - fz * 1.8, '#d8d8d8', 1, 1, 0.6, 0.35, -1);
    placeVehicle(v);
    b.group.rotation.z = clamp((-c.vx * fz + c.vz * fx) * 0.012, -0.08, 0.08);
    for (const w of b.wheels) { w.spin.rotation.x += c.v * dt / b.wr; if (w.front) w.pivot.rotation.y = c.steer * 0.45; }
  }
  const lv = ride || myCar, on = night > 0.25;
  for (const v of vehicles) { v.b.headM.emissiveIntensity = on ? 2.2 : 0.4; v.b.tailM.emissiveIntensity = (v.s.braking || v.s.v < -0.5) ? 2.5 : on ? 1.2 : 0.4; if (v.b.glow) v.b.glow.material.opacity = 0.35 + night * 0.4; }
  if (lv) { const s = lv.s, fx = Math.sin(s.h), fz = Math.cos(s.h); headSpot.intensity = on && ride ? 60 : 0; headSpot.position.set(s.x + fx * lv.b.length * 0.5, 1.0, s.z + fz * lv.b.length * 0.5); headTarget.position.set(s.x + fx * 18, 0, s.z + fz * 18); }
  engineSound(!!ride, ride ? Math.abs(ride.s.v) : 0);
}

// ================================================================ places, NPCs, markers
const markers = [];
function makeMarker(x, z, icon, color, data) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(data.car ? 3.2 : 1.5, data.car ? 3.8 : 1.9, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3; g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(data.car ? 3.2 : 1.5, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.29; g.add(disc);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(icon, 'rgba(20,18,38,.85)'), depthWrite: false }));
  sp.scale.set(2.4, 2.4, 1); sp.position.y = data.npc ? 4.4 : 3.4; g.add(sp);
  g.position.set(x, Math.max(groundH(x, z), 0) + (roadAt(x, z) ? 0 : cityAt(x, z, -6) ? 0.15 : 0), z);
  G.scene.add(g);
  const m = { x, z, g, ring, sp, icon, color, baseY: sp.position.y, ...data }; markers.push(m); return m;
}
const PLACE_COLORS = { dealer: '#4cd964', clothes: '#ff6fb5', barber: '#38e8ff', game: '#ffd23f', chop: '#ff8a2a', race: '#ff3b4a', property: '#b26bff', guns: '#ff5a3c' };
// NPC looks per role
const SKINS = ['#f6c9a4', '#e8b088', '#d39a6a', '#b77a4b', '#8d5524', '#6b3f22', '#452a1a'];
function npcCfg(place, i) {
  const r = n => { let s = (i + 1) * 9301 + n * 49297; return (s % 233280) / 233280; };
  const skin = SKINS[Math.floor(r(1) * SKINS.length)], hairColor = ['#141414', '#3b2416', '#6b4423', '#d8b26e'][Math.floor(r(2) * 4)];
  const base = { ...DEFAULT_CHAR, skin, hairColor, mask: 'none', back: 'none', eyes: 'normal', mouth: 'neutral', facialHair: 'none', eyewear: 'none', gloves: 'none', height: 0.95 + r(3) * 0.15, build: 0.9 + r(4) * 0.4 };
  if (place.kind === 'dealer') return { ...base, top: 'hoodie', topColor: ['#16161b', '#3a3d45', '#55602f', '#8b1e3f', '#3a3fbf'][Math.floor(r(5) * 5)], pants: 'cargo', pantsColor: '#3a3d45', shoes: 'sneakers', shoeColor: '#ffffff', hat: ['cap', 'beanie', 'none'][Math.floor(r(6) * 3)], hatColor: '#16161b', eyewear: r(7) < 0.6 ? 'shades' : 'none', hair: ['buzz', 'short', 'afro', 'ponytail'][Math.floor(r(8) * 4)], facialHair: r(9) < 0.5 ? 'goatee' : 'stubble', mouth: 'smile' };
  if (place.kind === 'barber') return { ...base, top: 'tshirt', topColor: '#ffffff', pants: 'jeans', pantsColor: '#16161b', shoes: 'boots', shoeColor: '#16161b', hair: 'quiff', facialHair: 'beard', hat: 'none', mouth: 'smile' };
  if (place.kind === 'guns') return { ...base, top: 'armor', topColor: '#3a3d45', accent: '#55602f', pants: 'cargo', pantsColor: '#55602f', shoes: 'boots', shoeColor: '#16161b', hat: 'cap', hatColor: '#55602f', eyewear: 'shades', facialHair: 'bigbeard', hair: 'buzz', build: 1.3 };
  const o = OUTFITS[place.style]?.[Math.floor(r(10) * OUTFITS[place.style].length)];
  return { ...base, hair: ['bob', 'long', 'short', 'spiky'][Math.floor(r(11) * 4)], mouth: 'smile', ...(o ? o.cfg : {}) };
}
const npcs = [];
PLACES.forEach((p, i) => {
  const hasNpc = ['dealer', 'clothes', 'barber', 'guns'].includes(p.kind);
  if (hasNpc) {
    p.cfg = npcCfg(p, i); p.pitch = 180 + ((i * 97) % 260); p.npcName ||= p.npc || ({ clothes: 'Shop clerk', barber: 'Barber', guns: 'Gun clerk' }[p.kind]);
    const n = { place: p, x: p.x, z: p.z, fig: null, face: 0, t: Math.random() * 5 }; npcs.push(n);
  }
  makeMarker(p.x, p.z, p.icon, PLACE_COLORS[p.kind], { place: p, car: !!p.car, npc: hasNpc });
});
for (const p of PROPERTIES) p.marker = makeMarker(p.x, p.z, p.icon, PLACE_COLORS.property, { place: { ...p, kind: 'property' } });
function refreshPropertyMarkers() { for (const p of PROPERTIES) p.marker.sp.material.map = emojiTex(owned.has(p.id) ? '🔑' : p.icon, owned.has(p.id) ? 'rgba(178,107,255,.9)' : 'rgba(20,18,38,.85)'); }
function updateNpcs(dt) {
  for (const n of npcs) {
    const d = Math.hypot(n.x - P.x, n.z - P.z);
    if (d > 120) { if (n.fig) n.fig.root.visible = false; continue; }
    if (!n.fig) { n.look ||= bakeCfg(n.place.cfg); n.fig = figure(n.look); dyn.add(n.fig.root); n.fig.root.position.set(n.x, baseY(n.x, n.z), n.z); }
    n.fig.root.visible = true; n.t += dt;
    const want = d < 12 ? Math.atan2(P.x - n.x, P.z - n.z) : Math.sin(n.t * 0.3) * 0.6 + Math.PI;
    n.face += wrapA(want - n.face) * Math.min(1, dt * 5); n.fig.root.rotation.y = n.face;
    const l = n.fig.limbs, br = Math.sin(n.t * 1.6) * 0.04;
    l[2].rotation.set(br, 0, -0.08); l[3].rotation.set(-br + (n.place.kind === 'dealer' ? -0.4 : 0), 0, 0.08);
  }
}
function updateMarkers() {
  for (const m of markers) {
    const d = Math.hypot(m.x - P.x, m.z - P.z); m.g.visible = d < 140;
    if (!m.g.visible) continue;
    m.ring.scale.setScalar(1 + Math.sin(time * 3 + m.x) * 0.06);
    m.sp.position.y = m.baseY + Math.sin(time * 2 + m.z) * 0.25;
  }
}

// ---------------- what the A button does
let action = null;
const VERB = { dealer: 'Talk', clothes: 'Talk', barber: 'Talk', guns: 'Talk', game: 'Play', chop: 'Sell car', race: 'Race', property: 'View' };
function findAction() {
  if (P.dead) return null;
  if (ride) {
    if (Math.abs(ride.s.v) > 4) return null;
    for (const m of markers) if (m.car && Math.hypot(m.x - ride.s.x, m.z - ride.s.z) < 4.5) {
      if (m.place.kind === 'chop' && ride.personal) continue;
      if (m.place.kind === 'race' && race) continue;
      return { kind: 'place', m, icon: 'flag', label: VERB[m.place.kind] };
    }
    return null;
  }
  let best = null, bd = 1e9;
  const consider = (d, a) => { if (d < bd) { bd = d; best = a; } };
  for (const m of markers) if (!m.car) { const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < 2.6) consider(d - 1, { kind: 'place', m, icon: m.npc ? 'chat' : 'door', label: VERB[m.place.kind] }); }
  for (const v of vehicles) { const d = Math.hypot(v.s.x - P.x, v.s.z - P.z); if (d < 4) consider(d, { kind: 'vehicle', v, icon: 'car', label: 'Get in' }); }
  for (const t of traffic) { const d = Math.hypot(t.rx - P.x, t.rz - P.z); if (d < 3.4) consider(d, { kind: 'jack', t, icon: 'car', label: 'Jack car' }); }
  for (const p of peds.list) if (p.state !== 'down' && p.state !== 'flee') { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < 1.9) consider(d - 0.2, { kind: 'ped', p, icon: 'chat', label: 'Talk' }); }
  const ccx = Math.floor(P.x / CHUNK), ccz = Math.floor(P.z / CHUNK);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of parkedIn(ccx + i, ccz + j)) if (!p.taken) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < 3.3) consider(d + 0.3, { kind: 'parked', p, icon: 'smash', label: 'Break in' }); }
  return best;
}
function doAction(a) {
  if (a.kind === 'vehicle') enterVehicle(a.v);
  else if (a.kind === 'jack') jackTraffic(a.t);
  else if (a.kind === 'parked') breakIntoParked(a.p);
  else if (a.kind === 'ped') talkToPed(a.p);
  else if (a.kind === 'place') openPlace(a.m.place);
}

// ---------------- modal (properties, games, chop, race)
function modal(html, buttons) {
  $('modalBody').innerHTML = html;
  const row = $('modalBtns'); row.innerHTML = '';
  for (const b of buttons) { const el = document.createElement('button'); el.className = b.cls || 'mid'; el.innerHTML = b.label; el.disabled = !!b.disabled; el.onclick = () => b.fn(); row.appendChild(el); }
  $('modal').classList.remove('hidden'); setState('ui');
}
function closeModal() { $('modal').classList.add('hidden'); if (state === 'ui') setState('play'); }
function openPlace(p) {
  sfx.click();
  if (p.kind === 'dealer') talkDealer(p);
  else if (p.kind === 'guns') talkGuns(p);
  else if (p.kind === 'clothes' || p.kind === 'barber') talkShop(p);
  else if (p.kind === 'property') openProperty(p);
  else if (p.kind === 'game') openGame(p);
  else if (p.kind === 'chop') openChop(p);
  else if (p.kind === 'race') openRace(p);
}

// ================================================================ CONVERSATIONS (Pokémon-style)
function zoneBg(x, z) { const n = zoneName(x, z); return n === 'Bay Beach' ? 'beach' : n === 'Hidden Hills' || n === 'Countryside' || n === 'Farmland' ? 'hills' : n.includes('Airport') ? 'airport' : 'city'; }
function beginTalk(cfg, name, tag, pitch) { talk.layout(W, H); talk.begin({ npcCfg: cfg, youCfg: charCfg, name, tag, pitch, bg: zoneBg(P.x, P.z), night }); setState('talk'); }
function endTalk() { talk.end(); setState('play'); }
const DEALER_HI = ["Yo. You buying or selling?", "Keep it quick, cops roll through here.", "Look who it is. What you need?", "Prices are fresh. Don't waste my time.", "Ayy, my favourite customer."];
const DEALER_WHO = ["Name's {n}. I run this corner. That's all you need to know.", "{n}. Been here since before the tourists.", "They call me {n}. Don't ask why."];
const DEALER_BYE = ["Stay low.", "Don't be a stranger.", "Watch your back out there.", "Peace."];
function hotTip(except) {
  const opts = [];
  for (const p of PLACES) if (p.kind === 'dealer' && p !== except) { const pr = dealerPrices(p, dayN); for (const g of GOODS) if (pr[g.id].hot) opts.push({ p, g, pr: pr[g.id] }); }
  return opts.length ? pick(opts) : null;
}
async function talkDealer(p) {
  beginTalk(p.cfg, p.npcName, p.name, p.pitch);
  await talk.say(pick(DEALER_HI));
  for (;;) {
    const c = await talk.choose(['💊 Let\'s trade', '🗣 Heard anything?', '❓ Who are you?', '👋 Later']);
    if (c === 0) { await openTrade(p); await talk.say(pick(['Pleasure doing business.', 'Smart move.', 'Anything else?', 'Come back tomorrow, prices change.'])); }
    else if (c === 1) {
      await talk.say('Any good deals going round?', 'you');
      const t = hotTip(p);
      if (!t) { await talk.say("Quiet day. Nothing worth the drive."); continue; }
      await talk.say(t.pr.hot === 'cheap' ? `${t.p.npc} over at ${t.p.name.replace(' Dealer', '')} is dumping ${t.g.name} cheap. ${fmt(t.pr.buy)} a pop.` : `${t.p.npc} at ${t.p.name.replace(' Dealer', '')} is paying ${fmt(t.pr.sell)} for ${t.g.name}. Crazy money.`);
      const k = await talk.choose(['📍 Mark it on my map', '👍 Good to know']);
      if (k === 0) { setWaypoint(t.p.x, t.p.z, t.p.name); await talk.say("Marked. Don't say I never did nothing for you."); }
    }
    else if (c === 2) await talk.say(pick(DEALER_WHO).replace('{n}', p.npcName));
    else { await talk.say(pick(DEALER_BYE)); break; }
  }
  endTalk();
}
async function talkShop(p) {
  const barber = p.kind === 'barber';
  beginTalk(p.cfg, p.npcName, p.name, p.pitch);
  await talk.say(barber ? pick(["Take a seat! What are we doing today?", "You're looking a little shaggy, friend.", "Fresh cut? You came to the right place."]) : pick([`Welcome to ${p.name}! Everything's ${STYLE_NAMES[p.style]}.`, "Hey! New stock just came in.", "Looking for a new look?"]));
  const c = await talk.choose([barber ? '💈 Get a cut' : '👕 Browse', '👋 Just looking']);
  if (c === 0) { talk.end(); openShop(p.kind, p); }
  else { await talk.say(pick(['No worries, come back anytime!', 'Alright, see you around.'])); endTalk(); }
}
async function talkGuns(p) {
  beginTalk(p.cfg, p.npcName, p.name, p.pitch);
  await talk.say(pick(["Welcome to Bay Arms. Cash only.", "Looking to protect yourself?", "Everything here's legal. Mostly."]));
  for (;;) {
    const c = await talk.choose(['🔫 Weapons & ammo', '🛠 Customise a gun', '👋 Leave']);
    if (c === 0) { await openGunStore(p); await talk.say(pick(['Stay safe out there.', 'Good choice.', 'Anything else?'])); }
    else if (c === 1) {
      const guns = arsenal.owned.filter(id => SLOT[id].kind === 'gun');
      if (!guns.length) { await talk.say("You don't own a gun I can work on. Buy one first."); continue; }
      await talk.say('Which piece are we working on?');
      const k = await talk.choose([...guns.map(id => `${iconSVG(id, 'sm')} ${arsenal.cfg[id].name || SLOT[id].name}`), '↩ Never mind']);
      if (k < guns.length) { talk.end(); openGunsmith(guns[k], p); return; }
    }
    else { await talk.say('Come back soon.'); break; }
  }
  endTalk();
}
const PED_LINES = {
  city: ["Can't talk, I'm late for a meeting.", "Do I know you?", "Nice day, huh?", "Bay City never sleeps.", "Have you seen the traffic on 5th? Brutal.", "I'm saving up for a place in Hidden Hills. One day."],
  beach: ["Surf's up!", "The water's perfect today.", "Watch out for the seagulls, they steal tacos.", "Have you tried the taco truck? Life changing."],
  hills: ["Up here it's so quiet.", "My neighbour has three pools. Three!", "You lost? Gated community, buddy."],
  airport: ["My flight got delayed again.", "Do you work here?"],
  night: ["Kinda late to be out, huh?", "The city looks good at night.", "You shouldn't be walking around here this late."],
};
async function talkToPed(p) {
  peds.talk(p, P.x, P.z);
  p.buyer ??= Math.random() < (night > 0.5 ? 0.55 : 0.32);
  p.chats ??= 0;
  const bg = zoneBg(p.x, p.z);
  beginTalk(p.look.cfg, pick(['Local', 'Stranger', 'Passer-by']), zoneName(p.x, p.z), 160 + Math.random() * 280);
  await talk.say(pick(night > 0.5 && Math.random() < 0.5 ? PED_LINES.night : PED_LINES[bg]));
  let done = false;
  while (!done) {
    const have = GOODS.filter(g => stash[g.id] > 0);
    const opts = [{ label: '💬 Chat', id: 'chat' }];
    if (have.length) opts.push({ label: '💊 Offer something', id: 'sell' });
    opts.push({ label: '💰 Rob them', id: 'rob' }, { label: '👋 Bye', id: 'bye' });
    const c = opts[await talk.choose(opts)].id;
    if (c === 'chat') { p.chats++; await talk.say(p.chats > 3 ? "Okay, I really have to go." : pick([...PED_LINES[bg], ...PED_LINES.city])); if (p.chats > 3) done = true; }
    else if (c === 'sell') {
      await talk.say("Psst. You looking for something?", 'you');
      if (!p.buyer) { await talk.say(pick(["What? No! Get away from me!", "I'm calling my mom.", "Not interested, weirdo."])); peds.release(p); peds.flee(p, P.x, P.z); endTalk(); return; }
      const g = pick(have), n = Math.min(stash[g.id], 1 + Math.floor(Math.random() * 3)), price = Math.round(g.base * rand(1.15, 1.6)) * n;
      await talk.say(`...Maybe. I'll give you ${fmt(price)} for ${n} ${g.name}.`);
      const k = await talk.choose(['🤝 Deal', '❌ No way']);
      if (k === 0) { stash[g.id] -= n; addMoney(price); await talk.say(pick(["Pleasure. We never met.", "Sweet. Later."])); p.buyer = false; done = true; }
      else await talk.say('Your loss.');
    }
    else if (c === 'rob') {
      await talk.say('Wallet. Now.', 'you');
      const fight = Math.random() < 0.25 && arsenal.cur === 'fist';
      if (fight) { await talk.say("Ha! With what, your fists? Get lost!"); peds.release(p); endTalk(); hurt(12); return; }
      const amt = 20 + Math.floor(Math.random() * 110);
      await talk.say(pick(["Okay okay! Take it! Don't hurt me!", "Seriously?! Fine!", "This city, man..."]));
      endTalk(); peds.release(p); dropCash(p.x, p.z, amt); peds.flee(p, P.x, P.z); peds.scare(P.x, P.z, 16); return;
    }
    else { await talk.say(pick(['See ya.', 'Take care!', 'Bye.'])); done = true; }
  }
  peds.release(p); endTalk();
}

// ---- dealer trade sheet (sits over the conversation)
function openTrade(p) {
  return new Promise(res => {
    const prices = dealerPrices(p, dayN);
    let sel = GOODS[0].id, qty = 1;
    const draw = () => {
      const pr = prices[sel], have = stash[sel] || 0, room = stashCap() - stashCount();
      const maxBuy = Math.max(0, Math.min(room, Math.floor(money / pr.buy)));
      qty = clamp(qty, 1, Math.max(1, Math.max(maxBuy, have)));
      let rows = '';
      for (const g of GOODS) {
        const q = prices[g.id], h = stash[g.id] || 0;
        const hot = q.hot === 'cheap' ? '<em class="hot cheap">CHEAP</em>' : q.hot === 'high' ? '<em class="hot high">HOT</em>' : '';
        rows += `<button class="trow ${g.id === sel ? 'on' : ''}" data-g="${g.id}"><span class="gi">${g.icon}</span><span class="gn"><b>${g.name}</b>${hot}</span><span class="gp"><i>Buy</i>${fmt(q.buy)}</span><span class="gp"><i>Sell</i>${fmt(q.sell)}</span><span class="gh">${h ? '×' + h : ''}</span></button>`;
      }
      $('dealBody').innerHTML = `<div class="deal-stats"><span>💰 <b>${fmt(money)}</b></span><span>🎒 ${stashCount()}/${stashCap()}</span><span class="dn">${p.name} · today</span></div>
        <div class="trows">${rows}</div>
        <div class="tbar"><div class="qty"><button data-q="-">−</button><b>${qty}</b><button data-q="+">+</button><button data-q="max">MAX</button></div>
        <button class="tbuy" ${qty > maxBuy ? 'disabled' : ''}>Buy ${fmt(pr.buy * qty)}</button>
        <button class="tsell" ${have ? '' : 'disabled'}>Sell ${fmt(pr.sell * Math.min(qty, have))}</button></div>`;
      $('dealBody').querySelectorAll('.trow').forEach(b => b.onclick = () => { sel = b.dataset.g; qty = 1; sfx.click(); draw(); });
      $('dealBody').querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const v = b.dataset.q; qty = v === '+' ? qty + 1 : v === '-' ? qty - 1 : Math.max(maxBuy, have); sfx.click(); draw(); });
      $('dealBody').querySelector('.tbuy').onclick = () => { if (qty > maxBuy) return; spend(pr.buy * qty); stash[sel] = have + qty; qty = 1; saveGame(); draw(); };
      $('dealBody').querySelector('.tsell').onclick = () => { const n = Math.min(qty, have); if (!n) return; stash[sel] = have - n; addMoney(pr.sell * n); qty = 1; draw(); };
    };
    draw();
    $('dealTitle').textContent = 'Trade';
    $('dealUI').classList.remove('hidden');
    $('dealClose').onclick = () => { $('dealUI').classList.add('hidden'); res(); };
  });
}
// ---- gun store sheet
function openGunStore(p) {
  return new Promise(res => {
    const draw = () => {
      let rows = '';
      for (const s of SLOTS) {
        if (s.id === 'fist') continue;
        const own = arsenal.owned.includes(s.id), st = slotStats(s.id, arsenal.cfg[s.id]), a = arsenal.ammo[s.id];
        const box = s.kind === 'melee' ? null : ammoBox(s.id, st), full = box && a.res + a.mag >= maxReserve(s.id, st) + (st.mag || 0);
        let btn;
        if (!own && s.id !== 'grenade') btn = `<button class="tbuy" data-buy="${s.id}" ${money < s.price ? 'disabled' : ''}>Buy ${fmt(s.price)}</button>`;
        else if (box) btn = `<button class="tbuy" data-ammo="${s.id}" ${money < box.price || full ? 'disabled' : ''}>${full ? 'Full' : `+${box.n} ${fmt(box.price)}`}</button>`;
        else btn = `<span class="owned">Owned</span>`;
        const ammoTxt = own && s.kind !== 'melee' ? `<small>${s.kind === 'grenade' ? a.res : `${a.mag} | ${a.res}`}</small>` : s.kind === 'gun' && !own ? `<small>Moddable at the counter</small>` : '';
        rows += `<div class="grow">${iconSVG(s.id)}<span class="gn"><b>${s.kind === 'gun' && own ? (arsenal.cfg[s.id].name || s.name) : s.name}</b>${ammoTxt}</span>${btn}</div>`;
      }
      $('dealBody').innerHTML = `<div class="deal-stats"><span>💰 <b>${fmt(money)}</b></span><span class="dn">${p.name}</span></div><div class="grows">${rows}</div>`;
      $('dealBody').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
        const id = b.dataset.buy, s = SLOT[id]; if (money < s.price) return;
        spend(s.price); arsenal.owned.push(id); const st = slotStats(id, arsenal.cfg[id]); arsenal.ammo[id] = { mag: st.mag || 0, res: (st.mag || 0) * 2 };
        selectWeapon(id); draw();
      });
      $('dealBody').querySelectorAll('[data-ammo]').forEach(b => b.onclick = () => {
        const id = b.dataset.ammo, st = slotStats(id, arsenal.cfg[id]), box = ammoBox(id, st); if (money < box.price) return;
        spend(box.price); arsenal.ammo[id].res = Math.min(maxReserve(id, st) + (st.mag || 0), arsenal.ammo[id].res + box.n);
        if (!arsenal.owned.includes(id)) arsenal.owned.push(id);
        saveGame(); hudCache.wpn = null; draw();
      });
    };
    draw();
    $('dealTitle').textContent = 'Weapons & ammo';
    $('dealUI').classList.remove('hidden');
    $('dealClose').onclick = () => { $('dealUI').classList.add('hidden'); res(); };
  });
}

// ---- property / games / chop / race
function openProperty(p) {
  const own = owned.has(p.id);
  modal(`<div class="big-ico">${p.icon}</div><h3>${p.name}</h3>
    <p>${own ? "You own this place. It pays out every morning, adds stash space and you'll wake up here if you black out nearby." : `Pays <b>${fmt(p.income)}</b> every morning, adds <b>+20</b> stash space, and becomes a place to wake up.`}</p>
    <div class="price">${own ? 'OWNED' : fmt(p.price)}</div>`,
    own ? [{ label: 'Close', fn: closeModal }] : [
      { label: `Buy for ${fmt(p.price)}`, cls: 'big', disabled: money < p.price, fn: () => { spend(p.price); owned.add(p.id); refreshPropertyMarkers(); saveGame(); closeModal(); toast(`🔑 ${p.name} is yours!`, 3); } },
      { label: money < p.price ? `Need ${fmt(p.price - money)} more` : 'Not now', fn: closeModal },
    ]);
}
function openGame(p) {
  modal(`<div class="big-ico">${p.icon}</div><h3>${p.name}</h3><p>${p.desc}</p>`, [
    { label: 'Play', cls: 'big', fn: async () => {
      $('modal').classList.add('hidden'); setState('mini');
      const r = await runMinigame(p.game, p.game === 'gym' ? { onRep: () => { charCfg.build = Math.min(1.4, (charCfg.build || 1) + 0.01); } } : {});
      setState('play');
      if (r.money) addMoney(r.money);
      if (p.game === 'gym' && r.score) { store.set('rr_char', charCfg); buildHero(); toast('Looking stronger 💪'); }
    } },
    { label: 'Leave', fn: closeModal },
  ]);
}
function openChop(p) {
  if (!ride || ride.personal) return;
  const val = CHOP_VALUE[ride.cfg.body] || 400;
  modal(`<div class="big-ico">🔧</div><h3>${p.name}</h3><p>Lucky looks the ${BODIES[ride.cfg.body]?.label || 'car'} over. "I'll give you ${fmt(val)}, no questions."</p>`, [
    { label: `Sell for ${fmt(val)}`, cls: 'big', fn: () => { const v = ride; exitCar(); removeVehicle(v); closeModal(); addMoney(val); } },
    { label: 'Keep it', fn: closeModal },
  ]);
}
let race = null;
const cpMat = new THREE.MeshBasicMaterial({ color: '#ff3b4a', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
const cpMesh = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 7, 32, 1, true), cpMat); cpMesh.visible = false; G.scene.add(cpMesh);
function openRace() {
  if (!ride) return;
  modal(`<div class="big-ico">🏁</div><h3>Street Race</h3><p>Hit all ${RACE.points.length} checkpoints around Downtown in ${RACE.time} seconds. Faster finish, bigger payout.</p><div class="price">Up to ${fmt(RACE.reward * 2)}</div>`, [
    { label: 'Go!', cls: 'big', fn: () => { closeModal(); race = { i: 0, t: RACE.time }; cpMesh.visible = true; toast('3… 2… 1… GO!'); sfx.engineStart(); } },
    { label: 'Not now', fn: closeModal },
  ]);
}
function updateRace(dt) {
  if (!race) { $('raceTxt').classList.add('hidden'); return; }
  if (!ride) { race = null; cpMesh.visible = false; toast('Race abandoned'); return; }
  race.t -= dt;
  const [cx, cz] = RACE.points[race.i];
  cpMesh.position.set(cx, 3.5, cz); cpMat.opacity = 0.25 + Math.sin(time * 6) * 0.1;
  if (Math.hypot(ride.s.x - cx, ride.s.z - cz) < 7) { race.i++; sfx.coin(); if (race.i >= RACE.points.length) { const pay = Math.round(RACE.reward * (1 + race.t / RACE.time)); race = null; cpMesh.visible = false; addMoney(pay); toast(`🏁 Finished! +${fmt(pay)}`, 3); return; } }
  if (race.t <= 0) { race = null; cpMesh.visible = false; sfx.fail(); toast('⏱ Out of time!'); return; }
  $('raceTxt').classList.remove('hidden'); $('raceTxt').textContent = `🏁 ${race.i}/${RACE.points.length} · ${Math.ceil(race.t)}s`;
}

// ================================================================ WAYPOINT & GPS
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 80, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
beam.visible = false; G.scene.add(beam);
let route = null, routeT = 0, routeFrom = null;
function setWaypoint(x, z, label) { waypoint = { x, z, label: label || null }; route = null; routeT = 0; beam.position.set(x, 40, z); beam.visible = true; sfx.equip(); saveGame(); }
function clearWaypoint() { waypoint = null; route = null; beam.visible = false; saveGame(); }
function updateRoute(dt) {
  if (!waypoint) return;
  const f = focusPos();
  beam.material.opacity = 0.25 + Math.sin(time * 3) * 0.08;
  if (Math.hypot(f.x - waypoint.x, f.z - waypoint.z) < (ride ? 12 : 6)) { toast('📍 You have arrived'); clearWaypoint(); return; }
  routeT -= dt;
  const moved = routeFrom ? Math.hypot(f.x - routeFrom[0], f.z - routeFrom[1]) : 1e9;
  if (routeT <= 0 || moved > 25) { routeT = 1.5; routeFrom = [f.x, f.z]; route = findRoute(f.x, f.z, waypoint.x, waypoint.z); }
}

// ---------------- camera
const camLook = new THREE.Vector3();
let camDist = 58;
function padHeight() { return Math.min(H * 0.36, 310); }
function focusPos() { return ride ? ride.s : P; }
function updateCamera(dt, snap) {
  const f = focusPos();
  const tx = ride ? f.x + f.vx * 0.45 : f.x, tz = ride ? f.z + f.vz * 0.45 : f.z, ty = ride ? Math.max(groundH(f.x, f.z), 0) : P.y;
  const want = ride ? 84 + Math.abs(ride.s.v) * 0.5 : 58;
  camDist = snap ? want : damp(camDist, want, 2.5, dt);
  const k = snap ? 1 : 1 - Math.exp(-6 * dt);
  camLook.x += (tx - camLook.x) * k; camLook.z += (tz - camLook.z) * k; camLook.y += (ty - camLook.y) * k;
  const pitch = 56 * DEG;
  shake = Math.max(0, shake - dt * 1.5);
  const sx = (Math.random() - 0.5) * shake, sz = (Math.random() - 0.5) * shake;
  G.cam.position.set(camLook.x + sx, camLook.y + Math.sin(pitch) * camDist, camLook.z + Math.cos(pitch) * camDist + sz);
  G.cam.lookAt(camLook.x + sx, camLook.y, camLook.z + sz);
  G.scene.fog.near = camDist + 25; G.scene.fog.far = camDist + 130;
  fadeU.uPlayer.value.set(f.x, ride ? ty : P.y, f.z); fadeU.uCam.value.copy(G.cam.position);
  lantern.position.set(f.x, ty + 3, f.z);
  boomLight.intensity = Math.max(0, boomLight.intensity - dt * 160);
}
function gameLayout() { G.cam.aspect = W / H; G.cam.clearViewOffset(); G.cam.setViewOffset(W, H, 0, padHeight() * 0.25, W, H); G.cam.updateProjectionMatrix(); }

// ================================================================ HUD, minimap
let MAP = null;
const mm = $('minimap'), mctx = mm.getContext('2d');
function ensureMap() { if (!MAP) MAP = drawMap(512); }
function drawMinimap() {
  ensureMap();
  const f = focusPos(), px = f.x, pz = f.z, face = ride ? ride.s.h : P.face;
  const S = mm.width, R = S / 2 - 18, span = ride ? 260 : 170;
  const mx = MAP.tx(px), mz = MAP.tz(pz), ms = span / MAP.sx;
  mctx.save(); mctx.clearRect(0, 0, S, S);
  mctx.beginPath(); mctx.arc(S / 2, S / 2, R, 0, Math.PI * 2); mctx.clip();
  mctx.fillStyle = '#3d8fd0'; mctx.fillRect(0, 0, S, S);
  mctx.drawImage(MAP.canvas, mx - ms / 2, mz - ms / 2, ms, ms, S / 2 - R, S / 2 - R, R * 2, R * 2);
  const toS = (wx, wz) => [S / 2 + (wx - px) / span * R * 2, S / 2 + (wz - pz) / span * R * 2];
  if (route) { mctx.strokeStyle = '#b26bff'; mctx.lineWidth = 9; mctx.lineJoin = 'round'; mctx.lineCap = 'round'; mctx.beginPath(); route.forEach(([x, z], i) => { const [a, b] = toS(x, z); i ? mctx.lineTo(a, b) : mctx.moveTo(a, b); }); mctx.stroke(); }
  mctx.fillStyle = '#ffffff';
  for (const t of traffic) { const [a, b] = toS(t.rx, t.rz); mctx.fillRect(a - 3, b - 3, 6, 6); }
  mctx.font = '22px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
  for (const m of markers) { const [a, b] = toS(m.x, m.z); if (Math.hypot(a - S / 2, b - S / 2) < R - 8) { mctx.fillStyle = m.color; mctx.beginPath(); mctx.arc(a, b, 12, 0, 7); mctx.fill(); mctx.fillText(m.place.kind === 'property' && owned.has(m.place.id) ? '🔑' : m.icon, a, b + 1); } }
  if (myCar && ride !== myCar) { const [a, b] = toS(myCar.s.x, myCar.s.z); mctx.fillStyle = '#ff8a2a'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(a, b, 9, 0, 7); mctx.fill(); mctx.stroke(); }
  const edgeDot = (wx, wz, col, r) => { let [a, b] = toS(wx, wz); const dd = Math.hypot(a - S / 2, b - S / 2); if (dd > R - 10) { a = S / 2 + (a - S / 2) / dd * (R - 10); b = S / 2 + (b - S / 2) / dd * (R - 10); } mctx.fillStyle = col; mctx.strokeStyle = '#fff'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(a, b, r, 0, 7); mctx.fill(); mctx.stroke(); };
  if (waypoint) edgeDot(waypoint.x, waypoint.z, '#ffd23f', 11);
  if (race) edgeDot(...RACE.points[race.i], '#ff3b4a', 11);
  mctx.translate(S / 2, S / 2); mctx.rotate(face + Math.PI);
  mctx.fillStyle = '#ffd23f'; mctx.strokeStyle = '#1a1a2a'; mctx.lineWidth = 4;
  mctx.beginPath(); mctx.moveTo(0, -16); mctx.lineTo(11, 11); mctx.lineTo(0, 5); mctx.lineTo(-11, 11); mctx.closePath(); mctx.stroke(); mctx.fill();
  mctx.restore();
  const hp = P.hp / 100, ringR = R + 10;
  mctx.lineCap = 'round';
  mctx.lineWidth = 11; mctx.strokeStyle = 'rgba(10,10,24,.55)'; mctx.beginPath(); mctx.arc(S / 2, S / 2, ringR, 0, Math.PI * 2); mctx.stroke();
  if (hp > 0) { mctx.lineWidth = 8; mctx.strokeStyle = hp > 0.6 ? '#4cd964' : hp > 0.3 ? '#ffd23f' : '#ff3b4a'; mctx.beginPath(); mctx.arc(S / 2, S / 2, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hp); mctx.stroke(); }
  mctx.lineWidth = 2; mctx.strokeStyle = 'rgba(255,255,255,.7)'; mctx.beginPath(); mctx.arc(S / 2, S / 2, R, 0, Math.PI * 2); mctx.stroke();
}
function drawMapTo(cv) {
  ensureMap();
  const S = cv.width, x = cv.getContext('2d'); x.drawImage(MAP.canvas, 0, 0, S, S);
  const k = S / 512, tx = wx => MAP.tx(wx) * k, tz = wz => MAP.tz(wz) * k;
  if (route) { x.strokeStyle = '#b26bff'; x.lineWidth = 3 * k; x.lineJoin = 'round'; x.beginPath(); route.forEach(([a, b], i) => i ? x.lineTo(tx(a), tz(b)) : x.moveTo(tx(a), tz(b))); x.stroke(); }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 ${Math.round(12 * k)}px ui-rounded, system-ui, sans-serif`;
  for (const [name, wx, wz] of LABELS) { x.lineWidth = 3.5 * k; x.strokeStyle = 'rgba(0,0,0,.55)'; x.strokeText(name, tx(wx), tz(wz)); x.fillStyle = '#fff'; x.fillText(name, tx(wx), tz(wz)); }
  x.font = `${Math.round(10 * k)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  for (const m of markers) { x.fillStyle = m.color; x.beginPath(); x.arc(tx(m.x), tz(m.z), 7 * k, 0, 7); x.fill(); x.fillText(m.place.kind === 'property' && owned.has(m.place.id) ? '🔑' : m.icon, tx(m.x), tz(m.z) + k); }
  const dot = (wx, wz, col, r) => { x.fillStyle = col; x.strokeStyle = '#fff'; x.lineWidth = 2 * k; x.beginPath(); x.arc(tx(wx), tz(wz), r * k, 0, 7); x.fill(); x.stroke(); };
  if (myCar && ride !== myCar) dot(myCar.s.x, myCar.s.z, '#ff8a2a', 5);
  if (waypoint) { dot(waypoint.x, waypoint.z, '#ffd23f', 7); x.fillStyle = '#1a1a2a'; x.font = `900 ${Math.round(9 * k)}px sans-serif`; x.fillText('W', tx(waypoint.x), tz(waypoint.z) + k * 0.5); }
  const f = focusPos(); dot(f.x, f.z, '#38e8ff', 6);
  return { k, fromX: px => WORLD.x0 + px / k * MAP.sx, fromZ: pz => WORLD.z0 + pz / k * MAP.sz, tx, tz };
}
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
const ICONS = {
  car: '<path d="M5 13l1.6-4.6A2 2 0 0 1 8.5 7h7a2 2 0 0 1 1.9 1.4L19 13"/><path d="M4 13h16v4H4z"/><path d="M6.5 17v2M17.5 17v2"/>',
  exit: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  jump: '<path d="M12 20V6"/><path d="M6 12l6-6 6 6"/><path d="M5 3h14"/>',
  fire: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  reload: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
  gas: '<path d="M6 13l6-6 6 6"/><path d="M6 19l6-6 6 6"/>',
  brake: '<path d="M6 5l6 6 6-6"/><path d="M6 11l6 6 6-6"/>',
  horn: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  door: '<path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><circle cx="14.5" cy="12" r="1" fill="currentColor"/>',
  smash: '<path d="M14 3l-2 6 5 1-7 11 2-7-5-1z"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  punch: '<path d="M7 10V7a1.5 1.5 0 0 1 3 0V6a1.5 1.5 0 0 1 3 0v.5a1.5 1.5 0 0 1 3 0V8a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-1a5 5 0 0 1-5-5v-2a2 2 0 0 1 2-2h2"/>',
  throw: '<circle cx="8" cy="15" r="4"/><path d="M12 11c3-4 6-5 9-5M18 3l3 3-3 3"/>',
  none: '',
};
const btnCache = {};
function setBtn(id, icon, label) { const k = icon + '|' + label; if (btnCache[id] === k) return; btnCache[id] = k; $(id).innerHTML = `<svg viewBox="0 0 24 24">${ICONS[icon]}</svg><span>${label}</span>`; }
function updateHUD(dt) {
  const hh = Math.floor(clockH), m10 = Math.floor((clockH - hh) * 6) * 10;
  setText('clockTxt', `${clockH >= 6 && clockH < 19 ? '☀' : '☾'} ${String(hh).padStart(2, '0')}:${String(m10).padStart(2, '0')}`);
  setText('moneyTxt', fmt(money));
  const f = focusPos();
  setText('zoneTxt', zoneName(f.x, f.z));
  if (waypoint) { const d = Math.hypot(f.x - waypoint.x, f.z - waypoint.z); setText('wpTxt', `📍 ${d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d / 10) * 10 + ' m'}${waypoint.label ? ' · ' + waypoint.label : ''}`); } else setText('wpTxt', '');
  // weapon button
  const a = am(), id = arsenal.cur, wk = id + '|' + a.mag + '|' + a.res + '|' + (P.reload > 0);
  if (hudCache.wpn !== wk) { hudCache.wpn = wk; $('wpnBtn').innerHTML = iconSVG(id) + (ws.kind === 'melee' ? '' : ws.kind === 'grenade' ? `<b>${a.res}</b>` : P.reload > 0 ? '<b class="rl">RELOAD</b>' : `<b>${a.mag}</b><span>${a.res}</span>`); }
  $('wpnBtn').classList.toggle('hidden', !!ride);
  $('radioBtn').classList.toggle('hidden', !ride);
  $('speedo').classList.toggle('hidden', !ride);
  if (ride) setText('speedTxt', String(Math.round(Math.abs(ride.s.v) * 3.6)));
  if (ride) { setBtn('btnA', action ? action.icon : 'exit', action ? action.label : 'Exit'); setBtn('btnB', 'gas', 'Gas'); setBtn('btnX', 'brake', ride.s.v > 0.5 ? 'Brake' : 'Reverse'); setBtn('btnY', 'horn', 'Horn'); }
  else {
    setBtn('btnA', action ? action.icon : 'none', action ? action.label : '');
    setBtn('btnB', 'jump', 'Jump');
    const k = ws.kind;
    setBtn('btnX', k === 'melee' ? 'punch' : k === 'grenade' ? 'throw' : 'fire', k === 'melee' ? (id === 'bat' ? 'Swing' : 'Punch') : k === 'grenade' ? 'Throw' : 'Fire');
    setBtn('btnY', (k === 'gun' || k === 'rpg') ? 'reload' : 'none', (k === 'gun' || k === 'rpg') ? 'Reload' : '');
  }
  $('btnA').classList.toggle('ready', !!action);
  $('btnA').classList.toggle('idle', !ride && !action);
  $('btnY').classList.toggle('idle', !ride && !(ws.kind === 'gun' || ws.kind === 'rpg'));
  $('pad').classList.toggle('driving', !!ride);
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  drawMinimap();
}

// ---------------- weapon & radio wheels
attachWheel($('wpnBtn'), {
  items: () => SLOTS.map(s => {
    const own = arsenal.owned.includes(s.id), a = arsenal.ammo[s.id];
    const sub = !own ? `🔒 ${s.price ? fmt(s.price) + ' at Bay Arms' : 'Buy at Bay Arms'}` : s.kind === 'melee' ? (s.id === 'fist' ? 'Holstered' : 'Melee') : s.kind === 'grenade' ? `${a.res} left` : `${a.mag} | ${a.res}`;
    return { icon: iconSVG(s.id), label: s.kind === 'gun' && own ? (arsenal.cfg[s.id].name || s.name) : s.name, short: own && s.kind !== 'melee' ? (s.kind === 'grenade' ? `${a.res}` : `${a.mag + a.res}`) : '', sub, disabled: !own, current: arsenal.cur === s.id };
  }),
  onSelect: (it, i) => selectWeapon(SLOTS[i].id),
  onTap: () => holsterToggle(),
  onOpen: () => { timeScale = 0.2; }, onClose: () => { timeScale = 1; },
});
attachWheel($('radioBtn'), {
  items: () => STATIONS.map((s, i) => ({ icon: `<span class="ri">${s.style === 'off' ? '🔇' : ['🌅', '🔊', '🌆'][i] || '📻'}</span>`, label: s.name.split(' — ')[0], sub: s.name.split(' — ')[1] || '', current: radioIndex() === i })),
  onSelect: (it, i) => { radioSet(i); radioOn(!!ride); toast('📻 ' + STATIONS[i].name, 1.4); },
  onTap: () => { const i = (radioIndex() + 1) % STATIONS.length; radioSet(i); radioOn(!!ride); toast('📻 ' + STATIONS[i].name, 1.4); },
  onOpen: () => { timeScale = 0.2; }, onClose: () => { timeScale = 1; },
});

// ================================================================ PHONE
let phoneApp = 'home';
const APPS = [
  ['maps', 'Maps', '🗺️', 'linear-gradient(135deg,#4cd964,#2f80ed)'],
  ['msgs', 'Messages', '💬', 'linear-gradient(135deg,#5ee07a,#2fbf55)'],
  ['places', 'Places', '📍', 'linear-gradient(135deg,#ff6a74,#e23b3b)'],
  ['wallet', 'Wallet', '💰', 'linear-gradient(135deg,#2a2a33,#000)'],
  ['garage', 'Garage', '🚗', 'linear-gradient(135deg,#ff8a2a,#e05a10)'],
  ['style', 'Style', '🧍', 'linear-gradient(135deg,#b26bff,#6b2fd0)'],
  ['radio', 'Radio', '📻', 'linear-gradient(135deg,#ff6fb5,#b0306f)'],
  ['settings', 'Settings', '⚙️', 'linear-gradient(135deg,#9aa0aa,#5d636e)'],
];
function openPhone(app = 'home') {
  if (ride && Math.abs(ride.s.v) > 3) { toast('Stop the car to use your phone'); return; }
  sfx.click(); setState('phone'); $('phone').classList.remove('hidden');
  requestAnimationFrame(() => $('phone').classList.add('open'));
  phoneGo(app);
}
function closePhone() { $('phone').classList.remove('open'); setTimeout(() => { $('phone').classList.add('hidden'); if (state === 'phone') setState('play'); }, 260); }
function phoneGo(app) { phoneApp = app; renderPhone(); }
function messages() {
  const out = [{ from: 'Uncle Ray', av: '🧔', text: "Welcome to Bay City, kid. Dealers buy low, sell high, and prices change every morning, so check your texts. Grab a piece at Bay Arms, and buy property once you've got the cash. It pays every day." }];
  for (const p of PLACES) if (p.kind === 'dealer') { const pr = dealerPrices(p, dayN); for (const g of GOODS) if (pr[g.id].hot) out.push({ from: p.npc, av: '💊', text: pr[g.id].hot === 'cheap' ? `Got ${g.name} going cheap today. ${fmt(pr[g.id].buy)} each. Come thru.` : `Paying top dollar for ${g.name} today: ${fmt(pr[g.id].sell)}. Bring what you got.`, at: p }); }
  const inc = PROPERTIES.filter(p => owned.has(p.id)).reduce((a, p) => a + p.income, 0);
  if (inc) out.push({ from: 'Bay Realty', av: '🏠', text: `Your properties earn ${fmt(inc)} every morning at 6am.` });
  return out;
}
function renderPhone() {
  const el = $('phApp'), back = `<button class="ph-back" data-go="home">‹ Home</button>`;
  const hh = Math.floor(clockH), mm2 = Math.floor((clockH - hh) * 60);
  $('phTime').textContent = `${String(hh).padStart(2, '0')}:${String(mm2).padStart(2, '0')}`;
  if (phoneApp === 'home') {
    el.innerHTML = `<div class="ph-home"><div class="ph-clock">${$('phTime').textContent}</div><div class="ph-date">Bay City · Day ${dayN}</div>
      <div class="ph-grid">${APPS.map(([id, name, ico, bg]) => `<button class="ph-icon" data-go="${id}"><i style="background:${bg}">${ico}</i><span>${name}</span>${id === 'msgs' ? `<em>${messages().length}</em>` : ''}</button>`).join('')}</div></div>`;
  } else if (phoneApp === 'maps') {
    el.innerHTML = `${back}<h4>Maps</h4><canvas id="phMap"></canvas><p class="ph-hint">${waypoint ? '📍 Waypoint set. Follow the purple route.' : 'Tap anywhere on the map to set a waypoint.'}</p>${waypoint ? '<button class="ph-btn" id="phClear">Clear waypoint</button>' : ''}`;
    const cv = $('phMap'), sz = Math.round(cv.getBoundingClientRect().width * Math.min(devicePixelRatio, 2)); cv.width = cv.height = sz;
    const info = drawMapTo(cv);
    cv.onpointerdown = e => {
      const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * sz, pz = (e.clientY - r.top) / r.height * sz;
      if (waypoint && Math.hypot(info.tx(waypoint.x) - px, info.tz(waypoint.z) - pz) < 22) clearWaypoint();
      else {
        let wx = info.fromX(px), wz = info.fromZ(pz), label = null;
        for (const m of markers) if (Math.hypot(info.tx(m.x) - px, info.tz(m.z) - pz) < 14) { wx = m.x; wz = m.z; label = m.place.name; }
        setWaypoint(wx, wz, label);
        const f = focusPos(); route = findRoute(f.x, f.z, wx, wz); routeT = 1.5; routeFrom = [f.x, f.z];
      }
      renderPhone();
    };
    $('phClear') && ($('phClear').onclick = () => { clearWaypoint(); renderPhone(); });
  } else if (phoneApp === 'msgs') {
    el.innerHTML = `${back}<h4>Messages</h4><div class="ph-list">${messages().map((m, i) => `<div class="ph-msg"><div class="av">${m.av}</div><div><b>${m.from}</b><p>${m.text}</p>${m.at ? `<button class="ph-mini" data-wp="${i}">📍 Set waypoint</button>` : ''}</div></div>`).join('')}</div>`;
    const ms = messages(); el.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => { const m = ms[+b.dataset.wp]; setWaypoint(m.at.x, m.at.z, m.at.name); toast(`📍 ${m.at.name}`); closePhone(); });
  } else if (phoneApp === 'places') {
    const groups = [['💊 Dealers', PLACES.filter(p => p.kind === 'dealer')], ['🔫 Bay Arms', PLACES.filter(p => p.kind === 'guns')], ['👕 Clothes', PLACES.filter(p => p.kind === 'clothes')], ['💈 Barbers', PLACES.filter(p => p.kind === 'barber')], ['🎮 Activities', PLACES.filter(p => ['game', 'race', 'chop'].includes(p.kind))], ['🏠 Real estate', PROPERTIES]];
    const f = focusPos(), all = [];
    el.innerHTML = `${back}<h4>Places</h4><div class="ph-list">${groups.map(([t, list]) => `<div class="ph-sec">${t}</div>` + list.map(p => { all.push(p); const d = Math.hypot(p.x - f.x, p.z - f.z); return `<button class="ph-row" data-i="${all.length - 1}"><span>${p.icon} ${p.name}${p.price ? ` <small>${owned.has(p.id) ? '· owned' : '· ' + fmt(p.price)}</small>` : ''}</span><small>${d > 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm'}</small></button>`; }).join('')).join('')}</div>`;
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const p = all[+b.dataset.i]; setWaypoint(p.x, p.z, p.name); toast(`📍 ${p.name}`); closePhone(); });
  } else if (phoneApp === 'wallet') {
    const inc = PROPERTIES.filter(p => owned.has(p.id)).reduce((a, p) => a + p.income, 0);
    const items = GOODS.filter(g => stash[g.id]).map(g => `<div class="ph-row"><span>${g.icon} ${g.name}</span><b>×${stash[g.id]}</b></div>`).join('') || '<p class="ph-hint">Stash is empty.</p>';
    const props = PROPERTIES.filter(p => owned.has(p.id)).map(p => `<div class="ph-row"><span>${p.icon} ${p.name}</span><small>+${fmt(p.income)}/day</small></div>`).join('') || '<p class="ph-hint">No property yet.</p>';
    el.innerHTML = `${back}<h4>Wallet</h4><div class="ph-cash">${fmt(money)}</div><p class="ph-hint">Daily income ${fmt(inc)} · Stash ${stashCount()}/${stashCap()}</p><div class="ph-sec">🎒 Stash</div>${items}<div class="ph-sec">🏠 Property</div>${props}`;
  } else if (phoneApp === 'garage') {
    el.innerHTML = `${back}<h4>Garage</h4><p class="ph-hint">${carCfg.name || 'Your car'}</p><button class="ph-btn" id="phBring">📍 Bring my car here</button><button class="ph-btn" id="phMod">🛠 Customise my car</button><button class="ph-btn" id="phFind">🔎 Mark my car on the map</button>`;
    $('phBring').onclick = () => { if (ride) exitCar(); bringCar(); closePhone(); };
    $('phMod').onclick = () => { $('phone').classList.remove('open'); $('phone').classList.add('hidden'); openCustom('car'); };
    $('phFind').onclick = () => { setWaypoint(myCar.s.x, myCar.s.z, 'My car'); closePhone(); };
  } else if (phoneApp === 'style') {
    el.innerHTML = `${back}<h4>Style</h4><p class="ph-hint">Body and face are free to change. Hair is done at 💈 barbers, clothes at 👕 shops.</p><button class="ph-btn" id="phBody">🧍 Edit body & face</button>`;
    $('phBody').onclick = () => { $('phone').classList.remove('open'); $('phone').classList.add('hidden'); openCustom('char'); };
  } else if (phoneApp === 'radio') {
    el.innerHTML = `${back}<h4>Radio</h4><p class="ph-hint">Plays while you drive. In the car, hold 📻 for the radio wheel.</p>${STATIONS.map((s, i) => `<button class="ph-row ${radioIndex() === i ? 'on' : ''}" data-st="${i}"><span>${s.name}</span>${radioIndex() === i ? '<b>●</b>' : ''}</button>`).join('')}`;
    el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { radioSet(+b.dataset.st); radioOn(!!ride); renderPhone(); });
  } else if (phoneApp === 'settings') {
    el.innerHTML = `${back}<h4>Settings</h4>
      <button class="ph-row" id="stSound"><span>🔊 Sound</span><b>${settings.sound ? 'On' : 'Off'}</b></button>
      <button class="ph-row" id="stShadow"><span>🌗 Shadows (off = smoother)</span><b>${settings.shadows ? 'On' : 'Off'}</b></button>
      <div class="ph-sec">Danger zone</div><button class="ph-row danger" id="stReset"><span>🗑 Reset all progress</span></button>
      <p class="ph-hint">Bay City ${VERSION}</p>`;
    $('stSound').onclick = () => { settings.sound = !settings.sound; applySettings(); renderPhone(); };
    $('stShadow').onclick = () => { settings.shadows = !settings.shadows; applySettings(); renderPhone(); };
    let armed = false; $('stReset').onclick = () => { if (!armed) { armed = true; $('stReset').querySelector('span').textContent = '⚠️ Tap again to wipe everything'; return; } for (const k of ['bc_save', 'bc_arsenal', 'rr_char', 'rr_gun', 'bc_car']) localStorage.removeItem(k); location.reload(); };
  }
  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { sfx.click(); phoneGo(b.dataset.go); });
}
$('phoneBtn').addEventListener('pointerdown', e => { e.stopPropagation(); openPhone(); });
$('phHome').onclick = () => closePhone();
$('phone').addEventListener('pointerdown', e => { if (e.target.id === 'phone') closePhone(); });
mm.addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play') openPhone('maps'); });

// ================================================================ save / load
function saveGame() {
  save = { hp: P.hp, x: P.x, z: P.z, face: P.face, inCar: ride === myCar, cx: myCar?.s.x, cz: myCar?.s.z, ch: myCar?.s.h, h: clockH, day: dayN, money, stash, owned: [...owned], waypoint };
  store.set('bc_save', save); store.set('bc_arsenal', arsenal);
}
function startGame() {
  if (save) { Object.assign(P, { x: save.x, z: save.z, face: save.face || 0 }); clockH = save.h ?? 8; dayN = save.day ?? 1; P.hp = save.hp > 0 ? save.hp : 100; }
  buildHero();
  myCar = null; rebuildMyCar();
  if (save && save.cx != null) Object.assign(myCar.s, { x: save.cx, z: save.cz, h: save.ch });
  placeVehicle(myCar);
  if (save?.inCar) enterVehicle(myCar);
  P.y = baseY(P.x, P.z); heroRoot.visible = !ride;
  refreshPropertyMarkers();
  if (waypoint) setWaypoint(waypoint.x, waypoint.z, waypoint.label);
  loadBudget = 60; updateChunks(P.x, P.z, 2); loadBudget = 2;
  applyTime(clockH, P.x, P.z);
  if (!ride) updateFoot(0.001);
  updateCamera(0, true); applySettings();
  setState('play');
  if (!save) toast('📱 Check your phone. Uncle Ray left you a message.', 4);
}
function bringCar() {
  let best = null;
  for (let r = 4; r < 60 && !best; r += 4) for (let a = 0; a < Math.PI * 2 && !best; a += Math.PI / 8) { const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; if (roadAt(x, z) && walkable(x, z, false)) { const p = { x, z }; if (!resolve(p, 1.4, 0)) best = p; } }
  if (!best) best = { x: P.x + 4, z: P.z };
  Object.assign(myCar.s, { x: best.x, z: best.z, v: 0, vx: 0, vz: 0 }); placeVehicle(myCar); toast('Your car is waiting nearby');
}
function updateAmbience() {
  const f = focusPos(), x = f.x, z = f.z, c = cityNear(x, z, 30), shoreD = shoreLine(x) - z;
  ambience({ city: c ? (c.id === 'main' ? 1 : 0.6) * (1 - night * 0.4) : 0.15, waves: clamp(1 - (shoreD - 20) / 90, 0, 1), birds: (1 - night) * (x < -300 || !c ? 1 : 0.35), crickets: night * (c ? 0.3 : 1) });
  radioTick();
}

// ---------------- step
function step(dt) {
  time += dt;
  const before = clockH; clockH += dt / 30; if (clockH >= 24) clockH -= 24;
  if (before < 6 && clockH >= 6) {
    dayN++;
    const inc = PROPERTIES.filter(p => owned.has(p.id)).reduce((a, p) => a + p.income, 0);
    if (inc) { addMoney(inc); toast(`☀ New day · property income +${fmt(inc)}`, 3.5); } else toast('☀ New day · 📱 new messages', 3);
  }
  updateHealth(dt);
  action = findAction();
  if (ride) { updateVehicles(dt); P.x = ride.s.x; P.z = ride.s.z; } else { updateFoot(dt); updateVehicles(dt); }
  updateTraffic(dt);
  const f = focusPos(), nc = cityNear(f.x, f.z, 30), nb = f.z > sandLine(f.x) - 60 && f.x > -330;
  peds.update(dt, f.x, f.z, nc, nb);
  updateNpcs(dt); updateBullets(dt); updateProjectiles(dt); updateParticles(dt); updateCash(dt); updateMarkers(); updateRace(dt); updateFlyer(dt); updateRoute(dt);
  if (input.consume('map') || input.consume('pause')) openPhone('maps');
  for (let i = 1; i <= 9; i++) if (input.keys.has('Digit' + i)) { input.keys.delete('Digit' + i); selectWeapon(SLOTS[i - 1].id); }
  if (input.keys.has('KeyH')) { input.keys.delete('KeyH'); holsterToggle(); }
  if (input.keys.has('KeyP')) { input.keys.delete('KeyP'); openPhone(); }
  saveT -= dt; if (saveT <= 0) { saveT = 4; saveGame(); }
}

// ================================================================ state machine / UI
let state = 'play';
const input = new Input();
input.bindTouch({ zone: $('stickZone'), base: $('stickBase'), knob: $('stickKnob'), canvas, buttons: { a: $('btnA'), b: $('btnB'), x: $('btnX'), y: $('btnY') } });
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function setState(s) {
  state = s;
  show('custom', ['char', 'gun', 'car', 'clothes', 'barber'].includes(s));
  show('hud', s === 'play' || s === 'ui' || s === 'phone'); show('pad', s === 'play');
  if (['char', 'gun', 'car', 'clothes', 'barber'].includes(s)) { previewMode = s; previewLayout(); }
  if (s !== 'play') engineSound(false, 0);
  if (s === 'play') gameLayout();
  input.clear();
}

// ---- customisers and shops share one screen
let panel = null, shop = null;
const BODY_SCHEMA = CHAR_SCHEMA.filter(t => t.tab === 'Body' || t.tab === 'Face').map(t => t.tab === 'Face' ? { ...t, items: t.items.filter(i => i.key !== 'facialHair') } : t);
const HAIR_SCHEMA = [{ tab: 'Cut', items: CHAR_SCHEMA.flatMap(t => t.items).filter(i => ['hair', 'hairColor', 'facialHair'].includes(i.key)) }];
const CLOTHES_EXTRA = [{ tab: 'Colours', items: CHAR_SCHEMA.flatMap(t => t.items).filter(i => ['topColor', 'pantsColor', 'shoeColor', 'hatColor', 'accent', 'gloveColor', 'backColor'].includes(i.key)) },
  { tab: 'Extras', items: CHAR_SCHEMA.flatMap(t => t.items).filter(i => ['eyewear', 'gloves', 'back', 'hat'].includes(i.key)) }];
function shopPrice() {
  if (!shop) return 0;
  if (shop.kind === 'gun') { let t = 0; for (const k of Object.keys(pvGunCfg)) if (pvGunCfg[k] !== shop.orig[k]) t += SMITH_PRICES[k] ?? 100; return t; }
  let total = shop.outfit ? shop.outfit.price : 0;
  for (const k of Object.keys(previewCfg)) {
    if (previewCfg[k] === shop.orig[k]) continue;
    if (shop.outfit && k in shop.outfit.cfg && shop.outfit.cfg[k] === previewCfg[k]) continue;
    total += shop.kind === 'barber' ? (BARBER_PRICES[k] || 0) : /Color|accent/.test(k) ? 15 : 30;
  }
  return total;
}
function openCustom(kind) {
  shop = null; previewCfg = null;
  setState(kind);
  const S = { char: BODY_SCHEMA, car: CAR_SCHEMA }[kind];
  $('customTitle').textContent = { char: 'Body & Face', car: 'Garage' }[kind];
  $('randBtn').textContent = '🎲 Random'; $('randBtn').classList.remove('buy'); $('randBtn').disabled = false;
  const pres = $('presets'); pres.innerHTML = '';
  if (kind === 'car') for (const [name, cfg] of Object.entries(CAR_PRESETS)) { const b = document.createElement('button'); b.textContent = name; b.onclick = () => { carCfg = { ...DEFAULT_CAR, ...cfg }; changed(); panel.refresh(); }; pres.appendChild(b); }
  const get = () => kind === 'car' ? carCfg : charCfg;
  panel = buildPanel({ tabsEl: $('tabs'), contentEl: $('content'), schema: S, getCfg: get, onChange: (k, v) => { get()[k] = v; changed(); } });
  pv.dirty = true; changed();
}
function openShop(kind, place) {
  shop = { kind, place, orig: { ...charCfg }, outfit: null }; previewCfg = { ...charCfg };
  setState(kind);
  $('customTitle').textContent = place.name; $('randBtn').classList.add('buy');
  const pres = $('presets'); pres.innerHTML = '';
  if (kind === 'clothes') for (const o of OUTFITS[place.style]) {
    const b = document.createElement('button'); b.innerHTML = `${o.name} <b>${fmt(o.price)}</b>`;
    b.onclick = () => { previewCfg = { ...shop.orig, ...o.cfg }; shop.outfit = o; [...pres.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); pv.dirty = true; panel.refresh(); updateShopPrice(); };
    pres.appendChild(b);
  }
  panel = buildPanel({ tabsEl: $('tabs'), contentEl: $('content'), schema: kind === 'barber' ? HAIR_SCHEMA : CLOTHES_EXTRA, getCfg: () => previewCfg, onChange: (k, v) => { previewCfg[k] = v; pv.dirty = true; updateShopPrice(); } });
  $('stats').innerHTML = `<div class="statx">${kind === 'barber' ? `Cut ${fmt(BARBER_PRICES.hair)} · Colour ${fmt(BARBER_PRICES.hairColor)} · Beard ${fmt(BARBER_PRICES.facialHair)}` : `${STYLE_NAMES[place.style]} · pick an outfit, then tweak colours (${fmt(15)}) and extras (${fmt(30)})`}</div>`;
  pv.dirty = true; updateShopPrice();
}
function openGunsmith(slot, place) {
  shop = { kind: 'gun', slot, place, orig: { ...arsenal.cfg[slot] } };
  pvGunCfg = { ...arsenal.cfg[slot] }; previewCfg = null;
  setState('gun');
  $('customTitle').textContent = `${SLOT[slot].name} · ${place.name}`; $('randBtn').classList.add('buy');
  $('presets').innerHTML = '';
  panel = buildPanel({ tabsEl: $('tabs'), contentEl: $('content'), schema: smithSchema(slot), getCfg: () => pvGunCfg, onChange: (k, v) => { pvGunCfg[k] = v; if (k === 'receiver') { pvGunCfg.fireMode = RECEIVERS[v].mode; panel.refresh(); } pv.dirty = true; gunStatsPanel(); updateShopPrice(); } });
  pv.dirty = true; gunStatsPanel(); updateShopPrice();
}
function gunStatsPanel() {
  const s = computeStats(pvGunCfg);
  const notes = [`DPS <b>${Math.round(s.dps)}</b>`, { semi: 'Semi-auto', burst: '3-round burst', auto: 'Full auto' }[s.mode]];
  if (s.pellets > 1) notes.push(`${s.pellets} pellets`); notes.push(PARTS.ammo[s.ammo].label);
  renderStats($('stats'), statBars(s), notes.join(' · ') + ' · parts from $120, paint $40');
}
function updateShopPrice() { const p = shopPrice(); $('randBtn').textContent = p ? `Buy ${fmt(p)}` : 'Buy'; $('randBtn').disabled = !p; }
function changed() {
  store.set('rr_char', charCfg); store.set('bc_car', carCfg);
  pv.dirty = true;
  if (state === 'car') renderStats($('stats'), carStatBars(computeCarStats(carCfg)), `Engine <b>${CAR_PARTS.engine[carCfg.engine].label}</b> · Tyres <b>${CAR_PARTS.tyres[carCfg.tyres].label}</b>`);
  else if (state === 'char') $('stats').innerHTML = `<div class="statx">Body and face are free. Visit 💈 barbers for hair and 👕 shops for clothes.</div>`;
}
$('backBtn').onclick = () => {
  shop = null; previewCfg = null;
  const wasRide = ride;
  buildHero();
  if (state === 'car') rebuildMyCar();
  heroRoot.visible = !wasRide && !P.dead;
  setState('play');
};
$('randBtn').onclick = () => {
  if (shop) {
    const price = shopPrice(); if (!price) return;
    if (money < price) { sfx.fail(); toast(`You need ${fmt(price - money)} more`); return; }
    spend(price);
    if (shop.kind === 'gun') { arsenal.cfg[shop.slot] = { ...pvGunCfg }; shop.orig = { ...pvGunCfg }; saveGame(); toast('🛠 Work done. Looks mean.'); updateShopPrice(); return; }
    charCfg = { ...previewCfg }; store.set('rr_char', charCfg); saveGame();
    shop.orig = { ...charCfg }; shop.outfit = null; [...$('presets').children].forEach(c => c.classList.remove('on'));
    toast(shop.kind === 'barber' ? 'Fresh cut 💈' : 'Looking sharp 👕'); updateShopPrice(); return;
  }
  if (state === 'car') carCfg = { ...DEFAULT_CAR, ...randomCar(), name: carCfg.name };
  else for (const it of BODY_SCHEMA.flatMap(t => t.items)) { if (it.type === 'choice') charCfg[it.key] = pick(it.options)[0]; else if (it.type === 'color') charCfg[it.key] = pick(it.palette); else if (it.type === 'range') charCfg[it.key] = +(it.min + Math.random() * (it.max - it.min)).toFixed(2); }
  changed(); panel.refresh();
};
$('modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
addEventListener('pagehide', saveGame);
addEventListener('pointerdown', () => audio(), { once: true });
document.addEventListener('touchmove', e => { if (!e.target.closest('.scroll')) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

function resize() { W = innerWidth; H = innerHeight; renderer.setSize(W, H); previewLayout(); gameLayout(); talk.layout(W, H); }
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 250));
resize();

let last = performance.now(), ptime = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play') {
    const dt = rdt * timeScale;
    step(dt);
    updateChunks(P.x, P.z, ride ? 3 : 2);
    applyTime(clockH, P.x, P.z); updateCamera(dt); updateHUD(rdt); updateAmbience();
    renderer.render(G.scene, G.cam);
  } else if (state === 'talk') { talk.update(rdt); talk.render(renderer); }
  else if (state === 'phone' || state === 'ui') { if (state === 'ui') updateHUD(rdt); renderer.render(G.scene, G.cam); }
  else if (state === 'mini') { /* minigame overlay owns the screen */ }
  else { ptime += rdt; updatePreview(rdt, ptime); renderer.render(pv.scene, pv.cam); }
}
startGame();
requestAnimationFrame(frame);
window.__game = { scene: G.scene, cam: G.cam, snap: () => updateCamera(0, true), get state() { return state; }, P, input, get ride() { return ride; }, get myCar() { return myCar; }, get traffic() { return traffic; }, peds, setTime: h => { clockH = h; }, openCustom, enterVehicle, exitCar, get money() { return money; }, set money(v) { money = v; }, openPlace, PLACES, PROPERTIES, runMinigame, get action() { return action; }, arsenal, selectWeapon, openPhone, setWaypoint, get route() { return route; }, talkToPed, talk, doAction };
