# Semana 11 — Capstone Project & Calidad y Pruebas
## Bendistaurante POS · Sistema de Gestión para Cevichería
**Fecha:** 06 de junio de 2026 | **Estudiante:** [Nombre] | **Curso:** Capstone Project Sistemas / Calidad y Pruebas

---

## Agenda de la sesión

| # | Bloque | Tiempo |
|:---:|:---|:---:|
| 1 | Estado general del proyecto (funcionalidad 100%) | 3 min |
| 2 | **Seguimiento al Plan de Seguridad Integral** ← foco principal semana 11 | 8 min |
| 3 | Demo en vivo del software | 10 min |
| 4 | Inspección formal de código (Sem 11 Calidad) | 4 min |
| 5 | Suite de pruebas automatizadas — 93 tests en verde | 3 min |
| 6 | Toma de datos / métricas de calidad | 2 min |
| 7 | Pendientes semana 12 | 2 min |

---

## 1. Estado general — Funcionalidad al 100%

El producto está completo y operativo. Todos los módulos del alcance están implementados, probados y con build de producción exitoso.

| Módulo | Estado | Ruta en el sistema |
|:---|:---:|:---|
| Autenticación (login por roles) | ✅ | `/login` |
| Gestión de mesas | ✅ | `/mesas` |
| Toma de pedidos (mesero) | ✅ | `/mesero` → `/pedidos/nuevo` |
| Seguimiento de pedidos | ✅ | `/pedidos` |
| Gestión de menú y productos | ✅ | `/menu` |
| Facturación (boleta / factura) | ✅ | `/dashboard/facturacion` |
| Inventario de insumos | ✅ | `/dashboard/inventario` |
| Dashboard analítico | ✅ | `/dashboard` |
| Inteligencia Artificial (predicciones, market basket) | ✅ | `/dashboard/inteligencia` |
| Impresión térmica ESC/POS | ✅ | `/impresion` |
| Configuración del sistema | ✅ | `/dashboard/configuracion` |

**Build de producción:** `pnpm run build` → compilación exitosa, 62 páginas/rutas generadas, 0 errores TypeScript.

---

## 2. Seguimiento al Plan de Seguridad Integral

> **Actividad principal de la Semana 11 según el sílabo.** Se actualizó y verificó el cumplimiento de todos los controles del plan contra el código real.

### 2.1 Documentos entregados

| Documento | Ruta | Descripción |
|:---|:---|:---|
| Plan de Seguridad Integral (entregable académico) | `PLAN DE SEGURIDAD INTEGRAL DEL PRODUCTO SOFTWARE.md` | 15 secciones completas: objetivos, riesgos, medidas, pruebas, incidentes, formación, mantenimiento, cumplimiento normativo, responsabilidades, plan de acción y referencias APA 7 |
| Plan de Seguridad Técnico (arquitectura) | `docs/gestion/plan_seguridad_integral.md` | Descripción detallada de la arquitectura de seguridad: capa de datos, capa de aplicación y capa de red LAN |
| Informe OWASP Top 10 | `docs/calidad y pruebas de software/informe_owasp.md` | Evaluación completa contra los 10 riesgos del estándar con evidencia de pruebas |

### 2.2 Controles de seguridad implementados y verificados

| Control | Implementación real en el código | Verificado |
|:---|:---|:---:|
| Autenticación JWT (NextAuth v4) | `src/lib/auth.ts` + `NEXTAUTH_SECRET` en `.env` | ✅ |
| Hash bcryptjs **12 rondas** | `bcrypt.compare()` en Credentials provider | ✅ |
| Control de acceso por roles RBAC | `src/middleware.ts` + `src/lib/auth-utils.ts` → `validateRole()` | ✅ |
| **Protección contra fuerza bruta** (nuevo esta semana) | `src/lib/auth.ts` — bloqueo al 3er intento, 15 min | ✅ |
| Prevención SQL Injection | Prisma ORM — queries parametrizadas, sin `$queryRawUnsafe` | ✅ |
| Validación de entradas | Schemas Zod en `src/features/*/validations/` | ✅ |
| CORS LAN restrictivo | `server.js` — solo IPs privadas RFC-1918 y localhost | ✅ |
| SQLite WAL Mode | `src/lib/prisma.ts` — `PRAGMA journal_mode=WAL` | ✅ |
| Transacciones ACID | `prisma.$transaction` en emisión de comprobantes e inventario | ✅ |
| Variables de entorno sin versionar | `.gitignore` incluye `.env` | ✅ |

### 2.3 Evaluación OWASP Top 10 (2021) — resumen

