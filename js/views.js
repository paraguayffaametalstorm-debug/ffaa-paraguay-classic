/**
 * PARAGUAY-FFAA | METALSTORM v2.0 - Gestión de Vistas SPA
 * ✅ SINCRONIZADO CON NUEVA BD
 * ✅ v3.1 — Exportación de reportes PNG via Canvas
 */

// IDs de vistas principales
window.escapeHTML = function(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
const escapeHTML = window.escapeHTML;

const VIEWS = {
  DASHBOARD:        'appView',
  PERFORMANCE:      'performanceForm',
  PLANES:           'planesView',
  HISTORIAL:        'historialView',
  PROFILE:          'profileView',
  NORMATIVAS:       'normativasView',
  ADMIN:            'adminPanel',
  ALL_PERFORMANCES: 'allPerformancesView',
  SETTINGS:         'settingsView',
  EXPORT:           'exportView'
};

const VIEW_ALIASES = {
  'dashboard':        VIEWS.DASHBOARD,
  'dashboardView':    VIEWS.DASHBOARD,
  'app':              VIEWS.DASHBOARD,
  'appView':          VIEWS.DASHBOARD,
  'performance':      VIEWS.PERFORMANCE,
  'performanceForm':  VIEWS.PERFORMANCE,
  'planes':           VIEWS.PLANES,
  'planesView':       VIEWS.PLANES,
  'hangar':           VIEWS.PLANES,
  'historial':        VIEWS.HISTORIAL,
  'historialView':    VIEWS.HISTORIAL,
  'profile':          VIEWS.PROFILE,
  'profileView':      VIEWS.PROFILE,
  'normativas':       VIEWS.NORMATIVAS,
  'normativasView':   VIEWS.NORMATIVAS,
  'admin':            VIEWS.ADMIN,
  'adminPanel':       VIEWS.ADMIN,
  'adminView':        VIEWS.ADMIN,
  'all-performances': VIEWS.ALL_PERFORMANCES,
  'allPerformances':  VIEWS.ALL_PERFORMANCES,
  'allPerformancesView': VIEWS.ALL_PERFORMANCES,
  'settings':         VIEWS.SETTINGS,
  'settingsView':     VIEWS.SETTINGS,
  'help':             'helpView',
  'helpView':         'helpView',
  'owner':            'ownerPanelView',
  'ownerPanel':       'ownerPanelView',
  'ownerPanelView':   'ownerPanelView',
  'export':           'exportView',
  'exportView':       'exportView'
};

// Mostrar una vista específica
function showView(viewId) {
  const resolvedId = VIEW_ALIASES[viewId] || viewId;
  let targetView = document.getElementById(resolvedId);

  // Si los componentes aún no terminaron de inyectarse en el DOM, reintentar tras breve espera
  if (!targetView) {
    const dashboardEl = document.getElementById(VIEWS.DASHBOARD);
    if (!dashboardEl) {
      // Las plantillas HTML aún se están inyectando en viewsContainer
      setTimeout(() => showView(viewId || VIEWS.DASHBOARD), 100);
      return;
    }
    // Si la vista solicitada no existe, fallback al Dashboard
    targetView = dashboardEl;
  }

  document.querySelectorAll('.view').forEach(view => {
    view.style.display = 'none';
  });
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.remove('show');
  });
  
  // Cerrar drawer lateral al cambiar de vista si está abierto
  if (typeof closeMobileDrawer === 'function') {
    closeMobileDrawer();
  }

  const finalId = targetView.id;
  targetView.style.display = 'block';
  window.currentActiveView = finalId;
  updateActiveMenuButton(finalId);
  loadViewData(finalId);
  if (typeof refreshLucideIcons === 'function') {
    setTimeout(refreshLucideIcons, 50);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateActiveMenuButton(activeViewId) {
  // Desktop Menu Tabs
  document.querySelectorAll('.nav-menu button, .desktop-nav-menu button').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.querySelector(`.nav-menu button[onclick*="${activeViewId}"], .desktop-nav-menu button[onclick*="${activeViewId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // Mobile Bottom Navigation Items
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === activeViewId);
  });

  // Mobile Side Drawer Items
  document.querySelectorAll('.drawer-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === activeViewId);
  });
}

// ========== GESTIÓN DE SIDE DRAWER MÓVIL ==========
function toggleMobileDrawer() {
  const drawer = document.getElementById('mobileSideDrawer');
  const isOpen = drawer && drawer.classList.contains('open');
  if (isOpen) {
    closeMobileDrawer();
  } else {
    openMobileDrawer();
  }
}

function openMobileDrawer() {
  const drawer = document.getElementById('mobileSideDrawer');
  const overlay = document.getElementById('mobileDrawerOverlay');
  if (drawer) {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  if (overlay) {
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
  }
  document.body.classList.add('drawer-open');
}

function closeMobileDrawer() {
  const drawer = document.getElementById('mobileSideDrawer');
  const overlay = document.getElementById('mobileDrawerOverlay');
  if (drawer) {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('drawer-open');
}

// Exponer globalmente para eventos onclick
window.toggleMobileDrawer = toggleMobileDrawer;
window.openMobileDrawer   = openMobileDrawer;
window.closeMobileDrawer  = closeMobileDrawer;

function refreshCurrentView() {
  const current = window.currentActiveView || VIEWS.DASHBOARD;
  loadViewData(current);
  showToast('🔄 Datos sincronizados', 'info');
}

function refreshDashboard() {
  loadDashboardData();
  showToast('🔄 Cuadro de mando actualizado', 'info');
}

function loadViewData(viewId) {
  switch(viewId) {
    case VIEWS.DASHBOARD:
      loadDashboardData();
      break;
      
    case VIEWS.PERFORMANCE:
    case 'performanceForm':
      if (typeof initPerformanceForm === 'function') {
        initPerformanceForm();
      } else {
        loadPerformanceForm();
      }
      break;
      
    case VIEWS.PLANES:
      loadPlanesView();
      break;
      
    case VIEWS.HISTORIAL:
      loadHistorial();
      break;
      
    case VIEWS.PROFILE:
      loadPersonalProfile();
      break;
      
    case VIEWS.NORMATIVAS:
      loadNormativas();
      break;
      
    case VIEWS.ADMIN:
      loadAdminPanel();
      break;
      
    case VIEWS.ALL_PERFORMANCES:
      loadAllPerformances();
      break;
      
    case VIEWS.SETTINGS:
      if (typeof loadSettings === 'function') loadSettings();
      break;
      
    case VIEWS.EXPORT:
      loadExportView();
      break;
      
    case 'ownerPanelView':
      if (typeof loadOwnerPanel === 'function') loadOwnerPanel();
      break;
      
    default:
      console.warn(`[METALSTORM] Vista no manejada explícitamente: ${viewId}`);
      break;
  }
}

// ========== DASHBOARD COMPLETO TÁCTICO ==========
async function loadDashboardData() {
  if (!currentUser) return;

  try {
    const [summaryRes, historyRes] = await Promise.all([
      fetch(`${API_BASE}/api/dashboard/summary`, { headers: getAuthHeaders() }).catch(() => ({ ok: false })),
      fetch(`${API_BASE}/api/performances/history`, { headers: getAuthHeaders() }).catch(() => ({ ok: false }))
    ]);

    let summaryData = null;
    let historyData = [];

    if (summaryRes.ok) {
      summaryData = await summaryRes.json();
    }
    if (historyRes.ok) {
      const hData = await historyRes.json();
      historyData = hData.history || hData.performances || [];
    }

    updateDashboardTacticalUI(summaryData, historyData);

  } catch (err) {
    console.error('Error cargando dashboard táctico:', err);
    showToast('❌ Error al cargar métricas del cuadro de mando', 'error');
  }
}

function updateDashboardTacticalUI(summary, history) {
  const user = currentUser;

  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = user.nick || user.email;

  const userRoleEl = document.getElementById('userRole');
  if (userRoleEl) {
    userRoleEl.innerHTML = `<span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span>`;
  }

  const userStatus = (summary?.userStats?.perf_status || user.perf_status || 'VERDE').toUpperCase();
  const userStatusEl = document.getElementById('userStatus');
  if (userStatusEl) {
    userStatusEl.textContent = userStatus;
    userStatusEl.className = `status-badge status-${userStatus.toLowerCase()}`;
  }

  const statusDescEl = document.getElementById('statusDescription');
  if (statusDescEl) {
    statusDescEl.textContent = userStatus === 'VERDE'
      ? 'Cumplimiento operacional óptimo (≥175 tokens)'
      : userStatus === 'NARANJA'
      ? 'Rendimiento en advertencia (130-174 tokens)'
      : userStatus === 'ROJO'
      ? 'Rendimiento crítico (<130 tokens)'
      : 'Inactivo / Falta de conexión militar';
  }

  const avgTokens = summary?.userStats?.avg_tokens || user.avg_tokens || 185;
  const avgTokensEl = document.getElementById('avgTokens');
  if (avgTokensEl) avgTokensEl.textContent = avgTokens;

  const weeksEvaluated = summary?.userStats?.weeks_evaluated || user.weeks_evaluated || (history.length || 12);
  const weeksEvaluatedEl = document.getElementById('weeksEvaluated');
  if (weeksEvaluatedEl) weeksEvaluatedEl.textContent = weeksEvaluated;

  const eventEl = document.getElementById('dashboardEventId');
  if (eventEl) {
    eventEl.textContent = summary?.currentEvent?.id || 'SQUADRON-2026-08';
  }

  const squadAvg = summary?.squadStats?.avg_tokens || 192.4;
  const goalPct = Math.min(100, Math.round((squadAvg / 200) * 100));

  const squadGoalPctEl = document.getElementById('squadGoalPercentage');
  if (squadGoalPctEl) squadGoalPctEl.textContent = `${goalPct}%`;

  const squadGoalBarFill = document.getElementById('squadGoalBarFill');
  if (squadGoalBarFill) squadGoalBarFill.style.width = `${goalPct}%`;

  const squadAvgDisplay = document.getElementById('squadAvgTokensDisplay');
  if (squadAvgDisplay) squadAvgDisplay.textContent = `${squadAvg} tokens`;

  const squadPilotsRegistered = document.getElementById('squadPilotsRegisteredDisplay');
  if (squadPilotsRegistered) {
    const actives = summary?.squadStats?.active_members || 28;
    const total = summary?.squadStats?.total_members || 30;
    squadPilotsRegistered.textContent = `${actives} / ${total}`;
  }

  const topPilots = summary?.topPilots || [];
  renderTopPilotsLeaderboard(topPilots);
  renderTrendChart(history, squadAvg);
}

function renderTopPilotsLeaderboard(pilots) {
  const container = document.getElementById('topPilotsList');
  if (!container) return;

  const medals = ['🥇', '🥈', '🥉', '4°', '5°'];

  container.innerHTML = pilots.slice(0, 5).map((p, idx) => {
    const initials = p.nick ? p.nick.substring(0, 2).toUpperCase() : 'PR';
    const statusClass = (p.perf_status || 'VERDE').toLowerCase();

    return `
      <div class="leaderboard-item">
        <div class="leaderboard-rank rank-${idx + 1}">${medals[idx] || (idx + 1)}</div>
        <div class="leaderboard-avatar">${initials}</div>
        <div class="leaderboard-info">
          <div class="leaderboard-nick">${escapeHTML(p.nick)}</div>
          <div class="leaderboard-role">
            <span class="role-badge role-${p.role || 'MIEMBRO'}" style="font-size:0.65rem;padding:1px 6px;">${p.role || 'MIEMBRO'}</span>
          </div>
        </div>
        <div class="leaderboard-tokens">
          <div class="leaderboard-tokens-val">${p.avg_tokens || 0}</div>
          <span class="status-badge status-${statusClass}" style="font-size:0.65rem;padding:1px 6px;">${p.perf_status || 'VERDE'}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderTrendChart(history, squadAvg) {
  const container = document.getElementById('trendChartPlaceholder');
  if (!container) return;

  const defaultEvents = ['SQ-05', 'SQ-06', 'SQ-07', 'SQ-08'];
  let personalPoints = [178, 185, 192, 188];

  if (history && history.length >= 4) {
    personalPoints = history.slice(0, 4).reverse().map(h => h.tokens || 180);
  } else if (history && history.length > 0) {
    personalPoints = history.map(h => h.tokens || 180);
    while (personalPoints.length < 4) {
      personalPoints.unshift(175);
    }
  }

  const squadPoints = [182, 186, 190, squadAvg || 192];
  const maxVal = 250;
  const minVal = 100;
  const width = 450;
  const height = 180;
  const padX = 40;
  const padY = 25;

  function getY(val) {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return height - padY - ((clamped - minVal) / (maxVal - minVal)) * (height - 2 * padY);
  }

  function getX(idx) {
    return padX + (idx * ((width - 2 * padX) / 3));
  }

  const targetY = getY(175);

  const personalPath = personalPoints.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(val)}`).join(' ');
  const squadPath = squadPoints.map((val, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(val)}`).join(' ');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:100%;overflow:visible;">
      <defs>
        <linearGradient id="personalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0038A8" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#0038A8" stop-opacity="0"/>
        </linearGradient>
      </defs>

      <line x1="${padX}" y1="${targetY}" x2="${width - padX}" y2="${targetY}" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.7"/>
      <text x="${width - padX + 5}" y="${targetY + 4}" fill="#10B981" font-size="10" font-family="'JetBrains Mono', monospace">175</text>

      <path d="${squadPath}" fill="none" stroke="#D4AF37" stroke-width="2" stroke-dasharray="3 3"/>
      ${squadPoints.map((val, idx) => `
        <circle cx="${getX(idx)}" cy="${getY(val)}" r="3.5" fill="#D4AF37"/>
      `).join('')}

      <path d="${personalPath} L ${getX(3)} ${height - padY} L ${getX(0)} ${height - padY} Z" fill="url(#personalGrad)"/>
      <path d="${personalPath}" fill="none" stroke="#38BDF8" stroke-width="3"/>
      ${personalPoints.map((val, idx) => `
        <circle cx="${getX(idx)}" cy="${getY(val)}" r="5" fill="#0038A8" stroke="#38BDF8" stroke-width="2"/>
        <text x="${getX(idx)}" y="${getY(val) - 8}" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="700" font-family="'Rajdhani', sans-serif">${val}</text>
        <text x="${getX(idx)}" y="${height - 6}" text-anchor="middle" fill="#94A3B8" font-size="10" font-family="'Inter', sans-serif">${defaultEvents[idx]}</text>
      `).join('')}
    </svg>
  `;
}

// ========== HISTORIAL (CORREGIDO) ==========
function loadHistorial() {
  if (!currentUser) return;
  fetch(`${API_BASE}/api/performances/my-history`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    const history = Array.isArray(data) ? data : (data.history || data.performances || []);
    displayHistorial(history);
  })
  .catch(err => {
    console.error('Error cargando historial:', err);
    showToast('❌ Error al cargar historial', 'error');
  });
}

function displayHistorial(history) {
  const container = document.getElementById('historialContent');
  if (!container) return;

  const historyArray = Array.isArray(history) ? history : [];

  if (historyArray.length === 0) {
    container.innerHTML = `
<div class="no-results">
<p>📊 Aún no tienes registros de rendimiento</p>
<p>Participa en el próximo evento para generar tu historial</p>
</div>
`;
    return;
  }

  container.innerHTML = historyArray.map(record => `
<div class="historial-item">
<h4>${escapeHTML(record.event_id || 'Sin evento')}</h4>
<p><strong>Tokens:</strong> ${record.tokens ?? 0}</p>
<p><strong>Días conectado:</strong> ${record.days_connected ?? 0}</p>
<p><strong>Estado:</strong> <span class="status-badge status-${(record.status || 'NEGRO').toLowerCase()}">${record.status || 'NEGRO'}</span></p>
<p><strong>Fecha:</strong> ${record.created_at ? new Date(record.created_at).toLocaleDateString() : 'N/A'}</p>
${record.notes ? `<p><strong>Notas:</strong> ${escapeHTML(record.notes)}</p>` : ''}
</div>
`).join('');
}
// ========== FIN HISTORIAL ==========

// ========== FORMULARIO DE RENDIMIENTO ==========
function selectDays(n) {
  document.querySelectorAll('#daysSelectorGroup .day-btn').forEach(function(btn) {
    btn.classList.toggle('active', parseInt(btn.dataset.day) === n);
  });
  const inp = document.getElementById('daysConnected');
  if (inp) inp.value = n;
}

function clampTokens(input) {
  const maxT = (window.currentEvent && window.currentEvent.type === 'BLACK_MARKET') ? 250 : 200;
  if (input.value > maxT) input.value = maxT;
  if (input.value < 0)    input.value = 0;
}

function adaptFormToEventType(eventType) {
  const isBM   = eventType === 'BLACK_MARKET';
  const maxTok = isBM ? 250 : 200;
  const tokHint = document.getElementById('tokensHint');
  if (tokHint) tokHint.textContent = `0 – ${maxTok}`;
  const tokInput = document.getElementById('tokens');
  if (tokInput) { tokInput.max = maxTok; tokInput.placeholder = isBM ? 'Ej: 220' : 'Ej: 185'; }
  const daysHint = document.getElementById('daysHint');
  if (daysHint) daysHint.textContent = isBM
    ? '0 – 5 (Mié · Jue · Vie · Sáb · Dom · Lun)'
    : '0 – 4 (Jue · Vie · Sáb · Dom)';
  const btn5 = document.querySelector('.day-btn-bm');
  if (btn5) btn5.style.display = isBM ? '' : 'none';
  const daysVal = parseInt(document.getElementById('daysConnected')?.value);
  if (!isBM && daysVal > 4) selectDays(4);
}

function onTargetPilotChange() {
  const sel          = document.getElementById('performanceTarget');
  const chip         = document.getElementById('perfUserName');
  const chipEl       = chip ? chip.closest('.pilot-chip') : null;
  const banner       = document.getElementById('targetOverrideBanner');
  const noteAdm      = document.getElementById('policyNoteAdmin');
  const noteNrm      = document.getElementById('policyNoteNormal');
  const notesHintAdm = document.getElementById('notesHintAdmin');
  const notesHintNrm = document.getElementById('notesHintNormal');
  const saveBtn      = document.getElementById('btnSavePerf');
  const isAdmin = sel && sel.value !== 'self';
  const selText = sel ? sel.options[sel.selectedIndex]?.text : '';
  if (chip)    chip.textContent = isAdmin ? selText : (window.currentUser?.nick || '—');
  if (chipEl)  chipEl.classList.toggle('pilot-chip-admin', isAdmin);
  if (banner)       banner.style.display       = isAdmin ? 'flex'   : 'none';
  if (noteAdm)      noteAdm.style.display      = isAdmin ? 'block'  : 'none';
  if (noteNrm)      noteNrm.style.display      = isAdmin ? 'none'   : 'block';
  if (notesHintAdm) notesHintAdm.style.display = isAdmin ? 'inline' : 'none';
  if (notesHintNrm) notesHintNrm.style.display = isAdmin ? 'none'   : 'inline';
  if (saveBtn) saveBtn.textContent = isAdmin
    ? `💾 Registrar para ${selText.split(' ')[0]}`
    : '💾 Guardar Rendimiento';
}

function loadPerformanceForm() {
  if (!currentUser) return;
  const perfUserName = document.getElementById('perfUserName');
  if (perfUserName) perfUserName.textContent = currentUser.nick || currentUser.email;
  const tokens = document.getElementById('tokens');
  if (tokens) tokens.value = '';
  const flewInGroup = document.getElementById('flewInGroup');
  if (flewInGroup) flewInGroup.checked = false;
  const notes = document.getElementById('notes');
  if (notes) notes.value = '';
  const statusEl = document.getElementById('calculatedStatus');
  if (statusEl) statusEl.innerHTML = '<span class="status-badge">-</span>';
  if (typeof selectDays === 'function') selectDays(0);
  const saveBtn = document.getElementById('btnSavePerf');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Guardar Rendimiento'; }
  const isAdmin = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';
  const targetGroup = document.getElementById('performanceTargetGroup');
  if (targetGroup) targetGroup.style.display = isAdmin ? 'block' : 'none';
  if (isAdmin) {
    loadActiveMembers();
  }
  loadOpenEvents();
}

function loadActiveMembers() {
  fetch(`${API_BASE}/api/events/active-members`, { headers: getAuthHeaders() })
  .then(async res => {
    if (!res.ok) {
      const fallback = await fetch(`${API_BASE}/api/admin/members/active`, { headers: getAuthHeaders() });
      if (!fallback.ok) throw new Error(`HTTP ${fallback.status}`);
      return fallback.json();
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error('Response is not JSON');
    }
    return res.json();
  })
  .then(data => {
    const sel = document.getElementById('performanceTarget');
    if (!sel) return;
    sel.innerHTML = '<option value="self">— Mi propio rendimiento —</option>';
    const members = data.activeMembers || data.members || [];
    members.forEach(m => {
      const uid = m.user_id || m.id;
      if (currentUser && (uid === currentUser.user_id || uid === currentUser.id)) return;
      const opt = document.createElement('option');
      opt.value = uid;
      opt.textContent = `${m.nick || m.email} (${m.role || 'MIEMBRO'})`;
      sel.appendChild(opt);
    });
    sel.value = 'self';
    if (typeof onTargetPilotChange === 'function') onTargetPilotChange();
  })
  .catch(err => {
    console.error('Error cargando miembros activos:', err);
  });
}

function loadOpenEvents() {
  fetch(`${API_BASE}/api/events/open`, {
    headers: getAuthHeaders()
  })
  .then(async res => {
    if (!res.ok) {
      const fallback = await fetch(`${API_BASE}/api/events`, { headers: getAuthHeaders() });
      if (!fallback.ok) throw new Error(`HTTP ${fallback.status}`);
      return fallback.json();
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error('Response is not JSON');
    }
    return res.json();
  })
  .then(data => {
    const prev = document.getElementById('windowClosedNotice');
    if (prev) prev.remove();

    const ev = data.event || (data.events && data.events[0]);
    if (ev) {
      const inWin = typeof data.inWindow === 'boolean' ? data.inWindow : Boolean(ev.is_open || ev.status === 'OPEN');
      const winCloseMs = typeof data.windowCloseMs === 'number' ? data.windowCloseMs : 86400000;
      displayEventInfo(ev, inWin, winCloseMs);
      const fieldsEl = document.getElementById('performanceFields');
      if (fieldsEl) {
        if (inWin) {
          fieldsEl.style.display = 'block';
        } else {
          fieldsEl.style.display = 'none';
          renderWindowClosedNotice(ev.type);
        }
      }
    } else {
      const evInfo = document.getElementById('eventInfo');
      if (evInfo) {
        evInfo.innerHTML = `
<div class="black-market-warning">
<p>⚠️ No hay evento abierto actualmente</p>
<p>Espera a que el liderazgo habilite el próximo evento</p>
</div>
`;
      }
      const fieldsEl = document.getElementById('performanceFields');
      if (fieldsEl) fieldsEl.style.display = 'none';
    }
  })
  .catch(err => {
    console.error('Error cargando eventos:', err);
    showToast('❌ Error al cargar eventos', 'error');
  });
}

function msUntilNextWindowOpen() {
  const PY_OFFSET_MS = 4 * 3600 * 1000;
  const nowUtc       = Date.now();
  const nowPY   = new Date(nowUtc - PY_OFFSET_MS);
  const dayPY   = nowPY.getUTCDay();
  const hrPY    = nowPY.getUTCHours();
  const minPY   = nowPY.getUTCMinutes();
  const nowMinPY = hrPY * 60 + minPY;
  const TARGET_MIN = 9 * 60;
  let daysUntilMon = (1 - dayPY + 7) % 7;
  if (daysUntilMon === 0 && nowMinPY >= TARGET_MIN) daysUntilMon = 7;
  const targetPY = new Date(nowPY);
  targetPY.setUTCDate(nowPY.getUTCDate() + daysUntilMon);
  targetPY.setUTCHours(9, 0, 0, 0);
  const targetUtcMs = targetPY.getTime() + PY_OFFSET_MS;
  return Math.max(0, targetUtcMs - nowUtc);
}

function nextWindowOpenLabel() {
  const PY_OFFSET_MS = 4 * 3600 * 1000;
  const targetUtcMs  = Date.now() + msUntilNextWindowOpen();
  const targetDate   = new Date(targetUtcMs);
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  const formatted = targetDate.toLocaleDateString('es-PY', opts);
  return `${formatted} a las 09:00 (PY)`;
}

function renderWindowClosedNotice(eventType) {
  const isBM    = eventType === 'BLACK_MARKET';
  const winDesc = isBM
    ? 'Lunes 17:00 → Miércoles 16:59 (PY)'
    : 'Lunes 09:00 → Jueves 08:59 (PY)';
  const openLabel = nextWindowOpenLabel();

  const notice = document.createElement('div');
  notice.id = 'windowClosedNotice';
  notice.innerHTML = `
<div style="
  margin-top: 14px;
  background: rgba(17, 24, 39, 0.7);
  border: 1.5px solid rgba(99, 110, 130, 0.35);
  border-radius: 12px;
  padding: 18px 20px;
">
  <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
    <span style="font-size:1.3rem;">🔒</span>
    <div>
      <div style="font-weight:700; font-size:0.95rem; color:#e2e8f0;">
        Formulario bloqueado — ventana cerrada
      </div>
      <div style="font-size:0.8rem; color:#718096; margin-top:2px;">
        El período de carga para este evento ya finalizó
      </div>
    </div>
  </div>
  <div style="
    background: rgba(45, 55, 72, 0.5);
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 0.85rem;
    color: #a0aec0;
    line-height: 1.6;
  ">
    <div style="margin-bottom:4px;">
      📅 <strong style="color:#cbd5e0;">Ventana de este evento:</strong>
      <span>${winDesc}</span>
    </div>
    <div>
      🟢 <strong style="color:#68d391;">Próxima apertura:</strong>
      <span style="color:#e2e8f0;">${openLabel}</span>
    </div>
  </div>
  <div id="windowOpenCountdown" style="
    margin-top: 12px;
    text-align: center;
    font-size: 1.5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: #68d391;
    letter-spacing: 1px;
  ">--:--:--</div>
  <div style="text-align:center; font-size:0.75rem; color:#4a5568; margin-top:2px;">
    tiempo hasta apertura de registro
  </div>
</div>
`;

  const eventInfoEl = document.getElementById('eventInfo');
  if (eventInfoEl && eventInfoEl.parentNode) {
    eventInfoEl.parentNode.insertBefore(notice, eventInfoEl.nextSibling);
  }

  if (window._winOpenCountdownInterval) clearInterval(window._winOpenCountdownInterval);
  const targetUtcMs = Date.now() + msUntilNextWindowOpen();

  function tickOpen() {
    const rem = Math.max(0, targetUtcMs - Date.now());
    const el  = document.getElementById('windowOpenCountdown');
    if (el) el.textContent = formatMs(rem);
    if (rem <= 0) {
      clearInterval(window._winOpenCountdownInterval);
      loadOpenEvents();
    }
  }
  tickOpen();
  window._winOpenCountdownInterval = setInterval(tickOpen, 1000);
}

function formatMs(ms) {
  if (ms <= 0) return '0s';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return [d ? `${d}d` : '', h ? `${h}h` : '', m ? `${m}m` : '', s ? `${s}s` : '']
    .filter(Boolean).join(' ') || '0s';
}

function displayEventInfo(event, inWindow, windowCloseMs) {
  currentEvent = event;
  if (typeof adaptFormToEventType === 'function') {
    adaptFormToEventType(event.type);
  }
  const isBM        = event.type === 'BLACK_MARKET';
  const typeLabel   = isBM ? '⚡ BLACK MARKET' : '✈️ SQUADRON';
  const typeClass   = isBM ? 'event-bm' : 'event-sq';
  const startDate = new Date(event.start_date);
  const endDate   = new Date(event.end_date);
  const totalMs   = endDate - startDate;
  const elapsed = inWindow ? Math.max(0, totalMs - windowCloseMs) : totalMs;
  const pct     = inWindow ? Math.min(100, Math.max(4, (elapsed / totalMs) * 100)) : 100;
  const badgeClass = inWindow ? 'win-badge-open'        : 'win-badge-closed';
  const barClass   = inWindow ? 'win-bar-open'          : 'win-bar-closed';
  const pulseClass = inWindow ? 'win-badge-open-pulse'  : 'win-badge-closed-pulse';
  const statusText = inWindow ? '🟢 VENTANA ABIERTA'   : '🔴 VENTANA CERRADA';
  const subText = inWindow
    ? `Cierra el ${endDate.toLocaleDateString('es-PY', { weekday:'long', day:'numeric', month:'short' })} a las ${endDate.toLocaleTimeString('es-PY', { hour:'2-digit', minute:'2-digit' })}`
    : `Próxima apertura: ${nextWindowOpenLabel()}`;
  const countdownLabel = inWindow ? 'Tiempo restante en ventana' : 'Apertura de registro en';

  document.getElementById('eventInfo').innerHTML = `
<div class="card event-card ${typeClass}">
<div class="event-header">
<h4>${event.id}</h4>
<span style="font-size:0.82rem;color:var(--text-muted,#a0aec0);">${typeLabel}</span>
</div>
<div class="win-wrapper">
<div class="win-badge ${badgeClass}">
<div class="win-pulse ${pulseClass}"></div>
<div class="win-badge-inner">
<span class="win-badge-label">${statusText}</span>
<span class="win-badge-sub">${subText}</span>
</div>
</div>
<div class="win-progress-block">
<div class="win-progress-header">
<span class="win-plabel">${countdownLabel}</span>
<span class="win-countdown" id="winCountdown">--:--:--</span>
</div>
<div class="win-track">
<div class="win-fill ${barClass}" id="winFill" style="width:${pct}%">
<div class="win-fill-shine"></div>
</div>
</div>
<div class="win-date-hint">
📅 Registro: ${startDate.toLocaleDateString('es-PY')} → ${endDate.toLocaleDateString('es-PY')}
</div>
</div>
</div>
</div>
`;

  if (window._winCountdownInterval) clearInterval(window._winCountdownInterval);
  const countdownTargetMs = inWindow
    ? endDate.getTime()
    : Date.now() + msUntilNextWindowOpen();

  function tick() {
    const nowMs     = Date.now();
    const remaining = Math.max(0, countdownTargetMs - nowMs);
    const cdEl   = document.getElementById('winCountdown');
    const fillEl = document.getElementById('winFill');
    if (cdEl) cdEl.textContent = formatMs(remaining);
    if (fillEl && inWindow && totalMs > 0) {
      const elapsedNow = Math.max(0, totalMs - remaining);
      const newPct     = Math.min(100, Math.max(4, (elapsedNow / totalMs) * 100));
      fillEl.style.width = newPct + '%';
    }
    if (remaining <= 0) clearInterval(window._winCountdownInterval);
  }
  tick();
  window._winCountdownInterval = setInterval(tick, 1000);
}

// ========== VISTA DE AERONAVES ==========
let allUserPlanes = [];

function loadPlanesView() {
  if (!currentUser) return;
  loadUserPlanes();
  initPlaneLevelSelect();
}

function initPlaneLevelSelect() {
  const sel = document.getElementById('planeLevel');
  if (!sel || sel.options.length > 1) return;
  for (let i = 1; i <= 20; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Nivel ${i}`;
    sel.appendChild(opt);
  }
}

