// City wildlife: pigeons, crows and seagulls that peck around and fly off to lamp posts when you get close,
// stray cats, dogs out on walks with their owners, squirrels, deer in the hills by day, and raccoons,
// possums, coyotes and owls at night. All low-poly, baked into a few meshes each so they're cheap to draw.
import * as THREE from '../lib/three.module.min.js';
import { CITIES, LAMPS, FIELDS, sandLine, shoreLine, walkable, groundH, cityAt, roadAt, wallTop } from './world.js?v=68';
// a spot on a nearby rooftop (roof edge-ish), or null
function roofSpot(x, z, rMin = 8, rMax = 45) { for (let i = 0; i < 10; i++) { const a = Math.random() * 6.28, d = rMin + Math.random() * (rMax - rMin), px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d, t = wallTop(px, pz); if (t != null && t > 3 && t < 40) return { x: px, z: pz, y: t + 0.02 }; } return null; }

const rand = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true });
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
// merge a list of coloured boxes [w,h,d, x,y,z, colour, rx?, ry?] into one geometry
function geo(boxes) {
  const pos = [], nor = [], col = [];
  for (const [w, h, d, x, y, z, c, rx = 0, ry = 0] of boxes) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    _m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, 0)), new THREE.Vector3(1, 1, 1)); g.applyMatrix4(_m);
    _c.set(c); const p = g.attributes.position.array, n = g.attributes.normal.array;
    for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); col.push(_c.r, _c.g, _c.b); }
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

