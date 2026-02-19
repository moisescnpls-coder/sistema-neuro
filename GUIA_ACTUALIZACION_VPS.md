# Guía de Actualización Rápida en VPS Linux (Ambiente de Pruebas)

Sigue estos pasos para actualizar el código en el VPS (Linux/Ubuntu) sin afectar la disponibilidad por mucho tiempo.

> **Nota:** Como es un ambiente de pruebas, saltaremos los pasos de respaldo de base de datos.
> **Sistema Operativo:** VPS Linux (Ubuntu/Debian)

## 1. En tu Computadora Local (Windows)

Primero, asegúrate de subir todos tus cambios a GitHub.

1.  Abre la terminal en tu proyecto (PowerShell/CMD).
2.  Ejecuta:
    ```powershell
    git add .
    git commit -m "Descripción de los cambios"
    git push
    ```

## 2. En el VPS (Servidor Linux)

Este es el comando único que limpia cambios locales, descarga la última versión, instala dependencias, reconstruye el frontend y reinicia el servidor.

**Copia y pega esto en la terminal del VPS:**

```bash
cd ~/apps/neuro && git pull && npm install && npm run build && pm2 restart neuro-backend
```

---

### Explicación de cada paso (para referencia)

1.  `cd ~/apps/neuro`: Entra a la carpeta.
2.  `git reset --hard`: Descarta cambios locales (evita conflictos en test).
3.  `git pull`: Descarga el código nuevo.
4.  `npm install`: Actualiza librerías.
5.  `npm run build`: Crea la nueva versión visual (React).
6.  `pm2 restart neuro-backend`: Reinicia el servidor API.
