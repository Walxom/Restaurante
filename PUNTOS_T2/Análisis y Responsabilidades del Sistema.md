**2026**

**FACULTAD DE INGENIERIA**

**TEMA:** SPRINTS 1

**CURSO:** CALIDAD Y PRUEBAS DE SOFTWARE

**DOCENTE:** CARLOS ALBERTO CHIRINOS MUNDACA

**AUTORES: NRC:**

* LUJAN GUEVARA, JEFFREY ANDERSON N00341596
* PORRAS PEREDA, JOHAN ALDAIR N00329648
* CHAFLOQUE SALINAS, JOSE LUIS N00309948
* TERRONES QUEZADA, JOSBEL FABIAN N00282251

**TRUJILLO – 2026**

**ÍNDICE**

[**Software de Desarrollo - Estructura Procedimental a Analizar** 3](#_Toc228517233)

[**Temática** 3](#_Toc228517234)

[**Responsabilidade del Sistema** 3](#_Toc228517235)

# **Software de Desarrollo - Estructura Procedimental a Analizar**

Sistema web monolítico full-stack desarrollado en TypeScript/Next.js 15 con React 19 para frontend, API Routes Node.js para backend, Prisma ORM como abstracción de datos sobre SQLite local, Socket.IO para comunicación real-time bidireccional, NextAuth para autenticación JWT, y Tailwind CSS + Radix UI para interfaz responsiva; arquitectura actualmente orientada a una sucursal pero extensible mediante rediseño a multi-tenancy para operación en 100 sucursales distribuidas.

# **Temática**

Sistema integral de gestión para restaurantes que automatiza el ciclo operativo completo: desde la toma de órdenes en mesa/para-llevar/delivery con seguimiento en tiempo real, gestión de estado de preparación en cocina, control de inventario de ingredientes con alertas automáticas, generación de comprobantes fiscales (boleta/factura) con cálculo de impuestos, impresión térmica de tickets y comprobantes, hasta reportes de ventas consolidados; integrando múltiples roles de usuario (jefe/mesero), validaciones de datos comerciales (DNI/RUC), y sincronización entre dispositivos conectados en la red local del restaurante.

# **Responsabilidade del Sistema**

**1.** Aislar los datos de hasta 100 sucursales distintas mediante arquitectura multi-tenancy escalable.

**2.** Operar el sistema bajo red local (LAN) para garantizar continuidad en la toma de pedidos ante fallas de internet.

**3.** Garantizar actualizaciones de Socket.IO con latencia menor a 200 ms entre dispositivos de la misma red.

**4.** Proteger la información mediante encriptación de contraseñas con hashing (BCrypt), resguardo de rutas con middleware de NextAuth.

**5.** Adaptar la interfaz frontend para funcionamiento responsivo en tablets de meseros, monitores táctiles de caja.

**6.** Asegurar persistencia de datos mediante Prisma ORM con integridad referencial, migraciones seguras sobre SQLite.

**7.** Optimizar experiencia de usuario (UX) limitando proceso de checkout a máximo de 4 clics.

**8.** Compatibilizar el sistema con impresoras térmicas estándar (ESC/POS), lectores de código de barras.

**9.** Estructurar el código con tipado estricto en TypeScript, aplicar patrones de diseño para facilitar mantenimiento.

**10.** Reducir tiempo de carga inicial (FCP) de la aplicación principal a menos de 1.5 segundos.

**11.** Soportar al menos 50 conexiones simultáneas por sucursal sin degradación del servicio.

**12.** Implementar copias de seguridad automáticas diarias del archivo SQLite para asegurar resiliencia de base de datos.

**13.** Configurar formatos locales de moneda (Soles), zonas horarias de Perú, impuestos correspondientes.

**14.** Registrar logs de acciones críticas vinculadas a usuarios responsables para garantizar auditabilidad.

**15.** Aplicar estándares BPM en flujos de trabajo conforme a herramientas como Bizagi.

**16.** Autenticar usuarios mediante JWT con NextAuth para roles de Administrador, Jefe de Cocina, Mesero.

**17.** Registrar pedidos diferenciando tipos de atención: consumo en mesa, para llevar, delivery.

**18.** Actualizar en tiempo real estado de mesas mediante Socket.IO en dispositivos conectados.

**19.** Visualizar órdenes pendientes en cocina, marcar estado como “En preparación”, “Listo”.

**20.** Validar documentos (RUC, DNI) para emisión de comprobantes fiscales en Perú.

**21.** Calcular automáticamente IGV, tributos aplicables al finalizar cada orden.

**22.** Generar comprobantes electrónicos (boletas, facturas), imprimir desde sistema POS.

**23.** Descontar automáticamente insumos del inventario según recetas de cada plato vendido.

**24.** Emitir alertas automáticas cuando stock de insumos críticos alcance niveles mínimos.

**25.** Asignar repartidores, actualizar estado de pedidos delivery (“En camino”, “Entregado”).

**26.** Modificar menú dinámico activando platos, desactivando platos, actualizando precios en tiempo real.

**27.** Ejecutar cierre de caja diario comparando ingresos en efectivo, tarjetas, aplicaciones móviles.

**28.** Generar reportes consolidados de ventas (diarios, semanales, mensuales) exportables a PDF, Excel.

**29.** Registrar entrada, salida del personal para control de turnos laborales.

**30.** Aplicar reglas de negocio para descuentos, promociones en fechas específicas.

**31.** Consultar historial de pedidos para atención de reclamos, auditorías internas.

**32.** Dividir cuentas de mesas entre comensales de forma proporcional, por productos.

**33.** Registrar incidentes técnicos relacionados con hardware POS, conectividad en módulo de soporte TI.

**34.** Configurar encabezados, pies de página personalizados en tickets de venta.

**35.** Visualizar KPIs estratégicos como ticket promedio, platos más vendidos en dashboard gerencial.