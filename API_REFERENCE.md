# 📡 Referencia de la API RESTful - PARAGUAY-FFAA | METALSTORM

> **Documentación exhaustiva de endpoints, parámetros, cabeceras de autorización y esquemas de respuesta para la versión v3.3.2 del núcleo táctico.**

---

## 🔐 Autenticación y Cabeceras Globales

Todas las solicitudes a rutas protegidas (`requireAuth`) deben incluir la cabecera HTTP estándar:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Formato de Errores Normalizados
En caso de falla, la API garantiza una respuesta en formato JSON con la siguiente estructura:

```json
{
  "success": false,
  "error": "Mensaje descriptivo del error en español táctico",
  "code": "AUTH_TOKEN_EXPIRED | ROLE_LIMIT_REACHED | USER_NOT_FOUND",
  "details": "Información técnica complementaria (opcional)"
}
```

---

## 📑 Tabla Rápida de Rutas y Métodos

| Módulo | Endpoint | Método | Acceso / Rol | Descripción |
|---|---|:---:|:---:|---|
| **Health** | `/health` | `GET` | Público | Probe ligera de texto plano para Fly.io |
| **Health** | `/api/health` | `GET` | Público | Telemetría C4ISR de uptime y fecha |
| **Auth** | `/api/auth/login` | `POST` | Público (30/15m) | Iniciar sesión y obtener JWT |
| **Auth** | `/api/auth/verify` o `/me` | `GET` | Autenticado | Verificar validez del JWT actual |
| **Auth** | `/api/auth/register` | `POST` | Público | Registrar nuevo usuario con clave temporal |
| **Auth** | `/api/auth/change-password`| `POST` | Autenticado | Cambiar clave y renovar `token_version` |
| **Auth** | `/api/auth/forgot-password`| `POST` | Público | Solicitar clave temporal `MS-XXXX-XXXX` |
| **Dashboard** | `/api/dashboard/summary` | `GET` | Autenticado | Resumen de evento, metas y Top 5 |
| **Dashboard** | `/api/dashboard/active-members` | `GET` | Autenticado | Lista ordenada de miembros activos |
| **Events** | `/api/events` | `GET` | Autenticado | Historial de eventos y ventana de tiempo |
| **Events** | `/api/events/open` o `/active` | `GET` | Autenticado | Datos del evento activo actual |
| **Performances**| `/api/performances` | `POST` | Autenticado | Registrar tokens y evaluar estado militar |
| **Performances**| `/api/performances/history` | `GET` | Autenticado | Historial personal de eventos y tokens |
| **Performances**| `/api/performances/stats` | `GET` | Autenticado | Estadísticas calculadas del piloto |
| **Performances**| `/api/performances/all` | `GET` | `ADMIN` / `OWNER` | Lista global de rendimientos |
| **Performances**| `/api/performances/export` | `GET` | `ADMIN` / `OWNER` | Descargar reporte CSV sanitizado |
| **Planes** | `/api/planes/catalog/plane-models` | `GET` | Público | Catálogo oficial de cazas militares |
| **Planes** | `/api/planes/catalog/plane-mods` | `GET` | Público | Catálogo oficial de modificaciones |
| **Planes** | `/api/planes` o `/my-planes` | `GET` | Autenticado | Cazas registrados en el hangar personal |
| **Planes** | `/api/planes/:id/stats` | `GET` | Autenticado | Métricas de combate de la aeronave |
| **Planes** | `/api/planes/:id/system` | `PUT` | Autenticado | **Upgrades 2.0**: Mejorar Fuselaje/Motor/Aviónica/Armas |
| **Planes** | `/api/planes` | `POST` | Autenticado | Adquirir o registrar aeronave en hangar |
| **Planes** | `/api/planes/:id` | `PUT` | Autenticado | Modificar nivel o mods de aeronave |
| **Planes** | `/api/planes/:id` | `DELETE` | Autenticado | Desarmar o eliminar caza del hangar |
| **Normativas** | `/api/normativas` | `GET` | Autenticado | Lista de circulares y reglamentos |
| **Normativas** | `/api/normativas` | `POST` | `ADMIN` / `OWNER` | Publicar nuevo reglamento oficial |
| **Normativas** | `/api/normativas/:id/download` | `GET` | Autenticado | Descargar archivo de normativa oficial |
| **Presence** | `/api/presence/online` | `POST` | Autenticado | Registrar al piloto como conectado |
| **Presence** | `/api/presence/offline` | `POST` | Autenticado | Desconectar al piloto del monitor de presencia |
| **Presence** | `/api/presence/active` | `GET` | Público | Conteo de pilotos actualmente en línea |
| **Profile** | `/api/profile` o `/me` | `GET` | Autenticado | Obtener expediente táctico del piloto |
| **Profile** | `/api/profile` o `/me` | `PUT` | Autenticado | Actualizar Callsign, teléfono o bio |
| **Settings** | `/api/settings` o `/me` | `GET` | Autenticado | Obtener preferencias de tema y alertas |
| **Settings** | `/api/settings` o `/me` | `PUT` | Autenticado | Modificar tema (militar/ops/clasico) y alertas |
| **Admin** | `/api/admin/users` o `/members` | `GET` | `ADMIN` / `OWNER` | Listado completo de miembros del escuadrón |
| **Admin** | `/api/admin/members` | `POST` | `ADMIN` / `OWNER` | Dar de alta a un nuevo piloto |
| **Admin** | `/api/admin/users/:id/status` | `PUT`/`PATCH` | `ADMIN` / `OWNER` | Activar o desactivar cuenta de piloto |
| **Admin** | `/api/admin/users/:id/role` | `PUT`/`PATCH` | `ADMIN` / `OWNER` | Ascenso militar con validación de cuota |
| **Admin** | `/api/admin/bulk-upload` | `POST` | `ADMIN` / `OWNER` | Carga masiva de tokens (máx 20/15m) |
| **Admin** | `/api/admin/events/activate-bm`| `POST` | `ADMIN` / `OWNER` | Activar evento Black Market |
| **Admin** | `/api/admin/users/:id/reset-password`| `POST`| `ADMIN` / `OWNER` | Generar clave aleatoria `MS-XXXX-XXXX` |
| **Owner** | `/api/owner/audit-summary` | `GET` | `OWNER` | Conteo de auditorías y logs en 24h |
| **Owner** | `/api/owner/audit-logs` | `GET` | `OWNER` | Historial paginado con filtros de auditoría |
| **Owner** | `/api/owner/backup/run` | `POST` | `OWNER` | Ejecución de volcado manual de datos |

