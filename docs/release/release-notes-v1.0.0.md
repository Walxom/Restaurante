# Notas de Versión — SIGER-IA v1.0.0

**Fecha:** 24/11/2026
**Repositorio:** https://github.com/Walxom/Restaurante
**Etiqueta:** `v1.0.0`
**Entorno objetivo:** servidor local en la LAN del restaurante (arquitectura *Local-First*, ADR-01)

---

## 1. Resumen

SIGER-IA v1.0.0 es la primera versión estable del POS para el piloto del restaurante. Cubre el ciclo
completo de atención: toma de pedidos en mesa, para llevar y delivery, comandas impresas en cocina con
alertas de tiempo, cobro con boleta o factura, caja con arqueo ciego por turno, inventario por recetas
y analítica con IA. Opera sin internet; solo la consulta de DNI/RUC, el correo y el chat con IA lo necesitan.

## 2. Novedades de esta versión

| Historia | Funcionalidad | PR |
| :--- | :--- | :--- |
| US-10 (MUST) | Apertura de turno y **arqueo ciego de caja**: esperado = fondo + ventas en efectivo; reporte CUADRADO / SOBRANTE / FALTANTE; historial. | #3 |
| US-14 (SHOULD) | **Alertas cromáticas de SLA**: verde < 10 min, ámbar 10-18 min, rojo > 18 min con contorno parpadeante y bip. | #2 |
| Calidad | Umbral de cobertura obligatorio en CI, 66 pruebas nuevas, k6 corregido y workflow de rendimiento. | #1 |
| Documentación | Manual de usuario con capturas reales y FAQ. | #4 |

Detalle por versión en [`CHANGELOG.md`](../../CHANGELOG.md).

## 3. Funcionalidades incluidas

- **Pedidos:** mesa, para llevar y delivery; edición; estados por ítem; tiempo real con Socket.IO.
- **Cocina:** comandas térmicas ESC/POS (LAN, USB o Bluetooth), reimpresión y semáforo de espera.
- **Cobro:** boleta y factura con correlativo atómico, 5 métodos de pago, vuelto, anulación y envío por correo.
- **Caja:** turnos con fondo inicial y arqueo ciego.
- **Mesas, menú y recetas:** descuento automático de insumos al servir.
- **Inventario:** stock mínimo y alertas.
- **Ventas:** historial, KPIs y gráficos.
- **IA (opcional):** pronóstico de demanda (Prophet), canasta de mercado (Apriori), predicción de inventario y chat (Gemini).
- **Seguridad:** NextAuth con JWT, control de acceso por rol (JEFE/MESERO), bloqueo tras 3 intentos fallidos, cabeceras OWASP.
- **Operación:** `pnpm setup:all`, `pnpm doctor`, respaldos `pnpm db:backup` y Docker Compose.

## 4. Evidencia de calidad

| Indicador | Valor | Criterio | Fuente |
| :--- | :--- | :--- | :--- |
| Pruebas unitarias (Vitest) | 210 aprobadas | 100 % en verde | `pnpm test` |
| Cobertura de líneas | 97.18 % | ≥ 80 % | `pnpm test:coverage` |
| Cobertura de ramas | 89.33 % | ≥ 85 % | `vitest.config.ts` |
| Pruebas E2E (Playwright) | 8 (RBAC, accesibilidad, caja) | 100 % en verde | `pnpm test:e2e` |
| Pruebas del motor de IA (Pytest) | 17 | 100 % en verde | `pnpm ai:test` |
| Carga k6 (50 VU, 1 min) | p95 41 ms, 0 % errores | p95 < 2000 ms, errores < 5 % | Run 45458092230 |
| Estrés k6 (hasta 150 VU) | p95 201 ms, 0 % errores | p95 < 5000 ms, errores < 15 % | Run 45458092230 |
| Integración continua | Lint + unitarias, E2E y build | 3/3 obligatorios en `main` | `.github/workflows/ci.yml` |

## 5. Instalación y actualización

