

## PLAN DE SEGURIDAD INTEGRAL DEL PRODUCTO
## SOFTWARE

Equipo de Trabajo:

## - [Nombre del Integrante 1]
## - [Nombre del Integrante 2]
## - [Nombre del Integrante 3]
## - [Nombre del Integrante 4]

## Contenido
- Introducción.............................................................................................................................2
- Objetivos ..................................................................................................................................2
- Alcance .....................................................................................................................................2
- Evaluación de riesgos ..............................................................................................................2
- Medidas de seguridad .............................................................................................................3
- Proceso de desarrollo seguro ..................................................................................................3
- Pruebas de seguridad ..............................................................................................................3
- Gestión de incidentes de seguridad ........................................................................................4
- Formación y concienciación en seguridad...............................................................................4
- Mantenimiento y actualización de seguridad .......................................................................4
- Cumplimiento normativo ......................................................................................................5
- Revisión y auditoría ...............................................................................................................5
- Responsabilidades .................................................................................................................5
- Plan de acción ........................................................................................................................5
- Referencias ............................................................................................................................6




## 1. Introducción

Bendistaurante es un sistema de punto de venta (POS) local-first diseñado para la gestión integral de una cevichería peruana de mediana escala. El sistema opera exclusivamente en red de área local (LAN) privada, bajo una arquitectura cliente-servidor donde un único equipo central ejecuta el servidor Next.js y la base de datos SQLite, mientras las tablets de los meseros y terminales de cocina acceden mediante navegador web dentro de la misma red.

El sistema gestiona datos de alta sensibilidad operativa y financiera: comandas, facturas con cálculo de IGV, comprobantes de pago (boletas y facturas), inventario de insumos y proyecciones de demanda mediante inteligencia artificial. La integridad y confidencialidad de estos datos impactan directamente en la continuidad del negocio, la confianza del propietario y el cumplimiento tributario ante la SUNAT.

El presente Plan de Seguridad Integral establece las medidas, controles y procedimientos adoptados para proteger el sistema frente a los riesgos de seguridad identificados, adaptados al contexto específico de un sistema POS local en un establecimiento gastronómico de tipo MYPE (Micro y Pequeña Empresa).


## 2. Objetivos

1. **Proteger la confidencialidad e integridad de los datos financieros:** Garantizar que los comprobantes de pago (boletas y facturas), los montos de venta, el cálculo de IGV y el historial de transacciones no puedan ser alterados, falsificados ni accedidos por personas no autorizadas dentro o fuera del establecimiento.

2. **Controlar el acceso al sistema mediante autenticación robusta y control por roles:** Asegurar que únicamente el personal autorizado (rol JEFE y rol MESERO) acceda a las funcionalidades que le corresponden, impidiendo la escalada de privilegios y bloqueando accesos no autorizados mediante mecanismos criptográficos y de bloqueo por intentos fallidos.

3. **Garantizar la disponibilidad y resiliencia del sistema en el entorno local-first:** Asegurar que el POS opere con continuidad plena ante cortes de electricidad, desconexiones de internet o fallos de hardware, mediante el uso de base de datos SQLite con Write-Ahead Logging (WAL), transacciones atómicas ACID y una estrategia de copias de seguridad programadas.

4. **Mitigar los riesgos del OWASP Top 10 aplicables al contexto POS local:** Implementar controles técnicos verificables (Prisma ORM, validación Zod, CORS LAN, bcryptjs) que neutralicen las categorías de vulnerabilidad más críticas para una aplicación web con acceso a datos financieros.


## 3. Alcance

El presente plan cubre todos los componentes del sistema Bendistaurante que procesan, almacenan o transmiten información de negocio: el servidor Next.js 15 (App Router + Socket.IO), la base de datos SQLite gestionada por Prisma ORM, el microservicio de inteligencia artificial FastAPI (puerto 8000) con acceso de solo lectura a la base de datos, el módulo de impresión térmica ESC/POS, y las interfaces de usuario web accedidas desde los dispositivos de la red LAN. El alcance técnico comprende la seguridad en la capa de datos (control de acceso al archivo SQLite, modo WAL, backups), la capa de aplicación (autenticación, autorización, validación de entradas, protección contra fuerza bruta) y la capa de red e infraestructura (CORS LAN, firewall local, segmentación Wi-Fi).

