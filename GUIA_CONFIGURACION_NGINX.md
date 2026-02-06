# 🌐 El Rol de Nginx en tu Servidor VPS

Cuando contratas un VPS y un dominio, **Nginx** actúa como el "Gerente de Recepción" de tu sitio web. Es una pieza de software fundamental que se instala en el servidor (Ubuntu).

Aquí te explico cómo funciona y por qué es necesario, de forma sencilla.

---

## 🏗️ ¿Cómo es la Arquitectura?

Imagina que tu aplicación (Sistema Neuro) es el médico trabajando en su consultorio (Puerto 3001). Nginx es la recepcionista en la puerta principal (Puerto 80/443).

1.  **Paciente (Usuario)**: Escribe `www.sistema-neuro.com` en su navegador.
2.  **Internet**: Lleva esa petición al servidor VPS.
3.  **Nginx (Puerta Principal)**: Recibe la petición.
    *   Verifica que sea segura (Candado Verde / HTTPS).
    *   Si todo está bien, le pasa el mensaje a la aplicación.
4.  **Aplicación Node.js (Tu Código)**: Procesa la petición y le devuelve la respuesta a Nginx.
5.  **Nginx**: Entrega la respuesta final al usuario.

---

## ⭐ ¿Por qué usar Nginx? (Beneficios)

1.  **Elimina el ":3001" de la URL**:
    *   Sin Nginx: `http://sistema-neuro.com:3001` (Feo y poco profesional).
    *   Con Nginx: `https://sistema-neuro.com` (Limpio y estándar).

2.  **Seguridad SSL (HTTPS)**:
    *   Nginx maneja el certificado de seguridad (el candadito 🔒).
    *   Usa una herramienta gratuita llamada **Certbot** para instalar certificados "Let's Encrypt" automáticos.
    *   Node.js no tiene que preocuparse por la encriptación, Nginx se encarga.

3.  **Velocidad y Caché**:
    *   Nginx puede servir las imágenes, logos y archivos CSS mucho más rápido que Node.js, liberando a tu sistema para que se dedique solo a procesar datos médicos.

---

## 📝 Ejemplo de Configuración Técnica

Si un técnico (o tú mismo) configura el servidor, este es el bloque de código que se pone en Nginx para conectar tu dominio con tu aplicación:

```nginx
server {
    # 1. Escuchar en el puerto estándar de web (80)
    listen 80;
    server_name sistema-neuro.com www.sistema-neuro.com;

    # 2. Configuración del Proxy (El puente)
    location / {
        # Enviar todo el tráfico a tu aplicación en el puerto 3001
        proxy_pass http://localhost:3001;
        
        # Cabeceras necesarias para que la app sepa quién es el cliente real
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 3. (Opcional) Servir archivos estáticos/subidas directamente para más velocidad
    location /uploads/ {
        alias /var/www/sistema-neuro/backend/uploads/;
        expires 30d;
    }
}
```

> **Resumen:**
> Nginx es el "puente profesional" invisible que hace que tu aplicación Node.js sea accesible al mundo de manera segura, rápida y con una dirección web normal.
