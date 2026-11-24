# Manual de Operaciones y Soporte — SIGER-IA v1.0.0

Paquete de transferencia a Operaciones: lo necesario para que el restaurante (o quien dé soporte)
opere, mantenga y recupere el sistema sin depender del equipo de desarrollo.

| Dato | Valor |
| :--- | :--- |
| Versión en producción | `v1.0.0` — https://github.com/Walxom/Restaurante/releases/tag/v1.0.0 |
| Entorno | 1 PC servidor en la LAN del restaurante (Windows), tablets y celulares como clientes |
| Servicios | POS web + Socket.IO (puerto **3001**) y motor de IA opcional (puerto **8000**) |
| Base de datos | SQLite local `prisma/dev.db` (15 tablas) |

---

## 1. Acceso al código y documentación técnica

| Elemento | Ubicación |
| :--- | :--- |
| Repositorio, ramas y etiquetas | https://github.com/Walxom/Restaurante — `main` protegida, etiqueta `v1.0.0` |
| Compilar y ejecutar | [Inicio rápido](../installation/quickstart.md) · [Guía de despliegue](../installation/deployment-guide.md) |
| Arquitectura y convenciones | [Guía de desarrollo](../architecture/guia-desarrollo.md) |
| Modelo de datos | [Diagrama ER](../data-model/er-diagram.md) · [Diccionario de datos](../data-model/data-dictionary.md) |
| API | [OpenAPI 3.1](../api/openapi.yaml) |
| Uso diario | [Manual de usuario](../user/manual-usuario.md) |
| Cambios por versión y rollback | [Notas de versión v1.0.0](../release/release-notes-v1.0.0.md) · [CHANGELOG](../../CHANGELOG.md) |

## 2. Runbooks

### RB-01 Arranque diario

1. Encender la PC servidor y conectarla al router del local (IP fija recomendada).
2. En la carpeta del proyecto: `pnpm start:network` (o `pm2 start ecosystem.config.js` si se usa PM2).
3. Opcional, IA: `pnpm ai:start`.
4. Verificar: `pnpm doctor` y abrir `http://<IP-del-servidor>:3001/api/public/health` desde una tablet.
5. Encender la impresora térmica y hacer una impresión de prueba desde **Impresión**.

### RB-02 Parada ordenada (cierre del día)

1. Cerrar la caja del turno (**Caja → Cerrar turno**) para dejar el arqueo registrado.
2. Detener el servidor con `Ctrl+C` (o `pm2 stop all`). `server.js` cierra las conexiones antes de salir.
3. Ejecutar `pnpm db:backup` (ver RB-10).
4. Apagar la PC.

### RB-03 a RB-09 Incidentes comunes

| ID | Síntoma | Causa probable | Solución |
| :--- | :--- | :--- | :--- |
| RB-03 | Las tablets no abren el sistema | Servidor apagado, IP cambiada o firewall | Comprobar RB-01 paso 4 en la PC; revisar IP con `ipconfig`; permitir el puerto 3001 en el Firewall de Windows |
| RB-04 | "Puerto 3001 en uso" al arrancar | Quedó un proceso anterior | `pnpm doctor` lo identifica; cerrar el proceso `node` o reiniciar la PC |
| RB-05 | Los pedidos no aparecen en tiempo real | Socket desconectado (red o servidor iniciado con `dev:next`) | Recargar la página; iniciar siempre con `pnpm start:network` |
| RB-06 | No imprime la comanda | Impresora apagada, sin papel o IP distinta | Revisar papel y red; corregir IP en **Impresión**; reimprimir desde el pedido |
| RB-07 | Usuario bloqueado | 3 intentos fallidos | Esperar 15 minutos o reiniciar el servidor (el bloqueo se guarda en memoria) |
| RB-08 | La IA no responde | Motor apagado, sin internet o cuota de Gemini agotada | El POS sigue funcionando; reiniciar con `pnpm ai:start`; revisar `GEMINI_API_KEY` |
| RB-09 | Error al guardar tras un corte de luz | Base de datos con escritura interrumpida | Detener el servidor; `sqlite3 prisma/dev.db "PRAGMA integrity_check;"`; si no responde `ok`, restaurar el último respaldo (RB-11) |

### RB-10 a RB-12 Tareas rutinarias

