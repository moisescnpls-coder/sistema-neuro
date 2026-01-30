@echo off
TITLE SISTEMA NEURO - INSTALADOR PROFESIONAL (PM2)

echo ===================================================
echo    INSTALACION DE SISTEMA PROFESIONAL (PM2)
echo ===================================================
echo.
echo Este proceso preparara el sistema para funcionar
echo como un servicio de Windows robusto.
echo.

echo [1/4] Instalando Dependencias Backend...
cd backend
call npm install
cd ..

echo.
echo [2/4] Instalando Dependencias Frontend...
call npm install

echo.
echo [3/4] Construyendo Version de Produccion...
call npm run build

echo.
echo [4/4] Instalando Gestor de Procesos (PM2)...
call npm install -g pm2 pm2-windows-startup

echo.
echo ===================================================
echo    INSTALACION COMPLETADA
echo ===================================================
echo.
echo Para iniciar el servicio, ejecute: INICIAR_SERVICIO_PM2.bat
echo.
pause
