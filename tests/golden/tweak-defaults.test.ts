// Every animal starts with exactly the tweak values the prototype gave it.
import { describe, expect, it } from 'vitest';
import { registerAnimals } from '../../src/animals';
import { getSpecies } from '../../src/engine/registry';
import { defaultsFor } from '../../src/ui/tweaks/schema';
import defaults from './fixtures/tweak-defaults.json';

registerAnimals();

describe('tweak defaults', () => {
  for (const [id, want] of Object.entries(defaults)) {
    it(id, () => {
      const sp = getSpecies(id);
      expect(sp, `${id} is not registered`).toBeDefined();
      if (sp) expect(defaultsFor(sp)).toStrictEqual(want);
    });
  }
});
