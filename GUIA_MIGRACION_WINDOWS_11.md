# Guía de Migración a Windows 11 - Sistema Neuro

Esta guía detalla los pasos para realizar una copia de seguridad completa del sistema, formatear el equipo y reinstalar todo en Windows 11 sin perder datos.

> [!IMPORTANT]
> **NO FORMATEE SU EQUIPO** sin antes haber copiado el archivo de respaldo generado en el Paso 1 a una unidad externa (USB) o a la nube (Google Drive, OneDrive).

---

## Paso 1: Crear Respaldo (Antes de Formatear)

Hemos creado una herramienta automática para facilitar este proceso.

1. Busque el archivo `CREAR_RESPALDO.ps1` en la carpeta del proyecto.
2. Haga clic derecho sobre él y seleccione **"Ejecutar con PowerShell"**.
3. Espere a que termine el proceso. Se creará un archivo `.zip` con un nombre como: `RESPALDO_SISTEMA_NEURO_2026-02-05_....zip`.
4. **COPIE ESTE ARCHIVO ZIP A UN USB O DISCO EXTERNO.**

### ¿Qué incluye el respaldo?
- Base de datos (`sistema_neuro.db`) con todos los pacientes e historias.
- Archivos subidos (`/uploads`): fotos, PDFs, resultados de exámenes.
- Configuraciones (`.env`, `ecosystem.config.cjs`).
- Código fuente del sistema.

---

## Paso 2: Instalación Limpia en Windows 11

Una vez que tenga su Windows 11 listo y su archivo ZIP a mano:

### 1. Instalar Herramientas Previas
Descargue e instale los siguientes programas:
- **Node.js (LTS)**: [https://nodejs.org/](https://nodejs.org/) (Durante la instalación, marque todas las casillas por defecto).
- **Git**: [https://git-scm.com/](https://git-scm.com/) (Opcional, pero recomendado).
- **VS Code**: [https://code.visualstudio.com/](https://code.visualstudio.com/) (Para editar código si fuera necesario).

### 2. Restaurar el Sistema
1. Cree una carpeta en el Escritorio llamada `Sistema Neuro`.
2. Copie el archivo ZIP de su respaldo a esta carpeta y **extráigalo** (Click derecho -> Extraer aquí).
3. Asegúrese de que los archivos estén directamente en la carpeta (que vea carpetas como `backend`, `src`, `public`, etc.).

### 3. Instalar Dependencias y Construir
1. Abra la carpeta `Sistema Neuro`.
2. Haga clic en la barra de direcciones de arriba, escriba `cmd` y presione Enter. Se abrirá una ventana negra.
3. Escriba los siguientes comandos uno por uno, esperando a que termine cada uno:

```bash
npm install
```
*(Esto descargará todas las librerías necesarias. Puede tardar unos minutos)*

```bash
npm run build
```
*(Esto preparará la parte visual del sistema. Debería terminar diciendo "Build complete" o similar)*

---

## Paso 3: Iniciar el Sistema

### Opción A: Inicio Manual (Prueba)
En la misma ventana negra, escriba:
```bash
npm start
```
Si todo está bien, verá un mensaje diciendo que el servidor está corriendo en el puerto 5000 (o 3001). Abra `http://localhost:5000` en su navegador (Chrome/Edge) para verificar.

### Opción B: Instalación Definitiva (PM2 - Arranque Automático)
Para que el sistema inicie solo cuando prenda la computadora:

1. En la ventana de comandos (cmd) dentro de la carpeta del sistema ejecute:
   ```bash
   npm install -g pm2
   ```
2. Inicie el sistema con PM2 usando el archivo de configuración incluido:
   ```bash
   pm2 start ecosystem.config.cjs
   ```
3. Guarde la configuración para que persista:
   ```bash
   pm2 save
   ```
4. **IMPORTANTE**: Para que inicie con Windows, necesita generar el script de inicio:
   ```bash
   pm2-startup install
   ```
   *(Siga las instrucciones que aparezcan en pantalla si le pide ejecutar otro comando)*.

---

## Solución de Problemas Comunes

- **Error de "Policy" al ejecutar el script de respaldo**:
  Si PowerShell no le deja ejecutar el script, abra PowerShell como Administrador y ejecute: `Set-ExecutionPolicy RemoteSigned`, luego intente de nuevo.

- **La base de datos está vacía**:
  Asegúrese de que el archivo `backend/sistema_neuro.db` se haya extraído correctamente del ZIP.

- **Error de "Missing modules"**:
  Ejecute `npm install` nuevamente.
