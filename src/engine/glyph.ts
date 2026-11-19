// Characters for a line at 0°, 45°, 90° and 135° (counter-clockwise on screen).
const LINES = '-/|\\';

// Screen-space angle (y down) -> line glyph. charAt keeps the result a string; the index is always 0..3.
export function dirGlyph(ang: number): string {
  const a = ((-ang % Math.PI) + Math.PI) % Math.PI;
  return LINES.charAt(Math.round(a / (Math.PI / 4)) % 4);
}
