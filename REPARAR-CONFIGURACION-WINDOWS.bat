@echo off
setlocal
cd /d "%~dp0"
node scripts\prepare-config.cjs
if errorlevel 1 (
 pause
 exit /b 1
)
echo Cierra el servidor anterior y ejecuta INICIAR-SISTEMA-WINDOWS.bat
pause
