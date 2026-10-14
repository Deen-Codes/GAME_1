// Online play: see other players walking and driving around Bay City in real time.
// The server is a Cloudflare Worker at baycity.app: sign in with an emailed code / magic link, then a WebSocket to the shared world.
// A same-device BroadcastChannel transport ("?local" in the URL) lets two tabs see each other for testing.
import * as THREE from '../lib/three.module.min.js';

const API = (() => { const q = new URLSearchParams(location.search).get('api'); if (q && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(q)) return q; // (?api=http://localhost:8787 for local testing)
  return /(^|\.)baycity\.app$|\.workers\.dev$/.test(location.hostname) || (location.port === '8787') ? '' : 'https://baycity.app'; })();
let C = null, T = null, sendT = 0, seq = 0, want = false, retryT = null;
const peers = new Map(), listeners = new Set();
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} } };
let myId = Math.random().toString(36).slice(2, 10);
export const NET = { status: 'off', error: '', email: ls.get('bc_email') || '', get count() { return peers.size; }, get list() { return [...peers.values()].map(p => ({ id: p.id, name: p.name || 'Player', d: p.d ?? null, x: p.wx, z: p.wz, hidden: !!p.hidden })); }, configured: () => true, local: () => /[?&]local\b/.test(location.search) };
const emit = () => { for (const f of listeners) try { f(NET); } catch (e) {} };
export const onNet = f => { listeners.add(f); return () => listeners.delete(f); };
const api = async (path, body, sid) => { const r = await fetch(API + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(sid ? { authorization: 'Bearer ' + sid } : {}) }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `Server error (${r.status})`); return j; };

export function initOnline(ctx) {
  C = ctx;
  // arrived from the email's magic link: swap the token for a session, tidy the address bar, and go online
  const tok = new URLSearchParams(location.search).get('login');
  if (tok) { history.replaceState(null, '', location.pathname + location.search.replace(/([?&])login=[^&]*&?/, '$1').replace(/[?&]$/, '')); api('/api/verify', { token: tok }).then(j => { signedInAs(j); C.toast?.(`Signed in as ${j.email}`, 3); goOnline(); }).catch(e => { NET.error = e.message; emit(); C.toast?.(e.message, 3.5); }); }
  else if (signedIn() && ls.get('bc_online') === '1') goOnline();
}
function signedInAs(j) { ls.set('bc_sid', j.sid); ls.set('bc_email', j.email); NET.email = j.email; NET.error = ''; emit(); }
export async function sendMagicLink(email) { try { const j = await api('/api/login', { email }); return { ok: true, dev: j.dev }; } catch (e) { return { ok: false, error: e.message }; } }
export async function verifyCode(email, code) { try { const j = await api('/api/verify', { email, code }); signedInAs(j); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } }
export async function signOut() { goOffline(); const sid = ls.get('bc_sid'); if (sid) api('/api/logout', {}, sid).catch(() => {}); ls.set('bc_sid', null); ls.set('bc_email', null); ls.set('bc_admin', null); NET.email = ''; emit(); }
export const signedIn = () => !!ls.get('bc_sid');
export const isAdmin = () => signedIn() && ls.get('bc_admin') === '1';
export async function reviewLoad() { return api('/api/review'); }
export async function reviewSet(id, patch) { return api('/api/review', { id, ...patch }, ls.get('bc_sid')); }
export async function checkAdmin() { if (!signedIn()) { ls.set('bc_admin', null); return false; } try { const j = await api('/api/me', null, ls.get('bc_sid')); ls.set('bc_admin', j.admin ? '1' : null); return !!j.admin; } catch (e) { return isAdmin(); } }
// cloud save: the whole game (save, character, cars, guns, settings) kept against your account
export async function cloudList() { return api('/api/saves', null, ls.get('bc_sid')); }
export async function cloudLoad(slot) { return api('/api/save' + (slot ? '?slot=' + slot : ''), null, ls.get('bc_sid')); }
export async function cloudSave(data, summary, keepalive, slot) { const sid = ls.get('bc_sid'); if (!sid) return; const body = JSON.stringify({ data, summary });
  return fetch(API + '/api/save' + (slot ? '?slot=' + slot : ''), { method: 'POST', keepalive: !!keepalive && body.length < 60000, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + sid }, body }).then(r => r.ok).catch(() => false); }
