# Índice Maestro de Documentación Técnica Viva - SIGER-IA

**Sistema:** Sistema Integral de Gestión de Restaurantes y POS Asistido por IA  
**Institución / Contexto:** Universidad Privada del Norte (UPN) — Proyecto Integrador de Software  
**Beneficiario Piloto:** Cevichería y Restaurante Marino "Fondo Marino" / "Mr Frit" (Trujillo, Perú)  
**Arquitectura:** Local-First Híbrida (Next.js 15 + Prisma 6 + SQLite + Socket.IO + AI Engine FastAPI)  
**Marco Metodológico:** Documentación Técnica Viva (*Living Documentation / Docs-as-Code*)

---

## 🗺 Mapa y Navegación de Entregables Técnicos

Toda la documentación técnica del incremento se mantiene y versiona directamente en este directorio (`docs/`), sincronizada de manera continua con el código fuente y las pruebas automatizadas.

```
docs/
├── README.md                          # [Este archivo] Índice maestro y mapa del sitio
├── installation/                      # Guías de aprovisionamiento, despliegue y operación
│   ├── quickstart.md                  # Inicio Rápido Turnkey en menos de 2 minutos
│   └── deployment-guide.md            # Guía detallada de despliegue Bare-Metal y Docker Compose
├── api/                               # Contratos formales de interfaces
│   └── openapi.yaml                   # Especificación OpenAPI 3.1.0 completa de endpoints y esquemas
├── data-model/                        # Arquitectura y persistencia relacional
│   ├── er-diagram.md                  # Diagrama Entidad-Relación (DER) en Mermaid (15 tablas)
│   └── data-dictionary.md             # Diccionario de datos canónico con restricciones y tipos
├── architecture/                      # Principios rectores y calidad arquitectónica
│   ├── living-docs-manifesto.md       # Manifiesto y flujo de sincronización continua sin drift
│   └── guia-desarrollo.md             # Guía de desarrollo: comandos, arquitectura y convenciones
├── user/                              # Documentación para el usuario final
│   ├── manual-usuario.md              # Manual por rol (JEFE, MESERO, cocina, caja) + FAQ
│   └── img/                           # Capturas reales del sistema
└── release/                           # Entregas versionadas
    └── release-notes-v1.0.0.md        # Notas de versión, evidencia de calidad y backlog residual
```

---

## 📋 Resumen de Entregables por Categoría

### 1. Despliegue y Operación (`docs/installation/`)
* **[Guía de Inicio Rápido (Quickstart)](installation/quickstart.md)**:  
  Diseñada para desarrolladores y evaluadores que desean levantar el sistema en un solo comando mediante `.\scripts\bootstrap.ps1` o `pnpm setup:all`. Contiene la tabla de credenciales oficiales (`jefe` / `admin123` y `mesero` / `mesero123`), comandos de diagnóstico (`pnpm doctor`) y resolución de problemas comunes.
* **[Guía de Instalación y Despliegue Reproducible](installation/deployment-guide.md)**:  
  Documento técnico exhaustivo que detalla la matriz de instalación de una línea por sistema operativo (Windows `winget`, macOS `brew`, Linux `apt`), la arquitectura de aprovisionamiento hermético de Python 3.10 con Astral `uv`, la configuración de variables de entorno (`.env`), el despliegue bare-metal paso a paso y la ruta de contenedorización con Docker Compose.

### 2. Interfaces y Contratos de Servicio (`docs/api/`)
* **[Especificación OpenAPI 3.1.0](api/openapi.yaml)**:  
  Contrato formal estandarizado que describe todos los endpoints HTTP del backend Next.js (autenticación NextAuth, pedidos, mesas, productos, facturación electrónica, impresión térmica ESC/POS y control del microservicio de IA `/api/ai/service`), con sus respectivos esquemas de solicitud, validaciones Zod y códigos de respuesta HTTP.

### 3. Modelo de Datos y Persistencia (`docs/data-model/`)
* **[Diagrama Entidad-Relación (DER)](data-model/er-diagram.md)**:  
  Visualización interactiva en sintaxis Mermaid que modela la integridad referencial de las 15 tablas de la base de datos SQLite (usuarios, comandas, mesas, detalle de pedidos, recetas, insumos, inventario, facturas y configuración fiscal).
* **[Diccionario de Datos](data-model/data-dictionary.md)**:  
  Catálogo exhaustivo campo por campo que describe los nombres de columna, tipos de datos Prisma/SQLite, restricciones de clave primaria/foránea/unicidad, valores por defecto y reglas de negocio aplicadas.

### 4. Aseguramiento y Manifiesto de Calidad (`docs/architecture/`)
* **[Manifiesto de Documentación Técnica Viva](architecture/living-docs-manifesto.md)**:  
  Marco conceptual que rige el proyecto: principios *Docs-as-Code*, especificaciones ejecutables mediante pruebas unitarias/E2E (Vitest y Playwright) y mecanismos de prevención de desincronización (*anti-drift*) en pipelines de integración continua.
* **[Guía de Desarrollo](architecture/guia-desarrollo.md)**:  
  Referencia para desarrolladores: comandos de pnpm, arquitectura por capas (página → hook → API → servicio → Prisma), contratos de API clave, tiempo real con Socket.IO, autenticación y convenciones del código.

### 5. Usuario Final y Entregas (`docs/user/`, `docs/release/`)
* **[Manual de Usuario](user/manual-usuario.md)**:  
  Guía de uso diario por rol con capturas reales: pedidos, cobro, mesas, menú, inventario, caja con arqueo ciego, alertas de tiempo en cocina e IA, más preguntas frecuentes.
* **[Notas de Versión v1.0.0](release/release-notes-v1.0.0.md)**:  
  Novedades, evidencia de calidad (cobertura, E2E, k6), instrucciones de actualización, limitaciones conocidas y backlog residual. Historial completo en [`CHANGELOG.md`](../CHANGELOG.md).

---

## ⚙ Regla de Oro para Mantenedores y Contribuidores

> [!IMPORTANT]
> **Prohibición de Desincronización (No Documentation Drift):**  
> Ningún Pull Request que altere rutas API, esquemas Prisma o flujos de despliegue puede ser fusionado sin actualizar simultáneamente el archivo correspondiente en `docs/`:
> 1. Si cambias un endpoint $\rightarrow$ actualiza `docs/api/openapi.yaml`.
> 2. Si modificas `schema.prisma` $\rightarrow$ ejecuta `pnpm db:generate` y actualiza `docs/data-model/`.
> 3. Si agregas prerrequisitos o comandos $\rightarrow$ actualiza `docs/installation/` y el `README.md` principal.
