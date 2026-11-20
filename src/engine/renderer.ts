// All drawing: the faint grid on one canvas, and effects plus animals on the other. It reads the world and never
// changes the simulation; the only world state it touches is the props list, which it prunes as the prototype does.
import { spineCoords } from './chain';
import { dirGlyph } from './glyph';
import { clamp, hash, pick } from './shape';
import type { Animal, PropSurface } from './types';
import type { World } from './world';

const TAU = Math.PI * 2;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return ctx;
}

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly gridCtx: CanvasRenderingContext2D;
  // What props draw on: the live world (read through the prototype chain) plus single-cell drawing. Props only
  // read the world and draw, so nothing they do lands on this object instead of the world.
  private readonly surface: PropSurface;
  private frameKey = 0; // changes six times a second; drives the shimmer

  constructor(
    private readonly world: World,
    private readonly fx: HTMLCanvasElement,
    private readonly gridCanvas: HTMLCanvasElement,
    public showGrid = true,
  ) {
    this.ctx = context(fx);
    this.gridCtx = context(gridCanvas);
    this.surface = Object.assign(Object.create(world) as World, {
      tileAt: this.tileAt.bind(this),
      glyphAt: this.glyphAt.bind(this),
    });
  }

  // Size both canvases to the view (device pixel ratio capped at 2), then the world's grid, then redraw the grid.
  resize(widthPx: number, heightPx: number, cell: number, dpr = globalThis.devicePixelRatio || 1): void {
    const k = Math.min(dpr, 2);
    for (const cv of [this.fx, this.gridCanvas]) {
      cv.width = Math.round(widthPx * k);
      cv.height = Math.round(heightPx * k);
      cv.style.width = widthPx + 'px';
      cv.style.height = heightPx + 'px';
      context(cv).setTransform(k, 0, 0, k, 0, 0);
    }
    this.world.setView(widthPx, heightPx, cell);
    this.drawGrid();
  }

  drawGrid(): void {
    const g = this.gridCtx,
      w = this.world,
      cs = w.cs;
    g.clearRect(0, 0, w.width, w.height);
    if (!this.showGrid) return;
    g.lineWidth = 1;
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = pass ? 'rgba(255,255,255,0.022)' : 'rgba(255,255,255,0.018)';
      const step = pass ? 4 : 1;
      g.beginPath();
      for (let x = 0; x <= w.cols; x += step) {
        g.moveTo(x * cs + 0.5, 0);
        g.lineTo(x * cs + 0.5, w.height);
      }
      for (let y = 0; y <= w.rows; y += step) {
        g.moveTo(0, y * cs + 0.5);
        g.lineTo(w.width, y * cs + 0.5);
      }
      g.stroke();
    }
  }

  // One tile at a grid cell (for props).
  tileAt(cx: number, cy: number, hue: string, tone: number, glyph?: string, alpha = 1): void {
    const w = this.world;
    if (cx < 0 || cy < 0 || cx >= w.cols || cy >= w.rows) return;
    const pal = w.pal[hue] || w.pal.main,
      col = pal?.[Math.round(clamp(tone, 0, 1) * (pal.length - 1))];
    if (!col) return;
    const ctx = this.ctx,
      cs = w.cs;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col.css;
    ctx.fillRect(cx * cs + 0.5, cy * cs + 0.5, cs - 1, cs - 1);
    if (glyph) {
      ctx.globalAlpha = alpha * w.T.glyphs;
      ctx.fillStyle = col.light ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)';
      ctx.fillText(glyph, cx * cs + cs / 2, cy * cs + cs / 2);
    }
  }

  // One loose character at a grid cell (for props).
  glyphAt(cx: number, cy: number, css: string, glyph: string, alpha = 1): void {
    const w = this.world;
    if (cx < 0 || cy < 0 || cx >= w.cols || cy >= w.rows) return;
    const ctx = this.ctx,
      cs = w.cs;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = css;
    ctx.fillText(glyph, cx * cs + cs / 2, cy * cs + cs / 2);
  }

  render(): void {
    const w = this.world,
      ctx = this.ctx,
      cs = w.cs,
      half = cs / 2;
    ctx.clearRect(0, 0, w.width, w.height);
    ctx.font = `${Math.max(6, Math.round(cs * 0.72))}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8791a3';
    for (const hl of w.halo.values()) {
      if (hash(hl.cx, hl.cy, 3) < 0.3) continue;
      ctx.globalAlpha = hl.life * 0.34;
      ctx.fillText('·', hl.cx * cs + half, hl.cy * cs + half);
    }
    for (const tr of w.trails.values()) {
      ctx.globalAlpha = Math.min(1, tr.life) * 0.7;
      ctx.fillStyle = tr.color;
      ctx.fillText(tr.ch, tr.cx * cs + half, tr.cy * cs + half);
    }
    ctx.fillStyle = '#8fa3ba';
    for (const r of w.ripples) {
      ctx.globalAlpha = r.life * 0.4;
      const n = Math.max(10, Math.round(r.r * 6)),
        seen = new Set<number>();
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU,
          cx = Math.floor(r.x + Math.cos(ang) * r.r),
          cy = Math.floor(r.y + Math.sin(ang) * r.r);
        const k = cy * 100000 + cx;
        if (seen.has(k)) continue;
        seen.add(k);
        ctx.fillText('·', cx * cs + half, cy * cs + half);
      }
    }
    const font = ctx.font;
    ctx.fillStyle = '#c9bf74';
    ctx.font = `bold ${Math.round(cs * 0.95)}px ${MONO}`;
    for (const f of w.food) {
      ctx.globalAlpha = Math.min(1, (45 - f.age) / 5) * 0.95;
      ctx.fillText('o', Math.floor(f.x) * cs + half, Math.floor(f.y) * cs + half);
    }
    ctx.font = font;
    w.props = w.props.filter((p) => p.draw(this.surface) !== false);
    this.frameKey = Math.floor(w.t * 6);
    for (const a of w.animals) this.drawAnimal(a);
    ctx.globalAlpha = 1;
  }

  private drawAnimal(a: Animal): void {
    const w = this.world,
      sp = a.sp,
      T = w.T,
      ctx = this.ctx,
      cs = w.cs,
      half = cs / 2,
      ch = a.chain;
    const scl = a.sc * (ch ? 1 : a.zoom || 1),
      inv = 1 / scl; // zoom: a rigid animal can dive or climb
    const R = sp.radius * scl;
    let x0 = a.x - R,
      x1 = a.x + R,
      y0 = a.y - R,
      y1 = a.y + R;
    if (ch)
      for (const p of ch) {
        x0 = Math.min(x0, p.x - R);
        x1 = Math.max(x1, p.x + R);
        y0 = Math.min(y0, p.y - R);
        y1 = Math.max(y1, p.y + R);
      }
    x0 = Math.max(0, Math.floor(x0));
    x1 = Math.min(w.cols - 1, Math.ceil(x1));
    y0 = Math.max(0, Math.floor(y0));
    y1 = Math.min(w.rows - 1, Math.ceil(y1));
    if (x0 > x1 || y0 > y1) return;
    const rot = a.h + a.face,
      c = Math.cos(rot),
      s = Math.sin(rot);
    const alpha = (0.38 + 0.62 * a.u) * (a.fade == null ? 1 : a.fade),
      glyphA = T.glyphs,
      shim = T.shimmer,
      seedI = (a.seed * 1e4) | 0;
    const spacing = ch && sp.chain ? sp.chain.spacing * a.sc : 0;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const wx = cx + 0.5,
          wy = cy + 0.5;
        let lx: number,
          ly: number,
          base = rot;
        if (ch) {
          // nearest point on the spine -> (distance along, signed side offset)
          const q = spineCoords(ch, spacing, inv, wx, wy);
          lx = q.lx;
          ly = q.ly;
          if (!Number.isNaN(q.base)) base = q.base; // NaN only for a chain collapsed onto one point
        } else {
          const dx = wx - a.x,
            dy = wy - a.y;
          lx = (dx * c + dy * s) * inv;
          ly = (-dx * s + dy * c) * inv;
          if (lx * lx + ly * ly > sp.radius * sp.radius) continue;
        }
        const r = sp.sample(lx, ly, a, w);
        if (!r) continue;
        const px = cx * cs,
          py = cy * cs;
        if (r.dot) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = r.color || '#f4f4f6';
          ctx.beginPath();
          ctx.arc(px + half, py + half, cs * 0.3, 0, TAU);
          ctx.fill();
          continue;
        }
        const pal = w.pal[r.hue || 'main'] || w.pal.main;
        if (!pal) continue;
        let idx = Math.round(clamp(r.tone == null ? 0.6 : r.tone, 0, 1) * (pal.length - 1));
        let g = r.glyph;
        if (g == null && r.ang != null) g = dirGlyph(base + r.ang);
        if (r.bare) {
          const bareCol = pal[idx];
          if (!bareCol) continue;
          ctx.globalAlpha = alpha * (r.alpha == null ? 1 : r.alpha);
          ctx.fillStyle = bareCol.css;
          ctx.fillText(g || '·', px + half, py + half);
          continue;
        }
        if (shim > 0) {
          // tiles twinkle a shade lighter or darker
          const q = hash(cx, cy, this.frameKey + seedI);
          if (q < shim * 0.22) idx = Math.min(pal.length - 1, idx + 1);
          else if (q > 1 - shim * 0.14) idx = Math.max(0, idx - 1);
        }
        const col = pal[idx];
        if (!col) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = col.css;
        ctx.fillRect(px + 0.5, py + 0.5, cs - 1, cs - 1);
        if (glyphA > 0.02) {
          if (g == null) g = pick(sp.ramp, hash(cx, cy, seedI));
          ctx.globalAlpha = alpha * glyphA;
          ctx.fillStyle = col.light ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)';
          ctx.fillText(g, px + half, py + half);
        }
      }
    }
  }
}
