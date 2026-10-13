// Conversations staged like a Pokémon battle: they stand on a platform facing you,
// you see the back of your own head in the foreground, subtitles type out, you pick replies.
import * as THREE from '../lib/three.module.min.js';
import { buildCharacter, poseCharacter, disposeObject } from './character.js?v=12';
import { sfx, audio } from './audio.js?v=12';

const $ = id => document.getElementById(id);
const BG = {
  city: { sky: ['#7ec8f2', '#d9f0ff'], ground: ['#8d8a92', '#5d5b66'], plat: '#a9a5ad', rim: '#6b6873' },
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
      const W = new THREE.Color(wall), F = new THREE.Color(floor || '#555');
      const s = c => '#' + c.getHexString();
      BG.interior = { sky: [s(W.clone().multiplyScalar(0.7)), s(W)], ground: [s(F.clone().multiplyScalar(1.15)), s(F.clone().multiplyScalar(0.8))], plat: s(F.clone().lerp(new THREE.Color('#ffffff'), 0.25)), rim: s(F.clone().multiplyScalar(0.6)) };
      night = 0;
    }
    const b = BG[kind] || BG.city, sky = night > 0.5 ? NIGHT.sky : b.sky;
    const c = document.createElement('canvas'); c.width = 8; c.height = 512; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, sky[0]); g.addColorStop(0.5, sky[1]); g.addColorStop(0.5, b.ground[0]); g.addColorStop(1, b.ground[1]);
    x.fillStyle = g; x.fillRect(0, 0, 8, 512);
    if (night > 0.5) { x.fillStyle = 'rgba(0,0,30,.45)'; x.fillRect(0, 256, 8, 256); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (this.scene.background?.dispose) this.scene.background.dispose();
    this.scene.background = t;
    for (const p of [this.pNpc, this.pYou]) { p.top.material.color.set(b.plat); p.rim.material.color.set(b.rim); }
    this.hemi.intensity = night > 0.5 ? 0.8 : 1.3; this.sun.intensity = night > 0.5 ? 1 : 2; this.sun.color.set(night > 0.5 ? '#b0b8ff' : '#fff3e0');
  }
  begin({ npcCfg, youCfg, name, tag, pitch = 300, bg = 'city', night = 0, wall = null, floor = null }) {
    audio();
    this.clear();
    this.active = true; this.t = 0; this.intro = 0; this.t0 = performance.now(); this.blipPitch = pitch;
    this.background(wall ? 'interior' : bg, night, wall, floor);
    this.npc = buildCharacter(npcCfg); this.scene.add(this.npc.root);
    this.you = buildCharacter(youCfg); this.scene.add(this.you.root);
    for (const c of [this.npc, this.you]) c.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    $('talkName').textContent = name; $('talkTag').textContent = tag || '';
    $('talkText').textContent = ''; $('talkOpts').innerHTML = ''; $('talkOpts').classList.add('hidden');
    $('talkUI').classList.remove('hidden');
    const f = $('talkFlash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    sfx.whoosh();
  }
  clear() {
    for (const k of ['npc', 'you']) if (this[k]) { this.scene.remove(this[k].root); disposeObject(this[k].root); this[k] = null; }
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
  }
  render(renderer) { renderer.render(this.scene, this.cam); }
}
