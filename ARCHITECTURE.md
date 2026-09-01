# 🏛️ Arquitectura del Sistema - PARAGUAY-FFAA | METALSTORM

## 1. Visión General de la Arquitectura

El sistema está estructurado bajo un modelo de arquitectura **Cliente-Servidor Full-Stack desacoplado y orientado a servicios RESTful**. La capa de presentación opera como una Single Page Application (SPA) modular y ligera sin frameworks pesados, optimizada para dispositivos móviles y escritorio.

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENTE (SPA)                         │
│  index.html · CSS Design Tokens · JS Modular (views/auth)   │
│  Service Worker PWA (Cache-First / Offline Fallback)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON (Bearer JWT)
┌──────────────────────────────▼──────────────────────────────┐
│                    API GATEWAY / EXPRESS                    │
│  - Rate Limiting (express-rate-limit)                       │
│  - Security Headers (Helmet)                                │
│  - CORS Policy (Whitelist dinamica)                         │
│  - Auth Middleware (JWT Verify & RBAC Gatekeepers)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┴───────────────────────┐
       ▼                                               ▼
┌──────────────────────────────┐        ┌──────────────────────────────┐
│    CONTROLADORES Y RUTAS     │        │     VALIDACIÓN Y SEGURIDAD   │
│  /api/auth     /api/admin    │        │  - Zod Input Schemas         │
│  /api/events   /api/planes   │        │  - Bcrypt (10 rounds)        │
│  /api/performances           │        │  - CSV Injection Sanitizer   │
└──────────────┬───────────────┘        └──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                   PERSISTENCIA DE DATOS                     │
│  - Supabase (PostgreSQL Cloud)                              │
│  - Motor de Memoria Resiliente (Fallback in-memory)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Capas del Sistema

### 2.1 Capa de Presentación (Frontend)
- **`index.html`:** Contenedor maestro con meta-tags PWA, enlaces a Google Fonts, contenedor de notificaciones toast y barra de navegación inferior para móviles.
- **`/components/*.html`:** Vistas modulares inyectadas dinámicamente (`dashboard.html`, `admin-panel.html`, `profile-view.html`, `all-performances.html`, `planes-view.html`, `normativas-view.html`, etc.).
- **`/css/global.css` & `/css/components.css`:** Sistema de diseño táctico militar basado en tokens CSS (`--pry-red`, `--pry-blue`, `--pry-gold`, `--bg-dark`).
- **`/js/`:** Lógica modular en JavaScript vanilla:
  - `auth.js`: Manejo de autenticación, JWT en localStorage, refresh y temporizador de sesión.
  - `views.js`: Orquestador de vistas, carga dinámica de componentes, gráficos SVG y tablas.
  - `api.js`: Wrapper de peticiones HTTP con inyección automática de cabeceras de autorización.
  - `profile.js`, `planes.js`, `normativas.js`: Módulos de dominio específico.

### 2.2 Capa de Servidor (Backend Express)
- **`server.js`:** Punto de entrada del servidor Express. Configura middlewares globales, política CORS restringida, rate limiting y monta las rutas.
- **`/src/routes/`:** Enrutadores REST segregados por recurso (`auth.routes.js`, `performances.routes.js`, `admin.routes.js`, `owner.routes.js`, `planes.routes.js`, etc.).
- **`/src/middlewares/`:**
  - `auth.js`: Middleware `requireAuth` para verificar tokens JWT firmados y `requireRole(...roles)` para control de acceso basado en roles (RBAC).
  - `rateLimiter.js`: Limitadores de tráfico para proteger contra ataques de fuerza bruta y denegación de servicio.
  - `errorHandler.js`: Manejador centralizado de excepciones con respuestas JSON normalizadas.
- **`/src/controllers/`:** Controladores que ejecutan la lógica de negocio y cálculo de estados de combate (`VERDE`, `NARANJA`, `ROJO`, `NEGRO`).

### 2.3 Capa de Datos y Persistencia
- **`src/db/supabase.js`:** Cliente de conexión a Supabase PostgreSQL.
- **Estrategia Híbrida de Fallback:** Si las credenciales de Supabase no están configuradas en el entorno local, el sistema activa automáticamente un almacén en memoria precargado con datos del escuadrón, garantizando alta disponibilidad continua.

---

## 3. Modelo de Dominio y Flujo de Datos

```
[Usuario Piloto] ──▶ Realiza Vuelo Semanal ──▶ Registra Tokens en Formulario
                                                        │
                                                        ▼
                                                [Validador Zod]
                                             (tokens <= 200/250, dias <= 7)
                                                        │
                                                        ▼
                                            [Cálculo de Estado Militar]
                                          (>=175: VERDE, >=130: NARANJA, ...)
                                                        │
                                                        ▼
                                            [Persistencia en DB]
                                                        │
                                                        ▼
                                       [Actualización de Métricas & Top 5]
```

---

## 4. Estrategia de Seguridad

1. **Autenticación Fuerte:** Passwords hasheadas con `bcryptjs` (cost factor 10).
2. **Tokens JWT:** Firmados con clave secreta (`JWT_SECRET`) y expiración configurable.
3. **Control de Acceso (RBAC):** Restricción de rutas críticas en backend mediante validación de roles (`OWNER`, `ADMIN`, `VETERANO`, `MIEMBRO`).
4. **Prevención XSS:** Función `escapeHTML()` en frontend para toda interpolación de datos dinámicos en el DOM.
5. **Prevención de Inyección CSV:** Las fórmulas que comiencen con `=`, `+`, `-`, `@` son prefijadas con comilla simple (`'`).
6. **Políticas CORS:** Solo se permiten orígenes autorizados especificados en `CORS_ORIGIN`.
