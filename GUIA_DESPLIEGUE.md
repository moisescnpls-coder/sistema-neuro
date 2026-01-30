# Guía de Despliegue - Sistema Neuro

Esta guía detalla los pasos para instalar y poner en marcha el sistema en la computadora principal ("Servidor" / Computadora de la Dra.).

## 1. Requisitos Previos
1. **Node.js (LTS)**: Instalar desde [nodejs.org](https://nodejs.org/).
2. **Red Local**: Ambas PCs deben estar en el mismo WiFi/Red.

## 2. Instalación y Puesta en Marcha (Método Profesional)

Siga estos pasos en orden. **No necesita abrir terminales**, todo se hace con doble clic.

### Paso 1: Instalación (SOLO UNA VEZ)
1. Haga doble clic en **`INSTALAR_PM2.bat`**.
2. Espere a que termine (instala Node modules y construye el sistema).

### Paso 2: Iniciar el Servicio
1. Haga doble clic en **`INICIAR_SERVICIO_PM2.bat`**.
2. Esto encenderá el sistema en segundo plano.

### Paso 3: Configurar Inicio Automático (Opcional pero Recomendado)
1. Clic derecho en botón Inicio -> **Terminal (Admin)** o **PowerShell (Admin)**.
2. Escriba: `Set-ExecutionPolicy RemoteSigned` y acepte.
3. Escriba: `pm2-startup install`
4. Escriba: `pm2 save`

## 3. Acceso desde Recepción (Problemas de Conexión)
Si Recepción no puede entrar:
1. Haga doble clic en **`DIAGNOSTICO_RED.bat`**.
2. El programa le dirá la **ID exacta** (ej: http://192.168.1.15:5000) que debe poner en la otra PC.
3. Si aún no conecta, verifique que el Firewall de Windows permita el puerto 5000.

## 4. Cómo Actualizar el Sistema (Pasar cambios nuevos)
Cuando reciba una carpeta nueva con actualizaciones:
1. Copie TODOS los archivos nuevos sobre la carpeta vieja. **REEMPLACE TODO**.
   > [!IMPORTANT]
   > El sistema está diseñado para proteger sus datos automáticamente. Los pacientes y fotos están en `backend/sistema_neuro.db` y `backend/uploads`. **NO borre esas carpetas específicas**.
2. Vuelva a ejecutar **`INSTALAR_PM2.bat`**.
3. Ejecute **`INICIAR_SERVICIO_PM2.bat`** para aplicar los cambios.

## 5. Comandos Utiles (En terminal para técnicos)
- `pm2 status`: Ver si el sistema está "online".
- `pm2 logs`: Ver si hay errores.
- `pm2 restart sistema-neuro`: Reiniciar el programa.
