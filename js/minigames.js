// Touch minigames in the spirit of Chinatown Wars. Each one draws on a 2D canvas overlay.
import { sfx, audio } from './audio.js?v=108';
import { drawIcon } from './icons.js?v=108';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function emoji(ctx, e, x, y, size) { ctx.fillStyle = '#000'; ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); }
function ballDraw(c, x, y, r) { c.fillStyle = '#e8762c'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.strokeStyle = '#3a1a08'; c.lineWidth = Math.max(1.5, r * 0.08); c.beginPath(); c.arc(x, y, r, 0, 7); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke(); c.beginPath(); c.arc(x - r * 1.35, y, r * 0.95, -0.75, 0.75); c.stroke(); c.beginPath(); c.arc(x + r * 1.35, y, r * 0.95, Math.PI - 0.75, Math.PI + 0.75); c.stroke(); }
function surfer(c, x, y, s) { c.save(); c.translate(x, y); c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(0, s * 0.45, s * 0.75, s * 0.14, 0, 0, 7); c.fill(); c.fillStyle = '#1fb5a8'; c.fillRect(-s * 0.12, -s * 0.3, s * 0.24, s * 0.55); c.fillStyle = '#e8b088'; c.beginPath(); c.arc(0, -s * 0.45, s * 0.16, 0, 7); c.fill(); c.strokeStyle = '#e8b088'; c.lineWidth = s * 0.08; c.beginPath(); c.moveTo(-s * 0.1, -s * 0.2); c.lineTo(-s * 0.5, -s * 0.05); c.moveTo(s * 0.1, -s * 0.2); c.lineTo(s * 0.5, -s * 0.3); c.moveTo(-s * 0.08, s * 0.25); c.lineTo(-s * 0.22, s * 0.4); c.moveTo(s * 0.08, s * 0.25); c.lineTo(s * 0.22, s * 0.4); c.stroke(); c.restore(); }
function barbell(c, x, y, w, lift) { c.save(); c.translate(x, y - lift); c.fillStyle = '#c9ccd2'; c.fillRect(-w / 2, -4, w, 8); c.fillStyle = '#222'; for (const s of [-1, 1]) { c.fillRect(s * w / 2 - (s > 0 ? 22 : 0), -34, 22, 68); c.fillRect(s * (w / 2 - 26) - (s > 0 ? 14 : 0), -26, 14, 52); } c.restore(); }
const TACO_ING = [['Shell', '#f2c14e', 'half'], ['Carne', '#7a3e1d', 'chunk'], ['Pollo', '#e0b070', 'chunk'], ['Queso', '#ffd23f', 'block'], ['Lettuce', '#5fbf4a', 'leaf'], ['Tomato', '#e23b3b', 'round'], ['Guac', '#7fb84a', 'blob'], ['Salsa', '#c9302c', 'cup']];
function ingredient(c, i, x, y, s) {
  const [, col, shape] = TACO_ING[i]; c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2;
  c.beginPath();
  if (shape === 'half') { c.arc(x, y + s * 0.15, s * 0.42, Math.PI, 0); c.closePath(); }
  else if (shape === 'chunk') { for (let k = 0; k < 3; k++) c.rect(x - s * 0.35 + k * s * 0.25, y - s * 0.1 + (k % 2) * s * 0.12, s * 0.22, s * 0.2); }
  else if (shape === 'block') c.rect(x - s * 0.3, y - s * 0.22, s * 0.6, s * 0.44);
  else if (shape === 'leaf') { c.ellipse(x, y, s * 0.4, s * 0.2, -0.4, 0, 7); }
  else if (shape === 'round') c.arc(x, y, s * 0.3, 0, 7);
  else if (shape === 'blob') { c.arc(x - s * 0.12, y, s * 0.22, 0, 7); c.arc(x + s * 0.14, y + s * 0.05, s * 0.2, 0, 7); }
  else { c.moveTo(x - s * 0.25, y - s * 0.2); c.lineTo(x + s * 0.25, y - s * 0.2); c.lineTo(x + s * 0.18, y + s * 0.25); c.lineTo(x - s * 0.18, y + s * 0.25); c.closePath(); }
  c.fill(); c.stroke();
}
function taco(c, x, y, s) { c.fillStyle = '#f2c14e'; c.beginPath(); c.arc(x, y + s * 0.2, s * 0.5, Math.PI, 0); c.fill(); c.fillStyle = '#5fbf4a'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x - s * 0.36 + i * s * 0.18, y + s * 0.02, s * 0.08, 0, 7); c.fill(); } c.fillStyle = '#e23b3b'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x - s * 0.2 + i * s * 0.2, y - s * 0.02, s * 0.06, 0, 7); c.fill(); } }
function card(c, x, y, w, h, cd, hidden) {
  rr(c, x, y, w, h, 8); c.fillStyle = hidden ? '#8b1e3f' : '#fffdf6'; c.fill(); c.strokeStyle = '#1c1a2e'; c.lineWidth = 2; c.stroke();
  if (hidden) { c.strokeStyle = 'rgba(255,255,255,.3)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x + 6, y + 8 + i * (h - 16) / 5); c.lineTo(x + w - 6, y + 8 + i * (h - 16) / 5); c.stroke(); } return; }
  const red = cd.s === 1 || cd.s === 2, col = red ? '#c9302c' : '#1c1a2e';
  txt(c, cd.r, x + w / 2, y + h * 0.38, h * 0.32, col);
  suit(c, cd.s, x + w / 2, y + h * 0.72, h * 0.2, col);
}
function suit(c, s, x, y, r, col) {
  c.fillStyle = col; c.beginPath();
  if (s === 1) { c.moveTo(x, y + r); c.bezierCurveTo(x - r * 1.6, y - r * 0.3, x - r * 0.5, y - r * 1.4, x, y - r * 0.4); c.bezierCurveTo(x + r * 0.5, y - r * 1.4, x + r * 1.6, y - r * 0.3, x, y + r); }
  else if (s === 2) { c.moveTo(x, y - r); c.lineTo(x + r * 0.75, y); c.lineTo(x, y + r); c.lineTo(x - r * 0.75, y); c.closePath(); }
  else if (s === 0) { c.moveTo(x, y - r); c.bezierCurveTo(x + r * 1.6, y + r * 0.3, x + r * 0.5, y + r * 1.1, x, y + r * 0.4); c.bezierCurveTo(x - r * 0.5, y + r * 1.1, x - r * 1.6, y + r * 0.3, x, y - r); c.rect(x - r * 0.12, y + r * 0.2, r * 0.24, r * 0.8); }
  else { c.arc(x, y - r * 0.45, r * 0.42, 0, 7); c.moveTo(x - r * 0.45, y + r * 0.05); c.arc(x - r * 0.45, y + r * 0.05, r * 0.42, 0, 7); c.moveTo(x + r * 0.45, y + r * 0.05); c.arc(x + r * 0.45, y + r * 0.05, r * 0.42, 0, 7); c.rect(x - r * 0.12, y, r * 0.24, r); }
  c.fill();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function txt(ctx, s, x, y, size, col = '#fff', weight = 900, align = 'center') { ctx.font = `${weight} ${size}px ui-rounded, -apple-system, system-ui, sans-serif`; ctx.fillStyle = col; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); }

const GAMES = {
  // ---------------------------------------------------------------- smash a car window
  smash: () => {
    let W, H, hits = 0, cracks = [], shake = 0, shards = [], done = false, win = false, endT = 0;
    const need = 6;
    return {
      title: 'Smash the window', hint: 'Tap the glass hard!', time: 6,
      init(w, h) { W = w; H = h; },
      down(x, y) {
        if (done) return;
        const gx = W * 0.1, gy = H * 0.22, gw = W * 0.8, gh = H * 0.42;
        if (x < gx || x > gx + gw || y < gy || y > gy + gh) return;
        hits++; shake = 0.25; sfx.crack(); navigator.vibrate?.(25);
        const n = 5 + hits;
        for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), l = rnd(30, 80 + hits * 25); const pts = [[x, y]]; let px = x, py = y; for (let k = 0; k < 4; k++) { px += Math.cos(a + rnd(-0.4, 0.4)) * l / 4; py += Math.sin(a + rnd(-0.4, 0.4)) * l / 4; pts.push([px, py]); } cracks.push(pts); }
        if (hits >= need) {
          done = true; win = true; endT = 0.9; sfx.smash(); navigator.vibrate?.([40, 30, 60]);
          for (let i = 0; i < 40; i++) shards.push({ x: rnd(gx, gx + gw), y: rnd(gy, gy + gh), vx: rnd(-80, 80), vy: rnd(-200, 0), r: rnd(0, 6), s: rnd(8, 26) });
        }
      },
      update(dt) { shake = Math.max(0, shake - dt); for (const s of shards) { s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += dt * 4; } if (done) endT -= dt; return done && endT <= 0; },
      draw(c, t) {
        const sx = (Math.random() - 0.5) * shake * 30, sy = (Math.random() - 0.5) * shake * 30;
        c.save(); c.translate(sx, sy);
        const gx = W * 0.1, gy = H * 0.22, gw = W * 0.8, gh = H * 0.42;
        rr(c, gx - 18, gy - 18, gw + 36, gh + 120, 26); c.fillStyle = '#b8352f'; c.fill();
        rr(c, gx - 18, gy + gh + 30, gw + 36, 14, 4); c.fillStyle = '#7a1f1b'; c.fill();
        rr(c, gx + gw - 80, gy + gh + 60, 60, 18, 8); c.fillStyle = '#d9d9de'; c.fill();
        if (!win) {
          const g = c.createLinearGradient(gx, gy, gx + gw, gy + gh); g.addColorStop(0, '#9fd2ee'); g.addColorStop(1, '#5d8fb5');
          rr(c, gx, gy, gw, gh, 14); c.fillStyle = g; c.fill();
          c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(gx + 30, gy + gh); c.lineTo(gx + 90, gy); c.lineTo(gx + 130, gy); c.lineTo(gx + 70, gy + gh); c.fill();
          c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2;
          for (const p of cracks) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (const q of p) c.lineTo(q[0], q[1]); c.stroke(); }
        } else { rr(c, gx, gy, gw, gh, 14); c.fillStyle = '#1b2230'; c.fill(); drawIcon(c, 'key', W / 2, gy + gh / 2, 70, { stroke: '#ffd23f', width: 2.2 }); }
        for (const s of shards) { c.save(); c.translate(s.x, s.y); c.rotate(s.r); c.fillStyle = 'rgba(190,230,255,.85)'; c.beginPath(); c.moveTo(0, -s.s / 2); c.lineTo(s.s / 2, s.s / 2); c.lineTo(-s.s / 2, s.s / 3); c.fill(); c.restore(); }
        c.restore();
        txt(c, `${Math.min(hits, need)} / ${need}`, W / 2, H * 0.84, 28);
        drawIcon(c, 'fist', W / 2, H * 0.92, 42, { width: 2 });
      },
      result() { return { win, score: hits }; },
    };
  },

  // ---------------------------------------------------------------- hotwire
  hotwire: (o = {}) => {
    let W, H; const cols = ['#ff3b4a', '#3d8bff', '#ffd23f', '#4cd964'].slice(0, o.wires || 3);
    let left, right, drag = null, done = false, endT = 0, sparks = [];
    return {
      title: 'Hotwire it', hint: 'Drag each wire to its matching colour', time: 10,
      init(w, h) {
        W = w; H = h; const n = cols.length, top = H * 0.25, gap = H * 0.5 / (n - 1 || 1);
        left = cols.map((c, i) => ({ c, x: W * 0.16, y: top + i * gap, done: false }));
        const order = cols.map((c, i) => i).sort(() => Math.random() - 0.5);
        right = order.map((ci, i) => ({ c: cols[ci], x: W * 0.84, y: top + i * gap }));
      },
      down(x, y) { for (const l of left) if (!l.done && Math.hypot(x - l.x, y - l.y) < 40) { drag = { l, x, y }; sfx.click(); } },
      move(x, y) { if (drag) { drag.x = x; drag.y = y; } },
      up(x, y) {
        if (!drag) return;
        const t = right.find(r => Math.hypot(x - r.x, y - r.y) < 44);
        if (t && t.c === drag.l.c) { drag.l.done = true; drag.l.tx = t.x; drag.l.ty = t.y; sfx.spark(); navigator.vibrate?.(20); for (let i = 0; i < 14; i++) sparks.push({ x: t.x, y: t.y, vx: rnd(-160, 160), vy: rnd(-200, 60), l: 0.5 }); }
        else if (t) { sfx.fail(); navigator.vibrate?.([10, 30, 10]); }
        drag = null;
        if (left.every(l => l.done) && !done) { done = true; endT = 0.8; sfx.engineStart(); }
      },
      update(dt) { for (const s of sparks) { s.vy += 600 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.l -= dt; } sparks = sparks.filter(s => s.l > 0); if (done) endT -= dt; return done && endT <= 0; },
      draw(c) {
        rr(c, W * 0.06, H * 0.15, W * 0.88, H * 0.7, 22); c.fillStyle = '#20232c'; c.fill();
        c.strokeStyle = '#3a3e4c'; c.lineWidth = 2; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(W * 0.1, H * 0.2 + i * H * 0.12); c.lineTo(W * 0.9, H * 0.2 + i * H * 0.12); c.stroke(); }
        for (const r of right) { c.fillStyle = '#555a66'; rr(c, r.x - 6, r.y - 26, 46, 52, 10); c.fill(); c.fillStyle = r.c; c.beginPath(); c.arc(r.x, r.y, 15, 0, 7); c.fill(); c.fillStyle = '#c9ccd2'; c.beginPath(); c.arc(r.x, r.y, 6, 0, 7); c.fill(); }
        for (const l of left) {
          const tx = l.done ? l.tx : drag && drag.l === l ? drag.x : l.x + 30, ty = l.done ? l.ty : drag && drag.l === l ? drag.y : l.y;
          c.strokeStyle = l.c; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(l.x - 50, l.y); c.bezierCurveTo(l.x + 40, l.y, tx - 60, ty, tx, ty); c.stroke();
          c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(tx, ty, 9, 0, 7); c.fill();
        }
        for (const s of sparks) { c.fillStyle = `rgba(255,${200 + Math.random() * 55 | 0},80,${s.l * 2})`; c.fillRect(s.x, s.y, 4, 4); }
        if (done) drawIcon(c, 'key', W / 2, H * 0.5, 80, { stroke: '#ffd23f', width: 2.2 });
      },
      result() { return { win: done, score: left.filter(l => l.done).length }; },
    };
  },

  // ---------------------------------------------------------------- taco truck
  taco: () => {
    const ING = TACO_ING;
    let W, H, order = [], prog = 0, served = 0, earned = 0, flash = 0, bad = 0, msg = '', bonus = 0;
    const newOrder = () => { order = [0]; const n = 2 + Math.min(3, Math.floor(served / 2)) + (Math.random() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) order.push(1 + Math.floor(Math.random() * 7)); prog = 0; };
    const btn = i => { const col = i % 4, row = Math.floor(i / 4), bw = W * 0.21, bh = bw; return { x: W * 0.06 + col * (bw + W * 0.025), y: H * 0.56 + row * (bh + 14), w: bw, h: bh }; };
    return {
      title: 'Taco Rush', hint: 'Tap the ingredients in order', time: 35,
      init(w, h) { W = w; H = h; newOrder(); },
      down(x, y) {
        for (let i = 0; i < 8; i++) { const b = btn(i); if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) {
          if (i === order[prog]) { prog++; sfx.click(); if (prog >= order.length) { served++; const pay = 10 + order.length * 6; earned += pay; msg = `+$${pay}`; flash = 0.6; bonus += 2; sfx.coin(); newOrder(); } }
          else { bad = 0.4; msg = 'Wrong! Order binned'; flash = 0.6; sfx.fail(); navigator.vibrate?.(40); newOrder(); }
        } }
      },
      update(dt) { flash -= dt; bad -= dt; const b = bonus; bonus = 0; return { addTime: b }; },
      draw(c) {
        rr(c, W * 0.05, H * 0.12, W * 0.9, H * 0.36, 20); c.fillStyle = bad > 0 ? '#5a2026' : '#fff4dc'; c.fill();
        txt(c, `ORDER #${served + 1}`, W * 0.1, H * 0.16, 14, '#8a5a35', 900, 'left');
        const n = order.length, sz = Math.min(54, W * 0.8 / n);
        order.forEach((ing, i) => { c.globalAlpha = i < prog ? 0.25 : 1; ingredient(c, ing, W / 2 + (i - (n - 1) / 2) * (sz + 6), H * 0.27, sz); c.globalAlpha = 1; if (i === prog) { c.fillStyle = '#ff8a2a'; c.fillRect(W / 2 + (i - (n - 1) / 2) * (sz + 6) - sz / 2, H * 0.27 + sz / 2 + 4, sz, 5); } });
        taco(c, W * 0.5, H * 0.41, 50 + prog * 3);
        for (let i = 0; i < 8; i++) { const b = btn(i); rr(c, b.x, b.y, b.w, b.h, 16); c.fillStyle = 'rgba(255,255,255,.12)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.stroke(); ingredient(c, i, b.x + b.w / 2, b.y + b.h * 0.42, b.w * 0.55); txt(c, ING[i][0], b.x + b.w / 2, b.y + b.h * 0.84, 11, '#ddd', 800); }
        if (flash > 0) txt(c, msg, W / 2, H * 0.52, 22, bad > 0 ? '#ff6a74' : '#5ee07a');
        txt(c, `Served ${served} · $${earned}`, W / 2, H * 0.08, 16, '#ffd23f');
      },
      result() { return { win: served > 0, score: served, money: earned }; },
    };
  },

  // ---------------------------------------------------------------- shooting range / pier gallery
  gallery: (o = {}) => {
    let W, H, targets = [], score = 0, spawn = 0, pops = [], hits = 0;
    const tgt = (c, t) => {
      if (t.k === 'civ') { c.fillStyle = '#d8c4a0'; c.beginPath(); c.arc(t.x, t.y - 24, 11, 0, 7); c.fill(); c.fillRect(t.x - 14, t.y - 12, 28, 34); c.fillStyle = '#2f80ed'; c.fillRect(t.x - 14, t.y - 4, 28, 18); txt(c, 'NO', t.x, t.y + 30, 11, '#c9302c'); return; }
      const cols = t.k === 'gold' ? ['#c9a24a', '#ffd23f', '#c9a24a'] : ['#c9302c', '#fff8e8', '#c9302c'];
      for (let i = 0; i < 3; i++) { c.fillStyle = cols[i]; c.beginPath(); c.arc(t.x, t.y, 26 - i * 8, 0, 7); c.fill(); }
      c.strokeStyle = '#1c1a2e'; c.lineWidth = 2; c.beginPath(); c.arc(t.x, t.y, 26, 0, 7); c.stroke();
      c.fillStyle = '#5a4030'; c.fillRect(t.x - 2, t.y + 26, 4, 30);
    };
    return {
      title: o.title || 'Shooting Range', hint: 'Tap the targets. Gold targets are worth 5. Don\'t hit the cardboard civilians!', time: 30,
      init(w, h) { W = w; H = h; },
      down(x, y) {
        for (const t of targets) if (!t.hit && Math.hypot(x - t.x, y - (t.k === 'civ' ? t.y - 5 : t.y)) < 30) {
          t.hit = true; const v = t.k === 'civ' ? -5 : t.k === 'gold' ? 5 : 1; score = Math.max(0, score + v); if (v > 0) hits++;
          pops.push({ x: t.x, y: t.y, s: v > 0 ? `+${v}` : `${v}`, l: 0.7, col: v > 0 ? '#5ee07a' : '#ff6a74' });
          v > 0 ? sfx.coin() : sfx.fail(); sfx.shot(false, false); navigator.vibrate?.(v > 0 ? 15 : 60); return;
        }
        sfx.shot(true, false);
      },
      update(dt, t) {
        spawn -= dt;
        if (spawn <= 0) { spawn = (0.35 + Math.random() * 0.45) * Math.max(0.5, 1 - t / 40); const lane = Math.floor(Math.random() * 3), dir = lane % 2 ? -1 : 1; targets.push({ lane, x: dir > 0 ? -30 : W + 30, y: H * (0.28 + lane * 0.2), vx: dir * (90 + Math.random() * (70 + t * 4)), k: Math.random() < 0.18 ? 'civ' : Math.random() < 0.12 ? 'gold' : 'std', hit: false }); }
        for (const t of targets) { t.x += t.vx * dt; if (t.hit) t.y += 400 * dt; }
        targets = targets.filter(t => t.x > -60 && t.x < W + 60 && t.y < H);
        for (const p of pops) { p.l -= dt; p.y -= 40 * dt; } pops = pops.filter(p => p.l > 0);
      },
      draw(c) {
        c.fillStyle = '#2a2420'; c.fillRect(0, H * 0.12, W, H * 0.68);
        for (let i = 0; i < 3; i++) { c.fillStyle = '#4a3a2a'; c.fillRect(0, H * (0.28 + i * 0.2) + 56, W, 8); }
        for (const t of targets) tgt(c, t);
        for (const p of pops) txt(c, p.s, p.x, p.y, 24, p.col);
        txt(c, `Score ${score}`, W / 2, H * 0.88, 30, '#ffd23f');
      },
      result() { return { win: score > 0, score, hits, money: o.pay === false ? 0 : score * 6 }; },
    };
  },

  // ---------------------------------------------------------------- treadmill (stamina)
  tread: () => {
    let W, H, speed = 0, dist = 0, beat = 0, phase = 0, last = null, msg = '', msgT = 0, combo = 0;
    return {
      title: 'Treadmill', hint: 'Tap LEFT and RIGHT in time with the pulse to keep your pace', time: 25,
      init(w, h) { W = w; H = h; },
      down(x) {
        const side = x < W / 2 ? 'L' : 'R', onBeat = Math.abs(((phase % 1) + 1) % 1 - 0.5) > 0.3;
        if (side !== last && onBeat) { speed = Math.min(1, speed + 0.12); combo++; msg = combo > 8 ? 'IN THE ZONE' : 'GOOD'; sfx.click(); }
        else { speed = Math.max(0, speed - 0.15); combo = 0; msg = 'OFF BEAT'; }
        last = side; msgT = 0.4;
      },
      update(dt) { phase += dt * (1.6 + speed * 1.4); speed = Math.max(0, speed - dt * 0.12); dist += speed * dt * 6; msgT -= dt; },
      draw(c, t) {
        const pulse = Math.abs(((phase % 1) + 1) % 1 - 0.5) > 0.3;
        c.fillStyle = '#16161b'; c.fillRect(W * 0.15, H * 0.5, W * 0.7, 30);
        c.strokeStyle = '#3a3d45'; c.lineWidth = 2; for (let i = 0; i < 12; i++) { const x = W * 0.15 + ((i * 30 - t * speed * 400) % (W * 0.7) + W * 0.7) % (W * 0.7); c.beginPath(); c.moveTo(x, H * 0.5); c.lineTo(x, H * 0.5 + 30); c.stroke(); }
        drawIcon(c, 'run', W / 2, H * 0.36, 120, { stroke: pulse ? '#ffd23f' : '#fff', width: 1.8 });
        c.fillStyle = pulse ? 'rgba(255,210,63,.35)' : 'rgba(255,255,255,.08)'; c.beginPath(); c.arc(W / 2, H * 0.36, 80 + (pulse ? 8 : 0), 0, 7); c.fill();
        rr(c, W * 0.1, H * 0.62, W * 0.8, 20, 10); c.fillStyle = 'rgba(255,255,255,.15)'; c.fill(); rr(c, W * 0.1, H * 0.62, W * 0.8 * speed, 20, 10); c.fillStyle = '#4cd964'; c.fill();
        for (const [x, l] of [[W * 0.05, 'LEFT'], [W * 0.55, 'RIGHT']]) { rr(c, x, H * 0.72, W * 0.4, H * 0.16, 20); c.fillStyle = 'rgba(255,255,255,.12)'; c.fill(); txt(c, l, x + W * 0.2, H * 0.8, 22); }
        txt(c, `${(dist / 1000).toFixed(2)} km`, W / 2, H * 0.14, 30, '#ffd23f');
        if (msgT > 0) txt(c, msg, W / 2, H * 0.57, 16, msg === 'OFF BEAT' ? '#ff6a74' : '#5ee07a');
      },
      result() { return { win: dist > 30, score: Math.round(dist) }; },
    };
  },

  // ---------------------------------------------------------------- cage fight (The Pit)
  cage: (o = {}) => {
    const opp = o.opp || { name: 'Rookie', hp: 60, power: 8, tell: 0.75, col: '#e23b3b' }, str = o.str || 1, stamLvl = o.stam || 1;
    let W, H, you = 100, them = opp.hp, stam = 100, block = false, pAct = null, pT = 0, oState = 'idle', oT = 1.2, oStun = 0, msg = '', msgT = 0, shakeT = 0, done = 0, hitFx = [];
    const maxStam = 100 + stamLvl * 8;
    const btns = () => [['JAB', 0.04], ['HOOK', 0.36], ['BLOCK', 0.68]];
    const say = (m) => { msg = m; msgT = 0.7; };
    const fighter = (c, x, y, s, dir, col, act, k, blocking, skin) => {
      c.save(); c.translate(x, y); c.scale(dir * s, s);
      c.fillStyle = '#222'; c.fillRect(-14, 40, 11, 60); c.fillRect(4, 40, 11, 60);                 // legs
      c.fillStyle = col; c.fillRect(-16, 30, 32, 16);                                            // shorts
      c.fillStyle = skin; c.fillRect(-15, -30, 30, 62);                                          // torso
      c.fillRect(-12, -62, 24, 28);                                                              // head
      c.fillStyle = '#111'; c.fillRect(2, -52, 5, 5);                                            // eye
      const reach = act ? Math.sin(Math.min(1, k) * Math.PI) : 0;
      c.fillStyle = skin;
      const armY = blocking ? -56 : act === 'hook' ? -24 - reach * 20 : -22;
      c.fillRect(8, armY, 12 + (act === 'jab' ? reach * 40 : act === 'hook' ? reach * 30 : 0), 10);    // lead arm
      c.fillRect(-6, blocking ? -60 : -16, 12 + (act === 'hook' ? reach * 30 : 0), 10);                // rear arm
      c.fillStyle = '#e23b3b'; c.fillRect(20 + (act === 'jab' ? reach * 40 : act === 'hook' ? reach * 30 : 0), armY - 3, 14, 16);  // gloves
      c.fillRect(6 + (act === 'hook' ? reach * 30 : 0), (blocking ? -60 : -16) - 3, 14, 16);
      c.restore();
    };
    return {
      title: `The Pit: vs ${opp.name}`, hint: 'JAB is fast, HOOK hits hard. Hold BLOCK when they wind up (red flash). Hit them during their wind-up to counter.', time: 9999,
      init(w, h) { W = w; H = h; },
      down(x, y) {
        if (done) return;
        if (y < H * 0.72) return;
        const i = x < W * 0.34 ? 0 : x < W * 0.66 ? 1 : 2;
        if (i === 2) { block = true; return; }
        if (pAct || block) return;
        const cost = i === 0 ? 9 : 20; if (stam < cost) { say('Too tired!'); return; }
        stam -= cost; pAct = i === 0 ? 'jab' : 'hook'; pT = 0; sfx.whoosh();
      },
      up() { block = false; },
      update(dt) {
        if (done) { done += dt; return done > 1.4; }
        stam = Math.min(maxStam, stam + dt * (block ? 10 : 22)); msgT -= dt; shakeT -= dt;
        hitFx = hitFx.filter(f => (f.t -= dt) > 0);
        // your punch
        if (pAct) { pT += dt / (pAct === 'jab' ? 0.22 : 0.38); if (pT >= 0.5 && !pAct.hit) {
          const counter = oState === 'wind', blocked = oState === 'guard';
          let dmg = (pAct === 'jab' ? 4 : 9) * (1 + (str - 1) * 0.15) * (counter ? 1.6 : 1) * (blocked ? 0.25 : 1);
          them -= dmg; hitFx.push({ x: W * 0.62, y: H * 0.38, t: 0.25, big: pAct === 'hook' }); sfx.punch(); navigator.vibrate?.(12);
          if (counter) { oState = 'stun'; oT = 0.7; say('COUNTER!'); } else if (blocked) say('Blocked'); else if (pAct === 'hook' && Math.random() < 0.3) { oState = 'stun'; oT = 0.5; }
          pAct = Object.assign(new String(pAct), { hit: true }); }
          if (pT >= 1) pAct = null; }
        // opponent AI
        oT -= dt;
        if (oState === 'idle' && oT <= 0) { const r = Math.random(); if (r < 0.65) { oState = 'wind'; oT = opp.tell * (0.8 + Math.random() * 0.4); } else { oState = 'guard'; oT = 0.6 + Math.random() * 0.6; } }
        else if (oState === 'wind' && oT <= 0) { oState = 'hit'; oT = 0.25;
          if (block) { stam = Math.max(0, stam - 12); say('Blocked!'); sfx.click(); }
          else { you -= opp.power * (0.8 + Math.random() * 0.4); shakeT = 0.25; hitFx.push({ x: W * 0.38, y: H * 0.38, t: 0.3, big: true }); sfx.punch(); navigator.vibrate?.(30); } }
        else if ((oState === 'hit' || oState === 'guard' || oState === 'stun') && oT <= 0) { oState = 'idle'; oT = 0.4 + Math.random() * 0.9 * (opp.tell + 0.3); }
        if (them <= 0 || you <= 0) { done = 0.001; say(them <= 0 ? 'K.O.!' : 'You got knocked out'); msgT = 9; }
      },
      draw(c, t) {
        const sx = shakeT > 0 ? (Math.random() - 0.5) * 10 : 0;
        c.fillStyle = '#1a1420'; c.fillRect(0, 0, W, H);
        c.fillStyle = '#2c2430'; c.fillRect(0, H * 0.55, W, H * 0.2);
        c.strokeStyle = 'rgba(200,200,210,.25)'; c.lineWidth = 2; for (let i = 0; i < W; i += 16) { c.beginPath(); c.moveTo(i, H * 0.16); c.lineTo(i + 40, H * 0.55); c.stroke(); c.beginPath(); c.moveTo(i + 40, H * 0.16); c.lineTo(i, H * 0.55); c.stroke(); }
        // bars
        const bar = (x, w, v, col, label) => { rr(c, x, H * 0.04, w, 14, 7); c.fillStyle = 'rgba(255,255,255,.15)'; c.fill(); rr(c, x, H * 0.04, w * Math.max(0, v), 14, 7); c.fillStyle = col; c.fill(); txt(c, label, x + w / 2, H * 0.04 + 28, 13, '#fff', 800); };
        bar(W * 0.04, W * 0.42, you / 100, '#4cd964', 'YOU'); bar(W * 0.54, W * 0.42, them / opp.hp, '#ff3b4a', opp.name.toUpperCase());
        rr(c, W * 0.04, H * 0.11, W * 0.42, 6, 3); c.fillStyle = '#ffd23f'; c.fill(); rr(c, W * 0.04, H * 0.11, W * 0.42 * Math.max(0, 1 - stam / maxStam), 6, 3); c.fillStyle = '#3a3040'; c.fill();
        const wind = oState === 'wind';
        if (wind) { c.fillStyle = `rgba(255,40,60,${0.15 + 0.15 * Math.sin(t * 30)})`; c.fillRect(0, 0, W, H * 0.7); }
        const fy = H * 0.42;
        fighter(c, W * 0.34 + sx, fy, Math.min(W, H) / 330, 1, '#2f80ed', pAct ? String(pAct) : null, pT, block, '#d39a6a');
        const oAct = oState === 'hit' ? 'hook' : null;
        c.save(); if (oState === 'stun') { c.translate(W * 0.66, fy); c.rotate(0.15); c.translate(-W * 0.66, -fy); }
        fighter(c, W * 0.66, fy - (wind ? 4 : 0), Math.min(W, H) / 330, -1, opp.col, oAct, oState === 'hit' ? 1 - oT / 0.25 : 0, oState === 'guard', opp.skin || '#b77a4b'); c.restore();
        for (const f of hitFx) { c.fillStyle = `rgba(255,230,120,${f.t * 3})`; c.beginPath(); c.arc(f.x, f.y, (f.big ? 40 : 24) * (1.2 - f.t), 0, 7); c.fill(); }
        if (msgT > 0) txt(c, msg, W / 2, H * 0.2, 30, msg === 'COUNTER!' || msg === 'K.O.!' ? '#ffd23f' : '#fff');
        btns().forEach(([l, x], i) => { rr(c, W * x, H * 0.76, W * 0.28, H * 0.17, 18); c.fillStyle = i === 2 && block ? 'rgba(76,217,100,.5)' : i === 1 ? 'rgba(255,90,60,.35)' : 'rgba(255,255,255,.14)'; c.fill(); txt(c, l, W * x + W * 0.14, H * 0.845, 20); });
      },
      result() { return { win: them <= 0, money: 0, score: Math.max(0, Math.round(100 - (100 - you))) }; },
    };
  },
  // ---------------------------------------------------------------- blackjack
  blackjack: (o = {}) => {
    let W, H, bank = o.money || 0, net = 0, bet = 0, chips = [10, 50, 100, 500], deck = [], ph = [], dh = [], stage = 'bet', msg = 'Place your bet', btns = [], done = false;
    const newDeck = () => { deck = []; for (let d = 0; d < 4; d++) for (let s = 0; s < 4; s++) for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) deck.push({ r, s }); deck.sort(() => Math.random() - 0.5); };
    const val = h => { let v = 0, a = 0; for (const c of h) { if (c.r === 'A') { a++; v += 11; } else v += ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; } while (v > 21 && a) { v -= 10; a--; } return v; };
    const draw1 = () => { if (deck.length < 20) newDeck(); return deck.pop(); };
    const settle = (res) => {
      let d = 0;
      if (res === 'bj') d = Math.floor(bet * 1.5); else if (res === 'win') d = bet; else if (res === 'lose') d = -bet;
      net += d; bank += d; stage = 'done'; msg = { bj: `Blackjack! +$${Math.floor(bet * 1.5)}`, win: `You win +$${bet}`, lose: `Dealer wins −$${bet}`, push: 'Push. Bet returned' }[res];
      res === 'lose' ? sfx.fail() : res !== 'push' ? sfx.cash() : sfx.click(); bet = 0;
    };
    const dealerPlay = () => { while (val(dh) < 17) dh.push(draw1()); const p = val(ph), d = val(dh); settle(d > 21 || p > d ? 'win' : p < d ? 'lose' : 'push'); };
    newDeck();
    return {
      title: 'Blackjack', hint: 'Get closer to 21 than the dealer without going over. Blackjack pays 3:2.', time: 0, keepOnQuit: true,
      init(w, h) { W = w; H = h; },
      down(x, y) {
        for (const b of btns) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h && !b.off) { sfx.click(); b.fn(); return; }
      },
      update() { return done; },
      draw(c) {
        c.fillStyle = '#1f6b3a'; rr(c, 0, H * 0.05, W, H * 0.62, 24); c.fill(); c.strokeStyle = '#c9a24a'; c.lineWidth = 4; c.stroke();
        txt(c, 'DEALER' + (stage === 'play' ? '' : dh.length ? ` · ${val(dh)}` : ''), W / 2, H * 0.09, 13, 'rgba(255,255,255,.7)');
        const cw = Math.min(64, W / 6), chh = cw * 1.4;
        dh.forEach((cd, i) => card(c, W / 2 - (dh.length * (cw + 6)) / 2 + i * (cw + 6), H * 0.12, cw, chh, cd, stage === 'play' && i === 1));
        ph.forEach((cd, i) => card(c, W / 2 - (ph.length * (cw + 6)) / 2 + i * (cw + 6), H * 0.4, cw, chh, cd));
        if (ph.length) txt(c, `YOU · ${val(ph)}`, W / 2, H * 0.37, 13, 'rgba(255,255,255,.8)');
        txt(c, msg, W / 2, H * 0.62, 18, '#ffd23f');
        txt(c, `Bank $${bank.toLocaleString()}  ·  Bet $${bet}  ·  Tonight ${net >= 0 ? '+' : '−'}$${Math.abs(net)}`, W / 2, H * 0.71, 13, '#fff', 800);
        btns = [];
        const row = (labels, y) => { const n = labels.length, bw = (W - 24 - (n - 1) * 8) / n; labels.forEach(([l, fn, off], i) => { const b = { x: 12 + i * (bw + 8), y, w: bw, h: 52, fn, off }; btns.push(b); rr(c, b.x, b.y, b.w, b.h, 14); c.fillStyle = off ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.18)'; c.fill(); txt(c, l, b.x + bw / 2, y + 26, 15, off ? 'rgba(255,255,255,.35)' : '#fff'); }); };
        if (stage === 'bet' || stage === 'done') {
          row(chips.map(v => [`+$${v}`, () => { if (bank - bet >= v) { bet += v; msg = `Bet $${bet}`; } }, bank - bet < v]), H * 0.76);
          row([['Clear', () => { bet = 0; msg = 'Place your bet'; }], ['DEAL', () => { if (!bet) return; ph = [draw1(), draw1()]; dh = [draw1(), draw1()]; stage = 'play'; msg = 'Hit or stand?'; if (val(ph) === 21) { stage = 'x'; settle(val(dh) === 21 ? 'push' : 'bj'); } }, !bet], ['Leave', () => { done = true; }]], H * 0.86);
        } else if (stage === 'play') {
          row([['HIT', () => { ph.push(draw1()); if (val(ph) > 21) settle('lose'); }], ['STAND', () => dealerPlay()], ['DOUBLE', () => { if (bank - bet * 2 < 0) return; bet *= 2; ph.push(draw1()); if (val(ph) > 21) settle('lose'); else dealerPlay(); }, ph.length > 2 || bank < bet * 2]], H * 0.8);
        }
      },
      result() { return { win: net > 0, score: net, money: net }; },
    };
  },

  // ---------------------------------------------------------------- slots
  slots: (o = {}) => {
    const SYM = [['coin', '#ffd23f', 5], ['star', '#ff8a2a', 10], ['heart', '#ff3b8a', 3], ['bolt', '#38e8ff', 4], ['moon', '#b26bff', 2], ['sun', '#ffe08a', 20]];
    let W, H, bank = o.money || 0, net = 0, bet = 10, reels = [0, 1, 2], spin = [0, 0, 0], stopAt = [0, 0, 0], msg = 'Bet and pull!', spinning = false, btns = [], done = false, t0 = 0;
    const weights = [30, 18, 22, 18, 25, 6];
    const roll = () => { let r = Math.random() * weights.reduce((a, b) => a + b), i = 0; while ((r -= weights[i]) > 0) i++; return i; };
    return {
      title: 'Lucky 7 Slots', hint: 'Three of a kind pays big. Any two coins pay double.', time: 0, keepOnQuit: true,
      init(w, h) { W = w; H = h; },
      down(x, y) { for (const b of btns) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h && !b.off) { sfx.click(); b.fn(); return; } },
      update(dt, t) {
        if (spinning) {
          let all = true;
          for (let i = 0; i < 3; i++) { if (t < stopAt[i]) { spin[i] += dt * 18; all = false; } else spin[i] = 0; }
          if (all) {
            spinning = false; const [a, b, c] = reels; let win = 0;
            if (a === b && b === c) win = bet * SYM[a][2]; else if ([a, b, c].filter(v => v === 0).length >= 2) win = bet * 2;
            net += win - bet; bank += win - bet; msg = win ? `WIN $${win}!` : 'No luck'; win ? sfx.cash() : sfx.click();
          }
        }
        this._t = t; return done;
      },
      draw(c) {
        rr(c, W * 0.06, H * 0.08, W * 0.88, H * 0.5, 24); c.fillStyle = '#8b1e3f'; c.fill(); c.strokeStyle = '#ffd23f'; c.lineWidth = 5; c.stroke();
        const rw = W * 0.24, rh = H * 0.28;
        for (let i = 0; i < 3; i++) {
          const x = W * 0.13 + i * (rw + W * 0.03), y = H * 0.16;
          rr(c, x, y, rw, rh, 14); c.fillStyle = '#fffdf6'; c.fill();
          const idx = spinning && spin[i] ? Math.floor(spin[i]) % SYM.length : reels[i];
          drawIcon(c, SYM[idx][0], x + rw / 2, y + rh / 2 + (spinning && spin[i] ? (spin[i] % 1 - 0.5) * 30 : 0), rw * 0.6, { stroke: '#1c1a2e', fill: SYM[idx][1], width: 1.6 });
        }
        txt(c, msg, W / 2, H * 0.52, 20, '#ffd23f');
        txt(c, `Bank $${bank.toLocaleString()} · Bet $${bet} · Tonight ${net >= 0 ? '+' : '−'}$${Math.abs(net)}`, W / 2, H * 0.64, 13, '#fff', 800);
        btns = [];
        const row = (labels, y) => { const n = labels.length, bw = (W - 24 - (n - 1) * 8) / n; labels.forEach(([l, fn, off], i) => { const b = { x: 12 + i * (bw + 8), y, w: bw, h: 56, fn, off }; btns.push(b); rr(c, b.x, b.y, b.w, b.h, 14); c.fillStyle = off ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.18)'; c.fill(); txt(c, l, b.x + bw / 2, y + 28, 16, off ? 'rgba(255,255,255,.35)' : '#fff'); }); };
        row([10, 25, 100].map(v => [`Bet $${v}`, () => { bet = v; }, spinning || bank < v]), H * 0.7);
        row([['SPIN', () => { if (bank < bet) { msg = 'Not enough cash'; return; } reels = [roll(), roll(), roll()]; spinning = true; const t = this._t || 0; stopAt = [t + 0.6, t + 0.9, t + 1.2]; spin = [1, 1, 1]; msg = ''; sfx.whoosh(); }, spinning], ['Leave', () => { done = true; }, spinning]], H * 0.81);
      },
      result() { return { win: net > 0, score: net, money: net }; },
    };
  },

  // ---------------------------------------------------------------- surf
  surf: () => {
    let W, H, pos = 0.5, vel = 0, zone = 0.5, zvel = 0, zw = 0.22, score = 0, holdL = false, holdR = false, inside = false, combo = 0;
    return {
      title: 'Surf the wave', hint: 'Hold left or right to stay in the green zone', time: 25,
      init(w, h) { W = w; H = h; },
      down(x) { if (x < W / 2) holdL = true; else holdR = true; },
      up(x) { if (x < W / 2) holdL = false; else holdR = false; },
      move() { },
      update(dt, t) {
        zvel += rnd(-1.6, 1.6) * dt * (1 + t / 20); zvel *= 0.98; zone += zvel * dt; if (zone < 0.15 || zone > 0.85) zvel *= -1; zone = Math.max(0.15, Math.min(0.85, zone));
        zw = Math.max(0.12, 0.22 - t * 0.003);
        vel += ((holdR ? 1 : 0) - (holdL ? 1 : 0)) * 2.4 * dt; vel *= 0.94; pos = Math.max(0.03, Math.min(0.97, pos + vel * dt + Math.sin(t * 2.3) * 0.0015));
        inside = Math.abs(pos - zone) < zw / 2;
        if (inside) { combo += dt; score += dt * 10 * (1 + Math.floor(combo / 3) * 0.5); } else combo = 0;
      },
      draw(c, t) {
        const g = c.createLinearGradient(0, H * 0.2, 0, H * 0.9); g.addColorStop(0, '#79c8f0'); g.addColorStop(1, '#1d5f9a'); c.fillStyle = g; c.fillRect(0, H * 0.15, W, H * 0.75);
        c.fillStyle = '#e8f8ff'; c.beginPath(); c.moveTo(0, H * 0.5); for (let x = 0; x <= W; x += 10) c.lineTo(x, H * 0.48 + Math.sin(x / 40 + t * 3) * 14 + Math.sin(x / 13 + t * 5) * 4); c.lineTo(W, H * 0.56); c.lineTo(0, H * 0.56); c.fill();
        const zx = zone * W, zwp = zw * W;
        c.fillStyle = 'rgba(76,217,100,.35)'; c.fillRect(zx - zwp / 2, H * 0.3, zwp, H * 0.35); c.strokeStyle = '#4cd964'; c.lineWidth = 3; c.strokeRect(zx - zwp / 2, H * 0.3, zwp, H * 0.35);
        const px = pos * W, py = H * 0.47 + Math.sin(t * 3 + pos * 6) * 10;
        c.save(); c.translate(px, py); c.rotate(vel * 0.6); surfer(c, 0, 0, 58); c.restore();
        c.fillStyle = inside ? '#4cd964' : 'rgba(255,255,255,.3)';
        rr(c, W * 0.05, H * 0.75, W * 0.4, 70, 18); c.fillStyle = holdL ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)'; c.fill(); txt(c, '◀', W * 0.25, H * 0.75 + 35, 30);
        rr(c, W * 0.55, H * 0.75, W * 0.4, 70, 18); c.fillStyle = holdR ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)'; c.fill(); txt(c, '▶', W * 0.75, H * 0.75 + 35, 30);
        txt(c, `${Math.floor(score)} pts${combo > 3 ? `  combo x${1 + Math.floor(combo / 3) * 0.5}` : ''}`, W / 2, H * 0.22, 24, '#fff');
      },
      result() { return { win: score > 20, score: Math.floor(score), money: Math.floor(score * 0.9) }; },
    };
  },

  // ---------------------------------------------------------------- gym
  gym: (o = {}) => {
    let W, H, bar = 0, reps = 0, last = null, pump = 0;
    return {
      title: 'Muscle Beach', hint: 'Tap LEFT and RIGHT alternately as fast as you can', time: 20,
      init(w, h) { W = w; H = h; },
      down(x) { const side = x < W / 2 ? 'L' : 'R'; if (side !== last) { bar += 0.075; last = side; pump = 0.12; sfx.click(); } else bar -= 0.02; if (bar >= 1) { bar = 0; reps++; sfx.coin(); navigator.vibrate?.(30); o.onRep?.(); } },
      update(dt) { bar = Math.max(0, bar - dt * 0.22); pump -= dt; },
      draw(c) {
        const lift = bar * H * 0.18;
        barbell(c, W / 2, H * 0.42, W * 0.7, lift + (pump > 0 ? 6 : 0));
        rr(c, W * 0.1, H * 0.62, W * 0.8, 26, 13); c.fillStyle = 'rgba(255,255,255,.15)'; c.fill();
        rr(c, W * 0.1, H * 0.62, W * 0.8 * bar, 26, 13); c.fillStyle = '#ff8a2a'; c.fill();
        for (const [x, l, s] of [[W * 0.05, 'LEFT', 'L'], [W * 0.55, 'RIGHT', 'R']]) { rr(c, x, H * 0.72, W * 0.4, H * 0.16, 20); c.fillStyle = last === s ? 'rgba(255,255,255,.12)' : 'rgba(255,138,42,.35)'; c.fill(); txt(c, l, x + W * 0.2, H * 0.8, 22); }
        txt(c, `Reps: ${reps}`, W / 2, H * 0.2, 32, '#ffd23f');
      },
      result() { return { win: reps > 0, score: reps, money: reps * 25 }; },
    };
  },

  // ---------------------------------------------------------------- DJ / rhythm
  beat: () => {
    let W, H, notes = [], score = 0, combo = 0, start = 0, A = null, nextBeat = 0, beatN = 0, pops = [], laneFlash = [0, 0, 0];
    const bpm = 112, spb = 60 / bpm, travel = 1.6;
    return {
      title: 'Neon Room DJ', hint: 'Tap a lane as the note hits the line', time: 32,
      init(w, h) {
        W = w; H = h; A = audio(); start = (A ? A.currentTime : performance.now() / 1000) + 1.2; nextBeat = start;
        let t = start + 1.5; while (t < start + 31) { const step = Math.random() < 0.6 ? spb : spb / 2; notes.push({ t, lane: Math.floor(Math.random() * 3), hit: false, miss: false }); if (Math.random() < 0.12) notes.push({ t, lane: (notes[notes.length - 1].lane + 1) % 3, hit: false, miss: false }); t += step; }
      },
      now() { return A ? A.currentTime : performance.now() / 1000; },
      down(x, y) {
        const lane = Math.min(2, Math.floor(x / (W / 3))), now = this.now(); laneFlash[lane] = 0.15;
        let best = null, bd = 1; for (const n of notes) if (!n.hit && !n.miss && n.lane === lane) { const d = Math.abs(n.t - now); if (d < bd) { bd = d; best = n; } }
        if (best && bd < 0.18) { best.hit = true; combo++; const p = bd < 0.07 ? 3 : 1; score += p * (1 + Math.floor(combo / 10)); pops.push({ lane, s: p === 3 ? 'PERFECT' : 'GOOD', l: 0.5 }); A && sfx.note(330 * [1, 1.25, 1.5][lane], A.currentTime, 0.2, 'square', 0.04, 3000); }
        else { combo = 0; }
      },
      update(dt) {
        const now = this.now();
        while (A && nextBeat < now + 0.2) { sfx.kick(nextBeat, 0.5); if (beatN % 2 === 1) sfx.snare(nextBeat, 0.12); sfx.hat(nextBeat + spb / 2, 0.04); if (beatN % 4 === 0) sfx.note(55 * [1, 1, 0.84, 0.89][Math.floor(beatN / 4) % 4] * 2, nextBeat, spb * 3.5, 'sawtooth', 0.05, 700); nextBeat += spb; beatN++; }
        for (const n of notes) if (!n.hit && !n.miss && now - n.t > 0.2) { n.miss = true; combo = 0; }
        for (const p of pops) p.l -= dt; pops = pops.filter(p => p.l > 0);
        for (let i = 0; i < 3; i++) laneFlash[i] -= dt;
      },
      draw(c) {
        const now = this.now(), hitY = H * 0.78, lw = W / 3, cols = ['#ff3b8a', '#38e8ff', '#ffd23f'];
        for (let i = 0; i < 3; i++) { c.fillStyle = laneFlash[i] > 0 ? 'rgba(255,255,255,.14)' : i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.02)'; c.fillRect(i * lw, H * 0.1, lw, H * 0.8); }
        c.fillStyle = '#fff'; c.fillRect(0, hitY - 2, W, 4);
        for (const n of notes) { if (n.hit) continue; const k = 1 - (n.t - now) / travel; if (k < 0 || k > 1.2) continue; const y = H * 0.1 + k * (hitY - H * 0.1); c.fillStyle = n.miss ? 'rgba(120,120,120,.5)' : cols[n.lane]; rr(c, n.lane * lw + 10, y - 12, lw - 20, 24, 12); c.fill(); }
        for (const p of pops) txt(c, p.s, p.lane * lw + lw / 2, hitY - 50 - (0.5 - p.l) * 60, 16, '#fff');
        txt(c, `${score}`, W / 2, H * 0.06, 28, '#ffd23f'); if (combo > 4) txt(c, `combo x${combo}`, W / 2, H * 0.88, 16, '#fff');
      },
      result() { return { win: score > 10, score, money: score * 3 }; },
    };
  },

  // ---------------------------------------------------------------- burger kitchen (your own shop): run between stations, Overcooked-style
  burger: (o = {}) => {
    let W, H, chef, hand = null, plate = [], grill = [null, null], fryer = null, orders = [], served = 0, earned = 0, tips = 0, missed = 0, pops = [], spawnT = 1, oid = 0, smoke = [];
    const lvl = o.level || 0, RECIPES = [
      { n: 'Burger', items: ['bun', 'patty'], pay: 8 },
      { n: 'Cheeseburger', items: ['bun', 'patty', 'cheese'], pay: 10 },
      { n: 'Deluxe', items: ['bun', 'patty', 'cheese', 'lettuce', 'tomato'], pay: 15 },
      { n: 'Meal', items: ['bun', 'patty', 'cheese', 'fries'], pay: 16 },
      { n: 'Fries', items: ['fries'], pay: 4 },
    ];
    const ST = {}; // stations: id -> {x,y,w,h,label}
    const layout = () => {
      const u = W / 10, top = H * 0.25, mid = H * 0.58;
      const s = (id, x, y, w, h, label) => ST[id] = { id, x: x - w / 2, y: y - h / 2, w, h, cx: x, cy: y, label };
      s('fridge', u * 1.4, top, u * 2.2, u * 1.6, 'Patties'); s('grill0', u * 4, top, u * 1.9, u * 1.6, 'Grill'); s('grill1', u * 6.1, top, u * 1.9, u * 1.6, 'Grill'); s('fryer', u * 8.6, top, u * 2.2, u * 1.6, 'Fryer');
      s('bun', u * 1, mid - u * 2.1, u * 1.8, u * 1.6, 'Buns'); s('cheese', u * 1, mid, u * 1.8, u * 1.6, 'Cheese'); s('lettuce', u * 1, mid + u * 2.1, u * 1.8, u * 1.6, 'Lettuce');
      s('tomato', u * 9, mid - u * 2.1, u * 1.8, u * 1.6, 'Tomato'); s('bin', u * 9, mid, u * 1.8, u * 1.6, 'Bin'); s('board', u * 5, mid, u * 3, u * 2.2, 'Board');
      s('window', u * 5, H * 0.92, u * 5, u * 1.2, 'Serve');
      chef = chef || { x: u * 5, y: H * 0.75, tx: u * 5, ty: H * 0.75, go: null };
    };
    const COOK = 3.6, BURN = 9, FRY = 3;
    const newOrder = () => { const pool = RECIPES.slice(0, Math.min(RECIPES.length, 2 + Math.floor(served / 2) + lvl)); const r = pick(pool.concat(RECIPES[4])); const pat = 38 - Math.min(12, served) + r.items.length * 3; orders.push({ id: ++oid, r, t: pat, max: pat }); };
    const pop = (s, col = '#5ee07a', x = chef.x, y = chef.y - 30) => pops.push({ s, col, x, y, l: 1 });
    const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
    const act = id => {
      if (id === 'fridge') { if (!hand) { hand = 'raw'; sfx.click(); } else pop('Hands full!', '#ff6a74'); return; }
      if (id === 'grill0' || id === 'grill1') { const k = +id[5], g = grill[k];
        if (hand === 'raw' && !g) { grill[k] = { t: 0 }; hand = null; sfx.click(); return; }
        if (!hand && g) { hand = g.t >= BURN ? 'burnt' : g.t >= COOK ? 'patty' : null; if (hand) { grill[k] = null; sfx.click(); } else pop('Not cooked yet', '#ffd23f'); return; }
        pop(hand ? 'Grill is busy' : 'Grill is empty', '#ffd23f'); return; }
      if (id === 'fryer') { if (!fryer && !hand) { fryer = { t: 0 }; sfx.click(); return; } if (fryer && !hand) { if (fryer.t >= FRY) { hand = 'fries'; fryer = null; sfx.click(); } else pop('Still frying', '#ffd23f'); return; } pop('Hands full!', '#ff6a74'); return; }
      if (['bun', 'cheese', 'lettuce', 'tomato'].includes(id)) { if (!hand) { hand = id; sfx.click(); } else pop('Hands full!', '#ff6a74'); return; }
      if (id === 'bin') { if (hand) { hand = null; sfx.fail(); pop('Binned', '#aaa'); } else if (plate.length) { plate = []; sfx.fail(); pop('Board cleared', '#aaa'); } return; }
      if (id === 'board') {
        if (hand === 'raw') { pop('Cook it first!', '#ff6a74'); return; }
        if (hand === 'plate') { plate = hand2; hand = null; hand2 = null; return; }
        if (hand) { if (plate.includes(hand)) { pop('Already on there', '#ffd23f'); return; } plate.push(hand); hand = null; sfx.click(); return; }
        if (plate.length) { hand = 'plate'; hand2 = plate; plate = []; sfx.click(); } return; }
      if (id === 'window') {
        const items = hand === 'plate' ? hand2 : hand === 'fries' ? ['fries'] : null; if (!items) { pop('Bring a finished order', '#ffd23f'); return; }
        if (items.includes('burnt')) { pop('Burnt! Customer refused', '#ff6a74'); hand = null; hand2 = null; sfx.fail(); return; }
        const i = orders.findIndex(q => same(q.r.items, items));
        if (i < 0) { pop('Nobody ordered that', '#ff6a74'); sfx.fail(); return; }
        const q = orders[i], tip = Math.round(q.r.pay * 0.6 * q.t / q.max); orders.splice(i, 1); served++; earned += q.r.pay + tip; tips += tip; hand = null; hand2 = null;
        pop(`+$${q.r.pay + tip}${tip ? ' (tip!)' : ''}`); sfx.coin(); bonusT += 3; return; }
    };
    let hand2 = null, bonusT = 0;
    const ITEM_COL = { raw: '#e8798a', patty: '#7a4a2a', burnt: '#222', bun: '#e8b060', cheese: '#ffd23f', lettuce: '#5fbf4a', tomato: '#e23b3b', fries: '#ffcc33' };
    const drawItem = (c, k, x, y, s) => {
      c.save(); c.translate(x, y); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2; c.fillStyle = ITEM_COL[k] || '#fff';
      if (k === 'bun') { c.beginPath(); c.ellipse(0, 0, s * 0.5, s * 0.3, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff6'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-s * 0.2 + i * s * 0.2, -s * 0.15, s * 0.03, 0, 7); c.fill(); } }
      else if (k === 'raw' || k === 'patty' || k === 'burnt') { c.beginPath(); c.ellipse(0, 0, s * 0.46, s * 0.2, 0, 0, 7); c.fill(); c.stroke(); }
      else if (k === 'cheese') { c.beginPath(); c.moveTo(-s * 0.4, -s * 0.15); c.lineTo(s * 0.4, -s * 0.15); c.lineTo(s * 0.3, s * 0.2); c.lineTo(-s * 0.3, s * 0.2); c.closePath(); c.fill(); c.stroke(); }
      else if (k === 'lettuce') { c.beginPath(); for (let i = 0; i < 4; i++) c.arc(-s * 0.3 + i * s * 0.2, 0, s * 0.15, 0, 7); c.fill(); }
      else if (k === 'tomato') { c.beginPath(); c.arc(0, 0, s * 0.28, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#ff9a9a'; c.beginPath(); c.arc(0, 0, s * 0.14, 0, 7); c.fill(); }
      else if (k === 'fries') { c.fillStyle = '#e23b3b'; c.fillRect(-s * 0.25, -s * 0.05, s * 0.5, s * 0.35); c.fillStyle = ITEM_COL.fries; for (let i = 0; i < 5; i++) c.fillRect(-s * 0.22 + i * s * 0.1, -s * 0.35 + (i % 2) * s * 0.06, s * 0.07, s * 0.32); }
      c.restore(); };
    const ORDER_STACK = ['tomato', 'lettuce', 'cheese', 'burnt', 'patty', 'bun'];
    const drawStack = (c, items, x, y, s) => { const st = [...items].sort((a, b) => ORDER_STACK.indexOf(a) - ORDER_STACK.indexOf(b)); const burger = st.filter(k => k !== 'fries'); if (burger.length) { const bun = burger.includes('bun'); if (bun) drawItem(c, 'bun', x, y + s * 0.22, s); burger.filter(k => k !== 'bun').forEach((k, i) => drawItem(c, k, x, y + s * 0.1 - i * s * 0.14, s)); if (bun) { c.save(); c.translate(x, y - s * 0.12 - (burger.length - 1) * s * 0.14); c.scale(1, -1); drawItem(c, 'bun', 0, 0, s * 0.95); c.restore(); } } if (items.includes('fries')) drawItem(c, 'fries', x + (burger.length ? s * 0.55 : 0), y, s * 0.7); };
    return {
      title: o.title || 'Burger Rush', hint: 'Tap a station to run there. Cook patties on the grill (don\'t burn them!), build the order on the board, then serve it at the window.', time: 75,
      init(w, h) { W = w; H = h; layout(); newOrder(); },
      down(x, y) { for (const s of Object.values(ST)) if (x > s.x - 6 && x < s.x + s.w + 6 && y > s.y - 6 && y < s.y + s.h + 6) { chef.go = s.id; const ax = clamp(s.cx, W * 0.15, W * 0.85), ay = clamp(s.cy + (s.cy < H * 0.4 ? s.h * 0.9 : s.cy > H * 0.85 ? -s.h * 0.9 : 0), H * 0.3, H * 0.85); chef.tx = s.id === 'bun' || s.id === 'cheese' || s.id === 'lettuce' ? s.x + s.w + 18 : s.id === 'tomato' || s.id === 'bin' ? s.x - 18 : s.id === 'board' ? s.cx : ax; chef.ty = s.id === 'board' ? s.y + s.h + 18 : ay; return; } },
      update(dt) {
        const dx = chef.tx - chef.x, dy = chef.ty - chef.y, d = Math.hypot(dx, dy), sp = W * 1.1 * dt;
        if (d > sp) { chef.x += dx / d * sp; chef.y += dy / d * sp; chef.walk = (chef.walk || 0) + dt * 14; } else { chef.x = chef.tx; chef.y = chef.ty; if (chef.go) { const g = chef.go; chef.go = null; act(g); } }
        for (const g of grill) if (g) { g.t += dt; if (g.t > BURN && Math.random() < dt * 6) smoke.push({ x: 0, y: 0, l: 1, g }); }
        if (fryer) fryer.t += dt;
        grill.forEach((g, k) => { if (g && g.t >= COOK && g.t - dt < COOK) sfx.click(); });
        spawnT -= dt; if (spawnT <= 0 && orders.length < 3) { newOrder(); spawnT = Math.max(6, 13 - served * 0.5); }
        for (let i = orders.length - 1; i >= 0; i--) { orders[i].t -= dt; if (orders[i].t <= 0) { orders.splice(i, 1); missed++; pop('Customer walked out', '#ff6a74', W / 2, H * 0.16); sfx.fail(); } }
        if (!orders.length && spawnT > 2) spawnT = 2;
        for (const p of pops) { p.l -= dt; p.y -= dt * 30; } pops = pops.filter(p => p.l > 0);
        const b = bonusT; bonusT = 0; return { addTime: b };
      },
      draw(c, t) {
        c.fillStyle = '#2a2d36'; c.fillRect(0, H * 0.18, W, H * 0.82);
        for (let i = 0; i < 12; i++) for (let j = 0; j < 14; j++) if ((i + j) % 2) { c.fillStyle = 'rgba(255,255,255,.03)'; c.fillRect(i * W / 10, H * 0.18 + j * W / 10, W / 10, W / 10); }
        // orders
        orders.forEach((q, i) => { const w = W * 0.3, x = W * 0.035 + i * (w + W * 0.02), y = H * 0.02, h = H * 0.14; rr(c, x, y, w, h, 10); c.fillStyle = '#fff4dc'; c.fill(); c.fillStyle = q.t / q.max < 0.3 ? '#ff3b4a' : q.t / q.max < 0.6 ? '#ffb020' : '#4cd964'; c.fillRect(x + 6, y + h - 9, (w - 12) * q.t / q.max, 5); txt(c, q.r.n, x + w / 2, y + 13, 11, '#8a5a35', 900); drawStack(c, q.r.items, x + w / 2, y + h * 0.55, Math.min(40, w * 0.4)); });
        // stations
        for (const s of Object.values(ST)) {
          rr(c, s.x, s.y, s.w, s.h, 10); c.fillStyle = s.id === 'window' ? '#3a5fa0' : s.id === 'bin' ? '#3a3d45' : s.id.startsWith('grill') ? '#1a1a1e' : s.id === 'fryer' ? '#5a5d66' : s.id === 'board' ? '#c9a27a' : '#8a8e96'; c.fill(); c.strokeStyle = chef.go === s.id ? '#ffd23f' : 'rgba(255,255,255,.2)'; c.lineWidth = chef.go === s.id ? 3 : 1.5; c.stroke();
          const sz = Math.min(s.w, s.h) * 0.8;
          if (['bun', 'cheese', 'lettuce', 'tomato'].includes(s.id)) drawItem(c, s.id, s.cx, s.cy - 4, sz);
          if (s.id === 'fridge') { drawItem(c, 'raw', s.cx - sz * 0.25, s.cy - 6, sz * 0.7); drawItem(c, 'raw', s.cx + sz * 0.25, s.cy - 2, sz * 0.7); }
          if (s.id.startsWith('grill')) { const g = grill[+s.id[5]]; c.strokeStyle = '#444'; c.lineWidth = 2; for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(s.x + 6, s.y + k * s.h / 5); c.lineTo(s.x + s.w - 6, s.y + k * s.h / 5); c.stroke(); }
            if (g) { const k = g.t >= BURN ? 'burnt' : g.t >= COOK ? 'patty' : 'raw'; drawItem(c, k, s.cx, s.cy - 2, sz); const f = Math.min(1, g.t / COOK); c.fillStyle = g.t >= BURN ? '#ff3b4a' : g.t >= COOK ? '#4cd964' : '#ffb020'; c.fillRect(s.x + 6, s.y + s.h - 8, (s.w - 12) * (g.t >= COOK ? Math.min(1, (g.t - COOK) / (BURN - COOK)) : f), 4); if (g.t >= COOK && g.t < BURN && Math.floor(t * 4) % 2) txt(c, 'READY', s.cx, s.y - 8, 10, '#4cd964'); if (g.t > BURN - 2 && g.t < BURN) txt(c, '!!', s.cx + s.w / 2 - 8, s.y + 10, 14, '#ff3b4a'); } }
          if (s.id === 'fryer') { c.fillStyle = '#c99a3a'; rr(c, s.x + 8, s.y + 8, s.w - 16, s.h - 16, 6); c.fill(); if (fryer) { drawItem(c, 'fries', s.cx, s.cy, sz * 0.8); c.fillStyle = fryer.t >= FRY ? '#4cd964' : '#ffb020'; c.fillRect(s.x + 6, s.y + s.h - 8, (s.w - 12) * Math.min(1, fryer.t / FRY), 4); } }
          if (s.id === 'board' && plate.length) drawStack(c, plate, s.cx, s.cy, sz * 0.9);
          if (s.id === 'bin') txt(c, '🗑', s.cx, s.cy - 4, sz * 0.6);
          txt(c, s.label, s.cx, s.y + s.h - (s.id.startsWith('grill') || s.id === 'fryer' ? -12 : 10), 10, s.id === 'window' ? '#fff' : 'rgba(255,255,255,.75)', 800);
        }
        for (const sm of smoke) { sm.l -= 0.02; } smoke = smoke.filter(s => s.l > 0); grill.forEach((g, k) => { if (g && g.t > BURN) { const s = ST['grill' + k]; for (let i = 0; i < 3; i++) { c.fillStyle = `rgba(80,80,80,${0.35 - i * 0.1})`; c.beginPath(); c.arc(s.cx + Math.sin(t * 3 + i) * 8, s.y - 6 - ((t * 30 + i * 12) % 36), 7 + i * 3, 0, 7); c.fill(); } } });
        // chef
        const bob = Math.sin(chef.walk || 0) * 2; c.save(); c.translate(chef.x, chef.y + bob);
        c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0, 16 - bob, 14, 5, 0, 0, 7); c.fill();
        c.fillStyle = '#ffffff'; rr(c, -11, -6, 22, 20, 6); c.fill(); c.fillStyle = o.skin || '#c68642'; c.beginPath(); c.arc(0, -13, 9, 0, 7); c.fill(); c.fillStyle = '#ffffff'; rr(c, -8, -30, 16, 12, 4); c.fill(); c.fillRect(-10, -21, 20, 4);
        if (hand) { if (hand === 'plate') { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -44, 18, 6, 0, 0, 7); c.fill(); drawStack(c, hand2 || [], 0, -50, 30); } else drawItem(c, hand, 0, -44, 26); }
        c.restore();
        for (const p of pops) { c.globalAlpha = Math.min(1, p.l * 2); txt(c, p.s, p.x, p.y, 15, p.col); c.globalAlpha = 1; }
        txt(c, `Served ${served} · $${earned}${missed ? ` · ${missed} walked out` : ''}`, W / 2, H * 0.195, 13, '#ffd23f');
      },
      result() { return { win: served > 0, score: served, money: earned, tips, missed }; },
      keepOnQuit: true,
    };
  },

  // ---------------------------------------------------------------- hoops
  hoops: () => {
    let W, H, hx = 0.5, hdir = 1, ball = null, start = null, made = 0, shots = 0, msg = '', msgT = 0;
    return {
      title: 'Venice Courts', hint: 'Swipe up to shoot. Time it with the moving hoop', time: 30,
      init(w, h) { W = w; H = h; },
      down(x, y) { if (!ball) start = { x, y, t: performance.now() }; },
      up(x, y) {
        if (!start || ball) return; const dy = start.y - y, dx = x - start.x; if (dy < 40) { start = null; return; }
        ball = { x: W / 2, y: H * 0.82, vx: dx * 2.2, vy: -Math.min(1400, dy * 4.5), r: 26 }; start = null; shots++;
      },
      update(dt, t) {
        hx += hdir * dt * (0.25 + t * 0.012); if (hx > 0.85 || hx < 0.15) hdir *= -1;
        if (ball) {
          ball.vy += 1500 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.r = Math.max(14, ball.r - dt * 14);
          const rimX = hx * W, rimY = H * 0.22;
          if (ball.vy > 0 && Math.abs(ball.y - rimY) < 14 && !ball.scored) {
            if (Math.abs(ball.x - rimX) < 30) { ball.scored = true; made++; msg = made % 5 === 0 ? 'ON FIRE' : 'SWISH!'; msgT = 0.8; sfx.coin(); navigator.vibrate?.(20); }
            else if (Math.abs(ball.x - rimX) < 50) { ball.vx *= -0.6; ball.vy *= -0.4; sfx.thud(); }
          }
          if (ball.y > H + 50) ball = null;
        }
        msgT -= dt;
      },
      draw(c) {
        c.fillStyle = '#c86a3a'; c.fillRect(0, H * 0.55, W, H * 0.45); c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(W / 2, H * 1.0, W * 0.4, Math.PI, 0); c.stroke();
        const rimX = hx * W, rimY = H * 0.22;
        c.fillStyle = '#fff'; rr(c, rimX - 60, rimY - 70, 120, 80, 8); c.fill(); c.strokeStyle = '#e23b3b'; c.lineWidth = 4; c.strokeRect(rimX - 22, rimY - 40, 44, 32);
        c.strokeStyle = '#ff6a1a'; c.lineWidth = 5; c.beginPath(); c.ellipse(rimX, rimY, 30, 7, 0, 0, 7); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1.5; for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(rimX + i * 9, rimY + 4); c.lineTo(rimX + i * 6, rimY + 34); c.stroke(); }
        if (ball) ballDraw(c, ball.x, ball.y, ball.r); else ballDraw(c, W / 2, H * 0.82, 26);
        if (start) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(W / 2, H * 0.82); c.lineTo(W / 2, H * 0.6); c.stroke(); c.setLineDash([]); }
        txt(c, `${made} / ${shots}`, W / 2, H * 0.5, 28, '#fff');
        if (msgT > 0) txt(c, msg, W / 2, H * 0.42, 26, '#ffd23f');
      },
      result() { return { win: made > 0, score: made, money: made * 20 }; },
    };
  },
};

