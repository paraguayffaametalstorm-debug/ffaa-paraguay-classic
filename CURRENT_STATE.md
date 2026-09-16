# 📊 CURRENT STATE - PARAGUAY-FFAA | METALSTORM

> **⚠️ NO MODIFICAR - ESTADO CONGELADO**  
> **Fecha de Congelamiento:** 2026-09-16  
> **Versión Activa:** v4.0.0  
> **Ambiente:** Producción Fly.io (`gru`) & Supabase PostgreSQL  
> **Responsable:** Mando C4ISR Escuadrón PARAGUAY FFAA `[PRY]`

---

## 🎯 Resumen Ejecutivo

El sistema **PARAGUAY-FFAA | METALSTORM** está funcionando al 100% de su capacidad operativa en el entorno de producción (v4.0.0). Los módulos críticos de autenticación, control de mando RBAC, registro de rendimiento semanal y gestión de la base de datos han sido auditados exhaustivamente.

Específicamente, en las versiones v3.9.9 y v4.0.0 se ha consolidado:
1. **Rediseño Completo del Hangar Militar:** Migración de carrusel rígido a doble arquitectura: **Vista 1 (Grid Táctico de Tarjetas)** para navegación ágil y **Vista 2 (Pantalla Dedicada / Detalle Completo de Aeronave)** con botón "← VOLVER AL HANGAR", accesos directos a calibración de Upgrades 2.0 y telemetría de combate profunda.
2. **Sistema Integral de Traducción (i18n):** Extracción, traducción mediante DeepL y persistencia en Supabase de `descripcion_es`, `historia_es` y `recomendaciones_es`, con degradación elegante a inglés y diccionario cliente de los 13 traits oficiales (`TRAITS_ES`).
3. **Catálogo Oficial Consolidado a 44 Aeronaves:** 44 cazas normalizados con armas y subsistemas específicos validados.
4. **Sistema Táctico de Gestión de Pilotos Inactivos (v4.0.0):** Registro obligatorio de motivo al inactivar, trazabilidad de oficial y fecha, resolución batch de comandantes, mensaje enriquecido de bloqueo en autenticación y pestañas tácticas con modales dedicados en el panel de administración militar.

---

## 🛡️ Sistema Táctico de Gestión de Pilotos Inactivos (v4.0.0)

### Infraestructura de Base de Datos
- **3 columnas agregadas a `users`:**
  - `inactive_reason` (`TEXT`): Motivo detallado de la baja (10-500 caracteres).
  - `inactive_by` (`UUID` FK a `users.id` con `ON DELETE SET NULL`): Oficial de mando que ejecutó la baja.
  - `inactive_at` (`TIMESTAMPTZ`): Timestamp exacto de la baja.
- Limpieza automática a `NULL` al reactivar (`status = 'ACTIVE'`).

### Estado Actual del Padrón Militar (2026-09-15)
- **Total de Usuarios:** 61
- **Pilotos Activos:** 28
- **Pilotos Inactivos:** 33

### Endpoints Operativos
- `PUT/PATCH /api/admin/users/:id/status`: Inactivación con motivo obligatorio (10-500 chars), reactivación con motivo opcional (hasta 300 chars).
- `GET /api/admin/users/inactive`: Nómina exclusiva de inactivos con `inactive_by_nick` resuelto en batch.
- `PATCH /api/admin/users/:id/inactive-reason`: Regularización de motivos históricos.

### Control de Acceso & Fallback
- `requireAuth` consulta primero `users` (`inactive_reason`, `inactive_by`, `inactive_at`). Si están en `NULL` (inactivos históricos), consulta `audit_logs` (`target_id = user.id`, `action IN ('USER_DEACTIVATED', 'USER_INACTIVATED', 'USER_STATUS_CHANGE')`) y resuelve `actor_nick`. Retorna 403 enriquecido.

### Panel de Administración Táctico
- Pestañas `🟢 Activos (N)`, `🔴 Inactivos (N)`, `📋 Todos (N)` con recuento dinámico en vivo.
- Columnas dinámicas en pestaña inactivos: *"Motivo de Baja"* (con botón `✏️ Completar` si está vacío) e *"Inactivado por"*.
- Modales tácticos con selectores de motivos reglamentarios y contadores de caracteres.

---

## 🔐 Flujo de Recuperación de Contraseña por Email (v3.9.9)

