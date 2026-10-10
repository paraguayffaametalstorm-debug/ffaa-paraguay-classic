/**
 * PARAGUAY-FFAA | METALSTORM - Módulo Sección Veteranos (ADR-010)
 *
 * Vista del panel del Veterano + gestión de pupilos, contactos y evaluaciones.
 *
 * Roles:
 *   - VETERANO: ve solo sus pupilos. Puede registrar contactos y evaluar.
 *   - OWNER: ve TODOS los pupilos agrupados por Veterano. Puede asignar mentor.
 *   - ADMIN: no accede a este panel (solo desde /api/admin/mentorships).
 *
 * No hace fetch directo — todo pasa por apiVeteran* / apiAdmin* de js/api.js
 */

// ============================================================
// ESTADO GLOBAL DEL MÓDULO
// ============================================================
const veteranState = {
  currentMentorshipId: null,
  currentMenteeNick: null,
  isOwner: false,
  pupilosFlat: [],
  pupilosGrouped: [],
  mentors: [],
  mentees: []
};

// ============================================================
// ENTRYPOINT — llamado por loadViewData('veteranPanelView')
// ============================================================
async function loadVeteranPanel() {
  const user = window.currentUser;
  if (!user) {
    console.warn('[Veteran] No hay usuario autenticado');
    return;
  }

  const role = (user.role || 'MIEMBRO').toUpperCase();
  veteranState.isOwner = role === 'OWNER';

  // Ajustar subtítulo según rol
  const subtitle = document.getElementById('veteranPanelSubtitle');
  if (subtitle) {
    subtitle.textContent = veteranState.isOwner
      ? 'Supervisión global de mentorías · Vista OWNER'
      : 'Gestión de pupilos, contactos y evaluaciones consultivas';
  }

  // Mostrar/ocultar selector OWNER
  const ownerSelector = document.getElementById('veteranOwnerSelector');
  if (ownerSelector) {
    ownerSelector.style.display = veteranState.isOwner ? 'block' : 'none';
  }

  // Mostrar/ocultar botón "Asignar Mentor"
  const newBtn = document.getElementById('veteranNewMentorshipBtn');
  if (newBtn) {
    newBtn.style.display = veteranState.isOwner ? 'inline-flex' : 'none';
  }

  // Cargar datos en paralelo
  await Promise.all([
    loadVeteranStats(),
    loadVeteranPupilos(),
    loadVeteranHistory()
  ]);

  // Si es OWNER, cargar lista de Veteranos para el selector
  if (veteranState.isOwner) {
    await loadVeteranList();
  }

  if (typeof refreshLucideIcons === 'function') {
    setTimeout(refreshLucideIcons, 50);
  }
}
window.loadVeteranPanel = loadVeteranPanel;

