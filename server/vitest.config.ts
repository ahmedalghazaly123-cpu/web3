import { defineConfig } from 'vitest/config';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // These are integration tests: they hit a live server (localhost:4000) and a
    // real PostgreSQL instance, so the 5s default is too tight when the machine
    // is busy (e.g. tsc/vitest for the frontend running in parallel).
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
