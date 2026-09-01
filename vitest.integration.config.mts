import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Separate from vitest.config.mts on purpose: these tests hit the development
// Supabase project, so they must never run as part of the fast `npm test`.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 20000,
    // Accounts and roles are shared state; parallel files would fight over them.
    fileParallelism: false,
  },
})
