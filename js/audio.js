// All sound is synthesised live with WebAudio, so there are no audio files to download.
let A = null, master = null;
export function audio() {
  if (!A) {
    try { A = new (window.AudioContext || window.webkitAudioContext)(); master = A.createGain(); master.gain.value = 0.9; master.connect(A.destination); } catch { return null; }
  }
  if (A.state === 'suspended') A.resume();
  return A;
}
const out = () => master;
function noiseBuf(sec = 2) {
  const b = A.createBuffer(1, Math.floor(A.sampleRate * sec), A.sampleRate), d = b.getChannelData(0);
  let last = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = w * 0.6 + last * 3; }
  return b;
}
let NB = null;
function burst(dur, freq, type, gain, q = 1) {
  const s = A.createBufferSource(); s.buffer = NB || (NB = noiseBuf()); const f = A.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = A.createGain(); const t = A.currentTime; g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(out()); s.start(t); s.stop(t + dur + 0.05);
}
function tone(freq, dur, type = 'sine', gain = 0.1, when = 0, slideTo = null) {
  const o = A.createOscillator(), g = A.createGain(), t = A.currentTime + when;
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(out()); o.start(t); o.stop(t + dur + 0.05);
}
export const sfx = {
  shot(quiet, energy) { if (!audio()) return; if (energy) tone(900, 0.15, 'sawtooth', 0.05, 0, 120); else burst(0.13, quiet ? 900 : 2600, 'lowpass', quiet ? 0.07 : 0.2); },
  horn() { if (!audio()) return; tone(392, 0.36, 'square', 0.05); tone(494, 0.36, 'square', 0.05); },
  coin() { if (!audio()) return; tone(988, 0.08, 'square', 0.05); tone(1319, 0.18, 'square', 0.05, 0.07); },
  cash() { if (!audio()) return; [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'triangle', 0.07, i * 0.06)); },
  fail() { if (!audio()) return; tone(300, 0.25, 'sawtooth', 0.06, 0, 120); },
  click() { if (!audio()) return; tone(1400, 0.03, 'square', 0.03); },
  smash() { if (!audio()) return; burst(0.35, 4000, 'highpass', 0.25); for (let i = 0; i < 5; i++) tone(2000 + Math.random() * 3000, 0.08, 'triangle', 0.03, Math.random() * 0.2); },
  crack() { if (!audio()) return; burst(0.08, 3000, 'bandpass', 0.18, 3); },
  spark() { if (!audio()) return; burst(0.12, 6000, 'highpass', 0.1); },
  engineStart() { if (!audio()) return; tone(60, 0.5, 'sawtooth', 0.08, 0, 140); },
  thud() { if (!audio()) return; tone(90, 0.2, 'sine', 0.2, 0, 40); burst(0.1, 400, 'lowpass', 0.15); },
  boom() { if (!audio()) return; burst(1.1, 500, 'lowpass', 0.6); tone(70, 0.8, 'sine', 0.35, 0, 30); burst(0.3, 3000, 'highpass', 0.12); },
  whoosh() { if (!audio()) return; burst(0.18, 900, 'bandpass', 0.12, 1.5); },
  punch() { if (!audio()) return; tone(120, 0.12, 'sine', 0.25, 0, 50); burst(0.06, 1500, 'lowpass', 0.2); },
  launch() { if (!audio()) return; burst(0.6, 1200, 'bandpass', 0.25, 0.6); tone(200, 0.4, 'sawtooth', 0.04, 0, 80); },
  equip() { if (!audio()) return; tone(1800, 0.03, 'square', 0.025); tone(900, 0.05, 'square', 0.025, 0.04); },
  splash() { if (!audio()) return; burst(0.5, 1200, 'bandpass', 0.15, 0.7); },
  kick(t, g = 0.5) { const o = A.createOscillator(), gg = A.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); gg.gain.setValueAtTime(g, t); gg.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(gg); gg.connect(out()); o.start(t); o.stop(t + 0.32); },
  hat(t, g = 0.05) { const s = A.createBufferSource(); s.buffer = NB || (NB = noiseBuf()); const f = A.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; const gg = A.createGain(); gg.gain.setValueAtTime(g, t); gg.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.connect(f); f.connect(gg); gg.connect(out()); s.start(t, Math.random()); s.stop(t + 0.06); },
  snare(t, g = 0.15) { const s = A.createBufferSource(); s.buffer = NB || (NB = noiseBuf()); const f = A.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; const gg = A.createGain(); gg.gain.setValueAtTime(g, t); gg.gain.exponentialRampToValueAtTime(0.001, t + 0.15); s.connect(f); f.connect(gg); gg.connect(out()); s.start(t, Math.random()); s.stop(t + 0.16); },
  note(freq, t, dur, type = 'triangle', g = 0.06, cutoff = 1800) { const o = A.createOscillator(), f = A.createBiquadFilter(), gg = A.createGain(); o.type = type; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = cutoff; gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(g, t + 0.02); gg.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(f); f.connect(gg); gg.connect(out()); o.start(t); o.stop(t + dur + 0.05); },
};

