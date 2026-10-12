import * as THREE from '../lib/three.module.min.js';
import { buildCharacter, poseCharacter, disposeObject, DEFAULT_CHAR, CHAR_SCHEMA, randomChar } from './character.js';
import { buildGun, computeStats, statBars, DEFAULT_GUN, GUN_SCHEMA, GUN_PRESETS, RECEIVERS, PARTS, randomGun } from './gun.js';
import { buildCar, computeCarStats, carStatBars, DEFAULT_CAR, CAR_SCHEMA, CAR_PRESETS, CAR_PARTS, randomCar, trafficCar } from './car.js';
import { WORLD, CHUNK, CITIES, MATS, WATER_Y, SPAWN, LABELS, buildChunk, parkedIn, resolve, walkable, onPier, roadAt, cityAt, zoneName, groundH, solidPoint, drawMap, sandLine } from './world.js';
import { buildPanel, renderStats } from './ui.js';
import { Input } from './input.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wrapA = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const DEG = Math.PI / 180;

// ================================================================ renderer
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
let gunCfg = { ...DEFAULT_GUN, ...store.get('rr_gun', {}) };
let carCfg = { ...DEFAULT_CAR, ...store.get('bc_car', {}) };
let save = store.get('bc_save', null);

function gradientTex(stops) {
  const cv = document.createElement('canvas'); cv.width = 4; cv.height = 256;
  const x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  stops.forEach(([p, c]) => g.addColorStop(p, c)); x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,230,160,.85)'); g.addColorStop(1, 'rgba(255,140,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
const flareTex = glowTex();

// Bake a built group into one vertex-coloured geometry (cheap to draw lots of).
const bakedMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.35, flatShading: true });
function bakeGroup(group) {
  group.updateMatrixWorld(true);
  const Pp = [], N = [], Cc = [], nm = new THREE.Matrix3(), c = new THREE.Color(), v = new THREE.Vector3();
  group.traverse(m => {
    if (!m.isMesh || m.material.blending === THREE.AdditiveBlending) return;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    const p = g.attributes.position, n = g.attributes.normal;
    nm.getNormalMatrix(m.matrixWorld);
    c.copy(m.material.color);
    if (m.material.map) c.set('#6b6b6b');
    if (m.material.emissive && m.material.emissiveIntensity > 0.3) c.lerp(m.material.emissive, 0.6);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld); Pp.push(v.x, v.y, v.z);
      v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z);
      Cc.push(c.r, c.g, c.b);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(Pp, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  g.computeBoundingSphere();
  return g;
}
const carLib = [];
function ensureCarLib() {
  if (carLib.length) return;
  let s = 12345; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 14; i++) {
    const car = buildCar(trafficCar(r));
    carLib.push({ geo: bakeGroup(car.group), len: car.length, wid: car.width });
    disposeObject(car.group);
  }
}

