/**
 * PARAGUAY-FFAA | METALSTORM v3.2 - Gestión de Perfil Personal & Expediente
 * Módulo táctico para perfil de piloto, credenciales y flota
 */

// Cargar y renderizar perfil del piloto
async function loadPersonalProfile() {
  if (!currentUser) return;

  try {
    const [profileRes, planesRes, statsRes] = await Promise.all([
      fetch(`${API_BASE}/api/profile/me`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/api/planes/my-planes`, { headers: getAuthHeaders() }).catch(() => ({ ok: false })),
      fetch(`${API_BASE}/api/performances/stats`, { headers: getAuthHeaders() }).catch(() => ({ ok: false }))
    ]);

    if (!profileRes.ok) throw new Error('Error al cargar perfil');

    const data = await profileRes.json();
    const profile = data.profile || data.user || currentUser;

    // 1. Llenar Badge Táctico de Identificación
    const nick = profile.nick || currentUser.nick || 'PILOTO';
    const role = (profile.role || currentUser.role || 'MIEMBRO').toUpperCase();
    const squadStatus = profile.squad_status || 'ACTIVE';
    const perfStatus = profile.perf_status || currentUser.perf_status || 'VERDE';

    const nickEl = document.getElementById('profileNick');
    if (nickEl) nickEl.textContent = nick;

    const initialsEl = document.getElementById('profileInitials');
    if (initialsEl) {
      const parts = nick.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/);
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : nick.substring(0, 3).toUpperCase();
      initialsEl.textContent = initials || 'PRY';
    }

    const roleBadgeEl = document.getElementById('profileRoleBadge');
    if (roleBadgeEl) {
      roleBadgeEl.textContent = role;
      roleBadgeEl.className = `role-badge role-${role}`;
    }

    const rankIconEl = document.getElementById('profileRankIcon');
    if (rankIconEl) {
      rankIconEl.textContent = role === 'OWNER' ? '👑' : role === 'ADMIN' ? '⭐' : role === 'VETERANO' ? '🎖️' : '✈️';
    }

    const squadStatusBadgeEl = document.getElementById('profileSquadStatusBadge');
    if (squadStatusBadgeEl) {
      squadStatusBadgeEl.textContent = squadStatus === 'ACTIVE' ? 'ACTIVO' : squadStatus;
      squadStatusBadgeEl.className = `squad-status-badge squad-${squadStatus}`;
    }

    const statusBadgeEl = document.getElementById('profileStatusBadge');
    if (statusBadgeEl) {
      statusBadgeEl.textContent = perfStatus;
      statusBadgeEl.className = `status-badge status-${perfStatus.toLowerCase()}`;
    }

    // 2. Métricas de Rendimiento
    let avgTokens = profile.avg_tokens || 185;
    let weeksEvaluated = profile.weeks_evaluated || 12;

    if (statsRes.ok) {
      try {
        const statsData = await statsRes.json();
        if (statsData.avg_tokens) avgTokens = statsData.avg_tokens;
        if (statsData.weeks_evaluated) weeksEvaluated = statsData.weeks_evaluated;
      } catch (e) {}
    }

    const avgTokensEl = document.getElementById('profileAvgTokens');
    if (avgTokensEl) avgTokensEl.textContent = avgTokens;

    const weeksEl = document.getElementById('profileWeeksEvaluated');
    if (weeksEl) weeksEl.textContent = weeksEvaluated;

    const userIdEl = document.getElementById('profileUserId');
    if (userIdEl) userIdEl.textContent = `PRY-${String(profile.user_id || currentUser.user_id || '001').padStart(3, '0')}`;

    const emailEl = document.getElementById('profileOfficialEmail');
    if (emailEl) emailEl.textContent = profile.email || currentUser.email || '—';

    const lastEventEl = document.getElementById('profileLastEvent');
    if (lastEventEl) lastEventEl.textContent = profile.last_event || 'SQUADRON-ACTIVO';

    // 3. Rellenar Formulario de Contacto
    const fullNameInp = document.getElementById('fullName');
    if (fullNameInp) fullNameInp.value = profile.full_name || '';

    const emailPersonalInp = document.getElementById('personalEmail');
    if (emailPersonalInp) emailPersonalInp.value = profile.email_personal || '';

    const phoneInp = document.getElementById('phone');
    if (phoneInp) phoneInp.value = profile.phone || '';

    const notifInp = document.getElementById('notificationsEnabled');
    if (notifInp) notifInp.checked = profile.notifications_enabled ?? true;

    // 4. Hangar de Aeronaves Mini-Grid
    const planesContainer = document.getElementById('profilePlanesList');
    const planesCountEl = document.getElementById('profilePlanesCount');

    if (planesRes.ok) {
      const planesData = await planesRes.json();
      const planes = planesData.planes || [];

      if (planesCountEl) planesCountEl.textContent = planes.length;

      if (planesContainer) {
        if (planes.length === 0) {
          planesContainer.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:1.5rem;color:#94A3B8;font-size:0.85rem;">
              No tienes aeronaves registradas en tu hangar aún.<br>
              <button onclick="showView('planesView')" class="btn-secondary btn-sm" style="margin-top:8px;">
                ✈️ Agregar Aeronave
              </button>
            </div>
          `;
        } else {
          planesContainer.innerHTML = planes.map(p => `
            <div class="card" style="padding:10px 12px;background:rgba(30,41,59,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <strong style="color:#FFFFFF;font-size:0.85rem;">✈️ ${escapeHTML(p.avion_id)}</strong>
                <span class="badge-tag" style="margin:0;font-size:0.65rem;">NVL ${p.nivel}</span>
              </div>
              <div style="font-size:0.75rem;color:#94A3B8;">
                ${p.especial_nombre ? `<span>⚡ ${escapeHTML(p.especial_nombre)}</span>` : ''}
              </div>
            </div>
          `).join('');
        }
      }
    } else {
      if (planesCountEl) planesCountEl.textContent = '0';
      if (planesContainer) {
        planesContainer.innerHTML = '<div style="color:#94A3B8;font-size:0.85rem;">Hangar listo para configuración.</div>';
      }
    }

  } catch (err) {
    console.error('Error al cargar perfil táctico:', err);
    showToast('⚠️ No se pudo sincronizar el expediente militar', 'error');
  }
}

async function savePersonalProfile() {
  try {
    const fullName = document.getElementById('fullName')?.value.trim();
    const personalEmail = document.getElementById('personalEmail')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const notificationsEnabled = document.getElementById('notificationsEnabled')?.checked;

    const profileData = {
      full_name: fullName || null,
      email_personal: personalEmail || null,
      phone: phone || null,
      notifications_enabled: notificationsEnabled
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

    showToast('✅ Expediente de piloto actualizado correctamente', 'success');
    loadPersonalProfile();

  } catch (err) {
    console.error('Error al guardar perfil personal:', err);
    showToast('❌ ' + err.message, 'error');
  }
}

// Inicializar formulario de perfil
document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('personalProfileForm');
  if (profileForm) {
    profileForm.onsubmit = (e) => {
      e.preventDefault();
      savePersonalProfile();
    };
  }
});

// Exponer globalmente en window
window.loadPersonalProfile = loadPersonalProfile;
window.savePersonalProfile = savePersonalProfile;