// ---------------- engine hum
let eng = null;
export function engine(on, speed) {
  if (!A) return;
  if (!eng) { const o = A.createOscillator(), o2 = A.createOscillator(), f = A.createBiquadFilter(), g = A.createGain(); o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 420; o.connect(f); o2.connect(f); f.connect(g); g.connect(out()); g.gain.value = 0; o.start(); o2.start(); eng = { o, o2, g }; }
  eng.o.frequency.value = 38 + speed * 3; eng.o2.frequency.value = 19 + speed * 1.5;
  eng.g.gain.value = on ? 0.022 : 0;
}

// ---------------- ambience: city hum, waves, birds by day, crickets at night
let amb = null;
export function ambience(mix) { // mix: { city, waves, birds, crickets } 0..1
  if (!A) return;
  if (!amb) {
    const mk = (type, freq, q) => { const s = A.createBufferSource(); s.buffer = noiseBuf(4); s.loop = true; const f = A.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = A.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(out()); s.start(); return { g, f }; };
    amb = { city: mk('lowpass', 300, 0.5), waves: mk('bandpass', 700, 0.4), t: 0, nextBird: 0, nextCricket: 0 };
  }
  const t = A.currentTime;
  amb.city.g.gain.setTargetAtTime(mix.city * 0.05, t, 0.5);
  const swell = 0.5 + 0.5 * Math.sin(t * 0.9) * Math.sin(t * 0.37);
  amb.waves.g.gain.setTargetAtTime(mix.waves * (0.03 + swell * 0.06), t, 0.3);
  if (mix.birds > 0.1 && t > amb.nextBird) { amb.nextBird = t + 4 + Math.random() * 9; // occasional, quiet birdsong
 const f = 2200 + Math.random() * 1800; for (let i = 0; i < 2 + Math.random() * 3; i++) tone(f + Math.random() * 400, 0.07, 'sine', 0.0035 * mix.birds, i * 0.09, f * 1.3); }
  if (mix.crickets > 0.1 && t > amb.nextCricket) { amb.nextCricket = t + 0.35 + Math.random() * 0.5; for (let i = 0; i < 3; i++) tone(4300, 0.03, 'sine', 0.008 * mix.crickets, i * 0.05); }
}

