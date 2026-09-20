# 📡 Referencia de la API RESTful - PARAGUAY-FFAA | METALSTORM

> **Documentación exhaustiva de endpoints, parámetros, cabeceras de autorización y esquemas de respuesta para la versión v4.0.0 del núcleo táctico.**

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
  "code": "AUTH_TOKEN_EXPIRED | ROLE_LIMIT_REACHED | USER_NOT_FOUND | USER_INACTIVE | USER_NOT_INACTIVE | REASON_REQUIRED | REASON_TOO_LONG | OWNER_PROTECTED | SELF_MODIFICATION_FORBIDDEN | HIERARCHY_FORBIDDEN | INVALID_STATUS",
  "details": "Información técnica complementaria (opcional)"
}
```

---

## 📑 Tabla Rápida de Rutas y Métodos

| Módulo | Endpoint | Método | Acceso / Rol | Descripción |
|---|---|:---:|:---:|---|
| **Health** | `/health` | `GET` | Público | Probe ligera de texto plano para Fly.io |
| **Health** | `/api/health` | `GET` | Público | Telemetría C4ISR de uptime y fecha |
| **Auth** | `/api/auth/login` | `POST` | Público (30/15m) | Iniciar sesión dual (`email` o `email_institucional`) |
| **Auth** | `/api/auth/google` | `GET` | Público | Iniciar flujo OAuth 2.0 con Google |
| **Auth** | `/api/auth/google/callback` | `GET` | Público | Retorno y canje OAuth 2.0 |
| **Auth** | `/api/auth/google/status` | `GET` | Público | Verificar disponibilidad y estado de vinculación |
| **Auth** | `/api/auth/link-account` | `POST` | Público | Vincular Gmail con indicativo de combatiente |
| **Auth** | `/api/auth/verify` o `/me` | `GET` | Autenticado | Verificar validez del JWT actual |
| **Auth** | `/api/auth/register` | `POST` | Público | Registrar nuevo usuario con clave temporal |
| **Auth** | `/api/auth/change-password`| `POST` | Autenticado | Cambiar clave y renovar `token_version` |
| **Auth** | `/api/auth/forgot-password`| `POST` | Público | Generar token y enviar correo de 15 min |
| **Auth** | `/api/auth/reset-password` | `POST` | Público | Restablecer contraseña con token táctico |
| **Dashboard** | `/api/dashboard/summary` | `GET` | Autenticado | Resumen de evento, metas y Top 5 |
| **Dashboard** | `/api/dashboard/active-members` | `GET` | Autenticado | Lista ordenada de miembros activos |
| **Events** | `/api/events` | `GET` | Autenticado | Historial de eventos y ventana de tiempo |
| **Events** | `/api/events/open` o `/active` | `GET` | Autenticado | Datos del evento activo actual (⚠️ deprecado, migrar a events-v2) |
| **Events v2** | `/api/events-v2` | `GET` | Autenticado | Listar eventos unificados (SQ + BM) con filtros |
| **Events v2** | `/api/events-v2/active` | `GET` | Autenticado | Evento activo actual (1 solo a la vez) |
| **Events v2** | `/api/events-v2/:id` | `GET` | Autenticado | Detalle de un evento específico |
| **Events v2** | `/api/events-v2` | `POST` | `ADMIN` / `OWNER` | Crear evento (SQ o BM) |
| **Events v2** | `/api/events-v2/:id` | `PUT` | `ADMIN` / `OWNER` | Editar evento |
| **Events v2** | `/api/events-v2/:id/status` | `PATCH` | `ADMIN` / `OWNER` | Cambiar estado (OPEN/CLOSED/CANCELLED) — switch funcional |
| **Events v2** | `/api/events-v2/:id` | `DELETE` | `ADMIN` / `OWNER` | Eliminar evento (solo SCHEDULED) |
| **Events v2** | `/api/events-v2/:id/participations` | `GET` | Autenticado | Listar participaciones del evento |
| **Events v2** | `/api/events-v2/:id/participations` | `POST` | Autenticado | Cargar participación (tokens o misiones BM) |
| **Events v2** | `/api/events-v2/:id/participations/:uid` | `PUT` | Autenticado | Editar participación |
| **Events v2** | `/api/events-v2/:id/participations/:uid` | `DELETE` | `ADMIN` / `OWNER` | Eliminar participación |
| **Events v2** | `/api/events-v2/switch-status` | `GET` | Autenticado | Alias: estado del switch de eventos |
| **Performances**| `/api/performances` | `POST` | Autenticado | Registrar tokens y evaluar estado militar |
| **Performances**| `/api/performances/pilots` | `GET` | Autenticado | Selector táctico de pilotos para ADMIN/OWNER |
| **Performances**| `/api/performances/history` | `GET` | Autenticado | Historial personal de eventos y tokens |
| **Performances**| `/api/performances/stats` | `GET` | Autenticado | Estadísticas calculadas del piloto |
| **Performances**| `/api/performances/all` | `GET` | `ADMIN` / `OWNER` | Lista global de rendimientos |
| **Performances**| `/api/performances/export` | `GET` | `ADMIN` / `OWNER` | Descargar reporte CSV sanitizado |
| **Planes** | `/api/planes/catalog/plane-models` | `GET` | Público | Catálogo oficial de 44 cazas militares |
| **Planes** | `/api/planes/catalog/plane-mods` | `GET` | Público | Catálogo oficial de modificaciones |
| **Planes** | `/api/planes` o `/my-planes` | `GET` | Autenticado | Cazas registrados en el hangar personal |
| **Planes** | `/api/planes/:id/stats` | `GET` | Autenticado | Métricas de combate de la aeronave |
| **Planes** | `/api/planes/:id/details` | `GET` | Autenticado | Telemetría completa con datos Wiki |
| **Planes** | `/api/planes/:id/system` | `PUT` | Autenticado | **Upgrades 2.0**: Mejorar Fuselaje/Motor/Aviónica/Armas |
| **Catalog** | `/api/plane-models` | `GET` | Autenticado | Listar catálogo de cazas (activos e inactivos) |
| **Catalog** | `/api/plane-models/:id` | `GET` | Autenticado | Obtener ficha técnica completa de un caza |
| **Catalog** | `/api/plane-models` | `POST` | `ADMIN` / `OWNER` | Registrar nuevo modelo de aeronave |
| **Catalog** | `/api/plane-models/:id` | `PUT` | `ADMIN` / `OWNER` | Actualizar parámetros técnicos y combate |
| **Catalog** | `/api/plane-models/:id` | `DELETE` | `ADMIN` / `OWNER` | Desactivar modelo del catálogo (soft-delete) |
| **Catalog** | `/api/plane-models/:id/restore` | `POST` | `ADMIN` / `OWNER` | Reactivar modelo en el catálogo |
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
| **Admin** | `/api/admin/users/:id/status` | `PUT`/`PATCH` | `ADMIN` / `OWNER` | Activar o desactivar cuenta de piloto con motivo |
| **Admin** | `/api/admin/users/inactive` | `GET` | `ADMIN` / `OWNER` | Listar solo pilotos inactivos con motivo, actor y fecha |
| **Admin** | `/api/admin/users/:id/inactive-reason` | `PATCH` | `ADMIN` / `OWNER` | Completar o corregir motivo de baja de un piloto |
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
- **Login Dual:** Acepta indistintamente la dirección de correo institucional (`@ffaa.py`) o la cuenta real de Gmail vinculada al perfil.
- **Request Body:**
  ```json
  {
    "email": "piloto@ffaa.py",
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
      "email": "usuario@gmail.com",
      "email_institucional": "piloto@ffaa.py",
      "google_linked": true,
      "role": "OWNER",
      "perf_status": "VERDE",
      "must_change_password": false
    }
  }
  ```

### `GET /api/auth/google`
Inicia el flujo de autenticación federada mediante **Google OAuth 2.0 (Passport.js)**.
- **Acceso:** Público.
- **Comportamiento:** Redirige al usuario a la pantalla de consentimiento de Google solicitando los scopes `profile` y `email`.

### `GET /api/auth/google/callback`
Punto de retorno (callback) del flujo Google OAuth 2.0.
- **Acceso:** Público (invocado por los servidores de Google tras la autorización del usuario).
- **Comportamiento Operativo:**
  - Si el correo o `google_id` ya está vinculado a un piloto activo: emite el token JWT militar y redirige a la aplicación (`/?token=...`).
  - Si el correo de Google aún no está vinculado a ningún piloto: redirige automáticamente a la terminal táctica `/link-account.html?email={googleEmail}` para asociar su Callsign y clave militar.

### `GET /api/auth/google/status`
Verifica si el servicio de Google OAuth 2.0 está configurado y activo, y opcionalmente el estado de vinculación de un correo.
- **Query Params:** `?email=usuario@gmail.com` (opcional)
- **Response Exitosa (200 OK):**
  ```json
  {
    "enabled": true,
    "provider": "google",
    "linked": true
  }
  ```

### `POST /api/auth/link-account`
Vincula una cuenta de Google (Gmail) con un combatiente existente mediante la comprobación de su indicativo militar y contraseña.
- **Rate Limit:** 10 intentos cada 15 minutos por IP.
- **Request Body:**
  ```json
  {
    "email": "combatiente@gmail.com",
    "callsign": "VIPER",
    "password": "MiPasswordActual123!"
  }
  ```
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "¡Cuenta vinculada exitosamente a VIPER!",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 14,
      "nick": "VIPER",
      "email": "combatiente@gmail.com",
      "email_institucional": "viper@ffaa.py",
      "google_linked": true,
      "role": "MEMBER"
    }
  }
  ```

