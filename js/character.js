// Low-poly customisable character, built from boxes. Faces +Z, feet at y=0.
import * as THREE from '../lib/three.module.min.js';

export const SKIN_TONES = ['#ffe0cc', '#f6c9a4', '#e8b088', '#d39a6a', '#b77a4b', '#8d5524', '#6b3f22', '#452a1a', '#9fe6a0', '#8fc9ff', '#c9a0ff', '#ff9f9f'];
export const HAIR_COLORS = ['#141414', '#3b2416', '#6b4423', '#a0602d', '#d8b26e', '#f3e7c4', '#9a9a9a', '#ffffff', '#d93030', '#ff7ac8', '#3d6dff', '#24c98d', '#8a4fff', '#ff9a2a'];
export const BASIC = ['#ffffff', '#d9d9de', '#7c828d', '#3a3d45', '#16161b', '#e23b3b', '#ff8a2a', '#ffd23f', '#4cd964', '#1fb5a8', '#2f80ed', '#3a3fbf', '#9b51e0', '#ff6fb5', '#7a5230', '#c2b280', '#55602f', '#8b1e3f'];
export const EYE_COLORS = ['#2b1a0f', '#5b3a1a', '#3b6ea5', '#4a8f4a', '#8a8a8a', '#a24bd1', '#e03030', '#ffd23f', '#00e5ff'];

const choice = (key, label, options) => ({ key, type: 'choice', label, options });
const color = (key, label, palette) => ({ key, type: 'color', label, palette });
const range = (key, label, min, max, step = 0.01) => ({ key, type: 'range', label, min, max, step });

export const CHAR_SCHEMA = [
  { tab: 'Body', items: [
    range('height', 'Height', 0.82, 1.18),
    range('build', 'Build', 0.75, 1.4),
    range('headSize', 'Head size', 0.8, 1.4),
    range('legs', 'Leg length', 0.85, 1.15),
    range('arms', 'Arm length', 0.9, 1.1),
    color('skin', 'Skin', SKIN_TONES),
  ] },
  { tab: 'Face', items: [
    choice('headShape', 'Head shape', [['box', 'Block'], ['round', 'Round'], ['tall', 'Tall'], ['wide', 'Wide']]),
    choice('eyes', 'Eyes', [['normal', 'Normal'], ['wide', 'Wide'], ['sleepy', 'Sleepy'], ['angry', 'Angry'], ['robot', 'Robot']]),
    color('eyeColor', 'Eye colour', EYE_COLORS),
    choice('mouth', 'Mouth', [['neutral', 'Neutral'], ['smile', 'Smile'], ['frown', 'Frown'], ['open', 'Shout'], ['none', 'None']]),
    choice('facialHair', 'Facial hair', [['none', 'None'], ['stubble', 'Stubble'], ['moustache', 'Moustache'], ['goatee', 'Goatee'], ['beard', 'Beard'], ['bigbeard', 'Big beard']]),
    choice('eyewear', 'Eyewear', [['none', 'None'], ['glasses', 'Glasses'], ['shades', 'Shades'], ['visor', 'Visor'], ['goggles', 'Goggles'], ['patch', 'Eyepatch']]),
    choice('mask', 'Mask', [['none', 'None'], ['bandana', 'Bandana'], ['gasmask', 'Gas mask'], ['ski', 'Balaclava']]),
  ] },
  { tab: 'Hair', items: [
    choice('hair', 'Style', [['none', 'Bald'], ['buzz', 'Buzz'], ['short', 'Short'], ['spiky', 'Spiky'], ['quiff', 'Quiff'], ['bob', 'Bob'], ['long', 'Long'], ['ponytail', 'Ponytail'], ['bun', 'Bun'], ['mohawk', 'Mohawk'], ['afro', 'Afro']]),
    color('hairColor', 'Hair colour', HAIR_COLORS),
  ] },
  { tab: 'Outfit', items: [
    choice('top', 'Top', [['tshirt', 'T-shirt'], ['tank', 'Tank top'], ['long', 'Long sleeve'], ['hoodie', 'Hoodie'], ['jacket', 'Jacket'], ['suit', 'Suit'], ['armor', 'Armour'], ['shirtless', 'Shirtless'], ['swimtop', 'Swim top'], ['crop', 'Crop top'], ['puffer', 'Puffer jacket'], ['tracksuit', 'Tracksuit top'], ['polo', 'Polo shirt'], ['leather', 'Leather jacket'], ['trench', 'Trench coat'], ['jersey', 'Sports jersey'], ['dress', 'Dress']]),
    color('topColor', 'Top colour', BASIC),
    choice('pants', 'Legs', [['jeans', 'Trousers'], ['shorts', 'Shorts'], ['cargo', 'Cargo'], ['armored', 'Armoured'], ['swim', 'Swimwear'], ['skirt', 'Skirt'], ['joggers', 'Joggers'], ['leggings', 'Leggings'], ['longskirt', 'Long skirt']]),
    color('pantsColor', 'Legs colour', BASIC),
    choice('shoes', 'Shoes', [['sneakers', 'Trainers'], ['hightops', 'High-tops'], ['boots', 'Boots'], ['heels', 'Heels'], ['loafers', 'Loafers'], ['sandals', 'Sandals'], ['bare', 'Barefoot']]),
    color('shoeColor', 'Shoe colour', BASIC),
    choice('neck', 'Neck', [['none', 'None'], ['chain', 'Gold chain'], ['tie', 'Tie'], ['scarf', 'Scarf'], ['pearls', 'Pearls']]),
    choice('gloves', 'Gloves', [['none', 'None'], ['gloves', 'Gloves']]),
    color('gloveColor', 'Glove colour', BASIC),
  ] },
  { tab: 'Gear', items: [
    choice('hat', 'Headwear', [['none', 'None'], ['cap', 'Cap'], ['beanie', 'Beanie'], ['helmet', 'Helmet'], ['cowboy', 'Cowboy'], ['tophat', 'Top hat'], ['headband', 'Headband'], ['bucket', 'Bucket hat'], ['snapback', 'Backwards cap'], ['durag', 'Durag'], ['beret', 'Beret'], ['crown', 'Crown'], ['horns', 'Horns'], ['halo', 'Halo'], ['antenna', 'Antenna']]),
    color('hatColor', 'Headwear colour', BASIC),
    choice('back', 'Back', [['none', 'None'], ['backpack', 'Backpack'], ['cape', 'Cape'], ['sword', 'Sword'], ['jetpack', 'Jetpack (double jump)'], ['wings', 'Wings (glide)']]),
    color('backColor', 'Back colour', BASIC),
    color('accent', 'Accent colour', BASIC),
  ] },
];

export const DEFAULT_CHAR = {
  height: 1, build: 1, headSize: 1.05, legs: 1, arms: 1, skin: '#e8b088',
  headShape: 'box', eyes: 'normal', eyeColor: '#3b6ea5', mouth: 'smile', facialHair: 'none', eyewear: 'none', mask: 'none',
  hair: 'short', hairColor: '#3b2416',
  top: 'hoodie', topColor: '#2f80ed', pants: 'cargo', pantsColor: '#3a3d45', shoes: 'sneakers', shoeColor: '#ffffff', gloves: 'none', gloveColor: '#16161b',
  hat: 'none', hatColor: '#e23b3b', back: 'backpack', backColor: '#ff8a2a', accent: '#ffd23f',
};

const pick = a => a[Math.floor(Math.random() * a.length)];
export function randomChar() {
  const c = {};
  for (const tab of CHAR_SCHEMA) for (const it of tab.items) {
    if (it.type === 'choice') c[it.key] = pick(it.options)[0];
    else if (it.type === 'color') c[it.key] = pick(it.palette);
    else if (it.type === 'range') c[it.key] = +(it.min + Math.random() * (it.max - it.min)).toFixed(2);
  }
  if (Math.random() < 0.5) c.mask = 'none';
  if (Math.random() < 0.5) c.eyewear = 'none';
  return c;
}

