# 📝 Registro de Versiones y Cambios (Changelog) - PARAGUAY-FFAA | METALSTORM

Todas las modificaciones notables, correcciones de errores, mejoras de seguridad y despliegues del sistema táctico **PARAGUAY-FFAA | METALSTORM** se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## 📌 [3.4.0] - 2026-09-08

### 🚀 Acceso con Google OAuth 2.0 Restringido (C4ISR Squadron Whitelist)
- **Estrategia Google OAuth Stateless:** Integración de `passport` y `passport-google-oauth20` en `src/config/passport.js` sin persistencia de sesión por cookies (`session: false`), adaptado al estándar RESTful JWT de la plataforma.
- **Validación Restringida a Usuarios Registrados:**
  - Solo los correos electrónicos previamente registrados en la tabla `users` pueden acceder.
  - Si el correo de Google no existe en la base de datos, se rechaza de inmediato con el error: *"❌ Acceso denegado. Tu correo no está registrado en el escuadrón. Contacta a un administrador."* y se registra el evento `LOGIN_GOOGLE_DENIED_NOT_FOUND` en `security_events`.
  - Si el usuario existe pero su estado es inactivo (`status: 'INACTIVE'` o `is_active: false`), se bloquea con el error: *"⚠️ Cuenta desactivada. Contacta a tu oficial de operaciones."* y se registra `LOGIN_GOOGLE_DENIED_INACTIVE`.
- **Nuevos Endpoints de Autenticación:**
  - `GET /api/auth/google`: Inicia el flujo de autorización ante Google solicitando alcances de `profile` y `email`.
  - `GET /api/auth/google/callback`: Recibe el código de autorización, valida el usuario en Supabase, emite el token JWT con su `token_version` y despacha el payload vía `postMessage` (o redirección en ventanas completas).
- **Interfaz Gráfica de Inicio Táctico:** Nuevo botón oficial *"Iniciar Sesión con Google"* con diseño táctico militar integrado en `index.html` y gestión emergente / redirect en `js/auth.js`.

### 🔑 Reestablecimiento Criptográfico de Contraseña por Correo Electrónico
- **Tokens Criptoseguros de Corta Duración:** Los enlaces de recuperación se generan con `crypto.randomBytes(32).toString('hex')` y poseen una ventana de vigencia estricta de **15 minutos**.
- **Almacén de Tokens `password_resets`:** Nueva tabla en PostgreSQL (`sql/updates_v3.4.0.sql`) con control de unicidad, expiración (`expires_at`), consumo (`used`), IP y User-Agent para prevenir ataques de reutilización.
- **Invalidación Total de Sesiones Previas:** Al completar el restablecimiento exitoso de la clave, el sistema incrementa automáticamente el `token_version` del usuario en `users`, forzando el cierre de sesión en todos los demás dispositivos y terminales activos.
- **Servicio de Envío Nodemailer:** Utilidad `src/utils/email.js` para despacho de correos en formato HTML táctico militar y texto plano respaldado por las credenciales `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` y `EMAIL_SECURE`.
- **Nueva Interfaz Web `reset-password.html`:** Página dedicada con diseño cockpit, telemetría militar, validación en tiempo real de longitud mínima (8 caracteres), confirmación de clave y consumo seguro del token.
- **Nuevos Endpoints:**
  - `POST /api/auth/forgot-password`: Genera el token de restablecimiento, lo persiste en `password_resets` y despacha el correo electrónico al combatiente.
  - `POST /api/auth/reset-password`: Valida el token, comprueba la vigencia y no reutilización, cifra la nueva clave con `bcrypt` (factor 10) e incrementa el `token_version`.

### ⚡ Infraestructura & PWA
- **Service Worker v3.4.0:** Actualizado `CACHE_NAME` a `PARAGUAY-FFAA-METALSTORM-v3.4.0` en `sw.js` incorporando precarga de `/reset-password.html`.
- **Actualización de Versión:** `package.json` actualizado a la versión `3.4.0`.
- **Auditoría de Seguridad:** Nuevos eventos registrados en `security_events`: `LOGIN_GOOGLE_SUCCESS`, `LOGIN_GOOGLE_DENIED_NOT_FOUND`, `LOGIN_GOOGLE_DENIED_INACTIVE`, `PASSWORD_RESET_REQUESTED` y `PASSWORD_RESET_SUCCESS`.

---

## 📌 [3.3.2] - 2026-09-07

