#!/usr/bin/env node
/**
 * ============================================================
 * PARAGUAY-FFAA | METALSTORM — v4.5.0
 * Script de documentación automática
 * ============================================================
 * Uso: node scripts/docs-v4.5.0.cjs
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------
function log(icon, msg) {
  console.log(`${icon} ${msg}`);
}

function readFile(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    throw new Error(`Archivo no encontrado: ${relPath}`);
  }
  return { full, content: fs.readFileSync(full, 'utf8') };
}

function writeFile(relPath, full, content) {
  // Backup
  fs.writeFileSync(full + '.bak', fs.readFileSync(full));
  // Escribir
  fs.writeFileSync(full, content, 'utf8');
  log('💾', `Actualizado: ${relPath}`);
}

/**
 * Busca `marker` en el contenido. Si existe → saltea.
 * Si no existe, busca `search` y reemplaza por `replace`.
 */
function patchOrSkip(relPath, marker, search, replace) {
  const { full, content } = readFile(relPath);

  if (content.includes(marker)) {
    log('⏭️', `Ya aplicado (marker encontrado): ${relPath}`);
    return 'skipped';
  }

  if (!content.includes(search)) {
    log('⚠️', `No se encontró el bloque de búsqueda en: ${relPath}`);
    log('   ', `Buscando: "${search.slice(0, 80).replace(/\n/g, '\\n')}..."`);
    return 'not-found';
  }

  const newContent = content.replace(search, replace);
  writeFile(relPath, full, newContent);
  return 'patched';
}

