import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.postgres.integration.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    passWithNoTests: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
