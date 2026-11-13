# Revisión de requisitos y evidencia — INGENACC

Fecha: 22 de octubre de 2026. Rama local: `codex/implementacion`.
Esta revisión distingue implementación, evidencia ejecutada y aceptación empresarial. No certifica disponibilidad ni cumplimiento del 100 %.

## Documentos recibidos

Se extrajo y contrastó el contenido de seis archivos del RAR `DOCS SOFTWARE`:

| Documento | Aplicación al proyecto |
| --- | --- |
| Daily Kanban Meeting V5 | PB14/PB15 movimientos y PB02 sucursales. Los compromisos y estados históricos no prueban que las funciones estén terminadas. |
| Informe de Estado del Proyecto V4 | Se usa como contexto de planificación; porcentajes históricos no equivalen a cobertura de pruebas actual. |
| Métricas de Calidad v1.0 | Separar cobertura funcional, corrección, respuesta, acceso y recuperación; conservar denominadores y condiciones. Exige PostgreSQL: discrepancia pendiente con SQLite. |
| Instrumentos de Recolección de Datos v1 | Requiere mediciones observadas y evidencia del antes/después. No se sustituyen con ventas inventadas de la demo. |
| Plan de Pruebas Funcionales (ODT) | Doce casos CF01–CF12, trazados abajo. Comercio electrónico fuera del alcance inicial. |
| Plan de Pruebas Unitarias (XLSX) | Plantilla genérica sin resultados reales completados. Los resultados ejecutados se registran en las pruebas del repositorio. |

El ZIP contiene tres videos. Se inspeccionaron fotogramas de los tres: muestran una explicación docente de planes de pruebas, tablas de casos y matriz de trazabilidad de otro proyecto. No son evidencia de procesos reales de INGENACC. No se realizó transcripción completa del audio; cualquier instrucción verbal específica pendiente necesita un minuto de referencia.

## Matriz de trazabilidad

| Caso | Implementación y evidencia disponible | Pendiente para aceptación |
| --- | --- | --- |
| CF01 Login / logout | Cuatro roles probados; logout revoca token en SQLite; prueba rechaza token tras reabrir conexión. | Recuperación de contraseña, cuentas definitivas y política de sesiones de producción. |
| CF02 Sucursales | Selector de inventario con tienda Honda, multimarca y almacenes. | Validar sedes, nombres y asignaciones con empresa. No es un selector global para todas las operaciones. |
| CF03 Productos | Registro con SKU y barras únicos; restricciones SQL existentes. | Recorrer creación, duplicados y límites con catálogo definitivo. |
| CF04 Código de barras | Endpoint exacto y formulario POS existentes. | Probar lector USB y etiquetas reales, conocidos y desconocidos. |
| CF05 Entradas | Prueba API verifica aumento de stock y persistencia. | Confirmar documentos y permisos de ingreso reales. |
| CF06 Salidas | Prueba verifica salida y rechazo sin cambios por insuficiencia. | Aceptación de operador y trazas de una jornada real. |
| CF07 Stock | Consulta consolidada o ubicación; totales de la selección. | Conteo físico externo y conciliación del stock inicial. |
| CF08 Kardex | Filtros por producto, ubicación, tipo y fechas de Perú, rango inválido y estado vacío. | Verificación con datos de operación y períodos extensos. |
| CF09 Conteo | Registro pendiente sin cambiar stock; segundo usuario gerente/administración aprueba; ajuste auditado; rechazo si cambió saldo; bloqueo de ajuste directo. Pruebas API. | Confirmar responsables, tratamiento de conteos simultáneos y formularios de acta. |
| CF10 Compra parcial | Cantidades recibidas por línea, pendiente calculado, estado PARCIAL en UI, exceso rechazado y requestId persistente contra reenvío. Pruebas API. | Aceptar procedimiento de recepción y costo; costo actual se actualiza al último precio recibido, no es promedio ponderado. |
| CF11 Venta integrada | Prueba de venta conecta stock, Kardex, pago y caja; rechazo sin cambios. | Idempotencia general de ventas/pagos frente a reintentos de red, carga concurrente y recuperación ante caída. No se da el caso completo por aprobado. |
| CF12 Roles | API filtra colecciones y rechaza operaciones ajenas; pruebas almacén/ventas y autorización de conteos. | Aprobar matriz completa, revisar alcance por sucursal y privilegios de costos. |