// ------------------------------------------------------------
// FASE 5.1 — CHANGELOG.md
// ------------------------------------------------------------
function patchChangelog() {
  log('📝', 'FASE 5.1 — CHANGELOG.md');

  const marker = '## 📌 [4.5.0] - 2026-09-21';
  const search = '## 📌 [4.4.0] - 2026-09-21';
  const replace = `## 📌 [4.5.0] - 2026-09-21

### 🎖️ Email institucional auto-generado + Cambio de Nick autogestionado

#### Objetivo Cumplido

Añadir dos módulos operativos:
1. **Módulo A — Email institucional auto-generado:** al registrar un piloto, el email \`<nick>@ffaa.py\` se auto-genera desde el nick, con opción de edición manual por el admin.
2. **Módulo B — Cambio de Nick autogestionado:** el piloto puede cambiar su nick desde Mi Perfil (1 vez para MIEMBRO/VETERANO, ilimitado para ADMIN/OWNER). Cada cambio queda auditado en \`user_nick_changes\`.

#### Migración de Base de Datos

| Archivo | Cambio |
|---|---|
| \`sql/036_nick_change_tracking.sql\` | NUEVO. Columna \`nick_self_changed_at\` en \`users\` + tabla \`user_nick_changes\` con RLS. |

#### Cambios Backend

| Archivo | Cambio |
|---|---|
| \`src/utils/schemas.js\` | Regex permisivo del nick: \`/^[\\p{L}\\p{N}._\\-\\s]{3,30}$/u\`. Validación estricta del email institucional. \`NickChangeSchema\`. |
| \`src/utils/audit.js\` | Nuevo helper \`logNickChange()\` (audita en \`user_nick_changes\`). |
| \`src/controllers/admin.controller.js\` | \`addMember()\` valida unicidad de email/nick, normaliza y pobla \`email_institucional\`. |
| \`src/controllers/profile.controller.js\` | \`updateProfile()\` con lógica completa de cambio de nick, unicidad, límites y auditoría. |

#### Cambios Frontend

| Archivo | Cambio |
|---|---|
| \`components/admin-panel.html\` | Input de email con sufijo fijo \`@ffaa.py\` + preview en vivo. |
| \`components/profile-view.html\` | Campo de nick condicional (editable/readonly según rol y estado). |
| \`js/views.js\` | \`generateInstitutionalEmailFromNick()\`, \`canUserChangeNick()\`, \`configureProfileNickInput()\`, \`handleChangeNick()\`. |
| \`js/profile.js\` | \`loadPersonalProfile()\` llama a \`configureProfileNickInput()\`. |

#### Reglas de Negocio

**Nick permisivo:**
- Acepta: letras Unicode (incluye tildes, ñ, ü), números, espacios, punto, guión bajo, guión medio.
- Longitud: 3 a 30 caracteres.
- Ejemplos válidos: \`Luqueño\`, \`TestPiloñ\`, \`José Ángel\`, \`Test.Pilot 01\`.

**Email institucional estricto:**
- Prefijo: \`[a-z0-9._-]{3,30}\` (minúsculas, sin tildes, sin espacios, sin símbolos raros).
- Dominio fijo: \`@ffaa.py\`.
- Normalización: \`LuqueñO\` → \`luqueno@ffaa.py\`, \`Comandante Ríos\` → \`comandante.rios@ffaa.py\`.

**Cambio de nick:**
- MIEMBRO / VETERANO: 1 cambio autogestionado.
- ADMIN / OWNER: ilimitado (auditado).
- Unicidad: no puede coincidir con otro nick (case-insensitive).
- Los \`performances.nick\` históricos **NUNCA se tocan**.

#### Códigos de Error

- \`NICK_CHANGE_LIMIT_REACHED\` — MIEMBRO/VETERANO intenta cambiar 2da vez.
- \`NICK_FORMAT_INVALID\` — Formato del nick inválido.
- \`NICK_TAKEN\` — Nick ya en uso por otro piloto.
- \`EMAIL_INSTITUTIONAL_TAKEN\` — Email institucional ya en uso.

#### Auditoría

Nuevos registros en \`user_nick_changes\`:
- \`change_type = 'SELF'\` — cambio autogestionado por el piloto.
- \`change_type = 'ADMIN'\` — cambio hecho por un admin.
- Campos: \`user_id\`, \`previous_nick\`, \`new_nick\`, \`previous_institutional_email\`, \`new_institutional_email\`, \`changed_by\`, \`reason\`, \`created_at\`.

#### Tests

- ✅ **41/41 checks automatizados** (funciones globales, lógica, normalización, regex, DOM, endpoints).
- ✅ **Registro real en producción:** \`TestPilot\` creado con email auto-generado \`testpilot@ffaa.py\`.
- ✅ **Deploy exitoso en Fly.io** con hotfix del límite \`max(30)\`.

#### Verificación

- ✅ Nick permisivo con Unicode (\`ñ\`, tildes, espacios).
- ✅ Email institucional estricto (minúsculas, sin símbolos).
- ✅ Auto-generación de email desde nick.
- ✅ Cambio de nick con límite para MIEMBRO/VETERANO.
- ✅ Cambio ilimitado para ADMIN/OWNER.
- ✅ Auditoría completa en \`user_nick_changes\`.
- ✅ \`performances.nick\` intactos.

---

## 📌 [4.4.0] - 2026-09-21`;

  return patchOrSkip('CHANGELOG.md', marker, search, replace);
}