### `POST /api/auth/forgot-password`
Genera un token criptográfico seguro de un solo uso con vigencia estricta de 15 minutos, y despacha un correo táctico militar mediante Nodemailer.
- **Rate Limit:** 5 solicitudes cada 15 minutos por IP.
- **Búsqueda Dual:** Localiza la cuenta tanto si se proporciona el correo institucional (`@ffaa.py`) como el Gmail vinculado.
- **Request Body:**
  ```json
  {
    "email": "piloto@ffaa.py"
  }
  ```
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Si el correo está registrado en el escuadrón, se enviaron las instrucciones de restablecimiento (válidas por 15 minutos).",
    "data": {
      "expiresInMinutes": 15,
      "simulated": false
    }
  }
  ```

- **Notas Operativas:**
  - `simulated: false` indica que el correo se envió por SMTP real.
  - `simulated: true` indica que el SMTP no está configurado (solo se loguea en consola).
  - Se registra en `security_events` con `PASSWORD_RESET_REQUESTED`.
  - **⚠️ Limitación:** Solo funciona para pilotos con Gmail real vinculado (`email = @gmail.com` + `google_linked = true`). Ver subsección "Limitación Crítica del Reset por Email" más abajo.

### `POST /api/auth/reset-password`
Restablece la contraseña militar del usuario empleando el token de 15 minutos recibido por correo electrónico. Al completarse, incrementa `token_version` para cerrar cualquier otra sesión activa.
- **Rate Limit:** 10 solicitudes cada 15 minutos por IP.
- **Request Body:**
  ```json
  {
    "token": "a1b2c3d4e5f6...",
    "newPassword": "NuevaPasswordFuerte2026!"
  }
  ```
- **Procesamiento y Efectos Colaterales:**
  1. Valida que el token exista en `password_resets`, no esté usado y no haya expirado.
  2. Genera un nuevo hash con `bcrypt.hash(newPassword, 10)`.
  3. Marca el token como consumido: `password_resets.used = true`.
  4. Actualiza el usuario en `users`:
     - `password_hash` = nuevo hash bcrypt
     - `token_version` incrementado en `+1`
     - `must_change_password = false`
     - `updated_at = NOW()`
  5. Registra un evento de seguridad con `PASSWORD_RESET_SUCCESS`.
  6. Invalida cualquier JWT previo del usuario (por el incremento de `token_version`).

- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Contraseña táctica actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave."
  }
  ```

- **Errores Posibles:**
  - `400 Bad Request`: Token inválido, ya usado, expirado, o nueva contraseña no cumple complejidad.
  - `404 Not Found`: Usuario asociado al token no encontrado.

### `POST /api/auth/change-password`
Permite a los combatientes actualizar su contraseña militar, tanto en el flujo forzado de primer acceso (o tras un reseteo administrativo) como de manera voluntaria desde el expediente de perfil.

- **Acceso:** Autenticado (`requireAuth`). Requiere cabecera:
  ```http
  Authorization: Bearer <JWT_TOKEN>
  Content-Type: application/json
  ```
