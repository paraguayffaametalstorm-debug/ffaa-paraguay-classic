/**
 * PARAGUAY-FFAA | METALSTORM v2.0 - API Client
 * ✅ SINCRONIZADO CON NUEVA BD (user_id INTEGER)
 * Funciones para interactuar con el backend
 * Actualizado: 12 de febrero de 2026
 */

// ========== RENDIMIENTO ==========
async function savePerformance() {
  try {
    const tokens        = parseInt(document.getElementById('tokens').value);
    const daysConnected = parseInt(document.getElementById('daysConnected').value);
    const flewInGroup   = document.getElementById('flewInGroup').checked;
    const notes         = document.getElementById('notes').value.trim();

    // ── Determinar si es modo admin (otro piloto) ────────────────────────
    const targetSel    = document.getElementById('performanceTarget');
    const targetValue  = targetSel ? targetSel.value : 'self';
    const isAdminMode  = targetValue !== 'self';
    const targetUserId = isAdminMode ? parseInt(targetValue) : null;

    // ── Validaciones comunes ─────────────────────────────────────────────
    if (!currentEvent) {
      throw new Error('No hay evento activo');
    }

    // Límites según tipo de evento (ACTA-2026-001)
    const isBM      = currentEvent.type === 'BLACK_MARKET';
    const maxTokens = isBM ? 250 : 200;
    const maxDays   = isBM ? 5   : 4;

    if (isNaN(tokens) || tokens < 0 || tokens > maxTokens) {
      throw new Error(`Tokens deben estar entre 0 y ${maxTokens} (evento ${currentEvent.type})`);
    }
    if (isNaN(daysConnected) || daysConnected < 0 || daysConnected > maxDays) {
      throw new Error(`Días conectado deben estar entre 0 y ${maxDays} (evento ${currentEvent.type})`);
    }
    if (!flewInGroup) {
      throw new Error('Vuelo en grupo es obligatorio según normativa');
    }

    // ── Deshabilitar botón para evitar doble envío ───────────────────────
    const saveBtn = document.getElementById('btnSavePerf');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Guardando...'; }

    let res;

    if (isAdminMode) {
      // ── Ruta ADMIN: registra/sobrescribe en nombre de otro piloto ────────
      const data = {
        user_id:        targetUserId,
        event_id:       currentEvent.id,
        tokens,
        days_connected: daysConnected,
        flew_in_group:  flewInGroup,
        notes:          notes || null
      };
      console.log(`📊 [ADMIN] Guardando performance para user_id: ${targetUserId}`, data);

      res = await fetch(`${API_BASE}/api/admin/performances`, {
        method:  'POST',
        headers: getAuthHeaders(),
        body:    JSON.stringify(data)
      });
    } else {
      // ── Ruta NORMAL: registro propio ─────────────────────────────────────
      const data = {
        event_id:       currentEvent.id,
        tokens,
        days_connected: daysConnected,
        flew_in_group:  flewInGroup,
        notes:          notes || null
      };
      console.log(`📊 Guardando performance para user_id: ${currentUser.user_id}`, data);

      res = await fetch(`${API_BASE}/api/performances`, {
        method:  'POST',
        headers: getAuthHeaders(),
        body:    JSON.stringify(data)
      });
    }

    const resData = await res.json();

    if (!res.ok) {
      throw new Error(resData.error || 'Error al guardar rendimiento');
    }

    const action  = resData.action === 'sobrescrito' ? 'Sobrescrito' : 'Registrado';
    const statMsg = resData.status ? ` — Estado: ${resData.status}` : '';
    showToast(`✅ ${action} correctamente${statMsg}`, 'success');

    // ── Limpiar formulario ───────────────────────────────────────────────
    document.getElementById('tokens').value        = '';
    document.getElementById('daysConnected').value = '';
    document.getElementById('flewInGroup').checked = false;
    document.getElementById('notes').value         = '';
    document.querySelectorAll('#daysSelectorGroup .day-btn')
      .forEach(btn => btn.classList.remove('active'));
    const statusEl = document.getElementById('calculatedStatus');
    if (statusEl) statusEl.innerHTML = '<span class="status-badge">-</span>';

    // Resetear selector de piloto al propio usuario
    if (targetSel) {
      targetSel.value = 'self';
      if (typeof onTargetPilotChange === 'function') onTargetPilotChange();
    }

    // Re-habilitar botón ANTES de redirigir (el DOM de la SPA se preserva entre vistas)
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Guardar Rendimiento';
    }

    // Volver al dashboard tras 1.5s
    setTimeout(() => showView('appView'), 1500);

  } catch (err) {
    console.error('Error guardando rendimiento:', err);
    showToast('❌ ' + err.message, 'error');

    // Re-habilitar botón si hubo error
    const saveBtn = document.getElementById('btnSavePerf');
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Guardar Rendimiento';
    }
  }
}

