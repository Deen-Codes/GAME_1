// Bay City server (Cloudflare Worker): serves the game, signs players in with an emailed magic link / 6-digit code,
// and runs the shared online world (one Durable Object: SQLite for logins, WebSockets for everyone in town).
import { DurableObject } from 'cloudflare:workers';

const ORIGINS = ['https://baycity.app', 'https://www.baycity.app', 'https://deen-codes.github.io'];
const okOrigin = o => !!o && (ORIGINS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o) || /\.workers\.dev$/.test(o));
const cors = req => { const o = req.headers.get('Origin'); return okOrigin(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', Vary: 'Origin' } : {}; };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.hostname === 'www.baycity.app') return Response.redirect('https://baycity.app' + url.pathname + url.search, 301);
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });
      const res = await env.HUB.get(env.HUB.idFromName('main')).fetch(req);
      if (res.status === 101) return res; // websocket
      const h = new Headers(res.headers); for (const [k, v] of Object.entries(cors(req))) h.set(k, v);
      return new Response(res.body, { status: res.status, headers: h });
    }
    return env.ASSETS.fetch(req);
  },
};

const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
const MIN = 60e3, DAY = 864e5;

export class Hub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS codes (email TEXT PRIMARY KEY, code TEXT, token TEXT, exp INTEGER, sent INTEGER, tries INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, email TEXT, exp INTEGER);
      CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, created INTEGER, seen INTEGER);
      CREATE TABLE IF NOT EXISTS sends (ip TEXT, t INTEGER);
      CREATE TABLE IF NOT EXISTS saves (email TEXT PRIMARY KEY, data TEXT, t INTEGER, summary TEXT);
      CREATE TABLE IF NOT EXISTS slots (email TEXT, slot INTEGER, data TEXT, t INTEGER, summary TEXT, PRIMARY KEY (email, slot));`);
  }
  one(q, ...a) { return this.sql.exec(q, ...a).toArray()[0] || null; }
  session(sid) { if (!sid || !/^[0-9a-f]{64}$/.test(sid)) return null; const s = this.one('SELECT * FROM sessions WHERE sid = ?', sid); return s && s.exp > Date.now() ? s : null; }

  async fetch(req) {
    const url = new URL(req.url), p = url.pathname, now = Date.now();
    try {
      if (p === '/api/ws') return this.ws(req, url);
      if (p === '/api/login' && req.method === 'POST') return await this.login(req, now);
      if (p === '/api/verify' && req.method === 'POST') return await this.verify(req, now);
      if (p === '/api/me') { const s = this.session((req.headers.get('authorization') || '').replace(/^Bearer /, '')); return s ? json({ email: s.email }) : json({ error: 'Not signed in' }, 401); }
      if (p === '/api/logout' && req.method === 'POST') { const sid = (req.headers.get('authorization') || '').replace(/^Bearer /, ''); this.sql.exec('DELETE FROM sessions WHERE sid = ?', sid); return json({ ok: true }); }
      if (p === '/api/save' || p === '/api/saves') return await this.saveApi(req, now, url);
      if (p === '/api/status') return json({ ok: true, online: this.ctx.getWebSockets().length });
      return json({ error: 'Not found' }, 404);
    } catch (e) { return json({ error: 'Server error' }, 500); }
  }

  // ---- cloud saves: a few save slots per account, so you carry on from any phone or computer (testers get lots, for trying new lives)
  async maxSlots(email) { const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email)))].map(b => b.toString(16).padStart(2, '0')).join(''); return (this.env.TESTERS || '').split(',').map(x => x.trim()).includes(h) ? 30 : 3; }
  async saveApi(req, now, url) {
    const s = this.session((req.headers.get('authorization') || '').replace(/^Bearer /, '')); if (!s) return json({ error: 'Not signed in' }, 401);
    const old = this.one('SELECT data, t, summary FROM saves WHERE email = ?', s.email); // the old one-save table becomes slot 1
    if (old) { this.sql.exec('INSERT OR IGNORE INTO slots (email, slot, data, t, summary) VALUES (?, 1, ?, ?, ?)', s.email, old.data, old.t, old.summary); this.sql.exec('DELETE FROM saves WHERE email = ?', s.email); }
    const max = await this.maxSlots(s.email), list = () => this.sql.exec('SELECT slot, t, summary FROM slots WHERE email = ? ORDER BY slot', s.email).toArray().map(r => ({ slot: r.slot, t: r.t, summary: JSON.parse(r.summary || '{}') }));
    if (url.pathname === '/api/saves') return json({ slots: list(), max });
    const latest = () => this.one('SELECT slot FROM slots WHERE email = ? ORDER BY t DESC LIMIT 1', s.email)?.slot;
    const q = url.searchParams.get('slot'), slot = q == null ? latest() : Math.floor(+q);
    if (q != null && !(slot >= 1 && slot <= max)) return json({ error: 'Bad slot' }, 400);
    if (req.method === 'GET') { const r = slot && this.one('SELECT data, t, summary FROM slots WHERE email = ? AND slot = ?', s.email, slot); return json(r ? { slot, data: JSON.parse(r.data), t: r.t, summary: JSON.parse(r.summary || '{}') } : { slot: slot || null, data: null }); }
    if (req.method === 'DELETE') { this.sql.exec('DELETE FROM slots WHERE email = ? AND slot = ?', s.email, slot); return json({ ok: true, slots: list(), max }); }
    if (req.method === 'POST') { const body = await req.text(); if (body.length > 1800000) return json({ error: 'Save too big' }, 413); let j; try { j = JSON.parse(body); } catch (e) { return json({ error: 'Bad save' }, 400); }
      if (!j || typeof j.data !== 'object') return json({ error: 'Bad save' }, 400);
      const sl = slot || 1, has = this.one('SELECT 1 AS x FROM slots WHERE email = ? AND slot = ?', s.email, sl);
      if (!has && list().length >= max) return json({ error: 'All your save slots are full' }, 403);
      this.sql.exec('INSERT OR REPLACE INTO slots (email, slot, data, t, summary) VALUES (?, ?, ?, ?, ?)', s.email, sl, JSON.stringify(j.data), now, JSON.stringify(j.summary || {})); return json({ ok: true, slot: sl, t: now }); }
    return json({ error: 'Not found' }, 404);
  }

  // ---- step 1: email in, a code + link out (rate limited per email and per IP)
  async login(req, now) {
    const body = await req.json().catch(() => ({})), email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return json({ error: 'That email doesn\'t look right' }, 400);
    const ip = req.headers.get('cf-connecting-ip') || 'local';
    this.sql.exec('DELETE FROM sends WHERE t < ?', now - 60 * MIN); this.sql.exec('DELETE FROM codes WHERE exp < ?', now); this.sql.exec('DELETE FROM sessions WHERE exp < ?', now);
    if ((this.one('SELECT COUNT(*) AS n FROM sends WHERE ip = ?', ip)?.n || 0) >= 8) return json({ error: 'Too many tries. Wait a bit and try again.' }, 429);
    const prev = this.one('SELECT sent FROM codes WHERE email = ?', email);
    if (prev && now - prev.sent < 40e3) return json({ error: 'We just sent one. Give it a moment, then check your inbox (and junk).' }, 429);
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000)), token = hex(24);
    this.sql.exec('INSERT OR REPLACE INTO codes (email, code, token, exp, sent, tries) VALUES (?, ?, ?, ?, ?, 0)', email, code, token, now + 15 * MIN, now);
    this.sql.exec('INSERT INTO sends (ip, t) VALUES (?, ?)', ip, now);
    const origin = req.headers.get('Origin'), base = okOrigin(origin) ? origin : 'https://baycity.app', link = `${base}/?login=${token}`;
    const msg = { to: email, from: { email: this.env.MAIL_ADDR || 'login@baycity.app', name: 'Bay City' }, subject: `Your Bay City code: ${code}`, html: mailHtml(code, link), text: `Your Bay City sign-in code is ${code}\n\nOr tap this link on your phone: ${link}\n\nIt works for 15 minutes. If you didn't ask for this, ignore it.` };
    if (this.env.EMAIL) { // Cloudflare's own email sending (Workers Paid)
      try { await this.env.EMAIL.send(msg); return json({ ok: true }); }
      catch (e) { console.log('email failed', e.code, e.message); if (!this.env.RESEND_KEY) { this.sql.exec('DELETE FROM codes WHERE email = ?', email); } if (!this.env.RESEND_KEY) return json({ error: e.code === 'E_RECIPIENT_SUPPRESSED' ? 'That address can\'t receive our emails' : 'Couldn\'t send the email. Try again in a minute.' }, 502); }
    }
    if (this.env.RESEND_KEY) { // fallback: Resend
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${this.env.RESEND_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: `Bay City <${msg.from.email}>`, to: [email], subject: msg.subject, html: msg.html, text: msg.text }) });
      if (!r.ok) { this.sql.exec('DELETE FROM codes WHERE email = ?', email); return json({ error: 'Couldn\'t send the email. Try again in a minute.' }, 502); }
      return json({ ok: true });
    }
    if (this.env.DEV === '1') return json({ ok: true, dev: { code, link } });
    this.sql.exec('DELETE FROM codes WHERE email = ?', email); return json({ error: 'Email isn\'t set up on the server yet' }, 503);
  }

  // ---- step 2: the link's token, or the email + 6-digit code, becomes a 60-day session
  async verify(req, now) {
    const body = await req.json().catch(() => ({}));
    let row = null;
    if (body.token && /^[0-9a-f]{48}$/.test(body.token)) row = this.one('SELECT * FROM codes WHERE token = ?', body.token);
    else if (body.email && body.code) {
      const email = String(body.email).trim().toLowerCase(); row = this.one('SELECT * FROM codes WHERE email = ?', email);
      if (row && String(body.code).trim() !== row.code) { this.sql.exec('UPDATE codes SET tries = tries + 1 WHERE email = ?', email); if (row.tries + 1 >= 5) this.sql.exec('DELETE FROM codes WHERE email = ?', email); return json({ error: 'Wrong code' }, 400); }
    }
    if (!row || row.exp < now) return json({ error: 'That code or link has expired. Ask for a new one.' }, 400);
    this.sql.exec('DELETE FROM codes WHERE email = ?', row.email);
    const sid = hex(32); this.sql.exec('INSERT INTO sessions (sid, email, exp) VALUES (?, ?, ?)', sid, row.email, now + 60 * DAY);
    this.sql.exec('INSERT INTO users (email, created, seen) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET seen = excluded.seen', row.email, now, now);
    return json({ sid, email: row.email });
  }

  // ---- the shared world: everyone signed in shares one room; the server stamps who sent what and passes it on
  ws(req, url) {
    if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'Expected a websocket' }, 426);
    const s = this.session(url.searchParams.get('sid')); if (!s) return json({ error: 'Not signed in' }, 401);
    const pair = new WebSocketPair(), [client, server] = Object.values(pair), id = hex(4);
    this.ctx.acceptWebSocket(server); server.serializeAttachment({ id, email: s.email, t: 0, n: 0 });
    server.send(JSON.stringify({ type: 'hello', data: { id, online: this.ctx.getWebSockets().length - 1 } }));
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > 6000) return;
    const a = ws.deserializeAttachment(), now = Date.now(); if (now - a.t > 1000) { a.t = now; a.n = 0; } if (++a.n > 20) return; ws.serializeAttachment(a); // max 20 messages a second each
    let m; try { m = JSON.parse(msg); } catch (e) { return; }
    if (!m || typeof m.type !== 'string' || m.type.length > 16 || typeof m.data !== 'object' || !m.data) return;
    if (m.type === 'ping') { ws.send('{"type":"pong","data":{}}'); return; }
    const out = JSON.stringify({ type: m.type, data: { ...m.data, id: a.id } });
    for (const o of this.ctx.getWebSockets()) if (o !== ws) try { o.send(out); } catch (e) {}
  }
  webSocketClose(ws) { this.bye(ws); }
  webSocketError(ws) { this.bye(ws); }
  bye(ws) { const a = ws.deserializeAttachment(); if (!a) return; const out = JSON.stringify({ type: 'bye', data: { id: a.id } }); for (const o of this.ctx.getWebSockets()) if (o !== ws) try { o.send(out); } catch (e) {} }
}