- **Requisitos de Complejidad Reglamentaria:**
  - Expresión regular: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/`
  - Mínimo 8 caracteres.
  - Al menos una letra mayúscula (`A-Z`).
  - Al menos una letra minúscula (`a-z`).
  - Al menos un dígito numérico (`0-9`).

- **Request Body (Cambio Forzado por Primer Acceso o Reseteo):**
  ```json
  {
    "newPassword": "Dni32355353",
    "isForced": true
  }
  ```
  *(Nota: En modo forzado o cuando el usuario tiene `must_change_password: true`, no se exige el campo `currentPassword`).*

- **Request Body (Cambio Voluntario desde Perfil):**
  ```json
  {
    "currentPassword": "PasswordActual123!",
    "newPassword": "NuevaPasswordReglamentaria2026!",
    "isForced": false
  }
  ```

- **Lógica de Resolución Tipada en Base de Datos (Supabase):**
  El endpoint evalúa de forma polimórfica los identificadores del usuario para evitar incompatibilidades de tipo entre `UUID` y `INTEGER`:
  1. Si `user.id` es un UUID válido (regex `^[0-9a-f]{8}-[0-9a-f]{4}...$`) $\rightarrow$ `.eq('id', user.id)`
  2. Si `user.user_id` es un número entero $\rightarrow$ `.eq('user_id', Number(user.user_id))`
  3. Si existe `user.email` $\rightarrow$ `.eq('email', user.email)`
  4. Fallback por defecto $\rightarrow$ `.eq('id', user.id)`

- **Procesamiento y Efectos Colaterales:**
  1. Genera un nuevo hash con `bcrypt.hash(newPassword, 10)`.
  2. Incrementa `token_version` en `+1` (ej: de `1` a `2`).
  3. Establece `must_change_password = false`.
  4. Actualiza la columna `updated_at = NOW()`.
  5. Ejecuta `.select('id, email, nick, user_id, role, token_version, must_change_password')` para confirmar la mutación en Supabase.
  6. Registra un evento de seguridad de auditoría militar (`PASSWORD_CHANGED`).
  7. Firma y retorna un nuevo token JWT que contiene el nuevo `token_version`.

- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Contraseña de combate actualizada correctamente. Credencial de sesión renovada.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_version": 2,
    "user": {
      "id": "3658df3a-3d15-4669-a595-dca33ec86fd3",
      "user_id": 1000,
      "email": "testpilot@ffaa.py",
      "nick": "TestPilot",
      "role": "MIEMBRO",
      "must_change_password": false,
      "token_version": 2
    }
  }
  ```

- **Códigos de Error Posibles:**
  - `400 Bad Request`: La contraseña no alcanza los requisitos mínimos de complejidad o falta la contraseña actual en cambio voluntario (`CURRENT_PASSWORD_REQUIRED`).
  - `401 Unauthorized`: Token de autorización faltante o expirado, o la contraseña actual proporcionada no coincide con el hash almacenado.
  - `404 Not Found`: Combatiente no localizado en el registro militar de Supabase.
  - `500 Internal Server Error`: Falla de conectividad o error interno del servicio de base de datos.

### ⚠️ Limitación Crítica del Reset por Email

Aunque el flujo `forgot-password` → `reset-password` está 100% operativo end-to-end a nivel técnico, existe una limitación real de infraestructura de correo:

- **Solo ~2% de los pilotos** tienen un Gmail real vinculado a su cuenta (únicamente el usuario `PJPIROVANI`, OWNER).
- **El 98% restante** posee correos institucionales `@ffaa.py` ficticios que rebotan en el envío SMTP.
- **Método principal de recuperación:** reset administrativo desde el Panel Admin (`POST /api/admin/users/:id/reset-password`), que genera una clave temporal `MS-XXXX-XXXX` entregable por canal seguro (WhatsApp/Discord).
- **Estado del SMTP:** Configurado con Gmail (`paraguayffaa.metalstorm@gmail.com`, `smtp.gmail.com:587`, `EMAIL_SECURE=false`) y operativo. La limitación es la cobertura de correos válidos, no la infraestructura.

---

### 🚫 Mensaje Enriquecido al Bloquear Cuenta Inactiva

Cuando un piloto con `status = 'INACTIVE'` intenta autenticarse en cualquier endpoint protegido, el middleware `auth.js` intercepta la solicitud y devuelve un payload JSON enriquecido con trazabilidad de la baja:

```json
{
  "error": "⚠️ ACCESO DENEGADO: Su cuenta ha sido inactivada por el Comandante [NICK] el [FECHA]. No tiene acceso a la plataforma del escuadrón. Comuníquese con el Comando Central para más información.",
  "code": "USER_INACTIVE",
  "details": {
    "inactive_by": "el Comandante [NICK]",
    "inactive_at": "2026-09-10T01:15:00.000Z",
    "contact": "comando.central@ffaa.py"
  }
}
```

- **Origen:** Fix aplicado en el middleware `auth.js` (commit `d4a3881`).
- **Objetivo:** Reemplazar la respuesta genérica por un mensaje táctico claro que indique al piloto:
  1. Que su cuenta fue inactivada (no que su token expiró).
  2. Quién ejecutó la baja y cuándo.
  3. Canal de contacto oficial para apelar la decisión.
- **Nota:** Si no existe registro en `audit_logs` con la acción de inactivación, el mensaje dice genéricamente "el Comando Central".

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

### `GET /api/performances/pilots`
Obtiene la lista autorizada de pilotos para el **Selector Táctico de Pilotos** en el formulario de registro (`#performanceTarget`).
- **Acceso:** Autenticado (`requireAuth`).
- **Aislamiento RBAC:**
  - **Para oficiales `ADMIN` y `OWNER`:** Devuelve la dotación completa de pilotos con `status = 'ACTIVE'` ordenados alfabéticamente por Callsign (`nick`), permitiendo la carga delegada en nombre de cualquier combatiente activo.
  - **Para pilotos regulares `MIEMBRO` y `VETERANO`:** Devuelve únicamente su propio registro individual para preservar la privacidad y evitar cargas no autorizadas.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Lista de pilotos obtenida exitosamente",
    "pilots": [
      {
        "id": 14,
        "user_id": 14,
        "nick": "Viper_PY",
        "email": "viper@ffaa.py",
        "role": "OWNER",
        "status": "ACTIVE",
        "perf_status": "VERDE",
        "avg_tokens": 192
      },
      {
        "id": 22,
        "user_id": 22,
        "nick": "Condor_01",
        "email": "condor@ffaa.py",
        "role": "ADMIN",
        "status": "ACTIVE",
        "perf_status": "VERDE",
        "avg_tokens": 185
      }
    ],
    "count": 2
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

## 3.5. Módulo de Eventos Unificado (`/api/events-v2`) — F3.1

