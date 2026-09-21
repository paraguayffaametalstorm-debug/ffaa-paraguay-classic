# 🏛️ Arquitectura del Sistema - PARAGUAY-FFAA | METALSTORM

> **Especificación Técnica de Arquitectura de Software, Seguridad C4ISR, Modelado de Datos, Resiliencia y Flujos Operativos (Versión v4.3.1).**

---

## 1. Visión General de la Arquitectura

El sistema táctico **PARAGUAY-FFAA | METALSTORM** implementa un modelo de arquitectura **Cliente-Servidor Full-Stack desacoplado y orientado a servicios RESTful**, optimizado para el entorno militar del escuadrón `[PRY]`.

La capa de presentación opera como una Single Page Application (SPA) táctica modular y ligera sin frameworks pesados, con soporte PWA offline-first, pantallas especializadas de vinculación (`/link-account`) y restablecimiento (`/reset-password`). El backend está construido sobre **Express.js v5.2.1** ejecutándose en un contenedor optimizado **Node.js 22 Alpine**, respaldado por **Supabase (PostgreSQL Cloud)**, soporte de autenticación federada **Google OAuth 2.0 (Passport.js)**, motor de envío de correo **Nodemailer con SMTP Gmail** y un motor de resiliencia con degradación elegante (*in-memory fallback*).

```
                  ┌──────────────────────────────────────────────────────────┐
                  │              NAVEGADOR / PWA CLIENT (v4.0.0)             │
                  │  - Vanilla ES6+ SPA & Responsive Tactical Design         │
                  │  - Dynamic Component Loader (17+ Vistas & Modales)       │
                  │  - Service Worker Cache-First (sw.js v4.0.0)             │
                  │  - Terminal de Vinculación Google (/link-account)        │
                  │  - Terminal de Restablecimiento (/reset-password)        │
                  └────────────┬─────────────────────────────┬───────────────┘
                               │ HTTPS / WSS / JWT           │ OAuth 2.0 Redirect
                               ▼                             ▼
                  ┌────────────────────────┐    ┌────────────────────────────┐
                  │ REVERSE PROXY (Fly.io) │    │  GOOGLE IDENTITY PLATFORM  │
                  │ - Edge São Paulo (gru) │    │  - Google OAuth 2.0 Engine │
                  │ - SSL Termination :3000│    │  - Identity Scopes: email, │
                  └────────────┬───────────┘    │    profile                 │
                               │                └────────────┬───────────────┘
                               │ HTTP Request                │ Callback Code
                               ▼                             ▼
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │                   NÚCLEO BACKEND (Node.js 22 / Express 5)                   │
   │                                                                             │
   │  [Rate Limiters] ──► [Helmet / Security] ──► [Compression / JSON Parser]   │
   │  [Passport Engine] ──► Google Strategy (OAuth 2.0 Callback & Exchange)     │
   │                                                                             │
   │  [Rutas Modulares]                                                          │
   │  ├── /health & /api/health (Probes de Orquestación & Telemetría C4ISR)      │
   │  ├── /api/auth                                                              │
   │  │   ├── /login (Login Dual: Institucional @ffaa.py o Gmail)               │
   │  │   ├── /google, /google/callback & /google/status (OAuth 2.0)            │
   │  │   ├── /link-account (Vinculación Táctica Google-Combatiente)             │
   │  │   ├── /forgot-password & /reset-password (Tokens Criptográficos 15 min)  │
   │  │   └── /change-password, /verify, /me (Gestión de token_version)          │
   │  ├── /api/dashboard & /api/events (Telemetría de Combate & Ventanas)        │
   │  ├── /api/performances                                                      │
   │  │   ├── / (Registro Tokens, Días & Semáforo Militar)                       │
   │  │   ├── /pilots (Selector Táctico de Pilotos para ADMIN/OWNER)             │
   │  │   ├── /history, /stats & /all (Historial & Consulta de Escuadrón)        │
   │  │   └── /export (Exportación CSV Militar Sanitizado contra Inyecciones)    │
   │  ├── /api/planes (Hangar Militar - 44 Cazas, Upgrades 2.0, i18n)            │
   │  ├── /api/admin (Gestión Miembros: status con motivo, listado de inactivos) │
   │  ├── /api/owner (Auditoría C4ISR, Backups Transaccionales, Purga)           │
   │  └── /api/presence, /api/profile, /api/settings, /api/normativas            │
   │                                                                             │
   │  [Middlewares Centrales]                                                    │
   │  ├── requireAuth (Bearer JWT + token_version validation)                    │
   │  ├── requireRole (OWNER / ADMIN / VETERANO / MIEMBRO)                       │
   │  └── errorHandler (JSON Responses estructuradas normalizadas)               │
   └──────────────────┬──────────────────────────────────────┬───────────────────┘
                      │                                      │
      Primary Storage │                                      │ Fallback Storage
                      ▼                                      ▼
        ┌────────────────────────────┐         ┌───────────────────────────┐
        │    SUPABASE POSTGRESQL     │         │    IN-MEMORY FALLBACK     │
        │ - Users & Roles (RBAC)     │         │ - Volatile State Store    │
        │ - Performances & Events    │         │ - Default Datasets        │
        │ - Starform Upgrades 2.0    │         │ - Graceful Degradation    │
        │ - Password Resets (15 min) │         └───────────────────────────┘
        │ - Upgrade Nodes v2 (3072)  │
        │ - Audit Logs & Security    │
        └────────────────────────────┘
```

---

## 2. Capas del Sistema

