# Activar Inacc
La ayuda local funciona sin Internet ni clave.
Para consultas generales, configura en .env del servidor OPENAI_API_KEY con tu clave privada y OPENAI_MODEL con un modelo habilitado en tu cuenta y compatible con Responses API.
INACC_WEB_SEARCH=true habilita la herramienta de búsqueda si el modelo y la cuenta la admiten; usa false para deshabilitarla.
Reinicia el servidor y selecciona IA general en el robot. Autoriza el envío de la consulta y los últimos mensajes.
La conexión usa la API de OpenAI y requiere facturación/cuota API propia; una suscripción de ChatGPT no configura esa clave.
No compartas la clave ni la subas a GitHub. La IA no modifica registros y no recibe automáticamente clientes, costos o stock privado.
La respuesta externa aún debe probarse con una clave real. Las pruebas incluidas simulan al proveedor.
Para actualizar: detén el servidor, respalda server/data y .env, reemplaza solo archivos del programa y ejecuta el iniciador. No borres datos ni configuración.
