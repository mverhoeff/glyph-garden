import { S, clamp, rnd } from '../engine/shape';
import type { SpeciesDef } from '../engine/types';
import { ease, fleeMouse, near, some } from './helpers';

export const butterfly: SpeciesDef = {
  id: 'butterfly',
  label: 'Butterfly',
  dot: '#4f8ef0',
  hint: 'click to scatter · hold the cursor still and one lands on it',
  count: 14,
  radius: 10.5,
  speed: 3.4,
  flap: 9,
  maxTurn: 2.6,
  agility: 5,
  tweaks: {
    direction: 40,
    speed: 1.05,
    spread: 0.35,
    size: 1.25,
    farDepth: 0.18,
    farBias: 1.7,
    meander: 0.6,
    hold: 2.2,
    separation: 700,
  },
  palettes: {
    main: ['#1b1d57', '#1f3f9e', '#2a6fd6', '#3d97ee', '#62bbf8', '#9bdcff'],
    body: ['#07080f', '#14182a', '#2a3048'],
    spot: ['#d6e9fd', '#f4f9ff'],
  },
  ramp: '.:=+-',
  init(a) {
    a.fm = rnd(0.85, 1.2);
    a.open = 1;
    a.fb = 0;
    a.fp = 0;
    a.gl = rnd(0, 1.6);
    a.v = 0.8;
    a.kink = 0;
    a.perch = 0;
  },
  update(a, dt, w) {
    a.flapMul = 0; // the wings keep their own time: a short burst of flaps, then a glide
    if (a.perch > 0.5)
      a.open = 0.55 + 0.4 * Math.sin(w.t * 2.2 + a.seed * 9); // resting: wings slowly open and close
    else if (a.fb > 0) {
      a.fp += dt * 9 * w.T.beat * a.fm * (1 + a.panic);
      a.open = 0.14 + 0.86 * Math.abs(Math.cos(a.fp));
      if (a.fp >= a.fb * Math.PI) {
        a.fb = 0;
        a.gl = rnd(0.35, 1.9);
      }
      const bob = 2.4 * Math.sin(a.fp * 2) * (0.4 + 0.6 * a.u); // each beat nudges it sideways
      a.x -= Math.sin(a.h) * bob * dt;
      a.y += Math.cos(a.h) * bob * dt;
      if (Math.random() < dt * 5) w.emit(a, rnd(-6, 6), rnd(-6, 6), '·', 0.5, 0.6, 1.4);
    } else {
      a.open += (1 - a.open) * Math.min(1, dt * 10);
      a.gl -= dt * (1 + 4 * a.panic);
      if (a.gl <= 0) {
        a.fb = 1 + Math.floor(Math.random() * 3);
        a.fp = 0;
        a.kink = rnd(-0.6, 0.6);
      }
    }
    a.kink *= Math.exp(-dt * 0.8);
    a.want += a.kink;
    ease(a, 'v', a.fb > 0 ? 1.3 : 0.7, 3, dt);
    a.speedMul = a.v * (1 - a.perch);
    a.perch = Math.max(0, a.perch - dt * 1.5);
  },
  hover(a, dt, w) {
    const m = w.mouse;
    if (m.v > 30 && near(a, w, 12)) {
      w.flee(a, fleeMouse(a, w), 0.8, 0.7);
      a.perch = 0;
      return;
    } // a fast cursor startles them
    if (a.mrank >= some(w, 3) || !near(a, w, 22)) return;
    if (a.mrank === 0) {
      // the nearest one comes over and settles on a still cursor
      a.want = w.toMouse(a);
      a.holdMul = 2;
      if (a.md < 2.2 && m.v < 3) a.perch = Math.min(1, a.perch + dt * 4);
    } else {
      a.want = w.orbit(a, 11 + 5 * a.seed);
      a.holdMul = 1.6;
    } // the next couple circle it at a distance
  },
  sample(x, y, a) {
    const ay = Math.abs(y),
      wy = ay / Math.max(0.14, a.open);
    if (S.capsule(x, y, -1.6, 0, 1.8, 0, 0.55) < 0) return { tone: 0.3, hue: 'body' };
    if (a.open > 0.5) {
      // antennae sit in the gap between the two front wings
      if (S.circle(x, ay, 6.7, 2.4, 0.55) < 0)
        return { bare: true, glyph: 'o', tone: 1, hue: 'spot', alpha: 0.9 };
      if (S.capsule(x, ay, 2.6, 0.6, 6.1, 2.1, 0.32) < 0)
        return { bare: true, ang: 0.42 * Math.sign(y), tone: 1, hue: 'spot', alpha: 0.8 };
    }
    if (x > 0.8 && Math.atan2(wy, x) < 0.44) return null;
    // each wing is a rounded slab pointing away from the body: two big front ones, two smaller back ones
    const slab = (ang: number, d: number, hl: number, hw: number) => {
      const c = Math.cos(ang),
        s = Math.sin(ang),
        qx = Math.abs(x * c + wy * s - d) - hl + 1.1,
        qy = Math.abs(-x * s + wy * c) - hw + 1.1;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - 1.1;
    };
    const fore = slab(0.98, 4.9, 3.5, 2.7),
      hind = slab(2.3, 3.9, 2.5, 2.4),
      m = Math.min(fore, hind);
    if (m >= 0) return null;
    const depth = -m * a.sc,
      q = S.spot(x, wy, a); // depth in screen cells, so the rim is one tile at any size
    if (fore < 0 && hind < 0 && Math.abs(fore - hind) < 0.5) return { tone: 0 }; // dark seam between front and back wing
    if (depth < 0.8) return q > 0.86 ? { tone: 1, hue: 'spot', glyph: 'o' } : { tone: 0.05 }; // dark rim with the odd white tile
    if (q > 0.955) return { tone: 0.6, hue: 'spot', glyph: '%' };
    return { tone: 0.45 + 0.55 * clamp((depth - 0.8) / 1.8, 0, 1) };
  },
};
