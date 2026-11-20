// Small helpers the animal files share, ported from the top of the prototype's animals file.
import type { Animal, WorldApi } from '../engine/types';

// Ease a numeric field of the animal toward a target and return the new value.
export const ease = (a: Animal, k: string, target: number, rate: number, dt: number): number => {
  a[k] += (target - a[k]) * Math.min(1, dt * rate);
  return a[k];
};

export const awayFrom = (a: Animal, x: number, y: number): number => Math.atan2(a.y - y, a.x - x);

export const fleeMouse = (a: Animal, w: WorldApi): number => awayFrom(a, w.mouse.x, w.mouse.y);

// Within reach of the cursor (Tweaks: Reach).
export const near = (a: Animal, w: WorldApi, d: number): boolean => a.md < d * w.T.cursorReach;

// How many answer the cursor (Tweaks: Strength).
export const some = (w: WorldApi, n: number): number => Math.round(n * w.T.cursorStrength);
