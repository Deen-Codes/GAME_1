// GTA V-style radial selector. Tap the button to open it, then tap a segment to pick (or hold and slide, release to pick).
// Tap the centre for the centre action (holster / close), or tap outside to close.
let el = null;
function ensure() {
  if (el) return el;
  el = document.createElement('div'); el.id = 'wheel'; el.className = 'hidden';
  el.innerHTML = '<div class="wheel-ring"><svg id="wheelSvg" viewBox="-160 -160 320 320"></svg><div id="wheelItems"></div><div class="wheel-center"><b id="wheelName"></b><span id="wheelSub"></span></div></div>';
  document.body.appendChild(el); return el;
}
const arc = (r0, r1, a0, a1) => {
  const p = (r, a) => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)}Z`;
};
let active = null; // the wheel that's open right now
export function attachWheel(btn, { items, onSelect, onTap, centre, onOpen, onClose, anchor }) {
  let K = 1; // ring scale: the compact wheel sits over the buttons it replaces
  let opener = null, ox = 0, oy = 0, moved = false, list = [], hover = -1, isOpen = false;
  const W = { close };
  const zone = (x, y) => { // -1 centre, -2 outside, else segment index
    const r = el.querySelector('.wheel-ring').getBoundingClientRect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2), d = Math.hypot(dx, dy);
    if (d < 58 * K) return -1; if (d > 175 * K) return -2;
    const n = list.length; let a = Math.atan2(dx, -dy); if (a < 0) a += Math.PI * 2; return Math.round(a / (Math.PI * 2) * n) % n;
  };
  function show() {
    if (isOpen) return; isOpen = true; active = W; list = items(); ensure(); hover = list.findIndex(i => i.current);
    const n = list.length, svg = document.getElementById('wheelSvg'), box = document.getElementById('wheelItems');
    svg.innerHTML = ''; box.innerHTML = '';
    list.forEach((it, i) => {
      const a0 = (i - 0.5) / n * Math.PI * 2 + 0.02, a1 = (i + 0.5) / n * Math.PI * 2 - 0.02, am = i / n * Math.PI * 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', arc(62, 152, a0, a1)); path.dataset.i = i; svg.appendChild(path);
      const d = document.createElement('div'); d.className = 'wheel-item' + (it.disabled ? ' off' : '');
      d.style.left = `calc(50% + ${Math.sin(am) * 107}px)`; d.style.top = `calc(50% - ${Math.cos(am) * 107}px)`;
      d.innerHTML = `${it.icon}<small>${it.short || ''}</small>`; box.appendChild(d);
    });
    const c = el.querySelector('.wheel-center'); c.dataset.label = centre ? centre() : 'Close';
    const ring = el.querySelector('.wheel-ring'), A = anchor?.();
    if (A && A.offsetParent !== null) { // compact: a small wheel right where your thumb already is, instead of the big one in the middle
      const r = A.getBoundingClientRect(); K = 0.72; const R = 160 * K + 6;
      const cx = Math.max(R, Math.min(innerWidth - R, r.left + r.width / 2)), cy = Math.max(R, Math.min(innerHeight - R - 4, r.top + r.height / 2));
      el.classList.add('compact'); el.style.setProperty('--cx', cx + 'px'); el.style.setProperty('--cy', cy + 'px'); document.body.classList.add('wheel-compact');
    } else { K = 1; el.classList.remove('compact'); document.body.classList.remove('wheel-compact'); }
    ring.style.transform = K === 1 ? '' : `scale(${K})`;
    paint(); el.classList.remove('hidden'); el.classList.add('live'); onOpen?.(); navigator.vibrate?.(8);
  }
  function close() { if (!isOpen) return; isOpen = false; active = null; el.classList.add('hidden'); document.body.classList.remove('wheel-compact'); el.classList.remove('live'); onClose?.(); }
  const pickAt = i => { close(); if (i >= 0) { if (!list[i].disabled || true) onSelect(list[i], i); } else if (i === -1 && centre) onTap?.(); navigator.vibrate?.(6); };
  function paint() {
    el.querySelectorAll('#wheelSvg path').forEach(p => { const i = +p.dataset.i; p.setAttribute('class', (i === hover ? 'on ' : '') + (list[i].disabled ? 'off' : '')); });
    const it = list[hover];
    document.getElementById('wheelName').textContent = it ? it.label : '';
    document.getElementById('wheelSub').innerHTML = it ? (it.sub || '') : '';
  }
  btn.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    if (isOpen) { close(); return; }
    if (active) active.close();
    opener = e.pointerId; ox = e.clientX; oy = e.clientY; moved = false; show();
  });
  btn.addEventListener('pointermove', e => {
    if (e.pointerId !== opener || !isOpen) return;
    if (Math.hypot(e.clientX - ox, e.clientY - oy) > 22) moved = true;
    if (moved) { const z = zone(e.clientX, e.clientY); if (z >= 0 && z !== hover) { hover = z; paint(); navigator.vibrate?.(4); } }
  });
  const end = e => {
    if (e.pointerId !== opener) return; opener = null;
    if (isOpen && moved) { const z = zone(e.clientX, e.clientY); if (z >= 0) pickAt(z); } // hold-and-slide still works
  };
  btn.addEventListener('pointerup', end); btn.addEventListener('pointercancel', end);
  // taps on the open wheel
  ensure();
  if (!el.dataset.bound) {
    el.dataset.bound = 1;
    el.addEventListener('pointerdown', e => { if (!active) return; e.preventDefault(); e.stopPropagation(); active._down(e); });
    el.addEventListener('pointermove', e => { if (active) active._move(e); });
    el.addEventListener('pointerup', e => { if (active) active._up(e); });
  }
  let tapId = null;
  W._down = e => { tapId = e.pointerId; const z = zone(e.clientX, e.clientY); if (z >= 0) { hover = z; paint(); } };
  W._move = e => { if (e.pointerId !== tapId && !(W.keyOpen && tapId === null)) return; const z = zone(e.clientX, e.clientY); if (z >= 0 && z !== hover) { hover = z; paint(); } }; /* opened from the keyboard: the mouse just hovers */
  W.toggle = () => { if (isOpen) { W.keyOpen = false; close(); return; } if (active) active.close(); W.keyOpen = true; opener = null; show(); };
  W.pickHover = () => { W.keyOpen = false; if (isOpen) pickAt(hover); };
  W._up = e => { if (e.pointerId !== tapId) return; tapId = null; W.keyOpen = false; const z = zone(e.clientX, e.clientY); if (z === -2) close(); else pickAt(z); };
  return W;
}
