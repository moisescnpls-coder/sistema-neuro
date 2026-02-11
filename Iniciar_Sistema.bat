@echo off
TITLE Sistema Neuro Launcher

echo ===================================================
echo    SISTEMA NEURO - INICIANDO SERVICIOS
echo ===================================================

echo.
echo [1/2] Verificando puertos...
:: Kill process on port 5000 if running
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo.
echo [2/2] Iniciando Servidor Unificado (Puerto 5000)...
:: Runs "node backend/index.js" defined in package.json start script
start "Sistema Neuro Server" cmd /k "npm start"

echo.
echo ===================================================
echo    SISTEMA OPERATIVO
echo ===================================================
echo.
echo No cierre la ventana negra del servidor.
echo.
echo Para abrir el sistema vaya a: http://localhost:5000
echo.
pause
