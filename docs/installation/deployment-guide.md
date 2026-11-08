# Guía de Instalación y Despliegue Reproducible - SIGER-IA

**Sistema:** Sistema Integral de Gestión de Restaurantes y POS Asistido por IA  
**Entorno de Destino:** Cevichería y Restaurante Marino "Fondo Marino" / Piloto Operativo "Mr Frit" (Trujillo, Perú)  
**Arquitectura:** Local-First Híbrida (Next.js 15 + Prisma 6 + SQLite + Socket.IO + AI Engine en Python FastAPI)  
**Semana:** 11 - Documentación Técnica Viva (100% Verificable contra Código Fuente)  

---

## 1. Requisitos Previos del Sistema

Antes de iniciar la instalación de SIGER-IA, compruebe que el servidor local o estación de trabajo cumpla con las siguientes herramientas instaladas:

| Herramienta | Versión Mínima Verificada | Propósito en la Arquitectura | Comando de Comprobación |
| :--- | :--- | :--- | :--- |
| **Node.js** | v20.10.0 LTS o superior | Runtime de ejecución del backend Next.js y WebSockets (`server.js`) | `node -v` |
| **pnpm** | v9.0.0 o superior | Gestor de paquetes oficial del proyecto (`pnpm-lock.yaml`) | `pnpm -v` |
| **uv** / **Python** | uv 0.4+ / Python 3.10+ | Gestor ultrarrápido y runtime para el microservicio de IA (`ai_engine`) | `uv --version` |
| **Git** | v2.40 o superior | Control de versiones y trazabilidad de ramas | `git --version` |
| **Docker & Compose** | Docker v24+ / Compose v2.20+ | Despliegue contenerizado en servidor on-premise *(Ruta B)* | `docker compose version` |

### ⚡ Matriz de Instalación Rápida en 1 Línea (One-Liner Matrix)

Para preparar una máquina limpia con todos los prerrequisitos en segundos:

* **Windows (PowerShell Administrador o Usuario)**:
  ```powershell
  winget install --id OpenJS.NodeJS.LTS -e; powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```
  *(O ejecuta directamente `.\scripts\bootstrap.ps1`, el cual detecta ausencias y te ofrece instalarlos automáticamente).*

* **macOS (Homebrew)**:
  ```bash
  brew install node uv git && corepack enable
  ```

* **Linux (Ubuntu / Debian)**:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs git && curl -LsSf https://astral.sh/uv/install.sh | sh && corepack enable
  ```

> [!NOTE]
> Gracias a **Astral `uv`**, no es necesario compilar ni descargar instaladores pesados de Python manualmente. `uv` aprovisiona automáticamente la versión exacta de Python requerida (3.10) de manera hermética e instantánea.

---

## 2. Matriz de Variables de Entorno

Copie la plantilla `.env.example` para crear el archivo `.env` en la raíz del proyecto. Los parámetros reales y verificables son:

```ini
# --- Base de Datos Prisma (SQLite Local-First) ---
DATABASE_URL="file:./dev.db"

# --- Servidor Web Next.js & Socket.IO ---
PORT=3001
NODE_ENV=development
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="siger_super_secret_jwt_key_2026_upn_trujillo"

# --- Motor de Inteligencia Artificial (Microservicio Python FastAPI) ---
AI_ENGINE_URL="http://localhost:8000"
AI_ENGINE_ENABLED=true

# --- Red de Impresión Térmica ESC/POS (Seed Oficial) ---
PRINTER_SERVICE_ENABLED=true
DEFAULT_KITCHEN_PRINTER_IP="192.168.0.100"
DEFAULT_PRINTER_PORT=9100

