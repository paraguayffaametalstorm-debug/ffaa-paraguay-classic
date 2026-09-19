/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Configuración de Vitest — F4.2.2-C
 * ============================================================================
 * Framework: Vitest (ESM nativo, sin transpilación).
 * Entorno: node (backend, sin DOM).
 * Cobertura: v8 (rápido, integrado con Vite).
 *
 * Convenciones:
 *   - Tests viven en tests/**\/*.test.js
 *   - Fixtures en tests/fixtures/
 *   - Mocks en tests/mocks/
 *
 * Uso:
 *   npm test              → corre toda la suite una vez
 *   npm run test:watch    → modo watch
 *   npm run test:bm       → solo tests BM (F4.2.2)
 *
 * Versión: v1.0
 * Fecha: 2026-09-19
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules/**', 'sql/**', 'components/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
      exclude: [
        'src/**/*.test.js',
        'src/db/supabase.js',
        'src/config/env.js',
        'src/utils/email.js',
        'src/scripts/**'
      ],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50
      }
    },
    testTimeout: 10000,
    reporter: 'verbose',
    passWithNoTests: true
  }
});