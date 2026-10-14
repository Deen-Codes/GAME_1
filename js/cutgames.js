// Minigames as playable cutscenes in the real 3D world: you watch your own character do it, on a little set
// built where you're standing (or in the sea, at the hoop, behind the counter...). A light HUD sits on top.
import * as THREE from '../lib/three.module.min.js';
import { sfx, audio } from './audio.js?v=195';

let C = null; // context from main.js: scene, camera, hero, helpers
export function initCutGames(ctx) { C = ctx; }

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => k * k * (3 - 2 * k);
const MC = new Map();
const mat = (col, o = {}) => { const k = col + JSON.stringify(o); if (!MC.has(k)) MC.set(k, new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, ...o })); return MC.get(k); };
const glowM = col => mat(col, { emissive: col, emissiveIntensity: 1.2 });

// ---------------------------------------------------------------- a temporary set, laid out in local space around an anchor
function makeSet(x, y, z, face) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = face; C.dyn.add(g); g.updateMatrixWorld(true);
  const S = {
    g, face, x, y, z,
    L(lx, ly, lz) { g.updateMatrixWorld(true); return g.localToWorld(new THREE.Vector3(lx, ly, lz)); },
    add(m, px = 0, py = 0, pz = 0, parent = g) { m.position.set(px, py, pz); m.traverse?.(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); parent.add(m); return m; },
    box(w, h, d, col, px, py, pz, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof col === 'string' ? mat(col) : col); return S.add(m, px, py + h / 2, pz, parent); },
    cyl(r1, r2, h, col, px, py, pz, seg = 16, parent) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), typeof col === 'string' ? mat(col) : col); return S.add(m, px, py + h / 2, pz, parent); },
    cam(px, py, pz, lx, ly, lz) { const p = S.L(px, py, pz), l = S.L(lx, ly, lz); C.cutCam.position.copy(p); C.cutCam.lookAt(l); },
    hero(px, py, pz, rot = 0, weapon = false) { const h = C.hero(), hr = C.heroRoot(), w = C.heroW(); if (w) w.group.visible = weapon; hr.visible = true; const p = S.L(px, py, pz); hr.position.copy(p); h.root.rotation.set(0, face + rot, 0); return h; },
    dispose() { C.dyn.remove(g); g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material?.map && o.material.userData?.own) o.material.map.dispose(); }); const w = C.heroW(); if (w) w.group.visible = true; const h = C.hero(); h.torso.rotation.set(0, 0, 0); h.root.rotation.x = 0; h.head.rotation.set(0, 0, 0); for (const A of [h.armL, h.armR]) { A.pivot.rotation.set(0, 0, 0); if (A.elbow) A.elbow.rotation.set(0, 0, 0); } },
  };
  return S;
}
const poseIdle = (h, extra = {}) => C.poseCharacter(h, { phase: 0, speed: 0, air: false, aim: 0, recoil: 0, t: C.time(), ...extra });
const arm = (A, lift, bend = 0, side = 0) => { A.pivot.rotation.set(lift, 0, side); if (A.elbow) A.elbow.rotation.set(bend, 0, 0); };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pickAt(x, y, objs) { ndc.set(x / C.W() * 2 - 1, -(y / C.H()) * 2 + 1); ray.setFromCamera(ndc, C.cutCam); const hit = ray.intersectObjects(objs, true)[0]; if (!hit) return null; let o = hit.object; while (o && !o.userData.tag) o = o.parent; return o ? { o, p: hit.point } : null; }
function canvasTex(w, h, fn) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const texMat = (t, o = {}) => { const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, ...o }); m.userData.own = true; return m; };

// ---------------------------------------------------------------- HUD helpers (drawn on the minigame canvas over the 3D)
function txt(c, s, x, y, size, col = '#fff', align = 'center') { c.font = `900 ${size}px system-ui`; c.textAlign = align; c.textBaseline = 'middle'; c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 8; c.fillStyle = col; c.fillText(s, x, y); c.shadowBlur = 0; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function bar(c, x, y, w, h, k, col, back = 'rgba(0,0,0,.4)') { rr(c, x, y, w, h, h / 2); c.fillStyle = back; c.fill(); if (k > 0) { rr(c, x, y, Math.max(h, w * clamp(k, 0, 1)), h, h / 2); c.fillStyle = col; c.fill(); } }
// a row of HUD buttons: [[label, fn, off]] -> pushes hit boxes into `into`
function btnRow(c, into, labels, y, h = 52) { const W = C.W(), n = labels.length, bw = (W - 24 - (n - 1) * 8) / n; labels.forEach(([l, fn, off, hot], i) => { const b = { x: 12 + i * (bw + 8), y, w: bw, h, fn, off }; into.push(b); rr(c, b.x, b.y, b.w, b.h, 14); c.fillStyle = off ? 'rgba(20,20,30,.35)' : hot ? 'rgba(255,138,42,.85)' : 'rgba(20,20,30,.62)'; c.fill(); c.strokeStyle = off ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.35)'; c.lineWidth = 1.5; c.stroke(); txt(c, l, b.x + bw / 2, y + h / 2, 15, off ? 'rgba(255,255,255,.35)' : '#fff'); }); }
const hitBtn = (btns, x, y) => { for (const b of btns) if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h && !b.off) { sfx.click(); b.fn(); return true; } return false; };

// a person for the scene (opponent, dealer, customer)
// remove a scene person and free its meshes (their materials are per-character; shared textured ones are left alone)
function drop(ch) { ch.root.parent?.remove(ch.root); ch.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && !o.material.map) o.material.dispose(); }); }
function person(cfg, extra = {}) { const ch = C.buildCharacter({ ...(cfg || C.npcCfg()), ...extra }); ch.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); return ch; }

export const CUT = {};

// ================================================================ treadmill: mash to run
CUT.tread = () => {
  const P = C.P, S = makeSet(P.x, C.groundY(P.x, P.z), P.z, P.face + Math.PI / 2);
  S.box(0.95, 0.16, 2.1, '#2a2d33', 0, 0, 0); S.box(0.78, 0.03, 1.9, '#16161b', 0, 0.16, 0);
  const stripes = []; for (let i = 0; i < 8; i++) stripes.push(S.box(0.76, 0.012, 0.05, '#3a3d45', 0, 0.19, 0));
  for (const sx of [-0.44, 0.44]) { S.box(0.06, 1.15, 0.06, '#9aa0a8', sx, 0.16, 0.86); S.box(0.05, 0.05, 0.7, '#9aa0a8', sx, 1.0, 0.55); }
  S.box(0.94, 0.06, 0.06, '#9aa0a8', 0, 1.28, 0.86); const con = S.box(0.62, 0.3, 0.12, '#1c1e24', 0, 1.25, 0.9); con.rotation.x = -0.5;
  const scr = S.box(0.42, 0.16, 0.02, glowM('#38e8ff'), 0, 1.32, 0.84); scr.rotation.x = -0.5;
  let spd = 0, dist = 0, ph = 0, belt = 0, msgT = 0, msg = '';
  return { see: true, title: 'Treadmill', hint: 'Mash the screen to run!', time: 25,
    init() {}, down() { spd = Math.min(1, spd + 0.085); sfx.click(); navigator.vibrate?.(8); if (spd > 0.92 && msgT <= 0) { msg = 'FULL PACE'; msgT = 0.8; } },
    update(dt) { spd = Math.max(0, spd - dt * 0.32); dist += spd * dt * 6; ph += dt * (3 + spd * 11); belt += spd * dt * 3.2; msgT -= dt; },
    frame(dt) {
      const h = S.hero(0, 0.19, 0); poseIdle(h, { phase: ph, speed: Math.min(1, spd * 1.2 + 0.05) });
      arm(h.armL, Math.sin(ph) * 0.7 * (0.3 + spd), -1.2); arm(h.armR, -Math.sin(ph) * 0.7 * (0.3 + spd), -1.2); h.torso.rotation.x = 0.12 + spd * 0.12;
      stripes.forEach((s, i) => { s.position.z = (((i * 0.24 - belt) % 1.9) + 1.9) % 1.9 - 0.95; });
      S.cam(4.9, 1.7, 1.2, 0, 0.95, 0.1); C.cutRender(0);
    },
    draw(c) { const W = C.W(), H = C.H(); txt(c, `${Math.round(dist * 10)} m`, W / 2, H * 0.14, 34, '#ffd23f'); bar(c, W * 0.15, H * 0.88, W * 0.7, 16, spd, spd > 0.85 ? '#4cd964' : '#ff8a2a'); if (msgT > 0) txt(c, msg, W / 2, H * 0.82, 18, '#5ee07a'); },
    result() { return { win: dist > 30, score: Math.round(dist) }; },
    cleanup() { S.dispose(); } };
};

// ================================================================ surfing: out on the real sea, hold left/right to ride the sweet spot
CUT.surf = () => {
  const P = C.P, sx = P.x, sz = C.shoreLine(P.x) + 16, S = makeSet(sx, C.WATER_Y, sz, Math.PI);
  const rig = new THREE.Group(); S.add(rig, 0, 0, 0);
  const board = S.box(0.56, 0.08, 2.1, '#ff6fb5', 0, 0.05, 0, rig); S.box(0.1, 0.085, 2.0, '#ffffff', 0, 0.05, 0, rig); S.box(0.03, 0.18, 0.2, '#16161b', 0, -0.12, -0.8, rig);
  const waveM = new THREE.MeshStandardMaterial({ color: '#2a8fc0', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92, side: THREE.DoubleSide });
  const wave = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 26, 24, 1, true, Math.PI * 0.55, Math.PI * 0.75), waveM); wave.rotation.z = Math.PI / 2; S.add(wave, 0, 1.0, -3.4);
  const lip = S.box(26, 0.35, 0.5, '#e8f8ff', 0, 3.6, -2.2); const foam = []; for (let i = 0; i < 18; i++) foam.push(S.box(1.3, 0.025, 0.5, mat('#ffffff', { transparent: true, opacity: 0.6 }), -12 + i * 1.4, 0.0, -1.0));
  let pos = 0.5, vel = 0, zone = 0.5, zvel = 0, zw = 0.22, score = 0, holdL = false, holdR = false, inZ = false, combo = 0, wipe = 0, outT = 0;
  return { see: true, title: 'Surf the wave', hint: 'Hold left or right to stay in the sweet spot', time: 25,
    init() {}, down(x) { if (x < C.W() / 2) holdL = true; else holdR = true; }, up(x) { if (x < C.W() / 2) holdL = false; else holdR = false; },
    update(dt, t) {
      zvel += rnd(-1.6, 1.6) * dt * (1 + t / 20); zvel *= 0.98; zone += zvel * dt; if (zone < 0.15 || zone > 0.85) zvel *= -1; zone = clamp(zone, 0.15, 0.85); zw = Math.max(0.12, 0.22 - t * 0.003);
      if (wipe > 0) { wipe -= dt; if (wipe <= 0) { pos = zone; vel = 0; } return; }
      vel += ((holdR ? 1 : 0) - (holdL ? 1 : 0)) * 2.4 * dt; vel *= 0.94; pos = clamp(pos + vel * dt + Math.sin(t * 2.3) * 0.0015, 0.03, 0.97);
      inZ = Math.abs(pos - zone) < zw / 2;
      if (inZ) { outT = 0; combo += dt; score += dt * 10 * (1 + Math.floor(combo / 3) * 0.5); } else { combo = 0; outT += dt; if (outT > 2.6) { wipe = 1.4; outT = 0; sfx.splash?.(); navigator.vibrate?.(60); C.spawnParticles(S.L((pos - 0.5) * 9, 0.3, 0).x, C.WATER_Y + 0.3, S.L((pos - 0.5) * 9, 0.3, 0).z, ['#ffffff', '#cfefff'], 24, 4, 0.8, 0.15, -6); } }
    },
    frame(dt, t) {
      const lx = (pos - 0.5) * 9, bob = Math.sin(t * 3.1) * 0.08, tilt = clamp(vel * 0.6, -0.4, 0.4);
      rig.position.set(lx, bob + 0.05, 0); rig.rotation.set(Math.sin(t * 2.2) * 0.05, 0, -tilt);
      wave.position.x = Math.sin(t * 0.7) * 0.6; lip.position.x = wave.position.x; foam.forEach((f, i) => { f.position.y = 0.04 + Math.abs(Math.sin(t * 4 + i)) * 0.05; f.position.z = -1.0 + Math.sin(t * 2 + i * 1.7) * 0.3; f.rotation.y = Math.sin(t + i) * 0.3; });
      const h = S.hero(lx, bob + 0.13, 0, Math.PI / 2); poseIdle(h);
      if (wipe > 0) { h.root.rotation.x = -1.3; h.root.position.y = 0; } else {
        h.legL.pivot.rotation.x = -0.35; h.legL.knee.rotation.x = 0.7; h.legR.pivot.rotation.x = 0.35; h.legR.knee.rotation.x = 0.5; h.hips.position.y = h.legLen * 0.86;
        arm(h.armL, -0.2, -0.3, 1.25 + tilt); arm(h.armR, -0.2, -0.3, -1.25 + tilt); h.torso.rotation.x = 0.3; }
      board.parent.visible = true;
      S.cam(6.8 + lx * 0.3, 3.4, 6.2, lx * 0.6, 0.7, -0.8); C.cutRender(0);
    },
    draw(c) { const W = C.W(), H = C.H(), y = H * 0.84, x0 = W * 0.08, w = W * 0.84;
      rr(c, x0, y, w, 22, 11); c.fillStyle = 'rgba(0,30,60,.45)'; c.fill(); rr(c, x0 + (zone - zw / 2) * w, y, zw * w, 22, 11); c.fillStyle = inZ ? 'rgba(76,217,100,.85)' : 'rgba(76,217,100,.5)'; c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x0 + pos * w, y + 11, 13, 0, 7); c.fill(); c.fillStyle = '#ff6fb5'; c.beginPath(); c.arc(x0 + pos * w, y + 11, 8, 0, 7); c.fill();
      txt(c, `${Math.floor(score)}`, W / 2, H * 0.13, 36, '#ffd23f'); if (combo > 3) txt(c, `RIDING x${1 + Math.floor(combo / 3) * 0.5}`, W / 2, H * 0.19, 16, '#5ee07a'); if (wipe > 0) txt(c, 'WIPEOUT!', W / 2, H * 0.4, 32, '#ff6a74');
      txt(c, '◀ HOLD', W * 0.16, H * 0.93, 14, 'rgba(255,255,255,.7)'); txt(c, 'HOLD ▶', W * 0.84, H * 0.93, 14, 'rgba(255,255,255,.7)'); },
    result() { return { win: score > 20, score: Math.floor(score), money: Math.floor(score * 0.9) }; },
    cleanup() { S.dispose(); waveM.dispose(); } };
};

