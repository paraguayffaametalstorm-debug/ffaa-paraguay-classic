/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * F4.0a — Actualizar ADR-005 de Proposed a Accepted
 * ============================================================================
 * Sprint 4 — Housekeeping (docs)
 *
 * Cambios:
 *   1. docs/adr/ADR-005-presence-en-supabase.md
 *      - Header: Estado Proposed → Accepted
 *      - Sección "## Estado": explicar que está implementado
 *      - Sección "## Pendiente de verificar": "Nada pendiente"
 *   2. docs/adr/README.md
 *      - Tabla: ADR-005 Proposed → Accepted
 *      - Sección "Próximos ADRs Planificados": eliminar ADR-005
 *
 * Uso:
 *   node scripts/f4.0a-update-adr-005.cjs
 *
 * Rollback:
 *   Renombrar los .bak-f4.0a nuevamente a sus originales
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ADR_FILE = path.join(ROOT, 'docs', 'adr', 'ADR-005-presence-en-supabase.md');
const README_FILE = path.join(ROOT, 'docs', 'adr', 'README.md');

// ── Helpers ──────────────────────────────────────────────────

function readFile(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`Archivo no encontrado: ${p}`);
  }
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function backup(p) {
  const bak = p + '.bak-f4.0a';
  if (fs.existsSync(bak)) {
    fs.unlinkSync(bak);
  }
  fs.copyFileSync(p, bak);
  console.log(`   💾 Backup: ${path.basename(bak)}`);
}

function replaceOnce(content, search, replacement, label) {
  const idx = content.indexOf(search);
  if (idx === -1) {
    throw new Error(`[${label}] No se encontró el texto a reemplazar:\n${search.substring(0, 120)}...`);
  }
  const count = content.split(search).length - 1;
  if (count > 1) {
    throw new Error(`[${label}] El texto aparece ${count} veces (debe ser único):\n${search.substring(0, 120)}...`);
  }
  return content.replace(search, replacement);
}

// ── Main ─────────────────────────────────────────────────────

