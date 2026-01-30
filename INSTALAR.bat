@echo off
TITLE SISTEMA NEURO - INSTALADOR

echo ===================================================
echo    INSTALACION DE DEPENDENCIAS
echo ===================================================
echo.
echo Este proceso puede tardar unos minutos.
echo Por favor espere...
echo.

echo [1/2] Instalando Backend (Servidor/Base de Datos)...
cd backend
call npm install
cd ..

echo.
echo [2/3] Instalando Frontend (Interfaz)...
call npm install

echo.
echo [3/3] Construyendo Version de Produccion...
call npm run build

echo.
echo ===================================================
echo    INSTALACION COMPLETADA
echo ===================================================
echo.
echo Ahora puede usar el archivo "INICIAR_SISTEMA.bat" para abrir el programa.
pause
