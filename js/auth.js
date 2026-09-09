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

      const mustChange = urlParams.get('must_change_password');
      if (mustChange === 'true') {
        sessionStorage.setItem('must_change_password', 'true');
      }

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
    window.currentUser = currentUser;

    // 🔔 ACTUALIZAR UI PARA TODOS LOS ROLES (MIEMBRO, VETERANO, ADMIN, OWNER)
    if (typeof updateUserUI === 'function') {
      updateUserUI(currentUser);
    }
    
    // 🔒 Verificar si debe cambiar contraseña (por base de datos o por bandera en sesión)
    const sessionMustChange = sessionStorage.getItem('must_change_password') === 'true';
    if (currentUser.must_change_password || sessionMustChange) {
      console.log('⚠️ Debe cambiar contraseña de combate (forzado)');
      sessionStorage.setItem('must_change_password', 'true');
      showPasswordChangeModal({ forced: true });
      return;
    }
    
    if (typeof updateUserUI === 'function') {
      updateUserUI(currentUser);
    }
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
    sessionStorage.removeItem('must_change_password');
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
    window.currentUser = currentUser;

    // 🔔 ACTUALIZAR UI INMEDIATAMENTE PARA TODOS LOS ROLES (MIEMBRO, VETERANO, ADMIN, OWNER)
    if (typeof updateUserUI === 'function') {
      updateUserUI(currentUser);
    }
    
    // 🔒 Verificar si debe cambiar contraseña
    if (currentUser.must_change_password) {
      console.log('⚠️ Debe cambiar contraseña (forzado)');
      sessionStorage.setItem('must_change_password', 'true');
      showPasswordChangeModal({ forced: true });
      return;
    }
    
    // ✅ Flujo normal (contraseña ya cambiada)
    sessionStorage.removeItem('must_change_password');
    if (typeof updateUserUI === 'function') {
      updateUserUI(currentUser);
    }
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
  sessionStorage.removeItem('must_change_password');
  currentUser = null;
  window.currentUser = null;
  
  if (typeof sessionTimeout !== 'undefined' && sessionTimeout) {
    clearTimeout(sessionTimeout);
  }
  
  // Detener polling de usuarios conectados
  stopOnlineUsersPolling();
  
  // Ocultar/Mostrar botones de login/logout en Desktop y Mobile Drawer
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const drawerLoginBtn = document.getElementById('drawerLoginBtn');
  const drawerLogoutBtn = document.getElementById('drawerLogoutBtn');
  
  if (loginBtn) loginBtn.style.display = 'inline-flex';
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (drawerLoginBtn) drawerLoginBtn.style.display = 'block';
  if (drawerLogoutBtn) drawerLogoutBtn.style.display = 'none';

  // Limpiar identificación de usuario
  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = '';
  const userRoleEl = document.getElementById('userRole');
  if (userRoleEl) userRoleEl.innerHTML = '';
  const drawerUserNickEl = document.getElementById('drawerUserNick');
  if (drawerUserNickEl) drawerUserNickEl.textContent = '';
  const drawerUserRoleEl = document.getElementById('drawerUserRole');
  if (drawerUserRoleEl) drawerUserRoleEl.innerHTML = '';
  
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

// ========== MODAL DE CAMBIO DE CONTRASEÑA (SISTEMA MILITAR TÁCTICO) ==========

/**
 * Muestra el modal táctico de cambio de contraseña.
 * Puede ser en modo forzado (primer login o flag must_change_password) o voluntario.
 * @param {Object} options - { forced: boolean }
 */
