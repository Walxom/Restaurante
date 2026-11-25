import { test, expect, type Page } from '@playwright/test'

/**
 * Suite E2E de Aceptación — Administración de usuarios (v1.1.0)
 *
 *   - CP-USR-01: JEFE cambia la contraseña de MESERO desde /dashboard/usuarios y
 *                MESERO puede iniciar sesión con ella.
 *   - CP-USR-02: MESERO no puede listar ni modificar usuarios por API (403).
 *
 * CP-USR-01 vuelve a fijar la misma contraseña del seed (mesero123, válida: letras y
 * números) para no afectar a las demás suites que usan esa cuenta.
 */

async function login(page: Page, usuario: string, clave: string, destino: RegExp) {
  await page.goto('/login')
  await page.getByTestId('username-input').fill(usuario)
  await page.getByTestId('password-input').fill(clave)
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL(destino, { timeout: 15_000 })
}

test.describe('Administración de usuarios', () => {
  test('CP-USR-01: JEFE cambia la contraseña de un mesero', async ({ page, browser }) => {
    await login(page, 'jefe', 'admin123', /\/dashboard/)
    await page.goto('/dashboard/usuarios')

    const tarjeta = page.getByTestId('usuario-mesero')
    await expect(tarjeta).toBeVisible({ timeout: 15_000 })
    await tarjeta.getByRole('button', { name: 'Cambiar contraseña' }).click()
    await tarjeta.getByLabel('Contraseña nueva').fill('mesero123')
    await tarjeta.getByLabel('Repetir contraseña').fill('mesero123')

    const respuesta = page.waitForResponse((r) => r.url().includes('/api/users/') && r.request().method() === 'PATCH')
    await tarjeta.getByRole('button', { name: 'Guardar' }).click()
    expect((await respuesta).status()).toBe(200)

    // El mesero entra con la contraseña guardada (sesión independiente)
    const contexto = await browser.newContext()
    await login(await contexto.newPage(), 'mesero', 'mesero123', /\/mesero/)
    await contexto.close()
  })

  test('CP-USR-02: MESERO no puede administrar usuarios (403)', async ({ page }) => {
    await login(page, 'mesero', 'mesero123', /\/mesero/)
    expect((await page.request.get('/api/users')).status()).toBe(403)
    const patch = await page.request.patch('/api/users/cualquiera', { data: { isActive: false } })
    expect(patch.status()).toBe(403)
  })
})
