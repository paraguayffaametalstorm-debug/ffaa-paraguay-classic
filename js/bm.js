/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - CONTROLADOR CLIENTE DE BLACK MARKET (BM)
 * Módulo de Eventos Especiales, Misiones Diarias y Descuentos v3.7.0
 * ============================================================================
 */

/**
 * Sanitiza texto para prevenir inyecciones XSS en el DOM
 * @param {string} text - Texto a escapar
 * @returns {string} Texto seguro para inserción HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}

// Estado reactivo global del Black Market
const bmState = {
  activeEvent: null,
  currentDay: 1,
  selectedDay: 1,
  missionsByDay: { 1: [], 2: [], 3: [], 4: [], 5: [] },
  progress: null,
  discount: null,
  leaderboard: [],
  adminEvents: [],
  adminMissions: [],
  planeCatalog: []
};

/**
 * Devuelve el ID del evento BM activo en el estado.
 * Todos los endpoints BM de `/api/events-v2/bm/*` requieren eventId explícito.
 * Si no hay evento activo, devuelve null.
 *
 * @returns {string|null}
 */
function getActiveBmEventId() {
  return bmState.activeEvent?.id || null;
}

/**
 * Devuelve el evento BM activo COMPLETO (con metadata.missions fresca)
 * llamando al backend. Se usa para el CRUD de misiones, que necesita el
 * array completo de metadata.missions para modificar y persistir.
 *
 * @returns {Promise<Object|null>} el evento con .missions incluido, o null
 */
async function getActiveBmEventFull() {
  const active = bmState.adminEvents.find((e) => e.is_open || e.is_active) || bmState.adminEvents[0];
  if (!active?.id) return null;

  const res = await apiEventsV2BmGetById(active.id);
  if (!res?.success || !res.event) return null;
  return {
    ...res.event,
    missions: Array.isArray(res.missions) ? res.missions : (res.event.missions || [])
  };
}

// ============================================================
// 1. INICIALIZACIÓN Y CONTROL DE VISTAS
// ============================================================

/**
 * Inicializa el módulo de Black Market al cargar la aplicación
 */
function initBmModule() {
  console.log('⚡ [BM] Módulo Black Market inicializado v3.7.0');
  updateBmAdminVisibility();
}

/**
 * Muestra/oculta botones administrativos de BM según el rol del usuario
 */
function updateBmAdminVisibility() {
  const user = window.currentUser;
  const isAdmin = user && (user.role === 'ADMIN' || user.role === 'OWNER');

  const adminShortcut = document.getElementById('bmAdminShortcutBtn');
  if (adminShortcut) adminShortcut.style.display = isAdmin ? 'inline-flex' : 'none';

  const drawerBmAdmin = document.getElementById('drawerBmAdminBtn');
  if (drawerBmAdmin) drawerBmAdmin.style.display = isAdmin ? 'flex' : 'none';

  const headerBmAdmin = document.getElementById('bmAdminNavBtn');
  if (headerBmAdmin) headerBmAdmin.style.display = isAdmin ? 'inline-flex' : 'none';

  const panelTabs = ['bmPanelNavTab', 'bmPanelNavTab2', 'bmPanelNavTab3', 'bmPanelNavTab4'];
  panelTabs.forEach(tabId => {
    const el = document.getElementById(tabId);
    if (el) el.style.display = isAdmin ? 'inline-block' : 'none';
  });
}

// ============================================================
// 2. VISTA: MISIONES DIARIAS (bmMissionsView)
// ============================================================

/**
 * Carga datos para la vista de Misiones Diarias
 */
async function loadBmMissionsView() {
  updateBmAdminVisibility();
  try {
    // 1. Cargar evento activo (F4.2.2-F: wrapper nuevo)
    const eventRes = await apiEventsV2BmActive();
    if (eventRes && eventRes.success && eventRes.active && eventRes.event) {
      bmState.activeEvent = eventRes.event;
      bmState.currentDay = eventRes.current_day || 1;
      bmState.selectedDay = bmState.currentDay;
      updateBmBanner(eventRes);
    } else {
      bmState.activeEvent = null;
      renderBmNoActiveEvent();
      return;
    }

    // 2. Cargar misiones del evento
    await refreshBmMissions();
  } catch (err) {
    console.error('❌ [BM] Error cargando misiones:', err);
    showToast('⚠️ No se pudieron cargar las misiones del Black Market', 'warning');
  }
}

/**
 * Actualiza el banner superior de información del evento
 */
function updateBmBanner(eventRes) {
  const bannerName = document.getElementById('bmBannerEventName');
  if (bannerName) bannerName.textContent = eventRes.event.name;

  const bannerDates = document.getElementById('bmBannerDates');
  if (bannerDates && eventRes.event.start_date && eventRes.event.end_date) {
    const dStart = new Date(eventRes.event.start_date).toLocaleDateString('es-PY', { weekday: 'short', day: 'numeric', month: 'short' });
    const dEnd = new Date(eventRes.event.end_date).toLocaleDateString('es-PY', { weekday: 'short', day: 'numeric', month: 'short' });
    bannerDates.textContent = `${dStart} → ${dEnd} · 5 Días de Combate`;
  }

  const dayText = document.getElementById('bmBannerCurrentDayText');
  if (dayText) dayText.textContent = `Día ${eventRes.current_day || 1}`;

  // Countdown
  const countdownEl = document.getElementById('bmBannerCountdown');
  if (countdownEl && eventRes.remaining_ms) {
    const hours = Math.floor(eventRes.remaining_ms / (3600 * 1000));
    const mins = Math.floor((eventRes.remaining_ms % (3600 * 1000)) / (60 * 1000));
    countdownEl.textContent = `${hours}h ${mins}m restantes`;
  }
}

/**
 * Muestra mensaje cuando no hay evento activo
 */
