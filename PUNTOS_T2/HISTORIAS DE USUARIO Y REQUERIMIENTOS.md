**REQUERIMIENTOS DE INFRAESTRUCTURA Y CALIDAD (NO FUNCIONALES)**

* **RNF01 (Multi-tenancy):** El sistema debe permitir la creación de instancias lógicas independientes para hasta 100 sucursales, asegurando el aislamiento de datos entre ellas.
* **RNF02 (Disponibilidad Local):** El software debe operar en modo offline dentro de una red LAN, permitiendo el envío de pedidos sin dependencia de internet.
* **RNF03 (Rendimiento Real-time):** El servidor de Socket.IO debe procesar y distribuir eventos de actualización de pedidos en un tiempo no mayor a 200 ms.
* **RNF04 (Seguridad/Hashing):** El sistema debe implementar BCrypt para el cifrado de credenciales y middleware de NextAuth para la protección de rutas privadas.
* **RNF05 (Adaptabilidad):** La interfaz de usuario debe ser Totalmente Responsiva, adaptándose automáticamente a pantallas de tablets (meseros) y monitores POS (caja).
* **RNF06 (Persistencia):** El sistema debe utilizar Prisma ORM para garantizar la integridad referencial y el control de versiones de la base de datos SQLite.
* **RNF07 (Usabilidad/UX):** El flujo de finalización de venta (checkout) debe completarse en una secuencia máxima de 4 interacciones de usuario.
* **RNF08 (Compatibilidad Hardware):** El sistema debe proveer controladores para la integración de impresoras térmicas (protocolo ESC/POS) y escáneres de códigos de barras.
* **RNF09 (Mantenibilidad):** El código fuente debe estar desarrollado en TypeScript bajo un esquema de tipado estricto para reducir errores en tiempo de ejecución.
* **RNF10 (Velocidad de Carga):** El First Contentful Paint (FCP) de la vista principal del dashboard no debe exceder los 1.5 segundos.
* **RNF11 (Escalabilidad):** El servidor debe soportar un mínimo de 50 sesiones de usuario concurrentes por cada sucursal sin degradación de latencia.
* **RNF12 (Resiliencia):** El sistema debe ejecutar una rutina de backup automatizada del archivo de base de datos cada 24 horas.
* **RNF13 (Localización):** El sistema debe estar configurado con la moneda nacional (Soles), zona horaria de Perú (UTC-5) y lógica tributaria vigente.
* **RNF14 (Trazabilidad):** El sistema debe generar un archivo de Logs que registre el ID de usuario, fecha y acción realizada en cada operación crítica.
* **RNF15 (Alineación BPM):** Los procesos de negocio implementados deben seguir el flujo lógico diagramado en los modelos de procesos (estándar BPMN).

**REQUERIMIENTOS FUNCIONALES (OPERATIVOS)**

* **RF16 (Control de Acceso):** El sistema debe permitir el inicio de sesión basado en roles (Admin, Cocina, Mesero) mediante tokens JWT.
* **RF17 (Gestión de Pedidos):** El módulo de ventas debe permitir clasificar las órdenes en: Consumo Local, Para Llevar o Delivery.
* **RF18 (Monitor de Mesas):** El sistema debe mostrar un mapa de mesas dinámico que actualice su estado (Libre/Ocupada/Sucia) en tiempo real.
* **RF19 (KDS - Kitchen Display System):** El módulo de cocina debe listar las comandas pendientes y permitir cambiar su estado a "En preparación" o "Listo".
* **RF20 (Validación de Identidad):** El sistema debe conectarse (vía API o algoritmo) para validar la estructura de números de RUC y DNI de los clientes.
* **RF21 (Cálculo Tributario):** El sistema debe desglosar automáticamente el IGV y otros tributos en el resumen de la cuenta.
* **RF22 (Facturación):** El software debe generar representaciones imprimibles de boletas y facturas electrónicas compatibles con el formato de ticket.
* **RF23 (Gestión de Insumos):** El sistema debe realizar el descargo automático de stock (inventario) basado en la receta técnica de cada plato vendido.
* **RF24 (Alertas de Stock):** El sistema debe emitir notificaciones visuales cuando un insumo llegue al punto de reorden o stock mínimo definido.
* **RF25 (Logística de Delivery):** El módulo de despacho debe permitir asignar motorizados y rastrear el estado del envío.
* **RF26 (Administración de Menú):** El administrador debe poder activar/desactivar productos y modificar precios con actualización inmediata en los terminales de venta.
* **RF27 (Arqueo de Caja):** El sistema debe proveer una función de cierre de caja para conciliar ingresos por efectivo, POS y billeteras digitales (Yape/Plin).
* **RF28 (Reportes):** El sistema debe generar reportes de ventas consolidados con opción de exportación a formatos .pdf y .xlsx.
* **RF29 (Control de Asistencia):** El software debe registrar la hora exacta de entrada y salida de los empleados para la gestión de turnos.
* **RF30 (Gestión de Promociones):** El sistema debe permitir la configuración de reglas de descuentos automáticos por fechas o campañas específicas.
* **RF31 (Auditoría de Pedidos):** El sistema debe permitir la consulta del historial de pedidos cerrados para la resolución de reclamos.
* **RF32 (División de Cuentas):** El módulo de pago debe permitir dividir el monto total de una mesa de forma equitativa o por productos seleccionados.
* **RF33 (Soporte Técnico):** El sistema debe incluir un módulo de registro de incidencias para reportar fallos de hardware o red interna.
* **RF34 (Personalización de Tickets):** El administrador debe poder configurar el texto del encabezado y pie de página de los comprobantes de venta.
* **RF35 (Business Intelligence):** El sistema debe presentar un Dashboard gerencial con indicadores clave (KPIs) como el plato más vendido y el ticket promedio.

