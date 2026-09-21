/**
 * FIX v4.3.2 — Cuota 30 activos + Widget squadStats (robusto)
 * Uso: node scripts\fix-v4-3-2.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TS = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

const F = {
  admin: path.join(ROOT, 'src', 'controllers', 'admin.controller.js'),
  dash:  path.join(ROOT, 'src', 'controllers', 'dashboard.controller.js'),
};

const log = (m, c = '\x1b[0m') => console.log(`${c}${m}\x1b[0m`);
const read  = (p) => fs.readFileSync(p, 'utf8');
const write = (p, c) => fs.writeFileSync(p, c, 'utf8');

// Normaliza saltos de línea a \n para comparar
const norm = (s) => s.replace(/\r\n/g, '\n');

log('\n══════════════════════════════════════════════', '\x1b[35m');
log('  FIX v4.3.2 (robusto)', '\x1b[35m');
log('══════════════════════════════════════════════\n', '\x1b[35m');

fs.copyFileSync(F.admin, `${F.admin}.bak-v432-${TS}`);
fs.copyFileSync(F.dash,  `${F.dash}.bak-v432-${TS}`);
log('▸ Backups creados ✅', '\x1b[32m');

// ═══════════════════════════════════════════════
// ADMIN.CONTROLLER.JS
// ═══════════════════════════════════════════════
let admin = read(F.admin);
let adminNorm = norm(admin);
let adminChanges = 0;

// --- Cambio 1: Constante MAX_ACTIVE_MEMBERS ---
if (adminNorm.includes('MAX_ACTIVE_MEMBERS')) {
  log('▸ [admin] MAX_ACTIVE_MEMBERS ya existe', '\x1b[33m');
} else {
  // Buscar el cierre de ROLE_LIMITS con regex
  const rx1 = /(const ROLE_LIMITS\s*=\s*\{[^}]*\};)/;
  const m1 = adminNorm.match(rx1);
  if (!m1) {
    log('❌ [admin] No encontré ROLE_LIMITS', '\x1b[31m');
    process.exit(1);
  }
  adminNorm = adminNorm.replace(
    rx1,
    m1[1] + `

// ========== DOTACIÓN MÁXIMA ACTIVA ==========
const MAX_ACTIVE_MEMBERS = 30;`
  );
  adminChanges++;
  log('▸ [admin] ✅ MAX_ACTIVE_MEMBERS agregado', '\x1b[32m');
}

// --- Cambio 2: Validación en addMember ---
if (adminNorm.includes('Validar cuota de pilotos ACTIVOS (máx 30)')) {
  log('▸ [admin] Validación addMember ya existe', '\x1b[33m');
} else {
  // Ancla: "const data = AddMemberSchema.parse(req.body);" hasta el primer "const { data: existing } = await supabase"
  const rx2 = /(const data = AddMemberSchema\.parse\(req\.body\);[\s\S]*?return res\.status\(500\)\.json\(\{ error: 'Database client unavailable' \}\);\s*\})(\s*\n\s*)(const \{ data: existing \} = await supabase)/;
  if (!rx2.test(adminNorm)) {
    log('❌ [admin] No encontré anchor addMember', '\x1b[31m');
    process.exit(1);
  }
  adminNorm = adminNorm.replace(rx2, (match, p1, p2, p3) => {
    return p1 + `

    // NUEVO v4.3.2: Validar cuota de pilotos ACTIVOS (máx 30)
    const { count: activeCount, error: countErr } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    if (!countErr && (activeCount || 0) >= MAX_ACTIVE_MEMBERS) {
      return res.status(400).json({
        error: '⚠️ Dotación activa completa (' + activeCount + '/' + MAX_ACTIVE_MEMBERS + '). Para incorporar un nuevo piloto activo, primero debés inactivar a otro.',
        code: 'MAX_ACTIVE_MEMBERS_REACHED',
        details: { active: activeCount, max: MAX_ACTIVE_MEMBERS }
      });
    }` + p2 + p3;
  });
  adminChanges++;
  log('▸ [admin] ✅ Validación en addMember agregada', '\x1b[32m');
}

// --- Cambio 3: perf_status en addMember ---
if (adminNorm.includes("token_version: 1,\n      phone: '',\n      bio: '',\n      perf_status: 'VERDE',")) {
  adminNorm = adminNorm.replace(
    "token_version: 1,\n      phone: '',\n      bio: '',\n      perf_status: 'VERDE',",
    "token_version: 1,\n      phone: '',\n      bio: '',\n      perf_status: 'PENDIENTE',"
  );
  adminChanges++;
  log('▸ [admin] ✅ perf_status addMember: VERDE → PENDIENTE', '\x1b[32m');
} else {
  log('▸ [admin] perf_status addMember ya está OK o no match', '\x1b[33m');
}

// --- Cambio 4: Validación en bulkUploadEvent ---
if (adminNorm.includes('NUEVO v4.3.2: Validar cuota de pilotos ACTIVOS antes del loop')) {
  log('▸ [admin] Validación bulk ya existe', '\x1b[33m');
} else {
  const rx4 = /(const \{ event_id, performances: bulkList \} = BulkUploadSchema\.parse\(req\.body\);[\s\S]*?return res\.status\(500\)\.json\(\{ error: 'Database client unavailable' \}\);\s*\})(\s*\n\s*)(let processed = 0;)/;
  if (!rx4.test(adminNorm)) {
    log('❌ [admin] No encontré anchor bulkUploadEvent', '\x1b[31m');
    process.exit(1);
  }
  adminNorm = adminNorm.replace(rx4, (match, p1, p2, p3) => {
    return p1 + `

    // NUEVO v4.3.2: Validar cuota de pilotos ACTIVOS antes del loop
    const bulkNicks = bulkList.map(i => i.nick.trim());
    const { data: existingUsers } = await supabase
      .from('users')
      .select('nick')
      .in('nick', bulkNicks);

    const nicksExistentes = new Set(
      (existingUsers || []).map(u => (u.nick || '').toLowerCase())
    );
    const nuevosPilotos = bulkNicks.filter(
      n => !nicksExistentes.has(n.toLowerCase())
    ).length;

    const { count: activeCount, error: countErr } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    if (!countErr) {
      const proyectado = (activeCount || 0) + nuevosPilotos;
      if (proyectado > MAX_ACTIVE_MEMBERS) {
        return res.status(400).json({
          error: '⚠️ La carga masiva excedería la dotación activa máxima (' + MAX_ACTIVE_MEMBERS + '). Activos: ' + activeCount + '. Nuevos: ' + nuevosPilotos + '. Excedente: ' + (proyectado - MAX_ACTIVE_MEMBERS) + '.',
          code: 'MAX_ACTIVE_MEMBERS_REACHED',
          details: {
            active_current: activeCount,
            new_pilots: nuevosPilotos,
            max: MAX_ACTIVE_MEMBERS,
            overflow: proyectado - MAX_ACTIVE_MEMBERS
          }
        });
      }
    }` + p2 + p3;
  });
  adminChanges++;
  log('▸ [admin] ✅ Validación en bulkUploadEvent agregada', '\x1b[32m');
}

// --- Cambio 5: perf_status en bulkUploadEvent ---
if (adminNorm.includes("must_change_password: true,\n            perf_status: 'VERDE',")) {
  adminNorm = adminNorm.replace(
    "must_change_password: true,\n            perf_status: 'VERDE',",
    "must_change_password: true,\n            perf_status: 'PENDIENTE',"
  );
  adminChanges++;
  log('▸ [admin] ✅ perf_status bulk: VERDE → PENDIENTE', '\x1b[32m');
} else {
  log('▸ [admin] perf_status bulk ya está OK o no match', '\x1b[33m');
}

if (adminChanges > 0) write(F.admin, adminNorm);

// ═══════════════════════════════════════════════
// DASHBOARD.CONTROLLER.JS
// ═══════════════════════════════════════════════
let dash = read(F.dash);
let dashNorm = norm(dash);
let dashChanges = 0;

if (dashNorm.includes('pilots_without_load')) {
  log('▸ [dash] Fix ya aplicado', '\x1b[33m');
} else {
  const rx5 = /(const totalMembersCount = usersWithAvg\.length;[\s\S]*?topPilots\s*\n\s*\}\);)/;
  const m5 = dashNorm.match(rx5);
  if (!m5) {
    log('❌ [dash] No encontré bloque final', '\x1b[31m');
    process.exit(1);
  }

  const replaceD = `    // ============================================================
    // FIX v4.3.2: Cálculo correcto de squadStats
    // ============================================================
    const MAX_ACTIVE_MEMBERS = 30;
    const META_TOKENS_SQ = 175;

    const activeMembersCount = usersWithAvg.length;
    const totalMembersCount = activeMembersCount;

    const avgSquad = activeMembersCount > 0
      ? Math.round(
          usersWithAvg.reduce((acc, u) => acc + (u.avg_tokens || 0), 0) /
          activeMembersCount
        )
      : 0;

    const pilotsWithLoad = usersWithAvg.filter(u => (u.avg_tokens || 0) > 0).length;
    const pilotsWithoutLoad = activeMembersCount - pilotsWithLoad;
    const eventType = activeEvent?.type || null;

    res.json({
      success: true,
      currentEvent: activeEvent,
      eventType,
      userStats: {
        avg_tokens: userTokensAvg,
        weeks_evaluated: userWeeks || 1,
        trend: user.trend || 'stable',
        perf_status: currentProfile?.perf_status || user.perf_status || 'VERDE'
      },
      squadStats: {
        total_members: totalMembersCount,
        active_members: activeMembersCount,
        max_active_members: MAX_ACTIVE_MEMBERS,
        avg_tokens: avgSquad,
        meta_tokens_sq: META_TOKENS_SQ,
        at_risk_count: usersWithAvg.filter(u =>
          u.perf_status === 'ROJO' || u.perf_status === 'NEGRO'
        ).length,
        pilots_without_load: pilotsWithoutLoad
      },
      topPilots
    });`;

  dashNorm = dashNorm.replace(rx5, replaceD);
  dashChanges++;
  log('▸ [dash] ✅ Bloque final reemplazado', '\x1b[32m');
  write(F.dash, dashNorm);
}

log('\n══════════════════════════════════════════════', '\x1b[35m');
log('  RESUMEN: admin=' + adminChanges + ' | dash=' + dashChanges, '\x1b[35m');
log('══════════════════════════════════════════════\n', '\x1b[35m');