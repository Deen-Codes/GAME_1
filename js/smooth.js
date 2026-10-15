// Smooth stylised art kit (test): cars from side profiles extruded with rounded edges, people with rounded jointed limbs,
// guns from parts, and a bit of street. Everything is built from named parts so customising keeps working.
import * as THREE from '../lib/three.module.min.js';

// ---------------------------------------------------------------- shared helpers
export function roundedBox(w, h, d, r = 0.05, seg = 3) {
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  // the outline is inset by r and the bevel grows it back out by r, so the finished box is exactly w x h x d
  const hw = w / 2 - r, hh = h / 2 - r, c = Math.min(r * 0.6, hw * 0.9, hh * 0.9), s = new THREE.Shape();
  s.moveTo(-hw + c, -hh); s.lineTo(hw - c, -hh); s.quadraticCurveTo(hw, -hh, hw, -hh + c); s.lineTo(hw, hh - c); s.quadraticCurveTo(hw, hh, hw - c, hh);
  s.lineTo(-hw + c, hh); s.quadraticCurveTo(-hw, hh, -hw, hh - c); s.lineTo(-hw, -hh + c); s.quadraticCurveTo(-hw, -hh, -hw + c, -hh);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(1e-3, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg, curveSegments: 4 });
  g.translate(0, 0, -Math.max(1e-3, d - 2 * r) / 2); g.computeVertexNormals(); return g;
}
const mesh = (g, m, x = 0, y = 0, z = 0, parent) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent?.add(o); return o; };
// car paint: a glossy clear coat over the colour, so the sky reflects in it
export const paint = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, metalness: o.metal ?? 0.35, roughness: o.rough ?? 0.38, clearcoat: o.clear ?? 1, clearcoatRoughness: 0.08 });
const mat = (c, rough = 0.7, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal });

// ---------------------------------------------------------------- cars
// A car is drawn as its side silhouette (front at +x in the drawing), extruded across its width with rounded edges.
// Bodies differ only in their profile numbers, so new models are cheap. Names are made up (no real badges).
export const SMOOTH_CARS = {
  // a German-style family hatch
  gulf: { name: 'Volker Gulf', L: 4.1, W: 1.78, wr: 0.33, wb: 2.6, body: [[-2.05, 0.32], [-2.08, 0.62], [-2.0, 0.92], [-1.78, 1.02], [1.3, 1.0], [1.95, 0.86], [2.07, 0.62], [2.05, 0.32]],
    glass: [[-1.86, 0.98], [-1.62, 1.42], [-1.35, 1.45], [0.42, 1.44], [0.66, 1.4], [1.3, 0.99]], pillar: [-0.5, 0.15] },
  // a Swedish-style estate: long flat roof
  volta: { name: 'Volta V70', L: 4.75, W: 1.84, wr: 0.34, wb: 2.8, body: [[-2.38, 0.33], [-2.4, 0.66], [-2.3, 0.94], [-2.05, 1.03], [1.5, 1.01], [2.25, 0.86], [2.38, 0.6], [2.36, 0.33]],
    glass: [[-2.2, 1.0], [-2.08, 1.44], [-1.9, 1.48], [0.55, 1.47], [0.8, 1.42], [1.5, 1.0]], pillar: [-0.9, -0.1, 0.55] },
  // a British-style luxury 4x4: tall, square, upright glass
  ranger: { name: 'Ranger Rover', L: 4.9, W: 2.0, wr: 0.42, wb: 2.9, ride: 0.1, body: [[-2.42, 0.42, 0.06], [-2.45, 1.18, 0.1], [1.75, 1.22, 0.08], [2.4, 1.18, 0.12], [2.46, 0.95, 0.06], [2.45, 0.42, 0.06]],
    glass: [[-2.36, 1.2, 0.04], [-2.34, 1.86, 0.06], [1.05, 1.86, 0.06], [1.72, 1.21, 0.04]], pillar: [-1.15, 0.05] },
  // a Bavarian-style sports saloon
  bavaria: { name: 'Bavaria 330', L: 4.65, W: 1.82, wr: 0.34, wb: 2.85, body: [[-2.3, 0.32], [-2.33, 0.62], [-2.22, 0.9], [-1.9, 0.96], [-1.35, 0.97], [1.25, 0.95], [2.18, 0.8], [2.33, 0.58], [2.31, 0.32]],
    glass: [[-1.5, 0.95], [-1.0, 1.36], [-0.7, 1.4], [0.35, 1.4], [0.65, 1.34], [1.28, 0.95]], pillar: [-0.2] },
};
// an outline with rounded corners: each point is [x, y] or [x, y, cornerRadius]
function filleted(pts, rDef = 0.12) { const s = new THREE.Shape(), n = pts.length, P = i => pts[(i + n) % n];
  for (let i = 0; i < n; i++) { const [x, y, rr] = P(i), [px, py] = P(i - 1), [nx, ny] = P(i + 1), l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y), d = Math.min(rr ?? rDef, l1 * 0.45, l2 * 0.45);
    const ax = x + (px - x) / l1 * d, ay = y + (py - y) / l1 * d, bx = x + (nx - x) / l2 * d, by = y + (ny - y) / l2 * d;
    if (i === 0) s.moveTo(ax, ay); else s.lineTo(ax, ay); s.quadraticCurveTo(x, y, bx, by); }
  s.closePath(); return s; }
