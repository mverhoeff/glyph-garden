import { S, clamp } from '../engine/shape';
import type { SpeciesDef } from '../engine/types';
import { fleeMouse } from './helpers';

export const jellyfish: SpeciesDef = {
  id: 'jellyfish',
  label: 'Jellyfish',
  dot: '#d55fd0',
  hint: 'click to scatter · the cursor pushes them like a current',
  count: 9,
  radius: 8,
  unit: 1.15,
  speed: 2.2,
  flap: 1.8,
  gait: 'Drifting',
  beatLabel: 'Pulse',
  maxTurn: 1.1,
  agility: 3,
  chain: { n: 14, spacing: 1.4, bend: 0.3 }, // the bell leads; the tentacles trail behind it through turns
  tweaks: { direction: 45, spread: 0.15, meander: 0.3, hold: 1.2, separation: 420 },
  palettes: {
    main: ['#2a0a2d', '#571460', '#872490', '#b53ab2', '#d86ccf', '#f1b0e8'],
    spot: ['#f3d6ef', '#ffffff'],
  },
  ramp: '.:=',
  update(a) {
    a.speedMul = 0.85 + 0.3 * Math.max(0, Math.sin(a.phase));
  }, // a steady drift with a faint pulse
  hover(a, dt, w) {
    const R = 11 * w.T.cursorReach;
    if (a.md < R) {
      const f = (1 - a.md / R) * w.T.cursorStrength,
        ang = fleeMouse(a, w);
      a.ix += Math.cos(ang) * f * 22 * dt;
      a.iy += Math.sin(ang) * f * 22 * dt;
    }
  },
  click(w, px, py) {
    w.scatter(px, py, 40, 0.6);
    return true;
  },
  sample(x, y, a) {
    const p = 0.5 + 0.5 * Math.sin(a.phase);
    const rx = 3.8 - 0.2 * p,
      ry = 4.4 - 0.45 * p,
      ay = Math.abs(y);
    const dome = S.ellipse(x, y, 0, 0, rx, ry);
    if (dome < 0 && x > -1.5) {
      const depth = Math.min(-dome, x + 1.5);
      if (x < -0.5 && ay > ry * 0.45 && S.spot(x, y, a) > 0.6) return { tone: 1, hue: 'spot', glyph: 'o' };
      if (depth < 0.8) return { tone: 0.22 };
      if (S.ellipse(x, y, 1.3, -1.3, 1.5, 1.1) < 0) return { tone: 0.95 };
      return { tone: 0.38 + 0.45 * clamp((depth - 0.8) / 2.4, 0, 1) };
    }
    if (S.capsule(x, ay + Math.sin(a.phase * 0.8 + x) * 0.3, -1.5, 1.1, -4.8, 1.5, 0.6) < 0)
      return { tone: 0.3 };
    if (x < -1.5 && x > -17.5) {
      const fade = 1 + x / 17.5,
        t = clamp((-x - 1.5) / 4, 0, 1);
      for (let k = 0; k < 6; k++) {
        const ty =
          ((k - 2.5) / 2.5) * ry * 0.85 * (1 - 0.3 * (1 - fade)) +
          Math.sin(a.phase * 0.8 + x * 0.55 + k * 1.9) * 0.9 * t;
        if (Math.abs(y - ty) < 0.5) {
          const g = S.pick(
            ')(}{$~-',
            S.hash(Math.round(x * 1.2), k, Math.floor(a.phase * 1.6) + ((a.seed * 1e4) | 0)),
          );
          return { bare: true, glyph: g, tone: 0.55 + 0.4 * fade, alpha: 0.2 + 0.8 * fade };
        }
      }
      if (ay < 7 && S.spot(x, y, a) > 0.84) return { bare: true, glyph: '·', tone: 0.7, alpha: 0.3 * fade };
    }
    return null;
  },
  trail(a, dt, w) {
    if (Math.random() < dt * 8)
      w.emit(a, -3 - Math.random() * 13, (Math.random() - 0.5) * 9, w.lineGlyph(a), 0.35, 0.8, 1.0);
  },
};
