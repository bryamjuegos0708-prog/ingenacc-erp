# Informe de auditoría técnica — INGENACC ERP

**Fecha:** 12 de noviembre de 2026  
**Versión revisada:** rama `codex/implementacion`  
**Escenario previsto:** servidor Windows en la red local, 3–4 usuarios registrados y aproximadamente 2 usuarios simultáneos.

## Resultado ejecutivo

INGENACC ERP se encuentra en condición de **piloto operativo en red local**. La aplicación compila, las pruebas automatizadas pasan y los flujos principales conservan la información en SQLite. Puede utilizarse para validar inventario, clientes, proveedores, compras, ventas, caja, proformas, pedidos, garantías y servicios con datos reales controlados.

Todavía no debe reemplazar por completo el sistema vigente ni emitir comprobantes tributarios reales. La integración con Facturador SUNAT requiere datos de la empresa, certificado, series, pruebas y homologación. Tampoco se ha validado el modelo real de impresora, lector ni etiqueta.

## Evidencia ejecutada

| Control | Resultado | Evidencia |
|---|---:|---|
| Pruebas automatizadas | APROBADO | 28 pruebas, 0 fallos |
| Compilación de producción | APROBADO | Vite generó el cliente sin errores |
| Dependencias de producción | APROBADO | `npm audit --omit=dev`: 0 vulnerabilidades conocidas |
| Persistencia | APROBADO | SQLite, claves foráneas, WAL, migraciones e integridad |
| Respaldo automático | APROBADO | Escritura atómica, lectura posterior, tamaño y SHA-256 verificados |
| Importación Excel | APROBADO | Vista previa, validación, máximo 2 000 filas e importación atómica |

## Mejoras aplicadas durante la revisión

- Se incorporó respaldo automático al iniciar y cada 24 horas, con retención configurable.
- Cada copia se vuelve a leer y se compara mediante SHA-256 antes de marcarla como correcta.
- La pantalla Configuración muestra la última copia, archivo, estado y fragmento de verificación.
- `BACKUP_DIR` permite guardar en una carpeta compartida de otra PC o NAS.
- La sesión del navegador se trasladó a `sessionStorage`; se elimina al cerrar la pestaña o navegador.
- Las fotografías de acceso, almacén y tienda fueron comprimidas para reducir el tiempo de carga.
- La importación de catálogo desde Excel evita registrar filas incompletas o duplicadas a medias.

## Debilidades y riesgos pendientes

| Prioridad | Hallazgo | Consecuencia | Tratamiento requerido |
|---|---|---|---|
| Crítica | Facturador SUNAT no está integrado ni homologado | Los comprobantes actuales son internos y no tienen validez tributaria | Configurar RUC, certificado, series, ambiente de pruebas y flujo de respuesta SUNAT |
| Alta | No existe restauración guiada desde la interfaz | Recuperar una copia exige detener el servidor y seguir el procedimiento técnico | Crear asistente de restauración y ensayar una recuperación completa |
| Alta | La ruta de red de respaldos aún no fue proporcionada | Por defecto la copia queda en la PC principal | Definir una ruta UNC, permisos de escritura y verificarla desde Configuración |
| Alta | La red local opera por HTTP | Un equipo con acceso a la red podría observar tráfico | Instalar HTTPS mediante proxy local o certificado administrado antes de ampliar el acceso |
| Alta | No se migraron ni conciliaron los datos del sistema anterior | El catálogo e historial reales aún no están comprobados | Exportar, depurar, importar y conciliar totales antes del cambio definitivo |
| Media | Falta cambio y recuperación de contraseña | La gestión de accesos depende del administrador técnico | Añadir cambio obligatorio, recuperación administrativa y política de caducidad |
| Media | Edición y desactivación de maestros no cubre todos los módulos | Corregir productos, clientes o proveedores puede requerir soporte | Añadir edición, desactivación y trazabilidad por entidad |
| Media | Impresora, lector y tamaño de etiqueta desconocidos | No puede asegurarse la impresión ni lectura real | Registrar modelos, conexión y medidas; realizar prueba física |
| Media | El token sigue accesible al JavaScript de la aplicación | Una inyección de código podría leer la sesión activa | Para publicación en Internet, migrar a cookie HttpOnly, SameSite y CSRF |
| Baja | Permanecen estilos y componentes históricos sin uso | Aumenta el mantenimiento, aunque no afecta la operación | Eliminar código muerto después de validar las pantallas definitivas |

## Adecuación de la arquitectura

SQLite con una API central es apropiado para el escenario confirmado de una tienda, varias PC en la misma red y dos personas simultáneas. El servidor debe ejecutarse en una sola PC estable; las demás estaciones acceden por navegador. Si se incorporan sedes remotas, acceso público o mayor concurrencia, se debe migrar a PostgreSQL y desplegar detrás de HTTPS.

## Criterio de puesta en marcha

Antes de usarlo con ventas reales deben cumplirse estas condiciones:

1. Crear usuarios individuales y cambiar las credenciales iniciales.
2. Configurar la carpeta de red y comprobar desde la pantalla que la copia fue verificada.
3. Importar una muestra del catálogo real y conciliar existencias y precios.
4. Probar venta, adelanto, cierre de caja, garantía y recepción de compra con responsables de la empresa.
5. Confirmar impresión y lectura de códigos con los equipos reales.
6. Mantener la emisión tributaria en el sistema vigente hasta completar Facturador SUNAT.

## Veredicto

La versión es **funcional y demostrable**, con una base suficiente para iniciar un piloto controlado. No se declara “100 % en producción” porque SUNAT, restauración ensayada, migración de datos y hardware real siguen pendientes. Estas limitaciones dependen de información y equipos externos; ocultarlas pondría en riesgo la operación de la empresa.
