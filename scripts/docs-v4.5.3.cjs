/**
 * docs-v4.5.3.cjs
 * Documenta HALL-066-septies (fix del schema Zod para user_id string del <select>).
 *
 * Uso: node scripts\docs-v4.5.3.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DATE = '2026-09-22';

console.log('\n══════════════════════════════════════════════════════════');
console.log('  DOCUMENTACIÓN v4.5.3 — HALL-066-septies');
console.log('══════════════════════════════════════════════════════════\n');

let ok = 0, skip = 0, fail = 0;

function log(msg, status = 'info') {
  const icons = { ok: '✅', skip: '⏭️ ', fail: '❌', info: '  ' };
  console.log(`${icons[status]} ${msg}`);
}

function readFile(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}

function writeFile(rel, content) {
  const p = path.join(ROOT, rel);
  const bak = `${p}.bak-v4.5.3-${Date.now()}`;
  if (fs.existsSync(p)) fs.copyFileSync(p, bak);
  fs.writeFileSync(p, content, 'utf8');
}

function backup(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return;
  const bak = `${p}.bak-v4.5.3-${Date.now()}`;
  fs.copyFileSync(p, bak);
  log(`Backup: ${path.basename(bak)}`, 'info');
}

// ═════════════════════════════════════════════════════════════
// 1. CHANGELOG.md
// ═════════════════════════════════════════════════════════════
log('\n📝 [1/6] CHANGELOG.md');

{
  let c = readFile('CHANGELOG.md');
  if (!c) { log('No existe', 'fail'); fail++; }
  else if (c.includes('## 📌 [4.5.3]')) { log('Entrada [4.5.3] ya existe', 'skip'); skip++; }
  else {
    const entry = `## 📌 [4.5.3] - ${DATE}

### 🚨 Hotfix — HALL-066-septies: user_id string numérico del \`<select>\`

#### Objetivo Cumplido

Aceptar \`user_id\` como string numérico (\`"6"\`) en \`CreateParticipationSchema\`,
para que el modo oficial (cargar para otro piloto desde el \`<select>\` HTML)
funcione sin \`400 Payload inválido\`.

#### Problema Detectado

El \`<select id="performanceTarget">\` HTML devuelve el \`value\` de cada
\`<option>\` como **string** (\`"6"\`, \`"10"\`). El schema Zod solo aceptaba:
- \`z.number().int().positive()\` → ❌ rechaza string
- \`z.string().uuid()\` → ❌ rechaza "6"

Resultado: FURTIVO/OWNER no podían cargar performance para otros pilotos.

#### Causa Raíz

Zod no tiene un tipo implícito para "string numérico que se convierte a number".
El \`<select>\` HTML siempre devuelve strings.

#### Fix Aplicado

\`\`\`javascript
user_id: z.union([
  z.number().int().positive(),
  z.string().uuid(),
  z.string().regex(/^\\d+$/).transform(Number)  // ← NUEVA
]).optional()
\`\`\`

El tercer formato acepta \`"6"\` (string numérico) y lo convierte a \`6\` (number)
antes de pasar al controller.

#### Archivos Modificados

| Archivo | Cambio |
|---|---|
| \`src/utils/eventSchemas.js\` | \`CreateParticipationSchema.user_id\` acepta 3 formatos |

#### Verificación End-to-End

- ✅ **Test automático desde consola:** POST con \`user_id: "6"\` (string)
- ✅ **Status HTTP:** 201 Created
- ✅ **Fila insertada:** \`event_participations\` con \`nick: AIRJUMP\`
- ✅ **UUID resuelto:** \`f5359f76-8845-40de-87d2-a15b0d2027fe\`
- ✅ **Auditoría:** \`created_by: 45217610-...\` (PJPIROVANI)

#### Commits

- \`4da002b\` — fix(events-v2): aceptar user_id string numérico del select (HALL-066-septies)

---

`;

    // Insertar antes de [4.5.2] (que es la entrada más reciente)
    const anchor = '## 📌 [4.5.2] - 2026-09-22';
    if (c.includes(anchor)) {
      c = c.replace(anchor, entry + anchor);
    } else {
      c = entry + c;
    }

    backup('CHANGELOG.md');
    writeFile('CHANGELOG.md', c);
    log('Entrada [4.5.3] agregada', 'ok');
    ok++;
  }
}

// ═════════════════════════════════════════════════════════════
// 2. CURRENT_STATE.md
// ═════════════════════════════════════════════════════════════
log('\n📝 [2/6] CURRENT_STATE.md');

{
  let c = readFile('CURRENT_STATE.md');
  if (!c) { log('No existe', 'fail'); fail++; }
  else if (c.includes('v4.5.3')) { log('Ya actualizado', 'skip'); skip++; }
  else {
    c = c.replace(
      /> \*\*Versión Activa:\*\* v4\.5\.2-hotfix[^\n]*/,
      `> **Versión Activa:** v4.5.3 (HALL-066-septies: user_id string numérico)`
    );
    c = c.replace(
      /> \*\*Fecha de Congelamiento:\*\* 2026-09-22/,
      `> **Fecha de Congelamiento:** ${DATE}`
    );

    // Sección nueva
    if (!c.includes('## 🚨 Hotfix v4.5.3')) {
      c += `

---

## 🚨 Hotfix v4.5.3 — HALL-066-septies (${DATE})

### Problema

El \`<select>\` HTML del modo oficial devuelve \`user_id\` como STRING.
Zod rechazaba con 400 "Invalid UUID" al cargar para otro piloto.

### Fix

\`CreateParticipationSchema.user_id\` ahora acepta:
1. \`number\` INTEGER (self mode)
2. \`string\` UUID (self mode)
3. \`string\` numérico → transformado a number (modo oficial)

### Verificación

- ✅ Test con \`user_id: "6"\` (string) → 201 Created
- ✅ Fila insertada: \`event_participations\` con \`nick: AIRJUMP\`
- ✅ UUID correcto: \`f5359f76-8845-40de-87d2-a15b0d2027fe\`

### Referencias

- \`CHANGELOG.md\` sección \`[4.5.3]\`
- Commit \`4da002b\`
`;
    }

    backup('CURRENT_STATE.md');
    writeFile('CURRENT_STATE.md', c);
    log('Actualizado', 'ok');
    ok++;
  }
}

