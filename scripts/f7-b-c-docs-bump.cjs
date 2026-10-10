// scripts/f7-b-c-docs-bump.cjs
//
// F7-B (Docs) + F7-C (Bump de versión) — v3 FINAL.
//
// Uso:
//   node scripts/f7-b-c-docs-bump.cjs --dry-run
//   node scripts/f7-b-c-docs-bump.cjs
//
// Idempotente. Auto-adaptativo. Backups .bak-f7b.
// Normaliza sw.js a v4.8.0 (permite retroceso desde v4.8.1 con warning).

const fs = require('fs');
const path = require('path');

// ─── CONFIGURACIÓN ────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const NEW_VERSION = '4.8.0';
const NEW_CACHE_NAME = `PARAGUAY-FFAA-METALSTORM-v${NEW_VERSION}`;
const NEW_ASSET_VERSION = `v=${NEW_VERSION}`;
const TODAY = new Date().toISOString().split('T')[0];

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUP_SUFFIX = '.bak-f7b';

// ─── HELPERS ──────────────────────────────────────────────────────

function readFile(relPath) {
  const abs = path.join(PROJECT_ROOT, relPath);
  try {
    return { abs, content: fs.readFileSync(abs, 'utf8') };
  } catch (err) {
    return { abs, content: null, error: err.message };
  }
}

function writeFileWithBackup(abs, newContent, originalContent) {
  if (DRY_RUN) return true;
  try {
    fs.writeFileSync(`${abs}${BACKUP_SUFFIX}`, originalContent, 'utf8');
  } catch (err) {
    console.error(`   ❌ No se pudo crear backup: ${err.message}`);
    return false;
  }
  try {
    fs.writeFileSync(abs, newContent, 'utf8');
    return true;
  } catch (err) {
    console.error(`   ❌ No se pudo escribir: ${err.message}. Restaurando...`);
    fs.writeFileSync(abs, originalContent, 'utf8');
    return false;
  }
}

function detectCacheName() {
  const { content } = readFile('sw.js');
  if (!content) return null;
  const match = content.match(/const CACHE_NAME\s*=\s*'([^']+)'/);
  return match ? match[1] : null;
}

function detectAssetVersions() {
  const { content } = readFile('index.html');
  if (!content) return [];
  const matches = content.match(/\?v=[\d.]+/g) || [];
  return [...new Set(matches)];
}

// ─── CAMBIOS ──────────────────────────────────────────────────────

