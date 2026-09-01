/**
 * PARAGUAY-FFAA | METALSTORM v2.0 - Gestión de Perfil Personal
 * Funciones para cargar y guardar perfil del usuario
 */

// Cargar y guardar perfil personal
async function loadPersonalProfile() {
  try {
    const res = await fetch(`${API_BASE}/api/profile/me`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) throw new Error('Error al cargar perfil');
    
    const data = await res.json();
    const profile = data.profile;
    
    // Rellenar formulario
    document.getElementById('fullName').value = profile.full_name || '';
    document.getElementById('personalEmail').value = profile.email_personal || '';
    document.getElementById('phone').value = profile.phone || '';
    document.getElementById('notificationsEnabled').checked = profile.notifications_enabled;
    
  } catch (err) {
    console.error('Error al cargar perfil personal:', err);
    showToast('⚠️ No se pudo cargar el perfil personal', 'error');
  }
}

async function savePersonalProfile() {
  try {
    const profileData = {
      full_name: document.getElementById('fullName').value.trim(),
      email_personal: document.getElementById('personalEmail').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      notifications_enabled: document.getElementById('notificationsEnabled').checked
    };
    
    const res = await fetch(`${API_BASE}/api/profile/me`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al guardar perfil');
    }
    
    showToast('✅ Perfil personal actualizado correctamente', 'success');
    
  } catch (err) {
    console.error('Error al guardar perfil personal:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

// Inicializar formulario de perfil
document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('personalProfileForm');
  if (profileForm) {
    loadPersonalProfile();
    profileForm.onsubmit = (e) => {
      e.preventDefault();
      savePersonalProfile();
    };
  }
});