/**
 * PARAGUAY-FFAA | METALSTORM - Módulo de Rendimiento
 * Maneja el registro de tokens, días conectados, y estado de combate
 * Actualizado: 01/09/2026
 */

// ============================================================
// VARIABLES GLOBALES (reutiliza window.currentEvent y window.currentUser)
// ============================================================

let selectedDays = 0;
let isAdminMode = false;
let targetUserId = null;

// ============================================================
// HELPERS DE FECHA Y EVENTO
// ============================================================

/**
 * Calcula el número de semana ISO del año
 */
function getWeekNumber(date) {
    if (!date) return '01';
    const d = new Date(date);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const diff = (d - startOfYear + (startOfYear.getTimezoneOffset() - d.getTimezoneOffset()) * 60000) / 86400000;
    return String(Math.ceil((diff + startOfYear.getDay() + 1) / 7)).padStart(2, '0');
}

/**
 * Formatea el título del evento como: 2026-05 · SEM 19 - SQ
 */
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

// ============================================================
// INICIALIZACIÓN
// ============================================================

/**
 * Inicializa el módulo de rendimiento
 * Se llama cuando se carga la vista
 */
async function initPerformanceForm() {
    try {
        // Obtener usuario actual
        window.currentUser = await getCurrentUser();
        if (!window.currentUser) {
            console.warn('⚠️ No hay usuario logueado');
            showToast('⚠️ Debes iniciar sesión para registrar rendimiento', 'warning');
            return;
        }

        const perfUserName = document.getElementById('perfUserName');
        if (perfUserName) {
            perfUserName.textContent = window.currentUser.nick || window.currentUser.email || 'Piloto';
        }

        // Cargar evento actual
        await loadCurrentEvent();

        // Cargar lista de pilotos (si es Admin/Owner)
        await loadAdminPilotList();

        // Configurar selector de días y límites
        await updateEventLimits();

        // Configurar escuchadores para inputs de tokens con redondeo a múltiplos de 5
        setupTokensInput();

        // Resetear formulario a estado inicial con "Voló en grupo" marcado por defecto
        resetPerformanceForm();

        console.log('✅ [Performance] Módulo inicializado correctamente');

    } catch (err) {
        console.error('❌ Error inicializando formulario de rendimiento:', err);
        showToast('Error cargando formulario', 'error');
    }
}

// ============================================================
// CARGA DE DATOS
// ============================================================

/**
 * Carga el evento activo actual y actualiza el título formateado
 */
async function loadCurrentEvent() {
    try {
        const res = await fetch('/api/events/open', {
            headers: getAuthHeaders()
        });

        let data = null;
        if (res.ok) {
            data = await res.json();
        } else {
            const fallbackRes = await fetch('/api/events', { headers: getAuthHeaders() });
            if (fallbackRes.ok) data = await fallbackRes.json();
        }

        if (data && (data.event || (data.events && data.events[0]))) {
            window.currentEvent = data.event || data.events[0];
            const inWindow = typeof data.inWindow === 'boolean' ? data.inWindow : true;
            const windowCloseMs = typeof data.windowCloseMs === 'number' ? data.windowCloseMs : 86400000;

            if (typeof window.displayEventInfo === 'function') {
                window.displayEventInfo(window.currentEvent, inWindow, windowCloseMs);
            }
        }

        // Adaptar formulario según tipo de evento
        adaptFormToEventType(window.currentEvent?.type);

    } catch (err) {
        console.error('Error cargando evento:', err);
    }
}

/**
 * Carga la lista de pilotos desde Supabase para el selector de Admin/Owner
 * Filtra SOLO activos y elimina emojis/estrellitas de rango
 */