// ============================================================
// 1. STATS — 3 o 4 tarjetas según rol
// ============================================================
async function loadVeteranStats() {
  const grid = document.getElementById('veteranStatsGrid');
  if (!grid) return;

  const params = {};
  if (veteranState.isOwner && veteranState.currentMentorId) {
    params.mentor_id = veteranState.currentMentorId;
  }

  const res = await apiVeteranMyStats(params);
  if (!res.success) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#f87171;padding:1rem;">
      ⚠️ ${escapeHTML(res.error || 'Error cargando stats')}
    </div>`;
    return;
  }

  const s = res.stats || {};

  if (res.global_view) {
    // Vista global (OWNER sin filtro)
    grid.innerHTML = `
      <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #d4af37;">
        <div class="stat-card-header"><span class="stat-label">VETERANOS ACTIVOS</span><span>🎖️</span></div>
        <div class="stat-main"><span class="stat-number-gold">${s.active_veteranos || 0}</span></div>
        <div class="stat-footer">Supervisados</div>
      </div>
      <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #38bdf8;">
        <div class="stat-card-header"><span class="stat-label">PUPILOS ACTIVOS</span><span>👥</span></div>
        <div class="stat-main"><span class="stat-number-blue">${s.active_pupilos || 0}</span></div>
        <div class="stat-footer">En mentoría</div>
      </div>
      <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #2ecc71;">
        <div class="stat-card-header"><span class="stat-label">CONTACTOS MES</span><span>📝</span></div>
        <div class="stat-main"><span class="stat-number-green">${s.logs_this_month || 0}</span></div>
        <div class="stat-footer">Registrados</div>
      </div>
      <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #f59e0b;">
        <div class="stat-card-header"><span class="stat-label">EVALUACIONES MES</span><span>🎯</span></div>
        <div class="stat-main"><span class="stat-number-red">${s.evaluations_this_month || 0}</span></div>
        <div class="stat-footer">Consultivas</div>
      </div>
    `;
  } else {
    // Vista personal (VETERANO o OWNER filtrado)
    grid.innerHTML = `
      <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #38bdf8;">
        <div class="stat-card-header"><span class="stat-label">PUPILOS ACTIVOS</span><span>👥</span></div>
        <div class="stat-main"><span class="stat-number-blue">${s.active_pupilos || 0}</span></div>
        <div class="stat-footer">Bajo mentoría</div>
      </div>
      <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #2ecc71;">
        <div class="stat-card-header"><span class="stat-label">CONTACTOS MES</span><span>📝</span></div>
        <div class="stat-main"><span class="stat-number-green">${s.logs_this_month || 0}</span></div>
        <div class="stat-footer">Registrados</div>
      </div>
      <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #f59e0b;">
        <div class="stat-card-header"><span class="stat-label">EVALUACIONES MES</span><span>🎯</span></div>
        <div class="stat-main"><span class="stat-number-red">${s.evaluations_this_month || 0}</span></div>
        <div class="stat-footer">Consultivas</div>
      </div>
    `;
  }
}
window.loadVeteranStats = loadVeteranStats;

// ============================================================
// 2. PUPILOS
// ============================================================
async function loadVeteranPupilos() {
  const list = document.getElementById('veteranPupilosList');
  const count = document.getElementById('veteranPupilosCount');
  const title = document.getElementById('veteranPupilosTitle');
  if (!list) return;

  list.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;">
    <p>Cargando pupilos…</p>
  </div>`;

  const params = {};
  if (veteranState.isOwner && veteranState.currentMentorId) {
    params.mentor_id = veteranState.currentMentorId;
  }

  const res = await apiVeteranMyPupilos(params);
  if (!res.success) {
    list.innerHTML = `<div class="veteran-empty-state"><p style="color:#f87171;">⚠️ ${escapeHTML(res.error || 'Error cargando pupilos')}</p></div>`;
    return;
  }

  veteranState.pupilosFlat = res.pupilos || [];
  veteranState.pupilosGrouped = res.grupos || [];

  if (count) count.textContent = res.total || 0;
  if (title) {
    title.textContent = res.global_view ? 'Pupilos por Veterano' : 'Mis Pupilos';
  }

  if (!res.total || res.total === 0) {
    list.innerHTML = `<div class="veteran-empty-state">
      <p>${veteranState.isOwner ? 'No hay pupilos asignados en el escuadrón' : 'Aún no tienes pupilos asignados'}</p>
      <p style="font-size:0.8rem;margin-top:4px;">Un Administrador puede asignarte uno desde el Panel de Comandancia.</p>
    </div>`;
    return;
  }

  if (res.global_view) {
    // Vista OWNER — agrupado por Veterano
    list.innerHTML = veteranState.pupilosGrouped.map(group => `
      <div class="veteran-group-header">
        <h4>🎖️ ${escapeHTML(group.mentor_nick)}</h4>
        <span class="badge-tag" style="font-size:0.7rem;">${group.pupilos.length} pupilo(s)</span>
      </div>
      ${group.pupilos.map(p => renderPupiloCard(p)).join('')}
    `).join('');
  } else {
    // Vista personal
    list.innerHTML = veteranState.pupilosFlat.map(p => renderPupiloCard(p)).join('');
  }

  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 50);
}
window.loadVeteranPupilos = loadVeteranPupilos;

