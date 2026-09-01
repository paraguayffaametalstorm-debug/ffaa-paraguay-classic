/**
 * PARAGUAY-FFAA | METALSTORM v2.0 - Autenticación y Sesión
 * ✅ SINCRONIZADO CON NUEVA BD (user_id INTEGER)
 * ✅ Incluye cambio de contraseña obligatorio para usuarios nuevos
 * ✅ Integrado con Sistema de Ayuda & Tour
 * Actualizado: 12 de febrero de 2026
 */

// ========== VERIFICAR ESTADO DE AUTENTICACIÓN ==========
function checkAuthStatus() {
  const token = localStorage.getItem('authToken');
  
  // ✅ SI NO HAY TOKEN → MOSTRAR LOGIN INMEDIATAMENTE
  if (!token) {
    console.log('🔒 No hay token - mostrando login');
    showLoginModal();
    return;
  }
  
  // ✅ SI HAY TOKEN → VERIFICAR CON EL BACKEND
  console.log('🔑 Token encontrado - verificando con backend...');
  
  fetch(`${API_BASE}/api/auth/verify`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => {
    if (res.ok) {
      return res.json();
    } else {
      throw new Error('Token inválido o expirado');
    }
  })
  .then(data => {
    console.log('✅ Token válido - mostrando dashboard');
    currentUser = data.user;
    
    // ✅ VERIFICACIÓN CRÍTICA: currentUser.user_id DEBE ser INTEGER
    if (!Number.isInteger(currentUser.user_id)) {
      console.error('❌ ERROR CRÍTICO: user_id no es INTEGER', currentUser.user_id, 'tipo:', typeof currentUser.user_id);
      showToast('❌ Error de sincronización con BD (tipo incorrecto)', 'error');
      localStorage.removeItem('authToken');
      showLoginModal();
      return;
    }
    
    console.log(`✅ Usuario autenticado: ${currentUser.nick} (user_id: ${currentUser.user_id}, tipo: number)`);
    
    // 🔒 Verificar si debe cambiar contraseña
    if (currentUser.must_change_password) {
      console.log('⚠️ Debe cambiar contraseña');
      showPasswordChangeModal();
      return;
    }
    
    updateUserUI(currentUser);
    closeModal('loginModal');
    showView('appView');

    // ✅ AYUDA: Mostrar FAB e inicializar sistema de ayuda (sin tour en re-login)
    const helpFabCheck = document.getElementById('helpFab');
    if (helpFabCheck) helpFabCheck.style.display = '';
    if (typeof initHelpSystem === 'function') initHelpSystem();
  })
  .catch(err => {
    console.error('❌ Error verificando autenticación:', err);
    localStorage.removeItem('authToken');
    showLoginModal();
  });
}

// ========== LOGIN ==========
function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    showToast('⚠️ Completa todos los campos', 'warning');
    return;
  }
  
  console.log('🔐 Intentando login con:', email);
  
  fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })
  .then(res => {
    if (res.ok) {
      return res.json();
    } else {
      return res.json().then(err => { 
        throw new Error(err.error || 'Credenciales incorrectas'); 
      });
    }
  })
  .then(data => {
    console.log('✅ Login exitoso');
    localStorage.setItem('authToken', data.token);
    
    currentUser = data.user;
    
    // ✅ VERIFICACIÓN CRÍTICA: currentUser.user_id DEBE ser INTEGER
    if (!Number.isInteger(currentUser.user_id)) {
      console.error('❌ ERROR CRÍTICO: user_id no es INTEGER después de login', currentUser.user_id);
      showToast('❌ Error de sincronización con BD (tipo incorrecto)', 'error');
      localStorage.removeItem('authToken');
      return;
    }
    
    console.log(`✅ user_id verificado: ${currentUser.user_id} (tipo: number)`);
    
    // 🔒 Verificar si debe cambiar contraseña
    if (currentUser.must_change_password) {
      console.log('⚠️ Debe cambiar contraseña');
      showPasswordChangeModal();
      return;
    }
    
    // ✅ Flujo normal (contraseña ya cambiada)
    updateUserUI(currentUser);
    closeModal('loginModal');
    showToast(`✅ Bienvenido, ${currentUser.nick || currentUser.email}`, 'success');
    
    // Marcar usuario como online
    markUserOnline();
    
    // ✅ MOSTRAR DASHBOARD
    showView('appView');

    // ✅ AYUDA: Mostrar FAB, inicializar sistema de ayuda, lanzar tour si es primera vez
    const helpFab = document.getElementById('helpFab');
    if (helpFab) helpFab.style.display = '';
    if (typeof initHelpSystem === 'function') initHelpSystem();
    if (typeof startTourIfFirstTime === 'function') setTimeout(startTourIfFirstTime, 800);
  })
  .catch(err => {
    console.error('❌ Error en login:', err);
    showToast('❌ ' + err.message, 'error');
  });
}

