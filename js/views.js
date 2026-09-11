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

/**
 * Obtener la clase CSS según el tipo de avión
 * @param {string} tipo - Tipo del avión (Ligero, Mediano, Pesado, Interceptor, Ataque)
 * @returns {string} - Clase CSS (light, medium, heavy, interceptor, attack)
 */
function getTypeClass(tipo) {
  const map = {
    'Ligero': 'light',
    'Mediano': 'medium',
    'Pesado': 'heavy',
    'Interceptor': 'interceptor',
    'Ataque': 'attack',
    'Light': 'light',
    'Medium': 'medium',
    'Heavy': 'heavy',
    'Attack': 'attack'
  };
  if (tipo && map[tipo]) return map[tipo];
  if (tipo) {
    const t = String(tipo).toLowerCase();
    if (t.includes('liger') || t.includes('light')) return 'light';
    if (t.includes('pesad') || t.includes('heavy')) return 'heavy';
    if (t.includes('intercept')) return 'interceptor';
    if (t.includes('ataque') || t.includes('attack')) return 'attack';
    if (t.includes('median') || t.includes('medium')) return 'medium';
  }
  return map[tipo] || 'medium';
}

/**
 * Obtener el color HEX según el tipo de avión
 * @param {string} tipo - Tipo del avión
 * @returns {string} - Color HEX
 */
function getTypeColor(tipo) {
  const map = {
    'Ligero': '#9452de',
    'Mediano': '#d38039',
    'Pesado': '#c54842',
    'Interceptor': '#2e92ce',
    'Ataque': '#2ba694',
    'Light': '#9452de',
    'Medium': '#d38039',
    'Heavy': '#c54842',
    'Attack': '#2ba694'
  };
  if (tipo && map[tipo]) return map[tipo];
  const cls = getTypeClass(tipo);
  const colorMap = {
    'light': '#9452de',
    'medium': '#d38039',
    'heavy': '#c54842',
    'interceptor': '#2e92ce',
    'attack': '#2ba694'
  };
  return colorMap[cls] || '#6B7280';
}

/**
 * Obtener el ícono según el tipo de avión
 * @param {string} tipo - Tipo del avión
 * @returns {string} - Emoji del tipo
 */
function getTypeIcon(tipo) {
  const map = {
    'Ligero': '🟣',
    'Mediano': '🟠',
    'Pesado': '🔴',
    'Interceptor': '🔵',
    'Ataque': '🟢',
    'Light': '🟣',
    'Medium': '🟠',
    'Heavy': '🔴',
    'Attack': '🟢'
  };
  if (tipo && map[tipo]) return map[tipo];
  const cls = getTypeClass(tipo);
  const iconMap = {
    'light': '🟣',
    'medium': '🟠',
    'heavy': '🔴',
    'interceptor': '🔵',
    'attack': '🟢'
  };
  return iconMap[cls] || '⚪';
}

// Exponer globalmente
window.getTypeClass = getTypeClass;
window.getTypeColor = getTypeColor;
window.getTypeIcon = getTypeIcon;

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
  EXPORT:           'exportView',
  ADMIN_PLANES:     'adminPlaneModels',
  BM_MISSIONS:      'bmMissionsView',
  BM_PROGRESS:      'bmProgressView',
  BM_DISCOUNT:      'bmDiscountView',
  BM_LEADERBOARD:   'bmLeaderboardView',
  BM_PANEL:         'bmPanelView'
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
  'exportView':       'exportView',
  'adminPlaneModels': VIEWS.ADMIN_PLANES,
  'admin-plane-models': VIEWS.ADMIN_PLANES,
  'adminPlaneModelsView': VIEWS.ADMIN_PLANES,
  'planeModels':      VIEWS.ADMIN_PLANES,
  'plane-models':     VIEWS.ADMIN_PLANES,
  'bm':               VIEWS.BM_MISSIONS,
  'bm-missions':      VIEWS.BM_MISSIONS,
  'bmMissions':       VIEWS.BM_MISSIONS,
  'bmMissionsView':   VIEWS.BM_MISSIONS,
  'bm-progress':      VIEWS.BM_PROGRESS,
  'bmProgress':       VIEWS.BM_PROGRESS,
  'bmProgressView':   VIEWS.BM_PROGRESS,
  'bm-discount':      VIEWS.BM_DISCOUNT,
  'bmDiscount':       VIEWS.BM_DISCOUNT,
  'bmDiscountView':   VIEWS.BM_DISCOUNT,
  'bm-leaderboard':   VIEWS.BM_LEADERBOARD,
  'bmLeaderboard':    VIEWS.BM_LEADERBOARD,
  'bmLeaderboardView':VIEWS.BM_LEADERBOARD,
  'bm-panel':         VIEWS.BM_PANEL,
  'bmPanel':          VIEWS.BM_PANEL,
  'bmPanelView':      VIEWS.BM_PANEL,
  'bmAdmin':          VIEWS.BM_PANEL
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
      loadOwnerPanel();
      break;
      
    case VIEWS.ADMIN_PLANES:
    case 'adminPlaneModels':
    case 'adminPlaneModelsView':
      loadAdminPlaneModels();
      break;
      
    case 'help':
    case 'helpView':
      loadHelpView();
      break;

    // Módulo Black Market (v3.7.0)
    case 'bmMissionsView':
    case 'bm':
    case 'bmMissions':
      if (typeof loadBmMissionsView === 'function') loadBmMissionsView();
      break;

    case 'bmProgressView':
    case 'bmProgress':
      if (typeof loadBmProgressView === 'function') loadBmProgressView();
      break;

    case 'bmDiscountView':
    case 'bmDiscount':
      if (typeof loadBmDiscountView === 'function') loadBmDiscountView();
      break;

    case 'bmLeaderboardView':
    case 'bmLeaderboard':
      if (typeof loadBmLeaderboardView === 'function') loadBmLeaderboardView();
      break;

    case 'bmPanelView':
    case 'bmPanel':
      if (typeof loadBmPanelView === 'function') loadBmPanelView();
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
  if (typeof window.selectDays === 'function' && window.selectDays !== selectDays) {
    return window.selectDays(n);
  }
  document.querySelectorAll('#daysSelectorGroup .day-btn, .day-btn').forEach(function(btn) {
    const btnDay = parseInt(btn.dataset.day || btn.dataset.days || btn.textContent.trim(), 10);
    btn.classList.toggle('active', btnDay === n);
  });
  const inp = document.getElementById('daysConnected') || document.getElementById('daysConnectedInput');
  if (inp) inp.value = n;
  if (typeof window.updateCalculatedStatus === 'function') {
    window.updateCalculatedStatus();
  }
}

