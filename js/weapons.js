// The arsenal: every weapon slot, how it looks in the hand, its stats and its icon.
import * as THREE from '../lib/three.module.min.js';
import { buildGun, computeStats, GUN_PRESETS, DEFAULT_GUN, GUN_SCHEMA } from './gun.js?v=45';

export const SLOTS = [
  { id: 'fist', name: 'Fists', kind: 'melee', price: 0 },
  { id: 'bat', name: 'Baseball Bat', kind: 'melee', price: 150 },
  { id: 'pistol', name: 'Pistol', kind: 'gun', receivers: ['pistol', 'revolver'], price: 600, ammoPer: 2 },
  { id: 'smg', name: 'SMG', kind: 'gun', receivers: ['smg'], price: 2200, ammoPer: 2 },
  { id: 'shotgun', name: 'Shotgun', kind: 'gun', receivers: ['shotgun'], price: 2800, ammoPer: 6 },
  { id: 'ar', name: 'Assault Rifle', kind: 'gun', receivers: ['rifle', 'lmg', 'blaster'], price: 5500, ammoPer: 3 },
  { id: 'sniper', name: 'Sniper Rifle', kind: 'gun', receivers: ['sniper'], price: 9000, ammoPer: 15 },
  { id: 'rpg', name: 'RPG', kind: 'rpg', price: 18000, ammoPer: 450 },
  { id: 'grenade', name: 'Grenades', kind: 'grenade', price: 0, ammoPer: 140 },
];
export const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s]));
export const DEFAULT_CFGS = {
  pistol: { ...DEFAULT_GUN, ...GUN_PRESETS['Sidearm'] },
  smg: { ...DEFAULT_GUN, ...GUN_PRESETS['Bullet Hose'] },
  shotgun: { ...DEFAULT_GUN, ...GUN_PRESETS['Boomstick'] },
  ar: { ...DEFAULT_GUN, ...GUN_PRESETS['Trooper'] },
  sniper: { ...DEFAULT_GUN, ...GUN_PRESETS['Longshot'] },
};
export function slotForReceiver(r) { return SLOTS.find(s => s.receivers?.includes(r))?.id || 'ar'; }

export function newArsenal(oldGunCfg) {
  const a = { owned: ['fist', 'pistol'], cfg: JSON.parse(JSON.stringify(DEFAULT_CFGS)), ammo: {}, cur: 'pistol', last: 'pistol' };
  if (oldGunCfg && oldGunCfg.receiver) { const s = slotForReceiver(oldGunCfg.receiver); a.cfg[s] = { ...DEFAULT_GUN, ...oldGunCfg }; if (!a.owned.includes(s)) a.owned.push(s); a.cur = a.last = s; }
  for (const s of SLOTS) a.ammo[s.id] = { mag: 0, res: 0 };
  for (const id of a.owned) { const st = slotStats(id, a.cfg[id]); a.ammo[id] = { mag: st.mag || 0, res: (st.mag || 0) * 3 }; }
  return a;
}

export function slotStats(id, cfg) {
  const s = SLOT[id];
  if (s.kind === 'gun') return { ...computeStats(cfg), kind: 'gun' };
  if (id === 'fist') return { kind: 'melee', cd: 0.38, reach: 1.7, power: 4.5, mag: 0, mob: 1.05 };
  if (id === 'bat') return { kind: 'melee', cd: 0.62, reach: 2.4, power: 8, mag: 0, mob: 1 };
  if (id === 'rpg') return { kind: 'rpg', mag: 1, reload: 2.4, rof: 0.8, speed: 34, range: 75, mob: 0.85, recoil: 0.9 };
  return { kind: 'grenade', mag: 0, rof: 1.1, mob: 1 };
}
export function maxReserve(id, st) { if (id === 'rpg') return 10; if (id === 'grenade') return 15; return Math.min(400, (st.mag || 10) * 10); }
// What a box of ammo gives and costs.
export function ammoBox(id, st) {
  if (id === 'rpg') return { n: 2, price: SLOT.rpg.ammoPer * 2 };
  if (id === 'grenade') return { n: 3, price: SLOT.grenade.ammoPer * 3 };
  const n = Math.min(120, Math.max(10, (st.mag || 10) * 2));
  return { n, price: n * SLOT[id].ammoPer };
}

// Gunsmith: schema limited to this slot's frames, and what each change costs.
export function smithSchema(id) {
  const rec = SLOT[id].receivers;
  return GUN_SCHEMA.map(t => ({ ...t, items: t.items.map(it => it.key === 'receiver' ? { ...it, options: it.options.filter(o => rec.includes(o[0])) } : it).filter(it => !(it.key === 'receiver' && rec.length < 2)) }));
}
export const SMITH_PRICES = { receiver: 400, fireMode: 200, barrel: 150, muzzle: 150, stock: 150, grip: 120, magazine: 180, sight: 150, under: 150, ammo: 220, finish: 120, bodyColor: 40, accentColor: 40, metalColor: 40, tracer: 40, name: 0 };

