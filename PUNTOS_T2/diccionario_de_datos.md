# Diccionario de Datos y Estructura de la Base de Datos
## Proyecto: Bendistaurante — Sistema POS Cevichería "Fondo Marino"

**Curso:** Calidad y Pruebas de Software  
**Gestor de BD:** SQLite (modo WAL) mediante Prisma ORM  
**Fecha:** 29/05/2026  
**Autores:** Lujan Guevara J. / Porras Pereda J. / Chafloque Salinas J.L. / Terrones Quezada J.F.

---

## 1. Diagrama de Relaciones (Resumen)

```
users ──────────────────┬──── orders ────┬──── order_items ──── products ──── categories
                        │                │                         │
                        │                └──── invoices ──── invoice_items
                        │
                   printers
                   
ingredients ──── recipe_ingredients ──── recipes ──── products
     │
ingredient_categories

system_config  (tabla independiente de configuración global)
```

**Total de tablas:** 14  
**Total de relaciones:** 16 FK (Foreign Keys)

---

## 2. Diccionario de Datos por Tabla

---

### 📋 Tabla: `users` — Usuarios del Sistema

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único del usuario |
| 2 | `username` | TEXT | — | — | ✅ | ✅ | — | Nombre de usuario para login |
| 3 | `name` | TEXT | — | — | ✅ | — | — | Nombre completo del empleado |
| 4 | `password` | TEXT | — | — | ✅ | — | — | Contraseña encriptada con BCrypt |
| 5 | `role` | TEXT | — | — | ✅ | — | "MESERO" | Rol del usuario: ADMINISTRADOR / MESERO / CAJERO / COCINERO |
| 6 | `isActive` | BOOLEAN | — | — | ✅ | — | true | Estado activo/inactivo del empleado |
| 7 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de registro en el sistema |
| 8 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación (auto-actualizable) |

**Relaciones:** `users` → `orders` (1:N) · `users` → `invoices` (1:N) · `users` → `printers` (1:N creator/updater)

---

### 📋 Tabla: `categories` — Categorías de Productos del Menú

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único de la categoría |
| 2 | `name` | TEXT | — | — | ✅ | ✅ | — | Nombre de la categoría (ej: "Entradas", "Platos de fondo") |
| 3 | `description` | TEXT | — | — | — | — | NULL | Descripción opcional de la categoría |
| 4 | `isActive` | BOOLEAN | — | — | ✅ | — | true | Indica si la categoría está activa en el menú |
| 5 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de creación |
| 6 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |

**Relaciones:** `categories` → `products` (1:N)

---

### 📋 Tabla: `products` — Productos del Menú

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único del producto |
| 2 | `name` | TEXT | — | — | ✅ | — | — | Nombre del plato o producto |
| 3 | `description` | TEXT | — | — | — | — | NULL | Descripción o presentación del plato |
| 4 | `price` | DECIMAL | — | — | ✅ | — | — | Precio de venta en Soles (PEN) |
| 5 | `isAvailable` | BOOLEAN | — | — | ✅ | — | true | Disponibilidad actual (activable en tiempo real) |
| 6 | `isActive` | BOOLEAN | — | — | ✅ | — | true | Estado permanente del producto en el sistema |
| 7 | `categoryId` | TEXT (CUID) | — | ✅ categories.id | ✅ | — | — | FK → Categoría del producto |
| 8 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de registro |
| 9 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |

**Relaciones:** `products` → `categories` (N:1) · `products` → `order_items` (1:N) · `products` → `recipes` (1:1 opcional)

---

### 📋 Tabla: `tables` — Mesas del Restaurante

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único de la mesa |
| 2 | `number` | INTEGER | — | — | ✅ | ✅ | — | Número de mesa (identificador visual) |
| 3 | `capacity` | INTEGER | — | — | ✅ | — | — | Capacidad máxima de comensales |
| 4 | `status` | TEXT | — | — | ✅ | — | "DISPONIBLE" | Estado actual: DISPONIBLE / OCUPADA / RESERVADA |
| 5 | `isActive` | BOOLEAN | — | — | ✅ | — | true | Si la mesa está habilitada en el sistema |
| 6 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de registro |
| 7 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |

**Relaciones:** `tables` → `orders` (1:N)

