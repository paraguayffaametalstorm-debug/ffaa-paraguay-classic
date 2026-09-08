# 🚀 Guía de Despliegue en Producción - PARAGUAY-FFAA | METALSTORM

> **Manual de Operaciones y Despliegue en Fly.io, Docker Container y Servidores Linux para el Escuadrón PARAGUAY FFAA `[PRY]` (Versión v3.3.2).**

---

## 1. Infraestructura de Producción Oficial

La plataforma opera en alta disponibilidad en la infraestructura en la nube de **Fly.io**:
- **URL Pública:** [https://paraguay-ffaa-metalstorm.fly.dev/](https://paraguay-ffaa-metalstorm.fly.dev/)
- **Región Primaria:** `gru` (São Paulo, Brasil) para mínima latencia con Paraguay y Sudamérica.
- **Probe HTTP Ligero:** `GET /health` (texto plano para probes de Kubernetes/Fly Edge).
- **Telemetría del Sistema:** `GET /api/health` (JSON con uptime, versión y estado de memoria).

---

## 2. Variables de Entorno en Producción

Copia `.env.example` o configura las variables secretas en tu orquestador:

| Variable | Requerida | Ejemplo / Valor | Propósito |
|---|:---:|---|---|
| `PORT` | Opcional | `3000` | Puerto interno del contenedor |
| `NODE_ENV` | **Sí** | `production` | Activa optimizaciones de Express y suprime stack traces |
| `JWT_SECRET` | **Sí** | `f8a9e2c...` | Clave simétrica de al menos 32 caracteres para firmar JWT |
| `JWT_EXPIRES_IN` | Opcional | `7d` | Tiempo de expiración del token |
| `SUPABASE_URL` | **Sí** | `https://xxxx.supabase.co` | URL base de la API de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí** | `eyJhbGciOi...` | Clave de servicio de backend (bypassa RLS) |
| `SUPABASE_ANON_KEY` | Opcional | `eyJhbGciOi...` | Clave pública anónima para diagnóstico |
| `ALLOWED_ORIGINS` | Opcional | `https://paraguay-ffaa-metalstorm.fly.dev` | Dominios habilitados en CORS separados por coma |

---

## 3. Despliegue Automatizado en Fly.io

### 3.1 Archivo de Configuración `fly.toml`
El repositorio incluye el manifiesto oficial de Fly.io optimizado para Node.js 22:

```toml
app = 'paraguay-ffaa-metalstorm'
primary_region = 'gru'

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

[[http_service.checks]]
  grace_period = '10s'
  interval = '30s'
  method = 'GET'
  timeout = '5s'
  path = '/api/health'

[[vm]]
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1
```

### 3.2 Comandos de Despliegue CLI

```bash
# 1. Instalar la herramienta flyctl
curl -L https://fly.io/install.sh | sh

# 2. Iniciar sesión en Fly.io
fly auth login

# 3. Configurar secretos criptográficos y credenciales
fly secrets set \
  JWT_SECRET="super_secreto_militar_pry_ffaa_2026_seguro_minimo_32_caracteres" \
  SUPABASE_URL="https://tu-proyecto.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key_de_supabase" \
  NODE_ENV="production"

# 4. Desplegar la aplicación
fly deploy

# 5. Monitorear logs en tiempo real
fly logs
```

---

## 4. Despliegue con Docker

### 4.1 `Dockerfile` Oficial Multi-Stage (Node 22 Alpine)

```dockerfile
# -------------------------------------------------------------
# BUILD STAGE
# -------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# -------------------------------------------------------------
# PRODUCTION RUNNER STAGE
# -------------------------------------------------------------
FROM node:22-alpine

WORKDIR /app

# Metadatos del contenedor
LABEL maintainer="PARAGUAY FFAA - METALSTORM"
LABEL version="3.3.2"

ENV NODE_ENV=production
ENV PORT=3000

# Copiar dependencias de producción limpias
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Exponer exclusivamente el puerto 3000
EXPOSE 3000

# Usuario no privilegiado para seguridad
USER node

# Healthcheck interno de Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
```

### 4.2 Comandos de Construcción y Ejecución Local

```bash
# 1. Construir la imagen Docker
docker build -t paraguay-ffaa-metalstorm:3.3.2 .

# 2. Ejecutar el contenedor
docker run -d \
  --name pry-ffaa-app \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  paraguay-ffaa-metalstorm:3.3.2

# 3. Verificar estado
docker ps
docker logs -f pry-ffaa-app
```

---

## 5. Migración de Base de Datos (Upgrades 2.0)

Antes de iniciar la versión 3.3.2, ejecuta el script SQL en el panel de control de Supabase (**SQL Editor**):

```sql
-- Archivo: sql/upgrades_2_0.sql
ALTER TABLE planes 
ADD COLUMN IF NOT EXISTS nivel_fuselaje INT DEFAULT 0 CHECK (nivel_fuselaje >= 0 AND nivel_fuselaje <= 8),
ADD COLUMN IF NOT EXISTS nivel_motor INT DEFAULT 0 CHECK (nivel_motor >= 0 AND nivel_motor <= 8),
ADD COLUMN IF NOT EXISTS nivel_avionica INT DEFAULT 0 CHECK (nivel_avionica >= 0 AND nivel_avionica <= 8),
ADD COLUMN IF NOT EXISTS nivel_armas INT DEFAULT 0 CHECK (nivel_armas >= 0 AND nivel_armas <= 8),
ADD COLUMN IF NOT EXISTS recursos_piezas INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS recursos_avanzadas INT DEFAULT 0;

ALTER TABLE plane_models 
ADD COLUMN IF NOT EXISTS sistemas_disponibles JSONB DEFAULT '{"fuselaje": true, "motor": true, "avionica": true, "armas": ["canon", "misiles_corto", "misiles_medio"]}'::jsonb;

CREATE TABLE IF NOT EXISTS plane_upgrades (
    id SERIAL PRIMARY KEY,
    plane_id INT REFERENCES planes(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    sistema VARCHAR(50) NOT NULL,
    nivel_anterior INT NOT NULL DEFAULT 0,
    nivel_nuevo INT NOT NULL,
    piezas_usadas INT DEFAULT 0,
    avanzadas_usadas INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planes_user_nivel ON planes(user_id, nivel);
CREATE INDEX IF NOT EXISTS idx_plane_upgrades_plane_id ON plane_upgrades(plane_id);
CREATE INDEX IF NOT EXISTS idx_plane_upgrades_user_id ON plane_upgrades(user_id);
```

---

## 6. Scripts de Diagnóstico y Mantenimiento

El proyecto incluye utilidades CLI en `src/scripts/` para el equipo de desarrollo y soporte:

```bash
# Diagnóstico de conexión a Supabase, recuento de pilotos y tablas
node src/scripts/diagnostic.js

# Verificación de integridad de cuentas y roles militares
node src/scripts/maintain-users.js

# Población inicial de pilotos de prueba
node src/scripts/seed-users.js
```

---

## 7. Verificación de Despliegue Exitoso

1. **Probe Fly.io:** `curl https://paraguay-ffaa-metalstorm.fly.dev/health` $\rightarrow$ Retorna `OK`.
2. **Telemetría JSON:** `curl https://paraguay-ffaa-metalstorm.fly.dev/api/health` $\rightarrow$ Retorna `{"status":"ok", "timestamp":"..."}`.
3. **PWA Offline:** Abrir en navegador móvil y comprobar precaché `v3.3.2` en DevTools $\rightarrow$ Application $\rightarrow$ Cache Storage.