- **Instalación nueva:** [Guía de inicio rápido](../installation/quickstart.md) o
  [Guía de despliegue](../installation/deployment-guide.md).
- **Actualizar desde una versión anterior:**
  ```bash
  pnpm db:backup          # 1. respaldo previo
  git fetch --tags && git checkout v1.0.0
  pnpm install
  pnpm db:push            # 2. crea la tabla nueva cash_sessions (no borra datos)
  pnpm db:generate
  pnpm build && pnpm start
  ```
- **Uso diario:** [Manual de usuario](../user/manual-usuario.md).

### 5.1 Plan de reversión (*rollback*)

Si tras actualizar algo falla en el restaurante, se vuelve a la versión anterior en unos 5 minutos
y sin perder la operación del día anterior:

1. Detener el servidor (`Ctrl+C` o `pm2 stop all`).
2. Volver al código previo: `git checkout ef9af80` (último `main` antes de v1.0.0).
3. Restaurar la base de datos con el respaldo del paso 1 de la actualización:
   copiar `backups/dev_backup_<fecha>.db` sobre `prisma/dev.db`.
4. `pnpm install && pnpm db:generate && pnpm build && pnpm start`.
5. Comprobar con `pnpm doctor` y un inicio de sesión de prueba.

**Criterio para revertir:** el inicio de sesión, la toma de pedidos o el cobro fallan y no se
resuelven en 15 minutos. Las ventas registradas después de la actualización se pierden al restaurar;
por eso se actualiza fuera del horario de atención. El respaldo y la restauración se prueban con
`pnpm test:backup` (simulacro con `PRAGMA integrity_check`).

## 6. Problemas conocidos y limitaciones

| # | Descripción | Mitigación |
| :--- | :--- | :--- |
| L-01 | No existe rol COCINA: la cocina trabaja con comandas impresas y la vista *Pedidos por Servir*. | Usar una tablet con sesión JEFE o MESERO en cocina. |
| L-02 | El bip de SLA puede quedar bloqueado por la política de autoplay del navegador. | Hacer clic una vez en la página; la alerta visual siempre funciona. |
| L-03 | La caja admite un solo turno abierto a la vez y su gestión es exclusiva del rol JEFE. | Suficiente para el piloto (una caja). |
| L-04 | La emisión electrónica ante SUNAT no está integrada; los comprobantes se emiten localmente. | Ver backlog residual (sección 7). |
| L-05 | El chat con IA usa Gemini (servicio en la nube) y necesita internet y clave propia. | El POS funciona sin IA. |
| L-06 | 263 advertencias de ESLint heredadas (0 errores). | Limpieza progresiva; no bloquean el build. |

## 7. Backlog residual

Historias del Product Backlog (Semana 8) que **no** se incluyen en v1.0.0. Se priorizó cerrar el
flujo de caja (US-10, MUST) y las alertas de cocina (US-14) dentro del tiempo del curso.

| Historia | Prioridad | SP | Motivo de postergación | Propuesta |
| :--- | :--- | :--- | :--- | :--- |
| US-12 División de cuenta (*split bill*) | SHOULD | 5 | Requiere varios comprobantes por pedido; hoy la relación pedido-comprobante es 1:1. Cambiarla toca facturación, correlativos y reportes de ventas. | v1.1: modelo de subcuentas y N precuentas cuadradas al céntimo. |
| US-26 Detección de mermas / matriz ABC | COULD | 5 | Necesita historial de inventario (kardex de movimientos) que el modelo actual no registra. | v1.2: tabla de movimientos de inventario y luego clasificación ABC. |
| US-16 Emisión electrónica SUNAT | SHOULD | — | Requiere un OSE/PSE y certificado digital del contribuyente. | Integración con OSE cuando el restaurante lo contrate. |

## 8. Equipo y trazabilidad

- Proyecto del curso *Administración de Proyectos de Software* — UPN, ciclo 2026-II, Equipo 3.
- Cada cambio entra por rama `feature/*` → Pull Request → CI 3/3 → aprobación → merge a `main` protegida.
