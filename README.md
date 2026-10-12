# Rooftop Run

A 2.5D side-scrolling shooter built with three.js, with a full character creator and a modular gunsmith. Plain HTML/CSS/JS, so no build step is needed. It runs straight from GitHub Pages.

## Controls

**iPhone / touch:** drag anywhere on the left side to move, and pull down on a platform to drop through it. Use JUMP, FIRE and ⟳ (reload). 💣 appears if your gun has a grenade launcher. Aim assist targets the nearest enemy. Push the stick up or down to aim manually.

**Keyboard:** A/D to move, W or Space to jump, S to drop, mouse to aim and shoot, R to reload, G for a grenade, Esc to pause.

## Customisation

- **Character:** height, build, head size, leg and arm length, skin; head shape, eyes, mouth, facial hair, eyewear, masks; 11 hairstyles; tops, legs, shoes, gloves; headwear; back items. Every part can be recoloured, with a custom colour picker. A jetpack gives a double jump, and wings let you glide.
- **Gunsmith:** 8 frames, fire mode, stock, grip, barrel, muzzle, underbarrel, sight, magazine, ammo type (AP, hollow point, incendiary, frost, explosive), tracer colour, and paint finishes including camo, carbon and gold. Stats update live from your parts.

Everything saves to the device automatically.

## Run locally

```
python3 -m http.server 8000
```
Then open http://localhost:8000.
