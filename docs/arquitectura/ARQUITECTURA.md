# Arquitectura de INGENACC ERP v4

```text
Navegador
  ├─ Portal público React + Vite
  │    ├─ catálogo y cotizaciones
  │    └─ Three.js cargado bajo demanda
  └─ ERP React por roles
       │ REST + JWT
       ▼
Servidor Express
  ├─ autenticación bcrypt + JWT + límite de intentos
  ├─ RBAC: GERENTE / ADMINISTRACION / VENTAS / ALMACEN
  ├─ productos, ubicaciones, inventario, traslados y Kardex
  ├─ proveedores, compras y recepción
  ├─ clientes, POS, comprobantes internos, pagos y devoluciones
  ├─ sesiones y movimientos de caja
  ├─ Zod, auditoría y exportación de respaldos
  └─ repositorio transaccional y migraciones SQL
       │
       ▼
SQLite · server/data/ingenacc.db
  ├─ tablas normalizadas y claves foráneas
  ├─ índices y vistas operativas
  └─ WAL, restricciones e integridad verificable
```

## Reglas de negocio implementadas

- Todo cambio de existencias crea un movimiento de Kardex con saldo posterior y responsable.
- Crear una compra no cambia el inventario. Confirmar la recepción incrementa stock y genera entradas.
- Una venta valida existencias, descuenta stock, crea el comprobante y registra el pago en una transacción.
- Un traslado reduce el origen, aumenta el destino y conserva el total global.
- Una devolución conserva la venta original, emite su documento y, si corresponde, repone inventario.
- Los pagos en efectivo, tarjeta, transferencia y Yape/Plin se concilian con la caja abierta; solo el efectivo modifica el arqueo físico.
- La API calcula los importes y el IGV de 18 %, en lugar de confiar en totales enviados por el navegador.
- Los hashes de contraseña no salen en respuestas normales ni en el respaldo JSON portable.
- Si una escritura SQL falla, la transacción revierte el conjunto completo y conserva el estado anterior.

## Decisiones del MVP

- Web pública y ERP comparten React, pero el área interna exige sesión vigente.
- Three.js vive en un fragmento diferido para no afectar la carga del ERP.
- El catálogo acepta marcas libres; Honda está identificada y la lista multimarca definitiva sigue pendiente de validación.
- SQLite permite una base relacional real en una PC sin instalar ni contratar infraestructura adicional.
- El repositorio conserva el contrato de dominio de React y traduce sus entidades a tablas SQL normalizadas.
- El respaldo JSON omite credenciales; la copia SQLite completa contiene hashes y debe protegerse.
- La facturación es interna. SUNAT requiere proveedor, API, certificado, series autorizadas y homologación.

## Evolución recomendada para producción

1. Para varias sucursales o despliegue público, migrar el repositorio a PostgreSQL administrado.
2. Servir por HTTPS, usar secretos administrados y rotar la clave JWT.
3. Añadir recuperación de contraseña, MFA y administración/revocación de sesiones.
4. Automatizar respaldos, restauración ensayada, observabilidad y pruebas E2E en CI.
5. Conectar el proveedor de comprobantes electrónicos aprobado por INGENACC.
