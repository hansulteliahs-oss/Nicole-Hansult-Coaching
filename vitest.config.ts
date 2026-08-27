import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'],
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
    // The live-DB suites in tests/db/ are order-dependent by design: later
    // tests reuse fixtures created by earlier ones so the suite writes as
    // little as possible to production tables. These are already vitest's
    // defaults — stated explicitly so flipping them is a deliberate act.
    sequence: { shuffle: false, concurrent: false },
  },
});
