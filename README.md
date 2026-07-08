# Restaurant System

![Project Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
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

## 🛠 Requisitos Previos

Asegúrate de tener instalados los siguientes componentes antes de iniciar el proyecto:

- [Node.js](https://nodejs.org/es/) (v20 o superior recomendado)
- [pnpm](https://pnpm.io/es/) (Gestor de paquetes recomendado para este proyecto)
- [Python 3](https://www.python.org/) (Necesario para el entorno de Inteligencia Artificial)

---

## 🚀 Instalación y Configuración

1. **Instalar Dependencias**
   ```bash
   pnpm install
   ```

2. **Configurar la Base de Datos**
   El proyecto utiliza Prisma como ORM.
   ```bash
   pnpm db:setup
   ```
   *Este comando sincronizará la base de datos (push) y ejecutará los datos semilla (seed).*

3. **Configurar Entorno de Inteligencia Artificial**
   Si planeas utilizar las funcionalidades que dependen del AI Engine, asegúrate de configurar su entorno:
   ```bash
   pnpm ai:setup
   ```

---

## 💻 Uso del Proyecto

Existen múltiples maneras de correr el proyecto dependiendo de lo que necesites probar.

### Entorno de Desarrollo Web
Inicia la aplicación de Next.js en el entorno de desarrollo tradicional:
```bash
pnpm dev:next
```

### Entorno de Desarrollo Completo (con IA)
Levanta el servidor web y simultáneamente inicia el motor de IA localmente:
```bash
pnpm dev:ai:next
```

### Modo de Producción
Para compilar y correr el proyecto con optimizaciones de producción:
```bash
pnpm build
pnpm start
```

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

*Desarrollado para ofrecer el mejor rendimiento y la más alta fiabilidad.*
