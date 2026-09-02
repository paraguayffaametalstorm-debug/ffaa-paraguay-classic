/**
 * PARAGUAY-FFAA | METALSTORM - Orquestador Principal
 * Inicializaci?3n global de la aplicaci?3n
 */

// Inicializaci?3n (se llama despu??s de cargar componentes)
function initApp() {
    // ✅ Restaurar sesión al inicio
    if (typeof restoreSession === 'function') {
        restoreSession();
    } else if (typeof window.restoreSession === 'function') {
        window.restoreSession();
    }

    if (typeof initSettingsOnLoad === 'function') initSettingsOnLoad();
    console.log('e??� PARAGUAY-FFAA | METALSTORM iniciando...');
    
    // a????? NO mostrar ninguna vista aqu?- - dejar que checkAuthStatus() controle
    // Eliminar: showView('appView') - ESTO CAUSABA EL PROBLEMA
    
    // Configurar listeners globales
    setupGlobalEventListeners();
    
    // Iniciar monitoreo de sesi?3n
    setupSessionMonitor();
    
    // e?���� PRIMERO verificar autenticaci?3n - esto decidir?? qu?? mostrar
    checkAuthStatus();
}

function setupGlobalEventListeners() {
    // Bot?3n de ayuda
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => showModal('helpModal'));
    }
}

function setupSessionMonitor() {
    // Reiniciar contador en actividad
    document.addEventListener('mousemove', resetSessionTimer);
    document.addEventListener('keypress', resetSessionTimer);
    
    // Iniciar temporizador
    resetSessionTimer();
}

function resetSessionTimer() {
    // Limpiar temporizador anterior
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
    }
    
    // Nuevo temporizador: 30 minutos
    sessionTimeout = setTimeout(showSessionWarning, 30 * 60 * 1000);
}

function showSessionWarning() {
    const modal = document.getElementById('sessionWarningModal');
    if (modal) {
        modal.classList.add('show');
        startCountdown();
    }
}

function startCountdown() {
    let seconds = 60;
    const countdownEl = document.getElementById('countdownTimer');
    
    if (countdownEl) {
        countdownEl.textContent = seconds;
        
        const interval = setInterval(() => {
            seconds--;
            countdownEl.textContent = seconds;
            
            if (seconds <= 0) {
                clearInterval(interval);
                logout();
            }
        }, 1000);
    }
}

function extendSession() {
    closeModal('sessionWarningModal');
    resetSessionTimer();
    showToast('a??Sesi?3n extendida', 'success');
}