// the body's outline: the top line from the data, and an underside with real wheel arches cut up into it
function bodyOutline(C, ride) { const top = C.body.map(([x, y, r]) => [x, y + ride, r]), sill = top[top.length - 1][1], R = C.wr + 0.07, out = [...top];
  const arch = xw => { const a0 = Math.asin(Math.max(-1, Math.min(1, (sill - C.wr) / R))), pts = []; for (let i = 0; i <= 10; i++) { const a = a0 + (Math.PI - 2 * a0) * i / 10; pts.push([xw + Math.cos(a) * R, C.wr + Math.sin(a) * R, 0.02]); } return pts; };
  out.push(...arch(C.wb / 2)); out.push(...arch(-C.wb / 2)); return out; }
// real cars lean their windows in towards the roof ("tumblehome"): pull the sides in above the waistline
function tumble(g, belt, roof, k) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > belt) { const t = Math.min(1, (y - belt) / Math.max(0.01, roof - belt)); p.setX(i, p.getX(i) * (1 - k * t * t)); } } p.needsUpdate = true; g.computeVertexNormals(); return g; }
// the body extrude lies along z in three.js; we rotate so the car's length runs along z (front at +z) like the game's cars
function extrudeSide(shape, width, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 4, curveSegments: 10 });
  g.translate(0, 0, -(width - bevel * 2) / 2); g.rotateY(-Math.PI / 2); return g; // x(length) -> z, z(width) -> x
}
function tyre(r, w) { // a turned profile: rounded sidewalls, flat tread
  const p = [], tr = r * 0.62; for (let i = 0; i <= 12; i++) { const a = -Math.PI / 2 + i / 12 * Math.PI; p.push(new THREE.Vector2(r - w * 0.18 + Math.cos(a) * w * 0.18, Math.sin(a) * w / 2)); }
  p.unshift(new THREE.Vector2(tr, -w / 2)); p.push(new THREE.Vector2(tr, w / 2));
  const g = new THREE.LatheGeometry(p, 28); g.rotateZ(Math.PI / 2); return g;
}
function rim(r, w, spokes = 5, col = '#c9ccd2') {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: col, metalness: 0.9, roughness: 0.25 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w * 0.5, 28), m); disc.rotation.z = Math.PI / 2; g.add(disc);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.86, r * 0.86, w * 0.52, 28), mat('#2b2d33', 0.6, 0.4)); dish.rotation.z = Math.PI / 2; g.add(dish);
  for (let i = 0; i < spokes; i++) { const s = new THREE.Mesh(roundedBox(w * 0.2, r * 1.62, r * 0.2, 0.02, 2), m); s.rotation.x = i / spokes * Math.PI * 2; s.position.x = w * 0.18; g.add(s); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.22, w * 0.3, 16), m); hub.rotation.z = Math.PI / 2; hub.position.x = w * 0.22; g.add(hub);
  return g;
}
export function buildSmoothCar(kind = 'gulf', color = '#2f6fd6', o = {}) {
  const C = SMOOTH_CARS[kind], grp = new THREE.Group(), W = C.W, ride = C.ride || 0;
  const body = paint(color), glassM = new THREE.MeshPhysicalMaterial({ color: '#1b2430', metalness: 0.2, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.82 });
  const trimM = mat('#17181c', 0.5, 0.2), chrome = new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 1, roughness: 0.15 });
  const up = pts => pts.map(([x, y]) => [x, y + ride]);
  // body shell and glasshouse
  const belt = Math.max(...C.body.map(p => p[1])) + ride, roofY = Math.max(...C.glass.map(p => p[1])) + ride;
  const shell = mesh(tumble(extrudeSide(bodyOutline(C, ride).length && filleted(bodyOutline(C, ride), 0.16), W, 0.07), belt - 0.25, belt, 0.04), body, 0, 0, 0, grp); shell.name = 'body';
  const gh = mesh(tumble(extrudeSide(filleted(up(C.glass), 0.1), W * 0.9, 0.05), belt, roofY, 0.16), glassM, 0, 0, 0, grp); gh.name = 'glass';
  // inner arch liners, so you see a dark wheel well rather than through the car
  for (const z of [C.wb / 2, -C.wb / 2]) { const lg = new THREE.CylinderGeometry(C.wr + 0.07, C.wr + 0.07, W - 0.16, 20, 1, true, 0, Math.PI); lg.rotateZ(Math.PI / 2); const li = mesh(lg, new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.9, side: THREE.DoubleSide }), 0, C.wr, z, grp); li.castShadow = false; }
  // roof skin and pillars in paint over the glass, so it reads as windows set into a body
  const roofPts = up(C.glass).filter(p => p[1] > 1.3 + ride - 0.05); if (roofPts.length >= 2) { const x0 = Math.min(...roofPts.map(p => p[0])), x1 = Math.max(...roofPts.map(p => p[0])), ry = Math.max(...roofPts.map(p => p[1]));
    const roof = mesh(roundedBox(W * 0.9 * 0.84, 0.06, x1 - x0 + 0.06, 0.03), body, 0, ry + 0.005, (x0 + x1) / 2, grp); roof.name = 'roof'; }
  const glassAt = x => { const pts = up(C.glass); let top = 0, bot = 9; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); top = Math.max(top, y); bot = Math.min(bot, y); } } return [bot, top]; };
  for (const px of C.pillar) { const [b0, t0] = glassAt(px); if (t0 > b0) for (const sx of [-1, 1]) { const pl = mesh(roundedBox(0.05, t0 - b0, 0.09, 0.02), body, sx * W * 0.45 * (1 - 0.08), (b0 + t0) / 2, px, grp); pl.rotation.z = sx * 0.16; } }
  // doors: panel lines cut into the side, a handle and a mirror (each door is its own group so it can swing open)
  const doors = {}, dz = [C.pillar[0] - 1.05, C.pillar[0]], dTop = Math.min(...[dz[0], dz[1]].map(x => glassAt(x)[0])) - 0.02;
  for (const sx of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(sx * (W / 2 - 0.01), 0, dz[1]); grp.add(pv); doors[sx] = pv;
    for (const z of [0, -(dz[1] - dz[0])]) mesh(new THREE.BoxGeometry(0.012, dTop - 0.42 - ride, 0.012), trimM, sx * 0.005, (dTop + 0.42 + ride) / 2, z, pv);
    const h = mesh(roundedBox(0.035, 0.035, 0.2, 0.015), chrome, sx * 0.02, dTop - 0.17, -(dz[1] - dz[0]) + 0.28, pv); h.name = 'handle'; }
  { const mz = dz[1] + 0.08, my = glassAt(mz)[0] + 0.06; for (const sx of [-1, 1]) { const m = new THREE.Group(); m.position.set(sx * (W / 2 + 0.02), my, mz); grp.add(m);
      mesh(roundedBox(0.16, 0.09, 0.1, 0.035), body, sx * 0.07, 0.02, 0, m); mesh(new THREE.BoxGeometry(0.01, 0.07, 0.08), chrome, sx * 0.152, 0.02, -0.006, m); } }
  // lights: wrap-round headlamps and tail lamps that glow
  const head = new THREE.MeshStandardMaterial({ color: '#f4f6fb', emissive: '#fff3d0', emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.1 }), tail = new THREE.MeshStandardMaterial({ color: '#7a0d14', emissive: '#ff1e2c', emissiveIntensity: 0.45, roughness: 0.25 });
  const front = Math.max(...C.body.map(p => p[0])), back = Math.min(...C.body.map(p => p[0])), noseY = up(C.body).find(p => p[0] === front)[1];
  for (const sx of [-1, 1]) { mesh(roundedBox(0.38, 0.09, 0.08, 0.03), head, sx * (W / 2 - 0.3), 0.76 + ride, front - 0.05, grp); mesh(roundedBox(0.36, 0.12, 0.12, 0.05), tail, sx * (W / 2 - 0.25), 0.8 + ride, back + 0.06, grp); }
  // grille, bumpers and number plates
  mesh(roundedBox(W * 0.42, 0.16, 0.05, 0.04), trimM, 0, 0.6 + ride, front - 0.02, grp);
  for (const [z, y] of [[front - 0.03, 0.38], [back + 0.03, 0.38]]) mesh(roundedBox(W * 0.98, 0.16, 0.16, 0.07), trimM, 0, y + ride, z, grp);
  for (const z of [front + 0.04, back - 0.04]) mesh(roundedBox(0.52, 0.12, 0.02, 0.01), mat('#f2f2f2', 0.4), 0, 0.5 + ride, z, grp);
  // wheel arches (dark liners) and wheels
  const wheels = [], r = C.wr, tw = 0.24; for (const z of [C.wb / 2, -C.wb / 2]) for (const sx of [-1, 1]) {
    const wg = new THREE.Group(); wg.position.set(sx * (W / 2 - tw / 2 - 0.04), r, z); grp.add(wg); const t = mesh(tyre(r, tw), mat('#1a1a1c', 0.92), 0, 0, 0, wg); const rm = rim(r * 0.62, tw); rm.scale.x = sx; wg.add(rm); wheels.push(wg); }
  grp.userData = { kind, name: C.name, doors, wheels, length: C.L, width: W };
  return grp;
}

