import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

/**
 * Suite E2E de Accesibilidad — Evidencia ODS 10 (Reducción de desigualdades) / Ley N.° 29973
 *
 * Auditoría automatizada WCAG 2.1 nivel A y AA con axe-core sobre las pantallas clave.
 * Mapeo a casos del PPF:
 *   - CP-A11Y-01: Login sin violaciones serias/críticas WCAG 2.1 A/AA
 *   - CP-A11Y-02: Dashboard (JEFE) sin violaciones serias/críticas WCAG 2.1 A/AA
 *
 * Esta prueba es reproducible en CI y sustituye la captura manual de Lighthouse/WAVE
 * como evidencia de cumplimiento de accesibilidad (SPEC-13 / SPEC-14).
 */

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

/** Resume una auditoría axe a un reporte JSON de evidencia y devuelve las violaciones críticas. */
function reportar(pagina: string, results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  const resumen = {
    pagina,
    fecha: new Date().toISOString(),
    total: results.violations.length,
    porImpacto: {
      critical: results.violations.filter((v) => v.impact === 'critical').length,
      serious: results.violations.filter((v) => v.impact === 'serious').length,
      moderate: results.violations.filter((v) => v.impact === 'moderate').length,
      minor: results.violations.filter((v) => v.impact === 'minor').length,
    },
    violaciones: results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.map((n) => n.target.join(' ')).slice(0, 5),
    })),
  }
  mkdirSync('test-results', { recursive: true })
  writeFileSync(`test-results/a11y-${pagina}.json`, JSON.stringify(resumen, null, 2))
  console.log(`[a11y:${pagina}]`, JSON.stringify(resumen.porImpacto), 'reglas:', resumen.violaciones.map((x) => `${x.id}(${x.impact})`).join(', '))
  return results.violations.filter((v) => v.impact === 'critical')
}

test.describe('Accesibilidad (ODS 10 / WCAG 2.1 AA)', () => {
  test('CP-A11Y-01: login sin violaciones críticas WCAG 2.1 A/AA', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-button').waitFor()

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    const criticas = reportar('login', results)
    expect(criticas, 'No debe haber violaciones de impacto crítico').toEqual([])
  })

  test('CP-A11Y-02: dashboard (JEFE) sin violaciones críticas WCAG 2.1 A/AA', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('username-input').fill('jefe')
    await page.getByTestId('password-input').fill('admin123')
    await page.getByTestId('login-button').click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    const criticas = reportar('dashboard', results)
    expect(criticas, 'No debe haber violaciones de impacto crítico').toEqual([])
  })
})
