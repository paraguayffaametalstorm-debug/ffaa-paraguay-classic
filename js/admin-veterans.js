/**
 * PARAGUAY-FFAA | METALSTORM
 * Panel Admin — Sección Veteranos (ADR-010)
 * ============================================================
 * Consume los endpoints del módulo Veteranos para dar al
 * ADMIN/OWNER visibilidad completa de las mentorías del escuadrón.
 *
 * Endpoints:
 *   - GET    /api/veteran/my-stats          (global_view si OWNER)
 *   - GET    /api/admin/mentorships         (?status=X&mentor_id=Y)
 *   - POST   /api/admin/mentorships         (asignar)
 *   - PATCH  /api/admin/mentorships/:id     (close/reassign)
 *
 * Dependencias:
 *   - js/api.js → apiAdminListMentorships, apiAdminUpdateMentorship,
 *                 apiVeteranMyStats, apiAdminCreateMentorship
 *   - window.openNewMentorshipModal()       (de veteran.js)
 *   - window.showToast, window.showModal, window.closeModal
 *
 * Versión: v1.0 · Fecha: 2026-10-10
 */

(function() {
  'use strict';

  // ============================================================
  // ESTADO INTERNO
  // ============================================================
  const state = {
    mentorships: [],
    filtered: [],
    mentors: [],
    filterMentor: '',
    filterStatus: 'ACTIVE',
    loading: false,
    lastError: null
  };

  // ============================================================
  // HELPERS
  // ============================================================

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      const pad = n => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    } catch (_) {
      return '—';
    }
  }

  function statusBadge(status) {
    const map = {
      ACTIVE:     { cls: 'status-verde',   txt: '🟢 ACTIVA' },
      ENDED:      { cls: 'status-negro',   txt: '⚫ FINALIZADA' },
      REASSIGNED: { cls: 'status-naranja', txt: '🟡 REASIGNADA' }
    };
    const cfg = map[status] || { cls: 'status-negro', txt: status || '—' };
    return `<span class="status-badge ${cfg.cls}" style="font-size:0.72rem;padding:2px 8px;">${cfg.txt}</span>`;
  }

  // ============================================================
  // 1. LOAD — Cargar KPIs + tabla + lista de Veteranos
  // ============================================================

  async function loadAdminVeteransSection() {
    const container = document.getElementById('adminVeteransTableContainer');
    if (!container) {
      console.warn('[AdminVeterans] Contenedor no encontrado');
      return;
    }

    state.loading = true;
    state.lastError = null;
    renderSkeleton(container);

    try {
      // 1. KPIs globales (OWNER view)
      const statsPromise = apiVeteranMyStats({}); // OWNER → global_view
      // 2. Mentorías según filtros actuales
      const params = {};
      if (state.filterStatus) params.status = state.filterStatus;
      if (state.filterMentor) params.mentor_id = state.filterMentor;

      const mentorshipsPromise = apiAdminListMentorships(params);

      const [statsRes, mentorshipsRes] = await Promise.all([
        statsPromise,
        mentorshipsPromise
      ]);

      // Render KPIs
      if (statsRes.success && statsRes.stats) {
        renderStats(statsRes.stats);
      } else {
        console.warn('[AdminVeterans] No se pudieron cargar stats:', statsRes.error);
      }

      // Render tabla
      if (!mentorshipsRes.success) {
        state.lastError = mentorshipsRes.error || 'Error desconocido';
        renderError(container, state.lastError);
        return;
      }

      state.mentorships = Array.isArray(mentorshipsRes.mentorships) ? mentorshipsRes.mentorships : [];

      // Extraer Veteranos únicos para el selector (de todas las mentorías)
      updateMentorsSelect(state.mentorships);

      applyFilters();
      renderTable(container);

    } catch (err) {
      console.error('❌ [AdminVeterans] Error:', err);
      state.lastError = err.message || 'Error de conexión';
      renderError(container, state.lastError);
    } finally {
      state.loading = false;
    }
  }

  // ============================================================
  // 2. KPIs
  // ============================================================

  function renderStats(stats) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? 0;
    };
    // Si viene global_view (OWNER sin filtro)
    if (stats.active_veteranos !== undefined) {
      set('veteranStatActive', stats.active_pupilos || 0);
      set('veteranStatVeterans', stats.active_veteranos || 0);
      set('veteranStatPupilos', stats.active_pupilos || 0);
      set('veteranStatContacts', stats.logs_this_month || 0);
    } else {
      // Fallback: VETERANO viendo stats (no debería pasar acá, pero por las dudas)
      set('veteranStatActive', stats.active_pupilos || 0);
      set('veteranStatVeterans', '—');
      set('veteranStatPupilos', stats.active_pupilos || 0);
      set('veteranStatContacts', stats.logs_this_month || 0);
    }
  }

  // ============================================================
  // 3. SELECTOR DE VETERANOS
  // ============================================================

  function updateMentorsSelect(mentorships) {
    const sel = document.getElementById('veteranFilterMentor');
    if (!sel) return;

    // Extraer Veteranos únicos (del resultado completo, no del filtrado)
    const mentorsMap = {};
    mentorships.forEach(m => {
      if (m.mentor_id && m.mentor_nick) {
        if (!mentorsMap[m.mentor_id]) {
          mentorsMap[m.mentor_id] = { id: m.mentor_id, nick: m.mentor_nick, count: 0 };
        }
        if (m.status === 'ACTIVE') mentorsMap[m.mentor_id].count++;
      }
    });

    state.mentors = Object.values(mentorsMap).sort((a, b) => a.nick.localeCompare(b.nick));

    // Preservar selección
    const prevValue = sel.value;

    sel.innerHTML = '<option value="">— Todos —</option>';
    state.mentors.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.nick} (${m.count} activo${m.count !== 1 ? 's' : ''})`;
      sel.appendChild(opt);
    });

    if (prevValue && state.mentors.find(m => m.id === prevValue)) {
      sel.value = prevValue;
    }
  }

  // ============================================================
  // 4. FILTROS
  // ============================================================

  function applyFilters() {
    state.filtered = state.mentorships.filter(m => {
      if (state.filterMentor && m.mentor_id !== state.filterMentor) return false;
      if (state.filterStatus && m.status !== state.filterStatus) return false;
      return true;
    });
  }

  function filterByMentor(mentorId) {
    state.filterMentor = mentorId || '';
    applyFilters();
    const container = document.getElementById('adminVeteransTableContainer');
    if (container) renderTable(container);
  }

  function filterByStatus(status) {
    state.filterStatus = status || '';
    // Recargar desde API porque cambia el WHERE
    loadAdminVeteransSection();
  }

  function clearFilters() {
    state.filterMentor = '';
    state.filterStatus = 'ACTIVE';

    const mentorSel = document.getElementById('veteranFilterMentor');
    if (mentorSel) mentorSel.value = '';

    const statusSel = document.getElementById('veteranFilterStatus');
    if (statusSel) statusSel.value = 'ACTIVE';

    loadAdminVeteransSection();
  }

  // ============================================================
  // 5. RENDER — Tabla
  // ============================================================

  function renderSkeleton(container) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:#94a3b8;">
        <i data-lucide="loader-2" class="spin"></i>
        <p style="margin-top:8px;">Sincronizando mentorías…</p>
      </div>`;
    if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 30);
  }

  function renderError(container, msg) {
    container.innerHTML = `
      <div style="background:rgba(231,76,60,0.1);border:1px solid #e74c3c;border-radius:8px;padding:1rem;color:#fca5a5;">
        <strong>⚠️ Error al cargar mentorías:</strong> ${escapeHTML(msg)}
        <div style="margin-top:10px;">
          <button onclick="window.adminVeteransReload()" class="btn-secondary" style="font-size:0.8rem;">
            🔄 Reintentar
          </button>
        </div>
      </div>`;
  }

  function renderTable(container) {
    if (state.filtered.length === 0) {
      const emptyMsg = state.filterStatus === 'ACTIVE'
        ? 'No hay mentorías activas. Los pupilos se auto-asignan al crear un MIEMBRO.'
        : 'No hay mentorías que coincidan con los filtros.';
      container.innerHTML = `
        <div class="empty-state" style="padding:2.5rem 1.5rem;">
          <div class="empty-icon">🎖️</div>
          <h3>Sin resultados</h3>
          <p>${emptyMsg}</p>
        </div>`;
      return;
    }

    const rows = state.filtered.map(m => {
      const isActive = m.status === 'ACTIVE';
      const dias = m.started_at
        ? Math.floor((Date.now() - new Date(m.started_at).getTime()) / 86400000)
        : 0;

      const actionsHTML = isActive
        ? `
          <button type="button"
                  onclick="window.adminVeteransOpenReassignModal('${m.id}', '${escapeHTML(m.mentee_nick || '')}')"
                  class="btn-secondary"
                  style="font-size:0.72rem;padding:3px 8px;"
                  title="Reasignar a otro Veterano">
            🔄 Reasignar
          </button>
          <button type="button"
                  onclick="window.adminVeteransOpenCloseModal('${m.id}', '${escapeHTML(m.mentee_nick || '')}')"
                  class="btn-danger"
                  style="font-size:0.72rem;padding:3px 8px;"
                  title="Cerrar mentoría">
            🔒 Cerrar
          </button>`
        : `<span style="font-size:0.72rem;color:#64748b;font-style:italic;">—</span>`;

      return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);">
          <td style="padding:10px 8px;">
            <span style="font-weight:600;color:#38bdf8;font-size:0.85rem;">
              🎖️ ${escapeHTML(m.mentor_nick || '—')}
            </span>
          </td>
          <td style="padding:10px 8px;">
            <span style="font-weight:600;color:#f8fafc;font-size:0.85rem;">
              ${escapeHTML(m.mentee_nick || '—')}
            </span>
          </td>
          <td style="padding:10px 8px;">${statusBadge(m.status)}</td>
          <td style="padding:10px 8px;font-size:0.8rem;color:#cbd5e1;">${fmtDate(m.started_at)}</td>
          <td style="padding:10px 8px;font-size:0.8rem;color:#cbd5e1;">
            ${isActive ? `<strong style="color:#38bdf8;">${dias}d</strong>` : fmtDate(m.ended_at)}
          </td>
          <td style="padding:10px 8px;max-width:200px;font-size:0.75rem;color:#94a3b8;">
            ${m.ended_reason ? escapeHTML(m.ended_reason) : (isActive ? '—' : '—')}
          </td>
          <td style="padding:10px 8px;text-align:center;white-space:nowrap;">
            <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
              ${actionsHTML}
            </div>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.85rem;">
          <thead>
            <tr style="border-bottom:1px solid rgba(148,163,184,0.25);text-align:left;">
              <th style="padding:10px 8px;">Veterano (Mentor)</th>
              <th style="padding:10px 8px;">Pupilo</th>
              <th style="padding:10px 8px;width:130px;">Estado</th>
              <th style="padding:10px 8px;width:110px;">Inicio</th>
              <th style="padding:10px 8px;width:100px;">Duración</th>
              <th style="padding:10px 8px;">Motivo</th>
              <th style="padding:10px 8px;width:170px;text-align:center;">Acciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="text-align:right;font-size:0.75rem;color:#64748b;margin-top:8px;">
        Mostrando ${state.filtered.length} de ${state.mentorships.length} mentoría(s)
      </div>`;

    if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 30);
  }

  // ============================================================
  // 6. ACCIÓN: ASIGNAR (reutiliza modal de veteran-panel)
  // ============================================================

  function openAssignModal() {
    if (typeof window.openNewMentorshipModal === 'function') {
      window.openNewMentorshipModal();
    } else {
      console.warn('[AdminVeterans] openNewMentorshipModal no disponible');
      if (typeof showToast === 'function') {
        showToast('⚠️ El modal de asignación no está disponible', 'warning');
      }
    }
  }

  // ============================================================
  // 7. ACCIÓN: REASIGNAR
  // ============================================================

  async function openReassignModal(mentorshipId, menteeNick) {
    const idEl = document.getElementById('adminReassignMentorshipId');
    const nickEl = document.getElementById('adminReassignMenteeNick');
    const sel = document.getElementById('adminReassignNewMentor');
    const reasonEl = document.getElementById('adminReassignReason');

    if (idEl) idEl.value = mentorshipId;
    if (nickEl) nickEl.textContent = menteeNick || '—';
    if (reasonEl) reasonEl.value = '';

    // Poblar selector con Veteranos ACTIVE (excluye el actual)
    if (sel) {
      sel.innerHTML = '<option value="">— Cargando Veteranos… —</option>';

      // Buscar el mentor actual para excluirlo
      const current = state.mentorships.find(m => m.id === mentorshipId);
      const currentMentorId = current?.mentor_id || null;

      try {
        // Reusar la lista de mentors cargada en state
        sel.innerHTML = '<option value="">— Seleccionar Veterano —</option>';
        state.mentors.forEach(m => {
          if (m.id === currentMentorId) return; // no se puede reasignar al mismo
          const opt = document.createElement('option');
          opt.value = m.id;
          opt.textContent = `${m.nick} (${m.count} activo${m.count !== 1 ? 's' : ''})`;
          sel.appendChild(opt);
        });

        if (sel.options.length === 1) {
          sel.innerHTML = '<option value="">— Sin Veteranos disponibles —</option>';
        }
      } catch (err) {
        console.warn('[AdminVeterans] Error poblando selector:', err);
      }
    }

    if (typeof showModal === 'function') {
      showModal('adminReassignMentorshipModal');
    }
    if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 30);
  }

  async function submitReassign() {
    const id = document.getElementById('adminReassignMentorshipId')?.value;
    const newMentorId = document.getElementById('adminReassignNewMentor')?.value;
    const reason = document.getElementById('adminReassignReason')?.value?.trim() || '';
    const btn = document.getElementById('adminReassignSubmitBtn');

    if (!id) return;
    if (!newMentorId) {
      if (typeof showToast === 'function') showToast('⚠️ Seleccioná un nuevo Veterano', 'warning');
      return;
    }
    if (reason.length < 5) {
      if (typeof showToast === 'function') showToast('⚠️ El motivo debe tener al menos 5 caracteres', 'warning');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Reasignando…'; }

    try {
      const res = await apiAdminUpdateMentorship(id, 'reassign', {
        new_mentor_id: newMentorId,
        reason
      });

      if (!res.success) {
        if (typeof showToast === 'function') showToast('❌ ' + (res.error || 'Error al reasignar'), 'error');
        return;
      }

      if (typeof showToast === 'function') showToast('✅ ' + (res.message || 'Mentoría reasignada'), 'success');
      if (typeof closeModal === 'function') closeModal('adminReassignMentorshipModal');
      await loadAdminVeteransSection();
    } catch (err) {
      console.error('[AdminVeterans] Error en submitReassign:', err);
      if (typeof showToast === 'function') showToast('❌ Error de conexión', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Reasignar Mentor'; }
    }
  }

  // ============================================================
  // 8. ACCIÓN: CERRAR
  // ============================================================

  function openCloseModal(mentorshipId, menteeNick) {
    const idEl = document.getElementById('adminCloseMentorshipId');
    const nickEl = document.getElementById('adminCloseMenteeNick');
    const reasonEl = document.getElementById('adminCloseReason');

    if (idEl) idEl.value = mentorshipId;
    if (nickEl) nickEl.textContent = menteeNick || '—';
    if (reasonEl) reasonEl.value = '';

    if (typeof showModal === 'function') showModal('adminCloseMentorshipModal');
    if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 30);
  }

  async function submitClose() {
    const id = document.getElementById('adminCloseMentorshipId')?.value;
    const reason = document.getElementById('adminCloseReason')?.value?.trim() || '';
    const btn = document.getElementById('adminCloseSubmitBtn');

    if (!id) return;
    if (reason.length < 5) {
      if (typeof showToast === 'function') showToast('⚠️ El motivo debe tener al menos 5 caracteres', 'warning');
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Cerrando…'; }

    try {
      const res = await apiAdminUpdateMentorship(id, 'close', { reason });

      if (!res.success) {
        if (typeof showToast === 'function') showToast('❌ ' + (res.error || 'Error al cerrar'), 'error');
        return;
      }

      if (typeof showToast === 'function') showToast('✅ ' + (res.message || 'Mentoría cerrada'), 'success');
      if (typeof closeModal === 'function') closeModal('adminCloseMentorshipModal');
      await loadAdminVeteransSection();
    } catch (err) {
      console.error('[AdminVeterans] Error en submitClose:', err);
      if (typeof showToast === 'function') showToast('❌ Error de conexión', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔒 Cerrar Mentoría'; }
    }
  }

  // ============================================================
  // EXPOSICIÓN GLOBAL
  // ============================================================

  window.adminVeteransLoad                = loadAdminVeteransSection;
  window.adminVeteransReload              = loadAdminVeteransSection;
  window.adminVeteransFilterMentor        = filterByMentor;
  window.adminVeteransFilterStatus        = filterByStatus;
  window.adminVeteransClearFilters        = clearFilters;
  window.adminVeteransOpenAssignModal     = openAssignModal;
  window.adminVeteransOpenReassignModal   = openReassignModal;
  window.adminVeteransOpenCloseModal      = openCloseModal;
  window.adminVeteransSubmitReassign      = submitReassign;
  window.adminVeteransSubmitClose         = submitClose;

  console.log('✅ [AdminVeterans] Módulo admin-veterans.js cargado (ADR-010)');
})();