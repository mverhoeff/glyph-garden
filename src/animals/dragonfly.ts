import { S, clamp, rnd } from '../engine/shape';
import type { SpeciesDef } from '../engine/types';
import { awayFrom, ease, fleeMouse, near } from './helpers';

export const dragonfly: SpeciesDef = {
  id: 'dragonfly',
  label: 'Dragonfly',
  dot: '#52d476',
  hint: 'click and they dart off · they turn to watch the cursor',
  count: 10,
  radius: 14.5,
  speed: 7,
  flap: 18,
  maxTurn: 4,
  agility: 10,
  fleeTurn: 16,
  tweaks: { direction: 45, spread: 0.3, meander: 0.4, hold: 2.2, separation: 420 },
  palettes: {
    main: ['#0b2812', '#134f22', '#1d7733', '#2da44a', '#58d277', '#aef2bf'],
    red: ['#4f1c26', '#74303d', '#96505c'],
    spot: ['#aab5ae', '#e4ebe6', '#ffffff'],
  },
  ramp: '.:+',
  init(a) {
    a.st = Math.random() < 0.5 ? 'dart' : 'hang';
    a.tm = rnd(0, 1.5);
    a.v = 0.4;
    a.kink = 0;
    a.zip = 0;
  },
  update(a, dt) {
    a.tm -= dt;
    if (a.tm <= 0) {
      // hang in the air, then dart off at a new angle
      if (a.st === 'dart') {
        a.st = 'hang';
        a.tm = rnd(0.7, 2.4);
      } else {
        a.st = 'dart';
        a.tm = rnd(0.5, 1.5);
        a.kink = rnd(-0.5, 0.5);
      }
    }
    if (a.zip > 0) a.zip -= dt;
    const pivot = a.zip > 0 && Math.abs(S.angDiff(a.fleeH, a.h)) > 0.5; // startled: it spins round first, then shoots off in a straight line
    ease(
      a,
      'v',
      pivot ? 0.2 : a.st === 'dart' ? (a.zip > 0 ? 4.4 : 1.6) : 0.15,
      pivot ? 14 : a.st === 'dart' ? (a.zip > 0 ? 9 : 5) : 1.3,
      dt,
    ); // quick away, a long smooth slow-down
    a.speedMul = a.v;
    a.want += a.kink;
    a.holdMul = a.st === 'dart' ? 1 : 0.25;
  },
  hover(a, dt, w) {
    if (a.zip > 0) return;
    if (near(a, w, 5)) {
      // too close: it darts off
      a.st = 'dart';
      a.tm = rnd(1.2, 1.7);
      a.zip = a.tm;
      w.flee(a, fleeMouse(a, w) + rnd(-0.4, 0.4), a.tm, 0);
    } else if (near(a, w, 16) && a.st === 'hang') {
      // curious: it turns to face the cursor
      a.want = w.toMouse(a);
      a.holdMul = 1.6;
    }
  },
  click(w, px, py) {
    for (const a of w.animals) {
      if (Math.hypot(a.x - px, a.y - py) > 46) continue;
      a.st = 'dart';
      a.tm = rnd(1.4, 2.0);
      a.zip = a.tm;
      w.flee(a, awayFrom(a, px, py) + rnd(-0.35, 0.35), a.tm, 0); // it holds that line until the dart is spent
    }
    return true;
  },
  sample(x, y, a) {
    const ay = Math.abs(y);
    if (Math.abs(x - 6.3) < 0.55 && Math.abs(ay - 0.6) < 0.6) return { tone: 1, hue: 'spot', glyph: 'o' }; // two white eye tiles
    if (S.circle(x, y, 5.3, 0, 0.85) < 0) return { tone: 0.75 };
    if (S.ellipse(x, y, 3.1, 0, 2.2, 1.7) < 0) return { tone: 0.5 + 0.5 * S.spot(x, y, a) };
    if (x < 1.6 && x > -13.5 && ay < 0.5) {
      // long dashed tail, fading toward the tip
      const k = Math.floor(-x + 2);
      return k % 2 ? { tone: 0.2 } : { tone: 1 - 0.5 * clamp(-x / 13.5, 0, 1) };
    }
    const fl = 0.5 * Math.sin(a.phase);
    if (S.circle(x, ay, 4.6 + fl, 10.4, 0.5) < 0 || S.circle(x, ay, 0.2 - fl, 9.7, 0.5) < 0)
      return { tone: 0.5, hue: 'red' }; // one dull red tile at each wing tip
    const wing = Math.min(
      S.capsule(x, ay, 3.8, 1.0, 4.6 + fl, 10.0, 1.7),
      S.capsule(x, ay, 2.6, 1.0, 0.2 - fl, 9.2, 1.9),
    );
    if (wing < 0) {
      // four big wings of sparse characters
      const q = S.hash(Math.round(x), Math.round(y), Math.floor(a.phase * 0.12) + ((a.seed * 1e4) | 0));
      if (q < 0.16) return null;
      return { bare: true, glyph: S.pick('\\/|.:+-\\/|', q), tone: 1, hue: 'spot', alpha: 0.5 + 0.45 * q };
    }
    return null;
  },
};