---

### 📋 Tabla: `orders` — Pedidos / Órdenes

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único de la orden |
| 2 | `orderNumber` | TEXT | — | — | ✅ | ✅ | — | Número correlativo del pedido (ej: "ORD-0001") |
| 3 | `type` | TEXT | — | — | ✅ | — | "MESA" | Tipo: MESA / DELIVERY / PARA_LLEVAR |
| 4 | `status` | TEXT | — | — | ✅ | — | "CONFIRMED" | Estado: CONFIRMED / PREPARING / READY / SERVED / PAID / CANCELLED |
| 5 | `totalAmount` | DECIMAL | — | — | ✅ | — | 0 | Monto total del pedido en Soles |
| 6 | `tableId` | TEXT (CUID) | — | ✅ tables.id | — | — | NULL | FK → Mesa asignada (NULL si es Delivery/Para llevar) |
| 7 | `userId` | TEXT (CUID) | — | ✅ users.id | ✅ | — | — | FK → Mesero/usuario que registró el pedido |
| 8 | `customerName` | TEXT | — | — | — | — | NULL | Nombre del cliente (opcional) |
| 9 | `customerDni` | TEXT | — | — | — | — | NULL | DNI del cliente para comprobante |
| 10 | `customerPhone` | TEXT | — | — | — | — | NULL | Teléfono (requerido en delivery) |
| 11 | `customerAddress` | TEXT | — | — | — | — | NULL | Dirección de entrega (delivery) |
| 12 | `customerAddressReference` | TEXT | — | — | — | — | NULL | Referencia adicional de dirección |
| 13 | `notes` | TEXT | — | — | — | — | NULL | Notas especiales del pedido |
| 14 | `startDate` | DATETIME | — | — | — | — | NULL | Fecha/hora de inicio de atención |
| 15 | `endDate` | DATETIME | — | — | — | — | NULL | Fecha/hora de cierre del pedido |
| 16 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de creación del registro |
| 17 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |

**Relaciones:** `orders` → `users` (N:1) · `orders` → `tables` (N:1) · `orders` → `order_items` (1:N) · `orders` → `invoices` (1:1)

---

### 📋 Tabla: `order_items` — Ítems de Pedido

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único del ítem |
| 2 | `quantity` | INTEGER | — | — | ✅ | — | — | Cantidad solicitada del producto |
| 3 | `unitPrice` | DECIMAL | — | — | ✅ | — | — | Precio unitario al momento del pedido |
| 4 | `subtotal` | DECIMAL | — | — | ✅ | — | — | Subtotal calculado (quantity × unitPrice) |
| 5 | `notes` | TEXT | — | — | — | — | NULL | Nota especial del ítem (ej: "sin cebolla") |
| 6 | `status` | TEXT | — | — | ✅ | — | "PENDING" | Estado: PENDING / PREPARING / READY |
| 7 | `orderId` | TEXT (CUID) | — | ✅ orders.id | ✅ | — | — | FK → Pedido padre (CASCADE DELETE) |
| 8 | `productId` | TEXT (CUID) | — | ✅ products.id | ✅ | — | — | FK → Producto solicitado |
| 9 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de creación |
| 10 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |

---

### 📋 Tabla: `ingredient_categories` — Categorías de Ingredientes

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único |
| 2 | `name` | TEXT | — | — | ✅ | ✅ | — | Nombre de la categoría (ej: "Mariscos", "Verduras") |
| 3 | `description` | TEXT | — | — | — | — | NULL | Descripción de la categoría |
| 4 | `color` | TEXT | — | — | — | — | NULL | Color HEX para identificación visual en UI |
| 5 | `isActive` | BOOLEAN | — | — | ✅ | — | true | Estado de la categoría |
| 6 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de creación |
| 7 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |

---