function loadUserPlanes() {
  fetch(`${API_BASE}/api/planes`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    allUserPlanes = data.planes || [];
    displayPlanes(allUserPlanes);
    updatePlanesStats(allUserPlanes);
    populatePlaneFilters(allUserPlanes);
  })
  .catch(err => {
    console.error('Error cargando aeronaves:', err);
    showToast('❌ Error al cargar aeronaves', 'error');
  });
}

function populatePlaneFilters(planes) {
  const types = [...new Set(planes.map(p => p.type).filter(Boolean))];
  const typeFilter = document.getElementById('planeTypeFilter');
  if (typeFilter) {
    typeFilter.innerHTML = '<option value="">Todos</option>';
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      typeFilter.appendChild(opt);
    });
  }
  const levels = [...new Set(planes.map(p => p.nivel))].sort((a, b) => a - b);
  ['minLevelFilter', 'maxLevelFilter'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">-</option>';
    levels.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l; opt.textContent = `Nivel ${l}`;
      sel.appendChild(opt);
    });
  });
}

function displayPlanes(planes) {
  const tbody = document.getElementById('planesTableBody');
  if (!tbody) return;
  if (planes.length === 0) {
    tbody.innerHTML = `
<tr>
<td colspan="9" class="text-center">
<p>No tienes aeronaves registradas</p>
<button onclick="showAddPlaneModal()" class="btn-primary mt-10">➕ Agregar primera aeronave</button>
</td>
</tr>
`;
    return;
  }
  tbody.innerHTML = planes.map(plane => {
    const isUnlocked = (plane.nivel || 1) >= 6;
    const nf = plane.nivel_fuselaje || 0;
    const nm = plane.nivel_motor || 0;
    const na = plane.nivel_avionica || 0;
    const nw = plane.nivel_armas || 0;
    const avgSys = ((nf + nm + na + nw) / 4).toFixed(1);

    let upgradesBadgeHtml = '';
    if (isUnlocked) {
      upgradesBadgeHtml = `
        <div style="display:flex;flex-direction:column;gap:3px;">
          <div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center;">
            <span class="status-badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:0.7rem;padding:1px 5px;" title="Fuselaje">🛡️F:${nf}</span>
            <span class="status-badge" style="background:rgba(251,191,36,0.15);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);font-size:0.7rem;padding:1px 5px;" title="Motor">⚙️M:${nm}</span>
            <span class="status-badge" style="background:rgba(168,85,247,0.15);color:#c084fc;border:1px solid rgba(168,85,247,0.3);font-size:0.7rem;padding:1px 5px;" title="Aviónica">📡A:${na}</span>
            <span class="status-badge" style="background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3);font-size:0.7rem;padding:1px 5px;" title="Armas">🎯W:${nw}</span>
          </div>
          <span style="font-size:0.7rem;color:#94a3b8;">Media subsistemas: <strong style="color:#38bdf8;">${avgSys}/8</strong></span>
        </div>
      `;
    } else {
      upgradesBadgeHtml = `<span style="color:#64748b;font-size:0.75rem;font-style:italic;" title="Desbloquea en Nivel 6">🔒 Bloqueado (Nv 6+)</span>`;
    }

    return `
<tr>
<td data-label="Aeronave"><strong>${plane.model_name || plane.name || plane.avion_id || '-'}</strong></td>
<td data-label="Tipo">${plane.type || '-'}</td>
<td data-label="Nivel">
<span class="status-badge" style="background:rgba(212,175,55,0.2); color:#d4af37; border:1px solid #d4af37;">
Nv. ${plane.nivel}
</span>
</td>
<td data-label="Upgrades 2.0">${upgradesBadgeHtml}</td>
<td data-label="Especial">${plane.especial_nombre || '<span style="color:#666">—</span>'}</td>
<td data-label="Pasiva">${plane.pasiva_nombre || '<span style="color:#666">—</span>'}</td>
<td data-label="Mod 1">${plane.mod1_nombre || plane.mod1_id || '<span style="color:#666">—</span>'}</td>
<td data-label="Mod 2">${plane.mod2_nombre || plane.mod2_id || '<span style="color:#666">—</span>'}</td>
<td data-label="Acciones" style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center;">
<button onclick="openPlaneUpgrades(${plane.id})" class="btn-primary" style="padding:4px 8px; font-size:0.75rem; background:rgba(56,189,248,0.2); border:1px solid #38bdf8; color:#38bdf8;" title="Gestionar Upgrades 2.0"><i data-lucide="wrench" style="width:13px;height:13px;"></i> Upgrades</button>
<button onclick="openAircraftStats(${plane.id})" class="btn-secondary" style="padding:4px 8px; font-size:0.75rem; border-color:var(--blue-telemetry); color:var(--blue-telemetry);" title="Ver Telemetría"><i data-lucide="gauge" style="width:13px;height:13px;"></i> Radar</button>
<button onclick="editPlane(${plane.id})" class="btn-secondary" style="padding:4px 8px; font-size:0.75rem;" title="Editar"><i data-lucide="edit-3" style="width:13px;height:13px;"></i></button>
<button onclick="deletePlane(${plane.id})" class="btn-danger" style="padding:4px 8px; font-size:0.75rem;" title="Eliminar"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
</td>
</tr>
`;
  }).join('');

  if (typeof refreshLucideIcons === 'function') {
    setTimeout(refreshLucideIcons, 30);
  }
}

