import * as THREE from '../lib/three.module.min.js';
import { buildCharacter, poseCharacter, disposeObject, DEFAULT_CHAR, CHAR_SCHEMA } from './character.js';
import { computeStats, statBars, DEFAULT_GUN, RECEIVERS, PARTS, buildGun } from './gun.js';
import { buildCar, computeCarStats, carStatBars, DEFAULT_CAR, CAR_SCHEMA, CAR_PRESETS, CAR_PARTS, BODIES, CAR_PRICES, randomCar, trafficCar } from './car.js';
import { WORLD, CHUNK, CITIES, MATS, WATER_Y, SPAWN, LABELS, SIGN, buildChunk, parkedIn, resolve, walkable, onPier, roadAt, cityAt, zoneName, groundH, solidPoint, drawMap, sandLine, shoreLine, removeCollider, blockSide } from './world.js';
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
import { svg, drawIcon } from './icons.js';
import { SKILLS, GUN_SKILL_SLOTS, newStats, fixStats, addXP, xpFor, skillName, MAX_LVL, relName, relPriceMod, FOODS, MENUS } from './stats.js';
import { FURN, CATALOG } from './furniture.js';
import { INTERIORS, ORIGIN, buildInterior, STARTER_FURNITURE } from './interiors.js';

const $ = id => document.getElementById(id);
let inside = null, editMode = false, held = null, pendingCar = false, homeMusic = false, phoneBadge = 0;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const DEG = Math.PI / 180;
const fmt = n => (n < 0 ? '−$' : '$') + Math.floor(Math.abs(n)).toLocaleString('en-US');
const VERSION = 'v6';

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
let save = store.get('bc_save', null);
let garage = store.get('bc_cars', null) || { cars: [{ ...DEFAULT_CAR, ...store.get('bc_car', {}) }], active: 0 };
let carCfg = garage.cars[garage.active];
let money = save?.money ?? 500;
let stash = save?.stash || {};
let owned = new Set(save?.owned || []);
owned.add('p_studio');
let waypoint = save?.waypoint || null;
let homes = save?.homes || {};
let storage = save?.storage || [];
let settings = { sound: true, shadows: true, ...store.get('bc_settings', {}) };
let arsenal = store.get('bc_arsenal', null) || newArsenal(store.get('rr_gun', null));
for (const s of SLOTS) { arsenal.ammo[s.id] ||= { mag: 0, res: 0 }; if (s.kind === 'gun') arsenal.cfg[s.id] ||= { ...DEFAULT_CFGS[s.id] }; }
let stats = fixStats(save?.stats || newStats());
let customers = save?.customers || [];
let job = null;
const safes = () => Object.values(homes).flat().filter(f => f.t === 'safe').length;
const stashCap = () => 40 + owned.size * 20 + safes() * 40;
const stashCount = () => Object.values(stash).reduce((a, b) => a + b, 0);
const lvl = id => stats.lvl[id] || 1;
const maxHP = () => 100 + (lvl('health') - 1) * 10;

// ---- textures
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,230,160,.85)'); g.addColorStop(1, 'rgba(255,140,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
const flareTex = glowTex();
const iconTexCache = new Map();
function iconTex(name, bg = 'rgba(20,18,38,.88)', stroke = '#fff') {
  const k = name + bg + stroke; if (iconTexCache.has(k)) return iconTexCache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = bg; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.fill(); x.lineWidth = 6; x.strokeStyle = '#fff'; x.stroke();
  drawIcon(x, name, 64, 64, 66, { stroke, width: 2.2 });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; iconTexCache.set(k, t); return t;
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
  for (let i = 0; i < 18; i++) { const cfg = trafficCar(r), car = buildCar(cfg); carLib.push({ cfg, geo: bakeGroup(car.group), len: car.length }); disposeObject(car.group); }
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
let previewCfg = null, pvGunCfg = DEFAULT_GUN, pvCarCfg = null;
function rebuildPreview() {
  if (pv.char) { pv.turn.remove(pv.char.root); disposeObject(pv.char.root); }
  if (pv.gunView) { pv.gunStand.remove(pv.gunView.group); disposeObject(pv.gunView.group); }
  if (pv.car) { pv.carStand.remove(pv.car.group); disposeObject(pv.car.group); }
  pv.char = buildCharacter(previewCfg || charCfg); pv.turn.add(pv.char.root);
  pv.gunView = buildGun(pvGunCfg); pv.gunView.group.position.copy(pv.gunView.center).multiplyScalar(-1); pv.gunStand.add(pv.gunView.group);
  pv.car = buildCar(pvCarCfg || carCfg); pv.carStand.add(pv.car.group);
  pv.dirty = false;
}
let previewMode = 'char';
function previewLayout() { const c = pv.cam; c.aspect = W / H; c.clearViewOffset(); c.setViewOffset(W, H, 0, H * 0.24, W, H); c.updateProjectionMatrix(); }
function updatePreview(dt, t) {
  if (pv.dirty) rebuildPreview();
  const m = previewMode;
  if (!dragging) { pv.rot += pv.vel * dt; pv.vel = damp(pv.vel, m === 'carshop' ? 0.4 : 0, 2, dt); }
  pv.gunStand.visible = m === 'gun'; pv.carStand.visible = m === 'car' || m === 'carshop'; pv.turn.visible = !pv.gunStand.visible && !pv.carStand.visible;
  const aspect = W / H, h = pv.char.height;
  let focus, dist;
  if (m === 'gun') { pv.gunStand.position.set(0, 1.2, 0); pv.gunStand.rotation.set(0.12, pv.rot + Math.PI / 2 + 0.45, 0); dist = clamp((pv.gunView.length + 0.15) * 1.25 / (0.63 * aspect), 1, 8); focus = new THREE.Vector3(0, 1.2, 0); }
  else if (m === 'car' || m === 'carshop') { pv.carStand.rotation.y = pv.rot + 0.6; dist = clamp((pv.car.length + 0.6) * 1.05 / (0.63 * aspect), 4, 26); focus = new THREE.Vector3(0, 0.7, 0); }
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
const signGroup = new THREE.Group();
{
  const letters = SIGN.text.split('');
  letters.forEach((ch, i) => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 160; const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.font = '900 150px Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 64, 86);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 7.5), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.15 }));
    const lx = SIGN.x + (i - (letters.length - 1) / 2) * 6.6, lz = SIGN.z + Math.sin(i * 0.9) * 0.8, gy = groundH(lx, lz);
    m.position.set(lx, gy + 4.6, lz); m.rotation.x = -0.35; m.castShadow = true; signGroup.add(m);
    for (const sx of [-1.8, 1.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 0.2), new THREE.MeshStandardMaterial({ color: '#555' })); p.position.set(lx + sx, gy + 1.5, lz - 0.8); signGroup.add(p); }
  });
  G.scene.add(signGroup);
}
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
  night = k0[7] + (k1[7] - k0[7]) * t;
  if (inside) {
    G.scene.background.set('#0a0910'); G.scene.fog.color.set('#0a0910');
    hemi.color.set('#fff3e0'); hemi.groundColor.set('#5a4a40'); hemi.intensity = 0.95;
    sun.color.set('#fff3e0'); sun.intensity = 0.7; sun.position.set(px + 6, 40, pz + 14); sun.target.position.set(px, 0, pz);
    lantern.intensity = 0; return;
  }
  lerpCol(G.scene.background, k0[1], k1[1], t); G.scene.fog.color.copy(G.scene.background);
  lerpCol(hemi.color, k0[2], k1[2], t); lerpCol(hemi.groundColor, k0[3], k1[3], t);
  hemi.intensity = k0[4] + (k1[4] - k0[4]) * t;
  lerpCol(sun.color, k0[5], k1[5], t); sun.intensity = k0[6] + (k1[6] - k0[6]) * t;
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

// ---------------- money
const cashDrops = [];
function dropCash(x, z, amt) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex('cash', '#2fbf55'), depthWrite: false }));
  s.scale.set(1.2, 1.2, 1); s.position.set(x, 0.8, z); dyn.add(s); cashDrops.push({ x, z, amt, s, t: 0 });
}
function updateCash(dt) {
  for (let i = cashDrops.length - 1; i >= 0; i--) {
    const c = cashDrops[i]; c.t += dt; c.s.position.y = 0.8 + Math.sin(c.t * 4) * 0.15;
    const d = Math.hypot(c.x - P.x, c.z - P.z);
    if (d < (ride ? 3 : 1.4)) { addMoney(c.amt, true); dyn.remove(c.s); cashDrops.splice(i, 1); }
    else if (d > 120 || c.t > 90) { dyn.remove(c.s); cashDrops.splice(i, 1); }
  }
}
function addMoney(n, quiet) { money += n; if (n > 0) { quiet ? sfx.coin() : sfx.cash(); } if (n) floatMoney(n); saveGame(); }
function spend(n) { money -= n; floatMoney(-n); sfx.cash(); saveGame(); }
function floatMoney(n) { const el = $('moneyFloat'); el.textContent = (n >= 0 ? '+' : '−') + '$' + Math.floor(Math.abs(n)).toLocaleString('en-US'); el.classList.toggle('neg', n < 0); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }

// ---------------- skills & needs
function gainXP(id, amt) {
  if (amt <= 0) return;
  const up = addXP(stats, id, amt);
  if (up) { sfx.cash(); toast(`${skillName(id)} reached level ${up}`, 3); if (id === 'health') P.hp = Math.min(maxHP(), P.hp + 10); if (id.startsWith('gun_') && arsenal.cur === id.slice(4)) equipWeapon(); }
}
function feed(f) { // apply a food/drink/activity effect object
  if (f.hunger) stats.hunger = clamp(stats.hunger + f.hunger, 0, 100);
  if (f.energy) stats.energy = clamp(stats.energy + f.energy, 0, 100);
  if (f.mood) stats.mood = clamp(stats.mood + f.mood, 0, 100);
  if (f.health) P.hp = Math.min(maxHP(), P.hp + f.health);
  if (f.groceries) stats.groceries += f.groceries;
}
let needWarnT = 0;
function updateNeeds(dtHours, dt) {
  stats.hunger = Math.max(0, stats.hunger - dtHours * 4);
  const running = !ride && input.stick.m > 0.85;
  stats.energy = Math.max(0, stats.energy - dtHours * (2.6 + (running ? 2 / (1 + lvl('stamina') * 0.15) : 0)));
  stats.mood = clamp(stats.mood + (55 - stats.mood) * dtHours * 0.05 - (stats.hunger < 20 ? dtHours * 3 : 0) - (stats.energy < 15 ? dtHours * 2 : 0), 0, 100);
  needWarnT -= dt;
  if (stats.hunger <= 0) { P.hp -= dt * 0.8; if (P.hp <= 0) die(); }
  if (needWarnT <= 0) {
    if (stats.hunger < 15) { toast('You are starving. Eat something! (diner, taco truck, or your fridge)', 3); needWarnT = 40; }
    else if (stats.energy < 10) { toast('You are exhausted. Sleep in a bed at home.', 3); needWarnT = 40; }
  }
}

// ================================================================ player & weapons
const P = { hp: 100, dead: false, deadT: 0, hurtT: 99, hitCd: 0, kx: 0, kz: 0, x: SPAWN.x, z: SPAWN.z, y: 0, vy: 0, face: Math.PI, phase: 0, recoil: 0, fireCd: 0, burst: 0, burstT: 0, reload: 0, flash: 0, swing: 0, swingHit: false, runDist: 0 };
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
  if (ws.kind === 'gun' || ws.kind === 'rpg') { const k = lvl('gun_' + id) - 1; if (ws.spread) ws.spread *= 1 - k * 0.06; if (ws.reload) ws.reload *= 1 - k * 0.05; }
  if (ws.kind === 'melee') ws.power *= 1 + (lvl('strength') - 1) * 0.12;
  if (id !== 'fist') { heroW = buildWeaponModel(id, arsenal.cfg[id]); heroW.group.rotation.x = Math.PI / 2; hero.hand.add(heroW.group); heroW.group.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
  const a = am(); if (ws.mag && a.mag > ws.mag) { a.res += a.mag - ws.mag; a.mag = ws.mag; }
  P.reload = 0; P.burst = 0; P.fireCd = 0.15;
  hudCache.wpn = null;
}
function selectWeapon(id) {
  if (!arsenal.owned.includes(id)) { toast(`${SLOT[id].name} is locked. Buy one at Bay Arms.`); sfx.fail(); return; }
  if (id !== 'fist') arsenal.last = id;
  arsenal.cur = id; equipWeapon(); sfx.equip(); saveGame();
}
function holsterToggle() { selectWeapon(arsenal.cur === 'fist' ? (arsenal.owned.includes(arsenal.last) ? arsenal.last : 'fist') : 'fist'); }
function finishReload() { const a = am(), take = Math.min(ws.mag - a.mag, a.res); a.mag += take; a.res -= take; }
function startReload() { const a = am(); if (P.reload <= 0 && a.res > 0 && a.mag < ws.mag) P.reload = ws.reload; }

// ---------------- vehicles
const vehicles = [];
let ride = null, myCar = null, headSpot = null, headTarget = null;
function makeVehicle(cfg, x, z, h, personal) {
  const b = buildCar(cfg); dyn.add(b.group);
  const v = { cfg, b, st: computeCarStats(cfg), s: { x, z, h, v: 0, vx: 0, vz: 0, steer: 0, braking: false }, personal };
  vehicles.push(v); placeVehicle(v); return v;
}
function removeVehicle(v) { dyn.remove(v.b.group); disposeObject(v.b.group); vehicles.splice(vehicles.indexOf(v), 1); if (ride === v) ride = null; }
function rebuildMyCar(at) {
  const s = at || (myCar ? { ...myCar.s } : { x: SPAWN.carX, z: SPAWN.carZ, h: SPAWN.carH }), wasRiding = myCar && ride === myCar;
  if (myCar) removeVehicle(myCar);
  carCfg = garage.cars[garage.active];
  myCar = makeVehicle(carCfg, s.x, s.z, s.h ?? 0, true);
  if (wasRiding) ride = myCar;
  if (!headSpot) { headSpot = new THREE.SpotLight('#fff4dd', 0, 45, 0.55, 0.6, 1.2); headTarget = new THREE.Object3D(); G.scene.add(headSpot, headTarget); headSpot.target = headTarget; }
  headSpot.color.set(carCfg.headlights || '#ffffff');
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
  if (traffic.length < (!inside && cityNear(ox, oz) ? 12 : 0)) spawnTraffic(ox, oz);
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
    bullets.push({ x: tmpV.x, y: tmpV.y, z: tmpV.z, vx: Math.sin(a) * s.speed, vz: Math.cos(a) * s.speed, life: s.range / s.speed, m, ammo: s.ammo, slot: arsenal.cur });
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
        dead = true; const d = Math.hypot(b.vx, b.vz); peds.knock(p, b.vx / d, b.vz / d, 4); peds.scare(p.x, p.z, 20); gainXP('gun_' + b.slot, 3);
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
  am().mag--; flash(tmpV, 1.4, '#ffd080', 10); sfx.launch(); shake = Math.max(shake, 0.3); P.recoil = 1; gainXP('gun_rpg', 4);
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
      for (let k = 0; k < 4 && !boom; k++) {
        p.x += p.vx * dt / 4; p.z += p.vz * dt / 4;
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
  if (hit) { sfx.punch(); shake = Math.max(shake, 0.15); navigator.vibrate?.(15); gainXP('strength', 4); }
}

// ---------------- health
let time = 0, clockH = 8, dayN = 1, shake = 0, saveT = 0, toastT = 0, hurtFlash = 0, timeScale = 1;
const gameHours = () => dayN * 24 + clockH;
function toast(msg, dur = 2.4) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); toastT = dur; }
function hurt(d) { if (P.dead || d <= 0) return; P.hp = Math.max(0, P.hp - d); P.hurtT = 0; hurtFlash = 0.35; shake = Math.max(shake, 0.3); navigator.vibrate?.(30); if (P.hp <= 0) die(); }
function die() {
  if (P.dead) return;
  P.dead = true; P.deadT = 3.2; if (ride) exitCar(); if (inside) exitInterior(true);
  const lost = Math.floor(money * 0.1); money -= lost; stats.mood = Math.max(0, stats.mood - 20);
  $('deathScreen').querySelector('span').textContent = `Hospital bill: ${fmt(lost)}. Waking up…`;
  $('deathScreen').classList.add('on'); if (job) endJob('You blacked out. Shift over.');
}
function homeSpot() {
  let best = null, bd = 1e9;
  for (const p of PROPERTIES) if (owned.has(p.id)) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; best = p; } }
  return best ? { x: best.x, z: best.z, name: best.name } : { x: SPAWN.x, z: SPAWN.z, name: 'Downtown Clinic' };
}
function respawn() {
  const h = homeSpot();
  P.dead = false; P.hp = maxHP(); P.hurtT = 99; P.kx = P.kz = 0; stats.hunger = Math.max(stats.hunger, 40); stats.energy = Math.max(stats.energy, 40);
  Object.assign(P, { x: h.x, z: h.z, face: Math.PI }); P.y = baseY(P.x, P.z);
  heroRoot.visible = true; hero.root.rotation.x = 0;
  $('deathScreen').classList.remove('on'); updateCamera(0, true); toast(`You woke up at ${h.name}`);
}
function updateHealth(dt) {
  P.hurtT += dt; P.hitCd -= dt;
  if (!P.dead && P.hurtT > 6 && P.hp < maxHP() && stats.hunger > 10) P.hp = Math.min(maxHP(), P.hp + 4 * dt);
  if (P.dead) { P.deadT -= dt; if (P.deadT <= 0) respawn(); }
  hurtFlash = Math.max(0, hurtFlash - dt);
  const low = P.hp < 40 ? (1 - P.hp / 40) : 0, rate = 1.2 + low * 1.6, ph = (time * rate) % 1;
  const beat = Math.max(Math.exp(-ph * 9), 0.7 * Math.exp(-Math.abs(ph - 0.22) * 14));
  $('hurt').style.opacity = Math.min(1, low * (0.35 + 0.65 * beat) + hurtFlash * 2.2).toFixed(3);
}