### 2.1 Capa de Presentación (Frontend SPA & Terminales Tácticas)
- **`index.html`:** Contenedor maestro con meta-tags PWA, enlaces a tipografía militar (`Rajdhani`, `Inter`, `JetBrains Mono`), contenedor de notificaciones toast, barra de navegación táctica y modales globales.
- **`link-account.html`:** Terminal táctica especializada para vincular cuentas de Google (OAuth) con el expediente y Callsign militar del combatiente existente.
- **`reset-password.html`:** Terminal autónoma de restablecimiento de contraseñas de combate validada por token criptográfico de 15 minutos.
- **`privacy.html` y `terms.html`:** Documentación regulatoria institucional requerida para la verificación de Google OAuth 2.0 y directivas de seguridad.
- **`/components/*.html`:** 17 vistas y modales inyectados dinámicamente según el estado del usuario:
  - `dashboard.html`: Cuadro de mando operacional con semáforo, cuota del escuadrón y Top 5.
  - `performance-form.html`: Formulario con selector de pilotos (`#performanceTarget`) y advertencia de modo oficial.
  - `admin-panel.html`: Panel de oficiales con filtros dinámicos, `avg_tokens`, `weeks_evaluated` y `perf_status`.
  - `owner-panel.html`: Consola C4ISR para el Comandante en Jefe con auditoría de seguridad y respaldos.
  - `planes-view.html`: Hangar de aeronaves con arquitectura dual (Vista 1 Grid Táctico y Vista 2 Pantalla Dedicada), catálogo de 44 cazas oficiales y Upgrades 2.0.
  - `profile-view.html`: Expediente militar, insignia de estado de escuadrón (`squadStatus`), telemetría y hangares personales.
  - `forgot-password-modal.html`: Modal de recuperación asistida por correo táctico.
- **`/css/`:** Sistema de diseño militar modular:
  - `global.css`: Variables CSS de identidad nacional y militar (`--pry-red: #D52B1E`, `--pry-blue: #0038A8`, `--bg-dark`, `--text-main`).
  - `tactical-design.css`: Bordes biselados, tipografía Rajdhani, tarjetas de radar y badges militares (`.role-badge`, `.squad-status-badge`).
  - `components.css`: Estilos para botones de acción rápida, badges de rango, tablas tácticas y selectores.
  - `views.css`: Moduladores de diseño específicos de cada vista.
- **`/js/`:** Lógica modular en JavaScript Vanilla (ES6+):
  - `auth.js`: Orquestador de autenticación dual, captura de tokens OAuth (`handleOAuthCallback`), gestión de JWT en `localStorage`, control de expiración y advertencias de sesión.
  - `views.js`: Orquestador de vistas y enrutador dinámico en el cliente.
  - `api.js`: Cliente HTTP centralizado que inyecta automáticamente cabeceras `Authorization: Bearer <token>`.
  - `performance.js`: Lógica de validación, cálculo interactivo de semáforo militar y selector de combatientes para oficiales.
  - `profile.js`: Expediente militar, visualización de hangar personal, telemetría y actualización de perfil táctico.
  - `tour.js`: Guía interactiva asistida para el primer ingreso de reclutas.

### 2.2 Capa de Servidor (Backend Express)
- **`server.js`:** Entrada principal del núcleo. Configura:
  - **Autenticación Passport.js:** Inicialización de `passport.use(new GoogleStrategy(...))` configurada en `src/config/passport.js`.
  - **Rate Limiters:** `authLimiter` (30 req / 15m), `apiLimiter` (600 req / 15m), `bulkLimiter` (20 req / 15m).
  - **Seguridad:** `helmet()` adaptado para permitir renderizado en iframe y PWA.
  - **Compresión:** Gzip / Deflate vía `compression()`.
  - **CORS:** Orígenes controlados por lista blanca (`ALLOWED_ORIGINS` o `localhost, fly.dev`).
  - **Probe:** Endpoint `GET /health` de respuesta instantánea en texto plano para orquestadores Fly.io.
- **`/src/routes/`:** Enrutadores modulares segregados por responsabilidad funcional:
  - `auth.routes.js`: Rutas de login dual, OAuth 2.0 (`/google`, `/google/callback`, `/google/status`), `/link-account`, `/forgot-password`, `/reset-password`.
  - `performances.routes.js`: Rutas de rendimiento, exportación CSV y selector táctico `/api/performances/pilots`.
  - `admin.routes.js` y `owner.routes.js`: Supervisión RBAC, auditoría y administración de escuadrón.
  - `planes.routes.js`: Hangar, catálogo de cazas y mejoras Upgrades 2.0.
  - `events-v2.routes.js`: **Módulo de Eventos Unificado (F3.1).** 12 endpoints para la gestión unificada de eventos SQ y BM (`/api/events-v2/*`). Reemplaza funcionalmente a `/api/events/*` y `/api/bm/*`.
  - **Integración Wiki (Fase 3C):** El endpoint `/api/planes/:id/details` devuelve 8 campos extraídos de la Wiki (`descripcion`, `historia`, `recomendaciones`, `loadout_wiki`, `paints`, `canopies`, `general_info_wiki`, `wiki_url`).
- **`/src/middlewares/`:**
  - `auth.js`: Validación estricta de firma JWT y comparación de `token_version` con la base de datos para prevenir sesiones fantasma.
  - `requireRole`: Validador de rangos (`OWNER`, `ADMIN`, `VETERANO`, `MIEMBRO`).
  - `errorHandler.js`: Captura centralizada de excepciones que asegura respuestas estructuradas en JSON.

### 2.2b Módulo de Eventos Unificado (`/api/events-v2/*`) — F3.1

A partir de la Fase 3 del rediseño (2026-09-17), el sistema cuenta con un módulo unificado de eventos que reemplaza la lógica dual legacy (`/api/events/*` para SQ + `/api/bm/*` para BM).

**Endpoints (12):**

| Método | Endpoint | Propósito |
|---|---|---|
| `GET` | `/api/events-v2` | Listar eventos (filtros por `type`, `status`) |
| `GET` | `/api/events-v2/active` | Evento activo actual (1 solo a la vez) |
| `GET` | `/api/events-v2/:id` | Detalle de un evento |
| `POST` | `/api/events-v2` | Crear evento (ADMIN/OWNER) |
| `PUT` | `/api/events-v2/:id` | Editar evento (ADMIN/OWNER) |
| `PATCH` | `/api/events-v2/:id/status` | Cambiar estado (OPEN/CLOSED/CANCELLED) |
| `DELETE` | `/api/events-v2/:id` | Eliminar (solo SCHEDULED) |
| `GET` | `/api/events-v2/:id/participations` | Listar participaciones |
| `POST` | `/api/events-v2/:id/participations` | Cargar participación |
| `PUT` | `/api/events-v2/:id/participations/:uid` | Editar participación |
| `DELETE` | `/api/events-v2/:id/participations/:uid` | Eliminar participación |
| `GET` | `/api/events-v2/switch-status` | Alias: estado del switch |

