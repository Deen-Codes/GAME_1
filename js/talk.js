// Conversations staged like a Pokémon battle: they stand on a platform facing you,
// you see the back of your own head in the foreground, subtitles type out, you pick replies.
import * as THREE from '../lib/three.module.min.js';
import { buildCharacter, poseCharacter, disposeObject } from './character.js?v=94';
import { sfx, audio } from './audio.js?v=94';

const $ = id => document.getElementById(id);
const BG = {
  city: { sky: ['#7ec8f2', '#d9f0ff'], ground: ['#8d8a92', '#5d5b66'], plat: '#a9a5ad', rim: '#6b6873' },
  suburb: { sky: ['#86cff5', '#e3f5ff'], ground: ['#7dbb5a', '#5f9f45'], plat: '#b9b4ad', rim: '#7a756e' },
  pier: { sky: ['#6ec6f0', '#e6f7ff'], ground: ['#a8865a', '#7a5e3c'], plat: '#c9a26a', rim: '#8a6a45' },
  beach: { sky: ['#6ec6f0', '#e6f7ff'], ground: ['#f2dfa6', '#e2c47e'], plat: '#f6e7b8', rim: '#cdb07a' },
  hills: { sky: ['#86cff5', '#e3f5ff'], ground: ['#8ccf63', '#5f9f45'], plat: '#a4dc7c', rim: '#5f9f45' },
  airport: { sky: ['#8ad0f5', '#e8f7ff'], ground: ['#b8b8b0', '#8a8a84'], plat: '#cfcfc8', rim: '#8a8a84' },
};
const NIGHT = { sky: ['#14183c', '#4a2e6a'] };