// ================================================================ hoops: swipe up to shoot at a moving hoop
CUT.hoops = () => {
  const P = C.P, S = makeSet(P.x, C.groundY(P.x, P.z), P.z, P.face);
  const hoop = new THREE.Group(); S.add(hoop, 0, 0, 0);
  S.box(0.16, 3.1, 0.16, '#3a3d45', 0, 0, 6.55, hoop); S.box(0.1, 0.1, 0.5, '#3a3d45', 0, 3.0, 6.3, hoop);
  S.box(1.7, 1.05, 0.06, '#ffffff', 0, 2.75, 6.05, hoop); S.box(0.56, 0.42, 0.065, mat('#e23b3b'), 0, 2.88, 6.04, hoop); S.box(0.48, 0.34, 0.07, '#ffffff', 0, 2.92, 6.035, hoop);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.022, 8, 24), mat('#ff6a1a')); rim.rotation.x = Math.PI / 2; S.add(rim, 0, 3.0, 5.74, hoop);
  const net = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.15, 0.42, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#ffffff', wireframe: true })); S.add(net, 0, 2.79, 5.74, hoop);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), mat('#e8762c')); S.add(ball, 0, 1.6, 0.4);
  let hx = 0, hdir = 1, shot = null, start = null, made = 0, shots = 0, msg = '', msgT = 0, throwT = 0;
  return { see: true, title: 'Venice Courts', hint: 'Swipe up to shoot. Time it with the moving hoop', time: 30,
    init() {}, down(x, y) { if (!shot) start = { x, y }; },
    up(x, y) { if (!start || shot) return; const dy = start.y - y, dx = x - start.x; start = null; if (dy < 40) return;
      const pw = clamp(dy / (C.H() * 0.32), 0.55, 1.45), tx = dx / C.W() * 4.2; shots++; throwT = 0.35; sfx.whoosh();
      shot = { t: 0, T: 0.95, x0: 0, y0: 1.9, z0: 0.45, tx, tz: 5.74 * pw, pw, hit: Math.abs(pw - 1) < 0.2 }; },
    update(dt, t) {
      hx += hdir * dt * (0.9 + t * 0.04); if (hx > 1.6 || hx < -1.6) hdir *= -1; msgT -= dt; throwT -= dt;
      if (shot) { shot.t += dt;
        if (!shot.done && shot.t >= shot.T) { shot.done = true; const off = Math.abs(shot.tx - hx);
          if (shot.hit && off < 0.24) { made++; msg = made % 5 === 0 ? 'ON FIRE' : 'SWISH!'; msgT = 0.9; sfx.coin(); navigator.vibrate?.(20); shot.in = true; }
          else if (off < 0.5 && Math.abs(shot.pw - 1) < 0.3) { msg = 'CLANK'; msgT = 0.6; sfx.thud(); shot.bounce = true; } else { msg = shot.pw < 1 ? 'Short' : 'Long'; msgT = 0.5; } }
        if (shot.t > shot.T + 0.9) shot = null; }
    },
    frame(dt) {
      hoop.position.x = hx;
      const h = S.hero(0, 0, 0); poseIdle(h);
      if (throwT > 0) { const k = 1 - throwT / 0.35; arm(h.armL, -2.6 - k * 0.3, -0.2); arm(h.armR, -2.6 - k * 0.3, -0.2); } else { arm(h.armL, -1.1, -1.3); arm(h.armR, -1.1, -1.3); }
      if (shot) { const k = Math.min(1, shot.t / shot.T), x = shot.x0 + (shot.tx - shot.x0) * k, z = shot.z0 + (shot.tz - shot.z0) * k, y = shot.y0 + (3.0 - shot.y0) * k + Math.sin(k * Math.PI) * 2.2;
        if (shot.t <= shot.T) ball.position.set(x, y, z); else { const e = shot.t - shot.T; if (shot.in) ball.position.set(shot.tx + (hx - shot.tx) * Math.min(1, e * 6), 3.0 - e * 3.2, 5.74); else if (shot.bounce) ball.position.set(shot.tx + e * 1.2, 3.0 + e * 2 - e * e * 9, 5.74 - e * 2); else ball.position.set(x, Math.max(0.12, y - e * 6), z + e); } }
      else ball.position.set(0, 1.55, 0.42);
      S.cam(0.9, 2.2, -3.3, hx * 0.5, 2.3, 5.5); C.cutRender(0);
    },
    draw(c) { const W = C.W(), H = C.H(); txt(c, `${made} / ${shots}`, W / 2, H * 0.12, 32, '#fff'); if (msgT > 0) txt(c, msg, W / 2, H * 0.2, 26, msg === 'SWISH!' || msg === 'ON FIRE' ? '#ffd23f' : '#fff');
      if (start) { c.strokeStyle = 'rgba(255,255,255,.5)'; c.setLineDash([6, 6]); c.lineWidth = 3; c.beginPath(); c.moveTo(W / 2, H * 0.85); c.lineTo(W / 2, H * 0.6); c.stroke(); c.setLineDash([]); } else if (!shot) txt(c, 'SWIPE UP', W / 2, H * 0.88, 16, 'rgba(255,255,255,.7)'); },
    result() { return { win: made > 0, score: made, money: made * 20 }; },
    cleanup() { S.dispose(); } };
};

// ================================================================ shooting range: tap the targets, you aim and fire
CUT.gallery = (o = {}) => {
  const P = C.P, S = makeSet(P.x, C.groundY(P.x, P.z), P.z, P.face);
  S.box(7, 0.04, 17, '#2a2420', 0, 0, 8.5); S.box(7, 3.2, 0.3, '#3a2c22', 0, 0, 17); S.box(7, 1.0, 1.2, '#5a4030', 0, 0, 16.2);
  for (const sx of [-3.5, 3.5]) S.box(0.2, 3.0, 17, '#4a3a2a', sx, 0, 8.5);
  S.box(2.4, 1.05, 0.5, '#6a4a32', 0, 0, 0.9); for (let i = 0; i < 3; i++) S.box(7, 0.08, 0.1, '#7a6a5a', 0, 0, 5 + i * 3.5);
  const ringTex = gold => canvasTex(128, 128, (c, w) => { const cols = gold ? ['#c9a24a', '#ffd23f', '#c9a24a', '#ffe9a0'] : ['#c9302c', '#fff8e8', '#c9302c', '#fff8e8']; for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; c.beginPath(); c.arc(64, 64, 62 - i * 15, 0, 7); c.fill(); } c.fillStyle = '#16161b'; c.beginPath(); c.arc(64, 64, 6, 0, 7); c.fill(); });
  const civTex = canvasTex(96, 192, (c) => { c.fillStyle = '#d8c4a0'; c.fillRect(0, 0, 96, 192); c.fillStyle = '#b77a4b'; c.beginPath(); c.arc(48, 40, 24, 0, 7); c.fill(); c.fillStyle = '#2f80ed'; c.fillRect(18, 66, 60, 70); c.fillStyle = '#3a3d45'; c.fillRect(22, 136, 22, 50); c.fillRect(52, 136, 22, 50); c.fillStyle = '#c9302c'; c.font = '900 26px system-ui'; c.textAlign = 'center'; c.fillText('NO', 48, 182); });
  const TM = { red: texMat(ringTex(false)), gold: texMat(ringTex(true)), civ: texMat(civTex) };
  const targets = []; let score = 0, hits = 0, spawn = 0.4, pops = [], recoil = 0, aimAt = new THREE.Vector3(0, 1.4, 8), flashT = 0;
  const spawnT = t => { const lane = Math.floor(Math.random() * 3), dir = lane % 2 ? -1 : 1, r = Math.random(), k = r < 0.16 ? 'civ' : r < 0.28 ? 'gold' : 'red';
    const g = new THREE.Group(); g.userData.tag = 'tgt'; S.add(g, dir * -3.6, 0, 5 + lane * 3.5);
    S.box(0.06, 1.1, 0.06, '#5a4030', 0, 0, 0, g);
    const face = k === 'civ' ? new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.4), TM.civ) : new THREE.Mesh(new THREE.CircleGeometry(0.38, 28), k === 'gold' ? TM.gold : TM.red);
    face.rotation.y = Math.PI; face.position.set(0, k === 'civ' ? 1.55 : 1.45, 0); g.add(face); face.userData.tag = 'tgt';
    targets.push({ g, k, dir, v: (1.2 + Math.random() * 1.1) * (1 + t / 45), up: 0, hit: false }); };
  return { see: true, title: o.title || 'Shooting Range', hint: 'Tap the targets to shoot. Gold is worth 5. Never hit the civilians!', time: 30,
    init() {},
    down(x, y) { recoil = 1; flashT = 0.06; const hit = pickAt(x, y, targets.filter(t => !t.hit).map(t => t.g));
      if (hit) { aimAt.copy(hit.p); const t = targets.find(q => q.g === hit.o || q.g === hit.o.parent); if (t) { t.hit = true; const v = t.k === 'civ' ? -5 : t.k === 'gold' ? 5 : 1; score = Math.max(0, score + v); if (v > 0) hits++; pops.push({ x, y, s: v > 0 ? `+${v}` : `${v}`, l: 0.7, col: v > 0 ? '#5ee07a' : '#ff6a74' }); v > 0 ? sfx.coin() : sfx.fail(); C.spawnParticles(hit.p.x, hit.p.y, hit.p.z, t.k === 'civ' ? ['#d8c4a0', '#2f80ed'] : ['#ffffff', '#c9302c', '#ffd23f'], 10, 3, 0.4, 0.06); } sfx.shot(false, false); navigator.vibrate?.(15); }
      else { ndc.set(x / C.W() * 2 - 1, -(y / C.H()) * 2 + 1); ray.setFromCamera(ndc, C.cutCam); aimAt.copy(ray.ray.at(12, new THREE.Vector3())); sfx.shot(true, false); } },
    update(dt, t) { spawn -= dt; if (spawn <= 0) { spawn = (0.45 + Math.random() * 0.5) * Math.max(0.55, 1 - t / 40); spawnT(t); }
      for (let i = targets.length - 1; i >= 0; i--) { const q = targets[i]; q.g.position.x += q.dir * q.v * dt; q.up = Math.min(1, q.up + dt * 5); q.g.rotation.x = q.hit ? Math.min(Math.PI / 2, q.g.rotation.x + dt * 9) : (1 - q.up) * Math.PI / 2; if (Math.abs(q.g.position.x) > 3.8 || (q.hit && q.g.rotation.x >= Math.PI / 2)) { S.g.remove(q.g); targets.splice(i, 1); } }
      for (const p of pops) { p.l -= dt; p.y -= 40 * dt; } pops = pops.filter(p => p.l > 0); recoil = Math.max(0, recoil - dt * 8); flashT -= dt; },
    frame() {
      const h = S.hero(0, 0, 0, 0, true), loc = S.g.worldToLocal(aimAt.clone()); const yaw = Math.atan2(loc.x, loc.z); h.root.rotation.y = S.face + yaw;
      poseIdle(h, { aim: clamp(Math.atan2(loc.y - 1.4, Math.hypot(loc.x, loc.z)), -0.4, 0.4), recoil });
      if (flashT > 0) { const hp = new THREE.Vector3(); h.hand.getWorldPosition(hp); C.spawnParticles(hp.x, hp.y, hp.z, ['#ffe08a', '#ffffff'], 3, 2, 0.08, 0.05); }
      S.cam(0.55, 2.3, -3.2, 0, 1.2, 9); C.cutRender(recoil * 0.01);
    },
    draw(c) { const W = C.W(), H = C.H(); for (const p of pops) txt(c, p.s, p.x, p.y, 24, p.col); txt(c, `Score ${score}`, W / 2, H * 0.12, 30, '#ffd23f'); },
    result() { return { win: score > 0, score, hits, money: o.pay === false ? 0 : score * 6 }; },
    cleanup() { S.dispose(); for (const m of Object.values(TM)) { m.map.dispose(); m.dispose(); } } };
};