---

## 1. Módulo de Autenticación (`/api/auth`)

### `POST /api/auth/login`
- **Rate Limit:** 30 intentos cada 15 minutos por IP.
- **Request Body:**
  ```json
  {
    "email": "piloto@ffaa.mil.py",
    "password": "PasswordSeguro2026!"
  }
  ```
- **Response Exitosa (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 14,
      "user_id": 14,
      "nick": "Viper_PY",
      "email": "piloto@ffaa.mil.py",
      "role": "OWNER",
      "perf_status": "VERDE",
      "must_change_password": false
    }
  }
  ```

### `POST /api/auth/change-password`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body:**
  ```json
  {
    "currentPassword": "PasswordTemporal123",
    "newPassword": "MiNuevoPassword2026!",
    "isForced": false
  }
  ```
- **Comportamiento Crítico:** Si `isForced` es true o el usuario tiene `must_change_password: true`, no se requiere la contraseña actual. El servidor incrementa `token_version` e invalida todos los tokens previos.

### `POST /api/auth/forgot-password`
- **Request Body:**
  ```json
  {
    "email": "piloto@ffaa.mil.py"
  }
  ```
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Contraseña de Viper_PY reseteada. Deberá cambiarla al iniciar sesión.",
    "temporaryPassword": "MS-4K7P-X9Q2"
  }
  ```

---

## 2. Cuadro de Mando Táctico (`/api/dashboard`)

