// Everything you can walk or drive up to: shops, barbers, property, dealers, minigames, chop shop, race.
import { blockSide } from './world.js';

const S = (city, i, j, side) => blockSide(city, i, j, side);

export const PLACES = [
  // ---- dealers (the money loop)
  { id: 'd_dt', kind: 'dealer', name: 'Downtown Dealer', icon: '💊', ...S('main', 1, -1, 's'), area: 'downtown' },
  { id: 'd_beach', kind: 'dealer', name: 'Boardwalk Dealer', icon: '💊', x: -40, z: 368, area: 'beach' },
  { id: 'd_east', kind: 'dealer', name: 'Eastport Dealer', icon: '💊', ...S('east', 1, 1, 'w'), area: 'east' },
  { id: 'd_north', kind: 'dealer', name: 'Northfield Dealer', icon: '💊', ...S('north', -2, 0, 's'), area: 'north' },
  { id: 'd_hills', kind: 'dealer', name: 'Canyon Dealer', icon: '💊', x: -360, z: -10, area: 'hills' },
  { id: 'd_air', kind: 'dealer', name: 'Hangar Dealer', icon: '💊', x: 228, z: -622, area: 'airport' },
  { id: 'd_farm', kind: 'dealer', name: 'Farm Road Dealer', icon: '💊', x: 372, z: -10, area: 'farm' },
  { id: 'd_ghetto', kind: 'dealer', name: 'Southside Dealer', icon: '💊', ...S('main', -5, 4, 'e'), area: 'downtown' },

  // ---- clothes shops
  { id: 'c_street', kind: 'clothes', name: 'Street Kings', icon: '👕', style: 'street', ...S('main', 0, 0, 's') },
  { id: 'c_luxe', kind: 'clothes', name: 'Rodeo Luxe', icon: '👔', style: 'luxe', ...S('main', 2, -3, 's') },
  { id: 'c_surf', kind: 'clothes', name: 'Venice Surf Co.', icon: '🩳', style: 'surf', ...S('main', 1, 6, 's') },
  { id: 'c_work', kind: 'clothes', name: 'Northfield Workwear', icon: '🦺', style: 'work', ...S('north', 1, -1, 's') },
  { id: 'c_vintage', kind: 'clothes', name: 'Eastport Thrift', icon: '🧥', style: 'vintage', ...S('east', -1, -1, 's') },

  // ---- barbers
  { id: 'b_fade', kind: 'barber', name: 'Fade Factory', icon: '💈', ...S('main', -1, 0, 'e') },
  { id: 'b_shore', kind: 'barber', name: 'Shore Cuts', icon: '💈', ...S('main', -2, 6, 's') },
  { id: 'b_east', kind: 'barber', name: 'Eastport Clippers', icon: '💈', ...S('east', 0, 0, 's') },

  // ---- minigames
  { id: 'g_taco', kind: 'game', game: 'taco', name: 'Taco Rush', icon: '🌮', desc: 'Work the taco truck. Fill orders fast.', x: 70, z: 364 },
  { id: 'g_gallery', kind: 'game', game: 'gallery', name: 'Pier Shooting Gallery', icon: '🎯', desc: 'Pop the ducks, dodge the bombs.', x: 94, z: 486 },
  { id: 'g_surf', kind: 'game', game: 'surf', name: 'Bay Surf School', icon: '🏄', desc: 'Ride the wave. Stay in the sweet spot.', x: -160, z: 392 },
  { id: 'g_gym', kind: 'game', game: 'gym', name: 'Muscle Beach', icon: '🏋️', desc: 'Pump iron. Tap fast. Get swole.', x: 230, z: 378 },
  { id: 'g_club', kind: 'game', game: 'beat', name: 'Neon Room', icon: '🎧', desc: 'DJ the club. Hit the beats.', ...S('main', -2, -1, 's') },
  { id: 'g_hoops', kind: 'game', game: 'hoops', name: 'Venice Courts', icon: '🏀', desc: 'Flick to shoot. Sink as many as you can.', x: -96, z: 366 },

  // ---- car activities
  { id: 'chop', kind: 'chop', name: "Lucky's Chop Shop", icon: '🔧', x: 744, z: 70, car: true },
  { id: 'race', kind: 'race', name: 'Street Race', icon: '🏁', x: 0, z: -122, car: true },
];

