import { afterEach, describe, expect, it } from 'vitest';
import { angDiff } from '../../src/engine/shape';
import { steer } from '../../src/engine/steering';
import type { Animal, Species, Tweaks } from '../../src/engine/types';
import { World } from '../../src/engine/world';
import { BASE_TWEAKS, mulberry32 } from '../golden/protocol';

// Stand-in species with the engine defaults. Registering them would leak into the picker order.
function species(extra: Partial<Species> = {}): Species {
  return {
    id: 'test',
    label: 'Test',
    dot: '#888',
    count: 12,
    radius: 8,
    speed: 4,
    flap: 5,
    face: 0,
    ramp: '.:=-+',
    gait: 'Flight',
    beatLabel: 'Wing beat',
    palettes: { main: ['#336699', '#99ccff'] },
    tweaks: {},
    sample: () => null,
    ...extra,
  };
}

// The prototype's crane options that matter for flight.
const crane = (): Species =>
  species({ radius: 13, unit: 1.15, speed: 5.5, maxTurn: 1.3, agility: 3, bankGain: 2.2, turnRadius: 16 });

const realRandom = Math.random;
afterEach(() => {
  Math.random = realRandom;
});

// A world with exactly one animal, nearest depth (u = 1), at (x, y) heading h.
function one(sp: Species, extra: Partial<Tweaks> = {}, x = 72, y = 40, h = 0): { w: World; a: Animal } {
  Math.random = mulberry32(1);
  const w = new World();
  w.setView(1440, 810, 10);
  w.use(sp, { ...BASE_TWEAKS, density: 0.01, ...extra });
  const a = w.animals[0];
  if (!a || w.animals.length !== 1) throw new Error('expected one animal');
  a.r = 1;
  w.sync();
  Object.assign(a, { x, y, h, want: h });
  return { w, a };
}

describe('steer', () => {
  it('moves the heading toward the target by at most rate x dt', () => {
    expect(steer(0, 1, 2, 0.1)).toBeCloseTo(0.2, 12);
    expect(steer(0, 0.05, 2, 0.1)).toBeCloseTo(0.05, 12);
    // The short way, across ±π; headings are not wrapped, so it lands on -3 + 2π.
    expect(steer(3, -3, 100, 1)).toBeCloseTo(-3 + 2 * Math.PI, 12);
  });
});

describe('flee', () => {
  it('sets the flee heading and time and only raises panic', () => {
    const { w, a } = one(species());
    w.flee(a, 1.2);
    expect([a.fleeH, a.fleeT, a.panic]).toEqual([1.2, 0.9, 0.8]);
    w.flee(a, -1, 0.5, 0.3);
    expect([a.fleeH, a.fleeT, a.panic]).toEqual([-1, 0.5, 0.8]);
  });
});

describe('grow', () => {
  it('never lets r + gain goal pass 1', () => {
    const { w, a } = one(species());
    a.r = 0.9;
    for (let i = 0; i < 20; i++) w.grow(a, 0.02);
    expect(a.gainGoal).toBeCloseTo(0.1, 12);
    expect(a.gain).toBe(0); // the goal moves at once; the size follows in the step
  });
});

describe('shy', () => {
  it('leans away from a nearby cursor and holds harder', () => {
    const { w, a } = one(species());
    w.mouse.x = a.x;
    w.mouse.y = a.y + 3; // to its right
    a.md = 3;
    w.shy(a, 1 / 60);
    expect(a.want).toBeLessThan(0);
    expect(a.holdMul).toBeGreaterThan(1);
  });

  it('ignores a cursor outside its reach', () => {
    const { w, a } = one(species());
    a.md = 100;
    w.shy(a, 1 / 60);
    expect([a.want, a.holdMul]).toEqual([0, 1]);
  });
});

describe('skirt', () => {
  function cursorAt(w: World, a: Animal, fwd: number, lat = 0): void {
    w.mouse.x = a.x + fwd;
    w.mouse.y = a.y + lat;
    a.md = Math.hypot(fwd, lat);
  }

  it('ignores a cursor 0.5 cells ahead', () => {
    const { w, a } = one(crane());
    cursorAt(w, a, 0.5);
    w.skirt(a, 1 / 60);
    expect([a.want, a.holdMul, a.dodge]).toEqual([0, 1, 0]);
  });

  it('ignores a cursor behind', () => {
    const { w, a } = one(crane());
    cursorAt(w, a, -20);
    w.skirt(a, 1 / 60);
    expect([a.want, a.holdMul, a.dodge]).toEqual([0, 1, 0]);
  });

  it('turns away from a cursor 55 cells straight ahead and keeps the side it picked', () => {
    const { w, a } = one(crane());
    cursorAt(w, a, 55);
    w.skirt(a, 1 / 60);
    expect(a.dodge).not.toBe(0);
    expect(Math.sign(a.want)).toBe(a.dodge);
    const side = a.dodge;
    cursorAt(w, a, 50, -2 * (side ?? 0)); // now slightly off to the side it is turning toward
    a.want = 0;
    w.skirt(a, 1 / 60);
    expect(a.dodge).toBe(side);
  });
});

describe('orbit', () => {
  it('heads for a point on the circle round the cursor, not the cursor itself', () => {
    const { w, a } = one(species());
    w.mouse.x = a.x + 20;
    w.mouse.y = a.y;
    a.md = 20;
    const h = w.orbit(a, 5);
    expect(Math.abs(angDiff(h, w.toMouse(a)))).toBeGreaterThan(0.01);
    expect(Math.abs(h)).toBeLessThan(Math.PI / 2);
  });
});

describe('emit and lineGlyph', () => {
  it('rotates by the animal face, not the species face', () => {
    const { w, a } = one(species({ face: 0 }));
    a.face = Math.PI / 2;
    expect(w.lineGlyph(a)).toBe('|');
    w.emit(a, 5, 0, '*');
    const tr = [...w.trails.values()][0];
    expect(tr).toMatchObject({ cx: Math.floor(a.x), cy: Math.floor(a.y + 5 * a.sc), ch: '*' });
  });

  it('drops nothing outside the grid', () => {
    const { w, a } = one(species(), {}, 1, 1);
    w.emit(a, -50, 0, '*');
    expect(w.trails.size).toBe(0);
  });
});