// ------------------------------------------------------------
// FASE 5.2 — API_REFERENCE.md
// ------------------------------------------------------------
function patchApiReference() {
  log('📝', 'FASE 5.2 — API_REFERENCE.md');

  const marker = '### `PUT /api/profile` — Actualización con cambio de nick';
  const search = '| **Profile** | `/api/profile` o `/me` | `PUT` | Autenticado | Actualizar Callsign, teléfono o bio |';
  const replace = `| **Profile** | \`/api/profile\` o \`/me\` | \`PUT\` | Autenticado | Actualizar Callsign, teléfono o bio. Acepta cambio de nick (v4.5.0). |`;

  const result1 = patchOrSkip('API_REFERENCE.md', marker, search, replace);
  if (result1 !== 'patched') return result1;

  // Segundo patch: agregar sección detallada antes de Settings
  const search2 = '| **Settings** | `/api/settings` o `/me` | `GET` | Autenticado | Obtener preferencias de tema y alertas |';
  const replace2 = `### \`PUT /api/profile\` — Actualización con cambio de nick (v4.5.0)

- **Acceso:** Autenticado.
- **Body:**
  \`\`\`json
  {
    "nick": "NuevoNick",
    "phone": "+595 981 123456",
    "bio": "Piloto de combate"
  }
  \`\`\`
- **Comportamiento:**
  - Si \`nick\` viene y difiere del actual → aplica lógica del Módulo B (validación, límites, unicidad, auditoría).
  - Los \`performances.nick\` históricos **NUNCA se tocan** (snapshot inmutable).
  - El email institucional se auto-actualiza **SOLO si era derivado del nick viejo**.
- **Errores:**
  - \`400 NICK_FORMAT_INVALID\` — Formato del nick inválido.
  - \`403 NICK_CHANGE_LIMIT_REACHED\` — MIEMBRO/VETERANO ya usó su cambio.
  - \`409 NICK_TAKEN\` — Nick ya en uso por otro piloto.
- **Ejemplo de respuesta exitosa (200 OK):**
  \`\`\`json
  {
    "success": true,
    "message": "Nick actualizado correctamente: TestPilot → TestPilot2026",
    "data": {
      "profile": { "nick": "TestPilot2026", "nick_self_changed_at": "2026-09-21T..." },
      "user": { "nick": "TestPilot2026", "nick_self_changed_at": "2026-09-21T..." }
    }
  }
  \`\`\`

| **Settings** | \`/api/settings\` o \`/me\` | \`GET\` | Autenticado | Obtener preferencias de tema y alertas |`;

  return patchOrSkip('API_REFERENCE.md', '### `PUT /api/profile` — Actualización con cambio de nick (v4.5.0)', search2, replace2);
}

