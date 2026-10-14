// Pedestrians: baked low-poly people who stroll sidewalks, wander the beach, flee from trouble.
import * as THREE from '../lib/three.module.min.js';
import { buildCharacter, randomChar, disposeObject } from './character.js?v=160';
import { CITIES, sandLine, shoreLine, groundH, walkable as worldWalkable, resolve } from './world.js?v=160';
// interiors swap in their own floor test so brawlers can move around inside
let walkable = worldWalkable; export function setWalk(fn) { walkable = fn || worldWalkable; }

const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 }); // boxes keep crisp per-face normals; rounded parts stay smooth
const SKINS = ['#ffe0cc', '#f6c9a4', '#e8b088', '#d39a6a', '#b77a4b', '#8d5524', '#6b3f22', '#452a1a'];
const HAIRS = ['#141414', '#3b2416', '#6b4423', '#a0602d', '#d8b26e', '#f3e7c4', '#9a9a9a'];
const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);

function bake(meshes, inv) {
  const P = [], N = [], C = [], v = new THREE.Vector3(), m4 = new THREE.Matrix4(), nm = new THREE.Matrix3(), c = new THREE.Color();
  for (const m of meshes) {
    if (m.material.transparent && m.material.opacity < 0.5) continue;
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
    m4.multiplyMatrices(inv, m.matrixWorld); nm.getNormalMatrix(m4);
    if (m.userData.ink) c.set(m.userData.ink); else { c.copy(m.material.color); if (m.material.emissive && m.material.emissiveIntensity > 0.5) c.lerp(m.material.emissive, 0.5); } // tattoos bake to ink patches
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(m4); P.push(v.x, v.y, v.z); v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); N.push(v.x, v.y, v.z); C.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.computeBoundingSphere();
  return g;
}
function underAny(o, roots) { for (let p = o; p; p = p.parent) if (roots.includes(p)) return true; return false; }

