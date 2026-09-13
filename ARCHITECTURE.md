# 🏛️ Arquitectura del Sistema - PARAGUAY-FFAA | METALSTORM

> **Especificación Técnica de Arquitectura de Software, Seguridad C4ISR, Modelado de Datos, Resiliencia y Flujos Operativos (Versión v3.9.0).**

---

## 1. Visión General de la Arquitectura

El sistema táctico **PARAGUAY-FFAA | METALSTORM** implementa un modelo de arquitectura **Cliente-Servidor Full-Stack desacoplado y orientado a servicios RESTful**, optimizado para el entorno militar del escuadrón `[PRY]`.

La capa de presentación opera como una Single Page Application (SPA) táctica modular y ligera sin frameworks pesados, con soporte PWA offline-first, pantallas especializadas de vinculación (`/link-account`) y restablecimiento (`/reset-password`). El backend está construido sobre **Express.js v5.2.1** ejecutándose en un contenedor optimizado **Node.js 22 Alpine**, respaldado por **Supabase (PostgreSQL Cloud)**, soporte de autenticación federada **Google OAuth 2.0 (Passport.js)** y un motor de resiliencia con degradación elegante (*in-memory fallback*).

```
                  ┌──────────────────────────────────────────────────────────┐
                  │              NAVEGADOR / PWA CLIENT (v3.5.0)             │
                  │  - Vanilla ES6+ SPA & Responsive Tactical Design         │
                  │  - Dynamic Component Loader (17+ Vistas & Modales)       │
                  │  - Service Worker Cache-First (sw.js)                    │
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
   │  ├── /api/planes (Hangar Militar - 23 Cazas, Starform Upgrades 2.0)         │
   │  ├── /api/admin (Gestión Miembros: avg_tokens, weeks_evaluated, perf_status)│
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
  - `planes-view.html`: Hangar de aeronaves con soporte para los 23 cazas de combate y Upgrades 2.0.
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
  - **Integración Wiki (Fase 3C):** El endpoint `/api/planes/:id/details` devuelve 8 campos extraídos de la Wiki (`descripcion`, `historia`, `recomendaciones`, `loadout_wiki`, `paints`, `canopies`, `general_info_wiki`, `wiki_url`).
- **`/src/middlewares/`:**
  - `auth.js`: Validación estricta de firma JWT y comparación de `token_version` con la base de datos para prevenir sesiones fantasma.
  - `requireRole`: Validador de rangos (`OWNER`, `ADMIN`, `VETERANO`, `MIEMBRO`).
  - `errorHandler.js`: Captura centralizada de excepciones que asegura respuestas estructuradas en JSON.

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

## 5. Starform Upgrades 2.0 & Hangar Militar (Flota de 23 Cazas)

El sistema soporta la gestión completa de la flota militar compuesta por **23 modelos de cazas** (F-22 Raptor, Su-57 Felon, F-35 Lightning II, Eurofighter Typhoon, Dassault Rafale, JAS 39 Gripen, etc.) junto con la actualización técnica de subsistemas mecánicos y de combate:

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
   - **`ADMIN`:** Máximo **3**. Se bloquean ascensos adicionales con error `ROLE_LIMIT_REACHED`.
   - **`VETERANO`:** Máximo **8**. Se bloquean ascensos adicionales con error `ROLE_LIMIT_REACHED`.
5. **Auditoría Dual & Trazabilidad:**
   - `security_events`: Registra autenticaciones, intentos fallidos, reseteos de credenciales con IP y User-Agent.
   - `audit_logs`: Registra modificaciones administrativas y cambios de rol.
6. **Mitigación de CSV Formula Injection:**
   - Función `sanitizeCSVField()` que neutraliza fórmulas maliciosas (`=`, `+`, `-`, `@`, `\t`, `%`) anteponiendo apóstrofes (`'`).

---

## 7. Integración con la Wiki de Metalstorm

### 7.1 Fuente de Datos
- **URL:** https://metalstorm.wiki.gg/wiki/Aircraft
- **Método:** Script de extracción en consola del navegador (JS vanilla) + consolidación con Node.js.
- **Fecha de extracción:** 2026-09-12
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

### 7.4 Columnas Nuevas en plane_models

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `descripcion` | TEXT | Descripción in-game del avión |
| `historia` | TEXT | Trivia multi-párrafo (con \n\n entre párrafos) |
| `recomendaciones` | JSONB | Objeto con keys: Trait Tips, Ability Tips, Passive Tips |
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

### 7.8 Limitaciones Conocidas
- **Idioma:** Los datos están en inglés (idioma original de la Wiki). La traducción al español está planificada como Fase 3D.
- **Frecuencia:** La Wiki se actualiza manualmente. Los datos quedan desactualizados hasta la próxima extracción.
- **Trivia faltante:** 3 aviones no tienen sección de trivia en la Wiki (KF-21 Boramae, A-6 Intruder, A-10 Thunderbolt).


