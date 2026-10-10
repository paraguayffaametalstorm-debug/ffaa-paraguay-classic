/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * F4.0-final-docs-v3 — Fix del cambio faltante
 * ============================================================================
 * El script v1 dijo "✅ Tabla Legacy BM marcada" pero NO guardó el archivo
 * (porque el cambio 2 lanzó error ANTES del writeFile).
 *
 * Este script aplica SOLO el cambio de la tabla Legacy BM.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'DEPLOYMENT_STATE.md');

function readFile(p) {
  if (!fs.existsSync(p)) throw new Error(`No existe: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

function writeFile(p, content) {
  fs.writeFileSync(p, content, 'utf8');
}

function backup(p) {
  const bak = p + '.bak-f4.0-final-v3';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(p, bak);
    console.log(`   💾 Backup creado: ${path.basename(bak)}`);
  }
}

function replaceOnce(content, search, replacement, label) {
  const count = content.split(search).length - 1;
  if (count === 0) {
    throw new Error(`[${label}] No se encontró:\n${search.substring(0, 250)}...`);
  }
  if (count > 1) {
    throw new Error(`[${label}] Aparece ${count} veces (debe ser único):\n${search.substring(0, 250)}...`);
  }
  return content.replace(search, replacement);
}

function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  F4.0-final-docs-v3 — Fix tabla Legacy BM');
  console.log('═══════════════════════════════════════════════════════════════');

  console.log('');
  console.log('📄 Modificando DEPLOYMENT_STATE.md');
  backup(FILE);
  let content = readFile(FILE);

  // Verificar idempotencia
  if (content.includes('✅ DROP ejecutado el 2026-10-10')) {
    console.log('   ℹ️  Cambio ya aplicado. Saltando.');
  } else {
    const search = `| \`bm_events\` | Black Market legacy | 0 | 🗑️ DROP pendiente |
| \`bm_missions\` | Black Market legacy | 0 | 🗑️ DROP pendiente |
| \`bm_progress\` | Black Market legacy | 0 | 🗑️ DROP pendiente |
| \`bm_discounts\` | Black Market legacy | 0 | 🗑️ DROP pendiente |`;

    const replacement = `| \`bm_events\` | Black Market legacy | 0 | ✅ DROP ejecutado el 2026-10-10 |
| \`bm_missions\` | Black Market legacy | 0 | ✅ DROP ejecutado el 2026-10-10 |
| \`bm_progress\` | Black Market legacy | 0 | ✅ DROP ejecutado el 2026-10-10 |
| \`bm_discounts\` | Black Market legacy | 0 | ✅ DROP ejecutado el 2026-10-10 |`;

    content = replaceOnce(content, search, replacement, 'tabla BM');
    console.log('   ✅ Tabla "Legacy BM" marcada como DROP ejecutado');

    // ⚠️ IMPORTANTE: writeFile AHORA, antes de cualquier otra operación
    writeFile(FILE, content);
    console.log('   ✅ Archivo guardado');
  }

  console.log('');
  console.log('🔍 Verificando...');
  const check = readFile(FILE);

  const ok1 = check.includes('✅ DROP ejecutado el 2026-10-10');
  const ok2 = check.includes('**44** | ✅ **Actualizado (Sprint 4)**');
  const ok3 = check.includes('**`presence`** | **Presencia (Nuevo v4.5.9)**');

  console.log(`   ${ok1 ? '✅' : '❌'} Tabla BM: DROP ejecutado`);
  console.log(`   ${ok2 ? '✅' : '❌'} Resumen: events_master 44 filas`);
  console.log(`   ${ok3 ? '✅' : '❌'} Resumen: presence agregada`);

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  if (ok1 && ok2 && ok3) {
    console.log('  ✅ DEPLOYMENT_STATE.md COMPLETO');
    console.log('');
    console.log('  Próximos pasos:');
    console.log('    1. git diff DEPLOYMENT_STATE.md');
    console.log('    2. git diff CHANGELOG.md');
    console.log('    3. git diff docs/SESSION_HANDOFF.md');
    console.log('    4. git add CHANGELOG.md DEPLOYMENT_STATE.md docs/SESSION_HANDOFF.md scripts/');
    console.log('    5. git commit -m "docs(sprint-4): cerrar F4.0 (a/b/c) + F4.5 (DROP BM legacy)"');
    console.log('    6. git push origin main');
  } else {
    console.log('  ⚠️ Aún hay checks fallando');
  }
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (!ok1 || !ok2 || !ok3) process.exit(1);
}

try {
  main();
} catch (err) {
  console.error('');
  console.error('❌ ERROR:', err.message);
  console.error('');
  console.error('   Backup: DEPLOYMENT_STATE.md.bak-f4.0-final-v3');
  console.error('');
  process.exit(1);
}