// ---------------- species: body (static), legs (4 pivots) or wings (2 pivots)
function quad({ L, W, H, leg, head, col, belly = col, headCol = col, tail = [], extra = [], neck = 0 }) {
  const y = leg + H / 2, hz = L / 2 + head * 0.35, hy = y + H * 0.35 + neck;
  const body = [[W, H, L, 0, y, 0, col], [W * 0.92, H * 0.3, L * 0.9, 0, y - H * 0.4, 0, belly], [head, head, head * 1.05, 0, hy, hz, headCol], ...tail, ...extra];
  if (neck) body.push([head * 0.5, neck + H * 0.4, head * 0.5, 0, y + neck / 2 + H * 0.2, L / 2, headCol, -0.4]);
  const legG = geo([[W * 0.22, leg, W * 0.22, 0, -leg / 2, 0, col]]);
  return { body: geo(body), legG, legs: [[-W * 0.32, leg, L * 0.36], [W * 0.32, leg, L * 0.36], [-W * 0.32, leg, -L * 0.36], [W * 0.32, leg, -L * 0.36]], h: hy };
}
function bird({ L, col, wing, head = col, beak = '#e8a33a', extra = [] }) {
  const body = geo([[L * 0.45, L * 0.42, L, 0, L * 0.38, 0, col], [L * 0.36, L * 0.36, L * 0.38, 0, L * 0.68, L * 0.42, head], [L * 0.1, L * 0.08, L * 0.2, 0, L * 0.64, L * 0.68, beak], [L * 0.3, L * 0.08, L * 0.4, 0, L * 0.36, -L * 0.62, wing], [0.03, L * 0.2, 0.03, -L * 0.1, L * 0.08, 0, beak], [0.03, L * 0.2, 0.03, L * 0.1, L * 0.08, 0, beak], ...extra]);
  const wingG = geo([[L * 0.75, 0.025, L * 0.55, L * 0.37, 0, 0, wing]]);
  return { body, wingG, wings: [[-L * 0.2, L * 0.5, 0], [L * 0.2, L * 0.5, 0]], bird: true };
}
const SPECIES = {
  dog: () => { const c = pick(['#8a5a35', '#16161b', '#d9b26a', '#e8e2d6', '#6b4a33']); return quad({ L: 0.75, W: 0.3, H: 0.32, leg: 0.34, head: 0.28, col: c, belly: c, tail: [[0.07, 0.07, 0.3, 0, 0.72, -0.48, c, 0.7]], extra: [[0.14, 0.12, 0.18, 0, 0.66, 0.6, c], [0.06, 0.1, 0.05, -0.1, 0.9, 0.42, c], [0.06, 0.1, 0.05, 0.1, 0.9, 0.42, c], [0.31, 0.06, 0.06, 0, 0.72, 0.3, '#e23b3b'], [0.05, 0.05, 0.03, 0, 0.67, 0.7, '#111']] }); },
  cat: () => { const c = pick(['#ff8a2a', '#16161b', '#9a9a9a', '#e8e2d6', '#6b4a33']); return quad({ L: 0.45, W: 0.18, H: 0.18, leg: 0.18, head: 0.17, col: c, tail: [[0.04, 0.32, 0.04, 0, 0.45, -0.25, c, -0.3]], extra: [[0.04, 0.07, 0.03, -0.06, 0.52, 0.27, c], [0.04, 0.07, 0.03, 0.06, 0.52, 0.27, c], [0.03, 0.03, 0.02, -0.04, 0.44, 0.33, '#9bd04a'], [0.03, 0.03, 0.02, 0.04, 0.44, 0.33, '#9bd04a']] }); },
  raccoon: () => quad({ L: 0.6, W: 0.3, H: 0.28, leg: 0.16, head: 0.24, col: '#7d7a76', belly: '#a9a5a0', extra: [[0.25, 0.07, 0.02, 0, 0.47, 0.42, '#16161b'], [0.06, 0.08, 0.04, -0.09, 0.6, 0.32, '#5a5754'], [0.06, 0.08, 0.04, 0.09, 0.6, 0.32, '#5a5754']], tail: [0, 1, 2, 3].map(i => [0.12, 0.12, 0.1, 0, 0.36 - i * 0.03, -0.36 - i * 0.1, i % 2 ? '#2a2a2a' : '#a9a5a0', 0.5]) }),
  possum: () => quad({ L: 0.55, W: 0.24, H: 0.24, leg: 0.14, head: 0.2, col: '#b8b4ae', headCol: '#eeeae4', tail: [[0.04, 0.04, 0.5, 0, 0.2, -0.5, '#e8b4b8', 0.2]], extra: [[0.06, 0.06, 0.12, 0, 0.36, 0.42, '#e8b4b8']] }),
  coyote: () => quad({ L: 0.85, W: 0.3, H: 0.34, leg: 0.48, head: 0.26, col: '#a88a62', belly: '#d8c6a4', tail: [[0.12, 0.12, 0.38, 0, 0.6, -0.55, '#8a6e4a', -0.6]], extra: [[0.12, 0.1, 0.22, 0, 0.82, 0.64, '#a88a62'], [0.06, 0.14, 0.05, -0.08, 1.08, 0.48, '#8a6e4a'], [0.06, 0.14, 0.05, 0.08, 1.08, 0.48, '#8a6e4a']] }),
  deer: () => quad({ L: 1.1, W: 0.42, H: 0.48, leg: 0.8, head: 0.26, neck: 0.42, col: '#9a6a3e', belly: '#d8c0a0', tail: [[0.1, 0.14, 0.06, 0, 1.12, -0.56, '#ffffff']], extra: [[0.12, 0.1, 0.2, 0, 1.62, 0.78, '#9a6a3e'], [0.07, 0.16, 0.04, -0.12, 1.84, 0.62, '#9a6a3e'], [0.07, 0.16, 0.04, 0.12, 1.84, 0.62, '#9a6a3e']] }),
  squirrel: () => quad({ L: 0.24, W: 0.12, H: 0.13, leg: 0.08, head: 0.11, col: '#8a6a4a', belly: '#d8c8b0', tail: [[0.1, 0.26, 0.1, 0, 0.3, -0.16, '#8a6a4a', -0.3]] }),
  // farm animals
  cow: () => { const holstein = Math.random() < 0.6, c = holstein ? '#f2f0ea' : pick(['#6b4a33', '#3a2a1e', '#a0703a']); return quad({ L: 1.9, W: 0.75, H: 0.8, leg: 0.7, head: 0.42, col: c, belly: c, headCol: holstein ? '#f2f0ea' : c, neck: 0.1, tail: [[0.06, 0.6, 0.06, 0, 1.0, -0.98, c]], extra: [...(holstein ? [[0.77, 0.4, 0.5, 0, 1.25, 0.3, '#16161b'], [0.77, 0.3, 0.4, 0, 1.1, -0.5, '#16161b']] : []), [0.3, 0.2, 0.12, 0, 1.36, 1.28, '#e8b4b0'], [0.08, 0.08, 0.2, -0.24, 1.72, 1.02, '#e8e2c8'], [0.08, 0.08, 0.2, 0.24, 1.72, 1.02, '#e8e2c8'], [0.2, 0.14, 0.18, 0, 0.66, -0.3, '#e8b4b0']] }); },
  horse: () => { const c = pick(['#6b4a2a', '#3a2a1e', '#d8d2c4', '#a0703a', '#16161b']), m = pick(['#16161b', '#2a1a10', '#e8e2c8']); return quad({ L: 1.8, W: 0.55, H: 0.7, leg: 1.0, head: 0.34, col: c, neck: 0.55, tail: [[0.12, 0.7, 0.12, 0, 1.2, -0.95, m, 0.3]], extra: [[0.32, 0.26, 0.46, 0, 2.12, 1.18, c], [0.1, 0.55, 0.3, 0, 2.0, 0.85, m, -0.4]] }); },
  sheep: () => quad({ L: 1.0, W: 0.6, H: 0.55, leg: 0.42, head: 0.26, col: '#f4f2ea', belly: '#e8e4d8', headCol: '#2a2a2a', extra: [[0.66, 0.6, 1.06, 0, 0.72, 0, '#f8f6ee'], [0.12, 0.06, 0.16, -0.16, 0.92, 0.6, '#2a2a2a'], [0.12, 0.06, 0.16, 0.16, 0.92, 0.6, '#2a2a2a']] }),
  pig: () => quad({ L: 1.1, W: 0.55, H: 0.5, leg: 0.28, head: 0.36, col: '#f2b8b0', extra: [[0.2, 0.16, 0.08, 0, 0.6, 0.76, '#e89a92'], [0.1, 0.1, 0.06, -0.12, 0.84, 0.66, '#e89a92'], [0.1, 0.1, 0.06, 0.12, 0.84, 0.66, '#e89a92']], tail: [[0.05, 0.05, 0.14, 0, 0.62, -0.6, '#e89a92', -0.6]] }),
  goat: () => quad({ L: 0.9, W: 0.38, H: 0.42, leg: 0.5, head: 0.24, neck: 0.18, col: pick(['#e8e2d6', '#8a6a4a', '#3a3a3a']), extra: [[0.05, 0.22, 0.05, -0.08, 1.24, 0.42, '#5a5a50', -0.6], [0.05, 0.22, 0.05, 0.08, 1.24, 0.42, '#5a5a50', -0.6], [0.06, 0.16, 0.06, 0, 0.86, 0.66, '#e8e2d6']] }),
  chicken: () => bird({ L: 0.34, col: pick(['#f4f0e6', '#a0602a', '#e8c890']), head: '#f4f0e6', wing: '#e0d8c8', beak: '#f0a020', extra: [[0.05, 0.08, 0.1, 0, 0.82, 0.46, '#e23b3b'], [0.02, 0.16, 0.02, -0.05, 0.08, 0, '#f0a020'], [0.02, 0.16, 0.02, 0.05, 0.08, 0, '#f0a020']] }),
  pigeon: () => bird({ L: 0.32, col: '#8f97a8', head: '#5f6678', wing: '#7a8294', beak: '#c98a7a', extra: [[0.17, 0.08, 0.06, 0, 0.56, 0.3, '#4a9a7a']] }),
  crow: () => bird({ L: 0.36, col: '#1a1a20', head: '#16161b', wing: '#222230', beak: '#2a2a2a' }),
  seagull: () => bird({ L: 0.42, col: '#f4f4f0', head: '#ffffff', wing: '#a8b0b8', beak: '#f0c030' }),
  owl: () => bird({ L: 0.36, col: '#8a6a4a', head: '#a8865a', wing: '#6b4a33', beak: '#e8c030', extra: [[0.06, 0.06, 0.03, -0.06, 0.72, 0.6, '#ffd23f'], [0.06, 0.06, 0.03, 0.06, 0.72, 0.6, '#ffd23f']] }),
};
const TEMPL = {};
function template(kind) { // a few colour variants per species
  const list = TEMPL[kind] || (TEMPL[kind] = []);
  if (list.length < (kind === 'dog' || kind === 'cat' ? 4 : 1)) list.push(SPECIES[kind]());
  return pick(list);
}
function makeMesh(kind) {
  const t = template(kind), root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const body = new THREE.Mesh(t.body, MAT); body.castShadow = true; inner.add(body);
  const limbs = [];
  if (t.bird) for (const [x, y, z] of t.wings) { const g = new THREE.Group(); g.position.set(x, y, z); const m = new THREE.Mesh(t.wingG, MAT); if (x < 0) m.scale.x = -1; g.add(m); inner.add(g); limbs.push(g); }
  else for (const [x, y, z] of t.legs) { const g = new THREE.Group(); g.position.set(x, y, z); g.add(new THREE.Mesh(t.legG, MAT)); inner.add(g); limbs.push(g); }
  return { root, inner, limbs, bird: !!t.bird };
}
const SPEED = { cow: 0.6, horse: 1.2, sheep: 0.7, pig: 0.6, goat: 0.9, dog: 1.4, cat: 0.9, raccoon: 0.8, possum: 0.6, coyote: 1.6, deer: 1.2, squirrel: 1.2 };
const RUN = { cow: 3, horse: 9, sheep: 4.5, pig: 3.5, goat: 5, dog: 6, cat: 6.5, raccoon: 4, possum: 2.5, coyote: 8, deer: 9, squirrel: 5 };
const FEAR = { cow: 2.5, horse: 4, sheep: 5, pig: 3, goat: 3, chicken: 3, dog: 0, cat: 6, raccoon: 6, possum: 5, coyote: 12, deer: 18, squirrel: 5, pigeon: 4.5, crow: 6, seagull: 5, owl: 5 };

