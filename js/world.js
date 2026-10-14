// Open-world map: layout, deterministic generation, colliders, chunk meshing and minimap.
import * as THREE from '../lib/three.module.min.js';
import { groundMaterial, GT } from './groundtex.js?v=197';

export const WORLD = { x0: -1560, x1: 1420, z0: -800, z1: 760 };
export const CHUNK = 64;
const P = 48, HR = 6; // grid period, half road width

export const CITIES = [
  { id: 'main', name: 'Downtown', cx: 0, cz: 0, kx: [-6, 6], kz: [-6, 7], style: 'downtown' },
  { id: 'east', name: 'Eastport', cx: 600, cz: 0, kx: [-3, 3], kz: [-3, 3], style: 'suburb' },
  { id: 'north', name: 'Northfield', cx: 0, cz: -520, kx: [-4, 4], kz: [-1, 1], style: 'mid' },
  { id: 'nport', name: 'Northport', cx: 648, cz: -432, kx: [-2, 2], kz: [-3, 3], style: 'nport' }, // across the river from Eastport
  { id: 'strip', name: 'Sun Valley', cx: -960, cz: -300, kx: [-1, 1], kz: [-3, 3], style: 'strip' }, // a Vegas-style casino strip out in the desert
  { id: 'isle', name: 'Long Beach', cx: 1056, cz: 0, kx: [-2, 2], kz: [-9, 6], style: 'island' }, // long enough to reach up level with Northport // the long island city out in the east bay
];
for (const c of CITIES) {
  c.x0 = c.cx + c.kx[0] * P - HR; c.x1 = c.cx + c.kx[1] * P + HR;
  c.z0 = c.cz + c.kz[0] * P - HR; c.z1 = c.cz + c.kz[1] * P + HR;
}
export const SIGN = { x: -446, z: -268, text: 'BAYWOOD' };
// the Bay Line railway: north of downtown, from the Hidden Hills to the farmland, with three stations
export const RAIL = { z: -318, x0: -284, x1: 444, stations: [{ name: 'Baywood Hills', x: -252 }, { name: 'Downtown North', x: 72 }, { name: 'Farmland', x: 412 }] };
// ---- Bay Metro: an elevated loop through downtown above the avenues (x = +-96, z = +-144), 9 m up on concrete pillars
export const METRO = (() => {
  // the loop: round downtown, north to meet the Bay Line at Farmland, east over the river to Northport, down into Eastport,
  // across the bay and right round Long Beach, then back across the bay into downtown. Every corner is a 16 m curve.
  const R = 16, Y = 9, pts = [];
  const C = [[-96, -144], [240, -144], [240, -288], [744, -288], [744, -96], [960, -96], [960, -384], [1152, -384], [1152, 288], [960, 288], [960, -48], [96, -48], [96, 144], [-96, 144]];
  const n = C.length, dir = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  for (let i = 0; i < n; i++) {
    const c = C[i], nx = C[(i + 1) % n], pv = C[(i - 1 + n) % n], din = dir(pv, c), dout = dir(c, nx);
    const A = [c[0] - din[0] * R, c[1] - din[1] * R], O = [A[0] + dout[0] * R, A[1] + dout[1] * R], B = [c[0] + dout[0] * R, c[1] + dout[1] * R];
    const a0 = Math.atan2(A[1] - O[1], A[0] - O[0]), a1 = Math.atan2(B[1] - O[1], B[0] - O[0]), da = Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0));
    for (let k = 0; k < 25; k++) { const a = a0 + da * k / 25; pts.push([O[0] + Math.cos(a) * R, O[1] + Math.sin(a) * R]); }
    const E = [nx[0] - dout[0] * R, nx[1] - dout[1] * R], L = Math.hypot(E[0] - B[0], E[1] - B[1]);
    for (let d = 0; d < L; d += 1) pts.push([B[0] + dout[0] * d, B[1] + dout[1] * d]);
  }
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = cum[cum.length - 1] + Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
  const at = s => { s = ((s % len) + len) % len; let lo = 0, hi = cum.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (cum[m] <= s) lo = m; else hi = m - 1; } const a = pts[lo], b = pts[(lo + 1) % pts.length], seg = (lo + 1 < cum.length ? cum[lo + 1] : len) - cum[lo], t = seg ? (s - cum[lo]) / seg : 0; return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, h: Math.atan2(b[0] - a[0], b[1] - a[1]) }; };
  const sOf = (x, z) => { let best = 0, bd = 1e9; for (let i = 0; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - x, pts[i][1] - z); if (d < bd) { bd = d; best = cum[i]; } } return best; };
  // stations: the platform on one side of the line, a stair tower down to the ground beside it
  const stations = [['Midtown', 0, -144, 0, -1], ['Farmland (Bay Line)', 412, -288, 0, -1], ['Northport', 648, -288, 0, -1], ['Eastport', 744, -122, 1, 0], ['Long Beach North', 1056, -384, 0, -1], ['Long Beach South', 1056, 288, 0, 1], ['East Side', 96, 0, 1, 0], ['Bayside', 0, 144, 0, 1], ['West End', -96, 0, -1, 0]]
    .map(([name, x, z, ox, oz]) => ({ name, x, z, s: sOf(x, z), ox, oz, tower: { x: x + ox * 8.6 + (ox ? 0 : 14), z: z + oz * 8.6 + (oz ? 0 : 14) } })).sort((a, b) => a.s - b.s);
  return { Y, len, at, stations, pts };
})();
export const onBridge = (x, z) => Math.abs(x - UNDERPASS.x) < UNDERPASS.half + 5.2 && Math.abs(z - RAIL.z) < 3.3;
export const onRail = (x, z, m = 0) => x > RAIL.x0 - m && x < RAIL.x1 + m && Math.abs(z - RAIL.z) < 2.2 + m;
export const AIRPORT = { x0: -240, x1: 280, z0: -780, z1: -575 };
export const sandLine = x => 352 + 6 * Math.sin(x / 41) + 3 * Math.sin(x / 13);
export const shoreLine = x => 432 + 8 * Math.sin(x / 53) + 4 * Math.sin(x / 19);
export const WATER_Y = -0.8;
// ---- the east: Eastport's coast, the Bay River (in from the east bay along the top of Eastport, then north off the map)
// and Long Beach, a long rectangular island ringed with sand
export const coastX = z => 792 + 5 * Math.sin(z / 37) + 3 * Math.sin(z / 13);
export const ISLE = { x0: 900, x1: 1212, z0: -492, z1: 348 };
export const PORT = { x0: 975, x1: 1145, z0: -745, z1: -565 }; // Bay Port: a square concrete freight island north of Long Beach, quay walls straight into deep water
export const RIVER = { hw: 14, pts: [[840, -212], [760, -214], [680, -210], [600, -212], [548, -218], [520, -236], [507, -270], [503, -320], [509, -390], [501, -460], [508, -540], [500, -620], [507, -700], [502, -780], [504, -860]] };
export function riverD(x, z) {
  if (x < 470 || z > -170) return 1e9; let best = 1e9; const P2 = RIVER.pts;
  for (let i = 0; i < P2.length - 1; i++) { const [ax, az] = P2[i], [bx, bz] = P2[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))), d = Math.hypot(x - ax - dx * t, z - az - dz * t); if (d < best) best = d; }
  return best;
}
export const isleD = (x, z) => { const dx = Math.max(ISLE.x0 - x, x - ISLE.x1), dz = Math.max(ISLE.z0 - z, z - ISLE.z1); return dx > 0 || dz > 0 ? Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) : Math.max(dx, dz); }; // <0 inside the island
// how high the land may be here because of the east bay and the river (Infinity = no limit)
function eastCap(x, z) {
  let cap = Infinity;
  if (x > 700) { const s = coastX(z) - 22, main = x >= s ? Math.max(-5, -(x - s) * 0.08) : Infinity, di = isleD(x, z), isle = di < -22 ? 0 : Math.max(-5, -(di + 22) * 0.08); cap = Math.max(main, isle, inR(PORT, x, z) ? 0.02 : -5); }
  if (x > 460 && z < -150) { const d = riverD(x, z); if (d < RIVER.hw + 8) cap = Math.min(cap, Math.max(-4, -(RIVER.hw + 8 - d) * 0.35)); }
  return cap;
}
// ---- the far west, over the ridge behind the Hidden Hills: Wildwood (a wild valley), then the Red Rock Desert with the
// Red River running through a canyon, then West Beach and the ocean. The north of it is a coast too.
function ss(t) { return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t); }
export function redRiverX(z) { return -1100 + 26 * Math.sin(z / 110) + 10 * Math.sin(z / 37); }
export function coastW(z) { return -1380 + 8 * Math.sin(z / 47) + 4 * Math.sin(z / 17); }
export function northZ(x) { return -770 + 6 * Math.sin(x / 40) + 3 * Math.sin(x / 13); }
export const FORDS = [-100, -450, 250]; // where the dirt trails splash across the Red River
export const MESAS = [{ x: -960, z: -560, r: 34, h: 16 }, { x: -1230, z: -620, r: 26, h: 20 }, { x: -1000, z: 120, r: 22, h: 14 }, { x: -1290, z: 300, r: 30, h: 13 }, { x: -1180, z: -260, r: 18, h: 18 }, { x: -940, z: 360, r: 20, h: 11 }];
// little islands: each is a few overlapping blobs with a wobbly coast, so they come out as beans, 8s, a 9, long I-shaped strips
export const ISLETS = [
  { x: -640, z: 650, parts: [[0, 0, 26], [30, 18, 18]] }, { x: 330, z: 700, parts: [[0, -17, 16], [0, 15, 18]] },
  { x: 650, z: 640, parts: [[-34, 0, 10], [-12, 0, 12], [12, 2, 12], [34, 4, 10]] }, { x: 1345, z: -200, parts: [[0, 0, 24], [16, 26, 12], [20, 46, 9]], light: true },
  { x: 1360, z: 320, parts: [[0, 0, 20], [-22, -14, 12]] }, { x: -1480, z: -330, parts: [[0, 0, 26], [-10, 32, 15], [-4, 54, 10]], light: true },
  { x: -1470, z: 280, parts: [[0, -36, 10], [2, -12, 12], [0, 12, 12], [-2, 36, 10]] }, { x: -1110, z: 660, parts: [[0, 0, 22], [30, -8, 16], [52, -2, 10]] },
  { x: 1300, z: 660, parts: [[0, -14, 16], [0, 16, 16]] }, { x: -1490, z: -650, parts: [[0, 0, 20], [24, 10, 12]] },
];
for (const [k, I] of ISLETS.entries()) { I.seed = k * 1.7; I.r = Math.max(...I.parts.map(([dx, dz, r]) => Math.hypot(dx, dz) + r)) + 12; } // (r: a bounding radius)
function westBase(x, z, h) { // x < -560: valley noise h comes in; shape it into ridge, valley, desert plateau, canyon and coasts
  const ridge = 16 * Math.exp(-(((x + 600) / 55) ** 2)) * (1 - 0.75 * Math.exp(-((z / 70) ** 2))); // the ridge behind the Hidden Hills, with a low pass where the trail crosses
  const desert = ss((-860 - x) / 60); // 0 in Wildwood, 1 out in the desert
  let y = (h * 0.55 + 2) * (1 - desert) + (7 + 1.4 * Math.sin(x / 31) * Math.cos(z / 43) + 0.8 * Math.sin(z / 17 + x / 23)) * desert + ridge;
  for (const M of MESAS) { const d = Math.hypot(x - M.x, z - M.z); if (d < M.r + 8) y += M.h * ss((M.r + 8 - d) / 8); } // flat-topped mesas with steep sides
  { const d = Math.abs(x - redRiverX(z)); if (d < 44) { const ford = FORDS.some(f => Math.abs(z - f) < 16), bed = ford ? -1.05 : -2.8; y = d < 13 ? bed : bed + (y - bed) * ss((d - 13) / 31); } } // the river gorge (shallow at the fords)
  { const C2 = CITIES.find(c => c.id === 'strip'), dx = Math.max(C2.x0 - x, 0, x - C2.x1), dz = Math.max(C2.z0 - z, 0, z - C2.z1); y *= ss((Math.hypot(dx, dz) - 6) / 70); } // Sun Valley sits flat in a basin
  y *= ss((x - coastW(z) - 20) / 90); // the desert slopes down to West Beach
  y *= ss((z - northZ(x) - 26) / 70); // and to the north shore
  return y;
}
function westCap(x, z) { // sea levels in the west: the beach then the ocean, west and north
  let cap = Infinity; const sw = coastW(z) + 22; if (x < sw) cap = Math.max(-5, -(sw - x) * 0.08);
  const sn = northZ(x) + 22; if (z < sn) cap = Math.min(cap, Math.max(-5, -(sn - z) * 0.08));
  return cap;
}
export function isletAt(x, z) {
  for (const I of ISLETS) { if (Math.abs(x - I.x) > I.r + 8 || Math.abs(z - I.z) > I.r + 8) continue; let d = 1e9;
    for (const [n, [dx, dz, r]] of I.parts.entries()) { const px = x - I.x - dx, pz = z - I.z - dz, a = Math.atan2(pz, px), s2 = I.seed + n * 2.3; d = Math.min(d, Math.hypot(px, pz) - r * (1 + 0.13 * Math.sin(3 * a + s2) + 0.07 * Math.sin(5 * a + 2 * s2))); }
    if (d < 6) return { I, d }; }
  return null;
}
// Hidden Hills: rolling terrain west of downtown, flattened along the trail and on house pads.
function rawHills(x, z) { const b = rawBase(x, z), k = peakK(x, z); return k ? b + (PEAK_H0 - b) * k : b; }
function rawBase(x, z) {
  if (x >= -300) return 0;
  const ramp = Math.min(1, (-300 - x) / 60);
  let h = 6 + 4 * Math.sin(x / 37 + 1) * Math.cos(z / 41) + 3 * Math.sin(z / 23 + x / 57) + 1.2 * Math.sin(z / 9 + x / 13);
  if (x < -560) { const edge = rawBase(-559.99, z), k = ss((-560 - x) / 80), wb = westBase(x, z, h) * Math.min(1, Math.max(0, (sandLine(x) - 40 - z) / 50)); return edge * (1 - k) + wb * k; } // over the ridge into the far west (can dip below sea level: the river gorge)
  if (x < -500) h += (-500 - x) * 0.3;
  h *= Math.min(1, Math.max(0, (Math.abs(z) - 7) / 26));
  h *= Math.min(1, Math.max(0, (sandLine(x) - 40 - z) / 50));
  return Math.max(0, h * ramp);
}
// Baywood Peak: a mountain west of the canyon crossroad, flat-topped for the lookout
export const PEAK = { x: -502, z: -250, top: 34, flat: 10, r: 50 };
function peakK(x, z) { const d = Math.hypot(x - PEAK.x, z - PEAK.z); if (d >= PEAK.r) return 0; if (d <= PEAK.flat) return 1; const t = 1 - (d - PEAK.flat) / (PEAK.r - PEAK.flat); return t * t * (3 - 2 * t); }
const PEAK_H0 = rawBase(PEAK.x, PEAK.z) + PEAK.top; PEAK.y = PEAK_H0; // the summit's flat height
export const PADS = [
  { id: 'mansion1', x: -432, z: -392, r: 24 },
  { id: 'mansion2', x: -470, z: -160, r: 19 },
  { id: 'mansion3', x: -392, z: -584, r: 17 },
  { id: 'mansion4', x: -410, z: 120, r: 17 },
];
for (const p of PADS) p.h = rawHills(p.x, p.z);
// ---- Canyon roads: winding two-lane roads through the Hidden Hills. Canyon Drive runs from the coast road up past every
// hills house and the BAYWOOD sign to Ridge House; Canyon Road links it to downtown. The hillside is levelled under them.
export const CR_HW = 4.2;
export const CANYON = [
  { id: 'drive', name: 'Canyon Drive', pts: [[-340, 336], [-366, 300], [-390, 240], [-386, 184], [-383, 148], [-377, 112], [-378, 70], [-382, 36], [-386, 0], [-404, -48], [-436, -96], [-447, -128], [-439, -172], [-430, -205], [-414, -246], [-410, -290], [-422, -334], [-420, -358], [-406, -376], [-397, -404], [-402, -438], [-396, -472], [-384, -520], [-392, -562]] },
  { id: 'road', name: 'Canyon Road', pts: [[-294, -144], [-318, -146], [-350, -158], [-382, -180], [-410, -196], [-430, -205]] },
  { id: 'peak', name: 'Peak Road', pts: (() => { const c = { x: -502, z: -250 }, P0 = [[-430, -205], [-452, -207], [-476, -209]]; for (let k = 0; k <= 18; k++) { const a = (90 + k * 25) * Math.PI / 180, r = 39 - k * 1.5; P0.push([+(c.x + Math.cos(a) * r).toFixed(1), +(c.z + Math.sin(a) * r).toFixed(1)]); } return P0; })() }, // heads straight west off the crossroad, then spirals up anticlockwise, finishing at the summit car park
  // dirt trails through Wildwood and the desert, splashing across the Red River at the fords
  { id: 'wtrail', name: 'Wildwood Trail', dirt: true, pts: [[-540, 0], [-580, 4], [-630, 18], [-690, 28], [-750, 6], [-800, -50], [-850, -110], [-900, -150], [-970, -150], [-1040, -118], [-1085, -102], [+redRiverX(-100).toFixed(1), -100], [-1160, -96], [-1220, -80], [-1290, -40], [-1335, -12]] },
  { id: 'dloop', name: 'Desert Loop', dirt: true, pts: [[-1040, -118], [-1046, -200], [-1048, -300], [-1052, -390], [-1058, -440], [+redRiverX(-452).toFixed(1), -452], [-1130, -460], [-1190, -470], [-1255, -400], [-1262, -300], [-1240, -180], [-1220, -80]] },
  { id: 'strail', name: 'Canyon Run', dirt: true, pts: [[-690, 28], [-730, 120], [-780, 210], [-860, 250], [-950, 252], [-1030, 250], [+redRiverX(250).toFixed(1), 250], [-1130, 240], [-1180, 180], [-1210, 80], [-1220, -80]] },
  { id: 'dw_mansion', name: 'Driveway', pts: [[-432, -367], [-426, -362], [-420, -358]] },
  { id: 'dw_lake', name: 'Driveway', pts: [[-410, 141], [-398, 142], [-385, 144]] },
  { id: 'dw_villa', name: 'Driveway', pts: [[-470, -137], [-458, -133], [-449, -129]] },
];
{ // sample each road every 2 m along a Catmull-Rom curve, with a smoothed height profile (houses' pads hold their level)
  const prof = (x, z) => { for (const p of PADS) if (Math.hypot(x - p.x, z - p.z) < p.r + 10) return p.h; return x < -300 ? rawHills(x, z) : 0; };
  for (const R of CANYON) {
    const P2 = R.pts, out = [];
    for (let i = 0; i < P2.length - 1; i++) {
      const p0 = P2[Math.max(0, i - 1)], p1 = P2[i], p2 = P2[i + 1], p3 = P2[Math.min(P2.length - 1, i + 2)], L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(L / 2));
      for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), z: f(p0[1], p1[1], p2[1], p3[1]) }); }
    }
    out.push({ x: P2[P2.length - 1][0], z: P2[P2.length - 1][1] });
    let hs = out.map(q => prof(q.x, q.z));
    for (let pass = 0; pass < 3; pass++) hs = hs.map((_, i) => { let a = 0, n = 0; for (let k = -12; k <= 12; k++) { const j = i + k; if (j >= 0 && j < hs.length) { a += hs[j]; n++; } } return a / n; });
    if (R.dirt) hs = hs.map((h, i) => { const d = Math.abs(out[i].x - redRiverX(out[i].z)); return d < 16 ? -1.0 : d < 40 ? h + (-1.0 - h) * ss((40 - d) / 24) : h; }); // the trail runs down into the river: a wet ford you splash through
    if (R.id === 'peak') hs = hs.map((h, i) => { const d = Math.hypot(out[i].x - PEAK.x, out[i].z - PEAK.z); if (d < PEAK.flat + 5) return PEAK.y; if (d < PEAK.flat + 22) { const k = 1 - (d - PEAK.flat - 5) / 17; return h + (PEAK.y - h) * k * k * (3 - 2 * k); } return h; }); // the top lands level with the summit car park
    out.forEach((q, i) => { q.h = hs[i]; const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)], l = Math.hypot(b.x - a.x, b.z - a.z) || 1; q.nx = (b.z - a.z) / l; q.nz = -(b.x - a.x) / l; q.i = i; q.R = R; });
    R.s = out;
  }
  const D = CANYON[0];
  for (const R of CANYON.slice(1)) for (const end of [R.s[0], R.s[R.s.length - 1]]) {
    let jq = null, jd = 1e9; for (const q of D.s) { const d = Math.hypot(q.x - end.x, q.z - end.z); if (d < jd) { jd = d; jq = q; } }
    if (jd > 14) continue; R.joins = (R.joins || 0) + 1;
    for (const q of R.s) { const d = Math.hypot(q.x - end.x, q.z - end.z); if (d < 36) { const w = 1 - d / 36, k = w * w * (3 - 2 * w); q.h = q.h * (1 - k) + jq.h * k; } }
  }
}
// where roads meet: flag samples that overlap another road, so the junction is drawn as one clean surface
for (const R of CANYON) for (const q of R.s) for (const R2 of CANYON) { if (R2 === R) continue; for (const q2 of R2.s) if (Math.abs(q2.x - q.x) < 10 && Math.abs(q2.z - q.z) < 10 && Math.hypot(q2.x - q.x, q2.z - q.z) < CR_HW * 2 + 1.5) { q.jn = true; if (CANYON.indexOf(R) > CANYON.indexOf(R2)) q.under = true; break; } }
const CGRID = new Map(), CG2 = 12;
for (const R of CANYON) for (const q of R.s) { const k = Math.floor(q.x / CG2) + ',' + Math.floor(q.z / CG2); let a = CGRID.get(k); if (!a) CGRID.set(k, a = []); a.push(q); }
// nearest canyon road sample: { d, h, q } (within ~24 m) or null
export function canyonNear(x, z) {
  const i0 = Math.floor(x / CG2), j0 = Math.floor(z / CG2); let best = null, bd = 1e9;
  for (let i = i0 - 2; i <= i0 + 2; i++) for (let j = j0 - 2; j <= j0 + 2; j++) for (const q of CGRID.get(i + ',' + j) || []) { const d = (q.x - x) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; best = q; } }
  if (!best) return null; const end = best.i === 0 || best.i === best.R.s.length - 1, d = end ? Math.hypot(x - best.x, z - best.z) : Math.abs((x - best.x) * best.nx + (z - best.z) * best.nz); return { d, h: best.h, q: best };
}
// on a canyon road? { y } (the surface sits a touch proud of the dirt)
const crEnds = q => { const S2 = q.R.s, e = Math.min(q.i, S2.length - 1 - q.i), ep = q.i < S2.length / 2 ? S2[0] : S2[S2.length - 1]; return e < 3 && ep.x > -345 ? 0.06 + e * 0.05 : 0.22; }; // only where it meets a town/coast road // blend into the road it joins
export function canyonAt(x, z) { const c = canyonNear(x, z); if (!c || c.d > CR_HW) return null; return { y: c.h + crEnds(c.q), R: c.q.R }; }
// ---- rolling countryside between the districts (flat in towns, at the airport, on the beach and along the railway)
const sm = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
function rectDist(x, z, r) { return Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1)); }
export function rolling(x, z) {
  if (x < -300) return 0;
  let w = 1;
  for (const c of CITIES) w = Math.min(w, sm((rectDist(x, z, c) - 14) / 70));
  w = Math.min(w, sm((rectDist(x, z, AIRPORT) - 10) / 60), sm((sandLine(x) - 70 - z) / 70), sm((-300 - x) * -1 / 40 + 0)); // towns, airport, beach, hills seam
  if (x > RAIL.x0 - 30 && x < RAIL.x1 + 30) w = Math.min(w, sm((Math.abs(z - RAIL.z) - 7) / 30));
  if (x > 660) w = Math.min(w, sm((coastX(z) - 50 - x) / 40)); // flat down to the east shore
  if (x > 230 && x < 800) w = Math.min(w, sm((Math.abs(z + 288) - 10) / 30), sm((Math.abs(z + 48) - 10) / 30)); // and under the metro viaduct
  if (x > 440 && z < -140) w = Math.min(w, sm((riverD(x, z) - RIVER.hw - 14) / 30)); // and along the river banks
  for (const f of FIELDS) { const bx = f.x1 - 10, bz = f.z0 + 9; w = Math.min(w, sm((Math.hypot(x - bx, z - bz) - 16) / 26), sm((Math.hypot(x - bx + 9.5, z - bz + 2) - 6) / 16)); } // flat barn yards
  if (w <= 0) return 0;
  const h = 4.2 * Math.sin(x / 61 + 0.7) * Math.cos(z / 73 - 0.4) + 2.6 * Math.sin(z / 37 + x / 89) + 1.4 * Math.cos(x / 23 - z / 41);
  return Math.max(0, h + 3.2) * w;
}
// ---- the north highway dips under the railway: a cutting with retaining walls and a rail bridge overhead
export const UNDERPASS = { x: 0, z: RAIL.z, half: 8.2, depth: 5.4, z0: -296, z1: -352 };
export function dip(x, z) {
  const U = UNDERPASS; if (z > U.z0 || z < U.z1 || Math.abs(x - U.x) > U.half + 5) return 0;
  const along = z > U.z - 6 ? sm((U.z0 - z) / (U.z0 - (U.z - 6))) : z < U.z - 14 ? sm((z - U.z1) / ((U.z - 14) - U.z1)) : 1;
  const across = sm((U.half + 4 - Math.abs(x - U.x)) / 4);
  return -U.depth * along * across;
}
// ---- Bay Skyways: raised roads over two downtown streets. Each ramps up from the city edge (between the last two junctions),
// runs 5.2 m up on pillars over every cross street, and the two cross on a sky junction above the street junction below.
export const SKY_Y = 5.2, SKY_HW = 6;
export const SKYWAYS = [
  { id: 'A', name: 'Bayview Skyway', axis: 'x', line: 48, a0: -282, a1: 282, ramp: 36 },
  { id: 'B', name: 'Harbor Skyway', axis: 'z', line: -48, a0: -282, a1: 330, ramp: 36 },
  // bridges: the same raised road, higher, on big piers standing in the water
  { id: 'C', name: 'Long Beach Bridge', axis: 'x', line: 0, a0: 750, a1: 954, ramp: 54, y: 9, bridge: true },
  { id: 'D', name: 'River Bridge', axis: 'z', line: 600, a0: -282, a1: -150, ramp: 44, y: 7.5, bridge: true },
  { id: 'F', name: 'Port Bridge', axis: 'z', line: 1056, a0: -578, a1: -438, ramp: 38, y: 7, bridge: true, noTraffic: true },
  { id: 'E', name: 'Northport Bay Bridge', axis: 'x', line: -432, a0: 750, a1: 954, ramp: 54, y: 9, bridge: true },
];
for (const S of SKYWAYS) S.y ??= SKY_Y;
const skyUW = (S, x, z) => S.axis === 'x' ? [x, z - S.line] : [z, x - S.line]; // [along, across]
const skyXZ = (S, u, w) => S.axis === 'x' ? [u, S.line + w] : [S.line + w, u];
function skyProfile(S, u) { const e = Math.min(u - S.a0, S.a1 - u), k = Math.min(1, Math.max(0, e / S.ramp)); return Math.max(0.07, S.y * k * k * (3 - 2 * k)); }
// the skyway surface at (x,z): { y, ramp } (ramps are solid all the way down; the deck only counts if you're up there)
export function skyAt(x, z) {
  let best = null;
  for (const S of SKYWAYS) { const [u, w] = skyUW(S, x, z); if (Math.abs(w) > SKY_HW || u < S.a0 || u > S.a1) continue;
    const y = skyProfile(S, u), ramp = y < S.y - 0.001; if (!best || y > best.y) best = { y, ramp, S }; }
  return best;
}
// surface you'd be standing/driving on at height py (null = the ground)
export function skyY(x, z, py = 0) { const k = skyAt(x, z); if (!k) return null; if (k.ramp) return k.y; return py > k.y - 1.6 ? k.y : null; }
// does a ground street segment (between two junctions) lie under a ramp?
export function rampSeg(axis, line, n1, n2) { const m = (n1 + n2) / 2; for (const S of SKYWAYS) if (S.axis === axis && Math.abs(S.line - line) < 1 && ((m > S.a0 - 6 && m < S.a0 + S.ramp + 6) || (m < S.a1 + 6 && m > S.a1 - S.ramp - 6))) return true; return false; }
export function groundH(x, z) {
  const h = groundH0(x, z); if (h > 0.5) return h;
  const il = isletAt(x, z); return il ? Math.max(h, Math.min(0.5, Math.max(-5, -(il.d + 2) * 0.13))) : h; // little islands dotted round the sea
}
function groundH0(x, z) {
  const s = shoreLine(x) - 22;
  if (z >= s) { const h = Math.max(-5, -(z - s) * 0.08); return x > 700 ? Math.min(h, eastCap(x, z)) : x < -560 ? Math.min(h, westCap(x, z)) : h; } // (the beach stops at Eastport's corner)
  if (x >= -300) { const h = rolling(x, z) + dip(x, z); return x > 440 ? Math.min(h, eastCap(x, z)) : h; }
  let h = rawHills(x, z);
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z);
    if (d < p.r + 18) { const w = Math.min(1, Math.max(0, (d - p.r) / 18)); h = p.h * (1 - w) + h * w; }
  }
  { const c = canyonNear(x, z); if (c && c.d < CR_HW + 12) { const w = sm((c.d - CR_HW - 1) / 11); h = c.h * (1 - w) + h * w; } } // the road is cut level into the hillside
  return x < -560 ? Math.min(h, westCap(x, z)) : h;
}
export const FIELDS = [
  { x0: 312, x1: 432, z0: 30, z1: 300 }, { x0: 312, x1: 432, z0: -262, z1: -30 },
  { x0: 30, x1: 270, z0: -450, z1: -338 }, { x0: -270, x1: -30, z0: -450, z1: -338 },
];
const PIER = { x0: 88, x1: 100, z0: 368, z1: 505 };
export const DOCKS = [{ x0: -242, x1: -237, z0: 418, z1: 486 }, { x0: -272, x1: -242, z0: 448, z1: 452 }, { x0: -237, x1: -207, z0: 466, z1: 470 }, { x0: -272, x1: -242, z0: 478, z1: 482 }]; // Bay Marina

