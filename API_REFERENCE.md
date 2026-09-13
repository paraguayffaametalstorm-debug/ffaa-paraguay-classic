# 📡 Referencia de la API RESTful - PARAGUAY-FFAA | METALSTORM

> **Documentación exhaustiva de endpoints, parámetros, cabeceras de autorización y esquemas de respuesta para la versión v3.6.0 del núcleo táctico.**

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
| **Events** | `/api/events/open` o `/active` | `GET` | Autenticado | Datos del evento activo actual |
| **Performances**| `/api/performances` | `POST` | Autenticado | Registrar tokens y evaluar estado militar |
| **Performances**| `/api/performances/pilots` | `GET` | Autenticado | Selector táctico de pilotos para ADMIN/OWNER |
| **Performances**| `/api/performances/history` | `GET` | Autenticado | Historial personal de eventos y tokens |
| **Performances**| `/api/performances/stats` | `GET` | Autenticado | Estadísticas calculadas del piloto |
| **Performances**| `/api/performances/all` | `GET` | `ADMIN` / `OWNER` | Lista global de rendimientos |
| **Performances**| `/api/performances/export` | `GET` | `ADMIN` / `OWNER` | Descargar reporte CSV sanitizado |
| **Planes** | `/api/planes/catalog/plane-models` | `GET` | Público | Catálogo oficial de 23 cazas militares |
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
    "message": "Si el correo está registrado, se enviaron las instrucciones de restablecimiento."
  }
  ```

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
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Contraseña actualizada exitosamente. Todas las sesiones activas han sido cerradas."
  }
  ```

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

## 4. Hangar Militar & Upgrades 2.0 (`/api/planes`)

El módulo gestiona la flota de **23 aeronaves de combate** y subsistemas de mejora mecánica.

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
campos extendidos extraídos de la Wiki de Metalstorm (Fase 3C).

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
      "misiles_ir": "INFRARED MISSILES MICA IR",
      ...
    },
    "rutas_sistemas": {
      "fuselaje": 4,
      "motor": 8,
      "avionica": 6,
      "canones": 7
    },
    "stats_real": {
      "base_statistics": { ... },
      "advanced_statistics": { ... }
    },
    "descripcion": "A modern Medium Fighter from France, with excellent low-speed agility, and six heat-seeking missiles with enhanced range and look-and-shoot capability.",
    "historia": "The Rafale F3-R is a multirole fighter aircraft, designed and built by French manufacturer Dassault. In the late 1970's France had entered into an agreement with the UK, Germany, Italy and Spain...\n\n82-0062 was destroyed in a fatal crash on October 14, 1984...",
    "recomendaciones": {
      "Trait Tips": ["..."],
      "Ability Tips": ["..."],
      "Passive Tips": ["..."],
      "General Tips": ["..."]
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
- Los campos `descripcion`, `historia`, `recomendaciones`, `loadout_wiki`, `paints`, `canopies`, `general_info_wiki`, `wiki_url` provienen de la Wiki de Metalstorm (extracción 2026-09-12).
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
- **Response Exitosa (200 OK):**
  ```json
  {
    "success": true,
    "message": "Lista de pilotos obtenida con éxito",
    "data": [
      {
        "id": 14,
        "user_id": 14,
        "nick": "Viper_PY",
        "email": "viper@ffaa.py",
        "role": "OWNER",
        "status": "ACTIVE",
        "last_activity": "2026-09-08T15:30:00Z",
        "avg_tokens": 192,
        "weeks_evaluated": 14,
        "perf_status": "VERDE"
      }
    ],
    "total": 1
  }
  ```

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


