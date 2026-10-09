/**
 * FASE 6 — Fix: renderPilotsByStatus usa ID nuevo (adminPilotsByStatus)
 * Uso: node scripts/fase-f6-fix-adminpilots-id.cjs
 * Rollback: copy js\views.js.bak-f6-pilots js\views.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'js', 'views.js');

function main() {
  console.log('\n🔧 FIX: renderPilotsByStatus ID\n');

  if (!fs.existsSync(FILE)) {
    console.error('❌ No existe js/views.js');
    process.exit(1);
  }

  let content = fs.readFileSync(FILE, 'utf8');
  const bytesOriginal = Buffer.byteLength(content, 'utf8');

  const OLD = "function renderPilotsByStatus(members) {\n  const container = document.getElementById('pilotsByStatus');";
  const NEW = "function renderPilotsByStatus(members) {\n  // F6-FIX: buscar el ID nuevo (admin-summary.html) con fallback al viejo\n  const container = document.getElementById('adminPilotsByStatus') || document.getElementById('pilotsByStatus');";

  if (!content.includes(OLD)) {
    if (content.includes(NEW)) {
      console.log('⚠️  El fix ya estaba aplicado');
      process.exit(0);
    }
    console.error('❌ No se encontró la línea original');
    process.exit(1);
  }

  // Backup
  const backup = FILE + '.bak-f6-pilots';
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(FILE, backup);
    console.log(`✅ Backup: ${path.basename(backup)}`);
  }

  content = content.replace(OLD, NEW);
  fs.writeFileSync(FILE, content, 'utf8');

  const bytesNuevo = Buffer.byteLength(content, 'utf8');
  console.log(`📝 Bytes: ${bytesOriginal} → ${bytesNuevo} (+${bytesNuevo - bytesOriginal})`);

  // node --check
  try {
    execSync(`node --check "${FILE}"`, { stdio: 'pipe' });
    console.log('✅ node --check OK');
  } catch (e) {
    console.error('❌ node --check falló');
    console.error(e.stderr ? e.stderr.toString() : e.message);
    console.error('Rollback: copy js\\views.js.bak-f6-pilots js\\views.js');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  ✅ Fix aplicado');
  console.log('═══════════════════════════════════════════════');
  console.log('  Próximo paso:');
  console.log('     git add js/views.js');
  console.log('     git commit -m "fix(admin): renderPilotsByStatus usa ID adminPilotsByStatus"');
  console.log('     git push origin main');
  console.log('═══════════════════════════════════════════════\n');
}

main();