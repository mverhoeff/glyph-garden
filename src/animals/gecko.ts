import { S, clamp, rnd, smooth } from '../engine/shape';
import type { Point, PropSurface, SpeciesDef } from '../engine/types';
import { awayFrom, fleeMouse, near } from './helpers';

// A dropped tail: it lies where the gecko left it, wriggles, then fades.
interface DroppedTail {
  x: number;
  y: number;
  ux: number;
  uy: number;
  len: number;
  t0: number;
  sc: number;
  fade: number;
}

// A chain with four legs; runs in bursts, then freezes.
export const gecko: SpeciesDef = {
  id: 'gecko',
  label: 'Gecko',
  dot: '#6fe08a',
  hint: 'click to startle them · the closest drop their tails',
  count: 10,
  radius: 5.5,
  unit: 1.15,
  speed: 4.2,
  flap: 13,
  gait: 'Running',
  beatLabel: 'Stride',
  chain: { n: 11, spacing: 1.1, bend: 0.38 },
  maxTurn: 3.5,
  tweaks: { direction: 60, spread: 0.8, meander: 0.5, hold: 2.5, separation: 520 },
  palettes: {
    main: ['#0c3a1a', '#167a32', '#2bb04c', '#6fe08a'],
    spot: ['#c23a1a', '#ff6a3a'],
    toe: ['#8fd9a2', '#e2ffe9'],
  },
  ramp: '.:+',
  init(a) {
    a.run = Math.random() < 0.5;
    a.tm = rnd(0, 1.5);
    a.v = 0;
    a.kink = 0;
    a.tail = 1;
    a.frozen = 0;
    a.stare = 0;
    a.spook = 0;
  },
  update(a, dt, w) {
    if (a.tail < 1) a.tail = Math.min(1, a.tail + dt / 28); // a dropped tail takes about half a minute to grow back
    a.stare = Math.max(0, a.stare - dt);
    a.spook = Math.max(0, a.spook - dt);
    if (a.frozen > 0) {
      // startled: everyone freezes, then the near ones bolt
      a.frozen -= dt;
      a.v = 0;
      a.speedMul = 0;
      a.flapMul = 0;
      a.holdMul = 0;
      if (a.frozen <= 0 && a.flee != null) {
        w.flee(a, a.flee, 1.25, 1);
        a.flee = null;
        a.run = true;
        a.tm = 1.9;
        a.spook = 1.7;
        a.kink = 0;
      }
      return;
    }
    a.tm -= dt;
    if (a.tm <= 0) {
      // each new burst sets off at a slightly different angle
      a.run = !a.run;
      a.tm = a.run ? rnd(0.5, 1.8) : rnd(0.4, 2.2);
      if (a.run) a.kink = rnd(-0.55, 0.55);
    }
    const target = a.spook > 0 ? 2.1 : a.panic > 0.2 ? 1.7 : a.stare > 0 ? 0 : a.run ? 1.7 : 0; // a scare makes it run faster, and for longer
    a.v += (target - a.v) * Math.min(1, dt * (target ? 9 : 14)); // quick start, quicker stop
    a.want += a.kink;
    a.speedMul = a.v;
    a.flapMul = a.v / 1.7;
    a.holdMul = target ? 1.4 : 0;
  },
  hover(a, dt, w) {
    if (a.frozen > 0) return;
    if (a.fleeT > 0) return;
    if (near(a, w, 4.5)) {
      // too close: it bolts
      w.flee(a, fleeMouse(a, w) + rnd(-0.4, 0.4), 1.1, 0.85);
      a.stare = 0;
      a.spook = 1.4;
      a.kink = 0;
    } else if (near(a, w, 12)) a.stare = 0.25; // nearby: it freezes and stares
  },
  click(w, px, py) {
    for (const a of w.animals) {
      const d = Math.hypot(a.x - px, a.y - py);
      a.frozen = rnd(0.3, 0.65);
      a.flee = d < 34 ? awayFrom(a, px, py) + rnd(-0.25, 0.25) : null;
      if (d < 10 * a.sc && a.tail >= 1 && a.chain) {
        // the closest ones leave their tails behind, still wriggling
        a.tail = 0;
        // a gecko's chain always has 11 points, so both exist
        const p = a.chain[5] as Point,
          q = a.chain[a.chain.length - 1] as Point,
          len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        w.props.push({
          x: p.x,
          y: p.y,
          ux: (q.x - p.x) / len,
          uy: (q.y - p.y) / len,
          len,
          t0: w.t,
          sc: a.sc,
          fade: 0.38 + 0.62 * a.u,
          draw(this: DroppedTail, w: PropSurface) {
            const age = w.t - this.t0;
            if (age > 7) return false;
            const out = 1 - smooth((age - 5) / 2),
              wig = Math.max(0, 1 - age / 5),
              seen = new Set();
            for (let s = 0; s <= this.len; s += 0.4) {
              const off = Math.sin(age * 22 + s * 1.4) * 0.9 * wig * (0.3 + s / this.len) * this.sc;
              const cx = Math.floor(this.x + this.ux * s - this.uy * off),
                cy = Math.floor(this.y + this.uy * s + this.ux * off),
                k = cy * 4096 + cx;
              if (seen.has(k)) continue;
              seen.add(k);
              w.tileAt(cx, cy, 'main', 0.85 - (0.5 * s) / this.len, '~', this.fade * out);
            }
          },
        });
      }
    }
    return true;
  },
  sample(x, y, a) {
    if (x > 2.6 || x < -5.9 - 5.6 * a.tail) return null;
    const sway = Math.sin(a.phase * 0.5 + x * 0.7) * 0.45 * clamp(-x / 3, 0, 1);
    const yy = y - sway,
      ay = Math.abs(yy),
      sg = yy < 0 ? -1 : 1,
      step = Math.sin(a.phase * 0.5);
    if (Math.hypot(x - 1.3, ay - 1.25) < 0.42) return { dot: true, color: '#ffd76a' };
    const hw =
      x > -0.6
        ? 1.45 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 0.7) / 1.9, 2))) // head
        : x > -5.6
          ? 0.95 + 0.45 * Math.sin((Math.PI * (-0.6 - x)) / 5) // body
          : 1.0 * Math.pow(Math.max(0, 1 - (-5.6 - x) / 5.6), 0.8) + 0.15; // tail
    if (ay < hw) {
      if (a.tail < 1 && x < -5.2 - 5.6 * a.tail) return { tone: 0 }; // the stump
      if (x < -0.5 && x > -6.5 && ay < 0.6 && S.spot(x, 0, a) > 0.55) return { hue: 'spot', tone: 0.8 };
      return { tone: 1 - 0.6 * (ay / hw) };
    }
    for (const [lx, dir] of [
      [-1.3, 1],
      [-5.0, -1],
    ] as [number, number][]) {
      // legs: diagonal pairs step together
      const tx = lx + 0.5 * dir + 1.0 * sg * step * dir,
        ty = 3.5;
      if (Math.hypot(x - tx, ay - (ty + 0.5)) < 0.75) return { bare: true, glyph: '*', hue: 'toe', tone: 1 };
      if (S.capsule(x, ay, lx, 1.0, tx, ty, 0.5) < 0) return { tone: 0.5 };
    }
    return null;
  },
};
