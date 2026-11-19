import { describe, expect, it } from 'vitest';
import { dirGlyph } from '../../src/engine/glyph';

// Screen y points down, so a negative angle points up and to the right.
describe('dirGlyph', () => {
  it('maps the four line directions', () => {
    expect(dirGlyph(0)).toBe('-');
    expect(dirGlyph(-Math.PI / 4)).toBe('/');
    expect(dirGlyph(Math.PI / 2)).toBe('|');
    expect(dirGlyph(Math.PI / 4)).toBe('\\');
  });

  it('gives a line the same glyph in both directions', () => {
    for (const ang of [0, -Math.PI / 4, Math.PI / 2, Math.PI / 4, 0.3]) {
      expect(dirGlyph(ang + Math.PI)).toBe(dirGlyph(ang));
      expect(dirGlyph(ang - 3 * Math.PI)).toBe(dirGlyph(ang));
    }
  });

  it('snaps to the nearest of the four directions', () => {
    expect(dirGlyph(-0.3)).toBe('-');
    expect(dirGlyph(-0.5)).toBe('/');
    expect(dirGlyph(-1.3)).toBe('|');
  });
});