const changes = [
  // ══════════════════════════════════════════════════════════════
  // F7-B: DOCUMENTACIÓN
  // ══════════════════════════════════════════════════════════════

  {
    file: 'CHANGELOG.md',
    description: `Agregar entrada [${NEW_VERSION}]`,
    apply: (content) => {
      if (content.includes(`## [${NEW_VERSION}]`)) return content;
      const anchor = '## [4.7.3]';
      if (!content.includes(anchor)) return content;
      const entry = `## [${NEW_VERSION}] - ${TODAY}

### ✅ F7-A — Tests de la Sección Veteranos (ADR-010)

- **55 tests pasando** (100% de la suite F7-A).
- **4 archivos de tests nuevos:**
  - \`tests/controllers/veteran.controller.test.js\` (34 tests).
  - \`tests/middlewares/mentorOwnership.test.js\` (10 tests).
  - \`tests/controllers/admin.controller.mentorship.test.js\` (7 tests).
  - \`tests/frontend/admin-veterans.test.js\` (4 tests).
- **Fix del mock stateful** con contadores separados para \`.then()\` y \`.single()\`.
- **Dependencia agregada:** \`jsdom\` (para tests de frontend).

### 📚 F7-B — Documentación de la Sección Veteranos

- \`API_REFERENCE.md\` — nueva sección \`/api/veteran/*\` (5 endpoints).
- \`ARCHITECTURE.md\` — §8.5 Sistema de Mentorías.
- \`CURRENT_STATE.md\` — fila del módulo de mentorías.
- \`DEPLOYMENT_STATE.md\` — 3 tablas nuevas.
- \`USER_MANUAL.md\` — §7 Guía para Veteranos.
- \`BACKLOG.md\` — BL-031 movido a Completados.
- \`PLAN_TRABAJO.md\` — Sprint 6 cerrado.
- \`docs/adr/ADR-010-seccion-veteranos.md\` — Proposed → Accepted.
- \`docs/adr/README.md\` — ADR-010 Accepted.

### 🔧 F7-C — Bump de Versión

- \`sw.js\` — \`CACHE_NAME\` → \`v${NEW_VERSION}\` (normalizado desde v4.8.1).
- \`index.html\` — assets unificados a \`?v=${NEW_VERSION}\`.

### 📋 Pendiente (F7-D)

- Deploy a Render.
- Smoke test en producción.

- **Archivos:** \`tests/**\`, \`js/**\`, \`components/**\`, \`sw.js\`, \`index.html\`, \`package.json\`, 10 documentos \`.md\`.
- **Commit:** \`(pendiente)\`.

---

`;
      return content.replace(anchor, entry + anchor);
    },
  },

  {
    file: 'API_REFERENCE.md',
    description: 'Agregar sección /api/veteran/*',
    apply: (content) => {
      if (content.includes('Módulo de Veteranos')) return content;

      // Ancla permisiva: no empieza con ##, matchea aunque haya BOM/CRLF
      const anchor = 'Gestión de Catálogo de Aeronaves (`/api/plane-models`)';
      if (!content.includes(anchor)) {
        console.log(`   ⚠️  Ancla API_REFERENCE no encontrada. Se omite.`);
        return content;
      }

      const section = `## 8. Módulo de Veteranos (\`/api/veteran\`)

> **Módulo nuevo (v${NEW_VERSION})** — Gestión de mentorías para el rol VETERANO según ADR-010.

### \`GET /api/veteran/my-pupilos\`
Lista los pupilos activos del Veterano autenticado.
- **Acceso:** \`VETERANO\` (propios), \`ADMIN\`, \`OWNER\` (todos).
- **Query Params:** \`?mentor_id=UUID\` (opcional, solo ADMIN/OWNER).
- **Response Exitosa (200 OK):**
  \`\`\`json
  {
    "success": true,
    "pupilos": [
      {
        "mentorship_id": "uuid-mentoria",
        "mentee_id": "uuid-pupilo",
        "mentee_nick": "PUPILO_NUEVO",
        "started_at": "2026-09-15T10:00:00Z",
        "last_contact_at": "2026-09-21T18:30:00Z",
        "perf_status": "VERDE"
      }
    ],
    "total": 1
  }
  \`\`\`

### \`GET /api/veteran/my-mentorships\`
Historial completo de mentorías (activas y pasadas).
- **Acceso:** \`VETERANO\` (propios), \`ADMIN\`, \`OWNER\` (todos).

### \`GET /api/veteran/mentorship/:id\`
Detalle de una mentoría, incluyendo logs y evaluaciones.
- **Acceso:** \`VETERANO\` dueño, \`ADMIN\`, \`OWNER\`.
- **Middleware:** \`requireMentorOwnership\`.
- **Errores:** \`400 INVALID_MENTORSHIP_ID\`, \`404 MENTORSHIP_NOT_FOUND\`, \`403 MENTORSHIP_FORBIDDEN\`.

### \`POST /api/veteran/mentorship/:id/log\`
Registra un contacto de mentoría.
- **Acceso:** \`VETERANO\` dueño, \`ADMIN\`, \`OWNER\`.
- **Request Body:**
  \`\`\`json
  { "note": "Revisión de tácticas de combate en equipo." }
  \`\`\`
- **Validaciones:** \`note\` requerido, 1-2000 chars. Mentoría debe estar \`ACTIVE\`.
- **Errores:** \`400 NOTE_REQUIRED\`, \`400 NOTE_TOO_LONG\`, \`400 MENTORSHIP_NOT_ACTIVE\`.

### \`POST /api/veteran/mentorship/:id/evaluate\`
Emite una evaluación consultiva.
- **Acceso:** \`VETERANO\` dueño, \`ADMIN\`, \`OWNER\`.
- **Request Body:**
  \`\`\`json
  {
    "criteria": { "participacion": 4, "cooperacion": 5, "conducta": 5, "integracion": 4, "disposicion": 5 },
    "summary": "Pupilo con excelente actitud y rápida curva de aprendizaje."
  }
  \`\`\`
- **Validaciones:** \`criteria\` con 5 campos (1-5), \`summary\` 1-4000 chars.
- **Errores:** \`400 INVALID_CRITERIA\`, \`400 SUMMARY_REQUIRED\`, \`400 SUMMARY_TOO_LONG\`, \`400 MENTORSHIP_NOT_ACTIVE\`.

### \`GET /api/veteran/my-stats\`
Estadísticas del Veterano (o vista global para ADMIN/OWNER).

### Endpoints Admin (\`/api/admin/mentorships\`)

| Método | Endpoint | Descripción |
|---|---|---|
| \`POST\` | \`/api/admin/mentorships\` | Crear mentoría manualmente |
| \`PATCH\` | \`/api/admin/mentorships/:id\` | Cerrar o reasignar mentoría |
| \`GET\` | \`/api/admin/mentorships\` | Listar todas las mentorías |

**Acceso:** \`ADMIN\`, \`OWNER\`.

---

`;
      return content.replace(anchor, section + anchor);
    },
  },

  {
    file: 'ARCHITECTURE.md',
    description: 'Agregar §8.5 Sistema de Mentorías',
    apply: (content) => {
      if (content.includes('Sistema de Mentorías')) return content;

      // Ancla permisiva
      const anchor = 'Integración con la Wiki de Metalstorm';
      if (!content.includes(anchor)) {
        console.log(`   ⚠️  Ancla ARCHITECTURE no encontrada. Se omite.`);
        return content;
      }

      const section = `## 8.5. Sistema de Mentorías (ADR-010)

A partir de la v${NEW_VERSION}, el sistema incorpora un módulo de mentorías para formalizar la relación entre un Veterano y un nuevo Miembro, según la normativa v2.0.

### Modelo de Datos

Tres tablas nuevas soportan el sistema:

- **\`mentorships\`:** Relación mentor ↔ pupilo.
  - Columnas: \`id\`, \`mentor_id\`, \`mentee_id\`, \`started_at\`, \`ended_at\`, \`status\`, \`ended_reason\`, \`created_by\`, \`created_at\`.
  - \`status\`: \`'ACTIVE'\` | \`'ENDED'\` | \`'REASSIGNED'\`.
  - Índice único parcial: \`(mentee_id) WHERE status = 'ACTIVE'\`.
- **\`mentorship_logs\`:** Registro de contactos entre mentor y pupilo.
- **\`mentor_evaluations\`:** Evaluaciones consultivas.

Todas las tablas tienen RLS con política \`no_public_access\` y \`GRANT\` explícito para \`service_role\` (requisito Supabase post-2026-10-30).

### Flujo de Auto-asignación

Al crear un nuevo miembro (\`POST /api/admin/members\`):
1. Busca \`role = 'VETERANO'\` y \`status = 'ACTIVE'\`.
2. Cuenta cuántos pupilos activos tiene cada uno.
3. Asigna al Veterano con **menos pupilos**.
4. Si no hay Veteranos, el miembro se crea sin mentor.
5. Audita en \`audit_logs\` con acción \`MENTORSHIP_AUTO_ASSIGNED\`.

### RBAC Fino

El middleware \`requireMentorOwnership\` garantiza:
- \`VETERANO\` solo ve/modifica **sus** mentorías.
- \`ADMIN\` / \`OWNER\` ven/modifican **cualquiera**.
- \`MIEMBRO\` recibe \`403 MENTORSHIP_FORBIDDEN\`.

### Frontend

- \`components/veteran-panel.html\`, \`js/veteran.js\` — vista del Veterano.
- \`components/admin-sections/admin-veterans.html\`, \`js/admin-veterans.js\` — sección admin.

---

`;
      return content.replace(anchor, section + anchor);
    },
  },

  {
    file: 'CURRENT_STATE.md',
    description: 'Agregar fila del módulo de mentorías',
    apply: (content) => {
      if (content.includes('Sección Veteranos (Mentorías)')) return content;
      const anchor = '| **Dropdown de Roles (HALL-S2-02, v4.5.6)** |';
      if (!content.includes(anchor)) return content;
      const newRow = `| **Sección Veteranos (Mentorías) (v${NEW_VERSION})** | ✅ Funcional | Vista propia para VETERANO, auto-asignación, RBAC fino y sección admin. 55 tests. |\n`;
      return content.replace(anchor, newRow + anchor);
    },
  },

  {
    file: 'DEPLOYMENT_STATE.md',
    description: 'Agregar las 3 tablas nuevas',
    apply: (content) => {
      if (content.includes('`mentorships`')) return content;
      const anchor = '| `user_settings` | Configuración | 0 | ✅ Documentada |';
      if (!content.includes(anchor)) return content;
      const newRows = `| \`mentorships\` | Veteranos | 0 | ✅ Documentada (v${NEW_VERSION}) |\n| \`mentorship_logs\` | Veteranos | 0 | ✅ Documentada (v${NEW_VERSION}) |\n| \`mentor_evaluations\` | Veteranos | 0 | ✅ Documentada (v${NEW_VERSION}) |`;
      return content.replace(anchor, anchor + '\n' + newRows);
    },
  },

  {
    file: 'USER_MANUAL.md',
    description: 'Agregar §7 Guía para Veteranos',
    apply: (content) => {
      if (content.includes('Guía para Veteranos: Mentoría')) return content;
      const anchor = '## 6. Preguntas Frecuentes (FAQ)';
      if (!content.includes(anchor)) return content;
      const section = `## 7. Guía para Veteranos: Mentoría

A partir de la v${NEW_VERSION}, los pilotos con rango **VETERANO** tienen acceso a un panel especial para gestionar a sus pupilos.

### ¿Qué es un Pupilo?

Un pupilo es un nuevo miembro del escuadrón que te ha sido asignado automáticamente para que lo guíes durante sus primeros pasos.

### Acceso al Panel de Mentoría

Si sos VETERANO y tenés pupilos asignados, verás una nueva opción en el menú principal: **"🎖️ Mi Mentoría"**.

### Funcionalidades

- **Ver mis pupilos:** Lista de todos los miembros a tu cargo, con su estado actual (tokens, días, semáforo).
- **Registrar contacto:** Anotá cada vez que te comuniques con tu pupilo para llevar un historial.
- **Evaluación consultiva:** Podés emitir una evaluación de tu pupilo (opcional, consultiva).

---

`;
      return content.replace(anchor, section + anchor);
    },
  },

  {
    file: 'BACKLOG.md',
    description: 'Mover BL-031 a Completados',
    apply: (content) => {
      const activeItem = '| **BL-031** | ✨ | Sección Veteranos: vista propia + mentoría + panel admin | 📋 Priorizado | M (5-7 días) | Nuevo módulo según ADR-010. Ver `PLAN_TRABAJO_VETERANOS.md`. Ref: normativa v2.0 + v3.0. |';
      if (!content.includes(activeItem)) {
        // Ya fue movido
        if (content.includes('| **BL-031** | ✨ | Sección Veteranos (mentoría + RBAC fino)')) {
          return content;
        }
        return content;
      }
      content = content.replace(activeItem + '\n', '');
      const completedRow = `| **BL-031** | ✨ | Sección Veteranos (mentoría + RBAC fino) | ${TODAY} (F7) | (pendiente) |`;
      const anchor = '| **Sprint 3 (parcial)** | 🧪 | 287 tests pasando · 69 skipeados (BL-025) | 2026-09-23 | (Sprint 3) |';
      if (content.includes(anchor)) {
        content = content.replace(anchor, anchor + '\n' + completedRow);
      }
      return content;
    },
  },

  {
    file: 'PLAN_TRABAJO.md',
    description: 'Marcar Sprint 6 como cerrado',
    apply: (content) => {
      if (content.includes('✅ CERRADO (v4.8.0)')) return content;
      const anchor = '## SPRINT 6 — Sección Veteranos (mentoría + RBAC fino)\n\n**Estado:** 📋 Planificado';
      if (!content.includes(anchor)) return content;
      const replacement = `## SPRINT 6 — Sección Veteranos (mentoría + RBAC fino)\n\n**Estado:** ✅ CERRADO (v${NEW_VERSION})`;
      return content.replace(anchor, replacement);
    },
  },

  {
    file: 'docs/adr/ADR-010-seccion-veteranos.md',
    description: 'Cambiar estado a ✅ Accepted',
    apply: (content) => {
      return content
        .replace('- **Estado:** 📝 Proposed (pendiente de validación del OWNER)', '- **Estado:** ✅ Accepted')
        .replace(
          '**📝 Proposed** — pendiente de validación del OWNER.\nNo se toca código de producción hasta que pase a `Accepted`.',
          `**✅ Accepted (v${NEW_VERSION})** — Implementado y validado por el OWNER.`
        );
    },
  },

  {
    file: 'docs/adr/README.md',
    description: 'Marcar ADR-010 como Accepted',
    apply: (content) => {
      const anchor = '| ADR-010 | Sección Veteranos (mentoría + RBAC fino) | 2026-10-10 | 📝 Proposed |';
      const replacement = '| ADR-010 | Sección Veteranos (mentoría + RBAC fino) | 2026-10-10 | ✅ Accepted |';
      return content.replace(anchor, replacement);
    },
  },

  // ══════════════════════════════════════════════════════════════
  // F7-C: BUMP (dinámico, permite normalización)
  // ══════════════════════════════════════════════════════════════

  {
    file: 'sw.js',
    description: `Normalizar CACHE_NAME → ${NEW_CACHE_NAME}`,
    apply: (content) => {
      const current = detectCacheName();
      if (!current) return content;
      if (current === NEW_CACHE_NAME) return content;
      return content.replace(
        `const CACHE_NAME = '${current}';`,
        `const CACHE_NAME = '${NEW_CACHE_NAME}';`
      );
    },
  },

  {
    file: 'index.html',
    description: `Unificar assets → ${NEW_ASSET_VERSION}`,
    apply: (content) => {
      const versions = detectAssetVersions();
      if (versions.length === 0) return content;
      if (versions.length === 1 && versions[0] === NEW_ASSET_VERSION) return content;
      let newContent = content;
      for (const oldV of versions) {
        if (oldV === NEW_ASSET_VERSION) continue;
        newContent = newContent.split(oldV).join(NEW_ASSET_VERSION);
      }
      return newContent;
    },
  },
];

