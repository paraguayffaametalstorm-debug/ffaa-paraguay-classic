/**
PARAGUAY-FFAA | METALSTORM v2.0 - Utilidades
Funciones helper y notificaciones
*/

// ========== MODAL FUNCTIONS ==========
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

// ========== TOAST NOTIFICATIONS ==========
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);
  
  // Auto-remover después de 3 segundos
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(400px)';
    setTimeout(() => {
      container.removeChild(toast);
    }, 500);
  }, 3000);
}

// ========== FORMATEO DE FECHAS ==========
function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ========== VALIDACIONES ==========
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidPhone(phone) {
  // Acepta +595981123456 o 0981123456 - CORREGIDO: escapar +
  const re = /^(\+595)?[0-9]{9,10}$/;
  return re.test(phone.replace(/\s/g, ''));
}

// ========== CÁLCULO DE ESTADO ==========
function calculateStatus(tokens) {
  if (tokens >= 175) return 'VERDE';
  if (tokens >= 130) return 'NARANJA';
  if (tokens >= 100) return 'ROJO';
  return 'NEGRO';
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
  // Los filtros se aplican en tiempo real con oninput/onchange
  // Esta función es para botón de aplicar explícito
  filterPlanes();
}

function resetNormativasFilters() {
  document.getElementById('normativasSearch').value = '';
  document.getElementById('categoriaFilter').value = '';
  document.getElementById('tipoDocFilter').value = '';
  document.getElementById('ordenFilter').value = 'recientes';
  loadNormativas();
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


// ============================================================================
// NOTA: loadPlaneModels, loadPlaneMods, loadPlaneSkills, loadPlaneSkillOptions
// y onPlaneModelChange están definidas en api.js (fuente única de verdad).
// ============================================================================

// ========== LUCIDE ICONS INITIALIZATION ==========
function refreshLucideIcons() {
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    try {
      lucide.createIcons();
    } catch (e) {
      console.warn('⚠️ Error al inicializar iconos Lucide:', e);
    }
  }
}
window.refreshLucideIcons = refreshLucideIcons;

window.addEventListener('beforeunload', (e) => {
  // Verificar si hay formularios con cambios no guardados
  // (implementación opcional según necesidad)
});

// ========== EXPORTACIÓN ==========
function exportToCSV(data, filename) {
  if (!data || data.length === 0) return showToast('Sin datos para exportar', 'warning');
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row =>
    Object.values(row).map(v =>
      v === null || v === undefined ? ''
      : typeof v === 'string' ? `"${v.replace(/"/g, '""')}"` : v
    ).join(',')
  );
  const csv  = [headers, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename + '.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('✅ CSV exportado', 'success');
}

function exportToJSON(data, filename) {
  if (!data || data.length === 0) return showToast('Sin datos para exportar', 'warning');
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename + '.json'; a.click();
  URL.revokeObjectURL(url);
  showToast('✅ JSON exportado', 'success');
}