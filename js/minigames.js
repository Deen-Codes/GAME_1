// Touch minigames in the spirit of Chinatown Wars. Each one draws on a 2D canvas overlay.
import { sfx, audio } from './audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
function emoji(ctx, e, x, y, size) { ctx.fillStyle = '#000'; ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e, x, y); }
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
        } else { rr(c, gx, gy, gw, gh, 14); c.fillStyle = '#1b2230'; c.fill(); emoji(c, '🔓', W / 2, gy + gh / 2, 70); }
        for (const s of shards) { c.save(); c.translate(s.x, s.y); c.rotate(s.r); c.fillStyle = 'rgba(190,230,255,.85)'; c.beginPath(); c.moveTo(0, -s.s / 2); c.lineTo(s.s / 2, s.s / 2); c.lineTo(-s.s / 2, s.s / 3); c.fill(); c.restore(); }
        c.restore();
        txt(c, `${Math.min(hits, need)} / ${need}`, W / 2, H * 0.84, 28);
        emoji(c, '✊', W / 2, H * 0.92, 40);
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
        if (done) emoji(c, '🔑', W / 2, H * 0.5, 80);
      },
      result() { return { win: done, score: left.filter(l => l.done).length }; },
    };
  },

  // ---------------------------------------------------------------- taco truck
  taco: () => {
    const ING = [['🫓', 'Shell'], ['🥩', 'Carne'], ['🍗', 'Pollo'], ['🧀', 'Queso'], ['🥬', 'Lettuce'], ['🍅', 'Tomato'], ['🥑', 'Guac'], ['🌶️', 'Salsa']];
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
        order.forEach((ing, i) => { c.globalAlpha = i < prog ? 0.25 : 1; emoji(c, ING[ing][0], W / 2 + (i - (n - 1) / 2) * (sz + 6), H * 0.27, sz); c.globalAlpha = 1; if (i === prog) { c.fillStyle = '#ff8a2a'; c.fillRect(W / 2 + (i - (n - 1) / 2) * (sz + 6) - sz / 2, H * 0.27 + sz / 2 + 4, sz, 5); } });
        emoji(c, '🌮', W * 0.5, H * 0.41, 46 + prog * 3);
        for (let i = 0; i < 8; i++) { const b = btn(i); rr(c, b.x, b.y, b.w, b.h, 16); c.fillStyle = 'rgba(255,255,255,.12)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.stroke(); emoji(c, ING[i][0], b.x + b.w / 2, b.y + b.h * 0.42, b.w * 0.45); txt(c, ING[i][1], b.x + b.w / 2, b.y + b.h * 0.84, 11, '#ddd', 800); }
        if (flash > 0) txt(c, msg, W / 2, H * 0.52, 22, bad > 0 ? '#ff6a74' : '#5ee07a');
        txt(c, `Served ${served} · $${earned}`, W / 2, H * 0.08, 16, '#ffd23f');
      },
      result() { return { win: served > 0, score: served, money: earned }; },
    };
  },

  // ---------------------------------------------------------------- pier shooting gallery
  gallery: () => {
    let W, H, targets = [], score = 0, spawn = 0, pops = [];
    return {
      title: 'Shooting Gallery', hint: 'Tap ducks 🦆. Golden ducks are +5. Avoid bombs!', time: 30,
      init(w, h) { W = w; H = h; },
      down(x, y) {
        for (const t of targets) if (!t.hit && Math.hypot(x - t.x, y - t.y) < 34) {
          t.hit = true; const v = t.k === '💣' ? -5 : t.k === '🐥' ? 5 : 1; score = Math.max(0, score + v);
          pops.push({ x: t.x, y: t.y, s: v > 0 ? `+${v}` : `${v}`, l: 0.7, col: v > 0 ? '#5ee07a' : '#ff6a74' });
          v > 0 ? sfx.coin() : sfx.fail(); sfx.shot(false, false); navigator.vibrate?.(v > 0 ? 15 : 60); return;
        }
        sfx.shot(true, false);
      },
      update(dt, t) {
        spawn -= dt;
        if (spawn <= 0) { spawn = rnd(0.35, 0.8) * Math.max(0.5, 1 - t / 40); const lane = Math.floor(Math.random() * 3), dir = lane % 2 ? -1 : 1; targets.push({ lane, x: dir > 0 ? -30 : W + 30, y: H * (0.3 + lane * 0.17), vx: dir * rnd(90, 160 + t * 4), k: Math.random() < 0.18 ? '💣' : Math.random() < 0.12 ? '🐥' : '🦆', hit: false, bob: rnd(0, 6) }); }
        for (const t of targets) { t.x += t.vx * dt; t.bob += dt * 6; if (t.hit) t.y += 300 * dt; }
        targets = targets.filter(t => t.x > -60 && t.x < W + 60 && t.y < H);
        for (const p of pops) { p.l -= dt; p.y -= 40 * dt; } pops = pops.filter(p => p.l > 0);
      },
      draw(c) {
        for (let i = 0; i < 3; i++) { const y = H * (0.3 + i * 0.17) + 26; c.fillStyle = i % 2 ? '#2f6bb0' : '#3d8bd0'; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= W; x += 20) c.lineTo(x, y + Math.sin(x / 20 + performance.now() / 300 + i) * 5); c.lineTo(W, y + 40); c.lineTo(0, y + 40); c.fill(); }
        for (const t of targets) { c.save(); if (t.vx < 0) { c.translate(t.x, 0); c.scale(-1, 1); c.translate(-t.x, 0); } emoji(c, t.k, t.x, t.y + Math.sin(t.bob) * 3, 44); c.restore(); }
        for (const p of pops) txt(c, p.s, p.x, p.y, 24, p.col);
        c.fillStyle = '#b8352f'; c.fillRect(0, H * 0.12, W, 18); for (let x = 0; x < W; x += 40) { c.fillStyle = x / 40 % 2 ? '#fff' : '#b8352f'; c.beginPath(); c.arc(x + 20, H * 0.12 + 18, 20, 0, Math.PI); c.fill(); }
        txt(c, `Score ${score}`, W / 2, H * 0.86, 30, '#ffd23f');
      },
      result() { return { win: score > 0, score, money: score * 6 }; },
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
        c.save(); c.translate(px, py); c.rotate(vel * 0.6); emoji(c, '🏄', 0, 0, 58); c.restore();
        c.fillStyle = inside ? '#4cd964' : 'rgba(255,255,255,.3)';
        rr(c, W * 0.05, H * 0.75, W * 0.4, 70, 18); c.fillStyle = holdL ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)'; c.fill(); txt(c, '◀', W * 0.25, H * 0.75 + 35, 30);
        rr(c, W * 0.55, H * 0.75, W * 0.4, 70, 18); c.fillStyle = holdR ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)'; c.fill(); txt(c, '▶', W * 0.75, H * 0.75 + 35, 30);
        txt(c, `${Math.floor(score)} pts${combo > 3 ? `  🔥x${1 + Math.floor(combo / 3) * 0.5}` : ''}`, W / 2, H * 0.22, 24, '#fff');
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
        emoji(c, '🏋️', W / 2, H * 0.42 - lift * 0.4, 110 + (pump > 0 ? 8 : 0));
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
            if (Math.abs(ball.x - rimX) < 30) { ball.scored = true; made++; msg = made % 5 === 0 ? 'ON FIRE 🔥' : 'SWISH!'; msgT = 0.8; sfx.coin(); navigator.vibrate?.(20); }
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
        if (ball) emoji(c, '🏀', ball.x, ball.y, ball.r * 2); else emoji(c, '🏀', W / 2, H * 0.82, 52);
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
      const r = quit ? { win: false, quit: true, score: 0 } : game.result();
      if (quit) { cleanup(); resolve(r); return; }
      r.win ? sfx.cash() : sfx.fail();
      const money = r.money ? `<div class="mg-money">+$${r.money}</div>` : '';
      showCard(`<h3>${r.win ? (opts.winText || 'Nice!') : (opts.loseText || 'Out of time!')}</h3>${money}<p>${opts.scoreLabel ? opts.scoreLabel(r) : r.score != null ? `Score: ${r.score}` : ''}</p>`, 'Continue', () => { cleanup(); resolve(r); });
    };
    document.getElementById('mgQuit').onclick = () => finish(true);
    showCard(`<h3>${opts.title || game.title}</h3><p>${game.hint}</p>`, 'Start', () => { card.classList.add('hidden'); running = true; last = performance.now(); });
    let last = performance.now();
    const loop = now => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (running) {
        t += dt; timeLeft -= dt;
        const r = game.update(dt, t);
        if (r && r.addTime) timeLeft = Math.min(game.time, timeLeft + r.addTime);
        if (r === true) finish(false);
        if (timeLeft <= 0) finish(false);
      }
      ctx.clearRect(0, 0, W, H);
      game.draw(ctx, t);
      timerBar.style.width = Math.max(0, timeLeft / game.time * 100) + '%';
      timerBar.style.background = timeLeft < 3 ? '#ff3b4a' : '';
    };
    raf = requestAnimationFrame(loop);
  });
}