// ---------------- on foot
function baseY(x, z) { if (inside) return 0; if (onPier(x, z)) return 0.28; if (roadAt(x, z)) return 0.04; if (cityAt(x, z, -6)) return 0.17; return groundH(x, z); }
function canWalk(x, z) { return inside ? inside.h.inside(x, z) : walkable(x, z); }
function updateFoot(dt) {
  const st = P.dead ? { x: 0, y: 0, m: 0 } : input.stick;
  P.x += P.kx * dt; P.z += P.kz * dt; P.kx = damp(P.kx, 0, 4, dt); P.kz = damp(P.kz, 0, 4, dt);
  const tired = stats.energy < 10 ? 0.7 : 1, runMul = 1 + (lvl('stamina') - 1) * 0.035;
  const sp = (st.m > 0.85 ? 7.2 * runMul : 4.6) * st.m * (ws.mob || 1) * tired * (inside ? 0.8 : 1), ox = P.x, oz = P.z;
  if (st.m > 0.1) { const mx = st.x / st.m, mz = -st.y / st.m; P.x += mx * sp * dt; P.z += mz * sp * dt; P.face += wrapA(Math.atan2(mx, mz) - P.face) * (1 - Math.exp(-14 * dt)); }
  resolve(P, 0.4, Math.max(0, P.y - baseY(P.x, P.z)));
  for (const p of peds.list) { const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz); if (d < 0.7 && d > 0.01 && p.state !== 'down') { p.x -= dx / d * (0.7 - d); p.z -= dz / d * (0.7 - d); } }
  for (const n of allNpcs()) { const dx = P.x - n.x, dz = P.z - n.z, d = Math.hypot(dx, dz); if (d < 0.75 && d > 0.01) { P.x = n.x + dx / d * 0.75; P.z = n.z + dz / d * 0.75; } }
  if (!canWalk(P.x, P.z)) { P.x = ox; P.z = oz; }
  if (inside && P.z > ORIGIN.z + inside.h.d / 2 + 0.35) { exitInterior(); return; }
  const gy = baseY(P.x, P.z);
  if (editMode) { updateEdit(dt); }
  else {
    if (input.consume('b') && P.y <= gy + 0.01 && !P.dead) P.vy = 7.5;
    // ---- weapon use (holstered indoors)
    P.fireCd -= dt; P.burstT -= dt; P.recoil = Math.max(0, P.recoil - dt * 4); P.swing = Math.max(0, P.swing - dt);
    const a = am(), kind = inside ? 'none' : ws.kind, firing = !P.dead && input.held('x');
    if (kind === 'gun' || kind === 'rpg') {
      if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) finishReload(); }
      if (input.consume('y')) startReload();
      if (kind === 'rpg') { if (firing && P.fireCd <= 0 && P.reload <= 0) { if (a.mag > 0) { fireRocket(); P.fireCd = 1 / ws.rof; } else if (a.res > 0) startReload(); else if (input.consume('x')) { sfx.fail(); toast('Out of rockets'); } } }
      else if (P.burst > 0) { if (P.burstT <= 0 && a.mag > 0) { shoot(); P.burst--; P.burstT = 0.07; if (!P.burst) P.fireCd = 1.6 / ws.rof; } if (a.mag <= 0) P.burst = 0; }
      else if (firing && P.fireCd <= 0 && P.reload <= 0) {
        if (a.mag <= 0) { if (a.res > 0) startReload(); else if (input.consume('x')) { sfx.click(); toast('Out of ammo. Buy more at Bay Arms.'); } }
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
      if (input.consume('x') && P.fireCd <= 0 && !P.dead) { if (a.res > 0) { P.swing = 0.35; P.swingHit = false; P.fireCd = 1 / ws.rof; } else { sfx.fail(); toast('No grenades. Buy some at Bay Arms.'); } }
      if (P.swing > 0 && P.swing < 0.2 && !P.swingHit) { P.swingHit = true; throwGrenade(); if (a.res <= 0) toast('Out of grenades'); }
    } else { input.consume('y'); }
    input.consume('x');
    if (input.consume('a') && !P.dead && action) doAction(action);
  }
  // ---- pose
  const moved = Math.hypot(P.x - ox, P.z - oz) / Math.max(dt, 1e-4);
  if (moved > 6.5 && !inside) { P.runDist += moved * dt; if (P.runDist > 60) { P.runDist = 0; gainXP('stamina', 2); } }
  P.phase += dt * moved * 1.8;
  P.vy -= 24 * dt; P.y += P.vy * dt; if (P.y <= gy) { P.y = gy; P.vy = 0; }
  heroRoot.position.set(P.x, P.y, P.z); hero.root.rotation.y = P.face;
  hero.root.rotation.x = P.dead ? damp(hero.root.rotation.x, -Math.PI / 2, 8, dt) : 0;
  const kind = inside ? 'none' : ws.kind, firing = input.held('x');
  const gunReady = (kind === 'gun' || kind === 'rpg') && (firing || P.fireCd > -0.6);
  if (heroW) heroW.group.visible = !inside;
  poseCharacter(hero, { phase: P.phase, speed: Math.min(1, moved / 7), air: P.y > gy + 0.05, aim: gunReady ? 0 : -0.55, recoil: P.recoil, t: time });
  if (kind !== 'gun' && kind !== 'rpg') {
    const sw = Math.sin(P.phase) * Math.min(1, moved / 5) * 0.6;
    hero.armL.pivot.rotation.set(sw, 0, -0.08);
    if (P.swing > 0 && (kind === 'melee' || kind === 'grenade')) {
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

// ---------------- getting in and out of cars
function enterVehicle(v) {
  ride = v; heroRoot.visible = false; muzzleFlash.visible = false; audio();
  radioOn(true);
  toast(v.personal ? (carCfg.name || 'Your car') : v.taxi ? 'Bay Cab' : `${BODIES[v.cfg.body]?.label || 'Car'} (stolen)`, 1.6);
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
  if (job && job.type === 'taxi') endJob('You left the cab. Shift over.');
}
function jackTraffic(t) {
  traffic.splice(traffic.indexOf(t), 1); dyn.remove(t.mesh);
  const v = makeVehicle(t.lib.cfg, t.rx, t.rz, t.rh, false);
  peds.spawnLoose(t.rx + Math.cos(t.rh) * 2.4, t.rz - Math.sin(t.rh) * 2.4, P.x, P.z);
  peds.scare(t.rx, t.rz, 15); enterVehicle(v); sfx.thud(); gainXP('strength', 3);
}
async function breakIntoParked(p) {
  setState('mini');
  const r1 = await runMinigame('smash');
  if (!r1.win) { setState('play'); toast(r1.quit ? 'You walked away' : 'Car alarm! Better leave it.'); if (!r1.quit) peds.scare(p.x, p.z, 30); return; }
  const r2 = await runMinigame('hotwire', { wires: Math.random() < 0.35 ? 4 : 3 });
  setState('play');
  if (!r2.win) { toast(r2.quit ? 'You walked away' : 'Too slow, the alarm went off!'); peds.scare(p.x, p.z, 30); return; }
  p.taken = true; if (p.mesh) p.mesh.parent?.remove(p.mesh); removeCollider(p.col);
  ensureCarLib(); enterVehicle(makeVehicle(carLib[Math.floor(p.seed * carLib.length)].cfg, p.x, p.z, p.rot, false)); gainXP('driving', 5);
}
const carPos = { x: 0, z: 0 };
let driveDist = 0;
function updateVehicles(dt) {
  for (const v of [...vehicles]) {
    const c = v.s, s = v.st, b = v.b, driving = v === ride;
    if (!driving && Math.abs(c.v) < 0.05 && Math.abs(c.vx) + Math.abs(c.vz) < 0.05) { if (!v.personal && !v.taxi && Math.hypot(c.x - P.x, c.z - P.z) > 220) removeVehicle(v); continue; }
    c.braking = false;
    const dk = driving ? 1 + (lvl('driving') - 1) * 0.02 : 1;
    if (driving && !P.dead) {
      const st = input.stick;
      const gas = input.held('b') || input.keys.has('KeyW') || input.keys.has('ArrowUp');
      const brk = input.held('x') || input.keys.has('KeyS') || input.keys.has('ArrowDown');
      const onRoad = !!roadAt(c.x, c.z), sand = c.z > sandLine(c.x), hill = c.x < -300 && !onRoad;
      const top = s.top * dk * (onRoad ? 1 : Math.min(1, (sand ? 0.45 : hill ? 0.55 : 0.65) * s.off));
      if (gas && !brk) { if (c.v < -0.3) c.v = Math.min(0, c.v + 16 * dt); else if (c.v < top) c.v = Math.min(top, c.v + s.acc * dt * (1 - Math.max(0, c.v) / (s.top * 1.15))); }
      else if (brk) { if (c.v > 0.3) { c.v = Math.max(0, c.v - 18 * dt); c.braking = true; } else c.v = Math.max(-s.top * 0.32, c.v - s.acc * 0.6 * dt); }
      else c.v = damp(c.v, 0, 0.8, dt);
      if (c.v > top + 0.5) c.v = damp(c.v, top, 1.5, dt);
      c.steer = damp(c.steer, clamp(-st.x, -1, 1), 9, dt);
      if (input.consume('y')) sfx.horn();
      input.consume('b'); input.consume('x');
      if (input.consume('a')) { if (action) doAction(action); else exitCar(); }
      driveDist += Math.abs(c.v) * dt; if (driveDist > 250) { driveDist = 0; gainXP('driving', 3); }
    } else { c.v = damp(c.v, 0, 3, dt); c.steer = damp(c.steer, 0, 6, dt); }
    const spd = Math.abs(c.v);
    const turn = c.steer * s.turn * clamp(spd / 6, 0, 1) * (1 - Math.min(0.45, spd / s.top * 0.45)) * Math.sign(c.v || 1);
    c.h = wrapA(c.h + turn * dt);
    const fx = Math.sin(c.h), fz = Math.cos(c.h);
    const grip = (c.braking && spd > 12 && Math.abs(c.steer) > 0.3 ? 1.8 : 7) * s.grip * dk;
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

// ================================================================ NPC looks
const SKINS = ['#f6c9a4', '#e8b088', '#d39a6a', '#b77a4b', '#8d5524', '#6b3f22', '#452a1a'];
function seeded(seed) { let s = Math.abs(seed | 0) % 2147483646 + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function npcCfg(role, seed, style) {
  const r = seeded(seed * 7919 + 13);
  const hairColor = ['#141414', '#3b2416', '#6b4423', '#d8b26e', '#9a9a9a'][Math.floor(r() * 5)];
  const base = { ...DEFAULT_CHAR, skin: SKINS[Math.floor(r() * SKINS.length)], hairColor, mask: 'none', back: 'none', eyes: 'normal', mouth: 'smile', facialHair: r() < 0.3 ? 'stubble' : 'none', eyewear: 'none', gloves: 'none', hat: 'none', height: 0.93 + r() * 0.17, build: 0.9 + r() * 0.4, hair: ['short', 'bob', 'long', 'buzz', 'ponytail', 'quiff', 'bun', 'afro'][Math.floor(r() * 8)] };
  const c = col => col[Math.floor(r() * col.length)];
  switch (role) {
    case 'dealer': return { ...base, top: 'hoodie', topColor: c(['#16161b', '#3a3d45', '#55602f', '#8b1e3f', '#3a3fbf']), pants: 'cargo', pantsColor: '#3a3d45', shoes: 'sneakers', shoeColor: '#ffffff', hat: c(['cap', 'beanie', 'none']), hatColor: '#16161b', eyewear: r() < 0.6 ? 'shades' : 'none', hair: c(['buzz', 'short', 'afro', 'ponytail']), facialHair: r() < 0.5 ? 'goatee' : 'stubble' };
    case 'barber': return { ...base, top: 'tshirt', topColor: '#ffffff', pants: 'jeans', pantsColor: '#16161b', shoes: 'boots', shoeColor: '#16161b', hair: 'quiff', facialHair: 'beard' };
    case 'gun': return { ...base, top: 'armor', topColor: '#3a3d45', accent: '#55602f', pants: 'cargo', pantsColor: '#55602f', shoes: 'boots', shoeColor: '#16161b', hat: 'cap', hatColor: '#55602f', eyewear: 'shades', facialHair: 'bigbeard', hair: 'buzz', build: 1.3 };
    case 'waiter': return { ...base, top: 'tshirt', topColor: '#c9302c', pants: 'jeans', pantsColor: '#16161b', shoes: 'sneakers', shoeColor: '#ffffff', hat: 'cap', hatColor: '#c9302c' };
    case 'cashier': return { ...base, top: 'tshirt', topColor: '#2f80ed', pants: 'jeans', pantsColor: '#3a3d45', shoes: 'sneakers', shoeColor: '#ffffff' };
    case 'trainer': return { ...base, top: 'tank', topColor: '#16161b', pants: 'shorts', pantsColor: '#16161b', shoes: 'sneakers', shoeColor: '#ff8a2a', build: 1.4, hat: 'headband', hatColor: '#ff8a2a' };
    case 'croupier': return { ...base, top: 'suit', topColor: '#16161b', accent: '#8b1e3f', pants: 'jeans', pantsColor: '#16161b', shoes: 'boots', shoeColor: '#16161b' };
    case 'sales': return { ...base, top: 'suit', topColor: '#3a3fbf', accent: '#ffffff', pants: 'jeans', pantsColor: '#3a3d45', shoes: 'boots', shoeColor: '#16161b', eyewear: 'glasses' };
    case 'bartender': return { ...base, top: 'long', topColor: '#ffffff', pants: 'jeans', pantsColor: '#16161b', shoes: 'boots', shoeColor: '#16161b', facialHair: 'moustache' };
    case 'dj': return { ...base, top: 'jacket', topColor: '#9b51e0', accent: '#38e8ff', pants: 'jeans', pantsColor: '#16161b', shoes: 'sneakers', shoeColor: '#ffffff', eyewear: 'visor', hat: 'none', hair: 'mohawk' };
    case 'dispatcher': return { ...base, top: 'jacket', topColor: '#ffd23f', accent: '#16161b', pants: 'jeans', pantsColor: '#3a3d45', shoes: 'boots', shoeColor: '#7a5230', hat: 'cap', hatColor: '#ffd23f' };
    case 'clerk': { const o = OUTFITS[style || 'street']; const out = o ? o[Math.floor(r() * o.length)].cfg : {}; return { ...base, ...out }; }
    default: { const cols = ['#e23b3b', '#2f80ed', '#4cd964', '#ffd23f', '#ff8a2a', '#9b51e0', '#ffffff', '#16161b', '#ff6fb5', '#1fb5a8']; return { ...base, top: c(['tshirt', 'hoodie', 'long', 'jacket', 'tank']), topColor: c(cols), accent: c(cols), pants: c(['jeans', 'shorts', 'cargo']), pantsColor: c(['#2f80ed', '#16161b', '#c2b280', '#3a3d45']), shoes: 'sneakers', shoeColor: c(cols), hat: c(['none', 'none', 'cap', 'beanie']), hatColor: c(cols) }; }
  }
}
const NPC_NAMES = ['Marco', 'Jas', 'Dee', 'Tommy', 'Rosa', 'Kai', 'Lena', 'Omar', 'Bree', 'Vic', 'Sami', 'Jules', 'Ray', 'Nia', 'Theo', 'Pia', 'Luis', 'Cam'];
const nameFor = id => NPC_NAMES[Math.abs([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % NPC_NAMES.length];

// ================================================================ markers & NPCs in the city
const markers = [];
function makeMarker(x, z, icon, color, data, parent = G.scene) {
  const g = new THREE.Group();
  const r0 = data.car ? 3.2 : data.small ? 0.9 : 1.5;
  const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r0 + (data.car ? 0.6 : 0.35), 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3; g.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r0, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.29; g.add(disc);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(icon, 'rgba(20,18,38,.88)', color), depthWrite: false }));
  const s = data.small ? 1.4 : 2.4; sp.scale.set(s, s, 1); sp.position.y = data.npc ? 4.4 : data.small ? 2.6 : 3.4; g.add(sp);
  g.position.set(x, inside && parent !== G.scene ? 0 : Math.max(groundH(x, z), 0) + (roadAt(x, z) ? 0 : cityAt(x, z, -6) ? 0.15 : 0), z);
  parent.add(g);
  const m = { x, z, g, ring, sp, icon, color, baseY: sp.position.y, ...data };
  if (!data.interior) markers.push(m);
  return m;
}
const PLACE_COLORS = { dealer: '#4cd964', clothes: '#ff6fb5', barber: '#38e8ff', game: '#ffd23f', chop: '#ff8a2a', race: '#ff3b4a', property: '#b26bff', guns: '#ff5a3c', venue: '#ffb35c', job: '#ffd23f', customer: '#7dff9a' };
const NPC_ROLE = { dealer: 'dealer', job: 'dispatcher' };
const npcs = [];
PLACES.forEach((p, i) => {
  const outdoorNpc = !!NPC_ROLE[p.kind];
  p.pitch = 180 + ((i * 97) % 260);
  if (outdoorNpc) { p.cfg = npcCfg(NPC_ROLE[p.kind], i); p.npcName = p.npc || nameFor(p.id); npcs.push({ place: p, x: p.x, z: p.z, fig: null, face: 0, t: Math.random() * 5, cfg: p.cfg }); }
  makeMarker(p.x, p.z, p.interior ? p.icon : p.icon, PLACE_COLORS[p.kind], { place: p, car: !!p.car, npc: outdoorNpc });
});
for (const p of PROPERTIES) p.marker = makeMarker(p.x, p.z, 'house', PLACE_COLORS.property, { place: { ...p, kind: 'property' } });
function refreshPropertyMarkers() { for (const p of PROPERTIES) p.marker.sp.material.map = iconTex(owned.has(p.id) ? 'key' : 'house', owned.has(p.id) ? 'rgba(178,107,255,.95)' : 'rgba(20,18,38,.88)', owned.has(p.id) ? '#fff' : PLACE_COLORS.property); }
function updateNpcList(list, dt) {
  for (const n of list) {
    const d = Math.hypot(n.x - P.x, n.z - P.z);
    if (d > 120) { if (n.fig) n.fig.root.visible = false; continue; }
    if (!n.fig) { n.look ||= bakeCfg(n.cfg); n.fig = figure(n.look); (n.parent || dyn).add(n.fig.root); n.fig.root.position.set(n.x, baseY(n.x, n.z), n.z); }
    n.fig.root.visible = true; n.t += dt;
    const want = d < 12 ? Math.atan2(P.x - n.x, P.z - n.z) : (n.homeFace ?? Math.sin(n.t * 0.3) * 0.6 + Math.PI);
    n.face += wrapA(want - n.face) * Math.min(1, dt * 5); n.fig.root.rotation.y = n.face;
    const l = n.fig.limbs, br = Math.sin(n.t * 1.6) * 0.04;
    l[2].rotation.set(br, 0, -0.08); l[3].rotation.set(-br + (n.role === 'dealer' ? -0.4 : 0), 0, 0.08);
    if (n.dance) { n.fig.root.position.y = Math.abs(Math.sin(n.t * 6)) * 0.15; l[2].rotation.x = Math.sin(n.t * 6) * 1.2 - 1.2; l[3].rotation.x = -Math.sin(n.t * 6) * 1.2 - 1.2; }
  }
}
function allNpcs() { return inside ? inside.npcs : [...npcs, ...custNpcs()]; }
function updateMarkers() {
  const list = inside ? inside.marks : markers;
  for (const m of list) {
    const d = Math.hypot(m.x - P.x, m.z - P.z); m.g.visible = inside ? true : d < 140;
    if (!m.g.visible) continue;
    m.ring.scale.setScalar(1 + Math.sin(time * 3 + m.x) * 0.06);
    m.sp.position.y = m.baseY + Math.sin(time * 2 + m.z) * 0.2;
  }
}

// ================================================================ INTERIORS
function fade(cb) { const f = $('fade'); f.classList.add('on'); setTimeout(() => { cb(); setTimeout(() => f.classList.remove('on'), 60); }, 220); }
function showroomCfgs() { const r = seeded(dayN * 31); const bodies = Object.keys(CAR_PRICES); return [0, 1, 2].map(i => ({ ...DEFAULT_CAR, ...randomCar(r), body: bodies[Math.floor(r() * bodies.length)], decal: 'none', roof: 'none', underglow: 'off' })); }
function enterInterior(place, prop) {
  const id = prop ? prop.home : place.interior;
  fade(() => {
    if (prop && !homes[prop.id]) homes[prop.id] = (prop.starter ? STARTER_FURNITURE : [{ t: 'single', x: -2.5, z: -2, r: 0, c: '#3a5fa0' }, { t: 'fridge', x: 2.5, z: -2.8, r: 0 }]).map(f => ({ ...f }));
    const h = buildInterior(id, prop ? homes[prop.id] : null, id === 'motors' ? showroomCfgs() : []);
    G.scene.add(h.group);
    inside = { id, place: place || prop, prop, h, back: { x: (place || prop).x, z: (place || prop).z }, npcs: [], marks: [] };
    const tpl = INTERIORS[id];
    tpl.npcs.forEach((n, i) => {
      const w = h.toWorld(n.x, n.z);
      const cfg = (n.role === 'clerk' || n.role === 'gun' || n.role === 'barber') ? npcCfg(n.role, [...place.id].reduce((a, c) => a + c.charCodeAt(0), 0) + i, place.style) : npcCfg(n.role, [...(place?.id || id)].reduce((a, c) => a + c.charCodeAt(0), 0) * 3 + i);
      inside.npcs.push({ x: w.x, z: w.z, role: n.role, cfg, fig: null, face: 0, homeFace: 0, t: Math.random() * 5, parent: dyn, name: nameFor((place?.id || id) + n.role + i), relId: (place?.id || id) + ':' + n.role, dance: false });
    });
    if (id === 'club') for (let i = 0; i < 6; i++) { const w = h.toWorld(-2 + (i % 3) * 2, -0.8 + Math.floor(i / 3) * 2.4); inside.npcs.push({ x: w.x, z: w.z, role: 'guest', cfg: npcCfg('guest', 900 + i), fig: null, face: rand(0, 6), homeFace: rand(0, 6), t: rand(0, 6), parent: dyn, name: 'Clubber', dance: true }); }
    for (const s of tpl.spots) { const w = h.toWorld(s.x, s.z); inside.marks.push({ ...makeMarker(w.x, w.z, s.icon, '#ffd23f', { interior: true, small: true }, G.scene), spot: s }); }
    const door = h.toWorld(0, h.d / 2 - 1.3);
    Object.assign(P, { x: door.x, z: door.z, face: Math.PI, y: 0, vy: 0 });
    for (const t of traffic) dyn.remove(t.mesh); traffic.length = 0; peds.clear();
    water.visible = false; signGroup.visible = false;
    updateCamera(0, true); hudCache.zone = null;
    sfx.click();
  });
}
function exitInterior(silent) {
  if (!inside) return;
  const go = () => {
    if (editMode) endEdit();
    inside.h.dispose(); G.scene.remove(inside.h.group);
    for (const n of inside.npcs) if (n.fig) dyn.remove(n.fig.root);
    for (const m of inside.marks) G.scene.remove(m.g);
    Object.assign(P, { x: inside.back.x, z: inside.back.z + 1.2, face: 0 }); P.y = baseY(P.x, P.z);
    const pend = pendingCar; inside = null; pendingCar = false;
    water.visible = true; signGroup.visible = true;
    loadBudget = 60; updateChunks(P.x, P.z, 2); loadBudget = 2;
    updateCamera(0, true);
    if (pend) { bringCar(true); toast('Your new car is parked outside. Enjoy!', 3); }
  };
  silent ? go() : fade(go);
}

// ---------------- home: furniture use & edit mode
const FURN_VERB = { sleep: 'Sleep', eat: 'Eat', cook: 'Cook', sit: 'Sit', tv: 'Watch TV', read: 'Read', laptop: 'Laptop', lift: 'Lift', run: 'Run', music: 'Music', relax: 'Relax', arcade: 'Play' };
const FURN_ICON = { sleep: 'bed', eat: 'fridge', cook: 'food', sit: 'sofa', tv: 'tv', read: 'book', laptop: 'chart', lift: 'dumbbell', run: 'run', music: 'music', relax: 'smile', arcade: 'play' };
let useCd = {};
function advanceTime(h) { const steps = Math.ceil(h * 4); for (let i = 0; i < steps; i++) { const before = clockH; clockH += h / steps; if (clockH >= 24) clockH -= 24; if (before < 6 && clockH >= 6) newDay(); } }
async function useFurn(item) {
  const act = FURN[item.t].act;
  if (act === 'sleep') {
    const hrs = clockH >= 20 || clockH < 6 ? ((31 - clockH) % 24) : 3;
    fade(() => { advanceTime(hrs); stats.energy = 100; stats.mood = clamp(stats.mood + 6, 0, 100); P.hp = maxHP(); saveGame(); toast(hrs > 4 ? 'Good morning! Fully rested.' : 'You took a nap. Energy restored.', 3); });
  } else if (act === 'eat' || act === 'cook') {
    if (stats.groceries <= 0) { toast('The fridge is empty. Buy groceries at QuickMart.'); sfx.fail(); return; }
    stats.groceries--; feed(FOODS.meal); if (act === 'cook') feed({ mood: 6 }); sfx.coin(); toast(`Ate a home-cooked meal. ${stats.groceries} meals left.`);
  } else if (act === 'sit') { feed({ mood: 3, energy: 4 }); toast('You kick back for a minute.'); }
  else if (act === 'tv') { fade(() => { advanceTime(1); feed({ mood: 10, energy: 4 }); toast('You watched an episode of "Bay Housewives". Mood up.'); }); }
  else if (act === 'read') { if ((useCd.read || 0) > gameHours()) { toast('You already read today. Try tomorrow.'); return; } useCd.read = gameHours() + 12; fade(() => { advanceTime(1); feed({ energy: -4, mood: 3 }); gainXP('charm', 40); toast('You read "How to Talk to Anyone". Charm up.'); }); }
  else if (act === 'laptop') openMarket();
  else if (act === 'lift') { const r = await mini('gym'); gainXP('strength', r.score * 10); gainXP('health', r.score * 3); feed({ energy: -10, mood: 4 }); }
  else if (act === 'run') { const r = await mini('tread'); gainXP('stamina', Math.round(r.score * 0.6)); gainXP('health', Math.round(r.score * 0.3)); feed({ energy: -12, mood: 4 }); }
  else if (act === 'music') { homeMusic = !homeMusic; radioOn(homeMusic); toast(homeMusic ? `Playing ${STATIONS[radioIndex()].name}` : 'Music off'); }
  else if (act === 'relax') { feed({ mood: 8 }); toast('The fish are very calming.'); }
  else if (act === 'arcade') { const r = await mini('beat'); feed({ mood: 10 }); }
  saveGame();
}
async function mini(kind, opts = {}) { setState('mini'); const r = await runMinigame(kind, opts); setState('play'); return r; }
function startEdit() { if (!inside?.prop) return; editMode = true; held = null; toast('Edit mode: pick up, move and rotate furniture.', 3); $('editBar').classList.remove('hidden'); }
function endEdit() { if (held) { const p = holdPos(); if (fits(held.t, p.x, p.z, held.r)) placeHeld(true); else { storage.push({ t: held.t, c: held.c }); inside.h.group.remove(held.ghost); held = null; toast('No room there, so it went into storage.'); } } editMode = false; $('editBar').classList.add('hidden'); saveHome(); }
function saveHome() { if (inside?.prop) { homes[inside.prop.id] = inside.h.furn.map(f => ({ t: f.t, x: f.x, z: f.z, r: f.r, c: f.c })); saveGame(); } }
function nearestFurn(maxD = 2.2) { let best = null, bd = maxD; for (const f of inside.h.furn) { const w = inside.h.toWorld(f.x, f.z), d = Math.hypot(w.x - P.x, w.z - P.z); if (d < bd) { bd = d; best = f; } } return best; }
function holdPos() { const lx = P.x - ORIGIN.x + Math.sin(P.face) * 1.9, lz = P.z - ORIGIN.z + Math.cos(P.face) * 1.9; const w = inside.h.w, d = inside.h.d; return { x: clamp(Math.round(lx * 2) / 2, -w / 2 + 0.6, w / 2 - 0.6), z: clamp(Math.round(lz * 2) / 2, -d / 2 + 0.6, d / 2 - 1.6) }; }
function pickUp(f) { held = { t: f.t, c: f.c, r: f.r }; inside.h.remove(f); held.mesh = inside.h.place(held.t, 0, 0, held.r, held.c); inside.h.remove(held.mesh); held.ghost = held.mesh.mesh; inside.h.group.add(held.ghost); held.ghost.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.6; } }); sfx.click(); }
function footprint(t, x, z, r) { const F = FURN[t], sw = Math.abs(Math.sin(r)) > 0.5; const w = (sw ? F.d : F.w) / 2, d = (sw ? F.w : F.d) / 2; return { x0: x - w, x1: x + w, z0: z - d, z1: z + d }; }
function fits(t, x, z, r) {
  const a = footprint(t, x, z, r), h = inside.h;
  if (a.x0 < -h.w / 2 || a.x1 > h.w / 2 || a.z0 < -h.d / 2 || a.z1 > h.d / 2 - 1.6 && Math.abs(x) < 2.4) return false;
  return !h.furn.some(f => { const b = footprint(f.t, f.x, f.z, f.r); return a.x0 < b.x1 - 0.05 && a.x1 > b.x0 + 0.05 && a.z0 < b.z1 - 0.05 && a.z1 > b.z0 + 0.05; });
}
function placeHeld(force) { const p = holdPos(); if (!force && !fits(held.t, p.x, p.z, held.r)) { toast("It doesn't fit there"); sfx.fail(); return; } inside.h.group.remove(held.ghost); inside.h.place(held.t, p.x, p.z, held.r, held.c); held = null; sfx.equip(); saveHome(); }
function updateEdit(dt) {
  if (held) { const p = holdPos(); held.ghost.position.set(p.x, 0, p.z); held.ghost.rotation.y = held.r; const ok = fits(held.t, p.x, p.z, held.r); if (ok !== held.ok) { held.ok = ok; held.ghost.traverse(o => { if (o.isMesh && o.material.emissive) o.material.emissive.set(ok ? '#000000' : '#c01010'); }); } }
  if (input.consume('a')) { if (held) placeHeld(); else { const f = nearestFurn(); if (f) pickUp(f); else toast('Walk up to a piece of furniture'); } }
  if (input.consume('x')) { if (held) { held.r = (held.r + Math.PI / 2) % (Math.PI * 2); sfx.click(); } else { const f = nearestFurn(); if (f) { const n = inside.h.move(f, f.x, f.z, (f.r + Math.PI / 2) % (Math.PI * 2)); saveHome(); sfx.click(); } } }
  if (input.consume('y')) { if (held) { storage.push({ t: held.t, c: held.c }); inside.h.group.remove(held.ghost); held = null; saveHome(); toast('Put into storage'); } else { const f = nearestFurn(); if (f) { storage.push({ t: f.t, c: f.c }); inside.h.remove(f); saveHome(); toast(`${FURN[f.t].name} put into storage`); } } }
  if (input.consume('b')) endEdit();
}
function openStorage() {
  return sheet('Your storage', () => {
    if (!storage.length) return `<p class="sheet-hint">Storage is empty. Buy furniture at Casa Bay Furniture. It gets delivered here.</p>`;
    return `<div class="grows">${storage.map((s, i) => `<div class="grow">${svg(FURN_ICON[FURN[s.t].act] || 'sofa')}<span class="gn"><b>${FURN[s.t].name}</b><small><i class="dot" style="background:${s.c || FURN[s.t].colors?.[0]}"></i></small></span><button class="tbuy" data-place="${i}">Place</button></div>`).join('')}</div>`;
  }, (root, close) => root.querySelectorAll('[data-place]').forEach(b => b.onclick = () => { const s = storage.splice(+b.dataset.place, 1)[0]; close(); if (held) placeHeld(); held = { t: s.t, c: s.c, r: 0 }; const it = inside.h.place(s.t, 0, 0, 0, s.c); inside.h.remove(it); held.ghost = it.mesh; inside.h.group.add(held.ghost); toast('Walk to where you want it, then press Place'); }));
}

// ================================================================ ACTIONS (context button)
let action = null;
const VERB = { dealer: 'Talk', clothes: 'Enter', barber: 'Enter', guns: 'Enter', venue: 'Enter', game: 'Play', chop: 'Sell car', race: 'Race', property: 'View', job: 'Talk', customer: 'Talk' };
const SPOT_VERB = s => s.label;
function findAction() {
  if (P.dead) return null;
  if (inside) {
    if (editMode) return null;
    let best = null, bd = 1.9;
    for (const m of inside.marks) { const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < bd) { bd = d; best = { kind: 'spot', spot: m.spot, icon: m.spot.icon === 'chat' ? 'chat' : 'door', label: SPOT_VERB(m.spot) }; } }
    if (inside.prop) for (const f of inside.h.furn) { const a = FURN[f.t].act; if (!a) continue; const w = inside.h.toWorld(f.x, f.z), d = Math.hypot(w.x - P.x, w.z - P.z) - Math.max(FURN[f.t].w, FURN[f.t].d) / 2 + 0.3; if (d < bd) { bd = d; best = { kind: 'furn', item: f, icon: 'chat', label: FURN_VERB[a] }; } }
    if (P.z > ORIGIN.z + inside.h.d / 2 - 1.6 && Math.abs(P.x - ORIGIN.x) < 1.6) return { kind: 'exit', icon: 'exit', label: 'Leave' };
    return best;
  }
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
  for (const m of markers) if (!m.car) { const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < 2.6) consider(d - 1, { kind: 'place', m, icon: m.npc ? 'chat' : 'door', label: m.place.kind === 'property' && owned.has(m.place.id) ? 'Enter' : VERB[m.place.kind] }); }
  for (const c of customers) if (c.npc?.fig) { const d = Math.hypot(c.x - P.x, c.z - P.z); if (d < 2.4) consider(d - 1.2, { kind: 'customer', c, icon: 'chat', label: 'Deal' }); }
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
  else if (a.kind === 'customer') talkCustomer(a.c);
  else if (a.kind === 'place') openPlace(a.m.place);
  else if (a.kind === 'spot') doSpot(a.spot);
  else if (a.kind === 'furn') useFurn(a.item);
  else if (a.kind === 'exit') exitInterior();
}
function openPlace(p) {
  sfx.click();
  if (p.kind === 'dealer') talkDealer(p);
  else if (p.interior) enterInterior(p);
  else if (p.kind === 'property') { const prop = PROPERTIES.find(q => q.id === p.id); owned.has(p.id) ? enterInterior(null, prop) : openProperty(prop); }
  else if (p.kind === 'game') openGame(p);
  else if (p.kind === 'job') talkJob(p);
  else if (p.kind === 'chop') openChop(p);
  else if (p.kind === 'race') openRace(p);
}
async function doSpot(s) {
  const place = inside.place, id = inside.id;
  if (s.kind === 'talk') return talkVenue();
  if (s.kind === 'mirror') return openShop('clothes', place);
  if (s.kind === 'range') {
    if (!(ws.kind === 'gun' || ws.kind === 'rpg') || arsenal.cur === 'rpg') { toast('Equip a gun from the weapon wheel first'); return; }
    if (money < 15) { toast('Range time costs $15'); return; }
    spend(15); const r = await mini('gallery', { title: `${SLOT[arsenal.cur].name} practice`, pay: false });
    gainXP('gun_' + arsenal.cur, (r.hits || 0) * 6); if (r.hits) toast(`${SLOT[arsenal.cur].name} skill +${r.hits * 6} XP`);
  }
  if (s.kind === 'lift' || s.kind === 'bag') { if (money < 10) { toast('Gym sessions cost $10'); return; } spend(10); const r = await mini('gym', { title: s.kind === 'bag' ? 'Heavy Bag' : 'Bench Press' }); gainXP('strength', r.score * 12); gainXP('health', r.score * (s.kind === 'bag' ? 6 : 3)); feed({ energy: -10, mood: 5 }); }
  if (s.kind === 'tread') { if (money < 10) { toast('Gym sessions cost $10'); return; } spend(10); const r = await mini('tread'); gainXP('stamina', Math.round(r.score * 0.7)); gainXP('health', Math.round(r.score * 0.35)); feed({ energy: -12, mood: 5 }); }
  if (s.kind === 'blackjack' || s.kind === 'slots') { if (money < 10) { toast('You need at least $10 to play'); return; } const r = await mini(s.kind, { money }); if (r.money) addMoney(r.money); feed({ mood: r.money > 0 ? 8 : -3 }); }
  if (s.kind === 'dj') { const r = await mini('beat', { title: 'Neon Room DJ set' }); if (r.money) addMoney(r.money); gainXP('charm', r.score); feed({ mood: 10, energy: -6 }); }
  if (s.kind === 'dance') { fade(() => { advanceTime(0.5); feed({ mood: 14, energy: -8 }); gainXP('charm', 12); gainXP('stamina', 8); toast('You owned the dance floor. Mood up, Charm up.'); }); }
  saveGame();
}

