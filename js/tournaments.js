/**
 * PARAGUAY-FFAA | METALSTORM - Sistema de Torneos Internos (RFC-002 / ADR-011)
 * ═══════════════════════════════════════════════════════════════════════════
 * F1.5a — Vista principal: Listado + Bracket + Roster + Resultado + Moderador.
 *
 * Fuera de alcance F1.5a (se hace en F1.5b):
 *   - Modal de draft (requiere GET endpoint no existente aún).
 *
 * Fuente de verdad:
 *   - docs/rfc/RFC-002-sistema-torneos.md
 *   - docs/adr/ADR-011-sistema-torneos.md
 *   - docs/normativa/ANEXO-III-torneos.md
 *   - docs/planning/PLAN_TRABAJO_TORNEOS.md §F1.5
 *
 * Patrón: consume apiTournaments* de js/api.js (NO fetch directo).
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════════════════
const tournamentsState = {
  list: [],
  filteredList: [],
  currentTournamentId: null,
  currentDetail: null,
  usersCache: [],
  usersCacheLoaded: false,
  filters: { search: '', status: '', scope: '' },
  currentTab: 'bracket',
  currentMatchForResult: null,
  rosterRows: []
};

// ═══════════════════════════════════════════════════════════════════════════
// RBAC HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function canManageTournaments() {
  const role = (window.currentUser?.role || '').toUpperCase();
  return role === 'ADMIN' || role === 'OWNER';
}

function canModerateTournament(tournament) {
  if (!tournament) return false;
  if (canManageTournaments()) return true;
  const me = window.currentUser?.id;
  return Boolean(me && String(tournament.moderator_id) === String(me));
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRYPOINT
// ═══════════════════════════════════════════════════════════════════════════
async function loadTournamentsView() {
  if (!window.currentUser) {
    console.warn('[Tournaments] No hay usuario autenticado');
    return;
  }

  // Mostrar botón "Nuevo Torneo" solo a ADMIN/OWNER
  const createBtn = document.getElementById('tournamentsCreateBtn');
  if (createBtn) createBtn.style.display = canManageTournaments() ? 'inline-flex' : 'none';

  // Subtítulo según rol
  const subtitle = document.getElementById('tournamentsSubtitle');
  if (subtitle) {
    subtitle.textContent = canManageTournaments()
      ? 'Gestión de torneos internos · Vista de mando (ADMIN/OWNER)'
      : 'Torneos internos del escuadrón · Swiss + Single Elimination';
  }

  // Limpiar detalle abierto
  closeTournamentDetail();

  // Cargar listado
  await loadTournamentsList();

  // Cargar usersCache si ADMIN/OWNER
  if (canManageTournaments()) {
    await loadUsersCache();
  }

  if (typeof refreshLucideIcons === 'function') {
    setTimeout(refreshLucideIcons, 50);
  }
}
window.loadTournamentsView = loadTournamentsView;

// ═══════════════════════════════════════════════════════════════════════════
// USERS CACHE (ADMIN/OWNER)
// ═══════════════════════════════════════════════════════════════════════════
async function loadUsersCache() {
  if (tournamentsState.usersCacheLoaded) return tournamentsState.usersCache;

  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      console.warn('[Tournaments] No se pudo cargar usersCache (HTTP ' + res.status + ')');
      tournamentsState.usersCache = [];
      return [];
    }
    const json = await res.json().catch(() => ({}));
    const users = json.users || json.members || json.data || (Array.isArray(json) ? json : []);
    tournamentsState.usersCache = Array.isArray(users) ? users : [];
    tournamentsState.usersCacheLoaded = true;
    return tournamentsState.usersCache;
  } catch (err) {
    console.warn('[Tournaments] Error cargando usersCache:', err);
    tournamentsState.usersCache = [];
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Resuelve el nick de un usuario desde usersCache.
 * Si no hay cache o no se encuentra, retorna UUID truncado con tooltip.
 */
function resolveNickByUserId(uuid) {
  if (!uuid) return '—';
  const user = tournamentsState.usersCache.find(u =>
    String(u.id) === String(uuid) || String(u.user_id) === String(uuid)
  );
  if (user?.nick) return escapeHTML(user.nick);
  const shortUuid = String(uuid).substring(0, 8);
  return `<span title="UUID: ${escapeHTML(uuid)}" style="font-family:var(--font-mono);color:#64748b;font-size:0.85em;">#${shortUuid}</span>`;
}

/**
 * Formatea el estado de un torneo a label.
 */
function formatTournamentStatus(status) {
  const map = {
    'DRAFT':        { label: 'Borrador',      class: 'status-negro',   icon: '✏️' },
    'REGISTRATION': { label: 'Inscripción',   class: 'status-verde',   icon: '📝' },
    'ONGOING':      { label: 'En Curso',      class: 'status-naranja', icon: '🔥' },
    'FINISHED':     { label: 'Finalizado',    class: 'status-verde',   icon: '🏆' },
    'CANCELLED':    { label: 'Cancelado',     class: 'status-rojo',    icon: '❌' }
  };
  return map[status] || { label: status || '—', class: 'status-negro', icon: '❓' };
}

/**
 * Formatea la fase de un match.
 */
function formatMatchPhase(phase) {
  const map = {
    'SWISS': 'Suizo',
    'QF':    'Cuartos',
    'SF':    'Semifinal',
    'FINAL': 'Final'
  };
  return map[phase] || phase || '—';
}

/**
 * Formatea fecha ISO a locale PY.
 */
