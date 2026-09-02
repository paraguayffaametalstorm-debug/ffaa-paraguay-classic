/**
 * PARAGUAY-FFAA | METALSTORM - Módulo de Rendimiento
 * Maneja el registro de tokens, días conectados, y estado de combate
 * Actualizado: 01/09/2026
 */

// ============================================================
// VARIABLES GLOBALES
// ============================================================

let currentEvent = null;
let currentUser = null;
let selectedDays = 0;
let isAdminMode = false;
let targetUserId = null;

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
        currentUser = await getCurrentUser();
        if (!currentUser) {
            console.warn('⚠️ No hay usuario logueado');
            showToast('⚠️ Debes iniciar sesión para registrar rendimiento', 'warning');
            return;
        }

        // Cargar evento actual
        await loadCurrentEvent();

        // Cargar lista de pilotos (si es Admin/Owner)
        await loadAdminPilotList();

        // Configurar límites según tipo de evento
        await updateEventLimits();

        // Calcular estado inicial
        updateCalculatedStatus();

        // Limpiar campos
        resetPerformanceForm();

        console.log('✅ [Performance] Módulo inicializado correctamente');

    } catch (error) {
        console.error('❌ Error inicializando performance:', error);
        showToast('Error al cargar el formulario de rendimiento', 'error');
    }
}

// ============================================================
// CARGA DE DATOS
// ============================================================

/**
 * Carga el evento actual
 */
