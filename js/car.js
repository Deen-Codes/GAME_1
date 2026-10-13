// Modular car builder. Car faces +Z, sits on y=0, origin at the centre of the wheelbase.
import * as THREE from '../lib/three.module.min.js';
import { BASIC } from './character.js?v=37';
import { patternTexture } from './gun.js?v=37';

export const BODIES = {
  hatch:  { label: 'Hatchback', L: 3.8, W: 1.75, bh: 0.55, cl: 2.0, ch: 0.62, co: -0.4,  wr: 0.34, mass: 1.0 },
  sedan:  { label: 'Saloon',    L: 4.6, W: 1.8,  bh: 0.55, cl: 2.2, ch: 0.58, co: -0.15, wr: 0.36, mass: 1.05 },
  coupe:  { label: 'Coupé',     L: 4.3, W: 1.84, bh: 0.5,  cl: 1.7, ch: 0.5,  co: -0.3,  wr: 0.36, mass: 1.0 },
  sports: { label: 'Supercar',  L: 4.5, W: 2.0,  bh: 0.42, cl: 1.6, ch: 0.42, co: -0.2,  wr: 0.37, mass: 0.9 },
  muscle: { label: 'Muscle',    L: 4.9, W: 1.92, bh: 0.6,  cl: 1.8, ch: 0.5,  co: -0.55, wr: 0.39, mass: 1.1 },
  pickup: { label: 'Pickup',    L: 5.3, W: 1.98, bh: 0.72, cl: 1.7, ch: 0.72, co: 0.75,  wr: 0.43, mass: 1.2, bed: true },
  van:    { label: 'Van',       L: 5.0, W: 2.0,  bh: 0.8,  cl: 3.9, ch: 1.05, co: -0.45, wr: 0.38, mass: 1.3 },
  buggy:  { label: 'Buggy',     L: 3.6, W: 1.9,  bh: 0.35, cl: 1.6, ch: 0.8,  co: -0.3,  wr: 0.46, mass: 0.8, open: true },
  limo:   { label: 'Limo',      L: 6.6, W: 1.9,  bh: 0.55, cl: 4.2, ch: 0.55, co: -0.25, wr: 0.36, mass: 1.4 },
  suv:    { label: 'SUV',       L: 4.8, W: 2.0,  bh: 0.78, cl: 2.6, ch: 0.75, co: -0.35, wr: 0.42, mass: 1.25 },
  convertible: { label: 'Convertible', L: 4.4, W: 1.86, bh: 0.5, cl: 1.4, ch: 0.42, co: -0.2, wr: 0.36, mass: 0.95, topless: true },
  wagon:  { label: 'Wagon',     L: 4.8, W: 1.82, bh: 0.55, cl: 3.0, ch: 0.58, co: -0.55, wr: 0.36, mass: 1.08 },
  lowrider: { label: 'Lowrider', L: 5.2, W: 1.95, bh: 0.46, cl: 2.2, ch: 0.48, co: -0.35, wr: 0.33, mass: 1.15 },
  classic: { label: 'Classic',  L: 5.1, W: 1.95, bh: 0.6,  cl: 2.0, ch: 0.52, co: -0.25, wr: 0.38, mass: 1.1, fins: true },
  boxtruck: { label: 'Box Truck', L: 6.3, W: 2.2, bh: 0.8, cl: 1.4, ch: 0.95, co: 2.0, wr: 0.45, mass: 1.6, box: true },
  hyper:  { label: 'Hypercar',  L: 4.7, W: 2.05, bh: 0.38, cl: 1.5, ch: 0.38, co: -0.05, wr: 0.38, mass: 0.85 },
  tractor: { label: 'Tractor', L: 3.8, W: 2.1, bh: 0.9, cl: 1.2, ch: 1.1, co: -0.6, wr: 0.75, mass: 1.6, tractor: true },
  moto:   { label: 'Motorbike', L: 2.1, W: 0.7, bh: 0.5, cl: 0, ch: 0, co: 0, wr: 0.33, mass: 0.45, two: 'moto' },
  bike:   { label: 'Bicycle',   L: 1.75, W: 0.55, bh: 0.4, cl: 0, ch: 0, co: 0, wr: 0.34, mass: 0.3, two: 'bike' },
  scooter: { label: 'E-scooter', L: 1.2, W: 0.5, bh: 0.2, cl: 0, ch: 0, co: 0, wr: 0.12, mass: 0.3, two: 'scooter' },
};
const o = (label, m = {}) => ({ label, m });
export const CAR_PARTS = {
  engine: { eco: o('Eco', { top: 24, acc: 7 }), stock: o('Stock', { top: 32, acc: 10 }), sport: o('Sport', { top: 40, acc: 13 }), race: o('Race', { top: 48, acc: 17 }), rocket: o('Rocket', { top: 60, acc: 22 }) },
  tyres: { street: o('Street', { grip: 1 }), sport: o('Low profile', { grip: 1.2 }), offroad: o('Mud terrain', { grip: 0.95, off: 1.5 }), drift: o('Drift (stretched)', { grip: 0.65 }), whitewall: o('Whitewall', { grip: 0.95 }), slick: o('Racing slick', { grip: 1.3, off: 0.7 }) },
  suspension: { lowered: o('Lowered', { grip: 1.08, off: 0.8 }), stock: o('Stock'), lifted: o('Lifted', { grip: 0.92, off: 1.25 }) },
  wheels: { steel: o('Steel'), fivespoke: o('Five-spoke'), mesh: o('Mesh'), deepdish: o('Deep dish'), offroad: o('Beadlock'), turbine: o('Turbine'), wire: o('Wire spoke'), aero: o('Aero disc'), split: o('Split spoke') },
  wheelSize: { s: o('Small'), m: o('Medium'), l: o('Large', { off: 1.1 }) },
  front: { stock: o('Stock'), lip: o('Splitter', { grip: 1.03 }), bullbar: o('Bull bar', { off: 1.05 }), pushbar: o('Push bar') },
  rear: { stock: o('Stock'), diffuser: o('Diffuser', { grip: 1.02 }), hitch: o('Tow hitch') },
  spoiler: { none: o('None'), lip: o('Lip'), ducktail: o('Ducktail', { grip: 1.02 }), wing: o('Wing', { grip: 1.05 }), gt: o('GT wing', { grip: 1.08, top: 0.97 }) },
  hood: { stock: o('Stock'), scoop: o('Scoop'), vents: o('Vents'), blower: o('Supercharger', { acc: 1.1 }) },
  roof: { none: o('None'), rack: o('Roof rack'), box: o('Roof box'), lightbar: o('Light bar'), taxi: o('Taxi sign'), police: o('Siren') },
  exhaust: { single: o('Single'), dual: o('Dual'), quad: o('Quad'), side: o('Side pipes') },
  skirts: { none: o('None'), skirts: o('Side skirts') },
  decal: { none: o('None'), stripes: o('Racing stripes'), side: o('Side stripe'), twotone: o('Two-tone') },
  finish: { gloss: o('Gloss'), matte: o('Matte'), metallic: o('Metallic'), chrome: o('Chrome'), camo: o('Camo'), carbon: o('Carbon') },
  tint: { clear: o('Clear'), smoke: o('Smoke'), black: o('Limo black'), gold: o('Gold') },
};
const opts = obj => Object.entries(obj).map(([k, v]) => [k, v.label]);
const LIGHT_COLS = ['#ffffff', '#fff2b0', '#9fd8ff', '#c9a0ff', '#ff6fb5', '#4cff7a'];
const GLOW_COLS = ['#ff2a6a', '#b26bff', '#3d8bff', '#38e8ff', '#4cff7a', '#ffd23f', '#ff8a2a', '#ffffff'];

