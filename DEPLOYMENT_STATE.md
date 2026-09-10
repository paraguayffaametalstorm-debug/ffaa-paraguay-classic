# 🚀 DEPLOYMENT STATE - PARAGUAY-FFAA | METALSTORM

> **⚠️ ESTADO CONGELADO - NO MODIFICAR SIN REVISIÓN MANUAL**  
> **Fecha de Congelamiento:** 2026-09-09  
> **Versión:** v3.7.0  
> **Entorno:** Producción (`Fly.io` región `gru` - São Paulo / Supabase PostgreSQL)  
> **Estado Operativo:** ✅ 100% OPERATIVO - AUDITADO Y PROBADO

---

## 📑 Resumen Ejecutivo del Despliegue

Este documento maestro consolida la arquitectura en ejecución, el esquema de base de datos validado, el flujo crítico de registro y cambio de contraseña con autenticación dual y el historial de correcciones de tipos (UUID vs INTEGER) aplicadas en la versión v3.7.0 del sistema **PARAGUAY-FFAA | METALSTORM**.

### Indicadores de Salud Operativa
- **Core de Autenticación:** ✅ Operativo (Login Dual, Google OAuth 2.0 y JWT criptográfico con `token_version`).
- **Registro de Pilotos por Mando:** ✅ Operativo con auto-asignación incremental de `user_id` entero y hash temporal `MS-XXXX-XXXX`.
- **Cambio de Contraseña Forzado:** ✅ Operativo con resolución tipada dinámica (`UUID`, `INTEGER` o `email`).
- **Inactivación de Sesiones Fantasma:** ✅ Operativa mediante incremento secuencial de `token_version`.
- **Persistencia en Supabase:** ✅ Operativa con RLS e integridad referencial íntegra.

---

## 🗄️ 1. Estructura de Supabase (Tabla `users`)

El esquema de base de datos en PostgreSQL (Supabase) cuenta con definición tipada estricta:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER UNIQUE NOT NULL,
    email TEXT UNIQUE,
    email_institucional TEXT,
    nick TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'MIEMBRO',
    status TEXT DEFAULT 'ACTIVE',
    must_change_password BOOLEAN DEFAULT true,
    token_version INTEGER DEFAULT 1,
    google_linked BOOLEAN DEFAULT false,
    google_id TEXT,
    full_name TEXT,
    email_personal TEXT,
    phone TEXT,
    bio TEXT,
    notifications_enabled BOOLEAN DEFAULT false,
    avg_tokens INTEGER DEFAULT 0,
    weeks_evaluated INTEGER DEFAULT 0,
    perf_status TEXT DEFAULT 'VERDE',
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### ⚠️ Reglas de Negocio Críticas

| Parámetro | Tipo / Valor por Defecto | Regla Táctica Inviolable |
|---|---|---|
| `user_id` | `INTEGER` (`UNIQUE`, `NOT NULL`) | **NUNCA UUID**. Es el identificador secuencial visible y numérico del combatiente (e.g., `1000`). |
| `id` | `UUID` (`PRIMARY KEY`) | **NUNCA INTEGER**. Identificador interno único generado por Supabase (`gen_random_uuid()`). |
| `must_change_password` | `BOOLEAN` (`DEFAULT true`) | Al crearse un usuario o resetearse administrativamente, se fuerza a `true`. |
| `token_version` | `INTEGER` (`DEFAULT 1`) | Se incrementa (`+1`) en cada cambio o reseteo de clave para invalidar tokens JWT antiguos. |
| `password_hash` | `TEXT` (`NOT NULL`) | Generado mediante `bcrypt` con factor de coste (salt rounds) 10. |

---

## 🔄 2. Flujo Completo de Registro y Cambio de Contraseña