> **⚠️ IMPORTANTE:** A partir de la Fase 3 del rediseño (2026-09-17), este módulo reemplaza funcionalmente a `/api/events/*` (legacy SQ) y `/api/bm/*` (legacy BM). Los endpoints legacy siguen operativos pero **deprecados** con sunset programado para **2026-12-16**.

### 3.5.1 Arquitectura Unificada

El módulo unifica la gestión de eventos SQ y BM sobre dos tablas maestras:

| Tabla | Propósito |
|---|---|
| `events_master` | Eventos unificados (UUID, `type`, `status`, `metadata` JSONB) |
| `event_participations` | Participaciones unificadas (UUID, `event_id`, `user_id`, `data` JSONB, `computed_points`, `status`) |

**Tipos de evento soportados:**
- `SQUADRON`: Evento semanal (jueves-domingo).
- `BLACK_MARKET`: Evento especial de 5 días (miércoles-domingo).
- `ACE_CHALLENGE`: Reservado para futuro (estructura documentada, no implementada).

**Regla del switch (1 evento OPEN a la vez):**
- Solo puede existir **1 evento `OPEN`** en todo el sistema (índice UNIQUE parcial `idx_events_master_single_open`).
- Al activar un BM, el SQ se cierra con `closed_reason = 'BM_REPLACED'`.
- El scheduler auto-crea el próximo SQ el **jueves 00:00 UTC**.

### 3.5.2 Endpoints de Eventos

#### `GET /api/events-v2`

Lista eventos con filtros opcionales.

**Query Params:**
| Param | Valores | Default | Descripción |
|---|---|---|---|
| `type` | `SQUADRON` \| `BLACK_MARKET` \| `ACE_CHALLENGE` | (todos) | Filtrar por tipo |
| `status` | `SCHEDULED` \| `OPEN` \| `CLOSED` \| `CANCELLED` | (todos) | Filtrar por estado |
| `limit` | número | 50 | Máximo de resultados |
| `offset` | número | 0 | Paginación |

**Response Exitosa (200 OK):**
```json
{
  "success": true,
  "events": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "type": "SQUADRON",
      "name": "Squadron Event 2026-W38",
      "start_date": "2026-09-17T13:00:00Z",
      "end_date": "2026-09-21T13:00:00Z",
      "status": "OPEN",
      "metadata": {
        "iso_week": 38,
        "iso_year": 2026,
        "target_members": 27,
        "target_tokens": 200,
        "min_tokens_required": 175,
        "auto_created": true,
        "source": "SCHEDULER"
      },
      "legacy_event_id": "2026-09 · SEM 38 - SQ",
      "created_at": "2026-09-17T09:00:00Z"
    }
  ],
  "total": 1
}
```

#### `GET /api/events-v2/active`

Devuelve el **único evento `OPEN`** del sistema (1 solo a la vez por diseño).

**Response Exitosa (200 OK):**
```json
{
  "success": true,
  "active": true,
  "event": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "SQUADRON",
    "name": "Squadron Event 2026-W38",
    "start_date": "2026-09-17T13:00:00Z",
    "end_date": "2026-09-21T13:00:00Z",
    "status": "OPEN",
    "metadata": { "...": "..." }
  }
}
```

**Sin evento activo (200 OK):**
```json
{
  "success": true,
  "active": false,
  "event": null
}
```

#### `GET /api/events-v2/:id`

Detalle de un evento específico (SQ o BM) con sus participaciones.

- **Acceso:** Autenticado (`requireAuth`).
- **Errores:**
  - `404 EVENT_NOT_FOUND`: el ID no existe.
  - `400 INVALID_EVENT_ID`: el ID no es un UUID válido.

#### `POST /api/events-v2`

Crea un evento (SQ o BM).

- **Acceso:** `ADMIN` / `OWNER`.
- **Validación:** Zod (`EventMasterSchema`).
- **Request Body (SQ):**
  ```json
  {
    "type": "SQUADRON",
    "name": "Squadron Event 2026-W39",
    "start_date": "2026-09-24T13:00:00Z",
    "end_date": "2026-09-28T13:00:00Z",
    "metadata": {
      "iso_week": 39,
      "iso_year": 2026,
      "target_members": 27,
      "target_tokens": 200,
      "min_tokens_required": 175
    }
  }
  ```
- **Response Exitosa (201 Created):**
  ```json
  {
    "success": true,
    "event": { "...evento creado..." }
  }
  ```

#### `PATCH /api/events-v2/:id/status`

Cambia el estado de un evento (switch funcional).

- **Acceso:** `ADMIN` / `OWNER`.
- **Request Body:**
  ```json
  {
    "status": "OPEN",
    "closed_reason": "BM_REPLACED"
  }
  ```
- **Reglas del switch:**
  - Al activar un evento como `OPEN`, cualquier otro evento `OPEN` se cierra automáticamente con `closed_reason = 'BM_REPLACED'` (si es BM) o `'MANUAL'` (si es cambio manual).
  - Solo 1 evento `OPEN` a la vez (garantizado por índice UNIQUE parcial en BD).
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "event": { "...estado actualizado..." },
    "replaced": {
      "id": "b2c3d4e5-...",
      "type": "SQUADRON",
      "closed_reason": "BM_REPLACED"
    }
  }
  ```

#### `DELETE /api/events-v2/:id`

Elimina un evento (solo si está en estado `SCHEDULED`).

- **Acceso:** `ADMIN` / `OWNER`.
- **Errores:**
  - `409 EVENT_NOT_DELETABLE`: el evento está `OPEN` o `CLOSED`.
  - `404 EVENT_NOT_FOUND`.

---

### 3.5.3 Participaciones

#### `GET /api/events-v2/:id/participations`

Lista las participaciones del evento con `computed_points` y `status`.

- **Acceso:** Autenticado.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "participations": [
      {
        "id": "uuid-participacion",
        "event_id": "uuid-evento",
        "user_id": 14,
        "nick": "Viper_PY",
        "role": "OWNER",
        "data": {
          "tokens": 185,
          "days_connected": 6,
          "flew_in_group": true,
          "notes": "Patrulla CAP en sector norte"
        },
        "computed_points": 185,
        "status": "ACTIVE",
        "created_at": "2026-09-17T14:30:00Z",
        "updated_at": "2026-09-17T14:30:00Z"
      }
    ],
    "total": 1
  }
  ```

#### `POST /api/events-v2/:id/participations`

Carga una participación (tokens para SQ, misiones para BM).

- **Acceso:** Autenticado.
- **Reglas:**
  - Solo en eventos `OPEN`.
  - Un usuario puede tener máximo **1 participación activa** por evento.
  - Los `computed_points` se calculan según tipo de evento (SQ: tokens; BM: fórmula 25 pts/misión + bonus diario).
