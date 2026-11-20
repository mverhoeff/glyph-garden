import { S, clamp, rnd } from '../engine/shape';
import type { Food, SpeciesDef } from '../engine/types';
import { ease, near, some } from './helpers';

// A chain: the head leads, the body follows; click to feed.
const KOI_PATTERNS = ['kohaku', 'kohaku', 'sanke', 'showa', 'ogon', 'chagoi'];

export const koi: SpeciesDef = {
  id: 'koi',
  label: 'Koi',
  dot: '#f0c040',
  eats: true,
  hint: 'click to feed · the small ones grow · they follow the cursor hoping for more',
  count: 16,
  radius: 5,
  unit: 1.15,
  speed: 3.2,
  flap: 5.5,
  gait: 'Swimming',
  beatLabel: 'Tail beat',
  chain: { n: 11, spacing: 1.4, bend: 0.4 },
  maxTurn: 2.4,
  tweaks: { direction: 49, speed: 1.6, spread: 0.12, hold: 2.65, separation: 780, meander: 0.4 },
  palettes: {
    main: ['#55565c', '#9a9ba3', '#d2d3d9', '#f4f4f6'],
    white: ['#55565c', '#9a9ba3', '#d2d3d9', '#f4f4f6'],
    red: ['#5a0f12', '#9c1a1c', '#d42a24', '#f0503c'],
    black: ['#0e0e11', '#1c1d22', '#2c2d34', '#3d3e47'],
    gold: ['#6b4a0c', '#b5821a', '#e8b12e', '#fbd668'],
    brown: ['#4a2208', '#8a4412', '#c46a1e', '#e8923a'],
    fin: ['#1d1e23', '#33343b', '#4c4d56', '#6a6b75'],
  },
  ramp: ':=-+:',
  init(a) {
    a.pat = KOI_PATTERNS[Math.floor(a.seed * KOI_PATTERNS.length)];
    a.v = 1;
    a.vt = rnd(0.7, 1.3);
    a.tm = rnd(1, 4);
  },
  update(a, dt, w) {
    a.tm -= dt;
    if (a.tm <= 0) {
      // lazy stretches and quicker ones
      a.vt = rnd(0.6, 1.4);
      a.tm = rnd(1.5, 5);
    }
    ease(a, 'v', a.vt, 1.2, dt);
    a.speedMul = a.v;
    a.flapMul = 0.55 + 0.5 * a.v;
    a.fed = false;
    // foodRange is set for every species that eats (see the Feeding tweaks), so it is always present here.
    let best: Food | null = null,
      bd = (w.T.foodRange as number) / w.cs;
    for (const f of w.food) {
      if (f.eaten) continue;
      const d = Math.hypot(f.x - a.x, f.y - a.y);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    if (best) {
      // a pellet is within range: turn toward it
      a.want = Math.atan2(best.y - a.y, best.x - a.x);
      a.holdMul = 1.6;
      a.speedMul = 1.5;
      a.flapMul = 1.7;
      a.fed = true;
      if (bd < 1.8 * a.sc) {
        // each pellet makes a small koi a little bigger, up to full size
        best.eaten = true;
        w.grow(a, 0.02);
      }
    }
  },
  hover(a, dt, w) {
    // the nearest few trail the cursor and circle it at a distance
    if (a.fed || a.mrank >= some(w, 5) || !near(a, w, 26)) return;
    a.want = w.orbit(a, 8 + 5 * a.seed);
    a.holdMul = 1.3;
    a.speedMul = a.md < 14 ? 0.75 : 1.2;
  },
  sample(x, y, a) {
    if (x > 2 || x < -13) return null;
    y -= Math.sin(a.phase + x * 0.45) * 0.75 * clamp(-x / 11, 0, 1); // tail beat, stronger toward the tail
    const ay = Math.abs(y);
    if (Math.hypot(x - 0.5, ay - 2.2) < 0.5) return { dot: true };
    const hw =
      x > -1
        ? 1.95 * Math.sqrt(Math.max(0, 1 - Math.pow((x + 1) / 2.8, 2)))
        : 1.95 * Math.pow(Math.max(0, 1 - (-1 - x) / 9.2), 0.75) + 0.3;
    if (x > -9.6 && ay < hw) {
      const s = a.seed * 100;
      const n = Math.sin(x * 0.8 + s) * Math.cos(y * 1.1 + s * 1.7) + 0.6 * Math.sin(x * 0.35 + s * 2.3);
      const n2 = Math.sin(x * 1.7 + s * 3.1) * Math.sin(y * 2.3 + s * 0.7);
      // eslint-disable-next-line no-useless-assignment -- kept as in the prototype; every branch below assigns it
      let hue = 'white';
      if (a.pat === 'kohaku') hue = n > 0.2 ? 'red' : 'white';
      else if (a.pat === 'sanke') hue = n2 > 0.7 ? 'black' : n > 0.3 ? 'red' : 'white';
      else if (a.pat === 'showa') hue = n > 0.35 ? 'red' : n2 > 0.05 ? 'black' : 'white';
      else if (a.pat === 'ogon') hue = 'gold';
      else hue = 'brown';
      return { hue, tone: 1 - 0.6 * Math.pow(ay / hw, 2) };
    }
    if (S.ellipse(x, ay, -1.7, 2.7, 1.5, 0.85) < 0) return { hue: 'fin', tone: 0.55, glyph: '=' };
    if (x <= -9.2) {
      // forked tail
      const t = -9.2 - x,
        thw = 0.45 + t * 0.5;
      if (t < 3.4 && ay < thw && !(t > 2 && ay < (t - 2) * 0.8))
        return { hue: 'fin', tone: 0.35 + 0.4 * (1 - t / 3.4), ang: ay < 0.5 ? 0 : Math.sign(y) * -0.6 };
    }
    return null;
  },
};