function renderPupiloCard(p) {
  const statusClass = (p.perf_status || 'NEGRO').toLowerCase();
  const daysSince = p.started_at
    ? Math.floor((Date.now() - new Date(p.started_at).getTime()) / 86400000)
    : 0;

  return `
    <div class="veteran-pupilo-card">
      <div class="veteran-pupilo-info">
        <div class="veteran-pupilo-nick">
          ${escapeHTML(p.nick)}
          <span class="role-badge role-${p.role}">${p.role}</span>
          <span class="status-badge status-${statusClass}" style="font-size:0.7rem;padding:2px 8px;">
            ${escapeHTML(p.perf_status || 'NEGRO')}
          </span>
        </div>
        <div class="veteran-pupilo-meta">
          <span>🎯 Tokens: <strong style="color:#38bdf8;">${p.tokens || 0}</strong></span>
          <span>📅 Días: <strong>${p.days || 0}</strong></span>
          <span>⏱️ Mentoría: <strong>${daysSince}d</strong></span>
          ${p.last_activity ? `<span>🕐 Últ. act: ${new Date(p.last_activity).toLocaleDateString('es-PY')}</span>` : ''}
        </div>
      </div>
      <div class="veteran-pupilo-actions">
        <button onclick="openVeteranLogModal('${p.mentorship_id}', '${escapeHTML(p.nick).replace(/'/g, "\\'")}')"
                class="btn-secondary btn-sm" title="Registrar contacto">
          📝 Contacto
        </button>
        <button onclick="openVeteranEvalModal('${p.mentorship_id}', '${escapeHTML(p.nick).replace(/'/g, "\\'")}')"
                class="btn-primary btn-sm" title="Evaluación consultiva">
          🎯 Evaluar
        </button>
        <button onclick="openMentorshipDetail('${p.mentorship_id}')"
                class="btn-secondary btn-sm" title="Ver detalle">
          📂
        </button>
      </div>
    </div>
  `;
}

// ============================================================
// 3. HISTORIAL
// ============================================================
async function loadVeteranHistory() {
  const list = document.getElementById('veteranHistoryList');
  const count = document.getElementById('veteranHistoryCount');
  if (!list) return;

  const params = {};
  if (veteranState.isOwner && veteranState.currentMentorId) {
    params.mentor_id = veteranState.currentMentorId;
  }

  const res = await apiVeteranMyMentorships(params);
  if (!res.success) {
    list.innerHTML = `<div class="veteran-empty-state"><p style="color:#f87171;">⚠️ ${escapeHTML(res.error || 'Error cargando historial')}</p></div>`;
    return;
  }

  const mentorships = res.mentorships || [];
  if (count) count.textContent = mentorships.length;

  if (mentorships.length === 0) {
    list.innerHTML = `<div class="veteran-empty-state"><p>Sin historial de mentorías</p></div>`;
    return;
  }

  // Limitar a 30 en pantalla (el backend devuelve todo, acá recortamos)
  const display = mentorships.slice(0, 30);

  list.innerHTML = display.map(m => {
    const statusLabel = m.status === 'ACTIVE' ? '🟢 ACTIVA'
                     : m.status === 'REASSIGNED' ? '🟡 REASIGNADA'
                     : '⚫ FINALIZADA';
    const startDate = m.started_at ? new Date(m.started_at).toLocaleDateString('es-PY') : '—';
    const endDate = m.ended_at ? new Date(m.ended_at).toLocaleDateString('es-PY') : null;
    const mentorLine = res.global_view && m.mentor_nick
      ? `<div style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">🎖️ Mentor: <strong>${escapeHTML(m.mentor_nick)}</strong></div>`
      : '';

    return `
      <div class="veteran-history-item status-${m.status}">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:4px;">
          <strong style="color:#f8fafc;">${escapeHTML(m.mentee_nick || 'Piloto')}</strong>
          <span style="font-size:0.75rem;color:#94a3b8;">${statusLabel}</span>
        </div>
        ${mentorLine}
        <div style="font-size:0.75rem;color:#94a3b8;margin-top:4px;">
          📅 ${startDate}${endDate ? ` → ${endDate}` : ''}
        </div>
        ${m.ended_reason ? `<div style="font-size:0.75rem;color:#64748b;margin-top:4px;font-style:italic;">💬 ${escapeHTML(m.ended_reason)}</div>` : ''}
      </div>
    `;
  }).join('');
}
window.loadVeteranHistory = loadVeteranHistory;

