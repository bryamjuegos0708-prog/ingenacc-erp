# Base de datos SQLite

INGENACC ERP usa SQLite mediante el módulo nativo `node:sqlite` de Node.js 24. La conexión se crea en `server/src/db/database.js`, las migraciones se ejecutan en orden y `StoreRepository` traduce las entidades del dominio a tablas relacionales.

## Ubicación y configuración

- Ruta predeterminada: `server/data/ingenacc.db`.
- Ruta personalizada: variable `DATABASE_PATH` en `.env`.
- Claves foráneas: activas en cada conexión.
- Diario: WAL.
- Espera de bloqueo: 5 segundos.
- Integridad: `npm.cmd run db:check`.

## Grupos de tablas

| Área | Tablas principales |
| --- | --- |
| Configuración | `app_metadata`, `company`, `document_series`, `brands`, `locations` |
| Inventario | `products`, `inventory_stock`, `inventory_movements`, `transfers` |
| Comercial | `clients`, `invoices`, `invoice_items`, `payments`, `sale_returns` |
| Abastecimiento | `suppliers`, `purchases`, `purchase_items` |
| Caja | `cash_sessions`, `cash_movements` |
| Seguridad | `users`, `audit_log` |
| Portal | `quotes` |

Las vistas `stock_totals` y `open_cash_sessions` ofrecen consultas operativas directas. Los índices cubren búsquedas de productos, stock por sede, Kardex, ventas, compras, pagos, caja y auditoría.

## Escrituras y migraciones

Cada cambio de negocio se confirma mediante una transacción `BEGIN IMMEDIATE`. Ante una restricción, error de datos o clave foránea inválida se ejecuta `ROLLBACK`, por lo que no queda una venta, compra o movimiento parcialmente guardado.

`schema_migrations` registra cada versión aplicada. Al actualizar el programa, solo se ejecutan las migraciones pendientes. Si existe un antiguo `server/data.json` y todavía no hay base SQLite, se importa una vez y se convierten las credenciales a hashes bcrypt.

## Respaldos

- **JSON portable:** se descarga desde Configuración y excluye hashes de acceso.
- **SQLite completa:** conserva tablas, relaciones, migraciones y hashes bcrypt. Debe tratarse como un archivo confidencial.

Para restaurar manualmente una copia completa, detén INGENACC ERP, conserva una copia del archivo actual y reemplaza `server/data/ingenacc.db` por el `.db` respaldado. Luego ejecuta `npm.cmd run db:check` antes de iniciar el sistema.

## Escalamiento

SQLite es apropiado para una instalación local o un servidor único de oficina. Para acceso público, varias sedes con conexión permanente o alta concurrencia se recomienda mantener la misma capa de repositorios y migrar el motor a PostgreSQL administrado.