function renderBmNoActiveEvent() {
  const grid = document.getElementById('bmMissionsGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="card" style="text-align:center;padding:2.5rem;grid-column:1/-1;">
        <div style="font-size:3rem;margin-bottom:1rem;">⏸️</div>
        <h3 style="color:#cbd5e0;">No hay ningún evento Black Market activo en este momento</h3>
        <p style="color:#a0aec0;max-width:500px;margin:8px auto 1.5rem auto;">
          El Black Market es una operación especial que se activa cada 1 a 2 meses reemplazando el Squadron Event.
        </p>
        ${(window.currentUser?.role === 'ADMIN' || window.currentUser?.role === 'OWNER') ? `
          <button onclick="showView('bmPanelView')" class="btn-primary" style="background:#d4af37;color:#000;font-weight:700;">
            ⚙️ Abrir Consola Oficial para Crear Evento
          </button>
        ` : ''}
      </div>
    `;
  }
}

/**
 * Refresca las misiones y progreso
 */
async function refreshBmMissions() {
  if (!bmState.activeEvent) {
    const evRes = await apiEventsV2BmActive();
    if (evRes?.success && evRes.event) {
      bmState.activeEvent = evRes.event;
      bmState.currentDay = evRes.current_day || 1;
    } else {
      renderBmNoActiveEvent();
      return;
    }
  }

  const eventId = getActiveBmEventId();
  if (!eventId) {
    renderBmNoActiveEvent();
    return;
  }

  try {
    // F4.2.2-F: el nuevo endpoint /progress devuelve todo en una sola
    // llamada (by_day + stats + missions). No hace falta pedir 2 veces.
    const progRes = await apiEventsV2BmGetProgress(eventId);

    if (!progRes?.success) {
      console.warn('⚠️ [BM] No se pudo obtener progreso:', progRes?.error);
      return;
    }

    // Misiones por día vienen en `by_day`
    if (progRes.by_day && typeof progRes.by_day === 'object') {
      bmState.missionsByDay = progRes.by_day;
    }

    // Guardar progreso completo
    bmState.progress = progRes;
    updateBmPointsDisplay(progRes);

    // Actualizar insignias en los botones de día
    updateDaysPills();

    // Renderizar misiones del día seleccionado
    renderBmMissions(bmState.selectedDay || bmState.currentDay);
  } catch (err) {
    console.error('❌ [BM] Error en refreshBmMissions:', err);
  }
}

/**
 * Actualiza los indicadores de puntos y descuento en el banner
 */
function updateBmPointsDisplay(prog) {
  const ptsEl = document.getElementById('bmBannerPointsText');
  const maxPts = prog.max_points || 250;
  if (ptsEl) ptsEl.textContent = `(${prog.total_points || 0} / ${maxPts} pts)`;

  const descEl = document.getElementById('bmBannerDiscountText');
  if (descEl) descEl.textContent = `${prog.discount_percentage || 0}%`;
}

/**
 * Actualiza las insignias de estado (0/3 completadas) en los 5 botones de día
 */
function updateDaysPills() {
  for (let d = 1; d <= 5; d++) {
    const badge = document.getElementById(`dayBadge${d}`);
    const missions = bmState.missionsByDay[d] || [];
    const completed = missions.filter(m => m.completed).length;

    if (badge) {
      badge.textContent = `${completed} / 3`;
      if (completed === 3) {
        badge.style.color = '#2ecc71';
        badge.textContent = '3/3 ⭐ 100%';
      } else if (completed > 0) {
        badge.style.color = '#f39c12';
      } else {
        badge.style.color = '#cbd5e0';
      }
    }
  }
}

/**
 * Maneja el cambio de día seleccionado en las misiones
 */
function selectBmMissionDay(day) {
  bmState.selectedDay = Number(day);

  // Actualizar clases de botones
  const buttons = document.querySelectorAll('#bmDaysSelector .bm-day-card');
  buttons.forEach(btn => {
    if (Number(btn.getAttribute('data-day')) === Number(day)) {
      btn.classList.add('active');
      btn.style.borderColor = '#e74c3c';
      btn.style.background = 'rgba(231,76,60,0.15)';
    } else {
      btn.classList.remove('active');
      btn.style.borderColor = '';
      btn.style.background = '';
    }
  });

  renderBmMissions(day);
}

/**
 * Renderiza el grid de misiones para el día seleccionado
 */
function renderBmMissions(day) {
  const dayNum = Number(day);
  const dayNames = ['', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const title = document.getElementById('bmSelectedDayTitle');
  if (title) title.textContent = `🎯 Misiones del Día ${dayNum} (${dayNames[dayNum] || ''})`;

  const missions = bmState.missionsByDay[dayNum] || [];
  const completedCount = missions.filter(m => m.completed).length;
  const allCompleted = completedCount === 3 && missions.length === 3;

  // Actualizar bonus diario
  const bonusStatus = document.getElementById('bmDailyBonusStatus');
  const bonusCard = document.getElementById('bmDailyBonusCard');
  if (bonusStatus && bonusCard) {
    if (allCompleted) {
      bonusStatus.innerHTML = '<span style="color:#2ecc71;">¡Bonus de +25 pts Adjudicado! (100% de objetivos cumplidos)</span>';
      bonusCard.style.borderColor = '#2ecc71';
      bonusCard.style.background = 'rgba(46,204,113,0.15)';
    } else {
      bonusStatus.innerHTML = `Cumplidas ${completedCount}/3 misiones. Completa las 3 para ganar <strong>+25 pts de bonus</strong>`;
      bonusCard.style.borderColor = '#d4af37';
      bonusCard.style.background = 'rgba(212,175,55,0.1)';
    }
  }

  const grid = document.getElementById('bmMissionsGrid');
  if (!grid) return;

  if (missions.length === 0) {
    grid.innerHTML = `
      <div class="card" style="grid-column:1/-1;text-align:center;padding:2rem;">
        <p style="color:#a0aec0;">No hay misiones tácticas programadas para el Día ${dayNum}.</p>
      </div>
    `;
    return;
  }

  const typeConfig = {
    dedication: {
      name: 'Dedicación',
      icon: '✈️',
      color: '#3498db',
      bg: 'rgba(52,152,219,0.12)',
      border: '#3498db'
    },
    skill: {
      name: 'Habilidad',
      icon: '🏆',
      color: '#d4af37',
      bg: 'rgba(212,175,55,0.12)',
      border: '#d4af37'
    },
    teamwork: {
      name: 'Trabajo en Equipo',
      icon: '👥',
      color: '#2ecc71',
      bg: 'rgba(46,204,113,0.12)',
      border: '#2ecc71'
    }
  };

  grid.innerHTML = missions.map(m => {
    const cfg = typeConfig[m.type] || typeConfig.dedication;
    const isDone = Boolean(m.completed);

    return `
      <div class="card mission-tactical-card" style="border-left:4px solid ${cfg.border};position:relative;background:${isDone ? 'rgba(46,204,113,0.05)' : 'rgba(10,14,26,0.7)'};display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <!-- Header de Misión -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.border};padding:2px 8px;border-radius:4px;font-size:0.75rem;font-weight:700;">
              ${cfg.icon} ${cfg.name.toUpperCase()}
            </span>
            <span class="status-badge" style="background:${isDone ? '#2ecc71' : 'rgba(255,255,255,0.1)'};color:#fff;font-size:0.75rem;">
              ${isDone ? '✅ CUMPLIDA' : 'PENDIENTE'}
            </span>
          </div>

          <h4 style="margin:6px 0 8px 0;color:#fff;font-size:1.05rem;">${escapeHtml(m.description)}</h4>
          <p style="font-size:0.85rem;color:#cbd5e0;margin-bottom:12px;">
            <strong style="color:#a0aec0;">Objetivo:</strong> ${escapeHtml(m.requirement || '')}
          </p>

          <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,0,0,0.25);padding:8px 10px;border-radius:6px;font-size:0.85rem;margin-bottom:12px;">
            <span style="color:#a0aec0;">Meta Operativa:</span>
            <strong style="color:#fff;">${m.target_value}</strong>
          </div>
        </div>

        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
            <span style="color:#d4af37;font-weight:700;font-size:0.95rem;">+${m.points || 25} Puntos BM</span>
            ${isDone ? '<span style="font-size:0.75rem;color:#2ecc71;">+25 pts otorgados</span>' : ''}
          </div>

          <button 
            type="button"
            onclick="toggleBmMissionComplete('${m.id}', ${!isDone})"
            class="${isDone ? 'btn-secondary' : 'btn-primary'}"
            style="width:100%;${isDone ? 'border-color:#2ecc71;color:#2ecc71;' : 'background:#27ae60;border-color:#2ecc71;'}"
          >
            ${isDone ? '↩️ Desmarcar Misión' : '✅ Marcar como Cumplida (+25 pts)'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Alterna el estado de una misión (completar / desmarcar)
 */
async function toggleBmMissionComplete(missionId, completed) {
  const eventId = getActiveBmEventId();
  if (!eventId) {
    showToast('⚠️ No hay evento Black Market activo', 'warning');
    return;
  }

  // El nuevo modelo identifica la misión por (day, mission_type) en vez de un ID
  // de fila. Necesitamos derivar ambos desde bmState.missionsByDay.
  const mission = findMissionById(missionId);
  if (!mission) {
    console.error('❌ [BM] Misión no encontrada en el estado:', missionId);
    showToast('❌ Misión no encontrada en el estado local', 'error');
    return;
  }

  try {
    // F4.2.2-F: Modo 1 (toggle granular) del endpoint /progress
    const res = await apiEventsV2BmUpdateProgress(eventId, {
      day: Number(mission.day),
      mission_type: mission.type,
      completed: Boolean(completed)
    });

    if (res && res.success) {
      showToast(res.message || 'Progreso actualizado', 'success');
      await refreshBmMissions();
    } else {
      showToast('❌ ' + (res?.error || 'No se pudo actualizar la misión'), 'error');
    }
  } catch (err) {
    console.error('❌ [BM] Error al completar misión:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

/**
 * Busca una misión por su ID dentro de bmState.missionsByDay.
 * El modelo nuevo no expone IDs de misión estables (viven en metadata.missions
 * del evento), así que las misiones se identifican por (day, type).
 *
 * El render de tarjetas usa `m.id` como identificador visual (puede ser
 * sintético: `${day}-${type}`). Este helper lo resuelve a la misión real.
 *
 * @param {string} missionId - ID sintético (ej: "1-dedication")
 * @returns {Object|null}
 */
function findMissionById(missionId) {
  if (!missionId) return null;
  // Si el ID es compuesto "day-type", parsearlo directamente
  const parts = String(missionId).split('-');
  if (parts.length === 2) {
    const day = Number(parts[0]);
    const type = parts[1];
    const dayMissions = bmState.missionsByDay[day] || [];
    return dayMissions.find((m) => m.type === type) || null;
  }
  // Fallback: buscar en todos los días por ID directo (compatibilidad)
  for (const d of Object.keys(bmState.missionsByDay)) {
    const found = (bmState.missionsByDay[d] || []).find((m) => String(m.id) === String(missionId));
    if (found) return found;
  }
  return null;
}

// ============================================================
// 3. VISTA: MI PROGRESO (bmProgressView)
// ============================================================

/**
 * Carga la vista de progreso del combatiente
 */
async function loadBmProgressView() {
  updateBmAdminVisibility();
  await refreshBmProgress();
}

/**
 * Refresca los datos de progreso
 */
async function refreshBmProgress() {
  const eventId = getActiveBmEventId();
  if (!eventId) {
    showToast('No hay evento Black Market activo', 'info');
    return;
  }

  try {
    const prog = await apiEventsV2BmGetProgress(eventId);
    if (!prog || !prog.success) {
      showToast('⚠️ No se pudo cargar el progreso', 'warning');
      return;
    }
    bmState.progress = prog;
    renderBmProgress(prog);
  } catch (err) {
    console.error('❌ [BM] Error en refreshBmProgress:', err);
  }
}

/**
 * Renderiza el panel de progreso
 */
function renderBmProgress(prog) {
  const totalPts = prog.total_points || 0;
  const discountPct = prog.discount_percentage || 0;

  // KPI cards
  const elPts = document.getElementById('progTotalPoints');
  if (elPts) elPts.textContent = `${totalPts} / 250`;

  const elDisc = document.getElementById('progDiscountPercent');
  if (elDisc) elDisc.textContent = `${discountPct}%`;

  const elCount = document.getElementById('progCompletedCount');
  if (elCount) elCount.textContent = `${prog.completed_count || 0} / 15`;

  const elBonus = document.getElementById('progBonusPoints');
  if (elBonus) elBonus.textContent = `+${prog.bonus_points || 0} pts`;

  // Barra de progreso (escala 0% a 50%, mapped to 0% - 100% width)
  const bar = document.getElementById('progDiscountBar');
  const badge = document.getElementById('progDiscountBadge');
  const barWidth = Math.min(100, Math.round((totalPts / 250) * 100));

  if (bar) bar.style.width = `${barWidth}%`;
  if (badge) {
    badge.textContent = `${discountPct}% de Descuento`;
    badge.style.background = discountPct >= 50 ? '#2ecc71' : '#e74c3c';
  }

  // Desglose día por día
  const daysGrid = document.getElementById('progDaysBreakdown');
  if (daysGrid) {
    const completedByDay = prog.completed_by_day || {};
    const dayNames = ['', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    daysGrid.innerHTML = [1, 2, 3, 4, 5].map(d => {
      const c = completedByDay[d] || 0;
      const isFull = c >= 3;
      const dayPts = (c * 25) + (isFull ? 25 : 0);

      return `
        <div class="card" style="text-align:center;padding:1rem;border-top:3px solid ${isFull ? '#2ecc71' : '#d4af37'};">
          <div style="font-size:0.75rem;color:#a0aec0;text-transform:uppercase;">${dayNames[d]}</div>
          <h4 style="margin:4px 0;">DÍA ${d}</h4>
          <div style="font-size:1.4rem;font-weight:700;color:${isFull ? '#2ecc71' : '#fff'};margin:4px 0;">
            ${c} / 3
          </div>
          <div style="font-size:0.8rem;color:#d4af37;">${dayPts} pts acumulados</div>
          ${isFull ? '<div style="font-size:0.7rem;color:#2ecc71;margin-top:4px;">⭐ Bonus +25 pts</div>' : ''}
        </div>
      `;
    }).join('');
  }

  // Registro de misiones completadas
  const logContainer = document.getElementById('progMissionsLog');
  if (logContainer) {
    const list = prog.missions_progress?.filter(m => m.completed) || [];
    if (list.length === 0) {
      logContainer.innerHTML = '<p style="color:#a0aec0;text-align:center;padding:1.5rem;">Aún no has completado misiones en este evento.</p>';
    } else {
      logContainer.innerHTML = `
        <div class="table-responsive">
          <table class="tactical-table" style="width:100%;">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:#a0aec0;font-size:0.8rem;">
                <th style="padding:8px;">Día</th>
                <th style="padding:8px;">Misión</th>
                <th style="padding:8px;text-align:right;">Puntos</th>
                <th style="padding:8px;text-align:right;">Fecha / Hora</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(p => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85rem;">
                  <td style="padding:8px;color:#d4af37;">Día ${p.day}</td>
                  <td style="padding:8px;color:#fff;">Misión ${p.mission_id}</td>
                  <td style="padding:8px;text-align:right;color:#2ecc71;">+${p.points_earned || 25} pts</td>
                  <td style="padding:8px;text-align:right;color:#a0aec0;">${p.completed_at ? new Date(p.completed_at).toLocaleTimeString('es-PY') : 'Hoy'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  }
}

// ============================================================
// 4. VISTA: OFERTA & DESCUENTO (bmDiscountView)
// ============================================================

/**
 * Carga la vista de oferta de aeronave y descuento
 */
async function loadBmDiscountView() {
  updateBmAdminVisibility();
  await refreshBmDiscount();
}

/**
 * Refresca la información del caza ofertado y cálculo de precio
 */
async function refreshBmDiscount() {
  const eventId = getActiveBmEventId();
  if (!eventId) {
    showToast('No hay evento Black Market activo', 'info');
    return;
  }

  try {
    const res = await apiEventsV2BmGetDiscount(eventId);
    if (!res || !res.success) {
      showToast('⚠️ No se pudo cargar la oferta', 'warning');
      return;
    }
    bmState.discount = res;
    renderBmDiscount(res);
  } catch (err) {
    console.error('❌ [BM] Error en refreshBmDiscount:', err);
  }
}

/**
 * Renderiza la ficha técnica y desglose de precio
 */
function renderBmDiscount(data) {
  const plane = data.aircraft || {};
  const pricing = data.pricing || {};

  // Ficha de la aeronave
  const nameEl = document.getElementById('discPlaneName');
  if (nameEl) nameEl.textContent = plane.name || 'Caza de Superioridad Aérea';

  const typeEl = document.getElementById('discPlaneType');
  if (typeEl) typeEl.textContent = plane.type || 'Aeronave Táctica';

  const tierBadge = document.getElementById('discPlaneTierBadge');
  if (tierBadge) tierBadge.textContent = `TIER ${plane.tier || 4}`;

  const idBadge = document.getElementById('discPlaneIdBadge');
  if (idBadge) idBadge.textContent = `ID: #${plane.id || '125'}`;

  // Stats
  const stats = plane.stats_real || {};
  const statSpeed = document.getElementById('discStatSpeed');
  if (statSpeed) statSpeed.textContent = stats.velocidad ? `${stats.velocidad} km/h` : '2,650 km/h';

  const statAgility = document.getElementById('discStatAgility');
  if (statAgility) statAgility.textContent = stats.agilidad || '84';

  const statArmor = document.getElementById('discStatArmor');
  if (statArmor) statArmor.textContent = stats.blindaje || '1,550';

  const statFirepower = document.getElementById('discStatFirepower');
  if (statFirepower) statFirepower.textContent = stats.potencia_armas || '1,900';

  const specialEl = document.getElementById('discSpecialName');
  if (specialEl) specialEl.textContent = plane.special_name || 'Salva AMRAAM';

  const passiveEl = document.getElementById('discPassiveName');
  if (passiveEl) passiveEl.textContent = plane.passive_name || 'Radar AESA';

  // Porcentaje y Precios
  const pct = data.discount_percentage || 0;
  const mainPct = document.getElementById('discMainPercent');
  if (mainPct) mainPct.textContent = `${pct}%`;

  const subPoints = document.getElementById('discPointsSub');
  if (subPoints) subPoints.textContent = `Basado en ${data.total_points || 0} puntos acumulados (máx 50%)`;

  const baseEl = document.getElementById('discBasePrice');
  const basePriceShards = Number(pricing.base_price_shards) || 0;
  if (baseEl) baseEl.textContent = `${basePriceShards.toLocaleString('es-PY')} Shards`;

  const pctLabel = document.getElementById('discPercentLabel');
  if (pctLabel) pctLabel.textContent = `${pct}%`;

  const savingsEl = document.getElementById('discSavings');
  const discountShards = Number(pricing.discount_shards) || 0;
  if (savingsEl) savingsEl.textContent = `-${discountShards.toLocaleString('es-PY')} Shards`;

  const finalEl = document.getElementById('discFinalPrice');
  const finalPriceShards = Number(pricing.final_price_shards) || 0;
  if (finalEl) finalEl.textContent = `${finalPriceShards.toLocaleString('es-PY')} Shards`;

  // Comportamiento de botón de compra
  const actionContainer = document.getElementById('discActionContainer');
  const purchasedBanner = document.getElementById('discPurchasedBanner');
  const purchasedDate = document.getElementById('discPurchasedDate');

  if (data.purchased) {
    if (actionContainer) actionContainer.style.display = 'none';
    if (purchasedBanner) purchasedBanner.style.display = 'block';
    if (purchasedDate && data.purchased_at) {
      purchasedDate.textContent = `Adquirido el ${new Date(data.purchased_at).toLocaleString('es-PY')}`;
    }
  } else {
    if (actionContainer) actionContainer.style.display = 'block';
    if (purchasedBanner) purchasedBanner.style.display = 'none';
  }
}

/**
 * Ejecuta la adquisición de la aeronave con descuento
 */
async function executeBmPurchase() {
  const eventId = getActiveBmEventId();
  if (!eventId) {
    showToast('⚠️ No hay evento Black Market activo', 'warning');
    return;
  }

  const confirmed = confirm(
    '¿Confirmas la adquisición de esta aeronave con tu descuento militar acumulado del Black Market?'
  );
  if (!confirmed) return;

  const btn = document.getElementById('btnPurchaseBm');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Procesando adquisición...';
  }

  try {
    const res = await apiEventsV2BmPurchase(eventId);
    if (res && res.success) {
      showToast(res.message || '¡Aeronave reclamada exitosamente!', 'success');
      await refreshBmDiscount();
    } else {
      showToast('❌ ' + (res?.error || 'No se pudo reclamar la aeronave'), 'error');
    }
  } catch (err) {
    console.error('❌ [BM] Error al adquirir aeronave:', err);
    showToast('❌ ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>⚡</span> Reclamar Aeronave con Descuento Militar';
    }
  }
}

// ============================================================
// 5. VISTA: TABLA DE POSICIONES (bmLeaderboardView)
// ============================================================

/**
 * Carga la tabla de posiciones de Black Market
 */
async function loadBmLeaderboardView() {
  updateBmAdminVisibility();
  await refreshBmLeaderboard();
}

/**
 * Refresca la tabla de posiciones
 */
async function refreshBmLeaderboard() {
  const eventId = getActiveBmEventId();
  if (!eventId) {
    // Intentar recuperar el evento activo primero
    const evRes = await apiEventsV2BmActive();
    if (evRes?.success && evRes.event?.id) {
      bmState.activeEvent = evRes.event;
    } else {
      showToast('No hay evento Black Market activo', 'info');
      return;
    }
  }

  const eid = getActiveBmEventId();
  if (!eid) return;

  try {
    const res = await apiEventsV2BmGetLeaderboard(eid);
    if (res && res.success && Array.isArray(res.leaderboard)) {
      bmState.leaderboard = res.leaderboard;
      renderBmLeaderboard();
    }
  } catch (err) {
    console.error('❌ [BM] Error en refreshBmLeaderboard:', err);
  }
}

/**
 * Renderiza el podio top 3 y la tabla
 */
function renderBmLeaderboard(filterText = '') {
  let list = [...bmState.leaderboard];

  if (filterText) {
    const search = filterText.toLowerCase();
    list = list.filter(p => p.nick.toLowerCase().includes(search));
  }

  // Podio Top 3 (si no hay filtro activo)
  const podium = document.getElementById('bmPodiumContainer');
  if (podium) {
    if (!filterText && bmState.leaderboard.length >= 3) {
      const p1 = bmState.leaderboard[0];
      const p2 = bmState.leaderboard[1];
      const p3 = bmState.leaderboard[2];

      podium.innerHTML = `
        <div class="card" style="border:1.5px solid #bdc3c7;text-align:center;padding:1.2rem;background:linear-gradient(180deg, rgba(189,195,199,0.1) 0%, rgba(10,14,26,0.8) 100%);">
          <div style="font-size:2rem;">🥈</div>
          <h4 style="margin:4px 0;color:#bdc3c7;">2° LUGAR</h4>
          <h3 style="margin:4px 0;color:#fff;">${escapeHtml(p2.nick)}</h3>
          <div style="font-size:1.3rem;font-weight:700;color:#d4af37;">${p2.total_points} pts</div>
          <span style="font-size:0.8rem;color:#2ecc71;">${p2.discount_percentage}% Descuento</span>
        </div>

        <div class="card" style="border:2px solid #d4af37;text-align:center;padding:1.5rem;transform:scale(1.03);background:linear-gradient(180deg, rgba(212,175,55,0.15) 0%, rgba(10,14,26,0.9) 100%);">
          <div style="font-size:2.5rem;">👑 🥇</div>
          <h4 style="margin:4px 0;color:#d4af37;">1° LUGAR AS BM</h4>
          <h2 style="margin:4px 0;color:#fff;font-size:1.4rem;">${escapeHtml(p1.nick)}</h2>
          <div style="font-size:1.8rem;font-weight:900;color:#2ecc71;">${p1.total_points} pts</div>
          <span style="font-size:0.85rem;color:#d4af37;font-weight:700;">${p1.discount_percentage}% Descuento</span>
        </div>

        <div class="card" style="border:1.5px solid #cd7f32;text-align:center;padding:1.2rem;background:linear-gradient(180deg, rgba(205,127,50,0.1) 0%, rgba(10,14,26,0.8) 100%);">
          <div style="font-size:2rem;">🥉</div>
          <h4 style="margin:4px 0;color:#cd7f32;">3° LUGAR</h4>
          <h3 style="margin:4px 0;color:#fff;">${escapeHtml(p3.nick)}</h3>
          <div style="font-size:1.3rem;font-weight:700;color:#d4af37;">${p3.total_points} pts</div>
          <span style="font-size:0.8rem;color:#2ecc71;">${p3.discount_percentage}% Descuento</span>
        </div>
      `;
    } else if (filterText) {
      podium.innerHTML = '';
    }
  }

  // Tabla completa
  const tbody = document.getElementById('bmLeaderboardTbody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:#a0aec0;">No se encontraron pilotos</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => {
    const isMe = window.currentUser && String(window.currentUser.id) === String(item.user_id);
    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);background:${isMe ? 'rgba(231,76,60,0.08)' : 'transparent'};">
        <td style="padding:10px;font-weight:700;color:${item.rank <= 3 ? '#d4af37' : '#cbd5e0'};">
          #${item.rank}
        </td>
        <td style="padding:10px;font-weight:600;color:#fff;">
          ${escapeHtml(item.nick)} ${isMe ? '<span style="color:#e74c3c;font-size:0.75rem;">(Tú)</span>' : ''}
        </td>
        <td style="padding:10px;font-size:0.8rem;color:#a0aec0;">
          ${item.role}
        </td>
        <td style="padding:10px;text-align:center;color:#cbd5e0;">
          ${item.completed_missions} / 15
        </td>
        <td style="padding:10px;text-align:center;color:#cbd5e0;">
          ${item.days_active} / 5
        </td>
        <td style="padding:10px;text-align:right;font-weight:700;color:#d4af37;">
          ${item.total_points} pts
        </td>
        <td style="padding:10px;text-align:right;font-weight:700;color:#2ecc71;">
          ${item.discount_percentage}%
        </td>
        <td style="padding:10px;text-align:center;">
          ${item.purchased 
            ? '<span class="status-badge" style="background:#2ecc71;color:#fff;font-size:0.7rem;">ADQUIRIDO</span>' 
            : '<span style="color:#a0aec0;font-size:0.75rem;">—</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Filtro en vivo para la tabla de posiciones
 */
function filterBmLeaderboard() {
  const input = document.getElementById('bmLeaderboardSearch');
  renderBmLeaderboard(input ? input.value.trim() : '');
}

// ============================================================
// 6. VISTA: PANEL DE ADMINISTRACIÓN BM (bmPanelView)
// ============================================================

/**
 * Carga el panel de administración de Black Market
 */
async function loadBmPanelView() {
  updateBmAdminVisibility();
  await refreshBmPanel();
}

/**
 * Refresca todos los datos de la consola administrativa
 */
async function refreshBmPanel() {
  try {
    // 1. Traer lista de eventos BM + catálogo de aviones en paralelo
    const [eventsRes, planeCatalogRes] = await Promise.all([
      apiEventsV2BmList(),
      apiGetPlaneModels ? apiGetPlaneModels() : Promise.resolve([])
    ]);

    // 2. Catálogo de aeronaves para selects
    if (Array.isArray(planeCatalogRes)) {
      bmState.planeCatalog = planeCatalogRes;
      populatePlaneSelect(planeCatalogRes);
    } else if (planeCatalogRes?.models) {
      bmState.planeCatalog = planeCatalogRes.models;
      populatePlaneSelect(planeCatalogRes.models);
    }

    // 3. Eventos
    if (!eventsRes?.success || !Array.isArray(eventsRes.events)) {
      console.warn('⚠️ [BM] No se pudieron cargar eventos BM:', eventsRes?.error);
      return;
    }

    bmState.adminEvents = eventsRes.events;
    renderAdminEvents(eventsRes.events);

    // El modelo nuevo usa `is_open` (derivado de status === 'OPEN').
    // Legacy usaba `is_active`. Soportamos ambos por robustez.
    const active = eventsRes.events.find((e) => e.is_open || e.is_active);
    renderAdminCurrentEvent(active);

    // 4. Si hay evento activo: traer stats + misiones del detalle
    if (active) {
      const [statsRes, detailRes] = await Promise.all([
        apiEventsV2BmGetStats(active.id),
        apiEventsV2BmGetById(active.id)
      ]);

      // 4a. KPIs admin
      if (statsRes?.success && statsRes.stats) {
        const s = statsRes.stats;
        const elPilots = document.getElementById('bmAdminStatPilots');
        if (elPilots) elPilots.textContent = s.total_participants || '0';

        const elPts = document.getElementById('bmAdminStatPoints');
        if (elPts) elPts.textContent = (s.total_points_accumulated || 0).toLocaleString('es-PY');

        const elPurchased = document.getElementById('bmAdminStatPurchased');
        if (elPurchased) elPurchased.textContent = s.aircraft_purchased_count || '0';

        const elMissions = document.getElementById('bmAdminStatMissions');
        if (elMissions) elMissions.textContent = s.missions_completed_total || '0';
      } else {
        console.warn('⚠️ [BM] No se pudieron cargar stats:', statsRes?.error);
      }

      // 4b. Misiones del evento (vienen dentro del detalle)
      if (detailRes?.success && Array.isArray(detailRes.missions)) {
        bmState.adminMissions = detailRes.missions;
        renderAdminMissions(detailRes.missions);
      }
    }
  } catch (err) {
    console.error('❌ [BM] Error en refreshBmPanel:', err);
  }
}

/**
 * Llena el dropdown de aeronaves en el modal de creación de eventos
 */
function populatePlaneSelect(planes) {
  const sel = document.getElementById('bmEventFormAircraft');
  if (!sel) return;

  sel.innerHTML = '<option value="">— Seleccionar Aeronave Oficial —</option>';
  planes.forEach(p => {
    sel.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)} (${p.type || 'Tier ' + p.tier})</option>`;
  });
}

/**
 * Renderiza el detalle del evento actualmente activo en la consola oficial
 */
function renderAdminCurrentEvent(active) {
  const container = document.getElementById('bmAdminCurrentEventDetails');
  const actions = document.getElementById('bmAdminEventActions');
  if (!container) return;

  if (!active) {
    container.innerHTML = `
      <div style="padding:1rem;color:#a0aec0;text-align:center;">
        No hay ningún evento Black Market activo en este momento.
      </div>
    `;
    if (actions) actions.innerHTML = '';
    return;
  }

  // El evento BM usa `aircraft_name` aplanado desde metadata (normalizeBmEvent).
  const aircraftName = active.aircraft_name || 'F-15EX Eagle II';
  const maxDiscountShards = active.max_discount_shards ?? 250;
  const startStr = active.start_date ? new Date(active.start_date).toLocaleDateString('es-PY') : '—';
  const endStr = active.end_date ? new Date(active.end_date).toLocaleDateString('es-PY') : '—';

  // Escapamos el ID (UUID) para evitar problemas al pasar como string en el onclick.
  const safeId = escapeHtml(String(active.id));

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;">
      <div>
        <span style="font-size:0.75rem;color:#a0aec0;text-transform:uppercase;">Nombre:</span>
        <h4 style="color:#fff;margin:2px 0;">${escapeHtml(active.name)}</h4>
        <p style="font-size:0.85rem;color:#cbd5e0;margin:4px 0;">${escapeHtml(active.notes || '')}</p>
      </div>
      <div>
        <span style="font-size:0.75rem;color:#a0aec0;text-transform:uppercase;">Período Operativo:</span>
        <div style="font-size:0.85rem;color:#cbd5e0;margin-top:2px;">
          ${startStr} → ${endStr}
        </div>
        <span class="status-badge" style="background:#2ecc71;color:#fff;margin-top:6px;">EN CURSO</span>
      </div>
      <div>
        <span style="font-size:0.75rem;color:#a0aec0;text-transform:uppercase;">Caza en Promoción:</span>
        <div style="font-weight:700;color:#d4af37;margin-top:2px;">${escapeHtml(aircraftName)}</div>
        <div style="font-size:0.8rem;color:#a0aec0;">Máx Descuento: ${maxDiscountShards} shards</div>
      </div>
    </div>
  `;

  if (actions) {
    actions.innerHTML = `
      <button onclick="toggleBmEventStatus('${safeId}', false)" class="btn-secondary btn-sm" style="border-color:#e74c3c;color:#e74c3c;">
        ⏹️ Desactivar Evento
      </button>
      <button onclick="showEditBmEventModal('${safeId}')" class="btn-secondary btn-sm">
        ✏️ Editar Evento
      </button>
    `;
  }
}

/**
 * Renderiza la lista completa de eventos históricos y actuales
 */
function renderAdminEvents(events) {
  const tbody = document.getElementById('bmAdminEventsTbody');
  if (!tbody) return;

  if (!Array.isArray(events) || events.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#a0aec0;">No hay eventos registrados</td></tr>';
    return;
  }

  tbody.innerHTML = events.map((e) => {
    const isOpen = Boolean(e.is_open || e.is_active);
    const aircraftName = e.aircraft_name || e.aircraft_id || 'F-15EX';
    const startStr = e.start_date ? new Date(e.start_date).toLocaleDateString('es-PY') : '—';
    const endStr = e.end_date ? new Date(e.end_date).toLocaleDateString('es-PY') : '—';
    const safeId = escapeHtml(String(e.id));
    // El ID es UUID: cortamos a 8 chars para la columna
    const shortId = safeId.split('-')[0] || safeId;

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
        <td style="padding:10px;font-family:monospace;color:#a0aec0;font-size:0.8rem;" title="${safeId}">#${shortId}</td>
        <td style="padding:10px;font-weight:600;color:#fff;">${escapeHtml(e.name)}</td>
        <td style="padding:10px;font-size:0.85rem;color:#cbd5e0;">
          ${startStr} - ${endStr}
        </td>
        <td style="padding:10px;color:#d4af37;">${escapeHtml(aircraftName)}</td>
        <td style="padding:10px;">
          <span class="status-badge" style="background:${isOpen ? '#2ecc71' : '#7f8c8d'};color:#fff;font-size:0.75rem;">
            ${isOpen ? 'ACTIVO' : 'INACTIVO'}
          </span>
        </td>
        <td style="padding:10px;text-align:right;">
          ${isOpen
            ? `<button onclick="toggleBmEventStatus('${safeId}', false)" class="btn-secondary btn-sm" style="color:#e74c3c;">Desactivar</button>`
            : `<button onclick="toggleBmEventStatus('${safeId}', true)" class="btn-primary btn-sm" style="background:#27ae60;">Activar</button>`}
          <button onclick="showEditBmEventModal('${safeId}')" class="btn-secondary btn-sm">Editar</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Renderiza las misiones configuradas en la consola administrativa
 */
function renderAdminMissions(missions) {
  const tbody = document.getElementById('bmAdminMissionsTbody');
  if (!tbody) return;

  const dayFilter = document.getElementById('bmAdminDayFilter')?.value || 'all';
  let filtered = missions.filter(m => m.is_active !== false);

  if (dayFilter !== 'all') {
    filtered = filtered.filter(m => Number(m.day) === Number(dayFilter));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#a0aec0;">No hay misiones configuradas para este criterio</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(m => `
    <tr style="border-bottom:1px solid rgba(255,255,255,0.06);font-size:0.85rem;">
      <td style="padding:10px;font-weight:700;color:#cbd5e0;">Día ${m.day}</td>
      <td style="padding:10px;">
        <span style="font-size:0.75rem;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.08);color:#fff;">
          ${m.type}
        </span>
      </td>
      <td style="padding:10px;color:#fff;max-width:260px;">${escapeHtml(m.description)}</td>
      <td style="padding:10px;color:#cbd5e0;">${escapeHtml(m.requirement || '')} (Meta: ${m.target_value})</td>
      <td style="padding:10px;text-align:center;color:#d4af37;font-weight:700;">+${m.points} pts</td>
      <td style="padding:10px;text-align:right;">
        <button onclick="showEditBmMissionModal('${m.id}')" class="btn-secondary btn-sm">Editar</button>
        <button onclick="deleteBmMissionConfirm('${m.id}')" class="btn-danger btn-sm">Desactivar</button>
      </td>
    </tr>
  `).join('');
}

/**
 * Filtro por día en la tabla administrativa de misiones
 */
function filterAdminMissionsByDay() {
  renderAdminMissions(bmState.adminMissions);
}

// ============================================================
// 7. MODALES Y OPERACIONES CRUD (EVENTOS Y MISIONES)
// ============================================================

/**
 * Abre modal para nuevo evento BM
 */
function showCreateBmEventModal() {
  document.getElementById('bmEventModalTitle').textContent = 'Nuevo Evento Black Market';
  document.getElementById('bmEventFormId').value = '';
  document.getElementById('bmEventFormName').value = 'Operación Black Market ' + new Date().getFullYear();
  document.getElementById('bmEventFormDescription').value = 'Evento especial de 5 días con misiones diarias y hasta un 50% de descuento en caza exclusivo.';

  const now = new Date();
  const nextWed = new Date(now.getTime() + 24 * 3600 * 1000);
  const nextSun = new Date(nextWed.getTime() + 4 * 24 * 3600 * 1000);

  document.getElementById('bmEventFormStartDate').value = nextWed.toISOString().slice(0, 16);
  document.getElementById('bmEventFormEndDate').value = nextSun.toISOString().slice(0, 16);
  document.getElementById('bmEventFormIsActive').checked = true;

  document.getElementById('bmEventModal').style.display = 'block';
}

/**
 * Abre modal para editar evento existente
 */
function showEditBmEventModal(id) {
  const ev = bmState.adminEvents.find((e) => String(e.id) === String(id));
  if (!ev) return;

  // El ID es UUID: mostramos solo los primeros 8 chars en el título.
  const shortId = String(ev.id).split('-')[0] || ev.id;
  document.getElementById('bmEventModalTitle').textContent = 'Editar Evento Black Market #' + shortId;
  document.getElementById('bmEventFormId').value = ev.id;
  document.getElementById('bmEventFormName').value = ev.name || '';
  document.getElementById('bmEventFormDescription').value = ev.notes || '';
  document.getElementById('bmEventFormStartDate').value = ev.start_date
    ? new Date(ev.start_date).toISOString().slice(0, 16)
    : '';
  document.getElementById('bmEventFormEndDate').value = ev.end_date
    ? new Date(ev.end_date).toISOString().slice(0, 16)
    : '';
  document.getElementById('bmEventFormAircraft').value = ev.aircraft_id || '';
  document.getElementById('bmEventFormIsActive').checked = Boolean(ev.is_open || ev.is_active);

  document.getElementById('bmEventModal').style.display = 'block';
}

function closeBmEventModal() {
  document.getElementById('bmEventModal').style.display = 'none';
}

/**
 * Guarda o actualiza un evento BM
 */
async function saveBmEvent(e) {
  e.preventDefault();
  const id = document.getElementById('bmEventFormId').value;
  const name = document.getElementById('bmEventFormName').value.trim();
  const description = document.getElementById('bmEventFormDescription').value.trim();
  const start_date = new Date(document.getElementById('bmEventFormStartDate').value).toISOString();
  const end_date = new Date(document.getElementById('bmEventFormEndDate').value).toISOString();
  const aircraft_id = document.getElementById('bmEventFormAircraft').value;
  const is_active = document.getElementById('bmEventFormIsActive').checked;

  // F4.2.2-F: el nuevo schema BM exige que los datos del evento
  // (aeronave, notas, economía) vivan en metadata.
  const metadata = {
    aircraft_id: aircraft_id || '125',
    aircraft_name: (bmState.planeCatalog.find((p) => String(p.id) === String(aircraft_id)) || {}).name || null,
    base_price_shards: 500,
    max_discount_shards: 250,
    max_points: 250,
    discount_per_point: 0.2,
    duration_days: 5,
    purchase_window_hours: 24,
    trophy_progression: {
      day_1: 200, day_2: 350, day_3: 500, day_4: 650, day_5: 800
    },
    notes: description || null
  };

  try {
    let res;
    if (id) {
      // Editar evento existente: solo name, fechas, metadata
      res = await apiEventsV2BmUpdate(id, {
        name,
        start_date,
        end_date,
        metadata
      });
    } else {
      // Crear evento: el schema exige name + start_date.
      // El status por defecto es SCHEDULED; el OWNER lo abre luego
      // con toggleBmEventStatus (PATCH /status).
      res = await apiEventsV2BmCreate({
        name,
        start_date,
        end_date,
        status: is_active ? 'OPEN' : 'SCHEDULED',
        metadata
      });
    }

    if (res && res.success) {
      showToast(res.message || 'Evento guardado exitosamente', 'success');
      closeBmEventModal();
      await refreshBmPanel();
    } else {
      showToast('❌ ' + (res?.error || 'No se pudo guardar el evento'), 'error');
    }
  } catch (err) {
    console.error('❌ [BM] Error guardando evento:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

/**
 * Activa o desactiva un evento
 */
async function toggleBmEventStatus(id, activate) {
  if (!id) {
    showToast('⚠️ ID de evento requerido', 'warning');
    return;
  }

  const newStatus = activate ? 'OPEN' : 'CLOSED';

  try {
    // F4.2.2-F: usamos el endpoint genérico de cambio de status.
    // `activate = true` → status OPEN (el backend cierra automáticamente
    //                    cualquier otro evento OPEN por el switch funcional).
    // `activate = false` → status CLOSED.
    const res = await apiEventsV2ChangeStatus(id, newStatus);

    if (res && res.success) {
      showToast(res.message || `Evento ${newStatus === 'OPEN' ? 'activado' : 'desactivado'} correctamente`, 'success');
      await refreshBmPanel();
    } else {
      showToast('❌ ' + (res?.error || 'No se pudo cambiar el estado'), 'error');
    }
  } catch (err) {
    console.error('❌ [BM] Error cambiando estado:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

/**
 * Abre modal para nueva misión
 */
function showCreateBmMissionModal() {
  // El nuevo modelo considera al evento "activo" como el que tiene is_open
  // (derivado de status === 'OPEN').
  const active = bmState.adminEvents.find((e) => e.is_open || e.is_active) || bmState.adminEvents[0];
  if (!active) {
    showToast('Debe existir un evento para añadir misiones', 'error');
    return;
  }

  document.getElementById('bmMissionModalTitle').textContent = 'Nueva Misión Black Market';
  document.getElementById('bmMissionFormId').value = '';   // vacío = crear
  document.getElementById('bmMissionFormDay').value = '1';
  document.getElementById('bmMissionFormType').value = 'dedication';
  document.getElementById('bmMissionFormDesc').value = '';
  document.getElementById('bmMissionFormReq').value = '';
  document.getElementById('bmMissionFormTarget').value = '3';
  document.getElementById('bmMissionFormPoints').value = '25';

  document.getElementById('bmMissionModal').style.display = 'block';
}

/**
 * Abre modal para editar misión existente
 */
function showEditBmMissionModal(id) {
  // El ID viene del render como `${day}-${type}` (ID sintético)
  const [dayStr, typeStr] = String(id).split('-');
  const day = Number(dayStr);

  const m = bmState.adminMissions.find(
    (item) => Number(item.day) === day && item.type === typeStr
  );
  if (!m) {
    showToast('❌ Misión no encontrada', 'error');
    return;
  }

  document.getElementById('bmMissionModalTitle').textContent = 'Editar Misión Black Market';
  document.getElementById('bmMissionFormId').value = id;   // preservamos el ID sintético
  document.getElementById('bmMissionFormDay').value = m.day;
  document.getElementById('bmMissionFormType').value = m.type;
  document.getElementById('bmMissionFormDesc').value = m.description;
  document.getElementById('bmMissionFormReq').value = m.requirement || '';
  document.getElementById('bmMissionFormTarget').value = m.target_value;
  document.getElementById('bmMissionFormPoints').value = m.points || 25;

  document.getElementById('bmMissionModal').style.display = 'block';
}

function closeBmMissionModal() {
  document.getElementById('bmMissionModal').style.display = 'none';
}

/**
 * Guarda o actualiza una misión
 */
async function saveBmMission(e) {
  e.preventDefault();

  // Leer valores del formulario
  const editingId = document.getElementById('bmMissionFormId').value;
  const day = parseInt(document.getElementById('bmMissionFormDay').value, 10);
  const type = document.getElementById('bmMissionFormType').value;
  const description = document.getElementById('bmMissionFormDesc').value.trim();
  const requirement = document.getElementById('bmMissionFormReq').value.trim();
  const target_value = parseInt(document.getElementById('bmMissionFormTarget').value, 10);
  const points = parseInt(document.getElementById('bmMissionFormPoints').value, 10) || 25;

  // Validación básica
  if (!description || description.length < 3) {
    showToast('❌ La descripción debe tener al menos 3 caracteres', 'error');
    return;
  }
  if (!Number.isInteger(day) || day < 1 || day > 5) {
    showToast('❌ El día debe estar entre 1 y 5', 'error');
    return;
  }
  if (!['dedication', 'skill', 'teamwork'].includes(type)) {
    showToast('❌ Tipo de misión inválido', 'error');
    return;
  }

  // Leer evento con metadata.missions fresca del backend
  const eventFull = await getActiveBmEventFull();
  if (!eventFull) {
    showToast('⚠️ No hay evento Black Market activo', 'warning');
    return;
  }

  // Copia inmutable del array de misiones
  const missions = Array.isArray(eventFull.missions) ? [...eventFull.missions] : [];

  // ID sintético para identificar la misión: `${day}-${type}`
  const editingKey = editingId ? String(editingId) : null;

  if (editingKey) {
    // ── Editar misión existente: encontrar por (day, type) del ID sintético
    const [origDayStr, origType] = editingKey.split('-');
    const origDay = Number(origDayStr);
    const idx = missions.findIndex(
      (m) => Number(m.day) === origDay && m.type === origType
    );

    if (idx === -1) {
      showToast('❌ Misión no encontrada en el evento', 'error');
      return;
    }

    // Si cambió (day,type), hay que asegurar que no colisione con otra
    const dayChanged = Number(origDay) !== day;
    const typeChanged = origType !== type;
    if (dayChanged || typeChanged) {
      const collision = missions.findIndex(
        (m, i) => i !== idx && Number(m.day) === day && m.type === type
      );
      if (collision !== -1) {
        showToast('❌ Ya existe una misión con ese día y tipo', 'error');
        return;
      }
    }

    missions[idx] = { day, type, description, requirement, target_value, points };
  } else {
    // ── Crear nueva misión: verificar que no exista (day, type)
    const collision = missions.findIndex(
      (m) => Number(m.day) === day && m.type === type
    );
    if (collision !== -1) {
      showToast('❌ Ya existe una misión para ese día y tipo', 'error');
      return;
    }
    missions.push({ day, type, description, requirement, target_value, points });
  }

  // Ordenar por (day, type) para que el array quede estable
  missions.sort((a, b) => (a.day - b.day) || a.type.localeCompare(b.type));

  // Persistir: PUT /api/events-v2/bm/:eventId con metadata.missions actualizado
  try {
    const res = await apiEventsV2BmUpdate(eventFull.id, {
      metadata: { ...(eventFull.metadata || {}), missions }
    });

    if (res && res.success) {
      showToast(editingKey ? 'Misión actualizada exitosamente' : 'Misión creada exitosamente', 'success');
      closeBmMissionModal();
      await refreshBmPanel();
    } else {
      showToast('❌ ' + (res?.error || 'No se pudo guardar la misión'), 'error');
    }
  } catch (err) {
    console.error('❌ [BM] Error guardando misión:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

/**
 * Elimina una misión del evento BM.
 * En el modelo nuevo, las misiones viven en `events_master.metadata.missions`.
 * "Eliminar" = quitar del array y persistir el evento.
 */
async function deleteBmMissionConfirm(id) {
  if (!confirm('¿Deseas eliminar esta misión táctica del evento?')) return;

  // ID sintético `${day}-${type}`
  const [dayStr, typeStr] = String(id).split('-');
  const day = Number(dayStr);

  // Leer evento con misiones frescas del backend
  const eventFull = await getActiveBmEventFull();
  if (!eventFull) {
    showToast('⚠️ No hay evento Black Market activo', 'warning');
    return;
  }

  const missions = Array.isArray(eventFull.missions) ? [...eventFull.missions] : [];
  const idx = missions.findIndex(
    (m) => Number(m.day) === day && m.type === typeStr
  );

  if (idx === -1) {
    showToast('❌ Misión no encontrada', 'error');
    return;
  }

  // Eliminar del array
  missions.splice(idx, 1);

  try {
    const res = await apiEventsV2BmUpdate(eventFull.id, {
      metadata: { ...(eventFull.metadata || {}), missions }
    });

    if (res && res.success) {
      showToast('Misión eliminada exitosamente', 'success');
      await refreshBmPanel();
    } else {
      showToast('❌ ' + (res?.error || 'No se pudo eliminar la misión'), 'error');
    }
  } catch (err) {
    console.error('❌ [BM] Error eliminando misión:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

// ============================================================
// EXPORTACIÓN AL ENTORNO GLOBAL WINDOW
// ============================================================
window.bmState                   = bmState;
window.initBmModule              = initBmModule;
window.updateBmAdminVisibility   = updateBmAdminVisibility;

// Vistas
window.loadBmMissionsView        = loadBmMissionsView;
window.refreshBmMissions         = refreshBmMissions;
window.selectBmMissionDay        = selectBmMissionDay;
window.toggleBmMissionComplete   = toggleBmMissionComplete;

window.loadBmProgressView        = loadBmProgressView;
window.refreshBmProgress         = refreshBmProgress;

window.loadBmDiscountView        = loadBmDiscountView;
window.refreshBmDiscount         = refreshBmDiscount;
window.executeBmPurchase         = executeBmPurchase;

window.loadBmLeaderboardView     = loadBmLeaderboardView;
window.refreshBmLeaderboard      = refreshBmLeaderboard;
window.filterBmLeaderboard       = filterBmLeaderboard;

window.loadBmPanelView           = loadBmPanelView;
window.refreshBmPanel            = refreshBmPanel;
window.filterAdminMissionsByDay  = filterAdminMissionsByDay;

// Modales
window.showCreateBmEventModal    = showCreateBmEventModal;
window.showEditBmEventModal      = showEditBmEventModal;
window.closeBmEventModal         = closeBmEventModal;
window.saveBmEvent               = saveBmEvent;
window.toggleBmEventStatus       = toggleBmEventStatus;

window.showCreateBmMissionModal  = showCreateBmMissionModal;
window.showEditBmMissionModal    = showEditBmMissionModal;
window.closeBmMissionModal       = closeBmMissionModal;
window.saveBmMission             = saveBmMission;
window.deleteBmMissionConfirm    = deleteBmMissionConfirm;
