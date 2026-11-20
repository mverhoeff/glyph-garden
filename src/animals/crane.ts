import { S, clamp, rnd } from '../engine/shape';
import type { PropSurface, SpeciesDef } from '../engine/types';
import { awayFrom, ease } from './helpers';

const TAU = Math.PI * 2;

// A feather shed on a click: drifts down and sideways, then fades.
interface Feather {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
  t0: number;
  life: number;
  g: string;
  fade: number;
}

// A few slow wingbeats, then a long glide.
export const crane: SpeciesDef = {
  id: 'crane',
  label: 'Crane',
  dot: '#e6e8ee',
  hint: 'click and they veer away, shedding feathers · they curve round the cursor',
  count: 9,
  radius: 13,
  unit: 1.15,
  speed: 5.5,
  flap: 2.6,
  maxTurn: 1.3,
  agility: 3,
  bankGain: 2.2,
  turnRadius: 16,
  tweaks: { direction: 45, spread: 0.1, meander: 0.2, hold: 2, separation: 560 },
  palettes: {
    main: ['#26282d', '#4d5057', '#878a92', '#c0c2c9', '#e8e9ed', '#ffffff'],
    red: ['#7a1420', '#c7283a', '#ff5068'],
  },
  ramp: '.:-=',
  init(a) {
    a.fp = 0;
    a.fb = 0;
    a.gl = rnd(0, 2.5);
    a.wk = 1;
    a.ws = 0;
  },
  update(a, dt, w) {
    a.flapMul = 0;
    if (a.fb > 0 || a.panic > 0.25) {
      a.fp += dt * 2.6 * w.T.beat * (1 + a.panic);
      ease(a, 'wk', Math.cos(a.fp), 12, dt);
      ease(a, 'ws', Math.sin(a.fp), 12, dt);
      if (a.fp >= a.fb * TAU && a.panic <= 0.25) {
        a.fb = 0;
        a.gl = rnd(1, 3.5);
      }
    } else {
      ease(a, 'wk', 1, 3, dt);
      ease(a, 'ws', 0, 3, dt);
      a.gl -= dt;
      if (a.gl <= 0) {
        a.fb = 2 + Math.floor(Math.random() * 3);
        a.fp = 0;
      }
    }
    a.speedMul = a.fb > 0 ? 1.08 : 0.95;
  },
  // those with room to do it curve round the cursor; the rest fly straight on
  hover(a, dt, w) {
    w.skirt(a, dt);
  },
  click(w, px, py) {
    // they veer away with hard wingbeats and shed a few feathers that drift off and fade
    for (const a of w.animals) {
      const d = Math.hypot(a.x - px, a.y - py);
      if (d > 42) continue;
      w.flee(a, a.h + clamp(S.angDiff(awayFrom(a, px, py), a.h), -1.1, 1.1), 1.8, 0.35 + 0.45 * (1 - d / 42)); // a bird in flight cannot turn back on itself
      a.fb = 5;
      a.fp = 0;
      for (let i = 0; i < 5; i++) {
        w.props.push({
          x: a.x + rnd(-5, 5) * a.sc,
          y: a.y + rnd(-5, 5) * a.sc,
          vx: rnd(-1.2, 1.2),
          vy: rnd(1.2, 2.6),
          ph: rnd(0, 6),
          t0: w.t + rnd(0, 0.5),
          life: rnd(2.5, 4.5),
          g: S.pick('\',~"`', Math.random()),
          fade: 0.4 + 0.6 * a.u,
          draw(this: Feather, w: PropSurface) {
            const age = w.t - this.t0;
            if (age < 0) return;
            if (age > this.life) return false;
            w.glyphAt(
              Math.floor(this.x + this.vx * age + Math.sin(age * 2.2 + this.ph) * 1.6),
              Math.floor(this.y + this.vy * age),
              '#e8e9ed',
              this.g,
              this.fade * Math.min(1, (this.life - age) / 1.2),
            );
          },
        });
      }
    }
    return true;
  },
  sample(x, y, a) {
    const ay = Math.abs(y),
      sg = y < 0 ? -1 : 1;
    const bank = 1 - 0.3 * Math.max(0, a.bank * sg); // the inside wing shortens in a turn
    const spanK = (0.74 + 0.26 * a.wk * a.wk) * bank,
      sweep = 1.4 * a.ws;
    if (Math.hypot(x - 8.5, ay - 1.0) < 0.42) return { dot: true };
    if (Math.abs(x - 7.5) < 0.6 && ay < 0.6) return { hue: 'red', tone: 0.8 };
    if (S.circle(x, y, 8.4, 0, 0.8) < 0) return { tone: 1 };
    if (S.capsule(x, y, 9.3, 0, 11, 0, 0.35) < 0) return { bare: true, ang: 0, tone: 0.45 };
    if (S.capsule(x, y, 2, 0, 8, 0, 0.5) < 0) return { tone: 0.9 };
    if (S.ellipse(x, y, 0, 0, 3.1, 1.5) < 0) return { tone: 1 - 0.35 * (ay / 1.5) };
    const tx = -2.2 + sweep,
      ty = 11 * spanK;
    const wing = Math.min(
      S.tri(x, ay, 2.2, 1, -2.5, 1, tx - 1.2, ty),
      S.tri(x, ay, 2.2, 1, tx - 1.2, ty, tx + 1.7, ty - 1.2),
    );
    if (wing < 0) {
      if (ay > ty * 0.86) return { tone: 0.12 }; // black wing tips
      if (wing > -0.5 && x < 0.3) return { tone: 0.45 }; // shaded trailing edge
      return { tone: 0.85 + 0.15 * S.spot(x, y, a, 0.5) };
    }
    if (S.tri(x, ay, -2.6, 0, -5.2, 0, -4.8, 1.5) < 0) return { tone: 0.3 };
    if (S.capsule(x, ay, -4.8, 0.35, -9.5, 0.5, 0.3) < 0)
      return { bare: true, ang: 0, tone: 0.35, alpha: 0.9 };
    return null;
  },
};