async function showPasswordChangeModal(options = { forced: false }) {
  // Asegurar que la interfaz táctica refleje la sesión activa y botón de cerrar sesión
  if (currentUser && typeof updateUserUI === 'function') {
    updateUserUI(currentUser);
  }

  // Determinar si es forzado por opciones, por currentUser o por sessionStorage
  const isForced = Boolean(
    options?.forced || 
    currentUser?.must_change_password || 
    sessionStorage.getItem('must_change_password') === 'true'
  );

  // Guardar flag en sessionStorage para persistencia temporal
  if (isForced) {
    sessionStorage.setItem('must_change_password', 'true');
  }

  // Cerrar loginModal si está abierto
  closeModal('loginModal');

  // Buscar si el modal ya está en el DOM
  let modal = document.getElementById('changePasswordModal');
  if (!modal) {
    try {
      console.log('📥 Cargando dinámicamente /components/change-password-modal.html...');
      const response = await fetch('/components/change-password-modal.html');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      
      const container = document.getElementById('modalsContainer') || document.body;
      container.insertAdjacentHTML('beforeend', html);
      modal = document.getElementById('changePasswordModal');
    } catch (err) {
      console.error('❌ Error cargando change-password-modal:', err);
      showToast('❌ Error cargando módulo de cambio de contraseña', 'error');
      return;
    }
  }

  if (!modal) {
    console.error('❌ Modal changePasswordModal no se encontró tras inserción');
    return;
  }

  // Guardar estado en dataset del modal
  modal.dataset.forced = isForced ? 'true' : 'false';

  // Configurar elementos según modo forzado vs voluntario
  const currentGroup = document.getElementById('changeModalCurrentGroup');
  const forcedNotice = document.getElementById('changePasswordForcedNotice');
  const subtitle = document.getElementById('changePasswordSubtitle');
  const title = document.getElementById('changePasswordModalTitle');
  const cancelBtn = document.getElementById('btnChangePasswordCancel');
  const closeBtn = document.getElementById('changePasswordCloseBtn');
  const alertSuccess = document.getElementById('changePasswordAlertSuccess');
  const alertError = document.getElementById('changePasswordAlertError');

  if (currentGroup) currentGroup.style.display = isForced ? 'none' : 'block';
  if (forcedNotice) forcedNotice.style.display = isForced ? 'flex' : 'none';
  if (subtitle) {
    subtitle.textContent = isForced 
      ? 'PROTOCOLO C4ISR · ACTUALIZACIÓN OBLIGATORIA' 
      : 'SEGURIDAD MILITAR · CAMBIO DE CLAVE';
  }
  if (title) {
    title.textContent = isForced
      ? 'ACTUALIZACIÓN OBLIGATORIA DE CLAVE'
      : 'ACTUALIZACIÓN DE CLAVE TÁCTICA';
  }
  if (cancelBtn) {
    cancelBtn.textContent = isForced ? 'Cerrar Sesión' : 'Cancelar';
  }
  if (closeBtn) {
    closeBtn.style.display = isForced ? 'none' : 'inline-block';
  }

  // Limpiar campos y alertas
  const currentPassInput = document.getElementById('modalCurrentPassword');
  const newPassInput = document.getElementById('modalNewPassword');
  const confirmPassInput = document.getElementById('modalConfirmPassword');

  if (currentPassInput) currentPassInput.value = '';
  if (newPassInput) newPassInput.value = '';
  if (confirmPassInput) confirmPassInput.value = '';

  if (alertSuccess) alertSuccess.style.display = 'none';
  if (alertError) alertError.style.display = 'none';

  validateModalPasswordComplexity();

  // Mostrar modal
  showModal('changePasswordModal');
}

/**
 * Valida dinámicamente la complejidad de la clave en el modal
 */
function validateModalPasswordComplexity() {
  const newPass = document.getElementById('modalNewPassword')?.value || '';
  const confirmPass = document.getElementById('modalConfirmPassword')?.value || '';

  const hasLength = newPass.length >= 8;
  const hasUpper = /[A-Z]/.test(newPass);
  const hasLower = /[a-z]/.test(newPass);
  const hasNumber = /[0-9]/.test(newPass);

  const updateReq = (id, valid) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.color = valid ? '#4ADE80' : '#64748B';
    el.style.fontWeight = valid ? '600' : 'normal';
  };

  updateReq('reqLength', hasLength);
  updateReq('reqUpper', hasUpper);
  updateReq('reqLower', hasLower);
  updateReq('reqNumber', hasNumber);

  const matchEl = document.getElementById('reqMatch');
  if (matchEl) {
    if (confirmPass.length > 0) {
      matchEl.style.display = 'block';
      if (newPass === confirmPass) {
        matchEl.textContent = '✅ Las contraseñas coinciden';
        matchEl.style.color = '#4ADE80';
      } else {
        matchEl.textContent = '❌ Las contraseñas no coinciden';
        matchEl.style.color = '#F87171';
      }
    } else {
      matchEl.style.display = 'none';
    }
  }

  return hasLength && hasUpper && hasLower && hasNumber && (newPass === confirmPass);
}

/**
 * Cierre controlado del modal de contraseña
 */
function handleClosePasswordModal() {
  const modal = document.getElementById('changePasswordModal');
  const isForced = modal?.dataset.forced === 'true' || 
                   sessionStorage.getItem('must_change_password') === 'true' ||
                   Boolean(currentUser?.must_change_password);

  if (isForced) {
    if (confirm('⚠️ Por seguridad militar, debes cambiar tu clave antes de operar. ¿Deseas cerrar sesión?')) {
      closeModal('changePasswordModal');
      logout();
    }
  } else {
    closeModal('changePasswordModal');
  }
}

