# Restaurant System

![Project Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Prisma](https://img.shields.io/badge/Prisma-6-1B222D?logo=Prisma)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)

Un sistema de gestión integral para restaurantes que incluye una aplicación web moderna construida con Next.js, base de datos gestionada por Prisma y un motor de inteligencia artificial (AI Engine) integrado para funcionalidades avanzadas.

---

## 📋 Características Principales

- **Gestión Completa**: Control de pedidos, inventario y más.
- **Motor de Inteligencia Artificial (AI Engine)**: Para tareas predictivas, datos sintéticos o sugerencias automáticas.
- **WebSockets Integrados**: Comunicación en tiempo real a través de Socket.io.
- **Interfaz Moderna**: Componentes interactivos y de alta calidad diseñados con Radix UI y Tailwind CSS.

---

## 🛠 Requisitos Previos e Instalación Rápida (1-Liner)

Si configuras el proyecto por primera vez en una máquina limpia, instala los componentes base ejecutando una sola línea según tu sistema operativo:

| Herramienta | Versión Mínima | Windows (PowerShell) | macOS / Linux |
| :--- | :--- | :--- | :--- |
| **Node.js** | v20.10+ LTS | `winget install OpenJS.NodeJS.LTS` | `brew install node` o `nvm install 20` |
| **pnpm** | v9.0+ | `corepack enable` o `npm i -g pnpm` | `corepack enable` |
| **uv (Python 3.10)** | v0.4+ | `irm https://astral.sh/uv/install.ps1 \| iex` | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| **Git** | v2.40+ | `winget install Git.Git` | `brew install git` |

---

## ⚡ Montaje Automatizado en 1 Solo Paso (Turnkey Bootstrap)

### En Windows (PowerShell nativo - Sin requerir Node preinstalado):
```powershell
.\scripts\bootstrap.ps1
```
*Este script verifica e instala automáticamente lo que falte (Node LTS, pnpm, uv), genera las claves criptográficas `.env`, aprovisiona la base de datos SQLite con datos semilla y monta el entorno de IA.*

### Si ya tienes Node y pnpm instalados:
```bash
pnpm setup:all
```

Una vez completado el montaje, inicia el sistema completo (Servidor Web + WebSockets + IA):
```bash
pnpm dev:ai
```
Accede a **[http://localhost:3001](http://localhost:3001)** con las credenciales:
- **Jefe (Admin):** `jefe` / `admin123`
- **Mesero:** `mesero` / `mesero123`

Para comprobar la salud del sistema en cualquier momento: `pnpm doctor`.

---

## 💻 Comandos de Ejecución y Desarrollo

- **`pnpm dev:ai`**: Servidor Web Next.js (:3001) + Microservicio de IA Python (:8000) simultáneamente.
- **`pnpm dev`**: Servidor Web Next.js + WebSockets Socket.IO en puerto 3001.
- **`pnpm doctor`**: Diagnóstico integral de puertos, base de datos, credenciales y motor de IA.
- **`pnpm test`**: Ejecuta la suite de pruebas unitarias y de integración (Vitest).
- **`pnpm build`**: Compilación para producción.

---

## 🚀 Despliegue en producción (Docker)

El sistema se despliega con **Docker Compose** en dos contenedores Linux: `siger-web` (aplicación web,
WebSockets y base SQLite) y `siger-ai` (motor de IA). Las mismas imágenes funcionan en un servidor
**Linux** y en un PC **Windows 10/11**; los pasos son iguales y solo cambian los comandos de consola
marcados abajo. La base de datos vive en el volumen `sqlite_data` y no se pierde al reiniciar ni al
actualizar.

### 1. Requisitos

| | Windows 10/11 | Linux (Ubuntu, Debian, etc.) |
| :--- | :--- | :--- |
| Docker | [Docker Desktop](https://www.docker.com/products/docker-desktop/) con backend **WSL2** (modo *Linux containers*, el predeterminado) | Docker Engine + plugin Compose: `curl -fsSL https://get.docker.com \| sh` |
| Git | `winget install Git.Git` | `sudo apt install git` |
| Hardware | 2 núcleos, 4 GB de RAM, 5 GB libres en disco | igual |

Compruebe la instalación con `docker compose version` (v2.20 o superior).

### 2. Obtener el código

```bash
git clone https://github.com/Walxom/Restaurante.git
cd Restaurante
git checkout v1.1.0        # última versión publicada
```

### 3. Configurar

Copie la plantilla de variables y genere la clave de sesiones:

**Windows (PowerShell)**
```powershell
Copy-Item .env.docker.example .env
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))   # copie el resultado
notepad .env
```

**Linux**
```bash
cp .env.docker.example .env
openssl rand -base64 32     # copie el resultado
nano .env
```

En `.env` complete:
- `NEXTAUTH_SECRET`: la clave generada (obligatoria; sin ella Compose no arranca).
- `NEXTAUTH_URL`: la dirección con la que se abrirá el sistema desde las tablets, con la **IP fija del
  servidor**, por ejemplo `http://192.168.1.50:3001`. Para probar en el mismo equipo deje
  `http://localhost:3001`.
- `GEMINI_API_KEY` (opcional): habilita el chat con IA; sin ella el motor usa reglas locales.

### 4. Levantar

```bash
docker compose up -d --build
docker compose ps           # esperar a que ambos contenedores digan "healthy" (1-2 min)
```

En el primer arranque se crea la base y se cargan los datos iniciales. Abra
`http://IP-DEL-SERVIDOR:3001` (o `http://localhost:3001`) y entre con `jefe` / `admin123`.
**Cambie de inmediato las contraseñas iniciales en Dashboard → Usuarios.**

Para que las tablets lleguen al servidor, abra el puerto 3001:
- **Windows** (PowerShell como administrador):
  `New-NetFirewallRule -DisplayName "SIGER-IA" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow`
- **Linux** con ufw: `sudo ufw allow 3001/tcp`

### 5. Operación

| Tarea | Comando |
| :--- | :--- |
| Ver estado | `docker compose ps` · `curl http://localhost:3001/api/public/health` |
| Ver registros | `docker compose logs -f siger-web` (o `siger-ai`) |
| Detener / iniciar | `docker compose stop` · `docker compose start` |
| Actualizar a una versión nueva | `git fetch --tags && git checkout vX.Y.Z && docker compose up -d --build` (el esquema de la base se actualiza solo, sin borrar datos) |
| Respaldar la base (copia consistente, en caliente) | ver abajo |
| Desinstalar conservando datos | `docker compose down` |
| Borrar todo, **incluida la base** | `docker compose down -v` |

**Respaldo** (los mismos comandos en PowerShell y en bash). Deja `respaldo.db` en la carpeta actual:

```bash
echo "VACUUM INTO '/data/respaldo.db';" | docker compose exec -T siger-web node node_modules/prisma/build/index.js db execute --stdin --url file:/data/prod.db
docker compose cp siger-web:/data/respaldo.db ./respaldo.db
docker compose exec siger-web rm /data/respaldo.db
```

Para restaurar un respaldo (reemplaza los datos actuales):

```bash
docker compose cp ./respaldo.db siger-web:/data/restaurar.db
docker compose restart
```

Los contenedores se reinician solos si el servidor se reinicia (`restart: unless-stopped`); en Windows,
active en Docker Desktop *Start Docker Desktop when you sign in*.

### 6. Limitaciones y alternativa sin Docker

- **Impresoras térmicas:** las de red (ESC/POS por TCP, puerto 9100) funcionan desde el contenedor. Las
  conectadas por USB o puerto serie no son visibles dentro de Docker Desktop en Windows; en ese caso use
  la instalación sin Docker.
- **Instalación sin Docker** (Windows o Linux, con Node y Python en el equipo): `.\scripts\bootstrap.ps1`
  o `pnpm setup:all`, luego `pnpm build && pnpm start`. Detalle en la
  [guía de despliegue](docs/installation/deployment-guide.md).

---

## 🧪 Pruebas (Testing)

El proyecto incluye distintas suites de pruebas (Unitarias y End-to-End).

- **Tests unitarios (Vitest)**: `pnpm test`
- **Tests con Cobertura**: `pnpm test:coverage`
- **Tests E2E (Playwright)**: `pnpm test:e2e`
- **Tests E2E con Interfaz**: `pnpm test:e2e:ui`

---

## 🗄️ Base de Datos y Backups

Comandos útiles para la gestión de la base de datos:

- **Generar cliente de Prisma**: `pnpm db:generate`
- **Sincronizar esquema directamente**: `pnpm db:push`
- **Respaldar base de datos**: `pnpm db:backup`

---

## 📚 Documentación Técnica Viva (Living Documentation)

Toda la documentación técnica del incremento se mantiene y versiona directamente en el repositorio dentro del directorio [`docs/`](docs/README.md):

- **[Índice Maestro de Documentación](docs/README.md)**: Mapa general del repositorio y matriz de entregables técnicos.
- **[Manual de Usuario](docs/user/manual-usuario.md)**: Uso diario por rol con capturas reales y preguntas frecuentes.
- **[Notas de Versión v1.0.0](docs/release/release-notes-v1.0.0.md)** y **[CHANGELOG](CHANGELOG.md)**: Novedades, evidencia de calidad, limitaciones y backlog residual.
- **[Guía de Inicio Rápido (Quickstart)](docs/installation/quickstart.md)**: Despliegue en 1 paso, credenciales oficiales y diagnóstico.
- **[Guía de Instalación y Despliegue Reproducible](docs/installation/deployment-guide.md)**: Procedimiento paso a paso para entorno local bare-metal y Docker Compose.
- **[Especificación OpenAPI 3.1.0](docs/api/openapi.yaml)**: Contratos detallados de endpoints, parámetros, request bodies y respuestas HTTP.
- **[Diagrama Entidad-Relación (DER)](docs/data-model/er-diagram.md)**: Modelo relacional completo de las 15 tablas en sintaxis Mermaid.
- **[Diccionario de Datos](docs/data-model/data-dictionary.md)**: Descripción detallada de campos, tipos, defaults y reglas de integridad.
- **[Manifiesto de Documentación Viva](docs/architecture/living-docs-manifesto.md)**: Políticas de sincronización continua y prevención de drift en CI/CD.

---

*Desarrollado para ofrecer el mejor rendimiento y la más alta fiabilidad.*