### 📋 Tabla: `ingredients` — Ingredientes / Insumos

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único del ingrediente |
| 2 | `name` | TEXT | — | — | ✅ | ✅ | — | Nombre del insumo (ej: "Ají amarillo") |
| 3 | `unit` | TEXT | — | — | ✅ | — | — | Unidad de medida base (kg, L, unidad) |
| 4 | `unitCategory` | TEXT | — | — | — | — | NULL | Categoría de unidad (peso/volumen/unidad) |
| 5 | `currentStock` | FLOAT | — | — | ✅ | — | — | Stock actual disponible |
| 6 | `minStock` | FLOAT | — | — | ✅ | — | — | Stock mínimo de alerta (punto de reorden) |
| 7 | `maxStock` | FLOAT | — | — | — | — | NULL | Stock máximo de almacén |
| 8 | `cost` | FLOAT | — | — | — | — | NULL | Costo unitario de compra (en Soles) |
| 9 | `categoryId` | TEXT (CUID) | — | ✅ ingredient_categories.id | — | — | NULL | FK → Categoría del ingrediente |
| 10 | `isActive` | BOOLEAN | — | — | ✅ | — | true | Estado activo/inactivo |
| 11 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de registro |
| 12 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |

---

### 📋 Tabla: `recipes` — Recetas de Platos

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único de la receta |
| 2 | `productId` | TEXT (CUID) | — | ✅ products.id | ✅ | ✅ | — | FK → Producto asociado (1:1, CASCADE DELETE) |
| 3 | `instructions` | TEXT | — | — | — | — | NULL | Instrucciones de preparación |
| 4 | `prepTime` | INTEGER | — | — | — | — | NULL | Tiempo estimado de preparación (minutos) |
| 5 | `servings` | INTEGER | — | — | ✅ | — | 1 | Número de porciones de la receta |
| 6 | `isActive` | BOOLEAN | — | — | ✅ | — | true | Estado de la receta |
| 7 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de creación |
| 8 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |

---

### 📋 Tabla: `recipe_ingredients` — Ingredientes por Receta

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único |
| 2 | `recipeId` | TEXT (CUID) | — | ✅ recipes.id | ✅ | — | — | FK → Receta padre (CASCADE DELETE) |
| 3 | `ingredientId` | TEXT (CUID) | — | ✅ ingredients.id | ✅ | — | — | FK → Ingrediente utilizado |
| 4 | `quantity` | FLOAT | — | — | ✅ | — | — | Cantidad requerida del ingrediente |
| 5 | `unit` | TEXT | — | — | ✅ | — | — | Unidad de medida para esta receta |
| 6 | `notes` | TEXT | — | — | — | — | NULL | Observaciones (ej: "cortado en juliana") |
| 7 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de creación |
| 8 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |

**Restricción UNIQUE:** `(recipeId, ingredientId)` — Un ingrediente no puede repetirse en la misma receta

---

### 📋 Tabla: `system_config` — Configuración Global del Sistema

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único |
| 2 | `companyName` | TEXT | — | — | ✅ | — | — | Razón social del restaurante |
| 3 | `companyAddress` | TEXT | — | — | — | — | NULL | Dirección fiscal |
| 4 | `companyPhone` | TEXT | — | — | — | — | NULL | Teléfono de contacto |
| 5 | `companyRuc` | TEXT | — | — | — | — | NULL | RUC del establecimiento (11 dígitos) |
| 6 | `taxRate` | FLOAT | — | — | ✅ | — | 0.18 | Tasa de IGV (18% vigente en Perú) |
| 7 | `currency` | TEXT | — | — | ✅ | — | "PEN" | Moneda: PEN (Soles peruanos) |
| 8 | `timezone` | TEXT | — | — | ✅ | — | "America/Lima" | Zona horaria (UTC-5, Perú) |
| 9 | `isPrinterServiceEnabled` | BOOLEAN | — | — | ✅ | — | true | Habilitar/deshabilitar impresión térmica |
| 10 | `lastBoletaNumber` | INTEGER | — | — | ✅ | — | 0 | Último correlativo de boleta emitida |
| 11 | `lastFacturaNumber` | INTEGER | — | — | ✅ | — | 0 | Último correlativo de factura emitida |
| 12 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de creación |
| 13 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |

---

