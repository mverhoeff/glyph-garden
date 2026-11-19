import type { PaletteSpec, Palettes } from './types';

// '#rrggbb' -> [hue 0..360, saturation 0..100, lightness 0..100].
export function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    l = (mx + mn) / 2;
  let h = 0,
    s = 0;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

// Palettes with the hue shift applied. `light` marks shades bright enough to need a dark glyph on top.
export function buildPalettes(palettes: PaletteSpec, hueShift: number): Palettes {
  const pal: Palettes = {};
  for (const [name, list] of Object.entries(palettes)) {
    pal[name] = list.map((hex) => {
      const [h, s, l] = hexToHsl(hex);
      return {
        css: `hsl(${(((h + hueShift) % 360) + 360) % 360} ${s.toFixed(1)}% ${l.toFixed(1)}%)`,
        light: l > 52,
      };
    });
  }
  return pal;
}
