// Gamepad-style touch controls (floating stick + A/B/X/Y) and keyboard fallback.
export class Input {
  constructor() {
    this.sx = 0; this.sy = 0;           // stick, y up = +
    this.keys = new Set();
    this.btn = { a: false, b: false, x: false, y: false };
    this.pressed = { a: false, b: false, x: false, y: false, map: false, pause: false, phone: false, wheel: false, slot: 0 };
    this.mode = 'foot'; // the game sets 'car' while you drive, so keys mean the right thing
    this.touch = false;
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (!this.keys.has(e.code)) {
        // keyboard: E use · F get in/out · Space jump (drift in a car) · click/J attack · R gun/reload · T phone · Q next weapon · 1-9 weapons · M map · Esc pause
        const car = this.mode === 'car', m = { KeyE: 'a', Enter: 'a', KeyF: car ? 'b' : 'a', Space: car ? null : 'b', KeyJ: 'x', KeyR: 'y', KeyM: 'map', Escape: 'pause', KeyP: 'pause', KeyT: 'phone', KeyQ: 'wheel', Tab: 'wpnwheel', KeyG: 'wpnwheel' };
        if (m[e.code]) this.pressed[m[e.code]] = true;
        if (/^Digit[1-9]$/.test(e.code)) this.pressed.slot = +e.code.slice(5);
      }
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys.delete(e.code); if (e.code === 'Tab') this.pressed.wpnwheelUp = true; });
    addEventListener('blur', () => this.clear());
  }
  get stick() {
    let x = this.sx, y = this.sy;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y -= 1;
    const m0 = Math.hypot(x, y); if (m0 > 1) { x /= m0; y /= m0; }
    if (this.mode !== 'car' && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'))) { x *= 0.55; y *= 0.55; } // hold Shift to walk
    const m = Math.hypot(x, y);
    return { x, y, m: Math.min(1, m) };
  }
  held(b) {
    if (b === 'x' && (this.keys.has('KeyJ') || this.mouseDown || (this.mode === 'car' && this.keys.has('Space')))) return true;
    if (b === 'b' && this.keys.has('Space') && this.mode !== 'car') return true;
    return this.btn[b];
  }
  consume(n) { const v = this.pressed[n]; this.pressed[n] = false; return v; }
  clear() { this.resetStick?.(); for (const k in this.pressed) this.pressed[k] = false; for (const k in this.btn) this.btn[k] = false; this.sx = this.sy = 0; this.keys.clear(); this.mouseDown = false; }

  bindTouch({ zone, base, knob, buttons, canvas }) {
    let id = null, ox = 0, oy = 0;
    const R = 52;
    const home = () => { base.style.left = ''; base.style.top = ''; base.classList.remove('live', 'run'); base.style.setProperty('--p', 0); knob.style.transform = 'translate(-50%,-50%)'; };
    this.resetStick = () => { id = null; this.sx = this.sy = 0; home(); };
    zone.addEventListener('pointerdown', e => {
      // a new touch always takes the stick: if the old finger's 'up' got lost (pad hidden mid-drag, iOS gesture), don't stay jammed
      if (id !== null) { try { zone.releasePointerCapture(id); } catch (_) {} id = null; }
      this.touch = true; id = e.pointerId; try { zone.setPointerCapture(id); } catch (_) {}
      const zr = zone.getBoundingClientRect();
      ox = Math.min(zr.right - 70, Math.max(zr.left + 70, e.clientX)); oy = Math.min(zr.bottom - 66, Math.max(zr.top + 66, e.clientY)); // keep the whole stick on screen
      base.style.left = (ox - zr.left) + 'px'; base.style.top = (oy - zr.top) + 'px'; base.classList.add('live');
      e.preventDefault();
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      this.sx = d < 6 ? 0 : dx / R; this.sy = d < 6 ? 0 : -dy / R;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const k = Math.min(1, d / R); base.style.setProperty('--a', (Math.atan2(dx, -dy) * 180 / Math.PI) + 'deg'); base.style.setProperty('--p', d < 6 ? 0 : (0.35 + k * 0.65).toFixed(2)); base.classList.toggle('run', k > 0.85); // rim light points where you push; orange = running
    });
    const end = e => { if (e.pointerId !== id) return; id = null; this.sx = this.sy = 0; home(); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    addEventListener('blur', () => this.resetStick()); document.addEventListener('visibilitychange', () => this.resetStick());
    for (const [name, el] of Object.entries(buttons)) {
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation(); this.touch = true; try { el.setPointerCapture(e.pointerId); } catch (_) {}
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
