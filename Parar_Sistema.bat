@echo off
echo Parando Sistema Neuro...

:: Matar processos do Node.js
taskkill /F /IM node.exe /T

echo.
echo Todos os servicos foram interrompidos.
pause