### 📋 Tabla: `invoices` — Comprobantes de Pago

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único del comprobante |
| 2 | `number` | TEXT | — | — | ✅ | ✅ | — | Número correlativo (ej: "BOL-00001") |
| 3 | `type` | TEXT | — | — | ✅ | — | — | Tipo: BOLETA / FACTURA |
| 4 | `orderId` | TEXT (CUID) | — | ✅ orders.id | — | ✅ | NULL | FK → Pedido asociado (1:1) |
| 5 | `customerName` | TEXT | — | — | — | — | NULL | Nombre del cliente en el comprobante |
| 6 | `customerRuc` | TEXT | — | — | — | — | NULL | RUC del cliente (solo en Factura) |
| 7 | `customerAddress` | TEXT | — | — | — | — | NULL | Dirección fiscal del cliente |
| 8 | `subtotal` | DECIMAL | — | — | ✅ | — | — | Base imponible (sin IGV) |
| 9 | `igv` | DECIMAL | — | — | ✅ | — | — | Monto de IGV calculado (18%) |
| 10 | `total` | DECIMAL | — | — | ✅ | — | — | Total final (subtotal + IGV) |
| 11 | `paymentMethod` | TEXT | — | — | ✅ | — | — | Método: EFECTIVO / TARJETA / YAPE / PLIN |
| 12 | `amountPaid` | DECIMAL | — | — | ✅ | — | — | Monto entregado por el cliente |
| 13 | `change` | DECIMAL | — | — | ✅ | — | 0 | Vuelto entregado al cliente |
| 14 | `issuedAt` | DATETIME | — | — | ✅ | — | now() | Fecha y hora de emisión |
| 15 | `issuedBy` | TEXT (CUID) | — | ✅ users.id | ✅ | — | — | FK → Cajero que emitió el comprobante |
| 16 | `status` | TEXT | — | — | ✅ | — | "ISSUED" | Estado: ISSUED / PAID / CANCELLED |
| 17 | `cancelledAt` | DATETIME | — | — | — | — | NULL | Fecha de anulación (si aplica) |
| 18 | `cancelReason` | TEXT | — | — | — | — | NULL | Motivo de anulación |

---

### 📋 Tabla: `invoice_items` — Ítems del Comprobante

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único |
| 2 | `invoiceId` | TEXT (CUID) | — | ✅ invoices.id | ✅ | — | — | FK → Comprobante padre (CASCADE DELETE) |
| 3 | `description` | TEXT | — | — | ✅ | — | — | Descripción del producto en el comprobante |
| 4 | `quantity` | INTEGER | — | — | ✅ | — | — | Cantidad facturada |
| 5 | `unitPrice` | DECIMAL | — | — | ✅ | — | — | Precio unitario en el comprobante |
| 6 | `total` | DECIMAL | — | — | ✅ | — | — | Total del ítem (quantity × unitPrice) |

---

### 📋 Tabla: `printers` — Impresoras Térmicas

