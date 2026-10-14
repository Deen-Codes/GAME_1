// Modular gun builder + stat model. Gun points along +Z, origin at the top of the grip (where the hand goes).
import * as THREE from '../lib/three.module.min.js';
import { BASIC } from './character.js?v=127';

// Base stats per frame. Every other part multiplies these.
export const RECEIVERS = {
  pistol:   { label: 'Pistol',   len: 0.28, h: 0.12, w: 0.07, barrel: 0.45, mode: 'semi',  base: { dmg: 18, rof: 5,   mag: 12,  reload: 1.0, spread: 3,   recoil: 0.25, range: 24, speed: 42, mob: 1.0,  pellets: 1 } },
  revolver: { label: 'Revolver', len: 0.26, h: 0.13, w: 0.08, barrel: 0.55, mode: 'semi',  base: { dmg: 42, rof: 2.2, mag: 6,   reload: 1.8, spread: 2,   recoil: 0.55, range: 28, speed: 50, mob: 1.0,  pellets: 1 } },
  smg:      { label: 'SMG',      len: 0.40, h: 0.14, w: 0.08, barrel: 0.6,  mode: 'auto',  base: { dmg: 12, rof: 11,  mag: 30,  reload: 1.4, spread: 6,   recoil: 0.2,  range: 20, speed: 42, mob: 0.97, pellets: 1 } },
  rifle:    { label: 'Rifle',    len: 0.56, h: 0.15, w: 0.085, barrel: 1.0, mode: 'auto',  base: { dmg: 24, rof: 7,   mag: 30,  reload: 1.8, spread: 2.5, recoil: 0.35, range: 32, speed: 56, mob: 0.92, pellets: 1 } },
  shotgun:  { label: 'Shotgun',  len: 0.48, h: 0.14, w: 0.095, barrel: 1.0, mode: 'semi',  base: { dmg: 11, rof: 1.5, mag: 6,   reload: 2.2, spread: 12,  recoil: 0.7,  range: 14, speed: 38, mob: 0.92, pellets: 7 } },
  sniper:   { label: 'Sniper',   len: 0.60, h: 0.14, w: 0.085, barrel: 1.3, mode: 'semi',  base: { dmg: 95, rof: 0.9, mag: 5,   reload: 2.5, spread: 0.5, recoil: 0.8,  range: 55, speed: 90, mob: 0.84, pellets: 1 } },
  lmg:      { label: 'LMG',      len: 0.66, h: 0.19, w: 0.12, barrel: 1.0,  mode: 'auto',  base: { dmg: 20, rof: 12,  mag: 100, reload: 3.5, spread: 5,   recoil: 0.4,  range: 30, speed: 50, mob: 0.78, pellets: 1 } },
  blaster:  { label: 'Blaster',  len: 0.46, h: 0.16, w: 0.1,  barrel: 0.8,  mode: 'auto',  base: { dmg: 30, rof: 5,   mag: 20,  reload: 1.6, spread: 1.5, recoil: 0.15, range: 28, speed: 32, mob: 0.95, pellets: 1 } },
};

