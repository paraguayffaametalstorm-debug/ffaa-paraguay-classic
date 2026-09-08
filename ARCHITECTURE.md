# 🏛️ Arquitectura del Sistema - PARAGUAY-FFAA | METALSTORM

> **Especificación Técnica de Arquitectura de Software, Seguridad C4ISR, Modelado de Datos, Resiliencia y Flujos Operativos (Versión v3.4.0).**

---

## 1. Visión General de la Arquitectura

El sistema táctico **PARAGUAY-FFAA | METALSTORM** implementa un modelo de arquitectura **Cliente-Servidor Full-Stack desacoplado y orientado a servicios RESTful**, optimizado para el entorno militar del escuadrón `[PRY]`. 

La capa de presentación opera como una Single Page Application (SPA) táctica modular y ligera sin frameworks pesados, con soporte PWA offline-first. El backend está construido sobre **Express.js v5.2.1** ejecutándose en un contenedor optimizado **Node.js 22 Alpine**, respaldado por **Supabase (PostgreSQL Cloud)** y un motor de resiliencia con degradación elegante (*in-memory fallback*).

```
                  ┌────────────────────────────────────────┐
                  │    NAVEGADOR / PWA CLIENT (v3.4.0)     │
                  │  - Vanilla ES6+ SPA                    │
                  │  - Dynamic Component Loader            │
                  │  - Service Worker (Cache-First)        │
                  │  - Google OAuth Popup & Callback       │
                  │  - Reset Password Tactical View        │
                  │  - Design Tokens / Tactical CSS        │
                  └──────────────────┬─────────────────────┘
                                     │ HTTPS / WSS / JWT
                                     ▼
                  ┌────────────────────────────────────────┐
                  │       PROXY / REVERSE PROXY            │
                  │  - Fly.io Edge / São Paulo (gru)       │
                  │  - SSL Termination / Port 3000         │
                  └──────────────────┬─────────────────────┘
                                     │ HTTP Request
                                     ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                 NÚCLEO BACKEND (Node.js 22 / Express 5)                │
  │                                                                        │
  │  [Rate Limiters] ──► [Helmet / Security] ──► [Compression / JSON Parser]│
  │                                                                        │
  │  [Passport OAuth] ──► Google Strategy (Stateless, Whitelist Check)     │
  │                                                                        │
  │  [Rutas Modulares]                                                     │
  │  ├── /health & /api/health (Probes & Telemetry)                        │
  │  ├── /api/auth (Login, Google OAuth, Password Reset, token_version)    │
  │  ├── /api/dashboard & /api/events (C4ISR Telemetry)                    │
  │  ├── /api/performances (Tokens, Semáforo Militar, CSV Sanitizado)      │
  │  ├── /api/planes (Hangar, Starform Upgrades 2.0)                       │
  │  ├── /api/admin (Cuotas RBAC, Carga Masiva, Auditoría)                 │
  │  ├── /api/owner (Auditoría C4ISR, Backups, Purga)                      │
  │  └── /api/presence, /api/profile, /api/settings, /api/normativas       │
  │                                                                        │
  │  [Middlewares Centrales]                                               │
  │  ├── requireAuth (Bearer JWT + token_version validation)               │
  │  ├── requireRole (OWNER / ADMIN / VETERANO / MIEMBRO)                  │
  │  └── errorHandler (JSON Responses estructuradas)                       │
  └──────────────────┬─────────────────────────────────┬───────────────────┘
                     │                                 │
     Primary Storage │                                 │ Fallback Storage
                     ▼                                 ▼
       ┌────────────────────────────┐    ┌───────────────────────────┐
       │   SUPABASE POSTGRESQL      │    │    IN-MEMORY FALLBACK     │
       │ - Users & Roles (RBAC)     │    │ - Volatile State Store    │
       │ - Password Resets (15 min) │    │ - Resets Fallback Map     │
       │ - Performances & Events    │    │ - Default Datasets        │
       │ - Starform Upgrades 2.0    │    │ - Graceful Degradation    │
       │ - Audit Logs & Security    │    └───────────────────────────┘
       └────────────────────────────┘
```

---

## 2. Capas del Sistema

### 2.1 Capa de Presentación (Frontend SPA)
- **`index.html`:** Contenedor maestro con meta-tags PWA, enlaces a tipografía militar (`Rajdhani`, `Inter`, `JetBrains Mono`), contenedor de notificaciones toast, barra de navegación táctica y modales globales.
- **`/components/*.html`:** 17 vistas y modales inyectados dinámicamente según el estado del usuario (`dashboard.html`, `admin-panel.html`, `owner-panel.html`, `planes-view.html`, `performance-form.html`, `all-performances.html`, `performance-export.html`, etc.).
- **`/css/`:** Sistema de diseño militar modular:
  - `global.css`: Variables CSS de identidad nacional y militar (`--pry-red: #D52B1E`, `--pry-blue: #0038A8`, `--bg-dark`, `--text-main`).
  - `tactical-design.css`: Bordes biselados, tipografía Rajdhani, tarjetas de radar y acentos de combate.
  - `components.css`: Estilos para botones de acción rápida, badges de rango y tablas.
  - `views.css`: Moduladores de diseño específicos de cada vista.
