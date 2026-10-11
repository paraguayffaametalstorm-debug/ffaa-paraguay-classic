/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * Script de Documentación de Migración Fly.io → Render
 * ============================================================================
 *
 * Objetivo: documentar la migración de hosting del 2026-10-08 en todos
 * los documentos relevantes del repo, sin romper nada.
 *
 * Garantías:
 *   1. Backup automático antes de tocar cada archivo.
 *   2. Dry-run por default (requiere --apply para escribir).
 *   3. Idempotente: si ya está documentado, no duplica.
 *   4. Rollback automático con --rollback.
 *
 * Uso:
 *   node scripts\document-migration-render.cjs              → dry-run
 *   node scripts\document-migration-render.cjs --apply      → aplica
 *   node scripts\document-migration-render.cjs --rollback   → restaura
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Configuración ─────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');

const FILES = {
  ADR_009: path.join(ROOT, 'docs', 'adr', 'ADR-009-migracion-render.md'),
  ADR_README: path.join(ROOT, 'docs', 'adr', 'README.md'),
  README: path.join(ROOT, 'README.md'),
  CURRENT_STATE: path.join(ROOT, 'CURRENT_STATE.md'),
  DEPLOYMENT_GUIDE: path.join(ROOT, 'DEPLOYMENT_GUIDE.md'),
  DEPLOYMENT_STATE: path.join(ROOT, 'DEPLOYMENT_STATE.md'),
  CHANGELOG: path.join(ROOT, 'CHANGELOG.md'),
};

const APPLY = process.argv.includes('--apply');
const ROLLBACK = process.argv.includes('--rollback');

