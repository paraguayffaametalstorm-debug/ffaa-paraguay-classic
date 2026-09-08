/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - GESTIÓN DE PERFIL PERSONAL & EXPEDIENTE v3.5.0
 * Módulo táctico para perfil de piloto, credenciales de combate y telemetría de flota
 * ============================================================================
 */

// Cargar y renderizar perfil del piloto
async function loadPersonalProfile() {
  if (!currentUser) {
    console.warn('⚠️ [Perfil] No hay sesión activa de usuario');
    return;
  }

  try {
    // Consulta concurrente: Perfil, Hangar personal y Estadísticas operativas dinámicas (/api/dashboard/summary)
    const [profileRes, planesRes, summaryRes] = await Promise.all([
      fetch(`${API_BASE}/api/profile/me`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/api/planes/my-planes`, { headers: getAuthHeaders() }).catch(err => {
        console.warn('⚠️ [Perfil] Error solicitando aeronaves:', err);
        return { ok: false };
      }),
      fetch(`${API_BASE}/api/dashboard/summary`, { headers: getAuthHeaders() }).catch(err => {
        console.warn('⚠️ [Perfil] Error solicitando resumen del dashboard:', err);
        return { ok: false };
      })
    ]);

    if (!profileRes.ok) {
      throw new Error(`Error en el servidor militar al obtener perfil (HTTP ${profileRes.status})`);
    }

    const data = await profileRes.json();
    const profile = data.data?.profile || data.profile || data.user || currentUser;

    // 1. Llenar Badge Táctico de Identificación
    const nick = profile.nick || currentUser.nick || 'PILOTO';
    const role = (profile.role || currentUser.role || 'MIEMBRO').toUpperCase();
    const squadStatus = (profile.status || currentUser.status || 'ACTIVE').toUpperCase();
    const perfStatus = profile.perf_status || currentUser.perf_status || 'VERDE';

    const nickEl = document.getElementById('profileNick');
    if (nickEl) nickEl.textContent = nick;

    const initialsEl = document.getElementById('profileInitials');
    if (initialsEl) {
      const cleanNick = nick.replace(/\[PRY\]/gi, '').trim();
      const parts = cleanNick.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/);
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : cleanNick.substring(0, 3).toUpperCase();
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
      squadStatusBadgeEl.textContent = squadStatus === 'ACTIVE' || squadStatus === 'ACTIVO' ? 'ACTIVO' : squadStatus;
      squadStatusBadgeEl.className = `squad-status-badge squad-${squadStatus}`;
    }

    const statusBadgeEl = document.getElementById('profileStatusBadge');
    if (statusBadgeEl) {
      statusBadgeEl.textContent = perfStatus;
      statusBadgeEl.className = `status-badge status-${perfStatus.toLowerCase()}`;
    }

    // 2. Métricas de Rendimiento Dinámicas (Obtenidas de /api/dashboard/summary)
    let avgTokens = profile.avg_tokens !== undefined && profile.avg_tokens !== null ? Number(profile.avg_tokens) : 0;
    let weeksEvaluated = profile.weeks_evaluated !== undefined && profile.weeks_evaluated !== null ? Number(profile.weeks_evaluated) : 0;

    if (summaryRes && summaryRes.ok) {
      try {
        const summaryData = await summaryRes.json();
        const userStats = summaryData.data?.userStats || summaryData.userStats;
        if (userStats) {
          if (userStats.avg_tokens !== undefined && userStats.avg_tokens !== null) {
            avgTokens = Number(userStats.avg_tokens);
          }
          if (userStats.weeks_evaluated !== undefined && userStats.weeks_evaluated !== null) {
            weeksEvaluated = Number(userStats.weeks_evaluated);
          }
        }
      } catch (e) {
        console.warn('⚠️ [Perfil] Error procesando telemetría de dashboard:', e);
      }
    }

    const avgTokensEl = document.getElementById('profileAvgTokens');
    if (avgTokensEl) avgTokensEl.textContent = avgTokens;

    const weeksEl = document.getElementById('profileWeeksEvaluated');
    if (weeksEl) weeksEl.textContent = weeksEvaluated;

    // Manejo de Identificador Táctico (UUID o Entero)
    const rawId = profile.user_id || profile.id || currentUser.user_id || currentUser.id || '001';
    let formattedId = '001';
    if (String(rawId).length > 8) {
      // Formato compacto para claves primarias tipo UUID (primeros 8 caracteres en mayúsculas)
      formattedId = String(rawId).substring(0, 8).toUpperCase();
    } else {
      formattedId = String(rawId).padStart(3, '0');
    }

    const userIdEl = document.getElementById('profileUserId');
    if (userIdEl) userIdEl.textContent = `PRY-${formattedId}`;

    // Correo Oficial Militar / Institucional
    const officialEmail = profile.email_institucional || profile.email || currentUser.email || 'piloto@ffaa.py';
    const emailEl = document.getElementById('profileOfficialEmail');
    if (emailEl) emailEl.textContent = officialEmail;

    // Última Operación Registrada
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

    if (planesRes && planesRes.ok) {
      try {
        const planesData = await planesRes.json();
        const planes = planesData.data?.planes || planesData.planes || [];

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
                  <strong style="color:#FFFFFF;font-size:0.85rem;">✈️ ${typeof escapeHTML === 'function' ? escapeHTML(p.model_name || p.avion_id) : (p.model_name || p.avion_id)}</strong>
                  <span class="badge-tag" style="margin:0;font-size:0.65rem;">NVL ${p.nivel}</span>
                </div>
                <div style="font-size:0.75rem;color:#94A3B8;">
                  ${p.especial_nombre ? `<span>⚡ ${typeof escapeHTML === 'function' ? escapeHTML(p.especial_nombre) : p.especial_nombre}</span>` : '<span>Calibrado para combate</span>'}
                </div>
              </div>
            `).join('');
          }
        }
      } catch (planeErr) {
        console.error('❌ [Perfil] Error procesando telemetría de flota:', planeErr);
        if (planesContainer) {
          planesContainer.innerHTML = '<div style="color:#94A3B8;font-size:0.85rem;padding:1rem;text-align:center;">Hangar listo para configuración.</div>';
        }
      }
    } else {
      if (planesCountEl) planesCountEl.textContent = '0';
      if (planesContainer) {
        planesContainer.innerHTML = '<div style="color:#94A3B8;font-size:0.85rem;padding:1rem;text-align:center;">Hangar listo para configuración.</div>';
      }
    }

  } catch (err) {
    console.error('❌ [Perfil] Error al cargar perfil táctico:', err);
    
    // Limpieza de estados de carga en la interfaz para evitar bloqueo visual
    const planesContainer = document.getElementById('profilePlanesList');
    if (planesContainer) {
      planesContainer.innerHTML = '<div style="color:#ef4444;font-size:0.85rem;padding:1rem;text-align:center;">⚠️ Telemetría de flota temporalmente no disponible</div>';
    }

    if (typeof showToast === 'function') {
      showToast('⚠️ No se pudo sincronizar el expediente militar', 'error');
    }
  }
}

// Guardar cambios en el perfil del combatiente
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
      const errorData = await res.json();
      throw new Error(errorData.message || errorData.error || 'Error al guardar expediente militar');
    }

    if (typeof showToast === 'function') {
      showToast('✅ Expediente de piloto actualizado correctamente', 'success');
    }
    
    loadPersonalProfile();

  } catch (err) {
    console.error('❌ [Perfil] Error al guardar perfil personal:', err);
    if (typeof showToast === 'function') {
      showToast('❌ ' + err.message, 'error');
    }
  }
}

// Inicializar listener de formulario de perfil táctico
document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('personalProfileForm');
  if (profileForm) {
    profileForm.onsubmit = (e) => {
      e.preventDefault();
      savePersonalProfile();
    };
  }
});

// Exposición en ámbito global window
window.loadPersonalProfile = loadPersonalProfile;
window.savePersonalProfile = savePersonalProfile;