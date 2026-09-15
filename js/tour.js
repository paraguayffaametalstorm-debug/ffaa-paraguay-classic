/**
 * PARAGUAY-FFAA | METALSTORM - Sistema de Ayuda & Tour Interactivo (v3.9.8)
 */

const TOUR_STEPS = [
  {
    title: '👋 ¡Bienvenido a PARAGUAY FFAA [PRY]!',
    content: 'Sistema oficial C4ISR del escuadrón paraguayo en MetalStorm (v3.9.8). Gestioná tu rendimiento en combate, administrá tus hangares, revisá normativas y seguí tu historial militar.'
  },
  {
    title: '📊 Panel de Rendimiento (Dashboard)',
    content: 'Consultá tus tokens promedio, estado del semáforo militar (VERDE, NARANJA, ROJO, NEGRO), eventos abiertos de escuadrón y métricas operacionales en tiempo real.'
  },
  {
    title: '✈️ Hangar Rediseñado & 44 Aeronaves',
    content: 'Explorá el catálogo de 44 cazas en la cuadrícula táctica (Vista 1). Al hacer clic en un avión, accedé a la pantalla dedicada (Vista 2) con botón de retorno y enlaces directos a edición de subsistemas.'
  },
  {
    title: '🌐 Inteligencia Balística en Español (i18n)',
    content: 'Fichas técnicas enriquecidas con descripciones in-game, historia de combate, recomendaciones de vuelo y los 13 rasgos tácticos oficiales (traits) traducidos íntegramente al español.'
  },
  {
    title: '⚡ Upgrades 2.0 & Operaciones Black Market',
    content: 'Calibrá fuselaje, motor, aviónica y armas con 10 mods oficiales. Participá de los eventos de 5 días de Black Market para acumular puntos y desbloquear hasta 50% de descuento en cazas exclusivos.'
  },
  {
    title: '📲 PWA Offline & Soporte Táctico',
    content: 'Instalá la aplicación como PWA en Android, iOS o PC para operar sin conexión con el Service Worker v3.9.8. Accedé al Centro de Ayuda o al menú de atajos en cualquier momento.'
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
  const hasSeen = localStorage.getItem('hasSeenTour_v3_9_8') || localStorage.getItem('hasSeenTour_v3');
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
  localStorage.setItem('hasSeenTour_v3_9_8', 'true');
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