- **`/js/`:** Lógica modular en JavaScript Vanilla (ES6+):
  - `auth.js`: Gestión de tokens JWT en `localStorage`, control de expiración y advertencias de sesión (`session-warning.html`).
  - `views.js`: Orquestador de vistas y enrutador dinámico en el cliente.
  - `api.js`: Cliente HTTP centralizado que inyecta automáticamente `Authorization: Bearer <token>`.
  - `performance.js`: Lógica de validación previa y cálculos interactivos del semáforo.
  - `profile.js`: Expediente militar y cambio de clave forzado/voluntario.
  - `tour.js`: Guía táctica interactiva para el primer ingreso de reclutas.

### 2.2 Capa de Servidor (Backend Express)
- **`server.js`:** Entrada principal. Configura:
  - **Rate Limiters:** `authLimiter` (30 req / 15m), `apiLimiter` (600 req / 15m), `bulkLimiter` (20 req / 15m).
  - **Seguridad:** `helmet()` adaptado para permitir renderizado en iframe y PWA.
  - **Compresión:** Gzip / Deflate vía `compression()`.
  - **CORS:** Orígenes controlados por lista blanca (`ALLOWED_ORIGINS` o `localhost, fly.dev`).
  - **Probe:** Endpoint `GET /health` de respuesta instantánea en texto plano para los probes de orquestación de contenedores.
- **`/src/routes/`:** Enrutadores modulares segregados por responsabilidad funcional.
- **`/src/middlewares/`:**
  - `auth.js`: Validación estricta de firma JWT y comparación de `token_version` con la base de datos para prevenir sesiones fantasma.
  - `requireRole`: Validador de rangos (`OWNER`, `ADMIN`, `VETERANO`, `MIEMBRO`).
  - `errorHandler.js`: Captura centralizada de excepciones que asegura respuestas estructuradas en JSON.

---

## 3. Modelo de Dominio y Flujo Operacional de Rendimiento

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

---

## 4. Starform Upgrades 2.0 (Hangar Militar)

El sistema soporta la actualización de subsistemas mecánicos y armamentísticos de combate aéreo introducidos en la versión 3.2.0:

### Subsistemas Mejorables (Niveles 0 a 8)
1. **Fuselaje (`nivel_fuselaje`):** Resistencia al daño, reducción de firma de radar e integridad física.
2. **Motor (`nivel_motor`):** Velocidad máxima, aceleración con posquemador y maniobrabilidad a baja cota.
3. **Aviónica (`nivel_avionica`):** Alcance del radar de barrido electrónico (AESA), adquisición de blancos y contramedidas (ECM).
4. **Armas (`nivel_armas`):** Cadencia y letalidad de cañones rotativos y misiles guiados.

### Economía y Costos de Mejoras
El endpoint `PUT /api/planes/:id/system` valida el consumo de piezas y componentes avanzados según la matriz de costos `UPGRADE_COSTS`:

| Nivel Objetivo | Piezas Requeridas | Componentes Avanzados |
|:---:|:---:|:---:|
| **Nivel 1** | 100 | 0 |
| **Nivel 2** | 250 | 5 |
| **Nivel 3** | 500 | 10 |
| **Nivel 4** | 1,000 | 25 |
| **Nivel 5** | 2,000 | 50 |
| **Nivel 6** | 4,000 | 100 |
| **Nivel 7** | 8,000 | 200 |
| **Nivel 8** | 15,000 | 500 |

Todas las mejoras se auditan en la tabla `plane_upgrades` registrando el nivel anterior, nivel nuevo y recursos empleados.

---

## 5. Estrategia de Seguridad C4ISR

1. **Anti-Sesión Fantasma (`token_version`):**
   - Cada usuario posee una versión de token en base de datos (`token_version`).
   - Al cambiar contraseña o ejecutar un reseteo administrativo, `token_version` se incrementa.
   - Cualquier token emitido previamente es rechazado instantáneamente con código `TOKEN_VERSION_MISMATCH`.
2. **Generación Criptosegura de Claves Temporales:**
   - Implementada con `crypto.randomInt` nativo.
   - Estructura `MS-XXXX-XXXX` utilizando caracteres de alta visibilidad (excluyendo `0`, `O`, `1`, `I`).
   - Las contraseñas temporales débiles predecibles (`123456`) están formalmente prohibidas.
   - Requiere cambio obligatorio de contraseña en el primer inicio (`must_change_password: true`).
