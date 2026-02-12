# Guía de Actualización por Nube (Sistema Existente)

Esta guía explica cómo **migrar tu sistema actual** (versión USB/Local) a la versión automática por nube (GitHub) y cómo mantenerlo actualizado.

> [!NOTE] 
> Se asume que la computadora ya tiene **Node.js** y **PM2** funcionando correctamente.

---

## 1. Preparación Inicial (Solo UNA vez)

Como vamos a conectar el sistema a la nube, necesitamos hacer un cambio de carpetas por única vez.

### Paso A: Detener el sistema actual
1.  Abre una terminal (PowerShell o CMD).
2.  Ejecuta: `pm2 stop all`

### Paso B: Resguardar datos actuales
1.  Ve a la carpeta del sistema (ej: `Escritorio\Sistema Neuro`).
2.  Cámbiale el nombre a `Sistema Neuro_RESPALDO`.
    *   *Esto es tu copia de seguridad por si algo sale mal.*

### Paso C: Descargar la nueva versión conectada
1.  En esa misma ubicación, haz lo siguiente para abrir una terminal:
    *   Haz clic en la **barra de direcciones** de la carpeta (arriba).
    *   Escribe `cmd` y presiona **Enter**.
    *   *(O si tienes Windows 11: Shift + Clic Derecho > "Abrir en Terminal")*

    > **¿No tienes Git instalado?**  
    > Si al escribir `git` te sale error, instálalo rápido pegando esto:  
    > `winget install --id Git.Git -e --source winget`

2.  En la ventana negra que se abre, escribe el comando:
    ```bash
    git clone https://github.com/moisescnpls-coder/sistema-neuro.git "Sistema Neuro"
    ```
    *(Esto creará una carpeta nueva con el mismo nombre que la anterior).*

### Paso D: Restaurar tus datos
Entra a la carpeta de respaldo (`Sistema Neuro_RESPALDO`) y **copia** estos archivos a la nueva carpeta (`Sistema Neuro`):
1.  La carpeta `uploads` (donde están las fotos).
2.  El archivo de base de datos `.sqlite` (si usas SQLite) que suele estar en `backend/database`.
3.  El archivo `.env` (si tienes configuraciones secretas).

### Paso E: Reactivar el sistema
1.  Entra a la nueva carpeta `Sistema Neuro`.
2.  Abre una terminal ahí y ejecuta:
    ```bash
    npm install
    npm run build
    pm2 restart all
    ```
*(Si PM2 no arranca, usa: `pm2 start backend/index.js --name "sistema-neuro"` y luego `pm2 save`)*

---

## 2. Cómo Actualizar en el Día a Día

De ahora en adelante, cada vez que yo te avise de una "Nueva Actualización", solo debes:

1.  Entrar a la carpeta `Sistema Neuro`.
2.  Darle doble clic al archivo **`ACTUALIZAR.bat`**.

¡Y listo! El sistema bajará los cambios, se reconstruirá y se reiniciará solo en menos de 1 minuto.