## Cambios técnicos

- Catálogo público devuelve solo atributos comerciales, sin costos, stock interno ni códigos de barras.
- Bootstrap interno usa campos explícitos según rol; no entrega hashes ni series internas.
- Token verifica emisor y algoritmo; permisos se obtienen del usuario activo actual.
- Cierre de sesión revoca el token en tabla persistente.
- La protección de rutas se evalúa al entrar en la ruta privada. Se corrigió un estado calculado antes del login que redirigía de vuelta al acceso pese a credenciales válidas; detectado por prueba de navegador.
- Recepciones registran cantidad acumulada por línea y registro separado de cada entrega. El estado persistido sigue PENDIENTE mientras queden unidades; la interfaz muestra PARCIAL si ya recibió alguna.
- Migración 4 agrega recepciones parciales y migra líneas de compras ya recibidas; migración 5 agrega conteos y revocación.
- Conteos guardan creador, revisor, fecha, motivo y diferencia. Requieren persona distinta para aprobar.
- Cotización pública conserva la referencia del formulario antes de esperar la respuesta; evita el fallo de reset después de enviar.
- Base de demostración separada; no reemplaza una base operativa existente. Seis clientes adicionales, seis ventas, ingresos de stock, compra parcial y un conteo pendiente, todos ficticios.

## Restricciones para uso real

1. PostgreSQL está exigido por los documentos pero NO está implementado. Debe desarrollarse migración y probarse con respaldo antes de cambiar motor; SQLite se mantiene para el piloto local.
2. El repositorio reescribe un snapshot completo por operación. Las transacciones evitan escrituras parciales dentro de ese guardado, pero no equivalen a arquitectura multiinstancia segura ni a pruebas de concurrencia aprobadas.
3. No emitir comprobantes tributarios reales: falta proveedor/certificado/credenciales e integración SUNAT. Los medios de pago son registros manuales, no cobran por pasarela.
4. Recuperación de contraseña y TLS deben resolverse antes de exposición pública. La sesión se conserva en `sessionStorage`; para acceso por Internet se recomienda una cookie HttpOnly con protección CSRF. El guard de secreto largo en producción no certifica seguridad suficiente.
5. Restaurar un backup antiguo también restaura su estado de sesiones revocadas; rotar JWT_SECRET después de restauración de producción para evitar reactivación de sesiones anteriores.
6. No hay métricas reales de mejora antes/después, p95 bajo carga ni aceptación firmada. Los valores ficticios no deben usarse como resultados de investigación.
7. Devoluciones reponen stock pero la conciliación/reembolso financiero requiere terminarse. Margen del reporte usa costo actual estimado, no costo histórico contable.
8. La política de conteo rechaza cambios de saldo, pero no bloquea físicamente la ubicación mientras se cuenta. Definir ventanas y control de movimientos durante el conteo.

## Información para la siguiente iteración

- Marcas reales adicionales a Honda, catálogo con precios/costos y reglas de stock mínimo.
- Ubicaciones definitivas, quién cuenta y quién autoriza, y permisos de vendedores para ver costos o otras sedes.
- Número de usuarios simultáneos y acceso local o por Internet; servidor o servicio PostgreSQL disponible.
- Confirmar si el alcance académico incluye SUNAT o solo comprobantes internos.
- Logo y fotos originales autorizadas; los visuales conceptuales no se presentan como fotos de instalaciones reales.
- Si hay instrucciones verbales adicionales de los videos, indicar minuto de interés para transcripción y contraste.

Los archivos de `docs/diseno/` reservados para Claude no se modificaron. No se contactó a Claude ni se realizó integración de su rama: este checkout no tiene un remoto Git configurado.
