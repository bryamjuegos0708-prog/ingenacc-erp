# División de trabajo INGENACC

## Codex — rama `codex/implementacion`

- [x] Arquitectura React + Vite + Express.
- [x] Web pública adaptable e identidad INGENACC/Honda.
- [x] Login con bcrypt, JWT, vencimiento, límite de intentos y cuatro roles.
- [x] Productos, códigos de barras, inventario por sede, Kardex y validación de stock.
- [x] Proveedores, órdenes de compra y recepción de mercadería.
- [x] Clientes, POS, comprobantes internos, pagos y caja con arqueo.
- [x] Traslados, devoluciones y reglas de reversión trazable.
- [x] Usuarios, permisos, dashboard, auditoría, reportes y respaldo operativo.
- [x] Acceso adaptable optimizado, compilación y prueba integral de la API.
- [x] SQLite relacional con migraciones, transacciones, repositorio, restricciones, respaldos y pruebas.
- [ ] Migración opcional a PostgreSQL y despliegue productivo multisucursal.
- [ ] Integración SUNAT cuando exista proveedor y credenciales.

## Claude — rama `claude/diseno-contenido`

- [ ] Dirección visual definitiva y tokens de marca.
- [ ] Textos comerciales validados por INGENACC.
- [ ] UX writing, estados vacíos y mensajes de ayuda.
- [ ] Documentación propia en `docs/diseno/`.
- [ ] Inventario de fotografías, marcas autorizadas y modelos 3D reales.

## Reglas de integración

- Claude no modifica la lógica de `server/src/` sin coordinación.
- Codex no sobrescribe `docs/diseno/`.
- Los cambios compartidos en estilos se integran mediante revisión del diff y prueba completa.
- Antes de combinar ramas: ejecutar `npm.cmd install`, `npm.cmd test` y `npm.cmd run build`.

## Datos pendientes del cliente

- Lista exacta de multimarcas.
- Catálogo y stock inicial reales.
- Contactos comerciales públicos.
- Elección del proveedor/API SUNAT.
