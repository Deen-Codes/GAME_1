// Modular car builder. Car faces +Z, sits on y=0, origin at the centre of the wheelbase.
import * as THREE from '../lib/three.module.min.js';
import { BASIC } from './character.js?v=207';
import { patternTexture } from './gun.js?v=207';

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
  bintruck: { label: 'Bin Lorry', L: 6.6, W: 2.25, bh: 0.8, cl: 1.4, ch: 0.95, co: 2.15, wr: 0.47, mass: 1.8, box: true, bin: true },
  compact: { label: 'City Car', L: 2.9, W: 1.6, bh: 0.55, cl: 1.75, ch: 0.72, co: -0.2, wr: 0.3, mass: 0.75, boxy: true },
  hothatch: { label: 'Hot Hatch', L: 4.0, W: 1.85, bh: 0.5, cl: 1.9, ch: 0.56, co: -0.45, wr: 0.36, mass: 0.95 },
  jeep:   { label: '4x4',       L: 4.2, W: 1.95, bh: 0.72, cl: 2.1, ch: 0.82, co: -0.35, wr: 0.46, mass: 1.25, boxy: true, spare: true },
  minivan: { label: 'Minivan',  L: 4.9, W: 1.95, bh: 0.68, cl: 3.5, ch: 0.85, co: -0.25, wr: 0.37, mass: 1.25, boxy: true },
  gt:     { label: 'Grand Tourer', L: 4.95, W: 1.95, bh: 0.46, cl: 1.7, ch: 0.46, co: -0.65, wr: 0.38, mass: 1.0 },
  hyper:  { label: 'Hypercar',  L: 4.7, W: 2.05, bh: 0.38, cl: 1.5, ch: 0.38, co: -0.05, wr: 0.38, mass: 0.85 },
  tractor: { label: 'Tractor', L: 3.8, W: 2.1, bh: 0.9, cl: 1.2, ch: 1.1, co: -0.6, wr: 0.75, mass: 1.6, tractor: true },
  moto:   { label: 'Motorbike', L: 2.1, W: 0.7, bh: 0.5, cl: 0, ch: 0, co: 0, wr: 0.33, mass: 0.45, two: 'moto' },
  bike:   { label: 'Bicycle',   L: 1.75, W: 0.55, bh: 0.4, cl: 0, ch: 0, co: 0, wr: 0.34, mass: 0.3, two: 'bike' },
  speedboat: { label: 'Speedboat', L: 6.4, W: 2.4, bh: 0.9, cl: 0, ch: 0, co: 0, wr: 0.3, mass: 0.9, boat: true },
  scooter: { label: 'E-scooter', L: 1.2, W: 0.5, bh: 0.2, cl: 0, ch: 0, co: 0, wr: 0.12, mass: 0.3, two: 'scooter' },
};
const o = (label, m = {}) => ({ label, m });
export const CAR_PARTS = {
  engine: { eco: o('Eco', { top: 24, acc: 7 }), stock: o('Stock', { top: 32, acc: 10 }), sport: o('Sport', { top: 40, acc: 13 }), race: o('Race', { top: 48, acc: 17 }), rocket: o('Rocket', { top: 60, acc: 22 }) },
  tyres: { street: o('Street', { grip: 1 }), runflat: o('Run-flat', { grip: 0.97, runflat: 1 }), sport: o('Low profile', { grip: 1.2 }), offroad: o('Mud terrain', { grip: 0.95, off: 1.5 }), drift: o('Drift (stretched)', { grip: 0.65 }), whitewall: o('Whitewall', { grip: 0.95 }), slick: o('Racing slick', { grip: 1.3, off: 0.7 }) },
  suspension: { lowered: o('Lowered', { grip: 1.08, off: 0.8 }), stock: o('Stock'), lifted: o('Lifted', { grip: 0.92, off: 1.25 }) },
  wheels: { steel: o('Steel'), fivespoke: o('Five-spoke'), mesh: o('Mesh'), deepdish: o('Deep dish'), offroad: o('Beadlock'), turbine: o('Turbine'), wire: o('Wire spoke'), aero: o('Aero disc'), split: o('Split spoke') },
  wheelSize: { s: o('Small'), m: o('Medium'), l: o('Large', { off: 1.1 }) },
  lamps: { square: o('Square'), round: o('Round'), slim: o('Slim LED'), quad: o('Quad') },
  grille: { stock: o('Stock'), mesh: o('Mesh'), chrome: o('Chrome bars'), wide: o('Wide mouth') },
  front: { stock: o('Stock'), lip: o('Splitter', { grip: 1.03 }), bullbar: o('Bull bar', { off: 1.05 }), pushbar: o('Push bar') },
  rear: { stock: o('Stock'), diffuser: o('Diffuser', { grip: 1.02 }), hitch: o('Tow hitch') },
  spoiler: { none: o('None'), lip: o('Lip'), ducktail: o('Ducktail', { grip: 1.02 }), wing: o('Wing', { grip: 1.05 }), gt: o('GT wing', { grip: 1.08, top: 0.97 }) },
  hood: { stock: o('Stock'), scoop: o('Scoop'), vents: o('Vents'), blower: o('Supercharger', { acc: 1.1 }) },
  roof: { none: o('None'), rack: o('Roof rack'), box: o('Roof box'), lightbar: o('Light bar'), taxi: o('Taxi sign'), police: o('Siren') },
  exhaust: { single: o('Single'), dual: o('Dual'), quad: o('Quad'), side: o('Side pipes') },
  skirts: { none: o('None'), skirts: o('Side skirts') },
  decal: { none: o('None'), stripes: o('Racing stripes'), side: o('Side stripe'), twotone: o('Two-tone'), flames: o('Flames'), race: o('Race number'), checker: o('Checker strip') },
  horn: { classic: o('Classic'), truck: o('Air horn'), tune: o('La Cucaracha'), clown: o('Clown'), dixie: o('Dixie') },
  finish: { gloss: o('Gloss'), matte: o('Matte'), metallic: o('Metallic'), chrome: o('Chrome'), camo: o('Camo'), carbon: o('Carbon') },
  tint: { clear: o('Clear'), smoke: o('Smoke'), black: o('Limo black'), gold: o('Gold') },
  // performance and protection (Bay Customs)
  turbo: { none: o('None'), street: o('Street turbo', { acc: 1.12, top: 1.04 }), big: o('Big single', { acc: 1.24, top: 1.08 }), twin: o('Twin turbo', { acc: 1.34, top: 1.11 }) },
  gearbox: { stock: o('Stock'), sport: o('Close-ratio', { acc: 1.08 }), race: o('Sequential', { acc: 1.15, top: 1.03 }) },
  brakes: { stock: o('Stock'), sport: o('Sport', { brake: 1.25 }), race: o('Carbon ceramic', { brake: 1.55 }) },
  weight: { stock: o('Stock'), stripped: o('Stripped interior', { acc: 1.06, tough: 0.9 }), carbon: o('Carbon panels', { acc: 1.1, top: 1.02, tough: 0.95 }) },
  nitro: { none: o('None'), small: o('Single bottle', { nitro: 1 }), big: o('Twin bottles', { nitro: 2 }) },
  armour: { none: o('None'), light: o('Light plating', { tough: 1.45, acc: 0.96 }), heavy: o('Heavy armour', { tough: 2.1, acc: 0.9, top: 0.97 }) },
  glass: { stock: o('Stock'), bulletproof: o('Bulletproof', { bp: 1, acc: 0.98 }) },
  ram: { none: o('None'), bars: o('Ram bars', { ram: 1, tough: 1.1 }) },
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
    { key: 'lamps', type: 'choice', label: 'Headlights', options: opts(CAR_PARTS.lamps) },
    { key: 'grille', type: 'choice', label: 'Grille', options: opts(CAR_PARTS.grille) },
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
    { key: 'turbo', type: 'choice', label: 'Turbo', options: opts(CAR_PARTS.turbo) },
    { key: 'gearbox', type: 'choice', label: 'Gearbox', options: opts(CAR_PARTS.gearbox) },
    { key: 'nitro', type: 'choice', label: 'Nitrous', options: opts(CAR_PARTS.nitro) },
    { key: 'brakes', type: 'choice', label: 'Brakes', options: opts(CAR_PARTS.brakes) },
    { key: 'weight', type: 'choice', label: 'Weight', options: opts(CAR_PARTS.weight) },
  ] },
  { tab: 'Armour', items: [
    { key: 'armour', type: 'choice', label: 'Armour', options: opts(CAR_PARTS.armour) },
    { key: 'glass', type: 'choice', label: 'Windows', options: opts(CAR_PARTS.glass) },
    { key: 'ram', type: 'choice', label: 'Front', options: opts(CAR_PARTS.ram) },
  ] },
  { tab: 'Paint', items: [
    { key: 'finish', type: 'choice', label: 'Finish', options: opts(CAR_PARTS.finish) },
    { key: 'bodyColor', type: 'color', label: 'Body', palette: BASIC },
    { key: 'accentColor', type: 'color', label: 'Accent / decals', palette: BASIC },
    { key: 'decal', type: 'choice', label: 'Decals', options: opts(CAR_PARTS.decal) },
    { key: 'tint', type: 'choice', label: 'Window tint', options: opts(CAR_PARTS.tint) },
    { key: 'smokeColor', type: 'color', label: 'Tyre smoke', palette: ['#e8e8e8', '#16161b', '#ff3b4a', '#ff6fb5', '#b26bff', '#38e8ff', '#4cd964', '#ffd23f'] },
    { key: 'horn', type: 'choice', label: 'Horn', options: opts(CAR_PARTS.horn) },
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
  turbo: 'none', gearbox: 'stock', brakes: 'stock', weight: 'stock', nitro: 'none', armour: 'none', glass: 'stock', ram: 'none',
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
    ...DEFAULT_CAR, body: p(['hatch', 'hatch', 'sedan', 'sedan', 'sedan', 'coupe', 'pickup', 'van', 'muscle', 'sports', 'suv', 'suv', 'wagon', 'convertible', 'classic', 'lowrider', 'boxtruck', 'compact', 'compact', 'hothatch', 'jeep', 'minivan', 'minivan', 'gt']), lamps: p(['square', 'square', 'round', 'slim', 'slim', 'quad']), grille: p(['stock', 'stock', 'mesh', 'chrome', 'wide']),
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
  const s = { top: e.top, acc: e.acc / b.mass, grip: 1, off: c.body === 'buggy' ? 1.4 : 1, brake: 1, tough: c.body === 'bintruck' ? 1.6 : ['van', 'pickup', 'boxtruck', 'jeep', 'limo'].includes(c.body) ? 1.25 : 1, nitro: 0, bp: 0, runflat: 0, ram: 0 };
  if (b.boat) return { top: 29, acc: 10, grip: 0.42, off: 1, turn: 1.7, brake: 0.6, tough: 1, nitro: 0, boat: true }; // ~65 mph, slides through turns
  if (b.tractor) return { top: 13, acc: 5, grip: 1.4, off: 1.6, turn: 2.2, brake: 1, tough: 1.5, nitro: 0 };
  if (b.two === 'bike') return { top: 11, acc: 6, grip: 1.3, off: 1.1, turn: 3.2, two: 'bike', brake: 1, tough: 0.6, nitro: 0 };
  if (b.two === 'scooter') return { top: 8.5, acc: 5, grip: 1.2, off: 0.6, turn: 3.4, two: 'scooter', brake: 1, tough: 0.6, nitro: 0 };
  if (b.two === 'moto') { s.top *= 1.12; s.acc = e.acc * 1.25; s.grip = 1.05; }
  if (c.body === 'sports') { s.top *= 1.08; s.acc *= 1.1; s.grip *= 1.05; }
  if (['van', 'limo', 'pickup'].includes(c.body)) s.grip *= 0.93;
  for (const slot of ['tyres', 'suspension', 'wheelSize', 'front', 'rear', 'spoiler', 'hood', 'turbo', 'gearbox', 'brakes', 'weight', 'nitro', 'armour', 'glass', 'ram']) {
    const part = CAR_PARTS[slot][c[slot]]; if (!part) continue;
    for (const [k, v] of Object.entries(part.m)) { if (['nitro', 'bp', 'runflat', 'ram'].includes(k)) s[k] = v; else s[k] *= v; }
  }
  s.turn = 2.3 * s.grip;
  return s;
}
export function carStatBars(s) {
  const c = v => Math.max(0.03, Math.min(1, v));
  return [
    ['Top speed', c(s.top / 66), Math.round(s.top * 2.237) + 'mph'],
    ['Accel', c(s.acc / 24), (s.top / s.acc).toFixed(1) + 's'],
    ['Grip', c((s.grip - 0.5) / 0.9), Math.round(s.grip * 100)],
    ['Off-road', c(s.off / 2.2), Math.round(s.off * 100)],
    ['Braking', c((s.brake || 1) / 1.7), Math.round((s.brake || 1) * 100)],
    ['Toughness', c((s.tough || 1) / 2.6), Math.round((s.tough || 1) * 100)],
  ];
}
// performance class from speed, acceleration and grip: D, C, B, A, S
export function carClass(s) { const pi = (s.top / 60) * 40 + (s.acc / 22) * 35 + ((s.grip || 1) / 1.4) * 25; return pi > 78 ? 'S' : pi > 64 ? 'A' : pi > 52 ? 'B' : pi > 40 ? 'C' : 'D'; }
// what a car part does, for the chips: [label, '+12%', good]
const CFX = { top: ['top speed', 1], acc: ['accel', 1], grip: ['grip', 1], off: ['off-road', 1], brake: ['braking', 1], tough: ['toughness', 1] };
const CPERK = { nitro: 'Nitro boost: hold Burnout while moving', bp: 'Bullets can\'t hurt you inside', runflat: 'Keeps going when shot', ram: 'Smash cars out of the way' };
export function carPartEffects(slot, val) {
  const p = CAR_PARTS[slot]?.[val]; if (!p) return { fx: [], perk: null };
  if (slot === 'engine') { const st = CAR_PARTS.engine.stock.m; return { fx: [['top speed', `${p.m.top >= st.top ? '+' : ''}${Math.round((p.m.top / st.top - 1) * 100)}%`, p.m.top >= st.top], ['accel', `${p.m.acc >= st.acc ? '+' : ''}${Math.round((p.m.acc / st.acc - 1) * 100)}%`, p.m.acc >= st.acc]].filter(f => f[1] !== '+0%' && f[1] !== '0%'), perk: null }; }
  let perk = null; const fx = [];
  for (const [k, v] of Object.entries(p.m)) { if (CPERK[k]) { perk = k === 'nitro' && v > 1 ? 'Nitro x2: longer boosts' : CPERK[k]; continue; } const f = CFX[k]; if (!f) continue; const pct = Math.round((v - 1) * 100); if (pct) fx.push([f[0], (pct > 0 ? '+' : '') + pct + '%', pct > 0]); }
  return { fx: fx.sort((a, b) => b[2] - a[2]), perk };
}

// ---------------- geometry
let _crack = null;
export function crackTex() { /* spider-web cracks, drawn once */
  if (_crack) return _crack; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  x.strokeStyle = 'rgba(235,245,255,0.95)'; x.lineWidth = 1.4; let sd = 7; const r = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  for (let k = 0; k < 2; k++) { const cx = 40 + k * 50, cy = 50 + k * 25; const rays = [];
    for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283 + r() * 0.4, L = 40 + r() * 60; rays.push(a); x.beginPath(); x.moveTo(cx, cy); let px = cx, py = cy; for (let j = 1; j <= 5; j++) { px = cx + Math.cos(a + (r() - 0.5) * 0.25) * L * j / 5; py = cy + Math.sin(a + (r() - 0.5) * 0.25) * L * j / 5; x.lineTo(px, py); } x.stroke(); }
    for (const rr of [8, 18, 30]) { x.beginPath(); rays.forEach((a, i) => { const q = rr * (0.8 + r() * 0.4); i ? x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : x.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); }); x.closePath(); x.stroke(); }
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(cx, cy, 4, 0, 6.3); x.fill(); }
  _crack = new THREE.CanvasTexture(cv); return _crack;
}
function taper(w, h, l, topL, topW, shift) {
  const g = new THREE.BoxGeometry(w, h, l), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setZ(i, p.getZ(i) * topL + shift); p.setX(i, p.getX(i) * topW); }
  g.computeVertexNormals();
  return g;
}

