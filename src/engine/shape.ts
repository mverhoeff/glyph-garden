// Maths helpers every animal shape is built from. Distance functions return signed distances in cells:
// negative inside, zero on the edge, positive outside.

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smooth(t: number): number {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
}

export function angDiff(a: number, b: number): number {
  const d = a - b;
  return Math.atan2(Math.sin(d), Math.cos(d));
}

export function circle(x: number, y: number, cx: number, cy: number, r: number): number {
  return Math.hypot(x - cx, y - cy) - r;
}

export function ellipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number {
  const dx = (x - cx) / rx,
    dy = (y - cy) / ry;
  return (Math.hypot(dx, dy) - 1) * Math.min(rx, ry);
}

export function capsule(
  x: number,
  y: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  r: number,
): number {
  const pax = x - ax,
    pay = y - ay,
    bax = bx - ax,
    bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}

// Exact triangle distance (after Inigo Quilez).
export function tri(
  px: number,
  py: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const e0x = x1 - x0,
    e0y = y1 - y0,
    e1x = x2 - x1,
    e1y = y2 - y1,
    e2x = x0 - x2,
    e2y = y0 - y2;
  const v0x = px - x0,
    v0y = py - y0,
    v1x = px - x1,
    v1y = py - y1,
    v2x = px - x2,
    v2y = py - y2;
  const h0 = clamp((v0x * e0x + v0y * e0y) / (e0x * e0x + e0y * e0y), 0, 1);
  const h1 = clamp((v1x * e1x + v1y * e1y) / (e1x * e1x + e1y * e1y), 0, 1);
  const h2 = clamp((v2x * e2x + v2y * e2y) / (e2x * e2x + e2y * e2y), 0, 1);
  const q0x = v0x - e0x * h0,
    q0y = v0y - e0y * h0;
  const q1x = v1x - e1x * h1,
    q1y = v1y - e1y * h1;
  const q2x = v2x - e2x * h2,
    q2y = v2y - e2y * h2;
  const s = Math.sign(e0x * e2y - e0y * e2x);
  const d = Math.min(q0x * q0x + q0y * q0y, q1x * q1x + q1y * q1y, q2x * q2x + q2y * q2y);
  const w = Math.min(s * (v0x * e0y - v0y * e0x), s * (v1x * e1y - v1y * e1x), s * (v2x * e2y - v2y * e2x));
  return -Math.sqrt(d) * Math.sign(w);
}

// Polynomial smooth minimum: blends two distances so joined shapes get a soft fillet of width k.
export function smin(a: number, b: number, k = 0.5): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

// Integer hash in [0, 1). Relies on 32-bit overflow, so Math.imul and the unsigned shifts must stay exactly
// as they are: patterns and golden fixtures depend on these bits.
export function hash(a: number, b = 0, c = 0): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Stable random per local cell of one individual (spots, patterns). k sets how many cells per body unit.
export function spot(x: number, y: number, a: { seed: number }, k = 1): number {
  return hash(Math.round(x * k), Math.round(y * k), (a.seed * 1e4) | 0);
}

// Smooth 1D value noise in [-1, 1].
export function noise(t: number): number {
  const i = Math.floor(t),
    f = t - i,
    u = f * f * (3 - 2 * f);
  return mix(hash(i, 7), hash(i + 1, 7), u) * 2 - 1;
}

// charAt instead of indexing so the result is typed as a string; the two agree for every non-empty string,
// and every caller passes a non-empty glyph set.
export function pick(str: string, r: number): string {
  return str.charAt(Math.floor(r * str.length) % str.length);
}

export function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

// Grouped so ported animal code can keep calling S.circle(...) and friends unchanged.
export const S = {
  clamp,
  mix,
  smooth,
  angDiff,
  circle,
  ellipse,
  capsule,
  tri,
  smin,
  hash,
  spot,
  noise,
  pick,
  rnd,
};
