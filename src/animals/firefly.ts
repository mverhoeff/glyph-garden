import { S, rnd } from '../engine/shape';
import type { SpeciesDef } from '../engine/types';
import { near } from './helpers';

export const firefly: SpeciesDef = {
  id: 'firefly',
  label: 'Firefly',
  dot: '#e8e05a',
  hint: 'click and they flash · they gather and glow near the cursor',
  count: 34,
  radius: 7,
  speed: 1.5,
  flap: 1.2,
  gait: 'Drifting',
  beatLabel: 'Blink rate',
  tweaks: {
    direction: 80,
    spread: 1,
    meander: 1.5,
    hold: 0.6,
    separation: 250,
    farDepth: 0.45,
    shimmer: 0.6,
  },
  palettes: {
    main: ['#2b280b', '#68631b', '#b4ad30', '#e7e167', '#fffbd0'],
    body: ['#3a382d', '#5a5745', '#7a7761'],
  },
  ramp: '.',
  init(a) {
    a.fm = rnd(0.6, 1.4);
    a.near = 0;
  },
  update(a, dt) {
    a.flapMul = a.fm;
    a.near = Math.max(0, a.near - dt * 1.2);
  },
  hover(a, dt, w) {
    // drawn to the cursor like a lamp
    if (!near(a, w, 18)) return;
    a.near = Math.min(1, a.near + dt * 3 * w.T.cursorStrength);
    a.want = w.orbit(a, 4 + 10 * a.seed);
    a.holdMul = 2; // each keeps its own distance, so they form a loose cloud
  },
  // a wave of flashes
  click(w, px, py) {
    for (const a of w.animals) a.flashAt = w.t + Math.hypot(a.x - px, a.y - py) / 45;
    return true;
  },
  sample(x, y, a, w) {
    let glow = Math.max(Math.pow(Math.max(0, Math.sin(a.phase)), 4), 0.55 * a.near);
    if (a.flashAt != null) {
      const e = w.t - a.flashAt;
      if (e > 0 && e < 1.8) glow = Math.max(glow, Math.exp(-e * 2.4));
    }
    if (S.circle(x, y, -1.0, 0, 1.1) < 0) return { tone: 0.15 + 0.85 * glow, glyph: glow > 0.5 ? '*' : '.' };
    if (S.capsule(x, y, 0.2, 0, 1.8, 0, 0.75) < 0) return { tone: 0.5, hue: 'body' };
    const halo = Math.hypot(x + 1.0, y);
    if (glow > 0.05 && halo < 6.5 && (halo < 3 || S.hash(Math.round(x * 2), Math.round(y * 2), 5) > 0.55))
      return { bare: true, glyph: halo < 3 ? ':' : '.', tone: 0.85, alpha: glow * (1 - halo / 6.5) };
    return null;
  },
};