// two-wheelers: bicycle, e-scooter, motorbike. Same interface as cars (wheels spin, lights work)

// farm tractor: big rear wheels, small fronts, cab with a roll cage, exhaust stack
// a speedboat: deep-V hull with a pointed bow, white deck, wraparound windscreen, two seats and a big outboard on the back
function buildBoat(c, B) {
  const grp = new THREE.Group(), M = (col, o = {}) => new THREE.MeshStandardMaterial({ color: col, roughness: 0.4, flatShading: true, ...o });
  const hull = M(c.bodyColor || '#ffffff', { metalness: 0.2 }), stripe = M(c.accentColor || '#2f80ed'), deck = M('#f4f1ea'), dark = M('#1a1a1c', { roughness: 0.8 }), seat = M('#c9302c');
  const glass = new THREE.MeshStandardMaterial({ color: '#3c4b5c', roughness: 0.05, metalness: 0.5, transparent: true, opacity: 0.75 });
  const headM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff2b0', emissiveIntensity: 0.6 });
  const tailM = new THREE.MeshStandardMaterial({ color: '#7a0a10', emissive: '#ff1a2a', emissiveIntensity: 0.5 });
  const revM = new THREE.MeshStandardMaterial({ color: '#d8dce0', emissive: '#ffffff', emissiveIntensity: 0 });
  const L = B.L, W = B.W, hl = L / 2;
  // hull: a box for the stern half, a wedge that tapers to a point for the bow
  const g = new THREE.BufferGeometry(), v = [], q = (a, b2, c2, d) => v.push(...a, ...b2, ...c2, ...a, ...c2, ...d);
  const s0 = -hl, s1 = 0.4, bow = hl, y0 = -0.35, y1 = 0.55, kw = 0.25; // keel narrow at the bottom: a deep V
  const P = { tlS: [-W / 2, y1, s0], trS: [W / 2, y1, s0], blS: [-kw, y0, s0], brS: [kw, y0, s0], tlM: [-W / 2, y1, s1], trM: [W / 2, y1, s1], blM: [-kw, y0, s1], brM: [kw, y0, s1], tB: [0, y1 + 0.1, bow], bB: [0, y0 + 0.35, bow - 0.2] };
  q(P.tlS, P.blS, P.blM, P.tlM); q(P.brS, P.trS, P.trM, P.brM); q(P.blS, P.brS, P.brM, P.blM); q(P.trS, P.tlS, P.blS, P.brS); // stern sides, bottom, transom
  v.push(...P.tlM, ...P.blM, ...P.bB, ...P.tlM, ...P.bB, ...P.tB, ...P.brM, ...P.trM, ...P.tB, ...P.brM, ...P.tB, ...P.bB, ...P.blM, ...P.brM, ...P.bB); // bow faces
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  const hm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: c.bodyColor || '#ffffff', roughness: 0.35, metalness: 0.2, flatShading: true, side: THREE.DoubleSide })); hm.castShadow = true; grp.add(hm);
  const bx = (w, h, d, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; grp.add(o); return o; };
  bx(W * 0.98, 0.12, L * 0.55, stripe, 0, 0.32, -0.9); // go-faster stripe along the sides
  bx(W - 0.2, 0.06, L * 0.56, deck, 0, 0.56, -1.0);   // cockpit floor / deck
  for (const sx of [-0.45, 0.45]) { bx(0.7, 0.35, 0.7, seat, sx, 0.75, -0.6); bx(0.7, 0.6, 0.15, seat, sx, 1.0, -0.95); } // two bucket seats
  bx(W - 0.3, 0.08, 1.6, deck, 0, 0.62, 1.3); // foredeck
  const ws = bx(W - 0.35, 0.55, 0.06, glass, 0, 0.95, 0.35); ws.rotation.x = -0.5; // windscreen
  bx(0.5, 0.35, 0.3, dark, 0.45, 0.85, 0.1); // dash
  { const w = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 22), dark); w.position.set(0.45, 1.1, -0.04); w.rotation.x = 0.55; w.castShadow = true; grp.add(w); const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), dark); col.rotation.x = Math.PI / 2; col.position.z = 0.11; w.add(col); } // steering wheel
  bx(0.5, 1.0, 0.55, dark, 0, 0.55, -hl - 0.2); bx(0.62, 0.45, 0.75, M('#e8e8ea'), 0, 1.2, -hl - 0.2); // outboard motor
  for (const sx of [-1, 1]) { const h = bx(0.18, 0.1, 0.06, headM, sx * 0.35, 0.68, hl - 0.6); h.rotation.y = sx * 0.4; bx(0.14, 0.1, 0.05, tailM, sx * (W / 2 - 0.15), 0.5, -hl - 0.01); }
  return { group: grp, wheels: [], headM, tailM, revM, glow: null, length: L, width: W, height: 1.3, wr: 0.3, boat: true, seat: { x: 0.45, y: 0.95, z: -0.62 }, grip: { x: 0.33, y: 1.13, z: -0.08 } };
}
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
  for (const sx of [-1, 1]) { for (const [ry, ox] of [[0.5, 0.86], [0.92, 0.8]]) { bx(0.3, 0.05, 0.24, steel, sx * ox, ry, 0.06); bx(0.04, ry - 0.3, 0.04, steel, sx * (ox - 0.12), 0.3 + (ry - 0.3) / 2 + 0.02, 0.06); } /* two step plates just in front of the big back wheel */
    const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), steel); gb.position.set(sx * 0.71, 1.62, -0.16); grp.add(gb); } // grab handle on the front cab post
  { const sw = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 22), dark); sw.position.set(0, 1.78, -0.42); sw.rotation.x = 0.7; grp.add(sw); // steering wheel
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), dark); col.rotation.x = Math.PI / 2; col.position.z = 0.25; sw.add(col); } // column down into the dash
  bx(1.3, 0.1, 0.12, steel, 0, 0.42, 1.15); for (const sx of [-1, 1]) bx(0.18, 0.16, 0.16, steel, sx * 0.55, 0.42, 1.15); bx(0.14, 0.32, 0.16, steel, 0, 0.55, 1.15); /* front axle beam joining the front wheels to the body */
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
  return { group: grp, wheels, headM, tailM, revM, glow: null, length: L, width: W, height: 2.9, wr: 0.6, tractor: true, seat: { x: 0, y: 1.32, z: -0.82 }, climb: { steps: [0.5, 0.92], floor: 1.14, footX: 0.8, grips: [[0.9, 1.66, -0.42], [0.71, 1.75, -0.16]] }, doorZ: 0.12 };
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
    if (kind === 'scooter') { const disc = new THREE.Mesh(new THREE.CylinderGeometry(wr * 0.72, wr * 0.72, 0.05, 14).rotateZ(Math.PI / 2), M('#c9ccd2', { metalness: 0.5 })); spin.add(disc); const mark = new THREE.Mesh(new THREE.BoxGeometry(0.056, wr * 0.5, 0.025), dark); mark.position.y = wr * 0.35; spin.add(mark); } /* a solid wheel with one mark, so you can see it roll */
    else for (let i = 0; i < (kind === 'bike' ? 12 : 5); i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.015, wr * 1.6, kind === 'moto' ? 0.05 : 0.012), hubM); sp.rotation.x = i / (kind === 'bike' ? 12 : 5) * Math.PI; spin.add(sp); }
    spin.add(new THREE.Mesh(new THREE.CylinderGeometry(wr * 0.18, wr * 0.18, 0.08, 10).rotateZ(Math.PI / 2), hubM));
    wheels.push({ pivot, spin, front: fz > 0 });
  }
  let seatY = 0.9, barY = 1.05, barZ = wz - 0.2, barW = 0.5, crank = null, crankY = wr, crankZ = 0;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const tube = (a, b2, r, m, parent = grp) => { const d = b2.clone().sub(a), len = d.length(), o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), m); o.position.copy(a).add(b2).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); o.castShadow = true; parent.add(o); return o; };
  const fork = new THREE.Group(); fork.position.set(0, 0, wz); grp.add(fork); // everything that turns with the bars: fork, bars, front light (pivots over the front axle)
  const fb = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z - wz); o.castShadow = true; fork.add(o); return o; };
  if (kind === 'bike') { /* a real diamond frame: every tube meets another */
    const BB = V(0, wr - 0.02, 0.02), S = V(0, wr + 0.44, -0.19), Ht = V(0, wr + 0.5, wz - 0.2), Hb = V(0, wr + 0.32, wz - 0.14), R = V(0, wr, -wz);
    tube(BB, S, 0.022, bodyM); tube(V(0, wr + 0.42, -0.18), Ht, 0.02, bodyM); tube(BB, Hb, 0.024, bodyM); tube(Hb, Ht, 0.026, bodyM);
    for (const sx of [-1, 1]) { tube(V(sx * 0.02, BB.y, BB.z), V(sx * 0.05, R.y, R.z), 0.013, bodyM); tube(V(sx * 0.02, S.y - 0.03, S.z), V(sx * 0.05, R.y, R.z), 0.012, bodyM); }
    tube(S, V(0, wr + 0.52, -0.21), 0.016, chrome); bx(0.13, 0.05, 0.24, dark, 0, wr + 0.54, -0.23); // seat post and saddle
    const hT = V(0, Ht.y, Ht.z - wz), hB = V(0, Hb.y, Hb.z - wz); // fork: from the head tube down to the front axle, stem up to the bars
    for (const sx of [-1, 1]) tube(V(sx * 0.03, hB.y, hB.z), V(sx * 0.05, wr, 0), 0.013, chrome, fork);
    tube(hT, V(0, wr + 0.64, -0.24), 0.018, chrome, fork); fb(0.5, 0.028, 0.028, dark, 0, wr + 0.64, wz - 0.24);
    for (const sx of [-1, 1]) fb(0.09, 0.034, 0.034, M('#2a2a2e'), sx * 0.2, wr + 0.64, wz - 0.24); // grips
    seatY = wr + 0.54; barY = wr + 0.64; barZ = wz - 0.24; barW = 0.5;
    crankY = BB.y; crankZ = BB.z; bx(0.09, 0.09, 0.09, dark, 0, crankY, crankZ); // bottom bracket
    crank = new THREE.Group(); crank.position.set(0, crankY, crankZ); grp.add(crank); // pedal arms that turn as you pedal
    for (const s2 of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.17), chrome); arm.position.set(s2 * 0.08, 0, s2 * 0.08); crank.add(arm); const ped = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.06), dark); ped.position.set(s2 * 0.13, 0, s2 * 0.16); crank.add(ped); }
    fb(0.07, 0.06, 0.05, headM, 0, wr + 0.56, wz - 0.17); // lamp clamped to the head tube
    bx(0.07, 0.05, 0.03, tailM, 0, wr + 0.4, -0.235); bx(0.04, 0.03, 0.02, revM, 0, wr + 0.35, -0.23); // rear light on the seat post
  } else if (kind === 'scooter') {
    bx(0.16, 0.05, L * 0.74, bodyM, 0, wr + 0.06, -0.03); // deck
    bx(0.12, 0.03, 0.2, bodyM, 0, wr + 0.11, -wz + 0.02); // rear mudguard over the back wheel
    tube(V(0, wr + 0.06, L * 0.34), V(0, wr + 0.12, wz - 0.06), 0.025, bodyM); // neck from the deck up to the stem
    const stem = M('#3a3d45', { metalness: 0.5 });
    for (const sx of [-1, 1]) tube(V(sx * 0.03, wr, 0), V(sx * 0.02, wr + 0.14, -0.04), 0.012, stem, fork);
    tube(V(0, wr + 0.12, -0.04), V(0, wr + 1.0, -0.12), 0.022, stem, fork); fb(0.46, 0.03, 0.03, dark, 0, wr + 1.0, wz - 0.12);
    for (const sx of [-1, 1]) fb(0.08, 0.036, 0.036, M('#2a2a2e'), sx * 0.19, wr + 1.0, wz - 0.12);
    fb(0.08, 0.06, 0.04, headM, 0, wr + 0.85, wz - 0.07); // light on the stem
    seatY = wr + 0.1; barY = wr + 1.0; barZ = wz - 0.12; barW = 0.46;
    bx(0.1, 0.04, 0.02, tailM, 0, wr + 0.12, -wz - 0.08); bx(0.04, 0.03, 0.02, revM, 0.06, wr + 0.12, -wz - 0.085);
  } else { // motorbike
    bx(0.32, 0.26, 0.6, bodyM, 0, wr + 0.42, 0.18);                     // tank
    bx(0.28, 0.1, 0.62, dark, 0, wr + 0.44, -0.35);                     // seat
    bx(0.3, 0.28, 0.4, M('#3a3d45', { metalness: 0.6 }), 0, wr + 0.12, 0.05);  // engine
    bx(0.08, 0.08, 0.7, chrome, 0.18, wr - 0.02, -0.4, -0.15);          // exhaust
    for (const sx of [-1, 1]) tube(V(sx * 0.07, wr + 0.6, -0.22), V(sx * 0.07, wr, 0), 0.03, chrome, fork); // forks
    fb(0.62, 0.04, 0.04, dark, 0, wr + 0.62, wz - 0.25);                // bars
    bx(0.3, 0.12, 0.3, bodyM, 0, wr + 0.18, -wz + 0.05);                // rear fender
    fb(0.36, 0.2, 0.18, bodyM, 0, wr + 0.5, wz - 0.18);                 // front cowl
    fb(0.16, 0.12, 0.05, headM, 0, wr + 0.48, wz - 0.07);               // headlight
    bx(0.12, 0.06, 0.04, tailM, 0, wr + 0.42, -wz + 0.02); bx(0.05, 0.04, 0.04, revM, 0.07, wr + 0.36, -wz + 0.02);
    seatY = wr + 0.5; barY = wr + 0.62; barZ = wz - 0.25; barW = 0.62;
  }
  return { group: grp, wheels, headM, tailM, revM, glow: null, length: L, width: B.W, height: barY + 0.1, wr, two: kind, seatY, barY, barZ, barW, crank, crankY, crankZ, fork };
}
// cars are drawn a size up from their old proportions so people fit in them; bikes, scooters and boats were already right
export const CAR_SCALE = 1.2;
export function buildCar(cfg) {
  const r = buildCarRaw(cfg);
  r.group.traverse(m => { if (!r.steerW && m.isMesh && m.geometry.type === 'TorusGeometry' && m.geometry.parameters.radius < 0.22) r.steerW = m; }); /* the steering wheel: give it spokes so you can see it turn */
  if (r.steerW) { const R = r.steerW.geometry.parameters.radius, mt = r.steerW.material; const a = new THREE.Mesh(new THREE.BoxGeometry(R * 1.9, 0.028, 0.02), mt), b2 = new THREE.Mesh(new THREE.BoxGeometry(0.028, R, 0.02), mt), hub = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), mt); b2.position.y = -R / 2; r.steerW.add(a, b2, hub); r.steerW.rotation.order = 'XYZ'; }
  if (r.two || r.boat) { r.s = 1; return r; }
  const S = CAR_SCALE; r.group.scale.setScalar(S); r.s = S;
  for (const k of ['length', 'width', 'height', 'wr', 'top', 'co', 'cl']) if (typeof r[k] === 'number') r[k] *= S; // world-size numbers (collisions, doors, smoke); local ones (seat, doors) scale with the group
  return r;
}
function buildCarRaw(cfg) {
  const c = { ...DEFAULT_CAR, ...cfg };
  const B = BODIES[c.body] || BODIES.coupe;
  if (B.two) return buildTwo(c, B);
  if (B.tractor) return buildTractor(c, B);
  if (B.boat) return buildBoat(c, B);
  const grp = new THREE.Group();
  let doors = null, seat = null, panes = null, rearZ = null, boxStep = null, bonBlk = null, tub0 = 0;
  const fin = c.finish;
  const look = { gloss: [0.25, 0.2], matte: [0.85, 0], metallic: [0.3, 0.75], chrome: [0.06, 1], camo: [0.8, 0], carbon: [0.35, 0.3] }[fin] || [0.3, 0.3];
  const bodyM = new THREE.MeshStandardMaterial({ color: c.bodyColor, roughness: look[0], metalness: look[1], flatShading: true });
  if (fin === 'camo' || fin === 'carbon') { bodyM.map = patternTexture(fin, c.bodyColor, c.accentColor); bodyM.map.repeat.set(2, 2); bodyM.color.set('#ffffff'); }
  const accM = new THREE.MeshStandardMaterial({ color: c.accentColor, roughness: 0.45, metalness: 0.2, flatShading: true });
  const m2c = {}, M2 = col => m2c[col] ||= new THREE.MeshStandardMaterial({ color: col, roughness: 0.45, metalness: 0.15, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: '#16161a', roughness: 0.8, flatShading: true });
  const chrome = new THREE.MeshStandardMaterial({ color: '#d0d4da', roughness: 0.15, metalness: 1 });
  const tintCol = { clear: '#a9d6ef', smoke: '#3c4b5c', black: '#0c0e12', gold: '#c89b3c' }[c.tint] || '#3c4b5c';
  const glass = new THREE.MeshStandardMaterial({ color: tintCol, roughness: 0.08, metalness: 0.5, transparent: true, opacity: { clear: 0.28, smoke: 0.5, gold: 0.6, black: 0.86 }[c.tint] ?? 0.5, flatShading: true, depthWrite: false }); /* see who's inside, unless you paid for the dark tint */
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
    for (const sx of [-1, 1]) { bx(0.45, 0.22, 0.45, dark, sx * 0.35, top + 0.06, B.co - 0.25); bx(0.45, 0.55, 0.1, dark, sx * 0.35, top + 0.3, B.co - 0.45); } // bucket seats you can see someone sat in
    { const sw = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 20), dark); sw.position.set(0.35, top + 0.5, B.co + 0.15); sw.rotation.x = 0.55; grp.add(sw); seat = { x: 0.35, y: top + 0.2, z: B.co - 0.27 }; }
    bx(W * 0.8, 0.12, 0.6, bodyM, 0, top + 0.06, halfL - 0.6);
  } else {
    /* every car is a shell: a solid floor pan, bonnet and boot, and an open cabin sunk into the body between them.
       The front doors are the cabin walls where they sit, so opening one leaves a real gap you can climb through */
    let body; const tub = B.topless ? Math.min(0.34, bh * 0.6) : bh * 0.74, fl = top - tub;
    const cz0 = B.topless ? B.co - B.cl / 2 - 0.25 : B.co - B.cl / 2, cz1 = B.co + B.cl / 2, W2 = W * 0.97;
    const dlx = Math.min(1.25, B.cl * 0.6), hzx = B.co + Math.min(B.cl, 2.2) * 0.5 - 0.02;
    body = add(taper(W, bh - tub, L, 0.99, 0.99, 0), bodyM, 0, clr + (bh - tub) / 2, 0);
    bonBlk = bx(W2, tub, halfL - cz1, bodyM, 0, top - tub / 2, (cz1 + halfL) / 2); tub0 = tub; // bonnet
    bx(W2, tub, cz0 + halfL, bodyM, 0, top - tub / 2, (cz0 - halfL) / 2); // boot
    for (const sx2 of [-1, 1]) for (const [a, b2] of [[cz0, Math.min(hzx - dlx, cz1)], [Math.max(hzx, cz0), cz1]]) if (b2 - a > 0.02) bx(0.12, tub, b2 - a, bodyM, sx2 * (W2 / 2 - 0.06), top - tub / 2, (a + b2) / 2); // cabin sides either side of the door
    bx(W2 - 0.24, 0.02, cz1 - cz0, M2('#1d1e22'), 0, fl + 0.01, (cz0 + cz1) / 2); // carpet
    bx(W2 - 0.24, tub * 0.8, 0.12, M2('#26272c'), 0, top - tub * 0.4, cz1 - 0.06); // dashboard face
    bx(W2 - 0.24, tub * 0.7, 0.06, M2('#26272c'), 0, fl + tub * 0.35, cz0 + 0.03); // back of the cabin
    // driver/passenger doors on hinges at their front edge, so people can open them to get in and out
    doors = {};
    const dl = Math.min(1.25, B.cl * 0.6), hz = B.co + Math.min(B.cl, 2.2) * 0.5 - 0.02;
    for (const sx of [-1, 1]) {
      const pv = new THREE.Group(); pv.position.set(sx * (W / 2 + 0.006), by, hz);
      { const mk = (h, yc, z0, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.11, h, z1 - z0), bodyM); m.position.set(-sx * 0.061, yc - by, (z0 + z1) / 2 - hz); m.castShadow = true; pv.add(m); return m; };
        if (B.box) { /* a lorry door stops above the front wheel: cut round the arch */ const fwz = L * 0.31, a0 = fwz - wr - 0.08, a1 = fwz + wr + 0.08, aTop = Math.min(top - 0.05, wr * 2 + 0.08), bot = clr * 0.15, z0 = hz - dl + 0.005, z1 = hz - 0.005;
          mk(top - aTop, (top + aTop) / 2, z0, z1); for (const [p0, p1] of [[z0, Math.min(z1, a0)], [Math.max(z0, a1), z1]]) if (p1 - p0 > 0.03) mk(aTop - bot, (aTop + bot) / 2, p0, p1); }
        else mk(bh, by, hz - dl + 0.005, hz - 0.005); pv.userData.mk = mk; } /* flush with the body: the door is the cabin wall */
      if (c.decal === 'twotone') { const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.045, bh * 0.4, dl), accM); t2.position.set(-sx * 0.0085, -bh * 0.23, -dl / 2); pv.add(t2); }
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.18), chrome); hd.position.set(sx * 0.03, bh * 0.22, -dl + 0.22); pv.add(hd); pv.userData.handle = hd;
      const cardM = M2('#2c2d33'); for (const m of [...pv.children]) if (m.isMesh && m.material === bodyM && m.geometry.parameters?.width > 0.1) { const P2 = m.geometry.parameters, cd = new THREE.Mesh(new THREE.BoxGeometry(0.012, Math.max(0.02, P2.height - 0.05), Math.max(0.02, P2.depth - 0.05)), cardM); cd.position.set(-sx * 0.122, m.position.y, m.position.z); pv.add(cd); } /* inside trim follows the door's own shape (cut round a lorry's wheel arch too) */
      if (!B.open && !B.topless) { const mir = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.1), c.decal === 'none' ? bodyM : accM); mir.position.set(sx * 0.11, bh / 2 + 0.07, -0.16); pv.add(mir); const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.04), dark); stalk.position.set(sx * 0.035, bh / 2 + 0.06, -0.16); pv.add(stalk); } /* wing mirror, on the door where it belongs */ /* the door's inside: trim and an armrest, not more paintwork */
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, dl * 0.45), M2('#45464e')); arm.position.set(-sx * 0.12, bh * 0.1, -dl * 0.55); pv.add(arm);
      grp.add(pv); doors[sx] = pv;
    }
    doors.len = dl; // (front hinge at the pivot, door runs back from it)
    if (B.box) { const a1 = L * 0.31 + wr + 0.08, sz = (a1 + hz) / 2, sl = Math.max(0.12, hz - a1 - 0.04); boxStep = { z: sz, grips: [] };
      for (const sx of [-1, 1]) { for (const [sy, sd] of [[clr * 0.35, 0.3], [clr * 0.8, 0.18]]) bx(sd, 0.06, sl, M2('#3a3d45'), sx * (W / 2 - 0.01 - sd / 2), sy, sz); // steps in front of the wheel, behind the door
        const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.7, 6), chrome); gb.position.set(sx * (W / 2 + 0.04), top + 0.35, hz + 0.06); grp.add(gb); } // grab handle up the door frame
      boxStep.grips = [[W / 2 + 0.04, top + 0.1, hz + 0.06], [W / 2 + 0.04, top + 0.6, hz + 0.06]]; }
    if (c.decal === 'twotone') { for (const sx of [-1, 1]) bx(0.02, bh * 0.45, L + 0.02, accM, sx * (W / 2 + 0.01), clr + bh * 0.22, 0); for (const sz of [-1, 1]) bx(W + 0.02, bh * 0.45, 0.02, accM, 0, clr + bh * 0.22, sz * (halfL + 0.01)); } // lower half in the second colour (a skin, not a block through the cabin)
    if (c.decal === 'side') for (const sx of [-1, 1]) bx(0.02, 0.1, L * 0.86, accM, sx * (W / 2 + 0.005), by + 0.05, 0);
    if (c.decal === 'flames') for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const len = L * (0.22 + (i % 2) * 0.12 + (i === 2 ? 0.12 : 0)); bx(0.02, 0.07, len, i % 2 ? M2('#ffd23f') : accM, sx * (W / 2 + 0.045), by - 0.1 + i * 0.07, L / 2 - len / 2 - 0.05); }
    if (c.decal === 'race') for (const sx of [-1, 1]) { bx(0.02, 0.42, 0.42, M2('#ffffff'), sx * (W / 2 + 0.045), by + 0.02, 0); bx(0.025, 0.3, 0.06, accM, sx * (W / 2 + 0.05), by + 0.02, 0); bx(0.025, 0.04, 0.18, accM, sx * (W / 2 + 0.05), by + 0.02 - 0.13, 0); } // a big number 1 on the doors
    if (c.decal === 'checker') for (const sx of [-1, 1]) for (let i = 0; i < 14; i++) bx(0.02, 0.06, L * 0.86 / 14, (i % 2) ? M2('#ffffff') : M2('#16161b'), sx * (W / 2 + 0.045), by + ((i % 2) ? 0.03 : 0.09) - 0.03, -L * 0.43 + (i + 0.5) * L * 0.86 / 14);
    // cabin
    const ch = B.ch, cl = B.cl;
    if (B.topless) {
      const ws = bx(W * 0.82, ch * 0.9, 0.06, glass, 0, top + ch * 0.45, B.co + cl / 2); ws.rotation.x = -0.45;
      bx(W * 0.84, 0.05, 0.08, bodyM, 0, top + ch * 0.85, B.co + cl / 2 - 0.15);
      const fl = top - Math.min(0.34, bh * 0.6); // seats down on the cabin floor
      for (const sx of [-1, 1]) { bx(0.46, 0.12, 0.46, dark, sx * 0.36, fl + 0.12, B.co - 0.05); bx(0.46, 0.55, 0.12, dark, sx * 0.36, fl + 0.42, B.co - 0.3); }
      const sw = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 8, 20), dark); sw.position.set(0.36, fl + 0.5, B.co + 0.32); sw.rotation.x = 0.55; grp.add(sw); // steering wheel on the driver's side
      seat = { x: 0.36, y: fl + 0.18, z: B.co - 0.08 };
    } else {
    const boxy = c.body === 'van' || B.boxy;
    /* the glasshouse is built pane by pane, so each door carries its own window and an open door leaves a real gap */
    const gx0 = W * 0.43, gx1 = gx0 * (boxy ? 0.92 : 0.86), gtL = boxy ? 0.92 : 0.68, gsh = boxy ? -0.04 : -0.08, gy0 = top, gy1 = top + ch;
    const gzf0 = B.co + cl / 2, gzr0 = B.co - cl / 2, gzf1 = B.co + cl / 2 * gtL + gsh, gzr1 = B.co - cl / 2 * gtL + gsh;
    glass.side = THREE.DoubleSide;
    const gpoly = (pts, mat, parent = grp, uvz = null, yb = gy0) => { const pos = [], uv = []; for (let i = 1; i < pts.length - 1; i++) for (const q of [pts[0], pts[i], pts[i + 1]]) { pos.push(q.x, q.y, q.z); if (uvz) uv.push((q.z - uvz[0]) / (uvz[1] - uvz[0] || 1), (q.y - yb) / ch); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (uvz) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); parent.add(m); return m; };
    const clipZ = (pts, lo, hi) => { let out = pts; for (const [lim, keep] of [[lo, z => z >= lo], [hi, z => z <= hi]]) { const src = out; out = []; for (let i = 0; i < src.length; i++) { const a = src[i], b2 = src[(i + 1) % src.length]; if (keep(a.z)) out.push(a); if (keep(a.z) !== keep(b2.z)) { const t = (lim - a.z) / (b2.z - a.z); out.push(a.clone().lerp(b2, t)); } } } return out; };
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    gpoly([V3(-gx0, gy0, gzf0), V3(gx0, gy0, gzf0), V3(gx1, gy1, gzf1), V3(-gx1, gy1, gzf1)], glass); // windscreen
    gpoly([V3(-gx0, gy0, gzr0), V3(gx0, gy0, gzr0), V3(gx1, gy1, gzr1), V3(-gx1, gy1, gzr1)], glass); // back window
    gpoly([V3(-gx1, gy1, gzr1), V3(gx1, gy1, gzr1), V3(gx1, gy1, gzf1), V3(-gx1, gy1, gzf1)], glass);
    const dz0 = hz - dl, dz1 = hz, doorWin = {};
    for (const sx of [-1, 1]) { const Q = [V3(sx * gx0, gy0, gzr0), V3(sx * gx0, gy0, gzf0), V3(sx * gx1, gy1, gzf1), V3(sx * gx1, gy1, gzr1)];
      for (const [lo, hi] of [[-99, dz0], [dz1, 99]]) { const q = clipZ(Q, lo, hi); if (q.length >= 3) gpoly(q, glass); } // fixed quarter lights
      const dw = clipZ(Q, dz0, dz1); if (dw.length >= 3) { const pv = doors[sx], loc = dw.map(q => q.clone().sub(pv.position)); gpoly(loc, glass, pv); /* the door's own window, which swings open with it */
        const fr = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, dl), bodyM); fr.position.set(-sx * (W / 2 - gx0) * 0.9, gy0 - pv.position.y + 0.015, -dl / 2); pv.add(fr); doorWin[sx] = { pts: loc }; } }
    // roof panel
    const roofL = boxy ? cl * 0.9 : cl * 0.62;
    const roofZ = B.co - (boxy ? 0.04 : 0.08);
    bx(W * 0.74, 0.06, roofL, bodyM, 0, top + ch + 0.02, roofZ);
    // pillars
    { const bz2 = hz - dl - 0.03; if (bz2 > B.co - cl / 2 * gtL + 0.1) for (const sx of [-1, 1]) { const p2 = bx(0.05, ch * 0.98, 0.07, bodyM, sx * (gx0 + gx1) / 2, top + ch / 2, bz2); p2.rotation.z = sx * Math.atan2(gx0 - gx1, ch); } } // B-pillar, just behind the door
    if (c.body === 'van') { const z0 = B.co - cl / 2 + 0.12, z1 = hz - dl - 0.06; if (z1 - z0 > 0.2) for (const sx of [-1, 1]) bx(0.03, ch * 0.62, z1 - z0, bodyM, sx * (W * 0.43 + 0.012), top + ch * 0.33, (z0 + z1) / 2); } /* blanked rear windows, behind the door only */
    { /* the inside you can see through the glass: seats, headrests, dash and wheel */
      const im = M2('#25262b'), dz = B.co - 0.08, tL = boxy ? 0.92 : 0.68, sh = boxy ? -0.04 : -0.08;
      const hip = Math.min(top - 0.12, top + ch - 0.74, top - bh * 0.45), cu = M2('#33343a'); /* proper seats: cushion, backrest, headrest, and a back bench in anything with four or more seats */
      const seatAt = (x, w, z) => { bx(w, 0.11, 0.46, cu, x, hip - 0.055, z); const bt = hip - 0.02, bt2 = top + ch * 0.42; const back = bx(w, bt2 - bt, 0.1, im, x, (bt + bt2) / 2, z - 0.27); back.rotation.x = -0.12; bx(Math.min(w * 0.55, 0.2), 0.11, 0.08, cu, x, bt2 + 0.07, z - 0.3); bx(w, hip - 0.06 - fl, 0.4, im, x, (hip - 0.06 + fl) / 2, z + 0.01); };
      for (const sx of [-1, 1]) seatAt(sx * W * 0.22, W * 0.25, dz);
      const rz = Math.max(dz - 0.82, B.co - cl / 2 + 0.33); if (!['coupe', 'sports', 'hyper', 'convertible', 'compact', 'gt'].includes(c.body) && !B.box && dz - rz >= 0.6) { seatAt(0, W * 0.68, rz); rearZ = rz; }
      bx(0.12, 0.14, 0.7, im, 0, fl + 0.07, dz + 0.05); // centre console
      bx(W * 0.76, 0.09, 0.22, im, 0, top + 0.03, B.co + cl / 2 - 0.22);
      const wz = Math.min(dz + 0.44, B.co + cl / 2 - 0.3), sw = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 6, 16), dark); sw.position.set(W * 0.22, top + 0.17, wz); sw.rotation.x = 0.5; grp.add(sw); /* within arm's reach of the driver */
      { const cz = (wz + B.co + cl / 2 - 0.22) / 2, col = bx(0.05, 0.05, Math.max(0.05, B.co + cl / 2 - 0.22 - wz), dark, W * 0.22, top + 0.1, cz); col.rotation.x = 0.5; }
      /* glass panes over each face of the cabin: these are what crack and smash */
      const pm = () => new THREE.MeshBasicMaterial({ map: crackTex(), transparent: true, depthWrite: false, opacity: 0.95 });
      const zf0 = B.co + cl / 2, zf1 = B.co + cl / 2 * tL + sh, zr0 = B.co - cl / 2, zr1 = B.co - cl / 2 * tL + sh, x0 = W * 0.43, x1 = W * 0.43 * (boxy ? 0.92 : 0.86);
      const pane = (w, h, mat) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.visible = false; m.renderOrder = 3; grp.add(m); return m; };
      const front = pane(W * 0.8, Math.hypot(zf0 - zf1, ch) * 0.86, pm()); front.position.set(0, top + ch / 2, (zf0 + zf1) / 2 + 0.015); front.rotation.x = -Math.atan2(zf0 - zf1, ch);
      const rear = pane(W * 0.76, Math.hypot(zr1 - zr0, ch) * 0.8, pm()); rear.rotation.order = 'YXZ'; rear.position.set(0, top + ch / 2, (zr0 + zr1) / 2 - 0.015); rear.rotation.y = Math.PI; rear.rotation.x = -Math.atan2(zr1 - zr0, ch);
      const side = {}; for (const sx of [-1, 1]) if (doorWin[sx]) { const pv = doors[sx], pts = doorWin[sx].pts.map(q => q.clone().add(new THREE.Vector3(sx * 0.012, 0, 0))), zs = pts.map(q => q.z), m = gpoly(pts, pm(), pv, [Math.min(...zs), Math.max(...zs)], gy0 - pv.position.y); m.material.side = THREE.DoubleSide; m.visible = false; m.renderOrder = 3; side[sx] = m; }
      panes = { front, rear, side };
    }
    }
    if (B.bin) { /* refuse truck: a rounded compactor body, ribbed sides, a hopper and bin lifter at the back, amber beacons */
      const boxL = halfL + (B.co - cl / 2) - 0.25, bz = -halfL + boxL / 2 + 0.05, hopL = 1.0, mainL = boxL - hopL, mz = bz + hopL / 2;
      add(taper(W * 1.0, 1.85, mainL, 0.97, 0.84, 0), bodyM, 0, top + 0.925, mz);
      { const ang = Math.atan2(W * 0.5 * 0.16, 1.85); for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) { const r = bx(0.05, 1.5, 0.09, M2('#2c6e3a'), sx * (W * 0.5 * (1 - 0.16 * 0.8 / 1.85) + 0.012), top + 0.8, mz - mainL / 2 + 0.3 + i * (mainL - 0.6) / 5); r.rotation.z = sx * ang; } } // ribs, lying on the sloped side
      for (const sx of [-1, 1]) bx(0.02, 0.18, mainL * 0.9, accM, sx * (W * 0.5 + 0.03), top + 0.3, mz); // white band
      const hz2 = -halfL + hopL / 2 + 0.05; add(taper(W * 1.04, 1.6, hopL, 0.55, 0.9, 0.18), bodyM, 0, top + 0.8, hz2); // the tailgate/hopper
      bx(W * 0.82, 0.55, 0.06, dark, 0, top + 0.45, -halfL + 0.06); // the mouth the rubbish goes in
      bx(W * 0.9, 0.08, 0.12, chrome, 0, top + 0.08, -halfL - 0.02); bx(W * 0.9, 0.08, 0.12, chrome, 0, clr + 0.15, -halfL - 0.08); // lifter bars
      for (let i = 0; i < 6; i++) { const st = bx(0.14, 0.42, 0.03, M2(i % 2 ? '#f2f2f2' : '#d4302c'), -W * 0.45 + i * W * 0.18, top + 1.25, -halfL + 0.25); st.rotation.z = 0.5; } // hazard chevrons
      for (const sx of [-1, 1]) { const be = add(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), new THREE.MeshStandardMaterial({ color: '#ffb020', emissive: '#ff9a00', emissiveIntensity: 1.2 }), sx * W * 0.3, top + B.ch + 0.11, B.co - 0.05); be.castShadow = false; }
    } else if (B.box) {
      const boxL = halfL + (B.co - cl / 2) - 0.25, bz = -halfL + boxL / 2 + 0.05;
      bx(W * 1.02, 1.9, boxL, c.decal === 'twotone' ? accM : new THREE.MeshStandardMaterial({ color: '#f2f2f2', roughness: 0.7, flatShading: true }), 0, top + 0.95, bz);
      bx(W * 1.04, 0.08, boxL + 0.04, accM, 0, top + 1.9, bz);
      bx(W * 0.9, 1.7, 0.04, dark, 0, top + 0.9, -halfL + 0.03);
    }
    if (B.spare) { const s = add(new THREE.CylinderGeometry(B.wr * 1.05, B.wr * 1.05, 0.26, 14), dark, 0, top + 0.1, -halfL - 0.14); s.rotation.x = Math.PI / 2; const hb = add(new THREE.CylinderGeometry(B.wr * 0.5, B.wr * 0.5, 0.28, 10), rimM, 0, top + 0.1, -halfL - 0.15); hb.rotation.x = Math.PI / 2; for (const sx of [-1, 1]) bx(0.06, 0.06, 0.06, chrome, sx * W * 0.42, top + 0.02, halfL - 0.2); }
    if (B.fins) for (const sx of [-1, 1]) { const f = bx(0.08, 0.32, 1.1, bodyM, sx * (W / 2 - 0.08), top + 0.12, -halfL + 0.6); f.rotation.x = 0.18; }
    if (B.bed) {
      const bedL = halfL - (B.co + cl / 2) - 0.1, bz = -halfL + bedL / 2 + 0.05;
      for (const sx of [-1, 1]) bx(0.08, 0.35, bedL, bodyM, sx * (W / 2 - 0.04), top + 0.17, bz);
      bx(W, 0.35, 0.08, bodyM, 0, top + 0.17, -halfL + 0.06);
      bx(W - 0.16, 0.02, bedL, dark, 0, top + 0.01, bz);
    }
    if (c.decal === 'stripes') {
      for (const sx of [-0.18, 0.18]) {
        { const zA = -L * 0.49, zB = L * 0.49; for (const [a, b2] of [[zA, cz0], [cz1, zB]]) if (b2 > a) bx(0.16, 0.01, b2 - a, accM, sx, top + 0.005, (a + b2) / 2); } // over the bonnet and boot, not across the open cabin
        if (!B.topless) bx(0.16, 0.01, cl * 0.62, accM, sx, top + ch + 0.055, B.co - 0.08);
      }
    }
  }
  // grille & lights (shapes vary so traffic doesn't all look the same)
  const gr = c.grille || 'stock', lp = c.lamps || 'square';
  if (gr === 'wide') bx(W * 0.72, bh * 0.45, 0.04, dark, 0, by - 0.05, halfL + 0.01);
  else bx(W * 0.5, bh * 0.35, 0.04, dark, 0, by - 0.02, halfL + 0.01);
  if (gr === 'chrome') for (let i = 0; i < 3; i++) bx(W * 0.5, 0.025, 0.05, chrome, 0, by - 0.08 + i * 0.06, halfL + 0.02);
  if (gr === 'mesh') for (let i = -3; i <= 3; i++) bx(0.02, bh * 0.33, 0.05, chrome, i * W * 0.07, by - 0.02, halfL + 0.02);
  for (const sx of [-1, 1]) {
    if (lp === 'round') { const r = add(new THREE.CylinderGeometry(0.085, 0.085, 0.05, 12), headM, sx * W * 0.34, by + 0.06, halfL + 0.02); r.rotation.x = Math.PI / 2; }
    else if (lp === 'slim') bx(W * 0.26, 0.045, 0.05, headM, sx * W * 0.31, by + 0.12, halfL + 0.01);
    else if (lp === 'quad') { for (const k of [0, 1]) { const r = add(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), headM, sx * W * (0.26 + k * 0.13), by + 0.07, halfL + 0.02); r.rotation.x = Math.PI / 2; } }
    else bx(W * 0.2, 0.1, 0.05, headM, sx * W * 0.33, by + 0.08, halfL + 0.01);
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


  // ---- wheels
  const wheelbase = L * 0.62, chunky = ['buggy', 'jeep', 'pickup'].includes(c.body) || c.wheels === 'offroad' || (c.tyres || '') === 'offroad', track = chunky ? W / 2 + 0.01 : W / 2 - 0.1; /* ordinary cars: tyres tucked in under the body, not sticking out */
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
  // underglow: a soft oval pool that fades out past the sills
  let glow = null;
  if (c.underglow === 'on') {
    glow = new THREE.Mesh(new THREE.PlaneGeometry(W + 3.2, L + 2.8), new THREE.MeshBasicMaterial({ color: c.glowColor, map: glowTex(), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.24; glow.renderOrder = 2; grp.add(glow); // high enough to clear kerbs and pavement slabs, so it doesn't flicker
  }
  grp.traverse(m => { if (m.isMesh) m.castShadow = m !== glow; }); // (the glow itself casts no shadow)
  const heads = { '-1': [], '1': [] }; grp.traverse(m => { if (m.material === headM) heads[m.position.x < 0 ? '-1' : '1'].push(m); }); // each side's headlamp, so one can get smashed
  const tails = { '-1': [], '1': [] }; grp.traverse(m => { if (m.material === tailM) tails[m.position.x < 0 ? '-1' : '1'].push(m); });
  let bonnet = null; const bz0 = B.co + B.cl / 2, bl = halfL - bz0 - 0.06;
  if (!B.open && !B.box && !B.topless && bl > 0.45 && doors) { /* a bonnet on a hinge by the windscreen: a big enough knock pops it, and it flaps as you drive */
    bonnet = new THREE.Group(); bonnet.position.set(0, top + 0.004, bz0 + 0.02); grp.add(bonnet);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.03, bl), bodyM); lid.position.set(0, 0.016, bl / 2); lid.castShadow = true; bonnet.add(lid);
    for (const m of [...grp.children]) if (m.isMesh && m !== lid && m.position.y > top - 0.005 && m.position.y < top + 0.2 && m.position.z > bz0 + 0.05 && Math.abs(m.position.x) < W * 0.45 && m.material !== headM) { grp.remove(m); m.position.sub(bonnet.position); m.position.y += 0.03; bonnet.add(m); }
    if (bonBlk) { /* an engine bay under the lid: recess the front, put an engine, battery, air box and radiator in it */
      const dep = 0.14, L2 = halfL - bz0; bonBlk.geometry.dispose(); bonBlk.geometry = new THREE.BoxGeometry(W * 0.97, tub0 - dep, L2); bonBlk.position.y = top - tub0 / 2 - dep / 2;
      for (const sx of [-1, 1]) bx(0.1, dep, L2, bodyM, sx * (W * 0.97 / 2 - 0.05), top - dep / 2, bz0 + L2 / 2); bx(W * 0.97, dep, 0.08, bodyM, 0, top - dep / 2, halfL - 0.04); bx(W * 0.97, dep, 0.06, dark, 0, top - dep / 2, bz0 + 0.03);
      bx(W * 0.86, 0.01, L2 - 0.1, dark, 0, top - dep + 0.005, bz0 + L2 / 2); bx(W * 0.4, 0.1, L2 * 0.42, M2('#5d626b'), 0, top - dep + 0.06, bz0 + L2 * 0.45); bx(W * 0.32, 0.03, L2 * 0.36, M2('#7a7f88'), 0, top - dep + 0.12, bz0 + L2 * 0.45);
      bx(W * 0.16, 0.07, 0.2, M2('#2a2c31'), W * 0.27, top - dep + 0.045, bz0 + L2 * 0.7); bx(0.16, 0.08, 0.13, M2('#1a1a1c'), -W * 0.3, top - dep + 0.05, bz0 + L2 * 0.3); bx(0.03, 0.02, 0.03, M2('#c0392b'), -W * 0.3 + 0.05, top - dep + 0.1, bz0 + L2 * 0.3 - 0.04);
      bx(W * 0.62, dep - 0.03, 0.04, M2('#3a3d45'), 0, top - dep / 2, halfL - 0.12); } }
  return { group: grp, wheels, headM, tailM, revM, glow, length: L, width: W, height: top + B.ch, wr, doors, heads, tails, bonnet, panes, rearZ, ch: B.ch, top, co: B.co, cl: B.cl, topless: !!B.topless, body: c.body, seat, drv: seat || { x: W * 0.22, y: Math.min(top - 0.12, top + B.ch - 0.74, top - bh * 0.45), z: B.co - 0.08 }, /* sat down in the car, not perched on it */ climb: B.box ? { steps: [clr * 0.35 + 0.03, clr * 0.8 + 0.03], floor: top - 0.3, footX: W / 2 - 0.15, grips: boxStep?.grips } : null, doorZ: boxStep ? boxStep.z : undefined, doorOpen: B.box ? 1.45 : 1.05 };
}

let _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d');
  const g = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  for (let i = 0; i <= 12; i++) { const t = i / 12; const a = t < 0.3 ? 1 : Math.pow(Math.cos((t - 0.3) / 0.7 * Math.PI / 2), 1.7); g.addColorStop(t, `rgba(255,255,255,${a.toFixed(3)})`); }
  x.fillStyle = g; x.fillRect(0, 0, N, N);
  _glowTex = new THREE.CanvasTexture(cv); _glowTex.colorSpace = THREE.SRGBColorSpace; return _glowTex;
}

export const CAR_PRICES = { compact: 5000, hothatch: 21000, jeep: 28000, minivan: 15000, gt: 64000, tractor: 12000, scooter: 800, bike: 400, moto: 9000, hatch: 6000, sedan: 9000, wagon: 11000, coupe: 16000, van: 14000, pickup: 18000, suv: 26000, classic: 30000, lowrider: 24000, convertible: 38000, muscle: 42000, buggy: 15000, boxtruck: 22000, bintruck: 30000, sports: 85000, limo: 70000, hyper: 160000 };
