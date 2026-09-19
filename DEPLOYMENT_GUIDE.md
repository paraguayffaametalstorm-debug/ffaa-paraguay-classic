# 🚀 Guía de Despliegue en Producción - PARAGUAY-FFAA | METALSTORM

> **Manual Táctico de Operaciones de Despliegue, Configuración de Entornos y Validación en Producción (v4.0.5).**  
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
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=paraguayffaa.metalstorm@gmail.com
EMAIL_PASS=tu_contraseña_de_aplicacion_de_16_caracteres
EMAIL_FROM="PARAGUAY-FFAA | METALSTORM" <paraguayffaa.metalstorm@gmail.com>
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

Antes de autorizar tráfico operativo en v4.0.5, verificar que las siguientes tablas y columnas existan en Supabase:

1. **Tabla `plane_models`:**
   - Asegurar columnas de texto e internacionalización: `descripcion_es` (TEXT), `historia_es` (TEXT), `recomendaciones_es` (JSONB).
   - Verificar que los 44 modelos oficiales se encuentren dados de alta y activos.
2. **Tabla `users`:**
   - Dualidad `id` (UUID PK) y `user_id` (INTEGER UNIQUE).
   - `token_version` (INTEGER DEFAULT 1) y `must_change_password` (BOOLEAN DEFAULT true).
   - **Campos de Inactivación Táctica (v4.0.5):**
     - `inactive_reason` (TEXT NULL)
     - `inactive_by` (UUID REFERENCES users(id) ON DELETE SET NULL)
     - `inactive_at` (TIMESTAMPTZ NULL)
3. **Tablas de Hangar:**
   - `planes` (cazas registrados por piloto).
   - `plane_upgrades` (auditoría de mejoras de Fuselaje, Motor, Aviónica, Armas).
   - `plane_mods` (10 mods oficiales) y `mod_effects` (50 filas de niveles).
   - `upgrade_nodes_v2` (3.072 filas del árbol de mejoras Starform Upgrades 2.0).
   - `password_resets` (tokens de restablecimiento de contraseña con vigencia de 15 min).

---

## 5.1. 🏗️ Recreación de Base de Datos desde Cero (SQL Migrations)

A partir de la **Fase 2 del Plan de Mejora Continua (HALL-048)**, el esquema completo de la base de datos está versionado en el repositorio bajo el directorio `sql/`. Esto permite recrear la base de datos desde cero en un proyecto Supabase nuevo.

### 📂 Estructura del Directorio `sql/`
sql/
├── 000_full_schema_dump.sql # Índice de referencia de las 22 tablas
├── 001_users.sql # Padrón militar de combatientes
├── 002_performances.sql # Registro semanal de rendimiento
├── 003_events.sql # Eventos operativos (Squadron)
├── 004_normativas.sql # Reglamentos y circulares
├── 005_plane_models.sql # Catálogo de 44 modelos de combate
├── 006_plane_mods.sql # Catálogo de 10 mods oficiales
├── 007_mod_effects.sql # Efectos numéricos de mods (50 filas)
├── 008_planes.sql # Hangar personal de pilotos
├── 009_plane_upgrades.sql # Auditoría de mejoras Upgrades 2.0
├── 010_upgrade_nodes_v2.sql # Árbol de nodos Starform 2.0 (3072 filas)
├── 011_upgrade_effects.sql # Efectos consolidados de upgrades
├── 012_upgrade_effects_history.sql # Historial de cambios de efectos
├── 013_password_resets.sql # Tokens de reset de contraseña (15 min)
├── 014_recovery_codes.sql # Códigos de recuperación alternativos
├── 015_user_settings.sql # Preferencias de usuario
├── 016_security_events.sql # Eventos de seguridad (login, resets)
├── 017_audit_logs.sql # Auditoría de cambios administrativos
├── 018_error_logs.sql # Logs de errores del sistema
├── 019_bm_events.sql # Black Market - Eventos
├── 020_bm_missions.sql # Black Market - Misiones
├── 021_bm_progress.sql # Black Market - Progreso
├── 022_bm_discounts.sql # Black Market - Descuentos
├── 023_upgrades_2_0.sql # Migración compuesta: Upgrades 2.0
├── 024_fix_users_null_user_id.sql # Fix de datos: user_id a usuarios NULL
├── README.md # Guía completa de migraciones
└── legacy/
└── updates_v3.4.0.sql # (Histórico, no ejecutar)