function updatePlanesStats(planes) {
  const totalEl = document.getElementById('totalPlanes');
  const avgEl   = document.getElementById('avgPlaneLevel');
  const maxEl   = document.getElementById('maxPlaneLevel');
  const specEl  = document.getElementById('planesWithSpecial');
  const upgrEl  = document.getElementById('planesWithUpgrades');

  if (totalEl) totalEl.textContent = planes.length;
  if (planes.length > 0) {
    const sum = planes.reduce((s, p) => s + (parseInt(p.nivel, 10) || 0), 0);
    const avg = sum / planes.length;
    const max = Math.max(...planes.map(p => parseInt(p.nivel, 10) || 0));
    const withSpecial = planes.filter(p => !!p.especial_nombre).length;
    const withUpgrades = planes.filter(p => (parseInt(p.nivel, 10) || 0) >= 6).length;

    if (avgEl)  avgEl.textContent = avg.toFixed(1);
    if (maxEl)  maxEl.textContent = max;
    if (specEl) specEl.textContent = withSpecial;
    if (upgrEl) upgrEl.textContent = withUpgrades;
  } else {
    if (avgEl)  avgEl.textContent = '0';
    if (maxEl)  maxEl.textContent = '0';
    if (specEl) specEl.textContent = '0';
    if (upgrEl) upgrEl.textContent = '0';
  }
}