async function loadAdminPilotList() {
    const pilotSelect = document.getElementById('performanceTarget') || document.getElementById('targetPilotSelect');
    const adminSelectorContainer = document.getElementById('performanceTargetGroup') || document.getElementById('adminPilotSelectorContainer');

    if (!pilotSelect) return;

    // Verificar si el usuario tiene permisos
    const userRole = (window.currentUser?.role || '').toUpperCase();
    const hasAdminAccess = ['OWNER', 'ADMIN'].includes(userRole);

    if (!hasAdminAccess) {
        if (adminSelectorContainer) adminSelectorContainer.style.display = 'none';
        return;
    }

    if (adminSelectorContainer) adminSelectorContainer.style.display = 'block';

    try {
        // Obtener miembros desde backend (conectado a Supabase)
        let members = [];
        const res = await fetch('/api/admin/members', {
            headers: getAuthHeaders()
        });

        if (res.ok) {
            const data = await res.json();
            members = data.members || data.users || [];
        } else {
            // Fallback a /api/events/active-members
            const resFallback = await fetch('/api/events/active-members', {
                headers: getAuthHeaders()
            });
            if (resFallback.ok) {
                const dataFallback = await resFallback.json();
                members = dataFallback.members || dataFallback.activeMembers || [];
            }
        }

        if (!members || members.length === 0) {
            console.warn('⚠️ No se encontraron miembros en la base de datos');
            return;
        }

        // ✅ SOLO activos
        const activeMembers = members
            .filter(m => {
                const status = (m.status || '').toUpperCase();
                if (status === 'INACTIVE' || status === 'INACTIVO') {
                    return false;
                }
                return status === 'ACTIVE' || status === 'ACTIVO' || !status;
            })
            .sort((a, b) => (a.nick || a.email || '').localeCompare(b.nick || b.email || ''));

        // Limpiar opciones anteriores
        pilotSelect.innerHTML = '<option value="self">— Mi propio rendimiento —</option>';

        // ✅ SIN emojis: todos los pilotos son iguales, solo indicando (Tú) si es el usuario actual
        const currentUserId = window.currentUser?.user_id || window.currentUser?.id;

        activeMembers.forEach(pilot => {
            const uid = pilot.user_id || pilot.id;
            const isCurrentUser = (uid === currentUserId || (pilot.email && pilot.email?.toLowerCase() === window.currentUser?.email?.toLowerCase()));

            const option = document.createElement('option');
            option.value = uid;
            option.textContent = `${pilot.nick || pilot.email || 'Sin Nick'} ${isCurrentUser ? '(Tú)' : ''}`.trim();
            pilotSelect.appendChild(option);
        });

        console.log(`✅ [Performance] ${activeMembers.length} pilotos activos cargados en el selector (sin emojis)`);

    } catch (err) {
        console.error('Error cargando lista de pilotos:', err);
    }
}

// ============================================================
// CÁLCULO AUTOMÁTICO DE DÍAS Y ESTADO
// ============================================================

/**
 * Calcula automáticamente los días según tokens:
 * 0 tokens: 0 días (o 1 día si > 0)
 * 1 - 50 tokens: 1 día
 * 55 - 100 tokens: 2 días
 * 105 - 150 tokens: 3 días
 * 155 - 200 tokens: 4 días
 * > 200 tokens (BM): 5 días
 */
function autoCalculateDays(tokens) {
    const raw = parseInt(tokens, 10);
    if (isNaN(raw) || raw <= 0) {
        return 0;
    }
    const rounded = Math.round(raw / 5) * 5;

    // Calcular días según tokens
    if (rounded <= 50) return 1;
    if (rounded <= 100) return 2;
    if (rounded <= 150) return 3;
    if (rounded <= 200) return 4;
    return 5;
}

/**
 * Configura el input de tokens para auto-calcular y redondear a múltiplos de 5
 */