**Arquitectura de datos:**
- **`events_master`:** Tabla unificada de eventos (UUID, `type`, `status`, `metadata` JSONB).
- **`event_participations`:** Tabla unificada de participaciones (UUID, `event_id`, `user_id`, `data` JSONB, `computed_points`, `status`).

**Regla del switch:**
- Solo **1 evento `OPEN`** a la vez (índice UNIQUE parcial `idx_events_master_single_open`).
- Al activar un BM, el SQ se cierra con `closed_reason = 'BM_REPLACED'`.
- El scheduler auto-crea el próximo SQ el jueves 12:00 UTC (09:00 PY, UTC-3 fijo).

**Deprecación de endpoints legacy:**
- `/api/events/*` (5 endpoints) y `/api/bm/*` (15 endpoints) fueron **retirados** en v4.3.0 (F4.2.2-F). Sucesor: `/api/events-v2/*`. Sunset formal: **2026-12-16**.
- Emiten headers `Sunset: Sat, 16 Dec 2026 23:59:59 GMT` y `Deprecation: true`.
- Migración esperada a `/api/events-v2/*` antes del sunset.

### 2.2c Scheduler de Eventos (`eventScheduler.js`) — v2.0 (HALL-066)

Componente autónomo que garantiza la existencia y correcta transición de
eventos SQUADRON según el calendario oficial.

**Ubicación:** `src/utils/eventScheduler.js`

**Arquitectura v2.0 (2026-09-21):**

El scheduler fue reescrito tras HALL-066. Ejecuta **3 tareas independientes**
en cada tick:

| Tarea | Función | Cuándo actúa |
|---|---|---|
| **1** | `openScheduledEvents()` | Promueve `SCHEDULED → OPEN` si `NOW() >= start_date` |
| **2** | `closeExpiredEvents()` | Cierra `OPEN → CLOSED` si `NOW() >= end_date` |
| **3** | `ensureNextSquadronEvent()` | Prepara la próxima semana ISO como `SCHEDULED` |

**Características:**

- **Cron:** cada 1 hora (`0 * * * *`).
- **Advisory Lock:** multi-réplica safe.
- **Idempotencia:** detecta eventos existentes por `legacy_event_id`.
- **Backfill:** deshabilitado (F2.9).
- **Timezone:** UTC-3 fijo (`PY_OFFSET_HOURS = 3`).
- **Duración:** evento SQ = 4 días; ventana de carga SQ = 7 días (ADR-008).

**Guardas de seguridad (HALL-066):**

- ⚠️ Un evento futuro **NUNCA** se crea como `OPEN`.
- ⚠️ Un evento `OPEN` **NUNCA** se cierra antes de su `end_date`.
- ⚠️ `created_at` siempre usa `NOW()`.
- ⚠️ `closed_at` siempre es `null` al crear.

**Flujo:**

1. Scheduler tick (cada 1 hora).
2. Adquirir advisory lock.
3. **TAREA 1:** Buscar `SCHEDULED` con `start_date <= NOW()`. Promover a `OPEN`.
4. **TAREA 2:** Buscar `OPEN` con `end_date <= NOW()`. Cerrar.
5. **TAREA 3:** Preparar la próxima semana ISO como `SCHEDULED`.
6. Liberar advisory lock.

**Integración:** `server.js` llama a `startEventScheduler()` en el arranque.

**Referencias:**

- HALL-066: `docs/incidentes/HALL-066.md`.
- ADR-008: `docs/adr/ADR-008-ventanas-carga-desacopladas.md`.
- Tests: `tests/utils/eventScheduler.test.js` (29 tests).

### 2.2d Middleware de Deprecación de Endpoints Legacy — F3.2

Middleware que emite headers HTTP de deprecación en endpoints legacy para facilitar la migración ordenada.

**Headers emitidos:**

| Header | Valor |
|---|---|
| `Deprecation` | `true` |
| `Sunset` | `Sat, 16 Dec 2026 23:59:59 GMT` |
| `Link` | `</api/events-v2>; rel="successor-version"` |
| `Warning` | `299 - "This endpoint is deprecated. Use /api/events-v2/* instead."` |

**Endpoints afectados:**
- `/api/events/*` (5 endpoints) → sucesor: `/api/events-v2/*`
- `/api/bm/*` (15 endpoints) → sucesor: `/api/events-v2/*`

**Implementación:** `src/middlewares/deprecation.js` (aplicado en `server.js` a las rutas legacy).

---

### 2.3 Capa de Medios (Cloudinary)

El sistema utiliza **Cloudinary** como CDN externo para servir todas
las imágenes de aeronaves y modificaciones tácticas, evitando cargar
el backend de Express con tráfico de assets estáticos.

- **Cloud Name:** `evoejuci`
- **Estructura de carpetas:** `paraguay-ffaa/planes/` (attack, heavy, interceptor, light, medium) y `paraguay-ffaa/mods/` (10 mods tácticos)
- **Transformaciones aplicadas:** `w_256,h_256,c_fill,f_webp,q_auto`
  - Redimensionado uniforme 256×256 px
  - Recorte inteligente (`c_fill`)  
  - Conversión a WebP (`f_webp`)
  - Calidad automática (`q_auto`)
- **Cobertura:** 44 aviones (fotos principales) + 10 mods (iconos)
- **Uso:** Todas las URLs se almacenan en Supabase (`plane_models.image_url` y `plane_mods.image_url`) y se consumen directamente desde el frontend.
- **Ventajas:** Ahorro de ancho de banda en Fly.io, cacheo en edge, optimización automática de formato.


---

## 3. Flujo C4ISR de Autenticación Híbrida Dual y Vinculación de Cuentas