/**
 * Enviar actualización de contraseña desde el modal
 */
async function submitPasswordChangeModal(event) {
  if (event) event.preventDefault();

  const modal = document.getElementById('changePasswordModal');
  const isForced = modal?.dataset.forced === 'true' || 
                   sessionStorage.getItem('must_change_password') === 'true' ||
                   Boolean(currentUser?.must_change_password);

  const currentPass = document.getElementById('modalCurrentPassword')?.value || '';
  const newPass = document.getElementById('modalNewPassword')?.value || '';
  const confirmPass = document.getElementById('modalConfirmPassword')?.value || '';

  const alertError = document.getElementById('changePasswordAlertError');
  const alertSuccess = document.getElementById('changePasswordAlertSuccess');
  const errorMsg = document.getElementById('changePasswordErrorMsg');
  const successMsg = document.getElementById('changePasswordSuccessMsg');
  const submitBtn = document.getElementById('btnChangePasswordSubmit');
  const spinner = document.getElementById('btnChangePasswordSpinner');
  const btnText = document.getElementById('btnChangePasswordText');

  const showError = (msg) => {
    if (alertError && errorMsg) {
      errorMsg.textContent = msg;
      alertError.style.display = 'block';
    }
    if (alertSuccess) alertSuccess.style.display = 'none';
    showToast('❌ ' + msg, 'error');
  };

  if (!isForced && !currentPass) {
    showError('Debes ingresar tu contraseña actual de combate.');
    return;
  }

  if (!newPass || newPass.length < 8) {
    showError('La nueva contraseña debe contener al menos 8 caracteres.');
    return;
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(newPass)) {
    showError('La nueva clave debe contener al menos 1 mayúscula, 1 minúscula y 1 número.');
    return;
  }

  if (newPass !== confirmPass) {
    showError('Las nuevas contraseñas no coinciden.');
    return;
  }

  // Activar estado de carga en el botón
  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (btnText) btnText.textContent = 'Actualizando...';

  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('Sesión táctica no detectada. Vuelve a iniciar sesión.');
    }

    const payload = {
      newPassword: newPass,
      isForced: Boolean(isForced)
    };
    if (!isForced) {
      payload.currentPassword = currentPass;
    }

    const response = await fetch(`${API_BASE}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.message || data.error || 'No se pudo actualizar la contraseña');
    }

    // Actualizar token en localStorage para sincronizar token_version
    const newToken = data.token || data.data?.token;
    if (newToken) {
      localStorage.setItem('authToken', newToken);
    }

    // Actualizar estado del usuario
    sessionStorage.removeItem('must_change_password');
    if (currentUser) {
      currentUser.must_change_password = false;
      currentUser.token_version = (data.token_version || data.data?.token_version) || ((currentUser.token_version || 0) + 1);
      if (data.user || data.data?.user) {
        currentUser = { ...currentUser, ...(data.user || data.data?.user) };
      }
    }

    // Mostrar éxito en el modal
    if (alertError) alertError.style.display = 'none';
    if (alertSuccess && successMsg) {
      successMsg.textContent = data.message || 'Contraseña táctica actualizada exitosamente.';
      alertSuccess.style.display = 'block';
    }

    showToast('✅ Contraseña táctica actualizada con éxito', 'success');

    // Cerrar modal y continuar al dashboard
    setTimeout(() => {
      closeModal('changePasswordModal');
      updateUserUI(currentUser);
      markUserOnline();
      showView('appView');

      const helpFab = document.getElementById('helpFab');
      if (helpFab) helpFab.style.display = '';
      if (typeof initHelpSystem === 'function') initHelpSystem();
    }, 1000);

  } catch (err) {
    console.error('❌ Error en submitPasswordChangeModal:', err);
    showError(err.message || 'Error de conexión con el servidor militar');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (btnText) btnText.textContent = 'Actualizar Credencial';
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

            if (typeof updateUserUI === 'function' && currentUser) {
                updateUserUI(currentUser);
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
window.showPasswordChangeModal = showPasswordChangeModal;
window.submitPasswordChangeModal = submitPasswordChangeModal;
window.handleClosePasswordModal = handleClosePasswordModal;
window.validateModalPasswordComplexity = validateModalPasswordComplexity;
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