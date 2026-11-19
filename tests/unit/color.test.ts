import { describe, expect, it } from 'vitest';
import { buildPalettes, hexToHsl } from '../../src/engine/color';

describe('hexToHsl', () => {
  it('converts black', () => {
    expect(hexToHsl('#000000')).toEqual([0, 0, 0]);
  });

  it('converts white', () => {
    expect(hexToHsl('#ffffff')).toEqual([0, 0, 100]);
  });

  it('converts pure red', () => {
    expect(hexToHsl('#ff0000')).toEqual([0, 100, 50]);
  });

  it('converts green and blue hues', () => {
    expect(hexToHsl('#00ff00')[0]).toBe(120);
    expect(hexToHsl('#0000ff')[0]).toBe(240);
  });
});

describe('buildPalettes', () => {
  it('formats each shade as an hsl() colour and keeps palette names and order', () => {
    const pal = buildPalettes({ main: ['#000000', '#ff0000'], spot: ['#ffffff'] }, 0);
    expect(pal).toEqual({
      main: [
        { css: 'hsl(0 0.0% 0.0%)', light: false },
        { css: 'hsl(0 100.0% 50.0%)', light: false },
      ],
      spot: [{ css: 'hsl(0 0.0% 100.0%)', light: true }],
    });
  });

  it('wraps the hue shift past 360', () => {
    // #ff00ff is hue 300.
    expect(buildPalettes({ main: ['#ff00ff'] }, 90).main?.[0]?.css).toBe('hsl(30 100.0% 50.0%)');
  });

  it('wraps a negative hue shift below 0', () => {
    expect(buildPalettes({ main: ['#ff0000'] }, -30).main?.[0]?.css).toBe('hsl(330 100.0% 50.0%)');
  });

  it('marks shades lighter than 52% as light', () => {
    const pal = buildPalettes({ main: ['#808080', '#8a8a8a'] }, 0);
    expect(pal.main?.map((c) => c.light)).toEqual([false, true]);
  });
});