### Infraestructura

- **Tabla `password_resets` en Supabase:**
  - `id` (UUID PK), `user_id` (UUID FK), `token` (TEXT UNIQUE), `expires_at` (TIMESTAMPTZ), `used` (BOOLEAN default false), `created_at` (TIMESTAMPTZ default now()).
  - Índices: `idx_password_resets_token`, `idx_password_resets_user_id`, `idx_password_resets_expires_at`, `idx_password_resets_used`.
  - RLS habilitado con política `no_public_access`.

- **SMTP Gmail configurado en Fly.io:**
  - Cuenta: `paraguayffaa.metalstorm@gmail.com`
  - Secrets: `EMAIL_HOST`, `EMAIL_PORT` (587), `EMAIL_SECURE` (false), `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`.
  - Contraseña de aplicación de 16 caracteres generada en [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).
  - Contraseña guardada en Bitwarden.

### Flujo

1. Piloto hace clic en **"¿Olvidaste tu clave?"** en el login.
2. `POST /api/auth/forgot-password` → genera token con `crypto.randomBytes(32)`.
3. `INSERT` en `password_resets` con `expires_at = NOW() + 15 min`.
4. Backend envía correo HTML militar C4ISR vía Nodemailer con enlace:
   `https://paraguay-ffaa-metalstorm.fly.dev/reset-password?token=<TOKEN>`
5. Piloto hace clic en el enlace → va a `/reset-password.html`.
6. Ingresa nueva contraseña (mín 8 chars, 1 mayúscula, 1 minúscula, 1 número).
7. `POST /api/auth/reset-password` → valida token, actualiza `password_hash`, incrementa `token_version`, marca `used = true`.
8. Piloto hace login con nueva contraseña.

### Auditoría

Todos los eventos se registran en `security_events`:
- `PASSWORD_RESET_REQUESTED`
- `PASSWORD_RESET_SUCCESS`

---

## ⚠️ Limitación Crítica: Correos Reales

**Este es un punto crítico de la operación actual:**

- **Solo ~2% de los pilotos tienen Gmail real vinculado** (únicamente `PJPIROVANI`, OWNER).
- **El 98% restante tiene emails `@ffaa.py` ficticios** que rebotan (el dominio no existe en internet).
- **Consecuencia:** El flujo de "¿Olvidaste tu clave?" solo funciona para quienes tienen Gmail real.
- **Método principal de recuperación:** Reset administrativo desde el Panel Admin (genera clave temporal `MS-XXXX-XXXX`).
- **Plan a futuro:** Campaña de vinculación de Gmail para todos los pilotos.

---

## 🔒 Mensaje Enriquecido al Bloquear Inactivos (v3.9.9)

A partir de v3.9.9, el middleware `requireAuth` (`src/middlewares/auth.js`) implementa un mensaje detallado cuando un piloto con `status = 'INACTIVE'` intenta acceder.

**Ejemplo de respuesta:**
```json
{
  "error": "⚠️ ACCESO DENEGADO: Su cuenta ha sido inactivada por el Comandante [NICK] el [FECHA]. No tiene acceso a la plataforma del escuadrón. Comuníquese con el Comando Central para más información.",
  "code": "USER_INACTIVE",
  "details": {
    "inactive_by": "el Comandante [NICK]",
    "inactive_at": "2026-09-10T01:15:01.048Z",
    "contact": "comando.central@ffaa.py"
  }
}
```

**Fallback:** Si no existe registro en `audit_logs`, el mensaje dice genéricamente "el Comando Central".

---

## 🏆 Última Prueba Exitosa de Validación

| Parámetro | Detalle Militar |
|---|---|
| **Piloto Evaluado** | `TestPilot` (Indicativo de pruebas operacionales) |
| **Identificador Numérico (`user_id`)** | `1000` (INTEGER) |
| **Identificador Interno (`id`)** | `3658df3a-3d15-4669-a595-dca33ec86fd3` (UUID) |
| **Correo Institucional** | `testpilot@ffaa.py` |
| **Contraseña Temporal Asignada** | `MS-MJWT-SU3U` (Generada por Administrador) |
| **Nueva Contraseña Reglamentaria** | `Dni32355353` (Definida por el piloto) |
| **Fecha y Hora de la Prueba** | `2026-09-09 23:54:52 UTC` |
| **Token Version Resultante** | `2` (Incrementado desde `1`) |
| **Estado de Cambio Obligatorio** | `must_change_password: false` |
| **Resultado Global** | **✅ COMPLETO Y VALIDADO EN PRODUCCIÓN** |