// ============================================================
// 4. LISTA DE VETERANOS (solo OWNER) — para el selector
// ============================================================
async function loadVeteranList() {
  const sel = document.getElementById('veteranFilterSelect');
  if (!sel) return;

  // Usa el endpoint admin de mentorships para obtener los Veteranos con pupilos
  // (ya que no tenemos un endpoint dedicado de "lista de Veteranos")
  const res = await apiAdminListMentorships({ status: 'ACTIVE' });
  if (!res.success) {
    console.warn('[Veteran] No se pudo cargar la lista de Veteranos:', res.error);
    return;
  }

  // Extraer Veteranos únicos de las mentorías activas
  const mentorships = res.mentorships || [];
  const mentorMap = {};
  mentorships.forEach(m => {
    if (m.mentor_id && m.mentor_nick) {
      if (!mentorMap[m.mentor_id]) {
        mentorMap[m.mentor_id] = { id: m.mentor_id, nick: m.mentor_nick, count: 0 };
      }
      mentorMap[m.mentor_id].count++;
    }
  });

  const mentors = Object.values(mentorMap).sort((a, b) => a.nick.localeCompare(b.nick));
  veteranState.mentors = mentors;

  // Mantener la opción "Todos" y reconstruir
  sel.innerHTML = '<option value="">— Todos los Veteranos —</option>';
  mentors.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.nick} (${m.count} pupilo${m.count !== 1 ? 's' : ''})`;
    sel.appendChild(opt);
  });

  // Restaurar selección si existe
  if (veteranState.currentMentorId) {
    sel.value = veteranState.currentMentorId;
  }
}
window.loadVeteranList = loadVeteranList;

// ============================================================
// 5. FILTRO DE VETERANO (solo OWNER)
// ============================================================
function onVeteranFilterChange(mentorId) {
  veteranState.currentMentorId = mentorId || null;

  // Recargar stats, pupilos e historial (pero NO la lista de Veteranos)
  Promise.all([
    loadVeteranStats(),
    loadVeteranPupilos(),
    loadVeteranHistory()
  ]);
}
window.onVeteranFilterChange = onVeteranFilterChange;

// ============================================================
// 6. MODAL: REGISTRAR CONTACTO
// ============================================================
function openVeteranLogModal(mentorshipId, menteeNick) {
  veteranState.currentMentorshipId = mentorshipId;
  veteranState.currentMenteeNick = menteeNick;

  const nickEl = document.getElementById('veteranLogMenteeNick');
  if (nickEl) nickEl.textContent = menteeNick;

  const noteEl = document.getElementById('veteranLogNote');
  if (noteEl) {
    noteEl.value = '';
    // Contador en vivo
    noteEl.oninput = () => {
      const counter = document.getElementById('veteranLogCounter');
      if (counter) counter.textContent = noteEl.value.length;
    };
  }
  const counter = document.getElementById('veteranLogCounter');
  if (counter) counter.textContent = '0';

  showModal('veteranLogModal');
  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 50);
}
window.openVeteranLogModal = openVeteranLogModal;

async function submitVeteranLog() {
  const note = document.getElementById('veteranLogNote')?.value || '';
  const btn = document.getElementById('veteranLogSubmit');

  if (!note.trim()) {
    showToast('⚠️ La nota es obligatoria', 'warning');
    return;
  }
  if (note.length > 2000) {
    showToast('⚠️ La nota no puede exceder 2000 caracteres', 'warning');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando…'; }

  try {
    const res = await apiVeteranLogContact(veteranState.currentMentorshipId, note.trim());
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Error al guardar'), 'error');
      return;
    }
    showToast('✅ Contacto registrado', 'success');
    closeVeteranModal('veteranLogModal');
    // Refrescar stats (contador del mes)
    loadVeteranStats();
  } catch (err) {
    console.error('[Veteran] submitVeteranLog error:', err);
    showToast('❌ Error de conexión', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar Contacto'; }
  }
}
window.submitVeteranLog = submitVeteranLog;

// ============================================================
// 7. MODAL: EVALUACIÓN CONSULTIVA
// ============================================================
function openVeteranEvalModal(mentorshipId, menteeNick) {
  veteranState.currentMentorshipId = mentorshipId;
  veteranState.currentMenteeNick = menteeNick;

  const nickEl = document.getElementById('veteranEvalMenteeNick');
  if (nickEl) nickEl.textContent = menteeNick;

  // Resetear selects a MEDIA
  ['evalParticipacion','evalCooperacion','evalConducta','evalIntegracion','evalDisposicion']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'MEDIA';
    });

  const summaryEl = document.getElementById('veteranEvalSummary');
  if (summaryEl) {
    summaryEl.value = '';
    summaryEl.oninput = () => {
      const counter = document.getElementById('veteranEvalCounter');
      if (counter) counter.textContent = summaryEl.value.length;
    };
  }
  const counter = document.getElementById('veteranEvalCounter');
  if (counter) counter.textContent = '0';

  showModal('veteranEvalModal');
  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 50);
}
window.openVeteranEvalModal = openVeteranEvalModal;

async function submitVeteranEval() {
  const criteria = {
    participacion: document.getElementById('evalParticipacion')?.value || 'MEDIA',
    cooperacion:   document.getElementById('evalCooperacion')?.value   || 'MEDIA',
    conducta:      document.getElementById('evalConducta')?.value      || 'MEDIA',
    integracion:   document.getElementById('evalIntegracion')?.value   || 'MEDIA',
    disposicion:   document.getElementById('evalDisposicion')?.value   || 'MEDIA'
  };
  const summary = document.getElementById('veteranEvalSummary')?.value || '';
  const btn = document.getElementById('veteranEvalSubmit');

  if (!summary.trim()) {
    showToast('⚠️ El resumen es obligatorio', 'warning');
    return;
  }
  if (summary.length > 4000) {
    showToast('⚠️ El resumen no puede exceder 4000 caracteres', 'warning');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando…'; }

  try {
    const res = await apiVeteranEvaluate(veteranState.currentMentorshipId, criteria, summary.trim());
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Error al guardar'), 'error');
      return;
    }
    showToast('✅ Evaluación registrada (consultiva)', 'success');
    closeVeteranModal('veteranEvalModal');
    // Refrescar stats (contador del mes)
    loadVeteranStats();
  } catch (err) {
    console.error('[Veteran] submitVeteranEval error:', err);
    showToast('❌ Error de conexión', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Registrar Evaluación'; }
  }
}
window.submitVeteranEval = submitVeteranEval;

// ============================================================
// 8. MODAL: DETALLE DE MENTORÍA
// ============================================================
async function openMentorshipDetail(mentorshipId) {
  const body = document.getElementById('veteranDetailBody');
  if (!body) return;

  body.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:2rem;">Cargando detalle…</p>';
  showModal('veteranMentorshipDetailModal');

  const res = await apiVeteranGetMentorship(mentorshipId);
  if (!res.success) {
    body.innerHTML = `<p style="color:#f87171;text-align:center;padding:2rem;">⚠️ ${escapeHTML(res.error || 'Error cargando detalle')}</p>`;
    return;
  }

  const m = res.mentorship || {};
  const mentee = res.mentee || {};
  const logs = res.logs || [];
  const evals = res.evaluations || [];

  const logsHtml = logs.length === 0
    ? '<p style="color:#64748b;font-style:italic;">Sin contactos registrados</p>'
    : logs.map(l => `
        <div style="background:rgba(15,23,42,0.5);border-left:3px solid #38bdf8;padding:10px 12px;border-radius:4px;margin-bottom:8px;">
          <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:4px;">
            📅 ${new Date(l.created_at).toLocaleString('es-PY')}
          </div>
          <div style="font-size:0.85rem;color:#e2e8f0;white-space:pre-wrap;word-break:break-word;">${escapeHTML(l.note)}</div>
        </div>
      `).join('');

  const evalsHtml = evals.length === 0
    ? '<p style="color:#64748b;font-style:italic;">Sin evaluaciones registradas</p>'
    : evals.map(e => {
        const crit = e.criteria || {};
        const critLine = ['participacion','cooperacion','conducta','integracion','disposicion']
          .map(k => `${k.slice(0,3).toUpperCase()}:${crit[k] || '—'}`)
          .join(' · ');
        return `
          <div style="background:rgba(15,23,42,0.5);border-left:3px solid #f59e0b;padding:10px 12px;border-radius:4px;margin-bottom:8px;">
            <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:4px;">
              📅 ${new Date(e.created_at).toLocaleString('es-PY')}
            </div>
            <div style="font-size:0.75rem;color:#f59e0b;font-family:var(--font-mono);margin-bottom:6px;">${critLine}</div>
            <div style="font-size:0.85rem;color:#e2e8f0;white-space:pre-wrap;word-break:break-word;">${escapeHTML(e.summary)}</div>
          </div>
        `;
      }).join('');

  body.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <h4 style="color:#d4af37;font-family:var(--font-tactical);margin:0 0 8px 0;">
        👤 ${escapeHTML(mentee.nick || 'Piloto')}
      </h4>
      <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:0.85rem;color:#94a3b8;">
        <span>🎯 Rol: <strong style="color:#e2e8f0;">${escapeHTML(mentee.role || 'MIEMBRO')}</strong></span>
        <span>📊 Estado: <strong style="color:#e2e8f0;">${escapeHTML(mentee.perf_status || 'PENDIENTE')}</strong></span>
        <span>💯 Tokens: <strong style="color:#38bdf8;">${mentee.avg_tokens || 0}</strong></span>
        <span>📅 Semanas: <strong>${mentee.weeks_evaluated || 0}</strong></span>
        <span>🟢 Mentoría: <strong style="color:#2ecc71;">${escapeHTML(m.status || '—')}</strong></span>
      </div>
    </div>

    <div style="margin-bottom:1.5rem;">
      <h5 style="color:#38bdf8;font-size:0.95rem;margin:0 0 10px 0;">📝 Contactos (${logs.length})</h5>
      ${logsHtml}
    </div>

    <div>
      <h5 style="color:#f59e0b;font-size:0.95rem;margin:0 0 10px 0;">🎯 Evaluaciones (${evals.length})</h5>
      ${evalsHtml}
    </div>
  `;

  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 50);
}
window.openMentorshipDetail = openMentorshipDetail;

