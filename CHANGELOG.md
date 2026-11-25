# Changelog

Todos los cambios relevantes de SIGER-IA se documentan en este archivo.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
versionado según [Semantic Versioning](https://semver.org/lang/es/).

## [1.1.0] - 2026-11-24

Notas completas en [`docs/release/release-notes-v1.1.0.md`](docs/release/release-notes-v1.1.0.md).

### Añadido
- **Pantalla Usuarios** (JEFE): cambiar contraseñas, activar o desactivar cuentas y ver bloqueos.
  API `GET /api/users` y `PATCH /api/users/{id}`. Pruebas E2E `CP-USR-01` y `CP-USR-02`.
- **Simulacro de caída abrupta** `pnpm test:power-loss`, también en el CI.

### Cambiado
- El bloqueo por intentos fallidos se guarda en la tabla `users` y sobrevive a reinicios.
- SQLite pasa a modo **WAL** (`synchronous` sigue en FULL).

## [1.0.1] - 2026-11-24

### Corregido
- **Bloqueo por intentos fallidos:** el registro de intentos se borraba en cada intento que aún no
  llegaba al límite, así que el bloqueo de 15 minutos tras 3 fallos nunca se activaba. Ahora solo se
  limpia un bloqueo vencido. Nueva prueba E2E `CP-SEC-01` que lo verifica.
- Nombre heredado "Bendistaurante" reemplazado en el correo de comprobantes (valor por defecto
  "Fondo Marino") y en los scripts k6.

### Añadido
- Manual de operaciones y soporte (`docs/operations/manual-operaciones.md`): runbooks, SLA,
  mantenimiento, secretos, licencias e ítems de configuración.

## [1.0.0] - 2026-11-24

Primera versión estable para el piloto del restaurante. Notas completas en
[`docs/release/release-notes-v1.0.0.md`](docs/release/release-notes-v1.0.0.md).

### Añadido
- **Caja con arqueo ciego por turno (US-10):** apertura con fondo inicial, cierre declarando el
  efectivo contado sin ver el esperado, reporte con descuadre (CUADRADO / SOBRANTE / FALTANTE),
  desglose por método de pago e historial. Tabla `cash_sessions`, API `/api/cash-sessions`,
  pantalla `/dashboard/caja` (PR #3).
- **Alertas cromáticas de SLA en pedidos (US-14):** semáforo verde (< 10 min), ámbar (10-18 min)
  y rojo (> 18 min, contorno parpadeante y bip) en `/pedidos` y en *Pedidos por Servir* (PR #2).
- Manual de usuario con capturas reales y FAQ (`docs/user/manual-usuario.md`).
- Umbral de cobertura obligatorio en CI (80 %, ramas 85 %) y pruebas de servicios y validaciones (PR #1).
- Escenarios k6 de carga (50 VU) y estrés (hasta 150 VU) con workflow manual `load.yml` (PR #1).
- Protección de la rama `main`: PR con aprobación, 3 checks obligatorios y conversaciones resueltas.

### Corregido
- Scripts k6: endpoint inexistente `/api/menu/products` y pedidos MESA sin `tableId` (PR #1).
- URL de clonado del repositorio en la guía de despliegue (PR #1).

> Las versiones 0.x se reconstruyeron a partir del historial de commits; no tienen etiqueta en git.

## [0.9.0] - 2026-11-09 — Endurecimiento DevOps, seguridad e IA

### Añadido
- Docker Compose full-stack, respaldos transaccionales de SQLite, simulacro de recuperación ante desastres.
- Bootstrap nativo de Windows, `pnpm setup:all` y diagnóstico previo `pnpm doctor`.
- Cabeceras de seguridad OWASP y script de calidad unificado `pnpm verify`.
- Gestión segura de la clave de Gemini y control del ciclo de vida del motor de IA desde el navegador.

### Corregido
- Condición de carrera en `orderNumber` (transacción atómica y reintento por colisión).
- Cuello de botella de consultas en el dashboard; método de pago en comprobantes; proxy de IA en LAN.
- Runner de CI fijado a ubuntu-24.04 para Playwright; `db:setup` antes de Pytest.

## [0.8.0] - 2026-06-20 — Estabilización y seguridad

### Añadido
- Bloqueo de cuenta tras 3 intentos fallidos de inicio de sesión (15 min).
- Pruebas OWASP, pruebas de servicios y primeros escenarios de carga.
- Apagado ordenado del servidor (SIGTERM/SIGINT).

### Corregido
- Emisión fiscal desacoplada de SUNAT para funcionar sin conexión.
- Paginación de pedidos en el servidor; correlativo fiscal atómico con validación Zod.
- Contención de escritura en SQLite (`connection_limit=1` + `busy_timeout`).
- 7 avisos de seguridad de dependencias.

## [0.5.0] - 2026-05-30 — Facturación y tiempo real

### Añadido
- Envío de comprobantes por correo, validación de DNI/RUC, edición de pedidos.
- Inventario en tiempo real al cambiar el estado de los pedidos (Socket.IO).
- Motor de IA híbrido: FastAPI + pronóstico Prophet + canasta de mercado Apriori + chat con Gemini.

## [0.1.0] - 2026-05-14 — MVP

### Añadido
- Arquitectura por features (Next.js 15 + Prisma + SQLite), roles JEFE y MESERO.
- Pedidos, mesas, menú con recetas, inventario, boletas/facturas e impresión térmica ESC/POS.

[1.1.0]: https://github.com/Walxom/Restaurante/releases/tag/v1.1.0
[1.0.1]: https://github.com/Walxom/Restaurante/releases/tag/v1.0.1
[1.0.0]: https://github.com/Walxom/Restaurante/releases/tag/v1.0.0