// ================================================================ taco stand: build each customer's taco
const TACO_ING = [['Shell', '#f2c14e'], ['Carne', '#7a3e1d'], ['Pollo', '#e0b070'], ['Queso', '#ffd23f'], ['Lettuce', '#5fbf4a'], ['Tomato', '#e23b3b'], ['Guac', '#7fb84a'], ['Salsa', '#c9302c']];
CUT.taco = () => {
  const P = C.P, S = makeSet(P.x, C.groundY(P.x, P.z), P.z, P.face);
  S.box(3.0, 1.0, 0.7, '#c9a27a', 0, 0, 0.75); S.box(3.1, 0.06, 0.8, '#e8e8e2', 0, 1.0, 0.75); S.box(3.2, 0.12, 0.9, '#2f80ed', 0, 2.6, 0.75); for (const sx of [-1.5, 1.5]) S.box(0.08, 1.6, 0.08, '#c9ccd2', sx, 1.0, 1.1);
  const bins = TACO_ING.map(([, col], i) => { const b = S.box(0.3, 0.1, 0.24, '#c9ccd2', -1.12 + i * 0.32, 1.06, 0.55); S.box(0.26, 0.05, 0.2, col, -1.12 + i * 0.32, 1.13, 0.55); return b; });
  const tray = new THREE.Group(); S.add(tray, 0, 1.08, 0.92); let layers = [];
  let cust = null; const newCust = () => { if (cust) drop(cust); cust = person(null); S.add(cust.root, rnd(-0.4, 0.4), 0, 1.75); cust.root.rotation.y = Math.PI; };
  let order = [], prog = 0, served = 0, earned = 0, flash = 0, bad = 0, msg = '', bonus = 0, reach = 0, which = 0, serveT = 0, btns = [];
  const newOrder = () => { order = [0]; const n = 2 + Math.min(3, Math.floor(served / 2)) + (Math.random() < 0.4 ? 1 : 0); for (let i = 0; i < n; i++) order.push(1 + Math.floor(Math.random() * 7)); prog = 0; for (const l of layers) tray.remove(l); layers = []; };
  const tap = i => { reach = 1; which = i; if (i === order[prog]) { const col = TACO_ING[i][1], l = i === 0 ? new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 18, 1, false, 0, Math.PI), mat(col)) : new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.08), mat(col)); if (i === 0) l.rotation.z = Math.PI / 2; l.position.y = i === 0 ? 0.08 : 0.06 + prog * 0.02; tray.add(l); layers.push(l); prog++; sfx.click();
      if (prog >= order.length) { served++; const pay = 10 + order.length * 6; earned += pay; msg = `+$${pay}`; flash = 0.7; bonus += 2; sfx.coin(); serveT = 0.6; } }
    else { bad = 0.4; msg = 'Wrong! Order binned'; flash = 0.7; sfx.fail(); navigator.vibrate?.(40); newOrder(); } };
  newCust(); newOrder();
  return { see: true, title: 'Taco Rush', hint: 'Tap the ingredients in the order shown', time: 35,
    init() {}, down(x, y) { hitBtn(btns, x, y); },
    update(dt) { flash -= dt; bad -= dt; reach = Math.max(0, reach - dt * 5); if (serveT > 0) { serveT -= dt; tray.position.z = 0.92 + (0.6 - serveT) * 1.2; if (serveT <= 0) { tray.position.z = 0.92; newCust(); newOrder(); } } const b = bonus; bonus = 0; return { addTime: b }; },
    frame(dt, t) { const h = S.hero(0, 0, 0); poseIdle(h); const bx = -1.12 + which * 0.32, k = Math.sin(reach * Math.PI);
      arm(h.armR, -1.0 - k * 0.5, -0.8 + k * 0.6, bx > 0 ? -k * 0.5 : 0); arm(h.armL, -0.9 - (bx < 0 ? k * 0.5 : 0), -0.9, bx < 0 ? k * 0.5 : 0); h.torso.rotation.y = -bx * 0.25 * k;
      if (cust) { C.poseCharacter(cust, { phase: 0, speed: 0, aim: 0, recoil: 0, t }); arm(cust.armL, 0, 0); arm(cust.armR, serveT > 0 ? -1.3 : 0, 0); }
      S.cam(3.3, 2.2, 0.4, -0.1, 1.15, 0.85); C.cutRender(0); },
    draw(c) { const W = C.W(), H = C.H(); btns = [];
      rr(c, W * 0.05, H * 0.06, W * 0.9, 74, 16); c.fillStyle = bad > 0 ? 'rgba(90,32,38,.85)' : 'rgba(255,244,220,.92)'; c.fill();
      txt(c, `ORDER #${served + 1}`, W * 0.09, H * 0.06 + 14, 11, '#8a5a35', 'left'); const n = order.length, sz = Math.min(34, W * 0.8 / n - 6);
      order.forEach((ing, i) => { const x = W / 2 + (i - (n - 1) / 2) * (sz + 8), y = H * 0.06 + 44; c.globalAlpha = i < prog ? 0.25 : 1; c.fillStyle = TACO_ING[ing][1]; c.beginPath(); c.arc(x, y, sz / 2, 0, 7); c.fill(); c.globalAlpha = 1; if (i === prog) { c.fillStyle = '#ff8a2a'; c.fillRect(x - sz / 2, y + sz / 2 + 3, sz, 4); } });
      if (order[prog] != null) txt(c, `Next: ${TACO_ING[order[prog]][0]}`, W / 2, H * 0.06 + 92, 16, '#fff');
      const rows = [TACO_ING.slice(0, 4), TACO_ING.slice(4)]; rows.forEach((row, r) => btnRow(c, btns, row.map((g, i) => [g[0], () => tap(r * 4 + i), false, false]), H * (0.76 + r * 0.09), 54));
      btns.forEach((b, i) => { c.fillStyle = TACO_ING[i][1]; c.beginPath(); c.arc(b.x + 11, b.y + 11, 5, 0, 7); c.fill(); });
      if (flash > 0) txt(c, msg, W / 2, H * 0.68, 22, bad > 0 ? '#ff6a74' : '#5ee07a'); txt(c, `Served ${served} · $${earned}`, W / 2, H * 0.025 + 4, 14, '#ffd23f'); },
    result() { return { win: served > 0, score: served, money: earned }; },
    cleanup() { if (cust) drop(cust); S.dispose(); } };
};

// ================================================================ DJ / arcade: notes slide down glowing lanes to your decks
CUT.beat = (o = {}) => {
  const P = C.P, S = makeSet(P.x, C.groundY(P.x, P.z), P.z, P.face);
  S.box(1.9, 0.92, 0.7, '#16161b', 0, 0, 0.75); S.box(1.95, 0.05, 0.75, '#2a2d33', 0, 0.92, 0.75);
  const decks = [-0.55, 0.55].map(sx => { S.cyl(0.22, 0.22, 0.04, '#3a3d45', sx, 0.97, 0.75, 24); const pl = S.cyl(0.19, 0.19, 0.02, '#111', sx, 1.01, 0.75, 24); S.box(0.04, 0.02, 0.12, '#c9ccd2', sx + 0.04, 1.04, 0.75, pl); return pl; });
  S.box(0.42, 0.06, 0.4, '#2a2d33', 0, 0.97, 0.75); for (let i = 0; i < 4; i++) S.box(0.04, 0.03, 0.04, glowM(['#ff3b8a', '#38e8ff', '#ffd23f', '#4cd964'][i]), -0.12 + i * 0.08, 1.03, 0.68);
  const cols = ['#ff3b8a', '#38e8ff', '#ffd23f'], lanes = [-1.2, 0, 1.2], HIT = 1.6, FAR = 12;
  const laneM = lanes.map((lx, i) => { const m = S.box(0.95, 0.02, FAR - HIT + 1, new THREE.MeshStandardMaterial({ color: '#111', emissive: cols[i], emissiveIntensity: 0.15 }), lx, 0.01, (FAR + HIT) / 2); return m; });
  S.box(4, 0.03, 0.12, glowM('#ffffff'), 0, 0.02, HIT);
  const lights = []; for (let i = 0; i < 6; i++) lights.push(S.box(0.3, 0.3, 0.3, new THREE.MeshStandardMaterial({ color: '#222', emissive: cols[i % 3], emissiveIntensity: 0.5 }), -2.5 + i, 3.2, 3));
  const noteGeo = new THREE.BoxGeometry(0.8, 0.18, 0.5), noteMats = cols.map(c2 => glowM(c2));
  const A = audio(), now = () => A ? A.currentTime : performance.now() / 1000, bpm = 112, spb = 60 / bpm, travel = 1.6;
  let notes = [], score = 0, combo = 0, start = 0, nextBeat = 0, beatN = 0, pops = [], laneFlash = [0, 0, 0], pulse = 0, scr = 0;
  return { see: true, title: o.title || 'Neon Room DJ', hint: 'Tap a lane as the light hits the line', time: 32,
    init() { start = now() + 1.2; nextBeat = start; let t = start + 1.5; while (t < start + 31) { const step = Math.random() < 0.6 ? spb : spb / 2; notes.push({ t, lane: Math.floor(Math.random() * 3) }); if (Math.random() < 0.12) notes.push({ t, lane: (notes[notes.length - 1].lane + 1) % 3 }); t += step; } },
    down(x) { const W = C.W(); let lane = 1; { let bd = 1e9; lanes.forEach((lx, i) => { const p = S.L(lx, 0, HIT).project(C.cutCam), sx = (p.x + 1) / 2 * W; if (Math.abs(sx - x) < bd) { bd = Math.abs(sx - x); lane = i; } }); }
      laneFlash[lane] = 0.15; scr = 1; const t = now(); let best = null, bd = 1; for (const n of notes) if (!n.hit && !n.miss && n.lane === lane) { const d = Math.abs(n.t - t); if (d < bd) { bd = d; best = n; } }
      if (best && bd < 0.18) { best.hit = true; combo++; const p = bd < 0.07 ? 3 : 1; score += p * (1 + Math.floor(combo / 10)); pops.push({ lane, s: p === 3 ? 'PERFECT' : 'GOOD', l: 0.5 }); A && sfx.note(330 * [1, 1.25, 1.5][lane], A.currentTime, 0.2, 'square', 0.04, 3000); if (best.m) { C.spawnParticles(best.m.position.x, 0.4, best.m.position.z, [cols[lane], '#ffffff'], 6, 2, 0.3, 0.06); } } else combo = 0; },
    update(dt) { const t = now();
      while (A && nextBeat < t + 0.2) { sfx.kick(nextBeat, 0.5); if (beatN % 2 === 1) sfx.snare(nextBeat, 0.12); sfx.hat(nextBeat + spb / 2, 0.04); if (beatN % 4 === 0) sfx.note(55 * [1, 1, 0.84, 0.89][Math.floor(beatN / 4) % 4] * 2, nextBeat, spb * 3.5, 'sawtooth', 0.05, 700); nextBeat += spb; beatN++; }
      for (const n of notes) if (!n.hit && !n.miss && t - n.t > 0.2) { n.miss = true; combo = 0; }
      for (const p of pops) p.l -= dt; pops = pops.filter(p => p.l > 0); for (let i = 0; i < 3; i++) laneFlash[i] -= dt; scr = Math.max(0, scr - dt * 5);
      pulse = Math.max(0, 1 - (((t - start) % spb) + spb) % spb / spb * 3); },
    frame(dt) { const t = now();
      for (const n of notes) { const k = 1 - (n.t - t) / travel, show = !n.hit && k > -0.1 && k < 1.15; if (show && !n.m) { n.m = new THREE.Mesh(noteGeo, noteMats[n.lane]); S.g.add(n.m); } if (n.m) { if (!show) { S.g.remove(n.m); n.m = null; } else n.m.position.set(lanes[n.lane], 0.12, FAR - (FAR - HIT) * k); if (n.m && n.miss) n.m.material = mat('#555'); } }
      laneM.forEach((m, i) => m.material.emissiveIntensity = 0.15 + (laneFlash[i] > 0 ? 0.9 : 0) + pulse * 0.15); lights.forEach((l, i) => { l.material.emissiveIntensity = 0.3 + pulse * 1.5 * ((i + beatN) % 2); }); decks.forEach(d => d.rotation.y += dt * 3.5);
      const h = S.hero(0, 0, 0); poseIdle(h); h.head.rotation.x = -0.15 - pulse * 0.25; arm(h.armL, -0.95, -0.7, 0.35); arm(h.armR, -0.95 - scr * 0.25, -0.7, -0.35 - scr * 0.3); h.hips.position.y = h.legLen - pulse * 0.04;
      S.cam(0, 4.1, -2.2, 0, 0, 6.5); C.cutRender(0); },
    draw(c) { const W = C.W(), H = C.H(); for (const p of pops) { const q = S.L(lanes[p.lane], 0.6, HIT).project(C.cutCam); txt(c, p.s, (q.x + 1) / 2 * W, (1 - q.y) / 2 * H - 40 - (0.5 - p.l) * 60, 16, '#fff'); }
      txt(c, `${score}`, W / 2, H * 0.1, 34, '#ffd23f'); if (combo > 4) txt(c, `combo x${combo}`, W / 2, H * 0.9, 18, '#fff'); },
    result() { return { win: score > 10, score, money: score * 3 }; },
    cleanup() { for (const m of laneM) m.material.dispose(); for (const l of lights) l.material.dispose(); S.dispose(); } };
};