export class Animals {
  constructor(parent, peds, ground) { this.parent = parent; this.peds = peds; this.ground = ground; this.list = []; this.t = 0; this.leash = []; }
  add(kind, x, z, o = {}) {
    const m = makeMesh(kind);
    const a = { kind, ...m, x, z, y: o.y ?? this.ground(x, z), face: rand(0, 6.28), state: o.state || (m.bird ? 'ground' : 'idle'), t: rand(0.5, 4), phase: rand(0, 6), hx: x, hz: z, vy: 0, ...o };
    if (a.state === 'perch') a.y = o.y;
    this.parent.add(a.root); this.list.push(a); return a;
  }
  remove(a) { this.parent.remove(a.root); const i = this.list.indexOf(a); if (i >= 0) this.list.splice(i, 1); if (a.leash) { this.parent.remove(a.leash); a.leash.geometry.dispose(); } if (a.owner) a.owner.dog = null; }
  clear() { for (const a of [...this.list]) this.remove(a); }
  count(kind) { let n = 0; for (const a of this.list) if (a.kind === kind) n++; return n; }
  scare(x, z, r) { for (const a of this.list) if (Math.hypot(a.x - x, a.z - z) < r) this.spook(a, x, z); }
  spook(a, x, z) {
    if (a.kind === 'dog') { a.bark = 1.5; return; }
    if (a.hen) { a.face = Math.atan2(a.x - x, a.z - z) + rand(-0.5, 0.5); a.hop = 1.4; a.fast = 1.4; a.t = 1.5; return; } // chickens scatter, they don't fly off
    if (a.bird) { if (a.state !== 'fly') this.takeOff(a, x, z); return; }
    a.state = 'flee'; a.t = rand(2.5, 4.5); const ang = Math.atan2(a.x - x, a.z - z) + rand(-0.6, 0.6); a.fx = Math.sin(ang); a.fz = Math.cos(ang);
  }
  takeOff(a, x, z) {
    a.state = 'fly'; a.t = 0;
    // fly to a nearby lamp post if there's one, otherwise away into the sky
    let best = null, bd = 1e9;
    if (a.kind !== 'seagull') for (const l of LAMPS) { const d = Math.hypot(l.x - a.x, l.z - a.z); if (d > 6 && d < 40 && d < bd && Math.hypot(l.x - x, l.z - z) > 10 && !this.list.some(b => b.perch === l)) { bd = d; best = l; } }
    const roof = a.kind !== 'seagull' || Math.random() < 0.5 ? (Math.random() < 0.45 ? roofSpot(a.x, a.z) : null) : roofSpot(a.x, a.z);
    if (roof) { a.perch = { roof: true }; a.tx = roof.x; a.tz = roof.z; a.ty = roof.y; }
    else if (best && Math.random() < 0.75) { a.perch = best; a.tx = best.x + rand(-0.2, 0.2); a.tz = best.z + rand(-0.2, 0.2); a.ty = 5.42; }
    else { const ang = Math.atan2(a.x - x, a.z - z) + rand(-0.8, 0.8); a.perch = null; a.tx = a.x + Math.sin(ang) * 120; a.tz = a.z + Math.cos(ang) * 120; a.ty = 26; }
  }
  // ---------------- spawning by place & time
  spawnAround(px, pz, hour, inside) {
    if (inside) { if (this.list.length) this.clear(); return; }
    const night = hour < 6 || hour >= 20, dusk = hour >= 18 && hour < 20, c = cityAt(px, pz, 30);
    const beach = pz > sandLine(px) - 70 && px > -330, hills = px < -300;
    const want = {};
    if (c) Object.assign(want, night ? { cat: 3, raccoon: 2, possum: 1, owl: 2, coyote: Math.random() < 0.5 ? 1 : 0, pigeonPerch: 2, roofFlock: 1 } : { pigeonFlock: 3, pigeonPerch: 3, roofFlock: 3, crow: dusk ? 3 : 1, cat: 2, dog: 3, squirrel: 1 });
    if (beach) Object.assign(want, night ? { seagull: 1, raccoon: 1 } : { seagullFlock: 3, dog: 2 });
    if (hills) Object.assign(want, night ? { coyote: 3, owl: 2, raccoon: 1, possum: 1 } : { deer: 3, squirrel: 3, crow: 2 });
    // farms: livestock in the fields, chickens pecking near the barns
    let farm = null, fd = 1e9; for (const f of FIELDS) { const dx = Math.max(f.x0 - px, 0, px - f.x1), dz = Math.max(f.z0 - pz, 0, pz - f.z1), d = Math.hypot(dx, dz); if (d < fd) { fd = d; farm = f; } }
    if (farm && fd < 90) { this.farm = farm; Object.assign(want, { cow: night ? 3 : 5, horse: 2, sheep: 4, pig: 2, goat: 1, chicken: night ? 0 : 6 }); } else this.farm = null;
    const has = k => this.list.filter(a => a.tag === k).length;
    for (const [k, n] of Object.entries(want)) if (has(k) < n) { this.spawnOne(k, px, pz, c, night); break; }
  }
  spot(px, pz, where, c) {
    for (let i = 0; i < 12; i++) {
      let x, z;
      if (where === 'sidewalk' && c) { const bi = Math.floor(rand(c.kx[0], c.kx[1])), bj = Math.floor(rand(c.kz[0], c.kz[1])), bx = c.cx + (bi + 0.5) * 48, bz = c.cz + (bj + 0.5) * 48, s = rand(-15, 15), side = Math.floor(rand(0, 4)), R = rand(15.4, 17.2); x = bx + (side === 0 ? s : side === 1 ? R : side === 2 ? s : -R); z = bz + (side === 0 ? -R : side === 1 ? s : side === 2 ? R : s); }
      else if (where === 'beach') { x = px + rand(-70, 70); z = rand(sandLine(x) + 4, shoreLine(x) - 6); }
      else { const ang = rand(0, 6.28), d = rand(35, 90); x = px + Math.sin(ang) * d; z = pz + Math.cos(ang) * d; }
      const d = Math.hypot(x - px, z - pz);
      if (d < 28 || d > 105 || !walkable(x, z)) continue;
      if (where === 'wild' && (x > -300 || roadAt(x, z))) continue;
      return { x, z };
    }
    return null;
  }
  spawnOne(tag, px, pz, c, night) {
    if (tag === 'roofFlock') { // pigeons (or gulls near the beach) sitting along a rooftop
      const r = roofSpot(px, pz, 25, 90); if (!r) return; const kind = pz > sandLine(px) - 120 && Math.random() < 0.6 ? 'seagull' : night ? 'crow' : 'pigeon', n = Math.floor(rand(2, 6));
      for (let i = 0; i < n; i++) this.add(kind, r.x + rand(-1.6, 1.6), r.z + rand(-1.6, 1.6), { tag, state: 'perch', y: r.y, perch: { roof: true } });
      return;
    }
    if (tag === 'pigeonFlock' || tag === 'seagullFlock') {
      const kind = tag === 'pigeonFlock' ? 'pigeon' : 'seagull', s = this.spot(px, pz, kind === 'pigeon' ? 'sidewalk' : 'beach', c); if (!s) return;
      const n = Math.floor(rand(3, 7)); for (let i = 0; i < n; i++) this.add(kind, s.x + rand(-1.5, 1.5), s.z + rand(-1.5, 1.5), { tag });
      return;
    }
    if (tag === 'pigeonPerch' || tag === 'owl' || (tag === 'crow' && Math.random() < 0.5)) {
      const ls = LAMPS.filter(l => { const d = Math.hypot(l.x - px, l.z - pz); return d > 25 && d < 95 && !this.list.some(b => b.perch === l); });
      if (!ls.length) return; const l = pick(ls);
      this.add(tag === 'pigeonPerch' ? (night ? 'pigeon' : pick(['pigeon', 'pigeon', 'crow'])) : tag, l.x + rand(-0.2, 0.2), l.z + rand(-0.2, 0.2), { tag, state: 'perch', y: 5.42, perch: l });
      return;
    }
    if (tag === 'dog') { // attach to a walking pedestrian
      const p = this.peds.list.find(q => (q.kind === 'city' || q.kind === 'beach') && !q.dog && q.state !== 'down' && Math.hypot(q.x - px, q.z - pz) > 25 && Math.hypot(q.x - px, q.z - pz) < 110);
      if (!p) return;
      const a = this.add('dog', p.x - 1, p.z, { tag, state: 'follow', owner: p }); p.dog = a;
      const lg = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
      a.leash = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#e23b3b' })); a.leash.frustumCulled = false; this.parent.add(a.leash);
      return;
    }
    if (['cow', 'horse', 'sheep', 'pig', 'goat', 'chicken'].includes(tag) && this.farm) {
      const f = this.farm, herd = tag === 'chicken' ? 3 : tag === 'sheep' ? 2 : 1;
      for (let k = 0; k < 10; k++) {
        const x = rand(f.x0 + 6, f.x1 - 6), z = tag === 'chicken' ? rand(f.z0 + 4, f.z0 + 16) : rand(f.z0 + 6, f.z1 - 6), d = Math.hypot(x - px, z - pz);
        if (d < 26 || d > 110) continue;
        for (let i = 0; i < herd; i++) { const a = this.add(tag, x + rand(-2, 2), z + rand(-2, 2), { tag }); if (tag === 'chicken') a.hen = true; }
        return;
      }
      return;
    }
    const where = tag === 'deer' || (tag === 'coyote' && !c) || (tag === 'squirrel' && !c) || (tag === 'crow' && !c) ? 'wild' : tag === 'seagull' ? 'beach' : 'sidewalk';
    const s = this.spot(px, pz, where, c); if (!s) return;
    const kind = tag, n = tag === 'deer' && Math.random() < 0.5 ? 2 : 1;
    for (let i = 0; i < n; i++) this.add(kind, s.x + i * 1.5, s.z + i, { tag });
  }
  // ---------------- update
  update(dt, px, pz, hour, threat, inside) {
    this.t -= dt; if (this.t <= 0) { this.t = 0.4; this.spawnAround(px, pz, hour, inside); }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const a = this.list[i];
      if (Math.hypot(a.x - px, a.z - pz) > 135 || (a.state === 'fly' && !a.perch && a.y > 24)) { this.remove(a); continue; }
      // player / cars nearby scare things off
      const d = Math.hypot(a.x - threat.x, a.z - threat.z), fear = (FEAR[a.kind] || 4) * (threat.car ? 2 : threat.run ? 1.5 : 1);
      if (d < fear && a.state !== 'fly' && a.state !== 'flee' && a.kind !== 'dog') this.spook(a, threat.x, threat.z);
      let mv = 0;
      if (a.bird) mv = this.updBird(a, dt);
      else mv = this.updQuad(a, dt);
      a.phase += dt * (a.bird ? (a.state === 'fly' ? 22 : 0) : mv * 7);
      if (a.bird) {
        const flap = a.state === 'fly' ? Math.sin(a.phase) * 0.9 : (a.state === 'perch' ? 0 : -0.05);
        a.limbs[0].rotation.z = -flap - (a.state === 'fly' ? 0 : 1.2); a.limbs[1].rotation.z = flap + (a.state === 'fly' ? 0 : 1.2);
        a.limbs[0].visible = a.limbs[1].visible = a.state === 'fly';
      } else { const sw = Math.min(0.8, mv * 0.25); a.limbs[0].rotation.x = Math.sin(a.phase) * sw; a.limbs[3].rotation.x = Math.sin(a.phase) * sw; a.limbs[1].rotation.x = -Math.sin(a.phase) * sw; a.limbs[2].rotation.x = -Math.sin(a.phase) * sw; }
      a.root.position.set(a.x, a.y, a.z); a.root.rotation.y = a.face;
      if (a.leash) { const o = a.owner, p = a.leash.geometry.attributes.position; p.setXYZ(0, o.x + Math.sin(o.face + 1.4) * 0.35, 1.0 + (o.kind === 'beach' ? Math.max(groundH(o.x, o.z), 0) : 0.17), o.z + Math.cos(o.face + 1.4) * 0.35); p.setXYZ(1, a.x + Math.sin(a.face) * 0.3, a.y + 0.62, a.z + Math.cos(a.face) * 0.3); p.needsUpdate = true; }
    }
  }
  updBird(a, dt) {
    if (a.state === 'ground') {
      a.t -= dt; a.inner.rotation.x = Math.max(0, Math.sin(a.phase2 = (a.phase2 || 0) + dt * 9)) * 0.5; // pecking
      if (a.t <= 0) { a.t = rand(0.6, 2.5); a.face += rand(-1.5, 1.5); a.hop = 0.25; }
      if (a.hop > 0) { a.hop -= dt; a.fast = (a.fast || 0) - dt; const hs = a.fast > 0 ? 4.5 : 1.2, nx = a.x + Math.sin(a.face) * hs * dt, nz = a.z + Math.cos(a.face) * hs * dt; if (walkable(nx, nz)) { a.x = nx; a.z = nz; } }
      a.y = this.ground(a.x, a.z);
    } else if (a.state === 'perch') { a.inner.rotation.x = 0; a.t -= dt; if (a.t <= 0) { a.t = rand(1, 4); a.face += rand(-1.2, 1.2); } }
    else if (a.state === 'fly') {
      a.inner.rotation.x = 0; a.t += dt;
      const dx = a.tx - a.x, dz = a.tz - a.z, dy = a.ty - a.y, dist = Math.hypot(dx, dz), sp = 9;
      a.face = Math.atan2(dx, dz);
      if (dist > 0.3) { const k = Math.min(dist, sp * dt) / dist; a.x += dx * k; a.z += dz * k; }
      const climb = a.perch ? Math.max(-4, Math.min(5, dy * 1.5 + (dist > 4 ? 2.5 : 0))) : 4;
      a.y += climb * dt;
      if (a.perch && dist < 0.4 && Math.abs(dy) < 0.25) { a.state = 'perch'; a.y = a.ty; a.t = rand(2, 5); }
    }
    return 0;
  }
  updQuad(a, dt) {
    let mv = 0;
    const go = (fx, fz, sp) => { const nx = a.x + fx * sp * dt, nz = a.z + fz * sp * dt; if (walkable(nx, nz)) { a.x = nx; a.z = nz; return true; } return false; };
    if (a.state === 'follow') {
      const o = a.owner;
      if (!o || !this.peds.list.includes(o)) { this.remove(a); return 0; }
      const tx = o.x - Math.sin(o.face) * 1.3 + Math.sin(o.face + 1.57) * 0.6, tz = o.z - Math.cos(o.face) * 1.3 + Math.cos(o.face + 1.57) * 0.6;
      const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
      if (d > 6) { a.x = tx; a.z = tz; } else if (d > 0.15) { const sp = Math.min(d * 3, o.state === 'flee' ? 6 : 2.4); a.x += dx / d * sp * dt; a.z += dz / d * sp * dt; a.face = Math.atan2(dx, dz); mv = sp; }
      else a.face += Math.atan2(Math.sin(o.face - a.face), Math.cos(o.face - a.face)) * Math.min(1, dt * 4);
      a.inner.rotation.x = 0;
    } else if (a.state === 'idle') { a.t -= dt; if (a.t <= 0) { a.state = 'wander'; a.t = rand(2, 5); a.face = rand(0, 6.28); } }
    else if (a.state === 'wander') {
      a.t -= dt; const sp = SPEED[a.kind] || 1;
      if (!go(Math.sin(a.face), Math.cos(a.face), sp) || Math.hypot(a.x - a.hx, a.z - a.hz) > 12) a.face += 2.2;
      mv = sp; if (a.t <= 0) { a.state = 'idle'; a.t = rand(2, 6); }
    } else if (a.state === 'flee') {
      a.t -= dt; const sp = RUN[a.kind] || 5; a.face = Math.atan2(a.fx, a.fz);
      if (!go(a.fx, a.fz, sp)) { const ang = a.face + rand(1.2, 2.4) * (Math.random() < 0.5 ? 1 : -1); a.fx = Math.sin(ang); a.fz = Math.cos(ang); }
      mv = sp; if (a.t <= 0) { a.state = 'idle'; a.t = rand(1, 3); a.hx = a.x; a.hz = a.z; }
    }
    if (a.bark > 0) { a.bark -= dt; a.inner.rotation.x = Math.sin(a.bark * 30) * 0.08; } else if (a.state !== 'follow') a.inner.rotation.x = 0;
    a.y = this.ground(a.x, a.z);
    return mv;
  }
}