function clampTokens(input) {
  if (typeof window.clampTokens === 'function' && window.clampTokens !== clampTokens) {
    return window.clampTokens(input);
  }
  if (!input) return;
  const maxT = (window.currentEvent && (window.currentEvent.type === 'BLACK_MARKET' || window.currentEvent.type === 'BM')) ? 250 : 200;
  if (input.value === '') return;
  let val = parseInt(input.value, 10);
  if (isNaN(val)) return;
  const rounded = Math.round(val / 5) * 5;
  const clamped = Math.min(Math.max(rounded, 0), maxT);
  input.value = clamped;
  if (typeof window.autoCalculateDays === 'function') {
    const d = window.autoCalculateDays(clamped);
    selectDays(d);
  }
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

function getWeekNumber(date) {
  if (!date) return '01';
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const diff = (d - startOfYear + (startOfYear.getTimezoneOffset() - d.getTimezoneOffset()) * 60000) / 86400000;
  return String(Math.ceil((diff + startOfYear.getDay() + 1) / 7)).padStart(2, '0');
}

function formatEventTitle(event) {
  if (!event) return 'Sin evento activo';
  const startDate = event.start_date ? new Date(event.start_date) : new Date();
  const year = startDate.getFullYear();
  const month = String(startDate.getMonth() + 1).padStart(2, '0');
  const weekNum = getWeekNumber(startDate);
  const isBM = event.type === 'BLACK_MARKET' || event.type === 'BM';
  const typeCode = isBM ? 'BM' : 'SQ';
  return `${year}-${month} · SEM ${weekNum} - ${typeCode}`;
}

function loadPerformanceForm() {
  const user = currentUser || window.currentUser;
  if (!user) return;
  const perfUserName = document.getElementById('perfUserName');
  if (perfUserName) perfUserName.textContent = user.nick || user.email || 'Piloto';
  const tokens = document.getElementById('tokens');
  if (tokens) tokens.value = '';
  const flewInGroup = document.getElementById('flewInGroup');
  if (flewInGroup) flewInGroup.checked = true;
  const notes = document.getElementById('notes');
  if (notes) notes.value = '';
  const statusEl = document.getElementById('calculatedStatus');
  if (statusEl) statusEl.innerHTML = '<span class="status-badge">-</span>';
  if (typeof selectDays === 'function') selectDays(0);
  const saveBtn = document.getElementById('btnSavePerf');
  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Guardar Rendimiento'; }
  const userRole = (user.role || '').toUpperCase();
  const isAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
  const targetGroup = document.getElementById('performanceTargetGroup') || document.getElementById('adminPilotSelectorContainer');
  if (targetGroup) targetGroup.style.display = isAdmin ? 'block' : 'none';
  if (isAdmin) {
    if (typeof window.loadAdminPilotList === 'function') {
      window.loadAdminPilotList();
    } else {
      loadActiveMembers();
    }
  } else {
    const sel = document.getElementById('performanceTarget') || document.getElementById('targetPilotSelect');
    if (sel) {
      sel.innerHTML = `<option value="self">— Mi propio rendimiento (${user.nick || user.email || 'Piloto'}) —</option>`;
      sel.value = 'self';
    }
    if (typeof onTargetPilotChange === 'function') onTargetPilotChange();
  }
  loadOpenEvents();
}

function loadActiveMembers() {
  fetch(`${API_BASE}/api/performances/pilots`, { headers: getAuthHeaders() })
  .then(async res => {
    if (!res.ok) {
      const fallback = await fetch(`${API_BASE}/api/admin/members`, { headers: getAuthHeaders() });
      if (!fallback.ok) {
        const fallbackEvents = await fetch(`${API_BASE}/api/events/active-members`, { headers: getAuthHeaders() });
        if (!fallbackEvents.ok) throw new Error(`HTTP ${fallbackEvents.status}`);
        return fallbackEvents.json();
      }
      return fallback.json();
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      throw new Error('Response is not JSON');
    }
    return res.json();
  })
  .then(data => {
    const sel = document.getElementById('performanceTarget') || document.getElementById('targetPilotSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="self">— Mi propio rendimiento —</option>';
    const members = data.pilots || data.data?.pilots || data.members || data.activeMembers || data.users || data.data || (Array.isArray(data) ? data : []);
    
    // Filtrar solo activos y ordenar alfabéticamente
    const activeMembers = members
      .filter(p => {
        const st = (p.status || '').toUpperCase();
        return st !== 'INACTIVE' && st !== 'INACTIVO';
      })
      .sort((a, b) => (a.nick || a.email || '').localeCompare(b.nick || b.email || ''));

    const user = currentUser || window.currentUser;
    const currentUserId = user?.user_id || user?.id;

    activeMembers.forEach(m => {
      const uid = m.user_id || m.id;
      const isSelf = String(uid) === String(currentUserId) || (m.email && m.email.toLowerCase() === user?.email?.toLowerCase());
      const opt = document.createElement('option');
      opt.value = uid;
      const roleUpper = (m.role || 'MIEMBRO').toUpperCase();
      opt.textContent = `${m.nick || m.email || 'Sin Nick'} (${roleUpper}) ${isSelf ? '· [Tú]' : ''}`.trim();
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
  const eventTitleFormatted = formatEventTitle(event);
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
<h4>${eventTitleFormatted}</h4>
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
  if (typeof loadPlaneModels === 'function') {
    try { loadPlaneModels(); } catch (e) { /* ignore */ }
  }
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
    typeFilter.innerHTML = '<option value="">Todos los Roles</option>';
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t; opt.textContent = t;
      typeFilter.appendChild(opt);
    });
  }
  const hangarTypeFilter = document.getElementById('hangarTypeFilter');
  if (hangarTypeFilter) {
    const existingVal = hangarTypeFilter.value;
    const baseRoles = ['Ligero', 'Mediano', 'Pesado', 'Interceptor', 'Ataque', 'Caza de Combate', 'Caza de Superioridad Aérea', 'Caza Polivalente'];
    const merged = [...new Set([...baseRoles, ...types])];
    hangarTypeFilter.innerHTML = '<option value="">Todos los tipos</option>' +
      merged.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    if (existingVal) hangarTypeFilter.value = existingVal;
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

// ============================================================================
// HANGAR CIRCULAR INFINITE CAROUSEL & ADVANCED DEEP MODAL (v3.8.0)
// ============================================================================
let hangarCarouselIndex = 0;
let hangarFilteredPlanes = [];
let currentPlaneId = null;
window.currentPlaneId = null;
let hangarViewMode = 'carousel';

function toggleHangarViewMode() {
  const container = document.getElementById('hangarCarouselContainer');
  const table = document.getElementById('hangarTableView');
  const btnText = document.getElementById('toggleHangarViewText');

  if (hangarViewMode === 'carousel') {
    hangarViewMode = 'table';
    if (container) container.style.display = 'none';
    if (table) table.style.display = 'block';
    if (btnText) btnText.textContent = 'Ver Modo Carrusel';
  } else {
    hangarViewMode = 'carousel';
    if (container) container.style.display = 'block';
    if (table) table.style.display = 'none';
    if (btnText) btnText.textContent = 'Ver Modo Tabla';
    renderPlanesCarousel();
  }
}
window.toggleHangarViewMode = toggleHangarViewMode;

function scrollCarousel(direction) {
  if (!hangarFilteredPlanes || hangarFilteredPlanes.length === 0) return;
  const total = hangarFilteredPlanes.length;
  hangarCarouselIndex = (hangarCarouselIndex + direction + total) % total;
  updateCarouselView();
}
window.scrollCarousel = scrollCarousel;

function selectCarouselPlane(index) {
  if (!hangarFilteredPlanes || hangarFilteredPlanes.length === 0) return;
  hangarCarouselIndex = Math.max(0, Math.min(index, hangarFilteredPlanes.length - 1));
  updateCarouselView();
}
window.selectCarouselPlane = selectCarouselPlane;

function handleCarouselCardClick(cardIndex, planeId) {
  if (cardIndex === hangarCarouselIndex) {
    openAircraftDeepModal(planeId);
  } else {
    selectCarouselPlane(cardIndex);
  }
}
window.handleCarouselCardClick = handleCarouselCardClick;

function filterPlanesFromCarousel() {
  const query = (document.getElementById('hangarSearch')?.value || '').trim().toLowerCase();
  const typeFilter = (document.getElementById('hangarTypeFilter')?.value || '').trim().toLowerCase();

  const all = (typeof allUserPlanes !== 'undefined' && Array.isArray(allUserPlanes))
    ? allUserPlanes
    : [];

  hangarFilteredPlanes = all.filter(p => {
    const name = (p.model_name || p.name || p.avion_id || '').toLowerCase();
    const type = (p.type || '').toLowerCase();
    const esp = (p.especial_nombre || '').toLowerCase();
    const pas = (p.pasiva_nombre || '').toLowerCase();
    const id = String(p.id);

    const matchesQuery = !query || name.includes(query) || type.includes(query) || esp.includes(query) || pas.includes(query) || id.includes(query);
    const matchesType = !typeFilter || type.includes(typeFilter);

    return matchesQuery && matchesType;
  });

  hangarCarouselIndex = 0;
  updateCarouselView();
}
window.filterPlanesFromCarousel = filterPlanesFromCarousel;

function initCarouselTouchListeners() {
  const viewport = document.getElementById('carouselViewport');
  if (!viewport || viewport._touchBound) return;
  viewport._touchBound = true;

  let startX = 0;
  let startY = 0;

  viewport.addEventListener('touchstart', (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    startX = e.changedTouches[0].screenX;
    startY = e.changedTouches[0].screenY;
  }, { passive: true });

  viewport.addEventListener('touchend', (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const endX = e.changedTouches[0].screenX;
    const endY = e.changedTouches[0].screenY;
    const diffX = endX - startX;
    const diffY = endY - startY;

    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        scrollCarousel(1);
      } else {
        scrollCarousel(-1);
      }
    }
  }, { passive: true });
}

function initCarouselKeyboardListeners() {
  if (window._carouselKeyBound) return;
  window._carouselKeyBound = true;

  window.addEventListener('keydown', (e) => {
    const planesView = document.getElementById('planesView');
    if (!planesView || planesView.style.display === 'none') return;
    if (document.querySelector('.modal.show') || document.getElementById('aircraftDeepModal')?.classList.contains('show')) return;

    if (e.key === 'ArrowLeft') {
      scrollCarousel(-1);
    } else if (e.key === 'ArrowRight') {
      scrollCarousel(1);
    }
  });
}

function renderPlanesCarousel(planes) {
  if (planes) {
    hangarFilteredPlanes = planes;
  } else if (!hangarFilteredPlanes || hangarFilteredPlanes.length === 0) {
    hangarFilteredPlanes = (typeof allUserPlanes !== 'undefined' && Array.isArray(allUserPlanes))
      ? allUserPlanes
      : [];
  }

  if (hangarCarouselIndex >= hangarFilteredPlanes.length) {
    hangarCarouselIndex = Math.max(0, hangarFilteredPlanes.length - 1);
  }

  initCarouselTouchListeners();
  initCarouselKeyboardListeners();
  updateCarouselView();
}
window.renderPlanesCarousel = renderPlanesCarousel;

function updateCarouselView() {
  const track = document.getElementById('carouselTrack');
  const counterEl = document.getElementById('carouselCounter');
  const indicatorsEl = document.getElementById('carouselIndicators');

  if (!hangarFilteredPlanes || hangarFilteredPlanes.length === 0) {
    if (counterEl) counterEl.textContent = '0 de 0';
    if (indicatorsEl) indicatorsEl.innerHTML = '';
    if (track) {
      track.innerHTML = `
        <div style="text-align:center;padding:3rem 1rem;color:var(--steel-gray);width:100%;">
          <i data-lucide="plane" style="width:42px;height:42px;opacity:0.35;margin:0 auto 12px auto;display:block;"></i>
          <h4 style="color:#fff;margin-bottom:6px;font-family:var(--font-tactical);font-size:1.2rem;">Sin Aeronaves Registradas</h4>
          <p style="font-size:0.85rem;margin-bottom:16px;">No hay aeronaves que coincidan con la búsqueda.</p>
          <button onclick="showAddPlaneModal()" class="btn-primary btn-sm">➕ Registrar Nueva Aeronave</button>
        </div>
      `;
      if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 30);
    }
    return;
  }

  const N = hangarFilteredPlanes.length;
  const c = hangarCarouselIndex;

  if (counterEl) {
    counterEl.textContent = `${c + 1} de ${N}`;
  }

  if (indicatorsEl) {
    indicatorsEl.innerHTML = hangarFilteredPlanes.map((p, i) => `
      <div class="carousel-dot ${i === c ? 'active' : ''}" onclick="selectCarouselPlane(${i})" title="${escapeHtml(p.model_name || p.name || p.avion_id || 'Avión')} (${i + 1}/${N})"></div>
    `).join('');
  }

  if (track) {
    track.innerHTML = hangarFilteredPlanes.map((plane, index) => {
      let diff = (index - c) % N;
      if (diff > N / 2) diff -= N;
      if (diff < -N / 2) diff += N;

      let positionClass = 'is-hidden';
      if (diff === 0) positionClass = 'is-center';
      else if (diff === -1 || (N === 2 && diff === 1 && c === 1)) positionClass = 'is-prev';
      else if (diff === 1) positionClass = 'is-next';

      const planeName = escapeHtml(plane.model_name || plane.name || plane.avion_id || 'Aeronave Desconocida');
      const planeType = escapeHtml(plane.type || 'Caza de Combate');
      const planeLevel = plane.nivel || 1;

      // Special Skill
      const espName = escapeHtml(plane.especial_nombre || '');
      const espLvl = plane.especial_nivel_num || '';
      const espEffect = escapeHtml(plane.especial_efecto || '');
      const specialHtml = espName ? `
        <div class="card-skill-box">
          <div class="card-skill-title special">🎯 Habilidad Especial · Nv. ${espLvl || 1}</div>
          <div class="card-skill-name">${espName}</div>
          <div class="card-skill-effect">${espEffect || 'Efecto táctico activo'}</div>
        </div>
      ` : `
        <div class="card-skill-box" style="opacity:0.6;">
          <div class="card-skill-title">🎯 Habilidad Especial</div>
          <div class="card-skill-effect" style="font-style:italic;">🔒 Requiere Nivel 8+</div>
        </div>
      `;

      // Passive Skill
      const pasName = escapeHtml(plane.pasiva_nombre || '');
      const pasLvl = plane.pasiva_nivel_num || '';
      const pasEffect = escapeHtml(plane.pasiva_efecto || '');
      const passiveHtml = pasName ? `
        <div class="card-skill-box">
          <div class="card-skill-title passive">🛡️ Habilidad Pasiva · Nv. ${pasLvl || 1}</div>
          <div class="card-skill-name">${pasName}</div>
          <div class="card-skill-effect">${pasEffect || 'Efecto pasivo activo'}</div>
        </div>
      ` : `
        <div class="card-skill-box" style="opacity:0.6;">
          <div class="card-skill-title">🛡️ Habilidad Pasiva</div>
          <div class="card-skill-effect" style="font-style:italic;">🔒 Requiere Nivel 12+</div>
        </div>
      `;

      // Mods
      const mod1 = plane.mod1_nombre || plane.mod1_id;
      const mod2 = plane.mod2_nombre || plane.mod2_id;
      const modsHtml = (mod1 || mod2) ? `
        <div class="card-mods-section">
          <div class="card-mods-title">Mods Equipados</div>
          <div class="card-mods-badges">
            ${mod1 ? `<span class="plane-badge-type" style="background:rgba(212,175,55,0.12);border-color:rgba(212,175,55,0.35);color:var(--gold-rank);font-size:0.75rem;">🔩 ${escapeHtml(mod1)}${plane.mod1_lvl ? ` Nv.${plane.mod1_lvl}` : ''}</span>` : ''}
            ${mod2 ? `<span class="plane-badge-type" style="background:rgba(212,175,55,0.12);border-color:rgba(212,175,55,0.35);color:var(--gold-rank);font-size:0.75rem;">🔩 ${escapeHtml(mod2)}${plane.mod2_lvl ? ` Nv.${plane.mod2_lvl}` : ''}</span>` : ''}
          </div>
        </div>
      ` : `
        <div class="card-mods-section" style="opacity:0.6;">
          <div class="card-mods-title">Mods</div>
          <span style="font-size:0.75rem;color:var(--steel-dark);font-style:italic;">Sin modificaciones instaladas</span>
        </div>
      `;

      return `
        <div class="carousel-card plane-card ${positionClass} type-${getTypeClass(plane.type)}" onclick="handleCarouselCardClick(${index}, ${plane.id})" data-index="${index}" title="${diff === 0 ? 'Click para ver datos profundos' : 'Click para centrar esta aeronave'}">
          <div class="plane-image-container">
            <img 
              src="${plane.image_url || 'logo-escuadron.png'}" 
              alt="${escapeHtml(plane.model_name || plane.name || 'Aeronave')}"
              class="plane-image"
              loading="lazy"
              onerror="this.src='logo-escuadron.png'"
            >
          </div>
          <!-- Header: Plane Name Prominent, ID, Level, Type -->
          <div class="card-plane-header">
            <h3 class="card-plane-name">${planeName}</h3>
            <div class="card-plane-meta">
              <span class="plane-badge-id">🏷️ ${plane.id}</span>
              <span class="plane-badge-level">Nv. ${planeLevel}</span>
              <span class="plane-badge-type type-badge ${getTypeClass(plane.type)}">${getTypeIcon(plane.type)} ${planeType}</span>
            </div>
          </div>

          <!-- Card Body: Skills & Mods with internal scroll -->
          <div class="card-plane-body">
            <!-- Skills Section -->
            <div class="card-skills-section">
              ${specialHtml}
              ${passiveHtml}
            </div>

            <!-- Mods Section -->
            ${modsHtml}
          </div>

          <!-- Card Action Buttons -->
          <div class="card-actions">
            <button class="btn-secondary" onclick="event.stopPropagation(); openAircraftDeepModal(${plane.id})" title="Ver Telemetría y Datos Profundos">
              <i data-lucide="gauge" style="width:13px;height:13px;"></i> Stats
            </button>
            <button class="btn-secondary" onclick="event.stopPropagation(); editPlane(${plane.id})" title="Editar Aeronave">
              <i data-lucide="edit-3" style="width:13px;height:13px;"></i> Editar
            </button>
            <button class="btn-danger" onclick="event.stopPropagation(); deletePlane(${plane.id})" title="Eliminar Aeronave">
              <i data-lucide="trash-2" style="width:13px;height:13px;"></i> Eliminar
            </button>
          </div>
        </div>
      `;
    }).join('');

    if (typeof refreshLucideIcons === 'function') {
      setTimeout(refreshLucideIcons, 30);
    }
  }
}

// ============================================================================
// SISTEMA UPGRADES 2.0 - NODOS Y BIFURCACIÓN DE SISTEMAS
// ============================================================================

/**
 * Renderiza un ítem individual de nodo de mejora (Upgrades 2.0)
 */
function renderNodeItem(nodo, nivelActual) {
  const desbloqueado = (nivelActual || 0) >= nodo.nivel;
  const effectsDesc = nodo.descripcion || nodo.effects?.descripcion || (typeof nodo.effects === 'string' ? nodo.effects : '');
  const reqLvl = nodo.requirement_level || 6;
  const nodeName = nodo.node_name || '';
  const safeName = typeof escapeHtml === 'function' ? escapeHtml(nodeName) : nodeName;
  const safeDesc = typeof escapeHtml === 'function' ? escapeHtml(effectsDesc) : effectsDesc;

  return `
    <div class="node-item ${desbloqueado ? '' : 'locked'}">
      <div class="node-level">Nv. ${nodo.nivel}${nodo.ruta && nodo.ruta !== 'base' ? ` (${nodo.ruta})` : ''}</div>
      <div class="node-name">${safeName}</div>
      <div class="node-effects">${safeDesc}</div>
      ${desbloqueado ? '' : `<div class="node-requirement">Requiere Nivel ${reqLvl}</div>`}
    </div>
  `;
}

/**
 * Renderiza la matriz de nodos de un sistema militar (Base 1-4 y Bifurcación A/B 5-8)
 */
function renderSystemNodes(sistemaData) {
  if (!sistemaData) return '<div class="no-nodes" style="color:var(--steel-gray);padding:8px;">Sin datos de sistema</div>';
  const { nodos_completos, rutas_disponibles, nivel = 0 } = sistemaData;
  
  if (!nodos_completos || nodos_completos.length === 0) {
    return '<div class="no-nodes" style="color:var(--steel-gray);font-style:italic;padding:8px;">Sin nodos disponibles</div>';
  }
  
  // Separar nodos base (1-4) de nodos bifurcados (5-8)
  const nodosBase = nodos_completos.filter(n => n.ruta === 'base');
  const nodosA = nodos_completos.filter(n => n.ruta === 'A');
  const nodosB = nodos_completos.filter(n => n.ruta === 'B');
  
  let html = '<div class="system-nodes-base">';
  nodosBase.forEach(nodo => {
    html += renderNodeItem(nodo, nivel);
  });
  html += '</div>';
  
  if (nodosA.length > 0 || nodosB.length > 0) {
    const routeTitles = {
      fuselaje: { A: 'Acorazado', B: 'Acróbata' },
      motor: { A: 'Postquemador Extremo', B: 'Resistencia Térmica' },
      avionica: { A: 'Guerra Electrónica', B: 'Adquisición Furtiva' },
      canones_precision: { A: 'Balística Pesada', B: 'Cadencia Quirúrgica' },
      canones_asalto: { A: 'Saturación Masiva', B: 'Perforación de Blindaje' },
      misiles_ir: { A: 'Maniobrabilidad Cerrada', B: 'Resistencia a Contramedidas' },
      cohetes: { A: 'Salva Concentrada', B: 'Dispersión de Área' },
      misiles_manual: { A: 'Velocidad Terminal', B: 'Guiado Inercial' },
      misiles_radar: { A: 'Alcance BVR Extremo', B: 'Discriminación de Chaff' }
    };

    const sysKey = sistemaData.sistema || '';
    const labelA = routeTitles[sysKey]?.A || 'A';
    const labelB = routeTitles[sysKey]?.B || 'B';

    html += '<div class="system-bifurcation">';
    html += `<div class="route-column"><h5>Ruta A (${labelA})</h5>`;
    nodosA.forEach(nodo => {
      html += renderNodeItem(nodo, nivel);
    });
    html += '</div>';
    html += `<div class="route-column"><h5>Ruta B (${labelB})</h5>`;
    nodosB.forEach(nodo => {
      html += renderNodeItem(nodo, nivel);
    });
    html += '</div></div>';
  }
  
  return html;
}

/**
 * Renderiza el contenedor completo de sistemas con sus encabezados y nodos
 */
function renderDeepModalSystems(sistemas) {
  const systemsEl = document.getElementById('deepSystemsGrid');
  if (!systemsEl || !sistemas) return;

  const iconMap = {
    fuselaje: '🛡️',
    motor: '⚙️',
    avionica: '📡',
    armas: '🎯',
    canones_precision: '🎯',
    canones_asalto: '💥',
    misiles_ir: '🔥',
    cohetes: '🚀',
    misiles_manual: '🕹️',
    misiles_radar: '🛰️'
  };

  systemsEl.innerHTML = Object.entries(sistemas).map(([sistemaKey, sistemaData]) => {
    const icon = iconMap[sistemaKey] || '⚙️';
    const nivel = sistemaData?.nivel || 0;
    const nombre = sistemaData?.nombre || sistemaKey;
    const safeNombre = typeof escapeHtml === 'function' ? escapeHtml(nombre) : nombre;
    return `
      <div class="system-detail" data-system="${sistemaKey}">
        <div class="system-header">
          <span class="system-icon">${icon}</span>
          <span class="system-name">${safeNombre}</span>
          <span class="system-level">Nv. ${nivel}/8</span>
        </div>
        <div class="system-nodes">
          ${renderSystemNodes(sistemaData)}
        </div>
      </div>
    `;
  }).join('');
}

// Exportar globalmente
window.renderNodeItem = renderNodeItem;
window.renderSystemNodes = renderSystemNodes;
window.renderDeepModalSystems = renderDeepModalSystems;

// ============================================================================
// MODAL DE DATOS PROFUNDOS DE AERONAVE (C4ISR TELEMETRÍA)
// ============================================================================
async function openAircraftDeepModal(planeId) {
  window.currentPlaneId = planeId;
  currentPlaneId = planeId;

  const strId = String(planeId).trim();
  const numId = Number(planeId);

  // 1. Búsqueda exhaustiva en allUserPlanes
  let plane = null;
  if (typeof allUserPlanes !== 'undefined' && Array.isArray(allUserPlanes)) {
    plane = allUserPlanes.find(p => 
      String(p.id) === strId || 
      (!isNaN(numId) && Number(p.id) === numId) ||
      String(p.avion_id) === strId
    );
  }

  // 2. Búsqueda en hangarFilteredPlanes si no se encontró en allUserPlanes
  if (!plane && typeof hangarFilteredPlanes !== 'undefined' && Array.isArray(hangarFilteredPlanes)) {
    plane = hangarFilteredPlanes.find(p => 
      String(p.id) === strId || 
      (!isNaN(numId) && Number(p.id) === numId) ||
      String(p.avion_id) === strId
    );
  }

  // 3. Fallback de extracción desde el DOM del carrusel si el avión fue renderizado
  let domName = null;
  let domType = null;
  let domLevel = null;
  try {
    const cards = document.querySelectorAll('.carousel-card');
    for (const card of cards) {
      const badgeId = card.querySelector('.plane-badge-id')?.textContent || '';
      const onclickAttr = card.getAttribute('onclick') || '';
      const actionStatsBtn = card.querySelector('button[title*="Telemetría"]')?.getAttribute('onclick') || '';

      const isMatch = badgeId.includes(strId) || 
                      onclickAttr.includes(`(${strId})`) || 
                      onclickAttr.includes(`'${strId}'`) || 
                      onclickAttr.includes(`"${strId}"`) ||
                      actionStatsBtn.includes(`(${strId})`) ||
                      actionStatsBtn.includes(`'${strId}'`);

      if (isMatch) {
        domName = card.querySelector('.card-plane-name')?.textContent?.trim();
        domType = card.querySelector('.plane-badge-type')?.textContent?.trim();
        const lvlEl = card.querySelector('.plane-badge-level')?.textContent?.trim();
        if (lvlEl) {
          const m = lvlEl.match(/\d+/);
          if (m) domLevel = parseInt(m[0], 10);
        }
        break;
      }
    }
  } catch (e) {
    console.warn('DOM card search fallback error:', e);
  }

  // 4. Resolución priorizada del nombre real del modelo militar
  let planeName = '';
  // Si plane tiene model_name que no sea simplemente dígitos ni empiece con 'Aeronave #'
  if (plane?.model_name && !/^\d+$/.test(String(plane.model_name).trim()) && !String(plane.model_name).startsWith('Aeronave #')) {
    planeName = plane.model_name.trim();
  } else if (plane?.name && !/^\d+$/.test(String(plane.name).trim()) && !String(plane.name).startsWith('Aeronave #')) {
    planeName = plane.name.trim();
  } else if (domName && !/^\d+$/.test(domName) && !domName.startsWith('Aeronave #')) {
    planeName = domName;
  }

  // 5. Búsqueda en catálogo/cache si el nombre sigue sin resolverse o era numérico
  if (!planeName || /^\d+$/.test(planeName.trim())) {
    const avionIdToSearch = plane?.avion_id || planeId;
    if (String(avionIdToSearch) === '502' || strId === '502') {
      planeName = 'Su-22 Fitter';
    } else {
      const cache = window.planeModelsCache || (typeof planeModelsCache !== 'undefined' ? planeModelsCache : []);
      const cached = cache.find(m => 
        String(m.id) === String(avionIdToSearch) || 
        (m.name && m.name.toLowerCase() === String(avionIdToSearch).toLowerCase())
      );
      if (cached?.name) {
        planeName = cached.name;
      }
    }
  }

  // Si todavía no se resolvió pero conocemos el ID 502
  if (!planeName || planeName === '502') {
    if (strId === '502' || String(plane?.avion_id) === '502') {
      planeName = 'Su-22 Fitter';
    } else {
      planeName = plane?.model_name || plane?.name || domName || `Aeronave #${planeId}`;
    }
  }

  const planeType = plane?.type || domType || 'Caza de Combate';
  const planeLevel = plane?.nivel || domLevel || 1;

  // Header del Modal
  // Actualizar imagen del avión
  const imageEl = document.getElementById('deepPlaneImage');
  if (imageEl && plane?.image_url) {
    imageEl.src = plane.image_url;
    imageEl.alt = plane.model_name || planeName || 'Aircraft';
  } else if (imageEl) {
    imageEl.src = 'logo-escuadron.png';
    imageEl.alt = planeName || 'Aircraft';
  }

  const nameEl = document.getElementById('deepPlaneName');
  if (nameEl) nameEl.textContent = planeName;
  const idEl = document.getElementById('deepPlaneId');
  if (idEl) idEl.textContent = `🏷️ ${plane?.id || planeId}`;
  const typeEl = document.getElementById('deepPlaneType');
  if (typeEl) {
    typeEl.className = `deep-plane-type type-badge ${getTypeClass(planeType)}`;
    typeEl.innerHTML = `${getTypeIcon(planeType)} ${escapeHtml(planeType)}`;
  }
  const lvlEl = document.getElementById('deepPlaneLevel');
  if (lvlEl) lvlEl.innerHTML = `Nv. <span>${planeLevel}</span>`;

  // Skills
  const specialEl = document.getElementById('deepSpecialSkill');
  if (specialEl) {
    if (plane?.especial_nombre) {
      specialEl.innerHTML = `
        <div class="card-skill-title special" style="font-size:0.85rem;font-weight:700;margin-bottom:4px;">
          🎯 ${escapeHtml(plane.especial_nombre)} · Nivel ${plane.especial_nivel_num || 1}
        </div>
        <div style="font-size:0.88rem;color:#e2e8f0;line-height:1.4;">
          ${escapeHtml(plane.especial_efecto || 'Efecto táctico activo en combate.')}
        </div>
      `;
    } else {
      specialEl.innerHTML = `
        <div style="color:var(--steel-dark);font-style:italic;font-size:0.85rem;">
          🔒 Sin habilidad especial equipada (Desbloquea en Nivel 8+)
        </div>
      `;
    }
  }

  const passiveEl = document.getElementById('deepPassiveSkill');
  if (passiveEl) {
    if (plane?.pasiva_nombre) {
      passiveEl.innerHTML = `
        <div class="card-skill-title passive" style="font-size:0.85rem;font-weight:700;margin-bottom:4px;">
          🛡️ ${escapeHtml(plane.pasiva_nombre)} · Nivel ${plane.pasiva_nivel_num || 1}
        </div>
        <div style="font-size:0.88rem;color:#e2e8f0;line-height:1.4;">
          ${escapeHtml(plane.pasiva_efecto || 'Efecto pasivo permanente en combate.')}
        </div>
      `;
    } else {
      passiveEl.innerHTML = `
        <div style="color:var(--steel-dark);font-style:italic;font-size:0.85rem;">
          🔒 Sin habilidad pasiva equipada (Desbloquea en Nivel 12+)
        </div>
      `;
    }
  }

  // Upgrades 2.0 (Sistemas Fuselaje, Motor, Aviónica, Armas - 108 Nodos y Bifurcación A/B)
  const systemsEl = document.getElementById('deepSystemsGrid');
  if (systemsEl) {
    if (plane?.sistemas && Object.keys(plane.sistemas).length > 0) {
      renderDeepModalSystems(plane.sistemas);
    } else {
      const isUnlocked = planeLevel >= 6 || plane?.sistemas_desbloqueados;
      systemsEl.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:16px;color:var(--steel-gray);">
          <i data-lucide="loader-2" class="spin"></i> Conectando con telemetría de sistemas Upgrades 2.0...
        </div>
      `;
    }
  }

  // Mods Equipados
  const modsEl = document.getElementById('deepModsGrid');
  if (modsEl) {
    const slot1Unlocked = planeLevel >= 16;
    const slot2Unlocked = planeLevel >= 20;
    const mod1Name = plane?.mod1_nombre || plane?.mod1_id;
    const mod2Name = plane?.mod2_nombre || plane?.mod2_id;

    modsEl.innerHTML = `
      <div class="deep-mod-box">
        <div class="deep-mod-slot">Ranura 1 (Desbloquea Nv. 16)</div>
        ${!slot1Unlocked ? `
          <div style="color:var(--steel-dark);font-size:0.85rem;font-style:italic;">🔒 Bloqueado (Alcanza Nivel 16)</div>
        ` : mod1Name ? `
          <div style="font-weight:700;color:var(--gold-rank);font-size:0.95rem;">🔩 ${escapeHtml(mod1Name)}</div>
          <div style="font-size:0.78rem;color:#cbd5e1;margin-top:3px;">
            ${plane?.mod1_type ? `Categoría: ${escapeHtml(plane.mod1_type)} · ` : ''}Nivel ${plane?.mod1_lvl || 1}
          </div>
        ` : `
          <div style="color:var(--green-tactical);font-size:0.85rem;">✓ Ranura disponible · Sin mod equipado</div>
        `}
      </div>
      <div class="deep-mod-box">
        <div class="deep-mod-slot">Ranura 2 (Desbloquea Nv. 20)</div>
        ${!slot2Unlocked ? `
          <div style="color:var(--steel-dark);font-size:0.85rem;font-style:italic;">🔒 Bloqueado (Alcanza Nivel 20)</div>
        ` : mod2Name ? `
          <div style="font-weight:700;color:var(--gold-rank);font-size:0.95rem;">🔩 ${escapeHtml(mod2Name)}</div>
          <div style="font-size:0.78rem;color:#cbd5e1;margin-top:3px;">
            ${plane?.mod2_type ? `Categoría: ${escapeHtml(plane.mod2_type)} · ` : ''}Nivel ${plane?.mod2_lvl || 1}
          </div>
        ` : `
          <div style="color:var(--green-tactical);font-size:0.85rem;">✓ Ranura disponible · Sin mod equipado</div>
        `}
      </div>
    `;
  }

  // Cargar traits
  const traitsEl = document.getElementById('deepTraitsList');
  if (traitsEl) {
    const traits = plane?.traits || [];
    if (traits.length > 0) {
      traitsEl.innerHTML = traits.map(t => `
        <div class="trait-card">
          <div class="trait-header">
            <span class="trait-icon">${t.icon || '🎯'}</span>
            <span class="trait-name">${escapeHtml(t.name || t)}</span>
          </div>
          <div class="trait-description">${escapeHtml(t.description || '')}</div>
        </div>
      `).join('');
    } else {
      traitsEl.innerHTML = '<div style="color:var(--steel-gray);font-style:italic;">Sin traits especiales</div>';
    }
  }

  // Open modal
  showModal('aircraftDeepModal');

  // Stats Grid: Velocidad, Ángulo de Giro, Puntos de Vida, Postquemador, Aceleración, Vel. Maniobra
  const statsGridEl = document.getElementById('deepStatsGrid');
  if (statsGridEl) {
    statsGridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:12px;color:var(--steel-gray);"><i data-lucide="loader-2" class="spin"></i> Calculando telemetría balística...</div>';
  }

  try {
    const [statsRes, detailsRes] = await Promise.allSettled([
      fetch(`${API_BASE}/api/planes/${planeId}/stats`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/api/planes/${planeId}/details`, { headers: getAuthHeaders() })
    ]);

    let statsData = null;
    if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
      statsData = await statsRes.value.json();
      if (statsData?.plane?.traits && traitsEl) {
        const serverTraits = statsData.plane.traits;
        if (serverTraits.length > 0) {
          traitsEl.innerHTML = serverTraits.map(t => `
            <div class="trait-card">
              <div class="trait-header">
                <span class="trait-icon">${t.icon || '🎯'}</span>
                <span class="trait-name">${escapeHtml(t.name || t)}</span>
              </div>
              <div class="trait-description">${escapeHtml(t.description || '')}</div>
            </div>
          `).join('');
        } else {
          traitsEl.innerHTML = '<div style="color:var(--steel-gray);font-style:italic;">Sin traits especiales</div>';
        }
      }
    }

    if (detailsRes.status === 'fulfilled' && detailsRes.value.ok) {
      const detailsJson = await detailsRes.value.json();
      const planeDetails = detailsJson.plane || detailsJson.data;
      if (planeDetails) {
        plane = { ...plane, ...planeDetails };
        const detailImageEl = document.getElementById('deepPlaneImage');
        if (detailImageEl && plane.image_url) {
          detailImageEl.src = plane.image_url;
          detailImageEl.alt = plane.model_name || planeName || 'Aircraft';
        }
        if (plane.type) {
          const typeEl = document.getElementById('deepPlaneType');
          if (typeEl) {
            typeEl.className = `deep-plane-type type-badge ${getTypeClass(plane.type)}`;
            typeEl.innerHTML = `${getTypeIcon(plane.type)} ${escapeHtml(plane.type)}`;
          }
        }
        if (plane.sistemas) {
          renderDeepModalSystems(plane.sistemas);
          // Renderizado directo en contenedores data-system (Tarea 4)
          Object.entries(plane.sistemas).forEach(([sistemaKey, sistemaData]) => {
            const nodosHTML = renderSystemNodes(sistemaData);
            const sistemaEl = document.querySelector(`[data-system="${sistemaKey}"]`);
            if (sistemaEl) {
              const nodesSubEl = sistemaEl.querySelector('.system-nodes');
              if (nodesSubEl) {
                nodesSubEl.innerHTML = nodosHTML;
              } else {
                sistemaEl.innerHTML = nodosHTML;
              }
            }
          });
        }
      }
    }

    const levelFactor = planeLevel / 20;
    const bonusMotor = 1 + ((plane?.nivel_motor || 0) * 0.025);
    const bonusFuselaje = 1 + ((plane?.nivel_fuselaje || 0) * 0.03);

    const rawSpeed = statsData?.current_raw?.speed || Math.round(2800 * (0.6 + 0.4 * levelFactor) * bonusMotor);
    const rawAgility = statsData?.current_raw?.agility || Math.round(42 * (0.6 + 0.4 * levelFactor) * (1 + (plane?.nivel_fuselaje || 0) * 0.015));
    const rawArmor = statsData?.current_raw?.armor || Math.round(3200 * (0.5 + 0.5 * levelFactor) * bonusFuselaje);
    const afterburnerVal = Math.round(15 + (plane?.nivel_motor || 0) * 4.2 + levelFactor * 16);
    const accelVal = (18 + levelFactor * 12 + (plane?.nivel_motor || 0) * 1.5).toFixed(1);
    const maneuverSpeedVal = Math.round(rawSpeed * 0.44 + (plane?.nivel_fuselaje || 0) * 18);

    const statsList = [
      { label: 'Velocidad', val: `${rawSpeed.toLocaleString()}`, unit: 'km/h', pct: Math.min(100, Math.round((rawSpeed / 2800) * 100)), color: '#60a5fa' },
      { label: 'Ángulo de Giro', val: `${rawAgility}`, unit: '°/s', pct: Math.min(100, Math.round((rawAgility / 42) * 100)), color: '#4ade80' },
      { label: 'Puntos de Vida', val: `${rawArmor.toLocaleString()}`, unit: 'HP', pct: Math.min(100, Math.round((rawArmor / 3200) * 100)), color: '#f59e0b' },
      { label: 'Postquemador', val: `+${afterburnerVal}`, unit: '% Empuje', pct: Math.min(100, Math.round((afterburnerVal / 50) * 100)), color: '#fb923c' },
      { label: 'Aceleración', val: `${accelVal}`, unit: 'm/s²', pct: Math.min(100, Math.round((parseFloat(accelVal) / 35) * 100)), color: '#c084fc' },
      { label: 'Vel. Maniobra', val: `${maneuverSpeedVal.toLocaleString()}`, unit: 'km/h', pct: Math.min(100, Math.round((maneuverSpeedVal / 1400) * 100)), color: '#38bdf8' }
    ];

    if (statsGridEl) {
      statsGridEl.innerHTML = statsList.map(s => `
        <div class="deep-stat-card">
          <div class="deep-stat-header">
            <span class="deep-stat-label">${s.label}</span>
            <span class="deep-stat-value" style="color:${s.color};">${s.val} <span style="font-size:0.75rem;color:var(--steel-gray);">${s.unit}</span></span>
          </div>
          <div class="deep-stat-bar-track">
            <div class="deep-stat-bar-fill" style="width:${s.pct}%;background:${s.color};"></div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.warn('Error fetching detailed stats, showing fallback:', err);
    const levelFactor = planeLevel / 20;
    const speed = Math.round(2400 * (0.6 + 0.4 * levelFactor));
    const statsList = [
      { label: 'Velocidad', val: `${speed}`, unit: 'km/h', pct: Math.round((speed / 2800) * 100), color: '#60a5fa' },
      { label: 'Ángulo de Giro', val: `${Math.round(36 * (0.6 + 0.4 * levelFactor))}`, unit: '°/s', pct: 75, color: '#4ade80' },
      { label: 'Puntos de Vida', val: `${Math.round(2800 * (0.6 + 0.4 * levelFactor))}`, unit: 'HP', pct: 70, color: '#f59e0b' },
      { label: 'Postquemador', val: `+${Math.round(20 * levelFactor)}`, unit: '% Empuje', pct: 60, color: '#fb923c' },
      { label: 'Aceleración', val: `${(20 + levelFactor * 10).toFixed(1)}`, unit: 'm/s²', pct: 65, color: '#c084fc' },
      { label: 'Vel. Maniobra', val: `${Math.round(980 * levelFactor + 300)}`, unit: 'km/h', pct: 72, color: '#38bdf8' }
    ];
    if (statsGridEl) {
      statsGridEl.innerHTML = statsList.map(s => `
        <div class="deep-stat-card">
          <div class="deep-stat-header">
            <span class="deep-stat-label">${s.label}</span>
            <span class="deep-stat-value" style="color:${s.color};">${s.val} <span style="font-size:0.75rem;color:var(--steel-gray);">${s.unit}</span></span>
          </div>
          <div class="deep-stat-bar-track">
            <div class="deep-stat-bar-fill" style="width:${s.pct}%;background:${s.color};"></div>
          </div>
        </div>
      `).join('');
    }
  }

  if (typeof refreshLucideIcons === 'function') {
    setTimeout(refreshLucideIcons, 30);
  }

  // Tarea 7: Cargar recomendación táctica por defecto en el modal profundo
  if (typeof loadPlaneRecommendation === 'function') {
    loadPlaneRecommendation('agresivo');
  }
}
window.openAircraftDeepModal = openAircraftDeepModal;

function closeAircraftDeepModal() {
  closeModal('aircraftDeepModal');
}
window.closeAircraftDeepModal = closeAircraftDeepModal;

// ==========================================================================
// TAREA 7: RECOMENDACIÓN TÁCTICA DE BUILD (IA / Reglas Militares)
// ==========================================================================
async function loadPlaneRecommendation(playstyle) {
  const container = document.getElementById('deepRecommendationContent');
  const planeId = window.currentPlaneId || (typeof currentPlaneId !== 'undefined' ? currentPlaneId : null);
  
  // Actualizar botones de navegación
  const navBtns = document.querySelectorAll('#recStylesNav .rec-style-btn');
  navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('id') === `recBtn${playstyle.charAt(0).toUpperCase() + playstyle.slice(1)}`);
  });

  if (!container) return;

  container.innerHTML = '<div style="color:var(--steel-gray);font-size:0.85rem;"><i data-lucide="loader-2" class="spin"></i> Analizando doctrina táctica...</div>';
  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 30);

  const localDefaults = {
    agresivo: {
      nombre: 'Dogfight Agresivo & Asalto',
      fuselaje: 4, motor: 8, avionica: 2, armas: 7,
      mods: ['Giro Temerario', 'Armas Aniquiladoras'],
      desc: 'Enfocado en empuje de postcombustión, aceleración y letalidad balística/misiles para combate cerrado.'
    },
    defensivo: {
      nombre: 'Interceptador Blindado / Tanque',
      fuselaje: 8, motor: 4, avionica: 6, armas: 3,
      mods: ['Resistencia a Explosiones', 'Bengalas Disruptivas'],
      desc: 'Maximiza el blindaje e integridad de fuselaje con contramedidas defensivas para resistencia en zona caliente.'
    },
    apoyo: {
      nombre: 'Guerra Electrónica & Escolta',
      fuselaje: 5, motor: 5, avionica: 8, armas: 4,
      mods: ['Maniobrabilidad Ideal', 'Guiado Mejorado'],
      desc: 'Prioriza adquisición de radar, tiempo de enganche rápido, defensa ECM y soporte táctico de escuadrón.'
    }
  };

  const styleKey = (playstyle || 'agresivo').toLowerCase();
  let recData = null;

  if (planeId) {
    try {
      const res = await fetch(`${API_BASE}/api/planes/${planeId}/recommendation?playstyle=${styleKey}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) recData = json;
      }
    } catch (e) {
      console.warn('Fallback a reglas locales de recomendación:', e);
    }
  }

  const baseRec = localDefaults[styleKey] || localDefaults.agresivo;
  const build = recData?.build || baseRec;
  const totalPiezas = recData?.cost?.piezas || (
    [build.fuselaje, build.motor, build.avionica, build.armas].reduce((acc, lvl) => {
      const UPGRADE_COSTS = { 1:100, 2:250, 3:500, 4:800, 5:1200, 6:1800, 7:2500, 8:3500 };
      let sum = 0;
      for (let i = 1; i <= lvl; i++) sum += (UPGRADE_COSTS[i] || 0);
      return acc + sum;
    }, 0)
  );
  const totalAvanzadas = recData?.cost?.avanzadas || (
    [build.fuselaje, build.motor, build.avionica, build.armas].reduce((acc, lvl) => {
      const ADV_COSTS = { 1:0, 2:0, 3:10, 4:25, 5:50, 6:100, 7:200, 8:350 };
      let sum = 0;
      for (let i = 1; i <= lvl; i++) sum += (ADV_COSTS[i] || 0);
      return acc + sum;
    }, 0)
  );

  const modLabels = recData?.modsDetail?.map(m => m.name) || baseRec.mods;

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-weight:700;color:var(--gold-rank);font-size:0.95rem;">${baseRec.nombre}</div>
        <div style="font-size:0.8rem;color:#cbd5e1;margin-top:2px;">${baseRec.desc}</div>
      </div>
      <button type="button" class="btn-sm btn-primary" onclick="applyPresetToPlanner(${build.fuselaje}, ${build.motor}, ${build.avionica}, ${build.armas})" style="font-size:0.75rem;padding:4px 10px;">
        🚀 Cargar en Planificador
      </button>
    </div>

    <div class="rec-build-grid">
      <div class="rec-build-item">
        <span style="font-size:0.8rem;color:var(--steel-gray);">🛡️ Fuselaje</span>
        <span style="font-weight:700;color:#38bdf8;font-family:var(--font-mono);">Nv. ${build.fuselaje}/8</span>
      </div>
      <div class="rec-build-item">
        <span style="font-size:0.8rem;color:var(--steel-gray);">⚙️ Motor</span>
        <span style="font-weight:700;color:#fbbf24;font-family:var(--font-mono);">Nv. ${build.motor}/8</span>
      </div>
      <div class="rec-build-item">
        <span style="font-size:0.8rem;color:var(--steel-gray);">📡 Aviónica</span>
        <span style="font-weight:700;color:#c084fc;font-family:var(--font-mono);">Nv. ${build.avionica}/8</span>
      </div>
      <div class="rec-build-item">
        <span style="font-size:0.8rem;color:var(--steel-gray);">🎯 Armas</span>
        <span style="font-weight:700;color:#f87171;font-family:var(--font-mono);">Nv. ${build.armas}/8</span>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:0.8rem;color:var(--steel-gray);border-top:1px solid rgba(255,255,255,0.06);padding-top:6px;flex-wrap:wrap;gap:6px;">
      <div><strong>🔩 Mods sugeridos:</strong> <span style="color:#f1f5f9;">${modLabels.join(' · ')}</span></div>
      <div><strong>Costo est.:</strong> <span style="color:#f1f5f9;">${totalPiezas.toLocaleString()} piezas</span> · <span style="color:#38bdf8;">${totalAvanzadas.toLocaleString()} avanzadas</span></div>
    </div>
  `;
}
window.loadPlaneRecommendation = loadPlaneRecommendation;

// ==========================================================================
// TAREA 8: PLANIFICADOR DE UPGRADES 2.0
// ==========================================================================
let currentPlannerPlane = null;
const UPGRADE_PLANNER_COSTS = {
  1: { piezas: 100, avanzadas: 0 },
  2: { piezas: 250, avanzadas: 0 },
  3: { piezas: 500, avanzadas: 10 },
  4: { piezas: 800, avanzadas: 25 },
  5: { piezas: 1200, avanzadas: 50 },
  6: { piezas: 1800, avanzadas: 100 },
  7: { piezas: 2500, avanzadas: 200 },
  8: { piezas: 3500, avanzadas: 350 }
};

function openUpgradePlanner(planeId, presetBuild = null) {
  const pId = planeId || window.currentPlaneId || (typeof currentPlaneId !== 'undefined' ? currentPlaneId : null);
  const plane = (typeof allUserPlanes !== 'undefined' && Array.isArray(allUserPlanes))
    ? allUserPlanes.find(p => String(p.id) === String(pId))
    : (typeof hangarFilteredPlanes !== 'undefined' && Array.isArray(hangarFilteredPlanes))
      ? hangarFilteredPlanes.find(p => String(p.id) === String(pId))
      : null;

  currentPlannerPlane = plane || {
    id: pId,
    nivel: 6,
    nivel_fuselaje: 0,
    nivel_motor: 0,
    nivel_avionica: 0,
    nivel_armas: 0
  };

  const nameEl = document.getElementById('plannerPlaneName');
  const metaEl = document.getElementById('plannerPlaneMeta');
  if (nameEl) nameEl.textContent = currentPlannerPlane.model_name || currentPlannerPlane.name || `Aeronave #${currentPlannerPlane.id}`;
  if (metaEl) metaEl.textContent = `Nivel ${currentPlannerPlane.nivel || 1} · ${currentPlannerPlane.type || 'Caza de Combate'}`;

  const fInput = document.getElementById('plannerFuselaje');
  const mInput = document.getElementById('plannerMotor');
  const aInput = document.getElementById('plannerAvionica');
  const wInput = document.getElementById('plannerArmas');

  if (presetBuild) {
    if (fInput) fInput.value = presetBuild.fuselaje || 0;
    if (mInput) mInput.value = presetBuild.motor || 0;
    if (aInput) aInput.value = presetBuild.avionica || 0;
    if (wInput) wInput.value = presetBuild.armas || 0;
  } else {
    const saved = localStorage.getItem('planner_build_' + currentPlannerPlane.id);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (fInput) fInput.value = parsed.fuselaje ?? (currentPlannerPlane.nivel_fuselaje || 0);
        if (mInput) mInput.value = parsed.motor ?? (currentPlannerPlane.nivel_motor || 0);
        if (aInput) aInput.value = parsed.avionica ?? (currentPlannerPlane.nivel_avionica || 0);
        if (wInput) wInput.value = parsed.armas ?? (currentPlannerPlane.nivel_armas || 0);
      } catch (e) {
        resetPlannerToCurrent();
      }
    } else {
      resetPlannerToCurrent();
    }
  }

  onPlannerSliderChange();
  showModal('upgradePlannerModal');
}
window.openUpgradePlanner = openUpgradePlanner;