const opt = (label, m = {}) => ({ label, m });
export const PARTS = {
  barrel: {
    short: opt('Short', { range: 0.8, spread: 1.2, mob: 1.03, recoil: 1.1 }),
    standard: opt('Standard'),
    long: opt('Long', { range: 1.25, spread: 0.8, speed: 1.15, mob: 0.97 }),
    heavy: opt('Heavy', { dmg: 1.12, recoil: 0.85, mob: 0.94, range: 1.1 }),
    twin: opt('Twin', { pellets: 2, dmg: 0.62, spread: 1.3, recoil: 1.15 }),
    shrouded: opt('Shrouded', { recoil: 0.9, rof: 1.08, mob: 0.98 }),
  },
  muzzle: {
    none: opt('None'),
    suppressor: opt('Suppressor', { dmg: 0.92, range: 0.95, recoil: 0.9 }),
    compensator: opt('Compensator', { recoil: 0.7 }),
    flashhider: opt('Flash hider', { spread: 0.88 }),
    choke: opt('Choke', { spread: 0.6, range: 1.1 }),
    bayonet: opt('Bayonet', { mob: 0.98 }),
  },
  stock: {
    none: opt('None', { recoil: 1.3, mob: 1.06 }),
    folding: opt('Folding', { recoil: 1.1, mob: 1.03 }),
    standard: opt('Standard'),
    wood: opt('Wooden', { recoil: 0.92, mob: 0.98 }),
    heavy: opt('Heavy', { recoil: 0.7, mob: 0.94 }),
  },
  grip: {
    standard: opt('Standard'),
    rubber: opt('Rubber', { recoil: 0.9 }),
    ergonomic: opt('Ergonomic', { reload: 0.9, mob: 1.01 }),
    wood: opt('Wooden', { recoil: 0.95 }),
    skeleton: opt('Skeleton', { mob: 1.03, recoil: 1.05 }),
  },
  magazine: {
    standard: opt('Standard'),
    quick: opt('Quick-pull', { mag: 0.8, reload: 0.6 }),
    extended: opt('Extended', { mag: 1.6, reload: 1.15, mob: 0.98 }),
    dual: opt('Taped dual', { reload: 0.7, mob: 0.98 }),
    drum: opt('Drum', { mag: 2.5, reload: 1.5, mob: 0.93 }),
  },
  sight: {
    iron: opt('Iron sights'),
    reddot: opt('Red dot', { spread: 0.95 }),
    holo: opt('Holographic', { spread: 0.92 }),
    scope: opt('Scope 4x', { range: 1.2, spread: 0.8, mob: 0.97 }),
    sniper: opt('Scope 8x', { range: 1.4, spread: 0.6, rof: 0.9, mob: 0.95 }),
    thermal: opt('Thermal', { range: 1.15, spread: 0.85 }),
  },
  under: {
    none: opt('None'),
    foregrip: opt('Vertical grip', { recoil: 0.8, spread: 0.9 }),
    angled: opt('Angled grip', { recoil: 0.88, mob: 1.02 }),
    laser: opt('Laser', { spread: 0.85 }),
    flashlight: opt('Flashlight'),
    bipod: opt('Bipod', { recoil: 0.72, mob: 0.95 }),
    launcher: opt('Grenade launcher', { mob: 0.93 }),
  },
  ammo: {
    standard: opt('Standard'),
    ap: opt('Armour piercing', { dmg: 1.1, rof: 0.92 }),
    hollow: opt('Hollow point', { dmg: 1.25, range: 0.85 }),
    incendiary: opt('Incendiary', { dmg: 0.9 }),
    frost: opt('Frost', { dmg: 0.9 }),
    explosive: opt('Explosive', { dmg: 1.3, rof: 0.7, speed: 0.8 }),
  },
  finish: {
    matte: opt('Matte'), satin: opt('Satin'), gloss: opt('Gloss'), metal: opt('Brushed metal'),
    chrome: opt('Chrome'), gold: opt('Gold plated'), camo: opt('Woodland camo'), digital: opt('Digital camo'), carbon: opt('Carbon fibre'), tiger: opt('Tiger stripe'),
  },
};
// what a part does, as shown on its chip: [label, '+25%', isGood]
const FX = { dmg: ['damage', 1], range: ['range', 1], spread: ['accuracy', -1], rof: ['fire rate', 1], recoil: ['recoil', -1], mob: ['mobility', 1], reload: ['reload time', -1], mag: ['mag size', 1], pellets: ['pellets', 1], speed: ['bullet speed', 1] };
const PERKS = { suppressor: 'Off the radar: quiet shots', laser: 'Laser sight on target', flashlight: 'Lights up the night', launcher: 'Fires grenades', bayonet: 'Melee stab', incendiary: 'Sets targets on fire', frost: 'Slows targets', explosive: 'Small blasts', ap: 'Punches through cars', hollow: 'Big damage up close', thermal: 'See people in the dark' };
export function partEffects(slot, val) {
  const p = PARTS[slot]?.[val]; if (!p) return [];
  const out = Object.entries(p.m).map(([k, v]) => { const f = FX[k]; if (!f) return null; let pct = Math.round((v - 1) * 100); if (!pct) return null; const good = pct * f[1] > 0; if (k === 'spread') pct = -pct; return [f[0], (k === 'pellets' ? (v > 1 ? '+' : '') + Math.round((v - 1) * 100) + '%' : (pct > 0 ? '+' : '') + pct + '%'), good]; }).filter(Boolean);
  return out.sort((a, b) => b[2] - a[2]);
}
export function partPerk(val) { return PERKS[val] || null; }
const toOpts = obj => Object.entries(obj).map(([k, v]) => [k, v.label]);