// ================================================================ RELATIONSHIPS
const rel = id => stats.rel[id] || 0;
function bumpRel(id, amt, daily = true) {
  if (!id) return 0;
  const k = id + ':' + dayN; stats.relDay[k] ||= 0;
  const cap = 12, gain = daily ? Math.max(0, Math.min(amt * (1 + (lvl('charm') - 1) * 0.1), cap - stats.relDay[k])) : amt;
  if (gain <= 0 && amt > 0) return 0;
  const before = relName(rel(id));
  stats.rel[id] = clamp(rel(id) + gain, 0, 100); if (daily && amt > 0) stats.relDay[k] += gain;
  const after = relName(rel(id));
  if (after !== before && amt > 0) toast(`You and ${relNames[id] || 'them'} are now ${after}`, 3);
  setTalkRel(id); return gain;
}
const relNames = {};
function setTalkRel(id) { const el = $('talkRel'); if (!id) { el.classList.add('hidden'); return; } const v = rel(id); el.classList.remove('hidden'); el.innerHTML = `${svg('heart', 'sm')}<span class="relbar"><i style="width:${v}%"></i></span><small>${relName(v)}</small>`; }

// ================================================================ CONVERSATIONS
function zoneBg(x, z) { if (inside) return 'interior'; const n = zoneName(x, z); return n === 'Bay Beach' ? 'beach' : n === 'Hidden Hills' || n === 'Countryside' || n === 'Farmland' ? 'hills' : n.includes('Airport') ? 'airport' : 'city'; }
function beginTalk(cfg, name, tag, pitch, relId) { talk.layout(W, H); talk.begin({ npcCfg: cfg, youCfg: charCfg, name, tag, pitch, bg: zoneBg(P.x, P.z), night, wall: inside ? INTERIORS[inside.id].wall : null, floor: inside ? INTERIORS[inside.id].floor : null }); if (relId) relNames[relId] = name; setTalkRel(relId); setState('talk'); }
function endTalk() { talk.end(); setState('play'); }
const I = (n, t) => `${svg(n, 'sm')} ${t}`;
const DEALER_HI = { Stranger: ["Do I know you? ...What you need.", "Keep it quick, cops roll through here.", "New face. Prices are prices."], Known: ["You again. What you need?", "Ayy, back for more?"], Friendly: ["My guy! What we doing today?", "Good to see you. Fresh stock in."], Trusted: ["There's my best customer. I got you.", "For you? Always open."], Family: ["Family! Sit down, sit down.", "Anything you need, it's yours."] };
const DEALER_WHO = ["Name's {n}. I run this corner. That's all you need to know.", "{n}. Been here since before the tourists.", "They call me {n}. Don't ask why."];
const DEALER_CHAT = ["Business is slow when it rains. Never rains here though.", "Northfield pays crazy for Moon Rocks some days.", "Don't trust anybody who drives a limo. That's my advice.", "The airport crew always have cash. Always.", "You ever been to the Neon Room? Good vibes.", "My cousin runs the chop shop out east. Tell Lucky I sent you."];
function hotTip(except) {
  const opts = [];
  for (const p of PLACES) if (p.kind === 'dealer' && p !== except) { const pr = dealerPricesFor(p); for (const g of GOODS) if (pr[g.id].hot) opts.push({ p, g, pr: pr[g.id] }); }
  return opts.length ? pick(opts) : null;
}
function dealerPricesFor(p) {
  const base = dealerPrices(p, dayN), m = relPriceMod(rel(p.id)), dl = 1 - (lvl('dealing') - 1) * 0.012, hag = stats.haggle[p.id] === dayN ? 0.93 : 1, out = {};
  for (const g of GOODS) { const b = base[g.id]; out[g.id] = { ...b, buy: Math.max(1, Math.round(b.buy * m * dl * hag)), sell: Math.round(b.sell * (2 - m) * (2 - dl) * (2 - hag)) }; }
  return out;
}
async function talkDealer(p) {
  beginTalk(p.cfg, p.npcName, p.name, p.pitch, p.id);
  await talk.say(pick(DEALER_HI[relName(rel(p.id))]));
  for (;;) {
    const opts = [{ label: I('deal', 'Trade'), id: 'trade' }, { label: I('chat', 'Chat'), id: 'chat' }, { label: I('star', 'Heard anything?'), id: 'tip' }];
    if (stats.haggle[p.id] !== dayN) opts.push({ label: I('smile', `Haggle <small>(Charm ${lvl('charm')})</small>`), id: 'haggle' });
    opts.push({ label: I('x', 'Later'), id: 'bye' });
    const c = opts[await talk.choose(opts)].id;
    if (c === 'trade') { const v = await openTrade(p); if (v) bumpRel(p.id, Math.min(6, v / 400)); await talk.say(pick(['Pleasure doing business.', 'Smart move.', 'Anything else?', 'Come back tomorrow, prices change.'])); }
    else if (c === 'chat') {
      await talk.say(pick(["How's business?", "What's new around here?", "You good?"]), 'you');
      const k = stats.relDay[p.id + ':chat:' + dayN];
      if (k) { await talk.say("We already talked today. I got work to do."); continue; }
      stats.relDay[p.id + ':chat:' + dayN] = 1;
      await talk.say(rel(p.id) < 20 ? pick(DEALER_WHO).replace('{n}', p.npcName) : pick(DEALER_CHAT));
      bumpRel(p.id, 3 + lvl('charm') * 0.5); gainXP('charm', 8);
    }
    else if (c === 'tip') {
      await talk.say('Any good deals going round?', 'you');
      if (rel(p.id) < 20) { await talk.say("I don't know you like that. Buy something first."); continue; }
      const t = hotTip(p);
      if (!t) { await talk.say("Quiet day. Nothing worth the drive."); continue; }
      await talk.say(t.pr.hot === 'cheap' ? `${t.p.npc} over at ${t.p.name.replace(' Dealer', '')} is dumping ${t.g.name} cheap. ${fmt(t.pr.buy)} a pop.` : `${t.p.npc} at ${t.p.name.replace(' Dealer', '')} is paying ${fmt(t.pr.sell)} for ${t.g.name}. Crazy money.`);
      const k = await talk.choose([I('pin', 'Mark it on my map'), I('check', 'Good to know')]);
      if (k === 0) { setWaypoint(t.p.x, t.p.z, t.p.name); await talk.say("Marked. Don't say I never did nothing for you."); }
    }
    else if (c === 'haggle') {
      await talk.say(pick(["Come on, we can do better than that.", "I'm buying a lot, cut me a deal.", "You know I'm good for it."]), 'you');
      const chance = 0.22 + (lvl('charm') - 1) * 0.07 + rel(p.id) * 0.004 + (stats.mood - 50) * 0.003;
      if (Math.random() < chance) { stats.haggle[p.id] = dayN; gainXP('charm', 30); await talk.say(pick(["Alright, alright. Better prices, today only.", "You drive a hard bargain. Fine."])); }
      else { stats.haggle[p.id] = dayN; bumpRel(p.id, -3, false); gainXP('charm', 6); await talk.say(pick(["Don't push it.", "Nah. Prices are prices.", "You trying to insult me?"])); }
    }
    else { await talk.say(pick(["Stay low.", "Don't be a stranger.", "Watch your back out there.", "Peace."])); break; }
  }
  endTalk(); saveGame();
}
async function talkVenue() {
  const id = inside.id, place = inside.place, n = nearestNpc();
  if (!n) return;
  const name = id === 'clothes' || id === 'barber' || id === 'guns' ? (relNames[n.relId] = n.name) : n.name;
  if (id === 'clothes' || id === 'barber') return talkShop(place, n);
  if (id === 'guns') return talkGuns(place, n);
  const menu = { diner: 'diner', mart: 'mart', bar: 'bar', club: 'club' }[id];
  if (menu) return talkFood(n, menu, place);
  if (id === 'gym') return talkTrainer(n, place);
  if (id === 'casino') return talkCashier(n, place);
  if (id === 'motors') return talkSales(n, place);
  if (id === 'casa') return talkCasa(n, place);
}
function nearestNpc() { let best = null, bd = 1e9; for (const n of inside.npcs) { if (n.role === 'guest') continue; const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < bd) { bd = d; best = n; } } return best; }
async function talkShop(p, n) {
  const barber = p.kind === 'barber';
  beginTalk(n.cfg, n.name, p.name, p.pitch, n.relId);
  await talk.say(barber ? pick(["Take a seat! What are we doing today?", "You're looking a little shaggy, friend.", "Fresh cut? You came to the right place."]) : pick([`Welcome to ${p.name}! Everything's ${STYLE_NAMES[p.style]}.`, "Hey! New stock just came in.", "Looking for a new look?"]));
  const c = await talk.choose([I(barber ? 'scissors' : 'shirt', barber ? 'Get a cut' : 'Browse'), I('chat', 'Chat'), I('x', 'Just looking')]);
  if (c === 0) { bumpRel(n.relId, 2); talk.end(); openShop(p.kind, p); return; }
  if (c === 1) { await talk.say(pick(["Bay City's changing, you know? Everyone wants to look rich now.", "My cousin says you can make a killing out at the airport.", "You should hit the Neon Room this weekend."])); bumpRel(n.relId, 3); gainXP('charm', 6); }
  await talk.say(pick(['No worries, come back anytime!', 'Alright, see you around.'])); endTalk();
}
async function talkGuns(p, n) {
  beginTalk(n.cfg, n.name, p.name, p.pitch, n.relId);
  await talk.say(pick(["Welcome to Bay Arms. Cash only.", "Looking to protect yourself?", "Everything here's legal. Mostly."]));
  for (;;) {
    const c = await talk.choose([I('gun', 'Weapons & ammo'), I('wrench', 'Customise a gun'), I('target', 'How does the range work?'), I('x', 'Leave')]);
    if (c === 0) { const v = await openGunStore(p); if (v) bumpRel(n.relId, v / 500); await talk.say(pick(['Stay safe out there.', 'Good choice.', 'Anything else?'])); }
    else if (c === 1) {
      const guns = arsenal.owned.filter(id => SLOT[id].kind === 'gun');
      if (!guns.length) { await talk.say("You don't own a gun I can work on. Buy one first."); continue; }
      await talk.say('Which piece are we working on?');
      const k = await talk.choose([...guns.map(id => `${iconSVG(id, 'sm')} ${arsenal.cfg[id].name || SLOT[id].name}`), I('x', 'Never mind')]);
      if (k < guns.length) { talk.end(); openGunsmith(guns[k], p); return; }
    }
    else if (c === 2) await talk.say("Fifteen bucks a session. Equip a gun, step up to the lane. Every hit makes you better with that gun: tighter aim, faster reloads.");
    else { await talk.say('Come back soon.'); break; }
  }
  endTalk();
}
async function talkFood(n, menu, place) {
  beginTalk(n.cfg, n.name, place.name, 260, n.relId);
  await talk.say(menu === 'mart' ? pick(["Find everything okay?", "Groceries are in the back. Snacks up front."]) : menu === 'bar' || menu === 'club' ? pick(["What are you drinking?", "Long day? I got you."]) : pick(["Welcome in! What can I get you, hon?", "Coffee's fresh. What'll it be?"]));
  for (;;) {
    const items = MENUS[menu].map(k => ({ k, f: FOODS[k] }));
    const opts = [...items.map(({ f }) => ({ label: `${f.name} <small>${fmt(f.price)}</small>`, disabled: money < f.price })), I('x', 'That\'s all')];
    const c = await talk.choose(opts);
    if (c >= items.length) break;
    const { k, f } = items[c]; spend(f.price); feed(f); bumpRel(n.relId, 1);
    if (k === 'groceries') await talk.say(`Here you go. That's ${stats.groceries} meals in your fridge at home.`);
    else await talk.say(pick(['Enjoy!', 'Coming right up.', 'There you go.', 'Good choice.']));
  }
  await talk.say(pick(['Take care now.', 'Come back soon!', 'See ya.'])); endTalk(); saveGame();
}
async function talkTrainer(n, place) {
  beginTalk(n.cfg, n.name, place.name, 200, n.relId);
  await talk.say(pick(["Let's get to work! Bench, treadmill or bag. Ten bucks a session.", "You look like you skip leg day."]));
  const done = stats.relDay['train:' + dayN];
  const c = await talk.choose([I('dumbbell', `Personal training <small>$60</small>`), I('chart', 'How am I doing?'), I('x', 'Later')]);
  if (c === 0) {
    if (done) await talk.say("One session a day. Your muscles need to recover!");
    else if (money < 60) await talk.say("Sixty bucks. Come back when you've got it.");
    else { spend(60); stats.relDay['train:' + dayN] = 1; fade(() => { advanceTime(1); gainXP('strength', 60); gainXP('stamina', 40); gainXP('health', 40); feed({ energy: -15, mood: 8 }); }); bumpRel(n.relId, 4); await talk.say("Great session! You'll feel that tomorrow."); }
  } else if (c === 1) await talk.say(`Strength ${lvl('strength')}, stamina ${lvl('stamina')}, health ${lvl('health')}. ${lvl('strength') < 4 ? 'We have work to do.' : 'Looking strong!'}`);
  endTalk();
}
async function talkCashier(n, place) {
  beginTalk(n.cfg, n.name, place.name, 300, n.relId);
  await talk.say(pick(["Welcome to the Lucky 7. Tables are hot tonight.", "Feeling lucky?"]));
  const c = await talk.choose([I('cards', 'How do I play blackjack?'), I('chat', 'Chat'), I('x', 'Bye')]);
  if (c === 0) await talk.say("Get closer to 21 than the dealer. Face cards are ten, aces are one or eleven. Blackjack pays three to two.");
  else if (c === 1) { await talk.say("A guy won a hundred grand on slots last week. Then lost it all at the table."); bumpRel(n.relId, 3); gainXP('charm', 6); }
  endTalk();
}
async function talkSales(n, place) {
  beginTalk(n.cfg, n.name, place.name, 240, n.relId);
  await talk.say(pick(["Welcome to Bay Motors! Let's find you something special.", "Every car here is a steal. Legally speaking."]));
  const c = await talk.choose([I('car', 'Browse cars'), I('chat', 'Any deals?'), I('x', 'Just looking')]);
  if (c === 1) { await talk.say(rel(n.relId) >= 40 ? "For you? Ten percent off anything. Don't tell my manager." : "Buy a car or two and we'll talk deals."); bumpRel(n.relId, 2); endTalk(); return; }
  if (c === 0) { talk.end(); openCarShop(n); return; }
  endTalk();
}
async function talkCasa(n, place) {
  beginTalk(n.cfg, n.name, place.name, 280, n.relId);
  await talk.say("Welcome to Casa Bay! Everything gets delivered to your home storage.");
  const c = await talk.choose([I('sofa', 'Browse furniture'), I('x', 'Just looking')]);
  if (c === 0) { await openFurnShop(); bumpRel(n.relId, 2); await talk.say("Enjoy! Use Edit Home in your place to set it up."); }
  endTalk();
}
async function talkJob(p) {
  const npc = npcs.find(n => n.place === p);
  beginTalk(p.cfg, p.npcName, p.name, p.pitch, p.id);
  if (job) { await talk.say("You're already on a shift. Finish that first."); endTalk(); return; }
  await talk.say(p.job === 'taxi' ? "Need work? Grab a cab, pick up fares, get 'em there fast. You keep the fares." : "Got parcels that need to be across town yesterday. Fast delivery, fast cash.");
  const c = await talk.choose([I('check', 'Start a shift'), I('x', 'Not now')]);
  endTalk();
  if (c === 0) startJob(p);
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
  p.buyer ??= Math.random() < (night > 0.5 ? 0.55 : 0.32) + (lvl('dealing') - 1) * 0.03;
  p.chats ??= 0;
  const bg = zoneBg(p.x, p.z);
  beginTalk(p.look.cfg, pick(['Local', 'Stranger', 'Passer-by']), zoneName(p.x, p.z), 160 + Math.random() * 280);
  await talk.say(pick(night > 0.5 && Math.random() < 0.5 ? PED_LINES.night : PED_LINES[bg] || PED_LINES.city));
  let done = false;
  while (!done) {
    const have = GOODS.filter(g => stash[g.id] > 0);
    const opts = [{ label: I('chat', 'Chat'), id: 'chat' }];
    if (have.length) opts.push({ label: I('deal', 'Offer something'), id: 'sell' });
    opts.push({ label: I('cash', 'Rob them'), id: 'rob' }, { label: I('x', 'Bye'), id: 'bye' });
    const c = opts[await talk.choose(opts)].id;
    if (c === 'chat') { p.chats++; gainXP('charm', 3); await talk.say(p.chats > 3 ? "Okay, I really have to go." : pick([...(PED_LINES[bg] || []), ...PED_LINES.city])); if (p.chats > 3) done = true; }
    else if (c === 'sell') {
      await talk.say("Psst. You looking for something?", 'you');
      if (!p.buyer) { await talk.say(pick(["What? No! Get away from me!", "I'm calling my mom.", "Not interested, weirdo."])); peds.release(p); peds.flee(p, P.x, P.z); endTalk(); return; }
      const g = pick(have), n = Math.min(stash[g.id], 1 + Math.floor(Math.random() * (2 + lvl('dealing') / 3))), price = Math.round(g.base * rand(1.15, 1.6) * (1 + (lvl('charm') - 1) * 0.02)) * n;
      await talk.say(`...Maybe. I'll give you ${fmt(price)} for ${n} ${g.name}.`);
      const k = await talk.choose([I('check', 'Deal'), I('x', 'No way')]);
      if (k === 0) { stash[g.id] -= n; addMoney(price); gainXP('dealing', Math.round(price / 40)); bumpRel('street', 2); await talk.say(pick(["Pleasure. We never met.", "Sweet. Later."])); p.buyer = false; done = true; }
      else await talk.say('Your loss.');
    }
    else if (c === 'rob') {
      await talk.say('Wallet. Now.', 'you');
      const fight = Math.random() < 0.3 - (lvl('strength') - 1) * 0.03 && arsenal.cur === 'fist';
      if (fight) { await talk.say("Ha! With what, your fists? Get lost!"); peds.release(p); endTalk(); hurt(12); return; }
      const amt = 20 + Math.floor(Math.random() * 110);
      await talk.say(pick(["Okay okay! Take it! Don't hurt me!", "Seriously?! Fine!", "This city, man..."]));
      endTalk(); peds.release(p); dropCash(p.x, p.z, amt); peds.flee(p, P.x, P.z); peds.scare(P.x, P.z, 16); feed({ mood: -2 }); return;
    }
    else { await talk.say(pick(['See ya.', 'Take care!', 'Bye.'])); done = true; }
  }
  peds.release(p); endTalk();
}