window.loadPlanes = loadUserPlanes;
window.loadUserPlanes = loadUserPlanes;
window.renderPlanes = displayPlanes;
window.displayPlanes = displayPlanes;
window.updateStats = updatePlanesStats;
window.updatePlanesStats = updatePlanesStats;

function filterPlanes() {
  const search   = (document.getElementById('planeSearch')?.value || '').toLowerCase();
  const type     = document.getElementById('planeTypeFilter')?.value || '';
  const minLvl   = parseInt(document.getElementById('minLevelFilter')?.value) || 0;
  const maxLvl   = parseInt(document.getElementById('maxLevelFilter')?.value) || 999;
  const special  = document.getElementById('specialSkillFilter')?.value || '';
  const passive  = document.getElementById('passiveSkillFilter')?.value || '';
  const upgrOpt  = document.getElementById('upgradesFilter')?.value || '';

  const filtered = allUserPlanes.filter(p => {
    const name = (p.model_name || p.avion_id || '').toLowerCase();
    if (search && !name.includes(search)) return false;
    if (type && p.type !== type) return false;
    if (p.nivel < minLvl || p.nivel > maxLvl) return false;
    if (special === 'with'    && !p.especial_nombre) return false;
    if (special === 'without' &&  p.especial_nombre) return false;
    if (passive === 'with'    && !p.pasiva_nombre)   return false;
    if (passive === 'without' &&  p.pasiva_nombre)   return false;

    if (upgrOpt === 'unlocked' && p.nivel < 6) return false;
    if (upgrOpt === 'locked' && p.nivel >= 6) return false;
    if (upgrOpt === 'upgraded') {
      const totalSys = (p.nivel_fuselaje || 0) + (p.nivel_motor || 0) + (p.nivel_avionica || 0) + (p.nivel_armas || 0);
      if (p.nivel < 6 || totalSys === 0) return false;
    }
    return true;
  });
  displayPlanes(filtered);
  updatePlanesStats(filtered);
}