// ========== AERONAVES ==========
async function savePlane() {
  try {
    const editingId  = document.getElementById('editingPlaneId')?.value || '';
    const isEditing  = !!editingId;
    const planeModel = document.getElementById('planeModel').value;
    const planeLevel = parseInt(document.getElementById('planeLevel').value);

    // Validaciones básicas
    if (!planeModel) throw new Error('Selecciona un modelo de aeronave');
    if (!planeLevel || planeLevel < 1 || planeLevel > 20) throw new Error('Nivel debe estar entre 1 y 20');

    const specialSkill = document.getElementById('specialSkill').value  || null;
    const passiveSkill = document.getElementById('passiveSkill').value  || null;
    const mod1         = document.getElementById('mod1').value          || null;
    const mod1Level    = parseInt(document.getElementById('mod1Level').value) || null;
    const mod2         = document.getElementById('mod2').value          || null;
    const mod2Level    = parseInt(document.getElementById('mod2Level').value) || null;

    // Validaciones de nivel (REGLAS 2.4–2.7 / Sección 6)
    if (specialSkill && planeLevel < 8)  throw new Error('Habilidad especial requiere nivel 8+');
    if (passiveSkill && planeLevel < 12) throw new Error('Habilidad pasiva requiere nivel 12+');
    if (mod1         && planeLevel < 16) throw new Error('Modificación 1 requiere nivel 16+');
    if (mod2         && planeLevel < 20) throw new Error('Modificación 2 requiere nivel 20');

    // REGLA-2.8: Mods distintos
    if (mod1 && mod2 && mod1 === mod2)
      throw new Error('No puedes equipar la misma modificación dos veces');

    // REGLA-2.9: Nivel de mods obligatorio si hay mod
    if (mod1 && (!mod1Level || mod1Level < 1 || mod1Level > 5))
      throw new Error('Selecciona el nivel de Modificación 1 (1–5)');
    if (mod2 && (!mod2Level || mod2Level < 1 || mod2Level > 5))
      throw new Error('Selecciona el nivel de Modificación 2 (1–5)');

    // REGLA-2.1: Verificar duplicados solo al agregar
    if (!isEditing) {
      const duplicate = allUserPlanes.find(p => String(p.avion_id) === String(planeModel));
      if (duplicate) throw new Error('Ya posees este modelo de aeronave. No puedes tener duplicados.');
    }

    const nivelFuselaje = planeLevel >= 6 ? (parseInt(document.getElementById('formNivelFuselaje')?.value, 10) || 0) : 0;
    const nivelMotor    = planeLevel >= 6 ? (parseInt(document.getElementById('formNivelMotor')?.value, 10) || 0) : 0;
    const nivelAvionica = planeLevel >= 6 ? (parseInt(document.getElementById('formNivelAvionica')?.value, 10) || 0) : 0;
    const nivelArmas    = planeLevel >= 6 ? (parseInt(document.getElementById('formNivelArmas')?.value, 10) || 0) : 0;

    const data = {
      avion_id:       planeModel,
      nivel:          planeLevel,
      especial_nombre: specialSkill,
      pasiva_nombre:   passiveSkill,
      mod1_id:         mod1,
      mod1_lvl:        mod1Level,
      mod2_id:         mod2,
      mod2_lvl:        mod2Level,
      nivel_fuselaje:  nivelFuselaje,
      nivel_motor:     nivelMotor,
      nivel_avionica:  nivelAvionica,
      nivel_armas:     nivelArmas
    };

    console.log(`✈️ ${isEditing ? 'Actualizando' : 'Creando'} avión`, data);

    const url    = isEditing ? `${API_BASE}/api/planes/${editingId}` : `${API_BASE}/api/planes`;
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al guardar aeronave');
    }

    showToast(
      isEditing ? '✅ Aeronave actualizada correctamente' : '✅ Aeronave registrada correctamente',
      'success'
    );
    closeModal('addPlaneModal');
    loadPlanesView();

  } catch (err) {
    console.error('Error guardando aeronave:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

async function deletePlane(planeId) {
  if (!confirm('¿Estás seguro de eliminar esta aeronave?')) return;
  
  try {
    const res = await fetch(`${API_BASE}/api/planes/${planeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al eliminar aeronave');
    }
    
    showToast('✅ Aeronave eliminada correctamente', 'success');
    loadPlanesView();
    
  } catch (err) {
    console.error('Error eliminando aeronave:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

// ========== UPGRADES 2.0 (SISTEMAS MEJORABLES) ==========
async function getPlaneDetails(planeId) {
  try {
    const res = await fetch(`${API_BASE}/api/planes/${planeId}/details`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener detalles de la aeronave');
    }
    const data = await res.json();
    return data.plane;
  } catch (err) {
    console.error('Error en getPlaneDetails:', err);
    throw err;
  }
}

async function updatePlaneSystem(planeId, sistema, nivel, piezas = 0, avanzadas = 0) {
  try {
    const res = await fetch(`${API_BASE}/api/planes/${planeId}/system`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        sistema,
        nivel: parseInt(nivel, 10),
        piezas: parseInt(piezas, 10) || 0,
        avanzadas: parseInt(avanzadas, 10) || 0
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al actualizar sistema');
    }

    const data = await res.json();
    showToast(`✅ ${data.message || 'Sistema actualizado con éxito'}`, 'success');
    return data.plane;
  } catch (err) {
    console.error('Error en updatePlaneSystem:', err);
    showToast('❌ ' + err.message, 'error');
    throw err;
  }
}

window.getPlaneDetails = getPlaneDetails;
window.updatePlaneSystem = updatePlaneSystem;

// ========== NORMATIVAS ==========
async function uploadNormativa() {
  try {
    const titulo               = document.getElementById('normativaTitle').value.trim();
    const codigo               = document.getElementById('normativaCode').value.trim().toUpperCase();
    const tipo_documento       = document.getElementById('normativaType').value;
    const categoria            = document.getElementById('normativaCategory').value;
    const ambito_aplicacion    = document.getElementById('normativaScope').value;
    const fecha_aprobacion     = document.getElementById('normativaApprovedDate').value;
    const fecha_entrada_vigor  = document.getElementById('normativaEffectiveDate').value;
    const resumen              = document.getElementById('normativaSummary').value.trim();
    const fileInput            = document.getElementById('normativaFile');
    const nivel_confidencialidad = document.getElementById('normativaConfidentiality').value;

    if (!titulo || !codigo || !tipo_documento || !categoria || !ambito_aplicacion || !fecha_aprobacion || !fecha_entrada_vigor || !resumen) {
      throw new Error('Completa todos los campos obligatorios');
    }
    if (!fileInput.files || fileInput.files.length === 0) {
      throw new Error('Selecciona un archivo PDF, DOC o DOCX');
    }

    const file = fileInput.files[0];
    const maxSize = 15 * 1024 * 1024; // 15 MB
    if (file.size > maxSize) throw new Error('El archivo supera los 15 MB permitidos');

    showToast('⏳ Subiendo normativa...', 'info');

    // Leer archivo como Base64
    const file_base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });

    const ext = file.name.split('.').pop().toLowerCase();

    const payload = {
      titulo, codigo, tipo_documento, categoria, ambito_aplicacion,
      fecha_aprobacion, fecha_entrada_vigor, resumen, nivel_confidencialidad,
      file_base64,
      file_name:      file.name,
      file_extension: ext,
      file_type:      file.type || 'application/pdf'
    };

    const res = await fetch(`${API_BASE}/api/normativas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al subir normativa');
    }

    showToast('✅ Normativa subida correctamente', 'success');
    closeModal('uploadNormativaModal');
    // Limpiar formulario
    ['normativaTitle','normativaCode','normativaSummary'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    loadNormativas();

  } catch (err) {
    console.error('Error subiendo normativa:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

async function downloadNormativa(normativaId) {
  try {
    const res = await fetch(`${API_BASE}/api/normativas/${normativaId}/download`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      throw new Error('Error al descargar documento');
    }
    
    // Descargar archivo
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `normativa-${normativaId}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('✅ Descargando documento...', 'success');
    
  } catch (err) {
    console.error('Error descargando normativa:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

// ========== ADMIN ==========
async function addNewMember() {
  try {
    const nick = document.getElementById('newMemberNick').value.trim();
    const email = document.getElementById('newMemberEmail').value.trim();
    const role = document.getElementById('newMemberRole').value;
    
    if (!nick || !email) {
      throw new Error('Completa nick y email');
    }
    
    const data = { nick, email, role };
    
    const res = await fetch(`${API_BASE}/api/admin/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al registrar miembro');
    }
    
    showToast('✅ Nuevo miembro registrado correctamente', 'success');
    document.getElementById('newMemberNick').value = '';
    document.getElementById('newMemberEmail').value = '';
    loadMembersList();
    
  } catch (err) {
    console.error('Error agregando miembro:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

async function uploadEventBulk() {
  try {
    const eventId = document.getElementById('eventIdInput').value.trim();
    const bulkData = document.getElementById('eventBulkData').value.trim();
    
    if (!eventId || !bulkData) {
      throw new Error('Completa todos los campos');
    }
    
    // Parsear datos
    const lines = bulkData.split('\n').filter(line => line.trim());
    const performances = lines.map(line => {
      const [nick, tokens, role] = line.split(',').map(s => s.trim());
      return { nick, tokens: parseInt(tokens), role };
    });
    
    const data = {
      event_id: eventId,
      performances
    };
    
    const res = await fetch(`${API_BASE}/api/admin/bulk-upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al cargar evento');
    }
    
    showToast('✅ Evento cargado correctamente', 'success');
    closeModal('uploadEventModal');
    loadAdminPanel();
    
  } catch (err) {
    console.error('Error cargando evento masivo:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

// [ADMIN MEJORA] Cambio de estado de miembro (ACTIVE / INACTIVE)
async function toggleMemberStatus(userId, newStatus, nick) {
  const label = newStatus === 'INACTIVE' ? 'inactivar' : 'reactivar';
  if (!confirm(`¿Confirmas ${label} al piloto ${nick}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/admin/members/${userId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Error al ${label} miembro`);
    }

    const accion = newStatus === 'ACTIVE' ? 'reactivado' : 'inactivado';
    showToast(`✅ Piloto ${nick} ${accion} correctamente`, 'success');

    // Recargar lista para reflejar el cambio
    loadMembersList();

  } catch (err) {
    console.error('Error cambiando estado de miembro:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

// ========== EXPORTACIONES ==========
async function exportPlanesXLSX() {
  try {
    const res = await fetch(`${API_BASE}/api/planes/export`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw new Error('Error al exportar');
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mis_aeronaves_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('✅ Exportando aeronaves...', 'success');
    
  } catch (err) {
    console.error('Error exportando:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

async function exportAllPerformances() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/export-performances`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw new Error('Error al exportar');
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todos_rendimientos_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showToast('✅ Exportando rendimientos...', 'success');
    
  } catch (err) {
    console.error('Error exportando:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

// ========== CACHÉ DE CATÁLOGOS ==========
let planeModelsCache = [];
let planeModsCache   = [];

// ========== CARGA DE MODELOS DE AVIÓN ==========
// Devuelve Promise para que editPlane pueda encadenar sin race conditions
function loadPlaneModels() {
  const url = `${API_BASE}/api/catalog/plane-models`;
  return fetch(url, { headers: getAuthHeaders() })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      planeModelsCache = Array.isArray(data) ? data : (data.models || []);
      const select = document.getElementById('planeModel');
      if (!select) return;
      select.innerHTML = '<option value="">-- Seleccionar Avión --</option>';
      planeModelsCache.forEach(model => {
        const opt = document.createElement('option');
        opt.value = model.id;
        opt.textContent = `${model.name} (${model.type || 'Tipo desconocido'})`;
        select.appendChild(opt);
      });
    })
    .catch(err => console.error('Error cargando modelos:', err));
}

// ========== CARGA DE MÓDULOS ==========
// Devuelve Promise para encadenar
function loadPlaneMods() {
  const url = `${API_BASE}/api/catalog/plane-mods`;
  return fetch(url, { headers: getAuthHeaders() })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      planeModsCache = Array.isArray(data) ? data : (data.mods || []);
      ['mod1', 'mod2'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        sel.innerHTML = '<option value="">-- Ninguno --</option>';
        planeModsCache.forEach(mod => {
          const opt = document.createElement('option');
          opt.value = mod.id;
          opt.textContent = mod.name;
          sel.appendChild(opt);
        });
      });
    })
    .catch(err => console.error('Error cargando módulos:', err));
}

// ========== OPCIONES DE HABILIDADES SEGÚN MODELO SELECCIONADO ==========
// Cada modelo tiene UNA habilidad especial y UNA pasiva (o ninguna)
// El usuario elige si equiparla o no (una vez desbloqueada por nivel)
function loadPlaneSkillOptions(preserveValues = false) {
  const modelId = document.getElementById('planeModel')?.value;
  const model   = planeModelsCache.find(m => String(m.id) === String(modelId));

  const specialSelect = document.getElementById('specialSkill');
  const passiveSelect = document.getElementById('passiveSkill');

  const prevSpecial = preserveValues ? specialSelect?.value : null;
  const prevPassive = preserveValues ? passiveSelect?.value : null;

  if (specialSelect) {
    specialSelect.innerHTML = '<option value="">-- Sin habilidad especial --</option>';
    if (model?.special_name) {
      const opt = document.createElement('option');
      opt.value = model.special_name;
      opt.textContent = model.special_name;
      specialSelect.appendChild(opt);
    }
    if (preserveValues && prevSpecial) specialSelect.value = prevSpecial;
  }

  if (passiveSelect) {
    passiveSelect.innerHTML = '<option value="">-- Sin habilidad pasiva --</option>';
    if (model?.passive_name) {
      const opt = document.createElement('option');
      opt.value = model.passive_name;
      opt.textContent = model.passive_name;
      passiveSelect.appendChild(opt);
    }
    if (preserveValues && prevPassive) passiveSelect.value = prevPassive;
  }
}

// Se llama cuando el usuario cambia el modelo seleccionado en modo "Agregar"
function onPlaneModelChange() {
  loadPlaneSkillOptions(false);
  loadPlaneSkills();
}

// ========== ESTADO DE CAMPOS SEGÚN NIVEL (SECCIÓN 6 DE REGLAS) ==========
function loadPlaneSkills() {
  const level = parseInt(document.getElementById('planeLevel')?.value) || 0;

  // Upgrades 2.0 (Sistemas Fuselaje, Motor, Aviónica, Armas) — Nivel 6+
  const upgradesGrp = document.getElementById('formUpgradesGroup');
  if (upgradesGrp) {
    upgradesGrp.style.display = level >= 6 ? 'block' : 'none';
  }

  // Helper: habilitar o deshabilitar con texto de placeholder correcto
  const setField = (id, enabled, placeholder) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !enabled;
    if (!enabled) {
      // Limpiar valor y poner placeholder
      el.innerHTML = `<option value="">${placeholder}</option>`;
    }
  };

  // Habilidad especial — Nivel 8+
  const specialEnabled = level >= 8;
  if (!specialEnabled) {
    setField('specialSkill', false, '-- Requiere Nivel 8+ --');
  } else {
    const specialSelect = document.getElementById('specialSkill');
    if (specialSelect) {
      specialSelect.disabled = false;
      // Repoblar opciones si está vacío (cambio de nivel hacia arriba)
      if (specialSelect.options.length <= 1) loadPlaneSkillOptions(false);
    }
  }

  // Habilidad pasiva — Nivel 12+
  const passiveEnabled = level >= 12;
  if (!passiveEnabled) {
    setField('passiveSkill', false, '-- Requiere Nivel 12+ --');
  } else {
    const passiveSelect = document.getElementById('passiveSkill');
    if (passiveSelect) {
      passiveSelect.disabled = false;
      if (passiveSelect.options.length <= 1) loadPlaneSkillOptions(false);
    }
  }

  // Mod 1 — Nivel 16+
  const mod1Enabled = level >= 16;
  const mod1Select  = document.getElementById('mod1');
  const mod1Level   = document.getElementById('mod1Level');
  if (mod1Select) {
    if (!mod1Enabled) {
      mod1Select.innerHTML = '<option value="">-- Requiere Nivel 16+ --</option>';
      mod1Select.disabled = true;
    } else {
      mod1Select.disabled = false;
      if (mod1Select.options.length <= 1) {
        // Repoblar desde caché si disponible
        planeModsCache.forEach(mod => {
          const opt = document.createElement('option');
          opt.value = mod.id; opt.textContent = mod.name;
          mod1Select.appendChild(opt);
        });
      }
    }
    if (mod1Level) {
      mod1Level.disabled = !mod1Enabled;
      if (!mod1Enabled) mod1Level.value = '';
    }
  }

  // Mod 2 — Nivel 20
  const mod2Enabled = level >= 20;
  const mod2Select  = document.getElementById('mod2');
  const mod2Level   = document.getElementById('mod2Level');
  if (mod2Select) {
    if (!mod2Enabled) {
      mod2Select.innerHTML = '<option value="">-- Requiere Nivel 20 --</option>';
      mod2Select.disabled = true;
    } else {
      mod2Select.disabled = false;
      if (mod2Select.options.length <= 1) {
        planeModsCache.forEach(mod => {
          const opt = document.createElement('option');
          opt.value = mod.id; opt.textContent = mod.name;
          mod2Select.appendChild(opt);
        });
      }
    }
    if (mod2Level) {
      mod2Level.disabled = !mod2Enabled;
      if (!mod2Enabled) mod2Level.value = '';
    }
  }
}

// ========== FILTROS ==========
function resetPlaneFilters() {
  document.getElementById('planeSearch').value = '';
  document.getElementById('planeTypeFilter').value = '';
  document.getElementById('minLevelFilter').value = '';
  document.getElementById('maxLevelFilter').value = '';
  document.getElementById('specialSkillFilter').value = '';
  document.getElementById('passiveSkillFilter').value = '';
  loadPlanesView();
}

function applyPlaneFilters() {
  filterPlanes();
}

function resetNormativasFilters() {
  const ids = ['normativasSearch', 'categoriaFilter', 'tipoDocFilter'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const orden = document.getElementById('ordenFilter');
  if (orden) orden.value = 'recientes';
  if (typeof applyNormativasFilters === 'function') applyNormativasFilters();
  else loadNormativas();
}

function resetAllPerfFilters() {
  document.getElementById('allPerfSearch').value = '';
  document.getElementById('allPerfRoleFilter').value = '';
  document.getElementById('minTokensFilter').value = '';
  document.getElementById('maxTokensFilter').value = '';
  document.getElementById('statusFilter').value = '';
  document.getElementById('eventIdFilter').value = '';
  loadAllPerformances();
}

// [ADMIN MEJORA] Resetear filtros de miembros
function resetMemberFilters() {
  const elems = ['memberSearch', 'roleFilter', 'weeksFilter', 'perfStatusFilter', 'squadStatusFilter'];
  elems.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Mostrar todos los miembros sin filtro
  if (typeof filterMembers === 'function') filterMembers();
}

// ========== FUNCIONES DE FILTRADO ==========
// NOTA: La función filterPlanes real está implementada en views.js
// function filterPlanes() { console.log('🔍 Filtrando aeronaves...'); } // Eliminado para evitar conflicto

// filterNormativas — implementado en views.js (applyNormativasFilters)

// [ADMIN MEJORA] Esta función ahora se implementa en vistas.js con el filtrado real.
// Se mantiene como placeholder por compatibilidad.
function filterMembers() {
  console.log('🔍 Filtrando miembros...');
  // La implementación real está en vistas.js
}

function filterAllPerformances() {
  console.log('🔍 Filtrando rendimientos...');
  // Implementación pendiente: aplicar filtros en tiempo real
}

function applyAllPerfFilters() {
  filterAllPerformances();
}

// ========== FUNCIONES ADICIONALES ==========
function showAddPlaneModal() {
  showModal('addPlaneModal');
  loadPlaneModels();
  loadPlaneMods(); // ✅ Ahora también carga los módulos
}

function showUploadNormativaModal() {
  showModal('uploadNormativaModal');
}

function showUploadEventModal() {
  showModal('uploadEventModal');
}

function editPlane(planeId) {
  console.log(`✏️ Editando avión ${planeId}`);
  showModal('addPlaneModal');
  // Implementación pendiente: cargar datos del avión
}

function refreshAdminStats() {
  console.log('🔄 Actualizando estadísticas de admin...');
  loadAdminPanel();
}

// ========== FUNCIONES HELPER ==========
function showAllNormativas() {
  showView('normativasView');
}