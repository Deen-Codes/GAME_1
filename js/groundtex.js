// Ground detail: tileable 1K textures painted once at load (grass, sand, pavement slabs, asphalt, dirt, crop rows).
// They're "multiplier" maps (mid-grey = no change) laid over the world's own colours in world space,
// so the palette stays the same but up close everything has grain, blades, joints and cracks.
import * as THREE from '../lib/three.module.min.js';

const N = 1024;
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function canvas() { const c = document.createElement('canvas'); c.width = c.height = N; return c; }
// tileable value noise (period p cells across the texture)
function tNoise(p, sd) {
  const g = new Float32Array(p * p); seed = sd; for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (u, v) => { const x = u * p, y = v * p, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const at = (i, j) => g[((j % p + p) % p) * p + ((i % p + p) % p)];
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
}
// base fill from layered noise: f(u,v) -> [r,g,b] 0..255
function fill(x, f) {
  const img = x.createImageData(N, N), d = img.data;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const c = f(i / N, j / N), k = (j * N + i) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; }
  x.putImageData(img, 0, 0);
}
// draw something wrapped round the edges so the tile repeats seamlessly
function wrap(x, px, py, r, fn) { for (const ox of [-N, 0, N]) for (const oy of [-N, 0, N]) { const X = px + ox, Y = py + oy; if (X < -r || X > N + r || Y < -r || Y > N + r) continue; fn(X, Y); } }
const cl = v => Math.max(0, Math.min(255, v | 0));

