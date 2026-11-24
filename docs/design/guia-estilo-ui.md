# Guía de Estilo UI y Biblioteca de Componentes — SIGER-IA v1.0.1

Referencia visual del sistema: tokens de diseño, componentes reutilizables con sus estados, reglas de
uso, accesibilidad y diseño adaptativo. Todos los valores salen del código (`src/app/globals.css`,
`src/components/ui/`, `components.json`); si cambian allí, se actualiza esta guía.

## 1. Principios

1. **Rapidez en hora punta:** tomar y enviar una comanda en 4 toques o menos (regla de los 4 toques).
2. **Estado visible de un vistazo:** cada estado de pedido y cada nivel de demora tiene un color fijo.
3. **Legible en salón y cocina:** alto contraste, textos cortos en español, íconos con etiqueta.
4. **Funciona en tablet y PC:** la misma interfaz se adapta de 768 px a pantallas de escritorio.
5. **Claro y oscuro:** todo componente se diseña para ambos temas.

## 2. Tokens de diseño

Base: shadcn/ui estilo **new-york**, color base **neutral**, variables CSS en formato OKLCH y
Tailwind CSS 4 (`@theme inline`).

### 2.1 Colores semánticos

| Token | Tema claro | Tema oscuro | Uso |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(0.97 0.015 225)` espuma de mar | `oklch(0.08 0.03 230)` azul marino profundo | Fondo de página |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texto principal |
| `--card` | `oklch(1 0 0)` blanco | `oklch(0.205 0 0)` | Tarjetas, paneles |
| `--primary` | `oklch(0.205 0 0)` casi negro | `oklch(0.922 0 0)` casi blanco | Botón principal |
| `--muted-foreground` | `oklch(0.556 0 0)` | — | Texto secundario |
| `--destructive` | `oklch(0.577 0.245 27.3)` rojo | `oklch(0.704 0.191 22.2)` | Eliminar, anular, errores |
| `--border` / `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | Bordes y campos |
| `--chart-1…5` | naranja, verde azulado, azul, amarillo, ámbar | variantes oscuras | Gráficos de ventas e IA |

La identidad "marina" del restaurante se expresa en el fondo (espuma / azul marino) y en las clases
`ocean-stat-card` y `ocean-action-btn` de `globals.css` (tarjetas de indicadores y accesos rápidos).

### 2.2 Colores de estado del pedido (`src/features/orders/utils/order-utils.ts`)

| Estado | Etiqueta | Color (fondo 10 % + texto 700) |
| :--- | :--- | :--- |
| `PENDING` | Pendiente | Ámbar |
| `CONFIRMED` | Confirmado | Azul |
| `PREPARING` | En preparación | Naranja |
| `READY` | Listo | Esmeralda |
| `SERVED` | Servido | Índigo |
| `COMPLETED` | Completado | Pizarra (gris) |
| `CANCELLED` | Cancelado | Rojo |

### 2.3 Semáforo de demora (SLA, US-14 — `src/features/orders/utils/sla.ts`)

| Nivel | Condición | Tratamiento visual |
| :--- | :--- | :--- |
| VERDE | < 10 min | Borde normal, insignia "N min" |
| ÁMBAR | 10–18 min | Borde e insignia ámbar |
| ROJO | > 18 min | Borde rojo, contorno pulsante y bip una sola vez |

El color nunca es la única señal: la insignia siempre muestra los minutos en texto.

### 2.4 Tipografía

| Rol | Fuente | Fuente de carga |
| :--- | :--- | :--- |
| Texto e interfaz | **Geist Sans** (`--font-sans`) | `next/font/google` en `src/app/layout.tsx` |
| Números de comprobante, código | **Geist Mono** (`--font-mono`) | ídem |

Escala usada (Tailwind): `text-xs` 12 px (ayudas, insignias) · `text-sm` 14 px (tablas, formularios)
· `text-base` 16 px (texto general) · `text-lg`–`text-2xl` (títulos de sección) · `text-3xl`
(indicadores del dashboard). Pesos: 400 normal, 500 etiquetas, 600–700 títulos e importes.

### 2.5 Forma, espaciado y elevación

- **Radio base** `--radius: 0.625rem` (10 px) → `sm` 6 px, `md` 8 px, `lg` 10 px, `xl` 14 px.
- **Espaciado:** escala de 4 px de Tailwind. Separación entre campos `gap-4` (16 px); padding de
  tarjeta `p-4`/`p-6`; separación entre secciones `space-y-6`.
- **Elevación:** `shadow-sm` en tarjetas y estados; los modales usan superposición oscura y sombra mayor.

### 2.6 Iconografía

Biblioteca única **Lucide** (`lucide-react`), trazo de 2 px, tamaño `size-4` (16 px) en botones y
`size-5`/`size-6` en accesos rápidos. Un ícono que acciona algo sin texto visible lleva `aria-label`.

## 3. Biblioteca de componentes (`src/components/ui/`)

