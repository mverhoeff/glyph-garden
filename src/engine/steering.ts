// How animals choose a heading. Species never set a.h; these helpers adjust a.want, holdMul and the flee state,
// and the simulation step eases the heading toward them.
import { angDiff, clamp, smooth } from './shape';
import type { Animal, Mouse, Tweaks } from './types';

// The part of the world the cursor helpers read.
export interface CursorView {
  T: Tweaks;
  mouse: Mouse;
}

// The heading one rate-limited step from h toward target. The prototype has this as World.steer, which nothing
// calls; it returns the new heading so that only the simulation step writes a.h.
export function steer(h: number, target: number, rate: number, dt: number): number {
  return h + clamp(angDiff(target, h), -rate * dt, rate * dt);
}

// Default cursor reaction: lean away from it, more the closer it is.
export function shy(w: CursorView, a: Animal, _dt: number, reach = 1, strength = 1): void {
  const R = (6 + a.sp.radius * a.sc * 0.8) * reach * w.T.cursorReach;
  if (a.md >= R) return;
  const f = Math.min(1, smooth(1 - a.md / R) * strength * w.T.cursorStrength);
  a.want += angDiff(Math.atan2(a.y - w.mouse.y, a.x - w.mouse.x), a.want) * f;
  a.holdMul = Math.max(a.holdMul, 1 + 2 * f);
}

// Cursor reaction for animals in flight or gliding: curve round the cursor from well ahead, but only if there is
// still room to do it. A cursor that is behind, already on top of the animal, or too close to fly round is ignored.
export function skirt(w: CursorView, a: Animal, _dt: number, reach = 1, strength = 1): void {
  const m = w.mouse,
    T = w.T,
    k = strength * T.cursorStrength;
  if (k <= 0) return;
  const c = Math.cos(a.h),
    s = Math.sin(a.h),
    dx = m.x - a.x,
    dy = m.y - a.y;
  const fwd = dx * c + dy * s,
    lat = dy * c - dx * s; // cursor ahead of the animal (+) and to its right (+)
  const body = a.sp.radius * a.sc,
    look = (14 + 3.2 * body) * reach * T.cursorReach;
  const clear = (0.75 * body + 3) * Math.min(1.5, k); // how far to the side it wants to pass
  const need = clear - Math.abs(lat);
  if (fwd <= 0 || fwd > look || need <= 0 || a.md < 0.9 * body) {
    a.dodge = 0;
    return;
  }
  const R = (a.sp.turnRadius || a.sp.radius) * a.sc; // the curve it can fly
  if (!a.dodge && (fwd * fwd) / (2 * R) < need) return; // no room left to get clear: carry straight on
  if (!a.dodge) a.dodge = Math.abs(lat) > 0.5 ? -Math.sign(lat) : a.seed < 0.5 ? -1 : 1; // pick a side once and keep it
  const ang = Math.min(0.75, 1.6 * Math.atan2(need, fwd)) * smooth(1.15 - fwd / look) * Math.min(1, k);
  a.want = a.h + clamp(angDiff(a.want, a.h), -0.3, 0.3) + a.dodge * ang;
  a.holdMul = Math.max(a.holdMul, 1.5);
}

// An animal that has eaten grows a little: it moves up toward full size, slowly.
export function grow(a: Animal, amount: number): void {
  a.gainGoal = Math.min(1 - a.r, a.gainGoal + amount);
}

// Heading for circling the cursor at about radius R (followers spread round it instead of piling onto it).
export function orbit(m: Mouse, a: Animal, R: number, dir = 1): number {
  const b = Math.atan2(a.y - m.y, a.x - m.x) + dir * clamp(R / Math.max(a.md, 1), 0.25, 0.9);
  return Math.atan2(m.y + Math.sin(b) * R - a.y, m.x + Math.cos(b) * R - a.x);
}

// Turn (smoothly) onto a heading and hold it for a moment.
export function flee(a: Animal, ang: number, time = 0.9, panic = 0.8): void {
  a.fleeH = ang;
  a.fleeT = time;
  a.panic = Math.max(a.panic, panic);
}
