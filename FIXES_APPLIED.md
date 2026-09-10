# 🔧 Historial de Fixes Aplicados - PARAGUAY-FFAA | METALSTORM

> **Bitácora Técnica de Correcciones Críticas y Refactorizaciones de Tipos.**  
> **Fecha de Consolidación:** 2026-09-09  
> **Versión Relacionada:** v3.7.0

---

## 📌 Resumen de Commits Críticos

```bash
fc657f0 refactor: implement helper functions for typed queries
0e10c46 fix(auth): make password update identifier dynamic
```

---

## 🛠️ Detalle de Fixes Implementados

### 🔹 Fix #1: Desacoplamiento UUID vs INTEGER en `changePassword()`
- **Fecha:** 2026-09-09
- **Archivo Principal:** `src/controllers/auth.controller.js`
- **Severidad:** 🚨 Crítica (Bloqueaba el onboarding de nuevos pilotos y restablecimiento forzado).
- **Problema Detectado:**
  La consulta de actualización en Supabase forzaba la condición `.eq('id', user.id)`. Debido a que la carga útil del token JWT o el objeto `req.user` contenía identificadores numéricos (`user_id = 1000`) o inconsistencias de formato, PostgreSQL rechazaba la consulta por incompatibilidad de tipos UUID o no lograba hacer match con ningún registro, dejando `must_change_password` en `true` indefinidamente.
- **Solución Técnica:**
  Se implementó una consulta polimórfica tipada jerárquica con comprobación de regex para UUID v4, conversión numérica para `user_id` entero y fallback a `email`:

  ```javascript
  // Lógica tipada implementada en src/controllers/auth.controller.js
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
- **Evidencia de Validación en Logs:**
  ```text
  🔍 [changePassword] Actualizando usuario con: {
    id: '3658df3a-3d15-4669-a595-dca33ec86fd3',
    user_id: 1000,
    newTokenVersion: 2,
    newHash: '$2b$10$as8vQDbgnRgh5...'
  }
  ✅ [changePassword] Filas actualizadas con éxito: 1
  ```
- **Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #2: Consultas Tipadas en Reseteo Administrativo de Claves
- **Fecha:** 2026-09-09
- **Archivo:** `src/routes/admin.routes.js` y `src/controllers/admin.controller.js`
- **Severidad:** ⚠️ Alta
- **Problema:** El endpoint de reseteo `POST /api/admin/users/:id/reset-password` fallaba cuando la URL contenía el `user_id` numérico (e.g. `1000`) en lugar del UUID interno de Supabase.
- **Solución:**
  Se integró la validación tipada que analiza el parámetro `:id`. Si contiene solo dígitos numéricos, consulta por la columna `user_id`; de lo contrario, si cumple con la expresión regular de UUID, consulta por la columna `id`.
- **Estado:** ✅ RESUELTO Y AUDITADO

---

### 🔹 Fix #3: Manejo Seguro de Identificadores en Gestión de Roles y Estados
- **Fecha:** 2026-09-09
- **Archivo:** `src/controllers/admin.controller.js`
- **Métodos Involucrados:** `updateUserRole()`, `updateUserStatus()`
- **Problema:** Las actualizaciones de estado operativo (`ACTIVE` / `INACTIVE`) y ascenso de rangos militares (`MIEMBRO`, `VETERANO`, `ADMIN`) lanzaban excepciones en Supabase al recibir `user_id` entero desde la interfaz de administración táctica.
- **Solución:** Normalización del identificador del usuario mediante comprobación de formato UUID antes de concatenar a la consulta de base de datos.
- **Estado:** ✅ RESUELTO Y PROBADO

---

### 🔹 Fix #4: Consultas Tipadas en Expediente Militar y Perfil
- **Fecha:** 2026-09-09
- **Archivo:** `src/controllers/profile.controller.js`
- **Métodos Involucrados:** `getProfile()`, `updateProfile()`
- **Problema:** En perfiles de combatientes autenticados mediante Google OAuth 2.0 o contraseñas tradicionales, los endpoints de perfil no lograban actualizar la biografía táctica o número telefónico si el JWT contenía únicamente `user_id` numérico.
- **Solución:** Extensión de la lógica condicional polimórfica en la lectura y persistencia de perfiles militares.
- **Estado:** ✅ RESUELTO Y VERIFICADO

---

### 🔹 Fix #5: Registro y Consulta de Rendimiento Militar Táctico
- **Fecha:** 2026-09-09
- **Archivo:** `src/controllers/performances.controller.js`
- **Métodos Involucrados:** `savePerformance()`, `getMyHistory()`
- **Problema:** Al registrar tokens de combate semanales y evaluar el semáforo militar (`perf_status`), la consulta histórica cruzaba erróneamente `user_id` entero con la columna `user_id` en `performances` cuando en ocasiones se suministraba el `id` (UUID) en el contexto de la solicitud.
- **Solución:** Unificación del almacenamiento de rendimientos vinculados estrictamente al `user_id` numérico entero del combatiente.
- **Estado:** ✅ RESUELTO Y OPERATIVO

---

### 🔹 Fix #6: Normalización de la tabla `planes` (2026-09-10)

**Fecha:** 2026-09-10  
**Archivos:** Base de datos Supabase  
**Problema:** La tabla `planes` no cumplía con 1NF:
- `especial_nombre` contenía nombre + nivel + efecto
- `especial_nivel` era TEXT (no INTEGER)
- `pasiva_nombre` contenía nombre + nivel + efecto
- `pasiva_nivel` era TEXT (no INTEGER)
- Faltaba constraint UNIQUE (user_id, avion_id)
- Faltaba FK planes.user_id → users.user_id

**Solución:**
1. Agregar constraint UNIQUE (user_id, avion_id)
2. Agregar FK planes.user_id → users.user_id
3. Crear columnas `especial_nivel_num` (INTEGER) y `especial_efecto` (TEXT)
4. Crear columnas `pasiva_nivel_num` (INTEGER) y `pasiva_efecto` (TEXT)
5. Migrar datos con regex
6. Agregar constraints CHECK
7. Limpiar nombres (quitar paréntesis)

**Resultado:**
- ✅ 121 aviones normalizados
- ✅ 83/84 especiales migradas
- ✅ 35/37 pasivas migradas
- ✅ 3 aviones sin nivel (correcto)
- ✅ Estructura 1NF

**Estado:** ✅ RESUELTO Y PROBADO

**Commits:** N/A (cambios directos en Supabase)

---

## 📋 Matriz Resumen de Archivos y Responsabilidades

| Componente | Línea de Acción | Estado |
|---|---|:---:|
| `src/controllers/auth.controller.js` | Lógica tipada, control de `token_version` y password hashing | 🟢 ESTABLE |
| `src/routes/admin.routes.js` | Parámetros de ruta dinámicos (UUID / INTEGER) | 🟢 ESTABLE |
| `src/controllers/admin.controller.js` | Modificación de rangos militares y estado de cuenta | 🟢 ESTABLE |
| `src/controllers/profile.controller.js` | Persistencia de datos personales y teléfono de alertas | 🟢 ESTABLE |
| `src/controllers/performances.controller.js` | Historial de tokens y sincronización de semáforo | 🟢 ESTABLE |
| `planes (Supabase)` | Normalización 1NF (UNIQUE, FK, CHECKs, habilidades) | 🟢 ESTABLE |
| `components/change-password-modal.html` | Modal de actualización táctica (Workaround: ENTER) | 🟡 FIX UI PENDIENTE |
