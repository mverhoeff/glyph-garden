import { S, clamp, smooth } from '../engine/shape';
import type { SpeciesDef } from '../engine/types';
import { awayFrom } from './helpers';

export const manta: SpeciesDef = {
  id: 'manta',
  label: 'Manta',
  dot: '#4fb3a9',
  hint: 'click and the nearby ones dive',
  count: 8,
  radius: 14,
  unit: 1.2,
  speed: 3,
  flap: 1.7,
  gait: 'Gliding',
  beatLabel: 'Wing beat',
  maxTurn: 1.1,
  agility: 2.5,
  tweaks: {
    direction: 30,
    spread: 0.2,
    meander: 0.5,
    hold: 1.2,
    separation: 500,
    farDepth: 0.45,
    farBias: 0.8,
  },
  palettes: {
    main: ['#081a1d', '#0f3034', '#184f52', '#287873', '#4fae9f', '#b9ecde'],
    spot: ['#d6f5ec', '#ffffff'],
  },
  ramp: '.:-',
  update(a, dt) {
    // after a click: sink deeper (smaller and dimmer), glide on, then rise again
    if (a.dv == null) return;
    a.dv += dt;
    const b = smooth(a.dv / 1.1) * (1 - smooth((a.dv - 3.6) / 1.8));
    a.zoom = 1 - 0.5 * b;
    a.fade = 1 - 0.62 * b;
    a.speedMul = 1 + 0.5 * b;
    a.flapMul = 1 + b;
    if (a.dv > 5.4) {
      a.dv = null;
      a.zoom = 1;
      a.fade = 1;
    }
  },
  // those with room to do it curve round the cursor; the rest glide straight on
  hover(a, dt, w) {
    w.skirt(a, dt, 1, 0.9);
  },
  click(w, px, py) {
    for (const a of w.animals) {
      if (a.dv != null || Math.hypot(a.x - px, a.y - py) > 44) continue;
      a.dv = 0;
      w.flee(a, a.h + S.angDiff(awayFrom(a, px, py), a.h) * 0.45, 1.5, 0.15);
    }
    return true;
  },
  sample(x, y, a) {
    const ay = Math.abs(y),
      span = 9.6 * (0.84 + 0.16 * Math.cos(a.phase));
    if (Math.hypot(x - 3.3, ay - 2.2) < 0.42) return { dot: true };
    if (S.capsule(x, ay, 3.7, 1.25, 5.7, 0.95, 0.55) < 0) return { tone: 0.75 }; // the two head fins
    const wx = x + Math.sin(a.phase - ay * 0.38) * 1.1 * clamp(ay / span, 0, 1); // wings ripple outward
    let wing = Math.min(
      S.tri(wx, ay, 4.2, 0.2, 0.5, 0.2, -1.2, span),
      S.tri(wx, ay, 0.5, 0, -3.8, 0, -1.2, span),
    );
    wing = Math.max(wing, -S.circle(wx, ay, -5.6, span * 0.52, 2.7)); // curved trailing edge
    const m = Math.min(wing, S.ellipse(x, y, 0.2, 0, 4.2, 2.2));
    if (m < 0) {
      if (x > 3.4 && ay < 0.7) return { tone: 0 }; // mouth
      if (S.ellipse(x, ay, 1.3, 2.7, 1.5, 0.9) < 0) return { hue: 'spot', tone: 0.8 }; // pale shoulder patches
      if (ay > span * 0.8) return { tone: 0.8 }; // pale wing tips
      if (m > -0.6) return { tone: 0.12 };
      if (ay < 0.5 && x < 1) return { tone: 0.2 }; // spine
      return { tone: 0.3 + 0.35 * clamp(1 - ay / span, 0, 1) };
    }
    if (S.capsule(x, y + Math.sin(a.phase + x * 0.5) * 0.4, -3.6, 0, -13.5, 0, 0.3) < 0)
      return { bare: true, ang: 0, tone: 0.7, alpha: 0.8 };
    return null;
  },
};
