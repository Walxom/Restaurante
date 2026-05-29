# Análisis de Líneas de Código (LOC)
## Proyecto: Bendistaurante — Sistema POS para Cevichería "Fondo Marino"

**Curso:** Calidad y Pruebas de Software  
**Fecha de análisis:** 29/05/2026  
**Herramienta:** PowerShell + métricas de sistema de archivos  
**Autores:** Lujan Guevara J. / Porras Pereda J. / Chafloque Salinas J.L. / Terrones Quezada J.F.

---

## 1. Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Lenguajes utilizados** | TypeScript, TSX (React), Python, Prisma Schema |
| **Total de archivos fuente** | **310 archivos** |
| **Líneas de código estimadas (LOC)** | **~35,337 líneas** |
| **Tamaño total del código fuente** | **~1,533 KB** |
| **Módulo con mayor densidad** | `features/` (110 archivos) |

---

## 2. Distribución por Lenguaje

| Lenguaje | Archivos | Tamaño (KB) | LOC Estimado | % del total |
|----------|----------|-------------|--------------|-------------|
| **TypeScript / TSX** (Frontend + Backend) | 297 | 1,464.7 | ~33,330 | 94.3% |
| **Python** (Motor de IA) | 13 | 68.6 | ~2,007 | 5.7% |
| **Prisma Schema** | 1 | 8.1 | ~264 | <1% |
| **TOTAL** | **311** | **1,541.4** | **~35,601** | 100% |

> **Nota metodológica:** Las LOC se calcularon a partir del tamaño en bytes de cada archivo, usando un factor de conversión de 45 bytes/línea para TypeScript y 35 bytes/línea para Python (valores promedio estándar para código bien estructurado con comentarios JSDoc y tipado estricto).

---

## 3. Distribución por Módulo (TypeScript/TSX)

| Módulo | Archivos | Descripción |
|--------|----------|-------------|
| `src/features/` | **110** | Lógica de negocio por dominio (auth, billing, orders, inventory, menu, tables, ai-analytics) |
| `src/app/` | **99** | Páginas Next.js + API Routes del backend (pedidos, mesas, dashboard, login, impresión) |
| `src/components/` | **53** | Componentes UI reutilizables (modales, tablas, formularios) |
| `src/services/` | **22** | Servicios de comunicación (Socket.IO, HTTP clients, printer service) |
| `src/lib/` | **6** | Utilidades compartidas (auth config, prisma client, helpers) |
| `src/types/` | **4** | Definiciones de tipos TypeScript globales |
| `src/hooks/` | **2** | React Hooks personalizados |
| **TOTAL** | **297** | |

---

## 4. Top 15 Archivos por Tamaño (Mayor Complejidad)

| # | Archivo | Módulo | Tamaño (KB) | LOC Est. | Descripción |
|---|---------|--------|-------------|----------|-------------|
| 1 | `server-thermal-printer.ts` | services | 25.9 KB | ~575 | Servidor de impresión térmica ESC/POS por TCP |
| 2 | `page.tsx` (dashboard/pedidos) | app | 24.3 KB | ~540 | Vista principal de gestión de pedidos |
| 3 | `page.tsx` (dashboard/inventario) | app | 23.5 KB | ~522 | Gestión completa de inventario |
| 4 | `thermal-printer.ts` | services | 20.9 KB | ~464 | Driver de impresora térmica (comandos ESC/POS) |
| 5 | `EditOrderModal.tsx` | features | 20.0 KB | ~444 | Modal de edición de órdenes |
| 6 | `CreateInvoiceModal.tsx` | features/billing | 19.7 KB | ~437 | Módulo de facturación (Boleta/Factura + IGV) |
| 7 | `sales-analytics-panel.tsx` | features | 18.1 KB | ~402 | Panel de análisis de ventas |
| 8 | `thermal-printer-commands.ts` | services | 16.6 KB | ~368 | Generador de comandos ESC/POS por tipo de ticket |
| 9 | `page.tsx` (dashboard principal) | app | 16.0 KB | ~355 | Dashboard gerencial con KPIs |
| 10 | `PrintOrderButton.tsx` | components | 15.6 KB | ~346 | Componente de impresión de comanda |
| 11 | `CompleteOrderModal.tsx` | features | 15.5 KB | ~344 | Modal de cierre/pago de orden |
| 12 | `page.tsx` (cocina/KDS) | app | 15.5 KB | ~344 | Monitor de cocina en tiempo real |
| 13 | `route.ts` (API invoices) | app/api | 14.9 KB | ~331 | Endpoint REST de facturación |
| 14 | `IngredientModal.tsx` | features/inventory | 14.9 KB | ~331 | CRUD de ingredientes |
| 15 | `route.ts` (API orders) | app/api | 14.8 KB | ~328 | Endpoint REST de órdenes |

---

## 5. Distribución por Módulo del AI Engine (Python)

| Archivo Python | Tamaño | Descripción |
|----------------|--------|-------------|
| `llm_service.py` | 11.6 KB | Integración con Gemini API + Circuit Breaker + Rate Limiter |
| `chat_service.py` | 9.9 KB | Servicio de chat inteligente con historial de conversación |
| `main.py` | 5.6 KB | FastAPI app principal + endpoints REST |
| `services/` (3 archivos) | ~18 KB | Forecast, Inventory Predictor, Market Basket (Apriori) |
| `scripts/` (3 archivos) | ~15 KB | Generación de datos sintéticos, setup de entorno |
| `database.py` | 2.1 KB | Conexión SQLite desde Python |

---

## 6. Análisis de Complejidad por Densidad de Código

La distribución de LOC refleja una **arquitectura bien modularizada**:

- El módulo **`features/`** concentra el 37% de los archivos (110/297), alineado con la arquitectura **Feature-Sliced Design** adoptada.
- Los archivos de mayor tamaño corresponden a módulos de **alta complejidad funcional** (impresión térmica, facturación, inventario), lo cual es esperado.
- El motor de IA en Python representa el **5.7% del código total** pero implementa la capa de inteligencia predictiva del sistema.

### Comparativa de densidad por módulo:

```
features/    ████████████████████████████  110 archivos (37.0%)
app/         █████████████████████████     99 archivos  (33.3%)
components/  █████████████                53 archivos  (17.8%)
services/    ██████                       22 archivos  (7.4%)
lib/types/   ██                            10 archivos  (3.4%)
Python (AI)  ████                         13 archivos  (4.4%)
```

---

## 7. Conclusión

El proyecto **Bendistaurante** acumula aproximadamente **35,600 líneas de código fuente** distribuidas en **311 archivos** escritos en TypeScript/TSX y Python. Esta magnitud es coherente con un sistema de información empresarial completo que cubre autenticación, gestión de pedidos, inventario, facturación con IGV, impresión térmica ESC/POS, comunicación en tiempo real (Socket.IO), y análisis predictivo mediante inteligencia artificial.

La distribución equilibrada entre `features/` (lógica de negocio), `app/` (interfaz y API) y `components/` (UI reutilizable) demuestra la aplicación de buenas prácticas de arquitectura de software, favoreciendo la **mantenibilidad** y **escalabilidad** del sistema.