3. **Cuotas Jerárquicas Militares (RBAC Enforcement):**
   - **`OWNER`:** Máximo **1**. Al promoverse un nuevo Comandante, el anterior desciende automáticamente a `ADMIN`.
   - **`ADMIN`:** Máximo **3**. Se bloquean ascensos adicionales con error `ROLE_LIMIT_REACHED`.
   - **`VETERANO`:** Máximo **8**. Se bloquean ascensos adicionales con error `ROLE_LIMIT_REACHED`.
4. **Auditoría Dual:**
   - `security_events`: Registra autenticaciones, intentos fallidos, reseteos de credenciales con IP y User-Agent.
   - `audit_logs`: Registra modificaciones administrativas y cambios de rol.
5. **Mitigación de CSV Formula Injection:**
   - Función `sanitizeCSVField()` que neutraliza fórmulas maliciosas (`=`, `+`, `-`, `@`, `\t`, `%`) anteponiendo apóstrofes (`'`).

---

## 6. Flujo de Autenticación con Google OAuth 2.0 (Restricción por Lista Blanca)

```
[Piloto / Navegador]              [Backend Express]               [Google OAuth]            [Supabase DB]
        │                                 │                              │                        │
        │─── 1. Click "Login Google" ────▶│                              │                        │
        │    (Abre popup /api/auth/google)│                              │                        │
        │                                 │─── 2. Redirección OAuth ────▶│                        │
        │                                 │    (scope: profile, email)   │                        │
        │                                 │                              │                        │
        │◀────── 3. Autenticación y Consentimiento en Google ───────────▶│                        │
        │                                 │                              │                        │
        │                                 │◀── 4. Callback con Code ─────│                        │
        │                                 │                              │                        │
        │                                 │─── 5. Consulta email en `users` ─────────────────────▶│
        │                                 │                                                       │
        │                                 │◀── 6. Retorna registro de usuario o vacío ────────────│
        │                                 │                                                       │
        │                                 │─── 7. Evalúa Estado:                                  │
        │                                 │    a) ¿No existe? ──▶ Log `LOGIN_GOOGLE_DENIED_NOT_FOUND`
        │                                 │                       Retorna HTML Error 403          │
        │                                 │    b) ¿Inactivo? ───▶ Log `LOGIN_GOOGLE_DENIED_INACTIVE`
        │                                 │                       Retorna HTML Error 403          │
        │                                 │    c) ¿Activo? ─────▶ Emite JWT con `token_version`   │
        │                                 │                       Log `LOGIN_GOOGLE_SUCCESS`      │
        │                                 │                       Envía `postMessage` al opener   │
        │◀── 8. Recibe Token o Error ─────│                                                       │
        │    (Cierra popup y actualiza UI)│                                                       │
```

---

## 7. Flujo C4ISR de Restablecimiento de Contraseñas por Correo

```
[Piloto / Terminal]               [Backend Express]              [Nodemailer SMTP]          [Supabase DB]
        │                                 │                              │                        │
        │─── 1. POST /forgot-password ───▶│                              │                        │
        │       { email }                 │─── 2. Verifica cuenta activa en `users` ─────────────▶│
        │                                 │◀── 3. Confirma usuario ───────────────────────────────│
        │                                 │                                                       │
        │                                 │─── 4. Genera Token Criptográfico (32 bytes)          │
        │                                 │    (Expira en 15 minutos)                             │
        │                                 │                                                       │
        │                                 │─── 5. Inserta en `password_resets` ──────────────────▶│
        │                                 │                                                       │
        │                                 │─── 6. Despacha correo táctico HTML ──────────────────▶│
        │                                 │                                                       │
        │◀── 7. Respuesta genérica 200 ───│ (Para evitar enumeración de cuentas)                  │
        │                                 │                                                       │
        │─── 8. Abre enlace en correo ───▶│ GET /reset-password?token=XXX                         │
        │    (Página reset-password.html) │                                                       │
        │                                 │                                                       │
        │─── 9. POST /reset-password ────▶│                                                       │
        │       { token, newPassword }    │─── 10. Valida token (no usado, no expirado) ─────────▶│
        │                                 │◀── 11. Token válido ──────────────────────────────────│
        │                                 │                                                       │
        │                                 │─── 12. Cifra clave (`bcrypt`) e incrementa `token_version`
        │                                 │    Marca token como `used = TRUE` ───────────────────▶│
        │                                 │    Log `PASSWORD_RESET_SUCCESS`                       │
        │                                 │                                                       │
        │◀── 13. Éxito: Clave actualizada │ (Sesiones previas invalidadas inmediatamente)          │
```