// ================================================================ see-through fade
// Anything between the camera and the player is dithered out so you're never hidden behind a building.
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
        if (t > 0.01 && d < rad) {
          vec2 g = floor(gl_FragCoord.xy * 0.5);
          if (d < rad - 1.5 || mod(g.x + g.y, 2.0) < 1.0) discard;
        }
      }`);
  };
  mat.needsUpdate = true;
}
addFade(MATS.solid); addFade(MATS.win); addFade(MATS.glow);

// ================================================================ PREVIEW (menus)
const pv = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(35, 1, 0.05, 200), turn: new THREE.Group(), gunStand: new THREE.Group(), carStand: new THREE.Group(), rot: -0.5, vel: 0, dirty: true, focus: new THREE.Vector3(0, 1, 0), dist: 6 };
pv.scene.background = gradientTex([[0, '#1d2547'], [0.6, '#3b3a68'], [1, '#6a4a76']]);
pv.scene.add(new THREE.HemisphereLight('#ffe8cc', '#2a2440', 1.4));
{
  const d = new THREE.DirectionalLight('#fff1e0', 2.2); d.position.set(3, 7, 5); d.castShadow = true;
  d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -4, right: 4, top: 4, bottom: -3 }); pv.scene.add(d);
  const rim = new THREE.DirectionalLight('#7aa8ff', 1.1); rim.position.set(-4, 3, -4); pv.scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.5, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#2a2a48', roughness: 0.9 }));
  floor.position.y = -0.06; floor.receiveShadow = true; pv.scene.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.45, 0.025, 6, 80), new THREE.MeshBasicMaterial({ color: '#ff8a2a' })); ring.rotation.x = Math.PI / 2; pv.scene.add(ring);
}
pv.scene.add(pv.turn, pv.gunStand, pv.carStand);
function rebuildPreview() {
  if (pv.char) { pv.turn.remove(pv.char.root); disposeObject(pv.char.root); }
  if (pv.gunView) { pv.gunStand.remove(pv.gunView.group); disposeObject(pv.gunView.group); }
  if (pv.car) { pv.carStand.remove(pv.car.group); disposeObject(pv.car.group); }
  pv.char = buildCharacter(charCfg);
  pv.gun = buildGun(gunCfg); pv.gun.group.rotation.x = Math.PI / 2; pv.char.hand.add(pv.gun.group);
  pv.turn.add(pv.char.root);
  pv.gunView = buildGun(gunCfg); pv.gunView.group.position.copy(pv.gunView.center).multiplyScalar(-1); pv.gunStand.add(pv.gunView.group);
  pv.car = buildCar(carCfg); pv.carStand.add(pv.car.group);
  pv.dirty = false;
}
let previewMode = 'menu';
function previewLayout() {
  const c = pv.cam; c.aspect = W / H; c.clearViewOffset();
  c.setViewOffset(W, H, 0, previewMode === 'menu' ? H * 0.12 : H * 0.24, W, H);
  c.updateProjectionMatrix();
}
function updatePreview(dt, t) {
  if (pv.dirty) rebuildPreview();
  const m = previewMode;
  if (!dragging) { pv.rot += pv.vel * dt; pv.vel = damp(pv.vel, m === 'menu' ? 0.3 : 0, 2, dt); }
  pv.gunStand.visible = m === 'gun';
  pv.turn.visible = m === 'menu' || m === 'char';
  pv.carStand.visible = m === 'menu' || m === 'car';
  const aspect = W / H, h = pv.char.height;
  let focus, dist;
  if (m === 'gun') {
    pv.gunStand.position.set(0, 1.2, 0); pv.gunStand.rotation.set(0.12, pv.rot + Math.PI / 2 + 0.45, 0);
    const L = pv.gunView.length + 0.15; dist = clamp(L * 1.25 / (0.63 * aspect), 1, 8); focus = new THREE.Vector3(0, 1.2, 0);
  } else if (m === 'car') {
    pv.carStand.position.set(0, 0, 0); pv.carStand.rotation.y = pv.rot + 0.6;
    const L = pv.car.length + 0.6; dist = clamp(L * 1.05 / (0.63 * aspect), 4, 24); focus = new THREE.Vector3(0, 0.7, 0);
  } else if (m === 'char') {
    pv.turn.position.set(0, 0, 0); pv.turn.rotation.y = pv.rot;
    poseCharacter(pv.char, { t, aim: -0.15, speed: 0 });
    dist = 9.5 * (h / 1.9); focus = new THREE.Vector3(0, h * 0.52, 0);
  } else {
    pv.turn.position.set(-1.3, 0, 1.4); pv.turn.rotation.y = 0.45;
    pv.carStand.position.set(0.9, 0, -0.8); pv.carStand.rotation.y = pv.rot;
    poseCharacter(pv.char, { t, aim: -0.45, speed: 0 });
    dist = 15; focus = new THREE.Vector3(0, 1.0, 0);
  }
  pv.focus.lerp(focus, 1 - Math.exp(-8 * dt)); pv.dist = damp(pv.dist, dist, 8, dt);
  pv.cam.position.set(pv.focus.x, pv.focus.y + pv.dist * 0.22, pv.focus.z + pv.dist);
  pv.cam.lookAt(pv.focus);
}
let dragging = false, dragX = 0;
canvas.addEventListener('pointerdown', e => { if (state !== 'play') { dragging = true; dragX = e.clientX; pv.vel = 0; } });
addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - dragX; dragX = e.clientX; pv.rot += dx * 0.012; pv.vel = dx * 0.6; });
addEventListener('pointerup', () => dragging = false);
addEventListener('pointercancel', () => dragging = false);

// ================================================================ GAME WORLD
const G = { scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(40, 1, 1, 600) };
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
const water = new THREE.Mesh(new THREE.PlaneGeometry(1600, 700), new THREE.MeshStandardMaterial({ color: '#3e94d4', roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.88 }));
water.rotation.x = -Math.PI / 2; water.position.set(120, WATER_Y, 700); water.receiveShadow = true; G.scene.add(water);
const world = new THREE.Group(); G.scene.add(world);
const dyn = new THREE.Group(); G.scene.add(dyn);

// ---------------- chunk streaming
const loaded = new Map();
let loadBudget = 2;
function updateChunks(px, pz, radius) {
  const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK);
  const want = [];
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
      const lib = carLib[Math.floor(p.seed * carLib.length)];
      const m = new THREE.Mesh(lib.geo, bakedMat); m.position.set(p.x, 0.17, p.z); m.rotation.y = p.rot; m.castShadow = true; g.add(m);
    }
    world.add(g); loaded.set(k, g);
  }
  for (const [k, g] of loaded) {
    const [cx, cz] = k.split(',').map(Number);
    if (Math.abs(cx - ccx) > radius + 1 || Math.abs(cz - ccz) > radius + 1) {
      world.remove(g); g.traverse(o => { if (o.isMesh && o.material !== bakedMat) o.geometry.dispose(); }); loaded.delete(k);
    }
  }
}

// ---------------- day / night
const KEYS = [
  [0, '#0c1330', '#46568f', '#14141f', 0.42, '#9fb4ff', 0.35, 1],
  [5, '#161a3c', '#535a8a', '#1c1c2a', 0.48, '#a6b4ff', 0.3, 1],
  [6.4, '#f2a27c', '#ffc9a2', '#4a3a40', 0.8, '#ffb070', 1.1, 0.5],
  [7.6, '#a8d8f0', '#e8f4ff', '#5a6a40', 1.15, '#fff0d8', 2.0, 0],
  [17, '#a8d8f0', '#e8f4ff', '#5a6a40', 1.15, '#fff0d8', 2.0, 0],
  [18.6, '#ff9c6c', '#ffc290', '#5a4040', 0.9, '#ff9a50', 1.35, 0.35],
  [19.8, '#4a2e6a', '#7a6aa0', '#2a2030', 0.6, '#c090ff', 0.45, 0.85],
  [21, '#0c1330', '#46568f', '#14141f', 0.42, '#9fb4ff', 0.35, 1],
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
  const day = h >= 6 && h < 18.5;
  const a = day ? (h - 6) / 12.5 * Math.PI : ((h + 5.5) % 24) / 11.5 * Math.PI;
  const elev = Math.max(0.4, Math.sin(a));
  sun.position.set(px + Math.cos(a) * 70, 90 * elev + 25, pz + 40);
  sun.target.position.set(px, 0, pz);
  MATS.win.emissiveIntensity = night * 1.1;
  MATS.glow.emissiveIntensity = 0.15 + night * 1.6;
  MATS.pool.opacity = night * 0.28;
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

// ---------------- audio (tiny synth, no files)
let actx = null;
function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { } } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
function sfxShot(quiet, energy) {
  const a = audio(); if (!a) return;
  const t = a.currentTime, g = a.createGain(); g.connect(a.destination);
  if (energy) { const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.15); o.connect(g); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); o.start(t); o.stop(t + 0.16); return; }
  const len = 0.12, buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const s = a.createBufferSource(); s.buffer = buf; const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = quiet ? 900 : 2600;
  s.connect(f); f.connect(g); g.gain.value = quiet ? 0.05 : 0.14; s.start(t);
}
function sfxHorn() {
  const a = audio(); if (!a) return; const t = a.currentTime, g = a.createGain(); g.connect(a.destination); g.gain.setValueAtTime(0.06, t); g.gain.setValueAtTime(0.06, t + 0.3); g.gain.linearRampToValueAtTime(0, t + 0.36);
  for (const f of [392, 494]) { const o = a.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 0.37); }
}
let engine = null;
function engineSound(on, speed) {
  const a = actx; if (!a) return;
  if (!engine) { const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 500; o.connect(f); f.connect(g); g.connect(a.destination); g.gain.value = 0; o.start(); engine = { o, g }; }
  engine.o.frequency.value = 40 + speed * 3.2;
  engine.g.gain.value = on ? 0.03 : 0;
}

// ---------------- player & car
const P = { x: SPAWN.x, z: SPAWN.z, y: 0, vy: 0, face: Math.PI, inCar: false, phase: 0, recoil: 0, fireCd: 0, burst: 0, burstT: 0, ammo: 0, reload: 0, flash: 0 };
let hero = null, heroGun = null, gunStats = null, heroRoot = null, muzzleFlash = null;
const carState = { x: SPAWN.carX, z: SPAWN.carZ, h: SPAWN.carH, v: 0, vx: 0, vz: 0, steer: 0, lights: true };
let car = null, carStats = null, headSpot = null, headTarget = null;

function buildHero() {
  if (heroRoot) { dyn.remove(heroRoot); disposeObject(heroRoot); }
  hero = buildCharacter(charCfg);
  heroGun = buildGun(gunCfg); heroGun.group.rotation.x = Math.PI / 2; hero.hand.add(heroGun.group);
  gunStats = computeStats(gunCfg);
  heroRoot = new THREE.Group(); heroRoot.add(hero.root); dyn.add(heroRoot);
  hero.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  P.ammo = gunStats.mag; P.reload = 0;
  if (!muzzleFlash) { muzzleFlash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); dyn.add(muzzleFlash); muzzleFlash.visible = false; }
}
function buildPlayerCar() {
  if (car) { dyn.remove(car.group); disposeObject(car.group); }
  car = buildCar(carCfg); carStats = computeCarStats(carCfg);
  dyn.add(car.group);
  if (!headSpot) { headSpot = new THREE.SpotLight('#fff4dd', 0, 45, 0.55, 0.6, 1.2); headTarget = new THREE.Object3D(); G.scene.add(headSpot, headTarget); headSpot.target = headTarget; }
  headSpot.color.set(carCfg.headlights);
}

// ---------------- traffic
const traffic = [];
function cityNear(x, z) { let best = null, bd = 1e9; for (const c of CITIES) { const dx = Math.max(c.x0 - x, 0, x - c.x1), dz = Math.max(c.z0 - z, 0, z - c.z1), d = Math.hypot(dx, dz); if (d < bd) { bd = d; best = c; } } return bd < 140 ? best : null; }
function trafficPose(t) {
  const fx = t.axis === 'x' ? t.dir : 0, fz = t.axis === 'z' ? t.dir : 0;
  t.fx = fx; t.fz = fz;
  t.x = (t.axis === 'x' ? t.pos : t.line) - fz * 3; t.z = (t.axis === 'z' ? t.pos : t.line) + fx * 3; // drive on the right
  t.h = Math.atan2(fx, fz);
}
function spawnTraffic(px, pz) {
  const c = cityNear(px, pz); if (!c) return;
  for (let tries = 0; tries < 14; tries++) {
    const ix = c.kx[0] + Math.floor(Math.random() * (c.kx[1] - c.kx[0] + 1)), iz = c.kz[0] + Math.floor(Math.random() * (c.kz[1] - c.kz[0] + 1));
    const nx = c.cx + ix * 48, nz = c.cz + iz * 48, d = Math.hypot(nx - px, nz - pz);
    if (d < 40 || d > 130) continue;
    const axis = Math.random() < 0.5 ? 'x' : 'z';
    const k = axis === 'x' ? ix : iz, range = axis === 'x' ? c.kx : c.kz;
    let dir = Math.random() < 0.5 ? 1 : -1;
    if (k + dir > range[1] || k + dir < range[0]) dir = -dir;
    ensureCarLib();
    const lib = carLib[Math.floor(Math.random() * carLib.length)];
    const mesh = new THREE.Mesh(lib.geo, bakedMat); mesh.castShadow = true; dyn.add(mesh);
    const t = { c, axis, line: axis === 'x' ? nz : nx, pos: axis === 'x' ? nx : nz, dir, next: (axis === 'x' ? nx : nz) + dir * 48, speed: 0, cruise: rand(8, 13), mesh, stun: 0, honk: 0 };
    trafficPose(t); t.rx = t.x; t.rz = t.z; t.rh = t.h;
    traffic.push(t); return;
  }
}
function updateTraffic(dt) {
  const ox = P.inCar ? carState.x : P.x, oz = P.inCar ? carState.z : P.z;
  const target = cityNear(ox, oz) ? 12 : 0;
  if (traffic.length < target) spawnTraffic(ox, oz);
  for (let i = traffic.length - 1; i >= 0; i--) {
    const t = traffic[i];
    if (Math.hypot(t.x - ox, t.z - oz) > 170) { dyn.remove(t.mesh); traffic.splice(i, 1); continue; }
    let block = false;
    const check = (x, z, rad) => { const dx = x - t.x, dz = z - t.z, al = dx * t.fx + dz * t.fz, lat = Math.abs(-dx * t.fz + dz * t.fx); if (al > 0 && al < 7 + t.speed * 0.4 && lat < rad) block = true; };
    check(ox, oz, P.inCar ? 2.6 : 1.8);
    for (const o of traffic) if (o !== t && o.axis === t.axis && o.dir === t.dir) check(o.x, o.z, 1.6);
    t.stun -= dt; t.honk -= dt;
    const want = block || t.stun > 0 ? 0 : t.cruise;
    t.speed = damp(t.speed, want, want < t.speed ? 6 : 1.2, dt);
    if (block && t.honk <= 0 && Math.random() < 0.01) { t.honk = 4; if (Math.hypot(t.x - ox, t.z - oz) < 30) sfxHorn(); }
    t.pos += t.dir * t.speed * dt;
    if ((t.dir > 0 && t.pos >= t.next) || (t.dir < 0 && t.pos <= t.next)) {
      const node = t.next, c = t.c;
      const idxAlong = Math.round((node - (t.axis === 'x' ? c.cx : c.cz)) / 48);
      const idxLine = Math.round((t.line - (t.axis === 'x' ? c.cz : c.cx)) / 48);
      const rA = t.axis === 'x' ? c.kx : c.kz, rL = t.axis === 'x' ? c.kz : c.kx;
      const opts = [];
      if (idxAlong + t.dir >= rA[0] && idxAlong + t.dir <= rA[1]) opts.push('s', 's');
      if (idxLine + 1 <= rL[1]) opts.push('+'); if (idxLine - 1 >= rL[0]) opts.push('-');
      const ch = opts.length ? opts[Math.floor(Math.random() * opts.length)] : 'u';
      if (ch === 's') t.next = node + t.dir * 48;
      else if (ch === 'u') { t.dir = -t.dir; t.next = node + t.dir * 48; }
      else { const nd = ch === '+' ? 1 : -1, oldLine = t.line; t.axis = t.axis === 'x' ? 'z' : 'x'; t.line = node; t.pos = oldLine; t.dir = nd; t.next = oldLine + nd * 48; }
    }
    trafficPose(t);
    t.rx = damp(t.rx, t.x, 7, dt); t.rz = damp(t.rz, t.z, 7, dt); t.rh += wrapA(t.h - t.rh) * (1 - Math.exp(-7 * dt));
    t.mesh.position.set(t.rx, 0.04, t.rz); t.mesh.rotation.y = t.rh;
    if (P.inCar) {
      const dx = carState.x - t.rx, dz = carState.z - t.rz, d = Math.hypot(dx, dz);
      if (d < 3.2 && d > 0.01) {
        carState.x += dx / d * (3.2 - d); carState.z += dz / d * (3.2 - d);
        if (Math.abs(carState.v) > 6) { spawnParticles(t.rx + dx / 2, 0.8, t.rz + dz / 2, ['#ffd23f', '#ffffff'], 6, 4, 0.3, 0.1); shake = 0.3; t.stun = 2; }
        carState.v *= 0.6; carState.vx *= 0.6; carState.vz *= 0.6;
      }
    } else {
      const dx = P.x - t.rx, dz = P.z - t.rz, d = Math.hypot(dx, dz);
      if (d < 2.0 && d > 0.01) { P.x = t.rx + dx / d * 2.0; P.z = t.rz + dz / d * 2.0; }
    }
  }
}

// ---------------- bullets
const tmpV = new THREE.Vector3();
const bullets = [], bpool = [], bgeo = new THREE.BoxGeometry(0.06, 0.06, 0.7);
function shoot() {
  const s = gunStats;
  heroGun.muzzle.getWorldPosition(tmpV);
  for (let i = 0; i < s.pellets; i++) {
    const a = P.face + (Math.random() - 0.5) * s.spread * DEG * (1 + P.recoil);
    let m = bpool.pop(); if (!m) m = new THREE.Mesh(bgeo, new THREE.MeshBasicMaterial());
    m.material.color.set(s.tracer); m.position.copy(tmpV); m.rotation.set(0, a, 0); dyn.add(m);
    bullets.push({ x: tmpV.x, y: tmpV.y, z: tmpV.z, vx: Math.sin(a) * s.speed, vz: Math.cos(a) * s.speed, life: s.range / s.speed, m, ammo: s.ammo });
  }
  P.ammo--; P.recoil = Math.min(1, P.recoil + s.recoil * 0.5); shake = Math.max(shake, s.recoil * 0.1);
  P.flash = 0.05; muzzleFlash.position.copy(tmpV); const fs = (s.quiet ? 0.4 : 0.8) * (0.8 + s.dmg / 80); muzzleFlash.scale.set(fs, fs, 1);
  muzzleFlash.material.color.set(s.energy ? s.tracer : '#ffffff');
  muzzleLight.position.copy(tmpV); muzzleLight.intensity = s.quiet ? 3 : 8;
  sfxShot(s.quiet, s.energy);
  if (!s.energy) spawnParticles(tmpV.x, tmpV.y, tmpV.z, '#e6b422', 1, 2, 0.5, 0.05, 14);
}
function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i], steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vz) * dt / 0.4));
    let dead = false;
    for (let k = 0; k < steps && !dead; k++) {
      b.x += b.vx * dt / steps; b.z += b.vz * dt / steps;
      if (solidPoint(b.x, b.z, b.y)) dead = true;
      for (const t of traffic) if (Math.hypot(t.rx - b.x, t.rz - b.z) < 1.6 && b.y < 2) { dead = true; t.stun = 3; }
      if (dead) {
        const fx = b.ammo === 'explosive' ? ['#ffd23f', '#ff8a2a', '#ff4d2a'] : b.ammo === 'frost' ? ['#bff4ff', '#6fd8ff'] : b.ammo === 'incendiary' ? ['#ffb02e', '#ff5a1f'] : ['#ffe08a', '#ffffff'];
        spawnParticles(b.x, b.y, b.z, fx, b.ammo === 'explosive' ? 22 : 4, b.ammo === 'explosive' ? 6 : 3, 0.35, b.ammo === 'explosive' ? 0.25 : 0.07, 6);
        if (b.ammo === 'explosive') shake = Math.max(shake, 0.25);
      }
    }
    b.life -= dt;
    if (dead || b.life <= 0) { dyn.remove(b.m); bpool.push(b.m); bullets.splice(i, 1); continue; }
    b.m.position.set(b.x, b.y, b.z);
  }
}

// ---------------- on foot
let time = 0, clockH = 8, dayN = 1, shake = 0, saveT = 0, toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); toastT = 2.4; }
function baseY(x, z) {
  if (onPier(x, z)) return 0.28;
  if (roadAt(x, z)) return 0.04;
  if (cityAt(x, z, -6)) return 0.17;
  return groundH(x, z);
}
function nearCar() { return Math.hypot(P.x - carState.x, P.z - carState.z) < 4.2; }
function updateFoot(dt) {
  const st = input.stick, s = gunStats;
  const run = st.m > 0.85, sp = (run ? 7.2 : 4.6) * st.m * s.mob;
  const ox = P.x, oz = P.z;
  if (st.m > 0.1) {
    const mx = st.x / st.m, mz = -st.y / st.m;
    P.x += mx * sp * dt; P.z += mz * sp * dt;
    P.face += wrapA(Math.atan2(mx, mz) - P.face) * (1 - Math.exp(-14 * dt));
  }
  resolve(P, 0.4, Math.max(0, P.y - baseY(P.x, P.z)));
  if (!walkable(P.x, P.z)) { P.x = ox; P.z = oz; }
  const gy = baseY(P.x, P.z);
  if (input.consume('b') && P.y <= gy + 0.01) P.vy = 7.5;
  P.vy -= 24 * dt; P.y += P.vy * dt; if (P.y <= gy) { P.y = gy; P.vy = 0; }
  // weapon
  P.fireCd -= dt; P.burstT -= dt; P.recoil = Math.max(0, P.recoil - dt * 4);
  if (P.reload > 0) { P.reload -= dt; if (P.reload <= 0) P.ammo = s.mag; }
  if (input.consume('y') && P.reload <= 0 && P.ammo < s.mag) P.reload = s.reload;
  const firing = input.held('x');
  if (P.burst > 0) { if (P.burstT <= 0 && P.ammo > 0) { shoot(); P.burst--; P.burstT = 0.07; if (!P.burst) P.fireCd = 1.6 / s.rof; } if (P.ammo <= 0) P.burst = 0; }
  else if (firing && P.fireCd <= 0 && P.reload <= 0) {
    if (P.ammo <= 0) P.reload = s.reload;
    else if (s.mode === 'burst') { P.burst = 3; P.burstT = 0; }
    else { shoot(); P.fireCd = 1 / s.rof; }
  }
  if (P.ammo <= 0 && P.reload <= 0 && !P.burst) P.reload = s.reload;
  input.consume('x');
  if (input.consume('a') && nearCar()) enterCar();
  // pose
  const moved = Math.hypot(P.x - ox, P.z - oz) / Math.max(dt, 1e-4);
  P.phase += dt * moved * 1.8;
  heroRoot.position.set(P.x, P.y, P.z); hero.root.rotation.y = P.face;
  const aimHold = firing || P.fireCd > -0.6;
  poseCharacter(hero, { phase: P.phase, speed: Math.min(1, moved / 7), air: P.y > gy + 0.05, aim: aimHold ? 0 : -0.55, recoil: P.recoil, t: time });
  if (P.reload > 0) { const k = Math.sin(Math.min(1, 1 - P.reload / s.reload) * Math.PI); hero.armR.pivot.rotation.x += k * 0.9; hero.armL.pivot.rotation.x += k * 1.2; }
  heroRoot.updateMatrixWorld(true);
  P.flash -= dt; muzzleFlash.visible = P.flash > 0; muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 90);
}
function enterCar() { P.inCar = true; heroRoot.visible = false; muzzleFlash.visible = false; toast(carCfg.name || 'Your car'); audio(); }
function exitCar() {
  const h = carState.h, lx = Math.cos(h), lz = -Math.sin(h); // car's left side
  const spots = [[lx * 2.4, lz * 2.4], [-lx * 2.4, -lz * 2.4], [-Math.sin(h) * 3.8, -Math.cos(h) * 3.8], [Math.sin(h) * 3.8, Math.cos(h) * 3.8]];
  let placed = false;
  for (const [dx, dz] of spots) {
    const p = { x: carState.x + dx, z: carState.z + dz };
    if (!walkable(p.x, p.z)) continue;
    const bx = p.x, bz = p.z; resolve(p, 0.4, 0);
    if (Math.hypot(p.x - bx, p.z - bz) < 0.6) { P.x = p.x; P.z = p.z; placed = true; break; }
  }
  if (!placed) { P.x = carState.x + lx * 2.4; P.z = carState.z + lz * 2.4; }
  P.inCar = false; P.y = baseY(P.x, P.z); heroRoot.visible = true; P.face = carState.h;
  carState.v = 0; carState.vx = carState.vz = 0;
}

// ---------------- driving
const carPos = { x: 0, z: 0 };
function updateCar(dt) {
  const c = carState, s = carStats;
  if (P.inCar) {
    const st = input.stick, brake = input.held('b');
    let target = 0, steer = 0;
    if (st.m > 0.18) {
      const want = Math.atan2(st.x, -st.y);
      const diff = wrapA(want - c.h);
      if (Math.abs(diff) > 2.3 && c.v < 4) { target = -s.top * 0.3 * st.m; steer = clamp(-wrapA(want + Math.PI - c.h) * 2, -1, 1); }
      else { target = s.top * st.m * (Math.abs(diff) > 1.4 ? 0.35 : 1); steer = clamp(diff * 2.2, -1, 1); }
    }
    const onRoad = !!roadAt(c.x, c.z), sand = c.z > sandLine(c.x);
    target *= onRoad ? 1 : Math.min(1, (sand ? 0.45 : 0.65) * s.off);
    if (brake) c.v = damp(c.v, 0, 3.5, dt);
    else if (target > c.v) c.v = Math.min(target, c.v + s.acc * dt * (1 - Math.max(0, c.v) / (s.top * 1.15)));
    else if (target < c.v) c.v = Math.max(target, c.v - (target < 0 ? s.acc * 0.6 : (target === 0 ? 5 : 9)) * dt);
    c.steer = damp(c.steer, steer, 10, dt);
    if (input.consume('x')) sfxHorn();
    if (input.consume('y')) { c.lights = !c.lights; toast(c.lights ? 'Headlights on' : 'Headlights off'); }
    input.consume('b');
    if (input.consume('a')) exitCar();
  } else { c.v = damp(c.v, 0, 3, dt); c.steer = damp(c.steer, 0, 6, dt); }
  const spd = Math.abs(c.v);
  const turn = c.steer * s.turn * clamp(spd / 6, 0, 1) * (1 - Math.min(0.45, spd / s.top * 0.45)) * Math.sign(c.v || 1);
  c.h = wrapA(c.h + turn * dt);
  const fx = Math.sin(c.h), fz = Math.cos(c.h);
  const grip = (P.inCar && input.held('b') ? 1.6 : 7) * s.grip;
  c.vx = damp(c.vx, fx * c.v, grip, dt); c.vz = damp(c.vz, fz * c.v, grip, dt);
  const ox = c.x, oz = c.z;
  c.x += c.vx * dt; c.z += c.vz * dt;
  const half = car.length * 0.3, r = car.width * 0.55;
  let hit = false;
  for (const sgn of [1, -1]) {
    carPos.x = c.x + fx * half * sgn; carPos.z = c.z + fz * half * sgn;
    if (resolve(carPos, r, 0)) { c.x = carPos.x - fx * half * sgn; c.z = carPos.z - fz * half * sgn; hit = true; }
  }
  if (!walkable(c.x, c.z, false)) { c.x = ox; c.z = oz; hit = true; }
  if (hit) {
    if (spd > 9) { spawnParticles(c.x + fx * 2, 0.7, c.z + fz * 2, ['#ffd23f', '#ffffff', '#888'], 10, 5, 0.4, 0.1); shake = Math.max(shake, Math.min(0.6, spd / 40)); }
    c.v *= -0.25; c.vx *= 0.2; c.vz *= 0.2;
  }
  if (P.inCar && spd > 14 && input.held('b')) spawnParticles(c.x - fx * 1.8, 0.2, c.z - fz * 1.8, '#d8d8d8', 1, 1, 0.6, 0.35, -1);
  const g = car.group;
  g.position.set(c.x, roadAt(c.x, c.z) ? 0.04 : Math.max(groundH(c.x, c.z), 0), c.z); g.rotation.y = c.h;
  g.rotation.z = clamp((-c.vx * fz + c.vz * fx) * 0.012, -0.08, 0.08);
  for (const w of car.wheels) { w.spin.rotation.x += c.v * dt / car.wr; if (w.front) w.pivot.rotation.y = c.steer * 0.45; }
  const on = c.lights && night > 0.25;
  car.headM.emissiveIntensity = on ? 2.2 : 0.4;
  car.tailM.emissiveIntensity = (P.inCar && (input.held('b') || c.v < -0.5)) ? 2.5 : on ? 1.2 : 0.4;
  headSpot.intensity = on ? 60 : 0;
  headSpot.position.set(c.x + fx * car.length * 0.5, 1.0, c.z + fz * car.length * 0.5);
  headTarget.position.set(c.x + fx * 18, 0, c.z + fz * 18);
  if (car.glow) car.glow.material.opacity = 0.35 + night * 0.4;
  engineSound(P.inCar, spd);
}

// ---------------- camera
const camLook = new THREE.Vector3();
let camDist = 58;
function padHeight() { return Math.min(H * 0.36, 310); }
function updateCamera(dt, snap) {
  const tx = P.inCar ? carState.x + carState.vx * 0.45 : P.x;
  const tz = P.inCar ? carState.z + carState.vz * 0.45 : P.z;
  const ty = P.inCar ? 0 : P.y;
  const want = P.inCar ? 84 + Math.abs(carState.v) * 0.5 : 58;
  camDist = snap ? want : damp(camDist, want, 2.5, dt);
  const k = snap ? 1 : 1 - Math.exp(-6 * dt);
  camLook.x += (tx - camLook.x) * k; camLook.z += (tz - camLook.z) * k; camLook.y += (ty - camLook.y) * k;
  const pitch = 56 * DEG;
  shake = Math.max(0, shake - dt * 1.5);
  const sx = (Math.random() - 0.5) * shake, sz = (Math.random() - 0.5) * shake;
  G.cam.position.set(camLook.x + sx, camLook.y + Math.sin(pitch) * camDist, camLook.z + Math.cos(pitch) * camDist + sz);
  G.cam.lookAt(camLook.x + sx, camLook.y, camLook.z + sz);
  G.scene.fog.near = camDist + 25; G.scene.fog.far = camDist + 130;
  fadeU.uPlayer.value.set(P.inCar ? carState.x : P.x, P.inCar ? 0 : P.y, P.inCar ? carState.z : P.z);
  fadeU.uCam.value.copy(G.cam.position);
  lantern.position.set(P.inCar ? carState.x : P.x, 3, P.inCar ? carState.z : P.z);
}
function gameLayout() {
  G.cam.aspect = W / H; G.cam.clearViewOffset();
  G.cam.setViewOffset(W, H, 0, padHeight() * 0.42, W, H);
  G.cam.updateProjectionMatrix();
}

// ---------------- HUD, minimap, big map
let MAP = null;
const mm = $('minimap'), mctx = mm.getContext('2d');
function ensureMap() { if (!MAP) MAP = drawMap(512); }
function drawMinimap() {
  ensureMap();
  const px = P.inCar ? carState.x : P.x, pz = P.inCar ? carState.z : P.z;
  const S = mm.width, span = P.inCar ? 260 : 170;
  const mx = MAP.tx(px), mz = MAP.tz(pz), ms = span / MAP.sx;
  mctx.save(); mctx.clearRect(0, 0, S, S);
  mctx.beginPath(); mctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); mctx.clip();
  mctx.fillStyle = '#3d8fd0'; mctx.fillRect(0, 0, S, S);
  mctx.drawImage(MAP.canvas, mx - ms / 2, mz - ms / 2, ms, ms, 0, 0, S, S);
  const toS = (wx, wz) => [S / 2 + (wx - px) / span * S, S / 2 + (wz - pz) / span * S];
  mctx.fillStyle = '#ffffff';
  for (const t of traffic) { const [a, b] = toS(t.rx, t.rz); mctx.fillRect(a - 3, b - 3, 6, 6); }
  if (!P.inCar) { const [a, b] = toS(carState.x, carState.z); mctx.fillStyle = '#ff8a2a'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(a, b, 9, 0, 7); mctx.fill(); mctx.stroke(); }
  mctx.translate(S / 2, S / 2); mctx.rotate((P.inCar ? carState.h : P.face) + Math.PI);
  mctx.fillStyle = '#ffd23f'; mctx.strokeStyle = '#1a1a2a'; mctx.lineWidth = 4;
  mctx.beginPath(); mctx.moveTo(0, -16); mctx.lineTo(11, 11); mctx.lineTo(0, 5); mctx.lineTo(-11, 11); mctx.closePath(); mctx.stroke(); mctx.fill();
  mctx.restore();
}
function drawBigMap() {
  ensureMap();
  const bc = $('bigmap'), S = Math.min(1024, Math.round(Math.min(W, H) * Math.min(devicePixelRatio, 2))); bc.width = bc.height = S;
  const x = bc.getContext('2d'); x.drawImage(MAP.canvas, 0, 0, S, S);
  const k = S / 512;
  x.textAlign = 'center'; x.font = `900 ${Math.round(14 * k)}px ui-rounded, system-ui, sans-serif`;
  for (const [name, wx, wz] of LABELS) { const a = MAP.tx(wx) * k, b = MAP.tz(wz) * k; x.lineWidth = 4 * k; x.strokeStyle = 'rgba(0,0,0,.55)'; x.strokeText(name, a, b); x.fillStyle = '#fff'; x.fillText(name, a, b); }
  const dot = (wx, wz, col, r) => { x.fillStyle = col; x.strokeStyle = '#fff'; x.lineWidth = 2 * k; x.beginPath(); x.arc(MAP.tx(wx) * k, MAP.tz(wz) * k, r * k, 0, 7); x.fill(); x.stroke(); };
  if (!P.inCar) dot(carState.x, carState.z, '#ff8a2a', 5);
  dot(P.inCar ? carState.x : P.x, P.inCar ? carState.z : P.z, '#ffd23f', 6);
}
const hudCache = {};
function setText(id, v) { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }
const heroGunName = () => gunCfg.name || RECEIVERS[gunCfg.receiver].label;
function updateHUD(dt) {
  const hh = Math.floor(clockH), m10 = Math.floor((clockH - hh) * 6) * 10;
  setText('clockTxt', `${clockH >= 6 && clockH < 19 ? '☀' : '☾'} ${String(hh).padStart(2, '0')}:${String(m10).padStart(2, '0')} · Day ${dayN}`);
  setText('zoneTxt', zoneName(P.inCar ? carState.x : P.x, P.inCar ? carState.z : P.z));
  setText('ammoTxt', P.inCar ? '' : P.reload > 0 ? 'Reloading…' : `${heroGunName()} · ${P.ammo}/${gunStats.mag}`);
  $('speedo').classList.toggle('hidden', !P.inCar);
  if (P.inCar) setText('speedTxt', String(Math.round(Math.abs(carState.v) * 3.6)));
  const near = !P.inCar && nearCar();
  const lbl = P.inCar ? { a: 'Exit', b: 'Brake', x: 'Horn', y: 'Lights' } : { a: near ? 'Enter' : '—', b: 'Jump', x: 'Fire', y: 'Reload' };
  for (const k of ['a', 'b', 'x', 'y']) setText('lbl' + k.toUpperCase(), lbl[k]);
  $('btnA').classList.toggle('ready', near);
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('on'); }
  drawMinimap();
}

// ---------------- save / load
function saveGame() {
  save = { x: P.x, z: P.z, face: P.face, inCar: P.inCar, cx: carState.x, cz: carState.z, ch: carState.h, h: clockH, day: dayN };
  store.set('bc_save', save);
}
function startGame() {
  buildHero(); buildPlayerCar();
  if (save) {
    Object.assign(P, { x: save.x, z: save.z, face: save.face || 0 });
    Object.assign(carState, { x: save.cx, z: save.cz, h: save.ch, v: 0, vx: 0, vz: 0 });
    clockH = save.h ?? 8; dayN = save.day ?? 1;
    P.inCar = false; if (save.inCar) { P.x = carState.x; P.z = carState.z; enterCar(); }
  } else {
    Object.assign(P, { x: SPAWN.x, z: SPAWN.z, face: Math.PI, inCar: false });
    Object.assign(carState, { x: SPAWN.carX, z: SPAWN.carZ, h: SPAWN.carH, v: 0, vx: 0, vz: 0 });
    clockH = 8; dayN = 1;
  }
  heroRoot.visible = !P.inCar;
  P.y = baseY(P.x, P.z);
  loadBudget = 60; updateChunks(P.x, P.z, 2); loadBudget = 2;
  applyTime(clockH, P.x, P.z);
  updateCar(0);
  if (!P.inCar) updateFoot(0.001);
  updateCamera(0, true);
  setState('play');
  if (!save) toast('Your car is just ahead — walk up and press A');
}
function bringCar() {
  let best = null;
  for (let r = 4; r < 60 && !best; r += 4) for (let a = 0; a < Math.PI * 2 && !best; a += Math.PI / 8) {
    const x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r;
    if (roadAt(x, z) && walkable(x, z, false)) { const p = { x, z }; if (!resolve(p, 1.4, 0)) best = p; }
  }
  if (!best) best = { x: P.x + 4, z: P.z };
  Object.assign(carState, { x: best.x, z: best.z, v: 0, vx: 0, vz: 0 });
  toast('Your car is waiting nearby');
}

// ---------------- step
function step(dt) {
  time += dt;
  clockH += dt / 30; // 30 real seconds per game hour = 12-minute day
  if (clockH >= 24) { clockH -= 24; dayN++; }
  if (P.inCar) { updateCar(dt); P.x = carState.x; P.z = carState.z; }
  else { updateFoot(dt); updateCar(dt); }
  updateTraffic(dt);
  updateBullets(dt);
  updateParticles(dt);
  if (input.consume('map')) openMap();
  if (input.consume('pause')) { saveGame(); setState('pause'); }
  saveT -= dt; if (saveT <= 0) { saveT = 4; saveGame(); }
}

// ================================================================ state machine / UI
let state = 'menu';
const input = new Input();
input.bindTouch({ zone: $('stickZone'), base: $('stickBase'), knob: $('stickKnob'), canvas, buttons: { a: $('btnA'), b: $('btnB'), x: $('btnX'), y: $('btnY'), map: $('btnMap'), pause: $('btnPause') } });
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
function show(id, on) { $(id).classList.toggle('hidden', !on); }
function setState(s) {
  state = s;
  show('menu', s === 'menu'); show('custom', ['char', 'gun', 'car'].includes(s));
  show('hud', s === 'play'); show('pad', s === 'play'); show('pause', s === 'pause'); show('mapView', s === 'map');
  if (['menu', 'char', 'gun', 'car'].includes(s)) { previewMode = s; previewLayout(); engineSound(false, 0); }
  if (s === 'pause' || s === 'map') engineSound(false, 0);
  if (s === 'play') gameLayout();
  if (s === 'menu') {
    $('playBtn').textContent = save ? '▶ Continue' : '▶ Play';
    $('tipTxt').textContent = isTouch ? 'Tip: Share → Add to Home Screen for full-screen' : 'WASD move · Space jump/brake · J fire/horn · R reload · E enter/exit · M map';
  }
  input.clear();
}
function openMap() { drawBigMap(); setState('map'); }
$('mapView').addEventListener('pointerdown', () => setState('play'));
mm.addEventListener('pointerdown', e => { e.stopPropagation(); if (state === 'play') openMap(); });

let panel = null;
function openCustom(kind) {
  setState(kind);
  const S = { char: CHAR_SCHEMA, gun: GUN_SCHEMA, car: CAR_SCHEMA }[kind];
  $('customTitle').textContent = { char: 'Character', gun: 'Gunsmith', car: 'Garage' }[kind];
  const pres = $('presets'); pres.innerHTML = '';
  const presets = kind === 'gun' ? GUN_PRESETS : kind === 'car' ? CAR_PRESETS : null;
  if (presets) for (const [name, cfg] of Object.entries(presets)) {
    const b = document.createElement('button'); b.textContent = name;
    b.onclick = () => { if (kind === 'gun') gunCfg = { ...DEFAULT_GUN, ...cfg }; else carCfg = { ...DEFAULT_CAR, ...cfg }; changed(); panel.refresh(); };
    pres.appendChild(b);
  }
  const get = () => kind === 'gun' ? gunCfg : kind === 'car' ? carCfg : charCfg;
  panel = buildPanel({
    tabsEl: $('tabs'), contentEl: $('content'), schema: S, getCfg: get,
    onChange: (k, v) => { get()[k] = v; if (kind === 'gun' && k === 'receiver') { gunCfg.fireMode = RECEIVERS[v].mode; panel.refresh(); } changed(); },
  });
  changed();
}
function changed() {
  store.set('rr_char', charCfg); store.set('rr_gun', gunCfg); store.set('bc_car', carCfg);
  pv.dirty = true;
  if (state === 'gun') {
    const s = computeStats(gunCfg);
    const notes = [`DPS <b>${Math.round(s.dps)}</b>`, { semi: 'Semi-auto', burst: '3-round burst', auto: 'Full auto' }[s.mode]];
    if (s.pellets > 1) notes.push(`${s.pellets} pellets`); notes.push(PARTS.ammo[s.ammo].label);
    renderStats($('stats'), statBars(s), notes.join(' · '));
  } else if (state === 'car') {
    const s = computeCarStats(carCfg);
    renderStats($('stats'), carStatBars(s), `Engine <b>${CAR_PARTS.engine[carCfg.engine].label}</b> · Tyres <b>${CAR_PARTS.tyres[carCfg.tyres].label}</b>`);
  } else $('stats').innerHTML = `<div class="statx">Your look saves automatically and carries into the city.</div>`;
}
$('charBtn').onclick = () => openCustom('char');
$('gunBtn').onclick = () => openCustom('gun');
$('carBtn').onclick = () => openCustom('car');
$('backBtn').onclick = () => setState('menu');
$('randBtn').onclick = () => {
  if (state === 'gun') gunCfg = { ...DEFAULT_GUN, ...randomGun() };
  else if (state === 'car') carCfg = { ...DEFAULT_CAR, ...randomCar(), name: carCfg.name };
  else charCfg = { ...DEFAULT_CHAR, ...randomChar() };
  changed(); panel.refresh();
};
$('playBtn').onclick = () => { audio(); startGame(); };
$('resumeBtn').onclick = () => setState('play');
$('quitBtn').onclick = () => { saveGame(); setState('menu'); };
$('callCarBtn').onclick = () => { if (P.inCar) exitCar(); bringCar(); setState('play'); };
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') { saveGame(); setState('pause'); } });
document.addEventListener('touchmove', e => { if (!e.target.closest('.scroll')) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

function resize() { W = innerWidth; H = innerHeight; renderer.setSize(W, H); previewLayout(); gameLayout(); }
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 250));
resize();

let last = performance.now(), ptime = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (state === 'play') {
    step(dt);
    updateChunks(P.x, P.z, P.inCar ? 3 : 2);
    applyTime(clockH, P.x, P.z);
    updateCamera(dt);
    updateHUD(dt);
    renderer.render(G.scene, G.cam);
  } else if (state === 'pause' || state === 'map') {
    renderer.render(G.scene, G.cam);
  } else {
    ptime += dt; updatePreview(dt, ptime); renderer.render(pv.scene, pv.cam);
  }
}
setState('menu');
requestAnimationFrame(frame);
window.__game = { get state() { return state; }, P, carState, input, startGame, get traffic() { return traffic; }, setTime: h => { clockH = h; }, openCustom, enterCar, exitCar };