El alcance del proceso de desarrollo incluye las prácticas de codificación segura durante el ciclo de vida del software, la ejecución de pruebas de seguridad automatizadas (suite OWASP), la gestión de dependencias con auditorías periódicas, y los procedimientos de respuesta ante incidentes de seguridad durante la fase de operación. Quedan fuera del alcance: la seguridad perimetral de internet (el sistema no tiene exposición WAN por diseño), la seguridad física del local más allá del servidor central, y el cifrado en tránsito mediante HTTPS (considerado innecesario en una red LAN privada bajo WPA2-AES/WPA3).


## 4. Evaluación de riesgos

| ID | Riesgo de Seguridad | Descripción | Probabilidad | Impacto | Nivel de Riesgo | Control Aplicado |
|:---:|:---|:---|:---:|:---:|:---:|:---|
| R-01 | Acceso no autorizado (A01 OWASP) | Un usuario sin sesión válida o con rol incorrecto accede a rutas o APIs restringidas | Media | Alto | **Alto** | Middleware RBAC + `validateRole()` |
| R-02 | Fuerza bruta en login | Un actor malintencionado prueba contraseñas en forma automatizada contra el formulario de login | Media | Alto | **Alto** | Bloqueo al 3er intento por 15 min (`auth.ts`) |
| R-03 | Inyección SQL (A03 OWASP) | Entrada maliciosa en campos de formulario que altere o destruya consultas a la base de datos | Baja | Crítico | **Alto** | Prisma ORM con queries parametrizadas |
| R-04 | Contraseñas débiles o comprometidas (A02 OWASP) | Contraseñas simples o almacenadas en texto plano que puedan ser descifradas | Baja | Alto | **Medio** | bcryptjs, 12 rondas de sal aleatoria |
| R-05 | Configuración insegura de CORS (A05 OWASP) | Peticiones desde orígenes externos (internet) aceptadas por el servidor | Baja | Medio | **Medio** | CORS LAN: solo IPs privadas y localhost |
| R-06 | Componentes con vulnerabilidades conocidas (A06 OWASP) | Dependencias npm desactualizadas con CVEs publicados | Media | Medio | **Medio** | `pnpm audit` + overrides forzados |
| R-07 | Corrupción de datos ante corte de energía | Escritura incompleta en SQLite ante apagado abrupto del servidor | Baja | Crítico | **Alto** | Modo WAL + transacciones ACID Prisma |
| R-08 | Acceso físico no autorizado al servidor | Personal no autorizado accede al equipo central y extrae o modifica `dev.db` | Baja | Crítico | **Alto** | Permisos restrictivos de SO + red LAN cerrada |
| R-09 | Escalada de privilegios por rol fabricado (A01 OWASP) | Un cliente HTTP envía un token con rol arbitrario ("SUPERADMIN") | Muy baja | Alto | **Medio** | `validateRole()` valida contra enum de roles conocidos |
| R-10 | Ausencia de logs ante incidente (A09 OWASP) | Sin registro de eventos de seguridad, un incidente no puede ser investigado post-mortem | Media | Medio | **Bajo** | Logs Socket.IO en dev; aceptado por alcance local |


## 5. Medidas de seguridad

