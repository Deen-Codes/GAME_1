import * as THREE from '../lib/three.module.min.js';
import { buildCharacter, poseCharacter, disposeObject, DEFAULT_CHAR, CHAR_SCHEMA, TATTOO_DESIGNS, TATTOO_SPOTS, tattooCanvas, setFace } from './character.js?v=198';
import { computeStats, statBars, DEFAULT_GUN, RECEIVERS, PARTS, buildGun, partEffects, partPerk } from './gun.js?v=198';
import { buildCar, computeCarStats, carStatBars, carClass, carPartEffects, DEFAULT_CAR, CAR_SCHEMA, CAR_PRESETS, CAR_PARTS, BODIES, CAR_PRICES, randomCar, trafficCar } from './car.js?v=198';
import { WORLD, CHUNK, CITIES, MATS, WATER_Y, SPAWN, LABELS, SIGN, buildChunk, LADDERS, roofAt, wallTop, STAIRS, unblockPillars, canyonAt, canyonNear, PEAK, SKYWAYS, SKY_Y, skyAt, skyY, rampSeg, windowShader, makeOceanMaterial, WATER_U, WIND_U, METRO, parkedIn, resolve, walkable, onPier, roadAt, onBridge, objsNear, LANDMARK_BLOCKS, cityAt, zoneName, groundH, solidPoint, drawMap, sandLine, shoreLine, removeCollider, addCollider, collidersNear, FIELDS, blockSide, RAIL, onRail, roadY, dip } from './world.js?v=198';
import { PLACES, PROPERTIES, GOODS, dealerPrices, OUTFITS, STYLE_NAMES, BARBER_PRICES, RACE, CHOP_VALUE } from './places.js?v=198';
import { buildPanel, renderStats } from './ui.js?v=198';
import { Input } from './input.js?v=198';
import { audio, sfx, engine as engineSound, ambience, radioOn, radioTick, radioSet, radioIndex, STATIONS, setMuted, onSong, nowPlaying, danceStart, danceStop, audioTime, animalCall } from './audio.js?v=198';
import { runMinigame } from './minigames.js?v=198';
import { CUT, initCutGames } from './cutgames.js?v=198';
import { initOnline, updateOnline, goOnline, goOffline, NET, onNet, sendMagicLink, verifyCode, signOut, signedIn, cloudLoad, cloudSave, cloudList, cloudDelete, isAdmin, checkAdmin, reviewLoad, reviewSet } from './online.js?v=198';
import { Peds, bakeCfg, figure, setWalk, setTownSource, setPlayerInk, setReservedNames, seededLook } from './peds.js?v=198';
import { citizens, whereNow } from './citizens.js?v=198';
import { SLOTS, SLOT, newArsenal, slotStats, maxReserve, ammoBox, smithSchema, SMITH_PRICES, buildWeaponModel, iconSVG, DEFAULT_CFGS } from './weapons.js?v=198';
import { findRoute } from './nav.js?v=198';
import { COURSES, CAREERS, QUIZ } from './careers.js?v=198';
import { EVENTS, EVENT_BY_ID, ARRIVE, PHONE_TEXT, PERSON_TEXT } from './events.js?v=198';
import { attachWheel } from './wheel.js?v=198';
import { GROUND_U } from './groundtex.js?v=198';
import { Animals, makeAnimalMesh } from './animals.js?v=198';
import { Talk } from './talk.js?v=198';
import { incomingText, classify, textOptions, textReply } from './texts.js?v=198';
import { svg, drawIcon, ICONS as ICON_SET } from './icons.js?v=198';
import { SKILLS, GUN_SKILL_SLOTS, newStats, fixStats, addXP, xpFor, skillName, MAX_LVL, relName, relPriceMod, FOODS, MENUS } from './stats.js?v=198';
import { FURN, CATALOG } from './furniture.js?v=198';
import { INTERIORS, ORIGIN, buildInterior, STARTER_FURNITURE, HOME_DEFAULTS } from './interiors.js?v=198';

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
const SANDBOX = (() => { try { return sessionStorage.getItem('bc_sandbox') === '1'; } catch (e) { return false; } })(); // the admin's white test room: a separate throwaway life
const SK = k => SANDBOX && k !== 'rr_char' ? 'sb_' + k : k;
const store = {
  get(k, d) { try { const v = localStorage.getItem(SK(k)); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(SK(k), JSON.stringify(v)); } catch { } },
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
let arsenal = store.get('bc_arsenal', null) || newArsenal(store.get('rr_gun', null)); if (arsenal.cur !== 'fist') { arsenal.last = arsenal.cur; arsenal.cur = 'fist'; } /* you always start a session empty-handed: pull a weapon from the wheel when you need it */
for (const s of SLOTS) { arsenal.ammo[s.id] ||= { mag: 0, res: 0 }; if (s.kind === 'gun') arsenal.cfg[s.id] ||= { ...DEFAULT_CFGS[s.id] }; }
let stats = fixStats(save?.stats || newStats());
let customers = save?.customers || [];
let job = null;
const safes = () => Object.values(homes).flat().filter(f => f.t === 'safe').length;
const stashCap = () => 40 + owned.size * 20 + safes() * 40;
const stashCount = () => Object.values(stash).reduce((a, b) => a + b, 0);
let goldBoost = 0; // Gold Leaf makes you smoother
const lvl = id => (stats.lvl[id] || 1) + (id === 'charm' ? goldBoost : 0);
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
  for (let i = 0; i < 26; i++) { const cfg = trafficCar(r), car = buildCar(cfg); carLib.push({ cfg, geo: bakeGroup(car.group), len: car.length, wid: car.width }); disposeObject(car.group); }
}

// ================================================================ see-through fade
const fadeU = { uPlayer: { value: new THREE.Vector3() }, uCam: { value: new THREE.Vector3() }, uFade: { value: 1 }, uBig: { value: 1 } };
function addFade(mat, extra) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, fadeU);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vWP;\nuniform vec3 uPlayer;\nuniform vec3 uCam;\nuniform float uFade;\nuniform float uBig;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (uFade > 0.5 && vWP.y > uPlayer.y + 1.8) {
        vec3 ab = uCam - uPlayer; float t = clamp(dot(vWP - uPlayer, ab) / dot(ab, ab), 0.0, 1.0);
        float d = length(vWP - (uPlayer + ab * t));
        float rad = (2.5 + t * 9.0) * uBig;
        if (t > 0.01 && d < rad) { vec2 g = floor(gl_FragCoord.xy * 0.5); if (d < rad - 1.5 || mod(g.x + g.y, 2.0) < 1.0) discard; }
      }`);
    if (extra) extra(sh);
  };
  mat.needsUpdate = true;
}
addFade(MATS.solid); addFade(MATS.win, windowShader); addFade(MATS.glow); addFade(MATS.leaf, MATS.leaf.userData.wind);

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
let previewCfg = null, pvGunCfg = DEFAULT_GUN, pvCarCfg = null, pvWeapon = null;
function rebuildPreview() {
  if (pv.char) { pv.turn.remove(pv.char.root); disposeObject(pv.char.root); }
  if (pv.gunView) { pv.gunStand.remove(pv.gunView.group); disposeObject(pv.gunView.group); }
  if (pv.car) { pv.carStand.remove(pv.car.group); disposeObject(pv.car.group); }
  pv.char = buildCharacter(previewCfg || charCfg); pv.turn.add(pv.char.root);
  if (pvWeapon) { const m = buildWeaponModel(pvWeapon); const bb = new THREE.Box3().setFromObject(m.group), c = bb.getCenter(new THREE.Vector3()); pv.gunView = { group: m.group, length: Math.max(0.5, bb.max.z - bb.min.z), center: c }; m.group.position.copy(c).multiplyScalar(-1); pv.gunStand.add(m.group); }
  else { pv.gunView = buildGun(pvGunCfg); pv.gunView.group.position.copy(pv.gunView.center).multiplyScalar(-1); pv.gunStand.add(pv.gunView.group); }
  pv.car = buildCar(pvCarCfg || carCfg); pv.carStand.add(pv.car.group);
  pv.dirty = false;
}
let previewMode = 'char';
function previewLayout() { const c = pv.cam; c.aspect = W / H; c.clearViewOffset(); c.setViewOffset(W, H, 0, H * (document.body.classList.contains('armory') ? 0.29 : 0.24), W, H); c.updateProjectionMatrix(); }
function updatePreview(dt, t) {
  if (pv.dirty) rebuildPreview();
  const m = previewMode;
  if (!dragging) { pv.rot += pv.vel * dt; pv.vel = damp(pv.vel, m === 'carshop' || m === 'gun' || m === 'car' ? 0.35 : 0, 2, dt); }
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
const water = new THREE.Mesh(new THREE.PlaneGeometry(3060, 800), makeOceanMaterial());
water.rotation.x = -Math.PI / 2; water.position.set(-770, WATER_Y, 750); water.receiveShadow = true; G.scene.add(water);
const waters = [water];
// the east bay (round Long Beach island) and the Bay River: their own sheets of water so none of them overlap
for (const [w, d, x, z] of [[1140, 2050, 1330, 125], [290, 740, 615, -530], [1000, 1450, -1800, -375], [740, 365, -930, -917.5], [140, 1085, -1100, -192.5]]) { /* east bay, Bay River, west ocean, north sea, Red River */ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), water.material); m.rotation.x = -Math.PI / 2; m.position.set(x, WATER_Y, z); m.receiveShadow = true; G.scene.add(m); waters.push(m); }
const world = new THREE.Group(); G.scene.add(world);
const dyn = new THREE.Group(); G.scene.add(dyn);
const peds = new Peds(dyn);
setPlayerInk((charCfg.tattoos || []).map(t => t.design));
// pedestrians check for moving cars before stepping into the road
peds.carPush = p => pushOutOfCars(p, ride);
peds.carAt = (x, z, r) => { for (const t of traffic) if (!t.stun && !t.sky && (t.rx - x) ** 2 + (t.rz - z) ** 2 < r * r) return true; for (const v of vehicles) if (Math.abs(v.s.v) > 1.5 && (v.s.x - x) ** 2 + (v.s.z - z) ** 2 < r * r) return true; return false; };
let animals = null; // created once baseY exists (see below)
{ const sc = peds.scare.bind(peds); peds.scare = (x, z, r = 18) => { sc(x, z, r); animals?.scare(x, z, r * 1.6); }; }
const talk = new Talk();
function applySettings() {
  $('pad').classList.toggle('righty', settings.stickSide === 'right'); document.body.classList.toggle('righty', settings.stickSide === 'right');
  $('speedo').classList.toggle('righty', settings.stickSide === 'right');
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
  MATS.win.emissiveIntensity = night * 1.1; MATS.sign.emissiveIntensity = 0.15 + night * 0.9; MATS.glow.emissiveIntensity = 0.15 + night * 1.6; MATS.pool.opacity = night * 0.28;
  lantern.intensity = night * 14;
  WATER_U.uNight.value = night;
}

// ================================================================ SUBTITLES: people talking to you (and you to yourself) while you roam
// A face with a moving mouth and an expression, their name, and the line, just above the controls. Nothing to answer.
const subs = (() => {
  // ONE card at a time in the top-left slot: people talking (face + moving mouth), texts, notifications, little messages.
  // Cards bubble in and out; if a few are waiting they move along a bit quicker, but always long enough to read.
  const el = $('subs'), cv = $('subFace'), nameEl = $('subName'), txtEl = $('subTxt'), faceW = el.querySelector('.subFaceWrap'), icoW = $('subIco');
  let R = null, scene = null, cam = null, cur = null, t = 0, frameT = 0, outT = 0, paused = false;
  const queue = [], cache = new Map();
  function init() {
    R = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); R.setPixelRatio(1); R.setSize(160, 160, false); R.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight('#ffffff', '#3a3a50', 2.4)); const dl = new THREE.DirectionalLight('#ffffff', 1.8); dl.position.set(1.5, 2, 3); scene.add(dl);
    cam = new THREE.PerspectiveCamera(22, 1, 0.05, 20);
  }
  function figFor(key, cfg) {
    let f = cache.get(key); if (f) return f;
    f = buildCharacter({ ...cfg, back: 'none' }); f.root.visible = false; scene.add(f.root); f.root.updateMatrixWorld(true);
    const hp = new THREE.Vector3(); f.head.getWorldPosition(hp); f.hp = hp; cache.set(key, f);
    if (cache.size > 8) { const [k0, f0] = cache.entries().next().value; scene.remove(f0.root); disposeObject?.(f0.root); cache.delete(k0); }
    return f;
  }
  function enqueue(line) {
    if (line.now || (cur && line.pri > cur.pri + 1)) { queue.unshift(line); if (cur && outT <= 0) outT = 0.001; return; }
    if (queue.length > 3) { const lo = queue.findIndex(q => q.pri < line.pri); if (lo < 0) return; queue.splice(lo, 1); }
    if (cur && !cur.plain && cur.text === line.text) return; // no doubles
    queue.push(line);
  }
  // who: { key, name, cfg, pitch } or 'me'. o: { expr, radio, pri, tag, silent, now }
  function say(who, text, o = {}) {
    if (who === 'me') who = { key: 'me', name: 'You', cfg: charCfg, pitch: 210, me: true };
    if (!who?.cfg) return;
    enqueue({ who, text, expr: o.expr || 'neutral', radio: !!o.radio, pri: o.pri || 0, tag: o.tag, silent: !!o.silent, now: !!o.now });
  }
  function note(icon, title, text, o = {}) { enqueue({ plain: true, icon, title, text, cls: o.cls || '', color: o.color, pri: o.pri || 1, dur: o.dur, now: !!o.now }); }
  const readTime = s => Math.max(1.9, s.split(/\s+/).length * 0.3 + 1.1);
  function start(line) {
    if (!R && !line.plain) init();
    for (const [, g] of cache) g.root.visible = false;
    cur = line; t = 0; outT = 0; cur.shown = -1; cur.len = line.text.length;
    const rush = queue.length ? 0.72 : 1;
    if (line.plain) {
      faceW.style.display = 'none'; icoW.style.display = line.icon ? 'grid' : 'none'; if (line.icon) { icoW.innerHTML = svg(line.icon, 'sm'); icoW.style.background = line.cls === 'levelup' ? 'linear-gradient(135deg,#fff3a0,#ffb020)' : line.color || (line.cls === 'radio' ? '#9b51e0' : '#2f80ed'); }
      nameEl.textContent = line.title || ''; nameEl.style.display = line.title ? '' : 'none'; txtEl.textContent = line.text; cur.total = Math.max(1.6, (line.dur ? Math.min(line.dur, readTime(line.text)) : readTime(line.text)) * rush);
    } else {
      faceW.style.display = ''; icoW.style.display = 'none'; nameEl.style.display = '';
      const f = figFor(line.who.key, line.who.cfg); f.root.visible = true; cur.fig = f;
      nameEl.textContent = line.who.name + (line.tag ? ` · ${line.tag}` : line.radio ? ' · radio' : ''); txtEl.textContent = line.text; // full text first so the card is the right size
      cur.cps = queue.length ? 48 : 34; cur.total = (line.silent ? 0 : cur.len / cur.cps) + readTime(line.text) * 0.75 * rush;
      if (line.radio) { const A = audio(); if (A) { sfx.note(1400, A.currentTime, 0.05, 'square', 0.02, 3000); sfx.note(1100, A.currentTime + 0.06, 0.05, 'square', 0.02, 3000); } }
      frameT = 0; draw(0);
    }
    el.className = (line.plain ? 'plain ' + (line.cls || '') : '') + (line.radio ? ' radio' : '') + (line.who?.me ? ' me' : '');
    el.classList.remove('hidden'); void el.offsetWidth; el.classList.add('show');
    $('hud').style.setProperty('--slotH', el.offsetHeight + 'px'); if (!line.plain && !line.silent) txtEl.textContent = ''; slotSync();
  }
  function stop() { if (cur?.fig) cur.fig.root.visible = false; cur = null; outT = 0; el.classList.remove('show'); el.classList.add('hidden'); queue.length = 0; slotSync(); }
  function draw(talkingT) {
    const f = cur.fig; if (!f) return; const talking = talkingT > 0, mouth = talking ? Math.abs(Math.sin(t * 15)) * (0.5 + 0.5 * Math.abs(Math.sin(t * 4.3))) : 0;
    setFace(f, cur.expr, mouth);
    f.head.rotation.x = talking ? Math.sin(t * 9) * 0.05 : Math.sin(t * 1.4) * 0.02; f.head.rotation.y = Math.sin(t * 1.7) * 0.12 + (cur.expr === 'flirty' ? 0.15 : 0); f.head.rotation.z = cur.expr === 'flirty' ? 0.1 : cur.expr === 'sad' ? -0.06 : 0;
    const hp = f.hp; cam.position.set(hp.x + 0.1, hp.y + 0.06, hp.z + 1.9); cam.lookAt(hp.x, hp.y + 0.02, hp.z); R.render(scene, cam);
  }
  function update(dt) {
    if (state !== 'play') { if (!paused && cur) { paused = true; el.classList.add('hidden'); slotSync(); } return; } // phone/menus: hold the queue, carry on after
    if (paused) { paused = false; if (cur) { el.classList.remove('hidden'); el.classList.add('show'); slotSync(); } }
    if (!cur) { if (queue.length) start(queue.shift()); return; }
    t += dt;
    if (outT > 0) { outT += dt; if (outT > 0.26) { if (cur.fig) cur.fig.root.visible = false; cur = null; outT = 0; if (queue.length) start(queue.shift()); else { el.classList.add('hidden'); slotSync(); } } return; }
    let talking = false;
    if (!cur.plain) {
      const shown = cur.silent ? cur.len : Math.min(cur.len, Math.floor(t * cur.cps)); talking = !cur.silent && shown < cur.len;
      if (shown !== cur.shown) { cur.shown = shown; txtEl.textContent = cur.text.slice(0, shown); if (talking && shown % 2 === 0 && cur.text[shown - 1] !== ' ') { const A = audio(); if (A) sfx.note((cur.who.pitch || 260) * (0.9 + Math.random() * 0.25), A.currentTime, 0.045, cur.radio ? 'sawtooth' : 'square', 0.012, cur.radio ? 1400 : 2400); } }
      frameT -= dt; if (frameT <= 0) { frameT = 1 / 24; draw(talking ? 1 : 0); }
    }
    const limit = queue.length && !talking ? Math.min(cur.total, Math.max(1.5, cur.total * 0.75)) : cur.total;
    if (!talking && t > limit) { outT = 0.001; el.classList.remove('show'); } // bubble out, then the next one bubbles in
  }
  return { say, note, update, stop, get busy() { return !!cur || queue.length > 0; } };
})();
// who's who for the subtitles
const youSay = (text, expr = 'neutral', o = {}) => subs.say('me', text, { expr, ...o });
const dateWho = () => date ? { key: date.id, name: date.name, cfg: date.cfg, pitch: lookIsFem(date.look) ? 330 : 190 } : null;
const pedWho = p => p?.look?.cfg ? { key: 'ped' + (p.uid ||= Math.random().toString(36).slice(2)), name: p.name || p.person?.name || (lookIsFem(p.look) ? 'Woman' : 'Man'), cfg: p.look.cfg, pitch: lookIsFem(p.look) ? 320 : 180 } : null;
let dispatcher = null;
const copWho = () => ({ key: 'cop', name: 'Officer ' + (copWho.n ||= pick(['Diaz', 'Walsh', 'Kowalski', 'Price', 'Reyes', 'Hart'])), cfg: copLook?.cfg || COP_CFG, pitch: 150 });
const dispatchWho = () => ({ key: 'dispatch', name: 'Dispatch', cfg: (dispatcher ||= { ...COP_CFG, fem: true, hair: 'bun', hat: 'none', eyewear: 'none', skin: '#c68642', lips: '#8a3a4a' }), pitch: 300 });
function colorName(hex) {
  const c = new THREE.Color(hex), hsl = {}; c.getHSL(hsl); if (hsl.l < 0.16) return 'black'; if (hsl.l > 0.85) return 'white'; if (hsl.s < 0.15) return hsl.l > 0.55 ? 'silver' : 'grey';
  const h = hsl.h * 360; return h < 15 || h >= 340 ? 'red' : h < 40 ? 'orange' : h < 65 ? 'yellow' : h < 160 ? 'green' : h < 200 ? 'teal' : h < 255 ? 'blue' : h < 290 ? 'purple' : 'pink';
}
function suspectDesc() {
  if (ride && !ride.b.two) return `${colorName(ride.cfg.bodyColor || '#888')} ${({ sedan: 'sedan', hatch: 'hatchback', pickup: 'pickup', van: 'van', sports: 'sports car', muscle: 'muscle car', suv: 'SUV', classic: 'classic', lowrider: 'lowrider', super: 'supercar' })[ride.cfg.body] || 'vehicle'}`;
  if (ride) return `${colorName(ride.cfg.bodyColor || '#888')} motorbike`;
  return `${charCfg.fem ? 'female' : 'male'}, ${colorName(charCfg.topColor || '#888')} ${({ hoodie: 'hoodie', tshirt: 't-shirt', jacket: 'jacket', tank: 'tank top', long: 'long sleeve', shirt: 'shirt', suit: 'suit' })[charCfg.top] || 'top'}`;
}
// the chatter engine: police radio, your date, yourself, and people who remember you
const chat = { t: 12, stars: 0, pull: null, rain: false, cd: {} };
function chatCd(k, s) { if ((chat.cd[k] || 0) > time) return false; chat.cd[k] = time + s; return true; }
function updateChatter(dt) {
  if (state !== 'play') return;
  // ---- police: dispatch calls in what you did; officers shout at you
  if (WANT.stars !== chat.stars) {
    const up = WANT.stars > chat.stars, s = WANT.stars; chat.stars = s;
    if (up && s === 1 && !WANT.pull) subs.say(dispatchWho(), pick([`All units, reports of a disturbance. Suspect is ${suspectDesc()}.`, `Units in the area, suspect described as ${suspectDesc()}. Approach with caution.`]), { radio: true, pri: 3, expr: 'neutral' });
    else if (up && s === 2) { subs.say(dispatchWho(), `Suspect is ${ride ? 'fleeing in a ' : 'on foot, '}${suspectDesc()}. All units respond.`, { radio: true, pri: 3 }); if (chatCd('meflee', 20)) setTimeout(() => youSay(pick(['Not today.', 'Gotta go, gotta go!', 'Nope. Nope nope nope.', 'Come on, come on...']), 'shock', { pri: 2 }), 2600); }
    else if (up && s >= 3) subs.say(dispatchWho(), pick([`Shots fired! Suspect ${suspectDesc()}. Requesting backup.`, `Suspect is armed and dangerous. All available units.`, `Suspect still at large. Helicopter is en route.`]), { radio: true, pri: 4, expr: 'angry' });
    else if (!up && s === 0 && chat.resolved) { const why = chat.resolved; chat.resolved = null; if (why === 'stop') subs.say(dispatchWho(), pick(['Traffic stop complete. Unit back on patrol.', 'Citation issued. Clear.']), { radio: true, pri: 1 }); }
    else if (!up && s === 0 && (stats.jail || inside)) { chat.resolved = null; }
    else if (!up && s === 0) { subs.say(dispatchWho(), pick(['All units, we lost the suspect. Resume patrol.', 'Suspect lost. Stand down.']), { radio: true, pri: 2 }); if (chatCd('lost', 30)) setTimeout(() => youSay(pick(['Think I lost them.', 'Phew. That was close.', 'Too easy.']), 'happy', { pri: 2 }), 3000); }
  }
  if (WANT.pull !== chat.pull) {
    chat.pull = WANT.pull;
    if (WANT.pull) { subs.say(copWho(), WANT.pull === 'lights' ? 'Driver, your lights are off! Pull over to the side of the road.' : `Driver of the ${suspectDesc()}, pull over! You were doing ${WANT.pullMph} in a ${speedLimit(P.x, P.z) || 35}!`, { tag: 'loudspeaker', pri: 4, expr: 'angry', now: true }); setTimeout(() => { if (WANT.pull) youSay(pick(['Oh, come on...', 'Great. Just great.', 'Was I really going that fast?', 'Act natural.']), 'sad', { pri: 3 }); }, 3600); chat.nag = 12; }
  }
  if (WANT.pull && ride) { chat.nag -= dt; if (chat.nag <= 0 && Math.abs(ride.s.v) > 5) { chat.nag = 11; subs.say(copWho(), pick(['Pull over NOW!', 'Stop the vehicle!', 'Last warning! Pull over!']), { tag: 'loudspeaker', pri: 4, expr: 'angry' }); } }
  // ---- ambient chatter
  chat.t -= dt; if (chat.t > 0 || subs.busy || talk.active) return;
  chat.t = rand(22, 45);
  const lines = [], add = (who, text, expr = 'neutral', w = 1) => lines.push({ who, text, expr, w });
  const f = focusPos(), here = cityAt(f.x, f.z, 2)?.id, beach = f.z > sandLine(f.x) - 30, rain = wet > 0.3, late = clockH >= 23 || clockH < 5;
  const D = date && !date.left ? dateWho() : null, inCarD = D && date.inCar, mph = ride ? Math.abs(ride.s.v) * 2.237 : 0;
  if (D) {
    if (inCarD && mph > 70) add(D, pick(['Babe, slow DOWN!', 'Are you trying to get us killed?!', 'I want to live, thanks!']), 'shock', 4);
    if (inCarD && mph > 20 && mph < 50) add(D, pick(['I like driving around with you.', 'Put something good on the radio.', 'This car suits you.', 'Where are we going?']), 'happy');
    if (rain) add(D, pick(['Ugh, my hair!', 'I love the rain. Kind of.', 'We should get inside somewhere.']), rain && !ride ? 'sad' : 'neutral', 2);
    if (late) add(D, pick(['It\'s getting late...', 'I should probably get home soon.', 'Your place or mine?']), 'flirty', 2);
    if (beach) add(D, pick(['The water looks amazing.', 'We should come here in the summer.', 'Race you to the sea!']), 'happy', 2);
    if (here === 'east' && !ride) add(D, pick(['This part of town gives me the creeps.', 'Stay close, okay?']), 'sad', 2);
    if (night > 0.5 && Math.abs(f.z) < 30 && f.x > -170 && f.x < 45) add(D, pick(['We should go dancing!', 'Look at all the lights!']), 'happy', 2);
    if (stats.hunger < 30) add(D, 'I\'m starving. Can we eat?', 'sad', 2);
    add(D, pick(['I had fun today.', 'You\'re kind of funny, you know that?', 'So... tell me something about you.', 'I could get used to this.']), pick(['happy', 'flirty']));
  }
  if ((stats.bladder ?? 85) < 25) add('me', pick(['I really need the toilet...', 'Where\'s a bathroom when you need one?']), 'sad', 3);
  if (stats.hunger < 20) add('me', pick(['I\'m so hungry.', 'Need food. Now.']), 'sad', 2);
  if (stats.energy < 15) add('me', pick(['I need to sleep.', 'So tired...']), 'sad', 2);
  if ((stats.hygiene ?? 80) < 20) add('me', pick(['Do I smell? I think I smell.', 'I need a shower. Badly.']), 'sad', 2);
  if (rain && !ride && !chat.rain) add('me', pick(['Great. Rain.', 'Should\'ve brought an umbrella.']), 'sad', 3);
  chat.rain = rain;
  { const h = nearestHome(); if (h && Math.hypot(h.x - f.x, h.z - f.z) < 30 && !ride) add('me', pick(['Home sweet home.', 'Nearly home.']), 'happy'); }
  for (const p of PLACES) if (p.biz && bizOf(p.biz) && Math.hypot(p.x - f.x, p.z - f.z) < 35) add('me', pick([`There's my ${BIZ[p.biz].name}. Look at it.`, `${BIZ[p.biz].name}. Mine. Still weird to say.`]), 'happy');
  if (isMatchDay() && clockH > 16 && clockH < 21 && Math.hypot(264 - f.x, -146 - f.z) < 120) add('me', 'Match day. The whole city\'s buzzing.', 'happy');
  if (ride && mph > 85 && !D) add('me', pick(['Woooo!', 'Let\'s see what this thing can do.']), 'happy', 2);
  // people who remember you
  if (!ride) for (const p of peds.list) { if (!p.person || Math.hypot(p.x - P.x, p.z - P.z) > 6 || p.state === 'down') continue; const r = p.person.rap || 0; if (r > 30) add(pedWho(p), pick(['Hey! Good to see you!', 'Oh hey, it\'s you!', 'Looking good today!']), 'happy', 3); else if (r < -40) add(pedWho(p), pick(['Stay away from me.', 'You again? Great.', 'I know what you did.']), 'angry', 3); }
  if (!lines.length) return;
  let tot = lines.reduce((a, l) => a + l.w, 0), r = Math.random() * tot; for (const l of lines) { r -= l.w; if (r <= 0) { l.who === 'me' ? youSay(l.text, l.expr) : subs.say(l.who, l.text, { expr: l.expr }); return; } }
}
// ================================================================ STREET EVENTS: the city does things without you
// Every so often something kicks off nearby: a police chase, a mugging, a shop robbery, a gang scrap, a street performer,
// a car crash or a fire. You can step in, film it in your head, or keep walking. Each one plays out by itself.
const streetEvents = [];
let streetT = 25;
const GANGS = { kings: { name: 'Eastport Kings', col: '#6a2bb8', acc: '#ffd23f' }, reds: { name: 'Southside Reds', col: '#c9302c', acc: '#16161b' }, blues: { name: 'Northfield Blues', col: '#1f4a8a', acc: '#e8e8ea' } };
function streetSpot(minD, maxD) { // a pavement spot near (but not on top of) you
  const f = focusPos();
  for (let i = 0; i < 30; i++) {
    const c = cityNear(f.x, f.z, 120); if (!c) return null;
    const ix = clamp(Math.floor((f.x - c.cx) / 48) + Math.floor(rand(-2, 3)), c.kx[0], c.kx[1] - 1), iz = clamp(Math.floor((f.z - c.cz) / 48) + Math.floor(rand(-2, 3)), c.kz[0], c.kz[1] - 1); // blocks around you
    const sd = pick(['n', 's', 'e', 'w']), s = blockSide(c.id, ix, iz, sd), off = rand(-9, 9); if (sd === 'n' || sd === 's') s.x += off; else s.z += off;
    const d = Math.hypot(s.x - f.x, s.z - f.z); if (d > minD && d < maxD && walkable(s.x, s.z)) return { x: s.x, z: s.z, c };
  }
  return null;
}
function eventPed(cfg, x, z, extra = {}) { const look = { ...bakeCfg({ ...npcCfg('guest', Math.floor(Math.random() * 1e5)), ...cfg }), fem: !!cfg.fem }; const p = peds.makePed(look); Object.assign(p, { kind: 'loose', x, z, hx: x, hz: z, state: 'idle', t: 999, ev: true }, extra); peds.list.push(p); return p; }
function evBeacon(x, z, icon = 'bolt', col = 'rgba(226,59,59,.92)', label = '') { // a flashing marker over what's happening, with a word saying what it is
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(icon, col, '#fff'), depthWrite: false, transparent: true })); sp.scale.set(1.6, 1.6, 1); sp.position.set(x, 4, z); dyn.add(sp);
  if (label) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.font = '900 34px system-ui, sans-serif'; const w = Math.min(250, g.measureText(label).width + 28); g.fillStyle = col; g.beginPath(); g.roundRect ? g.roundRect(128 - w / 2, 8, w, 48, 24) : g.rect(128 - w / 2, 8, w, 48); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 128, 33);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const lb = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthWrite: false, transparent: true })); lb.scale.set(3.4, 0.85, 1); lb.position.set(0, -0.88, 0); lb.scale.divideScalar(1.6); lb.renderOrder = 3; sp.add(lb); } // sits under the icon so the word is never covered
  return sp;
}
function endEvent(E) { E.done = true; if (E.beacon) { dyn.remove(E.beacon); E.beacon = null; } }
function startStreetEvent() {
  const f = focusPos(), c = cityNear(f.x, f.z, 60), east = c?.id === 'east', nightT = clockH >= 20 || clockH < 5, raining = wet > 0.3;
  const W = [['chase', 1.2], ['mug', nightT ? 1.4 : 0.6], ['robbery', 0.7], ['gang', east ? 1.6 : nightT ? 0.5 : 0.15], ['busk', raining || nightT ? 0.1 : 1.1], ['crash', raining ? 1.4 : 0.6], ['fire', 0.35], ['market', !raining && clockH >= 18 && clockH < 24 ? 1.6 : 0], ['parade', !raining && clockH >= 10 && clockH < 18 && !streetEvents.some(e => e.kind === 'parade') ? 0.5 : 0], ['protest', !raining && clockH >= 9 && clockH < 19 ? 0.5 : 0]];
  let r = Math.random() * W.reduce((a, w) => a + w[1], 0), kind = W[0][0]; for (const [k, w] of W) { r -= w; if (r <= 0) { kind = k; break; } }
  ({ chase: evChase, mug: evMug, robbery: evRobbery, gang: evGang, busk: evBusk, crash: evCrash, fire: evFire, market: evMarket, parade: evParade, protest: evProtest })[kind]?.();
}
// police chasing a stolen car through the streets
function evChase() {
  const s = randomRoadSpot(70, 140); if (!s) return; ensureCarLib();
  const v = makeVehicle(pick(carLib).cfg, s.x, s.z, rand(0, 6.28), false); v.ai = 'flee'; v.evFlee = true;
  const a = rand(0, 6.28), cop = makeCopCar(s.x + Math.sin(a) * 26, s.z + Math.cos(a) * 26, a + Math.PI); cop.ai = 'hunt'; cop.quarry = v; cop.evCop = true;
  streetEvents.push({ kind: 'chase', v, cop, t: 75 });
}
// a mugging on the pavement: stop it and get a reward, or walk on by
function evMug() {
  const s = streetSpot(25, 70); if (!s) return;
  const victim = eventPed({ fem: Math.random() < 0.5 }, s.x, s.z, { state: 'talk', lookX: s.x + 1, lookZ: s.z });
  const mugger = eventPed({ top: 'hoodie', topColor: '#16161b', pants: 'jeans', pantsColor: '#3a3d45', hat: 'beanie', hatColor: '#16161b', fem: false }, s.x + 1.1, s.z, { state: 'punch', tx: s.x, tz: s.z, mugger: true });
  victim.lookX = mugger.x; victim.lookZ = mugger.z;
  streetEvents.push({ kind: 'mug', victim, mugger, t: 14, beacon: evBeacon(s.x + 0.5, s.z, 'fist', 'rgba(226,59,59,.92)', 'Mugging!') });
  if (Math.hypot(P.x - s.x, P.z - s.z) < 45) toast('"Help! Someone help me!"', 2.2);
}
// someone legging it out of a shop with a bag; the police show up a bit later
function evRobbery() {
  const f = focusPos(), shops = PLACES.filter(p => ['clothes', 'guns', 'venue'].includes(p.kind) && p.interior !== 'police' && p.interior !== 'hospital' && Math.hypot(p.x - f.x, p.z - f.z) < 140 && Math.hypot(p.x - f.x, p.z - f.z) > 20);
  if (!shops.length) return; const sh = pick(shops);
  const rob = eventPed({ top: 'hoodie', topColor: pick(['#16161b', '#3a3d45', '#55602f']), hat: 'beanie', hatColor: '#16161b', mask: 'none', back: 'backpack', fem: false }, sh.x, sh.z + 1);
  peds.flee(rob, sh.x, sh.z - 4); rob.t = 14; rob.robber = true;
  for (let i = 0; i < 5; i++) setTimeout(() => sfx.fail?.(), i * 420); // shop alarm
  if (Math.hypot(f.x - sh.x, f.z - sh.z) < 80) toast(`Alarm at ${sh.name}! Someone's running off with a bag.`, 3);
  setTimeout(() => { const a = rand(0, 6.28), cv = makeCopCar(sh.x + Math.sin(a) * 90, sh.z + Math.cos(a) * 90, a + Math.PI); cv.ai = 'respond'; cv.target = { x: sh.x, z: sh.z + 6 }; cv.evCop = true; setTimeout(() => { if (vehicles.includes(cv)) cv.ai = 'leave'; }, 45000); }, 9000);
  streetEvents.push({ kind: 'robbery', rob, shop: sh, t: 40, beacon: evBeacon(sh.x, sh.z, 'cash', 'rgba(226,59,59,.92)', 'Robbery!') });
}
// two crews squaring up on a corner, swinging at each other until the sirens come
function evGang() {
  const s = streetSpot(30, 80); if (!s) return;
  const ks = Object.keys(GANGS), [g1, g2] = ks.sort(() => Math.random() - 0.5), crew = [];
  for (const [gi, g] of [[0, g1], [1, g2]]) for (let i = 0; i < 3; i++) { const G2 = GANGS[g]; const p = eventPed({ top: pick(['hoodie', 'tshirt', 'jacket']), topColor: G2.col, hat: 'headband', hatColor: G2.col, accent: G2.acc, fem: false, muscle: rand(0.2, 0.7) }, s.x + (gi ? 2.2 : -2.2) + rand(-0.6, 0.6), s.z + (i - 1) * 1.1, { gang: g, side: gi }); crew.push(p); }
  for (const p of crew) { const foe = pick(crew.filter(q => q.side !== p.side)); p.state = 'punch'; p.tx = foe.x; p.tz = foe.z; p.foe = foe; }
  streetEvents.push({ kind: 'gang', crew, t: 28, hitT: 1, x: s.x, z: s.z, beacon: evBeacon(s.x, s.z, 'fist', 'rgba(139,30,63,.95)', 'Gang fight') });
  if (Math.hypot(P.x - s.x, P.z - s.z) < 60) toast(`${GANGS[g1].name} and ${GANGS[g2].name} are fighting on the corner.`, 3);
}
// a busker with a little crowd: stop and tip them
function evBusk() {
  const s = streetSpot(18, 60); if (!s) return;
  const act = pick(['guitar', 'dance', 'drums']);
  const perf = eventPed({ top: pick(['tshirt', 'jacket', 'tank']), topColor: pick(['#ff6fb5', '#ffd23f', '#38e8ff', '#4cd964']), hat: pick(['cap', 'beanie', 'none']), fem: Math.random() < 0.4 }, s.x, s.z, { busker: act, name: pick(['Jazzy Jay', 'DJ Pebbles', 'Marco', 'Little Lou', 'Sky', 'The Great Ramon']) });
  if (act === 'guitar') { const gtr = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.1), new THREE.MeshStandardMaterial({ color: '#a0602d' })); gtr.position.set(0.05, 1.15, 0.22); gtr.rotation.z = 0.9; perf.inner.add(gtr); }
  if (act === 'drums') { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.45, 12), new THREE.MeshStandardMaterial({ color: '#2f80ed' })); d.position.set(0, 0.6, 0.45); perf.inner.add(d); }
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.08, 10), new THREE.MeshStandardMaterial({ color: '#16161b' })); hat.position.set(s.x + 0.7, 0.2, s.z + 0.7); dyn.add(hat);
  const crowd = []; for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) { const a = rand(-1.2, 1.2) + Math.PI / 2, d = rand(2.2, 3.4); const c = eventPed({ fem: Math.random() < 0.5 }, s.x + Math.cos(a) * d, s.z + Math.sin(a) * d, { state: 'talk', lookX: s.x, lookZ: s.z }); crowd.push(c); }
  streetEvents.push({ kind: 'busk', perf, crowd, hat, x: s.x, z: s.z, t: 140, act, noteT: 0 });
}
// two cars have smashed into each other; someone's hurt; ambulance and tow truck turn up
function evCrash() {
  const s = randomRoadSpot(45, 110); if (!s) return; ensureCarLib();
  const h = rand(0, 6.28), a = makeVehicle(pick(carLib).cfg, s.x, s.z, h, false), b = makeVehicle(pick(carLib).cfg, s.x + Math.sin(h + 1.3) * 3.4, s.z + Math.cos(h + 1.3) * 3.4, h + 2.2, false);
  for (const v of [a, b]) { damageCar(v, 66, (a.s.x + b.s.x) / 2, (a.s.z + b.s.z) / 2); v.ai = null; }
  const hurtP = eventPed({ fem: Math.random() < 0.5 }, s.x + 2.8, s.z + 1.5); peds.knock(hurtP, 1, 0, 0.5); hurtP.injured = true; hurtP.t = 60;
  const other = eventPed({ fem: Math.random() < 0.5 }, s.x - 2.6, s.z - 1, { state: 'talk', lookX: s.x, lookZ: s.z });
  setTimeout(() => dispatch('med', hurtP.x, hurtP.z), 5000);
  streetEvents.push({ kind: 'crash', cars: [a, b], people: [hurtP, other], t: 90, beacon: evBeacon(s.x, s.z, 'car', 'rgba(226,59,59,.92)', 'Car crash') });
  spawnParticles(s.x, 1, s.z, ['#ffd23f', '#ffffff', '#888'], 18, 5, 0.5, 0.12);
}
// a building on fire: flames along the wall, smoke, a fire engine on its way
function evFire() {
  const s = streetSpot(40, 110); if (!s) return;
  for (let i = 0; i < 4; i++) addFire(s.x + rand(-4, 4), s.z + rand(-2, 2));
  streetEvents.push({ kind: 'fire', x: s.x, z: s.z, t: 50, beacon: evBeacon(s.x, s.z, 'bolt', 'rgba(255,138,42,.95)', 'Fire!') });
  if (Math.hypot(P.x - s.x, P.z - s.z) < 110) toast('Smoke on the skyline. Something\'s on fire nearby.', 3);
}
// ---------------- night markets, parades and protests
const evMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
const evBox = (g, w, h, d, c, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'string' ? evMat(c) : c); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
function signTex(text, bg, fg = '#16161b') { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 256, 128); x.fillStyle = fg; x.font = 'bold 38px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const words = text.split(' '), lines = []; let l = ''; for (const w of words) { if ((l + ' ' + w).trim().length > 11) { lines.push(l.trim()); l = w; } else l += ' ' + w; } lines.push(l.trim());
  lines.slice(0, 2).forEach((t, i, a) => x.fillText(t, 128, 64 + (i - (a.length - 1) / 2) * 42)); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function holdSign(p, text, bg) { // a placard held up over the head
  const g = new THREE.Group(); evBox(g, 0.05, 0.9, 0.05, '#8a6a4a', 0, 2.05, 0.12);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshStandardMaterial({ map: signTex(text, bg), side: THREE.DoubleSide })); board.position.set(0, 2.55, 0.14); g.add(board);
  p.inner.add(g); p.placard = g; }
const MARKET_FOOD = [{ n: 'Dumplings', c: '#e23b3b', p: 6, f: { hunger: 32, mood: 4 }, say: 'Pork and chive, fresh off the steamer.' }, { n: 'Skewers', c: '#ff8a2a', p: 8, f: { hunger: 28, mood: 5, fat: 0.003 }, say: 'Chilli lamb, cumin, the works. Careful, hot!' }, { n: 'Bubble tea', c: '#ff6fb5', p: 5, f: { hunger: 6, mood: 8, energy: 6 }, say: 'Brown sugar, extra pearls. Good choice.' }, { n: 'Bao buns', c: '#ffd23f', p: 7, f: { hunger: 30, mood: 4 }, say: 'Fluffy as a cloud. Two for you.' }, { n: 'Noodles', c: '#4cd964', p: 9, f: { hunger: 42, mood: 4 }, say: 'Hand-pulled. Watch.' }, { n: 'Mango sticky rice', c: '#ffb35c', p: 6, f: { hunger: 22, mood: 7 }, say: 'Sweetest mangoes in Bay City.' }];
function evMarket() {
  const s = streetSpot(18, 70); if (!s) return;
  const g = new THREE.Group(); dyn.add(g); const cols = [], vendors = [], crowd = [], foods = [...MARKET_FOOD].sort(() => Math.random() - 0.5);
  for (let i = 0; i < 4; i++) {
    const x = s.x + (i - 1.5) * 4.4, z = s.z; if (!walkable(x - 1.6, z) || !walkable(x + 1.6, z) || !walkable(x, z - 1.4)) continue;
    const F = foods[vendors.length], st = new THREE.Group(); st.position.set(x, 0, z); g.add(st);
    evBox(st, 3.2, 0.95, 1.1, '#e8dcc4', 0, 0.48, 0); evBox(st, 3.3, 0.06, 1.2, '#7a5230', 0, 0.98, 0);
    for (const sx of [-1.55, 1.55]) evBox(st, 0.08, 2.4, 0.08, '#3a3d45', sx, 1.2, -0.5);
    const aw = evBox(st, 3.6, 0.12, 1.8, F.c, 0, 2.45, -0.1); aw.rotation.x = -0.18;
    for (let k = 0; k < 4; k++) evBox(st, 0.34, 0.22, 0.34, pick(['#ffffff', '#c9a27a', F.c, '#f2e6d0']), -1.1 + k * 0.72, 1.12, 0.1);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.5), new THREE.MeshBasicMaterial({ map: signTex(F.n, '#16161b', F.c) })); sign.position.set(0, 2.1, 0.62); st.add(sign);
    const col = { x0: x - 1.65, x1: x + 1.65, z0: z - 0.6, z1: z + 0.6, h: 1.1 }; addCollider(col); cols.push(col);
    const v = eventPed({ top: pick(['tshirt', 'jacket']), topColor: pick(['#ffffff', '#16161b', F.c]), hat: pick(['cap', 'none', 'beanie']), fem: Math.random() < 0.5 }, x, z - 1.05, { state: 'talk', lookX: x, lookZ: z + 6, vendor: F }); v.name = lookIsFem(v.look) ? pick(['Auntie May', 'Lina', 'Rosa', 'Noor', 'Mama Lu', 'Jess']) : pick(['Mr Chen', 'Big Bo', 'Kai', 'Old Wu', 'Tomas', 'Uncle Raj']);
    vendors.push(v);
  }
  if (vendors.length < 2) { for (const c of cols) removeCollider(c); dyn.remove(g); for (const v of vendors) cleanupEvPed(v); return; }
  const lights = []; for (let i = 0; i < 18; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 4), new THREE.MeshBasicMaterial({ color: ['#ff3b3b', '#ffd23f', '#ff8a2a'][i % 3] })); b.position.set(s.x - 9 + i * 1.06, 3.1 + Math.sin(i * 0.7) * 0.2, s.z + 0.9); g.add(b); lights.push(b); }
  const glow = new THREE.PointLight('#ffb35c', 14, 22, 1.6); glow.position.set(s.x, 3.4, s.z + 2); g.add(glow);
  for (let i = 0; i < 5 + Math.floor(Math.random() * 4); i++) { const x = s.x + rand(-8, 8), z = s.z + rand(1.6, 3.4); if (!walkable(x, z)) continue; crowd.push(eventPed({ fem: Math.random() < 0.5 }, x, z, { state: 'talk', lookX: x + rand(-1, 1), lookZ: s.z, hx: x, hz: z })); }
  streetEvents.push({ kind: 'market', g, cols, vendors, crowd, lights, x: s.x, z: s.z, t: 240, smellT: 0 });
  if (Math.hypot(P.x - s.x, P.z - s.z) < 70) toast('A night market has set up down the street. You can smell the dumplings from here.', 3);
}
async function talkStall(E, v) {
  const F = v.vendor; peds.talk(v, P.x, P.z);
  beginTalk(v.look.cfg, v.name, `${F.n} stall`, 210, null);
  await talk.say(pick([`${F.n}! Best in the market. ${fmt(F.p)}.`, `You hungry? ${F.n}, ${fmt(F.p)}.`, `Come, come. ${F.n}, ${fmt(F.p)} only.`]));
  const her = date && !date.inCar && Math.hypot(date.x - P.x, date.z - P.z) < 10;
  const opts = [I('food', `Buy ${F.n} (${fmt(F.p)})`)]; if (her) opts.push(I('heart', `Buy two, one for ${date.name} (${fmt(F.p * 2)})`)); opts.push(I('chat', 'How\'s business?'), I('x', 'Just looking'));
  const k = await talk.choose(opts), pickd = opts[k];
  if (pickd === opts[0] || (her && k === 1)) { const cost = k === 1 && her ? F.p * 2 : F.p; if (money < cost) await talk.say('Short? Next time, next time.'); else { spend(cost); feed(F.f); if (k === 1 && her) { date.interest += 6; bumpRel(date.id, 3, false); hearts(date.x, date.z, 6); } await talk.say(F.say); } }
  else if (pickd.includes('business')) { await talk.say(pick(['Rain kills us. Tonight? Good night.', 'The Kings came by asking for "rent" again. Not my problem, I pay.', 'Twenty years I do this. Paid for my daughter\'s college.', 'Better since the stadium. Match nights, we sell out.'])); feed({ mood: 2 }); const pr = personOf(v); if (pr) bumpPerson(pr, 6); }
  endTalk(); v.state = 'talk'; v.lookX = v.x; v.lookZ = v.z + 6;
}
// a parade marching down the middle of the road: drums, flags, a float, crowds on both pavements
function evParade() {
  const f = focusPos(), c = cityNear(f.x, f.z, 30); if (!c) return;
  const ix = clamp(Math.round((f.x - c.cx) / 48), c.kx[0], c.kx[1]), rx = c.cx + ix * 48;
  const z0 = Math.max(c.cz + c.kz[0] * 48 + 6, f.z - 55), z1 = Math.min(c.cz + c.kz[1] * 48 - 6, f.z + 60); if (z1 - z0 < 50 || !walkable(rx, z0) || !walkable(rx, z1)) return;
  const theme = pick([{ n: 'Bay Day Parade', c: ['#2f80ed', '#ffd23f', '#ffffff'] }, { n: 'Lunar New Year Parade', c: ['#e23b3b', '#ffd23f', '#ff8a2a'] }, { n: 'Pride Parade', c: ['#e23b3b', '#ff8a2a', '#ffd23f', '#4cd964', '#2f80ed', '#9b51e0'] }, { n: 'Carnival', c: ['#ff3bd2', '#38e8ff', '#ffd23f', '#4cd964'] }]);
  const band = [];
  for (let r = 0; r < 7; r++) for (const lx of [-1.4, 0, 1.4]) { if (r === 3) continue; const col = theme.c[(r + band.length) % theme.c.length], role = r < 2 ? 'drum' : r < 5 ? 'flag' : 'dance';
    const p = eventPed({ top: pick(['tshirt', 'tank', 'jacket']), topColor: col, pants: pick(['jeans', 'shorts', 'cargo']), pantsColor: role === 'drum' ? '#16161b' : pick(theme.c), hat: role === 'drum' ? 'cap' : pick(['none', 'headband']), hatColor: '#16161b', fem: Math.random() < 0.5 }, rx + lx, z0 - r * 1.8, { state: 'march', tx: rx + lx, tz: z0 - r * 1.8, mspd: 1.3, parade: role, row: r, lane: lx });
    if (role === 'drum') evBox(p.inner, 0.5, 0.36, 0.5, '#e8e8ea', 0, 0.95, 0.38).rotation.x = 0.4;
    if (role === 'flag') { evBox(p.inner, 0.05, 2.3, 0.05, '#c9a27a', 0.3, 1.6, 0.25); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ color: pick(theme.c), side: THREE.DoubleSide })); fl.position.set(0.77, 2.4, 0.25); p.inner.add(fl); p.flag = fl; }
    band.push(p); }
  // the float: a decorated flatbed with a big sign
  const fl = new THREE.Group(); fl.position.set(rx, 0, z0 - 3 * 1.8); dyn.add(fl);
  evBox(fl, 3, 0.9, 6, theme.c[0], 0, 0.7, 0); evBox(fl, 3.2, 0.2, 6.2, '#ffffff', 0, 1.2, 0); for (const sx of [-1.3, 1.3]) for (const sz of [-2, 2]) evBox(fl, 0.3, 0.7, 0.7, '#16161b', sx, 0.35, sz);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.9), new THREE.MeshBasicMaterial({ map: signTex(theme.n, theme.c[1] || '#ffffff'), side: THREE.DoubleSide })); banner.position.set(0, 2.6, 2.4); fl.add(banner);
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), evMat(theme.c[i % theme.c.length])); b.position.set(rand(-1.2, 1.2), 1.7 + rand(0, 0.8), rand(-2.6, 2.6)); fl.add(b); }
  const watch = []; for (let i = 0; i < 16; i++) { const sd = i % 2 ? 1 : -1, x = rx + sd * rand(6.2, 7.2), z = rand(z0 - 8, z1); if (!walkable(x, z)) continue; watch.push(eventPed({ fem: Math.random() < 0.5 }, x, z, { state: 'talk', lookX: rx, lookZ: z, cheer: Math.random() })); }
  streetEvents.push({ kind: 'parade', band, float: fl, watch, rx, z0, z1, prog: 0, theme, t: 200, beatT: 0, beat: 0, x: rx, z: (z0 + z1) / 2 });
  toast(`The ${theme.n} is coming down the street! Drums, flags, a float.`, 3.2);
}
// a protest outside somewhere official: placards, a megaphone, chanting
const CAUSES = [{ s: 'RENT IS TOO HIGH', chant: 'What do we want? Lower rent! When do we want it? NOW!' }, { s: 'SAVE BAY PARK', chant: 'Hands off our park! Hands off our park!' }, { s: 'PAY NURSES', chant: 'Nurses saved us, now pay them! Pay them!' }, { s: 'NO MORE CASINOS', chant: 'Homes not casinos! Homes not casinos!' }, { s: 'JUSTICE FOR EASTPORT', chant: 'Eastport matters! Eastport matters!' }, { s: 'CLEAN THE BAY', chant: 'Clean the bay! Clean the bay!' }];
function evProtest() {
  const f = focusPos(), civic = PLACES.filter(p => ['police', 'hospital', 'office', 'college'].includes(p.interior) && Math.hypot(p.x - f.x, p.z - f.z) < 160 && Math.hypot(p.x - f.x, p.z - f.z) > 15);
  let s = civic.length ? pick(civic) : null; s = s ? { x: s.x, z: s.z + 4, at: s.name } : streetSpot(25, 80); if (!s) return;
  const C = pick(CAUSES), crowd = [];
  for (let i = 0; i < 11; i++) { const a = rand(0, 6.28), d = rand(0.8, 3.6), x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d * 0.7; if (!walkable(x, z)) continue;
    const p = eventPed({ top: pick(['hoodie', 'tshirt', 'jacket']), topColor: pick(['#16161b', '#ffffff', '#e23b3b', '#ffd23f', '#3a3d45']), fem: Math.random() < 0.5 }, x, z, { state: 'march', tx: x, tz: z, lookX: s.x, lookZ: s.z - 6, protest: true, mspd: 1 });
    if (i % 3 !== 2) holdSign(p, C.s, pick(['#ffffff', '#ffd23f', '#f2e6d0'])); crowd.push(p); }
  if (crowd.length < 4) { for (const p of crowd) cleanupEvPed(p); return; }
  const lead = crowd.find(p => !p.placard) || crowd[0]; lead.leader = true; evBox(lead.inner, 0.14, 0.14, 0.4, '#ffffff', -0.2, 1.55, 0.4);
  streetEvents.push({ kind: 'protest', crowd, cause: C, x: s.x, z: s.z, at: s.at, t: 160, chantT: 2, mood: 0, beacon: evBeacon(s.x, s.z, 'chat', 'rgba(224,160,16,.95)', 'Protest') });
  if (Math.hypot(P.x - s.x, P.z - s.z) < 90) toast(`A protest is building${s.at ? ` outside ${s.at}` : ' down the road'}: "${C.s}"`, 3);
}
async function talkProtest(E, p) {
  peds.talk(p, P.x, P.z); beginTalk(p.look.cfg, p.name || 'Protester', E.cause.s.toLowerCase().replace(/^./, c => c.toUpperCase()), 220, null);
  await talk.say(pick([`We're not going anywhere until they listen. ${E.cause.chant.split('!')[0]}!`, 'You with us? Grab a sign.', 'Sign the petition, it takes two seconds.']));
  const k = await talk.choose([I('fist', 'Join in'), I('book', 'Sign the petition'), I('chat', 'Heckle them'), I('x', 'Walk on')]);
  if (k === 0) { endTalk(); fade(() => { advanceTime(0.5); feed({ mood: 8, energy: -6 }); life().karma = clamp((life().karma || 0) + 3, -100, 100); witness('kind', E.x, E.z); E.mood += 1; E.joined = true; toast(`You chanted with them for half an hour. "${E.cause.chant}"`, 3.2); }); p.state = 'march'; return; }
  if (k === 1) { feed({ mood: 3 }); life().karma = clamp((life().karma || 0) + 1, -100, 100); await talk.say('Legend. Every name counts.'); }
  if (k === 2) { await talk.say(pick(['Get a life!', 'Wow. Real brave.', 'Keep walking, buddy.'])); E.mood += 2; for (const q of E.crowd) if (Math.random() < 0.4) { q.lookX = P.x; q.lookZ = P.z; } if (E.mood >= 4 && !E.rowdy) { E.rowdy = true; const a = pick(E.crowd.filter(q => q.state !== 'down')); if (a) { a.angry = true; a.angryT = 16; a.brave = true; a.name ??= 'Protester'; peds.release(a); } toast('That got them going. One of them is coming for you.', 2.6); } }
  endTalk(); if (p.state === 'talk') p.state = 'march';
}
function updateMarchEvents(E, dt, i) {
  const f = focusPos();
  if (E.kind === 'market') {
    const lit = night > 0.3; for (const b of E.lights) b.visible = lit || Math.floor(time * 2) % 2 === 0;
    for (const p of E.crowd) if (p.state === 'idle' || p.state === 'wander') { if (Math.random() < 0.004) { p.state = 'talk'; p.lookX = p.x + rand(-1, 1); p.lookZ = E.z; } } else if (p.state === 'talk' && Math.random() < 0.002) { p.state = 'wander'; p.tx = E.x + rand(-8, 8); p.tz = E.z + rand(1.6, 3.4); }
    if (E.t <= 0 || Math.hypot(f.x - E.x, f.z - E.z) > 140) { dyn.remove(E.g); for (const c of E.cols) removeCollider(c); for (const p of [...E.vendors, ...E.crowd]) cleanupEvPed(p); streetEvents.splice(i, 1); }
    return;
  }
  if (E.kind === 'parade') {
    const hold = E.band.some(p => p.state === 'down' || p.state === 'flee');
    if (!hold) E.prog += dt * 1.25;
    const head = E.z0 + E.prog, d = Math.hypot(P.x - E.rx, P.z - head);
    for (const p of E.band) { if (p.state === 'down' || p.state === 'flee' || p.state === 'talk') continue; p.state = 'march'; p.tx = E.rx + p.lane; p.tz = Math.min(head - p.row * 1.8, E.z1 + 40);
      if (p.flag) p.flag.rotation.y = Math.sin(time * 4 + p.row) * 0.35;
      if (p.parade === 'drum') { p.limbs[2].rotation.x = -1.3 + Math.abs(Math.sin(time * 8 + p.lane)) * 0.5; p.limbs[3].rotation.x = -1.3 + Math.abs(Math.cos(time * 8 + p.lane)) * 0.5; }
      if (p.parade === 'dance') { p.limbs[2].rotation.set(-2.5 + Math.sin(time * 5) * 0.5, 0, -0.3); p.limbs[3].rotation.set(-2.5 - Math.sin(time * 5) * 0.5, 0, 0.3); } }
    E.float.position.z = Math.min(head - 3 * 1.8 - 1, E.z1 + 40); E.float.position.x = E.rx; E.float.rotation.y = 0;
    for (const p of E.watch) if (p.state === 'talk') { p.lookX = E.rx; p.lookZ = head - 5; if (p.cheer > 0.5 && Math.abs(p.z - head) < 10) { p.limbs[2].rotation.x = -2.6 + Math.sin(time * 6 + p.cheer * 9) * 0.4; p.limbs[3].rotation.x = -2.6 - Math.sin(time * 6 + p.cheer * 9) * 0.4; } }
    E.beatT -= dt; if (d < 40 && E.beatT <= 0) { E.beatT = 0.28; E.beat++; const A = audio(); if (A) { sfx.note(E.beat % 4 === 0 ? 70 : 120, A.currentTime, 0.14, 'sine', 0.06 * (1 - d / 40), 900); if (E.beat % 2 === 0) sfx.note(pick([392, 440, 523, 587, 659]), A.currentTime, 0.2, 'square', 0.012 * (1 - d / 40), 1600); } }
    if (Math.random() < dt * 2 && d < 50) spawnParticles(E.rx + rand(-1.4, 1.4), 3.2, E.float.position.z, E.theme.c, 6, 2.5, 1.2, 0.08, -1);
    if (head > E.z1 + 20 + 7 * 1.8 || E.t <= 0 || Math.hypot(f.x - E.rx, f.z - head) > 160) { dyn.remove(E.float); for (const p of [...E.band, ...E.watch]) cleanupEvPed(p); streetEvents.splice(i, 1); }
    return;
  }
  if (E.kind === 'protest') {
    for (const p of E.crowd) if (p.state === 'idle' || p.state === 'wander') { p.state = 'march'; p.tx = p.hx; p.tz = p.hz; }
    E.chantT -= dt; const d = Math.hypot(P.x - E.x, P.z - E.z);
    if (E.chantT <= 0) { E.chantT = rand(9, 15); if (d < 30 && !talk.active) { toast(`"${E.cause.chant}"`, 2.4); const A = audio(); if (A) for (let k = 0; k < 4; k++) sfx.note(k % 2 ? 196 : 247, A.currentTime + k * 0.3, 0.22, 'sawtooth', 0.02 * (1 - d / 30), 700); } }
    if (!E.copsCalled && (E.t < 50 || E.rowdy)) { E.copsCalled = true; const a = rand(0, 6.28), cv = makeCopCar(E.x + Math.sin(a) * 90, E.z + Math.cos(a) * 90, a + Math.PI); cv.ai = 'respond'; cv.target = { x: E.x, z: E.z + 7 }; cv.evCop = true; setTimeout(() => { if (vehicles.includes(cv)) cv.ai = 'leave'; }, 40000); }
    if (E.t <= 0 && !E.done) { endEvent(E); for (const p of E.crowd) if (p.state !== 'down') { p.state = 'wander'; p.tx = p.x + rand(-20, 20); p.tz = p.z + rand(-20, 20); } if (d < 40) toast('The protest breaks up. People drift off, signs under their arms.', 2.6); }
    if (E.t < -20 || Math.hypot(f.x - E.x, f.z - E.z) > 150) { endEvent(E); for (const p of E.crowd) { if (p.placard) { p.inner.remove(p.placard); p.placard = null; } cleanupEvPed(p); } streetEvents.splice(i, 1); }
  }
}
function updateStreetEvents(dt) {
  if (inside || stats.jail) return;
  const f = focusPos();
  streetT -= dt;
  if (streetT <= 0) { streetT = rand(35, 75); if (streetEvents.filter(e => !e.done).length < 2 && cityNear(f.x, f.z, 40)) startStreetEvent(); }
  for (let i = streetEvents.length - 1; i >= 0; i--) {
    const E = streetEvents[i]; E.t -= dt;
    if (E.beacon) { E.beacon.position.y = 4 + Math.sin(time * 4) * 0.3; E.beacon.visible = Math.floor(time * 3) % 2 === 0; }
    if (E.kind === 'chase') {
      const gone = !vehicles.includes(E.v), far = Math.hypot(E.v.s.x - f.x, E.v.s.z - f.z) > 260;
      if (!gone && !E.caught && vehicles.includes(E.cop) && Math.hypot(E.cop.s.x - E.v.s.x, E.cop.s.z - E.v.s.z) < 7 && Math.abs(E.v.s.v) < 4) { E.caught = true; E.v.ai = 'park'; E.cop.ai = 'park'; E.t = 18; if (Math.hypot(E.v.s.x - f.x, E.v.s.z - f.z) < 70) toast('The police boxed the stolen car in.', 2.4); }
      if (E.t <= 0 || gone || far) { if (!gone) removeVehicle(E.v); if (vehicles.includes(E.cop)) { E.cop.ai = 'leave'; } streetEvents.splice(i, 1); }
      continue;
    }
    if (E.kind === 'mug') {
      const M = E.mugger, V = E.victim;
      if (!E.done && M.state === 'down') { // you stopped it
        endEvent(E); peds.flee(M, P.x, P.z); V.state = 'talk'; V.lookX = P.x; V.lookZ = P.z;
        const reward = 40 + Math.floor(Math.random() * 120); dropCash(V.x + 0.6, V.z, reward); witness('kind', V.x, V.z); const pr = personOf(V); if (pr) bumpPerson(pr, 30);
        toast(`"Thank you! Here, take this." You stopped the mugging.`, 3); feed({ mood: 8 }); life().karma = clamp((life().karma || 0) + 6, -100, 100);
        setTimeout(() => peds.release(V), 4000);
      } else if (!E.done && E.t <= 0) { endEvent(E); peds.flee(M, V.x, V.z); peds.flee(V, M.x, M.z); M.t = 8; }
      if (!E.done && M.state === 'punch') { M.tx = V.x; M.tz = V.z; }
      if (E.done && E.t < -20) { for (const p of [M, V]) cleanupEvPed(p); streetEvents.splice(i, 1); }
      continue;
    }
    if (E.kind === 'robbery') {
      const R = E.rob;
      if (!E.done && R.state === 'down') { endEvent(E); const reward = 150 + Math.floor(Math.random() * 250); dropCash(R.x, R.z, reward); witness('kind', R.x, R.z); toast(`You took down the shop robber! The bag split open: +${fmt(reward)} if you grab it.`, 3.2); life().karma = clamp((life().karma || 0) + 4, -100, 100); }
      if (!E.done && R.state !== 'flee') { peds.flee(R, E.shop.x, E.shop.z); R.t = 10; }
      if (!E.done && E.t <= 0) endEvent(E);
      if (E.t < -30) { cleanupEvPed(R); streetEvents.splice(i, 1); }
      continue;
    }
    if (E.kind === 'gang') {
      E.hitT -= dt;
      const up = E.crew.filter(p => p.state !== 'down' && p.state !== 'flee');
      if (!E.done && E.hitT <= 0) { E.hitT = rand(0.5, 1.2); const a = pick(up), foes = up.filter(q => q.side !== a?.side); if (a && foes.length) { const b = pick(foes); a.state = 'punch'; a.tx = b.x; a.tz = b.z; if (Math.hypot(a.x - b.x, a.z - b.z) > 1.3) { a.state = 'chase'; a.tx = b.x; a.tz = b.z; } else { sfx.punch?.(); peds.hit(b, Math.sign(b.x - a.x) || 1, 0, 1, 3); } } }
      for (const p of up) if (p.state === 'chase' && Math.hypot(p.x - p.tx, p.z - p.tz) < 1.1) p.state = 'punch';
      if (!E.done && (E.t <= 0 || copSees(E.x, E.z))) { endEvent(E); for (const p of E.crew) if (p.state !== 'down') peds.flee(p, E.x, E.z); }
      if (E.t < -25) { for (const p of E.crew) cleanupEvPed(p); streetEvents.splice(i, 1); }
      continue;
    }
    if (E.kind === 'busk') {
      const Pf = E.perf, ph = time * 6;
      if (Pf.state !== 'down' && Pf.state !== 'flee') {
        Pf.face = Math.PI / 2 * 0 + Math.atan2(P.x - Pf.x, P.z - Pf.z) * 0.3;
        if (E.act === 'dance') { Pf.limbs[2].rotation.set(-2.4 + Math.sin(ph) * 0.6, 0, -0.4); Pf.limbs[3].rotation.set(-2.4 - Math.sin(ph) * 0.6, 0, 0.4); Pf.inner.position.y = Math.abs(Math.sin(ph)) * 0.15; Pf.limbs[0].rotation.x = Math.sin(ph) * 0.4; Pf.limbs[1].rotation.x = -Math.sin(ph) * 0.4; }
        else if (E.act === 'guitar') { Pf.limbs[3].rotation.set(-0.9 + Math.sin(ph * 2) * 0.25, 0, 0.6); Pf.limbs[2].rotation.set(-1.1, 0, -0.5); }
        else { Pf.limbs[2].rotation.set(-1.2 + Math.abs(Math.sin(ph * 1.5)) * 0.6, 0, -0.3); Pf.limbs[3].rotation.set(-1.2 + Math.abs(Math.cos(ph * 1.5)) * 0.6, 0, 0.3); }
        const d = Math.hypot(P.x - E.x, P.z - E.z); E.noteT -= dt;
        if (d < 22 && E.noteT <= 0) { E.noteT = E.act === 'drums' ? 0.25 : 0.32; const A = audio(); if (A) sfx.note(E.act === 'drums' ? rand(90, 140) : pick([262, 294, 330, 392, 440, 523]), A.currentTime, 0.18, E.act === 'drums' ? 'sine' : 'triangle', 0.03 * (1 - d / 22), 1800); }
      }
      if (E.t <= 0 || Math.hypot(f.x - E.x, f.z - E.z) > 130) { dyn.remove(E.hat); for (const p of [Pf, ...E.crowd]) cleanupEvPed(p); streetEvents.splice(i, 1); }
      continue;
    }
    if (E.kind === 'tax') {
      const m = E.m; if (!E.done && m.state !== 'down') { m.tx = P.x; m.tz = P.z; if (m.state !== 'chase' && m.state !== 'talk') m.state = 'chase'; if (Math.hypot(m.x - P.x, m.z - P.z) < 2.2 && !ride && state === 'play' && !talk.active) talkTax(E); }
      if (E.t <= 0 || (E.done && E.t < 30)) { endEvent(E); streetEvents.splice(i, 1); }
      continue;
    }
    if (E.kind === 'market' || E.kind === 'parade' || E.kind === 'protest') { updateMarchEvents(E, dt, i); continue; }
    if (E.kind === 'crash' || E.kind === 'fire') { if (E.t <= 0) { endEvent(E); if (E.people) for (const p of E.people) if (!p.injured || p.state !== 'down') cleanupEvPed(p); streetEvents.splice(i, 1); } continue; }
  }
}
function cleanupEvPed(p) { const k = peds.list.indexOf(p); if (k >= 0 && Math.hypot(p.x - P.x, p.z - P.z) > 30) { peds.list.splice(k, 1); dyn.remove(p.root); } else if (k >= 0) { p.ev = false; p.t = 3; p.hx = p.x; p.hz = p.z; if (p.state === 'talk' || p.state === 'punch' || p.state === 'march') p.state = 'idle'; } }
// tipping a busker
function nearBusker() { return streetEvents.find(E => E.kind === 'busk' && E.perf.state !== 'down' && Math.hypot(P.x - E.perf.x, P.z - E.perf.z) < 2.6); }
async function talkBusker(E) {
  const p = E.perf; peds.talk(p, P.x, P.z);
  beginTalk(p.look.cfg, p.name, `Street performer · ${E.act}`, 200, null);
  await talk.say(pick(['Thank you, thank you! Requests cost extra.', 'You like it? Every dollar keeps the music going.', 'Bay City, make some noise!']));
  const k = await talk.choose([I('cash', 'Tip $5'), I('cash', 'Tip $20'), I('music', 'Play something for me'), I('x', 'Keep walking')]);
  if (k === 0 || k === 1) { const a = k ? 20 : 5; if (money < a) await talk.say('No worries, friend.'); else { spend(a); feed({ mood: k ? 8 : 4 }); life().karma = clamp((life().karma || 0) + (k ? 3 : 1), -100, 100); witness('kind', p.x, p.z); await talk.say(k ? 'Twenty?! You\'re a legend!' : 'Appreciate you!'); } }
  else if (k === 2) { feed({ mood: 6 }); await talk.say('This one\'s for you!'); E.noteT = -1; }
  endTalk(); p.state = 'idle'; p.t = 999;
}

// ================================================================ GANGS & TURF, and the rich hills
// Three crews run their own streets. Hang around and you'll see them on corners in their colours.
// Deal on their turf without their blessing and someone comes to collect. Earn respect and they give you work.
function turfAt(x, z) { const c = cityAt(x, z, 2); if (!c) return null; if (c.id === 'east') return 'kings'; if (c.id === 'north') return 'blues'; if (c.id === 'main' && z > c.cz + 3 * 48) return 'reds'; return null; }
const gangRep = g => (stats.gangRep ||= {})[g] || 0;
function bumpGang(g, d) { (stats.gangRep ||= {})[g] = clamp(gangRep(g) + d, -100, 100); }
let gangT = 6;
const gangCrews = [];
function gangMember(g, x, z, extra = {}) { const G2 = GANGS[g]; return eventPed({ top: pick(['hoodie', 'tshirt', 'jacket', 'tank']), topColor: G2.col, hat: pick(['headband', 'cap', 'beanie']), hatColor: G2.col, accent: G2.acc, pants: pick(['cargo', 'jeans']), pantsColor: '#16161b', fem: Math.random() < 0.15, muscle: rand(0.2, 0.8) }, x, z, { gang: g, name: pick(['Spider', 'Lil T', 'Dreads', 'Bones', 'Kilo', 'Smoke', 'Ace', 'Junior', 'Tiny', 'Rook']) + ` (${G2.name})`, ...extra }); }
function updateGangs(dt) {
  if (inside || stats.jail) return;
  const f = focusPos(), g = turfAt(f.x, f.z);
  gangT -= dt;
  if (gangT <= 0) { gangT = 8;
    for (let i = gangCrews.length - 1; i >= 0; i--) { const C = gangCrews[i]; if (Math.hypot(C.x - f.x, C.z - f.z) > 150) { for (const p of C.crew) { const k = peds.list.indexOf(p); if (k >= 0) { peds.list.splice(k, 1); dyn.remove(p.root); } } gangCrews.splice(i, 1); } }
    if (g && gangCrews.filter(C => Math.hypot(C.x - f.x, C.z - f.z) < 140).length < 2) { // a crew hanging on a corner
      const s = streetSpot(35, 110); if (s && turfAt(s.x, s.z) === g) { const crew = []; for (let i = 0; i < 3; i++) { const a = i * 2.1, m = gangMember(g, s.x + Math.cos(a) * 1.1, s.z + Math.sin(a) * 1.1, { state: 'talk', lookX: s.x, lookZ: s.z }); crew.push(m); } gangCrews.push({ g, x: s.x, z: s.z, crew }); }
    }
  }
  // crews keep chatting among themselves; anyone who's been hit fights back
  for (const C of gangCrews) for (const p of C.crew) if (p.state === 'idle' && !p.angry) { p.state = 'talk'; p.lookX = C.x; p.lookZ = C.z; }
  // zone label shows whose turf you're on
  const tl = g ? GANGS[g].name + ' turf' : null; if (tl !== updateGangs.last) { updateGangs.last = tl; if (tl && !ride) toast(`You're on ${tl}.`, 2); }
}
// dealing on someone's turf: they notice, and eventually send someone to collect
function turfDeal(x, z, value) {
  const g = turfAt(x, z); if (!g || gangRep(g) >= 40) return;
  stats.turfHeat ||= {}; stats.turfHeat[g] = (stats.turfHeat[g] || 0) + value;
  if (stats.turfHeat[g] > 500 && !streetEvents.some(E => E.kind === 'tax' && !E.done)) setTimeout(() => evTax(g), rand(8000, 20000));
}
function evTax(g) {
  if (inside || stats.jail) return;
  const f = focusPos(), a = rand(0, 6.28), m = gangMember(g, f.x + Math.sin(a) * 22, f.z + Math.cos(a) * 22, { state: 'chase', tx: f.x, tz: f.z, taxman: true });
  streetEvents.push({ kind: 'tax', g, m, t: 60 });
}
async function talkTax(E) {
  const m = E.m, G2 = GANGS[E.g], owe = Math.max(50, Math.round((stats.turfHeat?.[E.g] || 300) * 0.3));
  endEvent(E); peds.talk(m, P.x, P.z);
  beginTalk(m.look.cfg, m.name, G2.name, 120, null);
  await talk.say(`You're slinging on ${G2.name} turf. Nobody does that without paying. ${fmt(owe)}. Now.`);
  const k = await talk.choose([I('cash', `Pay ${fmt(owe)}`), I('chat', 'My bad. I\'ll stay off your streets.'), I('fist', 'Make me')]);
  if (k === 0) { if (money < owe) { await talk.say('You ain\'t got it? Then you got a problem.'); endTalk(); return gangJump(E.g, m); } spend(owe); stats.turfHeat[E.g] = 0; bumpGang(E.g, 12); await talk.say('Smart. Keep it moving and keep paying, and we\'re cool.'); }
  else if (k === 1) { stats.turfHeat[E.g] = 200; bumpGang(E.g, -4); await talk.say('Yeah. You will. Next time we don\'t talk.'); }
  else { endTalk(); bumpGang(E.g, -20); return gangJump(E.g, m); }
  endTalk(); peds.release(m); m.state = 'flee'; m.t = 6;
}
function gangJump(g, m) { // they come at you
  toast(`${GANGS[g].name} want a word. With their fists.`, 2.5);
  const crew = [m, gangMember(g, P.x + 6, P.z + 4), gangMember(g, P.x - 5, P.z + 5)];
  for (const p of crew) { p.angry = true; p.angryT = 25; p.brave = true; peds.release(p); }
}
async function talkGang(p) {
  const g = p.gang, G2 = GANGS[g], rep = gangRep(g); peds.talk(p, P.x, P.z);
  beginTalk(p.look.cfg, p.name.split(' (')[0], `${G2.name} · ${rep >= 40 ? 'they respect you' : rep <= -20 ? 'they hate you' : 'watching you'}`, 120, null);
  await talk.say(rep >= 40 ? pick(['Ayy, it\'s you. We good.', 'There he is. What you need?']) : rep <= -20 ? pick(['You got guts showing your face here.', 'Wrong street, bro.']) : pick([`You lost? This is ${G2.name} turf.`, 'What you looking at?', 'You ain\'t from round here.']));
  const opts = [I('chat', 'Just passing through.'), I('star', rep >= 25 ? 'Got any work for me?' : 'I want to work with you.'), I('fist', 'Get off my street.'), I('x', 'Bye')];
  const k = await talk.choose(opts);
  if (k === 0) { bumpGang(g, 1); await talk.say('Then pass through. Quick.'); }
  else if (k === 1) {
    if (rep < 25) { const ok = lvl('dealing') >= 3 || lvl('strength') >= 4; bumpGang(g, ok ? 8 : 2); await talk.say(ok ? 'Heard of you. Keep paying respect and maybe we got something.' : 'Who are you? Come back when people know your name.'); }
    else { await talk.say('Take this package across town. Don\'t open it. Don\'t get stopped.'); const k2 = await talk.choose([I('check', 'I\'ll do it'), I('x', 'Not today')]); if (k2 === 0) { lifeApi().errand('random', 'gang_drop', { g }, `Drop for ${G2.name}`); await talk.say('Pin\'s on your map. Don\'t be late.'); } }
  }
  else if (k === 2) { endTalk(); bumpGang(g, -25); for (const C of gangCrews) if (C.crew.includes(p)) { for (const q of C.crew) { q.angry = true; q.angryT = 25; q.brave = true; peds.release(q); } return; } p.angry = true; p.angryT = 20; return; }
  endTalk(); p.state = 'talk';
}
// ---------------- the hills: gated homes with security and supercars on the drive
const hillSpots = [];
function updateHills() {
  if (inside) return; const f = focusPos();
  for (const pr of PROPERTIES) {
    if (pr.x > -300) continue;
    const d = Math.hypot(pr.x - f.x, pr.z - f.z), H = hillSpots.find(h => h.id === pr.id);
    if (d < 110 && !H) {
      const mine = owned.has(pr.id), guard = eventPed({ top: 'suit', topColor: '#16161b', pants: 'jeans', pantsColor: '#16161b', eyewear: 'shades', hat: 'none', fem: false, muscle: 0.7 }, pr.x + 2.2, pr.z + 3.2, { guard: true, mine, name: pick(['Security', 'Guard']) });
      ensureCarLib(); const car = makeVehicle({ ...trafficCar(), body: pick(['hyper', 'sports', 'convertible', 'suv']), finish: 'metallic', bodyColor: pick(['#16161b', '#ffffff', '#e23b3b', '#ffd23f', '#c9ccd2']) }, pr.x - 5, pr.z + 4.5, Math.PI / 2, false); car.ai = 'park'; car.hillCar = true;
      hillSpots.push({ id: pr.id, guard, car });
    } else if (d > 180 && H) { const k = peds.list.indexOf(H.guard); if (k >= 0) { peds.list.splice(k, 1); dyn.remove(H.guard.root); } if (vehicles.includes(H.car) && H.car !== ride) removeVehicle(H.car); hillSpots.splice(hillSpots.indexOf(H), 1); }
  }
}
async function talkGuard(p) {
  peds.talk(p, P.x, P.z); beginTalk(p.look.cfg, 'Security', 'Hidden Hills', 110, null);
  await talk.say(p.mine ? pick(['Evening, boss. All quiet.', 'Welcome home, sir.']) : pick(['Private property. Keep it moving.', 'Residents only past this point.', 'Can I help you? ...Didn\'t think so.']));
  endTalk(); p.state = 'idle'; p.t = 999;
}

// ================================================================ WEATHER: clear, rain, storms and fog that roll through
// Rain darkens the sky, wets the roads (cars slide), thins the crowds and puts up umbrellas. Storms add lightning.
// Fog sits low, thickest in the hills in the early morning.
const WX_ICON = { clear: null, rain: 'rain', storm: 'storm', fog: 'fog' };
let wet = 0, fogK = 0, boltFlash = 0, boltT = 8, rainLines = null;
const wx = () => stats.wx ||= { k: 'clear', until: gameHours() + 3 };
function nextWeather() {
  const W = wx(), r = Math.random(), h = clockH;
  const k = r < 0.52 ? 'clear' : r < 0.74 ? 'rain' : r < 0.82 ? 'storm' : (h > 3 && h < 11 ? 'fog' : 'clear');
  if (k !== W.k && !inside) toast({ rain: 'It\'s starting to rain.', storm: 'A storm is rolling in.', fog: 'Fog is rolling in.', clear: W.k === 'fog' ? 'The fog is lifting.' : 'The rain has stopped.' }[k], 2.6);
  W.k = k; W.until = gameHours() + (k === 'clear' ? rand(4, 10) : rand(1.5, 4.5));
}
function makeRain() {
  const N = 1100, pos = new Float32Array(N * 6), g = new THREE.BufferGeometry();
  for (let i = 0; i < N; i++) { const x = rand(-45, 45), y = rand(0, 40), z = rand(-45, 45); pos.set([x, y, z, x - 0.15, y - 1.3, z], i * 6); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rainLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#c8d8ec', transparent: true, opacity: 0, depthWrite: false })); rainLines.frustumCulled = false; G.scene.add(rainLines);
}
function updateWeather(dt) {
  const W = wx(); if (gameHours() > W.until) nextWeather();
  const raining = W.k === 'rain' || W.k === 'storm', hills = P.x < -300;
  wet = damp(wet, raining && !inside ? (W.k === 'storm' ? 1 : 0.75) : 0, 0.4, dt); GROUND_U.gWet.value = wet;
  fogK = damp(fogK, !inside && (W.k === 'fog' ? (hills ? 1 : 0.65) : raining ? 0.35 : hills && clockH > 4 && clockH < 9 ? 0.4 : 0), 0.3, dt);
  peds.rain = raining && !inside;
  if (!rainLines) makeRain();
  rainLines.visible = wet > 0.02; rainLines.material.opacity = wet * 0.42;
  if (rainLines.visible) { // the curtain of rain follows the camera; streaks fall and wrap
    rainLines.position.set(camLook.x, camLook.y, camLook.z);
    const a = rainLines.geometry.attributes.position, arr = a.array, fall = (W.k === 'storm' ? 38 : 30) * dt;
    for (let i = 0; i < arr.length; i += 6) { arr[i + 1] -= fall; arr[i + 4] -= fall; if (arr[i + 4] < -2) { arr[i + 1] += 42; arr[i + 4] += 42; } }
    a.needsUpdate = true;
    if (Math.random() < dt * 30 * wet) spawnParticles(camLook.x + rand(-14, 14), 0.15, camLook.z + rand(-10, 10), '#dfe9f5', 2, 1.2, 0.2, 0.06, 8); // splashes
  }
  if (inside) return;
  // darker, greyer sky; lightning in storms
  const grey = new THREE.Color(night > 0.5 ? '#15171d' : '#7d8794');
  G.scene.background.lerp(grey, wet * 0.7 + fogK * 0.5); G.scene.fog.color.copy(G.scene.background);
  hemi.intensity *= 1 - wet * 0.35; sun.intensity *= 1 - wet * 0.65 - fogK * 0.3;
  const fn = G.scene.fog.near, ff = G.scene.fog.far; G.scene.fog.near = fn + (camDist * 0.3 - fn) * fogK - wet * 12; G.scene.fog.far = ff + (camDist + 22 - ff) * fogK - wet * 40;
  if (fogK > 0.05) G.scene.background.lerp(new THREE.Color(night > 0.5 ? '#2a2e38' : '#c9ced6'), fogK * 0.8), G.scene.fog.color.copy(G.scene.background);
  if (W.k === 'storm') { boltT -= dt; if (boltT <= 0) { boltT = rand(6, 18); boltFlash = 1; sfx.thunder(rand(0.4, 2.2)); if (!inside && Math.random() < 0.5) ambient('storm', null, pick(['*Thunder rumbles overhead*', '*A crack of thunder*', '*Thunder rolls across the bay*'])); } }
  if (boltFlash > 0) { boltFlash = Math.max(0, boltFlash - dt * 4); hemi.intensity += boltFlash * 2.5; G.scene.background.lerp(new THREE.Color('#e8eeff'), boltFlash * 0.5); }
}
const wetGrip = () => 1 - wet * 0.38;

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
$('moneyFloat').addEventListener('animationend', e => e.currentTarget.classList.remove('go')); // otherwise it replays every time the HUD reappears after a menu
function floatMoney(n) { const el = $('moneyFloat'); el.textContent = (n >= 0 ? '+' : '−') + '$' + Math.floor(Math.abs(n)).toLocaleString('en-US'); el.classList.toggle('neg', n < 0); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }

// ---------------- skills & needs
function gainXP(id, amt) {
  if (amt <= 0) return;
  const up = addXP(stats, id, amt);
  if (up) { levelUp(skillName(id), up); if (id === 'health') P.hp = Math.min(maxHP(), P.hp + 10); if (id.startsWith('gun_') && arsenal.cur === id.slice(4)) equipWeapon(); }
}
function feed(f) { // apply a food/drink/activity effect object
  if (f.fat) { const B = body(); B.fat = clamp(B.fat + f.fat * (stats.hunger > 85 ? 1.8 : 1), 0, 1); bodyCheck(); }
  if (f.hunger) { stats.hunger = clamp(stats.hunger + f.hunger, 0, 100); if (f.hunger > 0) stats.bladder = clamp((stats.bladder ?? 85) - f.hunger * 0.06, 0, 100); } // what goes in...
  if (f.energy) stats.energy = clamp(stats.energy + f.energy, 0, 100);
  if (f.mood) stats.mood = clamp(stats.mood + f.mood, 0, 100);
  if (f.health) P.hp = Math.min(maxHP(), P.hp + f.health);
  if (f.groceries) stats.groceries += f.groceries;
  if (f.drunk) { addDrunk(f.drunk); life().drinks++; }
}
let needWarnT = 0;
function updateNeeds(dtHours, dt) {
  stats.hunger = Math.max(0, stats.hunger - dtHours * 3); // needs tick slower so the day isn't just toilet, shower, repeat
  const running = !ride && input.stick.m > 0.85;
  stats.bladder = clamp((stats.bladder ?? 85) - dtHours * 2.6, 0, 100);
  if (stats.bladder <= 0 && !P.dead) bladderAccident();
  stats.hygiene = clamp((stats.hygiene ?? 80) - dtHours * (1.1 + (running ? 1 : 0)) - (inWater(P.x, P.z) ? -dtHours * 30 : 0), 0, 100); // a swim in the sea rinses you off a bit
  stats.energy = Math.max(0, stats.energy - dtHours * (2.1 + (running ? 1.5 / (1 + lvl('stamina') * 0.15) : 0)));
  const moodGoal = 50 + (stats.hunger > 60 ? 10 : 0) + (stats.energy > 60 ? 10 : 0) + (stats.hunger > 85 && stats.energy > 85 ? 6 : 0) + (P.hp >= maxHP() * 0.9 ? 4 : 0) - (stats.hygiene < 25 ? 8 : 0) + (stats.hygiene > 85 ? 3 : 0); // fed + rested + healthy + clean = happier
  stats.mood = clamp(stats.mood + (moodGoal - stats.mood) * dtHours * (stats.mood < moodGoal ? 0.12 : 0.05) - (stats.hunger < 20 ? dtHours * 3 : 0) - (stats.energy < 15 ? dtHours * 2 : 0), 0, 100);
  needWarnT -= dt;
  if (stats.hunger <= 0) { stats.starveT = (stats.starveT || 0) + dt; P.hp -= dt * 0.6; if (stats.starveT > 90 || P.hp <= 0) { stats.starveT = 0; toast('You collapsed from hunger...', 3); die(); } } else stats.starveT = 0;
  if (needWarnT <= 0) {
    if (stats.hunger < 15) { toast('You are starving. Eat something! (diner, taco truck, or your fridge)', 3); needWarnT = 40; }
    else if (stats.energy < 10) { toast('You are exhausted. Sleep in a bed at home.', 3); needWarnT = 40; }
    else if ((stats.bladder ?? 85) < 18) { toast('You really need the toilet! Home, or a restroom at the diner, bar, gym...', 3); needWarnT = 30; }
    else if (stats.hygiene < 12) { toast('You stink. People can smell you coming. Take a shower.', 3); needWarnT = 60; }
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
  if (stats.jail && id !== 'fist') { toast('No weapons inside. Your stuff is in a locker at intake.'); sfx.fail(); return; }
  if (!arsenal.owned.includes(id)) { toast(`${SLOT[id].name} is locked. Buy one at Bay Arms.`); sfx.fail(); return; }
  if (id !== 'fist') arsenal.last = id;
  arsenal.cur = id; equipWeapon(); sfx.equip(); saveGame();
}
const sideGun = () => { const g = arsenal.owned.includes(arsenal.last) && ['gun', 'rpg'].includes(SLOT[arsenal.last]?.kind) ? arsenal.last : arsenal.owned.find(id => SLOT[id].kind === 'gun'); return g || null; };
function holsterToggle() { selectWeapon(arsenal.cur === 'fist' ? (arsenal.owned.includes(arsenal.last) ? arsenal.last : 'fist') : 'fist'); }
function finishReload() { const a = am(), take = Math.min(ws.mag - a.mag, a.res); a.mag += take; a.res -= take; }
function startReload() { const a = am(); if (P.reload <= 0 && a.res > 0 && a.mag < ws.mag) P.reload = ws.reload; }

// ---------------- vehicles
const vehicles = [];
let ride = null, myCar = null, headSpot = null, headTarget = null;
// indicators: four amber lamps on the corners, blinked by setBlink(obj, -1 | 0 | 1)
const BLINK_ON = new THREE.MeshBasicMaterial({ color: '#ffb21a' }), BLINK_OFF = new THREE.MeshStandardMaterial({ color: '#7a4a10', roughness: 0.4 }), blinkGeo = new THREE.BoxGeometry(0.16, 0.1, 0.1);
function addBlinkers(group, L, W, y = 0.75) {
  const out = { L: [], R: [] };
  for (const side of [-1, 1]) for (const end of [1, -1]) { const m = new THREE.Mesh(blinkGeo, BLINK_OFF); m.position.set(side * (W / 2 - 0.08), y, end * (L / 2 - 0.02)); group.add(m); (side > 0 ? out.R : out.L).push(m); }
  return out;
}
function setBlink(bl, dir) { if (!bl) return; const on = Math.floor(time * 3.2) % 2 === 0; for (const m of bl.L) m.material = dir < 0 && on ? BLINK_ON : BLINK_OFF; for (const m of bl.R) m.material = dir > 0 && on ? BLINK_ON : BLINK_OFF; }
function makeVehicle(cfg, x, z, h, personal) {
  const b = buildCar(cfg); dyn.add(b.group);
  if (!b.two) { const k = b.s || 1; b.blink = addBlinkers(b.group, b.length / k, b.width / k, Math.min(0.8, b.height / k * 0.55)); } // (these go on the car in its own, unscaled space)
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
function vehY(x, z, py = 0) { { const sy = skyY(x, z, py); if (sy != null) return sy; } if (x < -290) { const cr = canyonAt(x, z); if (cr) return cr.y; } if (py > -2.5 && onBridge(x, z)) return 0.12; const r = roadAt(x, z); return r ? (r.city ? 0.04 : roadY(x, z)) : Math.max(groundH(x, z), cityAt(x, z, -6) ? 0.17 : cityAt(x, z, 4) ? 0 : -6); } // on the pavement you're up on the kerb
// headlight beams: a soft cone of light out of each lamp, lying on the road
let BEAM = null;
function headBeams(W, L) {
  if (!BEAM) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const x = cv.getContext('2d');
    x.filter = 'blur(7px)'; const gr = x.createLinearGradient(0, 256, 0, 0); gr.addColorStop(0, 'rgba(255,244,214,0.95)'); gr.addColorStop(0.45, 'rgba(255,244,214,0.45)'); gr.addColorStop(1, 'rgba(255,244,214,0)'); x.fillStyle = gr;
    x.beginPath(); x.moveTo(56, 250); x.lineTo(72, 250); x.lineTo(124, 8); x.lineTo(4, 8); x.closePath(); x.fill();
    const c2 = document.createElement('canvas'); c2.width = 8; c2.height = 128; const x2 = c2.getContext('2d'), g2 = x2.createLinearGradient(0, 0, 0, 128); g2.addColorStop(0, 'rgba(255,244,214,0.75)'); g2.addColorStop(0.5, 'rgba(255,244,214,0.22)'); g2.addColorStop(1, 'rgba(255,244,214,0)'); x2.fillStyle = g2; x2.fillRect(0, 0, 8, 128);
    const tc = new THREE.CanvasTexture(c2); tc.colorSpace = THREE.SRGBColorSpace;
    const cone = new THREE.ConeGeometry(1.25, 8.5, 20, 1, true); cone.rotateX(-Math.PI / 2); cone.translate(0, 0, 4.25); // apex at the lamp, opening forwards
    BEAM = { cone, cmat: new THREE.MeshBasicMaterial({ map: tc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, opacity: 0.55 }) }; }
  const g = new THREE.Group(); for (const s of [-1, 1]) { const b = new THREE.Mesh(BEAM.cone, BEAM.cmat); b.position.set(s * W * 0.3, 0.62, L / 2 - 0.05); b.rotation.set(0.1, s * 0.06, 0); b.renderOrder = 2; g.add(b); } return g; // light in the air: two cones that tip down to the road
}
// traffic switches its lights on after dark: headlamps, tail lights and a pool of light on the road ahead
let TL = null;
function trafficLamps(t, on) {
  t.lit = on;
  if (!TL) TL = { head: new THREE.MeshBasicMaterial({ color: '#fff6d8' }), tail: new THREE.MeshBasicMaterial({ color: '#ff2a2a' }), box: new THREE.BoxGeometry(0.34, 0.12, 0.06) };
  if (on && !t.lamps) { const g = new THREE.Group(), L = t.lib.len || 4.4, W = t.lib.wid || 1.9;
    for (const s of [-1, 1]) { const h = new THREE.Mesh(TL.box, TL.head); h.position.set(s * W * 0.33, 0.62, L / 2 + 0.02); g.add(h); const b = new THREE.Mesh(TL.box, TL.tail); b.position.set(s * W * 0.33, 0.66, -L / 2 - 0.02); g.add(b); }
    g.add(headBeams(W, L));
    t.mesh.add(g); t.lamps = g; }
  if (t.lamps) t.lamps.visible = on;
}
function placeVehicle(v, dt = 0) {
  if (v.b.boat) { // bob on the water; the bow lifts as it gets up to speed and slaps down over the chop
    const s = v.s, g = v.b.group, sp = Math.abs(s.v), t = time + (v.ph ??= Math.random() * 6);
    g.position.set(s.x, WATER_Y + 0.12 + Math.sin(t * 1.6) * 0.08 + Math.min(0.25, sp * 0.01), s.z); g.rotation.order = 'YXZ'; g.rotation.y = s.h;
    g.rotation.x = -Math.min(0.13, sp * 0.006) + Math.sin(t * 2.3) * 0.025 * (1 + Math.min(2, sp / 10)); s.y = g.position.y; return; }
  const s = v.s, g = v.b.group, fx = Math.sin(s.h), fz = Math.cos(s.h), hl = v.b.length * 0.4;
  const py = s.y ?? 0, yf = vehY(s.x + fx * hl, s.z + fz * hl, py), yb = vehY(s.x - fx * hl, s.z - fz * hl, py), y = vehY(s.x, s.z, py);
  let ty = Math.max(y, (yf + yb) / 2), pitch = -Math.atan2(yf - yb, hl * 2); // nose up going uphill
  // off an edge: fall with gravity (nose dipping) and land with a bump, instead of snapping to the ground below
  if (dt > 0 && s.y != null && (ty < s.y - 0.35 || s.air)) {
    s.vy = (s.vy || 0) - 24 * dt; const ny = s.y + s.vy * dt;
    if (ny > ty) { ty = ny; s.air = true; pitch = clamp((s.air ? g.rotation.x : 0) + dt * 0.5 * Math.sign(s.v || 1), -0.5, 0.5); }
    else { if (s.vy < -7) { const hit = -s.vy; damageCar(v, (hit - 6) * 2.5, s.x, s.z); if (v === ride) { shake = Math.max(shake, Math.min(0.6, hit / 25)); sfx.thud(); if (hit > 13) hurt((hit - 13) * 2); } spawnParticles(s.x, ty + 0.2, s.z, ['#8a7a60', '#c9c2b5'], 10, 3, 0.5, 0.12); } s.vy = 0; s.air = false; }
  } else { s.vy = 0; s.air = false; }
  g.position.set(s.x, ty, s.z); g.rotation.order = 'YXZ'; g.rotation.y = s.h; g.rotation.x = pitch;
  s.y = g.position.y;
}

// ---------------- traffic
const traffic = []; let policeLib = null;
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
    { const a = axis === 'x' ? nx : nz; if (rampSeg(axis, axis === 'x' ? nz : nx, a, a + dir * 48)) continue; }
    ensureCarLib();
    const isCop = Math.random() < 0.08; if (isCop && !policeLib) { const cfg = { ...DEFAULT_CAR, ...CAR_PRESETS.Police }, car = buildCar(cfg); policeLib = { cfg, geo: bakeGroup(car.group), wid: car.width, len: car.length }; disposeObject(car.group); }
    const lib = isCop ? policeLib : districtCar(c);
    const mesh = new THREE.Mesh(lib.geo, bakedMat); mesh.castShadow = true; dyn.add(mesh);
    const t = { c, lib, axis, line: axis === 'x' ? nz : nx, pos: axis === 'x' ? nx : nz, dir, next: (axis === 'x' ? nx : nz) + dir * 48, speed: 0, cruise: rand(8, 13), mesh, stun: 0, honk: 0, y: 0.04 };
    if (isCop) t.police = true;
    trafficPose(t); t.rx = t.x; t.rz = t.z; t.rh = t.h; traffic.push(t); return;
  }
}
// district traffic: taxis everywhere downtown, old bangers and lowriders in Eastport, nice cars in Northfield
const distLibs = {};
function libOf(cfg) { const car = buildCar(cfg), L = { cfg, geo: bakeGroup(car.group), wid: car.width, len: car.length }; disposeObject(car.group); return L; }
function districtCar(c) {
  const r = Math.random();
  if (c.id === 'main' && r < 0.24) { distLibs.taxi ||= libOf({ ...DEFAULT_CAR, ...CAR_PRESETS.Taxi }); return distLibs.taxi; }
  if (c.id === 'east' && r < 0.45) { distLibs.east ||= Array.from({ length: 6 }, () => libOf({ ...trafficCar(), body: pick(['hatch', 'classic', 'lowrider', 'pickup', 'sedan', 'van', 'compact', 'jeep']), finish: pick(['matte', 'gloss']), bodyColor: pick(['#7c828d', '#55602f', '#8b1e3f', '#c2b280', '#3a3d45', '#5a3a22']) })); return pick(distLibs.east); }
  if (c.id === 'north' && r < 0.3) { distLibs.rich ||= Array.from({ length: 5 }, () => libOf({ ...trafficCar(), body: pick(['sports', 'hyper', 'convertible', 'suv', 'coupe', 'gt', 'jeep']), finish: pick(['metallic', 'gloss']), bodyColor: pick(['#16161b', '#ffffff', '#e23b3b', '#ffd23f', '#2f80ed', '#c9ccd2']) })); return pick(distLibs.rich); }
  return carLib[Math.floor(Math.random() * carLib.length)];
}
function updateTraffic(dt) {
  const ox = P.x, oz = P.z, PY = ride ? (ride.s.y || 0) : P.y;
  if (traffic.length < (!inside && cityNear(ox, oz) ? 12 : 0)) spawnTraffic(ox, oz);
  if (!inside && traffic.filter(t => t.sky).length < 4) spawnSkyTraffic(ox, oz);
  for (let i = traffic.length - 1; i >= 0; i--) {
    const t = traffic[i];
    if (Math.hypot(t.x - ox, t.z - oz) > 170) { dyn.remove(t.mesh); traffic.splice(i, 1); continue; }
    if (t.sky) { stepSkyTraffic(t, dt, ox, oz, PY); continue; }
    let block = false;
    const check = (x, z, rad, y = 0) => { if (Math.abs(y - 0.04) > 2.5) return; const dx = x - t.x, dz = z - t.z, al = dx * t.fx + dz * t.fz, lat = Math.abs(-dx * t.fz + dz * t.fx); if (al > 0 && al < 7 + t.speed * 0.4 && lat < rad) block = true; };
    check(ox, oz, ride ? 2.6 : 1.8, PY);
    for (const v of vehicles) if (v !== ride) check(v.s.x, v.s.z, 2.4, v.s.y || 0);
    for (const o of traffic) if (o !== t && !o.sky && (o.axis === t.axis ? o.dir === t.dir : true)) check(o.x, o.z, o.axis === t.axis ? 1.6 : 2.2);
    for (const p of peds.list) if (p.state === 'cross' || p.state === 'flee' || p.state === 'talk' || p.state === 'march') check(p.x, p.z, 1.6);
    { const dn = (t.next - t.pos) * t.dir, nx = t.axis === 'x' ? t.next : t.line, nz = t.axis === 'x' ? t.line : t.next; t.red = dn > 6.5 && dn < 15 && lightAt(nx, nz, t.axis) !== 'g'; if (t.red) block = true; }
    t.stun -= dt; t.honk -= dt;
    t.blockT = block && !t.red ? (t.blockT || 0) + dt : 0;
    if (t.blockT > 4 + (t.cruise % 1) * 2) { t.blockT = 0; t.next = t.next - t.dir * 48; t.dir = -t.dir; block = false; } // stuck: turn around
    const want = block || t.stun > 0 ? 0 : t.cruise;
    t.speed = damp(t.speed, want, want < t.speed ? 6 : 1.2, dt);
    if (block && t.honk <= 0 && Math.random() < 0.01) { t.honk = 4; if (Math.hypot(t.x - ox, t.z - oz) < 30) sfx.horn(); }
    t.pos += t.dir * t.speed * dt;
    // decide the next turn ~25m early so the car can signal it
    if (t.planFor !== t.next && Math.abs(t.next - t.pos) < 26) {
      const node = t.next, c = t.c;
      const idxAlong = Math.round((node - (t.axis === 'x' ? c.cx : c.cz)) / 48), idxLine = Math.round((t.line - (t.axis === 'x' ? c.cz : c.cx)) / 48);
      const rA = t.axis === 'x' ? c.kx : c.kz, rL = t.axis === 'x' ? c.kz : c.kx, opts = [];
      const nax = t.axis === 'x' ? 'z' : 'x'; // never drive along a street that's become a skyway ramp
      if (idxAlong + t.dir >= rA[0] && idxAlong + t.dir <= rA[1] && !rampSeg(t.axis, t.line, node, node + t.dir * 48)) opts.push('s', 's');
      if (idxLine + 1 <= rL[1] && !rampSeg(nax, node, t.line, t.line + 48)) opts.push('+'); if (idxLine - 1 >= rL[0] && !rampSeg(nax, node, t.line, t.line - 48)) opts.push('-');
      t.plan = opts.length ? pick(opts) : 'u'; t.planFor = t.next;
      if (t.plan === '+' || t.plan === '-') { const nd = t.plan === '+' ? 1 : -1, nfx = t.axis === 'x' ? 0 : nd, nfz = t.axis === 'x' ? nd : 0; t.sig = Math.sign(wrapA(Math.atan2(nfx, nfz) - t.h)); } else t.sig = 0;
    }
    if (!t.blink) t.blink = addBlinkers(t.mesh, t.lib.len || 4.4, 1.9, 0.7);
    setBlink(t.blink, t.sig || 0);
    if ((t.dir > 0 && t.pos >= t.next) || (t.dir < 0 && t.pos <= t.next)) {
      const node = t.next;
      const ch = t.planFor === node && t.plan ? t.plan : 'u'; t.planFor = null; t.sig = 0;
      if (ch === 's') t.next = node + t.dir * 48;
      else if (ch === 'u') { t.dir = -t.dir; t.next = node + t.dir * 48; }
      else { const nd = ch === '+' ? 1 : -1, oldLine = t.line; t.axis = t.axis === 'x' ? 'z' : 'x'; t.line = node; t.pos = oldLine; t.dir = nd; t.next = oldLine + nd * 48; }
    }
    trafficPose(t);
    t.rx = damp(t.rx, t.x, 7, dt); t.rz = damp(t.rz, t.z, 7, dt); t.rh += wrapA(t.h - t.rh) * (1 - Math.exp(-7 * dt));
    t.mesh.position.set(t.rx, 0.04, t.rz); t.mesh.rotation.y = t.rh; if (t.lit !== night > 0.35) trafficLamps(t, night > 0.35);
    if (t.speed > 3) for (const p of peds.list) if (Math.hypot(p.x - t.rx, p.z - t.rz) < 1.8 && peds.knock(p, t.fx, t.fz, t.speed * 0.7)) { sfx.thud(); t.stun = 2; }
    trafficBump(t, PY);
  }
}
// skyway traffic: cars cruising the raised roads; at the city edge they roll down the ramp and join the street grid
const skyXZ = (S, u, w) => S.axis === 'x' ? [u, S.line + w] : [S.line + w, u];
function spawnSkyTraffic(px, pz) {
  const near = SKYWAYS.filter(S => { if (S.noTraffic) return false; const [u, w] = S.axis === 'x' ? [px, pz - S.line] : [pz, px - S.line]; return Math.abs(w) < 150 && u > S.a0 - 120 && u < S.a1 + 120; });
  if (!near.length) return;
  for (let tries = 0; tries < 6; tries++) {
    const S = pick(near), u = rand(S.a0 + S.ramp + 8, S.a1 - S.ramp - 8), dir = Math.random() < 0.5 ? 1 : -1, [x, z] = skyXZ(S, u, dir * 3), d = Math.hypot(x - px, z - pz);
    if (d < 55 || d > 140 || traffic.some(o => o.sky && o.S === S && Math.abs(o.u - u) < 14)) continue;
    ensureCarLib(); const lib = districtCar(CITIES[0]), mesh = new THREE.Mesh(lib.geo, bakedMat); mesh.castShadow = true; mesh.rotation.order = 'YXZ'; dyn.add(mesh);
    const t = { sky: true, S, u, dir, c: CITIES[0], lib, speed: 0, cruise: rand(21, 26), mesh, stun: 0, honk: 0, y: S.y }; // skyway: 60 mph limit, so they move
    skyPose(t); t.rx = t.x; t.rz = t.z; t.rh = t.h; traffic.push(t); return;
  }
}
function skyPose(t) { const S = t.S, ax = S.axis === 'x'; t.fx = ax ? t.dir : 0; t.fz = ax ? 0 : t.dir; [t.x, t.z] = skyXZ(S, t.u, ax ? t.dir * 3 : -t.dir * 3); t.h = Math.atan2(t.fx, t.fz); t.axis = S.axis; }
function stepSkyTraffic(t, dt, ox, oz, PY) {
  const S = t.S; let block = false;
  const chk = (x, z, y, rad) => { if (Math.abs(y - t.y) > 2.5) return; const dx = x - t.x, dz = z - t.z, al = dx * t.fx + dz * t.fz, lat = Math.abs(-dx * t.fz + dz * t.fx); if (al > 0 && al < 7 + t.speed * 0.4 && lat < rad) block = true; };
  chk(ox, oz, PY, ride ? 2.6 : 1.8);
  for (const v of vehicles) if (v !== ride) chk(v.s.x, v.s.z, v.s.y || 0, 2.4);
  for (const o of traffic) if (o !== t && o.sky) chk(o.x, o.z, o.y, 1.8);
  t.stun -= dt; const want = block || t.stun > 0 ? 0 : t.cruise; t.speed = damp(t.speed, want, want < t.speed ? 6 : 1.2, dt);
  t.u += t.dir * t.speed * dt; skyPose(t);
  const k = skyAt(t.x, t.z); t.y = k ? k.y : 0.04;
  if (t.u < S.a0 - 5.5 || t.u > S.a1 + 5.5) { // down at the edge junction: become a normal street car heading on
    const node = t.dir > 0 ? S.a1 + 6 : S.a0 - 6; Object.assign(t, { sky: false, axis: S.axis, line: S.line, pos: t.u, next: node, planFor: null, y: 0.04, c: cityAt(t.x, t.z, 14) || t.c }); // join the street grid of whichever town the ramp lands in t.mesh.rotation.x = 0; return;
  }
  const yf = (skyAt(t.x + t.fx * 1.8, t.z + t.fz * 1.8)?.y ?? 0.04), yb = (skyAt(t.x - t.fx * 1.8, t.z - t.fz * 1.8)?.y ?? 0.04);
  t.rx = damp(t.rx, t.x, 7, dt); t.rz = damp(t.rz, t.z, 7, dt); t.rh += wrapA(t.h - t.rh) * (1 - Math.exp(-7 * dt));
  t.mesh.position.set(t.rx, t.y, t.rz); t.mesh.rotation.y = t.rh; t.mesh.rotation.x = -Math.atan2(yf - yb, 3.6);
  if (t.lit !== night > 0.35) trafficLamps(t, night > 0.35);
  if (!t.blink) t.blink = addBlinkers(t.mesh, t.lib.len || 4.4, 1.9, 0.7);
  trafficBump(t, PY);
}
function trafficBump(t, PY) {
  {
    const ty = t.y ?? 0.04;
    for (const v of vehicles) if (v !== ride && Math.abs((v.s.y || 0) - ty) < 2.5 && (v.s.x - t.rx) ** 2 + (v.s.z - t.rz) ** 2 < 49) { const h = carVsTraffic(v, t); if (h) { v.s.x += h.nx * h.pen; v.s.z += h.nz * h.pen; if (t.speed > 4) { v.s.vx += h.nx * t.speed * 0.5; v.s.vz += h.nz * t.speed * 0.5; v.coast = 0.8; sfx.thud(); t.stun = 2; } t.speed = 0; placeVehicle(v); } }
    if (Math.abs(PY - ty) > 2.5) return;
    if (ride) {
      const s = ride.s, h = (s.x - t.rx) ** 2 + (s.z - t.rz) ** 2 < 49 ? carVsTraffic(ride, t) : null;
      if (h) {
        s.x += h.nx * h.pen; s.z += h.nz * h.pen;
        const into = s.vx * h.nx + s.vz * h.nz; // only kill the speed heading INTO the other car, so you can always reverse away
        if (into < 0) { if (-into > 6) { spawnParticles(h.cx, 0.8, h.cz, ['#ffd23f', '#ffffff'], 6, 4, 0.3, 0.1); shake = 0.3; t.stun = 2; sfx.thud(); damageCar(ride, -into * 1.1, h.cx, h.cz); } s.vx -= h.nx * into; s.vz -= h.nz * into; const fwd = s.vx * Math.sin(s.h) + s.vz * Math.cos(s.h); if (Math.sign(fwd) !== Math.sign(s.v) || Math.abs(fwd) < Math.abs(s.v)) s.v = fwd; }
      }
    } else {
      const dx = P.x - t.rx, dz = P.z - t.rz, d = Math.hypot(dx, dz);
      if (d < 2.0 && d > 0.01 && !P.dead) { P.x = t.rx + dx / d * 2.0; P.z = t.rz + dz / d * 2.0; if (t.speed > 4 && P.hitCd <= 0) { hurt(t.speed * 2.6); sfx.thud(); P.hitCd = 1; P.kx = dx / d * t.speed * 0.9; P.kz = dz / d * t.speed * 0.9; P.vy = 5; t.stun = 2.5; t.speed = 0; } }
    }
  }
}


// ---------------- bikes, rental e-scooters and motorbikes parked around town
let twoT = 2;
function updateTwoWheelers(dt) {
  twoT -= dt; if (twoT > 0) return; twoT = 2.5;
  const f = focusPos(), c = cityNear(f.x, f.z, 30); if (!c) return;
  const near = vehicles.filter(v => v.parked2 && Math.hypot(v.s.x - f.x, v.s.z - f.z) < 140).length;
  if (near >= 6) return;
  for (let k = 0; k < 8; k++) {
    const i = c.kx[0] + Math.floor(Math.random() * (c.kx[1] - c.kx[0])), j = c.kz[0] + Math.floor(Math.random() * (c.kz[1] - c.kz[0]));
    const bx = c.cx + (i + 0.5) * 48, bz = c.cz + (j + 0.5) * 48, side = Math.floor(Math.random() * 4), t = rand(-12, 12), R2 = 17.3;
    const x = bx + [t, R2, t, -R2][side], z = bz + [-R2, t, R2, t][side], d = Math.hypot(x - f.x, z - f.z);
    if (d < 30 || d > 100 || !walkable(x, z)) continue;
    const kind = pick(['scooter', 'scooter', 'bike', 'bike', 'moto']);
    const cols = ['#e23b3b', '#2f80ed', '#16161b', '#ffd23f', '#4cd964', '#ff6fb5', '#ffffff'];
    const cfg = { ...DEFAULT_CAR, body: kind, bodyColor: kind === 'scooter' ? '#4cd964' : pick(cols), rimColor: '#2a2b30', engine: kind === 'moto' ? pick(['stock', 'sport', 'race']) : 'stock' };
    const v = makeVehicle(cfg, x, z, [Math.PI / 2, 0, -Math.PI / 2, Math.PI][side] + (Math.random() - 0.5) * 0.3, false);
    v.parked2 = true; v.rental = kind === 'scooter'; return;
  }
}
// ---------------- traffic lights: every downtown junction cycles; traffic stops on red
const TLM = { r: [new THREE.MeshBasicMaterial({ color: '#3a0d10' }), new THREE.MeshBasicMaterial({ color: '#ff2a2a' })], y: [new THREE.MeshBasicMaterial({ color: '#3a300a' }), new THREE.MeshBasicMaterial({ color: '#ffc21a' })], g: [new THREE.MeshBasicMaterial({ color: '#0d2a14' }), new THREE.MeshBasicMaterial({ color: '#2aff6a' })] };
const TL_POLE = new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.6 }), TL_BOX = new THREE.MeshStandardMaterial({ color: '#16181c' });
const tlGroups = new Map();
function lightAt(nx, nz, axis) {
  const T = (time + Math.abs((nx * 7 + nz * 13) | 0) % 20) % 20;
  if (axis === 'x') return T < 8 ? 'g' : T < 10 ? 'y' : 'r';
  return T >= 10 && T < 18 ? 'g' : T >= 18 ? 'y' : 'r';
}
let tlT = 0;
function updateTrafficLights(dt) {
  tlT -= dt;
  if (tlT <= 0) {
    tlT = 0.7; const f = focusPos(), c = !inside && cityNear(f.x, f.z, 20), keep = new Set();
    if (c) for (let ix = c.kx[0]; ix <= c.kx[1]; ix++) for (let iz = c.kz[0]; iz <= c.kz[1]; iz++) {
      const nx = c.cx + ix * 48, nz = c.cz + iz * 48; if (Math.abs(nx - f.x) > 95 || Math.abs(nz - f.z) > 95) continue;
      const k = nx + ',' + nz; keep.add(k);
      if (!tlGroups.has(k)) {
        const g = new THREE.Group(), heads = [];
        for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
          const px = nx + sx * 7.4, pz = nz + sz * 7.4;
          const pole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.2, 0.16), TL_POLE); pole.position.set(px, 2.1, pz); g.add(pole); const pc = { x: px, z: pz, r: 0.14 }; addCollider(pc); (g.userData.cols ||= []).push(pc); // solid, like the lamp posts
          for (const axis of ['x', 'z']) { // one head faces x-axis traffic, one faces z-axis traffic
            const hb = new THREE.Group(); hb.position.set(px, 3.7, pz); hb.rotation.y = axis === 'x' ? (sx > 0 ? -Math.PI / 2 : Math.PI / 2) : (sz > 0 ? Math.PI : 0); g.add(hb);
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.95, 0.28), TL_BOX); hb.add(box);
            const lamps = ['r', 'y', 'g'].map((c2, i) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), TLM[c2][0]); l.position.set(0, 0.28 - i * 0.28, 0.15); hb.add(l); return l; });
            heads.push({ axis, lamps });
          }
        }
        dyn.add(g); tlGroups.set(k, { g, heads, nx, nz });
      }
    }
    for (const [k, o] of tlGroups) if (!keep.has(k)) { dyn.remove(o.g); for (const c2 of o.g.userData.cols || []) removeCollider(c2); tlGroups.delete(k); }
  }
  for (const o of tlGroups.values()) for (const h of o.heads) { const st = lightAt(o.nx, o.nz, h.axis); h.lamps.forEach((l, i) => { const c2 = 'ryg'[i]; l.material = TLM[c2][st === c2 ? 1 : 0]; }); }
}

// ---------------- bullets, rockets, grenades, explosions
const tmpV = new THREE.Vector3();
const bullets = [], bpool = [], bgeo = new THREE.BoxGeometry(0.06, 0.06, 0.7);
// drive-by: shoot at the nearest threat (cops first), otherwise straight ahead
function driveBy() {
  const a = am(); if (ws.kind !== 'gun' || P.fireCd > 0 || P.dead) return;
  if (a.mag <= 0) { if (a.res > 0 && P.reload <= 0) startReload(); return; }
  const c = ride.s; let best = null, bd = 30;
  for (const v of copCars) { const d = Math.hypot(v.s.x - c.x, v.s.z - c.z); if (d < bd) { bd = d; best = v.s; } }
  if (!best) for (const p of peds.list) { if (p.state === 'down') continue; const d = Math.hypot(p.x - c.x, p.z - c.z); if (d < Math.min(bd, 22)) { bd = d; best = p; } }
  const ang = best ? Math.atan2(best.x - c.x, best.z - c.z) : c.h;
  tmpV.set(c.x + Math.sin(ang) * 1.4, 1.3, c.z + Math.cos(ang) * 1.4);
  shoot(tmpV, ang); P.fireCd = 1 / ws.rof;
}
function shoot(origin, aimAng) {
  const s = ws; if (origin) tmpV.copy(origin); else heroW.muzzle.getWorldPosition(tmpV);
  for (let i = 0; i < s.pellets; i++) {
    const a = (aimAng ?? P.face) + (Math.random() - 0.5) * s.spread * DEG * (1 + P.recoil);
    let m = bpool.pop(); if (!m) m = new THREE.Mesh(bgeo, new THREE.MeshBasicMaterial());
    m.material.color.set(s.tracer); m.position.copy(tmpV); m.rotation.set(0, a, 0); dyn.add(m);
    bullets.push({ x: tmpV.x, y: tmpV.y, z: tmpV.z, vx: Math.sin(a) * s.speed, vz: Math.cos(a) * s.speed, life: s.range / s.speed, m, ammo: s.ammo, slot: arsenal.cur, dmg: s.dmg });
  }
  am().mag--; P.recoil = Math.min(1, P.recoil + s.recoil * 0.5); shake = Math.max(shake, s.recoil * 0.1);
  flash(tmpV, (s.quiet ? 0.4 : 0.8) * (0.8 + s.dmg / 80), s.energy ? s.tracer : '#ffffff', s.quiet ? 3 : 8);
  sfx.shot(s.quiet, s.energy);
  if (!s.quiet) { witness('gun'); peds.scare(P.x, P.z, 26); crime(0.25); }
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
      if (!dead) for (const v of vehicles) if ((b.cop ? v === ride : v !== ride) && Math.hypot(v.s.x - b.x, v.s.z - b.z) < Math.max(1.2, v.b.length * 0.45) && b.y < 2) { dead = true; damageCar(v, 4 * clamp((b.dmg || 24) / 24, 0.5, 4) * (b.ammo === 'ap' ? 2.2 : 1) * (v.st?.bp ? 0.3 : 1) * (v.st?.runflat ? 0.8 : 1), b.x, b.z, !b.cop); if (b.ammo === 'incendiary' && Math.random() < 0.08) addFire(v.s.x, v.s.z); break; } /* armour piercing chews through cars; incendiary can set them alight */
      for (const p of peds.list) if (p.state !== 'down' && Math.hypot(p.x - b.x, p.z - b.z) < 0.6) {
        if (b.cop) continue; dead = true; const d = Math.hypot(b.vx, b.vz); if (peds.knock(p, b.vx / d, b.vz / d, 4)) { p.injured = true; p.t = 40; } if (b.ammo === 'frost') p.frostT = 4; if (b.ammo === 'incendiary') spawnParticles(p.x, 1.2, p.z, ['#ffb02e', '#ff5a1f', '#ffe08a'], 10, 1.5, 0.8, 0.12, 2); crime(p.kind === 'cop' ? 2 : 1); witness('gun', P.x, P.z, p); peds.scare(p.x, p.z, 20); gainXP('gun_' + b.slot, 3);
        spawnParticles(b.x, b.y, b.z, ['#ffffff', '#ffd23f'], 4, 2, 0.3, 0.08); if (Math.random() < 0.5) dropCash(p.x, p.z, 5 + Math.floor(Math.random() * 30)); break;
      }
      if (dead) {
        if (b.ammo === 'explosive') explode(b.x, b.y, b.z, 2.2, 0.35, !b.cop);
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
function explode(x, y, z, r, power, byYou = true) { // byYou: only blasts you caused count as your crime
  spawnParticles(x, y + 0.5, z, ['#ffd23f', '#ff8a2a', '#ff4d2a', '#ffffff'], Math.round(30 * power) + 6, 9 * power + 3, 0.6, 0.35 * power + 0.15, 4);
  spawnParticles(x, y + 0.5, z, ['#3a3040', '#5a5060', '#777'], Math.round(16 * power) + 3, 3, 1.3, 0.6 * power + 0.2, -2);
  boomLight.position.set(x, y + 2, z); boomLight.intensity = 60 * power;
  { const f = focusPos(), fd = Math.hypot(f.x - x, f.z - z), near = clamp(1 - fd / 70, 0, 1); shake = Math.max(shake, (0.25 + 0.6 * power) * near); if (near > 0.5) navigator.vibrate?.([40, 20, 80]); }
  sfx.boom();
  if (power < 0.5) return;
  for (const p of peds.list) { const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz); if (d < r) { peds.knock(p, dx / (d || 1), dz / (d || 1), 14 * (1 - d / r) + 3); if (Math.random() < 0.4) dropCash(p.x, p.z, 10 + Math.floor(Math.random() * 40)); } }
  peds.scare(x, z, 45); if (byYou) crime(1.5, x, z); if (power >= 0.9) addFire(x, z);
  for (const t of traffic) if (Math.hypot(t.rx - x, t.rz - z) < r + 2) { t.stun = 6; t.speed = 0; spawnParticles(t.rx, 1.2, t.rz, ['#ff8a2a', '#333'], 8, 3, 0.8, 0.3, -1); }
  for (const v of vehicles) { const dx = v.s.x - x, dz = v.s.z - z, d = Math.hypot(dx, dz); if (d < r + 2 && !v.wrecked && d > 0.5) damageCar(v, 70 * (1 - d / (r + 2)), x, z, byYou); if (d < r + 2) { v.s.vx += dx / (d || 1) * 10; v.s.vz += dz / (d || 1) * 10; } }
  const f = focusPos(), d = Math.hypot(f.x - x, f.z - z);
  if (d < r) hurt((ride ? 30 : 70) * (1 - d / r));
}
function meleeHit(step = 0) {
  const fx = Math.sin(P.face), fz = Math.cos(P.face), bat = arsenal.cur === 'bat';
  const finisher = step === 3 || step === 'kick' || (bat && step === 2);
  const dmg = (bat ? 2 : 1) * (step === 2 ? 1.5 : finisher ? 2.5 : 1) * (1 + (lvl('strength') - 1) * 0.12) * (fxOn('pills') ? 1.6 : 1);
  const reach = ws.reach + (step === 'kick' ? 0.4 : 0);
  let hit = false;
  for (const p of peds.list) {
    const dx = p.x - P.x, dz = p.z - P.z, d = Math.hypot(dx, dz);
    if (d >= reach || (dx * fx + dz * fz) / (d || 1) <= 0.3 || p.state === 'down') continue;
    hit = true;
    const floored = peds.hit(p, fx, fz, dmg, ws.power * (finisher ? 1.4 : 0.6));
    spawnParticles(p.x, 1.4, p.z, ['#ffffff', '#ffd23f'], finisher ? 10 : 5, 3, 0.3, 0.08);
    if (floored) { if (Math.random() < 0.35) dropCash(p.x, p.z, 5 + Math.floor(Math.random() * 30)); peds.scare(p.x, p.z, 12); }
    else if (!p.angry && p.kind !== 'cop' && p.kind !== 'homeless' && (p.brave ??= Math.random() < 0.45)) { p.angry = true; p.angryT = 14; p.name ??= pick(NPC_NAMES); toast(`${p.name} fights back!`, 1.4); }
    else if (!p.angry && p.kind !== 'cop') peds.flee(p, P.x, P.z);
    if (p.kind === 'cop') crime(1.2); else { crime(floored ? 0.45 : 0.2); witness('fight', P.x, P.z, p); }
    if (p.state === 'talk') peds.release(p);
  }
  for (const t of traffic) if (Math.hypot(t.rx - P.x, t.rz - P.z) < reach + 1.4) { t.stun = 2; t.honk = 0; hit = true; }
  if (hit) { sfx.punch(); shake = Math.max(shake, finisher ? 0.3 : 0.12); navigator.vibrate?.(finisher ? 30 : 12); gainXP('strength', finisher ? 6 : 3); if (finisher) timeScale = 0.35, setTimeout(() => { if (timeScale === 0.35) timeScale = 1; }, 90); }
}
// ---------------- health
let time = 0, clockH = 8, dayN = 1, shake = 0, saveT = 0, toastT = 0, hurtFlash = 0, timeScale = 1;
const gameHours = () => dayN * 24 + clockH;
// every little message gets a picture that says what it's about
const TOAST_ICONS = [
  [/flush|toilet|relief|much better|restroom|pee\b|accident/i, 'toilet', '#2f80ed'], [/shower|bath|soak|rinse|water|squeaky|hygiene|stink|soap|hot tub|washed your hands/i, 'shower', '#38a8e8'],
  [/clean|fresh clothes|meadow|sharp|fresh cut|looking good|leaner|jumpsuit|recognise/i, 'sparkle', '#b26bff'], [/barber|haircut|\bcut\b/i, 'scissors', '#5d636e'],
  [/tv\b|remote|football on|watch/i, 'tv', '#3a3fbf'], [/read|book|paperback|chopsticks|play now|tune/i, 'book', '#2f80ed'], [/cocktail|drank|drunk|blacked out|bar\b/i, 'drink', '#ff6fb5'],
  [/carousel|wheel|ride\b|rode|view|dolphins|bay\b|fish/i, 'wave', '#1fb5a8'], [/teddy|plush|prize|winner!|flag\b/i, 'gift', '#ff8a2a'], [/rigged|so close|nope|try again|miss\b/i, 'cards', '#8b1e3f'],
  [/fare|taxi|downtown, and step|airport\?/i, 'taxi', '#ffd23f'], [/parcel|deliver|bin round|bins\b/i, 'box', '#c9a24a'], [/yard|pickup game|three on three|crossed up|hoops/i, 'ball', '#ff8a2a'],
  [/silence|chapel|lighter|quietly/i, 'church', '#c9a24a'], [/nap|rested|ward|kick back|energy restored/i, 'bed', '#9b51e0'], [/hands where|on the ground|stop right there|warrant|shoved past|run!/i, 'shield', '#2a5ad8'],
  [/dance|danc|mood up/i, 'music', '#ff3b8a'], [/woohoo/i, 'heart', '#ff3b8a'], [/telescope|blueprint|place\b/i, 'map', '#2f80ed'], [/walked away|walked out|left the|step outside|get out and walk/i, 'run', '#5d636e'],
  [/hunger|collapsed/i, 'food', '#ff8a2a'], [/out of time|tired of waiting/i, 'x', '#e23b3b'], [/kick-off|gates open/i, 'people', '#ff6fb5'], [/weapons inside|locker/i, 'gun', '#5d636e'], [/mouth shut|spoon|respects/i, 'lock', '#5d636e'], [/tattoo|laser|work done/i, 'edit', '#8b1e3f'], [/live here/i, 'house', '#9b51e0'],
  [/go!|3… 2…|arrived|on that job|shift started/i, 'flag', '#e0a010'], [/help|mugging|slapped|zapped|stung/i, 'hand', '#e23b3b'], [/sound|music off|updating/i, 'radio', '#5d636e'],
[/rain (has )?stopp|fog is lifting|clear(s|ed) up|sun('s| is) out|skies clear/i, 'sun', '#ffb020'], [/storm|thunder|lightning/i, 'storm', '#5a4abf'], [/rain|drizzl|pour/i, 'rain', '#2f80ed'], [/fog|mist/i, 'fog', '#7a8a9a'],
  [/police|cops?\b|arrest|wanted|patrol|spotted|ticket|sentence|cell|prison|guards|busted|search area/i, 'shield', '#2a5ad8'], [/turf|gang|kings|reds|blues|crew/i, 'fist', '#8b1e3f'], [/fire|smoke|burn/i, 'bolt', '#ff6a2a'],
  [/hospital|nurse|health|hurt|patched|doctor/i, 'cross', '#e23b3b'], [/love|engaged|girlfriend|kiss|wedding|baby|date\b|she /i, 'heart', '#ff3b8a'], [/grocer|food|burger|meal|sushi|smoothie|eat|fridge|hungry|dumpling|starving/i, 'food', '#ff8a2a'],
  [/alarm|robb|thief|stole|running off/i, 'cash', '#e23b3b'], [/gun|ammo|grenade|rocket|range|shiv/i, 'gun', '#5d636e'], [/\$|cash|paid|money|income|sold|bought|price|fine\b/i, 'cash', '#2fbf55'], [/car\b|drive|garage|customs|scoot|headlight|parked|race/i, 'car', '#ff8a2a'],
  [/home|house|storage|furniture|bed\b|sleep|edit mode/i, 'house', '#9b51e0'], [/class|school|college|study|enrol/i, 'book', '#2f80ed'], [/gym|workout|membership|weights/i, 'dumbbell', '#ff8a2a'],
  [/market|parade|protest|match|festival|fair/i, 'people', '#ff6fb5'], [/mission|story/i, 'flag', '#e0a010'], [/night|lights out|dark/i, 'moon', '#3a3fbf'], [/morning|new day|day\b/i, 'sun', '#ffb020'], [/phone|text|call/i, 'phone', '#2f80ed']];
function toastIcon(msg) { for (const [re, ic, col] of TOAST_ICONS) if (re.test(msg)) return [ic, col]; return ['chat', '#4a4f5a']; }
// levelling up: a gold card that bounces in, a little fanfare and confetti round you
function levelUp(skill, lvl2) {
  subs.note('sparkle', `LEVEL UP!`, `${skill} is now level ${lvl2}`, { cls: 'levelup', pri: 4, dur: 3.6 });
  const A = audio(); if (A) [523, 659, 784, 1047].forEach((f, i) => sfx.note(f, A.currentTime + i * 0.09, i === 3 ? 0.5 : 0.14, 'triangle', 0.06, 3200));
  if (!inside) spawnParticles(P.x, 2.2, P.z, ['#ffd23f', '#ff6fb5', '#38e8ff', '#4cd964', '#ffffff'], 26, 4, 1.4, 0.12, -2); else spawnParticles(P.x, 2.2, P.z, ['#ffd23f', '#ffffff'], 14, 3, 1.2, 0.1, -2);
  navigator.vibrate?.([30, 40, 30]);
}
function toast(msg, dur = 2.4) { const fm = typeof msg === 'string' && msg.match(/^([A-Z][\w.' ]{1,24}): "(.+?)"\s*(.*)$/); if (fm) { const w = faceFor(null, fm[1]); if (w) { subs.say(w, fm[2] + (fm[3] ? ` ${fm[3]}` : ''), { silent: true, expr: /!|love|yay|fun/i.test(fm[2]) ? 'happy' : 'neutral', pri: 2 }); return; } }
  if (typeof msg === 'string' && state !== 'talk') { const [ic, col] = toastIcon(msg); subs.note(ic, null, msg, { dur, color: col }); return; } // everything goes to the one notification spot
  const t = $('toast'); t.textContent = msg; t.classList.add('on'); toastT = dur; }
let noteT = 0;
function slotNote(icon, title, sub, dur = 4, cls = '') { subs.note(icon, title, sub || '', { dur, cls }); }
function slotSync() { $('hud').classList.toggle('slot', !$('subs').classList.contains('hidden')); }
function hurt(d) { if (P.dead || d <= 0) return; P.hp = Math.max(0, P.hp - d);
  if (P.hp <= 0 && WANT.stars && !stats.jail && time - (P.copHitT ?? -99) < 4 && nearestCop(P.x, P.z) < 45) { P.hp = maxHP() * 0.25; toast('You went down. The police cuffed you.', 2.5); if (ride) exitCar(); busted(); return; } // taken down by police = arrested, not the morgue
  P.hurtT = 0; hurtFlash = 0.35; shake = Math.max(shake, 0.3); navigator.vibrate?.(30); if (P.hp <= 0) die(); }
function die() {
  if (P.dead) return;
  P.dead = true; P.deadT = 3.2; if (ride) exitCar(); if (inside && !stats.jail) exitInterior(true); if (WANT.stars) clearWanted();
  const medic = hasDegree('nursing') || ['nurse', 'doctor'].includes(career()?.id), lost = medic ? 0 : Math.min(money, Math.round(300 + Math.min(money * 0.01, 2700))); // a flat-ish bill (max $3,000), not a cut of your fortune money -= lost; stats.mood = Math.max(0, stats.mood - 20);
  $('deathScreen').querySelector('span').textContent = stats.jail ? 'Waking up in the prison infirmary...' : `Hospital bill: ${fmt(lost)}. Waking up at Bay General...`;
  $('deathScreen').classList.add('on'); if (job) endJob('You blacked out. Shift over.');
}
const homePrice = p => Math.round(p.price * (hasDegree('realestate') ? 0.9 : 1));
function homeSpot() {
  let best = null, bd = 1e9;
  for (const p of PROPERTIES) if (owned.has(p.id)) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; best = p; } }
  return best ? { x: best.x, z: best.z, name: best.name } : { x: SPAWN.x, z: SPAWN.z, name: 'Downtown Clinic' };
}
function respawn() {
  fxReset();
  P.dead = false; P.hp = maxHP() * 0.8; P.hurtT = 99; P.kx = P.kz = 0; const starved = stats.hunger <= 1; stats.hunger = Math.max(stats.hunger, 45); stats.energy = Math.max(stats.energy, 40);
  heroRoot.visible = true; hero.root.rotation.x = 0;
  $('deathScreen').classList.remove('on');
  if (stats.jail) { // you stay locked up: the prison has its own infirmary
    if (inside?.id !== 'prison') { enterPrison(false); return; }
    const w = inside.h.toWorld(17, 24.4); P.x = w.x; P.z = w.z; P.face = Math.PI; P.y = 0; updateCamera(0, true);
    toast(starved ? 'You collapsed from hunger. Nurse Ortega put you on a drip. Eat at the canteen!' : 'You woke up in the prison infirmary. Still locked up.', 4); return;
  }
  const h = PLACES.find(q => q.id === 'v_hospital');
  Object.assign(P, { x: h.x, z: h.z, face: 0 }); P.y = baseY(P.x, P.z);
  enterInterior(h);
  setTimeout(() => { if (inside?.id !== 'hospital') return; const w = inside.h.toWorld(0.5, -3.8); P.x = w.x; P.z = w.z; P.face = Math.PI; toast(starved ? 'You collapsed from hunger. The hospital put you on a drip. Eat properly!' : 'You woke up in Bay General Hospital.', 4); }, 400);
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
function baseY(x, z, py) { if (inside) return 0; if (x < -290) { const cr = canyonAt(x, z); if (cr) return cr.y; } { const k = skyAt(x, z); if (k && (k.ramp || (py ?? 0) > k.y - 1.6)) return k.y; } if (onPier(x, z)) return 0.28; { const r = roadAt(x, z); if (r) return r.city ? 0.04 : roadY(x, z); } if (cityAt(x, z, -6)) return 0.17; return groundH(x, z); }
function swimmable(x, z) { return x > WORLD.x0 + 22 && x < WORLD.x1 - 8 && z < WORLD.z1 - 2 && groundH(x, z) - dip(x, z) < WATER_Y; }
function inWater(x, z) { return !inside && !onPier(x, z) && groundH(x, z) - dip(x, z) < WATER_Y - 0.9; }
function nearLadder() { if (inside || ride) return null; for (const L of LADDERS) { if (Math.abs(L.x - P.x) > 20 || Math.abs(L.z - P.z) > 20) continue; const bot = Math.hypot(L.x - P.x, L.z - P.z) < 1.3 && P.y < 1.5, top = Math.hypot(L.x - L.nx * 1.2 - P.x, L.z - L.nz * 1.2 - P.z) < 1.4 && Math.abs(P.y - L.top) < 0.6; if (bot || top) return { L, top }; } return null; }
function updateLadder(dt, st0) {
  const st = input.stick; // raw stick: up always climbs, whichever way the camera faces
  const L = P.ladder; P.x = L.x + L.nx * 0.35; P.z = L.z + L.nz * 0.35; P.face = Math.atan2(-L.nx, -L.nz);
  P.y = clamp(P.y + st.y * 2.4 * dt, 0.17, L.top); // stick up climbs up, stick down climbs down
  P.phase += Math.abs(st.y) * dt * 6;
  hero.armR.pivot.rotation.set(-2.6 + Math.sin(P.phase) * 0.4, 0, 0.1); hero.armL.pivot.rotation.set(-2.6 - Math.sin(P.phase) * 0.4, 0, -0.1);
  hero.legL.pivot.rotation.x = -0.6 + Math.sin(P.phase) * 0.5; hero.legR.pivot.rotation.x = -0.6 - Math.sin(P.phase) * 0.5;
  if (P.y >= L.top - 0.02 && st.y > 0.3) { P.ladder = null; P.x = L.x - L.nx * 1.2; P.z = L.z - L.nz * 1.2; P.y = L.top; P.fallFrom = undefined; }
  else if (P.y <= 0.18 && st.y < -0.3) { P.ladder = null; P.x = L.x + L.nx * 1.0; P.z = L.z + L.nz * 1.0; P.y = baseY(P.x, P.z); }
  if (input.consume('a')) { P.ladder = null; P.fallFrom = P.y; P.x += L.nx * 0.8; P.z += L.nz * 0.8; }
  for (const k of ['b', 'x', 'y']) input.consume(k);
  heroRoot.position.set(P.x, P.y, P.z); hero.root.rotation.y = P.face;
}
function canWalk(x, z) { return inside ? inside.h.inside(x, z) : walkable(x, z) || swimmable(x, z); }
// cars as boxes: which car is next to a point, and the roof height of any car under a point (you can stand on cars)
function carBox(v, x, z) {
  const h = v.s.h, fx = Math.sin(h), fz = Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h), dx = x - v.s.x, dz = z - v.s.z;
  return { v, fx, fz, rx, rz, lx: dx * rx + dz * rz, lz: dx * fx + dz * fz, hw: v.b.width / 2, hl: v.b.length / 2, top: (v.s.y || 0) + v.b.height * (v.b.two ? 0.6 : 1) };
}
const trafProxy = t => t.proxy ||= { s: {}, b: { width: t.lib.wid || 1.9, length: t.lib.len || 4.4, height: 1.45 } };
function carsAround() { const out = [...vehicles]; for (const t of traffic) { const q = trafProxy(t); Object.assign(q.s, { x: t.rx, z: t.rz, h: t.rh, y: t.y ?? 0 }); out.push(q); } return out; } // parked/driven cars + traffic
function carNear(x, z, reach = 1.3, y = P.y) {
  let best = null;
  for (const v of carsAround()) { if (v === ride || (v.s.x - x) ** 2 + (v.s.z - z) ** 2 > 64 || Math.abs((v.s.y || 0) - y) > 2.2) continue; const B = carBox(v, x, z); const d = Math.max(Math.abs(B.lx) - B.hw, Math.abs(B.lz) - B.hl); if (d < reach && (!best || d < best.d)) { B.d = d; best = B; } }
  return best;
}
function carTop(x, z, y) {
  let t = -99;
  for (const v of carsAround()) { if (v === ride || (v.s.x - x) ** 2 + (v.s.z - z) ** 2 > 64 || y > (v.s.y || 0) + 4) continue; const B = carBox(v, x, z); if (Math.abs(B.lx) < B.hw - 0.05 && Math.abs(B.lz) < B.hl - 0.1 && y >= B.top - 0.5) t = Math.max(t, B.top); }
  return t;
}
// ---------------- toilet: sit, relief. Hold it too long and you have an accident (and need a shower)
function useToilet(x, z, r) {
  P.sit = { x, z, face: r, t: 0, toilet: true }; P.face = r; sfx.click();
  setTimeout(() => { if (P.sit?.toilet) { P.sit = null; stats.bladder = 100; P.y = 0; hero.hips.position.y = hero.legLen; for (const L of [hero.legL, hero.legR]) { L.pivot.rotation.x = 0; L.knee.rotation.x = 0; } toast(pick(['Ahh. Much better.', 'Relief.', '*flush*']), 2); } }, 2200);
}
let accidentCd = 0;
async function bladderAccident() {
  if (accidentCd > time || talk.active || state !== 'play' || woo || dance) return; accidentCd = time + 30;
  const poo = Math.random() < 0.3;
  stats.bladder = 100; stats.hygiene = 0; feed({ mood: poo ? -28 : -18 });
  if (!ride) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.55, 18), new THREE.MeshBasicMaterial({ color: poo ? '#6b4a2a' : '#e8d34a', transparent: true, opacity: 0.75, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(P.x, (inside ? 0 : baseY(P.x, P.z)) + 0.02, P.z); dyn.add(m); setTimeout(() => dyn.remove(m), 60000); }
  else ride.smelly = true;
  for (const p of peds.list) if (Math.hypot(p.x - P.x, p.z - P.z) < 14 && p.state !== 'down') { const pr = personOf(p); if (pr) bumpPerson(pr, -4); react(p, false); }
  if (date) { date.interest -= 25; }
  beginTalk(charCfg, 'You', 'Uh oh', 200, null, null, null, true);
  await talk.say(poo ? pick(['Oh no. Oh no no no.', 'That was NOT just a fart.']) : pick(['I... didn\'t make it.', 'Oh no. I really should have gone earlier.']));
  await talk.say(poo ? 'Everyone is staring. I need a shower. Immediately.' : 'Soaked. I need a shower and a change of clothes.');
  endTalk();
  if (date) toast(`${date.name}: "${pick(['Ew. EW. I\'m going home.', 'Did you just...? Okay, I\'m leaving.'])}"`, 3), endDate();
}
// ---------------- showers (home, gym, prison): step in, steam, Sims-style pixel blur, come out clean
let showerTex = null, carLabelT = 0;
function startShower(x, z, r, prison = false, bath = false) {
  if (P.shower) return;
  if (!showerTex) { const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d'); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = ['#e8b088', '#d39a6a', '#f6c9a4', '#b77a4b', '#c98f62'][(i * 3 + j * 5) % 5]; g.fillRect(i, j, 1, 1); } showerTex = new THREE.CanvasTexture(c); showerTex.magFilter = THREE.NearestFilter; showerTex.minFilter = THREE.NearestFilter; }
  const blur = new THREE.Sprite(new THREE.SpriteMaterial({ map: showerTex, depthTest: false })); blur.scale.set(0.62, 0.62, 1); dyn.add(blur);
  P.shower = { t: 0, x, z, r, blur, prison, bath, dur: bath ? 5.5 : prison ? 3.2 : 4 }; P.x = x; P.z = z; P.face = bath ? r + Math.PI / 2 : r + Math.PI; if (bath) blur.scale.set(0.95, 0.75, 1); sfx.whoosh?.();
}
function updateShower(dt) {
  const S = P.shower; S.t += dt;
  if (S.bath) { // lying back in the tub, arms on the rim, bubbles everywhere, the naughty bits pixelated
    const fx = Math.sin(P.face), fz = Math.cos(P.face), bx = S.x + fx * 0.72, bz = S.z + fz * 0.72; // feet at the tap end, lying back along the tub
    heroRoot.position.set(bx, 0.3, bz); hero.root.rotation.order = 'YXZ'; hero.root.rotation.set(-1.3, P.face, 0);
    poseCharacter(hero, { phase: 0, speed: 0, air: false, aim: -0.55, recoil: 0, t: time });
    hero.legL.pivot.rotation.x = -0.35; hero.legR.pivot.rotation.x = -0.35; hero.legL.knee.rotation.x = 0.5; hero.legR.knee.rotation.x = 0.5;
    hero.armR.pivot.rotation.set(-0.2, 0, 1.2); hero.armL.pivot.rotation.set(-0.2, 0, -1.2); hero.head.rotation.x = 0.5 + Math.sin(S.t * 0.8) * 0.05;
    S.blur.position.set(S.x - fx * 0.05, 0.75, S.z - fz * 0.05); S.blur.visible = Math.floor(S.t * 10) % 7 !== 0;
    if (Math.random() < dt * 10) spawnParticles(S.x + rand(-0.6, 0.6), 0.65, S.z + rand(-0.3, 0.3), ['#ffffff', '#dff2ff', '#f4fbff'], 1, 0.3, 1.6, 0.18, -0.2);
  } else {
  P.x = S.x; P.z = S.z; heroRoot.position.set(P.x, 0.08, P.z); hero.root.rotation.set(0, P.face, 0);
  poseCharacter(hero, { phase: 0, speed: 0, air: false, aim: -0.55, recoil: 0, t: time });
  hero.armR.pivot.rotation.set(-2.6 + Math.sin(S.t * 9) * 0.3, 0, 0.3); hero.armL.pivot.rotation.set(-2.6 - Math.sin(S.t * 9) * 0.3, 0, -0.3); hero.head.rotation.x = -0.3;
  S.blur.position.set(P.x, hero.legLen + 0.12, P.z); S.blur.visible = Math.floor(S.t * 10) % 7 !== 0;
  if (Math.random() < dt * 22) spawnParticles(P.x + rand(-0.4, 0.4), 2.2, P.z + rand(-0.4, 0.4), ['#ffffff', '#dff2ff', '#e8f4ff'], 1, 0.6, 1.2, 0.3, 0.6);
  }
  for (const k of ['a', 'b', 'x', 'y']) input.consume(k);
  if (S.t >= S.dur || input.stick.m > 0.6 && S.t > 0.8) {
    dyn.remove(S.blur); S.blur.material.dispose(); P.shower = null; hero.head.rotation.x = 0; hero.root.rotation.set(0, P.face, 0);
    const full = S.t >= S.dur; stats.hygiene = full ? 100 : Math.max(stats.hygiene ?? 0, 60); feed({ mood: full ? (S.bath ? 12 : 5) : 2, energy: S.bath && full ? 6 : 0 }); advanceTime(full ? (S.bath ? 0.75 : 0.25) : 0.1);
    if (S.bath) { P.x = S.x + Math.sin(S.r) * 1.0; P.z = S.z + Math.cos(S.r) * 1.0; const her = homePartnerNear(); toast(full ? (her ? `A long hot bath. ${her} brought you a glass of wine.` : 'A long hot bubble bath. You feel brand new.') : 'Quick soak.', 2.6); return; }
    P.x = S.x + Math.sin(S.r) * 1.1; P.z = S.z + Math.cos(S.r) * 1.1;
    toast(S.prison ? pick(['Cold water, thin soap, no privacy. But clean.', 'Five minutes of lukewarm water. Better than nothing.']) : full ? 'Squeaky clean. Hygiene full.' : 'Quick rinse.', 2.4);
  }
}
function updateFoot(dt) {
  if (P.shower) return updateShower(dt);
  if (P.sit) { // sitting on a sofa / armchair: relax until you move
    const S = P.sit; S.t += dt;
    if (input.stick.m > 0.35 || (!P.sit.tv && input.consume('a')) || input.consume('b') || P.dead) { P.sit = null; P.y = 0; hero.hips.position.y = hero.legLen; for (const L of [hero.legL, hero.legR]) { L.pivot.rotation.x = 0; L.knee.rotation.x = 0; } }
    else {
      P.x = S.x; P.z = S.z; P.face = S.face;
      heroRoot.position.set(P.x, 0, P.z); hero.root.rotation.set(0, P.face, 0);
      hero.hips.position.y = 0.5; // seat height
      for (const L of [hero.legL, hero.legR]) { L.pivot.rotation.x = -1.5; L.knee.rotation.x = 1.5; }
      hero.armL.pivot.rotation.set(-0.35, 0, -0.25); hero.armR.pivot.rotation.set(-0.35, 0, 0.25);
      hero.head.rotation.y = Math.sin(S.t * 0.4) * 0.3;
      if (Math.floor(S.t / 6) !== Math.floor((S.t - dt) / 6)) feed({ mood: 2, energy: 2 }); // slowly recharges
      return;
    }
  }
  const st = P.dead ? { x: 0, y: 0, m: 0 } : camStick();
  P.x += P.kx * dt; P.z += P.kz * dt; P.kx = damp(P.kx, 0, 4, dt); P.kz = damp(P.kz, 0, 4, dt);
  const tired = stats.energy < 10 ? 0.7 : 1, runMul = 1 + (lvl('stamina') - 1) * 0.035;
  const swim = inWater(P.x, P.z) && P.y < WATER_Y + 0.2;
  if (P.ladder) return updateLadder(dt, st);
  const sp = (swim ? 2.6 : st.m > 0.85 ? 7.2 * runMul : 4.6) * st.m * (swim ? 1 : ws.mob || 1) * tired * (inside ? 0.8 : 1) * (P.leap ? 1.55 : 1) * (1 - body().fat * 0.15), ox = P.x, oz = P.z; // running jumps carry you further; extra weight slows you
  if (st.m > 0.1) { const wob = Math.sin(time * 1.4) * Math.min(1, FX.drunk) * 0.7, mx0 = st.x / st.m, mz0 = -st.y / st.m, mx = mx0 * Math.cos(wob) - mz0 * Math.sin(wob), mz = mx0 * Math.sin(wob) + mz0 * Math.cos(wob); P.x += mx * sp * fxSpeed() * dt; P.z += mz * sp * fxSpeed() * dt; P.face += wrapA(Math.atan2(mx, mz) - P.face) * (1 - Math.exp(-14 * dt)); }
  resolve(P, 0.4, Math.max(0, P.y - baseY(P.x, P.z, P.y)));
  if (!inside && !P.vault && !P.climb) for (const t of traffic) { // traffic cars are solid too
    if (Math.abs((t.y ?? 0.04) - P.y) > 2.5) continue;
    if ((t.rx - P.x) ** 2 + (t.rz - P.z) ** 2 > 36) continue;
    const fx = Math.sin(t.rh), fz = Math.cos(t.rh), rx = Math.cos(t.rh), rz = -Math.sin(t.rh), dx = P.x - t.rx, dz = P.z - t.rz;
    const lx = dx * rx + dz * rz, lz = dx * fx + dz * fz, hw = (t.lib.wid || 1.9) / 2 + 0.32, hl = (t.lib.len || 4.4) / 2 + 0.28;
    if (Math.abs(lx) >= hw || Math.abs(lz) >= hl) continue;
    const px = hw - Math.abs(lx), pz = hl - Math.abs(lz);
    if (px < pz) { const k = Math.sign(lx || 1) * px; P.x += rx * k; P.z += rz * k; } else { const k = Math.sign(lz || 1) * pz; P.x += fx * k; P.z += fz * k; }
  }
  if (!inside) for (const v of vehicles) { // cars block you (as a solid box, no gaps); press jump next to one to vault it
    if ((v.s.x - P.x) ** 2 + (v.s.z - P.z) ** 2 > 49 || v === ride || P.vault || P.climb || P.y >= (v.s.y || 0) + v.b.height - 0.15) continue;
    const h = v.s.h, fx = Math.sin(h), fz = Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h), dx = P.x - v.s.x, dz = P.z - v.s.z;
    const lx = dx * rx + dz * rz, lz = dx * fx + dz * fz, hw = v.b.width / 2 + 0.32, hl = v.b.length / 2 + 0.28;
    if (Math.abs(lx) >= hw || Math.abs(lz) >= hl) continue;
    const px = hw - Math.abs(lx), pz = hl - Math.abs(lz);
    if (px < pz) { const k = Math.sign(lx || 1) * px; P.x += rx * k; P.z += rz * k; } else { const k = Math.sign(lz || 1) * pz; P.x += fx * k; P.z += fz * k; }
  }
  for (const p of peds.list) { const dx = P.x - p.x, dz = P.z - p.z, d = Math.hypot(dx, dz); if (d < 0.7 && d > 0.01 && p.state !== 'down') { if (p.kind === 'homeless' || p.state === 'lie' || p.state === 'sit' || p.state === 'talk') { P.x = p.x + dx / d * 0.7; P.z = p.z + dz / d * 0.7; } else { p.x -= dx / d * (0.7 - d); p.z -= dz / d * (0.7 - d); if (input.stick.m > 0.45 && !(p.hitT > 0) && (p.bargeT || 0) < time) { p.bargeT = time + 0.8; const pw = input.stick.m > 0.85 ? 4.2 : 2; p.hitT = 0.38; p.hkx = -dx / d * pw; p.hkz = -dz / d * pw; if (pw > 3) { sfx.thud?.(); p.inner.rotation.x = -0.35; } } if (input.stick.m > 0.8 && !p.ev && (p.bumpT || 0) < time && Math.random() < 0.5 && chatCd('bump', 6)) { p.bumpT = time + 20; const w = pedWho(p); if (w) subs.say(w, pick(['Hey! Watch it!', 'Excuse YOU.', 'Woah, where\'s the fire?', 'Rude!']), { expr: 'angry', pri: 1 }); } } } } // you can't shove someone sleeping on the pavement
  for (const n of allNpcs()) { if (n.hidden || (n.y || 0) > P.y + 1.5 || (n.y || 0) < P.y - 1.5) continue; const dx = P.x - n.x, dz = P.z - n.z, d = Math.hypot(dx, dz); if (d < 0.75 && d > 0.01) { P.x = n.x + dx / d * 0.75; P.z = n.z + dz / d * 0.75; } }
  if (!canWalk(P.x, P.z)) { P.x = ox; P.z = oz; }
  if (inside?.id === 'prison' && stats.jail && P.z > ORIGIN.z + 17.4 && Math.abs(P.x - ORIGIN.x) < 10.2 && P.z < ORIGIN.z + 19) { P.z = ORIGIN.z + 17.4; if (time > gateT) { gateT = time + 3; toast(`Security gate. Locked. ${hrs(jailLeft())} left.`); } }
  if (inside && P.z > ORIGIN.z + inside.h.d / 2 - (inside.id === 'prison' ? 0.6 : -0.35)) { if (stats.jail && inside.id === 'prison') { P.z = ORIGIN.z + inside.h.d / 2 - 0.6; if (time > gateT) { gateT = time + 3; toast(`The gate is locked. ${hrs(jailLeft())} left.`); } } else { exitInterior(); return; } }
  const gy = swim ? WATER_Y - 1.05 : inside ? (inside.h.floorY ? inside.h.floorY(P.x, P.z, P.y) : 0) : Math.max(baseY(P.x, P.z, P.y), roofAt(P.x, P.z, P.y), carTop(P.x, P.z, P.y));
  if (editMode) { updateEdit(dt); }
  else {
    if (input.consume('b') && P.y <= gy + 0.01 && !P.dead && !swim) {
      // jump next to a car: slide over a low bonnet, or grab the roof of anything tall and climb up on it
      const B = !inside && P.y < gy + 0.3 ? carNear(P.x, P.z) : null, side = B && Math.abs(B.lx) - B.hw > Math.abs(B.lz) - B.hl;
      if (B && B.top - gy > 1.75) { // van, truck, SUV: grab the edge and pull yourself onto the roof
        const ix = clamp(B.lx, -B.hw + 0.5, B.hw - 0.5), iz = clamp(B.lz, -B.hl + 0.6, B.hl - 0.6);
        P.climb = { t: 0, x0: P.x, z0: P.z, y0: P.y, x1: B.v.s.x + B.rx * ix + B.fx * iz, z1: B.v.s.z + B.rz * ix + B.fz * iz, y1: B.top }; P.face = Math.atan2(P.climb.x1 - P.x, P.climb.z1 - P.z); sfx.click();
      } else if (B && side) { // slide across the bonnet to the other side
        const sg = Math.sign(B.lx || 1), out = B.hw + 0.6, lz = clamp(B.lz, -B.hl + 0.5, B.hl - 0.5);
        const x1 = B.v.s.x - B.rx * sg * out + B.fx * lz, z1 = B.v.s.z - B.rz * sg * out + B.fz * lz;
        P.vault = { t: 0, x0: P.x, z0: P.z, x1, z1, y0: P.y, top: B.top - 0.35, sg }; P.face = Math.atan2(x1 - P.x, z1 - P.z); sfx.whoosh();
      } else { P.vy = B ? 7 : fxJump() * (input.stick.m > 0.85 ? 1.12 : 1); P.fallFrom = P.y; P.leap = (!!B || input.stick.m > 0.85) && !inside; if (P.leap) sfx.whoosh(); }
    } // sprint + jump = long jump (rooftop gaps)
    // grab a ledge: jumping into a wall whose top is within reach pulls you up onto it
    if (!inside && P.y > gy + 0.2 && !P.climb) { const fx = Math.sin(P.face), fz = Math.cos(P.face), t = wallTop(P.x + fx * 0.75, P.z + fz * 0.75); if (t !== null && t - P.y > 0.2 && t - P.y < 2.4) { P.climb = { t: 0, x0: P.x, z0: P.z, y0: P.y, x1: P.x + fx * 1.0, z1: P.z + fz * 1.0, y1: t }; P.vy = 0; sfx.click(); } }
    // ---- weapon use (holstered indoors)
    P.fireCd -= dt; P.burstT -= dt; P.recoil = Math.max(0, P.recoil - dt * 4); P.swing = Math.max(0, P.swing - dt);
    const a = am(), kind = (inside && inside.id !== 'prison') || swim ? 'none' : ws.kind, firing = !P.dead && input.held('x');
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
      // combos: keep tapping for jab, jab, hook, uppercut (bat: swing, backhand, overhead). Y = draw your gun
      if (input.consume('y')) { const g = sideGun(); if (g) { selectWeapon(g); sfx.equip?.(); } else toast('No gun yet. Bay Arms sells them.'); }
      const kick = false;
      if ((input.consume('x') || kick) && P.fireCd <= 0 && !P.dead) {
        { const prev = P.combo === 'kick' ? 4 : (P.combo || 0); P.combo = time - (P.lastHit || -9) < 0.75 ? (prev + 1) % (arsenal.cur === 'bat' ? 3 : 5) : 0; if (arsenal.cur === 'fist' && P.combo === 4) P.combo = 'kick'; } // keep tapping: jab, jab, hook, uppercut, KICK
        { let best = null, bd = 3.4; for (const q of peds.list) { if (q.state === 'down') continue; const dx = q.x - P.x, dz = q.z - P.z, d = Math.hypot(dx, dz); if (d < bd && (q.angry || d < 2.2 || Math.abs(wrapA(Math.atan2(dx, dz) - P.face)) < 2)) { bd = d; best = q; } } if (best) P.face = Math.atan2(best.x - P.x, best.z - P.z); } // lock on to the nearest fighter
        P.lastHit = time; P.swingDur = P.combo === 'kick' ? 0.42 : P.combo === 3 ? 0.36 : 0.24; P.swing = P.swingDur; P.swingHit = false; P.fireCd = P.combo === 'kick' ? 0.45 : arsenal.cur === 'bat' ? 0.38 : 0.2; sfx.whoosh();
      }
      if (P.swing > 0 && P.swing < P.swingDur * 0.55 && !P.swingHit) { P.swingHit = true; meleeHit(P.combo); }
    } else if (kind === 'grenade') {
      input.consume('y');
      if (input.consume('x') && P.fireCd <= 0 && !P.dead) { if (a.res > 0) { P.swing = 0.35; P.swingHit = false; P.fireCd = 1 / ws.rof; } else { sfx.fail(); toast('No grenades. Buy some at Bay Arms.'); } }
      if (P.swing > 0 && P.swing < 0.2 && !P.swingHit) { P.swingHit = true; throwGrenade(); if (a.res <= 0) toast('Out of grenades'); }
    } else { if (input.consume('y') && inside?.prop && !editMode && !P.sit) startEdit(); }
    input.consume('x');
    if (input.consume('a') && !P.dead) { if (action) doAction(action); else openPhone(); }
  }
  // ---- pose
  const moved = Math.hypot(P.x - ox, P.z - oz) / Math.max(dt, 1e-4);
  if (moved > 6.5 && !inside) { P.runDist += moved * dt; if (P.runDist > 60) { P.runDist = 0; gainXP('stamina', 2); } }
  P.phase += dt * (moved < 5.5 ? moved * 1.55 : moved * 1.8); // cadence follows ground speed
  if (P.vault) { // sliding across a bonnet on your side, one hand down
    const V = P.vault; V.t += dt / 0.48; const k = Math.min(1, V.t), e = k * k * (3 - 2 * k), up = Math.sin(k * Math.PI);
    P.x = V.x0 + (V.x1 - V.x0) * e; P.z = V.z0 + (V.z1 - V.z0) * e; P.y = V.y0 + Math.max(0, V.top - V.y0) * Math.min(1, up * 1.6);
    hero.root.rotation.z = up * 1.15 * V.sg; poseCharacter(hero, { phase: 0, speed: 0, air: true, aim: -0.55, recoil: 0, t: time });
    hero.armL.pivot.rotation.set(-0.2, 0, -0.9 * up); hero.armR.pivot.rotation.set(-1.6 * up, 0, 0.3);
    if (k >= 1) { P.vault = null; hero.root.rotation.z = 0; P.y = gy; P.vy = 0; }
    heroRoot.position.set(P.x, P.y, P.z); hero.root.rotation.y = P.face; return;
  }
  if (P.climb) { // pulling yourself up onto a ledge
    const C = P.climb; C.t += dt / 0.55; const k = Math.min(1, C.t);
    P.y = C.y0 + (C.y1 - C.y0) * Math.min(1, k * 1.6); if (k > 0.5) { P.x = C.x0 + (C.x1 - C.x0) * (k - 0.5) * 2; P.z = C.z0 + (C.z1 - C.z0) * (k - 0.5) * 2; }
    hero.armR.pivot.rotation.set(-2.8 + k * 1.5, 0, 0.1); hero.armL.pivot.rotation.set(-2.8 + k * 1.5, 0, -0.1);
    if (k >= 1) { P.climb = null; P.y = C.y1; P.vy = 0; P.fallFrom = P.y; }
    heroRoot.position.set(P.x, P.y, P.z); hero.root.rotation.y = P.face; return;
  }
  const wasAir = P.y > gy + 0.05;
  if (wasAir && P.fallFrom === undefined) P.fallFrom = P.y;
  if (swim) { P.vy = 0; P.y = damp(P.y, gy, 6, dt); stats.energy = Math.max(0, stats.energy - dt * 0.04); if (stats.energy <= 0) hurt(dt * 3); }
  else { P.vy -= fxGrav() * dt; P.y += P.vy * dt; }
  if (P.y <= gy && !swim) {
    if (P.fallFrom !== undefined) { const fall = P.fallFrom - gy, roll = input.stick.m > 0.6 && fall < 9; if (roll && fall > 2.5) { P.roll = 0.45; sfx.whoosh(); } if (fall > (roll ? 9 : 5.5) && !inWater(P.x, P.z)) { hurt((fall - (roll ? 9 : 5.5)) * 8); sfx.thud(); shake = 0.3; } }
    P.leap = false;
    P.y = gy; P.vy = 0; P.fallFrom = undefined;
  }
  if (swim && P.fallFrom !== undefined) { if (P.fallFrom - P.y > 1.2) { spawnParticles(P.x, WATER_Y + 0.2, P.z, ['#ffffff', '#bfe8ff'], 18, 4, 0.6, 0.12, 8); sfx.whoosh(); } P.fallFrom = undefined; }
  heroRoot.position.set(P.x, P.y, P.z); hero.root.rotation.y = P.face;
  const diving = P.y > gy + 1.5 && P.vy < -2 && (inWater(P.x, P.z) || swimmable(P.x, P.z) && !walkable(P.x, P.z));
  hero.root.rotation.x = P.dead ? damp(hero.root.rotation.x, -Math.PI / 2, 8, dt) : swim ? damp(hero.root.rotation.x, 1.25, 6, dt) : diving ? damp(hero.root.rotation.x, 2.6, 5, dt) : 0;
  hero.root.rotation.order = 'YXZ';
  if (P.roll > 0) { P.roll -= dt; const k = 1 - Math.max(0, P.roll) / 0.45; hero.root.rotation.x = k * Math.PI * 2; heroRoot.position.y += Math.sin(k * Math.PI) * 0.35; } // forward roll on landing
  else if (P.leap && P.y > gy + 0.3) hero.root.rotation.x = 0.35; // lean into a long jump / vault
  const kind = inside && inside.id !== 'prison' ? 'none' : ws.kind, firing = input.held('x');
  const gunReady = (kind === 'gun' || kind === 'rpg') && (firing || P.fireCd > -0.6);
  if (heroW) heroW.group.visible = !inside;
  hero.torso.rotation.set(0, 0, 0); hero.hips.position.y = hero.legLen; hero.legL.knee.rotation.x = 0; hero.legR.knee.rotation.x = 0;
  poseCharacter(hero, { phase: P.phase, speed: moved < 0.2 ? 0 : Math.min(1, 0.45 + moved / 9), air: P.y > gy + 0.05, aim: gunReady ? 0 : -0.55, recoil: P.recoil, t: time });
  if (swim) { const ph = time * 5; hero.armR.pivot.rotation.set(-ph % (Math.PI * 2), 0, 0.1); hero.armL.pivot.rotation.set(-(ph + Math.PI) % (Math.PI * 2), 0, -0.1); hero.legL.pivot.rotation.x = Math.sin(ph * 2) * 0.4; hero.legR.pivot.rotation.x = -Math.sin(ph * 2) * 0.4; if (moved > 0.5 && Math.random() < dt * 8) spawnParticles(P.x, WATER_Y + 0.1, P.z, '#ffffff', 1, 1, 0.5, 0.1, 2); }
  else if (kind !== 'gun' && kind !== 'rpg') {
    const sw = Math.sin(P.phase) * Math.min(1, moved / 5) * 0.6;
    hero.armL.pivot.rotation.set(sw, 0, -0.08);
    if (P.swing > 0 && (kind === 'melee' || kind === 'grenade')) {
      const k = 1 - P.swing / (kind === 'grenade' ? 0.35 : 0.3);
      if (kind === 'grenade') hero.armR.pivot.rotation.set(k < 0.5 ? 0.9 + k * 1.2 : 1.5 - (k - 0.5) * 6.4, 0, 0.1);
      else {
        const kk = 1 - P.swing / (P.swingDur || 0.3), pk = Math.sin(kk * Math.PI), st = P.combo;
        // whole-body punches: snap the hips and shoulders round, step into it, bob the head
        const snap = kk < 0.35 ? kk / 0.35 : 1 - (kk - 0.35) / 0.65, fx = Math.sin(P.face), fz = Math.cos(P.face);
        const lunge = (st === 2 ? 0.22 : st === 3 ? 0.12 : st === 'kick' ? -0.05 : 0.32) * snap;
        heroRoot.position.x += fx * lunge; heroRoot.position.z += fz * lunge;
        hero.legL.pivot.rotation.x = -0.45 * snap; hero.legR.pivot.rotation.x = 0.35 * snap; // stagger: lead leg forward
        hero.head.rotation.x = 0.12 * snap;
        if (arsenal.cur === 'bat') { hero.armR.pivot.rotation.set(st === 2 ? -2.6 + kk * 2.4 : -1.6, st === 2 ? 0 : st === 1 ? -1.2 + kk * 2.6 : 1.2 - kk * 2.6, 0.2); hero.armL.pivot.rotation.set(-1.4, 0, -0.4); hero.torso.rotation.y = st === 2 ? 0 : (st === 1 ? -1 : 1) * (0.9 - kk * 1.8); }
        else if (st === 'kick') { hero.legR.pivot.rotation.x = -1.7 * pk; hero.legR.knee.rotation.x = 0.6 * (1 - pk); hero.legL.pivot.rotation.x = 0.2 * pk; hero.torso.rotation.x = -0.35 * pk; hero.armR.pivot.rotation.set(-0.3, 0, 0.9 * pk); hero.armL.pivot.rotation.set(-0.3, 0, -0.9 * pk); heroRoot.position.y += 0.06 * pk; }
        else if (st === 1) { hero.armL.pivot.rotation.set(-1.6 * snap, 0, -0.1); hero.armR.pivot.rotation.set(-1.1, 0, 0.3); hero.torso.rotation.y = 0.45 * snap; hero.torso.rotation.x = 0.12 * snap; }
        else if (st === 2) { hero.armR.pivot.rotation.set(-1.45, 1.1 - kk * 2.2, 0.75); hero.armL.pivot.rotation.set(-1.1, 0, -0.3); hero.torso.rotation.y = 0.7 - kk * 1.5; hero.torso.rotation.x = 0.1; }
        else if (st === 3) { const crouch = kk < 0.4 ? kk / 0.4 : Math.max(0, 1 - (kk - 0.4) * 3); hero.hips.position.y = hero.legLen - 0.16 * crouch; hero.legL.knee.rotation.x = 0.7 * crouch; hero.legR.knee.rotation.x = 0.7 * crouch; heroRoot.position.y += kk > 0.4 ? 0.14 * pk : 0; hero.armR.pivot.rotation.set(0.5 - kk * 3.1, 0, 0.12); hero.armL.pivot.rotation.set(-1.1, 0, -0.3); hero.torso.rotation.x = kk > 0.4 ? -0.3 * pk : 0.25 * crouch; hero.torso.rotation.y = -0.25 * pk; }
        else { hero.armR.pivot.rotation.set(-1.6 * snap, 0, 0.1); hero.armL.pivot.rotation.set(-1.1, 0, -0.3); hero.torso.rotation.y = -0.45 * snap; hero.torso.rotation.x = 0.12 * snap; }
      }
    } else if (kind === 'melee' && time - (P.lastHit || -9) < 1.2) { const bob = Math.sin(time * 9) * 0.04; hero.armR.pivot.rotation.set(-1.1 + bob, 0, 0.3); hero.armL.pivot.rotation.set(-1.2 - bob, 0, -0.3); hero.torso.rotation.y = -0.25; hero.legL.pivot.rotation.x = -0.25; hero.legR.pivot.rotation.x = 0.2; heroRoot.position.y += Math.abs(bob); } // fighting stance: guard up, bouncing
    else hero.armR.pivot.rotation.set(-sw, 0, 0.08);
  }
  if (P.reload > 0 && ws.reload) { const k = Math.sin(Math.min(1, 1 - P.reload / ws.reload) * Math.PI); hero.armR.pivot.rotation.x += k * 0.9; hero.armL.pivot.rotation.x += k * 1.2; }
  heroRoot.updateMatrixWorld(true);
  P.flash -= dt; muzzleFlash.visible = P.flash > 0; muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 90);
}

// ---------------- getting in and out of cars (animated: walk to the door, climb in / step out, or bail out at speed)
let carAnim = null;
const DRIVER = 1; // American left-hand drive: the driver's door is on the left of the car
// walk to the driver's door; from the passenger side you go round the front of the car first
function planIn(v, spd = 6) {
  const side = v.b.two ? sideOf(v, P.x, P.z) : DRIVER, door = doorSpot(v, side), h = v.s.h;
  let via = null;
  if (!v.b.two && sideOf(v, P.x, P.z) !== side) { const f = v.b.length / 2 + 1.3; via = { x: v.s.x + Math.sin(h) * f, z: v.s.z + Math.cos(h) * f }; }
  const dist = via ? Math.hypot(via.x - P.x, via.z - P.z) + Math.hypot(door.x - via.x, door.z - via.z) : Math.hypot(door.x - P.x, door.z - P.z);
  return { side, door, via, d1: clamp(dist / spd, 0.12, via ? 1.1 : 0.6) };
}
const sideOf = (v, x, z) => { const h = v.s.h; return ((x - v.s.x) * Math.cos(h) - (z - v.s.z) * Math.sin(h)) >= 0 ? 1 : -1; };
function doorSpot(v, side) { const s = v.s, h = s.h, o = v.b.width / 2 + (v.b.doors ? 0.7 : 0.55), f = v.b.doors ? -0.45 : 0.25; return { x: s.x + Math.cos(h) * o * side + Math.sin(h) * f, z: s.z - Math.sin(h) * o * side + Math.cos(h) * f }; }
// doors swing on their front hinge: open while someone climbs in or out, then shut behind them
function setDoor(v, side, open) { if (!v.b.doors) return; if (v.door && v.door.side !== side && v.b.doors[v.door.side]) v.b.doors[v.door.side].rotation.y = 0; v.door = { side, a: v.door?.side === side ? v.door.a : 0, target: open ? 1.05 : 0 }; }
function updateDoors(dt) {
  for (const v of vehicles) { const D = v.door; if (!D) continue; const pv = v.b.doors?.[D.side]; if (!pv) { v.door = null; continue; }
    D.a = damp(D.a, D.target, D.target ? 9 : 12, dt); pv.rotation.y = -D.side * D.a;
    if (!D.target && D.a < 0.02) { pv.rotation.y = 0; v.door = null; sfx.click(); } }
}
function seatSpot(v, side) { const s = v.s, h = s.h; return { x: s.x + Math.cos(h) * 0.35 * side + Math.sin(h) * 0.2, z: s.z - Math.sin(h) * 0.35 * side + Math.cos(h) * 0.2 }; }
function sitIn(v) {
  { const ci = copCars.indexOf(v); if (ci >= 0) { copCars.splice(ci, 1); const crewIn = !v.deployed && v.ai !== 'park'; v.ai = null; v.quarry = null; v.jackedCop = true; v.sirenOn = false; if (v.siren) v.siren.forEach(s => s.visible = false); crime(0.6);
    if (crewIn) { const h = v.s.h, c = makeCop(v.s.x - Math.cos(h) * (v.b.width / 2 + 1.2), v.s.z + Math.sin(h) * (v.b.width / 2 + 1.2)); c.state = 'down'; c.t = 1.4; toast('You threw the officer out of his own car!', 2.4); WANT.v = Math.max(WANT.v, STAR_AT[2]); WANT.stars = Math.max(WANT.stars, 2); } } }
  if (v.police || v.cfg?.roof === 'police') { v.police = true; ensureSiren(v); } // you took their car: it isn't hunting you any more, it's yours
  ride = v; heroRoot.visible = !!(v.b.two || v.b.seat); muzzleFlash.visible = false; audio();
  // every car remembers its own station: yours keeps what you left on, other people's are on whatever their owner liked
  if (v === myCar && v.radio == null) v.radio = stats.carRadio ?? 0;
  if (v.radio == null) v.radio = v.b.two ? STATIONS.length - 1 : Math.floor(Math.random() * STATIONS.length);
  if (v.radio !== radioIndex()) radioSet(v.radio);
  radioOn(!v.b.two);
  carLabelT = time + 2.6; $('carLabel').textContent = v.personal ? (carCfg.name || 'Your car') : v.police ? 'Police car · stolen' : v.taxi ? 'Bay Cab' : `${BODIES[v.cfg.body]?.label || 'Car'} · stolen`; // shown under the stick you drive with
}
function enterVehicle(v, anim = true) {
  if (!anim || P.dead || carAnim) { if (!carAnim) sitIn(v); return; }
  v.s.v = 0; v.s.vx = v.s.vz = 0;
  // with a date along: walk her to the passenger door and open it for her first, then go round to your side
  if (date && !date.inCar && !date.left && !v.b.two && seatsFor(v) >= 2 && Math.hypot(date.x - P.x, date.z - P.z) < 12) {
    date.holding = false; date.escortCar = v;
    const h = v.s.h, sd = -DRIVER, o = v.b.width / 2 + 1.05, S = { x: v.s.x + Math.cos(h) * o * sd - Math.sin(h) * 0.95, z: v.s.z - Math.sin(h) * o * sd - Math.cos(h) * 0.95 };
    const path = []; if (sideOf(v, P.x, P.z) !== sd) { const f = v.b.length / 2 + 1.3; path.push({ x: v.s.x + Math.sin(h) * f, z: v.s.z + Math.cos(h) * f }); } path.push(S); // round the front if you're on the other side
    carAnim = { type: 'escort', v, t: 0, stage: 0, from: { x: P.x, z: P.z }, stand: S, path };
    return;
  }
  const pl = planIn(v);
  carAnim = { type: 'in', v, ...pl, t: 0, from: { x: P.x, z: P.z }, d2: 0.5 };
  sfx.click();
}
function exitCar() {
  const v = ride; if (!v || carAnim) return;
  heroRoot.scale.setScalar(1); heroRoot.rotation.set(0, 0, 0); hero.root.rotation.order = 'XYZ';
  const s = v.s, h = s.h, spd = Math.abs(s.v);
  if (job && job.type === 'taxi') endJob('You left the cab. Shift over.');
  if (ride) { ride.radio = radioIndex(); if (ride === myCar) stats.carRadio = ride.radio; }
  ride = null; radioOn(false);
  if (spd > 7) { // bail out: tumble out the side, the car rolls on without you
    const side = DRIVER, rx = Math.cos(h) * side, rz = -Math.sin(h) * side, fx = Math.sin(h), fz = Math.cos(h);
    const seat = seatSpot(v, side); Object.assign(P, { x: seat.x + rx * 1.4, z: seat.z + rz * 1.4, face: h + Math.PI / 2 * side });
    P.kx = fx * s.v * 0.55 + rx * 6; P.kz = fz * s.v * 0.55 + rz * 6; P.vy = 4.5; P.y = baseY(P.x, P.z, s.y ?? 0) + 0.6;
    v.coast = 3; heroRoot.visible = true;
    carAnim = { type: 'bail', v, t: 0, dur: 1.25 };
    hurt(Math.min(35, 4 + spd * 0.45)); sfx.thud(); shake = 0.35; gainXP('stamina', 4);
    return;
  }
  s.v = 0; s.vx = s.vz = 0;
  const lx = Math.cos(h), lz = -Math.sin(h);
  const spots = [[DRIVER, lx * 2.4 * DRIVER, lz * 2.4 * DRIVER], [-DRIVER, -lx * 2.4 * DRIVER, -lz * 2.4 * DRIVER], [DRIVER, -Math.sin(h) * 3.8, -Math.cos(h) * 3.8], [DRIVER, Math.sin(h) * 3.8, Math.cos(h) * 3.8]];
  let to = null, side = DRIVER;
  for (const [sd, dx, dz] of spots) { const p = { x: s.x + dx, z: s.z + dz }; if (!walkable(p.x, p.z) || (v.b.boat && swimmable(p.x, p.z))) continue; const bx = p.x, bz = p.z; resolve(p, 0.4, 0); if (Math.hypot(p.x - bx, p.z - bz) < 0.6) { to = p; side = sd; break; } }
  if (v.b.boat && !to) for (let r = 3; r < 18 && !to; r += 1.5) for (let a = 0; a < 6.28 && !to; a += 0.4) { const p = { x: s.x + Math.cos(a) * r, z: s.z + Math.sin(a) * r }; if (walkable(p.x, p.z) && !swimmable(p.x, p.z)) to = p; } // hop onto the dock or the beach
  if (!to) to = { x: s.x + lx * 2.4 * DRIVER, z: s.z + lz * 2.4 * DRIVER };
  const seat = seatSpot(v, side);
  Object.assign(P, { x: seat.x, z: seat.z, face: Math.atan2(to.x - seat.x, to.z - seat.z) });
  heroRoot.visible = !P.dead;
  carAnim = { type: 'out', v, side, t: 0, from: seat, to, dur: 0.5 };
}
function walkTo(A) {
  const k = A.t / A.d1, legs = A.via ? [[A.from, A.via], [A.via, A.door]] : [[A.from, A.door]];
  const i = Math.min(legs.length - 1, Math.floor(k * legs.length)), kk = k * legs.length - i, [a, b] = legs[i];
  const e = legs.length > 1 ? kk : kk * kk * (3 - 2 * kk);
  P.x = a.x + (b.x - a.x) * e; P.z = a.z + (b.z - a.z) * e; P.face = Math.atan2(b.x - a.x, b.z - a.z);
}
function updateCarAnim(dt) {
  const A = carAnim; A.t += dt;
  for (const k of ['a', 'b', 'x', 'y']) input.consume(k);
  const lerp = (a, b, k) => a + (b - a) * k, ease = k => k * k * (3 - 2 * k);
  let speed = 0, y = baseY(P.x, P.z, A.v?.s?.y ?? P.y), tumble = 0;
  if (A.type === 'jack') {
    const v = A.v, dr = A.driver, seat = seatSpot(v, A.side);
    if (A.t < A.d1) { walkTo(A); speed = 1; }
    else if (A.t < A.d1 + A.d2) { // grab the driver and drag them out onto the street
      const k = (A.t - A.d1) / A.d2, out = { x: A.door.x + (A.door.x - seat.x) * 1.4, z: A.door.z + (A.door.z - seat.z) * 1.4 };
      P.face = Math.atan2(seat.x - P.x, seat.z - P.z);
      dr.root.visible = true; dr.state = 'held'; if (!A.opened) { A.opened = 1; setDoor(v, A.side, true); }
      dr.x = lerp(seat.x, out.x, ease(k)); dr.z = lerp(seat.z, out.z, ease(k)); dr.face = P.face + Math.PI;
      dr.root.position.set(dr.x, 0.17 + Math.sin(k * Math.PI) * 0.35, dr.z); dr.root.rotation.y = dr.face; dr.inner.rotation.x = -k * 1.3;
      hero.armR.pivot.rotation.set(-1.4 + k * 1.2, 0, 0.1); hero.armL.pivot.rotation.set(-1.4 + k * 1.2, 0, -0.1);
      v.b.group.rotation.z = Math.sin(k * Math.PI * 2) * 0.05 * A.side;
      if (!A.thud && k > 0.85) { A.thud = 1; sfx.thud(); spawnParticles(dr.x, 0.3, dr.z, ['#c9c2b5'], 5, 2, 0.4, 0.12); }
      heroRoot.position.set(P.x, y, P.z); hero.root.rotation.y = P.face; return;
    } else { // driver hits the deck, then we climb in
      if (!A.dropped) { A.dropped = 1; peds.knock(dr, A.door.x - seat.x, A.door.z - seat.z, 2); dr.t = 1.4; if (dr.brave) { dr.angry = true; dr.angryT = 18; dr.car = v; } }
      A.type = 'in'; A.d1 = 0; A.d0 = 0; A.t = 0; A.door = { x: P.x, z: P.z };
    }
  }
  let arms = 'walk';
  if (A.type === 'escort') {
    const v = A.v, D = date;
    if (A.stage === 0) { // walk to her door
      const T = A.path[0], dx = T.x - P.x, dz = T.z - P.z, d = Math.hypot(dx, dz);
      if (d > 0.15) { const sp = Math.min(d / dt, 4.8); P.x += dx / d * sp * dt; P.z += dz / d * sp * dt; P.face = Math.atan2(dx, dz); speed = 1; }
      else if (A.path.length > 1) A.path.shift();
      else { A.stage = 1; A.t = 0; setDoor(v, -DRIVER, true); sfx.click(); }
      if (A.t > 6) { A.stage = 1; A.t = 0; setDoor(v, -DRIVER, true); }
    } else if (A.stage === 1) { // hold the door open while she gets in
      const ds = doorSpot(v, -DRIVER); P.face += wrapA(Math.atan2(ds.x - P.x, ds.z - P.z) - P.face) * Math.min(1, dt * 10); arms = 'hold';
      if (!D || D.inCar || A.t > 7) { A.stage = 2; A.t = 0; setDoor(v, -DRIVER, false); if (D && D.inCar) { toast(`${D.name}: "${pick(['Aww, such a gentleman.', 'Look at you, opening doors.', 'Thank you, babe.'])}"`, 2.2); D.interest += 3; } }
    } else if (A.t > 0.45) { // shut it, then round to the driver's side
      carAnim = { type: 'in', v, ...planIn(v), t: 0, from: { x: P.x, z: P.z }, d2: 0.5 }; return;
    }
  }
  else if (A.type === 'in') {
    const v = A.v; A.d0 ??= v.b.doors && !(v.door && v.door.side === A.side && v.door.target) ? 0.32 : 0;
    if (A.t < A.d1) { walkTo(A); speed = 1; }
    else if (A.t < A.d1 + A.d0) { // reach for the handle and pull the door open
      const seat = seatSpot(v, A.side); P.face += wrapA(Math.atan2(seat.x - P.x, seat.z - P.z) - P.face) * Math.min(1, dt * 14); arms = 'reach';
      if (!A.opened) { A.opened = 1; setDoor(v, A.side, true); sfx.click(); }
    }
    else {
      const k = Math.min(1, (A.t - A.d1 - A.d0) / A.d2), seat = seatSpot(v, A.side); arms = k > 0.7 ? 'wheel' : 'down';
      if (!A.opened && v.b.doors) { A.opened = 1; setDoor(v, A.side, true); }
      P.x = lerp(A.door.x, seat.x, ease(k)); P.z = lerp(A.door.z, seat.z, ease(k));
      P.face += wrapA(v.s.h - P.face) * Math.min(1, dt * 10);
      y += Math.sin(k * Math.PI) * 0.25 - k * 0.35;          // step up, then sink into the seat
      v.b.group.rotation.z = Math.sin(k * Math.PI) * 0.04 * A.side; // car rocks as you climb in
      if (k > 0.85) heroRoot.visible = false;
      if (k >= 1) { carAnim = null; v.b.group.rotation.z = 0; setDoor(v, A.side, false); sitIn(v); return; }
    }
  } else if (A.type === 'out') {
    const v = A.v; A.d0 ??= v.b.doors ? 0.28 : 0;
    if (A.t < A.d0) { if (!A.opened) { A.opened = 1; setDoor(v, A.side, true); sfx.click(); } heroRoot.visible = false; return; }
    heroRoot.visible = !P.dead;
    const k = Math.min(1, (A.t - A.d0) / A.dur); arms = k < 0.3 ? 'down' : 'walk';
    P.x = lerp(A.from.x, A.to.x, ease(k)); P.z = lerp(A.from.z, A.to.z, ease(k));
    y += (1 - k) * -0.35 + Math.sin(k * Math.PI) * 0.2; speed = k > 0.4 ? 0.6 : 0;
    v.b.group.rotation.z = Math.sin(k * Math.PI) * 0.035;
    if (k >= 1) { carAnim = null; v.b.group.rotation.z = 0; P.y = baseY(P.x, P.z, v.s.y ?? 0); setDoor(v, A.side, false); return; }
  } else { // bail
    P.x += P.kx * dt; P.z += P.kz * dt; P.kx = damp(P.kx, 0, 2.6, dt); P.kz = damp(P.kz, 0, 2.6, dt);
    resolve(P, 0.4, 0); if (!walkable(P.x, P.z)) { P.kx = -P.kx * 0.3; P.kz = -P.kz * 0.3; }
    P.vy -= 24 * dt; P.y += P.vy * dt; const gy = baseY(P.x, P.z, P.y); if (P.y < gy) { P.y = gy; P.vy = Math.abs(P.vy) > 3 ? Math.abs(P.vy) * 0.3 : 0; }
    y = P.y; tumble = A.t < 0.85 ? A.t * 13 : 0;
    if (A.t > 0.15 && A.t < 0.2) spawnParticles(P.x, 0.3, P.z, ['#c9c2b5', '#8a857c'], 6, 3, 0.4, 0.15);
    if (A.t >= A.dur) { carAnim = null; hero.root.rotation.x = 0; P.kx = P.kz = 0; return; }
  }
  if (A.type !== 'bail') P.y = y;
  heroRoot.position.set(P.x, y, P.z); hero.root.rotation.y = P.face;
  hero.root.rotation.x = A.type === 'bail' ? (A.t < 0.85 ? -tumble : damp(hero.root.rotation.x, 0, 10, dt)) : 0;
  P.phase += dt * speed * 9;
  poseCharacter(hero, { phase: P.phase, speed, air: A.type === 'bail' && A.t < 0.85, aim: -0.55, recoil: 0, t: time });
  if (A.type === 'bail' || arms === 'wheel') return; // hands only go to the wheel once you're sat down
  const sw = Math.sin(P.phase) * 0.55 * speed;
  if (arms === 'walk') { hero.armR.pivot.rotation.set(-sw, 0, 0.08); hero.armL.pivot.rotation.set(sw, 0, -0.08); }
  else if (arms === 'hold') { hero.armR.pivot.rotation.set(-1.1, 0.2, 0.5); hero.armL.pivot.rotation.set(0.1, 0, -0.08); }
  else if (arms === 'reach') { const k = Math.min(1, (A.t - A.d1) / A.d0); hero.armR.pivot.rotation.set(-1.25 + k * 0.5, 0.3, 0.15 + k * 0.35); hero.armL.pivot.rotation.set(0.1, 0, -0.08); }
  else { hero.armR.pivot.rotation.set(-0.35, 0, 0.12); hero.armL.pivot.rotation.set(-0.35, 0, -0.12); }
}
function jackTraffic(t) {
  if (carAnim) return;
  traffic.splice(traffic.indexOf(t), 1); dyn.remove(t.mesh);
  const v = makeVehicle(t.lib.cfg, t.rx, t.rz, t.rh, false);
  const pl = planIn(v, 6.5), side = pl.side;
  const driver = peds.spawnLoose(t.rx, t.rz, P.x, P.z);
  driver.state = 'held'; driver.root.visible = false; driver.name = pick(NPC_NAMES);
  driver.brave = Math.random() < 0.4 + (night > 0.5 ? 0.1 : 0) - (ws.kind === 'gun' && !holstered() ? 0.3 : 0);
  carAnim = { type: 'jack', v, ...pl, t: 0, from: { x: P.x, z: P.z }, d2: 0.75, d3: 0.5, driver };
  witness('jack', t.rx, t.rz, driver); peds.scare(t.rx, t.rz, 15); sfx.click(); gainXP('strength', 3); crime(0.8);
}
function holstered() { return arsenal.cur === 'fist' || !!P.holster; }
// the driver you dragged out: brave ones try to get their car back, the rest run off
function updateAngry(dt) {
  for (const p of peds.list) {
    if (!p.angry) continue;
    p.angryT -= dt;
    const tgt = ride ? ride.s : P, d = Math.hypot(tgt.x - p.x, tgt.z - p.z);
    if (p.state === 'down' || p.state === 'talk') continue;
    if (p.angryT <= 0 || d > 45 || P.dead) { p.angry = false; if (p.state !== 'down') peds.flee(p, tgt.x, tgt.z); if (d > 45) toast(`${p.name} gave up chasing you.`, 2); continue; }
    if (ride && ride === p.car) {
      if (Math.abs(ride.s.v) > 3) { p.state = 'chase'; p.tx = tgt.x; p.tz = tgt.z; continue; }
      if (d < 2.6) { // yank you out and drive off
        const v = ride; exitCar(); hurt(6); sfx.punch?.(); toast(`${p.name} pulled you out and took the car back!`, 3);
        carAnim = null; P.x = v.s.x + Math.cos(v.s.h) * 2.6; P.z = v.s.z - Math.sin(v.s.h) * 2.6; P.kx = Math.cos(v.s.h) * 4; P.kz = -Math.sin(v.s.h) * 4;
        p.angry = false; peds.list.splice(peds.list.indexOf(p), 1); dyn.remove(p.root); v.stolenBack = 6; v.s.v = 11; v.coast = 6; return;
      }
      p.state = 'chase'; p.tx = tgt.x; p.tz = tgt.z;
    } else if (!ride) {
      if (d > 1.3) { p.state = 'chase'; p.tx = P.x; p.tz = P.z; }
      else { p.state = 'punch'; p.tx = P.x; p.tz = P.z; p.hitCd = (p.hitCd || 0) - dt; if (p.hitT > 0) p.hitCd = Math.max(p.hitCd, 0.35); /* staggered by your hits */ if (p.hitCd <= 0) { p.hitCd = p.brawler ? rand(0.8, 1.3) : 0.9; if (p.kind === 'cop') P.copHitT = time; hurt(p.brawler ? (p.power || 9) * 0.55 + Math.random() * 3 : 5 + Math.random() * 4); sfx.punch?.(); shake = 0.15; } }
    } else { p.state = 'chase'; p.tx = tgt.x; p.tz = tgt.z; }
  }
}
// ---------------- cutscenes in the real world: the minigame overlay goes see-through and the camera moves in close
const cutCam = new THREE.PerspectiveCamera(46, 1, 0.1, 500);
function cutRender(shake = 0) { // markers, rings and beacons are for free roaming; hide them while a cutscene renders
  cutCam.aspect = W / H; cutCam.updateProjectionMatrix(); const o = cutCam.position.clone(); if (shake > 0) cutCam.position.add(new THREE.Vector3(rand(-1, 1) * shake, rand(-1, 1) * shake, rand(-1, 1) * shake));
  const hid = []; const hide = obj => { if (obj && obj.visible) { obj.visible = false; hid.push(obj); } };
  for (const m of markers) hide(m.g); for (const E of streetEvents) hide(E.beacon); hide(jobMarker); for (const m of inside?.marks || []) hide(m.g || m.sp || m); for (const n of npcs) hide(n.mark);
  renderer.render(G.scene, cutCam); for (const h of hid) h.visible = true; cutCam.position.copy(o); }
function toScreen(v) { const q = v.clone().project(cutCam); return [(q.x + 1) / 2 * W, (1 - q.y) / 2 * H]; }
function armPose(arm, lift, bend) { arm.pivot.rotation.set(lift, 0, 0); if (arm.elbow) arm.elbow.rotation.set(bend, 0, 0); }
// breaking into a parked car: you're stood at the window, mash the screen and he punches it in
function smashCut(p) {
  ensureCarLib(); const cfg = carLib[Math.floor(p.seed * carLib.length)].cfg, car = buildCar(cfg), rot = p.rot;
  car.group.position.set(p.x, 0.17, p.z); car.group.rotation.y = rot; dyn.add(car.group); car.group.updateMatrixWorld(true); if (p.mesh) p.mesh.visible = false;
  const R = new THREE.Vector3(Math.cos(rot), 0, -Math.sin(rot)), F = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot)), side = Math.sign((P.x - p.x) * R.x + (P.z - p.z) * R.z) || 1;
  let glass = null, gc = null, best = -1; const tmp = new THREE.Box3(), c = new THREE.Vector3();
  car.group.traverse(m => { if (!m.isMesh || !m.material.transparent || m.material.opacity <= 0.5) return; tmp.setFromObject(m); tmp.getCenter(c); const lat = (c.x - p.x) * R.x + (c.z - p.z) * R.z, fw = (c.x - p.x) * F.x + (c.z - p.z) * F.z; const sc = lat * side - Math.abs(fw - 0.2) * 0.3; if (lat * side > 0.2 && sc > best) { best = sc; glass = m; gc = c.clone(); } });
  if (!gc) gc = new THREE.Vector3(p.x, 1.2, p.z).addScaledVector(R, side * car.width / 2);
  const n = R.clone().multiplyScalar(side), stand = gc.clone().addScaledVector(n, 0.78), face = Math.atan2(-n.x, -n.z);
  { const fs = (P.x - p.x) * F.x + (P.z - p.z) * F.z >= 0 ? 1 : -1; cutCam.position.copy(gc).addScaledVector(n, 3.3).addScaledVector(F, 3.6 * fs).add(new THREE.Vector3(0, 0.8, 0)); const la = gc.clone().addScaledVector(n, 0.42); cutCam.lookAt(la.x, la.y - 0.1, la.z); } // side-on: you, the window and the car door in shot
  const need = 6; let hits = 0, punch = 0, arm = 0, shake = 0, done = false, endT = 0; const cracks = [];
  return { see: true, title: 'Break in', hint: 'Mash the screen to punch the window in!', time: 7, car, glass, side,
    init() {}, down() { if (done) return; hits++; punch = 1; arm = 1 - arm; shake = 0.05; sfx.crack(); navigator.vibrate?.(25);
      const k = 30 + hits * 14, ox = rand(-0.5, 0.5) * 40, oy = rand(-0.5, 0.5) * 30; for (let i = 0; i < 4 + hits; i++) { const a = rand(0, 6.28), L = rand(0.3, 1) * k; const pts = [[ox, oy]]; let px = ox, py = oy; for (let q = 0; q < 4; q++) { px += Math.cos(a + rand(-0.4, 0.4)) * L / 4; py += Math.sin(a + rand(-0.4, 0.4)) * L / 4; pts.push([px, py]); } cracks.push(pts); }
      if (hits >= need) { done = true; endT = 1; sfx.smash(); navigator.vibrate?.([40, 30, 60]); if (glass) glass.visible = false; cracks.length = 0; spawnParticles(gc.x, gc.y, gc.z, ['#cfe8ff', '#9fd2ee', '#ffffff'], 40, 3, 1.2, 0.12, -6); } },
    update(dt) { punch = Math.max(0, punch - dt * 5); shake = Math.max(0, shake - dt * 0.4); if (done) endT -= dt; return done && endT <= 0; },
    frame(dt) {
      if (heroW) heroW.group.visible = false; heroRoot.visible = true; heroRoot.position.set(stand.x, 0, stand.z); hero.root.rotation.set(0, face, 0); P.x = stand.x; P.z = stand.z; P.face = face;
      poseCharacter(hero, { phase: 0, speed: 0, air: false, aim: 0, recoil: 0, t: time });
      const pk = Math.sin(Math.min(1, punch) * Math.PI); // guard up, jab out
      armPose(arm ? hero.armR : hero.armL, -1.5 - pk * 0.15, -(1 - pk) * 1.7); armPose(arm ? hero.armL : hero.armR, -1.25, -1.8); hero.torso.rotation.y = (arm ? -1 : 1) * pk * 0.25;
      updateParticles?.(dt); cutRender(shake);
    },
    draw(cx) { if (!done) { const [x0, y0] = toScreen(gc); cx.strokeStyle = 'rgba(255,255,255,.92)'; cx.lineWidth = 2; for (const pts of cracks) { cx.beginPath(); cx.moveTo(x0 + pts[0][0], y0 + pts[0][1]); for (const q of pts) cx.lineTo(x0 + q[0], y0 + q[1]); cx.stroke(); } }
      cx.fillStyle = '#fff'; cx.font = '900 30px system-ui'; cx.textAlign = 'center'; cx.shadowColor = 'rgba(0,0,0,.7)'; cx.shadowBlur = 10; cx.fillText(done ? 'IN!' : `${hits} / ${need}`, W / 2, H * 0.68); cx.shadowBlur = 0; },
    result() { return { win: done, score: hits }; },
    cleanup(win) { if (heroW) heroW.group.visible = true; dyn.remove(car.group); if (!win && p.mesh) p.mesh.visible = true; hero.torso.rotation.y = 0; } };
}
async function breakIntoParked(p) {
  setState('mini');
  const cut = smashCut(p), r1 = await runMinigame(cut); cut.cleanup(r1.win);
  if (!r1.win) { setState('play'); toast(r1.quit ? 'You walked away' : 'Car alarm! Better leave it.'); if (!r1.quit) { peds.scare(p.x, p.z, 30); crime(0.6); } return; }
  const r2 = await playCut('hotwire', { wires: Math.random() < 0.35 ? 4 : 3, car: carLib[Math.floor(p.seed * carLib.length)].cfg });
  setState('play');
  if (!r2.win) { toast(r2.quit ? 'You walked away' : 'Too slow, the alarm went off!'); peds.scare(p.x, p.z, 30); if (p.mesh) p.mesh.visible = true; return; }
  p.taken = true; if (p.mesh) p.mesh.parent?.remove(p.mesh); removeCollider(p.col);
  ensureCarLib(); const v = makeVehicle(carLib[Math.floor(p.seed * carLib.length)].cfg, p.x, p.z, p.rot, false);
  { const R = new THREE.Vector3(Math.cos(p.rot), 0, -Math.sin(p.rot)), tmp = new THREE.Box3(), c = new THREE.Vector3(); let g = null, best = -1; v.b.group.updateMatrixWorld(true); v.b.group.traverse(m => { if (!m.isMesh || !m.material.transparent || m.material.opacity <= 0.5) return; tmp.setFromObject(m); tmp.getCenter(c); const lat = ((c.x - p.x) * R.x + (c.z - p.z) * R.z) * cut.side; if (lat > 0.2 && lat > best) { best = lat; g = m; } }); if (g) g.visible = false; } // the window stays smashed
  enterVehicle(v); gainXP('driving', 5);
}
// workouts: mash the screen and watch yourself lift (or pound the heavy bag)
function gymCut(o = {}) {
  const bag = /bag/i.test(o.title || ''), face = P.face, fw = new THREE.Vector3(Math.sin(face), 0, Math.cos(face)), rt = new THREE.Vector3(Math.cos(face), 0, -Math.sin(face));
  const base = new THREE.Vector3(P.x, P.y || 0, P.z);
  cutCam.position.copy(base).addScaledVector(fw, 3.9).addScaledVector(rt, 1.8).add(new THREE.Vector3(0, 1.7, 0)); cutCam.lookAt(base.x, base.y + 1.3, base.z);
  let barbell = null; if (!bag) { barbell = new THREE.Group(); const M1 = new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 0.8, roughness: 0.3 }), M2 = new THREE.MeshStandardMaterial({ color: '#16161b', roughness: 0.6 });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 8), M1); bar.rotation.z = Math.PI / 2; barbell.add(bar); for (const sx of [-0.68, 0.68]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16), M2); pl.rotation.z = Math.PI / 2; pl.position.x = sx; barbell.add(pl); } dyn.add(barbell); }
  let bar = 0, reps = 0, pump = 0, arm = 0, punch = 0; const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  return { see: true, title: o.title || 'Workout', hint: bag ? 'Mash the screen to hit the bag!' : 'Mash the screen to push the weight!', time: 18,
    init() {}, down() { bar += bag ? 0.11 : 0.085; pump = 0.12; punch = 1; arm = 1 - arm; sfx.click(); if (bar >= 1) { bar = 0; reps++; sfx.coin(); navigator.vibrate?.(20); } },
    update(dt) { bar = Math.max(0, bar - dt * 0.25); pump -= dt; punch = Math.max(0, punch - dt * 6); },
    frame(dt) {
      if (heroW) heroW.group.visible = false; heroRoot.visible = true; heroRoot.position.copy(base); hero.root.rotation.set(0, face, 0); poseCharacter(hero, { phase: 0, speed: 0, air: false, aim: 0, recoil: 0, t: time });
      if (bag) { const pk = Math.sin(punch * Math.PI); armPose(arm ? hero.armR : hero.armL, -1.5 - pk * 0.1, -(1 - pk) * 1.7); armPose(arm ? hero.armL : hero.armR, -1.3, -1.8); }
      else { const k = Math.min(1, bar * 1.15) * (1 - Math.max(0, pump) * 0.5), lift = -0.5 - k * 2.5; for (const A of [hero.armL, hero.armR]) armPose(A, lift, -1.2 * (1 - k)); hero.armL.pivot.rotation.z = 0.45; hero.armR.pivot.rotation.z = -0.45;
        heroRoot.updateMatrixWorld(true); (hero.armL.hand || hero.armL.elbow).getWorldPosition(tmpA); (hero.armR.hand || hero.armR.elbow).getWorldPosition(tmpB); barbell.position.copy(tmpA).add(tmpB).multiplyScalar(0.5); barbell.rotation.set(0, face, 0); }
      cutRender(pump > 0 ? 0.015 : 0);
    },
    draw(cx) { const w = W * 0.7, x = (W - w) / 2, y = H * 0.9; cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(x, y, w, 16); cx.fillStyle = '#ff8a2a'; cx.fillRect(x, y, w * bar, 16);
      cx.fillStyle = '#ffd23f'; cx.font = '900 30px system-ui'; cx.textAlign = 'center'; cx.shadowColor = 'rgba(0,0,0,.7)'; cx.shadowBlur = 10; cx.fillText(`Reps: ${reps}`, W / 2, H * 0.16); cx.shadowBlur = 0; },
    result() { return { win: reps > 0, score: reps, money: reps * 25 }; },
    cleanup() { if (heroW) heroW.group.visible = true; if (barbell) dyn.remove(barbell); } };
}
// ---------------- car damage: dents where you hit, smoke, fire, then it blows
const BROKEN_LAMP = new THREE.MeshStandardMaterial({ color: '#2a2a30', roughness: 0.9 });
function damageCar(v, amt, ix, iz, byYou = false) {
  if (!v || v.wrecked || amt <= 0 || v.delivery) return;
  if (byYou && v !== ride) v.youHitT = time; // so if it blows up soon after, that's on you
  if (v === ride && amt > 10 && chatCd('crash', 8)) { if (date?.inCar) subs.say(dateWho(), pick(['Oh my god! Watch the road!', 'Are you CRAZY?!', 'I nearly hit my head!', 'Seriously?!']), { expr: 'shock', pri: 3, now: true }); else if (Math.random() < 0.5) youSay(pick(['Whoops.', 'My bad, my bad.', 'That\'s gonna leave a mark.', 'Who put that there?']), 'shock', { pri: 2 }); }
  v.hp ??= 100; v.hp -= amt * (v.b.two ? 1.4 : 1) / (v.st?.tough || 1);
  // crumple the panels nearest the impact
  if (ix !== undefined) {
    const g = v.b.group, inv = new THREE.Matrix4().copy(g.matrixWorld).invert(), hitL = new THREE.Vector3(ix, 0.6, iz).applyMatrix4(inv);
    const k = Math.min(1, amt / 25);
    for (const m of g.children) {
      if (!m.isMesh || v.b.wheels.some(w => w.pivot === m)) continue;
      const d = Math.hypot(m.position.x - hitL.x, m.position.z - hitL.z); if (d > 1.4) continue;
      const push = (1 - d / 1.4) * 0.07 * k;
      m.position.x -= Math.sign(hitL.x - m.position.x || 1) * push * 0.5; m.position.z -= Math.sign(hitL.z - m.position.z || 1) * push;
      m.rotation.z += (Math.random() - 0.5) * 0.12 * k; m.rotation.x += (Math.random() - 0.5) * 0.08 * k;
      if (m.material?.color && !m.material.transparent && m.material.metalness < 0.9 && !m.material._dented) { m.material = m.material.clone(); m.material._dented = true; m.material.color.multiplyScalar(0.85); }
    }
    if (hitL.z > v.b.length * 0.3 && amt > 8 && v.b.heads) { // a knock to the front can smash a headlight (or both, head-on)
      const sides = Math.abs(hitL.x) < 0.25 && amt > 22 ? ['-1', '1'] : [hitL.x < 0 ? '-1' : '1'];
      for (const sd of sides) if (!(v.headBroken ||= {})[sd]) { v.headBroken[sd] = true; for (const hm of v.b.heads[sd]) hm.material = BROKEN_LAMP; spawnParticles(ix, 0.8, iz, ['#e8f4ff', '#ffffff', '#bfe0ff'], 8, 3, 0.6, 0.06); sfx.thud?.(); if (v === ride && chatCd('lamp', 20) && !date?.inCar) setTimeout(() => youSay(pick(['There goes a headlight.', 'Great. Now I\'m a pirate car.']), 'sad'), 900); }
    }
  }
  if (v.hp <= 0) wreckCar(v);
}
function wreckCar(v) {
  v.wrecked = true; v.hp = 0;
  explode(v.s.x, 0.8, v.s.z, 6, 1, time - (v.youHitT ?? -1e9) < 30);
  v.b.group.traverse(m => { if (m.isMesh && m.material?.color) { m.material = m.material.clone(); m.material.color.set('#1c1a1a'); if (m.material.emissive) m.material.emissive.set('#000000'); } });
  v.burnT = 25;
  if (ride === v) { const s = v.s; exitCar(); carAnim = null; P.x = s.x + Math.cos(s.h) * 2.6; P.z = s.z - Math.sin(s.h) * 2.6; heroRoot.visible = true; }
  if (v === myCar) toast('Your car is wrecked! Buy another or get it towed (phone > Garage > Bring my car).', 4);
}
function carSmoke(v, dt) {
  if (v.hp === undefined || v.hp > 45) return;
  const s = v.s, fx = Math.sin(s.h), fz = Math.cos(s.h), hx = s.x + fx * v.b.length * 0.35, hz = s.z + fz * v.b.length * 0.35;
  if (v.wrecked) { v.burnT -= dt; if (v.burnT > 0 && Math.random() < dt * 14) spawnParticles(s.x + rand(-0.8, 0.8), 1.2, s.z + rand(-1, 1), ['#ff8a2a', '#ffd23f', '#ff3b1a'], 1, 1, 0.8, 0.3, -4); if (Math.random() < dt * 5) spawnParticles(s.x, 1.6, s.z, ['#2a2a30', '#3a3a40'], 1, 0.8, 1.8, 0.6, -2); return; }
  if (Math.random() < dt * (v.hp < 20 ? 14 : 6)) spawnParticles(hx, 1.1, hz, v.hp < 20 ? ['#2a2a30', '#3a3a40'] : ['#bfbfc4', '#9a9aa2'], 1, 0.8, 1.2, 0.35, -2);
  if (v.hp < 20 && Math.random() < dt * 10) spawnParticles(hx, 1.0, hz, ['#ff8a2a', '#ffd23f'], 1, 0.6, 0.5, 0.2, -4);
  if (v.hp < 20) { v.fuse = (v.fuse || 0) + dt; if (v.fuse > 12) wreckCar(v); }
}
function repairCar(v, svc) {
  const dmgPct = 100 - (v.hp ?? 100), cost = svc === 'wash' ? Math.max(25, Math.round(dmgPct * 8)) : Math.max(15, Math.round(dmgPct * 6));
  if (v.wrecked) { toast("It's a burnt-out wreck. Nothing to fix."); return; }
  if (WANT.stars && WANT.seen) { toast("Not with the cops watching! Lose them first."); sfx.fail(); return; }
  if (money < cost) { toast(`That'll be ${fmt(cost)}. You can't afford it.`); sfx.fail(); return; }
  spend(cost); v.s.v = 0; if (v.headBroken && v.b.heads) { for (const sd of ['-1', '1']) for (const hm of v.b.heads[sd]) hm.material = v.b.headM; v.headBroken = null; } // new headlights
  if (WANT.stars) setTimeout(() => clearWanted('Fresh look, new plates. The cops lost you.'), 900);
  fade(() => {
    const s = { ...v.s }, wasRide = ride === v;
    if (v === myCar) { rebuildMyCar(s); if (wasRide) { ride = myCar; heroRoot.visible = !!(myCar.b.two || myCar.b.seat); } }
    else { dyn.remove(v.b.group); disposeObject(v.b.group); v.b = buildCar(v.cfg); dyn.add(v.b.group); placeVehicle(v); }
    const nv = v === myCar ? myCar : v; nv.hp = 100; nv.fuse = 0; if (wasRide) ride = nv;
    if (svc === 'wash') for (let i = 0; i < 20; i++) spawnParticles(s.x + rand(-2, 2), 1.5, s.z + rand(-2, 2), ['#ffffff', '#bfe8ff', '#ff9fd0'], 1, 1, 1.2, 0.18, -1);
    toast(svc === 'wash' ? `Washed, polished and fully repaired. ${fmt(cost)}` : `Filled up and patched up. ${fmt(cost)}`, 2.5); sfx.coin();
  });
}
const carPos = { x: 0, z: 0 };
// whoever's riding with you sits in the passenger seat of an open-top car (date, buddy): idling, glancing over at you now and then
function seatPassenger(o, v, seed = 0) {
  const b = v.b, S = 1, hip = o.limbs[0].position.y; b.group.updateMatrixWorld(true); b.group.localToWorld(_seatV.set(-b.seat.x, b.seat.y, b.seat.z));
  o.root.visible = true; o.root.scale.setScalar(S); o.root.position.set(_seatV.x, _seatV.y - hip * S, _seatV.z); o.root.rotation.set(0, v.s.h, 0);
  o.limbs[0].rotation.set(-1.45, 0, 0.05); o.limbs[1].rotation.set(-1.45, 0, -0.05); o.limbs[2].rotation.set(-0.45, 0, -0.1); o.limbs[3].rotation.set(-0.45, 0, 0.1);
  if (o.inner) o.inner.rotation.y = Math.sin(time * 0.35 + seed) > 0.55 ? 0.45 : Math.sin(time * 0.6 + seed) * 0.08; // a look over at the driver
}
function unseatPassenger(o) { if (o.root.scale.x !== 1) { o.root.scale.setScalar(1); if (o.inner) o.inner.rotation.y = 0; } }
// sat at the wheel of an open-top car: you can see them in there, hands on the wheel
const _seatV = new THREE.Vector3();
function seatedPose(v) {
  const b = v.b, c = v.s, S = 1, hl = 0.86 * (charCfg.height || 1) * (charCfg.legs || 1);
  b.group.updateMatrixWorld(true); b.group.localToWorld(_seatV.set(b.seat.x, b.seat.y, b.seat.z));
  heroRoot.scale.setScalar(S); heroRoot.rotation.set(0, 0, 0); hero.root.rotation.order = 'XYZ'; hero.root.rotation.set(0, c.h, 0);
  heroRoot.position.set(_seatV.x, _seatV.y - hl * S, _seatV.z);
  poseCharacter(hero, { phase: 0, speed: 0, air: false, aim: -0.55, recoil: 0, t: time });
  hero.legL.pivot.rotation.set(-1.5, 0, 0.05); hero.legR.pivot.rotation.set(-1.5, 0, -0.05); hero.legL.knee.rotation.x = 1.35; hero.legR.knee.rotation.x = 1.35;
  const st = clamp(c.steer || 0, -1, 1) * 0.25; hero.armR.pivot.rotation.set(-1.15, 0, 0.12 + st); hero.armL.pivot.rotation.set(-1.15, 0, -0.12 + st); hero.torso.rotation.set(0, 0, 0);
}
// rider on a bicycle / scooter / motorbike: sitting (or standing on the scooter), leaning into turns, pedalling
function riderPose(v, dt) {
  const b = v.b, c = v.s, hl = 0.86 * (charCfg.height || 1) * (charCfg.legs || 1), kind = b.two;
  const back = kind === 'moto' ? -0.28 : kind === 'bike' ? -0.18 : -0.05, gy = b.group.position.y;
  const y = kind === 'scooter' ? gy + b.seatY : gy + b.seatY - hl + 0.06;
  heroRoot.position.set(c.x + Math.sin(c.h) * back, y, c.z + Math.cos(c.h) * back);
  heroRoot.rotation.set(0, 0, 0); hero.root.rotation.set(kind === 'scooter' ? 0 : 0.25, c.h, 0); hero.root.rotation.order = 'YXZ';
  heroRoot.rotation.z = b.group.rotation.z; heroRoot.rotation.order = 'YXZ'; heroRoot.rotation.y = 0;
  P.phase += dt * Math.abs(c.v) * 1.2;
  poseCharacter(hero, { phase: 0, speed: 0, air: false, aim: -0.55, recoil: 0, t: time });
  const reach = kind === 'scooter' ? -0.95 : -1.15;
  hero.armR.pivot.rotation.set(reach, 0, 0.1); hero.armL.pivot.rotation.set(reach, 0, -0.1);
  if (kind === 'bike') { // sat on the saddle, leaning to the bars, each foot on a pedal going round the crank (two-bone leg IK)
    hero.root.rotation.x = 0; hero.torso.rotation.x = 0.42; hero.head.rotation.x = -0.3;
    const L1 = hl * 0.5, L2 = hl * 0.5, hipY = b.seatY + 0.04, ph = P.phase;
    heroRoot.position.set(c.x - Math.sin(c.h) * 0.22, gy + hipY - hl, c.z - Math.cos(c.h) * 0.22);
    if (b.crank) b.crank.rotation.x = ph;
    for (const [leg, off] of [[hero.legR, 0], [hero.legL, Math.PI]]) {
      const a = ph + off, fz = 0.22 + Math.sin(a) * 0.16, fy = (b.wr - hipY) + Math.cos(a) * 0.16; // pedal relative to the hip
      const d = Math.min(L1 + L2 - 0.01, Math.hypot(fz, fy)), base = Math.atan2(fz, -fy), inner = Math.acos(Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))), knee = Math.PI - Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))));
      leg.pivot.rotation.set(-(base + inner), 0, 0); leg.knee.rotation.x = knee;
    }
    hero.armR.pivot.rotation.set(-0.95, 0, 0.12); hero.armL.pivot.rotation.set(-0.95, 0, -0.12);
  }
  else if (kind === 'moto') { hero.legL.pivot.rotation.x = hero.legR.pivot.rotation.x = -1.2; hero.legL.knee.rotation.x = hero.legR.knee.rotation.x = 1.5; }
  else { hero.legL.pivot.rotation.x = 0.15; hero.legR.pivot.rotation.x = -0.25; }
}
// car-vs-car: two circles per car (front & back). The moving car gets pushed back, the other one gets shoved.
// traffic cars collide as two circles along their length, just like other cars (no more invisible bubble)
function trafCircles(t) { const fx = Math.sin(t.rh), fz = Math.cos(t.rh), o = (t.lib.len || 4.4) * 0.27, r = 1.0; return [[t.rx + fx * o, t.rz + fz * o, r], [t.rx, t.rz, r], [t.rx - fx * o, t.rz - fz * o, r]]; }
function carVsTraffic(v, t) {
  let best = null;
  for (const a of carCircles(v)) for (const b of trafCircles(t)) { const dx = a[0] - b[0], dz = a[1] - b[1], d = Math.hypot(dx, dz), pen = a[2] + b[2] - d; if (pen > 0 && d > 1e-3 && (!best || pen > best.pen)) best = { pen, nx: dx / d, nz: dz / d, cx: (a[0] + b[0]) / 2, cz: (a[1] + b[1]) / 2 }; }
  return best;
}
function carCircles(v) { const s = v.s, fx = Math.sin(s.h), fz = Math.cos(s.h), o = v.b.length * 0.28, r = v.b.width * 0.5; return [[s.x + fx * o, s.z + fz * o, r], [s.x, s.z, r], [s.x - fx * o, s.z - fz * o, r]]; }
function collideCars(v, o, spd) {
  if (v.towed || o.towed || v.towing === o || o.towing === v) return false;
  const A = carCircles(v), B = carCircles(o); let hit = false;
  for (const a of A) for (const b of B) {
    const dx = a[0] - b[0], dz = a[1] - b[1], d = Math.hypot(dx, dz), m = a[2] + b[2];
    if (d >= m || d < 1e-3) continue;
    const nx = dx / d, nz = dz / d, push = m - d;
    v.s.x += nx * push * 0.55; v.s.z += nz * push * 0.55; o.s.x -= nx * push * 0.45; o.s.z -= nz * push * 0.45;
    const rel = (v.s.vx - o.s.vx) * -nx + (v.s.vz - o.s.vz) * -nz;
    if (rel > 0) { o.s.vx -= nx * rel * 0.55; o.s.vz -= nz * rel * 0.55; v.s.vx += nx * rel * 0.5; v.s.vz += nz * rel * 0.5; v.s.v *= 0.75; if (o !== ride) o.coast = Math.max(o.coast || 0, 0.8); }
    hit = rel;
  }
  placeVehicle(o);
  const you = v === ride || o === ride;
  if (hit > 5) { const mx = (v.s.x + o.s.x) / 2, mz = (v.s.z + o.s.z) / 2; damageCar(v, hit * 1.1, mx, mz, you); damageCar(o, hit * 1.1, mx, mz, you); }
  if (hit > 6 && (v.hitCd || 0) < time) { v.hitCd = time + 0.5; { const f = focusPos(); if (you || Math.hypot(f.x - v.s.x, f.z - v.s.z) < 35) sfx.thud(); } if (you) shake = Math.max(shake, Math.min(0.5, hit / 30)); spawnParticles((v.s.x + o.s.x) / 2, 0.7, (v.s.z + o.s.z) / 2, ['#ffd23f', '#ffffff', '#888'], 8, 4, 0.35, 0.1); if (v === ride && hit > 16) hurt((hit - 16) * 1.2); }
}
let driveDist = 0;
function updateVehicles(dt) {
  for (const v of [...vehicles]) {
    const c = v.s, s = v.st, b = v.b, driving = v === ride; let hb = false; // hb: handbrake held
    if (!driving && !v.ai && !(v.hp < 45) && Math.abs(c.v) < 0.05 && Math.abs(c.vx) + Math.abs(c.vz) < 0.05) { if (!v.personal && !v.taxi && Math.hypot(c.x - P.x, c.z - P.z) > 220) removeVehicle(v); continue; }
    c.braking = false;
    const dk = driving ? 1 + (lvl('driving') - 1) * 0.02 : 1;
    if (driving && !P.dead) {
      const st = camStick();
      const dead = v.wrecked || (v.hp ?? 100) <= 0;
      const kb = !input.sx && !input.sy && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some(k => input.keys.has(k)); // keyboard driving: W/S throttle and brake, A/D steer (not screen-direction steering)
      const stickMode = (settings.steer || 'screen') === 'screen';
      // stick driving frees up the buttons: horn and headlights instead of drive and brake
      let gas = !dead && ((!stickMode && input.held('a')) || input.keys.has('KeyW') || input.keys.has('ArrowUp'));
      let brk = !dead && ((!stickMode && input.held('x')) || input.keys.has('KeyS') || input.keys.has('ArrowDown'));
      // keyboard H still honks; on screen the horn is gone so the buttons stay simple
      if (input.keys.has('KeyH') && !v.hornK) { sfx.horn(v.cfg?.horn); peds.scare(c.x, c.z, 9); for (const t of traffic) if (Math.hypot(t.rx - c.x, t.rz - c.z) < 25) t.honk = 0; }
      v.hornK = input.keys.has('KeyH');
      if (input.keys.has('KeyL') && !v.lightK) toggleLights();
      v.lightK = input.keys.has('KeyL');
      // stick driving buttons: A = whatever's in front of you (or your phone), B = get out, X = shoot / nitro / lights
      const copBtn = v.police && !b.two && ws.kind !== 'gun' && !dead; // police car: X is the siren
      if (copBtn && input.consume('x')) { v.sirenOn = !v.sirenOn; toast(v.sirenOn ? 'Siren on. Traffic gets out of your way.' : 'Siren off', 1.4); if (!v.sirenOn && v.siren) v.siren.forEach(m => m.visible = false); }
      const nosBtn = stickMode && ws.kind !== 'gun' && !!s.nitro && !dead && !b.two && !copBtn;
      if (stickMode) {
        if (input.consume('a')) v.req = 'a'; // handled at the end of this car's update so nothing below runs without a driver
        if (input.consume('b')) v.req = 'b';
        if (ws.kind !== 'gun' && !nosBtn && !copBtn && !b.two && !b.boat && !dead) hb = input.held('x'); // X: handbrake, for drifting (headlights are automatic)
      }
      // full stick driving: push where you want to go and the car drives there; pull back against it to brake, then reverse
      let thr = 1, stickDrive = false;
      if ((settings.steer || 'screen') === 'screen' && !kb && !gas && !brk && !dead && st.m > 0.3) {
        const fwd = Math.cos(wrapA(Math.atan2(st.x, -st.y) - c.h)); thr = clamp((st.m - 0.3) / 0.62, 0, 1);
        // moving forward: pull back (more than ~110° from where you're going) to brake; once slow, the same pull reverses.
        // reversing: you keep reversing until you push clearly forward again
        if (c.v > 2) { if (fwd > -0.35) gas = true; else brk = true; }
        else if (c.v >= -0.3) { if (fwd > -0.6) gas = true; else brk = true; }
        else { if (fwd > 0.35) gas = true; else brk = true; }
        stickDrive = true;
      }
      const onRoad = !!roadAt(c.x, c.z), sand = c.z > sandLine(c.x), hill = c.x < -300 && !onRoad;
      const top = b.boat ? s.top * dk : s.top * dk * (onRoad ? 1 : Math.min(1, (sand ? 0.45 : hill ? 0.55 : 0.65) * s.off));
      // launch control: hold brake + drive while stopped to build revs, let go of brake to launch
      // Burnout button (stick mode, no gun out): hold to rev and smoke the tyres, steer for donuts, let go to launch
      let burn = gas && brk; // keyboard: brake + drive on the spot = burnout / launch control
      if (burn) { gas = false; brk = false; }
      const nosHeld = nosBtn && input.held('x'), nosOn = (burn || nosHeld) && !!s.nitro;
      v.nos ??= 1; if (!nosOn) v.nos = Math.min(1, v.nos + dt / 25);
      if (nosOn && c.v > 6 && v.nos > 0 && !b.two) { // nitrous: a shove forward and flames from the exhaust until the bottle runs dry
        v.nos = Math.max(0, v.nos - dt / (2.6 * s.nitro)); c.v = Math.min(s.top * 1.35, c.v + s.acc * 1.6 * dt); shake = Math.max(shake, 0.12); burn = false; gas = true;
        if (Math.random() < dt * 40) spawnParticles(c.x - Math.sin(c.h) * b.length * 0.52, 0.45, c.z - Math.cos(c.h) * b.length * 0.52, ['#7fd8ff', '#3d8bff', '#ffffff'], 2, 2, 0.3, 0.18, 0);
        if (!v.nosOn) { v.nosOn = true; sfx.whoosh?.(); navigator.vibrate?.(25); } } else v.nosOn = false;
      if (burn && Math.abs(c.v) < (v.launch > 0 ? 4 : 1.2) && !b.two) {
        // brake + drive = wheelspin (and launch control when you let go of the brake); steer at the same time for donuts
        v.launch = Math.min(1, (v.launch || 0) + dt * 0.9);
        const dn = stickMode ? (st.m > 0.35 ? clamp(wrapA(Math.atan2(st.x, -st.y) - c.h) * 1.5, -1, 1) : 0) : clamp(-st.x, -1, 1);
        if (Math.abs(dn) > 0.25) { c.h = wrapA(c.h + dn * 3.2 * dt); c.v = 2.6; c.steer = dn; v.donut = true; for (let q = 0; q < 2; q++) spawnParticles(c.x - Math.sin(c.h) * b.length * 0.4 + rand(-0.6, 0.6), 0.25, c.z - Math.cos(c.h) * b.length * 0.4 + rand(-0.6, 0.6), [v.cfg?.smokeColor || '#f0f0f0', '#c8c8c8'], 1, 1.2, 1.4, 0.55, -1); if (Math.random() < dt * 2) sfx.click?.(); }
        else { c.v = 0; v.donut = false; }
        for (const w of b.wheels) if (!w.front) w.spin.rotation.x += 40 * dt;
        if (Math.random() < dt * (10 + v.launch * 30)) spawnParticles(c.x - Math.sin(c.h) * b.length * 0.45, 0.25, c.z - Math.cos(c.h) * b.length * 0.45, [v.cfg?.smokeColor || '#e8e8e8', '#bdbdbd'], 1, 1.5, 0.9, 0.4, -1);
        if (v.launch >= 1 && !v.launchReady && !v.donut) { v.launchReady = true; navigator.vibrate?.(15); }
      } else if (!burn && gas && !brk && v.launch > 0.25 && !v.donut) {
        c.v = Math.max(c.v, s.top * 0.42 * v.launch); shake = Math.max(shake, 0.25 * v.launch);
        spawnParticles(c.x - Math.sin(c.h) * b.length * 0.45, 0.25, c.z - Math.cos(c.h) * b.length * 0.45, [v.cfg?.smokeColor || '#e8e8e8', '#bdbdbd'], 14, 3, 1.2, 0.5, -1);
        v.launch = 0; v.launchReady = false;
      } else { v.launch = 0; v.launchReady = false; v.donut = false; }
      // pulling away hard always lights up the rear tyres for a moment; turning hard at speed smokes them too
      if (!burn && gas && !brk && !dead && !b.two && !b.boat && c.v >= 0 && c.v < 7 && (stickDrive ? thr > 0.8 : true) && !v.wasGas) v.spin = 0.55 + (s.acc > 12 ? 0.25 : 0);
      v.wasGas = gas && !brk && c.v < 7;
      if (v.spin > 0 && !b.two) { v.spin -= dt; for (const w of b.wheels) if (!w.front) w.spin.rotation.x += 30 * dt;
        if (Math.random() < dt * 30) spawnParticles(c.x - Math.sin(c.h) * b.length * 0.45 + rand(-0.5, 0.5), 0.25, c.z - Math.cos(c.h) * b.length * 0.45 + rand(-0.5, 0.5), [v.cfg?.smokeColor || '#e8e8e8', '#bdbdbd'], 1, 1.4, 1, 0.45, -1);
        if (!v.spinS) { v.spinS = true; if (driving) sfx.screech?.(0.05); } } else v.spinS = false;
      if (!b.two && !b.boat && Math.abs(c.steer) > 0.55 && c.v > 10 && !dead) { v.slide = (v.slide || 0) + dt;
        if (v.slide > 0.15 && Math.random() < dt * 22) for (const sd of [-1, 1]) spawnParticles(c.x - Math.sin(c.h) * b.length * 0.4 + Math.cos(c.h) * sd * 0.8, 0.22, c.z - Math.cos(c.h) * b.length * 0.4 - Math.sin(c.h) * sd * 0.8, [v.cfg?.smokeColor || '#ececec', '#c4c4c4'], 1, 1, 1.1, 0.5, -1);
        if (v.slide > 0.15 && !v.slideS) { v.slideS = true; sfx.screech?.(0.04); } } else { v.slide = 0; v.slideS = false; }
      if (v.launch > 0) { /* revving on the spot */ }
      else if (gas && !brk) {
        // stick driving: how far you push sets a target speed. Up to about three-quarters of the stick is the local
        // speed limit (easy to cruise at); only the last quarter goes faster than that.
        let topT = top;
        if (stickDrive) { const lim = speedLimit(c.x, c.z) / 2.237; topT = lim ? (thr < 0.78 ? 3 + (Math.min(lim, top) - 3) * (thr / 0.78) : Math.min(lim, top) + (top - Math.min(lim, top)) * ((thr - 0.78) / 0.22)) : Math.max(3, top * thr); } if (c.v < -0.3) c.v = Math.min(0, c.v + 16 * dt); else if (c.v < topT) c.v = Math.min(topT, c.v + s.acc * dt * (1 - Math.max(0, c.v) / (s.top * 1.15))); else c.v = damp(c.v, topT, stickDrive ? 2.5 : 1.2, dt); }
      else if (brk) { if (c.v > 0.3) { c.v = Math.max(0, c.v - 18 * (s.brake || 1) * dt); c.braking = true; } else c.v = Math.max(-s.top * 0.32, c.v - s.acc * 0.6 * dt); }
      else c.v = damp(c.v, 0, (settings.steer || 'screen') === 'screen' ? 1.6 : 0.8, dt); // let go of the stick and the car slows down properly
      if (c.v > top + 0.5) c.v = damp(c.v, top, 1.5, dt);
      let want = -st.x;
      if (kb) want = ((input.keys.has('KeyA') || input.keys.has('ArrowLeft')) ? 1 : 0) - ((input.keys.has('KeyD') || input.keys.has('ArrowRight')) ? 1 : 0);
      else if ((settings.steer || 'screen') === 'screen') {
        // point the stick where you want the car to go on screen; the car turns to face it (reversing: the back of the car follows the stick)
        if (st.m > 0.3) { const rev = c.v < -0.3 || (brk && !gas && c.v < 0.5), face = rev ? c.h + Math.PI : c.h, err = wrapA(Math.atan2(st.x, -st.y) - face); want = clamp(err * 1.5, -1, 1) * (rev ? -1 : 1) * Math.min(1, st.m * 1.3); }
        else want = 0;
      }
      c.steer = damp(c.steer, clamp(want + Math.sin(time * 1.1) * Math.min(1, FX.drunk) * 0.45, -1, 1), 9, dt);
      P.fireCd -= dt; if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) finishReload(); }
      if (stickMode) { if (input.held('x') && ws.kind === 'gun') driveBy(); input.consume('x'); input.consume('y');
        const rq = v.req; v.req = null; if (rq === 'a') { if (action) doAction(action); else openPhone(); } else if (rq === 'b') exitCar(); }
      else { if (input.held('b') && ws.kind === 'gun') driveBy(); input.consume('b'); input.consume('x'); input.consume('a');
        if (input.consume('y')) { if (action) doAction(action); else exitCar(); } }
      driveDist += Math.abs(c.v) * dt; if (driveDist > 250) { driveDist = 0; gainXP('driving', 3); }
    } else if (v.ai && !P.dead) aiDrive(v, c, s, dt);
    else if (v.stolenBack > 0) { v.stolenBack -= dt; c.v = 11; c.steer = 0; if (v.stolenBack <= 0) { removeVehicle(v); continue; } }
    else { v.coast = (v.coast || 0) - dt; c.v = damp(c.v, 0, v.coast > 0 ? 0.45 : 3, dt); c.steer = damp(c.steer, 0, v.coast > 0 ? 0.5 : 6, dt); }
    const spd = Math.abs(c.v);
    const turn = c.steer * s.turn * clamp(spd / 6, 0, 1) * (1 - Math.min(0.45, spd / s.top * 0.45)) * Math.sign(c.v || 1) * (hb && spd > 5 ? 1.55 : 1);
    c.h = wrapA(c.h + turn * dt);
    const fx = Math.sin(c.h), fz = Math.cos(c.h);
    const grip = (hb && spd > 4 ? 1.1 : c.braking && spd > 12 && Math.abs(c.steer) > 0.3 ? 1.8 : 7) * s.grip * dk * (driving ? wetGrip() : 1); // wet roads: slide; handbrake: the back steps out
    if (hb) { c.v = damp(c.v, 0, 0.5, dt); if (spd > 6 && Math.random() < dt * 30) spawnParticles(c.x - fx * b.length * 0.4 + rand(-0.6, 0.6), 0.25, c.z - fz * b.length * 0.4 + rand(-0.6, 0.6), [v.cfg?.smokeColor || '#ececec', '#c4c4c4'], 1, 1.1, 1.2, 0.5, -1); if (spd > 8 && !v.hbS) { v.hbS = true; sfx.screech?.(0.05); } } else v.hbS = false;
    c.vx = damp(c.vx, fx * c.v, grip, dt); c.vz = damp(c.vz, fz * c.v, grip, dt);
    const ox = c.x, oz = c.z; c.x += c.vx * dt; c.z += c.vz * dt;
    const half = b.length * 0.3, r = b.width * 0.55;
    let hit = false;
    carPos.y = c.y || 0; for (const sgn of [1, -1]) { carPos.x = c.x + fx * half * sgn; carPos.z = c.z + fz * half * sgn; if (resolve(carPos, r, 0)) { c.x = carPos.x - fx * half * sgn; c.z = carPos.z - fz * half * sgn; hit = true; } }
    if (b.boat) { if (!boatWater(c.x, c.z)) { c.x = ox; c.z = oz; hit = true; } } // a boat runs aground at the shore
    else if (!walkable(c.x, c.z, false)) { const sk = skyAt(c.x, c.z); if (!(sk && (sk.ramp || (c.y || 0) > sk.y - 1.6))) { c.x = ox; c.z = oz; hit = true; } } // up on a bridge the water below doesn't matter
    for (const o of vehicles) if (o !== v && (o.s.x - c.x) ** 2 + (o.s.z - c.z) ** 2 < 81 && Math.abs((o.s.y || 0) - (c.y || 0)) < 2.5) collideCars(v, o, spd);
    if (hit && spd > 7) damageCar(v, (spd - 6) * 1.6, c.x + fx * b.length * 0.5 * Math.sign(c.v || 1), c.z + fz * b.length * 0.5 * Math.sign(c.v || 1));
    if (hit) { if (spd > 9) { spawnParticles(c.x + fx * 2, 0.7, c.z + fz * 2, ['#ffd23f', '#ffffff', '#888'], 10, 5, 0.4, 0.1); if (driving) shake = Math.max(shake, Math.min(0.6, spd / 40)); { const f = focusPos(); if (driving || Math.hypot(f.x - c.x, f.z - c.z) < 35) sfx.thud(); } } if (driving && spd > 15) hurt((spd - 15) * 1.6); c.v *= -0.25; c.vx *= 0.2; c.vz *= 0.2; }
    if ((driving || v.coast > 0) && spd > 4) for (const p of peds.list) if (Math.hypot(p.x - c.x, p.z - c.z) < r + 0.9 && peds.knock(p, c.vx / spd, c.vz / spd, spd * 0.8)) { sfx.thud(); c.v *= 0.85; if (spd > 9) { p.injured = true; p.t = 40; } if (driving) { crime(p.kind === 'cop' ? 2 : 0.6); witness('runover', p.x, p.z, p); } if (Math.random() < 0.4) dropCash(p.x, p.z, 5 + Math.floor(Math.random() * 25)); peds.scare(p.x, p.z, 20); }
    if (c.braking && spd > 12) spawnParticles(c.x - fx * 1.8, 0.2, c.z - fz * 1.8, '#d8d8d8', 1, 1, 0.6, 0.35, -1);
    placeVehicle(v, dt);
    b.group.rotation.z = b.two ? -c.steer * clamp(spd / 8, 0, 1) * 0.38 : b.boat ? -c.steer * clamp(spd / 10, 0, 1) * 0.16 : clamp((-c.vx * fz + c.vz * fx) * 0.012, -0.08, 0.08);
    if (b.boat && spd > 2) boatWake(v, spd, dt);
    if (b.two && v === ride && !carAnim) riderPose(v, dt);
    else if (b.seat && v === ride && !carAnim) seatedPose(v);
    carSmoke(v, dt);
    for (const w of b.wheels) { w.spin.rotation.x += c.v * dt / b.wr; if (w.front) w.pivot.rotation.y = c.steer * 0.45; }
  }
  const lv = ride || myCar, on = night > 0.25;
  for (const v of vehicles) { if (v.b.blink) setBlink(v.b.blink, v.wrecked ? 0 : v === ride ? gpsTurn(v) : 0); v.b.headM.emissiveIntensity = on && (v !== ride || lightsOn()) ? 2.2 : 0.4; v.b.tailM.emissiveIntensity = v.s.braking ? 3 : on && (v !== ride || lightsOn()) ? 1.2 : 0.4; if (v.b.revM) v.b.revM.emissiveIntensity = v.s.v < -0.4 ? 2.4 : 0; if (v.b.glow) v.b.glow.material.opacity = 0.45 + night * 0.45; }
  for (const v of vehicles) { if (v.b.two) continue; const want = on && !v.wrecked && ((v === ride && lightsOn()) || (!!v.ai && v !== ride)); if (want && !v.beams) { v.beams = headBeams(v.b.width, v.b.length); v.b.group.add(v.beams); } if (v.beams) { v.beams.visible = want; if (v.headBroken) { v.beams.children[0].visible = !v.headBroken['-1']; v.beams.children[1].visible = !v.headBroken['1']; } } } // two cones of light, one per lamp
  if (lv) { const s = lv.s, fx = Math.sin(s.h), fz = Math.cos(s.h); headSpot.intensity = 0; /* the two cones are the headlights now; the old single spotlight pool is gone */ headSpot.position.set(s.x + fx * lv.b.length * 0.5, 1.0, s.z + fz * lv.b.length * 0.5); headTarget.position.set(s.x + fx * 18, 0, s.z + fz * 18); }
  engineSound(!!ride, ride ? Math.max(Math.abs(ride.s.v), (ride.launch || 0) * 30) : 0);
}

// which way the GPS route turns next (only once you're close to the junction): -1 / 0 / +1 in car-local x
function gpsTurn(v) {
  if (!route || route.length < 3 || v.b.two) return 0;
  const c = v.s; let k = 0, bd = 1e9;
  for (let i = 0; i < route.length; i++) { const d = Math.hypot(route[i][0] - c.x, route[i][1] - c.z); if (d < bd) { bd = d; k = i; } }
  if (bd > 14) return 0;
  for (let j = k; j < route.length - 1; j++) {
    if (Math.hypot(route[j][0] - c.x, route[j][1] - c.z) > clamp(8 + Math.abs(c.v) * 0.8, 12, 24)) break; // only signal as you near the junction
    const a = Math.atan2(route[j + 1][0] - route[j][0], route[j + 1][1] - route[j][1]), dh = wrapA(a - c.h);
    if (Math.abs(dh) > 0.7 && Math.abs(dh) < 2.6) return Math.sign(dh);
  }
  return 0;
}
// ================================================================ LANDMARKS: pier fairground, marina, neon strip, stadium, mall, Bay Park
const lmGroup = new THREE.Group(); G.scene.add(lmGroup);
const LM = { wheel: null, carousel: null, boats: [], neon: [], neonMats: [] };
(function buildLandmarks() {
  const M = (c, e) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, emissive: e || '#000000', emissiveIntensity: e ? 0.6 : 0 });
  const box = (g, w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
  // --- fairground on the sand next to the pier: big wheel, carousel, a row of stalls, string lights
  const fy = 0;
  { const g = new THREE.Group(); g.position.set(40, fy, 398); lmGroup.add(g);
    for (const sx of [-1, 1]) { const leg = box(g, 0.35, 11, 0.35, M('#c9ccd2'), sx * 2.2, 5.3, 0); leg.rotation.z = sx * 0.2; }
    const wheel = new THREE.Group(); wheel.position.set(0, 10.6, 0); g.add(wheel);
    const rimM = M('#ffffff', '#ff6fb5'); const rim = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.18, 6, 40), rimM); wheel.add(rim);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, sp = box(wheel, 0.12, 8.5, 0.12, M('#c9ccd2'), Math.cos(a) * 4.25, Math.sin(a) * 4.25, 0); sp.rotation.z = a - Math.PI / 2;
      const cab = new THREE.Group(); cab.position.set(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 0); box(cab, 1.2, 1, 1.1, M(['#e23b3b', '#2f80ed', '#ffd23f', '#4cd964'][i % 4]), 0, -0.7, 0); wheel.add(cab); }
    LM.wheel = wheel; addCollider({ x0: 40 - 3, x1: 40 + 3, z0: 397, z1: 399, h: 3 }); }
  { const g = new THREE.Group(); g.position.set(64, fy, 386); lmGroup.add(g);
    box(g, 7, 0.4, 7, M('#8a5a2a'), 0, 0.2, 0); const top = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.2, 12), M('#e23b3b', '#ff3b8a')); top.position.y = 4.6; g.add(top);
    const spin = new THREE.Group(); g.add(spin); box(spin, 0.3, 3.4, 0.3, M('#ffd23f'), 0, 2, 0);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, pole = box(spin, 0.08, 3.2, 0.08, M('#ffd23f'), Math.cos(a) * 2.6, 2, Math.sin(a) * 2.6); const horse = box(spin, 0.35, 0.55, 1.0, M(['#ffffff', '#ff6fb5', '#38e8ff', '#ffd23f'][i % 4]), Math.cos(a) * 2.6, 1.3, Math.sin(a) * 2.6); horse.rotation.y = -a; horse.userData.a = a; }
    LM.carousel = spin; addCollider({ x: 64, z: 386, r: 3.4 }); }
  for (let i = 0; i < 5; i++) { const g = new THREE.Group(), x = 34 + i * 7.5; g.position.set(x, fy, 414); lmGroup.add(g);
    box(g, 4.4, 1.1, 1.6, M('#f2e6d0'), 0, 0.55, 0); for (const sx of [-2.1, 2.1]) box(g, 0.12, 2.6, 0.12, M('#ffffff'), sx, 1.3, -0.7);
    const aw = box(g, 4.8, 0.2, 2.2, M(['#e23b3b', '#2f80ed', '#ffd23f', '#4cd964', '#ff6fb5'][i]), 0, 2.7, -0.2); aw.rotation.x = -0.15;
    for (let k = 0; k < 3; k++) box(g, 0.45, 0.6, 0.45, M(['#ff6fb5', '#ffd23f', '#38e8ff'][k]), -1.2 + k * 1.2, 1.4, -0.4);
    addCollider({ x0: x - 2.2, x1: x + 2.2, z0: 413.2, z1: 414.8, h: 1.2 }); }
  { const pts = []; for (let i = 0; i <= 40; i++) { const x = 30 + i * 1.1; pts.push(new THREE.Vector3(x, 4.2 + Math.sin(i * 0.8) * 0.3, 410)); }
    for (let i = 0; i < pts.length; i += 2) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: ['#ffd23f', '#ff3b8a', '#38e8ff', '#4cd964'][i % 4] })); b.position.copy(pts[i]); lmGroup.add(b); LM.neon.push(b); } }
  // --- marina: boats tied up along the docks
  const hullCols = ['#ffffff', '#16161b', '#2f80ed', '#c9302c', '#e8e2d6'];
  for (const [x, z, r] of [[-250, 445, 0], [-262, 445, 0], [-252, 456, Math.PI], [-264, 456, Math.PI], [-226, 462, 0], [-214, 462, 0], [-224, 474, Math.PI], [-252, 486, Math.PI], [-264, 474, 0]]) {
    const g = new THREE.Group(); g.position.set(x, WATER_Y + 0.1, z); g.rotation.y = r; lmGroup.add(g);
    const big = Math.random() < 0.35, L = big ? 9 : 6, col = pick(hullCols);
    box(g, 2.4, 0.9, L, M(col), 0, 0.3, 0); const bow = box(g, 2.4, 0.9, 1.6, M(col), 0, 0.3, L / 2 + 0.5); bow.scale.x = 0.55;
    box(g, 2.2, 0.08, L - 0.4, M('#c9a27a'), 0, 0.78, 0); box(g, 1.8, big ? 1.4 : 0.9, big ? 3.2 : 1.8, M('#e8eef2'), 0, big ? 1.5 : 1.25, -0.6);
    if (!big && Math.random() < 0.5) { const mast = box(g, 0.12, 8, 0.12, M('#e8e8ea'), 0, 4.7, 0.6); const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 6.2), new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.DoubleSide })); sail.position.set(0, 4.8, -0.7); sail.rotation.y = Math.PI / 2; g.add(sail); }
    g.userData.ph = Math.random() * 6; LM.boats.push(g);
  }
  // --- neon strip: the street outside the Neon Room club comes alive after dark
  const neonCols = ['#ff3bd2', '#38e8ff', '#ffd23f', '#4cd964', '#ff6a3c', '#b26bff'];
  for (let x = -164; x <= 40; x += 11) for (const sz of [-1, 1]) {
    if (Math.random() < 0.3) continue;
    const col = pick(neonCols), m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.25 }); LM.neonMats.push(m);
    const z = sz * 6.2, w = 2 + Math.random() * 3, sign = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7 + Math.random() * 0.6, 0.12), m); sign.position.set(x + rand(-2, 2), 3.2 + Math.random() * 2.5, z); lmGroup.add(sign);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(5, 0.06, 0.12), m); strip.position.set(x, 0.3, sz * 5.6); lmGroup.add(strip);
  }
})();
function updateLandmarks(dt) {
  if (inside) return;
  if (LM.wheel) LM.wheel.rotation.z += dt * 0.12;
  if (LM.carousel) LM.carousel.rotation.y += dt * 0.6, LM.carousel.children.forEach(c => { if (c.userData.a != null) c.position.y = 1.3 + Math.sin(time * 3 + c.userData.a * 2) * 0.25; });
  for (const b of LM.boats) { b.position.y = WATER_Y + 0.1 + Math.sin(time * 1.2 + b.userData.ph) * 0.12; b.rotation.z = Math.sin(time * 0.9 + b.userData.ph) * 0.04; }
  const glow = clamp(night * 1.3, 0.2, 1); for (const m of LM.neonMats) m.opacity = glow * (0.75 + Math.sin(time * 3 + m.id) * 0.15); for (const b of LM.neon) b.visible = night > 0.3 || Math.floor(time * 2) % 2 === 0;
  joggers(dt); matchDay(dt); stripCrowd(dt);
}
// ---------------- Bay Park joggers (and dogs out with their owners)
const jogs = [];
function parkCentre() { const [c, i, j] = LANDMARK_BLOCKS.bigpark, C = CITIES.find(q => q.id === c); return { x: C.cx + (i + 0.5) * 48, z: C.cz + (j + 0.5) * 48 }; }
function joggers() {
  const pc = parkCentre(), f = focusPos(), near = Math.hypot(pc.x - f.x, pc.z - f.z) < 110 && wet < 0.3 && clockH > 6 && clockH < 21;
  if (near && jogs.length < 5) { const a = rand(0, 6.28), p = eventPed({ top: pick(['tank', 'tshirt', 'crop']), topColor: pick(['#ff6fb5', '#4cd964', '#38e8ff', '#ffd23f', '#ffffff']), pants: 'shorts', pantsColor: '#16161b', shoes: 'sneakers', hat: pick(['cap', 'headband', 'none']), fem: Math.random() < 0.5 }, pc.x + Math.cos(a) * 13, pc.z + Math.sin(a) * 13, { jog: a, dirJ: Math.random() < 0.5 ? 1 : -1, state: 'chase' }); jogs.push(p); if (Math.random() < 0.4 && animals?.leash) animals.leash(p); }
  for (let i = jogs.length - 1; i >= 0; i--) { const p = jogs[i]; if (!near || !peds.list.includes(p)) { const k = peds.list.indexOf(p); if (k >= 0) { peds.list.splice(k, 1); dyn.remove(p.root); } jogs.splice(i, 1); continue; }
    if (p.state === 'down' || p.state === 'flee' || p.angry) continue;
    p.jog += p.dirJ * 0.0045 * (60 / 60) * 3; p.state = 'chase'; p.tx = pc.x + Math.cos(p.jog + p.dirJ * 0.3) * 13; p.tz = pc.z + Math.sin(p.jog + p.dirJ * 0.3) * 13; }
}
// ---------------- match day: every third day the Breakers play at 7pm and fans flood the streets
const fans = [];
const isMatchDay = () => dayN % 3 === 0;
function matchDay() {
  const S = PLACES.find(p => p.id === 'l_stadium'), f = focusPos(), live = isMatchDay() && clockH >= 16 && clockH < 22.5 && Math.hypot(S.x - f.x, S.z - f.z) < 150;
  if (live && fans.length < 18) { const a = rand(0, 6.28), d = rand(8, 40), x = S.x + Math.cos(a) * d, z = S.z + 4 + Math.abs(Math.sin(a)) * d; if (walkable(x, z)) { const home = Math.random() < 0.7; const p = eventPed({ top: pick(['tshirt', 'hoodie', 'tshirt']), topColor: home ? '#2f80ed' : '#c9302c', hat: Math.random() < 0.4 ? 'cap' : 'none', hatColor: home ? '#ffd23f' : '#16161b', fem: Math.random() < 0.4 }, x, z, { state: 'chase', tx: S.x + rand(-3, 3), tz: S.z - 2, fan: true }); fans.push(p); } }
  for (let i = fans.length - 1; i >= 0; i--) { const p = fans[i]; if (!live || !peds.list.includes(p)) { const k = peds.list.indexOf(p); if (k >= 0) { peds.list.splice(k, 1); dyn.remove(p.root); } fans.splice(i, 1); continue; } if (p.state === 'chase' && Math.hypot(p.x - p.tx, p.z - p.tz) < 1.5) { p.state = 'talk'; p.lookX = S.x; p.lookZ = S.z - 10; } }
}
// ---------------- the neon strip fills up at night
const stripPeds = [];
function stripCrowd() {
  const f = focusPos(), on = night > 0.5 && f.x > -175 && f.x < 50 && Math.abs(f.z) < 40 && wet < 0.4;
  if (on && stripPeds.length < 10) { const x = rand(-160, 36), z = pick([-5.2, 5.2]) + rand(-0.6, 0.6); if (Math.hypot(x - f.x, z - f.z) > 18 && walkable(x, z)) { const p = eventPed({ top: pick(['crop', 'tank', 'jacket', 'tshirt']), topColor: pick(['#ff6fb5', '#16161b', '#e23b3b', '#ffd23f', '#9b51e0', '#ffffff']), pants: pick(['skirt', 'jeans']), fem: Math.random() < 0.55, eyewear: 'none' }, x, z, { state: 'talk', lookX: x + rand(-2, 2), lookZ: z + rand(-2, 2) }); stripPeds.push(p); } }
  for (let i = stripPeds.length - 1; i >= 0; i--) { const p = stripPeds[i]; if (!on || !peds.list.includes(p)) { const k = peds.list.indexOf(p); if (k >= 0 && Math.hypot(p.x - f.x, p.z - f.z) > 30) { peds.list.splice(k, 1); dyn.remove(p.root); } stripPeds.splice(i, 1); } }
}
// ---------------- landmark interactions
async function openRide(p) {
  const price = p.ride === 'wheel' ? 8 : 5; if (money < price) { toast(`It's ${fmt(price)}.`); return; }
  spend(price);
  const withHer = date && !date.inCar && Math.hypot(date.x - P.x, date.z - P.z) < 12;
  fade(() => { advanceTime(0.3); feed({ mood: p.ride === 'wheel' ? 12 : 8 }); if (withHer) { date.interest += p.ride === 'wheel' ? 14 : 8; bumpRel(date.id, 5, false); hearts(date.x, date.z, 10); }
    toast(p.ride === 'wheel' ? (withHer ? `Top of the wheel, the whole bay lit up below. ${date.name} kissed you.` : 'Round and round above the bay. The view is unreal.') : (withHer ? `${date.name} can't stop laughing on the painted horses.` : 'You rode the carousel. A kid stared at you the whole time.'), 3.2); });
}
async function openCarny() {
  const opts = [{ label: 'Hook-a-duck ($5)', cls: 'big', fn: () => game(0.35) }, { label: 'Ring toss ($5)', fn: () => game(0.25) }, { label: 'Leave', fn: closeModal }];
  function game(chance) { closeModal(); if (money < 5) { toast('That\'s $5.'); return; } spend(5); if (Math.random() < chance + lvl('charm') * 0.01) { feed({ mood: 10 }); const giant = Math.random() < 0.3; toast(giant ? 'WINNER! A giant teddy bear!' : 'Winner! A little plush toy.', 2.6); sfx.cash(); if (date && Math.hypot(date.x - P.x, date.z - P.z) < 12) { date.interest += giant ? 15 : 8; toast(`You gave ${date.name} the ${giant ? 'giant teddy' : 'plush'}. She loves it.`, 3); } } else { toast(pick(['So close!', 'Rigged, surely.', 'Nope. Try again?']), 1.8); sfx.fail(); } }
  modal(`<div class="big-ico">${svg('target', 'big')}</div><h3>Fairground Stalls</h3><p>Win a prize. Win her a prize.</p>`, opts);
}
async function openStadium(p) {
  const nextIn = (3 - dayN % 3) % 3, live = isMatchDay() && clockH >= 17 && clockH < 21;
  if (!live) { toast(isMatchDay() ? (clockH < 17 ? 'Gates open at 5pm. Kick-off at 7.' : 'The match is over. Fans are heading home.') : `No match today. Next home game in ${nextIn || 3} day${(nextIn || 3) > 1 ? 's' : ''}, 7pm.`, 3); return; }
  modal(`<div class="big-ico">${svg('ball', 'big')}</div><h3>Bay City Breakers vs ${pick(['Harbor Hawks', 'Desert Kings', 'Valley Rovers', 'Coast United'])}</h3><p>Ticket $45. Bet on the Breakers at the kiosk.</p>`, [
    { label: 'Ticket ($45)', cls: 'big', fn: () => watch(0) }, { label: 'Ticket + $200 on the Breakers', fn: () => watch(200) }, { label: 'Not tonight', fn: closeModal }]);
  function watch(bet) { closeModal(); if (money < 45 + bet) { toast('Not enough cash.'); return; } spend(45 + bet); const win = Math.random() < 0.55;
    fade(() => { advanceTime(2); feed({ mood: win ? 22 : 4, hunger: 10 }); if (bet && win) addMoney(bet * 2); if (date && Math.hypot(date.x - P.x, date.z - P.z) < 15) date.interest += 10;
      toast(win ? `Breakers win ${pick(['2-1', '3-0', '1-0', '3-2'])}! The stadium is shaking.${bet ? ` Bet pays ${fmt(bet * 2)}.` : ''}` : `Breakers lose ${pick(['0-1', '1-2', '0-3'])}. The walk out is quiet.${bet ? ' There goes the bet.' : ''}`, 3.5); }); }
}
// ---------------- speedboats: hire one at the shore, open water is yours
const boatWater = (x, z) => x > WORLD.x0 + 10 && x < WORLD.x1 - 6 && z < WORLD.z1 + 200 && groundH(x, z) < WATER_Y - 0.5 && !onPier(x, z);
const BOAT_COLS = [['#ffffff', '#2f80ed'], ['#16161b', '#ff3b4a'], ['#ffffff', '#ff6fb5'], ['#ffd23f', '#16161b'], ['#e23b3b', '#ffffff'], ['#1fb5a8', '#ffffff']];
function boatWake(v, spd, dt) {
  const c = v.s, fx = Math.sin(c.h), fz = Math.cos(c.h), L = v.b.length;
  if (Math.random() < dt * (8 + spd)) for (const sd of [-1, 1]) spawnParticles(c.x - fx * L * 0.5 + Math.cos(c.h) * sd * 0.9, WATER_Y + 0.15, c.z - fz * L * 0.5 - Math.sin(c.h) * sd * 0.9, ['#ffffff', '#d8f2ff'], 1, 1.2, 1.4, 0.35, 0); // white wake behind
  if (spd > 12 && Math.random() < dt * spd * 0.6) spawnParticles(c.x + fx * L * 0.3, WATER_Y + 0.4, c.z + fz * L * 0.3, ['#ffffff', '#bfe8ff'], 2, 3, 0.5, 0.12, 9); // spray off the bow
}
function hireRide(p) { // a dune buggy or dirt bike for the trails, waiting on the trail
  if (ride) { toast('Get out of the car first.'); return; }
  if (money < 40) { toast('Hire is $40.'); return; }
  const c = canyonNear(p.x, p.z); if (!c || c.d > 40) { toast('No trail nearby.'); return; }
  const q = c.q, nb = q.R.s[Math.min(q.R.s.length - 1, q.i + 1)], h = Math.atan2(nb.x - q.x, nb.z - q.z);
  spend(40); sfx.coin();
  fade(() => { const cfg = p.ride === 'moto' ? { body: 'moto', bodyColor: pick(['#ff8a2a', '#e23b3b', '#2f80ed']), engine: 'sport', tyres: 'offroad', name: 'Dirt bike' } : { ...CAR_PRESETS['Beach Buggy'], bodyColor: pick(['#ffd23f', '#ff8a2a', '#4cd964', '#e23b3b']), name: 'Hire buggy' };
    const v = makeVehicle(cfg, q.x, q.z, h, false); v.rental = true; v.paid = true; enterVehicle(v, false); toast(p.ride === 'moto' ? 'Dirt bike hired: $40. Hit the trails.' : 'Buggy hired: $40. Get it dirty.', 2.6); }, true);
}
function hireBoat(p) {
  if (ride) { toast('Get out of the car first.'); return; }
  if (money < 60) { toast('Boat hire is $60.'); return; }
  let best = null, bd = 1e9; // the nearest open water with room for a boat
  for (let r = 6; r < 40 && !best; r += 3) for (let a = 0; a < 6.28; a += 0.3) { const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r; if (!boatWater(x, z) || !boatWater(x + 4, z) || !boatWater(x - 4, z) || !boatWater(x, z + 4) || !boatWater(x, z - 4) || solidPoint(x, z, 0)) continue; const d = Math.hypot(x - p.x, z - p.z); if (d < bd) { bd = d; best = { x, z, h: Math.atan2(x - p.x, z - p.z) }; } }
  if (!best) { toast('No room on the water right now.'); return; }
  spend(60); sfx.coin();
  fade(() => { const [bc, ac] = pick(BOAT_COLS), v = makeVehicle({ body: 'speedboat', bodyColor: bc, accentColor: ac, name: 'Hire boat' }, best.x, best.z, best.h, false); v.rental = true; v.paid = true; enterVehicle(v, false); toast('Boat hired: $60. Open water. Mind the bridges.', 2.6); }, true);
}
// a few speedboats out on the water: round the bay, round the island, up the river mouth
const BOAT_LOOPS = [[[-150, 520], [150, 560], [420, 520], [150, 530]], [[850, -300], [870, 200], [880, 400], [1260, 400], [1260, -780], [870, -780]], [[830, 280], [840, 460], [620, 480], [700, 560]], [[-300, 520], [-80, 600], [-260, 620]]];
const ambBoats = [];
function updateAmbientBoats(dt) {
  if (inside) { for (const a of ambBoats) a.g.visible = false; return; }
  if (!ambBoats.length) for (const [i, L] of BOAT_LOOPS.entries()) { const [bc, ac] = BOAT_COLS[i % BOAT_COLS.length], b = buildCar({ body: 'speedboat', bodyColor: bc, accentColor: ac }); dyn.add(b.group); ambBoats.push({ g: b.group, L, k: 0, x: L[0][0], z: L[0][1], h: 0, v: 14 + i * 2 }); }
  for (const a of ambBoats) { a.g.visible = true; const [tx, tz] = a.L[(a.k + 1) % a.L.length], d = Math.hypot(tx - a.x, tz - a.z); if (d < 12) a.k = (a.k + 1) % a.L.length;
    const want = Math.atan2(tx - a.x, tz - a.z); a.h += wrapA(want - a.h) * Math.min(1, dt * 0.8); a.x += Math.sin(a.h) * a.v * dt; a.z += Math.cos(a.h) * a.v * dt;
    a.g.position.set(a.x, WATER_Y + 0.25 + Math.sin(time * 1.6 + a.v) * 0.08, a.z); a.g.rotation.set(-0.08 + Math.sin(time * 2.3 + a.v) * 0.03, a.h, 0, 'YXZ');
    if (Math.hypot(a.x - P.x, a.z - P.z) < 120 && Math.random() < dt * 14) spawnParticles(a.x - Math.sin(a.h) * 3.2, WATER_Y + 0.15, a.z - Math.cos(a.h) * 3.2, ['#ffffff', '#d8f2ff'], 1, 1.2, 1.4, 0.35, 0); }
}
function openMarina() {
  modal(`<div class="big-ico">${svg('wave', 'big')}</div><h3>Bay Marina</h3><p>Harbour cruises at sunset, deep-sea fishing trips, and the boats are lovely to look at.</p>`, [
    { label: 'Harbour cruise ($40)', cls: 'big', fn: () => { closeModal(); if (money < 40) { toast('That\'s $40.'); return; } spend(40); const her = date && Math.hypot(date.x - P.x, date.z - P.z) < 15; fade(() => { advanceTime(1.5); feed({ mood: 16 }); if (her) { date.interest += 16; bumpRel(date.id, 6, false); } toast(her ? `Sunset on the water with ${date.name}. She rested her head on your shoulder.` : 'An hour out on the bay. Dolphins! Actual dolphins.', 3.2); }); } },
    { label: 'Fishing trip ($60)', fn: () => { closeModal(); if (money < 60) { toast('That\'s $60.'); return; } spend(60); fade(() => { advanceTime(3); const fish = Math.random(); const pay = fish < 0.15 ? 400 : fish < 0.6 ? 90 : 0; if (pay) addMoney(pay); feed({ mood: 10, hunger: -10 }); toast(pay >= 400 ? 'You landed a huge tuna! Sold it at the dock for $400.' : pay ? 'A good catch. Sold it for $90.' : 'Nothing biting today. Nice day on the water though.', 3.2); }); } },
    { label: 'Leave', fn: closeModal }]);
}
async function mallFood() {
  modal(`<div class="big-ico">${svg('food', 'big')}</div><h3>Food Court</h3>`, [
    { label: 'Burger meal ($9)', cls: 'big', fn: () => { closeModal(); if (money < 9) return; spend(9); feed({ hunger: 45, mood: 4, fat: 0.006 }); toast('Burger, fries, a shake. Elite.'); } },
    { label: 'Sushi box ($14)', fn: () => { closeModal(); if (money < 14) return; spend(14); feed({ hunger: 38, mood: 6 }); toast('Fresh sushi. Feeling fancy.'); } },
    { label: 'Smoothie ($6)', fn: () => { closeModal(); if (money < 6) return; spend(6); feed({ hunger: 12, energy: 8 }); toast('Berry smoothie. Brain freeze.'); } },
    { label: 'Leave', fn: closeModal }]);
}

// ================================================================ FARMS: barns, silos, hay and tractors ploughing the rows
const farmGroup = new THREE.Group(); G.scene.add(farmGroup);
(function buildFarms() {
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true });
  const red = M('#a8302a'), white = M('#f2ece0'), roof = M('#4a4a50'), silo = M('#c8ccd4'), hay = M('#e0c060'), wood = M('#7a5230');
  const box = (w, h, d, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; farmGroup.add(o); return o; };
  for (const f of FIELDS) {
    const bx = f.x1 - 10, bz = f.z0 + 9;
    box(10, 5, 12, red, bx, 0, bz);                                   // barn
    for (const s of [-1, 1]) { const r = box(6.4, 0.25, 12.6, roof, bx + s * 2.6, 6.0, bz); r.rotation.z = s * -0.62; }
    box(3.2, 4, 0.12, white, bx, 0, bz + 6.02); box(0.2, 4, 0.14, white, bx, 0, bz + 6.05);       // big doors
    box(0.18, 4.6, 0.16, white, bx - 1.5, 0, bz + 6.06, 0).rotation.z = 0.7; box(0.18, 4.6, 0.16, white, bx + 1.5, 0, bz + 6.06).rotation.z = -0.7;
    addCollider({ x0: bx - 5, x1: bx + 5, z0: bz - 6, z1: bz + 6, h: 8 });
    const sx = bx - 9.5, sz = bz - 2;                                // silo
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 10, 14), silo); sl.position.set(sx, 5, sz); sl.castShadow = true; farmGroup.add(sl);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.25, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#9aa0aa')); dome.position.set(sx, 10, sz); farmGroup.add(dome);
    addCollider({ x: sx, z: sz, r: 2.3 });
    for (let i = 0; i < 5; i++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 12).rotateZ(Math.PI / 2), hay); h.position.set(bx - 4 + i * 1.6, 0.75, bz + 9.5 + (i % 2) * 1.8); h.castShadow = true; farmGroup.add(h); }
    for (let i = 0; i < 6; i++) box(0.14, 1.1, 0.14, wood, f.x0 + 2 + i * 3, 0, f.z0 + 1);    // a bit of fence by the yard
    box(17, 0.1, 0.08, wood, f.x0 + 9.5, 0.8, f.z0 + 1); box(17, 0.1, 0.08, wood, f.x0 + 9.5, 0.45, f.z0 + 1);
  }
})();
const TRACTOR_CFG = { ...DEFAULT_CAR, body: 'tractor', bodyColor: '#2f8a3a', accentColor: '#ffd23f', name: 'Tractor' };
function ploughTarget(v, c) {
  const F = v.field; v.lane ??= F.x0 + 8; v.end ??= 1;
  const tz = v.end > 0 ? F.z1 - 8 : F.z0 + 22;
  if (Math.abs(c.z - tz) < 4 && Math.abs(c.x - v.lane) < 4) { v.end = -v.end; v.lane += 6; if (v.lane > F.x1 - 22) v.lane = F.x0 + 8; }
  return { x: v.lane, z: v.end > 0 ? F.z1 - 8 : F.z0 + 22 };
}
let farmT = 0;
function updateFarm(dt) {
  if (inside) return;
  const f = focusPos();
  for (const v of vehicles) if (v.farm && v.ai === 'plough' && Math.abs(v.s.v) > 1 && Math.random() < dt * 8) spawnParticles(v.s.x - Math.sin(v.s.h) * 2, 0.4, v.s.z - Math.cos(v.s.h) * 2, ['#8a6a44', '#a07a50', '#6a5034'], 1, 1, 1.0, 0.45, -1);
  farmT -= dt; if (farmT > 0) return; farmT = 2;
  for (const F of FIELDS) {
    const dx = Math.max(F.x0 - f.x, 0, f.x - F.x1), dz = Math.max(F.z0 - f.z, 0, f.z - F.z1), d = Math.hypot(dx, dz);
    if (F.tractor && !vehicles.includes(F.tractor)) F.tractor = null;
    if (!F.tractor && d < 150) { const v = makeVehicle(TRACTOR_CFG, F.x0 + 8, F.z0 + 24, 0, false); v.ai = 'plough'; v.field = F; v.farm = true; F.tractor = v; }
    else if (F.tractor && d > 260 && ride !== F.tractor) { removeVehicle(F.tractor); F.tractor = null; }
    else if (F.tractor && F.tractor.ai === 'plough' && d > 260) F.tractor = null;
  }
}
// ================================================================ THE BAY LINE: a train shuttling between three stations, with a level crossing
const train = { x: RAIL.stations[1].x, dir: 1, v: 0, stop: 6, si: 1, g: null, cross: null, hornT: 0 };
function buildTrain() {
  const g = new THREE.Group(), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o }), box = (w, h, d, m, x, y, z, parent = g) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const red = M('#e23b3b'), white = M('#e8ecf2'), blue = M('#2f80ed'), dark = M('#1a1b20'), glass = M('#9fd8ff', { emissive: '#6fb8ff', emissiveIntensity: 0.25 }), yellow = M('#ffd23f');
  const head = M('#ffffff', { emissive: '#fff2b0', emissiveIntensity: 1 });
  for (let k = -1; k <= 1; k++) { // three cars, 12m each, along x
    const cx = k * 12.6, loco = k !== 0;
    box(12, 2.8, 3.1, loco ? red : white, cx, 2.1, 0); box(12.02, 0.35, 3.12, blue, cx, 1.6, 0);
    for (let w = -4.5; w <= 4.5; w += 1.8) for (const sz of [-1.56, 1.56]) box(1.2, 0.8, 0.04, glass, cx + w, 2.6, sz);
    box(11.6, 0.3, 2.9, dark, cx, 3.6, 0);
    for (const wx of [-4, 4]) for (const sz of [-1.2, 1.2]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12).rotateX(Math.PI / 2), dark); wh.position.set(cx + wx, 0.62, sz); g.add(wh); }
    if (loco) { const nose = k * 6.3; box(0.4, 1.2, 2.6, yellow, cx + nose, 1.5, 0); box(0.1, 0.8, 2.2, glass, cx + nose * 1.002, 2.7, 0); for (const sz of [-0.9, 0.9]) box(0.12, 0.3, 0.4, head, cx + nose * 1.01, 1.6, sz); }
  }
  dyn.add(g); return g;
}
function buildCrossing() { // barrier arms + flashing lights where the line crosses the north highway (x = 0)
  const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }), arms = [], lamps = [];
  for (const [sx, sz] of [[-8, RAIL.z + 4.5], [8, RAIL.z - 4.5]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.6, 0.25), M('#e8e8e8')); post.position.set(sx, 1.3, sz); g.add(post);
    const pivot = new THREE.Group(); pivot.position.set(sx, 1.2, sz); g.add(pivot);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.18, 0.18), M('#ff3b3b')); arm.position.x = -Math.sign(sx) * 3.75; pivot.add(arm);
    for (let i = 0; i < 3; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.2), M('#ffffff')); st.position.x = -Math.sign(sx) * (1.2 + i * 2.2); pivot.add(st); }
    arms.push({ pivot, s: Math.sign(sx) });
    for (const dz of [-0.25, 0.25]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), new THREE.MeshBasicMaterial({ color: '#3a0d10' })); l.position.set(sx, 2.4, sz + dz); g.add(l); lamps.push(l); }
  }
  dyn.add(g); return { g, arms, lamps, down: 0 };
}
const LAMP_ON = new THREE.MeshBasicMaterial({ color: '#ff2a2a' }), LAMP_OFF = new THREE.MeshBasicMaterial({ color: '#3a0d10' });
let trainRide = null;
// ---------------- Bay Metro: an elevated loop through downtown; take the stairs at a station, ride, get off anywhere
const metro = { s: METRO.stations[0].s, v: 0, stop: 8, si: 0, g: null };
function buildMetro() {
  const g = new THREE.Group(), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, ...o }), white = M('#eef1f5'), yel = M('#ffd23f'), dark = M('#1a1b20'), glass = M('#9fd8ff', { emissive: '#6fb8ff', emissiveIntensity: 0.3 });
  const cars = []; for (let k = 0; k < 3; k++) { const c = new THREE.Group(); const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; c.add(o); };
    box(2.9, 2.7, 11.6, white, 0, 1.75, 0); box(2.92, 0.35, 11.62, yel, 0, 0.75, 0); box(2.6, 0.3, 11.2, dark, 0, 3.2, 0);
    for (let w = -4.4; w <= 4.4; w += 1.7) for (const sx of [-1.47, 1.47]) box(0.04, 0.9, 1.2, glass, sx, 2.2, w);
    if (k === 0) { box(2.4, 1.0, 0.1, glass, 0, 2.2, 5.85); box(2.6, 0.3, 0.12, yel, 0, 1.2, 5.85); }
    g.add(c); cars.push(c); }
  g.userData.cars = cars; dyn.add(g); return g;
}
function updateMetro(dt) {
  if (inside) { if (metro.g) metro.g.visible = false; return; }
  metro.g ||= buildMetro(); metro.g.visible = true; const T = metro, st = METRO.stations, L = METRO.len;
  if (T.stop > 0) { T.stop -= dt; T.v = 0; if (T.stop <= 0) T.si = (T.si + 1) % st.length; }
  else { const d = ((st[T.si].s - T.s) % L + L) % L; T.v = Math.min(cityAt(METRO.at(T.s).x, METRO.at(T.s).z, 0)?.id === 'main' ? 16 : 26, Math.max(1.2, Math.sqrt(Math.max(0, 2 * 1.8 * d))), T.v + 4 * dt); // quicker out between the towns T.s += T.v * dt;
    if (d <= 0.4 || d > L - 1) { T.s = st[T.si].s; T.stop = 10; T.v = 0; if (trainRide?.metro) toast(`${st[T.si].name}. Tap "Get off" or stay on.`, 3); } }
  T.g.userData.cars.forEach((c, k) => { const a = METRO.at(T.s - k * 12.2); c.position.set(a.x, METRO.Y - 0.15, a.z); c.rotation.y = a.h; });
  if (trainRide?.metro) { const a = METRO.at(T.s - 12.2); P.x = a.x; P.z = a.z; P.y = METRO.Y + 0.2; }
}
function metroEta(si) { const st = METRO.stations, T = metro; if (T.si === si && T.stop > 0) return 0; let d = ((st[si].s - T.s) % METRO.len + METRO.len) % METRO.len, stops = 0; for (let i = 0; i < st.length; i++) { const k = (T.si + i) % st.length; if (k === si) break; stops++; } return Math.round(d / 18 + stops * 10 + Math.max(0, T.stop)); }
function boardMetro(si) {
  if (!(metro.si === si && metro.stop > 0.5)) { toast(`Next Bay Metro in about ${metroEta(si)}s. Wait here.`, 2.4); return; }
  if (money < 2) { toast('A Metro ticket is $2.'); return; }
  spend(2); fade(() => { trainRide = { metro: true }; heroRoot.visible = false; sfx.coin(); toast('Bay Metro: $2. Enjoy the view.', 2.4); }, true);
}
function leaveMetro() { const st = METRO.stations[metro.si]; fade(() => { trainRide = null; heroRoot.visible = true; P.x = st.tower.x + (st.ox ? -st.ox * 2.2 : 0); P.z = st.tower.z + (st.oz ? -st.oz * 2.2 : 0); P.y = 0; updateCamera(0, true); toast(`${st.name} station.`, 2); }, true); }
function updateTrain(dt) {
  if (inside) { if (train.g) train.g.visible = false; return; }
  train.g ||= buildTrain(); train.g.visible = true;
  const T = train, st = RAIL.stations;
  if (T.stop > 0) { T.stop -= dt; T.v = 0; if (T.stop <= 0) { if (T.si === 0) T.dir = 1; if (T.si === st.length - 1) T.dir = -1; T.si += T.dir; } }
  else {
    const target = st[T.si].x, d = (target - T.x) * T.dir;
    T.v = Math.min(17, Math.max(1.2, Math.sqrt(Math.max(0, 2 * 1.6 * d))), T.v + 4 * dt);
    T.x += T.dir * T.v * dt;
    if (d <= 0.3) { T.x = target; T.stop = 12; T.v = 0; if (trainRide) toast(`${st[T.si].name}. Tap "Get off" or stay on.`, 3); else if (Math.hypot(P.x - T.x, P.z - RAIL.z) < 60) toast(`Bay Line train at ${st[T.si].name}`, 2); }
  }
  T.g.position.set(T.x, 0.32, RAIL.z);
  // crossing at the highway

  // horn when it's coming up on the crossing or the player
  T.hornT -= dt; const f = focusPos();
  if (T.v > 8 && T.hornT <= 0 && (Math.abs(T.x) < 90 && Math.abs(T.x) > 30 || Math.hypot(f.x - T.x, f.z - RAIL.z) < 60)) { T.hornT = 7; const A = audio(); if (A) { sfx.note(311, A.currentTime, 0.9, 'sawtooth', 0.04, 900); sfx.note(392, A.currentTime, 0.9, 'sawtooth', 0.035, 900); } }
  // anything on the tracks gets hit
  if (T.v > 2) {
    const x0 = T.x - 19, x1 = T.x + 19, z0 = RAIL.z - 2, z1 = RAIL.z + 2, pushZ = (z) => (z < RAIL.z ? -1 : 1);
    if (!trainRide && !ride && P.x > x0 && P.x < x1 && P.z > z0 && P.z < z1 && P.y < 3 && P.y > -0.8) { hurt(45 + T.v * 2); P.kx = T.dir * T.v; P.kz = pushZ(P.z) * 8; P.vy = 6; sfx.thud(); shake = 0.8; }
    for (const v of vehicles) if (v !== trainRide && v.s.x > x0 - 2 && v.s.x < x1 + 2 && Math.abs(v.s.z - RAIL.z) < 3.5 && (v.s.y ?? 0) > -1) { damageCar(v, T.v * 4, v.s.x, RAIL.z); v.s.vx += T.dir * T.v; v.s.vz += pushZ(v.s.z) * 10; v.s.z = RAIL.z + pushZ(v.s.z) * 3.6; v.s.v = 0; if (v === ride) { shake = 0.9; sfx.boom(); } }
    for (const p of peds.list) if (p.x > x0 && p.x < x1 && Math.abs(p.z - RAIL.z) < 2) peds.knock(p, T.dir, pushZ(p.z), 14);
  }
  if (trainRide && !trainRide.metro) { P.x = T.x; P.z = RAIL.z; P.y = 0.6; }
}
function boardTrain() {
  if (money < 3) { toast('A ticket is $3.'); return; }
  spend(3); trainRide = { from: train.si }; heroRoot.visible = false; sfx.coin(); toast(`Ticket bought: $3. Next stop: ${RAIL.stations[train.si + (train.si === 0 ? 1 : train.si === RAIL.stations.length - 1 ? -1 : train.dir)].name}`, 3);
}
function leaveTrain() {
  trainRide = null; heroRoot.visible = true; P.x = train.x + rand(-6, 6); P.z = RAIL.z + 4.6; P.y = 0.48; P.face = 0; updateCamera(0, true); sfx.click();
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
    case 'cop': return { ...COP_CFG, skin: base.skin, hairColor: base.hairColor };
    case 'guard': return { ...COP_CFG, skin: base.skin, hairColor: base.hairColor, topColor: '#3a4466', hatColor: '#3a4466', accent: '#c8ccd4', build: 1.2 };
    case 'inmate': return { ...base, ...JUMPSUIT, top: r() < 0.25 ? 'tank' : 'long', shoeColor: '#e8e8e8', facialHair: c(['none', 'stubble', 'goatee', 'beard']), hair: c(['buzz', 'short', 'afro', 'buzz', 'ponytail']) };
    case 'cook': return { ...base, top: 'long', topColor: '#ffffff', pants: 'jeans', pantsColor: '#3a3d45', shoes: 'boots', shoeColor: '#16161b', hat: 'beanie', hatColor: '#ffffff', facialHair: 'none' };
    case 'fed': return { ...base, top: 'suit', topColor: '#16161b', accent: '#ffffff', pants: 'jeans', pantsColor: '#16161b', shoes: 'boots', shoeColor: '#16161b', eyewear: 'shades', hair: 'short', facialHair: 'none' };
    case 'bookie': return { ...base, top: 'suit', topColor: '#3a3d45', accent: '#d4af37', pants: 'jeans', pantsColor: '#16161b', shoes: 'boots', shoeColor: '#16161b', eyewear: 'shades', hat: 'none', facialHair: 'goatee' };
    case 'nurse': return { ...base, top: 'tshirt', topColor: '#7ad1c9', pants: 'jeans', pantsColor: '#7ad1c9', shoes: 'sneakers', shoeColor: '#ffffff', hat: 'none' };
    case 'doctor': return { ...base, top: 'long', topColor: '#ffffff', pants: 'jeans', pantsColor: '#3a5fa0', shoes: 'boots', shoeColor: '#16161b', eyewear: 'glasses', hat: 'none' };
    case 'professor': return { ...base, top: 'suit', topColor: '#6b4a33', accent: '#e8e2d6', pants: 'jeans', pantsColor: '#3a3d45', shoes: 'boots', shoeColor: '#5a3a20', eyewear: 'glasses', hair: 'short', hairColor: '#9a9a9a', facialHair: 'beard' };
    case 'pastor': return { ...base, top: 'suit', topColor: '#16161b', accent: '#ffffff', pants: 'jeans', pantsColor: '#16161b', shoes: 'boots', shoeColor: '#16161b', hair: 'short', hairColor: '#9a9a9a', eyewear: 'glasses', facialHair: 'none' };
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
const PLACE_COLORS = { boats: '#38e8ff', rides: '#ff8a2a', biz: '#ff8a2a', ride: '#ff6fb5', carny: '#ffd23f', stadium: '#2f80ed', marina: '#38e8ff', tattoo: '#ff5a8a', dealer: '#4cd964', clothes: '#ff6fb5', barber: '#38e8ff', game: '#ffd23f', chop: '#ff8a2a', race: '#ff3b4a', property: '#b26bff', guns: '#ff5a3c', venue: '#ffb35c', job: '#ffd23f', customer: '#7dff9a' };
const NPC_ROLE = { dealer: 'dealer', job: 'dispatcher' };
const npcs = [];
PLACES.forEach((p, i) => {
  const outdoorNpc = !!NPC_ROLE[p.kind];
  p.pitch = 180 + ((i * 97) % 260);
  if (outdoorNpc) { p.cfg = npcCfg(NPC_ROLE[p.kind], i); p.npcName = p.npc || nameFor(p.id); npcs.push({ place: p, x: p.x, z: p.z, fig: null, face: 0, t: Math.random() * 5, cfg: p.cfg }); }
  makeMarker(p.x, p.z, p.icon, PLACE_COLORS[p.kind] || '#ffd23f', { place: p, car: !!p.car, npc: outdoorNpc });
});
for (const p of PROPERTIES) p.marker = makeMarker(p.x, p.z, 'house', PLACE_COLORS.property, { place: { ...p, kind: 'property' } });
// ================================================================ BUSINESSES you can buy: daily takings pile up in the till, go there to collect
const BIZ = {
  burger: { name: 'Bay Burger', price: 35000, base: 340, mgr: 'Dee', mgrFem: true, shift: true, pitch: 'Grill\'s hot, fries are crispy, and the owner\'s retiring to Florida.', upg: ['New neon sign', 'Second grill', 'Delivery bikes', 'Late-night hours'] },
  laundry: { name: 'Suds Laundromat', price: 15000, base: 150, mgr: 'Mr Okafor', mgrFem: false, shift: false, pitch: 'Coin machines, steady money. Nobody gets rich, nobody goes broke.', upg: ['New dryers', 'Wi-Fi and coffee', 'Wash-and-fold service', 'Second shop front'] },
  carwash: { name: 'Shine Hand Car Wash', price: 22000, base: 230, mgr: 'Javi', mgrFem: false, shift: false, pitch: 'Sunny days we\'re rammed. Rainy days... we sit about.', upg: ['Pressure washers', 'Wax and valet', 'Second bay', 'Detailing service'] },
};
const bizOf = k => (stats.biz ||= {})[k];
const bizIncome = k => { const B = BIZ[k], b = bizOf(k); return Math.round(B.base * (0.55 + (b.rep ?? 50) / 100) * (1 + (b.upg || 0) * 0.2)); };
function bizNewDay() {
  const out = [];
  for (const k in (stats.biz || {})) { const b = stats.biz[k], B = BIZ[k], P2 = PLACES.find(p => p.biz === k); if (!B || !P2) continue;
    let inc = bizIncome(k); if (k === 'carwash' && wet > 0.3) inc = Math.round(inc * 0.35);
    b.rep = clamp((b.rep ?? 50) + ((50 - (b.rep ?? 50)) * 0.05), 0, 100); // drifts back toward average if you never show up
    const g = turfAt(P2.x, P2.z); // butterfly: on gang turf, they want their cut unless they respect you
    if (g && gangRep(g) < 20 && Math.random() < 0.3) { const cut = Math.round(inc * 0.4); inc -= cut; b.taxed = (b.taxed || 0) + cut; out.push(`${B.mgr}: "${GANGS[g].name} came by for 'protection' again. Took ${fmt(cut)} out the till."`); }
    else if (Math.random() < 0.05) { const lost = Math.round(Math.min(b.till || 0, inc * 2)); if (lost > 0) { b.till -= lost; out.push(`${B.mgr}: "We got broken into last night. They cleaned out ${fmt(lost)}. Police are useless."`); } }
    b.till = Math.min((b.till || 0) + inc, bizIncome(k) * 7); b.days = (b.days || 0) + 1;
    if (b.till >= bizIncome(k) * 7 && !b.fullWarn) { b.fullWarn = true; out.push(`${B.mgr}: "Boss, the safe's full. Come grab the takings before someone else does."`); }
  }
  out.forEach((t, i) => setTimeout(() => { const k = Object.keys(BIZ).find(q => t.startsWith(BIZ[q].mgr)); textMe('biz_' + k, BIZ[k].mgr, t.replace(/^[^:]+: "|"$/g, '')); }, 4000 + i * 2500));
}
function bizLook(B, seed) { return { ...npcCfg('clerk', seed), fem: B.mgrFem }; }
async function openBiz(p) {
  const k = p.biz, B = BIZ[k], b = bizOf(k), mine = !!b;
  beginTalk(bizLook(B, k.length * 77), mine ? B.mgr : 'Mr Feld', mine ? `Manager · ${B.name}` : 'Owner · retiring', B.mgrFem && mine ? 230 : 150, null);
  if (!mine) {
    await talk.say(`${B.name}'s for sale. ${B.pitch} ${fmt(B.price)} and it's yours.`);
    const k2 = await talk.choose([I('cash', `Buy it (${fmt(B.price)})`), I('chat', 'What does it make?'), I('x', 'Not today')]);
    if (k2 === 1) { await talk.say(`Good week, about ${fmt(B.base)} a day after wages. Takings go in the safe; you come collect. Treat the place right and it grows.`); const k3 = await talk.choose([I('cash', `Buy it (${fmt(B.price)})`), I('x', 'I\'ll think about it')]); if (k3 !== 0) return endTalk(); }
    else if (k2 !== 0) return endTalk();
    if (money < B.price) { await talk.say('Come back when you\'ve got the money, kid.'); return endTalk(); }
    spend(B.price); stats.biz[k] = { rep: 50, till: 0, upg: 0, days: 0 }; feed({ mood: 25 }); refreshBizSigns(); saveGame();
    await talk.say(`Keys are yours. ${B.mgr} runs the floor, good worker. Look after the place.`); endTalk();
    toast(`You own ${B.name}! Takings build up in the safe every day. Come back to collect.`, 3.5); return;
  }
  const till = Math.round(b.till || 0), lines = till > 0 ? [`Hey boss. Safe's got ${fmt(till)} in it.`, `Boss! ${fmt(till)} waiting for you.`] : ['Boss! Quiet one. Nothing in the safe yet.'];
  await talk.say(pick(lines) + (b.rep > 70 ? ' Customers love us right now.' : b.rep < 35 ? ' Reviews have been rough, not gonna lie.' : ''));
  for (;;) {
    const opts = []; if (till > 0 && b.till > 0) opts.push(['collect', I('cash', `Collect ${fmt(Math.round(b.till))}`)]);
    if (B.shift) opts.push(['shift', I('food', 'Work a shift on the grill')]);
    if (k === 'laundry') opts.push(['wash', I('wave', 'Do your own laundry (free)')]);
    if (k === 'carwash' && myCar) opts.push(['wash', I('car', 'Wash your car (free)')]);
    if ((b.upg || 0) < B.upg.length) opts.push(['upg', I('wrench', `${B.upg[b.upg || 0]} (${fmt(5000 * ((b.upg || 0) + 1))}, more customers)`)]);
    opts.push(['how', I('chat', 'How\'s business?')], ['bye', I('x', 'Leave')]);
    const c = opts[await talk.choose(opts.map(o => o[1]))][0];
    if (c === 'collect') { const a = Math.round(b.till); b.till = 0; b.fullWarn = false; addMoney(a); saveGame(); await talk.say(pick(['Counted twice. All there.', 'Don\'t spend it all at once.', 'There you go, boss.'])); continue; }
    if (c === 'upg') { const cost = 5000 * ((b.upg || 0) + 1); if (money < cost) { await talk.say('We\'ll need the cash first, boss.'); continue; } spend(cost); const what = B.upg[b.upg || 0]; b.upg = (b.upg || 0) + 1; b.rep = clamp((b.rep ?? 50) + 8, 0, 100); saveGame(); await talk.say(`${what}! Customers are gonna notice. Should be about ${fmt(bizIncome(k))} a day now.`); continue; }
    if (c === 'how') { await talk.say(`About ${fmt(bizIncome(k))} a day. ${b.rep > 70 ? 'People are queueing round the block.' : b.rep < 35 ? 'Few bad reviews. A good shift from you would help.' : 'Steady.'}${b.taxed ? ` The ${pick(Object.values(GANGS)).name.split(' ')[1]} keep taking a cut though. ${fmt(b.taxed)} so far.` : ''}`); continue; }
    if (c === 'wash') { endTalk(); fade(() => { advanceTime(k === 'laundry' ? 1 : 0.3); if (k === 'laundry') { stats.hygiene = Math.min(100, (stats.hygiene ?? 80) + 15); feed({ mood: 3 }); toast('Fresh clothes. You smell like a meadow.', 2.4); } else { if (myCar) repairCar?.(myCar); toast('Your car\'s gleaming.', 2.2); } }); return; }
    if (c === 'shift') { endTalk(); setState('mini'); const r = await playCut('burger', { title: `${B.name} shift`, level: b.upg || 0, skin: charCfg.skin }); setState('play');
      if (r.score || r.missed) { const pay = r.money || 0; addMoney(pay); b.rep = clamp((b.rep ?? 50) + r.score * 2.5 - (r.missed || 0) * 4, 0, 100); advanceTime(1.5); feed({ hunger: 10, energy: -10 }); saveGame();
        toast(r.score >= 6 ? `Killer shift! ${r.score} orders out, ${fmt(pay)} in sales. Reviews are flying in.` : r.score ? `${r.score} orders served, ${fmt(pay)} taken.${r.missed ? ` ${r.missed} walked out, though.` : ''}` : 'Rough shift. People walked out hungry.', 3.4); }
      return; }
    break;
  }
  endTalk();
}
function refreshBizSigns() { for (const p of PLACES) if (p.biz && p.saleSign) p.saleSign.visible = !bizOf(p.biz); }
// "For Sale" boards on the lawn of every home you don't own yet
function saleTex(p) { const c = document.createElement('canvas'); c.width = 256; c.height = 192; const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 192); x.fillStyle = '#c9302c'; x.fillRect(0, 0, 256, 70); x.fillStyle = '#ffffff'; x.font = 'bold 46px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('FOR SALE', 128, 37);
  x.fillStyle = '#16161b'; x.font = 'bold 40px system-ui, sans-serif'; let pr; try { pr = p.biz ? BIZ[p.biz].price : homePrice(p); } catch { pr = p.price; } x.fillText('$' + Math.round(pr).toLocaleString('en-US'), 128, 112); x.font = '24px system-ui, sans-serif'; x.fillStyle = '#5a5d66'; x.fillText('Bay Realty', 128, 160);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
unblockPillars([...PLACES, ...PROPERTIES].filter(q => q.x != null)); // no skyway/metro pillar in front of any shop or home
// dealers go by name: "Downtown Dealer (Slim)" everywhere you pick a place, so you know who you heard about
const placeLabel = p => p.kind === 'dealer' && p.npc ? `${p.name} (${p.npc})` : p.name; // lists only: in conversation the name is already said
for (const p of [...PROPERTIES, ...PLACES.filter(q => q.biz)]) { if (p.starter) continue;
  const g = new THREE.Group(), sx = p.x + 3.2, sz = p.z + 0.6; g.position.set(sx, cityAt(sx, sz, -6) ? 0.17 : groundH(sx, sz), sz); G.scene.add(g);
  evBox(g, 0.1, 1.9, 0.1, '#e8e8ea', -0.55, 0.95, 0); evBox(g, 1.3, 0.08, 0.08, '#e8e8ea', 0, 1.75, 0);
  const b = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.82), new THREE.MeshStandardMaterial({ map: saleTex(p), side: THREE.DoubleSide })); b.position.set(0.05, 1.25, 0.02); b.rotation.x = -0.45; g.add(b); g.scale.setScalar(1.5);
  p.saleSign = g; p.saleBoard = b; addCollider(p.saleCol = { x: sx - 0.55, z: sz, r: 0.15 }); }
function refreshPropertyMarkers() { for (const p of PROPERTIES) { p.marker.sp.material.map = iconTex(owned.has(p.id) ? 'key' : 'house', owned.has(p.id) ? 'rgba(178,107,255,.95)' : 'rgba(20,18,38,.88)', owned.has(p.id) ? '#fff' : PLACE_COLORS.property); if (p.saleSign) { const sale = !owned.has(p.id); if (sale !== p.saleSign.visible) { p.saleSign.visible = sale; sale ? addCollider(p.saleCol) : removeCollider(p.saleCol); } if (sale) { p.saleBoard.material.map?.dispose(); p.saleBoard.material.map = saleTex(p); } } } }
function updateNpcList(list, dt) {
  for (const n of list) {
    const d = Math.hypot(n.x - P.x, n.z - P.z);
    if (d > 120) { if (n.fig) n.fig.root.visible = false; continue; }
    if (!n.fig) { n.look ||= bakeCfg(n.cfg); n.fig = figure(n.look); (n.parent || dyn).add(n.fig.root); n.fig.root.position.set(n.x, n.y ?? baseY(n.x, n.z), n.z); }
    n.fig.root.visible = !n.hidden; if (n.hidden) continue; n.t += dt;
    if (n.life?.busy || n.life?.st === 'do' || n.life?.st === 'walk') continue; // living their life at home
    if (n.life) n.fig.root.position.set(n.x, 0, n.z);
    const want = d < 12 ? Math.atan2(P.x - n.x, P.z - n.z) : (n.homeFace ?? Math.sin(n.t * 0.3) * 0.6 + Math.PI);
    n.face += wrapA(want - n.face) * Math.min(1, dt * 5); n.fig.root.rotation.y = n.face;
    const l = n.fig.limbs, br = Math.sin(n.t * 1.6) * 0.04;
    l[2].rotation.set(br, 0, -0.08); l[3].rotation.set(-br + (n.role === 'dealer' ? -0.4 : 0), 0, 0.08);
    if (n.dance) { n.fig.root.position.y = Math.abs(Math.sin(n.t * 6)) * 0.15; l[2].rotation.x = Math.sin(n.t * 6) * 1.2 - 1.2; l[3].rotation.x = -Math.sin(n.t * 6) * 1.2 - 1.2; }
  }
}
// ================================================================ HOME LIFE: your partner (and kids) actually live in the place
// They walk round the furniture (not through it), sit and watch TV, cook, read, soak in the hot tub, play the piano, sleep in the bed.
const HOME_DO = { sit: 'sit', cook: 'cook', eat: 'cook', read: 'read', sleep: 'sleep', relax: 'look', piano: 'piano', hottub: 'soak', music: 'dance', laptop: 'laptop', arcade: 'game', drink: 'drink' };
function homePath(x0, z0, x1, z1) { // grid BFS round walls and furniture, in world coords
  const S = 0.4, H = inside.h, ox = ORIGIN.x - H.w / 2, oz = ORIGIN.z - H.d / 2, nx = Math.ceil(H.w / S), nz = Math.ceil(H.d / S);
  const free = (i, j) => { if (i < 0 || j < 0 || i >= nx || j >= nz) return false; const x = ox + (i + 0.5) * S, z = oz + (j + 0.5) * S; for (const [a, b] of [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]]) if (solidPoint(x + a, z + b, 0.5)) return false; return true; };
  const ci = x => Math.floor((x - ox) / S), cj = z => Math.floor((z - oz) / S), si = ci(x0), sj = cj(z0), gi = ci(x1), gj = cj(z1);
  const prev = new Int32Array(nx * nz).fill(-2), q = [si + sj * nx]; prev[q[0]] = -1;
  for (let h = 0; h < q.length; h++) { const c = q[h], i = c % nx, j = (c - i) / nx; if (Math.abs(i - gi) <= 1 && Math.abs(j - gj) <= 1) { const path = [{ x: x1, z: z1 }]; let k = c; while (k >= 0 && k !== q[0]) { path.unshift({ x: ox + (k % nx + 0.5) * S, z: oz + (Math.floor(k / nx) + 0.5) * S }); k = prev[k]; } return path; }
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ii = i + a, jj = j + b, k = ii + jj * nx; if (ii < 0 || jj < 0 || ii >= nx || jj >= nz || prev[k] !== -2) continue; if (!free(ii, jj) || (a && b && (!free(i + a, j) || !free(i, j + b)))) { prev[k] = -3; continue; } prev[k] = c; q.push(k); } }
  return null;
}
function homeChoices(n) {
  const out = [], night2 = clockH >= 22.5 || clockH < 7, meal = (clockH >= 7 && clockH < 9) || (clockH >= 12 && clockH < 13.5) || (clockH >= 18 && clockH < 20.5), kid = n.role === 'kid';
  for (const it of inside.h.furn) { const F = FURN[it.t], d = HOME_DO[F?.act]; if (!d) continue; if (it.busyBy && it.busyBy !== n) continue;
    if (d === 'sleep') { if (night2 && (kid ? it.t === 'single' || !inside.h.furn.some(f => f.t === 'single') : it.t === 'bed' || it.t === 'single')) out.push([it, d, 50]); continue; }
    if (night2) continue;
    if (kid && ['cook', 'drink', 'soak', 'laptop'].includes(d)) continue;
    const w = { sit: 3, cook: meal ? 6 : 0.6, read: 1, look: 1, piano: 1, soak: clockH > 17 ? 1.5 : 0.4, dance: 0.6, laptop: 1, game: kid ? 3 : 0.5, drink: clockH > 18 ? 0.6 : 0 }[d] || 1;
    out.push([it, d, w]); }
  return out;
}
const HOME_LINES = { sit: ['This show is so trashy. I love it.', 'Come sit with me.', 'Shh, it\'s the good bit.'], cook: ['Dinner\'s nearly ready!', 'Taste this. Good, right?', 'Don\'t touch, it\'s hot!'], read: ['This book is so good.', 'Shh, I\'m at the good bit.'], look: ['The fish are so calming.', 'I named that one after you.'], piano: ['I\'ve been practising!', 'Listen to this one.'], soak: ['Get in, the water\'s perfect.', 'I never want to leave this tub.'], dance: ['I love this song!', 'Dance with me!'], laptop: ['Just answering some emails.', 'Look at this video, haha.'], game: ['I\'m beating your high score!', 'One more go!'], drink: ['Want one?', 'Cheers to us.'], sleep: ['Mmm... come to bed.', 'Night night.'] };
function updateHomeLife(dt) {
  if (!inside?.prop) return;
  for (const n of inside.npcs) {
    if (!n.fam || !n.fig || (n.role === 'kid' && kidStage(n.fam) === 'Baby')) continue;
    const L = n.life ||= { st: 'idle', t: rand(1, 4) }, R = n.fig.root, I2 = n.fig.inner, l = n.fig.limbs;
    if (talk.active) continue;
    if (L.st === 'idle') { L.busy = false; L.t -= dt; if (L.t > 0) continue;
      const ch = homeChoices(n); if (!ch.length) { L.t = rand(4, 8); continue; }
      let tot = ch.reduce((a, c) => a + c[2], 0), r = Math.random() * tot, pickC = ch[0]; for (const c of ch) { r -= c[2]; if (r <= 0) { pickC = c; break; } }
      const [it, d] = pickC, w = inside.h.toWorld(it.x, it.z), rr2 = it.r || 0, F = FURN[it.t], fx = Math.sin(rr2), fz = Math.cos(rr2);
      const seat = d === 'sit' || d === 'sleep' || d === 'soak', reach = seat ? (Math.max(F.d, 0.8) / 2 + 0.55) : F.d / 2 + (d === 'piano' ? 0.95 : 0.5);
      const ax = w.x + fx * reach, az = w.z + fz * reach, path = homePath(n.x, n.z, ax, az); if (!path) { L.t = rand(3, 6); continue; }
      Object.assign(L, { st: 'walk', path, it, d, wx: w.x, wz: w.z, r: rr2, busy: true }); it.busyBy = n; continue; }
    if (L.st === 'walk') { const p0 = L.path[0]; if (!p0) { L.st = 'do'; L.t = L.d === 'sleep' ? 1e9 : rand(14, 30); L.say = rand(3, 9); continue; }
      const dx = p0.x - n.x, dz = p0.z - n.z, dd = Math.hypot(dx, dz), sp = 1.25 * dt;
      if (dd < sp) { n.x = p0.x; n.z = p0.z; L.path.shift(); } else { n.x += dx / dd * sp; n.z += dz / dd * sp; n.face += wrapA(Math.atan2(dx, dz) - n.face) * Math.min(1, dt * 10); }
      L.ph = (L.ph || 0) + dt * 7; l[0].rotation.x = Math.sin(L.ph) * 0.5; l[1].rotation.x = -Math.sin(L.ph) * 0.5; l[2].rotation.set(-Math.sin(L.ph) * 0.4, 0, -0.08); l[3].rotation.set(Math.sin(L.ph) * 0.4, 0, 0.08);
      R.position.set(n.x, 0, n.z); R.rotation.y = n.face; I2.position.set(0, Math.abs(Math.sin(L.ph)) * 0.04, 0); I2.rotation.set(0, 0, 0); continue; }
    if (L.st === 'do') {
      const d = L.d, tt = (L.ph = (L.ph || 0) + dt);
      if (d === 'sleep' && !(clockH >= 22.5 || clockH < 7)) L.t = 0;
      L.t -= dt;
      if (L.t <= 0 || (d !== 'sleep' && Math.hypot(P.x - n.x, P.z - n.z) < 0.5)) { L.st = 'idle'; L.t = rand(2, 6); L.it.busyBy = null; I2.position.set(0, 0, 0); I2.rotation.set(0, 0, 0); for (const q of l) q.rotation.set(0, 0, 0);
        if (['sit', 'sleep', 'soak'].includes(d)) { const a = L.r, nx2 = L.wx + Math.sin(a) * 1.1, nz2 = L.wz + Math.cos(a) * 1.1; if (!solidPoint(nx2, nz2, 0.5)) { n.x = nx2; n.z = nz2; } } R.position.set(n.x, 0, n.z); continue; }
      if (d === 'sit') { const seatY = L.it.t === 'couch' ? 0.42 : 0.45; n.face = L.r; R.position.set(L.wx + Math.sin(L.r) * 0.12, seatY - 0.05, L.wz + Math.cos(L.r) * 0.12); I2.position.set(0, -(l[0].position.y - 0.08), -0.12); l[0].rotation.x = -1.45; l[1].rotation.x = -1.4; l[2].rotation.set(-0.35, 0, -0.15); l[3].rotation.set(-0.35, 0, 0.15); }
      else if (d === 'sleep') { const F = FURN[L.it.t], off = F.d / 2 - 0.25; n.face = L.r + Math.PI; R.position.set(L.wx + Math.sin(L.r) * off, 0.52, L.wz + Math.cos(L.r) * off); R.rotation.y = L.r; I2.rotation.set(-Math.PI / 2, 0, 0); I2.position.set(0, 0.1, 0); for (const q of l) q.rotation.set(0, 0, 0); n.fig.root.rotation.y = L.r; continue; }
      else if (d === 'soak') { n.face = L.r + Math.PI; R.position.set(L.wx, 0.05, L.wz); I2.position.set(0, -0.2, 0); l[0].rotation.x = -1.4; l[1].rotation.x = -1.4; l[2].rotation.set(0, 0, -1.2); l[3].rotation.set(0, 0, 1.2); }
      else { n.face = Math.atan2(L.wx - n.x, L.wz - n.z); R.position.set(n.x, 0, n.z); I2.position.set(0, 0, 0);
        if (d === 'cook') { l[2].rotation.set(-1.1 + Math.sin(tt * 6) * 0.25, 0, -0.1); l[3].rotation.set(-1.0, 0, 0.1); if (Math.random() < dt * 1.5) spawnParticles(L.wx, 1.1, L.wz, ['#ffffff', '#e8e8ea'], 2, 0.4, 1.2, 0.12, 0.6); }
        else if (d === 'read') { l[2].rotation.set(-1.2, 0, 0.35); l[3].rotation.set(-1.2, 0, -0.35); n.fig.inner.rotation.x = 0.12; }
        else if (d === 'piano' || d === 'laptop' || d === 'game') { l[2].rotation.set(-1.15 + Math.sin(tt * 9) * 0.12, 0, -0.1); l[3].rotation.set(-1.15 + Math.cos(tt * 8) * 0.12, 0, 0.1); if (d === 'piano' && Math.hypot(P.x - n.x, P.z - n.z) < 8 && Math.random() < dt * 3) { const A = audio(); if (A) sfx.note(pick([262, 294, 330, 392, 440, 523]), A.currentTime, 0.4, 'triangle', 0.025, 2400); } }
        else if (d === 'dance') { I2.position.y = Math.abs(Math.sin(tt * 6)) * 0.12; l[2].rotation.set(-2.2 + Math.sin(tt * 6) * 0.6, 0, -0.3); l[3].rotation.set(-2.2 - Math.sin(tt * 6) * 0.6, 0, 0.3); }
        else if (d === 'drink') { l[3].rotation.set(-1.6 + Math.sin(tt * 0.8) * 0.4, 0, 0.3); }
        else { l[2].rotation.set(0, 0, -0.08); l[3].rotation.set(0, 0, 0.08); I2.rotation.z = Math.sin(tt * 0.8) * 0.03; } }
      R.rotation.y = n.face;
      // she talks to you about what she's doing, now and then
      L.say -= dt; if (L.say <= 0 && Math.hypot(P.x - n.x, P.z - n.z) < 7 && !subs.busy) { L.say = rand(25, 50); const lines = HOME_LINES[d]; let line2 = null; if (d === 'sit') { const tv = inside.h.furn.find(f => FURN[f.t].act === 'tv' && Math.hypot(inside.h.toWorld(f.x, f.z).x - n.x, inside.h.toWorld(f.x, f.z).z - n.z) < 8); if (tv) { const w = inside.h.toWorld(tv.x, tv.z), ax = w.x - n.x, az = w.z - n.z, L2 = ax * ax + az * az, k = clamp(((P.x - n.x) * ax + (P.z - n.z) * az) / L2, 0, 1), dd = Math.hypot(n.x + ax * k - P.x, n.z + az * k - P.z); if (k > 0.15 && k < 0.95 && dd < 0.9) line2 = pick(['Babe, you\'re blocking the TV.', 'Move! I can\'t see!']); } } // only when you're actually stood in front of it
        if (lines) subs.say({ key: n.relId || n.name, name: n.name, cfg: n.cfg, pitch: n.role === 'kid' ? 420 : 330 }, line2 || (n.role === 'kid' ? pick(KID_LINES[kidStage(n.fam)] || lines) : pick(lines)), { expr: d === 'sleep' ? 'flirty' : pick(['happy', 'happy', 'flirty', 'neutral']) }); }
    }
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
    if (prop && HOME_DEFAULTS[prop.home] && (stats.homeLayout ||= {})[prop.id] !== INTERIORS[prop.home].layout) { // homes upgraded to the new layout (rooms + en-suite); anything extra you bought lines the living room wall
      const def = HOME_DEFAULTS[prop.home].map(f => ({ ...f })), pool = def.map(d => d.t), kept = homes[prop.id].filter(f => { if (f.t === 'single' || f.t === 'bed') return false; const i = pool.indexOf(f.t); if (i >= 0) { pool[i] = null; return false; } return true; }); // anything you bought beyond the new defaults is kept
      kept.forEach((f, i) => { f.x = -INTERIORS[prop.home].w / 2 + 1.2 + (i % 5) * 1.3; f.z = INTERIORS[prop.home].d / 2 - 1.4 - Math.floor(i / 5) * 1.3; f.r = 0; });
      const hadBed = homes[prop.id].find(f => f.t === 'bed'); if (hadBed) { const b = def.find(f => f.t === 'single' || f.t === 'bed'); b.t = 'bed'; b.c = hadBed.c || b.c; }
      homes[prop.id] = [...def, ...kept]; stats.homeLayout[prop.id] = INTERIORS[prop.home].layout;
    }
    if (prop && !homes[prop.id].some(f => f.t === 'shower')) { const T0 = INTERIORS[prop.home]; homes[prop.id].push({ t: 'shower', x: -T0.w / 2 + 0.75, z: -T0.d / 2 + 0.75, r: 0 }); } // every home has a shower
    if (prop && !homes[prop.id].some(f => f.t === 'toilet')) { const T0 = INTERIORS[prop.home]; homes[prop.id].push({ t: 'toilet', x: -T0.w / 2 + 1.75, z: -T0.d / 2 + 0.55, r: 0, c: '#f4f6f8' }); } // ...and a toilet
    if (prop && unblockDoors(prop.home, homes[prop.id])) saveGame(); // nothing parked in a doorway
    const h = buildInterior(id, prop ? homes[prop.id] : null, id === 'motors' ? showroomCfgs() : []);
    G.scene.add(h.group);
    inside = { id, place: place || prop, prop, h, back: { x: (place || prop).x, z: (place || prop).z }, npcs: [], marks: [] };
    const tpl = INTERIORS[id];
    tpl.npcs.forEach((n, i) => {
      const w = h.toWorld(n.x, n.z);
      const cfg = (n.role === 'clerk' || n.role === 'gun' || n.role === 'barber') ? npcCfg(n.role, [...place.id].reduce((a, c) => a + c.charCodeAt(0), 0) + i, place.style) : npcCfg(n.role, [...(place?.id || id)].reduce((a, c) => a + c.charCodeAt(0), 0) * 3 + i);
      if (n.id) { const pc = n.role === 'inmate' ? prisonNpcCfg(n.id, 300 + i) : cfg; inside.npcs.push({ x: w.x, z: w.z, role: n.role, cfg: pc, fig: null, face: n.face || 0, homeFace: n.face || 0, t: Math.random() * 5, parent: dyn, name: PRISONERS[n.id].name, relId: 'pr:' + n.id, pr: n.id, dance: false }); return; }
      inside.npcs.push({ x: w.x, z: w.z, role: n.role, cfg, fig: null, face: 0, homeFace: 0, t: Math.random() * 5, parent: dyn, name: nameFor((place?.id || id) + n.role + i), relId: (place?.id || id) + ':' + n.role, dance: false });
    });
    if (prop && owned.has(prop.id)) { const wd = ensureWardrobe(); if (wd) { homes[prop.id].push(wd); h.place(wd.t, wd.x, wd.z, wd.r, wd.c); saveGame(); } }
    if (prop) addFamilyNpcs(prop);
    if (prop && owned.has(prop.id) && life().flags.pet_dog) homePet(); // the rescue dog lives with you
    if (prop) story().f.home = true; if (prop) setTimeout(azDeliver, 600);
    if (prop && WANT.stars) clearWanted('You laid low at home. The heat is off.');
    setTimeout(lifeArrive, 1500);
    if (prop && stats.escaped) { charCfg = { ...stats.escaped }; stats.escaped = null; buildHero(); toast('You burned the jumpsuit and changed into your own clothes.', 3); }
    if (id === 'hospital' && fam().preg?.labour === 'hospital' && date) setTimeout(() => { if (inside?.id === 'hospital') { toast('Nurses rush her to maternity!', 3); giveBirth('hospital'); } }, 1500);
    if (id === 'pit') for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, w = h.toWorld(1 + Math.cos(a) * 4.8, -1.5 + Math.sin(a) * 4.8); inside.npcs.push({ x: w.x, z: w.z, role: 'guest', cfg: npcCfg('guest', 700 + i), fig: null, face: Math.atan2(-Math.cos(a), -Math.sin(a)), homeFace: Math.atan2(-Math.cos(a), -Math.sin(a)), t: rand(0, 6), parent: dyn, name: 'Spectator', dance: true }); }
    if (id === 'prison') { // the rest of the block: eating, shooting the breeze, working out
      const spots = [[-21, -7.2, 0], [-14, -7.2, 0], [-21, 4.2, Math.PI], [-14, 6.2, 0], [-21, 0.4, Math.PI], [-3, -13.2, 0], [3, -10.8, Math.PI], [-3, -3.8, Math.PI], [-5.6, 2.2, Math.PI], [19, -6, 1.2], [24, -10, 4.4], [22, -12, 0.5], [26, -3, 3.9], [-0.5, -23.8, 0, 3.2], [8.5, -23.5, 0, 3.2], [5.5, -23.9, 0, 3.2], [-6.5, -24, 0], [11.5, -24, 0], [-14, 22.1, Math.PI], [-24, -16, 0.6]];
      spots.forEach(([x, z, f, y], i) => { const w = h.toWorld(x, z); inside.npcs.push({ x: w.x, z: w.z, y, role: 'guest', cfg: npcCfg('inmate', 1200 + i), fig: null, face: f, homeFace: f, t: rand(0, 6), parent: dyn, name: 'Inmate', dance: false }); });
    }
    if (id === 'club') for (let i = 0; i < 6; i++) { const w = h.toWorld(-2 + (i % 3) * 2, -0.8 + Math.floor(i / 3) * 2.4); inside.npcs.push({ x: w.x, z: w.z, role: 'guest', cfg: npcCfg('guest', 900 + i), fig: null, face: rand(0, 6), homeFace: rand(0, 6), t: rand(0, 6), parent: dyn, name: 'Clubber', dance: true }); }
    let WC = [];
    if (['diner', 'bar', 'club', 'gym', 'casino', 'mart', 'office', 'college', 'hospital', 'police', 'motors', 'casa', 'clothes', 'mall'].includes(id)) { // restroom in whichever corner is clear of counters and other markers
      const busy = [...tpl.spots, ...tpl.npcs, ...(tpl.items || []).map(([t, x, z]) => ({ x, z }))];
      const c = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => ({ x: sx * (tpl.w / 2 - 1.1), z: sz * (tpl.d / 2 - 1.5) })).filter(q => Math.abs(q.x) > 2).map(q => ({ ...q, d: Math.min(...busy.map(b => Math.hypot(b.x - q.x, b.z - q.z))) })).sort((a, b) => b.d - a.d)[0];
      WC = [{ kind: 'restroom', x: c.x, z: c.z, label: 'Restroom', icon: 'door' }];
    }
    for (const s of [...tpl.spots, ...WC]) { const w = h.toWorld(s.x, s.z); inside.marks.push({ ...makeMarker(w.x, w.z, s.icon, '#ffd23f', { interior: true, small: true }, G.scene), spot: s }); }
    const door = h.toWorld(0, h.d / 2 - 1.3);
    Object.assign(P, { x: door.x, z: door.z, face: Math.PI, y: 0, vy: 0 });
    for (const t of traffic) dyn.remove(t.mesh); traffic.length = 0; peds.clear(); animals?.clear(); setWalk((x, z) => h.inside(x, z));
    for (const w of waters) w.visible = false; signGroup.visible = false;
    updateCamera(0, true); hudCache.zone = null;
    sfx.click();
  });
}
function exitInterior(silent) {
  if (!inside) return;
  const go = () => {
    if (editMode) endEdit();
    if (pet) { dyn.remove(pet.m.root); pet = null; }
    inside.h.dispose(); G.scene.remove(inside.h.group);
    for (const n of inside.npcs) if (n.fig) dyn.remove(n.fig.root);
    for (const m of inside.marks) G.scene.remove(m.g);
    const dn = inside.place?.doorN || [0, 1]; Object.assign(P, { x: inside.back.x + dn[0] * 0.8, z: inside.back.z + dn[1] * 0.8, face: Math.atan2(dn[0], dn[1]) }); P.y = baseY(P.x, P.z);
    const pend = pendingCar; inside = null; pendingCar = false; setWalk(null); peds.clear(); brawl = null; if (buddy) setTimeout(buddyRespawn, 300);
    for (const w of waters) w.visible = true; signGroup.visible = true;
    loadBudget = 60; updateChunks(P.x, P.z, 2); loadBudget = 2;
    updateCamera(0, true);
    if (pend) { bringCar(true); toast('Your new car is parked outside. Enjoy!', 3); }
  };
  silent ? go() : fade(go);
}

// what you're wearing counts: smart for the day, flashy for a night out, swimwear only at the beach; dirty clothes put people off
function styleBonus(where = 'day') {
  const c = charCfg, smart = { suit: 5, polo: 3, leather: 3, trench: 4, dress: 5, jacket: 2, long: 1 }, street = { hoodie: 1, tracksuit: 1, puffer: 2, jersey: 1, tshirt: 0 };
  let b = (smart[c.top] || street[c.top] || 0) + ({ chain: 2, pearls: 2, tie: 2, scarf: 1 }[c.neck] || 0) + ({ loafers: 2, heels: 2, hightops: 1, boots: 1 }[c.shoes] || 0);
  if (['shirtless', 'swimtop', 'tank'].includes(c.top) || c.pants === 'swim') b += where === 'beach' ? 4 : -6;
  if (where === 'night' && ['leather', 'dress', 'suit', 'crop'].includes(c.top)) b += 3;
  if (c.top === 'armor' || c.pants === 'armored' || c.mask !== 'none') b -= 6;
  if ((stats.hygiene ?? 100) < 30) b -= 6;
  return b;
}
// ---------------- furniture must never block a doorway: find the gaps in the inner walls (and the front door) and
// move anything sitting in one to the nearest free spot in the same room
function doorZones(tpl) {
  const Z = [{ x0: -1.6, x1: 1.6, z0: tpl.d / 2 - 2.2, z1: tpl.d / 2 + 1 }], walls = tpl.walls || [];
  for (const vert of [true, false]) {
    const segs = walls.filter(w => vert ? (w[2] - w[0]) < (w[3] - w[1]) : (w[2] - w[0]) >= (w[3] - w[1])).map(w => ({ line: vert ? (w[0] + w[2]) / 2 : (w[1] + w[3]) / 2, a: vert ? w[1] : w[0], b: vert ? w[3] : w[2] }));
    for (const s1 of segs) for (const s2 of segs) { if (s1 === s2 || Math.abs(s1.line - s2.line) > 0.25 || s2.a <= s1.b) continue; const gap = s2.a - s1.b; if (gap < 0.6 || gap > 3 || segs.some(s3 => s3 !== s1 && s3 !== s2 && Math.abs(s3.line - s1.line) < 0.25 && s3.a >= s1.b && s3.a < s2.a)) continue;
      const lo = s1.b - 0.2, hi = s2.a + 0.2, L = s1.line; Z.push(vert ? { x0: L - 1.3, x1: L + 1.3, z0: lo, z1: hi } : { x0: lo, x1: hi, z0: L - 1.3, z1: L + 1.3 }); }
  }
  return Z;
}
function fpOf(f, x = f.x, z = f.z) { const F = FURN[f.t]; if (!F || F.flat) return null; const sw = Math.abs(Math.sin(f.r || 0)) > 0.5, hw = (sw ? F.d : F.w) / 2, hd = (sw ? F.w : F.d) / 2; return { x0: x - hw, x1: x + hw, z0: z - hd, z1: z + hd, hw, hd }; }
const boxHit = (a, b, m = 0) => a.x0 < b.x1 + m && a.x1 > b.x0 - m && a.z0 < b.z1 + m && a.z1 > b.z0 - m;
function unblockDoors(tplId, furn) {
  const tpl = INTERIORS[tplId]; if (!tpl?.walls) return 0; const Z = doorZones(tpl), walls = tpl.walls.map(w => ({ x0: w[0], z0: w[1], x1: w[2], z1: w[3] })); let moved = 0;
  const crossesWall = (ax, az, bx, bz) => { for (let i = 1; i < 12; i++) { const t = i / 12, x = ax + (bx - ax) * t, z = az + (bz - az) * t; if (walls.some(w => x > w.x0 - 0.05 && x < w.x1 + 0.05 && z > w.z0 - 0.05 && z < w.z1 + 0.05)) return true; } return false; };
  for (const f of furn) {
    const fp = fpOf(f); if (!fp || !Z.some(z => boxHit(fp, z))) continue;
    let best = null, bd = 1e9;
    for (let dx = -5; dx <= 5; dx += 0.3) for (let dz = -5; dz <= 5; dz += 0.3) {
      const x = f.x + dx, z = f.z + dz, d = Math.hypot(dx, dz); if (d >= bd) continue; const q = fpOf(f, x, z);
      if (q.x0 < -tpl.w / 2 + 0.25 || q.x1 > tpl.w / 2 - 0.25 || q.z0 < -tpl.d / 2 + 0.25 || q.z1 > tpl.d / 2 - 0.25) continue;
      if (Z.some(zn => boxHit(q, zn)) || walls.some(w => boxHit(q, w, 0.05)) || furn.some(o => o !== f && fpOf(o) && boxHit(q, fpOf(o), 0.1))) continue;
      if (crossesWall(f.x, f.z, x, z)) continue;
      bd = d; best = { x, z };
    }
    if (best) { f.x = +best.x.toFixed(2); f.z = +best.z.toFixed(2); moved++; }
  }
  return moved;
}
for (const [id, list] of Object.entries(HOME_DEFAULTS)) unblockDoors(id, list); // fix the default layouts once at load
// ---------------- your dog at home: runs to the door when you come in, follows you round, barks now and then
let pet = null;
function homePet() {
  const m = makeAnimalMesh('dog'); dyn.add(m.root); const w = inside.h.toWorld(0, inside.h.d / 2 - 2.5);
  pet = { m, x: w.x, z: w.z, face: Math.PI, t: 0, ph: 0, barkT: rand(6, 14), name: life().flags.pet_name || 'Rocket' };
  setTimeout(() => { if (!pet) return; animalCall('dog', 0.8); ambient('animal', pet.name, pick(['*Runs to the door, tail going mad*', 'Woof! Woof! *You\'re home!*', '*Brings you a slipper*'])); }, 700);
}
function updatePet(dt) {
  if (!pet || !inside) return; const p = pet, tx = P.x - Math.sin(P.face) * 1.2 + Math.cos(P.face) * 0.6, tz = P.z - Math.cos(P.face) * 1.2 - Math.sin(P.face) * 0.6, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  let mv = 0; if (d > 0.4) { const sp = Math.min(d * 2.5, 5.5); const q = { x: p.x + dx / d * sp * dt, z: p.z + dz / d * sp * dt }; resolve(q, 0.3, 0); p.x = q.x; p.z = q.z; p.face = Math.atan2(dx, dz); mv = sp; }
  p.ph += dt * (4 + mv * 3); p.m.limbs.forEach((l, i) => l.rotation.x = Math.sin(p.ph + (i % 2 ? Math.PI : 0)) * Math.min(0.6, mv * 0.25));
  p.m.inner.rotation.z = mv < 0.2 ? Math.sin(time * 14) * 0.04 : 0; // wag
  p.m.root.position.set(p.x, P.y || 0, p.z); p.m.root.rotation.y = p.face;
  if ((p.barkT -= dt) <= 0) { p.barkT = rand(12, 30); if (Math.random() < 0.5) { animalCall('dog', 0.5); ambient('animal', p.name, pick(['Woof!', '*Wants a walk*', '*Spins in a circle*', '*Flops on the floor for belly rubs*'])); } }
}
// ---------------- the wardrobe: save what you're wearing as an outfit and swap in one tap (work, night out, gym, beach...)
const OUTFIT_KEYS = ['top', 'topColor', 'pants', 'pantsColor', 'shoes', 'shoeColor', 'hat', 'hatColor', 'neck', 'gloves', 'gloveColor', 'back', 'backColor', 'accent', 'eyewear', 'mask'];
const OUTFIT_SLOTS = [['work', 'Work', 'case'], ['night', 'Night out', 'music'], ['gym', 'Gym', 'dumbbell'], ['beach', 'Beach', 'sun'], ['chill', 'Chill', 'sofa'], ['smart', 'Smart', 'star']];
function openWardrobe() {
  const W = stats.outfits ||= {};
  return sheet('Wardrobe', () => `<p class="ph-hint" style="margin:0 0 8px">Save what you\'re wearing to a slot, then wear it again any time.</p><div class="grows">${OUTFIT_SLOTS.map(([id, label, ic]) => { const o = W[id]; return `<div class="grow">${svg(ic)}<span class="gn"><b>${label}</b><small>${o ? `${o.top} · ${o.pants} · ${o.shoes}` : 'Empty'}</small></span><span class="wbtns">${o ? `<button class="tbuy" data-wear="${id}">Wear</button>` : ''}<button class="tsell" data-save="${id}">${o ? 'Update' : 'Save'}</button></span></div>`; }).join('')}</div>`,
    (root, close, draw) => {
      root.querySelectorAll('[data-save]').forEach(b => b.onclick = () => { const o = {}; for (const k of OUTFIT_KEYS) if (charCfg[k] !== undefined) o[k] = charCfg[k]; W[b.dataset.save] = o; saveGame(); sfx.click(); draw(); });
      root.querySelectorAll('[data-wear]').forEach(b => b.onclick = () => { Object.assign(charCfg, W[b.dataset.wear]); store.set('rr_char', charCfg); buildHero(); saveGame(); sfx.coin(); toast(`Changed into your ${OUTFIT_SLOTS.find(q => q[0] === b.dataset.wear)[1].toLowerCase()} outfit.`, 2); close(); });
    });
}
// homes you already own get a wardrobe beside the bed if they don't have one
function ensureWardrobe() {
  if (!inside?.prop || inside.h.furn.some(f => f.t === 'wardrobe')) return;
  const bed = inside.h.furn.find(f => FURN[f.t].act === 'sleep'); if (!bed) return;
  const F = FURN[bed.t], hw = inside.h.w / 2 - 0.5, hd = inside.h.d / 2 - 0.5;
  for (const [dx, dz] of [[F.w / 2 + 1.3, -F.d / 2 + 0.4], [-F.w / 2 - 1.3, -F.d / 2 + 0.4], [F.w / 2 + 1.3, 0], [-F.w / 2 - 1.3, 0], [F.w / 2 + 1.3, F.d / 2], [-F.w / 2 - 1.3, F.d / 2]]) {
    const lx = bed.x + dx, lz = bed.z + dz; if (Math.abs(lx) > hw - 0.8 || Math.abs(lz) > hd - 0.4) continue;
    if (inside.h.furn.some(f => f !== bed && Math.abs(f.x - lx) < (FURN[f.t].w + 1.6) / 2 + 0.2 && Math.abs(f.z - lz) < (FURN[f.t].d + 0.7) / 2 + 0.2)) continue;
    const w = inside.h.toWorld(lx, lz), q = { x: w.x, z: w.z }; resolve(q, 0.9, 0); if (Math.hypot(q.x - w.x, q.z - w.z) > 0.1) continue;
    return { t: 'wardrobe', x: lx, z: lz, r: dx > 0 ? -Math.PI / 2 : Math.PI / 2, c: '#6b4a33' };
  }
  return null;
}
// ---------------- home: furniture use & edit mode
const FURN_VERB = { outfit: 'Outfits', shower: 'Shower', toilet: 'Use toilet', sleep: 'Sleep', eat: 'Eat', cook: 'Cook', sit: 'Sit', tv: 'Watch TV', read: 'Read', laptop: 'Laptop', lift: 'Lift', run: 'Run', music: 'Music', relax: 'Relax', arcade: 'Play', bath: 'Take a bath', hottub: 'Hot tub', piano: 'Play piano', drink: 'Pour a drink' };
const FURN_ICON = { outfit: 'shirt', sleep: 'bed', eat: 'fridge', cook: 'food', sit: 'sofa', tv: 'tv', read: 'book', laptop: 'chart', lift: 'dumbbell', run: 'run', music: 'music', relax: 'smile', arcade: 'play', toilet: 'toilet', shower: 'shower', bath: 'bath', hottub: 'drop', drink: 'drink', piano: 'music' };
let useCd = {};
function advanceTime(h) { const steps = Math.ceil(h * 4); for (let i = 0; i < steps; i++) { const before = clockH; clockH += h / steps; if (clockH >= 24) clockH -= 24; if (before < 6 && clockH >= 6) newDay(); } }
async function useFurn(item) {
  const act = FURN[item.t].act;
  if (act === 'sleep') {
    const hrs = clockH >= 20 || clockH < 6 ? ((31 - clockH) % 24) : 3;
    fade(() => { advanceTime(hrs); stats.energy = 100; stats.mood = clamp(stats.mood + 6, 0, 100); P.hp = maxHP(); saveGame(); toast(hrs > 4 ? 'Good morning! Fully rested.' : 'You took a nap. Energy restored.', 3); });
  } else if (act === 'outfit') { return openWardrobe();
  } else if (act === 'toilet') { const w = inside.h.toWorld(item.x, item.z), r = item.r || 0; return useToilet(w.x + Math.sin(r) * 0.05, w.z + Math.cos(r) * 0.05, r);
  } else if (act === 'shower') { const w = inside.h.toWorld(item.x, item.z); return startShower(w.x, w.z, item.r || 0);
  } else if (act === 'eat' || act === 'cook') {
    if (stats.groceries <= 0) { toast('The fridge is empty. Buy groceries at QuickMart.'); sfx.fail(); return; }
    stats.groceries--; feed(FOODS.meal); if (act === 'cook') feed({ mood: hasDegree('culinary') ? 14 : 6 }); sfx.coin(); toast(`Ate a home-cooked meal. ${stats.groceries} meals left.`);
  } else if (act === 'sit') { // actually sit down on it, facing out
    const w = inside.h.toWorld(item.x, item.z), r = item.r || 0, back = item.t === 'couch' ? 0.12 : 0.08;
    // a TV in front of you (within ~7m, roughly facing it) = Watch TV right from the sofa
    const tv = inside.h.furn.find(f => { if (FURN[f.t].act !== 'tv') return false; const tw = inside.h.toWorld(f.x, f.z), dx = tw.x - w.x, dz = tw.z - w.z, d = Math.hypot(dx, dz); return d < 7 && (dx * Math.sin(r) + dz * Math.cos(r)) / d > 0.6; });
    P.sit = { x: w.x + Math.sin(r) * back, z: w.z + Math.cos(r) * back, face: r, t: 0, tv }; P.face = r; sfx.click(); toast(tv ? 'You kick back. Tap Watch TV, or move the stick to get up.' : 'You kick back. Move the stick to get up.', 2.4);
  }
  else if (act === 'tv') { fade(() => { advanceTime(1); feed({ mood: 10, energy: 4 }); toast('You watched an episode of "Bay Housewives". Mood up.'); }); }
  else if (act === 'read') { if ((useCd.read || 0) > gameHours()) { toast('You already read today. Try tomorrow.'); return; } useCd.read = gameHours() + 12; fade(() => { advanceTime(1); feed({ energy: -4, mood: 3 }); gainXP('charm', 40); toast('You read "How to Talk to Anyone". Charm up.'); }); }
  else if (act === 'laptop') openMarket();
  else if (act === 'lift') { if ((stats.relDay['gym:' + dayN] || 0) >= GYM_DAILY) { toast(`You've done ${GYM_DAILY} workouts today. Rest up.`); return; } const r = await mini('gym'); workout(r.score, 'lift'); gainXP('strength', r.score * 10); gainXP('health', r.score * 3); feed({ energy: -10, mood: 4 }); }
  else if (act === 'run') { if ((stats.relDay['gym:' + dayN] || 0) >= GYM_DAILY) { toast(`You've done ${GYM_DAILY} workouts today. Rest up.`); return; } const r = await mini('tread'); workout(r.score / 10, 'cardio'); gainXP('stamina', Math.round(r.score * 0.6)); gainXP('health', Math.round(r.score * 0.3)); feed({ energy: -12, mood: 4 }); }
  else if (act === 'music') { homeMusic = !homeMusic; radioOn(homeMusic); toast(homeMusic ? `Playing ${STATIONS[radioIndex()].name}` : 'Music off'); }
  else if (act === 'relax') { feed({ mood: 8 }); toast('The fish are very calming.'); }
  else if (act === 'bath') { const w = inside.h.toWorld(item.x, item.z); return startShower(w.x, w.z, item.r || 0, false, true); }
  else if (act === 'hottub') { fade(() => { advanceTime(1); feed({ mood: 16, energy: 8 }); stats.hygiene = Math.min(100, (stats.hygiene ?? 80) + 6); const her = homePartnerNear(); if (her) { const f = fam(); bumpRel(f.partner.id, 4, false); } toast(her ? `Hot tub with ${her}, city lights everywhere. This is the life.` : 'You sank into the hot tub. Jets on. Problems off.', 3); }); }
  else if (act === 'piano') { const lv = (stats.piano = (stats.piano || 0) + 1); feed({ mood: 6 }); const A = audio(); if (A) { const sc = [262, 294, 330, 349, 392, 440, 494, 523]; for (let i = 0; i < 8; i++) sfx.note(lv > 6 ? sc[[0, 2, 4, 7, 4, 2, 5, 7][i]] : sc[Math.floor(Math.random() * 8)], A.currentTime + i * 0.28, 0.4, 'triangle', 0.05, 2400); } toast(lv < 4 ? 'You plinked out Chopsticks. Badly.' : lv < 10 ? 'Getting better. That was almost a tune.' : 'Beautiful. You actually play now.', 2.6); }
  else if (act === 'drink') { feed({ mood: 5, drunk: 0.3 }); toast(pick(['Neat whisky, one ice cube.', 'You poured yourself a glass of red.', 'Mixed a cocktail. Not bad.']), 2.2); }
  else if (act === 'arcade') { const r = await mini('beat'); feed({ mood: 10 }); }
  saveGame();
}
function homePartnerNear() { const n = inside?.npcs?.find(q => q.role === 'spouse'); return n && Math.hypot(n.x - P.x, n.z - P.z) < 9 ? n.name : null; }
// every minigame is a playable cutscene in the real world now (CUT in cutgames.js); gym has its own
let cutReady = false;
function cutCtx() { if (cutReady) return; cutReady = true; initCutGames({ P, dyn, cutCam, cutRender, poseCharacter, buildCharacter, spawnParticles, shoreLine, WATER_Y, hero: () => hero, heroRoot: () => heroRoot, heroW: () => heroW, time: () => time, W: () => W, H: () => H, groundY: (x, z) => inside ? (P.y || 0) : baseY(x, z, P.y), open: (x, z) => inside ? true : (walkable(x, z) && !solidPoint(x, z, 0.5)), npcCfg: () => { const q = peds.list.filter(p => p.look?.cfg); return q.length ? pick(q).look.cfg : { ...DEFAULT_CHAR }; } }); }
async function playCut(kind, opts = {}) { cutCtx(); const g = CUT[kind](opts); let r; try { r = await runMinigame(g, opts); } finally { g.cleanup?.(r?.win); } return r; }
async function mini(kind, opts = {}) { setState('mini'); let r; if (kind === 'gym') { const g = gymCut(opts); r = await runMinigame(g); g.cleanup(); } else if (CUT[kind]) r = await playCut(kind, opts); else r = await runMinigame(kind, opts); setState('play'); return r; }
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
  if (input.consume('x') && held) { if (held) { held.r = (held.r + Math.PI / 2) % (Math.PI * 2); sfx.click(); } else { const f = nearestFurn(); if (f) { const n = inside.h.move(f, f.x, f.z, (f.r + Math.PI / 2) % (Math.PI * 2)); saveHome(); sfx.click(); } } }
  if (input.consume('y') && held) { if (held) { storage.push({ t: held.t, c: held.c }); inside.h.group.remove(held.ghost); held = null; saveHome(); toast('Put into storage'); } else { const f = nearestFurn(); if (f) { storage.push({ t: f.t, c: f.c }); inside.h.remove(f); saveHome(); toast(`${FURN[f.t].name} put into storage`); } } }
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
const VERB = { boats: 'Hire boat ($60)', rides: 'Hire ($40)', biz: 'Talk', ride: 'Ride', carny: 'Play', stadium: 'Match', marina: 'Boats', tattoo: 'Get inked', dealer: 'Talk', clothes: 'Enter', barber: 'Enter', guns: 'Enter', venue: 'Enter', game: 'Play', chop: 'Sell car', mods: 'Customise', service: 'Repair', race: 'Race', property: 'View', job: 'Talk', customer: 'Talk' };
const SPOT_VERB = s => s.label;
function findAction() {
  if (P.dead) return null;
  if (inside) {
    if (editMode) return null;
    if (P.sit) return P.sit.tv ? { kind: 'furn', item: P.sit.tv, icon: 'tv', label: 'Watch TV' } : { kind: 'stand', icon: 'run', label: 'Stand up' };
    let best = null, bd = 1.9;
    for (const m of inside.marks) { const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < bd) { bd = d; best = { kind: 'spot', spot: m.spot, icon: m.spot.icon && (ICON_SET[m.spot.icon] || ICONS[m.spot.icon]) ? m.spot.icon : 'door', label: SPOT_VERB(m.spot) }; } }
    if (inside.prop) for (const f of inside.h.furn) { const a = FURN[f.t].act; if (!a) continue; const w = inside.h.toWorld(f.x, f.z), d = Math.hypot(w.x - P.x, w.z - P.z) - Math.max(FURN[f.t].w, FURN[f.t].d) / 2 + 0.3; if (d < bd) { bd = d; best = { kind: 'furn', item: f, icon: FURN_ICON[a] || 'hand', label: FURN_VERB[a] }; } }
    for (const n of inside.npcs) if (n.fam) { const d = Math.hypot(n.x - P.x, n.z - P.z); if (d < bd) { bd = d; best = { kind: 'fam', n, icon: 'chat', label: n.role === 'spouse' ? 'Talk' : (kidStage(n.fam) === 'Baby' ? 'Hold' : 'Talk') }; } }
    for (const n of inside.npcs) if (n.pr) { const d = Math.hypot(n.x - P.x, n.z - P.z) - 0.4; if (d < bd) { bd = d; best = { kind: 'pnpc', n, icon: 'chat', label: n.role === 'guard' ? 'Guard' : 'Talk' }; } }
    if (P.z > ORIGIN.z + inside.h.d / 2 - 1.6 && Math.abs(P.x - ORIGIN.x) < 1.6) return stats.jail && inside.id === 'prison' ? best : { kind: 'exit', icon: 'exit', label: 'Leave' };
    return best;
  }
  if (ride) {
    if (Math.abs(ride.s.v) > 4) return null;
    for (const m of markers) if (m.car && Math.hypot(m.x - ride.s.x, m.z - ride.s.z) < 4.5) {
      if (m.place.kind === 'chop' && ride.personal) continue;
      if (m.place.kind === 'race' && race) continue;
      return { kind: 'place', m, icon: m.place.kind === 'service' ? 'wrench' : m.place.kind === 'chop' ? 'cash' : m.place.kind === 'mods' ? 'wrench' : 'flag', label: VERB[m.place.kind] };
    }
    return null;
  }
  let best = null, bd = 1e9;
  const consider = (d, a) => { if (d < bd) { bd = d; best = a; } };
  const lv = (y = 0) => Math.abs(y - P.y) < 2.2; // only things on your level (not the street below a skyway, or the deck above you)
  for (const m of markers) if (!m.car && lv(m.g?.position.y ?? 0)) { const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < 2.6) consider(d - 1, { kind: 'place', m, icon: m.npc ? 'chat' : 'door', label: m.place.kind === 'property' && owned.has(m.place.id) ? 'Enter' : m.place.kind !== 'property' && !isOpen(m.place) ? `Closed · ${hh12(placeHours(m.place)[0])}` : m.place.kind === 'biz' ? (m.place.interior ? 'Enter' : 'Visit') : VERB[m.place.kind] }); } // businesses you walk into say Enter
  for (const c of customers) if (c.npc?.fig && lv(c.npc.y ?? baseY(c.x, c.z))) { const d = Math.hypot(c.x - P.x, c.z - P.z); if (d < 2.4) consider(d - 1.2, { kind: 'customer', c, icon: 'chat', label: 'Deal' }); }
  { const nl = nearLadder(); if (nl) consider(0.5, { kind: 'ladder', L: nl.L, top: nl.top, icon: 'run', label: nl.top ? 'Climb down' : 'Climb' }); }
  if (trainRide?.metro) return metro.stop > 0.5 ? { kind: 'metrooff', icon: 'exit', label: 'Get off' } : null;
  if (trainRide) return train.stop > 0 ? { kind: 'trainoff', icon: 'exit', label: 'Get off' } : null;
  if (!ride && P.y < 2.2) METRO.stations.forEach((st, i) => { const d = Math.hypot(P.x - st.tower.x, P.z - st.tower.z); if (d < 3.4) consider(0.05, { kind: 'metroon', si: i, icon: 'run', label: metro.si === i && metro.stop > 0.5 ? 'Metro ($2)' : `Metro (${metroEta(i)}s)` }); });
  if (!ride && train.stop > 1 && Math.abs(P.x - train.x) < 16 && P.z > RAIL.z + 2 && P.z < RAIL.z + 7) consider(0.1, { kind: 'trainon', icon: 'run', label: 'Board ($3)' });
  if (Math.hypot(P.x - (PEAK.x - 6), P.z - (PEAK.z - 6)) < 2.2) consider(0.2, { kind: 'lookout', icon: 'map', label: 'Telescope ($1)' });
  if (lifeAct?.kind === 'object' && Math.hypot(lifeAct.x - P.x, lifeAct.z - P.z) < 1.8) consider(0, { kind: 'lifeobj', icon: 'hand', label: 'Pick up' });
  for (const v of vehicles) { if (v.wrecked || v.towed || !lv(v.s.y || 0)) continue; const d = Math.hypot(v.s.x - P.x, v.s.z - P.z); if (d < 4) consider(d, { kind: 'vehicle', v, icon: v.b.two ? 'run' : 'car', label: v.b.two ? (v.rental && !v.paid ? 'Ride ($2)' : 'Get on') : 'Get in' }); }
  for (const t of traffic) { const d = Math.hypot(t.rx - P.x, t.rz - P.z); if (d < 3.4 && Math.abs((t.y ?? 0.04) - P.y) < 2) consider(d, { kind: 'jack', t, icon: 'car', label: 'Jack car' }); }
  for (const p of peds.list) if (p.state !== 'down' && p.state !== 'flee' && lv(p.y ?? baseY(p.x, p.z))) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < 1.9) consider(d - 0.2, { kind: 'ped', p, icon: 'chat', label: 'Talk' }); }
  const ccx = Math.floor(P.x / CHUNK), ccz = Math.floor(P.z / CHUNK);
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const p of parkedIn(ccx + i, ccz + j)) if (!p.taken && lv(0.17)) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < 3.3) consider(d + 0.3, { kind: 'parked', p, icon: 'smash', label: 'Break in' }); }
  return best;
}
// Baywood Peak: drop a coin in the telescope and take in the whole bay. Once a day it really lifts your mood.
function useLookout() {
  if (money < 1) { toast('You need a dollar for the telescope.'); return; }
  spend(1); sfx.click(); const first = stats.peakDay !== dayN; stats.peakDay = dayN;
  fade(() => { advanceTime(0.4); feed({ mood: first ? 18 : 4, energy: 3 }); if (first) gainXP('charm', 6); const h = Math.floor(clockH);
    toast(pick(h >= 19 || h < 6 ? ['The whole city lit up below you. The skyways glow like rivers.', 'Night from the top: the bay, the metro loop, a thousand windows.'] : h < 9 ? ['Sunrise over the bay. Worth the drive up.', 'Morning haze over downtown. You can see the pier from here.'] : ['You can see all the way to the airport. Somebody\'s plane is taking off.', 'Downtown, the beach, the farms. It\'s your city from up here.', 'You spot your own place from up here. Not bad.']) + (first ? ' Mood up.' : ''), 4); });
}
function doAction(a) {
  if (a.kind === 'vehicle') { if (a.v.farm) { a.v.ai = null; if (a.v.field) a.v.field.tractor = null; a.v.field = null; } if (a.v.rental && !a.v.paid) { if (money < 2) { toast('E-scooter rental is $2'); return; } spend(2); a.v.paid = true; toast('Bay Scoot rental: $2'); } enterVehicle(a.v); }
  else if (a.kind === 'jack') jackTraffic(a.t);
  else if (a.kind === 'parked') breakIntoParked(a.p);
  else if (a.kind === 'ped') talkToPed(a.p);
  else if (a.kind === 'customer') talkCustomer(a.c);
  else if (a.kind === 'place') openPlace(a.m.place);
  else if (a.kind === 'spot') doSpot(a.spot);
  else if (a.kind === 'furn') useFurn(a.item);
  else if (a.kind === 'exit') exitInterior();
  else if (a.kind === 'fam') talkFamily(a.n);
  else if (a.kind === 'lifeobj') pickupObject();
  else if (a.kind === 'lookout') useLookout();
  else if (a.kind === 'metroon') boardMetro(a.si);
  else if (a.kind === 'metrooff') leaveMetro();
  else if (a.kind === 'trainon') boardTrain();
  else if (a.kind === 'trainoff') leaveTrain();
  else if (a.kind === 'pnpc') talkPrisoner(a.n.pr ? a.n : a.n);
  else if (a.kind === 'ladder') { P.ladder = a.L; P.y = a.top ? a.L.top - 0.05 : 0.3; sfx.click(); }
}
// opening hours (24h clock; close past midnight wraps). Anything not listed is always open.
const HOURS = { mall: [9, 22], ride: [11, 24], carny: [11, 24], marina: [7, 20], tattoo: [11, 23], clothes: [9, 21], barber: [9, 19], guns: [10, 20], diner: [6, 23], college: [7, 21], office: [7, 19], gym: [5, 23], motors: [9, 20], casa: [10, 19], bar: [16, 3], club: [21, 5], pit: [20, 4], church: [7, 21], mods: [8, 22], taco: [10, 22], gallery: [10, 23], surf: [7, 19], hoops: [6, 22], taxi: [0, 24], bins: [5, 14], courier: [7, 20] };
const placeHours = p => HOURS[p.interior] || HOURS[p.kind] || HOURS[p.game] || HOURS[p.job] || null;
function isOpen(p) { const h = placeHours(p); if (!h) return true; const [o, c] = h, t = clockH; return o < c ? t >= o && t < c : t >= o || t < c; }
const hh12 = h => { h = ((h % 24) + 24) % 24; return h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h}am` : `${h - 12}pm`; };
function openPlace(p) {
  sfx.click();
  if (!isOpen(p)) { const [o, c] = placeHours(p); toast(`${p.name} is closed. Open ${hh12(o)} to ${hh12(c)}.`, 3); sfx.fail(); return; }
  if (p.kind === 'dealer') talkDealer(p);
  else if (p.interior) enterInterior(p);
  else if (p.kind === 'property') { const prop = PROPERTIES.find(q => q.id === p.id); owned.has(p.id) ? (propMode(p.id) === 'rent' ? toast(`Tenants live at ${prop.name}. Switch it to Live or Vacant in the Homes app.`, 3.5) : enterInterior(null, prop)) : openProperty(prop); }
  else if (p.kind === 'game') openGame(p);
  else if (p.kind === 'job') talkJob(p);
  else if (p.kind === 'chop') openChop(p);
  else if (p.kind === 'service') { if (!ride) { toast('Drive a car in to get it repaired.'); return; } repairCar(ride, p.svc); }
  else if (p.kind === 'mods') { if (!ride || !ride.personal) { toast('Bay Customs only works on your own cars. Drive one in.'); sfx.fail(); return; } ride.s.v = 0; openCustom('car'); }
  else if (p.kind === 'race') openRace(p);
  else if (p.kind === 'tattoo') openTattoo(p);
  else if (p.kind === 'biz') openBiz(p);
  else if (p.kind === 'boats') hireBoat(p);
  else if (p.kind === 'rides') hireRide(p);
  else if (p.kind === 'ride') openRide(p);
  else if (p.kind === 'carny') openCarny(p);
  else if (p.kind === 'stadium') openStadium(p);
  else if (p.kind === 'marina') openMarina(p);
}
async function doSpot(s) {
  const place = inside.place, id = inside.id;
  if (s.kind === 'mallfood') return mallFood();
  if (s.kind === 'tattoo') return openTattoo(inside.place);
  if (s.kind === 'biz') return openBiz(inside.place);
  if (s.kind === 'arcade') { const r2 = await mini('beat'); feed({ mood: 10 }); spend(Math.min(money, 2)); return; }
  if (s.kind === 'restroom') { fade(() => { advanceTime(0.1); stats.bladder = 100; stats.hygiene = Math.min(100, (stats.hygiene ?? 80) + 4); toast(pick(['Ahh. Much better.', 'Washed your hands too. Good.', 'Public toilets. Never again. ...Until next time.']), 2.2); }); return; }
  if (id === 'prison') return prisonSpot(s);
  if (s.kind === 'admissions') return talkAdmissions();
  if (s.kind === 'class') return attendClass();
  if (s.kind === 'study') { if (stats.relDay['study:' + dayN]) { toast('You already studied today. Your brain is full.'); return; } stats.relDay['study:' + dayN] = 1; fade(() => { advanceTime(1.5); gainXP('smarts', 30); feed({ energy: -6, mood: 2 }); edu().studied = dayN; toast('You studied for an hour and a half. Smarts +, and your next class will be easier.', 3); }); return; }
  if (s.kind === 'staff') return talkCareer(id);
  if (s.kind === 'talk') return talkVenue();
  if (s.kind === 'mirror') return openShop('clothes', place);
  if (s.kind === 'range') {
    if (!(ws.kind === 'gun' || ws.kind === 'rpg') || arsenal.cur === 'rpg') { toast('Equip a gun from the weapon wheel first'); return; }
    if (money < 15) { toast('Range time costs $15'); return; }
    spend(15); const r = await mini('gallery', { title: `${SLOT[arsenal.cur].name} practice`, pay: false });
    gainXP('gun_' + arsenal.cur, (r.hits || 0) * 6); if (r.hits) toast(`${SLOT[arsenal.cur].name} skill +${r.hits * 6} XP`);
  }
  if ((s.kind === 'lift' || s.kind === 'bag' || s.kind === 'tread') && id === 'gym' && !gymMember()) { toast('Members only. Talk to the trainer to sign up ($120 for 30 days).', 3); return; }
  if ((s.kind === 'lift' || s.kind === 'bag' || s.kind === 'tread') && (stats.relDay['gym:' + dayN] || 0) >= GYM_DAILY) { toast(`You've done ${GYM_DAILY} workouts today. Your body needs to recover.`, 3); return; }
  if (s.kind === 'lift' || s.kind === 'bag') { const r = await mini('gym', { title: s.kind === 'bag' ? 'Heavy Bag' : 'Barbell Press' }); workout(r.score, 'lift'); gainXP('strength', r.score * 12); gainXP('health', r.score * (s.kind === 'bag' ? 6 : 3)); feed({ energy: -10, mood: 5 }); }
  if (s.kind === 'tread') { const r = await mini('tread'); workout(r.score / 10, 'cardio'); gainXP('stamina', Math.round(r.score * 0.7)); gainXP('health', Math.round(r.score * 0.35)); feed({ energy: -12, mood: 5 }); }
  if (s.kind === 'blackjack' || s.kind === 'slots') { if (money < 10) { toast('You need at least $10 to play'); return; } const r = await mini(s.kind, { money }); if (r.money) addMoney(r.money); feed({ mood: r.money > 0 ? 8 : -3 }); }
  if (s.kind === 'dj') { const r = await mini('beat', { title: 'Neon Room DJ set' }); if (r.money) addMoney(r.money); gainXP('charm', r.score); feed({ mood: 10, energy: -6 }); }
  if (s.kind === 'rest') { if (money < 150) { toast('A bed costs $150. Talk to reception if you are hurt.'); return; } spend(150); fade(() => { advanceTime(2); P.hp = maxHP(); feed({ energy: 30, hunger: 20, mood: 5 }); toast('You rested in the ward. Fully healed.', 3); }); }
  if (s.kind === 'fight') return pitFight();
  if (s.kind === 'pray') { const first = !stats.relDay['pray:' + dayN]; stats.relDay['pray:' + dayN] = 1; fade(() => { advanceTime(0.5); feed({ mood: first ? 22 : 5, energy: 4 }); P.hp = Math.min(maxHP(), P.hp + 20); toast(first ? 'You sit in silence for a while. You feel lighter. Mood up.' : 'You sit quietly for a bit.', 3); }); }
  if (s.kind === 'dance') return startDance();
  if (s.kind === 'dance_old') { fade(() => { advanceTime(0.5); feed({ mood: 14, energy: -8 }); gainXP('charm', 12); gainXP('stamina', 8); toast('You owned the dance floor. Mood up, Charm up.'); }); }
  saveGame();
}

// ================================================================ DANCE FLOOR: swipe the arrow's direction when it lands in the ring, on the beat
let dance = null;
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }, DIR_COL = { up: '#ff3b8a', down: '#38e8ff', left: '#ffd23f', right: '#4cd964' };
function startDance() {
  if (dance) return;
  const tr = danceStart(); if (!tr) { toast('Tap the screen once to enable sound, then try again.'); return; }
  const w = inside.h.toWorld(0, 0.5); Object.assign(P, { x: w.x, z: w.z, y: 0, face: 0 });
  const beats = tr.song.bpm > 150 ? 8 : 4, total = 44, notes = [];
  let step = 16 * 2; // two bars of intro
  const dirs = Object.keys(DIRS);
  for (let i = 0; i < total; i++) { notes.push({ t: tr.t0 + step * tr.spb16, dir: dirs[Math.floor(Math.random() * 4)], done: false }); step += i > 20 && Math.random() < 0.35 ? beats / 2 : beats; }
  dance = { tr, notes, score: 0, combo: 0, best: 0, hits: 0, perfect: 0, judge: '', judgeT: 0, move: null, moveT: 0, zoom0: zoom, end: notes[notes.length - 1].t + 1.5 };
  zoom = 0.42;
  const ui = $('danceUI'); ui.classList.remove('hidden'); $('pad').classList.add('hidden');
  const cv = $('danceCv'); cv.width = innerWidth * Math.min(devicePixelRatio, 2); cv.height = innerHeight * Math.min(devicePixelRatio, 2);
  let sx = 0, sy = 0, down = false;
  cv.onpointerdown = e => { down = true; sx = e.clientX; sy = e.clientY; };
  cv.onpointerup = e => { if (!down) return; down = false; const dx = e.clientX - sx, dy = e.clientY - sy; if (Math.hypot(dx, dy) < 24) return; danceSwipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); };
  onkeydown_dance = e => { const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[e.key]; if (k) danceSwipe(k); };
  addEventListener('keydown', onkeydown_dance);
  $('danceQuit').onclick = () => endDance(true);
  for (const n of inside.npcs) if (n.role === 'guest') n.dance = true;
  if (date && !date.dancing) date.dancing = date.prefs.love.includes('nightlife') || date.prefs.love.includes('music') || date.interest > 70;
  for (const m of inside.marks) m.g.visible = false;
  toast(`${tr.station.split(' — ')[1]}: ${tr.song.title} · ${tr.song.artist}`, 3);
}
let onkeydown_dance = null;
function danceSwipe(dir) {
  const D2 = dance; if (!D2) return; const now = audioTime();
  let best = null, bd = 1e9; for (const n of D2.notes) if (!n.done) { const d = Math.abs(n.t - now); if (d < bd) { bd = d; best = n; } }
  if (!best || bd > 0.3) { D2.judge = 'MISS'; D2.judgeT = 0.5; D2.combo = 0; return; }
  best.done = true;
  if (best.dir !== dir) { D2.judge = 'WRONG WAY'; D2.judgeT = 0.6; D2.combo = 0; return; }
  const perfect = bd < 0.08, good = bd < 0.17;
  if (!good) { D2.judge = 'LATE'; D2.judgeT = 0.5; D2.combo = 0; return; }
  D2.combo++; D2.best = Math.max(D2.best, D2.combo); D2.hits++; if (perfect) D2.perfect++;
  D2.score += (perfect ? 100 : 60) * (1 + Math.min(D2.combo, 20) * 0.05);
  D2.judge = perfect ? 'PERFECT' : 'GOOD'; D2.judgeT = 0.5; D2.move = dir; D2.moveT = 0.45; navigator.vibrate?.(perfect ? 14 : 8);
  if (D2.combo % 10 === 0) spawnParticles(P.x, 2, P.z, ['#ff3b8a', '#38e8ff', '#ffd23f', '#4cd964'], 18, 4, 0.8, 0.12);
}
function updateDance(dt) {
  const D2 = dance, now = audioTime(), tr = D2.tr, beat = (now - tr.t0) / (tr.spb16 * 4);
  for (const n of D2.notes) if (!n.done && now - n.t > 0.2) { n.done = true; D2.combo = 0; D2.judge = 'MISS'; D2.judgeT = 0.5; }
  D2.judgeT -= dt; D2.moveT -= dt;
  // the hero dances: a bounce on the beat plus the move you just hit
  const ph = beat * Math.PI, bob = Math.abs(Math.sin(ph)) * 0.1, H = hero, m = D2.moveT > 0 ? D2.move : null, k = Math.max(0, D2.moveT / 0.45);
  heroRoot.position.set(P.x, P.y + bob + (m === 'up' ? Math.sin(k * Math.PI) * 0.45 : 0), P.z);
  H.root.rotation.set(0, P.face + (m === 'left' ? 0.5 * k : m === 'right' ? -0.5 * k : Math.sin(ph * 0.5) * 0.2), m === 'left' ? 0.18 * k : m === 'right' ? -0.18 * k : 0);
  H.hips.position.y = H.legLen - (m === 'down' ? 0.3 * k : bob * 0.4);
  const sw = Math.sin(ph);
  if (m === 'up') { H.armR.pivot.rotation.set(-2.9, 0, 0.2); H.armL.pivot.rotation.set(-2.9, 0, -0.2); }
  else if (m === 'left') { H.armL.pivot.rotation.set(-1.6, 0, -1.2); H.armR.pivot.rotation.set(-0.4, 0, 0.6); }
  else if (m === 'right') { H.armR.pivot.rotation.set(-1.6, 0, 1.2); H.armL.pivot.rotation.set(-0.4, 0, -0.6); }
  else if (m === 'down') { H.armR.pivot.rotation.set(-1.4, 0, 0.3); H.armL.pivot.rotation.set(-1.4, 0, -0.3); }
  else { H.armR.pivot.rotation.set(-1.2 + sw * 0.6, 0, 0.3); H.armL.pivot.rotation.set(-1.2 - sw * 0.6, 0, -0.3); }
  H.legL.pivot.rotation.x = m === 'down' ? -0.9 * k : sw * 0.25; H.legR.pivot.rotation.x = m === 'down' ? -0.9 * k : -sw * 0.25;
  if (H.legL.knee) { H.legL.knee.rotation.x = m === 'down' ? 1.6 * k : 0; H.legR.knee.rotation.x = m === 'down' ? 1.6 * k : 0; }
  drawDance(now);
  if (now > D2.end) endDance(false);
}
function drawDance(now) {
  const D2 = dance, cv = $('danceCv'), c = cv.getContext('2d'), Wc = cv.width, Hc = cv.height, s = Wc / 390;
  c.clearRect(0, 0, Wc, Hc);
  const rx = Wc / 2, ry = Hc * 0.74, R = 46 * s, speed = Hc * 0.55; // pixels per second
  // the ring pulses on the beat
  const pulse = 1 + Math.max(0, Math.cos(((now - D2.tr.t0) / (D2.tr.spb16 * 4)) * Math.PI * 2)) * 0.06;
  c.lineWidth = 6 * s; c.strokeStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(rx, ry, R * pulse, 0, 7); c.stroke();
  c.lineWidth = 2 * s; c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(rx, ry, R * 1.55, 0, 7); c.stroke();
  for (const n of D2.notes) {
    if (n.done) continue; const dtn = n.t - now; if (dtn > 2.2) continue;
    const y = ry - dtn * speed; if (y < -60) continue;
    const [dx, dy] = DIRS[n.dir], col = DIR_COL[n.dir];
    c.save(); c.translate(rx, y); c.rotate(Math.atan2(dy, dx) + Math.PI / 2);
    c.fillStyle = col; c.strokeStyle = '#141428'; c.lineWidth = 4 * s; c.beginPath();
    c.moveTo(0, -30 * s); c.lineTo(26 * s, 4 * s); c.lineTo(10 * s, 4 * s); c.lineTo(10 * s, 26 * s); c.lineTo(-10 * s, 26 * s); c.lineTo(-10 * s, 4 * s); c.lineTo(-26 * s, 4 * s); c.closePath(); c.stroke(); c.fill(); c.restore();
  }
  c.textAlign = 'center'; c.font = `900 ${22 * s}px ui-rounded, system-ui, sans-serif`;
  if (D2.judgeT > 0) { c.fillStyle = D2.judge === 'PERFECT' ? '#ffd23f' : D2.judge === 'GOOD' ? '#4cd964' : '#ff3b4a'; c.fillText(D2.judge, rx, ry + R * 1.9); }
  c.font = `900 ${18 * s}px ui-rounded, system-ui, sans-serif`; c.fillStyle = '#fff';
  c.fillText(`${Math.round(D2.score)}`, rx, Hc * 0.33); if (D2.combo > 2) { c.fillStyle = '#ff6fb5'; c.fillText(`${D2.combo}x combo`, rx, Hc * 0.33 + 26 * s); }
  c.font = `800 ${13 * s}px ui-rounded, system-ui, sans-serif`; c.fillStyle = 'rgba(255,255,255,.75)'; c.fillText('Swipe the arrow\'s direction when it hits the ring', rx, Hc * 0.94);
}
function endDance(quit) {
  const D2 = dance; if (!D2) return; dance = null;
  removeEventListener('keydown', onkeydown_dance); danceStop(); zoom = D2.zoom0;
  $('danceUI').classList.add('hidden'); $('pad').classList.remove('hidden');
  for (const n of inside?.npcs || []) if (n.role === 'guest') n.dance = inside?.id === 'club';
  for (const m of inside?.marks || []) m.g.visible = true;
  hero.root.rotation.set(0, P.face, 0); hero.hips.position.y = hero.legLen;
  const acc = D2.hits / D2.notes.length; if (acc > 0.6) life().flags.danced = 1;
  if (date && inside?.id === 'club') { const dd = date; if (dd.dancing) { dd.interest += 8 + Math.round(acc * 14); bumpRel(dd.id, 5, false); hearts(dd.x, dd.z, 10); setTimeout(() => toast(`${dd.name}: "${acc > 0.7 ? 'Okay, you can DANCE.' : 'Haha, that was fun!'}"`, 2.6), 2600); } else dd.interest += acc > 0.8 ? 4 : -2; dd.dancing = false; }
  if (quit && D2.hits < 5) { toast('You left the dance floor.'); return; }
  const tips = acc > 0.85 ? Math.round(D2.score / 40) : 0;
  advanceTime(0.5); feed({ mood: Math.round(6 + acc * 20), energy: -10 }); gainXP('charm', Math.round(8 + acc * 30)); gainXP('stamina', 8);
  if (tips) addMoney(tips);
  modal(`<h3>${acc > 0.9 ? 'You owned the floor!' : acc > 0.6 ? 'Nice moves' : 'You... tried'}</h3><p>Score <b>${Math.round(D2.score)}</b> · ${D2.hits}/${D2.notes.length} hits · ${D2.perfect} perfect · best combo ${D2.best}</p><p>Mood up, Charm up.${tips ? ` The crowd threw you ${fmt(tips)} in tips!` : ''}</p>`, [{ label: 'Dance again', cls: 'big', fn: () => { closeModal(); startDance(); } }, { label: 'Done', fn: closeModal }]);
  saveGame();
}

// ================================================================ COLLEGE & CAREERS (study → degree → job ladder)
const edu = () => stats.edu ||= { enrolled: null, progress: {}, done: [], studied: 0, attended: 0 };
const hasDegree = id => edu().done.includes(id);
const career = () => stats.career || null;
function careerTitle() { const c = career(); return c ? CAREERS[c.id].ladder[c.lvl][0] : null; }
function shuffle(a) { return a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]); }
async function quiz(subject, n = 3, who = null) {
  const qs = shuffle(QUIZ[subject] || QUIZ.retail).slice(0, n); let right = 0;
  for (const [q, a, ...wrong] of qs) {
    await talk.say(q);
    const opts = shuffle([a, ...wrong]), k = await talk.choose(opts.map(o => I('chat', o)));
    if (opts[k] === a) { right++; await talk.say(pick(['Correct.', 'Exactly right.', 'Good.', 'Yes!'])); }
    else await talk.say(`Not quite. It's "${a}".`);
  }
  return right;
}
async function talkAdmissions() {
  const n = inside.npcs.find(q => q.role === 'sales'), E = edu();
  beginTalk(n.cfg, 'Ms. Adeyemi', 'Admissions', 230, n.relId);
  await talk.say(E.enrolled ? `You're enrolled in ${COURSES[E.enrolled].name}: ${E.progress[E.enrolled] || 0} of ${COURSES[E.enrolled].classes} classes done.` : 'Welcome to Bay City College! Adult education, evenings and weekends. What would you like to study?');
  const opts = [], ids = [];
  if (!E.enrolled) for (const [id, C] of Object.entries(COURSES)) {
    if (hasDegree(id)) continue;
    const locked = C.needs && !hasDegree(C.needs);
    opts.push({ label: I(C.icon, `${C.name} <small>${C.fee ? fmt(C.fee) : 'free'} · ${C.classes} classes${locked ? ` · needs ${COURSES[C.needs].name}` : ''}</small>`), disabled: locked || money < C.fee }); ids.push(id);
  }
  if (E.enrolled) { opts.push(I('x', `Drop ${COURSES[E.enrolled].name} (no refund)`)); ids.push('drop'); }
  if (E.done.length) { opts.push(I('star', 'My qualifications')); ids.push('quals'); }
  opts.push(I('x', 'Just looking')); ids.push('bye');
  const k = ids[await talk.choose(opts)];
  if (k === 'drop') { E.enrolled = null; await talk.say('Done. You can come back any time.'); }
  else if (k === 'quals') await talk.say(`You hold: ${E.done.map(d => COURSES[d].name).join(', ')}.`);
  else if (k !== 'bye') {
    const C = COURSES[k];
    if (C.clean && (stats.jailRecord || 0) > dayN - 30) await talk.say('The Academy needs a clean record for the last 30 days. Come back when you\'ve stayed out of trouble.');
    else { if (C.fee) spend(C.fee); E.enrolled = k; E.progress[k] ||= 0; await talk.say(`You're in! ${C.name}. ${C.desc} One class a day, between 8am and 8pm. It unlocks: ${C.unlocks}.`); feed({ mood: 6 }); }
  }
  endTalk(); saveGame();
}
async function attendClass() {
  const E = edu(), n = inside.npcs.find(q => q.role === 'professor');
  if (!E.enrolled) { toast('Enrol at Admissions first.'); return; }
  if (E.attended === dayN) { toast('One class a day. Come back tomorrow.'); return; }
  if (clockH < 8 || clockH >= 20) { toast('Classes run from 8am to 8pm.'); return; }
  const C = COURSES[E.enrolled];
  beginTalk(n.cfg, 'Professor Lindqvist', C.name, 150, n.relId);
  await talk.say(pick(['Take a seat. Pop quiz, three questions.', 'Good to see you. Let\'s test what you remember.', 'Phones away. Three questions.']));
  const right = await quiz(E.enrolled, 3), need = E.studied === dayN - 1 || E.studied === dayN ? 1 : 2;
  E.attended = dayN; advanceTime(2); feed({ energy: -8 });
  gainXP('smarts', 20 + right * 10);
  if (right >= need || (right === need - 1 && Math.random() < lvl('smarts') * 0.08)) {
    E.progress[E.enrolled] = (E.progress[E.enrolled] || 0) + 1;
    if (E.progress[E.enrolled] >= C.classes) { E.done.push(E.enrolled); const d = E.enrolled; E.enrolled = null; await talk.say(`That's the last one. Congratulations, you've graduated: ${C.name}!`); endTalk(); feed({ mood: 30 }); spawnParticles(P.x, 2, P.z, ['#ffd23f', '#2f80ed', '#ffffff'], 30, 5, 1, 0.12); toast(`Graduated: ${C.name}. Unlocked: ${C.unlocks}`, 5); saveGame(); return; }
    await talk.say(`Well done. That's ${E.progress[E.enrolled]} of ${C.classes}.`);
  } else await talk.say(`Only ${right} right. That class doesn't count. Study in the library and try again tomorrow.`);
  endTalk(); saveGame();
}
async function talkCareer(placeId) {
  const here = Object.entries(CAREERS).filter(([, c]) => c.place === placeId), cur = career();
  const n = inside.npcs[0];
  beginTalk(n.cfg, n.name || 'Manager', inside.tpl.name + ' · Staff', 160, n.relId);
  if (cur && CAREERS[cur.id].place === placeId) {
    const CR = CAREERS[cur.id], [title, pay] = CR.ladder[cur.lvl];
    await talk.say(`Hey ${title.toLowerCase()}. Performance: ${Math.round(cur.perf)}%.`);
    const k = await talk.choose([I('case', `Start a shift <small>${fmt(pay)}</small>`), I('star', 'Ask for a promotion'), I('x', 'Quit this job'), I('x', 'Later')]);
    if (k === 0) {
      if (cur.lastDay === dayN) await talk.say('You already worked today. Go home and rest.');
      else if (clockH < 7 || clockH >= 19) await talk.say('Shifts start between 7am and 7pm.');
      else {
        await talk.say(pick(['Right, here\'s what I need from you today.', 'Busy day. Let\'s see what you\'ve got.', 'Clock in. Three things to handle.']));
        const right = await quiz(CR.subject, 3);
        const earned = Math.round(pay * (0.7 + right * 0.15) * (1 + lvl('smarts') * 0.02));
        cur.perf = clamp(cur.perf + right * 9 - 8, 0, 100); cur.shifts++; cur.lastDay = dayN; addMoney(earned); gainXP('smarts', 10 + right * 5); advanceTime(6); feed({ energy: -25, hunger: -15, mood: right >= 2 ? 4 : -4 });
        await talk.say(right === 3 ? `Excellent shift! Here's ${fmt(earned)}.` : right ? `Good enough. ${fmt(earned)} for today.` : `Rough day. Here's ${fmt(earned)}. Do better.`);
        if (cur.perf >= 80 && cur.shifts >= 4 * (cur.lvl + 1) && cur.lvl < CR.ladder.length - 1) { cur.lvl++; cur.perf = 55; await talk.say(`You know what? You've earned it. You're now ${CR.ladder[cur.lvl][0]}, on ${fmt(CR.ladder[cur.lvl][1])} a shift!`); feed({ mood: 25 }); }
      }
    } else if (k === 1) {
      if (cur.lvl >= CR.ladder.length - 1) await talk.say('You\'re already at the top. Congratulations.');
      else if (cur.perf >= 70 && cur.shifts >= 3 * (cur.lvl + 1)) { cur.lvl++; cur.perf = 50; await talk.say(`Alright. Promoted to ${CR.ladder[cur.lvl][0]}.`); feed({ mood: 20 }); }
      else { cur.perf = Math.max(0, cur.perf - 5); await talk.say(`Not yet. Keep your performance up (${Math.round(cur.perf)}%) and put in more shifts.`); }
    } else if (k === 2) { stats.career = null; await talk.say('Sorry to see you go.'); }
  } else {
    await talk.say(here.length ? 'We\'re hiring. Interested?' : 'Nothing going here right now.');
    const opts = [], ids = [];
    for (const [id, c] of here) { const ok = !c.needs || hasDegree(c.needs); opts.push({ label: I('case', `${c.ladder[0][0]} <small>${fmt(c.ladder[0][1])} / shift${ok ? '' : ` · needs ${COURSES[c.needs].name}`}</small>`), disabled: !ok }); ids.push(id); }
    opts.push(I('x', 'No thanks')); ids.push('bye');
    const k = ids[await talk.choose(opts)];
    if (k !== 'bye') {
      if (cur) { await talk.say(`You'll have to quit your job as ${careerTitle()} first.`); const q = await talk.choose([I('check', 'Quit and take this one'), I('x', 'Never mind')]); if (q) { endTalk(); return; } }
      if (k === 'cop' && (stats.jailRecord || 0) > dayN - 30) await talk.say('Background check failed. Come back with a clean record.');
      else { const sb = styleBonus('day'), dressed = sb >= 4, scruffy = sb <= -3; // turning up dressed for it matters
        if (scruffy && Math.random() < 0.5) { await talk.say(pick(['...You came to an interview dressed like THAT? Come back when you\'ve made an effort.', 'Sorry. We have a dress code. Try again in something smart.'])); endTalk(); return; }
        stats.career = { id: k, lvl: 0, perf: dressed ? 62 : scruffy ? 40 : 50, shifts: 0, lastDay: 0 }; await talk.say(`${dressed ? 'Sharp outfit. I like someone who makes an effort. ' : scruffy ? 'Hm. Smarten up for your shifts, yeah? ' : ''}Welcome aboard, ${CAREERS[k].ladder[0][0]}! One shift a day, 7am to 7pm. Do well and you'll move up.`); feed({ mood: 12 }); }
    }
  }
  endTalk(); saveGame();
}

// ================================================================ LIFE EVENTS: random moments with choices that ripple forward (butterfly effects)
const life = () => stats.life ||= { flags: {}, queue: [], karma: 0, nextAt: 0, recent: [], drinks: 0 };
function forceWanted(st) { WANT.v = Math.max(WANT.v, STAR_AT[st]); WANT.stars = Math.max(WANT.stars, st); WANT.seen = true; WANT.lx = P.x; WANT.lz = P.z; WANT.coolT = 7; WANT.spawnT = 1.5; }
function lifeApi() {
  const L = life(), f = fam();
  return {
    fmt, money: () => money, give: n => addMoney(Math.round(n)), take: n => { money = Math.max(0, money - Math.round(n)); }, mood: d => feed({ mood: d }), energy: d => feed({ energy: d }), hp: d => { if (d < 0) { P.hp = Math.max(5, P.hp + d); hurtFlash = 0.35; } else P.hp = Math.min(maxHP(), P.hp + d); },
    karma: d => { L.karma = clamp(L.karma + d, -100, 100); }, karmaV: () => L.karma, flag: (k, v) => { L.flags[k] = v; }, has: k => !!L.flags[k],
    schedule: (id, days, data) => L.queue.push({ id, at: gameHours() + days * 6, data }),
    lvl, lvlUp: (k, x) => gainXP(k, x), rel: (id, d) => bumpRel(id, d, false), relV: id => rel(id),
    night: () => clockH < 5 || clockH >= 21, driving: () => !!ride, hasCar: () => !!myCar, ownsHome: () => owned.size > 0,
    career: () => career(), careerName: () => career() ? CAREERS[career().id].name.toLowerCase() : '', perf: d => { if (career()) career().perf = clamp(career().perf + d, 0, 100); },
    fire: () => { stats.career = null; }, promote: () => { const c = career(); if (c && c.lvl < CAREERS[c.id].ladder.length - 1) { c.lvl++; c.perf = 60; } }, hire: id => { stats.career = { id, lvl: 0, perf: 55, shifts: 0, lastDay: 0 }; },
    crime: st => forceWanted(st), kidAge: (...st) => f.kids.find(k => st.includes(kidStage(k))) || null, partner: () => f.partner, hasKids: () => f.kids.length > 0, hasDated: () => Object.keys(stats.dates || {}).length > 0,
    breakup: () => { const p = f.partner; if (p) { stats.rel[p.id] = 5; f.partner = null; } }, fat: () => body().fat, muscle: () => body().muscle, drinker: () => L.drinks > 12,
    hospital: () => { P.hp = 1; die(); }, wasInside: () => stats.jailRecord != null, loseStash: () => { for (const g of GOODS) stash[g.id] = 0; },
    dealMeet: () => startDealMeet(),
    dayTime: () => clockH >= 8 && clockH < 14.5, inCar: () => !!ride && !ride.b.two, atHome: () => !!inside?.prop, neighbours: () => { const p = inside?.prop; return !!p && objsNear(p.x - 45, p.z - 45, p.x + 45, p.z + 45).filter(o => o.t === 'bld').length >= 3; }, moodV: () => stats.mood, waypoint: id => { const p = PLACES.find(q => q.id === id); if (p) setWaypoint(p.x, p.z, p.name); },
    // send the player somewhere: sets the GPS, and the outcome only happens when you get there
    errand: (where, key, data = {}, label = 'Errand', needCar = false) => {
      let x, z, name = label;
      if (where === 'pier') { x = 94; z = 360; }
      else if (where === 'northfield' || where === 'random') { const c = where === 'northfield' ? CITIES.find(q => q.id === 'north') : cityNear(P.x, P.z, 400) || CITIES[0]; for (let i = 0; i < 30; i++) { const ix = c.kx[0] + Math.floor(Math.random() * (c.kx[1] - c.kx[0])), iz = c.kz[0] + Math.floor(Math.random() * (c.kz[1] - c.kz[0])); x = c.cx + (ix + 0.5) * 48 + 16.6; z = c.cz + (iz + 0.5) * 48; if (walkable(x, z) && Math.hypot(x - P.x, z - P.z) > 60) break; } }
      else { const p = PLACES.find(q => q.id === where); x = p.x; z = p.z; name = label || p.name; }
      L.errands ||= []; L.errands.push({ key, x, z, label: name, data, needCar, until: gameHours() + 30 });
      setWaypoint(x, z, name);
    },
    gang: (g, d) => bumpGang(g, d),
    hotCar: hot => { ensureCarLib(); const s2 = L.errands?.find(e => e.key === 'hot_car_pickup') || { x: P.x, z: P.z }; let sx = s2.x, sz = s2.z; for (let r = 3; r < 40; r += 3) if (roadAt(s2.x, s2.z + r)) { sz = s2.z + r; break; } const v = makeVehicle(pick(carLib).cfg, sx, sz, 0, false); v.hot = true; if (hot) setTimeout(() => forceWanted(2), 6000); },
    dropHotCar: () => { const v = ride?.hot ? ride : vehicles.find(q => q.hot); if (v) { if (v === ride) exitCar(); setTimeout(() => removeVehicle(v), 1200); } },
    dealerRel: d => { for (const p of PLACES) if (p.kind === 'dealer') stats.rel[p.id] = clamp(rel(p.id) + d, 0, 100); }, carDamage: n => { if (myCar) damageCar(myCar, n, myCar.s.x + 1, myCar.s.z); }, drunk: x => addDrunk(x),
  };
}
let eventOpen = false, lifeAct = null;
const lifeBusy = () => eventOpen || state !== 'play' || dance || brawl || cutting || woo || stats.jail || P.dead || carAnim || job || inside?.id === 'prison' || date;
function lifeCfg(w) {
  if (!w) return npcCfg('guest', 1);
  if (w.role === 'homeless') return { ...npcCfg('guest', w.seed || 1), top: 'jacket', topColor: '#5a5048', accent: '#3a342e', pantsColor: '#4a4238', hat: 'beanie', hatColor: '#3a3d45', facialHair: 'bigbeard', hairColor: '#8a8a8a' };
  const c = npcCfg(w.role || 'guest', w.seed || 1);
  return w.fem ? { ...c, fem: true, facialHair: 'none', hair: 'long', glam: true } : c;
}
// can this event be delivered right now, where you are?
function canDeliver(via, api, ev) {
  if (ev?.scene === 'car' && !(ride && !ride.b.two)) return false; // car moments only happen when you're actually in a car
  if (stats.jail || (stats.freedAt && gameHours() - stats.freedAt < 1)) return false; // not straight out of the cell
  if (via === 'approach') return !ride && !inside && !!cityNear(P.x, P.z, 20);
  if (via === 'object') return !ride && !inside && !!cityNear(P.x, P.z, 20);
  if (via === 'thought') return !ride || Math.abs(ride.s.v) < 1;
  if (via === 'call') return true; // you can take a call anywhere, including behind the wheel
  if (via === 'pickup') return !inside;
  return false; // home / place / work events wait until you arrive there
}
// errands from life events: arrive at the place and the thing actually happens there
function updateErrands() {
  const L = life(); if (!L.errands?.length || state !== 'play' || talk.active) return;
  for (const e of [...L.errands]) {
    if (gameHours() > e.until) { L.errands.splice(L.errands.indexOf(e), 1); toast(`Too late: ${e.label}.`, 2.5); continue; }
    const f = focusPos(); if (inside || Math.hypot(f.x - e.x, f.z - e.z) > (e.needCar ? 12 : 9)) continue;
    if (e.needCar && !ride?.hot) continue;
    L.errands.splice(L.errands.indexOf(e), 1); if (waypoint && Math.hypot(waypoint.x - e.x, waypoint.z - e.z) < 2) clearWaypoint();
    if (e.key === 'track_debtor') { debtorScene(e.data); return; } // this one plays out in front of you
    const msg = ARRIVE[e.key]?.(lifeApi(), e.data); if (!msg) continue;
    if (typeof msg === 'object' && msg.fight) { const cfg = lifeCfg(msg.who || {}); const a = P.face, p = eventPed(cfg, P.x + Math.sin(a) * 2.2, P.z + Math.cos(a) * 2.2, { name: msg.who?.name || 'Them', state: 'talk', lookX: P.x, lookZ: P.z }); const spk = { cfg, name: msg.who?.name || 'Them', tag: msg.who?.tag || e.label, p };
      (async () => { eventOpen = true; beginTalk(cfg, spk.name, spk.tag, 160, null); for (const l of [].concat(msg.say || [])) await talk.say(l); endTalk(); eventOpen = false; startTalkFight(spk, msg, () => endLifePed({ p })); })(); return; }
    beginTalk(charCfg, 'You', e.label, 220, null, null, null, true); talk.say(msg).then(() => { endTalk(); saveGame(); });
    return;
  }
}
// ---- chasing a debt: they're outside, and either pay up or their mates step in
let debtor = null;
function debtorScene(d) {
  let sp = null; for (let i = 0; i < 20 && !sp; i++) { const a = rand(0, 6.28), r = rand(5, 8), x = P.x + Math.sin(a) * r, z = P.z + Math.cos(a) * r; if (walkable(x, z) && !solidPoint(x, z, 1)) sp = { x, z }; }
  if (!sp) sp = { x: P.x + 4, z: P.z };
  const cfg = lifeCfg({ role: 'guest', seed: d.seed }), p = eventPed(cfg, sp.x, sp.z, { state: 'talk', lookX: P.x, lookZ: P.z, name: d.name });
  const pays = Math.random() < 0.5 + lvl('strength') * 0.04, who = { key: 'debt' + d.seed, name: d.name, cfg: p.look.cfg, pitch: lookIsFem(p.look) ? 300 : 170 };
  debtor = { d, p, who, pays, t: 0, thugs: [], stage: 0 };
  youSay(pick([`${d.name}. You owe me ${fmt(d.amt)}.`, `There you are, ${d.name}. Where's my money?`]), 'angry', { pri: 3, now: true });
}
function updateDebtor(dt) {
  const D = debtor; if (!D) return; D.t += dt; const p = D.p;
  if (!peds.list.includes(p) || inside) { debtor = null; return; }
  if (D.stage === 0 && D.t > 2.8) { D.stage = 1;
    if (D.pays) { subs.say(D.who, pick(['Alright, alright! I was gonna pay you back, I swear.', 'Okay! Here. All of it. Don\'t hurt me.']), { expr: 'shock', pri: 3 }); D.t = 0; D.stage = 2; }
    else { subs.say(D.who, pick(['You want it? Come and get it. Boys!', 'Not today, mate. Lads, sort him out.']), { expr: 'angry', pri: 3 }); peds.flee(p, P.x, P.z); p.t = 8;
      for (let i = 0; i < 2; i++) { const a = rand(0, 6.28), th = eventPed({ top: 'hoodie', topColor: pick(['#16161b', '#3a3d45']), hat: 'beanie', hatColor: '#16161b', fem: false, muscle: rand(0.4, 0.8) }, P.x + Math.sin(a) * 6, P.z + Math.cos(a) * 6, { name: pick(['Big Lad', 'Hood', 'Thug']), angry: true, angryT: 30, brave: true }); D.thugs.push(th); }
      D.stage = 3; D.t = 0; } }
  if (D.stage === 2 && D.t > 2.2) { dropCash(p.x, p.z, D.d.amt); peds.flee(p, P.x, P.z); p.t = 5; youSay(pick(['Pleasure doing business.', 'Was that so hard?']), 'happy'); feed({ mood: 6 }); debtor = null; return; }
  if (D.stage === 3) { // beat both of them and the money's yours after all
    const up = D.thugs.filter(q => peds.list.includes(q) && q.state !== 'down' && q.angry);
    if (!up.length && D.t > 2) { D.stage = 4; subs.say(D.who, 'Okay okay! Take it! Just leave me alone!', { expr: 'shock', pri: 3 }); p.x = P.x + 2; p.z = P.z + 1; p.state = 'talk'; p.lookX = P.x; p.lookZ = P.z; D.t = 0; gainXP('strength', 30); }
    else if (D.t > 40) { toast(`${D.d.name} got away with your money.`, 2.6); feed({ mood: -8 }); debtor = null; }
  }
  if (D.stage === 4 && D.t > 2) { dropCash(p.x, p.z, D.d.amt); peds.flee(p, P.x, P.z); p.t = 5; debtor = null; }
}
function lifeTick(dt) {
  updateErrands(); updateDebtor(dt);
  updateLifeAct(dt);
  if (SANDBOX) return; // nothing random in the sandbox: you summon what you want to test
  if (lifeBusy() || lifeAct) return;
  const L = life(), now = gameHours(), api = lifeApi();
  L.waiting ||= [];
  L.waiting = L.waiting.filter(w => w.until > now);
  if (!L.nextAt) L.nextAt = now + rand(3, 6);
  // follow-ups first (butterfly effects coming home to roost)
  const qi = L.queue.findIndex(q => q.at <= now);
  if (qi >= 0) {
    const q = L.queue[qi], ev = EVENT_BY_ID[q.id]; if (!ev) { L.queue.splice(qi, 1); return; }
    if (canDeliver(ev.via, api, ev)) { L.queue.splice(qi, 1); deliverEvent(ev, q.data || {}); }
    else if (!['approach', 'object', 'thought', 'call', 'pickup'].includes(ev.via)) { L.queue.splice(qi, 1); L.waiting.push({ id: ev.id, data: q.data || {}, until: now + 72 }); }
    return;
  }
  if (now < L.nextAt) return;
  L.nextAt = now + rand(5, 12);
  const pool = EVENTS.filter(e => !e.follow && !L.recent.includes(e.id) && (canDeliver(e.via, api, e) || ['home', 'work'].includes(e.via) || e.via.startsWith('place:'))).map(e => [e, e.when ? e.when(api) : (e.w ?? 1)]).filter(([, w]) => w > 0);
  let r = Math.random() * pool.reduce((a, [, w]) => a + w, 0), ev = null;
  for (const [e, w] of pool) if ((r -= w) <= 0) { ev = e; break; }
  if (!ev) return;
  L.recent.push(ev.id); if (L.recent.length > 6) L.recent.shift();
  const data = ev.init ? ev.init(api) : {};
  if (canDeliver(ev.via, api, ev)) deliverEvent(ev, data); else L.waiting.push({ id: ev.id, data, until: now + 72 });
}
// you walked in somewhere: anything waiting to happen here?
function lifeArrive() {
  if (!inside || lifeBusy()) return;
  const L = life(), f = fam(); L.waiting ||= [];
  for (let i = 0; i < L.waiting.length; i++) {
    const w = L.waiting[i], ev = EVENT_BY_ID[w.id]; if (!ev) continue;
    let n = null;
    if (ev.via === 'home' && inside.prop && owned.has(inside.prop.id)) {
      n = ev.speaker === 'kid' ? inside.npcs.find(q => q.fam && w.data.kid && q.fam.id === w.data.kid.id) : inside.npcs.find(q => q.role === 'spouse');
      if (!n) continue;
    } else if (ev.via === 'work' && career() && CAREERS[career().id].place === inside.id) n = inside.npcs[0];
    else if (ev.via.startsWith('place:') && inside.id === ev.via.slice(6)) n = inside.npcs[0];
    if (!n) continue;
    L.waiting.splice(i, 1);
    const who = ev.who ? ev.who(lifeApi(), w.data) : {};
    setTimeout(() => runEventTalk(ev, w.data, { cfg: n.cfg, name: n.fam?.name || (ev.speaker === 'partner' ? f.partner?.name : n.name) || who.name || 'Them', tag: who.tag || (ev.speaker === 'kid' ? 'Your kid' : ev.speaker === 'partner' ? 'Your partner' : inside.tpl.name) }), 900);
    return;
  }
}
function deliverEvent(ev, data) {
  const api = lifeApi(), who = ev.who ? ev.who(api, data) : {};
  if (ev.via === 'thought') { const bedF = inside?.prop && (clockH < 6 || clockH >= 21) ? inside.h.furn.find(f => FURN[f.t].act === 'sleep') : null; // at home at night you're lying in your own bed
    return runEventTalk(ev, data, { cfg: charCfg, name: 'You', tag: ev.scene === 'car' || (ride && !ride.b.two) ? 'Behind the wheel' : bedF ? 'In bed' : 'Thinking...', think: true, seat: ev.scene === 'car' || !!(ride && !ride.b.two), bed: bedF ? (bedF.c || FURN[bedF.t].colors?.[0] || '#3a5fa0') + '|' + bedF.t : null, car: ev.scene === 'car' && ride ? { color: ride.cfg?.bodyColor } : null }); }
  if (ev.via === 'call') {
    // she's in the same house: she doesn't ring you, she comes and tells you
    // they're right here with you: no phone call, they walk over and say it in person
    { const f = fam(), nm = who.name || '', first = nm.split(' ')[0], near = nm && !ride && peds.list.find(q => q.name && q.state !== 'down' && !q.angry && (q.name === nm || q.name.split(' ')[0] === first || (f.partner && nm === f.partner.name && q.name === f.partner.name)) && Math.hypot(q.x - P.x, q.z - P.z) < 18);
      if (near && !data.forcePhone) { eventOpen = true; peds.release?.(near); setTimeout(() => { eventOpen = false; if (state !== 'play') return; const prev = near.state; near.x += (P.x - near.x) * 0.6; near.z += (P.z - near.z) * 0.6; peds.talk(near, P.x, P.z); runEventTalk(ev, data, { cfg: near.look?.cfg || lifeCfg(who), name: nm, tag: 'In person', p: near }, () => { near.state = prev === 'talk' ? 'idle' : prev; }); }, 300); return; } }
    if (buddy?.p && who.name && peds.list.includes(buddy.p) && (who.name === buddy.name || who.name.split(' ')[0] === buddy.name)) { eventOpen = true; setTimeout(() => { eventOpen = false; if (state !== 'play') { life().queue.push({ id: ev.id, at: gameHours() + 1, data }); return; } runEventTalk(ev, data, { cfg: buddy.look || lifeCfg(who), name: who.name, tag: 'With you', p: buddy.p }); }, 400); return; }
    { const f = fam(), n = inside?.prop && who.name && (f.partner?.name === who.name ? inside.npcs.find(q => q.role === 'spouse') : inside.npcs.find(q => q.fam?.name === who.name)); if (n) { eventOpen = true; setTimeout(() => { eventOpen = false; if (state !== 'play') { life().queue.push({ id: ev.id, at: gameHours() + 1, data }); return; } runEventTalk(ev, data, { cfg: n.cfg, name: who.name, tag: f.partner?.name === who.name ? 'Your partner' : 'Family' }); }, 500); return; } }
    eventOpen = true; const A = audio(); if (A) for (let i = 0; i < 4; i++) sfx.note(i % 2 ? 1180 : 940, A.currentTime + i * 0.18, 0.15, 'square', 0.03, 3000);
    ringing(who.name || 'Unknown', lifeCfg(who));
    setTimeout(() => { eventOpen = false; if (state !== 'play') { life().queue.push({ id: ev.id, at: gameHours() + 1, data }); return; } runEventTalk(ev, data, { cfg: lifeCfg(who), name: who.name || 'Caller', tag: `${who.tag || 'Calling'} · on the phone`, phone: true, seat: !!(ride && !ride.b.two) }); }, 1500);
    return;
  }
  if (ev.via === 'approach') {
    const cfg = lifeCfg(who); let sp = null;
    const clear = (x, z) => { for (let k = 1; k < 8; k++) { const t = k / 8, qx = x + (P.x - x) * t, qz = z + (P.z - z) * t; if (!walkable(qx, qz) || solidPoint(qx, qz, 1)) return false; } return true; }; // somewhere they can actually walk straight to you from
    for (let i = 0; i < 30 && !sp; i++) { const a = rand(0, 6.28), d = rand(11, 16), x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d; if (walkable(x, z) && !solidPoint(x, z, 1) && clear(x, z)) sp = { x, z }; }
    for (let i = 0; i < 20 && !sp; i++) { const a = rand(0, 6.28), d = rand(11, 16), x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d; if (walkable(x, z) && !solidPoint(x, z, 1)) sp = { x, z }; }
    if (!sp) { life().queue.push({ id: ev.id, at: gameHours() + 1, data }); return; }
    const p = peds.makePed(bakeCfg(cfg)); Object.assign(p, { kind: 'life', x: sp.x, z: sp.z, hx: sp.x, hz: sp.z, state: 'chase', tx: P.x, tz: P.z, name: who.name });
    peds.list.push(p); lifeAct = { kind: 'approach', ev, data, p, cfg, who, t: 0 };
    if (who.name && !['Hooded man'].includes(who.name)) setTimeout(() => toast(`${who.name} is walking over to you`, 2), 600);
    return;
  }
  if (ev.via === 'object') {
    let sp = null; for (let i = 0; i < 20 && !sp; i++) { const a = P.face + rand(-0.6, 0.6), d = rand(5, 9), x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d; if (walkable(x, z) && !solidPoint(x, z, 0.5)) sp = { x, z }; }
    if (!sp) return;
    const g = new THREE.Group(), m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.24), new THREE.MeshStandardMaterial({ color: '#5a3a20', roughness: 0.6 })); g.add(m);
    const glint = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.2), new THREE.MeshBasicMaterial({ color: '#ffd23f' })); glint.position.set(0.08, 0.04, 0); g.add(glint);
    g.position.set(sp.x, baseY(sp.x, sp.z) + 0.04, sp.z); g.rotation.y = rand(0, 6.28); dyn.add(g);
    lifeAct = { kind: 'object', ev, data, g, x: sp.x, z: sp.z, t: 0 };
    return;
  }
  if (ev.via === 'pickup') return startPickup(ev, data);
}
function updateLifeAct(dt) {
  const A2 = lifeAct; if (!A2) return; A2.t += dt;
  if (A2.kind === 'approach') {
    const p = A2.p, d = Math.hypot(p.x - P.x, p.z - P.z);
    if (p.state === 'down' || p.angry || A2.robbed) { endLifePed(A2); lifeAct = null; return; } // you robbed or hit them: they've changed their mind
    if (d < 3 && lifeBusy()) A2.busyT = (A2.busyT || 0) + dt; // you're busy (on a date etc.): they wait a moment, then leave it for another day
    if (!peds.list.includes(p) || inside || d > 70 || A2.t > 30 || (A2.busyT || 0) > 6) { endLifePed(A2); lifeAct = null; if (A2.ev.follow) life().queue.push({ id: A2.ev.id, at: gameHours() + 2, data: A2.data }); return; }
    if (ride) { p.state = 'idle'; return; } // they wait while you're in a car
    p.state = 'chase'; p.tx = P.x; p.tz = P.z;
    if (d < 1.9 && !lifeBusy()) { peds.talk(p, P.x, P.z); lifeAct = null; runEventTalk(A2.ev, A2.data, { cfg: A2.cfg, name: A2.who.name || 'Stranger', tag: A2.who.tag || 'Stranger', p: A2.p }, () => endLifePed(A2)); }
  } else if (A2.kind === 'object') {
    A2.g.rotation.y += dt * 0.8;
    if (A2.t > 150 || inside || Math.hypot(A2.x - P.x, A2.z - P.z) > 90) { dyn.remove(A2.g); lifeAct = null; }
  } else if (A2.kind === 'pickup') updatePickup(dt, A2);
  else if (A2.kind === 'meet') updateMeet(dt, A2);
  else if (A2.kind === 'brawl') updateTalkFight(dt, A2);
  else if (A2.kind === 'escort') updateEscort(dt, A2);
  else if (A2.kind === 'flee') updateTalkFlee(dt, A2);
  else if (A2.kind === 'search') updateSearch(dt, A2);
  else if (A2.kind === 'ambush') updateAmbush(dt, A2);
}
function endLifePed(A2) { const p = A2.p; if (!p) return; peds.release?.(p); p.state = 'flee'; p.fx = Math.sin(p.face + Math.PI); p.fz = Math.cos(p.face + Math.PI); p.t = 3; setTimeout(() => { const i = peds.list.indexOf(p); if (i >= 0) { peds.list.splice(i, 1); dyn.remove(p.root); } }, 6000); }
function pickupObject() { const A2 = lifeAct; if (!A2 || A2.kind !== 'object') return; dyn.remove(A2.g); lifeAct = null; sfx.coin(); runEventTalk(A2.ev, A2.data, { cfg: charCfg, name: 'You', tag: 'Thinking...', think: true }); }
// My Story: every choice you make in a life event, favour or big moment, and what came of it
function logStory(who, choice, result, tag) { const L = stats.storyLog ||= []; L.push({ d: dayN, h: Math.floor(clockH), who, c: String(choice).replace(/<[^>]+>/g, ''), r: String(result || '').replace(/<[^>]+>/g, ''), tag }); if (L.length > 120) L.shift(); }
async function runEventTalk(ev, data, spk, after) {
  const api = lifeApi(); eventOpen = true;
  beginTalk(spk.cfg, spk.name, spk.tag, spk.think ? 200 : 160 + Math.random() * 120, null, null, null, spk.think, !!spk.seat, !!spk.phone, false, spk.bed || null);
  const alt = spk.phone && ev.via !== 'call' ? PHONE_TEXT[ev.id] : !spk.phone && !spk.think && ev.via === 'call' ? PERSON_TEXT[ev.id] : null; // said differently down the phone than face to face
  const lines = [].concat((alt || ev.text)(api, data));
  for (const l of lines) await talk.say(l);
  const ch = ev.choices(api, data), k = await talk.choose(ch.map(c => I('chat', c.label)));
  await talk.say(ch[k].label, 'you');
  const res = ch[k].go(api, data);
  logStory(spk.name || 'You', ch[k].label, typeof res === 'string' ? res : res?.escort ? '(set off together)' : '(it turned into a fight)', ev.id);
  if (res && typeof res === 'object' && res.fight && spk.p && peds.list.includes(spk.p)) { if (res.say) await talk.say(res.say); endTalk(); eventOpen = false; startTalkFight(spk, res, after); return; } // words weren't enough: it kicks off for real
  if (res && typeof res === 'object' && res.fight) { const R = Math.random() < 0.5 + lvl('strength') * 0.05 ? res.win : res.lose; for (const l of [].concat(R.text)) await talk.say(l); R.go?.(api); } // (no one standing there to fight: settle it quickly)
  if (res && typeof res === 'object' && res.flee && spk.p && peds.list.includes(spk.p)) { if (res.say) await talk.say(res.say); endTalk(); eventOpen = false; startTalkFlee(spk, res, after); return; } // you leg it: they chase you for real
  if (res && typeof res === 'object' && res.flee) { const R = Math.random() < 0.5 ? res.flee.win : res.flee.lose; for (const l of [].concat(R.text)) await talk.say(l); R.go?.(api); endTalk(); eventOpen = false; after?.(); saveGame(); return; }
  if (res && typeof res === 'object' && res.act) { if (res.say) await talk.say(res.say); endTalk(); eventOpen = false; playEventAct(spk, res, after); return; } // you actually do it: a little minigame
  if (res && typeof res === 'object' && res.search && spk.p && peds.list.includes(spk.p)) { if (res.say) await talk.say(res.say); endTalk(); eventOpen = false; startSearch(spk, res.search, after); return; } // go and find it for real
  if (res && typeof res === 'object' && res.escort) { const E = res.escort; if (E.say) await talk.say(E.say); endTalk(); eventOpen = false; if (spk.p && peds.list.includes(spk.p)) { startEscort(spk, E, after); return; } const r = E.done(); if (r) toast(r, 3); after?.(); saveGame(); return; } // they walk with you to where they need to be
  if (typeof res === 'string' && res) await talk.say(res);
  endTalk(); eventOpen = false; after?.(); saveGame();
}
// ---------------- walking someone somewhere: they follow at your side and the GPS shows where they're going
function startEscort(spk, E, after) {
  const p = spk.p; peds.release?.(p); const [d0, d1] = E.near; let to = null;
  const pl = PLACES.filter(q => { const d = Math.hypot(q.x - P.x, q.z - P.z); return d >= d0 && d <= d1 && walkable(q.x, q.z); });
  if (pl.length && d1 > 30) { const q = pick(pl); to = { x: q.x, z: q.z }; }
  for (let i = 0; i < 40 && !to; i++) { const a = rand(0, 6.28), d = rand(d0, d1), x = P.x + Math.sin(a) * d, z = P.z + Math.cos(a) * d; if (walkable(x, z) && !solidPoint(x, z, 1) && !inWater(x, z)) to = { x, z }; }
  if (!to) to = { x: P.x + 15, z: P.z };
  Object.assign(p, { follow: true, state: 'chase', tx: p.x, tz: p.z });
  lifeAct = { kind: 'escort', p, spk, E, after, to, t: 0, lost: 0 };
  setWaypoint(to.x, to.z, E.label || 'Walk them there'); toast(`${E.label || 'Walk them there'}: she'll follow you`, 2.6);
}
function updateEscort(dt, A2) {
  const p = A2.p, d = Math.hypot(p.x - P.x, p.z - P.z), dd = Math.hypot(p.x - A2.to.x, p.z - A2.to.z);
  const fail = msg => { lifeAct = null; clearWaypoint(); p.follow = false; toast(msg, 3); A2.after?.(); };
  if (!peds.list.includes(p) || p.state === 'down' || p.angry) { lifeAct = null; clearWaypoint(); p.follow = false; return; }
  if (ride || inside || d > 14) A2.lost += dt; else A2.lost = Math.max(0, A2.lost - dt * 2);
  if (A2.lost > 10 || A2.t > 300) { fail(`${A2.spk.name} gave up waiting and went on alone.`); lifeApi().karma?.(-1); return; }
  if (ride) { p.state = 'idle'; return; }
  p.state = 'chase'; // a step behind you and to the side
  const sx = P.x - Math.sin(P.face) * 1.1 + Math.cos(P.face) * 0.7, sz = P.z - Math.cos(P.face) * 1.1 - Math.sin(P.face) * 0.7;
  p.tx = sx; p.tz = sz; if (A2.E.slow && d < 3) { const k = 0.6; p.tx = p.x + (sx - p.x) * k; p.tz = p.z + (sz - p.z) * k; }
  if (d > 7 && (A2.nag || 0) < A2.t - 8) { A2.nag = A2.t; toast(`${A2.spk.name}: "Wait for me!"`, 1.6); }
  if (dd < 6 && Math.hypot(P.x - A2.to.x, P.z - A2.to.z) < 7) {
    lifeAct = null; clearWaypoint(); p.follow = false; peds.talk(p, P.x, P.z);
    (async () => { eventOpen = true; beginTalk(A2.spk.cfg, A2.spk.name, 'Made it', 160 + Math.random() * 100, null);
      const r = A2.E.done(lifeApi()); if (r) await talk.say(r); logStory(A2.spk.name, A2.E.label, r || '', 'escort');
      endTalk(); eventOpen = false; A2.after?.(); saveGame(); })();
  }
}
// ---------------- a conversation that turns into a real fight, then picks back up depending on who won
function startTalkFight(spk, res, after) {
  const p = spk.p, F = res.fight; peds.release?.(p);
  Object.assign(p, { angry: true, angryT: 999, brawler: true, power: F.power || 7, hp: F.hp || 6, state: 'chase', tx: P.x, tz: P.z, selfDefense: true });
  lifeAct = { kind: 'brawl', p, spk, res, after, hp0: P.hp, t: 0 }; toast(res.fightToast || 'Fight!', 1.6); shake = Math.max(shake, 0.2);
}
function updateTalkFight(dt, B) {
  const p = B.p, d = Math.hypot(p.x - P.x, p.z - P.z); B.t += dt;
  const won = p.state === 'down' || p.hp <= 0, lost = P.dead || P.hp < Math.max(18, B.hp0 * 0.4);
  if (!won && !lost) { if (d > 45 || B.t > 90 || inside) { p.angry = false; lifeAct = null; B.after?.(); toast('You got away from the fight.', 2); } return; }
  lifeAct = null; p.angry = false; p.angryT = 0; p.state = won ? p.state : 'idle';
  setTimeout(async () => { if (P.dead) { B.after?.(); return; } // back to talking: he's on the floor, or you are
    const R = won ? B.res.win : B.res.lose; eventOpen = true;
    beginTalk(B.spk.cfg, B.spk.name, won ? 'Beaten' : 'Gloating', 160 + Math.random() * 100, null);
    for (const l of [].concat(R.text)) await talk.say(l);
    R.go?.(lifeApi());
    if (R.choices) { const ch = R.choices(lifeApi()), k = await talk.choose(ch.map(c => I('chat', c.label))); await talk.say(ch[k].label, 'you'); const r2 = ch[k].go(lifeApi());
      if (r2 && typeof r2 === 'object' && r2.fight && peds.list.includes(p)) { if (r2.say) await talk.say(r2.say); endTalk(); eventOpen = false; if (!won) startTalkFight(B.spk, r2, B.after); else { B.after?.(); } return; }
      if (typeof r2 === 'string' && r2) await talk.say(r2); }
    endTalk(); eventOpen = false; B.after?.(); saveGame(); }, won ? 1400 : 700);
}
// ---------------- running away: they chase you down the street. Get far enough away, or get caught
function startTalkFlee(spk, res, after) {
  const p = spk.p, F = res.flee; peds.release?.(p);
  Object.assign(p, { state: 'chase', tx: P.x, tz: P.z, spd: F.speed || 5.4 });
  lifeAct = { kind: 'flee', p, spk, res, after, t: 0, grab: 0 }; toast('Run! Get away from him.', 1.8);
}
function updateTalkFlee(dt, A2) {
  const p = A2.p, d = Math.hypot(p.x - P.x, p.z - P.z); A2.t += dt;
  const end = () => { lifeAct = null; p.spd = 0; };
  if (!peds.list.includes(p) || p.state === 'down' || inside || ride || d > 30 || A2.t > 25) { // got away (or jumped in a car, or ducked inside)
    end(); peds.flee?.(p, P.x, P.z); const R = A2.res.flee.win; R.go?.(lifeApi()); toast([].concat(R.text)[0], 3); A2.after?.(); saveGame(); return; }
  p.state = 'chase'; p.tx = P.x; p.tz = P.z;
  A2.grab = d < 1.4 ? A2.grab + dt : Math.max(0, A2.grab - dt);
  if (A2.grab > 0.6) { end(); peds.talk(p, P.x, P.z); const R = A2.res.flee.lose; // caught
    (async () => { eventOpen = true; beginTalk(A2.spk.cfg, A2.spk.name, 'Caught you', 160 + Math.random() * 100, null);
      for (const l of [].concat(R.text)) await talk.say(l); R.go?.(lifeApi());
      if (R.choices) { const ch = R.choices(lifeApi()), k = await talk.choose(ch.map(c => I('chat', c.label))); await talk.say(ch[k].label, 'you'); const r2 = ch[k].go(lifeApi()); if (r2?.fight) { if (r2.say) await talk.say(r2.say); endTalk(); eventOpen = false; startTalkFight(A2.spk, r2, A2.after); return; } if (typeof r2 === 'string') await talk.say(r2); }
      endTalk(); eventOpen = false; A2.after?.(); saveGame(); })();
  }
}
// ---------------- a lost dog: go and find him (he barks when you're close), then bring him back
function startSearch(spk, S2, after) {
  const p = spk.p; peds.release?.(p); p.state = 'idle'; p.t = 999;
  let at = null; for (let i = 0; i < 40 && !at; i++) { const a = rand(0, 6.28), d = rand(35, 70), x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d; if (walkable(x, z) && !solidPoint(x, z, 0.6) && !inWater(x, z)) at = { x, z }; }
  if (!at) at = { x: p.x + 30, z: p.z };
  const m = makeAnimalMesh('dog'); dyn.add(m.root); m.root.position.set(at.x, baseY(at.x, at.z), at.z);
  const hint = { x: at.x + rand(-14, 14), z: at.z + rand(-14, 14) };
  lifeAct = { kind: 'search', p, spk, S: S2, after, dog: { m, x: at.x, z: at.z, face: 0, ph: 0 }, stage: 'find', t: 0, barkT: 2 };
  setWaypoint(hint.x, hint.z, `Look for ${S2.what}`); toast(`Find ${S2.what}. Listen for barking.`, 3);
}
function updateSearch(dt, A2) {
  A2.t += dt; const D = A2.dog, p = A2.p, d = Math.hypot(D.x - P.x, D.z - P.z);
  const finish = ok => { lifeAct = null; clearWaypoint(); dyn.remove(D.m.root);
    (async () => { if (peds.list.includes(p)) peds.talk(p, P.x, P.z); eventOpen = true; beginTalk(A2.spk.cfg, A2.spk.name, ok ? 'So happy' : A2.spk.tag, 160 + Math.random() * 100, null); const t = ok ? A2.S.done(lifeApi()) : A2.S.fail(lifeApi()); if (t) await talk.say(t); logStory(A2.spk.name, `Look for ${A2.S.what}`, t || '', 'search'); endTalk(); eventOpen = false; A2.after?.(); saveGame(); })(); };
  if (A2.t > 240 || !peds.list.includes(p)) { if (A2.stage === 'find') { lifeAct = null; clearWaypoint(); dyn.remove(D.m.root); toast(`You couldn't find ${A2.S.what}.`, 3); A2.after?.(); return; } }
  let mv = 0;
  if (A2.stage === 'find') {
    if ((A2.barkT -= dt) <= 0) { A2.barkT = rand(3, 5); if (d < 45) { animalCall('dog', Math.max(0.15, 1 - d / 45)); toast(d < 15 ? '*Woof! Woof!* Very close.' : d < 30 ? '*Woof!* Somewhere nearby...' : '*A faint bark in the distance*', 1.4); } }
    if (d < 3 && !ride) { A2.stage = 'back'; setWaypoint(p.x, p.z, `Bring ${A2.S.what} back`); toast(`Found ${A2.S.what}! He follows you. Take him back.`, 2.6); animalCall('dog', 0.9); }
  } else { // follows at your heel
    const tx = P.x - Math.sin(P.face) * 1.1 + Math.cos(P.face) * 0.6, tz = P.z - Math.cos(P.face) * 1.1 - Math.sin(P.face) * 0.6, dx = tx - D.x, dz = tz - D.z, dd = Math.hypot(dx, dz);
    if (dd > 0.4) { const sp = Math.min(dd * 2.5, 7); D.x += dx / dd * sp * dt; D.z += dz / dd * sp * dt; D.face = Math.atan2(dx, dz); mv = sp; }
    if (Math.hypot(P.x - p.x, P.z - p.z) < 5 && Math.hypot(D.x - p.x, D.z - p.z) < 6) { finish(true); return; }
    if (A2.t > 420) { finish(false); return; }
  }
  D.ph += dt * (4 + mv * 3); D.m.limbs.forEach((l, i) => l.rotation.x = Math.sin(D.ph + (i % 2 ? Math.PI : 0)) * Math.min(0.6, mv * 0.25)); D.m.inner.rotation.z = mv < 0.2 ? Math.sin(time * 14) * 0.04 : 0;
  D.m.root.position.set(D.x, baseY(D.x, D.z), D.z); D.m.root.rotation.y = D.face;
}
// ---------------- doing it for real: an event choice that's an activity plays as a quick minigame, then they react
async function playEventAct(spk, res, after) {
  const A = res.act; let r = { win: false };
  const o = { title: A.title, ...(A.opts || {}) }; if (o.npc === true) o.npc = spk.p?.look?.cfg || null;
  try { r = await mini(A.game || 'task', o); } catch (e) { r = { win: Math.random() < 0.5 }; }
  if (r?.quit) { toast('You gave up halfway.', 2); after?.(); return; }
  if (A.need != null) r.win = (r.score || 0) >= A.need;
  const R = r?.win ? A.win : A.lose, api = lifeApi(), text = typeof R === 'function' ? R(api, r) : R;
  if (spk.p && peds.list.includes(spk.p)) peds.talk(spk.p, P.x, P.z);
  eventOpen = true; beginTalk(spk.cfg, spk.name, spk.tag, spk.think ? 200 : 160 + Math.random() * 100, null, null, null, !!spk.think);
  for (const l of [].concat(text || [])) await talk.say(l);
  logStory(spk.name || 'You', A.title, [].concat(text || [])[0] || '', 'act');
  endTalk(); eventOpen = false; after?.(); saveGame();
}
// ---------------- deal meets: a buyer calls, you pull up and do it for real (it might be a setup)
function startDealMeet() {
  const wash = PLACES.find(q => q.id === 'wash1') || PLACES.find(q => q.kind === 'dealer');
  const have = GOODS.filter(g => (stash[g.id] || 0) > 0).sort((a, b) => stash[b.id] - stash[a.id]), g = have[0] || GOODS[0];
  const qty = Math.max(2, Math.min(stash[g.id] || 4, 3 + Math.floor(Math.random() * 6))), pay = Math.round(g.base * qty * rand(1.3, 1.7));
  const sp = { x: wash.x + 9, z: wash.z - 10 }; for (let i = 0; i < 12 && !walkable(sp.x, sp.z); i++) { sp.x += rand(-4, 4); sp.z += rand(-4, 4); }
  lifeAct = { kind: 'meet', sp, g, qty, pay, setup: Math.random() < 0.45 - lvl('dealing') * 0.03, until: gameHours() + 10, p: null, t: 0 };
  setWaypoint(sp.x, sp.z, 'Deal: behind the car wash');
}
function updateMeet(dt, M) {
  if (gameHours() > M.until) { if (M.p) endLifePed({ p: M.p }); lifeAct = null; clearWaypoint(); toast('The buyer got tired of waiting and left.', 3); return; }
  const f = focusPos(), d = Math.hypot(f.x - M.sp.x, f.z - M.sp.z);
  if (!M.p && d < 110 && !inside) { const cfg = npcCfg('dealer', 3131); M.cfg = cfg; const p = peds.makePed(bakeCfg(cfg)); Object.assign(p, { kind: 'life', x: M.sp.x, z: M.sp.z, hx: M.sp.x, hz: M.sp.z, state: 'idle', t: 999, name: 'The buyer' }); peds.list.push(p); M.p = p; }
  if (M.p && !ride && d < 2.4 && !lifeBusy()) { peds.talk(M.p, P.x, P.z); lifeAct = null; clearWaypoint(); meetTalk(M); }
  if (M.p && ride && d < 7 && Math.abs(ride.s.v) < 1) toast('Get out and walk over to the buyer.', 1);
}
async function meetTalk(M) {
  eventOpen = true; const g = M.g, have = stash[g.id] || 0;
  beginTalk(M.cfg, 'The buyer', 'Behind the car wash', 150, null);
  await talk.say(pick(['You came. Good.', 'Took your time.', 'Nobody followed you, right?']));
  await talk.say(`${M.qty} ${g.name}. ${fmt(M.pay)}, cash. You got it?`);
  const k = await talk.choose([{ label: I('deal', `Hand over ${M.qty} ${g.name} <small>for ${fmt(M.pay)}</small>`), disabled: have < M.qty }, I('x', have < M.qty ? `I don't have enough (${have}/${M.qty})` : 'Changed my mind')]);
  if (k !== 0) { await talk.say(have < M.qty ? 'You called me out here with nothing? Unreal.' : 'Waste of my time.'); endTalk(); eventOpen = false; endLifePed({ p: M.p }); return; }
  stash[g.id] -= M.qty;
  if (!M.setup) { addMoney(M.pay); gainXP('dealing', 40); dealHeat(M.p.x, M.p.z, M.pay); await talk.say(pick(['Pleasure. I\'ll be calling you again.', 'Legit. You just got yourself a regular.'])); endTalk(); eventOpen = false; endLifePed({ p: M.p }); saveGame(); return; }
  await talk.say('...Now!');
  endTalk(); eventOpen = false;
  // it's a setup: he and a friend jump you for the goods. Knock him out to get them back.
  const p = M.p; Object.assign(p, { angry: true, angryT: 40, brawler: true, power: 9, hp: 6, name: 'The buyer' }); p.state = 'chase';
  const mate = peds.makePed(bakeCfg(npcCfg('dealer', 4242))); Object.assign(mate, { kind: 'life', x: p.x + 3, z: p.z + 2, hx: p.x, hz: p.z, state: 'chase', angry: true, angryT: 40, brawler: true, power: 8, hp: 5, name: 'His mate' }); peds.list.push(mate);
  toast(`It's a setup! They took your ${g.name}. Knock him out to get it back!`, 3.5);
  lifeAct = { kind: 'ambush', p, mate, g, qty: M.qty, t: 0 };
}
function updateAmbush(dt, A2) {
  A2.t += dt;
  if (A2.p.state === 'down') { stash[A2.g.id] = (stash[A2.g.id] || 0) + A2.qty; gainXP('dealing', 30); gainXP('strength', 20); toast(`You got your ${A2.g.name} back. Lesson learned.`, 3); A2.mate.angry = false; endLifePed({ p: A2.mate }); setTimeout(() => endLifePed({ p: A2.p }), 3000); lifeAct = null; saveGame(); return; }
  if (A2.t > 45 || P.dead || Math.hypot(A2.p.x - P.x, A2.p.z - P.z) > 60) { A2.p.angry = false; A2.mate.angry = false; endLifePed({ p: A2.p }); endLifePed({ p: A2.mate }); lifeAct = null; toast(`They got away with your ${A2.g.name}.`, 3); }
}
// ---------------- school run: collect your kid from Eastport Elementary
function schoolSpot() { try { return blockSide('east', 0, 0, 'n'); } catch (_) { return { x: 600, z: 100 }; } }
function startPickup(ev, data) {
  const f = fam(), kid = data.kid; if (!kid) return;
  if (f.partner?.livesIn && rel(f.partner.id) > 60 && Math.random() < 0.5) return; // your partner has it covered today
  const caller = f.partner?.livesIn ? { cfg: f.partner.cfg, name: f.partner.name, tag: 'Your partner · on the phone', phone: true } : { cfg: npcCfg('nurse', 77), name: 'Eastport Elementary', tag: 'School office · on the phone', phone: true };
  const sp = schoolSpot();
  const E2 = { id: 'pickup_call', text: () => [f.partner?.livesIn ? `Babe, I'm stuck at work. Can you grab ${kid.name} from school? They finish at 3.` : `Hi, it's Eastport Elementary. Just checking someone is collecting ${kid.name} at 3pm today?`], choices: () => [
    { label: 'On my way', go: () => { setWaypoint(sp.x, sp.z, `Pick up ${kid.name}`); lifeAct = { kind: 'pickup', kid, sp, stage: 'go', t: 0, fig: null }; return 'Thank you! Don\'t be late.'; } },
    { label: 'I can\'t today', go: () => { bumpRel(kid.id, -6, false); if (f.partner) bumpRel(f.partner.id, -4, false); return 'Oh. Okay, we\'ll sort something out.'; } }] };
  const A = audio(); if (A) for (let i = 0; i < 4; i++) sfx.note(i % 2 ? 1180 : 940, A.currentTime + i * 0.18, 0.15, 'square', 0.03, 3000);
  ringing(caller.name, caller.cfg);
  setTimeout(() => runEventTalk(E2, data, caller), 1600);
}
function updatePickup(dt, A2) {
  const f = focusPos(), d = Math.hypot(f.x - A2.sp.x, f.z - A2.sp.z), kid = A2.kid;
  if (A2.stage === 'go') {
    if (!A2.fig && d < 120) { A2.fig = figure(bakeCfg(kidCfg(kid))).root; A2.fig.position.set(A2.sp.x, baseY(A2.sp.x, A2.sp.z), A2.sp.z); dyn.add(A2.fig); }
    if (clockH > 16.5 && clockH < 23) { if (A2.fig) dyn.remove(A2.fig); lifeAct = null; clearWaypoint(); bumpRel(kid.id, -12, false); if (fam().partner) bumpRel(fam().partner.id, -8, false); toast(`You never showed up. ${kid.name} waited at school for ages.`, 4); return; }
    if (d < 7 && (!ride || Math.abs(ride.s.v) < 2)) {
      A2.stage = 'home'; if (A2.fig) { dyn.remove(A2.fig); A2.fig = null; }
      const h = famHome() || PROPERTIES.find(p => owned.has(p.id)); if (h) setWaypoint(h.x, h.z, 'Home'); else clearWaypoint();
      A2.home = h; toast(ride ? `${kid.name} jumps in the back. "Hi! Can we get ice cream?"` : `${kid.name} grabs your hand. Time to walk home.`, 3.5); bumpRel(kid.id, 4, false);
      if (!ride) { A2.walk = figure(bakeCfg(kidCfg(kid))).root; dyn.add(A2.walk); }
    }
  } else if (A2.stage === 'home') {
    if (A2.walk) { const tx = P.x - Math.sin(P.face) * 1.2 + Math.cos(P.face) * 0.8, tz = P.z - Math.cos(P.face) * 1.2 - Math.sin(P.face) * 0.8; A2.walk.position.x += (tx - A2.walk.position.x) * Math.min(1, dt * 4); A2.walk.position.z += (tz - A2.walk.position.z) * Math.min(1, dt * 4); A2.walk.position.y = baseY(A2.walk.position.x, A2.walk.position.z); A2.walk.rotation.y = P.face; A2.walk.visible = !ride && !inside; }
    const h = A2.home, dh = h ? Math.hypot(f.x - h.x, f.z - h.z) : 0;
    if (!h || dh < 8 || (inside && inside.prop)) { if (A2.walk) dyn.remove(A2.walk); lifeAct = null; clearWaypoint(); bumpRel(kid.id, 10, false); if (fam().partner) bumpRel(fam().partner.id, 6, false); feed({ mood: 10 }); toast(`Home safe. ${kid.name}: "Thanks for picking me up!"`, 3.5); saveGame(); }
  }
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
function zoneBg(x, z) { if (inside) return 'interior'; if (onPier(x, z)) return 'pier'; const n = zoneName(x, z); return n === 'Bay Beach' ? 'beach' : n === 'Hidden Hills' || n === 'Countryside' || n === 'Farmland' ? 'hills' : n.includes('Airport') ? 'airport' : n === 'Eastport' || n === 'Northfield' ? 'suburb' : 'city'; }
function beginTalk(cfg, name, tag, pitch, relId, pet = null, pose = null, think = false, seat = false, phone = false, car = false, bed = null) { if (seat && ride && !ride.b.two) { try { talk.nextCar = buildCar(ride.cfg); } catch (e) { talk.nextCar = null; } talk.nextPassenger = date?.inCar ? date.cfg : buddy?.inCar ? (buddy.p.look?.cfg || null) : null; }
  if ((phone || seat) && ride && (ride.b.two || ride.b.boat)) { try { talk.nextTwo = buildCar(ride.cfg); talk.nextCar = null; } catch (e) { talk.nextTwo = null; } } /* on a bike, scooter or boat: you are on it in the scene */ talk.layout(W, H); talk.begin({ npcCfg: cfg, youCfg: charCfg, name, tag, pitch, bg: zoneBg(P.x, P.z), night, pet, pose, think, seat, phone, car, bed, wall: inside ? INTERIORS[inside.id].wall : null, floor: inside ? INTERIORS[inside.id].floor : null, room: inside ? inside.id : null }); if (relId) relNames[relId] = name; setTalkRel(relId); setState('talk'); }
function endTalk() { talkNeeds(false); talk.end(); setState('play'); }
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
  const east = cityAt(p.x, p.z, 4)?.id === 'east' ? 0.85 : 1; // Eastport: cheaper to buy
  for (const g of GOODS) { const b = base[g.id]; const buy = Math.max(1, Math.round(b.buy * m * dl * hag * east)); out[g.id] = { ...b, buy, sell: Math.min(Math.round(b.sell * (2 - m) * (2 - dl) * (2 - hag)), Math.floor(buy * 0.72)) }; } // a dealer never buys back for more than ~70% of what they sell it for: profit comes from moving product between dealers
  return out;
}
async function talkDealer(p) {
  beginTalk(p.cfg, p.npcName, p.name, p.pitch, p.id);
  await talk.say(pick(DEALER_HI[relName(rel(p.id))]));
  for (;;) {
    const opts = [{ label: I('deal', 'Trade'), id: 'trade' }, { label: I('chat', 'Chat'), id: 'chat' }, { label: I('star', 'Heard anything?'), id: 'tip' }];
    if (stats.haggle[p.id] !== dayN) opts.push({ label: I('smile', `Haggle <small>(Charm ${lvl('charm')})</small>`), id: 'haggle' });
    opts.push(stats.burner ? { label: I('phone', 'Ditch my burner'), id: 'ditch' } : { label: I('phone', `Get a burner phone <small>${fmt(150)}</small>`), id: 'burner' });
    opts.push({ label: I('x', 'Later'), id: 'bye' });
    const c = opts[await talk.choose(opts)].id;
    if (c === 'burner') {
      await talk.say('Got a burner? I want customers hitting me up.', 'you');
      if (money < 150) { await talk.say('Come back with 150 and I\'ll sort you.'); continue; }
      spend(150); stats.burner = true; settings.custTexts = 'on'; applySettings(); custT = 25; saveGame();
      await talk.say("Here. I'll pass the number round. People will text you when they need something. Switch it off when you need a break, it's in your phone settings.");
      continue;
    }
    if (c === 'ditch') {
      await talk.say('I\'m done taking orders for a bit. Bin the number.', 'you');
      stats.burner = false; for (const cu of [...customers]) removeCustomer(cu); saveGame();
      await talk.say(pick(["Smart. Lay low.", "Your call. Come see me if you want a new one."]));
      continue;
    }
    if (c === 'trade') { const v = await openTrade(p); if (v) dealHeat(p.x, p.z, v); if (v) bumpRel(p.id, Math.min(6, v / 400)); await talk.say(pick(['Pleasure doing business.', 'Smart move.', 'Anything else?', 'Come back tomorrow, prices change.'])); }
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
  if (id === 'church') return talkPastor(n, place);
  if (id === 'hospital') return talkHospital(n, place);
  if (id === 'police') return talkPolice(n, place);
  if (id === 'college') return n.role === 'professor' ? attendClass() : talkAdmissions();
  if (id === 'office') return talkCareer('office');
  if (id === 'pit') return n.role === 'bookie' ? talkBookie(n, place) : talkFood(n, 'bar', place);
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
  await talk.say(rel(n.relId) >= 40 ? pick(['There they are. My favourite customer.', 'Back again? Good. I got new stock.']) : pick(["Welcome to Bay Arms. Cash only.", "Looking to protect yourself?", "Everything here's legal. Mostly."]));
  for (;;) {
    const c = await talk.choose([I('gun', 'Guns'), I('chat', 'Chat'), I('x', 'Leave')]);
    if (c === 0) { talk.end(); openArmory(p, n); return; }
    if (c === 1) { // talk to them like a person: small talk, the range, the city, and they warm up to you
      const k0 = stats.relDay[n.relId + ':chat:' + dayN];
      const topics = [I('chat', 'How\'s business?'), I('target', 'How does the range work?'), I('star', 'Got any tips?'), I('people', 'What\'s your story?')];
      const t = await talk.choose(topics);
      if (t === 1) await talk.say("Fifteen bucks a session. Equip a gun, step up to the lane. Every hit makes you better with that gun, and better guns parts open up as you level it.");
      else if (t === 0) await talk.say(pick(["Busy. Too busy. This city's getting nervous.", "Can't complain. Well, I can. Nobody listens.", "Quiet week. Which in my line of work is a good thing."]));
      else if (t === 2) await talk.say(pick(['A suppressor keeps you off the cops\' radar. Worth every penny.', 'Armour-piercing rounds go straight through car doors. Just saying.', 'Level a gun up and I can fit the good stuff. Practice pays.', 'Don\'t bring a pistol to a shotgun fight.']));
      else await talk.say(pick(['Twenty years in the army, ten behind this counter. The counter\'s scarier.', 'My dad ran this shop. His dad too. Three generations of not asking questions.', 'I used to compete. Shooting, not talking. Obviously.']));
      if (!k0) { stats.relDay[n.relId + ':chat:' + dayN] = 1; bumpRel(n.relId, 4 + lvl('charm') * 0.5); gainXP('charm', 6); }
      continue;
    }
    await talk.say(pick(['Come back soon.', 'Stay safe.', 'Watch yourself out there.'])); break;
  }
  endTalk();
}
// ---------------- the armory: a horizontal shelf of every weapon up top; tap one to see it big, buy it, then swipe through each part
let armory = null;
const ARM_CATS = [['receiver', 'Frame'], ['fireMode', 'Fire'], ['barrel', 'Barrel'], ['muzzle', 'Muzzle'], ['sight', 'Optic'], ['under', 'Underbarrel'], ['magazine', 'Mag'], ['stock', 'Stock'], ['grip', 'Grip'], ['ammo', 'Ammo'], ['finish', 'Camo'], ['charm', 'Charm']];
const ARM_COLS = [['bodyColor', 'Body'], ['accentColor', 'Accent'], ['metalColor', 'Metal'], ['tracer', 'Tracer']];
function openArmory(place, npc) {
  armory = { place, npc, view: 'list', slot: null, cat: 'barrel', col: 'bodyColor', spent: 0 };
  const first = arsenal.owned.find(id => SLOT[id].kind === 'gun') || 'pistol';
  shop = { kind: 'gun', slot: first, place, newGun: false, orig: { ...(arsenal.cfg[first] || DEFAULT_CFGS[first]) } }; pvGunCfg = { ...shop.orig }; previewCfg = null; pvWeapon = null;
  document.body.classList.add('armory'); setState('gun'); $('randBtn').classList.add('buy'); armoryList();
}
function armoryList() {
  const A = armory; A.view = 'list'; shop.newGun = false; $('customTitle').textContent = A.place.name; $('presets').innerHTML = ''; $('tabs').innerHTML = ''; $('stats').innerHTML = '';
  $('randBtn').classList.add('hidden');
  const cards = SLOTS.filter(s2 => s2.id !== 'fist').map(s2 => { const own = arsenal.owned.includes(s2.id), lv = GUN_SKILL_SLOTS.includes(s2.id) ? lvl('gun_' + s2.id) : 0;
    return `<button class="acard ${own ? 'own' : ''} ${A.slot === s2.id ? 'on' : ''}" data-arm="${s2.id}"><span class="aic">${iconSVG(s2.id)}</span><b>${s2.kind === 'gun' && own ? (arsenal.cfg[s2.id].name || s2.name) : s2.name}</b><small>${own ? (lv ? `Owned · Lvl ${lv}` : 'Owned') : s2.price ? fmt(s2.price) : 'Free'}</small></button>`; }).join('');
  $('content').innerHTML = `<div class="arm-hint">Swipe through the shelf. Tap a weapon to look at it.</div><div class="acar">${cards}</div><div class="arm-wallet">${svg('wallet', 'sm')} ${fmt(money)}</div>`;
  $('content').querySelectorAll('[data-arm]').forEach(b => b.onclick = () => armoryGun(b.dataset.arm));
  const sel = A.slot || shop.slot; pvWeapon = SLOT[sel]?.kind === 'gun' ? null : sel; pv.dirty = true;
}
function armoryGun(id) {
  const A = armory, S2 = SLOT[id]; A.view = 'gun'; A.slot = id; sfx.click();
  $('customTitle').textContent = S2.kind === 'gun' && arsenal.owned.includes(id) ? (arsenal.cfg[id].name || S2.name) : S2.name;
  if (S2.kind === 'gun') {
    const cfg0 = arsenal.cfg[id] || { ...DEFAULT_CFGS[id] }; shop = { kind: 'gun', slot: id, place: A.place, newGun: !arsenal.owned.includes(id), orig: { ...cfg0 } }; pvGunCfg = { ...cfg0 }; pvWeapon = null;
    $('randBtn').classList.remove('hidden'); updateShopPrice(); gunStatsPanel(); renderBlueprints(id);
  } else { shop = { kind: 'gun', slot: 'pistol', place: A.place, newGun: false, orig: { ...pvGunCfg } }; pvWeapon = id; $('randBtn').classList.add('hidden'); $('stats').innerHTML = ''; $('presets').innerHTML = ''; }
  pv.dirty = true; armoryDraw();
}
function armoryDraw() {
  const A = armory, id = A.slot, S2 = SLOT[id], own = arsenal.owned.includes(id), el = $('content');
  const st = slotStats(id, arsenal.cfg[id]), a = arsenal.ammo[id], box = S2.kind === 'melee' ? null : ammoBox(id, st), full = box && a && a.res + a.mag >= maxReserve(id, st) + (st.mag || 0);
  const ammoBtn = own && box ? `<button class="arm-ammo" ${money < box.price || full ? 'disabled' : ''} data-ammo="1">${full ? 'Ammo full' : `+${box.n} ammo · ${fmt(box.price)}`}</button>` : '';
  if (S2.kind !== 'gun') { // bats, launchers and grenades: just buy them
    el.innerHTML = `<div class="arm-simple"><span class="aic big">${iconSVG(id)}</span><p>${{ bat: 'A solid ash bat. Quiet, cheap, never jams.', rpg: 'Shoulder-fired rocket launcher. Very loud. Very illegal. Very effective.', grenade: 'Frag grenades. Throw, count to three, don\'t be there.' }[id] || ''}</p>${own ? (S2.kind === 'melee' ? '<b class="arm-owned">Owned</b>' : ammoBtn) : `<button class="arm-buy" data-buyw="1" ${money < S2.price ? 'disabled' : ''}>Buy ${fmt(S2.price)}</button>`}</div>`;
  } else {
    const schema = smithSchemaRich(id).flatMap(t => t.items), items = Object.fromEntries(schema.map(it => [it.key, it])), cats = ARM_CATS.filter(([k]) => items[k]);
    if (!items[A.cat]) A.cat = cats[0][0];
    const it = items[A.cat], cur = pvGunCfg[A.cat];
    const opts = it.options.map(([v, label]) => { const d = it.decorate?.(v); return `<button class="aopt ${cur === v ? 'on' : ''} ${d?.lock ? 'locked' : ''}" data-opt="${v}"><b>${label}</b>${d?.fx?.length ? `<span class="cfx">${d.fx.map(([l, x, g]) => `<i class="${g ? 'up' : 'dn'}">${x} ${l}</i>`).join('')}</span>` : d?.note ? `<span class="cfx"><i>${d.note}</i></span>` : ''}<small>${d?.lock ? (d.lockText || `Gun level ${d.lock}`) : d?.price || ''}</small></button>`; }).join('');
    const ci = items[A.col] || items.bodyColor, pal = ci?.palette || [];
    el.innerHTML = `<div class="arm-top">${own ? ammoBtn : `<span class="arm-new">Not owned yet. Price includes the gun.</span>`}<button class="arm-back" data-list="1">${svg('bag', 'sm')} All weapons</button></div>
      <div class="acats">${cats.map(([k, l]) => `<button class="acat ${A.cat === k ? 'on' : ''} ${pvGunCfg[k] !== shop.orig[k] ? 'chg' : ''}" data-cat="${k}">${l}</button>`).join('')}</div>
      <div class="aopts">${opts}</div>
      <div class="acols"><div class="acolk">${ARM_COLS.filter(([k]) => items[k]).map(([k, l]) => `<button class="${A.col === k ? 'on' : ''}" data-colk="${k}">${l}</button>`).join('')}</div><div class="acolsw">${pal.map(c => `<button class="sw ${String(pvGunCfg[A.col]).toLowerCase() === c.toLowerCase() ? 'on' : ''}" style="background:${c}" data-col="${c}"></button>`).join('')}</div></div>`;
    el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { A.cat = b.dataset.cat; sfx.click(); armoryDraw(); const o = el.querySelector('.aopt.on'); o?.scrollIntoView({ inline: 'center', block: 'nearest' }); });
    el.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { const v = b.dataset.opt, d = it.decorate?.(v); if (d?.lock) { it.onLocked?.(v, d.lock); return; } pvGunCfg[A.cat] = v; if (A.cat === 'receiver') pvGunCfg.fireMode = RECEIVERS[v].mode; pv.dirty = true; sfx.click(); gunStatsPanel(); updateShopPrice(); const sl = el.querySelector('.aopts').scrollLeft; armoryDraw(); el.querySelector('.aopts').scrollLeft = sl; });
    el.querySelectorAll('[data-colk]').forEach(b => b.onclick = () => { A.col = b.dataset.colk; armoryDraw(); });
    el.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { pvGunCfg[A.col] = b.dataset.col; pv.dirty = true; updateShopPrice(); armoryDraw(); });
    el.querySelector('[data-list]').onclick = () => { pvGunCfg = { ...shop.orig }; armoryList(); };
  }
  el.querySelectorAll('[data-ammo]').forEach(b => b.onclick = () => { if (money < box.price) return; spend(box.price); arsenal.ammo[id].res = Math.min(maxReserve(id, st), arsenal.ammo[id].res + box.n); saveGame(); sfx.coin(); armoryDraw(); });
  el.querySelectorAll('[data-buyw]').forEach(b => b.onclick = () => { if (money < S2.price) return; spend(S2.price); arsenal.owned.push(id); arsenal.ammo[id] = { mag: st.mag || 0, res: id === 'grenade' ? 3 : id === 'rpg' ? 2 : 0 }; saveGame(); sfx.coin(); toast(`Bought: ${S2.name}.`, 2); armoryDraw(); });
}
async function talkFood(n, menu, place) {
  beginTalk(n.cfg, n.name, place.name, 260, n.relId); talkNeeds(true);
  await talk.say(menu === 'mart' ? pick(["Find everything okay?", "Groceries are in the back. Snacks up front."]) : menu === 'bar' || menu === 'club' ? pick(["What are you drinking?", "Long day? I got you."]) : pick(["Welcome in! What can I get you, hon?", "Coffee's fresh. What'll it be?"]));
  for (;;) {
    const items = MENUS[menu].map(k => ({ k, f: FOODS[k] }));
    const opts = [...items.map(({ f }) => ({ label: `${f.name} <small>${fmt(f.price)}</small>`, disabled: money < f.price })), I('x', 'That\'s all')];
    const c = await talk.choose(opts);
    if (c >= items.length) break;
    const { k, f } = items[c]; spend(f.price); feed(f); bumpRel(n.relId, 1); talkNeeds(true);
    if (k === 'groceries') await talk.say(`Here you go. That's ${stats.groceries} meals in your fridge at home.`);
    else await talk.say(pick(['Enjoy!', 'Coming right up.', 'There you go.', 'Good choice.']));
  }
  await talk.say(pick(['Take care now.', 'Come back soon!', 'See ya.'])); endTalk(); saveGame();
}
async function talkTrainer(n, place) {
  beginTalk(n.cfg, n.name, place.name, 200, n.relId);
  await talk.say(gymMember() ? pick(["Back again! Let's work.", 'Looking good. Bench, treadmill or bag?']) : pick(["Welcome to Iron Temple. Members only on the equipment: $120 for 30 days.", "You look like you skip leg day. Want a membership?"]));
  const done = stats.relDay['train:' + dayN];
  const mOpt = gymMember() ? I('check', `Membership: ${stats.gymUntil - dayN} days left${stats.gymAuto ? ' (auto-renew on)' : ''}`) : I('cash', 'Sign up <small>$120 / 30 days</small>');
  const c0 = await talk.choose([mOpt, I('dumbbell', `Personal training <small>$60</small>`), I('chart', 'How am I doing?'), I('x', 'Later')]);
  if (c0 === 0) {
    if (gymMember()) { stats.gymAuto = !stats.gymAuto; await talk.say(stats.gymAuto ? "Auto-renew is on. We'll bill you $120 every 30 days." : "Auto-renew is off. Your membership runs out on its own."); }
    else if (money < 120) await talk.say('Membership is $120. Come back when you have it.');
    else { spend(120); stats.gymUntil = dayN + 30; stats.gymAuto = true; bumpRel(n.relId, 5); await talk.say("You're in! Auto-renews every 30 days, you can cancel with me any time. Max three workouts a day, rest matters."); }
    endTalk(); saveGame(); return;
  }
  const c = c0 - 1;
  if (c === 0) {
    if (done) await talk.say("One session a day. Your muscles need to recover!");
    else if (money < 60) await talk.say("Sixty bucks. Come back when you've got it.");
    else { spend(60); stats.relDay['train:' + dayN] = 1; fade(() => { advanceTime(1); workout(20, 'lift'); gainXP('strength', 60); gainXP('stamina', 40); gainXP('health', 40); feed({ energy: -15, mood: 8 }); }); bumpRel(n.relId, 4); await talk.say("Great session! You'll feel that tomorrow."); }
  } else if (c === 1) { const B = body(); await talk.say(`Strength ${lvl('strength')}, stamina ${lvl('stamina')}. Muscle ${Math.round(B.muscle * 100)}%, body fat ${B.fat > 0.6 ? 'high' : B.fat > 0.3 ? 'a bit high' : 'good'}. ${B.fat > 0.3 ? 'Cut the burgers and do some cardio.' : lvl('strength') < 4 ? 'We have work to do.' : 'Looking strong!'}`); }
  endTalk();
}
async function talkPastor(n, place) {
  beginTalk(n.cfg, 'Father Gabe', place.name, 170, n.relId); relNames[n.relId] = 'Father Gabe';
  const r = rel(n.relId);
  await talk.say(r >= 40 ? "Good to see you again, my friend. How is your heart today?" : pick(["Welcome, friend. Everyone is welcome here.", "Peace be with you. Sit as long as you like."]));
  if (partner()?.status === 'engaged') { const w = await talk.choose([I('heart', `We want to get married <small>(${partner().name})</small>`), I('chat', 'Something else')]); if (w === 0) { await weddingAtChapel(n); if (state === 'talk') endTalk(); return; } }
  const c = await talk.choose([I('chat', 'Just looking for some peace'), I('heart', `Donate <small>$50</small>`), I('hand', 'I need to get something off my chest'), r >= 60 ? I('food', 'Is the food bank open?') : I('book', 'Any advice?'), I('x', 'Goodbye')]);
  if (c === 0) { await talk.say(pick(["The city is loud. In here, it's quiet. Stay a while.", "Peace isn't found, it's made. One choice at a time."])); bumpRel(n.relId, 4); feed({ mood: 6 }); gainXP('charm', 5); }
  else if (c === 1) { if (money < 50) await talk.say("Keep your money, friend. Your presence is enough."); else { spend(50); bumpRel(n.relId, 8, false); feed({ mood: 12 }); gainXP('charm', 15); await talk.say("Thank you. This will feed a lot of families on the south side."); } }
  else if (c === 2) {
    await talk.say("Go on. Nothing leaves this room.");
    const d = await talk.choose([I('deal', "I've been selling things I shouldn't."), I('car', "I've taken cars that weren't mine."), I('x', 'Never mind')]);
    if (d < 2) { await talk.say(d === 0 ? "Every man has a past. What matters is where you're walking now. Be careful out there." : "The car can be replaced. You can't. Drive safe, and think of the people in them."); feed({ mood: 15 }); bumpRel(n.relId, 5); }
    else await talk.say("Whenever you're ready.");
  }
  else if (c === 3) {
    if (r >= 60) { if (stats.relDay['food:' + dayN]) await talk.say("Come back tomorrow, there'll be more."); else { stats.relDay['food:' + dayN] = 1; stats.groceries += 3; await talk.say("Here, take a bag. Three meals' worth. Don't argue."); toast('+3 meals of groceries'); } }
    else await talk.say(pick(["Eat well, sleep well, and call your family.", "Be kind to the people you meet. In this city, it comes back around.", "Money buys a lot. Not friends, though. Those you earn."]));
    bumpRel(n.relId, 2); gainXP('charm', 4);
  }
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
  await talk.say(p.job === 'taxi' ? "Need work? Grab a cab, pick up fares, get 'em there fast. You keep the fares." : p.job === 'bins' ? "Bin round needs doing. Take the lorry, stop next to each bin and we'll pay you per bin. Bonus if you bring the truck back." : "Got parcels that need to be across town yesterday. Fast delivery, fast cash.");
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
const HL_NAMES = ['Old Pete', 'Sunny', 'Marlene', 'Big Walt', 'Dutch', 'Rosie', 'Preacher', 'Mike the Vet'];
async function talkHomeless(p) {
  peds.talk(p, P.x, P.z);
  p.name ??= pick(HL_NAMES); p.helped ??= 0;
  beginTalk(p.look.cfg, p.name, 'Lives on the street', 140 + Math.random() * 60, null, null, p.rest);
  await talk.say(p.helped ? pick(["Hey, it's you again. You're good people.", "My friend! Sit down, sit down."]) : pick(["Spare some change? Anything helps.", "Don't mind me. Just resting my bones.", "Nice day for it, huh? ...For something, anyway."]));
  let done = false;
  while (!done) {
    const c = await talk.choose([I('cash', 'Give $5'), I('cash', 'Give $20'), I('food', `Share a meal ${stats.groceries ? '' : '<small>(no groceries)</small>'}`), I('chat', 'How did you end up here?'), I('star', 'Know anything useful?'), I('x', 'Bye')]);
    if (c === 0 || c === 1) { const a = c ? 20 : 5; if (money < a) { await talk.say("It's alright, friend. Looks like you're as broke as me."); continue; } spend(a); witness('kind', p.x, p.z); p.helped++; feed({ mood: c ? 10 : 5 }); gainXP('charm', c ? 12 : 4); bumpRel('street', c ? 2 : 1); await talk.say(c ? "Twenty?! God bless you. Seriously." : "Thank you. Means more than you know."); }
    else if (c === 2) { if (!stats.groceries) { await talk.say("That's kind, but you've got nothing on you. QuickMart sells groceries."); continue; } stats.groceries--; p.helped += 2; feed({ mood: 14 }); gainXP('charm', 15); await talk.say("A real meal... I haven't had one in days. Thank you."); }
    else if (c === 3) await talk.say(pick(["Lost my job at the docks, then the apartment. Happens faster than you'd think.", "Came out here for the sun. Stayed for the... well. The sun's still nice.", "Served two tours. Came home and nothing fit anymore.", "Long story. Bad landlord, worse luck."]));
    else if (c === 4) {
      if (!p.helped) { await talk.say("Information costs, friend. Even out here."); continue; }
      const t = hotTip();
      if (Math.random() < 0.45) { // a hidden cash stash nearby
        const a = Math.random() * 6.28, x = P.x + Math.sin(a) * rand(40, 90), z = P.z + Math.cos(a) * rand(40, 90);
        const spot = walkable(x, z) ? { x, z } : { x: P.x + 40, z: P.z };
        await talk.say("Saw some guy stash a bag behind a bin over that way. Didn't look like he was coming back. I'll mark it for you.");
        dropCash(spot.x, spot.z, 80 + Math.floor(Math.random() * 220)); setWaypoint(spot.x, spot.z, 'Stashed cash');
      } else if (t) await talk.say(`Word on the street: ${t.p.npc} is ${t.pr.hot === 'cheap' ? `selling ${t.g.name} cheap` : `paying big for ${t.g.name}`}.`);
      else await talk.say("Cops roll through downtown around midnight. Stay smart.");
      done = true;
    }
    else done = true;
  }
  endTalk(); peds.release(p);
}


// ================================================================ POLICE: wanted stars, chases, arrests, the station cells
const WANT = { v: 0, stars: 0, loseT: 0, seen: false, sirenT: 0, arrestT: 0, flash: 0, lx: 0, lz: 0, coolT: 0, spawnT: 0, losT: 0 };
// heat needed for each star: 1 star is easy to get, 5 stars takes a real rampage
const STAR_AT = [0, 0.01, 2, 4.5, 8, 12];
const RESPONSE = [0, 9, 5, 2.5, 1.5, 1]; // seconds until the first unit rolls up to investigate, by stars
function heatStars() { let st = 0; for (let i = 1; i <= 5; i++) if (WANT.v >= STAR_AT[i]) st = i; return st; }
const searchR = () => 35 + (WANT.stars || WANT.prev || 1) * 12; // the circle cops search after losing sight of you
const evadeNeed = () => 5 + WANT.stars * 2.2; // seconds out of sight (and out of the circle) to lose them
// can a cop at (ax,az) see (bx,bz)? buildings block the view
function losClear(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 2.5);
  for (let i = 1; i < n; i++) { const t = i / n, c = solidPoint(ax + (bx - ax) * t, az + (bz - az) * t, 2.2); if (c && !c.r && (c.h || 99) > 3) return false; }
  return true;
}
// every cop has a vision cone (shown on the minimap): ~140 degrees ahead, plus a small all-round radius up close
const CONE = 1.2, NEAR = 9;
const nightK = () => (clockH < 6 || clockH >= 20 ? 0.7 : 1);
function eyes() { // [x, z, heading, range] for every officer and police car around
  const k = nightK() * (ride && !lightsOn() && night > 0.35 ? 0.65 : 1), out = [];
  for (const v of copCars) if (v.police && v.ai !== 'leave') out.push([v.s.x, v.s.z, v.s.h, 55 * k]);
  for (const c of cops) if (c.cop === 'chase' && c.state !== 'down') out.push([c.x, c.z, c.face, 34 * k]);
  for (const t of traffic) if (t.police) out.push([t.rx, t.rz, t.rh, 40 * k]);
  return out;
}
function inCone(e, x, z) { const dx = x - e[0], dz = z - e[1], d = Math.hypot(dx, dz); if (d > e[3]) return false; if (d < NEAR) return true; return Math.abs(wrapA(Math.atan2(dx, dz) - e[2])) < CONE; }
function copSees(x, z) { if (ride?.police && !(ride.sirenOn) && Math.hypot(x - P.x, z - P.z) < 1) { let near = false; for (const e of eyes()) if (Math.hypot(e[0] - x, e[1] - z) < 14) near = true; if (!near) return false; } // in a police car they take you for one of their own unless they're right on you
  for (const e of eyes()) if (inCone(e, x, z) && losClear(e[0], e[1], x, z)) return true; return false; }
const cops = [], copCars = [];
const COP_CFG = { ...DEFAULT_CHAR, top: 'long', topColor: '#1d2b52', accent: '#ffd23f', pants: 'jeans', pantsColor: '#16161b', shoes: 'boots', shoeColor: '#16161b', hat: 'cap', hatColor: '#1d2b52', mask: 'none', back: 'none', eyewear: 'none', facialHair: 'none', hair: 'short' };
let copLook = null;
function nearestCop(x, z) { let d = 1e9; for (const c of cops) d = Math.min(d, Math.hypot(c.x - x, c.z - z)); for (const v of copCars) d = Math.min(d, Math.hypot(v.s.x - x, v.s.z - z)); for (const t of traffic) if (t.police) d = Math.min(d, Math.hypot(t.rx - x, t.rz - z)); return d; }
// a crime happened; witnesses / nearby cops raise your wanted level
function crime(amt, x = P.x, z = P.z) {
  if (inside || P.dead) return;
  const copSaw = copSees(x, z);
  // while you're hiding, only cops that can see you (or the odd brave witness calling it in) add heat
  const witness = copSaw || (WANT.stars ? WANT.seen || Math.random() < 0.25 : Math.random() < 0.55 || amt >= 1);
  if (!witness) return;
  const before = WANT.stars;
  WANT.v = Math.min(14, WANT.v + amt * (copSaw ? 1.3 : 1)); if (copSaw || !before || WANT.seen) { WANT.lx = x; WANT.lz = z; } WANT.loseT = 0; WANT.patrolT = 0;
  // stars climb one at a time with a breather between (see updatePolice), so a shoot-out doesn't jump straight to 5
  if (!before) WANT.stars = Math.min(2, heatStars());
  else if (WANT.coolT <= 0 && heatStars() > before) WANT.stars = before + 1;
  if (WANT.stars > before) { WANT.coolT = 7; if (!before) { WANT.seen = copSaw; WANT.spawnT = copSaw ? 1.5 : RESPONSE[WANT.stars]; if (!copSaw) setTimeout(() => toast('Someone called it in. Get out of the red circle!', 2.5), 2300); } }
  if (WANT.stars > before) { toast(WANT.stars === 1 ? 'The police are on to you!' : `Wanted level ${WANT.stars}!`, 2); WANT.flash = 1.2; navigator.vibrate?.([20, 40, 20]); }
  // your mate from the docks (the friend you lent money to) calls in a fake tip and pulls the heat off you, once
  const fl = life().flags; if (WANT.stars >= 3 && fl.docks_friend && !WANT.tipT) { const nm = fl.docks_friend; WANT.tipT = 1; setTimeout(() => { WANT.tipT = 0; if (WANT.stars < 3) return; delete fl.docks_friend; WANT.stars = 1; WANT.v = STAR_AT[1] + 0.5; WANT.coolT = 7; for (const v of copCars) if (Math.random() < 0.6) v.ai = 'leave'; const who = faceFor(null, nm); if (who) subs.say(who, pick(['Got you. I just called in a fake robbery across town. Half of them are gone. GO.', 'Told you I had your back. Tip\'s in. Move!']), { expr: 'happy', pri: 4, now: true, tag: 'calling' }); }, 2500); }
}
// drug deals: a cop who can see the deal calls it in; otherwise there's a small chance someone snitches later
function dealHeat(x, z, value) {
  if (inside) return;
  witness('deal', x, z); turfDeal(x, z, value); if (date && Math.hypot(date.x - x, date.z - z) < 30) dateSeesDeal();
  const seen = copSees(x, z);
  if (seen) { setTimeout(() => { crime(1.6, x, z); toast('A cop saw the deal!', 2.5); }, 400); return; }
  // a snitch has to be a real person who saw it: someone nearby with a clear view
  let wit = null, wd = 24;
  for (const p of peds.list) { if (p.state === 'down' || p.kind === 'cop' || p.kind === 'life' || p.kind === 'homeless' || p.custNpc) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < wd && d > 2.5 && losClear(p.x, p.z, x, z)) { wd = d; wit = p; } }
  if (!wit) return;
  const wp = wit.person, chance = (0.18 + Math.min(0.15, value / 15000) - (lvl('dealing') - 1) * 0.012) * (wp ? { straight: 1.6, normal: 1, edgy: 0.25 }[wp.att] : 1) + (wp && wp.rap <= -40 ? 0.3 : 0) - (wp && wp.rap >= 40 ? 1 : 0);
  if (Math.random() > chance) return;
  wit.name ??= pick(NPC_NAMES); wit.snitch = true; peds.flee(wit, x, z);
  toast(`${wit.name} saw the deal and is running off to call the cops! Stop them!`, 3.5);
  setTimeout(() => {
    if (!wit.snitch) return; wit.snitch = false;
    if (wit.state === 'down' || !peds.list.includes(wit)) { toast(`${wit.name} won't be calling anyone.`, 2.5); return; }
    if (inside || WANT.stars) return;
    WANT.v = Math.max(WANT.v, STAR_AT[1]); WANT.stars = Math.max(1, WANT.stars); WANT.lx = x; WANT.lz = z; WANT.seen = false; WANT.loseT = 0; WANT.coolT = 7; WANT.spawnT = RESPONSE[1];
    toast(`${wit.name} called it in. Cops are coming to search the area.`, 3.5);
  }, 8000);
}
// you slipped away: the units keep patrolling the area for a while; get spotted by one and it's back on
function lostCops() {
  ditchJumpsuit();
  WANT.prev = WANT.stars; WANT.pv = WANT.v; WANT.patrolT = 40 + WANT.stars * 8;
  WANT.v = 0; WANT.stars = 0; WANT.loseT = 0; WANT.coolT = 0; P.arrestT = 0;
  for (const v of copCars) if (v.ai === 'chase') { v.ai = 'patrol'; v.sp = null; }
  for (const c of cops) { c.cop = 'leave'; peds.flee(c, P.x, P.z); }
  toast('You lost them. Cops are still patrolling the area. Stay out of their sight.', 3);
}
function ditchJumpsuit() { if (!stats.escaped || stats.jail) return; charCfg = { ...stats.escaped }; stats.escaped = null; buildHero(); setTimeout(() => toast('You grabbed clothes off a washing line and ditched the jumpsuit.', 3.5), 2600); }
// ---------------- headlights and traffic stops
// Lights are Auto (on after dark) or Off. Off is sneakier at night (cops spot you from less far away),
// but a cop who sees you driving in the dark with no lights pulls you over. So does serious speeding in town.
// US-style limits: 25 in the suburbs, 30 downtown, 35 elsewhere in town, 55 on the open road; none off-road
function speedLimit(x, z, y = ride ? ride.s.y || 0 : P.y) { { const k = skyAt(x, z); if (k && (k.ramp || y > k.y - 1.6)) return 60; } if (x < -290 && canyonAt(x, z)) return 40; const r = roadAt(x, z); if (!r) return 0; const c = cityAt(x, z, 2); if (!c) return 55; return c.style === 'suburb' ? 25 : c.style === 'downtown' ? 30 : 35; }
const lightsOn = () => stats.lights !== 'off';
function toggleLights() { stats.lights = lightsOn() ? 'off' : 'auto'; sfx.click(); toast(lightsOn() ? 'Headlights: auto' : 'Headlights off', 1.4); }
let stopCheckT = 0;
function trafficCheck(dt) {
  if (!ride || ride.b.two === 'bike' || WANT.stars || inside || (stats.stopCd || 0) > gameHours()) return;
  stopCheckT -= dt; if (stopCheckT > 0) return; stopCheckT = 0.5;
  const c = ride.s, spd = Math.abs(c.v), road = !!roadAt(c.x, c.z);
  let why = null;
  if (night > 0.35 && !lightsOn() && spd > 3 && road) why = 'lights';
  else if (speedLimit(c.x, c.z) && spd * 2.237 > speedLimit(c.x, c.z) + 22) why = 'speed';
  if (!why || !copSees(c.x, c.z)) return;
  if (why === 'speed' && !((stats.speedWarn || 0) > gameHours())) { stats.speedWarn = gameHours() + 2; stopCheckT = 6; subs.say(copWho(), pick([`Slow it down! That's ${Math.round(spd * 2.237)} in a ${speedLimit(c.x, c.z)}!`, 'Ease off the gas, driver. Last warning.', `Hey! This is a ${speedLimit(c.x, c.z)} zone. Slow down.`]), { tag: 'loudspeaker', pri: 4, expr: 'angry', now: true }); sfx.siren?.(); return; } // a warning first
  WANT.pull = why; WANT.pullT = 0; WANT.pullMph = Math.round(spd * 2.237);
  forceWanted(1); WANT.flash = 1.2; sfx.siren?.();
  toast(why === 'lights' ? 'Police lights behind you. Your headlights are off. Pull over and stop.' : 'Police lights behind you. Pull over and stop.', 3.5);
}
async function trafficStop(v) {
  const why = WANT.pull, warned = stats.ticketWarn || 0, hot = stashCount() > 0;
  WANT.pull = null; ride.s.v = 0;
  beginTalk(copLook?.cfg || COP_CFG, 'Officer ' + pick(['Diaz', 'Walsh', 'Kowalski', 'Price', 'Reyes', 'Hart']), 'Traffic stop', 130, null, null, null, false, true);
  await talk.say(why === 'lights' ? pick(['Evening. Know why I pulled you over? Your headlights are off. It\'s dark out there.', 'Driving with no lights at night? Headlights go on from sunset to sunrise. That\'s the law.']) : `License and registration. You were doing ${WANT.pullMph} in a ${speedLimit(ride.s.x, ride.s.z) || 35}. ${cityAt(ride.s.x, ride.s.z, 2) ? 'This is a city street, not a racetrack.' : 'Slow it down.'}`);
  // sometimes they want a look in the car, and a stash in there is a problem
  if (hot && Math.random() < 0.3) {
    await talk.say('Mind if I take a look inside the vehicle?');
    const k = await talk.choose([I('check', 'Go ahead'), I('shield', `I know my rights. No. <small>(Charm ${lvl('charm')})</small>`), I('run', 'Floor it')]);
    if (k === 0) { await talk.say('...Well, well. What do we have here. Step out of the car.'); endTalk(); return busted(true); }
    if (k === 2) { await talk.say('Hey! STOP!'); endTalk(); WANT.v = Math.max(WANT.v, STAR_AT[2]); WANT.stars = 2; WANT.coolT = 7; toast('Fleeing a traffic stop! Wanted level 2!', 2); return; }
    await talk.say('No, you need probable cause for that, officer.', 'you');
    if (Math.random() > 0.35 + lvl('charm') * 0.05) { await talk.say('I smell something. That\'s my probable cause. Out of the car.'); endTalk(); return busted(true); }
    await talk.say('...Fine. Smart mouth.');
  }
  const fine = why === 'lights' ? 100 : 200;
  const opts = [I('chat', warned < 2 ? 'Sorry officer, my mistake' : 'Try to talk my way out of it'), I('cash', `Take the ticket <small>${fmt(fine)}</small>`), I('run', 'Floor it')];
  const k = await talk.choose(opts);
  if (k === 2) { await talk.say('Hey! Get back here!'); endTalk(); WANT.v = Math.max(WANT.v, STAR_AT[2]); WANT.stars = 2; WANT.coolT = 7; toast('Fleeing a traffic stop! Wanted level 2!', 2); return; }
  if (k === 0) {
    await talk.say(why === 'lights' ? 'I didn\'t realise they were off. I\'ll switch them on right now.' : 'Sorry, I didn\'t realise how fast I was going.', 'you');
    if (warned === 0 || Math.random() < 0.25 + lvl('charm') * 0.04) { stats.ticketWarn = warned + 1; await talk.say(why === 'lights' ? 'Get those lights on. I\'ll let you off with a warning this time.' : 'Slow it down. This is your warning.'); }
    else { await talk.say(`Heard that one before. That's a ${fmt(fine)} ticket.`); spend(Math.min(money, fine)); }
  } else { spend(Math.min(money, fine)); await talk.say('Here\'s your ticket. Drive safe.'); }
  endTalk();
  if (why === 'lights') { stats.lights = 'auto'; toast('You switched your headlights back on.', 2); }
  stats.stopCd = gameHours() + 2; chat.resolved = 'stop'; clearWanted(); v.ai = 'leave';
}
function clearWanted(msg) { if (!msg) chat.resolved ||= 'settled'; WANT.patrolT = 0; WANT.pull = null; ditchJumpsuit(); WANT.v = 0; WANT.stars = 0; WANT.loseT = 0; WANT.coolT = 0; P.arrestT = 0; for (const c of cops) { if (c.car && copCars.includes(c.car) && c.state !== 'down' && Math.hypot(c.x - c.car.s.x, c.z - c.car.s.z) < 80) { c.cop = 'return'; c.angry = false; } else { c.cop = 'leave'; peds.flee(c, P.x, P.z); } } // officers walk back to their own car and drive off in it
  for (const v of copCars) { if (cops.some(c => c.car === v && c.cop === 'return')) { v.ai = 'park'; v.waitT = 0; v.crewBack = true; } else v.ai = 'leave'; } if (msg) toast(msg, 2.5); }
function ensureSiren(v) { if (v.siren || v.b.two) return; const lightM = [new THREE.MeshBasicMaterial({ color: '#ff2a3a' }), new THREE.MeshBasicMaterial({ color: '#2a6aff' })]; v.siren = lightM.map((m, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.3), m); b.position.set(i ? 0.32 : -0.32, v.b.height / (v.b.s || 1) + 0.12, -0.1); v.b.group.add(b); b.visible = false; return b; }); }
function makeCopCar(x, z, h) {
  const v = makeVehicle({ ...DEFAULT_CAR, ...CAR_PRESETS.Police }, x, z, h, false); v.ai = 'chase'; v.police = true;
  const lightM = [new THREE.MeshBasicMaterial({ color: '#ff2a3a' }), new THREE.MeshBasicMaterial({ color: '#2a6aff' })];
  v.siren = lightM.map((m, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 0.3), m); b.position.set(i ? 0.32 : -0.32, v.b.height / (v.b.s || 1) + 0.12, -0.1); v.b.group.add(b); return b; });
  copCars.push(v); return v;
}
function makeCop(x, z, car) {
  copLook ||= bakeCfg(COP_CFG);
  const p = peds.makePed(copLook); Object.assign(p, { kind: 'cop', x, z, hx: x, hz: z, state: 'chase', tx: P.x, tz: P.z, cop: 'chase', shootT: rand(0.5, 1.5), name: 'Officer ' + pick(['Diaz', 'Miller', 'Chen', 'Brooks', 'Kowalski', 'Reyes', 'Hart']) });
  if (car) { p.car = car; (car.crew ||= []).push(p); }
  peds.list.push(p); cops.push(p); return p;
}
function spawnCopCar() {
  const f = focusPos(), head = ride ? ride.s.h : P.face;
  for (let i = 0; i < 16; i++) {
    let x, z;
    if (WANT.seen) { // reinforcements come from behind you, never out of nowhere in front
      const a = head + Math.PI + rand(-1.6, 1.6), d = rand(80, 105); x = f.x + Math.sin(a) * d; z = f.z + Math.cos(a) * d;
    } else { // searching: a unit turns up from out of view and drives into the circle to investigate
      const a = rand(0, 6.28), d = rand(70, 105); x = f.x + Math.sin(a) * d; z = f.z + Math.cos(a) * d;
    }
    const r = roadAt(x, z); if (!r || !walkable(x, z, false)) continue;
    if (losClear(x, z, f.x, f.z) && Math.hypot(x - f.x, z - f.z) < 90) continue;
    makeCopCar(x, z, Math.atan2(f.x - x, f.z - z)); return;
  }
}
// where a searching unit heads: random spots inside the search circle
function searchSpot(v) {
  // mostly sweep the circle; the more stars, the more often they get a hunch about where you actually are
  if (WANT.stars && Math.random() < 0.15 + WANT.stars * 0.12) { const f = focusPos(); for (let i = 0; i < 6; i++) { const x = f.x + rand(-22, 22), z = f.z + rand(-22, 22); if (roadAt(x, z)) return { x, z }; } }
  for (let i = 0; i < 8; i++) { const a = rand(0, 6.28), d = rand(0, searchR()), x = WANT.lx + Math.sin(a) * d, z = WANT.lz + Math.cos(a) * d; if (roadAt(x, z)) return { x, z }; }
  return { x: WANT.lx, z: WANT.lz };
}
function aiDrive(v, c, s, dt) {
  if (v.ai === 'park') { c.v = damp(c.v, 0, 4, dt); c.steer = damp(c.steer, 0, 4, dt); return; }
  let tg = v.ai === 'leave' ? { x: c.x + Math.sin(c.h) * 50, z: c.z + Math.cos(c.h) * 50 } : v.ai === 'respond' ? v.target : focusPos();
  if (v.ai === 'plough') tg = ploughTarget(v, c);
  else if (v.ai === 'flee') { if (!v.goal || Math.hypot(v.goal.x - c.x, v.goal.z - c.z) < 16) v.goal = randomRoadSpot(140, 300); tg = v.goal; } // stolen car: floor it somewhere far away
  else if (v.ai === 'hunt') { if (!vehicles.includes(v.quarry)) { v.ai = 'leave'; return; } tg = { x: v.quarry.s.x, z: v.quarry.s.z }; } // police after the stolen car
  else if (v.ai === 'patrol') { if (!v.sp || Math.hypot(v.sp.x - c.x, v.sp.z - c.z) < 10) v.sp = searchSpot(v); tg = v.sp; }
  else if (v.police && v.ai === 'chase' && !WANT.seen) { // lost you: drive around the search area
    if (!v.sp || Math.hypot(v.sp.x - c.x, v.sp.z - c.z) < 10) v.sp = searchSpot(v);
    tg = v.sp;
  } else if (v.police) v.sp = null;
  // follow the streets (A* over the road grid) instead of ploughing straight through buildings
  if ((v.ai === 'respond' || v.ai === 'flee' || v.ai === 'hunt' || (v.police && (v.ai === 'chase' || v.ai === 'patrol'))) && tg) {
    const far = Math.hypot(tg.x - c.x, tg.z - c.z);
    if (far > 14) {
      v.pathT = (v.pathT || 0) - dt;
      if (!v.path || v.pathT <= 0 || Math.hypot(tg.x - v.pathTo[0], tg.z - v.pathTo[1]) > 12) { v.pathT = 2.5; v.pathTo = [tg.x, tg.z]; v.path = findRoute(c.x, c.z, tg.x, tg.z); v.pi = 1; }
      const P2 = v.path;
      if (P2 && P2.length > 1) {
        while (v.pi < P2.length - 1 && Math.hypot(P2[v.pi][0] - c.x, P2[v.pi][1] - c.z) < 7) v.pi++;
        const q = P2[Math.min(v.pi, P2.length - 1)], qp = P2[Math.max(0, v.pi - 1)], sl = Math.hypot(q[0] - qp[0], q[1] - qp[1]) || 1, lane = v.pi < P2.length - 1 ? 3 : 0;
        tg = { x: q[0] - (q[1] - qp[1]) / sl * lane, z: q[1] + (q[0] - qp[0]) / sl * lane }; // right-hand lane, clear of the median
        // a corner coming up? ease off so we don't overshoot into the kerb and lampposts
        const pv = P2[Math.max(0, v.pi - 1)], nx2 = P2[v.pi + 1]; v.turnD = 1e9;
        if (nx2) { const a1 = Math.atan2(q[0] - pv[0], q[1] - pv[1]), a2 = Math.atan2(nx2[0] - q[0], nx2[1] - q[1]); if (Math.abs(wrapA(a2 - a1)) > 0.5) v.turnD = Math.hypot(q[0] - c.x, q[1] - c.z); }
      }
    } else v.path = null;
  }
  const dx = tg.x - c.x, dz = tg.z - c.z, d = Math.hypot(dx, dz), err = wrapA(Math.atan2(dx, dz) - c.h);
  if (v.unstuck > 0) { v.unstuck -= dt; c.v = damp(c.v, -7, 3, dt); c.steer = damp(c.steer, -Math.sign(err || 1), 6, dt); return; }
  const fp = focusPos(), pd = Math.hypot(fp.x - c.x, fp.z - c.z), td = v.target ? Math.hypot(v.target.x - c.x, v.target.z - c.z) : 1e9;
  const onFootClose = (!ride && pd < 11 && v.ai === 'chase' && (WANT.seen || !v.police)) || (v.ai === 'respond' && td < 10);
  const top = onFootClose ? 0 : v.ai === 'flee' ? s.top * 0.8 : v.ai === 'hunt' ? (d < 9 ? Math.max(4, Math.abs(v.quarry.s.v)) : s.top * 0.9) : v.ai === 'plough' ? 4.5 : v.ai === 'patrol' ? 10 : (v.police && !WANT.seen && v.ai === 'chase') ? 13 : d > 40 ? s.top * 0.92 : d > 14 ? 20 : 9;
  let cap = top;
  if (v.path && (v.turnD ?? 1e9) < 26) cap = Math.min(cap, (v.ai === 'respond' ? 8 : 12) + (v.turnD / 26) * 6); // slow into corners
  if (v.ai === 'respond' && Math.abs(err) > 0.5 && !onFootClose) cap = Math.min(cap, 7); // still lining up: crawl
  if (v.delivery) cap = Math.min(cap, speedLimit(c.x, c.z, c.y || 0) / 2.237 || 13); // the valet keeps to the limit
  c.v = damp(c.v, Math.abs(err) > 1.7 && d > 10 ? 7 : cap, onFootClose || cap < c.v ? 4 : 1.4, dt);
  c.steer = damp(c.steer, clamp(err * 1.8, -1, 1), 7, dt);
  if (Math.abs(c.v) < 1.2 && !onFootClose) { v.stuckT = (v.stuckT || 0) + dt; if (v.stuckT > 1.4) { v.stuckT = 0; v.unstuck = 1.1; } } else v.stuckT = 0;
  // officers jump out when you're on foot nearby (or you've stopped the car)
  if (v.ai === 'chase' && !v.police) return;
  if (v.ai === 'chase' && !v.deployed && WANT.pull && ride && pd < 16 && Math.abs(ride.s.v) < 1.5 && Math.abs(c.v) < 3 && state === 'play') { v.deployed = true; trafficStop(v); return; }
  if (v.ai === 'chase' && !v.deployed && pd < 14 && (!ride || Math.abs(ride.s.v) < 2) && Math.abs(c.v) < 3) {
    v.deployed = true; const n = WANT.stars >= 3 ? 2 : 1;
    for (let i = 0; i < n; i++) makeCop(c.x + Math.cos(c.h) * (i ? -2 : 2), c.z - Math.sin(c.h) * (i ? -2 : 2), v);
  }
}
function copShot(c, tx, tz) {
  const m = new THREE.Mesh(bgeo, new THREE.MeshBasicMaterial({ color: '#ffe08a' })); const a = Math.atan2(tx - c.x, tz - c.z);
  m.position.set(c.x, 1.3, c.z); m.rotation.set(0, a, 0); dyn.add(m);
  const sp = 70; bullets.push({ x: c.x, y: 1.3, z: c.z, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, life: Math.hypot(tx - c.x, tz - c.z) / sp, m, ammo: 'std', slot: 'pistol', cop: true });
  sfx.shot(false, false);
  if (losClear(c.x, c.z, tx, tz) && Math.random() < 0.3 + WANT.stars * 0.05) (P.copHitT = time, hurt(ride ? 3 : 6 + Math.random() * 5));
}
function busted(coop) {
  if (P.dead) return;
  const s = WANT.stars, fine = Math.min(money, Math.floor((250 * s + Math.min(money * 0.005 * s, 1500 * s)) * (coop ? 0.5 : 1))), lostG = GOODS.filter(g => stash[g.id] > 0);
  for (const g of lostG) stash[g.id] = 0;
  money -= fine; P.arrestT = 0;
  if (ride) { const v = ride; ride = null; heroRoot.visible = true; radioOn(false); v.s.v = 0; }
  if (job) endJob('You got arrested. Shift over.');
  clearWanted(); for (const v of [...copCars]) removeVehicle(v); copCars.length = 0; for (const c of cops) { const i = peds.list.indexOf(c); if (i >= 0) peds.list.splice(i, 1); dyn.remove(c.root); } cops.length = 0;
  $('deathScreen').querySelector('b').textContent = 'BUSTED';
  $('deathScreen').querySelector('span').textContent = `Fined ${fmt(fine)}${lostG.length ? ', stash confiscated' : ''}. ${s * 8} hours in a cell...`;
  $('deathScreen').classList.add('on');
  if (s >= 2) $('deathScreen').querySelector('span').textContent = `Fined ${fmt(fine)}${lostG.length ? ', stash confiscated' : ''}. Sentenced to ${hrs(PRISON_SENT[Math.min(5, s)] * (coop ? 0.5 : 1))} at Bay County Correctional${coop ? ' (you cooperated)' : ''}.`;
  setTimeout(() => {
    $('deathScreen').classList.remove('on'); $('deathScreen').querySelector('b').textContent = 'You blacked out';
    if (s >= 2) return goToPrison(s, coop);
    advanceTime(s * 8); feed({ mood: -20, hunger: -15 });
    const st = PLACES.find(q => q.id === 'v_police'); Object.assign(P, { x: st.x, z: st.z }); enterInterior(st);
    setTimeout(() => { if (inside?.id !== 'police') return; const w = inside.h.toWorld(3.6, -5.6); P.x = w.x; P.z = w.z; P.face = 0; toast('Released. The cell door is open. Stay out of trouble.', 4); }, 400);
  }, 2600);
}
let copStopCd = 0;
// an officer has caught up with you on foot: what do you do?
async function copStop(c) {
  const s = WANT.stars, warns = stats.copWarns || 0;
  beginTalk(copLook?.cfg || COP_CFG, c.name || 'Officer', `Wanted · ${s} badge${s > 1 ? 's' : ''}`, 130, null);
  await talk.say(s >= 3 ? 'Hands up! Turn around! You are under arrest!' : pick(['Hey! Stop right there. You know why I stopped you?', 'Freeze! Hands where I can see them.', 'Don\'t move. We got a call about you.']));
  const opts = [], ids = [];
  const add = (ic, t, k) => { opts.push(I(ic, t)); ids.push(k); };
  if (s <= 2) add('chat', warns === 0 && s === 1 ? "I'm sorry, officer. It won't happen again" : 'Talk my way out of it', 'talk');
  if (s <= 1) add('cash', `Pay a fine on the spot <small>${fmt(150)}</small>`, 'fine');
  if (s <= 3) add('cash', `Slip him some cash <small>${fmt(250 * s)}</small>`, 'bribe');
  add('hand', s >= 2 ? 'Hands up. I\'ll come quietly <small>(half sentence)</small>' : 'Hands up. I\'ll come quietly', 'quiet');
  add('run', 'Run for it', 'run');
  const k = ids[await talk.choose(opts)];
  if (k === 'talk') {
    await talk.say(pick(["Look, it was a misunderstanding. I'm just trying to get home.", 'Officer, I promise, I was just leaving.', 'Come on, I\'m one of the good ones.']), 'you');
    const chance = (warns === 0 && s === 1 ? 1 : 0.22) + lvl('charm') * 0.05 + (stats.mood - 50) * 0.003 - (s - 1) * 0.15;
    gainXP('charm', 15);
    if (Math.random() < chance) { stats.copWarns = warns + 1; await talk.say(warns === 0 ? 'Alright. Consider this your warning. Next time you\'re going in.' : 'Fine. Get out of here before I change my mind.'); endTalk(); clearWanted('Let off with a warning.'); return; }
    await talk.say('Save it for the judge.'); endTalk(); return busted(true);
  }
  if (k === 'fine') { if (money < 150) { await talk.say('Can\'t pay? Then you\'re coming with me.'); endTalk(); return busted(true); } spend(150); await talk.say('Ticket\'s paid. Behave.'); endTalk(); clearWanted('Fined $150.'); return; }
  if (k === 'bribe') {
    const amt = 250 * s; if (money < amt) { await talk.say('Are you trying to bribe me with lint? Turn around.'); endTalk(); return busted(); }
    if (Math.random() < 0.55 - s * 0.08) { spend(amt); await talk.say('...I didn\'t see anything. Beat it.'); endTalk(); clearWanted(); return; }
    await talk.say('Bribing an officer? That\'s another charge.'); crime(1.5); endTalk(); return busted();
  }
  if (k === 'quiet') { await talk.say('Smart choice. Watch your head getting in the car.'); endTalk(); return busted(true); }
  // run: shove past him, you get a head start
  await talk.say('Hey! STOP!'); endTalk(); crime(0.6); peds.knock(c, Math.sin(P.face), Math.cos(P.face), 3); P.arrestT = 0; toast('You shoved past him. RUN!', 1.5);
}
function updatePolice(dt) {
  WANT.flash = Math.max(0, WANT.flash - dt);
  if (inside) return;
  trafficCheck(dt);
  if (WANT.pull) { WANT.pullT += dt; if (!ride || WANT.stars > 1) WANT.pull = null; else if (WANT.pullT > 35) { WANT.pull = null; WANT.v = Math.max(WANT.v, STAR_AT[2]); WANT.stars = 2; WANT.coolT = 7; toast('You didn\'t pull over. Wanted level 2!', 2.5); } }
  const f = focusPos();
  // how many cops chase you
  WANT.coolT = Math.max(0, WANT.coolT - dt);
  if (!WANT.stars && WANT.patrolT > 0) {
    WANT.patrolT -= dt;
    WANT.losT -= dt;
    if (WANT.losT <= 0) { WANT.losT = 0.3; const sees = copSees(f.x, f.z), near = Math.hypot(f.x - WANT.lx, f.z - WANT.lz) < searchR() + 40;
      if (sees && near) { WANT.stars = Math.max(1, WANT.prev || 1); WANT.v = Math.max(STAR_AT[WANT.stars], WANT.pv || 0); WANT.seen = true; WANT.lx = f.x; WANT.lz = f.z; WANT.patrolT = 0; WANT.coolT = 7; for (const v of copCars) if (v.ai === 'patrol') v.ai = 'chase'; toast('Spotted by a patrol! The chase is back on!', 2.5); navigator.vibrate?.([20, 40, 20]); } }
    if (WANT.patrolT <= 0) for (const v of copCars) if (v.ai === 'patrol') v.ai = 'leave';
  }
  if (WANT.stars && WANT.seen && WANT.coolT <= 0 && heatStars() > WANT.stars) { WANT.stars++; WANT.coolT = 7; toast(`Wanted level ${WANT.stars}!`, 2); WANT.flash = 1.2; navigator.vibrate?.([20, 40, 20]); }
  const wantCars = WANT.stars ? [0, 1, 2, 3, 4, 5][WANT.stars] : 0;
  // reinforcements arrive at a steady pace instead of all at once
  WANT.spawnT -= dt;
  if (WANT.stars && WANT.spawnT <= 0 && copCars.filter(v => v.police && v.ai === 'chase').length < wantCars) { WANT.spawnT = WANT.seen ? Math.max(2.5, 7 - WANT.stars) : Math.max(3, 11 - WANT.stars * 2); spawnCopCar(); }
  // losing them: break line of sight, get out of the search circle, stay hidden
  if (WANT.stars) {
    const nc = nearestCop(f.x, f.z);
    WANT.losT -= dt;
    if (WANT.losT <= 0) {
      WANT.losT = 0.25; const was = WANT.seen; WANT.seen = copSees(f.x, f.z);
      if (WANT.seen && !was) toast('Spotted!', 1.2);
      if (!WANT.seen && was) toast('Out of sight. Get out of the search area.', 2.2);
    }
    if (WANT.seen) { WANT.lx = f.x; WANT.lz = f.z; WANT.loseT = 0; }
    else {
      const outside = Math.hypot(f.x - WANT.lx, f.z - WANT.lz) > searchR();
      // out of the circle: gone in ~3s. hiding inside it works too, just slowly
      WANT.loseT += dt * (outside ? evadeNeed() / 3 : 0.3);
      if (WANT.loseT > evadeNeed()) lostCops();
    }
    WANT.sirenT -= dt; if (WANT.sirenT <= 0 && nc < 90) { WANT.sirenT = 0.55; const A = audio(); if (A) { sfx.note(760, A.currentTime, 0.25, 'sawtooth', 0.012, 1600); sfx.note(980, A.currentTime + 0.27, 0.25, 'sawtooth', 0.012, 1600); } }
  }
  if (WANT.stars) for (let i = traffic.length - 1; i >= 0; i--) { const t = traffic[i]; if (t.police && Math.hypot(t.rx - f.x, t.rz - f.z) < 40 && losClear(t.rx, t.rz, f.x, f.z)) { traffic.splice(i, 1); dyn.remove(t.mesh); makeCopCar(t.rx, t.rz, t.rh); } }
  for (const v of copCars) if (v.siren) { const on = Math.floor(time * 6) % 2; v.siren[0].visible = !!on; v.siren[1].visible = !on; }
  if (ride?.police && ride.sirenOn && ride.siren) { const on = Math.floor(time * 6) % 2; ride.siren[0].visible = !!on; ride.siren[1].visible = !on; ride.wailT = (ride.wailT || 0) - dt; if (ride.wailT <= 0) { ride.wailT = 0.55; const A = audio(); if (A) { sfx.note(760, A.currentTime, 0.25, 'sawtooth', 0.014, 1600); sfx.note(980, A.currentTime + 0.27, 0.25, 'sawtooth', 0.014, 1600); } } for (const t of traffic) if (Math.hypot(t.rx - ride.s.x, t.rz - ride.s.z) < 30) t.honk = 0; }
  // cleanup
  for (let i = copCars.length - 1; i >= 0; i--) { const v = copCars[i]; if (Math.hypot(v.s.x - f.x, v.s.z - f.z) > (v.ai === 'leave' ? 70 : v.ai === 'patrol' ? 200 : 160)) { removeVehicle(v); copCars.splice(i, 1); } }
  for (let i = cops.length - 1; i >= 0; i--) { const c = cops[i]; if (!peds.list.includes(c)) { cops.splice(i, 1); continue; } if (c.cop === 'leave' && Math.hypot(c.x - f.x, c.z - f.z) > 50) { peds.list.splice(peds.list.indexOf(c), 1); dyn.remove(c.root); cops.splice(i, 1); } }
  // officers heading back to their car: walk to the driver's door, get in, and once they're all in it drives off
  for (let i = cops.length - 1; i >= 0; i--) { const c = cops[i]; if (c.cop !== 'return') continue; const v = c.car;
    if (!v || !copCars.includes(v) || c.state === 'down') { c.cop = 'leave'; continue; }
    const h = v.s.h, dx = v.s.x - Math.cos(h) * (v.b.width / 2 + 0.6), dz = v.s.z + Math.sin(h) * (v.b.width / 2 + 0.6);
    c.state = 'chase'; c.tx = dx; c.tz = dz; c.spd = 2.6;
    if (Math.hypot(c.x - dx, c.z - dz) < 1.2) { peds.list.splice(peds.list.indexOf(c), 1); dyn.remove(c.root); cops.splice(i, 1); v.crew = (v.crew || []).filter(q => q !== c); } }
  for (const v of copCars) if (v.crewBack && v.ai === 'park') { v.waitT += dt; if (!cops.some(c => c.car === v && c.cop === 'return') || v.waitT > 30) { v.ai = 'leave'; v.crewBack = false; } }
  // officers on foot
  let close = false;
  for (const c of cops) {
    if (c.cop !== 'chase' || c.state === 'down') continue;
    if (!WANT.stars) { c.cop = 'leave'; peds.flee(c, f.x, f.z); continue; }
    const d = Math.hypot(f.x - c.x, f.z - c.z);
    c.shootT -= dt;
    const sees = WANT.seen && (d < 8 || losClear(c.x, c.z, f.x, f.z));
    if (!sees) { // search on foot around where you were last seen
      if (!c.sp || Math.hypot(c.sp.x - c.x, c.sp.z - c.z) < 3) { const a = rand(0, 6.28), r = rand(0, searchR() * 0.6); c.sp = { x: WANT.lx + Math.sin(a) * r, z: WANT.lz + Math.cos(a) * r }; }
      c.state = 'chase'; c.tx = c.sp.x; c.tz = c.sp.z; continue;
    }
    c.sp = null;
    // they only open fire if you're a real threat: armed, in a car at 3+ stars, or 5 stars. Otherwise they come to cuff you
    const armed = arsenal.cur !== 'fist' && arsenal.cur !== 'bat';
    if (d < 24 && ((WANT.stars >= 3 && (armed || ride)) || WANT.stars >= 5 || (WANT.stars >= 2 && armed && P.fireCd > -1.5))) { c.state = 'punch'; c.tx = f.x; c.tz = f.z; if (c.shootT <= 0) { c.shootT = rand(1.0, 1.7); copShot(c, f.x, f.z); } }
    else { c.state = 'chase'; c.tx = f.x; c.tz = f.z; if (d < 9 && (c.yellT || 0) < time) { c.yellT = time + 4; toast(pick(['POLICE! Freeze!', 'Hands where I can see them!', 'Stop right there!', 'On the ground, now!']), 1.4); } }
    if (!ride && d < 1.7 && !P.dead && state === 'play') { if (time > copStopCd) { copStopCd = time + 9; copStop(c); return; } close = true; }
    if (ride && d < 2.6 && Math.abs(ride.s.v) < 2) { // drag you out of the car
      const v = ride; exitCar(); carAnim = null; v.s.v = 0; heroRoot.visible = true; toast('Police! Out of the car!', 2); P.kx = (P.x - c.x) * 2; P.kz = (P.z - c.z) * 2;
    }
  }
  P.arrestT = close ? (P.arrestT || 0) + dt : Math.max(0, (P.arrestT || 0) - dt * 2);
  if (P.arrestT > 0 && Math.random() < dt * 2) toast('Getting arrested! Run or fight!', 0.6);
  if (P.arrestT > 1.8) busted();
}
async function talkPolice(n, place) {
  beginTalk(n.cfg, 'Sgt. ' + n.name, place.name, 180, n.relId);
  if (WANT.stars) {
    await talk.say("Hold on. You're the one we've been chasing!");
    const c = await talk.choose([I('cash', `Pay the fine <small>${fmt(500 * WANT.stars)}</small>`), I('hand', 'Turn myself in'), I('x', 'Run')]);
    if (c === 0) { if (money < 500 * WANT.stars) await talk.say("You can't afford it. Hands behind your back."), endTalk(), busted(); else { spend(500 * WANT.stars); clearWanted(); await talk.say('Paid in full. Don\'t let me see you again.'); } }
    else if (c === 1) { endTalk(); return busted(); }
    else { crime(1); }
    endTalk(); return;
  }
  await talk.say(pick(['Bay City Police Department. How can I help?', 'Keep it moving, citizen.', 'Quiet night. For now.']));
  const c = await talk.choose([I('chat', 'Any trouble in town?'), I('star', 'How do I lose a tail?'), I('x', 'Bye')]);
  if (c === 0) await talk.say(pick(['Dealers on the south side. Car thieves out by Eastport. The usual.', 'Someone keeps stealing tacos from the taco truck. We are on it.']));
  else if (c === 1) await talk.say('...Why would you need to know that? Stay out of sight long enough and we lose interest. Not that you heard it from me.');
  endTalk();
}

// ================================================================ EMERGENCY SERVICES: fires, fire engines, ambulances
const fires = [], ems = [];
const FIRE_CFG = { ...DEFAULT_CAR, body: 'boxtruck', bodyColor: '#c9302c', accentColor: '#f2f2f2', decal: 'twotone', finish: 'gloss', roof: 'none', name: 'Fire engine' };
const TOW_CFG = { ...DEFAULT_CAR, body: 'pickup', bodyColor: '#ffc21a', accentColor: '#16161b', decal: 'stripes', finish: 'gloss', roof: 'none', name: 'Tow truck', wheels: 'steel' };
const AMB_CFG = { ...DEFAULT_CAR, body: 'van', bodyColor: '#f4f4f4', accentColor: '#e23b3b', decal: 'stripes', finish: 'gloss', roof: 'none', name: 'Ambulance' };
const CREW = { fire: { ...DEFAULT_CHAR, top: 'jacket', topColor: '#c2a040', accent: '#ffd23f', pants: 'cargo', pantsColor: '#c2a040', shoes: 'boots', shoeColor: '#16161b', hat: 'cap', hatColor: '#c9302c', mask: 'none', back: 'none', eyewear: 'none', facialHair: 'none' },
  med: { ...DEFAULT_CHAR, top: 'long', topColor: '#2f6fae', accent: '#ffffff', pants: 'jeans', pantsColor: '#1d2b52', shoes: 'sneakers', shoeColor: '#ffffff', hat: 'none', mask: 'none', back: 'none', eyewear: 'none', facialHair: 'none' } };
const crewLook = {};
function addFire(x, z) { if (inside || fires.length > 6) return; fires.push({ x, z, t: 40 }); setTimeout(() => dispatch('fire', x, z), 3500 + Math.random() * 3000); }
function dispatch(kind, x, z, wreck) {
  dispatch.wreck = wreck || null;
  if (inside || ems.some(e => e.kind === kind && !e.done)) return;
  const f = focusPos(); if (Math.hypot(x - f.x, z - f.z) > 140) return;
  for (let i = 0; i < 12; i++) {
    const a = rand(0, 6.28), d = rand(70, 100), sx = x + Math.sin(a) * d, sz = z + Math.cos(a) * d;
    if (!roadAt(sx, sz) || !walkable(sx, sz, false)) continue;
    const v = makeVehicle(kind === 'fire' ? FIRE_CFG : kind === 'tow' ? TOW_CFG : AMB_CFG, sx, sz, Math.atan2(x - sx, z - sz), false);
    v.ai = 'respond'; v.target = { x, z }; v.ems = kind;
    const lm = kind === 'fire' ? ['#ff2a3a', '#ffffff'] : kind === 'tow' ? ['#ff9a1a', '#ffd23f'] : ['#ff2a3a', '#2a6aff'];
    if (kind === 'tow') { // crane boom and hook on the back
      const gm = new THREE.MeshStandardMaterial({ color: '#2a2b30', metalness: 0.5, roughness: 0.5 }), L = v.b.length / (v.b.s || 1), HH = v.b.height / (v.b.s || 1);
      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 2.0), gm); boom.position.set(0, HH + 0.25, -L * 0.35); boom.rotation.x = 0.45; v.b.group.add(boom);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.3), gm); post.position.set(0, HH - 0.2, -L * 0.12); v.b.group.add(post);
      const hook = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.2), gm); hook.position.set(0, 0.55, -L / 2 - 0.15); v.b.group.add(hook);
    }
    v.siren = lm.map((col, j) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.28), new THREE.MeshBasicMaterial({ color: col })); b.position.set(j ? 0.4 : -0.4, v.b.height / (v.b.s || 1) + 0.1, v.b.length / (v.b.s || 1) * 0.3); v.b.group.add(b); return b; });
    if (kind === 'fire') { const lad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, v.b.length / (v.b.s || 1) * 0.8), new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 0.6 })); lad.position.set(0, v.b.height / (v.b.s || 1) + 0.08, -0.2); v.b.group.add(lad); }
    ems.push({ kind, v, x, z, stage: 'drive', crew: [], t: 0, wreck: kind === 'tow' ? dispatch.wreck : null }); return;
  }
}
function updateEmergency(dt) {
  // fires burn, hurt you if you stand in them, and slowly die out
  for (let i = fires.length - 1; i >= 0; i--) {
    const F = fires[i]; F.t -= dt;
    if (Math.random() < dt * 22) spawnParticles(F.x + rand(-1.2, 1.2), 0.3, F.z + rand(-1.2, 1.2), ['#ffd23f', '#ff8a2a', '#ff3b1a'], 1, 1.2, 0.8, 0.35, -5);
    if (Math.random() < dt * 6) spawnParticles(F.x, 2, F.z, ['#3a3040', '#5a5060'], 1, 1, 1.6, 0.6, -2);
    const f = focusPos(); if (!ride && Math.hypot(f.x - F.x, f.z - F.z) < 1.6) { hurt(dt * 18); }
    if (F.t <= 0) fires.splice(i, 1);
  }
  // burnt-out wrecks get towed away (yours too only if you abandon it far away: we leave your car alone)
  for (const w of vehicles) if (w.wrecked && !w.towed && w !== myCar && !w.towCalled && w.burnT <= 0) { w.wreckT = (w.wreckT || 0) + dt; if (w.wreckT > 30 && !ems.some(e => e.kind === 'tow' && !e.done)) { w.towCalled = true; dispatch('tow', w.s.x, w.s.z, w); if (!ems.some(e => e.wreck === w)) w.towCalled = false, w.wreckT = 20; } }
  // injured people get an ambulance
  if (!ems.some(e => e.kind === 'med' && !e.done)) { const hurtP = peds.list.find(p => p.injured && p.state === 'down'); if (hurtP && Math.random() < dt * 0.4) dispatch('med', hurtP.x, hurtP.z); }
  for (let i = ems.length - 1; i >= 0; i--) {
    const E = ems[i], v = E.v;
    if (!vehicles.includes(v)) { if (E.wreck && vehicles.includes(E.wreck) && E.wreck.towed) removeVehicle(E.wreck); for (const c of E.crew) { const k = peds.list.indexOf(c); if (k >= 0) peds.list.splice(k, 1); dyn.remove(c.root); } ems.splice(i, 1); continue; }
    if (v.siren) { const on = Math.floor(time * 5) % 2; v.siren[0].visible = !!on; v.siren[1].visible = !on; }
    const d = Math.hypot(v.s.x - E.x, v.s.z - E.z);
    if (E.kind === 'tow') { // tow truck: pull up, hook the wreck, drive off with it dangling behind
      const w = E.wreck;
      if (!w || !vehicles.includes(w)) { E.stage = 'leave'; v.ai = 'leave'; E.done = true; }
      else if (E.stage === 'drive') { v.target = { x: w.s.x, z: w.s.z }; if (Math.hypot(v.s.x - w.s.x, v.s.z - w.s.z) < 10.5 && Math.abs(v.s.v) < 2.5) { E.stage = 'hook'; E.t = 0; v.ai = 'park'; sfx.click(); } }
      else if (E.stage === 'hook') { E.t += dt; if (Math.random() < dt * 8) spawnParticles(w.s.x, 0.8, w.s.z, ['#ffd23f', '#ffffff'], 1, 2, 0.3, 0.08, 4); if (E.t > 3) { E.stage = 'tow'; w.towed = true; v.towing = w; v.ai = 'leave'; w.b.group.rotation.order = 'YXZ'; } }
      if (E.stage === 'tow' && w && vehicles.includes(w)) {
        const back = v.b.length / 2 + w.b.length / 2 - 0.4; w.s.h = v.s.h; w.s.x = v.s.x - Math.sin(v.s.h) * back; w.s.z = v.s.z - Math.cos(v.s.h) * back; w.s.v = 0; w.s.vx = w.s.vz = 0;
        w.b.group.position.set(w.s.x, baseY(w.s.x, w.s.z) + 0.45, w.s.z); w.b.group.rotation.set(-0.16, w.s.h, 0);
        if (Math.hypot(v.s.x - focusPos().x, v.s.z - focusPos().z) > 90) { removeVehicle(w); removeVehicle(v); ems.splice(i, 1); }
      }
      if (v.siren) { const on = Math.floor(time * 3) % 2; v.siren[0].visible = !!on; v.siren[1].visible = !on; }
      continue;
    }
    if (E.stage === 'drive' && d < 11 && Math.abs(v.s.v) < 2) {
      E.stage = 'work'; E.t = 0; v.ai = 'park';
      const look = crewLook[E.kind] ||= bakeCfg(CREW[E.kind === 'fire' ? 'fire' : 'med']);
      for (let k = 0; k < 2; k++) { const p = peds.makePed(look); Object.assign(p, { kind: 'crew', x: v.s.x + Math.cos(v.s.h) * (k ? -1.6 : 1.6), z: v.s.z - Math.sin(v.s.h) * (k ? -1.6 : 1.6), state: 'chase', tx: E.x + rand(-1.5, 1.5), tz: E.z + rand(-1.5, 1.5), name: E.kind === 'fire' ? 'Firefighter' : 'Paramedic' }); peds.list.push(p); E.crew.push(p); }
    }
    if (E.stage === 'work') {
      E.t += dt;
      for (const c of E.crew) if (Math.hypot(c.x - E.x, c.z - E.z) < 2.6) {
        c.state = 'punch'; c.tx = E.x; c.tz = E.z;
        if (E.kind === 'fire' && Math.random() < dt * 20) spawnParticles(c.x + Math.sin(c.face) * 0.8, 1.3, c.z + Math.cos(c.face) * 0.8, ['#bfe8ff', '#ffffff'], 1, 5, 0.5, 0.09, 6);
      }
      if (E.t > 6) {
        if (E.kind === 'fire') for (let k = fires.length - 1; k >= 0; k--) if (Math.hypot(fires[k].x - E.x, fires[k].z - E.z) < 10) fires.splice(k, 1);
        if (E.kind === 'med') for (const p of peds.list) if (p.injured && Math.hypot(p.x - E.x, p.z - E.z) < 8) { p.injured = false; p.t = 0.05; }
        E.stage = 'back'; for (const c of E.crew) { c.state = 'chase'; c.tx = v.s.x; c.tz = v.s.z; }
      }
    }
    if (E.stage === 'back') {
      E.crew = E.crew.filter(c => { if (Math.hypot(c.x - v.s.x, c.z - v.s.z) < 2.2) { const k = peds.list.indexOf(c); if (k >= 0) peds.list.splice(k, 1); dyn.remove(c.root); return false; } c.tx = v.s.x; c.tz = v.s.z; return true; });
      if (!E.crew.length) { E.stage = 'leave'; v.ai = 'leave'; E.done = true; }
    }
    if (Math.hypot(v.s.x - focusPos().x, v.s.z - focusPos().z) > (E.stage === 'leave' ? 80 : 200)) { removeVehicle(v); }
  }
}

// ================================================================ ALTERNATE STATES: alcohol and the (fictional) goods you deal
// Each one changes how the game looks and plays for a while. Mixing too much = you wake up in hospital.
const FX = { drunk: 0, trips: {}, filt: '' };
const TRIP = {
  haze: { name: 'Blue Haze', dur: 75, msg: 'Everything slows down. Colours get rich. You could eat a whole taco truck.', mood: 15 },
  pills: { name: 'Red Pills', dur: 60, msg: 'Heart racing. You feel FAST. And strong.', mood: 10, energy: 25 },
  dust: { name: 'Pixie Dust', dur: 70, msg: 'Wow. Rainbows. Sparkles. You love everyone.', mood: 35 },
  moon: { name: 'Moon Rocks', dur: 70, msg: 'Gravity is optional now. Try jumping.', mood: 20 },
  glow: { name: 'Glowstix', dur: 65, msg: 'The city turns neon. Is that... sound you can see?', mood: 25 },
  gold: { name: 'Gold Leaf', dur: 90, msg: 'You feel rich. Smooth. Unstoppable. Everyone wants to talk to you.', mood: 30 },
};
function addDrunk(v) {
  FX.drunk += v;
  if (FX.drunk > 1.2 && FX.drunk - v <= 1.2) toast("You're properly drunk now. Maybe don't drive.", 3);
  if (FX.drunk > 2.6) { FX.drunk = 0.6; toast('You drank way too much and blacked out...', 3); setTimeout(() => die(), 600); }
}
function useGood(id) {
  if (!stash[id]) return;
  stash[id]--;
  const active = Object.keys(FX.trips).length;
  if (FX.trips[id] || active >= 2 && Math.random() < 0.55 || FX.drunk > 1.5 && active >= 1 && Math.random() < 0.4) { toast('Your heart is pounding... everything goes dark.', 3); FX.trips = {}; setTimeout(() => die(), 900); return; }
  const T = TRIP[id]; FX.trips[id] = T.dur; feed({ mood: T.mood, energy: T.energy || 0 }); toast(T.msg, 3.5); sfx.whoosh?.(); saveGame();
}
const fxOn = id => (FX.trips[id] || 0) > 0;
const fxSpeed = () => (fxOn('pills') ? 1.35 : 1) * (fxOn('haze') ? 0.9 : 1);
const fxGrav = () => fxOn('moon') ? 7 : 24, fxJump = () => fxOn('moon') ? 13 : 7.5;
function updateFx(dt) {
  FX.drunk = Math.max(0, FX.drunk - dt * 0.012); goldBoost = fxOn('gold') ? 3 : 0;
  for (const k of Object.keys(FX.trips)) { FX.trips[k] -= dt; if (FX.trips[k] <= 0) { delete FX.trips[k]; feed({ mood: -12, energy: k === 'pills' ? -30 : -8 }); toast(`The ${TRIP[k].name} wears off. You feel flat.`, 2.5); } }
  if (fxOn('haze')) stats.hunger = Math.max(0, stats.hunger - dt * 0.15); // munchies
  // particles around you
  const f = focusPos();
  if (fxOn('dust') && Math.random() < dt * 10) spawnParticles(f.x + rand(-2, 2), 1 + Math.random() * 2, f.z + rand(-2, 2), ['#ff6fb5', '#ffd23f', '#38e8ff', '#4cd964', '#b26bff'], 1, 0.6, 1.2, 0.12, -0.6);
  if (fxOn('gold') && Math.random() < dt * 5) spawnParticles(f.x + rand(-1.5, 1.5), 2.2, f.z + rand(-1.5, 1.5), ['#ffd23f', '#fff2b0'], 1, 0.5, 1.4, 0.1, 2);
  if (fxOn('glow') && Math.random() < dt * 4) spawnParticles(f.x + rand(-4, 4), 0.3, f.z + rand(-4, 4), ['#38e8ff', '#ff3b8a', '#b6ff3b'], 2, 2, 0.8, 0.18, -2);
  // screen look
  const t = time, d = Math.min(1.5, FX.drunk), parts = [];
  if (d > 0.15) parts.push(`blur(${(d * 1.4).toFixed(2)}px)`, `saturate(${(1 + d * 0.3).toFixed(2)})`);
  if (fxOn('haze')) parts.push('saturate(1.7)', 'hue-rotate(-18deg)', 'contrast(1.05)');
  if (fxOn('pills')) parts.push(`contrast(${(1.15 + Math.max(0, Math.sin(t * 7.5)) * 0.15).toFixed(2)})`, 'saturate(1.4)');
  if (fxOn('dust')) parts.push(`hue-rotate(${Math.floor((t * 70) % 360)}deg)`, 'saturate(2.2)');
  if (fxOn('moon')) parts.push('hue-rotate(230deg)', 'saturate(1.3)', 'brightness(1.05)');
  if (fxOn('glow')) parts.push('invert(0.88)', `hue-rotate(${170 + Math.sin(t) * 40}deg)`, 'saturate(2.6)', 'contrast(1.25)');
  if (fxOn('gold')) parts.push('sepia(0.55)', 'saturate(1.9)', 'brightness(1.08)');
  const filt = parts.join(' ');
  if (filt !== FX.filt) { FX.filt = filt; $('c').style.filter = filt; }
  const vig = $('fxVig'); const pulse = fxOn('pills') ? 0.35 + Math.max(0, Math.sin(t * 7.5)) * 0.4 : d > 0.6 ? 0.25 + Math.sin(t * 1.3) * 0.1 : 0;
  vig.style.opacity = pulse.toFixed(2); vig.style.setProperty('--vc', fxOn('pills') ? 'rgba(255,30,60,.55)' : 'rgba(40,10,60,.5)');
}
function fxReset() { FX.drunk = 0; FX.trips = {}; FX.filt = ''; $('c').style.filter = ''; }
// ================================================================ FAMILY: partner, engagement, marriage, pregnancy, kids that grow up
const BOY_NAMES = ['Leo', 'Max', 'Noah', 'Eli', 'Jayden', 'Marcus', 'Theo', 'Ezra', 'Kai', 'Luca'], GIRL_NAMES = ['Ava', 'Lily', 'Mila', 'Zara', 'Ruby', 'Isla', 'Nova', 'Ellie', 'Aria', 'Skye'];
function fam() { stats.fam ||= { partner: null, kids: [], preg: null, home: null, seen: 0 }; stats.texts ||= {}; stats.propMode ||= {}; return stats.fam; }
const AGES = [[0, 'Baby'], [1, 'Toddler'], [3, 'Child'], [7, 'Teen'], [12, 'Adult']];
const kidAge = k => dayN - k.born, kidStage = k => [...AGES].reverse().find(([d]) => kidAge(k) >= d)[1];
function kidCfg(k) {
  const st = kidStage(k), h = { Baby: 0.3, Toddler: 0.45, Child: 0.62, Teen: 0.85, Adult: 1 }[st];
  const r = seeded(k.seed), c = a => a[Math.floor(r() * a.length)];
  const cols = ['#e23b3b', '#2f80ed', '#4cd964', '#ffd23f', '#ff8a2a', '#9b51e0', '#ff6fb5', '#1fb5a8'];
  return { ...DEFAULT_CHAR, skin: k.skin, hairColor: k.hairColor, hair: k.girl ? c(['long', 'ponytail', 'bob', 'bun']) : c(['short', 'buzz', 'afro', 'spiky']), facialHair: 'none', mask: 'none', back: 'none', eyewear: 'none', hat: 'none', mouth: 'smile', eyes: 'normal',
    top: st === 'Baby' ? 'tshirt' : ['rain', 'storm'].includes(wx().k) && st !== 'Adult' ? c(['puffer', 'hoodie']) : c(st === 'Teen' ? ['tshirt', 'hoodie', 'tracksuit', 'jersey', 'puffer'] : ['tshirt', 'hoodie', 'tank', 'jersey']), topColor: c(cols), accent: c(cols), pants: st === 'Baby' || st === 'Toddler' ? 'shorts' : c(['jeans', 'shorts']), pantsColor: c(['#2f80ed', '#16161b', '#c2b280']), shoes: 'sneakers', shoeColor: '#ffffff',
    height: h, headSize: st === 'Baby' ? 1.5 : st === 'Toddler' ? 1.35 : st === 'Child' ? 1.15 : 1, build: st === 'Adult' ? 1 : 0.85 };
}
function partner() { return fam().partner; }
function famHome() { const f = fam(); if (f.home && owned.has(f.home)) return PROPERTIES.find(p => p.id === f.home); return null; }
function propMode(id) { const f = fam(); return stats.propMode[id] || (id === f.home || id === 'p_studio' ? 'live' : 'rent'); }
// who this person is to you, for the text engine
function textCtx(id) {
  const f = fam(), P2 = f.partner, d = stats.dates?.[id], kid = f.kids.find(k => k.id === id);
  const kind = kid ? (kidStage(kid) === 'Teen' ? 'teen' : 'adultkid') : P2?.id === id ? (P2.status === 'married' ? (P2.livesIn !== false ? 'wife' : 'gf') : P2.livesIn ? 'live' : 'gf') : 'date';
  const pr = d ? prefsOf(id) : { temper: 0.35 }; pr.temper ??= Math.random();
  return { kind, name: nameOf(id), rel: rel(id), temper: pr.temper, preg: f.preg?.mom === id, kids: f.kids.length, hour: clockH, money,
    withMe: date?.id === id || (inside?.prop?.id === f.home && P2?.id === id && P2.livesIn), busy: !!(date && date.id !== id), hasNum: !!d };
}
// what a text reply sets in motion
function textAct(id, act) {
  if (!act) return; const d = stats.dates?.[id], name = nameOf(id), P2 = stats.promises ||= [];
  if (act === 'meetNow') { if (d?.cfg && !date) { const sp = randomRoadSpot(70, 220); stats.dateMeet = { id, x: sp.x + 3.5, z: sp.z, until: gameHours() + 3 }; setWaypoint(sp.x + 3.5, sp.z, `Pick up ${name}`); } }
  else if (act === 'meetEight') { const dh = (20 - clockH + 24) % 24; stats.dateLater = { id, at: gameHours() + dh }; }
  else if (act === 'meetHome') { const h = famHome() || nearestHome(); if (d?.cfg && h) { stats.dateMeet = { id, x: h.x + 2.5, z: h.z + 1.5, until: gameHours() + 3, home: true }; setWaypoint(h.x, h.z, `Pick up ${name} at home`); } }
  else if (act === 'meetExtend') { if (stats.dateMeet?.id === id) stats.dateMeet.until += 1; }
  else if (act === 'meetCancel') { if (stats.dateMeet?.id === id) { stats.dateMeet = null; clearWaypoint(); } }
  else if (act === 'promiseHome' || act === 'promiseHour') { if (!P2.some(p => p.id === id && p.k === 'home')) P2.push({ id, k: 'home', until: gameHours() + (act === 'promiseHour' ? 1.4 : 2.5) }); }
  else if (act === 'promiseGroc') { if (!P2.some(p => p.id === id && p.k === 'groc')) P2.push({ id, k: 'groc', base: stats.groceries || 0, until: gameHours() + 6 }); const f = focusPos(), mart = PLACES.filter(p => p.interior === 'mart').sort((a, b) => Math.hypot(a.x - f.x, a.z - f.z) - Math.hypot(b.x - f.x, b.z - f.z))[0]; if (mart) setWaypoint(mart.x, mart.z, `Groceries: ${mart.name}`); toast('Groceries: QuickMart is on your map. Or order them on AzBay.', 2.8); }
  else if (act === 'send50') { spend(50); }
  else if (act === 'breakup') { lifeApi().breakup?.(); }
}
// keeping your word: being home when you said, bringing the groceries
function updatePromises() {
  const L = stats.promises; if (!L?.length) return; const f = fam(), home = inside?.prop && inside.prop.id === f.home;
  for (let i = L.length - 1; i >= 0; i--) { const p = L[i], name = nameOf(p.id), who = f.partner?.id === p.id && f.partner.cfg ? { key: p.id, name, cfg: f.partner.cfg, pitch: 330 } : null;
    if (home && (p.k === 'home' || (p.k === 'groc' && (stats.groceries || 0) > p.base))) { L.splice(i, 1); bumpRel(p.id, p.k === 'groc' ? 6 : 4, true); const line = p.k === 'groc' ? pick(['You remembered! My hero.', 'Groceries AND you. Perfect.']) : pick(['There you are!', 'You came home on time. I\'m impressed.', 'Hey you. Missed you.']); if (who) setTimeout(() => subs.say(who, line, { expr: 'happy' }), 1200); continue; }
    if (gameHours() > p.until) { L.splice(i, 1); bumpRel(p.id, -4, false); textMe(p.id, name, p.k === 'groc' ? pick(['You forgot the groceries, didn\'t you.', 'No groceries? Seriously?']) : pick(['You said you were on your way...', 'Where are you? You said you\'d be home.']), false, p.k === 'groc' ? 'groceries' : 'comehome'); }
  }
  // "8pm, don't be late": she sends her location when it's time
  const DL = stats.dateLater; if (DL && gameHours() >= DL.at) { stats.dateLater = null; if (!date && !stats.dateMeet && stats.dates?.[DL.id]?.cfg) { const sp = randomRoadSpot(70, 220); stats.dateMeet = { id: DL.id, x: sp.x + 3.5, z: sp.z, until: gameHours() + 3 }; setWaypoint(sp.x + 3.5, sp.z, `Pick up ${nameOf(DL.id)}`); textMe(DL.id, nameOf(DL.id), 'It\'s 8! I\'m ready. Location sent 📍', false, 'pickup'); } }
}
function textMe(id, from, text, me = false, topic) { if (!me && stats.dates?.[id]?.noNum) return; const T = (stats.texts ||= {}); (T[id] ||= []).push({ me, t: text, d: dayN, h: gameHours(), k: me ? undefined : topic !== undefined ? topic : classify(text) }); if (T[id].length > 40) T[id].shift(); if (!me) { phoneBadge++; notify(from, text, 4.5, id); sfx.coin(); } }
// side buttons stretch out into a pill to show what's new: the phone shows a message summary, the radio shows the song
const peekT = {};
function peek(id, html, dur = 4.5) {
  const b = $(id); if (!b) return;
  let pl = b.querySelector('.peek'); if (!pl) { pl = document.createElement('span'); pl.className = 'peek'; b.appendChild(pl); }
  pl.innerHTML = html; b.classList.add('open'); clearTimeout(peekT[id]); peekT[id] = setTimeout(() => b.classList.remove('open'), dur * 1000);
}
// the phone rings: their face on an "Incoming call" card and the phone-map in the corner buzzes
function ringing(name, cfg, id) {
  const w = faceFor(id, name) || (cfg ? { key: 'call:' + name, name, cfg, pitch: 260 } : null);
  if (w) subs.say(w, 'Incoming call…', { silent: true, tag: 'calling', pri: 5, now: true, expr: 'happy' }); else subs.note('phone', 'Incoming call', name, { pri: 5, now: true });
  const mw = $('mmWrap'); mw.classList.remove('ring'); void mw.offsetWidth; mw.classList.add('ring'); setTimeout(() => mw.classList.remove('ring'), 1700);
  navigator.vibrate?.([200, 100, 200]);
}
function notify(from, text, dur = 4.5, id) { if (state === 'phone') return; const w = faceFor(id, from); if (w) subs.say(w, text, { silent: true, tag: 'text', expr: /!|love|miss|😘|❤️|yay|best/i.test(text) ? 'happy' : /\?\?|wow|seriously|forgot|where are you|done/i.test(text) ? 'angry' : 'neutral', pri: 2 }); else slotNote('phone', from, text, dur); }
// a face for anyone we know: your partner, dates, kids, Ray, the people in town
function faceFor(id, name) { try { return faceFor2(id, name); } catch { return null; } }
function faceFor2(id, name) {
  const f = fam();
  if (id === 'ray' || name === 'Uncle Ray') return rayWho();
  const d = id ? stats.dates?.[id] : Object.values(stats.dates || {}).find(q => q.name === name);
  if (f.partner && (f.partner.id === id || f.partner.name === name) && f.partner.cfg) return { key: f.partner.id, name: f.partner.name, cfg: f.partner.cfg, pitch: 330 };
  if (d?.cfg) return { key: id || 'date:' + name, name: d.name || name, cfg: d.cfg, pitch: 320 };
  const k = f.kids.find(q => q.id === id || q.name === name); if (k) return { key: k.id, name: k.name, cfg: kidCfg(k), pitch: 420 };
  if (date && date.name === name) return dateWho();
  if (buddy && buddy.name === name) return buddyWho();
  const cu = customers.find(c => c.name === name); if (cu?.cfg || cu?.npc?.cfg) return { key: 'cust' + cu.id, name, cfg: cu.cfg || cu.npc.cfg, pitch: 180 };
  const dl = PLACES.find(p => p.npc === name && p.cfg); if (dl) return { key: dl.id, name, cfg: dl.cfg, pitch: 170 };
  if (!name || /^(You|Bay |Unknown)/.test(name) || !/^[A-Z][a-z'’-]+( [A-Z][a-z'’-]+)?$/.test(name)) return null; // only real names get a face
  // someone we don't have a look for yet: give them one face, the same one every time
  let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0; const fem = FEM_NAMES.includes(name.split(' ')[0]) || /a$|ie$|y$/i.test(name.split(' ')[0]);
  const ff = (faceFor2.cache ||= {}); ff[name] ||= { ...npcCfg('guest', Math.abs(h) % 9999), fem };
  return { key: 'n:' + name, name, cfg: ff[name], pitch: fem ? 310 : 170 };
}
function nameOf(id) { if (stats.dates?.[id]) return stats.dates[id].name; const k = fam().kids.find(k => k.id === id); return k ? k.name : id; }
// called from WooHoo
function maybePregnant(withId, tryForBaby) {
  const f = fam(); if (!tryForBaby || f.preg) return;
  if (Math.random() < 0.6) { const d = stats.dates[withId]; f.preg = { due: dayN + PREG_DAYS, start: dayN + clockH / 24, mom: withId, told: false }; f.pregName = d?.name; }
}
const PREG_DAYS = 90;
function bellyFor(id) { const p = fam().preg; if (!p || p.mom !== id) return 0; const st = p.start ?? p.due - PREG_DAYS; return clamp((dayN + clockH / 24 - st) / (p.due - st), 0.08, 1); }
function makeOfficial(id) { const d = stats.dates[id]; const f = fam(); f.seen = dayN; f.partner = { id, name: d.name, cfg: d.cfg, status: 'partner', since: dayN, livesIn: false }; bumpRel(id, 10, false); }
function cheatCheck(withId) {
  const P2 = partner(); if (!P2 || P2.id === withId) return;
  // getting caught depends on what she could actually find out: someone seeing you, or a number in your phone
  const seen = inside ? 0 : peds.list.filter(p => p.state !== 'down' && Math.hypot(p.x - P.x, p.z - P.z) < 22).length, hasNum = !!stats.dates?.[withId];
  const risk = 0.04 + Math.min(0.3, seen * 0.04) * (night > 0.5 ? 0.5 : 1) + (hasNum ? 0.15 : 0);
  if (Math.random() < risk) { stats.rel[P2.id] = Math.max(0, rel(P2.id) - 35); setTimeout(() => textMe(P2.id, P2.name, seen && (!hasNum || Math.random() < 0.5) ? pick(["Who is she?! Someone saw you two together.", "My friend saw you with some girl. Explain. Now."]) : pick(["Why is there a girl's number in your phone?", "I saw your messages. I can't believe you."])), 6000); }
}
function famNewDay() {
  const f = fam();
  if (f.preg && !f.preg.told) { f.preg.told = true; textMe(f.preg.mom, nameOf(f.preg.mom), "Okay... sit down. I'm pregnant. And it's yours."); if (!f.partner) makeOfficial(f.preg.mom); if (f.partner?.id === f.preg.mom) { f.partner.livesIn = true; if (!famHome()) f.home = owned.has('p_studio') ? 'p_studio' : [...owned][0]; } }
  else if (f.preg && dayN >= f.preg.due && !f.preg.labour) startLabour();
  else if (f.preg?.labour && dayN > f.preg.due + 1) giveBirth('home');
  // kids growing up
  for (const k of f.kids) { const st = kidStage(k); if (k.stage && k.stage !== st) toast(`${k.name} is now a ${st.toLowerCase()}!`, 3); k.stage = st; }
  // neglect
  if (f.partner && dayN - (f.seen || 0) > 2) { stats.rel[f.partner.id] = Math.max(0, rel(f.partner.id) - 6); textMe(f.partner.id, f.partner.name, pick(["Do you even live here anymore?", "We need to talk about us.", ...(f.kids.length ? [f.kids.length > 1 ? "The kids keep asking where you are." : `${f.kids[0].name} keeps asking where you are.`] : []), ...(f.preg ? ["I'm carrying your baby and I haven't seen you in days.", "The baby's kicking. Wish you were here to feel it."] : [])])); }
}
let famTextT = 120;
function famTexts(dt) { // random incoming texts from people who care about you
  famTextT -= dt; if (famTextT > 0) return; famTextT = rand(90, 200);
  const f = fam(), cands = [];
  const withMe = id => date?.id === id || (inside?.prop && inside.prop.id === f.home && id === f.partner?.id && f.partner?.livesIn); // no "what are you up to?" from someone standing next to you
  if (f.partner && rel(f.partner.id) > 15 && !withMe(f.partner.id)) cands.push(f.partner.id);
  for (const id of Object.keys(stats.dates || {})) if (!stats.dates[id].noNum && id !== f.partner?.id && !withMe(id) && rel(id) > 25 && Math.random() < 0.3) cands.push(id);
  for (const k of f.kids) if (['Teen', 'Adult'].includes(kidStage(k))) cands.push(k.id);
  if (!cands.length || inside?.prop?.id === f.home) return;
  const id = pick(cands), T = stats.texts?.[id], last = T?.[T.length - 1];
  if (last && !last.me && last.k && gameHours() - (last.h || 0) < 6) return; // don't pile a new text on top of one you haven't answered
  const it = incomingText(textCtx(id)); textMe(id, nameOf(id), it.t, false, it.topic);
}
// your family appears in your family home
function addFamilyNpcs(prop) {
  const f = fam(); if (!f.home || prop.id !== f.home) return;
  const add = (cfg, name, role, ref, i) => { const w = inside.h.toWorld(-2 + i * 1.6, 0.5 + (i % 2) * 1.2); inside.npcs.push({ x: w.x, z: w.z, role, cfg, fig: null, face: 0, homeFace: Math.PI, t: Math.random() * 5, parent: dyn, name, relId: ref.id, fam: ref }); };
  let i = 0;
  if (f.partner && (f.partner.livesIn || f.preg?.mom === f.partner.id) && !(date && date.id === f.partner.id)) add({ ...f.partner.cfg, belly: bellyFor(f.partner.id) }, f.partner.name, 'spouse', f.partner, i++);
  for (const k of f.kids) if (kidStage(k) !== 'Adult') add(kidCfg(k), k.name, 'kid', k, i++);
  if (f.partner?.livesIn || f.kids.length) f.seen = dayN;
}
const KID_LINES = { Baby: ['*giggles*', '*babbles happily*', 'Ba-ba!', '*grabs your finger*'], Toddler: ['Daddy! Up! Up!', 'I drawed a dog!', 'Why is the sky blue?', 'Can we get ice cream?'], Child: ['Dad, can we go to the beach?', 'I scored a goal at school today!', 'Can I have a puppy?', 'Mom says I have to do my homework.'], Teen: ['Ugh, Dad. You\'re so embarrassing.', 'Can I borrow the car?', 'Everyone else is going to the party.', 'I need new sneakers.'], Adult: ['Thanks for everything, Dad.'] };
async function talkFamily(n) {
  const ref = n.fam, f = fam();
  if (n.role === 'spouse') {
    const P2 = f.partner;
    beginTalk(n.cfg, P2.name, P2.status === 'married' ? 'Your wife' : P2.status === 'engaged' ? 'Your fiancée' : 'Your girlfriend', 330, P2.id);
    await talk.say(rel(P2.id) < 25 ? pick(["Oh. You're back.", "We need to talk."]) : pick(["Hey you. Missed you.", "There you are! How was your day?", ...(fam().kids.length ? [fam().kids.length > 1 ? "The kids were asking about you." : `${fam().kids[0].name} was asking about you.`] : []), ...(fam().preg ? ["The baby's been kicking all day. Feel!"] : [])]));
    const o = [{ label: I('heart', 'Kiss'), k: 'kiss' }, { label: I('chat', 'How was your day?'), k: 'chat' }, { label: I('cash', 'Give housekeeping money <small>$200</small>'), k: 'money' }];
    if (P2.status === 'partner' && rel(P2.id) >= 65) o.push({ label: I('star', 'Propose <small>ring $2,500</small>'), k: 'propose' });
    if (inside.h.furn.some(x => FURN[x.t].act === 'sleep')) o.push({ label: I('heart', 'WooHoo'), k: 'woo' });
    if (stats.gifts?.length) o.push({ label: I('heart', 'Give a gift'), k: 'gift' });
    o.push({ label: I('star', "Let's go out"), k: 'out' }, { label: I('x', 'Later'), k: 'bye' });
    const c = o[await talk.choose(o)].k;
    if (c === 'gift') await giveGift(P2.id, P2.name, n.x, n.z);
    else if (c === 'kiss') { bumpRel(P2.id, 5); feed({ mood: 6 }); hearts(n.x, n.z, 8); await talk.say('*mwah* Love you.'); }
    else if (c === 'chat') { bumpRel(P2.id, 4); gainXP('charm', 4); await talk.say(pick(["Long day. The baby didn't sleep at all.", "I'm thinking of starting a little business. Nails, maybe.", "Your mom called. Just kidding.", "Honestly? I'm happy. Just us. This."])); }
    else if (c === 'money') { if (money < 200) await talk.say("Babe, you don't have it. It's fine."); else { spend(200); bumpRel(P2.id, 8, false); stats.groceries += 4; await talk.say("Thank you. I'll stock the fridge."); } }
    else if (c === 'propose') {
      if (money < 2500) await talk.say("...Were you about to propose with no ring? Ha!", 'npc');
      else { spend(2500); await talk.say('Will you marry me?', 'you'); if (rel(P2.id) >= 65) { P2.status = 'engaged'; bumpRel(P2.id, 15, false); hearts(n.x, n.z, 20); feed({ mood: 30 }); await talk.say('YES! Oh my god, yes!'); toast('Engaged! Book the wedding with Father Gabe at Bay Chapel.', 4); } else await talk.say("I... need more time."); }
    }
    else if (c === 'woo') { await talk.say(pick(['Mmm. Bedroom. Now.', 'I thought you\'d never ask.', '*takes your hand*'])); const tb = await askBaby(); endTalk(); const bed = inside.h.furn.find(x => FURN[x.t].act === 'sleep'); if (!bed) { toast('You need a bed for that.', 2); return; } inside.npcs.splice(inside.npcs.indexOf(n), 1); dyn.remove(n.fig?.root); startDate({ name: P2.name, look: { ...bakeCfg(P2.cfg), fem: true }, x: n.x, z: n.z, face: 0, interest: 90, root: new THREE.Group() }); date.tryBaby = tb; return startWoo('bed', bed); }
    else if (c === 'out') { endTalk(); inside.npcs.splice(inside.npcs.indexOf(n), 1); dyn.remove(n.fig?.root); startDate({ name: P2.name, look: { ...bakeCfg(P2.cfg), fem: true }, x: n.x, z: n.z, face: 0, interest: 80, root: new THREE.Group() }); return; }
    f.seen = dayN; endTalk(); return;
  }
  const k = ref, st = kidStage(k);
  beginTalk(n.cfg, k.name, `Your ${k.girl ? 'daughter' : 'son'} · ${st}`, k.girl ? 420 : 360, k.id);
  await talk.say(pick(KID_LINES[st]));
  const o = st === 'Baby' ? [I('heart', 'Cuddle'), I('food', 'Feed'), I('x', 'Put down')] : st === 'Toddler' ? [I('play', 'Play'), I('book', 'Read a story'), I('x', 'Later')] : st === 'Child' ? [I('book', 'Help with homework'), I('ball', 'Play catch'), I('cash', 'Pocket money $20'), I('x', 'Later')] : [I('chat', 'Talk'), I('steer', 'Teach them to drive'), I('cash', 'Give $50'), I('x', 'Later')];
  const c = await talk.choose(o);
  if (c === o.length - 1) { endTalk(); return; }
  const cost = (st === 'Child' && c === 2) ? 20 : (st === 'Teen' && c === 2) ? 50 : 0;
  if (cost && money < cost) { await talk.say("You're broke? Seriously?"); endTalk(); return; }
  if (cost) spend(cost);
  bumpRel(k.id, 8); feed({ mood: 8 }); fam().seen = dayN;
  if (st === 'Teen' && c === 1) gainXP('driving', 20); if (st === 'Child' && c === 0) gainXP('charm', 8);
  await talk.say(pick(st === 'Baby' ? ['*coos*', '*falls asleep on your shoulder*'] : st === 'Toddler' ? ['Again! Again!', 'You\'re the best daddy!'] : st === 'Child' ? ['Thanks Dad!', 'You\'re the coolest.'] : ['...Thanks, Dad. Actually.', 'Okay that was kind of fun.']));
  if (st !== 'Baby') hearts(n.x, n.z, 5);
  endTalk();
}
async function askBaby() {
  const c = await talk.choose([I('shield', 'Play it safe'), I('heart', 'Try for a baby')]);
  return c === 1;
}
async function weddingAtChapel(n) {
  const P2 = partner();
  await talk.say(`A wedding! For you and ${P2.name}? The ceremony, flowers and party come to $5,000.`);
  const c = await talk.choose([I('heart', 'Book it <small>$5,000</small>'), I('x', 'Not yet')]);
  if (c !== 0) return;
  if (money < 5000) { await talk.say("Save up a little more, my friend. Love can wait a week."); return; }
  spend(5000); await talk.say('Then let us begin. Dearly beloved...'); endTalk();
  // ceremony: bride appears at the altar, confetti, bells
  const look = bakeCfg({ ...P2.cfg, top: 'long', topColor: '#ffffff', pants: 'jeans', pantsColor: '#ffffff', shoes: 'boots', shoeColor: '#ffffff', hat: 'none' }), fig = figure(look);
  const a = inside.h.toWorld(0.7, -6.2); fig.root.position.set(a.x, 0, a.z); fig.root.rotation.y = Math.PI / 2; dyn.add(fig.root);
  const b = inside.h.toWorld(-0.7, -6.2); P.x = b.x; P.z = b.z; P.face = -Math.PI / 2;
  const A = audio(); if (A) [0, 4, 7, 12, 7, 12, 16].forEach((m, i) => sfx.note(523 * Math.pow(2, m / 12), A.currentTime + i * 0.35, 0.6, 'sine', 0.05, 3000));
  for (let i = 0; i < 12; i++) setTimeout(() => { spawnParticles(a.x - 0.7, 3, a.z, ['#ffffff', '#ff6fb5', '#ffd23f', '#38e8ff'], 14, 3, 1.6, 0.12, 2); hearts(a.x - 0.7, a.z, 4, 2.2); }, i * 300);
  setTimeout(() => fade(() => { dyn.remove(fig.root); P2.status = 'married'; P2.livesIn = true; P2.wed = dayN; const f = fam(); if (!famHome()) f.home = owned.has('p_studio') ? 'p_studio' : [...owned][0]; bumpRel(P2.id, 30, false); feed({ mood: 60 }); gainXP('charm', 60); saveGame(); toast(`You married ${P2.name}! She's moved into ${famHome()?.name || 'your home'}.`, 4.5); }), 4200);
}
async function talkHospital(n, place) {
  const doc = n.role === 'doctor';
  beginTalk(n.cfg, doc ? 'Dr. ' + n.name : n.name, doc ? 'Doctor · Bay General' : 'Reception · Bay General', doc ? 180 : 320, n.relId);
  const f = fam();
  if (f.preg?.labour === 'hospital' && date && date.id === f.preg.mom) { await talk.say(doc ? "She's in labour? Get her to the maternity ward, now!" : 'Oh! Maternity is straight through, the doctor is on his way!'); endTalk(); return giveBirth('hospital'); }
  await talk.say(doc ? pick(["Let's take a look at you.", 'Busy night. What can I do for you?']) : pick(['Welcome to Bay General. How can I help?', 'Take a seat, or tell me what\'s wrong.']));
  const o = [I('cross', `Patch me up <small>$${Math.max(40, Math.round((maxHP() - P.hp) * 3))}</small>`), I('chart', 'Check-up'), ...(f.preg ? [I('heart', 'Pregnancy scan')] : []), I('x', 'Leave')];
  const c = await talk.choose(o), k = o[c];
  if (c === 0) { const cost = Math.max(40, Math.round((maxHP() - P.hp) * 3)); if (money < cost) await talk.say("You can't cover it. We'll stop the bleeding at least."), P.hp = Math.max(P.hp, maxHP() * 0.5); else { spend(cost); P.hp = maxHP(); await talk.say('All fixed up. Try to stay out of trouble.'); } }
  else if (c === 1) await talk.say(`Health ${Math.round(P.hp)}/${maxHP()}. ${stats.hunger < 25 ? 'You are seriously underfed. Eat a proper meal today.' : 'Eating fine.'} ${stats.energy < 25 ? 'And you need sleep.' : ''}`);
  else if (f.preg && c === 2) { const left = Math.max(0, f.preg.due - dayN); await talk.say(`Everything looks healthy. About ${left} day${left === 1 ? '' : 's'} to go. ${Math.random() < 0.5 ? 'Want to know? ...Actually, let it be a surprise.' : ''}`); feed({ mood: 10 }); }
  endTalk();
}
// labour: choose a home birth or drive her to Bay General
function startLabour() {
  const f = fam(), p = f.preg; if (!p || p.labour) return;
  p.labour = 'waiting'; const name = nameOf(p.mom);
  textMe(p.mom, name, 'My water just broke!! Where are you?!');
  modal(`<div class="big-ico">${svg('heart', 'big')}</div><h3>${name} is in labour!</h3><p>Deliver at home, or rush her to Bay General Hospital? The hospital costs $800 but it's safer and she'll love you for it.</p>`, [
    { label: 'Rush to the hospital', cls: 'big', fn: () => { closeModal(); p.labour = 'hospital'; const h = PLACES.find(q => q.id === 'v_hospital'); setWaypoint(h.x, h.z, 'Bay General Hospital'); if (!date) { const d = stats.dates[p.mom]; const a = rand(0, 6.28); startDate({ name: d.name, look: { ...bakeCfg(d.cfg), fem: true }, x: P.x + Math.sin(a) * 3, z: P.z + Math.cos(a) * 3, face: 0, interest: 90, root: new THREE.Group() }); } toast('She is with you. Get to the hospital, fast! Drive!', 4); } },
    { label: 'Home birth', fn: () => { closeModal(); giveBirth('home'); } },
  ]);
}
function giveBirth(where) {
  const f = fam(); if (!f.preg) return;
  fade(() => {
    const girl = Math.random() < 0.5, mom = stats.dates[f.preg.mom];
    const kid = { id: 'kid:' + Date.now(), name: pick(girl ? GIRL_NAMES : BOY_NAMES), girl, born: dayN, seed: Math.floor(Math.random() * 1e6), skin: pick([charCfg.skin, mom?.cfg.skin || charCfg.skin]), hairColor: pick([charCfg.hairColor, mom?.cfg.hairColor || charCfg.hairColor]), mom: f.preg.mom };
    f.kids.push(kid); stats.rel[kid.id] = 50;
    if (where === 'hospital') { spend(Math.min(money, 800)); bumpRel(f.preg.mom, 20, false); advanceTime(3); }
    else { advanceTime(2); if (Math.random() < 0.3) { stats.rel[f.preg.mom] = Math.max(0, rel(f.preg.mom) - 10); } }
    f.preg = null;
    if (!famHome()) f.home = owned.has('p_studio') ? 'p_studio' : [...owned][0];
    if (f.partner && f.partner.id === kid.mom) f.partner.livesIn = true;
    if (date && date.id === kid.mom) endDate();
    feed({ mood: 40 }); gainXP('charm', 30); saveGame();
    modal(`<div class="big-ico">${svg('smile', 'big')}</div><h3>It's a ${girl ? 'girl' : 'boy'}!</h3><p>Say hello to <b>${kid.name}</b>${where === 'hospital' ? ', born at Bay General' : ', born at home'}. Mother and baby are heading to ${famHome()?.name || 'home'}.</p>`, [{ label: 'Amazing', cls: 'big', fn: closeModal }]);
  });
}
// ---------------- The Pit: underground cage fighting ladder
const PIT = [
  { name: 'Skinny Pete', hp: 50, power: 7, tell: 0.95, col: '#9b51e0', purse: 150 },
  { name: 'Big Mo', hp: 75, power: 9, tell: 0.85, col: '#ff8a2a', purse: 300, skin: '#8d5524' },
  { name: 'The Butcher', hp: 95, power: 11, tell: 0.75, col: '#e23b3b', purse: 600, skin: '#e8b088' },
  { name: 'Ivan Kross', hp: 115, power: 13, tell: 0.65, col: '#2f80ed', purse: 1000, skin: '#f6c9a4' },
  { name: 'King Ruiz', hp: 140, power: 15, tell: 0.55, col: '#d4af37', purse: 2000, skin: '#b77a4b' },
];
async function pitFight() {
  const rank = Math.min(stats.pit || 0, PIT.length - 1), o = PIT[rank], bet = stats.pitBet || 0;
  if (P.hp < maxHP() * 0.4) { toast("You're too beat up to fight. Heal first."); return; }
  const r = await mini('cage', { opp: o, str: lvl('strength'), stam: lvl('stamina'), winText: 'K.O.! You win', loseText: 'Knocked out' });
  stats.pitBet = 0;
  if (r.quit) { toast('You walked out of the cage. The crowd boos.'); feed({ mood: -5 }); return; }
  if (r.win) {
    const pay = o.purse + bet * 2; addMoney(pay); gainXP('strength', 40 + rank * 15); gainXP('health', 20); feed({ mood: 20, energy: -20 }); hurt(8);
    if ((stats.pit || 0) < PIT.length - 1) stats.pit = (stats.pit || 0) + 1;
    toast(rank === PIT.length - 1 ? `Champion of The Pit! +${fmt(pay)}` : `You beat ${o.name}! +${fmt(pay)}. Next up: ${PIT[stats.pit].name}`, 4);
  } else { hurt(30); feed({ mood: -12, energy: -20 }); toast(`${o.name} put you down.${bet ? ` You lost your ${fmt(bet)} bet.` : ''} Train and come back.`, 3.5); }
  saveGame();
}
async function talkBookie(n, place) {
  const rank = Math.min(stats.pit || 0, PIT.length - 1), o = PIT[rank];
  beginTalk(n.cfg, 'Sal the Bookie', place.name, 150, n.relId);
  await talk.say((stats.pit || 0) >= PIT.length - 1 && rank === PIT.length - 1 && stats.pitChamp ? 'The champ himself. Defending tonight?' : `Next on your ladder: ${o.name}. Purse is ${fmt(o.purse)}. Want to bet on yourself? Pays double.`);
  const bets = [100, 500, 1000].filter(b => money >= b);
  const c = await talk.choose([...bets.map(b => I('cash', `Bet ${fmt(b)} on myself`)), I('chart', 'Who is on the card?'), I('x', 'Later')]);
  if (c < bets.length) { spend(bets[c]); stats.pitBet = (stats.pitBet || 0) + bets[c]; await talk.say(`${fmt(stats.pitBet)} on you. Don't make me look stupid.`); }
  else if (c === bets.length) await talk.say(PIT.map((p, i) => `${i + 1}. ${p.name}${i < (stats.pit || 0) ? ' (beaten)' : ''}`).join('   '));
  endTalk();
}
// ================================================================ ROMANCE (Sims style: flirt, get a number, go on a date, woohoo under the duvet)
const FEM_NAMES = ['Jade', 'Mia', 'Sofia', 'Chloe', 'Lexi', 'Nina', 'Ava', 'Zoe', 'Maya', 'Bella', 'Kira', 'Luna', 'Rosa', 'Tasha', 'Gabi', 'Leah'];
let date = null, woo = null;
function lookIsFem(look) { return !!look?.fem; }
// Every stranger has a personality: two things they love, one they can't stand, and maybe a partner.
// Rapport (respect / friendliness) is built with Chat and Deep talk. Attraction comes from Flirt and Cheeky.
// Flirting works far better once she actually likes you, and the same line twice gets old fast.
const TOPICS = {
  music: { label: 'Music', icon: 'music', you: ['What are you listening to these days?', 'Been on Bassline FM all week. You into music?'], love: ['Oh my god, music is my whole life. I go to every gig in the city.', 'Yes! I make playlists for literally every mood.'], meh: ['I listen to whatever is on, honestly.'], hate: ['I don\'t really get music people. It\'s just noise to me.'] },
  cars: { label: 'Cars', icon: 'car', you: ['You see that car that just went past? Mental.', 'I\'ve been doing up my car. You into cars at all?'], love: ['Okay you\'re speaking my language. I want a lowrider so bad.', 'My dad raced. I grew up in a garage, I love that stuff.'], meh: ['A car is a car to me. Does it get me places?'], hate: ['Car guys are the worst. No offence.'] },
  fitness: { label: 'Fitness', icon: 'dumbbell', you: ['Been hitting Iron Temple lately.', 'You look like you train. Do you?'], love: ['Gym every morning. It keeps me sane.', 'I run the seafront every day. Love it.'], meh: ['I walk places. That counts, right?'], hate: ['Ugh, gym talk. Please no.'] },
  food: { label: 'Food', icon: 'taco', you: ['Have you tried the taco truck down by the beach?', 'Where\'s good to eat round here?'], love: ['Don\'t get me started, I\'m a total foodie. That diner does the best pancakes.', 'Food is my love language. I cook every night.'], meh: ['I mostly eat whatever is quick.'], hate: ['I\'m on a diet, can we not talk about food.'] },
  travel: { label: 'Travel', icon: 'map', you: ['If you could fly anywhere tomorrow, where?', 'Ever thought about getting out of Bay City for a bit?'], love: ['I\'ve been to eleven countries! I\'m saving for Japan next.', 'I would leave tomorrow if I could. I love seeing new places.'], meh: ['I\'ve never really left the city, to be honest.'], hate: ['Airports stress me out. I like it here.'] },
  money: { label: 'Hustle', icon: 'cash', you: ['I\'m building something. Making moves.', 'What do you do for money?'], love: ['I love a hustler. I\'ve got two side businesses myself.', 'Ambition is attractive. Tell me more.'], meh: ['I work, I get paid, I go home.'], hate: ['Money talk is so boring. Everyone here is obsessed.'] },
  art: { label: 'Art', icon: 'edit', you: ['There\'s some sick murals down by the docks.', 'You seem creative. Do you make stuff?'], love: ['I paint! Mostly at night. Nobody ever asks.', 'Those murals are my favourite thing in the city.'], meh: ['I can\'t draw a stick man, ha.'], hate: ['I don\'t really get art.'] },
  nightlife: { label: 'Going out', icon: 'drink', you: ['You go out much? Club Neon gets wild.', 'What\'s your go-to spot on a Friday?'], love: ['I live for a night out. Dancing till 4am.', 'Club Neon! I\'m there every weekend.'], meh: ['I go out sometimes. I\'m more of a sofa person.'], hate: ['Clubs? No. Too loud, too sweaty.'] },
};
const JOBS_SAID = ['I work at a nail salon on the south side.', 'I\'m a nurse at Bay General. Long shifts.', 'I\'m studying at the college. Business.', 'I do hair. Got my own chair now.', 'Barista. For now.', 'I work in an office in the tower. It\'s fine.', 'I\'m a lifeguard, believe it or not.', 'I\'m between jobs right now. Don\'t judge.'];
const SOCIAL = {
  chat: {
    small: { label: 'Small talk', you: ['Busy day?', 'Nice out today, isn\'t it?', 'You from round here?'], say: ['Yeah, not bad. You?', 'Born and raised. You?', 'It\'s alright. Better now there\'s someone to talk to.'] },
    ask: { label: 'Ask about her', you: ['So what\'s your story?', 'What do you do?', 'Tell me something about you.'] },
    topic: { label: 'Talk about…' },
    joke: { label: 'Make her laugh', you: ['I tried to get fit once. The gym sent me a get well soon card.', 'I\'m not saying I\'m lost, I\'m just giving the city a full tour.', 'My car\'s so slow, the parking ticket caught up with me.'] },
  },
  flirt: {
    compliment: { label: 'Compliment', you: ['You have a seriously nice smile.', 'Your eyes are kind of distracting, you know that?', 'You\'re really pretty. Had to say it.'], risk: 0.1, gain: 12 },
    style: { label: 'Love your style', you: ['I like your style. You put that together yourself?', 'That outfit is working, for real.'], risk: 0.08, gain: 10 },
    cheesy: { label: 'Cheesy line', you: ['Are you a parking ticket? Because you\'ve got FINE written all over you.', 'Is your name Wi-Fi? Because I\'m feeling a connection.', 'Do you have a map? I keep getting lost in your eyes.'], risk: 0.3, gain: 16 },
    bold: { label: 'Bold move', you: ['I\'ll be honest, I came over because you\'re the best-looking person in Bay City.', 'Let\'s skip the small talk. Drink with me tonight.', 'You and me. Sunset. Think about it.'], risk: 0.45, gain: 26 },
    beach: { label: 'Beach flirt', you: ['That swimsuit should come with a warning sign.', 'Need someone to do your sunscreen? Purely professional.'], risk: 0.35, gain: 22, beach: true },
  },
  cheeky: {
    tease: { label: 'Tease her', you: ['You walk like you\'re late for something you don\'t want to go to.', 'Let me guess. You\'re trouble.', 'You laugh at your own jokes, don\'t you? I can tell.'] },
    brag: { label: 'Show off', you: ['I\'ll be honest, I\'m kind of a big deal round here.', 'You should see my ride.', 'Stick with me. I know everybody in this city.'] },
    dare: { label: 'Dare her', you: ['Bet you won\'t give me your number.', 'I dare you to come for one drink.'] },
    man: { label: '"He\'s not here though"', you: ['Your man\'s not here though, is he?', 'Does he make you laugh like this?'], taken: true },
  },
  deep: {
    share: { label: 'Open up', you: ['Honestly? I came to this city with nothing. Still figuring it out.', 'Some days I don\'t know what I\'m doing. Today\'s a good one though.', 'I\'m trying to be better than I was. That\'s the truth.'] },
    dream: { label: 'Ask about dreams', you: ['If money didn\'t matter, what would you be doing?', 'What do you actually want out of life?'], say: ['Honestly? Open my own place. Something that\'s mine.', 'Get out of this city, see the world, then come back and buy a house in the hills.', 'Have a family one day. And be good at it.', 'Make art people actually see.'] },
    honest: { label: 'Be honest', you: ['I\'m not good at this. I just wanted to meet you.', 'No line. I just thought you seemed cool.'] },
    respect: { label: 'Respect it', you: ['Fair enough. He\'s a lucky guy.', 'All good, I respect that. You still seem cool though.'], taken: true },
  },
};
const MOODS = { chat: ['chat', 'Chat'], flirt: ['heart', 'Flirt'], cheeky: ['bolt', 'Cheeky'], deep: ['brain', 'Deep talk'] };
const NO_FLIRT = ['Wow. Does that ever work?', 'Ew. No.', 'Not even a little bit.', 'Try that on someone else.', 'We literally just met.'];
const YES_FLIRT = ['Haha, okay, smooth. Go on...', 'Stop it! ...No, actually, keep going.', 'Well, aren\'t you confident. I like that.', 'You\'re kind of cute, you know.', '*laughs* That actually worked a little.'];
const AGAIN = ['You already said that.', 'Is that your only move?', 'Okay, new material please.', 'Heard it. Got anything else?'];

function socialInit(p, bg) {
  if (p.soc) return p.soc;
  const keys = Object.keys(TOPICS).sort(() => Math.random() - 0.5), fem = lookIsFem(p.look);
  const r = personOf(p) || { rap: Math.floor(rand(0, 8)), love: keys.slice(0, 2), hate: keys[2], known: [], taken: fem && Math.random() < 0.3, saidTaken: false, respected: false, job: pick(JOBS_SAID), att: 'normal', fem };
  p.interest ??= r.int ?? Math.floor(rand(0, 12)) + (bg === 'beach' ? 8 : 0) + (night > 0.5 ? 6 : 0) + styleBonus(bg === 'beach' ? 'beach' : night > 0.5 ? 'night' : 'day');
  if (p.interest > 14 && !p.styleSeen && styleBonus('day') >= 4) { p.styleSeen = true; setTimeout(() => ambient('talk', (p.name || '').split(' ')[0] || 'Them', pick(['"Love the outfit."', '"Okay, someone dressed up today."', '"Nice. Very nice."'])), 800); }
  r.used = {}; r.turns = 0; r.patience = Math.floor(rand(5, 9)) + (r.met ? 2 : 0); r.met = true;
  return p.soc = r;
}
function vibe(p) {
  const s = p.soc || p.person; if (!s) return '';
  const r = s.rap, a = p.interest ?? 0;
  const rw = opWord(r);
  const aw = !s.fem ? '' : a < 15 ? '' : a < 35 ? ' · curious' : a < 60 ? ' · into you' : ' · really into you';
  return `${rw}${aw}${s.taken && s.saidTaken ? ' · has a man' : ''}`;
}
function socTag(p) { const s = p.soc; s.rap = clamp(s.rap, -100, 100); if (p.person) { p.person.int = p.interest; p.person.seen = dayN; } $('talkTag').textContent = vibe(p); }
// The more she likes you as a person, the better everything lands.
function socChance(p, base) {
  const s = p.soc, b = body();
  const ink = (charCfg.tattoos || []).filter(t => t.spot === 'face' || t.spot === 'neck').length, att = p.soc?.att; // face & neck ink: street types love it, straight-laced ones don't
  return base + ink * (att === 'edgy' ? 0.05 : att === 'straight' ? -0.07 : 0) - ((stats.hygiene ?? 80) < 25 ? 0.15 : 0) + (lvl('charm') - 1) * 0.04 + (stats.mood - 50) / 400 + s.rap * 0.006 + p.interest * 0.002 + (b.muscle || 0) * 0.0008 - (b.fat || 0) * 0.0008;
}
function reused(p, k) { const n = p.soc.used[k] || 0; p.soc.used[k] = n + 1; return n; }

async function socialTalk(p, bg) {
  const s = socialInit(p, bg); socTag(p);
  for (;;) {
    if (s.turns > s.patience + s.rap / 8 + (s.fem ? p.interest / 12 : 0)) { await talk.say(pick(['Anyway, I really have to go.', 'Okay, I gotta run. Nice talking to you.', 'I\'m gonna be late. See you around.'])); return 'done'; }
    const opts = Object.entries(MOODS).filter(([k]) => k !== 'flirt' || s.fem).map(([k, [ic, l]]) => ({ label: I(ic, l), k }));
    if (s.fem && !p.gotNumber && ((p.interest >= 35 && s.rap >= 20 && (!s.taken || p.interest >= 70)) || (s.respected && s.rap >= 45))) opts.push({ label: I('phone', s.respected && p.interest < 70 ? 'Swap numbers <small>(as friends)</small>' : 'Can I get your number?'), k: 'number' });
    if (s.fem && p.interest >= 60 && s.rap >= 30 && (!s.taken || p.interest >= 85)) opts.push({ label: I('star', 'Want to get out of here?'), k: 'date' });
    opts.push({ label: I('x', 'Back'), k: 'back' });
    const mood = opts[await talk.choose(opts)].k;
    if (mood === 'back') return;
    if (mood === 'number') { p.gotNumber = true; addDateContact(p); await talk.say(s.respected && p.interest < 70 ? 'Sure, friends. Here.' : pick(['Sure. Don\'t be weird with it.', 'Here. Text me sometime.', 'Okay... but you better actually call.'])); gainXP('charm', 15); continue; }
    if (mood === 'date') {
      if (date) { await talk.say("Aren't you already with someone right now? Wow."); p.interest -= 30; socTag(p); continue; }
      await talk.say(pick(['Ha. Okay, yeah. Let\'s go.', 'I thought you\'d never ask.', 'Sure, why not. Lead the way.'])); startDate(p); return 'date';
    }
    const menu = SOCIAL[mood];
    const sub = Object.entries(menu).filter(([, o]) => (!o.beach || bg === 'beach') && (!o.taken || (s.taken && s.saidTaken && !(mood === 'deep' && s.respected)))).map(([k, o]) => ({ label: I(MOODS[mood][0], o.label.replace('her', s.fem ? 'her' : 'them')), k }));
    sub.push({ label: I('x', 'Back'), k: 'back' });
    const k = sub[await talk.choose(sub)].k;
    if (k === 'back') continue;
    s.turns++;
    const r = await socialMove(p, mood, k, bg);
    socTag(p);
    if (r) return r;
  }
}

async function socialMove(p, mood, k, bg) {
  const s = p.soc, o = SOCIAL[mood][k], fem = s.fem, n = reused(p, mood + k);
  const ok = () => { gainXP('charm', 4); feed({ mood: 1 }); };
  if (k === 'topic') {
    const tk = Object.keys(TOPICS), opts = tk.map(t => ({ label: I(TOPICS[t].icon, TOPICS[t].label + (s.known.includes(t) ? ' <small>♥</small>' : '')), t }));
    opts.push({ label: I('x', 'Back'), t: null });
    const t = opts[await talk.choose(opts)].t; if (!t) { s.turns--; return; }
    const T = TOPICS[t], tn = reused(p, 'topic:' + t);
    await talk.say(pick(T.you), 'you');
    if (tn > 0) { await talk.say(pick(['We kind of covered that.', 'Yeah, you said.'])); s.rap += 1; return; }
    if (s.love.includes(t)) { s.rap += 14; p.interest += fem ? 4 : 0; if (!s.known.includes(t)) s.known.push(t); hearts(P.x, P.z, 4); await talk.say(pick(T.love)); gainXP('charm', 10); ok(); }
    else if (s.hate === t) { s.rap -= 7; await talk.say(pick(T.hate)); }
    else { s.rap += 4; await talk.say(pick(T.meh)); ok(); }
    return;
  }
  await talk.say(pick(o.you), 'you');
  if (mood === 'chat') {
    if (k === 'small') { s.rap += Math.max(0, 4 - n * 2); await talk.say(n > 1 ? pick(['...Yeah. You said.', 'Mm-hm.']) : pick(o.say)); if (n < 2) ok(); return; }
    if (k === 'ask') {
      const hid = s.love.find(t => !s.known.includes(t));
      s.rap += n < 2 ? 6 : 1;
      if (n === 0) await talk.say(s.job);
      if (hid) { s.known.push(hid); await talk.say(`I'm really into ${TOPICS[hid].label.toLowerCase()}. ${pick(['Like, a lot.', 'Ask me about it sometime.', 'That\'s my thing.'])}`); }
      else await talk.say(pick(['That\'s about it really. What about you?', 'You\'re nosy, you know that? ...I don\'t mind.']));
      if (n === 0 && s.taken && fem && Math.random() < 0.5) { s.saidTaken = true; await talk.say('Oh, and I live with my boyfriend. Just so you know.'); }
      ok(); return;
    }
    if (k === 'joke') {
      if (n > 1) { await talk.say(pick(AGAIN)); s.rap -= 2; return; }
      if (Math.random() < socChance(p, 0.4)) { s.rap += 8; p.interest += fem ? 5 : 0; await talk.say(pick(['*laughs* Okay, that was actually funny.', 'Haha! Stop.', 'You\'re an idiot. *laughing*'])); gainXP('charm', 8); ok(); }
      else { s.rap -= 2; await talk.say(pick(['...Was that a joke?', 'Tough crowd, huh. Me. I\'m the tough crowd.', 'Hmm. No.'])); }
      return;
    }
  }
  if (mood === 'flirt') {
    if (s.taken && !s.saidTaken) { s.saidTaken = true; await talk.say(pick(['I have a boyfriend, actually.', 'Sorry, I\'ve got a man.', 'Flattered. But I\'m with someone.'])); s.rap += 1; return; }
    if (n > 0 && Math.random() < 0.3 + n * 0.25) { p.interest -= 3; await talk.say(pick(AGAIN)); return; }
    const chance = socChance(p, 0.36) - o.risk * 0.5 - n * 0.12 - (s.taken ? 0.25 : 0) + (o.beach ? 0.08 : 0);
    if (Math.random() < chance) { p.interest += Math.round(o.gain * (0.6 + Math.min(80, s.rap) / 100)) + lvl('charm'); gainXP('charm', Math.round(o.gain / 3)); feed({ mood: 3 }); hearts(P.x, P.z, 3); await talk.say(o.beach ? pick(['Mmm, maybe I do need help with the sunscreen...', '*bites lip* You\'re trouble, aren\'t you?']) : pick(YES_FLIRT)); }
    else {
      p.interest -= 6 + o.risk * 16; s.rap -= s.rap < 15 ? 4 : 1; feed({ mood: -2 });
      await talk.say(s.rap < 15 ? pick(NO_FLIRT) : pick(['Haha, slow down. I barely know you.', 'Cute. Maybe. Talk to me a bit first.', 'Easy, tiger.']));
      if (p.interest < -25) { await talk.say('Okay, I\'m done here.'); if (o.risk >= 0.35) { hurt(2); sfx.punch?.(); toast('Slapped!'); } return 'left'; }
    }
    return;
  }
  if (mood === 'cheeky') {
    if (k === 'tease') {
      const c = socChance(p, 0.2) + (s.rap >= 25 ? 0.25 : 0) - n * 0.15;
      if (Math.random() < c) { p.interest += fem ? 14 : 0; s.rap += 5; await talk.say(pick(['Excuse me?! ...okay, that was a bit funny.', 'Wow. Rude. *trying not to smile*', 'Oh, you think you\'re clever, don\'t you?'])); gainXP('charm', 10); ok(); }
      else { s.rap -= 9; p.interest -= 4; await talk.say(pick(['Who do you think you are?', 'Wow. Okay. Rude.', 'Do you talk to everyone like that?'])); }
    } else if (k === 'brag') {
      const rich = money > 5000 || !!ride, c = socChance(p, rich ? 0.35 : 0.15) - n * 0.2;
      if (Math.random() < c) { p.interest += fem ? 10 : 0; s.rap += 2; await talk.say(pick(['Oh yeah? Prove it.', 'Big talk. I kind of like it.', 'Mm. Confident.'])); ok(); }
      else { s.rap -= 5; await talk.say(pick(['Every guy in this city says that.', 'Okay, Mr Big Deal.', 'Humble, too.'])); }
    } else if (k === 'dare') {
      if (n > 0) { await talk.say(pick(AGAIN)); return; }
      const c = socChance(p, 0.1) + p.interest * 0.004 - (s.taken ? 0.2 : 0);
      if (Math.random() < c && fem) { p.interest += 12; if (!p.gotNumber) { p.gotNumber = true; addDateContact(p); await talk.say('...Fine. Give me your phone. Happy now?'); gainXP('charm', 20); } else await talk.say('You\'re lucky you\'re cute.'); }
      else { s.rap -= 4; await talk.say(pick(['Ha. You\'re right, I won\'t.', 'Nice try.', 'I don\'t do dares, sorry.'])); }
    } else if (k === 'man') {
      if (n > 0) { await talk.say('Stop.'); s.rap -= 6; p.interest -= 6; return; }
      if (p.interest >= 50 && s.rap >= 40 && Math.random() < socChance(p, 0.3)) { p.interest += 20; await talk.say(pick(['...You\'re bad. You know that?', 'He doesn\'t, actually. ...Forget I said that.', 'Don\'t look at me like that.'])); s.taken = 'wavering'; }
      else { s.rap -= 12; p.interest -= 10; await talk.say(pick(['Wow. Not cool.', 'Seriously? Bye.', 'I\'d never do that to him.'])); if (s.rap < 0) return 'left'; }
    }
    return;
  }
  if (mood === 'deep') {
    if (k === 'share') { if (s.rap < 10 && n === 0) { s.rap += 3; await talk.say('Oh. That\'s... a lot for a stranger. But okay.'); } else { s.rap += n < 2 ? 10 : 2; p.interest += fem ? 3 : 0; await talk.say(pick(['That\'s real. I respect that.', 'Wow. Most people just talk rubbish to me. Thanks for being real.', 'I get that. More than you know.'])); ok(); } }
    else if (k === 'dream') { if (s.rap < 20) { s.rap += 1; await talk.say('That\'s a bit personal, no?'); } else { s.rap += n < 1 ? 12 : 2; p.interest += fem ? 4 : 0; await talk.say(pick(o.say)); gainXP('charm', 8); ok(); } }
    else if (k === 'honest') { s.rap += n < 1 ? 6 : 0; if (fem && s.rap >= 25) { p.interest += 10; await talk.say(pick(['That\'s actually really sweet.', 'Honestly? That works better than any line.'])); } else await talk.say(pick(['Ha. Okay. Well, hi.', 'That\'s refreshing.'])); ok(); }
    else if (k === 'respect') { s.respected = true; s.rap += 18; p.interest += 4; s.patience += 3; await talk.say(pick(['Thank you. Honestly, most guys get weird about it.', 'Ha, you\'re alright, you know that?'])); gainXP('charm', 12); ok(); }
  }
}

// ================================================================ TOWNSFOLK (everyone in the city has their own opinion of you)
// A person is remembered once you talk to them or they see you do something. Opinion runs -100 (hates you) to 100 (close).
// Each has an attitude: straight-laced people hate crime, edgy ones think dealing is cool, most are somewhere in between.
// Known people keep turning up around town, and how they feel changes what they do: friends won't snitch, enemies will.
const TOWN_MAX = 420, townLooks = {};
const town = () => stats.town ||= {};
const ATTITUDE = { straight: 'Straight-laced', normal: 'Easy-going', edgy: 'Street' };
const WITNESS = {
  deal: { straight: -14, normal: -5, edgy: 8, say: { good: ['Saw you doing business earlier. Respect.', 'You\'re the guy with the good stuff, right? Cool.'], bad: ['I saw you dealing on my street. Disgusting.', 'I know what you were doing earlier. Stay away from me.'] } },
  fight: { straight: -10, normal: -6, edgy: 4, say: { good: ['Saw you scrap earlier. You can handle yourself.', 'That fight was mad, bro.'], bad: ['You\'re the one who was beating people up.', 'I saw you hit someone. What is wrong with you?'] } },
  gun: { straight: -16, normal: -12, edgy: -2, say: { good: ['You were the one shooting? Crazy.'], bad: ['You were shooting in the street. People live here!', 'Gun nut. Get away from me.'] } },
  rob: { straight: -18, normal: -12, edgy: -3, say: { good: ['Saw you shake someone down. Cold.'], bad: ['You rob people. I saw you.', 'Thief. I saw everything.'] } },
  jack: { straight: -12, normal: -8, edgy: 3, say: { good: ['Saw you take that car. Smooth.'], bad: ['You stole that guy\'s car! I saw you!'] } },
  runover: { straight: -18, normal: -14, edgy: -6, say: { good: [], bad: ['You ran someone over and drove off.', 'Maniac driver. I saw you.'] } },
  kind: { straight: 7, normal: 5, edgy: 2, say: { good: ['Saw you help that guy out. That was decent of you.', 'You gave that man money. Not many people do that.'], bad: [] } },
};
function opWord(v) { return v <= -60 ? 'Hates you' : v <= -25 ? 'Dislikes you' : v < 0 ? 'Wary' : v < 12 ? 'Neutral' : v < 30 ? 'Polite' : v < 55 ? 'Friendly' : v < 80 ? 'Warm' : 'Close'; }
const canKnow = p => p && ['city', 'beach', 'loose'].includes(p.kind) && p.look && !p.look.homeless;
function personOf(p) {
  if (p.person) return p.person;
  if (!canKnow(p)) return null;
  const T = town(), keys = Object.keys(TOPICS).sort(() => Math.random() - 0.5), fem = !!p.look.fem;
  stats.townSeq = (stats.townSeq || 0) + 1;
  const r = { id: 't' + stats.townSeq, name: p.name, fem, beach: !!p.look.beach, cfg: p.look.cfg, rap: Math.floor(rand(0, 8)), int: null, att: pick(['straight', 'straight', 'normal', 'normal', 'normal', 'edgy', 'edgy']), love: keys.slice(0, 2), hate: keys[2], known: [], taken: fem && Math.random() < 0.3, saidTaken: false, respected: false, job: pick(JOBS_SAID), met: false, seen: dayN, wit: null };
  T[r.id] = r; townLooks[r.id] = { ...p.look, person: r }; p.person = r;
  const all = Object.values(T);
  if (all.length > TOWN_MAX) { all.sort((a, b) => (Math.abs(a.rap) + (a.met ? 30 : 0) + a.seen) - (Math.abs(b.rap) + (b.met ? 30 : 0) + b.seen)); for (const x of all.slice(0, all.length - TOWN_MAX)) { delete T[x.id]; delete townLooks[x.id]; } }
  return r;
}
// nobody in the city shares a name with your partner, kids or the people in your phone (full names, and first names of family)
let reservedCache = null, reservedKey = '';
function reservedNames() {
  const f = fam(), key = (f.partner?.name || '') + '|' + Object.keys(stats.dates || {}).length + '|' + (f.kids?.length || 0) + '|' + (date?.name || '');
  if (reservedCache && key === reservedKey) return reservedCache;
  const R = new Set(); reservedKey = key;
  if (f.partner) { R.add(f.partner.name); R.add(f.partner.name.split(' ')[0]); }
  for (const k of f.kids || []) { R.add(k.name); R.add(k.name.split(' ')[0]); }
  for (const d of Object.values(stats.dates || {})) if (d.name) R.add(d.name);
  if (date) R.add(date.name);
  reservedCache = R; return R;
}
setReservedNames(reservedNames);
// people you know keep crossing your path
// ---------------- the 1,000 citizens (js/citizens.js): the person walking past is someone who lives here, where their routine puts them right now
const CIT = () => citizens(PLACES, CITIES);
const JOB_CLOTHES = { officer: c => Object.assign(c, { top: 'long', topColor: '#1f2a4a', pants: 'jeans', pantsColor: '#1f2a4a', hat: 'cap', hatColor: '#1f2a4a', shoes: 'boots', shoeColor: '#16161b' }),
  nurse: c => Object.assign(c, { top: 'tshirt', topColor: '#3fb0a8', pants: 'jeans', pantsColor: '#3fb0a8', hat: 'none' }), doctor: c => Object.assign(c, { top: 'long', topColor: '#f4f6f8', hat: 'none' }),
  priest: c => Object.assign(c, { top: 'suit', topColor: '#16161b', pants: 'jeans', pantsColor: '#16161b', hat: 'none' }), lawyer: c => Object.assign(c, { top: 'suit', neck: 'tie' }), analyst: c => Object.assign(c, { top: 'suit' }),
  builder: c => Object.assign(c, { top: 'tshirt', topColor: '#ff8a2a', hat: 'helmet', hatColor: '#ffd23f', pants: 'cargo', shoes: 'boots' }), dockhand: c => Object.assign(c, { top: 'puffer', hat: 'beanie', pants: 'cargo', shoes: 'boots' }),
  courier: c => Object.assign(c, { top: 'tracksuit', back: 'backpack', hat: 'none' }), trainer: c => Object.assign(c, { top: 'tank', pants: 'joggers', shoes: 'sneakers', muscle: 0.7 }), bouncer: c => Object.assign(c, { top: 'leather', topColor: '#16161b', muscle: 0.9, hat: 'none' }),
  farmer: c => Object.assign(c, { top: 'long', topColor: '#7a2a2a', pants: 'jeans', hat: 'cowboy', shoes: 'boots' }), retired: c => Object.assign(c, { hairColor: '#d8d8d8', top: Math.random() < 0.5 ? 'long' : 'trench' }), influencer: c => Object.assign(c, { neck: 'chain', eyewear: 'shades' }) };
function citizenRecord(c) {
  const T = town(), id = 'c' + c.cid; if (T[id]) return T[id];
  const keys = Object.keys(TOPICS), h = c.seed;
  return T[id] = { id, cid: c.cid, name: c.name, fem: c.fem, beach: false, cfg: null, rap: 0, int: null, att: c.att, love: [keys[h % keys.length], keys[(h >> 3) % keys.length]], hate: keys[(h >> 6) % keys.length], known: [], taken: c.rel.some(q => q.k === 'partner'), saidTaken: false, respected: false, job: c.says, met: false, seen: dayN, wit: null, story: !!c.story };
}
function citizenLook(c, beach) {
  const r = citizenRecord(c); if (townLooks[r.id] && !!townLooks[r.id].beach === !!beach) return townLooks[r.id];
  const look = seededLook(c.seed, c.fem, beach, cityAt(c.home.x, c.home.z, 20)?.style === 'downtown' ? 'downtown' : 'mid', beach ? null : cfg => { JOB_CLOTHES[c.job]?.(cfg); if (c.age === 'older' && Math.random() < 0.7) cfg.hairColor = pick(['#9a9a9a', '#d8d8d8', '#ffffff']); });
  r.cfg = look.cfg; look.person = r;
  const keys = Object.keys(townLooks); if (keys.length > 140) for (const k of keys.slice(0, 20)) if (!peds.list.some(p => p.person?.id === k)) delete townLooks[k];
  return townLooks[r.id] = look;
}
function citizenNear(beach) {
  const R = reservedNames(), list = CIT(), out = [], hr = clockH, day = dayN;
  for (const c of list) {
    if (R.has(c.name)) continue;
    const a = whereNow(c, hr, day); if (!a) continue;
    if (beach !== (a.z > sandLine(a.x) - 30)) continue;
    const d = Math.hypot(a.x - P.x, a.z - P.z); if (d > 170) continue;
    out.push(c);
  }
  for (let k = 0; k < 6 && out.length; k++) { const c = out[Math.floor(Math.random() * out.length)]; if (!peds.list.some(p => p.person?.cid === c.cid)) return c; }
  return null;
}
setTownSource(beach => {
  if (Math.random() < 0.78) { const c = citizenNear(beach); if (c) return citizenLook(c, beach); }
  if (Math.random() > 0.2) return null;
  const R = reservedNames(), pool = Object.values(town()).filter(r => r.beach === beach && (r.met || Math.abs(r.rap) >= 8) && !R.has(r.name) && !peds.list.some(p => p.person === r));
  if (!pool.length) return null;
  const r = pick(pool); r.seen = dayN;
  return townLooks[r.id] ||= { ...bakeCfg(r.cfg), beach: r.beach, fem: r.fem, person: r };
});
const REACT_TEX = {};
const reacts = [];
function react(p, good) {
  const key = good ? 'g' : 'b', tex = REACT_TEX[key] ||= iconTex(good ? 'smile' : 'x', good ? 'rgba(47,191,85,.92)' : 'rgba(226,59,59,.92)', '#fff');
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true })); sp.scale.set(1.3, 1.3, 1);
  sp.position.set(p.x, (p.h || 1.8) + 0.9, p.z); dyn.add(sp); reacts.push({ sp, t: 1.6, p });
}
function updateReacts(dt) { for (let i = reacts.length - 1; i >= 0; i--) { const r = reacts[i]; r.t -= dt; r.sp.position.set(r.p.x, (r.p.h || 1.8) + 0.9 + (1.6 - r.t) * 0.5, r.p.z); r.sp.material.opacity = Math.min(1, r.t * 2); if (r.t <= 0) { dyn.remove(r.sp); r.sp.material.dispose(); reacts.splice(i, 1); } } }
function bumpPerson(r, d) { r.rap = clamp(r.rap + d, -100, 100); r.seen = dayN; }
// everyone nearby with a clear view of what you just did forms an opinion
const FAVOUR_WHERE = [[/anchor bar|\bbar\b|pub/i, 'bar'], [/diner|coffee/i, 'diner'], [/casino/i, 'casino'], [/police|station/i, 'police'], [/chapel|church/i, 'church'], [/mall|clothes shop|market/i, 'mall'], [/laundrette/i, 'laundry'], [/\bgym\b/i, 'gym'], [/hospital/i, 'hospital'], [/college|library/i, 'college'], [/\bclub\b/i, 'club'], [/quickmart|groceries|ice\b|spices/i, 'mart'], [/bay motors|car for|fast car|part from/i, 'motors'], [/office tower|bay corp/i, 'office'], [/burger/i, 'burgershop'], [/barber|cut\b/i, 'barber'], [/tattoo|ink/i, 'tattoo'], [/\bpit\b/i, 'pit'], [/bay customs|garage|serviced/i, 'mods']];
function favourPlace(ask) {
  if (/\bpier\b|bait shop/i.test(ask)) return 'pier';
  for (const [re, int] of FAVOUR_WHERE) if (re.test(ask)) { const ps = PLACES.filter(p => p.interior === int); if (ps.length) { let b = ps[0], bd = 1e9; for (const p of ps) { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; b = p; } } return b.id; } }
  return 'random';
}
ARRIVE.favour = (a, d) => {
  const c = CIT()[d.cid], r = citizenRecord(c), F = stats.favours ||= {}; F[c.cid] = d.step + 1; (stats.favourDay ||= {})[c.cid] = dayN;
  const pay = Math.round(c.story.reward * (d.step + 1) / 3 / 10) * 10; a.give(pay); bumpPerson(r, 15 + d.step * 10); r.met = true; a.karma(2);
  stats.rel['cit:' + c.cid] = Math.max(stats.rel['cit:' + c.cid] || 0, 20 + d.step * 25); relNames['cit:' + c.cid] = c.name;
  logStory(c.name, `Did ${c.first} a favour (${d.step + 1} of 3)`, `${a.fmt(pay)} and a friend for it.`, 'favour');
  return d.step >= 2 ? `Done. ${c.first} texts: "I\'ll never forget this. You\'re family now." (${a.fmt(pay)}) ${c.first} is in your contacts.` : `Done. ${c.first} texts you ${a.fmt(pay)}: "Thank you!! Come find me, there\'s more if you\'re up for it."`;
};
// word gets round: the people a citizen knows hear what you did (half as strongly) and bring it up when you meet them
function gossip(r, dv, kind) {
  if (r?.cid == null || Math.abs(dv) < 4) return; const c = CIT()[r.cid]; if (!c) return;
  for (const q of c.rel) { const o = citizenRecord(CIT()[q.cid]); bumpPerson(o, Math.round(dv / 2)); o.gossip = { from: c.first, k: kind, good: dv > 0, rel: q.k, d: dayN }; }
}
function witness(kind, x = P.x, z = P.z, victim = null) {
  if (inside) return;
  const W = WITNESS[kind], now = time;
  if (victim && canKnow(victim) && now - (victim.vicT || -99) > 10) { victim.vicT = now; const r = personOf(victim); bumpPerson(r, kind === 'kind' ? 12 : -35); r.wit = { k: kind, victim: true, d: dayN }; gossip(r, kind === 'kind' ? 12 : -35, kind); react(victim, kind === 'kind'); }
  let shown = 0;
  for (const p of peds.list) {
    if (p === victim || !canKnow(p) || p.state === 'down') continue;
    const d = Math.hypot(p.x - x, p.z - z); if (d > 24 || d < 0.5) continue;
    p.witT ||= {}; if (now - (p.witT[kind] || -99) < 10) continue; p.witT[kind] = now;
    if (d > 6 && !losClear(p.x, p.z, x, z)) continue;
    const r = personOf(p), dv = W[r.att];
    bumpPerson(r, dv); if (W.say[dv > 0 ? 'good' : 'bad'].length) r.wit = { k: kind, d: dayN }; gossip(r, dv, kind);
    if (shown++ < 5 && Math.abs(dv) >= 3) react(p, dv > 0);
  }
}

function townHtml() {
  const ppl = Object.values(stats.town || {}).filter(r => r.met || Math.abs(r.rap) >= 8).sort((a, b) => Math.abs(b.rap) - Math.abs(a.rap)).slice(0, 40);
  if (!ppl.length) return '';
  return `<div class="ph-sec">People around town</div><p class="ph-hint">What locals think of you. They remember what they see you do.</p>` + ppl.map(r => `<div class="ph-row col"><span><b>${r.name}</b> <small>${opWord(r.rap)}${r.met ? ' · ' + ATTITUDE[r.att] : ' · seen you around'}</small></span>${bar(Math.abs(r.rap), r.rap < 0 ? '#e23b3b' : '#2fbf55')}</div>`).join('');
}
function addDateContact(p, noNum) { stats.dates ||= {}; const id = 'date:' + p.name; const was = stats.dates[id]; stats.dates[id] = { ...(was || {}), name: p.name, cfg: p.look.cfg }; if (noNum && !p.gotNumber && (!was || was.noNum)) stats.dates[id].noNum = true; else delete stats.dates[id].noNum; prefsOf(id, p.soc || p.person); stats.rel[id] = Math.max(stats.rel[id] || 0, 20); relNames[id] = p.name; saveGame(); }
// ================================================================ DATES (she follows you, gets in your car, has her own tastes)
// Everyone you date keeps the personality they had as a stranger: two things they love, one they hate.
// Get to know them (ask, listen), then take them places they'll love. In the car you sit side by side and chat.
const DATE_SPOTS = [
  { id: 'club', interior: 'club', name: 'the club', loves: ['nightlife', 'music'] },
  { id: 'bar', interior: 'bar', name: 'the bar', loves: ['nightlife'] },
  { id: 'diner', interior: 'diner', name: 'the diner', loves: ['food'] },
  { id: 'gym', interior: 'gym', name: 'the gym', loves: ['fitness'] },
  { id: 'casino', interior: 'casino', name: 'the casino', loves: ['money'] },
  { id: 'motors', interior: 'motors', name: 'the car showroom', loves: ['cars'] },
  { id: 'clothes', interior: 'clothes', name: 'shopping', loves: ['art', 'money'] },
  { id: 'beach', beach: true, name: 'the beach', loves: ['travel', 'fitness'] },
];
const LOVE_STATION = { music: 1, nightlife: 3, art: 2, travel: 0, fitness: 3, cars: 2, food: 0, money: 1 };
function seatsFor(v) { const b = v.cfg?.body; if (v.b.two) return v.b.two === 'moto' ? 2 : 1; return { coupe: 2, sports: 2, hyper: 2, convertible: 2, buggy: 2, tractor: 1, boxtruck: 3, pickup: 3, van: 6, limo: 8, compact: 2, gt: 2, minivan: 7 }[b] || 4; }
function prefsOf(id, src) {
  stats.dates ||= {}; const d = stats.dates[id] ||= {};
  if (!d.prefs) { const keys = Object.keys(TOPICS).sort(() => Math.random() - 0.5); d.prefs = src && src.love ? { love: [...src.love], hate: src.hate, known: [...(src.known || [])], att: src.att || 'normal' } : { love: keys.slice(0, 2), hate: keys[2], known: [], att: pick(['straight', 'normal', 'normal', 'edgy']) }; }
  return d.prefs;
}
function startDate(p) {
  peds.release(p); const i = peds.list.indexOf(p); if (i >= 0) peds.list.splice(i, 1); dyn.remove(p.root);
  if (p.dog) p.dog.owner = null;
  const bl = bellyFor('date:' + p.name); let look = p.look; if (bl) look = { ...bakeCfg({ ...look.cfg, belly: bl }), fem: true };
  const fig = figure(look); dyn.add(fig.root);
  date = { name: p.name, look, cfg: look.cfg, fig, x: p.x, z: p.z, face: p.face, phase: 0, interest: p.interest, since: gameHours(), id: 'date:' + p.name, used: {}, been: {} };
  addDateContact(p, true); bumpRel(date.id, 10, false); date.prefs = prefsOf(date.id, p.soc || p.person);
  $('loveBtn').classList.remove('hidden');
  toast(`${p.name} is hanging out with you. Tap the heart for things to do together.`, 4);
}
function endDate(msg) {
  if (!date) return; const d = date; date = null; $('loveBtn').classList.add('hidden');
  if (d.inCar && ride) { d.fig.root.visible = true; const ds = doorSpot(ride, -DRIVER); d.fig.root.position.set(ds.x, baseY(ds.x, ds.z), ds.z); }
  if (msg) toast(msg, 3);
  const leave = { fig: d.fig, t: 0, fx: Math.sin(d.face + 2.5), fz: Math.cos(d.face + 2.5) };
  if (inside && !d.inCar) { leave.tx = ORIGIN.x; leave.tz = ORIGIN.z + inside.h.d / 2 + 0.8; leave.fig.root.position.set(d.x, 0, d.z); } // walks out of the front door
  leaving.push(leave);
}
const leaving = [];
function placeDateNear(x, z) { if (!date) return; date.x = x + 0.9; date.z = z + 0.6; date.fig.root.visible = true; date.inCar = false; }
function dateWalk(tx, tz, dt, fast = 7.5) {
  const dx = tx - date.x, dz = tz - date.z, d = Math.hypot(dx, dz); let mv = 0;
  if (d > 25) { date.x = tx; date.z = tz; }
  else if (d > 0.3) { const sp = Math.min(d * 2.5, fast); date.x += dx / d * sp * dt; date.z += dz / d * sp * dt; date.face = Math.atan2(dx, dz); mv = sp; if (!inside) { resolve(date, 0.35, 0); pushOutOfCars(date, date.boardCar); } }
  return { d, mv };
}
// people walk round cars, not through them (slide along the side until clear)
function pushOutOfCars(o, except) {
  for (const v of vehicles) {
    if (v === except || (v.s.x - o.x) ** 2 + (v.s.z - o.z) ** 2 > 49) continue;
    const B = carBox(v, o.x, o.z), hw = B.hw + 0.3, hl = B.hl + 0.25;
    if (Math.abs(B.lx) >= hw || Math.abs(B.lz) >= hl) continue;
    const px = hw - Math.abs(B.lx), pz = hl - Math.abs(B.lz);
    if (px < pz) { const k = Math.sign(B.lx || 1) * px; o.x += B.rx * k; o.z += B.rz * k; } else { const k = Math.sign(B.lz || 1) * pz; o.x += B.fx * k; o.z += B.fz * k; }
  }
}
function dateLimbs(mv) {
  date.phase += 0.016 * mv * 2.6;
  const sw = Math.min(1, mv / 1.5) * (mv > 3 ? 0.9 : 0.55), l = date.fig.limbs;
  l[0].rotation.x = -Math.sin(date.phase) * sw; l[1].rotation.x = Math.sin(date.phase) * sw; l[2].rotation.set(Math.sin(date.phase) * sw * 0.8, 0, 0); l[3].rotation.set(-Math.sin(date.phase) * sw * 0.8, 0, 0);
  date.fig.inner.position.y = 0;
}
function updateDate(dt) {
  for (let i = leaving.length - 1; i >= 0; i--) { const l = leaving[i]; l.t += dt;
    if (l.tx != null) { const q = l.fig.root.position, dx = l.tx - q.x, dz = l.tz - q.z, dd = Math.hypot(dx, dz); if (dd < 0.4 || !inside) { dyn.remove(l.fig.root); leaving.splice(i, 1); continue; } l.fx = dx / dd; l.fz = dz / dd; const o = { x: q.x + l.fx * 1.5 * dt, z: q.z + l.fz * 1.5 * dt }; q.x = o.x; q.z = o.z; }
    else { l.fig.root.position.x += l.fx * 1.6 * dt; l.fig.root.position.z += l.fz * 1.6 * dt; }
    l.fig.root.rotation.y = Math.atan2(l.fx, l.fz); const ph = l.t * 9; l.fig.limbs[0].rotation.x = -Math.sin(ph) * 0.5; l.fig.limbs[1].rotation.x = Math.sin(ph) * 0.5; if (l.t > 6) { dyn.remove(l.fig.root); leaving.splice(i, 1); } }
  dateCalls(dt);
  if (!date || woo) return;
  if (gameHours() - date.since > (partner()?.id === date.id ? 16 : 7)) { endDate(partner()?.id === date.id ? `${date.name} headed home. "See you later, babe."` : `${date.name} had to head home. "Text me!"`); return; }
  const D = date;
  // dancing next to you at the club
  if (dance && D.dancing) { const b = (audioTime() - dance.tr.t0) / (dance.tr.spb16 * 4) * Math.PI, l = D.fig.limbs; D.x = P.x + 1.1; D.z = P.z + 0.3; D.face = -0.5; D.fig.inner.position.y = Math.abs(Math.sin(b)) * 0.09; l[2].rotation.set(-2.4 + Math.sin(b) * 0.5, 0, -0.3); l[3].rotation.set(-2.4 - Math.sin(b) * 0.5, 0, 0.3); l[0].rotation.x = Math.sin(b) * 0.25; l[1].rotation.x = -Math.sin(b) * 0.25; D.fig.root.position.set(D.x, P.y, D.z); D.fig.root.rotation.y = D.face; return; }
  // getting into your car: walk round to the passenger door, if there's a seat for her
  if (ride) {
    if (!D.inCar && D.fig) unseatPassenger(D.fig);
    if (D.inCar) { D.x = ride.s.x; D.z = ride.s.z; if (ride.b.seat) seatPassenger(D.fig, ride, 1); else D.fig.root.visible = false; D.escortCar = null; carDateTick(dt); return; }
    if (D.left) { if (Math.hypot(ride.s.x - D.x, ride.s.z - D.z) < 12 && Math.abs(ride.s.v) < 2) { D.left = false; toast(`${D.name}: "Finally! You came back."`, 2.4); } else { D.fig.root.visible = true; dateLimbs(0); return; } }
    if (seatsFor(ride) < 2) { if (!D.noRoom) { D.noRoom = true; toast(`${D.name}: "Erm, there's no room for me on that."`, 2.6); } dateLimbs(0); D.fig.root.position.set(D.x, baseY(D.x, D.z), D.z); return; }
    // only counts as leaving her behind if you drive away while she's on her way to the car
    if (Math.abs(ride.s.v) > 4 && Math.hypot(ride.s.x - D.x, ride.s.z - D.z) > 14) { D.left = true; D.interest -= 12; toast(`You drove off without ${D.name}! She's waiting where you left her.`, 3); return; }
    D.boardCar = ride; const ds = doorSpot(ride, -DRIVER), w = dateWalk(ds.x, ds.z, dt, 5);
    if (w.d < 0.5) { D.board = (D.board || 0) + dt; if (D.board < dt * 1.5) setDoor(ride, -DRIVER, true); if (D.board > 0.5) { D.inCar = true; D.board = 0; D.fig.root.visible = false; setDoor(ride, -DRIVER, false); } }
    dateLimbs(w.mv); D.fig.root.position.set(D.x, baseY(D.x, D.z), D.z); D.fig.root.rotation.y = D.face; return;
  }
  D.noRoom = false;
  if (carAnim && D.escortCar === carAnim.v && (carAnim.type === 'escort' || carAnim.type === 'in')) {
    if (D.inCar) { if (ride?.b.seat) seatPassenger(D.fig, ride, 1); else D.fig.root.visible = false; return; }
    if (carAnim.type === 'escort' && carAnim.stage >= 1) { // walk in through the open door
      D.boardCar = carAnim.v; const ds = doorSpot(carAnim.v, -DRIVER), w = dateWalk(ds.x, ds.z, dt, 4.5);
      if (w.d < 0.45) { D.board = (D.board || 0) + dt; if (D.board > 0.35) { D.inCar = true; D.board = 0; D.fig.root.visible = false; } }
      dateLimbs(w.mv); D.fig.root.position.set(D.x, baseY(D.x, D.z), D.z); D.fig.root.rotation.y = D.face; return;
    }
    if (carAnim.type === 'escort') { const w = dateWalk(P.x - Math.sin(P.face) * 1.0, P.z - Math.cos(P.face) * 1.0, dt, 5); dateLimbs(w.mv); D.fig.root.position.set(D.x, baseY(D.x, D.z), D.z); D.fig.root.rotation.y = D.face; return; }
  }
  if (D.inCar) { const v = vehicles.find(q => Math.hypot(q.s.x - P.x, q.s.z - P.z) < 8); const ds = v ? doorSpot(v, -DRIVER) : { x: P.x + 0.9, z: P.z + 0.6 }; D.x = ds.x; D.z = ds.z; D.inCar = false; D.fig.root.visible = true; if (v) { setTimeout(() => setDoor(v, -DRIVER, true), 500); setTimeout(() => setDoor(v, -DRIVER, false), 1300); } }
  if (D.left) { if (Math.hypot(P.x - D.x, P.z - D.z) < 14) { D.left = false; toast(`${D.name}: "Oh, NOW you remember me?"`, 2.5); } else { dateLimbs(0); D.fig.root.position.set(D.x, baseY(D.x, D.z), D.z); return; } }
  // walking with you: a step behind, or right beside you holding hands
  const side = D.holding ? 0.92 : 0.8, back = D.holding ? 0 : 1.3;
  const tx = P.x - Math.sin(P.face) * back + Math.sin(P.face + 1.57) * side, tz = P.z - Math.cos(P.face) * back + Math.cos(P.face + 1.57) * side;
  const w = dateWalk(tx, tz, dt);
  if (D.holding && w.d < 1.6) { D.x = tx; D.z = tz; } // hand in hand: she stays right beside you
  if (w.d <= 0.3) D.face += wrapA(P.face - D.face) * Math.min(1, dt * 4);
  dateLimbs(w.mv);
  if (D.holding) { // arms angled in so the two hands meet halfway between you
    D.face = P.face; const sw = Math.sin(P.phase) * 0.12;
    D.fig.limbs[3].rotation.set(-0.12 + sw, 0, -0.3); hero.armL.pivot.rotation.set(-0.12 + sw, 0, 0.3); if (hero.armL.elbow) hero.armL.elbow.rotation.set(0, 0, 0);
  }
  D.fig.root.position.set(D.x, inside ? (inside.h.floorY ? inside.h.floorY(D.x, D.z, P.y) : 0) : baseY(D.x, D.z), D.z); D.fig.root.rotation.y = D.face; D.fig.root.visible = !P.dead;
  dateSpotCheck();
  if ((stats.hygiene ?? 80) < 18 && !D.smelt && Math.random() < dt * 0.05) { D.smelt = 1; D.interest -= 10; toast(`${D.name}: "${pick(['Erm... did you shower today?', 'Babe, you kind of smell.', 'Is that... you?'])}"`, 2.6); }
}
// how you drive matters: tearing around scares her, a calm cruise is nice
function carDateTick(dt) {
  const D = date, spd = Math.abs(ride.s.v), lim = speedLimit(ride.s.x, ride.s.z), mph = spd * 2.237;
  // some love a speed demon: anyone into cars, or with a wild streak
  if ((D.prefs.love.includes('cars') || D.prefs.att === 'edgy') && lim && mph > lim + 10) { D.thrill = (D.thrill || 0) + dt; if (D.thrill > 4) { D.thrill = 0; D.interest += 5; bumpRel(D.id, 2, false); toast(`${D.name}: "${pick(['WOOO! Faster!', 'Okay this is fun!', 'You\'re crazy. I love it.'])}"`, 2.2); } return; }
  if (spd > 27) { D.scare = (D.scare || 0) + dt; if (D.scare > 3) { D.scare = 0; D.interest -= 6; toast(`${D.name}: "${pick(['Slow down!', 'Are you trying to kill us?!', 'Okay, I\'m scared now.'])}"`, 2.2); } }
  else if (spd > 3 && spd < 20) { D.cruise = (D.cruise || 0) + dt; if (D.cruise > 40) { D.cruise = 0; D.interest += 3; bumpRel(D.id, 1, false); } }
}
function dateSpotAt() { if (inside) return DATE_SPOTS.find(s => s.interior === inside.id); return zoneBg(P.x, P.z) === 'beach' ? DATE_SPOTS.find(s => s.beach) : null; }
function dateSpotCheck() {
  const D = date, s = dateSpotAt(); if (!s || D.been[s.id]) return; D.been[s.id] = 1;
  const pr = D.prefs, liked = s.loves.find(l => pr.love.includes(l)), hated = s.loves.includes(pr.hate);
  if (liked) { D.interest += 15; bumpRel(D.id, 6, false); if (!pr.known.includes(liked)) pr.known.push(liked); hearts(D.x, D.z, 10); toast(`${D.name}: "${pick(['Oh I LOVE it here!', 'How did you know? This is my favourite!', 'Okay, you get points for this.'])}"`, 3); }
  else if (hated) { D.interest -= 10; toast(`${D.name}: "${pick(['Ugh. Not really my scene.', 'Seriously? Here?', 'Can we go somewhere else?'])}"`, 3); }
  else { D.interest += 4; toast(`${D.name}: "${pick(['This is nice.', 'Cute spot.', 'Not bad.'])}"`, 2.4); }
}
// she sees you deal: depends who she is and how close you two are
function dateSeesDeal() {
  const D = date; if (!D || D.inCar && !ride) return;
  if (D.prefs.att === 'edgy' || rel(D.id) >= 60) { if (!D.sawDeal) { D.sawDeal = 1; toast(`${D.name}: "${D.prefs.att === 'edgy' ? 'Ha. Busy man. I like it.' : 'Just... be careful, okay?'}"`, 2.8); } return; }
  D.interest -= D.prefs.att === 'straight' ? 25 : 14; bumpRel(D.id, -6, false);
  if (D.interest < 15) return endDate(`${D.name}: "You're a DEALER? I'm out. Don't text me."`);
  toast(`${D.name}: "${pick(['Wait... are you selling drugs?', 'I did NOT sign up for this.', 'Is that what I think it is?'])}"`, 3);
}
// she rings you up to hang out; say yes and go and pick her up
function dateCalls(dt) {
  if (stats.dateMeet) {
    const M = stats.dateMeet, d = stats.dates?.[M.id];
    if (!d || date) { stats.dateMeet = null; }
    else if (gameHours() > M.until) { stats.dateMeet = null; bumpRel(M.id, -8, false); textMe(M.id, d.name, M.home ? pick(['I got all dressed up. Guess date night\'s off.', 'So no date night then.']) : pick(['Wow. You stood me up.', 'Guess you\'re not coming then.']), false, 'stoodup'); clearWaypoint(); }
    else if (!inside && Math.hypot(P.x - M.x, P.z - M.z) < 26 && (!ride || Math.abs(ride.s.v) < 3)) { // pull up next to her (or walk up) and she comes over
      stats.dateMeet = null; clearWaypoint();
      startDate({ name: d.name, look: { ...bakeCfg(dateOutfit(M.id) || d.cfg), fem: true }, x: M.x, z: M.z, face: 0, interest: 40 + rel(M.id) * 0.6, root: new THREE.Group() });
      toast(`${d.name}: "${pick(['There you are!', 'Hey you. Let\'s go.', 'Finally! Where are we going?'])}"`, 2.6);
    }
    return;
  }
  stats.nextDateCall ??= gameHours() + rand(4, 9);
  if (gameHours() < stats.nextDateCall || date || state !== 'play' || talk.active || stats.jail || inside || dance || woo) return;
  stats.nextDateCall = gameHours() + rand(8, 16);
  stats.lastCall ||= {};
  const ids = Object.keys(stats.dates || {}).filter(id => !stats.dates[id].noNum && rel(id) >= 35 && !(fam().partner?.id === id && fam().partner.livesIn) && stats.lastCall[id] !== dayN && (stats.lastCall[id] || 0) < dayN - 1); if (!ids.length) return; // nobody rings you two days running
  const id = pick(ids), d = stats.dates[id]; if (!d?.cfg) return;
  stats.lastCall[id] = dayN; dateCall(id, d);
}
function dateCall(id, d) { if (stats.dates?.[id]?.noNum) return; // ring first, then you're on the call
  ringing(d.name, d.cfg, id); const A = audio(); if (A) for (let i = 0; i < 4; i++) sfx.note(i % 2 ? 1180 : 940, A.currentTime + i * 0.18, 0.15, 'square', 0.03, 3000);
  setTimeout(() => { if (state === 'play' && !date) dateCall2(id, d); }, 1700);
}
async function dateCall2(id, d) {
  beginTalk(d.cfg, d.name, 'Calling you', 330, id, null, null, false, false, true);
  await talk.say(pick([`Hey you. I'm bored. Come pick me up?`, `I was just thinking about you... you free tonight?`, `Hiii. Wanna hang out? I'm already dressed.`]));
  const k = await talk.choose([I('car', 'On my way'), I('case', 'I\'m busy today, sorry'), I('x', 'Not tonight')]);
  if (k === 0) {
    const s = randomRoadSpot(70, 220); stats.dateMeet = { id, x: s.x + 3.5, z: s.z, until: gameHours() + 3 };
    await talk.say(pick(['Yay! I\'ll send you my location.', 'Don\'t keep me waiting!']));
    endTalk(); setWaypoint(s.x + 3.5, s.z, `Pick up ${d.name}`);
  } else {
    // everyone takes it differently: most are cool about it, some take it personally
    const pr = prefsOf(id); pr.temper ??= Math.random();
    if (k === 1) await talk.say('Got a lot on today. Can we do it another day?', 'you');
    if (pr.temper > 0.72) { bumpRel(id, k === 1 ? -6 : -9, false); await talk.say(pick(['You\'re ALWAYS busy. Whatever.', 'Wow. Okay. Don\'t bother calling me then.', 'Fine. I guess I\'m not a priority.'])); }
    else if (pr.temper > 0.4) { bumpRel(id, -2, false); await talk.say(pick(['Oh. Okay. Another time then.', 'Hmm. Alright, tomorrow maybe.'])); }
    else { await talk.say(pick(['No worries! Go get your bag. Call me later.', 'All good, babe. Tomorrow then?', 'Totally get it. Don\'t work too hard!'])); }
    endTalk();
  }
}
async function talkDate() {
  if (!date || woo || state !== 'play') return;
  const D = date, inCar = !!(ride && D.inCar), pr = D.prefs;
  beginTalk(D.cfg, D.name, `${relName(rel(D.id))} · on a date`, 330, D.id, null, null, false, false, false, inCar ? { color: ride.cfg?.bodyColor || '#30323a', trim: ride.cfg?.accentColor } : false);
  await talk.say(pick(D.interest > 80 ? ['I like being around you.', 'So... what now?', 'You\'re fun, you know that?'] : inCar ? ['Where are we going?', 'Nice car.', 'So, where are you taking me?'] : ['Where are we going?', 'This is nice.', 'So, tell me something about you.']));
  const ok = (k, need) => { const n = D.used[k] = (D.used[k] || 0) + 1; return D.interest >= need - lvl('charm') * 2 || Math.random() < 0.25 / n; };
  for (;;) {
    const bed = inside?.prop ? inside.h.furn.find(f => FURN[f.t].act === 'sleep') : null, parked = ride && Math.abs(ride.s.v) < 1;
    const atBar = inside && ['bar', 'club', 'diner'].includes(inside.id), atClub = inside?.id === 'club';
    const top = [{ label: I('heart', 'Get close'), k: 'sweet' }, { label: I('chat', 'Talk'), k: 'talk' }, { label: I('map', 'Where to?'), k: 'go' }];
    if (inCar) top.push({ label: I('radio', 'Put her music on'), k: 'music' });
    if (atBar) top.push({ label: I('drink', `Buy her a drink <small>$18</small>`), k: 'drink' });
    if (atClub && !dance) top.push({ label: I('music', 'Dance with me'), k: 'dance' });
    if (inside?.id === 'clothes') top.push({ label: I('shirt', 'Buy her an outfit'), k: 'shop' });
    if (!partner() && rel(D.id) >= 45) top.push({ label: I('heart', 'Be my girlfriend?'), k: 'official' });
    if (bed || parked) top.push({ label: I('heart', bed ? 'WooHoo (bed)' : 'WooHoo (in the car)'), k: 'woo' });
    else { const live = partner()?.id === D.id && fam().partner?.livesIn, h = famHome() || nearestHome(); if (h && !(inside?.prop && inside.prop.id === h.id)) top.push({ label: I('house', live ? 'Wanna chill at home?' : 'Come back to my place?'), k: 'home', h, live }); }
    if (stats.gifts?.length) top.push({ label: I('heart', 'Give her a gift'), k: 'gift' });
    top.push({ label: I('check', 'That\'s all'), k: 'done' }, { label: I('x', 'Call it a night'), k: 'bye' });
    const o = top[await talk.choose(top)];
    if (o.k === 'done') break;
    if (o.k === 'gift') { await giveGift(D.id, D.name, D.x, D.z); continue; }
    if (o.k === 'bye') { endTalk(); bumpRel(D.id, 4); return endDate(partner()?.id === D.id && fam().partner?.livesIn ? `${D.name}: "Okay. See you at home. Don't be late."` : `${D.name}: "Tonight was fun. Text me."`); }
    if (o.k === 'sweet') {
      const opts = [{ label: I('heart', 'Kiss her'), k: 'kiss' }, { label: I('people', inCar ? 'Lean in for a hug' : 'Hug her'), k: 'hug' }];
      if (inCar) opts.push({ label: I('hand', 'Hand on her knee'), k: 'knee' }, { label: I('hand', 'Hold her hand'), k: 'hand' });
      else opts.push({ label: I('hand', D.holding ? 'Let go of her hand' : 'Hold her hand'), k: 'hold' }, { label: I('people', 'Arm around her'), k: 'arm' });
      opts.push({ label: I('x', 'Back'), k: 'back' });
      const s = opts[await talk.choose(opts)].k; if (s === 'back') continue;
      if (s === 'kiss') { if (ok('kiss', 50)) { D.interest += 10; bumpRel(D.id, 6); feed({ mood: 8 }); hearts(P.x, P.z, 12); await talk.act('kiss', 2); await talk.say(pick(['*mwah* ...again?', 'Mmm.', '*smiles* Okay, that was nice.'])); } else { D.interest -= 6; await talk.say(pick(['Whoa, slow down.', 'Not yet. Earn it.'])); } }
      else if (s === 'hug') { if (ok('hug', 25)) { D.interest += 5; bumpRel(D.id, 3); await talk.act('hug', 1.8); await talk.say(pick(['Aww.', 'You give good hugs.'])); } else await talk.say('Ha, okay, personal space please.'); }
      else if (s === 'knee') { if (ok('knee', 60)) { D.interest += 8; bumpRel(D.id, 4); await talk.act('knee', 2.2); await talk.say(pick(['*bites lip* Eyes on the road.', 'Mmm. Keep driving.'])); } else { D.interest -= 10; await talk.say('Hands on the wheel, buddy.'); } }
      else if (s === 'hand') { if (ok('hand', 35)) { D.interest += 5; bumpRel(D.id, 3); await talk.act('hand', 2); await talk.say('*squeezes your hand*'); } else await talk.say('Ha. Maybe later.'); }
      else if (s === 'hold') { if (D.holding) { D.holding = false; await talk.say('Okay.'); } else if (ok('hold', 35)) { D.holding = true; D.interest += 4; await talk.act('hand', 1.4); await talk.say(pick(['*takes your hand*', 'Okay, cute.'])); } else await talk.say('Let\'s not get ahead of ourselves.'); }
      else if (s === 'arm') { if (ok('arm', 40)) { D.interest += 5; bumpRel(D.id, 3); await talk.act('hug', 1.6); await talk.say('*leans into you*'); } else await talk.say('Easy.'); }
      continue;
    }
    if (o.k === 'talk') {
      const opts = [{ label: I('chat', 'Ask about her'), k: 'ask' }, { label: I('star', 'Talk about…'), k: 'topic' }, { label: I('smile', 'Compliment her'), k: 'comp' }, { label: I('x', 'Back'), k: 'back' }];
      const s = opts[await talk.choose(opts)].k; if (s === 'back') continue;
      if (s === 'ask') {
        await talk.say(pick(['Tell me something about you.', 'What are you into?', 'What makes you happy?']), 'you');
        const hid = pr.love.find(t => !pr.known.includes(t));
        if (hid) { pr.known.push(hid); D.interest += 4; await talk.say(`Honestly? ${TOPICS[hid].label}. I'm really into ${TOPICS[hid].label.toLowerCase()}. ${pick(['Take me somewhere for that sometime.', 'That\'s my thing.'])}`); gainXP('charm', 6); }
        else if (!pr.saidHate) { pr.saidHate = 1; await talk.say(`You know me pretty well now. Just... don't get me started on ${TOPICS[pr.hate].label.toLowerCase()}. Hate it.`); }
        else await talk.say('You already know me. That\'s kind of nice.');
      } else if (s === 'topic') {
        const tk = Object.keys(TOPICS), opts2 = tk.map(t => ({ label: I(TOPICS[t].icon, TOPICS[t].label + (pr.known.includes(t) ? ' <small>♥</small>' : '')), t })); opts2.push({ label: I('x', 'Back'), t: null });
        const t = opts2[await talk.choose(opts2)].t; if (!t) continue; const T = TOPICS[t], n = D.used['t:' + t] = (D.used['t:' + t] || 0) + 1;
        await talk.say(pick(T.you), 'you');
        if (n > 1) { await talk.say('We talked about that already.'); continue; }
        if (pr.love.includes(t)) { D.interest += 10; bumpRel(D.id, 4); if (!pr.known.includes(t)) pr.known.push(t); hearts(P.x, P.z, 5); await talk.say(pick(T.love)); }
        else if (pr.hate === t) { D.interest -= 8; await talk.say(pick(T.hate)); }
        else { D.interest += 2; await talk.say(pick(T.meh)); }
      } else {
        await talk.say(pick(['You look amazing tonight.', 'I like spending time with you.', 'You\'ve got the best laugh.']), 'you');
        if (ok('comp', 0) && (D.used.comp || 0) < 3) { D.interest += 5; bumpRel(D.id, 2); await talk.say(pick(['Stop it. ...Don\'t stop.', 'Smooth.', 'You\'re sweet.'])); } else await talk.say('You said that already, charmer.');
      }
      continue;
    }
    if (o.k === 'go') {
      const known = pr.love.filter(l => pr.known.includes(l));
      const opts = [{ label: I('chat', 'What do you want to do?'), k: 'ask' }, ...DATE_SPOTS.filter(s => s.beach || PLACES.some(q => q.interior === s.interior)).map(s => ({ label: I('pin', `Let's go to ${s.name}` + (s.loves.some(l => known.includes(l)) ? ' <small>♥</small>' : '') + (s.beach || PLACES.some(p2 => p2.interior === s.interior && isOpen(p2)) ? '' : ' <small>closed</small>')), k: 'spot', s })), { label: I('x', 'Back'), k: 'back' }];
      const c = opts[await talk.choose(opts)]; if (c.k === 'back') continue;
      let s = c.s;
      const spotOpen = q => q.beach || PLACES.some(p2 => p2.interior === q.interior && isOpen(p2));
      if (c.k === 'spot' && !spotOpen(s)) { await talk.say(`${s.name[0].toUpperCase() + s.name.slice(1)}'s closed right now. Somewhere else?`); continue; }
      if (c.k === 'ask') { const ls = pr.love.filter(l => DATE_SPOTS.some(q => q.loves.includes(l) && spotOpen(q))), l = ls.length ? pick(ls) : null; s = l ? DATE_SPOTS.find(q => q.loves.includes(l) && spotOpen(q)) : DATE_SPOTS.find(q => spotOpen(q) && !q.loves.includes(pr.hate)) || DATE_SPOTS.find(q => q.beach); if (!l) { await talk.say(`Hmm, everything good is shut right now. ${s.name[0].toUpperCase() + s.name.slice(1)}?`); dateGo(s); continue; } if (!pr.known.includes(l)) pr.known.push(l); await talk.say(`Ooh. Can we go to ${s.name}? I love ${TOPICS[l].label.toLowerCase()}.`); }
      else await talk.say(s.loves.includes(pr.hate) ? 'Eh... if you want.' : s.loves.some(l => pr.love.includes(l)) ? 'Yes! Let\'s go!' : 'Sure, why not.');
      dateGo(s); continue;
    }
    if (o.k === 'music') {
      const fav = pr.love.find(l => LOVE_STATION[l] != null) || pr.love[0], st = LOVE_STATION[fav] ?? 0;
      radioSet(st); radioOn(true); if (ride) ride.radio = st;
      if (!pr.known.includes(fav)) pr.known.push(fav);
      D.interest += (D.used.music = (D.used.music || 0) + 1) === 1 ? 6 : 0; await talk.say(pick([`Ooh, ${STATIONS[st].name.split(' — ')[1]}! You remembered.`, 'Yes! This is my station.', 'Turn it up!']));
      continue;
    }
    if (o.k === 'dance') { endTalk(); D.dancing = pr.love.includes('nightlife') || pr.love.includes('music') || D.interest > 70; if (!D.dancing) toast(`${D.name}: "I'll watch. Dancing's not really my thing."`, 2.6); return startDance(); }
    if (o.k === 'shop') { await shopForHer(D); continue; }
    if (o.k === 'drink') { if (money < 18) await talk.say('...You can\'t afford a drink? Wow.'); else { spend(18); D.interest += (D.used.drink = (D.used.drink || 0) + 1) < 3 ? 12 : 2; bumpRel(D.id, 4); await talk.say(D.used.drink < 3 ? pick(['Ooh, thank you. Cheers!', 'You\'re sweet.']) : 'Okay, I think I\'ve had enough.'); } continue; }
    if (o.k === 'home' && o.live) { setWaypoint(o.h.x, o.h.z, 'Home'); await talk.say(pick(['Yes. Sofa, snacks, a film?', 'Please. My feet are killing me.', 'Home sounds perfect.'])); continue; }
    if (o.k === 'home') { setWaypoint(o.h.x, o.h.z, 'Home'); await talk.say(D.interest >= 55 ? pick(['Mmm, okay. Lead the way.', 'I thought you\'d never ask.']) : 'Maybe... let\'s see how the night goes.'); continue; }
    if (o.k === 'woo') {
      if (D.interest < 65) { await talk.say(pick(['Ha! Not yet, tiger.', 'I don\'t know you well enough for that.'])); D.interest -= 5; continue; }
      await talk.say(pick(['I was hoping you\'d say that.', 'Come here, you.', '*giggles* Okay...'])); D.tryBaby = await askBaby(); endTalk(); return startWoo(bed ? 'bed' : 'car', bed);
    }
    if (o.k === 'official') { if (D.interest >= 60) { makeOfficial(D.id); hearts(P.x, P.z, 14); await talk.act('kiss', 1.8); await talk.say(pick(['Yes! Finally. I thought you\'d never ask.', 'Okay... yes. You\'re mine now.'])); toast(`You and ${D.name} are official!`, 3); } else await talk.say('Let\'s not rush it. Take me out a few more times.'); continue; }
  }
  endTalk();
}
function dateGo(s) {
  if (s.beach) { const x = clamp(P.x, -200, 400), z = sandLine(x) + 18; setWaypoint(x, z, 'The beach'); return; }
  let best = null, bd = 1e9; for (const q of PLACES) if (q.interior === s.interior) { const d = Math.hypot(q.x - P.x, q.z - P.z); if (d < bd) { bd = d; best = q; } }
  if (best) setWaypoint(best.x, best.z, best.name);
}
// ================================================================ TATTOO PARLOUR (pick a spot, a design and an ink; laser them off later)
const INKS = { '#1c2333': 'Black', '#8b1e3f': 'Red', '#1f4a8a': 'Blue', '#2f6b3a': 'Green', '#5a2a8a': 'Purple' };
const SPOT_PRICE = { armR: 140, armL: 140, foreR: 160, foreL: 160, handR: 220, handL: 220, neck: 260, face: 350, chest: 320, back: 380 };
const inkPics = {};
const inkPic = (d, ink = '#1c2333') => inkPics[d + ink] ||= tattooCanvas(d, ink).toDataURL();
function spotShows(cfg, spot) { const long = ['long', 'hoodie', 'jacket', 'suit'].includes(cfg.top), swim = cfg.top === 'shirtless' || cfg.top === 'swimtop'; return spot.startsWith('arm') ? cfg.top === 'tank' || swim : spot.startsWith('fore') ? !long : spot.startsWith('hand') ? cfg.gloves !== 'gloves' : spot === 'chest' || spot === 'back' ? cfg.top === 'shirtless' : true; }
async function openTattoo(p) {
  let spot = 'foreR', design = 'rose', ink = '#1c2333';
  const herHere = date && !date.inCar && Math.hypot(date.x - P.x, date.z - P.z) < 10;
  setState('ui');
  await sheet(p.name, () => {
    const mine = charCfg.tattoos || [], price = SPOT_PRICE[spot];
    return `<p class="ph-hint" style="margin:0 0 8px">Pick a spot, a design and an ink. Your ink is yours: nobody in town has the same piece as you.</p>
      ${mine.length ? `<div class="ph-sec">Your tattoos</div>${mine.map((t, i) => `<div class="ph-row"><span><img src="${inkPic(t.design, t.ink)}" style="width:28px;height:28px;vertical-align:middle;background:#f2d8c4;border-radius:6px"> ${TATTOO_DESIGNS[t.design]} · ${TATTOO_SPOTS[t.spot]}</span><button class="ph-mini" data-rm="${i}">Laser off ${fmt(Math.round(SPOT_PRICE[t.spot] * 1.5))}</button></div>`).join('')}` : ''}
      <div class="ph-sec">Where</div><div class="chips">${Object.entries(TATTOO_SPOTS).map(([k, n]) => `<button class="chip ${k === spot ? 'on' : ''}" data-spot="${k}">${n}</button>`).join('')}</div>
      ${spotShows(charCfg, spot) ? '' : '<p class="ph-hint">(Your clothes cover this spot right now. It shows when you wear something that shows skin.)</p>'}
      <div class="ph-sec">Design</div><div class="ink-grid">${Object.entries(TATTOO_DESIGNS).map(([k, n]) => `<button class="ink ${k === design ? 'on' : ''}" data-des="${k}"><img src="${inkPic(k, ink)}"><span>${n}</span></button>`).join('')}</div>
      <div class="ph-sec">Ink</div><div class="chips">${Object.entries(INKS).map(([k, n]) => `<button class="chip ${k === ink ? 'on' : ''}" data-ink="${k}"><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${k};margin-right:5px"></i>${n}</button>`).join('')}</div>
      <button class="big-btn" id="inkGo" ${money < price ? 'disabled' : ''}>Get the ${TATTOO_DESIGNS[design]} · ${fmt(price)}</button>
      ${herHere ? `<button class="big-btn alt" id="inkHer">Get ${date.name} a tattoo · ${fmt(220)}</button>` : ''}
      <button class="big-btn alt" data-done>Done</button>`;
  }, (el, close, draw) => {
    el.querySelectorAll('[data-spot]').forEach(b => b.onclick = () => { spot = b.dataset.spot; draw(); });
    el.querySelectorAll('[data-des]').forEach(b => b.onclick = () => { design = b.dataset.des; draw(); });
    el.querySelectorAll('[data-ink]').forEach(b => b.onclick = () => { ink = b.dataset.ink; draw(); });
    el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const t = charCfg.tattoos[+b.dataset.rm], c = Math.round(SPOT_PRICE[t.spot] * 1.5); if (money < c) { toast('Laser removal costs ' + fmt(c)); return; } spend(c); charCfg.tattoos.splice(+b.dataset.rm, 1); inkSaved(); hurt(3); toast('Zapped off. That stung.'); draw(); });
    const go = el.querySelector('#inkGo'); if (go) go.onclick = () => {
      const price = SPOT_PRICE[spot]; if (money < price) return; spend(price);
      charCfg.tattoos = [...(charCfg.tattoos || []).filter(t => t.spot !== spot), { spot, design, ink }]; inkSaved();
      sfx.whoosh?.(); feed({ mood: 8 }); advanceTime(1); toast(`Fresh ink: ${TATTOO_DESIGNS[design]} on your ${TATTOO_SPOTS[spot].toLowerCase()}.`, 3); draw();
    };
    const her = el.querySelector('#inkHer'); if (her) her.onclick = () => { if (money < 220) { toast('That\'s $220.'); return; } spend(220); close(); dateTattoo(); };
  });
  setState('play');
}
function inkSaved() { store.set('rr_char', charCfg); buildHero(); setPlayerInk((charCfg.tattoos || []).map(t => t.design)); saveGame(); }
// she picks her own piece, in her own spot
function dateTattoo() {
  const D = date; if (!D) return;
  const pool = Object.keys(TATTOO_DESIGNS).filter(d => !(charCfg.tattoos || []).some(t => t.design === d) && !['mom', 'loyal', 'tear', 'web', 'skull'].includes(d) || D.prefs.att === 'edgy' && ['skull', 'web'].includes(d));
  const t = { spot: pick(['foreL', 'foreR', 'handR', 'neck', 'armL']), design: pick(pool), ink: pick(Object.keys(INKS)) };
  D.cfg = { ...D.cfg, tattoos: [...(D.cfg.tattoos || []).filter(q => q.spot !== t.spot), t] }; redressDate(D);
  D.interest += 12; bumpRel(D.id, 6, false); hearts(D.x, D.z, 10);
  toast(`${D.name} got a ${TATTOO_DESIGNS[t.design].toLowerCase()} on her ${TATTOO_SPOTS[t.spot].toLowerCase()}. "I LOVE it!"`, 3.2);
}
// rebuild her figure after new clothes or ink, and remember it
function redressDate(D) {
  const vis = D.fig.root.visible; dyn.remove(D.fig.root);
  D.look = { ...bakeCfg(D.cfg), fem: true }; D.fig = figure(D.look); D.fig.root.visible = vis; dyn.add(D.fig.root);
  const d = stats.dates?.[D.id]; if (d) { d.cfg = D.cfg; }
  saveGame();
}
// ---------------- clothes for her: she has a style; outfits she owns get worn on later dates
const HER_STYLES = {
  glam: { tops: ['crop', 'tank', 'crop', 'dress', 'leather'], pants: ['skirt', 'skirt', 'jeans', 'leggings'], cols: ['#ff6fb5', '#16161b', '#e23b3b', '#ffffff', '#ffd23f'], shoes: ['heels', 'heels', 'boots'], neck: ['pearls', 'chain', 'none'] },
  casual: { tops: ['tshirt', 'hoodie', 'long', 'polo'], pants: ['jeans', 'cargo', 'jeans', 'longskirt'], cols: ['#2f80ed', '#ffffff', '#c2b280', '#3a3d45', '#1fb5a8'], shoes: ['sneakers', 'sandals', 'loafers'], neck: ['none', 'none', 'scarf'] },
  street: { tops: ['hoodie', 'jacket', 'tshirt', 'puffer', 'tracksuit'], pants: ['cargo', 'jeans', 'shorts', 'joggers'], cols: ['#16161b', '#ff8a2a', '#9b51e0', '#3a3d45', '#ffd23f'], shoes: ['hightops', 'sneakers'], neck: ['chain', 'none'] },
  sporty: { tops: ['tank', 'tshirt', 'crop', 'tracksuit'], pants: ['shorts', 'shorts', 'leggings', 'joggers'], cols: ['#4cd964', '#2f80ed', '#ffffff', '#ff3b8a', '#16161b'], shoes: ['sneakers', 'hightops'], neck: ['none'] },
};
function herStyle(D) { const pr = D.prefs; return pr.style ||= pr.love.includes('fitness') ? 'sporty' : pr.love.includes('nightlife') ? 'glam' : pr.att === 'edgy' ? 'street' : pick(Object.keys(HER_STYLES)); }
function outfitIn(style) { const S2 = HER_STYLES[style]; return weatherWear({ top: pick(S2.tops), pants: pick(S2.pants), topColor: pick(S2.cols), pantsColor: pick(['#16161b', '#2f80ed', '#ffffff', '#8b1e3f', '#c2b280', '#3a3d45']), shoes: pick(S2.shoes || ['sneakers', 'boots']), neck: pick(S2.neck || ['none']) }); }
// dressed for the weather: a coat and boots in the rain, a jacket on cold foggy mornings, light clothes in the sun
function weatherWear(o) { const k = wx().k; if ((k === 'rain' || k === 'storm') && !inside) { o.top = pick(['trench', 'puffer', 'hoodie']); if (o.shoes === 'sandals' || o.shoes === 'heels') o.shoes = 'boots'; } else if (k === 'fog' && ['tank', 'crop'].includes(o.top)) o.top = pick(['jacket', 'hoodie']); return o; }
const TOP_N = { crop: 'crop top', tank: 'tank top', tshirt: 'tee', hoodie: 'hoodie', long: 'long-sleeve top', jacket: 'jacket', dress: 'dress', leather: 'leather jacket', polo: 'polo', puffer: 'puffer', tracksuit: 'tracksuit top', trench: 'trench coat', jersey: 'jersey' }, PANT_N = { skirt: 'skirt', jeans: 'jeans', cargo: 'cargos', shorts: 'shorts', leggings: 'leggings', longskirt: 'long skirt', joggers: 'joggers' };
const COL_N = { '#ff6fb5': 'pink', '#16161b': 'black', '#e23b3b': 'red', '#ffffff': 'white', '#ffd23f': 'yellow', '#2f80ed': 'blue', '#c2b280': 'beige', '#3a3d45': 'grey', '#1fb5a8': 'teal', '#ff8a2a': 'orange', '#9b51e0': 'purple', '#4cd964': 'green', '#ff3b8a': 'hot pink', '#8b1e3f': 'burgundy' };
async function shopForHer(D) {
  const shop = inside.place, mult = shop.style === 'luxe' ? 2.4 : shop.style === 'vintage' ? 0.7 : 1, mine = herStyle(D);
  const styles = [mine, ...Object.keys(HER_STYLES).filter(s => s !== mine).sort(() => Math.random() - 0.5).slice(0, 2)].sort(() => Math.random() - 0.5);
  const fits = styles.map(st => ({ st, o: outfitIn(st), price: Math.round((90 + Math.random() * 120) * mult / 5) * 5 }));
  await talk.say('Ooh, shopping? Okay, what do you think of these?');
  const opts = fits.map(f => I('shirt', `${COL_N[f.o.topColor] || ''} ${TOP_N[f.o.top]} + ${COL_N[f.o.pantsColor] || ''} ${PANT_N[f.o.pants]} <small>${fmt(f.price)}</small>`)); opts.push(I('x', 'Maybe not today'));
  const k = await talk.choose(opts); if (k >= fits.length) return;
  const f = fits[k]; if (money < f.price) { await talk.say('...Your card got declined. Awkward.'); return; }
  spend(f.price); D.cfg = { ...D.cfg, ...f.o }; redressDate(D);
  const d = stats.dates?.[D.id]; if (d) (d.wardrobe ||= []).push(f.o);
  if (f.st === mine) { D.interest += 14; bumpRel(D.id, 6, false); hearts(D.x, D.z, 10); await talk.say(pick(['Oh my god, it\'s SO me. I\'m wearing it now!', 'You actually get my style. I love it.'])); }
  else { D.interest += 4; await talk.say(pick(['Aww, thank you. It\'s... cute! Not really me, but cute.', 'Ha, okay, something different. Thanks babe.'])); }
}
// next time you see her she might be in something else: often what you bought her
function dateOutfit(id) {
  const d = stats.dates?.[id]; if (!d?.cfg) return null;
  const r = Math.random(); if (d.wardrobe?.length && r < 0.5) return { ...d.cfg, ...pick(d.wardrobe) };
  if (r < 0.8) { const pr = prefsOf(id); const st = pr.style || pick(Object.keys(HER_STYLES)); return { ...d.cfg, ...outfitIn(st) }; }
  return { ...d.cfg, ...weatherWear({ top: d.cfg.top, shoes: d.cfg.shoes }) };
}

/* distance in one line, 3 digits max: 40 m, 850 m, 1.2 km, 12 km, 120 km */
function navDist(d) { if (d < 995) return Math.max(10, Math.round(d / 10) * 10) + ' m'; const k = d / 1000; return (k < 9.95 ? k.toFixed(1) : Math.min(999, Math.round(k))) + ' km'; }
function nearestHome() { const fh = famHome(); if (fh && propMode(fh.id) !== 'rent') return fh; let best = null, bd = 1e9; for (const p of PROPERTIES) if (owned.has(p.id) && propMode(p.id) !== 'rent') { const d = Math.hypot(p.x - P.x, p.z - P.z); if (d < bd) { bd = d; best = p; } } return best; }
function hearts(x, z, n = 6, y = 1.8) { spawnParticles(x, y, z, ['#ff6fb5', '#ff3b8a', '#ffd1e8'], n, 1.6, 1.4, 0.22, -1.5); }
// WooHoo: under the duvet with the bed bouncing, or in a parked car with steamy windows
function startWoo(kind, bed) {
  woo = { kind, t: 0, dur: 5.5, bed };
  if (kind === 'bed') {
    const F = FURN[bed.t], r = bed.r || 0, c = Math.cos(r), sn = Math.sin(r), dbl = F.w > 1.6;
    // bed-local (x across, z from pillow -z to foot +z) to world
    const L = (dx, dz) => inside.h.toWorld(bed.x + dx * c + dz * sn, bed.z - dx * sn + dz * c);
    const g = new THREE.Group(); const w0 = L(0, 0); g.position.set(w0.x, 0, w0.z); g.rotation.y = r; dyn.add(g);
    const dz0 = -0.55, dz1 = F.d / 2 - 0.04, col = new THREE.Color(bed.c || '#3a5fa0'); { const hsl = {}; col.getHSL(hsl); if (hsl.l > 0.7) col.set('#d98fa6'); else col.offsetHSL(0, 0, 0.08); } /* light sheets get a blush duvet so you can see it */
    const duvet = new THREE.Mesh(new THREE.BoxGeometry(F.w * 0.98, 0.3, dz1 - dz0), new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 }));
    duvet.geometry.translate(0, 0, (dz1 - dz0) / 2); duvet.position.set(0, 0.86, dz0); duvet.castShadow = true; duvet.visible = false; g.add(duvet);
    const lump = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), duvet.material); lump.scale.set(dbl ? 1.5 : 1.0, 0.5, 1.2); lump.position.set(0, 0.95, 0.15); lump.visible = false; g.add(lump);
    // where they meet at the foot of the bed (falls back to the side if the foot is against a wall)
    let foot = L(0, F.d / 2 + 0.75); { const q = { x: foot.x, z: foot.z }; resolve(q, 0.4, 0); if (Math.hypot(q.x - foot.x, q.z - foot.z) > 0.25) foot = bedSide(bed); }
    const across = { x: c, z: -sn }; // bed's local +x in world
    const her = date.fig.root; her.rotation.order = 'YXZ'; hero.root.rotation.order = 'YXZ';
    const mk = () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: showerTexture(), depthTest: false })); sp.scale.set(0.8, 0.95, 1); sp.visible = false; dyn.add(sp); return sp; };
    const hx = dbl ? 0.42 : 0.26, ht = (date.look?.h || 1.8);
    Object.assign(woo, { L, g, duvet, lump, F, r, dbl, bedMesh: bed.mesh, dur: 1e9, stage: 'walk', st: 0,
      me: { x: P.x, z: P.z, face: P.face, ph: 0, tx: foot.x - across.x * 0.42, tz: foot.z - across.z * 0.42, blur: mk(), lx: -hx },
      her: { x: date.x, z: date.z, face: date.face || 0, ph: 0, tx: foot.x + across.x * 0.42, tz: foot.z + across.z * 0.42, blur: mk(), lx: hx },
      mid: foot, headZ: -0.92, ht });
    date.fig.root.visible = true; heroRoot.visible = true;
    toast('WooHoo time...', 1.5);
  } else {
    woo.car = ride; woo.glass = [];
    ride.b.group.traverse(m => { if (m.isMesh && m.material.transparent && m.material.opacity > 0.5) { woo.glass.push([m.material, m.material.color.getHex()]); m.material.color.set('#eef3f6'); } });
    toast('WooHoo!', 1.5);
  }
  sfx.whoosh?.();
}
function showerTexture() {
  if (!showerTex) { const c = document.createElement('canvas'); c.width = c.height = 8; const g = c.getContext('2d'); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = ['#e8b088', '#d39a6a', '#f6c9a4', '#b77a4b', '#c98f62'][(i * 3 + j * 5) % 5]; g.fillRect(i, j, 1, 1); } showerTex = new THREE.CanvasTexture(c); showerTex.magFilter = THREE.NearestFilter; showerTex.minFilter = THREE.NearestFilter; }
  return showerTex;
}
// a free spot to stand next to the bed (inside the room, not in a wall or other furniture)
function bedSide(bed, avoid) {
  const hw = inside.h.w / 2 - 0.6, hd = inside.h.d / 2 - 0.6, F = FURN[bed.t];
  for (const [dx, dz] of [[F.w / 2 + 0.7, 0], [-F.w / 2 - 0.7, 0], [0, F.d / 2 + 0.7], [F.w / 2 + 0.7, F.d / 2], [-F.w / 2 - 0.7, F.d / 2], [0, -F.d / 2 - 0.7]]) {
    const lx = bed.x + dx, lz = bed.z + dz; if (Math.abs(lx) > hw || Math.abs(lz) > hd) continue;
    const w = inside.h.toWorld(lx, lz), q = { x: w.x, z: w.z }; resolve(q, 0.4, 0);
    if (Math.hypot(q.x - w.x, q.z - w.z) < 0.2 && (!avoid || Math.hypot(q.x - avoid.x, q.z - avoid.z) > 0.8)) return q;
  }
  return inside.h.toWorld(0, inside.h.d / 2 - 1.5);
}
// Sims-style, kept PG: walk to the foot of the bed, kiss, spin out of your clothes (pixelated), she climbs in, then you,
// the duvet comes up and the bed does its thing; now and then two heads pop up at the pillows, then back under
function wooBed(W, dt) {
  const me = W.me, her = W.her, F = W.F, ease = q => q * q * (3 - 2 * q), cl = q => Math.max(0, Math.min(1, q));
  const heroLimbs = (sw, ph) => { hero.legL.pivot.rotation.x = -Math.sin(ph) * sw; hero.legR.pivot.rotation.x = Math.sin(ph) * sw; hero.legL.knee.rotation.x = 0.02; hero.legR.knee.rotation.x = 0.02; hero.armL.pivot.rotation.set(Math.sin(ph) * sw * 0.8, 0, -0.08); hero.armR.pivot.rotation.set(-Math.sin(ph) * sw * 0.8, 0, 0.08); hero.head.rotation.set(0, 0, 0); hero.torso.rotation.set(0, 0, 0); };
  const herLimbs = (sw, ph) => { const l = date.fig.limbs; l[0].rotation.set(-Math.sin(ph) * sw, 0, 0); l[1].rotation.set(Math.sin(ph) * sw, 0, 0); l[2].rotation.set(Math.sin(ph) * sw * 0.8, 0, 0); l[3].rotation.set(-Math.sin(ph) * sw * 0.8, 0, 0); };
  const place = (q, y, yaw, tilt) => { const R = q === me ? hero.root : date.fig.root; if (q === me) { heroRoot.position.set(q.x, y, q.z); hero.root.rotation.set(tilt, yaw, 0); P.x = q.x; P.z = q.z; P.face = yaw; } else { date.x = q.x; date.z = q.z; date.face = yaw; R.position.set(q.x, y, q.z); R.rotation.set(tilt, yaw, 0); } };
  const blurAt = (q, y, show) => { q.blur.visible = show && Math.floor(W.t * 10) % 7 !== 0; q.blur.position.set(q.x, y, q.z); };
  W.st += dt; const t = W.st;
  if (W.stage === 'walk') {
    let done = true;
    for (const q of [me, her]) { const dx = q.tx - q.x, dz = q.tz - q.z, d = Math.hypot(dx, dz); if (d > 0.08) { done = false; const v = Math.min(2.4, d * 3); q.x += dx / d * v * dt; q.z += dz / d * v * dt; q.face += wrapA(Math.atan2(dx, dz) - q.face) * Math.min(1, dt * 10); q.ph += dt * v * 3.2; } q.sw = d > 0.08 ? 0.6 : 0; }
    heroLimbs(me.sw, me.ph); herLimbs(her.sw, her.ph); poseHips();
    place(me, 0, me.face, 0); place(her, 0, her.face, 0);
    if (done || t > 5) { W.stage = 'kiss'; W.st = 0; me.x = me.tx; me.z = me.tz; her.x = her.tx; her.z = her.tz; }
    return false;
  }
  const faceMe = Math.atan2(her.x - me.x, her.z - me.z), faceHer = faceMe + Math.PI;
  if (W.stage === 'kiss') { // turn to each other, lean in, kiss
    me.face += wrapA(faceMe - me.face) * Math.min(1, dt * 8); her.face += wrapA(faceHer - her.face) * Math.min(1, dt * 8);
    heroLimbs(0, 0); herLimbs(0, 0); poseHips();
    const lean = ease(cl((t - 0.3) / 0.5)) * 0.22;
    hero.torso.rotation.x = lean * 0.6; hero.armR.pivot.rotation.set(-0.9 * lean / 0.22, 0, -0.5 * lean / 0.22); date.fig.limbs[2].rotation.set(-1.0 * lean / 0.22, 0, 0.6 * lean / 0.22); date.fig.limbs[3].rotation.set(-1.0 * lean / 0.22, 0, -0.6 * lean / 0.22);
    place(me, 0, me.face, lean * 0.4); place(her, 0, her.face, lean * 0.4);
    if (t > 0.7 && !W.kissed) { W.kissed = true; hearts((me.x + her.x) / 2, (me.z + her.z) / 2, 10, 1.9); }
    if (t > 1.6) { W.stage = 'undress'; W.st = 0; sfx.whoosh?.(); }
    return false;
  }
  if (W.stage === 'undress') { // Sims spin: a twirl, a puff of sparkles, and the pixel blur goes on
    const sp = ease(cl(t / 0.9)) * Math.PI * 4;
    heroLimbs(0, 0); herLimbs(0, 0); poseHips(); hero.armL.pivot.rotation.z = 0.45; hero.armR.pivot.rotation.z = -0.45; date.fig.limbs[2].rotation.z = -0.5; date.fig.limbs[3].rotation.z = 0.5;
    place(me, Math.sin(cl(t / 0.9) * Math.PI) * 0.15, faceMe + sp, 0); place(her, Math.sin(cl(t / 0.9) * Math.PI) * 0.15, faceHer - sp, 0);
    if (t > 0.45 && !W.puff) { W.puff = true; for (const q of [me, her]) spawnParticles(q.x, 1.1, q.z, ['#ffffff', '#ffd1e8', '#ff6fb5', '#ffd23f'], 18, 2.2, 1.2, 0.14, -1); }
    blurAt(me, 0.95, t > 0.45); blurAt(her, 0.95, t > 0.45);
    if (t > 1.5) { W.stage = 'hand'; W.st = 0; }
    return false;
  }
  if (W.stage === 'hand') { // he takes her hand and helps her up
    heroLimbs(0, 0); herLimbs(0, 0); poseHips();
    const rch = ease(cl(t / 0.5)); hero.armR.pivot.rotation.set(-1.1 * rch, 0, 0.35 * rch); date.fig.limbs[2].rotation.set(-1.1 * rch, 0, -0.35 * rch);
    place(me, 0, faceMe, 0); place(her, 0, faceHer, 0); blurAt(me, 0.95, true); blurAt(her, 0.95, true);
    if (t > 0.9) { W.stage = 'climb'; W.st = 0; for (const q of [me, her]) { q.sx = q.x; q.sz = q.z; q.sface = q.face; } }
    return false;
  }
  // into bed: sit on the end facing out, lie back, slide up to the pillow. Her first (you steady her), then you
  const lie = (q, k) => { // k 0..1
    const yaw = W.r; const a = ease(cl(k / 0.3)), b = ease(cl((k - 0.3) / 0.35)), c2 = ease(cl((k - 0.6) / 0.4));
    const footZ = W.headZ + W.ht * 0.86, edge = W.L(q.lx, F.d / 2 - 0.25), bed2 = W.L(q.lx, footZ);
    const x0 = q.sx + (edge.x - q.sx) * a, z0 = q.sz + (edge.z - q.sz) * a;
    q.x = x0 + (bed2.x - x0) * c2; q.z = z0 + (bed2.z - z0) * c2;
    const y = 0.42 * a + 0.36 * b, tilt = -Math.PI / 2 * b, yy = q.sface + wrapA(yaw - q.sface) * a;
    const legs = 1.4 * a * (1 - c2);
    if (q === me) { hero.hips.position.y = hero.legLen; hero.legL.pivot.rotation.x = -legs; hero.legR.pivot.rotation.x = -legs; hero.legL.knee.rotation.x = legs; hero.legR.knee.rotation.x = legs; hero.armL.pivot.rotation.set(-0.2, 0, -0.15); hero.armR.pivot.rotation.set(-0.2, 0, 0.15); }
    else { const l = date.fig.limbs; l[0].rotation.set(-legs, 0, 0); l[1].rotation.set(-legs, 0, 0); l[2].rotation.set(-0.2, 0, 0.15); l[3].rotation.set(-0.2, 0, -0.15); }
    place(q, y, yy, tilt); blurAt(q, y > 0.5 ? y + 0.35 : 0.95, !W.duvet.visible || W.duvet.scale.z < 0.6);
  };
  if (W.stage === 'climb') {
    lie(her, cl(t / 1.4));
    if (t < 1.4) { heroLimbs(0, 0); poseHips(); const tow = Math.atan2(her.x - me.x, her.z - me.z); me.face += wrapA(tow - me.face) * Math.min(1, dt * 6); hero.armR.pivot.rotation.set(-1.0 * (1 - cl(t / 1.2)), 0, 0.3); place(me, 0, me.face, 0); blurAt(me, 0.95, true); }
    else { if (!W.meStart) { W.meStart = true; me.sface = me.face; me.sx = me.x; me.sz = me.z; } lie(me, cl((t - 1.4) / 1.4)); }
    if (t > 2.9) { W.stage = 'covers'; W.st = 0; W.duvet.visible = true; W.duvet.scale.set(1, 1, 0.05); }
    return false;
  }
  if (W.stage === 'covers') { // the duvet pulls up over them
    W.duvet.scale.z = 0.05 + 0.95 * ease(cl(t / 0.8)); for (const q of [me, her]) q.blur.visible = W.duvet.scale.z < 0.7 && Math.floor(W.t * 10) % 7 !== 0;
    if (t > 1.0) { W.stage = 'bed'; W.st = 0; for (const q of [me, her]) q.blur.visible = false; }
    return false;
  }
  // under the duvet: mostly hidden with the bed bouncing, every so often both heads pop up at the pillows giggling
  const beats = [[0, 1.2, 'peek'], [1.2, 4.2, 'under'], [4.2, 5.4, 'peek'], [5.4, 8.6, 'under'], [8.6, 9.8, 'peek']], cur = beats.find(b2 => t >= b2[0] && t < b2[1]);
  const peek = !cur || cur[2] === 'peek'; W.under = !peek;
  hero.root.visible = peek; date.fig.root.visible = peek;
  const bounce = Math.abs(Math.sin(W.t * 7.5));
  W.lump.visible = !peek; W.duvet.position.y = 0.86 + (peek ? 0 : bounce * 0.06); W.duvet.scale.y = peek ? 1 : 1 + Math.sin(W.t * 15) * 0.12;
  W.lump.position.y = 0.98 + bounce * 0.14; W.lump.rotation.z = Math.sin(W.t * 5) * 0.18; W.lump.position.x = Math.sin(W.t * 2.3) * 0.12;
  W.g.position.y = peek ? 0 : bounce * 0.04; if (W.bedMesh) W.bedMesh.position.y = peek ? 0 : bounce * 0.05;
  if (peek) { hero.head.rotation.y = Math.sin(W.t * 3) * 0.3 + 0.35; hero.head.rotation.x = 0; } // look at each other
  if (!peek && Math.random() < dt * 6) hearts(W.g.position.x, W.g.position.z, 2, 1.6);
  if (peek && !W['pk' + Math.floor(t)] && Math.random() < dt * 2) { W['pk' + Math.floor(t)] = true; hearts(W.g.position.x, W.g.position.z, 4, 1.4); }
  if (t > 9.8) { hero.root.visible = true; date.fig.root.visible = true; W.dur = 0; }
  return false;
}
function poseHips() { hero.hips.position.y = hero.legLen; date.fig.inner.position.y = 0; }
function updateWoo(dt) {
  const W = woo; W.t += dt; const k = W.t;
  for (const key of ['a', 'b', 'x', 'y']) input.consume(key);
  const bounce = Math.abs(Math.sin(k * 7.5));
  if (W.kind === 'bed') { if (wooBed(W, dt)) return; }
  else {
    W.car.b.group.position.y += bounce * 0.14; W.car.b.group.rotation.z = Math.sin(k * 7.5) * 0.04;
    if (Math.random() < dt * 6) hearts(W.car.s.x, W.car.s.z, 2, 2.4);
  }
  if (W.kind === 'car' || W.under) if (Math.random() < dt * 4) { const A = audio(); if (A) sfx.note(rand(160, 230), A.currentTime, 0.12, 'square', 0.015, 900); } // bed springs
  if (k >= W.dur) {
    woo = null;
    fade(() => {
      advanceTime(1); feed({ mood: 40, energy: -12 }); P.hp = maxHP(); gainXP('charm', 25); gainXP('stamina', 15);
      if (W.kind === 'bed') { dyn.remove(W.g); for (const q of [W.me, W.her]) { dyn.remove(q.blur); q.blur.material.dispose(); } hero.root.rotation.set(0, P.face, 0); hero.hips.position.y = hero.legLen; date.fig.root.rotation.set(0, 0, 0); date.fig.inner.position.y = 0; if (W.bedMesh) W.bedMesh.position.y = 0; const w = bedSide(W.bed); P.x = w.x; P.z = w.z; heroRoot.visible = true; const w2 = bedSide(W.bed, w); date.x = w2.x; date.z = w2.z; date.fig.root.visible = true; }
      else { W.car.b.group.rotation.z = 0; for (const [m, c] of W.glass) m.color.setHex(c); }
      bumpRel(date.id, 25, false); date.interest += 20; stats.woohoo = (stats.woohoo || 0) + 1; maybePregnant(date.id, date.tryBaby); cheatCheck(date.id);
      const n = date.name; saveGame();
      // your girlfriend / wife stays with you afterwards; a date heads home
      if (partner()?.id === date.id) { date.since = gameHours(); setTimeout(() => toast(`${n}: "${pick(['I love you, you know that?', 'Mmm. Stay here a bit.', 'Best night ever.'])}" (Mood maxed, Charm up)`, 3), 1600); }
      else setTimeout(() => endDate(`${n}: "Wow. Call me, okay?" (Mood maxed, Charm up)`), 1600);
    });
  }
}
// ================================================================ FRIENDS: people who like you will hang out, ride with you, have your back in a fight and watch for cops
let buddy = null;
const buddyWho = () => buddy && ({ key: 'buddy:' + buddy.name, name: buddy.name, cfg: buddy.look.cfg, pitch: lookIsFem(buddy.look) ? 310 : 170 });
function startBuddy(p, per) {
  p.ev = true; p.kind = 'loose'; p.buddy = true; peds.release(p);
  buddy = { p, per, look: p.look, name: (p.first || p.name || 'Mate').split(' ')[0], since: gameHours(), hitT: 0, sayT: 8 };
  per.met = true; bumpPerson(per, 4);
  toast(`${buddy.name} is hanging out with you. They'll ride along and back you up.`, 3);
}
function endBuddy(line) {
  if (!buddy) return; const b = buddy; buddy = null;
  if (line) subs.say({ key: 'buddy:' + b.name, name: b.name, cfg: b.look.cfg, pitch: lookIsFem(b.look) ? 310 : 170 }, line, { expr: 'happy' });
  bumpPerson(b.per, 6);
  if (peds.list.includes(b.p)) { b.p.root.visible = true; b.p.buddy = false; b.p.ev = false; b.p.state = 'wander'; b.p.hx = b.p.x; b.p.hz = b.p.z; b.p.tx = b.p.x + rand(-15, 15); b.p.tz = b.p.z + rand(-15, 15); b.p.t = 5; }
}
function buddyRespawn() { // they waited outside while you were in somewhere
  if (!buddy || peds.list.includes(buddy.p)) return;
  const p = peds.makePed(buddy.look); Object.assign(p, { kind: 'loose', x: P.x + 1.2, z: P.z + 0.8, hx: P.x, hz: P.z, state: 'idle', t: 999, ev: true, buddy: true, name: buddy.p.name, first: buddy.name, person: buddy.per }); peds.list.push(p); buddy.p = p;
  if (Math.random() < 0.5) setTimeout(() => buddy && subs.say(buddyWho(), pick(['Took your time.', 'Finally! I was getting bored out here.', 'All good in there?']), { expr: 'neutral' }), 900);
}
function updateBuddy(dt) {
  if (!buddy || inside) return;
  const b = buddy, p = b.p; if (!peds.list.includes(p)) { buddyRespawn(); return; }
  if (gameHours() - b.since > 4 && !WANT.stars) return endBuddy(pick(['Right, I gotta head off. Good times though!', 'I\'m beat. Catch you later, yeah?', 'Gotta go. Hit me up again!']));
  if (p.state === 'down') return;
  // riding along: they hop in with you
  if (ride && !ride.b.two) { if (!b.inCar && Math.hypot(p.x - P.x, p.z - P.z) < 14 && seatsFor(ride) >= 2) { b.inCar = true; p.root.visible = false; } if (b.inCar) { p.x = P.x; p.z = P.z; p.state = 'idle'; p.t = 999; if (ride.b.seat) seatPassenger(p, ride, 2); else p.root.visible = false; } }
  else if (b.inCar) { b.inCar = false; unseatPassenger(p); p.root.visible = true; const h = (ride || myCar)?.s?.h ?? P.face; p.x = P.x + Math.cos(h) * 1.6; p.z = P.z - Math.sin(h) * 1.6; p.state = 'idle'; }
  if (b.inCar) { buddyTalk(dt); return; }
  // backup: anyone fighting you gets a visit
  const foe = peds.list.find(q => q !== p && q.state !== 'down' && (q.angry || q.hunter) && Math.hypot(q.x - P.x, q.z - P.z) < 16);
  if (foe) { const d = Math.hypot(foe.x - p.x, foe.z - p.z); b.hitT -= dt;
    if (d > 1.2) { p.state = 'chase'; p.tx = foe.x; p.tz = foe.z; } else { p.state = 'punch'; p.tx = foe.x; p.tz = foe.z; if (b.hitT <= 0) { b.hitT = rand(0.6, 1.1); sfx.punch?.(); peds.hit(foe, Math.sign(foe.x - p.x) || 1, 0, 1, 3); } }
    if (!b.fightSaid && chatCd('buddyfight', 20)) { b.fightSaid = true; subs.say(buddyWho(), pick(['Oi! Leave my mate alone!', 'I got you, I got you!', 'You picked the wrong guy!']), { expr: 'angry', pri: 3, now: true }); }
    return; }
  b.fightSaid = false;
  // follow you: walk when you walk, run when you run
  const d = Math.hypot(P.x - p.x, P.z - p.z), bx = P.x - Math.sin(P.face) * 1.6 + Math.cos(P.face) * 0.9, bz = P.z - Math.cos(P.face) * 1.6 - Math.sin(P.face) * 0.9;
  if (d > 40) { p.x = bx; p.z = bz; }
  if (d > 6) { p.state = 'chase'; p.tx = bx; p.tz = bz; }
  else if (d > 2.4) { p.state = 'march'; p.mspd = input.stick.m > 0.85 ? 4.2 : 1.7; p.tx = bx; p.tz = bz; p.lookX = P.x; p.lookZ = P.z; }
  else if (p.state !== 'talk') { p.state = 'talk'; p.lookX = P.x; p.lookZ = P.z; }
  else { p.lookX = P.x; p.lookZ = P.z; }
  buddyTalk(dt);
}
function buddyTalk(dt) {
  const b = buddy; b.sayT -= dt;
  // lookout: they spot cops when you're carrying
  if (stashCount() > 0 && !WANT.stars && chatCd('lookout', 35)) { const cd = nearestCop(P.x, P.z); if (cd < 32) { subs.say(buddyWho(), pick(['Cops. Act natural.', 'Heads up, police, two o\'clock.', 'Feds! Be cool, be cool.']), { expr: 'shock', pri: 3 }); return; } }
  if (b.sayT > 0 || subs.busy) return; b.sayT = rand(28, 55);
  const f = focusPos(), lines = [];
  if (ride) lines.push(Math.abs(ride.s.v) * 2.237 > 70 ? 'Haha, faster! FASTER!' : 'Nice ride, man.', 'Stick something good on the radio.');
  if (night > 0.5) lines.push('Where we heading tonight?', 'We should hit the Neon Room.');
  if (wet > 0.3) lines.push('This rain, man...');
  if (cityAt(f.x, f.z, 2)?.id === 'east') lines.push('Eastport. Keep your head down round here.');
  if (date) lines.push('Third wheel over here, don\'t mind me.');
  lines.push('This is fun. We should do this more.', 'You still owe me a burger, by the way.', 'Did you see that guy\'s hair? Unreal.', 'Bay City, man. Never boring.');
  subs.say(buddyWho(), pick(lines), { expr: pick(['happy', 'happy', 'neutral']) });
}
async function talkBuddy() {
  const b = buddy, p = b.p; peds.talk(p, P.x, P.z);
  beginTalk(b.look.cfg, b.p.name || b.name, 'Your friend', lookIsFem(b.look) ? 300 : 170, null);
  await talk.say(pick(['What\'s the plan?', 'Yo. What we doing?', 'I\'m down for whatever.']));
  const k = await talk.choose([I('food', 'Let\'s grab food'), I('chat', 'Just chatting'), I('x', 'Catch you later')]);
  if (k === 0) { if (money < 20) await talk.say('You\'re broke, aren\'t you. Next time.'); else { spend(20); feed({ hunger: 35, mood: 8 }); bumpPerson(b.per, 6); advanceTime(0.5); await talk.say(pick(['Best burger in the bay. Cheers, man.', 'Food coma incoming.'])); } }
  else if (k === 1) { feed({ mood: 5 }); bumpPerson(b.per, 3); await talk.say(pick(['Honestly, you\'re one of the good ones.', 'Remember that time... nah, never mind. Ha!', 'We should go to a match sometime.'])); }
  endTalk();
  if (k === 2) return endBuddy(pick(['Later! Hit me up.', 'Laters. Good times.']));
  p.state = 'idle';
}
async function talkToPed(p) {
  if (p.kind === 'homeless') return talkHomeless(p);
  if (buddy && p === buddy.p) return talkBuddy();
  { const E = streetEvents.find(E => E.kind === 'busk' && E.perf === p); if (E) return talkBusker(E); }
  if (p.vendor) { const E = streetEvents.find(E => E.kind === 'market' && E.vendors.includes(p)); if (E) return talkStall(E, p); }
  if (p.protest && !p.angry) { const E = streetEvents.find(E => E.kind === 'protest' && E.crowd.includes(p)); if (E) return talkProtest(E, p); }
  if (p.parade) { peds.talk(p, P.x, P.z); feed({ mood: 3 }); toast(pick(['"Happy parade day!" They high-five you without breaking step.', '"Come on, dance with us!"', 'They hand you a little flag. Nice.']), 2.4); setTimeout(() => { if (p.state === 'talk') p.state = 'march'; }, 1500); return; }
  if (lifeAct?.kind === 'approach' && lifeAct.p === p) { const A2 = lifeAct; lifeAct = null; peds.talk(p, P.x, P.z); return runEventTalk(A2.ev, A2.data, { cfg: A2.cfg, name: A2.who.name || 'Stranger', tag: A2.who.tag || 'Stranger', p: A2.p }, () => endLifePed(A2)); } // the person walking up to you
  if (p.gang && !p.angry) return talkGang(p);
  if (p.guard) return talkGuard(p);
  if (p.angry) { toast(`${p.name || 'They'} want their car back!`); return; }
  if (lookIsFem(p.look)) p.name ??= pick(FEM_NAMES);
  p.first = (p.name || '').split(' ')[0];
  peds.talk(p, P.x, P.z);
  p.buyer ??= Math.random() < (night > 0.5 ? 0.55 : 0.32) + (lvl('dealing') - 1) * 0.03;
  p.chats ??= 0;
  const bg = zoneBg(p.x, p.z);
  beginTalk(p.look.cfg, p.name || 'Stranger', p.dog ? `${zoneName(p.x, p.z)} · walking the dog` : zoneName(p.x, p.z), lookIsFem(p.look) ? 300 + Math.random() * 120 : 140 + Math.random() * 120, null, p.dog ? (() => { const d = p.dog.root.clone(true); d.position.set(0, 0, 0); return d; })() : null);
  const per = personOf(p);
  if (per) {
    $('talkTag').textContent = per.met || per.rap ? vibe(p) : zoneName(p.x, p.z);
    const gs = per.gossip; if (gs && gs.d >= dayN - 5 && !per.met) { per.gossip = null; const who = { partner: 'My partner', friend: 'My friend', sibling: 'My ' + (per.fem ? 'brother' : 'sister') }[gs.rel] || 'Someone'; await talk.say(gs.good ? `${who} ${gs.from} told me about you. Says you\'re alright.` : `${who} ${gs.from} told me what you did. I know who you are.`); }
    const w = per.wit; per.wit = null;
    if (w && w.d >= dayN - 2) {
      const W = WITNESS[w.k];
      await talk.say(w.victim ? (w.k === 'kind' ? 'You\'re the one who helped me. Thank you, honestly.' : pick(['YOU. You\'re the one who did that to me!', 'I remember your face. You\'ve got some nerve.'])) : pick(W.say[W[per.att] > 0 ? 'good' : 'bad']));
    } else await talk.say(per.rap <= -60 ? pick(['Get away from me.', 'Not you again.']) : per.rap < 0 ? pick(['...What do you want?', 'Oh. It\'s you.']) : per.met && per.rap >= 55 ? pick(['Hey! Good to see you!', 'There they are! How you been?']) : per.met ? pick(['Oh hey, you again.', 'Hey, how\'s it going?']) : pick(night > 0.5 && Math.random() < 0.5 ? PED_LINES.night : PED_LINES[bg] || PED_LINES.city));
    if (per.rap <= -60) {
      if (!per.fem && per.rap <= -80 && Math.random() < 0.35) { endTalk(); peds.release(p); p.angry = true; p.angryT = 14; toast(`${p.first || p.name} wants to fight you!`, 2); return; }
      const k = await talk.choose([I('hand', 'I\'m sorry about before'), I('x', 'Whatever')]);
      if (k === 0 && per.sorry !== dayN) { per.sorry = dayN; bumpPerson(per, 10 + lvl('charm')); await talk.say(pick(['...Fine. But I\'m watching you.', 'Words are cheap. We\'ll see.'])); }
      else await talk.say(k === 0 ? 'You said that already.' : 'Yeah. Whatever.');
      endTalk(); peds.release(p); return;
    }
  } else await talk.say(pick(night > 0.5 && Math.random() < 0.5 ? PED_LINES.night : PED_LINES[bg] || PED_LINES.city));
  if ((stats.hygiene ?? 80) < 15 && Math.random() < 0.5) { await talk.say(pick(['Whoa. When did you last shower?', 'No offence, but you smell like a gym bag.', '*steps back* ...Hi.'])); if (per) bumpPerson(per, -3); }
  if (per) p.buyer = p.buyer && per.att !== 'straight' || (per.att === 'edgy' && per.rap >= 20);
  let done = false;
  while (!done) {
    const have = GOODS.filter(g => stash[g.id] > 0);
    const opts = [{ label: I('chat', lookIsFem(p.look) && p.interest >= 35 ? 'Chat <small>(she\'s into you)</small>' : 'Chat'), id: 'chat' }];
    if (per && per.met && per.rap >= 30 && !buddy && !(date && lookIsFem(p.look))) opts.push({ label: I('people', 'Wanna hang out?'), id: 'hang' });
    const sc = per?.cid != null ? CIT()[per.cid] : null, fstep = sc?.story ? ((stats.favours ||= {})[sc.cid] || 0) : 3;
    if (sc?.story && fstep < 3 && per.rap >= -10 && !(life().errands || []).some(e => e.key === 'favour' && e.data.cid === sc.cid) && (stats.favourDay?.[sc.cid] ?? -1) < dayN) opts.push({ label: I('star', fstep ? 'Anything else I can do?' : 'You look like you need a hand'), id: 'favour' });
    if (sc && !sc.story && per.met) opts.push({ label: I('people', 'Who do you hang out with?'), id: 'circle' });
    if (have.length) opts.push({ label: I('deal', 'Offer something'), id: 'sell' });
    opts.push({ label: I('cash', 'Rob them'), id: 'rob' }, { label: I('x', 'Bye'), id: 'bye' });
    const c = opts[await talk.choose(opts)].id;
    if (c === 'chat') { const r = await socialTalk(p, bg); $('talkTag').textContent = vibe(p); if (r === 'date') { endTalk(); return; } if (r === 'left') { endTalk(); peds.release(p); peds.flee(p, P.x, P.z); return; } if (r === 'done') break; continue; }
    if (c === 'favour') { // story people: a chain of three favours, each sends you somewhere in the city
      const ask = sc.story.asks[fstep]; if (fstep === 0) await talk.say(sc.story.bio.replace(/\.$/, '...') + ' Long story.');
      await talk.say(ask);
      const k = await talk.choose([I('check', 'Leave it with me'), I('x', 'Not today')]);
      if (k === 0) { const where = favourPlace(ask); lifeApi().errand(where, 'favour', { cid: sc.cid, step: fstep }, `${sc.first}'s favour`); bumpPerson(per, 4); await talk.say(pick(['You\'re a lifesaver.', 'Seriously? Thank you.', 'I owe you one.'])); }
      else await talk.say(pick(['No worries. Another time.', 'Yeah... okay.']));
      continue; }
    if (c === 'circle') { const rels = sc.rel.map(q => ({ ...q, c: CIT()[q.cid] })); await talk.say(rels.length ? rels.map(q => q.k === 'partner' ? `My ${q.c.fem ? 'girlfriend' : 'boyfriend'}, ${q.c.first}. ${q.c.says.replace(/^I('m| am) /, q.c.fem ? 'She\'s ' : 'He\'s ').replace(/^I /, q.c.fem ? 'She ' : 'He ')}` : q.k === 'sibling' ? `My ${q.c.fem ? 'sister' : 'brother'} ${q.c.first}.` : `My mate ${q.c.first}. ${q.c.eve === 'home' ? 'Homebody.' : `Usually at the ${q.c.eve} in the evenings.`}`).join(' ') : 'Honestly? Mostly my cat.'); continue; }
    if (c === 'hang') { await talk.say(lookIsFem(p.look) ? 'Wanna hang out? Just as mates.' : 'You free? Wanna hang out?', 'you');
      if (per.rap >= 30 && Math.random() < 0.55 + per.rap / 200) { await talk.say(pick(['Yeah, go on then!', 'Sure, I\'ve got nothing on.', 'Thought you\'d never ask!'])); endTalk(); startBuddy(p, per); return; }
      await talk.say(pick(['Can\'t right now, rain check?', 'Ah, I\'m busy today. Another time!'])); continue; }
    if (c === 'sell') {
      await talk.say("Psst. You looking for something?", 'you');
      if (!p.buyer) { if (per) bumpPerson(per, per.att === 'straight' ? -20 : -6); await talk.say(pick(["What? No! Get away from me!", "I'm calling my mom.", "Not interested, weirdo."])); peds.release(p); peds.flee(p, P.x, P.z); endTalk(); return; }
      const g = pick(have), n = Math.min(stash[g.id], 1 + Math.floor(Math.random() * (2 + lvl('dealing') / 3))), price = Math.round(g.base * rand(1.15, 1.6) * (1 + (lvl('charm') - 1) * 0.02)) * n;
      await talk.say(`...Maybe. I'll give you ${fmt(price)} for ${n} ${g.name}.`);
      const k = await talk.choose([I('check', 'Deal'), I('x', 'No way')]);
      if (k === 0) { stash[g.id] -= n; addMoney(price); gainXP('dealing', Math.round(price / 40)); bumpRel('street', 2); if (per) bumpPerson(per, 6); p.custNpc = true; dealHeat(p.x, p.z, price); p.custNpc = false; await talk.say(pick(["Pleasure. We never met.", "Sweet. Later."])); p.buyer = false; done = true; }
      else await talk.say('Your loss.');
    }
    else if (c === 'rob') {
      await talk.say('Wallet. Now.', 'you');
      const fight = Math.random() < 0.3 - (lvl('strength') - 1) * 0.03 && arsenal.cur === 'fist';
      if (fight) { await talk.say("Ha! With what, your fists? Get lost!"); peds.release(p); endTalk(); hurt(12); return; }
      const amt = 20 + Math.floor(Math.random() * 110);
      await talk.say(pick(["Okay okay! Take it! Don't hurt me!", "Seriously?! Fine!", "This city, man..."]));
      if (lifeAct?.p === p) lifeAct.robbed = true;
      endTalk(); peds.release(p); dropCash(p.x, p.z, amt); peds.flee(p, P.x, P.z); peds.scare(P.x, P.z, 16); feed({ mood: -2 }); crime(0.8); witness('rob', p.x, p.z, p); return;
    }
    else { await talk.say(pick(['See ya.', 'Take care!', 'Bye.'])); done = true; }
  }
  peds.release(p); endTalk();
}

// ================================================================ SHEETS (bottom sheets over the game or a conversation)
function sheet(title, render, bind) {
  return new Promise(res => {
    const close = (v) => { $('dealUI').classList.add('hidden'); res(v); };
    const draw = () => { $('dealBody').innerHTML = render(); bind?.($('dealBody'), close, draw); $('dealBody').querySelectorAll('[data-done]').forEach(b => b.onclick = () => close(sheet.value || 0)); };
    $('dealTitle').textContent = title; draw();
    $('dealUI').classList.remove('hidden');
    $('dealClose').onclick = () => close(sheet.value || 0); sheet.value = 0;
  });
}

// ================================================================ passive captions: the city you overhear (animals, chatter, sirens, thunder)
// a faint one-line caption above the controls; never queues behind or blocks real notifications
const AMB_ANIMAL = {
  cow: ['Mooooo.', 'Moo.', 'Mmmooooo...'], sheep: ['Baaa-aa.', 'Baaa.', 'Meh-eh-eh.'], goat: ['Meeeeh!', 'Mehhh.'], pig: ['Oink oink.', 'Oink!', '*Snuffle snuffle*'],
  horse: ['*Neighs*', '*Whinnies*', '*Snorts*'], chicken: ['Buk buk buk... BUKAAW!', 'Bwok?', '*Clucks*'], dog: ['Woof! Woof!', 'Ruff!', '*Barks*'], cat: ['Meow?', 'Mrrrow.', '*Purrs*'],
  seagull: ['Kyow! Kyow!', '*Squawks for your chips*', 'Kee-ow!'], pigeon: ['Coo-roo-coo.', '*Coos*'], crow: ['Caw! Caw!', 'Caaaw.'], owl: ['Hoo... hoo-hooo.', 'Hooo.'],
  coyote: ['Awoooo!', '*Yips in the dark*'], deer: ['*Snorts and stamps*'], raccoon: ['*Chitters at you*', '*Rustles in the bin*'], squirrel: ['*Chatters angrily*', '*Scampers up a tree*'], possum: ['*Hisses*'],
};
const AMB_NAME = { cow: 'Cow', sheep: 'Sheep', goat: 'Goat', pig: 'Pig', horse: 'Horse', chicken: 'Chicken', dog: 'Dog', cat: 'Cat', seagull: 'Seagull', pigeon: 'Pigeon', crow: 'Crow', owl: 'Owl', coyote: 'Coyote', deer: 'Deer', raccoon: 'Raccoon', squirrel: 'Squirrel', possum: 'Possum' };
const AMB_ICON = { cow: 'paw', sheep: 'paw', goat: 'paw', pig: 'paw', horse: 'paw', chicken: 'paw', dog: 'paw', cat: 'paw', seagull: 'paw', pigeon: 'paw', crow: 'paw', owl: 'paw', coyote: 'paw', deer: 'paw', raccoon: 'paw', squirrel: 'paw', possum: 'paw' };
const OVERHEAR = {
  phone: ['"No, YOU hang up first..."', '"I told her, I said, not in my house."', '"Babe, I\'m literally five minutes away."', '"Can you put the oven on? I\'m nearly home."', '"He did WHAT? No way."', '"Mum, I\'m fine, stop worrying."', '"Sell. Sell everything. Now."', '"I\'m outside. No, the OTHER outside."'],
  pair: ['"Where do you want to eat?" "I don\'t mind." "Pizza?" "Not pizza."', '"Did you lock the car?" "...Did YOU?"', '"Is that the new place on Main?"', '"I swear this street wasn\'t here yesterday."'],
  self: ['"Where did I park..."', '"Keys, phone, wallet. Keys, phone, wallet."', '"Ugh, Mondays."', '"Was it left or right..."', '*Humming a tune*', '*Whistling*', '"Five more minutes and I\'m done."'],
  night: ['"One more bar, then home. Promise."', '"Who wants chips? I want chips."', '"Shh! People are sleeping."', '"Best. Night. Ever."'],
  rain: ['"Of course I left my umbrella at home."', '"It was sunny ten minutes ago!"', '"My shoes are soaked."'],
  beach: ['"Did you bring the sun cream?"', '"Last one in buys ice cream!"', '"There\'s sand in EVERYTHING."', '"The water\'s freezing!"'],
  wanted: ['"Isn\'t that the guy from the news?"', '"Don\'t look. Just keep walking."', '"Call the police... no, wait, don\'t."'],
  famous: ['"Oh my god, is that...?"', '"Can I get a selfie? No? Okay."', '"My cousin knows him, swear."'],
};
let ambEl = null, ambT = 0, ambCD = 0, ambScan = 0, sirenAmbT = 0;
function ambient(kind, who, text) {
  if (state !== 'play' || ambT > 0.4 || subs.busy && Math.random() < 0.5) return false;
  if (!ambEl) { ambEl = document.createElement('div'); ambEl.id = 'amb'; $('hud').appendChild(ambEl); }
  ambEl.innerHTML = `${who ? `<b>${who}</b>` : ''}<span>${text}</span>`; ambEl.classList.remove('show'); void ambEl.offsetWidth; ambEl.classList.add('show');
  ambT = Math.max(2.4, text.split(' ').length * 0.32 + 1.4); ambCD = rand(3, 6); return true;
}
function updateAmbient(dt) {
  if (ambT > 0) { ambT -= dt; if (ambT <= 0 && ambEl) ambEl.classList.remove('show'); }
  if (ambCD > 0) ambCD -= dt;
  if ((ambScan -= dt) > 0) return; ambScan = 0.4;
  if (inside || state !== 'play' || talk.active) return;
  // animals near you call out (with sound), each on its own cooldown
  for (const a of animals?.list || []) {
    const d = Math.hypot(a.x - P.x, a.z - P.z); if (d > 16 || !AMB_ANIMAL[a.kind]) continue;
    a.callT = (a.callT ?? rand(1, 8)) - 0.4; if (a.callT > 0 && !a.bark) continue;
    a.callT = rand(9, 22); if (a.kind === 'owl' || a.kind === 'coyote') { if (night < 0.5) continue; }
    if (Math.random() < (a.bark ? 1 : 0.55)) { animalCall(a.kind, 1 - d / 18); if (ambCD <= 0 || a.bark) ambient('animal', AMB_NAME[a.kind], pick(AMB_ANIMAL[a.kind])); a.bark = 0; return; }
  }
  // sirens close by
  if ((sirenAmbT -= 0.4) <= 0 && copCars.some(v => v.siren?.[0]?.visible && Math.hypot(v.s.x - P.x, v.s.z - P.z) < 70)) { sirenAmbT = 25; if (ambient('siren', null, pick(['*Sirens wailing*', '*Sirens getting closer*', '*Police sirens nearby*']))) return; }
  if (ambCD > 0) return;
  // overheard: someone walking past you says something
  let best = null, bd = 7; for (const q of peds.list) { if (q.state === 'down' || q.state === 'talk' || q.ev) continue; const d = Math.hypot(q.x - P.x, q.z - P.z); if (d < bd) { bd = d; best = q; } }
  if (!best || (best.overT || 0) > time || Math.random() > 0.18) return; best.overT = time + 60;
  const W = WANT.stars > 0, rainy = wx().k === 'rain' || wx().k === 'storm', pool = W && Math.random() < 0.6 ? OVERHEAR.wanted : rel('street') > 60 && Math.random() < 0.25 ? OVERHEAR.famous : best.kind === 'beach' ? OVERHEAR.beach : rainy && Math.random() < 0.5 ? OVERHEAR.rain : night > 0.6 && Math.random() < 0.5 ? OVERHEAR.night : pick([OVERHEAR.phone, OVERHEAR.self, OVERHEAR.phone, OVERHEAR.pair]);
  ambient('talk', (best.name || 'Passer-by').split(' ')[0], pick(pool));
}
// ================================================================ the deal ring (Scarface style): hold, the ring fills, let go in the sweet spot
// buy: sweet spot = cheaper; miss = you pay full and they short you. sell: sweet spot = they pay more; miss = they lowball you.
// "Play it safe" skips the ring at the normal price. The better they know you, the wider and slower the sweet spot.
function dealRing({ mode, label, base, relId, face }) {
  return new Promise(res => {
    const r0 = rel(relId), width = clamp(0.085 + r0 * 0.0014 + (lvl('dealing') - 1) * 0.006, 0.085, 0.26), dur = 1.55 + r0 * 0.012 + (lvl('charm') - 1) * 0.04;
    const z0 = rand(0.42, 0.86 - width), z1 = z0 + width;
    const ov = document.createElement('div'); ov.id = 'ringUI';
    ov.innerHTML = `<div class="rcard"><div class="rtop"><b>${mode === 'buy' ? 'Buying' : 'Selling'}</b><span>${label}</span></div>
      <div class="rwrap"><canvas width="440" height="440"></canvas><div class="rmid"><b class="rnum">${fmt(base)}</b><small class="rsub">Hold to push</small></div></div>
      <p class="rtip">Hold, and let go inside the <span class="g">green</span>. Go past it and they rip you off.</p>
      <div class="rbtns"><button class="rsafe">Play it safe <small>${fmt(base)}</small></button><button class="rhold">${svg('deal', 'sm')} Hold</button></div></div>`;
    document.body.appendChild(ov);
    const cv = ov.querySelector('canvas'), x = cv.getContext('2d'), num = ov.querySelector('.rnum'), sub = ov.querySelector('.rsub'), hold = ov.querySelector('.rhold');
    let f = 0, holding = false, done = false, last = 0, raf = 0;
    const A0 = -Math.PI / 2, ang = v => A0 + v * Math.PI * 2;
    const draw = () => {
      x.clearRect(0, 0, 440, 440); x.lineCap = 'round';
      x.lineWidth = 34; x.strokeStyle = 'rgba(255,255,255,.09)'; x.beginPath(); x.arc(220, 220, 180, 0, 7); x.stroke();
      x.strokeStyle = 'rgba(255,59,74,.35)'; x.beginPath(); x.arc(220, 220, 180, ang(z1), ang(1)); x.stroke(); // past it: ripped off
      const g = x.createLinearGradient(0, 0, 440, 440); g.addColorStop(0, '#4cd964'); g.addColorStop(1, '#b4ff6a');
      x.strokeStyle = g; x.lineWidth = 40; x.beginPath(); x.arc(220, 220, 180, ang(z0), ang(z1)); x.stroke();
      x.strokeStyle = '#ffd23f'; x.lineWidth = 40; const mid = (z0 + z1) / 2; x.beginPath(); x.arc(220, 220, 180, ang(mid - 0.008), ang(mid + 0.008)); x.stroke(); // dead centre = best price
      if (f > 0) { const inZ = f >= z0 && f <= z1; x.strokeStyle = inZ ? '#ffffff' : f > z1 ? '#ff3b4a' : '#38e8ff'; x.lineWidth = 18; x.beginPath(); x.arc(220, 220, 180, A0, ang(f)); x.stroke();
        const a = ang(f); x.fillStyle = '#fff'; x.beginPath(); x.arc(220 + Math.cos(a) * 180, 220 + Math.sin(a) * 180, 16, 0, 7); x.fill(); }
    };
    const price = v => { const inZ = v >= z0 && v <= z1, acc = inZ ? 1 - Math.abs(v - (z0 + z1) / 2) / (width / 2) : 0; return { inZ, acc, k: mode === 'buy' ? 1 - (0.12 + 0.23 * acc) * (inZ ? 1 : 0) : 1 + (0.12 + 0.23 * acc) * (inZ ? 1 : 0) }; };
    const tick = ts => { if (done) return; const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      if (holding) { f += dt / dur; if (f >= 1) { f = 1; finish(); return; }
        const q = price(f); num.textContent = fmt(Math.round(base * q.k)); sub.textContent = q.inZ ? (q.acc > 0.75 ? 'Perfect...' : 'Sweet spot') : f > z1 ? 'Too greedy!' : 'Pushing...';
        if (q.inZ && !tick.buzz) { tick.buzz = true; navigator.vibrate?.(12); const A = audio(); if (A) sfx.note(880, A.currentTime, 0.06, 'triangle', 0.05, 3000); } if (!q.inZ) tick.buzz = false; }
      draw(); raf = requestAnimationFrame(tick); };
    const close = out => { done = true; cancelAnimationFrame(raf); setTimeout(() => ov.classList.add('out'), out.kind === 'safe' ? 0 : 900); setTimeout(() => { ov.remove(); res(out); }, out.kind === 'safe' ? 180 : 1150); };
    const finish = () => { if (done) return; holding = false; const q = price(f), A = audio();
      if (q.inZ) { const save = Math.round(Math.abs(1 - q.k) * 100); num.textContent = fmt(Math.round(base * q.k)); sub.textContent = q.acc > 0.75 ? `PERFECT · ${save}% ${mode === 'buy' ? 'off' : 'extra'}` : `Sweet spot · ${save}% ${mode === 'buy' ? 'off' : 'extra'}`; ov.classList.add('win');
        navigator.vibrate?.([20, 30, 40]); if (A) [660, 880, 1320].forEach((h, i) => sfx.note(h, A.currentTime + i * 0.07, 0.12, 'triangle', 0.06, 3200)); bumpRel(relId, q.acc > 0.75 ? 2 : 1, false); gainXP('dealing', 12 + Math.round(q.acc * 20)); close({ kind: 'sweet', k: q.k, acc: q.acc }); }
      else { const short = rand(0.62, 0.82); ov.classList.add('lose'); sub.textContent = f > z1 ? 'Too greedy. They\'re ripping you off.' : 'Weak. They saw you coming.'; navigator.vibrate?.(120); if (A) { sfx.note(220, A.currentTime, 0.25, 'sawtooth', 0.05, 900); sfx.note(160, A.currentTime + 0.18, 0.3, 'sawtooth', 0.05, 700); }
        num.textContent = mode === 'buy' ? `Only ${Math.round(short * 100)}%` : fmt(Math.round(base * short)); bumpRel(relId, -1, false); gainXP('dealing', 4); close({ kind: 'miss', short }); } };
    hold.addEventListener('pointerdown', e => { e.preventDefault(); if (done || f > 0) return; holding = true; hold.classList.add('on'); });
    const up = () => { if (holding) { hold.classList.remove('on'); finish(); } };
    hold.addEventListener('pointerup', up); hold.addEventListener('pointerleave', up); hold.addEventListener('pointercancel', up);
    ov.querySelector('.rsafe').onclick = () => { if (f > 0 || done) return; close({ kind: 'safe', k: 1 }); };
    draw(); raf = requestAnimationFrame(tick);
  });
}
// you can't flip product straight back to the dealer who sold it to you: move it somewhere else
const ownStock = (p, gid) => (stats.dealBuys?.[p.id + ':' + gid] ?? -99) >= dayN - 1;
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
      <div class="tbar"><div class="qty"><button data-q="-">−</button><b>${qty}</b><button data-q="+">+</button><button data-q="max">MAX</button><button class="done" data-done="1">Done</button></div>
      <button class="tbuy" ${qty > maxBuy ? 'disabled' : ''}>Buy ${fmt(pr.buy * qty)}</button>
      ${ownStock(p, sel) ? `<button class="tsell" disabled>Their own stock</button>` : `<button class="tsell" ${have ? '' : 'disabled'}>Sell ${fmt(pr.sell * Math.min(qty, have))}</button>`}</div>`;
  }, (root, close, draw) => {
    const pr = prices[sel], have = stash[sel] || 0, room = stashCap() - stashCount(), maxBuy = Math.max(0, Math.min(room, Math.floor(money / pr.buy)));
    root.querySelectorAll('.trow').forEach(b => b.onclick = () => { sel = b.dataset.g; qty = 1; sfx.click(); draw(); });
    root.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const v = b.dataset.q; qty = v === '+' ? qty + 1 : v === '-' ? qty - 1 : Math.max(maxBuy, have); sfx.click(); draw(); });
    root.querySelector('.tbuy').onclick = async () => { if (qty > maxBuy) return; const g = GOODS.find(q => q.id === sel), base = pr.buy * qty, n0 = qty;
      const r = await dealRing({ mode: 'buy', label: `${n0} × ${g.name}`, base, relId: p.id });
      const v = Math.round(base * (r.k || 1)), got = r.kind === 'miss' ? Math.max(1, Math.floor(n0 * r.short)) : n0; if (v > money) return;
      spend(v); stash[sel] = (stash[sel] || 0) + got; (stats.dealBuys ||= {})[p.id + ':' + sel] = dayN; volume += v; sheet.value = volume; gainXP('dealing', Math.round(v / 60)); qty = 1; saveGame(); draw();
      toast(r.kind === 'sweet' ? `Bought ${got} ${g.name} for ${fmt(v)}. Saved ${fmt(base - v)}.` : r.kind === 'miss' ? `${p.npcName || 'They'} shorted you: ${got} of ${n0} ${g.name} for ${fmt(v)}.` : `Bought ${got} ${g.name} for ${fmt(v)}.`, 2.6); };
    root.querySelector('.tsell').onclick = async () => { const n = Math.min(qty, have); if (!n || ownStock(p, sel)) return; const g = GOODS.find(q => q.id === sel), base = pr.sell * n;
      const r = await dealRing({ mode: 'sell', label: `${n} × ${g.name}`, base, relId: p.id });
      const v = Math.round(base * (r.kind === 'miss' ? r.short : r.k || 1)); stash[sel] = Math.max(0, (stash[sel] || 0) - n); addMoney(v); volume += v; sheet.value = volume; gainXP('dealing', Math.round(v / 40)); qty = 1; saveGame(); draw();
      toast(r.kind === 'sweet' ? `Sold ${n} ${g.name} for ${fmt(v)}. ${fmt(v - base)} extra.` : r.kind === 'miss' ? `${p.npcName || 'They'} lowballed you: ${fmt(v)} for ${n} ${g.name}.` : `Sold ${n} ${g.name} for ${fmt(v)}.`, 2.6); };
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
    <p>A ${INTERIORS[p.home].name.toLowerCase()} you can furnish and live in. Rent it out for <b>${fmt(p.income)}</b> every morning, or live in it and move your family in. Adds <b>+20</b> stash space.</p>
    <div class="price">${fmt(p.price)}</div>`, [
    { label: `Buy for ${fmt(homePrice(p))}${hasDegree('realestate') ? ' <small>(realtor discount)</small>' : ''}`, cls: 'big', disabled: money < homePrice(p), fn: () => { spend(homePrice(p)); owned.add(p.id); refreshPropertyMarkers(); saveGame(); closeModal(); toast(`${p.name} is yours! Walk in to move in.`, 3); feed({ mood: 20 }); } },
    { label: money < p.price ? `Need ${fmt(p.price - money)} more` : 'Not now', fn: closeModal },
  ]);
}
function openGame(p) {
  modal(`<div class="big-ico">${svg(p.icon, 'big')}</div><h3>${p.name}</h3><p>${p.desc}</p>`, [
    { label: 'Play', cls: 'big', fn: async () => {
      $('modal').classList.add('hidden');
      if (p.game === 'gym' && (stats.relDay['gym:' + dayN] || 0) >= GYM_DAILY) { setState('play'); toast(`You've done ${GYM_DAILY} workouts today. Come back tomorrow.`); return; }
      const r = await mini(p.game, {});
      if (r.money) addMoney(r.money);
      if (p.game === 'gym' && r.score) { workout(r.score, 'lift'); gainXP('strength', r.score * 8); }
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
  if (custMode() === 'on') { notify(name, `Need ${qty} ${g.name}. You around?`); sfx.coin(); }
  phoneBadge++;
}
function attachCustomer(c) {
  c.npc = { x: c.x, z: c.z, cfg: npcCfg('guest', c.seed), fig: null, face: 0, t: 0, name: c.name };
  c.marker = makeMarker(c.x, c.z, 'deal', PLACE_COLORS.customer, { place: { kind: 'customer', name: `${c.name}'s order`, id: c.id }, npc: true });
}
function removeCustomer(c) { customers.splice(customers.indexOf(c), 1); if (c.npc?.fig) dyn.remove(c.npc.fig.root); if (c.marker) { G.scene.remove(c.marker.g); markers.splice(markers.indexOf(c.marker), 1); } if (waypoint && waypoint.cust === c.id) clearWaypoint(); }
let custT = 90;
const CUST_MODES = { on: 'On', quiet: 'Silent', off: 'Off' };
const custMode = () => settings.custTexts || 'on';
function cycleCustMode() {
  const k = Object.keys(CUST_MODES), m = k[(k.indexOf(custMode()) + 1) % k.length]; settings.custTexts = m; applySettings();
  if (m === 'off') for (const c of [...customers]) removeCustomer(c);
  toast(m === 'off' ? 'Burner switched off. No customer texts.' : m === 'quiet' ? 'Burner on silent. Texts land in your inbox.' : 'Burner on.', 2.4);
}
function updateCustomers(dt) {
  custT -= dt;
  if (stats.burner === undefined) stats.burner = lvl('dealing') > 1; // old saves that were already dealing keep their texts
  if (custT <= 0 && !inside) { custT = rand(160, 300); if (stats.burner && custMode() !== 'off' && customers.length < 2 && (stashCount() > 0 || lvl('dealing') > 1)) newCustomer(); }
  for (const c of [...customers]) if (gameHours() > c.exp) {
    const near = c.npc && Math.hypot(c.npc.x - P.x, c.npc.z - P.z) < 60;
    if (near && !c.graced) { c.graced = true; c.exp = gameHours() + 1.5; toast(`${c.name}: "I was about to leave! Hurry up."`, 2.5); continue; }
    toast(`${c.name} got tired of waiting.`); removeCustomer(c);
  }
  if (!inside) updateNpcList(custNpcs(), dt);
}
async function talkCustomer(c) {
  const g = GOODS.find(x => x.id === c.good);
  beginTalk(c.npc.cfg, c.name, `Wants ${c.qty} ${g.name}`, 220, 'street');
  await talk.say(pick([`You got my ${g.name}?`, "Finally. You got it?", "Yo, over here. You holding?"]));
  const have = stash[g.id] || 0;
  let c2 = await talk.choose([{ label: I('deal', `Hand over ${c.qty} <small>for ${fmt(c.pay)}</small>`), disabled: have < c.qty }, I('x', have < c.qty ? `I don't have it yet (${have}/${c.qty})` : 'Not yet'), I('phone', 'Lose my number'), { label: I('cash', 'Push for more <small>(hold the ring)</small>'), disabled: have < c.qty }]);
  if (c2 === 3) { // squeeze them: hit the sweet spot and they pay extra, get greedy and they haggle you down
    await talk.say(pick(['Prices went up. Supply\'s tight.', 'Quality like this costs more now.', 'You want it or not? It\'s more today.']), 'you');
    const r = await dealRing({ mode: 'sell', label: `${c.qty} × ${g.name}`, base: c.pay, relId: 'street' });
    if (r.kind === 'sweet') { c.pay = Math.round(c.pay * r.k); await talk.say(pick(['Man... fine. You\'re lucky it\'s good.', 'Ugh. Alright, alright.', 'Daylight robbery. Here.'])); }
    else if (r.kind === 'miss') { c.pay = Math.round(c.pay * r.short); bumpRel('street', -2, false); await talk.say(pick(['Nah. I\'m giving you this much, take it or leave it.', 'You must think I\'m stupid. This is what I\'ve got.'])); }
    c2 = 0;
  }
  if (c2 === 2) {
    await talk.say("Wait, you're cutting me off? For real?");
    if (await talk.choose([I('check', 'Yeah. Lose my number'), I('x', 'Nah, forget I said that')]) === 1) { await talk.say('Phew. Don\'t scare me like that.'); endTalk(); return; }
    await talk.say(pick(["Wow. Fine. Plenty of other plugs.", "Your loss, man.", "Seriously? Alright then."])); bumpRel('street', -3, false);
    endTalk(); removeCustomer(c); return;
  }
  if (c2 === 0) {
    stash[g.id] -= c.qty; addMoney(c.pay); dealHeat(c.npc.x ?? P.x, c.npc.z ?? P.z, c.pay); gainXP('dealing', Math.round(c.pay / 25)); bumpRel('street', 4, false); relNames.street = 'the streets';
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
    enterVehicle(v, false); job = { type: 'taxi', v, stage: 'pickup', fares: 0, earned: 0 }; nextFare();
  } else if (p.job === 'bins') {
    const v = makeVehicle({ ...DEFAULT_CAR, body: 'boxtruck', bodyColor: '#3a8a4a', accentColor: '#e8e8e8', decal: 'twotone', finish: 'matte', roof: 'none', spoiler: 'none', name: 'Bin lorry', headlights: '#fff2b0', underglow: 'off', engine: 'stock', wheels: 'steel', tyres: 'street' }, p.x, p.z + 7, 0, false); v.taxi = true;
    for (let r = 4; r < 40; r += 4) if (roadAt(p.x, p.z + r)) { v.s.z = p.z + r; break; } placeVehicle(v);
    enterVehicle(v, false); job = { type: 'bins', v, fares: 0, earned: 0, depot: p, bins: [] };
    for (let i = 0; i < 8; i++) { const sp = randomRoadSpot(40 + i * 25, 160 + i * 40); const m = binMesh(); m.position.set(sp.x + 2.6, baseY(sp.x + 2.6, sp.z), sp.z); dyn.add(m); job.bins.push({ x: sp.x, z: sp.z, m }); }
    nextBin();
  } else { job = { type: 'courier', stage: 'deliver', fares: 0, earned: 0, depot: p }; nextParcel(); }
  toast(job.type === 'bins' ? 'Bin round started: 8 bins. Pull up next to each one.' : job.type === 'taxi' ? 'Shift started. Follow the GPS to your first fare.' : 'Parcel loaded. Deliver it before time runs out!', 3);
}
function nextFare() { const s = randomRoadSpot(80, 260); job.stage = 'pickup'; job.target = s; job.t = 999; setWaypoint(s.x, s.z, 'Fare pickup'); if (fareFig) dyn.remove(fareFig); const raw = npcCfg('guest', Math.floor(Math.random() * 1e5)), lk = bakeCfg(raw); job.fareCfg = raw; fareFig = figure(lk).root; fareFig.position.set(s.x + 3.5, 0.17, s.z); dyn.add(fareFig); }
function binMesh() { const g = new THREE.Group(); const mk = (w, h, d, c, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); m.position.y = y; m.castShadow = true; g.add(m); return m; }; mk(0.7, 1.0, 0.75, '#2f6f3a', 0.55); mk(0.76, 0.08, 0.82, '#255a2f', 1.09); mk(0.1, 0.1, 0.1, '#16161b', 0.1).position.set(0.25, 0.1, -0.3); return g; }
function nextBin() { const f = focusPos(); let best = null, bd = 1e9; for (const b of job.bins) { const d = Math.hypot(b.x - f.x, b.z - f.z); if (d < bd) { bd = d; best = b; } } if (best) { job.target = best; setWaypoint(best.x, best.z, 'Next bin'); } else { job.stage = 'return'; job.target = { x: job.depot.x, z: job.depot.z + 6 }; setWaypoint(job.target.x, job.target.z, 'Back to the depot'); } }
function nextParcel() { const s = randomRoadSpot(200, 650); job.stage = 'deliver'; job.target = s; job.t = s.d / 8 + 25; job.pay = Math.round(60 + s.d * 0.3); setWaypoint(s.x, s.z, 'Parcel drop-off'); }
function endJob(msg) { if (!job) return; if (job.cs && !job.csDone) setTimeout(() => { toast('You skipped community service. A warrant is out for you!', 3.5); WANT.v = Math.max(WANT.v, STAR_AT[2]); WANT.stars = Math.max(WANT.stars, 2); WANT.seen = true; WANT.lx = P.x; WANT.lz = P.z; WANT.spawnT = 2; }, 3800); if (job.bins) for (const b of job.bins) dyn.remove(b.m); if (job.v) job.v.taxi = false; toast(`${msg} Earned ${fmt(job.earned)} from ${job.fares} jobs.`, 3.5); if (fareFig) { dyn.remove(fareFig); fareFig = null; } jobMarker.visible = false; job = null; clearWaypoint(); }
function updateJob(dt) {
  if (!job) return;
  const f = focusPos(), d = Math.hypot(f.x - job.target.x, f.z - job.target.z);
  if (job.type === 'bins') {
    jobMarker.visible = true; jobMarker.position.set(job.target.x, 3, job.target.z); jobMarker.material.opacity = 0.2 + Math.sin(time * 5) * 0.08;
    if (ride !== job.v) return;
    if (d < 7 && Math.abs(ride.s.v) < 2.5) {
      if (job.stage === 'return' && job.cs) { job.csDone = true; endJob('Community service complete. Your record is clean.'); feed({ mood: 10 }); return; }
      if (job.stage === 'return') { const bonus = 150; job.earned += bonus; addMoney(bonus); endJob(`Round complete! +${fmt(bonus)} bonus.`); return; }
      const b = job.target; job.bins.splice(job.bins.indexOf(b), 1); b.m.position.y += 0.6; setTimeout(() => dyn.remove(b.m), 400);
      const pay = job.cs ? 0 : 35; job.earned += pay; job.fares++; if (pay) addMoney(pay); gainXP('stamina', 6); gainXP('driving', 4); sfx.thud(); spawnParticles(b.x + 2, 2, b.z, ['#6a5a3a', '#8a8a6a', '#3a3a3a'], 8, 3, 0.6, 0.15);
      toast(`Bin emptied +${fmt(pay)} (${8 - job.bins.length}/8)`, 1.6); nextBin();
    }
    return;
  }
  jobMarker.visible = true; jobMarker.position.set(job.target.x, 3, job.target.z); jobMarker.material.opacity = 0.2 + Math.sin(time * 5) * 0.08;
  if (job.stage === 'drop' || job.type === 'courier') { job.t -= dt; if (job.t <= 0) { sfx.fail(); if (job.type === 'courier') return endJob('Too late. The client cancelled.'); toast('Your fare jumped out. Too slow!'); nextFare(); return; } }
  const stopped = !ride || Math.abs(ride.s.v) < 3;
  if (d < (ride ? 7 : 3) && stopped) {
    if (job.type === 'taxi' && job.stage === 'pickup') { if (fareFig) { dyn.remove(fareFig); fareFig = null; } const s = randomRoadSpot(200, 600); job.stage = 'drop'; job.target = s; job.t = s.d / 11 + 22; job.pay = Math.round(45 + s.d * 0.28); setWaypoint(s.x, s.z, 'Fare drop-off'); sfx.coin(); job.fare = { ...pick(FARES), cfg: job.fareCfg, mood: 55, chats: 0, rate: 0 }; fareHello(job.fare); }
    else if (job.type === 'taxi') { const F = job.fare || { mood: 55 }, bonus = Math.round(job.t * 2), tip = Math.max(0, Math.round((F.mood - 45) * 1.6)), pay = job.pay + bonus + tip; job.earned += pay; job.fares++; addMoney(pay); gainXP('driving', 25); gainXP('charm', 4 + Math.max(0, Math.round((F.mood - 50) / 5))); fareBye(F, pay, bonus, tip); job.fare = null; nextFare(); }
    else { const bonus = Math.round(job.t * 2); const pay = job.pay + bonus; job.earned += pay; job.fares++; addMoney(pay); gainXP('stamina', 25); gainXP('charm', 4); toast(`Delivered! +${fmt(pay)} (incl. ${fmt(bonus)} speed tip)`, 2.6); nextParcel(); }
  }
}

// ---------------- taxi passengers: they get in and talk, you chat on the way (top-right button), and how they feel decides the tip
const FARES = [
  { name: 'Margaret', likes: 'quiet', hi: ['Hello, dear. The library, please. No rush, I\'m not one for speed.'], bye: ['Lovely and smooth. Thank you, dear.', 'Bit fast for my liking.'] },
  { name: 'Dev', likes: 'chat', hi: ['Yes! Finally a cab. Job interview across town. I\'m SO nervous.', 'Talk to me about anything. Please. Distract me.'], bye: ['Thanks for the pep talk. Wish me luck!', 'Right. Here goes nothing.'] },
  { name: 'Kayla', likes: 'music', hi: ['Hiii. Can you put something good on? I\'m off out tonight!'], bye: ['That was a VIBE. Five stars!', 'Okay that playlist was a crime.'] },
  { name: 'Mr Sterling', likes: 'fast', hi: ['Bay Corp Tower. I have a board meeting in twelve minutes.', 'Every second counts.'], bye: ['Acceptable. Keep the change.', 'Late. Disappointing.'] },
  { name: 'Tommo', likes: 'chat', hi: ['Alright pal! Long night. Don\'t worry, I won\'t be sick in your cab.', 'Probably.'], bye: ['You\'re a legend, you. A legend!', 'Cheers... *hic*'] },
  { name: 'Priya', likes: 'quiet', hi: ['Hi. Just the address on the app, thanks.', '*She puts her earphones in.*'], bye: ['Thanks.', 'Thanks. You talk a lot, don\'t you?'] },
  { name: 'Gus', likes: 'chat', hi: ['Evenin\'! Forty years I drove one of these. Now look at me, in the back.', 'You keep your eyes on the road, I\'ll tell you a story or two.'], bye: ['You\'re a natural, kid. Keep at it.', 'Bit heavy on the brakes there.'] },
];
const FARE_TOPICS = [
  { you: 'So, busy day?', opts: [['Tell me about it', 'chat'], ['Just drive', 'quiet'], ['*Turn the radio up*', 'music']] },
  { you: 'Where you off to, then?', opts: [['Sounds fun', 'chat'], ['Nice. *Back to driving*', 'quiet'], ['*Put a tune on for the trip*', 'music']] },
  { you: 'Want me to take the quick way?', opts: [['Hold on tight!', 'fast'], ['Nice and steady', 'quiet'], ['Scenic route, my treat', 'chat']] },
  { you: 'Seen anything good in Bay City lately?', opts: [['Tell them about the Neon Room', 'chat'], ['Recommend the Sun Valley strip', 'chat'], ['Shrug', 'quiet']] },
];
const FARE_REACT = { // how each kind of passenger takes each kind of answer
  quiet: { chat: [-8, 'Mm. Yes. Lovely.'], quiet: [10, 'Thank you. Peace and quiet.'], music: [-4, 'Bit loud, dear.'], fast: [-10, 'Slow DOWN, please!'] },
  chat: { chat: [12, 'Ha! That\'s exactly what I needed. Go on!'], quiet: [-6, '...Oh. Okay. Quiet ride then.'], music: [4, 'Ooh, good song.'], fast: [2, 'Whoa! Okay!'] },
  music: { chat: [2, 'Yeah, yeah. Turn it up though?'], quiet: [-6, 'Boring...'], music: [14, 'THIS IS MY SONG!'], fast: [6, 'Wooo! Faster!'] },
  fast: { chat: [-4, 'Less chat, more driving.'], quiet: [6, 'Good. Focus.'], music: [-4, 'Turn that off.'], fast: [14, 'Now THAT is service.'] },
};
function fareCar() { return ride ? { color: ride.cfg?.bodyColor || '#ffd23f', trim: ride.cfg?.accentColor } : { color: '#ffd23f' }; }
async function fareHello(F) {
  eventOpen = true; beginTalk(F.cfg || npcCfg('guest', 7), F.name, 'Your fare', 170 + Math.random() * 100, null, null, null, false, false, false, fareCar());
  for (const l of F.hi) await talk.say(l);
  const k = await talk.choose([I('chat', 'Buckle up, let\'s go'), I('music', 'Any music requests?'), I('run', 'Hold on, I\'m quick')]);
  const kind = ['chat', 'music', 'fast'][k], r = FARE_REACT[F.likes][kind]; F.mood = clamp(F.mood + r[0] * 0.6, 0, 100);
  await talk.say(['Buckle up, let\'s go.', 'Any music requests?', 'Hold on, I\'m quick.'][k], 'you'); await talk.say(r[1]);
  endTalk(); eventOpen = false; toast('Tap Passenger (top right) to chat on the way', 2.6);
}
async function fareChat() {
  const F = job?.fare; if (!F || state !== 'play' || talk.active) return; if (ride) ride.s.v *= 0.98;
  if (F.chats >= 3) { toast(`${F.name}: "${F.likes === 'quiet' ? 'Could we just... not?' : 'Ha, you\'re funny. Eyes on the road!'}"`, 2); return; }
  F.chats++; const T = FARE_TOPICS[(F.chats + F.name.length) % FARE_TOPICS.length];
  eventOpen = true; beginTalk(F.cfg || npcCfg('guest', 7), F.name, `Your fare · ${F.mood > 65 ? 'happy' : F.mood < 40 ? 'not impressed' : 'okay'}`, 170, null, null, null, false, false, false, fareCar());
  await talk.say(T.you, 'you'); const k = await talk.choose(T.opts.map(o => I('chat', o[0]))); const kind = T.opts[k][1], r = FARE_REACT[F.likes][kind];
  await talk.say(T.opts[k][0], 'you'); await talk.say(r[1]); F.mood = clamp(F.mood + r[0], 0, 100); if (kind === 'music') radioOn(true);
  endTalk(); eventOpen = false;
}
function fareBye(F, pay, bonus, tip) {
  toast(`${F.name}: "${F.mood >= 50 ? F.bye[0] : F.bye[1]}"  +${fmt(pay)}${tip ? ` (${fmt(tip)} tip)` : ''}${bonus ? ` · ${fmt(bonus)} speed bonus` : ''}`, 3.4);
}
function fareBtnTick() { // the Passenger button sits top right while someone's in the back; in any cab you can start taking fares
  let b = $('fareBtn'); const inTaxi = ride && !ride.b.two && (ride.taxi || ride.cfg?.roof === 'taxi'), show = state === 'play' && ((job?.type === 'taxi' && job.fare && job.stage === 'drop') || (inTaxi && !job));
  if (!show) { if (b) b.classList.add('hidden'); return; }
  if (!b) { b = document.createElement('button'); b.id = 'fareBtn'; document.body.appendChild(b); b.onclick = () => { if (job?.fare) fareChat(); else if (ride && !job) { job = { type: 'taxi', v: ride, stage: 'pickup', fares: 0, earned: 0 }; nextFare(); toast('Taking fares. Follow the GPS to your first passenger.', 2.6); } }; }
  b.classList.remove('hidden'); const html = job?.fare ? `${svg('chat', 'sm')} ${job.fare.name}<small>${job.fare.mood > 65 ? 'Happy' : job.fare.mood < 40 ? 'Grumpy' : 'Passenger'}</small>` : `${svg('taxi', 'sm')} Take fares`; if (b.dataset.h !== html) { b.innerHTML = html; b.dataset.h = html; }
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
// ---- auto-pan: if a building is between the camera and you, the camera swings round to a clear angle (and the stick follows the camera)
let camYaw = 0, camYawT = 0, camChkT = 0, camClearT = 0, camBlockT = 0;
// while your thumb is on the stick, directions stay locked to how the camera was when you pushed it, so the view can swing round
// without your walk suddenly changing direction. Let go and it picks up the new view.
let stickYaw = null, lastDt = 0.016;
function camStick() { const s = input.stick; if (s.m < 0.15) { stickYaw = null; return s; } if (stickYaw === null) stickYaw = camYaw; else stickYaw += wrapA(camYaw - stickYaw) * Math.min(1, (lastDt || 0.016) * 1.4); const y = stickYaw; /* eases round with the camera, so up stays up on screen without a sudden lurch */ if (Math.abs(y) < 0.01) return s; const c = Math.cos(y), n = Math.sin(y); return { x: s.x * c - s.y * n, y: s.x * n + s.y * c, m: s.m }; } // stick y is up-positive: rotate the push into the camera's frame
function camBlocked(yaw, x, z, y) { // walk up the sight line from you towards the camera and see if a building pokes through it
  const sx = Math.sin(yaw), sz = Math.cos(yaw), tp = Math.tan((56 * DEG) - (1 - Math.min(1, zoom)) * 0.45);
  for (let h = 1.2; h < 34; h += 1.4) { const px = x + sx * h, pz = z + sz * h, top = wallTop(px, pz); if (top != null && top > y + 1.4 + h * tp) return true; }
  return false;
}
// on a fire escape or ladder: the camera swings round to face the wall so you can see what you're climbing
function climbView() { if (inside || ride) return null; if (P.ladder) return { yaw: Math.atan2(P.ladder.nx, P.ladder.nz) }; if (P.y > 0.45) for (const S of STAIRS) if (P.x > S.x0 - 0.6 && P.x < S.x1 + 0.6 && P.z > S.zmin - 1.8 && P.z < S.zmax + 1.8 && P.y < S.y1 + 0.6 && P.y > S.y0 - 0.6) return { yaw: Math.PI / 2 }; return null; }
function updateCamYaw(dt) {
  const cv = climbView(); if (cv && state === 'play') { camYawT = cv.yaw; camYaw += wrapA(camYawT - camYaw) * Math.min(1, dt * 3); return; }
  if (inside || state !== 'play') { camYawT = 0; }
  else { camChkT -= dt; if (camChkT <= 0) { camChkT = 0.15; const f = focusPos(), y = ride ? (ride.s.y || 0) : P.y;
    const curBlocked = camBlocked(camYawT, f.x, f.z, y), homeClear = !camBlocked(0, f.x, f.z, y);
    if (curBlocked) { camBlockT += 0.15; camClearT = 0; if (camBlockT > (ride ? 0.45 : 0.25)) { let best = null; const C = [0, 0.45, -0.45, 0.85, -0.85, 1.15, -1.15], near = (a, b2) => Math.abs(wrapA(a - camYaw)) < Math.abs(wrapA(b2 - camYaw)); for (const wide of [true, false]) { for (const c of C) if (!camBlocked(c, f.x, f.z, y) && (!wide || (!camBlocked(c + 0.28, f.x, f.z, y) && !camBlocked(c - 0.28, f.x, f.z, y))) && (best === null || near(c, best))) best = c; if (best !== null) break; } if (best !== null) camYawT = best; camBlockT = 0; } }
    else { camBlockT = 0; if (camYawT !== 0 && homeClear) { camClearT += 0.15; if (camClearT > 1.2) { camYawT = 0; camClearT = 0; } } else camClearT = 0; } } }
  camYaw += wrapA(camYawT - camYaw) * Math.min(1, dt * 2.2); if (Math.abs(wrapA(camYawT - camYaw)) < 0.002) camYaw = camYawT;
}
function padHeight() { return document.body.classList.contains('desktop') ? 0 : W > H ? Math.min(H * 0.12, 60) : Math.min(H * 0.30, 252); } // landscape/computer: the controls sit at the sides, not under the action
function focusPos() { return ride ? ride.s : P; }
// pinch (two fingers on the game view) or mouse wheel to zoom in on the action and out for the big picture
let zoom = 1; const pinch = new Map(); let pinch0 = null;
{
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; pinch.set(e.pointerId, [e.clientX, e.clientY]); if (pinch.size === 2) { const [a, b] = [...pinch.values()]; pinch0 = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: zoom }; } });
  cv.addEventListener('pointermove', e => { if (!pinch.has(e.pointerId)) return; pinch.set(e.pointerId, [e.clientX, e.clientY]); if (pinch.size === 2 && pinch0 && (state === 'play' || state === 'ui')) { const [a, b] = [...pinch.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom = clamp(pinch0.z * pinch0.d / Math.max(20, d), 0.28, 1.8); } });
  const up = e => { pinch.delete(e.pointerId); if (pinch.size < 2) pinch0 = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);
  cv.addEventListener('wheel', e => { if (state !== 'play') return; zoom = clamp(zoom * (1 + e.deltaY * 0.0012), 0.28, 1.8); e.preventDefault(); }, { passive: false });
  cv.addEventListener('dblclick', () => { zoom = 1; });
}
let camPitch = null; const camLead = { x: 0, z: 0 };
function updateCamera(dt, snap) {
  const f = focusPos();
  { const vx = dt > 0 ? (P.x - (camLead.px ?? P.x)) / dt : 0, vz = dt > 0 ? (P.z - (camLead.pz ?? P.z)) / dt : 0; camLead.px = P.x; camLead.pz = P.z; const on = !ride && !inside && !snap && Math.hypot(vx, vz) < 14; // on foot, the camera leans ahead the way you're walking
    camLead.x = damp(camLead.x, on ? clamp(vx * 0.55, -3.5, 3.5) : 0, on ? 1.6 : 4, dt); camLead.z = damp(camLead.z, on ? clamp(vz * 0.55, -3.5, 3.5) : 0, on ? 1.6 : 4, dt); if (snap) camLead.x = camLead.z = 0; }
  const tx = ride ? f.x + f.vx * 0.45 : f.x + camLead.x, tz = ride ? f.z + f.vz * 0.45 : f.z + camLead.z, ty = ride ? (ride.s.y ?? Math.max(groundH(f.x, f.z), 0)) : P.y;
  const climbing = !snap && climbView(); const want = (inside ? 26 + Math.max(inside.h.w, inside.h.d) * 0.35 : ride ? 84 + Math.abs(ride.s.v) * 0.5 : climbing ? 34 : 58) * zoom;
  camDist = snap ? want : damp(camDist, want, 2.5, dt);
  const k = snap ? 1 : 1 - Math.exp(-6 * dt);
  camLook.x += (tx - camLook.x) * k; camLook.z += (tz - camLook.z) * k; camLook.y += (ty - camLook.y) * k;
  if (FX.drunk > 0.2) { camLook.x += Math.sin(time * 0.8) * Math.min(1.5, FX.drunk) * 0.06; camLook.z += Math.cos(time * 0.6) * Math.min(1.5, FX.drunk) * 0.05; }
  if (inside) { const ex = Math.max(inside.h.w / 4, inside.h.w / 2 - 5), ez = Math.max(inside.h.d / 4, inside.h.d / 2 - 4); camLook.x = clamp(camLook.x, ORIGIN.x - ex, ORIGIN.x + ex); camLook.z = clamp(camLook.z, ORIGIN.z - ez, ORIGIN.z + ez + 1); }
  const pT = (inside ? 60 : climbing ? 34 : 56) * DEG - (1 - Math.min(1, zoom)) * 0.45; camPitch = snap || camPitch == null ? pT : damp(camPitch, pT, 3, dt); const pitch = camPitch; // zoomed in = a lower, closer angle so you can see faces and clothes
  shake = Math.max(0, shake - dt * 1.5);
  const sx = (Math.random() - 0.5) * shake, sz = (Math.random() - 0.5) * shake;
  if (!snap) updateCamYaw(dt); else if (inside) camYaw = camYawT = 0;
  const hz = Math.cos(pitch) * camDist;
  G.cam.position.set(camLook.x + sx + Math.sin(camYaw) * hz, camLook.y + Math.sin(pitch) * camDist, camLook.z + Math.cos(camYaw) * hz + sz);
  G.cam.lookAt(camLook.x + sx, camLook.y, camLook.z + sz);
  G.scene.fog.near = camDist + 25; G.scene.fog.far = camDist + 130;
  fadeU.uPlayer.value.set(f.x, ride ? ty : P.y, f.z); fadeU.uCam.value.copy(G.cam.position); fadeU.uFade.value = P.ladder && !ride ? 0 : 1; /* on a ladder you're outside the building: no see-through hole cut in the wall above you */
  { const py = ride ? ty : P.y, ax = ride ? (f.vx || 0) * 0.7 : 0, az = ride ? (f.vz || 0) * 0.7 : 0, under = !inside && py < 3 && [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5], [ax, az], [ax * 2, az * 2]].some(([ox, oz]) => { const k = skyAt(f.x + ox, f.z + oz); return k && !k.ramp; }); for (const t of traffic) if (t.mesh) t.mesh.visible = !(under && (t.y ?? 0) > py + 2.5 && Math.hypot(t.rx - f.x, t.rz - f.z) < 45); for (const v of vehicles) if (v !== ride) v.b.group.visible = !(under && (v.s.y || 0) > py + 2.5 && Math.hypot(v.s.x - f.x, v.s.z - f.z) < 45); /* under a bridge: cars up on the deck aren't drawn through the see-through window */ fadeU.uBig.value = damp(fadeU.uBig.value, under ? (ride ? 3.6 + Math.min(1.6, Math.abs(ride.s.v) * 0.05) : 2.6) : 1, ride ? 8 : 5, dt); } // a car needs a bigger window, and it opens ahead of you at speed // under a skyway: a much bigger window through the deck
  lantern.position.set(f.x, ty + 3, f.z);
  boomLight.intensity = Math.max(0, boomLight.intensity - dt * 160);
}
function gameLayout() { G.cam.aspect = W / H; G.cam.clearViewOffset(); G.cam.setViewOffset(W, H, 0, padHeight() * 0.25, W, H); G.cam.updateProjectionMatrix(); }


// ================================================================ PRISON: Bay County Correctional. Its own little world:
// free roam cell block, canteen, yard, visiting room, infirmary. Lights out fast-forwards the night.
const PRISON_SENT = [0, 0, 12, 24, 48, 72]; // hours by wanted level when busted
const PRISONERS = {
  grimes: { name: 'Officer Grimes', tag: 'Guard', pitch: 120 }, guard2: { name: 'Officer Pike', tag: 'Guard', pitch: 130 },
  joy: { name: 'Mama Joy', tag: 'Canteen', pitch: 210 }, nurse: { name: 'Nurse Ortega', tag: 'Infirmary', pitch: 220 },
  walsh: { name: 'Agent Walsh', tag: 'Federal agent', pitch: 140 },
  tony: { name: 'Big Carlos', tag: 'Shot caller · lifer', pitch: 95, look: { build: 1.5, hair: 'buzz', hairColor: '#141414', facialHair: 'goatee', height: 1.05 } },
  dre: { name: 'Dre "Hands"', tag: 'Inmate · fighter', pitch: 130, look: { build: 1.35, hair: 'afro', facialHair: 'stubble', top: 'tank' } },
  pops: { name: 'Pops', tag: 'Lifer · 31 years in', pitch: 100, look: { hair: 'short', hairColor: '#d8d8d8', facialHair: 'bigbeard', eyewear: 'glasses', build: 0.95 } },
  rico: { name: 'Rico', tag: 'Inmate · talks a lot', pitch: 175, look: { hair: 'quiff', build: 0.9, facialHair: 'moustache' } },
  moose: { name: 'Moose', tag: 'Lifer · weights', pitch: 85, look: { build: 1.7, hair: 'buzz', height: 1.1, facialHair: 'beard', top: 'tank' } },
  mikey: { name: 'Lil Mikey', tag: 'New fish', pitch: 190, look: { build: 0.85, height: 0.92, hair: 'short', facialHair: 'none' } },
};
const JUMPSUIT = { top: 'long', topColor: '#ff7a1a', accent: '#ff7a1a', pants: 'jeans', pantsColor: '#ff7a1a', shoes: 'sneakers', shoeColor: '#e8e8e8', hat: 'none', mask: 'none', back: 'none', eyewear: 'none', gloves: 'none' };
const jail = () => stats.jail;
const jailLeft = () => Math.max(0, jail().until - gameHours());
const hrs = h => h >= 24 ? `${Math.floor(h / 24)}d ${Math.round(h % 24)}h` : `${Math.max(1, Math.round(h))}h`;
const prisonPlace = () => ({ ...PLACES.find(q => q.id === 'v_police'), interior: 'prison', name: 'Bay County Correctional' });
function prisonNpcCfg(id, seed) { const base = npcCfg('inmate', seed); return { ...base, ...(PRISONERS[id]?.look || {}) }; }
function wearJumpsuit(on) {
  if (on) { stats.jail.outfit ||= { ...charCfg }; charCfg = { ...charCfg, ...JUMPSUIT, top: charCfg.top === 'swim' || charCfg.top === 'shirtless' ? 'long' : JUMPSUIT.top }; }
  else if (stats.jail?.outfit || stats.escaped) { charCfg = { ...(stats.jail?.outfit || stats.escaped) }; }
  buildHero();
}
function goToPrison(stars, coop) {
  stats.jailRecord = dayN; if (career()?.id === 'cop') { stats.career = null; setTimeout(() => toast('You were fired from the police force.', 3), 6000); }
  const L0 = life(), friendLaw = !!L0.flags.lawyer_friend; if (friendLaw) { delete L0.flags.lawyer_friend; setTimeout(() => toast('Your lawyer friend took the case for free. Sentence halved.', 4), 4500); }
  const lawyer = hasDegree('law') || friendLaw, h = (PRISON_SENT[Math.min(5, stars)] || 12) * (coop ? 0.5 : 1) * (lawyer ? 0.5 : 1);
  if (lawyer) setTimeout(() => toast('You defended yourself in court. Sentence halved.', 3.5), 4000);
  stats.jail = { until: gameHours() + h, total: h, outfit: { ...charCfg }, shiv: false, spoon: false, dig: 0, plan: false, snitch: false, fights: 0, debt: 0, meals: {}, lawyer: false, csAsked: false };
  if (arsenal.cur !== 'fist') { arsenal.last = arsenal.cur; arsenal.cur = 'fist'; }
  wearJumpsuit(true); enterPrison(true);
}
function enterPrison(intake) {
  prisonEnterT = time + 3;
  const pl = prisonPlace(); Object.assign(P, { x: pl.x, z: pl.z }); enterInterior(pl);
  setTimeout(() => {
    if (inside?.id !== 'prison') return;
    const w = inside.h.toWorld(2.5, -23.6); P.x = w.x; P.z = w.z; P.y = 0; P.face = 0; updateCamera(0, true);
    if (intake) setTimeout(intakeTalk, 500); else toast(`Bay County Correctional. ${hrs(jailLeft())} left.`, 3);
  }, 400);
}
async function intakeTalk() {
  const g = inside?.npcs.find(n => n.pr === 'grimes'); if (!g) return;
  const J = jail(), bail = bailCost();
  beginTalk(g.cfg, 'Officer Grimes', 'Intake', 120, g.relId);
  await talk.say(`Welcome to Bay County. You're in for ${hrs(J.total)}. Phone, cash, weapons: confiscated. You get them back when you leave.`);
  await talk.say("Orange suits you. Cell 5 is yours. Canteen's open all day, yard's open till lights out at 22:00.");
  const opts = [I('check', 'Fine. I\'ll do my time'), I('cash', `Post bail <small>${fmt(bail)}</small>`)];
  const cs = J.total <= 24 && Math.random() < 0.65; if (cs) opts.push(I('trash', 'Offer: community service instead'));
  const c = await talk.choose(opts);
  if (c === 1) { if (money < bail) { await talk.say("With what money? Get comfortable."); } else { spend(bail); await talk.say('Bail posted. Lucky you.'); endTalk(); return releasePrison('Bail posted. You walk out a free man... for now.'); } }
  else if (c === 2) { await talk.say("Judge says first-timers can work it off. One full bin round for the city. No pay. Skip it and you're back here with a warrant."); const k = await talk.choose([I('check', 'Deal'), I('x', 'Nah, I\'ll do the time')]); if (k === 0) { endTalk(); return communityService(); } }
  await talk.say(pick(['Keep your head down.', 'Don\'t make me come find you.', 'Move along.'])); endTalk();
}
const bailCost = () => Math.round(150 * jailLeft() + 200);
let releasing = false;
function releasePrison(msg = 'Time served. You are free to go.') {
  if (releasing) return; releasing = true; stats.freedAt = gameHours();
  fade(() => { releasing = false; if (!stats.jail) return;
    wearJumpsuit(false); stats.jail = null; stats.escaped = null;
    if (inside) exitInterior(true);
    toast(msg, 3.5); saveGame();
  });
}
function communityService() {
  wearJumpsuit(false); stats.jail = null;
  exitInterior(true);
  const depot = PLACES.find(q => q.id === 'j_bins');
  setTimeout(() => { startJob(depot); job.cs = true; toast('Community service: empty 8 bins and return the lorry. Unpaid. Skip it and the cops come for you.', 4.5); }, 300);
}
function escapePrison(how) {
  const out = jail().outfit; stats.escaped = out; stats.jail = null;
  fade(() => {
    if (inside) exitInterior(true);
    const a = rand(0, 6.28); P.x += Math.sin(a) * 40; P.z += Math.cos(a) * 40; for (let i = 0; i < 20 && !walkable(P.x, P.z); i++) { P.x += rand(-8, 8); P.z += rand(-8, 8); }
    P.y = baseY(P.x, P.z); updateCamera(0, true);
    WANT.v = STAR_AT[4]; WANT.stars = 4; WANT.seen = true; WANT.lx = P.x; WANT.lz = P.z; WANT.coolT = 7; WANT.spawnT = 2;
    toast(how + ' You\'re out! Still in the jumpsuit. Lose the cops, then change at home or a clothes store.', 5); saveGame();
  });
}
// fast-forward cutscene: dark overlay, clock spins, then you wake up on your bunk
let cutting = false;
function prisonSkip(hours, title, sub, after) {
  if (cutting) return; cutting = true;
  const el = $('jailCut'), st = gameHours(), hEnd = Math.min(hours, jailLeft() + 0.01);
  el.querySelector('b').textContent = title; el.querySelector('span').textContent = sub || ''; el.classList.add('on'); setState('mini');
  const t0 = performance.now(), dur = 2600, clk = el.querySelector('i');
  const tick = () => {
    const k = Math.min(1, (performance.now() - t0) / dur), g = st + hEnd * k, hh = Math.floor(g % 24), mm = Math.floor((g % 1) * 60);
    clk.textContent = `Day ${Math.floor(g / 24)} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    if (k < 1) return requestAnimationFrame(tick);
    advanceTime(hEnd); stats.energy = 100; stats.hunger = Math.max(stats.hunger, 55); P.hp = Math.max(P.hp, maxHP() * 0.8);
    if (inside?.id === 'prison') { const w = inside.h.toWorld(2.5, -24); P.x = w.x; P.z = w.z; P.y = 0; P.face = 0; }
    el.classList.remove('on'); cutting = false; setState('play'); updateCamera(0, true);
    after?.(); if (stats.jail && jailLeft() <= 0.01) releasePrison();
  };
  requestAnimationFrame(tick);
}
let lockT = 0, gateT = 0, prisonEnterT = 0;
function updatePrison(dt) {
  if (!stats.jail || P.dead || cutting) return;
  if (inside?.id !== 'prison') { if (!inside && state === 'play' && time > prisonEnterT) enterPrison(false); return; }
  if (jailLeft() <= 0) { releasePrison(); return; }
  lockT -= dt;
  if ((clockH >= 22 || clockH < 6) && lockT <= 0 && state === 'play') {
    lockT = 5; toast('LIGHTS OUT! Back to your cells!', 2);
    setTimeout(() => { if (!stats.jail || state !== 'play') return; const toMorning = ((30 - clockH) % 24) || 8;
      const J = jail(); let extra = '';
      if (J.plan && J.spoon) { J.dig = Math.min(100, J.dig + 34); extra = J.dig >= 100 ? 'The tunnel is through.' : `You dug all night with the spoon. Tunnel ${J.dig}%.`; }
      prisonSkip(toMorning, 'Lights out', extra || pick(['Somebody snores like a chainsaw.', 'Footsteps. A guard\'s torch. Silence.', 'You stare at the ceiling and think about everything.']), () => { toast(`Morning count. ${hrs(jailLeft())} left.`, 3); if (J.dig >= 100 && stats.jail) tunnelReady(); }); }, 1200);
  }
}
async function tunnelReady() {
  modal(`<h3>The tunnel is through</h3><p>Behind the toilet, a gap just wide enough. Pops was right.</p>`, [{ label: 'Crawl out', cls: 'big', fn: () => { closeModal(); escapePrison('You crawl through the tunnel into a storm drain.'); } }, { label: 'Not yet', fn: closeModal }]);
}
async function prisonSpot(s) {
  const J = jail();
  if (!J) { toast('You don\'t live here any more.'); return; }
  if (s.kind === 'bunk') {
    const left = jailLeft(), btns = [
      { label: `Nap (2h)`, fn: () => { closeModal(); prisonSkip(2, 'Nap', 'You drift off on the thin mattress.'); } },
      { label: `Do your time (${hrs(left)})`, cls: 'big', fn: () => { closeModal(); prisonSkip(left + 0.02, 'Doing time', pick(['Days blur. Count, chow, yard, count.', 'You read every book in the library. Twice.', 'Push-ups. Letters. Waiting.']), () => feed({ mood: -10 })); } },
    ];
    if (J.plan && J.spoon && J.dig < 100) btns.push({ label: `Dig the tunnel (${J.dig}%)`, fn: () => { closeModal(); if (Math.random() < 0.2) { J.spoon = false; J.until += 12; prisonSkip(4, 'Caught!', 'A guard hears scraping. Spoon confiscated, +12h, a night in the hole.'); } else { J.dig = Math.min(100, J.dig + 25); prisonSkip(3, 'Digging', `Scrape. Scrape. Tunnel ${J.dig}%.`, () => { if (J.dig >= 100) tunnelReady(); }); } } });
    if (J.dig >= 100) btns.push({ label: 'Use the tunnel', cls: 'big', fn: () => { closeModal(); escapePrison('You crawl through the tunnel into a storm drain.'); } });
    btns.push({ label: 'Cancel', fn: closeModal });
    modal(`<h3>Cell 5</h3><p>${hrs(left)} left on your sentence.${J.dig ? ` Tunnel: ${J.dig}%.` : ''}</p>`, btns); return;
  }
  if (s.kind === 'shower') { const w = inside.h.toWorld(29.2, [3.2, 5.4, 7.6, 9.8][Math.floor(Math.random() * 4)]); return startShower(w.x, w.z, -Math.PI / 2, true); }
  if (s.kind === 'canteen') {
    const k = 'meal:' + dayN; J.meals[k] ||= 0;
    if (J.meals[k] >= 3) { toast('Three trays a day. Mama Joy says come back tomorrow.'); return; }
    J.meals[k]++; fade(() => { advanceTime(0.4); feed({ hunger: 45, mood: 3 }); toast(pick(['Mystery meat, mash and a carton of milk. Filling.', 'Taco Tuesday, prison style. Not bad actually.', 'Chili and cornbread. Somebody traded you their pudding.']), 3); });
    if (J.plan && !J.spoon && Math.random() < 0.7) setTimeout(() => { J.spoon = true; toast('You slipped a metal spoon up your sleeve. Pops will be pleased.', 3.5); }, 600);
    return;
  }
  if (s.kind === 'plift') { if ((stats.relDay['gym:' + dayN] || 0) >= GYM_DAILY) { toast(`Enough for today. ${GYM_DAILY} workouts max.`); return; } const r = await mini('gym', { title: 'Yard weights' }); workout(r.score, 'lift'); gainXP('strength', r.score * 14); gainXP('health', r.score * 3); feed({ energy: -10, mood: 6 }); if (r.score > 5) bumpRel('pr:moose', 3); return; }
  if (s.kind === 'hoops') { fade(() => { advanceTime(0.5); gainXP('stamina', 12); feed({ mood: 10, energy: -8 }); bumpRel('pr:dre', 2); toast(pick(['Pickup game on the yard. You hit the game winner.', 'You got crossed up by Dre. The yard went wild.', 'Three on three. Your team took it.']), 3); }); return; }
  if (s.kind === 'infirmary') { fade(() => { advanceTime(1); P.hp = maxHP(); feed({ energy: 10 }); toast('Nurse Ortega patched you up. Full health.', 3); }); return; }
  if (s.kind === 'payphone') return payPhone();
  if (s.kind === 'library') { fade(() => { advanceTime(1); gainXP('charm', 15); feed({ mood: 8 }); toast(pick(['You read a dog-eared law book. You feel smarter. Charm +', 'A paperback thriller. You finished it in one sitting.', 'You wrote a letter home.']), 3); }); return; }
  if (s.kind === 'tvroom') { fade(() => { advanceTime(1); feed({ mood: 7, energy: 4 }); toast(pick(['Daytime TV with thirty guys arguing over the remote.', 'You watched a cooking show. Everyone got hungry.', 'Football on the block TV. Somebody lost a bet.']), 3); }); return; }
}
async function payPhone() {
  const J = jail(), f = fam(), opts = [], ids = [];
  if (f.partner) { opts.push(I('heart', `Call ${f.partner.name}`)); ids.push('partner'); }
  if (f.kids.some(k => kidAge(k) >= 7)) { opts.push(I('people', 'Call the kids')); ids.push('kids'); }
  if (!J.lawyer) { opts.push(I('case', `Call a lawyer <small>${fmt(500)}</small>`)); ids.push('lawyer'); }
  opts.push(I('cash', `Bail bondsman <small>${fmt(Math.round(bailCost() * 0.15))} fee</small>`)); ids.push('bond');
  opts.push(I('chat', 'Call Uncle Ray')); ids.push('ray');
  opts.push(I('x', 'Hang up')); ids.push('bye');
  // pick who to call from the phone screen itself (no talking to yourself), then it's a real call with their face on the line
  const c = await phoneDial(opts, ids);
  if (c === 'bye' || c == null) return;
  const callAs = (who, tag) => beginTalk(who?.cfg || null, who?.name || tag, tag, who?.pitch || 200, who?.key || null, null, null, false, false, true);
  if (c === 'partner') {
    const r = rel(f.partner.id); callAs({ cfg: f.partner.cfg, name: f.partner.name, pitch: 330, key: f.partner.id }, 'Calling from Bay County');
    await talk.say(r >= 50 ? pick(['Baby! Are you okay? I\'ve been going crazy.', 'Oh thank god. Are they treating you alright in there?']) : pick(['You got yourself locked up? Really?', 'I can\'t talk long. What do you want?']));
    for (let turn = 0; turn < 3; turn++) {
      const k = await talk.choose([I('heart', 'I miss you so much'), I('hand', 'I\'m sorry. I messed up'), I('cash', 'Can you get me out?'), I('chat', 'How are you holding up?'), I('x', 'I have to go')]);
      if (k === 4) { await talk.say(pick(['Okay. Call me again tomorrow?', 'Love you. Be careful.', 'Fine. Bye.'])); break; }
      if (k === 0) { bumpRel(f.partner.id, 4); feed({ mood: 8 }); await talk.say(r >= 40 ? pick(['I miss you too. The bed\'s too big without you.', 'Every night. Come home to me.']) : 'Hm. Should\'ve thought about that before.'); }
      else if (k === 1) { bumpRel(f.partner.id, r >= 30 ? 6 : 2); await talk.say(r >= 40 ? pick(['I know. Just... come home different, okay?', 'I\'m angry. But I\'m not going anywhere.']) : pick(['Sorry doesn\'t pay the rent.', 'We\'ll see.'])); }
      else if (k === 2) { if (rel(f.partner.id) >= 70 && money < bailCost()) { await talk.say('I\'ll come post your bail. Don\'t do anything stupid.'); endTalk(); return releasePrison(`${f.partner.name} posted your bail.`); } await talk.say(money >= bailCost() ? 'You\'ve got the money yourself, babe. Call the bondsman.' : rel(f.partner.id) >= 50 ? 'I\'m trying. I don\'t have that kind of money yet.' : 'With what? You\'re on your own.'); }
      else { await talk.say(pick(f.kids.length ? ['Tired. The kids keep asking where you are.', 'Holding it together. Just about.'] : ['Lonely. Your side of the bed is cold.', 'I\'ve been working extra shifts. I\'m fine.'])); bumpRel(f.partner.id, 3); }
    }
    feed({ mood: rel(f.partner.id) >= 50 ? 10 : 0 });
  } else if (c === 'kids') { const k0 = f.kids.find(k => kidAge(k) >= 7); callAs({ cfg: kidCfg(k0), name: k0.name, pitch: 420, key: k0.id }, 'Calling from Bay County');
    await talk.say(pick(['Dad? When are you coming home?', 'We drew you a picture. Mom says you\'re on a trip.']));
    const k = await talk.choose([I('heart', 'Soon, I promise'), I('chat', 'Be good for your mum'), I('star', 'Tell me about school')]);
    await talk.say(k === 0 ? 'Pinky promise?' : k === 1 ? 'I am being good! Mostly.' : pick(['I got a gold star!', 'We learned about volcanoes!'])); bumpRel(k0.id, 6); feed({ mood: 18 });
  } else if (c === 'lawyer') { callAs(faceFor(null, 'Saul Goodwin'), 'Attorney at law');
    if (money < 500) await talk.say('Saul Goodwin, attorney at law. Five hundred up front, friend. Call back when you have it.');
    else { await talk.say('Saul Goodwin. I\'ve seen your file. Five hundred and I\'ll find you something.'); const k = await talk.choose([I('check', 'Do it ($500)'), I('x', 'Too much')]); if (k === 0) { spend(500); J.lawyer = true; const cut = jailLeft() * 0.3; J.until -= cut; await talk.say(`Procedural error at your arrest. I got ${hrs(cut)} knocked off. You\'re welcome.`); } else await talk.say('Your funeral. Figuratively.'); }
  } else if (c === 'bond') { const fee = Math.round(bailCost() * 0.15); callAs(faceFor(null, 'Rocco Bianchi'), 'Bay Bail Bonds');
    if (money < fee) await talk.say('Bay Bail Bonds. You need the fee up front, pal.');
    else { await talk.say(`Fee\'s ${fmt(fee)}. Miss your court date and I send people.`); const k = await talk.choose([I('check', `Pay ${fmt(fee)}`), I('x', 'Not yet')]); if (k === 0) { spend(fee); await talk.say('Done. Walk out the front.'); endTalk(); return releasePrison('Bailed out by Bay Bail Bonds.'); } await talk.say('Clock\'s ticking, pal.'); }
  } else if (c === 'ray') { callAs(rayWho(), 'Calling from Bay County');
    await talk.say(pick(['Kid! What did I tell you? Keep your nose clean!', 'Ha! Your old uncle did a weekend in Bay County back in \'89.']));
    const k = await talk.choose([I('chat', 'Any advice?'), I('cash', 'Can you help me out?'), I('x', 'Just wanted to hear a friendly voice')]);
    if (k === 0) await talk.say(pick(['Eat the pudding, avoid Moose, never owe anyone a favour.', 'Keep your head down and your mouth shut. Time goes quicker.']));
    else if (k === 1) { if ((stats.rayHelp || 0) < dayN - 7) { stats.rayHelp = dayN; J.until -= jailLeft() * 0.15; await talk.say('I know a guard. Leave it with me. ...Done. You\'ll be out a bit sooner.'); } else await talk.say('I helped you already, kid. I\'m not a bank.'); }
    else await talk.say('You\'ll be alright. You\'re family.'); feed({ mood: 8 });
  }
  endTalk(); saveGame();
}
// the pay phone: a dial screen, then the call
function phoneDial(opts, ids) {
  return new Promise(res => {
    const el = document.createElement('div'); el.id = 'payphone';
    el.innerHTML = `<div class="pp"><div class="pphead"><b>Pay phone</b><small>Bay County Correctional · 25¢ a minute</small></div><div class="ppbtns">${opts.map((o, i) => `<button data-i="${i}">${o}</button>`).join('')}</div></div>`;
    document.body.appendChild(el); setState('ui');
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const i = +b.dataset.i; el.remove(); setState('play'); sfx.click(); const A = audio(); if (A && ids[i] !== 'bye') [0, 0.35].forEach(t => { sfx.note(440, A.currentTime + t, 0.25, 'sine', 0.04, 2000); sfx.note(480, A.currentTime + t, 0.25, 'sine', 0.04, 2000); }); setTimeout(() => res(ids[i]), ids[i] === 'bye' ? 0 : 700); });
  });
}
// ---------------- people inside
async function talkPrisoner(n) {
  const J = jail(), id = n.pr, P2 = PRISONERS[id], rid = 'pr:' + id;
  beginTalk(n.cfg, P2.name, P2.tag, P2.pitch, rid);
  if (!J) { await talk.say('You don\'t belong in here any more.'); return endTalk(); }
  if (J.snitch && (id === 'tony' || id === 'dre' || id === 'moose') && !J.snitchFought) {
    await talk.say(id === 'tony' ? 'Heard you had a nice chat with the feds. Snitches get stitches.' : 'Carlos says you a rat.'); J.snitchFought = true;
    endTalk(); return prisonFight(id, true);
  }
  for (;;) {
    const opts = [], ids = [];
    const add = (ic, t, k) => { opts.push(I(ic, t)); ids.push(k); };
    add('chat', 'Chat', 'chat');
    if (id === 'grimes' || id === 'guard2') { add('lock', `How long have I got?`, 'time'); add('cash', `Post bail <small>${fmt(bailCost())}</small>`, 'bail'); if (!J.csAsked && J.total <= 24 && !J.fights) add('trash', 'Can I do community service?', 'cs'); add('cash', `Bribe <small>${fmt(1000)}</small>`, 'bribe'); add('fist', 'Mouth off', 'mouth'); }
    if (id === 'tony') { add('bag', 'Need a shiv', 'shiv'); if (!J.debt) add('star', 'Got any work?', 'work'); if (J.debt === 2) add('cash', 'Rico paid up', 'paid'); add('bolt', 'Start a riot', 'riot'); }
    if (id === 'dre' || id === 'moose') add('fist', 'Square up', 'fight');
    if (id === 'rico' && J.debt === 1) add('cash', 'Carlos wants his money', 'collect');
    if (id === 'pops' && rel(rid) >= 25 && !J.plan) add('key', 'How do I get out of here?', 'plan');
    if (id === 'walsh') add('shield', 'What do the feds want?', 'deal');
    if (id === 'joy') add('food', `Extra portion <small>${fmt(5)}</small>`, 'food');
    if (id === 'nurse') add('cross', 'Patch me up', 'heal');
    if (id === 'mikey') add('shield', 'Anyone bothering you?', 'protect');
    add('x', 'Later', 'bye');
    const c = ids[await talk.choose(opts)];
    if (c === 'bye') break;
    if (c === 'chat') {
      const lines = { tony: ['Thirty years I been running this block. Respect is the only currency in here.', 'You see Rico? Don\'t tell him nothing.', 'Outside you\'re somebody. In here you\'re a number. Unless you\'re me.'],
        dre: ['Yard\'s the only place I feel free.', 'You fight? Nah, for real, you fight?', 'Golden Gloves at sixteen. Then this.'],
        pops: ['Got in when gas was a dollar. They took my youth, but they ain\'t took my mind.', 'Walls talk, kid. You just gotta listen.', 'Every man in here thinks about the outside. Some of us think about the inside of the walls.'],
        rico: ['Psst. You hear about Moose? Nah, I can\'t say. ...Okay I\'ll say.', 'I know everything that goes on in this place. Everything.', 'Guards like me. I\'m likeable.'],
        moose: ['Life. No parole. So I lift.', 'Spot me. Don\'t drop it on my neck.', '...'],
        mikey: ['First time inside. Is it always this loud?', 'They took my shoelaces. Why do they take your shoelaces?', 'I just want to go home, man.'],
        joy: ['Eat, baby, you\'re skin and bones.', 'Twenty years I been feeding these boys.', 'Pudding\'s on Thursdays. Don\'t tell nobody.'],
        nurse: ['Hydrate. Nobody in here hydrates.', 'You\'d be amazed what they swallow.'], walsh: ['I don\'t do small talk.'], grimes: ['Keep it moving.', 'I got eight years to my pension. Don\'t ruin it.'], guard2: ['Eyes forward.', 'Nice day for the yard.'] }[id];
      await talk.say(pick(lines)); bumpRel(rid, 4); gainXP('charm', 5); feed({ mood: 2 });
    }
    else if (c === 'time') await talk.say(`${hrs(jailLeft())} left. Lights out at 22:00, count at 06:00.`);
    else if (c === 'bail') { const b = bailCost(); if (money < b) await talk.say('You ain\'t got it. Sit down.'); else { spend(b); endTalk(); return releasePrison('Bail posted. You walk out a free man.'); } }
    else if (c === 'cs') { J.csAsked = true; if (Math.random() < 0.6 + rel(rid) * 0.004) { await talk.say('Judge signed off. One bin round, no pay. Skip it and you come right back.'); endTalk(); return communityService(); } await talk.say('Request denied. Judge says you sit.'); }
    else if (c === 'bribe') { if (money < 1000) { await talk.say('With what?'); continue; } spend(1000); if (Math.random() < 0.45) { await talk.say('...I didn\'t see nothing. Paperwork says you\'re done. Go.'); endTalk(); return releasePrison('Grimes "lost" your paperwork.'); } J.until += 6; await talk.say('Attempted bribery of an officer. That\'s six more hours. And I\'m keeping the money.'); }
    else if (c === 'mouth') { await talk.say(pick(['Hey Grimes, your mama called. She wants her uniform back.', 'This place is a dump and you\'re the janitor.']), 'you'); await talk.say('Solitary. Now.'); endTalk(); J.until += 2; return prisonSkip(4, 'The hole', 'Four hours in solitary. No light. You count the cracks in the wall.', () => { feed({ mood: -8 }); bumpRel('pr:tony', 3); toast('+2h on your sentence. The yard heard you mouthed off. Respect +', 3); }); }
    else if (c === 'shiv') { if (J.shiv) { await talk.say('You already got one. Keep it hidden.'); continue; } if (rel(rid) < 15) { await talk.say('I don\'t know you. Earn some respect first.'); continue; } if (money < 150) { await talk.say('Hundred fifty. Commissary prices.'); continue; } spend(150); J.shiv = true; await talk.say('Toothbrush and a razor. Keep it in your sock. You didn\'t get it from me.'); toast('Got a shiv. You hit harder in prison fights.', 3); }
    else if (c === 'work') { J.debt = 1; await talk.say('Rico owes me two hundred. Go collect. However you gotta.'); }
    else if (c === 'paid') { J.debt = 3; addMoney(60); bumpRel(rid, 20, false); await talk.say('Good. Here, your cut. You\'re alright, new guy.'); }
    else if (c === 'riot') {
      if (rel(rid) < 30 && !J.shiv) { await talk.say('A riot? You? Nobody follows you. Earn it.'); continue; }
      await talk.say('...You serious? Alright. When the bell rings for chow, it goes down.'); endTalk(); return prisonRiot();
    }
    else if (c === 'fight') { endTalk(); return prisonFight(id, false); }
    else if (c === 'collect') {
      await talk.say('Carlos wants his two hundred.', 'you');
      const k = await talk.choose([I('fist', 'Pay up or else'), I('chat', 'Talk him into it')]);
      if (k === 1 && Math.random() < 0.3 + lvl('charm') * 0.06) { await talk.say('Fine, fine! Here. Tell Carlos we\'re good.'); J.debt = 2; }
      else if (k === 1) await talk.say('Nice try. Tell Carlos he can come get it himself.');
      else { endTalk(); const won = await prisonFight('rico', false); if (won) { J.debt = 2; toast('Rico paid up. Go see Carlos.', 3); } return; }
    }
    else if (c === 'plan') { J.plan = true; await talk.say('*whispers* Wall behind cell 5\'s toilet is old brick over a storm drain. Get a spoon from the canteen. Dig at night. Three nights, maybe less.'); await talk.say('And kid? Don\'t tell Rico.'); }
    else if (c === 'deal') {
      if (J.fed) { await talk.say('We already talked. Enjoy your stay.'); continue; }
      await talk.say('Agent Walsh. Someone\'s moving product all over Bay City. Give me a name and I\'ll halve your sentence.');
      const k = await talk.choose([I('chat', 'Give them a dealer\'s name'), I('x', 'I ain\'t no snitch'), I('case', 'Talk to my lawyer')]);
      J.fed = true;
      if (k === 0) { J.until -= jailLeft() * 0.5; J.snitch = true; for (const p of PLACES) if (p.kind === 'dealer') stats.rel[p.id] = Math.max(0, rel(p.id) - 40); await talk.say('Pleasure doing business. Half your time is gone. Watch your back.'); toast('Sentence halved. Dealers won\'t trust you, and word travels in here...', 4); }
      else if (k === 1) { bumpRel('pr:tony', 10, false); await talk.say('Suit yourself. Enjoy the orange.'); toast('The block respects a man who keeps his mouth shut.', 3); }
      else await talk.say('Lawyers. Always lawyers.');
    }
    else if (c === 'food') { if (money < 5) continue; spend(5); feed({ hunger: 25, mood: 4 }); await talk.say('Extra mash, extra gravy. Don\'t tell nobody.'); }
    else if (c === 'heal') { P.hp = maxHP(); await talk.say('There. Try not to get stabbed.'); }
    else if (c === 'protect') { await talk.say(rel(rid) < 15 ? 'N-no. I\'m fine.' : 'Rico keeps taking my pudding. And the guys at table three...'); bumpRel(rid, 6); bumpRel('pr:tony', 2); feed({ mood: 5 }); }
  }
  endTalk(); saveGame();
}
const PR_OPP = { dre: { name: 'Dre "Hands"', hp: 80, power: 10, tell: 0.8, col: '#ff7a1a', skin: '#8d5524' }, moose: { name: 'Moose', hp: 110, power: 13, tell: 0.85, col: '#ff7a1a', skin: '#e8b088' }, rico: { name: 'Rico', hp: 45, power: 6, tell: 0.95, col: '#ff7a1a' }, tony: { name: 'Big Carlos', hp: 100, power: 12, tell: 0.75, col: '#ff7a1a' }, guard: { name: 'Riot squad', hp: 90, power: 11, tell: 0.8, col: '#1d2b52' } };
// prison fights happen for real on the floor: the inmate steps out as a fighter, the block crowds round to watch
let brawl = null;
function startBrawl(id, onEnd, o2) {
  const n = inside?.npcs.find(q => q.pr === id); if (!n) { onEnd?.(false); return; }
  const J = jail(), o = { ...(PR_OPP[id] || PR_OPP.dre), ...(o2 || {}) };
  n.hidden = true; if (n.fig) n.fig.root.visible = false;
  const look = n.look ||= bakeCfg(n.cfg), p = peds.makePed(look);
  Object.assign(p, { kind: 'inmate', x: n.x, z: n.z, hx: n.x, hz: n.z, state: 'chase', tx: P.x, tz: P.z, angry: true, angryT: 999, name: o.name, hp: Math.max(3, Math.round(o.hp / 9 * (J?.shiv ? 0.7 : 1))), power: o.power, brawler: true });
  peds.list.push(p);
  brawl = { p, n, id, onEnd, t: 0, o };
  for (const q of inside.npcs) if (q.role === 'guest' && Math.hypot(q.x - n.x, q.z - n.z) < 14) { q.dance = true; q.cheer = true; }
  toast(`${o.name} squares up! Tap PUNCH for combos, KICK to finish.`, 3); sfx.click();
}
function endBrawl(win) {
  const b = brawl; if (!b) return; brawl = null;
  b.p.angry = false;
  for (const q of inside?.npcs || []) if (q.cheer) { q.dance = false; q.cheer = false; }
  setTimeout(() => { const i = peds.list.indexOf(b.p); if (i >= 0) peds.list.splice(i, 1); dyn.remove(b.p.root); b.n.hidden = false; }, win ? 2200 : 800);
  b.onEnd?.(win);
}
function updateBrawl(dt) {
  const b = brawl; if (!b) return; b.t += dt;
  if (b.p.state === 'down' || !peds.list.includes(b.p)) return endBrawl(true);
  if (P.hp < maxHP() * 0.22 || P.dead) { P.hp = Math.max(P.hp, maxHP() * 0.18); return endBrawl(false); }
  if (b.t > 60) return endBrawl(false);
}
function prisonFight(id, forced) {
  return new Promise(res => {
    startBrawl(id, win => {
      const J = jail(), o = PR_OPP[id] || PR_OPP.dre; if (!J) return res(false);
      J.fights++;
      if (win) { gainXP('strength', 30); feed({ mood: 12, energy: -15 }); bumpRel('pr:tony', 6, false); bumpRel('pr:' + id, forced ? 0 : 5, false); toast(`You put ${o.name} down. The whole block saw it.`, 3); }
      else { feed({ mood: -10, energy: -15 }); toast(`${o.name} got the better of you. Guards pulled him off.`, 3); }
      if (Math.random() < 0.45) { J.until += 4; setTimeout(() => toast('Guards wrote you up. +4h on your sentence.', 3), 2000); }
      saveGame(); res(!!win);
    });
  });
}
async function prisonRiot() {
  const J = jail(); $('hurt').style.background = 'rgba(255,0,0,.35)'; shake = 1; sfx.boom?.();
  toast('RIOT! Trays flying, alarms screaming!', 3);
  for (const n of inside.npcs) if (n.role === 'guest') n.dance = true;
  setTimeout(() => { $('hurt').style.background = ''; }, 1500);
  startBrawl('guard2', win => {
    for (const n of inside.npcs) n.dance = false;
    if (win && Math.random() < 0.6) {
      modal('<h3>The gate is jammed open</h3><p>In the chaos the security gate is stuck half open. Nobody is watching it.</p>', [{ label: 'RUN', cls: 'big', fn: () => { closeModal(); escapePrison('You sprint through the jammed gate during the riot.'); } }, { label: 'Stay put', fn: () => { closeModal(); bumpRel('pr:tony', 15, false); toast('You stayed. Carlos respects the chaos you caused.', 3); } }]);
    } else { J.until += 12; prisonSkip(12, 'Lockdown', 'The riot squad clears the block. Everyone in their cells. +12h on your sentence.', () => { feed({ mood: -10 }); bumpRel('pr:tony', 10, false); }); }
  }, { name: 'Officer Pike', hp: J.shiv ? 50 : 75, power: 11 });
}

// ================================================================ HUD, minimap
let MAP = null;
const mm = $('minimap'), mctx = mm.getContext('2d');
function ensureMap() { if (!MAP) { MAP = drawMap(1600); mctx.imageSmoothingEnabled = true; mctx.imageSmoothingQuality = 'high'; } }
function markerIcon(m) { return m.place.kind === 'property' && owned.has(m.place.id) ? 'key' : m.icon; }
function drawMinimap() {
  ensureMap();
  const S = mm.width, SH = mm.height, CX = S / 2, CY = SH / 2, R = Math.max(S, SH) / 2;
  mctx.save(); mctx.clearRect(0, 0, S, S);
  
  if (inside) { // a proper floor plan: rooms, walls, furniture, things you can use, and who's home
    mctx.fillStyle = '#1a1626'; mctx.fillRect(0, 0, S, SH);
    const H = inside.h, tpl = INTERIORS[inside.id], sc = Math.min((S - 26) / H.w, (SH - 44) / H.d);
    const X = lx => CX + lx * sc, Y = lz => CY + lz * sc;
    mctx.fillStyle = tpl.floor; mctx.fillRect(X(-H.w / 2), Y(-H.d / 2), H.w * sc, H.d * sc);
    for (const [x0, z0, x1, z1, c] of tpl.floors || []) { mctx.fillStyle = c; mctx.fillRect(X(x0), Y(z0), (x1 - x0) * sc, (z1 - z0) * sc); }
    // furniture as little blocks, rotated the way they sit
    const ACT_ICON = { sleep: 'bed', sit: 'sofa', tv: 'tv', eat: 'fridge', cook: 'food', shower: 'wave', bath: 'wave', toilet: 'door', read: 'book', laptop: 'case', lift: 'dumbbell', run: 'run', music: 'music', relax: 'heart', arcade: 'play', hottub: 'wave', piano: 'music', drink: 'drink' };
    const icons = [];
    for (const f of H.furn) { const F = FURN[f.t]; if (!F || F.wall) continue; const r = f.r || 0;
      mctx.save(); mctx.translate(X(f.x), Y(f.z)); mctx.rotate(-r); mctx.fillStyle = F.act ? 'rgba(255,255,255,.42)' : 'rgba(255,255,255,.2)'; mctx.fillRect(-F.w * sc / 2, -F.d * sc / 2, F.w * sc, F.d * sc); mctx.restore();
      if (F.act && inside.prop) icons.push([ACT_ICON[F.act], X(f.x), Y(f.z)]); }
    // walls
    mctx.fillStyle = '#e8e2d6';
    for (const [x0, z0, x1, z1] of tpl.walls || []) mctx.fillRect(X(x0), Y(z0), Math.max(2, (x1 - x0) * sc), Math.max(2, (z1 - z0) * sc));
    mctx.strokeStyle = '#e8e2d6'; mctx.lineWidth = 4; mctx.beginPath();
    mctx.moveTo(X(-1.2), Y(H.d / 2)); mctx.lineTo(X(-H.w / 2), Y(H.d / 2)); mctx.lineTo(X(-H.w / 2), Y(-H.d / 2)); mctx.lineTo(X(H.w / 2), Y(-H.d / 2)); mctx.lineTo(X(H.w / 2), Y(H.d / 2)); mctx.lineTo(X(1.2), Y(H.d / 2)); mctx.stroke(); // the gap is the front door
    for (const [ic, a2, b2] of icons) if (ic) drawIcon(mctx, ic, a2, b2, 15, { stroke: '#16161b', width: 2.2 });
    for (const m2 of inside.marks) drawIcon(mctx, m2.spot.icon, X(m2.x - ORIGIN.x), Y(m2.z - ORIGIN.z), 20, { stroke: '#ffd23f', width: 2.6 });
    // people: hearts for your partner, smiles for your kids, dots for everyone else
    for (const n of inside.npcs) { const a2 = X(n.x - ORIGIN.x), b2 = Y(n.z - ORIGIN.z);
      if (n.role === 'spouse' || n.role === 'kid') { mctx.fillStyle = n.role === 'spouse' ? '#ff3b8a' : '#ffd23f'; mctx.beginPath(); mctx.arc(a2, b2, 12, 0, 7); mctx.fill(); drawIcon(mctx, n.role === 'spouse' ? 'heart' : 'smile', a2, b2, 15, { stroke: '#fff', width: 2.4 }); }
      else if (n.role !== 'guest') { mctx.fillStyle = '#9fb7ff'; mctx.beginPath(); mctx.arc(a2, b2, 6, 0, 7); mctx.fill(); } }
    if (date && !date.inCar && date.fig?.root.visible) { const a2 = X(date.x - ORIGIN.x), b2 = Y(date.z - ORIGIN.z); mctx.fillStyle = '#ff3b8a'; mctx.beginPath(); mctx.arc(a2, b2, 12, 0, 7); mctx.fill(); drawIcon(mctx, 'heart', a2, b2, 15, { stroke: '#fff', width: 2.4 }); }
    mctx.save(); mctx.translate(X(P.x - ORIGIN.x), Y(P.z - ORIGIN.z)); mctx.rotate(Math.PI - P.face);
    mctx.fillStyle = '#ffd23f'; mctx.strokeStyle = '#1a1a2a'; mctx.lineWidth = 4; mctx.beginPath(); mctx.moveTo(0, -14); mctx.lineTo(10, 10); mctx.lineTo(0, 4); mctx.lineTo(-10, 10); mctx.closePath(); mctx.stroke(); mctx.fill(); mctx.restore();
    mctx.restore();
  } else {
    const f = focusPos(), px = f.x, pz = f.z, face = ride ? ride.s.h : P.face, span = ride ? 260 : 170;
    const mx = MAP.tx(px), mz = MAP.tz(pz), ms = span / MAP.sx;
    mctx.fillStyle = '#3d8fd0'; mctx.fillRect(0, 0, S, SH);
    mctx.save(); mctx.translate(CX, CY); mctx.rotate(camYaw); mctx.drawImage(MAP.canvas, mx - ms * 0.75, mz - ms * 0.75, ms * 1.5, ms * 1.5, -R * 1.5, -R * 1.5, R * 3, R * 3); mctx.restore();
    const ca = Math.cos(camYaw), sa = Math.sin(camYaw), toS = (wx, wz) => { const dx = (wx - px) / span * R * 2, dz = (wz - pz) / span * R * 2; return [CX + dx * ca - dz * sa, CY + dx * sa + dz * ca]; };
    if (route) { mctx.strokeStyle = '#b26bff'; mctx.lineWidth = 9; mctx.lineJoin = 'round'; mctx.lineCap = 'round'; mctx.beginPath(); route.forEach(([x, z], i) => { const [a, b] = toS(x, z); i ? mctx.lineTo(a, b) : mctx.moveTo(a, b); }); mctx.stroke(); }
    mctx.fillStyle = '#ffffff';
    for (const t of traffic) { const [a, b] = toS(t.rx, t.rz); mctx.fillRect(a - 3, b - 3, 6, 6); }
    if ((WANT.stars && !WANT.seen) || WANT.patrolT > 0) { const [a, b] = toS(WANT.lx, WANT.lz), rr = searchR() / span * R * 2, fl = Math.floor(time * 3) % 2, pat = !WANT.stars; mctx.fillStyle = pat ? 'rgba(42,106,255,.12)' : fl ? 'rgba(255,42,58,.22)' : 'rgba(42,106,255,.22)'; mctx.strokeStyle = pat ? 'rgba(42,106,255,.6)' : fl ? 'rgba(255,42,58,.8)' : 'rgba(42,106,255,.8)'; mctx.lineWidth = 2; if (pat) mctx.setLineDash([6, 5]); mctx.beginPath(); mctx.arc(a, b, rr, 0, 7); mctx.fill(); mctx.stroke(); mctx.setLineDash([]); }
    // police vision cones: always on, so you can see who's watching before a deal
    for (const e of eyes()) { const [a, b] = toS(e[0], e[1]); if (Math.abs(a - CX) > CX + 30 || Math.abs(b - CY) > CY + 30) continue; const rr = e[3] / span * R * 2, ang = Math.atan2(Math.cos(e[2]), Math.sin(e[2])); const g = mctx.createRadialGradient(a, b, 0, a, b, rr); g.addColorStop(0, WANT.stars ? 'rgba(255,60,70,.38)' : 'rgba(80,140,255,.34)'); g.addColorStop(1, 'rgba(80,140,255,0)'); mctx.fillStyle = g; mctx.beginPath(); mctx.moveTo(a, b); mctx.arc(a, b, rr, ang - CONE, ang + CONE); mctx.closePath(); mctx.fill(); }
    for (const q of NET.list) if (q.x != null && !q.hidden) { const [a, b] = toS(q.x, q.z); mctx.fillStyle = '#4cd964'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(a, b, 5.5, 0, 7); mctx.fill(); mctx.stroke(); } // other online players
    for (const t of traffic) if (t.police) { const [a, b] = toS(t.rx, t.rz); mctx.fillStyle = '#2a6aff'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(a, b, 6, 0, 7); mctx.fill(); mctx.stroke(); }
    for (const v of copCars) { const [a, b] = toS(v.s.x, v.s.z); mctx.fillStyle = Math.floor(time * 6) % 2 ? '#ff2a3a' : '#2a6aff'; mctx.beginPath(); mctx.arc(a, b, 7, 0, 7); mctx.fill(); }
    for (const c of cops) { const [a, b] = toS(c.x, c.z); mctx.fillStyle = '#2a6aff'; mctx.fillRect(a - 3, b - 3, 6, 6); }
    mctx.fillStyle = '#ffffff';
    for (const m of markers) { const [a, b] = toS(m.x, m.z); if (Math.abs(a - CX) < CX - 10 && Math.abs(b - CY) < CY - 10) { mctx.fillStyle = 'rgba(20,18,38,.85)'; mctx.beginPath(); mctx.arc(a, b, 13, 0, 7); mctx.fill(); drawIcon(mctx, markerIcon(m), a, b, 18, { stroke: m.color, width: 2.6 }); } }
    if (myCar && ride !== myCar) { const [a, b] = toS(myCar.s.x, myCar.s.z); mctx.fillStyle = '#ff8a2a'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(a, b, 15, 0, 7); mctx.fill(); mctx.stroke(); drawIcon(mctx, 'car', a, b, 18, { stroke: '#fff', width: 2.6 }); }
    const edgeDot = (wx, wz, col, r) => { let [a, b] = toS(wx, wz); a = clamp(a, 12, S - 12); b = clamp(b, 12, SH - 12); mctx.fillStyle = col; mctx.strokeStyle = '#fff'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(a, b, r, 0, 7); mctx.fill(); mctx.stroke(); };
    if (waypoint) edgeDot(waypoint.x, waypoint.z, '#ffd23f', 11);
    if (race) edgeDot(...RACE.points[race.i], '#ff3b4a', 11);
    mctx.translate(CX, CY); mctx.rotate(Math.PI - face + camYaw);
    mctx.fillStyle = '#ffd23f'; mctx.strokeStyle = '#1a1a2a'; mctx.lineWidth = 4;
    mctx.beginPath(); mctx.moveTo(0, -16); mctx.lineTo(11, 11); mctx.lineTo(0, 5); mctx.lineTo(-11, 11); mctx.closePath(); mctx.stroke(); mctx.fill();
    mctx.restore();
  }
}
const MAP_CATS = [['dealer', 'Dealers', 'deal', k => k === 'dealer'], ['shops', 'Shops', 'bag', k => ['guns', 'clothes', 'barber', 'tattoo'].includes(k)], ['fun', 'Food & fun', 'food', k => k === 'venue'],
  ['act', 'Activities', 'play', k => ['game', 'job', 'ride', 'carny', 'stadium', 'marina'].includes(k)], ['cars', 'Cars & boats', 'car', k => ['service', 'mods', 'chop', 'race', 'boats', 'rides'].includes(k)], ['homes', 'Homes & business', 'house', k => k === 'property' || k === 'biz']];
const placeCat = k => MAP_CATS.find(c => c[3](k))?.[0] || 'act';
const catOn = id => !(stats.mapOff ||= {})[id];
function drawMapTo(cv) {
  ensureMap();
  const PAD = cv.pad || 0, S = cv.width - PAD * 2, x = cv.getContext('2d'); x.fillStyle = '#3d8fd0'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(MAP.canvas, PAD, PAD, S, cv.height - PAD * 2);
  const k = S / 512, kp = S / MAP.canvas.width, tx = wx => PAD + MAP.tx(wx) * kp, tz = wz => PAD + MAP.tz(wz) * kp; // k sizes things, kp places them (the base map is bigger than 512 now)
  if (route) { x.strokeStyle = '#b26bff'; x.lineWidth = 3 * k; x.lineJoin = 'round'; x.beginPath(); route.forEach(([a, b], i) => i ? x.lineTo(tx(a), tz(b)) : x.moveTo(tx(a), tz(b))); x.stroke(); }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `900 ${Math.round(12 * k)}px ui-rounded, system-ui, sans-serif`;
  for (const [name, wx, wz] of LABELS) { x.lineWidth = 3.5 * k; x.strokeStyle = 'rgba(0,0,0,.55)'; x.strokeText(name, tx(wx), tz(wz)); x.fillStyle = '#fff'; x.fillText(name, tx(wx), tz(wz)); }
  for (const m of markers) { if (m.place && !catOn(placeCat(m.place.kind))) continue; x.fillStyle = 'rgba(20,18,38,.9)'; x.beginPath(); x.arc(tx(m.x), tz(m.z), 7.5 * k, 0, 7); x.fill(); drawIcon(x, markerIcon(m), tx(m.x), tz(m.z), 10.5 * k, { stroke: m.color, width: 2.4 }); }
  const dot = (wx, wz, col, r) => { x.fillStyle = col; x.strokeStyle = '#fff'; x.lineWidth = 2 * k; x.beginPath(); x.arc(tx(wx), tz(wz), r * k, 0, 7); x.fill(); x.stroke(); };
  if (myCar && ride !== myCar) dot(myCar.s.x, myCar.s.z, '#ff8a2a', 5);
  if (waypoint) { dot(waypoint.x, waypoint.z, '#ffd23f', 7); x.fillStyle = '#1a1a2a'; x.font = `900 ${Math.round(9 * k)}px sans-serif`; x.fillText('W', tx(waypoint.x), tz(waypoint.z) + k * 0.5); }
  const f = inside ? inside.back : focusPos(); dot(f.x, f.z, '#38e8ff', 6);
  return { k, fromX: px => WORLD.x0 + (px - PAD) / kp * MAP.sx, fromZ: pz => WORLD.z0 + (pz - PAD) / kp * MAP.sz, tx, tz };
}
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
const ICONS = {
  car: 'car', exit: 'door', jump: 'run', fire: 'target', reload: 'rotate', gas: 'plus', brake: 'minus', horn: 'radio', door: 'door', smash: 'bolt', flag: 'flag', chat: 'chat', punch: 'fist', throw: 'bolt', none: null, edit: 'edit', place: 'check', rotate: 'rotate', store: 'box', done: 'check',
};
const BTN_SVG = {
  attack: '<path d="M12 2l2.2 5.2L19.5 5l-2.2 5.3L22 12l-4.7 1.7 2.2 5.3-5.3-2.2L12 22l-2.2-5.2L4.5 19l2.2-5.3L2 12l4.7-1.7L4.5 5l5.3 2.2z"/><circle cx="12" cy="12" r="2.6"/>',
  drift: '<path d="M5 17c3-1 5-4 6-8M9 19c3-1 6-5 7-10"/><circle cx="18" cy="6" r="3"/><path d="M3 21h6M13 21h8"/>', // a car's tracks curling into a slide
  nitro: '<rect x="7" y="7" width="10" height="15" rx="4"/><path d="M10 7V4h4v3M9 2h6M7 12h10M7 16h10"/>', // a NOS bottle
  jump: '<path d="M12 20V6"/><path d="M6 12l6-6 6 6"/><path d="M5 3h14"/>', gas: '<path d="M6 13l6-6 6 6"/><path d="M6 19l6-6 6 6"/>', brake: '<path d="M6 5l6 6 6-6"/><path d="M6 11l6 6 6-6"/>',
  burnout: '<circle cx="12" cy="14" r="5"/><circle cx="12" cy="14" r="1.6"/><path d="M5 6c1-2 3-2 4 0M10 4c1-2 3-2 4 0M15 6c1-2 3-2 4 0"/>',
  lights: '<path d="M10 6c-4 0-6 3-6 6s2 6 6 6c1.6 0 2.2-1.5 2.2-6S11.6 6 10 6z"/><path d="M15 8h6M15 12h6M15 16h6"/>',
  horn: '<path d="M4 10v4h4l5 4V6L8 10z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>', exit: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
  fire: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>', smash: '<path d="M14 3l-2 6 5 1-7 11 2-7-5-1z"/>', throw: '<circle cx="8" cy="15" r="4"/><path d="M12 11c3-4 6-5 9-5M18 3l3 3-3 3"/>',
};
const btnCache = {}, keyLbl = {};
// on a computer the touch buttons hide and a little legend shows which key does what right now
const KEYCAP = id => id === 'btnA' ? 'E' : id === 'btnB' ? (ride ? 'F' : 'Space') : id === 'btnX' ? (ride && !/Shoot/.test(keyLbl.btnX || '') ? 'Space' : 'Click') : 'R';
let keyHintK = '';
function renderKeyHints() { if (!document.body.classList.contains('desktop')) return; let el = $('keyHints'); if (!el) { el = document.createElement('div'); el.id = 'keyHints'; document.body.appendChild(el); }
  const rows = ['btnA', 'btnB', 'btnX', 'btnY'].filter(id => keyLbl[id] && (id === 'btnY' || !$(id).classList.contains('hidden'))).map(id => [KEYCAP(id), keyLbl[id]]).concat(keyLbl.btnA === 'Phone' ? [] : [['T', 'Phone']], [['Q', 'Next weapon'], ['M', 'Map']]);
  const k = JSON.stringify(rows); if (k === keyHintK) return; keyHintK = k; el.innerHTML = rows.map(([c, l]) => `<div><kbd>${c}</kbd><span>${l}</span></div>`).join(''); }
function setDesktop(on) { document.body.classList.toggle('desktop', on); keyHintK = ''; if (on) renderKeyHints(); else $('keyHints')?.remove(); }
setDesktop(!isTouchDevice());
addEventListener('touchstart', () => { if (document.body.classList.contains('desktop')) setDesktop(false); }, { passive: true }); // picked up a touch screen: back to touch controls
addEventListener('keydown', e => { if (!document.body.classList.contains('desktop') && /^(Key[WASD]|Arrow)/.test(e.code) && !input.touch) setDesktop(true); });
function isTouchDevice() { return matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0; }
function setBtn(id, icon, label) {
  if (keyLbl[id] !== label) { keyLbl[id] = label; renderKeyHints(); }
  const k = icon + '|' + label; if (btnCache[id] === k) return; btnCache[id] = k;
  const inner = BTN_SVG[icon] ? `<svg viewBox="0 0 24 24">${BTN_SVG[icon]}</svg>` : icon && icon !== 'none' ? svg(ICON_SET[ICONS[icon] || icon] ? (ICONS[icon] || icon) : 'hand', 'btn') : '<svg viewBox="0 0 24 24"></svg>';
  const plain = String(label).replace(/<[^>]+>/g, ''), longest = Math.max(0, ...plain.split(/\s+/).map(w => w.length));
  $(id).innerHTML = `${inner}<span class="${longest > 7 ? 'xs' : plain.length > 11 ? 'sm' : ''}">${label}</span>`; // long words shrink to fit the round button
}
// needs rings shown inside a conversation (food, drinks), so you can see what you're filling up
function talkNeeds(on) {
  const el = $('talkNeeds'); if (!on) { el.classList.add('hidden'); return; }
  const ring = (cls, ic, v) => `<div class="need ${cls}${v < 25 ? ' low' : ''}" style="--v:${Math.round(v)}%">${$(ic).querySelector('svg').outerHTML}</div>`;
  el.innerHTML = ring('tn-h', 'nHunger', stats.hunger) + ring('tn-e', 'nEnergy', stats.energy) + ring('tn-m', 'nMood', stats.mood) + ring('tn-y', 'nHygiene', stats.hygiene ?? 80) + ring('tn-b', 'nBladder', stats.bladder ?? 85); el.classList.remove('hidden');
}
function needBar(id, v) { if (!$(id)) return; const el = $(id); el.style.setProperty('--v', v + '%'); el.classList.toggle('low', v < 25); }
function updateHUD(dt) {
  const hh = Math.floor(clockH), m10 = Math.floor((clockH - hh) * 6) * 10;
  setText('clockTxt', `${String(hh).padStart(2, '0')}:${String(m10).padStart(2, '0')}`);
  $('clockIco').innerHTML = hudCache.ci === (clockH >= 6 && clockH < 19) ? $('clockIco').innerHTML : ((hudCache.ci = clockH >= 6 && clockH < 19) ? svg('sun', 'sm') : svg('moon', 'sm'));
  setText('moneyTxt', fmt(money));
  const f = focusPos();
  setText('zoneTxt', inside ? (inside.prop ? inside.prop.name : inside.place.name) : zoneName(f.x, f.z));
  { const show = !!waypoint && !inside; $('mmNav').classList.toggle('hidden', !show); $('wpTxt').classList.add('hidden'); if (show) { const d = Math.hypot(f.x - waypoint.x, f.z - waypoint.z); setText('mmNavD', navDist(d)); setText('mmNavT', waypoint.label || 'Waypoint'); } $('mmWrap').classList.toggle('navving', show); } // sat-nav strip along the bottom of the phone-map
  { const wh = $('wantedHud'), key = WANT.stars; if (hudCache.want !== key) { hudCache.want = key; if (WANT.stars) { clearTimeout(peekT.radioBtn); $('radioBtn').classList.remove('open'); } wh.innerHTML = WANT.stars ? Array.from({ length: 5 }, (_, i) => `<i class="${i < WANT.stars ? '' : 'off'}"></i>`).join('') + '<u><s></s></u>' : ''; } wh.classList.toggle('flash', WANT.stars > 0 && !WANT.seen); wh.classList.toggle('seen', WANT.stars > 0 && WANT.seen); const bar = wh.querySelector('s'); if (bar) bar.style.width = (WANT.seen ? 0 : Math.min(100, WANT.loseT / evadeNeed() * 100)) + '%'; }
  if (!$('nHealth')) $('nHunger').insertAdjacentHTML('beforebegin', `<div class="need" id="nHealth">${svg('heart', 'sm')}<i></i></div>`);
  needBar('nHealth', Math.round(P.hp / maxHP() * 100));
  needBar('nHunger', stats.hunger); needBar('nEnergy', stats.energy); needBar('nMood', stats.mood); needBar('nHygiene', stats.hygiene ?? 80); needBar('nBladder', stats.bladder ?? 85);
  const a = am(), id = arsenal.cur, wk = id + '|' + a.mag + '|' + a.res + '|' + (P.reload > 0);
  if (hudCache.wpn !== wk) { hudCache.wpn = wk; $('wpnBtn').innerHTML = iconSVG(id) + (ws.kind === 'melee' ? '' : ws.kind === 'grenade' ? `<b>${a.res}</b>` : P.reload > 0 ? '<b class="rl">RELOAD</b>' : `<b>${a.mag}</b><span>${a.res}</span>`); }
  $('wpnBtn').classList.toggle('hidden', !!inside);
  if (!$('pad').classList.contains('wpnslot') && (hudCache.wpT = (hudCache.wpT || 0) + 1) % 15 === 0) { // keep the weapon pill just above whichever action button is on top (they move between foot and car layouts)
    const pad = $('pad'), wb = $('wpnBtn'); let top = 1e9; for (const b of pad.querySelectorAll('.face .fbtn')) { if (b.offsetParent === null || b.classList.contains('hidden')) continue; const r = b.getBoundingClientRect(); if (r.height && r.top < top) top = r.top; }
    if (top < 1e9) { const pr = pad.getBoundingClientRect(), y = Math.round(top - pr.top - wb.offsetHeight - 10); if (hudCache.wpY !== y) { hudCache.wpY = y; wb.style.top = y + 'px'; } } }
  $('editBtn').classList.add('hidden'); // edit home lives on the top action button now
  $('radioBtn').classList.toggle('hidden', !ride);
  $('carLabel').classList.toggle('on', !!ride && time < carLabelT);
  $('speedo').classList.toggle('hidden', !ride || time < carLabelT || !!ride.b.two && ride.cfg?.body === 'bike'); // car name first, then the speed
  $('phoneBtn').classList.add('hidden');
  $('speedo').classList.add('hidden'); { const sd = $('mmSpeed'), show = !!ride && !(ride.b.two && ride.cfg?.body === 'bike'); sd.classList.toggle('hidden', !show); if (show) { const mph = Math.round(Math.abs(ride.s.v) * 2.237), lim = speedLimit(ride.s.x, ride.s.z); setText('mmSpeedN', String(mph)); sd.classList.toggle('over', !!lim && mph > lim + 4); } } // the number flashes red when you're over the limit
  const jt = race ? `Race ${race.i}/${RACE.points.length} · ${Math.ceil(race.t)}s` : job ? (job.type === 'bins' ? (job.stage === 'return' ? 'Bins · return the lorry' : `Bins · ${8 - job.bins.length}/8 · ${fmt(job.earned)}`) : job.type === 'taxi' ? (job.stage === 'pickup' ? `Cab · pick up fare · ${fmt(job.earned)}` : `Cab · drop off · ${Math.ceil(job.t)}s · ${fmt(job.pay)}`) : `Courier · ${Math.ceil(job.t)}s · ${fmt(job.pay)}`) : '';
  setText('raceTxt', jt); $('raceTxt').classList.toggle('hidden', !jt);
  if (editMode) { setBtn('btnA', held ? 'check' : 'hand', held ? 'Place' : 'Pick up'); setBtn('btnB', 'check', 'Done'); setBtn('btnX', held ? 'rotate' : 'none', held ? 'Rotate' : ''); setBtn('btnY', held ? 'box' : 'none', held ? 'Store' : ''); } // rotate/store only while you're holding something
  else if (ride && (settings.steer || 'screen') === 'screen') { setBtn('btnA', action ? action.icon : 'phone', action ? action.label : 'Phone'); setBtn('btnB', 'exit', 'Get out');
    if (ws.kind === 'gun') setBtn('btnX', 'fire', 'Shoot'); else if (ride.police && !ride.b.two) setBtn('btnX', 'siren', ride.sirenOn ? 'Siren on' : 'Siren'); else if (ride.st?.nitro && !ride.b.two) setBtn('btnX', 'nitro', `Nitro ${Math.round((ride.nos ?? 1) * 100)}%`); else if (ride.b.two || ride.b.boat) setBtn('btnX', 'none', ''); else setBtn('btnX', 'drift', 'Drift'); }
  else if (ride) { setBtn('btnA', 'gas', 'Drive'); setBtn('btnX', 'brake', ride.s.v > 0.5 ? 'Brake' : 'Reverse'); setBtn('btnB', ws.kind === 'gun' ? 'fire' : 'none', ws.kind === 'gun' ? 'Shoot' : ''); setBtn('btnY', action ? action.icon : 'exit', action ? action.label : 'Get out'); }
  else {
    setBtn('btnA', action ? action.icon : P.dead ? 'none' : 'phone', action ? action.label : P.dead ? '' : 'Phone'); // nothing to do here: the button is your phone
    setBtn('btnB', 'jump', 'Jump');
    const k = inside && inside.id !== 'prison' ? 'none' : ws.kind, inn = inside && inside.id !== 'prison';
    setBtn('btnX', k === 'melee' ? (id === 'bat' ? 'fist' : 'attack') : k === 'grenade' ? 'throw' : k === 'none' ? 'none' : 'fire', k === 'melee' ? (id === 'bat' ? 'Swing' : 'Attack') : k === 'grenade' ? 'Throw' : k === 'none' ? '' : 'Fire');
    if (inside?.prop && inn) setBtn('btnY', 'edit', 'Edit home'); else
    { const g = k === 'melee' && !inn ? sideGun() : null, ga = g ? arsenal.ammo[g] : null; // the gun button: shows the ammo of the gun in your hand (or the one it'll draw)
      if (k === 'gun' || k === 'rpg') setBtn('btnY', 'rotate', P.reload > 0 ? 'Reloading' : `${a.mag} | ${a.res}`); else if (g) setBtn('btnY', 'gun', `${ga.mag} | ${ga.res}`); else setBtn('btnY', 'none', ''); }
  }
  { const slot = (!ride || (settings.steer || 'screen') === 'screen') && !inside && !editMode; $('pad').classList.toggle('wpnslot', slot); $('btnY').classList.toggle('hidden', slot); }
  $('btnA').classList.toggle('ready', !!action || editMode);
  $('btnA').classList.toggle('idle', false);
  $('btnX').classList.toggle('idle', !ride && !editMode && (inside || false));
  $('btnY').classList.toggle('idle', !ride && !editMode && !(!inside && (ws.kind === 'gun' || ws.kind === 'rpg' || (ws.kind === 'melee' && sideGun()))) && !(inside?.prop && inside.id !== 'prison'));
  $('pad').classList.toggle('driving', !!ride && (settings.steer || 'screen') !== 'screen');
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  if (noteT > 0) { noteT -= dt; if (noteT <= 0) { $('note').classList.add('hidden'); slotSync(); } }
  drawMinimap();
}

// ---------------- weapon & radio wheels
$('pad').appendChild($('wpnBtn')); // the weapon sits in with the action buttons, beside the top one
attachWheel($('wpnBtn'), {
  items: () => SLOTS.map(s => {
    const own = arsenal.owned.includes(s.id), a = arsenal.ammo[s.id];
    const sub = !own ? `${s.price ? fmt(s.price) + ' at Bay Arms' : 'Buy at Bay Arms'}` : s.kind === 'melee' ? (s.id === 'fist' ? 'Holstered' : 'Melee') : s.kind === 'grenade' ? `${a.res} left` : `${a.mag} | ${a.res}${GUN_SKILL_SLOTS.includes(s.id) ? ` · skill ${lvl('gun_' + s.id)}` : ''}`;
    return { icon: iconSVG(s.id), label: s.kind === 'gun' && own ? (arsenal.cfg[s.id].name || s.name) : s.name, short: own && s.kind !== 'melee' ? (s.kind === 'grenade' ? `${a.res}` : `${a.mag + a.res}`) : '', sub, disabled: !own, current: arsenal.cur === s.id };
  }),
  onSelect: (it, i) => selectWeapon(SLOTS[i].id),
  onTap: () => holsterToggle(), centre: () => arsenal.cur === 'fist' ? 'Fists' : 'Holster',
  onOpen: () => { timeScale = 0.2; }, onClose: () => { timeScale = 1; },
  anchor: () => document.querySelector('#pad .face'),
});
const ST_ICON = ['sun', 'music', 'moon', 'bolt', 'book', 'fist', 'heart', 'wave', 'mic', 'star', 'x'];
let lastSong = ''; onSong((song, st) => { if (!song || song.title === lastSong) return; lastSong = song.title; if ((ride || homeMusic) && !WANT.stars) peek('radioBtn', `<b>${song.title}</b><small>${song.artist}${st?.name ? ' · ' + st.name.split(' — ')[0] : ''}</small>`, 4); });
{ const row = document.createElement('div'); row.className = 'radio-row'; document.querySelector('.hud-l .needs').after(row); row.append($('radioBtn'), $('wantedHud')); } $('radioBtn').classList.add('inpill'); // the police badges sit right beside the radio // the radio lives under the needs rings now
attachWheel($('radioBtn'), {
  items: () => STATIONS.map((s, i) => ({ icon: svg(ST_ICON[i] || 'radio', 'wheel'), label: s.name.split(' — ')[0], sub: s.name.split(' — ')[1] || '', current: radioIndex() === i })),
  onSelect: (it, i) => { radioSet(i); radioOn(!!ride); const n = nowPlaying(); if (!WANT.stars) peek('radioBtn', `<b>${STATIONS[i].name.split(' — ')[0]}</b><small>${n ? n.title + ' · ' + n.artist : (STATIONS[i].name.split(' — ')[1] || '')}</small>`, 3); },
  centre: () => 'Close',
  onOpen: () => { timeScale = 0.2; }, onClose: () => { timeScale = 1; },
});
$('editBtn').addEventListener('pointerdown', e => { e.stopPropagation(); startEdit(); });
$('loveBtn').addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); talkDate(); });
$('editAdd').onclick = () => { openStorage(); };
// (Done lives on the B button in edit mode)

// ================================================================ AzBay: buy (nearly) anything online. It turns up at your door.
const GIFTS = [
  { id: 'roses', name: 'Bouquet of roses', icon: 'leaf', price: 60, love: 8, say: ['Roses?! You remembered I love these.', 'They\'re beautiful. Come here.'] },
  { id: 'chocs', name: 'Fancy chocolates', icon: 'heart', price: 35, love: 5, say: ['Ooh, the good ones. I\'m not sharing.', 'Chocolate. You know the way to my heart.'] },
  { id: 'teddy', name: 'Giant teddy bear', icon: 'smile', price: 45, love: 5, say: ['He\'s bigger than me! I love him.', 'Okay this is ridiculous. I love it.'] },
  { id: 'perfume', name: 'Designer perfume', icon: 'sparkle', price: 140, love: 11, say: ['This is my favourite! How did you know?', 'I\'m wearing it tonight. For you.'] },
  { id: 'bag', name: 'Designer handbag', icon: 'bag', price: 650, love: 18, say: ['Shut UP. Is this real?!', 'Every girl in Bay City is going to be jealous.'] },
  { id: 'necklace', name: 'Diamond necklace', icon: 'sparkle', price: 1800, love: 26, say: ['I... don\'t know what to say. It\'s stunning.', 'Put it on me. Now.'] },
];
const AZ_GROC = [{ n: 3, price: 30, name: '3 home meals' }, { n: 7, price: 60, name: 'Weekly shop (7 meals)' }];
function azUsed() { // second-hand deals, a fresh handful every day
  const r = seeded(dayN * 977), items = [];
  for (let i = 0; i < 5; i++) { const f = CATALOG[Math.floor(r() * CATALOG.length)]; items.push({ i, t: f.id, name: f.name, price: Math.round(f.price * (0.35 + r() * 0.3)), c: f.colors?.[Math.floor(r() * (f.colors?.length || 1))], seller: pick2(r, ['bayboy92', 'mama_lu', 'vintage_vic', 'k1ngjames', 'eastport_ed', 'sellit_sal']), cond: pick2(r, ['Like new', 'Good', 'Used', 'Bit scuffed']) }); }
  return items;
}
const pick2 = (r, a) => a[Math.floor(r() * a.length)];
function azOrder(o, label, express) { (stats.orders ||= []).push({ ...o, at: gameHours() + (express ? 1 : 6) }); if (express) spend(15); toast(`AzBay: ${label} ordered. ${express ? 'Arriving within the hour.' : 'Arriving later today.'}`, 2.6); saveGame(); }
function azDeliver() { // parcels waiting when you get home
  const L = stats.orders; if (!L?.length || !inside?.prop) return;
  const due = L.filter(o => gameHours() >= o.at); if (!due.length) return;
  stats.orders = L.filter(o => gameHours() < o.at); const got = [];
  for (const o of due) { if (o.k === 'furn') { storage.push({ t: o.t, c: o.c }); got.push(FURN[o.t].name); } else if (o.k === 'groc') { stats.groceries += o.n; got.push(`${o.n} meals of groceries`); } else if (o.k === 'gift') { (stats.gifts ||= []).push(o.g); got.push(GIFTS.find(g => g.id === o.g).name); } }
  setTimeout(() => toast(`AzBay parcel${due.length > 1 ? 's' : ''} on the doorstep: ${got.join(', ')}.${due.some(o => o.k === 'furn') ? ' (Furniture is in your storage. Edit Home to place it.)' : ''}`, 4), 1200); saveGame();
}
// giving someone a present you've bought
async function giveGift(id, name, x, z) {
  const have = [...new Set(stats.gifts || [])]; if (!have.length) return false;
  const k = await talk.choose([...have.map(g => { const G = GIFTS.find(q => q.id === g); return I(G.icon, G.name); }), I('x', 'Keep it for later')]);
  if (k >= have.length) return false;
  const G = GIFTS.find(q => q.id === have[k]); stats.gifts.splice(stats.gifts.indexOf(G.id), 1);
  await talk.say(pick(['Got you something.', 'Close your eyes... okay, open.']), 'you');
  bumpRel(id, G.love, false); if (date?.id === id) date.interest += G.love; hearts(x, z, Math.round(G.love / 2)); feed({ mood: 6 });
  await talk.say(pick(G.say)); saveGame(); return true;
}
function renderAzBay(el, back) {
  const tab = renderAzBay.tab || 'home', used = azUsed(), bought = stats.azUsed?.[dayN] || [];
  const tabs = [['home', 'Home'], ['groc', 'Groceries'], ['gifts', 'Gifts'], ['used', 'Used']].map(([k, l]) => `<button class="ph-mini ${tab === k ? 'on' : ''}" data-azt="${k}">${l}</button>`).join('');
  let body = '';
  if (tab === 'home') body = CATALOG.map(f => `<div class="ph-row"><span>${svg(FURN_ICON[f.act] || 'sofa', 'sm')} <b>${f.name}</b></span><span class="rowbtns"><button class="ph-mini" data-azb="furn:${f.id}" ${money < f.price ? 'disabled' : ''}>${fmt(f.price)}</button></span></div>`).join('');
  else if (tab === 'groc') body = AZ_GROC.map((g, i) => `<div class="ph-row"><span>${svg('cart', 'sm')} <b>${g.name}</b></span><span class="rowbtns"><button class="ph-mini" data-azb="groc:${i}" ${money < g.price ? 'disabled' : ''}>${fmt(g.price)}</button></span></div>`).join('');
  else if (tab === 'gifts') body = `<p class="ph-hint">Give them in person. Talk to her and pick "Give a gift".${stats.gifts?.length ? ` You have ${stats.gifts.length} wrapped.` : ''}</p>` + GIFTS.map(g => `<div class="ph-row"><span>${svg(g.icon, 'sm')} <b>${g.name}</b></span><span class="rowbtns"><button class="ph-mini" data-azb="gift:${g.id}" ${money < g.price ? 'disabled' : ''}>${fmt(g.price)}</button></span></div>`).join('');
  else body = `<p class="ph-hint">Second-hand bargains. New listings every day.</p>` + used.map(u => `<div class="ph-row col"><span><b>${u.name}</b><small>${u.cond} · @${u.seller}</small></span><span class="rowbtns"><button class="ph-mini" data-azb="used:${u.i}" ${bought.includes(u.i) || money < u.price ? 'disabled' : ''}>${bought.includes(u.i) ? 'Sold' : fmt(u.price)}</button></span></div>`).join('');
  const pend = (stats.orders || []).length;
  el.innerHTML = `${back}<h4>AzBay</h4><p class="ph-hint">Everything, delivered to your door. ${pend ? `<b>${pend} on the way.</b>` : ''}</p><label class="ph-hint"><input type="checkbox" id="azExp" ${renderAzBay.exp ? 'checked' : ''}> Express delivery (+$15, within the hour)</label><div class="rowbtns" style="margin:6px 0">${tabs}</div>${body}`;
  el.querySelector('#azExp').onchange = e => { renderAzBay.exp = e.target.checked; };
  el.querySelectorAll('[data-azt]').forEach(b => b.onclick = () => { renderAzBay.tab = b.dataset.azt; renderPhone(); });
  el.querySelectorAll('[data-azb]').forEach(b => b.onclick = () => {
    const [k, v] = b.dataset.azb.split(':'), ex = !!renderAzBay.exp && money >= 15;
    if (k === 'furn') { const f = FURN[v]; if (money < f.price) return; spend(f.price); azOrder({ k: 'furn', t: v, c: f.colors?.[0] }, f.name, ex); }
    else if (k === 'groc') { const g = AZ_GROC[+v]; if (money < g.price) return; spend(g.price); azOrder({ k: 'groc', n: g.n }, g.name, ex); }
    else if (k === 'gift') { const g = GIFTS.find(q => q.id === v); if (money < g.price) return; spend(g.price); azOrder({ k: 'gift', g: v }, g.name, ex); }
    else if (k === 'used') { const u = used[+v]; if (money < u.price) return; spend(u.price); ((stats.azUsed ||= {})[dayN] ||= []).push(u.i); azOrder({ k: 'furn', t: u.t, c: u.c }, u.name, ex); }
    renderPhone();
  });
}
// ================================================================ PHONE
let phoneApp = 'home', netLogin = null;
// after we email a sign-in code: a button straight into the right mail app (Gmail, Outlook, Yahoo, iCloud, Proton...), plus the phone's own Mail app
function mailApps(email) {
  const dom = (email.split('@')[1] || '').toLowerCase(), ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), android = /Android/.test(navigator.userAgent), mobile = ios || android;
  const and = pkg => `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${pkg};end`;
  const P = [
    [/^(gmail|googlemail)\./, 'Gmail', 'googlegmail://', 'com.google.android.gm', 'https://mail.google.com/'],
    [/^(outlook|hotmail|live|msn|windowslive)\./, 'Outlook', 'ms-outlook://', 'com.microsoft.office.outlook', 'https://outlook.live.com/mail/'],
    [/^(yahoo|ymail|rocketmail)\./, 'Yahoo Mail', 'ymail://', 'com.yahoo.mobile.client.android.mail', 'https://mail.yahoo.com/'],
    [/^(icloud|me|mac)\.com$/, 'iCloud Mail', 'message://', null, 'https://www.icloud.com/mail'],
    [/^(proton|protonmail|pm)\./, 'Proton Mail', 'protonmail://', 'ch.protonmail.android', 'https://mail.proton.me/'],
    [/^aol\./, 'AOL Mail', null, 'com.aol.mobile.aolapp', 'https://mail.aol.com/'],
    [/^(gmx|mail)\./, 'GMX Mail', null, 'de.gmx.mobile.android.mail', 'https://www.gmx.com/'],
    [/^zoho\./, 'Zoho Mail', 'zohomail://', 'com.zoho.mail', 'https://mail.zoho.com/'],
  ].find(q => q[0].test(dom));
  const out = [];
  if (P) { const [, label, iosUrl, pkg, web] = P; if (ios && iosUrl) out.push({ label: `Open ${label}`, href: iosUrl }); else if (android && pkg) out.push({ label: `Open ${label}`, href: and(pkg) }); else out.push({ label: `Open ${label}`, href: web, web: true }); }
  if (ios && !(P && P[2] === 'message://')) out.push({ label: 'Open Mail app', href: 'message://' });
  if (android) out.push({ label: 'Open email app', href: 'intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_EMAIL;end' });
  if (!mobile && !P) out.push({ label: 'Check your email', href: 'mailto:', web: true });
  return out;
}
// ---- the home screen: pages you swipe through, a dock, hold to wiggle, drag to rearrange, "−" to delete, App Store to get more
const APP_DESC = { maps: 'Map of the city, set a route', msgs: 'Texts and missions', contacts: 'People you know', me: 'Your stats and skills', places: 'Every place in town', work: 'Jobs and shifts', wallet: 'Money and stash', garage: 'Your cars', homes: 'Buy and rent places', style: 'Outfits', radio: 'Bay City radio stations', azbay: 'Shop online, delivered', log: 'Every choice you made', online: 'Play with other people', settings: 'Settings', store: 'Get more apps', weather: 'Today\'s weather, live', news: 'What\'s happening in Bay City' };
const CORE_APPS = ['maps', 'msgs', 'contacts', 'settings', 'store', 'me'];
let MAP_LIST = [];
function mapListHtml() { // every place, nearest first, filtered by the category toggles (which also hide them on the map)
  const f = inside ? inside.back : focusPos(), dist = p => Math.hypot(p.x - f.x, p.z - f.z);
  MAP_LIST = [...PLACES, ...PROPERTIES.map(p => ({ ...p, kind: 'property' }))].filter(p => catOn(placeCat(p.kind))).sort((a, b) => dist(a) - dist(b));
  const chips = MAP_CATS.map(([id, t, ic]) => `<button class="ph-cat ${catOn(id) ? 'on' : ''}" data-cat="${id}">${svg(ic, 'sm')}<span>${t}</span></button>`).join('');
  return `<div class="ph-sec">Places</div><div class="ph-cats">${chips}</div><div class="ph-list">${MAP_LIST.map((p, i) => { const d = dist(p); return `<button class="ph-row" data-pl="${i}"><span>${svg(p.icon, 'sm')} ${placeLabel(p)}${p.kind === 'property' ? ` <small>${owned.has(p.id) ? '· owned' : '· ' + fmt(p.price)}</small>` : ''}</span><small>${d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m'}</small></button>`; }).join('') || '<p class="ph-hint">Everything\'s switched off. Tap a category to show it.</p>'}</div>`;
}
function phoneUI() { const U = (stats.phoneUI ||= { dock: ['msgs', 'maps', 'contacts', 'settings'], apps: ['me', 'work', 'wallet', 'garage', 'homes', 'style', 'radio', 'azbay', 'log', 'online', 'store'] }); for (const id of CORE_APPS) if (!U.dock.includes(id) && !U.apps.includes(id)) U.apps.push(id); return U; }
let homePage = 0, jiggle = false, hs = null;
function renderHome(el) {
  const U = phoneUI(), byId = Object.fromEntries(APPS.map(a => [a[0], a])); el.classList.add('home');
  const H = el.clientHeight || 560, cell = 92, avail = H - 104 - 24 - 6, short = H < 440, rows0 = Math.max(1, Math.floor((avail - (short ? 0 : 128)) / cell)), /* short (landscape): no big clock, apps from the top */ rowsN = Math.max(1, Math.floor(avail / cell));
  const apps = U.apps.filter(id => byId[id]), pages = [apps.slice(0, rows0 * 4)]; for (let k = rows0 * 4; k < apps.length; k += rowsN * 4) pages.push(apps.slice(k, k + rowsN * 4));
  homePage = clamp(homePage, 0, pages.length - 1);
  const icon = id => { const [, name, ico, bg] = byId[id], badge = id === 'msgs' && (phoneBadge || customers.length) ? `<em>${phoneBadge || customers.length}</em>` : ''; return `<button class="ph-icon" data-app="${id}"><i style="background:${bg}">${svg(ico, 'app')}</i><span>${name}</span>${badge}${jiggle && !CORE_APPS.includes(id) ? '<b class="ph-del" data-del="' + id + '">−</b>' : ''}</button>`; };
  el.innerHTML = `<div class="ph-home2 ${jiggle ? 'jiggle' : ''} ${short ? 'short' : ''}">${jiggle ? '<button class="ph-done">Done</button>' : ''}<div class="ph-pages"><div class="ph-track" style="transform:translateX(${-homePage * 100}%)">${pages.map((pg, k) => `<div class="ph-page">${k === 0 ? `<div class="ph-clock">${$('phTime').textContent}</div><div class="ph-date">Bay City · Day ${dayN}</div>` : ''}<div class="ph-grid">${pg.map(icon).join('')}</div></div>`).join('')}</div></div>
    <div class="ph-dots">${pages.length > 1 ? pages.map((_, k) => `<i class="${k === homePage ? 'on' : ''}"></i>`).join('') : ''}</div><div class="ph-dock">${U.dock.filter(id => byId[id]).map(icon).join('')}</div></div>`;
  const root = el.querySelector('.ph-home2'), track = el.querySelector('.ph-track'), pagesEl = el.querySelector('.ph-pages');
  el.querySelector('.ph-done')?.addEventListener('click', () => { jiggle = false; saveGame(); renderPhone(); });
  let st = hs; // survives redraws while you drag
  const setSt = v => { st = hs = v; };
  root.onpointerdown = e => {
    const del = e.target.closest('[data-del]'); if (del) { const id = del.dataset.del; U.apps = U.apps.filter(a => a !== id); sfx.click(); saveGame(); renderPhone(); return; }
    const ic = e.target.closest('.ph-icon'); setSt({ x: e.clientX, y: e.clientY, t: performance.now(), ic, id: ic?.dataset.app, moved: false, swipe: false, drag: null });
    if (ic && !jiggle) st.lp = setTimeout(() => { if (st && !st.moved) { jiggle = true; navigator.vibrate?.(15); sfx.click(); setSt(null); renderPhone(); } }, 480);
    if (ic && jiggle) st.dragReady = true;
    try { el.setPointerCapture(e.pointerId); } catch (err) {} // keep getting moves even if your finger leaves the screen area
  };
  el.onpointermove = e => { st = hs; if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.moved && Math.hypot(dx, dy) > 9) { st.moved = true; clearTimeout(st.lp); if (jiggle && st.dragReady && st.ic) { const r = st.ic.getBoundingClientRect(), g = st.ic.cloneNode(true); g.classList.add('ph-ghost'); g.style.left = r.left + 'px'; g.style.top = r.top + 'px'; g.style.width = r.width + 'px'; document.body.appendChild(g); st.drag = { g, ox: e.clientX - r.left, oy: e.clientY - r.top }; st.ic.classList.add('ph-hole'); } else if (Math.abs(dx) > Math.abs(dy)) st.swipe = true; }
    if (st.drag) { const D = st.drag; D.g.style.left = e.clientX - D.ox + 'px'; D.g.style.top = e.clientY - D.oy + 'px';
      const pr = pagesEl.getBoundingClientRect(), edge = e.clientX < pr.left + 18 ? -1 : e.clientX > pr.right - 18 ? 1 : 0;
      if (edge) { D.edgeT ||= performance.now(); if (performance.now() - D.edgeT > 600) { D.edgeT = 0; const n = el.querySelectorAll('.ph-page').length; const np = homePage + edge; if (np >= 0 && np <= n) { homePage = Math.min(np, n - 1); if (np === n) { const id = st.id; U.apps = U.apps.filter(a => a !== id); U.apps.push(id); homePage = np; } rerender(); } } } else D.edgeT = 0;
      D.g.style.visibility = 'hidden'; const under = document.elementFromPoint(e.clientX, e.clientY)?.closest('.ph-icon'); D.g.style.visibility = '';
      if (under && under.dataset.app !== st.id) { const to = under.dataset.app, inDock = U.dock.includes(to), fromDock = U.dock.includes(st.id);
        if (!inDock && !fromDock) { const a = U.apps.filter(x => x !== st.id), k = a.indexOf(to); a.splice(k + (U.apps.indexOf(st.id) < U.apps.indexOf(to) ? 1 : 0), 0, st.id); U.apps = a; rerender(); }
        else if (inDock && fromDock) { const a = U.dock.filter(x => x !== st.id), k = a.indexOf(to); a.splice(k + (U.dock.indexOf(st.id) < U.dock.indexOf(to) ? 1 : 0), 0, st.id); U.dock = a; rerender(); }
        else if (inDock && !fromDock) { const k = U.dock.indexOf(to); U.dock[k] = st.id; U.apps[U.apps.indexOf(st.id)] = to; rerender(); } // swap into the dock
        else { const k = U.dock.indexOf(st.id); U.dock[k] = to; U.apps[U.apps.indexOf(to)] = st.id; rerender(); } }
      return; }
    if (st.swipe) track.style.transform = `translateX(calc(${-homePage * 100}% + ${dx}px))`; };
  const rerender = () => { renderHome(el); const s2 = hs; if (s2) { s2.ic = el.querySelector(`.ph-icon[data-app="${s2.id}"]`); s2.ic?.classList.add('ph-hole'); } };
  el.onpointerup = el.onpointercancel = e => { st = hs; if (!st) return; clearTimeout(st.lp); const s2 = st; setSt(null);
    if (s2.drag) { s2.drag.g.remove(); saveGame(); renderPhone(); return; }
    if (s2.swipe) { const dx = e.clientX - s2.x, n = el.querySelectorAll('.ph-page').length; if (Math.abs(dx) > 50) homePage = clamp(homePage + (dx < 0 ? 1 : -1), 0, n - 1); renderPhone(); return; }
    if (!s2.moved && s2.id && !jiggle && performance.now() - s2.t >= 450) { jiggle = true; navigator.vibrate?.(15); sfx.click(); renderPhone(); return; } // held: wiggle mode
    if (!s2.moved && s2.id && !jiggle && performance.now() - s2.t < 480) { sfx.click(); phoneGo(s2.id); }
    else if (!s2.moved && !s2.ic && jiggle) { jiggle = false; saveGame(); renderPhone(); } };
}
function renderStore(el, back) {
  const U = phoneUI(), inst = new Set([...U.apps, ...U.dock]);
  el.innerHTML = `${back}<h4>App Store</h4><p class="ph-hint">Get apps for your phone. Hold any app on your home screen to move or delete it.</p><div class="ph-list">${APPS.filter(a => a[0] !== 'store').map(([id, name, ico, bg]) => `<div class="ph-row store-row"><span class="st-app"><i style="background:${bg}">${svg(ico, 'app')}</i><span><b>${name}</b><small>${APP_DESC[id] || ''}</small></span></span>${inst.has(id) ? `<button class="ph-mini" data-open="${id}">Open</button>` : `<button class="ph-mini get" data-get="${id}">Get</button>`}</div>`).join('')}</div>`;
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => phoneGo(b.dataset.open));
  el.querySelectorAll('[data-get]').forEach(b => b.onclick = () => { if (b.disabled) return; b.disabled = true; b.classList.add('loading'); b.textContent = ''; sfx.click(); setTimeout(() => { U.apps.push(b.dataset.get); saveGame(); sfx.coin(); toast(`${APPS.find(a => a[0] === b.dataset.get)[1]} installed`, 1.6); renderStore(el, back); }, 1300); });
}
function renderWeather(el, back) {
  const W = wx(), k = W.k, h = Math.floor(clockH), temp = Math.round(16 + 6 * Math.sin((clockH - 9) / 24 * Math.PI * 2) - (k === 'rain' ? 3 : k === 'storm' ? 5 : k === 'fog' ? 2 : 0)), left = Math.max(0, W.until - gameHours());
  const name = { clear: night > 0.5 ? 'Clear night' : 'Sunny', rain: 'Rain', storm: 'Thunderstorms', fog: 'Fog' }[k], ico = { clear: night > 0.5 ? 'moon' : 'sun', rain: 'rain', storm: 'storm', fog: 'fog' }[k];
  const hours = Array.from({ length: 6 }, (_, i) => { const hh = (h + i + 1) % 24, same = i + 1 < left; const kk = same ? k : (i % 3 === 0 ? 'clear' : k === 'clear' ? 'clear' : 'clear'); return `<div class="wx-h"><small>${String(hh).padStart(2, '0')}:00</small>${svg(kk === 'clear' ? (hh >= 20 || hh < 6 ? 'moon' : 'sun') : kk, 'sm')}<b>${temp + Math.round(Math.sin(i) * 2)}°</b></div>`; }).join('');
  el.innerHTML = `${back}<div class="wx-now">${svg(ico, 'big')}<div class="wx-t">${temp}°</div><div><b>${name}</b><small>Bay City · ${left > 0.5 ? `${name.toLowerCase()} for about ${Math.round(left)} more hour${Math.round(left) === 1 ? '' : 's'}` : 'changing soon'}</small></div></div><div class="wx-hours">${hours}</div><p class="ph-hint">${k === 'rain' || k === 'storm' ? 'Roads are slippery: brake early. Fewer people out on the streets.' : k === 'fog' ? 'Low visibility in the hills this morning.' : 'Good day for the beach.'}</p>`;
}
function renderNews(el, back) {
  const items = []; const tip = hotTip(); if (tip) items.push(['deal', `${tip.g.name} ${tip.pr.hot === 'high' ? 'prices soar' : 'flood the market'} at ${tip.p.name.replace(/ Dealer$/, '')}`, tip.pr.hot === 'high' ? 'Sellers are cashing in.' : 'Buyers are stocking up.']);
  if (WANT.stars) items.push(['shield', `Police hunt suspect in ${suspectDesc()}`, `Officers say a ${WANT.stars}-badge alert is in force across the city.`]);
  const W = wx(); items.push([W.k === 'clear' ? 'sun' : W.k, W.k === 'clear' ? 'Clear skies over the bay' : `${W.k[0].toUpperCase() + W.k.slice(1)} sweeps across Bay City`, W.k === 'clear' ? 'Perfect beach weather, say forecasters.' : 'Drivers urged to take care on wet roads.']);
  items.push(['car', 'Skyways open to traffic', 'Bayview and Harbor Skyways now carry 60 mph traffic over downtown. Commuters love them.']);
  items.push(['map', 'Baywood Peak lookout a hit', 'Visitors pay a dollar for the coin telescope and stay for the view.']);
  const L = (stats.storyLog || []).slice(-2).reverse(); for (const e of L) items.push(['chat', `Local resident: "${String(e.c).replace(/"/g, '')}"`, `Overheard near ${zoneName(P.x, P.z)} on day ${e.d}.`]);
  const forSale = PROPERTIES.filter(q => !owned.has(q.id)); if (forSale.length) { const q = forSale[dayN % forSale.length]; items.push(['house', `Property of the day: ${q.name}`, `On the market for ${fmt(q.price)}.`]); }
  el.innerHTML = `${back}<h4>Bay News</h4><p class="ph-hint">Day ${dayN} · ${String(Math.floor(clockH)).padStart(2, '0')}:00</p><div class="ph-list">${items.map(([ic, h2, sub]) => `<div class="ph-row col news"><span>${svg(ic, 'sm')} <b>${h2}</b></span><small>${sub}</small></div>`).join('')}</div>`;
}
const APPS = [
  ['maps', 'Maps', 'map', 'linear-gradient(135deg,#4cd964,#2f80ed)'],
  ['msgs', 'Messages', 'chat', 'linear-gradient(135deg,#5ee07a,#2fbf55)'],
  ['contacts', 'Contacts', 'heart', 'linear-gradient(135deg,#ff6fb5,#c9306f)'],
  ['me', 'Me', 'user', 'linear-gradient(135deg,#38e8ff,#2f80ed)'],
  ['work', 'Work', 'case', 'linear-gradient(135deg,#ffd23f,#ff8a2a)'],
  ['wallet', 'Wallet', 'wallet', 'linear-gradient(135deg,#3a3a44,#111)'],
  ['garage', 'Garage', 'car', 'linear-gradient(135deg,#ff8a2a,#e05a10)'],
  ['homes', 'Homes', 'house', 'linear-gradient(135deg,#b26bff,#6b2fd0)'],
  ['style', 'Style', 'shirt', 'linear-gradient(135deg,#ffd23f,#e0a010)'],
  ['radio', 'Radio', 'radio', 'linear-gradient(135deg,#ff3b8a,#90205a)'],
  ['azbay', 'AzBay', 'bag', 'linear-gradient(135deg,#ff9f1a,#2f80ed)'],
  ['log', 'My Story', 'book', 'linear-gradient(135deg,#7b3fe4,#2a1a6a)'],
  ['online', 'Online', 'people', 'linear-gradient(135deg,#4cd964,#1fb5a8)'],
  ['store', 'App Store', 'bag', 'linear-gradient(135deg,#38b0ff,#1f6be0)'],
  ['weather', 'Weather', 'sun', 'linear-gradient(135deg,#5ab8ff,#2a6fd8)'],
  ['news', 'Bay News', 'book', 'linear-gradient(135deg,#ff5a4a,#b0201a)'],
  ['settings', 'Settings', 'gear', 'linear-gradient(135deg,#9aa0aa,#5d636e)'],
];
const mapView = { z: 3, cx: 0, cz: 0, init: false, off: null };
function openPhone(app = 'home') {
  mapView.init = false;
  if (stats.jail) { toast('Your phone was confiscated at intake. Use the pay phone in the visiting room.', 3); sfx.fail(); return; }
  if (ride && Math.abs(ride.s.v) > 3) { toast('Stop the car to use your phone'); return; }
  if (editMode) endEdit();
  sfx.click(); setState('phone'); const ph = $('phone'), ip = ph.querySelector('.iphone'); ph.classList.remove('hidden');
  phoneGo(app);
  // the little phone-map in the corner grows into the full phone
  const mw = $('mmWrap'); ip.style.transition = 'none'; ip.style.transform = 'none'; const a = ip.getBoundingClientRect(), r = mw.getBoundingClientRect();
  ip.style.setProperty('--fx', `${r.left + r.width / 2 - (a.left + a.width / 2)}px`); ip.style.setProperty('--fy', `${r.top + r.height / 2 - (a.top + a.height / 2)}px`); ip.style.setProperty('--fs', (r.width / a.width).toFixed(3));
  ip.style.transform = ''; void ip.offsetWidth; ip.style.transition = '';
  document.body.classList.add('phone-out');
  requestAnimationFrame(() => ph.classList.add('open'));
}
function closePhone() { { const ip = $('phone').querySelector('.iphone'), r = $('mmWrap').getBoundingClientRect(); ip.style.transform = 'none'; const a = ip.getBoundingClientRect(); ip.style.transform = ''; ip.style.setProperty('--fx', `${r.left + r.width / 2 - (a.left + a.width / 2)}px`); ip.style.setProperty('--fy', `${r.top + r.height / 2 - (a.top + a.height / 2)}px`); ip.style.setProperty('--fs', (r.width / a.width).toFixed(3)); } $('phone').classList.remove('open'); setTimeout(() => { $('phone').classList.add('hidden'); document.body.classList.remove('phone-out'); if (state === 'phone') setState('play'); }, 380); }
let phoneThread = null;
function phoneGo(app) { phoneApp = app; if (app === 'msgs') phoneBadge = 0; renderPhone(); }
// ================================================================ MAIN STORY: pinned mission texts that stay in your inbox until you've done them
const rayWho = () => ({ key: 'ray', name: 'Uncle Ray', cfg: (rayWho.c ||= { ...npcCfg('dealer', 4242), hat: 'cap', hatColor: '#3a3d45', facialHair: 'beard', hairColor: '#6b6b6b' }), pitch: 160 });
const STORY = [
  { id: 'home', title: 'A place to crash', text: 'Welcome to Bay City, kid. I sorted you a little studio downtown. Go check it out, get your head down.', goal: () => 'Go to your studio downtown.', wp: () => { const h = PROPERTIES.find(p => p.starter); return { x: h.x, z: h.z, name: 'Your studio' }; }, done: S => S.f.home },
  { id: 'cash', title: 'Pay your way', text: 'Rent\'s free for now, but nothing\'s free forever. Get yourself a grand together. Work, the taco truck... or other ways. Your call.', goal: () => `Have $1,000 on you (${fmt(Math.min(money, 1000))} / $1,000).`, done: () => money >= 1000 },
  { id: 'bag', title: 'Ray\'s bag', text: 'Need a favour. My guy Tommo has a bag for me on the pier. Grab it, bring it to me at The Anchor. Don\'t open it.', reward: 500,
    goal: S => { if (!S.f.bag) return 'Pick up the bag from Tommo on the pier.'; const a = PLACES.find(p => p.id === 'v_anchor'), h = placeHours(a); return `Bring the bag to Ray at The Anchor bar${h ? ` (open ${hh12(h[0])} to ${hh12(h[1])}${isOpen(a) ? '' : ', or he\'ll meet you outside'})` : ''}.`; },
    wp: S => { if (S.f.bag) { const a = PLACES.find(p => p.id === 'v_anchor'); return { x: a.x, z: a.z, name: 'Ray at The Anchor' }; } const sp = tommoSpot(); return { x: sp.x, z: sp.z, name: 'Tommo on the pier' }; },
    tick(S, dt) {
      const sp = tommoSpot(), tx = sp.x, tz = sp.z;
      if (!S.f.bag && !inside) { const d = Math.hypot(P.x - tx, P.z - tz); if (d < 90 && !storyNpc.tommo) storyNpc.tommo = eventPed({ top: 'jacket', topColor: '#55602f', hat: 'beanie', hatColor: '#16161b', fem: false }, tx, tz, { state: 'talk', lookX: tx, lookZ: tz + 5, name: 'Tommo', ev: true });
        if (storyNpc.tommo && d < 2.4 && !ride) { S.f.bag = true; const w = pedWho(storyNpc.tommo); if (w) { w.name = 'Tommo'; subs.say(w, 'You Ray\'s nephew? Here. Don\'t open it. Don\'t lose it.', { expr: 'neutral', now: true }); } setTimeout(() => youSay(pick(['Heavy. What\'s in this thing?', 'Don\'t open it. Got it.']), 'shock'), 3800); const T = storyNpc.tommo; storyNpc.tommo = null; setTimeout(() => cleanupEvPed(T), 6000); storyWaypoint(); saveGame(); } }
      if (S.f.bag && !S.f.gave && !inside) { const a = PLACES.find(p => p.id === 'v_anchor'); if (!isOpen(a) && Math.hypot(P.x - a.x, P.z - a.z) < 6) { S.f.gave = true; const rp = eventPed(rayWho().cfg, a.x + 1.5, a.z + 1.2, { state: 'talk', lookX: P.x, lookZ: P.z, name: 'Uncle Ray' }); subs.say(rayWho(), 'Bar\'s shut, kid, but I\'m here. Hand it over. Good lad.', { expr: 'happy', now: true }); setTimeout(() => { rp.state = 'march'; rp.mspd = 1.4; rp.tx = rp.x + 20; rp.tz = rp.z; setTimeout(() => cleanupEvPed(rp), 12000); }, 4500); } } // closed? he waits outside
      if (S.f.bag && inside?.place?.id === 'v_anchor' && !S.f.gave) { S.f.gave = true; setTimeout(() => { subs.say(rayWho(), 'Good lad. Didn\'t open it? Good. Here, for your trouble.', { expr: 'happy', now: true }); }, 900); }
    }, done: S => S.f.gave },
  { id: 'soon', title: 'Big things', text: 'You did good, kid. I\'ve got bigger plans for you. Keep your phone on. (More story coming soon.)', goal: () => 'Ray will be in touch.', done: () => false, last: true },
];
// every way a life can start has its own opening: its own person in your phone, its own first goals
const who = (key, name, role, seed, extra = {}, pitch = 170) => () => ({ key, name, cfg: (who.c ||= {})[key] ||= { ...npcCfg(role, seed), ...extra }, pitch });
const lawyerWho = who('lawyer', 'Mr. Hartley (Dad\'s lawyer)', 'office', 5151, { top: 'suit', topColor: '#1c1c22' }, 130);
const tonyWho = who('tony', 'Big Tony', 'dealer', 6161, { muscle: 0.8, topColor: '#16161b' }, 120);
const slimWho = who('slim', 'Slim', 'dealer', 7171, { hat: 'cap', hatColor: '#e23b3b' }, 190);
const patelWho = who('patel', 'Ms. Patel (your manager)', 'office', 8181, { fem: true }, 230);
const juneWho = who('june', 'Grandma June', 'guest', 9191, { fem: true, hairColor: '#d8d8d8' }, 250);
const STORY_CHAINS = {
  rich: [
    { id: 'rich_home', who: lawyerWho, title: 'Downsized', text: 'Your father\'s terms are final. The Eastport Bungalow is yours, and so is the $25,000. He asks that you do not call. Do go and look at the place.', goal: () => 'Go to the Eastport Bungalow.', wp: () => { const h = PROPERTIES.find(p => p.id === 'p_bung'); return { x: h.x, z: h.z, name: 'Eastport Bungalow' }; }, done: S => S.f.home },
    { id: 'rich_job', who: lawyerWho, title: 'A real job', text: 'A further note from your father: if you hold down an honest job for a week, he may reconsider your allowance. I would not count on it, but I would try. The Work app lists openings.', goal: () => career() ? `Work some shifts (${Math.min(career().shifts || 0, 5)} / 5).` : 'Get a job. Open the Work app on your phone.', done: () => (career()?.shifts || 0) >= 5, reward: 5000 },
    { id: 'rich_prove', who: lawyerWho, title: 'Prove him wrong', text: 'Your father received my report. He laughed. His words: "Call me when you\'ve made it back yourself." Fifty thousand would make a point.', goal: () => `Have $50,000 (${fmt(Math.min(money, 50000))} / $50,000).`, done: () => money >= 50000, reward: 10000 },
    { id: 'soon', who: lawyerWho, title: 'The family name', text: 'Your father has asked after you. First time in months. He says he has "a proposition". I will be in touch.', goal: () => 'Your father will be in touch.', done: () => false, last: true },
  ],
  excon: [
    { id: 'ex_roof', who: tonyWho, title: 'Out', text: 'Heard you got out. Forty bucks and a bus ticket, right? Same as me back then. First thing: get a roof over your head. Can\'t do nothing sleeping on a bench.', goal: () => 'Rent or buy a place to live. Check the Homes app.', done: () => owned.size > 0 },
    { id: 'ex_stake', who: tonyWho, title: 'Back on your feet', text: 'You owe me nothing. Yet. Get yourself a stake together, any way you like. I don\'t ask questions. Three grand, then we talk business.', goal: () => `Have $3,000 (${fmt(Math.min(money, 3000))} / $3,000).`, done: () => money >= 3000, reward: 1000 },
    { id: 'ex_wheels', who: tonyWho, title: 'Wheels', text: 'A man without a car in this town is a man waiting for a bus with cops on it. Get yourself something with four wheels. Bought, borrowed... I said I don\'t ask.', goal: () => 'Get a car of your own (buy one, or take one).', done: () => (garage?.cars?.length || 0) > 1 || (ride && !ride.b.two && ride !== myCar), reward: 1500 },
    { id: 'soon', who: tonyWho, title: 'Business', text: 'Alright. You\'re standing. Keep your phone on, I got work coming that pays better than anything legal.', goal: () => 'Big Tony will be in touch.', done: () => false, last: true },
  ],
  hustler: [
    { id: 'hu_reup', who: slimWho, title: 'Re-up', text: 'Yo, you still got that little stash? Customers been asking. Run it down, then come see me or any dealer and re-up. Buy low, sell high. You know the game.', goal: () => 'Buy product from any dealer (Places app shows them).', done: () => Object.keys(stats.dealBuys || {}).length > 0 },
    { id: 'hu_burner', who: slimWho, title: 'Burner', text: 'Real hustlers don\'t wait on corners. Get a burner from a dealer and let the customers text YOU.', goal: () => 'Get a burner phone from a dealer.', done: () => !!stats.burner, reward: 500 },
    { id: 'hu_bank', who: slimWho, title: 'Stack it', text: 'Ten bands. Get ten bands and I\'ll put you on with my supplier. Different prices, different league.', goal: () => `Have $10,000 (${fmt(Math.min(money, 10000))} / $10,000).`, done: () => money >= 10000, reward: 2500 },
    { id: 'soon', who: slimWho, title: 'The plug', text: 'You\'re legit now. My plug wants to meet you. Not yet. When he\'s ready. Keep that burner charged.', goal: () => 'Slim will be in touch.', done: () => false, last: true },
  ],
  grad: [
    { id: 'gr_first', who: patelWho, title: 'First day', text: 'Welcome to Bay Corp! Your desk is ready on floor 12. Shifts are in the Work app. Please don\'t be late on your first day, I\'m told it says a lot.', goal: () => `Work your first shift (${Math.min(career()?.shifts || 0, 1)} / 1).`, done: () => (career()?.shifts || 0) >= 1 },
    { id: 'gr_promo', who: patelWho, title: 'Climb the ladder', text: 'Good start. Keep your performance up and you\'ll be up for promotion. Smart people go further here, so the college has evening classes too.', goal: () => `Get promoted (${careerTitle() || 'no job'} now).`, done: () => (career()?.lvl || 0) >= 1, reward: 1500 },
    { id: 'gr_place', who: patelWho, title: 'Grown-up life', text: 'Congratulations on the promotion! Half the office lives in Northfield. You should look at your own place. Your landlord situation sounds... tragic.', goal: () => 'Buy a home of your own (Homes app).', done: () => [...owned].some(id => id !== 'p_studio'), reward: 3000 },
    { id: 'soon', who: patelWho, title: 'Big meeting', text: 'Between us: the board has noticed you. Something\'s coming. Keep your phone on.', goal: () => 'Ms. Patel will be in touch.', done: () => false, last: true },
  ],
  parent: [
    { id: 'pa_home', who: juneWho, title: 'Just the two of you', text: 'Your little one called me, bless them. Said you were late home again. Go home and give them a hug, love. Then let\'s get you sorted.', goal: () => 'Go home to the Eastport Bungalow.', wp: () => { const h = PROPERTIES.find(p => p.id === 'p_bung'); return { x: h.x, z: h.z, name: 'Home' }; }, done: S => S.f.home },
    { id: 'pa_fridge', who: juneWho, title: 'Full fridge', text: 'And what\'s in that fridge? Nothing, I bet. QuickMart, or order on AzBay. A child can\'t live on ketchup.', goal: () => 'Get groceries (QuickMart or AzBay).', done: () => (stats.groceries || 0) > 0, reward: 300 },
    { id: 'pa_job', who: juneWho, title: 'Steady money', text: 'Now, a steady job. Nothing fancy. Something that pays the bills while they\'re at school. I\'ll mind them on Sundays.', goal: () => career() ? `Work some shifts (${Math.min(career().shifts || 0, 3)} / 3).` : 'Get a job (Work app).', done: () => (career()?.shifts || 0) >= 3, reward: 2000 },
    { id: 'soon', who: juneWho, title: 'Family', text: 'You\'re doing better than you think, love. I\'m proud of you. Ring me if you need anything.', goal: () => 'Grandma June will be in touch.', done: () => false, last: true },
  ],
};
const storyNpc = {};
function tommoSpot() { // somewhere dry on the pier boards near the shooting gallery
  if (tommoSpot.s) return tommoSpot.s; const g = PLACES.find(p => p.id === 'g_gallery');
  for (let r = 4; r < 30; r += 1.5) for (let a = 0; a < 6.28; a += 0.4) { const x = g.x + Math.sin(a) * r, z = g.z + Math.cos(a) * r; if (onPier(x, z) && onPier(x + 1, z) && onPier(x - 1, z) && !inWater(x, z) && !solidPoint(x, z, 1)) return (tommoSpot.s = { x, z }); }
  return (tommoSpot.s = { x: g.x, z: g.z - 4 });
}
function story() { return (stats.main ||= { i: 0, f: {}, seen: -1 }); }
function storyChain() { const S = story(); if (!storyGate) return STORY_CHAINS[stats.story] || STORY; S.chain ??= stats.story && STORY_CHAINS[stats.story] && S.i === 0 ? stats.story : 'ray'; return STORY_CHAINS[S.chain] || STORY; }
function storyStep() { return storyChain()[story().i] || null; }
const stepWho = st => st?.who ? st.who() : rayWho();
function storyWaypoint() { const S = story(), st = storyStep(); if (st?.wp && !st.last) { const w = st.wp(S); setWaypoint(w.x, w.z, w.name); } }
let storyT = 2;
let storyGate = false; // a brand new life waits until its story is chosen
function updateStory(dt) {
  if (!storyGate) return;
  const S = story(), st = storyStep(); if (!st) return;
  if (S.seen !== S.i && state === 'play' && !talk.active) { S.seen = S.i; const w = stepWho(st); textMe(w.key, w.name, st.text); if (!st.last) subs.say(w, st.text.split(/(?<=[.!?])\s/)[0], { expr: 'neutral', radio: false, tag: 'phone' }); }
  if (st.id === 'bag' && !S.f.bag && waypoint?.label === 'Tommo on the pier') { const sp = tommoSpot(); if (Math.hypot(waypoint.x - sp.x, waypoint.z - sp.z) > 2) setWaypoint(sp.x, sp.z, 'Tommo on the pier'); } // old saves pointed into the sea
  st.tick?.(S, dt);
  storyT -= dt; if (storyT > 0) return; storyT = 1;
  if (!st.last && st.done(S)) { if (st.reward) addMoney(st.reward); toast(`Mission complete: ${st.title}${st.reward ? ` · +${fmt(st.reward)}` : ''}`, 3.2); sfx.cash(); S.i++; S.f = { home: S.f.home }; if (waypoint?.name && st.wp) clearWaypoint(); saveGame(); }
}
function storyMessage() {
  const S = story(), st = storyStep(); if (!st) return null;
  return { from: stepWho(st).name, av: 'flag', main: true, title: st.title, text: st.text, goal: st.goal(S), at: st.wp && !st.last ? st.wp(S) : null, key: 'main:' + st.id };
}
function messages() {
  const intro = storyStep() ? null : { rich: { from: "Dad's Lawyer", av: 'case', text: "Your father has instructed me to inform you that this is the last of it: $25,000 and the deeds to the Eastport Bungalow. He suggests you 'get a job'. Bay City College is a fine place to start." },
    excon: { from: 'Big Carlos', av: 'lock', text: "You're out. Don't come back in here. Slim downtown remembers you, go see him. And watch yourself, the cops know your face. Cheap food at the taco truck. Now go make some money." },
    hustler: { from: 'Slim', av: 'deal', text: "Ayy, you got the pack? Sell it to the customers who text you or flip it to another dealer. Prices change every day, so ask around. Don't get caught, the cops are watching the deals now." },
    grad: { from: 'Bay Corp HR', av: 'case', text: "Welcome to Bay Corp! You start as Office Assistant. Clock in at the Tower reception between 7am and 7pm. Strong performance leads to promotion. We're proud to have you." },
    parent: { from: 'Eastport Elementary', av: 'people', text: "Reminder: school pick-up is at 3pm. Your little one has been talking about you all week. Spend time together, it keeps their spirits up. Groceries are at the QuickMart." } }[stats.story];
  const out = intro ? [intro] : [];
  { const sm = storyMessage(); if (sm) out.push(sm); }
  if (lifeAct?.kind === 'meet') out.push({ from: 'Buyer', av: 'deal', meet: true, text: `Behind the car wash. ${lifeAct.qty} ${lifeAct.g.name}, ${fmt(lifeAct.pay)}. Come alone.`, at: { x: lifeAct.sp.x, z: lifeAct.sp.z, name: 'Deal: behind the car wash' }, key: 'meet:' + Math.round(lifeAct.until) });
  if (!intro && !storyStep()) out.push({ from: 'Uncle Ray', av: 'user', text: "Welcome to Bay City, kid. I got you a little studio downtown (the purple key on your map). Eat, sleep, keep your energy up. Dealers buy low and sell high, and they'll treat you better once they know you. Customers will text you here too. Make money, buy property, live large. Need honest work? The Work app lists taxi and courier jobs." });
  for (const c of customers) { const g = GOODS.find(x => x.id === c.good); out.push({ from: c.name, av: 'deal', cust: c.id, text: `Need ${c.qty} ${g.name} near ${c.area}. Paying ${fmt(c.pay)}. Don't keep me waiting (${Math.max(0, Math.ceil(c.exp - gameHours()))}h).`, at: { x: c.x, z: c.z, name: `${c.name}'s order` } }); }
  for (const p of PLACES) if (p.kind === 'dealer' && rel(p.id) >= 20) { const pr = dealerPricesFor(p); for (const g of GOODS) if (pr[g.id].hot) out.push({ from: p.npc, av: 'deal', text: pr[g.id].hot === 'cheap' ? `Got ${g.name} going cheap today. ${fmt(pr[g.id].buy)} each. Come thru.` : `Paying top dollar for ${g.name} today: ${fmt(pr[g.id].sell)}. Bring what you got.`, at: p }); }
  const inc = PROPERTIES.filter(p => owned.has(p.id) && propMode(p.id) === 'rent').reduce((a, p) => a + p.income, 0);
  if (inc) out.push({ from: 'Bay Realty', av: 'house', text: `Your properties earn ${fmt(inc)} every morning at 6am.` });
  if (stats.groceries <= 0) out.push({ from: 'Fridge', av: 'fridge', text: 'Your fridge is empty. QuickMart sells groceries.', key: 'fridge:' + dayN });
  // every message has a key; swiped-away ones stay gone
  const del = stats.delMsgs ||= {};
  return out.map(m => ({ ...m, key: m.key || (m.cust ? 'cust:' + m.cust : m.from + ':' + m.text.slice(0, 40)) })).filter(m => m.main || !del[m.key]);
}
// swipe a row left past the line to delete it (a red Delete shows underneath as you drag)
function swipeDelete(root, sel, onDel) {
  root.querySelectorAll(sel).forEach(w => {
    const el = w.lastElementChild; let x0 = null, y0 = 0, dx = 0, lock = false;
    el.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; dx = 0; lock = false; el.style.transition = 'none'; });
    el.addEventListener('pointermove', e => { if (x0 === null) return; const ddx = e.clientX - x0; if (!lock && Math.abs(e.clientY - y0) > 12 && Math.abs(ddx) < 12) { x0 = null; return; } if (Math.abs(ddx) > 8) lock = true; dx = Math.min(0, ddx); el.style.transform = `translateX(${dx}px)`; });
    const up = () => { if (x0 === null) return; x0 = null; el.style.transition = 'transform .2s, opacity .2s'; if (dx < -90) { el.style.transform = 'translateX(-110%)'; el.style.opacity = '0'; sfx.click(); setTimeout(() => onDel(w), 200); } else el.style.transform = ''; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    el.addEventListener('click', e => { if (lock) { e.stopPropagation(); e.preventDefault(); } }, true);
  });
}
const bar = (v, col = '#7dff9a') => `<span class="pbar"><i style="width:${clamp(v, 0, 100)}%;background:${col}"></i></span>`;
function renderPhone() {
  $('phApp').classList.remove('home'); if (phoneApp !== 'home') { const a = $('phApp'); a.onpointermove = a.onpointerup = a.onpointercancel = null; if (hs?.drag) hs.drag.g.remove(); hs = null; }
  const el = $('phApp'), back = `<button class="ph-back" data-go="home">‹ Home</button>`;
  const hh = Math.floor(clockH), mm2 = Math.floor((clockH - hh) * 60);
  $('phTime').textContent = `${String(hh).padStart(2, '0')}:${String(mm2).padStart(2, '0')}`;
  if (phoneApp === 'home') { renderHome(el);
  } else if (phoneApp === 'log') {
    const L = [...(stats.storyLog || [])].reverse();
    el.innerHTML = `${back}<h4>My Story</h4><p class="ph-hint">Every choice you made, and what came of it.</p><div class="ph-list">${L.length ? L.map(e => `<div class="ph-msg"><div class="av">${svg(e.tag === 'favour' ? 'star' : 'chat')}</div><div><b>${e.who}</b> <small style="opacity:.6">Day ${e.d}, ${String(e.h).padStart(2, '0')}:00</small><p><i>"${e.c}"</i></p>${e.r ? `<p class="goal">${e.r}</p>` : ''}</div></div>`).join('') : '<p class="ph-hint">Nothing yet. Life happens out there.</p>'}</div>`;
  } else if (phoneApp === 'maps') {
    el.innerHTML = `${back}<h4>Maps</h4><div class="ph-mapwrap"><canvas id="phMap"></canvas><div class="ph-mapbtns"><button id="mzIn">+</button><button id="mzOut">−</button><button id="mzMe">${svg('pin', 'sm')}</button></div></div><p class="ph-hint">${waypoint ? 'Waypoint set. Tap it again to clear. Follow the purple route.' : 'Drag to move, pinch to zoom, tap to set a waypoint.'}</p>${waypoint ? '<button class="ph-btn" id="phClear">Clear waypoint</button>' : ''}${mapListHtml()}`;
    const cv = $('phMap'), r0 = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio, 2), W2 = Math.round(r0.width * dpr), H2 = Math.round(r0.height * dpr); cv.width = W2; cv.height = H2;  // never zoom out past the map's own shape (it used to squash)
    const off = mapView.off ||= document.createElement('canvas'); ensureMap(); off.pad = 160; off.width = 1536 + 320; off.height = Math.round(1536 * MAP.canvas.height / MAP.canvas.width) + 320;
    const info = drawMapTo(off), ctx2 = cv.getContext('2d'), ZMIN = Math.min(1, off.width * H2 / (W2 * off.height)); // all the way out = the whole map, never squashed
    if (!mapView.init) { const f = inside ? inside.back : focusPos(); mapView.cx = info.tx(f.x); mapView.cz = info.tz(f.z); mapView.z = 3; mapView.init = true; }
    const view = () => { mapView.z = Math.max(ZMIN, mapView.z); const vw = off.width / mapView.z, vh = vw * H2 / W2; mapView.cx = vw >= off.width ? off.width / 2 : clamp(mapView.cx, vw / 2, off.width - vw / 2); mapView.cz = vh >= off.height ? off.height / 2 : clamp(mapView.cz, vh / 2, off.height - vh / 2); return { vw, vh, sx: mapView.cx - vw / 2, sz: mapView.cz - vh / 2 }; };
    const draw = () => { const v = view(), k2 = W2 / v.vw; ctx2.fillStyle = '#3d8fd0'; ctx2.fillRect(0, 0, W2, H2); ctx2.drawImage(off, -v.sx * k2, -v.sz * k2, off.width * k2, off.height * k2); };
    draw();
    const pts = new Map(); let moved = 0, pinch = null, last = null;
    const toOff = (cx, cy) => { const r = cv.getBoundingClientRect(), v = view(); return [v.sx + (cx - r.left) / r.width * v.vw, v.sz + (cy - r.top) / r.height * v.vh]; };
    cv.onpointerdown = e => { try { cv.setPointerCapture(e.pointerId); } catch (_) {} pts.set(e.pointerId, [e.clientX, e.clientY]); moved = pts.size > 1 ? 99 : 0; last = [e.clientX, e.clientY]; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: mapView.z }; } };
    cv.onpointermove = e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]);
      const r = cv.getBoundingClientRect(), v = view();
      if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; mapView.z = clamp(pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / Math.max(10, pinch.d), ZMIN, 8); draw(); return; }
      const dx = e.clientX - last[0], dy = e.clientY - last[1]; last = [e.clientX, e.clientY]; moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 8) { mapView.cx -= dx / r.width * v.vw; mapView.cz -= dy / r.height * v.vh; draw(); }
    };
    cv.onpointerup = cv.onpointercancel = e => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
      if (moved > 8 || pts.size) return;
      const [px, pz] = toOff(e.clientX, e.clientY), k = info.k;
      if (waypoint && Math.hypot(info.tx(waypoint.x) - px, info.tz(waypoint.z) - pz) < 10 * k) clearWaypoint();
      else {
        let wx = info.fromX(px), wz = info.fromZ(pz), label = null;
        for (const m of markers) if (Math.hypot(info.tx(m.x) - px, info.tz(m.z) - pz) < 8 * k) { wx = m.x; wz = m.z; label = m.place.name; }
        setWaypoint(wx, wz, label);
        if (!inside) { const f = focusPos(); route = findRoute(f.x, f.z, wx, wz); routeT = 1.5; routeFrom = [f.x, f.z]; }
      }
      renderPhone();
    };
    cv.onwheel = e => { e.preventDefault(); mapView.z = clamp(mapView.z * (1 - e.deltaY * 0.0015), ZMIN, 8); draw(); };
    $('mzIn').onclick = () => { mapView.z = clamp(mapView.z * 1.5, ZMIN, 8); draw(); };
    $('mzOut').onclick = () => { mapView.z = clamp(mapView.z / 1.5, ZMIN, 8); draw(); };
    $('mzMe').onclick = () => { const f = inside ? inside.back : focusPos(); mapView.cx = info.tx(f.x); mapView.cz = info.tz(f.z); draw(); };
    $('phClear') && ($('phClear').onclick = () => { clearWaypoint(); renderPhone(); });
    el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { const id = b.dataset.cat; stats.mapOff[id] = !stats.mapOff[id]; const st = el.scrollTop; renderPhone(); el.scrollTop = st; });
    el.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { const p = MAP_LIST[+b.dataset.pl]; setWaypoint(p.x, p.z, placeLabel(p)); if (!inside) { const f = focusPos(); route = findRoute(f.x, f.z, p.x, p.z); routeT = 1.5; routeFrom = [f.x, f.z]; } mapView.cx = info.tx(p.x); mapView.cz = info.tz(p.z); mapView.z = Math.max(mapView.z, 3); toast(placeLabel(p), 1.6); renderPhone(); $('phApp').scrollTop = 0; });
  } else if (phoneApp === 'thread') {
    const id = phoneThread, name = nameOf(id), T = stats.texts[id] || [];
    const f = fam(), isKid = id.startsWith('kid:'), isP = f.partner?.id === id;
    // conversation engine (texts.js): options come from what they last said and who they are to you; replies lead somewhere
    const C = textCtx(id), lastT = T[T.length - 1], waiting = lastT?.me && gameHours() - (lastT.h || 0) < 0.25;
    const topic = lastT && !lastT.me ? (lastT.k !== undefined ? lastT.k : classify(lastT.t)) : null;
    const opts = waiting ? [] : textOptions(C, topic);
    el.innerHTML = `<button class="ph-back" data-go="msgs">‹ Messages</button><h4>${name}</h4>${!isKid && !isP && id.startsWith('date:') ? `<button class="ph-mini ph-block" id="thrBlock">${svg('x', 'sm')} Block number</button>` : ''}<div class="ph-thread" id="phThr">${T.map(m => `<div class="bub ${m.me ? 'me' : ''}">${m.t}</div>`).join('') || '<p class="ph-hint">No messages yet. Say hi.</p>'}${waiting ? '<div class="bub typing">…</div>' : ''}</div><div class="ph-replies">${opts.map((o, i) => `<button class="ph-mini" data-rep="${i}">${o.t}</button>`).join('')}</div>`;
    const thr = $('phThr'); thr.scrollTop = 1e6;
    if ($('thrBlock')) $('thrBlock').onclick = () => { stats.dates ||= {}; (stats.dates[id] ||= { name }).noNum = true; stats.hideThr ||= {}; stats.hideThr[id] = 1e9; saveGame(); toast(`Blocked ${name}. She can't call or text you any more.`, 2.6); phoneGo('msgs'); };
    el.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => {
      const o = opts[+b.dataset.rep]; textMe(id, 'You', o.t, true); renderPhone();
      setTimeout(() => {
        const Rr = textReply(textCtx(id), o.k);
        bumpRel(id, Rr.d, Rr.d > 0); textAct(id, Rr.act); textMe(id, name, Rr.say, false, Rr.next);
        if (phoneApp === 'thread' && phoneThread === id) renderPhone();
      }, rand(1600, 3200));
    });
  } else if (phoneApp === 'msgs') {
    const ms = messages();
    const chatIds = [...new Set([...(fam().partner ? [fam().partner.id] : []), ...Object.keys(stats.texts || {}), ...Object.keys(stats.dates || {}).filter(id => !stats.dates[id].noNum), ...fam().kids.filter(k => ['Teen', 'Adult'].includes(kidStage(k))).map(k => k.id)])];
    const hid = stats.hideThr ||= {};
    const mainTxt = ms.find(m => m.main)?.text, dupe = id => { const T = stats.texts?.[id] || []; return mainTxt && T.length && T[T.length - 1].t === mainTxt && !T.some(x => x.me); }; /* the story card in the inbox already shows this text: one welcome, not two */
    const chats = chatIds.filter(id => !dupe(id) && !(hid[id] != null && (stats.texts?.[id]?.length || 0) <= hid[id])).map(id => { const T = stats.texts?.[id] || [], last = T[T.length - 1]; return `<div class="swr" data-swthr="${id}"><div class="swr-del">Delete</div><button class="ph-row" data-thr="${id}"><span>${svg(id.startsWith('kid:') ? 'smile' : 'heart', 'sm')} <b>${nameOf(id)}</b> <small style="white-space:normal">${last ? (last.me ? 'You: ' : '') + last.t : 'Tap to text'}</small></span></button></div>`; }).join('');
    el.innerHTML = `${back}<h4>Messages</h4>${chats ? `<div class="ph-sec">Chats</div>${chats}<div class="ph-sec">Inbox</div>` : ''}${stats.burner ? `<button class="ph-row" id="msCust"><span>${svg('phone', 'sm')} Burner phone</span><b>${CUST_MODES[custMode()]}</b></button>` : ''}${ms.length ? '<p class="ph-hint">Swipe a message left to delete it.</p>' : '<p class="ph-hint">No messages.</p>'}<div class="ph-list">${ms.map((m, i) => m.main ? `<div class="ph-msg main"><div class="av">${svg(m.av)}</div><div><span class="mainpill">MAIN · ${m.title}</span><b>${m.from}</b><p>${m.text}</p><p class="goal">${svg('flag', 'sm')} ${m.goal}</p>${m.at ? `<button class="ph-mini" data-wp="${i}">${svg('pin', 'sm')} Set waypoint</button>` : ''}</div></div>` : `<div class="swr" data-swmsg="${i}"><div class="swr-del">Delete</div><div class="ph-msg"><div class="av">${svg(m.av)}</div><div><b>${m.from}</b><p>${m.text}</p>${m.at ? `<button class="ph-mini" data-wp="${i}">${svg('pin', 'sm')} Set waypoint</button>` : ''}</div></div></div>`).join('')}</div>`;
    swipeDelete(el, '[data-swmsg]', w => { const m = ms[+w.dataset.swmsg]; stats.delMsgs[m.key] = dayN; if (m.cust) { const c = customers.find(q => q.id === m.cust); if (c) { removeCustomer(c); toast(`You texted ${c.name}: "Not interested."`, 2.2); } } if (m.meet && lifeAct?.kind === 'meet') { if (lifeAct.p) endLifePed({ p: lifeAct.p }); lifeAct = null; clearWaypoint(); toast('You texted the buyer: "Not interested."', 2.2); } saveGame(); renderPhone(); });
    swipeDelete(el, '[data-swthr]', w => { const id = w.dataset.swthr; stats.hideThr[id] = stats.texts?.[id]?.length || 0; saveGame(); renderPhone(); });
    if ($('msCust')) $('msCust').onclick = () => { cycleCustMode(); renderPhone(); };
    el.querySelectorAll('[data-thr]').forEach(b => b.onclick = () => { phoneThread = b.dataset.thr; phoneGo('thread'); });
    el.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => { const m = ms[+b.dataset.wp]; setWaypoint(m.at.x, m.at.z, m.at.name); toast(m.at.name); closePhone(); });
  } else if (phoneApp === 'contacts') {
    const people = Object.entries(stats.rel).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    el.innerHTML = `${back}<h4>Contacts</h4><p class="ph-hint">Relationships grow when you trade, chat and spend time with people. Friends give better prices, tips and texts.</p>${people.length ? people.map(([id, v]) => { const p = PLACES.find(q => q.id === id); const dt8 = stats.dates?.[id]; return `<div class="ph-row col"><span><b>${dt8?.name || relNames[id] || p?.npcName || (id === 'street' ? 'Street rep' : nameFor(id))}</b> <small>${p ? p.name : id === 'street' ? 'Your customers' : (dt8 ? 'Dating' : id.split(':')[0].replace(/^[a-z]_/, ''))}</small></span>${bar(v, '#ff6fb5')}<small>${relName(v)} · ${Math.round(v)}</small>${p ? `<button class="ph-mini" data-wp="${id}">${svg('pin', 'sm')} Find</button>` : ''}${dt8 && !dt8.noNum && !date ? `<button class="ph-mini" data-call="${id}">${svg('heart', 'sm')} Ask her out</button>` : ''}</div>`; }).join('') : '<p class="ph-hint">No contacts yet. Go talk to people!</p>'}${townHtml()}`;
    el.querySelectorAll('[data-wp]').forEach(b => b.onclick = () => { const p = PLACES.find(q => q.id === b.dataset.wp); setWaypoint(p.x, p.z, p.name); closePhone(); });
    el.querySelectorAll('[data-call]').forEach(b => b.onclick = () => { const id = b.dataset.call, d = stats.dates[id], r = rel(id); closePhone(); if (r < 30 && Math.random() < 0.5) { toast(`${d.name}: "Sorry, busy tonight!"`, 3); bumpRel(id, 2); return; } toast(`${d.name}: "Omw! Where are you?"`, 3); setTimeout(() => { if (date || inside) return; const look = { ...bakeCfg(d.cfg), fem: true }, a = rand(0, 6.28); startDate({ name: d.name, look, x: P.x + Math.sin(a) * 20, z: P.z + Math.cos(a) * 20, face: 0, interest: 40 + r * 0.6, root: new THREE.Group() }); }, 4000); });
  } else if (phoneApp === 'me') {
    const sk = s => { const L = lvl(s), xp = stats.xp[s] || 0, need = xpFor(L); return `<div class="ph-row col"><span><b>${skillName(s)}</b> <small>Level ${L}${L >= MAX_LVL ? ' · MAX' : ''}</small></span>${bar(L >= MAX_LVL ? 100 : xp / need * 100, '#38e8ff')}</div>`; };
    const F = fam(), P2 = F.partner;
    const famHtml = `<div class="ph-sec">Family</div>${P2 ? `<div class="ph-row col"><span><b>${svg('heart', 'sm')} ${P2.name}</b><small>${{ partner: 'Girlfriend', engaged: 'Fiancée', married: 'Wife' }[P2.status] || ''}</small></span>${bar(rel(P2.id), '#ff6fb5')}</div>` : '<p class="ph-hint">Single. Go flirt with someone.</p>'}${F.preg ? `<div class="ph-row"><span>${svg('star', 'sm')} Baby on the way</span><small>${Math.max(0, F.preg.due - dayN)} days</small></div>` : ''}${F.kids.map(k => `<div class="ph-row col"><span><b>${svg('smile', 'sm')} ${k.name}</b><small>${k.girl ? 'Daughter' : 'Son'} · ${kidStage(k)} · ${kidAge(k)} days old</small></span>${bar(rel(k.id), '#ffd23f')}</div>`).join('')}${famHome() ? `<p class="ph-hint">Family home: ${famHome().name}</p>` : ''}`;
    el.innerHTML = `${back}<h4>Me</h4>${famHtml}
      <div class="ph-sec">Needs</div>
      <div class="ph-row col"><span><b>Hunger</b> <small>${Math.round(stats.hunger)}%</small></span>${bar(stats.hunger, '#ff8a2a')}</div>
      <div class="ph-row col"><span><b>Bladder</b> <small>${Math.round(stats.bladder ?? 85)}%${(stats.bladder ?? 85) < 25 ? ' · find a toilet!' : ''}</small></span>${bar(stats.bladder ?? 85, '#e8d34a')}</div>
      <div class="ph-row col"><span><b>Hygiene</b> <small>${Math.round(stats.hygiene ?? 80)}%${(stats.hygiene ?? 80) < 25 ? ' · you smell' : ''}</small></span>${bar(stats.hygiene ?? 80, '#38c8ff')}</div>
      <div class="ph-row col"><span><b>Energy</b> <small>${Math.round(stats.energy)}%</small></span>${bar(stats.energy, '#ffd23f')}</div>
      <div class="ph-row col"><span><b>Mood</b> <small>${Math.round(stats.mood)}%</small></span>${bar(stats.mood, '#ff6fb5')}</div>
      <div class="ph-row col"><span><b>Health</b> <small>${Math.round(P.hp)}/${maxHP()}</small></span>${bar(P.hp / maxHP() * 100, '#4cd964')}</div>
      <div class="ph-sec">Skills</div>${SKILLS.map(s => sk(s.id)).join('')}
      <div class="ph-sec">Weapon skills</div>${GUN_SKILL_SLOTS.map(g => sk('gun_' + g)).join('')}
      <p class="ph-hint">Gym, running and fights build your body. Reading, chatting and haggling build Charm. Trading builds Dealing. Range practice builds weapon skills.</p>
      ${job ? `<button class="ph-btn" id="phQuit">${svg('x', 'sm')} Quit current job</button>` : ''}`;
    $('phQuit') && ($('phQuit').onclick = () => { endJob('Shift ended.'); closePhone(); });
  } else if (phoneApp === 'places') { phoneApp = 'maps'; return renderPhone(); // (Places lives under the map now)
  } else if (phoneApp === 'places_old') {
    const groups = [['Dealers', 'deal', PLACES.filter(p => p.kind === 'dealer')], ['Shops', 'bag', PLACES.filter(p => ['guns', 'clothes', 'barber'].includes(p.kind))], ['Food, fun & services', 'food', PLACES.filter(p => p.kind === 'venue')], ['Activities & jobs', 'play', PLACES.filter(p => ['game', 'race', 'chop', 'job'].includes(p.kind))], ['Real estate', 'house', PROPERTIES]];
    const f = inside ? inside.back : focusPos(), all = [];
    el.innerHTML = `${back}<h4>Places</h4><div class="ph-list">${groups.map(([t, ic, list]) => `<div class="ph-sec">${svg(ic, 'sm')} ${t}</div>` + list.map(p => { all.push(p); const d = Math.hypot(p.x - f.x, p.z - f.z); return `<button class="ph-row" data-i="${all.length - 1}"><span>${svg(p.icon, 'sm')} ${placeLabel(p)}${p.price !== undefined && p.home ? ` <small>${owned.has(p.id) ? '· owned' : '· ' + fmt(p.price)}</small>` : ''}</span><small>${d > 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm'}</small></button>`; }).join('')).join('')}</div>`;
    el.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const p = all[+b.dataset.i]; setWaypoint(p.x, p.z, placeLabel(p)); toast(placeLabel(p)); closePhone(); });
  } else if (phoneApp === 'work') {
    const f = inside ? inside.back : focusPos(), dist = p => `${Math.round(Math.hypot(p.x - f.x, p.z - f.z))} m`;
    const W = [
      ['v_college', 'Bay City College', 'Study for a diploma or degree: business, mechanics, cooking, nursing, medicine, computer science, law, real estate or the police academy. Each one unlocks a career.', 'Unlocks careers'],
      ['w_office', 'Bay Corp Tower', 'Office, software, law and real estate careers. Needs the right qualification.', '$150-1,200 a shift'],
      ['j_taxi', 'Taxi driver', 'Bay Cabs gives you a cab. Pick up fares, drive them fast. Pays per fare plus a speed tip. Trains Driving.', '$60-200 a fare'],
      ['j_bins', 'Binman', 'Drive the Bay Waste lorry round town emptying wheelie bins. Paid per bin plus a bonus for bringing it back.', '$35 a bin + $150'],
      ['j_courier', 'Courier', 'Speedy Couriers hands you parcels to deliver before the clock runs out. Trains Stamina.', '$80-260 a drop'],
      ['g_taco', 'Taco truck shift', 'Build orders on the beach taco truck.', 'Tips per order'],
      ['d_dt', 'Dealing', 'Buy low from dealers, sell high to other dealers or to customers who text you. Friends give better prices.', 'Big money, risky'],
      ['chop', 'Car theft', "Jack or break into cars, drive them to Lucky's Chop Shop.", '$350-2,600 a car'],
      ['race', 'Street racing', 'Bring any car to the race start for a checkpoint race.', '$450 a win'],
      ['v_casino', 'Casino', 'Blackjack and slots at Lucky 7.', 'Luck'],
    ].map(([id, t, d, pay]) => ({ p: PLACES.find(q => q.id === id), t, d, pay })).filter(w => w.p);
    const C0 = career(), E0 = edu(), carHtml = `<div class="ph-sec">${svg('case', 'sm')} Career</div><div class="ph-row col"><span class="stack"><b>${C0 ? `${careerTitle()} · ${CAREERS[C0.id].name}` : 'No career yet'}</b><small>${C0 ? `${fmt(CAREERS[C0.id].ladder[C0.lvl][1])} a shift · performance ${Math.round(C0.perf)}% · ${C0.shifts} shifts${C0.lastDay === dayN ? ' · worked today' : ''}` : 'Retail jobs need nothing. Most careers need a qualification from Bay City College.'}</small></span></div><div class="ph-row col"><span class="stack"><b>Education</b><small>${E0.enrolled ? `Studying ${COURSES[E0.enrolled].name}: ${E0.progress[E0.enrolled] || 0}/${COURSES[E0.enrolled].classes} classes${E0.attended === dayN ? ' · class done today' : ''}` : 'Not enrolled.'}${E0.done.length ? ` · Graduated: ${E0.done.map(d => COURSES[d].name).join(', ')}` : ''}</small></span></div>`;
    el.innerHTML = `${back}<h4>Work</h4>${carHtml}${job ? `<div class="ph-row col on"><span><b>On shift: ${job.type === 'taxi' ? 'Taxi' : 'Courier'}</b><small>${job.fares} done · ${fmt(job.earned)}</small></span><span class="rowbtns"><button class="ph-mini" id="phQuitJob">End shift</button></span></div>` : ''}<p class="ph-hint">Ways to make money in Bay City. Tap one to set GPS.</p>${W.map((w, i) => `<button class="ph-row col" data-w="${i}"><span><b>${svg(w.p.icon, 'sm')} ${w.t}</b><small>${dist(w.p)}</small></span><small style="white-space:normal;opacity:.8">${w.d}</small><small style="color:#7dff9a">${w.pay}</small></button>`).join('')}`;
    el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const w = W[+b.dataset.w]; setWaypoint(w.p.x, w.p.z, w.p.name); toast(`GPS set: ${w.p.name}`); closePhone(); });
    if ($('phQuitJob')) $('phQuitJob').onclick = () => { endJob('Shift ended.'); renderPhone(); };
  } else if (phoneApp === 'wallet') {
    const inc = PROPERTIES.filter(p => owned.has(p.id) && propMode(p.id) === 'rent').reduce((a, p) => a + p.income, 0);
    const items = GOODS.filter(g => stash[g.id]).map(g => `<div class="ph-row"><span style="color:${g.col}">${svg(g.icon, 'sm')} <b style="color:#fff">${g.name}</b></span><span class="rowbtns" style="margin:0;flex:none"><b>×${stash[g.id]}</b><button class="ph-mini" data-use-g="${g.id}">Use</button></span></div>`).join('') || '<p class="ph-hint">Stash is empty.</p>';
    el.innerHTML = `${back}<h4>Wallet</h4><div class="ph-cash">${fmt(money)}</div><p class="ph-hint">Daily income ${fmt(inc)} · Stash ${stashCount()}/${stashCap()} · Groceries ${stats.groceries} meals</p><div class="ph-sec">Stash</div>${items}${Object.keys(FX.trips).length || FX.drunk > 0.2 ? `<p class="ph-hint">Feeling: ${[FX.drunk > 0.2 ? (FX.drunk > 1.2 ? 'drunk' : 'tipsy') : '', ...Object.keys(FX.trips).map(k => TRIP[k].name)].filter(Boolean).join(', ')}</p>` : ''}`;
    el.querySelectorAll('[data-use-g]').forEach(b => b.onclick = () => { closePhone(); useGood(b.dataset.useG); });
  } else if (phoneApp === 'garage') {
    el.innerHTML = `${back}<h4>Garage</h4><p class="ph-hint">Buy more cars at Bay Motors downtown. Upgrade them at Bay Customs.</p>${garage.cars.map((c, i) => `<div class="ph-row col"><span><b>${c.name || BODIES[c.body].label}</b> <small>${BODIES[c.body].label}${i === garage.active ? ' · driving' : ''}</small></span><span class="rowbtns">${i !== garage.active ? `<button class="ph-mini" data-use="${i}">Use</button>` : ''}<button class="ph-mini" data-mod="${i}">Upgrade</button></span></div>`).join('')}
      <button class="ph-btn" id="phBring">${svg('pin', 'sm')} Bring my car here</button><button class="ph-btn" id="phFind">${svg('map', 'sm')} Mark my car on the map</button>`;
    el.querySelectorAll('[data-use]').forEach(b => b.onclick = () => { if (ride === myCar) exitCar(); garage.active = +b.dataset.use; store.set('bc_cars', garage); rebuildMyCar(); if (!inside) bringCar(); renderPhone(); });
    el.querySelectorAll('[data-mod]').forEach(b => b.onclick = () => { const m = PLACES.find(p => p.id === 'mods'); if (+b.dataset.mod !== garage.active) { garage.active = +b.dataset.mod; store.set('bc_cars', garage); rebuildMyCar(); if (!inside) bringCar(); } setWaypoint(m.x, m.z, 'Bay Customs'); toast('Drive this car to Bay Customs to upgrade it. GPS is set.', 3.5); closePhone(); });
    $('phBring').onclick = () => { if (inside) { toast('Step outside first'); return; } if (ride) exitCar(); bringCar(); closePhone(); };
    $('phFind').onclick = () => { setWaypoint(myCar.s.x, myCar.s.z, 'My car'); closePhone(); };
  } else if (phoneApp === 'homes') {
    const f = fam(), hasFam = !!(f.partner?.livesIn || f.kids.length);
    el.innerHTML = `${back}<h4>Homes</h4><p class="ph-hint">Live in a home, rent it out for daily income, or sell it. Your family lives in your family home. Storage: ${storage.length} item${storage.length === 1 ? '' : 's'}.</p>${PROPERTIES.filter(p => owned.has(p.id)).map(p => { const m = propMode(p.id), isFam = f.home === p.id, sell = p.price ? Math.round(p.price * 0.75) : 2000; return `<div class="ph-row col ${isFam ? 'on' : ''}"><span><b>${svg('house', 'sm')} ${p.name}</b><small>${isFam ? 'Family home' : m === 'rent' ? `Rented · +${fmt(p.income)}/day` : 'Vacant'}</small></span><small>${INTERIORS[p.home].name} · ${(homes[p.id] || []).length} items</small><span class="rowbtns">${!isFam ? `<button class="ph-mini" data-fam="${p.id}">Make family home</button>` : ''}${!isFam && p.income ? `<button class="ph-mini" data-rent="${p.id}">${m === 'rent' ? 'Stop renting' : 'Rent out'}</button>` : ''}<button class="ph-mini" data-go2="${p.id}">GPS</button>${!(isFam && hasFam) ? `<button class="ph-mini" data-sell="${p.id}">Sell ${fmt(sell)}</button>` : ''}</span></div>`; }).join('')}<h4>Businesses</h4>${Object.keys(BIZ).map(k => { const B = BIZ[k], b = bizOf(k), pl = PLACES.find(q => q.biz === k); return `<div class="ph-row col ${b ? 'on' : ''}"><span><b>${svg(pl.icon, 'sm')} ${B.name}</b><small>${b ? `~${fmt(bizIncome(k))}/day · safe ${fmt(Math.round(b.till || 0))}` : `For sale · ${fmt(B.price)}`}</small></span><span class="rowbtns"><button class="ph-mini" data-go3="${pl.id}">GPS</button></span></div>`; }).join('')}`;
    el.querySelectorAll('[data-go3]').forEach(b => b.onclick = () => { const p = PLACES.find(q => q.id === b.dataset.go3); setWaypoint(p.x, p.z, p.name); closePhone(); });
    el.querySelectorAll('[data-go2]').forEach(b => b.onclick = () => { const p = PROPERTIES.find(q => q.id === b.dataset.go2); setWaypoint(p.x, p.z, p.name); closePhone(); });
    el.querySelectorAll('[data-fam]').forEach(b => b.onclick = () => { const id = b.dataset.fam; if (inside?.prop?.id === id || inside?.prop?.id === f.home) { toast('Step outside first'); return; } f.home = id; stats.propMode[id] = 'live'; if (hasFam) toast(`Your family moved into ${PROPERTIES.find(q => q.id === id).name}.`, 3); saveGame(); renderPhone(); });
    el.querySelectorAll('[data-rent]').forEach(b => b.onclick = () => { const id = b.dataset.rent; if (inside?.prop?.id === id) { toast('Step outside first'); return; } stats.propMode[id] = propMode(id) === 'rent' ? 'vacant' : 'rent'; saveGame(); renderPhone(); });
    el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { const id = b.dataset.sell, p = PROPERTIES.find(q => q.id === id); if (inside?.prop?.id === id) { toast('Step outside first'); return; } if ([...owned].length <= 1) { toast("You can't sell your only home."); return; } const sell = p.price ? Math.round(p.price * 0.75) : 2000; owned.delete(id); if (f.home === id) f.home = null; delete stats.propMode[id]; addMoney(sell); refreshPropertyMarkers(); saveGame(); toast(`Sold ${p.name} for ${fmt(sell)}.`, 3); renderPhone(); });
  } else if (phoneApp === 'style') {
    el.innerHTML = `${back}<h4>Style</h4><p class="ph-hint">Body and face are free to change. Hair is done at barbers, clothes at clothing stores.</p><button class="ph-btn" id="phBody">${svg('user', 'sm')} Edit body & face</button>`;
    $('phBody').onclick = () => { $('phone').classList.remove('open'); $('phone').classList.add('hidden'); openCustom('char'); };
  } else if (phoneApp === 'radio') {
    el.innerHTML = `${back}<h4>Radio</h4><p class="ph-hint">Plays while you drive, or at home on a stereo. In the car, tap the radio button for the radio wheel. Every station has 10 songs.</p>${nowPlaying() ? `<p class="ph-hint"><b>Now playing:</b> ${nowPlaying().title} · ${nowPlaying().artist}</p>` : ''}${STATIONS.map((s, i) => `<button class="ph-row ${radioIndex() === i ? 'on' : ''}" data-st="${i}"><span>${s.name}</span>${radioIndex() === i ? '<b>●</b>' : ''}</button>`).join('')}`;
    el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { radioSet(+b.dataset.st); radioOn(!!ride || homeMusic); renderPhone(); });
  } else if (phoneApp === 'online') {
    const nm = myNetName(), st = NET.status, on = st === 'online' || st === 'connecting', local = NET.local();
    let acct = '';
    if (!local) acct = signedIn() ? `<div class="ph-row"><span>${svg('user', 'sm')} Signed in as <b>${NET.email}</b></span><button class="ph-mini" data-out>Sign out</button></div>`
      : netLogin?.sent ? `<div class="ph-sec">Check your email</div><p class="ph-hint">We sent a 6-digit code to <b>${netLogin.email}</b>. Type it here, or tap the link in the email on this phone.${netLogin.dev ? ` <br><small>(test server: code ${netLogin.dev.code})</small>` : ''}</p>
          <div class="ph-row"><input id="netCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" style="flex:1;min-width:0;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;font-size:20px;letter-spacing:6px;font-weight:900"><button class="ph-mini" data-code>Sign in</button></div>
          <div class="ph-mailapps">${mailApps(netLogin.email).map((m, i) => `<a class="ph-btn ${i ? 'alt' : ''}" href="${m.href}" ${m.web ? 'target="_blank" rel="noopener"' : ''}>${svg('mail', 'sm')} ${m.label}</a>`).join('')}</div>
          <button class="ph-mini" data-redo style="margin-top:8px">Use a different email</button>`
      : `<p class="ph-hint">Sign in with your email to play online. We'll send you a code and a link. No passwords.</p><div class="ph-row"><input id="netEmail" type="email" placeholder="you@email.com" autocomplete="email" value="${(netLogin?.email || '').replace(/"/g, '')}" style="flex:1;min-width:0;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff"><button class="ph-mini" data-link>Send code</button></div>`;
    el.innerHTML = `${back}<h4>Online</h4><p class="ph-hint">Play in the same Bay City as everyone else. You'll see each other walking and driving around.</p>
      <div class="ph-row"><span>${svg('user', 'sm')} Your name</span><input id="netName" value="${nm.replace(/"/g, '')}" maxlength="16" style="width:120px;padding:6px 8px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;text-align:right"></div>
      ${acct}
      <div class="ph-row"><span><i class="dot" style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${st === 'online' ? '#4cd964' : st === 'connecting' ? '#ffb020' : '#666'}"></i> ${st === 'online' ? `Online · ${NET.count} other${NET.count === 1 ? '' : 's'} here` : st === 'connecting' ? 'Connecting...' : 'Offline'}${local ? ' (local test)' : ''}</span><button class="ph-mini" data-net ${!local && (!NET.configured() || !signedIn()) ? 'disabled' : ''}>${on ? 'Go offline' : 'Go online'}</button></div>
      ${NET.error ? `<p class="ph-hint" style="color:#ff6a74">${NET.error}</p>` : ''}
      ${NET.count ? `<div class="ph-sec">Players in town</div>` + NET.list.map(q => `<div class="ph-row"><span>${svg('user', 'sm')} <b>${q.name}</b></span><span>${q.d != null ? Math.round(q.d) + ' m' : ''}</span></div>`).join('') : ''}`;
    el.querySelector('#netName').onchange = e => { try { localStorage.setItem('bc_name', e.target.value.trim().slice(0, 16) || 'Player'); } catch (err) {} };
    el.querySelector('[data-net]')?.addEventListener('click', () => { if (on) goOffline(); else goOnline(); renderPhone(); });
    el.querySelector('[data-out]')?.addEventListener('click', async () => { await signOut(); renderPhone(); });
    el.querySelector('[data-link]')?.addEventListener('click', async e => { const em = el.querySelector('#netEmail').value.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(em)) { toast('Type your email first'); return; } e.target.disabled = true; e.target.textContent = 'Sending...'; const r = await sendMagicLink(em); if (r.ok) netLogin = { email: em, sent: true, dev: r.dev }; else { netLogin = { email: em }; toast(r.error, 4); } renderPhone(); });
    el.querySelector('[data-redo]')?.addEventListener('click', () => { netLogin = { email: netLogin.email }; renderPhone(); });
    const codeIn = el.querySelector('#netCode'), tryCode = async () => { const c = codeIn.value.replace(/\D/g, ''); if (c.length !== 6) { toast('The code is 6 numbers'); return; } const r = await verifyCode(netLogin.email, c); if (r.ok) { netLogin = null; toast(`Signed in as ${NET.email}`, 2.4); goOnline(); } else toast(r.error, 3); renderPhone(); };
    if (codeIn) { codeIn.oninput = () => { if (codeIn.value.replace(/\D/g, '').length === 6) tryCode(); }; el.querySelector('[data-code]').onclick = tryCode; }
  } else if (phoneApp === 'store') { renderStore(el, back);
  } else if (phoneApp === 'weather') { renderWeather(el, back);
  } else if (phoneApp === 'news') { renderNews(el, back);
  } else if (phoneApp === 'azbay') { renderAzBay(el, back);
  } else if (phoneApp === 'lab') { renderLab(el, back);
  } else if (phoneApp === 'settings') {
    el.innerHTML = `${back}<h4>Settings</h4>
      <button class="ph-row" id="stSound"><span>Sound</span><b>${settings.sound ? 'On' : 'Off'}</b></button>
      ${stats.burner ? `<button class="ph-row" id="stCust"><span>Burner phone</span><b>${CUST_MODES[custMode()]}</b></button>` : ''}
      <button class="ph-row" id="stStick"><span>Stick side</span><b>${settings.stickSide === 'right' ? 'Right' : 'Left'}</b></button>
      <button class="ph-row" id="stSteer"><span>Car steering</span><b>${(settings.steer || 'screen') === 'screen' ? 'Point where you go' : 'Classic (left/right)'}</b></button>
      <button class="ph-row" id="stShadow"><span>Shadows (off = smoother)</span><b>${settings.shadows ? 'On' : 'Off'}</b></button>
      ${isTouch() && !isStandalone() ? `<div class="ph-sec">App</div>${!isIOS() ? `<button class="ph-row" id="stFull"><span>Full screen</span><b>${document.fullscreenElement ? 'On' : 'Off'}</b></button>` : ''}<button class="ph-row" id="stInstall"><span>${isIOS() ? 'Add to Home Screen' : 'Download the app'}</span><b>${svg('download')}</b></button>` : ''}
      <div class="ph-sec">Account</div><button class="ph-row" id="stAcct"><span>${signedIn() ? (NET.email || 'Signed in').replace(/</g, '') : 'Not signed in'}</span><b>${signedIn() ? 'Your lives' : 'Sign in to save online'}</b></button>
      <div class="ph-sec">Danger zone</div><button class="ph-row danger" id="stReset"><span>Reset all progress</span></button>
      <p class="ph-hint">Bay City v${BUILD}</p>`;
    $('stSound').onclick = () => { settings.sound = !settings.sound; applySettings(); renderPhone(); };
    if ($('stCust')) $('stCust').onclick = () => { cycleCustMode(); renderPhone(); };
    $('stStick').onclick = () => { settings.stickSide = settings.stickSide === 'right' ? 'left' : 'right'; applySettings(); renderPhone(); };
    $('stSteer').onclick = () => { settings.steer = (settings.steer || 'screen') === 'screen' ? 'car' : 'screen'; applySettings(); renderPhone(); };
    if ($('stFull')) $('stFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else goFullscreen(); setTimeout(renderPhone, 300); };
    if ($('stLab')) $('stLab').onclick = () => { saveGame(); cloudTick(0, true); sessionStorage.setItem('bc_sandbox', '1'); setTimeout(() => location.reload(), 400); };
    if ($('stInstall')) $('stInstall').onclick = () => { closePhone(); installHelp(); };
    $('stAcct').onclick = () => { saveGame(); closePhone(); if (signedIn()) { cloudTick(0, true); setTimeout(() => titleSignedIn(true), 600); return; } showTitle(); };
    $('stShadow').onclick = () => { settings.shadows = !settings.shadows; applySettings(); renderPhone(); };
    let armed = false; $('stReset').onclick = () => { if (!armed) { armed = true; $('stReset').querySelector('span').textContent = 'Tap again to wipe everything'; return; } for (const k of ['bc_save', 'bc_arsenal', 'rr_char', 'rr_gun', 'bc_car', 'bc_cars']) localStorage.removeItem(k); location.reload(); };
  }
  el.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { sfx.click(); phoneGo(b.dataset.go); });
}
$('phoneBtn').addEventListener('pointerdown', e => { e.stopPropagation(); openPhone(); });
$('phHome').onclick = () => closePhone();
$('phone').addEventListener('pointerdown', e => { if (e.target.id === 'phone') closePhone(); });
mm.addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play') openPhone(); }); // the map is your phone: tap it

// ================================================================ save / load
function saveGame() {
  stats.dateNow = date ? { name: date.name, cfg: date.cfg, interest: date.interest, since: date.since, holding: !!date.holding } : null; // a date survives an app update / reload
  save = { hp: P.hp, x: inside ? inside.back.x : P.x, z: inside ? inside.back.z + 1.2 : P.z, face: P.face, inCar: ride === myCar, cx: myCar?.s.x, cz: myCar?.s.z, ch: myCar?.s.h, h: clockH, day: dayN, money, stash, owned: [...owned], waypoint, stats, homes, storage, customers: customers.map(({ npc, marker, ...c }) => c) };
  store.set('bc_save', save); store.set('bc_arsenal', arsenal); store.set('bc_cars', garage); store.set('bc_savedAt', Date.now());
}
// auto-update: bookmarks and home-screen apps can hold on to an old copy. Check version.json (never cached) and reload once if newer.
const BUILD = 198;
function updatingCover() { const d = document.createElement('div'); d.id = 'updCover'; d.innerHTML = '<div class="bt-logo">BAY<span>CITY</span></div><p><i></i>Updating Bay City...</p>'; document.body.appendChild(d); requestAnimationFrame(() => d.classList.add('on')); }
function checkUpdate() {
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).then(j => {
    if (!(j.v > BUILD)) return;
    if (talk.active || dance || carAnim || woo || P.shower || state === 'phone' || state === 'modal') { setTimeout(checkUpdate, 20000); return; } // don't yank you out mid-conversation; try again shortly
    let tried = 0; try { tried = +sessionStorage.getItem('bc_upd') || 0; } catch (_) {}
    if (tried >= j.v) { toast(`Update ${j.v} is out. Close and reopen the app to get it.`, 4); return; }
    try { sessionStorage.setItem('bc_upd', j.v); } catch (_) {}
    saveGame(); if (state !== 'title') sessionStorage.setItem('bc_autoplay', '1'); /* mid-game update: come straight back in */ sessionStorage.setItem('bc_updating', '1'); updatingCover(); setTimeout(() => location.replace(location.pathname + '?u=' + j.v), 900);
  }).catch(() => {});
}
setTimeout(checkUpdate, 3000); setInterval(checkUpdate, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
// ---------------- starting stories: every new life can begin somewhere different
const STORIES = [
  { id: 'ray', title: 'Fresh Start', icon: 'house', blurb: 'Uncle Ray set you up with a little studio downtown and $500. Make something of yourself.' },
  { id: 'rich', title: 'Trust Fund Kid', icon: 'cash', blurb: 'Your dad just cut you off. $25,000 and the Eastport Bungalow is all you get. You have never worked a day.' },
  { id: 'excon', title: 'Fresh Out', icon: 'lock', blurb: 'Released from Bay County Correctional with $40 and a bad reputation. The street remembers you. So do the cops.' },
  { id: 'hustler', title: 'Corner Hustler', icon: 'deal', blurb: 'You know every dealer in town. A small stash, $1,200 and a studio over a laundromat.' },
  { id: 'grad', title: 'College Grad', icon: 'book', blurb: 'Fresh Business Diploma, a junior office job at Bay Corp Tower and $300 left after rent.' },
  { id: 'parent', title: 'Single Parent', icon: 'people', blurb: 'Just you and your 6-year-old in the Eastport Bungalow. $2,000 in the bank. Every dollar counts.' },
];
function applyStory(id) {
  stats.story = id; fam(); storyGate = true;
  const at = (x, z) => { Object.assign(P, { x, z }); P.y = baseY(x, z); Object.assign(myCar.s, { x: x + 5, z: z + 3 }); placeVehicle(myCar); updateCamera(0, true); };
  if (id === 'rich') { money = 25000; owned.add('p_bung'); fam().home = 'p_bung'; stats.mood = 80; const p = PROPERTIES.find(q => q.id === 'p_bung'); at(p.x, p.z + 4); }
  if (id === 'excon') { money = 40; owned.delete('p_studio'); stats.jailRecord = dayN; for (const p of PLACES) if (p.kind === 'dealer') stats.rel[p.id] = 22; stats.rel['pr:tony'] = 40; addXP(stats, 'strength', 400); const p = PLACES.find(q => q.id === 'v_police'); at(p.x + 3, p.z + 4); }
  if (id === 'hustler') { money = 1200; for (const p of PLACES) if (p.kind === 'dealer') stats.rel[p.id] = 32; addXP(stats, 'dealing', 500); stash.haze = (stash.haze || 0) + 8; stash.pills = (stash.pills || 0) + 4; }
  if (id === 'grad') { money = 300; edu().done.push('business'); stats.career = { id: 'office', lvl: 0, perf: 55, shifts: 0, lastDay: 0 }; addXP(stats, 'smarts', 450); }
  if (id === 'parent') { money = 2000; owned.add('p_bung'); fam().home = 'p_bung'; fam().kids.push({ id: 'kid:' + Date.now(), name: pick(Math.random() < 0.5 ? GIRL_NAMES : BOY_NAMES), girl: Math.random() < 0.5, born: dayN - 6, seed: Math.floor(Math.random() * 1e6), skin: charCfg.skin, hairColor: charCfg.hairColor }); const k = fam().kids[0]; k.girl = GIRL_NAMES.includes(k.name); stats.rel[k.id] = 70; const p = PROPERTIES.find(q => q.id === 'p_bung'); at(p.x, p.z + 4); }
  refreshPropertyMarkers(); saveGame();
  const S2 = STORIES.find(s => s.id === id); phoneBadge = 1; toast(S2.title, 3); setTimeout(() => notify('New life', 'Your story has started. Open your phone.', 5), 1200);
}
function storyPicker() {
  modal(`<h3>Choose your story</h3><p>How does this life begin?</p><div class="story-list"><button class="story" data-story="random">${svg('star', 'sm')}<span><b>Random life</b><small>Let fate decide.</small></span></button>${STORIES.map(st => `<button class="story" data-story="${st.id}">${svg(st.icon, 'sm')}<span><b>${st.title}</b><small>${st.blurb}</small></span></button>`).join('')}</div>`, []);
  document.querySelectorAll('[data-story]').forEach(b => b.onclick = () => { closeModal(); applyStory(b.dataset.story === 'random' ? pick(STORIES).id : b.dataset.story); });
}
// ================================================================ EVENT LAB (admin): test every life event in a throwaway copy of your life
// Test mode backs up your real life first; nothing you do in it is uploaded, and ending it puts everything back exactly as it was.
const labOn = () => { try { return !!localStorage.getItem('lab_backup'); } catch (e) { return false; } };
const labTicks = () => { try { return JSON.parse(localStorage.getItem('lab_ticks') || '{}'); } catch (e) { return {}; } };
const labSetTick = (id, on) => { const T = labTicks(); if (on) T[id] = Date.now(); else delete T[id]; try { localStorage.setItem('lab_ticks', JSON.stringify(T)); } catch (e) {} };
let labFilter = 'all';
function labStart() {
  saveGame(); try { localStorage.setItem('lab_backup', JSON.stringify(saveBundle())); } catch (e) { toast('Not enough space to back up your life', 3); return; }
  money += 25000; const f = fam();
  if (!f.partner) { stats.dates ||= {}; stats.dates['lab:p'] = { name: 'Sam', cfg: { ...npcCfg('guest', 3131), fem: true }, met: dayN }; stats.rel['lab:p'] = 70; makeOfficial('lab:p'); f.partner.livesIn = true; }
  if (!f.kids.length) { const k = { id: 'kid:lab', name: 'Jamie', girl: false, born: dayN - 8, seed: 4242, skin: charCfg.skin, hairColor: charCfg.hairColor }; f.kids.push(k); stats.rel[k.id] = 70; }
  if (!owned.size) { owned.add('p_studio'); f.home ||= 'p_studio'; refreshPropertyMarkers(); }
  saveGame(); labBadge(); toast('Test mode on. Nothing here is saved to your account.', 3);
}
function labEnd() { let B = null; try { B = JSON.parse(localStorage.getItem('lab_backup')); } catch (e) {} localStorage.removeItem('lab_backup'); if (B) applyBundle(B); else location.reload(); }
function labBadge() { let b = $('labBadge'); if (!labOn()) { b?.remove(); return; } if (!b) { b = document.createElement('div'); b.id = 'labBadge'; b.textContent = 'TEST MODE'; document.body.appendChild(b); } }
const LAB_VIA = { approach: 'Walks up to you', call: 'Phone call', thought: 'Thought', home: 'At home', work: 'At work', object: 'Found on the ground', pickup: 'School run' };
const labVia = ev => LAB_VIA[ev.via] || (ev.via.startsWith('place:') ? 'Inside ' + ev.via.slice(6) : ev.via);
function labData(ev) { // stand-in details for follow-ups that normally carry them from an earlier choice
  const api = lifeApi(), f = fam(), kid = f.kids[0];
  return { name: 'Danny', seed: 4321, amt: 300, owner: 'Gloria Mendez', cash: 140, kid, ...(ev.init ? ev.init(api) || {} : {}), ...(ev.init && kid ? { kid: ev.init(api)?.kid || kid } : {}) };
}
function labRun(ev) {
  if (!labOn()) { toast('Turn on test mode first', 2); return; }
  const data = labData(ev); closePhone(); eventOpen = false; if (lifeAct) { if (lifeAct.p) endLifePed(lifeAct); lifeAct = null; }
  const v = ev.via;
  if (v === 'approach' || v === 'object') { if (ride) { toast('Get out of the car to test this one', 2.4); return; } if (inside) { toast('Go outside to test this one', 2.4); return; } }
  if (ev.scene === 'car' && !ride) { toast('Get in a car to test this one', 2.4); return; }
  if (['approach', 'object', 'call', 'thought', 'pickup'].includes(v)) { setTimeout(() => deliverEvent(ev, data), 300); return; }
  // home / work / place events: played right here with the person who'd normally say it
  const f = fam(), who = ev.who ? ev.who(lifeApi(), data) : {};
  const spk = ev.speaker === 'kid' && data.kid ? { cfg: kidCfg(data.kid), name: data.kid.name, tag: 'Your kid' } : ev.speaker === 'partner' && f.partner ? { cfg: f.partner.cfg, name: f.partner.name, tag: 'Your partner' } : { cfg: npcCfg(who.role || 'sales', who.seed || 77), name: who.name || who.tag || 'Them', tag: who.tag || labVia(ev) };
  setTimeout(() => runEventTalk(ev, data, spk), 300);
}
function labKinds(ev) { // what kind of moment this is, for the checklist
  let src = ''; try { src = ev.choices.toString(); } catch (e) {}
  const k = []; if (/fight:/.test(src)) k.push('fight'); if (/flee:/.test(src)) k.push('chase'); if (/act:/.test(src)) k.push('minigame'); if (/escort:/.test(src)) k.push('walk'); if (/errand\(/.test(src)) k.push('trip'); if (/schedule\(/.test(src)) k.push('follow-up');
  return k;
}
function renderLab(el, back) {
  const T = labTicks(), list = EVENTS.filter(e => e.choices && (labFilter === 'all' || (labFilter === 'todo' ? !T[e.id] : T[e.id]))), done = EVENTS.filter(e => e.choices && T[e.id]).length, total = EVENTS.filter(e => e.choices).length;
  const nice = id => id.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  el.innerHTML = `${back}<h4>Event Lab</h4>
    <div class="lab-top"><b>${done} / ${total} checked</b><div class="lab-bar"><i style="width:${done / total * 100}%"></i></div></div>
    ${labOn() ? `<button class="ph-row danger" id="labEnd"><span>End test mode</span><b>Restore my life</b></button>` : `<button class="ph-row" id="labStart"><span>${svg('check', 'sm')} Start test mode</span><b>Backs up your life</b></button><p class="ph-hint">Test mode copies your life, gives you $25,000, a test partner and kid if you don't have them, and stops uploading. Ending it puts your real life back exactly as it was.</p>`}
    <div class="lab-tabs">${['all', 'todo', 'done'].map(k => `<button data-lf="${k}" class="${labFilter === k ? 'on' : ''}">${{ all: 'All', todo: 'To check', done: 'Checked' }[k]}</button>`).join('')}</div>
    <div class="lab-list">${list.map(e => { const k = labKinds(e); return `<div class="lab-ev${T[e.id] ? ' done' : ''}"><button class="lab-tick" data-tick="${e.id}" aria-label="Checked">${T[e.id] ? svg('check', 'sm') : ''}</button><div class="lab-txt"><b>${nice(e.id)}${e.follow ? ' <small>follow-up</small>' : ''}</b><span>${labVia(e)}${k.length ? ' · ' + k.join(' · ') : ''}</span></div><button class="ph-mini" data-run="${e.id}" ${labOn() ? '' : 'disabled'}>Play</button></div>`; }).join('')}</div>`;
  $('labStart')?.addEventListener('click', () => { labStart(); renderPhone(); });
  $('labEnd')?.addEventListener('click', () => labEnd());
  el.querySelectorAll('[data-lf]').forEach(b => b.onclick = () => { labFilter = b.dataset.lf; renderPhone(); });
  el.querySelectorAll('[data-tick]').forEach(b => b.onclick = () => { labSetTick(b.dataset.tick, !labTicks()[b.dataset.tick]); sfx.click(); renderPhone(); });
  el.querySelectorAll('[data-run]').forEach(b => b.onclick = () => labRun(EVENT_BY_ID[b.dataset.run]));
}
// ================================================================ SANDBOX (admin): a blank white world to summon people and play any life event
const SB = { x: 600, z: 0, h: 12, bg: '#f2f2ef', people: [], tab: 'events', rev: { ticks: {}, notes: {} }, q: '' };
function sandboxInit() {
  // clear every wall and post around the test spot, then hide the city: just you on a white floor
  for (let i = -100; i <= 100; i += 8) for (let j = -100; j <= 100; j += 8) for (const c of [...collidersNear(SB.x + i, SB.z + j)]) removeCollider(c);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: '#f6f6f3', roughness: 0.95 })); floor.rotation.x = -Math.PI / 2; floor.position.set(SB.x, 0.1, SB.z); floor.receiveShadow = true; floor.userData.sb = 1; G.scene.add(floor);
  const grid = new THREE.GridHelper(700, 175, '#dcdcd8', '#e9e9e5'); grid.position.set(SB.x, 0.11, SB.z); grid.userData.sb = 1; G.scene.add(grid);
  if (ride) exitCar(); Object.assign(P, { x: SB.x, z: SB.z + 4, y: baseY(SB.x, SB.z + 4), face: Math.PI });
  if (myCar) { Object.assign(myCar.s, { x: SB.x + 7, z: SB.z + 2, h: 0, v: 0 }); placeVehicle(myCar); }
  if (money < 20000) money = 25000; P.hp = maxHP(); const f = fam();
  if (!f.partner) { stats.dates ||= {}; stats.dates['lab:p'] = { name: 'Sam', cfg: { ...npcCfg('guest', 3131), fem: true }, met: dayN }; stats.rel['lab:p'] = 70; relNames['lab:p'] = 'Sam'; makeOfficial('lab:p'); }
  if (!f.kids.length) { const k = { id: 'kid:lab', name: 'Jamie', girl: false, born: dayN - 8, seed: 4242, skin: charCfg.skin, hairColor: charCfg.hairColor }; f.kids.push(k); stats.rel[k.id] = 70; }
  for (const id of ['p_studio']) owned.add(id); f.home ||= 'p_studio';
  { // one of every vehicle in the game, parked in rows to jump in and try
    const kinds = [...Object.keys(BODIES).filter(k => k !== 'speedboat'), 'Taxi', 'Police'];
    kinds.forEach((k, i) => { const cfg = CAR_PRESETS[k] ? { ...DEFAULT_CAR, ...CAR_PRESETS[k] } : { ...DEFAULT_CAR, body: k, bodyColor: ['#2f80ed', '#e23b3b', '#ffd23f', '#4cd964', '#b26bff', '#ff8a2a'][i % 6] };
      const v = makeVehicle(cfg, SB.x - 20 + (i % 7) * 6.5, SB.z - 12 - Math.floor(i / 7) * 9, 0, false); if (k === 'Police') v.police = true; if (k === 'Taxi') v.taxi = true; v.sbLabel = k; }); }
  clockH = SB.h; updateCamera(0, true); saveGame();
  const b = document.createElement('button'); b.id = 'sbBtn'; b.innerHTML = `${svg('check', 'sm')} Sandbox`; b.onclick = () => sbOpen(); document.body.appendChild(b);
  reviewLoad().then(r => { SB.rev = r; try { localStorage.setItem('lab_rev', JSON.stringify(r)); } catch (e) {} }).catch(() => { try { SB.rev = JSON.parse(localStorage.getItem('lab_rev')) || SB.rev; } catch (e) {} });
  setTimeout(() => toast('Sandbox: a blank world. Tap Sandbox to summon people and play events.', 3.5), 600);
}
function sbFrame() { // keep the city hidden and the room white
  for (const c of G.scene.children) if (!(c.isLight || c === dyn || c === sun.target || c.userData.sb || c === beam || c === headTarget)) c.visible = false;
  const night = SB.h < 6 || SB.h > 19.5, bg = night ? '#1c1d24' : SB.bg; G.scene.background.set(bg); G.scene.fog.color.set(bg); G.scene.fog.near = 70; G.scene.fog.far = 260;
}
const SB_PEOPLE = [
  ['Man', () => lifeCfg({ role: 'guest', seed: Math.floor(Math.random() * 1e5) }), {}],
  ['Woman', () => lifeCfg({ role: 'guest', seed: Math.floor(Math.random() * 1e5), fem: true }), {}],
  ['Elderly lady', () => lifeCfg({ role: 'guest', seed: 6363, fem: true }), {}],
  ['Kid', () => kidCfg(fam().kids[0] || { seed: 1, born: dayN - 8 }), {}],
  ['Partner', () => fam().partner?.cfg || lifeCfg({ role: 'guest', seed: 3131, fem: true }), {}],
  ['Thug (fights you)', () => lifeCfg({ role: 'dealer', seed: Math.floor(Math.random() * 1e5) }), { angry: true, angryT: 999, brawler: true, power: 7, hp: 6, state: 'chase' }],
  ['Cop', () => lifeCfg({ role: 'cop', seed: 55 }), {}],
  ['Dealer', () => lifeCfg({ role: 'dealer', seed: 3131 }), {}],
  ['Homeless', () => lifeCfg({ role: 'homeless', seed: 4040 }), {}],
  ['Business type', () => lifeCfg({ role: 'sales', seed: 99 }), {}],
];
function sbSummon(i) {
  const [label, cfgF, extra] = SB_PEOPLE[i], a = P.face, d = 3 + SB.people.length % 4, x = P.x + Math.sin(a) * d + (Math.random() - 0.5) * 2, z = P.z + Math.cos(a) * d + (Math.random() - 0.5) * 2;
  const p = eventPed(cfgF(), x, z, { name: label === 'Partner' ? (fam().partner?.name || 'Partner') : label === 'Kid' ? (fam().kids[0]?.name || 'Kid') : label, state: 'idle', lookX: P.x, lookZ: P.z, ...extra, ...(extra.state === 'chase' ? { tx: P.x, tz: P.z } : {}) });
  p.face = Math.atan2(P.x - x, P.z - z); SB.people.push(p); sfx.click(); return p;
}
function sbRemove(p) { const i = peds.list.indexOf(p); if (i >= 0) peds.list.splice(i, 1); dyn.remove(p.root); SB.people = SB.people.filter(q => q !== p); }
function sbClearAll() { for (const p of [...peds.list]) sbRemove(p); if (lifeAct) { if (lifeAct.dog) dyn.remove(lifeAct.dog.m.root); lifeAct = null; } clearWaypoint(); eventOpen = false; if (talk.active) endTalk(); }
const sbTick = (id, on) => { SB.rev.ticks ||= {}; if (on) SB.rev.ticks[id] = Date.now(); else delete SB.rev.ticks[id]; try { localStorage.setItem('lab_rev', JSON.stringify(SB.rev)); } catch (e) {} reviewSet(id, { tick: on }).catch(() => toast('Saved on this device. Couldn\'t reach the server.', 2.4)); };
const sbNote = (id, note) => { SB.rev.notes ||= {}; if (note) SB.rev.notes[id] = note; else delete SB.rev.notes[id]; try { localStorage.setItem('lab_rev', JSON.stringify(SB.rev)); } catch (e) {} reviewSet(id, { note }).catch(() => toast('Saved on this device. Couldn\'t reach the server.', 2.4)); };
function sbOpen() {
  if (state !== 'play') return; let el = $('sbPanel'); if (!el) { el = document.createElement('div'); el.id = 'sbPanel'; document.body.appendChild(el); }
  setState('ui'); el.classList.add('on'); sbDraw();
}
function sbClose() { $('sbPanel')?.classList.remove('on'); if (state === 'ui') setState('play'); }
function sbDraw() {
  const el = $('sbPanel'); if (!el) return; const T = SB.rev.ticks || {}, N = SB.rev.notes || {}, evs = EVENTS.filter(e => e.choices), done = evs.filter(e => T[e.id]).length;
  const nice = id => id.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()), q = SB.q.toLowerCase();
  let body = '';
  if (SB.tab === 'events') {
    const list = evs.filter(e => (!q || e.id.includes(q.replace(/ /g, '_')) || labVia(e).toLowerCase().includes(q)) && (SB.filter !== 'todo' || !T[e.id]) && (SB.filter !== 'done' || T[e.id]) && (SB.filter !== 'wip' || T['wip:' + e.id]));
    body = `<div class="sb-prog"><b>${done} / ${evs.length} checked${evs.filter(e => T['wip:' + e.id]).length ? ` · <span class="sb-wipn">${evs.filter(e => T['wip:' + e.id]).length} being looked into</span>` : ''}</b><div class="lab-bar"><i style="width:${done / evs.length * 100}%"></i></div></div>
      <input class="sb-search" id="sbQ" placeholder="Search events" value="${SB.q.replace(/"/g, '')}">
      <div class="lab-tabs">${['all', 'todo', 'wip', 'done'].map(k => `<button data-sf="${k}" class="${(SB.filter || 'all') === k ? 'on' : ''}">${{ all: 'All', todo: 'To check', wip: 'Looking into', done: 'Checked' }[k]}</button>`).join('')}</div>
      <div class="lab-list">${list.map(e => { const k = labKinds(e); return `<div class="lab-ev${T[e.id] ? ' done' : ''}${T['wip:' + e.id] ? ' wip' : ''}"><button class="lab-tick" data-tick="${e.id}" aria-label="Checked">${T[e.id] ? svg('check', 'sm') : ''}</button><button class="lab-wipb" data-wip="${e.id}" aria-label="Being looked into">${T['wip:' + e.id] ? '!' : ''}</button><div class="lab-txt"><b>${nice(e.id)}${e.follow ? ' <small>follow-up</small>' : ''}</b><span>${labVia(e)}${k.length ? ' · ' + k.join(' · ') : ''}</span>${N[e.id] ? `<em>${N[e.id].replace(/</g, '&lt;')}</em>` : ''}</div><button class="sb-mini ghost" data-note="${e.id}">Note</button>${sbModes(e).map(([m, l]) => `<button class="sb-mini" data-run="${e.id}" data-mode="${m}">${l}</button>`).join('')}</div>`; }).join('')}</div>`;
  } else if (SB.tab === 'people') {
    body = `<p class="sb-hint">Summon someone in front of you. Walk up to them to talk, or remove them.</p><div class="sb-grid">${SB_PEOPLE.map((p, i) => `<button class="sb-chip" data-sum="${i}">${p[0]}</button>`).join('')}</div>
      <div class="sb-sec">In the room (${peds.list.length})</div><div class="lab-list">${peds.list.map((p, i) => `<div class="lab-ev"><div class="lab-txt"><b>${(p.name || 'Person').replace(/</g, '')}</b><span>${p.angry ? 'Wants a fight' : p.state}${p.buddy ? ' · with you' : ''}</span></div><button class="sb-mini ghost" data-rm="${i}">Remove</button></div>`).join('') || '<p class="sb-hint">Nobody here yet.</p>'}</div>
      ${peds.list.length ? '<button class="sb-wide danger" id="sbClear">Remove everyone</button>' : ''}`;
  } else {
    body = `<div class="sb-sec">Time</div><div class="sb-grid">${[['Morning', 8], ['Midday', 12], ['Evening', 18.5], ['Night', 23]].map(([l, h]) => `<button class="sb-chip${SB.h === h ? ' on' : ''}" data-h="${h}">${l}</button>`).join('')}</div>
      <div class="sb-sec">You</div><div class="sb-grid"><button class="sb-chip" data-t="heal">Full health</button><button class="sb-chip" data-t="cash">+$10,000</button><button class="sb-chip" data-t="car">Bring my car</button><button class="sb-chip" data-t="centre">Back to centre</button><button class="sb-chip" data-t="stop">Stop the current event</button></div>
      <div class="sb-sec">Leave</div><button class="sb-wide danger" id="sbExit">Exit sandbox</button><p class="sb-hint">The sandbox has its own throwaway life. Your real life isn't touched.</p>`;
  }
  el.innerHTML = `<div class="sb-card"><div class="sb-head"><b>Sandbox</b><button class="sb-x" id="sbX">${svg('x', 'sm')}</button></div>
    <div class="sb-tabs">${[['events', 'Events'], ['people', 'People'], ['tools', 'Tools']].map(([k, l]) => `<button data-tab="${k}" class="${SB.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div class="sb-body">${body}</div></div>`;
  const B = el.querySelector('.sb-body'); if (SB.scroll && SB.tab === SB.scrollTab) B.scrollTop = SB.scroll; B.onscroll = () => { SB.scroll = B.scrollTop; SB.scrollTab = SB.tab; };
  $('sbX').onclick = sbClose; el.onclick = e => { if (e.target === el) sbClose(); };
  el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { SB.tab = b.dataset.tab; sbDraw(); });
  el.querySelectorAll('[data-sf]').forEach(b => b.onclick = () => { SB.filter = b.dataset.sf; sbDraw(); });
  const qi = $('sbQ'); if (qi) qi.oninput = () => { SB.q = qi.value; const pos = qi.selectionStart; sbDraw(); const n = $('sbQ'); n.focus(); n.setSelectionRange(pos, pos); };
  el.querySelectorAll('[data-tick]').forEach(b => b.onclick = () => { const id = b.dataset.tick; sbTick(id, !(SB.rev.ticks || {})[id]); sfx.click(); sbDraw(); });
  el.querySelectorAll('[data-wip]').forEach(b => b.onclick = () => { const id = 'wip:' + b.dataset.wip; sbTick(id, !(SB.rev.ticks || {})[id]); sfx.click(); sbDraw(); }); // yellow: being looked into
  el.querySelectorAll('[data-note]').forEach(b => b.onclick = () => { const id = b.dataset.note, cur = (SB.rev.notes || {})[id] || ''; const row = b.closest('.lab-ev'); row.insertAdjacentHTML('afterend', `<div class="sb-noteed"><textarea id="sbNoteT" placeholder="What's wrong with it, or what should change?">${cur.replace(/</g, '&lt;')}</textarea><div class="sb-grid"><button class="sb-chip on" id="sbNoteS">Save note</button>${cur ? '<button class="sb-chip" id="sbNoteD">Delete</button>' : ''}</div></div>`); const t = $('sbNoteT'); t.focus(); $('sbNoteS').onclick = () => { sbNote(id, t.value.trim()); sbDraw(); }; if ($('sbNoteD')) $('sbNoteD').onclick = () => { sbNote(id, ''); sbDraw(); }; });
  el.querySelectorAll('[data-run]').forEach(b => b.onclick = () => { sbClose(); if (lifeAct) { if (lifeAct.dog) dyn.remove(lifeAct.dog.m.root); lifeAct = null; } eventOpen = false; clearWaypoint(); sbRunEvent(EVENT_BY_ID[b.dataset.run], b.dataset.mode); });
  el.querySelectorAll('[data-sum]').forEach(b => b.onclick = () => { sbSummon(+b.dataset.sum); sbDraw(); });
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { sbRemove(peds.list[+b.dataset.rm]); sbDraw(); });
  $('sbClear')?.addEventListener('click', () => { sbClearAll(); sbDraw(); });
  el.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { SB.h = +b.dataset.h; clockH = SB.h; sbDraw(); });
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = b.dataset.t;
    if (t === 'heal') { P.hp = maxHP(); feed({ hunger: 100, energy: 100, mood: 100 }); } if (t === 'cash') addMoney(10000);
    if (t === 'car' && myCar && !ride) { Object.assign(myCar.s, { x: P.x + Math.cos(P.face) * 4, z: P.z - Math.sin(P.face) * 4, h: P.face, v: 0 }); placeVehicle(myCar); }
    if (t === 'centre') { if (ride) exitCar(); Object.assign(P, { x: SB.x, z: SB.z + 4 }); updateCamera(0, true); }
    if (t === 'stop') sbClearAll(); toast('Done', 1); });
  $('sbExit')?.addEventListener('click', () => { sessionStorage.removeItem('bc_sandbox'); location.reload(); });
}
// how an event can be played: as it normally arrives, in person (they stand in front of you), or as a phone call
function sbModes(e) {
  if (e.via === 'thought' || e.via === 'object' || e.via === 'pickup') return [['auto', 'Play']];
  if (e.via === 'call') return PERSON_TEXT[e.id] ? [['call', 'Call'], ['person', 'In person']] : [['call', 'Call']];
  if (e.via === 'approach') return PHONE_TEXT[e.id] ? [['auto', 'Walk up'], ['call', 'Call']] : [['auto', 'Walk up']];
  return [['person', 'Play'], ['call', 'Call']]; // home / work / place
}
function sbRunEvent(ev, mode = 'auto') {
  if (!ev) return; const data = labData(ev), v = ev.via, f = fam(), who = ev.who ? ev.who(lifeApi(), data) : {};
  if (ev.scene === 'car' && !ride) { toast('Get in a car first', 2.4); return; }
  const spkFor = () => ev.speaker === 'kid' && data.kid ? { cfg: kidCfg(data.kid), name: data.kid.name, tag: 'Your kid' } : ev.speaker === 'partner' && f.partner ? { cfg: f.partner.cfg, name: f.partner.name, tag: 'Your partner' } : { cfg: lifeCfg({ role: who.role || 'sales', seed: who.seed || 77, fem: who.fem }), name: who.name || who.tag || 'Them', tag: who.tag || labVia(ev) };
  if (mode === 'call') { const S2 = spkFor(), near = !ride && peds.list.find(q => q.name && q.name === S2.name && q.state !== 'down' && Math.hypot(q.x - P.x, q.z - P.z) < 18);
    if (near) { toast(`${S2.name} is right here, so they say it in person`, 2.4); peds.talk(near, P.x, P.z); setTimeout(() => runEventTalk(ev, data, { ...S2, tag: 'In person', p: near }), 250); return; }
    eventOpen = true; ringing(S2.name, S2.cfg); setTimeout(() => { eventOpen = false; runEventTalk(ev, data, { ...S2, tag: `${S2.tag} · on the phone`, phone: true, seat: !!(ride && !ride.b.two) }); }, 1500); return; }
  if (mode === 'person') { // they stand in front of you (or at your car window) and say it
    const S2 = spkFor(), a = P.face, d = ride ? 2.6 : 1.8, p = eventPed(S2.cfg, P.x + Math.sin(a + (ride ? 1.4 : 0)) * d, P.z + Math.cos(a + (ride ? 1.4 : 0)) * d, { name: S2.name, state: 'talk', lookX: P.x, lookZ: P.z }); SB.people.push(p);
    setTimeout(() => runEventTalk(ev, data, { ...S2, p, seat: !!(ride && !ride.b.two) }), 250); return; }
  if ((v === 'approach' || v === 'object') && ride) { toast('Get out of the car first', 2); return; }
  setTimeout(() => deliverEvent(ev, data), 250);
}
// ================================================================ TITLE: sign in, pick up your save from any device, play (full screen)
const SAVE_SKIP = ['bc_sid', 'bc_email', 'bc_online', 'bc_net_id', 'bc_autoplay', 'bc_slot', 'bc_admin'];
const curSlot = () => +localStorage.getItem('bc_slot') || null, setSlot = n => n ? localStorage.setItem('bc_slot', n) : localStorage.removeItem('bc_slot');
const titleUp = !SANDBOX && !/[?&](test|local)\b/.test(location.search) && sessionStorage.getItem('bc_autoplay') !== '1';
sessionStorage.removeItem('bc_autoplay');
let titleNewLife = false, titleStep = null, titleEmail = '', titleDev = null, cloudState = null;
function saveBundle() { const out = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^(bc_|rr_)/.test(k) && !SAVE_SKIP.includes(k)) out[k] = localStorage.getItem(k); } return out; }
function bundleSummary(B) { try { const s2 = JSON.parse(B?.bc_save || 'null'); if (!s2) return null; return { day: s2.day || 1, money: s2.money || 0, at: +(B.bc_savedAt || 0) }; } catch (e) { return null; } }
function applyBundle(B, slot, title) { if (slot !== undefined) setSlot(slot); for (const k of Object.keys(saveBundle())) localStorage.removeItem(k); for (const [k, v] of Object.entries(B)) if (!SAVE_SKIP.includes(k)) localStorage.setItem(k, v); if (!title) sessionStorage.setItem('bc_autoplay', '1'); location.reload(); }
let cloudT = 0, cloudLast = '';
function cloudTick(dt, force) { // while you play, your save goes up to your account every minute (and when you leave)
  if (SANDBOX || !signedIn() || $('title') || !curSlot() || labOn()) return; cloudT -= dt; if (cloudT > 0 && !force) return; cloudT = 60;
  saveGame(); const B = saveBundle(), j = JSON.stringify(B); if (j === cloudLast) return; cloudLast = j; const sl = curSlot(); if (sl) cloudSave(B, bundleSummary(B), force, sl);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) cloudTick(0, true); });
const isTouch = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function goFullscreen() { if (isStandalone() || isIOS()) return; const el = document.documentElement; try { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el, { navigationUI: 'hide' })?.catch?.(() => {}); } catch (e) {} }
// the opening: a slow fly-over of the city at sunset under the big sign, then you're in
const PITCH = ['Hustle on the corners', 'Climb the Bay Corp tower', 'Race across the bridges', 'Fall in love, raise a family', 'Buy the whole block', 'Sail the bay at sunset', 'Do time. Or don\'t get caught', 'Play online with everyone'];
let titlePick = false, pitchI = 0, pitchTimer = null;
function titlePlay() { $('title')?.remove(); clearInterval(pitchTimer); setState('play'); goFullscreen(); if (titleNewLife && !save) setTimeout(() => applyStory(pick(STORIES).id), 300); titleNewLife = false; if (signedIn()) { goOnline(); cloudT = 5; } }
const TSHOTS = [ // [look x, z, radius, height, start angle, turn per shot]
  () => [0, 0, 170, 60, 0.6, 0.12], // downtown skyline
  () => [300, 0, 130, 50, 2.2, -0.1], // across the bay
  () => { const c = CITIES.find(q => q.id === 'strip'); return c ? [c.cx, c.cz, 110, 45, 4, 0.14] : [P.x, P.z, 70, 40, 4, 0.14]; }]; // the Sun Valley strip
function titleCam(dt) {
  ptime += dt; const n = Math.floor(ptime / 10) % TSHOTS.length, u = (ptime % 10) / 10, S = TSHOTS[n]();
  let [x, z, r, h, a0, w] = S; if (!isFinite(x) || !isFinite(z)) { x = P.x; z = P.z; }
  const a = a0 + u * w * 10, cam = G.cam;
  cam.position.set(x + Math.sin(a) * r * (1 - u * 0.15), h * (1 - u * 0.2) + 10, z + Math.cos(a) * r * (1 - u * 0.15)); cam.lookAt(x, 12, z);
  updateChunks(x, z, 3); applyTime(18.4, x, z); G.scene.fog.near = r * 0.8; G.scene.fog.far = r * 2.6;
  const fade = $('ttFade'); if (fade) fade.style.opacity = u < 0.06 ? 1 - u / 0.06 : u > 0.94 ? (u - 0.94) / 0.06 : 0;
}
function fitPhone() { const land = innerWidth > innerHeight && innerHeight <= 540; document.documentElement.style.setProperty('--phs', land ? Math.min(1, innerHeight * 0.95 / (560 * 0.985 + 310 * 0.139)).toFixed(3) : 1); } // a 270x500 phone tilted 8 degrees, scaled to the screen height
addEventListener('resize', fitPhone); fitPhone();
function showTitle() {
  let el = $('title'); const fresh = !el; if (!el) { el = document.createElement('div'); el.id = 'title'; document.body.appendChild(el); }
  setState('title');
  const S = signedIn(), loc = bundleSummary(saveBundle()), sumTxt = s2 => s2 ? `Day ${s2.day} · ${fmt(s2.money)}` : 'New life';
  let body = '';
  if (titleStep === 'install') body = `<h3 class="tt-h">${svg('download', 'sm')} ${isIOS() ? 'Add to your Home Screen' : 'Install the app'}</h3>${INSTALL_STEPS()}<button class="tt-btn" id="ttInstBack">Got it</button>`;
  else if (!S && titleStep !== 'code') body = `<input id="ttEmail" type="email" autocomplete="email" placeholder="you@email.com" value="${titleEmail.replace(/"/g, '')}"><button class="tt-btn" id="ttSend">Sign in to play</button>
    <p class="tt-sub"><small>We'll email you a code. Your life is saved to your account and you play online with everyone.</small></p>
    <button class="tt-link" id="ttOffline">Play offline on this ${isTouch() ? 'phone' : 'computer'}</button>`;
  else if (!S) body = `<p class="tt-sub">We sent a 6-digit code to <b>${titleEmail}</b>.${titleDev ? ` <small>(test code ${titleDev.code})</small>` : ''}</p>
    <input id="ttCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" class="tt-code"><button class="tt-btn" id="ttVerify">Sign in</button>
    <div class="tt-apps">${mailApps(titleEmail).map(m => `<a class="tt-app" href="${m.href}" ${m.web ? 'target="_blank" rel="noopener"' : ''}>${svg('mail', 'sm')} ${m.label}</a>`).join('')}</div>
    <button class="tt-link" id="ttBack">Use a different email</button>`;
  else if (!cloudState) body = `<div class="tt-load"><i></i><span>Loading your life...</span></div><p class="tt-sub"><small>${NET.email}</small></p>`;
  else if (!titlePick) { const R = resumePlan(); body = `<button class="tt-btn big" id="ttGo">${R.sum ? 'Carry on' : 'Start your life'}<small>${R.sum?.day ? sumTxt(R.sum) : 'A new life in Bay City'}</small></button><button class="tt-link" id="ttLives">${svg('cloud', 'sm')} Your lives</button>${isAdmin() ? `<button class="tt-btn tt-sb" id="ttSandbox">${svg('check', 'sm')} Sandbox<small>Test events in a blank white world</small></button>` : ''}<p class="tt-sub"><small>Signed in as ${NET.email}</small></p>`; }
  else { const sl = cloudState.slots, cur = curSlot(), linked = sl.some(q => q.slot === cur), here = isTouch() ? 'phone' : 'computer';
    const ago = t => { const m = (Date.now() - t) / 6e4; return m < 2 ? 'just now' : m < 60 ? `${Math.round(m)} min ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)} days ago`; };
    body = `<p class="tt-sub">Your lives · <b>${NET.email}</b></p><div class="tt-slots">`
      + sl.map(q => `<div class="tt-slot"><button class="tt-save${q.slot === cur ? '' : ' alt'}" data-slot="${q.slot}"><b>${svg(q.slot === cur ? 'phone' : 'cloud', 'sm')} Life ${q.slot}${q.slot === cur ? ' · playing' : ''}</b><span>${sumTxt(q.summary?.day ? q.summary : null)} · ${ago(q.t)}</span></button><button class="tt-del" data-del="${q.slot}" aria-label="Delete">${svg('trash', 'sm')}</button></div>`).join('')
      + (loc && !linked ? `<div class="tt-slot"><button class="tt-save" data-up="1"><b>${svg('phone', 'sm')} This ${here}</b><span>${sumTxt(loc)} · not saved yet</span></button></div>` : '')
      + `</div>${sl.length < cloudState.max ? `<button class="tt-btn" id="ttNew">Start a new life</button>` : `<p class="tt-sub"><small>All ${cloudState.max} save slots are full. Delete one to start another life.</small></p>`}`
      + `<p class="tt-sub"><small>${sl.length} of ${cloudState.max} saves</small></p>${resumePlan() ? '<button class="tt-link" id="ttBackMenu">Back</button>' : ''}<button class="tt-link" id="ttOut">Sign out</button>`; }
  const inst = isTouch() && !isStandalone() && titleStep !== 'install' && !(S && titlePick) ? `<button class="tt-link" id="ttInstall">${svg('download', 'sm')} ${isIOS() ? 'Play full screen: add to your Home Screen' : 'Install the app'}</button>` : '';
  el.innerHTML = `<div id="ttFade"></div><div class="tt-top"><div class="tt-kicker">An open city life game</div><div class="tt-logo">BAY<span>CITY</span></div><div class="tt-tag">One city. Any life.</div><div class="tt-pitch" id="ttPitch">${PITCH[pitchI % PITCH.length]}</div></div>
    <div class="tt-card">${body}${inst}${!isTouch() && !S ? '<p class="tt-keys">WASD move · Mouse attack · E use · F car · Space jump · T phone · M map</p>' : ''}</div>`;
  if (fresh) { el.classList.add('intro'); clearInterval(pitchTimer); pitchTimer = setInterval(() => { const pe = $('ttPitch'); if (!pe) return; pe.classList.remove('in'); void pe.offsetWidth; pitchI++; pe.textContent = PITCH[pitchI % PITCH.length]; pe.classList.add('in'); }, 2600); }
  const play = titlePlay;
  el.querySelector('#ttSend')?.addEventListener('click', async e => { titleEmail = el.querySelector('#ttEmail').value.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(titleEmail)) { toast('Type your email first'); return; } e.target.disabled = true; e.target.textContent = 'Sending...'; const r = await sendMagicLink(titleEmail); if (r.ok) { titleStep = 'code'; titleDev = r.dev; } else toast(r.error, 4); showTitle(); });
  el.querySelector('#ttOffline')?.addEventListener('click', play);
  el.querySelector('#ttBackMenu')?.addEventListener('click', () => { titlePick = false; showTitle(); });
  el.querySelector('#ttGo')?.addEventListener('click', async e => { e.currentTarget.disabled = true; try { await resumePlan().go(); } catch (er) { toast(er.message, 3); showTitle(); } });
  el.querySelector('#ttSandbox')?.addEventListener('click', () => { sessionStorage.setItem('bc_sandbox', '1'); location.reload(); });
  el.querySelector('#ttLives')?.addEventListener('click', () => { titlePick = true; showTitle(); });
  el.querySelector('#ttBack')?.addEventListener('click', () => { titleStep = null; showTitle(); });
  const code = el.querySelector('#ttCode'), tryCode = async () => { const c = code.value.replace(/\D/g, ''); if (c.length !== 6) return; const r = await verifyCode(titleEmail, c); if (r.ok) { titleStep = null; titleSignedIn(); } else { toast(r.error, 3); code.value = ''; } };
  if (code) { code.oninput = () => code.value.replace(/\D/g, '').length === 6 && tryCode(); el.querySelector('#ttVerify').onclick = tryCode; setTimeout(() => code.focus(), 50); }
  const freeSlot = () => { for (let n = 1; n <= cloudState.max; n++) if (!cloudState.slots.some(q => q.slot === n)) return n; return null; };
  el.querySelectorAll('[data-slot]').forEach(b => b.onclick = async () => { const n = +b.dataset.slot, q = cloudState.slots.find(x => x.slot === n);
    if (n === curSlot() && loc && !(q.t > (loc.at || 0) + 30000)) return play(); // this device has the latest of this life: just carry on
    if (curSlot() && curSlot() !== n && loc) { const B = saveBundle(); await cloudSave(B, bundleSummary(B), false, curSlot()); } // park the life you're leaving
    b.disabled = true; try { const r = await cloudLoad(n); if (r.data) applyBundle(r.data, n); else toast('That save is empty', 2); } catch (e) { toast(e.message, 3); b.disabled = false; } });
  el.querySelector('[data-up]')?.addEventListener('click', async () => { const n = freeSlot(); if (!n) { toast('Your save slots are full. Delete one first.', 3); return; } const B = saveBundle(); await cloudSave(B, bundleSummary(B), false, n); setSlot(n); play(); });
  el.querySelector('#ttNew')?.addEventListener('click', async () => { const n = freeSlot(); if (!n) return;
    if (loc && curSlot()) { const B = saveBundle(); await cloudSave(B, bundleSummary(B), false, curSlot()); } applyBundle({}, n); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { const n = +b.dataset.del;
    if (!b.classList.contains('armed')) { el.querySelectorAll('.tt-del.armed').forEach(x => { x.classList.remove('armed'); x.innerHTML = svg('trash', 'sm'); }); b.classList.add('armed'); b.innerHTML = 'Delete?'; return; }
    b.disabled = true; try { const r = await cloudDelete(n); cloudState = { slots: r.slots, max: r.max }; if (n === curSlot()) { sessionStorage.setItem('bc_pick', '1'); return applyBundle({}, null, true); } showTitle(); } catch (e) { toast(e.message, 3); b.disabled = false; } });
  el.querySelector('#ttOut')?.addEventListener('click', async () => { await signOut(); setSlot(null); cloudState = null; titlePick = false; showTitle(); });
  el.querySelector('#ttInstall')?.addEventListener('click', () => installHelp());
  el.querySelector('#ttInstBack')?.addEventListener('click', () => { titleStep = null; showTitle(); });
  if (S && !cloudState && !titleBusy) titleSignedIn();
}
// signed in: straight into your life. The list only shows when there's a real choice to make (or you ask for it in Settings)
let titleBusy = false;
async function titleSignedIn(pickList) {
  checkAdmin();
  titleBusy = true; cloudState = null; titlePick = !!pickList || sessionStorage.getItem('bc_pick') === '1'; sessionStorage.removeItem('bc_pick'); showTitle(); const t0 = performance.now();
  try { const r = await cloudList(); cloudState = { slots: r.slots || [], max: r.max || 3 }; }
  catch (e) { titleBusy = false; if (/signed in/i.test(e.message)) { await signOut(); setSlot(null); cloudState = null; showTitle(); } else { toast('Couldn\'t reach your saves. Playing on this device.', 3); cloudState = null; if ($('title')) titlePlay(); } return; }
  titleBusy = false;
  if (!titlePick && !resumePlan()) titlePick = true;
  if ($('title')) showTitle();
}
function resumePlan() { // what "Carry on" does: null = there's a real choice, show the list
  const sl = cloudState.slots, cur = curSlot(), loc = bundleSummary(saveBundle()), q = sl.find(x => x.slot === cur);
  const fromCloud = n => async () => { const r = await cloudLoad(n); if (r.data) applyBundle(r.data, n); else { titlePick = true; showTitle(); } };
  if (q) return loc && !(q.t > (loc.at || 0) + 30000) ? { sum: loc, go: titlePlay } : { sum: q.summary, go: fromCloud(cur) }; // another device played this life more recently: take theirs
  if (!loc) { if (sl.length) { const L = sl.reduce((a, b) => b.t > a.t ? b : a); return { sum: L.summary, go: fromCloud(L.slot) }; } return { sum: null, go: () => { setSlot(1); titlePlay(); } }; }
  if (!sl.length) return { sum: loc, go: async () => { const B = saveBundle(); await cloudSave(B, bundleSummary(B), false, 1); setSlot(1); titlePlay(); } }; // first sign-in on this device: its life becomes your account's
  return null; // this device has a life your account doesn't, and the account has others: ask
}
let installEvt = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
const INSTALL_STEPS = () => isIOS()
  ? `<ol class="inst"><li>Tap <b>Share</b> in Safari. (On newer iPhones, tap <b>•••</b> at the bottom right first, then <b>Share</b>.)</li><li>Scroll down and tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>, then open Bay City from your Home Screen. No address bar, full screen.</li></ol>`
  : `<ol class="inst"><li>Tap the <b>⋮</b> menu in Chrome.</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Open Bay City from your Home Screen.</li></ol>`;
function installHelp() { // Android: the real install prompt. iPhone: how to do it by hand
  if (installEvt) { installEvt.prompt(); installEvt = null; return; }
  if ($('title')) { titleStep = 'install'; showTitle(); return; } // on the title screen the steps show in its own card
  modal(`<div class="big-ico">${svg('download', 'big')}</div><h3>${isIOS() ? 'Play full screen' : 'Install Bay City'}</h3>${isIOS() ? '<p>iPhone can\'t make websites full screen, but on your Home Screen Bay City opens like an app:</p>' : ''}${INSTALL_STEPS()}<p class="ph-hint">Your save is on your account, so you'll carry on where you left off.</p>`, [{ label: 'Got it', cls: 'big', fn: closeModal }]);
}
function startGame() {
  if (save) { Object.assign(P, { x: save.x, z: save.z, face: save.face || 0 }); clockH = save.h ?? 8; dayN = save.day ?? 1; }
  P.hp = save?.hp > 0 ? Math.min(save.hp, maxHP()) : maxHP();
  applyBody(); buildHero();
  myCar = null; rebuildMyCar();
  if (save && save.cx != null) Object.assign(myCar.s, { x: save.cx, z: save.cz, h: save.ch });
  placeVehicle(myCar);
  if (save?.inCar) enterVehicle(myCar, false);
  P.y = baseY(P.x, P.z); heroRoot.visible = !ride;
  refreshPropertyMarkers(); refreshBizSigns();
  for (const c of customers) attachCustomer(c);
  if (waypoint) setWaypoint(waypoint.x, waypoint.z, waypoint.label);
  loadBudget = 60; updateChunks(P.x, P.z, 2); loadBudget = 2;
  applyTime(clockH, P.x, P.z);
  if (!ride) updateFoot(0.001);
  updateCamera(0, true); applySettings();
  setState('play');
  if (stats.escaped) { charCfg = { ...stats.escaped }; stats.escaped = null; buildHero(); }
  if (stats.jail) { wearJumpsuit(true); enterPrison(false); }
  else if (stats.dateNow && gameHours() - stats.dateNow.since < 7) { const D0 = stats.dateNow; setTimeout(() => { if (date) return; startDate({ name: D0.name, look: { ...bakeCfg(D0.cfg), fem: true }, x: P.x + 1, z: P.z + 1, face: 0, interest: D0.interest, root: new THREE.Group() }); if (date) { date.since = D0.since; date.holding = D0.holding; } }, 600); }
  storyGate = !!save;
  if (!save && !SANDBOX) { if (titleUp) titleNewLife = true; else setTimeout(() => applyStory(pick(STORIES).id), 300); } // every new life starts in one of the stories, no menu (after the title screen if it's up)
  else if (save && !save.stats) { phoneBadge = 1; toast('New: needs, skills, homes and interiors. Check your phone!', 4); }
  else if (save && !store.get('bc_seen7')) { store.set('bc_seen7', 1); phoneBadge = 1; toast('New: the Work app on your phone lists every job. Upgrade cars at Bay Customs.', 4.5); }
}
function bringCar(silent) {
  let best = null;
  for (let r = 4; r < 60 && !best; r += 4) for (let a = 0; a < Math.PI * 2 && !best; a += Math.PI / 8) { const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; if ((roadAt(x, z) || canyonAt(x, z)) && walkable(x, z, false)) { const p = { x, z }; if (!resolve(p, 1.4, 0)) best = p; } }
  if (!best) best = { x: P.x + 4, z: P.z };
  // damaged or wrecked? the garage fixes it on the way over and bills you
  const dmg = myCar.wrecked ? 100 : 100 - (myCar.hp ?? 100), fee = myCar.wrecked ? 1500 : Math.round(dmg * 6);
  if (dmg > 0.5) { const was = myCar.wrecked, paid = Math.min(money, fee); money -= paid; rebuildMyCar({ x: best.x, z: best.z, h: myCar.s.h }); myCar.hp = 100; myCar.fuse = 0; if (!silent) toast(was ? `The garage rebuilt your wrecked car and dropped it off. Bill: ${fmt(paid)}` : `Your car was repaired on the way over. Repair bill: ${fmt(paid)}`, 3.5); }
  // a driver brings it round: it drives in along the road and they hand you the keys
  const canyon = !roadAt(best.x, best.z) && canyonAt(best.x, best.z), from = !silent && !inside && (roadAt(best.x, best.z) || canyon) ? (canyon ? canyonSpot(best, 70, 120) : randomRoadSpot(55, 110)) : null;
  if (from && (roadAt(from.x, from.z) || canyonAt(from.x, from.z))) {
    Object.assign(myCar.s, { x: from.x, z: from.z, h: Math.atan2(best.x - from.x, best.z - from.z), v: 0, vx: 0, vz: 0 }); placeVehicle(myCar);
    myCar.ai = 'respond'; myCar.target = { x: best.x, z: best.z }; myCar.delivery = { t: 0, to: best }; if (dmg <= 0.5) toast('Your car is on its way. Keep an eye on the road.', 2.6); return;
  }
  Object.assign(myCar.s, { x: best.x, z: best.z, v: 0, vx: 0, vz: 0 }); placeVehicle(myCar); if (!silent && dmg <= 0.5) toast('Your car has been delivered. It\'s waiting nearby.');
}
// a spot on the canyon roads 70-120 m from p (along the road), for the valet to start from
function canyonSpot(p, d0, d1) { const c = canyonNear(p.x, p.z); if (!c) return null; const S2 = c.q.R.s, i = c.q.i; for (const dir of Math.random() < 0.5 ? [1, -1] : [-1, 1]) { const j = i + dir * Math.round(rand(d0, d1) / 2); if (j >= 0 && j < S2.length) return { x: S2[j].x, z: S2[j].z }; } return null; }
function updateDelivery(dt) {
  const v = myCar, D = v?.delivery; if (!D) return; D.t += dt;
  if (ride === v) { v.delivery = null; v.ai = null; return; }
  // the driver keeps an eye out for you: walk up to the car and they pull over right there; wander off and they follow you
  if (!inside && !ride) { const pd = Math.hypot(v.s.x - P.x, v.s.z - P.z), moved = Math.hypot(P.x - D.to.x, P.z - D.to.z);
    if (pd < 15 && !D.met) { D.met = true; D.to = { x: v.s.x, z: v.s.z }; v.target = D.to; }
    else if (!D.met && moved > 28 && (D.reT = (D.reT || 0) - dt) <= 0) { D.reT = 2;
      let nb = null; for (let r = 4; r < 50 && !nb; r += 4) for (let a = 0; a < Math.PI * 2 && !nb; a += Math.PI / 8) { const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; if ((roadAt(x, z) || canyonAt(x, z)) && walkable(x, z, false)) { const q = { x, z }; if (!resolve(q, 1.4, 0)) nb = q; } }
      if (nb) { D.to = nb; v.target = nb; D.t = Math.min(D.t, 15); } } }
  const d = Math.hypot(v.s.x - D.to.x, v.s.z - D.to.z);
  if (D.t > 45 || inside) { Object.assign(v.s, { x: D.to.x, z: D.to.z, v: 0, vx: 0, vz: 0 }); placeVehicle(v); v.ai = null; v.delivery = null; if (!inside) toast('Your car has been delivered. It\'s waiting nearby.'); return; }
  if (d < 11 && Math.abs(v.s.v) < 1) { // pulled up: the driver gets out, hands over the keys and walks off
    v.ai = null; v.delivery = null; v.s.v = 0; const h = v.s.h, x = v.s.x + Math.cos(h) * 1.7, z = v.s.z - Math.sin(h) * 1.7;
    const dr = eventPed({ top: 'jacket', topColor: '#ff8a2a', hat: 'cap', hatColor: '#16161b', fem: Math.random() < 0.3 }, x, z, { state: 'talk', lookX: P.x, lookZ: P.z, name: pick(['Gaz', 'Tariq', 'Sam', 'Lou', 'Benny']) + ' (Bay Valet)' });
    setDoor(v, DRIVER, 1); setTimeout(() => setDoor(v, DRIVER, 0), 900);
    setTimeout(() => { const w = pedWho(dr); if (w) subs.say(w, pick(['All yours. Here\'s the keys.', 'Delivered! Keys are in it.', 'There you go, boss. Not a scratch.', 'Here\'s the keys. Lovely motor, this.']), { expr: 'happy', pri: 3 }); }, 700);
    setTimeout(() => { const a = Math.atan2(dr.x - P.x, dr.z - P.z); dr.state = 'march'; dr.mspd = 1.5; dr.tx = dr.x + Math.sin(a) * 25; dr.tz = dr.z + Math.cos(a) * 25; }, 3200);
    setTimeout(() => cleanupEvPed(dr), 16000);
  }
}
function updateAmbience() {
  const f = focusPos(), x = f.x, z = f.z, c = inside ? null : cityNear(x, z, 30), shoreD = shoreLine(x) - z;
  ambience(inside ? { city: inside.id === 'club' ? 0.6 : 0.08, waves: 0, birds: 0, crickets: 0 } : { city: c ? (c.id === 'main' ? 1 : 0.6) * (1 - night * 0.4) : 0.15, waves: clamp(1 - (shoreD - 20) / 90, 0, 1), birds: (1 - night) * (x < -300 || !c ? 1 : 0.35), crickets: night * (c ? 0.3 : 1) * (1 - wet), rain: wet });
}

// ---------------- step
// ---------------- body: muscle from training (max a few sessions a day), fat from junk food; both show on your character
function body() { return stats.body ||= { muscle: 0, fat: 0, shown: [0, 0], lastGym: 0 }; }
function bodyCheck() {
  const B = body(); if (stats.jail && charCfg === undefined) return;
  if (Math.abs(B.muscle - B.shown[0]) > 0.06 || Math.abs(B.fat - B.shown[1]) > 0.06) {
    const up = B.muscle > B.shown[0] + 0.06, fatter = B.fat > B.shown[1] + 0.06, slimmer = B.fat < B.shown[1] - 0.06;
    B.shown = [B.muscle, B.fat]; applyBody(); buildHero();
    toast(up ? 'You\'re getting bigger. The gym is paying off.' : fatter ? 'Your clothes feel tighter. Too much junk food.' : slimmer ? 'You\'re looking leaner.' : 'You\'ve lost some muscle. Get back to the gym.', 3);
  }
}
function applyBody() { const B = body(); charCfg.muscle = B.shown[0]; charCfg.fat = B.shown[1]; if (stats.jail?.outfit) Object.assign(stats.jail.outfit, { muscle: B.shown[0], fat: B.shown[1] }); }
const GYM_DAILY = 3;
// one workout: returns false (and tells you) if you've hit today's limit
function workout(score, kind = 'lift') {
  const B = body(), k = 'gym:' + dayN; stats.relDay[k] ||= 0;
  if (stats.relDay[k] >= GYM_DAILY) { toast(`Your muscles are fried. ${GYM_DAILY} workouts a day max. Rest and come back tomorrow.`, 3); return false; }
  stats.relDay[k]++; B.lastGym = dayN; stats.hygiene = Math.max(0, (stats.hygiene ?? 80) - 8); // sweaty
  if (kind === 'cardio') B.fat = clamp(B.fat - 0.012 - score * 0.0008, 0, 1);
  else { B.muscle = clamp(B.muscle + Math.min(0.035, 0.008 + score * 0.0012) * (1 - B.muscle * 0.5), 0, 1); B.fat = clamp(B.fat - 0.004, 0, 1); }
  bodyCheck(); return true;
}
const gymMember = () => (stats.gymUntil || 0) > dayN;
function newDay() {
  if (life().flags?.bakery_friend && Math.random() < 0.6) { stats.groceries = (stats.groceries || 0) + 1; setTimeout(() => subs.note('food', 'Fresh bread', 'A bag from the bakery on Main is on your doorstep. On the house. (+1 meal)', { color: '#c98b5e' }), 4000); }
  dayN++;
  { const B = body(); if (dayN - (B.lastGym || 0) > 3) B.muscle = clamp(B.muscle - 0.01, 0, 1); bodyCheck(); }
  if (stats.gymUntil && dayN >= stats.gymUntil && stats.gymAuto) { if (money >= 120) { spend(120); stats.gymUntil = dayN + 30; setTimeout(() => toast('Iron Temple membership renewed: $120 for 30 days.', 3), 1500); } else { stats.gymAuto = false; setTimeout(() => toast('Your Iron Temple membership lapsed. Not enough money to renew.', 3), 1500); } }
  const inc = PROPERTIES.filter(p => owned.has(p.id) && propMode(p.id) === 'rent').reduce((a, p) => a + p.income, 0);
  famNewDay(); bizNewDay();
  if (inc) { money += inc; floatMoney(inc); toast(`New day · property income +${fmt(inc)}`, 3.5); } else toast('New day · dealer prices changed', 3);
  phoneBadge++;
}
function step(dt) { lastDt = dt;
  time += dt; WATER_U.uTime.value = time; WIND_U.uWind.value = time;
  const before = clockH, dh = SANDBOX ? 0 : dt / 30; clockH += dh; if (clockH >= 24) clockH -= 24;
  if (before < 6 && clockH >= 6) newDay();
  if (!SANDBOX) updateNeeds(dh, dt);
  updateHealth(dt);
  action = findAction();
  if (woo) { for (const k of ['a', 'b', 'x', 'y']) input.consume(k); if (ride) { ride.s.v = 0; updateVehicles(dt); } updateWoo(dt); } else if (ride) { updateVehicles(dt); if (ride) { P.x = ride.s.x; P.z = ride.s.z; } } else if (carAnim) { updateCarAnim(dt); updateVehicles(dt); } else if (dance) { updateDance(dt); } else if (trainRide) { updateVehicles(dt); heroRoot.position.set(P.x, P.y, P.z); if (input.consume('a')) { if (action?.kind === 'trainoff') leaveTrain(); else if (action?.kind === 'metrooff') leaveMetro(); } input.consume('b'); input.consume('x'); input.consume('y'); } else { updateFoot(dt); if (!inside) updateVehicles(dt); }
  if (SANDBOX && !inside) { const f = focusPos(); peds.update(dt, f.x, f.z, null, false); updateAngry(dt); }
  else if (!inside) {
    updateTraffic(dt); updateTrafficLights(dt); updateTwoWheelers(dt); updateOnline(dt);
    const f = focusPos(), nc = cityNear(f.x, f.z, 30), nb = f.z > sandLine(f.x) - 60 && f.x > -330;
    peds.update(dt, f.x, f.z, nc, nb);
    animals ||= new Animals(dyn, peds, (x, z) => baseY(x, z));
    animals.update(dt, f.x, f.z, clockH, { x: f.x, z: f.z, car: !!ride && Math.abs(ride.s.v) > 2, run: !ride && input.stick.m > 0.85 }, false);
    updateAngry(dt); updateStreetEvents(dt); updateGangs(dt); updateHills(); updateLandmarks(dt);
    updateNpcList(npcs, dt); updateFlyer(dt);
  } else { updateHomeLife(dt); updateNpcList(inside.npcs, dt); inside.h.seeThrough?.(P.x, P.z, P.y); if (inside.id === 'prison') { peds.update(dt, P.x, P.z, null, false); updateAngry(dt); updateBrawl(dt); if (inside.h.upper?.length) { const o = P.y < 2 ? 0.16 : 1; if (inside.fadeO !== o) { inside.fadeO = o; inside.h.fadeUpper(o); } } } }
  updateChatter(dt); subs.update(dt); updateStory(dt); updatePromises(); updateDelivery(dt);
  if (!SANDBOX) updateAmbientBoats(dt); cloudTick(dt); lifeTick(dt); updateDate(dt); updateBuddy(dt); famTexts(dt); updateFx(dt); updatePolice(dt); updatePrison(dt); updateFarm(dt); updateTrain(dt); updateMetro(dt); if (!inside) updateEmergency(dt);
  updateBullets(dt); updateProjectiles(dt); updateParticles(dt); updateCash(dt); updateMarkers(); updateRace(dt); updateRoute(dt); updateCustomers(dt); updateReacts(dt); updateDoors(dt); updateJob(dt); fareBtnTick();
  if (input.consume('map') || input.consume('pause')) openPhone('maps');
  input.mode = ride ? 'car' : 'foot'; input.consume('slot');
  for (let i = 1; i <= 9; i++) if (input.keys.has('Digit' + i)) { input.keys.delete('Digit' + i); if (SLOTS[i - 1] && arsenal.owned.includes(SLOTS[i - 1].id)) selectWeapon(SLOTS[i - 1].id); }
  if (input.consume('phone')) openPhone();
  if (input.consume('wheel')) { const own = SLOTS.filter(q => arsenal.owned.includes(q.id)), i = own.findIndex(q => q.id === arsenal.cur); if (own.length) { selectWeapon(own[(i + 1) % own.length].id); sfx.equip?.(); } } // Q: next weapon
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
function setState(s) { if (s === 'talk') subs.stop(); if (s !== 'play') setTimeout(stackTabs, 60); /* a conversation replaces what's on screen; other screens just pause the queue */
  state = s;
  show('custom', CUSTOM_STATES.includes(s));
  show('hud', s === 'play' || s === 'ui' || s === 'phone'); show('pad', s === 'play'); $('sbBtn')?.classList.toggle('hidden', s !== 'play'); if (s !== 'play') $('fareBtn')?.classList.add('hidden');
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
const MOD_PRICES = { engine: { eco: 0, stock: 200, sport: 3000, race: 8000, rocket: 20000 }, tyres: { slick: 1500, runflat: 1800 }, turbo: { none: 0, street: 2500, big: 6000, twin: 12000 }, gearbox: { stock: 0, sport: 1800, race: 5000 }, brakes: { stock: 0, sport: 1200, race: 4000 }, weight: { stock: 0, stripped: 900, carbon: 6500 }, nitro: { none: 0, small: 3500, big: 8000 }, armour: { none: 0, light: 5000, heavy: 14000 }, glass: { stock: 0, bulletproof: 9000 }, ram: { none: 0, bars: 2200 }, spoiler: { gt: 1500, wing: 900 }, finish: { carbon: 2000, chrome: 2500 } };
const MOD_BASE = { smokeColor: 300, horn: 250, tyres: 600, wheels: 900, wheelSize: 500, suspension: 700, front: 400, rear: 400, skirts: 400, spoiler: 600, hood: 500, roof: 300, exhaust: 400, finish: 800, bodyColor: 500, accentColor: 200, decal: 300, tint: 200, rimColor: 150, headlights: 100, underglow: 600, glowColor: 100 };
function modPrice(k, v) { return MOD_PRICES[k]?.[v] ?? MOD_BASE[k] ?? 0; }
function shopPrice() {
  if (!shop) return 0;
  if (shop.kind === 'gun') { let t = shop.newGun ? SLOT[shop.slot].price : 0; for (const k of Object.keys(pvGunCfg)) if (pvGunCfg[k] !== shop.orig[k]) t += SMITH_PRICES[k] ?? 100; return t; }
  if (shop.kind === 'mods') { let t = 0; for (const k of Object.keys(carCfg)) if (carCfg[k] !== shop.orig[k]) t += modPrice(k, carCfg[k]); return Math.round(t * (hasDegree('mechanics') ? 0.8 : 1)); }
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
  if (kind === 'car') { shop = { kind: 'mods', orig: { ...carCfg } }; $('customTitle').textContent = 'Bay Customs'; $('randBtn').classList.add('buy'); }
  const get = () => kind === 'car' ? carCfg : charCfg;
  const schema = kind === 'car' ? S.map(t => ({ ...t, items: t.items.filter(i => i.key !== 'body').map(i => i.key === 'roof' ? { ...i, options: i.options.filter(o => !['taxi', 'police'].includes(o[0])) } : i).map(i => i.type !== 'choice' || !CAR_PARTS[i.key] ? i : { ...i, onLocked: val => rarePartJob(i.key, val), decorate: val => { const e = carPartEffects(i.key, val), rk = i.key + '.' + val, lock = RARE_PARTS[rk] && !(stats.rareParts || []).includes(rk) && shop?.orig?.[i.key] !== val; return { lock: lock ? 1 : 0, lockText: lock ? 'Rare part: tap for the job' : null, fx: e.fx, note: !e.fx.length ? (e.perk || (['engine', 'turbo', 'gearbox', 'brakes', 'weight', 'nitro', 'armour', 'glass', 'ram', 'tyres', 'suspension'].includes(i.key) ? 'Standard' : 'Looks only')) : null, price: shop?.orig?.[i.key] === val ? 'Fitted' : fmt(Math.round(modPrice(i.key, val) * (hasDegree('mechanics') ? 0.8 : 1))) }; } }) })) : S;
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
// Call of Duty style gunsmith: spin the gun, every attachment shows what it does, better parts unlock as you level the gun up
const PART_KEYS = ['barrel', 'muzzle', 'stock', 'grip', 'magazine', 'sight', 'under', 'ammo'];
function partUnlock(slot, key, val) {
  if (GUN_SKILL_SLOTS.includes(slot) && key === 'finish') { const i = Object.keys(PARTS.finish).indexOf(val); const need = i < 6 ? 1 : i < 10 ? 3 : Math.min(12, 4 + (i - 10) * 2); return lvl('gun_' + slot) >= need || shop?.orig?.finish === val ? 0 : need; }
  if (!GUN_SKILL_SLOTS.includes(slot) || !PART_KEYS.includes(key)) return 0;
  const i = Object.keys(PARTS[key]).indexOf(val); const need = i < 2 ? 1 : Math.min(12, 2 + (i - 2) * 2);
  return lvl('gun_' + slot) >= need || shop?.orig?.[key] === val ? 0 : need;
}
function smithSchemaRich(slot) {
  return smithSchema(slot).map(t => ({ ...t, items: t.items.map(it => {
    if (it.type !== 'choice' || !(PART_KEYS.includes(it.key) || it.key === 'finish' || it.key === 'charm')) return it;
    return { ...it, decorate: val => { const lock = partUnlock(slot, it.key, val), perk = partPerk(val), fx = it.key === 'finish' || it.key === 'charm' ? [] : partEffects(it.key, val);
      return { fx, note: !fx.length ? (perk || (it.key === 'finish' || it.key === 'charm' ? 'Cosmetic' : 'Balanced')) : null, lock, price: shop?.orig?.[it.key] === val ? 'Fitted' : fmt(SMITH_PRICES[it.key] ?? 100) }; },
      onLocked: (val, need) => { sfx.fail?.(); toast(`${PARTS[it.key]?.[val]?.label || val} unlocks at ${SLOT[slot].name} level ${need}. Get kills or train at the range.`, 3); } };
  }) }));
}
// rare car parts: the mechanic can't just order them in; you go and get one, then it's in the catalogue for good
const RARE_PARTS = { 'turbo.twin': ['A twin-turbo kit? Only place you\'ll find one is off a wrecked import. Lucky\'s chop shop had one come in. Go and get it.', 'chop'], 'nitro.big': ['Twin nitrous bottles... a racer at the start line owes me. Go collect them from the race gantry.', 'race'], 'armour.heavy': ['Heavy plating? There\'s an ex-security van rusting at the docks. Strip the armour off it.', 'docks'], 'glass.bulletproof': ['Bulletproof glass, legit? There\'s a guy at the Anchor Bar who can "find" some. Go see him.', 'bar'], 'engine.rocket': ['The Rocket engine? Only one guy builds them, out at the airport hangars. Go and pick one up.', 'airport'] };
function rarePartJob(key, val) {
  const rk = key + '.' + val, R = RARE_PARTS[rk]; if (!R) return;
  if ((life().errands || []).some(e => e.key === 'rare_part' && e.data.rk === rk)) { toast('You\'re already on that job. Check your map.', 2.4); return; }
  subs.note('wrench', 'Bay Customs', R[0], { dur: 6, pri: 3 });
  const where = R[1] === 'docks' ? null : R[1] === 'airport' ? null : (PLACES.find(p => p.kind === R[1] || p.id === R[1] || p.interior === R[1])?.id || 'random');
  if (where) lifeApi().errand(where, 'rare_part', { rk }, 'Pick up the rare part'); else { const at = R[1] === 'docks' ? { x: 620, z: 300 } : { x: 140, z: -670 }; (life().errands ||= []).push({ key: 'rare_part', x: at.x, z: at.z, label: 'Pick up the rare part', data: { rk }, until: gameHours() + 30 }); setWaypoint(at.x, at.z, 'Pick up the rare part'); }
}
ARRIVE.rare_part = (a, d) => { (stats.rareParts ||= []).push(d.rk); const [k, v] = d.rk.split('.'); logStory('Bay Customs', `Fetched a rare part: ${CAR_PARTS[k][v].label}`, 'Now in the catalogue at Bay Customs.', 'rare'); return `Got it: ${CAR_PARTS[k][v].label}. Take your car to Bay Customs to have it fitted.`; };
// blueprints: save up to three builds per gun and load one back (you only pay for the parts that change)
function renderBlueprints(slot) {
  const BP = (stats.blueprints ||= {})[slot] ||= [], el = $('presets');
  el.innerHTML = BP.map((b, i) => `<button data-bp="${i}">${svg('gun', 'sm')} ${b.name}</button>`).join('') + (BP.length < 3 ? `<button data-bpsave="1">${svg('plus', 'sm')} Save as blueprint</button>` : '');
  el.querySelectorAll('[data-bp]').forEach(b => b.onclick = () => { pvGunCfg = { ...BP[+b.dataset.bp].cfg }; pv.dirty = true; gunStatsPanel(); if (armory) armoryDraw(); else panel.refresh(); updateShopPrice(); sfx.click(); });
  el.querySelectorAll('[data-bpsave]').forEach(b => b.onclick = () => { BP.push({ name: (pvGunCfg.name || SLOT[slot].name).slice(0, 14) + ' ' + (BP.length + 1), cfg: { ...pvGunCfg } }); saveGame(); renderBlueprints(slot); toast('Blueprint saved.', 1.6); });
}
function openGunsmith(slot, place, newGun = false) {
  const cfg0 = arsenal.cfg[slot] || { ...DEFAULT_CFGS[slot] };
  shop = { kind: 'gun', slot, place, newGun, orig: { ...cfg0 } };
  pvGunCfg = { ...cfg0 }; previewCfg = null;
  setState('gun');
  $('customTitle').textContent = `${newGun ? 'Try out · ' : ''}${SLOT[slot].name} · ${GUN_SKILL_SLOTS.includes(slot) ? `Lvl ${lvl('gun_' + slot)}` : place.name}`; $('randBtn').classList.add('buy');
  renderBlueprints(slot);
  panel = buildPanel({ tabsEl: $('tabs'), contentEl: $('content'), schema: smithSchemaRich(slot), getCfg: () => pvGunCfg, onChange: (k, v) => { pvGunCfg[k] = v; if (k === 'receiver') { pvGunCfg.fireMode = RECEIVERS[v].mode; panel.refresh(); } pv.dirty = true; gunStatsPanel(); updateShopPrice(); } });
  pv.dirty = true; gunStatsPanel(); updateShopPrice();
}
function stackTabs() { requestAnimationFrame(() => { const h = $('stats').offsetHeight; $('tabs').style.top = h ? (h - 10) + 'px' : ''; }); } // tabs stick just under the pinned stats
function gunStatsPanel() {
  const s = computeStats(pvGunCfg), s0 = computeStats(shop?.orig || pvGunCfg), dd = Math.round(s.dps - s0.dps);
  const notes = [`DPS <b>${Math.round(s.dps)}</b>${dd ? ` <b style="color:${dd > 0 ? '#5cf08a' : '#ff6b78'}">${dd > 0 ? '+' : ''}${dd}</b>` : ''}`, { semi: 'Semi-auto', burst: '3-round burst', auto: 'Full auto' }[s.mode]];
  if (s.pellets > 1) notes.push(`${s.pellets} pellets`); notes.push(PARTS.ammo[s.ammo].label); if (s.quiet) notes.push('Suppressed');
  stackTabs(); renderStats($('stats'), statBars(s), notes.join(' · ') + (shop?.newGun ? ` · gun ${fmt(SLOT[shop.slot].price)} + parts` : ' · drag the gun to spin it'), statBars(s0));
}
function updateShopPrice() { const p = shopPrice(); $('randBtn').textContent = p ? `Buy ${fmt(p)}` : 'Buy'; $('randBtn').disabled = !p; }
function changed() {
  store.set('rr_char', stats.jail?.outfit || stats.escaped || charCfg); store.set('bc_cars', garage);
  pv.dirty = true;
  if (state === 'car') { stackTabs(); const cs = computeCarStats(carCfg), c0 = shop?.orig ? computeCarStats(shop.orig) : cs, k1 = carClass(cs), k0 = carClass(c0); renderStats($('stats'), carStatBars(cs), `Class <b class="cls cls${k1}">${k1}</b>${k1 !== k0 ? ` <small>was ${k0}</small>` : ''}${cs.nitro ? ' · Nitro' : ''}${cs.bp ? ' · Bulletproof' : ''}${cs.runflat ? ' · Run-flats' : ''} · Back cancels unpaid changes`, carStatBars(c0)); updateShopPrice(); }
  else if (state === 'char') { stackTabs(); } if (state === 'char') $('stats').innerHTML = `<div class="statx">Body and face are free. Visit barbers for hair and clothing stores for outfits.</div>`;
}
$('backBtn').onclick = () => {
  if (armory?.view === 'gun' && state === 'gun') { pvGunCfg = { ...shop.orig }; armoryList(); return; }
  if (armory) { $('randBtn').classList.remove('hidden'); armory = null; pvWeapon = null; document.body.classList.remove('armory'); }
  const wasCar = state === 'car';
  if (shop?.kind === 'mods') { for (const k of Object.keys(carCfg)) if (!(k in shop.orig)) delete carCfg[k]; Object.assign(carCfg, shop.orig); store.set('bc_cars', garage); }
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
    if (shop.kind === 'gun') { const nw = shop.newGun; arsenal.cfg[shop.slot] = { ...pvGunCfg }; shop.orig = { ...pvGunCfg }; if (nw) { shop.newGun = false; if (!arsenal.owned.includes(shop.slot)) arsenal.owned.push(shop.slot); const st = slotStats(shop.slot, pvGunCfg); arsenal.ammo[shop.slot] = { mag: st.mag || 0, res: (st.mag || 0) * 3 }; $('customTitle').textContent = `${SLOT[shop.slot].name} · Lvl ${lvl('gun_' + shop.slot)}`; } saveGame(); toast(nw ? `${pvGunCfg.name || SLOT[shop.slot].name} is yours. Built your way.` : 'Work done. Looks mean.'); sfx.coin(); gunStatsPanel(); if (armory) armoryDraw(); else panel.refresh(); updateShopPrice(); return; }
    if (shop.kind === 'mods') { shop.orig = { ...carCfg }; store.set('bc_cars', garage); saveGame(); gainXP('driving', Math.round(price / 200)); toast('Bay Customs: work done. She looks great.'); sfx.coin(); updateShopPrice(); return; }
    if (shop.kind === 'carshop') { garage.cars.push({ ...DEFAULT_CAR, ...pvCarCfg }); garage.active = garage.cars.length - 1; store.set('bc_cars', garage); bumpRel(shop.relId, 10, false); if (ride === myCar) exitCar(); rebuildMyCar({ x: inside.back.x, z: inside.back.z, h: 0 }); pendingCar = true; toast(`You bought a ${BODIES[pvCarCfg.body].label}! It'll be outside.`, 3); feed({ mood: 25 }); return; }
    if (stats.escaped) { stats.escaped = null; toast('Jumpsuit in the bin. Nobody will recognise you now.', 3); }
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
  radioTick(); // music keeps playing in menus, the phone and conversations
  const rdt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play') {
    const dt = rdt * timeScale;
    step(dt);
    if (!inside && !SANDBOX) updateChunks(P.x, P.z, ride ? 3 : 2);
    applyTime(SANDBOX ? SB.h : clockH, P.x, P.z); if (SANDBOX) sbFrame(); updateCamera(dt); updateWeather(dt); updateHUD(rdt); updateAmbience(); updateAmbient(rdt); updatePet(rdt);
    renderer.render(G.scene, G.cam);
  } else if (state === 'talk') { talk.update(rdt); talk.render(renderer); }
  else if (state === 'phone' || state === 'ui') { if (state === 'ui') updateHUD(rdt); renderer.render(G.scene, G.cam); }
  else if (state === 'mini') { /* minigame overlay owns the screen */ }
  else if (state === 'title') { titleCam(rdt); renderer.render(G.scene, G.cam); }
  else { ptime += rdt; updatePreview(rdt, ptime); renderer.render(pv.scene, pv.cam); }
}
startGame();
if (SANDBOX) sandboxInit();
labBadge(); if (signedIn()) checkAdmin();
if (titleUp) showTitle();
requestAnimationFrame(frame);
{ const B = $('boot'); if (B) { clearInterval(window.__boot); const bar = $('btBar'); if (bar) bar.style.width = '100%'; setTimeout(() => { B.classList.add('out'); setTimeout(() => B.remove(), 800); }, 450); } } // the loading sign hands over to the title fly-over
window.__game = { get markersT() { return markers; }, get animals() { return animals; }, crime, WANT, copCars, cops, pitFight, busted, fam, famNewDay, makeOfficial, talkFamily, get dayN() { return dayN; }, set dayN(v) { dayN = v; }, scene: G.scene, cam: G.cam, snap: () => updateCamera(0, true), get state() { return state; }, P, input, get ride() { return ride; }, get myCar() { return myCar; }, get traffic() { return traffic; }, peds, setTime: h => { clockH = h; }, openCustom, enterVehicle, exitCar, get money() { return money; }, set money(v) { money = v; }, openPlace, PLACES, PROPERTIES, runMinigame, get action() { return action; }, arsenal, selectWeapon, openPhone, setWaypoint, get route() { return route; }, talkToPed, talk, doAction, stats, get inside() { return inside; }, enterInterior, exitInterior, get customers() { return customers; }, newCustomer, startEdit, endEdit, get job() { return job; }, gainXP, storage, doSpot, useFurn, phoneGo, talkVenue, talkJob, openPlace, talkCustomer, startJob, openCarShop, damageCar, repairCar, addFire, get fires() { return fires; }, get ems() { return ems; }, get vehicles() { return vehicles; }, makeVehicle, makeCop, prisonFight, life, startDealMeet, get lifeAct() { return lifeAct; }, get train() { return train; }, get trainRide() { return trainRide; }, boardTrain, eventReset: () => { eventOpen = false; }, bodyCheck, attendClass, talkAdmissions, edu, startDance, get dance() { return dance; }, radioSet: i => { radioSet(i); radioOn(true); }, get zoom() { return zoom; }, set zoom(z) { zoom = z; }, DEFAULT_CAR, setState: x => setState(x), get jail() { return stats.jail; }, witness, personOf, dealHeat, trafficStop, carNear, carTop, startDate, playCutT: (k, o) => { setState("mini"); return playCut(k, o || {}).then(r => { setState("play"); window.__cutR = r; return r; }); }, payPhoneT: () => payPhone(), get metro() { return metro; }, METRO, boardMetroT: i => { metro.si = i; metro.stop = 8; metro.s = METRO.stations[i].s; boardMetro(i); }, unblockT: (id, f) => unblockDoors(id, f), get HD() { return HOME_DEFAULTS; }, smashT: () => { const cx = Math.floor(P.x / CHUNK), cz = Math.floor(P.z / CHUNK); let b = null, bd = 1e9; for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (const q of parkedIn(cx + i, cz + j)) { const d = Math.hypot(q.x - P.x, q.z - P.z); if (!q.taken && d < bd) { bd = d; b = q; } } if (!b) return "none"; P.x = b.x + Math.cos(b.rot) * 1.8; P.z = b.z - Math.sin(b.rot) * 1.8; breakIntoParked(b); return "ok"; }, gymT: o => mini("gym", o || {}), openArmoryT: () => openArmory(PLACES.find(q => q.kind === "guns"), null), get rinfo() { return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures }; }, saveGameT: () => saveGame(), maybePregnantT: (id, t) => maybePregnant(id, t), miniT: (k, o) => mini(k, o || {}), carCallT: (body, phone = true) => { if (talk.active) talk.end(); talk.nextCar = buildCar({ ...DEFAULT_CAR, ...(CAR_PRESETS[body] || { body }) }); beginTalk(npcCfg('sales', 99), 'Test caller', body, 160, null, null, null, false, true, phone); talk.say('Testing the car call.'); }, probeT: (x, z) => ({ y: baseY(x, z), w: walkable(x, z), sky: !!skyAt(x, z), sol: !!solidPoint(x, z, 1), city: cityAt(x, z, 0)?.id || null }), labStartT: () => labStart(), labRunT: id => labRun(EVENT_BY_ID[id]), labOnT: () => labOn(), msgsT: () => messages().map(m => m.from + ": " + m.text.slice(0, 50)), deliverT: id => deliverEvent(EVENT_BY_ID[id], {}), runEventT: (id, d) => runEventTalk(EVENT_BY_ID[id], d || {}, { name: 'Tester', tag: 'Test', cfg: null }, null), get pet() { return pet; }, CIT: () => CIT(), citizenRecord: c => citizenRecord(c), get town() { return town(); }, get ownedT() { return owned; }, openGunsmithT: (s, p, n) => openGunsmith(s, p, n), ambient, get ambEl() { return ambEl; }, openTradeT: p => openTrade(p), get stashT() { return stash; }, startWooT: (k, b) => startWoo(k, b), get woo() { return woo; }, endDate, dateCall, addDateContact, get phoneThread() { return phoneThread; }, set phoneThread(v) { phoneThread = v; }, talkDate, get date() { return date; }, get carAnim() { return carAnim; }, lifeApi, startShower, bizNewDay, subs, forceWanted, get buddy() { return buddy; }, startBuddy, textMe, toast, levelUp, closePhone, bringCar, useFurn, damageCar, debtorScene, get debtor() { return debtor; }, camBlocked, get camYaw() { return camYaw; }, ev: { evChase, evMug, evRobbery, evGang, evBusk, evCrash, evFire, evMarket, evParade, evProtest, streetEvents } };

// ================================================================ install as an app (Add to Home Screen)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
{ const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone, ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let deferred = null; const seen = () => { try { return localStorage.getItem('bc_a2hs'); } catch (e) { return '1'; } }, mark = v => { try { localStorage.setItem('bc_a2hs', v); } catch (e) {} };
  const card = (html, btns) => { const el = document.createElement('div'); el.id = 'a2hs'; el.innerHTML = `<img src="icon-180.png" alt=""><div><b>Play Bay City like an app</b><span>${html}</span></div>${btns}`; document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('on')); return el; };
  const close = el => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); };
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  if (!standalone && !seen() && !location.search.includes('test')) setTimeout(() => {
    if (state !== 'play') return;
    if (deferred) { const el = card('Full screen, its own icon, opens straight into the game.', '<button class="pill hot" data-i>Install</button><button class="pill" data-x>Later</button>'); el.querySelector('[data-i]').onclick = async () => { deferred.prompt(); await deferred.userChoice.catch(() => {}); mark('1'); close(el); }; el.querySelector('[data-x]').onclick = () => { mark('later'); close(el); }; }
    else if (ios) { const el = card('Tap <b>Share</b> <svg viewBox="0 0 24 24" class="ish"><path d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8"/></svg> at the bottom of Safari, then <b>Add to Home Screen</b>.', '<button class="pill" data-x>Got it</button>'); el.querySelector('[data-x]').onclick = () => { mark('1'); close(el); }; }
  }, 25000);
}

// ================================================================ online play hookup
function myNetName() { try { return localStorage.getItem('bc_name') || 'Player'; } catch (e) { return 'Player'; } }
{ let lastCfg = '', lastRide = null;
  initOnline({ dyn, buildCharacter, buildCar, poseCharacter, toast, myName: myNetName, charCfg: () => charCfg,
    state: () => { const f = ride ? ride.s : P, ck = JSON.stringify(charCfg), cfgChanged = ck !== lastCfg, rideChanged = ride !== lastRide; lastCfg = ck; lastRide = ride;
      return { x: f.x, y: ride ? (ride.s.y || 0) : P.y, z: f.z, face: ride ? ride.s.h : P.face, speed: ride ? Math.abs(ride.s.v) : Math.hypot(P.kx || 0, P.kz || 0) || (input.stick.m * 5), ride: ride && !ride.b.two ? ride : ride, inside: !!inside, cfgChanged, rideChanged }; } });
  onNet(() => { if (state === 'phone' && phoneApp === 'online') renderPhone(); }); }