// ================================================================ SHEETS (bottom sheets over the game or a conversation)
function sheet(title, render, bind) {
  return new Promise(res => {
    const close = (v) => { $('dealUI').classList.add('hidden'); res(v); };
    const draw = () => { $('dealBody').innerHTML = render(); bind?.($('dealBody'), close, draw); };
    $('dealTitle').textContent = title; draw();
    $('dealUI').classList.remove('hidden');
    $('dealClose').onclick = () => close(sheet.value || 0); sheet.value = 0;
  });
}
function openTrade(p) {
  const prices = dealerPricesFor(p);
  let sel = GOODS[0].id, qty = 1, volume = 0;
  return sheet('Trade', () => {
    const pr = prices[sel], have = stash[sel] || 0, room = stashCap() - stashCount();
    const maxBuy = Math.max(0, Math.min(room, Math.floor(money / pr.buy)));
    qty = clamp(qty, 1, Math.max(1, Math.max(maxBuy, have)));
    const rows = GOODS.map(g => { const q = prices[g.id], h = stash[g.id] || 0; const hot = q.hot === 'cheap' ? '<em class="hot cheap">CHEAP</em>' : q.hot === 'high' ? '<em class="hot high">HOT</em>' : ''; return `<button class="trow ${g.id === sel ? 'on' : ''}" data-g="${g.id}"><span class="gi" style="color:${g.col}">${svg(g.icon)}</span><span class="gn"><b>${g.name}</b>${hot}</span><span class="gp"><i>Buy</i>${fmt(q.buy)}</span><span class="gp"><i>Sell</i>${fmt(q.sell)}</span><span class="gh">${h ? '×' + h : ''}</span></button>`; }).join('');
    const perks = [rel(p.id) >= 20 ? `${relName(rel(p.id))} prices` : '', stats.haggle[p.id] === dayN ? 'haggled' : ''].filter(Boolean).join(' · ');
    return `<div class="deal-stats"><span>${svg('wallet', 'sm')} <b>${fmt(money)}</b></span><span>${svg('bag', 'sm')} ${stashCount()}/${stashCap()}</span><span class="dn">${p.name}${perks ? ' · ' + perks : ''}</span></div>
      <div class="trows">${rows}</div>
      <div class="tbar"><div class="qty"><button data-q="-">−</button><b>${qty}</b><button data-q="+">+</button><button data-q="max">MAX</button></div>
      <button class="tbuy" ${qty > maxBuy ? 'disabled' : ''}>Buy ${fmt(pr.buy * qty)}</button>
      <button class="tsell" ${have ? '' : 'disabled'}>Sell ${fmt(pr.sell * Math.min(qty, have))}</button></div>`;
  }, (root, close, draw) => {
    const pr = prices[sel], have = stash[sel] || 0, room = stashCap() - stashCount(), maxBuy = Math.max(0, Math.min(room, Math.floor(money / pr.buy)));
    root.querySelectorAll('.trow').forEach(b => b.onclick = () => { sel = b.dataset.g; qty = 1; sfx.click(); draw(); });
    root.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const v = b.dataset.q; qty = v === '+' ? qty + 1 : v === '-' ? qty - 1 : Math.max(maxBuy, have); sfx.click(); draw(); });
    root.querySelector('.tbuy').onclick = () => { if (qty > maxBuy) return; const v = pr.buy * qty; spend(v); stash[sel] = have + qty; volume += v; sheet.value = volume; gainXP('dealing', Math.round(v / 60)); qty = 1; saveGame(); draw(); };
    root.querySelector('.tsell').onclick = () => { const n = Math.min(qty, have); if (!n) return; const v = pr.sell * n; stash[sel] = have - n; addMoney(v); volume += v; sheet.value = volume; gainXP('dealing', Math.round(v / 40)); qty = 1; draw(); };
  });
}
function openGunStore(p) {
  let spent = 0;
  return sheet('Weapons & ammo', () => {
    let rows = '';
    for (const s of SLOTS) {
      if (s.id === 'fist') continue;
      const own = arsenal.owned.includes(s.id), st = slotStats(s.id, arsenal.cfg[s.id]), a = arsenal.ammo[s.id];
      const box = s.kind === 'melee' ? null : ammoBox(s.id, st), full = box && a.res + a.mag >= maxReserve(s.id, st) + (st.mag || 0);
      let btn;
      if (!own && s.id !== 'grenade') btn = `<button class="tbuy" data-buy="${s.id}" ${money < s.price ? 'disabled' : ''}>Buy ${fmt(s.price)}</button>`;
      else if (box) btn = `<button class="tbuy" data-ammo="${s.id}" ${money < box.price || full ? 'disabled' : ''}>${full ? 'Full' : `+${box.n} ${fmt(box.price)}`}</button>`;
      else btn = `<span class="owned">Owned</span>`;
      const sk = GUN_SKILL_SLOTS.includes(s.id) ? ` · skill ${lvl('gun_' + s.id)}` : '';
      const ammoTxt = own && s.kind !== 'melee' ? `<small>${s.kind === 'grenade' ? a.res : `${a.mag} | ${a.res}`}${sk}</small>` : s.kind === 'gun' && !own ? `<small>Moddable at the counter</small>` : '';
      rows += `<div class="grow">${iconSVG(s.id)}<span class="gn"><b>${s.kind === 'gun' && own ? (arsenal.cfg[s.id].name || s.name) : s.name}</b>${ammoTxt}</span>${btn}</div>`;
    }
    return `<div class="deal-stats"><span>${svg('wallet', 'sm')} <b>${fmt(money)}</b></span><span class="dn">${p.name}</span></div><div class="grows">${rows}</div>`;
  }, (root, close, draw) => {
    root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const id = b.dataset.buy, s = SLOT[id]; if (money < s.price) return; spend(s.price); spent += s.price; sheet.value = spent; arsenal.owned.push(id); const st = slotStats(id, arsenal.cfg[id]); arsenal.ammo[id] = { mag: st.mag || 0, res: (st.mag || 0) * 2 }; selectWeapon(id); draw(); });
    root.querySelectorAll('[data-ammo]').forEach(b => b.onclick = () => { const id = b.dataset.ammo, st = slotStats(id, arsenal.cfg[id]), box = ammoBox(id, st); if (money < box.price) return; spend(box.price); spent += box.price; sheet.value = spent; arsenal.ammo[id].res = Math.min(maxReserve(id, st) + (st.mag || 0), arsenal.ammo[id].res + box.n); if (!arsenal.owned.includes(id)) arsenal.owned.push(id); saveGame(); hudCache.wpn = null; draw(); });
  });
}
function openFurnShop() {
  const pickC = {};
  return sheet('Casa Bay catalogue', () => `<div class="deal-stats"><span>${svg('wallet', 'sm')} <b>${fmt(money)}</b></span><span class="dn">Delivered to your storage</span></div><div class="grows">${CATALOG.map(f => `<div class="grow fgrow">${svg(FURN_ICON[f.act] || (f.id === 'safe' ? 'lock' : f.id === 'rug' || f.id === 'painting' ? 'star' : f.id === 'plant' || f.id === 'palm' ? 'plant' : f.id === 'lamp' ? 'lamp' : 'sofa'))}<span class="gn"><b>${f.name}</b><small>${f.act ? FURN_VERB[f.act] : f.id === 'safe' ? '+40 stash space' : 'Decor'}</small><span class="cols">${(f.colors || []).map(c => `<i class="dot ${(pickC[f.id] || f.colors[0]) === c ? 'on' : ''}" data-f="${f.id}" data-c="${c}" style="background:${c}"></i>`).join('')}</span></span><button class="tbuy" data-b="${f.id}" ${money < f.price ? 'disabled' : ''}>${fmt(f.price)}</button></div>`).join('')}</div>`,
    (root, close, draw) => {
      root.querySelectorAll('[data-c]').forEach(d => d.onclick = () => { pickC[d.dataset.f] = d.dataset.c; draw(); });
      root.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { const f = FURN[b.dataset.b]; if (money < f.price) return; spend(f.price); storage.push({ t: b.dataset.b, c: pickC[b.dataset.b] || f.colors?.[0] }); toast(`${f.name} sent to your storage`); saveGame(); draw(); });
    });
}
function openMarket() {
  return sheet('Market prices today', () => {
    const dealers = PLACES.filter(p => p.kind === 'dealer');
    const known = dealers.filter(p => rel(p.id) >= 20);
    if (!known.length) return `<p class="sheet-hint">You don't know any dealers well enough yet. Trade and chat with them to reach "Known" and their prices show up here.</p>`;
    return `<p class="sheet-hint">Buy / sell prices from dealers who know you.</p><div class="mtable"><div class="mrow head"><span></span>${GOODS.map(g => `<span style="color:${g.col}">${svg(g.icon, 'sm')}</span>`).join('')}</div>${known.map(p => { const pr = dealerPricesFor(p); return `<div class="mrow"><span>${p.npc}</span>${GOODS.map(g => `<span class="${pr[g.id].hot || ''}">${pr[g.id].buy}<br><i>${pr[g.id].sell}</i></span>`).join('')}</div>`; }).join('')}</div>`;
  });
}

