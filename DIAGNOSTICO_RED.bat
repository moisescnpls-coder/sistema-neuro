@echo off
TITLE DIAGNOSTICO DE RED - SISTEMA NEURO
SETLOCAL EnableDelayedExpansion

echo ===================================================
echo    DIAGNOSTICO DE RED PARA DESPLIEGUE
echo ===================================================
echo.

echo [1] Buscando direccion IP local de esta computadora...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    set IP=!IP:^ =!
    echo     Direccion encontrada: !IP!
)
echo.

echo [2] Verificando si el puerto 5000 esta ocupado...
netstat -ano | findstr :5000 > nul
if %errorlevel% equ 0 (
    echo     OK: El puerto 5000 esta en uso (El sistema probablemente esta corriendo).
) else (
    echo     AVISO: El puerto 5000 esta libre. Asegurese de iniciar el sistema.
)
echo.

echo [3] Instrucciones para otros equipos (Recepcion):
echo     Para entrar desde otra computadora, use esta direccion:
echo     http://!IP!:5000
echo.
echo ===================================================
echo    REVISIONES ADICIONALES
echo ===================================================
echo 1. Asegurese que ambas PCs esten en la misma red WiFi.
echo 2. Desactive temporalmente el Firewall si no logra conectar.
echo 3. Verifique que la red este configurada como "Privada" y no "Publica".
echo.
pause
