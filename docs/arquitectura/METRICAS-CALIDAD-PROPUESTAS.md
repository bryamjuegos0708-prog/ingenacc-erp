# Métricas de calidad de INGENACC ERP

Propuesta para completar el formato académico revisado el 2 de octubre de 2026. Marco de referencia: ISO/IEC 25010:2023, modelo de calidad del producto (https://www.iso.org/standard/78176.html). Las fórmulas son definiciones operacionales del proyecto; no son fórmulas obligatorias ni umbrales impuestos por ISO. Todos los resultados están pendientes de medición formal. No declarar certificación ni cumplimiento total.

| Métrica | Objetivo | Método y fórmula | Interpretación y escala | Tipo | Fuente |
|---|---|---|---|---|---|
| Completitud funcional | Verificar funciones del alcance acordado | Contrastar requisitos con pruebas de aceptación. CF = funciones implementadas y aceptadas / funciones requeridas en el alcance | 0 a 1; mayor es mejor | Razón, adimensional | Requisitos aprobados, matriz de trazabilidad y actas de aceptación |
| Corrección de operaciones | Verificar resultados de ventas, pagos, stock y caja | Casos con resultados esperados independientes. CO = casos correctos / casos ejecutados | 0 a 1; mayor es mejor | Razón, adimensional | Casos de prueba, respuestas API y registros de base de datos |
| Tiempo de respuesta | Medir rapidez de operaciones críticas | Medir por operación desde solicitud hasta respuesta completa. TR = suma de duraciones / número de solicitudes; registrar también p95 | Milisegundos, >=0; menor es mejor bajo iguales condiciones | Razón, tiempo | Herramienta HTTP, registros de medición, hardware y carga documentados |
| Eficacia del control de acceso | Evaluar protección de funciones y datos | Probar lectura y escritura con cada rol, sin sesión y con token vencido. CA = intentos no autorizados correctamente bloqueados sin exposición de datos / intentos no autorizados ejecutados | 0 a 1; mayor es mejor; un fallo requiere análisis | Razón, adimensional | Matriz de permisos aprobada y pruebas API negativas |
| Recuperación mediante respaldo | Verificar recuperación de información persistente | Restaurar copias en entorno aislado; comparar datos y comprobar integridad. RR = restauraciones que cumplen todos los criterios / restauraciones intentadas | 0 a 1; mayor es mejor | Razón, adimensional | Copias SQLite, comprobaciones de integridad y actas de restauración |

Si el denominador es cero, reportar no evaluado. Registrar versión del código, fecha, entorno, muestra y evidencia en cada medición. Las metas deben acordarse antes de ejecutar la evaluación.

## Relación con el proyecto y pendientes

- Completitud: no usar los 15 módulos declarados como denominador sin acordar granularidad y alcance. SUNAT no está implementado; distinguirlo de comprobantes internos.
- Corrección: ocho pruebas históricas aprobadas no significan cobertura completa. La última ejecución disponible reportó fallo en auth.test.js sin causa determinada; no convertir conteos de archivos en porcentaje de calidad.
- Rendimiento: no se dispone de medición formal de latencia ni carga.
- Acceso: /api/bootstrap requiere filtrado por rol; catálogo público requiere exclusión de campos internos. Medir respuestas, no únicamente botones visibles.
- Recuperación: exportar un archivo no demuestra que pueda restaurarse correctamente.

## Sección Para el VD

El formato no define VD. Confirmar su significado antes de completar. Si significa variable dependiente y la variable aprobada es eficiencia de gestión de inventario, puede usarse reducción del tiempo de consulta: (tiempo promedio anterior - tiempo promedio con sistema) / tiempo promedio anterior * 100. Medir tareas comparables con usuarios y datos equivalentes. Es una propuesta condicionada, sin resultado observado.

## Control de versiones

Versión 0.1: propuesta de métricas; revisión y aprobación pendientes. No registrar firmas, aprobaciones ni mediciones inexistentes.