// ── Helpers ───────────────────────────────────────────────────────────────
function log(msg)    { console.log(msg); }
function ok(msg)     { console.log('  \x1b[32m\u2713\x1b[0m ' + msg); }
function warn(msg)   { console.log('  \x1b[33m\u26A0\x1b[0m ' + msg); }
function fail(msg)   { console.log('  \x1b[31m\u2717\x1b[0m ' + msg); process.exit(1); }
function header(msg) { console.log('\n\x1b[36m\u25B6 ' + msg + '\x1b[0m'); }

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function readFile(p) {
  if (!fs.existsSync(p)) fail(`Archivo no encontrado: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

// ── Contenido de los textos a insertar ────────────────────────────────────

const MIGRATION_MARKER = 'PRODUCCIÓN MIGRADA A RENDER.COM';
const MIGRATION_DATE = '2026-10-08';

const ADR_009_CONTENT = `# ADR-009: Migración de Fly.io a Render.com

- **Fecha:** ${MIGRATION_DATE}
- **Estado:** ✅ Accepted
- **Decisores:** PJPIROVANI (OWNER)
- **Relacionado con:** Factura pendiente de Fly.io (US$5.62)

## Estado

Accepted (vigente desde ${MIGRATION_DATE}, migración completada y verificada).

## Contexto y problema

El sistema operaba en **Fly.io** (región \`gru\` - São Paulo) con \`min_machines_running = 1\`,
lo que generaba un costo continuo de ~US$5.62/mes. La tarjeta asociada fue rechazada
por el banco emisor y el OWNER no disponía de otra tarjeta internacional.

Situación:
- **Factura impaga:** US$5.62 (2026-10-05).
- **Plazo de Fly.io:** 3 semanas hasta quedar *delinquent* (no deployable), 6 semanas hasta apagado.
- **Riesgo:** Pérdida del servicio para 28 pilotos activos.
- **Restricción:** Cero costo mensual real, sin tarjeta.

## Decisión

**Migrar la aplicación a Render.com (plan Free, $0/mes, sin tarjeta).**

### Alternativas evaluadas

| Opción | Costo | Tarjeta | Cold start | Veredicto |
|---|---|---|---|---|
| **Fly.io (min_machines=0)** | ~$1/mes | Sí | 3-5s | ❌ Requiere tarjeta |
| **Render.com (Free)** | $0 | No | 30-50s | ✅ **Elegida** |
| **Koyeb (Free)** | $0 | No | 5-10s | ⚠️ Alternativa válida |
| **Railway** | $5 crédito | Sí | 1s | ❌ Requiere tarjeta |
| **Vercel** | $0 | No | 0s | ❌ Refactor 2-3 semanas |
| **Supabase Edge Functions** | Incluido | No | 0s | ❌ Refactor 2-3 semanas |

## Consecuencias

### Positivas

- **Costo $0 real** sin tarjeta.
- **Sin riesgo de suspensión** por falta de pago.
- **Aprovechamiento del repo existente** (Dockerfile y package.json funcionan tal cual).
- **Migración simple:** 60 minutos end-to-end.

### Negativas

- **Cold start de 30-50s** después de 15 min sin uso (plan Free).
- **Rendimiento degradado** en el primer request (warm-up).
- **Render duerme la app** después de inactividad prolongada.

### Neutrales

- **URL nueva:** \`https://paraguay-ffaa-metalstorm.onrender.com\`
- **URL vieja de Fly.io** se apagará sola (~6 semanas después de la factura impaga).
- **22 variables de entorno** migradas exitosamente (vía \`.env\` copy/paste).
- **Google OAuth Callback** actualizado a \`onrender.com\`.

## Implementación

### Pasos ejecutados

1. **Crear cuenta en Render.com** (sin tarjeta).
2. **Conectar el repo de GitHub** \`paraguayffaametalstorm-debug/ffaa-paraguay-classic\`.
3. **Crear Web Service:**
   - **Name:** \`paraguay-ffaa-metalstorm\`
   - **Language:** \`Node\`
   - **Region:** \`Oregon (US West)\`
   - **Build Command:** \`npm install --legacy-peer-deps --omit=dev\`
   - **Start Command:** \`node server.js\`
   - **Instance Type:** \`Free\` ($0/mes, 0.1 CPU, 512 MB RAM)
4. **Cargar 22 variables de entorno** vía \`.env\` (opción "Add from .env" de Render).
5. **Primer deploy** (41.8 segundos).
6. **Actualizar Google OAuth callback** en Google Cloud Console.
7. **Actualizar \`.env\` local** con la nueva URL.
8. **Verificar login end-to-end** (email + Google OAuth).

### Verificación

- ✅ **App live:** \`https://paraguay-ffaa-metalstorm.onrender.com\`
- ✅ **Supabase conectado** (verificado en logs).
- ✅ **Login con email** funcional.
- ✅ **Login con Google** funcional (post-fix callback).
- ✅ **22 env vars** cargadas.
- ✅ **Costo mensual:** $0.

## Pendientes

- **Fly.io:** dejar que la app se apague sola (~6 semanas). No pagar la factura de US$5.62.
- **Documentación:** actualizar \`DEPLOYMENT_GUIDE.md\` para reflejar la migración (pendiente).
- **Cold start:** monitorear que los pilotos acepten el delay de 30-50s.

## Referencias

- \`docs/adr/README.md\` — índice de ADRs.
- \`DEPLOYMENT_GUIDE.md\` — guía de despliegue (a actualizar).
- Repo: \`paraguayffaametalstorm-debug/ffaa-paraguay-classic\`
- Producción: \`https://paraguay-ffaa-metalstorm.onrender.com\`

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Migración ejecutada por el OWNER (PJPIROVANI) el ${MIGRATION_DATE}.
`;

const README_NOTICE = `> **⚠️ ${MIGRATION_MARKER} (${MIGRATION_DATE})**
>
> - **URL activa:** https://paraguay-ffaa-metalstorm.onrender.com
> - **Hosting legacy:** Fly.io (en proceso de baja por falta de pago)
> - **Razón:** Plan $0 sin tarjeta en Render.com
> - **Trade-off:** Cold start de 30-50s después de 15 min sin uso
> - **ADR completo:** [\`docs/adr/ADR-009-migracion-render.md\`](./docs/adr/ADR-009-migracion-render.md)

`;

const CURRENT_STATE_NOTICE = `

---

## 🚀 Migración de Hosting (${MIGRATION_DATE})

### Cambio de Fly.io a Render.com

| Aspecto | Antes (Fly.io) | Ahora (Render.com) |
|---|---|---|
| **URL** | \`paraguay-ffaa-metalstorm.fly.dev\` | \`paraguay-ffaa-metalstorm.onrender.com\` |
| **Costo** | ~US$5.62/mes | **$0/mes** |
| **Tarjeta** | Requerida | **No requerida** |
| **Cold start** | 3-5s | **30-50s** |
| **Plan** | shared-cpu-1x 512MB | Free 0.1 CPU 512MB |
| **Auto-deploy** | No (manual con \`fly deploy\`) | **Sí (git push → auto-deploy)** |
| **Estado** | ⏳ Impago (se apagará solo) | ✅ **Activo** |

**Razón:** Fly.io rechazó la tarjeta del OWNER. Migración a Render.com para lograr costo $0 real sin tarjeta.

**Configuración clave en Render:**
- **Language:** Node
- **Build Command:** \`npm install --legacy-peer-deps --omit=dev\`
- **Start Command:** \`node server.js\`
- **Instance Type:** Free ($0/mes)
- **Env vars:** 22 cargadas vía \`.env\` copy/paste

**ADR completo:** [\`docs/adr/ADR-009-migracion-render.md\`](./docs/adr/ADR-009-migracion-render.md)

`;

const DEPLOYMENT_GUIDE_NOTICE = `> **⚠️ ${MIGRATION_MARKER} (${MIGRATION_DATE})**
>
> La producción fue migrada de **Fly.io** a **Render.com** (plan Free, $0/mes).
> Este documento sigue describiendo el flujo original de Fly.io. Para la operación actual:
>
> - **URL activa:** https://paraguay-ffaa-metalstorm.onrender.com
> - **Deploy:** automático en cada \`git push origin main\`
> - **Panel:** https://dashboard.render.com
> - **Costo:** $0/mes (plan Free)
> - **ADR:** [\`docs/adr/ADR-009-migracion-render.md\`](./docs/adr/ADR-009-migracion-render.md)
>
> La sección de Fly.io se mantiene como **referencia histórica**.

`;

const DEPLOYMENT_STATE_NOTICE = `> **⚠️ ${MIGRATION_MARKER} (${MIGRATION_DATE})**
>
> El hosting de producción cambió de **Fly.io** a **Render.com** (plan Free, $0/mes).
> La URL activa ahora es:
>
> - **https://paraguay-ffaa-metalstorm.onrender.com**
>
> El esquema de base de datos (Supabase) permanece **sin cambios**. Todas las tablas,
> columnas, índices y políticas RLS siguen iguales.
>
> **ADR:** [\`docs/adr/ADR-009-migracion-render.md\`](./docs/adr/ADR-009-migracion-render.md)

`;

const CHANGELOG_ENTRY = `## [4.5.11] - ${MIGRATION_DATE}

### 🚀 Migración de Hosting: Fly.io → Render.com

#### Objetivo Cumplido

Migrar la aplicación de **Fly.io** a **Render.com** para eliminar el costo mensual
de ~US$5.62 (que requería tarjeta internacional) y lograr **$0/mes real** sin tarjeta.

#### Contexto

- **Fly.io** facturaba ~US$5.62/mes por la máquina \`min_machines_running = 1\`.
- La tarjeta del OWNER fue rechazada por el banco emisor.
- **Plazo de Fly.io:** 3 semanas hasta quedar \`delinquent\`, 6 semanas hasta apagado.
- **Alternativas evaluadas:** Render.com, Koyeb, Railway, Vercel, Supabase Edge Functions.

#### Decisión

**Render.com (plan Free)** — costo $0/mes, sin tarjeta, cold start de 30-50s aceptable.

#### Cambios Aplicados

| Aspecto | Antes (Fly.io) | Ahora (Render.com) |
|---|---|---|
| URL | \`paraguay-ffaa-metalstorm.fly.dev\` | \`paraguay-ffaa-metalstorm.onrender.com\` |
| Costo | ~$5.62/mes | **$0/mes** |
| Tarjeta | Requerida | **No requerida** |
| Cold start | 3-5s | 30-50s |
| Auto-deploy | No (manual) | **Sí (git push)** |

#### Configuración en Render

- **Language:** \`Node\`
- **Build Command:** \`npm install --legacy-peer-deps --omit=dev\`
- **Start Command:** \`node server.js\`
- **Instance Type:** \`Free\` ($0/mes, 0.1 CPU, 512 MB RAM)
- **Region:** \`Oregon (US West)\`
- **Env vars:** 22 cargadas vía \`.env\` copy/paste

#### Google OAuth

Se actualizó el callback en Google Cloud Console:

- **Nuevo:** \`https://paraguay-ffaa-metalstorm.onrender.com/api/auth/google/callback\`
- **Origen JS autorizado:** \`https://paraguay-ffaa-metalstorm.onrender.com\`
- **URL legacy (Fly.io):** se mantiene registrada como respaldo.

#### Verificación

- ✅ App live en Render.com
- ✅ Supabase conectado
- ✅ Login con email funcional
- ✅ Login con Google OAuth funcional
- ✅ 22 env vars cargadas
- ✅ Costo mensual: $0

#### Archivos Afectados

- \`docs/adr/ADR-009-migracion-render.md\` (NUEVO)
- \`docs/adr/README.md\` (agregado al índice)
- \`README.md\` (aviso al inicio)
- \`CURRENT_STATE.md\` (sección de migración)
- \`DEPLOYMENT_GUIDE.md\` (nota de migración)
- \`DEPLOYMENT_STATE.md\` (nota de migración)
- \`CHANGELOG.md\` (esta entrada)

#### Pendientes

- **Fly.io:** dejar que se apague sola (~6 semanas). No pagar.
- **Cold start:** monitorear que los pilotos acepten el delay.

#### Referencias

- \`docs/adr/ADR-009-migracion-render.md\`
- \`DEPLOYMENT_GUIDE.md\`
- Repo: \`paraguayffaametalstorm-debug/ffaa-paraguay-classic\`

---

`;

// ── Transformaciones ──────────────────────────────────────────────────────

function transformReadme(content) {
  if (content.includes(MIGRATION_MARKER)) {
    warn('README.md ya tiene el aviso de migración — saltando');
    return null;
  }

  // Insertar el aviso justo después del bloque de badges (primera línea con "---")
  const marker = '\n---\n';
  const idx = content.indexOf(marker);
  if (idx === -1) {
    fail('No se encontró el separador "---" en README.md');
  }

  // Insertar después del primer "---" (justo después de los badges)
  const insertPos = idx + marker.length;
  return content.slice(0, insertPos) + '\n' + README_NOTICE + content.slice(insertPos);
}

function transformCurrentState(content) {
  if (content.includes('Migración de Hosting')) {
    warn('CURRENT_STATE.md ya tiene la sección de migración — saltando');
    return null;
  }

  // Insertar la sección justo después del primer bloque de encabezado
  const marker = '---\n\n> **⚠️ NO MODIFICAR - ESTADO CONGELADO**';
  const idx = content.indexOf(marker);
  if (idx === -1) {
    // Fallback: insertar al final del archivo
    return content + CURRENT_STATE_NOTICE;
  }
  return content.slice(0, idx) + CURRENT_STATE_NOTICE + '\n' + content.slice(idx);
}

function transformDeploymentGuide(content) {
  if (content.includes(MIGRATION_MARKER)) {
    warn('DEPLOYMENT_GUIDE.md ya tiene el aviso de migración — saltando');
    return null;
  }

  // Insertar después del bloque de encabezado (después del primer "---")
  const marker = '\n---\n';
  const idx = content.indexOf(marker);
  if (idx === -1) {
    fail('No se encontró el separador "---" en DEPLOYMENT_GUIDE.md');
  }
  const insertPos = idx + marker.length;
  return content.slice(0, insertPos) + '\n' + DEPLOYMENT_GUIDE_NOTICE + content.slice(insertPos);
}

function transformDeploymentState(content) {
  if (content.includes(MIGRATION_MARKER)) {
    warn('DEPLOYMENT_STATE.md ya tiene el aviso de migración — saltando');
    return null;
  }

  // Insertar al inicio, después de la primera línea
  const lines = content.split('\n');
  const insertPos = lines.findIndex(l => l.startsWith('>')) + 1;
  if (insertPos <= 0) {
    // Fallback: insertar al inicio
    return DEPLOYMENT_STATE_NOTICE + '\n' + content;
  }
  return lines.slice(0, insertPos).join('\n') + '\n' + DEPLOYMENT_STATE_NOTICE + lines.slice(insertPos).join('\n');
}

function transformChangelog(content) {
  if (content.includes('Migración de Hosting: Fly.io → Render.com')) {
    warn('CHANGELOG.md ya tiene la entrada de migración — saltando');
    return null;
  }

  // Insertar después del primer "---" y antes de la entrada [4.5.10]
  const marker = '## [4.5.10]';
  const idx = content.indexOf(marker);
  if (idx === -1) {
    fail('No se encontró la entrada [4.5.10] en CHANGELOG.md');
  }
  // Retroceder hasta el "---" anterior (o insertar justo antes)
  const beforeIdx = content.lastIndexOf('---', idx);
  const insertPos = beforeIdx > 0 ? beforeIdx + 3 : idx;
  return content.slice(0, insertPos) + '\n\n' + CHANGELOG_ENTRY + content.slice(insertPos);
}

function transformAdrReadme(content) {
  if (content.includes('ADR-009')) {
    warn('docs/adr/README.md ya tiene ADR-009 — saltando');
    return null;
  }

  // Agregar fila al listado de ADRs
  const marker = '| ADR-008 |';
  const idx = content.indexOf(marker);
  if (idx === -1) {
    fail('No se encontró la fila de ADR-008 en docs/adr/README.md');
  }
  const lineEnd = content.indexOf('\n', idx);
  const newRow = '| ADR-009 | Migración de Fly.io a Render.com | ' + MIGRATION_DATE + ' | ✅ Accepted |';

  return content.slice(0, lineEnd + 1) + newRow + '\n' + content.slice(lineEnd + 1);
}

// ── Backup y escritura ────────────────────────────────────────────────────

function backupAndWrite(filePath, newContent, ts) {
  if (!newContent) {
    return { skipped: true };
  }

  if (fs.existsSync(filePath)) {
    const backupPath = `${filePath}.bak-${ts}`;
    fs.copyFileSync(filePath, backupPath);
    ok(`Backup: ${path.relative(ROOT, backupPath)}`);
  }

  writeFile(filePath, newContent);
  ok(`${path.relative(ROOT, filePath)} actualizado`);
  return { skipped: false };
}

// ── Rollback ──────────────────────────────────────────────────────────────

function doRollback() {
  header('ROLLBACK — Restaurando backups');

  const dirs = [
    ROOT,
    path.join(ROOT, 'docs', 'adr'),
  ];

  let restored = 0;
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir)
      .filter(f => f.includes('.bak-'))
      .map(f => ({ name: f, path: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);

    files.forEach(f => {
      // Restaurar el archivo original (sin .bak-XXX)
      const original = f.path.replace(/\.bak-\d{8}-\d{6}$/, '');
      if (fs.existsSync(f.path) && original !== f.path) {
        fs.copyFileSync(f.path, original);
        ok(`Restaurado: ${path.relative(ROOT, original)}`);
        restored++;
      }
    });
  });

  if (restored === 0) {
    warn('No se encontraron backups para restaurar.');
  } else {
    log(`\n\x1b[32m\u2705 ${restored} archivo(s) restaurado(s).\x1b[0m`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

function main() {
  console.log('\n\x1b[36m+============================================================+\x1b[0m');
  console.log('\x1b[36m|  DOCUMENTAR MIGRACIÓN FLY.IO -> RENDER                     |\x1b[0m');
  console.log('\x1b[36m|  PARAGUAY-FFAA | METALSTORM                                |\x1b[0m');
  console.log('\x1b[36m+============================================================+\x1b[0m');

  if (ROLLBACK) {
    doRollback();
    return;
  }

  if (!APPLY) {
    log('\n\x1b[33m\u26A1 MODO DRY-RUN — no se escribe nada\x1b[0m');
    log('   Para aplicar los cambios, correr con --apply\n');
  }

  header('VERIFICACIÓN DE ARCHIVOS');

  // Verificar que existan los archivos a modificar
  const requiredFiles = [
    FILES.README,
    FILES.CURRENT_STATE,
    FILES.DEPLOYMENT_GUIDE,
    FILES.DEPLOYMENT_STATE,
    FILES.CHANGELOG,
    FILES.ADR_README,
  ];

  requiredFiles.forEach(f => {
    if (!fs.existsSync(f)) {
      fail(`Archivo requerido no encontrado: ${path.relative(ROOT, f)}`);
    }
    ok(`Encontrado: ${path.relative(ROOT, f)}`);
  });

  // Verificar que exista el directorio de ADRs
  const adrDir = path.dirname(FILES.ADR_009);
  if (!fs.existsSync(adrDir)) {
    fail(`Directorio no encontrado: ${path.relative(ROOT, adrDir)}`);
  }
  ok(`Directorio ADR: ${path.relative(ROOT, adrDir)}`);

  header('PREPARANDO TRANSFORMACIONES');

  // Preparar las transformaciones (dry-run)
  const plan = [
    { file: FILES.ADR_009, content: ADR_009_CONTENT, action: 'create', label: 'ADR-009 (nuevo)' },
    { file: FILES.README, content: transformReadme(readFile(FILES.README)), action: 'modify', label: 'README.md' },
    { file: FILES.CURRENT_STATE, content: transformCurrentState(readFile(FILES.CURRENT_STATE)), action: 'modify', label: 'CURRENT_STATE.md' },
    { file: FILES.DEPLOYMENT_GUIDE, content: transformDeploymentGuide(readFile(FILES.DEPLOYMENT_GUIDE)), action: 'modify', label: 'DEPLOYMENT_GUIDE.md' },
    { file: FILES.DEPLOYMENT_STATE, content: transformDeploymentState(readFile(FILES.DEPLOYMENT_STATE)), action: 'modify', label: 'DEPLOYMENT_STATE.md' },
    { file: FILES.CHANGELOG, content: transformChangelog(readFile(FILES.CHANGELOG)), action: 'modify', label: 'CHANGELOG.md' },
    { file: FILES.ADR_README, content: transformAdrReadme(readFile(FILES.ADR_README)), action: 'modify', label: 'docs/adr/README.md' },
  ];

  const pending = plan.filter(p => p.content !== null);
  const skipped = plan.filter(p => p.content === null);

  log(`\n  Archivos a modificar: ${pending.length}`);
  pending.forEach(p => ok(`${p.label} (${p.action})`));

  if (skipped.length > 0) {
    log(`\n  Archivos ya documentados (sin cambios): ${skipped.length}`);
    skipped.forEach(p => warn(`${p.label} (ya tiene la info)`));
  }

  if (!APPLY) {
    header('RESUMEN (DRY-RUN)');
    log('');
    log('\x1b[33m   Para aplicar los cambios, ejecutá:\x1b[0m');
    log('\x1b[36m   node scripts\\document-migration-render.cjs --apply\x1b[0m');
    log('');
    return;
  }

  // Aplicar
  header('APLICANDO CAMBIOS');
  const ts = timestamp();

  let applied = 0;
  plan.forEach(p => {
    if (p.content === null) return;
    if (p.action === 'create') {
      writeFile(p.file, p.content);
      ok(`${p.label} creado`);
      applied++;
    } else {
      const result = backupAndWrite(p.file, p.content, ts);
      if (!result.skipped) applied++;
    }
  });

  header('\u2705 COMPLETADO');
  log(`\n\x1b[32m   ${applied} archivo(s) actualizado(s):\x1b[0m`);
  log('     \u2713 docs/adr/ADR-009-migracion-render.md (nuevo)');
  log('     \u2713 docs/adr/README.md (índice actualizado)');
  log('     \u2713 README.md (aviso al inicio)');
  log('     \u2713 CURRENT_STATE.md (sección de migración)');
  log('     \u2713 DEPLOYMENT_GUIDE.md (nota de migración)');
  log('     \u2713 DEPLOYMENT_STATE.md (nota de migración)');
  log('     \u2713 CHANGELOG.md (entrada [4.5.11])');
  log('');
  log('\x1b[33m   Para verificar:\x1b[0m');
  log('     git diff --stat');
  log('     git status');
  log('');
  log('\x1b[33m   Para hacer commit + push:\x1b[0m');
  log('     git add docs/adr/ADR-009-migracion-render.md docs/adr/README.md README.md CURRENT_STATE.md DEPLOYMENT_GUIDE.md DEPLOYMENT_STATE.md CHANGELOG.md scripts/document-migration-render.cjs');
  log('     git commit -m "docs(adr-009): documentar migracion Fly.io -> Render.com"');
  log('     git push origin main');
  log('');
  log('\x1b[31m   Si algo sale mal:\x1b[0m');
  log('     node scripts\\document-migration-render.cjs --rollback');
  log('');
}

main();