// ================================================================ The Pit: a real fight in the ring
CUT.cage = (o = {}) => {
  const opp = o.opp || { name: 'Rookie', hp: 60, power: 8, tell: 0.75, col: '#e23b3b' }, str = o.str || 1, stamLvl = o.stam || 1;
  const P = C.P, S = makeSet(P.x, C.groundY(P.x, P.z), P.z, P.face);
  S.box(6.4, 0.5, 6.4, '#3a3d45', 0, 0, 0); S.box(6.2, 0.04, 6.2, '#d8d0c0', 0, 0.5, 0);
  for (const [px, pz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) S.box(0.16, 1.5, 0.16, '#c9ccd2', px, 0.5, pz);
  for (const [h, col] of [[1.0, '#e23b3b'], [1.35, '#ffffff'], [1.7, '#2f80ed']]) { S.box(6, 0.04, 0.04, col, 0, h, -3); S.box(6, 0.04, 0.04, col, 0, h, 3); S.box(0.04, 0.04, 6, col, -3, h, 0); S.box(0.04, 0.04, 6, col, 3, h, 0); }
  const foe = person(null, { topColor: opp.col, ...(opp.skin ? { skin: opp.skin } : {}) }); S.add(foe.root, 0, 0.52, 0.85); foe.root.rotation.y = Math.PI;
  const foeMats = []; foe.root.traverse(m => { if (m.isMesh && m.material?.emissive) { m.material = m.material.clone(); foeMats.push(m.material); } });
  let you = 100, them = opp.hp, stam = 100, block = false, pAct = null, pT = 0, pHit = false, oState = 'idle', oT = 1.2, msg = '', msgT = 0, shakeT = 0, done = 0, hitFx = [];
  const maxStam = 100 + stamLvl * 8, say = m => { msg = m; msgT = 0.7; };
  const fx = (x, y, z, big) => C.spawnParticles(x, y, z, ['#ffd23f', '#ffffff', '#ff8a2a'], big ? 12 : 6, big ? 4 : 2.5, 0.35, 0.07);
  return { see: true, title: `The Pit: vs ${opp.name}`, hint: 'JAB is fast, HOOK hits hard. Hold BLOCK when they wind up (red). Hit them mid wind-up to counter.', time: 9999,
    init() {},
    down(x, y) { if (done || y < C.H() * 0.74) return; const W = C.W(), i = x < W * 0.34 ? 0 : x < W * 0.66 ? 1 : 2; if (i === 2) { block = true; return; } if (pAct || block) return; const cost = i === 0 ? 9 : 20; if (stam < cost) { say('Too tired!'); return; } stam -= cost; pAct = i === 0 ? 'jab' : 'hook'; pT = 0; pHit = false; sfx.whoosh(); },
    up() { block = false; },
    update(dt) {
      if (done) { done += dt; return done > 1.8; }
      stam = Math.min(maxStam, stam + dt * (block ? 10 : 22)); msgT -= dt; shakeT -= dt;
      if (pAct) { pT += dt / (pAct === 'jab' ? 0.22 : 0.38); if (pT >= 0.5 && !pHit) { pHit = true; const counter = oState === 'wind', blocked = oState === 'guard';
          them -= (pAct === 'jab' ? 4 : 9) * (1 + (str - 1) * 0.15) * (counter ? 1.6 : 1) * (blocked ? 0.25 : 1); const hp = S.L(0, 2.05, 0.6); fx(hp.x, hp.y, hp.z, pAct === 'hook'); sfx.punch(); navigator.vibrate?.(12);
          if (counter) { oState = 'stun'; oT = 0.7; say('COUNTER!'); } else if (blocked) say('Blocked'); else if (pAct === 'hook' && Math.random() < 0.3) { oState = 'stun'; oT = 0.5; } }
        if (pT >= 1) pAct = null; }
      oT -= dt;
      if (oState === 'idle' && oT <= 0) { if (Math.random() < 0.65) { oState = 'wind'; oT = opp.tell * (0.8 + Math.random() * 0.4); } else { oState = 'guard'; oT = 0.6 + Math.random() * 0.6; } }
      else if (oState === 'wind' && oT <= 0) { oState = 'hit'; oT = 0.25; if (block) { stam = Math.max(0, stam - 12); say('Blocked!'); sfx.click(); } else { you -= opp.power * (0.8 + Math.random() * 0.4); shakeT = 0.25; const hp = S.L(0, 2.05, -0.6); fx(hp.x, hp.y, hp.z, true); sfx.punch(); navigator.vibrate?.(30); } }
      else if ((oState === 'hit' || oState === 'guard' || oState === 'stun') && oT <= 0) { oState = 'idle'; oT = 0.4 + Math.random() * 0.9 * (opp.tell + 0.3); }
      if (them <= 0 || you <= 0) { done = 0.001; say(them <= 0 ? 'K.O.!' : 'You got knocked out'); msgT = 9; sfx.boom?.(); }
    },
    frame(dt, t) {
      const ko = done ? Math.min(1, done * 2) : 0, bob = Math.sin(t * 6) * 0.03;
      const h = S.hero(0, 0.52, -0.85); poseIdle(h, { phase: t * 6, speed: 0.08 }); h.hips.position.y = h.legLen * 0.95 + bob;
      const reach = pAct ? Math.sin(Math.min(1, pT) * Math.PI) : 0;
      if (block) { arm(h.armL, -2.3, -2.1, 0.25); arm(h.armR, -2.3, -2.1, -0.25); }
      else if (pAct === 'jab') { arm(h.armL, -1.55, -(1 - reach) * 1.7); arm(h.armR, -1.3, -1.9); }
      else if (pAct === 'hook') { arm(h.armR, -1.5, -0.9 * (1 - reach) - 0.4, -0.9 * reach); h.torso.rotation.y = -reach * 0.5; arm(h.armL, -1.3, -1.9); }
      else { arm(h.armL, -1.35, -1.85, 0.15); arm(h.armR, -1.3, -1.9, -0.15); h.torso.rotation.y = 0; }
      if (you <= 0) h.root.rotation.x = -ko * 1.4;
      C.poseCharacter(foe, { phase: t * 6 + 1, speed: 0.08, aim: 0, recoil: 0, t }); foe.hips.position.y = foe.legLen * 0.95 - bob;
      const w = oState === 'wind', oh = oState === 'hit' ? Math.sin((1 - oT / 0.25) * Math.PI) : 0;
      if (oState === 'guard') { arm(foe.armL, -2.3, -2.1, 0.25); arm(foe.armR, -2.3, -2.1, -0.25); }
      else if (w) { arm(foe.armR, -0.9, -2.0, -0.5); arm(foe.armL, -1.3, -1.9); foe.torso.rotation.y = 0.35; }
      else if (oState === 'hit') { arm(foe.armR, -1.55, -(1 - oh) * 1.4, -0.4 * (1 - oh)); arm(foe.armL, -1.3, -1.9); foe.torso.rotation.y = -oh * 0.4; }
      else { arm(foe.armL, -1.35, -1.85, 0.15); arm(foe.armR, -1.3, -1.9, -0.15); foe.torso.rotation.y = 0; }
      foe.root.rotation.x = oState === 'stun' ? -0.2 : 0; if (them <= 0) foe.root.rotation.x = -ko * 1.4;
      for (const m of foeMats) { m.emissive.set(w ? '#ff2030' : '#000000'); m.emissiveIntensity = w ? 0.12 + 0.1 * Math.sin(t * 30) : 0; }
      S.cam(6.6, 2.6, -0.3, 0, 1.5, 0); C.cutRender(shakeT > 0 ? 0.04 : 0);
    },
    draw(c, t) { const W = C.W(), H = C.H();
      bar(c, W * 0.04, H * 0.05, W * 0.42, 14, you / 100, '#4cd964'); txt(c, 'YOU', W * 0.25, H * 0.05 + 28, 13); bar(c, W * 0.54, H * 0.05, W * 0.42, 14, them / opp.hp, '#ff3b4a'); txt(c, opp.name.toUpperCase(), W * 0.75, H * 0.05 + 28, 13);
      bar(c, W * 0.04, H * 0.05 + 40, W * 0.42, 6, stam / maxStam, '#ffd23f');
      if (oState === 'wind') { c.fillStyle = `rgba(255,40,60,${0.08 + 0.08 * Math.sin(t * 30)})`; c.fillRect(0, 0, W, H * 0.72); }
      if (msgT > 0) txt(c, msg, W / 2, H * 0.2, 32, msg === 'COUNTER!' || msg === 'K.O.!' ? '#ffd23f' : '#fff');
      [['JAB', 0.04], ['HOOK', 0.36], ['BLOCK', 0.68]].forEach(([l, x], i) => { rr(c, W * x, H * 0.76, W * 0.28, H * 0.15, 18); c.fillStyle = i === 2 && block ? 'rgba(76,217,100,.6)' : i === 1 ? 'rgba(255,90,60,.5)' : 'rgba(20,20,30,.55)'; c.fill(); c.strokeStyle = 'rgba(255,255,255,.3)'; c.stroke(); txt(c, l, W * x + W * 0.14, H * 0.835, 20); }); },
    result() { return { win: them <= 0, money: 0, score: Math.max(0, Math.round(you)) }; },
    cleanup() { drop(foe); S.dispose(); } };
};

// ================================================================ card helpers (blackjack)
const SUITS = ['♠', '♥', '♦', '♣'];
const cardTexCache = new Map();
function cardTex(cd, hidden) { const k = hidden ? 'back' : cd.r + cd.s; if (cardTexCache.has(k)) return cardTexCache.get(k);
  const t = canvasTex(128, 180, (c, w, h) => { c.fillStyle = hidden ? '#8b1e3f' : '#fffdf6'; rr(c, 2, 2, w - 4, h - 4, 12); c.fill(); c.strokeStyle = '#1c1a2e'; c.lineWidth = 3; c.stroke();
    if (hidden) { c.strokeStyle = '#c9a24a'; c.lineWidth = 2; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(10, 14 + i * 18); c.lineTo(w - 10, 30 + i * 18); c.stroke(); } return; }
    const red = cd.s === 1 || cd.s === 2; c.fillStyle = red ? '#c9302c' : '#1c1a2e'; c.font = '900 46px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(cd.r, w / 2, h * 0.36); c.font = '900 52px system-ui'; c.fillText(SUITS[cd.s], w / 2, h * 0.72); });
  cardTexCache.set(k, t); return t; }
CUT.blackjack = (o = {}) => {
  const P = C.P, S = makeSet(P.x, C.groundY(P.x, P.z), P.z, P.face);
  S.box(2.6, 0.82, 1.3, '#5a3a22', 0, 0, 0.75); S.box(2.5, 0.04, 1.2, '#1f6b3a', 0, 0.82, 0.75); S.box(2.62, 0.06, 0.08, '#c9a24a', 0, 0.84, 0.13); S.box(0.3, 0.14, 0.2, '#3a3d45', 0.95, 0.86, 1.15);
  const dealer = person(null, { topColor: '#ffffff', top: 'shirt' }); S.add(dealer.root, 0, 0, 1.75); dealer.root.rotation.y = Math.PI;
  const chipG = new THREE.Group(); S.add(chipG, 0.55, 0.875, 0.45);
  let bank = o.money || 0, net = 0, bet = 0, deck = [], ph = [], dh = [], stage = 'bet', msg = 'Place your bet', btns = [], done = false, cardMs = [], dealT = 0;
  const newDeck = () => { deck = []; for (let d = 0; d < 4; d++) for (let s = 0; s < 4; s++) for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']) deck.push({ r, s }); deck.sort(() => Math.random() - 0.5); };
  const val = h => { let v = 0, a = 0; for (const c of h) { if (c.r === 'A') { a++; v += 11; } else v += ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; } while (v > 21 && a) { v -= 10; a--; } return v; };
  const draw1 = () => { if (deck.length < 20) newDeck(); dealT = 0.25; sfx.click(); return deck.pop(); };
  const settle = res => { let d = 0; if (res === 'bj') d = Math.floor(bet * 1.5); else if (res === 'win') d = bet; else if (res === 'lose') d = -bet; net += d; bank += d; stage = 'done'; msg = { bj: `Blackjack! +$${Math.floor(bet * 1.5)}`, win: `You win +$${bet}`, lose: `Dealer wins −$${bet}`, push: 'Push. Bet returned' }[res]; res === 'lose' ? sfx.fail() : res !== 'push' ? sfx.cash() : sfx.click(); bet = 0; };
  const dealerPlay = () => { while (val(dh) < 17) dh.push(draw1()); const p = val(ph), d = val(dh); settle(d > 21 || p > d ? 'win' : p < d ? 'lose' : 'push'); };
  const layout = () => { for (const m of cardMs) { S.g.remove(m); m.geometry.dispose(); m.material.dispose(); } cardMs = [];
    const put = (hand, z, hideSecond) => hand.forEach((cd, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.24), new THREE.MeshStandardMaterial({ map: cardTex(cd, hideSecond && i === 1), roughness: 0.5 })); m.rotation.set(-Math.PI / 2, 0, Math.PI); m.position.set((i - (hand.length - 1) / 2) * 0.2, 0.866 + i * 0.001, z); S.g.add(m); cardMs.push(m); });
    put(dh, 1.0, stage === 'play'); put(ph, 0.5, false);
    while (chipG.children.length) chipG.remove(chipG.children[0]); const n = Math.min(14, Math.ceil(bet / 25)); for (let i = 0; i < n; i++) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 14), mat(['#e23b3b', '#2f80ed', '#16161b', '#4cd964'][i % 4])); ch.position.y = i * 0.013; chipG.add(ch); } };
  newDeck();
  return { see: true, title: 'Blackjack', hint: 'Beat the dealer to 21 without going over. Blackjack pays 3:2.', time: 0, keepOnQuit: true,
    init() {}, down(x, y) { if (hitBtn(btns, x, y)) layout(); },
    update(dt) { dealT -= dt; return done; },
    frame(dt, t) { const h = S.hero(-0.62, 0, -0.1, 0.35); poseIdle(h); arm(h.armL, -0.7, -0.9, 0.2); arm(h.armR, -0.7 - Math.max(0, dealT) * 2, -0.9, -0.2);
      C.poseCharacter(dealer, { phase: 0, speed: 0, aim: 0, recoil: 0, t }); arm(dealer.armR, -0.9 - Math.max(0, dealT) * 2.5, -0.6); arm(dealer.armL, -0.6, -0.9);
      S.cam(0.12, 2.9, -0.62, 0.05, 0.85, 0.82); C.cutRender(0); },
    draw(c) { const W = C.W(), H = C.H(); btns = [];
      if (dh.length) txt(c, `DEALER${stage === 'play' ? '' : ' · ' + val(dh)}`, W / 2, H * 0.07, 14, 'rgba(255,255,255,.85)'); if (ph.length) txt(c, `YOU · ${val(ph)}`, W / 2, H * 0.6, 16, '#fff');
      txt(c, msg, W / 2, H * 0.66, 20, '#ffd23f'); txt(c, `Bank $${bank.toLocaleString()} · Bet $${bet} · Tonight ${net >= 0 ? '+' : '−'}$${Math.abs(net)}`, W / 2, H * 0.71, 13, '#fff');
      if (stage === 'bet' || stage === 'done') {
        btnRow(c, btns, [10, 50, 100, 500].map(v => [`+$${v}`, () => { if (bank - bet >= v) { bet += v; msg = `Bet $${bet}`; } }, bank - bet < v]), H * 0.76);
        btnRow(c, btns, [['Clear', () => { bet = 0; msg = 'Place your bet'; }], ['DEAL', () => { if (!bet) return; ph = [draw1(), draw1()]; dh = [draw1(), draw1()]; stage = 'play'; msg = 'Hit or stand?'; if (val(ph) === 21) { stage = 'x'; settle(val(dh) === 21 ? 'push' : 'bj'); } }, !bet, true], ['Leave', () => { done = true; }]], H * 0.86);
      } else if (stage === 'play') btnRow(c, btns, [['HIT', () => { ph.push(draw1()); if (val(ph) > 21) settle('lose'); }, false, true], ['STAND', () => dealerPlay()], ['DOUBLE', () => { if (bank - bet * 2 < 0) return; bet *= 2; ph.push(draw1()); if (val(ph) > 21) settle('lose'); else dealerPlay(); }, ph.length > 2 || bank < bet * 2]], H * 0.8); },
    result() { return { win: net > 0, score: net, money: net }; },
    cleanup() { drop(dealer); for (const m of cardMs) { m.geometry.dispose(); m.material.dispose(); } S.dispose(); } };
};

