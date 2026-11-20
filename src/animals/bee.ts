import { S, rnd } from '../engine/shape';
import type { SpeciesDef } from '../engine/types';
import { ease, near, some } from './helpers';

// A busy zigzagging swarm; a few tag along with the cursor.
export const bee: SpeciesDef = {
  id: 'bee',
  label: 'Bees',
  dot: '#ffcf2e',
  hint: 'a few bees follow the cursor · click to shoo them',
  count: 34,
  radius: 4.5,
  unit: 1.6,
  speed: 4,
  flap: 22,
  gait: 'Flight',
  beatLabel: 'Buzz',
  maxTurn: 4.5,
  agility: 8,
  tweaks: { direction: 20, spread: 0.5, meander: 1.6, hold: 3.2, separation: 260, farDepth: 0.5 },
  palettes: {
    main: ['#3d2c00', '#8a6500', '#d9a400', '#ffcf2e', '#ffe98a'],
    black: ['#0b0b0d', '#1a1a1f', '#2b2b33'],
    spot: ['#cfd3da', '#ffffff'],
  },
  ramp: '.:',
  init(a) {
    a.zz = rnd(4, 8);
    a.tm = rnd(0, 3);
    a.hang = false;
    a.v = 1;
    a.zig = 0;
  },
  update(a, dt, w) {
    a.tm -= dt;
    if (a.tm <= 0) {
      // sometimes it stops to hover
      a.hang = !a.hang && Math.random() < 0.4;
      a.tm = a.hang ? rnd(0.3, 1.1) : rnd(0.8, 3.5);
      a.zz = rnd(4, 8);
    }
    a.zig = Math.sin(w.t * a.zz + a.seed * 60);
    ease(a, 'v', a.hang ? 0.12 : 0.8 + 0.4 * Math.sin(w.t * 2.3 + a.seed * 20), 5, dt);
    a.speedMul = a.v;
    a.want += 0.9 * a.zig;
  },
  hover(a, dt, w) {
    // the five nearest trail the cursor and circle it in a wide loop
    if (w.t < (w.state.shooed || 0) || a.mrank >= some(w, 5) || !near(a, w, 50)) return;
    a.want = w.orbit(a, 12 + 6 * a.seed) + 0.4 * a.zig;
    a.holdMul = 2;
    a.speedMul = a.md > 22 ? 1.8 : 1.15;
  },
  click(w, px, py) {
    w.state.shooed = w.t + 3;
    w.scatter(px, py, 16, 0.8);
    return true;
  },
  sample(x, y, a) {
    const ay = Math.abs(y);
    if (S.circle(x, y, 1.9, 0, 0.85) < 0) return { hue: 'black', tone: 0.6 };
    if (S.capsule(x, y, -1.5, 0, 1.1, 0, 1.0) < 0)
      return Math.floor((x + 1.6) / 0.95) % 2 ? { hue: 'black', tone: 0.4 } : { tone: 0.75 };
    if (S.ellipse(x, ay, -0.3, 2.0, 1.4, 1.15) < 0)
      return {
        bare: true,
        glyph: S.pick('\'"*:.', S.hash(Math.round(x * 2), Math.round(y * 2), Math.floor(a.phase * 0.4))),
        hue: 'spot',
        tone: 1,
        alpha: 0.55,
      };
    if (S.capsule(x, y, -2.4, 0, -3.1, 0, 0.3) < 0)
      return { bare: true, ang: 0, hue: 'black', tone: 1, alpha: 0.8 };
    return null;
  },
};