| Riesgo | Estado |
|:---|:---:|
| A01 Broken Access Control | ✅ Mitigado |
| A02 Cryptographic Failures | ✅ Mitigado |
| A03 Injection | ✅ Mitigado |
| A04 Insecure Design | ✅ Mitigado |
| A05 Security Misconfiguration | ✅ Mitigado |
| A06 Vulnerable Components | 🟡 Parcial (`pnpm audit` + overrides) |
| A07 Auth & Session Failures | ✅ Mitigado |
| A08 Software & Data Integrity | N/A (sistema local, sin pipeline remoto) |
| A09 Security Logging & Monitoring | 🟡 Parcial (aceptado por alcance LAN) |
| A10 Server-Side Request Forgery | N/A (sin peticiones salientes a URLs de usuario) |

**0 riesgos críticos sin mitigar.**

### 2.4 Corrección realizada esta semana
Se identificó que el Plan de Seguridad Técnico describía un control de fuerza bruta que **no existía en el código**. Se implementó en `src/lib/auth.ts`:

```
3 intentos fallidos → cuenta bloqueada 15 minutos
Login exitoso → contador se limpia automáticamente
```

El plan es ahora 100% veraz y verificable abriendo el archivo.

---

## 3. Demo en vivo del software

### Secuencia de demostración recomendada

**Paso 1 — Iniciar el sistema:**
```bash
pnpm dev          # servidor Next.js en :3001
pnpm ai:start     # motor IA en :8000 (opcional para demo de inteligencia)
```

**Paso 2 — Flujo de roles (mostrar RBAC en acción):**
1. Entrar a `http://localhost:3001/login`
2. Login como **MESERO** → redirige a `/mesero`
3. Intentar ir a `/dashboard` → redirige de vuelta (middleware bloqueando)
4. Cerrar sesión → login como **JEFE** → accede a `/dashboard`

**Paso 3 — Flujo completo de una venta:**
1. `/mesas` → seleccionar mesa disponible
2. `/pedidos/nuevo` → agregar productos al pedido → confirmar comanda
3. `/pedidos` → ver pedido en cola, marcar ítems como servidos
4. `/dashboard/facturacion/nueva` → emitir boleta con cálculo de IGV automático
5. Verificar que el correlativo de boleta incrementa atómicamente

**Paso 4 — Dashboard de inteligencia artificial:**
1. Ir a `/dashboard/inteligencia`
2. Mostrar **predicción de demanda** para los próximos 7 días (83 productos)
3. Mostrar **reglas de asociación market basket** (246 reglas generadas)
4. Mostrar **alertas de inventario**

**Paso 5 — Seguridad en acción (opcional, impactante):**
1. Abrir DevTools → Application → Cookies: mostrar cookie `HttpOnly` (no accesible por JS)
2. Intentar 3 logins con contraseña incorrecta → el 4to intento devuelve error aunque la contraseña sea correcta (bloqueo de 15 min activo)

---

## 4. Inspección Formal de Código — Semana 11 Calidad

Documento: `docs/refactoring/inspeccion_formal.md`

Metodología aplicada: **Fagan Inspection adaptada** sobre la capa de servicios (`src/services/`) y controles de seguridad.

### Resultados del proceso de inspección

| Severidad | Cantidad | Decisión |
|:---|:---:|:---|
| 🔴 Crítico | **0** | — |
| 🟡 Menor | 2 | H-01 aceptado por diseño; H-02 en backlog |
| 🔵 Informativo | 2 | H-03 y H-04 documentados; resolución post-T3 |
| ✅ Positivo | 1 | H-05: patrón atómico de correlativos fiscales |

**Veredicto de inspección:** el software pasa la revisión formal sin hallazgos críticos. Los dos hallazgos menores tienen justificación técnica documentada.

### Checklist de inspección — resultados

| Criterio | Resultado |
|:---|:---:|
| Todas las entradas validadas antes de BD | ✅ |
| Operaciones críticas dentro de `$transaction` | ✅ |
| Campos Decimal convertidos con `Number()` antes de aritmética | ✅ |
| Sin concatenación de strings en queries SQL | ✅ |
| Sin credenciales hardcodeadas en el código | ✅ |
| Imports de servicios solo desde API routes | ✅ |
| Funciones con responsabilidad única (SRP) | ✅ |

---

## 5. Suite de Pruebas Automatizadas — 93 tests en verde

Ejecutar en vivo: `pnpm test`

```
Test Files  10 passed (10)
     Tests  93 passed (93)
  Duration  3.47s
```

### Distribución de pruebas por tipo y módulo