function resetPlannerToCurrent() {
  if (!currentPlannerPlane) return;
  const fInput = document.getElementById('plannerFuselaje');
  const mInput = document.getElementById('plannerMotor');
  const aInput = document.getElementById('plannerAvionica');
  const wInput = document.getElementById('plannerArmas');

  if (fInput) fInput.value = currentPlannerPlane.nivel_fuselaje || 0;
  if (mInput) mInput.value = currentPlannerPlane.nivel_motor || 0;
  if (aInput) aInput.value = currentPlannerPlane.nivel_avionica || 0;
  if (wInput) wInput.value = currentPlannerPlane.nivel_armas || 0;
  onPlannerSliderChange();
}
window.resetPlannerToCurrent = resetPlannerToCurrent;

function applyPresetToPlanner(fuselaje, motor, avionica, armas) {
  openUpgradePlanner(window.currentPlaneId, { fuselaje, motor, avionica, armas });
}
window.applyPresetToPlanner = applyPresetToPlanner;

function onPlannerSliderChange() {
  const fInput = document.getElementById('plannerFuselaje');
  const mInput = document.getElementById('plannerMotor');
  const aInput = document.getElementById('plannerAvionica');
  const wInput = document.getElementById('plannerArmas');

  const fVal = parseInt(fInput?.value || 0, 10);
  const mVal = parseInt(mInput?.value || 0, 10);
  const aVal = parseInt(aInput?.value || 0, 10);
  const wVal = parseInt(wInput?.value || 0, 10);

  const fBadge = document.getElementById('plannerFuselajeVal');
  const mBadge = document.getElementById('plannerMotorVal');
  const aBadge = document.getElementById('plannerAvionicaVal');
  const wBadge = document.getElementById('plannerArmasVal');

  if (fBadge) fBadge.textContent = `${fVal}/8`;
  if (mBadge) mBadge.textContent = `${mVal}/8`;
  if (aBadge) aBadge.textContent = `${aVal}/8`;
  if (wBadge) wBadge.textContent = `${wVal}/8`;

  // Cálculo de costos acumulados
  let totalPiezas = 0;
  let totalAvanzadas = 0;

  [fVal, mVal, aVal, wVal].forEach(lvl => {
    for (let i = 1; i <= lvl; i++) {
      if (UPGRADE_PLANNER_COSTS[i]) {
        totalPiezas += UPGRADE_PLANNER_COSTS[i].piezas;
        totalAvanzadas += UPGRADE_PLANNER_COSTS[i].avanzadas;
      }
    }
  });

  const piezasEl = document.getElementById('plannerTotalPiezas');
  const avanzadasEl = document.getElementById('plannerTotalAvanzadas');
  if (piezasEl) piezasEl.textContent = totalPiezas.toLocaleString();
  if (avanzadasEl) avanzadasEl.textContent = totalAvanzadas.toLocaleString();

  // Cálculo de stats previstos vs actuales
  const planeLevel = currentPlannerPlane?.nivel || 6;
  const levelFactor = planeLevel / 20;

  const baseSpeed = Math.round(2800 * (0.6 + 0.4 * levelFactor));
  const baseAgility = Math.round(42 * (0.6 + 0.4 * levelFactor));
  const baseArmor = Math.round(3200 * (0.5 + 0.5 * levelFactor));
  const baseFirepower = Math.round(1600 * (0.5 + 0.5 * levelFactor));

  const currF = currentPlannerPlane?.nivel_fuselaje || 0;
  const currM = currentPlannerPlane?.nivel_motor || 0;
  const currW = currentPlannerPlane?.nivel_armas || 0;

  const currSpeed = Math.round(baseSpeed * (1 + currM * 0.025));
  const currAgility = Math.round(baseAgility * (1 + currF * 0.015));
  const currArmor = Math.round(baseArmor * (1 + currF * 0.03));
  const currFirepower = Math.round(baseFirepower * (1 + currW * 0.035));

  const planSpeed = Math.round(baseSpeed * (1 + mVal * 0.025));
  const planAgility = Math.round(baseAgility * (1 + fVal * 0.015));
  const planArmor = Math.round(baseArmor * (1 + fVal * 0.03));
  const planFirepower = Math.round(baseFirepower * (1 + wVal * 0.035));

  const speedEl = document.getElementById('plannerSpeed');
  const agilityEl = document.getElementById('plannerAgility');
  const armorEl = document.getElementById('plannerArmor');
  const firepowerEl = document.getElementById('plannerFirepower');

  if (speedEl) speedEl.textContent = `${planSpeed.toLocaleString()} km/h`;
  if (agilityEl) agilityEl.textContent = `${planAgility} °/s`;
  if (armorEl) armorEl.textContent = `${planArmor.toLocaleString()} HP`;
  if (firepowerEl) firepowerEl.textContent = `${planFirepower.toLocaleString()} DPS`;

  const diffSpeed = planSpeed - currSpeed;
  const diffAgility = planAgility - currAgility;
  const diffArmor = planArmor - currArmor;
  const diffFirepower = planFirepower - currFirepower;

  const speedDiffEl = document.getElementById('plannerSpeedDiff');
  const agilityDiffEl = document.getElementById('plannerAgilityDiff');
  const armorDiffEl = document.getElementById('plannerArmorDiff');
  const firepowerDiffEl = document.getElementById('plannerFirepowerDiff');

  if (speedDiffEl) {
    speedDiffEl.textContent = `${diffSpeed >= 0 ? '+' : ''}${diffSpeed} km/h`;
    speedDiffEl.style.color = diffSpeed >= 0 ? 'var(--green-tactical)' : 'var(--red-danger)';
  }
  if (agilityDiffEl) {
    agilityDiffEl.textContent = `${diffAgility >= 0 ? '+' : ''}${diffAgility} °/s`;
    agilityDiffEl.style.color = diffAgility >= 0 ? 'var(--green-tactical)' : 'var(--red-danger)';
  }
  if (armorDiffEl) {
    armorDiffEl.textContent = `${diffArmor >= 0 ? '+' : ''}${diffArmor} HP`;
    armorDiffEl.style.color = diffArmor >= 0 ? 'var(--green-tactical)' : 'var(--red-danger)';
  }
  if (firepowerDiffEl) {
    firepowerDiffEl.textContent = `${diffFirepower >= 0 ? '+' : ''}${diffFirepower} DPS`;
    firepowerDiffEl.style.color = diffFirepower >= 0 ? 'var(--green-tactical)' : 'var(--red-danger)';
  }
}
window.onPlannerSliderChange = onPlannerSliderChange;