```
[Piloto / Oficial]
       │
       ├──▶ [Opción 1: Login Tradicional Dual]
       │         │
       │         ├── Ingresa email institucional (@ffaa.py) O Gmail vinculado + Contraseña
       │         └── Servidor valida contra users.email / users.email_institucional
       │
       └──▶ [Opción 2: Autenticación con Google OAuth 2.0]
                 │
                 ▼
         [Google Identity Screen] ──▶ Consentimiento y obtención de Google ID + Email
                 │
                 ▼
         [GET /api/auth/google/callback]
                 │
                 ├── ¿Existe combatiente con google_id o email ya vinculado?
                 │         │
                 │         ├── [SÍ] ──▶ Genera JWT con token_version ──▶ Redirige a SPA con sesión activa
                 │         │
                 │         └── [NO] ──▶ Redirige a /link-account?email={googleEmail}
                 │                           │
                 │                           ▼
                 │                 [Terminal /link-account]
                 │                 - Ingresa Callsign Militar (ej: VIPER)
                 │                 - Ingresa Contraseña Militar actual
                 │                           │
                 │                           ▼
                 │                 [POST /api/auth/link-account]
                 │                 - Valida credenciales existentes
                 │                 - Asocia google_id y email en Supabase
                 │                 - Emite JWT oficial ──▶ Acceso al Dashboard
```


### 3.1 Flujo de Bloqueo de Cuenta Inactiva (v4.0.0)

```text
[Piloto intenta login]
       │
       ▼
[requireAuth valida JWT]
       │
       ▼
[Busca user en users por email/user_id/id]
       │
       ▼
[¿user.status === 'INACTIVE' o 'INACTIVO'?]
       │
       ├── NO → continúa a la vista solicitada
       │
       └── SÍ → Bloquea con 403 USER_INACTIVE
               │
               ├─ 1. Lee inactive_reason, inactive_at, inactive_by directo de users
               │
               ├─ 2. Si inactive_by está poblado → consulta nick del comandante
               │
               ├─ 3. Si faltan datos (inactivos históricos) → fallback a audit_logs:
               │     - .eq('target_id', user.id)
               │     - .in('action', ['USER_DEACTIVATED', 'USER_INACTIVATED', 'USER_STATUS_CHANGE'])
               │     - extrae actor_nick y created_at
               │
               ├─ 4. Construye mensaje enriquecido con actor, fecha y motivo
               │
               └─ 5. Retorna 403 con details ampliados:
                  {
                    error: "⚠️ ACCESO DENEGADO: Su cuenta ha sido inactivada por ...",
                    code: "USER_INACTIVE",
                    details: {
                      inactive_by: "el Comandante [NICK]",
                      inactive_at: "ISO timestamp",
                      inactive_reason: "motivo o null",
                      contact: "comando.central@ffaa.py"
                    }
                  }
```

---

## 4. Modelo Operacional de Rendimiento y Selector de Pilotos

### 4.1 Flujo de Registro Semanal y Semáforo Militar
```
[Piloto en Combate] ──▶ Finaliza Evento Semanal ──▶ Registra Tokens y Días
                                                            │
                                                            ▼
                                                    [Validación Zod]
                                             (tokens: 0..300, dias: 0..7)
                                                            │
                                                            ▼
                                                [Cálculo Semáforo Militar]
                                                ├── VERDE:   tokens >= 175 && dias >= 4
                                                ├── NARANJA: tokens >= 130 && dias >= 3
                                                ├── ROJO:    tokens >= 100 && dias >= 2
                                                └── NEGRO:   tokens < 100 || dias < 2
                                                            │
                                                            ▼
                                                [Persistencia Transaccional]
                                                (Supabase + Registro Audit)
                                                            │
                                                            ▼
                                                [Actualización de Promedios]
                                                (Top 5, Semáforo, Dashboard)
```

### 4.2 Selector Táctico de Pilotos (`GET /api/performances/pilots`)
Para facilitar la carga de datos en misiones o eventos por parte de la jerarquía militar:
- **Modo Individual (`MIEMBRO`):** La API restringe el resultado exclusivamente al propio combatiente.
- **Modo Oficial (`ADMIN` / `OWNER`):** La API devuelve la nómina completa de pilotos con `status = 'ACTIVE'`.
- **Integración en Interfaz (`performance-form.html`):** Despliega el menú `#performanceTarget` y el banner de advertencia `Modo Oficial Activo: Estás cargando datos para [Callsign]`, garantizando trazabilidad y auditoría de la carga delegada.

---

## 5. Starform Upgrades 2.0 & Hangar Militar Rediseñado (Flota de 44 Cazas)

El sistema soporta la gestión completa de la flota militar compuesta por **44 modelos de cazas** oficiales (F-22 Raptor, Su-57 Felon, F-35 Lightning II, Eurofighter Typhoon, Dassault Rafale, JAS 39 Gripen, J-20, Su-35, A-10C Thunderbolt II, MiG-29, etc.) junto con la actualización técnica de subsistemas mecánicos y de combate:

### Arquitectura de Datos del Árbol de Nodos (`upgrade_nodes_v2`)

El sistema implementa el árbol de mejoras **Starform Upgrades 2.0** mediante la tabla `upgrade_nodes_v2` (3.072 filas), que modela las bifurcaciones de ruta A/B en los niveles 5-8.

**Esquema de `upgrade_nodes_v2`:**

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | INTEGER | PK auto-incremental |
| `avion_id` | TEXT | FK referencial a `plane_models.id` |
| `sistema_web` | TEXT | Sistema base (fuselaje, motor, avionica, armas) |
| `sistema_categoria` | TEXT | Categoría específica (canones, misiles_ir, etc.) |
| `nivel` | INTEGER | Nivel del nodo (0-8) |
| `ruta` | TEXT | Ruta A/B (niveles 5-8) o null |
| `node_name` | TEXT | Nombre táctico del nodo |
| `requirement_level` | INTEGER | Nivel de aeronave requerido |
| `effects` | JSONB | Efectos cuantitativos del nodo |
| `stats_afectadas` | JSONB | Stats impactadas |
| `cost_piezas` | INTEGER | Costo en piezas estándar |
| `cost_avanzadas` | INTEGER | Costo en componentes avanzados |
| `created_at` | TIMESTAMP | Fecha de inserción |

