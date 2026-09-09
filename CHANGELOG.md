# 📝 Registro de Versiones y Cambios (Changelog) - PARAGUAY-FFAA | METALSTORM

Todas las modificaciones notables, correcciones de errores, mejoras de seguridad y despliegues del sistema táctico **PARAGUAY-FFAA | METALSTORM** se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## 📌 [3.5.0] - 2026-09-08

### 🚀 Autenticación Militar Dual & Vinculación de Cuentas (v3.5.0)
- **Login Dual (Institucional + Gmail):** El login tradicional ahora permite iniciar sesión usando el correo institucional (`@ffaa.py`) o el Gmail real vinculado, contrastando contra `email` y `email_institucional`.
- **Autenticación Federada Google OAuth 2.0 (Passport.js):** Rutas `/api/auth/google`, `/api/auth/google/callback` y `/api/auth/google/status` con soporte para selección de cuenta Google e intercambio de credenciales.
- **Flujo de Vinculación de Cuentas Google (`/link-account`):** Cuando un piloto autentica con una cuenta de Google no registrada previamente, es redirigido automáticamente a la terminal de vinculación (`/link-account?email=...`) para asociar su indicativo de combate (Callsign) y contraseña existente con su cuenta de Google de forma permanente (`google_linked: true`).
- **Restablecimiento Criptográfico de Contraseñas (Tokens de 15 Minutos):** Flujo criptoseguro con tokens de un solo uso generados con `crypto.randomBytes(32)` y expiración estricta a los 15 minutos en la tabla `password_resets`.
- **Plantilla de Correo C4ISR Militar:** Módulo de correo táctico (#0038A8, #D52B1E, #0B132B) mediante `nodemailer` (`src/utils/email.js`) y función exportada `generateResetEmailHTML()`.
- **Endpoints Tácticos de Autenticación:**
  - `POST /api/auth/link-account`: Vincula un Gmail real con el combatiente tras validar indicativo y clave actual.
  - `POST /api/auth/forgot-password`: Genera token de 15 min y despacha correo militar seguro (búsqueda dual en correo institucional y Gmail).
  - `POST /api/auth/reset-password`: Valida token, vigencia, actualiza contraseña con bcrypt e incrementa `token_version` para invalidar sesiones activas.
  - `GET /api/auth/google/status`: Provee estado de disponibilidad del servicio OAuth y estado de vinculación de correo.

### 🎖️ Selector Táctico de Pilotos para ADMIN / OWNER (Modo Oficial)
- **Endpoint Táctico `/api/performances/pilots`:** Endpoint con control de acceso por rangos (RBAC):
  - Para oficiales `ADMIN` y `OWNER`: Devuelve la lista completa de combatientes activos (`status = 'ACTIVE'`) ordenados alfabéticamente por indicativo (`nick`), junto con sus métricas acumuladas.
  - Para combatientes regulares `MIEMBRO` y `VETERANO`: Devuelve exclusivamente su propio registro individual protegiendo la privacidad y evitando cargas delegadas no autorizadas.
- **Selector en Interfaz `#performanceTarget`:** Integración en `components/performance-form.html` permitiendo a los oficiales registrar tokens en nombre de camaradas ausentes.
- **Banner de Alerta C4ISR:** Despliegue de advertencia en tiempo real en la interfaz: `⚠️ Modo Oficial Activo: Estás cargando datos para [CALLSIGN]`, con registro de auditoría de la operación.

### 📊 Panel de Administración Militar & Métricas C4ISR
- **Cálculo en Tiempo Real de Rendimiento:** Enriquecimiento del controlador `admin.controller.js` (`getUsers` y `getMembers`) con cálculo dinámico de:
  - `avg_tokens`: Promedio de tokens acumulado a través de todas las semanas operativas.
  - `weeks_evaluated`: Conteo total de eventos en los que el combatiente ha reportado tokens.
  - `perf_status`: Estado oficial del semáforo militar (`VERDE`, `NARANJA`, `ROJO`, `NEGRO`, `PENDIENTE`) calculado según las directivas del Artículo 26.
- **Filtros Dinámicos en Panel de Oficiales:** Selector y filtros por jerarquía de rango y estado del semáforo en `components/admin-panel.html`.

### ✈️ Hangar Militar & Flota de Combate
- **Catálogo de 23 Aeronaves Operativas:** Catálogo completo en base de datos y memoria que abarca cazas de 3ª, 4ª y 5ª generación (F-22 Raptor, Su-57 Felon, F-35 Lightning II, Eurofighter Typhoon, Rafale, JAS 39 Gripen, J-20, Su-35, A-10C Thunderbolt II, etc.).
- **Sistemas Mecánicos Starform Upgrades 2.0:** Gestión de Fuselaje, Motor, Aviónica y Armas en niveles de 0 a 8 con validación matemática de piezas y componentes avanzados.

### 🔧 Correcciones de Frontend & Estabilidad
- **Corrección de `squadStatus` en Expediente Militar (`js/profile.js`):** Solucionado error `ReferenceError: squadStatus is not defined` en `loadPersonalProfile` al inicializar la variable con `const squadStatus = (profile.status || currentUser.status || 'ACTIVE').toUpperCase();`.
- **Service Worker v3.5.0:** Actualización de caché y precarga de terminales tácticas (`link-account.html`, `reset-password.html`, `components/forgot-password-modal.html`).

---

## 📌 [3.4.0] - 2026-09-08

### 🔑 Autenticación Militar Google OAuth 2.0
- **Botón Táctico en Modal de Login:** Integrado botón con el emblema de Google y estilos tácticos militares (`.btn-google`, `.auth-divider`) con retroalimentación visual al hacer clic.
- **Flujo de Autenticación con Passport.js:** Rutas `/api/auth/google`, `/api/auth/google/callback` y `/api/auth/google/status` con verificación estricta de cuentas activas registradas en la base de datos de escuadrón.
- **Auditoría de Acceso OAuth:** Registro en `security_events` de accesos concedidos (`LOGIN_SUCCESS_GOOGLE`) o denegados (`LOGIN_GOOGLE_DENIED_NOT_FOUND`, `LOGIN_GOOGLE_DENIED_INACTIVE`).
- **Manejo Dinámico de Callback en Frontend:** Función `handleOAuthCallback()` en `js/auth.js` que captura parámetros de autenticación, almacena tokens JWT en almacenamiento local y sanitiza la URL mediante `history.replaceState`.
- **Páginas Institucionales Estáticas:** Despliegue de Política de Privacidad (`/privacy.html`) y Términos de Servicio (`/terms.html`) para cumplimiento normativo de Google OAuth y Fly.io.

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
