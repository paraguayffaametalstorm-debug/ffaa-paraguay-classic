// ============================================================
// ========== 6. ADMINISTRACIÓN DE CATÁLOGO DE AVIONES ========
// ============================================================
let allAdminPlaneModelsCache = [];

function showAdminTab(tab) {
  const isCatalog = tab === 'catalog' || tab === 'planes';
  
  // Ocultar TODOS los tabs primero
  const contentMembers = document.getElementById('adminMembersTabContent');
  const contentPlanes = document.getElementById('adminPlanesTabContent');
  
  if (contentMembers) contentMembers.style.display = 'none';
  if (contentPlanes) contentPlanes.style.display = 'none';
  
  // Mostrar el tab seleccionado
  if (isCatalog) {
    if (contentPlanes) contentPlanes.style.display = 'block';
    // Cargar el catálogo automáticamente
    if (typeof loadPlaneCatalogAdmin === 'function') {
      loadPlaneCatalogAdmin();
    }
  } else {
    if (contentMembers) contentMembers.style.display = 'block';
    if (typeof loadAdminPanel === 'function') {
      loadAdminPanel();
    }
  }
  
  // Actualizar estilos de botones
  const btnMembers = document.getElementById('adminTabBtnMembers') || document.querySelector('.tab-btn[data-tab="members"]');
  const btnPlanes = document.getElementById('adminTabBtnPlanes') || document.querySelector('.tab-btn[data-tab="catalog"]');
  
  // Resetear todos los botones
  document.querySelectorAll('.admin-tabs-nav .tab-btn, #adminPanel .tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.style.background = 'rgba(15,23,42,0.6)';
    btn.style.color = 'var(--steel-gray)';
    btn.style.borderColor = 'rgba(148,163,184,0.2)';
  });
  
  // Activar el botón correspondiente
  const activeBtn = isCatalog ? btnPlanes : btnMembers;
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.style.background = 'rgba(212,175,55,0.15)';
    activeBtn.style.color = 'var(--gold-rank)';
    activeBtn.style.borderColor = 'rgba(212,175,55,0.4)';
  }
}

const switchAdminTab = showAdminTab;