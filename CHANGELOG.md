# 📝 Registro de Versiones y Cambios (Changelog) - PARAGUAY-FFAA | METALSTORM

Todas las modificaciones notables, correcciones de errores, mejoras de seguridad y despliegues del sistema táctico **PARAGUAY-FFAA | METALSTORM** se documentan en este archivo.

El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## 📌 [3.9.0] - 2026-09-12

### 🎨 Integración Completa con la Wiki de Metalstorm
- **Extracción de datos:** Script de consola ejecutado en https://metalstorm.wiki.gg/wiki/Aircraft que extrae información de los 44 aviones del juego.
- **Nuevas columnas en plane_models:** `descripcion`, `historia`, `recomendaciones` (JSONB), `loadout_wiki` (JSONB), `paints` (JSONB), `canopies` (JSONB), `general_info_wiki` (JSONB), `wiki_url`, `wiki_extracted_at`.
- **Datos cargados:** 310+ paints, 176 canopies, 41 historias, 44 recomendaciones, 44 loadouts.
- **Backend:** `getPlaneDetails` ahora devuelve los 8 campos nuevos al frontend.
- **Frontend — Modal Stats:**
  - Sección "Historia de la Aeronave" con párrafos completos.
  - Sección "Recomendaciones de Uso" con Trait Tips, Ability Tips y Passive Tips.
  - Sección "Paints" con galería visual de imágenes y raridades.
  - Sección "Canopies" con galería visual de imágenes y niveles.
  - `renderArmamentoEquipado` prioriza `plane.loadout_wiki` (stats detalladas de cada arma).

---

## 📌 [3.8.0] - 2026-09-12

### 🃏 Grid Responsive de Cards en el Modal Stats
- **Layout:** `.modal-body` ahora usa `display:grid` con `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`.
- **Cards flotantes:** cada `.deep-section` es una card visual con borde, fondo oscuro y hover dorado.
- **Clases de span:** `.span-2` y `.span-3` para cards anchas.
- **Responsive:** desktop (>1000px) 3-4 cards por fila; tablet (700-1000px) 2 cards; mobile (<700px) 1 columna.
- **Colapsables:** todas las cards se expanden/contraen sin perder su posición en el grid.
- **Paints y Canopies:** grid interno ajustado a `minmax(150px, 1fr)`.

---

## 📌 [3.7.5] - 2026-09-12

### 🎯 Rediseño y Ampliación del Modal de Stats
- **Modal `#aircraftDeepModal` rediseñado:** ancho 1400px, alto 92vh, header sticky, footer sticky, scroll interno optimizado.
- **Sección "Armamento Equipado":** con datos de `plane.sistemas` + `plane.loadout_wiki`.
- **Secciones colapsables:** con headers clickeables y chevron dinámico.
- **Fix de cálculo de nivel de armamento:** ahora lee `sistema.nivel` y `sistema.rutas` correctamente (antes mostraba Nv. 0/8 siempre).
- **Fix scroll doble:** `.modal-content` con `overflow:hidden`, `.modal-body` con `overflow-y:auto`.
- **Fix `min-height:0`:** en `.modal-body` para flex scroll.
- **Scrollbar dorada custom:** en `.modal-body`.

---

## 📌 [3.7.0] - 2026-09-08

### 🔥 Sistema Completo de Black Market (BM)
- **Controlador Maestro de Black Market (`src/controllers/bm.controller.js`):**
  - Gestión integral de eventos Black Market de 5 días de duración (miércoles a domingo) con sincronización dual Supabase / memoria.
  - 3 tipos de misiones diarias: **Dedicación** (roles específicos de aeronave), **Habilidad** (trofeos mínimos de combate de 100 a 800) y **Trabajo en equipo** (vuelo con 2 a 6 compañeros).
  - Sistema de puntuación táctica: 25 pts por misión cumplida más **bonus diario de +25 pts** al cumplir las 3 misiones del día (50 pts/día, máx 250 pts).
  - Cálculo de descuento progresivo: 1 punto = 0.2% de descuento, alcanzando hasta **50% de descuento** con 250 puntos.
  - Flujo de adquisición del caza en promoción con descuento militar integrado directamente al Hangar personal del piloto.
  - Auditoría C4ISR militar en `security_events` y `audit_logs` para activación de eventos, completado de misiones y adquisiciones.
