# Solución: Logo en Impresión (VPS)

Para corregir el problema del logo que no sale en la impresión, necesitas hacer 2 ajustes: uno en el código del frontend (React) y outro en la configuración del servidor (Nginx).

---

## 1. Ajuste en el Código Frontend (`Atencion.jsx`)

El problema actual es que el código fuerza el uso del puerto `5000`, que está bloqueado en el servidor. Vamos a cambiarlo para que use la ruta `/uploads` directa.

**Archivo:** `src/pages/Atencion.jsx`

Busca la función `handlePrintExams` (aprox. línea 344) y `handlePrintRxNew` (aprox. línea 609).

**Cambiar esto:**
```javascript
const API_HOST = `http://${window.location.hostname}:5000`;
const logoUrl = settings.logoUrl ? `${API_HOST}/${settings.logoUrl}` : '';
```

**Por esto:**
```javascript
// Detecta si estamos en producción (https) o local
const isProd = window.location.protocol === 'https:';
// En producción usa la ruta relativa, en local usa puerto 5000
const API_HOST = isProd ? '' : `http://${window.location.hostname}:5000`;
const logoUrl = settings.logoUrl ? `${API_HOST}/${settings.logoUrl}` : '';
```

> **Nota:** Debes aplicar este cambio en **ambos** lugares donde aparece `API_HOST` dentro de ese archivo.

---

## 2. Ajuste en el Servidor (Nginx)

El servidor necesita saber dónde buscar las imágenes cuando el navegador pide `/uploads/...`.

1.  Conéctate a tu VPS.
2.  Edita la configuración de Nginx:
    ```bash
    sudo nano /etc/nginx/sites-available/app.moiseslab.shop
    ```
3.  Agrega el bloque `location /uploads/` justo antes de `location /api/`. Tu archivo debería quedar parecido a esto:

    ```nginx
    server {
        server_name app.moiseslab.shop;
        # ... otras configs ...

        location / {
            try_files $uri $uri/ /index.html;
        }

        # --- AGREGAR ESTO ---
        # Sirve las imágenes subidas directamente desde la carpeta del backend
        location /uploads/ {
            alias /home/moises/apps/neuro/backend/uploads/;
            expires 30d;
            access_log off;
        }
        # --------------------

        location /api/ {
            proxy_pass http://127.0.0.1:5000;
            # ... resto del proxy ...
        }
        
        # ... certificados SSL ...
    }
    ```

4.  Guarda (`Ctrl+O`, `Enter`) y sal (`Ctrl+X`).
5.  Verifica y recarga Nginx:
    ```bash
    sudo nginx -t
    sudo systemctl reload nginx
    ```

---

## Resumen
Una vez hechos estos cambios:
1.  **Frontend**: Reconstruye y vuelve a subir (`npm run build`).
2.  **Backend/Nginx**: Asegúrate de que Nginx tenga la nueva configuración.

El logo debería aparecer tanto en local como en producción.
