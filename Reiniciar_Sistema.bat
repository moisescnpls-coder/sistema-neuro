@echo off
echo Reiniciando Sistema Neuro...

call Parar_Sistema.bat
timeout /t 2 /nobreak >nul
call Iniciar_Sistema.bat

echo.
echo Reinicio completo.
pause
