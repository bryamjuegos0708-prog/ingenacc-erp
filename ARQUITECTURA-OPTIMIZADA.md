# Arquitectura optimizada de INGENACC ERP

## Decisión técnica

INGENACC continúa con **React 19 + TypeScript + Vite** en el cliente y **Express + SQLite** en el servidor. Las imágenes de referencia comparan Angular, React, Vue, Svelte, Next.js y Astro; no son módulos compatibles entre sí. Integrar varios frameworks dentro del ERP duplicaría rutas, formularios, autenticación y mantenimiento. React ya cubre el objetivo de una aplicación interactiva por componentes y permite conservar los flujos que funcionan.

La estructura aplicada sigue la misma idea sólida que se destaca para Angular: componentes reutilizables, servicios, rutas y formularios, pero usando el ecosistema actual del proyecto.

## Organización aplicada

- `client/src/pages`: vistas públicas, acceso y ERP.
- `client/src/components`: piezas reutilizables, modales, navegación, Inacc, control de errores y conectividad.
- `client/src/data`: navegación y configuración visual.
- `client/src/api.ts`: servicio único para comunicación autenticada, descargas y tiempos máximos.
- `server/src`: API, reglas de negocio, permisos, persistencia, IA y pruebas.
- `server/src/db`: esquema SQLite, migraciones e integridad.

## Mejoras de esta versión

1. **Carga diferida:** las páginas se cargan por ruta y Three.js solo se descarga cuando el usuario se aproxima a la sección 3D.
2. **Paquetes separados:** React, iconos y el motor 3D generan archivos independientes que el navegador puede almacenar en caché.
3. **Peticiones controladas:** las operaciones normales tienen un máximo de 15 segundos y los respaldos 60 segundos; se informa un error entendible si el servidor no responde.
4. **Recuperación:** un error de renderizado muestra una pantalla segura para recargar sin afirmar que se perdieron datos.
5. **Conectividad:** aparece un aviso cuando la PC pierde la red para evitar que el trabajador intente guardar operaciones sin conexión.
6. **Accesibilidad y rendimiento:** la animación 3D respeta la preferencia de movimiento reducido y usa menor densidad de píxeles.
7. **Trazabilidad técnica:** Configuración muestra la arquitectura que sostiene el ERP y su separación por capas.

## Uso real

Esta versión es apropiada para la demostración y para validación en la red local. Antes de sustituir el sistema vigente de la empresa todavía se deben completar y certificar la facturación electrónica SUNAT, el proveedor real de comprobantes, las impresoras y lectores específicos, la migración de datos reales, los respaldos automáticos externos y una prueba de aceptación con usuarios de caja, ventas, almacén y gerencia.

No se debe reemplazar una instalación operativa ni sobrescribir su base sin respaldo y validación. La base incluida en el ZIP contiene datos ficticios de demostración.