### `GET /api/dashboard/summary`
Devuelve la telemetría C4ISR global, métricas del escuadrón y Top 5.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "currentEvent": {
      "id": "SQUADRON-2026-36",
      "type": "SQUADRON",
      "start_date": "2026-09-01",
      "end_date": "2026-09-07",
      "is_open": true,
      "status": "OPEN"
    },
    "userStats": {
      "avg_tokens": 192,
      "weeks_evaluated": 14,
      "trend": "stable",
      "perf_status": "VERDE"
    },
    "squadStats": {
      "total_members": 35,
      "active_members": 32,
      "avg_tokens": 178,
      "at_risk_count": 2
    },
    "topPilots": [
      {
        "id": 1,
        "user_id": 1,
        "nick": "Viper_PY",
        "role": "OWNER",
        "avg_tokens": 225,
        "perf_status": "VERDE"
      }
    ]
  }
  ```

---

## 3. Rendimiento Operativo (`/api/performances`)

### `POST /api/performances`
Registra el desempeño del piloto en el evento activo.
- **Regla del Semáforo:** Evaluado automáticamente:
  - `VERDE`: Tokens $\ge 175$ y Días $\ge 4$
  - `NARANJA`: Tokens $\ge 130$ y Días $\ge 3$
  - `ROJO`: Tokens $\ge 100$ y Días $\ge 2$
  - `NEGRO`: Menor a 100 tokens o menos de 2 días
- **Request Body:**
  ```json
  {
    "event_id": "SQUADRON-2026-36",
    "tokens": 185,
    "days_connected": 6,
    "flew_in_group": true,
    "notes": "Patrulla CAP en sector norte con Su-57"
  }
  ```

### `GET /api/performances/export`
- **Permisos:** Requiere rol `ADMIN` o `OWNER`.
- **Headers de Respuesta:**
  ```http
  Content-Type: text/csv; charset=utf-8
  Content-Disposition: attachment; filename="PRY-FFAA_Rendimientos_YYYY-MM-DD.csv"
  ```
- **Seguridad:** Todas las celdas se sanitizan contra inyecciones de fórmulas de hojas de cálculo.

---

## 4. Hangar Militar & Upgrades 2.0 (`/api/planes`)

### `PUT /api/planes/:id/system`
Aplica una mejora tecnológica de subsistema a un caza registrado según Starform Upgrades 2.0.
- **Request Body:**
  ```json
  {
    "sistema": "fuselaje",
    "nivel": 3,
    "piezas": 500,
    "avanzadas": 10
  }
  ```
  *(Sistemas válidos: `fuselaje`, `motor`, `avionica`, `armas` con niveles de `0` a `8`)*.
- **Auditoría:** La transacción se registra en la tabla `plane_upgrades`.

---

## 5. Administración Militar (`/api/admin`)

### `PUT /api/admin/users/:id/role`
Modifica el rango militar de un piloto aplicando **cuotas institucionales estrictas**.
- **Reglas de Cuota:**
  - Máximo **1 OWNER** (si se nombra otro, el anterior desciende a `ADMIN`).
  - Máximo **3 ADMIN** (error `ROLE_LIMIT_REACHED` si se sobrepasa).
  - Máximo **8 VETERANO** (error `ROLE_LIMIT_REACHED` si se sobrepasa).
- **Request Body:**
  ```json
  {
    "role": "VETERANO"
  }
  ```

### `POST /api/admin/users/:userId/reset-password`
Resetea la contraseña del usuario a un valor criptográficamente seguro y de alta entropía.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Contraseña de Cazador reseteada. Entrégasela por WhatsApp/Discord — no volverá a mostrarse.",
    "temporaryPassword": "MS-9X3K-Q2W7"
  }
  ```

### `POST /api/admin/bulk-upload`
- **Rate Limit:** 20 ejecuciones cada 15 minutos.
- **Request Body:**
  ```json
  {
    "event_id": "SQUADRON-2026-36",
    "performances": [
      { "nick": "Viper_PY", "tokens": 210, "role": "OWNER" },
      { "nick": "Condor_01", "tokens": 180, "role": "ADMIN" },
      { "nick": "Guarani_Ace", "tokens": 160, "role": "MIEMBRO" }
    ]
  }
  ```

---

## 6. Comandante en Jefe C4ISR (`/api/owner`)

*(Acceso exclusivo para rol `OWNER`)*

### `GET /api/owner/audit-logs`
Consulta los eventos registrados en `audit_logs` con paginación y filtros.
- **Query Params:**
  - `page`: Número de página (default: 1)
  - `limit`: Registros por página (default: 20)
  - `action`: Filtro por acción (ej: `ROLE_CHANGE`, `USER_ACTIVATED`)
  - `nick`: Filtro por piloto ejecutor o afectado
  - `result`: Filtro por resultado (`SUCCESS`, `FAILED`)

### `POST /api/owner/backup/run`
Genera un respaldo snapshot estructurado en memoria/JSON de las tablas maestras (`users`, `performances`, `events`).