// ============================================================
// 9. MODAL: ASIGNAR MENTOR (solo OWNER)
// ============================================================
async function openNewMentorshipModal() {
  if (!veteranState.isOwner) {
    showToast('⚠️ Solo el OWNER puede asignar mentorías manualmente', 'warning');
    return;
  }

  const mentorSel = document.getElementById('newMentorshipMentor');
  const menteeSel = document.getElementById('newMentorshipMentee');

  if (mentorSel) mentorSel.innerHTML = '<option value="">— Cargando Veteranos… —</option>';
  if (menteeSel) menteeSel.innerHTML = '<option value="">— Cargando Miembros… —</option>';

  showModal('veteranNewMentorshipModal');

  // Cargar Veteranos y Miembros en paralelo
  const [vetsRes, membersRes] = await Promise.all([
    fetch(`${API_BASE}/api/admin/users`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : { users: [] })
      .catch(() => ({ users: [] })),
    fetch(`${API_BASE}/api/admin/users`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : { users: [] })
      .catch(() => ({ users: [] }))
  ]);

  const allUsers = vetsRes.users || vetsRes.members || vetsRes.data || [];
  const veterans = allUsers.filter(u => (u.role || '').toUpperCase() === 'VETERANO' && (u.status || '').toUpperCase() === 'ACTIVE');
  const members = allUsers.filter(u => (u.role || '').toUpperCase() === 'MIEMBRO' && (u.status || '').toUpperCase() === 'ACTIVE');

  if (mentorSel) {
    mentorSel.innerHTML = '<option value="">— Seleccionar Veterano —</option>';
    veterans.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.nick} (ID: ${v.user_id || v.id})`;
      mentorSel.appendChild(opt);
    });
  }

  if (menteeSel) {
    menteeSel.innerHTML = '<option value="">— Seleccionar Miembro —</option>';
    members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.nick} (ID: ${m.user_id || m.id})`;
      menteeSel.appendChild(opt);
    });
  }

  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 50);
}
window.openNewMentorshipModal = openNewMentorshipModal;

