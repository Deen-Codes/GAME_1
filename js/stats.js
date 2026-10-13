// Character progression: skills that level up by doing things, life needs, and relationships.
export const SKILLS = [
  { id: 'strength', name: 'Strength', icon: 'dumbbell', desc: 'Harder punches and bat swings.' },
  { id: 'stamina', name: 'Stamina', icon: 'run', desc: 'Run faster, get tired slower.' },
  { id: 'health', name: 'Health', icon: 'cross', desc: '+10 max health per level.' },
  { id: 'charm', name: 'Charm', icon: 'smile', desc: 'Better dialogue options, haggling and faster friendships.' },
  { id: 'driving', name: 'Driving', icon: 'steer', desc: 'Faster cars, better grip.' },
  { id: 'dealing', name: 'Dealing', icon: 'deal', desc: 'Better prices and bigger customer orders.' },
];
export const GUN_SKILL_SLOTS = ['pistol', 'smg', 'shotgun', 'ar', 'sniper', 'rpg'];
export const MAX_LVL = 10;
export const xpFor = lvl => Math.round(80 * Math.pow(lvl, 1.55)); // xp needed to go from lvl to lvl+1

export function newStats() {
  const s = { xp: {}, lvl: {}, hunger: 85, energy: 90, mood: 70, groceries: 2, rel: {}, relDay: {}, haggle: {} };
  for (const k of [...SKILLS.map(s => s.id), ...GUN_SKILL_SLOTS.map(g => 'gun_' + g)]) { s.xp[k] = 0; s.lvl[k] = 1; }
  return s;
}
export function fixStats(s) {
  const n = newStats();
  for (const k in n) if (s[k] === undefined) s[k] = n[k];
  for (const k in n.xp) { if (s.xp[k] === undefined) s.xp[k] = 0; if (s.lvl[k] === undefined) s.lvl[k] = 1; }
  return s;
}
// Returns the new level if the skill levelled up, otherwise 0.
export function addXP(s, id, amt) {
  if (s.lvl[id] >= MAX_LVL) return 0;
  s.xp[id] += amt; let up = 0;
  while (s.lvl[id] < MAX_LVL && s.xp[id] >= xpFor(s.lvl[id])) { s.xp[id] -= xpFor(s.lvl[id]); s.lvl[id]++; up = s.lvl[id]; }
  return up;
}
export const skillName = id => id.startsWith('gun_') ? ({ pistol: 'Pistol', smg: 'SMG', shotgun: 'Shotgun', ar: 'Rifle', sniper: 'Sniper', rpg: 'RPG' }[id.slice(4)] + ' skill') : SKILLS.find(s => s.id === id).name;

// ---------------- relationships
export const REL_LEVELS = [[0, 'Stranger'], [20, 'Known'], [40, 'Friendly'], [60, 'Trusted'], [80, 'Family']];
export const relName = v => [...REL_LEVELS].reverse().find(([t]) => v >= t)[1];
export function relPriceMod(v) { return 1 - Math.min(0.15, v * 0.0015); } // up to 15% cheaper buying / dearer selling

// ---------------- food & things that fill needs
export const FOODS = {
  burger: { name: 'Bay Burger', price: 14, hunger: 35, mood: 4 },
  fries: { name: 'Loaded Fries', price: 8, hunger: 18, mood: 3 },
  salad: { name: 'Cali Bowl', price: 16, hunger: 28, mood: 6, health: 4 },
  steak: { name: 'Steak Dinner', price: 42, hunger: 60, mood: 12 },
  pancakes: { name: 'Pancake Stack', price: 12, hunger: 30, mood: 6 },
  coffee: { name: 'Coffee', price: 5, hunger: 2, energy: 20, mood: 2 },
  shake: { name: 'Milkshake', price: 7, hunger: 10, mood: 8 },
  taco: { name: 'Street Taco', price: 6, hunger: 18, mood: 4 },
  beer: { name: 'Beer', price: 8, mood: 10, energy: -5, drunk: 0.35 },
  shot: { name: 'Tequila Shot', price: 10, mood: 12, drunk: 0.55 },
  whiskey: { name: 'Whiskey', price: 16, mood: 14, drunk: 0.7 },
  cocktail: { name: 'Cocktail', price: 18, mood: 16, energy: -6, drunk: 0.5 },
  energy: { name: 'Energy Drink', price: 6, energy: 25, mood: -2 },
  snack: { name: 'Snack Bar', price: 3, hunger: 10 },
  groceries: { name: 'Groceries (5 meals)', price: 35, groceries: 5 },
  meal: { name: 'Home-cooked meal', price: 0, hunger: 40, mood: 5 },
};
export const MENUS = {
  diner: ['pancakes', 'burger', 'fries', 'salad', 'steak', 'shake', 'coffee'],
  mart: ['groceries', 'snack', 'energy', 'coffee', 'beer'],
  bar: ['beer', 'shot', 'whiskey', 'cocktail', 'fries', 'burger'],
  club: ['beer', 'shot', 'cocktail', 'energy'],
  taco: ['taco', 'shake'],
};