function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  F4.0a — Actualizar ADR-005: Proposed → Accepted');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  // ── Archivo 1: ADR-005 ─────────────────────────────────────
  console.log('📄 [1/2] Modificando docs/adr/ADR-005-presence-en-supabase.md');
  backup(ADR_FILE);
  let adr = readFile(ADR_FILE);

  // Cambio 1: Header
  adr = replaceOnce(
    adr,
    '- **Estado:** Proposed',
    '- **Estado:** ✅ Accepted (implementado en v4.5.9, verificado el 2026-10-10)',
    'ADR-005 header'
  );

  // Cambio 2: Sección "## Estado"
  adr = replaceOnce(
    adr,
    `## Estado

**Proposed** — decisión propuesta, pendiente de implementación.
Requiere diseño de esquema de tabla + refactor del router.`,
    `## Estado

**✅ Accepted** — implementado en v4.5.9 (commit \`FIX-209\`).
Verificado contra el código real el 2026-10-10.

**Implementación en producción:**
- Tabla \`presence\` creada vía \`sql/040_presence_table.sql\`.
- Controller \`src/controllers/presence.controller.js\` con UPSERT + TTL de 5 min + cleanup.
- Router \`src/routes/presence.routes.js\` con 3 endpoints (\`/online\`, \`/offline\`, \`/active\`).
- Cron de cleanup cada 5 min en \`server.js\` (\`cleanupPresence()\`).
- Resolución tipada INTEGER→UUID incluida.`,
    'ADR-005 sección Estado'
  );

  // Cambio 3: Sección "## Pendiente de verificar"
  adr = replaceOnce(
    adr,
    `## Pendiente de verificar

- ¿El frontend actual llama a \`/online\` y \`/offline\` en qué momentos (login/logout, focus/blur)?
- ¿Hay otros consumidores del endpoint \`/active\` (dashboards, etc.)?
- ¿Cuántas réplicas corre Fly.io en producción actualmente?`,
    `## Pendiente de verificar

Nada pendiente — implementación verificada en código el 2026-10-10.`,
    'ADR-005 Pendiente de verificar'
  );

  writeFile(ADR_FILE, adr);
  console.log('   ✅ ADR-005 actualizado (3 cambios)');
  console.log('');

  // ── Archivo 2: README.md ───────────────────────────────────
  console.log('📄 [2/2] Modificando docs/adr/README.md');
  backup(README_FILE);
  let readme = readFile(README_FILE);

  // Cambio 1: Tabla de listado
  readme = replaceOnce(
    readme,
    '| ADR-005 | Migración de presence a Supabase | 2026-09-17 | 📝 Proposed |',
    '| ADR-005 | Migración de presence a Supabase | 2026-09-17 | ✅ Accepted |',
    'README tabla ADR-005'
  );

  // Cambio 2: Sección "Próximos ADRs Planificados" — eliminar la fila de ADR-005
  // Buscamos la sección completa y la vaciamos (o la dejamos con un placeholder).
  // Patrón: la tabla de "Próximos ADRs Planificados" contiene solo la fila de ADR-005.
  const nextAdrPattern = `## Próximos ADRs Planificados

| ID | Título | Prioridad |
|---|---|---|
| ADR-005 | Migración de presence a Supabase | Pendiente de aceptación (ver FIX-209 en Sprint 2) |`;

  const nextAdrReplacement = `## Próximos ADRs Planificados

| ID | Título | Prioridad |
|---|---|---|
| _(vacío — todos los ADRs planificados fueron aceptados)_ | | |`;

  readme = replaceOnce(
    readme,
    nextAdrPattern,
    nextAdrReplacement,
    'README Próximos ADRs'
  );

  writeFile(README_FILE, readme);
  console.log('   ✅ README.md actualizado (2 cambios)');
  console.log('');

  // ── Verificación final ─────────────────────────────────────
  console.log('🔍 Verificando cambios...');
  const adrCheck = readFile(ADR_FILE);
  const readmeCheck = readFile(README_FILE);

  const checks = [
    ['ADR-005 header Accepted', adrCheck.includes('✅ Accepted (implementado en v4.5.9')],
    ['ADR-005 ya no dice Proposed en header', !adrCheck.split('\n').slice(0, 20).join('\n').includes('**Estado:** Proposed')],
    ['ADR-005 Pendiente: Nada pendiente', adrCheck.includes('Nada pendiente — implementación verificada')],
    ['README ADR-005 Accepted', readmeCheck.includes('| ADR-005 | Migración de presence a Supabase | 2026-09-17 | ✅ Accepted |')],
    ['README Próximos vacío', readmeCheck.includes('_(vacío — todos los ADRs planificados fueron aceptados)_')],
  ];

  let allOk = true;
  for (const [label, ok] of checks) {
    console.log(`   ${ok ? '✅' : '❌'} ${label}`);
    if (!ok) allOk = false;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (allOk) {
    console.log('  ✅ F4.0a COMPLETADO — 5 cambios aplicados y verificados');
    console.log('');
    console.log('  Próximos pasos:');
    console.log('    1. git diff docs/adr/');
    console.log('    2. git add docs/adr/');
    console.log('    3. git commit -m "docs(f4.0a): ADR-005 Proposed → Accepted"');
    console.log('    4. git push origin main');
    console.log('');
    console.log('  Rollback si es necesario:');
    console.log('    ren docs\\adr\\ADR-005-presence-en-supabase.md.bak-f4.0a docs\\adr\\ADR-005-presence-en-supabase.md');
    console.log('    ren docs\\adr\\README.md.bak-f4.0a docs\\adr\\README.md');
  } else {
    console.log('  ⚠️ F4.0a CON ERRORES — revisar arriba');
  }
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (!allOk) {
    process.exit(1);
  }
}

// ── Ejecución ─────────────────────────────────────────────────

try {
  main();
} catch (err) {
  console.error('');
  console.error('❌ ERROR:', err.message);
  console.error('');
  console.error('   Si el script falló a mitad de camino, hay backups:');
  console.error('     docs\\adr\\ADR-005-presence-en-supabase.md.bak-f4.0a');
  console.error('     docs\\adr\\README.md.bak-f4.0a');
  console.error('');
  console.error('   Restaurá manualmente con:');
  console.error('     ren docs\\adr\\*.bak-f4.0a *.md');
  console.error('');
  process.exit(1);
}