// ---- property / games / chop / race
function modal(html, buttons) {
  $('modalBody').innerHTML = html;
  const row = $('modalBtns'); row.innerHTML = '';
  for (const b of buttons) { const el = document.createElement('button'); el.className = b.cls || 'mid'; el.innerHTML = b.label; el.disabled = !!b.disabled; el.onclick = () => b.fn(); row.appendChild(el); }
  $('modal').classList.remove('hidden'); setState('ui');
}
function closeModal() { $('modal').classList.add('hidden'); if (state === 'ui') setState('play'); }
function openProperty(p) {
  modal(`<div class="big-ico">${svg('house', 'big')}</div><h3>${p.name}</h3>
    <p>A ${INTERIORS[p.home].name.toLowerCase()} you can furnish and live in. Pays <b>${fmt(p.income)}</b> every morning, adds <b>+20</b> stash space, and becomes a place to wake up.</p>
    <div class="price">${fmt(p.price)}</div>`, [
    { label: `Buy for ${fmt(p.price)}`, cls: 'big', disabled: money < p.price, fn: () => { spend(p.price); owned.add(p.id); refreshPropertyMarkers(); saveGame(); closeModal(); toast(`${p.name} is yours! Walk in to move in.`, 3); feed({ mood: 20 }); } },
    { label: money < p.price ? `Need ${fmt(p.price - money)} more` : 'Not now', fn: closeModal },
  ]);
}
function openGame(p) {
  modal(`<div class="big-ico">${svg(p.icon, 'big')}</div><h3>${p.name}</h3><p>${p.desc}</p>`, [
    { label: 'Play', cls: 'big', fn: async () => {
      $('modal').classList.add('hidden');
      const r = await mini(p.game, p.game === 'gym' ? { onRep: () => { charCfg.build = Math.min(1.4, (charCfg.build || 1) + 0.01); } } : {});
      if (r.money) addMoney(r.money);
      if (p.game === 'gym' && r.score) { store.set('rr_char', charCfg); buildHero(); gainXP('strength', r.score * 8); toast('Looking stronger'); }
      if (p.game === 'surf' || p.game === 'hoops') { gainXP('stamina', 10); feed({ mood: 10, energy: -8 }); }
      if (p.game === 'taco') { feed({ hunger: 10, energy: -10 }); }
      if (p.game === 'gallery' && (ws.kind === 'gun')) gainXP('gun_' + arsenal.cur, (r.hits || 0) * 3);
    } },
    { label: 'Leave', fn: closeModal },
  ]);
}
function openChop(p) {
  if (!ride || ride.personal) return;
  const val = CHOP_VALUE[ride.cfg.body] || 400;
  modal(`<div class="big-ico">${svg('wrench', 'big')}</div><h3>${p.name}</h3><p>Lucky looks the ${BODIES[ride.cfg.body]?.label || 'car'} over. "I'll give you ${fmt(val)}, no questions."</p>`, [
    { label: `Sell for ${fmt(val)}`, cls: 'big', fn: () => { const v = ride; exitCar(); removeVehicle(v); closeModal(); addMoney(val); bumpRel('chop', 4); gainXP('dealing', 10); } },
    { label: 'Keep it', fn: closeModal },
  ]);
}
let race = null;
const cpMat = new THREE.MeshBasicMaterial({ color: '#ff3b4a', transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
const cpMesh = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 7, 32, 1, true), cpMat); cpMesh.visible = false; G.scene.add(cpMesh);
function openRace() {
  if (!ride) return;
  modal(`<div class="big-ico">${svg('flag', 'big')}</div><h3>Street Race</h3><p>Hit all ${RACE.points.length} checkpoints around Downtown in ${RACE.time} seconds. Faster finish, bigger payout.</p><div class="price">Up to ${fmt(RACE.reward * 2)}</div>`, [
    { label: 'Go!', cls: 'big', fn: () => { closeModal(); race = { i: 0, t: RACE.time }; cpMesh.visible = true; toast('3… 2… 1… GO!'); sfx.engineStart(); } },
    { label: 'Not now', fn: closeModal },
  ]);
}
function updateRace(dt) {
  if (!race) return;
  if (!ride) { race = null; cpMesh.visible = false; toast('Race abandoned'); return; }
  race.t -= dt;
  const [cx, cz] = RACE.points[race.i];
  cpMesh.position.set(cx, 3.5, cz); cpMat.color.set('#ff3b4a'); cpMat.opacity = 0.25 + Math.sin(time * 6) * 0.1;
  if (Math.hypot(ride.s.x - cx, ride.s.z - cz) < 7) { race.i++; sfx.coin(); if (race.i >= RACE.points.length) { const pay = Math.round(RACE.reward * (1 + race.t / RACE.time)); race = null; cpMesh.visible = false; addMoney(pay); gainXP('driving', 60); toast(`Finished! +${fmt(pay)}`, 3); return; } }
  if (race.t <= 0) { race = null; cpMesh.visible = false; sfx.fail(); toast('Out of time!'); }
}

