# Solución: Estilos "Rotos" o Faltantes en VPS

**Diagnóstico**: 
El problema principal es que faltan los archivos de configuración de **Tailwind CSS** y **PostCSS** en el servidor. 
Sin estos archivos, cuando ejecutas `npm run build`, Vite no sabe cómo generar los estilos (colores, márgenes, columnas, tablas, etc.), resultando en páginas en blanco o desordenadas.

## 1. Archivos que FALTARON copiar
Debes copiar estos 3 archivos desde tu carpeta local (Desktop) a la carpeta del servidor (`/home/moises/apps/neuro`):

1. `tailwind.config.js` (Define los estilos, colores y dónde buscar clases)
2. `postcss.config.js` (Procesa el CSS para que funcione en el navegador)
3. `vite.config.js` (Configuración del empaquetador - asegúrate de tener la versión correcta)

## 2. Pasos para corregir

### Paso A: Subir los archivos faltantes
Desde tu PC (PowerShell), ejecuta estos comandos para copiar solo los archivos de configuración:

```powershell
# Estando en la carpeta del proyecto (PowerShell):
scp -P 2222 tailwind.config.js moises@173.212.202.150:/home/moises/apps/neuro/
scp -P 2222 postcss.config.js moises@173.212.202.150:/home/moises/apps/neuro/
scp -P 2222 vite.config.js moises@173.212.202.150:/home/moises/apps/neuro/
```

### Paso B: Reconstruir el Frontend en el VPS
Una vez subidos los archivos, conéctate al servidor y vuelve a generar la carpeta `dist`:

```bash
# Conectar al VPS
ssh -p 2222 moises@173.212.202.150

# Ir a la carpeta
cd ~/apps/neuro

# IMPORTANTE: ejecutar npm ci o npm install para asegurar que tienes tailwind y sus plugins
npm install

# Construir de nuevo (AHORA sí leerá los config files)
npm run build

# Reiniciar NGINX (opcional, pero recomendado para limpiar caché de archivos estáticos)
sudo systemctl reload nginx
```

## 3. ¿Cómo verificar?
1. Entra a `https://app.moiseslab.shop`
2. **IMPORTANTE**: Presiona `Ctrl + F5` o `Cmd + Shift + R` para limpiar la caché de tu navegador (a veces el navegador guarda el CSS antiguo "roto").
3. Verifica:
   - **Pacientes**: El nombre ya no debería quebrarse (la clase `whitespace-nowrap` ahora funcionará).
   - **Usuarios/Permisos**: Deberían ocupar el ancho completo (`w-full`) y tener estilo.
   - **Reportes**: Deberían verse las tarjetas de colores y filtros.