// ---------------------------------------------------------------- people
// Same joints as the game's rig (hips, torso, head, shoulder > elbow > hand, hip > knee > foot) so every animation carries over.
export function buildSmoothPerson(o = {}) {
  const skin = mat(o.skin || '#c98f62', 0.75), top = mat(o.top || '#2f6fd6', 0.85), legsM = mat(o.pants || '#2a2d36', 0.85), shoeM = mat(o.shoes || '#f2f2f2', 0.6), hairM = mat(o.hair || '#2a1a10', 0.9);
  const root = new THREE.Group(), hips = new THREE.Group(); hips.position.y = 0.92; root.add(hips);
  const pelvis = mesh(roundedBox(0.3, 0.15, 0.18, 0.06), legsM, 0, -0.01, 0, hips);
  const torso = new THREE.Group(); torso.position.y = 0.06; hips.add(torso);
  // a tapered chest turned on a lathe (wider shoulders, narrower waist), squashed front-to-back
  const prof = [[0.001, 0], [0.16, 0], [0.17, 0.12], [0.2, 0.34], [0.21, 0.44], [0.17, 0.52], [0.06, 0.56], [0.001, 0.56]].map(([x, y]) => new THREE.Vector2(x, y));
  const chest = mesh(new THREE.LatheGeometry(prof, 24), top, 0, 0, 0, torso); chest.scale.z = 0.62;
  const neck = mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 12), skin, 0, 0.6, 0, torso);
  const head = new THREE.Group(); head.position.y = 0.64; head.scale.setScalar(0.88); torso.add(head);
  const skull = mesh(roundedBox(0.25, 0.28, 0.26, 0.1, 4), skin, 0, 0.13, 0, head);
  const hair = mesh(roundedBox(0.27, 0.12, 0.28, 0.06, 3), hairM, 0, 0.25, -0.01, head); hair.name = 'hair';
  mesh(roundedBox(0.27, 0.16, 0.06, 0.03), hairM, 0, 0.17, -0.12, head);
  // face: eyes with highlights, brows, a nose and a mouth that can move
  const white = mat('#ffffff', 0.3), iris = mat('#3a2614', 0.3);
  for (const sx of [-1, 1]) { mesh(new THREE.SphereGeometry(0.032, 12, 10), white, sx * 0.058, 0.15, 0.118, head).scale.z = 0.5; mesh(new THREE.SphereGeometry(0.019, 10, 8), iris, sx * 0.058, 0.15, 0.132, head).scale.z = 0.5;
    mesh(roundedBox(0.06, 0.014, 0.02, 0.006), hairM, sx * 0.06, 0.195, 0.125, head).rotation.z = -sx * 0.08; }
  mesh(roundedBox(0.035, 0.05, 0.04, 0.015), skin, 0, 0.11, 0.135, head);
  const mouth = mesh(roundedBox(0.07, 0.016, 0.02, 0.008), mat('#7a3a30', 0.6), 0, 0.055, 0.128, head); mouth.name = 'mouth';
  for (const sx of [-1, 1]) mesh(new THREE.SphereGeometry(0.035, 10, 8), skin, sx * 0.128, 0.13, 0, head).scale.set(0.5, 1, 0.8); // ears
  // arms: shoulder pivot > upper arm > elbow pivot > forearm > hand
  const limb = (len, r0, r1, m) => { const g = new THREE.CylinderGeometry(r1, r0, len, 14, 1); g.translate(0, -len / 2, 0); const cap = new THREE.SphereGeometry(r0, 14, 10); return [g, cap, m]; };
  const arm = sx => { const pivot = new THREE.Group(); pivot.position.set(sx * 0.24, 0.47, 0); torso.add(pivot);
    const [g1, c1] = limb(0.28, 0.058, 0.05, top); mesh(g1, top, 0, 0, 0, pivot); mesh(c1, top, 0, 0, 0, pivot);
    const elbow = new THREE.Group(); elbow.position.y = -0.28; pivot.add(elbow); const [g2, c2] = limb(0.25, 0.05, 0.04, top); mesh(g2, top, 0, 0, 0, elbow); mesh(c2, top, 0, 0, 0, elbow);
    const hand = new THREE.Group(); hand.position.y = -0.27; elbow.add(hand); mesh(roundedBox(0.07, 0.09, 0.05, 0.022), skin, 0, -0.03, 0, hand); mesh(roundedBox(0.025, 0.05, 0.025, 0.012), skin, -sx * 0.035, -0.02, 0.02, hand).rotation.z = sx * 0.4;
    return { pivot, elbow, hand }; };
  const leg = sx => { const pivot = new THREE.Group(); pivot.position.set(sx * 0.1, -0.04, 0); hips.add(pivot);
    const [g1, c1] = limb(0.44, 0.072, 0.06, legsM); mesh(g1, legsM, 0, 0, 0, pivot); mesh(c1, legsM, 0, 0, 0, pivot);
    const knee = new THREE.Group(); knee.position.y = -0.44; pivot.add(knee); const [g2, c2] = limb(0.42, 0.058, 0.047, legsM); mesh(g2, legsM, 0, 0, 0, knee); mesh(c2, legsM, 0, 0, 0, knee);
    const foot = new THREE.Group(); foot.position.y = -0.42; knee.add(foot); mesh(roundedBox(0.11, 0.08, 0.26, 0.035), shoeM, 0, -0.03, 0.05, foot); mesh(roundedBox(0.115, 0.025, 0.27, 0.01), mat('#d9d9d9', 0.7), 0, -0.065, 0.05, foot);
    return { pivot, knee, foot }; };
  const armL = arm(1), armR = arm(-1), legL = leg(1), legR = leg(-1);
  return { root, hips, torso, head, armL, armR, legL, legR, mouth, parts: { chest, skull, hair } };
}