**Consumo en código:**
- `src/utils/upgradeNodes.js`: Consulta con caché en memoria (TTL 5 min) y fallback.
- `src/controllers/planes.controller.js`: Cálculo de efectos de Upgrades 2.0.

### Subsistemas Mejorables (Niveles 0 a 8)
1. **Fuselaje (`nivel_fuselaje`):** Resistencia al daño, reducción de firma de radar e integridad física.
2. **Motor (`nivel_motor`):** Velocidad máxima, aceleración con posquemador y maniobrabilidad a baja cota.
3. **Aviónica (`nivel_avionica`):** Alcance del radar de barrido electrónico (AESA), adquisición de blancos y contramedidas (ECM).
4. **Armas (`nivel_armas`):** Cadencia y letalidad de cañones rotativos y misiles guiados.

### Economía y Costos de Mejoras
El endpoint `PUT /api/planes/:id/system` valida el consumo de piezas y componentes avanzados según la matriz oficial `UPGRADE_COSTS`:

| Nivel Objetivo | Piezas Requeridas | Componentes Avanzados |
|:---:|:---:|:---:|
| **Nivel 1** | 100 | 0 |
| **Nivel 2** | 250 | 0 |
| **Nivel 3** | 500 | 10 |
| **Nivel 4** | 800 | 25 |
| **Nivel 5** | 1,200 | 50 |
| **Nivel 6** | 1,800 | 100 |
| **Nivel 7** | 2,500 | 200 |
| **Nivel 8** | 3,500 | 350 |

Todas las mejoras se auditan en la tabla `plane_upgrades` registrando el nivel anterior, nivel nuevo y recursos empleados.

### 5.1 Modelo de Datos del Sistema de Eventos (F2)

El rediseño del sistema de eventos (F2) introduce dos tablas unificadas que reemplazan la lógica dual legacy.

#### Tabla `events_master`

| Columna | Tipo | Propósito |
|---|---|---|
| `id` | UUID | PK generada automáticamente |
| `type` | TEXT | `SQUADRON` \| `BLACK_MARKET` \| `ACE_CHALLENGE` |
| `name` | TEXT | Nombre legible del evento |
| `start_date` | TIMESTAMPTZ | Inicio del evento |
| `end_date` | TIMESTAMPTZ | Fin del evento |
| `status` | TEXT | `SCHEDULED` \| `OPEN` \| `CLOSED` \| `CANCELLED` |
| `metadata` | JSONB | Datos específicos por tipo (targets, ISO week, etc.) |
| `legacy_event_id` | TEXT | ID del evento legacy (para migración) |
| `closed_at` | TIMESTAMPTZ | Timestamp de cierre |
| `closed_by` | UUID | FK a `users.id` (quién cerró) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |

**Índices:**
- `events_master_pkey` (PK `id`)
- `idx_events_master_single_open` (UNIQUE parcial `status = 'OPEN'`)
- `idx_events_master_type_status` (`type`, `status`)
- `idx_events_master_dates` (`start_date`, `end_date`)
- `idx_events_master_legacy_event_id` (UNIQUE parcial `legacy_event_id IS NOT NULL`)
- `idx_events_master_closed_at` (parcial `closed_at IS NOT NULL`)

#### Tabla `event_participations`

| Columna | Tipo | Propósito |
|---|---|---|
| `id` | UUID | PK generada automáticamente |
| `event_id` | UUID | FK a `events_master.id` |
| `user_id` | UUID | FK a `users.id` |
| `nick` | TEXT | Desnormalizado para consultas rápidas |
| `data` | JSONB | Datos específicos (tokens, días, misiones BM, etc.) |
| `computed_points` | INTEGER | Puntos calculados |
| `status` | TEXT | `PENDING` \| `VALIDATED` \| `REJECTED` |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Última actualización |
| `created_by` | UUID | FK a `users.id` (quién cargó) |

**Constraints:**
- `UNIQUE (event_id, user_id)` — 1 participación por piloto por evento.

**Integridad:** 0 huérfanos en `event_id`, 0 huérfanos en `user_id` (verificado 2026-09-18).

---

## 6. Estrategia de Seguridad C4ISR

1. **Anti-Sesión Fantasma (`token_version`):**
   - Cada usuario posee una versión de token en base de datos (`token_version`).
   - Al cambiar contraseña, restablecer credenciales o ejecutar un reseteo administrativo, `token_version` se incrementa.
   - Cualquier token emitido previamente es rechazado instantáneamente con código `TOKEN_VERSION_MISMATCH`.
2. **Restablecimiento Criptoseguro de 15 Minutos:**
   - Generación de tokens de un solo uso de alta entropía con `crypto.randomBytes(32)`.
   - Vigencia estricta de 15 minutos en la tabla `password_resets`.
   - Plantilla de correo HTML militar C4ISR despachada mediante Nodemailer.
3. **Generación Criptosegura de Claves Temporales:**
   - Implementada con `crypto.randomInt` nativo.
   - Estructura `MS-XXXX-XXXX` utilizando caracteres de alta visibilidad (excluyendo `0`, `O`, `1`, `I`).
   - Las contraseñas débiles predecibles (`123456`) están formalmente prohibidas.
   - Requiere cambio obligatorio de contraseña en el primer inicio (`must_change_password: true`).
4. **Cuotas Jerárquicas Militares (RBAC Enforcement):**
   - **`OWNER`:** Máximo **1**. Al promoverse un nuevo Comandante, el anterior desciende automáticamente a `ADMIN`.
   - **`ADMIN`:** Máximo **5** (actualizado desde 3 por decisión del OWNER, 2026-09-16). Se bloquean ascensos adicionales con error `ROLE_LIMIT_REACHED`.
   - **`VETERANO`:** Máximo **8**. Se bloquean ascensos adicionales con error `ROLE_LIMIT_REACHED`.
   - **Constante centralizada:** `ROLE_LIMITS` en `admin.controller.js` (HALL-054).
