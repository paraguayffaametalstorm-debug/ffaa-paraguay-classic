/**
 * PARAGUAY-FFAA | METALSTORM
 * Panel Admin Unificado de Eventos — F4.3
 * ============================================================
 * Consume /api/events-v2/* para listar, filtrar, crear y
 * activar/cerrar eventos SQ + BM desde una sola tabla.
 *
 * Reemplaza:
 *   - loadAdminEvents()   (js/views.js — usaba /api/events LEGACY)
 *   - renderAdminEvents() (js/views.js — grid sin acciones)
 *   - #blackMarketInfo    (admin-panel.html — sección BM separada)
 *
 * Dependencias:
 *   - apiEventsV2List()         (js/api.js)
 *   - apiEventsV2BmCreate()     (js/api.js)
 *   - apiEventsV2Create()       (js/api.js)
 *   - apiEventsV2ChangeStatus() (js/api.js)
 *
 * Versión: v1.0 · Fecha: 2026-09-19
 */

(function() {
  'use strict';

  // ============================================================
  // ESTADO INTERNO
  // ============================================================
  const state = {
    events: [],           // lista cruda de events_master
    filtered: [],         // lista tras aplicar filtros
    filterType: '',       // '' | 'SQUADRON' | 'BLACK_MARKET'
    filterStatus: '',     // '' | 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED'
    loading: false,
    lastError: null
  };

  // ============================================================
  // HELPERS DE FORMATO
  // ============================================================

  function typeLabel(type) {
    if (type === 'SQUADRON') return '✈️ SQ';
    if (type === 'BLACK_MARKET') return '⚡ BM';
    if (type === 'ACE_CHALLENGE') return '🎯 ACE';
    return type || '—';
  }

  function statusBadge(status) {
    const map = {
      OPEN:      { cls: 'status-verde',   txt: '🟢 OPEN' },
      SCHEDULED: { cls: 'status-naranja', txt: '🟡 SCHEDULED' },
      CLOSED:    { cls: 'status-negro',   txt: '⚫ CLOSED' },
      CANCELLED: { cls: 'status-rojo',    txt: '🔴 CANCELLED' }
    };
    const cfg = map[status] || { cls: 'status-negro', txt: status || '—' };
    return `<span class="status-badge ${cfg.cls}" style="font-size:0.72rem;padding:2px 8px;">${cfg.txt}</span>`;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      const pad = n => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (_) {
      return '—';
    }
  }

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ============================================================
  // 1. LOAD — Traer eventos desde /api/events-v2
  // ============================================================

  async function loadAdminEventsV2() {
    const container = document.getElementById('adminEventsV2Container');
    if (!container) return;

    state.loading = true;
    state.lastError = null;
    renderSkeleton(container);

    try {
      // Lista completa con límite razonable
      const res = await apiEventsV2List({ limit: 50 });

      if (!res.success) {
        state.lastError = res.error || 'Error desconocido';
        renderError(container, state.lastError);
        return;
      }

      state.events = Array.isArray(res.events) ? res.events : [];
      applyFilters();
      renderAll(container);
    } catch (err) {
      console.error('❌ [AdminEvents] Error en loadAdminEventsV2:', err);
      state.lastError = err.message || 'Error de conexión';
      renderError(container, state.lastError);
    } finally {
      state.loading = false;
    }
  }

  // ============================================================
  // 2. FILTROS
  // ============================================================

  function applyFilters() {
    state.filtered = state.events.filter(ev => {
      if (state.filterType && ev.type !== state.filterType) return false;
      if (state.filterStatus && ev.status !== state.filterStatus) return false;
      return true;
    });
  }

  function setFilterType(type) {
    state.filterType = type || '';
    applyFilters();
    const container = document.getElementById('adminEventsV2Container');
    if (container) renderAll(container);
  }

  function setFilterStatus(status) {
    state.filterStatus = status || '';
    applyFilters();
    const container = document.getElementById('adminEventsV2Container');
    if (container) renderAll(container);
  }

  // ============================================================
  // 3. RENDER
  // ============================================================

  function renderSkeleton(container) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:#94a3b8;">
        <i data-lucide="loader-2" class="spin"></i>
        Sincronizando eventos desde el núcleo unificado...
      </div>`;
    if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 30);
  }

  function renderError(container, msg) {
    container.innerHTML = `
      <div style="background:rgba(231,76,60,0.1);border:1px solid #e74c3c;border-radius:8px;padding:1rem;color:#fca5a5;">
        <strong>⚠️ Error al cargar eventos:</strong> ${escapeHTML(msg)}
        <div style="margin-top:10px;">
          <button onclick="window.adminEventsReload()" class="btn-secondary" style="font-size:0.8rem;">
            🔄 Reintentar
          </button>
        </div>
      </div>`;
  }

  function renderAll(container) {
    const activeEvent = state.events.find(ev => ev.status === 'OPEN') || null;

    container.innerHTML = `
      ${renderActiveBanner(activeEvent)}
      ${renderToolbar()}
      ${renderTable()}
    `;

    if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 30);
  }

  function renderActiveBanner(activeEvent) {
    if (!activeEvent) {
      return `
        <div style="background:rgba(148,163,184,0.08);border:1px dashed #64748b;border-radius:8px;padding:12px 16px;margin-bottom:1rem;font-size:0.85rem;color:#94a3b8;">
          ℹ️ No hay evento OPEN actualmente. El próximo SQ se creará automáticamente el jueves 00:00 UTC.
        </div>`;
    }

    const typeLabelTxt = activeEvent.type === 'BLACK_MARKET' ? 'BLACK MARKET' : 'SQUADRON';
    const colorClass = activeEvent.type === 'BLACK_MARKET' ? '#e74c3c' : '#3498db';

    return `
      <div style="background:rgba(46,204,113,0.08);border:1px solid rgba(46,204,113,0.4);border-radius:8px;padding:12px 16px;margin-bottom:1rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:0.72rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">
            🟢 EVENTO ACTIVO
          </div>
          <div style="font-size:1rem;color:#f8fafc;font-weight:700;margin-top:2px;">
            ${escapeHTML(activeEvent.name)}
          </div>
          <div style="font-size:0.78rem;color:#cbd5e1;margin-top:2px;">
            <span style="color:${colorClass};">${typeLabelTxt}</span>
            · Cierra: ${fmtDate(activeEvent.end_date)}
          </div>
        </div>
        <button onclick="window.adminEventsCloseActive('${activeEvent.id}')"
                class="btn-danger"
                style="font-size:0.8rem;background:#e74c3c;border-color:#c0392b;color:#fff;">
          🔒 Cerrar evento
        </button>
      </div>`;
  }

  function renderToolbar() {
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:1rem;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <select onchange="window.adminEventsFilterType(this.value)" style="background:#0f172a;border:1px solid #334155;color:#f8fafc;border-radius:6px;padding:6px 10px;font-size:0.85rem;">
            <option value="" ${!state.filterType ? 'selected' : ''}>Todos los tipos</option>
            <option value="SQUADRON" ${state.filterType === 'SQUADRON' ? 'selected' : ''}>✈️ Squadron</option>
            <option value="BLACK_MARKET" ${state.filterType === 'BLACK_MARKET' ? 'selected' : ''}>⚡ Black Market</option>
          </select>
          <select onchange="window.adminEventsFilterStatus(this.value)" style="background:#0f172a;border:1px solid #334155;color:#f8fafc;border-radius:6px;padding:6px 10px;font-size:0.85rem;">
            <option value="" ${!state.filterStatus ? 'selected' : ''}>Todos los estados</option>
            <option value="OPEN" ${state.filterStatus === 'OPEN' ? 'selected' : ''}>🟢 OPEN</option>
            <option value="SCHEDULED" ${state.filterStatus === 'SCHEDULED' ? 'selected' : ''}>🟡 SCHEDULED</option>
            <option value="CLOSED" ${state.filterStatus === 'CLOSED' ? 'selected' : ''}>⚫ CLOSED</option>
            <option value="CANCELLED" ${state.filterStatus === 'CANCELLED' ? 'selected' : ''}>🔴 CANCELLED</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;">
          <button onclick="window.adminEventsReload()" class="btn-secondary" style="font-size:0.85rem;">
            🔄 Actualizar
          </button>
          <button onclick="window.adminEventsOpenCreateModal()" class="btn-primary" style="font-size:0.85rem;">
            ➕ Crear evento
          </button>
        </div>
      </div>`;
  }

  function renderTable() {
    if (state.filtered.length === 0) {
      return `
        <div style="text-align:center;padding:2rem;color:#94a3b8;">
          No hay eventos que coincidan con los filtros seleccionados.
        </div>`;
    }

    const rows = state.filtered.map(ev => {
      const isOpen = ev.status === 'OPEN';
      const typeTxt = typeLabel(ev.type);
      const typeColor = ev.type === 'BLACK_MARKET' ? '#e74c3c' : '#3498db';

      return `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.1);">
          <td style="padding:10px 8px;">
            <span style="color:${typeColor};font-weight:600;font-size:0.85rem;">${typeTxt}</span>
          </td>
          <td style="padding:10px 8px;font-weight:600;color:#f8fafc;font-size:0.85rem;">
            ${escapeHTML(ev.name || ev.id)}
          </td>
          <td style="padding:10px 8px;">${statusBadge(ev.status)}</td>
          <td style="padding:10px 8px;font-size:0.8rem;color:#cbd5e1;">${fmtDate(ev.start_date)}</td>
          <td style="padding:10px 8px;font-size:0.8rem;color:#cbd5e1;">${fmtDate(ev.end_date)}</td>
          <td style="padding:10px 8px;text-align:center;">
            ${isOpen
              ? `<button onclick="window.adminEventsCloseActive('${ev.id}')" class="btn-danger" style="font-size:0.75rem;padding:3px 10px;background:#e74c3c;border-color:#c0392b;color:#fff;">🔒 Cerrar</button>`
              : (ev.status === 'SCHEDULED'
                  ? `<button onclick="window.adminEventsActivate('${ev.id}', '${escapeHTML(ev.name || '')}')" class="btn-primary" style="font-size:0.75rem;padding:3px 10px;background:#1b4d3e;border-color:#2ecc71;color:#2ecc71;">▶️ Activar</button>`
                  : `<span style="font-size:0.72rem;color:#64748b;font-style:italic;">—</span>`)
            }
          </td>
        </tr>`;
    }).join('');

    return `
      <div style="overflow-x:auto;">
        <table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.85rem;">
          <thead>
            <tr style="border-bottom:1px solid rgba(148,163,184,0.25);text-align:left;">
              <th style="padding:10px 8px;width:90px;">Tipo</th>
              <th style="padding:10px 8px;">Nombre</th>
              <th style="padding:10px 8px;width:130px;">Estado</th>
              <th style="padding:10px 8px;width:150px;">Inicio</th>
              <th style="padding:10px 8px;width:150px;">Cierre</th>
              <th style="padding:10px 8px;width:110px;text-align:center;">Acciones</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="text-align:right;font-size:0.75rem;color:#64748b;margin-top:8px;">
        Mostrando ${state.filtered.length} de ${state.events.length} evento(s)
      </div>`;
  }

  // ============================================================
  // 4. ACCIONES
  // ============================================================

  async function closeActive(eventId) {
    if (!confirm('¿Confirmas cerrar este evento?\n\nEl evento pasará a CLOSED y no aceptará más participaciones.')) return;

    const res = await apiEventsV2ChangeStatus(eventId, 'CLOSED');
    if (!res.success) {
      if (typeof showToast === 'function') showToast('❌ ' + (res.error || 'Error al cerrar'), 'error');
      return;
    }
    if (typeof showToast === 'function') showToast('✅ Evento cerrado', 'success');
    await loadAdminEventsV2();
  }

  async function activate(eventId, eventName) {
    const currentActive = state.events.find(ev => ev.status === 'OPEN');
    let msg = `¿Confirmas ACTIVAR "${eventName}"?`;
    if (currentActive && currentActive.id !== eventId) {
      msg += `\n\n⚠️ Esto CERRARÁ automáticamente el evento activo:\n${currentActive.name}`;
    }

    if (!confirm(msg)) return;

    const res = await apiEventsV2ChangeStatus(eventId, 'OPEN');
    if (!res.success) {
      if (typeof showToast === 'function') showToast('❌ ' + (res.error || 'Error al activar'), 'error');
      return;
    }
    if (typeof showToast === 'function') showToast('✅ Evento activado', 'success');
    await loadAdminEventsV2();
  }

  // ============================================================
  // 5. MODAL CREAR EVENTO (delegado a componente HTML)
  // ============================================================

  function openCreateModal() {
    const modal = document.getElementById('adminEventCreateModal');
    if (!modal) {
      if (typeof showToast === 'function') showToast('⚠️ Modal de creación no disponible', 'warning');
      return;
    }
    // Reset
    const form = document.getElementById('adminEventCreateForm');
    if (form) form.reset();
    const typeSelect = document.getElementById('evCreateType');
    if (typeSelect) typeSelect.value = 'SQUADRON';
    onTypeChange();
    if (typeof showModal === 'function') showModal('adminEventCreateModal');
  }

  function onTypeChange() {
    const type = document.getElementById('evCreateType')?.value || 'SQUADRON';
    const sqBlock = document.getElementById('evCreateSqFields');
    const bmBlock = document.getElementById('evCreateBmFields');
    if (sqBlock) sqBlock.style.display = type === 'SQUADRON' ? 'block' : 'none';
    if (bmBlock) bmBlock.style.display = type === 'BLACK_MARKET' ? 'block' : 'none';
  }

  async function submitCreate() {
    const type = document.getElementById('evCreateType')?.value;
    const name = document.getElementById('evCreateName')?.value?.trim();
    const start = document.getElementById('evCreateStart')?.value;
    const end = document.getElementById('evCreateEnd')?.value;

    if (!type || !name || !start) {
      if (typeof showToast === 'function') showToast('⚠️ Completá tipo, nombre y fecha de inicio', 'warning');
      return;
    }

    const startIso = new Date(start).toISOString();
    const endIso = end ? new Date(end).toISOString() : null;

    let res;
    if (type === 'BLACK_MARKET') {
      const aircraftId = document.getElementById('evCreateBmAircraftId')?.value?.trim() || null;
      const aircraftName = document.getElementById('evCreateBmAircraftName')?.value?.trim() || null;
      const basePrice = parseInt(document.getElementById('evCreateBmBasePrice')?.value, 10) || 500;
      const maxDiscount = parseInt(document.getElementById('evCreateBmMaxDiscount')?.value, 10) || 250;

      const payload = {
        name,
        start_date: startIso,
        end_date: endIso,
        status: 'SCHEDULED',
        metadata: {
          aircraft_id: aircraftId,
          aircraft_name: aircraftName,
          base_price_shards: basePrice,
          max_discount_shards: maxDiscount,
          max_points: 250,
          discount_per_point: 0.2,
          duration_days: 5
        }
      };
      res = await apiEventsV2BmCreate(payload);
    } else {
      const targetMembers = parseInt(document.getElementById('evCreateSqTargetMembers')?.value, 10) || 0;
      const targetTokens = parseInt(document.getElementById('evCreateSqTargetTokens')?.value, 10) || 0;

      const payload = {
        type: 'SQUADRON',
        name,
        start_date: startIso,
        end_date: endIso,
        status: 'SCHEDULED',
        metadata: {
          target_members: targetMembers,
          target_tokens: targetTokens,
          min_tokens_required: 175
        }
      };
      res = await apiEventsV2Create(payload);
    }

    if (!res.success) {
      if (typeof showToast === 'function') showToast('❌ ' + (res.error || 'Error al crear evento'), 'error');
      return;
    }

    if (typeof showToast === 'function') showToast('✅ Evento creado', 'success');
    if (typeof closeModal === 'function') closeModal('adminEventCreateModal');
    await loadAdminEventsV2();
  }

  // ============================================================
  // EXPOSICIÓN GLOBAL
  // ============================================================

  window.adminEventsLoad = loadAdminEventsV2;
  window.adminEventsReload = loadAdminEventsV2;
  window.adminEventsFilterType = setFilterType;
  window.adminEventsFilterStatus = setFilterStatus;
  window.adminEventsCloseActive = closeActive;
  window.adminEventsActivate = activate;
  window.adminEventsOpenCreateModal = openCreateModal;
  window.adminEventsOnTypeChange = onTypeChange;
  window.adminEventsSubmitCreate = submitCreate;

  console.log('✅ [AdminEvents] Módulo admin-events.js cargado (F4.3)');
})();