# --- WebSockets en Tiempo Real ---
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
```

---

## 3. Ruta A: Despliegue en Entorno de Desarrollo Local (Bare-Metal)

> [!TIP]
> **Modo Automático Recomendado (Turnkey)**:  
> Si estás en Windows, ejecuta simplemente `.\scripts\bootstrap.ps1` o en cualquier SO `pnpm setup:all`. Esto ejecutará los Pasos 2, 3 y 4 de forma completamente orquestada y validará la salud del entorno con `pnpm doctor`.

Si prefieres realizar el procedimiento paso a paso de forma manual:

### Paso 1: Clonación del Repositorio y Checkout de Rama
```bash
git clone https://github.com/josechafloque/siger-ia.git
cd siger-ia
git checkout main
```

### Paso 2: Instalación de Dependencias Node.js
Instale de forma limpia todas las dependencias del proyecto utilizando el gestor `pnpm`:
```bash
pnpm install
```

### Paso 3: Inicialización y Poblado de la Base de Datos
Este comando ejecuta el script oficial `db:setup` definido en `package.json` (L18), el cual sincroniza las 14 tablas en SQLite y ejecuta la semilla `prisma/seed.ts`:
```bash
pnpm db:setup
```
*(Equivale internamente a `pnpm prisma db push && pnpm tsx --env-file-if-exists=.env prisma/seed.ts`).*

### Paso 4: Configuración del Entorno de Inteligencia Artificial
Configure el entorno virtual de Python e instale las bibliotecas de aprendizaje automático (FastAPI, Uvicorn, Prophet) mediante el script configurado en `package.json` (L26):
```bash
pnpm ai:setup
```

### Paso 5: Ejecución Simultánea de la Aplicación e IA
Inicie de forma concurrente el servidor web con WebSockets (`server.js` en el puerto **3001**) y el microservicio de IA (`uvicorn` en el puerto **8000**) mediante:
```bash
pnpm dev:ai
```
*(Si desea probar el frontend rápido con Turbopack sin WebSockets, puede ejecutar alternativamente `pnpm dev:ai:next` en el puerto 3000).*

---

## 4. Ruta B: Despliegue Automatizado con Docker Compose

Para servidores dedicados en el salón o caja de cobranza:

### Paso 1: Construcción y Levantamiento
```bash
docker compose up -d --build
```

### Paso 2: Verificación de Contenedores Activos
```bash
docker compose ps
```
Debe observar los contenedores con estado `Up (healthy)`.

---

## 5. Cuentas de Acceso Preconfiguradas en la Semilla (100% Reales)

El script semilla canónico (`prisma/seed.ts`, L294-297) genera las siguientes cuentas de prueba con hash bcrypt:

| Usuario | Contraseña | Rol en Código | Vistas y Rutas Autorizadas en `middleware.ts` |
| :--- | :--- | :---: | :--- |
| **`jefe`** | `admin123` | **`JEFE`** | Acceso total a `/dashboard`, `/menu`, `/mesas`, `/impresion` y auditoría de ventas. |
| **`mesero`** | `mesero123` | **`MESERO`** | Terminal táctil de mozo en `/mesero`, plano de mesas y toma de comandas en `/pedidos`. |

---

## 6. Procedimiento de Verificación y Pruebas Automatizadas

Compruebe la integridad del sistema ejecutando las suites de prueba reales configuradas en `package.json`:

```bash
# 1. Pruebas unitarias y de servicios (Vitest)
pnpm test

# 2. Pruebas con reporte de cobertura (debe superar el 80% según DoD)
pnpm test:coverage

# 3. Pruebas End-to-End con Playwright
pnpm test:e2e
```

---

## 7. Solución de Problemas Frecuentes (Troubleshooting)

### Problema 1: El puerto 3001 u 8000 ya se encuentra en uso
- **Diagnóstico:** Otra instancia de Node.js o Uvicorn quedó activa en segundo plano.
- **Solución en Windows (PowerShell):**
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
  ```

### Problema 2: Error de conexión con la impresora térmica (`ECONNREFUSED 192.168.0.100:9100`)
- **Diagnóstico:** La impresora ZJ-8360 está apagada o no tiene asignada la IP estática `192.168.0.100` en el router del restaurante.
- **Solución:** Compruebe con `ping 192.168.0.100`. Si no dispone del hardware físico en desarrollo, el servicio activa automáticamente el modo simulador imprimiendo el voucher en la consola sin bloquear la comanda.

### Problema 3: Error de concurrencia en base de datos (`database is locked` en SQLite)
- **Diagnóstico:** Acceso concurrente de múltiples procesos sin pool adecuado.
- **Solución:** Ejecute `pnpm db:generate` y reinicie el servidor con `pnpm dev:ai`.