function applyPlaneFilters() { filterPlanes(); }

// ========== GESTIÓN DE UPGRADES 2.0 ==========
let _currentUpgradesPlane = null;

async function openPlaneUpgrades(planeId) {
  showModal('planeUpgradesModal');
  const pIdInput = document.getElementById('upgradesPlaneId');
  if (pIdInput) pIdInput.value = planeId;

  document.getElementById('upgradesPlaneName').textContent = 'Cargando datos del caza...';
  document.getElementById('upgradesPlaneType').textContent = '—';
  document.getElementById('upgradesPlaneLevel').textContent = '—';

  try {
    const details = typeof getPlaneDetails === 'function' 
      ? await getPlaneDetails(planeId)
      : null;

    if (details) {
      _currentUpgradesPlane = details;
      renderPlaneUpgradesModal(details);
    } else {
      const cached = allUserPlanes.find(p => p.id === planeId);
      if (cached) {
        _currentUpgradesPlane = cached;
        renderPlaneUpgradesModal(cached);
      }
    }
  } catch (err) {
    console.error('Error al abrir modal de Upgrades 2.0:', err);
    showToast('❌ Error al cargar sistemas de la aeronave', 'error');
  }
}

function renderPlaneUpgradesModal(plane) {
  const nameEl  = document.getElementById('upgradesPlaneName');
  const typeEl  = document.getElementById('upgradesPlaneType');
  const lvlEl   = document.getElementById('upgradesPlaneLevel');
  const badgeEl = document.getElementById('upgradesStatusBadge');
  const lockBan = document.getElementById('upgradesLockBanner');
  const gridEl  = document.getElementById('upgradesSystemsGrid');

  const modelName = plane.model_name || plane.name || plane.avion_id || 'Aeronave';
  if (nameEl) nameEl.textContent = modelName;
  if (typeEl) typeEl.textContent = plane.type || 'Caza de Combate';
  if (lvlEl) lvlEl.textContent = `Nv. ${plane.nivel || 1}`;

  const isUnlocked = (plane.nivel || 1) >= 6;

  if (badgeEl) {
    badgeEl.innerHTML = isUnlocked
      ? `<span class="status-badge" style="background:rgba(56,189,248,0.2);color:#38bdf8;border:1px solid #38bdf8;">🟢 UPGRADES 2.0 ACTIVO</span>`
      : `<span class="status-badge" style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid #ef4444;">🔒 BLOQUEADO (&lt; Nv 6)</span>`;
  }

  if (lockBan) lockBan.style.display = isUnlocked ? 'none' : 'block';

  const UPGRADE_COSTS = {
    1: { piezas: 100, avanzadas: 0 },
    2: { piezas: 250, avanzadas: 0 },
    3: { piezas: 500, avanzadas: 10 },
    4: { piezas: 800, avanzadas: 25 },
    5: { piezas: 1200, avanzadas: 50 },
    6: { piezas: 1800, avanzadas: 100 },
    7: { piezas: 2500, avanzadas: 200 },
    8: { piezas: 3500, avanzadas: 350 }
  };

  const systems = [
    { key: 'fuselaje', label: 'Fuselaje', color: '#38bdf8', curLvl: plane.sistemas?.fuselaje?.nivel ?? plane.nivel_fuselaje ?? 0 },
    { key: 'motor',    label: 'Motor',    color: '#fbbf24', curLvl: plane.sistemas?.motor?.nivel ?? plane.nivel_motor ?? 0 },
    { key: 'avionica', label: 'Aviónica', color: '#c084fc', curLvl: plane.sistemas?.avionica?.nivel ?? plane.nivel_avionica ?? 0 },
    { key: 'armas',    label: 'Armas',    color: '#f87171', curLvl: plane.sistemas?.armas?.nivel ?? plane.nivel_armas ?? 0 }
  ];

  systems.forEach(sys => {
    const badge = document.getElementById(`levelBadge_${sys.key}`);
    if (badge) {
      badge.textContent = `Nv. ${sys.curLvl} / 8`;
      badge.style.color = sys.color;
    }

    const matrix = document.getElementById(`matrix_${sys.key}`);
    if (matrix) {
      let slotsHtml = '';
      for (let i = 1; i <= 8; i++) {
        const filled = i <= sys.curLvl;
        const bg = filled ? sys.color : 'rgba(255,255,255,0.1)';
        slotsHtml += `<div style="flex:1;height:6px;border-radius:2px;background:${bg};transition:background 0.3s;" title="Nivel ${i}"></div>`;
      }
      matrix.innerHTML = slotsHtml;
    }

    const costEl = document.getElementById(`cost_${sys.key}`);
    if (costEl) {
      if (sys.curLvl >= 8) {
        costEl.innerHTML = `<span style="color:#22c55e;">✨ NIVEL MÁXIMO</span>`;
      } else if (!isUnlocked) {
        costEl.innerHTML = `<span style="color:#64748b;">Requiere Nivel 6</span>`;
      } else {
        const nextCost = UPGRADE_COSTS[sys.curLvl + 1];
        if (nextCost) {
          costEl.innerHTML = `🔩 ${nextCost.piezas} pzas` + (nextCost.avanzadas > 0 ? ` + 💎 ${nextCost.avanzadas} avanz.` : '');
        } else {
          costEl.textContent = '—';
        }
      }
    }

    const sel = document.getElementById(`select_${sys.key}`);
    if (sel) {
      sel.value = String(sys.curLvl);
      sel.disabled = !isUnlocked;
    }
  });
}

