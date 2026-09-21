/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - CONTROLADOR DE PERFIL TÁCTICO v3.5.0
 * Gestión de expediente militar, credenciales y sincronización de combate
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';
import { ProfileUpdateSchema, NickChangeSchema } from '../utils/schemas.js';
import { logNickChange } from '../utils/audit.js';

// ========== FUNCIÓN AUXILIAR PARA CONSULTAS TIPADAS ==========
function buildUserQuery(supabase, userId, userEmail, userNick, selectFields) {
    let query = supabase.from('users').select(selectFields);
    
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
    const isNumeric = /^\d+$/.test(String(userId));
    
    if (isUUID) {
        query = query.eq('id', userId);
    } else if (isNumeric) {
        query = query.eq('user_id', Number(userId));
    } else if (userEmail) {
        query = query.eq('email', userEmail);
    } else {
        query = query.eq('id', userId);
    }
    
    return query;
}

/**
 * Obtener expediente completo del piloto autenticado
 */
export async function getProfile(req, res, next) {
  try {
    const supabase = getSupabase();
    const userId = req.user.user_id || req.user.id;
    const userEmail = req.user.email;
    const userNick = req.user.nick;

    console.log(`🎖️ [Perfil] Solicitando expediente para combatiente: ID=${userId}, Nick=${userNick || 'Desconocido'}`);

    if (supabase) {
      // ✅ CONSULTA TIPADA
      let query = buildUserQuery(
        supabase, 
        userId, 
        userEmail, 
        userNick,
        `id, user_id, nick, email, email_institucional, role, status, full_name, email_personal, phone, notifications_enabled, avg_tokens, weeks_evaluated, perf_status, google_linked, created_at, updated_at`
      );

      const { data, error } = await query.limit(1).single();

      if (error) {
        console.warn('⚠️ [Perfil] Error en consulta de usuario en Supabase:', error.message);
      }

      if (!error && data) {
        let lastEvent = 'SQUADRON-ACTIVO';
        try {
          // ✅ CONSULTA TIPADA para performances
          let perfQuery = supabase
            .from('performances')
            .select('event_id, created_at')
            .order('created_at', { ascending: false })
            .limit(1);

          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
          const isNumeric = /^\d+$/.test(String(userId));

          if (isUUID) {
            perfQuery = perfQuery.eq('user_id', userId);
          } else if (isNumeric) {
            perfQuery = perfQuery.eq('user_id', Number(userId));
          } else {
            perfQuery = perfQuery.eq('nick', data.nick || userNick);
          }

          const { data: perfData, error: perfError } = await perfQuery;
          
          if (!perfError && perfData && perfData.length > 0 && perfData[0].event_id) {
            lastEvent = perfData[0].event_id;
          }
        } catch (e) {
          console.warn('⚠️ [Perfil] No se pudo obtener la última operación militar:', e.message);
        }

        const { password_hash, password, encrypted_password, ...safe } = data;
        const institutionalEmail = safe.email_institucional || safe.email || `${(safe.nick || 'piloto').toLowerCase()}@ffaa.py`;

        const profileData = {
          ...safe,
          user_id: safe.user_id || safe.id,
          email_institucional: institutionalEmail,
          last_event: lastEvent
        };

        return res.json({
          success: true,
          message: 'Expediente militar recuperado con éxito',
          data: {
            profile: profileData,
            user: profileData
          },
          profile: profileData,
          user: profileData
        });
      }
    }

    console.warn('⚠️ [Perfil] Utilizando datos de sesión local como fallback');
    const { password_hash, password, encrypted_password, ...safe } = req.user;
    const fallbackProfile = {
      ...safe,
      user_id: safe.user_id || safe.id,
      email_institucional: safe.email_institucional || safe.email || 'piloto@ffaa.py',
      last_event: 'SQUADRON-ACTIVO'
    };

    return res.json({
      success: true,
      message: 'Expediente táctico obtenido en modo contingencia',
      data: {
        profile: fallbackProfile,
        user: fallbackProfile
      },
      profile: fallbackProfile,
      user: fallbackProfile
    });

  } catch (err) {
    console.error('❌ [Perfil] Error crítico en getProfile:', err);
    return res.status(500).json({
      success: false,
      message: 'Error interno al consultar el expediente militar',
      error: err.message
    });
  }
}