export class Talk {
  constructor() {
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.hemi = new THREE.HemisphereLight('#ffffff', '#666070', 1.3); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff3e0', 2); this.sun.position.set(-3, 6, 5); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024); Object.assign(this.sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); this.scene.add(this.sun);
    const plat = (r) => { const g = new THREE.Group(); const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, 0.16, 48), new THREE.MeshStandardMaterial({ roughness: 0.9 })); top.position.y = -0.08; top.receiveShadow = true; g.add(top); const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, 0.04, 6, 48), new THREE.MeshStandardMaterial({ roughness: 0.8 })); rim.rotation.x = Math.PI / 2; g.add(rim); g.scale.z = 0.62; this.scene.add(g); return { g, top, rim }; };
    this.pNpc = plat(1.25); this.pYou = plat(1.35);
    this.npc = null; this.you = null; this.t = 0; this.intro = 0; this.talking = null;
    this.blipPitch = 300; this.active = false;
    $('talkBox').addEventListener('pointerdown', e => { e.preventDefault(); this.tap(); });
  }
  // painted backdrops for places, so a chat in the club looks like the club
  paintRoom(x, room, R) {
    const box = (c, X, Y, w, h) => { x.fillStyle = c; x.fillRect(X, Y, w, h); };
    if (room === 'club') {
      const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#0b0618'); g.addColorStop(1, '#2a0f3a'); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 9; i++) { const cx = 40 + i * 55, col = ['#ff3bd2', '#38e8ff', '#ffd23f', '#4cd964'][i % 4]; x.globalAlpha = 0.28; x.fillStyle = col; x.beginPath(); x.moveTo(cx, 0); x.lineTo(cx - 70 + R() * 140, 256); x.lineTo(cx - 40 + R() * 140, 256); x.fill(); x.globalAlpha = 1; box(col, cx - 6, 0, 12, 6); }
      box('#16161b', 196, 150, 120, 60); box('#38e8ff', 206, 160, 100, 6); for (let i = 0; i < 8; i++) box(['#ff3bd2', '#38e8ff', '#ffd23f'][i % 3], 206 + i * 13, 175, 8, 8 + R() * 22); // DJ booth
      box('#ff3bd2', 150, 40, 212, 4); x.fillStyle = '#ff7ae8'; x.font = 'bold 34px sans-serif'; x.fillText('NEON ROOM', 160, 90);
      for (let i = 0; i < 26; i++) { const px = R() * 512, ph = 30 + R() * 30; x.fillStyle = '#05030c'; x.beginPath(); x.arc(px, 256 - ph, 8, 0, 7); x.fill(); x.fillRect(px - 9, 256 - ph + 6, 18, ph); if (R() < 0.5) x.fillRect(px + 4, 256 - ph - 22, 4, 20); } // crowd, hands up
      for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? ['#3a1450', '#14304a', '#4a1430'][(i * j) % 3] : '#1a0a24'; x.fillRect(i * 32, 256 + j * 32, 32, 32); } // lit dance floor
    } else if (room === 'bar') {
      box('#3a2414', 0, 0, 512, 256); for (let s2 = 0; s2 < 3; s2++) { box('#5a3a22', 60, 60 + s2 * 50, 392, 6); for (let i = 0; i < 26; i++) box(['#2f8a4a', '#8a5a2a', '#c9c2b5', '#5a2a2a', '#2a4a8a'][Math.floor(R() * 5)], 66 + i * 15, 36 + s2 * 50, 9, 24); }
      x.globalAlpha = 0.35; box('#ffb35c', 0, 0, 512, 256); x.globalAlpha = 1; box('#5a3a22', 0, 210, 512, 46); box('#7a5230', 0, 206, 512, 8);
      x.fillStyle = '#ff6a3c'; x.font = 'bold 26px sans-serif'; x.fillText('THE ANCHOR', 180, 28);
    } else if (room === 'diner') {
      box('#f6e7b8', 0, 0, 512, 256); box('#c9302c', 0, 150, 512, 20); for (let i = 0; i < 6; i++) { box('#8fd0e8', 20 + i * 85, 40, 60, 70); box('#ffffff', 18 + i * 85, 38, 64, 4); }
      for (let i = 0; i < 5; i++) box('#c9302c', 30 + i * 100, 185, 70, 50); box('#e8e8ea', 0, 230, 512, 26);
      for (let i = 0; i < 16; i++) for (let j = 0; j < 8; j++) { x.fillStyle = (i + j) % 2 ? '#16161b' : '#f2f2f2'; x.fillRect(i * 32, 256 + j * 32, 32, 32); }
    } else if (room === 'gym') {
      box('#4a4d55', 0, 0, 512, 256); box('#9fd8ff', 40, 40, 432, 120); x.globalAlpha = 0.25; box('#ffffff', 40, 40, 432, 120); x.globalAlpha = 1; // mirrors
      for (let i = 0; i < 10; i++) { box('#16161b', 50 + i * 42, 190, 30, 8); box('#c9302c', 48 + i * 42, 182, 6, 24); box('#c9302c', 74 + i * 42, 182, 6, 24); }
      x.fillStyle = '#ffd23f'; x.font = 'bold 26px sans-serif'; x.fillText('IRON TEMPLE', 170, 28);
    } else if (room === 'prison') {
      box('#9a9ea6', 0, 0, 512, 256); for (let i = 0; i < 4; i++) { box('#6a6d74', 30 + i * 125, 70, 100, 140); for (let k = 0; k < 7; k++) box('#3a3d45', 36 + i * 125 + k * 14, 70, 4, 140); }
      box('#ffd23f', 0, 236, 512, 6);
    }
  }
  layout(W, H) {
    this.W = W; this.H = H;
    this.cam.aspect = W / H; this.cam.fov = W / H < 0.6 ? 52 : 40;
    this.cam.clearViewOffset(); this.cam.setViewOffset(W, H, 0, H * 0.1, W, H); this.cam.updateProjectionMatrix();
    const a = W / H, spread = Math.min(1, a / 0.46);
    this.npcPos = new THREE.Vector3(0.8 * spread, 0, -2.6);
    this.youPos = new THREE.Vector3(-0.62 * spread, 0, 1.75);
    this.cam.position.set(0, 2.3, 5.6); this.cam.lookAt(0.1, 1.05, -1.2);
  }
  background(kind, night, wall, floor, room) {
    if (kind === 'interior' && wall) {
      const Wc = new THREE.Color(wall), F = new THREE.Color(floor || '#555');
      const hx = c => '#' + c.getHexString();
      BG.interior = { sky: [hx(Wc.clone().multiplyScalar(0.7)), hx(Wc)], ground: [hx(F.clone().multiplyScalar(1.15)), hx(F.clone().multiplyScalar(0.8))], plat: hx(F.clone().lerp(new THREE.Color('#ffffff'), 0.25)), rim: hx(F.clone().multiplyScalar(0.6)) };
      night = 0;
    }
    const b = BG[kind] || BG.city, N = night > 0.5, sky = N ? NIGHT.sky : b.sky;
    // painted backdrop: sky, a scene on the horizon that matches where you are, and the ground
    const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]); x.fillStyle = g; x.fillRect(0, 0, 512, 257);
    const gg = x.createLinearGradient(0, 256, 0, 512); gg.addColorStop(0, b.ground[0]); gg.addColorStop(1, b.ground[1]); x.fillStyle = gg; x.fillRect(0, 256, 512, 256);
    const R = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(7 + kind.length * 31);
    if (N) { x.fillStyle = '#ffffff'; for (let i = 0; i < 70; i++) x.fillRect(R() * 512, R() * 170, 1.5, 1.5); x.fillStyle = '#f4f1dc'; x.beginPath(); x.arc(420, 60, 16, 0, 7); x.fill(); }
    else if (kind !== 'interior') { x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 4; i++) { const cx = R() * 512, cy = 30 + R() * 90; for (let k = 0; k < 4; k++) { x.beginPath(); x.arc(cx + k * 16, cy + (k % 2) * 6, 14 + R() * 6, 0, 7); x.fill(); } } }
    const win = (bx, by, bw, bh) => { for (let yy = by + 6; yy < 256 - 6; yy += 12) for (let xx = bx + 5; xx < bx + bw - 6; xx += 10) { x.fillStyle = N ? (R() < 0.45 ? ['#ffd27a', '#ffb35c', '#cfe8ff'][Math.floor(R() * 3)] : 'rgba(0,0,0,.35)') : 'rgba(80,110,140,.55)'; x.fillRect(xx, yy, 5, 7); } };
    const sil = N ? 'rgba(20,18,40,1)' : null;
    if (kind === 'city' || kind === 'airport') {
      let bx = -10; while (bx < 520) { const bw = 30 + R() * 50, bh = (kind === 'airport' ? 30 : 60) + R() * (kind === 'airport' ? 30 : 130); x.fillStyle = sil || ['#8f97a8', '#a9a29a', '#7f8a9a', '#b8b2a6', '#9aa6b4'][Math.floor(R() * 5)]; x.fillRect(bx, 256 - bh, bw, bh); win(bx, 256 - bh, bw, bh); bx += bw + 2; }
      if (kind === 'airport') { x.fillStyle = N ? '#2a2a3a' : '#e8ecf0'; x.fillRect(300, 120, 60, 10); x.fillRect(320, 112, 14, 26); x.fillRect(352, 116, 8, 10); }
      x.fillStyle = N ? '#3a3a44' : '#6a6872'; x.fillRect(0, 256, 512, 26); x.fillStyle = N ? '#ffe9a0' : '#f2f2f2'; for (let i = 0; i < 512; i += 40) x.fillRect(i, 268, 20, 3);
    } else if (kind === 'suburb') {
      for (let i = 0; i < 6; i++) { const hx = i * 90 + R() * 20, hw = 60, hh = 40; x.fillStyle = sil || ['#f6d1c1', '#bfe3e0', '#f9e7a8', '#f2b8c6'][i % 4]; x.fillRect(hx, 256 - hh, hw, hh); x.fillStyle = sil || ['#a8432f', '#5a4a42', '#3e5a7a'][i % 3]; x.beginPath(); x.moveTo(hx - 6, 256 - hh); x.lineTo(hx + hw / 2, 256 - hh - 26); x.lineTo(hx + hw + 6, 256 - hh); x.fill(); x.fillStyle = N ? '#ffd27a' : '#5a7a9a'; x.fillRect(hx + 10, 256 - hh + 12, 12, 10); x.fillRect(hx + 38, 256 - hh + 12, 12, 10); }
    } else if (kind === 'beach' || kind === 'pier') {
      x.fillStyle = N ? '#14204a' : '#2f8fd0'; x.fillRect(0, 200, 512, 56); x.fillStyle = N ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.5)'; for (let i = 0; i < 30; i++) x.fillRect(R() * 512, 205 + R() * 48, 18, 2);
      if (!N) { x.fillStyle = '#ffe9a0'; x.beginPath(); x.arc(90, 150, 22, 0, 7); x.fill(); }
      if (kind === 'pier') { x.strokeStyle = N ? '#ff6fb5' : '#e23b3b'; x.lineWidth = 4; x.beginPath(); x.arc(400, 150, 50, 0, 7); x.stroke(); for (let a = 0; a < 6.28; a += 0.52) { x.beginPath(); x.moveTo(400, 150); x.lineTo(400 + Math.cos(a) * 50, 150 + Math.sin(a) * 50); x.stroke(); } }
      else for (const px of [40, 470, 300]) { x.strokeStyle = sil || '#7a5a3a'; x.lineWidth = 7; x.beginPath(); x.moveTo(px, 256); x.quadraticCurveTo(px + 12, 200, px + 6, 150); x.stroke(); x.fillStyle = sil || '#3f9a45'; for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(px + 6 + Math.cos(k) * 22, 150 + Math.sin(k) * 8, 26, 7, k, 0, 7); x.fill(); } }
    } else if (kind === 'hills') {
      x.fillStyle = N ? '#1a2a24' : '#7fbf6a'; x.beginPath(); x.moveTo(0, 256); for (let i = 0; i <= 512; i += 16) x.lineTo(i, 190 - Math.sin(i / 60) * 30 - Math.sin(i / 23) * 10); x.lineTo(512, 256); x.fill();
      x.fillStyle = N ? '#0f1c18' : '#2f6b3a'; for (let i = 0; i < 18; i++) { const tx = R() * 512, ty = 200 + R() * 50; x.beginPath(); x.moveTo(tx, ty - 34); x.lineTo(tx - 12, ty); x.lineTo(tx + 12, ty); x.fill(); }
      if (!N) { x.fillStyle = '#ffffff'; x.font = 'bold 22px sans-serif'; x.fillText('BAYWOOD', 300, 160); }
    }
    if (kind === 'interior') this.paintRoom(x, room, R);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (this.scene.background?.dispose) this.scene.background.dispose();
    this.scene.background = t;
    const RP = { club: ['#1a1428', '#ff3bd2'], bar: ['#5a3a22', '#3a2414'], diner: ['#e8e2d6', '#c9302c'], gym: ['#3a3d45', '#c9302c'], prison: ['#8a8e96', '#5a5d64'] }[kind === 'interior' ? room : ''];
    for (const p of [this.pNpc, this.pYou]) { p.top.material.color.set(RP ? RP[0] : b.plat); p.rim.material.color.set(RP ? RP[1] : b.rim); p.rim.material.emissive?.set(room === 'club' ? '#ff3bd2' : '#000000'); }
    this.hemi.intensity = N ? 0.8 : 1.3; this.sun.intensity = N ? 1 : 2; this.sun.color.set(N ? '#b0b8ff' : '#fff3e0');
  }
  begin({ npcCfg, youCfg, name, tag, pitch = 300, bg = 'city', night = 0, wall = null, floor = null, pet = null, pose = null, think = false, seat = false, phone = false, car = false, room = null, bed = null }) {
    this.pose = pose; this.think = think; this.seat = seat; this.phone = phone; this.car = car; this.bed = bed; this.actK = null; this.actT = 0;
    audio();
    this.clear();
    this.active = true; this.t = 0; this.intro = 0; this.t0 = performance.now(); this.blipPitch = pitch;
    this.background(wall ? 'interior' : bg, night, wall, floor, room);
    this.npc = buildCharacter(npcCfg); this.scene.add(this.npc.root);
    if (pet) { this.pet = pet; pet.scale.setScalar(1.15); this.scene.add(pet); }
    if (pose) { // homeless: sleeping bag / cardboard on the platform
      const g = new THREE.Group(), m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
      const card = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 2.0), m('#b89a6a')); card.position.y = 0.02; g.add(card);
      if (pose === 'lie') { const bag = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.55), m('#3a5f7a')); bag.position.set(0, 0.25, -0.2); g.add(bag); }
      this.prop = g; this.scene.add(g);
    }
    this.you = buildCharacter(youCfg); this.scene.add(this.you.root); this.you.root.visible = !think;
    if (think) { // thought bubbles drifting up from your head
      const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.25 });
      [[0.38, 2.05, 0.07], [0.58, 2.3, 0.11], [0.86, 2.62, 0.17]].forEach(([x, y, r]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), m); b.position.set(x, y, 0.2); g.add(b); });
      this.bubbles = g; this.scene.add(g);
    }
    $('talkBox').classList.toggle('think', think);
    if (bed) { // lying in your own bed (same colour duvet as the one at home)
      const [col, kind] = bed.split('|'), dbl = kind !== 'single', g = new THREE.Group(), m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
      const W2 = dbl ? 1.7 : 1.0, frame = new THREE.Mesh(new THREE.BoxGeometry(W2 + 0.1, 0.35, 2.2), m('#7a5230')); frame.position.y = 0.18; g.add(frame);
      const mat2 = new THREE.Mesh(new THREE.BoxGeometry(W2, 0.22, 2.05), m('#f2f2f2')); mat2.position.y = 0.46; g.add(mat2);
      const head = new THREE.Mesh(new THREE.BoxGeometry(W2 + 0.1, 0.9, 0.12), m('#7a5230')); head.position.set(0, 0.6, -1.1); g.add(head);
      const pil = new THREE.Mesh(new THREE.BoxGeometry(dbl ? 0.6 : 0.55, 0.14, 0.38), m('#ffffff')); pil.position.set(dbl ? -0.38 : 0, 0.64, -0.78); g.add(pil);
      if (dbl) { const p2 = pil.clone(); p2.position.x = 0.38; g.add(p2); }
      const duv = new THREE.Mesh(new THREE.BoxGeometry(W2 + 0.04, 0.3, 1.32), m(col)); duv.position.set(0, 0.73, 0.4); g.add(duv); this.duvet = duv;
      this.bedG = g; this.scene.add(g);
    }
    if (phone) for (const c of [this.npc, this.you]) { // phone pressed to the right ear, hand cupped round it
      const ph = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: '#16161b', roughness: 0.3 }));
      ph.position.set(0, -0.02, 0.06); ph.rotation.set(0, 0, 0); c.armR.hand.add(ph);
    }
    if (seat) { // car seat, dashboard and steering wheel
      const g = new THREE.Group(), m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
      const seatB = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.62), m('#2a2b30')); seatB.position.set(0, 0.47, -0.12); g.add(seatB);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 1.5), m('#1a1b20')); floor.position.set(0.15, 0.03, 0.45); g.add(floor);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 1.7), m(car?.color || '#8b1e3f')); door.position.set(-0.55, 0.55, 0.35); g.add(door);
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 1.7), m('#3a3d45')); sill.position.set(-0.55, 0.85, 0.35); g.add(sill);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.9, 0.16), m('#2a2b30')); back.position.set(0, 0.98, -0.46); back.rotation.x = -0.15; g.add(back);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.12), m('#2a2b30')); head.position.set(0, 1.58, -0.56); g.add(head);
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.5), m('#1a1b20')); dash.position.set(0.3, 0.82, 1.05); g.add(dash);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), m('#16161a')); col.position.set(0, 1.0, 0.8); col.rotation.x = 1.1; g.add(col);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 22), m('#16161a')); wheel.position.set(0, 1.08, 0.62); wheel.rotation.x = -0.5; g.add(wheel); this.wheel = wheel;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.03), m('#3a3d45')); wheel.add(spoke);
      this.seatG = g; this.scene.add(g);
    }
    if (car) { // inside a car: you at the wheel, them in the passenger seat, seen through the windscreen
      const g = new THREE.Group(), m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
      for (const sx of [0.45, -0.45]) {
        const sb = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.16, 0.62), m('#2a2b30')); sb.position.set(sx, 0.52, -0.05); g.add(sb);
        const bk = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.0, 0.16), m('#2a2b30')); bk.position.set(sx, 1.0, -0.42); bk.rotation.x = -0.12; g.add(bk);
        const hr = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.14), m('#2a2b30')); hr.position.set(sx, 1.66, -0.5); g.add(hr);
      }
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.45), m('#2b2d33')); dash.position.set(0, 0.62, 1.05); g.add(dash);
      const well = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.1), m('#22242a')); well.position.set(0, 0.26, 1.2); g.add(well);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), m('#16161a')); col.position.set(0.45, 0.85, 0.85); col.rotation.x = -1.1; g.add(col);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 22), m('#16161a')); wheel.position.set(0.45, 1.0, 0.62); wheel.rotation.x = 0.45; g.add(wheel); this.wheel = wheel;
      const body = car.color || '#30323a';
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 1.6), m(body)); roof.position.set(0, 2.05, 0.1); g.add(roof);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.12, 0.7), m(body)); hood.position.set(0, 0.76, 1.55); g.add(hood); // bonnet in your car's paint
      for (const sx of [-1.02, 1.02]) { const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 1.3), m(body)); door.position.set(sx, 0.7, 0.2); g.add(door); }
      if (car.trim) { const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.03, 0.46), m(car.trim)); stripe.position.set(0, 0.745, 1.05); g.add(stripe); }
      for (const sx of [-0.98, 0.98]) { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.15, 0.09), m(body)); pil.position.set(sx, 1.5, 1.05); pil.rotation.x = 0.35; g.add(pil); }
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.04), m('#16161a')); mirror.position.set(0, 1.86, 0.75); g.add(mirror);
      this.carG = g; this.scene.add(g);
    }
    for (const p of [this.pNpc, this.pYou]) p.g.visible = !car && !bed;
    for (const c of [this.npc, this.you]) c.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    $('talkName').textContent = name; $('talkTag').textContent = tag || '';
    $('talkText').textContent = ''; $('talkOpts').innerHTML = ''; $('talkOpts').classList.add('hidden');
    $('talkUI').classList.remove('hidden');
    const f = $('talkFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    sfx.whoosh();
  }
  clear() {
    for (const k of ['npc', 'you']) if (this[k]) { this.scene.remove(this[k].root); disposeObject(this[k].root); this[k] = null; }
    if (this.pet) { this.scene.remove(this.pet); this.pet = null; }
    if (this.prop) { this.scene.remove(this.prop); this.prop = null; }
    if (this.bubbles) { this.scene.remove(this.bubbles); this.bubbles = null; }
    if (this.seatG) { this.scene.remove(this.seatG); this.seatG = null; }
    if (this.carG) { this.scene.remove(this.carG); this.carG = null; }
    if (this.bedG) { this.scene.remove(this.bedG); this.bedG = null; }
  }
  // a little bit of acting: kiss, hug, hold hands, a hand on the knee
  act(kind, dur = 1.8) { this.actK = kind; this.actT = 0; this.actDur = dur; return new Promise(res => setTimeout(() => { this.actK = null; res(); }, dur * 1000)); }
  end() { this.active = false; this.clear(); $('talkUI').classList.add('hidden'); this._say = null; this._choose = null; }
  say(text, who = 'npc') {
    $('talkOpts').classList.add('hidden');
    const el = $('talkText'); el.textContent = ''; $('talkBox').classList.toggle('you', who === 'you');
    $('talkWho').textContent = who === 'you' ? 'You' : $('talkName').textContent;
    this.talking = who; let i = 0, done = false;
    return new Promise(res => {
      const typer = setInterval(() => {
        i += 1; el.textContent = text.slice(0, i);
        if (i % 2 === 0 && text[i - 1] !== ' ') { const A = audio(); if (A) sfx.note((who === 'you' ? 220 : this.blipPitch) * (0.9 + Math.random() * 0.25), A.currentTime, 0.05, 'square', 0.018, 2400); }
        if (i >= text.length) { clearInterval(typer); done = true; this.talking = null; $('talkMore').classList.remove('hidden'); }
      }, 26);
      $('talkMore').classList.add('hidden');
      this._say = () => {
        if (!done) { clearInterval(typer); el.textContent = text; done = true; this.talking = null; $('talkMore').classList.remove('hidden'); return; }
        this._say = null; $('talkMore').classList.add('hidden'); sfx.click(); res();
      };
    });
  }
  tap() { if (this._say) this._say(); }
  choose(options) {
    $('talkMore').classList.add('hidden');
    const box = $('talkOpts'); box.innerHTML = ''; box.classList.remove('hidden');
    box.classList.toggle('one', options.length === 1);
    return new Promise(res => {
      options.forEach((o, i) => {
        const b = document.createElement('button'); b.innerHTML = typeof o === 'string' ? o : o.label;
        { const t = document.createElement('span'); t.className = 't'; for (const n of [...b.childNodes]) if (!(n.nodeName === 'svg' || n.nodeName === 'SVG')) t.appendChild(n); b.appendChild(t); } // label + small detail stacked
        if (o.disabled) b.disabled = true;
        b.onpointerdown = e => { e.stopPropagation(); e.preventDefault(); sfx.click(); box.classList.add('hidden'); res(i); };
        box.appendChild(b);
      });
    });
  }
  update(dt) {
    if (!this.active) return;
    this.t += dt; this.intro = Math.min(1, (performance.now() - this.t0) / 500);
    const e = 1 - Math.pow(1 - this.intro, 3);
    const n = this.npc, y = this.you;
    this.pNpc.g.position.set(this.npcPos.x + (1 - e) * 6, 0, this.npcPos.z);
    this.pYou.g.position.set(this.youPos.x - (1 - e) * 6, 0, this.youPos.z);
    n.root.position.copy(this.pNpc.g.position); y.root.position.copy(this.pYou.g.position);
    if (this.pet) { this.pet.position.set(n.root.position.x + 0.75, Math.abs(Math.sin(this.t * 3)) * 0.04, n.root.position.z + 0.35); this.pet.rotation.y = Math.atan2(this.cam.position.x - this.pet.position.x, this.cam.position.z - this.pet.position.z) * 0.7; }
    n.root.rotation.y = Math.atan2(this.cam.position.x - n.root.position.x, this.cam.position.z - n.root.position.z) * 0.6 + Math.atan2(y.root.position.x - n.root.position.x, y.root.position.z - n.root.position.z) * 0.4;
    y.root.rotation.y = Math.atan2(n.root.position.x - y.root.position.x, n.root.position.z - y.root.position.z);
    for (const [c, who] of [[n, 'npc'], [y, 'you']]) {
      poseCharacter(c, { t: this.t + (who === 'you' ? 1 : 0), aim: -1.45, speed: 0 });
      if (c.armR.elbow) { c.armR.elbow.rotation.set(0, 0, 0); c.armL.elbow.rotation.set(0, 0, 0); }
      const talk = this.talking === who;
      c.head.rotation.x = talk ? Math.sin(this.t * 11) * 0.08 : Math.sin(this.t * 1.3) * 0.03;
      c.head.rotation.y = talk ? Math.sin(this.t * 3.1) * 0.1 : 0;
      const g = talk ? Math.sin(this.t * 4) * 0.25 : 0;
      c.armR.pivot.rotation.set(-0.15 - Math.max(0, g) * 1.4, 0, 0.12 + Math.max(0, g) * 0.3);
      c.armL.pivot.rotation.set(-0.1 + Math.min(0, g) * 1.2, 0, -0.12);
    }
    if (this.phone && n && y) for (const c of [n, y]) { c.armR.pivot.rotation.set(-0.85, 0.15, -0.42); c.armR.elbow.rotation.set(-2.6, 0, 0); c.head.rotation.z = -0.12; } // hand up at the ear holding the phone
    if (this.think && n) { // you, alone, hand on chin, mulling it over
      n.root.position.x = 0;
      if (this.bedG) { // tucked in, staring at the ceiling
        this.bedG.position.set(0, 0, -0.4); this.bedG.rotation.y = 0.5;
        n.root.rotation.order = 'YXZ'; n.root.rotation.set(-Math.PI / 2, 0.5, 0); const xo = this.bed.includes('single') ? 0 : -0.38; n.root.position.set(this.bedG.position.x + xo * Math.cos(0.5) + Math.sin(0.5) * 0.85, 0.66, this.bedG.position.z - xo * Math.sin(0.5) + Math.cos(0.5) * 0.85);
        n.armR.pivot.rotation.set(-0.5, 0, 0.5); n.armL.pivot.rotation.set(-0.5, 0, -0.5); n.head.rotation.x = 0; // arms on top of the covers n.head.rotation.y = Math.sin(this.t * 0.6) * 0.3;
        this.cam.position.set(0, 3.6, 3.4); this.cam.lookAt(0, 0.5, -0.4);
        if (this.duvet) this.duvet.scale.y = 1 + Math.sin(this.t * 1.6) * 0.04;
      } else if (this.seat && this.seatG) { // sat at the wheel, both hands on it, glancing down at the dash
        this.seatG.position.copy(n.root.position); this.seatG.rotation.y = -1.05;
        n.root.rotation.y = -1.05; this.sitIn(n, this.seatG);
        n.armR.pivot.rotation.set(-1.2, 0, 0.28); n.armL.pivot.rotation.set(-1.2, 0, -0.28); if (n.armR.elbow) { n.armR.elbow.rotation.set(-0.35, 0, 0); n.armL.elbow.rotation.set(-0.35, 0, 0); }
        n.head.rotation.x = 0.18 + Math.sin(this.t * 1.1) * 0.04; n.head.rotation.y = Math.sin(this.t * 0.7) * 0.25;
        if (this.wheel) this.wheel.rotation.z = Math.sin(this.t * 0.9) * 0.15;
      } else { // standing, hand on chin
        n.root.rotation.y = Math.sin(this.t * 0.5) * 0.15;
        n.armR.pivot.rotation.set(-2.05, 0, 0.55); n.armL.pivot.rotation.set(-0.15, 0, -0.1); n.head.rotation.x = 0.15 + Math.sin(this.t * 1.1) * 0.04; n.head.rotation.y = -0.2;
      }
      if (this.bubbles) { this.bubbles.position.set(n.root.position.x, n.root.position.y + (n.height ? n.height - 1.7 : 0), n.root.position.z); this.bubbles.children.forEach((b, i) => { b.position.y = [2.05, 2.3, 2.62][i] + Math.sin(this.t * 2 + i) * 0.04; }); }
    }
    if (this.seat && this.seatG && !this.think && y) { // you're sat in the driver's seat; whoever it is talks to you through the window
      const ry = y.root.rotation.y - Math.PI / 2;
      this.seatG.position.copy(y.root.position); this.seatG.rotation.y = ry;
      y.root.rotation.y = ry; this.sitIn(y, this.seatG);
      y.armL.pivot.rotation.set(-1.25, 0, -0.32); if (this.talking !== 'you') y.armR.pivot.rotation.set(-1.25, 0, 0.32);
      y.head.rotation.y = 1.35 + (this.talking === 'you' ? Math.sin(this.t * 3.1) * 0.1 : 0);
    }
    if (this.car && n && y) this.carPose(n, y);
    else if (this.actK && n && y) this.standAct(n, y);
    if (this.pose && n) {
      this.prop.position.copy(this.pNpc.g.position); this.prop.rotation.y = n.root.rotation.y;
      if (this.pose === 'lie') { // tucked into the sleeping bag on their side, head poking out the end, facing you
        n.root.rotation.order = 'YXZ'; n.root.rotation.set(0, 0, -Math.PI / 2 + 0.05); n.root.position.y += 0.14; n.root.position.x -= 0.85;
        this.prop.rotation.y = Math.PI / 2; n.head.rotation.set(0, 0, 0.2);
        n.legL.pivot.rotation.x = 0; n.legR.pivot.rotation.x = 0.1; n.armL.pivot.rotation.set(-0.3, 0, 0); n.armR.pivot.rotation.set(-0.5, 0, 0);
      }
      else { n.root.position.y -= 0.45 * (n.height || 1.7) / 1.7; n.legL.pivot.rotation.x = -1.45; n.legR.pivot.rotation.x = -1.4; n.legL.knee.rotation.x = 0.1; n.legR.knee.rotation.x = 0.1; n.root.position.y += 0.05; }
    }
  }
  carPose(n, y) {
    this.actT += 1 / 60; const k = this.actK ? Math.min(1, this.actT / 0.4, (this.actDur - this.actT) / 0.4) : 0, e = Math.max(0, k);
    this.cam.position.set(0, 1.85, 3.7); this.cam.lookAt(0, 1.05, 0);
    const sit = (c, x) => { c.root.position.set(x, -0.42, 0); c.root.rotation.set(0, 0, 0); c.legL.pivot.rotation.x = -1.45; c.legR.pivot.rotation.x = -1.45; c.legL.knee.rotation.x = 1.3; c.legR.knee.rotation.x = 1.3; };
    sit(y, 0.45); sit(n, -0.45);
    // at the wheel / hands in lap, heads turned to each other while you talk
    y.armL.pivot.rotation.set(-1.15, 0, -0.25); y.armR.pivot.rotation.set(-1.15, 0, 0.25);
    n.armL.pivot.rotation.set(-0.7, 0, -0.1); n.armR.pivot.rotation.set(-0.7, 0, 0.1);
    y.head.rotation.y = -0.55 + (this.talking === 'you' ? Math.sin(this.t * 3) * 0.08 : 0); n.head.rotation.y = 0.55 + (this.talking === 'npc' ? Math.sin(this.t * 3) * 0.08 : 0);
    if (this.wheel) this.wheel.rotation.z = Math.sin(this.t * 0.8) * 0.06;
    const K = this.actK;
    if (K === 'kiss') { y.root.rotation.z = 0.3 * e; n.root.rotation.z = -0.3 * e; y.head.rotation.y = -1.1 * e - 0.55 * (1 - e); n.head.rotation.y = 1.1 * e + 0.55 * (1 - e); y.armR.pivot.rotation.set(-1.3, 0, -0.6 * e + 0.25); }
    else if (K === 'hug') { y.root.rotation.z = 0.25 * e; n.root.rotation.z = -0.25 * e; y.armR.pivot.rotation.set(-1.5, 0, -1.2 * e); n.armL.pivot.rotation.set(-1.5, 0, 1.2 * e); }
    else if (K === 'knee') { y.armR.pivot.rotation.set(-0.75, 0, -0.75 * e + 0.25); y.root.rotation.z = 0.08 * e; }
    else if (K === 'hand') { y.armR.pivot.rotation.set(-0.8, 0, -0.55 * e); n.armL.pivot.rotation.set(-0.8, 0, 0.55 * e); }
  }
  standAct(n, y) {
    this.actT += 1 / 60; const e = Math.max(0, Math.min(1, this.actT / 0.45, (this.actDur - this.actT) / 0.45)), K = this.actK;
    // step in close, then do the thing
    const tx = n.root.position.x - 0.55, tz = n.root.position.z + 0.45;
    y.root.position.x += (tx - y.root.position.x) * e; y.root.position.z += (tz - y.root.position.z) * e;
    const a = Math.atan2(n.root.position.x - y.root.position.x, n.root.position.z - y.root.position.z); y.root.rotation.y = a;
    n.root.rotation.y = n.root.rotation.y * (1 - e) + (a + Math.PI) * e;
    if (K === 'kiss') { y.head.rotation.x = 0.25 * e; n.head.rotation.x = 0.25 * e; y.root.rotation.x = 0.12 * e; y.armR.pivot.rotation.set(-1.2 * e, 0, 0.3); y.armL.pivot.rotation.set(-1.2 * e, 0, -0.3); }
    else if (K === 'hug') { for (const c of [y, n]) { c.armR.pivot.rotation.set(-1.4 * e, 0, -0.9 * e); c.armL.pivot.rotation.set(-1.4 * e, 0, 0.9 * e); } }
    else if (K === 'hand') { y.armR.pivot.rotation.set(-0.6 * e, 0, 0); n.armR.pivot.rotation.set(-0.6 * e, 0, 0); }
  }
  // sit a character properly on the seat: hips on the cushion, thighs flat, shins down to the floor
  sitIn(c, seat) {
    const legLen = c.legLen || 0.86, top = 0.55;
    c.root.position.y = seat.position.y + top - legLen + 0.03;
    c.legL.pivot.rotation.set(-Math.PI / 2, 0, 0.04); c.legR.pivot.rotation.set(-Math.PI / 2, 0, -0.04);
    c.legL.knee.rotation.x = Math.PI / 2 - 0.1; c.legR.knee.rotation.x = Math.PI / 2 - 0.1;
    if (c.hips) c.hips.rotation.x = 0;
  }
  render(renderer) { renderer.render(this.scene, this.cam); }
}
