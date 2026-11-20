import { afterEach, describe, expect, it } from 'vitest';
import type { Species, Tweaks } from '../../src/engine/types';
import { World } from '../../src/engine/world';
import { BASE_TWEAKS, mulberry32 } from '../golden/protocol';

// A stand-in species: the engine defaults, nothing drawn. Registering it would leak into the picker order.
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

function tweaks(extra: Partial<Tweaks> = {}): Tweaks {
  return { ...BASE_TWEAKS, ...extra };
}

const realRandom = Math.random;
afterEach(() => {
  Math.random = realRandom;
});

function world(width = 1440, height = 810, cell = 10): World {
  const w = new World();
  w.setView(width, height, cell);
  return w;
}

describe('World', () => {
  it('constructs in Node with no DOM', () => {
    expect(typeof document).toBe('undefined');
    const w = new World();
    expect(w.animals).toEqual([]);
    expect(w.mouse.on).toBe(false);
  });

  it('sizes the grid from the view', () => {
    const w = world(1445, 801, 10);
    expect([w.cols, w.rows, w.cs]).toEqual([145, 81, 10]);
  });

  it('builds hue-shifted palettes on use()', () => {
    const w = world();
    w.use(species({ palettes: { main: ['#ff0000'] } }), tweaks({ hue: 120 }));
    expect(w.pal.main?.[0]?.css).toBe('hsl(120 100.0% 50.0%)');
  });

  it.each([
    [1440, 810, 1],
    [400, 300, 0.5],
    [4000, 3000, 2],
  ])('creates round(count x density x clamped area) animals at %ix%i', (width, height, density) => {
    const w = world(width, height);
    w.use(species(), tweaks({ density }));
    const area = Math.min(2.5, Math.max(0.35, (w.cols * w.rows) / 11520));
    expect(w.animals).toHaveLength(Math.max(1, Math.round(12 * density * area)));
  });

  it('removes animals when density drops', () => {
    const w = world();
    const T = tweaks();
    w.use(species(), T);
    const before = w.animals.length;
    T.density = 0.5;
    w.sync();
    expect(w.animals.length).toBeLessThan(before);
  });

  it('sorts animals far to near', () => {
    Math.random = mulberry32(7);
    const w = world();
    w.use(species({ count: 40 }), tweaks());
    const us = w.animals.map((a) => a.u);
    expect(us).toEqual([...us].sort((p, q) => p - q));
  });

  it('places an animal that has grown nearer: u = min(1, r + gain) ^ farBias', () => {
    const w = world();
    const T = tweaks({ farBias: 1.3 });
    w.use(species(), T);
    const a = w.animals[0];
    if (!a) throw new Error('no animal');
    a.r = 0.5;
    a.gain = 0.2;
    w.sync();
    expect(a.u).toBeCloseTo(Math.pow(0.7, 1.3), 12);
    a.gain = 0.8;
    w.sync();
    expect(a.u).toBe(1);
  });

  it('heads along the course at direction 45', () => {
    const w = world();
    w.use(species(), tweaks({ direction: 45, sway: 0 }));
    expect(w.course()).toBeCloseTo(-Math.PI / 4, 12);
  });

  it('runs corner to corner using the stored view size', () => {
    const w = world(1600, 900);
    w.use(species(), tweaks({ corner: true, sway: 0 }));
    expect(w.course()).toBeCloseTo(-Math.atan2(900, 1600), 12);
  });

  it('rescales positions and clears effects when the cell size changes', () => {
    const w = world(1440, 810, 10);
    w.use(species({ chain: { n: 4, spacing: 1 } }), tweaks());
    const a = w.animals[0];
    if (!a?.chain?.[0]) throw new Error('no chained animal');
    const [x, y, cx] = [a.x, a.y, a.chain[0].x];
    w.food.push({ x: 1, y: 1, vx: 0, vy: 0, age: 0 });
    w.setView(1440, 810, 20);
    expect(a.x).toBeCloseTo(x / 2, 12);
    expect(a.y).toBeCloseTo(y / 2, 12);
    expect(a.chain[0].x).toBeCloseTo(cx / 2, 12);
    expect(w.food).toEqual([]);
  });

  it('points toMouse() at the cursor', () => {
    const w = world();
    w.use(species(), tweaks());
    const a = w.animals[0];
    if (!a) throw new Error('no animal');
    w.mouse.x = a.x;
    w.mouse.y = a.y + 5;
    expect(w.toMouse(a)).toBeCloseTo(Math.PI / 2, 12);
  });

  it('calls init() once per spawned animal, after its heading is set', () => {
    const seen: number[] = [];
    const w = world();
    w.use(
      species({
        init: (a) => {
          seen.push(a.h);
        },
      }),
      tweaks({ spread: 0 }),
    );
    expect(seen).toHaveLength(w.animals.length);
    for (const h of seen) expect(h).toBeCloseTo(-Math.PI / 4, 12);
  });
});
