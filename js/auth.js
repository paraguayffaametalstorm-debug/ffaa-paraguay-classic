/**
 * PARAGUAY-FFAA | METALSTORM v2.0 - Autenticación y Sesión
 * ✅ SINCRONIZADO CON NUEVA BD (user_id INTEGER)
 * ✅ Incluye cambio de contraseña obligatorio para usuarios nuevos
 * ✅ Integrado con Sistema de Ayuda & Tour
 * Actualizado: 12 de febrero de 2026
 */

// ========== VERIFICAR ESTADO DE AUTENTICACIÓN ==========
function checkAuthStatus() {
  // 1. Verificar parámetros de URL para Google OAuth (token o error)
  const urlParams = new URLSearchParams(window.location.search);
  const oauthToken = urlParams.get('token');
  const authError = urlParams.get('auth_error');

  if (authError) {
    showToast(decodeURIComponent(authError), 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (oauthToken) {
    localStorage.setItem('authToken', oauthToken);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

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

// ========== INICIAR SESIÓN CON GOOGLE OAUTH ==========
function loginWithGoogle() {
  const width = 500;
  const height = 650;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const googleUrl = `${API_BASE}/api/auth/google`;

  console.log('🌐 Iniciando flujo Google OAuth...');

  // Listener para recibir el resultado desde la ventana emergente
  const messageHandler = (event) => {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
      window.removeEventListener('message', messageHandler);
      console.log('✅ Google OAuth autenticado exitosamente');
      
      const { token, user } = event.data;
      if (token) {
        localStorage.setItem('authToken', token);
      }
      if (user) {
        currentUser = user;
      }

      closeModal('loginModal');

      if (user?.must_change_password) {
        showPasswordChangeModal();
        return;
      }

      updateUserUI(currentUser);
      showToast(`✅ Bienvenido, [PRY] ${currentUser?.nick || currentUser?.email}`, 'success');
      markUserOnline();
      showView('appView');

      const helpFab = document.getElementById('helpFab');
      if (helpFab) helpFab.style.display = '';
      if (typeof initHelpSystem === 'function') initHelpSystem();
    } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
      window.removeEventListener('message', messageHandler);
      console.warn('❌ Google OAuth error recibido:', event.data.error);
      showToast(event.data.error || 'Error en inicio con Google', 'error');
    }
  };

  window.addEventListener('message', messageHandler);

  const popup = window.open(
    googleUrl,
    'GoogleAuthFFAA',
    `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
  );

  // Si el navegador bloqueó la apertura de ventana emergente, redirigir en la pestaña actual
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    console.warn('⚠️ Ventana emergente bloqueada, redirigiendo en la misma pestaña...');
    window.location.href = googleUrl;
  }
}

// ========== RECUPERACIÓN DE CONTRASEÑA ==========

function showForgotPassword() {
  closeModal('loginModal');
  if (typeof showModal === 'function') {
    showModal('forgotPasswordModal');
  }
  
  // Limpiar campos y mensajes
  const forgotEmail = document.getElementById('forgotEmail') || document.getElementById('resetEmail');
  const forgotAlert = document.getElementById('forgotAlert');
  
  if (forgotEmail) forgotEmail.value = '';
  if (forgotAlert) forgotAlert.style.display = 'none';
}

function backToLogin() {
  closeModal('forgotPasswordModal');
  showLoginModal();
}

async function handleForgotPassword() {
  const emailInput = document.getElementById('forgotEmail') || document.getElementById('resetEmail');
  const alertEl = document.getElementById('forgotAlert');
  const btnSubmit = document.getElementById('btnForgotSubmit');
  const btnText = document.getElementById('btnForgotText');
  const btnSpinner = document.getElementById('btnForgotSpinner');

  if (!emailInput) return;
  const email = emailInput.value.trim();

  if (!email) {
    showToast('⚠️ Ingresa tu correo registrado', 'warning');
    if (alertEl) {
      alertEl.textContent = 'Por favor ingresa tu correo registrado en el escuadrón.';
      alertEl.style.background = 'rgba(248, 113, 113, 0.15)';
      alertEl.style.border = '1px solid var(--red-danger)';
      alertEl.style.color = '#FFAAA6';
      alertEl.style.display = 'block';
    }
    return;
  }

  // Estado de carga
  if (btnSubmit) btnSubmit.disabled = true;
  if (btnText) btnText.textContent = 'Enviando...';
  if (btnSpinner) btnSpinner.style.display = 'inline-block';
  if (alertEl) alertEl.style.display = 'none';

  try {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (alertEl) {
      alertEl.textContent = data.message || 'Si el correo está registrado en el escuadrón, recibirás un enlace de restablecimiento (15 min).';
      alertEl.style.background = 'rgba(74, 222, 128, 0.15)';
      alertEl.style.border = '1px solid var(--green-tactical)';
      alertEl.style.color = '#86EFAC';
      alertEl.style.display = 'block';
    }

    showToast('✅ Instrucciones enviadas a tu correo', 'success');
    emailInput.value = '';

    setTimeout(() => {
      closeModal('forgotPasswordModal');
      showLoginModal();
      if (alertEl) alertEl.style.display = 'none';
      if (btnSubmit) btnSubmit.disabled = false;
      if (btnText) btnText.textContent = 'Enviar Enlace';
      if (btnSpinner) btnSpinner.style.display = 'none';
    }, 3500);

  } catch (err) {
    console.error('❌ Error en forgotPassword:', err);
    if (alertEl) {
      alertEl.textContent = 'Error de conexión con el servidor táctico.';
      alertEl.style.background = 'rgba(248, 113, 113, 0.15)';
      alertEl.style.border = '1px solid var(--red-danger)';
      alertEl.style.color = '#FFAAA6';
      alertEl.style.display = 'block';
    }
    showToast('❌ Error de conexión al solicitar restablecimiento', 'error');
    if (btnSubmit) btnSubmit.disabled = false;
    if (btnText) btnText.textContent = 'Enviar Enlace';
    if (btnSpinner) btnSpinner.style.display = 'none';
  }
}

// Alias para compatibilidad
const requestPasswordReset = handleForgotPassword;

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

        if (!response.ok) {
            throw new Error(data.error || 'Error al cambiar la contraseña');
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
            showToast('❌ Completa todos los campos', 'error');
            return;
        }

        if (newPass !== confirm) {
            showToast('❌ Las contraseñas no coinciden', 'error');
            return;
        }

        if (newPass.length < 6) {
            showToast('❌ La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }

        const result = await changePasswordFromProfile(current, newPass);

        if (result.success) {
            showToast('✅ Contraseña actualizada correctamente', 'success');
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
            showToast('❌ ' + (result.error || 'Error al cambiar la contraseña'), 'error');
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
window.loginWithGoogle = loginWithGoogle;
window.showForgotPassword = showForgotPassword;
window.handleForgotPassword = handleForgotPassword;
window.requestPasswordReset = requestPasswordReset;
window.changePasswordFromProfile = changePasswordFromProfile;
window.handleChangePassword = handleChangePassword;
window.resetUserPassword = resetUserPassword;