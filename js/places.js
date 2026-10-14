// Everything you can walk or drive up to: shops, barbers, property, dealers, minigames, chop shop, race.
import { blockSide, attachDoor, addStructure } from './world.js?v=108';

const S = (city, i, j, side) => blockSide(city, i, j, side);

export const PLACES = [
  // ---- dealers (the money loop) — out on the street
  { id: 'd_dt', kind: 'dealer', npc: 'Slim', name: 'Downtown Dealer', icon: 'deal', ...S('main', 1, -1, 's'), area: 'downtown' },
  { id: 'd_beach', kind: 'dealer', npc: 'Nina Blue', name: 'Boardwalk Dealer', icon: 'deal', x: -40, z: 368, area: 'beach' },
  { id: 'd_east', kind: 'dealer', npc: 'Big Tony', name: 'Eastport Dealer', icon: 'deal', ...S('east', 1, 1, 'w'), area: 'east' },
  { id: 'd_north', kind: 'dealer', npc: 'Rico', name: 'Northfield Dealer', icon: 'deal', ...S('north', -2, 0, 's'), area: 'north' },
  { id: 'd_hills', kind: 'dealer', npc: 'Ghost', name: 'Canyon Dealer', icon: 'deal', x: -360, z: -10, area: 'hills' },
  { id: 'd_air', kind: 'dealer', npc: 'Captain', name: 'Hangar Dealer', icon: 'deal', x: 228, z: -622, area: 'airport' },
  { id: 'd_farm', kind: 'dealer', npc: 'Mama Lu', name: 'Farm Road Dealer', icon: 'deal', x: 372, z: -10, area: 'farm' },
  { id: 'd_ghetto', kind: 'dealer', npc: 'Two-Tone', name: 'Southside Dealer', icon: 'deal', ...S('main', -5, 4, 'e'), area: 'downtown' },

  // ---- shops & venues with interiors
  { id: 'c_street', kind: 'clothes', interior: 'clothes', name: 'Street Kings', icon: 'shirt', style: 'street', ...S('main', 0, 0, 's') },
  { id: 'c_luxe', kind: 'clothes', interior: 'clothes', name: 'Rodeo Luxe', icon: 'shirt', style: 'luxe', ...S('main', 2, -3, 's') },
  { id: 'c_surf', kind: 'clothes', interior: 'clothes', name: 'Venice Surf Co.', icon: 'shirt', style: 'surf', ...S('main', 1, 6, 's') },
  { id: 'c_work', kind: 'clothes', interior: 'clothes', name: 'Northfield Workwear', icon: 'shirt', style: 'work', ...S('north', 1, -1, 's') },
  { id: 'c_vintage', kind: 'clothes', interior: 'clothes', name: 'Eastport Thrift', icon: 'shirt', style: 'vintage', ...S('east', -1, -1, 's') },
  { id: 'b_fade', kind: 'barber', interior: 'barber', name: 'Fade Factory', icon: 'scissors', ...S('main', -1, 0, 'e') },
  { id: 'b_shore', kind: 'barber', interior: 'barber', name: 'Shore Cuts', icon: 'scissors', ...S('main', -2, 6, 's') },
  { id: 'b_east', kind: 'barber', interior: 'barber', name: 'Eastport Clippers', icon: 'scissors', ...S('east', 0, 0, 's') },
  { id: 'a_dt', kind: 'guns', interior: 'guns', name: 'Bay Arms Downtown', icon: 'gun', ...S('main', 3, 1, 's') },
  { id: 'a_east', kind: 'guns', interior: 'guns', name: 'Bay Arms Eastport', icon: 'gun', ...S('east', -2, 1, 's') },
  { id: 'a_north', kind: 'guns', interior: 'guns', name: 'Bay Arms Northfield', icon: 'gun', ...S('north', 2, -1, 's') },
  { id: 'f_diner', kind: 'venue', interior: 'diner', name: 'Sunny Side Diner', icon: 'food', ...S('main', -1, 2, 's') },
  { id: 'f_diner2', kind: 'venue', interior: 'diner', name: 'Eastport Grill', icon: 'food', ...S('east', 1, -1, 's') },
  { id: 'm_mart1', kind: 'venue', interior: 'mart', name: 'QuickMart Downtown', icon: 'cart', ...S('main', 0, 3, 's') },
  { id: 'm_mart2', kind: 'venue', interior: 'mart', name: 'QuickMart Northfield', icon: 'cart', ...S('north', -1, -1, 's') },
  { id: 'm_mart3', kind: 'venue', interior: 'mart', name: 'QuickMart Eastport', icon: 'cart', ...S('east', -3, 0, 's') },
  { id: 'v_college', kind: 'venue', interior: 'college', name: 'Bay City College', icon: 'book', ...S('main', 3, 3, 's') },
  { id: 'w_office', kind: 'venue', interior: 'office', name: 'Bay Corp Tower', icon: 'case', ...S('main', 4, 0, 's') },
  { id: 'v_gym', kind: 'venue', interior: 'gym', name: 'Iron Temple Gym', icon: 'dumbbell', ...S('main', -3, 1, 's') },
  { id: 'v_casino', kind: 'venue', interior: 'casino', name: 'Lucky 7 Casino', icon: 'cards', ...S('main', 1, 1, 's') },
  { id: 'v_motors', kind: 'venue', interior: 'motors', name: 'Bay Motors', icon: 'car', ...S('main', 4, -2, 's') },
  { id: 'v_casa', kind: 'venue', interior: 'casa', name: 'Casa Bay Furniture', icon: 'sofa', ...S('main', -2, 2, 's') },
  { id: 'v_anchor', kind: 'venue', interior: 'bar', name: 'The Anchor Bar', icon: 'drink', x: 160, z: 368 },
  { id: 'v_mall', kind: 'venue', interior: 'mall', name: 'Bay City Mall', icon: 'bag', style: 'street', ...S('main', -4, -3, 's') },
  { id: 'l_stadium', kind: 'stadium', name: 'Bay Stadium', icon: 'ball', desc: 'Home of the Bay City Breakers. Match day every third day, 7pm.', x: 264, z: -146 },
  { id: 'l_wheel', kind: 'ride', ride: 'wheel', name: 'Big Wheel', icon: 'star', desc: 'Round and round above the bay. $8.', x: 40, z: 405 },
  { id: 'l_carousel', kind: 'ride', ride: 'carousel', name: 'Carousel', icon: 'star', desc: 'Painted horses and organ music. $5.', x: 64, z: 380 },
  { id: 'l_stalls', kind: 'carny', name: 'Fairground Stalls', icon: 'target', desc: 'Hook-a-duck, ring toss, win a giant teddy.', x: 52, z: 414 },
  { id: 'l_marina', kind: 'marina', name: 'Bay Marina', icon: 'wave', desc: 'Harbour cruises and boats for sale.', x: -239.5, z: 421 },
  { id: 't_rose', kind: 'venue', interior: 'tattoo', name: 'Needle & Rose Tattoo', icon: 'edit', desc: 'Tattoos, cover-ups and laser removal.', ...S('main', 2, 0, 's') },
  { id: 't_east', kind: 'venue', interior: 'tattoo', name: 'Eastport Ink', icon: 'edit', desc: 'Walk-ins welcome. Laser removal too.', ...S('east', 2, 0, 's') },
  { id: 'z_burger', kind: 'biz', interior: 'burgershop', biz: 'burger', name: 'Bay Burger', icon: 'food', desc: 'A burger joint. For sale.', ...S('main', 1, 2, 's') },
  { id: 'z_laundry', kind: 'biz', interior: 'laundry', biz: 'laundry', name: 'Suds Laundromat', icon: 'wave', desc: 'Coin laundry. For sale.', ...S('east', -1, 1, 's') },
  { id: 'z_carwash', kind: 'biz', biz: 'carwash', name: 'Shine Hand Car Wash', icon: 'car', desc: 'Hand car wash. For sale.', ...S('north', 1, 1, 's') },
  { id: 'g_club', kind: 'venue', interior: 'club', name: 'Neon Room Club', icon: 'music', ...S('main', -2, -1, 's') },

  // ---- outdoor activities & jobs
  { id: 'g_taco', kind: 'game', game: 'taco', name: 'Taco Truck (job)', icon: 'taco', desc: 'Work a shift on the taco truck. Fill orders fast for cash.', x: 70, z: 364 },
  { id: 'g_gallery', kind: 'game', game: 'gallery', name: 'Pier Shooting Gallery', icon: 'target', desc: 'Hit the targets, miss the civilians.', x: 94, z: 486 },
  { id: 'g_surf', kind: 'game', game: 'surf', name: 'Bay Surf School', icon: 'wave', desc: 'Ride the wave. Stay in the sweet spot.', x: -160, z: 392 },
  { id: 'g_gym', kind: 'game', game: 'gym', name: 'Muscle Beach', icon: 'dumbbell', desc: 'Pump iron in the sun. Builds Strength.', x: 230, z: 378 },
  { id: 'g_hoops', kind: 'game', game: 'hoops', name: 'Venice Courts', icon: 'ball', desc: 'Flick to shoot. Sink as many as you can.', x: -96, z: 366 },
  { id: 'j_taxi', kind: 'job', job: 'taxi', name: 'Bay Cabs', icon: 'taxi', desc: 'Drive a cab. Pick up fares and get them there fast.', ...S('main', 0, -2, 's') },
  { id: 'j_bins', kind: 'job', job: 'bins', name: 'Bay Waste', icon: 'trash', desc: 'Drive the bin lorry and empty wheelie bins around town.', ...S('main', -4, 3, 's') },
  { id: 'j_courier', kind: 'job', job: 'courier', name: 'Speedy Couriers', icon: 'box', desc: 'Deliver parcels across town before the timer runs out.', ...S('main', 2, 2, 's') },

  // ---- car activities
  { id: 'v_pit', kind: 'venue', interior: 'pit', name: 'The Pit', icon: 'fist', desc: 'Underground cage fights. Climb the ladder, bet on yourself.', ...S('east', 2, -1, 's') },
  { id: 'v_police', kind: 'venue', interior: 'police', name: 'Bay City Police Dept.', icon: 'shield', desc: 'Pay fines, turn yourself in, or ask about the city.', ...S('main', -1, -2, 's') },
  { id: 'v_hospital', kind: 'venue', interior: 'hospital', name: 'Bay General Hospital', icon: 'cross', desc: 'Get patched up, have a check-up, or have a baby.', ...S('main', 3, -1, 's') },
  { id: 'v_church', kind: 'venue', interior: 'church', name: 'Bay Chapel', icon: 'church', desc: 'A quiet place. Sit, reflect, talk to Father Gabe.', ...S('main', -4, 0, 's'), church: true },
  { id: 'gas1', kind: 'service', svc: 'gas', name: 'Bay Gas', icon: 'bolt', desc: 'Fill up and get your car patched up.', ...S('main', 2, 1, 's'), car: true },
  { id: 'gas2', kind: 'service', svc: 'gas', name: 'Bay Gas Eastport', icon: 'bolt', desc: 'Fill up and get your car patched up.', ...S('east', 0, -1, 's'), car: true },
  { id: 'gas3', kind: 'service', svc: 'gas', name: 'Bay Gas Northfield', icon: 'bolt', desc: 'Fill up and get your car patched up.', ...S('north', 2, 0, 's'), car: true },
  { id: 'wash1', kind: 'service', svc: 'wash', name: 'Sparkle Car Wash', icon: 'wave', desc: 'Drive through: wash, polish and full repair.', ...S('main', -2, 3, 's'), car: true },
  { id: 'mods', kind: 'mods', name: 'Bay Customs', icon: 'wrench', desc: 'Drive your own car in to buy upgrades, paint and wheels.', ...S('main', -3, -2, 's'), car: true },
  { id: 'chop', kind: 'chop', name: "Lucky's Chop Shop", icon: 'wrench', x: 744, z: 70, car: true },
  { id: 'race', kind: 'race', name: 'Street Race', icon: 'flag', x: 0, z: -122, car: true },
];

