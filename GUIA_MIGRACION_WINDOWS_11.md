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

### 2. Copiar Archivos del Sistema (Desde su PC)
1. Conecte el USB donde guardó el archivo ZIP.
2. Copie el archivo ZIP al Escritorio de la nueva máquina.
3. Haga clic derecho sobre el ZIP y seleccione **"Extraer todo..."**.
4. Nombre la carpeta extraída como `Sistema Neuro`.
5. Abra la carpeta y asegúrese de ver los archivos internos (`backend`, `src`, etc.).

### 3. Instalar Dependencias y Construir
1. Abra la carpeta `Sistema Neuro`.
2. Busque el archivo **`INSTALAR_PM2.bat`**.
3. Haga clic derecho y seleccione "Ejecutar como Administrador".
4. Espere a que termine (instalará todo y creará la versión final del sistema).

---

## Paso 3: Iniciar el Sistema

### Opción A: Inicio Manual (Prueba)
Ejecute el archivo **`INICIAR_SISTEMA.bat`**.
Esto abrirá una ventana negra y el navegador. Si funciona, ciérrelo y pase a la Opción B.

### Opción B: Instalación Definitiva (Arranque Automático)
Para que el sistema inicie solo con Windows:

1. Ejecute el archivo **`INICIAR_SERVICIO_PM2.bat`**.
2. Al finalizar, abra una ventana de comandos (cmd) en la carpeta y escriba:
   ```bash
   pm2-startup install
   ```
   *(Esto asegura que el sistema reviva si se apaga la PC)*.

---

## Solución de Problemas Comunes

- **Error de "Policy" al ejecutar el script de respaldo**:
  Si PowerShell no le deja ejecutar el script, abra PowerShell como Administrador y ejecute: `Set-ExecutionPolicy RemoteSigned`, luego intente de nuevo.

- **La base de datos está vacía**:
  Asegúrese de que el archivo `backend/sistema_neuro.db` se haya extraído correctamente del ZIP.

- **Error de "Missing modules"**:
  Ejecute `npm install` nuevamente.
