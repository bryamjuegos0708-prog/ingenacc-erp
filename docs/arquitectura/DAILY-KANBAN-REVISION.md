# Daily Kanban INGENACC ERP

Registro preparado a partir de la revisión solicitada el 2 de octubre de 2026. Es un tablero inicial propuesto, no un acta de reunión celebrada ni un historial de trabajo del equipo. Los conteos corresponden exclusivamente a las cinco tarjetas definidas aquí.

Proyecto: INGENACC ERP, gestión comercial e inventario.
Integrantes del proyecto: Bryam Plasencia Ruiz y Jean Carlo Cruz Guzmán. Asistencia no confirmada.
Sprint: no confirmado. Hora de inicio y fin: no registradas.

## Estado del tablero

| Columna | Límite WIP propuesto | Actual | Excedido | Observación |
|---|---:|---:|---|---|
| Backlog / Por hacer | No aplica | 4 | No aplica | K02, K03, K04, K05 |
| En desarrollo | 2 | 0 | No | Sin implementación nueva en esta revisión |
| En revisión / QA | 2 | 1 | No | K01: validación de autenticación pendiente |
| Listo para desplegar | 1 | 0 | No | Ninguna tarjeta de esta revisión aprobada para despliegue |
| Hecho | No aplica | 0 | No aplica | No representa todos los módulos previos del proyecto |

## Tarjetas y prioridades

| ID | Trabajo | Responsable | Criterio para completar | Próxima acción |
|---|---|---|---|---|
| K01 | Diagnosticar ejecución de pruebas de autenticación | Por asignar | Identificar causa y ejecutar satisfactoriamente acceso de cuatro perfiles y rechazo de contraseña incorrecta | Obtener diagnóstico detallado en entorno compatible |
| K02 | Restringir datos consultables por rol | Por asignar | Consultas devuelven únicamente campos y entidades autorizados; pruebas negativas por rol | Definir matriz de lectura y filtrar /api/bootstrap |
| K03 | Proteger campos internos del catálogo público | Por asignar | Respuesta pública excluye costos y campos internos; prueba de contrato | Definir lista explícita de campos públicos |
| K04 | Medir cinco métricas de calidad | Por asignar | Cada métrica tiene fórmula, denominador, evidencia y resultado reproducible | Relacionar requisitos y casos de aceptación; no inventar porcentajes |
| K05 | Validar datos iniciales con INGENACC | Por asignar con representante de empresa | Catálogo, marcas y stock por ubicación conciliados y aprobados | Solicitar catálogo y conteo físico |

## Bloqueos e impedimentos

| Tarjeta | Impedimento | Responsable de resolver | Fecha límite |
|---|---|---|---|
| K01 | La ejecución actual informa fallo de auth.test.js sin causa detallada | Por asignar | Antes de afirmar que toda la suite pasa |
| K04 | Faltan mediciones y una base de requisitos con criterios de aceptación aprobados | Equipo, asignación por confirmar | Antes de entregar métricas con resultados |
| K05 | Falta confirmación de catálogo y existencias reales | Representante de INGENACC por confirmar | Antes del piloto con datos reales |

## Compromisos

No se atribuyen compromisos aceptados ni fechas acordadas a integrantes ausentes. Propuestas para la siguiente reunión: asignar K01–K05, confirmar los límites WIP y fijar fechas. La revisión de documentos y código y el registro de este tablero sí se realizaron.

## Evidencia y límites

- npm test --workspace server: la ejecución actual reportó cuatro archivos de prueba, tres aprobados y uno fallido (auth.test.js). No equivale a tres de cuatro funcionalidades aprobadas ni a cobertura del 75 %. La causa del fallo no está diagnosticada.
- Una ejecución anterior había informado ocho casos aprobados; no se presenta ese resultado histórico como validación actual.
- server/src/index.js: /api/bootstrap entrega el estado completo excepto el filtrado específico de usuarios y auditoría; requiere revisión de minimización de datos por rol.
- Comprobantes con billingStatus INTERNO: no afirmar integración SUNAT completada.
- server/src/repositories/storeRepository.js: escritura de snapshot completo con transacción; optimización y concurrencia requieren trabajo adicional.
- El documento de métricas exige al menos cinco métricas analizadas con ISO 25010 o 25012. Las fórmulas y resultados deberán sustentarse en mediciones, no en el número de módulos declarado.

Este registro no cambia el código ni declara resueltos los pendientes. Se conserva en la documentación técnica para orientar mejoras posteriores.