## **HISTORIAS DE USUARIO**

##

* **HU01:** Como administrador, quiero que el sistema soporte múltiples sucursales independientes para gestionar cada una sin mezclar datos.
* **HU02:** Como mesero, quiero poder registrar pedidos sin internet dentro de la red local para no detener la atención.
* **HU03:** Como cocina, quiero recibir actualizaciones de pedidos en tiempo real para preparar órdenes sin retrasos.
* **HU04:** Como usuario del sistema, quiero que mis credenciales estén protegidas para mantener la seguridad de mi cuenta.
* **HU05:** Como mesero, quiero usar el sistema en tablet y que se adapte correctamente para trabajar cómodamente.
* **HU06:** Como administrador, quiero que la base de datos mantenga integridad y control de cambios para evitar errores.
* **HU07:** Como cajero, quiero finalizar una venta en pocos pasos para atender más rápido a los clientes.
* **HU08:** Como cajero, quiero que el sistema funcione con impresoras y escáneres para operar el punto de venta.
* **HU09:** Como desarrollador, quiero código tipado estrictamente para reducir errores en producción.
* **HU10:** Como usuario, quiero que el sistema cargue rápido para no perder tiempo al iniciar.
* **HU11:** Como administrador, quiero que el sistema soporte múltiples usuarios simultáneos para evitar caídas.
* **HU12:** Como administrador, quiero backups automáticos para no perder información.
* **HU13:** Como cajero, quiero que el sistema use moneda y reglas locales para emitir comprobantes correctos.
* **HU14:** Como administrador, quiero registrar acciones de usuarios para auditoría y control.
* **HU15:** Como administrador, quiero que el sistema siga procesos definidos para mantener el orden operativo.

### **Acceso y usuarios**

* **HU16:** Como usuario (Admin, Cocina o Mesero), quiero iniciar sesión según mi rol para acceder solo a lo que me corresponde.

### **Pedidos y atención**

* **HU17:** Como mesero, quiero clasificar pedidos (local, llevar, delivery) para gestionar correctamente la atención.
* **HU18:** Como mesero, quiero ver el estado de las mesas en tiempo real para organizar mejor a los clientes.
* **HU19:** Como cocina, quiero ver pedidos pendientes y cambiar su estado para controlar la preparación.

### **Clientes y pagos**

* **HU20:** Como cajero, quiero validar DNI o RUC para registrar correctamente a los clientes.
* **HU21:** Como cajero, quiero que el sistema calcule impuestos automáticamente para evitar errores.
* **HU22:** Como cajero, quiero generar boletas y facturas imprimibles para entregar comprobantes.

### **Inventario**

* **HU23:** Como administrador, quiero que el stock se descuente automáticamente al vender para mantener el inventario actualizado.
* **HU24:** Como administrador, quiero recibir alertas de stock bajo para reabastecer a tiempo.

### **Delivery**

* **HU25:** Como administrador, quiero asignar motorizados y ver el estado de entregas para controlar envíos.

### **Gestión del negocio**

* **HU26:** Como administrador, quiero modificar productos y precios para mantener actualizado el menú.
* **HU27:** Como cajero, quiero cerrar caja conciliando pagos para llevar control financiero.
* **HU28:** Como administrador, quiero generar reportes exportables para analizar ventas.
* **HU29:** Como administrador, quiero registrar asistencia de empleados para gestionar turnos.
* **HU30:** Como administrador, quiero configurar promociones para atraer clientes.

### **Control y soporte**

* **HU31:** Como administrador, quiero consultar el historial de pedidos para resolver reclamos.
* **HU32:** Como cliente (a través del mesero/caja), quiero dividir la cuenta para pagar de forma justa.
* **HU33:** Como usuario, quiero reportar incidencias para recibir soporte técnico.
* **HU34:** Como administrador, quiero personalizar tickets para reflejar la identidad del negocio.
* **HU35:** Como administrador, quiero ver indicadores clave en un dashboard para tomar decisiones.