function formatDateTournament(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-PY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Asuncion'
    });
  } catch (e) {
    return isoString;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LISTADO
// ═══════════════════════════════════════════════════════════════════════════
async function loadTournamentsList() {
  const container = document.getElementById('tournamentsList');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:2rem;color:#94a3b8;grid-column:1/-1;">
      <p>⏳ Cargando torneos…</p>
    </div>
  `;

  try {
    const res = await apiTournamentsList({});
    if (!res.success) {
      container.innerHTML = `
        <div class="card tactical-corners" style="grid-column:1/-1;text-align:center;padding:2rem;color:#f87171;border-color:rgba(239,68,68,0.3);">
          <p style="margin:0 0 8px 0;">⚠️ ${escapeHTML(res.error || 'Error cargando torneos')}</p>
          <button onclick="loadTournamentsList()" class="btn-secondary btn-sm">🔄 Reintentar</button>
        </div>
      `;
      return;
    }

    tournamentsState.list = res.tournaments || [];
    tournamentsState.filteredList = [...tournamentsState.list];
    renderTournamentsList();

    if (typeof refreshLucideIcons === 'function') {
      setTimeout(refreshLucideIcons, 50);
    }
  } catch (err) {
    console.error('[Tournaments] Error:', err);
    container.innerHTML = `
      <div class="card tactical-corners" style="grid-column:1/-1;text-align:center;padding:2rem;color:#f87171;">
        <p>❌ Error de conexión</p>
      </div>
    `;
  }
}
window.loadTournamentsList = loadTournamentsList;

function renderTournamentsList() {
  const container = document.getElementById('tournamentsList');
  if (!container) return;

  const list = tournamentsState.filteredList;

  if (list.length === 0) {
    const hasFilters = tournamentsState.filters.search ||
                       tournamentsState.filters.status ||
                       tournamentsState.filters.scope;
    container.innerHTML = `
      <div class="card tactical-corners" style="grid-column:1/-1;text-align:center;padding:3rem 1.5rem;color:#94a3b8;">
        <div style="font-size:2.5rem;margin-bottom:12px;">🏆</div>
        <h3 style="color:#e2e8f0;font-family:var(--font-tactical);margin:0 0 8px 0;">
          ${hasFilters ? 'Sin resultados' : 'Sin torneos registrados'}
        </h3>
        <p style="max-width:400px;margin:0 auto 12px auto;font-size:0.9rem;line-height:1.5;">
          ${hasFilters
            ? 'Ajustá los filtros para encontrar torneos.'
            : 'Aún no hay torneos internos. Los ADMIN/OWNER pueden crear el primer torneo.'}
        </p>
        ${hasFilters
          ? '<button onclick="resetTournamentsFilters()" class="btn-secondary btn-sm">🔄 Limpiar filtros</button>'
          : (canManageTournaments()
              ? '<button onclick="openCreateTournamentModal()" class="btn-primary btn-sm">➕ Crear primer torneo</button>'
              : '')}
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(t => {
    const status = formatTournamentStatus(t.status);
    const participantCount = t.participant_count ?? t.participants_count ?? null;
    const teamInfo = participantCount !== null
      ? `${participantCount}/${t.max_teams} equipos`
      : `Máx ${t.max_teams} equipos`;
    const moderator = t.moderator_id ? resolveNickByUserId(t.moderator_id) : '—';

    return `
      <div class="tournament-card status-${escapeHTML(t.status || 'DRAFT')}"
           onclick="openTournamentDetail('${escapeHTML(t.id)}')">
        <div class="tournament-card-header">
          <h4 class="tournament-card-name">${escapeHTML(t.name || 'Sin nombre')}</h4>
          <span class="status-badge ${status.class}" style="font-size:0.7rem;padding:2px 8px;">
            ${status.icon} ${escapeHTML(status.label)}
          </span>
        </div>
        <div class="tournament-card-meta">
          <span>🏆 ${escapeHTML(t.format || '—')}</span>
          <span>📊 ${escapeHTML(t.scope || '—')}</span>
          <span>👥 ${escapeHTML(teamInfo)}</span>
        </div>
        <div class="tournament-card-meta" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05);">
          <span style="flex:1;">🎖️ Moderador: ${moderator}</span>
        </div>
        <div class="tournament-card-meta" style="margin-top:4px;">
          <span>📅 ${escapeHTML(formatDateTournament(t.starts_at))}</span>
        </div>
      </div>
    `;
  }).join('');
}
window.renderTournamentsList = renderTournamentsList;

function filterTournaments() {
  const search = (document.getElementById('tournamentsSearch')?.value || '').toLowerCase().trim();
  const status = (document.getElementById('tournamentsStatusFilter')?.value || '').trim();
  const scope  = (document.getElementById('tournamentsScopeFilter')?.value  || '').trim();

  tournamentsState.filters = { search, status, scope };

  tournamentsState.filteredList = tournamentsState.list.filter(t => {
    if (search) {
      const name = (t.name || '').toLowerCase();
      if (!name.includes(search)) return false;
    }
    if (status && String(t.status).toUpperCase() !== status.toUpperCase()) return false;
    if (scope  && String(t.scope).toUpperCase()  !== scope.toUpperCase())  return false;
    return true;
  });

  renderTournamentsList();
}
window.filterTournaments = filterTournaments;

function resetTournamentsFilters() {
  const s = document.getElementById('tournamentsSearch');          if (s) s.value = '';
  const st = document.getElementById('tournamentsStatusFilter');    if (st) st.value = '';
  const sc = document.getElementById('tournamentsScopeFilter');     if (sc) sc.value = '';
  tournamentsState.filters = { search: '', status: '', scope: '' };
  tournamentsState.filteredList = [...tournamentsState.list];
  renderTournamentsList();
}
window.resetTournamentsFilters = resetTournamentsFilters;

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE
// ═══════════════════════════════════════════════════════════════════════════
async function openTournamentDetail(tournamentId) {
  if (!tournamentId) return;

  const panel = document.getElementById('tournamentDetailPanel');
  const tabsContent = document.getElementById('tournamentTabContent');
  if (!panel || !tabsContent) return;

  panel.style.display = 'block';
  tabsContent.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:2rem;">⏳ Cargando detalle…</p>';

  tournamentsState.currentTournamentId = tournamentId;
  tournamentsState.currentTab = 'bracket';
  switchTournamentTab('bracket');

  try {
    const res = await apiTournamentsGetById(tournamentId);
    if (!res.success) {
      tabsContent.innerHTML = `<p style="color:#f87171;text-align:center;padding:2rem;">⚠️ ${escapeHTML(res.error || 'Error cargando detalle')}</p>`;
      return;
    }

    tournamentsState.currentDetail = res;

    // Actualizar header del detalle
    renderTournamentDetailHeader(res.tournament || {}, res.participants || []);

    // Render del tab actual
    renderTournamentTabContent();

    // Scroll al panel
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (typeof refreshLucideIcons === 'function') {
      setTimeout(refreshLucideIcons, 50);
    }
  } catch (err) {
    console.error('[Tournaments] Error detalle:', err);
    tabsContent.innerHTML = '<p style="color:#f87171;text-align:center;padding:2rem;">❌ Error de conexión</p>';
  }
}
window.openTournamentDetail = openTournamentDetail;

function renderTournamentDetailHeader(tournament, participants) {
  const badgesEl = document.getElementById('tournamentDetailBadges');
  const nameEl = document.getElementById('tournamentDetailName');
  const metaEl = document.getElementById('tournamentDetailMeta');
  const adminEl = document.getElementById('tournamentAdminActions');
  const registerBtn = document.getElementById('tournamentRegisterTeamBtn');
  const statusBtn = document.getElementById('tournamentChangeStatusBtn');
  const moderatorBtn = document.getElementById('tournamentChangeModeratorBtn');

  if (badgesEl) {
    const status = formatTournamentStatus(tournament.status);
    const teamCount = Array.isArray(participants) ? participants.length : 0;
    badgesEl.innerHTML = `
      <span class="status-badge ${status.class}" style="font-size:0.72rem;">${status.icon} ${escapeHTML(status.label)}</span>
      <span class="badge-tag">${escapeHTML(tournament.format || '—')}</span>
      <span class="badge-tag">${escapeHTML(tournament.scope || '—')}</span>
      <span class="badge-tag">👥 ${teamCount}/${tournament.max_teams || '?'}</span>
    `;
  }

  if (nameEl) nameEl.textContent = tournament.name || '—';

  if (metaEl) {
    const moderatorLabel = tournament.moderator_id
      ? resolveNickByUserId(tournament.moderator_id)
      : '<span style="color:#64748b;font-style:italic;">Sin asignar</span>';
    metaEl.innerHTML = `
      <div>📅 Inicio: ${escapeHTML(formatDateTournament(tournament.starts_at))}</div>
      <div>📅 Cierre: ${escapeHTML(formatDateTournament(tournament.ends_at))}</div>
      <div>🎖️ Moderador: ${moderatorLabel}</div>
      <div>⚙️ Bo3 en Swiss/QF · Bo5 en SF/Final</div>
    `;
  }

  // RBAC: mostrar acciones administrativas
  const isAdmin = canManageTournaments();
  const isModerator = canModerateTournament(tournament);

  if (adminEl) adminEl.style.display = (isAdmin || isModerator) ? 'flex' : 'none';
  if (statusBtn) statusBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  if (moderatorBtn) moderatorBtn.style.display = isAdmin ? 'inline-flex' : 'none';

  // Botón registrar equipo:
  // - ADMIN/OWNER: siempre visible si el torneo está en REGISTRATION.
  // - MIEMBRO/VETERANO: visible si el torneo está en REGISTRATION (el backend valida captain).
  if (registerBtn) {
    const canRegister = isAdmin || (tournament.status === 'REGISTRATION');
    registerBtn.style.display = canRegister ? 'inline-flex' : 'none';
  }
}

function switchTournamentTab(tab) {
  tournamentsState.currentTab = tab;

  document.querySelectorAll('#tournamentDetailPanel .tournament-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  renderTournamentTabContent();
}
window.switchTournamentTab = switchTournamentTab;

function renderTournamentTabContent() {
  const content = document.getElementById('tournamentTabContent');
  if (!content) return;

  const detail = tournamentsState.currentDetail;
  if (!detail) return;

  const tab = tournamentsState.currentTab;

  if (tab === 'bracket') {
    renderBracket(content, detail.matches || []);
  } else if (tab === 'roster') {
    renderRoster(content, detail.participants || []);
  } else if (tab === 'moderator') {
    renderModeratorHistory(content, detail.moderator_history || []);
  }
}

function closeTournamentDetail() {
  const panel = document.getElementById('tournamentDetailPanel');
  if (panel) panel.style.display = 'none';
  tournamentsState.currentTournamentId = null;
  tournamentsState.currentDetail = null;
}
window.closeTournamentDetail = closeTournamentDetail;

// ═══════════════════════════════════════════════════════════════════════════
// BRACKET
// ═══════════════════════════════════════════════════════════════════════════
function renderBracket(container, matches) {
  if (!matches || matches.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:#94a3b8;">
        <div style="font-size:2rem;margin-bottom:8px;">🔀</div>
        <p style="margin:0 0 4px 0;">No hay matches generados aún.</p>
        <p style="font-size:0.8rem;margin:0;color:#64748b;">
          Los matches se crean automáticamente al abrir el torneo o vía SQL.
        </p>
      </div>
    `;
    return;
  }

  // Agrupar por phase
  const bySwiss = matches.filter(m => m.phase === 'SWISS');
  const byQF = matches.filter(m => m.phase === 'QF');
  const bySF = matches.filter(m => m.phase === 'SF');
  const byFinal = matches.filter(m => m.phase === 'FINAL');

  const columns = [];

  // Swiss: agrupar por round
  if (bySwiss.length > 0) {
    const rounds = {};
    bySwiss.forEach(m => {
      const r = m.round || 1;
      if (!rounds[r]) rounds[r] = [];
      rounds[r].push(m);
    });
    Object.keys(rounds).sort((a, b) => Number(a) - Number(b)).forEach(r => {
      columns.push({ title: `Suizo · Ronda ${r}`, matches: rounds[r] });
    });
  }

  // QF, SF, FINAL
  if (byQF.length > 0)    columns.push({ title: 'Cuartos de Final', matches: byQF });
  if (bySF.length > 0)    columns.push({ title: 'Semifinales', matches: bySF });
  if (byFinal.length > 0) columns.push({ title: '🏆 Final', matches: byFinal });

  container.innerHTML = `
    <div class="bracket-container">
      ${columns.map(col => `
        <div class="bracket-column">
          <div class="bracket-column-title">${escapeHTML(col.title)}</div>
          ${col.matches.map(m => renderBracketMatch(m)).join('')}
        </div>
      `).join('')}
    </div>
  `;

  if (typeof refreshLucideIcons === 'function') {
    setTimeout(refreshLucideIcons, 30);
  }
}

function renderBracketMatch(match) {
  const teamAName = resolveNickByUserId(match.team_a_id) || 'Equipo A';
  const teamBName = resolveNickByUserId(match.team_b_id) || 'Equipo B';
  const scoreA = match.score_a ?? 0;
  const scoreB = match.score_b ?? 0;
  const isFinished = match.status === 'FINISHED';
  const bestOf = match.best_of || 3;

  // Determinar ganador
  let winnerA = false, winnerB = false;
  if (isFinished) {
    if (match.winner_id === match.team_a_id) winnerA = true;
    else if (match.winner_id === match.team_b_id) winnerB = true;
    else if (scoreA > scoreB) winnerA = true;
    else if (scoreB > scoreA) winnerB = true;
  }

  const canEdit = canModerateTournament(tournamentsState.currentDetail?.tournament);

  return `
    <div class="bracket-match status-${escapeHTML(match.status || 'PENDING')}">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.7rem;color:#64748b;margin-bottom:6px;">
        <span>Bo${bestOf}</span>
        <span>${escapeHTML(match.status || 'PENDING')}</span>
      </div>
      <div class="bracket-team ${winnerA ? 'winner' : (isFinished ? 'loser' : '')}">
        <span class="bracket-team-name">${teamAName}</span>
        <span class="bracket-team-score">${scoreA}</span>
      </div>
      <div class="bracket-team ${winnerB ? 'winner' : (isFinished ? 'loser' : '')}">
        <span class="bracket-team-name">${teamBName}</span>
        <span class="bracket-team-score">${scoreB}</span>
      </div>
      ${canEdit && !isFinished ? `
        <div class="bracket-match-actions">
          <button onclick="event.stopPropagation(); openMatchResultModal('${escapeHTML(match.id)}')"
                  class="btn-primary btn-sm" style="font-size:0.72rem;padding:4px 10px;width:100%;">
            🎯 Registrar Resultado
          </button>
            <button onclick="event.stopPropagation(); openDraftModal('${escapeHTML(match.id)}')"
                    class="btn-secondary btn-sm" style="font-size:0.72rem;padding:4px 10px;width:100%;margin-top:4px;">
              🎯 Draft
            </button>
        </div>
      ` : ''}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
// ROSTER
// ═══════════════════════════════════════════════════════════════════════════
function renderRoster(container, participants) {
  if (!participants || participants.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:#94a3b8;">
        <div style="font-size:2rem;margin-bottom:8px;">👥</div>
        <p style="margin:0;">No hay equipos registrados aún.</p>
      </div>
    `;
    return;
  }

  const html = participants.map(p => {
    const captainLabel = resolveNickByUserId(p.captain_user_id);
    const roster = Array.isArray(p.roster) ? p.roster : [];

    return `
      <div class="card tactical-corners" style="background:rgba(15,23,42,0.5);border-left:3px solid #38bdf8;margin-bottom:0.75rem;padding:1rem 1.25rem;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
          <div>
            <h4 style="margin:0 0 4px 0;font-family:var(--font-tactical);color:#f8fafc;font-size:1.1rem;">
              👥 ${escapeHTML(p.team_name || 'Equipo sin nombre')}
            </h4>
            <div style="font-size:0.8rem;color:#94a3b8;">
              🎖️ Capitán: <strong style="color:#cbd5e1;">${captainLabel}</strong>
            </div>
          </div>
          <span class="status-badge status-${(p.status || 'CONFIRMED').toLowerCase() === 'confirmed' ? 'verde' : 'naranja'}" style="font-size:0.7rem;">
            ${escapeHTML(p.status || 'CONFIRMED')}
          </span>
        </div>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:0.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;font-weight:600;">
            Roster (${roster.length})
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${roster.length === 0
              ? '<span style="color:#64748b;font-style:italic;font-size:0.85rem;">Sin roster detallado</span>'
              : roster.map(r => `
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.85rem;padding:4px 0;">
                    <span style="color:#cbd5e1;">${resolveNickByUserId(r.user_id)}</span>
                    <span style="color:#94a3b8;font-size:0.8rem;">
                      ${escapeHTML(r.role || 'Sin rol')}
                      ${r.is_sub ? ' <span class="status-badge status-naranja" style="font-size:0.65rem;padding:1px 6px;">SUPLENTE</span>' : ''}
                    </span>
                  </div>
                `).join('')
            }
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODERADOR HISTORY
// ═══════════════════════════════════════════════════════════════════════════
function renderModeratorHistory(container, history) {
  if (!history || history.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;color:#94a3b8;">
        <div style="font-size:2rem;margin-bottom:8px;">🎖️</div>
        <p style="margin:0;">Sin historial de cambios de moderador.</p>
      </div>
    `;
    return;
  }

  const html = history.map(h => {
    const prev = h.previous_user ? resolveNickByUserId(h.previous_user) : '<em style="color:#64748b;">—</em>';
    const next = h.new_user ? resolveNickByUserId(h.new_user) : '<em style="color:#64748b;">—</em>';
    const actor = h.changed_by ? resolveNickByUserId(h.changed_by) : '—';

    return `
      <div style="background:rgba(15,23,42,0.5);border-left:3px solid #d4af37;border-radius:6px;padding:10px 14px;margin-bottom:8px;">
        <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:6px;">
          📅 ${escapeHTML(formatDateTournament(h.changed_at))}
          · Por ${actor}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:0.9rem;">
          <span style="color:#94a3b8;text-decoration:line-through;">${prev}</span>
          <span style="color:#d4af37;">→</span>
          <span style="color:#f8fafc;font-weight:600;">${next}</span>
        </div>
        ${h.reason ? `<div style="font-size:0.82rem;color:#cbd5e1;margin-top:6px;font-style:italic;">💬 ${escapeHTML(h.reason)}</div>` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL 1: CREAR TORNEO (ADMIN/OWNER)
// ═══════════════════════════════════════════════════════════════════════════
async function openCreateTournamentModal() {
  if (!canManageTournaments()) {
    showToast('⚠️ Solo ADMIN/OWNER pueden crear torneos', 'warning');
    return;
  }

  // Limpiar campos
  const fields = ['tCreateName', 'tCreateStartsAt', 'tCreateEndsAt', 'tCreateNotes'];
  fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  const minEl = document.getElementById('tCreateMinTeams'); if (minEl) minEl.value = '4';
  const maxEl = document.getElementById('tCreateMaxTeams'); if (maxEl) maxEl.value = '8';
  const formatEl = document.getElementById('tCreateFormat'); if (formatEl) formatEl.value = 'SWISS+SE';
  const scopeEl = document.getElementById('tCreateScope'); if (scopeEl) scopeEl.value = 'F1';

  // Pre-llenar fechas: hoy + 7 días, hoy + 9 días
  const now = new Date();
  const starts = new Date(now.getTime() + 7 * 86400000);
  const ends = new Date(now.getTime() + 9 * 86400000);
  const toLocalInput = d => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const startsEl = document.getElementById('tCreateStartsAt'); if (startsEl) startsEl.value = toLocalInput(starts);
  const endsEl = document.getElementById('tCreateEndsAt'); if (endsEl) endsEl.value = toLocalInput(ends);

  // Poblar dropdown de moderador (usuarios ADMIN/VETERANO activos)
  await loadUsersCache();
  const modSel = document.getElementById('tCreateModerator');
  if (modSel) {
    modSel.innerHTML = '<option value="">— Sin moderador (se asigna después) —</option>';
    tournamentsState.usersCache.forEach(u => {
      const role = (u.role || '').toUpperCase();
      const status = (u.status || 'ACTIVE').toUpperCase();
      if (status !== 'ACTIVE') return;
      if (!['ADMIN', 'VETERANO', 'OWNER'].includes(role)) return;
      const opt = document.createElement('option');
      opt.value = u.id || u.user_id;
      opt.textContent = `${u.nick || u.email || 'Sin nick'} (${role})`;
      modSel.appendChild(opt);
    });
  }

  showModal('tournamentCreateModal');
  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 50);
}
window.openCreateTournamentModal = openCreateTournamentModal;

async function submitCreateTournament() {
  const btn = document.getElementById('tCreateSubmit');
  const name = document.getElementById('tCreateName')?.value?.trim();
  const format = document.getElementById('tCreateFormat')?.value;
  const scope = document.getElementById('tCreateScope')?.value;
  const startsAt = document.getElementById('tCreateStartsAt')?.value;
  const endsAt = document.getElementById('tCreateEndsAt')?.value;
  const minTeams = parseInt(document.getElementById('tCreateMinTeams')?.value || '4', 10);
  const maxTeams = parseInt(document.getElementById('tCreateMaxTeams')?.value || '8', 10);
  const moderatorId = document.getElementById('tCreateModerator')?.value || null;
  const notes = document.getElementById('tCreateNotes')?.value?.trim() || '';

  // Validaciones locales
  if (!name || name.length < 3) {
    showToast('⚠️ El nombre debe tener al menos 3 caracteres', 'warning');
    return;
  }
  if (name.length > 120) {
    showToast('⚠️ El nombre no puede exceder 120 caracteres', 'warning');
    return;
  }
  if (!startsAt || !endsAt) {
    showToast('⚠️ Completá las fechas de inicio y cierre', 'warning');
    return;
  }
  if (new Date(endsAt) <= new Date(startsAt)) {
    showToast('⚠️ La fecha de cierre debe ser posterior al inicio', 'warning');
    return;
  }
  if (minTeams < 2 || maxTeams < minTeams || maxTeams > 32) {
    showToast('⚠️ Rango de equipos inválido (min 2, max 32, max >= min)', 'warning');
    return;
  }
  if (scope === 'F1' && (minTeams < 4 || maxTeams > 8)) {
    showToast('⚠️ F1 requiere entre 4 y 8 equipos (Anexo III Art. 8)', 'warning');
    return;
  }

  const payload = {
    name,
    format,
    scope,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: new Date(endsAt).toISOString(),
    min_teams: minTeams,
    max_teams: maxTeams,
    metadata: notes ? { notes } : {}
  };
  if (moderatorId) payload.moderator_id = moderatorId;

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Creando…'; }

  try {
    const res = await apiTournamentsCreate(payload);
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Error al crear torneo'), 'error');
      return;
    }
    showToast('✅ Torneo creado exitosamente', 'success');
    closeModal('tournamentCreateModal');
    await loadTournamentsList();
  } catch (err) {
    console.error('[Tournaments] submitCreateTournament:', err);
    showToast('❌ Error de conexión', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Crear Torneo'; }
  }
}
window.submitCreateTournament = submitCreateTournament;

// ═══════════════════════════════════════════════════════════════════════════
// MODAL 2: REGISTRAR EQUIPO
// ═══════════════════════════════════════════════════════════════════════════
async function openRegisterTeamModal() {
  const detail = tournamentsState.currentDetail;
  if (!detail?.tournament) {
    showToast('⚠️ No hay torneo seleccionado', 'warning');
    return;
  }

  const tournament = detail.tournament;

  if (tournament.status !== 'REGISTRATION') {
    showToast('⚠️ El torneo no está en REGISTRATION', 'warning');
    return;
  }

  // Limpiar
  const nameEl = document.getElementById('tRegTeamName'); if (nameEl) nameEl.value = '';
  tournamentsState.rosterRows = [];
  renderRosterRows();

  // Poblar capitán
  const capSel = document.getElementById('tRegCaptain');
  if (capSel) {
    capSel.innerHTML = '';
    const isAdmin = canManageTournaments();

    if (isAdmin) {
      await loadUsersCache();
      capSel.innerHTML = '<option value="">— Seleccionar capitán —</option>';
      tournamentsState.usersCache.forEach(u => {
        const status = (u.status || 'ACTIVE').toUpperCase();
        if (status !== 'ACTIVE') return;
        const opt = document.createElement('option');
        opt.value = u.id || u.user_id;
        opt.textContent = `${u.nick || u.email || 'Sin nick'} (${u.role || 'MIEMBRO'})`;
        capSel.appendChild(opt);
      });
    } else {
      // MIEMBRO/VETERANO: capitán es él mismo
      const me = window.currentUser;
      const opt = document.createElement('option');
      opt.value = me.id;
      opt.textContent = `${me.nick || me.email} (Tú)`;
      opt.selected = true;
      capSel.appendChild(opt);
      capSel.disabled = true;
    }
  }

  // Agregar 5 filas iniciales (5 titulares)
  for (let i = 0; i < 5; i++) {
    addRosterRow({ is_sub: false });
  }

  showModal('tournamentRegisterTeamModal');
  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 50);
}
window.openRegisterTeamModal = openRegisterTeamModal;

function addRosterRow(prefill = {}) {
  const MAX_ROSTER = 6;

  if (tournamentsState.rosterRows.length >= MAX_ROSTER) {
    showToast('⚠️ Máximo 6 miembros por equipo (5 titulares + 1 suplente)', 'warning');
    return;
  }

  // El último slot solo puede ser suplente
  const isLastSlot = tournamentsState.rosterRows.length === MAX_ROSTER - 1;

  tournamentsState.rosterRows.push({
    user_id: prefill.user_id || '',
    role: prefill.role || '',
    is_sub: prefill.is_sub ?? isLastSlot
  });

  renderRosterRows();
}
window.addRosterRow = addRosterRow;

function removeRosterRow(idx) {
  tournamentsState.rosterRows.splice(idx, 1);
  renderRosterRows();
}
window.removeRosterRow = removeRosterRow;

function onRosterRowChange(idx, field, value) {
  if (!tournamentsState.rosterRows[idx]) return;
  tournamentsState.rosterRows[idx][field] = value;
}
window.onRosterRowChange = onRosterRowChange;

function renderRosterRows() {
  const container = document.getElementById('tRegRosterContainer');
  if (!container) return;

  const rows = tournamentsState.rosterRows;
  const roleOptions = ['Interceptor', 'Ligero', 'Mediano', 'Pesado', 'Ataque', 'Support'];

  container.innerHTML = rows.map((r, idx) => `
    <div style="display:grid;grid-template-columns:1fr 1fr auto auto;gap:6px;align-items:center;">
      <input type="text" placeholder="Nick o UUID" value="${escapeHTML(r.user_id || '')}"
             oninput="onRosterRowChange(${idx}, 'user_id', this.value)"
             style="padding:6px 8px;background:#0f172a;border:1px solid #334155;border-radius:4px;color:#f8fafc;font-size:0.82rem;" />
      <select onchange="onRosterRowChange(${idx}, 'role', this.value)"
              style="padding:6px 8px;background:#0f172a;border:1px solid #334155;border-radius:4px;color:#f8fafc;font-size:0.82rem;">
        <option value="">Rol…</option>
        ${roleOptions.map(ro => `<option value="${ro}" ${r.role === ro ? 'selected' : ''}>${ro}</option>`).join('')}
      </select>
      <label style="display:flex;align-items:center;gap:4px;font-size:0.75rem;color:#94a3b8;white-space:nowrap;cursor:pointer;">
        <input type="checkbox" ${r.is_sub ? 'checked' : ''}
               onchange="onRosterRowChange(${idx}, 'is_sub', this.checked)" />
        Sub
      </label>
      <button type="button" onclick="removeRosterRow(${idx})" class="btn-danger btn-sm"
              style="padding:4px 8px;font-size:0.75rem;" title="Eliminar fila">✕</button>
    </div>
  `).join('');
}
window.renderRosterRows = renderRosterRows;

async function submitRegisterTeam() {
  const btn = document.getElementById('tRegSubmit');
  const teamName = document.getElementById('tRegTeamName')?.value?.trim();
  const captainId = document.getElementById('tRegCaptain')?.value;
  const tournamentId = tournamentsState.currentTournamentId;

  if (!tournamentId) {
    showToast('⚠️ No hay torneo seleccionado', 'warning');
    return;
  }
  if (!teamName || teamName.length < 2) {
    showToast('⚠️ El nombre del equipo debe tener al menos 2 caracteres', 'warning');
    return;
  }
  if (teamName.length > 40) {
    showToast('⚠️ El nombre del equipo no puede exceder 40 caracteres', 'warning');
    return;
  }
  if (!captainId) {
    showToast('⚠️ Seleccioná un capitán', 'warning');
    return;
  }

  // Validar roster
  const roster = tournamentsState.rosterRows.filter(r => r.user_id && String(r.user_id).trim());
  if (roster.length < 5) {
    showToast('⚠️ El equipo requiere al menos 5 titulares', 'warning');
    return;
  }

  const titulares = roster.filter(r => !r.is_sub).length;
  if (titulares !== 5) {
    showToast('⚠️ Debe haber exactamente 5 titulares', 'warning');
    return;
  }

  const payload = {
    team_name: teamName,
    captain_user_id: captainId,
    roster: roster.map(r => ({
      user_id: r.user_id.trim(),
      role: r.role || null,
      is_sub: Boolean(r.is_sub)
    }))
  };

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Registrando…'; }

  try {
    const res = await apiTournamentsRegisterTeam(tournamentId, payload);
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Error al registrar equipo'), 'error');
      return;
    }
    showToast('✅ Equipo registrado exitosamente', 'success');
    closeModal('tournamentRegisterTeamModal');
    // Reabrir detalle para reflejar cambios
    await openTournamentDetail(tournamentId);
  } catch (err) {
    console.error('[Tournaments] submitRegisterTeam:', err);
    showToast('❌ Error de conexión', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Registrar Equipo'; }
  }
}
window.submitRegisterTeam = submitRegisterTeam;

// ═══════════════════════════════════════════════════════════════════════════
// MODAL 3: RESULTADO DE MATCH
// ═══════════════════════════════════════════════════════════════════════════
function openMatchResultModal(matchId) {
  const detail = tournamentsState.currentDetail;
  if (!detail?.matches) return;

  const match = detail.matches.find(m => String(m.id) === String(matchId));
  if (!match) {
    showToast('⚠️ Match no encontrado', 'warning');
    return;
  }

  tournamentsState.currentMatchForResult = match;

  const teamAName = resolveNickByUserId(match.team_a_id);
  const teamBName = resolveNickByUserId(match.team_b_id);

  const info = document.getElementById('tResultMatchInfo');
  if (info) {
    info.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <div>
          <div style="font-size:0.75rem;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Fase</div>
          <div style="font-size:0.9rem;color:#cbd5e1;">${escapeHTML(formatMatchPhase(match.phase))} · Ronda ${match.round || 1}</div>
        </div>
        <div style="font-size:0.85rem;color:#f59e0b;">Bo${match.best_of || 3}</div>
      </div>
      <div style="margin-top:8px;font-size:0.85rem;color:#cbd5e1;text-align:center;">
        <strong>${teamAName}</strong> vs <strong>${teamBName}</strong>
      </div>
    `;
  }

  const scoreA = document.getElementById('tResultScoreA'); if (scoreA) scoreA.value = '0';
  const scoreB = document.getElementById('tResultScoreB'); if (scoreB) scoreB.value = '0';
  const notesEl = document.getElementById('tResultNotes'); if (notesEl) notesEl.value = '';

  showModal('tournamentMatchResultModal');
  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 50);
}
window.openMatchResultModal = openMatchResultModal;

async function submitMatchResult() {
  const btn = document.getElementById('tResultSubmit');
  const match = tournamentsState.currentMatchForResult;
  const tournamentId = tournamentsState.currentTournamentId;

  if (!match || !tournamentId) {
    showToast('⚠️ Datos insuficientes', 'warning');
    return;
  }

  const scoreA = parseInt(document.getElementById('tResultScoreA')?.value || '0', 10);
  const scoreB = parseInt(document.getElementById('tResultScoreB')?.value || '0', 10);
  const notes = document.getElementById('tResultNotes')?.value?.trim() || '';
  const bestOf = match.best_of || 3;

  if (scoreA < 0 || scoreB < 0 || scoreA > bestOf || scoreB > bestOf) {
    showToast(`⚠️ Los scores deben estar entre 0 y ${bestOf}`, 'warning');
    return;
  }
  if (scoreA === scoreB) {
    showToast('⚠️ No se permiten empates', 'warning');
    return;
  }

  const payload = { score_a: scoreA, score_b: scoreB, best_of: bestOf };
  if (notes) payload.notes = notes;

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Guardando…'; }

  try {
    const res = await apiTournamentsRegisterMatchResult(tournamentId, match.id, payload);
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Error al guardar resultado'), 'error');
      return;
    }
    showToast('✅ Resultado registrado', 'success');
    closeModal('tournamentMatchResultModal');
    await openTournamentDetail(tournamentId);
  } catch (err) {
    console.error('[Tournaments] submitMatchResult:', err);
    showToast('❌ Error de conexión', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar Resultado'; }
  }
}
window.submitMatchResult = submitMatchResult;

// ═══════════════════════════════════════════════════════════════════════════
// MODAL 4: CAMBIO DE ESTADO
// ═══════════════════════════════════════════════════════════════════════════
function openStatusChangeModal() {
  if (!canManageTournaments()) {
    showToast('⚠️ Solo ADMIN/OWNER pueden cambiar el estado', 'warning');
    return;
  }

  const detail = tournamentsState.currentDetail;
  if (!detail?.tournament) return;

  const current = detail.tournament.status;
  const currentEl = document.getElementById('tStatusCurrent'); if (currentEl) currentEl.textContent = current;

  // Transiciones válidas
  const transitions = {
    'DRAFT':        ['REGISTRATION', 'CANCELLED'],
    'REGISTRATION': ['ONGOING', 'CANCELLED'],
    'ONGOING':      ['FINISHED', 'CANCELLED'],
    'FINISHED':     [],
    'CANCELLED':    []
  };

  const options = transitions[current] || [];
  const sel = document.getElementById('tStatusNew');
  if (sel) {
    sel.innerHTML = '<option value="">— Seleccionar nuevo estado —</option>';
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = formatTournamentStatus(opt).label;
      sel.appendChild(o);
    });
  }

  const reasonGroup = document.getElementById('tStatusReasonGroup');
  if (reasonGroup) reasonGroup.style.display = 'none';
  const reasonEl = document.getElementById('tStatusReason'); if (reasonEl) reasonEl.value = '';

  showModal('tournamentStatusChangeModal');
}
window.openStatusChangeModal = openStatusChangeModal;

function onStatusChangeSelect() {
  const val = document.getElementById('tStatusNew')?.value;
  const reasonGroup = document.getElementById('tStatusReasonGroup');
  if (reasonGroup) reasonGroup.style.display = (val === 'CANCELLED') ? 'block' : 'none';
}
window.onStatusChangeSelect = onStatusChangeSelect;

async function submitStatusChange() {
  const btn = document.getElementById('tStatusSubmit');
  const tournamentId = tournamentsState.currentTournamentId;
  const newStatus = document.getElementById('tStatusNew')?.value;
  const reason = document.getElementById('tStatusReason')?.value?.trim() || '';

  if (!tournamentId || !newStatus) {
    showToast('⚠️ Seleccioná un nuevo estado', 'warning');
    return;
  }

  if (newStatus === 'CANCELLED' && (!reason || reason.length < 5)) {
    showToast('⚠️ El motivo es obligatorio (mín 5 chars) para cancelar', 'warning');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Cambiando…'; }

  try {
    const res = await apiTournamentsUpdateStatus(tournamentId, newStatus, reason || null);
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Error al cambiar estado'), 'error');
      return;
    }
    showToast('✅ Estado actualizado', 'success');
    closeModal('tournamentStatusChangeModal');
    await openTournamentDetail(tournamentId);
    await loadTournamentsList();
  } catch (err) {
    console.error('[Tournaments] submitStatusChange:', err);
    showToast('❌ Error de conexión', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Cambiar Estado'; }
  }
}
window.submitStatusChange = submitStatusChange;

// ═══════════════════════════════════════════════════════════════════════════
// MODAL 5: REASIGNAR MODERADOR
// ═══════════════════════════════════════════════════════════════════════════
async function openChangeModeratorModal() {
  if (!canManageTournaments()) {
    showToast('⚠️ Solo ADMIN/OWNER pueden reasignar moderador', 'warning');
    return;
  }

  const detail = tournamentsState.currentDetail;
  if (!detail?.tournament) return;

  const current = detail.tournament.moderator_id;
  const currentEl = document.getElementById('tModCurrent');
  if (currentEl) currentEl.innerHTML = current ? resolveNickByUserId(current) : '—';

  await loadUsersCache();
  const sel = document.getElementById('tModNew');
  if (sel) {
    sel.innerHTML = '<option value="">— Seleccionar nuevo moderador —</option>';
    tournamentsState.usersCache.forEach(u => {
      const status = (u.status || 'ACTIVE').toUpperCase();
      if (status !== 'ACTIVE') return;
      const role = (u.role || '').toUpperCase();
      if (!['ADMIN', 'VETERANO', 'OWNER'].includes(role)) return;
      const uid = u.id || u.user_id;
      if (String(uid) === String(current)) return; // no mostrar el actual
      const o = document.createElement('option');
      o.value = uid;
      o.textContent = `${u.nick || u.email || 'Sin nick'} (${role})`;
      sel.appendChild(o);
    });
  }

  const reasonEl = document.getElementById('tModReason'); if (reasonEl) reasonEl.value = '';

  showModal('tournamentChangeModeratorModal');
  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 50);
}
window.openChangeModeratorModal = openChangeModeratorModal;

async function submitChangeModerator() {
  const btn = document.getElementById('tModSubmit');
  const tournamentId = tournamentsState.currentTournamentId;
  const moderatorId = document.getElementById('tModNew')?.value;
  const reason = document.getElementById('tModReason')?.value?.trim() || '';

  if (!tournamentId || !moderatorId) {
    showToast('⚠️ Seleccioná un nuevo moderador', 'warning');
    return;
  }
  if (!reason || reason.length < 5 || reason.length > 500) {
    showToast('⚠️ El motivo debe tener entre 5 y 500 caracteres', 'warning');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Reasignando…'; }

  try {
    const res = await apiTournamentsChangeModerator(tournamentId, moderatorId, reason);
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Error al reasignar moderador'), 'error');
      return;
    }
    showToast('✅ Moderador reasignado', 'success');
    closeModal('tournamentChangeModeratorModal');
    await openTournamentDetail(tournamentId);
  } catch (err) {
    console.error('[Tournaments] submitChangeModerator:', err);
    showToast('❌ Error de conexión', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Reasignar Moderador'; }
  }
}
window.submitChangeModerator = submitChangeModerator;


// ═══════════════════════════════════════════════════════════════════════════
// F1.5b — MODAL DE DRAFT
// ═══════════════════════════════════════════════════════════════════════════
//  Anexo III §7: 1 ban por equipo, Mirrored Picks permitidos, último BM
//  auto-baneado, timer 5 min por equipo.
// ═══════════════════════════════════════════════════════════════════════════

const draftState = {
  matchId: null,
  tournamentId: null,
  match: null,
  teamAId: null,
  teamBId: null,
  bestOf: 3,
  currentAction: 'BAN',   // 'BAN' | 'PICK'
  currentTeam: 'A',       // 'A' | 'B'
  selectedAircraftId: null,
  aircraftList: [],
  aircraftLoaded: false,
  existingDrafts: [],
  timerInterval: null,
  timerSecondsLeft: 300
};

// ─── Apertura del modal ─────────────────────────────────
async function openDraftModal(matchId) {
  const detail = tournamentsState.currentDetail;
  if (!detail?.matches || !detail?.tournament) {
    showToast('⚠️ No hay match seleccionado', 'warning');
    return;
  }

  const match = detail.matches.find(m => String(m.id) === String(matchId));
  if (!match) {
    showToast('⚠️ Match no encontrado', 'warning');
    return;
  }

  // RBAC: solo moderador o ADMIN/OWNER
  if (!canModerateTournament(detail.tournament)) {
    showToast('⚠️ Solo el moderador puede operar el draft', 'warning');
    return;
  }

  // Reset state
  draftState.matchId = matchId;
  draftState.tournamentId = detail.tournament.id;
  draftState.match = match;
  draftState.teamAId = match.team_a_id;
  draftState.teamBId = match.team_b_id;
  draftState.bestOf = match.best_of || 3;
  draftState.currentAction = 'BAN';
  draftState.currentTeam = 'A';
  draftState.selectedAircraftId = null;
  draftState.existingDrafts = [];

  // Header del modal
  const gn = document.getElementById('tDraftGameNumberInput')?.value || 1;
  const gameNumberEl = document.getElementById('tDraftGameNumber');
  if (gameNumberEl) gameNumberEl.textContent = `— Partida ${gn}`;

  const phaseEl = document.getElementById('tDraftPhaseBadge');
  if (phaseEl) phaseEl.textContent = formatMatchPhase(match.phase);

  const boEl = document.getElementById('tDraftBestOfBadge');
  if (boEl) boEl.textContent = `Bo${draftState.bestOf}`;

  // Info del match
  const teamAName = resolveNickByUserId(match.team_a_id);
  const teamBName = resolveNickByUserId(match.team_b_id);
  const infoEl = document.getElementById('tDraftMatchInfo');
  if (infoEl) {
    infoEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
        <div style="font-size:0.9rem;color:#f8fafc;font-weight:600;">
          <span style="color:#38bdf8;">${teamAName}</span> vs <span style="color:#ef4444;">${teamBName}</span>
        </div>
        <div style="font-size:0.75rem;color:#94a3b8;">
          📅 Partida 1 · ${escapeHTML(formatMatchPhase(match.phase))} · Ronda ${match.round || 1}
        </div>
      </div>
      <div style="font-size:0.75rem;color:#64748b;margin-top:6px;">
        🗺️ Mapa: <em>ver reglamento</em> (Countdown / Icebound / Crimson Canyon)
      </div>
    `;
  }

  // Estado inicial de botones
  updateDraftButtonStates();

  // Seleccionar equipo A por defecto
  setDraftTeam('A', true);

  // Reset timer
  stopDraftTimer();
  draftState.timerSecondsLeft = 300;
  updateTimerDisplay();
  startDraftTimer();

  // Mostrar modal
  showModal('tournamentDraftModal');

  // Cargar aeronaves (async)
  await loadDraftAircraft();

  // Cargar drafts existentes (async)
  await refreshExistingDrafts();

  if (typeof refreshLucideIcons === 'function') setTimeout(refreshLucideIcons, 50);
}
window.openDraftModal = openDraftModal;

// ─── Cierre del modal ───────────────────────────────────
function closeDraftModal() {
  stopDraftTimer();
  draftState.matchId = null;
  draftState.tournamentId = null;
  draftState.match = null;
  draftState.selectedAircraftId = null;
  closeModal('tournamentDraftModal');
}
window.closeDraftModal = closeDraftModal;

// ─── Carga de aeronaves ─────────────────────────────────
async function loadDraftAircraft() {
  if (draftState.aircraftLoaded && draftState.aircraftList.length > 0) {
    renderDraftAircraftGrid();
    return;
  }

  try {
    const res = await apiGetPlaneModels({});
    if (!res.success) {
      console.warn('[Draft] No se pudo cargar el catálogo', res.error);
      draftState.aircraftList = [];
    } else {
      draftState.aircraftList = res.models || res.plane_models || [];
    }
    draftState.aircraftLoaded = true;
    renderDraftAircraftGrid();
  } catch (err) {
    console.error('[Draft] loadDraftAircraft error:', err);
    draftState.aircraftList = [];
    renderDraftAircraftGrid();
  }
}

// ─── Render de la grilla de aeronaves ───────────────────
function renderDraftAircraftGrid() {
  const grid = document.getElementById('tDraftAircraftGrid');
  if (!grid) return;

  const list = draftState.aircraftList;
  if (!list || list.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:#f87171;">⚠️ No se pudo cargar el catálogo de aeronaves.</div>';
    return;
  }

  // IDs baneados en esta partida
  const gameNumber = Number(document.getElementById('tDraftGameNumberInput')?.value || 1);
  const bannedIds = new Set(
    draftState.existingDrafts
      .filter(d => d.game_number === gameNumber && d.action === 'BAN')
      .map(d => String(d.aircraft_id))
  );

  const search = (document.getElementById('tDraftAircraftSearch')?.value || '').toLowerCase().trim();

  const filtered = list.filter(a => {
    if (search) {
      const name = String(a.name || '').toLowerCase();
      if (!name.includes(search)) return false;
    }
    return true;
  });

  grid.innerHTML = filtered.map(a => {
    const id = String(a.id || '');
    const isBanned = bannedIds.has(id);
    const isSelected = String(draftState.selectedAircraftId) === id;
    const imgUrl = a.image_url || '';

    return `
      <div onclick="${isBanned ? '' : `selectAircraft('${escapeHTML(id)}')`}"
           style="
             position:relative;
             background:${isSelected ? 'rgba(212,175,55,0.15)' : 'rgba(15,23,42,0.6)'};
             border:${isSelected ? '2px solid #d4af37' : '1px solid rgba(99,110,130,0.3)'};
             border-radius:6px;
             padding:6px;
             cursor:${isBanned ? 'not-allowed' : 'pointer'};
             opacity:${isBanned ? '0.35' : '1'};
             text-align:center;
             transition:all 0.15s;
           "
           title="${escapeHTML(a.name || '')}${isBanned ? ' (BANEADA)' : ''}">
        ${isBanned ? '<div style="position:absolute;top:2px;right:4px;font-size:0.9rem;">🚫</div>' : ''}
        ${imgUrl
          ? `<img src="${escapeHTML(imgUrl)}" alt="${escapeHTML(a.name || '')}" style="width:100%;height:60px;object-fit:cover;border-radius:4px;" loading="lazy" />`
          : '<div style="width:100%;height:60px;background:#1e293b;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">✈️</div>'}
        <div style="font-size:0.7rem;color:#cbd5e1;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHTML(a.name || '')}">
          ${escapeHTML(a.name || 'Sin nombre')}
        </div>
      </div>
    `;
  }).join('');
}
window.renderDraftAircraftGrid = renderDraftAircraftGrid;

// ─── Filtro de la grilla ────────────────────────────────
function filterDraftGrid() {
  renderDraftAircraftGrid();
}
window.filterDraftGrid = filterDraftGrid;

// ─── Selección de aeronave ──────────────────────────────
function selectAircraft(aircraftId) {
  draftState.selectedAircraftId = aircraftId;

  const aircraft = draftState.aircraftList.find(a => String(a.id) === String(aircraftId));
  const infoEl = document.getElementById('tDraftSelectionInfo');
  if (infoEl && aircraft) {
    const teamLabel = draftState.currentTeam === 'A' ? '🔵 Equipo A' : '🔴 Equipo B';
    const actionIcon = draftState.currentAction === 'BAN' ? '🚫' : '✈️';
    infoEl.innerHTML = `
      <strong>${actionIcon} ${draftState.currentAction}</strong> · ${teamLabel} · Partida ${document.getElementById('tDraftGameNumberInput')?.value || 1}
      → <span style="color:#fde047;font-weight:700;">${escapeHTML(aircraft.name || '—')}</span>
    `;
    infoEl.style.borderLeftColor = draftState.currentAction === 'BAN' ? '#ef4444' : '#10b981';
  }

  renderDraftAircraftGrid();
}
window.selectAircraft = selectAircraft;

// ─── Set acción (BAN/PICK) ──────────────────────────────
function setDraftAction(action) {
  if (!['BAN', 'PICK'].includes(action)) return;
  draftState.currentAction = action;
  updateDraftButtonStates();

  // Actualizar info si hay aeronave seleccionada
  if (draftState.selectedAircraftId) {
    selectAircraft(draftState.selectedAircraftId);
  }
}
window.setDraftAction = setDraftAction;

// ─── Set equipo (A/B) ───────────────────────────────────
function setDraftTeam(team, silent = false) {
  if (!['A', 'B'].includes(team)) return;
  draftState.currentTeam = team;
  updateDraftButtonStates();

  // Actualizar timer label
  const timerTeamEl = document.getElementById('tDraftTimerTeam');
  if (timerTeamEl) {
    timerTeamEl.textContent = team === 'A' ? 'Equipo A' : 'Equipo B';
  }

  // Reiniciar timer al cambiar equipo (regla: 5 min POR equipo)
  if (!silent) {
    draftState.timerSecondsLeft = 300;
    updateTimerDisplay();
  }
}
window.setDraftTeam = setDraftTeam;

// ─── Actualizar estados visuales de los botones ─────────
function updateDraftButtonStates() {
  const btnBan = document.getElementById('tDraftBtnBan');
  const btnPick = document.getElementById('tDraftBtnPick');
  const btnA = document.getElementById('tDraftBtnTeamA');
  const btnB = document.getElementById('tDraftBtnTeamB');

  const activeStyle = 'background:#d4af37;color:#0f172a;border-color:#d4af37;font-weight:700;';
  const inactiveStyle = '';

  if (btnBan) btnBan.style.cssText = draftState.currentAction === 'BAN' ? activeStyle : inactiveStyle;
  if (btnPick) btnPick.style.cssText = draftState.currentAction === 'PICK' ? activeStyle : inactiveStyle;
  if (btnA) btnA.style.cssText = draftState.currentTeam === 'A' ? activeStyle : inactiveStyle;
  if (btnB) btnB.style.cssText = draftState.currentTeam === 'B' ? activeStyle : inactiveStyle;
}

// ─── Timer 5 min ────────────────────────────────────────
function startDraftTimer() {
  stopDraftTimer();
  draftState.timerInterval = setInterval(() => {
    draftState.timerSecondsLeft--;
    updateTimerDisplay();

    if (draftState.timerSecondsLeft <= 0) {
      stopDraftTimer();
      showToast('⏰ Timer agotado. Se debe asignar aeronave por defecto del rol.', 'warning');
      // Según Anexo III §7.6: asignar aeronave por defecto del rol correspondiente.
      // Por ahora solo advertimos (feature futura: auto-pick).
    }
  }, 1000);
}

function stopDraftTimer() {
  if (draftState.timerInterval) {
    clearInterval(draftState.timerInterval);
    draftState.timerInterval = null;
  }
}

function updateTimerDisplay() {
  const el = document.getElementById('tDraftTimerValue');
  if (!el) return;

  const total = draftState.timerSecondsLeft;
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  el.textContent = `${mm}:${ss}`;

  // Color según tiempo restante
  if (total <= 30) {
    el.style.color = '#ef4444';
  } else if (total <= 90) {
    el.style.color = '#f59e0b';
  } else {
    el.style.color = '#fde047';
  }
}

// ─── Refrescar lista de drafts existentes ───────────────
async function refreshExistingDrafts() {
  if (!draftState.matchId || !draftState.tournamentId) return;

  try {
    const res = await apiTournamentsGetMatchDrafts(draftState.tournamentId, draftState.matchId);
    if (!res.success) {
      console.warn('[Draft] No se pudieron cargar los drafts', res.error);
      draftState.existingDrafts = [];
    } else {
      draftState.existingDrafts = res.drafts || [];
    }
  } catch (err) {
    console.error('[Draft] refreshExistingDrafts error:', err);
    draftState.existingDrafts = [];
  }

  renderExistingDraftsList();
  renderDraftAircraftGrid();  // re-render para actualizar baneadas
}
window.refreshExistingDrafts = refreshExistingDrafts;

// ─── Render de la lista de acciones existentes ──────────
function renderExistingDraftsList() {
  const listEl = document.getElementById('tDraftExistingList');
  if (!listEl) return;

  const gameNumber = Number(document.getElementById('tDraftGameNumberInput')?.value || 1);
  const gameDrafts = draftState.existingDrafts
    .filter(d => d.game_number === gameNumber)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  if (gameDrafts.length === 0) {
    listEl.innerHTML = '<div style="text-align:center;padding:1rem;color:#94a3b8;font-size:0.85rem;">Sin acciones registradas aún.</div>';
    return;
  }

  listEl.innerHTML = gameDrafts.map(d => {
    const aircraft = draftState.aircraftList.find(a => String(a.id) === String(d.aircraft_id));
    const aircraftName = aircraft?.name || `#${String(d.aircraft_id).substring(0, 8)}`;
    const teamLabel = String(d.team_id) === String(draftState.teamAId) ? '🔵 A' : '🔴 B';
    const actionIcon = d.action === 'BAN' ? '🚫' : '✈️';
    const actionColor = d.action === 'BAN' ? '#ef4444' : '#10b981';

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(15,23,42,0.5);border-left:3px solid ${actionColor};border-radius:4px;font-size:0.82rem;">
        <span style="color:#cbd5e1;">
          <span style="color:#64748b;font-family:var(--font-mono);font-size:0.75rem;margin-right:6px;">#${d.order_index}</span>
          ${teamLabel} ${actionIcon} <strong>${escapeHTML(d.action)}</strong>
        </span>
        <span style="color:#f8fafc;font-weight:600;">${escapeHTML(aircraftName)}</span>
      </div>
    `;
  }).join('');
}

// ─── Submit de acción del draft ─────────────────────────
async function submitDraftAction() {
  if (!draftState.matchId || !draftState.tournamentId) {
    showToast('⚠️ No hay match seleccionado', 'warning');
    return;
  }

  if (!draftState.selectedAircraftId) {
    showToast('⚠️ Seleccioná una aeronave primero', 'warning');
    return;
  }

  const gameNumber = parseInt(document.getElementById('tDraftGameNumberInput')?.value || '1', 10);
  if (!gameNumber || gameNumber < 1 || gameNumber > 5) {
    showToast('⚠️ Número de partida inválido (1-5)', 'warning');
    return;
  }

  // Calcular order_index: siguiente correlativo
  const gameDrafts = draftState.existingDrafts.filter(d => d.game_number === gameNumber);
  const nextOrderIndex = gameDrafts.length + 1;

  const teamId = draftState.currentTeam === 'A' ? draftState.teamAId : draftState.teamBId;

  const payload = {
    game_number: gameNumber,
    team_id: teamId,
    action: draftState.currentAction,
    aircraft_id: String(draftState.selectedAircraftId),
    order_index: nextOrderIndex
  };

  const btn = document.getElementById('tDraftSubmit');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Registrando…'; }

  try {
    const res = await apiTournamentsRegisterDraft(draftState.tournamentId, draftState.matchId, payload);
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Error al registrar acción'), 'error');
      return;
    }

    showToast(`✅ ${draftState.currentAction} registrada`, 'success');

    // Reset selección
    draftState.selectedAircraftId = null;

    // Refrescar lista y grilla
    await refreshExistingDrafts();

    // Info de vuelta
    const infoEl = document.getElementById('tDraftSelectionInfo');
    if (infoEl) {
      infoEl.innerHTML = 'ℹ️ Acción registrada. Seleccioná otra aeronave o cambiá de equipo.';
      infoEl.style.borderLeftColor = '#38bdf8';
    }

    // Reiniciar timer al confirmar acción (nuevo turno)
    draftState.timerSecondsLeft = 300;
    updateTimerDisplay();

  } catch (err) {
    console.error('[Draft] submitDraftAction error:', err);
    showToast('❌ Error de conexión', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '💾 Registrar Acción'; }
  }
}
window.submitDraftAction = submitDraftAction;

// ─── Hook de cambio de número de partida ────────────────
document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'tDraftGameNumberInput') {
    const gn = parseInt(e.target.value || '1', 10);
    const gameNumberEl = document.getElementById('tDraftGameNumber');
    if (gameNumberEl) gameNumberEl.textContent = `— Partida ${gn}`;

    // Reset selección al cambiar de partida
    draftState.selectedAircraftId = null;

    // Re-render
    renderExistingDraftsList();
    renderDraftAircraftGrid();
  }
});

// ─── Badge de draft en cada match del bracket ───────────
//  El render original (renderBracketMatch) se modifica ligeramente para
//  mostrar un badge con la cantidad de acciones registradas.
//  Como no podemos reescribir renderBracketMatch (ya está definida),
//  usamos un MutationObserver sobre #tournamentTabContent para enriquecer
//  el DOM después del render. Es un hack aceptable para no tocar F1.5a.
function enrichBracketWithDraftBadges() {
  // Implementación diferida: F1.5b avanzada solo muestra el botón.
  // La visualización del draft en el bracket se hace con el contador manual.
}

console.log('✅ [Tournaments] Módulo F1.5a cargado. Funciones expuestas en window.');
