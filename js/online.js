// Online play: see other testers walking and driving around Bay City in real time.
// Transport is Supabase Realtime (free tier) once js/config.js has the project URL + anon key;
// a same-device BroadcastChannel transport ("?local" in the URL) lets two tabs see each other for testing.
import * as THREE from '../lib/three.module.min.js';
import { SUPA } from './config.js?v=161';

let C = null, T = null, sb = null, session = null, sendT = 0, seq = 0;
const peers = new Map(), listeners = new Set();
const myId = (() => { try { let v = sessionStorage.getItem('bc_net_id'); if (!v) { v = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('bc_net_id', v); } return v; } catch (e) { return Math.random().toString(36).slice(2, 10); } })();
export const NET = { status: 'off', error: '', email: '', get count() { return peers.size; }, get list() { return [...peers.values()].map(p => ({ id: p.id, name: p.name || 'Player', d: p.d ?? null, x: p.wx, z: p.wz, hidden: !!p.hidden })); }, configured: () => !!(SUPA.url && SUPA.key), local: () => /[?&]local\b/.test(location.search) };
const emit = () => { for (const f of listeners) try { f(NET); } catch (e) {} };
export const onNet = f => { listeners.add(f); return () => listeners.delete(f); };

export function initOnline(ctx) { C = ctx; if (NET.configured()) loadSupa().then(() => { if (session && localStorage.getItem('bc_online') === '1') goOnline(); }).catch(() => {}); }

// ---------------------------------------------------------------- Supabase: login by magic link, realtime channel
async function loadSupa() {
  if (sb) return sb;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  sb = createClient(SUPA.url, SUPA.key, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'implicit' } });
  const { data } = await sb.auth.getSession(); session = data.session; NET.email = session?.user?.email || '';
  sb.auth.onAuthStateChange((_e, s) => { session = s; NET.email = s?.user?.email || ''; emit(); });
  emit(); return sb;
}
export async function sendMagicLink(email) {
  try { await loadSupa(); const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } }); if (error) throw error; return { ok: true }; }
  catch (e) { return { ok: false, error: e.message || String(e) }; }
}
export async function signOut() { goOffline(); if (sb) await sb.auth.signOut(); session = null; NET.email = ''; emit(); }
export const signedIn = () => !!session;

function supaTransport() {
  const ch = sb.channel('bay-city', { config: { broadcast: { self: false }, presence: { key: myId } } });
  const T2 = { onMsg: null, send(type, data) { ch.send({ type: 'broadcast', event: type, payload: data }); }, close() { sb.removeChannel(ch); } };
  ch.on('broadcast', { event: '*' }, m => T2.onMsg?.(m.event, m.payload));
  ch.on('presence', { event: 'leave' }, ({ key }) => dropPeer(key));
  ch.subscribe(st => { if (st === 'SUBSCRIBED') { ch.track({ id: myId, name: C.myName() }); NET.status = 'online'; emit(); } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') { NET.status = 'error'; NET.error = 'Could not reach the server'; emit(); } });
  return T2;
}
function localTransport() {
  const bc = new BroadcastChannel('bay-city-local');
  const T2 = { onMsg: null, send(type, data) { bc.postMessage({ type, data }); }, close() { bc.close(); } };
  bc.onmessage = e => T2.onMsg?.(e.data.type, e.data.data);
  setTimeout(() => { NET.status = 'online'; emit(); }, 50); return T2;
}

export async function goOnline() {
  if (T) return; NET.error = '';
  if (NET.local()) T = localTransport();
  else { if (!NET.configured()) { NET.error = 'Online isn\'t set up yet'; emit(); return; } await loadSupa(); if (!session) { NET.error = 'Sign in first'; emit(); return; } NET.status = 'connecting'; emit(); T = supaTransport(); }
  T.onMsg = onMsg; try { localStorage.setItem('bc_online', '1'); } catch (e) {} sendT = 0; seq = 0; emit();
}
export function goOffline() { if (!T) return; try { T.send('bye', { id: myId }); } catch (e) {} T.close(); T = null; NET.status = 'off'; for (const id of [...peers.keys()]) dropPeer(id); try { localStorage.setItem('bc_online', '0'); } catch (e) {} emit(); }
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