// ---- real estate (pays out every morning at 6am)
export const PROPERTIES = [
  { id: 'p_shack', name: 'Pier Shack', icon: '🏚️', price: 8000, income: 70, x: 106, z: 372 },
  { id: 'p_loft', name: 'Northfield Loft', icon: '🏢', price: 18000, income: 150, ...S('north', 0, 0, 's') },
  { id: 'p_bung', name: 'Eastport Bungalow', icon: '🏡', price: 26000, income: 220, ...S('east', 0, 1, 's') },
  { id: 'p_hangar', name: 'Airport Hangar', icon: '🛩️', price: 45000, income: 380, x: 245, z: -626 },
  { id: 'p_pent', name: 'Downtown Penthouse', icon: '🌆', price: 60000, income: 500, ...S('main', 1, 0, 'e') },
  { id: 'p_beach', name: 'Malibay Beach House', icon: '🏖️', price: 85000, income: 700, x: 430, z: 372 },
  { id: 'p_villa', name: 'Canyon Villa', icon: '🏛️', price: 120000, income: 950, x: -470, z: -141 },
  { id: 'p_ridge', name: 'Ridge House', icon: '🏔️', price: 95000, income: 780, x: -392, z: -567 },
  { id: 'p_lake', name: 'Trailside Retreat', icon: '🌲', price: 70000, income: 560, x: -410, z: 137 },
  { id: 'p_mansion', name: 'Baywood Hills Mansion', icon: '🏰', price: 250000, income: 2200, x: -432, z: -370 },
];

// ---- trading goods (fictional)
export const GOODS = [
  { id: 'haze', name: 'Blue Haze', icon: '🌿', base: 40 },
  { id: 'pills', name: 'Red Pills', icon: '💊', base: 90 },
  { id: 'dust', name: 'Pixie Dust', icon: '✨', base: 220 },
  { id: 'moon', name: 'Moon Rocks', icon: '🌙', base: 480 },
  { id: 'glow', name: 'Glowstix', icon: '🧪', base: 900 },
  { id: 'gold', name: 'Gold Leaf', icon: '🪙', base: 1600 },
];
// How much each area marks a good up (>1) or down (<1).
const AREA_BIAS = {
  downtown: { haze: 1.1, pills: 0.85, dust: 1.2, moon: 1.0, glow: 1.25, gold: 1.1 },
  beach: { haze: 1.35, pills: 1.1, dust: 0.8, moon: 1.15, glow: 0.9, gold: 1.2 },
  east: { haze: 0.75, pills: 1.2, dust: 1.05, moon: 0.85, glow: 1.1, gold: 0.9 },
  north: { haze: 0.9, pills: 1.3, dust: 0.9, moon: 1.3, glow: 0.8, gold: 1.0 },
  hills: { haze: 1.2, pills: 0.9, dust: 1.35, moon: 1.1, glow: 1.3, gold: 1.4 },
  airport: { haze: 0.8, pills: 0.8, dust: 0.75, moon: 0.7, glow: 0.75, gold: 0.7 },
  farm: { haze: 0.6, pills: 1.0, dust: 1.1, moon: 1.2, glow: 1.05, gold: 1.1 },
};
function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
const strHash = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
// Prices for one dealer on one day. Sometimes a dealer is desperate (sells cheap) or hungry (buys high).
export function dealerPrices(place, day) {
  const out = {}, h0 = strHash(place.id);
  const hotGood = GOODS[Math.floor(hash(h0, day * 7 + 1) * GOODS.length)].id;
  const hotType = hash(h0, day * 7 + 2) < 0.5 ? 'cheap' : 'high';
  const hasHot = hash(h0, day * 7 + 3) < 0.55;
  for (const g of GOODS) {
    const swing = 0.75 + hash(h0 + strHash(g.id), day) * 0.5;
    let p = g.base * (AREA_BIAS[place.area]?.[g.id] || 1) * swing;
    let hot = null;
    if (hasHot && g.id === hotGood) { p *= hotType === 'cheap' ? 0.45 : 1.9; hot = hotType; }
    const buy = Math.max(1, Math.round(p));
    out[g.id] = { buy, sell: Math.round(buy * 0.86), hot };
  }
  return out;
}

