// Touch (virtual stick + buttons) and keyboard/mouse input.
export class Input {
  constructor() {
    this.stickX = 0; this.stickY = 0;
    this.keys = new Set();
    this.btn = { fire: false, jump: false, reload: false, nade: false };
    this.pressed = { jump: false, reload: false, nade: false, pause: false };
    this.mouse = { x: 0, y: 0, active: false, down: false };
    this.touchMode = false;
    this.bindKeyboard();
  }

  get move() {
    let m = this.stickX;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) m -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) m += 1;
    return Math.max(-1, Math.min(1, m));
  }
  get fire() { return this.btn.fire || this.mouse.down || this.keys.has('KeyJ') || this.keys.has('KeyK'); }
  get jumpHeld() { return this.btn.jump || this.keys.has('Space') || this.keys.has('KeyW') || this.keys.has('ArrowUp'); }

  consume(name) { const v = this.pressed[name]; this.pressed[name] = false; return v; }
  clear() { for (const k in this.pressed) this.pressed[k] = false; for (const k in this.btn) this.btn[k] = false; this.stickX = this.stickY = 0; this.mouse.down = false; this.keys.clear(); }

  bindKeyboard() {
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      if (!this.keys.has(e.code)) {
        if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) this.pressed.jump = true;
        if (e.code === 'KeyR') this.pressed.reload = true;
        if (e.code === 'KeyG') this.pressed.nade = true;
        if (e.code === 'Escape' || e.code === 'KeyP') this.pressed.pause = true;
      }
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.clear());
  }

  bindMouse(canvas) {
    canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.active = true; });
    canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; this.mouse.down = true; this.mouse.active = true; });
    addEventListener('pointerup', e => { if (e.pointerType === 'mouse') this.mouse.down = false; });
  }

  bindTouch({ zone, base, knob, buttons }) {
    let id = null, ox = 0, oy = 0;
    const R = 56;
    zone.addEventListener('pointerdown', e => {
      if (id !== null) return;
      this.touchMode = true; this.mouse.active = false;
      id = e.pointerId; ox = e.clientX; oy = e.clientY;
      zone.setPointerCapture(id);
      base.style.left = ox + 'px'; base.style.top = oy + 'px'; base.classList.add('on');
      knob.style.transform = 'translate(-50%,-50%)';
      e.preventDefault();
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx *= R / d; dy *= R / d; }
      this.stickX = Math.abs(dx) < 8 ? 0 : dx / R;
      this.stickY = -dy / R;
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const end = e => {
      if (e.pointerId !== id) return;
      id = null; this.stickX = this.stickY = 0; base.classList.remove('on');
    };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);

    for (const [name, el] of Object.entries(buttons)) {
      if (!el) continue;
      el.addEventListener('pointerdown', e => {
        e.preventDefault(); this.touchMode = true; this.mouse.active = false;
        el.setPointerCapture(e.pointerId);
        if (name in this.btn) this.btn[name] = true;
        if (name in this.pressed) this.pressed[name] = true;
        el.classList.add('down');
        if (navigator.vibrate) navigator.vibrate(5);
      });
      const up = () => { if (name in this.btn) this.btn[name] = false; el.classList.remove('down'); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    }
  }
}
