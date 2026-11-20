// Follow-the-leader bodies (koi, betta, gecko, jellyfish): a chain of points where the head leads and each point
// trails the one before it, and the mapping from a grid cell to coordinates along the bent spine.
import { angDiff } from './shape';
import type { Animal, Point } from './types';

// Lay the chain out straight behind the head at scale sc.
export function layChain(a: Animal, sc: number): void {
  const chain = a.chain,
    spec = a.sp.chain;
  if (!chain || !spec) return;
  const sp = spec.spacing * sc,
    c = Math.cos(a.h),
    s = Math.sin(a.h);
  chain.forEach((p, i) => {
    p.x = a.x - c * sp * i;
    p.y = a.y - s * sp * i;
  });
}

// The head leads, the body follows; no joint may bend past a limit, so the body never folds.
export function follow(a: Animal): void {
  const c = a.chain,
    spec = a.sp.chain;
  const head = c?.[0];
  if (!c || !spec || !head) return;
  const sp = spec.spacing * a.sc,
    maxBend = spec.bend || 0.45;
  head.x = a.x;
  head.y = a.y;
  let last = head;
  let prev = a.h + Math.PI; // direction from the head back toward the tail
  for (let i = 1; i < c.length; i++) {
    const p = c[i];
    if (!p) break;
    let ang = Math.atan2(p.y - last.y, p.x - last.x);
    const d = angDiff(ang, prev);
    if (Math.abs(d) > maxBend) ang = prev + Math.sign(d) * maxBend;
    p.x = last.x + Math.cos(ang) * sp;
    p.y = last.y + Math.sin(ang) * sp;
    prev = ang;
    last = p;
  }
}

// Ease a chain body out straight behind the head (a fish holding still to display).
export function straighten(a: Animal, rate: number, dt: number): void {
  const c = a.chain,
    spec = a.sp.chain;
  if (!c || !spec) return;
  const sp = spec.spacing * a.sc,
    k = Math.min(1, rate * dt),
    cx = Math.cos(a.h),
    sy = Math.sin(a.h);
  for (let i = 1; i < c.length; i++) {
    const p = c[i];
    if (!p) break;
    p.x += (a.x - cx * sp * i - p.x) * k;
    p.y += (a.y - sy * sp * i - p.y) * k;
  }
}

export interface SpinePoint {
  lx: number; // along the spine: 0 at the head, negative toward the tail, in body units
  ly: number; // signed side offset, + to the animal's right, in body units
  base: number; // the spine's forward direction there, in canvas radians
}

// Where the world point (wx, wy) sits relative to the chain: the nearest point on the spine gives the distance
// along it and the signed side offset. The first segment runs on past the head and the last past the tail, so
// cells ahead of the head get a positive lx. spacing is in cells (chain spacing x scale); inv is 1 / scale.
// The prototype leaves lx, ly undefined and base at the rigid rotation when no segment is nearer than 1e9, which
// only a chain collapsed onto one point can cause; here that case returns NaN, which reads the same in arithmetic.
export function spineCoords(
  chain: readonly Point[],
  spacing: number,
  inv: number,
  wx: number,
  wy: number,
): SpinePoint {
  let best = 1e9,
    lx = NaN,
    ly = NaN,
    base = NaN;
  for (let i = 0; i < chain.length - 1; i++) {
    const pa = chain[i],
      pb = chain[i + 1];
    if (!pa || !pb) break;
    const ax = pa.x,
      ay = pa.y,
      bx = pb.x - ax,
      by = pb.y - ay;
    let h = ((wx - ax) * bx + (wy - ay) * by) / (bx * bx + by * by);
    if (i > 0 && h < 0) h = 0;
    if (i < chain.length - 2 && h > 1) h = 1;
    const qx = wx - ax - bx * h,
      qy = wy - ay - by * h,
      d = qx * qx + qy * qy;
    if (d < best) {
      best = d;
      const L = Math.hypot(bx, by) || 1e-6,
        fx = -bx / L,
        fy = -by / L; // forward
      lx = -(i + h) * spacing * inv;
      ly = (-qx * fy + qy * fx) * inv;
      base = Math.atan2(fy, fx);
    }
  }
  return { lx, ly, base };
}