```text
┌─────────────────────────────────────────────────────────────────────────┐
│              FLUJO DE REGISTRO Y CAMBIO DE CONTRASEÑA                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 1: ADMIN crea un nuevo usuario                                    │
│                                                                         │
│   Endpoint: POST /api/admin/members                                     │
│   Datos: { email, nick, role }                                         │
│                                                                         │
│   ✅ user_id: INTEGER (auto-incremental)                               │
│   ✅ password_hash: bcrypt(MS-XXXX-XXXX)                               │
│   ✅ must_change_password: true                                        │
│   ✅ token_version: 1                                                  │
│                                                                         │
│   Respuesta: { temporaryPassword: "MS-XXXX-XXXX" }                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 2: Usuario recibe contraseña temporal                             │
│                                                                         │
│   "MS-MJWT-SU3U" (ejemplo real)                                        │
│                                                                         │
│   📝 El ADMIN debe entregar la contraseña por canal seguro              │
│      (WhatsApp, Discord, etc.)                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 3: Usuario hace login con contraseña temporal                     │
│                                                                         │
│   Endpoint: POST /api/auth/login                                        │
│   Datos: { email, password: "MS-XXXX-XXXX" }                          │
│                                                                         │
│   ✅ Busca por email O email_institucional                             │
│   ✅ Verifica bcrypt(password_hash)                                    │
│   ✅ Responde con token JWT y must_change_password: true              │
│                                                                         │
│   Respuesta: { token, user: { must_change_password: true } }          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 4: Modal de cambio forzado aparece                                │
│                                                                         │
│   🔴 NOTA: El modal NO muestra botones visibles                        │
│   ✅ Pero funciona presionando ENTER en el campo de contraseña         │
│                                                                         │
│   ⚠️ Este es un bug de UI que no afecta la funcionalidad               │
│   💡 Fix pendiente: Agregar botón "Actualizar Credencial"              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 5: Usuario cambia contraseña (FORZADO)                            │
│                                                                         │
│   Endpoint: POST /api/auth/change-password                             │
│   Headers: Authorization: Bearer <TOKEN>                              │
│   Datos: { newPassword: "Dni32355353", isForced: true }               │
│                                                                         │
│   ✅ Busca usuario con LÓGICA TIPADA:                                   │
│      - Si id es UUID → eq('id', user.id)                              │
│      - Si user_id es INTEGER → eq('user_id', Number(user.user_id))   │
│      - Si email disponible → eq('email', user.email)                  │
│                                                                         │
│   ✅ Actualiza:                                                         │
│      - password_hash = bcrypt(newPassword)                            │
│      - must_change_password = false                                   │
│      - token_version = token_version + 1                              │
│      - updated_at = NOW()                                             │
│                                                                         │
│   ✅ Usa .select() después de .update() para confirmar                 │
│                                                                         │
│   Respuesta: { success: true, token_version: 2 }                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 6: Verificación en Supabase                                       │
│                                                                         │
│   SELECT must_change_password, token_version FROM users                │
│   WHERE email = 'testpilot@ffaa.py'                                   │
│                                                                         │
│   ✅ must_change_password: false                                       │
│   ✅ token_version: 2                                                  │
│   ✅ password_hash: Hash de "Dni32355353"                             │
│   ✅ updated_at: Fecha/hora actual                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 7: Usuario login con nueva contraseña                             │
│                                                                         │
│   Endpoint: POST /api/auth/login                                        │
│   Datos: { email, password: "Dni32355353" }                           │
│                                                                         │
│   ✅ 200 OK con token                                                  │
│   ✅ must_change_password: false                                       │
│   ✅ token_version: 2                                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 3. El Fix de Lógica Tipada en `changePassword()`

### Diagnóstico del Problema Original
En versiones anteriores, el controlador asumía que la clave primaria o el identificador en memoria era invariablemente un UUID. Al pasar un `user_id` de tipo entero o una estructura mixta procedente de sesiones tokenizadas, la consulta en Supabase fallaba con error de cast de tipo o no actualizaba ninguna fila:

```javascript
// ❌ IMPLEMENTACIÓN ANTERIOR: FORZABA UUID SIEMPRE
const { data: updateData, error: updateError } = await supabase
    .from('users')
    .update({ ... })
    .eq('id', user.id)  // ⚠️ FALLABA CUANDO user_id ERA INTEGER O NO COINCIDÍA FORMATO UUID
    .select(...);
```

### Solución Implementada (Lógica Tipada y Polimórfica)
Se implementó una evaluación jerárquica y validada por expresiones regulares que detecta si el identificador es UUID válido, número entero (`user_id`), o utiliza como salvaguarda el correo electrónico:

```javascript
// ✅ SOLUCIÓN ACTUAL: LÓGICA TIPADA POLIMÓRFICA
let updateQuery = supabase.from('users').update({
    password_hash: newHash,
    must_change_password: false,
    token_version: newTokenVersion,
    updated_at: new Date().toISOString()
});

if (user.id && typeof user.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
    updateQuery = updateQuery.eq('id', user.id);
} else if (user.user_id && (typeof user.user_id === 'number' || /^\d+$/.test(String(user.user_id)))) {
    updateQuery = updateQuery.eq('user_id', Number(user.user_id));
} else if (user.email) {
    updateQuery = updateQuery.eq('email', user.email);
} else {
    updateQuery = updateQuery.eq('id', user.id);
}

const { data: updateData, error: updateError } = await updateQuery
    .select('id, email, nick, user_id, role, token_version, must_change_password');
