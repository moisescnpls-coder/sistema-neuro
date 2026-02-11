@echo off
echo ==========================================
echo      ACTUALIZANDO SISTEMA NEURO
echo ==========================================

echo [1/4] Obteniendo ultimos cambios...
git pull
if %errorlevel% neq 0 (
    echo Error al descargar cambios. Verifica tu conexion.
    pause
    exit /b
)

echo [2/4] Instalando paquetes nuevos (si los hay)...
call npm install
if %errorlevel% neq 0 (
    echo Error al instalar paquetes.
    pause
    exit /b
)

echo [3/4] Construyendo nueva version...
call npm run build
if %errorlevel% neq 0 (
    echo Error al construir la aplicacion.
    pause
    exit /b
)

echo [4/4] Reiniciando servicios...
call pm2 restart all
if %errorlevel% neq 0 (
    echo PM2 no encontrado o error al reiniciar. 
    echo Si no usas PM2, cierra y abre la ventana del servidor.
)

echo.
echo ==========================================
echo      ACTUALIZACION COMPLETADA!
echo ==========================================
timeout /t 5