// ─── EJECUCIÓN ────────────────────────────────────────────────────

console.log('══════════════════════════════════════════════════════');
console.log(`  PARAGUAY-FFAA | METALSTORM — F7-B + F7-C`);
console.log(`  Modo: ${DRY_RUN ? '🔍 SIMULACIÓN (DRY RUN)' : '🚀 APLICAR CAMBIOS'}`);
console.log(`  Versión objetivo: v${NEW_VERSION}`);
console.log('══════════════════════════════════════════════════════\n');

console.log('🔎 Detección de estado actual:');
const currentCache = detectCacheName();
const currentAssets = detectAssetVersions();
console.log(`   sw.js CACHE_NAME: ${currentCache || '(no detectado)'}`);
console.log(`   index.html assets: ${currentAssets.length > 0 ? currentAssets.join(', ') : '(no detectado)'}`);

if (currentCache) {
  const currVer = currentCache.match(/v([\d.]+)$/);
  const newVer = NEW_CACHE_NAME.match(/v([\d.]+)$/);
  if (currVer && newVer && currVer[1] !== newVer[1]) {
    const cmp = currVer[1].localeCompare(newVer[1], undefined, { numeric: true });
    if (cmp > 0) {
      console.log(`   ⚠️  WARNING: CACHE_NAME actual (v${currVer[1]}) es POSTERIOR a v${newVer[1]}.`);
      console.log(`   ⚠️  El script va a NORMALIZAR a v${newVer[1]} (retroceso intencional).`);
    }
  }
}
console.log(`   → Bump a: CACHE_NAME='${NEW_CACHE_NAME}', assets='${NEW_ASSET_VERSION}'\n`);

