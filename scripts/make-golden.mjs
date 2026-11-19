// Records the prototype's behaviour as golden fixtures. Run once (Task 5); the fixtures are never regenerated.
// Needs the prototype in .local/reference/, which is not in the repo, so this never runs in CI.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import vm from 'node:vm';
import prettier from 'prettier';
import {
  BASE_TWEAKS,
  CLICK,
  CLICK_BEFORE_STEP,
  DT,
  FOOD_RANGE_DEFAULT,
  GRID,
  POSES,
  POSE_1_OVERRIDES,
  RECORD_STEPS,
  SAMPLE_SEED,
  STEPS,
  TRAJECTORY_SEED,
  VIEW,
  baseAnimal,
  fixed,
  mulberry32,
  serialise,
} from '../tests/golden/protocol.ts';

const root = path.resolve(import.meta.dirname, '..');
const refDir = path.join(root, '.local', 'reference');
const outDir = path.join(root, 'tests', 'golden', 'fixtures');

if (!fs.existsSync(path.join(refDir, 'engine.js'))) {
  process.stderr.write(`make-golden: prototype not found at ${path.join(refDir, 'engine.js')}\n`);
  process.exit(1);
}

const noop = () => {};
// A canvas whose 2D context accepts every call and assignment: the fixtures never render.
const ctx2d = new Proxy({}, { get: () => noop, set: () => true });
const canvas = () => ({ getContext: () => ctx2d, style: {} });

// The prototype expects browser globals. Math is shared with the host on purpose, so assigning Math.random
// here also seeds the prototype.
function loadPrototype(dir, view) {
  const sandbox = {
    Math,
    console: globalThis.console,
    innerWidth: view.cols * view.cell,
    innerHeight: view.rows * view.cell,
    devicePixelRatio: 1,
    addEventListener: noop,
  };
  sandbox.window = sandbox; // the prototype writes window.GlyphGarden
  vm.createContext(sandbox);
  for (const f of ['engine.js', 'animals.js']) {
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), sandbox, { filename: f });
  }
  return sandbox.GlyphGarden;
}

const G = loadPrototype(refDir, VIEW);
const newWorld = () => new G.World(canvas(), canvas(), { cell: VIEW.cell, grid: false });
const tweaksFor = (sp) =>
  Object.assign({}, BASE_TWEAKS, sp.eats ? { foodRange: FOOD_RANGE_DEFAULT } : {}, sp.tweaks);

const realRandom = Math.random;
const tweakDefaults = {};
const samples = {};
const trajectories = {};
const counts = [];

try {
  for (const sp of G.species) {
    tweakDefaults[sp.id] = tweaksFor(sp);

    samples[sp.id] = POSES.map((pose, poseIndex) => {
      const world = newWorld();
      world.use(sp, tweaksFor(sp));
      Math.random = mulberry32(SAMPLE_SEED);
      const a = baseAnimal(sp, pose);
      sp.init?.(a, world);
      if (poseIndex === 1) for (const k in POSE_1_OVERRIDES) if (k in a) a[k] = POSE_1_OVERRIDES[k];
      const lines = [];
      let filled = 0;
      for (let x = GRID.x0; x <= GRID.x1; x += GRID.step) {
        for (let y = GRID.y0; y <= GRID.y1; y += GRID.step) {
          const line = serialise(sp.sample(x, y, a, world));
          if (line) filled++;
          lines.push(line);
        }
      }
      counts.push(`${sp.id}#${poseIndex}: ${filled}/${lines.length} cells`);
      Math.random = realRandom;
      return createHash('sha256').update(lines.join('\n')).digest('hex');
    });

    Math.random = mulberry32(TRAJECTORY_SEED);
    const world = newWorld();
    world.use(sp, tweaksFor(sp));
    const recorded = {};
    for (let step = 1; step <= STEPS; step++) {
      if (step === CLICK_BEFORE_STEP) world.click(CLICK.x, CLICK.y);
      world.step(DT);
      if (RECORD_STEPS.includes(step))
        recorded[step] = world.animals.map((a) => [fixed(a.x), fixed(a.y), fixed(a.h)]);
    }
    Math.random = realRandom;
    trajectories[sp.id] = recorded;
  }
} finally {
  Math.random = realRandom;
}

const prettierConfig = await prettier.resolveConfig(path.join(outDir, 'x.json'));
fs.mkdirSync(outDir, { recursive: true });
for (const [name, data] of [
  ['tweak-defaults.json', tweakDefaults],
  ['samples.json', samples],
  ['trajectories.json', trajectories],
]) {
  const file = path.join(outDir, name);
  // Written already formatted, so the fixtures pass the repo's format check unchanged.
  fs.writeFileSync(file, await prettier.format(JSON.stringify(data), { ...prettierConfig, filepath: file }));
}

process.stdout.write(`${counts.join('\n')}\nspecies: ${G.species.map((s) => s.id).join(', ')}\n`);
