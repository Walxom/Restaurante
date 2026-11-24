# Notas de Versión — SIGER-IA v1.1.0

**Fecha:** 24/11/2026
**Repositorio:** https://github.com/Walxom/Restaurante
**Etiqueta:** `v1.1.0` · versión anterior: [`v1.0.1`](https://github.com/Walxom/Restaurante/releases/tag/v1.0.1)

## 1. Resumen

Versión menor centrada en **seguridad de las cuentas y protección de los datos**. Cierra tres brechas
encontradas al comparar los entregables del curso con el sistema real: contraseñas iniciales que no
se podían cambiar, bloqueo de cuenta que se perdía al reiniciar y base de datos sin modo WAL ni
prueba de caída.

## 2. Novedades

| Cambio | Detalle |
| :--- | :--- |
| **Pantalla Usuarios** (JEFE) | Dashboard → Usuarios: cambiar la contraseña de cualquier cuenta (8–72 caracteres, letras y números), activar o desactivar cuentas y ver cuáles están bloqueadas. Cambiar la contraseña levanta el bloqueo. El JEFE no puede desactivar su propia cuenta. API `GET /api/users` y `PATCH /api/users/{id}`. |
| **Bloqueo persistente** | Los intentos fallidos de cuentas existentes se guardan en la tabla `users` (`failedLoginAttempts`, `firstFailedLoginAt`, `lockedUntil`): el bloqueo de 15 min tras 3 fallos ya no se pierde al reiniciar el servidor. |
| **SQLite en modo WAL** | Las lecturas (dashboard, motor de IA) ya no bloquean las escrituras de pedidos y cobros. `synchronous` se mantiene en FULL para no perder ventas confirmadas. Se verificó que el motor de IA sigue leyendo en solo lectura. |
| **Simulacro de caída** | `pnpm test:power-loss` (también en el CI): mata el proceso 5 veces en plena escritura y comprueba que la base queda íntegra, sin ventas confirmadas perdidas ni transacciones a medias. |

## 3. Evidencia de calidad

| Indicador | v1.0.1 | v1.1.0 |
| :--- | :--- | :--- |
| Pruebas unitarias (Vitest) | 210 | **233** |
| Cobertura de líneas / ramas | 97.18 % / 89.33 % | **97.46 % / 90.52 %** |
| Pruebas E2E (Playwright) | 9 | **11** (CP-USR-01, CP-USR-02) |
| Pytest (motor de IA) | 17 | 17 |
| Simulacro de caída abrupta | — | **5/5 caídas sin corrupción ni pérdida** |

## 4. Actualizar desde v1.0.x

```bash
pnpm db:backup                       # 1. respaldo previo
git fetch --tags && git checkout v1.1.0
pnpm install
pnpm db:push                         # 2. agrega 3 columnas a users (no borra datos)
pnpm db:generate
pnpm build && pnpm start
```

Al arrancar, el servidor pasa la base a modo WAL automáticamente (aparecen `dev.db-wal` y
`dev.db-shm` junto a `dev.db`; son normales). **Después de actualizar, cambie las contraseñas
iniciales en Dashboard → Usuarios.**

**Rollback:** igual que en v1.0.0 (§5.1 de sus notas), con `git checkout v1.0.1`. Las columnas nuevas
no molestan a la versión anterior.

## 5. Limitaciones que siguen

L-01 (sin rol COCINA), L-02 (autoplay del bip), L-04 (sin SUNAT), L-05 (chat con Gemini) y L-06
(advertencias de ESLint) de las [notas de v1.0.0](release-notes-v1.0.0.md) siguen vigentes.
L-03 sin cambios. Backlog residual: US-12, US-26 y US-16.