// ---------------- car radio: ten stations of original, procedurally composed songs (10 per station), plus a talk-show DJ
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let rbus = null;
const bus = () => { if (!rbus) { rbus = A.createGain(); rbus.gain.value = 0.85; rbus.connect(master); } return rbus; };
function env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function rn(freq, t, dur, type = 'triangle', g = 0.05, cut = 2000, att = 0.008, detune = 0) {
  const o = A.createOscillator(), f = A.createBiquadFilter(), gg = A.createGain(); o.type = type; o.frequency.value = freq; o.detune.value = detune; f.type = 'lowpass'; f.frequency.value = cut;
  env(gg, t, att, dur, g); o.connect(f); f.connect(gg); gg.connect(bus()); o.start(t); o.stop(t + att + dur + 0.05);
}
function rslide(f0, f1, t, dur, g) { const o = A.createOscillator(), gg = A.createGain(), sh = A.createWaveShaper(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + Math.min(0.12, dur * 0.4)); const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 2.2); } sh.curve = c; env(gg, t, 0.01, dur, g); o.connect(sh); sh.connect(gg); gg.connect(bus()); o.start(t); o.stop(t + dur + 0.1); }
function rnoise(t, dur, type, freq, g, q = 1) { const s = A.createBufferSource(); s.buffer = NB || (NB = noiseBuf()); const f = A.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const gg = A.createGain(); env(gg, t, 0.002, dur, g); s.connect(f); f.connect(gg); gg.connect(bus()); s.start(t, Math.random()); s.stop(t + dur + 0.05); }
const D = {
  kick(t, g = 0.5, low = 45) { const o = A.createOscillator(), gg = A.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(low, t + 0.11); env(gg, t, 0.002, 0.28, g); o.connect(gg); gg.connect(bus()); o.start(t); o.stop(t + 0.35); },
  snare(t, g = 0.14) { rnoise(t, 0.16, 'bandpass', 1900, g, 0.8); rn(190, t, 0.08, 'triangle', g * 0.5, 3000, 0.002); },
  clap(t, g = 0.12) { for (let i = 0; i < 3; i++) rnoise(t + i * 0.011, 0.09, 'bandpass', 1500, g, 1.2); },
  hat(t, g = 0.03, open) { rnoise(t, open ? 0.22 : 0.04, 'highpass', 7500, g); },
  crash(t, g = 0.05) { rnoise(t, 1.4, 'highpass', 5000, g); },
  rim(t, g = 0.05) { rn(1700, t, 0.03, 'square', g, 4000, 0.001); },
};
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
function seeded(seed) { let s = seed % 2147483646 + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const PROGS = { maj: [[0, 4, 5, 3], [0, 5, 3, 4], [5, 3, 0, 4], [0, 3, 4, 3], [3, 4, 0, 5], [0, 2, 3, 4]], min: [[0, 5, 2, 6], [0, 3, 4, 0], [0, 6, 5, 6], [0, 5, 3, 4], [0, 3, 6, 5], [5, 6, 0, 0]] };
// station styles: tempo range, scale, and how the drums/bass/chords/lead play
const ST = {
  chill: { bpm: [80, 92], minor: 0.5, words: ['Sunset', 'Golden', 'Tide', 'Palms', 'Haze', 'Drift', 'Coast', 'Amber', 'Slow', 'Pier'], words2: ['Hour', 'Days', 'Line', 'Drive', 'Light', 'Lull', 'Glow', 'Waves'], artists: ['Kai Moreno', 'Low Sun', 'The Palisades', 'Juno Bay', 'Marlo', 'Velvet Coast', 'Ines Arc', 'Pacific Room', 'Sol Ramos', 'Haven'] },
  bounce: { bpm: [88, 100], minor: 0.7, words: ['Westside', 'Block', 'Corner', 'Hood', 'Pocket', 'Lowrider', 'Crown', 'Cash', 'Gold', 'Late'], words2: ['Bounce', 'Rules', 'Talk', 'Ride', 'Dreams', 'Money', 'Season', 'Shine'], artists: ['Big Dex', 'Lil Marcus', 'Shorty Vee', 'OG Malik', 'Trey Bay', 'Kid Ramses', 'Nova Jones', 'Ace Royale', 'J-Lo-Key', 'Mo Saint'] },
  synth: { bpm: [108, 122], minor: 0.6, words: ['Neon', 'Night', 'Chrome', 'Laser', 'Midnight', 'Pulse', 'Grid', 'Electric', 'Turbo', 'Velvet'], words2: ['Runner', 'Highway', 'Heart', 'Signal', 'City', 'Rain', 'Mirage', 'Memory'], artists: ['Vector Hart', 'Neon Kiss', 'Datastream', 'Lazerfox', 'Miami 86', 'Crystal Drive', 'Night Racer', 'Holo', 'Synthia', 'Polygon'] },
  dnb: { bpm: [172, 176], minor: 0.9, words: ['Jungle', 'Bass', 'Sub', 'Rush', 'Liquid', 'Dark', 'Rinse', 'Rollers', 'Amen', 'Pressure'], words2: ['Science', 'Theory', 'Riot', 'Gravity', 'Motion', 'Tunnel', 'Fever', 'Warning'], artists: ['Subterra', 'MC Voltage', 'Kinetik', 'Dread Circuit', 'Low Orbit', 'Breakline', 'Tessera', 'Phantom Unit', 'Rivet', 'Ozone'] },
  classical: { bpm: [64, 96], minor: 0.45, words: ['Nocturne', 'Sonata', 'Prelude', 'Étude', 'Waltz', 'Serenade', 'Fugue', 'Adagio', 'Romance', 'Aria'], words2: ['in A', 'in D minor', 'No. 3', 'for Strings', 'of the Bay', 'in E flat', 'No. 7', 'in G'], artists: ['E. Vasquez-Lind', 'Bay Chamber Orchestra', 'A. Marchetti', 'Quartet Pacifica', 'H. Okonkwo', 'L. Bellweather', 'The Harbour Strings', 'R. Castellane', 'M. Ilyin', 'Golden Gate Philharmonic'] },
  rock: { bpm: [118, 148], minor: 0.55, words: ['Highway', 'Broken', 'Thunder', 'Wild', 'Static', 'Gasoline', 'Rebel', 'Iron', 'Burning', 'Loud'], words2: ['Hearts', 'Roads', 'Nation', 'Fire', 'Sky', 'Summer', 'Machine', 'Youth'], artists: ['The Rust Kings', 'Faultline', 'Riot Season', 'Dead Freeway', 'Crimson Avenue', 'Paper Wolves', 'Blacktop', 'The Undertow', 'Saint Static', 'Overpass'] },
  vibes: { bpm: [72, 88], minor: 0.6, words: ['Late', 'Slow', 'Silk', 'Honey', 'Moonlit', 'Soft', 'After', 'Blue', 'Velvet', 'Rose'], words2: ['Vibes', 'Feelings', 'Love', 'Hours', 'Talk', 'Motion', 'Dreams', 'Touch'], artists: ['Amara', 'Deja Rae', 'Silk & Smoke', 'Jaylen Rose', 'Nia Blue', 'Theo Vance', 'Mila Monroe', 'Kairo', 'Lux', 'Sienna'] },
  dancehall: { bpm: [92, 102], minor: 0.7, words: ['Yard', 'Island', 'Badman', 'Gyal', 'Sun', 'Riddim', 'Wine', 'Fire', 'Bashment', 'Tropical'], words2: ['Tune', 'Vibes', 'Ting', 'Hype', 'Ready', 'Bounce', 'Shelly', 'Nice'], artists: ['Ranking Tidal', 'Queen Marla J', 'Coastline Crew', 'Selecta Benji', 'Dutty Breeze', 'Junior Palms', 'Lady Kemi', 'Mr Sunshine', 'Bigga Tunes', 'Yard Prince'] },
  drill: { bpm: [140, 144], minor: 1, words: ['Opps', 'Block', 'Paper', 'Night', 'Ends', 'Smoke', 'Mask', 'Real', 'Cold', 'Late'], words2: ['Talk', 'Movement', 'Trap', 'Drill', 'Ride', 'Steppin', 'Season', 'Pressure'], artists: ['K-Rook', 'Smokey Lane', 'Digga J', 'Lil Ends', 'Tizzy B', 'Rizzo Nine', 'Kxng Riz', 'M-Twenty', 'Squeeze', 'Bandz'] },
  pop: { bpm: [114, 126], minor: 0.3, words: ['Summer', 'Golden', 'Starlight', 'Crazy', 'Sugar', 'Electric', 'Forever', 'Paper', 'Cherry', 'Midnight'], words2: ['Love', 'Kiss', 'Heart', 'Party', 'Dance', 'Magic', 'Feeling', 'Crush'], artists: ['Kaylee Star', 'The Weekdays', 'Bella Ray', 'Nova', 'Jace Rivers', 'Lyra', 'Zara Bloom', 'Cam & the Comets', 'Maddie May', 'Rio Blue'] },
};
function makeSongs(style, base) {
  const S = ST[style], out = [];
  for (let k = 0; k < 10; k++) {
    const r = seeded(base * 97 + k * 7919 + 13), minor = r() < S.minor, scale = minor ? MIN : MAJ;
    const prog = (minor ? PROGS.min : PROGS.maj)[Math.floor(r() * 6)], bpm = Math.round(S.bpm[0] + r() * (S.bpm[1] - S.bpm[0]));
    const motif = Array.from({ length: 16 }, (_, i) => (r() < (i % 4 === 0 ? 0.75 : 0.35) ? Math.floor(r() * 7) - 1 : null));
    const hook = Array.from({ length: 16 }, (_, i) => (r() < (i % 2 === 0 ? 0.7 : 0.3) ? Math.floor(r() * 8) : null));
    const title = `${S.words[Math.floor(r() * S.words.length)]} ${S.words2[Math.floor(r() * S.words2.length)]}`;
    out.push({ title, artist: S.artists[k], style, bpm, root: 45 + Math.floor(r() * 8), scale, prog, motif, hook, bars: 36 + Math.floor(r() * 4) * 4, vari: r(), kickVar: Math.floor(r() * 3) });
  }
  return out;
}
export const STATIONS = [
  { name: 'Bay FM 101.1 — Sunset Chill', style: 'chill' },
  { name: 'Westside 96.3 — Hip-Hop Bounce', style: 'bounce' },
  { name: 'Neon 88 — Synthwave', style: 'synth' },
  { name: 'Jungle 174 — Drum & Bass', style: 'dnb' },
  { name: 'Classic Bay 90.5 — Classical', style: 'classical' },
  { name: 'Rock 104.7 — The Rock', style: 'rock' },
  { name: 'Vibes 99.9 — R&B with DJ Sunny', style: 'vibes', talk: true },
  { name: 'Yard 92.5 — Dancehall', style: 'dancehall' },
  { name: 'Ends 140 — UK Drill', style: 'drill' },
  { name: 'Hits 102.3 — Pop', style: 'pop' },
  { name: 'Radio off', style: 'off' },
];
STATIONS.forEach((s, i) => { if (s.style !== 'off') { s.songs = makeSongs(s.style, i + 1); s.order = []; } });
let radio = { on: false, station: 0, next: 0, step: 0, song: null, talking: 0, talkEnd: 0 };
let songCb = null; export function onSong(fn) { songCb = fn; }
export function nowPlaying() { return radio.song; }
export function radioStation() { return STATIONS[radio.station]; }
function stopTalk() { try { speechSynthesis?.cancel(); } catch (_) {} radio.talking = 0; }
export function radioNext() { return radioSet((radio.station + 1) % STATIONS.length); }
// every station keeps "broadcasting" while you're tuned elsewhere: tuning in drops you mid-song, like real radio
function songLen(S) { return S.bars * 16 * 60 / S.bpm / 4; }
function tuneIn(st) {
  const now = A ? A.currentTime : 0, wall = performance.now() / 1000;
  if (st.live && wall - st.live.wall0 < songLen(st.live.song) - 2) { // still the same song, carry on where it'd be
    radio.song = st.live.song; radio.step = Math.floor((wall - st.live.wall0) / (60 / radio.song.bpm / 4));
  } else { // pick a song and land somewhere in it (sometimes the start, sometimes the very end)
    const s = nextSong(st), r = Math.random(), frac = r < 0.2 ? 0 : r < 0.3 ? 0.9 : Math.random() * 0.85;
    radio.song = s; radio.step = Math.floor(s.bars * 16 * frac) & ~15; st.live = { song: s, wall0: wall - radio.step * 60 / s.bpm / 4 };
  }
  radio.hadSong = true; radio.next = now + 0.1;
  if (radio.step < 32 && Math.random() < 0.5) setTimeout(() => hostOver(st, radio.song, 'intro'), 900);
  else if (Math.random() < 0.18) setTimeout(() => hostOver(st, radio.song, 'ident'), 1500);
}
export function radioSet(i) { stopTalk(); radio.station = i; radio.step = 0; radio.song = null; radio.tuned = false; if (A) radio.next = A.currentTime + 0.1; return STATIONS[i]; }
export function radioIndex() { return radio.station; }
export function setMuted(m) { audio(); if (master) master.gain.value = m ? 0 : 0.9; }
export function radioOn(on) { radio.on = on; if (!on) stopTalk(); if (on) radio.tuned = false; if (on && A) radio.next = Math.max(radio.next, A.currentTime + 0.1); if (rbus && A) rbus.gain.setTargetAtTime(on ? 0.85 : 0, A.currentTime, 0.05); }
// ---------------- DJs: each station has its own host, voice and patter
const DJ = {
  chill: { name: 'Mellow Mike', rate: 0.88, pitch: 0.85, uk: false, male: true, ident: ['Bay FM, one oh one point one. Sunset Chill.', 'Just breathe. You\'re listening to Bay FM.'], lines: ['Mellow Mike here, easing you into the evening.', 'Windows down, sun going down. Perfect.', 'Take it slow out there, Bay City.'] },
  bounce: { name: 'DJ Krazy K', rate: 1.2, pitch: 1.0, uk: false, male: true, ident: ['Westside ninety-six three! Let\'s GO!', 'Krazy K on the ones and twos, Westside!'], lines: ['Westside, make some noise!', 'This one\'s going out to everybody on the block tonight!', 'Turn it UP, Bay City!'] },
  synth: { name: 'Synthia', rate: 0.95, pitch: 1.35, uk: false, male: false, ident: ['Neon eighty-eight. The future was yesterday.', 'You are tuned to Neon eighty-eight.'], lines: ['Drive into the night with Synthia.', 'Neon lights, empty highways. This is your soundtrack.', 'Chrome dreams on Neon eighty-eight.'] },
  dnb: { name: 'MC Rinse', rate: 1.3, pitch: 0.95, uk: true, male: true, ident: ['Jungle one seven four, big up yourself!', 'MC Rinse in the place, Jungle one seven four!'], lines: ['Pull up, pull up! Rewind that one!', 'Big shout to all the junglists in Bay City, you know who you are!', 'Bass heavy, all night long, Jungle one seven four!'] },
  classical: { name: 'Margaret Ashby', rate: 0.85, pitch: 0.95, uk: true, male: false, ident: ['You are listening to Classic Bay, ninety point five.', 'Classic Bay. Timeless music, for a busy city.'], lines: ['Good evening. Margaret Ashby with you on Classic Bay.', 'A gentle piece now, perfect for unwinding.', 'Composed over two hundred years ago, and still as moving today.'] },
  rock: { name: 'Big Dave', rate: 1.0, pitch: 0.7, uk: false, male: true, ident: ['Rock one oh four seven. The ROCK!', 'Big Dave here. Crank it.'], lines: ['If it\'s too loud, you\'re too old! Rock one oh four seven!', 'Big Dave on the air, and we are not slowing down!', 'Headbangers, this one\'s for you!'] },
  vibes: { name: 'DJ Sunny', rate: 1.05, pitch: 1.1, uk: false, male: false, ident: ['Vibes ninety-nine point nine.'], lines: [] },
  dancehall: { name: 'Selecta Irie', rate: 1.12, pitch: 1.0, uk: true, male: true, ident: ['Yard ninety-two five! Big up!', 'Selecta Irie pon de mic, Yard ninety-two five!'], lines: ['Ladies, this one is for you! Wine it up!', 'Big up all the massive in Bay City!', 'Pull it up, selecta! Wheel and come again!'] },
  drill: { name: 'Tizzy', rate: 1.2, pitch: 0.9, uk: true, male: true, ident: ['Ends one forty, you already know.', 'Tizzy on Ends one forty, say less.'], lines: ['This one is hard, trust me.', 'Big up the ends, big up the mandem.', 'No skips, Ends one forty.'] },
  pop: { name: 'Kayla', rate: 1.12, pitch: 1.35, uk: false, male: false, ident: ['Hits one oh two point three! All the hits, all day!', 'Kayla here on Hits one oh two!'], lines: ['Okay, I am OBSESSED with this one!', 'Text in your requests, I\'m playing them all day!', 'Sing it with me, Bay City!'] },
};
let voices = null;
function voiceFor(d) {
  try { voices = voices?.length ? voices : speechSynthesis.getVoices(); } catch (_) { return null; }
  const en = voices.filter(v => /^en/i.test(v.lang)), byLang = en.filter(v => d.uk ? /GB|IE|AU/i.test(v.lang) : /US/i.test(v.lang));
  const fem = /female|samantha|karen|serena|zira|moira|fiona|victoria|tessa|kate|susan|allison|ava/i, mal = /male|daniel|alex|fred|david|mark|arthur|aaron|oliver|tom|rishi|gordon/i;
  const want = d.male ? mal : fem;
  return byLang.find(v => want.test(v.name)) || en.find(v => want.test(v.name)) || byLang[0] || en[0] || null;
}
// the DJ talks over the music (it ducks down under the voice)
function hostOver(st, song, kind) {
  if (!radio.on || STATIONS[radio.station] !== st || !A) return;
  const d = DJ[st.style]; if (!d || !window.speechSynthesis) return;
  const line = kind === 'intro' ? `${pick(d.lines.length ? d.lines : d.ident)} Here's ${song.title}, from ${song.artist}.` : kind === 'outro' ? `That was ${song.title}, by ${song.artist}. ${pick(d.ident)}` : pick(d.ident);
  try {
    const u = new SpeechSynthesisUtterance(line); u.rate = d.rate; u.pitch = d.pitch; u.volume = 1; const v = voiceFor(d); if (v) u.voice = v;
    u.onstart = () => rbus?.gain.setTargetAtTime(0.32, A.currentTime, 0.15);
    u.onend = u.onerror = () => { if (radio.on) rbus?.gain.setTargetAtTime(0.85, A.currentTime, 0.3); };
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (_) {}
}
const pick = a => a[Math.floor(Math.random() * a.length)];
const HOST = [
  "You're locked in to Vibes ninety-nine point nine. I'm DJ Sunny, keeping your evening smooth.",
  "Shout out to everybody stuck in traffic on the Bay Bridge right now. We see you. This one's for you.",
  "Text line's been going crazy tonight. Big love to Keisha in Northfield, and to the guy in the red lowrider, slow down, baby!",
  "Weather in Bay City: warm, breezy, perfect for a late drive with the windows down.",
  "Somebody just called in to say they saw a cop chase down Main Street. Stay safe out there, people.",
  "If you're out on a date tonight, turn this one up. You can thank me later.",
  "This is Vibes ninety-nine point nine, the only station that loves you back.",
  "Quick one for all my night shift workers. Nurses, cab drivers, bin crews. We appreciate you.",
  "Rumour has it the Neon Room is packed tonight. Tell them DJ Sunny sent you.",
];
function hostTalk(next) {
  const line = `${HOST[Math.floor(Math.random() * HOST.length)]} Coming up next, ${next.title}, from ${next.artist}.`;
  const t = A.currentTime; radio.talking = 1; radio.talkEnd = t + 14;
  [0, 4, 7, 12].forEach((iv, i) => rn(mtof(72 + iv), t + i * 0.12, 0.4, 'sine', 0.04, 4000));
  let spoke = false;
  try {
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(line), d = DJ.vibes; u.rate = d.rate; u.pitch = d.pitch; u.volume = 0.9;
      const v = voiceFor(d); if (v) u.voice = v;
      u.onend = u.onerror = () => { radio.talking = 0; if (A) radio.next = A.currentTime + 0.3; };
      speechSynthesis.cancel(); speechSynthesis.speak(u); spoke = true; radio.talkEnd = t + 16;
    }
  } catch (_) {}
  if (!spoke) {
    for (let i = 0; i < 22; i++) { const tt = t + 0.5 + i * 0.16 + Math.random() * 0.05; rn(160 + Math.random() * 90, tt, 0.1, 'sawtooth', 0.025, 900 + Math.random() * 1200, 0.01); }
    radio.talkEnd = t + 4.5;
  }
}
function nextSong(st) {
  if (!st.order.length) { st.order = [...st.songs.keys()].sort(() => Math.random() - 0.5); if (radio.song && st.order[0] === st.songs.indexOf(radio.song)) st.order.push(st.order.shift()); }
  return st.songs[st.order.shift()];
}
export function radioTick() {
  if (!A || !radio.on) return;
  const st = STATIONS[radio.station]; if (st.style === 'off') return;
  if (radio.talking) { if (A.currentTime > radio.talkEnd) { radio.talking = 0; radio.next = A.currentTime + 0.2; } else return; }
  if (!radio.song && !radio.tuned && !radio.dance) { radio.tuned = true; tuneIn(st); songCb?.(radio.song, st); }
  if (!radio.song) {
    const prev = radio.prevSong, s = nextSong(st);
    st.live = { song: s, wall0: performance.now() / 1000 };
    if (st.talk && radio.hadSong) { radio.song = s; radio.step = 0; hostTalk(s); songCb?.(s, st); return; }
    radio.song = s; radio.step = 0; radio.hadSong = true; songCb?.(s, st);
    if (!radio.dance) { const r = Math.random(); if (r < 0.35) setTimeout(() => hostOver(st, s, 'intro'), 700); else if (r < 0.5 && prev) setTimeout(() => hostOver(st, prev, 'outro'), 700); }
  }
  const S = radio.song, sp = 60 / S.bpm / 4; // sixteenth notes
  while (radio.next < A.currentTime + 0.25) {
    const t = radio.next, step = radio.step, bar = Math.floor(step / 16), pos = step % 16;
    if (bar >= S.bars) { radio.prevSong = S; radio.song = null; radio.hadSong = true; radio.next = t + sp * 4; return; }
    playStep(S, t, bar, pos, sp);
    radio.next += sp; radio.step++;
  }
}
function playStep(S, t, bar, pos, sp) {
  const L = S.bars, sec = bar < 4 ? 'intro' : bar >= L - 4 ? 'outro' : (Math.floor((bar - 4) / 8) % 2 ? 'chorus' : 'verse');
  const fade = sec === 'outro' ? Math.max(0.15, 1 - (bar - (L - 4) + pos / 16) / 4) : sec === 'intro' ? 0.6 + bar * 0.1 : 1;
  const sc = S.scale, deg = S.prog[bar % 4], R = S.root;
  const nt = (d, oct = 0) => R + sc[((d % 7) + 7) % 7] + 12 * (Math.floor(d / 7) + oct);
  const chord = [nt(deg), nt(deg + 2), nt(deg + 4), nt(deg + 6)];
  const drums = sec !== 'intro' || bar >= 2, chorus = sec === 'chorus';
  const mel = (chorus ? S.hook : S.motif)[pos];
  const k = (g) => D.kick(t, g * fade), sn = g => D.snare(t, g * fade), hh = (g, o) => D.hat(t, g * fade, o);
  if (bar % 8 === 0 && pos === 0 && sec !== 'intro') D.crash(t, 0.035 * fade);
  switch (S.style) {
    case 'chill':
      if (drums) { if (pos === 0 || pos === 10) k(0.35); if (pos === 4 || pos === 12) sn(0.06); if (pos % 4 === 2) hh(0.025); }
      if (pos === 0) chord.forEach(m => rn(mtof(m), t, sp * 15, 'sawtooth', 0.01 * fade, 900, 0.3));
      if (pos % 8 === 0) rn(mtof(chord[0] - 24), t, sp * 6, 'triangle', 0.06 * fade, 500);
      if (mel != null && pos % 2 === 0) rn(mtof(nt(mel, 2)), t, sp * 3, 'sine', 0.025 * fade, 3000);
      break;
    case 'bounce': {
      const kp = [[0, 6, 10], [0, 7, 10, 14], [0, 3, 8, 11]][S.kickVar];
      if (drums) { if (kp.includes(pos)) k(0.5); if (pos === 4 || pos === 12) D.clap(t, 0.1 * fade); if (pos % 2 === 0) hh(pos % 4 ? 0.02 : 0.03); }
      if (kp.includes(pos)) rn(mtof(chord[0] - 24), t, sp * 2.5, 'square', 0.035 * fade, 400);
      if ((pos === 0 || pos === 6 || pos === 12) && sec !== 'intro') rn(mtof(chord[1 + (pos % 3)] + 12), t, sp * 1.2, 'triangle', 0.025 * fade, 2400);
      if (chorus && mel != null && pos % 2 === 0) rn(mtof(nt(mel, 2)), t, sp * 1.8, 'square', 0.014 * fade, 2200);
      break; }
    case 'synth':
      if (drums) { if (pos % 4 === 0) k(0.42); if (pos === 4 || pos === 12) sn(0.1); if (pos % 4 === 2) hh(0.025); }
      rn(mtof(chord[pos % 4] + 12), t, sp * 0.9, 'square', 0.014 * fade, 2600);
      if (pos % 2 === 0) rn(mtof(chord[0] - 24), t, sp * 1.6, 'sawtooth', 0.035 * fade, 600);
      if (pos === 0) rn(mtof(chord[1]), t, sp * 15, 'sawtooth', 0.01 * fade, 1400, 0.2);
      if (chorus && mel != null && pos % 2 === 0) rn(mtof(nt(mel, 2)), t, sp * 3, 'sawtooth', 0.016 * fade, 3000, 0.02, 7);
      break;
    case 'dnb':
      if (drums) { if (pos === 0 || pos === 10 || (S.kickVar === 1 && pos === 7)) k(0.5); if (pos === 4 || pos === 12) sn(0.16); if (pos % 2 === 0) hh(0.02); if (pos % 4 === 3 && Math.random() < 0.6) D.snare(t, 0.03 * fade); }
      if (pos === 0 || pos === 8) { rn(mtof(chord[0] - 24), t, sp * 7.5, 'sawtooth', 0.045 * fade, 420, 0.02, -12); rn(mtof(chord[0] - 24), t, sp * 7.5, 'sawtooth', 0.045 * fade, 420, 0.02, 12); }
      if (pos === 0 && bar % 2 === 0) chord.forEach(m => rn(mtof(m + 12), t, sp * 30, 'sine', 0.008 * fade, 2500, 0.6));
      if (chorus && mel != null && pos % 4 === 0) rn(mtof(nt(mel, 2)), t, sp * 3, 'triangle', 0.025 * fade, 3500);
      break;
    case 'classical': {
      const arp = [0, 1, 2, 3, 2, 1, 2, 3][pos % 8];
      rn(mtof(chord[arp] + (pos % 8 > 3 ? 12 : 0)), t, sp * 3, 'triangle', 0.03 * fade, 2400, 0.004);
      if (pos === 0) { rn(mtof(chord[0] - 12), t, sp * 15, 'sine', 0.04 * fade, 1200, 0.15); rn(mtof(chord[2]), t, sp * 15, 'sine', 0.016 * fade, 1600, 0.4); }
      if (mel != null && pos % 4 === 0 && sec !== 'intro') rn(mtof(nt(mel, 2)), t, sp * 4, 'sine', 0.035 * fade, 3000, 0.04);
      break; }
    case 'rock':
      if (drums) { if (pos === 0 || pos === 8 || pos === 10) k(0.55); if (pos === 4 || pos === 12) sn(0.18); if (pos % 2 === 0) hh(0.03, chorus && pos % 4 === 2); }
      if (pos % 2 === 0 && sec !== 'intro') { rn(mtof(chord[0] - 12), t, sp * 1.7, 'sawtooth', 0.04 * fade, chorus ? 1600 : 1100); rn(mtof(chord[0] - 5), t, sp * 1.7, 'sawtooth', 0.03 * fade, chorus ? 1600 : 1100); }
      if (pos % 2 === 0) rn(mtof(chord[0] - 24), t, sp * 1.8, 'square', 0.035 * fade, 500);
      if (chorus && mel != null && pos % 2 === 0) rn(mtof(nt(mel, 2)), t, sp * 2.5, 'sawtooth', 0.018 * fade, 2600, 0.01, 5);
      break;
    case 'vibes':
      if (drums) { if (pos === 0 || pos === 9) k(0.38); if (pos === 4 || pos === 12) D.rim(t, 0.05 * fade); if (pos === 12) sn(0.05); if (pos % 2 === 0 || pos === 15) hh(0.018); }
      if (pos === 0 || pos === 6) chord.forEach(m => { rn(mtof(m), t, sp * 5, 'sine', 0.018 * fade, 2000, 0.01); rn(mtof(m + 12), t, sp * 3, 'triangle', 0.006 * fade, 3000); });
      if (pos === 0 || pos === 7 || pos === 10) rn(mtof(chord[0] - 24), t, sp * 3, 'sine', 0.07 * fade, 400);
      if (mel != null && pos % 2 === 0 && sec !== 'intro') rn(mtof(nt(mel, 2)), t, sp * 2.5, 'sine', 0.022 * fade, 2600, 0.02);
      break;
    case 'dancehall':
      if (drums) { if (pos === 0 || pos === 8) k(0.5); if (pos === 3 || pos === 6 || pos === 11 || pos === 14) sn(0.1); if (pos % 2 === 0) hh(0.02); }
      if ([0, 3, 8, 11].includes(pos)) rn(mtof(chord[0] - 24), t, sp * 2, 'square', 0.04 * fade, 380);
      if (pos % 4 === 2) chord.slice(0, 3).forEach(m => rn(mtof(m + 12), t, sp * 0.8, 'square', 0.009 * fade, 2400));
      if (chorus && mel != null && pos % 2 === 0) rn(mtof(nt(mel, 2)), t, sp * 1.8, 'triangle', 0.025 * fade, 3200);
      break;
    case 'drill': {
      const kp = [[0, 7, 11], [0, 3, 10], [0, 6, 13]][S.kickVar];
      if (drums) {
        if (kp.includes(pos)) k(0.25);
        if (pos === 8) sn(0.16); if (pos === 14 && S.vari > 0.5) D.snare(t, 0.05 * fade);
        if (pos % 2 === 0) hh(0.02);
        if (pos % 4 === 3 && Math.random() < 0.35) for (let i = 0; i < 3; i++) D.hat(t + i * sp / 3, 0.015 * fade); // triplet roll
      }
      if (kp.includes(pos)) { const f0 = mtof(chord[0] - 24), f1 = pos === kp[kp.length - 1] && Math.random() < 0.5 ? f0 * 1.5 : f0; rslide(f0 * (Math.random() < 0.3 ? 0.75 : 1), f1, t, sp * 3.5, 0.11 * fade); }
      if (pos % 4 === 0) rn(mtof(nt([0, 2, 4, 1][((pos / 4) + bar) % 4], 1)), t, sp * 2, 'triangle', 0.02 * fade, 1800); // dark bell melody
      if (pos === 0) rn(mtof(chord[0]), t, sp * 15, 'sawtooth', 0.008 * fade, 700, 0.4);
      break; }
    case 'pop':
      if (drums) { if (pos % 4 === 0) k(0.48); if (pos === 4 || pos === 12) D.clap(t, 0.11 * fade); if (pos % 4 === 2) hh(0.03, chorus); }
      if ([0, 3, 6, 8, 11, 14].includes(pos)) chord.slice(0, 3).forEach(m => rn(mtof(m + 12), t, sp * 1.2, 'triangle', 0.013 * fade, 3200));
      if (pos % 2 === 0) rn(mtof(chord[0] - 24 + (pos % 4 ? 12 : 0)), t, sp * 1.6, 'square', 0.03 * fade, 600);
      if (mel != null && pos % 2 === 0 && sec !== 'intro') rn(mtof(nt(mel, 2)), t, sp * 2, chorus ? 'square' : 'triangle', (chorus ? 0.018 : 0.024) * fade, 3000, 0.01);
      break;
  }
}
// ---------------- dance floor: play one random song from a random music station, report its timing
let danceSave = null;
export function audioTime() { return A ? A.currentTime : 0; }
export function danceStart() {
  if (!audio()) return null;
  danceSave = { on: radio.on, station: radio.station };
  const opts = STATIONS.map((s, i) => i).filter(i => STATIONS[i].songs && STATIONS[i].style !== 'classical'), si = opts[Math.floor(Math.random() * opts.length)], st = STATIONS[si];
  stopTalk(); radio.station = si; radio.song = st.songs[Math.floor(Math.random() * st.songs.length)]; radio.step = 0; radio.hadSong = false;
  radio.on = true; radio.tuned = true; radio.dance = true; radio.next = A.currentTime + 0.8; if (rbus) rbus.gain.setTargetAtTime(0.95, A.currentTime, 0.05);
  return { song: radio.song, station: st.name, t0: radio.next, spb16: 60 / radio.song.bpm / 4 };
}
export function danceStop() {
  if (!danceSave) return; radio.dance = false; radio.tuned = false; radio.song = null; radio.station = danceSave.station; radio.step = 0; radioOn(danceSave.on); danceSave = null;
}