export const GUN_SCHEMA = [
  { tab: 'Frame', items: [
    { key: 'name', type: 'text', label: 'Name' },
    { key: 'receiver', type: 'choice', label: 'Frame', options: toOpts(RECEIVERS) },
    { key: 'fireMode', type: 'choice', label: 'Fire mode', options: [['semi', 'Semi'], ['burst', 'Burst'], ['auto', 'Full auto']] },
    { key: 'stock', type: 'choice', label: 'Stock', options: toOpts(PARTS.stock) },
    { key: 'grip', type: 'choice', label: 'Grip', options: toOpts(PARTS.grip) },
  ] },
  { tab: 'Barrel', items: [
    { key: 'barrel', type: 'choice', label: 'Barrel', options: toOpts(PARTS.barrel) },
    { key: 'muzzle', type: 'choice', label: 'Muzzle', options: toOpts(PARTS.muzzle) },
    { key: 'under', type: 'choice', label: 'Underbarrel', options: toOpts(PARTS.under) },
  ] },
  { tab: 'Optics', items: [
    { key: 'sight', type: 'choice', label: 'Sight', options: toOpts(PARTS.sight) },
    { key: 'magazine', type: 'choice', label: 'Magazine', options: toOpts(PARTS.magazine) },
  ] },
  { tab: 'Ammo', items: [
    { key: 'ammo', type: 'choice', label: 'Ammo type', options: toOpts(PARTS.ammo) },
    { key: 'tracer', type: 'color', label: 'Tracer colour', palette: ['#fff3a0', '#ffd23f', '#ff8a2a', '#ff3b3b', '#ff6fb5', '#b26bff', '#3d8bff', '#38e8ff', '#4cff7a', '#ffffff'] },
  ] },
  { tab: 'Paint', items: [
    { key: 'finish', type: 'choice', label: 'Finish', options: toOpts(PARTS.finish) },
    { key: 'bodyColor', type: 'color', label: 'Body', palette: BASIC },
    { key: 'accentColor', type: 'color', label: 'Accent', palette: BASIC },
    { key: 'metalColor', type: 'color', label: 'Metal parts', palette: ['#2a2b30', '#4a4d55', '#8a8f99', '#c9ccd2', '#b08d57', '#d4af37', '#7a2e2e', '#2e4a7a'] },
  ] },
];

export const DEFAULT_GUN = {
  name: 'Rooftop Special', receiver: 'rifle', fireMode: 'auto', barrel: 'standard', muzzle: 'compensator', stock: 'standard', grip: 'rubber',
  magazine: 'standard', sight: 'reddot', under: 'foregrip', ammo: 'standard', tracer: '#ffd23f', finish: 'satin',
  bodyColor: '#3a3d45', accentColor: '#ff8a2a', metalColor: '#2a2b30',
};

export const GUN_PRESETS = {
  'Sidearm':  { name: 'Sidearm', receiver: 'pistol', fireMode: 'semi', barrel: 'standard', muzzle: 'none', stock: 'none', grip: 'standard', magazine: 'extended', sight: 'iron', under: 'laser', ammo: 'hollow', finish: 'matte', bodyColor: '#16161b', accentColor: '#e23b3b', metalColor: '#4a4d55', tracer: '#fff3a0' },
  'Hand Cannon': { name: 'Hand Cannon', receiver: 'revolver', fireMode: 'semi', barrel: 'long', muzzle: 'none', stock: 'none', grip: 'wood', magazine: 'standard', sight: 'iron', under: 'none', ammo: 'explosive', finish: 'chrome', bodyColor: '#c9ccd2', accentColor: '#7a5230', metalColor: '#c9ccd2', tracer: '#ff8a2a' },
  'Bullet Hose': { name: 'Bullet Hose', receiver: 'smg', fireMode: 'auto', barrel: 'short', muzzle: 'suppressor', stock: 'folding', grip: 'ergonomic', magazine: 'drum', sight: 'holo', under: 'angled', ammo: 'standard', finish: 'digital', bodyColor: '#3a3fbf', accentColor: '#38e8ff', metalColor: '#2a2b30', tracer: '#38e8ff' },
  'Trooper':  { ...DEFAULT_GUN },
  'Boomstick': { name: 'Boomstick', receiver: 'shotgun', fireMode: 'semi', barrel: 'twin', muzzle: 'choke', stock: 'wood', grip: 'wood', magazine: 'standard', sight: 'iron', under: 'flashlight', ammo: 'incendiary', finish: 'satin', bodyColor: '#7a5230', accentColor: '#3a3d45', metalColor: '#4a4d55', tracer: '#ff8a2a' },
  'Longshot': { name: 'Longshot', receiver: 'sniper', fireMode: 'semi', barrel: 'long', muzzle: 'suppressor', stock: 'heavy', grip: 'rubber', magazine: 'standard', sight: 'sniper', under: 'bipod', ammo: 'ap', finish: 'camo', bodyColor: '#55602f', accentColor: '#c2b280', metalColor: '#2a2b30', tracer: '#ffffff' },
  'Big Iron': { name: 'Big Iron', receiver: 'lmg', fireMode: 'auto', barrel: 'heavy', muzzle: 'flashhider', stock: 'heavy', grip: 'rubber', magazine: 'drum', sight: 'thermal', under: 'bipod', ammo: 'standard', finish: 'tiger', bodyColor: '#ff8a2a', accentColor: '#16161b', metalColor: '#2a2b30', tracer: '#ffd23f' },
  'Ray Gun':  { name: 'Ray Gun', receiver: 'blaster', fireMode: 'burst', barrel: 'shrouded', muzzle: 'none', stock: 'none', grip: 'skeleton', magazine: 'quick', sight: 'holo', under: 'launcher', ammo: 'frost', finish: 'gloss', bodyColor: '#ffffff', accentColor: '#9b51e0', metalColor: '#8a8f99', tracer: '#b26bff' },
};