// ================================================================ CUSTOMERS (texts asking you to deliver)
const custNpcs = () => customers.filter(c => c.npc).map(c => c.npc);
function newCustomer() {
  const c = pick(CITIES), i = c.kx[0] + Math.floor(Math.random() * (c.kx[1] - c.kx[0])), j = c.kz[0] + Math.floor(Math.random() * (c.kz[1] - c.kz[0]));
  const side = pick(['n', 's', 'e', 'w']), spot = blockSide(c.id, i, j, side);
  const off = rand(-10, 10); if (side === 'n' || side === 's') spot.x += off; else spot.z += off;
  if (!walkable(spot.x, spot.z)) return;
  const tier = Math.min(GOODS.length - 1, Math.floor(Math.random() * (2 + lvl('dealing') / 2)));
  const g = GOODS[tier], qty = 1 + Math.floor(Math.random() * (2 + lvl('dealing') / 2)), pay = Math.round(g.base * qty * rand(1.4, 1.85) * (1 + rel('street') * 0.003));
  const name = pick(['Kev', 'Tash', 'Benny', 'Lu', 'Dre', 'Mo', 'Jen', 'Rocco', 'Sky', 'Paz', 'Freddie', 'Gigi']);
  const cust = { id: 'c' + Date.now() + Math.floor(Math.random() * 99), name, good: g.id, qty, pay, x: spot.x, z: spot.z, area: zoneName(spot.x, spot.z), exp: gameHours() + 5, seed: Math.floor(Math.random() * 1e6) };
  customers.push(cust); attachCustomer(cust);
  toast(`New text from ${name}: needs ${qty} ${g.name}. Check your phone.`, 3.2); sfx.coin(); phoneBadge++;
}
function attachCustomer(c) {
  c.npc = { x: c.x, z: c.z, cfg: npcCfg('guest', c.seed), fig: null, face: 0, t: 0, name: c.name };
  c.marker = makeMarker(c.x, c.z, 'deal', PLACE_COLORS.customer, { place: { kind: 'customer', name: `${c.name}'s order`, id: c.id }, npc: true });
}
function removeCustomer(c) { customers.splice(customers.indexOf(c), 1); if (c.npc?.fig) dyn.remove(c.npc.fig.root); if (c.marker) { G.scene.remove(c.marker.g); markers.splice(markers.indexOf(c.marker), 1); } if (waypoint && waypoint.cust === c.id) clearWaypoint(); }
let custT = 30;
function updateCustomers(dt) {
  custT -= dt;
  if (custT <= 0 && !inside) { custT = rand(70, 140); if (customers.length < 3 && (stashCount() > 0 || lvl('dealing') > 1 || dayN > 1)) newCustomer(); }
  for (const c of [...customers]) if (gameHours() > c.exp) { toast(`${c.name} got tired of waiting.`); removeCustomer(c); }
  if (!inside) updateNpcList(custNpcs(), dt);
}
async function talkCustomer(c) {
  const g = GOODS.find(x => x.id === c.good);
  beginTalk(c.npc.cfg, c.name, `Wants ${c.qty} ${g.name}`, 220, 'street');
  await talk.say(pick([`You got my ${g.name}?`, "Finally. You got it?", "Yo, over here. You holding?"]));
  const have = stash[g.id] || 0;
  const c2 = await talk.choose([{ label: I('deal', `Hand over ${c.qty} <small>for ${fmt(c.pay)}</small>`), disabled: have < c.qty }, I('x', have < c.qty ? `I don't have it yet (${have}/${c.qty})` : 'Not yet')]);
  if (c2 === 0) {
    stash[g.id] -= c.qty; addMoney(c.pay); gainXP('dealing', Math.round(c.pay / 25)); bumpRel('street', 4, false); relNames.street = 'the streets';
    await talk.say(pick(["Pleasure doing business. I'll tell my friends.", "Good stuff. I'll hit you up again.", "Respect."]));
    endTalk(); removeCustomer(c); saveGame(); return;
  }
  await talk.say(pick(["Hurry up then. I won't wait forever.", "Clock's ticking."])); endTalk();
}

// ================================================================ JOBS
const jobMarker = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 6, 28, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
jobMarker.visible = false; G.scene.add(jobMarker);
let fareFig = null;
function randomRoadSpot(minD, maxD) {
  for (let i = 0; i < 40; i++) {
    const c = cityNear(P.x, P.z, 400) || CITIES[0], ix = c.kx[0] + Math.floor(Math.random() * (c.kx[1] - c.kx[0] + 1)), iz = c.kz[0] + Math.floor(Math.random() * (c.kz[1] - c.kz[0])) ;
    const x = c.cx + ix * 48 + 4.6, z = c.cz + (iz + 0.5) * 48 + rand(-12, 12), d = Math.hypot(x - P.x, z - P.z);
    if (d > minD && d < maxD && walkable(x, z)) return { x, z, d };
  }
  return { x: P.x + 100, z: P.z, d: 100 };
}
function startJob(p) {
  if (p.job === 'taxi') {
    const v = makeVehicle({ ...DEFAULT_CAR, ...CAR_PRESETS.Taxi }, p.x + 6, p.z + 6, 0, false); v.taxi = true;
    const sp = { x: p.x, z: p.z + 7 }; for (let r = 4; r < 40; r += 4) { if (roadAt(p.x, p.z + r)) { sp.z = p.z + r; break; } } v.s.x = sp.x; v.s.z = sp.z; placeVehicle(v);
    enterVehicle(v); job = { type: 'taxi', v, stage: 'pickup', fares: 0, earned: 0 }; nextFare();
  } else { job = { type: 'courier', stage: 'deliver', fares: 0, earned: 0, depot: p }; nextParcel(); }
  toast(job.type === 'taxi' ? 'Shift started. Follow the GPS to your first fare.' : 'Parcel loaded. Deliver it before time runs out!', 3);
}
function nextFare() { const s = randomRoadSpot(80, 260); job.stage = 'pickup'; job.target = s; job.t = 999; setWaypoint(s.x, s.z, 'Fare pickup'); if (fareFig) dyn.remove(fareFig); const lk = bakeCfg(npcCfg('guest', Math.floor(Math.random() * 1e5))); fareFig = figure(lk).root; fareFig.position.set(s.x + 3.5, 0.17, s.z); dyn.add(fareFig); }
function nextParcel() { const s = randomRoadSpot(200, 650); job.stage = 'deliver'; job.target = s; job.t = s.d / 8 + 25; job.pay = Math.round(60 + s.d * 0.3); setWaypoint(s.x, s.z, 'Parcel drop-off'); }
function endJob(msg) { if (!job) return; if (job.v) job.v.taxi = false; toast(`${msg} Earned ${fmt(job.earned)} from ${job.fares} jobs.`, 3.5); if (fareFig) { dyn.remove(fareFig); fareFig = null; } jobMarker.visible = false; job = null; clearWaypoint(); }
function updateJob(dt) {
  if (!job) return;
  const f = focusPos(), d = Math.hypot(f.x - job.target.x, f.z - job.target.z);
  jobMarker.visible = true; jobMarker.position.set(job.target.x, 3, job.target.z); jobMarker.material.opacity = 0.2 + Math.sin(time * 5) * 0.08;
  if (job.stage === 'drop' || job.type === 'courier') { job.t -= dt; if (job.t <= 0) { sfx.fail(); if (job.type === 'courier') return endJob('Too late. The client cancelled.'); toast('Your fare jumped out. Too slow!'); nextFare(); return; } }
  const stopped = !ride || Math.abs(ride.s.v) < 3;
  if (d < (ride ? 7 : 3) && stopped) {
    if (job.type === 'taxi' && job.stage === 'pickup') { if (fareFig) { dyn.remove(fareFig); fareFig = null; } const s = randomRoadSpot(200, 600); job.stage = 'drop'; job.target = s; job.t = s.d / 11 + 22; job.pay = Math.round(45 + s.d * 0.28); setWaypoint(s.x, s.z, 'Fare drop-off'); sfx.coin(); toast(pick(['"Take me downtown, and step on it!"', '"Airport? No, kidding. Just this address."', '"Quick as you can, please!"']), 2.5); }
    else { const bonus = Math.round(job.t * 2); const pay = job.pay + bonus; job.earned += pay; job.fares++; addMoney(pay); gainXP(job.type === 'taxi' ? 'driving' : 'stamina', 25); gainXP('charm', 4); toast(`Delivered! +${fmt(pay)} (incl. ${fmt(bonus)} speed tip)`, 2.6); job.type === 'taxi' ? nextFare() : nextParcel(); }
  }
}

// ================================================================ WAYPOINT & GPS
const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 80, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
beam.visible = false; G.scene.add(beam);
let route = null, routeT = 0, routeFrom = null;
function setWaypoint(x, z, label, extra = {}) { waypoint = { x, z, label: label || null, ...extra }; route = null; routeT = 0; beam.position.set(x, 40, z); beam.visible = true; sfx.equip(); saveGame(); }
function clearWaypoint() { waypoint = null; route = null; beam.visible = false; saveGame(); }
function updateRoute(dt) {
  if (!waypoint || inside) { beam.visible = !!waypoint && !inside; return; }
  beam.visible = true;
  const f = focusPos();
  beam.material.opacity = 0.25 + Math.sin(time * 3) * 0.08;
  if (!job && Math.hypot(f.x - waypoint.x, f.z - waypoint.z) < (ride ? 12 : 6)) { toast('You have arrived'); clearWaypoint(); return; }
  routeT -= dt;
  const moved = routeFrom ? Math.hypot(f.x - routeFrom[0], f.z - routeFrom[1]) : 1e9;
  if (routeT <= 0 || moved > 25) { routeT = 1.5; routeFrom = [f.x, f.z]; route = findRoute(f.x, f.z, waypoint.x, waypoint.z); }
}