// ------------------------------------------------------------
// FASE 5.3 — ARCHITECTURE.md
// ------------------------------------------------------------
function patchArchitecture() {
  log('📝', 'FASE 5.3 — ARCHITECTURE.md');

  const marker = '## 6.10 Sistema de Cambio de Nick Autogestionado (v4.5.0)';
  const search = '## 7. Integración con la Wiki de Metalstorm';
  const replace = `## 6.10 Sistema de Cambio de Nick Autogestionado (v4.5.0)

A partir de v4.5.0, los pilotos pueden cambiar su nick desde Mi Perfil según su rango.

### Reglas de negocio

| Rol | Cambios permitidos | Auditoría |
|---|---|---|
| MIEMBRO | 1 (autogestionado) | \`change_type='SELF'\` |
| VETERANO | 1 (autogestionado) | \`change_type='SELF'\` |
| ADMIN | Ilimitado | \`change_type='SELF'\` |
| OWNER | Ilimitado | \`change_type='SELF'\` |

### Estructura de la tabla \`user_nick_changes\`

| Columna | Tipo | Descripción |
|---|---|---|
| \`id\` | UUID | PK |
| \`user_id\` | UUID | FK a \`users.id\` ON DELETE CASCADE |
| \`previous_nick\` | TEXT | Nick anterior |
| \`new_nick\` | TEXT | Nick nuevo |
| \`previous_institutional_email\` | TEXT | Email institucional anterior (nullable) |
| \`new_institutional_email\` | TEXT | Email institucional nuevo (nullable) |
| \`change_type\` | TEXT | \`'SELF'\` o \`'ADMIN'\` |
| \`changed_by\` | UUID | FK a \`users.id\` ON DELETE SET NULL (nullable) |
| \`reason\` | TEXT | Motivo del cambio (nullable) |
| \`created_at\` | TIMESTAMPTZ | DEFAULT NOW() |

**Índice:** \`idx_user_nick_changes_user_id (user_id, created_at DESC)\`

**RLS:** Política \`no_public_access\` (bloquea todo acceso público).

### Columna \`nick_self_changed_at\` en \`users\`

- \`TIMESTAMPTZ NULL\` — NULL si el piloto nunca cambió su nick.
- Se setea al momento del primer cambio autogestionado para MIEMBRO/VETERANO.
- Para ADMIN/OWNER no se usa (privilegio ilimitado).

### Regex permisivo de nick

\`\`\`javascript
/^[\\p{L}\\p{N}._\\-\\s]{3,30}$/u
\`\`\`

- \`\\p{L}\` — letras Unicode (incluye tildes, ñ, ü).
- \`\\p{N}\` — números.
- \`._-\\s\` — punto, guión bajo, guión medio, espacios.
- 3-30 caracteres.

### Normalización del email institucional

\`\`\`javascript
function normalizeNickForEmail(nick) {
  return String(nick || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')   // quita diacríticos
    .replace(/\\s+/g, '.')              // espacios → punto
    .replace(/[^a-z0-9._-]/g, '')       // solo válidos para email
    .replace(/^[._-]+|[._-]+$/g, '');   // trim de . _ -
}
\`\`\`

**Ejemplos:**
- \`LuqueñO\` → \`luqueno\`
- \`Comandante Ríos\` → \`comandante.rios\`
- \`Test.Pilot 01\` → \`test.pilot.01\`

### Inmutabilidad de \`performances.nick\`

Los registros históricos de rendimiento (\`performances.nick\`) **NUNCA se tocan** cuando un piloto cambia su nick. Esto preserva la trazabilidad militar: el nick que tenías cuando volaste ese evento es historia.

### Flujo del cambio de nick

\`\`\`
PILOTO → Mi Perfil → Input Nick → click "Guardar Nick"
  ↓
FRONTEND: handleChangeNick()
  - Valida formato (regex permisivo).
  - Confirma con el usuario (mensaje según rol).
  - Envía PUT /api/profile { nick: nuevoNick }.
  ↓
BACKEND: updateProfile()
  - Detecta cambio real de nick.
  - Valida formato (NickChangeSchema).
  - Valida límite (MIEMBRO/VETERANO).
  - Valida unicidad (case-insensitive).
  - Actualiza \`nick\` y \`nick_self_changed_at\` (si aplica).
  - Auto-actualiza email institucional SOLO si era derivado.
  - Audita en \`user_nick_changes\` (change_type='SELF').
  ↓
RESPUESTA: 200 OK + profile actualizado
\`\`\`

---

## 7. Integración con la Wiki de Metalstorm`;

  return patchOrSkip('ARCHITECTURE.md', marker, search, replace);
}

// ------------------------------------------------------------
// FASE 5.4 — CURRENT_STATE.md
// ------------------------------------------------------------
function patchCurrentState() {
  log('📝', 'FASE 5.4 — CURRENT_STATE.md');

  const marker = '| **Cambio de Nick Autogestionado (v4.5.0)**';
  const search = '| **Login con Nick (v4.4.0)** | ✅ Funcional | El login acepta email, email institucional, Gmail vinculado o nick como identificador. |';
  const replace = `| **Login con Nick (v4.4.0)** | ✅ Funcional | El login acepta email, email institucional, Gmail vinculado o nick como identificador. |
| **Email Institucional Auto-generado (v4.5.0)** | ✅ Funcional | Al registrar un piloto, el email \`<nick>@ffaa.py\` se auto-genera desde el nick. Editable por el admin. Validación de unicidad. |
| **Cambio de Nick Autogestionado (v4.5.0)** | ✅ Funcional | MIEMBRO/VETERANO: 1 cambio. ADMIN/OWNER: ilimitado. Auditoría en \`user_nick_changes\`. Regex permisivo con Unicode (\`ñ\`, tildes, espacios). |
| **Nick Permisivo con Unicode (v4.5.0)** | ✅ Funcional | Regex \`/^[\\p{L}\\p{N}._\\-\\s]{3,30}$/u\` acepta letras Unicode, números, espacios, \`.\`, \`_\`, \`-\`. |`;

  return patchOrSkip('CURRENT_STATE.md', marker, search, replace);
}