---

## 🏛️ Reglas de Arquitectura y Negocio Vigentes

1. **Dualidad de Identificadores en `users`:**
   - `user_id` es siempre de tipo **`INTEGER`** (incremental, visible en reportes tácticos, selector de pilotos y telemetría).
   - `id` es siempre de tipo **`UUID`** (clave primaria interna en PostgreSQL / Supabase).
2. **Ciclo de Vida de Credenciales:**
   - Todo nuevo usuario creado por el oficial `ADMIN` nace con `must_change_password = true` y `token_version = 1`.
   - La contraseña temporal responde estrictamente al formato `MS-XXXX-XXXX`.
   - El endpoint `/api/auth/change-password` soporta tanto el modo forzado (`isForced: true` o `must_change_password: true`) como el cambio voluntario desde el perfil.
3. **Invalidación Criptográfica Anti-Sesión Fantasma:**
   - Cada cambio de contraseña incrementa `token_version` en `+1`, invalidando inmediatamente cualquier JWT anterior en circulación.
4. **Resolución de Consultas Tipadas:**
   - Todos los controladores (`auth`, `admin`, `profile`, `performances`) implementan filtros dinámicos que diferencian UUID regex de números enteros para prevenir fallos de casting en PostgreSQL.

---

## 🛡️ Estado de Módulos (Actualizado 2026-09-15 - v3.9.9)

| Módulo | Estado | Detalle |
|--------|--------|---------|
| **Autenticación Dual** | ✅ Funcional | Login con email o Gmail |
| **Cambio de Contraseña** | ✅ Funcional | Lógica tipada UUID/INTEGER |
| **Registro de Rendimiento** | ✅ Funcional | Guarda `role` histórico |
| **Black Market** | ✅ Funcional | Misiones, progreso, descuentos |
| **Catálogo de Aviones** | ✅ Normalizado | 44 modelos oficiales con armas específicas |
| **Hangar de Pilotos (Vista 1 Grid)** | ✅ Funcional | Grid táctico con `overrideCarouselCardClick` |
| **Hangar de Pilotos (Vista 2 Dedicada)**| ✅ Funcional | Detalle completo con botón volver y enlaces a Upgrades |
| **Sistema i18n (DeepL + Fallback)** | ✅ Funcional | `_es` en BD + fallback a EN + 13 traits (`TRAITS_ES`) |
| **Validación de Sistemas** | ✅ Funcional | Sistema disponible por avión |
| **Modal de Datos Profundos** | ✅ Funcional | Muestra nombre, ID, stats y armas |
| **IA de Recomendación** | ✅ Funcional | 3 estilos de combate |
| **Upgrade Planner** | ✅ Funcional | Previsualización de builds |
| **Efectos de Mods** | ✅ Funcional | 10 mods x 5 niveles aplicados a stats |
| **Descarga de Credencial** | ✅ Funcional | Imagen JPG |
| **PWA Offline** | ✅ Funcional | Service Worker v3.9.8 |
| **Modal de Stats (Grid Cards)** | ✅ Funcional | Grid responsive 1-4 columnas |
| **Integración Wiki (Historia)** | ✅ Funcional | 44 aviones con trivia (traducida al español) |
| **Integración Wiki (Paints)** | ✅ Funcional | 310+ paints en galería |
| **Integración Wiki (Canopies)** | ✅ Funcional | 176 canopies en galería |
| **Integración Wiki (Loadout)** | ✅ Funcional | Stats detalladas por arma |

## 🛠️ Sistema de Aviones (Actualizado 2026-09-15)

El sistema de aviones fue normalizado, calibrado y dotado de validación técnica de armamento:

- ✅ 44 modelos en el catálogo maestro con armas y subsistemas específicos (`sistemas_disponibles` en JSONB)
- ✅ **`upgrade_nodes_v2` documentada:** Tabla con 3.072 filas que modela el árbol de mejoras Starform Upgrades 2.0
- ✅ Validación previa en `updatePlaneSystem` (`src/controllers/planes.controller.js`) que impide calibrar sistemas no soportados (ej: cañones en F-111 / J-20)
- ✅ 10 mods disponibles con efectos numéricos (m1..m10 en 5 niveles)
- ✅ 4 subsistemas mejorables (Fuselaje, Motor, Aviónica, Armas/Cañones según disponibilidad)
- ✅ Habilidades Especiales (3 niveles) y Pasivas (5 niveles) con imágenes oficiales
- ✅ IA de Recomendación (3 estilos de combate)
- ✅ Upgrade Planner (previsualización cuantitativa de builds)
- ✅ Integración de efectos de mods en telemetría de combate (`getPlaneStats`)
- ✅ Diccionario oficial de 13 traits traducidos al español rioplatense militar (`TRAITS_ES`)

### 🎯 Estructura de `sistemas_disponibles` (44 Aviones)
Cada modelo en `plane_models` define detalladamente su arquitectura:
- `fuselaje`: `true`
- `motor`: `true`
- `avionica`: `true`
- `canones`: `"precision"` | `"asalto"` | `null`
- `misiles_ir`, `misiles_radar`, `misiles_beam`, `misiles_manual`, `misiles_largo`, `cohetes`: `true` | `false`

### ⚡ Efectos de Mods (10 Mods × 5 Niveles)
- **Siempre Activos en Stats:**
  - `m1` (Daredevil Turning) & `m2` (Ideal Maneuvering) $\to$ `agility`
  - `m3` (Blast Resistance) $\to$ `armor`
  - `m7` (Disruptive Flares) $\to$ `ecm`
  - `m10` (Improved Targeting) $\to$ `radar`
- **Condicionales & Utilitarios:** `m4` (kills), `m5` (postquemador), `m6` (<50% comb.), `m8` (cooldown), `m9` (<30% HP enem.) registrados para telemetría dinámica.

---

## ⚠️ Nota Operativa y Bug de UI Detectado

> **Bug de Interfaz:** En ciertos navegadores y resoluciones compactas, el modal de cambio forzado de contraseña no despliega con claridad los botones de acción inferior.  
> **Instrucción al Combatiente:** El formulario responde y procesa la actualización presionando la tecla **`ENTER`** directamente en el campo de confirmación de contraseña.  
> **Fix Programado:** Ajuste de layout CSS en `components/change-password-modal.html` para asegurar visibilidad constante del botón *"Actualizar Credencial"*.

---

## 🎨 9. Datos de la Wiki e i18n Integrados (v3.9.9)
- **Fuente:** https://metalstorm.wiki.gg/wiki/Aircraft
- **Fecha de extracción:** 2026-09-12 (Traducción DeepL consolidada 2026-09-15)
- **Volumen:**
  - 44 aviones de combate.
  - 310+ paints (con nombre, imagen, raridad, requisito).
  - 176 canopies (44 × 4).
  - 41 historias (3 sin trivia: KF-21, A-6, A-10) traducidas al español (`historia_es`).
  - 44 recomendaciones tácticas traducidas al español (`recomendaciones_es`).
  - 44 loadouts detallados (cañones y misiles con stats).
  - 44 descripciones in-game traducidas al español (`descripcion_es`).
  - 13 traits únicos traducidos mediante `TRAITS_ES`.

- **Columnas de Wiki e i18n en `plane_models`:**

| Columna | Tipo | Contenido |
|---------|------|-----------|
| `descripcion` | TEXT | Descripción in-game (EN) |
| `descripcion_es` | TEXT | Descripción in-game traducida (ES) |
| `historia` | TEXT | Trivia multi-párrafo (EN) |
| `historia_es` | TEXT | Trivia multi-párrafo traducida (ES) |
| `recomendaciones` | JSONB | Tips tácticos (EN) |
| `recomendaciones_es` | JSONB | Tips tácticos traducidos (ES) |
| `loadout_wiki` | JSONB | Armamento detallado |
| `paints` | JSONB | Array de paints |
| `canopies` | JSONB | Array de canopies |
| `general_info_wiki` | JSONB | Info general |
| `wiki_url` | TEXT | URL de la Wiki |
| `wiki_extracted_at` | TIMESTAMPTZ | Timestamp de extracción |

- **Frontend:** Vista 1 (Grid Táctico) y Vista 2 (Pantalla Dedicada). Modal `#aircraftDeepModal` con grid responsive de cards. Fallback automático a inglés cuando el contenido en español no está disponible.
