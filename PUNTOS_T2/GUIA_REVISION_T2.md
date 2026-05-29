# 📋 GUÍA DE REVISIÓN — T2 / PC2 (20%)
## Calidad y Pruebas de Software | Bendistaurante — Cevichería "Fondo Marino"

**Presentación:** 30/05/2026  
**Docente:** Carlos Alberto Chirinos Mundaca  
**Equipo:**
- Lujan Guevara, Jeffrey Anderson — N00341596
- Porras Pereda, Johan Aldair — N00329648
- Chafloque Salinas, Jose Luis — N00309948
- Terrones Quezada, Josbel Fabian — N00282251

---

## SEMÁFORO GENERAL

| Estado | Significado |
|--------|-------------|
| ✅ | Listo para presentar |
| ⚠️ | Existe pero necesita acción antes de presentar |
| ❌ | Falta completar |

---

---

## ÍTEM 2 — Modelo de Negocio de Procesos (UML / CANVA)
**Puntaje:** 1 punto

### ✅ Estado: LISTO (requiere renderizar)

### ¿Qué es?
Mapa jerárquico de procesos del negocio con 3 niveles: **Macroproceso → Proceso → Sub Proceso**, tal como el ejemplo del profesor.

### ¿Dónde está?

| Archivo | Descripción | Ruta |
|---------|-------------|------|
| `mapa_procesos_negocio.puml` | ⭐ **PRINCIPAL** — Mapa de procesos de negocio jerárquico (Macroproceso/Proceso/Sub Proceso) igual al ejemplo del profe | `docs/arquitectura/mapa_procesos_negocio.puml` |
| `casos_uso.puml` | Diagrama de Casos de Uso UML (actores y funciones) | `docs/arquitectura/casos_uso.puml` |
| `diagrama_paquetes.puml` | Arquitectura técnica por capas | `docs/arquitectura/diagrama_paquetes.puml` |
| `modelo_dominio.puml` | Modelo de dominio (clases y relaciones) | `docs/arquitectura/modelo_dominio.puml` |
| `casos_uso.md` | Descripción textual de todos los casos de uso | `docs/arquitectura/casos_uso.md` |

