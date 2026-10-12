// Pedestrians: baked low-poly people who stroll sidewalks, wander the beach, flee from trouble.
import * as THREE from '../lib/three.module.min.js';
import { buildCharacter, randomChar, disposeObject } from './character.js';
import { CITIES, sandLine, shoreLine, groundH, walkable, resolve } from './world.js';

const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05, flatShading: true });
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
    c.copy(m.material.color); if (m.material.emissive && m.material.emissiveIntensity > 0.5) c.lerp(m.material.emissive, 0.5);
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
function makeLook(beach) {
  const cfg = { ...randomChar(), mask: 'none', skin: pick(SKINS), hairColor: pick(HAIRS), eyewear: Math.random() < 0.25 ? 'shades' : 'none', back: Math.random() < 0.15 ? 'backpack' : 'none', eyes: 'normal', headSize: rand(0.95, 1.1), height: rand(0.88, 1.12) };
  cfg.hat = Math.random() < 0.3 ? pick(['cap', 'beanie', 'cowboy', 'headband']) : 'none';
  if (beach) Object.assign(cfg, { top: pick(['tank', 'tshirt', 'tank']), pants: 'shorts', shoes: 'bare', eyewear: Math.random() < 0.5 ? 'shades' : 'none', hat: Math.random() < 0.3 ? 'cap' : 'none' });
  else if (cfg.top === 'armor') cfg.top = 'tshirt';
  const ch = buildCharacter(cfg); ch.root.updateMatrixWorld(true);
  const limbs = [ch.legL.pivot, ch.legR.pivot, ch.armL.pivot, ch.armR.pivot];
  const all = []; ch.root.traverse(o => { if (o.isMesh) all.push(o); });
  const body = bake(all.filter(m => !underAny(m, limbs)), new THREE.Matrix4());
  const parts = limbs.map(l => { const meshes = all.filter(m => underAny(m, [l])); return { geo: bake(meshes, l.matrixWorld.clone().invert()), pos: new THREE.Vector3().setFromMatrixPosition(l.matrixWorld) }; });
  disposeObject(ch.root);
  return { body, parts, h: ch.height, beach };
}
function ensureLooks() { if (LOOKS.length) return; for (let i = 0; i < 10; i++) LOOKS.push(makeLook(false)); for (let i = 0; i < 6; i++) LOOKS.push(makeLook(true)); }

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
    return { root, inner, limbs, phase: Math.random() * 6, face: 0, speed: rand(1.1, 1.7), state: 'walk', t: 0, h: look.h };
  }
  spawnCity(c, px, pz) {
    for (let k = 0; k < 10; k++) {
      const i = c.kx[0] + Math.floor(Math.random() * (c.kx[1] - c.kx[0])), j = c.kz[0] + Math.floor(Math.random() * (c.kz[1] - c.kz[0]));
      const bx = c.cx + (i + 0.5) * 48, bz = c.cz + (j + 0.5) * 48, d = Math.hypot(bx - px, bz - pz);
      if (d < 30 || d > 100) continue;
      const p = this.makePed(pick(LOOKS.filter(l => !l.beach)));
      Object.assign(p, { kind: 'city', c, bi: i, bj: j, bx, bz, s: Math.random() * 8 * R, dir: Math.random() < 0.5 ? 1 : -1 });
      const [x, z] = perim(p.s); p.x = bx + x; p.z = bz + z;
      this.list.push(p); return;
    }
  }
  spawnBeach(px, pz) {
    for (let k = 0; k < 10; k++) {
      const x = px + rand(-80, 80), sl = sandLine(x), z = rand(sl + 6, shoreLine(x) - 26);
      if (Math.hypot(x - px, z - pz) < 25 || !walkable(x, z)) continue;
      const p = this.makePed(pick(LOOKS.filter(l => l.beach)));
      Object.assign(p, { kind: 'beach', x, z, hx: x, hz: z, tx: x, tz: z, state: 'idle', t: rand(0, 4) });
      this.list.push(p); return;
    }
  }
  spawnLoose(x, z, fromX, fromZ) {
    ensureLooks();
    const p = this.makePed(pick(LOOKS.filter(l => !l.beach)));
    Object.assign(p, { kind: 'loose', x, z, hx: x, hz: z });
    this.list.push(p); this.flee(p, fromX, fromZ); return p;
  }
  scare(x, z, r = 18) { for (const p of this.list) if (p.state !== 'down' && Math.hypot(p.x - x, p.z - z) < r) this.flee(p, x, z); }
  flee(p, x, z) { p.state = 'flee'; p.t = rand(3.5, 6); const a = Math.atan2(p.x - x, p.z - z) + rand(-0.5, 0.5); p.fx = Math.sin(a); p.fz = Math.cos(a); }
  knock(p, fx, fz, power = 6) { if (p.state === 'down') return false; p.state = 'down'; p.t = rand(3.5, 5); p.kx = fx * power; p.kz = fz * power; return true; }
  update(dt, px, pz, nearCity, nearBeach) {
    ensureLooks();
    const cityTarget = nearCity ? 18 : 0, beachTarget = nearBeach ? 12 : 0;
    const nCity = this.list.filter(p => p.kind === 'city').length, nBeach = this.list.filter(p => p.kind === 'beach').length;
    if (nCity < cityTarget) this.spawnCity(nearCity, px, pz);
    if (nBeach < beachTarget) this.spawnBeach(px, pz);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      if (Math.hypot(p.x - px, p.z - pz) > 125) { this.parent.remove(p.root); this.list.splice(i, 1); continue; }
      let mv = 0;
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
        if (p.state === 'walk') { const [x, z, dx, dz] = perim(p.s); p.x = p.bx + x; p.z = p.bz + z; p.face = Math.atan2(dx * p.dir, dz * p.dir); mv = p.speed; }
      }
      if (p.state === 'cross') {
        const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
        if (d < 0.3) { p.state = 'walk'; p.s = p.ns; p.dir = Math.random() < 0.5 ? 1 : -1; }
        else { const s = Math.min(d, p.speed * 1.2 * dt); p.x += dx / d * s; p.z += dz / d * s; p.face = Math.atan2(dx, dz); mv = p.speed * 1.2; }
      }
      if (p.state === 'idle' || p.state === 'wander') {
        p.t -= dt;
        if (p.state === 'idle' && p.t <= 0) { p.state = 'wander'; const a = rand(0, 6.28), r = rand(3, 12); p.tx = p.hx + Math.cos(a) * r; p.tz = p.hz + Math.sin(a) * r; }
        if (p.state === 'wander') { const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz); if (d < 0.3 || !walkable(p.tx, p.tz)) { p.state = 'idle'; p.t = rand(2, 7); } else { const s = Math.min(d, 1.1 * dt); p.x += dx / d * s; p.z += dz / d * s; p.face = Math.atan2(dx, dz); mv = 1.1; } }
      }
      if (p.state === 'flee') {
        p.t -= dt; const ox = p.x, oz = p.z; p.x += p.fx * 4.6 * dt; p.z += p.fz * 4.6 * dt; resolve(p, 0.35, 0);
        if (!walkable(p.x, p.z)) { p.x = ox; p.z = oz; p.fx = -p.fx; p.fz = -p.fz; }
        p.face = Math.atan2(p.fx, p.fz); mv = 4.6;
        if (p.t <= 0) this.settle(p);
      }
      if (p.state === 'down') {
        p.t -= dt; p.x += (p.kx || 0) * dt; p.z += (p.kz || 0) * dt; p.kx *= Math.exp(-4 * dt); p.kz *= Math.exp(-4 * dt); resolve(p, 0.35, 0);
        p.inner.rotation.x += (-Math.PI / 2 - p.inner.rotation.x) * Math.min(1, dt * 10);
        if (p.t <= 0) { p.inner.rotation.x = 0; this.flee(p, p.x - (p.kx || 0.1), p.z - (p.kz || 0)); }
      } else p.inner.rotation.x = 0;
      // animate
      p.phase += dt * mv * 2.6;
      const sw = Math.min(1, mv / 1.5) * (mv > 3 ? 0.9 : 0.55);
      p.limbs[0].rotation.x = -Math.sin(p.phase) * sw; p.limbs[1].rotation.x = Math.sin(p.phase) * sw;
      p.limbs[2].rotation.x = Math.sin(p.phase) * sw * 0.8; p.limbs[3].rotation.x = -Math.sin(p.phase) * sw * 0.8;
      const y = p.kind === 'beach' ? Math.max(groundH(p.x, p.z), 0) : 0.17;
      p.root.position.set(p.x, y, p.z); p.root.rotation.y = p.face;
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
    } else { p.state = 'idle'; p.hx = p.x; p.hz = p.z; p.t = rand(1, 3); }
  }
  clear() { for (const p of this.list) this.parent.remove(p.root); this.list = []; }
}
