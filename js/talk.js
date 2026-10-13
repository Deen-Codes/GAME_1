// Conversations staged like a Pokémon battle: they stand on a platform facing you,
// you see the back of your own head in the foreground, subtitles type out, you pick replies.
import * as THREE from '../lib/three.module.min.js';
import { buildCharacter, poseCharacter, disposeObject } from './character.js?v=57';
import { sfx, audio } from './audio.js?v=57';

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
  layout(W, H) {
    this.W = W; this.H = H;
    this.cam.aspect = W / H; this.cam.fov = W / H < 0.6 ? 52 : 40;
    this.cam.clearViewOffset(); this.cam.setViewOffset(W, H, 0, H * 0.1, W, H); this.cam.updateProjectionMatrix();
    const a = W / H, spread = Math.min(1, a / 0.46);
    this.npcPos = new THREE.Vector3(0.8 * spread, 0, -2.6);
    this.youPos = new THREE.Vector3(-0.62 * spread, 0, 1.75);
    this.cam.position.set(0, 2.3, 5.6); this.cam.lookAt(0.1, 1.05, -1.2);
  }
  background(kind, night, wall, floor) {
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
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (this.scene.background?.dispose) this.scene.background.dispose();
    this.scene.background = t;
    for (const p of [this.pNpc, this.pYou]) { p.top.material.color.set(b.plat); p.rim.material.color.set(b.rim); }
    this.hemi.intensity = N ? 0.8 : 1.3; this.sun.intensity = N ? 1 : 2; this.sun.color.set(N ? '#b0b8ff' : '#fff3e0');
  }
  begin({ npcCfg, youCfg, name, tag, pitch = 300, bg = 'city', night = 0, wall = null, floor = null, pet = null, pose = null, think = false, seat = false, phone = false }) {
    this.pose = pose; this.think = think; this.seat = seat; this.phone = phone;
    audio();
    this.clear();
    this.active = true; this.t = 0; this.intro = 0; this.t0 = performance.now(); this.blipPitch = pitch;
    this.background(wall ? 'interior' : bg, night, wall, floor);
    this.npc = buildCharacter(npcCfg); this.scene.add(this.npc.root);
    if (pet) { this.pet = pet; pet.scale.setScalar(1.15); this.scene.add(pet); }
    if (pose) { // homeless: sleeping bag / cardboard on the platform
      const g = new THREE.Group(), m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 });
      const card = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 2.0), m('#b89a6a')); card.position.y = 0.02; g.add(card);
      if (pose === 'lie') { const bag = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.42, 1.45), m('#3a5f7a')); bag.position.set(0, 0.21, 0.55); g.add(bag); }
      this.prop = g; this.scene.add(g);
    }
    this.you = buildCharacter(youCfg); this.scene.add(this.you.root); this.you.root.visible = !think;
    if (think) { // thought bubbles drifting up from your head
      const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.25 });
      [[0.38, 2.05, 0.07], [0.58, 2.3, 0.11], [0.86, 2.62, 0.17]].forEach(([x, y, r]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), m); b.position.set(x, y, 0.2); g.add(b); });
      this.bubbles = g; this.scene.add(g);
    }
    $('talkBox').classList.toggle('think', think);
    if (phone) for (const c of [this.npc, this.you]) { const ph = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.09), new THREE.MeshStandardMaterial({ color: '#16161b', roughness: 0.3 })); ph.position.set(0, -0.06, 0.05); (c.hand || c.armR.pivot).add(ph); }
    if (seat) { // car seat, dashboard and steering wheel
      const g = new THREE.Group(), m = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 });
      const seatB = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 0.7), m('#2a2b30')); seatB.position.set(0, 0.55, -0.1); g.add(seatB);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.95, 0.16), m('#2a2b30')); back.position.set(0, 1.05, -0.5); back.rotation.x = -0.15; g.add(back);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.14), m('#2a2b30')); head.position.set(0, 1.68, -0.58); g.add(head);
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.22, 0.45), m('#1a1b20')); dash.position.set(0, 0.86, 1.0); g.add(dash);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), m('#16161a')); col.position.set(0, 1.1, 0.68); col.rotation.x = 1.1; g.add(col);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 22), m('#16161a')); wheel.position.set(0, 1.22, 0.5); wheel.rotation.x = -0.45; g.add(wheel); this.wheel = wheel;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.03), m('#3a3d45')); wheel.add(spoke);
      this.seatG = g; this.scene.add(g);
    }
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
  }
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
      const talk = this.talking === who;
      c.head.rotation.x = talk ? Math.sin(this.t * 11) * 0.08 : Math.sin(this.t * 1.3) * 0.03;
      c.head.rotation.y = talk ? Math.sin(this.t * 3.1) * 0.1 : 0;
      const g = talk ? Math.sin(this.t * 4) * 0.25 : 0;
      c.armR.pivot.rotation.set(-0.15 - Math.max(0, g) * 1.4, 0, 0.12 + Math.max(0, g) * 0.3);
      c.armL.pivot.rotation.set(-0.1 + Math.min(0, g) * 1.2, 0, -0.12);
    }
    if (this.phone && n && y) for (const c of [n, y]) { c.armR.pivot.rotation.set(-2.65, 0, 0.55); c.head.rotation.z = -0.12; } // phone to the ear
    if (this.think && n) { // you, alone, hand on chin, mulling it over
      n.root.position.x = 0;
      if (this.seat && this.seatG) { // sat at the wheel, both hands on it, glancing down at the dash
        this.seatG.position.copy(n.root.position); this.seatG.rotation.y = -1.05;
        n.root.rotation.y = -1.05; n.root.position.y -= 0.42;
        n.legL.pivot.rotation.x = -1.45; n.legR.pivot.rotation.x = -1.45; n.legL.knee.rotation.x = 1.3; n.legR.knee.rotation.x = 1.3;
        n.armR.pivot.rotation.set(-1.25, 0, 0.32); n.armL.pivot.rotation.set(-1.25, 0, -0.32);
        n.head.rotation.x = 0.18 + Math.sin(this.t * 1.1) * 0.04; n.head.rotation.y = Math.sin(this.t * 0.7) * 0.25;
        if (this.wheel) this.wheel.rotation.z = Math.sin(this.t * 0.9) * 0.15;
      } else { // standing, hand on chin
        n.root.rotation.y = Math.sin(this.t * 0.5) * 0.15;
        n.armR.pivot.rotation.set(-2.05, 0, 0.55); n.armL.pivot.rotation.set(-0.15, 0, -0.1); n.head.rotation.x = 0.15 + Math.sin(this.t * 1.1) * 0.04; n.head.rotation.y = -0.2;
      }
      if (this.bubbles) { this.bubbles.position.set(n.root.position.x, n.root.position.y + (n.height ? n.height - 1.7 : 0), n.root.position.z); this.bubbles.children.forEach((b, i) => { b.position.y = [2.05, 2.3, 2.62][i] + Math.sin(this.t * 2 + i) * 0.04; }); }
    }
    if (this.pose && n) {
      this.prop.position.copy(this.pNpc.g.position); this.prop.rotation.y = n.root.rotation.y;
      if (this.pose === 'lie') { n.root.rotation.order = 'YXZ'; n.root.rotation.x = -1.35; n.root.position.y += 0.22; n.root.position.x -= 0.1; n.head.rotation.x = 0.9; }
      else { n.root.position.y -= 0.45 * (n.height || 1.7) / 1.7; n.legL.pivot.rotation.x = -1.45; n.legR.pivot.rotation.x = -1.4; n.legL.knee.rotation.x = 0.1; n.legR.knee.rotation.x = 0.1; n.root.position.y += 0.05; }
    }
  }
  render(renderer) { renderer.render(this.scene, this.cam); }
}
