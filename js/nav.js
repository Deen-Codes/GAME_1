// GPS: A* over a road mask so waypoints draw a route along the streets, like GTA.
import { WORLD, roadAt } from './world.js?v=67';

const C = 6, X0 = WORLD.x0, Z0 = WORLD.z0;
const NX = Math.ceil((WORLD.x1 - X0) / C), NZ = Math.ceil((WORLD.z1 - Z0) / C), N = NX * NZ;
let mask = null;
function build() {
  mask = new Uint8Array(N);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) if (roadAt(X0 + (i + 0.5) * C, Z0 + (j + 0.5) * C)) mask[j * NX + i] = 1;
}
const cell = (x, z) => [Math.max(0, Math.min(NX - 1, Math.floor((x - X0) / C))), Math.max(0, Math.min(NZ - 1, Math.floor((z - Z0) / C)))];
function nearest(i, j) {
  if (mask[j * NX + i]) return j * NX + i;
  for (let r = 1; r < 60; r++) {
    let best = -1, bd = 1e9;
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      if (mask[b * NX + a]) { const d = di * di + dj * dj; if (d < bd) { bd = d; best = b * NX + a; } }
    }
    if (best >= 0) return best;
  }
  return -1;
}
const g = new Float32Array(N), from = new Int32Array(N), closed = new Uint8Array(N);
export function findRoute(ax, az, bx, bz) {
  if (!mask) build();
  const s = nearest(...cell(ax, az)), t = nearest(...cell(bx, bz));
  if (s < 0 || t < 0) return null;
  g.fill(Infinity); from.fill(-1); closed.fill(0);
  const ti = t % NX, tj = (t / NX) | 0;
  const h = k => { const dx = Math.abs(k % NX - ti), dz = Math.abs(((k / NX) | 0) - tj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const heap = [], hf = [];
  const push = (k, f) => { heap.push(k); hf.push(f); let n = heap.length - 1; while (n > 0) { const p = (n - 1) >> 1; if (hf[p] <= hf[n]) break; [heap[p], heap[n]] = [heap[n], heap[p]]; [hf[p], hf[n]] = [hf[n], hf[p]]; n = p; } };
  const pop = () => { const top = heap[0], lk = heap.pop(), lf = hf.pop(); if (heap.length) { heap[0] = lk; hf[0] = lf; let n = 0; for (;;) { const l = 2 * n + 1, r = l + 1; let m = n; if (l < heap.length && hf[l] < hf[m]) m = l; if (r < heap.length && hf[r] < hf[m]) m = r; if (m === n) break; [heap[m], heap[n]] = [heap[n], heap[m]]; [hf[m], hf[n]] = [hf[n], hf[m]]; n = m; } } return top; };
  g[s] = 0; push(s, h(s));
  let found = false, iters = 0;
  while (heap.length && iters++ < 60000) {
    const k = pop(); if (closed[k]) continue; closed[k] = 1;
    if (k === t) { found = true; break; }
    const i = k % NX, j = (k / NX) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue;
      const n = b * NX + a; if (!mask[n] || closed[n]) continue;
      const ng = g[k] + (di && dj ? 1.414 : 1);
      if (ng < g[n]) { g[n] = ng; from[n] = k; push(n, ng + h(n)); }
    }
  }
  if (!found) return null;
  const cells = []; for (let k = t; k >= 0; k = from[k]) cells.push(k); cells.reverse();
  const pts = [[ax, az]]; let pd = null;
  for (let n = 0; n < cells.length; n++) {
    const k = cells[n], x = X0 + (k % NX + 0.5) * C, z = Z0 + (((k / NX) | 0) + 0.5) * C;
    const nx = cells[n + 1];
    const d = nx == null ? null : (nx - k);
    if (d !== pd || nx == null) pts.push([x, z]);
    pd = d;
  }
  pts.push([bx, bz]);
  return pts;
}