// ═════════════════════════════════════════════════════════════
// 3. FIXES_APPLIED.md
// ═════════════════════════════════════════════════════════════
log('\n📝 [3/6] FIXES_APPLIED.md');

{
  let c = readFile('FIXES_APPLIED.md');
  if (!c) { log('No existe', 'fail'); fail++; }
  else if (c.includes('HALL-066-septies')) { log('Ya documentado', 'skip'); skip++; }
  else {
    const entry = `

---

### 🐛 HALL-066-septies — user_id string numérico del \`<select>\`

**Fecha:** ${DATE}
**Fase:** Hotfix v4.5.3
**Archivo:** \`src/utils/eventSchemas.js\`
**Commit:** \`4da002b\`
**Severidad:** 🟠 ALTA
**Estado:** ✅ RESUELTO Y VERIFICADO

**Problema Detectado:**

El \`<select id="performanceTarget">\` HTML devuelve el \`value\` de cada
\`<option>\` como **string** (\`"6"\`, \`"10"\`). El schema Zod solo aceptaba
\`z.number().int()\` o \`z.string().uuid()\`, rechazando el string numérico
con \`400 Payload inválido\` + \`code: 'VALIDATION_ERROR'\`.

**Causa Raíz:**

Zod no tiene un tipo implícito para "string numérico que se convierte a number".
El \`<select>\` HTML siempre devuelve strings.

**Solución Aplicada:**

Se agregó un tercer formato al \`z.union\` de \`user_id\`:

\`\`\`javascript
user_id: z.union([
  z.number().int().positive(),
  z.string().uuid(),
  z.string().regex(/^\\d+$/).transform(Number)  // ← NUEVA
]).optional()
\`\`\`

**Verificación:**

Test automático desde la consola del navegador:

\`\`\`
POST /api/events-v2/04feaccb-.../participations
Body: { "user_id": "6", "nick": "AIRJUMP", ... }
Response: 201 Created
  - id: a1f9e24b-1b47-42ed-be04-b684a94adcb1
  - user_id: f5359f76-8845-40de-87d2-a15b0d2027fe  (UUID resuelto)
  - nick: AIRJUMP
  - computed_points: 100
  - created_by: 45217610-...  (PJPIROVANI)
\`\`\`

**Lección Aprendida:**

Los \`<select>\` HTML **siempre** devuelven strings. Los schemas Zod que los
consumen deben tolerar strings numéricos y convertirlos.

---
`;

    c += entry;
    backup('FIXES_APPLIED.md');
    writeFile('FIXES_APPLIED.md', c);
    log('Entrada HALL-066-septies agregada', 'ok');
    ok++;
  }
}

// ═════════════════════════════════════════════════════════════
// 4. docs/incidentes/HALL-066-completo.md
// ═════════════════════════════════════════════════════════════
log('\n📝 [4/6] docs/incidentes/HALL-066-completo.md');

