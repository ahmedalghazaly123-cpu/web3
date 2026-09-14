import { defineConfig } from 'vitest/config';

// ─── LearnPilot Vitest Configuration ──────────────────────────────────────────
// Uses esbuild for fast transform (vitest default), with test discovery scoped
// to src/shared/intelligence/__tests__/*.test.ts for deterministic intelligence
// suite validation.
//
// Note: esbuild 0.28.2 does not yet support TS 6.0 type qualifiers on named
// imports. All test files use separate `import type` statements to stay
// transform-compatible.

export default defineConfig({
  test: {
    // TypeScript type checking for test files. Vitest resolves this from the
    // nearest tsconfig.json when omitted; we keep it explicit so that test
    // assertions against shared types are validated at runtime.
    //
    // The shared tsconfig.json already points at tsconfig.app.json which has
    // the right strictness, path aliases, and noEmit settings for our needs.
    tsconfig: './tsconfig.json',

    // Only run intelligence unit tests in this suite.
    include: ['src/shared/intelligence/__tests__/*.test.ts', 'src/shared/services/learningSync.test.ts'],

    // Global test APIs (describe/it/expect) available without explicit imports.
    globals: true,

    // Pure TS intelligence layer — no DOM required.
    environment: 'node',

    // Each test file manages its own in-memory backend lifecycle via
    // beforeEach/afterEach. No shared setup file needed — avoids
    // renderer-process import issues with storeBackend in setupFiles.
    //
    // setupFiles: removed — lifecycle handled per-test-file.

    // Keep output readable while still catching errors fast.
    reporters: ['verbose'],

    // Short but non-trivial timeout for deterministic pipeline tests.
    testTimeout: 10_000,

    // Fail fast on first broken assertion.
    bail: true,
  },
});
