# Guía de Actualización: Sistema Neuro v1.1.0 (The Strategic Update)

Esta guía detalla los pasos para actualizar el sistema desde la versión inicial (v1.0.0) a la nueva versión optimizada (v1.1.0).

---

## 🛡️ PASO 0: ¡IMPORTANTE - COPIA DE SEGURIDAD!
Antes de hacer cualquier cambio en la computadora de la Dra., realiza una copia de seguridad:
1. En el escritorio de la Dra., busca la carpeta `Sistema Neuro`.
2. Haz una copia de toda la carpeta `backend` en una ubicación segura (ej. una subcarpeta llamada `BACKUP_V1.0.0`).
**Esto es tu seguro de vida:** Si algo falla, solo tienes que volver a poner esa carpeta y el sistema regresará al estado anterior con todos los datos intactos.

---

## 📂 PASO 1: Preparación del Pack (En tu computadora)
En tu memoria USB, debes tener los siguientes archivos extraídos de tu carpeta de desarrollo:

1. **Carpeta `dist`**: Copia la carpeta `dist` completa (asegúrate de haber ejecutado `npm run build` antes).
2. **Carpeta `backend`**:
   - ✅ Copia todos los archivos `.js` y la subcarpeta `uploads` (si está vacía o quieres llevar plantillas).
   - ⚠️ **BORRA** de la USB el archivo `sistema_neuro.db`. Nunca debes llevar tu base de datos de prueba a la computadora real.
3. **Archivos de configuración**:
   - `package.json`
   - `package-lock.json`

---

## 🚀 PASO 2: Instalación (En la computadora de la Dra.)

1. **Detener el sistema**:
   Abre una terminal en la carpeta del sistema de la Dra. y ejecuta:
   ```powershell
   pm2 stop all
   ```

2. **Reemplazar archivos**:
   - Pega tu carpeta `dist` de la USB en la carpeta de la Dra. (reemplaza la anterior).
   - Pega tu carpeta `backend` de la USB. **Ojo**: Si te pregunta si quieres reemplazar archivos existentes, dile que sí, pero **asegúrate de que NO estás borrando el archivo `.db` de ella**.

3. **Actualizar dependencias**:
   En la terminal, ejecuta:
   ```powershell
   npm install
   ```

---

## 🔄 PASO 3: Reiniciar y Verificar

1. **Iniciar PM2**:
   ```powershell
   pm2 restart all
   # O si es la primera vez que se configura:
   pm2 start backend/index.js --name "neuro-sys"
   pm2 save
   ```

2. **Limpiar Caché del Navegador**:
   Abre el sistema y presiona `Ctrl + F5`.

3. **Verificación Visual**:
   - Busca el texto "**Versión 1.1.0**" en la pantalla de Login y en la barra lateral.
   - Entra a los nuevos **Reportes** para confirmar que funcionan.

---

## ⏪ CÓMO HACER UN ROLLBACK (Volver atrás)
Si por alguna razón la nueva versión no funciona:
1. Detén PM2: `pm2 stop all`.
2. Borra la carpeta `dist` y la carpeta `backend` actuales (mantén siempre el archivo `.db`).
3. Restaura la carpeta `backend` que guardaste en el **PASO 0**.
4. Reinicia PM2: `pm2 start backend/index.js`.
5. El sistema volverá a ser la v1.0.0 instantáneamente.
