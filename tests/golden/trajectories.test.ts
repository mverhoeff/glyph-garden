// Every animal must move exactly as in the prototype: same seed, 240 steps, a click before step 100, and every
// animal's [x, y, h] at the recorded steps equal to 4 decimals. A mismatch is almost always a Math.random() call
// out of order or a helper evaluated twice; the failure message names the first step, animal and field that differ.
import { afterEach, describe, expect, it } from 'vitest';
import { registerAnimals } from '../../src/animals';
import { getSpecies } from '../../src/engine/registry';
import type { Species } from '../../src/engine/types';
import { World } from '../../src/engine/world';
import { defaultsFor } from '../../src/ui/tweaks/schema';
import trajectories from './fixtures/trajectories.json';
import {
  CLICK,
  CLICK_BEFORE_STEP,
  DT,
  RECORD_STEPS,
  STEPS,
  TRAJECTORY_SEED,
  VIEW,
  fixed,
  mulberry32,
} from './protocol';

registerAnimals();

type Recorded = Record<string, string[][]>;

const realRandom = Math.random;
afterEach(() => {
  Math.random = realRandom;
});

// The protocol: seed, a fresh world, use(), then the steps with the click just before CLICK_BEFORE_STEP.
function run(sp: Species): Recorded {
  Math.random = mulberry32(TRAJECTORY_SEED);
  const world = new World();
  world.setView(VIEW.cols * VIEW.cell, VIEW.rows * VIEW.cell, VIEW.cell);
  world.use(sp, defaultsFor(sp));
  const recorded: Recorded = {};
  for (let step = 1; step <= STEPS; step++) {
    if (step === CLICK_BEFORE_STEP) world.click(CLICK.x, CLICK.y);
    world.step(DT);
    if (RECORD_STEPS.includes(step))
      recorded[step] = world.animals.map((a) => [fixed(a.x), fixed(a.y), fixed(a.h)]);
  }
  return recorded;
}

const FIELDS = ['x', 'y', 'h'];

// The first step, animal and field where the run leaves the fixture, or null if they agree everywhere.
function firstDifference(want: Recorded, got: Recorded): string | null {
  for (const step of RECORD_STEPS) {
    const w = want[step] ?? [],
      g = got[step] ?? [];
    if (w.length !== g.length) return `step ${step}: ${g.length} animals, expected ${w.length}`;
    for (let i = 0; i < w.length; i++)
      for (let f = 0; f < FIELDS.length; f++) {
        const wv = w[i]?.[f],
          gv = g[i]?.[f];
        if (wv !== gv) return `step ${step}, animal ${i}, ${FIELDS[f]}: got ${gv}, expected ${wv}`;
      }
  }
  return null;
}

const expected: Record<string, Recorded> = trajectories;

describe('golden trajectories', () => {
  for (const [id, want] of Object.entries(expected)) {
    it(id, () => {
      const sp = getSpecies(id);
      expect(sp, `${id} is not registered`).toBeDefined();
      if (!sp) return;
      // Compared as a string so the failure shows the whole message rather than a truncated preview.
      expect(firstDifference(want, run(sp)) ?? 'match').toBe('match');
    });
  }
});
