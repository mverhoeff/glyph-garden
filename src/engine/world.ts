import { buildPalettes } from './color';
import { clamp, mix } from './shape';
import type { Animal, Food, Mouse, Palettes, Prop, Species, SpeciesState, Tweaks, WorldApi } from './types';

const TAU = Math.PI * 2;

// A fading character an animal left behind, keyed by its cell.
export interface Trail {
  cx: number;
  cy: number;
  ch: string;
  color: string;
  life: number;
  decay: number;
}

// One faint dot of the patch a moving cursor leaves, keyed by its cell.
export interface HaloDot {
  cx: number;
  cy: number;
  life: number;
}

export interface Ripple {
  x: number;
  y: number;
  r: number;
  life: number;
}

// The simulation: grid size, the population of the current species and the effects around it. It never touches
// the DOM, so it runs in Node; the renderer owns the canvases and reads this state.
export class World implements WorldApi {
  T = {} as Tweaks; // set by use(); nothing reads it before then
  sp: Species | null = null;
  animals: Animal[] = [];
  trails = new Map<number, Trail>();
  halo = new Map<number, HaloDot>();
  food: Food[] = [];
  ripples: Ripple[] = [];
  props: Prop[] = [];
  mouse: Mouse = { x: -1e4, y: -1e4, inside: false, idle: 99, v: 0, on: false };
  state: SpeciesState = {}; // scratch space for the species, reset by use()
  t = 0;
  pal: Palettes = {};

  // The view, in cells and in pixels. 0 until the first setView().
  cs = 0;
  cols = 0;
  rows = 0;
  width = 0;
  height = 0;

  // Not ported yet: the steering, emitting and scatter helpers species call through WorldApi.
  declare shy: WorldApi['shy'];
  declare skirt: WorldApi['skirt'];
  declare straighten: WorldApi['straighten'];
  declare grow: WorldApi['grow'];
  declare orbit: WorldApi['orbit'];
  declare flee: WorldApi['flee'];
  declare emit: WorldApi['emit'];
  declare lineGlyph: WorldApi['lineGlyph'];
  declare scatter: WorldApi['scatter'];

  // ---------- setup ----------
  // The prototype's resize() minus the canvas sizing, which belongs to the renderer.
  setView(widthPx: number, heightPx: number, cell: number): void {
    this.width = widthPx;
    this.height = heightPx;
    const old = this.cs;
    this.cs = cell;
    this.cols = Math.ceil(widthPx / this.cs);
    this.rows = Math.ceil(heightPx / this.cs);
    if (old && old !== this.cs) {
      const k = old / this.cs;
      for (const a of this.animals) {
        a.x *= k;
        a.y *= k;
        if (a.chain)
          for (const p of a.chain) {
            p.x *= k;
            p.y *= k;
          }
      }
      this.clearExtras();
    }
    if (this.sp) this.sync();
  }

  clearExtras(): void {
    this.trails.clear();
    this.halo.clear();
    this.food = [];
    this.ripples = [];
    this.props = [];
  }

  use(sp: Species, T: Tweaks): void {
    this.sp = sp;
    this.T = T;
    this.animals = [];
    this.state = {};
    this.clearExtras();
    this.recolor();
    this.sync();
  }

  // Palettes with the hue shift applied.
  recolor(): void {
    if (!this.sp) return;
    this.pal = buildPalettes(this.sp.palettes, this.T.hue);
  }

  // Match the number and size of animals to the current tweaks.
  sync(): void {
    const sp = this.sp,
      T = this.T;
    if (!sp) return;
    // Counts are tuned for 1440x800 at 10px cells; big screens get more, up to a cap.
    const area = clamp((this.cols * this.rows) / 11520, 0.35, 2.5);
    const want = Math.max(1, Math.round(sp.count * T.density * area));
    while (this.animals.length > want)
      this.animals.splice(Math.floor(Math.random() * this.animals.length), 1);
    while (this.animals.length < want) this.animals.push(this.spawn(sp));
    for (const a of this.animals) {
      // 0 = farthest, 1 = nearest (gain: what it has grown by eating)
      a.u = Math.pow(Math.min(1, a.r + a.gain), T.farBias);
      const sc = mix(T.farDepth, 1, a.u) * T.size * (sp.unit || 1);
      if (a.chain && Math.abs(sc - a.sc) > 1e-6) this.layChain(a, sc);
      a.sc = sc;
    }
    this.animals.sort((a, b) => a.u - b.u); // far ones are drawn first
  }

  // The random draws happen in the prototype's order: r, seed, x, y, three for off, mf, phase, then init().
  spawn(sp: Species): Animal {
    const a: Animal = {
      sp,
      r: Math.random(),
      u: 1,
      sc: 0,
      seed: Math.random(),
      x: Math.random() * this.cols,
      y: Math.random() * this.rows,
      off: (Math.random() + Math.random() + Math.random() - 1.5) * 1.3, // personal offset from the course
      mf: 0.5 + Math.random() * 0.7,
      phase: Math.random() * TAU,
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
      bank: 0,
      fleeT: 0,
      fleeH: 0,
      md: 1e9,
      mrank: 99,
      h: 0,
      want: 0,
    };
    a.h = this.course() + a.off * this.T.spread * 1.4;
    if (sp.chain) a.chain = Array.from({ length: sp.chain.n }, () => ({ x: a.x, y: a.y }));
    if (sp.init) sp.init(a, this);
    return a;
  }

  // Lays a chain out straight behind the head at scale sc.
  private layChain(a: Animal, sc: number): void {
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

  // The shared travel direction, in canvas radians.
  course(): number {
    const T = this.T;
    const deg = T.corner ? (Math.atan2(this.height, this.width) * 180) / Math.PI : T.direction;
    return (-deg * Math.PI) / 180 + T.sway * 0.8 * Math.sin(this.t * 0.3);
  }

  toMouse(a: Animal): number {
    return Math.atan2(this.mouse.y - a.y, this.mouse.x - a.x);
  }
}
