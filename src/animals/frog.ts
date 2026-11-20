import { S, clamp, mix, rnd } from '../engine/shape';
import type { SpeciesDef } from '../engine/types';
import { awayFrom, fleeMouse, near } from './helpers';

// Sits still, then makes one long leap.
export const frog: SpeciesDef = {
  id: 'frog',
  label: 'Frog',
  dot: '#8bd450',
  hint: 'click and they all leap · they sit and watch the cursor',
  count: 13,
  radius: 13.5,
  speed: 4,
  flap: 1,
  gait: 'Hopping',
  beatLabel: 'Hop rate',
  maxTurn: 11,
  agility: 16,
  turnGain: 9,
  tweaks: { direction: 45, spread: 0.9, meander: 0.6, hold: 3, separation: 600 },
  palettes: {
    main: ['#0f2c0c', '#1d5214', '#2f7d1d', '#48a52b', '#86cf4e', '#d3ef9a'],
    spot: ['#dfe6e2', '#ffffff'],
  },
  ramp: '.:+.',
  init(a) {
    a.sit = rnd(0, 5);
    a.air = 0;
    a.leap = 0;
    a.dur = 0.55;
    a.pow = 1;
    a.next = 1;
    a.watch = 0;
    a.aim = null;
  },
  update(a, dt, w) {
    const rate = w.T.beat;
    a.watch = Math.max(0, a.watch - dt);
    if (a.air > 0) {
      // in the air its heading is fixed, so every jump is a straight line
      a.air -= dt;
      a.leap = Math.sin(Math.PI * clamp(1 - a.air / a.dur, 0, 1));
      a.speedMul = 9.5 * a.leap * a.pow;
      a.want = a.h;
      a.holdMul = 0;
      a.av = 0;
      if (a.air <= 0) {
        // land: a puff of dots
        a.leap = 0;
        a.sit = rnd(1.2, 6) / Math.max(0.05, rate);
        for (let i = 0; i < 12; i++) w.emit(a, rnd(-5, 5), rnd(-5, 5), '·', 0.7, 0.9, 1.1);
      }
      return;
    }
    a.speedMul = 0;
    if (a.aim != null) {
      // about to jump: turn on the spot, quickly, and only take off once it faces the way it will go
      a.want = a.aim;
      a.holdMul = 6;
      if (Math.abs(S.angDiff(a.aim, a.h)) < 0.07 && Math.abs(a.av) < 0.8) {
        a.aim = null;
        a.av = 0;
        a.dur = rnd(0.45, 0.65);
        a.air = a.dur;
        a.pow = a.next;
      }
      return;
    }
    a.holdMul = 0; // sitting: it does not turn
    if (a.watch > 0) return; // watching the cursor: it stays put
    a.sit -= dt;
    if (a.sit <= 0 && rate > 0.05) {
      a.aim = a.want;
      a.next = rnd(0.7, 1.25);
    }
  },
  hover(a, dt, w) {
    if (a.air > 0 || a.aim != null) return;
    if (near(a, w, 4.5)) {
      // the cursor came too close: turn away, then jump
      a.aim = fleeMouse(a, w) + rnd(-0.3, 0.3);
      a.next = 1.2;
    } else if (near(a, w, 17)) {
      a.watch = 0.3;
      a.want = w.toMouse(a);
      a.holdMul = 2;
    }
  },
  click(w, px, py) {
    // every frog on screen jumps; the near ones turn their backs on the spot first and jump further
    for (const a of w.animals) {
      if (a.air > 0) continue;
      const d = Math.hypot(a.x - px, a.y - py);
      a.watch = 0;
      if (d < 30) {
        a.aim = awayFrom(a, px, py) + rnd(-0.3, 0.3);
        a.next = 1 + 0.5 * (1 - d / 30);
      } else if (a.aim == null) a.sit = Math.random() * 0.3;
    }
    return true;
  },
  sample(x, y, a) {
    const L = a.leap,
      ay = Math.abs(y);
    if (S.circle(x, ay, 3.5 + 1.2 * L, 2.2 - 0.3 * L, 0.8) < 0) return { tone: 1, hue: 'spot', glyph: 'o' }; // eyes on the front corners
    const body = S.smin(
      S.ellipse(x, y, 0, 0, 3.4 + 2.0 * L, 2.7 - 0.8 * L),
      S.ellipse(x, y, 3.0 + 1.3 * L, 0, 1.9, 2.2 - 0.3 * L),
      0.8,
    );
    if (body < 0) {
      const q = S.spot(x, y, a);
      if (q > 0.8) return { tone: q > 0.93 ? 1 : 0.8 }; // pale speckles
      return { tone: body > -0.6 ? 0.3 : 0.55 };
    }
    // hind legs: folded beside the body when sitting, stretched far out behind in a leap
    const kx = mix(0.4, -6.5, L),
      ky = mix(4.3, 2.2, L),
      fx = mix(-3.2, -11.5, L),
      fy = mix(4.8, 1.9, L);
    if (S.capsule(x, ay, -2.5, mix(2.2, 1.5, L), kx, ky, 0.85) < 0) return { tone: 0.45 };
    if (S.capsule(x, ay, kx, ky, fx, fy, 0.65) < 0) return { tone: 0.3 };
    const tx = 3.4 + 2.6 * L,
      ty = 3.9 - 1.6 * L; // front legs
    if (S.capsule(x, ay, 1.8, 2.0, tx, ty, 0.55) < 0) return { tone: 0.45 };
    if (L < 0.15) {
      // little marks around the head of a sitting frog
      if (S.capsule(x, ay, 5.6, 0.6, 6.6, 0.8, 0.3) < 0)
        return { bare: true, ang: 0, tone: 0.9, alpha: 0.55 };
      if (S.circle(x, ay, 5.3, 3.4, 0.5) < 0)
        return { bare: true, ang: 0.8 * Math.sign(y), tone: 0.9, alpha: 0.55 };
    }
    return null;
  },
};
