/**
 * ═══════════════════════════════════════════════════════════════
 *  FASE 6 — Fix: IDs del panel admin (Resumen)
 *  ─────────────────────────────────────────────────────────────
 *  Actualiza renderAdminStats() para usar los IDs nuevos que
 *  provee components/admin-sections/admin-summary.html:
 *
 *    OLD: #totalMembers      → NEW: #adminTotalMembers
 *    OLD: #adminAvgTokens    → NEW: #adminAvgTokens (igual)
 *    OLD: #atRiskMembers     → NEW: #adminAtRiskMembers
 *    OLD: #lastUpdate        → NEW: #adminLastUpdate
 *
 *  También actualiza loadAdminPanel() para invocar los renders
 *  DESPUÉS de que la sección resumen se haya cargado.
 *
 *  Uso:      node scripts/fase-f6-fix-admin-ids.cjs
 *  Rollback: copy js\views.js.bak-f6-ids js\views.js
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FILE_VIEWS_JS = path.join(ROOT, 'js', 'views.js');

function log(msg)   { console.log(msg); }
function ok(msg)    { console.log(`   ✅ ${msg}`); }
function warn(msg)  { console.log(`   ⚠️  ${msg}`); }
function err(msg)   { console.error(`   ❌ ${msg}`); }
function title(msg) { console.log(`\n🔷 ${msg}`); }

function crearBackup(filepath, suffix) {
  const backup = filepath + suffix;
  if (fs.existsSync(backup)) {
    warn(`Backup ya existía: ${path.basename(backup)}`);
    return;
  }
  fs.copyFileSync(filepath, backup);
  ok(`Backup: ${path.basename(backup)}`);
}

function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🚀 FASE 6 — Fix de IDs del panel admin (Resumen)');
  console.log('═══════════════════════════════════════════════════════');

  if (!fs.existsSync(FILE_VIEWS_JS)) {
    err('No existe: js/views.js');
    process.exit(1);
  }

  let content = fs.readFileSync(FILE_VIEWS_JS, 'utf8');
  const bytesOriginales = Buffer.byteLength(content, 'utf8');

  // ═══════════════════════════════════════════════════════════════
  //  FIX 1: renderAdminStats — IDs viejos → nuevos
  // ═══════════════════════════════════════════════════════════════

  title('FIX 1 — renderAdminStats(): actualizar IDs');

  // Buscar el bloque original de renderAdminStats
  const oldRenderStats = `function renderAdminStats(members) {
  const totalEl = document.getElementById('totalMembers');
  const avgEl = document.getElementById('adminAvgTokens');
  const riskEl = document.getElementById('atRiskMembers');

  const activeCount = members.filter(m => (m.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
  if (totalEl) totalEl.textContent = \`\${activeCount} / \${members.length}\`;
  
  if (members.length > 0) {
    const sum = members.reduce((s, m) => s + (Number(m.avg_tokens) || 0), 0);
    const avg = (sum / members.length).toFixed(1);
    const atRisk = members.filter(m => {
      const st = (m.perf_status || '').toUpperCase();
      return st === 'ROJO' || st === 'NEGRO';
    }).length;

    if (avgEl) avgEl.textContent = \`\${avg} tokens\`;
    if (riskEl) riskEl.textContent = atRisk;
  } else {
    if (avgEl) avgEl.textContent = \`0 tokens\`;
    if (riskEl) riskEl.textContent = '0';
  }
}`;

  const newRenderStats = `function renderAdminStats(members) {
  // F6-FIX: IDs actualizados para admin-summary.html (v4.7.0)
  const totalEl = document.getElementById('adminTotalMembers');
  const avgEl = document.getElementById('adminAvgTokens');
  const riskEl = document.getElementById('adminAtRiskMembers');
  const lastUpdateEl = document.getElementById('adminLastUpdate');

  const activeCount = members.filter(m => (m.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
  if (totalEl) totalEl.textContent = \`\${activeCount} / \${members.length}\`;

  // Actualizar subtítulo "X inactivos en reserva"
  const detailEl = document.getElementById('adminActiveDetail');
  if (detailEl) {
    const inactiveCount = members.length - activeCount;
    detailEl.textContent = inactiveCount > 0
      ? \`\${inactiveCount} inactivo\${inactiveCount !== 1 ? 's' : ''} en reserva\`
      : 'Todos en servicio activo';
  }

  if (members.length > 0) {
    const sum = members.reduce((s, m) => s + (Number(m.avg_tokens) || 0), 0);
    const avg = (sum / members.length).toFixed(1);
    const atRisk = members.filter(m => {
      const st = (m.perf_status || '').toUpperCase();
      return st === 'ROJO' || st === 'NEGRO';
    }).length;

    if (avgEl) avgEl.textContent = \`\${avg} tokens\`;
    if (riskEl) riskEl.textContent = atRisk;
  } else {
    if (avgEl) avgEl.textContent = '0 tokens';
    if (riskEl) riskEl.textContent = '0';
  }

  // Actualizar última sincronización
  if (lastUpdateEl) {
    lastUpdateEl.textContent = new Date().toLocaleTimeString('es-PY', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
}`;

  if (!content.includes(oldRenderStats)) {
    err('No se encontró la función renderAdminStats() original.');
    err('Puede haber cambiado. Abortando sin modificar.');
    process.exit(1);
  }

  content = content.replace(oldRenderStats, newRenderStats);
  ok('renderAdminStats() actualizado con IDs nuevos');

  // ═══════════════════════════════════════════════════════════════
  //  FIX 2: loadAdminPanel — actualizar lastUpdate con ID nuevo
  // ═══════════════════════════════════════════════════════════════

  title('FIX 2 — loadAdminPanel(): actualizar ID de lastUpdate');

  const oldLastUpdate = `    const updateEl = document.getElementById('lastUpdate');
    if (updateEl) updateEl.textContent = new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });`;

  const newLastUpdate = `    // F6-FIX: actualizar #adminLastUpdate (ID nuevo en admin-summary.html)
    const updateEl = document.getElementById('adminLastUpdate');
    if (updateEl) updateEl.textContent = new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });`;

  if (!content.includes(oldLastUpdate)) {
    warn('No se encontró la línea de lastUpdate en loadAdminPanel().');
    warn('Puede que ya esté actualizada. Continuando...');
  } else {
    content = content.replace(oldLastUpdate, newLastUpdate);
    ok('loadAdminPanel() actualizado con ID nuevo de lastUpdate');
  }

  // ═══════════════════════════════════════════════════════════════
  //  ESCRITURA
  // ═══════════════════════════════════════════════════════════════

  title('ESCRITURA');

  crearBackup(FILE_VIEWS_JS, '.bak-f6-ids');

  const bytesNuevos = Buffer.byteLength(content, 'utf8');
  log(`   Bytes originales: ${bytesOriginales}`);
  log(`   Bytes nuevos:     ${bytesNuevos}`);
  log(`   Diferencia:       +${bytesNuevos - bytesOriginales}`);

  fs.writeFileSync(FILE_VIEWS_JS, content, 'utf8');
  ok('Escrito: js/views.js');

  // Verificar sintaxis
  try {
    execSync(`node --check "${FILE_VIEWS_JS}"`, { stdio: 'pipe' });
    ok('node --check js/views.js → sintaxis OK');
  } catch (e) {
    err('node --check falló en js/views.js');
    err(e.stderr ? e.stderr.toString() : e.message);
    err('Rollback: copy js\\views.js.bak-f6-ids js\\views.js');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ Fix aplicado correctamente');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  renderAdminStats() → IDs adminTotalMembers, adminAtRiskMembers, adminLastUpdate');
  console.log('  loadAdminPanel()   → ID adminLastUpdate');
  console.log('');
  console.log('  Próximo paso:');
  console.log('     1. node --check js\\views.js (verificación final)');
  console.log('     2. git add js/views.js');
  console.log('     3. git commit -m "fix(admin): IDs de KPIs en sección Resumen"');
  console.log('     4. git push origin main');
  console.log('');
  console.log('  🔙 Rollback:');
  console.log('     copy js\\views.js.bak-f6-ids js\\views.js');
  console.log('═══════════════════════════════════════════════════════\n');
}

main();