5. **Auditoría Dual & Trazabilidad:**
   - `security_events`: Registra autenticaciones, intentos fallidos, reseteos de credenciales con IP y User-Agent.
   - `audit_logs`: Registra modificaciones administrativas y cambios de rol.
6. **Mitigación de CSV Formula Injection:**
   - Función `sanitizeCSVField()` que neutraliza fórmulas maliciosas (`=`, `+`, `-`, `@`, `\t`, `%`) anteponiendo apóstrofes (`'`).

### 6.6 Flujo Completo de Recuperación de Contraseña por Email (Forgot Password)

El sistema implementa un flujo criptográficamente seguro para el restablecimiento de contraseñas vía correo electrónico, con vigencia estricta de 15 minutos.

**Pipeline completo:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│         FLUJO DE RECUPERACIÓN DE CONTRASEÑA POR EMAIL (v3.9.9)          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 1: Piloto solicita reset desde el login                            │
│                                                                         │
│   Frontend: Click en "¿Olvidaste tu clave?"                             │
│   Endpoint: POST /api/auth/forgot-password                              │
│   Datos: { email: "piloto@gmail.com" }                                  │
│                                                                         │
│   ✅ Backend busca usuario por email O email_institucional              │
│   ✅ Genera token: crypto.randomBytes(32).toString('hex')               │
│   ✅ Calcula expires_at = NOW() + 15 minutos                            │
│   ✅ INSERT en password_resets                                          │
│   ✅ Registra security_event: PASSWORD_RESET_REQUESTED                  │
│                                                                         │
│   Respuesta: { success: true, expiresInMinutes: 15 }                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 2: Backend envía correo vía SMTP Gmail                             │
│                                                                         │
│   Función: sendPasswordResetEmail() en src/utils/email.js               │
│   SMTP: smtp.gmail.com:587 (cuenta: paraguayffaa.metalstorm@gmail.com)  │
│                                                                         │
│   ✅ HTML militar C4ISR con colores institucionales                     │
│   ✅ Enlace: https://paraguay-ffaa-metalstorm.fly.dev/                  │
│              reset-password?token=<TOKEN>                               │
│   ✅ Asunto: 🔑 [PARAGUAY-FFAA] Restablecimiento de Credenciales        │
│                                                                         │
│   ⚠️ Si el email NO es real (ej: @ffaa.py), rebota.                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 3: Piloto click en el enlace del correo                            │
│                                                                         │
│   Redirige a: /reset-password?token=<TOKEN>                             │
│   Frontend: Terminal /reset-password.html                               │
│                                                                         │
│   ✅ Piloto ingresa nueva contraseña                                    │
│   ✅ Requisitos: mín 8 chars, 1 mayús, 1 minús, 1 número                │
│   ✅ Confirma la nueva contraseña                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 4: Backend valida token y actualiza clave                          │
│                                                                         │
│   Endpoint: POST /api/auth/reset-password                               │
│   Datos: { token, newPassword }                                         │
│                                                                         │
│   ✅ SELECT de password_resets WHERE token = ?                          │
│   ✅ Verifica: used = false AND expires_at > NOW()                      │
│   ✅ Valida complejidad de nueva contraseña                             │
│   ✅ bcrypt.hash(newPassword, 10)                                       │
│   ✅ UPDATE users SET:                                                  │
│        - password_hash = nuevo hash                                     │
│        - token_version = token_version + 1 (invalida sesiones)          │
│        - must_change_password = false                                   │
│        - updated_at = NOW()                                             │
│   ✅ UPDATE password_resets SET used = true                             │
│   ✅ Registra security_event: PASSWORD_RESET_SUCCESS                    │
│                                                                         │
│   Respuesta: { success: true }                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 5: Piloto login con nueva contraseña                               │
│                                                                         │
│   Endpoint: POST /api/auth/login                                        │
│   Datos: { email, password: "nueva_contraseña" }                        │
│                                                                         │
│   ✅ 200 OK con nuevo JWT (token_version actualizado)                   │
│   ✅ Sesiones previas quedan invalidadas (anti-sesión fantasma)         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Endpoints involucrados:**

| Endpoint | Método | Auth | Descripción |
|---|---|:---:|---|
| `/api/auth/forgot-password` | POST | Público | Genera token y envía correo |
| `/api/auth/reset-password` | POST | Público | Valida token y actualiza clave |

**Auditoría:** Todos los eventos se registran en `security_events` (`PASSWORD_RESET_REQUESTED`, `PASSWORD_RESET_SUCCESS`).

### 6.7 Mensaje Enriquecido al Bloquear Usuarios Inactivos

En la versión v4.0.0, el middleware `requireAuth` (`src/middlewares/auth.js`) implementa un mensaje detallado y enriquecido cuando un piloto con `status = 'INACTIVE'` intenta acceder al sistema.

**Comportamiento:**
1. Detecta `status = INACTIVE` o `INACTIVO`.
2. Lee primero los campos propios de la tabla `users`: `inactive_reason`, `inactive_at` e `inactive_by`.
3. Si `inactive_by` está poblado, consulta el `nick` del comandante en `users`.
4. Si faltan datos (pilotos inactivados antes de la v4.0.0), realiza un fallback consultando `audit_logs` para buscar la última acción `USER_DEACTIVATED`, `USER_INACTIVATED` o `USER_STATUS_CHANGE` sobre ese usuario, extrayendo `actor_nick` y fecha.
5. Construye un mensaje enriquecido con la información del comandante, fecha y motivo reglamentario.

**Ejemplo de respuesta (403 Forbidden):**

```json
{
  "error": "⚠️ ACCESO DENEGADO: Su cuenta ha sido inactivada por el Comandante PJPIROVANI el 16/09/2026. Motivo: Inactividad prolongada sin justificación. No tiene acceso a la plataforma del escuadrón. Comuníquese con el Comando Central para más información.",
  "code": "USER_INACTIVE",
  "details": {
    "inactive_by": "el Comandante PJPIROVANI",
    "inactive_at": "2026-09-16T02:00:00.000Z",
    "inactive_reason": "Inactividad prolongada: más de 60 días sin conexión al simulador.",
    "contact": "comando.central@ffaa.py"
  }
}
```