const LOOKS = [];
// a big pool of first and last names so the city is full of distinct people
const FIRST_M = ['James', 'Marcus', 'Leo', 'Andre', 'Tyler', 'Diego', 'Ethan', 'Malik', 'Owen', 'Hugo', 'Ravi', 'Kenji', 'Luca', 'Omar', 'Felix', 'Jamal', 'Noah', 'Caleb', 'Mateo', 'Darius', 'Sam', 'Theo', 'Isaac', 'Rico', 'Jonah', 'Elijah', 'Kai', 'Nate', 'Vince', 'Troy', 'Wes', 'Abdul', 'Ivan', 'Pedro', 'Hank', 'Dev', 'Ray', 'Zane', 'Colby', 'Ahmed'];
const FIRST_F = ['Jade', 'Mia', 'Sofia', 'Chloe', 'Lexi', 'Nina', 'Ava', 'Zoe', 'Maya', 'Bella', 'Kira', 'Luna', 'Rosa', 'Tasha', 'Gabi', 'Leah', 'Imani', 'Priya', 'Yuki', 'Carmen', 'Brooke', 'Skye', 'Dana', 'Nadia', 'Erin', 'Fatima', 'Grace', 'Holly', 'Iris', 'Jasmine', 'Kayla', 'Lola', 'Megan', 'Nova', 'Olivia', 'Paige', 'Quinn', 'Rachel', 'Sienna', 'Tara'];
const LAST = ['Johnson', 'Garcia', 'Nguyen', 'Kim', 'Patel', 'Lopez', 'Brown', 'Okafor', 'Silva', 'Murphy', 'Rossi', 'Chen', 'Walker', 'Rivera', 'Haddad', 'Novak', 'Reyes', 'Santos', 'Brooks', 'Diaz', 'Cole', 'Ward', 'Price', 'Fox', 'Mendoza', 'Hayes', 'Bennett', 'Park', 'Yamada', 'Costa', 'Ali', 'Kowalski', 'Moreau', 'Jensen', 'Ortiz', 'Grant', 'Shaw', 'Ramos', 'Bell', 'Stone', 'Vega', 'Lee', 'Adams', 'Cruz', 'Holt', 'Banks', 'Monroe', 'Webb', 'Duarte', 'Sato'];
let nameSeq = Math.floor(Math.random() * 4000);
let reservedFn = null; export function setReservedNames(fn) { reservedFn = fn; } // names already taken by your partner, family and contacts
export function personName(fem) { const R = reservedFn?.(); for (let k = 0; k < 12; k++) { const n = rawName(fem); if (!R || !R.has(n) && !R.has(n.split(' ')[0])) return n; } return rawName(fem); }
function rawName(fem) { nameSeq = (nameSeq * 1103515245 + 12345) % 2147483647; const r = nameSeq; return (fem ? FIRST_F : FIRST_M)[r % 40] + ' ' + LAST[Math.floor(r / 40) % LAST.length]; }
const FEM_HAIR = ['long', 'bob', 'ponytail', 'bun', 'long', 'afro'], MASC_HAIR = ['short', 'buzz', 'quiff', 'spiky', 'afro', 'none', 'short'];
function makeLook(beach, fem = Math.random() < 0.5, style = 'mid', tweak = null) {
  const cfg = { ...randomChar(), mask: 'none', skin: pick(SKINS), hairColor: pick(HAIRS), eyewear: Math.random() < 0.25 ? 'shades' : 'none', back: Math.random() < 0.15 ? 'backpack' : 'none', eyes: 'normal', headSize: rand(0.95, 1.1), height: rand(0.88, 1.12) };
  cfg.hat = Math.random() < 0.3 ? pick(['cap', 'beanie', 'cowboy', 'headband']) : 'none';
  cfg.hair = pick(fem ? FEM_HAIR : MASC_HAIR);
  if (fem) {
    const fig = pick(['slim', 'slim', 'athletic', 'athletic', 'curvy', 'curvy', 'curvy', 'plus']);
    const glam = beach ? rand(0.3, 1) : rand(0, 1);
    Object.assign(cfg, { fem: true, figure: fig, glam, facialHair: 'none', headShape: 'box', mouth: 'smile', legs: rand(1.0, 1.08), headSize: rand(0.92, 1.0),
      height: rand(0.9, 1.0), build: { slim: 0.82, athletic: 0.92, curvy: 0.92, plus: 1.18 }[fig],
      hairColor: pick(['#141414', '#3b2416', '#6b4423', '#a0402d', '#d8b26e', '#f3e7c4', '#e8c76a', '#7a2a2a']), lips: pick(['#c0395a', '#d6455d', '#b05a6a', '#e07a8a', '#8b1e3f']) });
    if (glam > 0.6) cfg.hair = pick(['long', 'long', 'ponytail', 'bob']);
    if (!beach) Object.assign(cfg, { top: pick(glam > 0.5 ? ['crop', 'tank', 'tshirt', 'crop', 'jacket'] : ['tshirt', 'long', 'hoodie', 'jacket']), pants: pick(glam > 0.5 ? ['skirt', 'jeans', 'skirt', 'shorts'] : ['jeans', 'skirt', 'cargo']), topColor: pick(['#ff6fb5', '#ffffff', '#16161b', '#e23b3b', '#9b51e0', '#ffd23f', '#1fb5a8', '#f2d0c4']), pantsColor: pick(['#16161b', '#2f80ed', '#ffffff', '#8b1e3f', '#c2b280', '#3a3d45']), shoes: pick(['sneakers', 'boots']) });
    if (glam < 0.2) Object.assign(cfg, { hat: pick(['beanie', 'cap', 'none']), eyewear: pick(['glasses', 'none']) });
  }
  else if (cfg.facialHair === undefined) cfg.facialHair = 'none';
  if (beach) Object.assign(cfg, { top: fem ? pick(['swimtop', 'swimtop', 'tank']) : pick(['shirtless', 'shirtless', 'tank', 'tshirt']), pants: fem ? pick(['swim', 'swim', 'shorts']) : pick(['swim', 'shorts']), shoes: 'bare', eyewear: Math.random() < 0.5 ? 'shades' : 'none', hat: Math.random() < 0.3 ? (fem ? 'none' : 'cap') : 'none' });
  else { if (['armor', 'shirtless', 'swimtop'].includes(cfg.top)) cfg.top = 'tshirt'; if (cfg.pants === 'swim') cfg.pants = 'jeans'; }
  if (!fem) { if (cfg.top === 'crop' || cfg.top === 'dress') cfg.top = 'tshirt'; if (['skirt', 'longskirt', 'leggings'].includes(cfg.pants)) cfg.pants = 'jeans'; if (cfg.shoes === 'heels') cfg.shoes = 'sneakers'; if (cfg.neck === 'pearls') cfg.neck = 'none'; }
  if (!fem && Math.random() < 0.22) cfg.muscle = rand(0.3, 0.95); // gym rats, dad bods, all sorts
  if (Math.random() < 0.22) cfg.fat = rand(0.2, 0.8);
  cfg.height = (cfg.height || 1) * rand(0.94, 1.08);
  // districts dress differently: suits downtown, hoodies and tracksuits in Eastport
  if (!beach && style === 'downtown' && Math.random() < 0.38) Object.assign(cfg, { top: 'suit', topColor: pick(['#16161b', '#2a3550', '#3a3d45', '#5a5d64']), pants: fem && Math.random() < 0.5 ? 'skirt' : 'jeans', pantsColor: pick(['#16161b', '#2a3550', '#3a3d45']), shoes: 'boots', shoeColor: '#16161b', hat: 'none', back: Math.random() < 0.3 ? 'backpack' : 'none' });
  if (!beach && style === 'east' && Math.random() < 0.55) Object.assign(cfg, { top: pick(['hoodie', 'hoodie', 'tshirt', 'jacket']), topColor: pick(['#16161b', '#3a3d45', '#55602f', '#5a2a2a', '#2a3550']), pants: pick(['cargo', 'jeans']), pantsColor: pick(['#16161b', '#3a3d45', '#55602f']), hat: pick(['beanie', 'cap', 'none', 'none']) });
  if (Math.random() < (style === 'east' ? 0.42 : 0.28)) { // some people are inked; your designs stay yours
    const pool = TAT_POOL.filter(d => !playerInk.includes(d)), spots = fem ? ['foreL', 'foreR', 'armL', 'neck', 'handR'] : ['armR', 'armL', 'foreR', 'foreL', 'neck', 'handR', 'handL', 'chest', 'back'];
    cfg.tattoos = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => ({ spot: pick(spots), design: pick(pool), ink: Math.random() < 0.8 ? '#1c2333' : pick(['#8b1e3f', '#1f4a8a', '#2f6b3a']) }));
  }
  if (tweak) tweak(cfg);
  return { ...bakeCfg(cfg), beach, fem };
}
// the same person every time: a look generated from their seed (plus work clothes for their job)
export function seededLook(seed, fem, beach, style, tweak) { const save = Math.random; let s = seed % 2147483646 + 1; Math.random = () => (s = (s * 16807) % 2147483647) / 2147483647; try { return makeLook(beach, fem, style, tweak); } finally { Math.random = save; } }
// Bake any character config into 5 meshes (body + 4 limbs) so lots of people are cheap to draw.
export function bakeCfg(cfg) {
  const ch = buildCharacter(cfg); ch.root.updateMatrixWorld(true);
  const limbs = [ch.legL.pivot, ch.legR.pivot, ch.armL.pivot, ch.armR.pivot];
  const all = []; ch.root.traverse(o => { if (o.isMesh) all.push(o); });
  const body = bake(all.filter(m => !underAny(m, limbs)), new THREE.Matrix4());
  const parts = limbs.map(l => { const meshes = all.filter(m => underAny(m, [l])); return { geo: bake(meshes, l.matrixWorld.clone().invert()), pos: new THREE.Vector3().setFromMatrixPosition(l.matrixWorld) }; });
  disposeObject(ch.root);
  return { body, parts, h: ch.height, cfg };
}
export function figure(look) {
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const body = new THREE.Mesh(look.body, MAT); body.castShadow = true; inner.add(body);
  const limbs = look.parts.map(p => { const g = new THREE.Group(); g.position.copy(p.pos); const m = new THREE.Mesh(p.geo, MAT); m.castShadow = true; g.add(m); inner.add(g); return g; });
  return { root, inner, limbs };
}
function homelessLook() {
  const dull = ['#5a5040', '#3a3d45', '#55602f', '#6b4a33', '#4a4a52', '#7a6a50'];
  const cfg = { ...randomChar(), mask: 'none', skin: pick(SKINS), hairColor: pick(['#3b2416', '#6b6b6b', '#9a9a9a', '#141414']), eyewear: 'none', back: Math.random() < 0.5 ? 'backpack' : 'none', eyes: 'normal',
    top: pick(['hoodie', 'jacket', 'long']), topColor: pick(dull), accent: pick(dull), pants: pick(['cargo', 'jeans']), pantsColor: pick(dull), shoes: 'boots', shoeColor: '#3a2a1a', hat: Math.random() < 0.6 ? 'beanie' : 'none', hatColor: pick(dull), facialHair: pick(['bigbeard', 'beard', 'stubble']), hair: pick(['long', 'short', 'afro']) };
  return { ...bakeCfg(cfg), homeless: true };
}
function ensureLooks() { if (LOOKS.length) return; for (let i = 0; i < 12; i++) LOOKS.push(makeLook(false, i % 2 === 0)); for (let i = 0; i < 8; i++) LOOKS.push(makeLook(true, i % 2 === 0)); for (let i = 0; i < 3; i++) LOOKS.push(homelessLook()); }
const cityLooks = () => LOOKS.filter(l => !l.beach && !l.homeless);
// keep inventing new people: most spawns get a brand-new look (face, body, hair, clothes) until there are 200 of them
const TAT_POOL = ['rose', 'skull', 'heart', 'anchor', 'dagger', 'snake', 'crown', 'swallow', 'dice', 'flame', 'bolt', 'compass', 'tribal', 'money', 'eye', 'cross', 'web', 'clock', 'seven', 'wings', 'moon'];
let playerInk = []; export function setPlayerInk(list) { playerInk = list || []; }
let townSource = null; export function setTownSource(fn) { townSource = fn; }
function freshLook(beach, style = 'mid') {
  const known = townSource?.(beach); if (known) return known;
  const pool = LOOKS.filter(l => !l.homeless && !!l.beach === beach && (beach || (l.style || 'mid') === style));
  if (LOOKS.length < 260 && (Math.random() < 0.7 || pool.length < 6)) { const l = makeLook(beach, Math.random() < 0.5, style); l.style = style; LOOKS.push(l); return l; }
  return pick(pool);
}
const UMB_M = ['#16161b', '#c9302c', '#2f80ed', '#ffd23f', '#4cd964', '#ff6fb5'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, side: THREE.DoubleSide }));
function umbrella() { const g = new THREE.Group(), stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5), UMB_M[0]); stick.position.set(0.28, 1.6, 0.15); g.add(stick); const top = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.3, 8, 1, true), UMB_M[1 + Math.floor(Math.random() * 5)]); top.position.set(0.28, 2.15, 0.15); g.add(top); return g; }
// walk styles: women sway the hips with a quicker, narrower step; men vary from swagger to brisk to slouched
function gaitFor(look) {
  const r = Math.random();
  if (look?.fem) return r < 0.45 ? { cad: 1.12, stride: 0.85, arm: 0.8, armOut: 0.05, sway: 0.07, twist: 0.12, bounce: 0.02, lean: 0 } // catwalk sway
    : r < 0.8 ? { cad: 1.05, stride: 0.95, arm: 1, armOut: 0.04, sway: 0.04, twist: 0.08, bounce: 0.03, lean: 0.02 } // easy stroll
    : { cad: 1.2, stride: 0.9, arm: 1.2, armOut: 0.05, sway: 0.03, twist: 0.05, bounce: 0.04, lean: 0.05 }; // brisk
  return r < 0.3 ? { cad: 0.85, stride: 1.2, arm: 1.3, armOut: 0.16, sway: 0.03, twist: 0.1, bounce: 0.05, lean: -0.03 } // swagger
    : r < 0.6 ? { cad: 1.0, stride: 1.0, arm: 1, armOut: 0.08, sway: 0.015, twist: 0.04, bounce: 0.03, lean: 0.03 } // normal
    : r < 0.82 ? { cad: 1.18, stride: 1.05, arm: 1.15, armOut: 0.06, sway: 0.01, twist: 0.03, bounce: 0.02, lean: 0.08 } // brisk, late for work
    : { cad: 0.9, stride: 0.8, arm: 0.5, armOut: 0.04, sway: 0.02, twist: 0.02, bounce: 0.01, lean: 0.12 }; // slouched
}
const PROP = new THREE.MeshStandardMaterial({ vertexColors: false, color: '#ffffff', roughness: 0.9 });
const pm = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
const BAG_M = [pm('#3a5f7a'), pm('#7a3a3a'), pm('#55602f')], CARD_M = pm('#b89a6a'), CART_M = new THREE.MeshStandardMaterial({ color: '#c9ccd2', metalness: 0.6, roughness: 0.4 });
function propBox(w, h, d, m, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y + h / 2, z); b.castShadow = true; return b; }