// Función para actualizar el estado del usuario en la UI
function updateUserUI(user) {
    if (!user) return;
    currentUser = user;
    window.currentUser = user;
    localStorage.setItem('user', JSON.stringify(user));
    
    // === OCULTAR LOGIN / MOSTRAR LOGOUT ===
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const drawerLoginBtn = document.getElementById('drawerLoginBtn');
    const drawerLogoutBtn = document.getElementById('drawerLogoutBtn');
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (drawerLoginBtn) drawerLoginBtn.style.display = 'none';
    if (drawerLogoutBtn) drawerLogoutBtn.style.display = 'flex';
    
    // === ACTUALIZAR NOMBRE DE USUARIO ===
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
        userNameEl.textContent = user.nick || user.email;
    }

    const drawerUserNickEl = document.getElementById('drawerUserNick');
    if (drawerUserNickEl) {
        drawerUserNickEl.textContent = user.nick || user.email;
    }
    
    // === ACTUALIZAR ROL ===
    const userRoleEl = document.getElementById('userRole');
    if (userRoleEl) {
        const roleBadge = document.createElement('span');
        roleBadge.className = `role-badge role-${user.role}`;
        roleBadge.textContent = user.role.toUpperCase();
        
        userRoleEl.innerHTML = '';
        userRoleEl.appendChild(roleBadge);
    }

    const drawerUserRoleEl = document.getElementById('drawerUserRole');
    if (drawerUserRoleEl) {
        const roleBadge = document.createElement('span');
        roleBadge.className = `role-badge role-${user.role}`;
        roleBadge.textContent = user.role.toUpperCase();
        
        drawerUserRoleEl.innerHTML = '';
        drawerUserRoleEl.appendChild(roleBadge);
    }

    // Actualizar stats rápidos en el drawer
    const drawerAvgTokensEl = document.getElementById('drawerAvgTokens');
    if (drawerAvgTokensEl) {
        drawerAvgTokensEl.textContent = user.avg_tokens || '185';
    }

    const drawerPerfStatusEl = document.getElementById('drawerPerfStatus');
    if (drawerPerfStatusEl) {
        const st = (user.perf_status || 'VERDE').toUpperCase();
        drawerPerfStatusEl.textContent = st;
        drawerPerfStatusEl.className = `d-stat-val status-badge status-${st.toLowerCase()}`;
    }
    
    // === MOSTRAR/OCULTAR BOTONES DE ADMIN ===
    const adminBtn = document.getElementById('adminBtn');
    const allPerformancesBtn = document.getElementById('allPerformancesBtn');
    const uploadNormativaBtn = document.getElementById('uploadNormativaBtn');
    const viewAllNormativasBtn = document.getElementById('viewAllNormativasBtn');
    const uploadEventBtn = document.getElementById('uploadEventBtn');
    const mobileAdminNavItem = document.getElementById('mobileAdminNavItem');
    const drawerAdminSection = document.getElementById('drawerAdminSection');
    const drawerOwnerBtn = document.getElementById('drawerOwnerBtn');
    
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
        if (adminBtn) adminBtn.style.display = 'inline-flex';
        if (allPerformancesBtn) allPerformancesBtn.style.display = 'inline-flex';
        if (uploadNormativaBtn) uploadNormativaBtn.style.display = 'block';
        if (viewAllNormativasBtn) viewAllNormativasBtn.style.display = 'block';
        if (uploadEventBtn) uploadEventBtn.style.display = 'block';
        if (mobileAdminNavItem) mobileAdminNavItem.style.display = 'flex';
        if (drawerAdminSection) drawerAdminSection.style.display = 'block';
    } else {
        if (adminBtn) adminBtn.style.display = 'none';
        if (allPerformancesBtn) allPerformancesBtn.style.display = 'none';
        if (mobileAdminNavItem) mobileAdminNavItem.style.display = 'none';
        if (drawerAdminSection) drawerAdminSection.style.display = 'none';
    }
    
    // Centro de Control exclusivo OWNER
    const ownerBtn = document.getElementById('ownerBtn');
    if (user.role === 'OWNER') {
        if (ownerBtn) ownerBtn.style.display = 'inline-flex';
        if (drawerOwnerBtn) drawerOwnerBtn.style.display = 'flex';
    } else {
        if (ownerBtn) ownerBtn.style.display = 'none';
        if (drawerOwnerBtn) drawerOwnerBtn.style.display = 'none';
    }
}

// ============================================
// PWA - FUNCIONALIDADES DE INSTALACI��?N Y OFFLINE
// ============================================

// Variable global para el evento de instalaci��?n
let deferredPrompt = null;

// Registrar Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('? SW registrado:', registration.scope);

        // Manejar actualizaciones
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nueva versi��?n disponible
              showUpdateNotification(newWorker);
            }
          });
        });

      } catch (error) {
        console.error('? Error registrando SW:', error);
      }
    });
  }
}

// Mostrar notificaci��?n de actualizaci��?n disponible
function showUpdateNotification(worker) {
  // Verificar si ya existe un toast
  if (document.querySelector('.update-toast')) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast update-toast';
  toast.innerHTML = `
    <div class="update-content">
      <span>?? Nueva versi��?n disponible</span>
      <button onclick="window.updateApp()" class="btn-primary">Actualizar ahora</button>
      <button onclick="this.parentElement.parentElement.remove()" class="btn-secondary">M����s tarde</button>
    </div>
  `;
  document.body.appendChild(toast);

  window.updateApp = () => {
    if (worker) {
      worker.postMessage('SKIP_WAITING');
    }
    window.location.reload();
  };
}

