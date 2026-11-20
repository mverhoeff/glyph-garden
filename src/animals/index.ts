import { allSpecies, registerSpecies } from '../engine/registry';
import type { Species, SpeciesDef } from '../engine/types';

// Every animal, in picker order (number keys 1-9 and 0 follow it).
const ANIMALS: readonly SpeciesDef[] = [];

let registered = false;

// Registers every animal once and returns the registered species in picker order; later calls only return them,
// so the picker never lists one twice.
export function registerAnimals(): readonly Species[] {
  if (!registered) {
    registered = true;
    for (const def of ANIMALS) registerSpecies(def);
  }
  return allSpecies();
}
