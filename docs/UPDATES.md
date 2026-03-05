# Guía de Actualización - Sistema Neuro

Esta guía describe cómo mantener el sistema actualizado con las últimas mejoras tanto en la computadora local de la doctora como en el servidor VPS.

---

## 💻 1. Actualización Local (Windows)

El proceso se ha automatizado mediante un script simple. No es necesario escribir comandos.

### Pasos:
1.  **Cerrar la aplicación:** Si la ventana negra del servidor está abierta, ciérrala.
2.  **Buscar el archivo:** Ve al escritorio o a la carpeta `Sistema Neuro`.
3.  **Ejecutar:** Haz doble clic en el archivo llamado **`ACTUALIZAR.bat`**.
4.  **Esperar:** Se abrirá una ventana negra que descargará los cambios e instalará mejoras.
5.  **Listo:** Cuando diga "ACTUALIZACION COMPLETADA", el sistema se reiniciará automáticamente.

### ¿Qué hace el script?
- `git pull`: Descarga el código nuevo.
- `npm install`: Actualiza librerías.
- `npm run build`: Reconstruye la interfaz visual.
- `pm2 restart all`: Reinicia el servicio.

---

## ☁️ 2. Actualización VPS (Nube)

Para actualizar el servidor en la nube (`app.moiseslab.shop`), se requiere acceso a la terminal (SSH).

### Comando Único (Recomendado)
Copia y pega esta línea en la terminal del servidor:

```bash
cd ~/apps/neuro && git pull && npm install && npm run build && pm2 restart neuro-backend
```

### Pasos Manuales (Si el comando anterior falla)
1.  **Entrar a la carpeta:**
    ```bash
    cd ~/apps/neuro
    ```
2.  **Descartar cambios locales (Opcional, si hay conflicto):**
    ```bash
    git reset --hard
    ```
3.  **Descargar código:**
    ```bash
    git pull
    ```
4.  **Actualizar dependencias:**
    ```bash
    npm install
    ```
5.  **Construir frontend:**
    ```bash
    npm run build
    ```
6.  **Reiniciar servicio:**
    ```bash
    pm2 restart neuro-backend
    ```

---

## ❓ Solución de Problemas Comunes

### Error: "Please commit your changes or stash them before you merge"
Significa que modificaste archivos localmente que ahora entran en conflicto con la actualización.
**Solución:** Ejecuta `git reset --hard` (¡Cuidado! Esto borra tus cambios locales no guardados) y luego intenta actualizar de nuevo.

### Error: "EACCES: permission denied"
Significa que no tienes permisos de administrador para instalar algo.
**Solución:** Intenta usar `sudo` antes del comando, o corrige los permisos de la carpeta con `sudo chown -R $USER:$USER ~/apps/neuro`.