async function loadCurrentEvent() {
    try {
        const res = await api.get('/api/events/current');
        
        if (res.success && res.event) {
            currentEvent = res.event;
            
            // Mostrar información del evento
            const eventInfo = document.getElementById('eventInfo');
            if (eventInfo) {
                const isBM = currentEvent.type === 'BLACK_MARKET';
                const typeLabel = isBM ? '⚫ Black Market' : '🟦 Squadrón';
                const week = getWeekNumber(currentEvent.start_date);
                const year = currentEvent.start_date ? new Date(currentEvent.start_date).getFullYear() : '2026';
                const month = currentEvent.start_date ? String(new Date(currentEvent.start_date).getMonth() + 1).padStart(2, '0') : '00';
                
                eventInfo.innerHTML = `
                    <div class="card" style="background: rgba(255,255,255,0.03); border-left: 4px solid ${isBM ? '#e74c3c' : '#d4af37'};">
                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                            <div>
                                <span style="font-size: 0.8rem; color: var(--steel-gray);">EVENTO ACTIVO</span>
                                <div style="font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 1.1rem; color: var(--white-tactical);">
                                    ${year}-${month} · SEM ${week} - ${isBM ? 'BM' : 'SQ'}
                                </div>
                            </div>
                            <span style="padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; background: ${isBM ? 'rgba(231,76,60,0.2)' : 'rgba(212,175,55,0.2)'}; color: ${isBM ? '#e74c3c' : '#d4af37'};">
                                ${typeLabel}
                            </span>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--steel-gray); margin-top: 4px;">
                            ${currentEvent.start_date ? `Inicio: ${new Date(currentEvent.start_date).toLocaleDateString()}` : ''}
                            ${currentEvent.end_date ? ` · Fin: ${new Date(currentEvent.end_date).toLocaleDateString()}` : ''}
                        </div>
                    </div>
                `;
            }
        } else {
            const eventInfo = document.getElementById('eventInfo');
            if (eventInfo) {
                eventInfo.innerHTML = `
                    <div class="card" style="background: rgba(255,255,255,0.03); border-left: 4px solid var(--amber-alert);">
                        <span style="color: var(--amber-alert);">⚠️ No hay evento activo en este momento</span>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Error cargando evento:', error);
        showToast('❌ Error al cargar el evento actual', 'error');
    }
}

/**
 * Carga la lista de pilotos para Admin/Owner
 */
async function loadAdminPilotList() {
    try {
        // Verificar si es Admin/Owner
        if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'OWNER')) {
            return;
        }

        const targetGroup = document.getElementById('performanceTargetGroup');
        if (targetGroup) targetGroup.style.display = 'block';

        const select = document.getElementById('performanceTarget');
        if (!select) return;

        // Cargar miembros
        const res = await api.get('/api/admin/members');
        if (!res.success || !res.members) return;

        select.innerHTML = '<option value="self">— Mi propio rendimiento —</option>';
        
        res.members.forEach(pilot => {
            const opt = document.createElement('option');
            opt.value = pilot.user_id || pilot.id;
            opt.textContent = `${pilot.nick} (${pilot.role})`;
            select.appendChild(opt);
        });

    } catch (error) {
        console.error('Error cargando pilotos:', error);
        showToast('❌ Error al cargar lista de pilotos', 'error');
    }
}

/**
 * Actualiza límites según tipo de evento
 */
async function updateEventLimits() {
    const isBM = currentEvent?.type === 'BLACK_MARKET';
    const maxTokens = isBM ? 250 : 200;
    const maxDays = isBM ? 5 : 4;

    const tokensInput = document.getElementById('tokens');
    const tokensHint = document.getElementById('tokensHint');
    const daysHint = document.getElementById('daysHint');
    const bmBtn = document.querySelector('.day-btn-bm');

    if (tokensInput) {
        tokensInput.max = maxTokens;
        tokensInput.placeholder = `Ej: ${isBM ? 230 : 185}`;
    }
    if (tokensHint) tokensHint.textContent = `0 – ${maxTokens}`;
    if (daysHint) daysHint.textContent = `0 – ${maxDays}`;
    if (bmBtn) {
        bmBtn.style.display = isBM ? 'inline-block' : 'none';
        if (isBM) bmBtn.textContent = '5 días (BM)';
    }
}

// ============================================================
// SELECCIÓN DE DÍAS
// ============================================================

/**
 * Selecciona los días conectados
 */
window.selectDays = function(days) {
    const maxDays = currentEvent?.type === 'BLACK_MARKET' ? 5 : 4;
    if (days > maxDays) {
        showToast(`⚠️ Máximo ${maxDays} días para este evento`, 'warning');
        return;
    }

    selectedDays = days;
    document.getElementById('daysConnected').value = days;

    // Actualizar botones
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.day) === days);
    });

    // Actualizar estado
    updateCalculatedStatus();
}

/**
 * Clamp de tokens
 */
window.clampTokens = function(input) {
    const max = parseInt(input.max) || 200;
    if (parseInt(input.value) > max) {
        input.value = max;
        showToast(`⚠️ Máximo ${max} tokens para este evento`, 'warning');
    }
    updateCalculatedStatus();
}

/**
 * Cambio de piloto seleccionado (Admin/Owner)
 */
window.onTargetPilotChange = function() {
    const select = document.getElementById('performanceTarget');
    if (!select) return;

    const value = select.value;
    isAdminMode = value !== 'self';
    targetUserId = isAdminMode ? parseInt(value) : null;

    // Mostrar banner
    const banner = document.getElementById('targetOverrideBanner');
    const userName = document.getElementById('perfUserName');
    const notesHintAdmin = document.getElementById('notesHintAdmin');
    const notesHintNormal = document.getElementById('notesHintNormal');
    const policyNoteAdmin = document.getElementById('policyNoteAdmin');
    const policyNoteNormal = document.getElementById('policyNoteNormal');

    if (isAdminMode) {
        const selectedOption = select.options[select.selectedIndex];
        const pilotName = selectedOption ? selectedOption.text : 'Piloto';
        if (banner) banner.style.display = 'flex';
        if (userName) userName.textContent = pilotName;
        if (notesHintAdmin) notesHintAdmin.style.display = 'inline';
        if (notesHintNormal) notesHintNormal.style.display = 'none';
        if (policyNoteAdmin) policyNoteAdmin.style.display = 'block';
        if (policyNoteNormal) policyNoteNormal.style.display = 'none';
    } else {
        if (banner) banner.style.display = 'none';
        if (notesHintAdmin) notesHintAdmin.style.display = 'none';
        if (notesHintNormal) notesHintNormal.style.display = 'inline';
        if (policyNoteAdmin) policyNoteAdmin.style.display = 'none';
        if (policyNoteNormal) policyNoteNormal.style.display = 'block';
    }
}

// ============================================================
// CÁLCULO DE ESTADO
// ============================================================

/**
 * Actualiza el estado calculado en tiempo real
 */
function updateCalculatedStatus() {
    const tokensInput = document.getElementById('tokens');
    const daysConnected = document.getElementById('daysConnected');
    const statusEl = document.getElementById('calculatedStatus');
    
    if (!tokensInput || !statusEl) return;

    const tokens = parseInt(tokensInput.value) || 0;
    const days = parseInt(daysConnected?.value) || 0;

    // Determinar estado
    let status = '';
    let statusClass = '';

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

    // Actualizar HTML
    statusEl.innerHTML = `<span class="status-badge ${statusClass}">${status}</span>`;
}

/**
 * Calcula el número de semana
 */
function getWeekNumber(date) {
    if (!date) return 'XX';
    const d = new Date(date);
    const startOfYear = new Date(d.getFullYear(), 0, 1);
    const diff = (d - startOfYear + (startOfYear.getTimezoneOffset() - d.getTimezoneOffset()) * 60000) / 86400000;
    return String(Math.ceil((diff + startOfYear.getDay() + 1) / 7)).padStart(2, '0');
}

// ============================================================
// GUARDAR RENDIMIENTO
// ============================================================

/**
 * Guarda el rendimiento (normal o admin)
 */
window.savePerformance = async function() {
    const saveBtn = document.getElementById('btnSavePerf');
    
    try {
        // Validar evento
        if (!currentEvent) {
            throw new Error('No hay evento activo');
        }

        // Obtener valores
        const tokensInput = document.getElementById('tokens');
        const notesInput = document.getElementById('notes');
        const flewInGroupInput = document.getElementById('flewInGroup');
        const daysConnected = document.getElementById('daysConnected');

        const tokens = parseInt(tokensInput?.value) || 0;
        const notes = notesInput?.value?.trim() || '';
        const flewInGroup = flewInGroupInput?.checked || false;
        const days = parseInt(daysConnected?.value) || 0;

        // Validaciones
        const maxTokens = currentEvent.type === 'BLACK_MARKET' ? 250 : 200;
        const maxDays = currentEvent.type === 'BLACK_MARKET' ? 5 : 4;

        if (tokens < 0 || tokens > maxTokens) {
            throw new Error(`Tokens deben estar entre 0 y ${maxTokens}`);
        }

        if (days < 0 || days > maxDays) {
            throw new Error(`Días conectados deben estar entre 0 y ${maxDays}`);
        }

        if (!flewInGroup) {
            throw new Error('❌ Es obligatorio volar en grupo con miembros del escuadrón');
        }

        // Preparar datos
        const data = {
            event_id: currentEvent.id,
            tokens,
            days_connected: days,
            flew_in_group: flewInGroup,
            notes: notes || null
        };

        // Si es Admin y seleccionó otro piloto
        if (isAdminMode && targetUserId) {
            data.user_id = targetUserId;
        }

        // Determinar endpoint
        const endpoint = isAdminMode && targetUserId
            ? '/api/admin/performances'
            : '/api/performances';

        // Deshabilitar botón
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = '⏳ Guardando...';
        }

        // Enviar
        const res = await api.post(endpoint, data);

        if (!res.success) {
            throw new Error(res.error || 'Error al guardar rendimiento');
        }

        const action = res.action === 'sobrescrito' ? 'Sobrescrito' : 'Registrado';
        const targetMsg = isAdminMode ? ` para ${targetUserId}` : '';
        showToast(`✅ ${action} correctamente${targetMsg}`, 'success');

        // Resetear formulario
        resetPerformanceForm();

        // Redirigir al dashboard
        setTimeout(() => {
            if (typeof showView === 'function') {
                showView('dashboard');
            }
        }, 1500);

    } catch (error) {
        console.error('Error guardando rendimiento:', error);
        showToast('❌ ' + error.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Guardar Rendimiento';
        }
    }
}

// ============================================================
// UTILIDADES
// ============================================================

/**
 * Resetea el formulario
 */
function resetPerformanceForm() {
    const tokensInput = document.getElementById('tokens');
    const notesInput = document.getElementById('notes');
    const flewInGroupInput = document.getElementById('flewInGroup');
    const daysConnected = document.getElementById('daysConnected');

    if (tokensInput) tokensInput.value = '';
    if (notesInput) notesInput.value = '';
    if (flewInGroupInput) flewInGroupInput.checked = true; // ✅ Marcado por defecto
    if (daysConnected) daysConnected.value = '0';

    // Resetear botones de días
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Resetear selector de piloto
    const select = document.getElementById('performanceTarget');
    if (select) {
        select.value = 'self';
        window.onTargetPilotChange();
    }

    // Resetear estado
    selectedDays = 0;
    updateCalculatedStatus();
}

/**
 * Obtener usuario actual (desde auth.js)
 * Versión asíncrona con fallback seguro
 */
async function getCurrentUser() {
    // Verificar inmediatamente
    if (window.currentUser) {
        return window.currentUser;
    }
    
    // Esperar hasta 2 segundos
    return new Promise((resolve) => {
        const startTime = Date.now();
        const checkInterval = setInterval(() => {
            if (window.currentUser) {
                clearInterval(checkInterval);
                resolve(window.currentUser);
                return;
            }
            if (Date.now() - startTime > 2000) {
                clearInterval(checkInterval);
                // Intentar recuperar del localStorage como fallback
                try {
                    const userData = localStorage.getItem('user');
                    if (userData) {
                        const user = JSON.parse(userData);
                        window.currentUser = user;
                        resolve(user);
                        return;
                    }
                } catch (e) {
                    console.warn('⚠️ Error parseando user de localStorage:', e);
                }
                resolve(null);
            }
        }, 50);
    });
}

/**
 * Mostrar toast (usando el sistema existente)
 */
function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// ============================================================
// ✅ EXPORTACIÓN GLOBAL EN WINDOW
// ============================================================

window.initPerformanceForm = initPerformanceForm;
window.loadAdminPilotList = loadAdminPilotList;
window.savePerformance = savePerformance;
window.selectDays = selectDays;
window.clampTokens = clampTokens;
window.onTargetPilotChange = onTargetPilotChange;

console.log('✅ [Performance] Funciones exportadas globalmente en window');