function mailHtml(code, link) {
  return `<!doctype html><html><body style="margin:0;background:#120f24;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#120f24;padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:linear-gradient(160deg,#ff8a5c,#c4467a 55%,#5b2a86);border-radius:22px;padding:28px 24px;color:#fff">
<tr><td style="font-size:26px;font-weight:900;letter-spacing:.5px">BAY CITY</td></tr>
<tr><td style="padding:14px 0 6px;font-size:16px;opacity:.95">Here's your sign-in code:</td></tr>
<tr><td style="padding:6px 0 18px"><div style="display:inline-block;background:rgba(0,0,0,.28);border-radius:14px;padding:12px 18px;font-size:34px;font-weight:900;letter-spacing:8px">${code}</div></td></tr>
<tr><td style="padding-bottom:18px;font-size:15px;opacity:.95">Type it into the game, or tap the button on the phone you play on:</td></tr>
<tr><td><a href="${link}" style="display:inline-block;background:#fff;color:#c4467a;text-decoration:none;font-weight:900;font-size:16px;padding:13px 22px;border-radius:999px">Sign in to Bay City</a></td></tr>
<tr><td style="padding-top:20px;font-size:12px;opacity:.8">Works for 15 minutes. Didn't ask for this? Just ignore it.</td></tr>
</table></td></tr></table></body></html>`;
}