| Archivo de prueba | Tests | Tipo | Cubre |
|:---|:---:|:---|:---|
| `security.owasp.test.ts` | 19 | Seguridad | A01, A02, A03, A05, A07 OWASP |
| `billing.test.ts` | 22 | Unitaria | Cálculo IGV, pago, cambio, totales |
| `billing.adapter.test.ts` | 8 | Unitaria | Adaptadores de formato de impresión |
| `invoice.service.test.ts` | 10 | Integración | Creación de facturas, cancelación |
| `order.service.test.ts` | 12 | Integración | CRUD pedidos, estados, cancelación |
| `ingredient.service.test.ts` | 9 | Integración | Stock, alertas, soft-delete |
| `product.service.test.ts` | 7 | Integración | CRUD productos, reactivación |
| `order.test.ts` | 2 | Validación | Schema Zod de pedidos |
| `system-config.test.ts` | 2 | Validación | Schema Zod de configuración |
| `printer-config.test.ts` | 2 | Validación | Schema Zod de impresoras |

### Métricas de calidad del código (ISO/IEC 25010)

| Métrica | Valor | Umbral | Estado |
|:---|:---:|:---:|:---:|
| Complejidad Ciclomática promedio V(G) | **3.7** | ≤ 10 | ✅ Excelente |
| Cobertura de caminos en funciones críticas | **~90%** | ≥ 70% | ✅ |
| Ratio test/producción (billing) | **2.7:1** | ≥ 1:1 | ✅ |
| Hallazgos críticos en inspección formal | **0** | 0 | ✅ |
| Vulnerabilidades OWASP críticas sin mitigar | **0** | 0 | ✅ |

---

## 6. Toma de datos

Los datos de rendimiento operativo se obtienen del sistema en funcionamiento con datos sintéticos generados (`pnpm run ai:generate` → 2,589 órdenes, 90 días de historia):

| Indicador medido | Valor |
|:---|:---|
| Órdenes en la base de datos (datos sintéticos) | 2,589 |
| Ítems de pedido registrados | 9,067 |
| Facturas emitidas | ~1,300 |
| Productos activos en el menú | 83 |
| Modelos de predicción entrenados | 83 productos |
| Reglas de asociación (market basket) | 246 reglas |
| Tiempo de respuesta del servidor (LAN local) | < 50 ms |
| Tiempo de build de producción | ~12 s |
| Tests ejecutados / aprobados | 93 / 93 (100%) |

---

## 7. Pendientes para Semana 12

| Entregable | Prioridad | Notas |
|:---|:---:|:---|
| **CI/CD pipeline** (GitHub Actions o equivalente) | 🔴 Alta | Requerido por Calidad Sem 11-12. Automatizar `pnpm test` + `pnpm build` en cada push |
| **Cap VII del informe** — Resultados: evaluación operativa y económica | 🔴 Alta | El sílabo lo exige en Sem 12 |
| **Métricas de calidad** completadas (dinámicas) — herramientas formales | 🟡 Media | SonarQube / Lighthouse para Sem 14 |
| **Responsabilidad social** — informe de resultados | 🟡 Media | Presentación en Sem 12 |
| **Paper científico** — sección de resultados con métricas | 🟡 Media | Entrega final Sem 13 |
| Script de backup automático de `dev.db` | 🟡 Media | Pendiente del Plan de Seguridad (actividad 8) |

---

## Documentación técnica disponible

Todos los documentos están en `docs/` del repositorio:

```
docs/
├── gestion/
│   ├── plan_seguridad_integral.md          ← arquitectura de seguridad técnica
│   ├── plan_gestion_proyecto.md
│   ├── plan_calidad_sqa.md
│   ├── registros_proyecto.md               ← incidentes BUG-01..03 + lecciones aprendidas
│   └── requisitos_ieee_29148.md
├── calidad y pruebas de software/
│   ├── informe_owasp.md                    ← OWASP Top 10 (2021) con evidencia de tests
│   ├── metricas_calidad.md                 ← métricas ISO 25010 estáticas y dinámicas
│   ├── PPF_Bendistaurante_Plan_Pruebas_Funcionales.md
│   └── SEMANA 9.md
├── refactoring/
│   └── inspeccion_formal.md                ← Fagan Inspection — 0 hallazgos críticos
├── arquitectura/
│   ├── ia_hibrida_sidecar.md
│   ├── justificacion_arquitectura_local.md
│   └── casos_uso.md
└── informe/
    └── capitulo_7_resultados.md

PLAN DE SEGURIDAD INTEGRAL DEL PRODUCTO SOFTWARE.md  ← entregable académico sem 11
```

---

*Repositorio: `C:\Users\Jose\Downloads\Bendistaurante` · Stack: Next.js 15 + SQLite + FastAPI + Socket.IO*
