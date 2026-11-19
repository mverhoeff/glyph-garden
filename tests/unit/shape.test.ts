import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  S,
  angDiff,
  capsule,
  circle,
  clamp,
  ellipse,
  hash,
  mix,
  noise,
  pick,
  rnd,
  smin,
  smooth,
  tri,
} from '../../src/engine/shape';

describe('clamp', () => {
  it('limits a value to the range', () => {
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
    expect(clamp(2, 0, 1)).toBe(1);
  });
});

describe('mix', () => {
  it('interpolates linearly and extrapolates beyond 0..1', () => {
    expect(mix(2, 6, 0)).toBe(2);
    expect(mix(2, 6, 0.5)).toBe(4);
    expect(mix(2, 6, 1)).toBe(6);
    expect(mix(2, 6, 1.5)).toBe(8);
  });
});

describe('smooth', () => {
  it('clamps its input to 0..1', () => {
    expect(smooth(-3)).toBe(0);
    expect(smooth(5)).toBe(1);
  });

  it('is the smoothstep curve inside the range', () => {
    expect(smooth(0.5)).toBe(0.5);
    expect(smooth(0.25)).toBeCloseTo(0.15625, 12);
  });
});

describe('angDiff', () => {
  it('returns the signed shortest difference', () => {
    expect(angDiff(1, 0.25)).toBeCloseTo(0.75, 12);
    expect(angDiff(0.25, 1)).toBeCloseTo(-0.75, 12);
  });

  it('wraps at ±π', () => {
    expect(angDiff(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(-0.2, 12);
    expect(angDiff(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(0.2, 12);
    expect(angDiff(4 * Math.PI + 0.3, 0)).toBeCloseTo(0.3, 12);
  });
});

describe('distance functions', () => {
  it('circle: negative inside, zero on the edge, positive outside', () => {
    expect(circle(1, 1, 1, 1, 2)).toBe(-2);
    expect(circle(3, 1, 1, 1, 2)).toBe(0);
    expect(circle(4, 1, 1, 1, 2)).toBe(1);
  });

  it('ellipse: negative inside, zero on the edge, positive outside', () => {
    expect(ellipse(0, 0, 0, 0, 4, 2)).toBeLessThan(0);
    expect(ellipse(4, 0, 0, 0, 4, 2)).toBeCloseTo(0, 12);
    expect(ellipse(0, 2, 0, 0, 4, 2)).toBeCloseTo(0, 12);
    expect(ellipse(5, 0, 0, 0, 4, 2)).toBeGreaterThan(0);
  });

  it('capsule: negative inside, zero on the edge, positive outside', () => {
    expect(capsule(2, 0, 0, 0, 4, 0, 1)).toBe(-1);
    expect(capsule(2, 1, 0, 0, 4, 0, 1)).toBe(0);
    expect(capsule(6, 0, 0, 0, 4, 0, 1)).toBe(1);
  });

  it('tri: negative inside, zero on the edge, positive outside, for either winding', () => {
    type Triangle = [number, number, number, number, number, number];
    const windings: Triangle[] = [
      [0, 0, 4, 0, 0, 4],
      [0, 0, 0, 4, 4, 0],
    ];
    for (const t of windings) {
      expect(tri(1, 1, ...t)).toBeCloseTo(-1, 12);
      expect(tri(2, 0, ...t)).toBeCloseTo(0, 12);
      expect(tri(2, -1, ...t)).toBeCloseTo(1, 12);
    }
  });

  it('smin: never above the plain minimum and equals it when the shapes are far apart', () => {
    expect(smin(1, 1)).toBeCloseTo(0.875, 12);
    expect(smin(1, 1.2)).toBeLessThan(1);
    expect(smin(1, 3)).toBe(1);
    expect(smin(1, 1, 2)).toBeCloseTo(0.5, 12);
  });
});

describe('hash', () => {
  it('is deterministic', () => {
    expect(hash(3, 5, 7)).toBe(hash(3, 5, 7));
    expect(hash(3)).toBe(hash(3, 0, 0));
  });

  it('stays in [0, 1)', () => {
    for (let a = -50; a <= 50; a++) {
      for (let b = -5; b <= 5; b++) {
        const h = hash(a, b, a * b);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThan(1);
      }
    }
  });

  it('distinguishes nearby inputs', () => {
    expect(hash(1, 2, 3)).not.toBe(hash(2, 1, 3));
    expect(hash(0, 0, 1)).not.toBe(hash(0, 0, 2));
  });

  it('truncates fractional inputs to integers', () => {
    expect(hash(2.9, -1.5)).toBe(hash(2, -1));
  });
});

describe('noise', () => {
  it('stays in [-1, 1] and is continuous', () => {
    let prev = noise(0);
    for (let t = 0; t < 20; t += 0.01) {
      const n = noise(t);
      expect(n).toBeGreaterThanOrEqual(-1);
      expect(n).toBeLessThanOrEqual(1);
      expect(Math.abs(n - prev)).toBeLessThan(0.1);
      prev = n;
    }
  });

  it('hits the hashed value at integers', () => {
    expect(noise(4)).toBe(hash(4, 7) * 2 - 1);
  });
});

describe('pick', () => {
  it('maps [0, 1) evenly onto the characters', () => {
    expect(pick('abcd', 0)).toBe('a');
    expect(pick('abcd', 0.26)).toBe('b');
    expect(pick('abcd', 0.99)).toBe('d');
  });

  it('wraps r >= 1 back into the string', () => {
    expect(pick('abcd', 1)).toBe('a');
  });
});

describe('rnd', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scales Math.random into [a, b) with exactly one draw', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    expect(rnd(2, 6)).toBe(3);
    expect(random).toHaveBeenCalledTimes(1);
  });
});

describe('S', () => {
  it('groups all thirteen helpers', () => {
    expect(Object.keys(S).sort()).toEqual(
      [
        'angDiff',
        'capsule',
        'circle',
        'clamp',
        'ellipse',
        'hash',
        'mix',
        'noise',
        'pick',
        'rnd',
        'smin',
        'smooth',
        'tri',
      ].sort(),
    );
    expect(S.circle).toBe(circle);
  });
});