// ---- real estate (pays out every morning at 6am; each one is a home you can furnish)
export const PROPERTIES = [
  { id: 'p_studio', name: 'Starter Studio', icon: 'house', home: 'studio', price: 0, income: 45, ...S('main', -1, 1, 's'), starter: true },
  { id: 'p_shack', name: 'Pier Shack', icon: 'house', home: 'studio', price: 8000, income: 70, x: 106, z: 372 },
  { id: 'p_loft', name: 'Northfield Loft', icon: 'house', home: 'apartment', price: 18000, income: 150, ...S('north', 0, 0, 's') },
  { id: 'p_bung', name: 'Eastport Bungalow', icon: 'house', home: 'house', price: 26000, income: 220, ...S('east', 0, 1, 's') },
  { id: 'p_hangar', name: 'Airport Hangar', icon: 'house', home: 'apartment', price: 45000, income: 380, x: 245, z: -626 },
  { id: 'p_pent', name: 'Downtown Penthouse', icon: 'house', home: 'penthouse', price: 60000, income: 500, ...S('main', 1, 0, 'e') },
  { id: 'p_beach', name: 'Malibay Beach House', icon: 'house', home: 'villa', price: 85000, income: 700, x: 430, z: 372 },
  { id: 'p_villa', name: 'Canyon Villa', icon: 'house', home: 'villa', price: 120000, income: 950, x: -470, z: -141 },
  { id: 'p_ridge', name: 'Ridge House', icon: 'house', home: 'villa', price: 95000, income: 780, x: -392, z: -567 },
  { id: 'p_lake', name: 'Trailside Retreat', icon: 'house', home: 'villa', price: 70000, income: 560, x: -410, z: 137 },
  { id: 'p_mansion', name: 'Baywood Hills Mansion', icon: 'house', home: 'mansion', price: 250000, income: 2200, x: -432, z: -370 },
];