```

### Logs de Confirmación en Runtime
```text
🔍 [changePassword] Actualizando usuario con: {
  id: '3658df3a-3d15-4669-a595-dca33ec86fd3',
  user_id: 1000,
  newTokenVersion: 2,
  newHash: '$2b$10$as8vQDbgnRgh5...'
}
✅ [changePassword] Filas actualizadas con éxito: 1
```

---

## 📂 4. Archivos Modificados y Commits de Referencia

| Archivo | Cambio Realizado | Fecha |
|---|---|:---:|
| `src/controllers/auth.controller.js` | Lógica tipada en `changePassword()`, logs de depuración y select post-update | 2026-09-09 |
| `src/routes/admin.routes.js` | Consultas tipadas en endpoint de reseteo administrativo `reset-password` | 2026-09-09 |
| `src/controllers/admin.controller.js` | Consultas tipadas en `updateUserRole` y `updateUserStatus` | 2026-09-09 |
| `src/controllers/profile.controller.js` | Consultas tipadas polimórficas en `getProfile` y `updateProfile` | 2026-09-09 |
| `src/controllers/performances.controller.js` | Consultas tipadas en `savePerformance` y `getMyHistory` | 2026-09-09 |

### Commits Realizados
```bash
fc657f0 refactor: implement helper functions for typed queries
0e10c46 fix(auth): make password update identifier dynamic
```

---

## 📊 5. Estado Actual de Supabase (Prueba Real TestPilot)

Registro extraído de la tabla `users` confirmando el ciclo de vida completo:

```json
{
  "id": "3658df3a-3d15-4669-a595-dca33ec86fd3",
  "user_id": 1000,
  "email": "testpilot@ffaa.py",
  "nick": "TestPilot",
  "role": "MIEMBRO",
  "status": "ACTIVE",
  "must_change_password": false,
  "token_version": 2,
  "password_hash": "$2b$10$as8vQDbgnRgh5...",
  "created_at": "2026-09-09T19:24:35.51+00:00",
  "updated_at": "2026-09-09T23:54:52.571+00:00"
}
```

---

## 🧪 6. Matriz de Pruebas Realizadas

| # | Prueba Operativa | Método / Endpoint | Resultado Esperado | Resultado Real |
|:---:|---|---|---|:---:|
| 1 | Login con contraseña temporal | `POST /api/auth/login` | 200 OK, JWT emitido, `must_change_password: true` | ✅ PASS |
| 2 | Apertura de modal de cambio obligatorio | Frontend SPA | Despliegue de modal bloqueante | ✅ PASS |
| 3 | Envío de nueva contraseña reglamentaria | `POST /api/auth/change-password` | 200 OK, `token_version: 2`, `must_change_password: false` | ✅ PASS |
| 4 | Verificación de persistencia en Supabase | Consulta SQL `SELECT` | Hash actualizado, flag `false`, version `2` | ✅ PASS |
| 5 | Re-autenticación con nueva contraseña | `POST /api/auth/login` | 200 OK con nuevo JWT | ✅ PASS |
| 6 | Verificación de rechazo de clave temporal vieja | `POST /api/auth/login` | 401 Credenciales inválidas | ✅ PASS |
| 7 | Flujo integral desde cliente web | Navegador (Web SPA) | Acceso fluido a Dashboard tras cambio | ✅ PASS |

---

## ⚠️ 7. Incidencias Detectadas y Tareas Pendientes

### Bug de UI Detectado
- **Descripción:** En determinadas resoluciones o estados del modal de cambio forzado, los botones de acción inferior pueden no mostrarse visibles en el viewport.
- **Solución Alternativa (Workaround Actual):** La funcionalidad es 100% operativa presionando la tecla **`ENTER`** dentro de cualquiera de los campos de contraseña del formulario.
- **Fix Planificado:** Revisar los estilos en `components/change-password-modal.html` asegurando que el botón `btnChangePasswordSubmit` ("Actualizar Credencial") mantenga visibilidad sticky en dispositivos móviles y resoluciones compactas.

---

## 🔒 8. Protocolo de Congelamiento y Salvaguarda

Para prevenir que futuras tareas de mantenimiento o despliegues automáticos alteren este estado:
1. `CURRENT_STATE.md` se mantendrá como el resumen ejecutivo inmutable.
2. Todo script de despliegue debe contemplar el hook:
   ```json
   {
     "scripts": {
       "predeploy": "cp CURRENT_STATE.md BACKUP_CURRENT_STATE_$(date +%Y%m%d).md"
     }
   }
   ```
3. Cualquier cambio estructural en `users` requerirá una migración SQL versionada en `/sql`.