| Medida | Descripción técnica | Implementación en el código | Estado |
|:---|:---|:---|:---:|
| Autenticación JWT con NextAuth v4 | Tokens de sesión firmados criptográficamente con `NEXTAUTH_SECRET`, cookies `HttpOnly` y `SameSite: Lax` | `src/lib/auth.ts`, `NEXTAUTH_SECRET` en `.env` | ✅ Implementado |
| Hash de contraseñas bcryptjs (12 rondas) | Contraseñas almacenadas con hash irreversible y sal aleatoria, imposibles de descifrar por diccionario | `src/lib/auth.ts` — `bcrypt.compare()` | ✅ Implementado |
| Control de acceso por roles (RBAC) | Middleware que restringe rutas por rol; `validateRole()` como segunda capa en API routes sensibles | `src/middleware.ts`, `src/lib/auth-utils.ts` | ✅ Implementado |
| Protección contra fuerza bruta | Bloqueo temporal (15 min) del usuario tras 3 intentos fallidos consecutivos de login | `src/lib/auth.ts` — `intentosFallidos` Map | ✅ Implementado |
| Prevención de inyección SQL | Prisma ORM genera prepared statements parametrizados; prohibido `$queryRawUnsafe` | Toda la capa de servicios `src/services/` | ✅ Implementado |
| Validación de entradas con Zod | Todos los endpoints de API validan el body de la petición contra un schema Zod antes de procesarlo | `src/features/*/validations/` | ✅ Implementado |
| CORS LAN restrictivo | El servidor solo acepta peticiones de `localhost`, `127.0.0.1` y rangos privados RFC-1918 | `server.js` — función `isAllowedOrigin()` | ✅ Implementado |
| Integridad de datos SQLite (WAL) | Mode Write-Ahead Logging previene corrupción ante cortes de energía y permite concurrencia segura | `src/lib/prisma.ts` — PRAGMA journal_mode=WAL | ✅ Implementado |
| Transacciones atómicas ACID | Operaciones financieras críticas (numeración de comprobantes, descuento de inventario) se ejecutan en `$transaction` | `src/services/billing.service.ts` | ✅ Implementado |
| Gestión de dependencias vulnerable | `pnpm audit` periódico + overrides forzados en `package.json` para dependencias con CVE conocidos | `package.json` — sección `overrides` | 🟡 Parcial |
| Copias de seguridad programadas | Script automático de backup caliente del archivo `dev.db` hacia directorio cifrado y USB externo | Script programador de tareas del SO | 🟡 Pendiente |


## 6. Proceso de desarrollo seguro

El siguiente conjunto de actividades define cómo se integra la seguridad durante todo el ciclo de vida del desarrollo del sistema:

1. **Revisión de código con ESLint y reglas de seguridad:** Antes de integrar cualquier cambio, el linter ESLint se ejecuta automáticamente (`pnpm lint`). Las reglas configuradas prohíben patrones inseguros como la interpolación directa de variables en strings SQL y el uso de `eval()`.

2. **Validación obligatoria de entradas con Zod en todos los endpoints:** Todo endpoint de API declara un schema Zod explícito (ubicados en `src/features/<dominio>/validations/`). Ningún dato proveniente del cliente llega a la capa de servicios sin haber pasado por `schema.safeParse()`.

3. **Uso exclusivo de Prisma ORM para acceso a datos:** Se prohíbe en forma de política de equipo el uso de `prisma.$queryRawUnsafe` o `prisma.$executeRawUnsafe`. Todas las consultas usan el API tipado de Prisma que genera prepared statements internamente.