export const CAR_SCHEMA = [
  { tab: 'Body', items: [
    { key: 'name', type: 'text', label: 'Name' },
    { key: 'body', type: 'choice', label: 'Body', options: opts(BODIES) },
    { key: 'front', type: 'choice', label: 'Front bumper', options: opts(CAR_PARTS.front) },
    { key: 'rear', type: 'choice', label: 'Rear', options: opts(CAR_PARTS.rear) },
    { key: 'skirts', type: 'choice', label: 'Side skirts', options: opts(CAR_PARTS.skirts) },
  ] },
  { tab: 'Parts', items: [
    { key: 'spoiler', type: 'choice', label: 'Spoiler', options: opts(CAR_PARTS.spoiler) },
    { key: 'hood', type: 'choice', label: 'Bonnet', options: opts(CAR_PARTS.hood) },
    { key: 'roof', type: 'choice', label: 'Roof', options: opts(CAR_PARTS.roof) },
    { key: 'exhaust', type: 'choice', label: 'Exhaust', options: opts(CAR_PARTS.exhaust) },
  ] },
  { tab: 'Wheels', items: [
    { key: 'wheels', type: 'choice', label: 'Rims', options: opts(CAR_PARTS.wheels) },
    { key: 'wheelSize', type: 'choice', label: 'Size', options: opts(CAR_PARTS.wheelSize) },
    { key: 'rimColor', type: 'color', label: 'Rim colour', palette: ['#c9ccd2', '#2a2b30', '#d4af37', '#ffffff', '#e23b3b', '#2f80ed', '#4cd964', '#ff8a2a'] },
    { key: 'suspension', type: 'choice', label: 'Suspension', options: opts(CAR_PARTS.suspension) },
    { key: 'tyres', type: 'choice', label: 'Tyres', options: opts(CAR_PARTS.tyres) },
  ] },
  { tab: 'Engine', items: [
    { key: 'engine', type: 'choice', label: 'Engine', options: opts(CAR_PARTS.engine) },
  ] },
  { tab: 'Paint', items: [
    { key: 'finish', type: 'choice', label: 'Finish', options: opts(CAR_PARTS.finish) },
    { key: 'bodyColor', type: 'color', label: 'Body', palette: BASIC },
    { key: 'accentColor', type: 'color', label: 'Accent / decals', palette: BASIC },
    { key: 'decal', type: 'choice', label: 'Decals', options: opts(CAR_PARTS.decal) },
    { key: 'tint', type: 'choice', label: 'Window tint', options: opts(CAR_PARTS.tint) },
  ] },
  { tab: 'Lights', items: [
    { key: 'headlights', type: 'color', label: 'Headlights', palette: LIGHT_COLS },
    { key: 'underglow', type: 'choice', label: 'Underglow', options: [['off', 'Off'], ['on', 'On']] },
    { key: 'glowColor', type: 'color', label: 'Underglow colour', palette: GLOW_COLS },
  ] },
];

export const DEFAULT_CAR = {
  name: 'Sunset Cruiser', body: 'coupe', front: 'lip', rear: 'diffuser', skirts: 'skirts', spoiler: 'ducktail', hood: 'vents', roof: 'none', exhaust: 'dual',
  wheels: 'fivespoke', wheelSize: 'm', rimColor: '#c9ccd2', suspension: 'lowered', tyres: 'sport', engine: 'sport',
  finish: 'metallic', bodyColor: '#e23b3b', accentColor: '#16161b', decal: 'stripes', tint: 'smoke', headlights: '#ffffff', underglow: 'off', glowColor: '#38e8ff',
};
export const CAR_PRESETS = {
  'Cruiser': { ...DEFAULT_CAR },
  'Taxi': { name: 'Bay Cab', body: 'sedan', front: 'stock', rear: 'stock', skirts: 'none', spoiler: 'none', hood: 'stock', roof: 'taxi', exhaust: 'single', wheels: 'steel', wheelSize: 'm', rimColor: '#c9ccd2', suspension: 'stock', tyres: 'street', engine: 'stock', finish: 'gloss', bodyColor: '#ffd23f', accentColor: '#16161b', decal: 'side', tint: 'clear', headlights: '#fff2b0', underglow: 'off', glowColor: '#ffffff' },
  'Hypercar': { name: 'Neon Dart', body: 'sports', front: 'lip', rear: 'diffuser', skirts: 'skirts', spoiler: 'gt', hood: 'vents', roof: 'none', exhaust: 'quad', wheels: 'turbine', wheelSize: 'l', rimColor: '#2a2b30', suspension: 'lowered', tyres: 'sport', engine: 'rocket', finish: 'carbon', bodyColor: '#16161b', accentColor: '#38e8ff', decal: 'stripes', tint: 'black', headlights: '#9fd8ff', underglow: 'on', glowColor: '#38e8ff' },
  'Muscle': { name: 'Big Block', body: 'muscle', front: 'stock', rear: 'stock', skirts: 'none', spoiler: 'ducktail', hood: 'blower', roof: 'none', exhaust: 'side', wheels: 'deepdish', wheelSize: 'l', rimColor: '#c9ccd2', suspension: 'stock', tyres: 'drift', engine: 'race', finish: 'gloss', bodyColor: '#ff8a2a', accentColor: '#16161b', decal: 'stripes', tint: 'smoke', headlights: '#fff2b0', underglow: 'off', glowColor: '#ff8a2a' },
  'Off-roader': { name: 'Mud Goat', body: 'pickup', front: 'bullbar', rear: 'hitch', skirts: 'none', spoiler: 'none', hood: 'scoop', roof: 'lightbar', exhaust: 'single', wheels: 'offroad', wheelSize: 'l', rimColor: '#2a2b30', suspension: 'lifted', tyres: 'offroad', engine: 'sport', finish: 'camo', bodyColor: '#55602f', accentColor: '#c2b280', decal: 'none', tint: 'smoke', headlights: '#ffffff', underglow: 'off', glowColor: '#ffffff' },
  'Police': { name: 'Interceptor', body: 'sedan', front: 'pushbar', rear: 'stock', skirts: 'none', spoiler: 'lip', hood: 'stock', roof: 'police', exhaust: 'dual', wheels: 'steel', wheelSize: 'm', rimColor: '#2a2b30', suspension: 'stock', tyres: 'sport', engine: 'race', finish: 'gloss', bodyColor: '#ffffff', accentColor: '#16161b', decal: 'twotone', tint: 'smoke', headlights: '#ffffff', underglow: 'off', glowColor: '#3d8bff' },
  'Beach Buggy': { name: 'Sand Flea', body: 'buggy', front: 'bullbar', rear: 'stock', skirts: 'none', spoiler: 'none', hood: 'stock', roof: 'none', exhaust: 'single', wheels: 'offroad', wheelSize: 'l', rimColor: '#ffffff', suspension: 'lifted', tyres: 'offroad', engine: 'sport', finish: 'gloss', bodyColor: '#1fb5a8', accentColor: '#ffd23f', decal: 'none', tint: 'clear', headlights: '#fff2b0', underglow: 'off', glowColor: '#ffffff' },
  'Party Van': { name: 'Groove Bus', body: 'van', front: 'stock', rear: 'stock', skirts: 'none', spoiler: 'none', hood: 'stock', roof: 'box', exhaust: 'single', wheels: 'deepdish', wheelSize: 'm', rimColor: '#ffffff', suspension: 'lowered', tyres: 'street', engine: 'stock', finish: 'gloss', bodyColor: '#9b51e0', accentColor: '#ff6fb5', decal: 'twotone', tint: 'black', headlights: '#c9a0ff', underglow: 'on', glowColor: '#ff6fb5' },
  'Limo': { name: 'Night Shift', body: 'limo', front: 'stock', rear: 'stock', skirts: 'skirts', spoiler: 'none', hood: 'stock', roof: 'none', exhaust: 'dual', wheels: 'mesh', wheelSize: 'm', rimColor: '#d4af37', suspension: 'lowered', tyres: 'street', engine: 'sport', finish: 'metallic', bodyColor: '#16161b', accentColor: '#d4af37', decal: 'none', tint: 'black', headlights: '#ffffff', underglow: 'on', glowColor: '#d4af37' },
};