| ID | Tarea | Frecuencia | Comando |
| :--- | :--- | :--- | :--- |
| RB-10 | Respaldo de la base de datos (`VACUUM INTO`, retención de 7 días en `backups/`) | Diaria, al cierre | `pnpm db:backup` (con copia externa: `scripts/backup-db.ps1 -DestinoExtra "E:\Backups"`) |
| RB-11 | Restaurar un respaldo | Ante incidente | Detener el servidor, copiar `backups/dev_backup_<fecha>.db` sobre `prisma/dev.db`, arrancar (RB-01) |
| RB-12 | Simulacro de restauración | Mensual | `pnpm test:backup` (verifica integridad, claves foráneas y datos restaurados) |

### Escalamiento

| Nivel | Quién | Cuándo |
| :--- | :--- | :--- |
| N1 | Administrador del local (rol JEFE) | Aplica los runbooks de esta guía |
| N2 | Soporte técnico del equipo de desarrollo (canal: issues del repositorio) | El incidente persiste 15 min o afecta el cobro |
| N3 | Desarrollador responsable del módulo | Requiere un cambio de código (se corrige por PR y nueva versión) |

## 3. Accesos y roles por entorno

| Entorno | Acceso | Roles |
| :--- | :--- | :--- |
| Producción (LAN del local) | `http://<IP>:3001` solo dentro de la red del restaurante | JEFE (administración total), MESERO (pedidos y mesas) |
| Desarrollo | `http://localhost:3001` en la PC del desarrollador | Usuarios semilla `jefe` y `mesero` |
| CI (GitHub Actions) | Base de datos temporal por ejecución | Credenciales de prueba en *secrets* del repositorio |
| Repositorio | GitHub | Escritura solo por PR aprobado; `main` exige 1 aprobación y 3 checks |

Antes de instalar en el local se **cambian las contraseñas semilla** (`admin123`, `mesero123`): v1.0.0 no tiene pantalla de cambio de contraseña, así que se editan en `prisma/seed.ts` antes de ejecutar `pnpm db:setup` sobre la base nueva.

## 4. Configuración y gestión de secretos