- **Request Body (SQ):**
  ```json
  {
    "tokens": 185,
    "days_connected": 6,
    "flew_in_group": true,
    "notes": "Patrulla CAP en sector norte con Su-57"
  }
  ```
- **Request Body (BM):**
  ```json
  {
    "day": 3,
    "completed": true,
    "screenshot_urls": ["https://..."]
  }
  ```
- **Response Exitosa (201 Created):**
  ```json
  {
    "success": true,
    "participation": { "...participación..." },
    "points_earned": 25
  }
  ```

#### `PUT /api/events-v2/:id/participations/:userId`

Edita una participación existente.

- **Acceso:** Autenticado (solo el propio usuario o `ADMIN`/`OWNER`).
- **Request Body:** igual que el POST pero con modo reemplazo total.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "participation": { "...participación actualizada..." }
  }
  ```

#### `DELETE /api/events-v2/:id/participations/:userId`

Elimina una participación.

- **Acceso:** `ADMIN` / `OWNER`.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Participación eliminada"
  }
  ```

---

### 3.5.4 Deprecación de Endpoints Legacy

> **⚠️ IMPORTANTE:** Los siguientes endpoints están **deprecados** desde el 2026-09-17 y serán **eliminados** el **2026-12-16** (sunset de 90 días).

#### Endpoints Legacy SQ

| Endpoint | Reemplazo |
|---|---|
| `GET /api/events` | `GET /api/events-v2?type=SQUADRON` |
| `GET /api/events/open` | `GET /api/events-v2/active` |
| `GET /api/events/active` | `GET /api/events-v2/active` |
| `POST /api/events` | `POST /api/events-v2` |
| `PUT /api/events/:id` | `PATCH /api/events-v2/:id/status` |

#### Endpoints Legacy BM (ELIMINADOS en F4.2.2-G)

| Endpoint | Reemplazo |
|---|---|
| `GET /api/bm/events` | `GET /api/events-v2?type=BLACK_MARKET` |
| `GET /api/bm/events/active` | `GET /api/events-v2/bm/active` |
| `POST /api/bm/events` | `POST /api/events-v2/bm` |
| `GET /api/bm/missions/today` | `GET /api/events-v2/bm/:id` |
| `POST /api/bm/missions/:id/complete` | `PUT /api/events-v2/bm/:eventId/progress` |
| `GET /api/bm/progress` | `GET /api/events-v2/bm/:eventId/progress` |
| `GET /api/bm/discount` | `GET /api/events-v2/bm/:eventId/discount` |
| `POST /api/bm/discount/purchase` | (integrado en `apiEventsV2Bm*`) |
| `GET /api/bm/stats` | `GET /api/events-v2/bm/:eventId` (metadata) |
| `GET /api/bm/leaderboard` | `GET /api/events-v2/bm/:eventId/leaderboard` |

#### Cabecera de Deprecación

Durante el período de gracia, los endpoints legacy devuelven las siguientes cabeceras:

```http
Deprecation: true
Sunset: Wed, 16 Dec 2026 00:00:00 GMT
Link: </api/events-v2>; rel="successor-version"
```

#### Cronograma

| Fecha | Acción |
|---|---|
| 2026-09-17 | Deprecación formal (F4.3) |
| 2026-09-20 | Documentación publicada (F4.4) |
| 2026-09-26 | DROP tablas BM legacy (`sql/032`) |
| **2026-12-16** | **Eliminación definitiva de endpoints legacy SQ** |

---

#### Endpoints BM Específicos (Submódulo `/api/events-v2/bm`)

Además de los endpoints unificados, existen 8 endpoints específicos para BM:

| Endpoint | Método | Descripción |
|---|---|---|
| `GET /api/events-v2/bm/active` | GET | Evento BM actualmente activo |
| `GET /api/events-v2/bm/:eventId` | GET | Detalle del evento BM con misiones |
| `POST /api/events-v2/bm` | POST | Crear evento BM |
| `PUT /api/events-v2/bm/:eventId` | PUT | Editar evento BM |
| `PUT /api/events-v2/bm/:eventId/progress` | PUT | Actualizar progreso del piloto |
| `GET /api/events-v2/bm/:eventId/progress` | GET | Consultar progreso del piloto |
| `GET /api/events-v2/bm/:eventId/discount` | GET | Cotización con descuento aplicado |
| `GET /api/events-v2/bm/:eventId/leaderboard` | GET | Tabla de clasificación |

> **Reglas de negocio BM:** ver ADR-007 §2 o `docs/adr/ADR-007-rediseno-eventos-v2.md`.

---

## 4. Hangar Militar & Upgrades 2.0 (`/api/planes`)

El módulo gestiona la flota oficial de **44 aeronaves de combate** y subsistemas de mejora mecánica, operando con una arquitectura de dos vistas (Vista 1: Grid Táctico y Vista 2: Pantalla Dedicada).

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

### `GET /api/planes/:id/details`

Devuelve la telemetría completa de una aeronave del hangar, incluyendo
campos extendidos extraídos de la Wiki de Metalstorm y localizados al español rioplatense (v3.9.9).

- **Acceso:** Autenticado (`requireAuth`).
- **Parámetros de ruta:** `:id` = ID del avión del jugador (numérico).

- **Response Exitosa (200 OK):**