// ---------------- helpers
function hash(x, z, s = 0) { let h = (x * 374761393 + z * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function mkRng(seed) { let s = (Math.floor(seed * 2147483646) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const noise = (x, z) => Math.sin(x * 0.05 + Math.sin(z * 0.031) * 2) * 0.5 + Math.sin(z * 0.043 + x * 0.017) * 0.5;
const inR = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;

// ---------------- roads
export const ROADS = [];
for (const c of CITIES) {
  for (let k = c.kx[0]; k <= c.kx[1]; k++) { const x = c.cx + k * P; ROADS.push({ x0: x - HR, x1: x + HR, z0: c.z0, z1: c.z1, axis: 'z', city: c }); }
  for (let k = c.kz[0]; k <= c.kz[1]; k++) { const z = c.cz + k * P; ROADS.push({ x0: c.x0, x1: c.x1, z0: z - HR, z1: z + HR, axis: 'x', city: c }); }
}
ROADS.push({ x0: -HR, x1: HR, z0: -472, z1: -288, axis: 'z', hwy: true });        // north highway
ROADS.push({ x0: 288, x1: 456, z0: -HR, z1: HR, axis: 'x', hwy: true });            // east highway
ROADS.push({ x0: 288, x1: 760, z0: 336 - HR, z1: 336 + HR, axis: 'x', hwy: true }); // coast road east
ROADS.push({ x0: -340, x1: -288, z0: 336 - HR, z1: 336 + HR, axis: 'x', hwy: true });
ROADS.push({ x0: 600 - HR, x1: 600 + HR, z0: 144, z1: 336, axis: 'z', hwy: true }); // eastport to coast
ROADS.push({ x0: -HR, x1: HR, z0: -620, z1: -568, axis: 'z', hwy: true });         // airport access
ROADS.push({ x0: 1056 - HR, x1: 1056 + HR, z0: -700, z1: -578, axis: 'z', port: true }); // Bay Port: the spine road off the bridge
ROADS.push({ x0: 985, x1: 1135, z0: -700 - HR, z1: -700 + HR, axis: 'x', port: true });  // and the quay road along the berth
ROADS.push({ x0: -540, x1: -288 - HR - 0.2, z0: -3.5, z1: 3.5, axis: 'x', dirt: true }); // forest trail (stops at the city road so the surfaces don't z-fight)
export function roadY(x, z) { return Math.max(groundH(x, z), -6) + 0.1; }
export function roadAt(x, z) { for (const r of ROADS) if (inR(r, x, z)) return r; return null; }
function nearRoad(x, z, m) { for (const r of ROADS) if (inR(r, x, z, m)) return true; const c = canyonNear(x, z); return !!(c && c.d < CR_HW + m); }
export function cityAt(x, z, m = 0) { for (const c of CITIES) if (inR(c, x, z, m)) return c; return null; }

export function zoneName(x, z) {
  if (inR(PORT, x, z, 2)) return 'Bay Port';
  { const il = isletAt(x, z); if (il && il.d < 2) return il.I.light ? 'Lighthouse Isle' : 'Little Isle'; }
  if (x > 760) { const di = isleD(x, z); if (di < 0) return cityAt(x, z, 6) ? 'Long Beach' : 'Long Beach Sands'; if (x > coastX(z) - 8) return 'East Bay'; if (x > coastX(z) - 44 && z < 330) return 'East Shore'; }
  if (riverD(x, z) < RIVER.hw + 6) return 'Bay River';
  if (x < -560) { const tc = cityAt(x, z, 10); if (tc) return tc.name; const wet = groundH0(x, z) < WATER_Y; if (Math.abs(x - redRiverX(z)) < 20 && (wet || x < -880)) return 'Red River'; if (wet) return 'Open Sea'; if (x < coastW(z) + 48) return 'West Beach'; if (z < northZ(x) + 40) return 'North Shore'; if (x < -880) return Math.abs(x - redRiverX(z)) < 46 ? 'Red River Canyon' : 'Red Rock Desert'; return 'Wildwood'; }
  if (z > sandLine(x) - 4) return 'Bay Beach';
  if (x < -300) return 'Hidden Hills';
  if (x > 530 && x < 710 && z > 288 && z < 328) return 'Eastport Docks';
  if (inR(AIRPORT, x, z)) return 'Bay City Airport';
  const c = cityAt(x, z, 10); if (c) return c.name;
  for (const f of FIELDS) if (inR(f, x, z)) return 'Farmland';
  return 'Countryside';
}

// ---------------- ground colour
const C = {
  grass: '#79b257', lawn: '#86ba62', forest: '#4f7b3c', sand: '#ecd59c', wetsand: '#cdb67e', dirt: '#9d7a50',
  fieldA: '#c9b35a', fieldB: '#93b65a', airport: '#8cb868',
};
const colCache = new Map();
function col(hex) { let c = colCache.get(hex); if (!c) { c = new THREE.Color(hex); colCache.set(hex, c); } return c; }
const tmpC = new THREE.Color();
export function groundColor(x, z, out = tmpC) {
  const sl = sandLine(x);
  if (z > sl) { const sh = shoreLine(x); return out.copy(col(C.sand)).lerp(col(C.wetsand), Math.min(1, Math.max(0, (z - (sh - 30)) / 20))); }
  const n = noise(x, z) * 0.06;
  { const il = isletAt(x, z); if (il) return out.copy(col(il.d > -14 ? C.sand : C.lawn)); }
  if (x < -560) { // the far west
    const rr = Math.abs(x - redRiverX(z)), dsr = ss((-860 - x) / 40), cw = coastW(z), nz = northZ(x);
    if (x < cw + 44 || z < nz + 36) return out.copy(col(C.sand)).lerp(col(C.wetsand), Math.min(1, Math.max(0, Math.max((cw + 26 - x) / 14, (nz + 20 - z) / 14))));
    if (rr < 44 && dsr > 0) return out.copy(col(rr < 15 ? '#8a6a4a' : '#b0603a')).lerp(col('#c9774a'), Math.abs(Math.sin(groundH0(x, z) * 0.9)) * 0.5); // canyon walls in red rock bands
    for (const M of MESAS) if (Math.hypot(x - M.x, z - M.z) < M.r + 8) return out.copy(col('#a85a36')).lerp(col('#c46e42'), Math.abs(Math.sin(groundH0(x, z) * 0.7)) * 0.5);
    out.copy(col(C.forest)).lerp(col('#d8a46a'), dsr); out.r *= 1 + n; out.g *= 1 + n; out.b *= 1 + n; return out; }
  if (inR(PORT, x, z)) return out.copy(col('#9a968f')).multiplyScalar(1 + n); // concrete
  if (x > 740) { const di = isleD(x, z), ce = coastX(z); if ((di > -54 && di < 30) || (x > ce - 40 && x < ce + 40)) { const wet = di > -54 && di < 30 ? (di + 28) / 18 : (x - (ce - 14)) / 14; return out.copy(col(C.sand)).lerp(col(C.wetsand), Math.min(1, Math.max(0, wet))); } }
  if (riverD(x, z) < RIVER.hw + 9) return out.copy(col(C.dirt)).lerp(col(C.grass), 0.35);
  if (x < -312) out.copy(col(C.forest));
  else if (inR(AIRPORT, x, z)) out.copy(col(C.airport));
  else if (cityAt(x, z, 4)) out.copy(col(C.lawn));
  else {
    let f = null; for (const r of FIELDS) if (inR(r, x, z)) { f = r; break; }
    if (f) out.copy(col(Math.sin((x - f.x0) * 0.5) > 0 ? C.fieldA : C.fieldB));
    else out.copy(col(C.grass));
  }
  if (z > sl - 12) out.lerp(col(C.sand), (z - (sl - 12)) / 12);
  out.r *= 1 + n; out.g *= 1 + n; out.b *= 1 + n;
  return out;
}

// which detail texture the ground uses here (matches groundColor)
export function groundType(x, z) {
  if (z > sandLine(x) - 6 && x < coastX(z) - 10) return GT.sand;
  if (isletAt(x, z)) return GT.sand;
  if (x < -560) { if (x < coastW(z) + 44 || z < northZ(x) + 36) return GT.sand; if (Math.abs(x - redRiverX(z)) < 44 && x < -860) return GT.dirt; return x < -880 ? GT.sand : GT.forest; }
  if (inR(PORT, x, z)) return GT.pave;
  if (x > 740) { const di = isleD(x, z), ce = coastX(z); if ((di > -54 && di < 30) || (x > ce - 40 && x < ce + 40)) return GT.sand; }
  if (x < -312) return GT.forest;
  if (inR(AIRPORT, x, z)) return GT.grass;
  if (cityAt(x, z, 4)) return GT.grass;
  for (const r of FIELDS) if (inR(r, x, z)) return GT.crops;
  return GT.grass;
}
// ---------------- world data
const chunks = new Map();     // key -> { objs: [] }
const colGrid = new Map();    // key -> colliders
const ckey = (cx, cz) => cx + ',' + cz;
function chunkOf(x, z) { return [Math.floor(x / CHUNK), Math.floor(z / CHUNK)]; }
function addObj(o) {
  const [cx, cz] = chunkOf(o.x, o.z); const k = ckey(cx, cz);
  let c = chunks.get(k); if (!c) chunks.set(k, c = { objs: [] });
  c.objs.push(o);
}
const CG = 32;
export function addCollider(c) { // {x0,z0,x1,z1,h} or {x,z,r}
  const x0 = c.r ? c.x - c.r : c.x0, x1 = c.r ? c.x + c.r : c.x1, z0 = c.r ? c.z - c.r : c.z0, z1 = c.r ? c.z + c.r : c.z1;
  for (let i = Math.floor(x0 / CG); i <= Math.floor(x1 / CG); i++) for (let j = Math.floor(z0 / CG); j <= Math.floor(z1 / CG); j++) {
    const k = i + ',' + j; let a = colGrid.get(k); if (!a) colGrid.set(k, a = []); a.push(c);
  }
}
export function removeCollider(c) {
  for (const a of colGrid.values()) { const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); }
}
export function collidersNear(x, z) { return colGrid.get(Math.floor(x / CG) + ',' + Math.floor(z / CG)) || []; }

const PAL = {
  downtown: ['#c9c2b8', '#9fb0c4', '#8a8f99', '#d8cfc0', '#6f7f94', '#b8a48c', '#a3b8b0', '#5f6b7a', '#e2ddd3'],
  mid: ['#b5654a', '#c98b5e', '#d9c2a0', '#8c6a5a', '#c4b6a6', '#7d8a96', '#a65d4e', '#e0d2b8'],
  beach: ['#f6d1c1', '#bfe3e0', '#f9e7a8', '#f2b8c6', '#c9e4b4', '#ffffff', '#ffd6a5'],
  house: ['#f6d1c1', '#bfe3e0', '#f9e7a8', '#f2b8c6', '#c9e4b4', '#ffffff', '#d7c4e8', '#ffd6a5', '#b9d3f0'],
  roof: ['#a8432f', '#5a4a42', '#3e5a7a', '#6b3e2e', '#4a5a3a', '#7a6a60'],
};
export const PARKED = []; // {x,z,rot,seed}
export const LAMPS = [];
export const LADDERS = []; // {x,z,top,nx,nz} climbable ladders on building walls
// highest roof you can stand on at (x,z) given your current height y
export const STAIRS = []; // fire-escape flights: { x0, x1, z0, z1, y0, y1 } rising along z from z0 (y0) to z1 (y1) or reversed
export function roofAt(x, z, y) {
  let t = -99; for (const c of collidersNear(x, z)) if (c.top && !c.r && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y >= c.top - 0.6 && c.top > t) t = c.top;
  { const U = UNDERPASS; if (Math.abs(x - U.x) < U.half + 3 && Math.abs(z - U.z) < 3.4 && y >= -0.6) t = Math.max(t, 0.17); } // walking over the rail bridge
  { const k = skyAt(x, z); if (k && (k.ramp || y >= k.y - 0.75) && k.y > t) t = k.y; } // up on a skyway
  for (const S of STAIRS) if (x > S.x0 && x < S.x1 && z > S.zmin - 0.2 && z < S.zmax + 0.2) { const k = Math.min(1, Math.max(0, (z - S.z0) / (S.z1 - S.z0))), sy = S.y0 + (S.y1 - S.y0) * k; if (y >= sy - 0.75 && sy > t) t = sy; }
  return t;
}
export function wallTop(x, z) { for (const c of collidersNear(x, z)) if (c.top && !c.r && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return c.top; return null; }

function building(x, z, w, d, h, color, opts = {}) {
  const o = { t: 'bld', x, z, w, d, h, col: color, ...opts }; addObj(o);
  o.cc = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h: h + (opts.roofH || 0), top: 0.15 + (opts.y || 0) + h + (opts.roof === 'pitch' ? (opts.roofH || 2) * 0.55 : opts.glass ? 0 : 0.5) }; addCollider(o.cc);
  if (!opts.roof && !opts.glass && !opts.y && h < 34 && w > 8 && d > 8 && hash(x | 0, z | 0, 77) < 0.35) { // fire-escape ladder on the back
    const L = { x: x + w * 0.3, z: z - d / 2 - 0.25, top: o.cc.top, nx: 0, nz: -1 }; LADDERS.push(L); addObj({ t: 'ladder', x: L.x, z: L.z, top: L.top });
  } else if (!opts.roof && !opts.glass && !opts.y && h < 24 && h > 5 && d > 11 && w > 8 && hash(x | 0, z | 0, 91) < 0.3) { // zig-zag fire-escape stairs up the side to the roof
    const top = o.cc.top, n = Math.max(2, Math.round(top / 3.6)), hs = top / n, X0 = x + w / 2, Lf = Math.min(d - 4.4, 6.5), zs = z - Lf / 2, fl = [];
    for (let k = 0; k < n; k++) {
      const up = k % 2 === 0, za = up ? zs : zs + Lf, zb = up ? zs + Lf : zs, S = { x0: X0 + 0.05, x1: X0 + 1.5, z0: za, z1: zb, zmin: Math.min(za, zb), zmax: Math.max(za, zb), y0: 0.17 + k * hs, y1: 0.17 + (k + 1) * hs };
      STAIRS.push(S); fl.push(S);
      if (k < n - 1) { const lz0 = up ? zs + Lf : zs - 1.5, land = { x0: X0 + 0.05, x1: X0 + 1.5, z0: lz0, z1: lz0 + 1.5, h: S.y1 - 0.5, top: S.y1 }; addCollider(land); fl.push({ land: true, ...land }); }
    }
    addObj({ t: 'fstairs', x: X0 + 0.8, z, fl });
  }
  return o;
  return o;
}
function removeObj(o) { const c = chunks.get(ckey(...chunkOf(o.x, o.z))); if (c) { const i = c.objs.indexOf(o); if (i >= 0) c.objs.splice(i, 1); } }
export function objsNear(x0, z0, x1, z1) { const out = []; for (let i = Math.floor(x0 / CHUNK); i <= Math.floor(x1 / CHUNK); i++) for (let j = Math.floor(z0 / CHUNK); j <= Math.floor(z1 / CHUNK); j++) for (const o of chunks.get(ckey(i, j))?.objs || []) if (o.x >= x0 && o.x <= x1 && o.z >= z0 && o.z <= z1) out.push(o); return out; }
// remove trees / parked cars / benches inside a world rect (so a shop or doorway isn't blocked)
function clearRect(x0, z0, x1, z1) {
  for (const o of objsNear(x0 - 1, z0 - 1, x1 + 1, z1 + 1)) {
    if (!['tree', 'parked', 'bench'].includes(o.t) || o.x < x0 || o.x > x1 || o.z < z0 || o.z > z1) continue;
    removeObj(o);
    if (o.t === 'parked') { removeCollider(o.col); const i = PARKED.indexOf(o); if (i >= 0) PARKED.splice(i, 1); }
    if (o.t === 'tree') for (const c of collidersNear(o.x, o.z).slice()) if (c.r && Math.abs(c.x - o.x) < 0.01 && Math.abs(c.z - o.z) < 0.01) removeCollider(c);
  }
}
// Places out in the open (beach, pier, chop shop...) get a proper structure built behind their marker.
export function addStructure(p) {
  const S = { gas1: [14, 11], gas2: [14, 11], gas3: [14, 11], gas4: [14, 11], gas5: [14, 11], p_islevilla: [13, 10], wash1: [12, 9], g_taco: [9, 5], g_gallery: [7, 3], g_surf: [7, 5], g_gym: [14, 9], g_hoops: [15, 26], v_anchor: [12, 9], p_shack: [6, 5], p_beach: [13, 10], chop: [16, 12], race: [16, 2] }[p.id];
  if (!S) return;
  const [w, d] = S, y = p.id === 'g_gallery' ? 0.28 : 0; let cx = p.x, cz = p.z - d / 2 - (p.id === 'race' ? 0 : 2.4);
  // never build on a road: slide the footprint off any road it overlaps
  for (let k = 0; k < 60 && p.id !== 'race'; k++) { // (the race gantry belongs over the road)
    const r = ROADS.find(q => cx + w / 2 > q.x0 && cx - w / 2 < q.x1 && cz + d / 2 > q.z0 && cz - d / 2 < q.z1); if (!r) break;
    if (r.axis === 'x') cz += cz >= (r.z0 + r.z1) / 2 ? 0.5 : -0.5; else cx += cx >= (r.x0 + r.x1) / 2 ? 0.5 : -0.5;
  }
  if (cx !== p.x) p.x = cx; // keep the marker with the structure if it had to move
  if (p.kind === 'service') { p.x = cx; p.z = cz + (p.id.startsWith('gas') ? 1 : 0); } // repair ring sits between the pumps / inside the wash bay
  clearRect(cx - w / 2 - 1, cz - d / 2 - 1, cx + w / 2 + 1, cz + d / 2 + 1);
  for (const o of objsNear(cx - w / 2 - 16, cz - d / 2 - 16, cx + w / 2 + 16, cz + d / 2 + 16)) // knock down anything built where this goes
    if (o.t === 'bld' && !o.y && Math.abs(o.x - cx) < (o.w + w) / 2 && Math.abs(o.z - cz) < (o.d + d) / 2) { removeObj(o); if (o.cc) removeCollider(o.cc); }
  addObj({ t: 'struct', s: p.id.startsWith('gas') ? 'gas' : p.id === 'p_islevilla' ? 'p_beach' : p.id, x: cx, z: cz, w, d, y });
  const col = (x0, z0, x1, z1, h = 4) => addCollider({ x0: cx + x0, z0: cz + z0, x1: cx + x1, z1: cz + z1, h });
  switch (p.id) {
    case 'g_taco': col(-3.6, -1.4, 3.6, 1.4, 3); break;
    case 'g_gallery': col(-3.5, -1.5, 3.5, 1.5, 3); break;
    case 'g_surf': col(-2.2, -2.5, 2.2, 1.0, 3); break;
    case 'v_anchor': col(-6, -4.5, 6, 2.5, 5); break;
    case 'p_shack': col(-3, -2.5, 3, 2.5, 4); break;
    case 'gas1': case 'gas2': case 'gas3': case 'gas4': case 'gas5': col(-6.5, -5.5, 6.5, -2.5, 4); for (const x of [-3, 3]) col(x - 0.5, -0.4, x + 0.5, 0.4, 2); break;
    case 'wash1': col(-6, -4.5, -2.6, 4.5, 4); col(2.6, -4.5, 6, 4.5, 4); break;
    case 'p_beach': case 'p_islevilla': col(-6.5, -5, 6.5, 3, 7); break;
    case 'chop': col(-8, -6, 8, 6, 6); break;
    case 'g_gym': col(-6.6, -4, -5.8, -3.2, 3); col(5.8, -4, 6.6, -3.2, 3); break;
    case 'race': col(-8.3, -0.3, -7.5, 0.3, 6); col(7.5, -0.3, 8.3, 0.3, 6); break;
  }
}
function drawStruct(o, B) {
  const X = o.x, Z = o.z, Y = o.y || 0, b = (x, y, z, w, h, d, c, opt) => B.box(X + x, Y + y, Z + z, w, h, d, c, opt);
  switch (o.s) {
    case 'g_taco': { // food truck + picnic tables
      b(-0.6, 0.55, 0, 6, 2.5, 2.6, '#ffffff'); b(-0.6, 1.0, 1.31, 6, 0.35, 0.02, '#ff8a2a'); b(3.2, 0.55, 0, 1.8, 1.9, 2.5, '#ff8a2a'); b(3.6, 1.6, 0, 0.9, 0.7, 2.4, '#2a3442');
      b(-0.8, 1.4, 1.32, 3.2, 1.1, 0.04, '#2a2a30', { key: 'glow' }); b(-0.8, 2.55, 1.9, 3.6, 0.1, 1.3, '#e23b3b'); b(-0.8, 1.32, 1.6, 3.2, 0.1, 0.6, '#c9ccd2');
      b(-0.6, 3.05, 0, 3, 0.7, 0.3, '#ffd23f', { key: 'sign' });
      for (const [x, z] of [[-2.4, -1.3], [-2.4, 1.3], [2.6, -1.3], [2.6, 1.3]]) b(x, 0, z, 0.7, 0.55, 0.3, '#16161a');
      for (const tx of [-6, 6]) { b(tx, 0, 1.2, 1.8, 0.75, 0.9, '#8a5a35'); b(tx, 0, 0.4, 1.8, 0.45, 0.35, '#8a5a35'); b(tx, 0, 2.0, 1.8, 0.45, 0.35, '#8a5a35'); B.box(X + tx, Y, Z + 1.2, 0.08, 2.4, 0.08, '#ddd'); B.cone(X + tx, Y + 2.2, Z + 1.2, 1.5, 0.6, tx < 0 ? '#e23b3b' : '#ffd23f', 8); }
      break; }
    case 'g_gallery': { // carnival booth
      b(0, 0, 0.9, 7, 1.1, 0.8, '#e23b3b'); b(0, 0, -1.3, 7, 3.2, 0.3, '#2f80ed'); for (const x of [-3.4, 3.4]) b(x, 0, -0.2, 0.25, 3.4, 2.6, '#ffd23f');
      for (let i = 0; i < 7; i++) b(-3 + i, 3.4, -0.2, 1, 0.3, 2.8, i % 2 ? '#ffffff' : '#e23b3b');
      for (let i = 0; i < 5; i++) { B.cyl(X - 2.4 + i * 1.2, Y + 1.5 + (i % 2) * 0.7, Z - 1.1, 0.35, 0.08, '#ffffff', 10); B.cyl(X - 2.4 + i * 1.2, Y + 1.5 + (i % 2) * 0.7, Z - 1.05, 0.2, 0.09, '#e23b3b', 10); }
      b(0, 3.7, -0.2, 3.4, 0.7, 0.2, '#ffd23f', { key: 'sign' }); break; }
    case 'g_surf': { // surf shack + board rack
      b(0, 0, -1, 4, 2.8, 3, '#1fb5a8'); B.prism(X, Y + 2.8, Z - 1, 4.6, 1.2, 3.6, '#f2d0a0'); b(0, 0, 0.55, 1.2, 2, 0.06, '#6b4a33');
      b(0, 2.9, 0.6, 3, 0.6, 0.15, '#ffffff', { key: 'sign' });
      const cols = ['#ff6fb5', '#ffd23f', '#2f80ed', '#ff8a2a', '#4cd964'];
      for (let i = 0; i < 5; i++) b(2.6 + (i % 3) * 0.55, 0, -0.4 + Math.floor(i / 3) * 1.3, 0.12, 2.4, 0.55, cols[i]);
      b(-2.9, 0, 1.4, 0.1, 4, 0.1, '#ddd'); b(-2.6, 3.4, 1.4, 0.6, 0.4, 0.04, '#e23b3b'); break; }
    case 'g_gym': { // Muscle Beach outdoor gym
      b(0, 0, 0, 14, 0.12, 9, '#3a3d45'); for (const x of [-6.2, 6.2]) b(x, 0.12, -3.6, 0.3, 3, 0.3, '#c9ccd2'); b(0, 3, -3.6, 12.8, 0.4, 0.4, '#ffd23f', { key: 'sign' });
      for (const x of [-3, 3]) { b(x, 0.12, -0.5, 0.6, 0.5, 1.6, '#16161b'); b(x, 1.1, -0.9, 2, 0.08, 0.08, '#9aa0aa'); b(x - 0.95, 0.9, -0.9, 0.12, 0.45, 0.45, '#16161b'); b(x + 0.95, 0.9, -0.9, 0.12, 0.45, 0.45, '#16161b'); for (const sx of [-0.3, 0.3]) b(x + sx, 0.12, -1.2, 0.08, 1.1, 0.08, '#9aa0aa'); }
      b(0, 0.12, 2.6, 4, 0.6, 0.6, '#5a5a62'); for (let i = 0; i < 6; i++) b(-1.6 + i * 0.64, 0.72, 2.6, 0.3, 0.2, 0.2, '#16161b');
      for (const x of [-5.5, 5.5]) { b(x, 0.12, 2.2, 0.2, 2.6, 0.2, '#c9ccd2'); b(x + (x < 0 ? 0.9 : -0.9), 0.12, 2.2, 0.2, 2.6, 0.2, '#c9ccd2'); b(x + (x < 0 ? 0.45 : -0.45), 2.6, 2.2, 1.1, 0.1, 0.1, '#c9ccd2'); }
      break; }
    case 'g_hoops': { // basketball court
      b(0, 0, 0, 15, 0.1, 26, '#c8693a'); b(0, 0.1, 0, 13.6, 0.02, 24.6, '#2f6fae'); b(0, 0.12, 0, 13.6, 0.02, 0.15, '#ffffff');
      for (const s2 of [-1, 1]) { b(0, 0.12, s2 * 9.6, 4.8, 0.02, 5, '#c8693a'); b(0, 0.12, s2 * 12.2, 0.2, 3.8, 0.4, '#3a3d45'); b(0, 3.9, s2 * 11.95, 1.9, 1.2, 0.08, '#ffffff'); for (const [ox, oz, ww, dd] of [[0, -0.25, 0.5, 0.05], [0, 0.25, 0.5, 0.05], [-0.25, 0, 0.05, 0.5], [0.25, 0, 0.05, 0.5]]) b(ox, 3.6, s2 * 11.5 + oz, ww, 0.05, dd, '#ff8a2a'); }
      B.cyl(X, Y + 0.13, Z, 2, 0.02, '#ffffff', 16); B.cyl(X, Y + 0.14, Z, 1.85, 0.02, '#2f6fae', 16);
      for (const x of [-7.6, 7.6]) b(x, 0, 0, 0.1, 3, 26, '#9aa0aa'); break; }
    case 'v_anchor': { // beach bar with deck
      b(0, 0, -1, 12, 4.2, 7, '#2f4f6f'); b(0, 4.2, -1, 12.6, 0.4, 7.6, '#e8e2d6'); b(0, 0, 3.3, 13, 0.3, 2.4, '#8a5a35');
      b(0, 2.9, 2.7, 9, 0.12, 1.6, '#ffffff'); b(0, 0.3, 2.6, 2.6, 2.4, 0.1, '#33475a', { key: 'glow' }); b(0, 3.3, 2.56, 4, 0.8, 0.12, '#1fb5a8', { key: 'sign' });
      for (const x of [-4.5, 4.5]) { b(x, 1.3, 2.56, 2.2, 1.2, 0.1, '#ffcf8a', { key: 'glow' }); B.cyl(X + x, Y + 0.3, Z + 3.9, 0.35, 0.9, '#6b4a33', 8); }
      B.cyl(X - 5.2, Y + 4.6, Z - 1, 0.12, 2.2, '#ddd', 6); b(-5.2, 6.3, -1, 1.4, 0.12, 0.12, '#ddd'); break; }
    case 'p_shack': { // little wooden pier shack
      b(0, 0, 0, 6, 0.3, 5, '#8a6a45'); b(0, 0.3, -0.3, 4.6, 2.8, 3.6, '#c9a26a'); B.prism(X, Y + 3.1, Z - 0.3, 5.2, 1.4, 4.2, '#6b4a33');
      b(0, 0.3, 1.52, 1.1, 2.1, 0.06, '#5a3d28'); b(1.5, 1.4, 1.52, 1, 0.8, 0.05, '#33475a', { key: 'glow' }); b(-1.5, 1.4, 1.52, 1, 0.8, 0.05, '#33475a', { key: 'glow' }); break; }
    case 'p_beach': { // Malibay beach house on stilts
      for (const x of [-5.5, 5.5]) for (const z of [-4, 2]) b(x, 0, z, 0.4, 1.2, 0.4, '#e8e2d6');
      b(0, 1.2, -1, 12, 0.3, 8, '#e8e2d6'); b(0, 1.5, -1.5, 10, 3.6, 6, '#ffffff', { sideKey: 'win', uv: true, topCol: '#ffffff' }); b(0, 5.1, -1.5, 11, 0.4, 7, '#2f80ed');
      b(0, 1.5, 2.6, 12, 0.1, 2.2, '#c9a26a'); for (let i = 0; i < 5; i++) b(-1 + i * 0.5, 0, 4.2 - i * 0.0, 2.2, 0.25, 0.4, '#c9a26a');
      b(4, 1.6, 2.8, 0.1, 1.2, 0.1, '#ddd'); B.cone(X + 4, Y + 2.6, Z + 2.8, 1.4, 0.6, '#ff6fb5', 8); break; }
    case 'chop': { // Lucky's Chop Shop
      b(0, 0, 0, 16, 5.5, 12, '#7a7d84'); for (let i = 0; i < 16; i++) b(-7.5 + i, 0, 6.02, 0.06, 5.5, 0.04, '#6a6d74');
      b(-3, 0, 6.05, 6, 4, 0.1, '#3a3d45'); for (let i = 0; i < 8; i++) b(-3, 0.25 + i * 0.5, 6.1, 6, 0.06, 0.04, '#2a2a30');
      b(4.5, 0, 6.05, 1.2, 2.2, 0.1, '#5a3d28'); b(0, 4.6, 6.15, 7, 0.8, 0.2, '#ff8a2a', { key: 'sign' });
      for (const [x, z, r] of [[5, 8.5, 0.2], [-6, 8, -0.3]]) b(x, 0, z, 0.8, 0.8, 0.8, '#16161a'); break; }
    case 'gas': { // fuel station: canopy, pumps, little shop
      b(0, 0, 0, 14, 0.08, 11, '#c9c4bc'); for (const [x, z] of [[-5.5, -1.5], [5.5, -1.5], [-5.5, 3.5], [5.5, 3.5]]) b(x, 0, z, 0.35, 4.4, 0.35, '#e8e8e8');
      b(0, 4.4, 1, 13, 0.6, 7, '#e8e8e8'); b(0, 4.45, 4.52, 13, 0.5, 0.05, '#e23b3b', { key: 'sign' }); b(0, 4.2, 1, 12, 0.08, 6.4, '#fff6d8', { key: 'glow' });
      for (const x of [-3, 3]) { b(x, 0, 0, 1, 0.25, 0.8, '#9aa0aa'); b(x, 0.25, 0, 0.7, 1.5, 0.5, '#e23b3b'); b(x, 1.3, 0.26, 0.5, 0.3, 0.02, '#16161a', { key: 'glow' }); }
      b(0, 0, -4, 13, 3.6, 3, '#f2efe8'); b(0, 0.4, -2.48, 8, 2.4, 0.05, '#33475a', { key: 'glow' }); b(0, 3.6, -4, 13.4, 0.4, 3.4, '#e23b3b');
      B.box(X + 6.4, Y, Z + 5.2, 0.25, 6, 0.25, '#9aa0aa'); b(6.4, 6, 5.2, 2, 2, 0.3, '#e23b3b', { key: 'sign' }); break; }
    case 'wash1': { // drive-through car wash
      b(0, 0, 0, 12, 0.08, 9, '#8fa4b8'); for (const x of [-4.3, 4.3]) b(x, 0, 0, 3.4, 4, 9, '#2f80ed'); b(0, 4, 0, 12, 0.6, 9, '#ffffff');
      for (const x of [-2.2, 2.2]) for (const z of [-2.5, 0, 2.5]) B.cyl(X + x, Y + 0.2, Z + z, 0.45, 3.2, ['#38e8ff', '#ff6fb5', '#ffd23f'][Math.abs(z * 2) % 3 | 0], 8);
      b(0, 4.6, 4.55, 7, 1, 0.2, '#38e8ff', { key: 'sign' }); break; }
    case 'race': { // start/finish gantry + checkered line
      for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) B.flat(X - 7.5 + i, Y + 0.08, Z - 0.5 + j, 1, 1, (i + j) % 2 ? '#111111' : '#ffffff');
      for (const x of [-7.9, 7.9]) b(x, 0, 0, 0.6, 6, 0.6, '#c9ccd2'); b(0, 5.4, 0, 16.4, 1.2, 0.5, '#e23b3b', { key: 'sign' });
      for (let i = 0; i < 12; i++) b(-6.6 + i * 1.2, 5.45, 0.27, 0.6, 0.55, 0.02, i % 2 ? '#111111' : '#ffffff', { key: 'sign' }); // checkered banner
      for (const [ly, lc] of [[4.6, '#ff2a2a'], [4.2, '#ffd23f'], [3.8, '#2aff6a']]) for (const x of [-2.2, -1.4, 1.4, 2.2]) b(x, ly, 0.3, 0.32, 0.32, 0.1, lc, { key: 'glow' }); // start lights
      b(0, 3.65, 0.26, 5.2, 1.25, 0.12, '#16161b');
      for (const s2 of [-1, 1]) { for (let i = 0; i < 4; i++) { b(s2 * 9.6, 0, -3 + i * 3, 0.4, 0.7, 0.4, '#ff6a1a'); b(s2 * 9.6, 0.7, -3 + i * 3, 0.24, 0.1, 0.24, '#ffffff'); } // cones
        for (let i = 0; i < 3; i++) B.cyl(X + s2 * 10.6, Y + i * 0.32, Z + 4, 0.45, 0.3, '#16161b', 10); // tyre stack
        b(s2 * 10.6, 0, -4.5, 0.08, 3.4, 0.08, '#c9ccd2'); b(s2 * 10.9, 2.6, -4.5, 0.6, 0.9, 0.04, s2 < 0 ? '#38e8ff' : '#ff3b8a', { key: 'glow' }); } // flags
      break; }
  }
}
// Put a real front door on the building facing a place's sidewalk, and move the place marker to stand in front of it.
const SIDE_N = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
export function attachDoor(p, accent = '#ff8a2a', sign = null, build = null) {
  const dd = p.door; if (!dd || !SIDE_N[dd.side]) return;
  const [nx, nz] = SIDE_N[dd.side], tx = -nz, tz = nx, cx = dd.cx, cz = dd.cz;
  const lat = (x, z) => (x - cx) * tx + (z - cz) * tz, fw = (x, z) => (x - cx) * nx + (z - cz) * nz;
  const pl = lat(p.x, p.z);
  let best = null, bs = -1e9;
  if (build === 'church') { // clear the block and put up a chapel with a bell tower facing the street
    for (const o of objsNear(cx - 18, cz - 18, cx + 18, cz + 18)) if (o.t === 'bld' && !o.y) { removeObj(o); removeCollider(o.cc); }
    clearRect(cx - 18, cz - 18, cx + 18, cz + 18);
    const nave = 14.6 - 13, bx = cx + nx * nave, bz = cz + nz * nave;
    building(bx, bz, nx ? 26 : 14, nx ? 14 : 26, 8, '#ece4d0', { roof: 'pitch', roofH: 5, roofCol: '#6b3e2e', plain: true });
    const tw = cx + nx * 12.1, tz2 = cz + nz * 12.1;
    building(tw, tz2, 5, 5, 17, '#e4dac2', { roof: 'pitch', roofH: 5, roofCol: '#6b3e2e', plain: true });
    addObj({ t: 'cross', x: tw + nx * 2.6, z: tz2 + nz * 2.6, nx, nz });
    for (const k of [-1, 1]) tree(cx + nx * 16 + tx * 6 * k, cz + nz * 16 + tz * 6 * k, 'round', 0.8);
    best = { front: 14.6, l0: -2.5, l1: 2.5 }; p.x = cx + nx * 16.6; p.z = cz + nz * 16.6;
  }
  if (!best) for (const o of objsNear(cx - 18, cz - 18, cx + 18, cz + 18)) {
    if (o.t !== 'bld' || o.y || o.glass) continue;
    const hn = nx ? o.w / 2 : o.d / 2, hl = nx ? o.d / 2 : o.w / 2;
    const front = fw(o.x, o.z) + hn, l0 = lat(o.x, o.z) - hl, l1 = lat(o.x, o.z) + hl;
    if (l1 - l0 < 4.5 || front < 5) continue;
    const sc = front - Math.max(0, l0 - pl, pl - l1) * 0.8;
    if (sc > bs) { bs = sc; best = { front, l0, l1, col: o.col }; }
  }
  if (!best) { // empty lot (park / parking): build a small shop
    const L = Math.max(-10, Math.min(10, pl)), fc = 14.6 - 5.5, bx = cx + nx * fc + tx * L, bz = cz + nz * fc + tz * L;
    const w = nx ? 11 : 14, d = nx ? 14 : 11;
    clearRect(bx - w / 2 - 0.5, bz - d / 2 - 0.5, bx + w / 2 + 0.5, bz + d / 2 + 0.5);
    building(bx, bz, w, d, 6.5, '#ece4d6', { top: 'ac' });
    best = { front: 14.6, l0: L - 7, l1: L + 7 };
  }
  const dl = Math.max(best.l0 + 1.8, Math.min(best.l1 - 1.8, pl)), f = best.front;
  const P = (a, b) => ({ x: cx + nx * a + tx * b, z: cz + nz * a + tz * b });
  const q0 = P(f + 0.1, dl - 1.8), q1 = P(17.5, dl + 1.8);
  clearRect(Math.min(q0.x, q1.x), Math.min(q0.z, q1.z), Math.max(q0.x, q1.x), Math.max(q0.z, q1.z));
  const dp = P(f, dl); addObj({ t: 'door', x: dp.x, z: dp.z, nx, nz, col: accent, sign, wall: best.col || '#ece4d6' });
  const m = P(f + 2.1, dl); p.x = m.x; p.z = m.z; p.doorN = [nx, nz];
}
function tree(x, z, kind = 'round', s = 1) { if (x > 528 && x < 712 && z > 286 && z < 328) return; /* not in the docks */ addObj({ t: 'tree', x, z, kind, s }); addCollider({ x, z, r: 0.45 * s }); }

// landmark blocks: the stadium, the mall and Bay Park take over whole downtown blocks
export const LANDMARK_BLOCKS = { stadium: ['main', 5, -4], mall: ['main', -4, -3], bigpark: ['main', -2, -4] };
function genBlock(city, bx0, bz0, r, bi, bj) {
  const cx = bx0 + 18, cz = bz0 + 18; // block 36x36
  addObj({ t: 'slab', x: cx, z: cz, w: 36, d: 36, h: 0.15, col: '#bdb6aa' });
  const lx = cx, lz = cz, L = 30;
  const dCenter = Math.hypot(cx - city.cx, cz - city.cz);
  let type;
  const lm = Object.entries(LANDMARK_BLOCKS).find(([, [c, i, j]]) => c === city.id && i === bi && j === bj)?.[0];
  if (lm === 'stadium') { // Bay Stadium: stands on four sides, a pitch, floodlights; the way in is on the south side
    addObj({ t: 'stadium', x: lx, z: lz });
    for (const [x0, z0, x1, z1] of [[-16, -16, 16, -11], [-16, -11, -11, 16], [11, -11, 16, 16], [-11, 11, -3, 16], [3, 11, 11, 16]]) addCollider({ x0: lx + x0, z0: lz + z0, x1: lx + x1, z1: lz + z1, h: 9 });
    return;
  }
  if (lm === 'mall') { building(lx, lz - 1, 32, 28, 11, '#dfe4ea', { glass: true, top: 'ac' }); addObj({ t: 'mallsign', x: lx, z: lz + 13.1 }); return; }
  if (lm === 'bigpark') { // Bay Park: lawn, a jogging loop, a pond, lots of trees and benches
    addObj({ t: 'slab', x: lx, z: lz, w: L + 4, d: L + 4, h: 0.2, col: '#78b858' });
    addObj({ t: 'ring', x: lx, z: lz, r: 13 });
    addObj({ t: 'pond', x: lx, z: lz }); addCollider({ x: lx, z: lz, r: 5.2 });
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + r() * 0.2, d = i % 2 ? 9 : 15.5; const tx = lx + Math.cos(a) * d, tz = lz + Math.sin(a) * d; if (Math.abs(Math.hypot(tx - lx, tz - lz) - 13) < 1.6) continue; tree(tx, tz, r() < 0.35 ? 'pine' : 'round', 0.9 + r() * 0.6); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; addObj({ t: 'bench', x: lx + Math.cos(a) * 11, z: lz + Math.sin(a) * 11, rot: (i % 3 ? 1 : 0) }); }
    return;
  }
  if (city.id === 'main' && cz > 280) type = r() < 0.75 ? 'beach' : 'park';
  else if (city.style === 'downtown') type = r() < 0.1 ? 'park' : r() < 0.08 ? 'parking' : dCenter < 110 ? 'tower' : dCenter < 210 ? 'mid' : r() < 0.4 ? 'house' : 'mid';
  else if (city.style === 'strip') type = bi === -1 && bj === 0 ? 'park' : 'casino';
  else if (city.style === 'island') { // Long Beach: hotels and beach bars on the outside blocks facing the sand, glass towers up the middle
    const edge = bi === city.kx[0] || bi === city.kx[1] - 1 || bj === city.kz[0] || bj === city.kz[1] - 1;
    type = edge ? (r() < 0.82 ? 'resort' : 'park') : r() < 0.07 ? 'park' : 'sky'; }
  else if (city.style === 'nport') type = r() < 0.12 ? 'park' : r() < 0.08 ? 'parking' : bj >= city.kz[1] - 2 ? (r() < 0.6 ? 'mid' : 'house') : dCenter < 90 ? 'tower' : r() < 0.35 ? 'house' : 'mid'; // Northport: a little skyline in the middle, terraces by the river
  else if (city.style === 'suburb') type = r() < 0.14 ? 'park' : dCenter < 60 ? 'mid' : r() < 0.1 ? 'parking' : 'house';
  else type = r() < 0.15 ? 'park' : r() < 0.1 ? 'parking' : 'mid';

  if (type === 'park') {
    addObj({ t: 'slab', x: lx, z: lz, w: L + 2, d: L + 2, h: 0.2, col: '#7dbb5a' });
    addObj({ t: 'slab', x: lx, z: lz, w: 3, d: L + 2, h: 0.22, col: '#d9cfb5' });
    addObj({ t: 'slab', x: lx, z: lz, w: L + 2, d: 3, h: 0.22, col: '#d9cfb5' });
    addObj({ t: 'fountain', x: lx, z: lz }); addCollider({ x: lx, z: lz, r: 3.2 });
    for (let i = 0; i < 10; i++) {
      const a = r() * Math.PI * 2, d = 7 + r() * 6;
      const tx = lx + Math.cos(a) * d, tz = lz + Math.sin(a) * d;
      if (Math.abs(tx - lx) < 2.5 || Math.abs(tz - lz) < 2.5) continue;
      tree(tx, tz, r() < 0.3 ? 'pine' : 'round', 0.8 + r() * 0.5);
    }
    for (const [bx, bz, rot] of [[lx + 4.5, lz + 8, 0], [lx - 4.5, lz - 8, 0], [lx + 8, lz - 4.5, 1], [lx - 8, lz + 4.5, 1]]) addObj({ t: 'bench', x: bx, z: bz, rot });
    return;
  }
  if (type === 'parking') {
    addObj({ t: 'slab', x: lx, z: lz, w: L + 2, d: L + 2, h: 0.17, col: '#4a4a52' });
    for (let i = 0; i < 8; i++) {
      const px = lx - 12.6 + i * 3.6;
      for (const sz of [-1, 1]) {
        addObj({ t: 'paint', x: px - 1.8, z: lz + sz * 9, w: 0.15, d: 5, col: '#e8e8e8' });
        if (r() < 0.55) { const car = { t: 'parked', x: px, z: lz + sz * 9, rot: sz > 0 ? 0 : Math.PI, seed: r() }; car.col = { x0: px - 1.1, x1: px + 1.1, z0: car.z - 2.4, z1: car.z + 2.4, h: 1.5 }; PARKED.push(car); addObj(car); addCollider(car.col); }
      }
    }
    return;
  }
  if (type === 'house') {
    for (const [ox, oz] of [[-7.5, -7.5], [7.5, -7.5], [-7.5, 7.5], [7.5, 7.5]]) {
      const px = lx + ox, pz = lz + oz;
      addObj({ t: 'slab', x: px, z: pz, w: 14.6, d: 14.6, h: 0.2, col: r() < 0.5 ? '#8cc46a' : '#7fb85e' });
      const hw = 7 + r() * 2.5, hd = 6 + r() * 2;
      const hx = px + (r() - 0.5) * 2, hz = pz + (r() - 0.5) * 2;
      building(hx, hz, hw, hd, 3.2 + r() * 2.5, PAL.house[Math.floor(r() * PAL.house.length)], { roof: 'pitch', roofH: 2.4, roofCol: PAL.roof[Math.floor(r() * PAL.roof.length)], door: true });
      if (r() < 0.7) { const a = r() * Math.PI * 2; tree(px + Math.cos(a) * 6, pz + Math.sin(a) * 6, 'round', 0.7 + r() * 0.4); }
      // gardens: a hedge along the back, bushes and flower beds in the corners
      if (r() < 0.45) { addObj({ t: 'hedge', x: px, z: pz - 6.8, w: 12, seed: Math.floor(r() * 1e6) }); addCollider({ x0: px - 6, x1: px + 6, z0: pz - 7.2, z1: pz - 6.4, h: 1.1 }); }
      for (const [bx, bz] of [[-6.3, 6.3], [6.3, 6.3], [-6.3, -3], [6.3, -3]]) if (r() < 0.5) { addObj({ t: 'bush', x: px + bx, z: pz + bz, s: 0.7 + r() * 0.5, flowers: r() < 0.4, seed: Math.floor(r() * 1e6) }); addCollider({ x: px + bx, z: pz + bz, r: 0.6 }); }
    }
    return;
  }
  if (type === 'beach') {
    const n = r() < 0.5 ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const w = n === 1 ? 24 : 12.5, ox = n === 1 ? 0 : (i ? 7.5 : -7.5);
      building(lx + ox, lz - 3, w, 18, 7 + r() * 9, PAL.beach[Math.floor(r() * PAL.beach.length)], { top: r() < 0.5 ? 'ac' : null, awning: true });
    }
    for (let i = 0; i < 3; i++) tree(lx - 12 + i * 12, lz + 13, 'palm', 1 + r() * 0.3);
    return;
  }
  if (type === 'casino') { // Sun Valley: giant casino hotels, gold and pastel, with a neon sign out front on the Strip
    const pal = ['#f2e6c9', '#ffd6a5', '#f6d1c1', '#e8e4dc', '#ffeaa0', '#d8c4ff', '#c9e4ff'], neon = ['#ff3bd2', '#38e8ff', '#ffd23f', '#ff6a3c', '#b26bff', '#4cd964'];
    if (r() < 0.6) building(lx, lz, 28, 28, 30 + r() * 26, pal[Math.floor(r() * pal.length)], { top: r() < 0.5 ? 'helipad' : 'setback', awning: true });
    else { building(lx, lz - 6, 30, 16, 36 + r() * 20, pal[Math.floor(r() * pal.length)], { top: 'antenna' }); building(lx, lz + 9, 30, 10, 8, pal[Math.floor(r() * pal.length)], { top: 'ac', awning: true }); } // tower and podium
    const sx = lx + (lx < city.cx ? 16.4 : -16.4); addObj({ t: 'neon', x: sx, z: lz - 9, h: 9 + r() * 5, col: neon[Math.floor(r() * neon.length)], col2: neon[Math.floor(r() * neon.length)] }); addCollider({ x: sx, z: lz - 9, r: 0.4 });
    return;
  }
  if (type === 'sky') { // Long Beach skyline: the tallest towers in the city, tallest in the middle of the island
    const k = Math.max(0, 1 - Math.abs(cz - city.cz) / 300), pal = ['#9fc4dc', '#bcd4e6', '#8fb8d0', '#d8e4ec', '#a9c2b8', '#c9d6e3'];
    if (r() < 0.6) { const w = 22 + r() * 6, d = 22 + r() * 6, h = 26 + r() * 20 + k * 34; building(lx, lz, w, d, h, pal[Math.floor(r() * pal.length)], { glass: true, top: r() < 0.4 ? 'helipad' : r() < 0.5 ? 'antenna' : 'setback' }); }
    else for (const oz of [-7.5, 7.5]) building(lx + (r() - 0.5) * 3, lz + oz, 26 + r() * 4, 12.5, 18 + r() * 16 + k * 22, pal[Math.floor(r() * pal.length)], { glass: true, top: r() < 0.4 ? 'antenna' : 'ac' });
    return;
  }
  if (type === 'resort') { // beachfront hotels: tall, pastel, palms out front
    const n = r() < 0.55 ? 1 : 2;
    for (let i = 0; i < n; i++) { const w = n === 1 ? 26 : 13, ox = n === 1 ? 0 : (i ? 7.5 : -7.5); building(lx + ox, lz, w, n === 1 ? 20 : 24, 12 + r() * 18, PAL.beach[Math.floor(r() * PAL.beach.length)], { top: r() < 0.5 ? 'ac' : r() < 0.5 ? 'helipad' : null, awning: true }); }
    for (const [tx, tz] of [[-14, -14], [14, -14], [-14, 14], [14, 14]]) if (r() < 0.8) tree(lx + tx, lz + tz, 'palm', 1 + r() * 0.35);
    return;
  }
  if (type === 'tower') {
    const hmul = Math.max(0.4, 1 - dCenter / 140);
    if (r() < 0.55) {
      const w = 20 + r() * 7, d = 20 + r() * 7, h = 12 + r() * 12 * hmul + 4 * hmul;
      building(lx, lz, w, d, h, PAL.downtown[Math.floor(r() * PAL.downtown.length)], { top: r() < 0.5 ? 'setback' : r() < 0.5 ? 'helipad' : 'antenna' });
    } else {
      for (const ox of [-7.5, 7.5]) {
        const h = 10 + r() * 10 * hmul + 4 * hmul;
        building(lx + ox, lz + (r() - 0.5) * 4, 12.5, 22 + r() * 5, h, PAL.downtown[Math.floor(r() * PAL.downtown.length)], { top: r() < 0.4 ? 'ac' : r() < 0.3 ? 'antenna' : null });
      }
    }
    return;
  }
  // mid-rise: 2-4 buildings
  const split = r();
  const parts = split < 0.3 ? [[0, -7.5, 30, 14], [0, 7.5, 30, 14]] : split < 0.65 ? [[-7.5, 0, 14, 30], [7.5, 0, 14, 30]] : [[-7.5, -7.5, 14, 14], [7.5, -7.5, 14, 14], [-7.5, 7.5, 14, 14], [7.5, 7.5, 14, 14]];
  const pal = city.style === 'suburb' ? PAL.beach : PAL.mid;
  for (const [ox, oz, w, d] of parts) {
    if (r() < 0.12) { tree(lx + ox, lz + oz, 'round', 1.1); continue; }
    const bo = building(lx + ox, lz + oz, w - 1 - r() * 2, d - 1 - r() * 2, 6 + r() * (city.style === 'suburb' ? 6 : 12), pal[Math.floor(r() * pal.length)], { top: r() < 0.4 ? 'ac' : r() < 0.25 ? 'tank' : null, awning: r() < 0.4 });
    if (city.id === 'east' && bo) { // Eastport: graffiti on the walls, bin bags piled against them
      for (const sd of [1, -1]) if (r() < 0.55) addObj({ t: 'tag', x: bo.x + (r() - 0.5) * (bo.w - 5), z: bo.z + sd * (bo.d / 2 + 0.03), sd, w: 2 + r() * 2.5, seed: Math.floor(r() * 1e6) });
      if (r() < 0.5) addObj({ t: 'trash', x: bo.x + (r() - 0.5) * (bo.w - 3), z: bo.z + bo.d / 2 + 0.5, seed: Math.floor(r() * 1e6) });
    }
  }
}