function grass() {
  const c = canvas(), x = c.getContext('2d'), n1 = tNoise(8, 11), n2 = tNoise(32, 12), n3 = tNoise(128, 13);
  fill(x, (u, v) => { const k = 128 + (n1(u, v) - 0.5) * 34 + (n2(u, v) - 0.5) * 26 + (n3(u, v) - 0.5) * 22, y = (n1(u + 0.3, v + 0.7) - 0.5) * 20; return [cl(k + y), cl(k + 4), cl(k - y * 0.6 - 6)]; });
  seed = 21; x.lineCap = 'round';
  for (let i = 0; i < 26000; i++) { // blades
    const px = rnd() * N, py = rnd() * N, L = 5 + rnd() * 11, a = -Math.PI / 2 + (rnd() - 0.5) * 1.1, lt = rnd();
    x.strokeStyle = lt < 0.5 ? `rgba(${170 + lt * 60 | 0},${185 + lt * 50 | 0},120,${0.35 + rnd() * 0.3})` : `rgba(40,70,30,${0.2 + rnd() * 0.25})`; x.lineWidth = 1 + rnd() * 1.4;
    wrap(x, px, py, 16, (X, Y) => { x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X + Math.cos(a) * L * 0.5 + 2, Y + Math.sin(a) * L * 0.5, X + Math.cos(a) * L, Y + Math.sin(a) * L); x.stroke(); });
  }
  for (let i = 0; i < 160; i++) { const px = rnd() * N, py = rnd() * N, col = ['rgba(255,255,255,.75)', 'rgba(255,230,90,.8)', 'rgba(255,160,200,.7)'][i % 3]; wrap(x, px, py, 4, (X, Y) => { x.fillStyle = col; x.beginPath(); x.arc(X, Y, 2.2, 0, 7); x.fill(); }); } // little flowers
  return c;
}
function sand() {
  const c = canvas(), x = c.getContext('2d'), n1 = tNoise(6, 31), n2 = tNoise(48, 32), n3 = tNoise(256, 33);
  fill(x, (u, v) => { const rip = Math.sin((v * 22 + n1(u, v) * 3.2) * Math.PI * 2) * 7, k = 128 + rip + (n2(u, v) - 0.5) * 18 + (n3(u, v) - 0.5) * 30; return [cl(k + 3), cl(k), cl(k - 4)]; });
  seed = 41; for (let i = 0; i < 9000; i++) { const px = rnd() * N, py = rnd() * N, s = 0.8 + rnd() * 1.6, d = rnd() < 0.5; x.fillStyle = d ? `rgba(110,90,60,${0.25 + rnd() * 0.3})` : `rgba(255,250,235,${0.35 + rnd() * 0.3})`; x.fillRect(px, py, s, s); }
  for (let i = 0; i < 40; i++) { const px = rnd() * N, py = rnd() * N, r = 3 + rnd() * 4; wrap(x, px, py, r + 2, (X, Y) => { x.fillStyle = 'rgba(255,245,230,.6)'; x.beginPath(); x.ellipse(X, Y, r, r * 0.6, rnd() * 3, 0, 7); x.fill(); x.strokeStyle = 'rgba(150,120,90,.4)'; x.stroke(); }); } // shells
  return c;
}
// pavement: 4m tile = 2x2 concrete slabs with dark joints, speckle and the odd stain/crack
function pavement() {
  const c = canvas(), x = c.getContext('2d'), n2 = tNoise(16, 51), n3 = tNoise(256, 52);
  const slabs = 2, sz = N / slabs; seed = 53; const tone = []; for (let i = 0; i < slabs * slabs; i++) tone.push((rnd() - 0.5) * 14);
  fill(x, (u, v) => { const t = tone[Math.floor(v * slabs) * slabs + Math.floor(u * slabs)], k = 132 + t + (n2(u, v) - 0.5) * 14 + (n3(u, v) - 0.5) * 26; return [cl(k), cl(k), cl(k - 2)]; });
  seed = 54; for (let i = 0; i < 14000; i++) { const px = rnd() * N, py = rnd() * N, s = 1 + rnd() * 1.5; x.fillStyle = rnd() < 0.5 ? `rgba(60,60,60,${0.2 + rnd() * 0.25})` : `rgba(255,255,255,${0.2 + rnd() * 0.25})`; x.fillRect(px, py, s, s); }
  for (let i = 0; i < 5; i++) { const px = rnd() * N, py = rnd() * N, r = 18 + rnd() * 40; wrap(x, px, py, r, (X, Y) => { const g = x.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, 'rgba(50,45,40,.22)'); g.addColorStop(1, 'rgba(50,45,40,0)'); x.fillStyle = g; x.fillRect(X - r, Y - r, r * 2, r * 2); }); } // stains, gum
  x.strokeStyle = 'rgba(40,40,40,.85)'; x.lineWidth = 5;
  for (let i = 0; i <= slabs; i++) { x.beginPath(); x.moveTo(i * sz, 0); x.lineTo(i * sz, N); x.stroke(); x.beginPath(); x.moveTo(0, i * sz); x.lineTo(N, i * sz); x.stroke(); }
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; for (let i = 0; i <= slabs; i++) { x.beginPath(); x.moveTo(i * sz + 4, 0); x.lineTo(i * sz + 4, N); x.stroke(); x.beginPath(); x.moveTo(0, i * sz + 4); x.lineTo(N, i * sz + 4); x.stroke(); } // bevel highlight
  for (let i = 0; i < 3; i++) { let px = rnd() * N, py = rnd() * N; x.strokeStyle = 'rgba(40,40,40,.55)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (rnd() - 0.5) * 40; py += rnd() * 22; x.lineTo(px, py); } x.stroke(); }
  return c;
}
function asphalt() {
  const c = canvas(), x = c.getContext('2d'), n1 = tNoise(4, 61), n2 = tNoise(32, 62), n3 = tNoise(512, 63);
  fill(x, (u, v) => { const k = 128 + (n1(u, v) - 0.5) * 20 + (n2(u, v) - 0.5) * 16 + (n3(u, v) - 0.5) * 46; return [cl(k), cl(k), cl(k + 2)]; });
  seed = 64; for (let i = 0; i < 30000; i++) { const px = rnd() * N, py = rnd() * N, s = 1 + rnd() * 2; x.fillStyle = rnd() < 0.55 ? `rgba(20,20,22,${0.3 + rnd() * 0.3})` : `rgba(230,230,225,${0.25 + rnd() * 0.3})`; x.fillRect(px, py, s, s); } // aggregate
  for (let i = 0; i < 3; i++) { const px = rnd() * N, py = rnd() * N, w = 80 + rnd() * 160, h = 60 + rnd() * 120; wrap(x, px, py, Math.max(w, h), (X, Y) => { x.fillStyle = "rgba(25,25,28,.12)"; x.fillRect(X, Y, w, h); x.strokeStyle = "rgba(20,20,20,.22)"; x.lineWidth = 2; x.strokeRect(X, Y, w, h); }); } // patch repairs
  for (let i = 0; i < 6; i++) { let px = rnd() * N, py = rnd() * N; x.strokeStyle = 'rgba(15,15,15,.6)'; x.lineWidth = 1.2 + rnd(); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 10; k++) { px += (rnd() - 0.5) * 50; py += (rnd() - 0.5) * 50; x.lineTo(px, py); } x.stroke(); } // cracks
  for (let i = 0; i < 4; i++) { const px = rnd() * N, py = rnd() * N, r = 30 + rnd() * 50; wrap(x, px, py, r, (X, Y) => { const g = x.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, 'rgba(10,10,10,.28)'); g.addColorStop(1, 'rgba(10,10,10,0)'); x.fillStyle = g; x.fillRect(X - r, Y - r, r * 2, r * 2); }); } // oil
  return c;
}
function dirt() {
  const c = canvas(), x = c.getContext('2d'), n1 = tNoise(8, 71), n2 = tNoise(64, 72), n3 = tNoise(256, 73);
  fill(x, (u, v) => { const k = 128 + (n1(u, v) - 0.5) * 30 + (n2(u, v) - 0.5) * 24 + (n3(u, v) - 0.5) * 30; return [cl(k + 3), cl(k), cl(k - 5)]; });
  seed = 74; for (let i = 0; i < 2600; i++) { const px = rnd() * N, py = rnd() * N, r = 1.5 + rnd() * 4.5, l = rnd(); wrap(x, px, py, r + 2, (X, Y) => { x.fillStyle = `rgba(${l < 0.5 ? '70,58,45' : '210,195,175'},${0.35 + rnd() * 0.3})`; x.beginPath(); x.ellipse(X, Y, r, r * (0.6 + rnd() * 0.4), rnd() * 3, 0, 7); x.fill(); }); } // pebbles
  return c;
}
// crop rows: furrows of soil with leafy plants along them (rows run along the texture's v)
function crops() {
  const c = canvas(), x = c.getContext('2d'), n2 = tNoise(32, 81), n3 = tNoise(256, 82), rows = 8;
  fill(x, (u, v) => { const f = Math.cos(u * rows * Math.PI * 2), k = 128 + f * 26 + (n2(u, v) - 0.5) * 16 + (n3(u, v) - 0.5) * 22; return [cl(k), cl(k + 2), cl(k - 6)]; });
  seed = 83; for (let r = 0; r < rows; r++) for (let i = 0; i < 70; i++) { const px = (r + 0.5) * N / rows + (rnd() - 0.5) * 18, py = rnd() * N, s = 7 + rnd() * 9; wrap(x, px, py, s, (X, Y) => { x.fillStyle = `rgba(${rnd() < 0.5 ? '220,230,170' : '60,90,40'},${0.35 + rnd() * 0.3})`; x.beginPath(); x.ellipse(X, Y, s * 0.5, s, rnd() - 0.5, 0, 7); x.fill(); }); }
  return c;
}