async function applySystemUpgrade(sistema) {
  const planeId = parseInt(document.getElementById('upgradesPlaneId')?.value, 10);
  const sel = document.getElementById(`select_${sistema}`);
  if (!sel || !planeId) return;

  const newLevel = parseInt(sel.value, 10);

  try {
    const updatedPlane = await updatePlaneSystem(planeId, sistema, newLevel);
    
    const pIdx = allUserPlanes.findIndex(p => p.id === planeId);
    if (pIdx !== -1) {
      allUserPlanes[pIdx] = { ...allUserPlanes[pIdx], ...updatedPlane };
    }
    _currentUpgradesPlane = { ..._currentUpgradesPlane, ...updatedPlane };

    renderPlaneUpgradesModal(_currentUpgradesPlane);
    displayPlanes(allUserPlanes);
    updatePlanesStats(allUserPlanes);
  } catch (err) {
    console.error('Error aplicando upgrade de sistema:', err);
  }
}

window.openPlaneUpgrades = openPlaneUpgrades;
window.applySystemUpgrade = applySystemUpgrade;

// ========== ESTADÍSTICAS DE AERONAVE ==========
let _statsRadarChart = null;

async function openAircraftStats(planeId) {
  showModal('aircraftStatsModal');
  document.getElementById('statsAircraftName').textContent  = 'Cargando...';
  document.getElementById('statsModelName').textContent     = '—';
  document.getElementById('statsLevel').textContent         = '—';
  document.getElementById('statsType').textContent          = '—';
  document.getElementById('statsSpecial').textContent       = '—';
  document.getElementById('statsPassive').textContent       = '—';
  document.getElementById('statsTableBody').innerHTML =
    '<tr><td colspan="5" class="loading">⏳ Consultando estadísticas reales...</td></tr>';
  document.getElementById('statsModsGrid').innerHTML =
    '<span style="color:#666;font-style:italic;">Cargando...</span>';
  if (_statsRadarChart) { _statsRadarChart.destroy(); _statsRadarChart = null; }

  try {
    const res = await fetch(`${API_BASE}/api/planes/${planeId}/stats`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    const { plane, labels, stat_keys, units, base, current, base_raw, current_raw } = data;

    document.getElementById('statsAircraftName').textContent = plane.model_name;
    document.getElementById('statsModelName').textContent    = plane.model_name;
    document.getElementById('statsLevel').textContent        = `Nivel ${plane.nivel}`;
    document.getElementById('statsType').textContent         = plane.type || '—';
    document.getElementById('statsSpecial').textContent      = plane.especial || '—';
    document.getElementById('statsPassive').textContent      = plane.pasiva  || '—';
    document.getElementById('currentLevel').textContent      = plane.nivel;

    const upgradesGrid = document.getElementById('statsUpgradesGrid');
    if (upgradesGrid) {
      if (plane.sistemas_desbloqueados || plane.nivel >= 6) {
        upgradesGrid.innerHTML = `
          <span class="mod-badge" style="border-color:rgba(56,189,248,0.4);color:#38bdf8;">
            <strong style="color:#dde6f5;">🛡️ Fuselaje:</strong> Nv. ${plane.nivel_fuselaje || 0}/8
          </span>
          <span class="mod-badge" style="border-color:rgba(251,191,36,0.4);color:#fbbf24;">
            <strong style="color:#dde6f5;">⚙️ Motor:</strong> Nv. ${plane.nivel_motor || 0}/8
          </span>
          <span class="mod-badge" style="border-color:rgba(168,85,247,0.4);color:#c084fc;">
            <strong style="color:#dde6f5;">📡 Aviónica:</strong> Nv. ${plane.nivel_avionica || 0}/8
          </span>
          <span class="mod-badge" style="border-color:rgba(239,68,68,0.4);color:#f87171;">
            <strong style="color:#dde6f5;">🎯 Armas:</strong> Nv. ${plane.nivel_armas || 0}/8
          </span>
        `;
      } else {
        upgradesGrid.innerHTML = '<span style="color:#64748b;font-style:italic;font-size:0.8rem;">🔒 Sistemas Upgrades 2.0 bloqueados (Requiere Nivel 6+)</span>';
      }
    }

    const modsGrid = document.getElementById('statsModsGrid');
    const mods = [];
    if (plane.mod1) mods.push({ label: 'MOD 1', name: plane.mod1, type: plane.mod1_type, lvl: plane.mod1_lvl });
    if (plane.mod2) mods.push({ label: 'MOD 2', name: plane.mod2, type: plane.mod2_type, lvl: plane.mod2_lvl });
    const MOD_TYPE_COLOR = {
      'Agilidad': '#3498db', 'Defensa': '#2ecc71', 'Motor': '#e67e22',
      'Señuelos': '#9b59b6', 'Arma': '#e74c3c'
    };
    modsGrid.innerHTML = mods.length
      ? mods.map(m => {
          const color = MOD_TYPE_COLOR[m.type] || '#8899bb';
          return `<span class="mod-badge" style="border-color:${color}40;color:${color};">
<strong style="color:#dde6f5;">${m.label}:</strong> ${m.name}
${m.type ? `<em style="font-size:0.75rem;opacity:0.7;"> · ${m.type}</em>` : ''}
${m.lvl ? ` <span style="color:#d4af37;">Nv.${m.lvl}</span>` : ''}
</span>`;
        }).join('')
      : '<span style="color:#556688;font-style:italic;">Sin modificaciones equipadas</span>';

    const tbody = document.getElementById('statsTableBody');
    tbody.innerHTML = stat_keys.map((key, i) => {
      const label   = labels[i];
      const unit    = units[key] || '';
      const curVal  = current_raw[key];
      const baseVal = base_raw[key];
      const pct     = Math.round((current[key] / base[key]) * 100);
      const barClr  = pct >= 80 ? '#2ecc71' : pct >= 50 ? '#f39c12' : '#e74c3c';
      return `
<tr>
<td><strong>${label}</strong></td>
<td class="highlight">${curVal.toLocaleString()} <span style="font-size:0.75rem;color:#667799;">${unit}</span></td>
<td style="color:#8899bb;">${baseVal.toLocaleString()} <span style="font-size:0.75rem;">${unit}</span></td>
<td>
<div class="progress-cell">
<div class="mini-bar">
<div class="mini-bar-fill" style="width:${pct}%;background:${barClr};"></div>
</div>
<span style="font-size:0.78rem;color:#8899bb;">${pct}%</span>
</div>
</td>
</tr>`;
    }).join('');

    const ctx = document.getElementById('aircraftRadarChart').getContext('2d');
    _statsRadarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: `Nivel ${plane.nivel}`,
            data:  stat_keys.map(k => current[k]),
            backgroundColor:    'rgba(52, 152, 219, 0.20)',
            borderColor:        '#3498db',
            borderWidth:        2.5,
            pointBackgroundColor: '#3498db',
            pointBorderColor:    '#0a1432',
            pointBorderWidth:    2,
            pointRadius:         5,
            pointHoverRadius:    7,
          },
          {
            label: 'Nivel 20 (máx)',
            data:  stat_keys.map(k => base[k]),
            backgroundColor:    'rgba(212, 175, 55, 0.09)',
            borderColor:        '#d4af37',
            borderWidth:        2,
            borderDash:         [6, 4],
            pointBackgroundColor: '#d4af37',
            pointBorderColor:    '#0a1432',
            pointBorderWidth:    2,
            pointRadius:         4,
            pointHoverRadius:    6,
          }
        ]
      },
      options: {
        responsive: false,
        animation: { duration: 700, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(5, 15, 40, 0.95)',
            titleColor:      '#d4af37',
            bodyColor:       '#dde6f5',
            borderColor:     'rgba(212,175,55,0.25)',
            borderWidth:     1,
            padding:         10,
            callbacks: {
              title: items => items[0].label,
              label: item => {
                const key     = stat_keys[item.dataIndex];
                const unit    = units[key] || '';
                const rawMap  = item.datasetIndex === 0 ? current_raw : base_raw;
                const rawVal  = rawMap[key];
                const norm    = item.raw;
                return ` ${item.dataset.label}: ${rawVal.toLocaleString()} ${unit}  (${norm}/100)`;
              }
            }
          }
        },
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: {
              stepSize:        25,
              color:           '#445566',
              backdropColor:   'transparent',
              font:            { size: 9 }
            },
            grid:        { color: 'rgba(68,85,102,0.4)' },
            angleLines:  { color: 'rgba(68,85,102,0.4)' },
            pointLabels: {
              color: ctx => {
                const key = stat_keys[ctx.index];
                const pct = current[key] / base[key];
                return pct >= 0.8 ? '#2ecc71' : pct >= 0.5 ? '#f39c12' : '#dde6f5';
              },
              font: { size: 11, weight: '600' }
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('Error stats aeronave:', err);
    document.getElementById('statsAircraftName').textContent = 'Error';
    document.getElementById('statsTableBody').innerHTML =
      `<tr><td colspan="5" class="loading" style="color:#e74c3c;">❌ ${err.message}</td></tr>`;
    showToast('❌ Error al cargar estadísticas: ' + err.message, 'error');
  }
}