function genWorld() {
  for (let x = RAIL.x0; x < RAIL.x1; x += 8) addObj({ t: 'rail', x: x + 4, z: RAIL.z });
  { const U = UNDERPASS; addObj({ t: 'ubridge', x: U.x, z: U.z });
    for (const sx of [-1, 1]) for (const [z0, z1] of [[U.z1 + 6, U.z - 3.6], [U.z + 3.6, U.z0 - 4]]) addCollider({ x0: U.x + sx * (U.half + 0.2) - 0.4, x1: U.x + sx * (U.half + 0.2) + 0.4, z0, z1, h: 1.2 }); } // retaining walls keep cars in the cutting (with a gap where the rail bridge crosses, so you can drive the tracks over it)
  for (const st of RAIL.stations) { addObj({ t: 'platform', x: st.x, z: RAIL.z + 4.4, name: st.name }); addCollider({ x0: st.x - 15, x1: st.x + 15, z0: RAIL.z + 2.4, z1: RAIL.z + 6.4, h: 0.45, top: 0.48 }); }
  // Eastport Docks: a container yard by the coast road with two gantry cranes, stacks of boxes and a chain-link fence
  { const R = mkRng(0.4242), cols = ['#c8392b', '#2f6fd8', '#e8a020', '#2f8a4a', '#8a3a8a', '#d8d8d8', '#1f8a9a', '#b35a2a'];
    for (let x = 532; x < 708; x += 4) if (!roadAt(x + 2, 307) && !nearRoad(x + 2, 307, 0.5)) addObj({ t: 'slab', x: x + 2, z: 307, w: 4.02, d: 36, h: 0.12, col: '#8d8a86' });
    for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) { if (R() < 0.18) continue; const x = 548 + i * 17 + (R() - 0.5), z = 296 + row * 9.5, n = 1 + Math.floor(R() * 3); if (nearRoad(x - 6, z, 1) || nearRoad(x + 6, z, 1) || nearRoad(x, z, 1)) continue;
      for (let k = 0; k < n; k++) addObj({ t: 'container', x, z, y: k * 2.6, col: cols[Math.floor(R() * cols.length)] }); addCollider({ x0: x - 6.1, x1: x + 6.1, z0: z - 1.25, z1: z + 1.25, h: n * 2.6 }); }
    for (const cx of [575, 665]) { addObj({ t: 'crane', x: cx, z: 307 }); for (const sz of [-15, 15]) for (const sx of [-5, 5]) addCollider({ x: cx + sx, z: 307 + sz, r: 0.7 }); }
    addObj({ t: 'fence', x0: 532, x1: 708, z: 290 }); }
  // Bay Metro viaduct: deck segments every 4 m, pillars every 16 m (but never in a junction), stations with stair towers
  { const M = METRO; for (let s = 0; s < M.len; ) { const a0 = M.at(s), a1 = M.at(s + 4), bend = Math.abs(Math.atan2(Math.sin(a1.h - a0.h), Math.cos(a1.h - a0.h))) > 0.02, step = bend ? 1.5 : 4, a = M.at(s + step / 2); addObj({ t: 'via', x: a.x, z: a.z, h: a.h, len: bend ? 1.9 : 4.15 }); s += step; }
    for (let s = 0; s < M.len; s += 16) { const a = M.at(s); if (ROADS.filter(r => inR(r, a.x, a.z, 3)).length > 1 || skyAt(a.x, a.z)) continue; const onRd = !!roadAt(a.x, a.z), o = { t: 'vpillar', x: a.x, z: a.z, h: a.h, portal: onRd, s, cols: [] }; addObj(o); if (onRd) { const cs = Math.cos(a.h), sn = Math.sin(a.h); for (const sw of [-7.3, 7.3]) { const c = { x: a.x + cs * sw, z: a.z - sn * sw, r: 0.6 }; addCollider(c); o.cols.push(c); } } else { const c = { x: a.x, z: a.z, r: 0.75 }; addCollider(c); o.cols.push(c); } } // over a street: legs on the pavements, the road stays clear
    for (const st of M.stations) { addObj({ t: 'vstation', x: st.x, z: st.z, ox: st.ox, oz: st.oz, tx: st.tower.x, tz: st.tower.z, name: st.name }); addCollider({ x0: st.tower.x - 1.4, x1: st.tower.x + 1.4, z0: st.tower.z - 1.4, z1: st.tower.z + 1.4, h: 9 }); } }
  // Bay Skyways: deck segments, pillars clear of junctions, ramp strips, parapets and lamps
  for (const S of SKYWAYS) {
    const other = SKYWAYS.find(o => o !== S && o.axis !== S.axis && o.line > S.a0 && o.line < S.a1 && S.line > o.a0 && S.line < o.a1), cross = other ? other.line : null; // u of the sky junction along this skyway (if it crosses one)
    const nearCross = u => cross != null && Math.abs(u - cross) < SKY_HW + 0.4;
    const d0 = S.a0 + S.ramp, d1 = S.a1 - S.ramp;
    for (let u = d0; u < d1 - 1e-6; u += 4) { const um = Math.min(u + 2, d1 - 0.01), [x, z] = skyXZ(S, um, 0); if (S.id === 'B' && nearCross(um)) { addObj({ t: 'skydeck', x, z, S: S.id, u: um, len: 4, skip: true }); continue; } addObj({ t: 'skydeck', x, z, S: S.id, u: um, len: Math.min(4, d1 - u), cross: nearCross(um) }); }
    if (S.bridge) { // piers in the water, and on the long one two cable-stay towers
      const span = d1 - d0, n = Math.max(1, Math.round(span / 26));
      for (let k = 0; k <= n; k++) { const u = d0 + span * k / n, [x, z] = skyXZ(S, u, 0); addObj({ t: 'bpier', x, z, S: S.id, u }); const [xa, za] = skyXZ(S, u - 1.6, -4.8), [xb, zb] = skyXZ(S, u + 1.6, 4.8); addCollider({ x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: Math.min(za, zb), z1: Math.max(za, zb), h: S.y - 1.3, under: true }); }
      if (span > 80) for (const f of [0.3, 0.7]) { const u = d0 + span * f, [x, z] = skyXZ(S, u, 0); addObj({ t: 'bpylon', x, z, S: S.id, u }); for (const sw of [-1, 1]) { const [lx, lz] = skyXZ(S, u, sw * 7.6); addCollider({ x: lx, z: lz, r: 1.1 }); } }
    } else
    for (let u = d0 + 6; u < d1 - 4; u += 12) { const jn = Math.round(u / 48) * 48; if (Math.abs(u - jn) < 9) continue; const [x, z] = skyXZ(S, u, 0), o = { t: 'skypillar', x, z, S: S.id, u, cols: [] }; addObj(o); for (const sw of [-1, 1]) { const [lx, lz] = skyXZ(S, u, sw * 7.3), c = { x: lx, z: lz, r: 0.6, under: true }; addCollider(c); o.cols.push(c); } }
    for (const [ua, ub] of [[S.a0, d0], [d1, S.a1]]) for (let u = ua; u < ub - 1e-6; u += 2) { const [x, z] = skyXZ(S, u + 1, 0); addObj({ t: 'skyramp', x, z, S: S.id, u0: u, u1: Math.min(ub, u + 2) }); }
    // colliders: solid ramp side walls, an abutment under each ramp top, parapets along the deck (gap at the sky junction)
    const box = (u0, u1, w0, w1, extra) => { const [xa, za] = skyXZ(S, u0, w0), [xb, zb] = skyXZ(S, u1, w1); addCollider({ x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0: Math.min(za, zb), z1: Math.max(za, zb), ...extra }); };
    for (const sw of [-1, 1]) { box(S.a0, d0, sw * 6.0, sw * 6.4, { h: 99 }); box(d1, S.a1, sw * 6.0, sw * 6.4, { h: 99 }); }
    box(d0, d0 + 0.6, -6.4, 6.4, { h: 99, under: true }); box(d1 - 0.6, d1, -6.4, 6.4, { h: 99, under: true });
    for (const sw of [-1, 1]) { if (cross != null && cross > d0 && cross < d1) { box(d0, cross - SKY_HW - 0.4, sw * 6.0, sw * 6.4, { h: 99, deck: true }); box(cross + SKY_HW + 0.4, d1, sw * 6.0, sw * 6.4, { h: 99, deck: true }); } else box(d0, d1, sw * 6.0, sw * 6.4, { h: 99, deck: true }); }
    for (let u = d0 + 12; u < d1 - 6; u += 24) if (!nearCross(u)) for (const sw of [-1, 1]) { const [x, z] = skyXZ(S, u, sw * 6.2); addObj({ t: 'skylamp', x, z, S: S.id, sw }); }
  }
  // city blocks + street lamps
  for (const city of CITIES) {
    for (let i = city.kx[0]; i < city.kx[1]; i++) for (let j = city.kz[0]; j < city.kz[1]; j++) {
      const bx0 = city.cx + i * P + HR, bz0 = city.cz + j * P + HR;
      genBlock(city, bx0, bz0, mkRng(hash(i + 100, j + 100, city.cx + city.cz * 7 + 1)), i, j);
      // lamps on block corners-ish
      for (const [lx, lz] of [[bx0 + 1.2, bz0 + 12], [bx0 + 34.8, bz0 + 24], [bx0 + 12, bz0 + 34.8], [bx0 + 24, bz0 + 1.2]]) { LAMPS.push({ x: lx, z: lz }); addObj({ t: 'lamp', x: lx, z: lz }); addCollider({ x: lx, z: lz, r: 0.16 }); }
      // street furniture along the kerb: bins, hydrants, news boxes, bike racks, planters, bollards and the odd bus stop or phone box
      const rr = mkRng(hash(i + 300, j + 300, city.cx + 5)), kinds = city.style === 'suburb' ? ['bin', 'hydrant', 'planter', 'planter', 'bin', 'mailbox'] : ['bin', 'hydrant', 'newsbox', 'bikerack', 'planter', 'bollards', 'bin', 'phonebox'];
      for (const [sx, sz, rot] of [[bx0 + 0.75, null, Math.PI / 2], [bx0 + 35.25, null, -Math.PI / 2], [null, bz0 + 0.75, 0], [null, bz0 + 35.25, Math.PI]]) {
        for (const off of [7, 18.5, 29.5]) { if (rr() < 0.35) continue; const x = sx ?? bx0 + off, z = sz ?? bz0 + off;
          const k = off === 18.5 && rr() < 0.18 ? 'busstop' : kinds[Math.floor(rr() * kinds.length)];
          addObj({ t: 'prop', k, x, z, rot, seed: Math.floor(rr() * 1e6) });
          if (k === 'busstop') addCollider(Math.abs(Math.sin(rot)) > 0.5 ? { x0: x - 0.5, x1: x + 0.5, z0: z - 1.7, z1: z + 1.7, h: 2.6 } : { x0: x - 1.7, x1: x + 1.7, z0: z - 0.5, z1: z + 0.5, h: 2.6 });
          else if (k !== 'bollards') addCollider({ x, z, r: k === 'planter' ? 0.55 : k === 'bikerack' ? 0.5 : k === 'phonebox' ? 0.55 : 0.3 }); }
      }
    }
  }
  // zebra crossings just outside every junction, where pedestrians cross
  for (const city of CITIES) for (let i = city.kx[0]; i <= city.kx[1]; i++) for (let j = city.kz[0]; j <= city.kz[1]; j++) {
    const nx = city.cx + i * P, nz = city.cz + j * P;
    for (const s of [-1, 1]) {
      if (roadAt(nx, nz + s * 7.4) && !roadAt(nx + 9, nz + s * 7.4)) for (let k = -5; k <= 5; k += 1.1) addObj({ t: 'paint', x: nx + k, z: nz + s * 7.4, w: 0.55, d: 2.4, col: '#f2f2f2', y: 0.055 });
      if (roadAt(nx + s * 7.4, nz) && !roadAt(nx + s * 7.4, nz + 9)) for (let k = -5; k <= 5; k += 1.1) addObj({ t: 'paint', x: nx + s * 7.4, z: nz + k, w: 2.4, d: 0.55, col: '#f2f2f2', y: 0.055 });
    }
  }
  // highway lamps
  for (const r of ROADS) if (r.hwy) {
    const along = r.axis === 'x', a0 = along ? r.x0 : r.z0, a1 = along ? r.x1 : r.z1;
    for (let a = a0 + 15; a < a1 - 10; a += 30) {
      const x = along ? a : r.x1 + 1.2, z = along ? r.z0 - 1.2 : a;
      if (!roadAt(x, z) && !cityAt(x, z, -2)) { LAMPS.push({ x, z }); addObj({ t: 'lamp', x, z }); addCollider({ x, z, r: 0.16 }); }
    }
  }
  // road dashes
  for (const r of ROADS) {
    const along = r.axis === 'x', a0 = along ? r.x0 : r.z0, a1 = along ? r.x1 : r.z1, c = along ? (r.z0 + r.z1) / 2 : (r.x0 + r.x1) / 2;
    for (let a = a0 + 3; a < a1 - 2; a += 6) {
      const x = along ? a : c, z = along ? c : a;
      let n = 0; for (const q of ROADS) if (inR(q, x, z, 1.5)) n++;
      if (n > 1) continue;
      addObj({ t: 'paint', x, z, w: along ? 2.6 : 0.22, d: along ? 0.22 : 2.6, col: r.dirt ? null : r.hwy ? '#ffd23f' : '#f2f2f2', y: 0.05 });
    }
  }
  // forest + cliffs
  const R = mkRng(0.4242);
  for (let x = -536; x < -312; x += 6.5) for (let z = -776; z < 360; z += 6.5) {
    const tx = x + (hash(x | 0, z | 0, 1) - 0.5) * 5, tz = z + (hash(x | 0, z | 0, 2) - 0.5) * 5;
    if (tz > sandLine(tx) - 6) continue;
    if (nearRoad(tx, tz, 3)) continue;
    if (PADS.some(p => Math.hypot(tx - p.x, tz - p.z) < p.r + 4)) continue;
    if (Math.abs(tx - SIGN.x) < 34 && tz > SIGN.z - 8 && tz < SIGN.z + 40) continue;
    if (hash(x | 0, z | 0, 3) < 0.42) tree(tx, tz, hash(x | 0, z | 0, 4) < 0.6 ? 'pine' : 'round', 0.9 + hash(x | 0, z | 0, 5) * 0.8);
  }
  for (let z = -800; z < 470; z += 9) { R(); R(); R(); R(); R(); } // (the old western cliff wall is gone: the map carries on over the ridge) — keep the random sequence the same
  // Wildwood: a wild valley of pines and oaks over the ridge
  for (let x = -872; x < -560; x += 8) for (let z = -740; z < 330; z += 8) {
    const tx = x + (hash(x | 0, z | 0, 51) - 0.5) * 6, tz = z + (hash(x | 0, z | 0, 52) - 0.5) * 6;
    if (hash(x | 0, z | 0, 53) > 0.34 || tz > sandLine(tx) - 10 || tz < northZ(tx) + 44 || nearRoad(tx, tz, 3)) continue;
    tree(tx, tz, hash(x | 0, z | 0, 54) < 0.65 ? 'pine' : 'round', 0.9 + hash(x | 0, z | 0, 55) * 0.9);
  }
  // Red Rock Desert: saguaro cacti and boulders, nothing growing in the gorge or on the trails
  for (let x = -1350; x < -880; x += 11) for (let z = -730; z < 330; z += 11) {
    const tx = x + (hash(x | 0, z | 0, 61) - 0.5) * 8, tz = z + (hash(x | 0, z | 0, 62) - 0.5) * 8, hh = hash(x | 0, z | 0, 63);
    if (hh > 0.2 || cityAt(tx, tz, 14) || tx < coastW(tz) + 50 || tz < northZ(tx) + 44 || tz > sandLine(tx) - 12 || Math.abs(tx - redRiverX(tz)) < 48 || nearRoad(tx, tz, 3) || MESAS.some(M => Math.hypot(tx - M.x, tz - M.z) < M.r + 10)) continue;
    if (hh < 0.12) { addObj({ t: 'cactus', x: tx, z: tz, s: 0.8 + hash(x | 0, z | 0, 64) * 0.7, arms: Math.floor(hash(x | 0, z | 0, 65) * 3) }); addCollider({ x: tx, z: tz, r: 0.45 }); }
    else { const w = 1.6 + hash(x | 0, z | 0, 66) * 3; addObj({ t: 'boulder', x: tx, z: tz, w, h: w * 0.7 }); addCollider({ x: tx, z: tz, r: w * 0.5, h: w * 0.7 }); }
  }
  // West Beach palms, and the little islands: palms, rocks, and a lighthouse on a couple of them
  for (let z = -700; z < 330; z += 13) if (hash(3, z | 0, 71) < 0.55) tree(coastW(z) + 36 + hash(4, z | 0, 72) * 6, z, 'palm', 1 + hash(5, z | 0, 73) * 0.4);
  for (const I of ISLETS) { for (const [n, [dx, dz, r]] of I.parts.entries()) { const m = r >= 16 ? 3 : 1; for (let k = 0; k < m; k++) { const a = k / m * Math.PI * 2 + I.seed + n, rr = m > 1 ? r - 11 : 0; if (I.light && n === 0 && rr < 5) continue; tree(I.x + dx + Math.cos(a) * rr, I.z + dz + Math.sin(a) * rr, 'palm', 1 + ((k + n) % 3) * 0.15); } }
    if (I.light) { addObj({ t: 'lighthouse', x: I.x, z: I.z }); addCollider({ x: I.x, z: I.z, r: 3.2, h: 24 }); } else { addObj({ t: 'boulder', x: I.x + 3, z: I.z - 2, w: 3.4, h: 2.4 }); addCollider({ x: I.x + 3, z: I.z - 2, r: 1.7, h: 2.4 }); } }
  for (let x = -560; x < 800; x += 10) { const rx = R(), rw = R(), rh = R(); if (groundH(x, -794) < 0.2 || riverD(x, -794) < RIVER.hw + 16 || x > coastX(-794) - 30) continue; addObj({ t: 'rock', x, z: -794 + rx * 4, w: 12 + rw * 6, d: 12, h: 8 + rh * 14, col: '#77726a' }); } // the river runs out through a gap
  // countryside trees
  for (let x = -312; x < 790; x += 14) for (let z = -780; z < 360; z += 14) {
    const tx = x + (hash(x, z, 7) - 0.5) * 10, tz = z + (hash(x, z, 8) - 0.5) * 10;
    if (hash(x, z, 9) > 0.16) continue;
    if (tz > sandLine(tx) - 8 || cityAt(tx, tz, 6) || inR(AIRPORT, tx, tz, 8) || nearRoad(tx, tz, 5) || tx > coastX(tz) - 48 || riverD(tx, tz) < RIVER.hw + 12 || skyAt(tx, tz)) continue;
    let inField = false; for (const f of FIELDS) if (inR(f, tx, tz, 2)) inField = true; if (inField) continue;
    tree(tx, tz, hash(x, z, 10) < 0.3 ? 'pine' : 'round', 0.9 + hash(x, z, 11) * 0.7);
  }
  // beach
  for (let x = -520; x < 770; x += 11) {
    const sl = sandLine(x), sh = shoreLine(x);
    if (hash(x, 1, 12) < 0.55) tree(x + hash(x, 2, 13) * 6, sl + 4 + hash(x, 3, 14) * 10, 'palm', 1 + hash(x, 4, 15) * 0.4);
    if (x > -330 && hash(x, 5, 16) < 0.5) {
      const ux = x + 3, uz = sh - 34 + hash(x, 6, 17) * 10;
      if (!inR(PIER, ux, uz, 2)) {
        addObj({ t: 'umbrella', x: ux, z: uz, col: ['#e23b3b', '#ffd23f', '#2f80ed', '#ff6fb5', '#1fb5a8', '#ff8a2a'][Math.floor(hash(x, 7, 18) * 6)] });
        addCollider({ x: ux, z: uz, r: 0.25 });
        addObj({ t: 'paint', x: ux + 1.5, z: uz + 1, w: 1.2, d: 2.2, col: ['#ffffff', '#4cd964', '#ff6fb5', '#2f80ed'][Math.floor(hash(x, 8, 19) * 4)], y: 0.03, raw: true });
      }
    }
  }
  // the east shore along Eastport, and Long Beach's sand all the way round the island: palms, umbrellas, lifeguard huts
  for (let z = -130; z < 330; z += 12) { if (Math.abs(z) < 12 || hash(5, z | 0, 31) > 0.6) continue; const ce = coastX(z); tree(ce - 34 + hash(6, z | 0, 32) * 8, z + hash(7, z | 0, 33) * 6, 'palm', 1 + hash(8, z | 0, 34) * 0.4); }
  { const I = ISLE, ring = []; // points round the island just inside the sand
    for (let x = I.x0 + 30; x < I.x1 - 25; x += 10) ring.push([x, I.z0 + 26, 0, 1], [x, I.z1 - 26, 0, -1]);
    for (let z = I.z0 + 30; z < I.z1 - 25; z += 10) ring.push([I.x0 + 26, z, 1, 0], [I.x1 - 26, z, -1, 0]);
    ring.forEach(([x, z, nx, nz], i) => { if (skyAt(x, z) || Math.abs(z) < 14 && x < I.x0 + 60 || Math.hypot(x - 1182, z + 268) < 16) return; /* not on the bridge or the villa */ const h = hash(x | 0, z | 0, 41);
      if (h < 0.3) tree(x + nx * 22 + (hash(x | 0, z | 0, 42) - 0.5) * 6, z + nz * 22 + (hash(x | 0, z | 0, 43) - 0.5) * 6, 'palm', 1 + hash(x | 0, z | 0, 44) * 0.4); // palms on the top of the sand
      else if (h < 0.62) { const ux = x - nx * 2, uz = z - nz * 2; addObj({ t: 'umbrella', x: ux, z: uz, col: ['#e23b3b', '#ffd23f', '#2f80ed', '#ff6fb5', '#1fb5a8', '#ff8a2a'][Math.floor(hash(x | 0, z | 0, 45) * 6)] }); addCollider({ x: ux, z: uz, r: 0.25 });
        addObj({ t: 'paint', x: ux + (nz ? 1.5 : 1), z: uz + (nx ? 1.5 : 1), w: nx ? 2.2 : 1.2, d: nx ? 1.2 : 2.2, col: ['#ffffff', '#4cd964', '#ff6fb5', '#2f80ed'][Math.floor(hash(x | 0, z | 0, 46) * 4)], y: 0.03, raw: true }); } });
    for (const [lx, lz] of [[I.x0 + 18, -200], [I.x0 + 18, 200], [I.x1 - 18, -120], [I.x1 - 18, 120], [1056, I.z1 - 18], [1056, I.z0 + 18]]) { addObj({ t: 'lifeguard', x: lx, z: lz }); addCollider({ x0: lx - 1.6, x1: lx + 1.6, z0: lz - 1.6, z1: lz + 1.6, h: 4 }); } }
  for (const lx of [-220, 40, 300, 520]) { addObj({ t: 'lifeguard', x: lx, z: shoreLine(lx) - 30 }); addCollider({ x0: lx - 1.6, x1: lx + 1.6, z0: shoreLine(lx) - 31.6, z1: shoreLine(lx) - 28.4, h: 4 }); }
  addObj({ t: 'pier', x: (PIER.x0 + PIER.x1) / 2, z: (PIER.z0 + PIER.z1) / 2 });
  DOCKS.forEach((D, i) => addObj({ t: 'dock', i, x: (D.x0 + D.x1) / 2, z: (D.z0 + D.z1) / 2 }));
  // Bay Port: container stacks, gantry cranes on the berth, warehouses, fuel tanks and a cargo ship tied up
  { const R2 = mkRng(0.777), cols = ['#c8392b', '#2f6fd8', '#e8a020', '#2f8a4a', '#8a3a8a', '#d8d8d8', '#1f8a9a', '#b35a2a'];
    for (let row = 0; row < 6; row++) for (let i = 0; i < 4; i++) { if (R2() < 0.15) continue; const x = 1074 + 6 + i * 14, z = -682 + row * 9; if (x + 6 > PORT.x1 - 3) continue; const n = 1 + Math.floor(R2() * 3);
      for (let k = 0; k < n; k++) addObj({ t: 'container', x, z, y: k * 2.6, col: cols[Math.floor(R2() * cols.length)] }); addCollider({ x0: x - 6.1, x1: x + 6.1, z0: z - 1.25, z1: z + 1.25, h: n * 2.6 }); }
    for (const cx of [1005, 1090, 1125]) { addObj({ t: 'crane', x: cx, z: -729 }); for (const sz of [-15, 15]) for (const sx of [-5, 5]) addCollider({ x: cx + sx, z: -729 + sz, r: 0.7 }); }
    for (const [wx, wz] of [[1012, -682], [1012, -640], [1012, -598]]) building(wx, wz, 40, 24, 9, ['#8a96a6', '#a8a39a', '#7d8a7a'][Math.floor(R2() * 3)], { roof: 'pitch', roofH: 3, roofCol: '#5a6470', plain: true });
    for (const [tx, tz] of [[1100, -615], [1124, -615], [1112, -592]]) { addObj({ t: 'otank', x: tx, z: tz, r: 5, h: 9 }); addCollider({ x: tx, z: tz, r: 5.2, h: 9 }); }
    addObj({ t: 'ship', x: 1060, z: -764 }); addCollider({ x0: 1012, x1: 1110, z0: -772, z1: -756, h: 12 });
    for (let x = PORT.x0 + 8; x < PORT.x1 - 4; x += 24) if (Math.abs(x - 1056) > 8) { LAMPS.push({ x, z: -692.6 }); addObj({ t: 'lamp', x, z: -692.6 }); addCollider({ x, z: -692.6, r: 0.16 }); }
    for (let z = PORT.z1 - 20; z > -690; z -= 24) { LAMPS.push({ x: 1063.2, z }); addObj({ t: 'lamp', x: 1063.2, z }); addCollider({ x: 1063.2, z, r: 0.16 }); }
    const kerb = (x0, x1, z0, z1) => { addObj({ t: 'quaywall', x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0 }); addCollider({ x0, x1, z0, z1, h: 1 }); }; // a kerb along the quay edge with bollards (a gap for the bridge)
    kerb(PORT.x0, PORT.x1, PORT.z0, PORT.z0 + 0.8); kerb(PORT.x0, 1049, PORT.z1 - 0.8, PORT.z1); kerb(1063, PORT.x1, PORT.z1 - 0.8, PORT.z1); kerb(PORT.x0, PORT.x0 + 0.8, PORT.z0, PORT.z1); kerb(PORT.x1 - 0.8, PORT.x1, PORT.z0, PORT.z1); }
  // Hidden Hills mansions
  for (const p of PADS) {
    const big = p.r > 20;
    building(p.x, p.z - 3, big ? 26 : 18, big ? 16 : 12, big ? 7 : 6, '#f4f1ea', { y: p.h, top: 'ac' });
    building(p.x + (big ? 9 : 6), p.z - 9, big ? 12 : 9, 8, big ? 11 : 9, '#e9e3d6', { y: p.h });
    addObj({ t: 'pool', x: p.x - 2, z: p.z + 9, w: big ? 12 : 8, d: 5, y: p.h });
    addObj({ t: 'slab', x: p.x, z: p.z + 3, w: p.r * 1.6, d: p.r * 1.3, h: 0.12, col: '#9cc97a', y: p.h });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; tree(p.x + Math.cos(a) * (p.r - 2), p.z + Math.sin(a) * (p.r - 2), 'palm', 1.1); }
  }
  // airport
  addObj({ t: 'slab', x: 30, z: -643, w: 300, d: 50, h: 0.06, col: '#b9b7ae' });
  addObj({ t: 'slab', x: 160, z: -679, w: 20, d: 24, h: 0.06, col: '#55555c' });
  addObj({ t: 'runway', x: 20, z: -705, w: 500, d: 30 });
  for (let x = -228; x < 270; x += 20) for (const z of [-719.5, -690.5]) { addObj({ t: 'rlight', x, z }); }
  building(-62, -600, 95, 24, 11, '#9fc4dc', { glass: true, top: 'ac' });
  building(62, -600, 95, 24, 11, '#9fc4dc', { glass: true, top: 'ac' });
  addObj({ t: 'slab', x: 0, z: -597, w: 12, d: 30, h: 0.06, col: '#55555c' });
  building(150, -598, 6, 6, 24, '#d8d8d8', { top: 'tower' });
  for (const hx of [205, 245]) building(hx, -645, 34, 30, 10, '#a8b0b8', { roof: 'pitch', roofH: 4, roofCol: '#7a8590' });
  for (const [px, pz] of [[-90, -642], [-20, -642], [50, -642]]) { addObj({ t: 'plane', x: px, z: pz, rot: 0, col: '#ffffff', acc: ['#2f80ed', '#e23b3b', '#1fb5a8'][(px + 90) / 70 | 0] }); for (const [x0, x1, z0, z1, h] of [[px - 2.2, px + 2.2, pz - 17.5, pz + 17.5, 6], [px - 15, px + 15, pz - 1.8, pz + 3.8, 3], [px - 5, px + 5, pz - 17.3, pz - 14.7, 5]]) addCollider({ x0, x1, z0, z1, h, plane: true }); } // fuselage, wings, tail: no invisible walls
}
genWorld();
// pillar legs stand on the pavement: never in front of a doorway. Slide the pillar along its line until it's clear.
export function unblockPillars(doors) {
  const blocked = pts => pts.some(([x, z]) => doors.some(d => Math.hypot(d.x - x, d.z - z) < 3.4));
  const moveObj = (o, x, z) => { const c0 = chunks.get(ckey(...chunkOf(o.x, o.z))); const i = c0?.objs.indexOf(o); if (i >= 0) c0.objs.splice(i, 1); o.x = x; o.z = z; addObj(o); };
  for (const ch of [...chunks.values()]) for (const o of [...ch.objs]) {
    if (o.t === 'skypillar') { const S = SKYWAYS.find(q => q.id === o.S), legs = u => [-1, 1].map(sw => skyXZ(S, u, sw * 7.3)); if (!blocked(legs(o.u))) continue;
      let nu = null; for (const du of [2, -2, 4, -4, 6, -6]) { const u = o.u + du, jn = Math.round(u / 48) * 48; if (Math.abs(u - jn) >= 9 && !blocked(legs(u))) { nu = u; break; } }
      for (const c of o.cols) removeCollider(c); o.cols = [];
      if (nu == null) { const c0 = chunks.get(ckey(...chunkOf(o.x, o.z))); c0.objs.splice(c0.objs.indexOf(o), 1); continue; }
      o.u = nu; const [x, z] = skyXZ(S, nu, 0); moveObj(o, x, z); for (const [lx, lz] of legs(nu)) { const c = { x: lx, z: lz, r: 0.6, under: true }; addCollider(c); o.cols.push(c); } }
    else if (o.t === 'vpillar' && o.portal) { const legsAt = a => [-7.3, 7.3].map(sw => [a.x + Math.cos(a.h) * sw, a.z - Math.sin(a.h) * sw]); if (!blocked(legsAt(o))) continue;
      let na = null; for (const ds of [2, -2, 4, -4, 6, -6]) { const a = METRO.at(o.s + ds); if (roadAt(a.x, a.z) && !blocked(legsAt(a))) { const jx = Math.round(a.x / 48) * 48, jz = Math.round(a.z / 48) * 48; if (Math.abs(a.x - jx) < 9 && Math.abs(a.z - jz) < 9) continue; na = a; o.s += ds; break; } }
      for (const c of o.cols) removeCollider(c); o.cols = [];
      if (!na) { const c0 = chunks.get(ckey(...chunkOf(o.x, o.z))); c0.objs.splice(c0.objs.indexOf(o), 1); continue; }
      o.h = na.h; moveObj(o, na.x, na.z); for (const [lx, lz] of legsAt(na)) { const c = { x: lx, z: lz, r: 0.6 }; addCollider(c); o.cols.push(c); } } }
}
{ const doors = []; for (const ch of chunks.values()) for (const o of ch.objs) if (o.t === 'door') doors.push(o); unblockPillars(doors); }
// a fire-escape ladder must lead to a roof: drop any whose building was cleared away (station plazas etc.)
for (let i = LADDERS.length - 1; i >= 0; i--) { const L = LADDERS[i], bx = L.x - L.nx, bz = L.z - L.nz; if (collidersNear(bx, bz).some(c => !c.r && c.top && bx > c.x0 - 0.3 && bx < c.x1 + 0.3 && bz > c.z0 - 0.3 && bz < c.z1 + 0.3 && Math.abs(c.top - L.top) < 0.6)) continue;
  LADDERS.splice(i, 1); const ch = chunks.get(ckey(...chunkOf(L.x, L.z))); if (ch) { const j = ch.objs.findIndex(o => o.t === 'ladder' && Math.abs(o.x - L.x) < 0.01 && Math.abs(o.z - L.z) < 0.01); if (j >= 0) ch.objs.splice(j, 1); } }