```json
{
  "success": true,
  "message": "Telemetría de combate obtenida",
  "plane": {
    "id": 4,
    "user_id": 14,
    "avion_id": "209",
    "model_name": "Rafale F3-R",
    "type": "Mediano",
    "image_url": "https://...",
    "nivel": 17,
    "system_names": {
      "canones": "PRECISION CANNONS GIAT 30",
      "misiles_ir": "INFRARED MISSILES MICA IR"
    },
    "rutas_sistemas": {
      "fuselaje": 4,
      "motor": 8,
      "avionica": 6,
      "canones": 7
    },
    "stats_real": {
      "base_statistics": { },
      "advanced_statistics": { }
    },
    "descripcion": "A modern Medium Fighter from France, with excellent low-speed agility, and six heat-seeking missiles with enhanced range and look-and-shoot capability.",
    "descripcion_es": "Un caza mediano moderno de origen francés, dotado de sobresaliente agilidad a baja cota y seis misiles térmicos con alcance mejorado y capacidad de disparo fuera de eje.",
    "historia": "The Rafale F3-R is a multirole fighter aircraft, designed and built by French manufacturer Dassault...",
    "historia_es": "El Rafale F3-R es un caza polivalente diseñado y construido por el fabricante francés Dassault Aviation...",
    "recomendaciones": {
      "Trait Tips": ["..."],
      "Ability Tips": ["..."],
      "Passive Tips": ["..."],
      "General Tips": ["..."]
    },
    "recomendaciones_es": {
      "Trait Tips": ["Aprovechá la agilidad a baja velocidad para forzar tijeras."],
      "Ability Tips": ["Activá la postcombustión táctica al romper el cerco."],
      "Passive Tips": ["El blindaje reforzado mitiga impactos de fragmentación."],
      "General Tips": ["Mantené la altitud para conservar energía de maniobra."]
    },
    "loadout_wiki": {
      "canones": [
        {
          "Type": "Precision cannon",
          "Max Damage(DPS)": "192",
          "Ideal Range(km)": "0.8",
          "Reticle Range(km)": "1.0",
          "Spin-up Time(s)": "0",
          "Spread": "very low",
          "Overheat Time(s)": "3.4",
          "Ammo": "∞",
          "Armor Piercing": "none"
        }
      ],
      "misiles": [
        {
          "Guidance": "Heat-seeking missile",
          "Range Type": "Medium range",
          "Range(km)": "7.0",
          "Quantity": "6",
          "Damage": "80",
          "Speed(km/h)": "4680",
          "Turn Rate(°/s)": "45",
          "Lock Angle(°)": "10",
          "Lock Time(s)": "1.1"
        }
      ]
    },
    "paints": [
      {
        "Name": "Factory Gray",
        "Image": "https://metalstorm.wiki.gg/images/Paint-factory-gray-swatch.png",
        "Rarity": "Basic",
        "Decal Support": "Yes",
        "Unlock requirement": "Default"
      }
    ],
    "canopies": [
      {
        "Name": "Metallic Purple",
        "Image": "https://metalstorm.wiki.gg/images/Icon-canopy-metallic-purple-swatch.png",
        "Rarity": "Common",
        "Unlock Level": "4",
        "Gold Tier Unlock": "Yes"
      }
    ],
    "general_info_wiki": { ... },
    "wiki_url": "https://metalstorm.wiki.gg/wiki/Rafale_F3-R",
    "especial_nombre": "Arc Pulse",
    "especial_nivel_num": 3,
    "especial_efecto": "...",
    "pasiva_nombre": "Relentless Fire",
    "pasiva_nivel_num": 4,
    "pasiva_efecto": "...",
    "mod1_id": "m3",
    "mod1_lvl": 5,
    "mod2_id": null,
    "mod2_lvl": null,
    "desbloqueado_upgrades": true,
    "recursos_piezas": 1200,
    "recursos_avanzadas": 50,
    "sistemas_disponibles": {
      "fuselaje": true,
      "motor": true,
      "avionica": true,
      "canones": "precision",
      "misiles_ir": true,
      "misiles_radar": true,
      "cohetes": false
    },
    "sistemas": {
      "fuselaje": { ... },
      "motor": { ... },
      "avionica": { ... },
      "canones": { ... },
      "misiles_ir": { ... },
      "misiles_radar": { ... }
    },
    "upgrade_costs": { ... }
  },
  "data": { /* mismo objeto */ }
}
```

**Notas:**
- Los campos `descripcion`, `historia`, `recomendaciones`, `loadout_wiki`, `paints`, `canopies`, `general_info_wiki`, `wiki_url` provienen de la Wiki de Metalstorm (extracción 2026-09-12, traducción DeepL consolidada 2026-09-15).
- Si un avión no tiene datos de Wiki, los campos vienen como `null`.
- Los array de `paints` y `canopies` incluyen un campo `Image` con la URL de la imagen servida desde `metalstorm.wiki.gg`.

---

## 5. Administración Militar (`/api/admin`)

### `GET /api/admin/users` o `/api/admin/members`
Lista exhaustiva de combatientes con métricas dinámicas para el panel de administración.
- **Permisos:** Requiere rol `ADMIN` o `OWNER`.
- **Cálculo C4ISR en Tiempo Real:** Calcula dinámicamente:
  - `avg_tokens`: Promedio de tokens acumulado de todas las misiones registradas.
  - `weeks_evaluated`: Cantidad de semanas operativas evaluadas.
  - `perf_status`: Semáforo militar calculado según la normativa institucional (Art. 26: VERDE $\ge 175$, NARANJA $\ge 130$, ROJO $\ge 100$, NEGRO $< 100$, o PENDIENTE).
  - `inactive_reason`: Motivo oficial de inactivación si el piloto está de baja (`null` si está activo).
  - `inactive_by`: UUID del oficial que ejecutó la inactivación (`null` si está activo).
  - `inactive_at`: Marca de tiempo ISO de la baja militar (`null` si está activo).
  - `inactive_by_nick`: Callsign resuelto del oficial ejecutor de la baja.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Lista de pilotos obtenida con éxito",
    "data": [
      {
        "id": "3658df3a-3d15-4669-a595-dca33ec86fd3",
        "user_id": 14,
        "nick": "Viper_PY",
        "email": "viper@ffaa.py",
        "role": "OWNER",
        "status": "ACTIVE",
        "last_activity": "2026-09-08T15:30:00Z",
        "avg_tokens": 192,
        "weeks_evaluated": 14,
        "perf_status": "VERDE",
        "inactive_reason": null,
        "inactive_by": null,
        "inactive_at": null,
        "inactive_by_nick": null
      }
    ],
    "total": 1
  }
  ```

### `PUT /api/admin/users/:id/status` (o `PATCH`)
Modifica el estado operacional de un piloto militar entre `ACTIVE` e `INACTIVE` con registro obligatorio de motivo al inactivar.
- **Acceso:** Autenticado (`ADMIN`, `OWNER`).
- **Jerarquía de Mando:**
  - `OWNER`: Puede modificar a cualquier piloto excepto a sí mismo (`SELF_MODIFICATION_FORBIDDEN`).
  - `ADMIN`: Solo puede modificar a combatientes con rango `MIEMBRO` o `VETERANO`. Prohibido modificar a `ADMIN` u `OWNER` (`HIERARCHY_FORBIDDEN`).
- **Validación de Motivo:**
  - **Inactivación (`status = 'INACTIVE'`):** El campo `reason` es obligatorio (10 a 500 caracteres).
  - **Reactivación (`status = 'ACTIVE'`):** El campo `reason` es opcional (máximo 300 caracteres). Limpia `inactive_reason`, `inactive_by` e `inactive_at` a `null`.
- **Request Body (Inactivación):**
  ```json
  {
    "status": "INACTIVE",
    "reason": "Bajo rendimiento: 3 semanas consecutivas con semáforo rojo sin justificación médica o laboral."
  }
  ```
- **Request Body (Reactivación):**
  ```json
  {
    "status": "ACTIVE",
    "reason": "Piloto reincorporado tras superar período de licencia justificada."
  }
  ```
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Estado de Viper_PY actualizado a INACTIVE",
    "user": {
      "id": "3658df3a-3d15-4669-a595-dca33ec86fd3",
      "user_id": 14,
      "nick": "Viper_PY",
      "status": "INACTIVE",
      "inactive_reason": "Bajo rendimiento: 3 semanas consecutivas con semáforo rojo...",
      "inactive_by": "00000000-0000-0000-0000-000000000001",
      "inactive_at": "2026-09-16T02:00:00.000Z"
    }
  }
  ```