// ---------------------------------------------------------------- runner
export function runMinigame(kind, opts = {}) {
  return new Promise(resolve => {
    const root = document.getElementById('mg'), cv = document.getElementById('mgCanvas'), ctx = cv.getContext('2d');
    const game = GAMES[kind](opts);
    root.classList.remove('hidden');
    document.getElementById('mgTitle').textContent = opts.title || game.title;
    const timerBar = document.getElementById('mgTimer'), card = document.getElementById('mgCard');
    let W = 0, H = 0, running = false, t = 0, timeLeft = game.time, raf = 0, finished = false;
    const size = () => { const r = cv.getBoundingClientRect(); W = r.width; H = r.height; const dpr = Math.min(devicePixelRatio, 2); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); game.init(W, H);
    const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const onDown = e => { e.preventDefault(); if (!running) return; cv.setPointerCapture(e.pointerId); game.down?.(...pos(e)); };
    const onMove = e => { if (running) game.move?.(...pos(e)); };
    const onUp = e => { if (running) game.up?.(...pos(e)); };
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
    const cleanup = () => { cancelAnimationFrame(raf); cv.removeEventListener('pointerdown', onDown); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointercancel', onUp); root.classList.add('hidden'); card.classList.add('hidden'); };
    const showCard = (html, btn, cb) => { card.innerHTML = html + `<button class="big" id="mgBtn">${btn}</button>`; card.classList.remove('hidden'); document.getElementById('mgBtn').onclick = cb; };
    const finish = (quit) => {
      if (finished) return; finished = true; running = false;
      const r = quit ? (game.keepOnQuit ? { ...game.result(), quit: true } : { win: false, quit: true, score: 0 }) : game.result();
      if (quit) { cleanup(); resolve(r); return; }
      r.win ? sfx.cash() : sfx.fail();
      const money = r.money ? `<div class="mg-money${r.money < 0 ? ' neg' : ''}">${r.money < 0 ? '−' : '+'}$${Math.abs(r.money)}</div>` : '';
      showCard(`<h3>${game.time === 0 ? (r.money >= 0 ? 'Cashed out' : 'Better luck next time') : r.win ? (opts.winText || 'Nice!') : (opts.loseText || 'Out of time!')}</h3>${money}<p>${opts.scoreLabel ? opts.scoreLabel(r) : r.score != null ? `Score: ${r.score}` : ''}</p>`, 'Continue', () => { cleanup(); resolve(r); });
    };
    document.getElementById('mgQuit').onclick = () => finish(true);
    showCard(`<h3>${opts.title || game.title}</h3><p>${game.hint}</p>`, 'Start', () => { card.classList.add('hidden'); running = true; last = performance.now(); });
    let last = performance.now();
    const loop = now => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (running) {
        t += dt; if (game.time) timeLeft -= dt;
        const r = game.update(dt, t);
        if (r && r.addTime) timeLeft = Math.min(game.time, timeLeft + r.addTime);
        if (r === true) finish(false);
        if (game.time && timeLeft <= 0) finish(false);
      }
      ctx.clearRect(0, 0, W, H);
      game.draw(ctx, t);
      timerBar.style.width = game.time ? Math.max(0, timeLeft / game.time * 100) + '%' : '0%';
      timerBar.style.background = timeLeft < 3 ? '#ff3b4a' : '';
    };
    raf = requestAnimationFrame(loop);
  });
}
