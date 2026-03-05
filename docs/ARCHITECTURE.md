# Arquitectura del Sistema Neuro

## Visión General
El **Sistema Neuro** es una aplicación web full-stack diseñada para la gestión de pacientes, citas e historias clínicas. Está construida para funcionar en dos entornos principales: **Local** (Consultorio) y **VPS** (Nube para acceso remoto).

---

## Diagrama de Flujo de Datos

```mermaid
graph TD
    Client[Cliente (Navegador)] -->|HTTP/HTTPS| Proxy
    subgraph "Servidor (Local o VPS)"
        Proxy[Proxy Reverso (Vite / Nginx)]
        Proxy -->|/api/*| API[Backend (Node.js/Express)]
        Proxy -->|/*| Frontend[Frontend (React/SPA)]
        API -->|Lee/Escribe| DB[(SQLite Database)]
        API -->|Almacena| Uploads[Carpeta Uploads]
    end
```

---

## Tecnologías Principales

| Componente | Tecnología | Descripción |
|---|---|---|
| **Frontend** | React + Vite | Interfaz de usuario rápida y responsiva. |
| **Backend** | Node.js + Express | API RESTful que maneja la lógica de negocio. |
| **Base de Datos** | SQLite | Base de datos ligera, no requiere servidor dedicado SQL. |
| **Gestor de Procesos** | PM2 | Mantiene la aplicación viva y maneja reinicios. |
| **Proxy** | Nginx (VPS) / Vite (Local) | Gestiona las peticiones y archivos estáticos. |

---

## Diferencias entre Entornos

### 1. Entorno Local (Computadora de la Doctora)
- **Sistema Operativo:** Windows 10/11.
- **Acceso:** `http://localhost:3000` (o IP local).
- **Servidor Web:** Utiliza el servidor de desarrollo `vite preview` o similar.
- **Archivos:** Se almacenan directamente en el disco local (`C:\Users\...\Desktop\Sistema Neuro`).
- **Backup:** Copia manual de la carpeta o scripts `.bat`.

### 2. Entorno VPS (Nube / Hostinger)
- **Sistema Operativo:** Linux (Ubuntu).
- **Acceso:** `https://app.moiseslab.shop`.
- **Servidor Web:** **Nginx** actúa como proxy reverso y maneja SSL (HTTPS).
- **Archivos:** Se almacenan en `~/apps/neuro/backend/uploads` (o ruta configurada).
- **Seguridad:** Firewall, SSH keys, Certbot para SSL.

---

## Estructura de Directorios Clave

```
/
├── backend/
│   ├── index.js          # Punto de entrada de la API
│   ├── db.js             # Conexión a SQLite
│   ├── sistema_neuro.db  # Archivo de base de datos
│   └── uploads/          # Almacenamiento de archivos (VPS)
├── src/                  # Código fuente del Frontend (React)
├── public/               # Archivos estáticos públicos
├── docs/                 # Documentación del sistema
├── ACTUALIZAR.bat        # Script de actualización para Windows
└── vite.config.js        # Configuración de Vite y Proxy
```
