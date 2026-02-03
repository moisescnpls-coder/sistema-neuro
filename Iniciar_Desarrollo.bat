@echo off
TITLE Sistema Neuro - MODO DESARROLLO

echo ===================================================
echo    SISTEMA NEURO - MODO DESARROLLO
echo ===================================================
echo.
echo [1/3] Limpiando puertos...
:: Kill process on port 5000 (Backend)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1
:: Kill process on port 3000 (Frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo.
echo [2/3] Iniciando Backend (API)...
start "Neuro Backend" cmd /k "npm start"

echo.
echo [3/3] Iniciando Frontend (Vite)...
start "Neuro Frontend" cmd /k "npm run dev"

echo.
echo ===================================================
echo    SISTEMA INICIADO
echo ===================================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Puede cerrar esta ventana, pero NO cierre las otras dos.
pause
