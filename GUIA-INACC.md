# Inacc · consultor de INGENACC

## Abrir el programa

1. Extrae TODO el ZIP a una carpeta nueva. Conserva una copia de tu instalación y base de datos anterior; no sobrescribas una base con ventas reales con la base de demostración incluida.
2. Instala Node.js 24 o superior si todavía no lo tienes.
3. Ejecuta `INICIAR-DEMO-COMPLETA-WINDOWS.bat` para presentar el programa. En la red local usa `INICIAR-RED-DEMO-WINDOWS.bat` solamente en la PC principal.
4. Abre la dirección que indica la consola y pulsa el robot **Inacc**, abajo a la derecha. También aparece dentro del ERP.

Alternativa desde terminal: `npm ci`, `npm run build`, `npm start`. El servidor usa el puerto 4000 por defecto. Para la base de demostración completa, usa `npm run demo`.

## Qué funciona sin clave

- Robot SVG integrado, chat adaptable a móvil y escritorio.
- Botones frecuentes para productos, selección de equipos, cotizaciones de varios productos, adelantos, garantías y mantenimiento.
- Ayuda adicional según el rol del trabajador: clientes, compras, inventario, permisos y respaldos.
- Consulta local por modelo de los productos activos con precio público. Los precios de demostración se identifican como ficticios.
- Referencias de modelos del catálogo transcrito de prospectos existente en `server/src/catalog.js`. Una referencia no acredita existencias, precios ni especificaciones técnicas.
- Respuestas locales basadas en reglas y coincidencias de texto. Si no encuentra información, lo indica. No son un modelo generativo entrenado ni interpretan todas las formas posibles de una pregunta.

La base editable está en `server/src/inacc-knowledge.json`. Contiene título, palabras clave, respuesta y restricciones por rol. Revísala con la empresa antes de usarla operativamente. Reinicia el servidor tras editarla. Para incorporar prospectos nuevos, se necesitan fichas verificadas; no se han inventado potencias, repuestos compatibles ni condiciones de cobertura.

## Activar la IA externa

Configura en el archivo `.env` de la raíz (copia `.env.example` solo si aún no existe):

```dotenv
OPENAI_API_KEY=tu_clave_privada
OPENAI_MODEL=gpt-5.4-mini
INACC_ALLOW_PUBLIC_AI=false
INACC_WEB_SEARCH=true
```

Reinicia el servidor. Con una clave válida, los trabajadores autenticados podrán seleccionar **IA externa**. Para permitirla también a clientes sin iniciar sesión, cambia `INACC_ALLOW_PUBLIC_AI=true`. Requiere Internet en el servidor, acceso al modelo y saldo/cuota en el proveedor. Configura límites de gasto en tu cuenta antes de habilitar acceso público. Nunca copies la clave en el chat, en el código del navegador, en variables `VITE_*` ni en GitHub.

Cada usuario debe marcar la autorización antes de enviar su pregunta y los últimos seis mensajes a OpenAI. Las consultas externas pueden responder temas generales y utilizar búsqueda web cuando el modelo la considere necesaria. Las fuentes devueltas por el proveedor aparecen como enlaces en la respuesta. La búsqueda se puede desactivar con `INACC_WEB_SEARCH=false`.

Si falta la clave, falla la conexión o el proveedor devuelve un error, el programa informa del problema; las respuestas locales siguen disponibles. La integración externa se probó con respuestas simuladas del proveedor: no se realizó una consulta real facturada, porque no se proporcionó una clave.

## Privacidad y funcionamiento

El chat vive en memoria del navegador: Limpiar, recargar o cambiar de sesión descarta sus mensajes. No se guarda en SQLite ni en el historial del cliente. Cerrar la ventana del chat conserva la conversación durante esa visita. El proveedor externo recibe el texto autorizado, el catálogo público y la ayuda permitida. No se le adjuntan tablas de clientes, contraseñas, costos, ventas, pagos ni cantidades internas de stock. Lo que el usuario escriba manualmente sí forma parte de su consulta; no debe incluir información sensible.

Las solicitudes externas usan `store:false`, lo cual no equivale a una garantía de retención cero por parte del proveedor. El asistente no puede crear ventas, modificar precios, cobrar ni registrar movimientos. Los permisos se comprueban en el servidor con la sesión existente.

Límites por proceso: 40 consultas por IP cada 15 minutos, de ellas 10 externas; máximo 2 externas simultáneas y 100 por hora en total. En una instalación con proxy o múltiples servidores se necesita configurar identidad de IP y un limitador compartido. La instalación actual está orientada a una PC servidor en la red local.

## Comprobaciones

`npm test` comprueba los flujos existentes y las pruebas nuevas de Inacc: permisos, validación, consentimiento, datos públicos, errores y citas del proveedor. `npm run build` genera la versión para usar. No se modificaron los archivos de diseño reservados a Claude.

Documentación del proveedor consultada para la integración:
- https://developers.openai.com/api/docs/models/gpt-5.4-mini
- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.openai.com/api/reference/resources/responses/methods/create

Validación de esta entrega: 26 pruebas de servidor aprobadas y compilación exitosa. Chat comprobado en navegador de escritorio y móvil: botones frecuentes, envío escrito, aviso de IA externa sin configurar y cierre con Escape. La escena 3D existente genera un aviso de tamaño de archivo en Vite, sin impedir la compilación.
