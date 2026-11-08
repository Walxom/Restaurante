# Guía de Inicio Rápido (Quickstart) - SIGER-IA

**Sistema:** Sistema Integral de Gestión de Restaurantes y POS Asistido por IA  
**Tiempo estimado de despliegue:** Menos de 2 minutos  
**Modo:** Local-First (Single Machine / Red de Área Local LAN)

---

## ⚡ 1. Despliegue en 1 Solo Paso (Turnkey Bootstrap)

Para montar todo el sistema automáticamente desde cero (incluyendo verificación de dependencias de sistema, generación de `.env`, claves criptográficas seguras, base de datos SQLite, provisión automática del motor de IA en Python 3.10 con `uv` y diagnóstico pre-vuelo):

```powershell
# En Windows (Cero requisitos previos salvo PowerShell - descarga/configura todo):
.\scripts\bootstrap.ps1

# O si ya tienes Node.js y pnpm instalados:
pnpm setup:all
```

Este comando realiza automáticamente:
1. **Verificación de runtime de sistema**: Node.js (>= 20), gestor `pnpm` (activado vía Corepack si es necesario) y `uv` para Python.
2. **Generación Criptográfica de `.env`**: Crea `.env` con un `NEXTAUTH_SECRET` único generado con `crypto.randomBytes(32)` y configuración de `DATABASE_URL="file:./dev.db"`.
3. **Instalación de Dependencias**: Ejecución determinista de `pnpm install`.
4. **Sincronización de Base de Datos**: Creación de las 14 tablas relacionales mediante `prisma db push` y ejecución de semillas (`prisma/seed.ts` con usuarios, mesas, categorías, platos y recetas).
5. **Aprovisionamiento Automático de IA**: Creación del venv con Python 3.10 e instalación de FastAPI, Uvicorn y Scikit-Learn mediante `uv`.
6. **Diagnóstico Pre-Vuelo (`doctor.js`)**: Comprobación integral de puertos 3001 y 8000, archivos, seeds y permisos de disco.

---

## 🚀 2. Iniciar el Sistema

Una vez completado el montaje, inicia el servidor:

```bash
# Servidor web Next.js + WebSockets Socket.IO en tiempo real (puerto 3001)
pnpm dev
```

Abre en tu navegador:
👉 **[http://localhost:3001](http://localhost:3001)**

---

## 🔑 3. Credenciales Oficiales de Acceso

| Rol Operativo | Nombre de Usuario | Contraseña | Vistas y Permisos |
| :--- | :--- | :--- | :--- |
| **Administrador (`JEFE`)** | `jefe` | `admin123` | Dashboard administrativo, reportes de ventas, caja, menú, configuración e impresión térmica. |
| **Camarero (`MESERO`)** | `mesero` | `mesero123` | Toma de comandas (`/mesero`), mapa de mesas en tiempo real y despacho de pedidos. |

---

## 🩺 4. Diagnóstico del Sistema (`pnpm doctor`)

En cualquier momento puedes comprobar la integridad total del sistema ejecutando:

```bash
pnpm doctor
```

El diagnóstico validará exhaustivamente:
- **Puertos de Red**: Verificación de disponibilidad de los puertos `:3001` (Next.js/Socket.IO) y `:8000` (FastAPI AI Engine) mediante sockets de prueba temporales para prevenir conflictos `EADDRINUSE`.
- **Configuración y Seguridad**: Existencia del archivo `.env` y longitud segura de `NEXTAUTH_SECRET` (>= 32 caracteres).
- **Base de Datos SQLite**: Conexión activa a `dev.db`, conteo de usuarios y catálogo de productos sembrados.
- **Microservicio de IA Python**: Presencia del entorno virtual, ejecutable `uvicorn` y compatibilidad de Python 3.10+.
- **Permisos de Sistema**: Capacidad de lectura y escritura en disco.

---

## 🛠 5. Solución de Problemas Frecuentes

### Error: `Configuration 500` / `https://next-auth.js.org/errors#no_secret`
- **Causa:** No existe el archivo `.env` o la variable `NEXTAUTH_SECRET` está vacía.
- **Solución:** Ejecuta `pnpm setup:all` o genera una clave manualmente:
  ```bash
  # En PowerShell o Bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
  y colócala en `.env` como `NEXTAUTH_SECRET="tu_clave"`.

### Error: `Environment variable not found: DATABASE_URL`
- **Causa:** El cliente Prisma se ejecutó sin tener definida la URL de la base de datos.
- **Solución:** Verifica que en `.env` exista la línea:
  ```ini
  DATABASE_URL="file:./dev.db"
  ```
  `server.js` y `src/lib/prisma.ts` cuentan con detección nativa y fallback automático a `file:./dev.db`.

### Resetear la base de datos a estado limpio
Si deseas restablecer todas las comandas, mesas y catálogo a su estado original de fábrica:
```bash
pnpm db:setup
```

### Respaldar la base de datos local
Para generar una instantánea de seguridad con marca de tiempo en la carpeta `backups/`:
```bash
pnpm db:backup
```

---

> Para una guía técnica detallada que cubra despliegue en producción, Docker Compose y aprovisionamiento avanzado, consulte la [Guía Completa de Despliegue](deployment-guide.md) o regrese al [Índice de Documentación](../README.md).
