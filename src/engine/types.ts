// The data model shared by the engine and the animals.

export interface Tweaks {
  density: number;
  corner: boolean;
  direction: number;
  speed: number;
  sway: number;
  spread: number;
  size: number;
  farDepth: number;
  farBias: number;
  hold: number;
  separation: number;
  meander: number;
  beat: number;
  cursor: boolean;
  cursorReach: number;
  cursorStrength: number;
  hue: number;
  shimmer: number;
  glyphs: number;
  // Only species that eat have the Feeding group.
  foodRange?: number;
}

export interface PaletteEntry {
  css: string;
  light: boolean;
}

// Palettes as species declare them (hex colours, darkest first) and as the engine uses them (hue-shifted CSS).
export type PaletteSpec = Record<string, string[]>;
export type Palettes = Record<string, PaletteEntry[]>;

// What a species' sample() says is in one cell. Each variant spells out the others' fields as undefined so the
// renderer can read any field without narrowing first, as the prototype does.
export interface TileResult {
  dot?: undefined;
  bare?: undefined;
  tone?: number;
  hue?: string;
  glyph?: string;
  ang?: number;
  alpha?: undefined;
  color?: undefined;
}

export interface BareResult {
  dot?: undefined;
  bare: true;
  tone?: number;
  hue?: string;
  glyph?: string;
  ang?: number;
  alpha?: number;
  color?: undefined;
}

export interface DotResult {
  dot: true;
  bare?: undefined;
  tone?: undefined;
  hue?: undefined;
  glyph?: undefined;
  ang?: undefined;
  alpha?: undefined;
  color?: string;
}

export type SampleResult = TileResult | BareResult | DotResult;

export interface ChainSpec {
  n: number;
  spacing: number;
  // Largest angle (radians) one joint may bend; the engine defaults it to 0.45.
  bend?: number;
}

export interface Point {
  x: number;
  y: number;
}

// The fields the engine creates in spawn() and the ones it reads or writes while simulating and drawing.
export interface AnimalCore {
  sp: Species;
  r: number; // depth draw: 0 = farthest, 1 = nearest
  u: number; // depth after farBias and growth
  sc: number; // scale in cells per body unit
  seed: number;
  x: number;
  y: number;
  h: number; // heading in canvas radians (y down)
  off: number; // personal offset from the shared course
  mf: number; // meander frequency
  phase: number; // body animation phase
  ix: number; // impulse from scatter, decays
  iy: number;
  face: number; // which way the body faces relative to the heading (crabs flip theirs)
  gain: number; // growth from eating so far
  gainGoal: number; // growth it is easing toward
  panic: number;
  speedMul: number;
  flapMul: number;
  holdMul: number;
  av: number; // eased turn rate
  bank: number; // roll that follows the turn
  fleeT: number; // time left holding a flee heading
  fleeH: number; // the flee heading
  md: number; // distance to the cursor
  mrank: number; // rank by distance to the cursor
  chain?: Point[];
  // Set by the engine at the start of every update, before any species hook reads it.
  want: number;
  dodge?: number; // the side skirt() picked for this pass
  bold?: boolean; // ignores the cursor
  wrapped?: boolean; // wrapped round an edge this step
  zoom?: number; // rigid animals only: extra scale for diving or climbing
  fade?: number; // overall opacity
}

// Species keep their own per-animal state on the animal, under names only they know. Typing every species' fields
// centrally would couple the engine to each animal, and unknown would force casts into the verbatim sample() bodies.
export interface Animal extends AnimalCore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- per-species animal state, see above
  [extra: string]: any;
}

export interface Mouse {
  x: number;
  y: number;
  inside: boolean;
  idle: number; // seconds since it last moved
  v: number; // smoothed speed
  on: boolean; // inside, recently moved, and the cursor tweak is on
}

export interface Food {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  eaten?: boolean;
}

// Scratch space species share through the world; reset by use().
export interface SpeciesState {
  shooed?: number; // bees: ignore the cursor until this world time
  swirl?: { x: number; y: number; until: number; dir: number }; // swifts: the spot they circle after a click
}

// What a prop can draw with: the world plus single-cell drawing.
export interface PropSurface extends WorldApi {
  tileAt(cx: number, cy: number, hue: string, tone: number, glyph?: string, alpha?: number): void;
  glyphAt(cx: number, cy: number, css: string, glyph: string, alpha?: number): void;
}

// A short-lived effect a species leaves behind; returning false from draw() removes it. Props carry their own
// fields and read them through `this`, so a prop literal annotates draw's `this` with its own shape. The compiler
// does not check that annotation against the literal; keep the two side by side.
export interface Prop {
  draw(w: PropSurface): boolean | undefined;
  [extra: string]: unknown;
}

// The part of the world species may use. The engine's World implements it.
export interface WorldApi {
  T: Tweaks;
  t: number;
  cs: number;
  cols: number;
  rows: number;
  animals: Animal[];
  food: Food[];
  props: Prop[];
  mouse: Mouse;
  state: SpeciesState;
  toMouse(a: Animal): number;
  shy(a: Animal, dt: number, reach?: number, strength?: number): void;
  skirt(a: Animal, dt: number, reach?: number, strength?: number): void;
  straighten(a: Animal, rate: number, dt: number): void;
  grow(a: Animal, amount: number): void;
  orbit(a: Animal, R: number, dir?: number): number;
  flee(a: Animal, ang: number, time?: number, panic?: number): void;
  emit(
    a: Animal,
    lx: number,
    ly: number,
    ch: string,
    tone?: number,
    life?: number,
    decay?: number,
    hue?: string,
  ): void;
  lineGlyph(a: Animal, localAng?: number): string;
  scatter(px: number, py: number, R?: number, kick?: number): void;
}

export interface SpeciesHooks {
  init?(a: Animal, w: WorldApi): void;
  update?(a: Animal, dt: number, w: WorldApi): void;
  hover?(a: Animal, dt: number, w: WorldApi): void;
  // Return true to replace the default scatter.
  click?(w: WorldApi, px: number, py: number): boolean | undefined;
  trail?(a: Animal, dt: number, w: WorldApi): void;
  sample(x: number, y: number, a: Animal, w: WorldApi): SampleResult | null | undefined;
}

// A species as an animal file declares it; registerSpecies() fills in the defaults.
export interface SpeciesDef extends SpeciesHooks {
  id: string;
  label: string;
  dot?: string; // picker colour
  hint?: string;
  count?: number; // how many at density 1 on a 1440 x 800 screen
  radius?: number; // sampling radius in body units
  unit?: number; // body units per cell at full size
  speed?: number;
  flap?: number;
  face?: number;
  ramp?: string; // glyphs drawn on tiles that set none
  gait?: string; // Tweaks group label
  beatLabel?: string;
  maxTurn?: number;
  agility?: number;
  bankGain?: number;
  turnGain?: number;
  fleeTurn?: number;
  turnRadius?: number;
  eats?: boolean;
  chain?: ChainSpec;
  palettes?: PaletteSpec;
  tweaks?: Partial<Tweaks>;
}

type Defaulted =
  | 'dot'
  | 'count'
  | 'radius'
  | 'speed'
  | 'flap'
  | 'face'
  | 'ramp'
  | 'gait'
  | 'beatLabel'
  | 'palettes'
  | 'tweaks';

export type Species = SpeciesDef & Required<Pick<SpeciesDef, Defaulted>>;
