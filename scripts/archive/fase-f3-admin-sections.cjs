/**
 * ═══════════════════════════════════════════════════════════════
 *  FASE 3 — Crear las 5 Secciones del Panel Admin
 *  ─────────────────────────────────────────────────────────────
 *  Este script hace TODO lo que necesita la Fase 3:
 *
 *    [1] Crea la carpeta components/admin-sections/ (si no existe)
 *    [2] Genera los 5 archivos de sección:
 *          - admin-summary.html
 *          - admin-members.html
 *          - admin-events.html
 *          - admin-catalog.html
 *          - admin-status.html
 *    [3] Backup de admin-plane-models.html → .bak-f3
 *
 *  NADA se toca en producción. Solo se CREAN archivos nuevos.
 *
 *  Uso:      node scripts/fase-f3-admin-sections.cjs
 *
 *  Rollback:
 *    rmdir /S /Q components\admin-sections
 *  ─────────────────────────────────────────────────────────────
 *  Fecha: 2026-10-09 · Proyecto: PARAGUAY-FFAA | METALSTORM
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Rutas ──
const ROOT = path.resolve(__dirname, '..');
const DIR_SECTIONS = path.join(ROOT, 'components', 'admin-sections');
const FILE_ADMIN_PLANE_MODELS = path.join(ROOT, 'components', 'admin-plane-models.html');
const FILE_ADMIN_PLANE_MODELS_BAK = FILE_ADMIN_PLANE_MODELS + '.bak-f3';

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════

function log(msg)   { console.log(msg); }
function ok(msg)    { console.log(`   ✅ ${msg}`); }
function warn(msg)  { console.log(`   ⚠️  ${msg}`); }
function err(msg)   { console.error(`   ❌ ${msg}`); }
function title(msg) { console.log(`\n🔷 ${msg}`); }

function escribirSeccion(nombreArchivo, contenido) {
  const filepath = path.join(DIR_SECTIONS, nombreArchivo);
  fs.writeFileSync(filepath, contenido, 'utf8');
  const bytes = Buffer.byteLength(contenido, 'utf8');
  ok(`${nombreArchivo} (${bytes} bytes)`);
}

// ═══════════════════════════════════════════════════════════════
//  SECCIÓN 1: RESUMEN
// ═══════════════════════════════════════════════════════════════

const ADMIN_SUMMARY_HTML = `<!-- ═══════════════════════════════════════════════════════════════
     SECCIÓN: RESUMEN del Panel Admin
     ─────────────────────────────────────────────────────────────
     - KPIs generales del escuadrón
     - Distribución de rendimiento
     - Accesos rápidos a otras secciones
     ─────────────────────────────────────────────────────────────
     IDs únicos (no chocan con otras secciones):
       #adminTotalMembers, #adminAvgTokens, #adminAtRiskMembers, #adminLastUpdate
       #adminPilotsByStatus
     ─────────────────────────────────────────────────────────────
     Dependencias JS (existentes):
       renderAdminStats(), renderPilotsByStatus(), refreshAdminStats()
     ─────────────────────────────────────────────────────────────
     Fase 3 · v4.7.0 · 2026-10-09
     ═══════════════════════════════════════════════════════════════ -->

<div class="admin-section-header">
  <div>
    <div class="badge-tag">C4ISR · OVERVIEW</div>
    <h2>📊 Resumen del Escuadrón</h2>
    <p class="subtitle">Estado operacional general y métricas clave de [PRY]</p>
  </div>
  <div class="admin-section-actions">
    <button type="button" onclick="refreshAdminStats()" class="btn-secondary btn-sm">
      🔄 Actualizar
    </button>
    <button type="button" onclick="switchAdminSection('dotacion')" class="btn-primary btn-sm">
      👥 Ver Dotación
    </button>
  </div>
</div>

<!-- KPIs Principales -->
<div class="stats-grid-tactical">
  <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #2ecc71;">
    <div class="stat-card-header">
      <span class="stat-label">Pilotos Activos</span>
      <span style="font-size:1.1rem;">🟢</span>
    </div>
    <div class="stat-main">
      <span id="adminTotalMembers" class="stat-number-green">—</span>
    </div>
    <div class="stat-footer" id="adminActiveDetail">Sincronizando...</div>
  </div>

  <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #d4af37;">
    <div class="stat-card-header">
      <span class="stat-label">Promedio Escuadrón</span>
      <span style="font-size:1.1rem;">📈</span>
    </div>
    <div class="stat-main">
      <span id="adminAvgTokens" class="stat-number-gold">—</span>
    </div>
    <div class="stat-footer">Meta mínima: 175 tokens</div>
  </div>

  <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #e74c3c;">
    <div class="stat-card-header">
      <span class="stat-label">Pilotos en Riesgo</span>
      <span style="font-size:1.1rem;">⚠️</span>
    </div>
    <div class="stat-main">
      <span id="adminAtRiskMembers" class="stat-number-red">—</span>
    </div>
    <div class="stat-footer">Estado ROJO + NEGRO</div>
  </div>

  <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #3498db;">
    <div class="stat-card-header">
      <span class="stat-label">Última Sincronización</span>
      <span style="font-size:1.1rem;">🕐</span>
    </div>
    <div class="stat-main">
      <span id="adminLastUpdate" style="font-size:1.1rem;font-weight:700;color:#cbd5e0;font-family:var(--font-mono);">—</span>
    </div>
    <div class="stat-footer">Hora Paraguay (PY)</div>
  </div>
</div>

<!-- Distribución de Rendimiento -->
<div class="card tactical-corners" style="margin-bottom:1.5rem;">
  <div class="card-header">
    <h3 style="margin:0;">📊 Distribución de Rendimiento Actual</h3>
    <span class="badge-tag">SEMÁFORO MILITAR</span>
  </div>
  <div id="adminPilotsByStatus">
    <div style="text-align:center;padding:1.5rem;color:#94a3b8;">
      Cargando distribución de pilotos...
    </div>
  </div>
</div>

<!-- Accesos Rápidos -->
<div class="card tactical-corners">
  <div class="card-header">
    <h3 style="margin:0;">⚡ Accesos Rápidos de Comandancia</h3>
  </div>
  <div class="quick-access-grid">
    <button type="button" class="quick-access-btn" onclick="switchAdminSection('dotacion')">
      <div class="qa-icon-box" style="background:rgba(46,204,113,0.15);border-color:#2ecc71;">
        <span>👥</span>
      </div>
      <div class="qa-content">
        <strong class="qa-title">Gestionar Dotación</strong>
        <span class="qa-desc">Alta, baja y roles de pilotos</span>
      </div>
    </button>

    <button type="button" class="quick-access-btn" onclick="switchAdminSection('eventos')">
      <div class="qa-icon-box" style="background:rgba(212,175,55,0.15);border-color:#d4af37;">
        <span>📅</span>
      </div>
      <div class="qa-content">
        <strong class="qa-title">Eventos Activos</strong>
        <span class="qa-desc">SQ + Black Market + Export</span>
      </div>
    </button>

    <button type="button" class="quick-access-btn" onclick="switchAdminSection('catalogo')">
      <div class="qa-icon-box" style="background:rgba(96,165,250,0.15);border-color:#60a5fa;">
        <span>✈️</span>
      </div>
      <div class="qa-content">
        <strong class="qa-title">Catálogo de Aeronaves</strong>
        <span class="qa-desc">CRUD de modelos oficiales</span>
      </div>
    </button>

    <button type="button" class="quick-access-btn" onclick="switchAdminSection('estado')">
      <div class="qa-icon-box" style="background:rgba(56,189,248,0.15);border-color:#38bdf8;">
        <span>⚙️</span>
      </div>
      <div class="qa-content">
        <strong class="qa-title">Estado del Sistema</strong>
        <span class="qa-desc">Scheduler · Health · Logs</span>
      </div>
    </button>
  </div>
</div>
`;

// ═══════════════════════════════════════════════════════════════
//  SECCIÓN 2: DOTACIÓN
// ═══════════════════════════════════════════════════════════════

const ADMIN_MEMBERS_HTML = `<!-- ═══════════════════════════════════════════════════════════════
     SECCIÓN: DOTACIÓN del Panel Admin
     ─────────────────────────────────────────────────────────────
     - Tabs (Activos / Inactivos / Todos) → Activos por defecto
     - Filtros de búsqueda
     - Tabla de miembros con acciones inline
     - Formulario de alta de piloto
     ─────────────────────────────────────────────────────────────
     IDs únicos:
       #membersTableBody, #noResultsMessage
       #tabActive, #tabInactive, #tabAll
       #tabActiveCount, #tabInactiveCount, #tabAllCount
       #memberSearch, #roleFilter, #weeksFilter, #perfStatusFilter, #statusFilter
       #newMemberNick, #newMemberEmailLocal, #newMemberRole
       #newMemberEmailFullPreview
       #membersSectionBody, #membersSectionToggleIcon
     ─────────────────────────────────────────────────────────────
     Dependencias JS (existentes):
       switchMembersTab(), filterMembers(), resetMemberFilters()
       addNewMember(), toggleMembersSection()
       handleNewMemberNickInput(), handleNewMemberEmailInput()
     ─────────────────────────────────────────────────────────────
     Fase 3 · v4.7.0 · 2026-10-09
     ═══════════════════════════════════════════════════════════════ -->

<div class="admin-section-header">
  <div>
    <div class="badge-tag">PERSONNEL · ROSTER</div>
    <h2>👥 Dotación del Escuadrón</h2>
    <p class="subtitle">Gestión de pilotos, rangos y estados de servicio</p>
  </div>
  <div class="admin-section-actions">
    <button type="button" class="btn-secondary btn-sm" id="dotacionCompactToggle" onclick="toggleDotacionCompactMode()">
      <span id="compactToggleLabel">⬜ Modo Compacto</span>
    </button>
    <button type="button" class="btn-secondary btn-sm" onclick="resetMemberFilters()">
      🔄 Limpiar Filtros
    </button>
  </div>
</div>

<!-- Tabs de Estado (Activos por defecto) -->
<div id="membersTabsContainer" class="admin-tabs">
  <button type="button" id="tabActive" class="admin-tab-btn active-green" onclick="switchMembersTab('active')">
    <span>🟢 Activos</span>
    <span id="tabActiveCount" class="tab-count">(0)</span>
  </button>
  <button type="button" id="tabInactive" class="admin-tab-btn" onclick="switchMembersTab('inactive')">
    <span>🔴 Inactivos</span>
    <span id="tabInactiveCount" class="tab-count">(0)</span>
  </button>
  <button type="button" id="tabAll" class="admin-tab-btn" onclick="switchMembersTab('all')">
    <span>📋 Todos</span>
    <span id="tabAllCount" class="tab-count">(0)</span>
  </button>
</div>

<!-- Filtros -->
<div class="admin-filters">
  <div>
    <label for="memberSearch">Buscar Piloto</label>
    <input type="text" id="memberSearch" placeholder="Nick o email..." oninput="filterMembers()" />
  </div>
  <div>
    <label for="roleFilter">Rango / Rol</label>
    <select id="roleFilter" onchange="filterMembers()">
      <option value="">Todos</option>
      <option value="MIEMBRO">Miembro</option>
      <option value="VETERANO">Veterano</option>
      <option value="ADMIN">Admin</option>
      <option value="OWNER">Owner</option>
    </select>
  </div>
  <div>
    <label for="weeksFilter">Semanas Evaluadas</label>
    <select id="weeksFilter" onchange="filterMembers()">
      <option value="">Todas</option>
      <option value="1">1 sem</option>
      <option value="2">2 sem</option>
      <option value="3">3 sem</option>
      <option value="4+">4+ sem</option>
    </select>
  </div>
  <div>
    <label for="perfStatusFilter">Estado Rendimiento</label>
    <select id="perfStatusFilter" onchange="filterMembers()">
      <option value="">Todos</option>
      <option value="VERDE">🟢 Verde</option>
      <option value="NARANJA">🟠 Naranja</option>
      <option value="ROJO">🔴 Rojo</option>
      <option value="NEGRO">⚫ Negro</option>
      <option value="PENDIENTE">⏸ Pendiente</option>
    </select>
  </div>
  <div>
    <label for="statusFilter">Estado de Cuenta</label>
    <select id="statusFilter" onchange="filterMembers()">
      <option value="">Todos</option>
      <option value="ACTIVE">ACTIVE</option>
      <option value="INACTIVE">INACTIVE</option>
    </select>
  </div>
</div>

<!-- Tabla de Pilotos -->
<div id="membersSectionBody">
  <div id="dotacionTableWrapper" style="overflow-x:auto;">
    <table class="data-table" style="width:100%;font-size:0.88rem;">
      <thead>
        <tr>
          <th>Piloto</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Estado</th>
          <th>Últ. Actividad</th>
          <th>Prom. Tokens</th>
          <th style="text-align:center;">Gestión & Acciones</th>
        </tr>
      </thead>
      <tbody id="membersTableBody">
        <tr>
          <td colspan="7" style="text-align:center;padding:2rem;color:#a0aec0;">
            ⏳ Sincronizando registros militares de la escuadra...
          </td>
        </tr>
      </tbody>
    </table>
    <div id="noResultsMessage" style="display:none;padding:1.5rem;text-align:center;color:#a0aec0;">
      No se encontraron pilotos con los filtros seleccionados
    </div>
  </div>
</div>

<!-- Formulario de Alta de Piloto -->
<div class="card tactical-corners" style="margin-top:1.5rem;">
  <div class="card-header">
    <h3 style="margin:0;">➕ Registrar Nuevo Piloto</h3>
    <span class="badge-tag">ALTA C4ISR</span>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:end;">
    <div>
      <label for="newMemberNick" style="font-size:0.8rem;color:#a0aec0;">
        Nickname en MetalStorm
      </label>
      <input
        type="text"
        id="newMemberNick"
        placeholder="Ej: PRY_Viper"
        autocomplete="off"
        spellcheck="false"
        oninput="window.handleNewMemberNickInput && window.handleNewMemberNickInput()"
      />
    </div>
    <div>
      <label for="newMemberEmailLocal" style="font-size:0.8rem;color:#a0aec0;">
        Correo Institucional
        <span style="font-size:0.7rem;color:#64748b;font-weight:normal;">(auto-generado, editable)</span>
      </label>
      <div style="display:flex;align-items:stretch;width:100%;">
        <input
          type="text"
          id="newMemberEmailLocal"
          placeholder="piloto"
          autocomplete="off"
          spellcheck="false"
          style="flex:1;min-width:0;border-top-right-radius:0;border-bottom-right-radius:0;"
          oninput="window.handleNewMemberEmailInput && window.handleNewMemberEmailInput()"
        />
        <span style="display:flex;align-items:center;padding:0 10px;background:rgba(15,23,42,0.9);border:1px solid #334155;border-left:none;border-top-right-radius:6px;border-bottom-right-radius:6px;color:#94a3b8;font-family:'JetBrains Mono',monospace;font-size:0.82rem;white-space:nowrap;">
          @ffaa.py
        </span>
      </div>
      <div id="newMemberEmailFullPreview" style="font-size:0.72rem;color:#64748b;margin-top:4px;font-family:'JetBrains Mono',monospace;min-height:14px;"></div>
    </div>
    <div>
      <label for="newMemberRole" style="font-size:0.8rem;color:#a0aec0;">Rol Inicial</label>
      <select id="newMemberRole">
        <option value="MIEMBRO">MIEMBRO</option>
        <option value="VETERANO">VETERANO</option>
        <option value="ADMIN">ADMIN</option>
      </select>
    </div>
    <div>
      <button type="button" onclick="addNewMember()" class="btn-primary" style="width:100%;">
        ➕ Registrar Piloto
      </button>
    </div>
  </div>
</div>

<script>
  // Modo compacto de tabla (exclusivo de la sección Dotación)
  (function() {
    'use strict';
    let _compactMode = false;
    window.toggleDotacionCompactMode = function() {
      _compactMode = !_compactMode;
      const wrapper = document.getElementById('dotacionTableWrapper');
      if (wrapper) wrapper.classList.toggle('table-compact', _compactMode);
      const label = document.getElementById('compactToggleLabel');
      if (label) label.textContent = _compactMode ? '✅ Modo Compacto' : '⬜ Modo Compacto';
    };
  })();
</script>
`;

// ═══════════════════════════════════════════════════════════════
//  SECCIÓN 3: EVENTOS
// ═══════════════════════════════════════════════════════════════

const ADMIN_EVENTS_HTML = `<!-- ═══════════════════════════════════════════════════════════════
     SECCIÓN: EVENTOS del Panel Admin
     ─────────────────────────────────────────────────────────────
     - Card del evento activo (auto-actualizable)
     - Tabs internas: Lista | Carga Masiva | Exportar Resultados
     ─────────────────────────────────────────────────────────────
     IDs únicos:
       #adminEventsV2Container
       #adminEventCreateModal (modal de creación, se migra desde admin-panel viejo)
       #eventIdInput, #eventBulkData (para carga masiva)
       #exportEventSelect, #exportFormatSelect, #exportPreviewContainer, #exportPreviewTarget
     ─────────────────────────────────────────────────────────────
     Dependencias JS (existentes):
       adminEventsLoad() [admin-events.js]
       showUploadEventModal(), uploadEventBulk()
       generateEventReport(), downloadEventReport(), closeExportPreview()
       loadExportEventsList()
     ─────────────────────────────────────────────────────────────
     Fase 3 · v4.7.0 · 2026-10-09
     ═══════════════════════════════════════════════════════════════ -->

<div class="admin-section-header">
  <div>
    <div class="badge-tag">OPERATIONS · EVENTS</div>
    <h2>📅 Eventos del Escuadrón</h2>
    <p class="subtitle">SQ + Black Market en un solo panel · Exportación integrada</p>
  </div>
  <div class="admin-section-actions">
    <button type="button" onclick="window.adminEventsReload && window.adminEventsReload()" class="btn-secondary btn-sm">
      🔄 Actualizar
    </button>
    <button type="button" onclick="window.adminEventsOpenCreateModal && window.adminEventsOpenCreateModal()" class="btn-primary btn-sm">
      ➕ Crear Evento
    </button>
  </div>
</div>

<!-- Tabs internas: Lista / Carga Masiva / Exportar -->
<div class="admin-tabs" id="eventosTabsContainer">
  <button type="button" class="admin-tab-btn active" data-etab="lista" onclick="switchEventoTab('lista')">
    <span>📋 Lista de Eventos</span>
  </button>
  <button type="button" class="admin-tab-btn" data-etab="carga" onclick="switchEventoTab('carga')">
    <span>⚡ Carga Masiva</span>
  </button>
  <button type="button" class="admin-tab-btn" data-etab="export" onclick="switchEventoTab('export')">
    <span>📊 Exportar Resultados</span>
  </button>
</div>

<!-- Sub-panel: Lista unificada (v2) -->
<div class="evento-panel" id="evento-panel-lista">
  <div id="adminEventsV2Container" class="card tactical-corners">
    <div style="text-align:center;padding:2rem;color:#94a3b8;">
      <i data-lucide="loader-2" class="spin"></i>
      Cargando panel unificado de eventos...
    </div>
  </div>
</div>

<!-- Sub-panel: Carga Masiva -->
<div class="evento-panel" id="evento-panel-carga" style="display:none;">
  <div class="card tactical-corners">
    <div class="card-header">
      <h3 style="margin:0;">⚡ Carga Masiva de Evento</h3>
      <span class="badge-tag">BULK IMPORT</span>
    </div>
    <div class="form-group" style="margin-bottom:1rem;">
      <label for="eventIdInput" style="display:block;font-size:0.85rem;color:#cbd5e1;margin-bottom:6px;font-weight:600;">
        Identificador de Evento
      </label>
      <input
        type="text"
        id="eventIdInput"
        placeholder="Ej: SQUADRON-2026-W40"
        style="width:100%;padding:8px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f8fafc;"
      />
    </div>
    <div class="form-group" style="margin-bottom:1rem;">
      <label for="eventBulkData" style="display:block;font-size:0.85rem;color:#cbd5e1;margin-bottom:6px;font-weight:600;">
        Datos (Formato: Nick, Tokens, Rol por línea)
      </label>
      <textarea
        id="eventBulkData"
        rows="6"
        placeholder="PRY_Alpha, 195, MIEMBRO&#10;PRY_Bravo, 180, VETERANO"
        style="width:100%;padding:10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f8fafc;font-family:'JetBrains Mono',monospace;font-size:0.85rem;resize:vertical;"
      ></textarea>
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;">
      <button type="button" onclick="document.getElementById('eventBulkData').value=''" class="btn-secondary">
        Limpiar
      </button>
      <button type="button" onclick="uploadEventBulk()" class="btn-primary">
        ▶️ Procesar Carga Masiva
      </button>
    </div>
  </div>
</div>

<!-- Sub-panel: Exportar Resultados -->
<div class="evento-panel" id="evento-panel-export" style="display:none;">
  <div class="card tactical-corners">
    <div class="card-header">
      <h3 style="margin:0;">📊 Exportar Resultados de Evento</h3>
      <span class="badge-tag">REPORT GENERATOR</span>
    </div>
    <p style="font-size:0.82rem;color:#94a3b8;margin-bottom:1.2rem;">
      Generá una imagen del reporte para compartir por WhatsApp/Discord
    </p>

    <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;margin-bottom:1.2rem;align-items:end;">
      <div>
        <label for="exportEventSelect" style="font-size:0.8rem;color:#a0aec0;display:block;margin-bottom:6px;">
          Evento a Exportar
        </label>
        <select id="exportEventSelect" style="width:100%;padding:8px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f8fafc;font-size:0.9rem;">
          <option value="">Cargando eventos...</option>
        </select>
      </div>
      <div>
        <label for="exportFormatSelect" style="font-size:0.8rem;color:#a0aec0;display:block;margin-bottom:6px;">
          Formato
        </label>
        <select id="exportFormatSelect" style="width:100%;padding:8px 10px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f8fafc;font-size:0.9rem;">
          <option value="jpg" selected>JPG (predeterminado)</option>
          <option value="png">PNG (alta calidad)</option>
          <option value="pdf">PDF (archivo oficial)</option>
        </select>
      </div>
      <div>
        <button type="button" onclick="generateEventReport()" class="btn-primary" style="width:100%;padding:8px 12px;font-weight:600;">
          📸 Generar Reporte
        </button>
      </div>
    </div>

    <!-- Preview (oculto hasta generar) -->
    <div id="exportPreviewContainer" style="display:none;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:10px;">
        <span style="font-size:0.85rem;color:#94a3b8;">Vista previa del reporte:</span>
        <div style="display:flex;gap:8px;">
          <button type="button" onclick="downloadEventReport()" class="btn-primary" style="padding:6px 14px;font-size:0.85rem;background:#1B4D3E;border:1.5px solid #2ECC71;color:#fff;font-weight:600;">
            📥 Descargar
          </button>
          <button type="button" onclick="closeExportPreview()" class="btn-secondary" style="padding:6px 14px;font-size:0.85rem;">
            ✕ Cerrar
          </button>
        </div>
      </div>
      <div style="overflow:auto;max-height:70vh;background:#050816;padding:20px;border-radius:8px;border:1px solid #1E293B;">
        <div id="exportPreviewTarget" style="display:inline-block;"></div>
      </div>
    </div>
  </div>
</div>

<script>
  // Tabs internas de Eventos (Lista / Carga / Export)
  (function() {
    'use strict';
    window.switchEventoTab = function(tab) {
      document.querySelectorAll('#eventosTabsContainer .admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.etab === tab);
      });
      document.querySelectorAll('.evento-panel').forEach(p => p.style.display = 'none');
      const target = document.getElementById('evento-panel-' + tab);
      if (target) target.style.display = 'block';

      // Si cambia a Export, cargar la lista de eventos
      if (tab === 'export' && typeof loadExportEventsList === 'function') {
        loadExportEventsList();
      }
    };
  })();
</script>
`;

// ═══════════════════════════════════════════════════════════════
//  SECCIÓN 4: CATÁLOGO (movido de admin-plane-models.html)
// ═══════════════════════════════════════════════════════════════

// NOTA: este archivo CONTIENE el contenido de admin-plane-models.html
// pero SIN el <div id="adminPlaneModels"> exterior, porque ahora
// el wrapper lo provee #adminSectionContent.

const ADMIN_CATALOG_HTML = `<!-- ═══════════════════════════════════════════════════════════════
     SECCIÓN: CATÁLOGO del Panel Admin
     ─────────────────────────────────────────────────────────────
     Contenido migrado de: components/admin-plane-models.html
     (sin el <div id="adminPlaneModels"> exterior, ahora lo provee
     el contenedor dinámico del panel).

     IMPORTANTE: los IDs de esta sección fueron RENOMBRADOS con prefijo
     'catalog' para evitar colisiones con el antiguo admin-plane-models.html
     que sigue existiendo en paralelo durante F3.
     ─────────────────────────────────────────────────────────────
     Dependencias JS (existentes):
       loadAdminPlaneModels(), filterAdminPlaneModels(), resetCatalogFilters()
       openCreatePlaneModelModal(), openEditPlaneModelModal()
       handleSavePlaneModel(), togglePlaneModelStatus(), viewPlaneModelFullDetails()
     ─────────────────────────────────────────────────────────────
     Fase 3 · v4.7.0 · 2026-10-09
     ═══════════════════════════════════════════════════════════════ -->

<div class="admin-section-header">
  <div>
    <div class="badge-tag">FLEET · CATALOG</div>
    <h2>✈️ Catálogo de Aeronaves</h2>
    <p class="subtitle">Modelos oficiales disponibles en el sistema (CRUD integrado)</p>
  </div>
  <div class="admin-section-actions">
    <button type="button" onclick="loadAdminPlaneModels(true)" class="btn-secondary btn-sm">
      🔄 Actualizar
    </button>
    <button type="button" onclick="openCreatePlaneModelModal()" class="btn-primary btn-sm">
      ➕ Agregar Aeronave
    </button>
  </div>
</div>

<!-- Resumen Métrico Rápido -->
<div class="stats-grid-tactical" style="margin-bottom:1.5rem;">
  <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #3498db;">
    <div class="stat-card-header">
      <span class="stat-label">Total Modelos</span>
      <span style="font-size:1.1rem;">📦</span>
    </div>
    <div class="stat-main">
      <span id="catalogTotalModels" class="stat-number-blue">--</span>
    </div>
  </div>

  <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #2ecc71;">
    <div class="stat-card-header">
      <span class="stat-label">Activos</span>
      <span style="font-size:1.1rem;">🟢</span>
    </div>
    <div class="stat-main">
      <span id="catalogActiveModels" class="stat-number-green">--</span>
    </div>
  </div>

  <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #e74c3c;">
    <div class="stat-card-header">
      <span class="stat-label">Desactivados</span>
      <span style="font-size:1.1rem;">🚫</span>
    </div>
    <div class="stat-main">
      <span id="catalogInactiveModels" class="stat-number-red">--</span>
    </div>
  </div>

  <div class="stat-card-tactical tactical-corners" style="border-left:4px solid #d4af37;">
    <div class="stat-card-header">
      <span class="stat-label">Cazas Tier 4/5</span>
      <span style="font-size:1.1rem;">⭐</span>
    </div>
    <div class="stat-main">
      <span id="catalogHighTierModels" class="stat-number-gold">--</span>
    </div>
  </div>
</div>

<!-- Barra de Búsqueda y Filtros -->
<div class="card tactical-corners" style="margin-bottom:1.5rem;padding:1.2rem;background:rgba(17,24,39,0.9);border:1px solid rgba(212,175,55,0.25);">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;align-items:end;">
    <div style="grid-column:span 2;">
      <label for="catalogSearchInput" style="font-size:0.8rem;color:#cbd5e0;font-family:var(--font-tactical);display:block;margin-bottom:4px;">
        🔍 BUSCAR MODELO O TIPO DE CAZA
      </label>
      <input
        type="text"
        id="catalogSearchInput"
        placeholder="Ej: F-22, Rafale, Sigiloso..."
        oninput="filterAdminPlaneModels()"
        style="background:rgba(10,15,25,0.9);border:1px solid #374151;color:#fff;padding:0.65rem 0.85rem;border-radius:4px;width:100%;font-size:0.9rem;"
      />
    </div>
    <div>
      <label for="catalogTierFilter" style="font-size:0.8rem;color:#cbd5e0;font-family:var(--font-tactical);display:block;margin-bottom:4px;">
        TIER MILITAR
      </label>
      <select
        id="catalogTierFilter"
        onchange="filterAdminPlaneModels()"
        style="background:rgba(10,15,25,0.9);border:1px solid #374151;color:#fff;padding:0.65rem;border-radius:4px;width:100%;font-size:0.9rem;"
      >
        <option value="">Todos los Tiers</option>
        <option value="5">Tier 5 (5ª Gen / Sigilo)</option>
        <option value="4">Tier 4 (4ª Gen++ Pesados)</option>
        <option value="3">Tier 3 (Polivalentes)</option>
        <option value="2">Tier 2 (Especializados)</option>
        <option value="1">Tier 1 (Ligeros Clásicos)</option>
      </select>
    </div>
    <div>
      <label for="catalogStatusFilter" style="font-size:0.8rem;color:#cbd5e0;font-family:var(--font-tactical);display:block;margin-bottom:4px;">
        ESTADO OPERACIONAL
      </label>
      <select
        id="catalogStatusFilter"
        onchange="filterAdminPlaneModels()"
        style="background:rgba(10,15,25,0.9);border:1px solid #374151;color:#fff;padding:0.65rem;border-radius:4px;width:100%;font-size:0.9rem;"
      >
        <option value="">Todos los Estados</option>
        <option value="active" selected>Sólo Activos</option>
        <option value="inactive">Sólo Desactivados</option>
      </select>
    </div>
    <div>
      <button type="button" onclick="resetCatalogFilters()" class="btn-secondary" style="width:100%;padding:0.65rem;">
        Limpiar Filtros
      </button>
    </div>
  </div>
</div>

<!-- Grid de Modelos -->
<div
  id="adminPlaneModelsList"
  style="display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:1.2rem;margin-bottom:2rem;"
>
  <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#a0aec0;">
    <span style="font-size:2rem;display:block;margin-bottom:8px;">⏳</span>
    Cargando catálogo táctico de aeronaves...
  </div>
</div>
`;

// ═══════════════════════════════════════════════════════════════
//  SECCIÓN 5: ESTADO (NUEVA)
// ═══════════════════════════════════════════════════════════════

const ADMIN_STATUS_HTML = `<!-- ═══════════════════════════════════════════════════════════════
     SECCIÓN: ESTADO del Panel Admin (NUEVA en v4.7.0)
     ─────────────────────────────────────────────────────────────
     - Health check de servicios
     - Estado del scheduler
     - Versión del sistema
     - Logs recientes
     - Botón "Forzar tick" (solo OWNER)
     ─────────────────────────────────────────────────────────────
     IDs únicos:
       #adminHealthGrid, #adminSchedulerStatus, #adminDbStatus
       #adminSystemVersion, #adminLogsContainer
       #adminForceTickBtn
     ─────────────────────────────────────────────────────────────
     Dependencias JS (a crear en F5):
       initAdminStatusSection(), renderAdminStatusSection()
     ─────────────────────────────────────────────────────────────
     Fase 3 · v4.7.0 · 2026-10-09
     ═══════════════════════════════════════════════════════════════ -->

<div class="admin-section-header">
  <div>
    <div class="badge-tag">SYSTEM · HEALTH</div>
    <h2>⚙️ Estado del Sistema</h2>
    <p class="subtitle">Scheduler, health-check, versión y logs del servidor</p>
  </div>
  <div class="admin-section-actions">
    <button
      type="button"
      id="adminForceTickBtn"
      onclick="adminForceTick()"
      class="btn-primary btn-sm"
      style="background:#1B4D3E;border-color:#2ECC71;color:#2ECC71;"
    >
      ⚡ Forzar Tick (OWNER)
    </button>
    <button
      type="button"
      onclick="renderAdminStatusSection && renderAdminStatusSection()"
      class="btn-secondary btn-sm"
    >
      🔄 Actualizar
    </button>
  </div>
</div>

<!-- Health Grid -->
<div class="health-grid" id="adminHealthGrid">
  <div class="health-item">
    <div class="health-label">Scheduler</div>
    <div class="health-value" id="adminSchedulerStatus">
      <span style="width:10px;height:10px;background:#10B981;border-radius:50%;box-shadow:0 0 8px #10B981;display:inline-block;"></span>
      🟢 ONLINE
    </div>
  </div>

  <div class="health-item">
    <div class="health-label">Último Tick</div>
    <div class="health-value" id="adminLastTick" style="font-family:var(--font-mono);font-size:1rem;">
      — / — / — · —:—:—
    </div>
  </div>

  <div class="health-item">
    <div class="health-label">Base de Datos</div>
    <div class="health-value" id="adminDbStatus">
      <span style="width:10px;height:10px;background:#10B981;border-radius:50%;box-shadow:0 0 8px #10B981;display:inline-block;"></span>
      🟢 CONNECTED
    </div>
  </div>

  <div class="health-item">
    <div class="health-label">Versión del Sistema</div>
    <div class="health-value" id="adminSystemVersion" style="font-family:var(--font-mono);font-size:1rem;color:var(--pry-gold);">
      v4.7.0
    </div>
  </div>

  <div class="health-item">
    <div class="health-label">Uptime</div>
    <div class="health-value" id="adminUptime" style="font-family:var(--font-mono);font-size:1rem;">
      — h
    </div>
  </div>

  <div class="health-item">
    <div class="health-label">Latencia DB</div>
    <div class="health-value" id="adminDbLatency" style="font-family:var(--font-mono);font-size:1rem;">
      — ms
    </div>
  </div>
</div>

<!-- Logs Recientes -->
<div class="card tactical-corners">
  <div class="card-header">
    <h3 style="margin:0;">📜 Logs Recientes</h3>
    <span class="badge-tag">SYSTEM LOGS</span>
  </div>
  <div
    id="adminLogsContainer"
    style="
      background:rgba(5,8,22,0.7);
      border:1px solid rgba(100,116,139,0.3);
      border-radius:6px;
      padding:12px;
      font-family:var(--font-mono);
      font-size:0.78rem;
      color:#94a3b8;
      line-height:1.7;
      max-height:320px;
      overflow-y:auto;
    "
  >
    <div><span style="color:#64748b;">—:—:—</span> <span style="color:#10B981;">[INFO]</span> Esperando conexión con el servidor...</div>
  </div>
</div>

<script>
  // ═══════════════════════════════════════════════════════════════
  // STUB de la sección Estado (se reemplaza en F5)
  // ═══════════════════════════════════════════════════════════════
  (function() {
    'use strict';

    // Forzar tick del scheduler (STUB — solo UI)
    window.adminForceTick = function() {
      console.log('[Admin Status] Forzar tick solicitado (STUB F3)');
      if (typeof showToast === 'function') {
        showToast('⚡ Tick forzado (stub — F5 conectará al backend)', 'info');
      }
      // Escribir en el log visual
      const container = document.getElementById('adminLogsContainer');
      if (container) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const ts = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
        const div = document.createElement('div');
        div.innerHTML = '<span style="color:#64748b;">' + ts + '</span> <span style="color:#D4AF37;">[TICK]</span> Tick manual solicitado por OWNER (stub F3)';
        container.insertBefore(div, container.firstChild);
      }
    };

    // Render del estado (STUB — solo actualiza la hora actual)
    window.renderAdminStatusSection = function() {
      console.log('[Admin Status] Render (STUB F3)');
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');

      const tickEl = document.getElementById('adminLastTick');
      if (tickEl) {
        tickEl.textContent =
          pad(now.getDate()) + '/' + pad(now.getMonth() + 1) + '/' + now.getFullYear() +
          ' · ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
      }

      const uptimeEl = document.getElementById('adminUptime');
      if (uptimeEl) uptimeEl.textContent = Math.floor(performance.now() / 3600000) + ' h';

      const latencyEl = document.getElementById('adminDbLatency');
      if (latencyEl) latencyEl.textContent = '— ms (F5 conectará)';
    };

    // Init al cargar la sección (llamado por el switchAdminSection en F5)
    window.initAdminStatusSection = function() {
      console.log('[Admin Status] Init (STUB F3)');
      window.renderAdminStatusSection();
    };
  })();
</script>
`;

// ═══════════════════════════════════════════════════════════════
//  PASO 1 — Crear la carpeta admin-sections/
// ═══════════════════════════════════════════════════════════════

function paso1_crearCarpeta() {
  title('PASO 1 — Crear carpeta components/admin-sections/');

  if (fs.existsSync(DIR_SECTIONS)) {
    warn('La carpeta ya existía: components/admin-sections/');
  } else {
    fs.mkdirSync(DIR_SECTIONS, { recursive: true });
    ok('Carpeta creada: components/admin-sections/');
  }
}

// ═══════════════════════════════════════════════════════════════
//  PASO 2 — Escribir las 5 secciones
// ═══════════════════════════════════════════════════════════════

function paso2_escribirSecciones() {
  title('PASO 2 — Escribir las 5 secciones');

  escribirSeccion('admin-summary.html', ADMIN_SUMMARY_HTML);
  escribirSeccion('admin-members.html', ADMIN_MEMBERS_HTML);
  escribirSeccion('admin-events.html',  ADMIN_EVENTS_HTML);
  escribirSeccion('admin-catalog.html', ADMIN_CATALOG_HTML);
  escribirSeccion('admin-status.html',  ADMIN_STATUS_HTML);
}

// ═══════════════════════════════════════════════════════════════
//  PASO 3 — Backup de admin-plane-models.html
// ═══════════════════════════════════════════════════════════════

function paso3_backupAdminPlaneModels() {
  title('PASO 3 — Backup de admin-plane-models.html');

  if (!fs.existsSync(FILE_ADMIN_PLANE_MODELS)) {
    warn('admin-plane-models.html no existe (skip)');
    return { skipped: true };
  }

  if (fs.existsSync(FILE_ADMIN_PLANE_MODELS_BAK)) {
    warn('Backup ya existía: admin-plane-models.html.bak-f3 (no se toca)');
    return { skipped: true };
  }

  const content = fs.readFileSync(FILE_ADMIN_PLANE_MODELS, 'utf8');
  fs.writeFileSync(FILE_ADMIN_PLANE_MODELS_BAK, content, 'utf8');
  ok(`Backup creado: admin-plane-models.html.bak-f3 (${content.length} bytes)`);
  return { skipped: false };
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════

function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🚀 FASE 3 — Crear las 5 Secciones del Panel Admin');
  console.log('═══════════════════════════════════════════════════════');

  paso1_crearCarpeta();
  paso2_escribirSecciones();
  const r3 = paso3_backupAdminPlaneModels();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ FASE 3 — Completada');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Archivos creados en components/admin-sections/:');
  console.log('     admin-summary.html   → KPIs + distribución + accesos');
  console.log('     admin-members.html   → Tabla + filtros + alta');
  console.log('     admin-events.html    → Eventos + carga + export');
  console.log('     admin-catalog.html   → CRUD de aeronaves');
  console.log('     admin-status.html    → Health + scheduler + logs');
  console.log('');
  if (!r3.skipped) {
    console.log('  Backup creado:');
    console.log('     components/admin-plane-models.html.bak-f3');
  }
  console.log('');
  console.log('  🌐 Próximo paso:');
  console.log('     F4 — CSS del layout (admin-layout.css)');
  console.log('');
  console.log('  🔙 Rollback:');
  console.log('     rmdir /S /Q components\\admin-sections');
  console.log('     copy components\\admin-plane-models.html.bak-f3 components\\admin-plane-models.html');
  console.log('═══════════════════════════════════════════════════════\n');
}

main();