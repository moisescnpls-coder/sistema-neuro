@echo off
TITLE SISTEMA NEURO - INICIAR SERVICIO

echo ===================================================
echo    INICIANDO SERVICIO PM2
echo ===================================================
echo.

echo [1/3] Limpiando procesos anteriores...
call pm2 delete all

echo.
echo [2/3] Iniciando Sistema Neuro...
:: Start the app with name "neuro-system", running the unified server
call pm2 start ecosystem.config.cjs

echo.
echo [3/3] Guardando configuracion para reinicio...
call pm2 save

echo.
echo ===================================================
echo    SISTEMA EN LINEA
echo ===================================================
echo.
echo El sistema esta corriendo en segundo plano.
echo Puede cerrar esta ventana.
echo.
echo Comandos Utiles (En terminal):
echo - Ver estado:    pm2 status
echo - Ver logs:      pm2 logs
echo - Reiniciar:     pm2 restart neuro-system
echo - Detener:       pm2 stop neuro-system
echo.
pause
