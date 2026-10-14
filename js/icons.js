// Hand-drawn line icon set (24x24 grid). Used as SVG in the UI and as Path2D on canvases.
// Circles are written as arc paths so everything works with Path2D.
const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
export const ICONS = {
  // goods
  leaf: ['M5 19c0-8 5-14 14-14 0 9-6 14-14 14z', 'M5 19l8-8'],
  pill: ['M8.5 4.5a4.95 4.95 0 0 1 7 7l-4 4a4.95 4.95 0 0 1-7-7z', 'M6.5 10.5l7 7'],
  sparkle: ['M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z', 'M19 3v4M17 5h4'],
  moon: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z'],
  vial: ['M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3', 'M7.5 15h9'],
  coin: [C(12, 12, 8), C(12, 12, 4.5), 'M12 7.5v1M12 15.5v1'],
  cloud: ['M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 11 3.5 3.5 0 0 0 7 18z'],
  rain: ['M7 15h10a3.5 3.5 0 0 0 .4-6.97A5.5 5.5 0 0 0 6.6 8.5 3.25 3.25 0 0 0 7 15z', 'M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5'],
  storm: ['M7 14h10a3.5 3.5 0 0 0 .4-6.97A5.5 5.5 0 0 0 6.6 7.5 3.25 3.25 0 0 0 7 14z', 'M12.5 14l-2.5 4h3l-2 4'],
  fog: ['M4 9h16M6 13h12M4 17h16', 'M8 5h8'],
  // places & actions
  deal: ['M3 12l4-4 4 2 3-2 7 5', 'M3 12l6 6 2-1 2 1 2-1 2 1 4-4', 'M11 10l-3 3'],
  shirt: ['M8 4l-5 3 2 4 3-1v10h8V10l3 1 2-4-5-3c0 2-2 3-4 3s-4-1-4-3z'],
  scissors: [C(6, 7, 3), C(6, 17, 3), 'M8.5 8.5L20 19M8.5 15.5L20 5'],
  gun: ['M3 7h16v4h-7l-1 2h-2l-1 6H5l1.2-6H3z', 'M10 11v2'],
  play: ['M6 8h12a4 4 0 0 1 4 4v1a3 3 0 0 1-5 2l-1-1H8l-1 1a3 3 0 0 1-5-2v-1a4 4 0 0 1 4-4z', 'M7 11v3M5.5 12.5h3', C(16.5, 11.5, 0.6), C(18, 13.5, 0.6)],
  wrench: ['M14.5 4a5 5 0 0 0-5 6.5L3 17l4 4 6.5-6.5A5 5 0 0 0 20 9.5l-3 3-3.5-1-1-3.5 3-3z'],
  flag: ['M5 21V4', 'M5 4h13l-3 4 3 4H5'],
  church: ['M12 2v5M10 4h4', 'M6 22V12l6-5 6 5v10', 'M4 22h16', 'M10 22v-4a2 2 0 0 1 4 0v4'],
  house: ['M3 11l9-7 9 7', 'M5 9.5V20h14V9.5', 'M10 20v-6h4v6'],
  key: [C(7.5, 14.5, 4), 'M10.5 11.5L20 2M16 6l3 3M14 8l2 2'],
  door: ['M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17', 'M3 21h18', C(14.5, 12, 0.8)],
  food: ['M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10', 'M16 21V3c-2 1-3 4-3 8h3'],
  dumbbell: ['M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12'],
  cards: ['M4 5l7-2 4 14-7 2z', 'M13 4h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3', 'M8 9l1 3-3 1'],
  car: ['M5 13l1.6-4.6A2 2 0 0 1 8.5 7h7a2 2 0 0 1 1.9 1.4L19 13', 'M4 13h16v4H4z', 'M6.5 17v2M17.5 17v2'],
  sofa: ['M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3', 'M3 12a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3z', 'M5 17v2M19 17v2'],
  cart: ['M3 4h2l2.5 11h11L21 7H6.5', C(9, 19, 1.5), C(17, 19, 1.5)],
  taxi: ['M5 13l1.6-4.6A2 2 0 0 1 8.5 7h7a2 2 0 0 1 1.9 1.4L19 13', 'M4 13h16v4H4z', 'M10 7V4h4v3', 'M6.5 17v2M17.5 17v2'],
  box: ['M3 7l9-4 9 4v10l-9 4-9-4z', 'M3 7l9 4 9-4M12 11v10'],
  music: ['M4 14v-2a8 8 0 0 1 16 0v2', 'M4 14h3v6H4zM17 14h3v6h-3z'],
  heart: ['M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z'],
  user: [C(12, 8, 4), 'M4 21a8 8 0 0 1 16 0'],
  map: ['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z', 'M9 4v14M15 6v14'],
  chat: ['M4 5h16v11H9l-5 4z', 'M8 9h8M8 12h5'],
  pin: ['M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z', C(12, 9, 2.5)],
  wallet: ['M4 7h15a1 1 0 0 1 1 1v11H5a1 1 0 0 1-1-1V6a2 2 0 0 1 2-2h11v3', 'M16 12h4v4h-4a2 2 0 0 1 0-4z'],
  gear: [C(12, 12, 3), 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1'],
  radio: ['M3 9h18v11H3z', 'M7 9l10-5', C(8, 14.5, 2.5), 'M14 13h4M14 16h4'],
  phone: ['M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', 'M10 19h4'],
  bag: ['M5 8h14l-1 13H6z', 'M9 8V6a3 3 0 0 1 6 0v2'],
  star: ['M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z'],
  lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4', 'M12 15v2'],
  sun: [C(12, 12, 4), 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5'],
  fist: ['M7 10V7a1.5 1.5 0 0 1 3 0V6a1.5 1.5 0 0 1 3 0v.5a1.5 1.5 0 0 1 3 0V8a1.5 1.5 0 0 1 3 0v5a7 7 0 0 1-7 7h-1a5 5 0 0 1-5-5v-2a2 2 0 0 1 2-2h2'],
  ball: [C(12, 12, 8), 'M4 12h16M12 4v16M6.5 6.5c3 3 3 8 0 11M17.5 6.5c-3 3-3 8 0 11'],
  wave: ['M2 16c3 0 3-2 5-2s2 2 5 2 3-2 5-2 2 2 5 2', 'M2 20c3 0 3-2 5-2s2 2 5 2 3-2 5-2 2 2 5 2', 'M4 11c2-6 9-8 14-3-4-1-6 1-7 3'],
  target: [C(12, 12, 9), C(12, 12, 5), C(12, 12, 1.5)],
  taco: ['M3 17a9 9 0 0 1 18 0z', 'M6 15c1-2 2-2 3 0 1-2 2-2 3 0 1-2 2-2 3 0 1-2 2-2 3 0'],
  toilet: ['M7 3h6v7H7z', 'M5 10h14a7 7 0 0 1-7 7 7 7 0 0 1-7-7z', 'M9 17l-1 4h8l-1-4'],
  shower: ['M4 21V7a4 4 0 0 1 8 0', 'M9 7h6', 'M10 11l-.5 1.5M13 11v1.5M16 11l.5 1.5M9.5 15l-.5 1.5M13 15v1.5M16.5 15l.5 1.5'],
  bath: ['M3 12h18v2a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z', 'M6 12V6a2 2 0 0 1 4 0', 'M7 19l-1 2M17 19l1 2', 'M13 8.5v.01M15.5 7v.01M15 10v.01'],
  drop: ['M12 3c4 5 6.5 8.3 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 11.3 8 8 12 3z'],
  gift: ['M4 10h16v4H4zM5 14h14v7H5z', 'M12 10v11', 'M12 10c-2-4-6-4-6-1.5S10 10 12 10zM12 10c2-4 6-4 6-1.5S14 10 12 10z'],
  bed: ['M3 19V6M3 14h18v5M21 14v-3a3 3 0 0 0-3-3h-7v6', C(7, 11, 2)],
  fridge: ['M6 2h12v20H6z', 'M6 10h12M9 5v2M9 13v3'],
  tv: ['M3 6h18v12H3z', 'M8 21h8M12 18v3'],
  case: ['M3 8h18v12H3z', 'M9 8V5h6v3', 'M3 13h18'],
  cash: ['M2 6h20v12H2z', C(12, 12, 3), 'M6 9v6M18 9v6'],
  bolt: ['M13 2L4 14h7l-1 8 9-12h-7z'],
  smile: [C(12, 12, 9), 'M8 14a4 4 0 0 0 8 0', 'M9 9h.01M15 9h.01'],
  drink: ['M6 3h12l-1 6a5 5 0 0 1-10 0z', 'M12 14v6M8 21h8'],
  book: ['M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z', 'M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z'],
  plant: ['M8 21h8l1-6H7z', 'M12 15V9', 'M12 11c-4 0-6-3-6-6 4 0 6 3 6 6zM12 9c0-3 2-6 6-6 0 3-2 6-6 6z'],
  lamp: ['M8 3h8l3 7H5z', 'M12 10v9M8 21h8'],
  chart: ['M4 20V4M4 20h16', 'M8 16v-4M12 16V8M16 16v-6'],
  edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13 7l4 4'],
  trash: ['M4 7h16M10 11v6M14 11v6', 'M6 7l1 13h10l1-13M9 7V4h6v3'],
  rotate: ['M20 12a8 8 0 1 1-2.4-5.7', 'M20 4v5h-5'],
  hand: ['M8 11V5a1.5 1.5 0 0 1 3 0v5V3.5a1.5 1.5 0 0 1 3 0V10V5a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-12 5l-3-4a1.5 1.5 0 0 1 2.3-2L8 14'],
  slots: ['M4 4h16v16H4z', 'M9 4v16M15 4v16', 'M5.5 12h2M11 12h2M16.5 12h2'],
  mic: ['M9 3h6v10a3 3 0 0 1-6 0z', 'M5 11a7 7 0 0 0 14 0M12 18v3'],
  run: [C(14, 4, 2), 'M8 21l3-6 3 2v4M6 12l3-4 4 1 3 3 3 1', 'M11 9l-1 5'],
  brain: ['M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h0V4z', 'M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3V4z'],
  steer: [C(12, 12, 9), C(12, 12, 2), 'M3 12h7M14 12h7M12 14v7'],
  cross: ['M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'],
  people: [C(9, 8, 3), 'M3 20a6 6 0 0 1 12 0', C(17, 9, 2.5), 'M15 14a5 5 0 0 1 7 5'],
  check: ['M4 12l5 5L20 6'],
  x: ['M6 6l12 12M18 6L6 18'],
  plus: ['M12 5v14M5 12h14'],
  minus: ['M5 12h14'],
  tag: ['M3 12V3h9l9 9-9 9z', C(7.5, 7.5, 1.5)],
  bus: ['M5 3h14a1 1 0 0 1 1 1v13H4V4a1 1 0 0 1 1-1z', 'M4 11h16M8 21v-4M16 21v-4', C(8, 14, 0.8), C(16, 14, 0.8)],
};
export function svg(name, cls = '') {
  const p = ICONS[name] || ICONS.hand || ICONS.chat; // never fall back to a star
  return `<svg viewBox="0 0 24 24" class="ic ${cls}">${p.map(d => `<path d="${d}"/>`).join('')}</svg>`;
}
const P2D = new Map();
export function drawIcon(ctx, name, x, y, size, { stroke = '#fff', width = 2, fill = null } = {}) {
  let paths = P2D.get(name);
  if (!paths) { paths = (ICONS[name] || ICONS.hand || ICONS.chat).map(d => new Path2D(d)); P2D.set(name, paths); }
  ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 24, size / 24);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = width * 24 / size * (size / 24);
  ctx.lineWidth = width; ctx.strokeStyle = stroke;
  for (const p of paths) { if (fill) { ctx.fillStyle = fill; ctx.fill(p); } ctx.stroke(p); }
  ctx.restore();
}