function resetPlaneFilters() {
  ['planeSearch'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['planeTypeFilter','minLevelFilter','maxLevelFilter','specialSkillFilter','passiveSkillFilter','upgradesFilter']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  displayPlanes(allUserPlanes);
  updatePlanesStats(allUserPlanes);
}

function showAddPlaneModal() {
  const hiddenId = document.getElementById('editingPlaneId');
  if (hiddenId) hiddenId.value = '';
  const title = document.getElementById('addPlaneModalTitle');
  if (title) title.textContent = '➕ Agregar Nuevo Avión';
  const modelSel = document.getElementById('planeModel');
  if (modelSel) {
    modelSel.disabled = false;
    modelSel.removeAttribute('title');
    modelSel.style.opacity  = '';
    modelSel.style.cursor   = '';
    modelSel.value = '';
  }
  ['planeLevel','mod1Level','mod2Level'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['formNivelFuselaje','formNivelMotor','formNivelAvionica','formNivelArmas'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '0';
  });
  const upGrp = document.getElementById('formUpgradesGroup');
  if (upGrp) upGrp.style.display = 'none';

  ['specialSkill','passiveSkill'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.disabled = true; el.innerHTML = `<option value="">${id === 'specialSkill' ? '-- Requiere Nivel 8+ --' : '-- Requiere Nivel 12+ --'}</option>`; }
  });
  const mod1El = document.getElementById('mod1');
  if (mod1El) { mod1El.disabled = true; mod1El.innerHTML = '<option value="">-- Requiere Nivel 16+ --</option>'; }
  const mod2El = document.getElementById('mod2');
  if (mod2El) { mod2El.disabled = true; mod2El.innerHTML = '<option value="">-- Requiere Nivel 20 --</option>'; }
  const m1lv = document.getElementById('mod1Level'); if (m1lv) m1lv.disabled = true;
  const m2lv = document.getElementById('mod2Level'); if (m2lv) m2lv.disabled = true;
  const lockNote = document.getElementById('planeModelLockNote');
  if (lockNote) lockNote.style.display = 'none';
  showModal('addPlaneModal');
  initPlaneLevelSelect();
  if (typeof loadPlaneModels === 'function') loadPlaneModels();
  if (typeof loadPlaneMods   === 'function') loadPlaneMods();
}

