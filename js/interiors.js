// Enterable interiors. Rooms are built far away from the city (at ORIGIN) and the player is moved
// there, so the normal movement, camera and collision code keeps working. South wall is cut away.
import * as THREE from '../lib/three.module.min.js';
import { FURN, buildFurn } from './furniture.js?v=15';
import { addCollider, removeCollider } from './world.js?v=15';
import { buildCar } from './car.js?v=15';

export const ORIGIN = { x: 0, z: 2600 };
const T = (name, w, d, floor, wall, items, npcs, spots, extra = {}) => ({ name, w, d, floor, wall, items, npcs, spots, ...extra });
export const INTERIORS = {
  guns: T('Bay Arms', 18, 14, '#4a443e', '#7a6e62', [['counter', -3, -4.4], ['gunwall', -3, -6.75], ['lane', 4.2, 4.2], ['lane', 6.4, 4.2], ['plant', -8, 5.8], ['sign', -3, -6.8, 0, '#ff5a3c']],
    [{ role: 'gun', x: -3, z: -5.4 }], [{ kind: 'talk', x: -3, z: -3.1, label: 'Talk', icon: 'chat' }, { kind: 'range', x: 5.3, z: 5.4, label: 'Range', icon: 'target' }]),
  clothes: T('Clothes Store', 14, 10, '#e8e2d6', '#f2d6dc', [['counter', 3.6, -3.3, 0, '#e8e2d6'], ['rack', -4, -2.5], ['rack', -4, 1.2, 0, '#2f80ed'], ['rack', -0.5, 1.2, 0, '#ffd23f'], ['mirror', 5.6, -4.85], ['plant', -6, -4.2], ['sign', 0, -4.9, 0, '#ff6fb5']],
    [{ role: 'clerk', x: 3.6, z: -4.25 }], [{ kind: 'talk', x: 3.6, z: -2.1, label: 'Talk', icon: 'chat' }, { kind: 'mirror', x: 5.6, z: -3.6, label: 'Try on', icon: 'shirt' }]),
  barber: T('Barbershop', 11, 8, '#2a2a30', '#e8e2d6', [['barberchair', -3, -2.4], ['barberchair', 0, -2.4], ['barberchair', 3, -2.4], ['mirror', -3, -3.85], ['mirror', 0, -3.85], ['mirror', 3, -3.85], ['pole', 4.9, -3.6], ['chair', -4.4, 2.6, Math.PI / 2], ['chair', -4.4, 1.6, Math.PI / 2]],
    [{ role: 'barber', x: 1.1, z: -2.0 }], [{ kind: 'talk', x: 0.6, z: -0.6, label: 'Talk', icon: 'chat' }]),
  diner: T('Diner', 14, 10, '#d8d2c8', '#9fd8e8', [['counter', -3, -3.3, 0, '#c9302c'], ['stool', -4.2, -2.3], ['stool', -3, -2.3], ['stool', -1.8, -2.3], ['booth', 3.8, -2.4], ['booth', 3.8, 1.6], ['sign', 0, -4.9, 0, '#38e8ff']],
    [{ role: 'waiter', x: -3, z: -4.2 }], [{ kind: 'talk', x: -3, z: -1.4, label: 'Order', icon: 'food' }]),
  mart: T('QuickMart', 12, 10, '#e8e8ea', '#f6f6f6', [['shelf', -2.5, -3.9], ['shelf', -2.5, 0.2], ['counter', 3.5, -1.5, 0, '#3a3d45'], ['fridge', 5.3, -4.3, 0, '#e8e8ea'], ['fridge', 4.3, -4.3, 0, '#e8e8ea']],
    [{ role: 'cashier', x: 3.5, z: -2.4 }], [{ kind: 'talk', x: 3.5, z: -0.3, label: 'Buy', icon: 'cart' }]),
  gym: T('Iron Temple Gym', 16, 12, '#2f3036', '#5a5d66', [['bench', -5.5, -3.6], ['bench', -2.5, -3.6], ['tread', 3, -3.6], ['tread', 5, -3.6], ['bag', -5.5, 2.6], ['bag', -3.5, 2.6], ['mirror', 0, -5.85], ['sign', 0, -5.9, 0, '#ff8a2a']],
    [{ role: 'trainer', x: 0.5, z: -1 }], [{ kind: 'lift', x: -4, z: -1.7, label: 'Lift', icon: 'dumbbell' }, { kind: 'tread', x: 4, z: -1.6, label: 'Run', icon: 'run' }, { kind: 'bag', x: -4.5, z: 4.2, label: 'Box', icon: 'fist' }, { kind: 'talk', x: 0.5, z: 0.4, label: 'Talk', icon: 'chat' }]),
  casino: T('Lucky 7 Casino', 18, 14, '#5a1a2a', '#2a1020', [['bjtable', -4, -2], ['bjtable', 1, -2], ['slot', 5, -6.3], ['slot', 6, -6.3], ['slot', 7, -6.3], ['counter', -6, -5.6, 0, '#c9a24a'], ['sign', 0, -6.9, 0, '#ffd23f'], ['palm', -8, 6], ['palm', 8, 6]],
    [{ role: 'croupier', x: -4, z: -2.7 }, { role: 'croupier', x: 1, z: -2.7 }, { role: 'cashier', x: -6, z: -6.4 }], [{ kind: 'blackjack', x: -4, z: -0.4, label: 'Blackjack', icon: 'cards' }, { kind: 'blackjack', x: 1, z: -0.4, label: 'Blackjack', icon: 'cards' }, { kind: 'slots', x: 6, z: -5, label: 'Slots', icon: 'slots' }, { kind: 'talk', x: -6, z: -4.4, label: 'Cashier', icon: 'chat' }], { light: '#ffcf8a' }),
  motors: T('Bay Motors', 24, 16, '#d8d8de', '#eef2f6', [['podium', -7, -2.5], ['podium', 0, -3.5], ['podium', 7, -2.5], ['counter', 0, 4.4, 0, '#3a3d45'], ['plant', -11, 7], ['plant', 11, 7], ['sign', 0, -7.9, 0, '#2f80ed']],
    [{ role: 'sales', x: 0, z: 3.5 }], [{ kind: 'talk', x: 0, z: 5.6, label: 'Talk', icon: 'chat' }], { cars: [[-7, -2.5], [0, -3.5], [7, -2.5]] }),
  casa: T('Casa Bay Furniture', 16, 12, '#c9b89a', '#f2ebe0', [['couch', -5, -4], ['tv', -5, -5.5], ['bed', 1, -3.6], ['bookshelf', 5.6, -5.6], ['aquarium', 6, 0], ['arcade', 6.6, 3.5], ['palm', -7, 4.5], ['rug', -5, -2], ['counter', 3, 3.8, 0, '#7a5230'], ['lamp', -2.6, -5.3]],
    [{ role: 'clerk', x: 3, z: 2.9 }], [{ kind: 'talk', x: 3, z: 5.1, label: 'Browse', icon: 'sofa' }]),
  bar: T('The Anchor', 12, 10, '#5a4030', '#3a2a1a', [['barcounter', 0, -3.3], ['stool', -1.5, -2.4], ['stool', 0, -2.4], ['stool', 1.5, -2.4], ['table', -3.5, 2, 0, '#7a5230'], ['table', 3.5, 2, 0, '#7a5230'], ['chair', -4.6, 2], ['chair', 4.6, 2]],
    [{ role: 'bartender', x: 0, z: -4.2 }], [{ kind: 'talk', x: 0, z: -1.4, label: 'Order', icon: 'drink' }], { light: '#ffb35c' }),
  hospital: T('Bay General Hospital', 20, 14, '#e4eaee', '#f4f7f9', [['counter', -6, -3.8], ['plant', -9.2, -6.2], ['plant', -9.2, 5.6], ['chair', -8.6, 1.2], ['chair', -7.6, 1.2], ['chair', -6.6, 1.2], ['chair', -8.6, 3], ['chair', -7.6, 3], ['chair', -6.6, 3],
    ['hbed', 0.5, -5.4], ['curtain', 2, -5.3], ['hbed', 3.5, -5.4], ['curtain', 5, -5.3], ['hbed', 6.5, -5.4], ['monitor', 1.4, -6.4], ['monitor', 4.4, -6.4], ['monitor', 7.4, -6.4], ['hbed', 8.4, 2.5, Math.PI / 2], ['curtain', 8.4, 0.6, Math.PI / 2], ['monitor', 9.4, 3.6], ['sign', -6, -6.9, 0, '#e23b3b']],
    [{ role: 'nurse', x: -6, z: -5 }, { role: 'doctor', x: 3.5, z: -2.6 }], [{ kind: 'talk', x: -6, z: -2.6, label: 'Reception', icon: 'cross' }, { kind: 'rest', x: 0.5, z: -3.6, label: 'Rest ($150)', icon: 'bed' }, { kind: 'talk', x: 3.5, z: -1.4, label: 'Doctor', icon: 'chat' }], { light: '#e8f4ff' }),
  church: T('Bay Chapel', 14, 20, '#9a8a74', '#ece4d0', [['altar', 0, -7.4], ['candles', -2.2, -8.2], ['candles', 2.2, -8.2], ['stained', -3.6, -9.9], ['stained', 0, -9.9], ['stained', 3.6, -9.9], ['rug', 0, -2, 0, '#8b1e3f'], ['rug', 0, 1.6, 0, '#8b1e3f'], ['plant', -6.2, -8.6], ['plant', 6.2, -8.6],
    ['pew', -3.8, -4], ['pew', 3.8, -4], ['pew', -3.8, -2], ['pew', 3.8, -2], ['pew', -3.8, 0], ['pew', 3.8, 0], ['pew', -3.8, 2], ['pew', 3.8, 2], ['pew', -3.8, 4], ['pew', 3.8, 4]],
    [{ role: 'pastor', x: 0, z: -8.6 }], [{ kind: 'talk', x: 0, z: -6.1, label: 'Talk', icon: 'chat' }, { kind: 'pray', x: 0, z: 2.6, label: 'Sit & reflect', icon: 'heart' }], { light: '#ffe2b0' }),
  club: T('Neon Room', 18, 14, '#14101e', '#1e1430', [['dancefloor', 0, 0.5], ['djbooth', 0, -5], ['barcounter', -6.5, 4.5], ['sign', 0, -6.9, 0, '#38e8ff']],
    [{ role: 'dj', x: 0, z: -5.9 }, { role: 'bartender', x: -6.5, z: 3.6 }], [{ kind: 'dj', x: 0, z: -3.9, label: 'DJ', icon: 'music' }, { kind: 'dance', x: 0, z: 0.5, label: 'Dance', icon: 'smile' }, { kind: 'talk', x: -6.5, z: 5.9, label: 'Bar', icon: 'drink' }], { light: '#b26bff', dark: true }),
  // homes
  studio: T('Studio', 10, 8, '#c9b89a', '#e8e2d6', [], [], [], { home: true }),
  apartment: T('Apartment', 14, 10, '#b89a7a', '#e6e9f0', [], [], [], { home: true }),
  house: T('House', 18, 12, '#a0805a', '#efe6d6', [], [], [], { home: true }),
  mansion: T('Mansion', 26, 18, '#e8e2d6', '#fff8ee', [], [], [], { home: true }),
};
export const STARTER_FURNITURE = [{ t: 'single', x: -3, z: -2.2, r: 0, c: '#3a5fa0' }, { t: 'fridge', x: 3.6, z: -3.4, r: 0 }, { t: 'plant', x: 4.2, z: 2.6, r: 0 }, { t: 'armchair', x: 0.5, z: -2.6, r: 0 }];

