# Guía de Instalación del Sistema Neuro

Esta guía detalla cómo instalar la aplicación desde cero en dos entornos: **Local (Windows)** y **VPS (Linux/Ubuntu)**.

---

## 💻 1. Instalación en Windows (Producción / Consultorio)

### Método Automático (Vía PowerShell)
Este es el método recomendado para instalar el sistema en computadoras de producción (como la de la doctora), ya que configura PM2 para que el sistema inicie automáticamente con Windows de manera invisible y usa los datos reales provistos en un archivo ZIP.

**Paso 1: Instalación de Requisitos (Git y Node.js)**
Abre **PowerShell como Administrador** y ejecuta:
```powershell
winget install OpenJS.NodeJS -e --accept-package-agreements --accept-source-agreements
winget install Git.Git -e --accept-package-agreements --accept-source-agreements
```
> [!IMPORTANT]
> **Cierra la ventana de PowerShell** y vuelve a abrirla como Administrador para que reconozca los nuevos programas.

**Paso 2: Permisos de Ejecución (Importante en Windows 11)**
En el nuevo PowerShell como Administrador, habilita la ejecución de scripts (si no lo haces, `npm` dará error de permisos):
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

**Paso 3: Descarga, Instalación y Restauración de Datos**
Asegúrate de colocar tu backup (`DADOS_DRA.zip`) en la raíz `C:\` antes de continuar. Luego ejecuta:
```powershell
cd C:\
git clone https://github.com/moisescnpls-coder/sistema-neuro.git "C:\Sistema Neuro"

cd "C:\Sistema Neuro"
npm install
cd backend
npm install
cd ..

# Extraer y restaurar base de datos, .env y uploads
Expand-Archive -Path "C:\DADOS_DRA.zip" -DestinationPath ".\temp_dados" -Force

Move-Item -Path ".\temp_dados\sistema_neuro.db" -Destination ".\backend\" -Force
Move-Item -Path ".\temp_dados\.env" -Destination ".\backend\" -Force
if (-Not (Test-Path -Path ".\backend\uploads")) { New-Item -ItemType Directory -Path ".\backend\uploads" | Out-Null }
Copy-Item -Path ".\temp_dados\uploads\*" -Destination ".\backend\uploads\" -Recurse -Force

Remove-Item -Recurse -Force ".\temp_dados"
```

**Paso 4: Construcción y PM2 (Servicio en Segundo Plano)**
Finalmente, construye el Front-End y configura el inicio automático:
```powershell
npm run build

npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
pm2 start ecosystem.config.cjs
pm2 save

Write-Host "Instalación concluida con SUCESSO. Acceda a http://localhost:5000" -ForegroundColor Green
```

> [!NOTE]
> Si en el futuro experimentas errores como `EPERM //./pipe/rpc.sock` con PM2 al usar otro usuario, puedes reiniciar el servicio con: `taskkill /F /IM node.exe` seguido de `pm2 start ecosystem.config.cjs && pm2 save`.

---

### Método Manual (Para Desarrollo Local)

1. **Requisitos:** Instala Node.js y Git manualmente.
2. **Clonar y Dependencias:**
   ```bash
   git clone https://github.com/moisescnpls-coder/sistema-neuro.git "Sistema Neuro"
   cd "Sistema Neuro"
   npm install
   ```
3. **.env:** Crea `.env` en `backend/` con `PORT=5000` y `SECRET_KEY=...`
4. **Iniciar:** Usa `Iniciar_Sistema.bat` o `npm run dev`.

---

## ☁️ 2. Instalación en VPS (Linux/Ubuntu)

### Requisitos Previos
- Acceso SSH al servidor VPS.
- Dominio apuntando a la IP del servidor (ej: `app.moiseslab.shop`).

### Pasos de Instalación

1.  **Preparar el Servidor:**
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y curl git unzip
    ```

2.  **Instalar Node.js (v20):**
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    ```

3.  **Instalar PM2 (Gestor de Procesos):**
    ```bash
    sudo npm install -g pm2
    ```

4.  **Clonar el Proyecto:**
    ```bash
    mkdir -p ~/apps
    cd ~/apps
    git clone https://github.com/moisesc/moisescnpls-coder-sistema-neuro.git neuro
    cd neuro
    ```

5.  **Instalar y Construir:**
    ```bash
    npm install
    npm run build
    ```

6.  **Configurar Base de Datos y Uploads:**
    Asegúrate de que las carpetas existan:
    ```bash
    mkdir -p backend/uploads
    ```

7.  **Inicar con PM2:**
    ```bash
    pm2 start backend/index.js --name "neuro-backend"
    pm2 save
    pm2 startup
    ```

### Configuración del Proxy Nginx (Para Dominio y SSL)

1.  **Instalar Nginx:**
    ```bash
    sudo apt install -y nginx
    ```

2.  **Crear Configuración:**
    Edita `/etc/nginx/sites-available/neuro`:
    ```nginx
    server {
        server_name app.moiseslab.shop;

        location / {
            root /home/usuario/apps/neuro/dist;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        location /api {
            proxy_pass http://localhost:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        location /uploads {
            alias /home/usuario/apps/neuro/backend/uploads;
        }
    }
    ```

3.  **Activar Sitio y SSL (Certbot):**
    ```bash
    sudo ln -s /etc/nginx/sites-available/neuro /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d app.moiseslab.shop
    ```

---

## 🛠️ Solución de Problemas (Troubleshooting)

-   **Error de Permisos:** Si `git pull` falla, verifica el dueño de la carpeta (`chown -R usuario:usuario ~/apps/neuro`).
-   **Puerto Ocupado:** Asegúrate de que nadie más use el puerto 5000 (`lsof -i :5000`).
-   **Pantalla Blanca:** Revisa si `npm run build` corrió sin errores.