// ---------------------------------------------------------------- guns (from parts, like the gunsmith)
export function buildSmoothGun(o = {}) {
  const g = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: o.finish || '#2b2d33', metalness: 0.8, roughness: 0.35 }), poly = mat(o.grip || '#1a1b1f', 0.8);
  const parts = {};
  parts.receiver = mesh(roundedBox(0.05, 0.075, 0.24, 0.012), steel, 0, 0, 0, g);
  parts.barrel = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 14), steel, 0, 0.015, 0.19, g); parts.barrel.rotation.x = Math.PI / 2;
  parts.slide = mesh(roundedBox(0.052, 0.035, 0.2, 0.01), steel, 0, 0.042, 0.02, g);
  parts.grip = mesh(roundedBox(0.045, 0.13, 0.07, 0.015), poly, 0, -0.08, -0.07, g); parts.grip.rotation.x = -0.25;
  parts.mag = mesh(roundedBox(0.035, 0.11, 0.05, 0.008), steel, 0, -0.1, -0.06, g); parts.mag.rotation.x = -0.25;
  parts.guard = mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 16, Math.PI), steel, 0, -0.04, 0.0, g); parts.guard.rotation.set(0, Math.PI / 2, Math.PI);
  parts.sight = mesh(roundedBox(0.012, 0.015, 0.02, 0.004), steel, 0, 0.065, 0.11, g);
  g.userData.parts = parts; return g;
}