// nothing growing or parked on the canyon roads
for (const ch of chunks.values()) for (let i = ch.objs.length - 1; i >= 0; i--) { const o = ch.objs[i]; if (!['tree', 'bush', 'hedge', 'rock', 'parked', 'bench'].includes(o.t)) continue; const c = canyonNear(o.x, o.z); if (!c || c.d > CR_HW + 2.2) continue; ch.objs.splice(i, 1); for (const cc of collidersNear(o.x, o.z).slice()) if ((cc.r && Math.abs(cc.x - o.x) < 0.01 && Math.abs(cc.z - o.z) < 0.01) || cc === o.col) removeCollider(cc); }
// Baywood Peak lookout: a car park on the summit with a railing, benches and a coin telescope
{ const gap = 120 * Math.PI / 180; addObj({ t: 'lookout', x: PEAK.x, z: PEAK.z });
  for (const ch of chunks.values()) for (let i = ch.objs.length - 1; i >= 0; i--) { const o = ch.objs[i]; if (['tree', 'bush', 'rock'].includes(o.t) && Math.hypot(o.x - PEAK.x, o.z - PEAK.z) < 13) { ch.objs.splice(i, 1); for (const cc of collidersNear(o.x, o.z).slice()) if (cc.r && Math.abs(cc.x - o.x) < 0.01 && Math.abs(cc.z - o.z) < 0.01) removeCollider(cc); } } // a clear summit
  for (let a = 0; a < Math.PI * 2; a += 0.22) { const c0 = canyonNear(PEAK.x + Math.cos(a) * 11.2, PEAK.z + Math.sin(a) * 11.2); if (c0 && c0.d < CR_HW + 1) continue; addCollider({ x: PEAK.x + Math.cos(a) * 11.2, z: PEAK.z + Math.sin(a) * 11.2, r: 0.5 }); }
  addCollider({ x: PEAK.x - 6, z: PEAK.z - 6, r: 0.45 }); }