const MAT = new Map();
const mat = (c, o = {}) => { const k = c + JSON.stringify(o); if (!MAT.has(k)) MAT.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...o })); return MAT.get(k); };
function box(g, w, h, d, c, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); m.position.set(x, y + h / 2, z); m.receiveShadow = true; m.castShadow = true; g.add(m); return m; }

// Build a room. furniture: [{t,x,z,r,c}] (homes). Returns handle with dispose().
export function buildInterior(id, furniture = null, carCfgs = []) {
  const tpl = INTERIORS[id], g = new THREE.Group(), cols = [];
  g.position.set(ORIGIN.x, 0, ORIGIN.z);
  const { w, d } = tpl, H = 3.2, t = 0.3;
  const floor = box(g, w, 0.1, d, tpl.floor, 0, -0.1, 0); floor.castShadow = false;
  // floor pattern
  for (let i = 0; i < w / 2; i++) for (let j = 0; j < d / 2; j++) if ((i + j) % 2 === 0) { const q = box(g, 1.98, 0.01, 1.98, new THREE.Color(tpl.floor).multiplyScalar(0.92).getStyle(), -w / 2 + 1 + i * 2, 0, -d / 2 + 1 + j * 2); q.castShadow = false; }
  const wallC = tpl.wall, trim = new THREE.Color(tpl.wall).multiplyScalar(0.7).getStyle();
  box(g, w + t * 2, H, t, wallC, 0, 0, -d / 2 - t / 2);                       // north
  box(g, t, H, d + t, wallC, -w / 2 - t / 2, 0, 0); box(g, t, H, d + t, wallC, w / 2 + t / 2, 0, 0); // west/east
  box(g, w + t * 2, 0.12, t + 0.02, trim, 0, H - 0.12, -d / 2 - t / 2);
  const dw = 2.4; // south: low cutaway wall with door gap
  for (const s of [-1, 1]) box(g, (w - dw) / 2 + t, 0.5, t, trim, s * ((w - dw) / 4 + dw / 2 + t / 2), 0, d / 2 + t / 2);
  box(g, dw, 0.02, 1.2, '#3a2a1a', 0, 0, d / 2 - 0.3); // door mat
  // outside: sidewalk, kerb and road so the view past the cutaway isn't a void
  const out = (ww, dd, c, x, z, y = -0.12) => { const m = box(g, ww, 0.1, dd, c, x, y, z); m.castShadow = false; return m; };
  out(w + 40, 5, '#b9b4ad', 0, d / 2 + t + 2.5);
  for (let i = -w / 2 - 20; i < w / 2 + 20; i += 2.5) out(0.06, 5, '#a29d96', i, d / 2 + t + 2.5, -0.115);
  out(w + 40, 0.3, '#d8d2c8', 0, d / 2 + t + 5.15, -0.06);
  out(w + 40, 30, '#3d3d44', 0, d / 2 + t + 20.3, -0.16);
  for (let i = -w / 2 - 18; i < w / 2 + 20; i += 6) out(3, 0.25, '#e8e2c8', i, d / 2 + t + 11, -0.1);
  out(w + 40, 30, '#2a2a30', 0, -d / 2 - 15, -0.16); out(20, d + 2, '#2a2a30', -w / 2 - 10.3, 0, -0.16); out(20, d + 2, '#2a2a30', w / 2 + 10.3, 0, -0.16);
  const wc = (x0, z0, x1, z1) => ({ x0: ORIGIN.x + x0, z0: ORIGIN.z + z0, x1: ORIGIN.x + x1, z1: ORIGIN.z + z1, h: 9 });
  cols.push(wc(-w / 2 - 1, -d / 2 - 1, w / 2 + 1, -d / 2), wc(-w / 2 - 1, -d / 2, -w / 2, d / 2 + 1), wc(w / 2, -d / 2, w / 2 + 1, d / 2 + 1), wc(-w / 2, d / 2, -dw / 2, d / 2 + 1), wc(dw / 2, d / 2, w / 2, d / 2 + 1));
  // lights
  const lc = tpl.light || '#fff1dc';
  for (const [x, z] of [[-w / 4, -d / 6], [w / 4, -d / 6], [0, d / 4]]) { const l = new THREE.PointLight(lc, tpl.dark ? 12 : 18, Math.max(w, d) * 1.1, 1.4); l.position.set(x, H - 0.3, z); g.add(l); }
  // fixtures
  const furn = [];
  const place = (t, x, z, r = 0, c) => {
    const f = FURN[t]; if (!f) return null;
    const m = buildFurn(t, c); m.position.set(x, 0, z); m.rotation.y = r; g.add(m);
    const item = { t, x, z, r, c, mesh: m, col: null };
    if (!f.flat && t !== 'lane' && t !== 'sign' && t !== 'painting') { const sw = Math.abs(Math.cos(r)) > 0.5 ? f.w : f.d, sd = Math.abs(Math.cos(r)) > 0.5 ? f.d : f.w; item.col = { x0: ORIGIN.x + x - sw / 2, x1: ORIGIN.x + x + sw / 2, z0: ORIGIN.z + z - sd / 2, z1: ORIGIN.z + z + sd / 2, h: 2.5 }; addCollider(item.col); }
    furn.push(item); return item;
  };
  for (const [t, x, z, r, c] of tpl.items) place(t, x, z, r, c);
  if (furniture) for (const f of furniture) place(f.t, f.x, f.z, f.r, f.c);
  // showroom cars
  const cars = [];
  if (tpl.cars) tpl.cars.forEach(([x, z], i) => { if (!carCfgs[i]) return; const c = buildCar(carCfgs[i]); c.group.position.set(x, 0.15, z); c.group.rotation.y = 0.6 - i * 0.6; g.add(c.group); cars.push(c); const col = { x0: ORIGIN.x + x - 2.6, x1: ORIGIN.x + x + 2.6, z0: ORIGIN.z + z - 2.6, z1: ORIGIN.z + z + 2.6, h: 2 }; cols.push(col); });
  for (const c of cols) addCollider(c);
  return {
    id, tpl, group: g, furn, cars, w, d,
    toWorld: (x, z) => ({ x: ORIGIN.x + x, z: ORIGIN.z + z }),
    inside: (x, z, m = 0.4) => Math.abs(x - ORIGIN.x) < w / 2 - m && z - ORIGIN.z > -d / 2 + m && z - ORIGIN.z < d / 2 + 0.9,
    place,
    remove(item) { if (item.col) removeCollider(item.col); g.remove(item.mesh); furn.splice(furn.indexOf(item), 1); },
    move(item, x, z, r) { if (item.col) removeCollider(item.col); g.remove(item.mesh); furn.splice(furn.indexOf(item), 1); return place(item.t, x, z, r, item.c); },
    dispose() { for (const c of cols) removeCollider(c); for (const f of furn) if (f.col) removeCollider(f.col); g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); },
  };
}