// ================================================================ slots: a real machine, real lever
const SLOT_SYM = [['coin', '#ffd23f', 5], ['seven', '#e23b3b', 10], ['heart', '#ff3b8a', 3], ['bolt', '#38e8ff', 4], ['moon', '#b26bff', 2], ['sun', '#ffb020', 20]];
let reelTex = null;
function makeReelTex() { if (reelTex) return reelTex; reelTex = canvasTex(128, 768, (c, w) => { c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, 768);
  SLOT_SYM.forEach(([k, col], i) => { const cy = i * 128 + 64; c.fillStyle = col; c.strokeStyle = '#1c1a2e'; c.lineWidth = 4;
    if (k === 'coin') { c.beginPath(); c.arc(64, cy, 38, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#1c1a2e'; c.font = '900 40px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 64, cy + 2); }
    else if (k === 'seven') { c.font = '900 96px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('7', 64, cy + 4); c.strokeText('7', 64, cy + 4); }
    else if (k === 'heart') { c.beginPath(); c.moveTo(64, cy + 36); c.bezierCurveTo(10, cy, 30, cy - 46, 64, cy - 16); c.bezierCurveTo(98, cy - 46, 118, cy, 64, cy + 36); c.fill(); c.stroke(); }
    else if (k === 'bolt') { c.beginPath(); c.moveTo(74, cy - 44); c.lineTo(38, cy + 6); c.lineTo(60, cy + 6); c.lineTo(52, cy + 44); c.lineTo(90, cy - 8); c.lineTo(68, cy - 8); c.closePath(); c.fill(); c.stroke(); }
    else if (k === 'moon') { c.beginPath(); c.arc(64, cy, 38, 0.6, 5.7); c.arc(80, cy - 8, 30, 5.2, 1.2, true); c.closePath(); c.fill(); c.stroke(); }
    else { c.beginPath(); c.arc(64, cy, 24, 0, 7); c.fill(); c.stroke(); for (let a = 0; a < 8; a++) { c.beginPath(); c.moveTo(64 + Math.cos(a * 0.785) * 30, cy + Math.sin(a * 0.785) * 30); c.lineTo(64 + Math.cos(a * 0.785) * 44, cy + Math.sin(a * 0.785) * 44); c.stroke(); } }
    c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, i * 128); c.lineTo(w, i * 128); c.stroke(); }); }); reelTex.wrapT = THREE.RepeatWrapping; return reelTex; }
CUT.slots = (o = {}) => {
  const P = C.P, S = makeSet(P.x, C.groundY(P.x, P.z), P.z, P.face);
  S.box(1.0, 1.75, 0.7, '#8b1e3f', 0, 0, 0.6); S.box(1.04, 0.08, 0.74, '#ffd23f', 0, 1.75, 0.6); S.box(0.92, 0.32, 0.12, glowM('#ffb020'), 0, 1.5, 0.27); S.box(0.82, 0.42, 0.06, '#16161b', 0, 0.98, 0.26); S.box(0.9, 0.12, 0.3, '#5a1428', 0, 0.75, 0.15);
  const reelM = new THREE.MeshStandardMaterial({ map: makeReelTex(), roughness: 0.5 }), reels = [-0.25, 0, 0.25].map(rx => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 24, 1, true), reelM); r.rotation.z = Math.PI / 2; S.add(r, rx, 1.19, 0.4); return r; });
  const lever = new THREE.Group(); S.add(lever, 0.56, 1.05, 0.6); S.cyl(0.025, 0.025, 0.5, '#c9ccd2', 0, 0, 0, 10, lever); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), mat('#e23b3b')); knob.position.y = 0.52; lever.add(knob);
  const weights = [30, 18, 22, 18, 25, 6], roll = () => { let r = Math.random() * weights.reduce((a, b) => a + b), i = 0; while ((r -= weights[i]) > 0) i++; return i; };
  let bank = o.money || 0, net = 0, bet = 10, res = [0, 1, 2], ang = [0, 0, 0], spinning = false, stopAt = [0, 0, 0], msg = 'Bet and pull!', btns = [], done = false, tNow = 0, pull = 0, winT = 0;
  const symAng = i => -(i + 0.5) / 6 * Math.PI * 2; // reel angle that puts symbol i facing you
  ang = res.map(symAng);
  return { see: true, title: 'Lucky 7 Slots', hint: 'Three of a kind pays big. Any two coins pay double.', time: 0, keepOnQuit: true,
    init() {}, down(x, y) { hitBtn(btns, x, y); },
    update(dt, t) { tNow = t; pull = Math.max(0, pull - dt * 2.5); winT -= dt;
      if (spinning) { let all = true; for (let i = 0; i < 3; i++) { if (t < stopAt[i]) { ang[i] += dt * 14; all = false; } else { const tgt = symAng(res[i]); const base = Math.round((ang[i] - tgt) / (Math.PI * 2)) * Math.PI * 2 + tgt; ang[i] = base; } }
        if (all) { spinning = false; const [a, b, c] = res; let win = 0; if (a === b && b === c) win = bet * SLOT_SYM[a][2]; else if ([a, b, c].filter(v => v === 0).length >= 2) win = bet * 2; net += win - bet; bank += win - bet; msg = win ? `WIN $${win}!` : 'No luck'; if (win) { sfx.cash(); winT = 1.5; } else sfx.click(); } }
      return done; },
    frame(dt, t) { reels.forEach((r, i) => { r.rotation.x = ang[i]; }); lever.rotation.x = Math.sin(Math.min(1, pull) * Math.PI) * 0.9;
      const h = S.hero(0.15, 0, -0.35); poseIdle(h); arm(h.armR, -1.2 + Math.sin(Math.min(1, pull) * Math.PI) * 0.6, -0.4, -0.45); arm(h.armL, -0.3, -0.5);
      if (winT > 0) { arm(h.armL, -2.8, -0.2); h.hips.position.y = h.legLen + Math.abs(Math.sin(t * 10)) * 0.08; }
      S.cam(-1.25, 1.95, -2.0, 0.05, 1.15, 0.45); C.cutRender(0); },
    draw(c) { const W = C.W(), H = C.H(); btns = []; txt(c, msg, W / 2, H * 0.62, 22, '#ffd23f'); txt(c, `Bank $${bank.toLocaleString()} · Bet $${bet} · Tonight ${net >= 0 ? '+' : '−'}$${Math.abs(net)}`, W / 2, H * 0.68, 13, '#fff');
      btnRow(c, btns, [10, 25, 100].map(v => [`Bet $${v}`, () => { bet = v; }, spinning || bank < v, bet === v]), H * 0.73);
      btnRow(c, btns, [['PULL', () => { if (bank < bet) { msg = 'Not enough cash'; return; } res = [roll(), roll(), roll()]; spinning = true; stopAt = [tNow + 0.7, tNow + 1.0, tNow + 1.3]; msg = ''; pull = 1; sfx.whoosh(); }, spinning, true], ['Leave', () => { done = true; }, spinning]], H * 0.84, 58); },
    result() { return { win: net > 0, score: net, money: net }; },
    cleanup() { S.dispose(); } };
};