const ADJ = ['Rooftop', 'Neon', 'Rusty', 'Lucky', 'Feral', 'Golden', 'Silent', 'Angry', 'Tiny', 'Cosmic', 'Spicy', 'Midnight'];
const NOUN = ['Special', 'Thunder', 'Whisper', 'Hornet', 'Mule', 'Viper', 'Kettle', 'Comet', 'Brick', 'Toaster', 'Wasp', 'Reaper'];
const pick = a => a[Math.floor(Math.random() * a.length)];
export function randomGun() {
  const g = { name: `${pick(ADJ)} ${pick(NOUN)}` };
  for (const tab of GUN_SCHEMA) for (const it of tab.items) {
    if (it.type === 'choice') g[it.key] = pick(it.options)[0];
    else if (it.type === 'color') g[it.key] = pick(it.palette);
  }
  return g;
}

export function computeStats(cfg) {
  const g = { ...DEFAULT_GUN, ...cfg };
  const r = RECEIVERS[g.receiver] || RECEIVERS.rifle;
  const s = { ...r.base };
  for (const slot of ['barrel', 'muzzle', 'stock', 'grip', 'magazine', 'sight', 'under', 'ammo']) {
    const part = PARTS[slot][g[slot]];
    if (!part) continue;
    for (const [k, v] of Object.entries(part.m)) s[k] *= v;
  }
  s.mag = Math.max(1, Math.round(s.mag));
  s.pellets = Math.max(1, Math.round(s.pellets));
  s.recoil = Math.min(1, s.recoil);
  s.mode = g.fireMode;
  s.ammo = g.ammo;
  s.laser = g.under === 'laser';
  s.launcher = g.under === 'launcher';
  s.tracer = g.tracer;
  s.energy = g.receiver === 'blaster';
  s.quiet = g.muzzle === 'suppressor';
  const burstFactor = s.mode === 'burst' ? 1.15 : s.mode === 'semi' ? 0.9 : 1;
  s.dps = s.dmg * s.pellets * s.rof * burstFactor;
  return s;
}

export function statBars(s) {
  const c = v => Math.max(0.03, Math.min(1, v));
  return [
    ['Damage', c((s.dmg * s.pellets) / 110), Math.round(s.dmg * s.pellets)],
    ['Fire rate', c(s.rof / 14), s.rof.toFixed(1) + '/s'],
    ['Range', c(s.range / 70), Math.round(s.range) + 'm'],
    ['Accuracy', c(1 - s.spread / 16), Math.round((1 - Math.min(s.spread, 16) / 16) * 100)],
    ['Stability', c(1 - s.recoil), Math.round((1 - s.recoil) * 100)],
    ['Mobility', c((s.mob - 0.6) / 0.5), Math.round(s.mob * 100)],
    ['Magazine', c(Math.log(s.mag + 1) / Math.log(260)), s.mag],
    ['Reload', c(1 - s.reload / 5), s.reload.toFixed(1) + 's'],
  ];
}

// ---------- materials ----------
export function patternTexture(kind, a, b) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const x = cv.getContext('2d');
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  const mix = (t) => '#' + ca.clone().lerp(cb, t).getHexString();
  const dark = '#' + ca.clone().multiplyScalar(0.45).getHexString();
  x.fillStyle = a; x.fillRect(0, 0, 128, 128);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  if (kind === 'camo') {
    for (const [col, n] of [[b, 14], [dark, 12], [mix(0.5), 10]]) {
      x.fillStyle = col;
      for (let i = 0; i < n; i++) { x.beginPath(); x.ellipse(rnd() * 128, rnd() * 128, 8 + rnd() * 16, 5 + rnd() * 10, rnd() * 3, 0, 7); x.fill(); }
    }
  } else if (kind === 'digital') {
    for (const col of [b, dark, mix(0.5)]) { x.fillStyle = col; for (let i = 0; i < 90; i++) x.fillRect(Math.floor(rnd() * 16) * 8, Math.floor(rnd() * 16) * 8, 8 * (1 + Math.floor(rnd() * 2)), 8); }
  } else if (kind === 'carbon') {
    x.fillStyle = '#1a1a1e'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { x.fillStyle = (i + j) % 2 ? '#2c2c33' : '#141417'; x.fillRect(i * 8, j * 8, 8, 4); x.fillStyle = (i + j) % 2 ? '#141417' : '#2c2c33'; x.fillRect(i * 8, j * 8 + 4, 8, 4); }
  } else if (kind === 'tiger') {
    x.fillStyle = b;
    for (let i = 0; i < 12; i++) { x.beginPath(); const y0 = rnd() * 128; x.moveTo(0, y0); x.quadraticCurveTo(64, y0 + (rnd() - 0.5) * 50, 128, y0 + (rnd() - 0.5) * 30); x.lineWidth = 3 + rnd() * 6; x.strokeStyle = b; x.stroke(); }
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.repeat.set(3, 3);
  return t;
}

