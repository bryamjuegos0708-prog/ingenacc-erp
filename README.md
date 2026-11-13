# INGENACC ERP

Sistema interno para inventario, compras, ventas, caja, clientes, proveedores, proformas, pedidos, garantías y servicio técnico de INGENACC Maquinarias y Equipos S.A.C.

La instalación inicia sin operaciones ni usuarios precargados. La primera persona autorizada configura la empresa y crea la cuenta de gerencia mediante un código privado generado en el equipo servidor.

## Inicio rápido en Windows

1. Instala Node.js 24 o superior desde <https://nodejs.org/>.
2. Extrae todo el ZIP en una carpeta normal; no lo ejecutes desde la vista comprimida.
3. Abre `INICIAR-SISTEMA-WINDOWS.bat`.
4. Abre `ACCESO-INICIAL.txt` y usa su código para completar la configuración inicial.
5. Crea las cuentas de jefe, caja, ventas y almacén desde **Usuarios y roles**.

La PC principal debe permanecer encendida. Las otras PC de la misma red acceden a `http://IP-DE-LA-PC-PRINCIPAL:4000`.

Permite Node.js en la red privada de Windows. No abras el puerto 4000 directamente en el router.

## Funciones incluidas

- Inicio de sesión, sesiones revocables, contraseñas cifradas y permisos por rol.
- Productos con SKU y código de barras automáticos, precios, costos, series y garantía.
- Importación de hasta 2000 productos desde una plantilla Excel, con vista previa y validación atómica.
- Stock por tienda Honda, tienda multimarca, sótano, piso 3 Honda y piso 4 multimarca.
- Kardex, ingresos, salidas, ajustes, traslados y conteos físicos con aprobación.
- Historial de clientes, proveedores, compras y recepciones parciales.
- Proformas, simulación de pedidos, adelantos, descuentos autorizados y entrega completa.
- Ventas, pagos, caja, comprobantes internos, auditoría y respaldos.
- Consultor Inacc con ayuda local y conexión opcional a IA externa desde el servidor.
- Diseño adaptable para computadora, tableta y teléfono.

## Datos y respaldos

Los datos se guardan en `server/data/ingenacc.db` dentro de la PC principal. SQLite usa integridad referencial, transacciones, modo WAL y espera de escritura para el uso previsto de 3 a 4 personas, con aproximadamente 2 personas simultáneas.

En **Configuración** se puede descargar una copia JSON portable y una copia completa de la base SQLite. El servidor también crea una copia automática cada 24 horas, la vuelve a leer y verifica tamaño y SHA-256. Configura `BACKUP_DIR` con una carpeta de red o unidad externa; no conserves la única copia en la PC principal.

Para comprobar la base:

```powershell
npm.cmd run db:check
```

## Ejecución manual

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Abre <http://localhost:4000>.

## Publicación con Docker

El proyecto incluye `Dockerfile`, `docker-compose.yml` y `.env.production.example`. En un servidor con Docker:

```sh
cp .env.production.example .env
# Cambia JWT_SECRET y SETUP_TOKEN por valores privados y largos.
docker compose up -d --build
```

Usa un volumen persistente para `/app/server/data` y un proxy HTTPS como Caddy, Nginx o el del proveedor. GitHub Pages y los alojamientos puramente estáticos no pueden ejecutar este ERP porque necesita API, sesiones y base de datos.

## Antes de reemplazar el sistema actual

- Importar y conciliar el catálogo, existencias, clientes y proveedores reales.
- Hacer un conteo físico por las cinco ubicaciones.
- Configurar y certificar el proveedor real de facturación electrónica SUNAT.
- Validar lectores, impresoras de etiquetas y formatos de comprobante en los equipos reales.
- Ejecutar una prueba de aceptación con gerencia, jefatura, caja, ventas y almacén.
- Configurar la ruta externa del respaldo automático y probar una restauración completa.

Los comprobantes internos no adquieren validez tributaria hasta completar la integración y homologación con el proveedor SUNAT de la empresa.

## Importar el catálogo existente

En **Productos**, gerencia o jefatura selecciona **Importar Excel** y descarga la plantilla incluida. El sistema revisa códigos duplicados, precios, stock, sectores y ubicaciones antes de guardar. Si una fila presenta errores, no se importa ninguna; así se evita dejar un catálogo parcial.

Consulta [GUIA-PUESTA-EN-MARCHA.md](GUIA-PUESTA-EN-MARCHA.md) para la instalación y `docs/arquitectura/` para las decisiones, cobertura y modelo de datos.