// ================================================================ burger shift: run the real kitchen. Grill, fryer, board, serving hatch.
CUT.burger = (o = {}) => {
  const P = C.P, S = makeSet(P.x, C.groundY(P.x, P.z), P.z, P.face);
  const lvl = o.level || 0, RECIPES = [{ n: 'Burger', items: ['bun', 'patty'], pay: 8 }, { n: 'Cheeseburger', items: ['bun', 'patty', 'cheese'], pay: 10 }, { n: 'Deluxe', items: ['bun', 'patty', 'cheese', 'lettuce', 'tomato'], pay: 15 }, { n: 'Meal', items: ['bun', 'patty', 'cheese', 'fries'], pay: 16 }, { n: 'Fries', items: ['fries'], pay: 4 }];
  const COL = { raw: '#e8798a', patty: '#7a4a2a', burnt: '#1c1a1a', bun: '#e8b060', cheese: '#ffd23f', lettuce: '#5fbf4a', tomato: '#e23b3b', fries: '#ffcc33' };
  S.box(5.4, 0.04, 4.4, '#e8e4dc', 0, 0, 0.2); S.box(5.4, 2.4, 0.15, '#cfd6dc', 0, 0, 2.45); // floor + back wall
  const ST = {}, station = (id, x, z, w, d, col, sx, sz, face) => { const g = new THREE.Group(); g.userData.tag = id; S.add(g, x, 0, z); S.box(w, 0.92, d, col, 0, 0, 0, g); ST[id] = { id, g, stand: [sx, sz], face }; return g; };
  station('fridge', -2.05, 1.85, 0.9, 0.8, '#c9ccd2', -2.0, 1.05, 0); S.box(0.9, 1.0, 0.8, '#d8dbe0', 0, 0.92, 0, ST.fridge.g);
  station('grill0', -0.68, 1.85, 1.1, 0.8, '#3a3d45', -0.68, 1.05, 0); station('grill1', 0.68, 1.85, 1.1, 0.8, '#3a3d45', 0.68, 1.05, 0);
  for (const k of ['grill0', 'grill1']) for (let i = 0; i < 5; i++) S.box(1.0, 0.02, 0.03, '#16161b', 0, 0.92, -0.3 + i * 0.15, ST[k].g);
  station('fryer', 2.05, 1.85, 0.9, 0.8, '#7a7e86', 2.0, 1.05, 0); S.box(0.6, 0.04, 0.5, '#c99a3a', 0, 0.92, 0, ST.fryer.g);
  [['bun', 0.9], ['cheese', 0], ['lettuce', -0.9]].forEach(([id, z]) => { station(id, -2.45, z, 0.6, 0.8, '#b8bcc4', -1.75, z, -Math.PI / 2); S.box(0.4, 0.08, 0.5, COL[id], 0, 0.92, 0, ST[id].g); });
  station('tomato', 2.45, 0.9, 0.6, 0.8, '#b8bcc4', 1.75, 0.9, Math.PI / 2); S.box(0.4, 0.08, 0.5, COL.tomato, 0, 0.92, 0, ST.tomato.g);
  station('bin', 2.45, 0, 0.6, 0.6, '#3a3d45', 1.75, 0, Math.PI / 2);
  station('board', 0, 0.15, 1.6, 0.7, '#8a8e96', 0, -0.5, 0); S.box(1.0, 0.04, 0.5, '#c9a27a', 0, 0.92, 0, ST.board.g);
  station('window', 0, -1.75, 2.8, 0.5, '#3a5fa0', 0, -1.15, Math.PI); S.box(2.8, 0.06, 0.6, '#e8e8e2', 0, 0.92, 0, ST.window.g);
  const mk = k => { const g = new THREE.Group(); const m = (geo, col, y) => { const q = new THREE.Mesh(geo, mat(col)); q.position.y = y; g.add(q); return q; };
    if (k === 'bun') m(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), COL.bun, 0);
    else if (k === 'raw' || k === 'patty' || k === 'burnt') m(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 14), COL[k], 0.02);
    else if (k === 'cheese') m(new THREE.BoxGeometry(0.22, 0.015, 0.22), COL.cheese, 0.01);
    else if (k === 'lettuce') m(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 9), COL.lettuce, 0.01);
    else if (k === 'tomato') m(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 12), COL.tomato, 0.01);
    else if (k === 'fries') { m(new THREE.BoxGeometry(0.12, 0.12, 0.08), '#e23b3b', 0.06); for (let i = 0; i < 5; i++) m(new THREE.BoxGeometry(0.018, 0.12, 0.018), COL.fries, 0.14).position.x = -0.04 + i * 0.02; }
    return g; };
  const ORDER = ['bun', 'patty', 'burnt', 'cheese', 'lettuce', 'tomato'];
  const stackMesh = items => { const g = new THREE.Group(), plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 16), mat('#ffffff')); g.add(plate); let y = 0.02; const st = [...items].filter(k => k !== 'fries').sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
    st.forEach(k => { if (k === 'bun') return; const q = mk(k); q.position.y = y + 0.06; g.add(q); y += 0.035; }); if (st.includes('bun')) { const b0 = mk('bun'); b0.scale.y = -0.5; b0.position.y = 0.08; g.add(b0); const b1 = mk('bun'); b1.position.y = y + 0.06; g.add(b1); }
    if (items.includes('fries')) { const f = mk('fries'); f.position.set(0.14, 0.01, 0); g.add(f); } return g; };
  let hand = null, hand2 = null, plate = [], grill = [null, null], fryer = null, orders = [], served = 0, earned = 0, tips = 0, missed = 0, pops = [], spawnT = 1, oid = 0, bonusT = 0, go = null;
  const me = { x: 0, z: -0.5, face: 0, walk: 0, moving: false };
  const COOK = 3.6, BURN = 9, FRY = 3;
  const custs = []; const newOrder = () => { const pool = RECIPES.slice(0, Math.min(RECIPES.length, 2 + Math.floor(served / 2) + lvl)); const r = pick(pool.concat(RECIPES[4])); const pat = 38 - Math.min(12, served) + r.items.length * 3; const q = { id: ++oid, r, t: pat, max: pat }; orders.push(q);
    const slot = [0, 1, 2].find(i => !custs.some(c2 => c2.slot === i)) ?? 0, ch = person(null); S.add(ch.root, -1 + slot, 0, -2.45); ch.root.rotation.y = 0; custs.push({ q, ch, slot }); };
  const leave = q => { const i = custs.findIndex(c2 => c2.q === q); if (i >= 0) { drop(custs[i].ch); custs.splice(i, 1); } };
  const pop = (s2, col = '#5ee07a') => pops.push({ s: s2, col, l: 1.2 });
  const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
  const act = id => {
    if (id === 'fridge') { if (!hand) { hand = 'raw'; sfx.click(); } else pop('Hands full!', '#ff6a74'); return; }
    if (id === 'grill0' || id === 'grill1') { const k = +id[5], g = grill[k];
      if (hand === 'raw' && !g) { grill[k] = { t: 0 }; hand = null; sfx.click(); return; }
      if (!hand && g) { hand = g.t >= BURN ? 'burnt' : g.t >= COOK ? 'patty' : null; if (hand) { grill[k] = null; sfx.click(); } else pop('Not cooked yet', '#ffd23f'); return; }
      pop(hand ? 'Grill is busy' : 'Grill is empty', '#ffd23f'); return; }
    if (id === 'fryer') { if (!fryer && !hand) { fryer = { t: 0 }; sfx.click(); return; } if (fryer && !hand) { if (fryer.t >= FRY) { hand = 'fries'; fryer = null; sfx.click(); } else pop('Still frying', '#ffd23f'); return; } pop('Hands full!', '#ff6a74'); return; }
    if (['bun', 'cheese', 'lettuce', 'tomato'].includes(id)) { if (!hand) { hand = id; sfx.click(); } else pop('Hands full!', '#ff6a74'); return; }
    if (id === 'bin') { if (hand) { hand = null; hand2 = null; sfx.fail(); pop('Binned', '#aaa'); } else if (plate.length) { plate = []; sfx.fail(); pop('Board cleared', '#aaa'); } return; }
    if (id === 'board') { if (hand === 'raw') { pop('Cook it first!', '#ff6a74'); return; } if (hand === 'plate') { plate = hand2; hand = null; hand2 = null; return; }
      if (hand) { if (plate.includes(hand)) { pop('Already on there', '#ffd23f'); return; } plate.push(hand); hand = null; sfx.click(); return; }
      if (plate.length) { hand = 'plate'; hand2 = plate; plate = []; sfx.click(); } return; }
    if (id === 'window') { const items = hand === 'plate' ? hand2 : hand === 'fries' ? ['fries'] : null; if (!items) { pop('Bring a finished order', '#ffd23f'); return; }
      if (items.includes('burnt')) { pop('Burnt! Customer refused', '#ff6a74'); hand = null; hand2 = null; sfx.fail(); return; }
      const i = orders.findIndex(q => same(q.r.items, items)); if (i < 0) { pop('Nobody ordered that', '#ff6a74'); sfx.fail(); return; }
      const q = orders[i], tip = Math.round(q.r.pay * 0.6 * q.t / q.max); orders.splice(i, 1); leave(q); served++; earned += q.r.pay + tip; tips += tip; hand = null; hand2 = null; pop(`+$${q.r.pay + tip}${tip ? ' (tip!)' : ''}`); sfx.coin(); bonusT += 3; return; }
  };
  // what's on show: grill patties, fryer basket, the board stack, what you're carrying
  const vis = { grill: [null, null], fry: null, board: null, hand: null, keys: {} };
  const showAt = (slot, key, build, x, y, z) => { if (vis.keys[slot] === key) return; if (vis[slot]) S.g.remove(vis[slot]); vis.keys[slot] = key; vis[slot] = key ? build() : null; if (vis[slot]) { vis[slot].position.set(x, y, z); S.g.add(vis[slot]); } };
  newOrder();
  return { see: true, title: o.title || 'Burger Rush', hint: 'Tap a station to walk there. Cook patties (don\'t burn them), build the order on the board, serve it at the hatch.', time: 75, keepOnQuit: true,
    init() {}, down(x, y) { const all = Object.values(ST).map(s2 => s2.g), hit = pickAt(x, y, all); if (hit) { go = hit.o.userData.tag; sfx.click(); } },
    update(dt) {
      if (go) { const st = ST[go], [tx, tz] = st.stand, dx = tx - me.x, dz = tz - me.z, d = Math.hypot(dx, dz), sp = 3.4 * dt;
        if (d > sp) { me.x += dx / d * sp; me.z += dz / d * sp; me.face = Math.atan2(dx, dz); me.walk += dt * 11; me.moving = true; } else { me.x = tx; me.z = tz; me.face = st.face; me.moving = false; const g2 = go; go = null; act(g2); } }
      for (const g of grill) if (g) g.t += dt; if (fryer) fryer.t += dt;
      spawnT -= dt; if (spawnT <= 0 && orders.length < 3) { newOrder(); spawnT = Math.max(6, 13 - served * 0.5); }
      for (let i = orders.length - 1; i >= 0; i--) { orders[i].t -= dt; if (orders[i].t <= 0) { leave(orders[i]); orders.splice(i, 1); missed++; pop('Customer walked out', '#ff6a74'); sfx.fail(); } }
      if (!orders.length && spawnT > 2) spawnT = 2; for (const p of pops) p.l -= dt; pops = pops.filter(p => p.l > 0);
      const b = bonusT; bonusT = 0; return { addTime: b }; },
    frame(dt, t) {
      grill.forEach((g, k) => { const key = g ? (g.t >= BURN ? 'burnt' : g.t >= COOK ? 'patty' : 'raw') : null; showAt('g' + k, key, () => mk(key), k ? 0.68 : -0.68, 0.95, 1.85); if (g && g.t > BURN && Math.random() < dt * 8) { const q = S.L(k ? 0.68 : -0.68, 1.1, 1.85); C.spawnParticles(q.x, q.y, q.z, ['#555', '#777'], 1, 0.6, 1.2, 0.12, -1.5); } });
      showAt('fry', fryer ? (fryer.t >= FRY ? 'done' : 'f') : null, () => mk('fries'), 2.05, 0.96, 1.85);
      showAt('board', plate.length ? plate.join() : null, () => stackMesh(plate), 0, 0.97, 0.15);
      const hk = hand ? (hand === 'plate' ? 'p:' + (hand2 || []).join() : hand) : null; showAt('hand', hk, () => hand === 'plate' ? stackMesh(hand2 || []) : mk(hand), 0, 0, 0);
      if (vis.hand) vis.hand.position.set(me.x + Math.sin(me.face) * 0.35, 1.1, me.z + Math.cos(me.face) * 0.35);
      const h = S.hero(me.x, 0, me.z, me.face); poseIdle(h, { phase: me.walk, speed: me.moving ? 0.9 : 0 }); if (hand) { arm(h.armL, -1.25, -0.5, 0.25); arm(h.armR, -1.25, -0.5, -0.25); } else if (!me.moving) { arm(h.armL, -0.4, -0.6); arm(h.armR, -0.4, -0.6); }
      for (const c2 of custs) { C.poseCharacter(c2.ch, { phase: 0, speed: 0, aim: 0, recoil: 0, t }); arm(c2.ch.armL, 0, 0); arm(c2.ch.armR, 0, 0); }
      S.cam(0, 6.4, -5.0, 0, 0.3, 0.5); C.cutRender(0); },
    draw(c, t) { const W = C.W(), H = C.H();
      orders.forEach((q, i) => { const w = W * 0.3, x = W * 0.035 + i * (w + W * 0.02), y = H * 0.02, h = 66; rr(c, x, y, w, h, 10); c.fillStyle = 'rgba(255,244,220,.94)'; c.fill(); c.fillStyle = q.t / q.max < 0.3 ? '#ff3b4a' : q.t / q.max < 0.6 ? '#ffb020' : '#4cd964'; c.fillRect(x + 6, y + h - 9, (w - 12) * q.t / q.max, 5);
        c.font = '900 11px system-ui'; c.textAlign = 'center'; c.fillStyle = '#8a5a35'; c.fillText(q.r.n, x + w / 2, y + 14); q.r.items.forEach((k, j) => { c.fillStyle = COL[k]; c.beginPath(); c.arc(x + w / 2 + (j - (q.r.items.length - 1) / 2) * 14, y + 36, 6, 0, 7); c.fill(); }); });
      grill.forEach((g, k) => { if (!g) return; const q = S.L(k ? 0.68 : -0.68, 1.25, 1.85).project(C.cutCam), sx = (q.x + 1) / 2 * W, sy = (1 - q.y) / 2 * H; const f = g.t >= COOK ? Math.min(1, (g.t - COOK) / (BURN - COOK)) : g.t / COOK; bar(c, sx - 26, sy - 6, 52, 8, f, g.t >= BURN ? '#ff3b4a' : g.t >= COOK ? '#4cd964' : '#ffb020'); if (g.t >= COOK && g.t < BURN && Math.floor(t * 4) % 2) txt(c, 'READY', sx, sy - 16, 11, '#4cd964'); if (g.t > BURN - 2 && g.t < BURN) txt(c, '!!', sx + 34, sy, 14, '#ff3b4a'); });
      if (fryer) { const q = S.L(2.05, 1.25, 1.85).project(C.cutCam), sx = (q.x + 1) / 2 * W, sy = (1 - q.y) / 2 * H; bar(c, sx - 26, sy - 6, 52, 8, fryer.t / FRY, fryer.t >= FRY ? '#4cd964' : '#ffb020'); }
      pops.forEach((p, i) => { c.globalAlpha = Math.min(1, p.l * 2); txt(c, p.s, W / 2, H * 0.2 + i * 22 - (1.2 - p.l) * 20, 16, p.col); c.globalAlpha = 1; });
      txt(c, `Served ${served} · $${earned}${missed ? ` · ${missed} walked out` : ''}`, W / 2, H * 0.92, 14, '#ffd23f'); },
    result() { return { win: served > 0, score: served, money: earned, tips, missed }; },
    cleanup() { for (const c2 of custs) drop(c2.ch); S.dispose(); } };
};