function makeMaterials(g) {
  const fin = g.finish;
  const look = { matte: [0.85, 0.1], satin: [0.55, 0.3], gloss: [0.22, 0.15], metal: [0.38, 0.85], chrome: [0.08, 1], gold: [0.22, 0.95], camo: [0.8, 0.05], digital: [0.8, 0.05], carbon: [0.35, 0.3], tiger: [0.7, 0.1] }[fin] || [0.6, 0.2];
  let bodyCol = g.bodyColor, metalCol = g.metalColor;
  if (fin === 'gold') { bodyCol = '#d4af37'; metalCol = '#b8962e'; }
  const body = new THREE.MeshStandardMaterial({ color: bodyCol, roughness: look[0], metalness: look[1], flatShading: true });
  if (['camo', 'digital', 'carbon', 'tiger'].includes(fin)) { body.map = patternTexture(fin, g.bodyColor, g.accentColor); body.color.set('#ffffff'); }
  const accent = new THREE.MeshStandardMaterial({ color: g.accentColor, roughness: 0.5, metalness: 0.2, flatShading: true });
  const metal = new THREE.MeshStandardMaterial({ color: metalCol, roughness: fin === 'chrome' ? 0.1 : 0.35, metalness: 0.85, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.8, metalness: 0.2, flatShading: true });
  const wood = new THREE.MeshStandardMaterial({ color: '#7a4a25', roughness: 0.75, metalness: 0, flatShading: true });
  const glow = new THREE.MeshStandardMaterial({ color: g.tracer, emissive: g.tracer, emissiveIntensity: 1.2, roughness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: '#7fd4ff', transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.3 });
  const red = new THREE.MeshBasicMaterial({ color: '#ff2a2a' });
  return { body, accent, metal, dark, wood, glow, glass, red };
}

function bx(w, h, d, m, x, y, z) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; return o; }
function cz(r1, r2, len, m, x, y, z, seg = 10) { // cylinder along Z
  const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, len, seg), m); o.rotation.x = Math.PI / 2; o.position.set(x, y, z); o.castShadow = true; return o;
}

