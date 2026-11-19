// The golden-fixture protocol, shared by the generator (scripts/make-golden.mjs, run against the prototype) and
// the parity tests (run against the rebuild). It must not depend on either engine, and it must use only syntax
// Node can strip, because the generator imports this file directly.
//
// Every run (one species' trajectory, or one pose of one species' samples) uses a freshly constructed world.
// World time and species scratch state survive use(), and course() and some animals read them, so reusing a
// world would make each species' fixtures depend on the species before it.

export interface Pose {
  seed: number;
  phase: number;
}

export interface SampleResult {
  dot?: boolean;
  bare?: boolean;
  hue?: string;
  tone?: number;
  glyph?: string;
  ang?: number;
  alpha?: number;
  color?: string;
}

// Seeded RNG: assign to Math.random for the duration of a run, restore afterwards.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BASE_TWEAKS = {
  density: 1,
  corner: false,
  direction: 45,
  speed: 1,
  sway: 0,
  spread: 0.1,
  size: 1,
  farDepth: 0.33,
  farBias: 1.3,
  hold: 2,
  separation: 400,
  meander: 0.4,
  beat: 1,
  cursor: true,
  cursorReach: 1,
  cursorStrength: 1,
  hue: 0,
  shimmer: 0.35,
  glyphs: 0.6,
};

// 1440 x 810 at 10px cells.
export const VIEW = { cols: 144, rows: 81, cell: 10 };

export const POSES: readonly Pose[] = [
  { seed: 0.11, phase: 0.4 },
  { seed: 0.52, phase: 2.1 },
  { seed: 0.93, phase: 4.4 },
];

// Pose 1 additionally sets these fields, but only those the animal already has after init().
export const POSE_1_OVERRIDES: Readonly<Record<string, number>> = {
  leap: 0.6,
  open: 0.3,
  flare: 1,
  show: 0.5,
  threat: 0.5,
  guard: 0.7,
  tail: 0.4,
  near: 0.8,
  wk: 0.2,
  ws: 0.7,
};

// Build order per pose (exactly this order):
//   world.use(sp, tweaks);              sets world.T and world.sp; its random draws do not matter here
//   Math.random = mulberry32(777);      seeded after use(), so init() sees the same numbers in both engines
//   a = baseAnimal(sp, pose); sp.init?.(a, world);
//   if (poseIndex === 1) for (k in POSE_1_OVERRIDES) if (k in a) a[k] = POSE_1_OVERRIDES[k];
export const SAMPLE_SEED = 777;

export function baseAnimal<Sp extends { face: number }>(sp: Sp, pose: Pose) {
  return {
    sp,
    seed: pose.seed,
    phase: pose.phase,
    sc: 1,
    u: 1,
    r: 1,
    x: 50,
    y: 40,
    h: 0,
    off: 0,
    mf: 1,
    ix: 0,
    iy: 0,
    face: sp.face,
    gain: 0,
    gainGoal: 0,
    panic: 0,
    speedMul: 1,
    flapMul: 1,
    holdMul: 1,
    av: 0,
    bank: 0.3,
    fleeT: 0,
    fleeH: 0,
    md: 1e9,
    mrank: 99,
  };
}

// Sample grid in local cells: x is the outer loop, y the inner loop, both inclusive.
export const GRID = { x0: -32, x1: 12, y0: -14, y1: 14, step: 0.5 };

// Trajectory run: seed, use(), then STEPS steps of DT; the click lands immediately before step CLICK_BEFORE_STEP
// (1-based), and [x, y, h] of every animal is recorded after each step listed in RECORD_STEPS.
export const TRAJECTORY_SEED = 12345;
export const DT = 1 / 60;
export const STEPS = 240;
export const CLICK = { x: 60, y: 40 };
export const CLICK_BEFORE_STEP = 100;
export const RECORD_STEPS = [60, 120, 180, 240];

// Species that eat get the Feeding group's default on top of the base tweaks, before their own tweaks.
export const FOOD_RANGE_DEFAULT = 200;

const n = (v: unknown): string => (v == null ? '' : Number(v).toFixed(4));

export const serialise = (r: SampleResult | null | undefined): string =>
  !r
    ? ''
    : [
        r.dot ? 'D' : r.bare ? 'B' : 'T',
        r.hue ?? '',
        n(r.tone),
        r.glyph ?? '',
        n(r.ang),
        n(r.alpha),
        r.color ?? '',
      ].join('|');

export const fixed = (v: number): string => v.toFixed(4);
