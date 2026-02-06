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

## 🚀 PASO 2: Instalación (En la computadora de la Dra.)

1. **Detener el sistema (PM2)**:
   Abre una terminal (PowerShell o CMD) en la carpeta del sistema y ejecuta:
   ```powershell
   pm2 stop all
   ```

2. **Reemplazar archivos (¡CON CUIDADO!)**:
   - ✅ **Carpeta `dist`**: Pégala reemplazando la anterior.
   - ✅ **Carpeta `backend`**: Pega los archivos `.js` nuevos.
   - ⚠️ **NO COPIES** tu carpeta `uploads`: Podrías borrar las fotos o exámenes que la Dra. ya tiene guardados.
   - ⛔ **NO COPIES** el archivo `sistema_neuro.db`: **PELIGRO CRÍTICO**. Si copias tu base de datos, borrarás todos los pacientes reales de la Dra.
   - ⛔ **NO COPIES** el archivo `.env` (si existe): Podrías desconfigurar algo.

   *Resumen: Solo actualiza el código (`.js` y `dist`), no los datos.*

3. **Actualizar dependencias**:
   En la terminal, ejecuta:
   ```powershell
   npm install
   ```

---

## 🔄 PASO 3: Reiniciar y Verificar

1. **Iniciar con PM2**:
   ```powershell
   pm2 restart all
   # O si necesitas levantar el proceso de cero:
   # pm2 start backend/index.js --name "neuro-sys"
   # pm2 save
   ```

2. **Limpiar Caché del Navegador**:
   Abre el sistema y presiona `Ctrl + F5`.

3. **Verificación Visual**:
   - Busca el nuevo menú "Historia" en el Dashboard.
   - Verifica que el menú "Clínico" haya desaparecido (si entras con un usuario no-admin).
   - Prueba generar un Backup y revisa que tenga extensión `.db`.

---

## ⏪ CÓMO HACER UN ROLLBACK (Volver atrás)
Si por alguna razón la nueva versión no funciona:
1. Detén PM2: `pm2 stop all`.
2. Borra la carpeta `dist` y la carpeta `backend` actuales (mantén siempre el archivo `.db`).
3. Restaura la carpeta `backend` que guardaste en el **PASO 0**.
4. Reinicia PM2: `pm2 start backend/index.js`.
5. El sistema volverá a ser la v1.0.0 instantáneamente.
