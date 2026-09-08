# 🇵🇾 PARAGUAY-FFAA | METALSTORM

> **Sistema Táctico de Control Operacional, Auditoría C4ISR y Gestión de Rendimiento del Escuadrón PARAGUAY FFAA `[PRY]` en MetalStorm.**

[![Node.js Version](https://img.shields.io/badge/node-22.x_Alpine-brightgreen?logo=node.js)](https://nodejs.org/)
[![Express Version](https://img.shields.io/badge/express-5.2.1-blue?logo=express)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/database-Supabase_PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Platform](https://img.shields.io/badge/deploy-Fly.io_gru-purple?logo=flydotio)](https://paraguay-ffaa-metalstorm.fly.dev/)
[![Version](https://img.shields.io/badge/version-v3.4.0-gold)](https://paraguay-ffaa-metalstorm.fly.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready_(Offline_Cache)-orange?logo=pwa)](https://paraguay-ffaa-metalstorm.fly.dev/)

---

## 📋 Descripción General

**PARAGUAY-FFAA | METALSTORM** es una plataforma web táctica de grado militar diseñada para la administración, registro y supervisión del escuadrón paraguayo en el simulador de combate aéreo *MetalStorm*.

La plataforma centraliza las operaciones del escuadrón mediante:
- **Cuadro de Mando Operacional (Dashboard C4ISR):** Telemetría en tiempo real, seguimiento de la meta semanal del escuadrón (175 tokens promedio), panel de miembros en riesgo, gráfico de tendencia histórica y clasificación Top 5 de pilotos.
- **Autenticación Restringida con Google OAuth 2.0:** Acceso oficial para cuentas Google validado de forma estricta contra la lista blanca de correos autorizados y activos en la base del escuadrón (`users`).
- **Restablecimiento Criptográfico de Contraseña:** Flujo de autoservicio vía correo electrónico con tokens de alta entropía (`crypto.randomBytes(32)`), vigencia militar de 15 minutos, invalidación total de sesiones previas con `token_version` e interfaz dedicada `reset-password.html`.
- **Registro Táctico de Rendimiento:** Validación estricta con esquemas Zod (máximo 300 tokens por evento, control de 0 a 7 días de vuelo y combate en escuadrilla).
- **Hangar Militar & Starform Upgrades 2.0:** Catálogo de cazas (F-22, Su-57, F-35, Typhoon, Rafale, Gripen, etc.), módulos pasivos/especiales, gestión de 4 subsistemas mejorables (Fuselaje, Motor, Aviónica, Armas niveles 0-8) y control de recursos (piezas y componentes avanzados).
- **Control de Mando RBAC & Cuotas Institucionales:** Restricción jerárquica estricta (1 Comandante en Jefe `OWNER`, máximo 3 Oficiales `ADMIN` y máximo 8 `VETERANO`).
- **Seguridad Criptográfica & Anti-Sesión Fantasma:** Contraseñas temporales aleatorias de alta entropía (`MS-XXXX-XXXX`), invalidación instantánea de JWT mediante `token_version` y hashing con `bcryptjs`.
- **Auditoría & Trazabilidad Militar:** Registro de eventos de seguridad (`security_events`) y cambios administrativos (`audit_logs`) con monitoreo IP y User-Agent.
- **Exportación Segura Sanitizada:** Descarga de reportes CSV con protección activa contra inyecciones de fórmulas (`=`, `+`, `-`, `@`, `\t`, `%`).
- **PWA de Alto Rendimiento (Offline First):** Service Worker v3.4.0 con precaché de componentes tácticos, fallback de red y capacidad de instalación standalone en Android, iOS y Desktop.

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
| **OAuth 2.0 Provider** | Passport.js + Google OAuth | `^0.7.0` / `^2.0.0` | Autenticación restringida con Google |
| **Despacho de Correo** | Nodemailer | `^10.0.1` | Envío de correos SMTP para restablecimiento de claves |
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
├── manifest.json                 # Manifiesto PWA para instalación standalone
├── metadata.json                 # Metadatos del entorno AI Studio
├── package.json                  # Dependencias y scripts del proyecto
├── privacy.html                  # Política de Privacidad estática táctica (/privacy)
├── PWA_SETUP.md                  # Guía de configuración PWA y Service Worker
├── README.md                     # Documentación principal del sistema
├── reset-password.html           # Interfaz táctica para restablecer contraseña
├── server.js                     # Servidor Express, middlewares y montaje de rutas
├── sw.js                         # Service Worker v3.4.0 (Cache-First estáticos)
├── terms.html                    # Términos de Servicio estáticos tácticos (/terms)
├── USER_MANUAL.md                # Manual operativo para pilotos y oficiales
│
├── components/                   # Vistas y componentes HTML inyectados en runtime
│   ├── admin-panel.html          # Panel de gestión de pilotos, roles y carga masiva
│   ├── aircraft-stats-modal.html # Modal de detalles tácticos de aeronaves
│   ├── all-performances.html     # Tabla histórica global de rendimientos
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
│   ├── privacy-policy.html       # Componente modular de política de privacidad
│   ├── profile-view.html         # Expediente personal del piloto y cambio de clave
│   ├── session-warning.html      # Modal de expiración y advertencia de sesión
│   ├── settings-view.html        # Configuración de interfaz, temas y alertas
│   └── terms-of-service.html     # Componente modular de términos de servicio
│
├── css/                          # Sistema de diseño militar y tokens CSS
│   ├── components.css            # Estilos de botones, tablas, formularios y tarjetas
│   ├── global.css                # Paleta táctica, variables CSS y reset
│   ├── help.css                  # Estilos específicos del centro de ayuda
│   ├── tactical-design.css       # Esquinas biseladas, estados y tipografía militar
│   └── views.css                 # Moduladores de diseño para cada vista
│
├── js/                           # Lógica del cliente modular
│   ├── api.js                    # Wrapper HTTP con Bearer JWT automático
│   ├── auth.js                   # Manejo de sesiones, JWT, storage y expiración
│   ├── main.js                   # Inicialización, registro de Service Worker y eventos
│   ├── performance.js            # Lógica de registro y cálculo de rendimientos
│   ├── profile.js                # Gestión del expediente militar y cambio de clave
│   ├── settings.js               # Preferencias de temas y notificaciones
│   ├── tour.js                   # Guía asistida interactiva para nuevos pilotos
│   ├── utils.js                  # Utilidades DOM, alertas toast y formateo
│   └── views.js                  # Enrutador cliente y orquestador de vistas
│
├── sql/
│   ├── updates_v3.4.0.sql        # Migración tabla password_resets e índices
│   └── upgrades_2_0.sql          # Migración DDL para sistemas Upgrades 2.0
│
└── src/                          # Núcleo del servidor Backend (ES Modules)
    ├── config/
    │   ├── env.js                # Validación y carga centralizada de variables de entorno
    │   └── passport.js           # Estrategia Google OAuth 2.0 (stateless)
    ├── controllers/              # Controladores de lógica de negocio
    │   ├── admin.controller.js   # Gestión de miembros, roles, estados y carga masiva
    │   ├── auth.controller.js    # Login, verify, register, password change & reset
    │   ├── dashboard.controller.js# Resumen C4ISR, promedios y Top 5
    │   ├── events.controller.js  # Ventanas operativas y eventos activos
    │   ├── normativas.controller.js# Reglamentos, circulares y descargas oficiales
    │   ├── owner.controller.js   # Auditoría de seguridad y respaldos de datos
    │   ├── performances.controller.js# Registro de tokens y exportación CSV
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
    └── utils/                    # Seguridad, auditoría, esquemas, Nodemailer y sanitización CSV
        ├── audit.js              # Registro de eventos y seguridad
        ├── email.js              # Plantillas y despacho de correo Nodemailer
        ├── security.js           # Entropía militar y tokens criptográficos
        └── schemas.js            # Validación Zod en runtime
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
| `JWT_EXPIRES_IN` | Opcional | `7d` | Tiempo de validez del token de acceso |
| `SUPABASE_URL` | **Sí** | - | URL del proyecto Supabase (`https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí** | - | Clave de servicio para operaciones de backend con privilegios |
| `SUPABASE_ANON_KEY` | Opcional | - | Clave anónima para consultas de diagnóstico del cliente |
| `ALLOWED_ORIGINS` | Opcional | *(localhost, fly.dev)* | Orígenes autorizados para CORS separados por comas |
| `APP_URL` | Opcional | `https://paraguay-ffaa-metalstorm.fly.dev` | URL base de la aplicación para enlaces de recuperación |
| `GOOGLE_CLIENT_ID` | Recomendada | - | Client ID de Google Cloud Console para OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | Recomendada | - | Client Secret de Google Cloud Console para OAuth 2.0 |
| `GOOGLE_CALLBACK_URL` | Opcional | `/api/auth/google/callback` | Ruta de retorno del flujo OAuth |
| `EMAIL_HOST` | Recomendada | - | Servidor SMTP (ej. `smtp.gmail.com`) para reseteo de claves |
| `EMAIL_PORT` | Opcional | `587` | Puerto SMTP (`587` TLS o `465` SSL) |
| `EMAIL_SECURE` | Opcional | `false` | Conexión SSL estricta (`true` para puerto 465) |
| `EMAIL_USER` | Recomendada | - | Usuario o correo institucional de envío |
| `EMAIL_PASS` | Recomendada | - | Contraseña o App Password de Google |
| `EMAIL_FROM` | Opcional | `PARAGUAY-FFAA Escuadrón <no-reply@ffaa.py>` | Remitente en cabecera de correos |

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

