# Matriz de cobertura de entregables semanales

Esta matriz cruza el alcance descrito en los documentos de las semanas 1, 2 y 3 con el sistema entregable. “Operativo local” significa que el flujo funciona de extremo a extremo con SQLite; no equivale aún a una puesta en producción pública o multisucursal.

| Capacidad solicitada | Estado | Evidencia en el proyecto |
| --- | --- | --- |
| Autenticación y roles | Operativo local | Login bcrypt/JWT, caducidad, límite de intentos y permisos por ruta/API. |
| Sedes y almacenes | Operativo local | Cinco ubicaciones iniciales: tiendas, sótano y pisos de almacén. |
| Productos, marcas y categorías | Operativo local | SKU, código del fabricante, código de barras, marca libre, sector, costo y precio. |
| Inventario y Kardex | Operativo local | Stock por ubicación y movimientos con motivo, documento, responsable y saldo posterior. |
| Proveedores y compras | Operativo local | Alta de proveedor, orden de compra y recepción separada. |
| Clientes y ventas/POS | Operativo local | DNI/RUC/CE, carrito, búsqueda/escaneo, validación de stock y comprobante interno. |
| Pagos y saldos | Operativo local | Abonos, estado pendiente/parcial/pagado y varios medios de pago. |
| Caja básica | Operativo local | Apertura, ingresos/egresos, conciliación, efectivo esperado, cierre y diferencia. |
| Traslados | Operativo local | Salida de origen, entrada en destino y conservación del stock global. |
| Devoluciones | Operativo local | Referencia a venta original, documento propio y reposición opcional. |
| Dashboard, alertas y reportes | Operativo local | Indicadores, stock crítico, ventas, compras, margen y filtros por fecha. |
| Auditoría | Operativo local | Registro de acciones críticas; visible para Gerencia/Administración. |
| Respaldo | Operativo local | Exportación JSON sin hashes y copia íntegra de la base SQLite. |
| Acceso al sistema | Operativo | Instalación inicial segura, inicio de sesión adaptable y fotografías reales de las instalaciones. |
| Base de datos SQLite | Operativo local | Tablas normalizadas, FK, restricciones, índices, WAL, transacciones, migraciones y chequeo de integridad. |
| Base de datos PostgreSQL | Preparado para evolución | Recomendado para despliegue central, acceso multisucursal o alta concurrencia. |
| Facturación electrónica SUNAT | Bloqueado por datos externos | Requiere proveedor/API, certificado digital, series autorizadas y homologación. |
| Comercio electrónico, RR. HH. y contabilidad completa | Fuera de alcance | Excluidos expresamente del alcance semanal revisado. |
| RFID, IA predictiva y BI avanzado | Fuera de alcance | Excluidos del MVP; se pueden evaluar en una fase posterior. |

## Criterios de aceptación demostrables

- Una compra pendiente no altera stock; su recepción sí lo incrementa y crea Kardex.
- Una venta sin existencias suficientes es rechazada.
- La venta reduce stock, registra su documento y asocia el cobro a una caja abierta.
- Un traslado mantiene constante el total global del producto.
- Una devolución nunca elimina la venta original.
- Un cierre de caja compara el efectivo contado con el esperado, sin sumar pagos bancarios.
- Un usuario de almacén no puede consultar clientes ni ejecutar funciones financieras.