const pick = a => a[Math.floor(Math.random() * a.length)];
export function randomCar(r = Math.random) {
  const p = a => a[Math.floor(r() * a.length)];
  const c = { name: 'Random' };
  for (const tab of CAR_SCHEMA) for (const it of tab.items) {
    if (it.type === 'choice') c[it.key] = p(it.options)[0];
    else if (it.type === 'color') c[it.key] = p(it.palette);
  }
  return c;
}
// Plausible everyday traffic car.
export function trafficCar(r = Math.random) {
  const p = a => a[Math.floor(r() * a.length)];
  return {
    ...DEFAULT_CAR, body: p(['hatch', 'hatch', 'sedan', 'sedan', 'sedan', 'coupe', 'pickup', 'van', 'muscle', 'sports', 'suv', 'suv', 'wagon', 'convertible', 'classic', 'lowrider', 'boxtruck']),
    front: 'stock', rear: 'stock', skirts: 'none', spoiler: p(['none', 'none', 'none', 'lip']), hood: 'stock', roof: p(['none', 'none', 'none', 'none', 'rack', 'taxi']),
    exhaust: 'single', wheels: p(['steel', 'fivespoke', 'mesh']), wheelSize: 'm', rimColor: p(['#c9ccd2', '#2a2b30']), suspension: 'stock',
    finish: p(['gloss', 'metallic', 'metallic', 'matte']), bodyColor: p(['#ffffff', '#d9d9de', '#7c828d', '#16161b', '#3a3d45', '#e23b3b', '#2f80ed', '#3a3fbf', '#55602f', '#8b1e3f', '#c2b280', '#1fb5a8', '#ffd23f']),
    decal: 'none', tint: p(['clear', 'smoke']), underglow: 'off',
  };
}

export function computeCarStats(cfg) {
  const c = { ...DEFAULT_CAR, ...cfg };
  const b = BODIES[c.body] || BODIES.coupe;
  const e = CAR_PARTS.engine[c.engine]?.m || CAR_PARTS.engine.stock.m;
  const s = { top: e.top, acc: e.acc / b.mass, grip: 1, off: c.body === 'buggy' ? 1.4 : 1 };
  if (b.tractor) return { top: 13, acc: 5, grip: 1.4, off: 1.6, turn: 2.2 };
  if (b.two === 'bike') return { top: 11, acc: 6, grip: 1.3, off: 1.1, turn: 3.2, two: 'bike' };
  if (b.two === 'scooter') return { top: 8.5, acc: 5, grip: 1.2, off: 0.6, turn: 3.4, two: 'scooter' };
  if (b.two === 'moto') { s.top *= 1.12; s.acc = e.acc * 1.25; s.grip = 1.05; }
  if (c.body === 'sports') { s.top *= 1.08; s.acc *= 1.1; s.grip *= 1.05; }
  if (['van', 'limo', 'pickup'].includes(c.body)) s.grip *= 0.93;
  for (const slot of ['tyres', 'suspension', 'wheelSize', 'front', 'rear', 'spoiler', 'hood']) {
    const part = CAR_PARTS[slot][c[slot]]; if (!part) continue;
    for (const [k, v] of Object.entries(part.m)) s[k] *= v;
  }
  s.turn = 2.3 * s.grip;
  return s;
}
export function carStatBars(s) {
  const c = v => Math.max(0.03, Math.min(1, v));
  return [
    ['Top speed', c(s.top / 66), Math.round(s.top * 3.6) + ' km/h'],
    ['Accel', c(s.acc / 24), (s.top / s.acc).toFixed(1) + 's'],
    ['Grip', c((s.grip - 0.5) / 0.9), Math.round(s.grip * 100)],
    ['Off-road', c(s.off / 2.2), Math.round(s.off * 100)],
  ];
}

// ---------------- geometry
function taper(w, h, l, topL, topW, shift) {
  const g = new THREE.BoxGeometry(w, h, l), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setZ(i, p.getZ(i) * topL + shift); p.setX(i, p.getX(i) * topW); }
  g.computeVertexNormals();
  return g;
}

// two-wheelers: bicycle, e-scooter, motorbike. Same interface as cars (wheels spin, lights work)