function saveBuild() {
  if (!currentPlannerPlane) {
    if (typeof showToast === 'function') showToast('No hay aeronave seleccionada', 'error');
    return;
  }

  const fVal = parseInt(document.getElementById('plannerFuselaje')?.value || 0, 10);
  const mVal = parseInt(document.getElementById('plannerMotor')?.value || 0, 10);
  const aVal = parseInt(document.getElementById('plannerAvionica')?.value || 0, 10);
  const wVal = parseInt(document.getElementById('plannerArmas')?.value || 0, 10);

  const plannedBuild = {
    plane_id: currentPlannerPlane.id,
    fuselaje: fVal,
    motor: mVal,
    avionica: aVal,
    armas: wVal,
    updated_at: new Date().toISOString()
  };

  localStorage.setItem('planner_build_' + currentPlannerPlane.id, JSON.stringify(plannedBuild));

  if (typeof showToast === 'function') {
    showToast(`Build táctica guardada (F:${fVal} M:${mVal} A:${aVal} W:${wVal})`, 'success');
  } else {
    alert('Build táctica planificada guardada con éxito.');
  }

  closeModal('upgradePlannerModal');
}
window.saveBuild = saveBuild;

function exportPlane(planeId) {
  const plane = (typeof allUserPlanes !== 'undefined' && Array.isArray(allUserPlanes))
    ? allUserPlanes.find(p => String(p.id) === String(planeId))
    : (hangarFilteredPlanes || []).find(p => String(p.id) === String(planeId));

  if (!plane) {
    showToast('Aeronave no encontrada para exportar', 'warning');
    return;
  }

  const planeName = plane.model_name || plane.name || plane.avion_id || `Aeronave_${plane.id}`;
  const dossier = `================================================================================
PARAGUAY FFAA [PRY] | METALSTORM - FICHA TÉCNICA DE COMBATE
CENTRO DE MANDO C4ISR - DIVISIÓN DE FLOTA Y TELEMETRÍA
================================================================================
AERONAVE:            ${planeName}
IDENTIFICADOR (ID):  #${plane.id}
TIPO / ROL TÁCTICO:  ${plane.type || 'Caza de Combate'}
NIVEL OPERATIVO:     Nv. ${plane.nivel}
ESTADO DE MANDO:     ACTIVO EN SERVICIO
FECHA DE EMISIÓN:    ${new Date().toLocaleString('es-PY')}
================================================================================
HABILIDADES DE COMBATE:
- HABILIDAD ESPECIAL: ${plane.especial_nombre || 'Sin equipar'} (Nv. ${plane.especial_nivel_num || '-'})
  Efecto: ${plane.especial_efecto || 'N/A'}

- HABILIDAD PASIVA:   ${plane.pasiva_nombre || 'Sin equipar'} (Nv. ${plane.pasiva_nivel_num || '-'})
  Efecto: ${plane.pasiva_efecto || 'N/A'}
================================================================================
SISTEMAS UPGRADES 2.0 (Nv 6+):
- 🛡️ Fuselaje:       Nv. ${plane.nivel_fuselaje || 0} / 8
- ⚙️ Motor:          Nv. ${plane.nivel_motor || 0} / 8
- 📡 Aviónica:       Nv. ${plane.nivel_avionica || 0} / 8
- 🎯 Armas:          Nv. ${plane.nivel_armas || 0} / 8
================================================================================
MODIFICACIONES EQUIPADAS:
- MOD 1 (Nv 16+):    ${plane.mod1_nombre || plane.mod1_id || 'Sin mod'} ${plane.mod1_lvl ? `(Nv. ${plane.mod1_lvl})` : ''}
- MOD 2 (Nv 20):     ${plane.mod2_nombre || plane.mod2_id || 'Sin mod'} ${plane.mod2_lvl ? `(Nv. ${plane.mod2_lvl})` : ''}
================================================================================
PRY ESCUADRÓN FFAA - OPERACIONES AÉREAS C4ISR
================================================================================`;

  const blob = new Blob([dossier], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ficha_Tecnica_${planeName.replace(/\s+/g, '_')}_ID${plane.id}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`✅ Ficha técnica de ${planeName} exportada con éxito`, 'success');
}
window.exportPlane = exportPlane;

function displayPlanes(planes) {
  // Render Infinite Circular Carousel
  renderPlanesCarousel(planes);

  const tbody = document.getElementById('planesTableBody');
  if (!tbody) return;
  if (!planes || planes.length === 0) {
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

    const especialHtml = plane.especial_nombre ? `
      <div class="skill-card" style="margin:2px 0;padding:8px;min-width:140px;text-align:left;">
        <div class="skill-header" style="gap:5px;margin-bottom:4px;font-size:0.75rem;">
          <span class="skill-icon">🎯</span>
          <span class="skill-title">Habilidad Especial</span>
        </div>
        <div class="skill-body">
          <div class="skill-name" style="font-size:0.85rem;">${plane.especial_nombre}</div>
          <div class="skill-level" style="font-size:0.75rem;margin-top:2px;">
            Nivel ${plane.especial_nivel_num || '-'}: ${plane.especial_efecto || 'Sin efecto'}
          </div>
        </div>
      </div>
    ` : '<span style="color:#666">—</span>';

    const pasivaHtml = plane.pasiva_nombre ? `
      <div class="skill-card" style="margin:2px 0;padding:8px;min-width:140px;text-align:left;">
        <div class="skill-header" style="gap:5px;margin-bottom:4px;font-size:0.75rem;">
          <span class="skill-icon">🛡️</span>
          <span class="skill-title">Habilidad Pasiva</span>
        </div>
        <div class="skill-body">
          <div class="skill-name" style="font-size:0.85rem;">${plane.pasiva_nombre}</div>
          <div class="skill-level" style="font-size:0.75rem;margin-top:2px;">
            Nivel ${plane.pasiva_nivel_num || '-'}: ${plane.pasiva_efecto || 'Sin efecto'}
          </div>
        </div>
      </div>
    ` : '<span style="color:#666">—</span>';

    return `
<tr>
<td data-label="Aeronave"><strong>${plane.model_name || plane.name || plane.avion_id || '-'}</strong></td>
<td data-label="Tipo"><span class="type-badge ${getTypeClass(plane.type)}">${getTypeIcon(plane.type)} ${plane.type || '-'}</span></td>
<td data-label="Nivel">
<span class="status-badge" style="background:rgba(212,175,55,0.2); color:#d4af37; border:1px solid #d4af37;">
Nv. ${plane.nivel}
</span>
</td>
<td data-label="Upgrades 2.0">${upgradesBadgeHtml}</td>
<td data-label="Especial">${especialHtml}</td>
<td data-label="Pasiva">${pasivaHtml}</td>
<td data-label="Mod 1">${plane.mod1_nombre || plane.mod1_id || '<span style="color:#666">—</span>'}</td>
<td data-label="Mod 2">${plane.mod2_nombre || plane.mod2_id || '<span style="color:#666">—</span>'}</td>
<td data-label="Acciones" style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center;">
<button onclick="openPlaneUpgrades(${plane.id})" class="btn-primary" style="padding:4px 8px; font-size:0.75rem; background:rgba(56,189,248,0.2); border:1px solid #38bdf8; color:#38bdf8;" title="Gestionar Upgrades 2.0"><i data-lucide="wrench" style="width:13px;height:13px;"></i> Upgrades</button>
<button onclick="openAircraftDeepModal(${plane.id})" class="btn-secondary" style="padding:4px 8px; font-size:0.75rem; border-color:var(--blue-telemetry); color:var(--blue-telemetry);" title="Ver Telemetría y Datos Profundos"><i data-lucide="gauge" style="width:13px;height:13px;"></i> Stats</button>
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
  // Redirigir al nuevo modal con datos profundos de aeronave (v3.8.0)
  return openAircraftDeepModal(planeId);
}
window.openAircraftStats = openAircraftStats;

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
    case 'helpView':            loadHelpView();          break;
  }
}

// ============================================================
// ========== 1. BIBLIOTECA DE NORMATIVAS & DIRECTIVAS ==========
// ============================================================
let allNormativasCache = [];

async function loadNormativas() {
  const container = document.getElementById('normativasList');
  if (container) container.innerHTML = '<div class="loading-text">Cargando normativas oficiales...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/normativas`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error al consultar biblioteca de normativas');
    const data = await res.json();
    allNormativasCache = data.normativas || (Array.isArray(data) ? data : []);
    renderNormativas(allNormativasCache);
  } catch (err) {
    console.error('Error en loadNormativas:', err);
    if (container) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:2rem;color:#f87171;">
          <p>⚠️ No se pudieron cargar las normativas del servidor.</p>
          <button onclick="loadNormativas()" class="btn-secondary" style="margin-top:10px;">🔄 Reintentar</button>
        </div>
      `;
    }
  }
}

function renderNormativas(list) {
  const container = document.getElementById('normativasList');
  const countEl = document.getElementById('normativasCount');
  if (!container) return;

  if (countEl) countEl.textContent = `Mostrando ${list.length} directiva(s) oficial(es)`;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:2.5rem;color:#94a3b8;">
        <p style="font-size:1.1rem;margin-bottom:0.5rem;">📚 No se encontraron normativas con los filtros actuales</p>
        <p style="font-size:0.85rem;">Intenta limpiar los filtros de búsqueda.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(n => {
    const catIcons = {
      'FUNDAMENTAL': '🏛️', 'OPERACIONAL': '⚙️', 'DISCIPLINARIA': '⚖️',
      'ADMINISTRATIVA': '📋', 'TECNICA': '🔧', 'OPERACIONES': '✈️', 'PERSONAL': '👥'
    };
    const icon = catIcons[n.categoria] || '📄';
    return `
      <div class="card" style="background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.15);padding:1.25rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:8px;">
          <div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;padding:2px 8px;border-radius:4px;background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);">
              ${escapeHTML(n.codigo || 'NOR-000')}
            </span>
            <h3 style="margin-top:6px;font-size:1.1rem;color:#f8fafc;">${icon} ${escapeHTML(n.titulo || 'Sin título')}</h3>
          </div>
          <span style="font-size:0.75rem;padding:3px 10px;border-radius:12px;background:rgba(212,175,55,0.15);color:#d4af37;border:1px solid rgba(212,175,55,0.3);">
            ${escapeHTML(n.tipo_documento || 'DIRECTIVA')}
          </span>
        </div>
        <p style="font-size:0.9rem;color:#cbd5e1;line-height:1.5;margin-bottom:12px;">
          ${escapeHTML(n.resumen || n.descripcion || 'Sin descripción disponible')}
        </p>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;font-size:0.8rem;color:#94a3b8;border-top:1px solid rgba(148,163,184,0.1);padding-top:10px;">
          <div>
            <span>📅 Vigor: ${n.fecha_entrada_vigor ? new Date(n.fecha_entrada_vigor).toLocaleDateString() : 'Inmediato'}</span>
            <span style="margin-left:12px;">🔒 Confidencialidad: <strong>${escapeHTML(n.nivel_confidencialidad || 'PUBLICO')}</strong></span>
          </div>
          ${n.file_name ? `
            <button onclick="downloadNormativa(${n.id})" class="btn-secondary" style="padding:4px 10px;font-size:0.75rem;">
              📥 Descargar (${escapeHTML(n.file_name)})
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function applyNormativasFilters() {
  const search = (document.getElementById('normativasSearch')?.value || '').toLowerCase();
  const cat = document.getElementById('categoriaFilter')?.value || '';
  const tipo = document.getElementById('tipoDocFilter')?.value || '';
  const orden = document.getElementById('ordenFilter')?.value || 'recientes';

  let filtered = allNormativasCache.filter(n => {
    const text = `${n.titulo || ''} ${n.codigo || ''} ${n.resumen || ''}`.toLowerCase();
    if (search && !text.includes(search)) return false;
    if (cat && n.categoria !== cat) return false;
    if (tipo && n.tipo_documento !== tipo) return false;
    return true;
  });

  if (orden === 'alfabetico') {
    filtered.sort((a, b) => (a.titulo || '').localeCompare(b.titulo || ''));
  } else if (orden === 'antiguos') {
    filtered.sort((a, b) => new Date(a.fecha_entrada_vigor || 0) - new Date(b.fecha_entrada_vigor || 0));
  } else {
    filtered.sort((a, b) => new Date(b.fecha_entrada_vigor || 0) - new Date(a.fecha_entrada_vigor || 0));
  }

  renderNormativas(filtered);
}

function resetNormativasFilters() {
  ['normativasSearch', 'categoriaFilter', 'tipoDocFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const orden = document.getElementById('ordenFilter');
  if (orden) orden.value = 'recientes';
  renderNormativas(allNormativasCache);
}

// ============================================================
// ========== 2. PANEL DE COMANDANCIA & ADMINISTRACIÓN ==========
// ============================================================
let adminMembersCache = [];

async function loadAdminPanel() {
  const tableBody = document.getElementById('membersTableBody');
  if (tableBody && (!adminMembersCache || adminMembersCache.length === 0)) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#a0aec0;">⏳ Sincronizando registros militares de la escuadra...</td></tr>';
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, { headers: getAuthHeaders() });
    let members = [];
    if (res.ok) {
      const mData = await res.json();
      members = mData.users || mData.members || mData.data || (Array.isArray(mData) ? mData : []);
    } else {
      const fallback = await fetch(`${API_BASE}/api/admin/members`, { headers: getAuthHeaders() });
      if (fallback.ok) {
        const fbData = await fallback.json();
        members = fbData.users || fbData.members || fbData.data || (Array.isArray(fbData) ? fbData : []);
      }
    }

    adminMembersCache = members;
    renderAdminStats(members);
    renderPilotsByStatus(members);
    renderAdminMembersTable(members);

    const updateEl = document.getElementById('lastUpdate');
    if (updateEl) updateEl.textContent = new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Cargar eventos para el panel de eventos y Black Market
    loadAdminEvents();

  } catch (err) {
    console.error('Error cargando admin panel:', err);
    showToast('❌ Error al cargar panel de administración', 'error');
  }
}

async function loadAdminEvents() {
  try {
    const res = await fetch(`${API_BASE}/api/events`, { headers: getAuthHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const events = data.events || [];
    renderAdminEvents(events);
  } catch (err) {
    console.warn('⚠️ No se pudieron cargar eventos de admin:', err);
  }
}

function renderAdminEvents(events) {
  const container = document.getElementById('adminEventsList');
  const bmInfo = document.getElementById('blackMarketInfo');

  if (bmInfo) {
    const bmEvent = events.find(e => e.type === 'BLACK_MARKET' || e.type === 'BM');
    if (bmEvent) {
      const isOpen = Boolean(bmEvent.is_open || bmEvent.status === 'OPEN');
      bmInfo.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div>
            <strong style="color:#e2e8f0;font-size:1rem;">${escapeHTML(bmEvent.title || 'Black Market')}</strong>
            <div style="font-size:0.82rem;color:#94a3b8;margin-top:2px;">
              Límite operativo: <strong style="color:#d4af37;">250 Tokens</strong> · Ventana: Lunes 17:00 a Miércoles 16:59 (PY)
            </div>
          </div>
          <span class="status-badge status-${isOpen ? 'verde' : 'negro'}" style="padding:4px 10px;font-size:0.8rem;">
            ${isOpen ? '🟢 OPERATIVO' : '🔴 CERRADO'}
          </span>
        </div>
      `;
    } else {
      bmInfo.innerHTML = '<p style="color:#94a3b8;font-size:0.85rem;margin:0;">No hay evento Black Market programado actualmente.</p>';
    }
  }

  if (container) {
    if (!events || events.length === 0) {
      container.innerHTML = '<p style="color:#94a3b8;grid-column:1/-1;">No hay eventos registrados en el sistema</p>';
      return;
    }
    container.innerHTML = events.slice(0, 8).map(ev => {
      const isOpen = Boolean(ev.is_open || ev.status === 'OPEN');
      return `
        <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(148,163,184,0.15);border-radius:8px;padding:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="color:#f8fafc;font-size:0.88rem;">${escapeHTML(ev.title || ev.id)}</strong>
            <span class="status-badge status-${isOpen ? 'verde' : 'negro'}" style="font-size:0.68rem;padding:2px 6px;">
              ${isOpen ? 'ABIERTO' : 'CERRADO'}
            </span>
          </div>
          <div style="font-size:0.78rem;color:#94a3b8;line-height:1.5;">
            Tipo: <strong style="color:#cbd5e1;">${ev.type || 'SQUADRON'}</strong><br>
            Inicio: ${ev.start_date ? new Date(ev.start_date).toLocaleDateString() : '-'}<br>
            Fin: ${ev.end_date ? new Date(ev.end_date).toLocaleDateString() : '-'}
          </div>
        </div>
      `;
    }).join('');
  }
}