| # | Campo | Tipo | PK | FK | NOT NULL | Único | Default | Descripción |
|---|-------|------|----|----|----------|-------|---------|-------------|
| 1 | `id` | TEXT (CUID) | ✅ | — | ✅ | ✅ | cuid() | Identificador único de la impresora |
| 2 | `name` | TEXT | — | — | ✅ | — | — | Nombre descriptivo (ej: "Impresora Caja") |
| 3 | `type` | TEXT | — | — | ✅ | — | — | Tipo: RECEIPT / KITCHEN |
| 4 | `connectionType` | TEXT | — | — | ✅ | — | — | Conexión: NETWORK / USB / SERIAL / BLUETOOTH |
| 5 | `ipAddress` | TEXT | — | — | — | — | NULL | IP de la impresora (si es NETWORK) |
| 6 | `port` | INTEGER | — | — | — | — | NULL | Puerto TCP (ej: 9100 estándar ESC/POS) |
| 7 | `usbPath` | TEXT | — | — | — | — | NULL | Ruta USB del dispositivo |
| 8 | `serialPort` | TEXT | — | — | — | — | NULL | Puerto serie (COM3, etc.) |
| 9 | `bluetoothAddress` | TEXT | — | — | — | — | NULL | Dirección MAC Bluetooth |
| 10 | `paperWidth` | INTEGER | — | — | ✅ | — | 58 | Ancho de papel en mm (58mm o 80mm) |
| 11 | `charactersPerLine` | INTEGER | — | — | ✅ | — | 32 | Caracteres por línea según ancho de papel |
| 12 | `timeout` | INTEGER | — | — | ✅ | — | 15000 | Timeout de conexión en ms |
| 13 | `reconnectAttempts` | INTEGER | — | — | ✅ | — | 3 | Intentos de reconexión automática |
| 14 | `reconnectDelay` | INTEGER | — | — | ✅ | — | 2000 | Delay entre reintentos (ms) |
| 15 | `charset` | TEXT | — | — | ✅ | — | "PC437" | Charset de caracteres ESC/POS |
| 16 | `codepage` | TEXT | — | — | ✅ | — | "437" | Código de página para caracteres especiales |
| 17 | `status` | TEXT | — | — | ✅ | — | "ACTIVE" | Estado: ACTIVE / INACTIVE / ERROR |
| 18 | `isDefault` | BOOLEAN | — | — | ✅ | — | false | Impresora predeterminada del sistema |
| 19 | `description` | TEXT | — | — | — | — | NULL | Descripción adicional |
| 20 | `location` | TEXT | — | — | — | — | NULL | Ubicación física (ej: "Caja principal") |
| 21 | `headerText` | TEXT | — | — | — | — | NULL | Texto de encabezado personalizado del ticket |
| 22 | `footerText` | TEXT | — | — | — | — | NULL | Texto de pie de página del ticket |
| 23 | `logo` | TEXT | — | — | — | — | NULL | Logo en Base64 para el ticket |
| 24 | `createdAt` | DATETIME | — | — | ✅ | — | now() | Fecha de registro |
| 25 | `updatedAt` | DATETIME | — | — | ✅ | — | auto | Última modificación |
| 26 | `createdBy` | TEXT (CUID) | — | ✅ users.id | ✅ | — | — | FK → Usuario que registró la impresora |
| 27 | `updatedBy` | TEXT (CUID) | — | ✅ users.id | — | — | NULL | FK → Último usuario que modificó |

---

## 3. Resumen de Estructura

| Tabla | Campos | PKs | FKs | Descripción |
|-------|--------|-----|-----|-------------|
| `users` | 8 | 1 | 0 | Empleados y roles del sistema |
| `categories` | 6 | 1 | 0 | Categorías del menú |
| `products` | 9 | 1 | 1 | Platos y productos del menú |
| `tables` | 7 | 1 | 0 | Mesas del restaurante |
| `orders` | 17 | 1 | 2 | Pedidos (mesa/delivery/llevar) |
| `order_items` | 10 | 1 | 2 | Líneas de detalle de cada pedido |
| `ingredient_categories` | 7 | 1 | 0 | Categorías de insumos |
| `ingredients` | 12 | 1 | 1 | Insumos e inventario |
| `recipes` | 8 | 1 | 1 | Recetas de platos |
| `recipe_ingredients` | 8 | 1 | 2 | Ingredientes por receta |
| `system_config` | 13 | 1 | 0 | Configuración global del sistema |
| `invoices` | 18 | 1 | 2 | Boletas y facturas emitidas |
| `invoice_items` | 6 | 1 | 1 | Líneas de detalle del comprobante |
| `printers` | 27 | 1 | 2 | Impresoras térmicas configuradas |
| **TOTAL** | **156** | **14** | **16** | |

---

## 4. Tipos de Datos Utilizados

| Tipo Prisma | Tipo SQLite | Descripción |
|-------------|-------------|-------------|
| `String` (CUID) | TEXT | Identificadores únicos generados con CUID |
| `String` | TEXT | Cadenas de texto generales |
| `Int` | INTEGER | Números enteros (cantidades, puertos, etc.) |
| `Float` | REAL | Números decimales para stock y costos |
| `Decimal` | NUMERIC | Valores monetarios con precisión exacta |
| `Boolean` | INTEGER (0/1) | Valores booleanos (true/false) |
| `DateTime` | TEXT (ISO 8601) | Fechas y horas en formato estándar |

---

## 5. Integridad Referencial

Todos los campos FK implementan restricciones de integridad referencial mediante Prisma ORM. Los registros con `onDelete: Cascade` eliminan automáticamente los registros dependientes al borrar el padre:

- `order_items` → CASCADE al eliminar `orders`
- `invoice_items` → CASCADE al eliminar `invoices`
- `recipe_ingredients` → CASCADE al eliminar `recipes`
- `recipes` → CASCADE al eliminar `products`
