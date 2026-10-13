// Gamepad-style touch controls (floating stick + A/B/X/Y) and keyboard fallback.
export class Input {
  constructor() {
    this.sx = 0; this.sy = 0;           // stick, y up = +
    this.keys = new Set();
    this.btn = { a: false, b: false, x: false, y: false };
    this.pressed = { a: false, b: false, x: false, y: false, map: false, pause: false };
    this.touch = false;
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (!this.keys.has(e.code)) {
        const m = { KeyE: 'a', Enter: 'a', Space: 'b', KeyJ: 'x', KeyR: 'y', KeyM: 'map', Escape: 'pause', KeyP: 'pause', KeyL: 'y' };
        if (m[e.code]) this.pressed[m[e.code]] = true;
      }
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.clear());
  }
  get stick() {
    let x = this.sx, y = this.sy;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    const m = Math.hypot(x, y); if (m > 1) { x /= m; y /= m; }
    return { x, y, m: Math.min(1, m) };
  }
  held(b) {
    if (b === 'x' && (this.keys.has('KeyJ') || this.mouseDown)) return true;
    if (b === 'b' && this.keys.has('Space')) return true;
    return this.btn[b];
  }
  consume(n) { const v = this.pressed[n]; this.pressed[n] = false; return v; }
  clear() { for (const k in this.pressed) this.pressed[k] = false; for (const k in this.btn) this.btn[k] = false; this.sx = this.sy = 0; this.keys.clear(); this.mouseDown = false; }

  bindTouch({ zone, base, knob, buttons, canvas }) {
    let id = null, ox = 0, oy = 0;
    const R = 52;
    const home = () => { base.style.left = ''; base.style.top = ''; base.classList.remove('live'); knob.style.transform = 'translate(-50%,-50%)'; };
    zone.addEventListener('pointerdown', e => {
      if (id !== null) return;
      this.touch = true; id = e.pointerId; zone.setPointerCapture(id);
      const zr = zone.getBoundingClientRect();
      ox = Math.max(zr.left + 70, e.clientX); oy = Math.min(zr.bottom - 66, Math.max(zr.top + 66, e.clientY)); // keep the whole stick on screen
      base.style.left = (ox - zr.left) + 'px'; base.style.top = (oy - zr.top) + 'px'; base.classList.add('live');
      e.preventDefault();
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      this.sx = d < 6 ? 0 : dx / R; this.sy = d < 6 ? 0 : -dy / R;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const end = e => { if (e.pointerId !== id) return; id = null; this.sx = this.sy = 0; home(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
    for (const [name, el] of Object.entries(buttons)) {
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation(); this.touch = true; el.setPointerCapture(e.pointerId);
        if (name in this.btn) this.btn[name] = true;
        this.pressed[name] = true; el.classList.add('down');
        if (navigator.vibrate) navigator.vibrate(6);
      });
      const up = () => { if (name in this.btn) this.btn[name] = false; el.classList.remove('down'); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    }
    if (canvas) {
      canvas.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') this.mouseDown = true; });
      addEventListener('pointerup', e => { if (e.pointerType === 'mouse') this.mouseDown = false; });
    }
  }
}
