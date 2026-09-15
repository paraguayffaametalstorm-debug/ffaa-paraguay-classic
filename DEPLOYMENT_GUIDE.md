# 🚀 Guía de Despliegue en Producción - PARAGUAY-FFAA | METALSTORM

> **Manual Táctico de Operaciones de Despliegue, Configuración de Entornos y Validación en Producción (v3.9.8).**  
> **Destino Operacional:** Fly.io (Región `gru` - São Paulo) & Supabase PostgreSQL Cloud.

---

## 1. 📋 Requisitos Previos y Entorno Operacional

El sistema opera bajo un contenedor Docker optimizado sobre **Node.js 22 Alpine**, respaldado por **Express 5** y una base de datos **PostgreSQL** administrada en **Supabase**.

### Herramientas Requeridas en Estación de Mando
- **Node.js:** Versión `>= 22.0.0` (LTS recomendado).
- **Docker:** Motor Docker `>= 24.0`.
- **Flyctl CLI:** Interfaz de línea de comandos de Fly.io (`curl -L https://fly.io/install.sh | sh`).
- **Git:** Control de versiones del repositorio institucional.

---

## 2. 🔐 Variables de Entorno de Mando (.env)

Asegurarse de que las siguientes variables críticas estén configuradas en Fly.io vía `fly secrets set` o en el archivo `.env`:

```bash
# Servidor y Red
PORT=3000
NODE_ENV=production

# Seguridad C4ISR y Criptografía
JWT_SECRET=clave_super_secreta_militar_minimo_32_caracteres_seguros
COOKIE_SECRET=secreto_de_firma_de_sesiones_y_cookies_ffaa

# Base de Datos Supabase
SUPABASE_URL=https://<TU-PROYECTO>.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Google OAuth 2.0 (Opcional si se habilita vinculación de Gmail)
GOOGLE_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
GOOGLE_CALLBACK_URL=https://ffaa-paraguay-classic.fly.dev/api/auth/google/callback

# Notificaciones y Correo Táctico (Reseteo de 15 Minutos)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notificaciones@ffaa.py
SMTP_PASS=app_password_militar_16_caracteres
```

---

## 3. 🐳 Arquitectura del Contenedor Docker (`Dockerfile`)

El despliegue en Fly.io utiliza un Dockerfile multi-etapa optimizado para minimizar superficie de ataque y peso de imagen:

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 4. 🚀 Despliegue en Fly.io (`fly.toml`)

### Configuración de Zona (`gru` - São Paulo)
Fly.io enruta el tráfico directamente a la región de baja latencia `gru` (São Paulo) para asegurar tiempos de respuesta inferiores a 40ms en territorio paraguayo:

```toml
app = "ffaa-paraguay-classic"
primary_region = "gru"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  timeout = "5s"
  path = "/health"
```

### Ejecución del Despliegue
1. **Comprobación de Sintaxis e Integridad:**
   ```bash
   npm test
   ```
2. **Autenticación en la Plataforma:**
   ```bash
   fly auth login
   ```
3. **Despliegue Inmutable:**
   ```bash
   fly deploy --remote-only
   ```
4. **Verificación Inmediata de Probes de Salud:**
   ```bash
   curl -s https://ffaa-paraguay-classic.fly.dev/health
   # Respuesta esperada: OK
   ```

---

## 5. 🗄️ Validación de Esquema de Base de Datos (Supabase)

Antes de autorizar tráfico operativo en v3.9.8, verificar que las siguientes tablas y columnas existan en Supabase:

1. **Tabla `plane_models`:**
   - Asegurar columnas de texto e internacionalización: `descripcion_es` (TEXT), `historia_es` (TEXT), `recomendaciones_es` (JSONB).
   - Verificar que los 44 modelos oficiales se encuentren dados de alta y activos.
2. **Tabla `users`:**
   - Dualidad `id` (UUID PK) y `user_id` (INTEGER UNIQUE).
   - `token_version` (INTEGER DEFAULT 1) y `must_change_password` (BOOLEAN DEFAULT true).
3. **Tablas de Hangar:**
   - `planes` (cazas registrados por piloto).
   - `plane_upgrades` (auditoría de mejoras de Fuselaje, Motor, Aviónica, Armas).
   - `plane_mods` (10 mods oficiales) y `mod_effects` (50 filas de niveles).

---

## 6. 📱 Política de Cache Invalidation y PWA (v3.9.8)

Al desplegar una nueva versión mayor o menor:
1. **Actualizar el identificador de cache en `sw.js`:**
   ```javascript
   const CACHE_NAME = 'PARAGUAY-FFAA-METALSTORM-v3.9.8';
   ```
2. **Comportamiento del Service Worker:**
   - Durante la fase de `install`, cachea los activos estáticos y vistas HTML.
   - En la fase de `activate`, purga automáticamente caches anteriores (`v3.7.0`, `v3.7.1`, etc.).
   - Al navegar, si el cliente detecta nuevo SW, forzará la recarga suave en el siguiente reinicio de sesión táctica.

---

## 7. 🛡️ Monitoreo Post-Despliegue y Plan de Contingencia (Rollback)

### Monitoreo en Tiempo Real
Para supervisar la actividad de la aeronavegabilidad del sistema:
```bash
fly logs -a ffaa-paraguay-classic
```

### Procedimiento de Rollback Inmediato
Si se detecta una anomalía crítica tras el despliegue:
1. Listar las versiones operativas anteriores:
   ```bash
   fly releases -a ffaa-paraguay-classic
   ```
2. Revertir a la versión estable previa:
   ```bash
   fly deploy --image <IMAGEN_PREVIA_ESTABLE>
   ```
3. Notificar al Alto Mando en el canal de oficiales.
