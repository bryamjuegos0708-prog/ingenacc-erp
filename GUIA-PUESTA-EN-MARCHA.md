# INGENACC ERP — puesta en marcha operativa

## Uso en la red de la empresa

1. Extrae el ZIP en la PC que funcionará como servidor.
2. Haz una copia de cualquier base anterior antes de continuar.
3. Ejecuta `INICIAR-SISTEMA-WINDOWS.bat`.
4. En la primera ejecución abre `ACCESO-INICIAL.txt`, copia el código y completa la configuración de gerencia en el navegador.
5. Crea los demás usuarios desde **Usuarios y roles**.
6. Las otras PC ingresan a `http://IP-DE-LA-PC-PRINCIPAL:4000`.
7. Permite Node.js solo en redes privadas de Windows. No abras el puerto 4000 directamente en el router.

La instalación nueva crea `server/data/ingenacc.db` sin productos, clientes, proveedores, ventas ni usuarios de demostración. Las ubicaciones y marcas confirmadas se conservan como estructura inicial. El SKU y código de barras pueden dejarse vacíos al registrar un producto: el sistema los genera. Los datos técnicos adicionales están agrupados en una sección opcional.

## Publicación en Internet

Se incluye `Dockerfile` y `docker-compose.yml`. Para publicar se necesita un VPS o servicio que mantenga un volumen persistente, un dominio, HTTPS y copias externas. Copia `.env.production.example` como `.env`, genera secretos privados y ejecuta `docker compose up -d --build`.

No uses GitHub Pages, Netlify o un hosting estático para esta aplicación: el ERP requiere API, sesiones y una base persistente. En un servidor real debe colocarse Caddy, Nginx o el proxy del proveedor delante del puerto 4000 para HTTPS. Completa la primera configuración inmediatamente y después conserva `SETUP_TOKEN` en privado.

## Antes de reemplazar el sistema actual

- Importar y conciliar productos, existencias, clientes y proveedores reales.
- Realizar conteo físico por las cinco ubicaciones.
- Configurar y certificar el proveedor de facturación electrónica SUNAT.
- Probar impresoras, lectores y etiquetas usados por la empresa.
- Ejecutar aceptación con gerencia, caja, ventas y almacén.
- Configurar respaldos automáticos fuera del mismo servidor y comprobar restauraciones.

## Respaldo automático en una carpeta de red

1. En otra PC o NAS crea una carpeta, por ejemplo `RespaldoINGENACC`, y compártela únicamente con la cuenta que ejecuta el servidor.
2. En `.env` establece la ruta UNC: `BACKUP_DIR=\\NOMBRE-PC\\RespaldoINGENACC`.
3. Mantén `AUTOMATIC_BACKUPS_ENABLED=true` y define `BACKUP_RETENTION=30`.
4. Reinicia INGENACC. En **Configuración → Respaldo automático** pulsa **Crear y verificar ahora**.
5. Confirma que aparezcan fecha, archivo y verificación, y comprueba físicamente que el `.db` exista en la carpeta remota.

La cuenta de Windows que ejecuta Node debe tener permiso de escritura sobre la carpeta. No uses una unidad de red asignada solo a otro usuario; una ruta UNC funciona de forma más predecible como servicio.

El asistente Inacc continúa funcionando con su base local. La consulta externa requiere `OPENAI_API_KEY` en el servidor.
