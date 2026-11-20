import { S, clamp, rnd } from '../engine/shape';
import type { SpeciesDef } from '../engine/types';
import { ease, near, some } from './helpers';

// A chain; the veil tail and fins are loose characters.
const BETTA_COATS = [
  ['red', 'redfin'],
  ['blue', 'bluefin'],
  ['pearl', 'pearlfin'],
];

export const betta: SpeciesDef = {
  id: 'betta',
  label: 'Betta',
  dot: '#ff6f8a',
  hint: 'click and they turn and flare · the nearest come to look at the cursor',
  count: 9,
  radius: 7.5,
  unit: 1.15,
  speed: 2.3,
  flap: 4,
  gait: 'Swimming',
  beatLabel: 'Tail beat',
  chain: { n: 11, spacing: 1.25, bend: 0.4 },
  maxTurn: 2.4,
  tweaks: { direction: 30, spread: 0.3, meander: 0.7, hold: 1.5, separation: 620, farDepth: 0.4 },
  palettes: {
    main: ['#4a0c14', '#8f1626', '#cf2a3c', '#f26070'],
    red: ['#4a0c14', '#8f1626', '#cf2a3c', '#f26070'],
    redfin: ['#7a1626', '#c93a4c', '#ff8a94', '#ffd0d4'],
    blue: ['#0c1c4a', '#17388f', '#2b5ed0', '#6a9af5'],
    bluefin: ['#1f3f9a', '#4a78e0', '#8fb4ff', '#d6e4ff'],
    pearl: ['#5a5560', '#9a94a2', '#d6d0dc', '#f6f2fa'],
    pearlfin: ['#b06a8a', '#e09ab8', '#ffc8dc', '#ffeaf2'],
  },
  ramp: ':=-.',
  init(a) {
    a.coat = BETTA_COATS[Math.floor(a.seed * BETTA_COATS.length)];
    a.flare = 0;
    a.show = 0;
    a.v = 1;
    a.vt = 1;
    a.tm = rnd(1, 4);
  },
  update(a, dt, w) {
    a.tm -= dt;
    if (a.tm <= 0) {
      // now and then it just hangs
      a.vt = Math.random() < 0.25 ? 0.1 : rnd(0.7, 1.3);
      a.tm = a.vt < 0.2 ? rnd(0.8, 2) : rnd(2, 5);
    }
    ease(a, 'v', a.vt, 1.5, dt);
    a.speedMul = a.v;
    a.flapMul = 0.5 + 0.6 * a.v;
    a.show = Math.max(0, a.show - dt * 1.5);
    a.bold = a.flare > 0;
    if (a.flare > 0) {
      // after a click: swing round to point straight at the spot, then hold there, body straight, fins spread
      const dx = a.lx - a.x,
        dy = a.ly - a.y;
      a.want = Math.hypot(dx, dy) > 3 ? Math.atan2(dy, dx) : a.h;
      const off = Math.abs(S.angDiff(a.want, a.h)),
        turning = off > 0.2;
      a.holdMul = 4;
      a.flapMul = 2.2;
      a.speedMul = turning ? 0.3 : Math.hypot(dx, dy) > 6 ? 0.03 : 0;
      a.flare -= dt * (turning ? 0.25 : 1); // the display only really starts once it faces the spot
      w.straighten(a, turning ? 1.5 : 4, dt); // the body swings in behind the head instead of staying bent
    }
  },
  hover(a, dt, w) {
    // the two nearest come over, circle slowly at a distance and puff up
    if (a.mrank >= some(w, 2) || !near(a, w, 24)) return;
    a.want = w.orbit(a, 9 + 4 * a.seed);
    a.holdMul = 1.5;
    a.speedMul = a.md < 14 ? 0.4 : 0.9;
    if (a.md < 15) a.show = Math.min(1, a.show + dt * 4);
  },
  click(w, px, py) {
    for (const a of w.animals)
      if (Math.hypot(a.x - px, a.y - py) < 48) {
        a.flare = rnd(2.6, 3.4);
        a.lx = px;
        a.ly = py;
      }
    return true;
  },
  sample(x, y, a) {
    if (x > 2.2 || x < -13.5) return null;
    y -= Math.sin(a.phase + x * 0.5) * 0.6 * clamp(-x / 8, 0, 1);
    const ay = Math.abs(y),
      [body, fin] = a.coat,
      flick = Math.floor(a.phase * 1.2) + ((a.seed * 1e4) | 0);
    const big = 1 + 0.55 * Math.max(clamp(a.flare * 2, 0, 1), a.show);
    if (Math.hypot(x - 0.7, ay - 1.3) < 0.42) return { dot: true };
    const hw =
      x > -0.5
        ? 1.5 * Math.sqrt(Math.max(0, 1 - Math.pow((x + 0.5) / 2.3, 2)))
        : 1.5 * Math.pow(Math.max(0, 1 - (-0.5 - x) / 5.5), 0.7) + 0.3;
    if (x > -5.6 && ay < hw) return { hue: body, tone: 1 - 0.65 * Math.pow(ay / hw, 2) };
    const frill = () => S.pick('~)(}{/\\~', S.hash(Math.round(x * 1.2), Math.round(y * 1.2), flick));
    if (x <= -4.6) {
      // veil tail
      const t = (-4.6 - x) / 8.6;
      const fw =
        (0.9 + 5.4 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.6)) *
        (1 + 0.14 * Math.sin(a.phase * 1.3 + x)) *
        big;
      if (ay < fw) {
        if (t < 0.22 && ay < 1.3) return { hue: fin, tone: 0.35 };
        return { bare: true, glyph: frill(), hue: fin, tone: 0.95 - 0.55 * t, alpha: 0.95 - 0.6 * t };
      }
      return null;
    }
    if (x < 0.6) {
      // dorsal and belly fins
      const fh =
        2.7 * Math.sin(Math.PI * clamp((0.6 - x) / 5.4, 0, 1)) * (1 + 0.12 * Math.sin(a.phase + x * 2)) * big;
      if (ay < hw + fh) return { bare: true, glyph: frill(), hue: fin, tone: 0.8, alpha: 0.75 };
    }
    return null;
  },
};