export async function cloudDelete(slot) { const sid = ls.get('bc_sid'); const r = await fetch(API + '/api/save?slot=' + slot, { method: 'DELETE', headers: { authorization: 'Bearer ' + sid } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Could not delete'); return j; }

function wsTransport() {
  const url = (API ? API.replace(/^http/, 'ws') : location.origin.replace(/^http/, 'ws')) + '/api/ws?sid=' + ls.get('bc_sid');
  const ws = new WebSocket(url), T2 = { onMsg: null, send(type, data) { if (ws.readyState === 1) ws.send(JSON.stringify({ type, data })); }, close() { T2.closed = true; ws.close(); } };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } if (m.type === 'hello') { myId = m.data.id; NET.status = 'online'; NET.error = ''; emit(); return; } T2.onMsg?.(m.type, m.data); };
  ws.onclose = e => { if (T2.closed) return; for (const id of [...peers.keys()]) dropPeer(id); T = null; NET.status = want ? 'connecting' : 'off'; emit();
    if (e.code === 1008 || e.code === 4001) { NET.error = 'Sign in again'; want = false; emit(); return; }
    if (want) { clearTimeout(retryT); retryT = setTimeout(goOnline, 3000); } }; // dropped (tunnel, sleep): keep trying
  ws.onerror = () => { NET.error = navigator.onLine === false ? 'No internet' : 'Couldn\'t reach the server'; emit(); };
  return T2;
}
function localTransport() {
  const bc = new BroadcastChannel('bay-city-local');
  const T2 = { onMsg: null, send(type, data) { bc.postMessage({ type, data }); }, close() { bc.close(); } };
  bc.onmessage = e => T2.onMsg?.(e.data.type, e.data.data);
  setTimeout(() => { NET.status = 'online'; emit(); }, 50); return T2;
}

export async function goOnline() {
  if (T) return; NET.error = ''; want = true;
  if (NET.local()) T = localTransport();
  else { if (!signedIn()) { NET.error = 'Sign in first'; want = false; emit(); return; } NET.status = 'connecting'; emit();
    try { await api('/api/me', null, ls.get('bc_sid')); } catch (e) { if (/signed in/i.test(e.message)) { ls.set('bc_sid', null); NET.email = ''; NET.error = 'Your sign-in ran out. Sign in again.'; } else { NET.error = navigator.onLine === false ? 'No internet' : 'Couldn\'t reach the server'; clearTimeout(retryT); retryT = setTimeout(() => want && goOnline(), 5000); } NET.status = 'off'; emit(); return; }
    if (T || !want) return; T = wsTransport(); }
  T.onMsg = onMsg; ls.set('bc_online', '1'); sendT = 0; seq = 0; emit();
}
export function goOffline() { want = false; clearTimeout(retryT); if (!T) { NET.status = 'off'; emit(); return; } try { T.send('bye', { id: myId }); } catch (e) {} T.close(); T = null; NET.status = 'off'; for (const id of [...peers.keys()]) dropPeer(id); ls.set('bc_online', '0'); emit(); }
addEventListener('pagehide', () => { try { T?.send('bye', { id: myId }); } catch (e) {} });

// ---------------------------------------------------------------- peers
function nameTag(name) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.font = '900 30px system-ui'; const w = Math.min(240, x.measureText(name).width + 34);
  x.fillStyle = 'rgba(15,15,30,.72)'; x.beginPath(); x.roundRect((256 - w) / 2, 10, w, 44, 22); x.fill(); x.fillStyle = '#4cd964'; x.beginPath(); x.arc((256 - w) / 2 + 18, 32, 6, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, 128 + 8, 33);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(3.6, 0.9, 1); s.renderOrder = 10; return s;
}
function dropPeer(id) { const p = peers.get(id); if (!p) return; if (p.fig) C.dyn.remove(p.fig.root); if (p.car) C.dyn.remove(p.car.group); if (p.tag) C.dyn.remove(p.tag); peers.delete(id); emit(); }
function onMsg(type, d) {
  if (!d || d.id === myId) return;
  if (type === 'bye') { dropPeer(d.id); return; }
  if (type !== 'pos') return;
  let p = peers.get(d.id); if (!p) { p = { id: d.id, buf: [], phase: 0 }; peers.set(d.id, p); C.toast?.(`${d.n || 'A player'} is in town`, 2.5); emit(); }
  if (d.n && d.n !== p.name) { p.name = d.n; if (p.tag) C.dyn.remove(p.tag); p.tag = nameTag(p.name); C.dyn.add(p.tag); emit(); }
  if (d.cfg) { const k = JSON.stringify(d.cfg); if (k !== p.cfgK) { p.cfgK = k; if (p.fig) C.dyn.remove(p.fig.root); p.fig = C.buildCharacter(d.cfg); p.fig.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); C.dyn.add(p.fig.root); } }
  if (d.car !== undefined) { const k = d.car ? JSON.stringify(d.car) : ''; if (k !== p.carK) { p.carK = k; if (p.car) { C.dyn.remove(p.car.group); p.car = null; } if (d.car) { p.car = C.buildCar(d.car); C.dyn.add(p.car.group); } } }
  p.inCar = !!d.r; p.hidden = !!d.i; p.last = performance.now();
  p.buf.push({ t: performance.now(), x: d.x, y: d.y, z: d.z, f: d.f, s: d.s || 0 }); if (p.buf.length > 20) p.buf.shift();
}
const lerpA = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// called every frame from the game loop
export function updateOnline(dt) {
  if (!T) return;
  // send ~6 times a second; who you are (look, name, car) every couple of seconds so late joiners catch up
  sendT -= dt; if (sendT <= 0) { sendT = 1 / 6; seq++;
    const st = C.state(), full = seq % 12 === 1, r = st.ride;
    const msg = { id: myId, x: +st.x.toFixed(2), y: +(st.y || 0).toFixed(2), z: +st.z.toFixed(2), f: +st.face.toFixed(2), s: +st.speed.toFixed(1), r: r ? 1 : 0 };
    if (full || st.cfgChanged) { msg.n = C.myName(); msg.cfg = C.charCfg(); msg.car = r ? r.cfg : null; }
    else if (st.rideChanged) msg.car = r ? r.cfg : null;
    if (st.inside) msg.i = 1; T.send('pos', msg); }
  const now = performance.now(), delay = 170;
  for (const p of peers.values()) {
    if (now - (p.last || 0) > 12000) { dropPeer(p.id); continue; }
    if (!p.fig || p.buf.length === 0) continue;
    if (p.hidden) { p.fig.root.visible = false; if (p.car) p.car.group.visible = false; if (p.tag) p.tag.visible = false; continue; } // they've gone indoors
    // interpolate between the two snapshots around (now - delay)
    const tt = now - delay; let a = p.buf[0], b = p.buf[p.buf.length - 1];
    for (let i = 0; i < p.buf.length - 1; i++) if (p.buf[i].t <= tt && p.buf[i + 1].t >= tt) { a = p.buf[i]; b = p.buf[i + 1]; break; }
    const k = b.t > a.t ? Math.min(1, Math.max(0, (tt - a.t) / (b.t - a.t))) : 1;
    const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k, z = a.z + (b.z - a.z) * k, f = lerpA(a.f, b.f, k);
    p.d = Math.hypot(x - C.state().x, z - C.state().z); p.wx = x; p.wz = z;
    if (p.inCar && p.car) { p.fig.root.visible = false; p.car.group.visible = true; p.car.group.position.set(x, y, z); p.car.group.rotation.set(0, f, 0); }
    else { if (p.car) p.car.group.visible = false; p.fig.root.visible = true; p.fig.root.position.set(x, y, z); p.fig.root.rotation.set(0, f, 0);
      const sp = Math.min(1, (b.s || 0) / 6); p.phase += dt * (4 + sp * 8); C.poseCharacter(p.fig, { phase: p.phase, speed: sp, air: false, aim: 0, recoil: 0, t: now / 1000 });
      for (const A of [p.fig.armL, p.fig.armR]) { A.pivot.rotation.set(Math.sin(p.phase) * 0.5 * sp * (A === p.fig.armL ? 1 : -1), 0, 0); if (A.elbow) A.elbow.rotation.set(-0.3, 0, 0); } }
    if (p.tag) { p.tag.position.set(x, y + (p.inCar ? 2.6 : 2.5), z); p.tag.visible = p.d < 120; }
  }
}