// ================================================================ hotwire: lying in the footwell with a torch, under the steering column
CUT.hotwire = (o = {}) => {
  const P = C.P, S = makeSet(P.x, C.groundY(P.x, P.z) + 0.2, P.z, P.face), dash = o.car?.accentColor && o.car.accentColor !== '#ffffff' ? o.car.accentColor : '#2a2b30', trim = '#1a1a1e';
  S.box(1.5, 0.05, 1.6, trim, 0, 0, 0.4); S.box(0.06, 1.4, 1.6, trim, -0.75, 0, 0.4); S.box(0.06, 1.4, 1.6, trim, 0.75, 0, 0.4); S.box(1.5, 0.06, 1.6, trim, 0, 1.45, 0.4); S.box(1.5, 1.45, 0.06, '#101014', 0, 0, 1.2);
  S.box(1.46, 0.36, 0.55, dash, 0, 0.92, 0.9); const pan = S.box(0.5, 0.02, 0.32, dash, 0.12, 0.78, 0.72); pan.rotation.x = 0.7;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.6, 12), mat('#16161b')); col.rotation.x = -1.0; S.add(col, -0.1, 1.08, 0.58);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 28), mat('#16161b')); wheel.rotation.x = -0.55; S.add(wheel, -0.1, 1.28, 0.35);
  for (const px of [-0.25, 0.05]) S.box(0.09, 0.03, 0.14, '#3a3d45', px, 0.12, 1.0);
  S.box(0.12, 0.08, 0.1, '#c9ccd2', -0.1, 0.88, 0.62); // ignition barrel
  const lamps = []; for (let i = 0; i < 4; i++) lamps.push(S.box(0.04, 0.02, 0.02, new THREE.MeshStandardMaterial({ color: '#222', emissive: ['#ff3b4a', '#ffd23f', '#4cd964', '#38e8ff'][i], emissiveIntensity: 0 }), -0.25 + i * 0.09, 1.1, 0.62));
  const torch = new THREE.PointLight('#ffe8c0', 3, 3.2, 1.6); S.g.add(torch); torch.position.set(0, 0.45, 0.15); const fill = new THREE.AmbientLight('#404860', 0.4); S.g.add(fill);
  const COLS = ['#e23b3b', '#2f80ed', '#ffd23f', '#4cd964'], n = clamp(o.wires || 3, 2, 4), cols = COLS.slice(0, n), order = [...cols].sort(() => Math.random() - 0.5);
  const seg = (m, a, b) => { const d = b.clone().sub(a), L = d.length(); m.scale.set(1, L, 1); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); };
  const wires = cols.map((cc, i) => { const root = new THREE.Vector3(-0.12 + i * 0.06, 0.84, 0.72), end = new THREE.Vector3(-0.32 + i * 0.16, 0.5 + Math.random() * 0.08, 0.58);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6), mat(cc)); S.g.add(m); const tip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.03), mat('#c87533', { metalness: 0.7, roughness: 0.3 })); tip.userData.tag = 'w' + i; S.g.add(tip);
    return { col: cc, root, end, m, tip, done: false }; });
  const terms = order.map((cc, j) => { const g = new THREE.Group(); g.userData.tag = 't' + j; S.add(g, 0.3 + j * 0.08 - (n - 1) * 0.04, 0.72, 0.62); S.box(0.06, 0.06, 0.05, '#3a3d45', 0, 0, 0, g); S.box(0.035, 0.035, 0.01, mat(cc), 0, 0.012, -0.03, g); return { col: cc, g, pos: S.L(0.3 + j * 0.08 - (n - 1) * 0.04, 0.75, 0.6) }; });
  S.box(0.08 * n + 0.08, 0.1, 0.08, '#16161b', 0.3, 0.68, 0.64);
  let sel = -1, connected = 0, done = false, endT = 0, shock = 0, msg = '', msgT = 0;
  return { see: true, title: 'Hotwire', hint: 'Tap a wire, then the terminal of the same colour', time: 10,
    init() {},
    down(x, y) { if (done) return; const hit = pickAt(x, y, [...wires.filter(w => !w.done).map(w => w.tip), ...terms.map(t2 => t2.g)]); if (!hit) return; const tag = hit.o.userData.tag;
      if (tag[0] === 'w') { sel = +tag.slice(1); sfx.click(); return; }
      if (sel < 0) { msg = 'Pick a wire first'; msgT = 0.8; return; }
      const T = terms[+tag.slice(1)], w = wires[sel];
      if (T.col === w.col) { w.done = true; w.end = S.g.worldToLocal(T.pos.clone()); connected++; sel = -1; sfx.spark(); C.spawnParticles(T.pos.x, T.pos.y, T.pos.z, ['#ffe08a', '#ffffff', '#38e8ff'], 10, 2.5, 0.25, 0.04); navigator.vibrate?.(20);
        if (connected >= n) { done = true; endT = 1.1; sfx.engineStart(); msg = 'VROOM'; msgT = 1.2; navigator.vibrate?.([30, 30, 60]); } }
      else { shock = 0.3; sfx.fail(); msg = 'Zap! Wrong colour'; msgT = 0.8; navigator.vibrate?.(60); C.spawnParticles(T.pos.x, T.pos.y, T.pos.z, ['#38e8ff', '#ffffff'], 6, 3, 0.2, 0.04); sel = -1; } },
    update(dt) { shock -= dt; msgT -= dt; if (done) endT -= dt; return done && endT <= 0; },
    frame(dt, t) { const hr = C.heroRoot(); hr.visible = false;
      wires.forEach((w, i) => { const sway = w.done ? 0 : Math.sin(t * 2 + i) * 0.015, e = w.end.clone().add(new THREE.Vector3(sway, 0, 0)); seg(w.m, w.root, e); w.tip.position.set(e.x, e.y - 0.02, e.z); w.tip.scale.setScalar(sel === i ? 1.6 + Math.sin(t * 12) * 0.2 : 1); });
      lamps.forEach((l, i) => l.material.emissiveIntensity = done ? 1.6 : connected > i ? 0.8 : 0);
      torch.intensity = 3 + Math.sin(t * 7) * 0.15; C.cutCam.fov = 72; S.cam(0.08 + Math.sin(t * 1.3) * 0.01, 0.32, -0.3, 0.06, 0.78, 0.66); C.cutRender(shock > 0 ? 0.01 : 0); },
    draw(c) { const W = C.W(), H = C.H(); txt(c, `${connected} / ${n}`, W / 2, H * 0.12, 30, '#ffd23f'); if (msgT > 0) txt(c, msg, W / 2, H * 0.82, msg === 'VROOM' ? 40 : 18, msg === 'VROOM' ? '#ffd23f' : '#ff6a74');
      if (sel >= 0) { c.fillStyle = wires[sel].col; c.beginPath(); c.arc(W / 2, H * 0.9, 14, 0, 7); c.fill(); txt(c, 'Now tap the matching terminal', W / 2, H * 0.95, 13, '#fff'); } },
    result() { return { win: done, score: connected }; },
    cleanup() { C.cutCam.fov = 46; C.cutCam.updateProjectionMatrix(); for (const l of lamps) l.material.dispose(); S.dispose(); C.heroRoot().visible = true; } };
};

