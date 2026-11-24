# Restaurant System

![Project Version](https://img.shields.io/badge/version-1.0.1-blue.svg)
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