async function submitNewMentorship() {
  const mentorId = document.getElementById('newMentorshipMentor')?.value;
  const menteeId = document.getElementById('newMentorshipMentee')?.value;
  const btn = document.getElementById('veteranNewMentorshipSubmit');

  if (!mentorId || !menteeId) {
    showToast('⚠️ Seleccioná un Veterano y un Miembro', 'warning');
    return;
  }
  if (mentorId === menteeId) {
    showToast('⚠️ El mentor no puede ser su propio pupilo', 'warning');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Asignando…'; }

  try {
    const res = await apiAdminCreateMentorship(mentorId, menteeId);
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Error al asignar'), 'error');
      return;
    }
    showToast('✅ ' + (res.message || 'Mentoría asignada'), 'success');
    closeVeteranModal('veteranNewMentorshipModal');
    // Recargar todo el panel
    await loadVeteranPanel();
  } catch (err) {
    console.error('[Veteran] submitNewMentorship error:', err);
    showToast('❌ Error de conexión', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Asignar Mentor'; }
  }
}
window.submitNewMentorship = submitNewMentorship;

// ============================================================
// 10. HELPERS
// ============================================================
function closeVeteranModal(modalId) {
  if (typeof closeModal === 'function') {
    closeModal(modalId);
  } else {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
  }
}
window.closeVeteranModal = closeVeteranModal;

// ============================================================
// INIT — log de carga
// ============================================================

// ============================================================
// 11. WIDGET EN DASHBOARD
// ============================================================
async function renderVeteranWidget() {
  const widget = document.getElementById('veteranWidget');
  const body = document.getElementById('veteranWidgetBody');
  if (!widget || !body) return;

  const user = window.currentUser;
  if (!user) {
    widget.style.display = 'none';
    return;
  }

  const role = (user.role || 'MIEMBRO').toUpperCase();
  const canSee = role === 'VETERANO' || role === 'OWNER';
  if (!canSee) {
    widget.style.display = 'none';
    return;
  }

  widget.style.display = 'block';

  // Cargar stats
  const res = await apiVeteranMyStats({});
  if (!res.success) {
    body.innerHTML = `<p style="color:#f87171;font-size:0.85rem;margin:0;">⚠️ ${escapeHTML(res.error || 'Error cargando resumen')}</p>`;
    return;
  }

  const s = res.stats || {};

  if (res.global_view) {
    // Vista OWNER
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;">
        <div style="text-align:center;">
          <div style="font-family:var(--font-tactical);font-size:1.6rem;font-weight:700;color:#d4af37;">${s.active_veteranos || 0}</div>
          <div style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Veteranos</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--font-tactical);font-size:1.6rem;font-weight:700;color:#38bdf8;">${s.active_pupilos || 0}</div>
          <div style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Pupilos</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--font-tactical);font-size:1.6rem;font-weight:700;color:#2ecc71;">${s.logs_this_month || 0}</div>
          <div style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Contactos (mes)</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--font-tactical);font-size:1.6rem;font-weight:700;color:#f59e0b;">${s.evaluations_this_month || 0}</div>
          <div style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Evaluaciones (mes)</div>
        </div>
      </div>
    `;
  } else {
    // Vista VETERANO
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;">
        <div style="text-align:center;">
          <div style="font-family:var(--font-tactical);font-size:1.6rem;font-weight:700;color:#38bdf8;">${s.active_pupilos || 0}</div>
          <div style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Pupilos activos</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--font-tactical);font-size:1.6rem;font-weight:700;color:#2ecc71;">${s.logs_this_month || 0}</div>
          <div style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Contactos (mes)</div>
        </div>
        <div style="text-align:center;">
          <div style="font-family:var(--font-tactical);font-size:1.6rem;font-weight:700;color:#f59e0b;">${s.evaluations_this_month || 0}</div>
          <div style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Evaluaciones (mes)</div>
        </div>
      </div>
    `;
  }

  if (typeof refreshLucideIcons === 'function') {
    setTimeout(refreshLucideIcons, 30);
  }
}
window.renderVeteranWidget = renderVeteranWidget;

console.log('✅ [Veteran] Módulo cargado. Funciones expuestas en window.');