// ================================================================ CAMERA
const camLook = new THREE.Vector3();
let camDist = 58;
function padHeight() { return Math.min(H * 0.36, 310); }
function focusPos() { return ride ? ride.s : P; }
function updateCamera(dt, snap) {
  const f = focusPos();
  const tx = ride ? f.x + f.vx * 0.45 : f.x, tz = ride ? f.z + f.vz * 0.45 : f.z, ty = ride ? Math.max(groundH(f.x, f.z), 0) : P.y;
  const want = inside ? 26 + Math.max(inside.h.w, inside.h.d) * 0.35 : ride ? 84 + Math.abs(ride.s.v) * 0.5 : 58;
  camDist = snap ? want : damp(camDist, want, 2.5, dt);
  const k = snap ? 1 : 1 - Math.exp(-6 * dt);
  camLook.x += (tx - camLook.x) * k; camLook.z += (tz - camLook.z) * k; camLook.y += (ty - camLook.y) * k;
  if (inside) { camLook.x = clamp(camLook.x, ORIGIN.x - inside.h.w / 4, ORIGIN.x + inside.h.w / 4); camLook.z = clamp(camLook.z, ORIGIN.z - inside.h.d / 4, ORIGIN.z + inside.h.d / 4 + 1); }
  const pitch = (inside ? 60 : 56) * DEG;
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
function markerIcon(m) { return m.place.kind === 'property' && owned.has(m.place.id) ? 'key' : m.icon; }
function drawMinimap() {
  ensureMap();
  const S = mm.width, R = S / 2 - 18;
  mctx.save(); mctx.clearRect(0, 0, S, S);
  mctx.beginPath(); mctx.arc(S / 2, S / 2, R, 0, Math.PI * 2); mctx.clip();
  if (inside) {
    mctx.fillStyle = '#1a1626'; mctx.fillRect(0, 0, S, S);
    const sc = R * 1.6 / Math.max(inside.h.w, inside.h.d);
    mctx.fillStyle = INTERIORS[inside.id].floor; mctx.fillRect(S / 2 - inside.h.w * sc / 2, S / 2 - inside.h.d * sc / 2, inside.h.w * sc, inside.h.d * sc);
    for (const m of inside.marks) { drawIcon(mctx, m.spot.icon, S / 2 + (m.x - ORIGIN.x) * sc, S / 2 + (m.z - ORIGIN.z) * sc, 20, { stroke: '#ffd23f', width: 2.6 }); }
    mctx.fillStyle = '#ffd23f'; mctx.beginPath(); mctx.arc(S / 2 + (P.x - ORIGIN.x) * sc, S / 2 + (P.z - ORIGIN.z) * sc, 7, 0, 7); mctx.fill();
    mctx.restore();
  } else {
    const f = focusPos(), px = f.x, pz = f.z, face = ride ? ride.s.h : P.face, span = ride ? 260 : 170;
    const mx = MAP.tx(px), mz = MAP.tz(pz), ms = span / MAP.sx;
    mctx.fillStyle = '#3d8fd0'; mctx.fillRect(0, 0, S, S);
    mctx.drawImage(MAP.canvas, mx - ms / 2, mz - ms / 2, ms, ms, S / 2 - R, S / 2 - R, R * 2, R * 2);
    const toS = (wx, wz) => [S / 2 + (wx - px) / span * R * 2, S / 2 + (wz - pz) / span * R * 2];
    if (route) { mctx.strokeStyle = '#b26bff'; mctx.lineWidth = 9; mctx.lineJoin = 'round'; mctx.lineCap = 'round'; mctx.beginPath(); route.forEach(([x, z], i) => { const [a, b] = toS(x, z); i ? mctx.lineTo(a, b) : mctx.moveTo(a, b); }); mctx.stroke(); }
    mctx.fillStyle = '#ffffff';
    for (const t of traffic) { const [a, b] = toS(t.rx, t.rz); mctx.fillRect(a - 3, b - 3, 6, 6); }
    for (const m of markers) { const [a, b] = toS(m.x, m.z); if (Math.hypot(a - S / 2, b - S / 2) < R - 8) { mctx.fillStyle = 'rgba(20,18,38,.85)'; mctx.beginPath(); mctx.arc(a, b, 13, 0, 7); mctx.fill(); drawIcon(mctx, markerIcon(m), a, b, 18, { stroke: m.color, width: 2.6 }); } }
    if (myCar && ride !== myCar) { const [a, b] = toS(myCar.s.x, myCar.s.z); mctx.fillStyle = '#ff8a2a'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(a, b, 9, 0, 7); mctx.fill(); mctx.stroke(); }
    const edgeDot = (wx, wz, col, r) => { let [a, b] = toS(wx, wz); const dd = Math.hypot(a - S / 2, b - S / 2); if (dd > R - 10) { a = S / 2 + (a - S / 2) / dd * (R - 10); b = S / 2 + (b - S / 2) / dd * (R - 10); } mctx.fillStyle = col; mctx.strokeStyle = '#fff'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(a, b, r, 0, 7); mctx.fill(); mctx.stroke(); };
    if (waypoint) edgeDot(waypoint.x, waypoint.z, '#ffd23f', 11);
    if (race) edgeDot(...RACE.points[race.i], '#ff3b4a', 11);
    mctx.translate(S / 2, S / 2); mctx.rotate(face + Math.PI);
    mctx.fillStyle = '#ffd23f'; mctx.strokeStyle = '#1a1a2a'; mctx.lineWidth = 4;
    mctx.beginPath(); mctx.moveTo(0, -16); mctx.lineTo(11, 11); mctx.lineTo(0, 5); mctx.lineTo(-11, 11); mctx.closePath(); mctx.stroke(); mctx.fill();
    mctx.restore();
  }
  const hp = P.hp / maxHP(), ringR = R + 10;
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
  for (const m of markers) { x.fillStyle = 'rgba(20,18,38,.9)'; x.beginPath(); x.arc(tx(m.x), tz(m.z), 7.5 * k, 0, 7); x.fill(); drawIcon(x, markerIcon(m), tx(m.x), tz(m.z), 10.5 * k, { stroke: m.color, width: 2.4 }); }
  const dot = (wx, wz, col, r) => { x.fillStyle = col; x.strokeStyle = '#fff'; x.lineWidth = 2 * k; x.beginPath(); x.arc(tx(wx), tz(wz), r * k, 0, 7); x.fill(); x.stroke(); };
  if (myCar && ride !== myCar) dot(myCar.s.x, myCar.s.z, '#ff8a2a', 5);
  if (waypoint) { dot(waypoint.x, waypoint.z, '#ffd23f', 7); x.fillStyle = '#1a1a2a'; x.font = `900 ${Math.round(9 * k)}px sans-serif`; x.fillText('W', tx(waypoint.x), tz(waypoint.z) + k * 0.5); }
  const f = inside ? inside.back : focusPos(); dot(f.x, f.z, '#38e8ff', 6);
  return { k, fromX: px => WORLD.x0 + px / k * MAP.sx, fromZ: pz => WORLD.z0 + pz / k * MAP.sz, tx, tz };
}
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
const ICONS = {
  car: 'car', exit: 'door', jump: 'run', fire: 'target', reload: 'rotate', gas: 'plus', brake: 'minus', horn: 'radio', door: 'door', smash: 'bolt', flag: 'flag', chat: 'chat', punch: 'fist', throw: 'bolt', none: null, edit: 'edit', place: 'check', rotate: 'rotate', store: 'box', done: 'check',
};
const BTN_SVG = {
  jump: '<path d="M12 20V6"/><path d="M6 12l6-6 6 6"/><path d="M5 3h14"/>', gas: '<path d="M6 13l6-6 6 6"/><path d="M6 19l6-6 6 6"/>', brake: '<path d="M6 5l6 6 6-6"/><path d="M6 11l6 6 6-6"/>',
  horn: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>', exit: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  fire: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>', smash: '<path d="M14 3l-2 6 5 1-7 11 2-7-5-1z"/>', throw: '<circle cx="8" cy="15" r="4"/><path d="M12 11c3-4 6-5 9-5M18 3l3 3-3 3"/>',
};
const btnCache = {};
function setBtn(id, icon, label) {
  const k = icon + '|' + label; if (btnCache[id] === k) return; btnCache[id] = k;
  const inner = BTN_SVG[icon] ? `<svg viewBox="0 0 24 24">${BTN_SVG[icon]}</svg>` : icon && icon !== 'none' ? svg(ICONS[icon] || icon, 'btn') : '<svg viewBox="0 0 24 24"></svg>';
  $(id).innerHTML = `${inner}<span>${label}</span>`;
}
function needBar(id, v) { const el = $(id); el.style.setProperty('--v', v + '%'); el.classList.toggle('low', v < 25); }
function updateHUD(dt) {
  const hh = Math.floor(clockH), m10 = Math.floor((clockH - hh) * 6) * 10;
  setText('clockTxt', `${String(hh).padStart(2, '0')}:${String(m10).padStart(2, '0')}`);
  $('clockIco').innerHTML = hudCache.ci === (clockH >= 6 && clockH < 19) ? $('clockIco').innerHTML : ((hudCache.ci = clockH >= 6 && clockH < 19) ? svg('sun', 'sm') : svg('moon', 'sm'));
  setText('moneyTxt', fmt(money));
  const f = focusPos();
  setText('zoneTxt', inside ? (inside.prop ? inside.prop.name : inside.place.name) : zoneName(f.x, f.z));
  if (waypoint && !inside) { const d = Math.hypot(f.x - waypoint.x, f.z - waypoint.z); setText('wpTxt', `${d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d / 10) * 10 + ' m'}${waypoint.label ? ' · ' + waypoint.label : ''}`); } else setText('wpTxt', '');
  needBar('nHunger', stats.hunger); needBar('nEnergy', stats.energy); needBar('nMood', stats.mood);
  const a = am(), id = arsenal.cur, wk = id + '|' + a.mag + '|' + a.res + '|' + (P.reload > 0);
  if (hudCache.wpn !== wk) { hudCache.wpn = wk; $('wpnBtn').innerHTML = iconSVG(id) + (ws.kind === 'melee' ? '' : ws.kind === 'grenade' ? `<b>${a.res}</b>` : P.reload > 0 ? '<b class="rl">RELOAD</b>' : `<b>${a.mag}</b><span>${a.res}</span>`); }
  $('wpnBtn').classList.toggle('hidden', !!ride || !!inside);
  $('editBtn').classList.toggle('hidden', !(inside && inside.prop) || editMode);
  $('radioBtn').classList.toggle('hidden', !ride);
  $('speedo').classList.toggle('hidden', !ride);
  $('phoneBtn').classList.toggle('badge', phoneBadge > 0);
  if (ride) setText('speedTxt', String(Math.round(Math.abs(ride.s.v) * 3.6)));
  const jt = race ? `Race ${race.i}/${RACE.points.length} · ${Math.ceil(race.t)}s` : job ? (job.type === 'taxi' ? (job.stage === 'pickup' ? `Cab · pick up fare · ${fmt(job.earned)}` : `Cab · drop off · ${Math.ceil(job.t)}s · ${fmt(job.pay)}`) : `Courier · ${Math.ceil(job.t)}s · ${fmt(job.pay)}`) : '';
  setText('raceTxt', jt); $('raceTxt').classList.toggle('hidden', !jt);
  if (editMode) { setBtn('btnA', held ? 'check' : 'hand', held ? 'Place' : 'Pick up'); setBtn('btnB', 'check', 'Done'); setBtn('btnX', 'rotate', 'Rotate'); setBtn('btnY', 'box', 'Store'); }
  else if (ride) { setBtn('btnA', action ? action.icon : 'exit', action ? action.label : 'Exit'); setBtn('btnB', 'gas', 'Gas'); setBtn('btnX', 'brake', ride.s.v > 0.5 ? 'Brake' : 'Reverse'); setBtn('btnY', 'horn', 'Horn'); }
  else {
    setBtn('btnA', action ? action.icon : 'none', action ? action.label : '');
    setBtn('btnB', 'jump', 'Jump');
    const k = inside ? 'none' : ws.kind;
    setBtn('btnX', k === 'melee' ? 'fist' : k === 'grenade' ? 'throw' : k === 'none' ? 'none' : 'fire', k === 'melee' ? (id === 'bat' ? 'Swing' : 'Punch') : k === 'grenade' ? 'Throw' : k === 'none' ? '' : 'Fire');
    setBtn('btnY', (k === 'gun' || k === 'rpg') ? 'rotate' : 'none', (k === 'gun' || k === 'rpg') ? 'Reload' : '');
  }
  $('btnA').classList.toggle('ready', !!action || editMode);
  $('btnA').classList.toggle('idle', !ride && !action && !editMode);
  $('btnX').classList.toggle('idle', !ride && !editMode && (inside || false));
  $('btnY').classList.toggle('idle', !ride && !editMode && !(!inside && (ws.kind === 'gun' || ws.kind === 'rpg')));
  $('pad').classList.toggle('driving', !!ride);
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  drawMinimap();
}

// ---------------- weapon & radio wheels
attachWheel($('wpnBtn'), {
  items: () => SLOTS.map(s => {
    const own = arsenal.owned.includes(s.id), a = arsenal.ammo[s.id];
    const sub = !own ? `${s.price ? fmt(s.price) + ' at Bay Arms' : 'Buy at Bay Arms'}` : s.kind === 'melee' ? (s.id === 'fist' ? 'Holstered' : 'Melee') : s.kind === 'grenade' ? `${a.res} left` : `${a.mag} | ${a.res}${GUN_SKILL_SLOTS.includes(s.id) ? ` · skill ${lvl('gun_' + s.id)}` : ''}`;
    return { icon: iconSVG(s.id), label: s.kind === 'gun' && own ? (arsenal.cfg[s.id].name || s.name) : s.name, short: own && s.kind !== 'melee' ? (s.kind === 'grenade' ? `${a.res}` : `${a.mag + a.res}`) : '', sub, disabled: !own, current: arsenal.cur === s.id };
  }),
  onSelect: (it, i) => selectWeapon(SLOTS[i].id),
  onTap: () => holsterToggle(),
  onOpen: () => { timeScale = 0.2; }, onClose: () => { timeScale = 1; },
});
const ST_ICON = ['sun', 'music', 'moon', 'x'];
attachWheel($('radioBtn'), {
  items: () => STATIONS.map((s, i) => ({ icon: svg(ST_ICON[i] || 'radio', 'wheel'), label: s.name.split(' — ')[0], sub: s.name.split(' — ')[1] || '', current: radioIndex() === i })),
  onSelect: (it, i) => { radioSet(i); radioOn(!!ride); toast(STATIONS[i].name, 1.4); },
  onTap: () => { const i = (radioIndex() + 1) % STATIONS.length; radioSet(i); radioOn(!!ride); toast(STATIONS[i].name, 1.4); },
  onOpen: () => { timeScale = 0.2; }, onClose: () => { timeScale = 1; },
});
$('editBtn').addEventListener('pointerdown', e => { e.stopPropagation(); startEdit(); });
$('editAdd').onclick = () => { openStorage(); };
$('editDone').onclick = () => endEdit();

// ================================================================ PHONE
let phoneApp = 'home';
const APPS = [
  ['maps', 'Maps', 'map', 'linear-gradient(135deg,#4cd964,#2f80ed)'],
  ['msgs', 'Messages', 'chat', 'linear-gradient(135deg,#5ee07a,#2fbf55)'],
  ['contacts', 'Contacts', 'heart', 'linear-gradient(135deg,#ff6fb5,#c9306f)'],
  ['me', 'Me', 'user', 'linear-gradient(135deg,#38e8ff,#2f80ed)'],
  ['places', 'Places', 'pin', 'linear-gradient(135deg,#ff6a74,#e23b3b)'],
  ['wallet', 'Wallet', 'wallet', 'linear-gradient(135deg,#3a3a44,#111)'],
  ['garage', 'Garage', 'car', 'linear-gradient(135deg,#ff8a2a,#e05a10)'],
  ['homes', 'Homes', 'house', 'linear-gradient(135deg,#b26bff,#6b2fd0)'],
  ['style', 'Style', 'shirt', 'linear-gradient(135deg,#ffd23f,#e0a010)'],
  ['radio', 'Radio', 'radio', 'linear-gradient(135deg,#ff3b8a,#90205a)'],
  ['settings', 'Settings', 'gear', 'linear-gradient(135deg,#9aa0aa,#5d636e)'],
];
function openPhone(app = 'home') {
  if (ride && Math.abs(ride.s.v) > 3) { toast('Stop the car to use your phone'); return; }
  if (editMode) endEdit();
  sfx.click(); setState('phone'); $('phone').classList.remove('hidden');
  requestAnimationFrame(() => $('phone').classList.add('open'));
  phoneGo(app);
}
function closePhone() { $('phone').classList.remove('open'); setTimeout(() => { $('phone').classList.add('hidden'); if (state === 'phone') setState('play'); }, 260); }
function phoneGo(app) { phoneApp = app; if (app === 'msgs') phoneBadge = 0; renderPhone(); }
function messages() {
  const out = [{ from: 'Uncle Ray', av: 'user', text: "Welcome to Bay City, kid. I got you a little studio downtown (the purple key on your map). Eat, sleep, keep your energy up. Dealers buy low and sell high, and they'll treat you better once they know you. Customers will text you here too. Make money, buy property, live large." }];
  for (const c of customers) { const g = GOODS.find(x => x.id === c.good); out.push({ from: c.name, av: 'deal', text: `Need ${c.qty} ${g.name} near ${c.area}. Paying ${fmt(c.pay)}. Don't keep me waiting (${Math.max(0, Math.ceil(c.exp - gameHours()))}h).`, at: { x: c.x, z: c.z, name: `${c.name}'s order` } }); }
  for (const p of PLACES) if (p.kind === 'dealer' && rel(p.id) >= 20) { const pr = dealerPricesFor(p); for (const g of GOODS) if (pr[g.id].hot) out.push({ from: p.npc, av: 'deal', text: pr[g.id].hot === 'cheap' ? `Got ${g.name} going cheap today. ${fmt(pr[g.id].buy)} each. Come thru.` : `Paying top dollar for ${g.name} today: ${fmt(pr[g.id].sell)}. Bring what you got.`, at: p }); }
  const inc = PROPERTIES.filter(p => owned.has(p.id)).reduce((a, p) => a + p.income, 0);
  if (inc) out.push({ from: 'Bay Realty', av: 'house', text: `Your properties earn ${fmt(inc)} every morning at 6am.` });
  if (stats.groceries <= 0) out.push({ from: 'Fridge', av: 'fridge', text: 'Your fridge is empty. QuickMart sells groceries.' });
  return out;
}
const bar = (v, col = '#7dff9a') => `<span class="pbar"><i style="width:${clamp(v, 0, 100)}%;background:${col}"></i></span>`;
function renderPhone() {
  const el = $('phApp'), back = `<button class="ph-back" data-go="home">‹ Home</button>`;
  const hh = Math.floor(clockH), mm2 = Math.floor((clockH - hh) * 60);
  $('phTime').textContent = `${String(hh).padStart(2, '0')}:${String(mm2).padStart(2, '0')}`;
  if (phoneApp === 'home') {
    el.innerHTML = `<div class="ph-home"><div class="ph-clock">${$('phTime').textContent}</div><div class="ph-date">Bay City · Day ${dayN}</div>
      <div class="ph-grid">${APPS.map(([id, name, ico, bg]) => `<button class="ph-icon" data-go="${id}"><i style="background:${bg}">${svg(ico, 'app')}</i><span>${name}</span>${id === 'msgs' && (phoneBadge || customers.length) ? `<em>${phoneBadge || customers.length}</em>` : ''}</button>`).join('')}</div></div>`;
  } else if (phoneApp === 'maps') {
    el.innerHTML = `${back}<h4>Maps</h4><canvas id="phMap"></canvas><p class="ph-hint">${waypoint ? 'Waypoint set. Follow the purple route.' : 'Tap anywhere on the map to set a waypoint.'}</p>${waypoint ? '<button class="ph-btn" id="phClear">Clear waypoint</button>' : ''}`;
    const cv = $('phMap'), sz = Math.round(cv.getBoundingClientRect().width * Math.min(devicePixelRatio, 2)); cv.width = cv.height = sz;
    const info = drawMapTo(cv);
    cv.onpointerdown = e => {
      const r = cv.getBoundingClientRect(), px = (e.clientX - r.left) / r.width * sz, pz = (e.clientY - r.top) / r.height * sz;
      if (waypoint && Math.hypot(info.tx(waypoint.x) - px, info.tz(waypoint.z) - pz) < 22) clearWaypoint();
      else {
        let wx = info.fromX(px), wz = info.fromZ(pz), label = null;
        for (const m of markers) if (Math.hypot(info.tx(m.x) - px, info.tz(m.z) - pz) < 14) { wx = m.x; wz = m.z; label = m.place.name; }
        setWaypoint(wx, wz, label);
        if (!inside) { const f = focusPos(); route = findRoute(f.x, f.z, wx, wz); routeT = 1.5; routeFrom = [f.x, f.z]; }
      }
      renderPhone();
    };
    $('phClear') && ($('phClear').onclick = () => { clearWaypoint(); renderPhone(); });
  } else if (phoneApp === 'msgs') {
    const ms = messages();
    el.innerHTML = `${back}<h4>Messages</h4><div class="ph-list">${ms.map((m, i) => `<div class="ph-msg"><div class="av">${svg(m.av)}</div><div><b>${m.from}</b><p>${m.text}</p>${m.at ? `<button class="ph-mini" data-wp="${i}">${svg('pin', 'sm')} Set waypoint</button>` : ''}</div></div>`).join('')}</div>`;
    el.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => { const m = ms[+b.dataset.wp]; setWaypoint(m.at.x, m.at.z, m.at.name); toast(m.at.name); closePhone(); });
  } else if (phoneApp === 'contacts') {
    const people = Object.entries(stats.rel).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    el.innerHTML = `${back}<h4>Contacts</h4><p class="ph-hint">Relationships grow when you trade, chat and spend time with people. Friends give better prices, tips and texts.</p>${people.length ? people.map(([id, v]) => { const p = PLACES.find(q => q.id === id); return `<div class="ph-row col"><span><b>${relNames[id] || p?.npcName || (id === 'street' ? 'Street rep' : nameFor(id))}</b> <small>${p ? p.name : id === 'street' ? 'Your customers' : id.split(':')[0].replace(/^[a-z]_/, '')}</small></span>${bar(v, '#ff6fb5')}<small>${relName(v)} · ${Math.round(v)}</small>${p ? `<button class="ph-mini" data-wp="${id}">${svg('pin', 'sm')} Find</button>` : ''}</div>`; }).join('') : '<p class="ph-hint">No contacts yet. Go talk to people!</p>'}`;
    el.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => { const p = PLACES.find(q => q.id === b.dataset.wp); setWaypoint(p.x, p.z, p.name); closePhone(); });
  } else if (phoneApp === 'me') {
    const sk = s => { const L = lvl(s), xp = stats.xp[s] || 0, need = xpFor(L); return `<div class="ph-row col"><span><b>${skillName(s)}</b> <small>Level ${L}${L >= MAX_LVL ? ' · MAX' : ''}</small></span>${bar(L >= MAX_LVL ? 100 : xp / need * 100, '#38e8ff')}</div>`; };
    el.innerHTML = `${back}<h4>Me</h4>
      <div class="ph-sec">Needs</div>
      <div class="ph-row col"><span><b>Hunger</b> <small>${Math.round(stats.hunger)}%</small></span>${bar(stats.hunger, '#ff8a2a')}</div>
      <div class="ph-row col"><span><b>Energy</b> <small>${Math.round(stats.energy)}%</small></span>${bar(stats.energy, '#ffd23f')}</div>
      <div class="ph-row col"><span><b>Mood</b> <small>${Math.round(stats.mood)}%</small></span>${bar(stats.mood, '#ff6fb5')}</div>
      <div class="ph-row col"><span><b>Health</b> <small>${Math.round(P.hp)}/${maxHP()}</small></span>${bar(P.hp / maxHP() * 100, '#4cd964')}</div>
      <div class="ph-sec">Skills</div>${SKILLS.map(s => sk(s.id)).join('')}
      <div class="ph-sec">Weapon skills</div>${GUN_SKILL_SLOTS.map(g => sk('gun_' + g)).join('')}
      <p class="ph-hint">Gym, running and fights build your body. Reading, chatting and haggling build Charm. Trading builds Dealing. Range practice builds weapon skills.</p>
      ${job ? `<button class="ph-btn" id="phQuit">${svg('x', 'sm')} Quit current job</button>` : ''}`;
    $('phQuit') && ($('phQuit').onclick = () => { endJob('Shift ended.'); closePhone(); });
  } else if (phoneApp === 'places') {
    const groups = [['Dealers', 'deal', PLACES.filter(p => p.kind === 'dealer')], ['Shops', 'bag', PLACES.filter(p => ['guns', 'clothes', 'barber'].includes(p.kind))], ['Food, fun & services', 'star', PLACES.filter(p => p.kind === 'venue')], ['Activities & jobs', 'play', PLACES.filter(p => ['game', 'race', 'chop', 'job'].includes(p.kind))], ['Real estate', 'house', PROPERTIES]];
    const f = inside ? inside.back : focusPos(), all = [];
    el.innerHTML = `${back}<h4>Places</h4><div class="ph-list">${groups.map(([t, ic, list]) => `<div class="ph-sec">${svg(ic, 'sm')} ${t}</div>` + list.map(p => { all.push(p); const d = Math.hypot(p.x - f.x, p.z - f.z); return `<button class="ph-row" data-i="${all.length - 1}"><span>${svg(p.icon, 'sm')} ${p.name}${p.price !== undefined && p.home ? ` <small>${owned.has(p.id) ? '· owned' : '· ' + fmt(p.price)}</small>` : ''}</span><small>${d > 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm'}</small></button>`; }).join('')).join('')}</div>`;
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const p = all[+b.dataset.i]; setWaypoint(p.x, p.z, p.name); toast(p.name); closePhone(); });
  } else if (phoneApp === 'wallet') {
    const inc = PROPERTIES.filter(p => owned.has(p.id)).reduce((a, p) => a + p.income, 0);
    const items = GOODS.filter(g => stash[g.id]).map(g => `<div class="ph-row"><span style="color:${g.col}">${svg(g.icon, 'sm')} <b style="color:#fff">${g.name}</b></span><b>×${stash[g.id]}</b></div>`).join('') || '<p class="ph-hint">Stash is empty.</p>';
    el.innerHTML = `${back}<h4>Wallet</h4><div class="ph-cash">${fmt(money)}</div><p class="ph-hint">Daily income ${fmt(inc)} · Stash ${stashCount()}/${stashCap()} · Groceries ${stats.groceries} meals</p><div class="ph-sec">Stash</div>${items}`;
  } else if (phoneApp === 'garage') {
    el.innerHTML = `${back}<h4>Garage</h4><p class="ph-hint">Buy more cars at Bay Motors downtown.</p>${garage.cars.map((c, i) => `<div class="ph-row col"><span><b>${c.name || BODIES[c.body].label}</b> <small>${BODIES[c.body].label}${i === garage.active ? ' · driving' : ''}</small></span><span class="rowbtns">${i !== garage.active ? `<button class="ph-mini" data-use="${i}">Use</button>` : ''}<button class="ph-mini" data-mod="${i}">Customise</button></span></div>`).join('')}
      <button class="ph-btn" id="phBring">${svg('pin', 'sm')} Bring my car here</button><button class="ph-btn" id="phFind">${svg('map', 'sm')} Mark my car on the map</button>`;
    el.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { if (ride === myCar) exitCar(); garage.active = +b.dataset.use; store.set('bc_cars', garage); rebuildMyCar(); if (!inside) bringCar(); renderPhone(); });
    el.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => { if (ride === myCar) exitCar(); garage.active = +b.dataset.mod; store.set('bc_cars', garage); carCfg = garage.cars[garage.active]; $('phone').classList.remove('open'); $('phone').classList.add('hidden'); openCustom('car'); });
    $('phBring').onclick = () => { if (inside) { toast('Step outside first'); return; } if (ride) exitCar(); bringCar(); closePhone(); };
    $('phFind').onclick = () => { setWaypoint(myCar.s.x, myCar.s.z, 'My car'); closePhone(); };
  } else if (phoneApp === 'homes') {
    el.innerHTML = `${back}<h4>Homes</h4><p class="ph-hint">Walk into any home you own. Use the edit button inside to arrange furniture. Storage: ${storage.length} item${storage.length === 1 ? '' : 's'}.</p>${PROPERTIES.filter(p => owned.has(p.id)).map(p => `<button class="ph-row" data-h="${p.id}"><span>${svg('house', 'sm')} ${p.name} <small>${INTERIORS[p.home].name} · ${(homes[p.id] || []).length} items</small></span><small>${svg('pin', 'sm')}</small></button>`).join('')}`;
    el.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const p = PROPERTIES.find(q => q.id === b.dataset.h); setWaypoint(p.x, p.z, p.name); closePhone(); });
  } else if (phoneApp === 'style') {
    el.innerHTML = `${back}<h4>Style</h4><p class="ph-hint">Body and face are free to change. Hair is done at barbers, clothes at clothing stores.</p><button class="ph-btn" id="phBody">${svg('user', 'sm')} Edit body & face</button>`;
    $('phBody').onclick = () => { $('phone').classList.remove('open'); $('phone').classList.add('hidden'); openCustom('char'); };
  } else if (phoneApp === 'radio') {
    el.innerHTML = `${back}<h4>Radio</h4><p class="ph-hint">Plays while you drive, or at home on a stereo. In the car, hold the radio button for the radio wheel.</p>${STATIONS.map((s, i) => `<button class="ph-row ${radioIndex() === i ? 'on' : ''}" data-st="${i}"><span>${s.name}</span>${radioIndex() === i ? '<b>●</b>' : ''}</button>`).join('')}`;
    el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { radioSet(+b.dataset.st); radioOn(!!ride || homeMusic); renderPhone(); });
  } else if (phoneApp === 'settings') {
    el.innerHTML = `${back}<h4>Settings</h4>
      <button class="ph-row" id="stSound"><span>Sound</span><b>${settings.sound ? 'On' : 'Off'}</b></button>
      <button class="ph-row" id="stShadow"><span>Shadows (off = smoother)</span><b>${settings.shadows ? 'On' : 'Off'}</b></button>
      <div class="ph-sec">Danger zone</div><button class="ph-row danger" id="stReset"><span>Reset all progress</span></button>
      <p class="ph-hint">Bay City ${VERSION}</p>`;
    $('stSound').onclick = () => { settings.sound = !settings.sound; applySettings(); renderPhone(); };
    $('stShadow').onclick = () => { settings.shadows = !settings.shadows; applySettings(); renderPhone(); };
    let armed = false; $('stReset').onclick = () => { if (!armed) { armed = true; $('stReset').querySelector('span').textContent = 'Tap again to wipe everything'; return; } for (const k of ['bc_save', 'bc_arsenal', 'rr_char', 'rr_gun', 'bc_car', 'bc_cars']) localStorage.removeItem(k); location.reload(); };
  }
  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { sfx.click(); phoneGo(b.dataset.go); });
}
$('phoneBtn').addEventListener('pointerdown', e => { e.stopPropagation(); openPhone(); });
$('phHome').onclick = () => closePhone();
$('phone').addEventListener('pointerdown', e => { if (e.target.id === 'phone') closePhone(); });
mm.addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play') openPhone('maps'); });

