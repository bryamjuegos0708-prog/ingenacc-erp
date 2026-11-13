# Historial de clientes, proformas y pedidos

## Reglas confirmadas

Vigencia: siete días. Precios incluyen IGV. Adelanto mínimo: 50 %. Se admiten varias unidades y productos por encargo. No se entrega a crédito.

## Funciones implementadas

- Clientes reúne compras, pagos, equipos, atenciones, proformas y pedidos. Volver a cotizar recupera cliente y cantidades con precios actuales, sin repetir descuentos antiguos.
- La simulación no escribe datos ni mueve caja o inventario. Las proformas guardadas conservan cliente, productos y precios de emisión. Se imprimen o guardan como PDF desde el navegador.
- Aceptar una proforma vigente crea un pedido con adelanto mínimo del 50 % en caja abierta de la tienda. Los reintentos de pagos se identifican para no duplicar ingresos.
- Los pedidos por encargo no reservan stock. La recepción física se registra en los módulos existentes antes de entregar. La entrega requiere todas las unidades disponibles y saldo cero; genera nota de venta interna y vincula los pagos previos sin duplicar caja.
- Un pedido de cliente es distinto de una orden de compra a proveedor, gestionada en Compras y recepción.
- 130 referencias únicas de folletos Honda, Eco Power y Bonhoeffer; se omiten páginas repetidas. Jefe o gerente registra precio, costo y código de barras antes de cotizar un nuevo modelo. Comienza sin stock. Modelos transcritos deben cotejarse con equipo/proveedor; no se inventan especificaciones ni garantías.
- Migración 7 añade tablas SQLite proformas y customer_orders sin borrar registros existentes. Los datos se guardan en la PC servidor, no en cada navegador.

## Verificación

23 pruebas automatizadas. Compilación TypeScript/Vite correcta. Chromium con Playwright (plugin Browser no disponible), escritorio 1440×1000 y móvil 390×844: simulación sin escritura, proforma, PDF A4 de una página, adelanto, saldo, entrega y recotización. Página con contenido e identidad correctos; sin errores de aplicación, consola o framework. Correcciones: desbordamiento móvil, páginas vacías de impresión y dependencia de Google Fonts. Se usan fuentes del sistema. Queda una advertencia de tamaño del módulo 3D, cargado por separado.

## Pendiente para producción

SUNAT no está integrado. Falta nombre del sistema actual y proveedor, documentación de integración, exportación de datos reales y conciliación. PostgreSQL solicitado en los documentos sigue pendiente: esta versión utiliza SQLite con una sola API central. Las credenciales y operaciones demo no deben usarse en producción.

Falta definir cancelación de encargos, devolución de adelantos y cambios de fecha; no se implementaron anulaciones de pedidos cobrados. Confirmar plazos de proveedores y responsable del seguimiento. Validar modelos de impresora/lector, medidas de etiquetas, HTTPS, usuarios individuales, restauración y operación en las PC reales. No se afirma homologación SUNAT ni certificación productiva.