// ------------------------------------------------------------
// FASE 5.5 — DEPLOYMENT_STATE.md
// ------------------------------------------------------------
function patchDeploymentState() {
  log('📝', 'FASE 5.5 — DEPLOYMENT_STATE.md');

  // Patch 1: columna nueva en el CREATE TABLE de users
  const marker1 = '-- v4.5.0: tracking de cambios de nick autogestionados';
  const search1 = '    temporary_password_expires_at TIMESTAMPTZ,';
  const replace1 = `    temporary_password_expires_at TIMESTAMPTZ,
    nick_self_changed_at TIMESTAMPTZ,  -- v4.5.0: tracking de cambios de nick autogestionados`;

  const result1 = patchOrSkip('DEPLOYMENT_STATE.md', marker1, search1, replace1);

  // Patch 2: tabla user_nick_changes en la sección de resumen
  const marker2 = '#### 🆕 Tabla `user_nick_changes` (v4.5.0)';
  const search2 = '#### 🗑️ Tablas Legacy — DROP Planificado';
  const replace2 = `#### 🆕 Tabla \`user_nick_changes\` (v4.5.0)

Registro histórico de cambios de nick autogestionados.

| Columna | Tipo | Descripción |
|---|---|---|
| \`id\` | UUID | PK |
| \`user_id\` | UUID | FK a \`users.id\` ON DELETE CASCADE |
| \`previous_nick\` | TEXT | Nick anterior |
| \`new_nick\` | TEXT | Nick nuevo |
| \`previous_institutional_email\` | TEXT | Email institucional anterior |
| \`new_institutional_email\` | TEXT | Email institucional nuevo |
| \`change_type\` | TEXT | \`'SELF'\` o \`'ADMIN'\` |
| \`changed_by\` | UUID | FK a \`users.id\` (admin que ejecutó el cambio) |
| \`reason\` | TEXT | Motivo (si es cambio administrativo) |
| \`created_at\` | TIMESTAMPTZ | Fecha del cambio |

**Índice:** \`idx_user_nick_changes_user_id\`
**RLS:** Política \`no_public_access\`.

#### 🗑️ Tablas Legacy — DROP Planificado`;

  const result2 = patchOrSkip('DEPLOYMENT_STATE.md', marker2, search2, replace2);

  return result1 === 'patched' || result2 === 'patched' ? 'patched' : (result1 === 'skipped' && result2 === 'skipped' ? 'skipped' : 'not-found');
}

