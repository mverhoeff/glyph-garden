import { afterEach, describe, expect, it } from 'vitest';
import { angDiff } from '../../src/engine/shape';
import type { Animal, Species } from '../../src/engine/types';
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
    palettes: { main: ['#336699'] },
    tweaks: {},
    sample: () => null,
    ...extra,
  };
}

const realRandom = Math.random;
afterEach(() => {
  Math.random = realRandom;
});

// Three animals around a click at (60, 40): 10 cells right, 20 cells up, and 100 cells away (out of reach).
function world(sp: Species): { w: World; near: Animal; mid: Animal; far: Animal } {
  Math.random = mulberry32(9);
  const w = new World();
  w.setView(1440, 810, 10);
  w.use({ ...sp, count: 3 }, { ...BASE_TWEAKS });
  const [near, mid, far] = w.animals;
  if (!near || !mid || !far || w.animals.length !== 3) throw new Error('expected three animals');
  Object.assign(near, { x: 70, y: 40 });
  Object.assign(mid, { x: 60, y: 20 });
  Object.assign(far, { x: 160, y: 40 });
  return { w, near, mid, far };
}

describe('click', () => {
  it('leaves a ripple at the spot', () => {
    const { w } = world(species());
    w.click(60, 40);
    expect(w.ripples).toEqual([{ x: 60, y: 40, r: 0.5, life: 1 }]);
  });

  it('scatters nearby animals of a species that does not eat, fleeing away from the spot', () => {
    const { w, near, mid, far } = world(species());
    w.click(60, 40);
    expect(Math.abs(angDiff(near.fleeH, 0))).toBeLessThanOrEqual(0.25);
    expect(Math.abs(angDiff(mid.fleeH, -Math.PI / 2))).toBeLessThanOrEqual(0.25);
    for (const a of [near, mid]) expect(a.fleeT).toBe(0.9);
    expect(near.ix).toBeGreaterThan(0);
    expect(mid.iy).toBeLessThan(0);
    expect(near.panic).toBeGreaterThan(mid.panic); // closer means a harder scare
    expect([far.fleeT, far.ix, far.iy, far.panic]).toEqual([0, 0, 0, 0]);
    expect(w.food).toEqual([]);
  });

  it('feeds a species that eats: 15 pellets, nobody scattered, no species hook', () => {
    let hooked = false;
    const { w, near, mid } = world(
      species({
        eats: true,
        click: () => {
          hooked = true;
          return undefined;
        },
      }),
    );
    w.click(60, 40);
    expect(w.food).toHaveLength(15);
    for (const f of w.food) expect(Math.hypot(f.x - 60, f.y - 40)).toBeCloseTo(0.8, 9);
    for (const a of [near, mid]) expect([a.fleeT, a.ix, a.iy]).toEqual([0, 0, 0]);
    expect(hooked).toBe(false);
  });

  it('lets a species hook returning true replace the scatter', () => {
    const seen: [number, number][] = [];
    const { w, near } = world(
      species({
        click: (_w, px, py) => {
          seen.push([px, py]);
          return true;
        },
      }),
    );
    w.click(60, 40);
    expect(seen).toEqual([[60, 40]]);
    expect(near.fleeT).toBe(0);
  });

  it('still scatters when the hook returns anything but true', () => {
    const { w, near } = world(species({ click: () => undefined }));
    w.click(60, 40);
    expect(near.fleeT).toBe(0.9);
  });
});

describe('scatter', () => {
  it('honours the radius and kick', () => {
    const { w, near, mid } = world(species());
    w.scatter(60, 40, 15, 2);
    expect(near.ix).toBeCloseTo((1 - 10 / 15) * 30 * 2, 9);
    expect(mid.fleeT).toBe(0); // 20 cells is outside R = 15
  });
});
