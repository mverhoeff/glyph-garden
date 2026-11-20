import { S, clamp, rnd } from '../engine/shape';
import type { SpeciesDef } from '../engine/types';

// A loose flock; wide turns, and they roll into them.
export const swift: SpeciesDef = {
  id: 'swift',
  label: 'Swifts',
  dot: '#8794ad',
  hint: 'click and the flock circles that spot',
  count: 24,
  radius: 9,
  unit: 1.35,
  speed: 7,
  flap: 9,
  gait: 'Flight',
  beatLabel: 'Wing beat',
  maxTurn: 1.5,
  agility: 3,
  bankGain: 1.7,
  turnRadius: 11,
  tweaks: { direction: 30, sway: 0.8, spread: 0.15, meander: 0.3, hold: 1.6, separation: 340, farDepth: 0.5 },
  palettes: {
    main: ['#141821', '#252b3a', '#3c465c', '#5c6884', '#8a97b3', '#c9d2e3'],
    spot: ['#dfe5ee', '#ffffff'],
  },
  ramp: '.:-',
  init(a) {
    a.fl = true;
    a.tm = rnd(0, 2);
    a.ring = 0;
  },
  update(a, dt, w) {
    a.tm -= dt;
    if (a.tm <= 0) {
      // flap for a bit, then glide
      a.fl = !a.fl;
      a.tm = a.fl ? rnd(0.5, 1.6) : rnd(0.6, 2.4);
    }
    a.flapMul = a.fl || a.panic > 0.2 ? 1 : 0.03;
    const sw = w.state.swirl;
    if (!sw || a.ring <= 0) return;
    const dx = a.x - sw.x,
      dy = a.y - sw.y,
      d = Math.hypot(dx, dy) || 1;
    if (w.t > sw.until || d > a.ring * 2 + 34) {
      a.ring = 0;
      return;
    }
    // fly round the spot at roughly the distance it already had (never closer than a minimum), drifting gently back if it strays
    a.want = Math.atan2(dy, dx) + sw.dir * (Math.PI / 2 + clamp((d - a.ring) / a.ring, -0.5, 0.6) * 0.8);
    a.holdMul = 2;
    a.speedMul = 1.15;
  },
  // those with room to do it swerve round the cursor; the rest fly straight on
  hover(a, dt, w) {
    if (a.ring <= 0) w.skirt(a, dt);
  },
  click(w, px, py) {
    // never tighter than they can fly (swifts always set turnRadius)
    for (const a of w.animals) {
      const d = Math.hypot(a.x - px, a.y - py);
      a.ring = d < 56 ? Math.max(1.5 * (a.sp.turnRadius as number) * a.sc, d) : 0;
    }
    w.state.swirl = { x: px, y: py, until: w.t + 20, dir: Math.random() < 0.5 ? -1 : 1 };
    return true;
  },
  sample(x, y, a) {
    const ay = Math.abs(y),
      sg = y < 0 ? -1 : 1,
      bank = a.bank * sg; // + on the inside of the turn
    const wy =
      ay /
      ((0.74 + 0.26 * Math.abs(Math.cos(a.phase))) *
        (1 - 0.45 * Math.max(0, bank)) *
        (1 + 0.1 * Math.max(0, -bank)));
    if (S.circle(x, y, 1.9, 0, 0.6) < 0) return { hue: 'spot', tone: 0.7 }; // pale throat
    if (S.capsule(x, y, -2.8, 0, 1.6, 0, 0.85) < 0) return { tone: 0.75 - 0.25 * ay };
    const wing = S.tri(x, wy, 2.0, 0, -1.9, 0, -4.8, 7.0); // solid swept-back wings
    if (wing < 0)
      return {
        tone: (x > 0.4 - wy * 0.62 ? 0.3 : 0.55) - 0.25 * clamp(wy / 7, 0, 1) + 0.2 * Math.max(0, -bank),
      };
    if (S.capsule(x, ay, -2.8, 0.2, -5.2, 1.3, 0.45) < 0) return { tone: 0.3 }; // forked tail
    return null;
  },
};