function renderAdminStats(members) {
  const totalEl = document.getElementById('totalMembers');
  const avgEl = document.getElementById('adminAvgTokens');
  const riskEl = document.getElementById('atRiskMembers');

  const activeCount = members.filter(m => (m.status || 'ACTIVE').toUpperCase() === 'ACTIVE').length;
  if (totalEl) totalEl.textContent = `${activeCount} / ${members.length}`;
  
  if (members.length > 0) {
    const sum = members.reduce((s, m) => s + (Number(m.avg_tokens) || 0), 0);
    const avg = (sum / members.length).toFixed(1);
    const atRisk = members.filter(m => {
      const st = (m.perf_status || '').toUpperCase();
      return st === 'ROJO' || st === 'NEGRO';
    }).length;

    if (avgEl) avgEl.textContent = `${avg} tokens`;
    if (riskEl) riskEl.textContent = atRisk;
  } else {
    if (avgEl) avgEl.textContent = `0 tokens`;
    if (riskEl) riskEl.textContent = '0';
  }
}

function renderPilotsByStatus(members) {
  const container = document.getElementById('pilotsByStatus');
  if (!container) return;

  const counts = { VERDE: 0, NARANJA: 0, ROJO: 0, NEGRO: 0 };
  members.forEach(m => {
    const st = (m.perf_status || 'NEGRO').toUpperCase();
    if (counts[st] !== undefined) counts[st]++;
    else counts.NEGRO++;
  });

  const total = Math.max(1, members.length);
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;">
      <div style="background:rgba(46,204,113,0.1);border:1px solid #2ecc71;border-radius:8px;padding:12px;text-align:center;">
        <span style="color:#2ecc71;font-weight:700;font-size:1.3rem;">${counts.VERDE}</span>
        <div style="font-size:0.75rem;color:#a0aec0;margin-top:2px;">VERDE (${Math.round((counts.VERDE/total)*100)}%)</div>
      </div>
      <div style="background:rgba(243,156,18,0.1);border:1px solid #f39c12;border-radius:8px;padding:12px;text-align:center;">
        <span style="color:#f39c12;font-weight:700;font-size:1.3rem;">${counts.NARANJA}</span>
        <div style="font-size:0.75rem;color:#a0aec0;margin-top:2px;">NARANJA (${Math.round((counts.NARANJA/total)*100)}%)</div>
      </div>
      <div style="background:rgba(231,76,60,0.1);border:1px solid #e74c3c;border-radius:8px;padding:12px;text-align:center;">
        <span style="color:#e74c3c;font-weight:700;font-size:1.3rem;">${counts.ROJO}</span>
        <div style="font-size:0.75rem;color:#a0aec0;margin-top:2px;">ROJO (${Math.round((counts.ROJO/total)*100)}%)</div>
      </div>
      <div style="background:rgba(148,163,184,0.1);border:1px solid #64748b;border-radius:8px;padding:12px;text-align:center;">
        <span style="color:#94a3b8;font-weight:700;font-size:1.3rem;">${counts.NEGRO}</span>
        <div style="font-size:0.75rem;color:#a0aec0;margin-top:2px;">NEGRO (${Math.round((counts.NEGRO/total)*100)}%)</div>
      </div>
    </div>
  `;
}

function formatLastActivity(dateStr) {
  if (!dateStr) return '<span style="color:#64748b;">Sin registro</span>';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '<span style="color:#64748b;">-</span>';
    return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return dateStr;
  }
}

function renderAdminMembersTable(members) {
  const tableBody = document.getElementById('membersTableBody');
  const noResultsMsg = document.getElementById('noResultsMessage');

  // Limpiar cualquier tabla redundante previa
  const existingDynamicTable = document.getElementById('adminMembersTable');
  if (existingDynamicTable) existingDynamicTable.remove();

  if (!members || members.length === 0) {
    if (tableBody) tableBody.innerHTML = '';
    if (noResultsMsg) noResultsMsg.style.display = 'block';
    return;
  }

  if (noResultsMsg) noResultsMsg.style.display = 'none';

  const isOwner = currentUser && (currentUser.role === 'OWNER' || (currentUser.role || '').toUpperCase() === 'OWNER');

  const rowsHtml = members.map(m => {
    const userId = m.id || m.user_id;
    const currentRole = (m.role || 'MIEMBRO').toUpperCase();
    const currentStatus = (m.status || 'ACTIVE').toUpperCase();
    const isActive = currentStatus === 'ACTIVE';
    const isSelf = currentUser && (
      String(userId) === String(currentUser.user_id || currentUser.id) ||
      (m.email && m.email.toLowerCase() === (currentUser.email || '').toLowerCase())
    );
    const perfStatus = (m.perf_status || 'VERDE').toUpperCase();

    return `
      <tr style="border-bottom:1px solid rgba(148,163,184,0.1);background:${!isActive ? 'rgba(231,76,60,0.05)' : 'transparent'};">
        <td style="padding:10px 8px;font-weight:600;color:#f8fafc;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span>${escapeHTML(m.nick || '-')}</span>
            ${isSelf ? '<span style="font-size:0.7rem;color:#d4af37;background:rgba(212,175,55,0.15);padding:1px 5px;border-radius:4px;">(Tú)</span>' : ''}
          </div>
        </td>
        <td style="padding:10px 8px;font-size:0.82rem;color:#94a3b8;">${escapeHTML(m.email || '-')}</td>
        <td style="padding:10px 8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="role-badge role-${currentRole}">${escapeHTML(currentRole)}</span>
            <select onchange="changeUserRole('${userId}', this.value, '${escapeHTML(m.nick || '')}')" 
                    style="background:#0f172a;color:#cbd5e1;border:1px solid #334155;border-radius:4px;padding:2px 4px;font-size:0.75rem;cursor:pointer;">
              <option value="MIEMBRO" ${currentRole === 'MIEMBRO' ? 'selected' : ''}>MIEMBRO</option>
              <option value="VETERANO" ${currentRole === 'VETERANO' ? 'selected' : ''}>VETERANO</option>
              <option value="ADMIN" ${currentRole === 'ADMIN' ? 'selected' : ''} ${!isOwner && currentRole !== 'ADMIN' ? 'disabled' : ''}>ADMIN</option>
              ${isOwner ? `<option value="OWNER" ${currentRole === 'OWNER' ? 'selected' : ''}>OWNER</option>` : ''}
            </select>
          </div>
        </td>
        <td style="padding:10px 8px;">
          ${isActive 
            ? '<span class="status-badge" style="background:rgba(46,204,113,0.15);color:#2ecc71;border:1px solid #2ecc71;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">ACTIVE</span>' 
            : '<span class="status-badge" style="background:rgba(231,76,60,0.15);color:#e74c3c;border:1px solid #e74c3c;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:600;">INACTIVE</span>'
          }
        </td>
        <td style="padding:10px 8px;font-size:0.8rem;color:#cbd5e1;">${formatLastActivity(m.last_activity)}</td>
        <td style="padding:10px 8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-family:'JetBrains Mono',monospace;font-weight:600;color:#f8fafc;">${m.avg_tokens || 0}</span>
            <span class="status-badge status-${perfStatus.toLowerCase()}" style="font-size:0.7rem;padding:1px 6px;">${perfStatus}</span>
          </div>
        </td>
        <td style="padding:10px 8px;text-align:center;">
          <div style="display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap;">
            ${isActive 
              ? `<button onclick="changeUserStatus('${userId}', 'INACTIVE', '${escapeHTML(m.nick || '')}')" class="btn-danger" style="padding:3px 8px;font-size:0.72rem;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;" title="Desactivar piloto">🔴 Inactivar</button>`
              : `<button onclick="changeUserStatus('${userId}', 'ACTIVE', '${escapeHTML(m.nick || '')}')" class="btn-success" style="padding:3px 8px;font-size:0.72rem;background:#2ecc71;color:#fff;border:none;border-radius:4px;cursor:pointer;" title="Activar piloto">🟢 Activar</button>`
            }
            <button onclick="resetPilotPassword('${userId}', '${escapeHTML(m.nick || '')}', '${escapeHTML(m.email || '')}')" class="btn-secondary" style="padding:3px 8px;font-size:0.72rem;cursor:pointer;" title="Resetear contraseña institucional">🔑 Clave</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (tableBody) {
    tableBody.innerHTML = rowsHtml;
  } else {
    // Si no existe membersTableBody en el DOM, renderizar dentro del contenedor
    const container = document.getElementById('membersSectionBody');
    if (!container) return;
    const tableDiv = document.createElement('div');
    tableDiv.id = 'adminMembersTable';
    tableDiv.style.marginTop = '15px';
    tableDiv.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="data-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid rgba(148,163,184,0.2);text-align:left;">
              <th style="padding:10px 8px;">Piloto</th>
              <th style="padding:10px 8px;">Email</th>
              <th style="padding:10px 8px;">Rol</th>
              <th style="padding:10px 8px;">Estado</th>
              <th style="padding:10px 8px;">Últ. Actividad</th>
              <th style="padding:10px 8px;">Prom. Tokens</th>
              <th style="padding:10px 8px;text-align:center;">Gestión & Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
    container.appendChild(tableDiv);
  }
}

async function changeUserRole(userId, newRole, nick) {
  if (!confirm(`¿Confirmas actualizar el rango militar de "${nick}" a "${newRole}"?`)) {
    loadAdminPanel();
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: newRole })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al actualizar rango');
    }
    showToast(`✅ ${data.message || `Rango de ${nick} actualizado a ${newRole}`}`, 'success');
    loadAdminPanel();
  } catch (err) {
    console.error('Error cambiando rol:', err);
    showToast('❌ ' + err.message, 'error');
    loadAdminPanel();
  }
}