const R = 16.6; // sidewalk loop offset from block centre
function perim(s) { // param 0..8R around a square, clockwise from the NW corner
  const L = 2 * R; s = ((s % (4 * L)) + 4 * L) % (4 * L);
  if (s < L) return [-R + s, -R, 1, 0];
  if (s < 2 * L) return [R, -R + (s - L), 0, 1];
  if (s < 3 * L) return [R - (s - 2 * L), R, -1, 0];
  return [-R, R - (s - 3 * L), 0, -1];
}
const cornerS = (sx, sz) => sx < 0 && sz < 0 ? 0 : sx > 0 && sz < 0 ? 2 * R : sx > 0 && sz > 0 ? 4 * R : 6 * R;

export class Peds {
  constructor(parent) { this.parent = parent; this.list = []; }
  makePed(look) {
    const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
    const body = new THREE.Mesh(look.body, MAT); body.castShadow = true; inner.add(body);
    const limbs = look.parts.map(p => { const g = new THREE.Group(); g.position.copy(p.pos); const m = new THREE.Mesh(p.geo, MAT); m.castShadow = true; g.add(m); inner.add(g); return g; });
    this.parent.add(root);
    return { root, inner, limbs, phase: Math.random() * 6, face: 0, speed: rand(1.1, 1.7), state: 'walk', t: 0, h: look.h, look, name: look.person ? look.person.name : personName(look.fem), person: look.person || null };
  }
  spawnCity(c, px, pz) {
    for (let k = 0; k < 10; k++) {
      const i = c.kx[0] + Math.floor(Math.random() * (c.kx[1] - c.kx[0])), j = c.kz[0] + Math.floor(Math.random() * (c.kz[1] - c.kz[0]));
      const bx = c.cx + (i + 0.5) * 48, bz = c.cz + (j + 0.5) * 48, d = Math.hypot(bx - px, bz - pz);
      if (d < 30 || d > 100) continue;
      const p = this.makePed(freshLook(false, c.id === 'main' ? 'downtown' : c.id === 'east' ? 'east' : 'mid'));
      Object.assign(p, { kind: 'city', c, bi: i, bj: j, bx, bz, s: Math.random() * 8 * R, dir: Math.random() < 0.5 ? 1 : -1 });
      const [x, z] = perim(p.s); p.x = bx + x; p.z = bz + z;
      this.list.push(p); return;
    }
  }
  spawnBeach(px, pz) {
    for (let k = 0; k < 10; k++) {
      const x = px + rand(-80, 80), sl = sandLine(x), z = Math.random() < 0.3 ? rand(shoreLine(x) - 9, shoreLine(x) - 2) : rand(sl + 6, shoreLine(x) - 26);
      if (Math.hypot(x - px, z - pz) < 25 || !walkable(x, z)) continue;
      const p = this.makePed(freshLook(true));
      Object.assign(p, { kind: 'beach', x, z, hx: x, hz: z, tx: x, tz: z, state: 'idle', t: rand(0, 4) });
      this.list.push(p); return;
    }
  }
  spawnLoose(x, z, fromX, fromZ) {
    ensureLooks();
    const p = this.makePed(freshLook(false));
    Object.assign(p, { kind: 'loose', x, z, hx: x, hz: z });
    this.list.push(p); this.flee(p, fromX, fromZ); return p;
  }
  // someone sleeping rough or sitting against a wall, with a bag, cardboard and sometimes a shopping cart
  spawnHomeless(c, px, pz) {
    ensureLooks();
    for (let k = 0; k < 10; k++) {
      const i = c.kx[0] + Math.floor(Math.random() * (c.kx[1] - c.kx[0])), j = c.kz[0] + Math.floor(Math.random() * (c.kz[1] - c.kz[0]));
      const bx = c.cx + (i + 0.5) * 48, bz = c.cz + (j + 0.5) * 48, side = Math.floor(Math.random() * 4), s = rand(-12, 12), r = 15.3;
      const x = bx + [s, r, s, -r][side], z = bz + [-r, s, r, s][side];
      const d = Math.hypot(x - px, z - pz); if (d < 30 || d > 100 || !walkable(x, z)) continue;
      const pos = { x, z }; resolve(pos, 0.6, 0);
      const p = this.makePed(pick(LOOKS.filter(l => l.homeless)));
      const lie = Math.random() < 0.55, face = [Math.PI, -Math.PI / 2, 0, Math.PI / 2][side]; // facing the street
      Object.assign(p, { kind: 'homeless', x: pos.x, z: pos.z, hx: pos.x, hz: pos.z, hface: lie ? face + Math.PI / 2 : face, face: lie ? face + Math.PI / 2 : face, rest: lie ? 'lie' : 'sit', state: lie ? 'lie' : 'sit', speed: 1 });
      const props = new THREE.Group();
      if (lie) props.add(propBox(0.75, 0.22, 1.9, pick(BAG_M), 0, 0, -0.55));
      props.add(propBox(1.0, 0.03, 1.6, CARD_M, lie ? 0 : 0, 0, lie ? -0.5 : -0.2));
      if (!lie) { const sign = propBox(0.45, 0.32, 0.02, CARD_M, 0.35, 0.1, 0.45); sign.rotation.x = -0.35; props.add(sign); }
      if (Math.random() < 0.5) { const cart = new THREE.Group(); cart.add(propBox(0.6, 0.45, 0.85, CART_M, 0, 0.35, 0)); cart.add(propBox(0.55, 0.35, 0.8, pick(BAG_M), 0, 0.5, 0)); cart.position.set(lie ? 0.9 : 0.9, 0, lie ? -0.3 : 0); props.add(cart); }
      p.root.add(props); p.props = props;
      this.list.push(p); return p;
    }
  }
  talk(p, x, z) { if (p.kind === 'homeless') { p.lookX = x; p.lookZ = z; return; } p.state = 'talk'; p.lookX = x; p.lookZ = z; }
  release(p) { if (p.state === 'talk') this.settle(p); }
  scare(x, z, r = 18) { for (const p of this.list) if (p.state !== 'down' && Math.hypot(p.x - x, p.z - z) < r) this.flee(p, x, z); }
  flee(p, x, z) { p.state = 'flee'; p.t = rand(3.5, 6); const a = Math.atan2(p.x - x, p.z - z) + rand(-0.5, 0.5); p.fx = Math.sin(a); p.fz = Math.cos(a); }
  // a hit that doesn't floor them: stagger back; returns true if this hit knocked them down
  hit(p, fx, fz, dmg, power = 4) {
    if (p.state === 'down') return false;
    p.hp ??= p.kind === 'cop' ? 6 : p.kind === 'homeless' ? 2 : 3 + Math.floor(Math.random() * 2);
    p.hp -= dmg;
    if (p.hp <= 0) { p.hp = undefined; return this.knock(p, fx, fz, power * 1.6); }
    p.hitT = 0.32; p.hkx = fx * power; p.hkz = fz * power; return false;
  }
  knock(p, fx, fz, power = 6) { if (p.state === 'down') return false; p.state = 'down'; p.t = rand(3.5, 5); p.kx = fx * power; p.kz = fz * power; return true; }
  update(dt, px, pz, nearCity, nearBeach) {
    ensureLooks();
    const cityTarget = Math.round((nearCity ? (nearCity.style === 'downtown' ? 28 : 20) : 0) * (this.rain ? 0.55 : 1)), beachTarget = nearBeach ? (this.rain ? 2 : 16) : 0; // rain clears the streets and the beach
    const nCity = this.list.filter(p => p.kind === 'city').length, nBeach = this.list.filter(p => p.kind === 'beach').length;
    if (nCity < cityTarget) this.spawnCity(nearCity, px, pz);
    if (nBeach < beachTarget) this.spawnBeach(px, pz);
    if (nearCity && this.list.filter(p => p.kind === 'homeless').length < (nearCity.style === 'downtown' ? 4 : 2)) this.spawnHomeless(nearCity, px, pz);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (Math.hypot(p.x - px, p.z - pz) > 125) { this.parent.remove(p.root); this.list.splice(i, 1); continue; }
      if (p.state === 'held') continue;
      // umbrellas up when it rains (most people), down when it stops
      if (this.rain && p.umb === undefined && p.kind !== 'homeless' && p.kind !== 'cop') { p.umb = Math.random() < 0.65 ? umbrella() : null; if (p.umb) p.inner.add(p.umb); }
      else if (!this.rain && p.umb !== undefined) { if (p.umb) p.inner.remove(p.umb); p.umb = undefined; }
      let mv = 0;
      if (p.state === 'talk') { p.face += Math.atan2(Math.sin(Math.atan2(p.lookX - p.x, p.lookZ - p.z) - p.face), Math.cos(Math.atan2(p.lookX - p.x, p.lookZ - p.z) - p.face)) * Math.min(1, dt * 8); }
      if (p.state === 'walk') {
        const before = p.s; p.s += p.dir * p.speed * dt;
        const L = 2 * R, seg0 = Math.floor(before / L), seg1 = Math.floor(p.s / L);
        if (seg0 !== seg1 && Math.random() < 0.3) { // reached a corner: maybe cross the road
          const cs = (p.dir > 0 ? seg1 : seg0) * L; const [cx, cz] = perim(cs); const sx = Math.sign(cx), sz = Math.sign(cz);
          const alongX = Math.random() < 0.5, ni = p.bi + (alongX ? sx : 0), nj = p.bj + (alongX ? 0 : sz), c = p.c;
          if (ni >= c.kx[0] && ni < c.kx[1] && nj >= c.kz[0] && nj < c.kz[1]) {
            const nbx = c.cx + (ni + 0.5) * 48, nbz = c.cz + (nj + 0.5) * 48;
            const tx = nbx + (alongX ? -sx : sx) * R, tz = nbz + (alongX ? sz : -sz) * R;
            Object.assign(p, { state: 'cross', fx0: p.bx + cx, fz0: p.bz + cz, tx, tz, bi: ni, bj: nj, bx: nbx, bz: nbz, ns: cornerS(alongX ? -sx : sx, alongX ? sz : -sz) });
          }
        }
        if (p.state === 'walk') { const [x, z, dx, dz] = perim(p.s); p.x = p.bx + x + (p.offx || 0); p.z = p.bz + z + (p.offz || 0); p.face = Math.atan2(dx * p.dir, dz * p.dir); mv = p.speed; }
      }
      if (p.state === 'cross') {
        const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { p.state = 'walk'; p.s = p.ns; p.dir = Math.random() < 0.5 ? 1 : -1; }
        else if (this.carAt?.(p.x + dx / d * 2.2, p.z + dz / d * 2.2, 9)) { p.face = Math.atan2(dx, dz); } // wait at the kerb for the car to pass
        else { const s = Math.min(d, p.speed * 1.2 * dt); p.x += dx / d * s; p.z += dz / d * s; p.face = Math.atan2(dx, dz); mv = p.speed * 1.2; }
      }
      if (p.state === 'idle' || p.state === 'wander') {
        p.t -= dt;
        if (p.state === 'idle' && p.t <= 0) { p.state = 'wander'; const a = rand(0, 6.28), r = rand(3, 12); p.tx = p.hx + Math.cos(a) * r; p.tz = p.hz + Math.sin(a) * r; }
        if (p.state === 'wander') { const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz); if (d < 0.3 || !walkable(p.tx, p.tz)) { p.state = 'idle'; p.t = rand(2, 7); } else { const s = Math.min(d, 1.1 * dt); p.x += dx / d * s; p.z += dz / d * s; p.face = Math.atan2(dx, dz); mv = 1.1; } }
      }
      if (p.state === 'return') { const dx = p.hx - p.x, dz = p.hz - p.z, d = Math.hypot(dx, dz); if (d < 0.3) { p.x = p.hx; p.z = p.hz; p.face = p.hface; p.state = p.rest; } else { const s = Math.min(d, 1.2 * dt); p.x += dx / d * s; p.z += dz / d * s; p.face = Math.atan2(dx, dz); mv = 1.2; } }
      if (p.state === 'chase') { const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz); if (d > 0.4) { const s = Math.min(d, 5.4 * dt), ox = p.x, oz = p.z; p.x += dx / d * s; p.z += dz / d * s; resolve(p, 0.35, 0); if (!walkable(p.x, p.z)) { p.x = ox; p.z = oz; } mv = 5.4; } p.face = Math.atan2(dx, dz); }
      if (p.state === 'punch') { p.face = Math.atan2(p.tx - p.x, p.tz - p.z); }
      if (p.state === 'march') { const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz), sp = p.mspd || 1.2; if (d > 0.3) { const s = Math.min(d, sp * dt); p.x += dx / d * s; p.z += dz / d * s; p.face = Math.atan2(dx, dz); mv = sp; } else if (p.lookX != null) p.face = Math.atan2(p.lookX - p.x, p.lookZ - p.z); }
      if (p.state === 'flee') {
        p.t -= dt; const ox = p.x, oz = p.z; p.x += p.fx * 4.6 * dt; p.z += p.fz * 4.6 * dt; resolve(p, 0.35, 0);
        if (!walkable(p.x, p.z)) { p.x = ox; p.z = oz; p.fx = -p.fx; p.fz = -p.fz; }
        p.face = Math.atan2(p.fx, p.fz); mv = 4.6;
        if (p.t <= 0) this.settle(p);
      }
      if (this.carPush && (p.state === 'walk' || p.state === 'cross' || p.state === 'wander' || p.state === 'return' || p.state === 'march' || p.state === 'chase')) { // step round parked cars instead of walking through them
        const ox = p.x, oz = p.z; this.carPush(p); const ddx = p.x - ox, ddz = p.z - oz;
        if (ddx || ddz) { if (p.state === 'walk') { p.offx = (p.offx || 0) + ddx; p.offz = (p.offz || 0) + ddz; } }
        else if (p.offx || p.offz) { const k = Math.exp(-dt * 0.7); p.offx *= k; p.offz *= k; if (Math.abs(p.offx) + Math.abs(p.offz) < 0.02) p.offx = p.offz = 0; }
      }
      if (p.hitT > 0 && p.state !== 'down') { p.hitT -= dt; const ox = p.x, oz = p.z; p.x += p.hkx * dt * 2; p.z += p.hkz * dt * 2; resolve(p, 0.35, 0); if (!walkable(p.x, p.z)) { p.x = ox; p.z = oz; } if (p.state === 'walk') { p.offx = (p.offx || 0) + p.x - ox; p.offz = (p.offz || 0) + p.z - oz; } }
      if (p.state === 'down') {
        p.t -= dt; p.x += (p.kx || 0) * dt; p.z += (p.kz || 0) * dt; p.kx *= Math.exp(-4 * dt); p.kz *= Math.exp(-4 * dt); resolve(p, 0.35, 0);
        p.inner.rotation.x += (-Math.PI / 2 - p.inner.rotation.x) * Math.min(1, dt * 10);
        if (p.t <= 0) { p.inner.rotation.x = 0; this.flee(p, p.x - (p.kx || 0.1), p.z - (p.kz || 0)); }
      } else p.inner.rotation.x = 0;
      // animate
      // everyone walks a bit differently: cadence, arm swing, hip sway, bounce, lean
      const G = p.gait ||= gaitFor(p.look);
      p.phase += dt * mv * 2.6 * (mv > 3 ? 1 : G.cad);
      const sw = Math.min(1, mv / 1.5) * (mv > 3 ? 0.9 : 0.55 * G.stride);
      p.limbs[0].rotation.x = -Math.sin(p.phase) * sw; p.limbs[1].rotation.x = Math.sin(p.phase) * sw;
      p.limbs[2].rotation.x = Math.sin(p.phase) * sw * 0.8 * G.arm; p.limbs[3].rotation.x = -Math.sin(p.phase) * sw * 0.8 * G.arm;
      p.limbs[2].rotation.z = G.armOut; p.limbs[3].rotation.z = -G.armOut;
      if ((p.state === 'walk' || p.state === 'cross' || p.state === 'wander' || p.state === 'march') && mv > 0.2) { p.inner.rotation.z = Math.sin(p.phase) * G.sway; p.inner.rotation.y = Math.sin(p.phase) * G.twist; p.inner.position.y = Math.abs(Math.cos(p.phase)) * G.bounce; p.inner.rotation.x = G.lean; }
      else if (p.state !== 'down' && p.state !== 'lie' && p.state !== 'sit') { p.inner.rotation.z = 0; p.inner.rotation.y = 0; }
      if (p.placard && !p.angry && p.state !== 'down' && p.state !== 'flee') { p.pt = (p.pt || 0) + dt * (p.state === 'march' ? 3 : 5); p.limbs[3].rotation.set(-2.7 + Math.sin(p.pt) * 0.15, 0, 0); p.limbs[2].rotation.set(-2.5 + Math.sin(p.pt) * 0.15, 0, 0); }
      if (p.state === 'punch') { p.pt = (p.pt || 0) + dt * 9; p.limbs[3].rotation.x = -1.5 + Math.sin(p.pt) * 0.6; p.limbs[2].rotation.x = -1.2 - Math.sin(p.pt) * 0.5; }
      let yo = 0;
      if (p.props) p.props.visible = p.state === 'lie' || p.state === 'sit';
      if (p.state === 'lie') { p.inner.rotation.x = -Math.PI / 2; p.inner.position.set(0, 0.32, 0.45); p.limbs[2].rotation.x = 0.3; p.limbs[3].rotation.x = 0.3; }
      else if (p.state === 'sit') { p.inner.position.set(0, -(p.limbs[0].position.y - 0.05), -0.15); p.limbs[0].rotation.x = -1.45; p.limbs[1].rotation.x = -1.35; p.limbs[2].rotation.x = -0.2; p.limbs[3].rotation.x = -0.5 + Math.sin(p.phase2 = (p.phase2 || 0) + dt) * 0.05; }
      else p.inner.position.set(0, p.state === 'walk' || p.state === 'cross' || p.state === 'wander' ? Math.abs(Math.cos(p.phase)) * (p.gait?.bounce || 0) : 0, 0);
      const gH = p.kind === 'beach' ? groundH(p.x, p.z) : 0, swimP = gH < -1.3;
      const y = p.kind === 'beach' ? (gH >= 0 ? gH : swimP ? -1.85 : gH) : p.kind === 'inmate' ? 0 : 0.17;
      if (swimP && p.state !== 'down') { p.inner.rotation.x = 1.2; const ph = p.phase * 2 + p.t; p.limbs[2].rotation.x = -(ph % 6.28); p.limbs[3].rotation.x = -((ph + 3.14) % 6.28); }
      if (p.hitT > 0 && p.state !== 'down') p.inner.rotation.x = -0.45 * (p.hitT / 0.32);
      p.root.position.set(p.x, y + yo, p.z); p.root.rotation.y = p.face;
    }
  }
  settle(p) {
    if (p.kind === 'city') {
      // walk back to the closest block loop
      const c = p.c, i = Math.max(c.kx[0], Math.min(c.kx[1] - 1, Math.floor((p.x - c.cx) / 48))), j = Math.max(c.kz[0], Math.min(c.kz[1] - 1, Math.floor((p.z - c.cz) / 48)));
      const bx = c.cx + (i + 0.5) * 48, bz = c.cz + (j + 0.5) * 48;
      const lx = Math.max(-R, Math.min(R, p.x - bx)), lz = Math.max(-R, Math.min(R, p.z - bz));
      let tx, tz; if (Math.abs(Math.abs(lx) - R) < Math.abs(Math.abs(lz) - R)) { tx = Math.sign(lx || 1) * R; tz = lz; } else { tx = lx; tz = Math.sign(lz || 1) * R; }
      const s = tz === -R ? tx + R : tx === R ? 2 * R + tz + R : tz === R ? 4 * R + (R - tx) : 6 * R + (R - tz);
      Object.assign(p, { state: 'cross', tx: bx + tx, tz: bz + tz, bi: i, bj: j, bx, bz, ns: s });
    } else if (p.kind === 'homeless') p.state = 'return';
    else { p.state = 'idle'; p.hx = p.x; p.hz = p.z; p.t = rand(1, 3); }
  }
  clear() { for (const p of this.list) this.parent.remove(p.root); this.list = []; }
}
