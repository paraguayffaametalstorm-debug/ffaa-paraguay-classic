# 📡 Referencia de la API RESTful - PARAGUAY-FFAA | METALSTORM

Todas las solicitudes a las rutas protegidas deben incluir la cabecera HTTP:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 1. Autenticación (`/api/auth`)

### `POST /api/auth/login`
Inicia sesión en la plataforma y genera el token de acceso JWT.
- **Cuerpo de la Solicitud:**
  ```json
  {
    "email": "piloto@paraguay-ffaa.com",
    "password": "mi_password_seguro"
  }
  ```
- **Respuesta Exitosa (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "user_id": 1,
      "email": "piloto@paraguay-ffaa.com",
      "nick": "Viper_PY",
      "role": "OWNER",
      "perf_status": "VERDE"
    }
  }
  ```

### `GET /api/auth/me`
Obtiene los datos del usuario actualmente autenticado a partir del JWT.

---

## 2. Cuadro de Mando y Estadísticas (`/api/dashboard` & `/api/performances`)

### `GET /api/dashboard/summary`
Devuelve el resumen completo para el cuadro de mando.
- **Respuesta Exitosa (200 OK):**
  ```json
  {
    "currentEvent": { "id": "SQUADRON-2026-08", "type": "SQUADRON", "is_open": true },
    "userStats": { "avg_tokens": 185, "weeks_evaluated": 12, "perf_status": "VERDE" },
    "squadStats": { "total_members": 30, "active_members": 28, "avg_tokens": 192.4 },
    "topPilots": [
      { "nick": "Viper_PY", "role": "OWNER", "avg_tokens": 228, "perf_status": "VERDE" }
    ]
  }
  ```

### `POST /api/performances`
Registra el rendimiento del evento actual.
- **Cuerpo de la Solicitud:**
  ```json
  {
    "event_id": "SQUADRON-2026-08",
    "tokens": 185,
    "days_connected": 6,
    "flew_in_group": true,
    "notes": "Vuelo en patrulla con Escuadrilla Alfa"
  }
  ```

### `GET /api/performances/history`
Devuelve el historial personal de eventos y tokens del piloto autenticado.

---

## 3. Administración y Oficiales (`/api/admin` & `/api/owner`)
*(Requiere rol `ADMIN` o `OWNER`)*

### `POST /api/admin/bulk-upload`
Carga masiva de tokens para todo el escuadrón.
- **Cuerpo de la Solicitud:**
  ```json
  {
    "event_id": "SQUADRON-2026-08",
    "performances": [
      { "nick": "Viper_PY", "tokens": 210, "role": "OWNER" },
      { "nick": "Guarani_Ace", "tokens": 195, "role": "ADMIN" }
    ]
  }
  ```

### `GET /api/performances/export`
Exporta los datos de rendimiento en formato CSV sanitizado contra inyecciones de fórmulas.

---

## 4. Hangar de Aeronaves (`/api/planes`)

### `GET /api/planes/my-planes`
Devuelve la lista de cazas registrados por el piloto autenticado.

### `POST /api/planes`
Registra o actualiza una aeronave en el hangar militar.