// ---------- helpers ----------
function makeMats() {
  const cache = new Map();
  return (hex, opts = {}) => {
    const k = hex + JSON.stringify(opts);
    if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75, metalness: 0.05, flatShading: true, ...opts }));
    return cache.get(k);
  };
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, mat, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true; return m;
}
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }

export function buildCharacter(cfg) {
  const c = { ...DEFAULT_CHAR, ...cfg };
  const M = makeMats();
  const skin = M(c.skin), hairM = M(c.hairColor), topM = M(c.topColor), pantsM = M(c.pantsColor);
  const shoeM = M(c.shoeColor), hatM = M(c.hatColor), backM = M(c.backColor), acc = M(c.accent);
  const dark = M('#18181d'), white = M('#ffffff', { roughness: 0.4 }), metal = M('#9aa0aa', { metalness: 0.8, roughness: 0.3 });
  const handM = c.gloves === 'gloves' ? M(c.gloveColor) : skin;

  const h = c.height, b = c.build, sb = Math.sqrt(b), mu = Math.min(1, c.muscle || 0), fa = Math.min(1, c.fat || 0);
  const legLen = 0.86 * h * c.legs, thighL = legLen * 0.5, shinL = legLen * 0.5;
  // gym time widens the shoulders and thickens the arms; junk food rounds out the middle
  const torsoH = 0.62 * h, torsoW = 0.46 * b * (1 + 0.2 * mu + 0.24 * fa), torsoD = 0.27 * sb * (1 + 0.14 * mu + 0.45 * fa);
  const hs = 0.34 * c.headSize;
  const armLen = 0.66 * h * c.arms;
  const limbW = 0.13 * sb * (1 + 0.5 * mu + 0.3 * fa), legW = 0.16 * sb * (1 + 0.2 * mu + 0.32 * fa);

  // women: figure sets bust and hips (slim / athletic / curvy / plus), only for grown-ups
  const adultF = c.fem && h >= 0.8;
  const FIG = { slim: [0.45, 0.35], athletic: [0.5, 0.5], curvy: [0.9, 0.95], plus: [0.95, 1.05] }[c.figure || 'athletic'];
  const bust = adultF ? FIG[0] : 0, hipF = adultF ? FIG[1] : 0;
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = legLen; root.add(hips);
  hips.add(box(torsoW * (adultF ? 1.0 + 0.22 * hipF : 0.95), 0.2, torsoD * (adultF ? 1 + 0.12 * hipF : 0.95), pantsM, 0, 0.0, 0));
  if (c.pants === 'skirt') hips.add(box(torsoW * (1.12 + 0.22 * hipF), thighL * 0.62, torsoD * (1.25 + 0.12 * hipF), pantsM, 0, -thighL * 0.25, 0));
  if (c.pants === 'longskirt' && c.top !== 'dress') hips.add(box(torsoW * (1.14 + 0.22 * hipF), thighL * 1.5, torsoD * (1.28 + 0.12 * hipF), pantsM, 0, -thighL * 0.68, 0));
  if (adultF) { const bd = 0.05 + 0.08 * hipF; hips.add(box(torsoW * (0.82 + 0.16 * hipF), 0.22, bd, pantsM, 0, -0.03, -torsoD * (1 + 0.12 * hipF) / 2 - bd / 2 + 0.02)); } // seat
  const torso = new THREE.Group(); torso.position.y = 0.08; hips.add(torso);

  // ---- torso / top ----
  const longSleeve = ['long', 'hoodie', 'jacket', 'suit', 'puffer', 'tracksuit', 'leather', 'trench'].includes(c.top);
  const chestW = c.top === 'tank' ? torsoW * 0.92 : torsoW;
  const swim = c.top === 'shirtless' || c.top === 'swimtop';
  if (adultF) { // waist then shoulders, with a bust
    const bodyM = swim ? skin : topM;
    torso.add(box(torsoW * 0.8, torsoH * 0.46, torsoD * 0.92, c.top === 'crop' ? skin : bodyM, 0, torsoH * 0.23, 0));
    if (c.top === 'crop') torso.add(box(torsoW * 0.82, 0.05, torsoD * 0.94, bodyM, 0, torsoH * 0.44, 0));
    torso.add(box(chestW * 0.92, torsoH * 0.56, torsoD * 0.96, bodyM, 0, torsoH * 0.72, 0));
    const chestM = c.top === 'swimtop' ? topM : swim ? skin : topM, bd = 0.05 + 0.08 * bust;
    // stepped, blocky chest that matches the voxel style: a main block with bevel steps above and below
    // flat chest; swimwear still gets a proper bikini top
    const fz = torsoD * 0.96 / 2, cy = torsoH * 0.66, ch = torsoH * 0.28, dz = 0;
    if (c.top === 'swimtop') { // bikini top: band all the way round at chest height + straps
      torso.add(box(chestW * 0.94, ch * 0.75, torsoD * 0.98, chestM, 0, cy - ch * 0.05, 0));
      for (const sx of [-1, 1]) torso.add(box(0.03, torsoH * 0.2, torsoD * 0.9, chestM, sx * chestW * 0.28, torsoH * 0.86, 0));

    }
  } else torso.add(box(chestW, torsoH, torsoD, swim ? skin : topM, 0, torsoH / 2, 0));
  if (fa > 0.12) { const bd = 0.04 + 0.16 * fa; torso.add(box(chestW * (0.82 + 0.12 * fa), torsoH * (0.3 + 0.18 * fa), bd, swim ? skin : topM, 0, torsoH * 0.16, torsoD / 2 + bd / 2 - 0.01)); } // gut
  if (mu > 0.25 && !adultF) { const pd = 0.03 + 0.05 * mu; for (const sx of [-1, 1]) torso.add(box(chestW * 0.4, torsoH * 0.2, pd, swim ? skin : topM, sx * chestW * 0.22, torsoH * 0.62, torsoD / 2 + pd / 2 - 0.01)); for (const sx of [-1, 1]) torso.add(box(limbW * 1.5, limbW * 1.3, torsoD * 0.8, swim ? skin : topM, sx * (chestW / 2 + limbW * 0.25), torsoH * 0.9, 0)); } // pecs + delts
  if (c.belly > 0) { const bd = 0.06 + 0.22 * c.belly; torso.add(box(chestW * (0.7 + 0.15 * c.belly), torsoH * (0.35 + 0.2 * c.belly), bd, swim ? skin : topM, 0, torsoH * 0.18, torsoD / 2 + bd / 2 - 0.01)); }
  if (c.top === 'swimtop' && !adultF) torso.add(box(chestW * 1.02, torsoH * 0.16, torsoD * 1.04, topM, 0, torsoH * 0.72, 0)); // swim top band
  if (c.pants !== 'swim' && !['dress', 'trench', 'puffer'].includes(c.top)) { torso.add(box(torsoW * 1.01, 0.06, torsoD * 1.01, dark, 0, 0.02, 0)); // belt
  torso.add(box(0.08, 0.05, 0.02, metal, 0, 0.02, torsoD / 2 + 0.01)); } // buckle
  const fz = torsoD / 2;
  if (c.top === 'hoodie') {
    torso.add(box(torsoW * 0.78, 0.2, 0.16, topM, 0, torsoH - 0.02, -fz - 0.05));
    torso.add(box(torsoW * 0.6, torsoH * 0.22, 0.03, M(shade(c.topColor, 0.8)), 0, torsoH * 0.25, fz + 0.01));
    torso.add(box(0.015, 0.14, 0.015, white, -0.05, torsoH - 0.1, fz + 0.015));
    torso.add(box(0.015, 0.14, 0.015, white, 0.05, torsoH - 0.1, fz + 0.015));
  } else if (c.top === 'jacket') {
    torso.add(box(torsoW * 0.28, torsoH * 0.95, 0.02, acc, 0, torsoH / 2, fz + 0.005));
    torso.add(box(torsoW * 1.04, 0.22, torsoD * 1.04, topM, 0, -0.06, 0));
    torso.add(box(torsoW * 1.06, 0.06, torsoD * 1.06, M(shade(c.topColor, 0.75)), 0, torsoH - 0.02, 0));
  } else if (c.top === 'suit') {
    torso.add(box(torsoW * 0.3, torsoH * 0.95, 0.02, white, 0, torsoH / 2, fz + 0.005));
    torso.add(box(0.06, torsoH * 0.6, 0.025, acc, 0, torsoH * 0.62, fz + 0.012));
    torso.add(box(torsoW * 1.04, 0.2, torsoD * 1.04, topM, 0, -0.05, 0));
  } else if (c.top === 'armor') {
    torso.add(box(torsoW * 0.92, torsoH * 0.62, 0.07, acc, 0, torsoH * 0.6, fz + 0.03));
    torso.add(box(torsoW * 0.92, torsoH * 0.62, 0.07, acc, 0, torsoH * 0.6, -fz - 0.03));
    torso.add(box(torsoW * 0.3, 0.05, 0.02, dark, 0, torsoH * 0.62, fz + 0.07));
  } else if (c.top === 'tshirt') {
    torso.add(box(torsoW * 0.35, 0.04, 0.02, M(shade(c.topColor, 0.8)), 0, torsoH - 0.03, fz + 0.005));
  } else if (c.top === 'puffer') { // quilted bands puffing out, high collar
    for (let i = 0; i < 4; i++) torso.add(box(torsoW * 1.1, torsoH * 0.2, torsoD * 1.14, i % 2 ? topM : M(shade(c.topColor, 0.86)), 0, torsoH * (0.14 + i * 0.235), 0));
    torso.add(box(torsoW * 0.7, 0.14, torsoD * 1.0, topM, 0, torsoH + 0.02, 0)); torso.add(box(0.02, torsoH * 0.95, 0.02, metal, 0, torsoH / 2, fz * 1.14 + 0.01));
  } else if (c.top === 'tracksuit') {
    torso.add(box(0.018, torsoH * 0.95, 0.02, white, 0, torsoH / 2, fz + 0.008)); torso.add(box(torsoW * 0.5, 0.07, torsoD * 0.9, topM, 0, torsoH + 0.0, 0));
    for (const sx of [-1, 1]) torso.add(box(0.025, torsoH * 0.9, torsoD * 1.01, white, sx * torsoW * 0.5, torsoH / 2, 0));
  } else if (c.top === 'polo') {
    torso.add(box(torsoW * 0.5, 0.06, torsoD * 0.6, M(shade(c.topColor, 0.85)), 0, torsoH - 0.02, fz * 0.5)); torso.add(box(0.05, torsoH * 0.2, 0.015, M(shade(c.topColor, 0.8)), 0, torsoH * 0.86, fz + 0.006));
    for (let i = 0; i < 2; i++) torso.add(box(0.02, 0.02, 0.01, white, 0, torsoH * (0.82 + i * 0.07), fz + 0.012));
  } else if (c.top === 'leather') {
    torso.add(box(torsoW * 0.18, torsoH * 0.5, 0.025, acc, -torsoW * 0.16, torsoH * 0.72, fz + 0.006)); torso.add(box(0.02, torsoH * 0.9, 0.02, metal, torsoW * 0.12, torsoH * 0.48, fz + 0.012));
    torso.add(box(torsoW * 1.05, 0.08, torsoD * 1.05, M(shade(c.topColor, 0.7)), 0, torsoH - 0.03, 0)); torso.add(box(torsoW * 1.04, 0.1, torsoD * 1.04, topM, 0, -0.02, 0));
  } else if (c.top === 'trench') { // long coat: tails hang down over the thighs, belted
    torso.add(box(torsoW * 1.06, 0.06, torsoD * 1.06, M(shade(c.topColor, 0.75)), 0, torsoH * 0.3, 0)); torso.add(box(torsoW * 0.35, torsoH * 0.5, 0.02, M(shade(c.topColor, 0.85)), 0, torsoH * 0.75, fz + 0.008));
    hips.add(box(torsoW * 1.12, thighL * 0.85, torsoD * 1.16, topM, 0, -thighL * 0.4, 0));
  } else if (c.top === 'jersey') {
    torso.add(box(torsoW * 1.0, 0.06, torsoD * 1.02, white, 0, torsoH * 0.45, 0));
    torso.add(box(torsoW * 0.36, torsoH * 0.36, 0.02, white, 0, torsoH * 0.55, -fz - 0.006)); torso.add(box(torsoW * 0.1, torsoH * 0.28, 0.025, topM, 0, torsoH * 0.55, -fz - 0.012));
  } else if (c.top === 'dress') { // skirt part hangs from the hips down past the knee
    hips.add(box(torsoW * (1.1 + 0.2 * hipF), thighL * 1.05, torsoD * (1.25 + 0.1 * hipF), topM, 0, -thighL * 0.48, 0));
    torso.add(box(torsoW * 1.02, 0.05, torsoD * 1.02, acc, 0, torsoH * 0.05, 0));
  }
  if (c.neck === 'chain') { const g = M('#d4af37'); torso.add(box(torsoW * 0.42, 0.025, 0.02, g, 0, torsoH * 0.78, fz + 0.012)); torso.add(box(0.06, 0.07, 0.02, g, 0, torsoH * 0.7, fz + 0.016)); }
  if (c.neck === 'pearls') { const g = M('#f4f0e6'); torso.add(box(torsoW * 0.4, 0.03, 0.025, g, 0, torsoH * 0.86, fz + 0.012)); }
  if (c.neck === 'tie') { torso.add(box(0.05, torsoH * 0.62, 0.02, acc, 0, torsoH * 0.62, fz + 0.016)); torso.add(box(0.07, 0.06, 0.025, acc, 0, torsoH * 0.95, fz + 0.016)); }
  if (c.neck === 'scarf') { torso.add(box(torsoW * 0.62, 0.1, torsoD * 0.9, acc, 0, torsoH + 0.0, 0)); torso.add(box(0.1, torsoH * 0.45, 0.03, acc, torsoW * 0.15, torsoH * 0.72, fz + 0.02)); }

  // ---- neck & head ----
  torso.add(box(0.12 * sb, 0.1, 0.12 * sb, skin, 0, torsoH + 0.03, 0));
  let headW = hs, headH = hs, headD = hs;
  if (c.headShape === 'tall') { headW = hs * 0.9; headH = hs * 1.22; }
  if (c.headShape === 'wide') { headW = hs * 1.22; headH = hs * 0.92; }
  const head = new THREE.Group(); head.position.y = torsoH + 0.07 + headH / 2; torso.add(head);
  if (c.headShape === 'round') {
    const r = hs * 0.6;
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), skin); s.castShadow = true; head.add(s);
    headW = headH = r * 2 * 0.92; headD = r * 2 * 0.92;
  } else head.add(box(headW, headH, headD, skin));

  let faceZ = headD / 2 + 0.004;
  if (c.mask === 'ski') { head.add(box(headW * 1.06, headH * 1.04, headD * 1.06, acc, 0, 0, 0)); faceZ = headD * 0.53 + 0.006; }
  if (c.facialHair === 'beard' || c.facialHair === 'bigbeard') faceZ = Math.max(faceZ, headD * 0.53 + 0.006);

  // eyes
  const eyeY = headH * 0.08, eyeX = headW * 0.21;
  const eyeM = M(c.eyeColor, { emissive: c.eyes === 'robot' ? c.eyeColor : '#000000', emissiveIntensity: 0.9 });
  if (c.eyes === 'robot') {
    head.add(box(headW * 0.8, 0.07, 0.02, eyeM, 0, eyeY, faceZ));
  } else {
    const ew = c.eyes === 'wide' || c.fem ? 0.092 : 0.08, eh = c.eyes === 'wide' || c.fem ? 0.088 : c.eyes === 'sleepy' ? 0.035 : 0.075;
    for (const sx of [-1, 1]) {
      head.add(box(ew, eh, 0.01, white, sx * eyeX, eyeY, faceZ));
      head.add(box(ew * 0.5, Math.min(eh, 0.05), 0.012, eyeM, sx * eyeX + sx * 0.008, eyeY - 0.004, faceZ + 0.004));
      if (c.fem) {
        const g = c.glam ?? 0.5;
        head.add(box(ew * 1.18, 0.02, 0.014, dark, sx * eyeX, eyeY + eh / 2 + 0.008, faceZ + 0.006)); // lashes
        if (g > 0.35) { const wing = box(0.035, 0.016, 0.014, dark, sx * (eyeX + ew * 0.62), eyeY + eh / 2 + 0.004, faceZ + 0.006); wing.rotation.z = sx * 0.5; head.add(wing); }
        if (g > 0.55) head.add(box(0.06, 0.035, 0.008, M('#ff8fa8', { transparent: true, opacity: 0.45 }), sx * eyeX * 1.25, eyeY - 0.075, faceZ + 0.001)); // blush
      }
    }
  }
  if (c.hair !== 'none' || c.eyes === 'angry') {
    for (const sx of [-1, 1]) {
      const br = box(c.fem ? 0.09 : 0.1, c.fem ? 0.014 : 0.022, 0.016, hairM, sx * eyeX, eyeY + 0.075, faceZ + 0.004); if (c.fem) br.rotation.z = -sx * 0.12;
      br.rotation.z = c.eyes === 'angry' ? sx * 0.4 : 0;
      head.add(br); br.userData.sx = sx; br.userData.y0 = br.position.y; br.userData.r0 = br.rotation.z; (head.userData.brows ||= []).push(br);
    }
  }
  if (c.mask === 'none' || c.mask === 'ski') {
    if (c.headShape !== 'round' || true) head.add(box(c.fem ? 0.035 : 0.045, c.fem ? 0.05 : 0.07, c.fem ? 0.03 : 0.045, skin, 0, -headH * 0.04, faceZ + (c.fem ? 0.012 : 0.02)));
  }
  const mouthY = -headH * 0.24, mouthFrom = head.children.length;
  head.userData.rig = { mouthY, faceZ, fem: c.fem, lips: c.lips || '#b8325a', ok: c.mask === 'none' || c.mask === 'ski' };
  if (c.mask === 'none' || c.mask === 'ski') {
    if (c.mouth === 'neutral') head.add(box(0.1, 0.022, 0.01, dark, 0, mouthY, faceZ));
    if (c.mouth === 'open') head.add(box(0.08, 0.065, 0.01, dark, 0, mouthY, faceZ));
    if (c.mouth === 'smile' || c.mouth === 'frown') {
      const s = c.mouth === 'smile' ? 1 : -1;
      head.add(box(c.fem ? 0.075 : 0.07, c.fem ? 0.028 : 0.022, 0.01, c.fem ? M(c.lips || '#b8325a', { roughness: 0.25 }) : dark, 0, mouthY - 0.01 * s, faceZ));
      head.add(box(0.025, 0.022, 0.01, dark, -0.045, mouthY + 0.008 * s, faceZ));
      head.add(box(0.025, 0.022, 0.01, dark, 0.045, mouthY + 0.008 * s, faceZ));
    }
  }
  head.userData.rig.mouth = head.children.slice(mouthFrom);
  // facial hair
  const fh = c.fem ? 'none' : c.facialHair;
  if (fh === 'stubble') head.add(box(headW * 0.86, headH * 0.32, 0.012, M(c.hairColor, { transparent: true, opacity: 0.45 }), 0, -headH * 0.27, headD / 2 + 0.002));
  if (fh === 'beard') head.add(box(headW * 1.03, headH * 0.4, headD * 0.6, hairM, 0, -headH * 0.32, headD * 0.22));
  if (fh === 'bigbeard') head.add(box(headW * 1.08, headH * 0.75, headD * 0.62, hairM, 0, -headH * 0.48, headD * 0.22));
  if (fh === 'goatee') head.add(box(0.09, 0.1, 0.04, hairM, 0, -headH * 0.4, faceZ + 0.01));
  if (['moustache', 'goatee', 'beard', 'bigbeard'].includes(fh)) head.add(box(0.15, 0.035, 0.03, hairM, 0, -headH * 0.15, faceZ + 0.012));
  // eyewear
  const ewZ = faceZ + 0.02;
  if (c.eyewear === 'glasses') {
    const glass = M('#bfe8ff', { transparent: true, opacity: 0.35, roughness: 0.1 });
    for (const sx of [-1, 1]) {
      head.add(box(0.11, 0.09, 0.01, glass, sx * eyeX, eyeY, ewZ));
      head.add(box(0.12, 0.015, 0.012, dark, sx * eyeX, eyeY + 0.05, ewZ));
      head.add(box(0.12, 0.015, 0.012, dark, sx * eyeX, eyeY - 0.05, ewZ));
      head.add(box(0.012, headD * 0.5, 0.012, dark, sx * headW * 0.51, eyeY + 0.05, headD * 0.22).rotateX(Math.PI / 2));
    }
    head.add(box(0.05, 0.012, 0.012, dark, 0, eyeY + 0.03, ewZ));
  }
  if (c.eyewear === 'shades') head.add(box(headW * 0.82, 0.075, 0.025, M('#0b0b0f', { roughness: 0.1, metalness: 0.6 }), 0, eyeY, ewZ));
  if (c.eyewear === 'visor') head.add(box(headW * 0.98, 0.1, 0.03, M(c.accent, { transparent: true, opacity: 0.75, emissive: c.accent, emissiveIntensity: 0.6, roughness: 0.1 }), 0, eyeY, ewZ));
  if (c.eyewear === 'goggles') {
    head.add(box(headW * 1.06, 0.05, headD * 1.06, M(c.accent), 0, eyeY, 0));
    for (const sx of [-1, 1]) { const g = cyl(0.06, 0.06, 0.06, M('#ffb84d', { transparent: true, opacity: 0.7, roughness: 0.1 })); g.rotation.x = Math.PI / 2; g.position.set(sx * eyeX, eyeY, ewZ + 0.01); head.add(g); }
  }
  if (c.eyewear === 'patch') {
    head.add(box(0.1, 0.1, 0.02, dark, -eyeX, eyeY, ewZ));
    const strap = box(headW * 1.04, 0.02, headD * 1.04, dark, 0, eyeY + 0.04, 0); strap.rotation.z = 0.35; head.add(strap);
  }
  // masks
  if (c.mask === 'bandana') head.add(box(headW * 1.06, headH * 0.42, headD * 0.6, acc, 0, -headH * 0.26, headD * 0.22));
  if (c.mask === 'gasmask') {
    head.add(box(headW * 0.75, headH * 0.42, 0.1, dark, 0, -headH * 0.25, faceZ + 0.03));
    for (const sx of [-1, 1]) { const f = cyl(0.05, 0.05, 0.08, M('#55602f')); f.rotation.x = Math.PI / 2; f.rotation.z = sx * 0.6; f.position.set(sx * headW * 0.3, -headH * 0.32, faceZ + 0.1); head.add(f); }
  }

  // hair
  const hr = c.hair;
  const shortHair = () => {
    head.add(box(headW * 1.08, headH * 0.28, headD * 1.08, hairM, 0, headH * 0.42, 0));
    head.add(box(headW * 1.08, headH * 0.62, headD * 0.2, hairM, 0, headH * 0.1, -headD * 0.47));
    for (const sx of [-1, 1]) head.add(box(0.05, headH * 0.35, headD * 0.6, hairM, sx * headW * 0.52, headH * 0.2, -headD * 0.15));
  };
  if (hr === 'buzz') head.add(box(headW * 1.03, headH * 0.22, headD * 1.03, hairM, 0, headH * 0.41, 0));
  if (['short', 'spiky', 'long', 'ponytail', 'bun', 'quiff'].includes(hr)) shortHair();
  if (hr === 'spiky') for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), hairM);
    s.position.set((i % 3 - 1) * headW * 0.32, headH * 0.6, (Math.floor(i / 3) - 0.5) * headD * 0.45);
    s.rotation.set((Math.floor(i / 3) - 0.5) * -0.6, 0, (i % 3 - 1) * -0.4); s.castShadow = true; head.add(s);
  }
  if (hr === 'quiff') { const q = box(headW * 0.9, headH * 0.28, headD * 0.45, hairM, 0, headH * 0.6, headD * 0.3); q.rotation.x = -0.35; head.add(q); }
  if (hr === 'long') {
    head.add(box(headW * 1.12, headH * 1.35, headD * 0.22, hairM, 0, -headH * 0.22, -headD * 0.5));
    for (const sx of [-1, 1]) head.add(box(0.07, headH * 0.95, headD * 0.45, hairM, sx * headW * 0.54, -headH * 0.05, -headD * 0.15));
  }
  if (hr === 'bob') {
    head.add(box(headW * 1.12, headH * 0.3, headD * 1.1, hairM, 0, headH * 0.42, 0));
    for (const sx of [-1, 1]) head.add(box(0.08, headH * 0.85, headD * 0.95, hairM, sx * headW * 0.55, 0.0, -0.01));
    head.add(box(headW * 1.12, headH * 0.85, 0.1, hairM, 0, 0, -headD * 0.53));
    head.add(box(headW * 1.04, headH * 0.16, 0.06, hairM, 0, headH * 0.34, headD * 0.5));
  }
  if (hr === 'ponytail') {
    head.add(box(0.07, 0.07, 0.07, acc, 0, headH * 0.15, -headD * 0.6));
    const t = box(0.1, headH * 0.9, 0.1, hairM, 0, -headH * 0.25, -headD * 0.65); t.rotation.x = 0.2; head.add(t);
  }
  if (hr === 'bun') { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(headH * 0.24, 0), hairM); s.position.set(0, headH * 0.58, -headD * 0.3); s.castShadow = true; head.add(s); }
  if (hr === 'mohawk') for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 4), hairM);
    s.position.set(0, headH * 0.6, (i / 4 - 0.5) * headD * 0.95); s.rotation.x = (i / 4 - 0.5) * -0.8; s.castShadow = true; head.add(s);
  }
  if (hr === 'afro') { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(headW * 0.8, 1), hairM); s.scale.set(1, 0.95, 0.82); s.position.set(0, headH * 0.4, -headD * 0.3); s.castShadow = true; head.add(s); } // sits up and back so the face shows

  // hats
  const ht = c.hat, top = headH / 2;
  if (ht === 'cap') {
    head.add(box(headW * 1.1, headH * 0.3, headD * 1.1, hatM, 0, top - headH * 0.05, 0));
    head.add(box(headW * 1.0, 0.03, headD * 0.5, hatM, 0, top - headH * 0.17, headD * 0.65));
    head.add(box(0.05, 0.03, 0.05, acc, 0, top + headH * 0.11, 0));
  }
  if (ht === 'snapback') {
    head.add(box(headW * 1.1, headH * 0.3, headD * 1.1, hatM, 0, top - headH * 0.05, 0));
    head.add(box(headW * 1.0, 0.03, headD * 0.5, hatM, 0, top - headH * 0.17, -headD * 0.65));
    head.add(box(headW * 0.3, 0.05, 0.02, acc, 0, top - headH * 0.12, -headD * 0.56));
  }
  if (ht === 'bucket') {
    head.add(box(headW * 1.08, headH * 0.34, headD * 1.08, hatM, 0, top - headH * 0.02, 0));
    const brim = cyl(headW * 0.85, headW * 0.95, 0.06, hatM, 12); brim.position.y = top - headH * 0.17; head.add(brim);
  }
  if (ht === 'durag') {
    head.add(box(headW * 1.06, headH * 0.36, headD * 1.06, hatM, 0, top - headH * 0.08, 0));
    head.add(box(headW * 0.2, headH * 0.5, 0.04, hatM, 0, top - headH * 0.55, -headD * 0.56));
  }
  if (ht === 'beret') {
    const b = cyl(headW * 0.62, headW * 0.68, 0.08, hatM, 12); b.position.set(headW * 0.08, top + 0.02, 0); b.rotation.z = -0.18; head.add(b);
  }
  if (ht === 'beanie') {
    head.add(box(headW * 1.12, headH * 0.45, headD * 1.12, hatM, 0, top - headH * 0.12, 0));
    head.add(box(headW * 1.16, headH * 0.14, headD * 1.16, M(shade(c.hatColor, 0.8)), 0, top - headH * 0.3, 0));
    const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), acc); p.position.y = top + headH * 0.16; head.add(p);
  }
  if (ht === 'helmet') {
    head.add(box(headW * 1.2, headH * 0.55, headD * 1.2, hatM, 0, top - headH * 0.2, 0));
    head.add(box(headW * 1.26, 0.04, headD * 1.26, M(shade(c.hatColor, 0.75)), 0, top - headH * 0.45, 0));
  }
  if (ht === 'cowboy') {
    const brim = cyl(headW * 0.98, headW * 0.98, 0.03, hatM, 14); brim.position.y = top + 0.0; head.add(brim);
    head.add(box(headW * 0.85, headH * 0.42, headD * 0.8, hatM, 0, top + headH * 0.2, 0));
    head.add(box(headW * 0.87, 0.04, headD * 0.82, acc, 0, top + 0.03, 0));
  }
  if (ht === 'tophat') {
    const brim = cyl(headW * 0.75, headW * 0.75, 0.03, hatM, 14); brim.position.y = top + 0.0; head.add(brim);
    const crown = cyl(headW * 0.46, headW * 0.46, headH * 0.85, hatM, 14); crown.position.y = top + headH * 0.42; head.add(crown);
    const band = cyl(headW * 0.47, headW * 0.47, 0.05, acc, 14); band.position.y = top + 0.05; head.add(band);
  }
  if (ht === 'headband') {
    head.add(box(headW * 1.05, headH * 0.13, headD * 1.05, hatM, 0, headH * 0.26, 0));
    for (const s of [-1, 1]) { const t = box(0.04, 0.18, 0.02, hatM, s * 0.03, headH * 0.15, -headD * 0.56); t.rotation.z = s * 0.3; head.add(t); }
  }
  if (ht === 'crown') {
    const gold = M('#e6b422', { metalness: 0.9, roughness: 0.25 });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(headW * 0.5, headW * 0.5, headH * 0.2, 10, 1, true), gold);
    ring.material.side = THREE.DoubleSide; ring.position.y = top + headH * 0.08; head.add(ring);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2, s = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 4), gold);
      s.position.set(Math.sin(a) * headW * 0.48, top + headH * 0.22, Math.cos(a) * headW * 0.48); head.add(s);
    }
    const gem = box(0.04, 0.04, 0.02, M(c.accent, { emissive: c.accent, emissiveIntensity: 0.4 }), 0, top + headH * 0.08, headW * 0.5); head.add(gem);
  }
  if (ht === 'horns') for (const s of [-1, 1]) {
    const hn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), hatM);
    hn.position.set(s * headW * 0.4, top + 0.08, 0); hn.rotation.z = -s * 0.5; hn.castShadow = true; head.add(hn);
  }
  if (ht === 'halo') {
    const t = new THREE.Mesh(new THREE.TorusGeometry(headW * 0.38, 0.025, 6, 20), M(c.hatColor, { emissive: c.hatColor, emissiveIntensity: 0.9 }));
    t.rotation.x = Math.PI / 2; t.position.y = top + 0.12; head.add(t);
  }
  if (ht === 'antenna') {
    const st = cyl(0.01, 0.01, 0.22, metal, 6); st.position.y = top + 0.11; head.add(st);
    const bl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.04, 1), M(c.hatColor, { emissive: c.hatColor, emissiveIntensity: 0.8 })); bl.position.y = top + 0.24; head.add(bl);
  }

  // ---- arms ----
  const shoulderY = torsoH - 0.07;
  const upperM = c.top === 'tank' || swim ? skin : topM;
  const lowerM = longSleeve ? topM : skin;
  const makeArm = (side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * (torsoW / 2 + limbW / 2 + 0.005), shoulderY, 0);
    pivot.rotation.order = 'YXZ';
    pivot.add(box(limbW, armLen * 0.5, limbW, upperM, 0, -armLen * 0.25, 0));
    // forearm hangs off an elbow so arms can bend (phone to the ear, etc.); straight by default
    const elbow = new THREE.Group(); elbow.position.y = -armLen * 0.5; pivot.add(elbow);
    elbow.add(box(limbW * 0.92, armLen * 0.42, limbW * 0.92, lowerM, 0, -armLen * 0.21, 0));
    if (longSleeve && c.gloves !== 'gloves') elbow.add(box(limbW * 0.96, 0.04, limbW * 0.96, M(shade(c.topColor, 0.8)), 0, -armLen * 0.4, 0));
    elbow.add(box(limbW * 1.05, armLen * 0.12, limbW * 1.05, handM, 0, -armLen * 0.46, 0));
    if (c.top === 'armor') pivot.add(box(limbW * 1.4, 0.08, limbW * 1.4, acc, 0, 0.0, 0));
    const hand = new THREE.Group(); hand.position.y = -armLen * 0.46; elbow.add(hand);
    torso.add(pivot);
    return { pivot, hand, elbow };
  };
  const armR = makeArm(-1), armL = makeArm(1);

  // ---- legs ----
  const skirtLike = c.pants === 'skirt' || c.pants === 'longskirt' || c.top === 'dress';
  const shinM = c.pants === 'shorts' || c.pants === 'swim' || (c.top === 'dress' && c.pants !== 'leggings') ? skin : pantsM;
  const makeLeg = (side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * torsoW * (0.24 + 0.035 * hipF), 0, 0); hips.add(pivot);
    const tw = legW * (1 + 0.18 * hipF);
    if (skirtLike && c.pants !== 'leggings') pivot.add(box(tw * 0.96, thighL, tw * 0.96, c.pants === 'longskirt' ? pantsM : skin, 0, -thighL / 2, 0));
    else if (c.pants === 'leggings') pivot.add(box(tw * 0.9, thighL, tw * 0.9, pantsM, 0, -thighL / 2, 0));
    else if (c.pants === 'swim') { pivot.add(box(tw, thighL * 0.22, tw, pantsM, 0, -thighL * 0.11, 0)); pivot.add(box(tw * 0.98, thighL * 0.78, tw * 0.98, skin, 0, -thighL * 0.61, 0)); }
    else pivot.add(box(tw, thighL, tw, pantsM, 0, -thighL / 2, 0));
    if (c.pants === 'cargo') pivot.add(box(0.03, thighL * 0.35, legW * 0.6, M(shade(c.pantsColor, 0.8)), side * (legW / 2 + 0.01), -thighL * 0.55, 0));
    if (c.pants === 'shorts') pivot.add(box(legW * 1.08, 0.05, legW * 1.08, M(shade(c.pantsColor, 0.8)), 0, -thighL + 0.03, 0));
    if (c.pants === 'joggers') pivot.add(box(0.025, thighL * 0.95, legW * 0.3, white, side * (tw / 2 + 0.005), -thighL / 2, 0));
    const knee = new THREE.Group(); knee.position.y = -thighL; pivot.add(knee);
    knee.add(box(legW * 0.92, shinL, legW * 0.92, shinM, 0, -shinL / 2, 0));
    if (c.pants === 'armored') knee.add(box(legW * 1.15, 0.12, 0.06, acc, 0, -0.04, legW / 2 + 0.02));
    if (c.pants === 'joggers') { knee.add(box(0.025, shinL * 0.85, legW * 0.3, white, side * (legW * 0.46 + 0.005), -shinL * 0.45, 0)); knee.add(box(legW * 0.98, 0.06, legW * 0.98, M(shade(c.pantsColor, 0.75)), 0, -shinL + 0.12, 0)); }
    if (c.shoes === 'boots') knee.add(box(legW * 1.08, 0.24, legW * 1.6, shoeM, 0, -shinL + 0.12, legW * 0.25));
    else if (c.shoes === 'sneakers') {
      knee.add(box(legW * 1.05, 0.1, legW * 1.7, shoeM, 0, -shinL + 0.05, legW * 0.3));
      knee.add(box(legW * 1.07, 0.03, legW * 1.72, M(shade(c.shoeColor, 0.7)), 0, -shinL + 0.015, legW * 0.3));
    } else if (c.shoes === 'hightops') {
      knee.add(box(legW * 1.08, 0.2, legW * 1.65, shoeM, 0, -shinL + 0.1, legW * 0.28)); knee.add(box(legW * 1.1, 0.035, legW * 1.7, white, 0, -shinL + 0.018, legW * 0.28)); knee.add(box(legW * 1.1, 0.04, 0.03, white, 0, -shinL + 0.14, legW * 1.1));
    } else if (c.shoes === 'heels') {
      knee.add(box(legW * 0.9, 0.06, legW * 1.35, shoeM, 0, -shinL + 0.06, legW * 0.3)); knee.add(box(0.03, 0.08, 0.03, shoeM, 0, -shinL + 0.02, -legW * 0.2));
    } else if (c.shoes === 'loafers') {
      knee.add(box(legW * 1.0, 0.08, legW * 1.6, shoeM, 0, -shinL + 0.04, legW * 0.3)); knee.add(box(legW * 0.6, 0.02, 0.05, metal, 0, -shinL + 0.08, legW * 0.75));
    } else if (c.shoes === 'sandals') {
      knee.add(box(legW * 0.95, 0.07, legW * 1.4, skin, 0, -shinL + 0.035, legW * 0.2)); knee.add(box(legW * 1.0, 0.025, legW * 1.45, shoeM, 0, -shinL + 0.012, legW * 0.2)); knee.add(box(legW * 1.0, 0.03, 0.04, shoeM, 0, -shinL + 0.07, legW * 0.5));
    } else knee.add(box(legW * 0.95, 0.07, legW * 1.4, skin, 0, -shinL + 0.035, legW * 0.2));
    return { pivot, knee };
  };
  const legR = makeLeg(-1), legL = makeLeg(1);

  // ---- back ----
  let cape = null, flame = null;
  const bk = c.back, bz = -torsoD / 2;
  if (bk === 'backpack') {
    torso.add(box(torsoW * 0.8, torsoH * 0.7, 0.18, backM, 0, torsoH * 0.5, bz - 0.09));
    torso.add(box(torsoW * 0.6, torsoH * 0.25, 0.06, M(shade(c.backColor, 0.8)), 0, torsoH * 0.3, bz - 0.2));
  }
  if (bk === 'cape') {
    cape = new THREE.Group(); cape.position.set(0, torsoH, bz - 0.02); torso.add(cape);
    const len = torsoH + legLen * 0.7;
    cape.add(box(torsoW * 1.05, len, 0.025, backM, 0, -len / 2, 0));
  }
  if (bk === 'sword') {
    const s = new THREE.Group(); s.position.set(0, torsoH * 0.5, bz - 0.06); s.rotation.z = 0.7; torso.add(s);
    s.add(box(0.07, 0.75, 0.03, metal, 0, 0.1, 0));
    s.add(box(0.2, 0.04, 0.05, backM, 0, -0.3, 0));
    s.add(box(0.04, 0.16, 0.04, dark, 0, -0.4, 0));
  }
  if (bk === 'jetpack') {
    for (const sx of [-1, 1]) {
      const t = cyl(0.08, 0.08, torsoH * 0.8, backM); t.position.set(sx * 0.1, torsoH * 0.5, bz - 0.1); torso.add(t);
      const n = cyl(0.05, 0.08, 0.08, metal); n.position.set(sx * 0.1, torsoH * 0.06, bz - 0.1); torso.add(n);
    }
    flame = new THREE.Group(); flame.position.set(0, torsoH * 0.02, bz - 0.1); torso.add(flame);
    const fm = new THREE.MeshBasicMaterial({ color: '#ffb02e', transparent: true, opacity: 0.9 });
    for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 6), fm); f.rotation.x = Math.PI; f.position.set(sx * 0.1, -0.18, 0); flame.add(f); }
    flame.visible = false;
  }
  if (bk === 'wings') {
    for (const sx of [-1, 1]) {
      const w = new THREE.Group(); w.position.set(sx * 0.08, torsoH * 0.7, bz - 0.04); w.rotation.set(0, sx * 0.5, sx * -0.5); torso.add(w);
      w.add(box(0.6, 0.06, 0.02, backM, sx * 0.3, 0, 0));
      w.add(box(0.5, 0.05, 0.02, backM, sx * 0.25, -0.12, 0).rotateZ(sx * -0.2));
      w.add(box(0.38, 0.05, 0.02, backM, sx * 0.19, -0.24, 0).rotateZ(sx * -0.4));
      w.userData.side = sx; (root.userData.wings ||= []).push(w);
    }
  }

  addTattoos(c, { armR, armL, torso, head, limbW, armLen, torsoH, torsoW, torsoD, sb, hs, headW, headH, faceZ, bareUpper: upperM === skin, bareFore: !longSleeve, bareHands: c.gloves !== 'gloves', bareChest: c.top === 'shirtless' });
  const height = legLen + 0.08 + torsoH + 0.07 + headH;
  return {
    root, hips, torso, head, armL, armR, legL, legR, cape, flame,
    hand: armR.hand, height, legLen, shoulderH: legLen + 0.08 + shoulderY, width: torsoW + limbW * 2,
    back: bk, wings: root.userData.wings || null,
  };
}