function setupTokensInput() {
    const tokensInput = document.getElementById('tokens') || document.getElementById('tokensInput');
    if (!tokensInput) return;

    // ✅ En input: calcular días inmediatamente y aplicar clase .active en botones
    const handleInput = function() {
        if (this.value === '' || isNaN(parseInt(this.value, 10))) {
            selectDays(0);
            updateCalculatedStatus();
            return;
        }
        const raw = parseInt(this.value, 10) || 0;
        const days = autoCalculateDays(raw);
        selectDays(days);
        updateCalculatedStatus();
    };

    tokensInput.oninput = handleInput;
    tokensInput.addEventListener('input', handleInput);

    // ✅ En change: redondear al múltiplo de 5 (para stepper y Enter)
    const handleChange = function() {
        if (this.value === '') {
            selectDays(0);
            updateCalculatedStatus();
            return;
        }
        const raw = parseInt(this.value, 10) || 0;
        const isBM = window.currentEvent?.type === 'BLACK_MARKET' || window.currentEvent?.type === 'BM';
        const maxVal = isBM ? 250 : 200;
        const rounded = Math.round(raw / 5) * 5;
        const clamped = Math.min(Math.max(rounded, 0), maxVal);
        this.value = clamped;
        const days = autoCalculateDays(clamped);
        selectDays(days);
        updateCalculatedStatus();
    };

    tokensInput.onchange = handleChange;
    tokensInput.addEventListener('change', handleChange);

    // ✅ En blur: redondear al múltiplo de 5 cuando el usuario termina de escribir
    tokensInput.onblur = handleChange;
    tokensInput.addEventListener('blur', handleChange);
}

/**
 * Selecciona la cantidad de días conectados con resaltado visual (.active)
 */
