import { defineConfig } from 'vitest/config';
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
