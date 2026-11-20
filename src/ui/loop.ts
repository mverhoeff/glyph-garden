// The frame loop. With the battery saver on it draws about 30 times a second and stops drawing after a minute
// without input; the next pointer, key or wheel input wakes it.

const IDLE_MS = 60000; // battery saver: pause after this long without input
const SAVER_FRAME_MS = 30; // battery saver: at most one frame per this many milliseconds
const MAX_DT = 0.05; // longer gaps (a background tab, a pause) are simulated as one short step

export interface LoopOptions {
  frame(dt: number): void; // advance and draw one frame of dt seconds
  saver(): boolean; // read every frame, so turning the battery saver on or off applies at once
  onPause?(paused: boolean): void; // the loop paused (true) or woke up (false)
}

export interface Loop {
  start(): void;
  wake(): void; // count as input: restarts a paused loop
  isPaused(): boolean;
}

export function createLoop(opts: LoopOptions): Loop {
  let last = 0,
    lastInput = 0,
    paused = false;

  function frame(now: number): void {
    if (opts.saver()) {
      if (now - lastInput > IDLE_MS) {
        // stop drawing until the next input
        paused = true;
        opts.onPause?.(true);
        return;
      }
      if (now - last < SAVER_FRAME_MS) {
        requestAnimationFrame(frame);
        return;
      }
    }
    const dt = Math.min(MAX_DT, (now - last) / 1000);
    last = now;
    opts.frame(dt);
    requestAnimationFrame(frame);
  }

  function wake(): void {
    lastInput = performance.now();
    if (paused) {
      paused = false;
      last = lastInput;
      opts.onPause?.(false);
      requestAnimationFrame(frame);
    }
  }

  return {
    start() {
      last = lastInput = performance.now();
      for (const ev of ['pointermove', 'pointerdown', 'keydown', 'wheel'])
        addEventListener(ev, wake, { passive: true });
      requestAnimationFrame(frame);
    },
    wake,
    isPaused: () => paused,
  };
}
