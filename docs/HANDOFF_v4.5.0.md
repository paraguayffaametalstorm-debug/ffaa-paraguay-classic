# HANDOFF — v4.5.0 PARAGUAY-FFAA | METALSTORM

> **Documento de traspaso entre sesiones de trabajo.**
> **v4.4.0 cerrada. Inicio de v4.5.0.**
> **Fecha:** 2026-09-21
> **Responsable:** Comando C4ISR

---

## 1. ESTADO ACTUAL AL CIERRE DE v4.4.0

| Aspecto | Valor |
|---|---|
| **Versión en producción** | v4.4.0 |
| **Commit HEAD** | `ce79306` |
| **Branch** | `main` (sincronizada con origin) |
| **Deploy** | ✅ Activo en Fly.io (`gru`) |
| **Sistema** | 100% funcional |
| **Tests** | 179/179 passing (Vitest 5.0.1) |

### Features en producción (v4.4.0)

1. **Vencimiento de credenciales temporales** (7 días, columna `temporary_password_expires_at`).
2. **QR en credencial JPG** con nick + temp_pass precargados.
3. **Login acepta nick** como identificador (además de email y email institucional).
4. **Auditoría** `INITIAL_CREDENTIAL_GENERATED` y `ADMIN_PASSWORD_RESET`.

---

## 2. TAREA PENDIENTE — v4.5.0

Implementar **2 módulos** ya discutidos y aprobados.

### MÓDULO A — Email institucional auto-generado

**Objetivo:** al registrar un piloto, el email institucional se auto-genera desde el nick.

**Reglas:**
- Normalización: `LuqueñO` → `luqueno@ffaa.py`
- Minúsculas, sin diacríticos, sin caracteres especiales
- Dominio fijo `@ffaa.py`
- **El campo es editable** por el admin (default útil, no jaula)
- **Validación de unicidad** en backend
- Si colisiona, el admin puede editar el prefijo

**Función propuesta (frontend):**
```js
function generateInstitutionalEmailFromNick(nick) {
  const clean = String(nick || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '');
  return clean ? `${clean}@ffaa.py` : '';
}
Regex de validación:

text
^[a-z0-9._-]{3,30}@ffaa\.py$
MÓDULO B — Cambio de nick desde Mi Perfil
Objetivo: permitir al usuario cambiar su nick desde Mi Perfil.

Reglas:

MIEMBRO / VETERANO: 1 cambio autogestionado (después readonly).

ADMIN / OWNER: ilimitado (privilegio de mando), pero cada cambio se audita.

Formato del nick: [A-Za-z0-9._-], 3 a 20 caracteres.

Unicidad: no puede coincidir con otro nick.

performances.nick históricos NO se tocan (snapshot inmutable).

Login con nick viejo deja de funcionar después del cambio.

Cada cambio se registra en tabla user_nick_changes.

Códigos de error:

NICK_CHANGE_LIMIT_REACHED

NICK_FORMAT_INVALID

NICK_TAKEN

3. MIGRACIÓN SQL
Archivo: sql/036_nick_change_tracking.sql

sql
-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - v4.5.0
-- Tracking de cambios de nick autogestionados
-- ============================================================================

-- 1. Columna en users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS nick_self_changed_at TIMESTAMPTZ NULL;

-- 2. Tabla de auditoría
CREATE TABLE IF NOT EXISTS user_nick_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_nick TEXT NOT NULL,
    new_nick TEXT NOT NULL,
    previous_institutional_email TEXT NULL,
    new_institutional_email TEXT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('SELF', 'ADMIN')),
    changed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_nick_changes_user_id
    ON user_nick_changes(user_id, created_at DESC);

ALTER TABLE user_nick_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS no_public_access ON user_nick_changes;
CREATE POLICY no_public_access ON user_nick_changes
    FOR ALL TO public USING (false) WITH CHECK (false);
4. ARCHIVOS A MODIFICAR
Backend (4)
Archivo	Cambio
src/utils/schemas.js	Validación de nick (formato) + email institucional
src/controllers/admin.controller.js	addMember() valida formato y unicidad del email
src/controllers/profile.controller.js	updateProfile() con lógica de cambio de nick
src/utils/audit.js	Helper logNickChange()
Frontend (3)
Archivo	Cambio
components/admin-panel.html	Input email con sufijo fijo + auto-generación
components/profile-view.html	Input nick condicional (editable/readonly según rol y estado)
js/views.js	generateInstitutionalEmailFromNick() + lógica de cambio de nick
Documentación (6)
CHANGELOG.md — entrada [4.5.0]

API_REFERENCE.md — PUT /api/profile con códigos de error

ARCHITECTURE.md — sección sobre user_nick_changes

CURRENT_STATE.md — 1 fila nueva

DEPLOYMENT_STATE.md — nueva columna + nueva tabla

USER_MANUAL.md — "Cambio de Nick"

5. PLAN DE TESTS
Módulo A
A1: LuqueñO → luqueno@ffaa.py

A2: VIPER_01 → viper_01@ffaa.py

A3: Email ya existente → EMAIL_INSTITUTIONAL_TAKEN

A4: Email test@otro.com → error formato

A5: Admin edita manualmente → se respeta

A6: Admin cambia nick después de editar email → confirmación

Módulo B
B1: MIEMBRO cambia 1ra vez → ✅

B2: MIEMBRO intenta 2da vez → ❌ NICK_CHANGE_LIMIT_REACHED

B3: VETERANO cambia 1ra vez → ✅

B4: ADMIN cambia 3 veces → ✅ (sin límite)

B5: OWNER cambia 5 veces → ✅ (sin límite)

B6: Formato inválido (Luqueño) → ❌ NICK_FORMAT_INVALID

B7: Nick ya existente → ❌ NICK_TAKEN

B8: user_nick_changes con registro → ✅

B9: performances.nick históricos → ✅ sin cambios

B10: Login con nick nuevo → ✅

B11: Login con nick viejo → ❌

6. REGLAS DE TRABAJO
Windows + CMD. No usar grep/cat/ls/sed. Sí findstr/type/dir/node --check.

Bloques de búsqueda/reemplazo exactos para VS Code (Ctrl+H).

node --check después de cada archivo modificado.

Un commit por módulo terminado.

Deploy a Fly.io al final.

No romper funcionalidad existente.

Los performances.nick históricos son INMUTABLES.

Los emails institucionales existentes no se tocan.

7. ADJUNTOS REQUERIDOS PARA LA NUEVA SESIÓN
Adjuntar a la nueva conversación:

src/controllers/profile.controller.js

src/utils/schemas.js

src/utils/audit.js

src/controllers/admin.controller.js

src/routes/admin.routes.js

components/admin-panel.html

components/profile-view.html

js/views.js

8. ORDEN DE EJECUCIÓN
Fase	Descripción
FASE 1	Crear + ejecutar sql/036_nick_change_tracking.sql en Supabase
FASE 2	Backend (4 archivos). node --check. Commit
FASE 3	Frontend (3 archivos). node --check. Commit
FASE 4	Tests A1-A6 + B1-B11
FASE 5	Documentación (6 archivos). Commit
FASE 6	Deploy a Fly.io. Smoke test
PARAGUAY FFAA [PRY] — Escuadrón Oficial MetalStorm
Handoff v4.5.0 · 2026-09-21