function editPlane(planeId) {
  const plane = allUserPlanes.find(p => p.id === planeId);
  if (!plane) { showToast('❌ Aeronave no encontrada', 'error'); return; }
  const hiddenId = document.getElementById('editingPlaneId');
  if (hiddenId) hiddenId.value = planeId;
  const title = document.getElementById('addPlaneModalTitle');
  if (title) title.textContent = '✏️ Editar Aeronave';
  ['planeLevel','mod1Level','mod2Level'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  showModal('addPlaneModal');
  initPlaneLevelSelect();
  Promise.all([
    typeof loadPlaneModels === 'function' ? loadPlaneModels() : Promise.resolve(),
    typeof loadPlaneMods   === 'function' ? loadPlaneMods()   : Promise.resolve()
  ]).then(() => {
    const modelSel = document.getElementById('planeModel');
    if (modelSel) {
      modelSel.value    = plane.avion_id || '';
      modelSel.disabled = true;
      modelSel.title    = 'El modelo no puede cambiarse. Para cambiar de modelo, elimina este avión y crea uno nuevo.';
      modelSel.style.opacity = '0.65';
      modelSel.style.cursor  = 'not-allowed';
    }
    const lockNote = document.getElementById('planeModelLockNote');
    if (lockNote) lockNote.style.display = 'block';
    const lvlSel = document.getElementById('planeLevel');
    if (lvlSel) lvlSel.value = plane.nivel || '';
    if (typeof loadPlaneSkillOptions === 'function') loadPlaneSkillOptions(false);
    if (typeof loadPlaneSkills       === 'function') loadPlaneSkills();
    const setSel = (id, val) => {
      if (val === undefined || val === null) return;
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setSel('specialSkill', plane.especial_nombre);
    setSel('passiveSkill', plane.pasiva_nombre);
    setSel('mod1',         plane.mod1_id);
    setSel('mod1Level',    plane.mod1_lvl);
    setSel('mod2',         plane.mod2_id);
    setSel('mod2Level',    plane.mod2_lvl);

    setSel('formNivelFuselaje', plane.nivel_fuselaje || 0);
    setSel('formNivelMotor',    plane.nivel_motor || 0);
    setSel('formNivelAvionica', plane.nivel_avionica || 0);
    setSel('formNivelArmas',    plane.nivel_armas || 0);

    const upGrp = document.getElementById('formUpgradesGroup');
    if (upGrp) upGrp.style.display = (plane.nivel || 1) >= 6 ? 'block' : 'none';
  });
}

function exportPlanesXLSX() {
  if (!allUserPlanes || allUserPlanes.length === 0) {
    showToast('⚠️ No hay aeronaves registradas para exportar', 'warning');
    return;
  }

  const exportData = allUserPlanes.map(p => ({
    'ID': p.id,
    'Aeronave': p.model_name || p.name || p.avion_id || '-',
    'Tipo': p.type || '-',
    'Nivel General': p.nivel || 1,
    'Upgrades 2.0 Desbloqueado': (p.nivel || 1) >= 6 ? 'SÍ' : 'NO',
    'Nivel Fuselaje': (p.nivel || 1) >= 6 ? (p.nivel_fuselaje || 0) : 'Bloqueado',
    'Nivel Motor': (p.nivel || 1) >= 6 ? (p.nivel_motor || 0) : 'Bloqueado',
    'Nivel Aviónica': (p.nivel || 1) >= 6 ? (p.nivel_avionica || 0) : 'Bloqueado',
    'Nivel Armas': (p.nivel || 1) >= 6 ? (p.nivel_armas || 0) : 'Bloqueado',
    'Media Subsistemas': (p.nivel || 1) >= 6 ? (((p.nivel_fuselaje || 0) + (p.nivel_motor || 0) + (p.nivel_avionica || 0) + (p.nivel_armas || 0)) / 4).toFixed(1) : '-',
    'Habilidad Especial': p.especial_nombre || 'Ninguna',
    'Habilidad Pasiva': p.pasiva_nombre || 'Ninguna',
    'Módulo 1': p.mod1_nombre || p.mod1_id || 'Ninguno',
    'Nivel Mod 1': p.mod1_lvl || '-',
    'Módulo 2': p.mod2_nombre || p.mod2_id || 'Ninguno',
    'Nivel Mod 2': p.mod2_lvl || '-'
  }));

  if (typeof XLSX !== 'undefined') {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hangar_Flota");
    XLSX.writeFile(wb, `Flota_Aeronaves_Upgrades2_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('✅ Flota exportada a Excel (.xlsx)', 'success');
  } else {
    exportToCSV(exportData, `Flota_Aeronaves_Upgrades2_${new Date().toISOString().split('T')[0]}`);
  }
}
window.exportPlanesXLSX = exportPlanesXLSX;

// ========== EXPORTACIÓN DE REPORTES PNG ==========
// (El resto del código de exportación permanece igual)
// ========== MODALES ==========
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

function showToast(message, type = 'info') {
  console.log(`[${type}] ${message}`);
  const toastContainer = document.getElementById('toastContainer');
  if (toastContainer) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('authToken') || localStorage.getItem('tempToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}
window.getAuthHeaders = getAuthHeaders;

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('authToken');
  if (token) {
    fetch(`${API_BASE}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        window.currentUser = data.user;
        updateViewStats();
        showView(VIEWS.DASHBOARD);
      }
    })
    .catch(err => {
      console.error('Error validando token:', err);
      localStorage.removeItem('authToken');
      showLoginModal();
    });
  } else {
    showLoginModal();
  }

  document.querySelectorAll('.nav-menu button').forEach(button => {
    button.addEventListener('click', function() {
      document.querySelectorAll('.nav-menu button').forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      setTimeout(updateViewStats, 100);
    });
  });
});

function updateViewStats() {
  const currentView = document.querySelector('.view[style*="display: block"]');
  if (!currentView) return;
  const viewId = currentView.id;
  switch(viewId) {
    case 'appView':             loadDashboardData();    break;
    case 'allPerformancesView': loadAllPerformances();  break;
    case 'planesView':          loadUserPlanes();        break;
    case 'historialView':       loadHistorial();         break;
    case 'normativasView':      loadNormativas();        break;
    case 'adminPanel':          loadAdminPanel();        break;
    case 'profileView':         loadPersonalProfile();  break;
    case 'settingsView':
      if (typeof loadSettings === 'function') loadSettings();
      break;
    case 'ownerPanelView':      loadOwnerPanel();        break;
    case 'exportView':          loadExportView();        break;
  }
}