### ⚠️ Acción antes de presentar
Los archivos `.puml` deben **renderizarse como imagen**. Dos opciones:
- **VS Code:** Instalar extensión `PlantUML` (jebbs) → abrir archivo → `Alt + D`
- **Online:** Ir a [plantuml.com/plantuml](https://www.plantuml.com/plantuml/uml/) → pegar el código → descargar PNG

### ¿Qué mostrar en la presentación?
1. El `mapa_procesos_negocio.puml` renderizado (igual al ejemplo de la foto)
2. El `casos_uso.puml` renderizado como complemento UML

---

---

## ÍTEM 3 — Diagrama y Formatos de Tablas y BD: Diccionario de Datos y Estructura de Datos
**Puntaje:** 2 puntos

### ✅ Estado: LISTO

### ¿Qué es?
Documentación formal de la estructura de la base de datos: todas las tablas, sus campos, tipos, restricciones y relaciones.

### ¿Dónde está?

| Archivo | Descripción | Ruta |
|---------|-------------|------|
| `diccionario_de_datos.md` | ⭐ **PRINCIPAL** — Diccionario completo con las 14 tablas, 156 campos, tipos, PK, FK, NOT NULL, defaults y descripción de cada campo | `PUNTOS_T2/diccionario_de_datos.md` |
| `modelo_datos.puml` | Diagrama ER visual en PlantUML | `docs/arquitectura/modelo_datos.puml` |
| `informe_calidad_base_datos.md` | Informe de calidad y diseño de la BD | `docs/arquitectura/informe_calidad_base_datos.md` |
| `schema.prisma` | Fuente de verdad — definición técnica de todos los modelos | `prisma/schema.prisma` |

### ¿Qué mostrar en la presentación?
1. El `diccionario_de_datos.md` — tabla por tabla
2. El `modelo_datos.puml` renderizado como diagrama ER
3. El `schema.prisma` para mostrar la implementación real

### Datos clave a mencionar
- **14 tablas**, **156 campos**, **16 Foreign Keys**
- Gestor: **SQLite** en modo **WAL** (Write-Ahead Logging)
- ORM: **Prisma** con tipado estricto TypeScript
- Tablas principales: `users`, `orders`, `products`, `invoices`, `ingredients`, `recipes`

---

---

## ÍTEM 4 — Diseñar e implementar la base de datos en SQL Server / Oracle u otro gestor
**Puntaje:** 1 punto

### ✅ Estado: LISTO

### ¿Qué es?
La base de datos implementada y funcionando con datos reales.

### ¿Dónde está?

| Archivo | Descripción | Ruta |
|---------|-------------|------|
| `dev.db` | ⭐ **BASE DE DATOS REAL** — SQLite con datos reales (~1.4 MB) | `prisma/dev.db` |
| `seed.ts` | Script de población inicial (usuarios, productos, mesas, config) | `prisma/seed.ts` |
| `seed-sales.ts` | Script de datos de ventas históricas (2706 órdenes, 90 días) | `prisma/seed-sales.ts` |
| `schema.prisma` | Esquema y migraciones de la BD | `prisma/schema.prisma` |

### ⚠️ Acción antes de presentar
Levantar **Prisma Studio** para mostrar la BD visualmente en el navegador:
```powershell
npx prisma studio
# Se abre en http://localhost:5555
```

### ¿Qué mostrar en la presentación?
1. Prisma Studio en el navegador mostrando las tablas con datos reales
2. Mostrar la tabla `orders` con las 2706 órdenes históricas
3. Mostrar la tabla `users` con los roles configurados
4. Mostrar la tabla `invoices` con comprobantes generados

---

---

## ÍTEM 5 — Login Propuesto Funcional
**Puntaje:** 2 puntos

### ✅ Estado: LISTO (demo en vivo)

### ¿Qué es?
Sistema de autenticación funcional con control de roles, JWT y protección de rutas.

### ¿Dónde está?

| Archivo | Descripción | Ruta |
|---------|-------------|------|
| `page.tsx` (login) | ⭐ **PANTALLA DE LOGIN** — UI completa de inicio de sesión | `src/app/login/page.tsx` |
| `middleware.ts` | Protección de rutas con NextAuth + JWT | `src/middleware.ts` |
| `auth/` (feature) | Lógica de autenticación y autorización por roles | `src/features/auth/` |
| `PPF_Bendistaurante...md` | Plan de pruebas funcionales: CP-001 (Login válido), CP-002 (Login inválido), CP-003 (Control de roles) | `docs/calidad y pruebas de software/PPF_Bendistaurante_Plan_Pruebas_Funcionales.md` |

### Usuarios de prueba para el demo

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Administrador/Jefe | `admin@fondomarino.pe` | (según BD) |
| Mesero | `mesero@fondomarino.pe` | (según BD) |
| Cocinero | `cocinero@fondomarino.pe` | (según BD) |

### ¿Qué mostrar en la presentación?
1. Login exitoso con rol JEFE → redirige al dashboard completo
2. Login fallido → mensaje de error "Credenciales inválidas"
3. Login como MESERO → acceso denegado a rutas de administración (CP-003)

---

---

## ÍTEM 6 — Implementar el Software para un Caso de Uso Principal
**Puntaje:** 2 puntos

### ✅ Estado: LISTO (demo en vivo)

### ¿Qué es?
El software implementado funcionando para el caso de uso principal del restaurante.

### ¿Dónde está el código?

| Módulo | Descripción | Ruta |
|--------|-------------|------|
| `pedidos/` | Toma y gestión de órdenes | `src/app/pedidos/` |
| `mesas/` | Monitor de mesas en tiempo real | `src/app/mesas/` |
| `mesero/` | Vista del mesero para tomar pedidos | `src/app/mesero/` |
| `dashboard/cocina` | KDS — Monitor de cocina en tiempo real | `src/app/dashboard/` |
| `billing/` | Facturación con IGV, boletas y facturas | `src/features/billing/` |
| `orders/` | Lógica de negocio de órdenes | `src/features/orders/` |

### Documento de pruebas

| Archivo | Descripción | Ruta |
|---------|-------------|------|
| `PPF_Bendistaurante_Plan_Pruebas_Funcionales.md` | ⭐ Plan completo con 24 casos de prueba (CP-001 a CP-024), matriz de trazabilidad, criterios de éxito | `docs/calidad y pruebas de software/PPF_Bendistaurante_Plan_Pruebas_Funcionales.md` |
| `PPF_Bendistaurante_Plan_Pruebas_Funcionales.docx` | Versión Word del plan | `docs/calidad y pruebas de software/PPF_Bendistaurante_Plan_Pruebas_Funcionales.docx` |

### ¿Qué mostrar en la presentación? (Flujo completo — 5 min)
```
1. Login como Jefe
2. Ver el mapa de mesas (estado en tiempo real)
3. Crear nuevo pedido → seleccionar mesa → agregar platos
4. Abrir en otro tab el Monitor de Cocina (KDS)
5. Ver cómo el pedido aparece en cocina automáticamente (Socket.IO < 200ms)
6. Cambiar estado en cocina: Preparando → Listo
7. Ir a facturación → emitir boleta → calcular IGV 18%
8. Mostrar el comprobante generado
```

---

---

## ÍTEM 7 — Ejercicio de Detección de Errores (Entrega 8va Semana)
**Puntaje:** 2 puntos

### ❌ Estado: PENDIENTE — NECESITA TUS VALORES DEL PROFE

### ¿Qué es?
Ejercicio individual de detección de errores usando **CRC (Comprobación de Redundancia Cíclica)** con división de polinomios.

### Fórmulas base (del apunte de Semana 9)
- `G(X) = X^a + X^13 + X^b + X^3 + X^c`
- `P(X) = X^d + X^7 + X^e + X^0`
- Determinar el **BCS** mediante división CRC (XOR en lugar de resta)

### ¿Qué necesitas?
> 🔴 **TUS VALORES PERSONALES: a, b, c, d, e** — asignados por el profesor en la tabla de la semana 9

### Donde guardar cuando lo tengas
`PUNTOS_T2/ejercicio_deteccion_errores_CRC.md`

### Referencia de teoría
`docs/calidad y pruebas de software/SEMANA 9.md`

---

---

## ÍTEM 8 — Ejercicio de Corrección de Errores (Entrega 8va Semana)
**Puntaje:** 2 puntos

### ❌ Estado: PENDIENTE — NECESITA TUS VALORES DEL PROFE

### ¿Qué es?
Ejercicio individual de corrección de errores usando **Código Hamming** (corrección en sentido directo FEC).

### Fórmula base (del apunte de Semana 9)
```
2^n >= m + n + 1

Donde:
  n = número de bits de redundancia (Hamming)
  m = número de bits del mensaje
```
- Regla del profe: *"Si llegó correcto, asume que llegó erróneo"* → aplicar corrección Hamming de todas formas

### ¿Qué necesitas?
> 🔴 **TUS VALORES PERSONALES: a, b, c, d, e** — los mismos del Ítem 7

### Donde guardar cuando lo tengas
`PUNTOS_T2/ejercicio_correccion_errores_Hamming.md`

### Referencia de teoría
`docs/calidad y pruebas de software/SEMANA 9.md`

---

---

## ÍTEM 9 — Análisis de Líneas de Código
**Puntaje:** 2 puntos

### ✅ Estado: LISTO

### ¿Dónde está?

| Archivo | Descripción | Ruta |
|---------|-------------|------|
| `analisis_lineas_codigo.md` | ⭐ **PRINCIPAL** — Análisis completo de LOC con distribución por lenguaje, módulo y top 15 archivos | `PUNTOS_T2/analisis_lineas_codigo.md` |

### Datos clave a mencionar en la presentación

| Métrica | Valor |
|---------|-------|
| Total archivos fuente | **311 archivos** |
| Líneas de código estimadas | **~35,600 LOC** |
| TypeScript / TSX | 297 archivos · ~33,330 LOC · 94.3% |
| Python (Motor IA) | 13 archivos · ~2,007 LOC · 5.7% |
| Módulo más grande | `features/` con 110 archivos |
| Archivo más complejo | `server-thermal-printer.ts` (25.9 KB) |

---

---

## ÍTEM 10 — Análisis de Puntos de Función
**Puntaje:** 2 puntos

### ✅ Estado: LISTO

### ¿Qué es?
Análisis de complejidad del código usando la **Complejidad Ciclomática de McCabe** — equivalente al análisis de puntos de función pedido por el curso.

### ¿Dónde está?

| Archivo | Descripción | Ruta |
|---------|-------------|------|
| `paper_cientifico_avance.md` | ⭐ **SECCIÓN III** — Análisis completo de McCabe con grafo de flujo, cálculo V(G) y casos de prueba derivados | `docs/calidad y pruebas de software/paper_cientifico_avance.md` |

### Datos clave a mencionar en la presentación

| Métrica | Valor |
|---------|-------|
| Método analizado | `procesarPagoPedido()` — función de facturación |
| Nodos del grafo (V) | 11 |
| Aristas del grafo (E) | 13 |
| Complejidad Ciclomática | **V(G) = E - V + 2P = 13 - 11 + 2 = 4** |
| Caminos independientes | 5 caminos básicos |
| Nodos de decisión (D) | 4 decisiones → V(G) = D + 1 = 4 ✓ |
| Interpretación | Bajo riesgo estructural (rango 1-10 = excelente) |

### Los 5 caminos básicos y sus casos de prueba
1. **Camino 1:** Parámetros inválidos → excepción inmediata
2. **Camino 2:** Pedido ya pagado → error de idempotencia
3. **Camino 3:** Monto insuficiente → error de saldo
4. **Camino 4:** Pago exitoso en efectivo → impresión térmica
5. **Camino 5:** Pago exitoso digital → correo electrónico

---

---

## ÍTEM 11 — Avance de PAPER 1 — Formato IEEE (Resumen hasta Semana 9)
**Puntaje:** 1 punto

### ✅ Estado: LISTO

### ¿Dónde está?

| Archivo | Descripción | Ruta |
|---------|-------------|------|
| `paper_cientifico_avance.md` | ⭐ **PAPER COMPLETO** en formato IEEE con todas las secciones | `docs/calidad y pruebas de software/paper_cientifico_avance.md` |

### Estructura del paper (verificar que esté todo)

| Sección | Contenido | Estado |
|---------|-----------|--------|
| Título | "Análisis e Implementación de una Arquitectura Local-First..." | ✅ |
| Resumen (ES) | Arquitectura, ISO/IEC 25010, latencia, McCabe | ✅ |
| Abstract (EN) | Versión en inglés del resumen | ✅ |
| I. Introducción | Contexto MYPES Perú, problema SaaS, solución Local-First | ✅ |
| II. Modelo de Calidad ISO/IEC 25010 | Fiabilidad, Rendimiento, Portabilidad, Seguridad | ✅ |
| III. Metodología McCabe / Camino Básico | Grafo de flujo, V(G)=4, 5 caminos, casos de prueba | ✅ |
| IV. Resultados y Discusión | Tabla de latencia (12ms vs 185ms), 14 días en producción | ✅ |
| V. Conclusiones | Evaluación ISO/IEC 25010, recomendaciones | ✅ |
| Referencias | 5 referencias académicas (IEEE, McCabe, Sommerville...) | ✅ |

### ⚠️ Acción antes de presentar
El paper está en Markdown. Si el profe pide formato Word/PDF de dos columnas IEEE, convertirlo con:
- **Pandoc:** `pandoc paper_cientifico_avance.md -o paper.docx`
- **O manualmente** copiar a Word y aplicar plantilla IEEE

---

---

## ÍTEM 12 — Caso de Estudio Individual (Solución de Caso — Respuesta a Interrogantes)
**Puntaje:** 3 puntos ⭐ (el de mayor peso)

### ✅ Estado: LISTO

### ¿Dónde está?

| Archivo | Descripción | Ruta |
|---------|-------------|------|
| `Análisis y Responsabilidades del Sistema.md` | ⭐ **PRINCIPAL** — Descripción del software, temática del sistema y 35 responsabilidades del sistema numeradas | `PUNTOS_T2/Análisis y Responsabilidades del Sistema.md` |
| `HISTORIAS DE USUARIO Y REQUERIMIENTOS.md` | ⭐ **PRINCIPAL** — 15 RNF + 20 RF + 35 Historias de Usuario clasificadas por módulo | `PUNTOS_T2/HISTORIAS DE USUARIO Y REQUERIMIENTOS.md` |

### Contenido del caso de estudio

| Documento | Contenido | Cantidad |
|-----------|-----------|----------|
| Responsabilidades del Sistema | Multi-tenancy, LAN, Socket.IO, BCrypt, IGV, ESC/POS... | **35 ítems** |
| Requerimientos No Funcionales | RNF01 a RNF15 (Rendimiento, Seguridad, Usabilidad...) | **15 RNF** |
| Requerimientos Funcionales | RF16 a RF35 (Pedidos, Cocina, Facturación, Delivery...) | **20 RF** |
| Historias de Usuario | HU01 a HU35 clasificadas por módulo | **35 HU** |

### ¿Qué mostrar en la presentación?
1. Explicar la temática: sistema POS Local-First para cevichería
2. Mostrar las responsabilidades del sistema más importantes (RS1-RS10)
3. Destacar los RNF críticos: latencia < 200ms, FCP < 1.5s, 50 conexiones simultáneas
4. Conectar con el software real: "este requerimiento lo implementamos aquí..."

---

---

## 📁 RESUMEN: Todos los archivos en PUNTOS_T2/

```
PUNTOS_T2/
├── ESTE_ARCHIVO.md                              ← Guía de revisión (este documento)
│
├── ── DOCUMENTOS LISTOS ──
├── Análisis y Responsabilidades del Sistema.md  → Ítem 12
├── HISTORIAS DE USUARIO Y REQUERIMIENTOS.md     → Ítem 12
├── analisis_lineas_codigo.md                    → Ítem 9
└── diccionario_de_datos.md                      → Ítem 3
│
├── ── POR AGREGAR (cuando tengas los valores del profe) ──
├── ejercicio_deteccion_errores_CRC.md           → Ítem 7 ❌
└── ejercicio_correccion_errores_Hamming.md      → Ítem 8 ❌
```

---

## 📁 RESUMEN: Archivos fuera de PUNTOS_T2/ (pero parte de la entrega)

```
docs/
├── arquitectura/
│   ├── mapa_procesos_negocio.puml   → Ítem 2 ⭐ (RENDERIZAR ANTES)
│   ├── casos_uso.puml               → Ítem 2
│   ├── diagrama_paquetes.puml       → Ítem 2
│   ├── modelo_dominio.puml          → Ítem 2 / 3
│   └── modelo_datos.puml            → Ítem 3
│
└── calidad y pruebas de software/
    ├── paper_cientifico_avance.md   → Ítem 10 + Ítem 11 ⭐
    └── PPF_Bendistaurante_Plan_Pruebas_Funcionales.md → Ítem 6

prisma/
├── schema.prisma                    → Ítem 3 + Ítem 4
└── dev.db                           → Ítem 4 (abrir con Prisma Studio)

src/
├── app/login/                       → Ítem 5
├── app/pedidos/ mesas/ mesero/      → Ítem 6
└── features/billing/ orders/        → Ítem 6
```

---

## ✅ CHECKLIST FINAL ANTES DE LA PRESENTACIÓN

- [ ] Renderizar `mapa_procesos_negocio.puml` como imagen (Ítem 2)
- [ ] Renderizar `casos_uso.puml` como imagen (Ítem 2)
- [ ] Renderizar `modelo_datos.puml` como imagen ER (Ítem 3)
- [ ] Levantar servidor: `pnpm dev` (puerto :3001)
- [ ] Levantar Prisma Studio: `npx prisma studio` (puerto :5555)
- [ ] Levantar motor IA (opcional): `pnpm ai:start` (puerto :8000)
- [ ] Probar login con `admin@fondomarino.pe`
- [ ] Probar flujo completo: Pedido → Cocina → Factura
- [ ] Completar Ítem 7 y 8 (cuando tengas los valores a,b,c,d,e)
