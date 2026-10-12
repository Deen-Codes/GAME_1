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
  if (mix.birds > 0.1 && t > amb.nextBird) { amb.nextBird = t + 0.6 + Math.random() * 2.5; const f = 2200 + Math.random() * 1800; for (let i = 0; i < 2 + Math.random() * 3; i++) tone(f + Math.random() * 400, 0.07, 'sine', 0.012 * mix.birds, i * 0.09, f * 1.3); }
  if (mix.crickets > 0.1 && t > amb.nextCricket) { amb.nextCricket = t + 0.35 + Math.random() * 0.5; for (let i = 0; i < 3; i++) tone(4300, 0.03, 'sine', 0.008 * mix.crickets, i * 0.05); }
}

// ---------------- car radio: two tiny procedural stations
export const STATIONS = [
  { name: 'Bay FM 101.1 — Sunset Chill', bpm: 88, style: 'chill' },
  { name: 'Westside 96.3 — Bounce', bpm: 98, style: 'bounce' },
  { name: 'Radio off', style: 'off' },
];
let radio = { on: false, station: 0, next: 0, step: 0 };
const CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]]; // Am7 Fmaj7 Cmaj7 G7
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
export function radioStation() { return STATIONS[radio.station]; }
export function radioNext() { radio.station = (radio.station + 1) % STATIONS.length; radio.step = 0; return STATIONS[radio.station]; }
export function radioOn(on) { radio.on = on; if (on && A) radio.next = Math.max(radio.next, A.currentTime + 0.1); }
export function radioTick() {
  if (!A || !radio.on) return;
  const st = STATIONS[radio.station]; if (st.style === 'off') return;
  const spb = 60 / st.bpm / 2; // eighth notes
  while (radio.next < A.currentTime + 0.25) {
    const t = radio.next, s = radio.step, bar = Math.floor(s / 16) % 4, pos = s % 16, ch = CHORDS[bar];
    if (st.style === 'chill') {
      if (pos === 0 || pos === 10) sfx.kick(t, 0.35);
      if (pos === 4 || pos === 12) sfx.snare(t, 0.07);
      if (pos % 2 === 1) sfx.hat(t, 0.025);
      if (pos === 0) ch.forEach(m => sfx.note(mtof(m), t, spb * 14, 'sawtooth', 0.012, 900));
      if (pos % 4 === 0) sfx.note(mtof(ch[0] - 24), t, spb * 3, 'triangle', 0.06, 600);
      if ([2, 7, 11, 14].includes(pos) && Math.random() < 0.7) sfx.note(mtof(ch[Math.floor(Math.random() * 4)] + 12), t, spb * 2, 'sine', 0.02, 3000);
    } else {
      if (pos === 0 || pos === 3 || pos === 8 || pos === 11) sfx.kick(t, 0.45);
      if (pos === 4 || pos === 12) sfx.snare(t, 0.12);
      sfx.hat(t, pos % 2 ? 0.02 : 0.035);
      if (pos % 2 === 0) sfx.note(mtof(ch[0] - 24 + (pos % 8 === 6 ? 7 : 0)), t, spb * 1.6, 'square', 0.04, 500);
      if (pos === 0 || pos === 6 || pos === 12) sfx.note(mtof(ch[2] + 12), t, spb * 0.8, 'triangle', 0.025, 2500);
    }
    radio.next += spb; radio.step++;
  }
}
