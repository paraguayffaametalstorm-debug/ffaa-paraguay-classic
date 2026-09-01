# 🚀 Guía de Despliegue en Producción - PARAGUAY-FFAA | METALSTORM

Esta guía detalla los pasos para desplegar la plataforma **PARAGUAY-FFAA | METALSTORM** en entornos de producción (Cloud Run, VPS Linux, Render, Railway o Docker).

---

## 1. Requisitos del Servidor

- **Sistema Operativo:** Ubuntu 22.04 LTS o Debian 12 (Recomendado) / Contenedor Linux.
- **Node.js:** v18.18.0 o superior (Node.js 20 LTS recomendado).
- **Gestor de Paquetes:** npm 9+ o Bun 1.0+.
- **Memoria RAM Mínima:** 512 MB (1 GB recomendado).
- **Disco:** 200 MB de espacio disponible.

---

## 2. Variables de Entorno de Producción

Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:

```ini
# Configuración del Servidor
PORT=3000
NODE_ENV=production

# Seguridad y Tokens JWT
JWT_SECRET=super_secreto_militar_pry_ffaa_2026_seguro_minimo_32_caracteres
JWT_EXPIRES_IN=7d

# Orígenes Permitidos para CORS (separados por comas)
CORS_ORIGIN=https://paraguay-ffaa.com,https://app.paraguay-ffaa.com

# Base de Datos Supabase (PostgreSQL)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
SUPABASE_ANON_KEY=tu_anon_key_aqui

# Configuración de Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=300
```

---

## 3. Despliegue con Docker

### 3.1 `Dockerfile` de Producción

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
```

### 3.2 Construcción y Ejecución

```bash
# Construir imagen
docker build -t pry-ffaa-metalstorm:latest .

# Ejecutar contenedor
docker run -d \
  --name pry-ffaa-app \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  pry-ffaa-metalstorm:latest
```

---

## 4. Despliegue en VPS Linux con PM2 & Nginx

### 4.1 Instalación de PM2

```bash
npm install -g pm2
pm2 start server.js --name "paraguay-ffaa" -i max
pm2 save
pm2 startup
```

### 4.2 Configuración de Nginx Reverse Proxy con SSL

```nginx
server {
    listen 80;
    server_name app.paraguay-ffaa.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.paraguay-ffaa.com;

    ssl_certificate /etc/letsencrypt/live/app.paraguay-ffaa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.paraguay-ffaa.com/privkey.pem;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 5. Verificación Post-Despliegue

1. **Chequeo de Salud del Servidor:**
   ```bash
   curl -I https://app.paraguay-ffaa.com/api/health
   # Debe responder HTTP 200 OK con el estado del sistema
   ```
2. **Prueba de Autenticación y JWT:**
   Iniciar sesión desde la interfaz web y verificar que el token se reciba correctamente.
3. **Prueba de PWA:**
   Abrir en Chrome/Safari móvil y comprobar la opción "Instalar aplicación".