**Nota:** Si no existe registro en `audit_logs` ni en `users`, el mensaje dice por omisión "el Comando Central".

### 6.8 Limitación Crítica del Reset por Email

**⚠️ Advertencia operativa importante:**

El flujo de recuperación de contraseña por email (`/forgot-password`) **solo funciona para pilotos con Gmail real vinculado** (`email = @gmail.com` + `google_linked = true`).

**Estado actual (2026-09-15):**
- Solo `PJPIROVANI` (OWNER) cumple esta condición (~2% del escuadrón).
- El 98% restante tiene emails `@ffaa.py` ficticios que rebotan (el dominio no existe en internet).
- Los correos enviados a `@ffaa.py` son rechazados por Google con error `DNS Error: Domain name not found`.

**Método principal de recuperación:** Reset administrativo desde el Panel Admin (`POST /api/admin/users/:userId/reset-password`), que genera una clave temporal `MS-XXXX-XXXX` y la entrega por canal seguro (WhatsApp/Discord).

**Plan a futuro:** Campaña de vinculación de Gmail para todos los pilotos.

### 6.9 Sistema Táctico de Gestión de Pilotos Inactivos (v4.0.0)

A partir de la versión v4.0.0 se formaliza el subsistema de gestión integral de bajas y reactivaciones del personal militar:

1. **Persistencia Estructural (`users`):**
   - `inactive_reason` (`TEXT`): Motivo reglamentario documentado de la baja (10-500 caracteres).
   - `inactive_by` (`UUID` FK): Oficial de comando que ordenó o procesó la inactivación.
   - `inactive_at` (`TIMESTAMPTZ`): Fecha y hora exacta de efectividad de la baja militar.
   - Al reactivar a un piloto (`status = 'ACTIVE'`), las tres columnas se limpian automáticamente a `NULL`.
2. **Endpoints Administrativos:**
   - `PUT/PATCH /api/admin/users/:id/status`: Valida motivo obligatorio en inactivaciones, jerarquía RBAC y protección de OWNER.
   - `GET /api/admin/users/inactive`: Retorna nómina exclusiva de combatientes inactivos resolviendo en batch los nicks de los oficiales ejecutores (`inactive_by_nick`).
   - `PATCH /api/admin/users/:id/inactive-reason`: Permite regularizar motivos de baja en combatientes inactivos sin alterar su estado operacional.
3. **Control de Jerarquía Militar:**
   - El rango `OWNER` es intocable (no puede ser inactivado por nadie, ni siquiera por sí mismo).
   - Los rangos `ADMIN` solo pueden inactivar a `MIEMBRO` y `VETERANO`. Cualquier intento sobre `ADMIN` u `OWNER` es repelido con `HIERARCHY_FORBIDDEN`.
4. **Capa Frontend Táctica:**
   - Pestañas con contadores en vivo: `🟢 Activos (N)`, `🔴 Inactivos (N)`, `📋 Todos (N)`.
   - Modales operacionales con selectores de motivos reglamentarios predefinidos (inasistencia, bajo rendimiento, baja voluntaria, sanción) y campo de texto libre con contador de caracteres (mínimo 10).
   - Trazabilidad visual directa en la tabla de inactivos con botones para regularizar motivos pendientes.

---

## 7. Integración con la Wiki de Metalstorm

### 7.1 Fuente de Datos
- **URL:** https://metalstorm.wiki.gg/wiki/Aircraft
- **Método:** Script de extracción en consola del navegador (JS vanilla) + consolidación con Node.js.
- **Fecha de extracción:** 2026-09-12 (Traducción DeepL consolidada 2026-09-15)
- **Frecuencia:** Manual, bajo demanda (cuando la Wiki se actualiza).

### 7.2 Volumen de Datos

| Recurso | Cantidad |
|---------|----------|
| Aviones | 44 |
| Paints | 310+ |
| Canopies | 176 (44 × 4) |
| Historias | 41 (3 sin trivia: KF-21, A-6, A-10) |
| Recomendaciones | 44 |
| Loadouts | 44 |
| Descripciones | 44 |

### 7.3 Pipeline de Extracción e Importación

```text
[Wiki metalstorm.wiki.gg]
        ↓ Script de consola
[all_aircraft_wiki_data_v2_FINAL.json]
        ↓ Script Node.js (import-wiki-data.cjs)
[Supabase plane_models]
        ↓ getPlaneDetails()
[Frontend modal Stats]
```

### 7.4 Columnas de Wiki e i18n en plane_models

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `descripcion` | TEXT | Descripción in-game del avión (EN) |
| `descripcion_es` | TEXT | Descripción in-game traducida (ES) |
| `historia` | TEXT | Trivia multi-párrafo (EN) |
| `historia_es` | TEXT | Trivia histórica multi-párrafo traducida (ES) |
| `recomendaciones` | JSONB | Objeto con keys: Trait Tips, Ability Tips, Passive Tips (EN) |
| `recomendaciones_es` | JSONB | Objeto de tips tácticos traducidos (ES) |
| `loadout_wiki` | JSONB | Objeto con canones y misiles detallados |
| `paints` | JSONB | Array de { Name, Image, Rarity, Decal Support, Unlock requirement } |
| `canopies` | JSONB | Array de { Name, Image, Rarity, Unlock Level, Gold Tier Unlock } |
| `general_info_wiki` | JSONB | General info de la Wiki (role, hangar level, etc.) |
| `wiki_url` | TEXT | URL de la página del avión en la Wiki |
| `wiki_extracted_at` | TIMESTAMPTZ | Timestamp de la extracción |

### 7.5 Frontend — Modal Stats
El modal `#aircraftDeepModal` usa un grid responsive de cards con
`grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`.

**Distribución de spans:**
- **span-2:** Stats, Armamento, Sistemas, Paints, Canopies, Recomendaciones.
- **span-3:** Historia.
- **span-1:** Habilidades (Especial, Pasiva), Recomendación Táctica, Mods, Traits.