function selectDays(days) {
    selectedDays = Number(days) || 0;

    // Actualizar botones visualmente agregando o quitando clase 'active'
    const dayButtons = document.querySelectorAll('#daysSelectorGroup .day-btn, .day-btn');
    dayButtons.forEach(btn => {
        const btnDay = parseInt(btn.dataset.day || btn.dataset.days || btn.textContent.trim(), 10);
        if (btnDay === selectedDays) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Actualizar campo oculto
    const daysInput = document.getElementById('daysConnected') || document.getElementById('daysConnectedInput');
    if (daysInput) daysInput.value = selectedDays;

    // Recalcular estado proyectado
    updateCalculatedStatus();
}

/**
 * Limita y redondea el valor de tokens según el tipo de evento
 */
function clampTokens(input) {
    if (!input) return;
    const isBM = window.currentEvent?.type === 'BLACK_MARKET' || window.currentEvent?.type === 'BM';
    const maxVal = isBM ? 250 : 200;

    if (input.value === '') {
        selectDays(0);
        updateCalculatedStatus();
        return;
    }

    let value = parseInt(input.value, 10);
    if (isNaN(value)) {
        selectDays(0);
        updateCalculatedStatus();
        return;
    }
    const rounded = Math.round(value / 5) * 5;
    const clamped = Math.min(Math.max(rounded, 0), maxVal);
    input.value = clamped;

    const days = autoCalculateDays(clamped);
    selectDays(days);
    updateCalculatedStatus();
}

/**
 * Adapta el formulario según el tipo de evento
 */
function adaptFormToEventType(eventType) {
    const isBM = eventType === 'BLACK_MARKET' || eventType === 'BM';
    const maxTok = isBM ? 250 : 200;

    const tokHint = document.getElementById('tokensHint');
    if (tokHint) tokHint.textContent = `0 – ${maxTok}`;

    const tokInput = document.getElementById('tokens') || document.getElementById('tokensInput');
    if (tokInput) {
        tokInput.max = maxTok;
        tokInput.placeholder = isBM ? 'Ej: 220' : 'Ej: 185';
    }

    const daysHint = document.getElementById('daysHint');
    if (daysHint) {
        daysHint.textContent = isBM ? '0 – 5 (BM)' : '0 – 4';
    }

    const btn5 = document.querySelector('.day-btn-bm');
    if (btn5) btn5.style.display = isBM ? '' : 'none';
}

/**
 * Actualiza límites de eventos
 */
async function updateEventLimits() {
    adaptFormToEventType(window.currentEvent?.type);
}

/**
 * Maneja el cambio de piloto seleccionado (Admin/Owner)
 */
function onTargetPilotChange() {
    const select = document.getElementById('performanceTarget') || document.getElementById('targetPilotSelect');
    if (!select) return;

    const val = select.value;
    isAdminMode = val && val !== 'self' && val !== '';
    targetUserId = isAdminMode ? parseInt(val, 10) : null;

    const banner = document.getElementById('targetOverrideBanner') || document.getElementById('adminPilotWarning');
    const userNameEl = document.getElementById('perfUserName');
    const noteAdm = document.getElementById('policyNoteAdmin');
    const noteNrm = document.getElementById('policyNoteNormal');
    const notesHintAdm = document.getElementById('notesHintAdmin');
    const notesHintNrm = document.getElementById('notesHintNormal');
    const saveBtn = document.getElementById('btnSavePerf') || document.getElementById('savePerformanceBtn');

    const selectedText = select.options[select.selectedIndex]?.text || '';

    if (isAdminMode) {
        if (banner) {
            banner.style.display = 'flex';
            if (banner.querySelector('#perfUserName')) {
                banner.querySelector('#perfUserName').textContent = selectedText;
            }
        }
        if (userNameEl) userNameEl.textContent = selectedText;
        if (noteAdm) noteAdm.style.display = 'block';
        if (noteNrm) noteNrm.style.display = 'none';
        if (notesHintAdm) notesHintAdm.style.display = 'inline';
        if (notesHintNrm) notesHintNrm.style.display = 'none';
        if (saveBtn) saveBtn.textContent = `💾 Registrar para ${selectedText.split(' ')[0]}`;
    } else {
        if (banner) banner.style.display = 'none';
        if (userNameEl) userNameEl.textContent = window.currentUser?.nick || window.currentUser?.email || '—';
        if (noteAdm) noteAdm.style.display = 'none';
        if (noteNrm) noteNrm.style.display = 'block';
        if (notesHintAdm) notesHintAdm.style.display = 'none';
        if (notesHintNrm) notesHintNrm.style.display = 'inline';
        if (saveBtn) saveBtn.textContent = '💾 Guardar Rendimiento';
    }
}

/**
 * Calcula y actualiza el estado proyectado:
 * VERDE: ≥ 175 tokens && ≥ 4 días
 * NARANJA: 130 - 174 tokens && ≥ 3 días
 * ROJO: 100 - 129 tokens && ≥ 2 días
 * NEGRO: < 100 tokens || < 2 días
 */
function updateCalculatedStatus() {
    const tokensInput = document.getElementById('tokens') || document.getElementById('tokensInput');
    const daysInput = document.getElementById('daysConnected') || document.getElementById('daysConnectedInput');
    
    const tokens = parseInt(tokensInput?.value, 10) || 0;
    const days = parseInt(daysInput?.value, 10) || selectedDays || 0;

    let status = '-';
    let statusClass = 'status-pendiente';

    if (tokens === 0 && days === 0) {
        status = '-';
        statusClass = 'status-pendiente';
    } else if (tokens >= 175 && days >= 4) {
        status = 'VERDE';
        statusClass = 'status-verde';
    } else if (tokens >= 130 && days >= 3) {
        status = 'NARANJA';
        statusClass = 'status-naranja';
    } else if (tokens >= 100 && days >= 2) {
        status = 'ROJO';
        statusClass = 'status-rojo';
    } else {
        status = 'NEGRO';
        statusClass = 'status-negro';
    }

    const badgeContainer = document.getElementById('calculatedStatus') || document.getElementById('estimatedStatusBadge');
    if (badgeContainer) {
        badgeContainer.innerHTML = `<span class="status-badge ${statusClass}">${status}</span>`;
    }
}

// ============================================================
// GUARDAR RENDIMIENTO
// ============================================================

/**
 * Guarda el rendimiento en la API
 */
async function savePerformance() {
    const submitBtn = document.getElementById('btnSavePerf') || document.getElementById('savePerformanceBtn');

    try {
        const tokensInput = document.getElementById('tokens') || document.getElementById('tokensInput');
        const notesInput = document.getElementById('notes') || document.getElementById('performanceNotes');
        const groupCheckbox = document.getElementById('flewInGroup') || document.getElementById('flewInGroupCheckbox');
        const daysInput = document.getElementById('daysConnected') || document.getElementById('daysConnectedInput');

        const tokens = parseInt(tokensInput?.value, 10);
        const days = parseInt(daysInput?.value, 10) || selectedDays || 0;
        const flewInGroup = groupCheckbox?.checked ?? true;
        const notes = notesInput?.value?.trim() || '';

        // Validaciones normativas
        if (isNaN(tokens) || tokens < 0) {
            showToast('⚠️ Ingresa una cantidad válida de tokens', 'warning');
            return;
        }

        if (days === 0 && tokens > 0) {
            showToast('⚠️ Selecciona cuántos días te conectaste', 'warning');
            return;
        }

        if (!flewInGroup) {
            showToast('❌ Es obligatorio volar en grupo con miembros del escuadrón', 'warning');
            return;
        }

        const payload = {
            event_id: window.currentEvent?.id || '2026-05-SQ',
            tokens: tokens,
            days_connected: days,
            flew_in_group: flewInGroup,
            notes: notes || null
        };

        if (isAdminMode && targetUserId) {
            payload.user_id = targetUserId;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Guardando...';
        }

        const res = await fetch('/api/performances', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || data.message || 'Error al guardar rendimiento');
        }

        showToast('✅ Rendimiento registrado correctamente', 'success');

        // Limpiar formulario y restablecer "Voló en grupo" por defecto
        resetPerformanceForm();

        // Redirigir al dashboard
        setTimeout(() => {
            if (typeof window.showView === 'function') {
                window.showView('appView');
            }
        }, 1200);

    } catch (err) {
        console.error('Error guardando rendimiento:', err);
        showToast(`❌ ${err.message}`, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '💾 Guardar Rendimiento';
        }
    }
}

/**
 * Limpia el formulario y asegura valores por defecto normativos
 */
function resetPerformanceForm() {
    const tokensInput = document.getElementById('tokens') || document.getElementById('tokensInput');
    const notesInput = document.getElementById('notes') || document.getElementById('performanceNotes');
    const groupCheckbox = document.getElementById('flewInGroup') || document.getElementById('flewInGroupCheckbox');
    const pilotSelect = document.getElementById('performanceTarget') || document.getElementById('targetPilotSelect');
    const daysInput = document.getElementById('daysConnected') || document.getElementById('daysConnectedInput');

    if (tokensInput) tokensInput.value = '';
    if (notesInput) notesInput.value = '';
    if (groupCheckbox) groupCheckbox.checked = true; // ✅ Marcado por defecto
    if (daysInput) daysInput.value = '0';

    if (pilotSelect) pilotSelect.value = 'self';

    selectDays(0);
    onTargetPilotChange();
    updateCalculatedStatus();
}

// ============================================================
// HELPERS GENERALES
// ============================================================

function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

async function getCurrentUser() {
    if (window.currentUser) return window.currentUser;

    const stored = localStorage.getItem('user') || localStorage.getItem('currentUser');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {}
    }

    return new Promise((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (window.currentUser) {
                clearInterval(interval);
                resolve(window.currentUser);
            } else if (attempts > 20) {
                clearInterval(interval);
                resolve(null);
            }
        }, 50);
    });
}

// showToast ya está definida en views.js y exportada a window
// Se utiliza window.showToast(message, type) o el showToast global directamente sin crear recursión

// ============================================================
// ✅ EXPORTACIÓN GLOBAL EN WINDOW
// ============================================================

window.initPerformanceForm = initPerformanceForm;
window.loadCurrentEvent = loadCurrentEvent;
window.loadAdminPilotList = loadAdminPilotList;
window.autoCalculateDays = autoCalculateDays;
window.setupTokensInput = setupTokensInput;
window.selectDays = selectDays;
window.clampTokens = clampTokens;
window.updateCalculatedStatus = updateCalculatedStatus;
window.onTargetPilotChange = onTargetPilotChange;
window.savePerformance = savePerformance;
window.resetPerformanceForm = resetPerformanceForm;
window.formatEventTitle = formatEventTitle;
window.getWeekNumber = getWeekNumber;

console.log('✅ [Performance] Funciones de rendimiento exportadas globalmente en window');