// ---------------------------------------------------------------- street
function canvasTex(w, h, draw, rep = [1, 1]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
export function buildStreet() {
  const g = new THREE.Group();
  const asphalt = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#3b3e44'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 50 + Math.random() * 30; x.fillStyle = `rgb(${v},${v + 2},${v + 6})`; x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } }, [8, 2]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 10), new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.92 })); road.rotation.x = -Math.PI / 2; road.receiveShadow = true; g.add(road);
  const lineM = mat('#f2efe6', 0.6); for (let x = -19; x < 20; x += 3) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.14), lineM); l.rotation.x = -Math.PI / 2; l.position.set(x, 0.005, 0); g.add(l); }
  for (const z of [-4.75, 4.75]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(40, 0.12), lineM); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.005, z * 0.98); g.add(l); }
  // kerb and paving slabs
  const slabs = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#b9b4aa'; x.fillRect(0, 0, w, h); x.strokeStyle = '#9a958b'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * w / 4, 0); x.lineTo(i * w / 4, h); x.stroke(); x.beginPath(); x.moveTo(0, i * h / 4); x.lineTo(w, i * h / 4); x.stroke(); } for (let i = 0; i < 900; i++) { const v = 160 + Math.random() * 30; x.fillStyle = `rgb(${v},${v - 4},${v - 10})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, [10, 1.2]);
  for (const sz of [-1, 1]) { const k = mesh(roundedBox(40, 0.16, 0.3, 0.04), mat('#c9c5bc', 0.85), 0, 0.08, sz * 5.15, g); const pv = new THREE.Mesh(new THREE.BoxGeometry(40, 0.15, 4), new THREE.MeshStandardMaterial({ map: slabs, roughness: 0.9 })); pv.position.set(0, 0.075, sz * 7.3); pv.receiveShadow = true; g.add(pv); }
  // a terrace of shopfronts: bevelled brick-coloured blocks, framed windows, an awning, a door
  const brick = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#8e5a46'; x.fillRect(0, 0, w, h); for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) { const v = Math.random() * 18 - 9; x.fillStyle = `rgb(${150 + v},${92 + v},${72 + v})`; x.fillRect(c * 32 + (r % 2) * 16 + 1, r * 16 + 1, 30, 14); } }, [3, 3]);
  const cols = ['#e8dcc6', null, '#cfd9d6', null];
  for (let i = 0; i < 4; i++) { const bx = -15 + i * 10, b = new THREE.Group(); b.position.set(bx, 0, -11.5); g.add(b); const hgt = 7 + (i % 2) * 2;
    const wallM = cols[i] ? mat(cols[i], 0.9) : new THREE.MeshStandardMaterial({ map: brick, roughness: 0.95 });
    mesh(roundedBox(9.6, hgt, 4, 0.08), wallM, 0, hgt / 2, 0, b);
    mesh(roundedBox(9.8, 0.3, 4.2, 0.06), mat('#f1ede4', 0.7), 0, hgt + 0.15, 0, b); // parapet
    const frame = mat('#f4f1ea', 0.6), glass = new THREE.MeshPhysicalMaterial({ color: '#2a3a4c', metalness: 0.4, roughness: 0.08, clearcoat: 1 });
    for (let fy = 3.8; fy < hgt - 1; fy += 2.6) for (const fx of [-3, 0, 3]) { mesh(roundedBox(1.5, 1.7, 0.16, 0.04), frame, fx, fy, 2.02, b); mesh(new THREE.BoxGeometry(1.3, 1.5, 0.05), glass, fx, fy, 2.08, b); mesh(roundedBox(1.7, 0.1, 0.3, 0.03), frame, fx, fy - 0.9, 2.12, b); }
    mesh(new THREE.BoxGeometry(6, 2.2, 0.06), glass, -1.2, 1.4, 2.05, b); mesh(roundedBox(6.3, 0.22, 0.2, 0.05), frame, -1.2, 2.6, 2.1, b);
    mesh(roundedBox(1.2, 2.4, 0.12, 0.03), mat(['#2f5d4a', '#7a2230', '#1f3550', '#3a3a3a'][i], 0.5), 3, 1.2, 2.04, b);
    const aw = mesh(roundedBox(6.6, 0.08, 1.4, 0.04), mat(['#c23b3b', '#2b7a5a', '#d9a03b', '#2f5fa8'][i], 0.8), -1.2, 3.0, 2.7, b); aw.rotation.x = 0.28; }
  // street lamps and a couple of trees
  for (const x of [-12, 4]) { const p = new THREE.Group(); p.position.set(x, 0.15, -5.8); g.add(p); mesh(new THREE.CylinderGeometry(0.06, 0.09, 5, 12), mat('#2a2d33', 0.4, 0.7), 0, 2.5, 0, p);
    mesh(roundedBox(0.5, 0.14, 0.26, 0.06), mat('#2a2d33', 0.4, 0.7), 0, 5, 0.18, p); mesh(new THREE.BoxGeometry(0.36, 0.02, 0.18), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe2a8', emissiveIntensity: 0.6 }), 0, 4.92, 0.18, p); }
  for (const x of [-4, 13]) { const t = new THREE.Group(); t.position.set(x, 0.15, -6.2); g.add(t); mesh(new THREE.CylinderGeometry(0.1, 0.16, 2.4, 10), mat('#6b4a32', 0.9), 0, 1.2, 0, t);
    for (const [a, b2, c, r] of [[0, 3.1, 0, 1.2], [0.6, 2.7, 0.3, 0.85], [-0.6, 2.8, -0.2, 0.9], [0.1, 3.7, 0.1, 0.8]]) mesh(new THREE.IcosahedronGeometry(r, 2), mat('#4f8a3c', 0.85), a, b2, c, t); }
  return g;
}

// ---------------------------------------------------------------- lighting: soft sun, sky fill and a reflection map for paint and glass
export function smoothLighting(renderer, scene) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // sky dome with a soft gradient, also baked into an environment map so cars reflect the sky
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color('#5d9be0') }, mid: { value: new THREE.Color('#bcd8f2') }, bot: { value: new THREE.Color('#e9e2d4') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.6)) : mix(mid, bot, min(1.0, -h * 4.0)); gl_FragColor = vec4(c, 1.0); }' });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat); scene.add(sky);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMat.clone()));
  const sunBlob = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 8), new THREE.MeshBasicMaterial({ color: '#fff6e0' })); sunBlob.position.set(5, 6, 4); envScene.add(sunBlob);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(envScene, 0.02).texture;
  const hemi = new THREE.HemisphereLight('#cfe3ff', '#8a7a66', 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4); sun.position.set(18, 26, 14); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 80 }); scene.add(sun);
  scene.fog = new THREE.Fog('#cfe0ef', 40, 140);
  return { sun, hemi, sky };
}