// ================================================================ life-event activities: you actually do the thing someone asked you to
// kinds: tyre (mash to undo the nuts), chug (mash to down the pint), jog (mash to run), sing + roof (tap in the zone), film (keep them in frame), litter (tap the rubbish)
CUT.task = (o = {}) => {
  const P = C.P, kind = o.kind || 'tyre';
  const CAMS = { tyre: [3.6, 1.8, -2.0, 1.0, 0.45, 0.7], chug: [0.4, 1.7, 2.6, 0, 1.35, 0], jog: [2.6, 1.6, 3.2, 0, 1, -1], sing: [2.4, 1.5, 2.6, 0.3, 1.15, 0.8], roof: [2.8, 2.6, -1.6, 0, 0.6, 0.8], film: [0.5, 1.85, -1.1, -0.1, 1.3, 2.6], litter: [0, 7.5, -4.5, 0, 0, 0.8] }, CA = CAMS[kind];
  let face = P.face; { const ok = f => { const c = Math.cos(f), s2 = Math.sin(f), w = (lx, lz) => [P.x + lx * c + lz * s2, P.z - lx * s2 + lz * c]; for (const k of [1, 0.66, 0.33]) { const [x, z] = w(CA[0] * k, CA[2] * k); if (!C.open?.(x, z) && C.open) return false; } return true; };
    for (let i = 0; i < 8; i++) { const f = P.face + [0, Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4][i]; if (ok(f)) { face = f; break; } } } // turn the little set so the camera isn't stuck in a wall
  const S = makeSet(P.x, C.groundY(P.x, P.z), P.z, face);
  const npc = o.npc ? person(o.npc) : null; let npc2 = null;
  let prog = 0, ph = 0, hits = 0, miss = 0, mk = 0, mdir = 1, zone = [0.4, 0.62], flash = 0, msg = '', msgCol = '#5ee07a', msgT = 0, tapT = 0;
  const props = {};
  const say = (m, col = '#5ee07a') => { msg = m; msgT = 0.7; msgCol = col; };
  if (kind === 'tyre') { // the stranger's car, back wheel off the ground on the jack
    S.box(1.9, 0.62, 3.6, '#c94040', 0, 0.42, 1.6); S.box(1.7, 0.5, 1.8, '#a83030', 0, 1.04, 1.9); S.box(1.68, 0.3, 1.6, '#9fd3ff', 0, 1.1, 1.9);
    props.wheel = S.cyl(0.38, 0.38, 0.26, '#16161b', 0.98, 0.3, 0.6, 20); props.wheel.rotation.z = Math.PI / 2; S.cyl(0.2, 0.2, 0.28, '#9aa0a8', 0.98, 0.3, 0.6, 12).rotation.z = Math.PI / 2;
    props.nuts = []; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, n = S.box(0.06, 0.06, 0.06, '#e8e2c8', 1.13, 0.68 + Math.sin(a) * 0.12, 0.6 + Math.cos(a) * 0.12); props.nuts.push(n); }
    S.box(0.3, 0.3, 0.3, '#ffd23f', 1.1, 0, 1.3); if (npc) { S.add(npc.root, 2.4, 0, 2.2); npc.root.rotation.y = -2.2; }
  } else if (kind === 'chug') {
    S.box(2.6, 1.05, 0.7, '#5a3a20', 0, 0, 0.9); S.box(2.7, 0.06, 0.8, '#3a2412', 0, 1.05, 0.9);
    props.glass = S.cyl(0.07, 0.06, 0.2, new THREE.MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.35 }), 0, 0, 0);
    props.beer = S.cyl(0.062, 0.055, 0.18, '#e0a020', 0, 0, 0);
    if (npc) { S.add(npc.root, 0.9, 0, 0.2); npc.root.rotation.y = -1.6; }
  } else if (kind === 'jog') {
    props.lines = []; for (let i = 0; i < 10; i++) props.lines.push(S.box(0.12, 0.012, 0.8, '#f2f0e8', 0, 0.01, 0));
    for (let i = 0; i < 4; i++) { const r = person(null, { topColor: ['#ff3b8a', '#38e8ff', '#ffd23f', '#4cd964'][i] }); S.add(r.root, -1.4 + i * 0.9, 0, -2 - i * 1.3); (props.runners ||= []).push(r); }
  } else if (kind === 'sing') {
    if (npc) { S.add(npc.root, 0.9, 0, 0.3); npc.root.rotation.y = -0.5; props.guitar = S.box(0.12, 0.5, 0.06, '#a0602a', 0.75, 0.9, 0.55); props.guitar.rotation.z = 0.9; }
    S.box(0.6, 0.12, 0.35, '#2a1a10', 0.2, 0, 1.0); for (let i = 0; i < 5; i++) { const c = person(null); S.add(c.root, -2.2 + i * 1.1, 0, 3.4 + (i % 2) * 0.5); c.root.rotation.y = Math.PI; (props.crowd ||= []).push(c); }
    props.mic = S.box(0.05, 0.05, 0.16, '#222', 0, 0, 0);
  } else if (kind === 'roof') {
    const r = S.box(4, 0.1, 3, '#7a3a2a', 0, 0, 1); props.tiles = []; for (let i = 0; i < 5; i++) { const t = S.box(0.5, 0.06, 0.4, '#a0502a', -1 + i * 0.5, 0.1, 0.8); t.visible = false; props.tiles.push(t); }
    props.ham = S.box(0.05, 0.05, 0.3, '#5a3a20', 0, 0, 0);
  } else if (kind === 'film') {
    S.box(1.1, 0.75, 0.8, '#e8e2d6', 0, 0, 2.6); const a = person(null, { fem: false, topColor: '#2a2d33' }), b = person(null, { fem: true, topColor: '#c9306f' });
    S.add(a.root, -0.75, 0, 2.6); a.root.rotation.y = Math.PI / 2; S.add(b.root, 0.75, 0, 2.6); b.root.rotation.y = -Math.PI / 2; npc2 = [a, b];
    props.ring = S.box(0.05, 0.05, 0.05, glowM('#ffd23f'), -0.3, 1.0, 2.6); props.phone = S.box(0.08, 0.15, 0.01, '#16161b', 0, 0, 0);
    props.fx = 0.5; props.fy = 0.5; props.tx = 0.5; props.ty = 0.45; props.inT = 0; props.dragging = false; props.lx = 0; props.ly = 0;
  } else if (kind === 'litter') {
    S.cyl(4.8, 4.8, 0.02, '#e8d6a2', 0, 0.01, 0, 32);
    props.bits = []; const cols = ['#e23b3b', '#38e8ff', '#ffd23f', '#f2f0e8', '#4cd964'];
    for (let i = 0; i < 14; i++) { const a = rnd(0, 6.28), d = rnd(1.2, 4.2), m = Math.random() < 0.5 ? S.cyl(0.07, 0.07, 0.18, cols[i % 5], Math.sin(a) * d, 0.03, Math.cos(a) * d, 8) : S.box(0.26, 0.08, 0.2, cols[i % 5], Math.sin(a) * d, 0.03, Math.cos(a) * d); m.rotation.z = rnd(0, 1.5); m.userData.tag = 'bit'; props.bits.push(m); }
    props.bag = S.box(0.3, 0.45, 0.3, '#2a2a30', 0.5, 0, 0.2); props.got = 0;
  }
  const NEED = { tyre: 1, chug: 1, jog: 1, sing: 5, roof: 5, film: 0.6, litter: 10 }[kind], TIME = { tyre: 14, chug: 9, jog: 16, sing: 16, roof: 16, film: 14, litter: 15 }[kind];
  const mash = kind === 'tyre' || kind === 'chug' || kind === 'jog', timing = kind === 'sing' || kind === 'roof';
  const HINT = { tyre: 'Tap fast to undo the wheel nuts!', chug: 'Tap fast to down it!', jog: 'Tap fast to keep pace!', sing: 'Tap when the marker is in the green', roof: 'Tap when the hammer is in the green', film: 'Drag to keep them in the frame', litter: 'Tap the rubbish to bag it' }[kind];
  const newZone = () => { const w = kind === 'sing' ? 0.2 : 0.18, a = rnd(0.08, 0.92 - w); zone = [a, a + w]; };
  return { see: true, title: o.title || 'Give it a go', hint: HINT, time: TIME,
    init() { newZone(); },
    down(x, y) {
      tapT = 0.15; navigator.vibrate?.(8);
      if (mash) { prog = Math.min(1, prog + (kind === 'tyre' ? 0.03 : kind === 'chug' ? 0.045 : 0.035)); sfx.click(); }
      else if (timing) { if (mk >= zone[0] && mk <= zone[1]) { hits++; flash = 0.3; say(kind === 'sing' ? pick(['Lovely!', 'On key!', 'Yes!']) : 'Bang on!'); sfx.coin(); newZone(); if (kind === 'roof') props.tiles[Math.min(4, hits - 1)].visible = true; } else { miss++; say(kind === 'sing' ? 'Off key!' : 'Ouch!', '#ff5a5a'); sfx.fail(); } }
      else if (kind === 'film') { props.dragging = true; props.lx = x; props.ly = y; }
      else if (kind === 'litter') { const hit = pickAt(x, y, props.bits.filter(b => b.visible)); if (hit) { hit.visible = false; props.got++; sfx.coin(); say(`${props.got} bagged`); } }
    },
    move(x, y) { if (kind === 'film' && props.dragging) { props.fx = clamp(props.fx + (x - props.lx) / C.W(), 0.1, 0.9); props.fy = clamp(props.fy + (y - props.ly) / C.H(), 0.15, 0.85); props.lx = x; props.ly = y; } },
    up() { props.dragging = false; },
    update(dt, t) {
      ph += dt * (mash ? 3 + prog * 8 : 3); msgT -= dt; flash -= dt; tapT -= dt;
      if (kind === 'chug' || kind === 'jog') prog = Math.max(0, prog - dt * (kind === 'jog' ? 0.012 : 0.008));
      if (timing) { mk += mdir * dt * (kind === 'sing' ? 0.85 : 1.05) * (1 + hits * 0.08); if (mk > 1) { mk = 1; mdir = -1; } if (mk < 0) { mk = 0; mdir = 1; } }
      if (kind === 'film') { props.tx = 0.5 + Math.sin(t * 0.9) * 0.25 + Math.sin(t * 2.3) * 0.08; props.ty = 0.45 + Math.sin(t * 0.7 + 1) * 0.15; const inF = Math.abs(props.fx - props.tx) < 0.12 && Math.abs(props.fy - props.ty) < 0.12; if (inF) props.inT += dt; prog = props.inT / Math.max(1, t); }
      if (mash && prog >= 1) return true; if (timing && hits >= NEED) return true; if (kind === 'litter' && props.got >= NEED) return true;
    },
    frame(dt) {
      const h = S.hero(0, 0, 0);
      if (kind === 'tyre') { S.hero(1.55, 0, 0.6, -Math.PI / 2); poseIdle(h); h.hips.position.y = h.legLen * 0.55; arm(h.armR, -1.3 + (tapT > 0 ? 0.3 : 0), -0.4); arm(h.armL, -1.1, -0.6); props.nuts.forEach((n, i) => { n.visible = prog < (i + 1) / 5; }); props.wheel.rotation.x += dt * prog * 2; S.cam(...CA); }
      else if (kind === 'chug') { poseIdle(h); const k = prog; arm(h.armR, -1.2 - k * 1.3, -1.4 + k * 0.8); h.head.rotation.x = -k * 0.6; const hand = S.L(0.18, 1.35 + k * 0.25, 0.25); props.glass.position.copy(S.g.worldToLocal(hand.clone())); props.beer.position.copy(props.glass.position); props.beer.scale.y = Math.max(0.02, 1 - k); props.glass.rotation.x = props.beer.rotation.x = -k * 1.4; S.cam(...CA); }
      else if (kind === 'jog') { poseIdle(h, { phase: ph, speed: 0.4 + prog * 0.6 }); arm(h.armL, Math.sin(ph) * 0.8, -1.2); arm(h.armR, -Math.sin(ph) * 0.8, -1.2); props.lines.forEach((l, i) => { l.position.z = ((i * 2 - ph * 1.2) % 20 + 20) % 20 - 10; }); props.runners.forEach((r, i) => { C.poseCharacter(r, { phase: ph + i, speed: 0.8, air: false, aim: 0, recoil: 0, t: C.time() }); r.root.position.z = -2 - i * 1.3 + (prog - 0.5) * 3 * (i + 1) * 0.5; }); S.cam(...CA); }
      else if (kind === 'sing') { poseIdle(h); arm(h.armR, -2.2, -1.6); h.head.rotation.x = -0.2 + (flash > 0 ? -0.2 : 0); props.mic.position.copy(S.g.worldToLocal(S.L(0.12, 1.55, 0.25))); if (npc) { poseIdle(npc); arm(npc.armR, -0.6 + Math.sin(ph * 4) * 0.3, -1.2); } props.crowd.forEach((c, i) => { poseIdle(c); c.root.position.y = flash > 0 ? Math.abs(Math.sin(ph * 6 + i)) * 0.15 : 0; }); S.cam(...CA); }
      else if (kind === 'roof') { S.hero(0, 0.1, 0); poseIdle(h); h.hips.position.y = h.legLen * 0.5; const sw = tapT > 0 ? 1 : 0; arm(h.armR, -2.4 + sw * 1.6, -0.5); props.ham.position.copy(S.g.worldToLocal(S.L(0.25, 1.1 + (1 - sw) * 0.5, 0.35))); S.cam(...CA); }
      else if (kind === 'film') { S.hero(-0.45, 0, 0); poseIdle(h); arm(h.armR, -1.5, -0.3); arm(h.armL, -1.5, -0.3); props.phone.position.copy(S.g.worldToLocal(S.L(0, 1.45, 0.45))); npc2.forEach(n => poseIdle(n)); props.ring.visible = Math.sin(ph * 3) > -0.5; S.cam(...CA); }
      else if (kind === 'litter') { poseIdle(h); h.hips.position.y = h.legLen * (tapT > 0 ? 0.7 : 1); arm(h.armR, tapT > 0 ? -0.6 : -0.2, 0); S.cam(...CA); }
      C.cutRender(0);
    },
    draw(c) { const W = C.W(), H = C.H();
      if (mash) { bar(c, W * 0.15, H * 0.86, W * 0.7, 18, prog, prog > 0.8 ? '#4cd964' : '#ff8a2a'); txt(c, kind === 'tyre' ? `${Math.min(5, Math.floor(prog * 5))} / 5 nuts` : kind === 'chug' ? `${Math.round(prog * 100)}%` : `${(prog * 10).toFixed(1)} km`, W / 2, H * 0.12, 30, '#ffd23f'); if (tapT > 0) txt(c, 'TAP!', W / 2, H * 0.78, 22, '#fff'); }
      if (timing) { const x0 = W * 0.12, w = W * 0.76, y = H * 0.84; rr(c, x0, y, w, 22, 11); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); rr(c, x0 + zone[0] * w, y, (zone[1] - zone[0]) * w, 22, 11); c.fillStyle = '#4cd964'; c.fill(); c.fillStyle = '#fff'; c.fillRect(x0 + mk * w - 3, y - 8, 6, 38); txt(c, `${hits} / ${NEED}`, W / 2, H * 0.12, 30, '#ffd23f'); }
      if (kind === 'film') { const fw = W * 0.34, fh = H * 0.22, fx = props.fx * W, fy = props.fy * H, inF = Math.abs(props.fx - props.tx) < 0.12 && Math.abs(props.fy - props.ty) < 0.12; c.strokeStyle = inF ? '#4cd964' : '#ff5a5a'; c.lineWidth = 4; c.strokeRect(fx - fw / 2, fy - fh / 2, fw, fh); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(props.tx * W, props.ty * H, 8, 0, 6.3); c.fill(); txt(c, inF ? 'REC ●' : 'Lost them!', W / 2, H * 0.12, 24, inF ? '#ff3b4a' : '#fff'); bar(c, W * 0.15, H * 0.9, W * 0.7, 12, prog / NEED, '#4cd964'); }
      if (kind === 'litter') txt(c, `${props.got} / ${NEED} bagged`, W / 2, H * 0.12, 28, '#ffd23f');
      if (msgT > 0) txt(c, msg, W / 2, H * 0.74, 20, msgCol);
    },
    result() { const win = mash ? prog >= 1 : timing ? hits >= NEED : kind === 'film' ? prog >= NEED : props.got >= NEED; return { win, score: hits || props.got || Math.round(prog * 100) }; },
    cleanup() { C.hero().head.visible = true; if (npc) drop(npc); if (npc2) npc2.forEach(drop); for (const k of ['runners', 'crowd']) (props[k] || []).forEach(drop); S.dispose(); } };
};