// nothing growing through the metro viaduct or its stair towers
{ const M = METRO; for (let q = 0; q < M.len; q += 6) { const a = M.at(q); for (const o of objsNear(a.x - 6, a.z - 6, a.x + 6, a.z + 6)) if ((o.t === 'tree' && Math.hypot(o.x - a.x, o.z - a.z) < 5.5) || (o.t === 'bld' && Math.abs(o.x - a.x) < o.w / 2 + 3.2 && Math.abs(o.z - a.z) < o.d / 2 + 3.2 && o.h + (o.y || 0) > M.Y - 2.5)) { removeObj(o); if (o.cc) removeCollider(o.cc); else for (const cc of collidersNear(o.x, o.z).slice()) if (cc.r && Math.abs(cc.x - o.x) < 0.01 && Math.abs(cc.z - o.z) < 0.01) removeCollider(cc); } }
  for (const st of M.stations) { clearRect(st.tower.x - 3, st.tower.z - 3, st.tower.x + 3, st.tower.z + 3);
    const px = st.x + st.ox * 5.2, pz = st.z + st.oz * 5.2, hw = st.ox ? 2.4 : 16, hd = st.ox ? 16 : 2.4; // no building through a platform or a stair tower
    for (const o of objsNear(st.x - 40, st.z - 40, st.x + 40, st.z + 40)) if (o.t === 'bld' && ((Math.abs(o.x - px) < o.w / 2 + hw && Math.abs(o.z - pz) < o.d / 2 + hd && o.h > M.Y - 3) || (Math.abs(o.x - st.tower.x) < o.w / 2 + 2 && Math.abs(o.z - st.tower.z) < o.d / 2 + 2))) { removeObj(o); if (o.cc) removeCollider(o.cc); } }
}
// nothing parked or growing on the skyway ramps
for (const S of SKYWAYS) for (const [ua, ub] of [[S.a0, S.a0 + S.ramp], [S.a1 - S.ramp, S.a1]]) { const [xa, za] = skyXZ(S, ua, -SKY_HW - 0.5), [xb, zb] = skyXZ(S, ub, SKY_HW + 0.5); clearRect(Math.min(xa, xb), Math.min(za, zb), Math.max(xa, xb), Math.max(za, zb)); }
// tidy-up: no trees growing through buildings or on the railway
for (const c of chunks.values()) for (let i = c.objs.length - 1; i >= 0; i--) {
  const o = c.objs[i]; if (o.t !== 'tree') continue;
  if (onRail(o.x, o.z, 4) || RAIL.stations.some(st => Math.abs(o.x - st.x) < 18 && Math.abs(o.z - RAIL.z - 4) < 6)) { c.objs.splice(i, 1); for (const cc of collidersNear(o.x, o.z).slice()) if (cc.r && Math.abs(cc.x - o.x) < 0.01 && Math.abs(cc.z - o.z) < 0.01) removeCollider(cc); continue; }
  const hit = objsNear(o.x - 16, o.z - 16, o.x + 16, o.z + 16).some(b => b.t === 'bld' && Math.abs(o.x - b.x) < b.w / 2 + 1.2 && Math.abs(o.z - b.z) < b.d / 2 + 1.2);
  if (hit) { c.objs.splice(i, 1); for (const cc of collidersNear(o.x, o.z).slice()) if (cc.r && Math.abs(cc.x - o.x) < 0.01 && Math.abs(cc.z - o.z) < 0.01) removeCollider(cc); }
}
// tidy-up: fire-escape ladders and stairs whose building was cleared away (roads, parks, structures) go too
{
  const bldAt = (x, z) => objsNear(x - 40, z - 40, x + 40, z + 40).some(b => b.t === 'bld' && Math.abs(x - b.x) < b.w / 2 + 0.05 && Math.abs(z - b.z) < b.d / 2 + 0.05);
  for (let i = LADDERS.length - 1; i >= 0; i--) { const L = LADDERS[i]; if (bldAt(L.x, L.z - L.nz * 0.6)) continue; LADDERS.splice(i, 1); for (const o of objsNear(L.x - 1, L.z - 1, L.x + 1, L.z + 1)) if (o.t === 'ladder' && Math.abs(o.x - L.x) < 0.01 && Math.abs(o.z - L.z) < 0.01) removeObj(o); }
  for (const o of objsNear(WORLD.x0, WORLD.z0, WORLD.x1, WORLD.z1)) if ((o.t === 'tag' && !bldAt(o.x, o.z - o.sd * 0.6)) || (o.t === 'trash' && !bldAt(o.x, o.z - 1.0))) removeObj(o);
  for (const o of objsNear(WORLD.x0, WORLD.z0, WORLD.x1, WORLD.z1)) if (o.t === 'fstairs' && !bldAt(o.fl[0].x0 - 0.6, (o.fl[0].zmin + o.fl[0].zmax) / 2)) { removeObj(o); for (const S of o.fl) { const k = STAIRS.indexOf(S); if (k >= 0) STAIRS.splice(k, 1); } }
}
export function parkedIn(cx, cz) { return (chunks.get(ckey(cx, cz))?.objs || []).filter(o => o.t === 'parked'); }

// ---------------- collision
export function walkable(x, z, onFoot = true) {
  if (x < WORLD.x0 + 20 || x > WORLD.x1 - 6 || z < WORLD.z0 + 8 || z > WORLD.z1) return false;
  if (inR(PIER, x, z) || DOCKS.some(D => inR(D, x, z))) return true;
  return groundH(x, z) - dip(x, z) > (onFoot ? -1.7 : -1.2); // the highway cutting is dry land, not sea
}
export function onPier(x, z) { return inR(PIER, x, z) || DOCKS.some(D => inR(D, x, z)); }
// Push a circle out of static colliders. Returns true if it hit something.
export function resolve(pos, r, yFeet = 0) {
  let hit = false;
  for (const c of collidersNear(pos.x, pos.z)) {
    const py = pos.y || 0;
    if (c.deck ? py < 3 : c.under ? py > 3 : py > 3 && (c.r || (c.h || 99) < py - 0.3)) continue; // up on a skyway you only meet its parapets (and tall buildings)
    if (c.r) {
      const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), m = c.r + r;
      if (d < m && d > 1e-6) { pos.x = c.x + dx / d * m; pos.z = c.z + dz / d * m; hit = true; }
    } else {
      if (c.plane && yFeet > 3) continue;
      if (c.upper && yFeet < 2.4) continue;
      if (yFeet >= (c.h || 99)) continue;
      const nx = Math.max(c.x0, Math.min(pos.x, c.x1)), nz = Math.max(c.z0, Math.min(pos.z, c.z1));
      const dx = pos.x - nx, dz = pos.z - nz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); pos.x = nx + dx / d * r; pos.z = nz + dz / d * r; }
        else { // centre inside box: push out along the shallowest axis
          const l = pos.x - c.x0, rr = c.x1 - pos.x, t = pos.z - c.z0, b = c.z1 - pos.z, m = Math.min(l, rr, t, b);
          if (m === l) pos.x = c.x0 - r; else if (m === rr) pos.x = c.x1 + r; else if (m === t) pos.z = c.z0 - r; else pos.z = c.z1 + r;
        }
        hit = true;
      }
    }
  }
  return hit;
}
export function solidPoint(x, z, y) {
  for (const c of collidersNear(x, z)) {
    if (c.r) { if (Math.hypot(x - c.x, z - c.z) < c.r && y < 6) return c; }
    else if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1 && y < (c.h || 99)) return c;
  }
  return null;
}