- **Errores Posibles:**
  - `400 BAD REQUEST`: `REASON_REQUIRED` (motivo ausente o <10 chars), `REASON_TOO_LONG` (>500 chars), `INVALID_STATUS`.
  - `403 FORBIDDEN`: `SELF_MODIFICATION_FORBIDDEN`, `HIERARCHY_FORBIDDEN`, `OWNER_PROTECTED`.
  - `404 NOT FOUND`: `USER_NOT_FOUND`.

### `GET /api/admin/users/inactive`
Lista exclusivamente a los pilotos que se encuentran en situación de baja (`status = 'INACTIVE'`), ordenados cronológicamente por fecha de baja descendente.
- **Acceso:** Autenticado (`ADMIN`, `OWNER`).
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "count": 33,
    "users": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "user_id": 25,
        "nick": "Phantom_Ghost",
        "email": "phantom@ffaa.py",
        "role": "MIEMBRO",
        "status": "INACTIVE",
        "inactive_reason": "Inactividad prolongada: más de 60 días sin conexión al simulador.",
        "inactive_by": "3658df3a-3d15-4669-a595-dca33ec86fd3",
        "inactive_at": "2026-09-10T18:45:00.000Z",
        "inactive_by_nick": "PJPIROVANI",
        "created_at": "2026-01-15T10:00:00.000Z"
      }
    ]
  }
  ```

### `PATCH /api/admin/users/:id/inactive-reason`
Permite regularizar, completar o rectificar el motivo de baja de un piloto inactivo (especialmente útil para pilotos inactivados antes de la v4.0.0 con motivo pendiente).
- **Acceso:** Autenticado (`ADMIN`, `OWNER`).
- **Restricción:** El piloto debe tener `status = 'INACTIVE'` (si está activo retorna error `USER_NOT_INACTIVE`).
- **Request Body:**
  ```json
  {
    "reason": "Baja temporal: Solicitud de licencia por razones de fuerza mayor documentada en WhatsApp."
  }
  ```
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Motivo de baja de Phantom_Ghost actualizado",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "nick": "Phantom_Ghost",
      "inactive_reason": "Baja temporal: Solicitud de licencia por razones de fuerza mayor documentada en WhatsApp."
    }
  }
  ```
- **Errores Posibles:**
  - `400 BAD REQUEST`: `REASON_REQUIRED` (motivo ausente o <10 chars), `REASON_TOO_LONG` (>500 chars), `USER_NOT_INACTIVE`.
  - `404 NOT FOUND`: `USER_NOT_FOUND`.

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

---

## 7. Gestión de Catálogo de Aeronaves (`/api/plane-models`)

*(Módulo v3.6.0 para administración y calibración del catálogo de flota aérea oficial)*

### `GET /api/plane-models`
Obtiene la lista de modelos de aviones del catálogo oficial.
- **Acceso:** Autenticado (`requireAuth`).
- **Query Params:**
  - `include_inactive`: `true` | `false` (por defecto `false` para pilotos, `true` para panel de administración).
  - `tier`: `1` | `2` | `3` | `4` | `5`.
  - `type`: Filtro de texto por tipo de caza.
  - `search`: Búsqueda textual en nombre, id o habilidades.
  - `all`: `true` para omitir paginación.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "models": [
      {
        "id": "101",
        "name": "F-5E Tiger II",
        "type": "Caza Ligero de Superioridad Aérea",
        "tier": 1,
        "is_active": true,
        "special_name": "Giro Táctico Rápido",
        "passive_name": "Resistencia Mejorada",
        "stats_real": {
          "velocidad": 1740,
          "agilidad": 78,
          "blindaje": 980,
          "potencia_armas": 1100
        },
        "sistemas_disponibles": {
          "fuselaje": true,
          "motor": true,
          "avionica": true,
          "armas": true
        }
      }
    ],
    "total": 24
  }
  ```

### `GET /api/plane-models/:id`
Obtiene los detalles completos y ficha técnica de un modelo específico.
- **Acceso:** Autenticado (`requireAuth`).
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "model": { ... }
  }
  ```

### `POST /api/plane-models`
Registra un nuevo modelo de avión en el catálogo del escuadrón.
- **Permisos:** Requiere rol `ADMIN` o `OWNER`.
- **Validación:** Validado vía Zod (`PlaneModelSchema`).
- **Auditoría:** Registrado en `audit_logs` con acción `CREATE_PLANE_MODEL`.
- **Request Body:**
  ```json
  {
    "id": "125",
    "name": "F-15EX Eagle II",
    "type": "Caza Pesado de Superioridad Aérea y Ataque",
    "tier": 4,
    "special_name": "Salva Masiva AMRAAM",
    "special_levels": { "1": "Alcance misil +15%", "2": "Alcance misil +30%" },
    "passive_name": "Radar AESA APG-82",
    "passive_levels": { "1": "Detección radar +20%", "2": "Detección radar +40%" },
    "stats_real": {
      "velocidad": 2650,
      "agilidad": 84,
      "blindaje": 1550,
      "potencia_armas": 1900
    },
    "sistemas_disponibles": {
      "fuselaje": true,
      "motor": true,
      "avionica": true,
      "armas": true
    },
    "is_active": true
  }
  ```
- **Response Exitosa (201 Created):**
  ```json
  {
    "success": true,
    "message": "Modelo de aeronave 'F-15EX Eagle II' registrado exitosamente",
    "model": { ... }
  }
  ```

