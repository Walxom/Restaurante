# Diccionario de Datos del Sistema SIGER-IA

**Proyecto:** Sistema Integral de Gestión de Restaurantes y POS Asistido por IA  
**Esquema:** Prisma ORM v6 (Verificado contra `prisma/schema.prisma` y `prisma/seed.ts`)  
**Semana:** 11 - Documentación Técnica Viva (100% Verificable)  
**Organización / Piloto:** Cevichería y Restaurante Marino "Fondo Marino" / Piloto Operativo "Mr Frit" (Trujillo, Perú)  

---

## Índice de Tablas

1. [`users` (Usuarios y Roles de Personal)](#1-tabla-users)
2. [`categories` (Categorías del Menú)](#2-tabla-categories)
3. [`products` (Platos y Bebidas del Menú)](#3-tabla-products)
4. [`tables` (Mesas del Salón Gastronómico)](#4-tabla-tables)
5. [`orders` (Comandas y Pedidos)](#5-tabla-orders)
6. [`order_items` (Detalle de Líneas de Comanda)](#6-tabla-order_items)
7. [`ingredient_categories` (Familias de Insumos)](#7-tabla-ingredient_categories)
8. [`ingredients` (Insumos y Kardex de Cocina)](#8-tabla-ingredients)
9. [`recipes` (Fichas Técnicas de Recetas)](#9-tabla-recipes)
10. [`recipe_ingredients` (Dosificación de Insumos por Receta)](#10-tabla-recipe_ingredients)
11. [`system_config` (Configuración Fiscal y de Negocio)](#11-tabla-system_config)
12. [`invoices` (Comprobantes de Pago y Facturación)](#12-tabla-invoices)
13. [`invoice_items` (Detalle de Comprobante Fiscal)](#13-tabla-invoice_items)
14. [`printers` (Impresoras Térmicas ESC/POS de Red)](#14-tabla-printers)
15. [`cash_sessions` (Turnos de Caja y Arqueo Ciego)](#15-tabla-cash_sessions)

---

### 1. Tabla: `users`
Almacena el personal operativo y administrativo del restaurante con sus credenciales y niveles de autorización.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador único del usuario. |
| `username` | String | UNIQUE, Not Null | - | Nombre de usuario de acceso (`jefe`, `mesero`). |
| `name` | String | Not Null | - | Nombres y apellidos completos del trabajador. |
| `password` | String | Not Null | - | Hash criptográfico de contraseña (bcrypt con salt 12). |
| `role` | String | Not Null | `'MESERO'` | Rol operativo canónico: `'JEFE'` o `'MESERO'`. |
| `isActive` | Boolean | Not Null | `true` | Bandera de vigencia de la cuenta. |
| `createdAt`| DateTime | Not Null | `now()` | Timestamp de registro del usuario. |
| `updatedAt`| DateTime | Not Null | - | Timestamp de última modificación. |

---

### 2. Tabla: `categories`
Agrupaciones lógicas del menú gastronómico.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador de categoría. |
| `name` | String | UNIQUE, Not Null | - | Denominación (ej. "Especiales de Carne", "Bebidas", "Postres"). |
| `description`| String | Nullable | `null` | Detalle o pauta comercial de la categoría. |
| `isActive` | Boolean | Not Null | `true` | Si la categoría se expone en la carta activa. |
| `createdAt`| DateTime | Not Null | `now()` | Fecha y hora de creación. |
| `updatedAt`| DateTime | Not Null | - | Última actualización. |

---

### 3. Tabla: `products`
Ficha maestra de platos, entradas, bebidas y productos para llevar.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador único de producto. |
| `name` | String | Not Null | - | Nombre del plato (ej. "Lomo Saltado", "Ceviche Mixto"). |
| `description`| String | Nullable | `null` | Ingredientes visibles y descripción comercial. |
| `price` | Decimal | Not Null | - | Precio de venta al público en Soles (PEN). |
| `isAvailable`| Boolean | Not Null | `true` | Indica si cocina tiene stock para ofrecer el plato. |
| `isActive` | Boolean | Not Null | `true` | Estado lógico en la base de datos. |
| `categoryId` | String | FK -> categories.id | - | Categoría a la que pertenece el producto. |
| `createdAt`| DateTime | Not Null | `now()` | Fecha de creación. |
| `updatedAt`| DateTime | Not Null | - | Fecha de modificación. |

---

### 4. Tabla: `tables`
Mesas físicas ubicadas en el salón comercial del restaurante.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador de mesa. |
| `number` | Int | UNIQUE, Not Null | - | Número de mesa (mesas 1 a 12 sembradas en `seed.ts`). |
| `capacity` | Int | Not Null | - | Aforo de comensales (2, 4 o 6 personas). |
| `status` | String | Not Null | `'DISPONIBLE'` | Estado: `'DISPONIBLE'`, `'OCUPADA'`, `'ESPERANDO'`, `'MANTENIMIENTO'`. |
| `isActive` | Boolean | Not Null | `true` | Mesa habilitada físicamente. |
| `createdAt`| DateTime | Not Null | `now()` | Registro de la mesa. |
| `updatedAt`| DateTime | Not Null | - | Cambio de estado de la mesa. |

---

### 5. Tabla: `orders`
Cabecera de comanda creada desde la vista de salón (`/mesero`).

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador único de orden. |
| `orderNumber` | String | UNIQUE, Not Null | - | Código visible de orden (ej. `'ORD-20261102-001'`). |
| `type` | String | Not Null | `'MESA'` | Modalidad: `'MESA'`, `'PARA_LLEVAR'`, `'DELIVERY'`. |
| `status` | String | Not Null, Index | `'CONFIRMED'` | Estado: `'PENDING'`, `'CONFIRMED'`, `'PREPARING'`, `'READY'`, `'SERVED'`, `'COMPLETED'`, `'CANCELLED'`. |
| `totalAmount` | Decimal | Not Null | `0` | Sumatoria total calculada de los ítems. |
| `tableId` | String | FK -> tables.id, Nullable | `null` | Mesa donde se atiende (null si es llevar). |
| `userId` | String | FK -> users.id, Index | - | Mozo que abrió la comanda. |
| `customerName` | String | Nullable | `null` | Nombre de cliente para ticket. |
| `customerDni` | String | Nullable | `null` | DNI de cliente. |
| `customerPhone` | String | Nullable | `null` | Teléfono de contacto. |
| `customerAddress` | String | Nullable | `null` | Dirección para pedidos delivery. |
| `notes` | String | Nullable | `null` | Observaciones globales de la comanda. |
| `startDate` | DateTime | Nullable | `null` | Momento en que se confirmó el pedido. |
| `endDate` | DateTime | Nullable | `null` | Momento en que se sirvió el pedido. |
| `createdAt` | DateTime | Not Null, Index | `now()` | Creación de registro. |
| `updatedAt` | DateTime | Not Null | - | Última actualización. |

---

### 6. Tabla: `order_items`
Detalle de platos solicitados en una comanda con sus notas culinarias.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador de línea de pedido. |
| `quantity` | Int | Not Null | - | Cantidad solicitada del plato. |
| `unitPrice` | Decimal | Not Null | - | Precio unitario congelado al momento del pedido. |
| `subtotal` | Decimal | Not Null | - | `quantity * unitPrice`. |
| `notes` | String | Nullable | `null` | Nota de cocina (ej. "sin cebolla", "ají aparte"). |
| `status` | String | Not Null | `'PENDING'` | Estado de cocción en monitor KDS. |
| `orderId` | String | FK -> orders.id, Index | - | Orden a la que pertenece (Cascade On Delete). |
| `productId`| String | FK -> products.id, Index | - | Plato solicitado. |
| `createdAt`| DateTime | Not Null | `now()` | Momento del pedido. |
| `updatedAt`| DateTime | Not Null | - | Cambio de estado de preparación. |

---

### 7. Tabla: `ingredient_categories`
Familias de clasificación de insumos gastronómicos.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador CUID. |
| `name` | String | UNIQUE, Not Null | - | Nombre (ej. "Carnes", "Verduras", "Abarrotes"). |
| `description`| String | Nullable | `null` | Descripción del grupo de insumos. |
| `color` | String | Nullable | `null` | Color hexadecimal para badges de UI. |
| `isActive` | Boolean | Not Null | `true` | Estado activo. |
| `createdAt`| DateTime | Not Null | `now()` | Timestamp de creación. |
| `updatedAt`| DateTime | Not Null | - | Timestamp de modificación. |

---

### 8. Tabla: `ingredients`
Maestro de insumos marinos y abarrotes con control de kardex.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador del insumo. |
| `name` | String | UNIQUE, Not Null | - | Nombre (ej. "Papas", "Pollo", "Harina"). |
| `unit` | String | Not Null | - | Unidad de medida (`'kg'`, `'unidades'`, `'lt'`). |
| `unitCategory` | String | Nullable | `null` | Clasificación de unidad (peso/volumen). |
| `currentStock` | Float | Not Null | - | Existencia física disponible en almacén/cocina. |
| `minStock` | Float | Not Null | - | Nivel mínimo de reorden (dispara alerta). |
| `maxStock` | Float | Nullable | `null` | Capacidad máxima de almacenamiento. |
| `cost` | Float | Nullable | `null` | Costo unitario de compra promedio (S/.). |
| `categoryId` | String | FK -> ingredient_categories.id | - | Familia a la que pertenece. |
| `isActive` | Boolean | Not Null | `true` | Estado de insumo. |
| `createdAt` | DateTime | Not Null | `now()` | Registro de insumo. |
| `updatedAt` | DateTime | Not Null | - | Registro de actualización. |

---

### 9. Tabla: `recipes`
Ficha técnica culinaria estándar asociada a cada plato del restaurante.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador de receta. |
| `productId`| String | UNIQUE, FK -> products.id | - | Producto que produce esta receta (Cascade On Delete). |
| `instructions` | String | Nullable | `null` | Instrucciones de ensamblaje culinario. |
| `prepTime` | Int | Nullable | `null` | Tiempo estándar de preparación (minutos). |
| `servings` | Int | Not Null | `1` | Número de porciones que rinde la formulación. |
| `isActive` | Boolean | Not Null | `true` | Estado vigente de la receta. |
| `createdAt`| DateTime | Not Null | `now()` | Timestamp de registro. |
| `updatedAt`| DateTime | Not Null | - | Timestamp de edición. |

---

### 10. Tabla: `recipe_ingredients`
Matriz de dosificación de insumos por plato para descarga automática de Kardex.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador de dosificación. |
| `recipeId` | String | FK -> recipes.id | - | Receta padre (Cascade On Delete). |
| `ingredientId` | String | FK -> ingredients.id | - | Insumo consumido por la receta. |
| `quantity` | Float | Not Null | - | Cantidad exacta consumida por porción. |
| `unit` | String | Not Null | - | Unidad consumida (`'kg'`, `'gr'`, `'lt'`). |
| `notes` | String | Nullable | `null` | Variación o merma admitida. |
| `createdAt`| DateTime | Not Null | `now()` | Timestamp de creación. |
| `updatedAt`| DateTime | Not Null | - | Timestamp de edición. |

*Nota:* Posee restricción de unicidad compuesta `@@unique([recipeId, ingredientId])`.

---

### 11. Tabla: `system_config`
Configuraciones globales fiscales y de negocio (Registro singleton con id `'default'`).

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador único (`'default'`). |
| `companyName` | String | Not Null | - | Razón social (`'Mr Frit'` en seed / `'Fondo Marino'`). |
| `companyAddress` | String | Nullable | `null` | Dirección fiscal (`'Calle Las Gaviotas 1311, Urb. Los Pinos, Trujillo'`). |
| `companyPhone` | String | Nullable | `null` | Teléfono oficial (`'+51 997 148 538'`). |
| `companyRuc` | String | Nullable | `null` | RUC fiscal (`'10428072265'`). |
| `taxRate` | Float | Not Null | `0.18` | Tasa tributaria IGV (18%). |
| `currency` | String | Not Null | `'PEN'` | Símbolo de moneda (`'S/'` o `'PEN'`). |
| `timezone` | String | Not Null | `'America/Lima'` | Zona horaria del servidor. |
| `isPrinterServiceEnabled` | Boolean | Not Null | `true` | Habilitación de servicio de impresión térmico. |
| `lastBoletaNumber` | Int | Not Null | `0` | Correlativo atómico incremental de boletas. |
| `lastFacturaNumber` | Int | Not Null | `0` | Correlativo atómico incremental de facturas. |
| `createdAt` | DateTime | Not Null | `now()` | Registro de configuración inicial. |
| `updatedAt` | DateTime | Not Null | - | Última actualización de parámetros. |

---

### 12. Tabla: `invoices`
Registro legal de comprobantes fiscales emitidos tras la liquidación en caja.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador de factura. |
| `number` | String | UNIQUE, Not Null | - | Número de comprobante (`'B001-XXXX'` / `'F001-XXXX'`). |
| `type` | String | Not Null | - | Tipo de comprobante: `'BOLETA'` o `'FACTURA'`. |
| `orderId` | String | UNIQUE, FK -> orders.id | `null` | Comanda liquidada (relación 1:1). |
| `customerName` | String | Nullable | `null` | Nombre del cliente o Razón Social. |
| `customerRuc` | String | Nullable | `null` | RUC o DNI del receptor. |
| `customerAddress` | String | Nullable | `null` | Dirección fiscal del cliente. |
| `subtotal` | Decimal | Not Null | - | Base imponible. |
| `igv` | Decimal | Not Null | - | Monto de IGV 18%. |
| `total` | Decimal | Not Null | - | Importe total cancelado. |
| `paymentMethod` | String | Not Null | - | Medio: `'EFECTIVO'`, `'YAPE'`, `'PLIN'`, `'TARJETA'`. |
| `amountPaid` | Decimal | Not Null | - | Importe entregado por el cliente. |
| `change` | Decimal | Not Null | `0` | Vuelto calculado. |
| `issuedAt` | DateTime | Not Null, Index | `now()` | Fecha y hora de emisión del comprobante. |
| `issuedBy` | String | FK -> users.id | - | Usuario cajero o jefe responsable. |
| `status` | String | Not Null | `'ISSUED'` | Estado fiscal: `'ISSUED'`, `'CANCELLED'`. |
| `cancelledAt` | DateTime | Nullable | `null` | Fecha de anulación. |
| `cancelReason` | String | Nullable | `null` | Motivo de anulación documentado. |

---

### 13. Tabla: `invoice_items`
Líneas de facturación inmutables asociadas al comprobante fiscal.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador de línea. |
| `invoiceId` | String | FK -> invoices.id | - | Factura a la que pertenece (Cascade On Delete). |
| `description` | String | Not Null | - | Concepto facturado. |
| `quantity` | Int | Not Null | - | Unidades facturadas. |
| `unitPrice` | Decimal | Not Null | - | Precio unitario con IGV incluido. |
| `total` | Decimal | Not Null | - | Monto total de la línea. |

---

### 14. Tabla: `printers`
Registro de hardware de impresión térmica para cocina y caja.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador de impresora. |
| `name` | String | Not Null | - | Nombre (`'Cocina Principal'`, `'Caja Principal'`). |
| `type` | String | Not Null | - | Destino: `'KITCHEN'` o `'RECEIPT'`. |
| `connectionType` | String | Not Null | - | Interfaz: `'NETWORK'` (LAN) o `'BLUETOOTH'`. |
| `ipAddress` | String | Nullable | `null` | IP estática LAN (`192.168.0.100` en seed para cocina). |
| `port` | Int | Nullable | `9100` | Puerto socket TCP para protocolo RAW ESC/POS. |
| `paperWidth` | Int | Not Null | `58` | Ancho de papel en mm (`58`). |
| `charactersPerLine`| Int | Not Null | `32` | Ancho de línea de caracteres (`32` columnas). |
| `timeout` | Int | Not Null | `15000` | Timeout de conexión en ms. |
| `reconnectAttempts`| Int | Not Null | `3` | Intentos de reconexión. |
| `reconnectDelay` | Int | Not Null | `2000` | Pausa en ms entre intentos. |
| `charset` | String | Not Null | `'PC437'` | Juego de caracteres ESC/POS. |
| `status` | String | Not Null | `'ACTIVE'` | Estado: `'ACTIVE'`, `'INACTIVE'`. |
| `isDefault` | Boolean | Not Null | `false` | Impresora predeterminada del área (`true` en seed). |
| `createdBy` | String | FK -> users.id | - | Usuario jefe que la registró. |
| `updatedBy` | String | FK -> users.id, Nullable | `null` | Usuario que editó la configuración. |
| `createdAt` | DateTime | Not Null | `now()` | Registro del dispositivo. |
| `updatedAt` | DateTime | Not Null | - | Modificación de parámetros. |

---

### 15. Tabla: `cash_sessions`
Turnos de caja con arqueo ciego (US-10). Mientras el turno está `ABIERTA`, la API no expone el monto esperado; al cerrar se calcula el descuadre.

| Campo | Tipo | Restricciones | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | PK, CUID | `cuid()` | Identificador del turno. |
| `status` | String | Not Null, Index | `'ABIERTA'` | `'ABIERTA'` o `'CERRADA'`. Solo un turno abierto a la vez. |
| `openingAmount` | Decimal | Not Null | - | Fondo inicial de caja. |
| `openedAt` | DateTime | Not Null, Index | `now()` | Inicio del turno. |
| `openedById` | String | FK -> users.id | - | Usuario que abrió la caja. |
| `closedAt` | DateTime | Nullable | `null` | Cierre del turno. |
| `closedById` | String | FK -> users.id, Nullable | `null` | Usuario que realizó el arqueo. |
| `declaredAmount` | Decimal | Nullable | `null` | Efectivo físico contado y declarado. |
| `cashSales` | Decimal | Nullable | `null` | Ventas en `EFECTIVO` (comprobantes `ISSUED`) del turno. |
| `expectedAmount` | Decimal | Nullable | `null` | `openingAmount + cashSales`. |
| `difference` | Decimal | Nullable | `null` | `declaredAmount - expectedAmount` (> 0 sobrante, < 0 faltante). |
| `otherSales` | Decimal | Nullable | `null` | Ventas por Yape, Plin, tarjeta y transferencia. |
| `invoiceCount` | Int | Nullable | `null` | Comprobantes emitidos en el turno. |
| `notes` | String | Nullable | `null` | Observaciones del arqueo (máx. 300). |
