/**
 * PARAGUAY-FFAA | METALSTORM v2.0 - Autenticación y Sesión
 * ✅ SINCRONIZADO CON NUEVA BD (user_id INTEGER)
 * ✅ Incluye cambio de contraseña obligatorio para usuarios nuevos
 * ✅ Integrado con Sistema de Ayuda & Tour
 * Actualizado: 12 de febrero de 2026
 */

// ========== MANEJAR RETORNO DE OAUTH 2.0 (GOOGLE) ==========
function handleOAuthCallback() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('auth_token') || urlParams.get('token');
    const error = urlParams.get('auth_error') || urlParams.get('error');

    if (token) {
      console.log('🔑 Token táctico recibido por callback OAuth');
      localStorage.setItem('authToken', token);

      // Limpiar parámetros de la URL sin recargar
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);

      if (typeof showToast === 'function') {
        showToast('✅ Identificación militar validada con Google', 'success');
      }
      return true;
    }

    if (error) {
      console.warn('⚠️ Error de autenticación OAuth recibido:', error);
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);

      const errorDecoded = decodeURIComponent(error);
      if (typeof showToast === 'function') {
        showToast(`❌ ${errorDecoded}`, 'error');
      }
      return false;
    }
  } catch (e) {
    console.error('❌ Error procesando parámetros OAuth:', e);
  }
  return null;
}

// ========== INICIAR SESIÓN CON GOOGLE OAUTH 2.0 ==========
function loginWithGoogle() {
  const btn = document.getElementById('googleLoginBtn');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.75';
    btn.innerHTML = `
      <span style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;"></span>
      <span>Conectando con Google...</span>
    `;
  }

  console.log('🔗 Redirigiendo a autenticación con Google OAuth 2.0...');
  const apiBase = (typeof API_BASE !== 'undefined' && API_BASE) ? API_BASE : '';
  window.location.href = `${apiBase}/api/auth/google`;
}

// ========== VERIFICAR ESTADO DE AUTENTICACIÓN ==========
function checkAuthStatus() {
  // 1. Manejar callback de Google OAuth si está presente en la URL
  handleOAuthCallback();

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
  
  if (typeof sessionTimeout !== 'undefined' && sessionTimeout) {
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
  if (typeof showModal === 'function') {
    showModal('forgotPasswordModal');
  }
  
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

async function requestPasswordReset(customEmail = '') {
  let email = (typeof customEmail === 'string' && customEmail.trim()) ? customEmail.trim() : '';
  
  if (!email) {
    const emailInput = document.getElementById('forgotEmail') || document.getElementById('resetEmail');
    if (emailInput) {
      email = emailInput.value.trim();
    }
  }
  
  if (!email) {
    showToast('⚠️ Ingresa tu correo (institucional o Gmail)', 'warning');
    const msg = document.getElementById('forgotMessage');
    if (msg) {
      msg.textContent = 'Por favor ingresa tu correo electrónico';
      msg.className = 'status-message error';
      msg.style.display = 'block';
    }
    return;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('⚠️ Formato de correo inválido', 'warning');
    const msg = document.getElementById('forgotMessage');
    if (msg) {
      msg.textContent = 'Formato de correo inválido';
      msg.className = 'status-message error';
      msg.style.display = 'block';
    }
    return;
  }
  
  const submitBtn = document.getElementById('btnSendReset') || document.getElementById('forgotSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Enviando...';
  }
  
  try {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    
    if (!res.ok || data.success === false) {
      throw new Error(data.error || 'Error al enviar instrucciones de restablecimiento');
    }
    
    // Mostrar éxito en el modal si existen los elementos
    const resetSuccess = document.getElementById('resetSuccess');
    const resetError = document.getElementById('resetError');
    const forgotMsg = document.getElementById('forgotMessage');
    const emailInput = document.getElementById('forgotEmail') || document.getElementById('resetEmail');
    
    if (resetSuccess) resetSuccess.style.display = 'block';
    if (resetError) resetError.style.display = 'none';
    if (forgotMsg) {
      forgotMsg.textContent = data.message || 'Instrucciones enviadas. Revisa tu casilla.';
      forgotMsg.className = 'status-message success';
      forgotMsg.style.display = 'block';
    }
    if (emailInput) emailInput.value = '';
    
    showToast('✅ ' + (data.message || 'Instrucciones enviadas a tu correo'), 'success');
    
    // Cerrar modal después de 3.5 segundos
    setTimeout(() => {
      if (typeof closeModal === 'function') {
        closeModal('forgotPasswordModal');
      }
      if (typeof showLoginModal === 'function') {
        showLoginModal();
      }
    }, 3500);
    
    return data;
    
  } catch (err) {
    console.error('Error al solicitar restablecimiento de contraseña:', err);
    const resetError = document.getElementById('resetError');
    const resetSuccess = document.getElementById('resetSuccess');
    const forgotMsg = document.getElementById('forgotMessage');
    
    if (resetError) resetError.style.display = 'block';
    if (resetSuccess) resetSuccess.style.display = 'none';
    if (forgotMsg) {
      forgotMsg.textContent = err.message || 'Error al procesar la solicitud';
      forgotMsg.className = 'status-message error';
      forgotMsg.style.display = 'block';
    }
    showToast('❌ ' + err.message, 'error');
    throw err;
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      if (submitBtn.dataset.originalText) {
        submitBtn.innerHTML = submitBtn.dataset.originalText;
      }
    }
  }
}

// Wrapper para compatibilidad con el modal
async function handleForgotPassword() {
  return await requestPasswordReset();
}

/**
 * Confirmar restablecimiento de contraseña con token
 * @param {string} token
 * @param {string} newPassword
 */
async function confirmPasswordReset(token, newPassword) {
  if (!token || !newPassword) {
    throw new Error('Token y nueva contraseña son requeridos');
  }
  if (newPassword.length < 8) {
    throw new Error('La nueva contraseña debe tener al menos 8 caracteres');
  }
  
  const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: token.trim(),
      newPassword
    })
  });
  
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || 'Error al restablecer la contraseña');
  }
  return data;
}