| Variable (`.env`) | Uso | Secreto |
| :--- | :--- | :--- |
| `DATABASE_URL` | Ruta de SQLite | No |
| `PORT`, `NODE_ENV`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SOCKET_URL` | Red y modo de ejecución | No |
| `NEXTAUTH_SECRET` | Firma de sesiones JWT | **Sí** — generado por `pnpm setup:all` |
| `GEMINI_API_KEY` | Chat de IA (también en `ai_engine/.env`) | **Sí** |
| `AI_ENGINE_URL`, `AI_ENGINE_ENABLED`, `GEMINI_MODEL` | Motor de IA | No |
| `PRINTER_SERVICE_ENABLED`, `DEFAULT_KITCHEN_PRINTER_IP`, `DEFAULT_PRINTER_PORT` | Impresora térmica | No |

Reglas: los archivos `.env` **nunca** se versionan (están en `.gitignore`); la plantilla es `.env.example`.
Los secretos se guardan en la PC servidor y en un gestor de contraseñas del dueño. Si se filtra un
secreto, se regenera (`NEXTAUTH_SECRET` cierra todas las sesiones; la clave de Gemini se revoca en
Google AI Studio). Parámetros de negocio (IGV, datos de la empresa, correlativos) se editan en
**Configuración**, no en archivos.

## 5. Plan de mantenimiento

| Tipo | Actividad | Ventana | Responsable |
| :--- | :--- | :--- | :--- |
| Preventivo | Respaldo diario (RB-10) y copia semanal a USB externo | Al cierre del local | Administrador (JEFE) |
| Preventivo | Simulacro de restauración (RB-12) y revisión de espacio en disco (`pnpm doctor`) | Mensual, lunes antes de abrir | Soporte N2 |
| Preventivo | Actualizar dependencias con avisos de seguridad | Trimestral, fuera de horario | Soporte N2 / N3 |
| Correctivo | Corrección de defectos por PR, CI y nueva versión; actualización según §5 de las notas de versión y rollback §5.1 | Fuera del horario de atención | Desarrollador N3 |

## 6. Acuerdos de nivel de servicio (SLA)

| Indicador | Compromiso |
| :--- | :--- |
| Disponibilidad del POS | 99 % en horario de atención (11:00–17:00); funciona sin internet |
| Recuperación ante falla de la PC (RTO) | ≤ 30 min restaurando el último respaldo en otra PC |
| Pérdida máxima de datos (RPO) | Las ventas desde el último respaldo (≤ 1 día) |

| Severidad | Ejemplo | Respuesta | Resolución |
| :--- | :--- | :--- | :--- |
| S1 Crítica | No se puede cobrar ni tomar pedidos | 15 min | 2 h (o rollback) |
| S2 Alta | No imprime, no hay tiempo real | 1 h | 8 h |
| S3 Media | Reportes o IA no disponibles | 1 día hábil | 3 días hábiles |
| S4 Baja | Mejora o defecto visual | 3 días hábiles | Siguiente versión |

## 7. Inventario de licencias y dependencias

| Componente | Versión | Licencia | Vigencia / costo |
| :--- | :--- | :--- | :--- |
| Next.js | 15.5 | MIT | Perpetua, gratuita |
| React | 19.1 | MIT | Perpetua, gratuita |
| Prisma Client | 6.19 | Apache-2.0 | Perpetua, gratuita |
| Socket.IO | 4.8 | MIT | Perpetua, gratuita |
| NextAuth | 4.24 | ISC | Perpetua, gratuita |
| Tailwind CSS | 4.3 | MIT | Perpetua, gratuita |
| Zod · SWR · Recharts · serialport | 4.4 · 2.4 · 2.15 · 12.0 | MIT | Perpetua, gratuita |
| bcryptjs | 3.0 | BSD-3-Clause | Perpetua, gratuita |
| SQLite | 3 | Dominio público | — |
| FastAPI · Uvicorn | 0.115 · 0.34 | MIT · BSD-3-Clause | Perpetua, gratuita |
| Prophet · mlxtend · pandas · scikit-learn | 1.1 · 0.23 · 2.2 · 1.6 | MIT · BSD-3 · BSD-3 · BSD-3 | Perpetua, gratuita |
| Google Gemini API (`google-genai`) | — | Apache-2.0 (SDK); servicio sujeto a términos de Google | Capa gratuita con cuota; la clave la custodia el dueño (§4) |

Todas las licencias son permisivas y compatibles entre sí y con el uso comercial del restaurante.
Ninguna requiere renovación; el único servicio con cuota es Gemini (revisar en Google AI Studio).

## 8. Ítems de configuración (línea base v1.0.0)

| CI | Ítem | Ubicación | Control |
| :--- | :--- | :--- | :--- |
| CI-01 | Código fuente web | `src/`, `server.js` | Git, etiqueta `v1.0.0` |
| CI-02 | Esquema de datos | `prisma/schema.prisma` | Git + `docs/data-model/` |
| CI-03 | Motor de IA | `ai_engine/` + `requirements.txt` | Git |
| CI-04 | Dependencias bloqueadas | `pnpm-lock.yaml` | Git |
| CI-05 | Pipelines de CI y rendimiento | `.github/workflows/ci.yml`, `load.yml` | Git + protección de `main` |
| CI-06 | Plantilla de configuración | `.env.example` (los `.env` reales no se versionan) | Git |
| CI-07 | Contenedores | `Dockerfile`, `docker-compose.yml` | Git |
| CI-08 | Documentación | `docs/`, `README.md`, `CHANGELOG.md` | Git |
| CI-09 | Datos de operación | `prisma/dev.db` + `backups/` | Respaldo diario (RB-10), fuera de Git |

Todo cambio a un CI-01 a CI-08 entra por Pull Request con CI 3/3 y aprobación, y se publica con una
nueva etiqueta de versión y entrada en el CHANGELOG.

## 9. Entrega y aceptación

| Paso | Evidencia |
| :--- | :--- |
| Preparar | Este manual y la versión `v1.0.0` publicada |
| Entregar | Recorrido de los runbooks RB-01, RB-02, RB-10 y RB-11 con el administrador del local |
| Validar | El administrador ejecuta un arranque, un respaldo y una restauración sin ayuda |
| Cerrar | Acta de aceptación de Operaciones firmada (anexo del informe final) |
