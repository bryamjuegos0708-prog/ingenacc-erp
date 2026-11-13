@echo off
setlocal
title INGENACC ERP - Preparacion operativa
cd /d "%~dp0"
if not exist package.json (
 echo Extrae todo el ZIP antes de ejecutar este archivo.
 pause
 exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
 echo Instala Node.js 24 o superior desde https://nodejs.org/
 start "" "https://nodejs.org/"
 pause
 exit /b 1
)
for /f %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 24 (
 echo Se requiere Node.js 24 o superior. Version actual:
 node --version
 pause
 exit /b 1
)
echo Comprobando configuracion privada...
node scripts\prepare-config.cjs
if errorlevel 1 (
 pause
 exit /b 1
)
rem Evitar que una variable heredada invalida sustituya la configuracion privada.
set JWT_SECRET=
set SETUP_TOKEN=
if not exist node_modules (
 echo Instalando dependencias...
 call npm.cmd ci
 if errorlevel 1 exit /b 1
)
echo Construyendo la aplicacion...
call npm.cmd run build
if errorlevel 1 (
 pause
 exit /b 1
)
echo Iniciando servidor operativo...
start "INGENACC ERP SERVIDOR" cmd /k "npm.cmd start"
timeout /t 4 /nobreak >nul
start "" "http://localhost:4000"
echo.
echo INGENACC esta activo. Otras PC de la red usan http://IP-DE-ESTA-PC:4000
echo Conserva la ventana INGENACC ERP SERVIDOR abierta.
pause
