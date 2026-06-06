import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración de Playwright para pruebas E2E / de aceptación.
 * Caso de uso principal: autenticación por roles (RBAC) y flujo de venta.
 *
 * Requisitos para ejecutar:
 *   1. Base de datos sembrada:  pnpm db:setup   (crea usuarios jefe/admin123 y mesero/mesero123)
 *   2. Instalar navegadores:    pnpm exec playwright install chromium
 *   3. Ejecutar:                pnpm test:e2e   (levanta el server automáticamente)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Levanta el servidor POS (Socket.IO + Next) y lo reutiliza si ya está corriendo.
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3001/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
