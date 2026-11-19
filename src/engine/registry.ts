import type { Species, SpeciesDef } from './types';

// Registered species in picker order.
const species: Species[] = [];

export function registerSpecies(def: SpeciesDef): Species {
  const sp: Species = Object.assign(
    {
      count: 12,
      radius: 8,
      speed: 4,
      flap: 5,
      face: 0,
      ramp: '.:=-+',
      gait: 'Flight',
      beatLabel: 'Wing beat',
      palettes: {},
      tweaks: {},
      dot: '#888',
    },
    def,
  );
  species.push(sp);
  return sp;
}

export function allSpecies(): readonly Species[] {
  return species;
}

export function getSpecies(id: string): Species | undefined {
  return species.find((s) => s.id === id);
}