// ---- clothes: style packs (partial character configs)
export const OUTFITS = {
  street: [
    { name: 'Blackout Hoodie', price: 120, cfg: { top: 'hoodie', topColor: '#16161b', pants: 'cargo', pantsColor: '#3a3d45', shoes: 'sneakers', shoeColor: '#ffffff', hat: 'cap', hatColor: '#e23b3b' } },
    { name: 'Track Day', price: 90, cfg: { top: 'long', topColor: '#2f80ed', pants: 'jeans', pantsColor: '#2f80ed', shoes: 'sneakers', shoeColor: '#ffffff', hat: 'none' } },
    { name: 'Purple Drip', price: 260, cfg: { top: 'jacket', topColor: '#9b51e0', accent: '#ffd23f', pants: 'jeans', pantsColor: '#16161b', shoes: 'sneakers', shoeColor: '#9b51e0', eyewear: 'shades', hat: 'none' } },
    { name: 'Courtside', price: 70, cfg: { top: 'tank', topColor: '#ffd23f', pants: 'shorts', pantsColor: '#3a3fbf', shoes: 'sneakers', shoeColor: '#e23b3b', hat: 'headband', hatColor: '#ffffff' } },
    { name: 'Beanie Season', price: 110, cfg: { top: 'hoodie', topColor: '#55602f', pants: 'cargo', pantsColor: '#c2b280', shoes: 'boots', shoeColor: '#7a5230', hat: 'beanie', hatColor: '#ff8a2a' } },
  ],
  luxe: [
    { name: 'Midnight Suit', price: 1200, cfg: { top: 'suit', topColor: '#16161b', accent: '#8b1e3f', pants: 'jeans', pantsColor: '#16161b', shoes: 'boots', shoeColor: '#16161b', hat: 'none', eyewear: 'none' } },
    { name: 'Ivory Tux', price: 1800, cfg: { top: 'suit', topColor: '#f2efe6', accent: '#16161b', pants: 'jeans', pantsColor: '#16161b', shoes: 'boots', shoeColor: '#16161b', hat: 'none' } },
    { name: 'Gold Standard', price: 4500, cfg: { top: 'suit', topColor: '#d4af37', accent: '#16161b', pants: 'jeans', pantsColor: '#d4af37', shoes: 'boots', shoeColor: '#16161b', hat: 'crown', eyewear: 'shades' } },
    { name: 'Riviera', price: 900, cfg: { top: 'long', topColor: '#f6e7c8', pants: 'jeans', pantsColor: '#c2b280', shoes: 'boots', shoeColor: '#7a5230', hat: 'none', eyewear: 'shades' } },
    { name: 'Mob Boss', price: 2500, cfg: { top: 'suit', topColor: '#3a3d45', accent: '#ffffff', pants: 'jeans', pantsColor: '#3a3d45', shoes: 'boots', shoeColor: '#16161b', hat: 'tophat', hatColor: '#16161b' } },
  ],
  surf: [
    { name: 'Boardshorts', price: 40, cfg: { top: 'tank', topColor: '#1fb5a8', pants: 'shorts', pantsColor: '#ff6fb5', shoes: 'bare', hat: 'none', eyewear: 'shades' } },
    { name: 'Lifeguard', price: 60, cfg: { top: 'tshirt', topColor: '#e23b3b', pants: 'shorts', pantsColor: '#e23b3b', shoes: 'bare', hat: 'cap', hatColor: '#ffffff', eyewear: 'visor', accent: '#ffd23f' } },
    { name: 'Sunset Tee', price: 50, cfg: { top: 'tshirt', topColor: '#ff8a2a', pants: 'shorts', pantsColor: '#2f80ed', shoes: 'sneakers', shoeColor: '#ffffff', hat: 'none', eyewear: 'shades' } },
    { name: 'Wetsuit', price: 150, cfg: { top: 'long', topColor: '#16161b', pants: 'jeans', pantsColor: '#16161b', shoes: 'bare', hat: 'none', eyewear: 'none' } },
    { name: 'Tourist', price: 35, cfg: { top: 'tshirt', topColor: '#ff6fb5', pants: 'shorts', pantsColor: '#c2b280', shoes: 'sneakers', shoeColor: '#ffffff', hat: 'cowboy', hatColor: '#c2b280', back: 'backpack' } },
  ],
  work: [
    { name: 'Hi-Vis', price: 60, cfg: { top: 'armor', topColor: '#ff8a2a', accent: '#ffd23f', pants: 'cargo', pantsColor: '#3a3d45', shoes: 'boots', shoeColor: '#7a5230', hat: 'helmet', hatColor: '#ffd23f' } },
    { name: 'Mechanic', price: 80, cfg: { top: 'long', topColor: '#3a3fbf', pants: 'cargo', pantsColor: '#3a3fbf', shoes: 'boots', shoeColor: '#16161b', gloves: 'gloves', gloveColor: '#16161b', hat: 'cap', hatColor: '#3a3fbf' } },
    { name: 'Flannel', price: 70, cfg: { top: 'jacket', topColor: '#8b1e3f', accent: '#16161b', pants: 'jeans', pantsColor: '#2f80ed', shoes: 'boots', shoeColor: '#7a5230', hat: 'beanie', hatColor: '#3a3d45' } },
    { name: 'Tactical', price: 300, cfg: { top: 'armor', topColor: '#3a3d45', accent: '#55602f', pants: 'armored', pantsColor: '#3a3d45', shoes: 'boots', shoeColor: '#16161b', gloves: 'gloves', gloveColor: '#16161b', hat: 'helmet', hatColor: '#55602f' } },
  ],
  vintage: [
    { name: 'Denim Daddy', price: 90, cfg: { top: 'jacket', topColor: '#2f80ed', accent: '#ffffff', pants: 'jeans', pantsColor: '#2f80ed', shoes: 'sneakers', shoeColor: '#ffffff', hat: 'none' } },
    { name: 'Disco', price: 140, cfg: { top: 'suit', topColor: '#ff6fb5', accent: '#ffd23f', pants: 'jeans', pantsColor: '#ffffff', shoes: 'boots', shoeColor: '#ffffff', eyewear: 'glasses', hat: 'none' } },
    { name: 'Cowpoke', price: 120, cfg: { top: 'long', topColor: '#c2b280', pants: 'jeans', pantsColor: '#7a5230', shoes: 'boots', shoeColor: '#7a5230', hat: 'cowboy', hatColor: '#7a5230' } },
    { name: 'Grandpa Core', price: 60, cfg: { top: 'jacket', topColor: '#55602f', accent: '#c2b280', pants: 'jeans', pantsColor: '#7c828d', shoes: 'boots', shoeColor: '#7a5230', eyewear: 'glasses', hat: 'none' } },
  ],
};
export const STYLE_NAMES = { street: 'Streetwear', luxe: 'Luxury', surf: 'Surf & Beach', work: 'Workwear', vintage: 'Vintage' };
export const BARBER_PRICES = { hair: 45, hairColor: 30, facialHair: 25 };

// Race route: road intersections around downtown.
export const RACE = {
  reward: 450, time: 80,
  points: [[0, -288], [192, -288], [192, -96], [96, -96], [96, 96], [-96, 96], [-96, -96], [0, -96]],
};

export const CHOP_VALUE = { hatch: 350, sedan: 500, coupe: 700, sports: 1400, muscle: 950, pickup: 650, van: 450, buggy: 400, limo: 1600 };
