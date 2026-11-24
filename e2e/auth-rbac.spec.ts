import { test, expect } from '@playwright/test'

/**
 * Suite E2E de Aceptación — Autenticación y Control de Acceso por Roles (RBAC)
 *
 * Mapeo a casos de prueba del PPF (Plan de Pruebas Funcionales):
 *   - CP-AUTH-01: Login JEFE → redirige a /dashboard
 *   - CP-AUTH-02: Login MESERO → redirige a /mesero
 *   - CP-AUTH-03: Credenciales inválidas → mensaje de error, sin redirección
 *   - CP-RBAC-01: MESERO no puede acceder a rutas exclusivas de JEFE (/dashboard)
 *   - CP-SEC-01:  Bloqueo por fuerza bruta tras 3 intentos fallidos
 *
 * Credenciales del seed (prisma/seed.ts): jefe/admin123 (JEFE) · mesero/mesero123 (MESERO)
 */

test.describe('Autenticación y RBAC', () => {
  test('CP-AUTH-01: JEFE inicia sesión y llega al dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('username-input').fill('jefe')
    await page.getByTestId('password-input').fill('admin123')
    await page.getByTestId('login-button').click()

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })

  test('CP-AUTH-02: MESERO inicia sesión y llega a su panel', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('username-input').fill('mesero')
    await page.getByTestId('password-input').fill('mesero123')
    await page.getByTestId('login-button').click()

    await expect(page).toHaveURL(/\/mesero/, { timeout: 15_000 })
  })

  test('CP-AUTH-03: credenciales inválidas muestran error y no redirigen', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('username-input').fill('jefe')
    await page.getByTestId('password-input').fill('contrasena-incorrecta')
    await page.getByTestId('login-button').click()

    await expect(page.getByTestId('error-message')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('CP-RBAC-01: MESERO no puede acceder al dashboard de JEFE', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('username-input').fill('mesero')
    await page.getByTestId('password-input').fill('mesero123')
    await page.getByTestId('login-button').click()
    await expect(page).toHaveURL(/\/mesero/, { timeout: 15_000 })

    // Intento de acceso directo a ruta exclusiva de JEFE
    await page.goto('/dashboard')
    // El middleware debe expulsarlo (no permanece en /dashboard)
    await expect(page).not.toHaveURL(/\/dashboard$/, { timeout: 15_000 })
  })

  test('CP-SEC-01: bloqueo temporal tras 3 intentos fallidos', async ({ page }) => {
    // Usuario exclusivo de esta prueba: el bloqueo es por nombre de usuario y no
    // debe afectar a las cuentas del seed que usan los demás casos.
    const usuario = `bloqueo-e2e-${Date.now()}`

    await page.goto('/login')
    const intentar = async () => {
      await page.getByTestId('username-input').fill(usuario)
      await page.getByTestId('password-input').fill('contrasena-incorrecta')
      const respuesta = page.waitForResponse((r) => r.url().includes('/api/auth/callback/credentials'))
      await page.getByTestId('login-button').click()
      await respuesta
      await expect(page.getByTestId('error-message')).toBeVisible()
    }

    for (let i = 0; i < 3; i++) {
      await intentar()
      await expect(page.getByTestId('error-message')).not.toContainText(/bloqueada/i)
    }

    // Cuarto intento: la cuenta ya está bloqueada aunque la contraseña sea irrelevante
    await intentar()
    await expect(page.getByTestId('error-message')).toContainText(/bloqueada/i)
    await expect(page).toHaveURL(/\/login/)
  })
})