// ---- tattoos: small ink decals on bare skin (only show where clothes don't cover) ----
export const TATTOO_DESIGNS = { rose: 'Rose', skull: 'Skull', heart: 'Heart', anchor: 'Anchor', dagger: 'Dagger', snake: 'Snake', crown: 'Crown', swallow: 'Swallow', dice: 'Dice', flame: 'Flames', bolt: 'Lightning', compass: 'Compass', mom: '"MOM"', loyal: '"LOYAL"', tribal: 'Tribal band', money: 'Money bag', eye: 'Eye', cross: 'Cross', tear: 'Teardrop', web: 'Spider web', clock: 'Clock', seven: 'Lucky 7', wings: 'Wings', moon: 'Moon' };
export const TATTOO_SPOTS = { armR: 'Right upper arm', armL: 'Left upper arm', foreR: 'Right forearm', foreL: 'Left forearm', handR: 'Right hand', handL: 'Left hand', neck: 'Neck', face: 'Face', chest: 'Chest', back: 'Back' };
const TAT_TEX = new Map();
export function tattooCanvas(design, ink = '#1c2333') {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.strokeStyle = x.fillStyle = ink; x.lineWidth = 4; x.lineCap = x.lineJoin = 'round';
  const P = (...pts) => { x.beginPath(); x.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]); };
  const C = (cx, cy, r, f) => { x.beginPath(); x.arc(cx, cy, r, 0, 7); f ? x.fill() : x.stroke(); };
  const T = (s, sz) => { x.font = `900 ${sz}px Georgia, serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, 32, 33); };
  switch (design) {
    case 'rose': C(32, 24, 12); C(32, 24, 5); P(32, 36, 32, 58); x.stroke(); P(32, 46, 20, 40); x.stroke(); P(32, 50, 44, 44); x.stroke(); break;
    case 'skull': C(32, 28, 16); x.fillStyle = ink; C(25, 27, 4, 1); C(39, 27, 4, 1); P(32, 32, 29, 37, 35, 37); x.fill(); P(24, 44, 24, 52, 40, 52, 40, 44); x.stroke(); P(30, 46, 30, 52); x.stroke(); P(34, 46, 34, 52); x.stroke(); break;
    case 'heart': P(32, 54, 10, 32); x.bezierCurveTo(2, 20, 22, 6, 32, 20); x.bezierCurveTo(42, 6, 62, 20, 54, 32); x.lineTo(32, 54); x.fill(); break;
    case 'anchor': C(32, 12, 5); P(32, 17, 32, 56); x.stroke(); P(22, 26, 42, 26); x.stroke(); x.beginPath(); x.arc(32, 40, 16, 0.2, Math.PI - 0.2); x.stroke(); break;
    case 'dagger': P(32, 6, 37, 14, 37, 40, 27, 40, 27, 14); x.closePath(); x.stroke(); P(20, 40, 44, 40); x.stroke(); P(32, 40, 32, 56); x.lineWidth = 7; x.stroke(); break;
    case 'snake': x.beginPath(); x.moveTo(14, 56); x.bezierCurveTo(60, 50, 4, 30, 46, 18); x.stroke(); C(48, 16, 4, 1); break;
    case 'crown': P(10, 46, 14, 18, 24, 32, 32, 14, 40, 32, 50, 18, 54, 46); x.closePath(); x.stroke(); P(12, 52, 52, 52); x.stroke(); break;
    case 'swallow': P(8, 30, 30, 26, 46, 14, 40, 30, 58, 34, 40, 38, 30, 52, 28, 36); x.closePath(); x.fill(); break;
    case 'dice': x.strokeRect(12, 12, 40, 40); for (const [a, b] of [[22, 22], [42, 42], [32, 32], [42, 22], [22, 42]]) C(a, b, 3.5, 1); break;
    case 'flame': x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(8, 50, 14, 24, 28, 8); x.bezierCurveTo(30, 24, 40, 22, 40, 14); x.bezierCurveTo(56, 30, 54, 52, 32, 56); x.stroke(); break;
    case 'bolt': P(38, 6, 18, 36, 30, 36, 24, 58, 46, 26, 34, 26, 40, 6); x.closePath(); x.fill(); break;
    case 'compass': C(32, 32, 22); P(32, 12, 37, 32, 32, 52, 27, 32); x.closePath(); x.fill(); break;
    case 'mom': x.strokeRect(6, 18, 52, 28); T('MOM', 18); break;
    case 'loyal': T('LOYAL', 15); P(8, 46, 56, 46); x.lineWidth = 2; x.stroke(); break;
    case 'tribal': x.lineWidth = 6; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(4, 20 + i * 12); x.bezierCurveTo(20, 8 + i * 12, 44, 32 + i * 12, 60, 20 + i * 12); x.stroke(); } break;
    case 'money': C(32, 38, 17); P(26, 20, 38, 20, 42, 12, 22, 12); x.closePath(); x.stroke(); T('$', 22); x.textBaseline = 'middle'; break;
    case 'eye': x.beginPath(); x.moveTo(6, 32); x.quadraticCurveTo(32, 8, 58, 32); x.quadraticCurveTo(32, 56, 6, 32); x.stroke(); C(32, 32, 8, 1); break;
    case 'cross': x.lineWidth = 7; P(32, 8, 32, 58); x.stroke(); P(18, 22, 46, 22); x.stroke(); break;
    case 'tear': x.beginPath(); x.moveTo(32, 10); x.bezierCurveTo(48, 34, 46, 54, 32, 54); x.bezierCurveTo(18, 54, 16, 34, 32, 10); x.fill(); break;
    case 'web': for (let a = 0; a < 6; a++) { P(32, 32, 32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28); x.lineWidth = 2; x.stroke(); } for (const r of [9, 17, 25]) C(32, 32, r); break;
    case 'clock': C(32, 32, 22); P(32, 32, 32, 16); x.stroke(); P(32, 32, 44, 38); x.stroke(); break;
    case 'seven': x.font = '900 48px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('7', 32, 34); break;
    case 'wings': for (const s of [-1, 1]) { x.beginPath(); x.moveTo(32, 34); x.bezierCurveTo(32 + s * 10, 14, 32 + s * 28, 12, 32 + s * 30, 22); x.bezierCurveTo(32 + s * 22, 30, 32 + s * 18, 40, 32, 34); x.fill(); } break;
    case 'moon': x.beginPath(); x.arc(32, 32, 22, 0.6, Math.PI * 2 - 0.6); x.arc(42, 32, 16, Math.PI * 2 - 1.1, 1.1, true); x.fill(); break;
  }
  return c;
}
function tattooMat(design, ink) {
  const k = design + ink; if (!TAT_TEX.has(k)) { const t = new THREE.CanvasTexture(tattooCanvas(design, ink)); t.colorSpace = THREE.SRGBColorSpace; TAT_TEX.set(k, new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 })); }
  return TAT_TEX.get(k);
}
function addTattoos(c, P) {
  for (const t of c.tattoos || []) {
    const s = t.spot, m = tattooMat(t.design, t.ink || '#1c2333'), plane = (w, hh) => new THREE.Mesh(new THREE.PlaneGeometry(w, hh), m);
    let p = null;
    if ((s === 'armR' || s === 'armL') && P.bareUpper) { const side = s === 'armR' ? -1 : 1, A = s === 'armR' ? P.armR : P.armL; p = plane(P.limbW * 0.95, P.armLen * 0.34); p.position.set(side * (P.limbW / 2 + 0.004), -P.armLen * 0.25, 0); p.rotation.y = side * Math.PI / 2; A.pivot.add(p); }
    else if ((s === 'foreR' || s === 'foreL') && P.bareFore) { const A = s === 'foreR' ? P.armR : P.armL; p = plane(P.limbW * 0.85, P.armLen * 0.3); p.position.set(0, -P.armLen * 0.2, P.limbW * 0.46 + 0.004); A.elbow.add(p); }
    else if ((s === 'handR' || s === 'handL') && P.bareHands) { const A = s === 'handR' ? P.armR : P.armL; p = plane(P.limbW * 0.95, P.armLen * 0.11); p.position.set(0, -P.armLen * 0.46, P.limbW * 1.05 / 2 + 0.004); A.elbow.add(p); }
    else if (s === 'neck') { p = plane(0.1, 0.09); p.position.set(0, P.torsoH + 0.03, 0.06 * P.sb + 0.004); P.torso.add(p); }
    else if (s === 'face') { p = plane(P.hs * 0.24, P.hs * 0.24); p.position.set(-P.headW * 0.3, -P.headH * 0.12, P.faceZ + 0.003); P.head.add(p); }
    else if (s === 'chest' && P.bareChest) { p = plane(P.torsoW * 0.5, P.torsoH * 0.32); p.position.set(0, P.torsoH * 0.68, P.torsoD / 2 + 0.006); P.torso.add(p); }
    else if (s === 'back' && P.bareChest) { p = plane(P.torsoW * 0.62, P.torsoH * 0.42); p.position.set(0, P.torsoH * 0.6, -P.torsoD / 2 - 0.006); p.rotation.y = Math.PI; P.torso.add(p); }
    if (p) { p.renderOrder = 2; p.userData.ink = t.ink || '#1c2333'; p.scale.setScalar(1); }
  }
}

// state: { phase, speed (0..1), air, vy, aim (rad, + up), recoil (0..1), t }
export function poseCharacter(ch, s) {
  const sp = Math.min(1, s.speed || 0), ph = s.phase || 0, t = s.t || 0;
  const aim = s.aim || 0, rec = s.recoil || 0;
  ch.hips.position.y = ch.legLen + (s.air ? 0 : Math.abs(Math.sin(ph)) * 0.05 * sp) + Math.sin(t * 2) * 0.005;
  if (s.air) {
    ch.legL.pivot.rotation.x = -0.7; ch.legL.knee.rotation.x = 1.1;
    ch.legR.pivot.rotation.x = 0.2; ch.legR.knee.rotation.x = 0.5;
  } else {
    ch.legL.pivot.rotation.x = -Math.sin(ph) * 0.75 * sp;
    ch.legR.pivot.rotation.x = Math.sin(ph) * 0.75 * sp;
    ch.legL.knee.rotation.x = Math.max(0, Math.sin(ph - 1.2)) * 1.1 * sp + 0.02;
    ch.legR.knee.rotation.x = Math.max(0, -Math.sin(ph - 1.2)) * 1.1 * sp + 0.02;
  }
  ch.torso.rotation.x = 0.12 * sp;
  ch.torso.rotation.y = 0;
  // Both arms hold the gun out along the aim direction.
  ch.armR.pivot.rotation.set(-(Math.PI / 2 + aim) - rec * 0.35 - 0.12 * sp, 0.12, 0);
  ch.armL.pivot.rotation.set(-(Math.PI / 2 + aim) - rec * 0.3 - 0.12 * sp + 0.15, -0.5, 0);
  ch.head.rotation.x = -aim * 0.4 - 0.1 * sp;
  if (ch.cape) ch.cape.rotation.x = 0.15 + sp * 0.6 + Math.sin(t * 6) * 0.06 * (0.3 + sp) + (s.air ? 0.5 : 0);
  if (ch.flame) { ch.flame.visible = !!s.jet; ch.flame.scale.y = 0.7 + Math.random() * 0.6; }
  if (ch.wings) for (const w of ch.wings) { const sx = w.userData.side; w.rotation.z = sx * (-0.5 + (s.glide ? Math.sin(t * 18) * 0.4 : Math.sin(t * 2) * 0.05)); }
}

export function disposeObject(obj) {
  const mats = new Set();
  obj.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m));
  });
  mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
}

// ---- talking faces: a mouth that opens with speech and an expression (brows + mouth corners) ----
// expr: neutral | happy | angry | sad | shock | flirty
export function setFace(ch, expr = 'neutral', open = 0) {
  const head = ch.head, R = head.userData.rig; if (!R || !R.ok) return;
  if (!R.m) { // build our own mouth once and hide the static one
    for (const m of R.mouth) m.visible = false;
    const dark = new THREE.MeshStandardMaterial({ color: '#2a1416', roughness: 0.6 }), lip = R.fem ? new THREE.MeshStandardMaterial({ color: R.lips, roughness: 0.3 }) : dark;
    const mk = (w, h, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.012), mat); head.add(m); return m; };
    R.m = { in: mk(0.07, 0.04, new THREE.MeshStandardMaterial({ color: '#5a1a22', roughness: 0.7 })), top: mk(R.fem ? 0.075 : 0.07, R.fem ? 0.02 : 0.016, lip), bot: mk(R.fem ? 0.07 : 0.065, R.fem ? 0.024 : 0.016, lip), l: mk(0.022, 0.018, dark), r: mk(0.022, 0.018, dark) };
  }
  const M = R.m, y = R.mouthY, z = R.faceZ + 0.002;
  const cu = { happy: 0.012, flirty: 0.01, sad: -0.012, angry: -0.004, shock: 0, neutral: 0.002 }[expr] ?? 0;
  const o = Math.max(0, Math.min(1, open)) * (expr === 'shock' ? 1 : 0.8) + (expr === 'shock' ? 0.5 : 0), h = 0.004 + o * 0.05, w = expr === 'shock' ? 0.05 : expr === 'happy' ? 0.08 : 0.068;
  M.in.position.set(0, y - h / 2 + 0.002, z - 0.002); M.in.scale.set(w / 0.07, Math.max(0.05, h / 0.04), 1); M.in.visible = h > 0.006;
  M.top.position.set(0, y + 0.004, z); M.top.scale.x = w / 0.07; M.bot.position.set(0, y - h - 0.004 + (expr === 'happy' && o < 0.2 ? 0.006 : 0), z); M.bot.scale.x = (w * 0.9) / 0.065;
  M.l.position.set(-w / 2 - 0.006, y - h / 2 + cu, z); M.r.position.set(w / 2 + 0.006, y - h / 2 + cu, z);
  M.l.rotation.z = cu * 25; M.r.rotation.z = -cu * 25;
  for (const b of head.userData.brows || []) { const sx = b.userData.sx; b.rotation.z = expr === 'angry' ? sx * 0.45 : expr === 'sad' ? -sx * 0.35 : expr === 'flirty' ? (sx > 0 ? -0.25 : 0) : b.userData.r0; b.position.y = b.userData.y0 + (expr === 'shock' ? 0.025 : expr === 'flirty' && sx > 0 ? 0.015 : expr === 'angry' ? -0.008 : 0); }
}
