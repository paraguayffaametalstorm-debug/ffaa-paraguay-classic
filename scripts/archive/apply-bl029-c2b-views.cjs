/**
 * BL-029 · Commit #2b — Migrar js/views.js a /api/events-v2/mine
 *
 * Cambios:
 *   1. loadDashboardData() línea ~743: /api/performances/history → apiEventsV2Mine({ limit: 10 })
 *   2. loadHistorial() línea ~940: /api/performances/my-history → apiEventsV2Mine()
 *
 * NO se toca:
 *   - Línea 6712 (loadAllPerformances → FIX-310)
 *   - Línea 1115 (fetch /api/performances/pilots, endpoint activo)
 *
 * Uso:
 *   node scripts\apply-bl029-c2b-views.cjs
 *
 * Rollback:
 *   ren js\views.js.bak-bl029-2b js\views.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILE = path.join(ROOT, 'js', 'views.js');
const BACKUP = FILE + '.bak-bl029-2b';

if (!fs.existsSync(FILE)) {
  console.error('❌ No existe:', FILE);
  process.exit(1);
}

let src = fs.readFileSync(FILE, 'utf8');

// ─── Idempotencia ────────────────────────────────────────────
if (src.includes("apiEventsV2Mine({ limit: 10 })") || src.includes("apiEventsV2Mine()")) {
  console.log('[SKIP] views.js ya fue migrado (apiEventsV2Mine presente)');
  process.exit(0);
}

// ─── Verificación previa: buscar los strings legacy ──────────
const legacy1 = "fetch(`${API_BASE}/api/performances/history`, { headers: getAuthHeaders() }).catch(() => ({ ok: false }))";
const legacy2 = "fetch(`${API_BASE}/api/performances/my-history`, {";

const count1 = (src.split(legacy1).length - 1);
const count2 = (src.split(legacy2).length - 1);

console.log(`🔍 Ocurrencias legacy encontradas:`);
console.log(`   - /api/performances/history → ${count1}`);
console.log(`   - /api/performances/my-history → ${count2}`);

if (count1 !== 1) {
  console.error(`❌ Se esperaba 1 ocurrencia de /api/performances/history, se encontraron ${count1}`);
  process.exit(1);
}

if (count2 !== 2) {
  console.error(`❌ Se esperaba 2 ocurrencias de /api/performances/my-history, se encontraron ${count2}`);
  process.exit(1);
}

// ─── Backup ──────────────────────────────────────────────────
if (!fs.existsSync(BACKUP)) {
  fs.copyFileSync(FILE, BACKUP);
  console.log('💾 Backup:', path.basename(BACKUP));
}

// ═══════════════════════════════════════════════════════════════
// CAMBIO 1 — loadDashboardData() (línea ~743)
// ═══════════════════════════════════════════════════════════════

// Bloque completo a reemplazar (líneas 740-760 aprox)
const oldBlock1 = `    const [summaryRes, historyRes] = await Promise.all([
      fetch(\`\${API_BASE}/api/dashboard/summary\`, { headers: getAuthHeaders() }).catch(() => ({ ok: false })),
      fetch(\`\${API_BASE}/api/performances/history\`, { headers: getAuthHeaders() }).catch(() => ({ ok: false }))
    ]);

    let summaryData = null;
    let historyData = [];

    if (summaryRes.ok) {
      summaryData = await summaryRes.json();
    }
    if (historyRes.ok) {
      const hData = await historyRes.json();
      historyData = hData.history || hData.performances || [];
    }`;

const newBlock1 = `    const [summaryRes, historyRes] = await Promise.all([
      fetch(\`\${API_BASE}/api/dashboard/summary\`, { headers: getAuthHeaders() }).catch(() => ({ ok: false })),
      apiEventsV2Mine({ limit: 10 }).catch(() => ({ success: false, participations: [] }))
    ]);

    let summaryData = null;
    let historyData = [];

    if (summaryRes.ok) {
      summaryData = await summaryRes.json();
    }
    if (historyRes && historyRes.success) {
      historyData = historyRes.participations || [];
    }`;

if (!src.includes(oldBlock1)) {
  console.error('❌ No se encontró el bloque de loadDashboardData()');
  console.error('   Revisar línea ~740 de js/views.js');
  process.exit(1);
}

src = src.replace(oldBlock1, newBlock1);
console.log('✅ Cambio 1: loadDashboardData() migrado');

// ═══════════════════════════════════════════════════════════════
// CAMBIO 2 — loadHistorial() (línea ~940)
// ═══════════════════════════════════════════════════════════════

const oldBlock2 = `  fetch(\`\${API_BASE}/api/performances/my-history\`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    const history = Array.isArray(data) ? data : (data.history || data.performances || []);
    displayHistorial(history);
  })`;

const newBlock2 = `  apiEventsV2Mine()
  .then(res => {
    const history = (res && res.success) ? (res.participations || []) : [];
    displayHistorial(history);
  })`;

if (!src.includes(oldBlock2)) {
  console.error('❌ No se encontró el bloque de loadHistorial()');
  console.error('   Revisar línea ~940 de js/views.js');
  process.exit(1);
}

src = src.replace(oldBlock2, newBlock2);
console.log('✅ Cambio 2: loadHistorial() migrado');

// ═══════════════════════════════════════════════════════════════
// ESCRIBIR
// ═══════════════════════════════════════════════════════════════

fs.writeFileSync(FILE, src, 'utf8');

// ─── Verificación final ──────────────────────────────────────
console.log('\n🔍 Verificando cambios...');

const final = fs.readFileSync(FILE, 'utf8');
const checks = [
  [final.includes("apiEventsV2Mine({ limit: 10 })"), 'loadDashboardData usa apiEventsV2Mine({ limit: 10 })'],
  [final.includes("apiEventsV2Mine()\n  .then(res =>"), 'loadHistorial usa apiEventsV2Mine()'],
  [(final.match(/\/api\/performances\/history/g) || []).length === 0, 'Sin más referencias a /api/performances/history'],
  [(final.match(/\/api\/performances\/my-history/g) || []).length === 1, 'Solo queda 1 referencia a /api/performances/my-history (línea 6712)'],
  [final.includes('renderTrendChart') || final.includes('updateDashboardTacticalUI'), 'loadDashboardData sigue coherente'],
  [final.includes('displayHistorial'), 'loadHistorial sigue coherente'],
  [final.includes('/api/performances/pilots'), 'loadActiveMembers intacto'],
];

let allOk = true;
for (const [ok, label] of checks) {
  console.log(`   ${ok ? '✅' : '❌'} ${label}`);
  if (!ok) allOk = false;
}

console.log('\n═══════════════════════════════════════════════════════════════');
if (allOk) {
  console.log('  ✅ COMMIT 2b LISTO — 7 checks OK');
  console.log('');
  console.log('  Próximos pasos:');
  console.log('    1. node --check js\\views.js');
  console.log('    2. findstr /N /C:"apiEventsV2Mine" js\\views.js');
  console.log('    3. findstr /N /C:"/api/performances/my-history" js\\views.js');
  console.log('    4. findstr /N /C:"/api/performances/history" js\\views.js');
  console.log('');
  console.log('  Rollback:');
  console.log('    ren js\\views.js.bak-bl029-2b js\\views.js');
} else {
  console.log('  ❌ FALTAN CHECKS — revisar antes de continuar');
  console.log('  Rollback: ren js\\views.js.bak-bl029-2b js\\views.js');
}
console.log('═══════════════════════════════════════════════════════════════\n');