### `PUT /api/plane-models/:id`
Actualiza los parámetros tácticos, estadísticos o habilidades de un modelo de avión existente.
- **Permisos:** Requiere rol `ADMIN` o `OWNER`.
- **Validación:** Validado vía Zod (`UpdatePlaneModelSchema`).
- **Auditoría:** Registrado en `audit_logs` con acción `UPDATE_PLANE_MODEL`.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Modelo de aeronave '125' actualizado exitosamente",
    "model": { ... }
  }
  ```

### `DELETE /api/plane-models/:id`
Desactiva un modelo de aeronave del catálogo militar (**Soft-Delete**).
- **Comportamiento:** Establece `is_active = false`. No borra datos físicos de la base de datos para no corromper los hangares de los pilotos que ya poseen este avión.
- **Permisos:** Requiere rol `ADMIN` o `OWNER`.
- **Auditoría:** Registrado en `audit_logs` con acción `DEACTIVATE_PLANE_MODEL`.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Modelo de aeronave '125' desactivado del catálogo militar (soft-delete)"
  }
  ```

### `POST /api/plane-models/:id/restore`
Reactiva un modelo previamente desactivado en el catálogo militar.
- **Comportamiento:** Establece `is_active = true`.
- **Permisos:** Requiere rol `ADMIN` o `OWNER`.
- **Auditoría:** Registrado en `audit_logs` con acción `RESTORE_PLANE_MODEL`.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Modelo de aeronave '125' reactivado exitosamente en el catálogo militar",
    "model": { ... }
  }
  ```

---

## 🛒 Módulo Black Market (BM) - v3.7.0

Sistema de eventos tácticos especiales que reemplaza al Squadron Event cada 1-2 meses.
- **Duración:** 5 días de combate (miércoles a domingo).
- **Misiones Diarias:** 3 misiones diarias (Dedicación, Habilidad, Trabajo en equipo).
- **Puntuación:** 25 pts por misión cumplida + 25 pts de bonus al completar las 3 del día (50 pts/día, máx 250 pts).
- **Descuento:** 1 punto = 0.2% de descuento (máximo 50% de descuento con 250 puntos).

### `GET /api/bm/events`
Obtiene la lista histórica y actual de eventos Black Market.
- **Permisos:** Requiere token de autenticación.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "events": [
      {
        "id": 1,
        "name": "Operación Black Market F-15EX",
        "start_date": "2026-03-04T00:00:00.000Z",
        "end_date": "2026-03-08T23:59:59.000Z",
        "is_active": true,
        "aircraft_id": "125",
        "aircraft_name": "F-15EX Eagle II"
      }
    ]
  }
  ```

### `GET /api/bm/events/active`
Obtiene los detalles del evento Black Market actualmente activo, incluyendo el día operativo actual (1 a 5) y el tiempo restante.
- **Permisos:** Requiere token de autenticación.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "active": true,
    "event": { ... },
    "current_day": 3,
    "remaining_ms": 172800000
  }
  ```

### `POST /api/bm/events`
Crea un nuevo evento Black Market en el sistema.
- **Permisos:** Requiere rol `ADMIN` o `OWNER`.
- **Validación:** Validado vía Zod (`CreateBmEventSchema`).
- **Body:**
  ```json
  {
    "name": "Operación Black Market Su-57",
    "description": "Evento táctico especial de 5 días con descuento en caza furtivo.",
    "start_date": "2026-04-01T00:00:00.000Z",
    "end_date": "2026-04-05T23:59:59.000Z",
    "aircraft_id": "126",
    "is_active": false
  }
  ```

### `POST /api/bm/events/:id/activate` / `POST /api/bm/events/:id/deactivate`
Activa o desactiva un evento Black Market.
- **Permisos:** Requiere rol `ADMIN` o `OWNER`.
- **Auditoría:** Registrado en eventos de seguridad y auditoría.

### `GET /api/bm/missions/today`
Obtiene las 3 misiones tácticas correspondientes al día operativo actual, con el estado de completado para el usuario solicitante.
- **Permisos:** Requiere token de autenticación.

### `GET /api/bm/missions/:eventId`
Obtiene todas las misiones del evento agrupadas por los 5 días (1 a 5).
- **Permisos:** Requiere token de autenticación.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "missions": [ ... ],
    "by_day": {
      "1": [ ... ],
      "2": [ ... ],
      "3": [ ... ],
      "4": [ ... ],
      "5": [ ... ]
    }
  }
  ```

### `POST /api/bm/missions/:id/complete`
Marca o desmarca una misión como completada por el piloto autenticado.
- **Permisos:** Requiere token de autenticación.
- **Body:** `{ "completed": true }`
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "¡Misión táctica completada! +25 puntos adjudicados",
    "progress": {
      "mission_id": "bm-1-1-dedication",
      "completed": true,
      "points_earned": 25
    }
  }
  ```

### `POST /api/bm/missions` / `PUT /api/bm/missions/:id` / `DELETE /api/bm/missions/:id`
Gestión de misiones tácticas (Creación, edición y soft-delete con `is_active: false`).
- **Permisos:** Requiere rol `ADMIN` o `OWNER`.

### `GET /api/bm/progress`
Devuelve el desglose detallado de puntos, bonus por día completado, total acumulado y porcentaje de descuento del piloto.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "active": true,
    "total_points": 125,
    "discount_percentage": 25,
    "completed_count": 4,
    "bonus_points": 25,
    "completed_by_day": { "1": 3, "2": 1 }
  }
  ```

### `GET /api/bm/discount`
Obtiene la cotización oficial de la aeronave en promoción aplicando el descuento militar ganado.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "active": true,
    "aircraft": { "name": "F-15EX Eagle II", "tier": 4 },
    "total_points": 200,
    "discount_percentage": 40,
    "pricing": {
      "base_price": 5000,
      "discount_amount": 2000,
      "final_price": 3000
    },
    "purchased": false
  }
  ```

### `POST /api/bm/discount/purchase`
Efectúa la adquisición de la aeronave aplicando el descuento ganado e incorporándola al hangar del piloto.
- **Permisos:** Requiere token de autenticación.

### `GET /api/bm/stats`
Estadísticas consolidadas del evento (participantes, puntos acumulados, compras realizadas).
- **Permisos:** Requiere token de autenticación.

### `GET /api/bm/leaderboard`
Tabla de clasificación ordenada por puntos acumulados en el Black Market activo.
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "leaderboard": [
      {
        "rank": 1,
        "user_id": 1,
        "nick": "FALCON-01",
        "role": "OWNER",
        "total_points": 250,
        "discount_percentage": 50,
        "completed_missions": 15,
        "days_active": 5,
        "purchased": true
      }
    ]
  }
  ```

---

*Versión: v4.0.5 · Actualizado: 18 Septiembre 2026*


