/* ============================================================================
 * SPRINT 0 — GRUPO E — LIMPIEZA DE RESIDUOS
 * ----------------------------------------------------------------------------
 * Pendiente 1: eliminar L55 residual de CURRENT_STATE.md
 * Pendiente 2: eliminar filas FIX-006/021/022 duplicadas de PLAN_TRABAJO.md
 *
 * NO commitea. Backup automático.
 * ==========================================================================*/

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
  console.error('❌ No estás en la raíz del repo.');
  process.exit(1);
}

const TS = new Date().toISOString().replace(/[:.]/g, '-');
let okCount = 0;

function readFileSafe(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { console.error(`❌ No existe: ${rel}`); return null; }
  return fs.readFileSync(abs, 'utf8');
}

function writeFileSafe(rel, content) {
  const abs = path.join(ROOT, rel);
  const bak = `${abs}.bak-${TS}`;
  fs.copyFileSync(abs, bak);
  fs.writeFileSync(abs, content, 'utf8');
  console.log(`  ⚠️  Backup: ${rel} → ${path.basename(bak)}`);
}

// ---------------------------------------------------------------------------
// PENDIENTE 1: CURRENT_STATE.md — eliminar L55 residual
// ---------------------------------------------------------------------------
console.log('\n📝 [Pendiente 1] CURRENT_STATE.md — eliminar L55 residual');

{
  const rel = 'CURRENT_STATE.md';
  let c = readFileSafe(rel);
  if (c) {
    // Match: línea "Duración SQ: **+4 días** (jueves a lunes)." con posibles tildes dobles.
    // Anclamos en "Duraci" + "*+4 d" + "as** (jueves a lunes)"
    const re = /^- Duraci[^\n]*SQ: \*\*\+4 d[^\n]*as\*\* \(jueves a lunes\)\.\s*\n/m;
    if (re.test(c)) {
      c = c.replace(re, '');
      writeFileSafe(rel, c);
      console.log('  ✅ L55 residual eliminada');
      okCount++;
    } else {
      console.log('  ⚠️  L55 residual no encontrada (¿ya eliminada manualmente?)');
    }
  }
}

// ---------------------------------------------------------------------------
// PENDIENTE 2: PLAN_TRABAJO.md — eliminar filas duplicadas de Sprint 0
// ---------------------------------------------------------------------------
console.log('\n📝 [Pendiente 2] PLAN_TRABAJO.md — filas duplicadas de Sprint 0');

{
  const rel = 'PLAN_TRABAJO.md';
  let c = readFileSafe(rel);
  if (c) {
    // Las 3 filas tienen este formato exacto en la tabla del Sprint 0:
    // | **FIX-006** | ALTA | `CURRENT_STATE.md` + ... |
    // | **FIX-021** | MEDIA | Todos | Decidir timezone ... |
    // | **FIX-022** | MEDIA | Todos | Decidir duración ... |
    //
    // NO queremos tocar las filas de Completados (que empiezan con
    // "| **FIX-006** | Timezone en docs: ..."). Anclamos en el contenido
    // único de la fila del Sprint 0.

    const reF006 = /^\| \*\*FIX-006\*\* \| ALTA \| `CURRENT_STATE\.md`[^\n]*\n/m;
    const reF021 = /^\| \*\*FIX-021\*\* \| MEDIA \| Todos \| Decidir timezone[^\n]*\n/m;
    const reF022 = /^\| \*\*FIX-022\*\* \| MEDIA \| Todos \| Decidir duraci[^\n]*\n/m;

    let eliminadas = 0;
    if (reF006.test(c)) { c = c.replace(reF006, ''); eliminadas++; }
    if (reF021.test(c)) { c = c.replace(reF021, ''); eliminadas++; }
    if (reF022.test(c)) { c = c.replace(reF022, ''); eliminadas++; }

    if (eliminadas > 0) {
      writeFileSafe(rel, c);
      console.log(`  ✅ Filas eliminadas: ${eliminadas}/3`);
      okCount++;
    } else {
      console.log('  ⚠️  Ninguna fila duplicada encontrada (¿ya eliminadas?)');
    }
  }
}

// ---------------------------------------------------------------------------
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`RESUMEN: ${okCount}/2 operaciones aplicadas`);
console.log('════════════════════════════════════════════════════════════════');
console.log('\n📋 Verificación rápida:');
console.log('   findstr /n "Duraci" CURRENT_STATE.md');
console.log('   findstr /n "FIX-006 FIX-021 FIX-022" PLAN_TRABAJO.md');
console.log('');
console.log('📋 Commit final:');
console.log('   git add CURRENT_STATE.md ARCHITECTURE.md CHANGELOG.md PLAN_TRABAJO.md docs/adr/ADR-007-rediseno-eventos-v2.md');
console.log('   git commit -m "docs(sprint-0-grupoE): timezone UTC-3 fijo + duracion SQ evento 4d / ventana 7d (FIX-006/021/022)"');
console.log('   git push origin main');
console.log('');