### 🛡️ Seguridad & Anti-Sesión Fantasma (C4ISR Security Update)
- **Invalidación Criptográfica con `token_version`:** Implementada invalidación instantánea de tokens JWT en el middleware `requireAuth`. Cuando un piloto cambia su clave o un administrador ejecuta un reset, se incrementa `token_version`, invalidando de inmediato cualquier sesión activa previa con error `TOKEN_VERSION_MISMATCH`.
- **Generador Criptoseguro de Claves Temporales:** Nueva función `generateTemporaryPassword()` en `src/utils/security.js` con entropía militar mediante `crypto.randomInt()`. Genera códigos `MS-XXXX-XXXX` excluyendo caracteres ambiguos (`I`, `O`, `0`, `1`) y bloqueando explícitamente secuencias inseguras como `123456`.
- **Auditoría de Reseteo Administrativo:** El endpoint `POST /api/admin/users/:userId/reset-password` ahora registra en `security_events` quién ejecutó el reseteo, su rol, dirección IP y huella digital (User-Agent). La clave generada se entrega en el payload una sola vez para canal seguro (WhatsApp/Discord).
- **Longitud Mínima de Contraseña:** Elevado el estándar mínimo de contraseñas de 6 a 8 caracteres en `auth.controller.js` y `schemas.js`.

### ⚡ Rendimiento & PWA
- **Service Worker v3.3.2:** Actualizado el nombre de caché a `PARAGUAY-FFAA-METALSTORM-v3.3.2` en `sw.js` con precarga completa de los nuevos modales tácticos (`aircraft-stats-modal.html`, `performance-export.html`).
- **Cache-Busting Táctico:** Añadidos identificadores de versión `v=3.3.0` a todas las hojas de estilo modulares en `index.html` para evitar inconsistencias en navegadores móviles.
- **Probe Ligera de Salud:** Nuevo endpoint `GET /health` de respuesta instantánea en texto plano (`200 OK`) diseñado específicamente para los health checks de Fly.io antes de cargar middlewares pesados.

---

## 📌 [3.3.0] - 2026-08-20

### 🚀 Novedades Operativas
- **Centro de Exportación de Rendimientos:** Nuevo componente `performance-export.html` montado en el router dinámico para generar reportes analíticos de escuadrón.
- **Sanitización Contra CSV Injection:** Función `buildSanitizedCSV()` y `sanitizeCSVField()` en `src/utils/csv.js` que neutraliza fórmulas maliciosas (`=`, `+`, `-`, `@`, `\t`, `%`) anteponiendo apóstrofes seguros.
- **Rutas de Presencia de Pilotos:** Nuevos endpoints `/api/presence/online`, `/api/presence/offline` y `/api/presence/active` para monitoreo de escuadrilla activa en tiempo real.

### 🔧 Correcciones
- Corregida la respuesta 404 en la API: Ahora garantiza un payload JSON estructurado (`code: API_ENDPOINT_NOT_FOUND`) sin filtrar jamás páginas HTML de la SPA en rutas `/api/*`.

---

## 📌 [3.2.0] - 2026-06-15 (Starform Upgrades 2.0 Update)

### ✈️ Hangar Militar & Upgrades 2.0
- **Actualización MetalStorm Upgrades 2.0:** Integración de los 4 subsistemas de mejora mecánica por aeronave:
  - **Fuselaje:** Integridad estructural y blindaje (Niveles 0 a 8).
  - **Motor:** Potencia, velocidad de postcombustión y empuje vectorial (Niveles 0 a 8).
  - **Aviónica:** Radar AESA, contramedidas electrónicas ECM y enlace de datos (Niveles 0 a 8).
  - **Armas:** Potencia de fuego de cañón rotativo y misiles aire-aire (Niveles 0 a 8).
- **Economía de Recursos Militares:** Control en base de datos (`sql/upgrades_2_0.sql`) de piezas estándar (`recursos_piezas`) y componentes avanzados (`recursos_avanzadas`), con matriz matemática de costos por nivel (`UPGRADE_COSTS`).
- **Auditoría de Mejoras:** Creación de la tabla `plane_upgrades` para trazabilidad de cada nivel adquirido por cada piloto.
- **Respaldo de Datos Manual (Owner):** Implementado endpoint `POST /api/owner/backup/run` con volcado estructurado de tablas `users`, `performances` y `events`.

---

## 📌 [3.1.0] - 2026-04-10

### 🛡️ Cuotas Militares & RBAC Estricto
- **Validación de Límites Jerárquicos en `admin.controller.js`:**
  - Máximo 1 `OWNER` (degradación automática del comandante previo a `ADMIN` si se transfiere el mando).
  - Máximo 3 `ADMIN` (retorno HTTP 400 `ROLE_LIMIT_REACHED` al intentar exceder el cupo).
  - Máximo 8 `VETERANO` (retorno HTTP 400 `ROLE_LIMIT_REACHED` al intentar exceder el cupo).
- **Protección del Comandante:** Prohibida explícitamente la desactivación de cuentas con rol `OWNER` y blindaje contra modificaciones no autorizadas por administradores estándar.

---

## 📌 [3.0.0] - 2026-02-01

### 🏗️ Arquitectura Modular
- Migración integral a **Node.js ES Modules (`import/export`)**.
- Segregación modular de controladores y rutas (`admin`, `auth`, `dashboard`, `events`, `normativas`, `owner`, `performances`, `planes`, `profile`, `settings`).
- Integración de Supabase PostgreSQL con fallback in-memory ante desconexión.
- Rate limiters dedicados para autenticación, API global y operaciones masivas.