- **Rutas de API RESTful (`src/routes/bm.routes.js`, `server.js`):**
  - 15 endpoints especializados bajo `/api/bm/*` para eventos, misiones, progreso individual, cotizaciones de descuento, adquisiciones, tabla de clasificación y estadísticas.
  - Validación estricta con Zod (`CreateBmEventSchema`, `UpdateBmEventSchema`, `CreateBmMissionSchema`, `UpdateBmMissionSchema`, `CompleteBmMissionSchema`).
- **Controlador Frontend y Cliente API (`js/bm.js`, `js/api.js`):**
  - Estado reactivo centralizado `bmState` con soporte offline, actualización en vivo y control de permisos por roles (`ADMIN`/`OWNER`).
  - Funciones de cliente API con cabeceras Bearer JWT (`apiGetBmActiveEvent`, `apiCompleteBmMission`, `apiPurchaseBmDiscount`, etc.).
- **Vistas y Componentes Tácticos (`components/bm-*.html`):**
  - `bm-missions.html`: Selector táctico de los 5 días de combate, misiones con badges de tipo e insignias de bonus diario.
  - `bm-progress.html`: Barra de progreso calibrada al 50%, KPI de puntos y misiones, y desglose día por día.
  - `bm-discount.html`: Ficha técnica de la aeronave en oferta (F-15EX Eagle II), desglose de precio base/ahorro/precio final y botón de adquisición.
  - `bm-leaderboard.html`: Podio Top 3 de combate, tabla clasificatoria con búsqueda en tiempo real y badges de estado.
  - `bm-panel.html`: Consola de mando oficial para crear y activar eventos, configurar misiones diarias y monitorear telemetría.
- **Navegación e Integración SPA (`index.html`, `components/header.html`, `components/dashboard.html`, `js/views.js`):**
  - Registro de vistas `bmMissionsView`, `bmProgressView`, `bmDiscountView`, `bmLeaderboardView` y `bmPanelView` en el enrutador SPA.
  - Acceso directo desde barra de navegación de escritorio, cajón lateral móvil y botón de acción rápida en el Cuadro de Mando Operacional.

---

## 📌 [3.6.0] - 2026-09-08

### ✈️ Sistema de Gestión de Catálogo de Aeronaves (CRUD ADMIN / OWNER)
- **Controlador Maestro de Catálogo (`src/controllers/plane-models.controller.js`):**
  - Implementación completa de CRUD sobre modelos de aeronaves militares con fallback en memoria `INITIAL_PLANE_MODELS` y sincronización Supabase (`plane_models`).
  - Lógica de desactivación suave (**Soft-Delete**) mediante `is_active: false` protegiendo el historial y los hangares existentes de los pilotos.
  - Endpoint de reactivación (`POST /api/plane-models/:id/restore`).
  - Registro forense en `audit_logs` para cada operación de creación, actualización, desactivación y reactivación.
- **Rutas y Seguridad RBAC (`src/routes/plane-models.routes.js`):**
  - Rutas protegidas mediante `requireAuth` y `requireRole('ADMIN', 'OWNER')`.
  - Validación de esquemas con Zod (`PlaneModelSchema`, `UpdatePlaneModelSchema`).
- **Vista de Administración Táctica (`components/admin-plane-models.html`):**
  - Panel visual de catálogo con métricas KPI (Total Modelos, Activos, Desactivados, Cazas Tier 4/5).
  - Búsqueda en tiempo real por texto, filtrado por Tier militar (1 al 5) y filtrado por estado operacional.
  - Tarjetas tácticas con visualización de Tier, velocidad, agilidad, blindaje, potencia de fuego, habilidades especial y pasiva, y estado operativo.
  - Modal táctico para registrar nuevos cazas y editar parámetros técnicos oficiales.
  - Modal de inspección de ficha técnica militar.
- **Cliente API Frontend (`js/api.js`):**
  - Funciones `apiGetPlaneModels`, `apiGetPlaneModelById`, `apiCreatePlaneModel`, `apiUpdatePlaneModel`, `apiDeletePlaneModel`, `apiRestorePlaneModel`.
- **Integración SPA (`js/views.js`, `index.html`, `components/header.html`):**
  - Registro de la vista `adminPlaneModels` en `VIEWS` y `VIEW_ALIASES`.
  - Botones de acceso rápido en Desktop Navigation Strip, Mobile Side Drawer, Panel de Administración y Centro de Control Owner.
  - Sincronización automática con el selector de aeronaves del hangar de pilotos (`loadPlaneModels()`).

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