// ---------------- materials & textures
function windowTextures() {
  const mk = () => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; return c; };
  const a = mk(), e = mk(), xa = a.getContext('2d'), xe = e.getContext('2d');
  xa.fillStyle = '#ecebe6'; xa.fillRect(0, 0, 64, 128);
  xe.fillStyle = '#000'; xe.fillRect(0, 0, 64, 128);
  for (let cx = 0; cx < 4; cx++) for (let cy = 0; cy < 8; cy++) {
    xa.fillStyle = '#4a5a70'; xa.fillRect(cx * 16 + 3, cy * 16 + 3, 10, 10);
    xa.fillStyle = 'rgba(255,255,255,.25)'; xa.fillRect(cx * 16 + 3, cy * 16 + 3, 4, 10);
    if (Math.random() < 0.45) { xe.fillStyle = ['#ffd27a', '#ffb35c', '#fff0c0', '#cfe8ff'][Math.floor(Math.random() * 4)]; xe.fillRect(cx * 16 + 3, cy * 16 + 3, 10, 10); }
  }
  const t1 = new THREE.CanvasTexture(a), t2 = new THREE.CanvasTexture(e);
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; }
  return [t1, t2];
}
const [winMap, winEmit] = windowTextures();
function radialTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#fff'); g.addColorStop(0.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = '#000'; x.fillRect(0, 0, 64, 64); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export const MATS = {
  solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02, flatShading: true }),
  win: new THREE.MeshStandardMaterial({ vertexColors: true, map: winMap, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.55, metalness: 0.1 }),
  glow: new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffd27a', emissiveIntensity: 0, roughness: 0.4 }),
  sign: new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffffff', emissiveIntensity: 0.15, roughness: 0.4 }),
  pool: new THREE.MeshBasicMaterial({ vertexColors: true, map: radialTex(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
};
// the ground (terrain, roads, pavements, lawns) gets world-space detail textures: grass blades, sand grain, slab joints, asphalt aggregate, crop rows
MATS.ground = groundMaterial(MATS.solid);
// leaves sway in the wind (canopies only; trunks stay put)
MATS.leaf = MATS.solid.clone(); MATS.leaf.flatShading = true;
export const WIND_U = { uWind: { value: 0 } };
MATS.leaf.userData.wind = sh => { sh.uniforms.uWind = WIND_U.uWind; sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { float ph = uWind * 1.6 + position.x * 0.21 + position.z * 0.17; float amp = 0.07 + 0.05 * sin(uWind * 0.37 + position.x * 0.05);
    transformed.x += sin(ph) * amp * clamp((position.y - 1.2) * 0.25, 0.0, 1.0); transformed.z += cos(ph * 0.8) * amp * 0.7 * clamp((position.y - 1.2) * 0.25, 0.0, 1.0); }`); };
MATS.leaf.onBeforeCompile = MATS.leaf.userData.wind;

// Interior-mapped windows: each window pane ray-casts into a fake room (walls, floor, ceiling, furniture,
// people, curtains), so you see into it with real parallax as the camera moves. Every room is different and
// about half light up at night. Called from the material's onBeforeCompile (needs vWP = world position).
// ---------------- water: animated ocean with shallows, wave crests and foam on the shore; rippling fountain/pool water
export const WATER_U = { uTime: { value: 0 }, uNight: { value: 0 } };
const WAVES = `
  float wh(vec2 p, float t) { return sin(p.x * 0.21 + t * 1.1) * 0.5 + sin(p.y * 0.17 - t * 1.4) * 0.6 + sin((p.x + p.y) * 0.37 + t * 1.9) * 0.25 + sin((p.x * 0.8 - p.y) * 0.9 - t * 2.6) * 0.12; }
  vec3 waveN(vec2 p, float t, float k) { float e = 0.35; float h = wh(p, t); return normalize(vec3(-(wh(p + vec2(e, 0.0), t) - h) / e * k, 1.0, -(wh(p + vec2(0.0, e), t) - h) / e * k)); }`;
export function makeOceanMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.28, metalness: 0.05, transparent: true, opacity: 1 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, WATER_U);
    sh.vertexShader = 'varying vec3 vWW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvWW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'varying vec3 vWW;\nuniform float uTime;\nuniform float uNight;\n' + WAVES + '\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float shore = 420.0 + 8.0 * sin(vWW.x / 53.0) + 4.0 * sin(vWW.x / 19.0); // where the sand dips under the water
        float d = vWW.z - shore;                                 // metres out to sea
        vec3 shallow = vec3(0.27, 0.86, 0.84), mid = vec3(0.12, 0.6, 0.82), deep = vec3(0.05, 0.3, 0.6);
        vec3 wc = mix(shallow, mid, smoothstep(0.0, 22.0, d)); wc = mix(wc, deep, smoothstep(20.0, 140.0, d));
        // rolling wave crests heading for the beach + foam where they break
        float crest = pow(max(0.0, sin(d * 0.42 + uTime * 1.6 + sin(vWW.x * 0.05) * 2.0)), 14.0) * (1.0 - smoothstep(6.0, 60.0, d));
        float surf = smoothstep(5.0, 0.0, d) * max(0.0, sin(vWW.x * 0.3 + uTime * 2.2 + d * 1.5)) * 0.5;
        float edge = smoothstep(1.4, 0.0, abs(d - 0.6 + sin(vWW.x * 0.2 + uTime * 1.3) * 0.8));
        float foam = clamp(crest * 0.55 + surf + edge * 0.85, 0.0, 1.0);
        float sparkle = pow(max(0.0, wh(vWW.xz * 2.3, uTime * 1.7) - 1.0), 6.0) * 0.4;
        wc = mix(wc, vec3(0.97, 0.99, 1.0), foam) + sparkle;
        wc *= mix(vec3(1.0), vec3(0.22, 0.28, 0.48), uNight);
        diffuseColor.rgb = wc;
        diffuseColor.a = mix(0.55, 0.94, smoothstep(0.0, 14.0, d)) + foam * 0.3;`)
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        { vec3 nW = waveN(vWW.xz, uTime, 0.12); normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz); }`);
  };
  return m;
}
const waterMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.88 });
waterMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, WATER_U);
  sh.vertexShader = 'varying vec3 vWW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvWW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  sh.fragmentShader = 'varying vec3 vWW;\nuniform float uTime;\nuniform float uNight;\n' + WAVES + '\n' + sh.fragmentShader
    .replace('#include <color_fragment>', `#include <color_fragment>
      float rip = sin(length(fract(vWW.xz * 0.25) - 0.5) * 40.0 - uTime * 5.0) * 0.5 + 0.5;
      vec3 wc = mix(vec3(0.2, 0.62, 0.86), vec3(0.45, 0.85, 0.98), rip * 0.35) + pow(max(0.0, wh(vWW.xz * 6.0, uTime * 3.0) - 0.9), 5.0) * 0.6;
      wc *= mix(vec3(1.0), vec3(0.3, 0.36, 0.6), uNight);
      diffuseColor.rgb = wc;`)
    .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
      { vec3 nW = waveN(vWW.xz * 5.0, uTime * 2.5, 0.06); normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz); }`);
};
MATS.water = waterMat;
MATS.sign.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor;'); };
export function windowShader(sh) {
  sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  {
    float nightF = clamp(emissive.r / 1.1, 0.0, 1.0);
    totalEmissiveRadiance = vec3(0.0);
    vec2 cuv = vMapUv * vec2(4.0, 8.0);
    vec2 cell = floor(cuv), f = fract(cuv);
    vec2 w = (f - 3.0 / 16.0) / (10.0 / 16.0);
    vec3 dp1 = dFdx(vWP), dp2 = dFdy(vWP); vec2 du1 = dFdx(vMapUv), du2 = dFdy(vMapUv);
    vec3 Nf = normalize(cross(dp1, dp2)); float facing = abs(dot(Nf, normalize(cameraPosition - vWP)));
    // walls seen nearly edge-on would shimmer with tiny windows: draw them as plain wall instead
    if (facing > 0.16 && w.x > 0.0 && w.x < 1.0 && w.y > 0.0 && w.y < 1.0) {
      vec3 N = Nf;
      if (dot(N, cameraPosition - vWP) < 0.0) N = -N;
      vec3 T = cross(dp2, N) * du1.x + cross(N, dp1) * du2.x;
      T = normalize(T - N * dot(N, T));
      vec3 Bt = vec3(0.0, 1.0, 0.0);
      vec3 V = normalize(vWP - cameraPosition);
      vec3 r = vec3(dot(V, T), dot(V, Bt), dot(V, N));
      r.z = min(r.z, -0.05);
      float key = mod(floor(dot(vWP, N) + 0.5), 97.0) + floor(vColor.r * 8.0 + 0.5) * 3.0 + floor(vColor.g * 8.0 + 0.5) * 7.0 + (abs(N.x) > 0.5 ? 50.0 : 0.0);
      vec2 sd = mod(cell + vec2(key * 3.1, key * 1.7), 289.0);
      #define H(o) fract(sin(mod(dot(sd + o, vec2(12.9898, 78.233)), 6.2831853)) * 43758.5453)
      float h1 = H(0.0), h2 = H(1.7), h3 = H(3.1), h4 = H(5.3), h5 = H(7.9), h6 = H(9.4);
      // room spans the whole 3 m cell; ray starts at the pane
      vec3 p = vec3(f, 0.0); float D = 0.9 + h5 * 0.5;
      float tx = ((r.x > 0.0 ? 1.0 : 0.0) - p.x) / (abs(r.x) < 1e-4 ? 1e-4 : r.x);
      float ty = ((r.y > 0.0 ? 1.0 : 0.0) - p.y) / (abs(r.y) < 1e-4 ? 1e-4 : r.y);
      float tz = (-D - p.z) / r.z;
      float t = min(min(tx, ty), tz);
      vec3 hp = p + r * t;
      vec3 wallC = mix(vec3(0.86, 0.83, 0.77), 0.55 + 0.4 * cos(6.2832 * (h1 + vec3(0.0, 0.33, 0.67))), 0.4);
      vec3 floorC = h2 < 0.5 ? vec3(0.55, 0.38, 0.24) : mix(vec3(0.45, 0.47, 0.5), vec3(0.6, 0.35, 0.35), h3);
      vec3 col; float depth = clamp(-hp.z / D, 0.0, 1.0);
      if (t == tz) {
        col = wallC;
        vec2 b = hp.xy; // picture / shelf / tv on back wall
        if (h3 > 0.45 && abs(b.x - (0.3 + h4 * 0.4)) < 0.14 && abs(b.y - 0.55) < 0.1) col = h3 > 0.8 ? vec3(0.08, 0.12, 0.2) : 0.5 + 0.5 * cos(6.2832 * (h4 + vec3(0.1, 0.4, 0.7)));
        if (h3 < 0.25 && b.y < 0.62 && abs(b.x - (0.2 + h4 * 0.6)) < 0.16) col = vec3(0.42, 0.28, 0.18) * (fract(b.y * 8.0) < 0.15 ? 0.6 : 1.0);
      } else if (t == ty) {
        col = r.y < 0.0 ? floorC * 0.8 : vec3(0.93, 0.92, 0.9);
        if (r.y > 0.0 && length(hp.xz - vec2(0.5, -D * 0.5)) < 0.12) col = vec3(1.6, 1.45, 1.1); // ceiling lamp
      } else col = wallC * 0.82;
      col *= mix(1.0, 0.55, depth);
      // rug on the floor
      if (t == ty && r.y < 0.0 && h6 > 0.35 && abs(hp.x - 0.5) < 0.3 && abs(hp.z + D * 0.55) < D * 0.25) col = (0.45 + 0.35 * cos(6.2832 * (h5 + vec3(0.0, 0.3, 0.6)))) * (abs(hp.x - 0.5) > 0.25 ? 0.7 : 1.0) * mix(1.0, 0.6, depth);
      // furniture block (sofa / desk / bed / counter): front face + top, so it reads from above
      { float zf = -D * (0.3 + h6 * 0.25), fd = D * (0.18 + h2 * 0.2), fx0 = 0.1 + h4 * 0.35, fwd = 0.3 + h2 * 0.3, fh = 0.2 + h5 * 0.18;
        vec3 fc = 0.4 + 0.45 * cos(6.2832 * (h6 + vec3(0.0, 0.3, 0.6)));
        float tf = zf / r.z; vec3 q = p + r * tf;
        float tt = (fh - p.y) / min(r.y, -1e-4); vec3 q2 = p + r * tt;
        if (tt > 0.0 && tt < t && q2.z < zf && q2.z > zf - fd && q2.x > fx0 && q2.x < fx0 + fwd) { col = fc * 1.05; t = tt; }
        else if (tf > 0.0 && tf < t && q.y < fh && q.y > 0.0 && q.x > fx0 && q.x < fx0 + fwd) { col = fc * 0.7; t = tf; }
        // plant in the corner
        if (h1 > 0.55 && tf > 0.0 && tf < t && q.x > 0.8 && q.x < 0.93 && q.y < 0.5) { col = q.y < 0.16 ? vec3(0.55, 0.32, 0.2) : vec3(0.22, 0.55, 0.28); t = tf; } }
      // a person standing in some rooms
      if (h5 > 0.72) { float zp = -D * 0.3, tp = zp / r.z; if (tp > 0.0 && tp < t) { vec3 q = p + r * tp; float px = 0.25 + h3 * 0.5;
        if ((abs(q.x - px) < 0.07 && q.y < 0.55 && q.y > 0.0) || length(vec2(q.x - px, q.y - 0.62)) < 0.06) col = mix(vec3(0.12, 0.1, 0.12), 0.4 + 0.4 * cos(6.2832 * (h2 + vec3(0.0, 0.3, 0.6))), step(q.y, 0.5) * (1.0 - nightF) * 0.6); } }
      // lighting: daylight vs lit / dark at night (warm, cool, or TV-blue rooms)
      float lit = step(0.48, h4);
      vec3 lampC = h6 < 0.15 ? vec3(0.45, 0.6, 1.2) : h6 < 0.4 ? vec3(1.0, 0.95, 0.9) : vec3(1.25, 0.92, 0.6);
      vec3 room = mix(col * 0.62, col * (lit > 0.5 ? lampC * 1.15 : vec3(0.035, 0.04, 0.07)), nightF);
      // blinds / curtains on the pane itself
      float blind = h2 > 0.82 ? 0.25 + h3 * 0.5 : 0.0;
      if (w.y > 1.0 - blind && fract(w.y * 14.0) < 0.75) room = mix(vec3(0.82, 0.8, 0.74) * 0.6, vec3(0.82, 0.8, 0.74) * lampC * lit * 0.8, nightF);
      float cw = h1 < 0.4 ? 0.12 + h5 * 0.1 : 0.0;
      if (w.x < cw || w.x > 1.0 - cw) { vec3 cc = 0.5 + 0.35 * cos(6.2832 * (h3 + vec3(0.0, 0.3, 0.6))); room = mix(cc * 0.55, cc * mix(0.05, 0.9, lit) * lampC, nightF); }
      // glass: reflection + frame mullion
      float fres = 0.1 + 0.55 * pow(1.0 - abs(r.z), 3.0);
      vec3 refl = mix(vec3(0.55, 0.68, 0.82), vec3(0.04, 0.05, 0.09), nightF);
      vec3 em = mix(room, refl, fres);
      if (abs(w.x - 0.5) < 0.025 || w.y < 0.03 || w.y > 0.97 || w.x < 0.03 || w.x > 0.97) { diffuseColor.rgb = vec3(0.22, 0.23, 0.26); }
      else { diffuseColor.rgb = vec3(0.02); totalEmissiveRadiance = em; roughnessFactor = 0.18; metalnessFactor = 0.0; }
    } else {
      // the wall between windows: brick courses on warm walls, curtain-wall spandrels on glass towers, render panels with
      // rain streaks on the rest; a ledge under every row of windows. Fades out with distance so nothing shimmers.
      vec3 vc = vColor.rgb; vec2 m = vMapUv * vec2(12.0, 24.0);
      float k = (1.0 - smoothstep(35.0, 110.0, length(vWP - cameraPosition))) * smoothstep(0.12, 0.35, facing), aa = max(fwidth(m.x), fwidth(m.y));
      float sh = 1.0;
      bool glassB = vc.b > vc.r * 1.12 && vc.b > 0.4;
      bool brick = !glassB && vc.r > vc.g * 1.18 && vc.r > vc.b * 1.35;
      if (brick) {
        vec2 bc = vec2(m.x / 0.62 + mod(floor(m.y / 0.21), 2.0) * 0.5, m.y / 0.21), bf = fract(bc);
        float mx = smoothstep(0.0, 0.07 + aa * 2.5, bf.x) * smoothstep(1.0, 0.93 - aa * 2.5, bf.x), my = smoothstep(0.0, 0.11 + aa * 6.0, bf.y) * smoothstep(1.0, 0.89 - aa * 6.0, bf.y);
        float bv = fract(sin(dot(floor(bc), vec2(12.9898, 78.233))) * 43758.5453);
        sh = mix(1.18, 0.9 + bv * 0.2, mx * my);
      } else if (glassB) {
        float band = step(f.y, 3.0 / 16.0) + step(13.0 / 16.0, f.y);
        sh = mix(1.0, 0.72, band); if (abs(f.x) < 0.02 || abs(f.x - 1.0) < 0.02) sh = 0.55;
      } else {
        vec2 pf = fract(m / vec2(1.5, 3.0)); float seam = min(smoothstep(0.0, 0.015 + aa * 0.7, pf.x), smoothstep(0.0, 0.01 + aa * 0.35, pf.y));
        float streak = (f.x > 3.0 / 16.0 && f.x < 13.0 / 16.0 && f.y < 3.0 / 16.0) ? 1.0 - (3.0 / 16.0 - f.y) * 1.6 : 1.0;
        float n = fract(sin(dot(floor(m * 2.0), vec2(127.1, 311.7))) * 43758.5453);
        sh = mix(0.86, 1.0, seam) * streak * (0.96 + n * 0.06);
      }
      float ledge = abs(f.y - 2.7 / 16.0) < 0.022 ? 1.22 : abs(f.y - 2.3 / 16.0) < 0.02 ? 0.72 : 1.0; // sill highlight with its shadow underneath
      diffuseColor.rgb *= mix(1.0, sh * ledge, k);
    }
  }`);
}

// ---------------- geometry builder
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _n = new THREE.Vector3();
const pick2 = (a, r) => a[Math.floor(r() * a.length)];
const BLOB_GEO = new THREE.IcosahedronGeometry(1, 1), _bc = new THREE.Color();
class GB {
  constructor() { this.sets = {}; }
  S(k) { return this.sets[k] || (this.sets[k] = { p: [], n: [], c: [], uv: [], gt: [] }); }
  tri(k, v0, v1, v2, color, center, uv) {
    _a.set(v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]); _b.set(v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]);
    _n.crossVectors(_a, _b).normalize();
    if (center) {
      const fx = (v0[0] + v1[0] + v2[0]) / 3 - center[0], fy = (v0[1] + v1[1] + v2[1]) / 3 - center[1], fz = (v0[2] + v1[2] + v2[2]) / 3 - center[2];
      if (_n.x * fx + _n.y * fy + _n.z * fz < 0) { const t = v1; v1 = v2; v2 = t; _n.negate(); if (uv) uv = [uv[0], uv[2], uv[1]]; }
    }
    const s = this.S(k), cc = col(color);
    for (const v of [v0, v1, v2]) { s.p.push(v[0], v[1], v[2]); s.n.push(_n.x, _n.y, _n.z); s.c.push(cc.r, cc.g, cc.b); }
    if (uv) for (const u of uv) s.uv.push(u[0], u[1]); else s.uv.push(0, 0, 0, 0, 0, 0);
    if (k === 'ground') { const g = this.gt || GT.auto; s.gt.push(g, g, g); }
  }
  quad(k, v0, v1, v2, v3, color, center, uv) {
    this.tri(k, v0, v1, v2, color, center, uv && [uv[0], uv[1], uv[2]]);
    this.tri(k, v0, v2, v3, color, center, uv && [uv[0], uv[2], uv[3]]);
  }
  // box with bottom at y. rot about Y. sideKey/topCol let buildings use window walls.
  box(x, y, z, w, h, d, color, o = {}) {
    y += this.oy || 0;
    const k = o.key || 'solid', sideKey = o.sideKey || k, topCol = o.topCol || color, topKey = o.topKey || k;
    const cs = Math.cos(o.rot || 0), sn = Math.sin(o.rot || 0);
    const P = (lx, ly, lz) => [x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs];
    const hw = w / 2, hd = d / 2, ctr = [x, y + h / 2, z];
    const c = [P(-hw, 0, -hd), P(hw, 0, -hd), P(hw, 0, hd), P(-hw, 0, hd), P(-hw, h, -hd), P(hw, h, -hd), P(hw, h, hd), P(-hw, h, hd)];
    const uvs = (fw) => o.uv ? [[0, 0], [fw / 12, 0], [fw / 12, h / 24], [0, h / 24]] : null;
    this.quad(sideKey, c[3], c[2], c[6], c[7], color, ctr, uvs(w));   // +z
    this.quad(sideKey, c[1], c[0], c[4], c[5], color, ctr, uvs(w));   // -z
    this.quad(sideKey, c[2], c[1], c[5], c[6], color, ctr, uvs(d));   // +x
    this.quad(sideKey, c[0], c[3], c[7], c[4], color, ctr, uvs(d));   // -x
    this.quad(topKey, c[4], c[5], c[6], c[7], topCol, ctr);
  }
  prism(x, y, z, w, h, d, color, rot = 0) { // ridge along the longer side
    y += this.oy || 0;
    const along = w >= d;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const P = (lx, ly, lz) => [x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs];
    const hw = w / 2, hd = d / 2, ctr = [x, y + 0.01, z];
    if (along) {
      const a = P(-hw, 0, -hd), b = P(hw, 0, -hd), c2 = P(hw, 0, hd), d2 = P(-hw, 0, hd), r0 = P(-hw, h, 0), r1 = P(hw, h, 0);
      this.quad('solid', a, b, r1, r0, color, ctr); this.quad('solid', d2, c2, r1, r0, color, ctr);
      this.tri('solid', a, d2, r0, color, ctr); this.tri('solid', b, c2, r1, color, ctr);
    } else {
      const a = P(-hw, 0, -hd), b = P(hw, 0, -hd), c2 = P(hw, 0, hd), d2 = P(-hw, 0, hd), r0 = P(0, h, -hd), r1 = P(0, h, hd);
      this.quad('solid', a, d2, r1, r0, color, ctr); this.quad('solid', b, c2, r1, r0, color, ctr);
      this.tri('solid', a, b, r0, color, ctr); this.tri('solid', d2, c2, r1, color, ctr);
    }
  }
  cone(x, y, z, r, h, color, seg = 6, k = 'solid') {
    y += this.oy || 0;
    const apex = [x, y + h, z], ctr = [x, y + h * 0.3, z];
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      this.tri(k, [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], apex, color, ctr);
    }
  }
  // a lumpy leafy blob: icosphere with jittered radius; faces facing up are a touch lighter, underneath darker
  blob(x, y, z, rx, ry, rz, color, seed = 1, k = 'leaf') {
    y += this.oy || 0;
    const G = BLOB_GEO, P = G.attributes.position, idx = [], ctr = [x, y, z];
    const base = col(color), jit = (vx, vy, vz) => 0.82 + 0.36 * (Math.sin(vx * 12.9 + vy * 78.2 + vz * 37.7 + seed * 3.1) * 0.5 + 0.5);
    for (let i = 0; i < P.count; i++) { const vx = P.getX(i), vy = P.getY(i), vz = P.getZ(i), j = jit(vx, vy, vz); idx.push([x + vx * rx * j, y + vy * ry * j, z + vz * rz * j, vy]); }
    for (let i = 0; i < P.count; i += 3) {
      const a = idx[i], b = idx[i + 1], c = idx[i + 2], up = (a[3] + b[3] + c[3]) / 3, f = 0.8 + up * 0.22 + (Math.sin(i * 1.7 + seed) * 0.05);
      const cc = '#' + _bc.copy(base).multiplyScalar(f).getHexString();
      this.tri(k, a, b, c, cc, ctr);
    }
  }
  cyl(x, y, z, r, h, color, seg = 8, k = 'solid', topCol) {
    y += this.oy || 0;
    const ctr = [x, y + h / 2, z];
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      const p0 = [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r];
      const q0 = [p0[0], y + h, p0[2]], q1 = [p1[0], y + h, p1[2]];
      this.quad(k, p0, p1, q1, q0, color, ctr);
      this.tri(k, q0, q1, [x, y + h, z], topCol || color, [x, y, z]);
    }
  }
  flat(x, y, z, w, d, color, k = 'solid', rot = 0) {
    y += this.oy || 0;
    const cs = Math.cos(rot), sn = Math.sin(rot), P = (lx, lz) => [x + lx * cs + lz * sn, y, z - lx * sn + lz * cs];
    this.quad(k, P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2), color, [x, y - 1, z]);
  }
  pool(x, y, z, r, color) {
    const a = [x - r, y, z - r], b = [x + r, y, z - r], c = [x + r, y, z + r], d = [x - r, y, z + r];
    this.quad('pool', a, b, c, d, color, [x, y - 1, z], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  disc(x, y, z, r, color, k, seg = 10) {
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
      this.tri(k, [x, y, z], [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], color, [x, y - 1, z]);
    }
  }
  meshes() {
    const out = [];
    for (const [k, s] of Object.entries(this.sets)) {
      if (!s.p.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(s.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(s.n, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(s.c, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2));
      if (k === 'ground') g.setAttribute('gtype', new THREE.Float32BufferAttribute(s.gt, 1));
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, MATS[k]);
      m.castShadow = k === 'solid' || k === 'win' || k === 'leaf'; m.receiveShadow = k !== 'pool';
      out.push(m);
    }
    return out;
  }
}

// ---------------- object drawing
function shadeHex(h, k) { const c = new THREE.Color(h).multiplyScalar(k); return '#' + c.getHexString(); }
function drawObj(o, B) {
  const r = mkRng(hash(o.x * 10 | 0, o.z * 10 | 0, 99));
  switch (o.t) {
    case 'slab': B.gt = GT.auto; B.box(o.x, o.y || 0, o.z, o.w, o.h, o.d, o.col, { topKey: 'ground' }); break;
    case 'paint': if (o.col) B.flat(o.x, o.y ?? 0.19, o.z, o.w, o.d, o.col); break;
    case 'bld': {
      const y0 = 0.15 + (o.y || 0);
      if (o.roof === 'pitch') {
        B.box(o.x, y0, o.z, o.w, o.h, o.d, o.col, o.plain ? {} : { sideKey: 'win', uv: true, topCol: o.col });
        B.prism(o.x, y0 + o.h, o.z, o.w + 0.6, o.roofH, o.d + 0.6, o.roofCol);
        if (o.door) { // door sits in the wall gap between two window columns (windows repeat every 3 m from the left edge)
          const dx = o.x - o.w / 2 + 3 * Math.max(1, Math.round(o.w / 6));
          B.box(dx, y0, o.z + o.d / 2 + 0.02, 1.12, 2.45, 0.06, o.col); // plain wall patch
          B.box(dx, y0, o.z + o.d / 2 + 0.05, 0.95, 2.1, 0.08, '#6b4a33'); B.box(dx + 0.3, y0 + 1.0, o.z + o.d / 2 + 0.1, 0.08, 0.08, 0.04, '#d4af37');
        }
      } else {
        B.box(o.x, y0, o.z, o.w, o.h, o.d, o.glass ? '#bfe0f0' : o.col, { sideKey: 'win', uv: true, topCol: '#8d8a86' });
        B.box(o.x, y0 + o.h, o.z, o.w + 0.3, 0.5, o.d + 0.3, o.col);
        if (o.awning) B.box(o.x, 2.6, o.z + o.d / 2 + 0.6, o.w * 0.8, 0.15, 1.3, ['#e23b3b', '#2f80ed', '#1fb5a8', '#ff8a2a', '#3a3d45'][Math.floor(r() * 5)]);
        const top = y0 + o.h + 0.5;
        if (o.top === 'ac') for (let i = 0; i < 3; i++) B.box(o.x + (r() - 0.5) * o.w * 0.6, top, o.z + (r() - 0.5) * o.d * 0.6, 2.2, 1.2, 1.6, '#9a9aa2');
        if (o.top === 'tank') { B.cyl(o.x + o.w * 0.2, top + 1.5, o.z, 1.6, 2.4, '#8a6a4a', 8); for (const s of [-1, 1]) B.box(o.x + o.w * 0.2 + s, top, o.z, 0.2, 1.5, 0.2, '#555'); }
        if (o.top === 'antenna') { B.box(o.x, top, o.z, 0.4, 5, 0.4, '#777'); B.box(o.x, top + 5, o.z, 0.6, 0.6, 0.6, '#ff3a3a', { key: 'glow' }); }
        if (o.top === 'setback') { const sw = o.w * 0.6, sd = o.d * 0.6, sh = Math.min(6, o.h * 0.25); B.box(o.x, top, o.z, sw, sh, sd, o.col, { sideKey: 'win', uv: true, topCol: '#8d8a86' }); }
        if (o.top === 'helipad') { B.cyl(o.x, top, o.z, Math.min(o.w, o.d) * 0.35, 0.15, '#3a3d45', 12); B.flat(o.x, top + 0.17, o.z, 1, 4, '#ffd23f'); B.flat(o.x - 1.4, top + 0.17, o.z, 0.6, 4.6, '#ffd23f'); B.flat(o.x + 1.4, top + 0.17, o.z, 0.6, 4.6, '#ffd23f'); }
        if (o.top === 'tower') { B.box(o.x, top, o.z, 10, 4, 10, '#7fc4e8', { topCol: '#d8d8d8' }); B.box(o.x, top + 4, o.z, 11, 0.6, 11, '#d8d8d8'); B.box(o.x, top + 4.6, o.z, 0.3, 4, 0.3, '#777'); B.box(o.x, top + 8.6, o.z, 0.5, 0.5, 0.5, '#ff3a3a', { key: 'glow' }); }
      }
      break;
    }
    case 'tree': {
      const s = o.s, yb = groundH(o.x, o.z), sd = o.x * 0.37 + o.z * 0.91;
      const trunk = (h, rr, c = '#6e4c31') => { B.cyl(o.x, yb, o.z, rr * s, h * s * 0.55, c, 7); B.cyl(o.x, yb + h * s * 0.55, o.z, rr * 0.72 * s, h * s * 0.47, c, 7); };
      const greens = ['#3f8a3c', '#4a9a42', '#3a7f39', '#56a64a', '#447f3a'];
      if (o.kind === 'palm') {
        let px = o.x, pz = o.z; const la = r() * 6.28, lean = 0.18 + r() * 0.2, h = 5.8 * s, n = 7;
        for (let i = 0; i < n; i++) { const t = i / n, w = (0.42 - t * 0.12) * s; B.cyl(px, yb + t * h, pz, w, h / n + 0.04, i % 2 ? '#9a7a52' : '#87683f', 7); px += Math.cos(la) * lean * t * h / n; pz += Math.sin(la) * lean * t * h / n; }
        const tx = px, ty = yb + h, tz = pz; B.blob(tx, ty + 0.05, tz, 0.45 * s, 0.35 * s, 0.45 * s, '#6b5a34', sd); // coconuts and crown
        for (let i = 0; i < 9; i++) { // fronds droop out from the crown in three segments
          const a = i / 9 * Math.PI * 2 + r() * 0.4, L = (2.6 + r() * 0.8) * s, cA = Math.cos(a), sA = Math.sin(a), nx = -sA, nz = cA; let x0 = tx, y0 = ty, z0 = tz, w0 = 0.12 * s;
          const c1 = i % 2 ? '#3f9a45' : '#4fb050';
          for (let k2 = 1; k2 <= 3; k2++) { const t = k2 / 3, x1 = tx + cA * L * t, z1 = tz + sA * L * t, y1 = ty + 0.35 * s - t * t * 1.5 * s, w1 = (k2 === 3 ? 0.05 : 0.42 - t * 0.1) * s;
            B.quad('leaf', [x0 - nx * w0, y0, z0 - nz * w0], [x1 - nx * w1, y1, z1 - nz * w1], [x1 + nx * w1, y1, z1 + nz * w1], [x0 + nx * w0, y0, z0 + nz * w0], c1, [ (x0 + x1) / 2, y1 - 3, (z0 + z1) / 2 ]); x0 = x1; y0 = y1; z0 = z1; w0 = w1; }
        }
      } else if (o.kind === 'pine') {
        trunk(1.6, 0.2, '#5e4130');
        const tiers = 4, g0 = ['#2c5f35', '#2f6b3a', '#336f3c'][Math.floor(r() * 3)];
        for (let i = 0; i < tiers; i++) { const t = i / tiers, rr = (2.0 - t * 1.45) * s, hh = (2.0 - t * 0.5) * s; B.cone(o.x + (r() - 0.5) * 0.1, yb + (1.0 + t * 3.1) * s, o.z + (r() - 0.5) * 0.1, rr, hh, i % 2 ? g0 : '#3a7d44', 8, 'leaf'); }
      } else {
        const v = r();
        if (v < 0.22) { // birch: slim white trunk with dark marks, small light canopy
          B.cyl(o.x, yb, o.z, 0.16 * s, 3.2 * s, '#e8e4dc', 7);
          for (let i = 0; i < 4; i++) B.box(o.x + 0.15 * s, yb + (0.5 + i * 0.7) * s, o.z, 0.04, 0.08 * s, 0.14 * s, '#2a2a2a');
          for (let i = 0; i < 3; i++) B.blob(o.x + (r() - 0.5) * 1.2 * s, yb + (3.0 + r() * 1.0) * s, o.z + (r() - 0.5) * 1.2 * s, (0.9 + r() * 0.4) * s, (1.0 + r() * 0.4) * s, (0.9 + r() * 0.4) * s, pick2(['#7cb85a', '#8cc463', '#6fae52'], r), sd + i);
        } else { // broadleaf: trunk, a big crown and lumps around it; the odd cherry blossom in spring pink
          const blossom = v > 0.93, gc = blossom ? '#f3a6c4' : greens[Math.floor(r() * greens.length)], gc2 = blossom ? '#f7c3d7' : greens[Math.floor(r() * greens.length)];
          trunk(2.0, 0.24);
          B.blob(o.x, yb + 3.0 * s, o.z, 1.7 * s, 1.35 * s, 1.7 * s, gc, sd);
          const n = 3 + Math.floor(r() * 3);
          for (let i = 0; i < n; i++) { const a = i / n * 6.28 + r(), d = (0.9 + r() * 0.5) * s; B.blob(o.x + Math.cos(a) * d, yb + (2.4 + r() * 1.3) * s, o.z + Math.sin(a) * d, (0.95 + r() * 0.4) * s, (0.8 + r() * 0.3) * s, (0.95 + r() * 0.4) * s, i % 2 ? gc : gc2, sd + i * 7); }
          B.blob(o.x + (r() - 0.5) * 0.5 * s, yb + 4.1 * s, o.z + (r() - 0.5) * 0.5 * s, 1.0 * s, 0.8 * s, 1.0 * s, gc2, sd + 31);
        }
      }
      break;
    }
    case 'pool':
      B.box(o.x, o.y, o.z, o.w + 2, 0.3, o.d + 2, '#ece6da');
      B.flat(o.x, o.y + 0.32, o.z, o.w, o.d, '#ffffff', 'water');
      break;
    case 'tag': { // spray-painted tag: a few chunky colour strokes with a dark outline
      const R = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(o.seed || 7), cols = ['#ff3bd2', '#38e8ff', '#ffd23f', '#4cd964', '#ff8a2a', '#9b51e0', '#e23b3b', '#ffffff'], c1 = cols[Math.floor(R() * cols.length)], c2 = cols[Math.floor(R() * cols.length)], zz = o.z + o.sd * 0.02;
      B.box(o.x, 0.55, o.z, o.w + 0.3, 1.25, 0.03, '#16161b');
      const n = 3 + Math.floor(R() * 3); for (let i = 0; i < n; i++) { const lx = o.x - o.w / 2 + (i + 0.5) * (o.w / n), hh = 0.6 + R() * 0.45; B.box(lx, 0.7 + R() * 0.2, zz, o.w / n * 0.7, hh, 0.035, i % 2 ? c1 : c2); }
      if (R() < 0.5) B.box(o.x, 0.62, zz + o.sd * 0.005, o.w * 0.9, 0.08, 0.04, c2); // underline drip
      break; }
    case 'trash': { const R = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(o.seed || 7); for (let i = 0; i < 3; i++) B.box(o.x + (R() - 0.5) * 1.6, 0.17, o.z + (R() - 0.5) * 0.6, 0.55 + R() * 0.3, 0.45 + R() * 0.2, 0.5, R() < 0.6 ? '#1e2a1e' : '#16161b'); break; }
    case 'prop': { // kerbside street furniture
      const x = o.x, z = o.z, rot = o.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot), L = (a, b) => [x + a * cs + b * sn, z - a * sn + b * cs];
      if (o.k === 'bin') { B.cyl(x, 0.15, z, 0.28, 0.9, '#2f5a3a', 8); B.cyl(x, 1.05, z, 0.31, 0.08, '#24452c', 8); }
      else if (o.k === 'hydrant') { B.cyl(x, 0.15, z, 0.15, 0.55, '#d63a2f', 7); B.cyl(x, 0.7, z, 0.11, 0.12, '#d63a2f', 7); B.box(x, 0.45, z, 0.42, 0.1, 0.1, '#b82f25'); }
      else if (o.k === 'mailbox') { B.box(x, 0.15, z, 0.12, 0.9, 0.12, '#3a3d45'); B.box(x, 1.05, z, 0.3, 0.3, 0.45, '#2f6fd8', { rot }); }
      else if (o.k === 'newsbox') { B.box(x, 0.15, z, 0.5, 0.95, 0.45, ['#e23b3b', '#2f80ed', '#ffd23f'][o.seed % 3], { rot }); const [a, b] = L(0, 0.24); B.box(a, 0.75, b, 0.38, 0.3, 0.02, '#cfe8ff', { rot }); }
      else if (o.k === 'bikerack') { for (let i = -1; i <= 1; i++) { const [a, b] = L(i * 0.45, 0); B.box(a, 0.15, b, 0.05, 0.7, 0.5, '#8a8f99', { rot }); } if (o.seed % 2) { const [a, b] = L(0.45, 0.05); B.box(a, 0.15, b, 0.06, 0.55, 1.6, '#e23b3b', { rot }); B.cyl(a, 0.15, b + 0.6, 0.3, 0.05, '#16161b', 10); } }
      else if (o.k === 'planter') { B.box(x, 0.15, z, 1.0, 0.5, 1.0, '#9a8f86'); B.box(x, 0.62, z, 0.9, 0.08, 0.9, '#5a3f2a'); for (let i = 0; i < 5; i++) { const R2 = mkRng(o.seed + i); B.blob(x + (R2() - 0.5) * 0.6, 0.85, z + (R2() - 0.5) * 0.6, 0.2, 0.18, 0.2, ['#ff6fb5', '#ffd23f', '#e23b3b', '#b26bff', '#ffffff'][(o.seed + i) % 5], o.seed + i); } B.blob(x, 0.8, z, 0.42, 0.25, 0.42, '#4f9a45', o.seed); }
      else if (o.k === 'bollards') { for (let i = -1; i <= 1; i++) { const [a, b] = L(i * 1.1, 0); B.cyl(a, 0.15, b, 0.1, 0.8, '#3a3d45', 7); B.cyl(a, 0.75, b, 0.11, 0.06, '#ffd23f', 7); } }
      else if (o.k === 'phonebox') { B.box(x, 0.15, z, 0.95, 2.4, 0.95, '#c8261f', { rot }); B.box(x, 2.55, z, 1.05, 0.2, 1.05, '#a01f1a'); const [a, b] = L(0, 0.49); B.box(a, 0.6, b, 0.7, 1.5, 0.02, '#cfe8ff', { rot }); }
      else if (o.k === 'busstop') { // shelter facing the road: back wall, roof, bench, timetable
        const [ba, bb] = L(0, -0.45); B.box(ba, 0.15, bb, 3.2, 2.3, 0.06, '#cfe8ff', { rot }); B.box(x, 2.45, z, Math.abs(sn) > 0.5 ? 1.2 : 3.4, 0.1, Math.abs(sn) > 0.5 ? 3.4 : 1.2, '#3a3d45');
        for (const e of [-1.6, 1.6]) { const [a, b] = L(e, -0.45); B.box(a, 0.15, b, 0.08, 2.3, 0.08, '#3a3d45'); }
        const [ca, cb] = L(0, -0.15); B.box(ca, 0.55, cb, 2.2, 0.08, 0.4, '#6b4a33', { rot }); const [da, db] = L(1.4, -0.38); B.box(da, 0.9, db, 0.6, 0.9, 0.04, '#ffd23f', { rot });
      }
      break;
    }
    case 'bush': { const sd = o.seed || 1, R2 = mkRng((sd % 9973) / 9973 + 0.01), g = ['#3f8a3c', '#4a9a42', '#56a64a', '#3a7f39'][sd % 4], yb = groundH(o.x, o.z) + 0.15;
      for (let i = 0; i < 3; i++) B.blob(o.x + (R2() - 0.5) * 0.7 * o.s, yb + 0.35 * o.s, o.z + (R2() - 0.5) * 0.7 * o.s, 0.55 * o.s, 0.45 * o.s, 0.55 * o.s, g, sd + i);
      if (o.flowers) for (let i = 0; i < 6; i++) B.blob(o.x + (R2() - 0.5) * 0.9 * o.s, yb + (0.6 + R2() * 0.25) * o.s, o.z + (R2() - 0.5) * 0.9 * o.s, 0.1, 0.09, 0.1, ['#ff6fb5', '#ffd23f', '#ffffff', '#e23b3b', '#b26bff'][(sd + i) % 5], sd + i * 3);
      break; }
    case 'hedge': { const yb = groundH(o.x, o.z) + 0.15; B.box(o.x, yb, o.z, o.w, 0.85, 0.7, '#3f7d3a', { key: 'leaf' }); for (let i = 0; i < Math.floor(o.w / 1.2); i++) B.blob(o.x - o.w / 2 + 0.6 + i * 1.2, yb + 0.9, o.z, 0.62, 0.32, 0.4, i % 2 ? '#4a8f42' : '#3f7d3a', (o.seed || 1) + i); break; }
    case 'via': { const Y = METRO.Y, o2 = { rot: o.h }, L = o.len || 4.15; B.box(o.x, Y - 0.5, o.z, 6.2, 0.7, L, '#b9b4aa', o2); // deck
      const cs = Math.cos(o.h), sn = Math.sin(o.h); for (const sx of [-3.0, 3.0]) B.box(o.x + cs * sx, Y + 0.2, o.z - sn * sx, 0.25, 0.9, L, '#d2cec6', o2); // parapets
      for (const sx of [-0.75, 0.75]) B.box(o.x + cs * sx, Y + 0.2, o.z - sn * sx, 0.12, 0.14, L, '#6a6d74', o2); // rails
      B.box(o.x, Y - 0.85, o.z, 4.2, 0.35, L, '#8f8b84', o2); break; }
    case 'skydeck': { if (o.skip) break; const S = SKYWAYS.find(q => q.id === o.S), Y = S.y, ax = S.axis === 'x', L = o.len + 0.02, W = 12.8, bw = ax ? L : W, bd = ax ? W : L;
      B.box(o.x, Y - 0.55, o.z, bw, 0.55, bd, '#b9b4aa', { topCol: '#4a4a52' }); // deck slab with an asphalt top
      B.box(o.x, Y - 1.05, o.z, ax ? L : 8.4, 0.5, ax ? 8.4 : L, '#9e9a92'); // box girder underneath
      if (!o.cross) { for (const sw of [-1, 1]) { const px = ax ? o.x : o.x + sw * 6.2, pz = ax ? o.z + sw * 6.2 : o.z; B.box(px, Y, pz, ax ? L : 0.36, 0.95, ax ? 0.36 : L, '#d8d3ca'); B.box(px, Y + 0.95, pz, ax ? L : 0.44, 0.08, ax ? 0.44 : L, '#9e9a92'); // parapets
          const ex = ax ? o.x : o.x + sw * 5.3, ez = ax ? o.z + sw * 5.3 : o.z; B.box(ex, Y, ez, ax ? L : 0.14, 0.012, ax ? 0.14 : L, '#f2d14a'); } // yellow edge lines
        if (Math.round(o.u / 4) % 2 === 0) B.box(o.x, Y, o.z, ax ? 2.2 : 0.16, 0.012, ax ? 0.16 : 2.2, '#f2f2ee'); } // dashed centre line
      break; }
    case 'lookout': { const T = PEAK.y + 0.05, gap = 120 * Math.PI / 180;
      for (let a = 0; a < Math.PI * 2; a += 0.22) { const c0 = canyonNear(o.x + Math.cos(a) * 11.2, o.z + Math.sin(a) * 11.2); if (c0 && c0.d < CR_HW + 1) continue; const px = o.x + Math.cos(a) * 11.2, pz = o.z + Math.sin(a) * 11.2; B.box(px, T, pz, 0.14, 1.05, 0.14, '#3a3d45'); B.box(px, T + 1.0, pz, 2.5, 0.08, 0.12, '#c9a24a', { rot: -a + Math.PI / 2 }); } // railing
      B.gt = GT.asphalt; for (let k = 0; k < 28; k++) { const a0 = k / 28 * Math.PI * 2, a1 = (k + 1) / 28 * Math.PI * 2, R2 = 10.8; B.tri('ground', [o.x, T + 0.12, o.z], [o.x + Math.cos(a0) * R2, T + 0.12, o.z + Math.sin(a0) * R2], [o.x + Math.cos(a1) * R2, T + 0.12, o.z + Math.sin(a1) * R2], '#4b4b53', [o.x, -100, o.z]); } // tarmac car park
      for (let i = -2; i <= 2; i++) B.box(o.x + i * 2.8, T + 0.12, o.z + 3, 0.12, 0.014, 4.6, '#e8e8e2'); // parking bays
      B.box(o.x - 6, T, o.z - 6, 0.16, 1.1, 0.16, '#3a3d45'); B.box(o.x - 6, T + 1.1, o.z - 6, 0.34, 0.3, 0.7, '#2f80ed', { rot: Math.PI / 4 }); // coin telescope
      for (const [bx, bz, r] of [[-1.5, -8.6, 0], [4.5, -7.6, 0.5]]) { B.box(o.x + bx, T + 0.42, o.z + bz, 1.8, 0.1, 0.5, '#9a6a3a', { rot: r }); B.box(o.x + bx, T, o.z + bz, 1.6, 0.42, 0.3, '#3a3d45', { rot: r }); } // benches
      B.box(o.x + 7.5, T, o.z + 6.5, 0.14, 2.2, 0.14, '#3a3d45'); B.box(o.x + 7.5, T + 2.1, o.z + 6.5, 3.2, 0.9, 0.12, '#1f6b3a', { rot: -0.5 }); // BAYWOOD PEAK sign board
      break; }
    case 'skypillar': { const S = SKYWAYS.find(q => q.id === o.S), Y = S.y, ax = S.axis === 'x';
      for (const sw of [-1, 1]) { const lx = ax ? o.x : o.x + sw * 7.3, lz = ax ? o.z + sw * 7.3 : o.z; B.box(lx, 0.15, lz, 1.0, Y - 0.6, 1.0, '#aaa59d'); B.box(lx, 0.15, lz, 1.4, 0.3, 1.4, '#8f8b84'); B.box(lx, 0.6, lz, 1.04, 0.22, 1.04, '#f2d14a'); } // legs on the pavement, with a yellow band
      B.box(o.x, Y - 1.45, o.z, ax ? 1.2 : 15.6, 0.9, ax ? 15.6 : 1.2, '#9e9a92'); break; } // crossbeam over the whole road
    case 'cactus': { const gy = groundH(o.x, o.z) - 0.1, S2 = o.s, c = '#3f7d3a'; B.box(o.x, gy, o.z, 0.55 * S2, 4.2 * S2, 0.55 * S2, c);
      if (o.arms > 0) { B.box(o.x + 0.55 * S2, gy + 1.6 * S2, o.z, 0.9 * S2, 0.42 * S2, 0.42 * S2, c); B.box(o.x + 0.95 * S2, gy + 1.6 * S2, o.z, 0.42 * S2, 1.6 * S2, 0.42 * S2, c); }
      if (o.arms > 1) { B.box(o.x - 0.55 * S2, gy + 2.2 * S2, o.z, 0.9 * S2, 0.42 * S2, 0.42 * S2, c); B.box(o.x - 0.95 * S2, gy + 2.2 * S2, o.z, 0.42 * S2, 1.3 * S2, 0.42 * S2, c); } break; }
    case 'boulder': { const gy = groundH(o.x, o.z) - 0.4; B.box(o.x, gy, o.z, o.w, o.h + 0.4, o.w * 0.8, '#9a5a3a', { rot: o.x * 0.37 }); B.box(o.x + o.w * 0.2, gy + o.h * 0.7, o.z, o.w * 0.6, o.h * 0.5, o.w * 0.5, '#b0683f', { rot: o.z * 0.29 }); break; }
    case 'lighthouse': { const gy = groundH(o.x, o.z); for (let k = 0; k < 6; k++) B.cyl(o.x, gy + k * 3.4, o.z, 2.6 - k * 0.2, 3.4, k % 2 ? '#c9302c' : '#f4f1ea', 12); B.cyl(o.x, gy + 20.4, o.z, 1.6, 2.2, '#fff1c4', 10, 'glow'); B.cyl(o.x, gy + 22.6, o.z, 2, 0.5, '#2a2a2e', 10); break; } // red and white bands, a lamp room on top
    case 'neon': { B.box(o.x, 0, o.z, 0.5, o.h, 0.5, '#3a3d45'); B.box(o.x, o.h, o.z, 0.7, 4.2, 5.2, o.col, { key: 'glow' }); B.box(o.x, o.h + 4.2, o.z, 0.7, 1.4, 3.6, o.col2, { key: 'glow' }); B.box(o.x, o.h - 0.3, o.z, 0.9, 0.3, 5.6, '#2a2a2e'); break; } // a tall neon sign on a pole
    case 'otank': { B.cyl(o.x, 0, o.z, o.r, o.h, '#dcdcd8', 16, 'solid', '#c4c4c0'); B.cyl(o.x, o.h * 0.45, o.z, o.r + 0.05, 0.6, '#c9302c', 16); B.box(o.x + o.r - 0.1, 0, o.z, 0.3, o.h + 0.6, 0.3, '#6a6d74'); break; } // fuel tank with a red band and a ladder
    case 'quaywall': { B.box(o.x, 0, o.z, o.w, 0.6, o.d, '#c9c4ba'); const along = o.w > o.d, L = along ? o.w : o.d; for (let i = -L / 2 + 4; i < L / 2; i += 12) B.cyl(o.x + (along ? i : 0), 0.6, o.z + (along ? 0 : i), 0.25, 0.4, '#2a2a2e', 6); break; } // edge kerb with bollards
    case 'ship': { const x = o.x, z = o.z; // a cargo ship: dark hull, red waterline, white bridge at the stern, containers stacked on deck
      B.box(x, -2.5, z, 96, 6.5, 16, '#1f2a3a'); B.box(x, -0.95, z, 96.2, 0.6, 16.2, '#a8242a'); B.box(x + 50, -2, z, 5, 5.9, 9, '#1f2a3a');
      B.box(x - 40, 4, z, 12, 9, 14, '#f2efe6'); B.box(x - 40, 13, z, 14, 1, 15, '#e0dcd2'); B.box(x - 44, 13.5, z, 2, 6, 2, '#c9302c');
      const R3 = mkRng(0.31); for (let i = -2; i <= 3; i++) for (const zz of [-4.5, -1.5, 1.5, 4.5]) { const n = 1 + Math.floor(R3() * 3); for (let k = 0; k < n; k++) B.box(x + i * 12.5, 4 + k * 2.6, z + zz, 12, 2.55, 2.4, ['#c8392b', '#2f6fd8', '#e8a020', '#2f8a4a', '#d8d8d8', '#1f8a9a'][Math.floor(R3() * 6)]); }
      break; }
    case 'bpier': { const S = SKYWAYS.find(q => q.id === o.S), Y = S.y, ax = S.axis === 'x', bot = -7;
      B.box(o.x, bot, o.z, ax ? 3.2 : 9.5, Y - 1.3 - bot, ax ? 9.5 : 3.2, '#b3aea4'); // a big concrete pier stood in the water
      B.box(o.x, -1.1, o.z, ax ? 4.4 : 10.6, 0.7, ax ? 10.6 : 4.4, '#8f8b84'); // footing at the waterline
      B.box(o.x, Y - 1.9, o.z, ax ? 3.6 : 13.4, 0.8, ax ? 13.4 : 3.6, '#9e9a92'); break; } // pier cap
    case 'bpylon': { const S = SKYWAYS.find(q => q.id === o.S), Y = S.y, ax = S.axis === 'x', H = Y + 24, bot = -7;
      for (const sw of [-1, 1]) { const [lx, lz] = skyXZ(S, o.u, sw * 7.6); B.box(lx, bot, lz, 1.8, H - bot, 1.8, '#d8d3ca'); B.box(lx, H - 1.2, lz, 2.2, 1.2, 2.2, '#c9c4ba'); }
      { const [mx, mz] = skyXZ(S, o.u, 0); B.box(mx, H - 3.2, mz, ax ? 1.6 : 17, 1.4, ax ? 17 : 1.6, '#c9c4ba'); B.box(mx, Y - 1.6, mz, ax ? 2 : 17, 1.1, ax ? 2 : 17, '#9e9a92'); } // top and deck crossbeams
      for (const sw of [-1, 1]) for (const dir of [-1, 1]) for (let k = 1; k <= 6; k++) { // stay cables fanning down to the deck edges
        const ua = o.u + dir * 0.6, ub = o.u + dir * k * 7.5, ya = H - 2.4 - k * 0.9, [ax0, az0] = skyXZ(S, ua, sw * 7.6), [bx0, bz0] = skyXZ(S, ub, sw * 6.6);
        const nx = ax ? 0 : 0.07, nz = ax ? 0.07 : 0;
        B.quad('solid', [ax0 - nx, ya, az0 - nz], [ax0 + nx, ya, az0 + nz], [bx0 + nx, Y + 0.9, bz0 + nz], [bx0 - nx, Y + 0.9, bz0 - nz], '#e8e4dc', [ax0, -50, az0]);
        B.quad('solid', [ax0 + nx, ya, az0 + nz], [ax0 - nx, ya, az0 - nz], [bx0 - nx, Y + 0.9, bz0 - nz], [bx0 + nx, Y + 0.9, bz0 + nz], '#e8e4dc', [ax0, 50, az0]); }
      break; }
    case 'skylamp': { const S = SKYWAYS.find(q => q.id === o.S), Y = S.y, ax = S.axis === 'x', ox = ax ? 0 : -o.sw * 0.9, oz = ax ? -o.sw * 0.9 : 0;
      B.box(o.x, Y + 1.0, o.z, 0.14, 3.6, 0.14, '#3a3d45'); B.box(o.x + ox / 2, Y + 4.5, o.z + oz / 2, ax ? 0.14 : 1.1, 0.1, ax ? 1.1 : 0.14, '#3a3d45'); B.box(o.x + ox, Y + 4.3, o.z + oz, 0.5, 0.18, 0.5, '#fff1c4', { key: 'glow' }); break; }
    case 'skyramp': { const S = SKYWAYS.find(q => q.id === o.S), y0 = skyProfile(S, o.u0), y1 = skyProfile(S, o.u1), P2 = (u, w, y) => { const [x, z] = skyXZ(S, u, w); return [x, y, z]; };
      const ctr = [...skyXZ(S, (o.u0 + o.u1) / 2, 0)], c3 = [ctr[0], -50, ctr[1]], cU = [ctr[0], (y0 + y1) / 2 - 3, ctr[1]];
      B.quad('solid', P2(o.u0, -6.0, y0), P2(o.u0, 6.0, y0), P2(o.u1, 6.0, y1), P2(o.u1, -6.0, y1), '#4a4a52', c3); // road surface
      if (Math.round(o.u0 / 2) % 2 === 0) B.quad('solid', P2(o.u0, -0.08, y0 + 0.012), P2(o.u0, 0.08, y0 + 0.012), P2(o.u1, 0.08, y1 + 0.012), P2(o.u1, -0.08, y1 + 0.012), '#f2f2ee', c3);
      for (const sw of [-1, 1]) { const wo = sw * 6.4, wi = sw * 6.0, wc = [skyXZ(S, (o.u0 + o.u1) / 2, sw * 3)[0], (y0 + y1) / 2, skyXZ(S, (o.u0 + o.u1) / 2, sw * 3)[1]];
        B.quad('solid', P2(o.u0, wo, 0), P2(o.u1, wo, 0), P2(o.u1, wo, y1 + 0.95), P2(o.u0, wo, y0 + 0.95), '#c9c4ba', wc); // outer retaining wall up to the parapet top
        B.quad('solid', P2(o.u0, wi, y0), P2(o.u1, wi, y1), P2(o.u1, wi, y1 + 0.95), P2(o.u0, wi, y0 + 0.95), '#d8d3ca', [skyXZ(S, (o.u0 + o.u1) / 2, sw * 9)[0], (y0 + y1) / 2 + 0.4, skyXZ(S, (o.u0 + o.u1) / 2, sw * 9)[1]]); // inner parapet face
        B.quad('solid', P2(o.u0, wi, y0 + 0.95), P2(o.u1, wi, y1 + 0.95), P2(o.u1, wo, y1 + 0.95), P2(o.u0, wo, y0 + 0.95), '#9e9a92', [ctr[0], -50, ctr[1]]); // cap
        const ew = sw * 5.3; B.quad('solid', P2(o.u0, ew - 0.07, y0 + 0.012), P2(o.u0, ew + 0.07, y0 + 0.012), P2(o.u1, ew + 0.07, y1 + 0.012), P2(o.u1, ew - 0.07, y1 + 0.012), '#f2d14a', c3); }
      { const d0 = S.a0 + S.ramp, d1 = S.a1 - S.ramp, ue = Math.abs(o.u1 - d0) < 0.01 ? o.u1 : Math.abs(o.u0 - d1) < 0.01 ? o.u0 : null; if (ue != null) { const cu = ue === o.u1 ? ue - 3 : ue + 3, [cx2, cz2] = skyXZ(S, cu, 0); B.quad('solid', P2(ue, -6.4, 0), P2(ue, 6.4, 0), P2(ue, 6.4, S.y - 0.55), P2(ue, -6.4, S.y - 0.55), '#bdb8ae', [cx2, 2, cz2]); } } // abutment face under the deck end
      break; }
    case 'vpillar': { const Y = METRO.Y; if (o.portal) { const cs = Math.cos(o.h), sn = Math.sin(o.h); for (const sw of [-7.3, 7.3]) { const lx = o.x + cs * sw, lz = o.z - sn * sw; B.box(lx, 0.15, lz, 1.0, Y - 1.0, 1.0, '#a8a49c'); B.box(lx, 0.6, lz, 1.04, 0.22, 1.04, '#f2d14a'); } B.box(o.x, Y - 1.6, o.z, 15.6, 0.8, 1.6, '#9e9a92', { rot: o.h }); break; } { const g0 = groundH(o.x, o.z), bot = g0 < -0.3 ? -7 : Math.min(0, g0); B.box(o.x, bot, o.z, g0 < -0.3 ? 2 : 1.3, Y - 0.85 - bot, g0 < -0.3 ? 2 : 1.3, '#a8a49c', { rot: o.h }); if (g0 < -0.3) B.box(o.x, -1.1, o.z, 3, 0.6, 3, '#8f8b84'); } B.box(o.x, Y - 1.6, o.z, 4.6, 0.8, 1.6, '#9e9a92', { rot: o.h }); break; } // out in the water the pillar goes down to the seabed
    case 'vstation': { const Y = METRO.Y, px = o.x + o.ox * 5.2, pz = o.z + o.oz * 5.2, along = o.ox ? 'z' : 'x', w = along === 'x' ? 30 : 3.8, d = along === 'x' ? 3.8 : 30;
      B.box(px, Y - 0.5, pz, w, 0.7, d, '#c9c4ba'); B.box(px + o.ox * 1.7, Y + 0.2, pz + o.oz * 1.7, along === 'x' ? 30 : 0.2, 1.1, along === 'x' ? 0.2 : 30, '#e8e4dc'); // platform + back wall
      for (let i = -12; i <= 12; i += 6) { const qx = along === 'x' ? px + i : px + o.ox * 1.5, qz = along === 'x' ? pz + o.oz * 1.5 : pz + i; B.box(qx, Y + 0.2, qz, 0.2, 2.8, 0.2, '#3a3d45'); }
      B.box(px, Y + 3.0, pz, along === 'x' ? 31 : 4.6, 0.25, along === 'x' ? 4.6 : 31, '#2f80ed'); B.box(px + o.ox * 1.5, Y + 0.25, pz + o.oz * 1.5, along === 'x' ? 4 : 0.1, 0.6, along === 'x' ? 0.1 : 4, '#16161b', { key: 'glow' }); // canopy, name board
      B.box(o.tx, 0.15, o.tz, 2.6, Y + 0.3, 2.6, '#3a3d45'); B.box(o.tx, Y + 0.45, o.tz, 3.0, 0.3, 3.0, '#2f80ed'); B.box(o.tx + (o.ox ? -o.ox * 1.3 : 0), 0.15, o.tz + (o.oz ? -o.oz * 1.3 : 0) + (o.ox ? 0 : 0), o.ox ? 0.06 : 1.4, 2.3, o.ox ? 1.4 : 0.06, '#cfe8ff'); // stair tower with glass doors facing the road
      B.box(o.tx, 2.6, o.tz, 2.7, 0.5, 2.7, '#ffd23f', { key: 'glow' }); // yellow M band
      // walkway from the tower to the platform
      B.box((o.tx + px) / 2, Y - 0.5, (o.tz + pz) / 2, Math.abs(o.tx - px) + 2.6, 0.6, Math.abs(o.tz - pz) + 2.6, '#c9c4ba'); break; }
    case 'container': { const y = 0.27 + (o.y || 0); B.box(o.x, y, o.z, 12, 2.55, 2.4, o.col); for (let i = -5; i <= 5; i++) B.box(o.x + i * 1.08, y + 0.05, o.z, 0.12, 2.45, 2.48, shadeHex(o.col, 0.82)); B.box(o.x + 6.02, y, o.z, 0.06, 2.55, 2.42, '#3a3d45'); break; }
    case 'crane': { const x = o.x, z = o.z, c = '#e8b020';
      for (const sx of [-5, 5]) for (const sz of [-15, 15]) B.box(x + sx, 0.15, z + sz, 0.9, 22, 0.9, c);
      for (const sz of [-15, 15]) B.box(x, 22, z + sz, 11, 1.2, 1.2, c);
      B.box(x - 5, 22, z, 1.2, 1.2, 31, c); B.box(x + 5, 22, z, 1.2, 1.2, 31, c); B.box(x, 21, z - 4, 4, 2.4, 3, '#3a3d45');
      B.box(x, 9, z - 4, 0.12, 12, 0.12, '#222'); B.box(x, 8.6, z - 4, 2.4, 0.4, 2.4, '#3a3d45'); B.box(x + 4.6, 23.2, z + 15, 0.4, 0.4, 0.4, '#ff3a3a', { key: 'glow' }); break; }
    case 'fence': for (let x = o.x0; x < o.x1; x += 4) { B.box(x, 0.15, o.z, 0.1, 2.2, 0.1, '#7a7f88'); if (Math.abs(x - 620) > 8) B.box(x + 2, 0.4, o.z, 4, 1.8, 0.03, '#9aa0aa'); } break;
    case 'lamp':
      B.box(o.x, 0.15, o.z, 0.18, 5, 0.18, '#3a3d45');
      B.box(o.x, 5.1, o.z, 0.7, 0.25, 0.7, '#fff6d8', { key: 'glow' });
      B.pool(o.x, 0.25, o.z, 6, '#ffcf8a');
      break;
    case 'stadium': { // concrete bowl, coloured seats, green pitch with lines, four floodlight masts
      for (const [x, z, w, d] of [[0, -13.5, 32, 5], [-13.5, 2.5, 5, 27], [13.5, 2.5, 5, 27], [-7, 13.5, 8, 5], [7, 13.5, 8, 5]]) { B.box(o.x + x, 0.15, o.z + z, w, 4, d, '#b8b4ad'); B.box(o.x + x * 1.04, 4.15, o.z + z * 1.04, w * 0.96, 3, d * 0.8, '#c9302c'); B.box(o.x + x * 1.08, 7.15, o.z + z * 1.08, w * 0.9, 2, d * 0.5, '#2f80ed'); }
      B.box(o.x, 0.16, o.z, 22, 0.06, 22, '#3f9a45'); B.box(o.x, 0.23, o.z, 0.2, 0.02, 20, '#ffffff'); B.box(o.x, 0.23, o.z, 20, 0.02, 0.2, '#ffffff');
      for (const [x, z] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) { B.box(o.x + x, 0.15, o.z + z, 0.5, 16, 0.5, '#5a5d64'); B.box(o.x + x, 16, o.z + z, 2.4, 1.2, 0.5, '#ffffff', { key: 'glow' }); }
      B.box(o.x, 9.2, o.z - 16.2, 14, 2.2, 0.3, '#16161b', { key: 'sign' }); B.box(o.x, 9.3, o.z - 16.4, 13, 1.8, 0.05, '#ffd23f', { key: 'glow' });
      break; }
    case 'mallsign': B.box(o.x, 8, o.z, 16, 2, 0.4, '#16161b', { key: 'sign' }); B.box(o.x, 8.1, o.z + 0.22, 15, 1.6, 0.05, '#ff6fb5', { key: 'glow' }); B.box(o.x, 0.15, o.z + 2, 14, 0.05, 4, '#c9c2b5'); break;
    case 'ring': for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; B.box(o.x + Math.cos(a) * o.r, 0.2, o.z + Math.sin(a) * o.r, 2.4, 0.04, 2.2, '#c9b48a'); } break;
    case 'pond': B.box(o.x, 0.16, o.z, 10, 0.06, 10, '#9a8a6a'); B.box(o.x, 0.2, o.z, 9.2, 0.05, 9.2, '#3a7ab0'); B.box(o.x + 2, 0.3, o.z - 1, 0.6, 0.15, 0.4, '#ffffff'); break;
    case 'fountain':
      B.cyl(o.x, 0.2, o.z, 3, 0.6, '#c9c2b8', 12);
      B.disc(o.x, 0.82, o.z, 2.6, '#ffffff', 'water', 16);
      B.cyl(o.x, 0.8, o.z, 0.5, 1.6, '#c9c2b8', 8);
      B.cyl(o.x, 2.4, o.z, 1.0, 0.25, '#c9c2b8', 8);
      B.disc(o.x, 2.66, o.z, 0.85, '#ffffff', 'water', 12);
      B.cone(o.x, 2.4, o.z, 1.05, -1.5, '#ffffff', 12, 'water');   // water sheet spilling from the top bowl
      B.cyl(o.x, 2.6, o.z, 0.08, 1.1, '#ffffff', 6, 'water');       // jet
      break;
    case 'cross': { const rot = o.nx ? Math.PI / 2 : 0, x = o.x + o.nx * 0.1, z = o.z + o.nz * 0.1; B.box(x, 10.5, z, 0.45, 3, 0.25, '#e8c55a', { rot, key: 'sign' }); B.box(x, 11.6, z, 1.8, 0.45, 0.25, '#e8c55a', { rot, key: 'sign' }); B.box(o.x + o.nx * 0.05, 3.6, o.z + o.nz * 0.05, 1.6, 2.2, 0.2, '#5a8ad0', { rot, key: 'glow' }); break; }
    case 'door': {
      const rot = o.nx ? Math.PI / 2 : 0, out = (k, y, w, h, d, c, key) => B.box(o.x + o.nx * k, y, o.z + o.nz * k, w, h, d, c, { rot, key });
      out(0.03, 0.15, 4.6, 3.8, 0.1, o.wall || '#ece4d6');       // plain shopfront wall so no window sits behind the door
      out(0.05, 0.15, 2.8, 2.9, 0.22, '#2a2a30');                 // frame
      out(0.1, 0.15, 2.1, 2.5, 0.24, '#33475a', 'glow');          // glass doors (glow at night)
      out(0.12, 0.15, 0.08, 2.5, 0.26, '#2a2a30');                // middle bar
      out(0.12, 1.1, 1.9, 0.08, 0.26, '#c9ccd2');                 // push bar
      out(0.25, 3.15, 3.8, 0.8, 0.3, o.col, 'sign');              // lit sign board
      out(0.9, 2.85, 3.4, 0.12, 1.5, new THREE.Color(o.col).multiplyScalar(0.75).getStyle()); // awning
      B.flat(o.x + o.nx * 0.9, 0.17, o.z + o.nz * 0.9, o.nx ? 1.4 : 2.6, o.nx ? 2.6 : 1.4, '#5a5a62');
      break;
    }
    case 'bench': B.box(o.x, 0.2, o.z, o.rot ? 0.6 : 2, 0.45, o.rot ? 2 : 0.6, '#8a5a35'); break;
    case 'rock': B.box(o.x, -2, o.z, o.w, o.h + 2, o.d, o.col, { rot: r() * 0.6 }); B.box(o.x + 2, o.h - 1, o.z - 1, o.w * 0.6, 3, o.d * 0.6, '#3f6b35', { rot: r() }); break;
    case 'struct': drawStruct(o, B); break;
    case 'fstairs': { // black iron fire escape: flights of steps, landings and railings
      const iron = '#2a2b30', step = '#4a4d54';
      for (const f of o.fl) {
        if (f.land) { B.box((f.x0 + f.x1) / 2, f.top - 0.12, (f.z0 + f.z1) / 2, f.x1 - f.x0, 0.1, f.z1 - f.z0, step); B.box(f.x1 - 0.03, f.top, (f.z0 + f.z1) / 2, 0.05, 1.0, f.z1 - f.z0, iron); B.box((f.x0 + f.x1) / 2, 0, f.z0 + 0.03, 0.06, f.top, 0.06, iron); continue; }
        const steps = Math.max(6, Math.round(Math.abs(f.z1 - f.z0) / 0.35));
        for (let i = 0; i < steps; i++) { const k = (i + 0.5) / steps, sy = f.y0 + (f.y1 - f.y0) * k, sz = f.z0 + (f.z1 - f.z0) * k, sl = Math.abs(f.z1 - f.z0) / steps + 0.03; B.box((f.x0 + f.x1) / 2, sy - 0.06, sz, f.x1 - f.x0, 0.06, sl, step); B.box(f.x1 - 0.03, sy + 0.85, sz, 0.05, 0.05, sl, iron); if (i % 3 === 0) B.box(f.x1 - 0.03, sy, sz, 0.04, 0.85, 0.04, iron); }
      }
      break; }
    case 'ladder': { for (const sx of [-0.28, 0.28]) B.box(o.x + sx, 0.15, o.z, 0.06, o.top - 0.15 + 0.9, 0.06, '#5a5d64'); for (let y = 0.5; y < o.top + 0.6; y += 0.35) B.box(o.x, y, o.z, 0.56, 0.04, 0.05, '#7a7d84'); break; }
    case 'umbrella': B.box(o.x, 0, o.z, 0.1, 2.2, 0.1, '#ddd'); B.cone(o.x, 2.0, o.z, 1.6, 0.7, o.col, 8); break;
    case 'lifeguard':
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(o.x + sx * 1.2, 0, o.z + sz * 1.2, 0.2, 2.6, 0.2, '#f2f2f2');
      B.box(o.x, 2.6, o.z, 3, 1.6, 3, '#e23b3b'); B.prism(o.x, 4.2, o.z, 3.4, 0.8, 3.4, '#ffffff');
      break;
    case 'dock': { const D = DOCKS[o.i], w = D.x1 - D.x0, d = D.z1 - D.z0; B.box(o.x, -0.3, o.z, w, 0.55, d, '#a07a4f'); for (let z = D.z0 + 1; z < D.z1; z += 5) for (const sx of [D.x0 + 0.25, D.x1 - 0.25]) B.box(sx, -3, z, 0.35, 4.2, 0.35, '#6b5034'); for (let z = D.z0; z < D.z1; z += 1.2) B.flat(o.x, 0.26, z, w, 0.08, '#8a6a42'); break; }
    case 'pier':
      B.box(o.x, -0.3, o.z, PIER.x1 - PIER.x0, 0.55, PIER.z1 - PIER.z0, '#a07a4f');
      for (let z = PIER.z0 + 2; z < PIER.z1; z += 6) for (const sx of [PIER.x0 + 0.3, PIER.x1 - 0.3]) B.box(sx, -3, z, 0.4, 4.2, 0.4, '#6b5034');
      for (let z = PIER.z0; z < PIER.z1; z += 1.2) B.flat(o.x, 0.26, z, PIER.x1 - PIER.x0, 0.08, '#8a6a42');
      break;
    case 'rail': { // two steel rails on wooden sleepers over a gravel bed
      B.box(o.x, 0, o.z, 8.05, 0.12, 4.2, '#7a7068');
      for (let i = 0; i < 8; i++) B.box(o.x - 3.5 + i, 0.12, o.z, 0.35, 0.1, 3.0, '#5a4030');
      for (const s of [-0.75, 0.75]) B.box(o.x, 0.22, o.z + s, 8.05, 0.12, 0.12, '#9aa0aa');
      break; }
    case 'ubridge': { // concrete rail bridge over the highway cutting + retaining walls down each side
      const U = UNDERPASS, wz0 = U.z1 + 6, wz1 = U.z0 - 4;
      B.box(o.x, -1.0, o.z, 2 * U.half + 6, 1.0, 7, '#9a9590'); B.box(o.x, 0, o.z - 3.4, 2 * U.half + 6, 0.9, 0.3, '#b8b4ad'); B.box(o.x, 0, o.z + 3.4, 2 * U.half + 6, 0.9, 0.3, '#b8b4ad');
      B.box(o.x, -1.0, o.z + 3.52, 9, 0.6, 0.06, '#2f80ed'); // bridge plate
      for (const sx of [-1, 1]) {
        for (let z = wz0; z < wz1; z += 4) { const zz = z + 2, gy = dip(o.x + sx * (U.half + 0.2), zz); if (gy > -0.3 || Math.abs(zz - o.z) < 5.4) continue; /* no wall where the rail bridge deck crosses */ B.box(o.x + sx * (U.half + 0.2), gy, zz, 0.7, -gy + 0.4, 4.05, '#a8a39b'); B.box(o.x + sx * (U.half + 0.2), 0.4, zz, 0.9, 0.12, 4.05, '#8a857e'); }
        B.box(o.x + sx * (U.half + 1.5), -U.depth, o.z, 2.2, U.depth - 1.0, 7, '#8a857e'); // abutments
      }
      for (let z = U.z - 3; z <= U.z + 3; z += 1.5) B.box(o.x, -1.05, z, 2 * U.half, 0.02, 0.6, '#2a2a30'); // underside shadow strips
      break; }
    case 'platform': { // concrete platform, yellow safety line, canopy, benches and a lit name sign
      B.box(o.x, 0, o.z, 30, 0.45, 4, '#b8b4ad'); B.box(o.x, 0.45, o.z - 1.75, 30, 0.02, 0.3, '#ffd23f');
      for (const sx of [-10, 0, 10]) { B.box(o.x + sx, 0.45, o.z + 1.5, 0.18, 3.2, 0.18, '#3a3d45'); }
      B.box(o.x, 3.6, o.z + 0.6, 26, 0.18, 3.4, '#2f80ed');
      for (const sx of [-6, 6]) { B.box(o.x + sx, 0.45, o.z + 1.2, 2.2, 0.45, 0.6, '#7a5230'); B.box(o.x + sx, 0.9, o.z + 1.45, 2.2, 0.5, 0.1, '#7a5230'); }
      B.box(o.x, 2.4, o.z + 1.95, 6, 0.9, 0.12, '#16161b', { key: 'sign' }); B.box(o.x, 2.45, o.z + 2.02, 5.6, 0.7, 0.02, '#ffffff', { key: 'glow' });
      break; }
    case 'runway':
      B.box(o.x, 0, o.z, o.w, 0.07, o.d, '#46464d');
      for (let x = o.x - o.w / 2 + 10; x < o.x + o.w / 2 - 10; x += 14) B.flat(x, 0.08, o.z, 7, 0.5, '#f2f2f2');
      for (const ex of [o.x - o.w / 2 + 6, o.x + o.w / 2 - 6]) for (let i = -5; i <= 5; i++) if (i) B.flat(ex, 0.08, o.z + i * 2.4, 6, 1, '#f2f2f2');
      break;
    case 'rlight': B.box(o.x, 0, o.z, 0.4, 0.4, 0.4, '#ffe08a', { key: 'glow' }); break;
    case 'plane': {
      const x = o.x, z = o.z, wc = o.col;
      B.box(x, 2.2, z, 4, 4, 26, wc); B.box(x, 2.6, z + 14, 3.2, 3, 3, wc); B.box(x, 3.0, z + 16, 2, 2, 1.4, '#3a4a5a');
      B.box(x, 2.6, z - 15, 2.6, 3, 4, wc); B.box(x, 4.8, z - 15.5, 0.5, 5, 4, o.acc); B.box(x, 4.4, z - 16, 10, 0.4, 2.6, wc);
      B.box(x, 2.4, z + 1, 30, 0.5, 5.5, wc); B.box(x, 3.3, z + 3, 4.2, 0.6, 22, o.acc);
      for (const s of [-1, 1]) { B.cyl(x + s * 7, 1.0, z + 2, 1.2, 1.5, '#c8c8cc', 8); B.box(x + s * 7, 0.8, z + 1.2, 2.4, 2.4, 3.6, '#c8c8cc'); }
      for (const s of [-1, 0, 1]) B.box(x + s * 2.5, 0, z + (s ? 0 : 10), 0.6, 1.4, 0.6, '#222');
      for (let i = -9; i <= 11; i += 2) for (const s of [-1, 1]) B.box(x + s * 2.01, 3.6, z + i, 0.02, 0.5, 0.6, '#3a4a5a');
      break;
    }
  }
}

function buildTerrain(cx, cz, B) {
  const N = 16, S = CHUNK / N, x0 = cx * CHUNK, z0 = cz * CHUNK;
  const hs = [], cs = [], gts = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = x0 + i * S, z = z0 + j * S;
    hs.push(groundH(x, z)); cs.push('#' + groundColor(x, z).getHexString()); gts.push(groundType(x + S / 2, z + S / 2));
  }
  const V = (i, j) => [x0 + i * S, hs[j * (N + 1) + i], z0 + j * S];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = cs[j * (N + 1) + i];
    const a = V(i, j), b = V(i + 1, j), d = V(i, j + 1), e = V(i + 1, j + 1), ctr = [a[0] + S / 2, -100, a[2] + S / 2];
    B.gt = gts[j * (N + 1) + i]; B.tri('ground', a, d, b, c, ctr); B.tri('ground', b, d, e, cs[(j + 1) * (N + 1) + i + 1], ctr);
  }
  // roads clipped to this chunk
  const cx1 = x0 + CHUNK, cz1 = z0 + CHUNK;
  for (const r of ROADS) {
    const ax0 = Math.max(r.x0, x0), ax1 = Math.min(r.x1, cx1), az0 = Math.max(r.z0, z0), az1 = Math.min(r.z1, cz1);
    if (ax0 >= ax1 || az0 >= az1) continue;
    const col2 = r.dirt ? '#a8865a' : '#4b4b53';
    B.gt = r.dirt ? GT.dirt : GT.asphalt;
    if (r.city) { B.flat((ax0 + ax1) / 2, 0.04, (az0 + az1) / 2, ax1 - ax0, az1 - az0, col2, 'ground'); continue; }
    // country roads follow the hills: a strip of quads with per-corner heights
    const along = r.axis === 'z', L0 = along ? az0 : ax0, L1 = along ? az1 : ax1, step = 4;
    const C0 = along ? ax0 : az0, C1 = along ? ax1 : az1, nAc = Math.max(1, Math.ceil((C1 - C0) / 3));
    const pt = (u, v) => { const x = along ? u : v, z = along ? v : u; return [x, roadY(x, z) + 0.08, z]; }; // u = across, v = along
    for (let t = L0; t < L1 - 1e-6; t += step) {
      const t2 = Math.min(L1, t + step);
      for (let k = 0; k < nAc; k++) {
        const u0 = C0 + (C1 - C0) * k / nAc, u1 = C0 + (C1 - C0) * (k + 1) / nAc;
        const A = pt(u0, t), Bq = pt(u1, t), C2 = pt(u1, t2), D2 = pt(u0, t2);
        B.quad('ground', A, Bq, C2, D2, col2, [(A[0] + C2[0]) / 2, -100, (A[2] + C2[2]) / 2]);
      }
    }
  }
}

function buildCanyon(cx, cz, B) {
  const x0 = cx * CHUNK, z0 = cz * CHUNK, x1 = x0 + CHUNK, z1 = z0 + CHUNK, HW = CR_HW;
  const ends = crEnds;
  for (const R of CANYON) for (let i = 0; i < R.s.length - 1; i++) {
    const a = R.s[i], b = R.s[i + 1], mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2; if (mx < x0 || mx >= x1 || mz < z0 || mz >= z1) continue;
    const P2 = (q, w, up) => [q.x + q.nx * w, q.h + ends(q) + up, q.z + q.nz * w], c3 = [mx, -100, mz];
    const jn = a.jn || b.jn, low = (a.under || b.under) ? -0.015 : 0;
    if (R.dirt) { B.gt = GT.dirt; B.quad('ground', P2(a, -HW, low - 0.05), P2(a, HW, low - 0.05), P2(b, HW, low - 0.05), P2(b, -HW, low - 0.05), i % 2 ? '#a07a50' : '#9a744c', c3); for (const s2 of [-1, 1]) B.quad('solid', P2(a, s2 * HW, -0.05), P2(a, s2 * (HW + 0.8), -0.4), P2(b, s2 * (HW + 0.8), -0.4), P2(b, s2 * HW, -0.05), '#8a6a44', c3); continue; } // a dirt trail: no lines, no lamps
    B.gt = GT.asphalt; B.quad('ground', P2(a, -HW, low), P2(a, HW, low), P2(b, HW, low), P2(b, -HW, low), '#4b4b53', c3);
    if (!jn) for (const s2 of [-1, 1]) { B.quad('solid', P2(a, s2 * (HW - 0.45), 0.012), P2(a, s2 * (HW - 0.3), 0.012), P2(b, s2 * (HW - 0.3), 0.012), P2(b, s2 * (HW - 0.45), 0.012), '#e8e8e2', c3); // white edge lines
      B.quad('solid', P2(a, s2 * HW, 0), P2(a, s2 * (HW + 0.8), -0.32), P2(b, s2 * (HW + 0.8), -0.32), P2(b, s2 * HW, 0), '#8a7a60', c3); } // dirt verge so the edge never floats
    if (i % 4 < 2 && !jn) B.quad('solid', P2(a, -0.09, 0.014), P2(a, 0.09, 0.014), P2(b, 0.09, 0.014), P2(b, -0.09, 0.014), '#f2c84a', c3); // dashed yellow centre
    if (i % 22 === 11 && !jn && !R.s.slice(Math.max(0, i - 3), i + 3).some(q => q.i < 4)) { const L = 1, lx = a.x + a.nx * (HW + 1.4), lz = a.z + a.nz * (HW + 1.4), gy = groundH(lx, lz); B.box(lx, gy, lz, 0.16, 4.6, 0.16, '#3a3d45'); B.box(lx - a.nx * 0.5, gy + 4.5, lz - a.nz * 0.5, 0.5, 0.16, 0.5, '#fff1c4', { key: 'glow' }); } // road lamps
  }
}
export function buildChunk(cx, cz) {
  const B = new GB();
  buildTerrain(cx, cz, B); buildCanyon(cx, cz, B);
  for (const o of chunks.get(ckey(cx, cz))?.objs || []) { B.oy = o.t === 'rail' || o.t === 'platform' || o.t === 'ubridge' ? 0 : rolling(o.x, o.z) + (o.t === 'paint' ? dip(o.x, o.z) : 0); if (o.t === 'paint' && B.oy) B.oy += 0.08; drawObj(o, B); }
  B.oy = 0;
  const g = new THREE.Group();
  for (const m of B.meshes()) g.add(m);
  return g;
}

// ---------------- minimap
export function drawMap(size = 512) {
  const cv = document.createElement('canvas'), SH = Math.round(size * (WORLD.z1 - WORLD.z0) / (WORLD.x1 - WORLD.x0)); cv.width = size; cv.height = SH; // same scale both ways, so nothing's squashed
  const x = cv.getContext('2d');
  const sx = (WORLD.x1 - WORLD.x0) / size, sz = (WORLD.z1 - WORLD.z0) / SH;
  const img = x.createImageData(size, SH);
  const c = new THREE.Color();
  for (let j = 0; j < SH; j++) for (let i = 0; i < size; i++) {
    const wx = WORLD.x0 + (i + 0.5) * sx, wz = WORLD.z0 + (j + 0.5) * sz;
    if (groundH(wx, wz) < WATER_Y) c.set('#3d8fd0');
    else groundColor(wx, wz, c);
    if (wz < -780 && wx > -560 && groundH(wx, wz) >= WATER_Y) c.set('#6f6a63');
    const k = (j * size + i) * 4;
    img.data[k] = Math.min(255, Math.pow(c.r, 1 / 2.2) * 255); img.data[k + 1] = Math.min(255, Math.pow(c.g, 1 / 2.2) * 255); img.data[k + 2] = Math.min(255, Math.pow(c.b, 1 / 2.2) * 255); img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const tx = wx => (wx - WORLD.x0) / sx, tz = wz => (wz - WORLD.z0) / sz;
  for (const ch of chunks.values()) for (const o of ch.objs) {
    if (o.t === 'slab' && o.w > 30) { x.fillStyle = o.col; x.fillRect(tx(o.x - o.w / 2), tz(o.z - o.d / 2), o.w / sx, o.d / sz); }
  }
  for (const r of ROADS) { x.fillStyle = r.dirt ? '#a8865a' : '#55555c'; x.fillRect(tx(r.x0), tz(r.z0), Math.max(1.5, (r.x1 - r.x0) / sx), Math.max(1.5, (r.z1 - r.z0) / sz)); }
  x.fillStyle = '#46464d'; x.fillRect(tx(-230), tz(-720), 500 / sx, 30 / sz);
  x.fillStyle = '#5a4a3e'; x.fillRect(tx(RAIL.x0), tz(RAIL.z) - 1, (RAIL.x1 - RAIL.x0) / sx, 2.2); x.fillStyle = '#d8d2c8'; for (let rx = RAIL.x0; rx < RAIL.x1; rx += 16) x.fillRect(tx(rx), tz(RAIL.z) - 0.4, 1, 0.8);
  for (const st of RAIL.stations) { x.fillStyle = '#2f80ed'; x.fillRect(tx(st.x - 15), tz(RAIL.z + 2.4), 30 / sx, 4 / sz + 1); }
  x.strokeStyle = '#55555c'; x.lineWidth = Math.max(2, CR_HW * 2 / sx); x.lineJoin = 'round'; for (const R of CANYON) { x.beginPath(); R.s.forEach((q, i) => i ? x.lineTo(tx(q.x), tz(q.z)) : x.moveTo(tx(q.x), tz(q.z))); x.stroke(); }
  for (const S of SKYWAYS) { const [xa, za] = skyXZ(S, S.a0, -SKY_HW - 0.4), [xb, zb] = skyXZ(S, S.a1, SKY_HW + 0.4); x.fillStyle = '#8c8f9a'; x.fillRect(tx(Math.min(xa, xb)), tz(Math.min(za, zb)), Math.max(2, Math.abs(xb - xa) / sx), Math.max(2, Math.abs(zb - za) / sz)); x.fillStyle = '#f2d14a'; const [ma, na] = skyXZ(S, S.a0, 0), [mb, nb] = skyXZ(S, S.a1, 0); x.fillRect(tx(Math.min(ma, mb)) - (S.axis === 'z' ? 0.4 : 0), tz(Math.min(na, nb)) - (S.axis === 'x' ? 0.4 : 0), S.axis === 'x' ? Math.abs(mb - ma) / sx : 0.8, S.axis === 'z' ? Math.abs(nb - na) / sz : 0.8); } // skyways: lighter, with a yellow centre line
  x.strokeStyle = '#ffd23f'; x.lineWidth = 2; x.beginPath(); METRO.pts.forEach(([px, pz], i) => i ? x.lineTo(tx(px), tz(pz)) : x.moveTo(tx(px), tz(pz))); x.closePath(); x.stroke(); for (const st of METRO.stations) { x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(tx(st.x), tz(st.z), 3, 0, 7); x.fill(); }
  for (const ch of chunks.values()) for (const o of ch.objs) {
    if (o.t === 'bld') { x.fillStyle = o.glass ? '#8fb8d0' : '#9a8f86'; x.fillRect(tx(o.x - o.w / 2), tz(o.z - o.d / 2), Math.max(1, o.w / sx), Math.max(1, o.d / sz)); }
    else if (o.t === 'tree' && o.kind !== 'palm' && Math.random() < 0.6) { x.fillStyle = '#3a6a32'; x.fillRect(tx(o.x) - 0.6, tz(o.z) - 0.6, 1.4, 1.4); }
    else if (o.t === 'pier') { x.fillStyle = '#a07a4f'; x.fillRect(tx(PIER.x0), tz(PIER.z0), (PIER.x1 - PIER.x0) / sx + 1, (PIER.z1 - PIER.z0) / sz); }
  }
  return { canvas: cv, tx, tz, sx, sz };
}
export const LABELS = [
  ['DOWNTOWN', 0, 0], ['BAY BEACH', 100, 395], ['HIDDEN HILLS', -420, -60], ['BAYWOOD PEAK', -502, -232], ['EASTPORT', 600, 0], ['NORTHFIELD', 0, -520], ['NORTHPORT', 648, -432], ['LONG BEACH', 1056, 0], ['BAY RIVER', 505, -620], ['EAST BAY', 850, 200], ['BAY PORT', 1056, -650], ['WILDWOOD', -740, -200], ['SUN VALLEY', -960, -300], ['RED ROCK DESERT', -1000, -300], ['RED RIVER', -1100, 60], ['WEST BEACH', -1350, 150], ['AIRPORT', 20, -690], ['FARMLAND', 370, 160],
];
export const SPAWN = { x: 8.2, z: 30, carX: 3, carZ: 40, carH: Math.PI };

// Mid-point of a block's sidewalk on one side ('n','s','e','w'), for placing shops etc.
export function blockSide(cityId, i, j, side) {
  const c = CITIES.find(c => c.id === cityId);
  const cx = c.cx + (i + 0.5) * P, cz = c.cz + (j + 0.5) * P, o = 16.6;
  return { x: cx + (side === 'e' ? o : side === 'w' ? -o : 0), z: cz + (side === 's' ? o : side === 'n' ? -o : 0), door: { side, cx, cz } };
}