// ---- trading goods (fictional)
export const GOODS = [
  { id: 'haze', name: 'Blue Haze', icon: 'leaf', col: '#4cd964', base: 40 },
  { id: 'pills', name: 'Red Pills', icon: 'pill', col: '#ff3b4a', base: 90 },
  { id: 'dust', name: 'Pixie Dust', icon: 'sparkle', col: '#ff6fb5', base: 220 },
  { id: 'moon', name: 'Moon Rocks', icon: 'moon', col: '#b26bff', base: 480 },
  { id: 'glow', name: 'Glowstix', icon: 'vial', col: '#38e8ff', base: 900 },
  { id: 'gold', name: 'Gold Leaf', icon: 'coin', col: '#ffd23f', base: 1600 },
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
    { name: 'Swim trunks', price: 30, cfg: { top: 'shirtless', pants: 'swim', pantsColor: '#2f80ed', shoes: 'bare', hat: 'none', eyewear: 'shades' } },
    { name: 'Swimsuit', price: 45, cfg: { top: 'swimtop', topColor: '#ff6fb5', pants: 'swim', pantsColor: '#ff6fb5', shoes: 'bare', hat: 'none', eyewear: 'shades' } },
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

export const CHOP_VALUE = { compact: 280, hothatch: 800, jeep: 900, minivan: 500, gt: 1300, moto: 900, bike: 60, scooter: 80, hatch: 350, sedan: 500, coupe: 700, sports: 1400, muscle: 950, pickup: 650, van: 450, buggy: 400, limo: 1600, suv: 800, convertible: 1100, wagon: 450, lowrider: 900, classic: 1000, boxtruck: 600, hyper: 2600 };

// Shops, venues and homes get a real front door on their building; the marker moves to stand in front of it.
const DOOR_COL = { tattoo: '#ff5a8a', burgershop: '#ffd23f', laundry: '#38e8ff', clothes: '#ff6fb5', barber: '#2f80ed', guns: '#e23b3b', diner: '#ffd23f', mart: '#4cd964', gym: '#ff8a2a', casino: '#d4af37', motors: '#38e8ff', casa: '#c98a4a', bar: '#1fb5a8', club: '#9b51e0', church: '#c9a24a', hospital: '#e23b3b', police: '#2a6aff', pit: '#ff3b3b', college: '#2f80ed', office: '#38e8ff' };
for (const p of PLACES) if (p.interior && p.door) attachDoor(p, DOOR_COL[p.interior] || '#ff8a2a', null, p.church ? 'church' : null);
for (const p of PROPERTIES) if (p.door) attachDoor(p, '#4cd964');
for (const p of [...PLACES, ...PROPERTIES]) if (!p.door || p.kind === 'service') addStructure(p);
