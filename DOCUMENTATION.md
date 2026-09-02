# DOCUMENTACIÓN OFICIAL Y TÉCNICA DEL SISTEMA
## PARAGUAY-FFAA | METALSTORM ESCUADRÓN

- **Versión de la Plataforma:** 3.1.0 Classic Enterprise
- **Producción:** `https://paraguay-ffaa-metalstorm.fly.dev/`
- **Repositorio:** `https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic`
- **Fecha de Actualización:** Septiembre 2026

---

## ÍNDICE DE CONTENIDOS

1. [Arquitectura General](#1-arquitectura-general)
2. [Backend (Node.js + Express + Supabase)](#2-backend-nodejs--express--supabase)
3. [Frontend (SPA Vanilla JS + PWA)](#3-frontend-spa-vanilla-js--pwa)
4. [Sistema de Rendimiento (Módulo Principal)](#4-sistema-de-rendimiento-módulo-principal)
5. [Gestión de Usuarios y Roles (RBAC)](#5-gestión-de-usuarios-y-roles-rbac)
6. [Sistema de Eventos de Combate](#6-sistema-de-eventos-de-combate)
7. [Normativas del Escuadrón](#7-normativas-del-escuadrón)
8. [Deploy y DevOps (Fly.io)](#8-deploy-y-devops-flyio)
9. [Diagramas de Flujo y Datos](#9-diagramas-de-flujo-y-datos)
10. [Manual de Usuario y Operaciones](#10-manual-de-usuario-y-operaciones)
11. [Guía de Mantenimiento y Resolución de Incidencias](#11-guía-de-mantenimiento-y-resolución-de-incidencias)

---

## 1. ARQUITECTURA GENERAL

### 1.1 Diagrama de Arquitectura de Alto Nivel

```
+-------------------------------------------------------------------------+
|                              CLIENTE                                    |
|  [PWA / Single Page Application (Vanilla JS ES6+ / Tailwind / CSS3)]   |
|   - Service Worker (sw.js) -> Cache First / Network Fallback            |
|   - Local Storage (authToken, user, settings)                           |
|   - Módulos: auth.js, views.js, performance.js, profile.js, etc.        |
+------------------------------------+------------------------------------+
                                     |
                          HTTPS / REST API (JSON)
                                     |
+------------------------------------v------------------------------------+
|                         BACKEND (Fly.io / Node.js)                      |
|                                                                         |
|  [server.js - Express Engine]                                           |
|   ├── CORS & Security Headers (Helmet, Compression)                     |
|   ├── Rate Limiters (authLimiter, apiLimiter, bulkLimiter)              |
|   ├── Middlewares: requireAuth (JWT), requireRole (RBAC)                |
|   └── Enrutadores API (/api/*):                                         |
|       ├── /auth          -> Login, Verificación, Password Reset        |
|       ├── /admin         -> Gestión de pilotos, bulk upload, logs       |
|       ├── /performances  -> Registro de tokens, historial, métricas     |
|       ├── /events        -> Eventos semanales SQ/BM                     |
|       ├── /dashboard     -> Resúmenes y métricas de escuadrón           |
|       ├── /planes        -> Hangar, modelos de aviones, mods            |
|       ├── /profile       -> Datos personales y contacto                 |
|       ├── /settings      -> Configuración y preferencias                |
|       ├── /normativas    -> Reglamento oficial del escuadrón            |
|       └── /owner         -> Auditoría profunda, backups, control total  |
+------------------------------------+------------------------------------+
                                     |
                          PostgreSQL Connection Pool
                          (supabase-js Client SDK)
                                     |
+------------------------------------v------------------------------------+
|                      BASE DE DATOS (Supabase PostgreSQL)                |
|                                                                         |
|  Tablas Principales:                                                    |
|   ├── users              (id, user_id, nick, email, role, status...)    |
|   ├── performances       (id, user_id, event_id, tokens, days_conn...)  |
|   ├── events             (id, name, type, start_date, end_date...)      |
|   ├── planes / upgrades  (id, user_id, model, level, mastery...)        |
|   ├── audit_logs         (id, user_id, action, details, created_at...)  |
|   └── settings           (id, user_id, theme, notifications...)         |
+-------------------------------------------------------------------------+
```

### 1.2 Stack Tecnológico

- **Frontend:** Vanilla JavaScript (ES6+ Modules), HTML5 semántico, Tailwind CSS y custom Dark Luxury Military theme.
- **PWA / Offline:** Service Worker API (`sw.js`), Web App Manifest (`manifest.json`), LocalStorage para persistencia instantánea de sesión.
- **Backend:** Node.js (v20+), Express.js, JWT (`jsonwebtoken`), Hashing (`bcryptjs`), Rate-limiters (`express-rate-limit`).
- **Base de Datos:** PostgreSQL en Supabase gestionado a través de `@supabase/supabase-js`.
- **Infraestructura & DevOps:** Docker, Fly.io hosting, GitHub Actions.

### 1.3 Estructura del Repositorio

```
ffaa-paraguay-classic/
├── css/                     # Estilos y temas militares
├── js/                      # Frontend modular en Vanilla JavaScript
│   ├── api.js               # Conector HTTP fetch con interceptors
│   ├── auth.js              # Manejo de login, logout, sesión y JWT
│   ├── main.js              # Inicialización de la SPA y control de eventos
│   ├── performance.js       # Lógica del formulario y métricas de rendimiento
│   ├── profile.js           # Gestión del perfil del piloto
│   ├── settings.js          # Ajustes del usuario (tema, idioma, contacto)
│   ├── tour.js              # Guía de inducción interactiva
│   ├── utils.js             # Formateadores, toasts y helpers de DOM
│   └── views.js             # Enrutador de vistas cliente (SPA)
├── src/                     # Backend Node.js
│   ├── config/              # Configuración y variables de entorno
│   ├── controllers/         # Controladores de endpoints
│   ├── db/                  # Cliente Supabase
│   ├── middlewares/         # Middlewares (auth, roles, errores)
│   ├── routes/              # Declaración de rutas Express
│   └── scripts/             # Scripts de diagnóstico y mantenimiento
├── sql/                     # DDL y scripts de base de datos
├── index.html               # SPA Entrypoint
├── manifest.json            # PWA Manifest
├── sw.js                    # Service Worker
├── server.js                # Servidor Express principal
├── fly.toml                 # Configuración de despliegue Fly.io
└── Dockerfile               # Contenedor de producción
```

---

## 2. BACKEND (Node.js + Express + Supabase)

### 2.1 Endpoints de la API REST

#### 🔐 Autenticación (`/api/auth`)
- `POST /api/auth/login`: Autentica credenciales (email y password). Retorna JWT (`token`) y perfil `user`.
- `GET /api/auth/verify` o `GET /api/auth/me`: Valida token activo y actualiza datos de sesión.
- `POST /api/auth/register`: Registro inicial de nuevos pilotos (si está habilitado).
- `POST /api/auth/change-password`: Cambio de contraseña (obligatorio tras reseteo o primer ingreso).
- `POST /api/auth/forgot-password`: Envío de solicitud de restablecimiento.

#### 📊 Rendimiento (`/api/performances`)
- `POST /api/performances`: Registra o actualiza el rendimiento semanal (tokens, días conectados, observaciones).
- `GET /api/performances/my-history`: Obtiene el historial de participaciones del piloto autenticado.
- `GET /api/performances/stats`: Obtiene métricas consolidadas del piloto y del escuadrón.
- `GET /api/performances/all` *(ADMIN/OWNER)*: Historial consolidado de todo el escuadrón.
- `GET /api/performances/export` *(ADMIN/OWNER)*: Exportación en formato CSV.

#### 🛡️ Administración (`/api/admin`) *(Requiere rol ADMIN u OWNER)*
- `GET /api/admin/members`: Lista general de pilotos activos e inactivos.
- `POST /api/admin/members`: Alta de un nuevo piloto con contraseña temporal.
- `PUT /api/admin/members/:id/role`: Asignación de rango militar (`MIEMBRO`, `VETERANO`, `ADMIN`, `OWNER`).
- `PUT /api/admin/members/:id/status`: Cambio de estado (`ACTIVE` o `INACTIVE`).
- `POST /api/admin/bulk-upload`: Carga masiva de rendimientos desde texto o captura OCR.
- `POST /api/admin/users/:userId/reset-password`: Reinicia la contraseña de un piloto a `123456`.

#### 📅 Eventos de Combate (`/api/events`)
- `GET /api/events/active` / `GET /api/events/open`: Obtiene el evento en curso.
- `GET /api/events/history`: Consulta eventos finalizados.
- `POST /api/events/activate-bm` *(ADMIN/OWNER)*: Activa semana especial Black Market.

#### ✈️ Hangar de Aeronaves (`/api/planes`)
- `GET /api/planes/my-planes`: Lista de aviones propios y niveles de mejora.
- `POST /api/planes`: Registra un nuevo caza en el inventario.
- `PUT /api/planes/:id`: Actualiza nivel de avión o maestría de armas.
- `GET /api/planes/catalog/plane-models`: Catálogo de aeronaves de MetalStorm.

#### 👑 Módulo de Comando (`/api/owner`) *(Exclusivo OWNER)*
- `GET /api/owner/audit-summary`: Métricas de seguridad y accesos al sistema.
- `GET /api/owner/audit-logs`: Registro inmutable de cambios administrativos.
- `GET /api/owner/error-logs`: Bitácora de errores del backend.
- `POST /api/owner/backup/run`: Volcado de respaldo de datos de Supabase.

### 2.2 Autenticación JWT y Rotación de Sesiones

El middleware `requireAuth` implementa verificación de dos factores lógicos:
1. Firma criptográfica válida contra `JWT_SECRET`.
2. Coincidencia entre `token_version` contenido en el payload del JWT y el `token_version` actual del registro en base de datos. Esto permite revocar inmediatamente todas las sesiones activas cuando un usuario cambia su contraseña o es reiniciado por un administrador.

### 2.3 Esquema de Base de Datos Supabase (PostgreSQL)

```sql
-- Tabla: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    nick VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'MIEMBRO',
    status VARCHAR(50) DEFAULT 'ACTIVE',
    password_hash VARCHAR(255) NOT NULL,
    must_change_password BOOLEAN DEFAULT false,
    token_version INTEGER DEFAULT 1,
    phone VARCHAR(50),
    callsign VARCHAR(50),
    discord VARCHAR(100),
    bio TEXT,
    joined_date DATE,
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: performances
CREATE TABLE performances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    nick VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'MIEMBRO',
    event_id INTEGER NOT NULL,
    event_name VARCHAR(150),
    tokens INTEGER NOT NULL DEFAULT 0,
    days_connected INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'VERDE',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: events
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) DEFAULT 'SQ', -- 'SQ' (Squadron) o 'BM' (Black Market)
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_open BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. FRONTEND (SPA Vanilla JS + PWA)

### 3.1 Ciclo de Vida de la SPA y Persistencia

1. **`restoreSession()`:** Al cargar la página, se lee `authToken` y `user` de `localStorage` para hidratar `window.currentUser` de manera síncrona, eliminando pantallas de parpadeo.
2. **`checkAuthStatus()`:** Realiza una llamada asíncrona a `/api/auth/me` para validar que el token siga vigente y actualizar datos de perfil en background.
3. **Enrutamiento Declarativo:** El enrutador en `js/views.js` intercambia dinámicamente las secciones (`dashboard`, `performance`, `profile`, `squadron`, `normativas`, `settings`, `admin`, `hangar`) sin recargar la página.

### 3.2 Service Worker y Estrategia Offline

- **`sw.js`:** Implementa *Cache First* para archivos estáticos (HTML, CSS, JS, Iconos) y *Network Only* para `/api/*`.
- Permite abrir la app instantáneamente en condiciones de conectividad inestable o nula.

---

## 4. SISTEMA DE RENDIMIENTO (CORE BUSINESS LOGIC)

### 4.1 Cálculo Automático de Días Conectados

El sistema deduce la regularidad de combate en base a los tokens semanales:

$$\text{Días Conectados} = \begin{cases} 
0 & \text{si } \text{Tokens} = 0 \\
1 & \text{si } 1 \le \text{Tokens} < 50 \\
2 & \text{si } 50 \le \text{Tokens} < 100 \\
3 & \text{si } 100 \le \text{Tokens} < 150 \\
4 & \text{si } 150 \le \text{Tokens} < 200 \\
5 & \text{si } 200 \le \text{Tokens} < 250 \\
6 & \text{si } 250 \le \text{Tokens} < 300 \\
7 & \text{si } \text{Tokens} \ge 300 
\end{cases}$$

### 4.2 Semáforo de Estado Operativo

```
   Tokens >= 185  ──> [🟢 VERDE]   : Cumplimiento Óptimo / Excelencia
120 <= Tokens < 185 ──> [🟠 NARANJA] : Regular / Requiere Atención
 50 <= Tokens < 120 ──> [🔴 ROJO]    : En Riesgo de Sanción
    Tokens < 50   ──> [⚫ NEGRO]   : Inactividad Crítica / Pase a Reserva
```

### 4.3 Control de Acceso en el Registro

- **Pilotos (`MIEMBRO`, `VETERANO`):** Formulario predeterminado y bloqueado a su propio usuario.
- **Oficiales (`ADMIN`, `OWNER`):** Habilita el **Selector de Pilotos**, permitiendo ingresar o corregir datos de cualquier integrante del escuadrón.

---

## 5. GESTIÓN DE USUARIOS Y ROLES (RBAC)

| Rol | Permisos |
| :--- | :--- |
| **👑 OWNER** | Comandante en Jefe. Control total del sistema, auditoría, asignación de roles, backups y borrado. |
| **⭐ ADMIN** | Oficial de Escuadrón. Gestión de pilotos, reseteo de contraseñas, carga masiva y registro de rendimientos. |
| **🎖️ VETERANO** | Piloto Experimentado. Registro personal, acceso al Hangar de aeronaves y estadísticas de combate. |
| **✈️ MIEMBRO** | Piloto Regular. Registro semanal de tokens y lectura del documento normativo. |

---

## 6. EVENTOS DE COMBATE

- **Squadron Events (SQ):** Se disputan de **Jueves a Domingo**.
- **Black Market Events (BM):** Eventos especiales de temporada.
- **Nomenclatura Oficial:**
  $$\text{Formato:} \quad \text{YYYY-MM} \cdot \text{SEM } \text{WW} - \text{TIPO}$$
  *Ejemplo:* `2026-09 · SEM 36 - SQ`

---

## 7. NORMATIVAS DEL ESCUADRÓN

- Documento normativo digital accesible desde el menú **Normativas**.
- Define la exigencia mínima de 185 tokens semanales, políticas de licencias por motivos personales, conducta y ascensos/descensos en la jerarquía.

---

## 8. DEPLOY Y DEVOPS (Fly.io)

### 8.1 Variables de Entorno

```env
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... (o SUPABASE_ANON_KEY)
JWT_SECRET=super_secret_jwt_key_metalstorm_ffaapy_2026
ADMIN_SECRET_KEY=clave_maestra_de_emergencia
```

### 8.2 Comandos Operativos

```bash
# Iniciar sesión en CLI de Fly.io
flyctl auth login

# Configurar variables de entorno
flyctl secrets set JWT_SECRET="..." SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..."

# Desplegar aplicación
flyctl deploy -a paraguay-ffaa-metalstorm

# Monitorear logs en vivo
flyctl logs -a paraguay-ffaa-metalstorm

# Reiniciar instancia
flyctl apps restart paraguay-ffaa-metalstorm
```

---

## 9. DIAGRAMAS DE FLUJO Y DATOS

### 9.1 Flujo de Autenticación y Carga de Sesión

```
[Usuario] ──> Introduce Email & Password
     │
     └──> [POST /api/auth/login]
               │
               ├──> Error ──> [Notificación Toast 401]
               │
               └──> OK ──> [Guarda authToken y user en localStorage]
                         │
                         ├──> ¿must_change_password === true?
                         │         ├── SÍ ──> [Modal Cambio de Contraseña]
                         │         └── NO ──> [Carga Dashboard Principal]
```

### 9.2 Flujo de Rendimiento Semanal

```
[Piloto / Oficial] ──> Vista Rendimiento ──> Ingreso de Tokens 
       │
       └──> [POST /api/performances]
                 │
                 ├── Valida usuario y evento activo
                 ├── Guarda registro en 'performances'
                 └── Retorna 200 OK y actualiza estadísticas
```

---

## 10. MANUAL DE USUARIO Y OPERACIONES

### Para Pilotos (`MIEMBRO` / `VETERANO`)
1. Inicie sesión en `https://paraguay-ffaa-metalstorm.fly.dev/`.
2. Diríjase a **Rendimiento** e ingrese la cantidad exacta de tokens al finalizar el evento del domingo.
3. En **Mi Hangar**, configure los niveles de sus cazas de combate.

### Para Oficiales (`ADMIN` / `OWNER`)
1. Acceda al módulo **Administración** para registrar nuevos ingresos o restablecer claves temporales.
2. Use **Carga Masiva** para pegar la tabla de resultados de los 60 pilotos en un solo paso.
3. Asegúrese de que el evento activo corresponda a la semana actual antes de iniciar la recolección de datos.

---

## 11. GUÍA DE MANTENIMIENTO Y RESOLUCIÓN DE INCIDENCIAS

### Scripts Utilitarios

```bash
# Diagnóstico de consistencia
node src/scripts/diagnostic.js

# Verificación y mantenimiento de usuarios
node src/scripts/maintain-users.js

# Poblado inicial de pilotos
node src/scripts/seed-users.js
```

### Resolución de Incidencias Comunes

| Error Reportado | Causa | Solución |
| :--- | :--- | :--- |
| `column users.perf_status does not exist` | Consulta SQL a columna desnormalizada eliminada. | Las consultas a `users` omiten `perf_status` y se computa el estado dinámicamente desde `performances`. |
| `column users.avg_tokens does not exist` | Consulta a columna desnormalizada eliminada. | El promedio se calcula a partir de los registros en la tabla `performances`. |
| `column users.weeks_evaluated does not exist` | Campo inexistente en `users`. | Se contabilizan las semanas evaluadas mediante conteo de filas en `performances`. |