let applied = 0, skipped = 0, failed = 0;

for (const change of changes) {
  const { abs, content, error } = readFile(change.file);
  if (error) {
    console.log(`❌ [ MISSING ] ${change.file} — ${error}`);
    failed++;
    continue;
  }
  const newContent = change.apply(content);
  if (newContent === content) {
    console.log(`⏭️  [ SKIP   ] ${change.file}`);
    skipped++;
    continue;
  }
  const ok = writeFileWithBackup(abs, newContent, content);
  if (ok) {
    console.log(`✅ [ APPLY  ] ${change.file} → ${change.description}`);
    applied++;
  } else {
    console.log(`❌ [ FAIL   ] ${change.file}`);
    failed++;
  }
}

console.log('\n══════════════════════════════════════════════════════');
console.log('  RESUMEN');
console.log('══════════════════════════════════════════════════════');
console.log(`   ✅ Aplicados:  ${applied}`);
console.log(`   ⏭️  Skipeados: ${skipped}`);
console.log(`   ❌ Fallidos:   ${failed}`);
console.log('══════════════════════════════════════════════════════\n');

if (DRY_RUN) {
  console.log('ℹ️  Esto fue una SIMULACIÓN. Nada se escribió.');
  console.log('➡️  Ejecutá sin --dry-run para aplicar los cambios.\n');
} else if (applied > 0) {
  console.log(`ℹ️  Los backups se guardaron como *${BACKUP_SUFFIX}`);
  console.log('➡️  Verificá con "git diff" antes de commitear.\n');
} else {
  console.log('ℹ️  Nada que aplicar. Los archivos ya estaban actualizados.\n');
}