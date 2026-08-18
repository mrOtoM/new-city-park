import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    // Zatiaľ len čisté kontrakty; komponentové a integračné testy pribudnú
    // vo vlastných blokoch podľa docs/plans/001.
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
