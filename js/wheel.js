// GTA V-style radial selector. Hold a button, slide toward a segment, release to pick.
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
export function attachWheel(btn, { items, onSelect, onTap, onOpen, onClose }) {
  let id = null, ox = 0, oy = 0, open = false, timer = 0, list = [], hover = -1;
  const show = () => {
    if (open) return; open = true; list = items(); ensure(); hover = list.findIndex(i => i.current);
    const n = list.length, svg = document.getElementById('wheelSvg'), box = document.getElementById('wheelItems');
    svg.innerHTML = ''; box.innerHTML = '';
    list.forEach((it, i) => {
      const a0 = (i - 0.5) / n * Math.PI * 2 + 0.02, a1 = (i + 0.5) / n * Math.PI * 2 - 0.02, am = i / n * Math.PI * 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', arc(62, 152, a0, a1)); path.dataset.i = i; svg.appendChild(path);
      const d = document.createElement('div'); d.className = 'wheel-item' + (it.disabled ? ' off' : '');
      d.style.left = `calc(50% + ${Math.sin(am) * 107}px)`; d.style.top = `calc(50% - ${Math.cos(am) * 107}px)`;
      d.innerHTML = `${it.icon}<small>${it.short || ''}</small>`; box.appendChild(d);
    });
    paint(); el.classList.remove('hidden'); onOpen?.(); navigator.vibrate?.(8);
  };
  const paint = () => {
    el.querySelectorAll('#wheelSvg path').forEach(p => { const i = +p.dataset.i; p.setAttribute('class', (i === hover ? 'on ' : '') + (list[i].disabled ? 'off' : '')); });
    const it = list[hover];
    document.getElementById('wheelName').textContent = it ? it.label : '';
    document.getElementById('wheelSub').innerHTML = it ? (it.sub || '') : '';
  };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    if (id !== null) return; id = e.pointerId; btn.setPointerCapture(id); ox = e.clientX; oy = e.clientY;
    timer = setTimeout(show, 220);
  });
  btn.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - ox, dy = e.clientY - oy, d = Math.hypot(dx, dy);
    if (!open && d > 14) { clearTimeout(timer); show(); }
    if (open && d > 22) { const n = list.length; let a = Math.atan2(dx, -dy); if (a < 0) a += Math.PI * 2; const i = Math.round(a / (Math.PI * 2) * n) % n; if (i !== hover) { hover = i; paint(); navigator.vibrate?.(4); } }
  });
  const end = e => {
    if (e.pointerId !== id) return; id = null; clearTimeout(timer);
    if (open) { open = false; el.classList.add('hidden'); onClose?.(); if (hover >= 0 && !list[hover].disabled) onSelect(list[hover], hover); else if (hover >= 0) onSelect(list[hover], hover); }
    else onTap?.();
  };
  btn.addEventListener('pointerup', end); btn.addEventListener('pointercancel', end);
}