| Componente | Variantes / tamaños | Estados | Regla de uso |
| :--- | :--- | :--- | :--- |
| `Button` | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` · `sm` 32 px, `default` 36 px, `lg` 40 px, `icon` 36 px | hover, focus-visible (anillo), disabled (opacidad 50 %), cargando (spinner + texto) | Un solo botón `default` por vista; `destructive` solo para anular o eliminar y siempre con confirmación |
| `Input`, `Textarea`, `PremiumInput` | — | foco con anillo, `aria-invalid` en rojo, deshabilitado | Siempre con `Label` asociado (`htmlFor`) y mensaje de error debajo |
| `Select`, `Checkbox`, `Switch` | Radix | abierto/cerrado, marcado, foco | `Switch` para activar/desactivar al instante; `Checkbox` dentro de formularios |
| `Card` | encabezado, contenido, pie | hover en tarjetas clicables | Unidad básica de pedido, mesa, producto e indicador |
| `Badge` | `default`, `secondary`, `destructive`, `outline` | — | Estados y contadores; con los colores de §2.2 |
| `Dialog`, `ModalShell` | — | abierto, cerrando | Confirmaciones y formularios cortos; Esc y clic fuera cierran; foco atrapado |
| `ConfirmDialog` (`src/components/`) | — | — | Obligatorio antes de acciones destructivas |
| `DropdownMenu`, `Tabs` | Radix | activo, foco con teclado | Navegación secundaria dentro de una vista |
| `Table` | — | fila hover | Listados de ventas, inventario y comprobantes |
| `Alert`, `StatusAlert` | info, éxito, advertencia, error | — | Mensajes persistentes en la página |
| `StateFeedback`, `Skeleton`, `LoadingSpinner`, `AppLoading` | — | cargando, vacío, error | Toda lista muestra esqueleto al cargar y un estado vacío con texto |
| `SectionTitle`, `Separator`, `Label` | — | — | Jerarquía de la página |
| Notificaciones | `react-hot-toast` (`src/components/providers.tsx`) | éxito, error | Confirmar acciones breves (pedido enviado, cobro registrado) |

## 4. Patrones de pantalla

| Pantalla | Patrón | Captura |
| :--- | :--- | :--- |
| Login | Tarjeta centrada, mensajes de error en `role="alert"` | `docs/user/img/01-login.png` |
| Dashboard (JEFE) | Indicadores `ocean-stat-card` + accesos rápidos `ocean-action-btn` | `docs/user/img/02-dashboard-jefe.png` |
| Pedidos / cocina | Rejilla de tarjetas con estado y semáforo SLA | `docs/user/img/03-pedidos-sla.png` |
| Cobro, caja, inventario, ventas, IA | Formulario o tabla dentro de `Card`, acción principal abajo a la derecha | `docs/user/img/` (16 capturas) |

Las capturas completas por rol están en el [Manual de usuario](../user/manual-usuario.md).

## 5. Accesibilidad

| Criterio | Cómo se cumple | Evidencia |
| :--- | :--- | :--- |
| WCAG 2.1 A/AA sin violaciones críticas | Auditoría automática con axe en login y dashboard | `e2e/accesibilidad.spec.ts` (CP-A11Y-01/02) en cada CI |
| Contraste ≥ 4.5:1 en texto | Texto de estado en tono 700 sobre fondo al 10 %; texto principal `--foreground` | axe (regla `color-contrast`) |
| Foco visible | Anillo `focus-visible` en los componentes base (42 usos) | Revisión de código |
| Lectores de pantalla | `aria-live="assertive"` en errores de login; `aria-label` en 5 botones de ícono (**pendiente:** completar el resto de botones solo-ícono) | `src/app/login/page.tsx` |
| No depender solo del color | Estados con texto; SLA con minutos visibles | §2.2 y §2.3 |
| Teclado | Componentes Radix navegables con Tab, Esc y flechas | Radix UI |

## 6. Diseño adaptativo y uso táctil

- Puntos de quiebre de Tailwind: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536 px.
  Diseño de referencia: tablet horizontal (≥ 768 px) para meseros y PC (≥ 1280 px) para el JEFE.
- **Áreas táctiles:** los botones de acción principal en vistas de mesero y cocina usan `h-11`/`h-12`
  (44–48 px). El `Button` por defecto mide 36 px, pensado para escritorio.
  **Regla:** en pantallas de tablet, usar `size="lg"` o `h-12` para acciones frecuentes.
- Rejillas de tarjetas con `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`; tablas con desplazamiento horizontal en pantallas pequeñas.

## 7. Contenido y tono

Español neutro peruano y frases cortas en imperativo ("Cobrar", "Enviar a cocina"). Los importes se
muestran como `S/ 0.00` con dos decimales. Fechas con formato `dd/mm/aaaa` y horas en 24 h.
Los errores dicen qué pasó y qué hacer ("Cuenta bloqueada temporalmente… Intente en 15 minutos").

## 8. Cómo agregar un componente

1. Partir de la primitiva de shadcn/ui (`components.json` ya configurado) en `src/components/ui/`.
2. Usar solo tokens (`bg-card`, `text-muted-foreground`…), nunca colores sueltos, salvo los de estado de §2.2.
3. Comprobar los dos temas, el foco con teclado y el tamaño táctil.
4. Si es una pantalla nueva, agregarla a la auditoría de `e2e/accesibilidad.spec.ts`.
