// Every animal's sample() must give exactly what the prototype gave, cell for cell, in three poses. The fixtures
// hold one SHA-256 digest per pose; on a mismatch, `npm run golden -- --diff <id>` shows the cells that differ.
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { registerAnimals } from '../../src/animals';
import { getSpecies } from '../../src/engine/registry';
import type { Animal, Species, Tweaks } from '../../src/engine/types';
import { World } from '../../src/engine/world';
import samples from './fixtures/samples.json';
import {
  BASE_TWEAKS,
  FOOD_RANGE_DEFAULT,
  GRID,
  POSES,
  POSE_1_OVERRIDES,
  SAMPLE_SEED,
  VIEW,
  baseAnimal,
  mulberry32,
  serialise,
} from './protocol';

registerAnimals();

const tweaksFor = (sp: Species): Tweaks =>
  Object.assign({}, BASE_TWEAKS, sp.eats ? { foodRange: FOOD_RANGE_DEFAULT } : {}, sp.tweaks);

const realRandom = Math.random;
afterEach(() => {
  Math.random = realRandom;
});

// The protocol's build order: a fresh world, use(), seed, base animal, init(), then pose 1's overrides.
function digest(sp: Species, poseIndex: number): string {
  const pose = POSES[poseIndex];
  if (!pose) throw new Error(`no pose ${poseIndex}`);
  const world = new World();
  world.setView(VIEW.cols * VIEW.cell, VIEW.rows * VIEW.cell, VIEW.cell);
  world.use(sp, tweaksFor(sp));
  Math.random = mulberry32(SAMPLE_SEED);
  const a = baseAnimal(sp, pose) as Animal;
  sp.init?.(a, world);
  if (poseIndex === 1) for (const k in POSE_1_OVERRIDES) if (k in a) a[k] = POSE_1_OVERRIDES[k];
  const lines: string[] = [];
  for (let x = GRID.x0; x <= GRID.x1; x += GRID.step)
    for (let y = GRID.y0; y <= GRID.y1; y += GRID.step) lines.push(serialise(sp.sample(x, y, a, world)));
  return createHash('sha256').update(lines.join('\n')).digest('hex');
}

const expected: Record<string, string[]> = samples;

describe('golden samples', () => {
  for (const [id, digests] of Object.entries(expected)) {
    const sp = getSpecies(id);
    if (!sp) {
      it.todo(`${id} (not ported yet)`);
      continue;
    }
    digests.forEach((want, poseIndex) => {
      it(`${id} pose ${poseIndex}`, () => {
        expect(digest(sp, poseIndex)).toBe(want);
      });
    });
  }
});