/**
 * Actualizar datos de contacto y preferencias del expediente militar
 */
export async function updateProfile(req, res, next) {
  try {
    const data = ProfileUpdateSchema.parse(req.body);
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Base de datos militar no disponible',
        error: 'DATABASE_UNAVAILABLE'
      });
    }

    // ============================================================
    // v4.5.0 — Manejo especial del cambio de nick (Módulo B)
    // ============================================================
    // Reglas:
    //   - MIEMBRO / VETERANO: 1 cambio autogestionado (después readonly).
    //   - ADMIN / OWNER: ilimitado (privilegio de mando).
    //   - performances.nick históricos NUNCA se tocan (snapshot inmutable).
    //   - Cada cambio queda auditado en user_nick_changes.
    // ============================================================

    // 1) Buscar usuario actual (necesitamos id UUID, nick actual, email, role, nick_self_changed_at)
    let userLookupQuery = supabase
      .from('users')
      .select('id, user_id, nick, email, email_institucional, role, nick_self_changed_at')
      .limit(1);

    const isUserUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
    const isUserNumeric = /^\d+$/.test(String(userId));

    if (isUserUUID) {
      userLookupQuery = userLookupQuery.eq('id', userId);
    } else if (isUserNumeric) {
      userLookupQuery = userLookupQuery.eq('user_id', Number(userId));
    } else {
      userLookupQuery = userLookupQuery.eq('id', userId);
    }

    const { data: currentUserArr, error: lookupErr } = await userLookupQuery;

    if (lookupErr || !currentUserArr || currentUserArr.length === 0) {
      console.warn('⚠️ [Perfil] Usuario no encontrado para updateProfile:', lookupErr?.message);
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
        error: 'USER_NOT_FOUND'
      });
    }

    const currentUser = currentUserArr[0];
    const currentRole = String(currentUser.role || 'MIEMBRO').toUpperCase();
    const currentNick = String(currentUser.nick || '').trim();
    const currentEmailInst = currentUser.email_institucional || currentUser.email || null;
    const nickSelfChangedAt = currentUser.nick_self_changed_at;

    const isPrivileged = (currentRole === 'ADMIN' || currentRole === 'OWNER');
    const isRegular = (currentRole === 'MIEMBRO' || currentRole === 'VETERANO');

    // 2) Detectar si el request incluye un cambio de nick real
    const requestedNick = data.nick !== undefined ? String(data.nick).trim() : null;
    const isNickChange = requestedNick && requestedNick.toLowerCase() !== currentNick.toLowerCase();

    const updateFields = {
      updated_at: new Date().toISOString()
    };

    // 3) Resto de campos (siempre permitidos)
    if (data.phone !== undefined) updateFields.phone = data.phone;
    if (data.bio !== undefined) updateFields.bio = data.bio;
    if (data.full_name !== undefined) updateFields.full_name = data.full_name;
    if (data.email_personal !== undefined) updateFields.email_personal = data.email_personal;
    if (data.notifications_enabled !== undefined) updateFields.notifications_enabled = data.notifications_enabled;

    // 4) Si hay cambio de nick, aplicar validaciones de Módulo B
    let newInstitutionalEmail = null;

    if (isNickChange) {
      // 4.1) Validar formato con el schema dedicado (defensa en profundidad)
      try {
        NickChangeSchema.parse({ nick: requestedNick });
      } catch (zodErr) {
        return res.status(400).json({
          success: false,
          message: 'Formato de nick inválido. Solo letras, números, punto, guión bajo y guión medio (3-20 caracteres).',
          error: 'NICK_FORMAT_INVALID'
        });
      }

      // 4.2) Validar límite de cambios para usuarios regulares
      if (isRegular && nickSelfChangedAt) {
        return res.status(403).json({
          success: false,
          message: 'Ya utilizaste tu cambio de nick autogestionado. Contactá a un Administrador si necesitás otro cambio.',
          error: 'NICK_CHANGE_LIMIT_REACHED'
        });
      }

      // 4.3) Validar unicidad del nick (case-insensitive)
      const { data: nickConflict, error: nickErr } = await supabase
        .from('users')
        .select('id, nick')
        .ilike('nick', requestedNick)
        .neq('id', currentUser.id)
        .limit(1);

      if (nickErr) {
        console.error('❌ [Perfil] Error validando unicidad de nick:', nickErr.message);
      }

      if (nickConflict && nickConflict.length > 0) {
        return res.status(409).json({
          success: false,
          message: `El nick "${requestedNick}" ya está en uso por otro piloto. Elegí otro.`,
          error: 'NICK_TAKEN'
        });
      }

      // 4.4) Todo OK → preparar actualización
      updateFields.nick = requestedNick;

      if (isRegular) {
        // MIEMBRO / VETERANO: solo se puede cambiar 1 vez → marcar timestamp
        updateFields.nick_self_changed_at = new Date().toISOString();
      }
      // ADMIN / OWNER: ilimitado → no se toca nick_self_changed_at (o se setea igual para tracking)

      // 4.5) Recalcular email institucional desde el nuevo nick (default útil)
      //      Solo si el usuario NO tenía un email personalizado previo que difiera del nick viejo.
      const oldAutoEmail = currentNick
        ? `${currentNick.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9._-]/g, '')}@ffaa.py`
        : null;

      const shouldAutoUpdateEmail =
        currentEmailInst &&
        oldAutoEmail &&
        currentEmailInst.toLowerCase() === oldAutoEmail.toLowerCase();

      if (shouldAutoUpdateEmail) {
        const newAutoEmail = requestedNick
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9._-]/g, '') + '@ffaa.py';

        // Validar que el nuevo email no esté tomado
        const { data: emailConflict } = await supabase
          .from('users')
          .select('id')
          .or(`email.ilike.${newAutoEmail},email_institucional.ilike.${newAutoEmail}`)
          .neq('id', currentUser.id)
          .limit(1);

        if (emailConflict && emailConflict.length > 0) {
          console.warn('⚠️ [Perfil] Auto-email colisiona, se mantiene el anterior:', newAutoEmail);
          // No bloqueamos el cambio de nick por esto — el admin puede ajustar después
        } else {
          updateFields.email_institucional = newAutoEmail;
          newInstitutionalEmail = newAutoEmail;
        }
      }
    }

    // 5) Ejecutar UPDATE
    let updateQuery = supabase.from('users').update(updateFields);

    if (isUserUUID) {
      updateQuery = updateQuery.eq('id', userId);
    } else if (isUserNumeric) {
      updateQuery = updateQuery.eq('user_id', Number(userId));
    } else {
      updateQuery = updateQuery.eq('id', userId);
    }

    const { data: updated, error } = await updateQuery.select().single();

    if (error) {
      console.error('❌ [Perfil] Error al actualizar expediente en Supabase:', error);
      throw error;
    }

    // 6) Auditoría del cambio de nick (no bloquea si falla)
    if (isNickChange) {
      try {
        const auditResult = await logNickChange({
          supabase,
          userId: currentUser.id,
          previousNick: currentNick,
          newNick: requestedNick,
          previousEmail: currentEmailInst,
          newEmail: newInstitutionalEmail || currentEmailInst,
          changeType: 'SELF',
          changedBy: null,
          reason: null
        });

        if (!auditResult.ok) {
          console.warn('⚠️ [Perfil] Nick cambiado pero auditoría falló:', auditResult.error);
        }
      } catch (auditErr) {
        console.warn('⚠️ [Perfil] Excepción en logNickChange:', auditErr.message);
      }
    }

    const { password_hash, password, encrypted_password, ...safe } = updated || { ...req.user, ...updateFields };

    console.log(`✅ [Perfil] Expediente actualizado con éxito para ID: ${userId}${isNickChange ? ` (nick: ${currentNick} → ${requestedNick})` : ''}`);

    return res.json({
      success: true,
      message: isNickChange
        ? `Nick actualizado correctamente: ${currentNick} → ${requestedNick}`
        : 'Expediente militar actualizado correctamente',
      data: {
        profile: safe,
        user: safe
      },
      profile: safe,
      user: safe
    });

  } catch (err) {
    console.error('❌ [Perfil] Error al actualizar perfil:', err);
    return res.status(400).json({
      success: false,
      message: 'Error al procesar la actualización del expediente militar',
      error: err.message
    });
  }
}