// ========== LOGOUT ==========
function logout() {
  console.log('👋 Cerrando sesión...');
  
  // Marcar usuario como offline
  markUserOffline();
  
  localStorage.removeItem('authToken');
  localStorage.removeItem('tempToken');
  currentUser = null;
  
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
  }
  
  // Detener polling de usuarios conectados
  stopOnlineUsersPolling();
  
  // Ocultar/Mostrar botones de login/logout
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (loginBtn) loginBtn.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'none';
  
  // ✅ AYUDA: Ocultar FAB al cerrar sesión
  const helpFabLogout = document.getElementById('helpFab');
  if (helpFabLogout) helpFabLogout.style.display = 'none';
  
  showToast('👋 Sesión cerrada correctamente', 'info');
  
  // ✅ VOLVER A MOSTRAR LOGIN
  setTimeout(() => {
    showLoginModal();
  }, 1000);
}

// ========== OBTENER HEADERS DE AUTENTICACIÓN ==========
function getAuthHeaders() {
  const token = localStorage.getItem('authToken') || localStorage.getItem('tempToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}
window.getAuthHeaders = getAuthHeaders;

// ========== TOGGLE VISIBILITY DE PASSWORD ==========
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

// ========== MODALES GENERALES ==========
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

function showLoginModal() {
  // Verificar que la función showModal existe (de utils.js)
  if (typeof showModal === 'function') {
    showModal('loginModal');
  } else {
    // Fallback manual si utils.js no cargó
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.classList.add('show');
    }
  }
  
  // Limpiar campos
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  if (emailInput) emailInput.value = '';
  if (passwordInput) passwordInput.value = '';
  
  // Ocultar todas las vistas
  document.querySelectorAll('.view').forEach(view => {
    view.style.display = 'none';
  });
}

// ========== MODAL DE CAMBIO DE CONTRASEÑA OBLIGATORIO ==========
function showPasswordChangeModal() {
  // Cerrar cualquier otro modal abierto
  closeModal('loginModal');
  
  // Verificar si ya existe el modal, si no, crearlo
  let modal = document.getElementById('passwordChangeModal');
  if (!modal) {
    const html = `
      <div id="passwordChangeModal" class="modal show">
        <div class="modal-content">
          <h2>🔒 Cambio de Contraseña Obligatorio</h2>
          <p>Por razones de seguridad, debes cambiar tu contraseña temporal antes de continuar.</p>
          <input type="password" id="newPassword" placeholder="Nueva contraseña (mínimo 8 caracteres)" />
          <input type="password" id="confirmPassword" placeholder="Confirmar contraseña" />
          <div class="modal-actions">
            <button onclick="changeTemporaryPassword()" class="btn-primary">Actualizar Contraseña</button>
          </div>
          <div id="passwordChangeError" class="error-message" style="display:none;"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    modal = document.getElementById('passwordChangeModal');
  } else {
    modal.classList.add('show');
  }
}

async function changeTemporaryPassword() {
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorDiv = document.getElementById('passwordChangeError');

  if (!newPassword || newPassword.length < 8) {
    showError('La contraseña debe tener al menos 8 caracteres');
    return;
  }

  if (newPassword !== confirmPassword) {
    showError('Las contraseñas no coinciden');
    return;
  }

  function showError(msg) {
    if (errorDiv) {
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
    } else {
      alert(msg);
    }
  }

  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPassword })
    });

    if (response.ok) {
      // Cerrar modal
      const modal = document.getElementById('passwordChangeModal');
      if (modal) modal.classList.remove('show');

      // Actualizar el usuario en memoria (ya no debe cambiar contraseña)
      currentUser.must_change_password = false;

      // Continuar con el flujo normal
      updateUserUI(currentUser);
      showToast('✅ Contraseña actualizada correctamente', 'success');
      markUserOnline();
      showView('appView');
    } else {
      const error = await response.json();
      showError(error.error || 'No se pudo cambiar la contraseña');
    }
  } catch (err) {
    console.error('Error:', err);
    showError('Error al cambiar la contraseña');
  }
}

// ========== RECUPERACIÓN DE CONTRASEÑA ==========

function showForgotPassword() {
  closeModal('loginModal');
  showModal('forgotPasswordModal');
  
  // Limpiar campos y mensajes
  const resetEmail = document.getElementById('resetEmail');
  const resetSuccess = document.getElementById('resetSuccess');
  const resetError = document.getElementById('resetError');
  
  if (resetEmail) resetEmail.value = '';
  if (resetSuccess) resetSuccess.style.display = 'none';
  if (resetError) resetError.style.display = 'none';
}

function backToLogin() {
  closeModal('forgotPasswordModal');
  showLoginModal();
}

async function requestPasswordReset() {
  const emailInput = document.getElementById('resetEmail');
  if (!emailInput) return;
  
  const email = emailInput.value.trim();
  
  if (!email) {
    showToast('⚠️ Ingresa tu correo institucional', 'warning');
    return;
  }
  
  if (!email.endsWith('@ffaa.py')) {
    showToast('⚠️ Solo correos institucionales (@ffaa.py)', 'warning');
    return;
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al enviar instrucciones');
    }
    
    // Mostrar éxito
    const resetSuccess = document.getElementById('resetSuccess');
    const resetError = document.getElementById('resetError');
    
    if (resetSuccess) resetSuccess.style.display = 'block';
    if (resetError) resetError.style.display = 'none';
    if (emailInput) emailInput.value = '';
    
    showToast('✅ Instrucciones enviadas a tu correo', 'success');
    
    // Cerrar modal después de 3 segundos
    setTimeout(() => {
      closeModal('forgotPasswordModal');
      showLoginModal();
    }, 3000);
    
  } catch (err) {
    console.error('Error:', err);
    const resetError = document.getElementById('resetError');
    const resetSuccess = document.getElementById('resetSuccess');
    
    if (resetError) resetError.style.display = 'block';
    if (resetSuccess) resetSuccess.style.display = 'none';
    showToast('❌ ' + err.message, 'error');
  }
}

// ========== MANEJO DE PRESENCIA (USUARIOS CONECTADOS) ==========

// Marcar usuario como conectado al hacer login
function markUserOnline() {
  if (!currentUser) return;
  
  fetch(`${API_BASE}/api/presence/online`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  .then(res => {
    if (res.ok) {
      console.log('✅ Usuario marcado como online');
      // Iniciar actualización periódica del contador
      startOnlineUsersPolling();
    }
  })
  .catch(err => {
    console.error('Error marcando usuario online:', err);
  });
}

// Marcar usuario como desconectado al hacer logout
function markUserOffline() {
  if (!currentUser) return;
  
  fetch(`${API_BASE}/api/presence/offline`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  .then(res => {
    if (res.ok) {
      console.log('✅ Usuario marcado como offline');
    }
  })
  .catch(err => {
    console.error('Error marcando usuario offline:', err);
  });
}

// Obtener y mostrar usuarios conectados (solo actualiza el span)
function loadOnlineUsers() {
  fetch(`${API_BASE}/api/presence/active`, {
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(data => {
    if (data.count !== undefined) {
      const onlineCountEl = document.getElementById('onlineCount');
      if (onlineCountEl) {
        onlineCountEl.textContent = data.count;
      }
    }
  })
  .catch(err => {
    console.error('Error cargando usuarios conectados:', err);
  });
}

// Iniciar polling periódico (cada 30 segundos)
let onlinePollingInterval = null;

function startOnlineUsersPolling() {
  // Detener polling anterior si existe
  if (onlinePollingInterval) {
    clearInterval(onlinePollingInterval);
  }
  
  // Cargar inmediatamente
  loadOnlineUsers();
  
  // Cargar cada 30 segundos
  onlinePollingInterval = setInterval(loadOnlineUsers, 30000);
}

function stopOnlineUsersPolling() {
  if (onlinePollingInterval) {
    clearInterval(onlinePollingInterval);
    onlinePollingInterval = null;
  }
}