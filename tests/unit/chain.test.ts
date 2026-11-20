import { afterEach, describe, expect, it } from 'vitest';
import { follow, layChain, spineCoords, straighten } from '../../src/engine/chain';
import { angDiff } from '../../src/engine/shape';
import type { Animal, ChainSpec, Point, Species } from '../../src/engine/types';
import { World } from '../../src/engine/world';
import { BASE_TWEAKS, mulberry32 } from '../golden/protocol';

function species(chain: ChainSpec): Species {
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
    chain,
    sample: () => null,
  };
}

// Just the fields the chain functions read, on an animal at (x, y) heading h with its chain laid out behind it.
function chained(chain: ChainSpec, sc = 1.5, x = 50, y = 40, h = 0): Animal & { chain: Point[] } {
  const points = Array.from({ length: chain.n }, () => ({ x, y }));
  const a = { sp: species(chain), x, y, h, sc, chain: points } as unknown as Animal & { chain: Point[] };
  layChain(a, sc);
  return a;
}

// Direction of each segment, from each point back toward the next one.
function segments(c: Point[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < c.length; i++) {
    const p = c[i - 1],
      q = c[i];
    if (p && q) out.push(Math.atan2(q.y - p.y, q.x - p.x));
  }
  return out;
}

describe('layChain', () => {
  it('lays the points out straight behind the head', () => {
    const a = chained({ n: 4, spacing: 2 }, 1.5, 50, 40, 0);
    expect(a.chain.map((p) => [p.x, p.y])).toEqual([
      [50, 40],
      [47, 40],
      [44, 40],
      [41, 40],
    ]);
  });
});

describe('follow', () => {
  it('keeps consecutive points exactly spacing x scale apart', () => {
    const a = chained({ n: 8, spacing: 1.2 }, 1.5);
    for (let i = 0; i < 50; i++) {
      a.h += 0.07;
      a.x += Math.cos(a.h) * 0.6;
      a.y += Math.sin(a.h) * 0.6;
      follow(a);
    }
    const c = a.chain;
    for (let i = 1; i < c.length; i++) {
      const p = c[i - 1],
        q = c[i];
      if (!p || !q) throw new Error('missing point');
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeCloseTo(1.2 * 1.5, 12);
    }
    expect(c[0]).toEqual({ x: a.x, y: a.y });
  });

  it.each([undefined, 0.3])('never bends a joint past the limit after a 180° turn (bend %s)', (bend) => {
    const limit = bend ?? 0.45;
    const a = chained({ n: 10, spacing: 1, bend }, 1);
    a.h += Math.PI;
    for (let i = 0; i < 40; i++) {
      a.x += Math.cos(a.h) * 0.5;
      a.y += Math.sin(a.h) * 0.5;
      follow(a);
      const seg = segments(a.chain);
      let prev = a.h + Math.PI;
      for (const ang of seg) {
        expect(Math.abs(angDiff(ang, prev))).toBeLessThanOrEqual(limit + 1e-9);
        prev = ang;
      }
    }
  });
});

describe('straighten', () => {
  it('brings a bent chain onto the line behind the head', () => {
    const a = chained({ n: 6, spacing: 1 }, 1, 50, 40, 0);
    a.chain.forEach((p, i) => {
      p.y += i * i * 0.3; // bend it
    });
    for (let i = 0; i < 300; i++) straighten(a, 4, 1 / 60);
    a.chain.forEach((p, i) => {
      expect(p.x).toBeCloseTo(50 - i, 6);
      expect(p.y).toBeCloseTo(40, 6);
    });
  });
});

describe('spineCoords', () => {
  // Straight chain heading +x: head at (10, 10), points every 2 cells toward -x.
  const chain = [0, 1, 2, 3].map((i) => ({ x: 10 - 2 * i, y: 10 }));

  it('gives lx = -(distance behind the head) and ly = the signed side offset', () => {
    const right = spineCoords(chain, 2, 1, 7, 11);
    expect(right.lx).toBeCloseTo(-3, 12);
    expect(right.ly).toBeCloseTo(1, 12);
    expect(right.base).toBeCloseTo(0, 12);
    const left = spineCoords(chain, 2, 1, 5, 8);
    expect(left.lx).toBeCloseTo(-5, 12);
    expect(left.ly).toBeCloseTo(-2, 12);
  });

  it('scales by inv into body units', () => {
    const r = spineCoords(chain, 2, 0.5, 7, 11);
    expect(r.lx).toBeCloseTo(-1.5, 12);
    expect(r.ly).toBeCloseTo(0.5, 12);
  });

  it('gives a positive lx ahead of the head', () => {
    const r = spineCoords(chain, 2, 1, 12, 10);
    expect(r.lx).toBeCloseTo(2, 12);
    expect(r.ly).toBeCloseTo(0, 12);
  });

  it('runs on past the tail', () => {
    expect(spineCoords(chain, 2, 1, 1, 10).lx).toBeCloseTo(-9, 12);
  });

  it('follows the bend: base is the local forward direction', () => {
    // Head at (10, 10) heading +x, then the spine turns down (+y) behind it.
    const bent = [
      { x: 10, y: 10 },
      { x: 8, y: 10 },
      { x: 8, y: 12 },
    ];
    // (7, 11) is nearest the second segment, halfway along it, one cell to its left (forward there is -y).
    const r = spineCoords(bent, 2, 1, 7, 11);
    expect(r.lx).toBeCloseTo(-3, 12);
    expect(r.ly).toBeCloseTo(-1, 12);
    expect(r.base).toBeCloseTo(-Math.PI / 2, 12); // forward along that segment is up the screen
  });
});

describe('World with chain bodies', () => {
  const realRandom = Math.random;
  afterEach(() => {
    Math.random = realRandom;
  });

  it('lays out new chains and keeps them following through the step', () => {
    Math.random = mulberry32(5);
    const w = new World();
    w.setView(1440, 810, 10);
    w.use(species({ n: 6, spacing: 1.1 }), { ...BASE_TWEAKS });
    for (let i = 0; i < 120; i++) w.step(1 / 60);
    for (const a of w.animals) {
      const c = a.chain ?? [];
      expect(c).toHaveLength(6);
      expect(c[0]).toEqual({ x: a.x, y: a.y });
      for (let i = 1; i < c.length; i++) {
        const p = c[i - 1],
          q = c[i];
        if (!p || !q) throw new Error('missing point');
        expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeCloseTo(1.1 * a.sc, 9);
      }
    }
  });
});
