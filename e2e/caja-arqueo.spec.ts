import { test, expect, type Page } from '@playwright/test'

/**
 * Suite E2E de Aceptación — US-10 Apertura y arqueo ciego de caja
 *
 *   - CP-CAJA-01: JEFE abre caja, el turno abierto NO muestra el monto esperado
 *                 (arqueo ciego), declara el efectivo contado y obtiene el reporte.
 *   - CP-CAJA-02: MESERO no puede consultar la caja por API (403).
 *
 * Credenciales del seed (prisma/seed.ts): jefe/admin123 (JEFE) · mesero/mesero123 (MESERO)
 */

async function login(page: Page, usuario: string, clave: string, destino: RegExp) {
  await page.goto('/login')
  await page.getByTestId('username-input').fill(usuario)
  await page.getByTestId('password-input').fill(clave)
  await page.getByTestId('login-button').click()
  await expect(page).toHaveURL(destino, { timeout: 15_000 })
}

test.describe('US-10 — Caja y arqueo ciego', () => {
  test('CP-CAJA-01: JEFE abre caja, declara efectivo y obtiene el reporte de arqueo', async ({ page }) => {
    await login(page, 'jefe', 'admin123', /\/dashboard/)

    // Si quedó un turno abierto de una ejecución previa, se cierra para partir de cero.
    const previo = await page.request.get('/api/cash-sessions')
    if ((await previo.json()).current) {
      await page.request.post('/api/cash-sessions/close', { data: { declaredAmount: 0 } })
    }

    await page.goto('/dashboard/caja')
    await expect(page.getByTestId('caja-cerrada')).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Fondo inicial (S/)').fill('100')
    await page.getByRole('button', { name: 'Abrir caja' }).click()

    const turno = page.getByTestId('turno-abierto')
    await expect(turno).toBeVisible()
    // Arqueo ciego: mientras el turno está abierto no se muestra lo esperado
    await expect(page.getByText('Esperado en caja')).toHaveCount(0)

    await page.getByLabel('Efectivo contado (S/)').fill('100')
    await page.getByRole('button', { name: 'Cerrar turno y generar arqueo' }).click()

    const reporte = page.getByTestId('reporte-arqueo')
    await expect(reporte).toBeVisible()
    await expect(reporte.getByText('Esperado en caja')).toBeVisible()
    await expect(reporte.getByText(/CUADRADO|SOBRANTE|FALTANTE/).first()).toBeVisible()
    await expect(page.getByTestId('caja-cerrada')).toBeVisible()
  })

  test('CP-CAJA-02: MESERO no puede consultar la caja (403)', async ({ page }) => {
    await login(page, 'mesero', 'mesero123', /\/mesero/)
    const res = await page.request.get('/api/cash-sessions')
    expect(res.status()).toBe(403)
  })
})