async function changeUserStatus(userId, newStatus, nick) {
  const actionText = newStatus === 'ACTIVE' ? 'ACTIVAR' : 'DESACTIVAR';
  if (!confirm(`¿Confirmas ${actionText} la cuenta de "${nick}"?`)) {
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al actualizar estado');
    }
    showToast(`✅ ${data.message || `Estado de ${nick} actualizado a ${newStatus}`}`, 'success');
    loadAdminPanel();
  } catch (err) {
    console.error('Error actualizando estado:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

async function resetPilotPassword(userId, nick, email) {
  if (!confirm(`¿Deseas resetear la contraseña de ${nick}?`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Error al resetear');
    const tempPass = data.temporaryPassword || data.data?.temporaryPassword;
    const pilotEmail = email || data.email || data.data?.email || '';
    if (tempPass) {
      showTemporaryPasswordModal(nick, tempPass, { email: pilotEmail });
    } else {
      alert(`✅ Contraseña de ${nick} reseteada.\n\nClave temporal: ${data.temporaryPassword}\n\nIndícasela al piloto para que inicie sesión.`);
    }
  } catch (err) {
    console.error('Error reseteando password:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

async function addNewMember() {
  const nickInput = document.getElementById('newMemberNick');
  const emailInput = document.getElementById('newMemberEmail');
  const roleInput = document.getElementById('newMemberRole');

  const nick = nickInput?.value?.trim();
  const email = emailInput?.value?.trim();
  const role = roleInput?.value || 'MIEMBRO';

  if (!nick || !email) {
    showToast('⚠️ Ingresa el nickname y correo institucional del piloto', 'warning');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ nick, email, role })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al registrar piloto');
    }

    const tempPass = data.temporaryPassword || data.data?.temporaryPassword;
    if (tempPass) {
      showTemporaryPasswordModal(nick, tempPass, { email, role });
    } else {
      showToast(`✅ Piloto ${nick} registrado con éxito`, 'success');
    }

    if (nickInput) nickInput.value = '';
    if (emailInput) emailInput.value = '';
    loadAdminPanel();
  } catch (err) {
    console.error('Error registrando piloto:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

function showTemporaryPasswordModal(nick, tempPass, options = {}) {
  // Cerrar y limpiar modal previo si estuviera presente
  closeTemporaryPasswordModal();

  let email = '';
  let role = 'MIEMBRO';
  let creationDate = '';

  if (typeof options === 'string') {
    email = options;
  } else if (options && typeof options === 'object') {
    email = options.email || '';
    role = options.role || 'MIEMBRO';
    creationDate = options.date || '';
  }

  if (!email) {
    email = document.getElementById('newMemberEmail')?.value?.trim() || 'piloto@ffaa.py';
  }

  if (!creationDate) {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    creationDate = `${day}/${month}/${year} ${hours}:${mins}`;
  }

  const modal = document.createElement('div');
  modal.id = 'tempPasswordModal';
  modal.className = 'modal show';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'tempPasswordModalTitle');
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.82)';
  modal.style.backdropFilter = 'blur(6px)';
  modal.style.zIndex = '9999';
  modal.style.padding = '1rem';
  modal.style.boxSizing = 'border-box';
  modal.style.overflowY = 'auto';

  modal.innerHTML = `
    <div class="modal-dialog tactical-corners" style="max-width: 580px; width: 100%; margin: auto; background: #070D1E; border: 1px solid #1E293B; border-radius: 6px; box-shadow: 0 20px 50px rgba(0,0,0,0.9); overflow: hidden; position: relative;">
      
      <!-- Barra superior de control del Modal (excluida de la imagen capturada) -->
      <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 16px; background: #081024; border-bottom: 1px solid #1E293B;">
        <div style="display:flex; align-items:center; gap: 8px; font-family:'Rajdhani',sans-serif; font-size: 0.85rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
          <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#22C55E; box-shadow:0 0 6px #22C55E;"></span>
          EMISIÓN OFICIAL DE CREDENCIALES · C4ISR
        </div>
        <button type="button" onclick="closeTemporaryPasswordModal()" aria-label="Cerrar modal" style="color: #94A3B8; background: none; border: none; font-size: 1.5rem; cursor: pointer; line-height: 1; padding: 0 4px;">&times;</button>
      </div>

      <!-- TARJETA DE CREDENCIAL TÁCTICA (Elemento capturado para la descarga JPG) -->
      <div id="tacticalCredentialCard" class="credential-modal-content" style="background: #0B132B; padding: 1.6rem 1.7rem; border: 2px solid #0038A8; border-top: 4px solid #D52B1E; border-bottom: 4px solid #0038A8; position: relative; color: #E2E8F0; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;">
        
        <!-- Marca de agua / Clasificación militar -->
        <div style="position:absolute; top: 10px; right: 14px; font-family:'JetBrains Mono',monospace; font-size: 0.65rem; color: rgba(148,163,184,0.45); letter-spacing: 1.2px; text-transform: uppercase;">
          CONFIDENCIAL // C4ISR
        </div>

        <!-- Encabezado con Logo del Escuadrón, Título y Subtítulo -->
        <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 1.15rem; border-bottom: 1px solid #2A3A5C; padding-bottom: 0.85rem;">
          <img src="/logo-escuadron.png" alt="Escuadrón PARAGUAY-FFAA" crossorigin="anonymous" style="width: 54px; height: 54px; object-fit: contain; flex-shrink: 0; filter: drop-shadow(0 0 8px rgba(0,56,168,0.6));" />
          <div style="flex: 1; min-width: 0;">
            <h3 id="tempPasswordModalTitle" style="margin: 0; font-family: 'Rajdhani', sans-serif; letter-spacing: 1.5px; color: #D4AF37; font-size: 1.35rem; font-weight: 700; text-transform: uppercase; line-height: 1.2;">
              CREDENCIALES DE COMBATE
            </h3>
            <div style="font-size: 0.78rem; color: #94A3B8; letter-spacing: 0.6px; font-family: 'JetBrains Mono', monospace; margin-top: 2px;">
              ALTA DE PILOTO · PROTOCOLO C4ISR
            </div>
          </div>
          <div style="text-align: right; font-family: 'JetBrains Mono', monospace; flex-shrink: 0;">
            <span style="display: inline-block; padding: 2px 7px; background: rgba(0,56,168,0.3); border: 1px solid #0038A8; color: #60A5FA; font-size: 0.68rem; border-radius: 4px; font-weight: 600;">
              ESTADO: ALTA
            </span>
          </div>
        </div>

        <!-- Datos del Piloto: Nick y Email Institucional -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1rem;">
          <!-- Nick del Piloto -->
          <div style="background: rgba(15, 23, 42, 0.75); padding: 8px 12px; border-radius: 4px; border: 1px solid #1E293B; border-left: 3px solid #38BDF8;">
            <span style="display: block; font-size: 0.68rem; text-transform: uppercase; color: #94A3B8; letter-spacing: 0.8px; font-weight: 600; margin-bottom: 2px;">
              Piloto / Indicativo:
            </span>
            <div id="credentialNick" style="font-size: 1.2rem; font-weight: 700; color: #FFFFFF; letter-spacing: 0.5px; word-break: break-word;">
              ${escapeHTML(nick || 'Piloto')}
            </div>
          </div>

          <!-- Email Institucional -->
          <div style="background: rgba(15, 23, 42, 0.75); padding: 8px 12px; border-radius: 4px; border: 1px solid #1E293B; border-left: 3px solid #60A5FA;">
            <span style="display: block; font-size: 0.68rem; text-transform: uppercase; color: #94A3B8; letter-spacing: 0.8px; font-weight: 600; margin-bottom: 2px;">
              Correo Institucional:
            </span>
            <div id="credentialEmail" style="font-size: 0.88rem; font-weight: 600; color: #CBD5E1; font-family: 'JetBrains Mono', monospace; word-break: break-all;">
              ${escapeHTML(email || 'piloto@ffaa.py')}
            </div>
          </div>
        </div>

        <!-- Contraseña Temporal y Fecha de Alta -->
        <div style="margin-bottom: 1rem; background: rgba(7, 13, 30, 0.95); border: 1.5px solid #2A3A5C; border-top: 2px solid #D4AF37; border-radius: 6px; padding: 0.9rem 0.8rem; text-align: center; position: relative;">
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 0 8px; margin-bottom: 4px;">
            <span style="font-size: 0.7rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
              Contraseña Temporal de Acceso
            </span>
            <span id="credentialDate" style="font-size: 0.7rem; color: #94A3B8; font-family: 'JetBrains Mono', monospace;">
              📅 ${escapeHTML(creationDate)}
            </span>
          </div>
          <div id="tempPasswordDisplay" style="font-family: 'JetBrains Mono', monospace; font-size: 1.75rem; font-weight: 700; color: #D4AF37; letter-spacing: 3px; user-select: all; padding: 0.2rem 0; word-break: break-all; text-shadow: 0 0 10px rgba(212,175,55,0.35);">
            ${escapeHTML(tempPass || '')}
          </div>
          <input type="hidden" id="rawTempPassword" value="${escapeHTML(tempPass || '')}" />
          <div style="font-size: 0.7rem; color: #64748B; margin-top: 2px; font-family: 'JetBrains Mono', monospace;">
            (Válida para el primer inicio de sesión · Sustitución obligatoria)
          </div>
        </div>

        <!-- Advertencia de Seguridad -->
        <div style="display: flex; align-items: flex-start; gap: 10px; background: rgba(213, 43, 30, 0.14); border: 1px solid #D52B1E; border-left: 4px solid #D52B1E; border-radius: 4px; padding: 8px 12px; font-size: 0.76rem; line-height: 1.4; color: #FFAAA6;">
          <span style="color: #D52B1E; font-size: 1.05rem; line-height: 1; flex-shrink: 0;">⚠️</span>
          <div>
            <strong style="color: #FF7B72; display: block; margin-bottom: 1px; letter-spacing: 0.5px; font-size: 0.78rem;">ADVERTENCIA DE SEGURIDAD:</strong>
            <span style="color: #E2E8F0;">Clave de un solo uso, caduca tras el primer inicio de sesión. Indícasela al combatiente para que configure su clave definitiva.</span>
          </div>
        </div>

        <!-- Pie de credencial -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.85rem; padding-top: 0.55rem; border-top: 1px solid rgba(42,58,92,0.6); font-size: 0.66rem; color: #64748B; font-family: 'JetBrains Mono', monospace;">
          <span>PARAGUAY-FFAA · METALSTORM</span>
          <span>ESTRICTAMENTE CONFIDENCIAL</span>
        </div>
      </div>

      <!-- Botones de Acción del Modal -->
      <div class="modal-footer" style="padding: 0.9rem 1.25rem; background: #070D1E; border-top: 1px solid #1E293B; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; align-items: center;">
        <button type="button" id="btnCopyTempPassword" onclick="copyTemporaryPassword()" class="btn-secondary" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0.65rem 1rem; font-size: 0.88rem; border: 1px solid #0038A8; color: #60A5FA; background: rgba(0, 56, 168, 0.2); font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 0.5px; cursor: pointer; border-radius: 4px; transition: all 0.2s;">
          📋 Copiar clave
        </button>
        <button type="button" id="downloadCredentialBtn" onclick="downloadCredentialImage()" class="btn-primary" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 0.65rem 1.25rem; font-size: 0.88rem; background: #1B4D3E; border: 1.5px solid #2ECC71; color: #FFFFFF; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 0.5px; cursor: pointer; border-radius: 4px; transition: all 0.2s;">
          📥 Descargar Credencial
        </button>
        <button type="button" onclick="closeTemporaryPasswordModal()" class="btn-secondary" style="padding: 0.65rem 1.1rem; font-size: 0.88rem; background: rgba(148,163,184,0.1); border: 1px solid #334155; color: #E2E8F0; font-family: 'Rajdhani', sans-serif; font-weight: 700; letter-spacing: 0.5px; cursor: pointer; border-radius: 4px;">
          Entendido
        </button>
      </div>
    </div>
  `;

  // Cerrar al hacer clic fuera del contenido del modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeTemporaryPasswordModal();
    }
  });

  // Cerrar con la tecla ESC
  const handleEsc = (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      closeTemporaryPasswordModal();
    }
  };
  window._tempPasswordModalEscHandler = handleEsc;
  document.addEventListener('keydown', handleEsc);

  document.body.appendChild(modal);
}