4. **Variables de entorno fuera del repositorio:** El archivo `.env` (que contiene `NEXTAUTH_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `GEMINI_API_KEY`) está incluido en `.gitignore`. En el repositorio solo se versiona el archivo `.env.example` con nombres de variables sin valores.

5. **Auditoría de dependencias con `pnpm audit`:** Antes de cada release se ejecuta `pnpm audit` para detectar CVEs en dependencias directas y transitivas. Los hallazgos críticos se resuelven mediante `overrides` en `package.json` o actualización de la dependencia.

6. **Pruebas de seguridad automatizadas (suite OWASP):** El archivo `src/services/__tests__/security.owasp.test.ts` contiene 19 pruebas automatizadas que verifican los controles de acceso (A01), criptografía (A02), inyección (A03), configuración CORS (A05) y autenticación (A07). Estas pruebas se ejecutan con cada cambio mediante `pnpm test`.

7. **Principio de mínimo privilegio en roles:** El sistema define solo los roles estrictamente necesarios para la operación del restaurante (JEFE y MESERO). No se crean roles intermedios innecesarios. Cualquier nuevo endpoint evalúa si requiere `validateRole(['JEFE'])` o puede ser accedido por ambos roles.

8. **Transacciones atómicas para operaciones financieras críticas:** La generación de números de comprobante (boletas y facturas) usa `prisma.$transaction` con `increment: 1` sobre `SystemConfig`, garantizando unicidad bajo concurrencia sin condiciones de carrera.

9. **Revisión de seguridad previo a release:** Antes de desplegar una nueva versión en el servidor del restaurante, se ejecuta el skill `/code-review` que realiza una revisión orientada a bugs de seguridad, OWASP y patrones inseguros introducidos en el diff.


## 7. Pruebas de seguridad

**Pruebas de control de acceso (A01 — Broken Access Control):** Se ejecutan cinco casos de prueba automatizados que validan el comportamiento del helper `validateRole()` ante los escenarios de acceso más frecuentes: usuario sin sesión activa (debe recibir HTTP 401), usuario con rol MESERO intentando acceder a rutas exclusivas de JEFE (debe recibir HTTP 403), usuario JEFE accediendo a su propia ruta (debe ser autorizado), usuario con rol inventado como "SUPERADMIN" (debe ser rechazado en todas las rutas). Estas pruebas confirman que el control de acceso no puede ser evadido mediante manipulación del token JWT.

**Pruebas criptográficas (A02 — Cryptographic Failures):** Cuatro pruebas verifican las propiedades esenciales del hash de contraseñas con bcryptjs a 12 rondas: que dos llamadas con la misma contraseña generen hashes distintos gracias al salt aleatorio, que la verificación de un hash legítimo resulte verdadera, que una contraseña incorrecta sea rechazada, y que el hash resultante no contenga la contraseña en texto plano (comienza siempre con `$2b$`). Estas pruebas garantizan que una eventual extracción del archivo de base de datos no comprometa las credenciales de los usuarios.

**Pruebas de inyección SQL (A03 — Injection):** Dos pruebas validan que el ORM Prisma trate un payload de inyección clásico (`'; DROP TABLE orders; --`) como dato literal y no como SQL ejecutable, y que el patrón `prisma.$queryRawUnsafe` no exista en la base de código mediante verificación estática. La protección se apoya en el comportamiento intrínseco de Prisma de generar prepared statements con parámetros ligados.

**Pruebas de configuración CORS (A05 — Security Misconfiguration):** Seis pruebas validan la función `isAllowedOrigin()` del servidor: permite `localhost` y `127.0.0.1`, permite rangos privados RFC-1918 (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`), bloquea orígenes externos como `atacante.com` y `evil.io`, permite peticiones sin cabecera Origin (herramientas como curl o apps nativas del mismo host) y respeta la lista blanca explícita configurada en `ALLOWED_ORIGINS`.

**Pruebas de carga y estrés:** El archivo `src/services/__tests__/load.stress.test.ts` ejecuta pruebas de rendimiento que simulan hasta 100 peticiones concurrentes a los endpoints críticos del sistema. Estas pruebas validan que el servidor no caiga en condiciones de alta concurrencia (horas pico en el restaurante) y que SQLite en modo WAL maneje correctamente la cola de escrituras sin errores de "database is locked".


## 8. Gestión de incidentes de seguridad

Ante la detección de un incidente de seguridad, el procedimiento de respuesta sigue tres fases secuenciales. En la fase de **detección y contención**, quien detecte el incidente (propietario, personal o el propio sistema mediante un error no controlado en los logs) notifica inmediatamente al administrador del sistema (JEFE). El primer paso es aislar el componente afectado: si el incidente involucra acceso no autorizado a una cuenta de usuario, el administrador desactiva la cuenta desde el panel de gestión (`isActive = false`) y reinicia el servidor Node.js para forzar la invalidación de todos los tokens JWT activos en memoria. Si el incidente involucra corrupción del archivo de base de datos, se detiene el servidor y se restaura la copia de seguridad más reciente del backup diario. En ningún caso se intenta reparar el sistema mientras está en producción con usuarios conectados.

En la fase de **análisis y recuperación**, el administrador revisa los logs del servidor (archivo de salida del proceso Node.js / uvicorn) para identificar el vector de ataque, el rango horario del incidente y los registros de datos afectados. Con esta información se determina si hubo exposición de datos financieros de clientes y se evalúa si es necesario notificar al propietario del restaurante. Una vez identificada la causa raíz, se aplica el parche o corrección correspondiente en el código, se ejecuta la suite de pruebas de seguridad (`pnpm test`) para verificar que el control corregido funciona correctamente, y se despliega la versión corregida. Finalmente, se documenta el incidente en el Registro de Incidentes del proyecto (tabla de la sección 3 de `docs/gestion/registros_proyecto.md`) con descripción, gravedad, impacto, responsable y solución aplicada, siguiendo el formato de los registros BUG-01, BUG-02 y BUG-03 ya existentes.


## 9. Formación y concienciación en seguridad

| # | Actividad de Capacitación | Dirigido a | Modalidad | Frecuencia | Objetivo |
|:---:|:---|:---|:---|:---|:---|
| 1 | Taller: OWASP Top 10 aplicado al POS | Equipo de desarrollo | Sesión práctica con el código real | Al inicio del proyecto y ante nuevos integrantes | Comprender los riesgos de seguridad concretos del sistema y los controles implementados |
| 2 | Revisión del flujo de autenticación y RBAC | Equipo de desarrollo | Walkthrough del código (`auth.ts`, `middleware.ts`) | Ante cada cambio en la lógica de acceso | Garantizar que nuevos cambios no rompan los controles de acceso existentes |
| 3 | Charla: Gestión segura de variables de entorno | Equipo de desarrollo | Sesión corta (30 min) + checklist | Al inicio del proyecto | Prevenir la publicación accidental de claves API y secrets en el repositorio |
| 4 | Capacitación al propietario: gestión de contraseñas | Usuario JEFE del restaurante | Demostración in situ | Al momento del despliegue | Instruir al propietario en el uso de contraseñas robustas y en el procedimiento de cambio de credenciales |
| 5 | Capacitación al personal: reconocimiento de accesos no autorizados | Meseros y personal operativo | Sesión presencial en el local | Al momento del despliegue y ante cambios de personal | Enseñar a identificar intentos de acceso físico al servidor y a notificar al administrador |
| 6 | Revisión de seguridad post-release | Equipo de desarrollo | Ejecución de `/code-review` + `pnpm audit` | Antes de cada despliegue en producción | Detectar nuevas vulnerabilidades introducidas en el diff antes de que lleguen al entorno productivo |


## 10. Mantenimiento y actualización de seguridad

| # | Actividad | Descripción | Responsable | Periodicidad |
|:---:|:---|:---|:---|:---|
| 1 | Auditoría de dependencias npm | Ejecutar `pnpm audit` y revisar CVEs en dependencias directas y transitivas. Aplicar `overrides` o actualizar la dependencia según severidad | Desarrollador | Mensual y antes de cada release |
| 2 | Actualización de dependencias de seguridad | Actualizar `next`, `next-auth`, `bcryptjs` y `prisma` a versiones con parches de seguridad publicados | Desarrollador | Trimestral |
| 3 | Rotación de `NEXTAUTH_SECRET` | Regenerar el secret de firma JWT y reiniciar el servidor (invalida todas las sesiones activas) | Administrador (JEFE) | Semestral o ante sospecha de compromiso |
| 4 | Verificación de integridad del backup | Restaurar la copia de seguridad más reciente en un entorno de prueba y validar que la base de datos es consistente y las facturas son accesibles | Desarrollador | Mensual |
| 5 | Revisión de logs de acceso | Revisar los logs del proceso del servidor buscando patrones anómalos: múltiples 401/403 seguidos, IPs desconocidas, errores en tiempo de ejecución | Administrador (JEFE) | Semanal |
| 6 | Re-ejecución de suite de pruebas de seguridad | Ejecutar `pnpm test` (incluye `security.owasp.test.ts`) para confirmar que ningún cambio reciente rompió los controles de seguridad | Desarrollador | Ante cada actualización de código |
| 7 | Revisión de permisos del archivo SQLite | Verificar que `prisma/dev.db` mantiene permisos restrictivos en el sistema de archivos del servidor (solo lectura/escritura para el usuario del proceso Node.js) | Administrador (JEFE) | Trimestral |


## 11. Cumplimiento normativo

El sistema Bendistaurante se rige por el marco normativo peruano en materia de protección de datos personales, específicamente la **Ley N° 29733 — Ley de Protección de Datos Personales** y su reglamento (D.S. N° 003-2013-JUS). Dado que el sistema almacena datos de clientes (nombre, DNI o RUC en comprobantes de pago), el propietario del restaurante actúa como titular del banco de datos personales y es responsable de garantizar que dicha información sea recogida con consentimiento implícito en el acto de la transacción comercial, usada únicamente para la emisión del comprobante tributario, y no compartida con terceros no autorizados. El archivo `dev.db` que contiene estos datos se almacena localmente con acceso restringido y no se transmite a servidores externos, cumpliendo con el principio de proporcionalidad establecido en el artículo 8 de la citada ley.

En cuanto a estándares internacionales de seguridad, el sistema ha sido evaluado bajo el marco **OWASP Top 10 (edición 2021)**, que constituye el estándar de facto para la identificación y mitigación de riesgos en aplicaciones web. Los resultados de esta evaluación se documentan en `docs/calidad y pruebas de software/informe_owasp.md`: de los 10 riesgos del estándar, 6 están completamente mitigados, 2 están mitigados parcialmente (A06 y A09, aceptados por el alcance local del sistema), y 2 no aplican al contexto local-first (A08 y A10). Adicionalmente, el sistema adopta los principios del estándar **ISO/IEC 27001** en cuanto a gestión de riesgos (identificación, evaluación y tratamiento), control de acceso, criptografía y gestión de incidentes, sin proceder a una certificación formal dado que el contexto es una MYPE gastronómica.


## 12. Revisión y auditoría

Las medidas de seguridad del sistema se someten a revisiones periódicas en dos niveles. A nivel de **auditoría técnica continua**, cada cambio introducido en el repositorio pasa por una revisión de código orientada a seguridad mediante el skill `/code-review` del entorno de desarrollo, que analiza el diff en busca de bugs de seguridad, patrones OWASP vulnerables y problemas de correctitud. Esta revisión se complementa con la ejecución automática de la suite de pruebas de seguridad (`pnpm test`) que incluye los 19 casos de prueba del archivo `security.owasp.test.ts`. Ambas instancias forman una capa de auditoría técnica ligera pero continua que detecta regresiones de seguridad antes de que lleguen al entorno productivo del restaurante.

A nivel de **auditoría periódica formal**, se realiza una revisión integral de seguridad al menos una vez por semestre o ante eventos que lo justifiquen (cambio de personal, actualización mayor del framework, o detección de un incidente). Esta revisión incluye: re-ejecución completa del análisis OWASP, auditoría de dependencias con `pnpm audit`, revisión de los logs de acceso acumulados, verificación de integridad de la última copia de seguridad, y actualización del presente plan para reflejar cambios en la arquitectura o el entorno de amenazas. Los resultados de cada auditoría formal se documentan como una nueva entrada en `docs/calidad y pruebas de software/` siguiendo el formato del `informe_owasp.md` existente, con fecha, hallazgos, acciones correctivas y responsable.


## 13. Responsabilidades

- **[Nombre del Integrante 1] — Desarrollador Principal / Arquitecto de Seguridad:** Responsable del diseño e implementación de los controles de seguridad en la capa de aplicación (autenticación, RBAC, validación Zod, protección contra fuerza bruta). Ejecuta la suite de pruebas de seguridad y mantiene actualizado el presente plan.

- **[Nombre del Integrante 2] — Desarrollador Backend / Responsable de Datos:** Responsable de la seguridad en la capa de datos (SQLite WAL, transacciones atómicas Prisma, permisos del archivo de base de datos). Gestiona la estrategia de backups y verifica la integridad de las copias de seguridad periódicamente.

- **[Nombre del Integrante 3] — Desarrollador Frontend / Responsable de Pruebas:** Responsable de la seguridad en la capa de presentación (prevención de XSS mediante React, validación de formularios) y de la ejecución y mantenimiento de la suite de pruebas de seguridad automatizadas.

- **[Nombre del Integrante 4] — Responsable de Infraestructura y Despliegue:** Responsable de la configuración segura del servidor local (firewall, permisos de SO, segmentación de red Wi-Fi), la gestión de variables de entorno en producción, y la rotación periódica de secrets.

- **[Nombre del Cliente] — Propietario del Restaurante (Usuario JEFE):** Responsable de la gestión operativa de cuentas de usuario (altas, bajas, cambios de contraseña), de reportar al equipo cualquier comportamiento anómalo del sistema, y de custodiar físicamente el servidor central y los backups en USB.


## 14. Plan de acción

| # | Actividad | Descripción | Responsable | Fecha Inicio | Fecha Fin | Estado |
|:---:|:---|:---|:---|:---:|:---:|:---:|
| 1 | Implementar protección contra fuerza bruta | Agregar contador de intentos fallidos y bloqueo temporal de 15 min en `src/lib/auth.ts` | Integrante 1 | 2026-05-01 | 2026-05-05 | ✅ Completado |
| 2 | Configurar validación Zod en todos los endpoints | Revisar y completar schemas Zod en `src/features/*/validations/` para todos los endpoints de API | Integrante 1 | 2026-05-06 | 2026-05-15 | ✅ Completado |
| 3 | Habilitar WAL mode en SQLite | Configurar `PRAGMA journal_mode=WAL` en `src/lib/prisma.ts` | Integrante 2 | 2026-05-01 | 2026-05-03 | ✅ Completado |
| 4 | Implementar suite de pruebas de seguridad OWASP | Crear y ejecutar `src/services/__tests__/security.owasp.test.ts` con 19 casos de prueba | Integrante 3 | 2026-05-20 | 2026-05-30 | ✅ Completado |
| 5 | Configurar CORS LAN en servidor | Implementar `isAllowedOrigin()` en `server.js` para restringir orígenes a la red privada LAN | Integrante 4 | 2026-05-01 | 2026-05-05 | ✅ Completado |
| 6 | Forzar versiones seguras de dependencias | Agregar sección `overrides` en `package.json` para `serialize-javascript`, `uuid`, `postcss` | Integrante 1 | 2026-05-10 | 2026-05-12 | ✅ Completado |
| 7 | Elaborar informe OWASP Top 10 | Documentar evaluación de los 10 riesgos en `docs/calidad y pruebas de software/informe_owasp.md` | Integrante 3 | 2026-06-01 | 2026-06-07 | ✅ Completado |
| 8 | Implementar estrategia de backups automáticos | Crear script de backup caliente del archivo `dev.db` con rotación diaria y copia a USB | Integrante 4 | 2026-07-01 | 2026-07-15 | 🔄 Pendiente |
| 9 | Realizar auditoría formal de seguridad (semestre 2) | Re-ejecutar análisis OWASP, auditar dependencias y actualizar presente plan | Integrante 1 | 2026-12-01 | 2026-12-07 | 🔄 Programado |
| 10 | Capacitación al propietario en gestión de accesos | Sesión in situ para instruir al JEFE en gestión de contraseñas y reconocimiento de incidentes | Integrante 1 | Fecha de despliegue | Fecha de despliegue | 🔄 Pendiente |


## 15. Referencias

OWASP Foundation. (2021). *OWASP Top Ten 2021*. Open Web Application Security Project. https://owasp.org/Top10/

International Organization for Standardization. (2022). *ISO/IEC 27001:2022 — Information security, cybersecurity and privacy protection — Information security management systems — Requirements*. ISO. https://www.iso.org/standard/27001

Congreso de la República del Perú. (2011). *Ley N° 29733 — Ley de Protección de Datos Personales*. El Peruano. https://www.leyes.congreso.gob.pe/Documentos/Leyes/29733.pdf

Ministerio de Justicia y Derechos Humanos del Perú. (2013). *Decreto Supremo N° 003-2013-JUS — Reglamento de la Ley de Protección de Datos Personales*. MINJUS. https://www.minjus.gob.pe/wp-content/uploads/2013/04/DS-003-2013-JUS.pdf

National Institute of Standards and Technology. (2020). *NIST Special Publication 800-63B: Digital Identity Guidelines — Authentication and Lifecycle Management*. NIST. https://doi.org/10.6028/NIST.SP.800-63b

Provos, N., & Mazières, D. (1999). *A future-adaptable password scheme*. Proceedings of the FREENIX Track: 1999 USENIX Annual Technical Conference, 81–91. https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf

Next.js Team. (2024). *Next.js Security*. Vercel. https://nextjs.org/docs/app/building-your-application/authentication

Prisma Team. (2024). *Prisma Security*. Prisma. https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management
