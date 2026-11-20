import { S, clamp, rnd } from '../engine/shape';
import type { SpeciesDef } from '../engine/types';
import { awayFrom, near } from './helpers';

// Walks sideways, pauses, sidesteps back.
export const crab: SpeciesDef = {
  id: 'crab',
  label: 'Crab',
  dot: '#f0685c',
  hint: 'click to startle them · they square up to the cursor',
  count: 15,
  radius: 9.5,
  speed: 3,
  flap: 7,
  face: -Math.PI / 2,
  gait: 'Scuttling',
  beatLabel: 'Leg speed',
  tweaks: { direction: 20, spread: 0.6, meander: 0.5, hold: 2, separation: 620 },
  palettes: { main: ['#47120e', '#86281f', '#bd4438', '#df6557', '#f39186', '#ffd0c8'] },
  ramp: '.:+',
  // half lead with the left side
  init(a) {
    a.st = 'walk';
    a.tm = rnd(1, 3);
    a.v = 1;
    a.threat = 0;
    a.guard = 0;
    if (Math.random() < 0.5) a.face = -a.face;
  },
  update(a, dt, w) {
    let target: number;
    if (a.threat > 0) {
      // startled: freeze with claws up, then run
      a.threat -= dt;
      target = 0;
      if (a.threat <= 0 && a.flee != null) {
        w.flee(a, a.flee, 2, 1);
        a.flee = null;
        a.st = 'walk';
        a.tm = 2.8;
        a.guard = 0;
      }
    } else if (a.fleeT > 0 || a.panic > 0.3)
      target = 2.4; // running from a click
    else if (a.guard > 0.3)
      target = a.md < 4.5 ? 1.7 : 0; // facing the cursor: hold still, sidle off if it comes closer
    else {
      a.tm -= dt;
      if (a.tm <= 0) {
        if (a.st === 'walk') {
          a.st = Math.random() < 0.25 ? 'back' : 'pause';
          a.tm = a.st === 'back' ? rnd(0.5, 1.3) : rnd(0.4, 1.8);
        } else {
          a.st = 'walk';
          a.tm = rnd(1.2, 3.8);
        }
      }
      target = a.st === 'walk' ? 1.25 : a.st === 'back' ? -0.7 : 0;
    }
    a.guard = Math.max(0, a.guard - dt * 2);
    // it can walk toward either side: when its way lies behind the side it leads with, it leads with the other one instead of turning round
    const go = a.fleeT > 0 ? a.fleeH : a.want;
    if (a.guard <= 0.3 && Math.abs(S.angDiff(go, a.h)) > Math.PI / 2 + 0.3) {
      a.h += Math.PI;
      a.face = -a.face;
      a.v = -a.v;
    }
    a.v += (target - a.v) * Math.min(1, dt * 6);
    a.speedMul = a.v;
    a.flapMul = Math.abs(a.v) + 0.05;
    a.holdMul = a.st === 'pause' ? 0.3 : 1;
  },
  hover(a, dt, w) {
    // turns its front to the cursor and raises its claws
    if (a.threat > 0 || a.fleeT > 0 || a.panic > 0.3 || !near(a, w, 12)) return;
    a.guard = Math.min(1, a.guard + dt * 5);
    a.want = w.toMouse(a) - a.face;
    a.holdMul = 2.5;
  },
  click(w, px, py) {
    // all nearby freeze with claws up; the close ones then scuttle off sideways, away from the spot
    for (const a of w.animals) {
      const d = Math.hypot(a.x - px, a.y - py);
      if (d > 55) continue;
      a.threat = d < 34 ? rnd(0.25, 0.5) : rnd(0.7, 1.3);
      a.flee = null;
      if (d < 34) {
        // whichever side points away from the click, with only a slight turn
        const away = awayFrom(a, px, py),
          side = Math.cos(away - a.h) >= 0 ? a.h : a.h + Math.PI;
        a.flee = side + clamp(S.angDiff(away, side), -0.6, 0.6) + rnd(-0.15, 0.15);
      }
    }
    return true;
  },
  sample(x, y, a) {
    const ay = Math.abs(y),
      sg = y < 0 ? -1 : 1,
      up = Math.max(clamp(a.threat * 4, 0, 1), a.guard);
    if (Math.hypot(x - 3.1, ay - 1.0) < 0.45) return { dot: true };
    const shell = S.ellipse(x, y, 0, 0, 2.8, 3.6);
    if (shell < 0) {
      if (shell > -0.7) return { tone: 0.25 };
      if (S.spot(x, y, a) > 0.9) return { tone: 1 };
      return { tone: 0.5 + 0.3 * clamp(-shell / 2.5, 0, 1) };
    }
    // claws held out to the front corners; they lift and open when it is alarmed
    const raise = 0.4 * Math.sin(a.phase * 0.35 + sg * 1.3),
      cx = 4.3 + 1.3 * up + raise,
      cy = 4.6 + 0.7 * up;
    const claw = Math.max(
      S.circle(x, ay, cx, cy, 1.3 + 0.25 * up),
      -S.capsule(x, ay, cx + 0.5, cy + 0.2, cx + 1.8, cy + 0.9, 0.36 + 0.25 * up),
    );
    const arm = S.capsule(x, ay, 1.6, 2.4, cx - 0.8, cy - 0.8, 0.65);
    if (Math.min(claw, arm) < 0) return { tone: claw < 0 ? 0.7 + 0.3 * up : 0.4 };
    for (let k = 0; k < 3; k++) {
      // legs are loose characters trailing off the back corners
      const bx = -0.6 - k * 0.8,
        by = 3.1 - k * 0.3,
        tx = -2.4 - k * 1.2 + 0.5 * Math.sin(a.phase + k * 2.1 + sg),
        ty = 5.6 - k * 0.5;
      if (S.capsule(x, ay, bx, by, tx, ty, 0.36) < 0)
        return { bare: true, ang: Math.atan2(ty - by, tx - bx) * sg, tone: 0.55, alpha: 0.85 };
    }
    return null;
  },
  trail(a, dt, w) {
    if (Math.abs(a.v) > 0.6 && Math.random() < dt * 5)
      w.emit(
        a,
        (Math.random() - 0.5) * 4,
        (-6 * Math.sign(a.v) - Math.random() * 3) * (a.face < 0 ? 1 : -1),
        '/',
        0.3,
        0.6,
        1.4,
      );
  },
};