// ---------------- models
function mesh(geo, color, x = 0, y = 0, z = 0, opt = {}) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, flatShading: true, ...opt }));
  m.position.set(x, y, z); m.castShadow = true; return m;
}
export function buildWeaponModel(id, cfg) {
  const s = SLOT[id];
  if (s.kind === 'gun') return buildGun(cfg);
  const group = new THREE.Group(), muzzle = new THREE.Object3D();
  if (id === 'bat') {
    const handle = mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.35, 8), '#2a2a2a', 0, 0.02, 0.05); handle.rotation.x = Math.PI / 2; group.add(handle);
    const barrel = mesh(new THREE.CylinderGeometry(0.055, 0.032, 0.62, 10), '#c08a4f', 0, 0.02, 0.5); barrel.rotation.x = Math.PI / 2; group.add(barrel);
    muzzle.position.set(0, 0.02, 0.8);
  } else if (id === 'rpg') {
    const tube = mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.15, 12), '#55602f', 0, 0.1, 0.2); tube.rotation.x = Math.PI / 2; group.add(tube);
    const war = mesh(new THREE.ConeGeometry(0.11, 0.32, 10), '#4a4d55', 0, 0.1, 0.92); war.rotation.x = Math.PI / 2; group.add(war);
    const bell = mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.12, 12), '#3a3d45', 0, 0.1, -0.42); bell.rotation.x = Math.PI / 2; group.add(bell);
    group.add(mesh(new THREE.BoxGeometry(0.04, 0.14, 0.05), '#2a2a2a', 0, -0.03, 0.02));
    group.add(mesh(new THREE.BoxGeometry(0.04, 0.12, 0.05), '#2a2a2a', 0, -0.02, 0.3));
    group.add(mesh(new THREE.BoxGeometry(0.03, 0.08, 0.12), '#2a2a2a', 0.08, 0.18, 0.15));
    muzzle.position.set(0, 0.1, 1.1);
  } else if (id === 'grenade') {
    group.add(mesh(new THREE.IcosahedronGeometry(0.075, 0), '#55602f', 0, 0, 0.04));
    group.add(mesh(new THREE.BoxGeometry(0.03, 0.05, 0.03), '#9aa0aa', 0, 0.07, 0.04, { metalness: 0.8 }));
    muzzle.position.set(0, 0, 0.1);
  }
  group.add(muzzle);
  return { group, muzzle, laserOrigin: null, length: 1, center: new THREE.Vector3() };
}

// ---------------- icons (SVG silhouettes, white)
const ICON = {
  fist: '<path d="M7 10V7a1.5 1.5 0 0 1 3 0V6a1.5 1.5 0 0 1 3 0v.5a1.5 1.5 0 0 1 3 0V8a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-1a5 5 0 0 1-5-5v-2a2 2 0 0 1 2-2h2"/>',
  bat: '<path d="M4 20l2 0 12-13a2.5 2.5 0 0 0-3.5-3.5L2 16v2z" /><path d="M3.5 19.5l2-2"/>',
  pistol: '<path d="M3 7h16v4h-7l-1 2h-2l-1 6H5l1.2-6H3z"/><path d="M10 11v2"/>',
  smg: '<path d="M2 8h17v3h-4l-1 2h-3l-1 6H7l1-6H6v-2H2z"/><path d="M19 9h3M11 13v4"/>',
  shotgun: '<path d="M1 9h21v2.5H11l-2 1.5H4l-2 3H1z"/><path d="M12 11.5h5v1.5h-5z"/>',
  ar: '<path d="M1 8l3 1h16v2.5h-5l-1 1.5h-3l-1 5H8l1-5H5l-3 2H1z"/><path d="M12 13l1 4h2"/><path d="M9 6h4v2"/>',
  sniper: '<path d="M1 10l3 1h18v1.5H13l-2 1H7l-1 4H4l.5-4H2z"/><path d="M8 7h7v2.5H8z"/><path d="M11 9.5V11"/>',
  rpg: '<path d="M2 10h15v4H2z"/><path d="M17 9l5 3-5 3z"/><path d="M6 14v4M11 14v3"/><path d="M1 9.5h1v5H1z"/>',
  grenade: '<circle cx="12" cy="14" r="6"/><path d="M10 8V6h4v2M14 6h3l1 2"/><path d="M8 14h8M12 10v8"/>',
};
export function iconSVG(id, cls = '') { return `<svg viewBox="0 0 24 24" class="wicon ${cls}">${ICON[id] || ''}</svg>`; }