let TEX = null;
export function groundTextures(renderer) {
  if (TEX) return TEX;
  const aniso = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 4);
  const mk = cv => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; }; // linear (not sRGB): these are multipliers around mid-grey
  TEX = { grass: mk(grass()), sand: mk(sand()), pave: mk(pavement()), asph: mk(asphalt()), dirt: mk(dirt()), crops: mk(crops()) };
  return TEX;
}

// gtype codes painted per vertex: 1 grass, 2 forest, 3 sand, 4 crops, 5 dirt, 6 asphalt, 7 pavement, 8 work it out from the colour
export const GT = { grass: 1, forest: 2, sand: 3, crops: 4, dirt: 5, asphalt: 6, pave: 7, auto: 8 };
export const GROUND_U = { gWet: { value: 0 } };
export function groundMaterial(base, renderer) {
  const T = groundTextures(renderer), m = base.clone();
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { gGrass: { value: T.grass }, gSand: { value: T.sand }, gPave: { value: T.pave }, gAsph: { value: T.asph }, gDirt: { value: T.dirt }, gCrops: { value: T.crops }, gFA: { value: new THREE.Color('#c9b35a') }, gFB: { value: new THREE.Color('#93b65a') }, gWet: GROUND_U.gWet });
    sh.vertexShader = 'attribute float gtype;\nvarying float vGT;\nvarying vec3 vGW;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\n vGT = gtype; vGW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = ('uniform sampler2D gGrass, gSand, gPave, gAsph, gDirt, gCrops;\nuniform vec3 gFA, gFB;\nuniform float gWet;\nfloat gWetMask = 0.0;\nvarying float vGT;\nvarying vec3 vGW;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      {
        float t = floor(vGT + 0.5);
        vec3 vc = diffuseColor.rgb;
        if (t > 7.5) { // slabs: decide from their colour
          float mx = max(vc.r, max(vc.g, vc.b)), mn = min(vc.r, min(vc.g, vc.b)), sat = mx - mn;
          if (vc.g > vc.r * 1.08 && vc.g > vc.b) t = 1.0;
          else if (sat < mx * 0.27) t = mx < 0.12 ? 6.0 : 7.0;
          else t = 5.0;
        }
        if (t > 0.5) {
          vec2 w = vGW.xz;
          vec3 d = vec3(0.5);
          float macro = 1.0;
          if (t < 1.5) { d = texture2D(gGrass, w / 7.0).rgb; macro = texture2D(gGrass, w / 61.0 + 0.37).g; }
          else if (t < 2.5) { d = texture2D(gGrass, w / 5.0).rgb * 0.92; macro = texture2D(gDirt, w / 40.0).g; }
          else if (t < 3.5) { d = texture2D(gSand, w / 6.0).rgb; macro = texture2D(gSand, w / 53.0 + 0.21).g; }
          else if (t < 4.5) { float sx = sin(w.x * 0.5); diffuseColor.rgb = mix(gFB, gFA, smoothstep(-0.08, 0.08, sx)); d = texture2D(gCrops, w / vec2(12.566, 9.0)).rgb; macro = texture2D(gDirt, w / 47.0).g; }
          else if (t < 5.5) { d = texture2D(gDirt, w / 5.0).rgb; macro = texture2D(gDirt, w / 43.0 + 0.5).g; }
          else if (t < 6.5) { d = texture2D(gAsph, w / 9.0).rgb; macro = texture2D(gAsph, w / 71.0 + 0.13).g; }
          else { d = texture2D(gPave, w / 4.0).rgb; macro = texture2D(gPave, w / 57.0 + 0.4).g; }
          // fade the fine detail out with distance so nothing shimmers
          float fade = 1.0 - smoothstep(60.0, 220.0, length(vGW - cameraPosition));
          vec3 mul = mix(vec3(1.0), d * 2.0, 0.85 * fade) * mix(1.0, 0.86 + macro * 0.28, 0.9);
          diffuseColor.rgb *= mul;
          // rain: hard surfaces go dark and glossy, with puddles in the dips that catch the lights
          if (gWet > 0.01 && (t > 5.5 || t < 0.5)) { float pud = smoothstep(0.55, 0.7, texture2D(gDirt, w / 23.0 + 0.31).g * 0.6 + texture2D(gAsph, w / 61.0).g * 0.4); gWetMask = gWet * (0.55 + 0.45 * pud); diffuseColor.rgb *= 1.0 - gWet * (0.28 + 0.2 * pud); }
        }
      }`)).replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, 0.12, gWetMask);');
  };
  m.customProgramCacheKey = () => 'ground1';
  return m;
}