async function downloadCredentialImage() {
  const modal = document.querySelector('.credential-modal-content');
  if (!modal) {
    console.warn('⚠️ No se encontró el contenedor .credential-modal-content');
    return;
  }

  const nickText = document.getElementById('credentialNick')?.textContent || 'Piloto';
  const cleanNick = nickText.trim().replace(/[/\\?%*:|"<>]/g, '_') || 'Piloto';
  const downloadBtn = document.getElementById('downloadCredentialBtn');
  const origHtml = downloadBtn ? downloadBtn.innerHTML : '';

  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.innerHTML = '⏳ Generando JPG...';
  }

  try {
    if (typeof html2canvas === 'function') {
      const canvas = await html2canvas(modal, {
        backgroundColor: '#0B132B',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      // Convertir a JPG
      const link = document.createElement('a');
      link.download = `${cleanNick}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast('✅ Credencial descargada', 'success');
    } else {
      // Fallback robusto nativo Canvas 2D
      await generateCredentialViaCanvasFallback(cleanNick);
    }
  } catch (error) {
    console.error('❌ Error generando credencial con html2canvas, intentando fallback:', error);
    try {
      await generateCredentialViaCanvasFallback(cleanNick);
    } catch (fbErr) {
      console.error('❌ Fallback también falló:', fbErr);
      showToast('❌ Error generando credencial', 'error');
    }
  } finally {
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = origHtml;
    }
  }
}

async function generateCredentialViaCanvasFallback(nick) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Fondo #0B132B
  ctx.fillStyle = '#0B132B';
  ctx.fillRect(0, 0, 800, 500);

  // Bordes: #0038A8 y #D52B1E
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#0038A8';
  ctx.strokeRect(2, 2, 796, 496);

  // Borde superior rojo Paraguay (#D52B1E)
  ctx.fillStyle = '#D52B1E';
  ctx.fillRect(0, 0, 800, 6);

  // Borde inferior azul armada (#0038A8)
  ctx.fillStyle = '#0038A8';
  ctx.fillRect(0, 494, 800, 6);

  // Corner tactical brackets en oro (#D4AF37)
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  // Top-left
  ctx.beginPath(); ctx.moveTo(14, 28); ctx.lineTo(14, 14); ctx.lineTo(28, 14); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(786, 28); ctx.lineTo(786, 14); ctx.lineTo(772, 14); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(14, 472); ctx.lineTo(14, 486); ctx.lineTo(28, 486); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(786, 472); ctx.lineTo(786, 486); ctx.lineTo(772, 486); ctx.stroke();

  // Intentar cargar y dibujar el logo del escuadrón
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      logoImg.onload = () => {
        ctx.drawImage(logoImg, 35, 25, 60, 60);
        resolve();
      };
      logoImg.onerror = () => resolve();
      logoImg.src = '/logo-escuadron.png';
      setTimeout(resolve, 800);
    });
  } catch (e) {
    // Si falla se continúa sin logo gráfico
  }

  // Título y subtítulo
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 26px "Rajdhani", sans-serif';
  ctx.fillText('CREDENCIALES DE COMBATE', 110, 52);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillText('ALTA DE PILOTO · PROTOCOLO C4ISR', 110, 74);

  // Marca clasificada
  ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('CONFIDENCIAL // PROTOCOLO C4ISR', 765, 36);
  ctx.textAlign = 'left';

  // Línea divisoria
  ctx.strokeStyle = '#2A3A5C';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(35, 96); ctx.lineTo(765, 96); ctx.stroke();

  // Datos
  const email = document.getElementById('credentialEmail')?.textContent || 'piloto@ffaa.py';
  const pass = document.getElementById('rawTempPassword')?.value || document.getElementById('tempPasswordDisplay')?.textContent || '';
  const date = document.getElementById('credentialDate')?.textContent?.replace('📅', '').trim() || new Date().toLocaleDateString('es-ES');

  // Caja Nick (Izquierda)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(35, 112, 355, 70);
  ctx.strokeStyle = '#1E293B';
  ctx.strokeRect(35, 112, 355, 70);
  ctx.fillStyle = '#38BDF8';
  ctx.fillRect(35, 112, 4, 70);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px "Rajdhani", sans-serif';
  ctx.fillText('PILOTO / INDICATIVO:', 48, 132);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px "Rajdhani", sans-serif';
  ctx.fillText(nick, 48, 162);

  // Caja Email (Derecha)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(410, 112, 355, 70);
  ctx.strokeStyle = '#1E293B';
  ctx.strokeRect(410, 112, 355, 70);
  ctx.fillStyle = '#60A5FA';
  ctx.fillRect(410, 112, 4, 70);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px "Rajdhani", sans-serif';
  ctx.fillText('CORREO INSTITUCIONAL:', 423, 132);
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillText(email, 423, 160);

  // Caja Contraseña Temporal
  ctx.fillStyle = '#070D1E';
  ctx.fillRect(35, 196, 730, 105);
  ctx.strokeStyle = '#2A3A5C';
  ctx.strokeRect(35, 196, 730, 105);
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(35, 196, 730, 2);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '11px "Rajdhani", sans-serif';
  ctx.fillText('CONTRASEÑA TEMPORAL DE ACCESO', 50, 218);
  ctx.textAlign = 'right';
  ctx.fillText('FECHA DE ALTA: ' + date, 745, 218);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 30px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(pass, 400, 262);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#64748B';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('(Válida para el primer inicio de sesión · Sustitución obligatoria)', 400, 286);
  ctx.textAlign = 'left';

  // Caja Advertencia de Seguridad
  ctx.fillStyle = 'rgba(213, 43, 30, 0.16)';
  ctx.fillRect(35, 315, 730, 80);
  ctx.strokeStyle = '#D52B1E';
  ctx.strokeRect(35, 315, 730, 80);
  ctx.fillStyle = '#D52B1E';
  ctx.fillRect(35, 315, 4, 80);

  ctx.fillStyle = '#FF7B72';
  ctx.font = 'bold 13px "Rajdhani", sans-serif';
  ctx.fillText('⚠️ ADVERTENCIA DE SEGURIDAD:', 50, 338);

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '12px "Inter", sans-serif';
  ctx.fillText('Clave de un solo uso, caduca tras el primer inicio de sesión.', 50, 360);
  ctx.fillText('Indícasela al combatiente para que configure su clave definitiva al ingresar al sistema.', 50, 380);

  // Pie
  ctx.fillStyle = '#64748B';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText('PARAGUAY-FFAA · METALSTORM', 35, 440);
  ctx.textAlign = 'right';
  ctx.fillText('SISTEMA DE MANDO Y CONTROL C4ISR', 765, 440);
  ctx.textAlign = 'left';

  // Descarga
  const link = document.createElement('a');
  link.download = `${nick}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('✅ Credencial descargada', 'success');
}

function closeTemporaryPasswordModal() {
  if (window._tempPasswordModalEscHandler) {
    document.removeEventListener('keydown', window._tempPasswordModalEscHandler);
    window._tempPasswordModalEscHandler = null;
  }
  const modal = document.getElementById('tempPasswordModal');
  if (modal) {
    modal.classList.remove('show');
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }
}

async function copyTemporaryPassword() {
  const inputEl = document.getElementById('rawTempPassword');
  const password = inputEl ? inputEl.value : (document.getElementById('tempPasswordDisplay')?.textContent || '').trim();
  const btn = document.getElementById('btnCopyTempPassword');

  if (!password) {
    showToast('⚠️ No hay contraseña para copiar', 'warning');
    return;
  }

  let success = false;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(password);
      success = true;
    } catch (err) {
      console.warn('Clipboard API falló, ejecutando fallback:', err);
      success = fallbackCopyPassword(password);
    }
  } else {
    success = fallbackCopyPassword(password);
  }

  if (success) {
    showToast('📋 Contraseña copiada al portapapeles', 'success');
    if (btn) {
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '✅ ¡Copiada!';
      btn.style.background = 'rgba(46, 204, 113, 0.25)';
      btn.style.borderColor = '#2ecc71';
      btn.style.color = '#2ecc71';
      setTimeout(() => {
        if (btn && document.body.contains(btn)) {
          btn.innerHTML = originalHtml;
          btn.style.background = 'rgba(0, 56, 168, 0.2)';
          btn.style.borderColor = '#0038A8';
          btn.style.color = '#60A5FA';
        }
      }, 2500);
    }
  } else {
    showToast('⚠️ Selecciona y copia la clave manualmente', 'warning');
  }
}

function fallbackCopyPassword(password) {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = password;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Error en fallbackCopyPassword:', err);
    return false;
  }
}

function showUploadEventModal() {
  showModal('uploadEventModal');
}

async function uploadEventBulk() {
  const eventIdInput = document.getElementById('eventIdInput');
  const bulkDataInput = document.getElementById('eventBulkData');

  const event_id = eventIdInput?.value?.trim();
  const text = bulkDataInput?.value?.trim();

  if (!event_id || !text) {
    showToast('⚠️ Ingresa el ID del evento y los registros', 'warning');
    return;
  }

  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const performances = [];

  for (const line of lines) {
    const parts = line.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const nick = parts[0];
      const tokens = parseInt(parts[1], 10) || 0;
      const role = parts[2] ? parts[2].toUpperCase() : 'MIEMBRO';
      performances.push({ nick, tokens, role });
    }
  }

  if (performances.length === 0) {
    showToast('⚠️ Formato incorrecto. Usa: Nick, Tokens, Rol (uno por línea)', 'warning');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/admin/bulk-upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ event_id, performances })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error en carga masiva');
    }
    showToast(`✅ ${data.message || 'Carga masiva procesada con éxito'}`, 'success');
    closeModal('uploadEventModal');
    if (bulkDataInput) bulkDataInput.value = '';
    loadAdminPanel();
  } catch (err) {
    console.error('Error en carga masiva:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

function filterMembers() {
  const search = (document.getElementById('memberSearch')?.value || '').toLowerCase().trim();
  const role = document.getElementById('roleFilter')?.value || '';
  const weeks = document.getElementById('weeksFilter')?.value || '';
  const perfStatus = document.getElementById('perfStatusFilter')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';

  const filtered = adminMembersCache.filter(m => {
    const nick = (m.nick || '').toLowerCase();
    const email = (m.email || '').toLowerCase();
    if (search && !nick.includes(search) && !email.includes(search)) return false;
    if (role && (m.role || '').toUpperCase() !== role.toUpperCase()) return false;
    if (perfStatus && (m.perf_status || '').toUpperCase() !== perfStatus.toUpperCase()) return false;
    if (status && (m.status || 'ACTIVE').toUpperCase() !== status.toUpperCase()) return false;
    if (weeks) {
      const w = Number(m.weeks_evaluated) || 0;
      if (weeks === '1' && w !== 1) return false;
      if (weeks === '2' && w !== 2) return false;
      if (weeks === '3' && w !== 3) return false;
      if (weeks === '4+' && w < 4) return false;
    }
    return true;
  });

  renderAdminMembersTable(filtered);
}

function resetMemberFilters() {
  ['memberSearch', 'roleFilter', 'weeksFilter', 'perfStatusFilter', 'statusFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderAdminMembersTable(adminMembersCache);
}

function toggleMembersSection() {
  const body = document.getElementById('membersSectionBody');
  const icon = document.getElementById('membersSectionToggleIcon');
  if (body) {
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? 'block' : 'none';
    if (icon) icon.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(-90deg)';
  }
}

function refreshAdminStats() {
  loadAdminPanel();
}

// ============================================================
// ========== 3. RENDIMIENTOS GLOBALES DEL ESCUADRÓN ==========
// ============================================================
let allPerformancesCache = [];

async function loadAllPerformances() {
  const tableEl = document.getElementById('allPerformancesTable');
  if (tableEl) tableEl.innerHTML = '<div class="loading-text">Cargando rendimientos globales...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/admin/all-performances`, { headers: getAuthHeaders() });
    let performances = [];
    if (res.ok) {
      const data = await res.json();
      performances = data.performances || (Array.isArray(data) ? data : []);
    } else {
      const fallback = await fetch(`${API_BASE}/api/performances/my-history`, { headers: getAuthHeaders() });
      if (fallback.ok) {
        const fbData = await fallback.json();
        performances = fbData.history || fbData.performances || (Array.isArray(fbData) ? fbData : []);
      }
    }

    allPerformancesCache = performances;
    renderAllPerformances(allPerformancesCache);
    updateAllPerformancesStats(allPerformancesCache);

  } catch (err) {
    console.error('Error en loadAllPerformances:', err);
    if (tableEl) tableEl.innerHTML = '<p style="color:#f87171;text-align:center;padding:2rem;">⚠️ Error cargando rendimientos globales</p>';
  }
}

function updateAllPerformancesStats(list) {
  const totalEl = document.getElementById('totalPerformances');
  const avgEl = document.getElementById('avgPerfTokens');
  const maxEl = document.getElementById('maxPerfTokens');
  const verdeEl = document.getElementById('verdeCount');

  if (totalEl) totalEl.textContent = list.length;
  if (list.length > 0) {
    const sum = list.reduce((s, p) => s + (Number(p.tokens) || 0), 0);
    const avg = (sum / list.length).toFixed(1);
    const max = Math.max(...list.map(p => Number(p.tokens) || 0));
    const verde = list.filter(p => p.status === 'VERDE').length;

    if (avgEl) avgEl.textContent = avg;
    if (maxEl) maxEl.textContent = max;
    if (verdeEl) verdeEl.textContent = verde;
  }
}

function renderAllPerformances(list) {
  const tableEl = document.getElementById('allPerformancesTable');
  if (!tableEl) return;

  if (list.length === 0) {
    tableEl.innerHTML = '<div style="text-align:center;padding:2rem;color:#94a3b8;">No se encontraron registros de rendimiento</div>';
    return;
  }

  tableEl.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="data-table" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid rgba(148,163,184,0.2);text-align:left;">
            <th style="padding:8px;">Piloto</th>
            <th style="padding:8px;">Evento</th>
            <th style="padding:8px;">Tokens</th>
            <th style="padding:8px;">Días</th>
            <th style="padding:8px;">Grupo</th>
            <th style="padding:8px;">Estado</th>
            <th style="padding:8px;">Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(p => `
            <tr style="border-bottom:1px solid rgba(148,163,184,0.1);">
              <td style="padding:8px;font-weight:600;color:#f8fafc;">${escapeHTML(p.nick || 'Piloto')}</td>
              <td style="padding:8px;font-size:0.8rem;color:#94a3b8;">${escapeHTML(p.event_id || '-')}</td>
              <td style="padding:8px;font-weight:700;font-family:'JetBrains Mono',monospace;color:#38bdf8;">${p.tokens ?? 0}</td>
              <td style="padding:8px;">${p.days_connected ?? 0}</td>
              <td style="padding:8px;">${p.flew_in_group ? '✅ Sí' : '❌ No'}</td>
              <td style="padding:8px;"><span class="status-badge status-${(p.status || 'VERDE').toLowerCase()}">${p.status || 'VERDE'}</span></td>
              <td style="padding:8px;font-size:0.75rem;color:#94a3b8;">${p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function filterAllPerformances() {
  const search = (document.getElementById('allPerfSearch')?.value || '').toLowerCase();
  const role = document.getElementById('allPerfRoleFilter')?.value || '';
  const minTok = parseInt(document.getElementById('minTokensFilter')?.value) || 0;
  const maxTok = parseInt(document.getElementById('maxTokensFilter')?.value) || 999;
  const status = document.getElementById('statusFilter')?.value || '';
  const eventId = (document.getElementById('eventIdFilter')?.value || '').toLowerCase();

  const filtered = allPerformancesCache.filter(p => {
    const nick = (p.nick || '').toLowerCase();
    const ev = (p.event_id || '').toLowerCase();
    if (search && !nick.includes(search)) return false;
    if (role && p.role !== role) return false;
    if (p.tokens < minTok || p.tokens > maxTok) return false;
    if (status && p.status !== status) return false;
    if (eventId && !ev.includes(eventId)) return false;
    return true;
  });

  renderAllPerformances(filtered);
  updateAllPerformancesStats(filtered);
}

function resetAllPerfFilters() {
  ['allPerfSearch', 'allPerfRoleFilter', 'minTokensFilter', 'maxTokensFilter', 'statusFilter', 'eventIdFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderAllPerformances(allPerformancesCache);
  updateAllPerformancesStats(allPerformancesCache);
}

function exportAllPerformances() {
  window.open(`${API_BASE}/api/admin/export-performances`, '_blank');
}

// ============================================================
// ========== 4. AYUDA, DOCTRINA Y MODAL DE SOPORTE ==========
// ============================================================
function loadHelpView() {
  const modal = document.getElementById('helpModal');
  if (modal) {
    showModal('helpModal');
  } else {
    showToast('📖 Consulta el manual operativo y biblioteca de normativas', 'info');
  }
}

function showHelpModal() {
  showModal('helpModal');
}

function closeHelpModal() {
  closeModal('helpModal');
}

// ============================================================
// ========== 5. EXPORTACIÓN & OWNER PANEL ==========
// ============================================================
function loadExportView() {
  console.log('[METALSTORM] Vista de exportación cargada');
}

async function loadOwnerPanel() {
  console.log('[METALSTORM] Panel de Owner cargado');
}

// ============================================================
// ✅ EXPOSICIÓN GLOBAL EN WINDOW PARA TODOS LOS HANDLERS HTML
// ============================================================
window.showView = showView;
window.loadViewData = loadViewData;
window.loadDashboardData = loadDashboardData;
window.loadNormativas = loadNormativas;
window.renderNormativas = renderNormativas;
window.applyNormativasFilters = applyNormativasFilters;
window.resetNormativasFilters = resetNormativasFilters;
window.loadAdminPanel = loadAdminPanel;
window.renderAdminStats = renderAdminStats;
window.renderPilotsByStatus = renderPilotsByStatus;
window.renderAdminMembersTable = renderAdminMembersTable;
window.changeUserRole = changeUserRole;
window.changeUserStatus = changeUserStatus;
window.resetPilotPassword = resetPilotPassword;
window.filterMembers = filterMembers;
window.resetMemberFilters = resetMemberFilters;
window.toggleMembersSection = toggleMembersSection;
window.refreshAdminStats = refreshAdminStats;
window.addNewMember = addNewMember;
window.showTemporaryPasswordModal = showTemporaryPasswordModal;
window.closeTemporaryPasswordModal = closeTemporaryPasswordModal;
window.copyTemporaryPassword = copyTemporaryPassword;
window.downloadCredentialImage = downloadCredentialImage;
window.fallbackCopyPassword = fallbackCopyPassword;
window.showUploadEventModal = showUploadEventModal;
window.uploadEventBulk = uploadEventBulk;
window.loadAdminEvents = loadAdminEvents;
window.loadAllPerformances = loadAllPerformances;
window.renderAllPerformances = renderAllPerformances;
window.updateAllPerformancesStats = updateAllPerformancesStats;
window.filterAllPerformances = filterAllPerformances;
window.resetAllPerfFilters = resetAllPerfFilters;
window.exportAllPerformances = exportAllPerformances;
window.loadHelpView = loadHelpView;
window.showHelpModal = showHelpModal;
window.closeHelpModal = closeHelpModal;
window.loadExportView = loadExportView;
window.loadOwnerPanel = loadOwnerPanel;
window.loadHistorial = loadHistorial;
window.displayHistorial = displayHistorial;
window.loadPlanesView = loadPlanesView;
window.loadUserPlanes = loadUserPlanes;
if (typeof loadPersonalProfile === 'function') {
  window.loadPersonalProfile = loadPersonalProfile;
}
if (typeof loadSettings === 'function') {
  window.loadSettings = loadSettings;
}
window.loadPerformanceForm = loadPerformanceForm;
window.loadActiveMembers = loadActiveMembers;
window.loadOpenEvents = loadOpenEvents;
window.showModal = showModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.getAuthHeaders = getAuthHeaders;
window.refreshDashboard = refreshDashboard;
window.refreshCurrentView = refreshCurrentView;
window.updateViewStats = updateViewStats;
window.selectDays = selectDays;
window.clampTokens = clampTokens;
window.onTargetPilotChange = onTargetPilotChange;
window.adaptFormToEventType = adaptFormToEventType;
window.exportPlanesXLSX = exportPlanesXLSX;
window.toggleMobileDrawer = toggleMobileDrawer;
window.openMobileDrawer = openMobileDrawer;
window.closeMobileDrawer = closeMobileDrawer;

// ============================================================
// GESTIÓN DE MODELOS DE AERONAVES (CATÁLOGO ADMIN / OWNER v3.6.0)
// ============================================================

window.currentAdminPlaneModels = [];
window.filteredAdminPlaneModels = [];

/**
 * Cargar y renderizar modelos de aeronaves para administradores
 */
async function loadAdminPlaneModels(forceRefresh = false) {
  const container = document.getElementById('adminPlaneModelsList');
  if (!container) return;

  if (container.innerHTML.trim() === '' || forceRefresh) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#a0aec0;">
        <span style="font-size:2.2rem;display:block;margin-bottom:8px;">⏳</span>
        <p style="margin:0;font-size:1.1rem;font-weight:600;">Sincronizando catálogo oficial de cazas...</p>
        <small style="color:#718096;">Consultando base de datos táctica C4ISR</small>
      </div>`;
  }

  try {
    const models = await apiGetPlaneModels(true);
    window.currentAdminPlaneModels = Array.isArray(models) ? models : [];

    // Calcular métricas
    const total = window.currentAdminPlaneModels.length;
    const active = window.currentAdminPlaneModels.filter(m => m.is_active !== false).length;
    const inactive = window.currentAdminPlaneModels.filter(m => m.is_active === false).length;
    const highTier = window.currentAdminPlaneModels.filter(m => Number(m.tier) >= 4).length;

    const elTotal = document.getElementById('catalogTotalModels');
    const elActive = document.getElementById('catalogActiveModels');
    const elInactive = document.getElementById('catalogInactiveModels');
    const elHighTier = document.getElementById('catalogHighTierModels');

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = active;
    if (elInactive) elInactive.textContent = inactive;
    if (elHighTier) elHighTier.textContent = highTier;

    filterAdminPlaneModels();
  } catch (err) {
    console.error('❌ [AdminPlanes] Error cargando catálogo:', err);
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:2.5rem;background:rgba(231,76,60,0.1);border:1px solid #e74c3c;border-radius:6px;color:#e74c3c;">
        <span style="font-size:2rem;display:block;margin-bottom:8px;">⚠️</span>
        <h4 style="margin:0 0 6px 0;">Error al cargar catálogo de aeronaves</h4>
        <p style="margin:0 0 1rem 0;font-size:0.9rem;">${escapeHTML(err.message || 'Error de conexión')}</p>
        <button onclick="loadAdminPlaneModels(true)" class="btn-primary" style="background:#e74c3c;border-color:#e74c3c;">
          🔄 Reintentar Carga
        </button>
      </div>`;
  }
}

/**
 * Filtrar modelos según búsqueda de texto, tier militar y estado
 */
function filterAdminPlaneModels() {
  const query = (document.getElementById('catalogSearchInput')?.value || '').trim().toLowerCase();
  const tierFilter = (document.getElementById('catalogTierFilter')?.value || '').trim();
  const statusFilter = (document.getElementById('catalogStatusFilter')?.value || '').trim();

  let filtered = [...window.currentAdminPlaneModels];

  if (query) {
    filtered = filtered.filter(m => {
      const name = (m.name || '').toLowerCase();
      const type = (m.type || '').toLowerCase();
      const id = String(m.id || '').toLowerCase();
      const special = (m.special_name || '').toLowerCase();
      const passive = (m.passive_name || '').toLowerCase();
      return name.includes(query) || type.includes(query) || id.includes(query) || special.includes(query) || passive.includes(query);
    });
  }

  if (tierFilter) {
    filtered = filtered.filter(m => String(m.tier || 3) === tierFilter);
  }

  if (statusFilter === 'active') {
    filtered = filtered.filter(m => m.is_active !== false);
  } else if (statusFilter === 'inactive') {
    filtered = filtered.filter(m => m.is_active === false);
  }

  window.filteredAdminPlaneModels = filtered;
  renderAdminPlaneModels(filtered);
}

/**
 * Resetear filtros del catálogo
 */
function resetCatalogFilters() {
  const sInput = document.getElementById('catalogSearchInput');
  const tFilter = document.getElementById('catalogTierFilter');
  const stFilter = document.getElementById('catalogStatusFilter');

  if (sInput) sInput.value = '';
  if (tFilter) tFilter.value = '';
  if (stFilter) stFilter.value = 'active';

  filterAdminPlaneModels();
}

/**
 * Renderizar tarjetas de aeronaves en el panel de administración
 */
function renderAdminPlaneModels(models) {
  const container = document.getElementById('adminPlaneModelsList');
  if (!container) return;

  if (!models || models.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;background:rgba(17,24,39,0.7);border:1px dashed #374151;border-radius:8px;color:#a0aec0;">
        <span style="font-size:2.5rem;display:block;margin-bottom:10px;">🛩️</span>
        <h4 style="margin:0 0 8px 0;color:#fff;">No se encontraron modelos de aeronaves</h4>
        <p style="margin:0 0 1rem 0;font-size:0.9rem;">Prueba modificando los filtros de búsqueda o agrega un nuevo modelo al catálogo.</p>
        <button onclick="openCreatePlaneModelModal()" class="btn-primary">
          ➕ Registrar Nueva Aeronave
        </button>
      </div>`;
    return;
  }

  const tierColors = {
    5: { bg: 'rgba(212,175,55,0.2)', border: '#d4af37', text: '#ffd700', label: 'TIER 5 · ÉLITE' },
    4: { bg: 'rgba(155,89,182,0.2)', border: '#9b59b6', text: '#c084fc', label: 'TIER 4 · PESADO' },
    3: { bg: 'rgba(52,152,219,0.2)', border: '#3498db', text: '#60a5fa', label: 'TIER 3 · MULTIRROL' },
    2: { bg: 'rgba(46,204,113,0.2)', border: '#2ecc71', text: '#34d399', label: 'TIER 2 · TÁCTICO' },
    1: { bg: 'rgba(149,165,166,0.2)', border: '#95a5a6', text: '#cbd5e0', label: 'TIER 1 · BASE' }
  };

  const cardsHtml = models.map(m => {
    const tierConfig = tierColors[m.tier || 3] || tierColors[3];
    const isActive = m.is_active !== false;
    const stats = m.stats_real || {};
    const vel = stats.velocidad || stats.speed || '2200';
    const agi = stats.agilidad || stats.agility || '85';
    const armor = stats.blindaje || stats.armor || '1200';
    const power = stats.potencia_armas || stats.firepower || '1200';

    const specialName = m.special_name || 'Habilidad Estándar';
    const passiveName = m.passive_name || 'Sistemas Básicos';

    return `
      <div class="card tactical-corners" style="display:flex;flex-direction:column;justify-content:space-between;padding:1.1rem;background:rgba(17,24,39,0.92);border:1px solid ${isActive ? 'rgba(55,65,81,0.8)' : 'rgba(231,76,60,0.5)'};${!isActive ? 'opacity:0.75;' : ''}">
        <!-- Top Bar: Tier, ID y Status -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <div style="display:flex;gap:6px;align-items:center;">
              <span style="background:${tierConfig.bg};border:1px solid ${tierConfig.border};color:${tierConfig.text};font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:3px;font-family:var(--font-tactical);">
                ${tierConfig.label}
              </span>
              <span style="background:rgba(255,255,255,0.08);color:#cbd5e0;font-size:0.7rem;padding:2px 6px;border-radius:3px;font-family:var(--font-mono);">
                ID: ${escapeHTML(String(m.id))}
              </span>
            </div>
            <div>
              ${isActive ? 
                `<span style="background:rgba(46,204,113,0.15);border:1px solid #2ecc71;color:#2ecc71;font-size:0.7rem;font-weight:600;padding:2px 8px;border-radius:10px;">
                  ● ACTIVO
                </span>` : 
                `<span style="background:rgba(231,76,60,0.15);border:1px solid #e74c3c;color:#e74c3c;font-size:0.7rem;font-weight:600;padding:2px 8px;border-radius:10px;">
                  ✕ DESACTIVADO
                </span>`
              }
            </div>
          </div>

          <!-- Nombre y Tipo -->
          <div style="margin-bottom:12px;">
            <h3 style="margin:0 0 4px 0;font-size:1.15rem;color:#ffffff;font-family:var(--font-tactical);letter-spacing:0.5px;">
              ${escapeHTML(m.name)}
            </h3>
            <div style="font-size:0.8rem;color:#94a3b8;display:flex;align-items:center;gap:6px;">
              <span>🎯</span>
              <span>${escapeHTML(m.type || 'Caza de Combate')}</span>
            </div>
          </div>

          <!-- Estadísticas Tácticas -->
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;background:rgba(10,15,25,0.8);padding:8px;border-radius:4px;border:1px solid #1e293b;margin-bottom:12px;text-align:center;">
            <div>
              <div style="font-size:0.65rem;color:#64748b;text-transform:uppercase;">Velocidad</div>
              <div style="font-size:0.85rem;font-weight:700;color:#38bdf8;font-family:var(--font-mono);">${vel} <span style="font-size:0.65rem;">km/h</span></div>
            </div>
            <div>
              <div style="font-size:0.65rem;color:#64748b;text-transform:uppercase;">Agilidad</div>
              <div style="font-size:0.85rem;font-weight:700;color:#4ade80;font-family:var(--font-mono);">${agi}</div>
            </div>
            <div>
              <div style="font-size:0.65rem;color:#64748b;text-transform:uppercase;">Blindaje</div>
              <div style="font-size:0.85rem;font-weight:700;color:#fbbf24;font-family:var(--font-mono);">${armor}</div>
            </div>
            <div>
              <div style="font-size:0.65rem;color:#64748b;text-transform:uppercase;">Potencia</div>
              <div style="font-size:0.85rem;font-weight:700;color:#f87171;font-family:var(--font-mono);">${power}</div>
            </div>
          </div>

          <!-- Habilidades -->
          <div style="font-size:0.75rem;color:#cbd5e0;margin-bottom:12px;display:flex;flex-direction:column;gap:4px;">
            <div style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              <span style="color:#60a5fa;">⚡</span>
              <span style="color:#94a3b8;">Esp:</span>
              <strong style="color:#e2e8f0;">${escapeHTML(specialName)}</strong>
            </div>
            <div style="display:flex;align-items:center;gap:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              <span style="color:#34d399;">🛡️</span>
              <span style="color:#94a3b8;">Pas:</span>
              <strong style="color:#e2e8f0;">${escapeHTML(passiveName)}</strong>
            </div>
          </div>
        </div>

        <!-- Botones de Acción -->
        <div style="display:flex;gap:8px;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;margin-top:auto;">
          <button onclick="openEditPlaneModelModal('${escapeHTML(String(m.id))}')" class="btn-secondary btn-sm" style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;" title="Editar Parámetros">
            ✏️ Editar
          </button>
          <button onclick="viewPlaneModelFullDetails('${escapeHTML(String(m.id))}')" class="btn-secondary btn-sm" style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;" title="Ver Ficha Técnica">
            📋 Ficha
          </button>
          ${isActive ? 
            `<button onclick="togglePlaneModelStatus('${escapeHTML(String(m.id))}', true)" class="btn-danger btn-sm" style="padding:4px 8px;" title="Desactivar del Catálogo">
              🚫
            </button>` : 
            `<button onclick="togglePlaneModelStatus('${escapeHTML(String(m.id))}', false)" class="btn-primary btn-sm" style="background:#2ecc71;border-color:#2ecc71;padding:4px 8px;" title="Reactivar en Catálogo">
              ♻️
            </button>`
          }
        </div>
      </div>`;
  }).join('');

  container.innerHTML = cardsHtml;
}

/**
 * Abrir modal para crear una nueva aeronave
 */
function openCreatePlaneModelModal() {
  const form = document.getElementById('planeModelForm');
  if (form) form.reset();

  const modeEl = document.getElementById('modelFormMode');
  const idEl = document.getElementById('modelFormId');
  const titleEl = document.getElementById('planeModelModalTitle');
  const saveBtn = document.getElementById('btnSavePlaneModel');

  if (modeEl) modeEl.value = 'create';
  if (idEl) {
    idEl.value = '';
    idEl.disabled = false;
    idEl.readOnly = false;
  }
  if (titleEl) titleEl.textContent = '✈️ Registrar Nuevo Modelo de Avión';
  if (saveBtn) saveBtn.textContent = '💾 Guardar Modelo en Catálogo';

  // Valores predeterminados tácticos
  const tierEl = document.getElementById('modelFormTier');
  const activeEl = document.getElementById('modelFormActive');
  const velEl = document.getElementById('statVelocidad');
  const agiEl = document.getElementById('statAgilidad');
  const armEl = document.getElementById('statBlindaje');
  const powEl = document.getElementById('statArmas');

  if (tierEl) tierEl.value = '3';
  if (activeEl) activeEl.value = 'true';
  if (velEl) velEl.value = '2100';
  if (agiEl) agiEl.value = '88';
  if (armEl) armEl.value = '1250';
  if (powEl) powEl.value = '1300';

  const sFus = document.getElementById('sysFuselaje');
  const sMot = document.getElementById('sysMotor');
  const sAvi = document.getElementById('sysAvionica');
  const sArm = document.getElementById('sysArmas');

  if (sFus) sFus.checked = true;
  if (sMot) sMot.checked = true;
  if (sAvi) sAvi.checked = true;
  if (sArm) sArm.checked = true;

  const specLvls = document.getElementById('modelFormSpecialLevels');
  const passLvls = document.getElementById('modelFormPassiveLevels');

  if (specLvls) specLvls.value = JSON.stringify({ "1": "Evasión +10%", "2": "Evasión +20%" }, null, 2);
  if (passLvls) passLvls.value = JSON.stringify({ "1": "Blindaje +8%", "2": "Blindaje +16%" }, null, 2);

  showModal('planeModelModal');
}

/**
 * Abrir modal para editar una aeronave existente
 */
function openEditPlaneModelModal(id) {
  const model = window.currentAdminPlaneModels.find(m => String(m.id) === String(id));
  if (!model) {
    showToast('❌ Modelo de aeronave no encontrado', 'error');
    return;
  }

  const modeEl = document.getElementById('modelFormMode');
  const idEl = document.getElementById('modelFormId');
  const nameEl = document.getElementById('modelFormName');
  const typeEl = document.getElementById('modelFormType');
  const tierEl = document.getElementById('modelFormTier');
  const activeEl = document.getElementById('modelFormActive');
  const titleEl = document.getElementById('planeModelModalTitle');
  const saveBtn = document.getElementById('btnSavePlaneModel');

  if (modeEl) modeEl.value = 'edit';
  if (idEl) {
    idEl.value = model.id;
    idEl.disabled = true;
    idEl.readOnly = true;
  }
  if (nameEl) nameEl.value = model.name || '';
  if (typeEl) typeEl.value = model.type || '';
  if (tierEl) tierEl.value = String(model.tier || 3);
  if (activeEl) activeEl.value = model.is_active !== false ? 'true' : 'false';
  if (titleEl) titleEl.textContent = `✏️ Modificar Aeronave: ${model.name}`;
  if (saveBtn) saveBtn.textContent = '💾 Actualizar Parámetros Oficiales';

  // Stats
  const stats = model.stats_real || {};
  const velEl = document.getElementById('statVelocidad');
  const agiEl = document.getElementById('statAgilidad');
  const armEl = document.getElementById('statBlindaje');
  const powEl = document.getElementById('statArmas');

  if (velEl) velEl.value = stats.velocidad || stats.speed || '2000';
  if (agiEl) agiEl.value = stats.agilidad || stats.agility || '85';
  if (armEl) armEl.value = stats.blindaje || stats.armor || '1200';
  if (powEl) powEl.value = stats.potencia_armas || stats.firepower || '1200';

  // Habilidades
  const specName = document.getElementById('modelFormSpecialName');
  const specLvls = document.getElementById('modelFormSpecialLevels');
  const passName = document.getElementById('modelFormPassiveName');
  const passLvls = document.getElementById('modelFormPassiveLevels');

  if (specName) specName.value = model.special_name || '';
  if (specLvls) {
    specLvls.value = model.special_levels ? 
      (typeof model.special_levels === 'object' ? JSON.stringify(model.special_levels, null, 2) : String(model.special_levels)) : '';
  }

  if (passName) passName.value = model.passive_name || '';
  if (passLvls) {
    passLvls.value = model.passive_levels ? 
      (typeof model.passive_levels === 'object' ? JSON.stringify(model.passive_levels, null, 2) : String(model.passive_levels)) : '';
  }

  // Sistemas
  const sistemas = model.sistemas_disponibles || {};
  const sFus = document.getElementById('sysFuselaje');
  const sMot = document.getElementById('sysMotor');
  const sAvi = document.getElementById('sysAvionica');
  const sArm = document.getElementById('sysArmas');

  if (sFus) sFus.checked = sistemas.fuselaje !== false;
  if (sMot) sMot.checked = sistemas.motor !== false;
  if (sAvi) sAvi.checked = sistemas.avionica !== false;
  if (sArm) sArm.checked = sistemas.armas !== false;

  showModal('planeModelModal');
}

/**
 * Guardar modelo (Creación o Actualización)
 */
async function handleSavePlaneModel(event) {
  event.preventDefault();

  const mode = document.getElementById('modelFormMode')?.value || 'create';
  const id = document.getElementById('modelFormId')?.value?.trim();
  const name = document.getElementById('modelFormName')?.value?.trim();
  const type = document.getElementById('modelFormType')?.value?.trim();
  const tier = parseInt(document.getElementById('modelFormTier')?.value, 10) || 3;
  const isActive = document.getElementById('modelFormActive')?.value === 'true';

  if (!id) {
    showToast('❌ El identificador militar es obligatorio', 'error');
    return;
  }
  if (!name || name.length < 2) {
    showToast('❌ El nombre del avión debe tener al menos 2 caracteres', 'error');
    return;
  }
  if (!type || type.length < 2) {
    showToast('❌ El tipo de avión es obligatorio', 'error');
    return;
  }

  // Parsear JSON o fallback
  let specialLevels = null;
  const specText = document.getElementById('modelFormSpecialLevels')?.value?.trim();
  if (specText) {
    try {
      specialLevels = JSON.parse(specText);
    } catch {
      specialLevels = { "1": specText };
    }
  }

  let passiveLevels = null;
  const passText = document.getElementById('modelFormPassiveLevels')?.value?.trim();
  if (passText) {
    try {
      passiveLevels = JSON.parse(passText);
    } catch {
      passiveLevels = { "1": passText };
    }
  }

  const velocidad = parseInt(document.getElementById('statVelocidad')?.value, 10) || 2000;
  const agilidad = parseInt(document.getElementById('statAgilidad')?.value, 10) || 85;
  const blindaje = parseInt(document.getElementById('statBlindaje')?.value, 10) || 1200;
  const potenciaArmas = parseInt(document.getElementById('statArmas')?.value, 10) || 1200;

  const statsReal = {
    velocidad,
    agilidad,
    blindaje,
    potencia_armas: potenciaArmas
  };

  const sistemasDisponibles = {
    fuselaje: document.getElementById('sysFuselaje')?.checked ?? true,
    motor: document.getElementById('sysMotor')?.checked ?? true,
    avionica: document.getElementById('sysAvionica')?.checked ?? true,
    armas: document.getElementById('sysArmas')?.checked ?? true
  };

  const specialName = document.getElementById('modelFormSpecialName')?.value?.trim() || null;
  const passiveName = document.getElementById('modelFormPassiveName')?.value?.trim() || null;

  const payload = {
    id,
    name,
    type,
    tier,
    special_name: specialName,
    special_levels: specialLevels,
    passive_name: passiveName,
    passive_levels: passiveLevels,
    stats_real: statsReal,
    sistemas_disponibles: sistemasDisponibles,
    is_active: isActive
  };

  const saveBtn = document.getElementById('btnSavePlaneModel');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Guardando...';
  }

  try {
    if (mode === 'create') {
      await apiCreatePlaneModel(payload);
    } else {
      await apiUpdatePlaneModel(id, payload);
    }

    closeModal('planeModelModal');
    await loadAdminPlaneModels(true);

    // Refrescar selector de aeronaves en hangar si está disponible
    if (typeof loadPlaneModels === 'function') {
      loadPlaneModels();
    }
  } catch (err) {
    console.error('❌ Error guardando modelo:', err);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Guardar Modelo en Catálogo';
    }
  }
}