{
  let c = readFile('docs/incidentes/HALL-066-completo.md');
  if (!c) { log('No existe', 'fail'); fail++; }
  else if (c.includes('HALL-066-septies')) { log('Ya documentado', 'skip'); skip++; }
  else {
    // Agregar bug #7 a la cadena
    const anchor = '### Bug #6 — HALL-066-sexies (Service Worker)';
    const newBug = `### Bug #7 — HALL-066-septies (Backend)

**Archivo:** \`src/utils/eventSchemas.js\` (línea 242)
**Commit fix:** \`4da002b\`

Después de resolver los 6 bugs anteriores, apareció un 7mo bug: el \`<select>\`
HTML del modo oficial devuelve el \`user_id\` como **string** (\`"6"\`), pero el
schema Zod solo aceptaba number o UUID.

**Fix:** agregar un tercer formato \`z.string().regex(/^\\d+$/).transform(Number)\`
que convierte el string numérico a number antes de validar.

### Bug #6 — HALL-066-sexies (Service Worker)`;

    if (c.includes(anchor)) {
      c = c.replace(anchor, newBug);
      backup('docs/incidentes/HALL-066-completo.md');
      writeFile('docs/incidentes/HALL-066-completo.md', c);
      log('Bug #7 agregado a la cadena', 'ok');
      ok++;
    } else {
      log('Ancla de Bug #6 no encontrada', 'fail');
      fail++;
    }
  }
}

// ═════════════════════════════════════════════════════════════
// 5. README.md
// ═════════════════════════════════════════════════════════════
log('\n📝 [5/6] README.md');

{
  let c = readFile('README.md');
  if (!c) { log('No existe', 'fail'); fail++; }
  else if (c.includes('v4.5.3')) { log('Ya actualizado', 'skip'); skip++; }
  else {
    c = c.replace(
      /badge\/version-v4\.5\.2--hotfix-gold/,
      'badge/version-v4.5.3-gold'
    );
    c = c.replace(
      /\*Versión: v4\.5\.2-hotfix · Actualizado: 2026-09-22\*/,
      `*Versión: v4.5.3 · Actualizado: ${DATE}*`
    );
    backup('README.md');
    writeFile('README.md', c);
    log('Badge y footer actualizados', 'ok');
    ok++;
  }
}

// ═════════════════════════════════════════════════════════════
// 6. PLAN_TRABAJO.md
// ═════════════════════════════════════════════════════════════
log('\n📝 [6/6] PLAN_TRABAJO.md');

{
  let c = readFile('PLAN_TRABAJO.md');
  if (!c) { log('No existe', 'fail'); fail++; }
  else if (c.includes('HALL-066-septies')) { log('Ya documentado', 'skip'); skip++; }
  else {
    const anchor = '## 16. HOTFIX v4.5.2';
    const newSection = `## 16b. HOTFIX v4.5.3 — HALL-066-septies (${DATE})

**Estado:** ✅ CERRADO

**Contexto:** El \`<select>\` HTML del modo oficial devuelve \`user_id\` como
STRING (\`"6"\`). Zod rechazaba con 400 "Invalid UUID". Fix: aceptar strings
numéricos y convertirlos a number.

**Commit:** \`4da002b\`

**Verificación end-to-end:** POST con \`user_id: "6"\` → 201 Created.
Fila insertada en \`event_participations\` con \`nick: AIRJUMP\`.

---

## 16. HOTFIX v4.5.2`;

    if (c.includes(anchor)) {
      c = c.replace(anchor, newSection);
      backup('PLAN_TRABAJO.md');
      writeFile('PLAN_TRABAJO.md', c);
      log('Sección 16b agregada', 'ok');
      ok++;
    } else {
      log('Ancla de sección 16 no encontrada', 'fail');
      fail++;
    }
  }
}

// ═════════════════════════════════════════════════════════════
// Resumen
// ═════════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════════');
console.log(`  ✅ OK: ${ok} · ⏭️  Skip: ${skip} · ❌ Fail: ${fail}`);
console.log('══════════════════════════════════════════════════════════\n');

console.log('📋 Próximos pasos:');
console.log('  1. git status');
console.log('  2. git diff --stat');
console.log('  3. git add CHANGELOG.md CURRENT_STATE.md FIXES_APPLIED.md README.md PLAN_TRABAJO.md docs/incidentes/HALL-066-completo.md scripts/docs-v4.5.3.cjs');
console.log('  4. git commit -m "docs(v4.5.3): documentar HALL-066-septies (user_id string numérico)"');
console.log('  5. git push origin main');
console.log('');