### 🔄 Procedimiento de Recreación desde Cero

**Cuándo usar este procedimiento:**
- Al crear un proyecto Supabase nuevo (ej: entorno de staging).
- Al recuperarse de una corrupción completa de la base de datos.
- Al transferir el sistema a otro propietario.

**Pasos:**

1. **Crear un proyecto nuevo en Supabase:**
   - Ir a [https://supabase.com/dashboard](https://supabase.com/dashboard).
   - Crear un proyecto con región São Paulo (gru) para baja latencia.
   - Anotar la `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.

2. **Ejecutar los archivos SQL en orden:**
   - Abrir el **SQL Editor** del proyecto.
   - Para cada archivo del `001` al `024`:
     - Copiar el contenido completo del archivo.
     - Pegar en el editor.
     - Presionar **RUN**.
     - Verificar que no haya errores.
   - **NO ejecutar los archivos en `legacy/`** (son históricos).

3. **Verificar la creación de las 22 tablas:**

~~~sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
~~~

   **Resultado esperado:** 22 tablas listadas.

4. **Verificar las políticas RLS:**
   - Tabla `password_resets`: debe tener RLS habilitado con política `no_public_access`.
   - Ejecutar:

~~~sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
~~~

5. **Configurar los secrets en Fly.io:**
   - Actualizar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` con los valores del nuevo proyecto:

~~~bash
fly secrets set SUPABASE_URL="https://nuevo-proyecto.supabase.co" -a paraguay-ffaa-metalstorm
fly secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..." -a paraguay-ffaa-metalstorm
~~~

6. **Restaurar los datos (si aplica):**
   - Los archivos SQL recrean el **esquema** pero no los datos.
   - Para datos de producción, usar respaldos previos (`pg_dump` con `--data-only`).
   - Para datos mínimos de prueba (catálogo de aviones, mods, normativas), usar los scripts de importación documentados en `FIXES_APPLIED.md` (Fix #10, #13).

### ⚠️ Notas Importantes

1. **Idempotencia:** Todos los archivos usan `CREATE TABLE IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS`, por lo que pueden ejecutarse múltiples veces sin error. Los `ALTER TABLE ... ADD CONSTRAINT` no son idempotentes y pueden fallar en la segunda ejecución.

2. **Black Market (BM):** Las tablas `bm_*` están marcadas con `TODO: REDISEÑO BM PENDIENTE`. El módulo se reescribirá en una fase posterior.

3. **Bug de tipos detectado:** En `023_upgrades_2_0.sql`, la FK `plane_upgrades.user_id INT REFERENCES users(id)` apunta a `users.id` (que es UUID). Este bug debe corregirse en una fase posterior.

4. **Documentación completa:** Para más detalles, ver `sql/README.md`.

---

## 6. 📱 Política de Cache Invalidation y PWA (v4.0.5)

Al desplegar una nueva versión mayor o menor:
1. **Actualizar el identificador de cache en `sw.js`:**
   ```javascript
   const CACHE_NAME = 'PARAGUAY-FFAA-METALSTORM-v4.0.5';
   ```
2. **Comportamiento del Service Worker:**
   - Durante la fase de `install`, cachea los activos estáticos y vistas HTML.
   - En la fase de `activate`, purga automáticamente caches anteriores (`v3.9.9`, `v3.9.8`, etc.).
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

---

*Versión: v4.0.5 · Actualizado: 18 Septiembre 2026*
