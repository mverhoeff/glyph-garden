import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Extension pages are served from a non-root origin, so asset URLs must be relative.
  base: './',
  build: {
    outDir: 'dist/web',
    target: 'es2022',
  },
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/golden/**/*.test.ts'],
  },
});
