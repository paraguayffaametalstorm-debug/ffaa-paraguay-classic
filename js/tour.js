/**
 * PARAGUAY-FFAA | METALSTORM - Sistema de Ayuda & Tour Interactivo
 */

const TOUR_STEPS = [
  {
    title: '👋 ¡Bienvenido a PARAGUAY FFAA [PRY]!',
    content: 'Este sistema te permite gestionar tu rendimiento en eventos de escuadrón, administrar tus hangares de aeronaves, revisar normativas y seguir tu historial militar.'
  },
  {
    title: '📊 Panel de Rendimiento (Dashboard)',
    content: 'Consulta tus tokens promedio, estado operativo (VERDE, NARANJA, ROJO, NEGRO), eventos abiertos y métricas de escuadrón en tiempo real.'
  },
  {
    title: '✈️ Carga de Rendimiento y Hangares',
    content: 'Registra tus vuelos y tokens durante la ventana activa de eventos y mantén tus aviones configurados con habilidades y modificaciones de combate.'
  },
  {
    title: '⚙️ Personalización y Soporte',
    content: 'Puedes alternar entre los temas Militar, Operaciones Tácticas o Clásico, configurar notificaciones y acceder a la ayuda en cualquier momento.'
  }
];

let currentTourIndex = 0;

function initHelpSystem() {
  // Asegurar botón flotante si no está presente
  let fab = document.getElementById('helpFab');
  if (!fab) {
    fab = document.createElement('div');
    fab.id = 'helpFab';
    fab.className = 'help-fab';
    fab.title = 'Centro de Ayuda';
    fab.innerHTML = '❓';
    fab.onclick = () => {
      if (typeof showModal === 'function') showModal('helpModal');
    };
    document.body.appendChild(fab);
  }
}

function startTourIfFirstTime() {
  const hasSeen = localStorage.getItem('hasSeenTour_v3');
  if (!hasSeen) {
    startTour();
  }
}

function startTour() {
  currentTourIndex = 0;
  renderTourStep();
}

function renderTourStep() {
  let overlay = document.getElementById('tourOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'tourOverlay';
    overlay.className = 'tour-overlay';
    document.body.appendChild(overlay);
  }

  const step = TOUR_STEPS[currentTourIndex];
  const isLast = currentTourIndex === TOUR_STEPS.length - 1;

  overlay.innerHTML = `
    <div class="tour-card">
      <div class="tour-header">
        <h3>${step.title}</h3>
        <span style="cursor:pointer;font-size:1.2rem;" onclick="closeTour()">&times;</span>
      </div>
      <div class="tour-body">
        <p>${step.content}</p>
      </div>
      <div class="tour-footer">
        <span class="tour-steps-indicator">Paso ${currentTourIndex + 1} de ${TOUR_STEPS.length}</span>
        <div class="tour-actions">
          ${currentTourIndex > 0 ? `<button onclick="prevTourStep()" class="btn-secondary">Anterior</button>` : ''}
          <button onclick="${isLast ? 'finishTour()' : 'nextTourStep()'}" class="btn-primary">
            ${isLast ? 'Comenzar 🚀' : 'Siguiente ›'}
          </button>
        </div>
      </div>
    </div>
  `;
}

function nextTourStep() {
  if (currentTourIndex < TOUR_STEPS.length - 1) {
    currentTourIndex++;
    renderTourStep();
  }
}

function prevTourStep() {
  if (currentTourIndex > 0) {
    currentTourIndex--;
    renderTourStep();
  }
}

function finishTour() {
  localStorage.setItem('hasSeenTour_v3', 'true');
  closeTour();
  if (typeof showToast === 'function') {
    showToast('🎖️ ¡Tour completado! Listo para el despegue.', 'success');
  }
}

function closeTour() {
  const overlay = document.getElementById('tourOverlay');
  if (overlay) {
    overlay.remove();
  }
}

function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  if (item) {
    item.classList.toggle('open');
  }
}
