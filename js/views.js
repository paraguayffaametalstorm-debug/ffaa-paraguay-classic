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
      loadPerformanceForm();
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
      loadSettings();
      break;
    case VIEWS.EXPORT:
      loadExportView();
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

  // Header User Info
  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = user.nick || user.email;

  const userRoleEl = document.getElementById('userRole');
  if (userRoleEl) {
    userRoleEl.innerHTML = `<span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span>`;
  }

  // 1. Stat Cards
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

  // 2. Squadron Goal Progress Bar
  const squadAvg = summary?.squadStats?.avg_tokens || 192.4;
  const goalTarget = 175;
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

  // 3. Top 5 Pilots Leaderboard
  const topPilots = summary?.topPilots || [
    { nick: 'Viper_PY', role: 'OWNER', avg_tokens: 228, perf_status: 'VERDE' },
    { nick: 'Guarani_Ace', role: 'ADMIN', avg_tokens: 215, perf_status: 'VERDE' },
    { nick: 'Itaipu_Lead', role: 'VETERANO', avg_tokens: 205, perf_status: 'VERDE' },
    { nick: 'Chaco_Fox', role: 'MIEMBRO', avg_tokens: 198, perf_status: 'VERDE' },
    { nick: 'Falcon_Asuncion', role: 'MIEMBRO', avg_tokens: 192, perf_status: 'VERDE' }
  ];

  renderTopPilotsLeaderboard(topPilots);

  // 4. Trend Chart (Last 4 Events)
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

  // Prepare 4 data points (personal tokens & squad avg)
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

      <!-- Target 175 Line (Green Dashed) -->
      <line x1="${padX}" y1="${targetY}" x2="${width - padX}" y2="${targetY}" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.7"/>
      <text x="${width - padX + 5}" y="${targetY + 4}" fill="#10B981" font-size="10" font-family="'JetBrains Mono', monospace">175</text>

      <!-- Squad Average Line (Gold) -->
      <path d="${squadPath}" fill="none" stroke="#D4AF37" stroke-width="2" stroke-dasharray="3 3"/>
      ${squadPoints.map((val, idx) => `
        <circle cx="${getX(idx)}" cy="${getY(val)}" r="3.5" fill="#D4AF37"/>
      `).join('')}

      <!-- Personal Performance Area & Line (Blue) -->
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
  fetch(`${API_BASE}/api/admin/members/active`, { headers: getAuthHeaders() })
  .then(res => res.json())
  .then(data => {
    const sel = document.getElementById('performanceTarget');
    if (!sel) return;
    sel.innerHTML = '<option value="self">— Mi propio rendimiento —</option>';
    (data.members || []).forEach(m => {
      if (m.user_id === currentUser.user_id) return;
      const opt = document.createElement('option');
      opt.value = m.user_id;
      opt.textContent = `${m.nick} (${m.role})`;
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
  .then(res => res.json())
  .then(data => {
    const prev = document.getElementById('windowClosedNotice');
    if (prev) prev.remove();

    if (data.event) {
      displayEventInfo(data.event, data.inWindow, data.windowCloseMs);
      const fieldsEl = document.getElementById('performanceFields');
      if (data.inWindow) {
        fieldsEl.style.display = 'block';
      } else {
        fieldsEl.style.display = 'none';
        renderWindowClosedNotice(data.event.type);
      }
    } else {
      document.getElementById('eventInfo').innerHTML = `
<div class="black-market-warning">
<p>⚠️ No hay evento abierto actualmente</p>
<p>Espera a que el liderazgo habilite el próximo evento</p>
</div>
`;
      document.getElementById('performanceFields').style.display = 'none';
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
<td colspan="8" class="text-center">
<p>No tienes aeronaves registradas</p>
<button onclick="showAddPlaneModal()" class="btn-primary mt-10">➕ Agregar primera aeronave</button>
</td>
</tr>
`;
    return;
  }
  tbody.innerHTML = planes.map(plane => `
<tr>
<td data-label="Aeronave"><strong>${plane.model_name || plane.name || plane.avion_id || '-'}</strong></td>
<td data-label="Tipo">${plane.type || '-'}</td>
<td data-label="Nivel">
<span class="status-badge" style="background:rgba(212,175,55,0.2); color:#d4af37; border:1px solid #d4af37;">
Nv. ${plane.nivel}
</span>
</td>
<td data-label="Especial">${plane.especial_nombre || '<span style="color:#666">—</span>'}</td>
<td data-label="Pasiva">${plane.pasiva_nombre || '<span style="color:#666">—</span>'}</td>
<td data-label="Mod 1">${plane.mod1_nombre || plane.mod1_id || '<span style="color:#666">—</span>'}</td>
<td data-label="Mod 2">${plane.mod2_nombre || plane.mod2_id || '<span style="color:#666">—</span>'}</td>
<td data-label="Acciones" style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center;">
<button onclick="openAircraftStats(${plane.id})" class="btn-secondary" style="padding:4px 8px; font-size:0.75rem; border-color:var(--blue-telemetry); color:var(--blue-telemetry);" title="Ver Telemetría"><i data-lucide="gauge" style="width:13px;height:13px;"></i> Radar</button>
<button onclick="editPlane(${plane.id})" class="btn-secondary" style="padding:4px 8px; font-size:0.75rem;" title="Editar"><i data-lucide="edit-3" style="width:13px;height:13px;"></i></button>
<button onclick="deletePlane(${plane.id})" class="btn-danger" style="padding:4px 8px; font-size:0.75rem;" title="Eliminar"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
</td>
</tr>
`).join('');
  if (typeof refreshLucideIcons === 'function') {
    setTimeout(refreshLucideIcons, 30);
  }
}

function updatePlanesStats(planes) {
  const totalEl = document.getElementById('totalPlanes');
  const avgEl   = document.getElementById('avgPlaneLevel');
  const maxEl   = document.getElementById('maxPlaneLevel');
  const specEl  = document.getElementById('planesWithSpecial');

  if (totalEl) totalEl.textContent = planes.length;
  if (planes.length > 0) {
    const sum = planes.reduce((s, p) => s + (parseInt(p.nivel, 10) || 0), 0);
    const avg = sum / planes.length;
    const max = Math.max(...planes.map(p => parseInt(p.nivel, 10) || 0));
    const withSpecial = planes.filter(p => !!p.especial_nombre).length;

    if (avgEl)  avgEl.textContent = avg.toFixed(1);
    if (maxEl)  maxEl.textContent = max;
    if (specEl) specEl.textContent = withSpecial;
  } else {
    if (avgEl)  avgEl.textContent = '0';
    if (maxEl)  maxEl.textContent = '0';
    if (specEl) specEl.textContent = '0';
  }
}

// Global aliases for full cross-module compatibility
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
  const filtered = allUserPlanes.filter(p => {
    const name = (p.model_name || p.avion_id || '').toLowerCase();
    if (search && !name.includes(search)) return false;
    if (type && p.type !== type) return false;
    if (p.nivel < minLvl || p.nivel > maxLvl) return false;
    if (special === 'with'    && !p.especial_nombre) return false;
    if (special === 'without' &&  p.especial_nombre) return false;
    if (passive === 'with'    && !p.pasiva_nombre)   return false;
    if (passive === 'without' &&  p.pasiva_nombre)   return false;
    return true;
  });
  displayPlanes(filtered);
  updatePlanesStats(filtered);
}

function applyPlaneFilters() { filterPlanes(); }

// ========== ESTADÍSTICAS DE AERONAVE — HEXÁGONO REAL ==========
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
  ['planeTypeFilter','minLevelFilter','maxLevelFilter','specialSkillFilter','passiveSkillFilter']
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
      if (!val) return;
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setSel('specialSkill', plane.especial_nombre);
    setSel('passiveSkill', plane.pasiva_nombre);
    setSel('mod1',         plane.mod1_id);
    setSel('mod1Level',    plane.mod1_lvl);
    setSel('mod2',         plane.mod2_id);
    setSel('mod2Level',    plane.mod2_lvl);
  });
}

// ========== HISTORIAL ==========
function loadHistorial() {
  if (!currentUser) return;
  fetch(`${API_BASE}/api/performances/my-history`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    displayHistorial(data || []);
  })
  .catch(err => {
    console.error('Error cargando historial:', err);
    showToast('❌ Error al cargar historial', 'error');
  });
}

function displayHistorial(history) {
  const container = document.getElementById('historialContent');
  if (!container) return;
  if (history.length === 0) {
    container.innerHTML = `
<div class="no-results">
<p>📊 Aún no tienes registros de rendimiento</p>
<p>Participa en el próximo evento para generar tu historial</p>
</div>
`;
    return;
  }
  container.innerHTML = history.map(record => `
<div class="historial-item">
<h4>${record.event_id}</h4>
<p><strong>Tokens:</strong> ${record.tokens}</p>
<p><strong>Días conectado:</strong> ${record.days_connected}</p>
<p><strong>Estado:</strong> <span class="status-badge status-${record.status.toLowerCase()}">${record.status}</span></p>
<p><strong>Fecha:</strong> ${new Date(record.created_at).toLocaleDateString()}</p>
${record.notes ? `<p><strong>Notas:</strong> ${record.notes}</p>` : ''}
</div>
`).join('');
}

// ========== PERFIL PERSONAL ==========
function loadPersonalProfile() {
  if (!currentUser) return;
  fetch(`${API_BASE}/api/auth/me`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    displayProfile(data.user);
  })
  .catch(err => {
    console.error('Error cargando perfil:', err);
    showToast('❌ Error al cargar perfil', 'error');
  });
}

function displayProfile(user) {
  const container = document.getElementById('profileContent');
  if (!container) return;
  container.innerHTML = `
<div class="profile-card">
<h3>${user.nick || 'Sin nickname'}</h3>
<p><strong>Email:</strong> ${user.email}</p>
<p><strong>Rol:</strong> <span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span></p>
<p><strong>Miembro desde:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
<p><strong>Última actividad:</strong> ${user.last_activity ? new Date(user.last_activity).toLocaleDateString() : 'N/A'}</p>
</div>
`;
}

// ========== NORMATIVAS ==========
let allNormativasData = [];

function loadNormativas() {
  const container = document.getElementById('normativasList');
  if (container) {
    container.innerHTML = `<p class="loading-text"><span class="loading-spinner"></span> Cargando normativas...</p>`;
  }
  fetch(`${API_BASE}/api/normativas`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    allNormativasData = data.normativas || [];
    applyNormativasFilters();
  })
  .catch(err => {
    console.error('Error cargando normativas:', err);
    showToast('❌ Error al cargar normativas', 'error');
    const container = document.getElementById('normativasList');
    if (container) container.innerHTML = `<div class="no-results"><p>❌ Error al cargar documentos</p></div>`;
  });
}

function displayNormativas(normativas) {
  const container = document.getElementById('normativasList');
  const countEl   = document.getElementById('normativasCount');
  if (countEl) {
    countEl.innerHTML = normativas.length > 0
      ? `<p>Mostrando <strong>${normativas.length}</strong> documento${normativas.length !== 1 ? 's' : ''}</p>`
      : '';
  }
  if (!container) return;
  if (normativas.length === 0) {
    container.innerHTML = `
<div class="no-results">
<p>📚 No hay normativas que coincidan con los filtros</p>
<p>Intenta con otros criterios de búsqueda</p>
</div>`;
    return;
  }
  const tipoLabel = {
    NORMATIVA_GENERAL:         'Normativa General',
    REGLAMENTO_INTERNO:        'Reglamento Interno',
    MANUAL_PROCEDIMIENTOS:     'Manual de Procedimientos',
    PROTOCOLO_OPERACIONAL:     'Protocolo Operacional',
    CIRCULAR_INFORMATIVA:      'Circular Informativa',
    RESOLUCION_ADMINISTRATIVA: 'Resolución Administrativa'
  };
  const catIcon = {
    FUNDAMENTAL:    '🏛️',
    OPERACIONAL:    '⚙️',
    DISCIPLINARIA:  '⚖️',
    ADMINISTRATIVA: '📋',
    TECNICA:        '🔧'
  };
  const confStyle = {
    PUBLICO:      'status-verde',
    INTERNO:      'status-naranja',
    CONFIDENCIAL: 'status-rojo'
  };

  container.innerHTML = normativas.map(doc => {
    const fechaAprobacion = doc.fecha_aprobacion
      ? new Date(doc.fecha_aprobacion + 'T00:00:00').toLocaleDateString('es-PY', { day:'2-digit', month:'short', year:'numeric' })
      : '—';
    const fechaVigor = doc.fecha_entrada_vigor
      ? new Date(doc.fecha_entrada_vigor + 'T00:00:00').toLocaleDateString('es-PY', { day:'2-digit', month:'short', year:'numeric' })
      : '—';
    const tipo     = tipoLabel[doc.tipo_documento] || doc.tipo_documento || '—';
    const icon     = catIcon[doc.categoria] || '📄';
    const confCls  = confStyle[doc.nivel_confidencialidad] || 'status-negro';
    const confLabel = doc.nivel_confidencialidad || 'PÚBLICO';
    const tieneArchivo = !!doc.archivo_url;

    return `
<div class="normativa-card">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:var(--sp-2); margin-bottom:var(--sp-3);">
    <h4 style="margin:0; flex:1; min-width:0;">${icon} ${doc.titulo}</h4>
    <span class="status-badge ${confCls}" style="flex-shrink:0;">${confLabel}</span>
  </div>
  <div style="display:flex; flex-wrap:wrap; gap:var(--sp-2); margin-bottom:var(--sp-3);">
    <span class="role-badge" style="background:rgba(212,175,55,0.12);color:#d4af37;border-color:#d4af37;">
      ${doc.codigo}${doc.version ? ' v'+doc.version : ''}
    </span>
    <span class="role-badge" style="background:rgba(23,162,184,0.12);color:#17a2b8;border-color:#17a2b8;">
      ${tipo}
    </span>
    <span class="role-badge" style="background:rgba(40,167,69,0.12);color:#28a745;border-color:#28a745;">
      ${doc.estado || 'VIGENTE'}
    </span>
  </div>
  ${doc.resumen ? `<p style="font-size:var(--fs-sm);color:#c8d4e8;margin-bottom:var(--sp-3);line-height:1.5;">${doc.resumen}</p>` : ''}
  <div class="normativa-meta">
    <span>📅 Aprobado: ${fechaAprobacion}</span>
    <span>⚡ Vigente desde: ${fechaVigor}</span>
    ${doc.emitido_por ? `<span>🖊️ ${doc.emitido_por}</span>` : ''}
    ${doc.ambito_aplicacion ? `<span>🎯 ${doc.ambito_aplicacion.replace(/_/g,' ')}</span>` : ''}
  </div>
  ${tieneArchivo ? `
  <div style="margin-top:var(--sp-3); display:flex; gap:var(--sp-3);">
    <button onclick="downloadNormativa('${doc.id}')" class="btn-secondary">📥 Descargar PDF</button>
    <button onclick="window.open('${doc.archivo_url}','_blank')" class="btn-secondary">👁️ Ver</button>
  </div>` : `<p style="font-size:var(--fs-xs);color:#6c757d;margin-top:var(--sp-3);">Sin archivo adjunto</p>`}
</div>`;
  }).join('');
}

function filterNormativas() {
  applyNormativasFilters();
}

function applyNormativasFilters() {
  const search   = (document.getElementById('normativasSearch')?.value || '').toLowerCase().trim();
  const cat      = (document.getElementById('categoriaFilter')?.value || '').toUpperCase();
  const tipo     = (document.getElementById('tipoDocFilter')?.value || '').toUpperCase();
  const orden    = document.getElementById('ordenFilter')?.value || 'recientes';

  let lista = [...allNormativasData];
  if (search) {
    lista = lista.filter(d =>
      (d.titulo || '').toLowerCase().includes(search) ||
      (d.codigo || '').toLowerCase().includes(search) ||
      (d.resumen || '').toLowerCase().includes(search)
    );
  }
  if (cat)  lista = lista.filter(d => (d.categoria || '').toUpperCase() === cat);
  if (tipo) lista = lista.filter(d => (d.tipo_documento || '').toUpperCase() === tipo);
  lista.sort((a, b) => {
    switch (orden) {
      case 'antiguos':  return new Date(a.fecha_aprobacion) - new Date(b.fecha_aprobacion);
      case 'codigo':    return (a.codigo || '').localeCompare(b.codigo || '');
      case 'titulo':    return (a.titulo || '').localeCompare(b.titulo || '');
      case 'categoria': return (a.categoria || '').localeCompare(b.categoria || '');
      default:          return new Date(b.fecha_aprobacion) - new Date(a.fecha_aprobacion);
    }
  });
  displayNormativas(lista);
}

function showUploadNormativaModal() {
  showModal('uploadNormativaModal');
}

function downloadNormativa(id) {
  window.open(`${API_BASE}/api/normativas/${id}/download`, '_blank');
}

// ========== PANEL DE ADMINISTRACIÓN ==========
let allMembersData = [];
let _membersSectionOpen = true;

function toggleMembersSection() {
  _membersSectionOpen = !_membersSectionOpen;
  const body = document.getElementById('membersSectionBody');
  const icon = document.getElementById('membersSectionToggleIcon');
  if (!body) return;
  if (_membersSectionOpen) {
    body.style.display = '';
    if (icon) icon.style.transform = 'rotate(0deg)';
  } else {
    body.style.display = 'none';
    if (icon) icon.style.transform = 'rotate(180deg)';
  }
}

function loadAdminPanel() {
  if (!currentUser || (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN')) return;
  loadMembersList();
  loadBlackMarketControl();
}

function updateAdminStatsFromMembers() {
  if (!allMembersData || allMembersData.length === 0) {
    document.getElementById('totalMembers').textContent    = '-';
    document.getElementById('adminAvgTokens').textContent  = '-';
    document.getElementById('atRiskMembers').textContent   = '-';
    document.getElementById('lastUpdate').textContent      = '-';
    return;
  }
  const activeMembers = allMembersData.filter(m => m.squad_status === 'ACTIVE');
  const totalActivos = activeMembers.length;
  const membersWithAvg = activeMembers.filter(m => m.avg_tokens !== null && m.avg_tokens !== undefined);
  let avgGeneral = 0;
  if (membersWithAvg.length > 0) {
    const sumAvg = membersWithAvg.reduce((acc, m) => acc + m.avg_tokens, 0);
    avgGeneral = Math.round((sumAvg / membersWithAvg.length) * 100) / 100;
  }
  const atRisk = activeMembers.filter(m => {
    const status = (m.perf_status || '').toUpperCase();
    return status === 'ROJO' || status === 'NEGRO';
  }).length;
  const now = new Date();
  const formattedDateTime = now.toLocaleDateString('es-PY') + ' ' + now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  document.getElementById('totalMembers').textContent   = totalActivos;
  document.getElementById('adminAvgTokens').textContent = avgGeneral;
  document.getElementById('atRiskMembers').textContent  = atRisk;
  document.getElementById('lastUpdate').textContent     = formattedDateTime;
}

function loadMembersList() {
  fetch(`${API_BASE}/api/admin/members`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    allMembersData = data.members || [];
    displayPilotsByStatus(allMembersData);
    displayMembersList(allMembersData);
    updateAdminStatsFromMembers();
  })
  .catch(err => {
    console.error('Error cargando miembros:', err);
    showToast('❌ Error al cargar lista de miembros', 'error');
  });
}

function displayPilotsByStatus(members) {
  const container = document.getElementById('pilotsByStatus');
  if (!container) return;
  const counts = { VERDE: 0, NARANJA: 0, ROJO: 0, NEGRO: 0, PENDIENTE: 0 };
  members.forEach(m => {
    const st = (m.perf_status || 'PENDIENTE').toUpperCase();
    if (counts[st] !== undefined) counts[st]++;
    else counts.PENDIENTE++;
  });
  const total = members.length;
  container.innerHTML = `
<div class="admin-stats" style="margin-top:0;">
<div class="admin-stat">
<div class="stat-label">🟢 VERDE</div>
<div class="stat-value" style="color:var(--status-verde,#4caf50);">${counts.VERDE}</div>
<div style="font-size:0.75rem;color:var(--text-muted);">${total ? Math.round(counts.VERDE/total*100) : 0}%</div>
</div>
<div class="admin-stat">
<div class="stat-label">🟠 NARANJA</div>
<div class="stat-value" style="color:var(--status-naranja,#ff9800);">${counts.NARANJA}</div>
<div style="font-size:0.75rem;color:var(--text-muted);">${total ? Math.round(counts.NARANJA/total*100) : 0}%</div>
</div>
<div class="admin-stat">
<div class="stat-label">🔴 ROJO</div>
<div class="stat-value" style="color:var(--status-rojo,#f44336);">${counts.ROJO}</div>
<div style="font-size:0.75rem;color:var(--text-muted);">${total ? Math.round(counts.ROJO/total*100) : 0}%</div>
</div>
<div class="admin-stat">
<div class="stat-label">⚫ NEGRO</div>
<div class="stat-value" style="color:var(--text-muted,#888);">${counts.NEGRO}</div>
<div style="font-size:0.75rem;color:var(--text-muted);">${total ? Math.round(counts.NEGRO/total*100) : 0}%</div>
</div>
<div class="admin-stat">
<div class="stat-label">⏳ PENDIENTE</div>
<div class="stat-value">${counts.PENDIENTE}</div>
<div style="font-size:0.75rem;color:var(--text-muted);">${total ? Math.round(counts.PENDIENTE/total*100) : 0}%</div>
</div>
</div>
`;
}

function displayMembersList(members) {
  const tbody = document.getElementById('membersTableBody');
  if (!tbody) return;
  if (members.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center">No se encontraron miembros con los filtros aplicados</td></tr>`;
    return;
  }
  const isOwner = currentUser && currentUser.role === 'OWNER';
  tbody.innerHTML = members.map(member => {
    const perfSt   = (member.perf_status  || 'PENDIENTE').toUpperCase();
    const squadSt  = (member.squad_status || 'ACTIVE').toUpperCase();
    const roleNorm = (member.role || 'MIEMBRO').toUpperCase();
    const actionLabel = squadSt === 'ACTIVE' ? 'Inactivar' : 'Reactivar';
    const actionClass = squadSt === 'ACTIVE' ? 'btn-danger' : 'btn-secondary';
    const newStatus   = squadSt === 'ACTIVE' ? 'INACTIVE'   : 'ACTIVE';
    const lastAct     = member.last_activity
      ? new Date(member.last_activity).toLocaleDateString('es-PY') : '-';
    const roleBtn = (isOwner && roleNorm !== 'OWNER') ? `
<button onclick="openChangeRoleModal(${member.user_id}, '${member.nick}', '${roleNorm}')"
class="btn-secondary" style="padding:5px 10px;font-size:0.8rem;">
🎖️ Cambiar Rol
</button>` : '';
    return `<tr>
<td data-label="Piloto"><strong>${member.nick}</strong></td>
<td data-label="Rol"><span class="role-badge role-${roleNorm.toLowerCase()}">${roleNorm}</span></td>
<td data-label="Últ. Actividad">${lastAct}</td>
<td data-label="Prom. Tokens">${member.avg_tokens !== null ? member.avg_tokens : '-'}</td>
<td data-label="Semanas">${member.weeks_evaluated || '0'}</td>
<td data-label="Tendencia">${getTrendIcon(member.trend)}</td>
<td data-label="Rendimiento"><span class="status-badge status-${perfSt.toLowerCase()}">${perfSt}</span></td>
<td data-label="Escuadrón">
<span class="status-badge status-${squadSt === 'ACTIVE' ? 'verde' : 'negro'}">
${squadSt === 'ACTIVE' ? '🟢 ACTIVO' : '🔴 INACTIVO'}
</span>
</td>
<td data-label="Acciones" style="min-width:140px;">
<div style="display:flex;flex-direction:column;gap:6px;">
<button onclick="toggleMemberStatus(${member.user_id}, '${newStatus}', '${member.nick}')"
class="${actionClass}" style="width:100%;">${actionLabel}</button>
${roleBtn}
</div>
</td>
</tr>`;
  }).join('');
}

function openChangeRoleModal(userId, nick, currentRole) {
  let modal = document.getElementById('changeRoleModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'changeRoleModal';
    modal.className = 'modal';
    modal.innerHTML = `
<div class="modal-content" style="max-width:400px;">
<div class="modal-header">
<h3>🎖️ Cambiar Rol</h3>
<span class="close-btn" onclick="closeModal('changeRoleModal')">&times;</span>
</div>
<div class="modal-body">
<p style="margin-bottom:14px;">
Piloto: <strong id="changeRoleNick">—</strong>
&nbsp;·&nbsp; Rol actual: <span id="changeRoleCurrentBadge"></span>
</p>
<input type="hidden" id="changeRoleUserId">
<div class="form-group">
<label>Nuevo Rol</label>
<select id="changeRoleSelect">
<option value="MIEMBRO">👤 MIEMBRO</option>
<option value="VETERANO">🎖️ VETERANO</option>
<option value="ADMIN">🛡️ ADMIN</option>
</select>
</div>
<p style="font-size:0.8rem;color:var(--text-muted,#a0aec0);margin-top:8px;">
⚠️ Este cambio queda registrado en el log de auditoría.
</p>
</div>
<div class="modal-footer">
<button onclick="confirmChangeRole()" class="btn-primary">✅ Confirmar</button>
<button onclick="closeModal('changeRoleModal')" class="btn-secondary">Cancelar</button>
</div>
</div>`;
    document.body.appendChild(modal);
  }
  document.getElementById('changeRoleUserId').value  = userId;
  document.getElementById('changeRoleNick').textContent = nick;
  document.getElementById('changeRoleCurrentBadge').innerHTML =
    `<span class="role-badge role-${currentRole.toLowerCase()}">${currentRole}</span>`;
  document.getElementById('changeRoleSelect').value = currentRole;
  showModal('changeRoleModal');
}

async function confirmChangeRole() {
  const userId = parseInt(document.getElementById('changeRoleUserId').value);
  const role   = document.getElementById('changeRoleSelect').value;
  const nick   = document.getElementById('changeRoleNick').textContent;
  try {
    const res = await fetch(`${API_BASE}/api/admin/members/${userId}/role`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cambiar rol');
    showToast(`✅ ${data.message}`, 'success');
    closeModal('changeRoleModal');
    loadAdminPanel();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

function filterMembers() {
  const perfFilter  = (document.getElementById('perfStatusFilter')?.value  || '').toUpperCase();
  const squadFilter = (document.getElementById('squadStatusFilter')?.value || '').toUpperCase();
  const roleFilter  = (document.getElementById('roleFilter')?.value        || '').toUpperCase();
  const search      = (document.getElementById('memberSearch')?.value       || '').toLowerCase().trim();
  const weeksFilter = document.getElementById('weeksFilter')?.value || '';
  const filtered = allMembersData.filter(member => {
    const perfSt  = (member.perf_status  || 'PENDIENTE').toUpperCase();
    const squadSt = (member.squad_status || 'ACTIVE').toUpperCase();
    const role    = (member.role         || 'MIEMBRO').toUpperCase();
    const nick    = (member.nick         || '').toLowerCase();
    const weeks   = member.weeks_evaluated || 0;
    if (perfFilter  && perfSt  !== perfFilter)  return false;
    if (squadFilter && squadSt !== squadFilter) return false;
    if (roleFilter && role !== roleFilter) return false;
    if (search && !nick.includes(search)) return false;
    if (weeksFilter) {
      if (weeksFilter === '4+' && weeks < 4) return false;
      if (weeksFilter !== '4+' && weeks !== parseInt(weeksFilter)) return false;
    }
    return true;
  });
  displayMembersList(filtered);
  const noResults = document.getElementById('noResultsMessage');
  if (noResults) {
    noResults.style.display = filtered.length === 0 ? 'block' : 'none';
  }
}

// ========== BLACK MARKET CONTROL ==========
function loadBlackMarketControl() {
  const container = document.getElementById('blackMarketInfo');
  if (!container) return;
  container.innerHTML = `<p class="loading-text"><span class="loading-spinner"></span> Cargando estado del evento...</p>`;
  fetch(`${API_BASE}/api/admin/events`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    displayBlackMarketControl(data.events || []);
  })
  .catch(err => {
    console.error('Error cargando eventos para BM:', err);
    container.innerHTML = `<p class="text-center" style="color:var(--danger);">❌ Error al cargar estado del evento</p>`;
  });
}

function displayBlackMarketControl(events) {
  const container = document.getElementById('blackMarketInfo');
  if (!container) return;
  const openEvent = events.find(e => e.is_open || e.status === 'OPEN');
  const eventType   = openEvent ? openEvent.type : null;
  const eventId     = openEvent ? openEvent.id   : null;
  const isBM        = eventType === 'BLACK_MARKET';
  const hasOpen     = !!openEvent;
  container.innerHTML = `
<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;">
<div class="admin-stat" style="flex:1;min-width:180px;">
<div class="stat-label">Evento Activo</div>
<div class="stat-value" style="font-size:1rem;margin-top:4px;">
${hasOpen
  ? `<span class="status-badge status-${isBM ? 'rojo' : 'verde'}">${isBM ? '🔥 BLACK MARKET' : '🎖️ SQUADRON'}</span>`
  : `<span class="status-badge status-negro">⚫ SIN EVENTO</span>`}
</div>
${hasOpen ? `<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${eventId}</div>` : ''}
</div>
<div style="display:flex;flex-direction:column;gap:8px;justify-content:center;">
${!isBM ? `
<button onclick="adminActivateBM()" class="btn-danger" id="btnActivateBM">
🔥 Activar BLACK MARKET
</button>
<div style="font-size:0.72rem;color:var(--text-muted);max-width:260px;">
⚠️ Solo durante Lun 09:00 – Mié 16:59 (PY). Nunca dos BM consecutivos.
</div>
` : `
<div class="profile-info" style="margin:0;">
<p style="margin:0;">🔥 BLACK MARKET activo. Espera al cierre automático del ciclo.</p>
</div>
`}
</div>
</div>
`;
}

async function adminActivateBM() {
  const btn = document.getElementById('btnActivateBM');
  if (btn) { btn.disabled = true; btn.textContent = 'Activando...'; }
  try {
    const res = await fetch(`${API_BASE}/api/admin/events/activate-bm`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al activar Black Market');
    }
    showToast(`🔥 Black Market activado: ${data.event_id}`, 'success');
    loadBlackMarketControl();
  } catch (err) {
    console.error('Error activando BM:', err);
    showToast('❌ ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '🔥 Activar BLACK MARKET'; }
  }
}

function loadAdminEvents() {
  fetch(`${API_BASE}/api/admin/events`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    displayAdminEvents(data.events || []);
  })
  .catch(err => {
    console.error('Error cargando eventos:', err);
  });
}

function displayAdminEvents(events) {
  const container = document.getElementById('adminEventsList');
  if (!container) return;
  if (events.length === 0) {
    container.innerHTML = `<p class="text-center">No hay eventos registrados</p>`;
    return;
  }
  container.innerHTML = events.map(event => `
<div class="event-item ${event.is_open ? 'event-open' : ''}">
<h4>${event.id}</h4>
<p><strong>Tipo:</strong> ${event.type}</p>
<p><strong>Período:</strong> ${new Date(event.start_date).toLocaleDateString()} - ${new Date(event.end_date).toLocaleDateString()}</p>
<p><strong>Estado:</strong> ${event.is_open ? '🔴 ABIERTO' : '⚫ CERRADO'}</p>
</div>
`).join('');
}

function getTrendIcon(trend) {
  if (!trend) return '-';
  switch(trend) {
    case 'up':     return '📈';
    case 'down':   return '📉';
    case 'stable': return '➡️';
    default:       return '-';
  }
}

function showUploadEventModal() {
  showModal('uploadEventModal');
}

// ========== TODOS LOS RENDIMIENTOS (ADMIN) ==========
let allPerformancesCache = [];
let _allPerfPage  = 1;
const _allPerfLimit = 50;

function loadAllPerformances(page = 1) {
  if (!currentUser || (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN')) return;
  _allPerfPage = page;
  const container = document.getElementById('allPerformancesTable');
  if (container) container.innerHTML = `<p class="loading-text"><span class="loading-spinner"></span> Cargando...</p>`;

  fetch(`${API_BASE}/api/admin/all-performances?page=${page}&limit=${_allPerfLimit}`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    const perfs = data.performances || data || [];
    const total = data.total || perfs.length;
    allPerformancesCache = perfs;
    displayAllPerformances(perfs);
    renderPagination('allPerfPagination', page, Math.ceil(total / _allPerfLimit), loadAllPerformances);
  })
  .catch(err => {
    console.error('Error cargando todos los rendimientos:', err);
    showToast('❌ Error al cargar rendimientos', 'error');
  });
}

function displayAllPerformances(performances) {
  const container = document.getElementById('allPerformancesTable');
  if (!container) return;
  updateAllPerfStats(performances);
  if (performances.length === 0) {
    container.innerHTML = `<p class="text-center">No hay registros de rendimiento</p>`;
    return;
  }
  container.innerHTML = `
<div class="responsive-table">
<table class="table-cards">
<thead>
<tr>
<th>Piloto</th>
<th>Evento</th>
<th>Tokens</th>
<th>Días</th>
<th>Estado</th>
<th>Fecha</th>
</tr>
</thead>
<tbody>
${performances.map(p => `
<tr>
<td data-label="Piloto">${p.nick || p.user_id}</td>
<td data-label="Evento">${p.event_id}</td>
<td data-label="Tokens">${p.tokens}</td>
<td data-label="Días">${p.days_connected}</td>
<td data-label="Estado"><span class="status-badge status-${p.status.toLowerCase()}">${p.status}</span></td>
<td data-label="Fecha">${new Date(p.created_at).toLocaleDateString('es-PY')}</td>
</tr>
`).join('')}
</tbody>
</table>
</div>
`;
}

function updateAllPerfStats(performances) {
  document.getElementById('totalPerformances').textContent = performances.length;
  if (performances.length > 0) {
    const avgTokens = performances.reduce((sum, p) => sum + p.tokens, 0) / performances.length;
    document.getElementById('avgPerfTokens').textContent = avgTokens.toFixed(1);
    const maxTokens = Math.max(...performances.map(p => p.tokens));
    document.getElementById('maxPerfTokens').textContent = maxTokens;
    const verdeCount = performances.filter(p => p.status === 'VERDE').length;
    document.getElementById('verdeCount').textContent = verdeCount;
  } else {
    document.getElementById('avgPerfTokens').textContent = '0';
    document.getElementById('maxPerfTokens').textContent = '0';
    document.getElementById('verdeCount').textContent = '0';
  }
}

function filterAllPerformances() {
  const searchTerm  = (document.getElementById('allPerfSearch')?.value || '').toLowerCase().trim();
  const roleFilter  = (document.getElementById('allPerfRoleFilter')?.value || '').toUpperCase();
  const minTokens   = parseInt(document.getElementById('minTokensFilter')?.value) || 0;
  const maxTokens   = parseInt(document.getElementById('maxTokensFilter')?.value) || Infinity;
  const statusFilter = (document.getElementById('statusFilter')?.value || '').toUpperCase();
  const eventIdFilter = (document.getElementById('eventIdFilter')?.value || '').trim();
  let filtered = allPerformancesCache.filter(p => {
    if (searchTerm && !p.nick.toLowerCase().includes(searchTerm)) return false;
    if (roleFilter && p.role !== roleFilter) return false;
    if (p.tokens < minTokens || p.tokens > maxTokens) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    if (eventIdFilter && p.event_id !== eventIdFilter) return false;
    return true;
  });
  displayAllPerformances(filtered);
}

function resetAllPerfFilters() {
  document.getElementById('allPerfSearch').value = '';
  document.getElementById('allPerfRoleFilter').value = '';
  document.getElementById('minTokensFilter').value = '';
  document.getElementById('maxTokensFilter').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('eventIdFilter').value = '';
  displayAllPerformances(allPerformancesCache);
}

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

function showLoginModal() {
  showModal('loginModal');
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
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

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

// ============================================================
// PANEL OWNER — ACTA-2026-002
// ============================================================

function loadOwnerPanel() {
  if (!currentUser || currentUser.role !== 'OWNER') return;
  loadOwnerSummary();
  switchOwnerTab('audit');
}

function loadOwnerSummary() {
  fetch(`${API_BASE}/api/owner/audit-summary`, { headers: getAuthHeaders() })
    .then(r => r.json())
    .then(d => {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('ownerAudits24h',   d.audits_last_24h  ?? '-');
      set('ownerErrors24h',   d.errors_last_24h  ?? '-');
      set('ownerTotalAudit',  d.total_audit_logs ?? '-');
      set('ownerBackupCount', d.backup_count     ?? '-');
    })
    .catch(err => console.error('Error summary owner:', err));
}

function switchOwnerTab(tab) {
  ['audit', 'errors', 'backups'].forEach(t => {
    const content = document.getElementById(`ownerTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn     = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (content) content.style.display = t === tab ? 'block' : 'none';
    if (btn)     btn.classList.toggle('active', t === tab);
  });
  if (tab === 'audit')   loadAuditLogs(1);
  if (tab === 'errors')  loadErrorLogs(1);
  if (tab === 'backups') loadBackupList();
}

let _auditPage = 1, _auditTotal = 0;

function loadAuditLogs(page = 1) {
  _auditPage = page;
  const container = document.getElementById('auditLogsContainer');
  if (container) container.innerHTML = `<p class="loading-text"><span class="loading-spinner"></span> Cargando...</p>`;
  const action = (document.getElementById('auditFilterAction')?.value || '').trim();
  const nick   = (document.getElementById('auditFilterNick')?.value   || '').trim();
  const result = document.getElementById('auditFilterResult')?.value  || '';
  const entity = document.getElementById('auditFilterEntity')?.value  || '';
  const params = new URLSearchParams({ page, limit: 50 });
  if (action) params.set('action', action);
  if (nick)   params.set('nick',   nick);
  if (result) params.set('result', result);
  if (entity) params.set('entity', entity);
  fetch(`${API_BASE}/api/owner/audit-logs?${params}`, { headers: getAuthHeaders() })
    .then(r => r.json())
    .then(data => {
      _auditTotal = data.total || 0;
      renderAuditTable(data.logs || []);
      renderPagination('auditPagination', page, Math.ceil(_auditTotal / 50), loadAuditLogs);
    })
    .catch(err => {
      console.error('Error cargando audit logs:', err);
      if (container) container.innerHTML = `<p style="color:var(--danger);">❌ Error al cargar registros</p>`;
    });
}

function renderAuditTable(logs) {
  const container = document.getElementById('auditLogsContainer');
  if (!container) return;
  if (logs.length === 0) {
    container.innerHTML = `<div class="no-results"><p>📋 Sin registros con los filtros aplicados</p></div>`;
    return;
  }
  const fmtDate = iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PY') + ' ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const fmtDetails = details => {
    if (!details) return '—';
    try {
      const obj = typeof details === 'string' ? JSON.parse(details) : details;
      return Object.entries(obj).map(([k, v]) =>
        `<span style="color:#a0aec0;">${k}:</span> <span style="color:#e2e8f0;">${JSON.stringify(v)}</span>`
      ).join(' &nbsp;·&nbsp; ');
    } catch { return String(details); }
  };
  const ACTION_COLORS = {
    'LOGIN':                     '#68d391',
    'CHANGE_PASSWORD':           '#63b3ed',
    'CREATE_MEMBER':             '#4299e1',
    'MEMBER_STATUS_CHANGE':      '#ed8936',
    'ACTIVATE_BLACK_MARKET':     '#f6ad55',
    'CLOSE_EVENT_MANUAL':        '#fc8181',
    'MANUAL_CYCLE_RUN':          '#76e4f7',
    'ADMIN_RECORD_PERFORMANCE':  '#9f7aea',
    'UPLOAD_NORMATIVA':          '#68d391',
    'MANUAL_BACKUP':             '#d4af37',
  };
  container.innerHTML = `
<div class="responsive-table">
<table class="log-table">
<thead>
<tr>
<th>Fecha (PY)</th><th>Nick</th><th>Rol</th><th>Acción</th><th>Entidad</th>
<th>ID</th><th>Detalles</th><th>Resultado</th><th>IP</th>
</tr>
</thead>
<tbody>
${logs.map(log => {
  const color  = ACTION_COLORS[log.action] || '#a0aec0';
  const result = log.result === 'SUCCESS'
    ? `<span class="badge-success">✅ OK</span>`
    : `<span class="badge-failure">❌ FAIL</span>`;
  return `<tr>
<td style="white-space:nowrap;font-size:0.78rem;color:#718096;">${fmtDate(log.created_at)}</td>
<td><strong>${log.nick || '—'}</strong></td>
<td><span class="role-badge role-${(log.role||'').toLowerCase()}">${log.role || '—'}</span></td>
<td><span style="color:${color};font-weight:700;font-size:0.78rem;">${log.action}</span></td>
<td style="color:#718096;">${log.entity || '—'}</td>
<td style="color:#718096;font-family:monospace;font-size:0.72rem;">${log.entity_id || '—'}</td>
<td style="font-size:0.75rem;max-width:300px;white-space:normal;">${fmtDetails(log.details)}</td>
<td>${result}</td>
<td style="font-family:monospace;font-size:0.72rem;color:#4a5568;">${log.ip || '—'}</td>
</tr>`;
}).join('')}
</tbody>
</table>
</div>
<p style="font-size:0.75rem;color:#4a5568;text-align:right;margin-top:6px;">
${_auditTotal} registros totales — página ${_auditPage}
</p>`;
}

let _errorPage = 1, _errorTotal = 0;

function loadErrorLogs(page = 1) {
  _errorPage = page;
  const container = document.getElementById('errorLogsContainer');
  if (container) container.innerHTML = `<p class="loading-text"><span class="loading-spinner"></span> Cargando...</p>`;
  const level = document.getElementById('errorFilterLevel')?.value || '';
  const route = (document.getElementById('errorFilterRoute')?.value || '').trim();
  const params = new URLSearchParams({ page, limit: 50 });
  if (level) params.set('level', level);
  if (route) params.set('route', route);
  fetch(`${API_BASE}/api/owner/error-logs?${params}`, { headers: getAuthHeaders() })
    .then(r => r.json())
    .then(data => {
      _errorTotal = data.total || 0;
      renderErrorTable(data.logs || []);
      renderPagination('errorPagination', page, Math.ceil(_errorTotal / 50), loadErrorLogs);
    })
    .catch(err => {
      console.error('Error cargando error logs:', err);
      if (container) container.innerHTML = `<p style="color:var(--danger);">❌ Error al cargar registros</p>`;
    });
}

function renderErrorTable(logs) {
  const container = document.getElementById('errorLogsContainer');
  if (!container) return;
  if (logs.length === 0) {
    container.innerHTML = `<div class="no-results"><p>✅ Sin errores registrados con los filtros aplicados</p></div>`;
    return;
  }
  const fmtDate = iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('es-PY') + ' ' + d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  container.innerHTML = `
<div class="responsive-table">
<table class="log-table">
<thead>
<tr>
<th>Fecha (PY)</th><th>Nivel</th><th>Ruta</th><th>Nick</th><th>Mensaje</th><th>Stack</th>
</tr>
</thead>
<tbody>
${logs.map((log, idx) => `
<tr>
<td style="white-space:nowrap;font-size:0.78rem;color:#718096;">${fmtDate(log.created_at)}</td>
<td><span class="badge-${log.level || 'error'}">${(log.level || 'error').toUpperCase()}</span></td>
<td style="font-family:monospace;font-size:0.75rem;color:#a0aec0;">${log.route || '—'}</td>
<td>${log.nick || '—'}</td>
<td style="font-size:0.8rem;max-width:280px;white-space:normal;">${log.message || '—'}</td>
<td>
${log.stack ? `
<button class="stack-toggle" onclick="toggleStack('stack_${idx}')">Ver stack</button>
<div id="stack_${idx}" class="stack-content" style="display:none;">${escapeHtml(log.stack)}</div>
` : '—'}
</td>
</tr>`).join('')}
</tbody>
</table>
</div>
<p style="font-size:0.75rem;color:#4a5568;text-align:right;margin-top:6px;">
${_errorTotal} errores totales — página ${_errorPage}
</p>`;
}

function toggleStack(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadBackupList() {
  const container = document.getElementById('backupListContainer');
  if (container) container.innerHTML = `<p class="loading-text"><span class="loading-spinner"></span> Cargando lista...</p>`;
  fetch(`${API_BASE}/api/owner/backup/list`, { headers: getAuthHeaders() })
    .then(r => r.json())
    .then(data => renderBackupList(data.files || []))
    .catch(err => {
      console.error('Error listando backups:', err);
      if (container) container.innerHTML = `<p style="color:var(--danger);">❌ Error al cargar lista</p>`;
    });
}

function renderBackupList(files) {
  const container = document.getElementById('backupListContainer');
  if (!container) return;
  if (files.length === 0) {
    container.innerHTML = `<div class="no-results"><p>🗃️ No hay backups aún. Ejecuta el primero con el botón de arriba.</p></div>`;
    return;
  }
  const fmtSize = bytes => {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  const fmtDate = iso => new Date(iso).toLocaleDateString('es-PY', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  container.innerHTML = files.map(f => `
<div class="backup-item">
<div>
<div class="backup-name">🗃️ ${f.name}</div>
<div class="backup-meta">${fmtDate(f.created_at)}</div>
</div>
<div style="display:flex;align-items:center;gap:12px;">
<span class="backup-size">${fmtSize(f.size_bytes)}</span>
<span class="role-badge" style="${f.name.includes('-cron.')
  ? 'background:rgba(212,175,55,0.12);color:#d4af37;border-color:#d4af37;'
  : 'background:rgba(74,144,226,0.12);color:#4a90e2;border-color:#4a90e2;'}">
${f.name.includes('-cron.') ? '⏰ AUTO' : '▶️ MANUAL'}
</span>
</div>
</div>`).join('');
}

async function triggerManualBackup() {
  const btn = document.getElementById('btnManualBackup');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Ejecutando...'; }
  try {
    const res  = await fetch(`${API_BASE}/api/owner/backup/run`, { method: 'POST', headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al ejecutar backup');
    showToast(`✅ Backup completado: ${data.file} (${data.elapsed_ms}ms)`, 'success');
    loadBackupList();
    loadOwnerSummary();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '▶️ Ejecutar Backup Ahora'; }
  }
}

function renderPagination(containerId, currentPage, totalPages, loadFn) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) { if (container) container.innerHTML = ''; return; }
  let html = `<button ${currentPage === 1 ? 'disabled' : ''} onclick="${loadFn.name}(${currentPage - 1})">‹ Anterior</button>`;
  const range = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
      html += `<button class="${i === currentPage ? 'active-page' : ''}" onclick="${loadFn.name}(${i})">${i}</button>`;
    } else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
      html += `<span style="padding:0 4px;color:#4a5568;">…</span>`;
    }
  }
  html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="${loadFn.name}(${currentPage + 1})">Siguiente ›</button>`;
  container.innerHTML = html;
}

// ============================================================
// EXPORTACIÓN DE REPORTES PNG via Canvas API
// v3.1 — Integración completa con API real
// ============================================================

const _EXP_STATUS_COLORS = {
  VERDE:   '#28a745',
  NARANJA: '#ff9800',
  ROJO:    '#dc3545',
  NEGRO:   '#636e72'
};

const _EXP_STATUS_BG = {
  VERDE:   'rgba(40,167,69,0.18)',
  NARANJA: 'rgba(255,152,0,0.18)',
  ROJO:    'rgba(220,53,69,0.18)',
  NEGRO:   'rgba(99,110,114,0.25)'
};

// Estado del módulo de exportación
let _exportCurrentEvent  = null;
let _exportPerformances  = [];

/**
 * Punto de entrada: inicializa la vista de exportación.
 * Llamada por loadViewData() cuando se navega a 'exportView'.
 */
function loadExportView() {
  if (!currentUser || (currentUser.role !== 'OWNER' && currentUser.role !== 'ADMIN')) return;
  _loadEventsForExport();
}

/**
 * Carga la lista de eventos del backend y puebla el <select>.
 */
async function _loadEventsForExport() {
  const sel = document.getElementById('exportEventSel');
  if (!sel) return;

  sel.innerHTML = '<option value="">Cargando eventos...</option>';
  sel.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/admin/events`, { headers: getAuthHeaders() });
    const data = await res.json();
    const events = data.events || [];

    sel.innerHTML = '<option value="">-- Seleccioná un evento --</option>';

    const closed = events.filter(e => e.status === 'CLOSED')
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    const open = events.filter(e => e.status === 'OPEN');

    if (open.length) {
      const grp = document.createElement('optgroup');
      grp.label = '— Evento activo —';
      open.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.id + ' (ABIERTO)';
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    }

    if (closed.length) {
      const grp = document.createElement('optgroup');
      grp.label = '— Eventos cerrados —';
      closed.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.id;
        grp.appendChild(opt);
      });
      sel.appendChild(grp);
    }

    sel.disabled = false;
  } catch (err) {
    console.error('Error cargando eventos para exportar:', err);
    sel.innerHTML = '<option value="">Error al cargar eventos</option>';
    sel.disabled = false;
    showToast('❌ Error al cargar lista de eventos', 'error');
  }
}

/**
 * Handler del <select> de evento — carga datos y renderiza canvas.
 */
async function onExportEventChange() {
  const sel       = document.getElementById('exportEventSel');
  const eventId   = sel ? sel.value : '';
  const previewWrap = document.getElementById('exportPreviewWrap');
  const loadingEl   = document.getElementById('exportLoading');
  const dlBtn       = document.getElementById('exportDlBtn');
  const refreshBtn  = document.getElementById('exportRefreshBtn');
  const optGrp      = document.getElementById('exportOptionsGroup');

  if (!eventId) {
    if (previewWrap) previewWrap.style.display = 'none';
    if (dlBtn)       dlBtn.disabled = true;
    if (refreshBtn)  refreshBtn.style.display = 'none';
    if (optGrp)      optGrp.style.display = 'none';
    _exportCurrentEvent  = null;
    _exportPerformances  = [];
    return;
  }

  if (loadingEl)  loadingEl.style.display = 'flex';
  if (previewWrap) previewWrap.style.display = 'none';
  if (dlBtn)       dlBtn.disabled = true;
  if (refreshBtn)  refreshBtn.style.display = 'none';

  try {
    // Fetch rendimientos del evento (paginación amplia para traer todos)
    const perfRes  = await fetch(`${API_BASE}/api/admin/all-performances?limit=500`, {
      headers: getAuthHeaders()
    });
    const perfData = await perfRes.json();
    const allPerfs = perfData.performances || perfData || [];
    const eventPerfs = allPerfs.filter(p => p.event_id === eventId);

    // Fetch info del evento
    const evRes  = await fetch(`${API_BASE}/api/admin/events`, { headers: getAuthHeaders() });
    const evData = await evRes.json();
    const eventInfo = (evData.events || []).find(e => e.id === eventId) || {
      id: eventId, type: 'SQUADRON', status: 'CLOSED'
    };

    _exportCurrentEvent  = eventInfo;
    _exportPerformances  = eventPerfs;

    if (eventPerfs.length === 0) {
      if (loadingEl) loadingEl.style.display = 'none';
      showToast('⚠️ Este evento no tiene rendimientos registrados', 'warning');
      return;
    }

    // Ordenar por tokens desc por defecto
    const sorted = _sortExportPerfs(eventPerfs, 'tokens_desc');
    _renderExportCanvas(eventInfo, sorted);
    _updateExportStats(sorted);

    if (loadingEl)  loadingEl.style.display = 'none';
    if (previewWrap) previewWrap.style.display = 'block';
    if (dlBtn)       dlBtn.disabled = false;
    if (refreshBtn)  refreshBtn.style.display = '';
    if (optGrp)      optGrp.style.display = '';

    // Resetear el selector de orden
    const sortSel = document.getElementById('exportSortSel');
    if (sortSel) sortSel.value = 'tokens_desc';

  } catch (err) {
    console.error('Error generando reporte:', err);
    if (loadingEl) loadingEl.style.display = 'none';
    showToast('❌ Error al cargar datos del evento: ' + err.message, 'error');
  }
}

/**
 * Handler del selector de ordenamiento — re-renderiza sin nuevo fetch.
 */
function onExportSortChange() {
  if (!_exportCurrentEvent || !_exportPerformances.length) return;
  const sortSel = document.getElementById('exportSortSel');
  const order   = sortSel ? sortSel.value : 'tokens_desc';
  const sorted  = _sortExportPerfs(_exportPerformances, order);
  _renderExportCanvas(_exportCurrentEvent, sorted);
}

/**
 * Ordena el array de performances según criterio seleccionado.
 */
function _sortExportPerfs(perfs, order) {
  const arr = [...perfs];
  switch(order) {
    case 'tokens_asc':  return arr.sort((a, b) => a.tokens - b.tokens);
    case 'nick_asc':    return arr.sort((a, b) => (a.nick || '').localeCompare(b.nick || ''));
    case 'status': {
      const ORDER = { VERDE: 0, NARANJA: 1, ROJO: 2, NEGRO: 3 };
      return arr.sort((a, b) => (ORDER[a.status] ?? 4) - (ORDER[b.status] ?? 4));
    }
    default:            return arr.sort((a, b) => b.tokens - a.tokens); // tokens_desc
  }
}

/**
 * Actualiza las tarjetas de estadísticas rápidas.
 */
function _updateExportStats(perfs) {
  if (!perfs.length) return;
  const avg    = Math.round(perfs.reduce((s, p) => s + p.tokens, 0) / perfs.length);
  const verde  = perfs.filter(p => p.status === 'VERDE').length;
  const risk   = perfs.filter(p => p.status === 'ROJO' || p.status === 'NEGRO').length;
  const status = _expCalcStatus(avg);

  const setEl = (id, val, color) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    if (color) el.style.color = color;
  };
  setEl('expStTotal', perfs.length, null);
  setEl('expStAvg',   avg,          _EXP_STATUS_COLORS[status]);
  setEl('expStVerde', verde,        verde > 0 ? '#28a745' : null);
  setEl('expStRisk',  risk,         risk  > 0 ? '#dc3545' : null);
}

/**
 * Dibuja el reporte completo en el <canvas id="exportCanvas">.
 */
function _renderExportCanvas(event, perfs) {
  const SCALE          = 2;
  const W              = 800;
  const PAD            = 32;
  const ROW_H          = 40;
  const HEADER_H       = 120;
  const TABLE_HEADER_H = 44;
  const FOOTER_H       = 56;
  const H = HEADER_H + TABLE_HEADER_H + perfs.length * ROW_H + FOOTER_H + PAD;

  const cv = document.getElementById('exportCanvas');
  if (!cv) return;
  cv.width       = W * SCALE;
  cv.height      = H * SCALE;
  cv.style.height = H + 'px';

  const c = cv.getContext('2d');
  c.scale(SCALE, SCALE);

  // ── Fondo ──────────────────────────────────────────────────
  c.fillStyle = '#0d1b2a';
  c.fillRect(0, 0, W, H);

  // ── Marco dorado ───────────────────────────────────────────
  c.strokeStyle = '#d4af37';
  c.lineWidth   = 3;
  c.strokeRect(1.5, 1.5, W - 3, H - 3);

  // ── Gradiente de encabezado ────────────────────────────────
  const hg = c.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0,   'rgba(212,175,55,0.18)');
  hg.addColorStop(0.5, 'rgba(26,58,108,0.6)');
  hg.addColorStop(1,   'rgba(212,175,55,0.1)');
  c.fillStyle = hg;
  c.fillRect(3, 3, W - 6, HEADER_H - 3);

  // ── Título ─────────────────────────────────────────────────
  c.fillStyle = '#d4af37';
  c.font      = 'bold 20px Arial';
  c.textAlign = 'left';
  c.fillText('PARAGUAY FFAA [PRY]', PAD, 40);

  c.fillStyle = '#ffffff';
  c.font      = 'bold 14px Arial';
  c.fillText('REPORTE DE RENDIMIENTO — ' + event.id, PAD, 64);

  // ── Pill tipo de evento ────────────────────────────────────
  const isBM     = event.type === 'BLACK_MARKET';
  const typeLabel = isBM ? 'BLACK MARKET' : 'SQUADRON';
  const typeColor = isBM ? '#ff9800' : '#1abc9c';
  const typeBg    = isBM ? 'rgba(255,152,0,0.2)' : 'rgba(26,188,156,0.18)';
  _expDrawPill(c, PAD, 72, typeLabel, typeBg, typeColor, 11);

  // ── Fecha + mini-stats ─────────────────────────────────────
  const now = new Date().toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' });
  c.fillStyle  = 'rgba(255,255,255,0.4)';
  c.font       = '11px Arial';
  c.textAlign  = 'right';
  c.fillText('Generado: ' + now, W - PAD, 90);

  if (perfs.length > 0) {
    const avg    = Math.round(perfs.reduce((s, p) => s + p.tokens, 0) / perfs.length);
    const avgSt  = _expCalcStatus(avg);
    _expDrawMiniStat(c, W - PAD - 250, 14, 'PROMEDIO',  avg + ' tkn',  _EXP_STATUS_COLORS[avgSt]);
    _expDrawMiniStat(c, W - PAD - 130, 14, 'PILOTOS',   perfs.length,  '#ffffff');
  }

  // ── Encabezado de la tabla ─────────────────────────────────
  const tY = HEADER_H;
  c.fillStyle  = 'rgba(26,58,108,0.9)';
  c.fillRect(0, tY, W, TABLE_HEADER_H);
  c.strokeStyle = 'rgba(212,175,55,0.5)';
  c.lineWidth   = 1;
  c.beginPath(); c.moveTo(0, tY + TABLE_HEADER_H); c.lineTo(W, tY + TABLE_HEADER_H); c.stroke();

  const cols = [
    { label: '#',      x: PAD,       w: 28,                align: 'center' },
    { label: 'PILOTO', x: PAD + 36,  w: 160,               align: 'left'   },
    { label: 'ROL',    x: PAD + 204, w: 72,                align: 'left'   },
    { label: 'TOKENS', x: PAD + 284, w: 70,                align: 'right'  },
    { label: 'DÍAS',   x: PAD + 362, w: 42,                align: 'center' },
    { label: 'ESTADO', x: PAD + 412, w: 110,               align: 'center' },
    { label: 'BARRA',  x: PAD + 530, w: W - PAD - 530 - PAD, align: 'left' },
  ];

  c.fillStyle = '#d4af37';
  c.font      = 'bold 11px Arial';
  cols.forEach(col => {
    c.textAlign = col.align;
    const tx = col.align === 'center' ? col.x + col.w / 2
              : col.align === 'right'  ? col.x + col.w
              : col.x;
    c.fillText(col.label, tx, tY + 27);
  });

  // ── Filas ──────────────────────────────────────────────────
  const maxTok = perfs.length > 0 ? Math.max(...perfs.map(p => p.tokens)) : 200;

  perfs.forEach((p, i) => {
    const ry = tY + TABLE_HEADER_H + i * ROW_H;

    // Fondo alternado
    c.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
    c.fillRect(0, ry, W, ROW_H);

    // Línea separadora
    c.strokeStyle = 'rgba(255,255,255,0.05)';
    c.lineWidth   = 0.5;
    c.beginPath(); c.moveTo(0, ry + ROW_H); c.lineTo(W, ry + ROW_H); c.stroke();

    const cy = ry + ROW_H / 2;

    // Número
    c.textAlign  = 'center';
    c.fillStyle  = 'rgba(255,255,255,0.35)';
    c.font       = '11px Arial';
    c.fillText(i + 1, PAD + 14, cy + 4);

    // Nick
    c.textAlign  = 'left';
    c.fillStyle  = '#ffffff';
    c.font       = 'bold 13px Arial';
    c.fillText(p.nick || 'N/A', PAD + 36, cy + 4);

    // Rol
    const roleClr = {
      OWNER:    '#d4af37',
      ADMIN:    '#e84393',
      VETERANO: '#17a2b8',
      MIEMBRO:  'rgba(255,255,255,0.45)'
    };
    c.fillStyle  = roleClr[p.role] || 'rgba(255,255,255,0.45)';
    c.font       = '10px Arial';
    c.fillText(p.role || 'MIEMBRO', PAD + 204, cy + 4);

    // Tokens
    c.textAlign  = 'right';
    c.fillStyle  = _EXP_STATUS_COLORS[p.status] || '#ffffff';
    c.font       = 'bold 14px Arial';
    c.fillText(p.tokens, PAD + 354, cy + 5);

    // Días
    c.textAlign  = 'center';
    c.fillStyle  = 'rgba(255,255,255,0.6)';
    c.font       = '12px Arial';
    c.fillText(p.days_connected ?? '-', PAD + 383, cy + 4);

    // Badge de estado
    _expDrawStatusBadge(c, PAD + 412, ry + 8, 110, 24, p.status);

    // Barra de progreso
    const barX = PAD + 530;
    const barW = W - PAD - 530 - PAD;
    const barH = 8;
    const barY = cy - barH / 2;
    c.fillStyle = 'rgba(255,255,255,0.08)';
    _expRoundRect(c, barX, barY, barW, barH, 4); c.fill();
    const filled = Math.max(4, Math.round((p.tokens / maxTok) * barW));
    c.fillStyle  = _EXP_STATUS_COLORS[p.status] || '#aaa';
    _expRoundRect(c, barX, barY, filled, barH, 4); c.fill();
  });

  // ── Pie de reporte ─────────────────────────────────────────
  const footY = HEADER_H + TABLE_HEADER_H + perfs.length * ROW_H + 12;
  c.strokeStyle = 'rgba(212,175,55,0.3)';
  c.lineWidth   = 1;
  c.beginPath(); c.moveTo(PAD, footY); c.lineTo(W - PAD, footY); c.stroke();

  const counts = {
    VERDE:   perfs.filter(p => p.status === 'VERDE').length,
    NARANJA: perfs.filter(p => p.status === 'NARANJA').length,
    ROJO:    perfs.filter(p => p.status === 'ROJO').length,
    NEGRO:   perfs.filter(p => p.status === 'NEGRO').length,
  };

  let fx = PAD;
  [['VERDE', counts.VERDE], ['NARANJA', counts.NARANJA], ['ROJO', counts.ROJO], ['NEGRO', counts.NEGRO]]
    .forEach(([st, cnt]) => {
      c.fillStyle = _EXP_STATUS_COLORS[st];
      c.font      = 'bold 11px Arial';
      c.textAlign = 'left';
      c.fillText('● ' + st + ' ' + cnt, fx, footY + 28);
      fx += 130;
    });

  c.fillStyle = 'rgba(212,175,55,0.55)';
  c.font      = '10px Arial';
  c.textAlign = 'right';
  c.fillText('METALSTORM · PARAGUAY FFAA [PRY]', W - PAD, footY + 28);
}

/**
 * Descarga el canvas como archivo PNG.
 */
function downloadExportImage() {
  if (!_exportCurrentEvent) return;
  const cv = document.getElementById('exportCanvas');
  if (!cv) return;
  const a    = document.createElement('a');
  a.href     = cv.toDataURL('image/png');
  const name = 'reporte-' + _exportCurrentEvent.id
    .replace(/[·\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  a.download = name + '.png';
  a.click();
  showToast('✅ Descargando: ' + a.download, 'success');
}

// ── Helpers internos del canvas ─────────────────────────────

function _expCalcStatus(avg) {
  if (avg >= 175) return 'VERDE';
  if (avg >= 130) return 'NARANJA';
  if (avg >= 100) return 'ROJO';
  return 'NEGRO';
}

function _expDrawStatusBadge(c, x, y, w, h, status) {
  c.fillStyle   = _EXP_STATUS_BG[status]    || 'rgba(100,100,100,0.2)';
  _expRoundRect(c, x, y, w, h, 4); c.fill();
  c.strokeStyle = _EXP_STATUS_COLORS[status] || '#888';
  c.lineWidth   = 0.5;
  _expRoundRect(c, x, y, w, h, 4); c.stroke();
  c.fillStyle   = _EXP_STATUS_COLORS[status] || '#888';
  c.font        = 'bold 10px Arial';
  c.textAlign   = 'center';
  c.fillText(status || '—', x + w / 2, y + h / 2 + 4);
}

function _expDrawPill(c, x, y, text, bg, color, fontSize) {
  c.font      = (fontSize || 11) + 'px Arial';
  const pw    = c.measureText(text).width + 20;
  c.fillStyle = bg;
  _expRoundRect(c, x, y, pw, 20, 10); c.fill();
  c.fillStyle = color;
  c.textAlign = 'left';
  c.fillText(text, x + 10, y + 14);
}

function _expDrawMiniStat(c, x, y, label, val, color) {
  c.fillStyle  = 'rgba(26,58,108,0.55)';
  _expRoundRect(c, x, y, 110, 56, 6); c.fill();
  c.fillStyle  = 'rgba(212,175,55,0.6)';
  c.font       = '9px Arial';
  c.textAlign  = 'center';
  c.fillText(label, x + 55, y + 16);
  c.fillStyle  = color || '#ffffff';
  c.font       = 'bold 18px Arial';
  c.fillText(val, x + 55, y + 40);
}

function _expRoundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);         c.quadraticCurveTo(x + w, y,     x + w, y + r);
  c.lineTo(x + w, y + h - r);     c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);         c.quadraticCurveTo(x,     y + h, x,     y + h - r);
  c.lineTo(x, y + r);             c.quadraticCurveTo(x,     y,     x + r, y);
  c.closePath();
}