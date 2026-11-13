# Reglas confirmadas por la empresa — 23/10/2026

Este documento actualiza las decisiones anteriores de la demo y tiene prioridad sobre ejemplos históricos del README y matrices previas.

## Contexto confirmado

- 3–4 usuarios en varias PC de una misma red local, aproximadamente 2 simultáneos.
- Honda, Bonhofer, Italika y Makita, además de otras marcas todavía por identificar.
- Tienda Honda, tienda multimarca, almacén sótano, piso 3 Honda y piso 4 multimarca.
- Solo jefe y gerente: acceso a costos, cambio de precios, aprobación de ajustes y cierre de caja.
- Sin crédito, con adelantos y descuentos. Entregas completas.
- Sin devoluciones comerciales. Sí garantías, series y servicio técnico.
- Existe un sistema con facturación electrónica que se pretende reemplazar. Proveedor y mecanismo de integración todavía desconocidos.
- Existen etiquetas y equipo de códigos de barras; modelo, conexión y dimensiones pendientes.

## Implementación de esta entrega

1. Rol JEFE separado del rol ADMINISTRACION/caja. La columna authority_role permite conservar el esquema histórico de usuarios sin reconstruir las tablas relacionadas; la API utiliza JEFE como rol efectivo. La cuenta de jefe incluida es exclusivamente de demostración.
2. Costos ausentes de la respuesta de productos y búsqueda por barras para operativos. Compras operativas muestran cantidades, pero no costos ni totales. Creación de productos/compras y edición de precios quedan en jefatura/gerencia porque implican costos.
3. Adelanto positivo genera una venta RESERVADA. Se descuenta de la disponibilidad, pero no del stock físico. Salidas y traslados no pueden consumir unidades reservadas. Al pagar el saldo, se genera la salida completa y queda ENTREGADO.
4. Esta entrega interpreta que pago completo y entrega completa se registran juntos. Confirmar con la empresa si el retiro ocurre después; en tal caso separar el botón de despacho de la liquidación del pago.
5. Descuento en soles autorizado únicamente por jefe/gerente; queda en el comprobante interno. El precio de catálogo de otras operaciones no cambia.
6. Devoluciones comerciales bloqueadas por API y ocultas en menú; los registros históricos se conservan.
7. Registro de serie única vinculado a una unidad de una venta entregada, producto y cliente. Rechaza series duplicadas y unidades superiores a las vendidas. Garantía en días ingresada según documento real, con fecha inicial de salida registrada o fecha de venta histórica.
8. Garantía/reparación/mantenimiento: recepción, diagnóstico, reparación o listo, entrega. No se puede saltar de recibido a entregado. Cambios de estado autorizados por jefe/gerente, con diagnóstico y auditoría.
9. El registro de series cubre equipos vendidos; no implementa todavía inventario individual por serie desde la recepción de compras. Las reparaciones registran seguimiento; no descuentan repuestos ni facturan mano de obra automáticamente.
10. Las ventas antiguas mantienen su estado histórico ENTREGADO al migrar. No se revierten salidas ya registradas aunque conserven saldos. La política sin crédito se aplica a operaciones nuevas.

## Red local

Ejecutar `INICIAR-RED-DEMO-WINDOWS.bat` SOLO en una PC principal. Las otras abren la dirección que aparece como `Otras PC: http://IP:4000` en sus navegadores. La PC principal debe permanecer encendida.

La base SQLite está en la PC principal: `server/data/ingenacc-demo-red.db`. No colocar la base en una carpeta compartida ni iniciar varias APIs apuntando al mismo archivo. El modo red de esta entrega es para demostración con credenciales conocidas; no sustituye todavía el sistema empresarial.

En Windows autorizar Node únicamente para red privada. No publicar el puerto del router. Si el enlace cambia al reiniciar el router, reservar IP para la PC principal. Para operación real falta instalar HTTPS, usuarios definitivos, respaldos, recuperación probada y resolver el requisito PostgreSQL de los documentos.

El generador de identificadores de recepción usa `crypto.getRandomValues`, para funcionar también con HTTP dentro de LAN, donde `crypto.randomUUID` puede no estar disponible.

## Verificación y límites

Las pruebas incluyen permisos de caja/ventas/almacén, jefe, adelanto sin salida, reserva de disponibilidad, liquidación con entrega, registro de serie única, servicio técnico, persistencia y dos ventas simultáneas sobre el mismo stock. Esta última prueba verifica dos solicitudes al mismo proceso Node; no equivale a un estudio de carga ni a una validación multiinstancia.

No se han probado impresoras/lectores físicos ni facturación SUNAT. No se realizó migración de datos del sistema actual ni sustitución de su operación. La información sintética sigue marcada DEMO.

## Información pendiente, sin necesidad de contraseñas

- Nombre del sistema actual y proveedor SUNAT; captura de su nombre o sección de configuración sin secretos.
- Un comprobante de ejemplo con datos personales ocultos para conocer formato y campos.
- Modelo de impresora, modelo de lector y tamaño de etiqueta.
- Excel de catálogo (SKU, barras, marca, precio, costo, stock por sede, serie si aplica).
- Política de garantía por marca y quién realiza el diagnóstico técnico.
- Confirmar retiro posterior al pago, cancelación de reservas y tratamiento de adelantos cuando el cliente no completa la compra.
- Material adicional de la presentación y criterios de evaluación del docente.

## Validación de esta entrega

- 17 pruebas automatizadas aprobadas; compilación TypeScript/Vite correcta.
- Navegador: acceso, permisos, recepción parcial, conteos, adelanto y reserva, series y servicio técnico; escritorio y móvil sin errores JavaScript.
- Inicio de demo en modo LAN y acceso de jefatura verificados. La detección de IP tiene alternativa si el sistema no permite consultar interfaces.
- No se ha probado con las PC, impresora o lector reales de la empresa ni con SUNAT. No constituye certificación de producción.