/**
 * Desactivar (Soft-Delete) o Reactivar Modelo
 */
async function togglePlaneModelStatus(id, currentlyActive) {
  const model = window.currentAdminPlaneModels.find(m => String(m.id) === String(id));
  const planeName = model ? model.name : id;

  if (currentlyActive) {
    const confirmed = confirm(`¿Confirmas la DESACTIVACIÓN operativa del modelo "${planeName}" (ID: ${id})?\n\nEl modelo no aparecerá en el catálogo para nuevos pilotos, pero el historial y cazas existentes se preservarán.`);
    if (!confirmed) return;

    try {
      await apiDeletePlaneModel(id);
      await loadAdminPlaneModels(true);
      if (typeof loadPlaneModels === 'function') loadPlaneModels();
    } catch (err) {
      console.error('Error desactivando modelo:', err);
    }
  } else {
    try {
      await apiRestorePlaneModel(id);
      await loadAdminPlaneModels(true);
      if (typeof loadPlaneModels === 'function') loadPlaneModels();
    } catch (err) {
      console.error('Error reactivando modelo:', err);
    }
  }
}

/**
 * Inspección completa de ficha técnica
 */
function viewPlaneModelFullDetails(id) {
  const model = window.currentAdminPlaneModels.find(m => String(m.id) === String(id));
  if (!model) {
    showToast('❌ Modelo no encontrado', 'error');
    return;
  }

  const titleEl = document.getElementById('planeModelDetailTitle');
  const bodyEl = document.getElementById('planeModelDetailBody');

  if (titleEl) titleEl.textContent = `📋 Ficha Técnica: ${model.name}`;
  if (bodyEl) {
    const stats = model.stats_real || {};
    const sistemas = model.sistemas_disponibles || {};

    bodyEl.innerHTML = `
      <div style="background:rgba(10,15,25,0.9);padding:1rem;border-radius:6px;border:1px solid #2d3748;margin-bottom:1rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <h4 style="margin:0;font-size:1.2rem;color:#d4af37;font-family:var(--font-tactical);">${escapeHTML(model.name)}</h4>
            <div style="font-size:0.85rem;color:#94a3b8;">${escapeHTML(model.type)} · Tier ${model.tier || 3}</div>
          </div>
          <div>
            <span style="font-family:var(--font-mono);font-size:0.8rem;background:rgba(255,255,255,0.1);padding:3px 8px;border-radius:4px;color:#fff;">
              ID: ${escapeHTML(String(model.id))}
            </span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:12px;font-size:0.85rem;">
          <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:4px;">
            <div style="color:#64748b;font-size:0.75rem;">VELOCIDAD PUNTA</div>
            <div style="font-size:1rem;font-weight:700;color:#38bdf8;font-family:var(--font-mono);">${stats.velocidad || 2000} km/h</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:4px;">
            <div style="color:#64748b;font-size:0.75rem;">AGILIDAD DE COMBATE</div>
            <div style="font-size:1rem;font-weight:700;color:#4ade80;font-family:var(--font-mono);">${stats.agilidad || 85} / 100</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:4px;">
            <div style="color:#64748b;font-size:0.75rem;">RESISTENCIA DE BLINDAJE</div>
            <div style="font-size:1rem;font-weight:700;color:#fbbf24;font-family:var(--font-mono);">${stats.blindaje || 1200} HP</div>
          </div>
          <div style="background:rgba(255,255,255,0.03);padding:8px;border-radius:4px;">
            <div style="color:#64748b;font-size:0.75rem;">POTENCIA DE ARMAS</div>
            <div style="font-size:1rem;font-weight:700;color:#f87171;font-family:var(--font-mono);">${stats.potencia_armas || 1200} PTS</div>
          </div>
        </div>

        <div style="border-top:1px solid #2d3748;padding-top:10px;margin-bottom:10px;">
          <div style="font-size:0.8rem;color:#60a5fa;font-weight:600;margin-bottom:4px;">⚡ HABILIDAD ESPECIAL</div>
          <div style="font-size:0.9rem;font-weight:600;color:#fff;">${escapeHTML(model.special_name || 'Sin habilidad especial')}</div>
          <pre style="background:rgba(0,0,0,0.5);padding:6px;border-radius:4px;font-size:0.75rem;color:#94a3b8;margin:4px 0 0 0;overflow-x:auto;">${escapeHTML(JSON.stringify(model.special_levels || {}, null, 2))}</pre>
        </div>

        <div style="border-top:1px solid #2d3748;padding-top:10px;margin-bottom:10px;">
          <div style="font-size:0.8rem;color:#34d399;font-weight:600;margin-bottom:4px;">🛡️ HABILIDAD PASIVA</div>
          <div style="font-size:0.9rem;font-weight:600;color:#fff;">${escapeHTML(model.passive_name || 'Sin habilidad pasiva')}</div>
          <pre style="background:rgba(0,0,0,0.5);padding:6px;border-radius:4px;font-size:0.75rem;color:#94a3b8;margin:4px 0 0 0;overflow-x:auto;">${escapeHTML(JSON.stringify(model.passive_levels || {}, null, 2))}</pre>
        </div>

        <div style="border-top:1px solid #2d3748;padding-top:10px;">
          <div style="font-size:0.8rem;color:#d4af37;font-weight:600;margin-bottom:6px;">⚙️ SUBSISTEMAS DE MEJORA STARFORM 2.0</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <span style="font-size:0.75rem;padding:2px 8px;border-radius:3px;background:${sistemas.fuselaje !== false ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'};color:${sistemas.fuselaje !== false ? '#2ecc71' : '#e74c3c'};">
              Fuselaje: ${sistemas.fuselaje !== false ? 'Habilitado' : 'No'}
            </span>
            <span style="font-size:0.75rem;padding:2px 8px;border-radius:3px;background:${sistemas.motor !== false ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'};color:${sistemas.motor !== false ? '#2ecc71' : '#e74c3c'};">
              Motor: ${sistemas.motor !== false ? 'Habilitado' : 'No'}
            </span>
            <span style="font-size:0.75rem;padding:2px 8px;border-radius:3px;background:${sistemas.avionica !== false ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'};color:${sistemas.avionica !== false ? '#2ecc71' : '#e74c3c'};">
              Aviónica: ${sistemas.avionica !== false ? 'Habilitado' : 'No'}
            </span>
            <span style="font-size:0.75rem;padding:2px 8px;border-radius:3px;background:${sistemas.armas !== false ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'};color:${sistemas.armas !== false ? '#2ecc71' : '#e74c3c'};">
              Armamento: ${sistemas.armas !== false ? 'Habilitado' : 'No'}
            </span>
          </div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button onclick="closeModal('planeModelDetailModal')" class="btn-secondary">Cerrar</button>
        <button onclick="closeModal('planeModelDetailModal'); openEditPlaneModelModal('${escapeHTML(String(model.id))}');" class="btn-primary">
          ✏️ Modificar Este Caza
        </button>
      </div>`;
  }

  showModal('planeModelDetailModal');
}

window.loadAdminPlaneModels = loadAdminPlaneModels;
window.filterAdminPlaneModels = filterAdminPlaneModels;
window.resetCatalogFilters = resetCatalogFilters;
window.renderAdminPlaneModels = renderAdminPlaneModels;
window.openCreatePlaneModelModal = openCreatePlaneModelModal;
window.openEditPlaneModelModal = openEditPlaneModelModal;
window.handleSavePlaneModel = handleSavePlaneModel;
window.togglePlaneModelStatus = togglePlaneModelStatus;
window.viewPlaneModelFullDetails = viewPlaneModelFullDetails;

console.log('✅ [Views] Todas las funciones de vistas expuestas correctamente en window');