// ================================================================ save / load
function saveGame() {
  save = { hp: P.hp, x: inside ? inside.back.x : P.x, z: inside ? inside.back.z + 1.2 : P.z, face: P.face, inCar: ride === myCar, cx: myCar?.s.x, cz: myCar?.s.z, ch: myCar?.s.h, h: clockH, day: dayN, money, stash, owned: [...owned], waypoint, stats, homes, storage, customers: customers.map(({ npc, marker, ...c }) => c) };
  store.set('bc_save', save); store.set('bc_arsenal', arsenal); store.set('bc_cars', garage);
}
function startGame() {
  if (save) { Object.assign(P, { x: save.x, z: save.z, face: save.face || 0 }); clockH = save.h ?? 8; dayN = save.day ?? 1; }
  P.hp = save?.hp > 0 ? Math.min(save.hp, maxHP()) : maxHP();
  buildHero();
  myCar = null; rebuildMyCar();
  if (save && save.cx != null) Object.assign(myCar.s, { x: save.cx, z: save.cz, h: save.ch });
  placeVehicle(myCar);
  if (save?.inCar) enterVehicle(myCar);
  P.y = baseY(P.x, P.z); heroRoot.visible = !ride;
  refreshPropertyMarkers();
  for (const c of customers) attachCustomer(c);
  if (waypoint) setWaypoint(waypoint.x, waypoint.z, waypoint.label);
  loadBudget = 60; updateChunks(P.x, P.z, 2); loadBudget = 2;
  applyTime(clockH, P.x, P.z);
  if (!ride) updateFoot(0.001);
  updateCamera(0, true); applySettings();
  setState('play');
  if (!save) { phoneBadge = 1; toast('Check your phone. Uncle Ray left you a message.', 4); }
  else if (!save.stats) { phoneBadge = 1; toast('New: needs, skills, homes and interiors. Check your phone!', 4); }
}
function bringCar(silent) {
  let best = null;
  for (let r = 4; r < 60 && !best; r += 4) for (let a = 0; a < Math.PI * 2 && !best; a += Math.PI / 8) { const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; if (roadAt(x, z) && walkable(x, z, false)) { const p = { x, z }; if (!resolve(p, 1.4, 0)) best = p; } }
  if (!best) best = { x: P.x + 4, z: P.z };
  Object.assign(myCar.s, { x: best.x, z: best.z, v: 0, vx: 0, vz: 0 }); placeVehicle(myCar); if (!silent) toast('Your car is waiting nearby');
}
function updateAmbience() {
  const f = focusPos(), x = f.x, z = f.z, c = inside ? null : cityNear(x, z, 30), shoreD = shoreLine(x) - z;
  ambience(inside ? { city: inside.id === 'club' ? 0.6 : 0.08, waves: 0, birds: 0, crickets: 0 } : { city: c ? (c.id === 'main' ? 1 : 0.6) * (1 - night * 0.4) : 0.15, waves: clamp(1 - (shoreD - 20) / 90, 0, 1), birds: (1 - night) * (x < -300 || !c ? 1 : 0.35), crickets: night * (c ? 0.3 : 1) });
  radioTick();
}

// ---------------- step
function newDay() {
  dayN++;
  const inc = PROPERTIES.filter(p => owned.has(p.id)).reduce((a, p) => a + p.income, 0);
  if (inc) { money += inc; floatMoney(inc); toast(`New day · property income +${fmt(inc)}`, 3.5); } else toast('New day · dealer prices changed', 3);
  phoneBadge++;
}
function step(dt) {
  time += dt;
  const before = clockH, dh = dt / 30; clockH += dh; if (clockH >= 24) clockH -= 24;
  if (before < 6 && clockH >= 6) newDay();
  updateNeeds(dh, dt);
  updateHealth(dt);
  action = findAction();
  if (ride) { updateVehicles(dt); P.x = ride.s.x; P.z = ride.s.z; } else { updateFoot(dt); if (!inside) updateVehicles(dt); }
  if (!inside) {
    updateTraffic(dt);
    const f = focusPos(), nc = cityNear(f.x, f.z, 30), nb = f.z > sandLine(f.x) - 60 && f.x > -330;
    peds.update(dt, f.x, f.z, nc, nb);
    updateNpcList(npcs, dt); updateFlyer(dt);
  } else updateNpcList(inside.npcs, dt);
  updateBullets(dt); updateProjectiles(dt); updateParticles(dt); updateCash(dt); updateMarkers(); updateRace(dt); updateRoute(dt); updateCustomers(dt); updateJob(dt);
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
function show(id, on) { $(id).classList.toggle('hidden', !on); }
const CUSTOM_STATES = ['char', 'gun', 'car', 'clothes', 'barber', 'carshop'];
function setState(s) {
  state = s;
  show('custom', CUSTOM_STATES.includes(s));
  show('hud', s === 'play' || s === 'ui' || s === 'phone'); show('pad', s === 'play');
  if (CUSTOM_STATES.includes(s)) { previewMode = s; previewLayout(); }
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
  if (shop.kind === 'carshop') { const p = CAR_PRICES[pvCarCfg.body]; return Math.round(p * (rel(shop.relId) >= 40 ? 0.9 : 1)); }
  let total = shop.outfit ? shop.outfit.price : 0;
  for (const k of Object.keys(previewCfg)) {
    if (previewCfg[k] === shop.orig[k]) continue;
    if (shop.outfit && k in shop.outfit.cfg && shop.outfit.cfg[k] === previewCfg[k]) continue;
    total += shop.kind === 'barber' ? (BARBER_PRICES[k] || 0) : /Color|accent/.test(k) ? 15 : 30;
  }
  return total;
}
function openCustom(kind) {
  shop = null; previewCfg = null; pvCarCfg = null;
  setState(kind);
  const S = { char: BODY_SCHEMA, car: CAR_SCHEMA }[kind];
  $('customTitle').textContent = { char: 'Body & Face', car: 'Garage' }[kind];
  $('randBtn').textContent = 'Random'; $('randBtn').classList.remove('buy'); $('randBtn').disabled = false;
  const pres = $('presets'); pres.innerHTML = '';
  if (kind === 'car') for (const [name, cfg] of Object.entries(CAR_PRESETS)) { const b = document.createElement('button'); b.textContent = name; b.onclick = () => { Object.assign(carCfg, { ...DEFAULT_CAR, ...cfg, body: carCfg.body }); changed(); panel.refresh(); }; pres.appendChild(b); }
  const get = () => kind === 'car' ? carCfg : charCfg;
  const schema = kind === 'car' ? S.map(t => ({ ...t, items: t.items.filter(i => i.key !== 'body') })) : S;
  panel = buildPanel({ tabsEl: $('tabs'), contentEl: $('content'), schema, getCfg: get, onChange: (k, v) => { get()[k] = v; changed(); } });
  pv.dirty = true; changed();
}
function openCarShop(n) {
  shop = { kind: 'carshop', relId: n.relId }; pvCarCfg = { ...DEFAULT_CAR, body: 'hatch', name: 'New ride', decal: 'none', spoiler: 'none' };
  setState('carshop'); $('customTitle').textContent = 'Bay Motors'; $('randBtn').classList.add('buy');
  const pres = $('presets'); pres.innerHTML = '';
  for (const body of Object.keys(CAR_PRICES).sort((a, b) => CAR_PRICES[a] - CAR_PRICES[b])) {
    const b = document.createElement('button'); b.innerHTML = `${BODIES[body].label} <b>${fmt(CAR_PRICES[body])}</b>`; if (body === pvCarCfg.body) b.classList.add('on');
    b.onclick = () => { pvCarCfg.body = body; pvCarCfg.name = BODIES[body].label; [...pres.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); pv.dirty = true; renderStats($('stats'), carStatBars(computeCarStats(pvCarCfg)), `${garage.cars.length} car${garage.cars.length > 1 ? 's' : ''} in your garage`); updateShopPrice(); };
    pres.appendChild(b);
  }
  panel = buildPanel({ tabsEl: $('tabs'), contentEl: $('content'), schema: [{ tab: 'Colour', items: CAR_SCHEMA.flatMap(t => t.items).filter(i => ['bodyColor', 'finish', 'rimColor'].includes(i.key)) }], getCfg: () => pvCarCfg, onChange: (k, v) => { pvCarCfg[k] = v; pv.dirty = true; } });
  renderStats($('stats'), carStatBars(computeCarStats(pvCarCfg)), `${garage.cars.length} car${garage.cars.length > 1 ? 's' : ''} in your garage`);
  pv.dirty = true; updateShopPrice();
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
  $('stats').innerHTML = `<div class="statx">${kind === 'barber' ? `Cut ${fmt(BARBER_PRICES.hair)} · Colour ${fmt(BARBER_PRICES.hairColor)} · Beard ${fmt(BARBER_PRICES.facialHair)}` : `${STYLE_NAMES[place.style]} · pick an outfit, then tweak colours (${fmt(15)}) and extras (${fmt(30)}). New clothes boost your mood and Charm.`}</div>`;
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
  store.set('rr_char', charCfg); store.set('bc_cars', garage);
  pv.dirty = true;
  if (state === 'car') renderStats($('stats'), carStatBars(computeCarStats(carCfg)), `Engine <b>${CAR_PARTS.engine[carCfg.engine].label}</b> · Tyres <b>${CAR_PARTS.tyres[carCfg.tyres].label}</b>`);
  else if (state === 'char') $('stats').innerHTML = `<div class="statx">Body and face are free. Visit barbers for hair and clothing stores for outfits.</div>`;
}
$('backBtn').onclick = () => {
  const wasCar = state === 'car';
  shop = null; previewCfg = null; pvCarCfg = null;
  const wasRide = ride;
  buildHero();
  if (wasCar) rebuildMyCar();
  heroRoot.visible = !wasRide && !P.dead;
  setState('play');
};
$('randBtn').onclick = () => {
  if (shop) {
    const price = shopPrice(); if (!price) return;
    if (money < price) { sfx.fail(); toast(`You need ${fmt(price - money)} more`); return; }
    spend(price);
    if (shop.kind === 'gun') { arsenal.cfg[shop.slot] = { ...pvGunCfg }; shop.orig = { ...pvGunCfg }; saveGame(); toast('Work done. Looks mean.'); updateShopPrice(); return; }
    if (shop.kind === 'carshop') { garage.cars.push({ ...DEFAULT_CAR, ...pvCarCfg }); garage.active = garage.cars.length - 1; store.set('bc_cars', garage); bumpRel(shop.relId, 10, false); if (ride === myCar) exitCar(); rebuildMyCar({ x: inside.back.x, z: inside.back.z, h: 0 }); pendingCar = true; toast(`You bought a ${BODIES[pvCarCfg.body].label}! It'll be outside.`, 3); feed({ mood: 25 }); return; }
    charCfg = { ...previewCfg }; store.set('rr_char', charCfg); saveGame(); feed({ mood: 10 }); gainXP('charm', Math.round(price / 20));
    shop.orig = { ...charCfg }; shop.outfit = null; [...$('presets').children].forEach(c => c.classList.remove('on'));
    toast(shop.kind === 'barber' ? 'Fresh cut. Looking good.' : 'Looking sharp.'); updateShopPrice(); return;
  }
  if (state === 'car') { const keep = { body: carCfg.body, name: carCfg.name }; Object.assign(carCfg, { ...DEFAULT_CAR, ...randomCar(), ...keep }); }
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
    if (!inside) updateChunks(P.x, P.z, ride ? 3 : 2);
    applyTime(clockH, P.x, P.z); updateCamera(dt); updateHUD(rdt); updateAmbience();
    renderer.render(G.scene, G.cam);
  } else if (state === 'talk') { talk.update(rdt); talk.render(renderer); }
  else if (state === 'phone' || state === 'ui') { if (state === 'ui') updateHUD(rdt); renderer.render(G.scene, G.cam); }
  else if (state === 'mini') { /* minigame overlay owns the screen */ }
  else { ptime += rdt; updatePreview(rdt, ptime); renderer.render(pv.scene, pv.cam); }
}
startGame();
requestAnimationFrame(frame);
window.__game = { scene: G.scene, cam: G.cam, snap: () => updateCamera(0, true), get state() { return state; }, P, input, get ride() { return ride; }, get myCar() { return myCar; }, get traffic() { return traffic; }, peds, setTime: h => { clockH = h; }, openCustom, enterVehicle, exitCar, get money() { return money; }, set money(v) { money = v; }, openPlace, PLACES, PROPERTIES, runMinigame, get action() { return action; }, arsenal, selectWeapon, openPhone, setWaypoint, get route() { return route; }, talkToPed, talk, doAction, stats, get inside() { return inside; }, enterInterior, exitInterior, get customers() { return customers; }, newCustomer, startEdit, endEdit, get job() { return job; }, gainXP, storage, doSpot, useFurn, phoneGo, talkVenue, talkJob, openPlace, talkCustomer, startJob, openCarShop };
