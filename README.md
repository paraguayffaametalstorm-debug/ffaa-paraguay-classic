# 🇵🇾 PARAGUAY-FFAA | METALSTORM

> **Sistema Táctico de Control Operacional, Auditoría C4ISR y Gestión de Rendimiento del Escuadrón PARAGUAY FFAA `[PRY]` en MetalStorm.**

[![Node.js Version](https://img.shields.io/badge/node-22.x_Alpine-brightgreen?logo=node.js)](https://nodejs.org/)
[![Express Version](https://img.shields.io/badge/express-5.2.1-blue?logo=express)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/database-Supabase_PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Platform](https://img.shields.io/badge/deploy-Fly.io_gru-purple?logo=flydotio)](https://paraguay-ffaa-metalstorm.fly.dev/)
[![Version](https://img.shields.io/badge/version-v3.7.0-gold)](https://paraguay-ffaa-metalstorm.fly.dev/)
[![OAuth](https://img.shields.io/badge/auth-Google_OAuth_2.0_Dual-4285F4?logo=google)](https://paraguay-ffaa-metalstorm.fly.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready_(Offline_Cache)-orange?logo=pwa)](https://paraguay-ffaa-metalstorm.fly.dev/)

---

## 📋 Descripción General

**PARAGUAY-FFAA | METALSTORM** es una plataforma web táctica de grado militar diseñada para la administración, registro y supervisión del escuadrón paraguayo en el simulador de combate aéreo *MetalStorm*.

La plataforma centraliza las operaciones del escuadrón mediante:
- **Sistema de Eventos Black Market (BM) (v3.7.0):** Evento táctico especial que reemplaza al Squadron Event cada 1-2 meses. 5 días de combate (miércoles a domingo) con 3 tipos de misiones diarias (Dedicación, Habilidad y Trabajo en equipo). Acumulación de hasta 250 puntos (50 pts/día) para desbloquear hasta un 50% de descuento en cazas exclusivos (F-15EX Eagle II, etc.).
- **Autenticación Militar Híbrida Dual (v3.5.0):** Inicio de sesión flexible admitiendo tanto el correo institucional del escuadrón (`@ffaa.py`) como cuentas de Gmail vinculadas (Google OAuth 2.0 y tradicional), con sistema de vinculación guiado (`/link-account`).
- **Restablecimiento Criptográfico de Contraseñas:** Envío de tokens temporales de un solo uso válidos por 15 minutos (`/reset-password`) con formato militar C4ISR vía Nodemailer.
- **Cuadro de Mando Operacional (Dashboard C4ISR):** Telemetría en tiempo real, seguimiento de la meta semanal del escuadrón (175 tokens promedio), panel de miembros en riesgo, gráfico de tendencia histórica y clasificación Top 5 de pilotos.
- **Registro Táctico de Rendimiento & Selector de Pilotos:** Validación estricta con esquemas Zod (máximo 300 tokens por evento, control de 0 a 7 días de vuelo y combate en escuadrilla), incluyendo selector táctico de combatientes (`#performanceTarget`) exclusivo para oficiales `ADMIN` y `OWNER` con banner de modo oficial.
- **Panel de Administración Militar Avanzado:** Gestión de combatientes con cálculo en tiempo real de `avg_tokens`, `weeks_evaluated` y distintivos de semáforo militar `perf_status` conforme a las normativas del escuadrón.
- **Catálogo & Hangar Militar (Upgrades 2.0):** Flota operacional de cazas de combate, CRUD completo de modelos para Oficiales (ADMIN/OWNER), gestión de 4 subsistemas mejorables (Fuselaje, Motor, Aviónica, Armas niveles 0-8) y control de recursos.
- **Control de Mando RBAC & Cuotas Institucionales:** Restricción jerárquica estricta (1 Comandante en Jefe `OWNER`, máximo 3 Oficiales `ADMIN` y máximo 8 `VETERANO`).
- **Seguridad Criptográfica & Anti-Sesión Fantasma:** Contraseñas temporales aleatorias de alta entropía (`MS-XXXX-XXXX`), invalidación instantánea de JWT mediante `token_version` y hashing con `bcryptjs`.
- **Auditoría & Trazabilidad Militar:** Registro de eventos de seguridad (`security_events`) y cambios administrativos (`audit_logs`) con monitoreo IP y User-Agent.
- **Exportación Segura Sanitizada:** Descarga de reportes CSV con protección activa contra inyecciones de fórmulas (`=`, `+`, `-`, `@`, `\t`, `%`).
- **PWA de Alto Rendimiento (Offline First):** Service Worker v3.7.0 con precaché de componentes tácticos, fallback de red y capacidad de instalación standalone en Android, iOS y Desktop.

---

## 🌐 URLs del Proyecto

- **Producción Principal:** [https://paraguay-ffaa-metalstorm.fly.dev/](https://paraguay-ffaa-metalstorm.fly.dev/)
- **Probe de Salud HTTP (Fly.io):** [https://paraguay-ffaa-metalstorm.fly.dev/health](https://paraguay-ffaa-metalstorm.fly.dev/health)
- **Telemetría del Sistema (JSON):** [https://paraguay-ffaa-metalstorm.fly.dev/api/health](https://paraguay-ffaa-metalstorm.fly.dev/api/health)
- **Repositorio Oficial:** GitHub `paraguayffaametalstorm-debug/ffaa-paraguay-classic`

---

## 🛠️ Stack Tecnológico y Versiones

| Capa | Tecnologías | Versión | Descripción |
|---|---|---|---|
| **Runtime** | Node.js (Alpine Linux) | `v22.x` | Entorno de ejecución de alto rendimiento |
| **Backend Framework** | Express.js | `^5.2.1` | Arquitectura modular basada en routers REST |
| **Persistencia** | Supabase (PostgreSQL) | `^2.112.4` | Base de datos relacional con RLS e índices |
| **Validación de Datos** | Zod | `^4.5.4` | Validación de esquemas y tipos en runtime |
| **Criptografía & Auth** | JSON Web Token (JWT) | `^9.0.3` | Firma de tokens con control de `token_version` |
| **Hashing de Claves** | Bcryptjs | `^3.0.3` | Hashing con salt rounds factor 10 |
| **Seguridad HTTP** | Helmet | `^8.3.0` | Cabeceras HTTP seguras (adaptado para iframe/PWA) |
| **Rate Limiting** | express-rate-limit | `^8.7.0` | Limitador de tráfico (Auth, API, Bulk) |
| **Compresión** | Compression | `^1.8.1` | Gzip / Deflate para optimización de ancho de banda |
| **WebSockets** | ws | `^8.21.3` | Soporte de tiempo real y polyfill en runtime |
| **Frontend** | HTML5 + CSS3 + Vanilla JS | ES6+ | SPA modular táctica sin dependencias pesadas |
| **Tipografía** | Google Fonts | - | Rajdhani (Táctico), Inter (Base), JetBrains Mono (Métricas) |
| **Iconografía** | Lucide Icons | CDN | Simbología militar y de estado |
| **Contenedores** | Docker & Fly.io | - | Despliegue en región São Paulo (`gru`) |

---

## 📁 Estructura del Proyecto

```
├── .dockerignore                 # Exclusiones de construcción Docker
├── .env.example                  # Plantilla de variables de entorno requeridas
├── .gitignore                    # Exclusiones de control de versiones Git
├── API_REFERENCE.md              # Especificación completa de rutas y endpoints REST
├── ARCHITECTURE.md               # Arquitectura de sistemas, diagramas y seguridad
├── CHANGELOG.md                  # Bitácora detallada de versiones y soluciones
├── DEPLOYMENT_GUIDE.md           # Manual de despliegue en Fly.io, Docker y VPS
├── Dockerfile                    # Contenedor de producción en Node.js 22 Alpine
├── fly.toml                      # Configuración de despliegue en Fly.io (gru)
├── index.html                    # Single Page Application y loader dinámico
├── link-account.html             # Terminal táctica de vinculación de cuentas Google
├── manifest.json                 # Manifiesto PWA para instalación standalone
├── metadata.json                 # Metadatos del entorno AI Studio
├── package.json                  # Dependencias y scripts del proyecto
├── PWA_SETUP.md                  # Guía de configuración PWA y Service Worker
├── README.md                     # Documentación principal del sistema
├── reset-password.html           # Terminal de restablecimiento de contraseña militar
├── server.js                     # Servidor Express, middlewares y montaje de rutas
├── sw.js                         # Service Worker v3.5.0 (Cache-First estáticos)
├── USER_MANUAL.md                # Manual operativo para pilotos y oficiales
│
├── components/                   # Vistas y componentes HTML inyectados en runtime
│   ├── admin-panel.html          # Panel de gestión de pilotos, roles y carga masiva
│   ├── admin-plane-models.html   # Gestión de catálogo oficial de cazas (CRUD ADMIN/OWNER)
│   ├── aircraft-stats-modal.html # Modal de detalles tácticos de aeronaves
│   ├── all-performances.html     # Tabla histórica global de rendimientos
│   ├── bm-discount.html          # Ficha técnica y reclamo de oferta del caza Black Market
│   ├── bm-leaderboard.html       # Tabla de posiciones y podio Black Market
│   ├── bm-missions.html          # Vista de misiones tácticas diarias (Días 1 a 5)
│   ├── bm-panel.html             # Consola oficial de gestión Black Market (ADMIN/OWNER)
│   ├── bm-progress.html          # Panel de progreso individual y cálculo de descuentos
│   ├── dashboard.html            # Cuadro de mando operacional principal
│   ├── footer.html               # Pie de página institucional militar
│   ├── forgot-password-modal.html# Modal de recuperación asistida de credenciales
│   ├── header.html               # Barra superior con llamadas tácticas y rango
│   ├── help-modal.html           # Modal emergente de soporte rápido
│   ├── help-view.html            # Vista integral de ayuda y preguntas frecuentes
│   ├── historial-view.html       # Historial personal de rendimiento del piloto
│   ├── normativas-view.html      # Repositorio de reglamentos y protocolos
│   ├── owner-panel.html          # Panel C4ISR: Auditoría, copias de seguridad y logs
│   ├── performance-export.html   # Centro de exportación de reportes CSV
│   ├── performance-form.html     # Formulario de registro de tokens semanales
│   ├── planes-view.html          # Hangar militar y gestión de Upgrades 2.0
│   ├── profile-view.html         # Expediente personal del piloto y cambio de clave
│   ├── session-warning.html      # Modal de expiración y advertencia de sesión
│   └── settings-view.html        # Configuración de interfaz, temas y alertas
│
├── css/                          # Sistema de diseño militar y tokens CSS
│   ├── components.css            # Estilos de botones, tablas, formularios y tarjetas
│   ├── global.css                # Paleta táctica, variables CSS y reset
│   ├── help.css                  # Estilos específicos del centro de ayuda
│   ├── tactical-design.css       # Esquinas biseladas, estados y tipografía militar
│   └── views.css                 # Moduladores de diseño para cada vista
│
├── js/                           # Lógica del cliente modular
│   ├── api.js                    # Wrapper HTTP con Bearer JWT automático y endpoints BM
│   ├── auth.js                   # Manejo de sesiones, JWT, storage y expiración
│   ├── bm.js                     # Controlador táctico Black Market (Misiones, progreso y descuentos)
│   ├── main.js                   # Inicialización, registro de Service Worker y eventos
│   ├── performance.js            # Lógica de registro y cálculo de rendimientos
│   ├── profile.js                # Gestión del expediente militar y cambio de clave
│   ├── settings.js               # Preferencias de temas y notificaciones
│   ├── tour.js                   # Guía asistida interactiva para nuevos pilotos
│   ├── utils.js                  # Utilidades DOM, alertas toast y formateo
│   └── views.js                  # Enrutador cliente y orquestador de vistas
│
├── sql/
│   └── upgrades_2_0.sql          # Migración DDL para sistemas Upgrades 2.0
│
└── src/                          # Núcleo del servidor Backend (ES Modules)
    ├── config/
    │   └── env.js                # Validación y carga centralizada de variables de entorno
    ├── controllers/              # Controladores de lógica de negocio
    │   ├── admin.controller.js   # Gestión de miembros, roles, estados y carga masiva
    │   ├── auth.controller.js    # Login, verify, register, password change & reset
    │   ├── bm.controller.js      # Eventos Black Market, misiones, progreso y descuentos
    │   ├── dashboard.controller.js# Resumen C4ISR, promedios y Top 5
    │   ├── events.controller.js  # Ventanas operativas y eventos activos
    │   ├── normativas.controller.js# Reglamentos, circulares y descargas oficiales
    │   ├── owner.controller.js   # Auditoría de seguridad y respaldos de datos
    │   ├── performances.controller.js# Registro de tokens y exportación CSV
    │   ├── plane-models.controller.js# Catálogo de modelos de aeronaves militares (CRUD)
    │   ├── planes.controller.js  # Hangar de aeronaves y Upgrades 2.0
    │   ├── profile.controller.js # Perfil del combatiente y datos personales
    │   └── settings.controller.js# Ajustes de usuario y preferencias
    ├── db/
    │   └── supabase.js           # Cliente Supabase PostgreSQL y healthchecks
    ├── middlewares/
    │   ├── auth.js               # Middleware JWT, requireAuth y control de roles
    │   ├── errorHandler.js       # Manejador centralizado de excepciones HTTP
    │   └── rateLimiter.js        # Limitadores de peticiones por IP
    ├── routes/                   # Enrutadores Express modulares
    ├── scripts/                  # Utilidades CLI de diagnóstico y mantenimiento
    └── utils/                    # Seguridad, auditoría, esquemas y sanitización CSV
```

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js:** Versión 20 LTS o 22 LTS (Alpine compatible)
- **Gestor de Paquetes:** `npm` (v10+)
- **Instancia de Base de Datos:** Proyecto en Supabase (PostgreSQL)

### Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic.git
cd ffaa-paraguay-classic

# 2. Instalar dependencias del proyecto
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase y clave secreta JWT

# 4. Iniciar en modo desarrollo
npm run dev

# 5. Iniciar en modo producción
npm start
```

El servidor táctico responderá en `http://localhost:3000`.

---

## ⚙️ Variables de Entorno Requeridas

| Variable | Requerida | Valor por Defecto | Descripción |
|---|---|---|---|
| `PORT` | Opcional | `3000` | Puerto de escucha del servidor HTTP |
| `NODE_ENV` | Opcional | `production` | Entorno de ejecución (`development` o `production`) |
| `JWT_SECRET` | **Sí** | *(super_secreto)* | Clave criptográfica para firma de tokens JWT (mínimo 32 caracteres) |
| `JWT_EXPIRES_IN` | Opcional | `7d` | Tiempo de validez del token de acceso militar |
| `SUPABASE_URL` | **Sí** | - | URL del proyecto Supabase (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí** | - | Clave de servicio para operaciones de backend con privilegios |
| `SUPABASE_ANON_KEY` | Opcional | - | Clave anónima para consultas de diagnóstico del cliente |
| `GOOGLE_CLIENT_ID` | Opcional | - | Client ID de Google Cloud Console para OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | Opcional | - | Client Secret de Google Cloud Console para OAuth 2.0 |
| `GOOGLE_CALLBACK_URL` | Opcional | *(auto)* | URL de retorno autorizada (`/api/auth/google/callback`) |
| `FRONTEND_URL` | Opcional | `https://paraguay-ffaa-metalstorm.fly.dev` | URL pública base del frontend militar |
| `EMAIL_HOST` | Opcional | - | Servidor SMTP para despacho de correos tácticos |
| `EMAIL_PORT` | Opcional | `587` | Puerto del servidor SMTP (ej: 587 o 465) |
| `EMAIL_SECURE` | Opcional | `false` | Conexión SSL/TLS directa (`true` para puerto 465) |
| `EMAIL_USER` | Opcional | - | Cuenta emisora o usuario SMTP |
| `EMAIL_PASS` | Opcional | - | Contraseña de aplicación o credencial SMTP |
| `EMAIL_FROM` | Opcional | `"PARAGUAY-FFAA \| METALSTORM" <soporte@paraguay-ffaa.com>` | Remitente en cabeceras de correos tácticos |
| `ALLOWED_ORIGINS` | Opcional | *(localhost, fly.dev)* | Orígenes autorizados para CORS separados por comas |

---

## 🔥 Sistema de Eventos Black Market (BM) - v3.7.0

El **Black Market** es un evento táctico especial de 5 días de duración (miércoles a domingo) que reemplaza periódicamente al Squadron Event regular en MetalStorm:

- **Estructura Operativa de 5 Días:** 3 misiones tácticas diarias (15 misiones en total).
  - **Dedicación:** Despliegue de aeronaves con roles específicos (Cazas de Superioridad Aérea, Interceptores, Bombarderos).
  - **Habilidad:** Cumplimiento de metas con umbrales crecientes de trofeos de combate (100 a 800 trofeos, incrementando +150 por día).
  - **Trabajo en Equipo:** Misiones en patrulla con compañeros del escuadrón (de 2 a 6 pilotos, sumando +1 por día).
- **Puntuación y Bonificación Diaria:**
  - 25 puntos BM por cada misión cumplida.
  - **Bonus Diario de +25 puntos** al completar las 3 misiones del día.
  - Puntuación máxima: **50 puntos por día**, hasta un total de **250 puntos acumulables**.
- **Descuento Militar Progresivo:**
  - Relación: 1 punto BM = 0.2% de descuento.
  - Descuento máximo alcanzable: **50% de descuento** en la compra de la aeronave exclusiva del evento.
  - Incorporación automática de la aeronave adquirida al Hangar de combate del piloto.
- **Consola de Mando para Oficiales (ADMIN / OWNER):**
  - Panel especializado para crear nuevos eventos, definir fechas de inicio y fin, seleccionar aeronave promocional, activar/desactivar eventos y editar misiones con soft-delete.
  - Telemetría en tiempo real de participación, puntos acumulados y adquisiciones de aeronaves.

---

## 🛡️ Evaluación Táctica Militar (Semáforo Operacional)

La asignación del estado de combate se evalúa matemáticamente en el servidor según la función `calculateStatus(tokens, daysConnected)`:

| Estado | Condición de Tokens | Días Conectado Requeridos | Significado Operativo |
|:---:|:---:|:---:|:---|
| 🟢 **VERDE** | $\ge 175$ tokens | $\ge 4$ días | **Excelente:** Cumplimiento militar óptimo. Elegible para ascensos. |
| 🟡 **NARANJA** | $130 - 174$ tokens | $\ge 3$ días | **Advertencia:** Por debajo de la meta. Requiere intensificar operaciones. |
| 🔴 **ROJO** | $100 - 129$ tokens | $\ge 2$ días | **Crítico:** Riesgo inminente de baja. En evaluación por el Alto Mando. |
| ⚫ **NEGRO** | $< 100$ tokens | $< 2$ días | **Inactivo / Sanción:** Falta grave a las operaciones de vuelo. Sujeto a baja. |

---

## 👥 Estructura Jerárquica Militar y Cuotas (RBAC)

1. **👑 OWNER (Comandante en Jefe):**
   - **Cuota:** Máximo **1** comandante activo.
   - **Atribuciones:** Mando supremo, auditoría completa (`/api/owner`), ejecución de respaldos de datos, nombramiento o relevo de Administradores y transferencia de comandancia.
2. **⭐ ADMIN (Oficial de Operaciones):**
   - **Cuota:** Máximo **3** administradores autorizados.
   - **Atribuciones:** Carga masiva de tokens de eventos, altas y bajas operativas de pilotos, reseteo seguro de contraseñas (`MS-XXXX-XXXX`) y publicación de normativas.
3. **🎖️ VETERANO (Piloto Experimentado):**
   - **Cuota:** Máximo **8** veteranos distinguidos.
   - **Atribuciones:** Vuelo en patrulla, consulta de estadísticas ampliadas y acceso preferencial al catálogo de mejoras.
4. **✈️ MIEMBRO (Piloto Regular):**
   - **Atribuciones:** Registro semanal de rendimiento individual, administración de hangar personal y consulta de normativas vigentes.

---

## 📚 Documentación Técnica Detallada

- 📡 **[Referencia Completa de la API RESTful](./API_REFERENCE.md)**
- 🏛️ **[Arquitectura de Sistemas y Seguridad C4ISR](./ARCHITECTURE.md)**
- 🚀 **[Guía de Despliegue en Producción (Fly.io / Docker)](./DEPLOYMENT_GUIDE.md)**
- 📖 **[Manual de Usuario y Operaciones de Vuelo](./USER_MANUAL.md)**
- 📱 **[Configuración PWA, Service Worker y Modo Offline](./PWA_SETUP.md)**
- 📝 **[Registro Histórico de Cambios (Changelog)](./CHANGELOG.md)**

---

## 📜 Licencia y Confidencialidad

© 2026 Escuadrón PARAGUAY FFAA `[PRY]` en MetalStorm. Todos los derechos reservados.  
*Uso exclusivo y reservado para los miembros del escuadrón militar.*