// ------------------------------------------------------------
// FASE 5.6 — USER_MANUAL.md
// ------------------------------------------------------------
function patchUserManual() {
  log('📝', 'FASE 5.6 — USER_MANUAL.md');

  const marker = '### 2.4b Cambio de Nick desde Mi Perfil (v4.5.0)';
  const search = '### 2.5 📚 Centro de Normativas y Protocolos';
  const replace = `### 2.4b Cambio de Nick desde Mi Perfil (v4.5.0)

A partir de la v4.5.0, podés cambiar tu **nick** (indicativo de combate) directamente desde **Mi Perfil**.

#### ¿Cuántas veces puedo cambiar mi nick?

Depende de tu rango:

| Rango | Cambios permitidos |
|---|---|
| **MIEMBRO** | 1 cambio autogestionado (después queda fijo). |
| **VETERANO** | 1 cambio autogestionado (después queda fijo). |
| **ADMIN** | Ilimitado (cada cambio se audita). |
| **OWNER** | Ilimitado (cada cambio se audita). |

#### Formato válido del nick

Podés usar **letras (incluye tildes y ñ), números, espacios, punto, guión bajo y guión medio**. Longitud: 3 a 30 caracteres.

**Ejemplos válidos:**
- \`Luqueño\`
- \`TestPiloñ\`
- \`José Ángel\`
- \`Comandante_Ríos-01\`
- \`Test.Pilot 2026\`

**Ejemplos inválidos:**
- \`AB\` (muy corto).
- \`Test@Pilot\` (@ no permitido).
- \`[PRY]Test\` (corchetes no permitidos).
- Nombres de 31+ caracteres.

#### ¿Cómo cambio mi nick?

1. Andá a **Mi Perfil** (menú superior o drawer móvil).
2. En el formulario **"Datos Personales"**, encontrá el campo **"Nickname / Indicativo de Combate"**.
3. Si tenés cambios disponibles, verás el mensaje: *"💡 Podés cambiar tu nick una vez. Elegí bien: después queda fijo."*
4. Editá el campo con tu nuevo nick.
5. Aparecerá el botón **"💾 Guardar Nick"**.
6. Hacé click y confirmá el cambio en el diálogo.
7. El sistema valida el formato, la unicidad y tu límite de cambios, y aplica el cambio.

#### ¿Qué pasa con mi nick viejo?

- **Perfil y login:** pasan a usar el nuevo nick.
- **Login con nick viejo:** deja de funcionar.
- **Histórico de rendimiento (\`performances.nick\`):** **NUNCA se toca**. Los eventos que volaste con el nick viejo siguen mostrando ese nick en tu historial. Es un snapshot inmutable.

#### ¿Qué pasa con mi email institucional?

Si tu email institucional había sido **auto-generado desde tu nick viejo** (ej: nick \`TestPilot\` → email \`testpilot@ffaa.py\`), el sistema lo actualiza automáticamente al nuevo nick.

Si el email fue **editado manualmente por un admin** (ej: \`comando@ffaa.py\` para el nick \`TestPilot\`), **NO se toca**.

#### ¿Qué pasa si ya usé mi cambio y quiero otro?

Contactá a un **Administrador**. Los ADMIN/OWNER pueden ejecutar cambios adicionales desde el panel administrativo (auditados).

#### Códigos de error que podés encontrar

- **NICK_FORMAT_INVALID:** el formato del nick no cumple las reglas.
- **NICK_TAKEN:** el nick ya está en uso por otro piloto.
- **NICK_CHANGE_LIMIT_REACHED:** ya usaste tu cambio autogestionado.

---

### 2.5 📚 Centro de Normativas y Protocolos`;

  return patchOrSkip('USER_MANUAL.md', marker, search, replace);
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------
function main() {
  console.log('');
  console.log('════════════════════════════════════════════════════════');
  console.log('  PARAGUAY-FFAA | METALSTORM — Script de Documentación');
  console.log('  v4.5.0 — Email auto-generado + Cambio de Nick');
  console.log('════════════════════════════════════════════════════════');
  console.log('');

  const results = { patched: 0, skipped: 0, 'not-found': 0 };

  try {
    results[patchChangelog()]++;
    results[patchApiReference()]++;
    results[patchArchitecture()]++;
    results[patchCurrentState()]++;
    results[patchDeploymentState()]++;
    results[patchUserManual()]++;
  } catch (err) {
    console.error('❌ Error fatal:', err.message);
    process.exit(1);
  }

  console.log('');
  console.log('════════════════════════════════════════════════════════');
  console.log(`  ✅ Aplicados:    ${results.patched}`);
  console.log(`  ⏭️  Ya aplicados: ${results.skipped}`);
  console.log(`  ⚠️  No encontrados: ${results['not-found']}`);
  console.log('════════════════════════════════════════════════════════');
  console.log('');
  console.log('📌 Backups: cada archivo tiene un .bak con la versión previa.');
  console.log('📌 Revisá con: git diff');
  console.log('📌 Si algo salió mal: copiá los .bak sobre los originales.');
  console.log('');

  if (results['not-found'] > 0) {
    console.log('⚠️  ATENCIÓN: Algunos bloques no se encontraron.');
    console.log('   Revisá los archivos manualmente y avisá.');
    process.exit(1);
  }
}

main();