**Media queries:**
- **>1000px:** 3-4 cards por fila (spans activos).
- **700-1000px:** 2 cards por fila (spans ignorados).
- **<700px:** 1 columna (mobile).

### 7.7 Mods Oficiales de Aircraft Mods

- **URL:** https://metalstorm.wiki.gg/wiki/Aircraft_Mods
- **Datos extraídos:** 10 mods con 5 niveles cada uno (50 configuraciones).
- **Fuente:** Wiki oficial de MetalStorm (Creative Commons).
- **Integración:** Los datos se almacenan en dos tablas:
  - `plane_mods`: Catálogo maestro (10 filas) — nombre ES/EN, tipo, descripción, costos de mejora, image_url Cloudinary.
  - `mod_effects`: Efectos numéricos por nivel (50 filas).
- **Fallback en memoria:** `src/utils/modEffects.js` → `getFallbackModEffects()` contiene los 10 mods oficiales en caso de caída de Supabase.
- **Tipos oficiales (5):** Agility, Defense, Engine, Flare, Weapon (1 mod de cada tipo por avión).
- **Restricción de equipamiento:** Avión nivel 16 (primer mod) y nivel 20 (segundo mod).
- **Costos de mejora oficiales:**

| Nivel | Mod Tokens | Mod Materials |
|:---:|:---:|:---:|
| 1 | 1 | 50 |
| 2 | 2 | 80 |
| 3 | 3 | 125 |
| 4 | 4 | 200 |
| 5 | 5 | 325 |

- **Iconos:** Servidos desde Cloudinary con transformación `w_256,h_256,c_fill,f_webp,q_auto`.

### 7.8 Estado de Datos y Limitaciones
- **Frecuencia:** La Wiki se sincroniza bajo demanda. Los datos quedan estables hasta la próxima extracción.
- **Trivia faltante:** 3 aviones no poseen sección de trivia en la Wiki oficial (KF-21 Boramae, A-6 Intruder, A-10 Thunderbolt II).
- **Cobertura de Traducción:** 100% de los 44 cazas disponen de traducción al español con fallback automático al inglés si alguna clave no está presente.

---

## 8. Arquitectura del Hangar Rediseñado & Motor i18n (v3.9.9)

### 8.1 Arquitectura de Dos Vistas del Hangar (`js/views.js`)

Para optimizar la experiencia operativa de los pilotos en desktop y mobile, el Hangar Militar implementa un flujo desacoplado en dos capas:

```text
       ┌────────────────────────────────────────────────────────┐
       │                   VISTA 1: GRID TÁCTICO                 │
       │  - Tarjetas interactivas de aeronaves en grid CSS      │
       │  - overrideCarouselCardClick() intercepta selección    │
       │  - Indicador de nivel, rol, silueta y acción directa   │
       └───────────────────────────┬────────────────────────────┘
                                   │ Click en Caza
                                   ▼ openAircraftDetailView(planeId)
       ┌────────────────────────────────────────────────────────┐
       │              VISTA 2: PANTALLA DEDICADA                │
       │  - Modo .aircraft-detail-mode en contenedor principal  │
       │  - Botón Sticky "← VOLVER AL HANGAR"                   │
       │  - Telemetría profunda de combate y armamento wiki     │
       │  - Botones "IR A EDICIÓN DE [SECCIÓN]" ──► Upgrades 2.0│
       │  - Habilidades especiales y pasivas con imágenes       │
       │  - Motor i18n con DeepL y fallback a inglés            │
       └────────────────────────────────────────────────────────┘
```

1. **Vista 1 — Grid Táctico de Tarjetas (`overrideCarouselCardClick`):**
   - Transforma el flujo secuencial en una cuadrícula táctica orientada al combate.
   - Cada tarjeta actúa como selector directo evitando desplazamientos forzados.
2. **Vista 2 — Pantalla Dedicada (`openAircraftDetailView`):**
   - Reutiliza y amplía el modal profundo dotándolo de un contenedor a pantalla completa.
   - Inyecta el botón de retroceso (`← VOLVER AL HANGAR`) que remueve `.aircraft-detail-mode` y restaura el scroll y estado del catálogo sin re-renderizar la vista.
   - Vincula cada subsistema mecánico (Fuselaje, Motor, Aviónica, Armas) mediante botones de enlace directo a la edición en Upgrades 2.0.

### 8.2 Motor de Traducción Integral (i18n)

1. **Pipeline en Base de Datos:**
   - La tabla `plane_models` almacena en paralelo el texto original en inglés y su versión traducida al español rioplatense táctico: `descripcion` / `descripcion_es`, `historia` / `historia_es`, `recomendaciones` / `recomendaciones_es`.
2. **Lógica de Fallback Reactivo:**
   ```javascript
   const historia = plane.historia_es || plane.historia || 'Sin información histórica.';
   const descripcion = plane.descripcion_es || plane.descripcion || '';
   const recomendaciones = plane.recomendaciones_es || plane.recomendaciones || {};
   ```
3. **Diccionario de Traits Oficiales (`TRAITS_ES`):**
   - Mapeo determinístico de los 13 traits de combate:
     - `Armor Plating` $\to$ **Blindaje Reforzado**
     - `Cool Engines` $\to$ **Motores Fríos**
     - `Cruising Altitude` $\to$ **Altitud de Crucero**
     - `Delta Wing` $\to$ **Ala Delta**
     - `Expert Cannons` $\to$ **Cañones Expertos**
     - `Full Authority` $\to$ **Autoridad Total**
     - `Look And Shoot` $\to$ **Dispara y Olvida**
     - `Loyal Wingman` $\to$ **Ala Leal**
     - `Stealth` $\to$ **Sigilo**
     - `Swing Wing` $\to$ **Ala Variable**
     - `Thrust Reverser` $\to$ **Inversor de Empuje**
     - `Unstable Cannons` $\to$ **Cañones Inestables**
     - `Unstable Engines` $\to$ **Motores Inestables**
   - Resuelto mediante la función `translateTrait(trait)` en `js/views.js`.

---

*Versión: v4.3.1 · Actualizado: 21 Septiembre 2026*