export function buildGun(cfg) {
  const g = { ...DEFAULT_GUN, ...cfg };
  const R = RECEIVERS[g.receiver] || RECEIVERS.rifle;
  const M = makeMaterials(g);
  const grp = new THREE.Group();
  const { len, h, w } = R;
  const z0 = -len * 0.3, z1 = len * 0.7, yc = h * 0.55;
  const isPistol = g.receiver === 'pistol' || g.receiver === 'revolver';

  // receiver body
  if (g.receiver === 'blaster') {
    grp.add(bx(w, h, len, M.body, 0, yc, (z0 + z1) / 2));
    grp.add(bx(w * 1.15, h * 0.35, len * 0.7, M.accent, 0, yc + h * 0.1, (z0 + z1) / 2 + 0.03));
    for (let i = 0; i < 3; i++) grp.add(bx(0.015, h * 0.6, 0.05, M.glow, w * 0.58, yc, z0 + 0.1 + i * 0.1));
    grp.add(bx(w * 0.5, 0.05, len * 0.5, M.body, 0, yc + h * 0.6, (z0 + z1) / 2).rotateX(0.1));
  } else {
    grp.add(bx(w, h, len, M.body, 0, yc, (z0 + z1) / 2));
  }
  if (g.receiver === 'pistol') grp.add(bx(w * 1.02, h * 0.45, len * 1.02, M.metal, 0, yc + h * 0.3, (z0 + z1) / 2));
  if (g.receiver === 'revolver') { const c = cz(h * 0.48, h * 0.48, len * 0.38, M.metal, 0, yc + h * 0.05, len * 0.2, 8); grp.add(c); }
  if (g.receiver === 'smg') for (let i = 0; i < 4; i++) grp.add(bx(w * 1.06, 0.015, 0.03, M.dark, 0, yc + h * 0.1, z0 + len * 0.3 + i * 0.05));
  if (['rifle', 'sniper', 'lmg', 'smg'].includes(g.receiver)) grp.add(bx(w * 0.6, 0.02, len * 0.9, M.dark, 0, yc + h / 2 + 0.01, (z0 + z1) / 2)); // top rail
  if (g.receiver === 'rifle') grp.add(bx(0.005, h * 0.3, len * 0.2, M.dark, w / 2 + 0.002, yc + h * 0.1, len * 0.15));
  if (g.receiver === 'sniper') { const bolt = bx(0.08, 0.015, 0.015, M.metal, w * 0.7, yc + h * 0.2, z0 + len * 0.25); grp.add(bolt); grp.add(bx(0.03, 0.03, 0.03, M.metal, w * 0.7 + 0.04, yc + h * 0.2, z0 + len * 0.25)); }
  if (g.receiver === 'lmg') {
    grp.add(bx(0.03, 0.06, 0.18, M.dark, 0, yc + h / 2 + 0.06, len * 0.2));
    grp.add(bx(w * 1.5, 0.14, 0.16, M.accent, -w * 0.6, yc - h * 0.4, len * 0.18));
  }
  // trigger guard
  grp.add(bx(0.012, 0.012, 0.09, M.dark, 0, -0.05, 0.07));
  grp.add(bx(0.012, 0.05, 0.012, M.dark, 0, -0.025, 0.115));

  // grip
  const gripMat = g.grip === 'wood' ? M.wood : g.grip === 'rubber' ? M.dark : g.grip === 'skeleton' ? M.metal : M.body;
  const gripH = isPistol ? 0.17 : 0.15;
  if (g.grip === 'skeleton') {
    const gg = new THREE.Group(); gg.rotation.x = -0.28; grp.add(gg);
    gg.add(bx(w * 0.7, gripH, 0.015, gripMat, 0, -gripH / 2, -0.03));
    gg.add(bx(w * 0.7, gripH, 0.015, gripMat, 0, -gripH / 2, 0.03));
    gg.add(bx(w * 0.7, 0.015, 0.075, gripMat, 0, -gripH, 0));
  } else {
    const gr = bx(w * 0.85, gripH, 0.075, gripMat, 0, -gripH / 2, -0.005); gr.rotation.x = -0.28; grp.add(gr);
    if (g.grip === 'ergonomic') for (let i = 0; i < 3; i++) { const f = bx(w * 0.87, 0.012, 0.02, M.accent, 0, -0.03 - i * 0.04, 0.035 + i * 0.012); grp.add(f); }
  }

  // magazine
  const magZ = isPistol ? -0.02 : Math.min(len * 0.32, z1 - 0.08);
  const mg = new THREE.Group(); mg.position.set(0, isPistol ? -gripH * 0.95 : 0, magZ); mg.rotation.x = isPistol ? -0.28 : 0.12; grp.add(mg);
  if (g.receiver !== 'revolver') {
    const mag = g.magazine;
    if (isPistol) {
      const ext = mag === 'extended' ? 0.08 : mag === 'drum' ? 0 : 0.0;
      mg.add(bx(w * 0.8, 0.02 + ext, 0.07, M.accent, 0, -0.01 - ext / 2, 0));
      if (mag === 'drum') mg.add(cz(0.06, 0.06, w * 1.1, M.accent, 0, -0.06, 0).rotateZ(Math.PI / 2).rotateX(Math.PI / 2));
    } else if (mag === 'drum') {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, w * 1.4, 14), M.accent); d.rotation.z = Math.PI / 2; d.position.set(0, -0.1, 0); d.castShadow = true; mg.add(d);
      mg.add(bx(w * 0.7, 0.06, 0.06, M.dark, 0, -0.02, 0));
    } else {
      const ml = mag === 'extended' ? 0.3 : mag === 'quick' ? 0.15 : 0.19;
      mg.add(bx(w * 0.72, ml, 0.07, M.dark, 0, -ml / 2, 0));
      mg.add(bx(w * 0.8, 0.02, 0.08, M.accent, 0, -ml, 0));
      if (mag === 'quick') mg.add(bx(0.02, 0.05, 0.02, M.accent, 0, -ml - 0.03, 0));
      if (mag === 'dual') { mg.add(bx(w * 0.72, ml, 0.07, M.dark, w * 0.75, -ml / 2, 0)); mg.add(bx(w * 1.6, 0.04, 0.075, M.accent, w * 0.37, -ml * 0.5, 0)); }
    }
  }

  // barrel
  const blen = { short: 0.15, standard: 0.3, long: 0.5, heavy: 0.38, twin: 0.32, shrouded: 0.36 }[g.barrel] * R.barrel;
  const br = g.receiver === 'shotgun' ? 0.022 : g.receiver === 'lmg' ? 0.02 : 0.015;
  const by = yc + h * 0.12;
  const bz = z1 + blen / 2;
  if (g.barrel === 'twin') {
    grp.add(cz(br, br, blen, M.metal, -br * 1.1, by, bz)); grp.add(cz(br, br, blen, M.metal, br * 1.1, by, bz));
  } else if (g.barrel === 'heavy') {
    grp.add(cz(br * 1.7, br * 1.7, blen, M.metal, 0, by, bz));
    for (let i = 0; i < 4; i++) grp.add(cz(br * 2, br * 2, 0.015, M.dark, 0, by, z1 + blen * (0.2 + i * 0.2)));
  } else if (g.barrel === 'shrouded') {
    grp.add(cz(br * 2.3, br * 2.3, blen * 0.85, M.body, 0, by, z1 + blen * 0.42, 8));
    for (let i = 0; i < 4; i++) grp.add(bx(0.005, br * 2, 0.025, M.dark, br * 2.3, by, z1 + blen * (0.15 + i * 0.18)));
    grp.add(cz(br, br, blen, M.metal, 0, by, bz));
  } else grp.add(cz(br, br, blen, M.metal, 0, by, bz));
  if (g.barrel === 'twin') grp.add(bx(br * 4.4, br * 1.6, 0.03, M.metal, 0, by, z1 + blen - 0.02));
  // handguard
  if (['rifle', 'smg', 'sniper', 'lmg', 'shotgun'].includes(g.receiver) && g.barrel !== 'shrouded') {
    const hgL = Math.min(blen * 0.7, 0.32);
    const hgMat = g.receiver === 'shotgun' ? M.accent : M.body;
    grp.add(bx(w * 0.95, h * 0.6, hgL, hgMat, 0, by - h * 0.05, z1 + hgL / 2));
    if (g.receiver === 'shotgun') for (let i = 0; i < 4; i++) grp.add(bx(w * 0.98, 0.01, 0.015, M.dark, 0, by - h * 0.15, z1 + 0.03 + i * 0.05));
  }
  // muzzle device
  let mEnd = z1 + blen;
  const md = g.muzzle;
  if (md === 'suppressor') { grp.add(cz(br * 2.6, br * 2.6, 0.2, M.dark, 0, by, mEnd + 0.1, 12)); mEnd += 0.2; }
  if (md === 'compensator') { grp.add(bx(br * 3.2, br * 3, 0.07, M.metal, 0, by, mEnd + 0.035)); for (let i = 0; i < 2; i++) grp.add(bx(br * 3.3, 0.006, 0.01, M.dark, 0, by + br * 1.5, mEnd + 0.02 + i * 0.025)); mEnd += 0.07; }
  if (md === 'flashhider') { for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; grp.add(bx(0.008, 0.008, 0.06, M.dark, Math.cos(a) * br * 1.4, by + Math.sin(a) * br * 1.4, mEnd + 0.03)); } mEnd += 0.06; }
  if (md === 'choke') { grp.add(cz(br * 1.6, br * 1.2, 0.05, M.accent, 0, by, mEnd + 0.025)); mEnd += 0.05; }
  if (md === 'bayonet') { const k = bx(0.008, 0.035, 0.22, M.metal, 0, by - br * 2.5, mEnd + 0.06); grp.add(k); grp.add(bx(0.03, 0.04, 0.02, M.dark, 0, by - br * 2, mEnd - 0.05)); }
  if (g.receiver === 'blaster') { for (let i = 0; i < 3; i++) { const t = new THREE.Mesh(new THREE.TorusGeometry(br * 2.6, 0.008, 6, 14), M.glow); t.position.set(0, by, z1 + blen * (0.25 + i * 0.25)); grp.add(t); } }

  // stock
  const st = g.stock;
  const sy = yc - h * 0.05;
  if (st === 'folding') {
    grp.add(bx(0.012, 0.012, 0.28, M.metal, 0, sy + 0.03, z0 - 0.14));
    grp.add(bx(0.012, 0.012, 0.28, M.metal, 0, sy - 0.04, z0 - 0.14));
    grp.add(bx(w * 0.6, 0.12, 0.02, M.dark, 0, sy - 0.01, z0 - 0.28));
  } else if (st === 'standard' || st === 'wood') {
    const sm = st === 'wood' ? M.wood : M.body;
    const s = bx(w * 0.75, h * 0.85, 0.3, sm, 0, sy - 0.02, z0 - 0.15); s.rotation.x = 0.08; grp.add(s);
    grp.add(bx(w * 0.8, h * 1.05, 0.03, M.dark, 0, sy - 0.04, z0 - 0.3));
  } else if (st === 'heavy') {
    grp.add(bx(w * 0.95, h * 1.1, 0.34, M.body, 0, sy - 0.03, z0 - 0.17));
    grp.add(bx(w * 0.9, 0.04, 0.16, M.accent, 0, sy + h * 0.6, z0 - 0.15));
    grp.add(bx(w * 1.0, h * 1.25, 0.04, M.dark, 0, sy - 0.04, z0 - 0.34));
  }

  // sight
  const sTop = yc + h / 2 + 0.02;
  const sz = (z0 + z1) / 2 + len * 0.05;
  const sg = g.sight;
  if (sg === 'iron') {
    grp.add(bx(0.01, 0.03, 0.01, M.dark, 0, sTop + 0.005, z1 + blen - 0.03));
    grp.add(bx(0.03, 0.025, 0.012, M.dark, 0, sTop, z0 + 0.04));
  } else if (sg === 'reddot') {
    grp.add(bx(0.045, 0.045, 0.07, M.accent, 0, sTop + 0.025, sz));
    grp.add(bx(0.03, 0.03, 0.005, M.glass, 0, sTop + 0.03, sz + 0.036));
    grp.add(bx(0.006, 0.006, 0.003, M.red, 0, sTop + 0.03, sz + 0.04));
  } else if (sg === 'holo') {
    grp.add(bx(0.05, 0.015, 0.09, M.accent, 0, sTop + 0.005, sz));
    grp.add(bx(0.008, 0.055, 0.02, M.accent, -0.025, sTop + 0.035, sz + 0.035));
    grp.add(bx(0.008, 0.055, 0.02, M.accent, 0.025, sTop + 0.035, sz + 0.035));
    grp.add(bx(0.05, 0.008, 0.02, M.accent, 0, sTop + 0.06, sz + 0.035));
    grp.add(bx(0.042, 0.045, 0.004, M.glass, 0, sTop + 0.035, sz + 0.035));
  } else if (sg === 'scope' || sg === 'sniper' || sg === 'thermal') {
    const L = sg === 'sniper' ? 0.36 : 0.24, r = sg === 'sniper' ? 0.028 : 0.022;
    grp.add(bx(0.02, 0.03, 0.03, M.dark, 0, sTop + 0.01, sz - L * 0.3));
    grp.add(bx(0.02, 0.03, 0.03, M.dark, 0, sTop + 0.01, sz + L * 0.3));
    if (sg === 'thermal') {
      grp.add(bx(0.06, 0.06, L, M.accent, 0, sTop + 0.055, sz));
      grp.add(bx(0.045, 0.04, 0.004, new THREE.MeshBasicMaterial({ color: '#ff5a1f' }), 0, sTop + 0.055, sz - L / 2 - 0.003));
    } else {
      grp.add(cz(r, r, L, M.accent, 0, sTop + 0.04, sz, 12));
      grp.add(cz(r * 1.45, r, 0.06, M.accent, 0, sTop + 0.04, sz + L / 2, 12));
      grp.add(cz(r, r * 1.3, 0.04, M.accent, 0, sTop + 0.04, sz - L / 2, 12));
      grp.add(cz(r * 1.3, r * 1.3, 0.003, M.glass, 0, sTop + 0.04, sz + L / 2 + 0.03, 12));
      grp.add(cz(0.012, 0.012, 0.03, M.dark, 0, sTop + 0.075, sz).rotateX(Math.PI / 2));
    }
  }

  // underbarrel
  const uz = z1 + Math.min(blen * 0.45, 0.15) + (isPistol ? -0.02 : 0);
  const uy = by - h * 0.4;
  const ub = g.under;
  let laserOrigin = null;
  if (ub === 'foregrip') grp.add(bx(0.03, 0.11, 0.035, M.dark, 0, uy - 0.05, uz));
  if (ub === 'angled') { const a = bx(0.03, 0.06, 0.09, M.dark, 0, uy - 0.025, uz); a.rotation.x = 0.5; grp.add(a); }
  if (ub === 'laser' || ub === 'flashlight') {
    if (ub === 'laser') { grp.add(bx(0.03, 0.03, 0.07, M.accent, 0, uy - 0.005, uz)); grp.add(bx(0.012, 0.012, 0.004, M.red, 0, uy - 0.005, uz + 0.037)); }
    else {
      grp.add(cz(0.022, 0.018, 0.09, M.accent, 0, uy - 0.01, uz, 10));
      grp.add(cz(0.02, 0.02, 0.004, new THREE.MeshBasicMaterial({ color: '#fffbe0' }), 0, uy - 0.01, uz + 0.047, 10));
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff6c8', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }));
      beam.rotation.x = -Math.PI / 2; beam.position.set(0, uy - 0.01, uz + 1.15); grp.add(beam);
    }
    laserOrigin = new THREE.Object3D(); laserOrigin.position.set(0, uy - 0.005, uz + 0.04); grp.add(laserOrigin);
  }
  if (ub === 'bipod') {
    const b1 = bx(0.01, 0.01, 0.16, M.metal, -0.015, uy, uz + 0.08); const b2 = bx(0.01, 0.01, 0.16, M.metal, 0.015, uy, uz + 0.08);
    grp.add(b1, b2, bx(0.03, 0.025, 0.03, M.dark, 0, uy, uz));
  }
  if (ub === 'launcher') {
    grp.add(cz(0.04, 0.04, 0.24, M.accent, 0, uy - 0.03, uz + 0.04, 12));
    grp.add(cz(0.03, 0.03, 0.005, M.dark, 0, uy - 0.03, uz + 0.165, 12));
    grp.add(bx(0.02, 0.05, 0.02, M.dark, 0, uy - 0.08, uz - 0.05));
  }

  const muzzle = new THREE.Object3D(); muzzle.position.set(0, by, mEnd + 0.01); grp.add(muzzle);
  grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { group: grp, muzzle, laserOrigin, length: mEnd - (z0 - 0.3), center: new THREE.Vector3(0, yc, (z0 - 0.15 + mEnd) / 2) };
}
