import { registerAnimals } from './animals';
import { Renderer } from './engine/renderer';
import { World } from './engine/world';
import { localStore } from './platform/storage';
import { createLoop } from './ui/loop';
import { defaultsFor } from './ui/tweaks/schema';

declare global {
  interface Window {
    // The one global: a handle for the browser console and the browser tests.
    glyphGarden?: { world: World };
  }
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} is missing from the page`);
  return el as T;
}

const store = localStore();
const page = {
  cell: store.get('cell', 10),
  grid: store.get('grid', true),
  saver: store.get('saver', false),
};

const species = registerAnimals();
const world = new World();
const fx = byId<HTMLCanvasElement>('fx');
const renderer = new Renderer(world, fx, byId<HTMLCanvasElement>('grid'), page.grid);
const fitView = (): void => renderer.resize(innerWidth, innerHeight, page.cell);
fitView();
addEventListener('resize', fitView);

const first = species[0];
if (!first) throw new Error('no animals are registered');
world.use(first, defaultsFor(first));

// ---------- pointer ----------
fx.addEventListener('pointerdown', (e) => world.click(e.clientX / world.cs, e.clientY / world.cs));
let moveAt = 0;
addEventListener('pointermove', (e) => {
  const m = world.mouse,
    x = e.clientX / world.cs,
    y = e.clientY / world.cs,
    now = performance.now();
  // cursor speed in cells per second, for species that startle at a fast cursor
  if (m.inside && now > moveAt)
    m.v = Math.max(m.v, Math.min(120, Math.hypot(x - m.x, y - m.y) / ((now - moveAt) / 1000)));
  m.x = x;
  m.y = y;
  m.inside = true;
  m.idle = 0;
  moveAt = now;
});
document.documentElement.addEventListener('pointerleave', () => {
  world.mouse.inside = false;
});

// ---------- loop ----------
const loop = createLoop({
  frame(dt) {
    world.step(dt);
    renderer.render();
  },
  saver: () => page.saver,
});
loop.start();

window.glyphGarden = { world };