// Manejar evento beforeinstallprompt (instalaci��?n de la app)
function handleInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('?? App instalable detectada');
    e.preventDefault();
    deferredPrompt = e;
    
    // Mostrar bot��?n de instalaci��?n personalizado
    showInstallButton();
  });

  // Detectar si la app ya est���� instalada
  window.addEventListener('appinstalled', () => {
    console.log('? App instalada correctamente');
    deferredPrompt = null;
    hideInstallButton();
    showToast('? PARAGUAY-FFAA | METALSTORM instalado en tu dispositivo', 'success');
  });
}

// Mostrar bot��?n de instalaci��?n
function showInstallButton() {
  // Verificar si ya existe
  if (document.getElementById('installBtn')) return;

  const installBtn = document.createElement('button');
  installBtn.id = 'installBtn';
  installBtn.className = 'btn-install';
  installBtn.innerHTML = '?? Instalar App';
  installBtn.onclick = installApp;
  
  // Insertar en el header si existe
  const headerActions = document.querySelector('.header-actions');
  if (headerActions) {
    headerActions.insertBefore(installBtn, headerActions.firstChild);
  } else {
    // Fallback: insertar despu��|s del header
    const header = document.getElementById('headerContainer');
    if (header) {
      header.appendChild(installBtn);
    }
  }
}

// Ocultar bot��?n de instalaci��?n
function hideInstallButton() {
  const btn = document.getElementById('installBtn');
  if (btn) btn.remove();
}

// Instalar la aplicaci��?n
async function installApp() {
  if (!deferredPrompt) {
    showToast('?? La app ya est���� instalada o no es instalable', 'warning');
    return;
  }

  deferredPrompt.prompt();
  
  const { outcome } = await deferredPrompt.userChoice;
  console.log('Resultado de instalaci��?n:', outcome);
  
  if (outcome === 'accepted') {
    console.log('Usuario acept��? instalar');
  }
  
  deferredPrompt = null;
  hideInstallButton();
}

// Detectar si estamos en modo standalone (app instalada)
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true; // iOS
}

// Ajustes espec��aficos cuando es app instalada
function applyStandaloneStyles() {
  if (isStandalone()) {
    document.body.classList.add('standalone-mode');
    
    // Ajustar altura para evitar notch en iOS
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');
    
    console.log('?? App ejecut����ndose en modo standalone');
  }
}

// Verificar conexi��?n y mostrar estado
function monitorConnection() {
  function updateConnectionStatus() {
    const isOnline = navigator.onLine;
    document.body.classList.toggle('offline', !isOnline);
    
    if (!isOnline) {
      showToast('?? Modo offline - Datos guardados localmente', 'warning', 3000);
    }
  }

  window.addEventListener('online', () => {
    showToast('?? Conexi��?n restaurada', 'success', 3000);
    document.body.classList.remove('offline');
  });

  window.addEventListener('offline', updateConnectionStatus);
  updateConnectionStatus();
}

// Inicializar PWA
function initPWA() {
  registerServiceWorker();
  handleInstallPrompt();
  applyStandaloneStyles();
  monitorConnection();
  
  // Log de estado
  console.log('?? Modo:', isStandalone() ? 'Standalone (App)' : 'Browser');
}

// Modificar initApp para incluir PWA
const originalInitApp = initApp;
initApp = function() {
  if (typeof originalInitApp === 'function') {
    originalInitApp();
  }
  
  // Inicializar PWA despu��|s de que la app est��| lista
  setTimeout(() => {
    initPWA();
  }, 1000);
};

// Exponer funciones globales
window.ffaaPWA = {
  install: installApp,
  isStandalone: isStandalone,
  checkForUpdates: () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.update();
      });
    }
  }
};