// farm tractor: big rear wheels, small fronts, cab with a roll cage, exhaust stack
function buildTractor(c, B) {
  const grp = new THREE.Group(), M = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, flatShading: true, ...o });
  const body = M(c.bodyColor || '#2f8a3a'), dark = M('#1a1a1c', { roughness: 0.9 }), rim = M(c.accentColor || '#ffd23f'), steel = M('#9aa0aa', { metalness: 0.6, roughness: 0.4 });
  const headM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff2b0', emissiveIntensity: 0.6 });
  const tailM = new THREE.MeshStandardMaterial({ color: '#7a0a10', emissive: '#ff1a2a', emissiveIntensity: 0.5 });
  const revM = new THREE.MeshStandardMaterial({ color: '#d8dce0', emissive: '#ffffff', emissiveIntensity: 0 });
  const bx = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; grp.add(o); return o; };
  const L = B.L, W = B.W, wheels = [];
  bx(0.9, 0.8, 2.0, body, 0, 1.0, 0.75);                  // bonnet / engine
  bx(0.95, 0.12, 0.3, steel, 0, 0.75, 1.8);               // front weight bar
  bx(1.3, 0.35, 1.3, body, 0, 0.95, -0.7);                // body under the cab
  bx(0.7, 0.12, 0.6, dark, 0, 1.25, -0.8);                // seat base
  bx(0.6, 0.5, 0.1, dark, 0, 1.5, -1.1);                  // seat back
  for (const x of [-0.65, 0.65]) for (const z of [-0.2, -1.3]) bx(0.08, 1.6, 0.08, dark, x, 2.0, z); // cab posts
  bx(1.5, 0.08, 1.4, body, 0, 2.82, -0.75);               // roof
  bx(1.3, 0.9, 0.04, new THREE.MeshStandardMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.35 }), 0, 2.2, -0.18); // windscreen
  bx(0.1, 0.9, 0.1, dark, 0.32, 1.85, 1.25); bx(0.14, 0.08, 0.14, dark, 0.32, 2.32, 1.25); // exhaust stack
  bx(0.22, 0.14, 0.06, headM, -0.3, 1.25, 1.77); bx(0.22, 0.14, 0.06, headM, 0.3, 1.25, 1.77);
  bx(0.14, 0.1, 0.05, tailM, -0.6, 1.05, -1.4); bx(0.14, 0.1, 0.05, tailM, 0.6, 1.05, -1.4); bx(0.1, 0.08, 0.05, revM, 0, 1.05, -1.4);
  bx(1.1, 0.1, 0.3, steel, 0, 0.6, -1.6);                 // hitch
  for (const [fz, r, w] of [[1, 0.42, 0.3], [-1, 0.78, 0.5]]) for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * (fz > 0 ? 0.72 : 0.92), r, fz > 0 ? 1.15 : -0.85); grp.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14).rotateZ(Math.PI / 2), dark); spin.add(tyre);
    for (let i = 0; i < 10; i++) { const lug = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.08, 0.14), dark); const a = i / 10 * Math.PI * 2; lug.position.set(0, Math.cos(a) * r, Math.sin(a) * r); lug.rotation.x = -a; spin.add(lug); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.02, 10).rotateZ(Math.PI / 2), rim); spin.add(hub);
    wheels.push({ pivot, spin, front: fz > 0 });
    if (fz < 0) bx(0.6, 0.06, 1.0, body, sx * 0.92, r * 2 + 0.05, -0.85); // mudguards
  }
  grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { group: grp, wheels, headM, tailM, revM, glow: null, length: L, width: W, height: 2.9, wr: 0.6 };
}
function buildTwo(c, B) {
  const grp = new THREE.Group(), M = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, ...o });
  const bodyM = M(c.bodyColor, { metalness: 0.4, roughness: 0.35 }), dark = M('#16161a', { roughness: 0.8 }), chrome = M('#d0d4da', { metalness: 0.9, roughness: 0.2 });
  const headM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: c.headlights || '#fff2b0', emissiveIntensity: 0.6 });
  const tailM = new THREE.MeshStandardMaterial({ color: '#7a0a10', emissive: '#ff1a2a', emissiveIntensity: 0.5 });
  const revM = new THREE.MeshStandardMaterial({ color: '#d8dce0', emissive: '#ffffff', emissiveIntensity: 0 });
  const bx = (w, h, d, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; grp.add(o); return o; };
  const L = B.L, wr = B.wr, kind = B.two, wz = L * 0.38, wheels = [];
  for (const fz of [1, -1]) {
    const pivot = new THREE.Group(); pivot.position.set(0, wr, fz * wz); grp.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(wr * 0.86, kind === 'moto' ? wr * 0.17 : wr * 0.09, 6, 18).rotateY(Math.PI / 2), dark); spin.add(tyre);
    const hubM = kind === 'moto' ? M(c.rimColor || '#c9ccd2', { metalness: 0.6 }) : chrome;
    for (let i = 0; i < (kind === 'bike' ? 12 : 5); i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.015, wr * 1.6, kind === 'moto' ? 0.05 : 0.012), hubM); sp.rotation.x = i / (kind === 'bike' ? 12 : 5) * Math.PI; spin.add(sp); }
    spin.add(new THREE.Mesh(new THREE.CylinderGeometry(wr * 0.18, wr * 0.18, 0.08, 10).rotateZ(Math.PI / 2), hubM));
    wheels.push({ pivot, spin, front: fz > 0 });
  }
  let seatY = 0.9, barY = 1.05;
  if (kind === 'bike') {
    bx(0.04, 0.04, wz * 1.6, bodyM, 0, wr + 0.38, 0.05, -0.15);          // top tube
    bx(0.04, 0.5, 0.04, bodyM, 0, wr + 0.12, -0.12, 0.25);              // seat tube
    bx(0.04, 0.04, wz * 1.3, bodyM, 0, wr + 0.1, 0.25, 0.55);           // down tube
    bx(0.04, 0.55, 0.04, chrome, 0, wr + 0.28, wz - 0.06, -0.3);        // fork
    bx(0.5, 0.03, 0.03, dark, 0, wr + 0.62, wz - 0.18);                 // bars
    bx(0.14, 0.05, 0.24, dark, 0, wr + 0.5, -0.22); seatY = wr + 0.5; barY = wr + 0.62;
    bx(0.1, 0.1, 0.1, dark, 0, wr, 0);                                  // crank
  } else if (kind === 'scooter') {
    bx(0.16, 0.06, L * 0.8, bodyM, 0, wr + 0.06, 0);                    // deck
    bx(0.05, 1.0, 0.05, M('#3a3d45', { metalness: 0.5 }), 0, wr + 0.55, wz - 0.02, -0.12);  // stem
    bx(0.46, 0.04, 0.04, dark, 0, wr + 1.04, wz - 0.08);                // bars
    seatY = wr + 0.1; barY = wr + 1.04;
  } else { // motorbike
    bx(0.32, 0.26, 0.6, bodyM, 0, wr + 0.42, 0.18);                     // tank
    bx(0.28, 0.1, 0.62, dark, 0, wr + 0.44, -0.35);                     // seat
    bx(0.3, 0.28, 0.4, M('#3a3d45', { metalness: 0.6 }), 0, wr + 0.12, 0.05);  // engine
    bx(0.08, 0.08, 0.7, chrome, 0.18, wr - 0.02, -0.4, -0.15);          // exhaust
    bx(0.05, 0.6, 0.05, chrome, 0, wr + 0.3, wz - 0.1, -0.35);          // fork
    bx(0.62, 0.04, 0.04, dark, 0, wr + 0.62, wz - 0.25);                // bars
    bx(0.3, 0.12, 0.3, bodyM, 0, wr + 0.18, -wz + 0.05);                // rear fender
    bx(0.36, 0.2, 0.18, bodyM, 0, wr + 0.5, wz - 0.18);                 // front cowl
    bx(0.16, 0.12, 0.05, headM, 0, wr + 0.48, wz - 0.07);               // headlight
    seatY = wr + 0.5; barY = wr + 0.62;
  }
  if (kind !== 'moto') bx(0.08, 0.06, 0.04, headM, 0, kind === 'scooter' ? barY - 0.1 : barY - 0.06, wz - 0.1);
  bx(0.12, 0.06, 0.04, tailM, 0, kind === 'scooter' ? wr + 0.1 : seatY - 0.08, -wz - 0.02);
  bx(0.05, 0.04, 0.04, revM, 0.07, kind === 'scooter' ? wr + 0.1 : seatY - 0.08, -wz - 0.03);
  return { group: grp, wheels, headM, tailM, revM, glow: null, length: L, width: B.W, height: barY + 0.1, wr, two: kind, seatY, barY };
}
export function buildCar(cfg) {
  const c = { ...DEFAULT_CAR, ...cfg };
  const B = BODIES[c.body] || BODIES.coupe;
  if (B.two) return buildTwo(c, B);
  if (B.tractor) return buildTractor(c, B);
  const grp = new THREE.Group();
  const fin = c.finish;
  const look = { gloss: [0.25, 0.2], matte: [0.85, 0], metallic: [0.3, 0.75], chrome: [0.06, 1], camo: [0.8, 0], carbon: [0.35, 0.3] }[fin] || [0.3, 0.3];
  const bodyM = new THREE.MeshStandardMaterial({ color: c.bodyColor, roughness: look[0], metalness: look[1], flatShading: true });
  if (fin === 'camo' || fin === 'carbon') { bodyM.map = patternTexture(fin, c.bodyColor, c.accentColor); bodyM.map.repeat.set(2, 2); bodyM.color.set('#ffffff'); }
  const accM = new THREE.MeshStandardMaterial({ color: c.accentColor, roughness: 0.45, metalness: 0.2, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.8, flatShading: true });
  const chrome = new THREE.MeshStandardMaterial({ color: '#d0d4da', roughness: 0.15, metalness: 1 });
  const tintCol = { clear: '#a9d6ef', smoke: '#3c4b5c', black: '#0c0e12', gold: '#c89b3c' }[c.tint] || '#3c4b5c';
  const glass = new THREE.MeshStandardMaterial({ color: tintCol, roughness: 0.08, metalness: 0.5, transparent: true, opacity: c.tint === 'clear' ? 0.6 : 0.9, flatShading: true });
  const headM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: c.headlights, emissiveIntensity: 0.6, roughness: 0.2 });
  const tailM = new THREE.MeshStandardMaterial({ color: '#7a0a10', emissive: '#ff1a2a', emissiveIntensity: 0.5, roughness: 0.3 });
  const revM = new THREE.MeshStandardMaterial({ color: '#d8dce0', emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.3 });
  const rimM = new THREE.MeshStandardMaterial({ color: c.rimColor || '#c9ccd2', roughness: 0.25, metalness: 0.85, flatShading: true });

  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; grp.add(m); return m; };
  const bx = (w, h, d, mat, x, y, z) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);

  const wsz = { s: 0.88, m: 1, l: 1.18 }[c.wheelSize] || 1;
  const wr = B.wr * wsz;
  const susp = { lowered: -0.06, stock: 0, lifted: 0.28 }[c.suspension] || 0;
  const clr = Math.max(0.12, wr * 0.55 + susp);      // body bottom height
  const { L, W, bh } = B;
  const by = clr + bh / 2, top = clr + bh;
  const halfL = L / 2;

  // ---- lower body
  if (B.open) {
    bx(W * 0.7, bh, L * 0.9, bodyM, 0, by, 0);
    bx(W * 0.9, 0.08, L * 0.95, dark, 0, clr + 0.04, 0);
    // roll cage
    const cageH = B.ch + 0.2;
    for (const sx of [-1, 1]) for (const z of [-0.6, 0.6]) bx(0.06, cageH, 0.06, accM, sx * W * 0.38, top + cageH / 2, z + B.co);
    for (const z of [-0.6, 0.6]) bx(W * 0.8, 0.06, 0.06, accM, 0, top + cageH, z + B.co);
    for (const sx of [-1, 1]) bx(0.06, 0.06, 1.26, accM, sx * W * 0.38, top + cageH, B.co);
    for (const sx of [-1, 1]) { bx(0.45, 0.5, 0.45, dark, sx * 0.35, top + 0.2, B.co - 0.25); }
    bx(W * 0.8, 0.12, 0.6, bodyM, 0, top + 0.06, halfL - 0.6);
  } else {
    const body = add(taper(W, bh, L, 0.97, 0.98, 0), bodyM, 0, by, 0);
    if (c.decal === 'twotone') bx(W + 0.02, bh * 0.45, L + 0.02, accM, 0, clr + bh * 0.22, 0);
    if (c.decal === 'side') for (const sx of [-1, 1]) bx(0.02, 0.1, L * 0.86, accM, sx * (W / 2 + 0.005), by + 0.05, 0);
    // cabin
    const ch = B.ch, cl = B.cl;
    if (B.topless) {
      const ws = bx(W * 0.82, ch * 0.9, 0.06, glass, 0, top + ch * 0.45, B.co + cl / 2); ws.rotation.x = -0.45;
      bx(W * 0.84, 0.05, 0.08, bodyM, 0, top + ch * 0.85, B.co + cl / 2 - 0.15);
      for (const sx of [-1, 1]) { bx(0.48, 0.12, 0.5, dark, sx * 0.38, top + 0.02, B.co); bx(0.48, 0.5, 0.12, dark, sx * 0.38, top + 0.25, B.co - 0.28); }
      bx(W * 0.9, 0.06, 0.9, dark, 0, top + 0.01, B.co - 0.85);
    } else {
    const cab = add(taper(W * 0.86, ch, cl, c.body === 'van' ? 0.96 : 0.68, 0.86, c.body === 'van' ? -0.05 : -0.08), glass, 0, top + ch / 2, B.co);
    // roof panel
    const roofL = c.body === 'van' ? cl * 0.94 : cl * 0.62;
    const roofZ = B.co - (c.body === 'van' ? 0.05 : 0.08);
    bx(W * 0.74, 0.06, roofL, bodyM, 0, top + ch + 0.02, roofZ);
    // pillars
    for (const sx of [-1, 1]) bx(0.05, ch * 0.9, 0.08, bodyM, sx * W * 0.37, top + ch / 2, roofZ);
    if (c.body === 'van') for (const sx of [-1, 1]) bx(0.02, ch * 0.6, cl * 0.7, bodyM, sx * W * 0.43, top + ch * 0.35, B.co - 0.3);
    }
    if (B.box) {
      const boxL = halfL + (B.co - cl / 2) - 0.25, bz = -halfL + boxL / 2 + 0.05;
      bx(W * 1.02, 1.9, boxL, c.decal === 'twotone' ? accM : new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.7, flatShading: true }), 0, top + 0.95, bz);
      bx(W * 1.04, 0.08, boxL + 0.04, accM, 0, top + 1.9, bz);
      bx(W * 0.9, 1.7, 0.04, dark, 0, top + 0.9, -halfL + 0.03);
    }
    if (B.fins) for (const sx of [-1, 1]) { const f = bx(0.08, 0.32, 1.1, bodyM, sx * (W / 2 - 0.08), top + 0.12, -halfL + 0.6); f.rotation.x = 0.18; }
    if (B.bed) {
      const bedL = halfL - (B.co + cl / 2) - 0.1, bz = -halfL + bedL / 2 + 0.05;
      for (const sx of [-1, 1]) bx(0.08, 0.35, bedL, bodyM, sx * (W / 2 - 0.04), top + 0.17, bz);
      bx(W, 0.35, 0.08, bodyM, 0, top + 0.17, -halfL + 0.06);
      bx(W - 0.16, 0.02, bedL, dark, 0, top + 0.01, bz);
    }
    if (c.decal === 'stripes') {
      for (const sx of [-0.18, 0.18]) {
        bx(0.16, 0.01, L * 0.98, accM, sx, top + 0.005, 0);
        if (!B.topless) bx(0.16, 0.01, cl * 0.62, accM, sx, top + ch + 0.055, B.co - 0.08);
      }
    }
  }
  // grille & lights
  bx(W * 0.5, bh * 0.35, 0.04, dark, 0, by - 0.02, halfL + 0.01);
  for (const sx of [-1, 1]) {
    bx(W * 0.2, 0.1, 0.05, headM, sx * W * 0.33, by + 0.08, halfL + 0.01);
    bx(W * 0.2, 0.09, 0.05, tailM, sx * W * 0.33, by + 0.1, -halfL - 0.01);
    bx(W * 0.07, 0.07, 0.05, revM, sx * W * 0.18, by + 0.1, -halfL - 0.012); // reverse light
  }
  // front bumper
  if (c.front === 'lip') bx(W * 0.98, 0.04, 0.25, dark, 0, clr + 0.02, halfL);
  else if (c.front === 'bullbar') { bx(W * 0.7, 0.06, 0.06, chrome, 0, by + 0.15, halfL + 0.2); bx(W * 0.7, 0.06, 0.06, chrome, 0, by - 0.1, halfL + 0.2); for (const sx of [-1, 1]) bx(0.06, bh + 0.2, 0.06, chrome, sx * W * 0.3, by, halfL + 0.2); }
  else if (c.front === 'pushbar') { bx(W * 0.5, bh * 0.8, 0.08, dark, 0, by, halfL + 0.15); }
  else bx(W * 0.96, 0.12, 0.1, bodyM, 0, clr + 0.08, halfL);
  // rear
  if (c.rear === 'diffuser') { bx(W * 0.8, 0.1, 0.2, dark, 0, clr + 0.04, -halfL + 0.02); for (let i = -2; i <= 2; i++) bx(0.02, 0.12, 0.22, dark, i * 0.2, clr + 0.06, -halfL); }
  else if (c.rear === 'hitch') { bx(0.08, 0.08, 0.3, dark, 0, clr + 0.05, -halfL - 0.15); add(new THREE.SphereGeometry(0.05, 6, 4), chrome, 0, clr + 0.12, -halfL - 0.28); }
  else bx(W * 0.96, 0.12, 0.1, bodyM, 0, clr + 0.08, -halfL);
  if (c.skirts === 'skirts') for (const sx of [-1, 1]) bx(0.06, 0.1, L * 0.55, accM, sx * (W / 2 + 0.02), clr + 0.03, 0);
  // spoiler
  const sz = -halfL + 0.25;
  if (c.spoiler === 'lip') bx(W * 0.8, 0.04, 0.12, bodyM, 0, top + 0.02, sz);
  if (c.spoiler === 'ducktail') { const d = bx(W * 0.85, 0.06, 0.3, bodyM, 0, top + 0.06, sz); d.rotation.x = 0.25; }
  if (c.spoiler === 'wing' || c.spoiler === 'gt') {
    const h = c.spoiler === 'gt' ? 0.45 : 0.28, ww = c.spoiler === 'gt' ? W * 1.02 : W * 0.85;
    for (const sx of [-1, 1]) bx(0.05, h, 0.14, dark, sx * ww * 0.32, top + h / 2, sz);
    bx(ww, 0.05, c.spoiler === 'gt' ? 0.38 : 0.28, accM, 0, top + h, sz - 0.02);
    if (c.spoiler === 'gt') for (const sx of [-1, 1]) bx(0.03, 0.18, 0.4, accM, sx * ww / 2, top + h, sz - 0.02);
  }
  // hood
  const hz = halfL - 0.7;
  if (!B.open) {
    if (c.hood === 'scoop') bx(0.5, 0.12, 0.6, bodyM, 0, top + 0.06, hz);
    if (c.hood === 'vents') for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) bx(0.25, 0.015, 0.05, dark, sx * 0.35, top + 0.008, hz - 0.15 + i * 0.12);
    if (c.hood === 'blower') {
      bx(0.42, 0.22, 0.5, chrome, 0, top + 0.11, hz);
      bx(0.5, 0.14, 0.32, dark, 0, top + 0.3, hz);
      bx(0.2, 0.06, 0.2, accM, 0, top + 0.4, hz);
    }
  }
  // roof items
  const rt = top + B.ch + 0.06 + (B.box ? 1.0 : 0);
  if (!B.open && !B.topless) {
    if (c.roof === 'rack') { for (const sx of [-1, 1]) bx(0.04, 0.06, B.cl * 0.6, dark, sx * W * 0.3, rt + 0.04, B.co); for (const z of [-0.3, 0.3]) bx(W * 0.64, 0.04, 0.04, dark, 0, rt + 0.08, B.co + z); }
    if (c.roof === 'box') bx(W * 0.55, 0.28, B.cl * 0.6, accM, 0, rt + 0.15, B.co);
    if (c.roof === 'lightbar') { bx(W * 0.7, 0.1, 0.12, dark, 0, rt + 0.06, B.co + B.cl * 0.25); for (let i = -2; i <= 2; i++) bx(0.12, 0.07, 0.03, headM, i * 0.24, rt + 0.06, B.co + B.cl * 0.25 + 0.07); }
    if (c.roof === 'taxi') { bx(0.55, 0.16, 0.22, new THREE.MeshStandardMaterial({ color: '#fff3a0', emissive: '#ffd23f', emissiveIntensity: 0.4 }), 0, rt + 0.09, B.co); }
    if (c.roof === 'police') {
      bx(W * 0.6, 0.1, 0.24, dark, 0, rt + 0.05, B.co);
      bx(W * 0.28, 0.1, 0.22, new THREE.MeshStandardMaterial({ color: '#ff3355', emissive: '#ff2040', emissiveIntensity: 0.9 }), -W * 0.15, rt + 0.12, B.co);
      bx(W * 0.28, 0.1, 0.22, new THREE.MeshStandardMaterial({ color: '#3d8bff', emissive: '#2060ff', emissiveIntensity: 0.9 }), W * 0.15, rt + 0.12, B.co);
    }
  }
  // exhaust
  const ex = (x) => { const p = add(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), chrome, x, clr + 0.06, -halfL - 0.05); p.rotation.x = Math.PI / 2; };
  if (c.exhaust === 'single') ex(W * 0.3);
  if (c.exhaust === 'dual') { ex(-W * 0.3); ex(W * 0.3); }
  if (c.exhaust === 'quad') { ex(-W * 0.34); ex(-W * 0.24); ex(W * 0.24); ex(W * 0.34); }
  if (c.exhaust === 'side') for (const sx of [-1, 1]) { const p = add(new THREE.CylinderGeometry(0.06, 0.06, L * 0.4, 8), chrome, sx * (W / 2 + 0.06), clr + 0.08, 0.1); p.rotation.x = Math.PI / 2; }
  // mirrors
  if (!B.open && !B.topless) for (const sx of [-1, 1]) bx(0.14, 0.08, 0.1, c.decal === 'none' ? bodyM : accM, sx * (W / 2 + 0.05), top + 0.12, B.co + B.cl * 0.32);

  // ---- wheels
  const wheelbase = L * 0.62, track = W / 2 + 0.01;
  const tyre = c.tyres || 'street';
  const tw = (c.wheels === 'offroad' || tyre === 'offroad' ? 0.38 : c.wheels === 'deepdish' ? 0.34 : 0.3) * (tyre === 'slick' ? 1.12 : 1);
  // rim-to-tyre ratio: low profile/drift = big rims and thin rubber, mud tyres = small rims and tall rubber
  const rimR = wr * ({ sport: 0.76, drift: 0.8, slick: 0.7, offroad: 0.55, whitewall: 0.6 }[tyre] || 0.66);
  const tyreM = new THREE.MeshStandardMaterial({ color: '#1a1a1e', roughness: 0.95, flatShading: true });
  const wallM = new THREE.MeshStandardMaterial({ color: tyre === 'whitewall' ? '#f2efe6' : tyre === 'sport' ? '#d8262c' : tyre === 'drift' ? '#ffd23f' : '#2b2b31', roughness: 0.8 });
  const dish = new THREE.MeshStandardMaterial({ color: new THREE.Color(c.rimColor || '#c9ccd2').multiplyScalar(0.35), roughness: 0.6, metalness: 0.3 });
  // brighter, less mirror-like so the chosen rim colour actually reads on screen
  rimM.metalness = 0.45; rimM.roughness = 0.3; rimM.emissive = new THREE.Color(c.rimColor || '#c9ccd2').multiplyScalar(0.12);
  const chromeLip = new THREE.MeshStandardMaterial({ color: '#eef1f5', roughness: 0.2, metalness: 0.6, emissive: '#30343a' });
  // tyre: lathe profile with rounded shoulders (axis = X after rotation)
  const sh = tyre === 'offroad' ? 0.06 : tyre === 'drift' ? 0.02 : 0.045, h = tw / 2;
  const prof = [[rimR * 0.98, -h + 0.01], [wr - sh, -h], [wr - sh * 0.3, -h + sh * 0.6], [wr, -h + sh * 1.4], [wr, h - sh * 1.4], [wr - sh * 0.3, h - sh * 0.6], [wr - sh, h], [rimR * 0.98, h - 0.01]];
  if (tyre === 'drift') { prof[1][0] = wr - 0.07; prof[6][0] = wr - 0.07; } // stretched: sidewall pulled in
  const tyreGeo = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 22); tyreGeo.rotateZ(Math.PI / 2);
  tyreM.side = THREE.DoubleSide;
  const cyl = (r, w, seg = 18) => new THREE.CylinderGeometry(r, r, w, seg).rotateZ(Math.PI / 2);
  const wheels = [];
  for (const fz of [1, -1]) for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * track, wr, fz * wheelbase / 2); grp.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const t = new THREE.Mesh(tyreGeo, tyreM); spin.add(t);
    const face = sx * (h + 0.005);          // outer face of the wheel
    const at = (m, x, y = 0, z = 0) => { m.position.set(x, y, z); spin.add(m); return m; };
    // sidewall ring (coloured stripe for whitewall / low profile / drift)
    if (wallM.color.getHex() !== 0x2b2b31 || tyre === 'street') at(new THREE.Mesh(new THREE.RingGeometry(rimR * 1.02, tyre === 'whitewall' ? wr * 0.88 : rimR * 1.02 + (wr - rimR) * 0.35, 22).rotateY(sx * Math.PI / 2), wallM), face - sx * 0.002);
    // tread blocks
    if (tyre === 'offroad') for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; for (const k of [-1, 1]) { const lug = at(new THREE.Mesh(new THREE.BoxGeometry(tw * 0.42, 0.07, 0.13), tyreM), k * tw * 0.24, Math.cos(a + k * 0.2) * (wr + 0.02), Math.sin(a + k * 0.2) * (wr + 0.02)); lug.rotation.x = a + k * 0.2; } }
    else if (tyre !== 'slick') for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; const g = at(new THREE.Mesh(new THREE.BoxGeometry(tw * 0.78, 0.008, 0.035), dark), 0, Math.cos(a) * (wr - 0.002), Math.sin(a) * (wr - 0.002)); g.rotation.x = a; }
    // rim: dark recessed dish, raised outer lip, then the spoke design on top
    at(new THREE.Mesh(cyl(rimR, 0.02), dish), sx * (h - 0.09));
    at(new THREE.Mesh(new THREE.TorusGeometry(rimR * 0.97, 0.035, 6, 24).rotateY(Math.PI / 2), c.wheels === 'deepdish' || c.wheels === 'wire' ? chromeLip : rimM), face);
    const fx = face + sx * 0.01, deep = sx * (h - 0.06);
    const spoke = (a, len, wid, dep, x, mat = rimM, r0 = rimR * 0.18, twist = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(dep, len, wid), mat); m.position.set(x, Math.cos(a) * (r0 + len / 2), Math.sin(a) * (r0 + len / 2)); m.rotation.x = a; m.rotation.y = twist; spin.add(m); return m; };
    const hub = (r, mat = rimM) => at(new THREE.Mesh(cyl(r, 0.06, 12), mat), fx);
    const L0 = rimR * 0.8;
    switch (c.wheels) {
      case 'steel': at(new THREE.Mesh(cyl(rimR * 0.93, 0.03), rimM), sx * (h - 0.03)); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; at(new THREE.Mesh(cyl(rimR * 0.1, 0.035, 8), dish), sx * (h - 0.015), Math.cos(a) * rimR * 0.62, Math.sin(a) * rimR * 0.62); } hub(rimR * 0.34, chromeLip); break;
      case 'fivespoke': for (let i = 0; i < 5; i++) spoke(i / 5 * Math.PI * 2, L0, rimR * 0.32, 0.07, fx - sx * 0.02); hub(rimR * 0.26); break;
      case 'mesh': for (let i = 0; i < 10; i++) { spoke(i / 10 * Math.PI * 2, L0, 0.035, 0.05, fx - sx * 0.02, rimM, rimR * 0.18, 0.5); spoke(i / 10 * Math.PI * 2 + 0.31, L0, 0.035, 0.05, fx - sx * 0.025, rimM, rimR * 0.18, -0.5); } hub(rimR * 0.22); break;
      case 'deepdish': at(new THREE.Mesh(new THREE.TorusGeometry(rimR * 0.78, rimR * 0.17, 6, 24).rotateY(Math.PI / 2), chromeLip), sx * (h - 0.04)); for (let i = 0; i < 6; i++) spoke(i / 6 * Math.PI * 2, rimR * 0.45, rimR * 0.2, 0.05, deep, rimM, rimR * 0.16); hub(rimR * 0.2, chromeLip); break;
      case 'offroad': at(new THREE.Mesh(new THREE.TorusGeometry(rimR * 0.9, 0.05, 6, 20).rotateY(Math.PI / 2), rimM), fx); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; at(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), chromeLip), fx + sx * 0.03, Math.cos(a) * rimR * 0.9, Math.sin(a) * rimR * 0.9); } at(new THREE.Mesh(cyl(rimR * 0.72, 0.03), rimM), sx * (h - 0.04)); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; at(new THREE.Mesh(cyl(rimR * 0.13, 0.04, 8), dish), sx * (h - 0.02), Math.cos(a) * rimR * 0.48, Math.sin(a) * rimR * 0.48); } hub(rimR * 0.22, dish); break;
      case 'turbine': for (let i = 0; i < 12; i++) spoke(i / 12 * Math.PI * 2, L0, rimR * 0.2, 0.03, fx - sx * 0.015, rimM, rimR * 0.2, 0.7 * sx); hub(rimR * 0.3, chromeLip); break;
      case 'wire': for (let i = 0; i < 24; i++) spoke(i / 24 * Math.PI * 2, L0 * 1.02, 0.014, 0.014, fx - sx * (0.02 + (i % 2) * 0.03), chromeLip, rimR * 0.2, (i % 2 ? 0.35 : -0.35)); hub(rimR * 0.3, rimM); at(new THREE.Mesh(new THREE.ConeGeometry(rimR * 0.14, 0.12, 3).rotateZ(-sx * Math.PI / 2), chromeLip), fx + sx * 0.06); break;
      case 'aero': at(new THREE.Mesh(cyl(rimR * 0.93, 0.04, 22), rimM), sx * (h - 0.01)); for (let i = 0; i < 3; i++) spoke(i / 3 * Math.PI * 2, rimR * 0.55, 0.05, 0.02, fx + sx * 0.01, dish, rimR * 0.3, 0.2); hub(rimR * 0.18, dish); break;
      case 'split': for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; spoke(a, L0 * 0.5, rimR * 0.2, 0.07, fx - sx * 0.02); spoke(a - 0.2, L0 * 0.55, rimR * 0.1, 0.05, fx - sx * 0.025, rimM, rimR * 0.18 + L0 * 0.45); spoke(a + 0.2, L0 * 0.55, rimR * 0.1, 0.05, fx - sx * 0.025, rimM, rimR * 0.18 + L0 * 0.45); } hub(rimR * 0.24, chromeLip); break;
      default: for (let i = 0; i < 5; i++) spoke(i / 5 * Math.PI * 2, L0, rimR * 0.3, 0.06, fx); hub(rimR * 0.25);
    }
    // a brake disc + caliper peeking through big-rim designs
    if (['fivespoke', 'mesh', 'turbine', 'wire', 'split'].includes(c.wheels)) { at(new THREE.Mesh(cyl(rimR * 0.72, 0.03, 16), new THREE.MeshStandardMaterial({ color: '#8a8d93', roughness: 0.5, metalness: 0.5 })), sx * (h - 0.12)); }
    spin.traverse(m => { if (m.isMesh) m.castShadow = true; });
    if (['fivespoke', 'mesh', 'turbine', 'wire', 'split'].includes(c.wheels)) { const cal = new THREE.Mesh(new THREE.BoxGeometry(0.06, rimR * 0.45, rimR * 0.35), new THREE.MeshStandardMaterial({ color: c.accentColor || '#e23b3b', roughness: 0.4 })); cal.position.set(sx * (h - 0.09), rimR * 0.45, -fz * rimR * 0.2); pivot.add(cal); }
    wheels.push({ pivot, spin, front: fz > 0 });
  }
  // underglow
  let glow = null;
  if (c.underglow === 'on') {
    glow = new THREE.Mesh(new THREE.PlaneGeometry(W + 1.2, L + 1.2), new THREE.MeshBasicMaterial({ color: c.glowColor, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; grp.add(glow);
  }
  grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { group: grp, wheels, headM, tailM, revM, glow, length: L, width: W, height: top + B.ch, wr };
}

export const CAR_PRICES = { tractor: 12000, scooter: 800, bike: 400, moto: 9000, hatch: 6000, sedan: 9000, wagon: 11000, coupe: 16000, van: 14000, pickup: 18000, suv: 26000, classic: 30000, lowrider: 24000, convertible: 38000, muscle: 42000, buggy: 15000, boxtruck: 22000, sports: 85000, limo: 70000, hyper: 160000 };
