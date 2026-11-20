// What a click does: a ripple, then food for species that eat, a species' own reaction, or the default scatter.
import type { Species, WorldApi } from './types';

const TAU = Math.PI * 2;

// The part of the world a click changes, beyond what species see.
export interface ClickWorld extends WorldApi {
  sp: Species | null;
  ripples: { x: number; y: number; r: number; life: number }[];
}

export function click(w: ClickWorld, px: number, py: number): void {
  w.ripples.push({ x: px, y: py, r: 0.5, life: 1 });
  const sp = w.sp;
  if (!sp) return;
  if (sp.eats) {
    // pellets land together, then spread out and settle
    for (let i = 0; i < 15; i++) {
      const ang = Math.random() * TAU,
        v = 3 + Math.random() * 12;
      w.food.push({
        x: px + Math.cos(ang) * 0.8,
        y: py + Math.sin(ang) * 0.8,
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v * 0.8,
        age: 0,
      });
    }
    return;
  }
  if (sp.click && sp.click(w, px, py) === true) return; // a species can replace the scatter
  w.scatter(px, py);
}

// Push every animal within R away from (px, py), harder the closer it is, and set it fleeing.
export function scatter(w: WorldApi, px: number, py: number, R = 42, kick = 1): void {
  for (const a of w.animals) {
    const dx = a.x - px,
      dy = a.y - py,
      d = Math.hypot(dx, dy) || 1;
    if (d > R) continue;
    const f = 1 - d / R;
    a.ix += (dx / d) * f * 30 * kick;
    a.iy += (dy / d) * f * 30 * kick;
    w.flee(a, Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.5, 0.9, 0.6 + 0.9 * f);
  }
}
