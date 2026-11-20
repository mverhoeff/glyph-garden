import type { Species, Tweaks } from '../../engine/types';

// The value every tweak starts at before an animal's own defaults are applied.
export const BASE_TWEAKS: Readonly<Tweaks> = {
  density: 1,
  corner: false,
  direction: 45,
  speed: 1,
  sway: 0,
  spread: 0.1,
  size: 1,
  farDepth: 0.33,
  farBias: 1.3,
  hold: 2,
  separation: 400,
  meander: 0.4,
  beat: 1,
  cursor: true,
  cursorReach: 1,
  cursorStrength: 1,
  hue: 0,
  shimmer: 0.35,
  glyphs: 0.6,
};

// How far (in pixels) an animal that eats notices food, before its own defaults.
export const FOOD_RANGE = 200;

// One animal's defaults: the base values, the Feeding group for animals that eat, then the animal's own values.
export function defaultsFor(sp: Species): Tweaks {
  return Object.assign({}, BASE_TWEAKS, sp.eats ? { foodRange: FOOD_RANGE } : {}, sp.tweaks);
}