/**
 * Verificar estado de Google OAuth y vinculación de un correo
 * @param {string} email
 */
async function checkGoogleStatus(email = '') {
  try {
    const url = email 
      ? `${API_BASE}/api/auth/google/status?email=${encodeURIComponent(email.trim())}`
      : `${API_BASE}/api/auth/google/status`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error consultando estado de Google');
    return await res.json();
  } catch (err) {
    console.error('Error al verificar estado de Google OAuth:', err);
    return { enabled: false, linked: false };
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

// ========================================================================
// ========== NUEVAS FUNCIONALIDADES AGREGADAS (CAMBIO DESDE PERFIL) ======
// ========================================================================

// ========== CAMBIO DE CONTRASEÑA DESDE PERFIL ==========
async function changePasswordFromProfile(currentPassword, newPassword) {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error('No hay sesión activa');
        }

        const response = await fetch(`${API_BASE}/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(data.message || data.error || 'Error al cambiar la contraseña');
        }

        // Actualizar nuevo token para mantener la sesión válida con el nuevo token_version
        const newToken = data.token || data.data?.token;
        if (newToken) {
            localStorage.setItem('authToken', newToken);
            if (window.currentUser) {
                window.currentUser.token_version = (window.currentUser.token_version || 0) + 1;
            }
        }

        return data;

    } catch (error) {
        console.error('❌ Error en changePasswordFromProfile:', error);
        throw error;
    }
}

// ========== MANEJAR CAMBIO DE CONTRASEÑA DESDE PERFIL ==========
async function handleChangePassword() {
    try {
        const current = document.getElementById('currentPassword')?.value;
        const newPass = document.getElementById('newPassword')?.value;
        const confirm = document.getElementById('confirmPassword')?.value;

        if (!current || !newPass || !confirm) {
            showToast('❌ Completa todos los campos tácticos', 'error');
            return;
        }

        if (newPass !== confirm) {
            showToast('❌ Las nuevas contraseñas no coinciden', 'error');
            return;
        }

        if (newPass.length < 8) {
            showToast('❌ La clave táctica debe tener al menos 8 caracteres', 'error');
            return;
        }

        const result = await changePasswordFromProfile(current, newPass);

        if (result.success) {
            showToast('✅ ' + (result.message || 'Contraseña táctica actualizada correctamente'), 'success');
            // Limpiar campos
            const currentPassEl = document.getElementById('currentPassword');
            const newPassEl = document.getElementById('newPassword');
            const confirmPassEl = document.getElementById('confirmPassword');
            
            if (currentPassEl) currentPassEl.value = '';
            if (newPassEl) newPassEl.value = '';
            if (confirmPassEl) confirmPassEl.value = '';
            
            // Cerrar modal si existe
            if (typeof closeModal === 'function') {
                closeModal('changePasswordModal');
            }
        } else {
            showToast('❌ ' + (result.message || result.error || 'Error al cambiar la contraseña'), 'error');
        }

    } catch (error) {
        console.error('❌ Error en handleChangePassword:', error);
        showToast('❌ ' + error.message, 'error');
    }
}

// ========== RESETEAR CONTRASEÑA DE USUARIO (ADMIN) ==========
async function resetUserPassword(userId) {
    if (!confirm('¿Estás seguro de resetear la contraseña de este usuario a "123456"?')) {
        return;
    }

    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE}/api/admin/users/${userId}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al resetear la contraseña');
        }

        showToast('✅ ' + data.message, 'success');
        // Recargar lista de usuarios si existe la función
        if (typeof loadMembersList === 'function') {
            loadMembersList();
        }

    } catch (error) {
        console.error('❌ Error en resetUserPassword:', error);
        showToast('❌ ' + error.message, 'error');
    }
}

// Exportar funciones para uso global
window.changePasswordFromProfile = changePasswordFromProfile;
window.handleChangePassword = handleChangePassword;
window.resetUserPassword = resetUserPassword;
window.loginWithGoogle = loginWithGoogle;
window.handleOAuthCallback = handleOAuthCallback;
window.handleGoogleOAuthCallback = handleOAuthCallback;
window.requestPasswordReset = requestPasswordReset;
window.handleForgotPassword = handleForgotPassword;
window.confirmPasswordReset = confirmPasswordReset;
window.checkGoogleStatus = checkGoogleStatus;
window.showForgotPassword = showForgotPassword;
window.backToLogin = backToLogin;

// Listener de seguridad para el botón de Google en el DOM
document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loginWithGoogle();
        });
    }
});