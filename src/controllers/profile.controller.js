/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - CONTROLADOR DE PERFIL TÁCTICO v3.5.0
 * Gestión de expediente militar, credenciales y sincronización de combate
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';
import { ProfileUpdateSchema } from '../utils/schemas.js';

/**
 * Obtener expediente completo del piloto autenticado
 * Selecciona campos explícitos (incluyendo email_institucional) y calcula el último evento operativo
 */
export async function getProfile(req, res, next) {
  try {
    const supabase = getSupabase();
    const userId = req.user.user_id || req.user.id;
    const userEmail = req.user.email;
    const userNick = req.user.nick;

    console.log(`🎖️ [Perfil] Solicitando expediente para combatiente: ID=${userId}, Nick=${userNick || 'Desconocido'}`);

    if (supabase) {
      // Detección de identificador UUID vs entero para compatibilidad con PostgreSQL
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
      const isNumeric = /^\d+$/.test(String(userId));

      let query = supabase
        .from('users')
        .select(`
          id,
          user_id,
          nick,
          email,
          email_institucional,
          role,
          status,
          full_name,
          email_personal,
          phone,
          notifications_enabled,
          avg_tokens,
          weeks_evaluated,
          perf_status,
          google_linked,
          created_at,
          updated_at
        `);

      if (isUUID) {
        query = query.or(`id.eq.${userId},email.eq.${userEmail}`);
      } else if (isNumeric) {
        query = query.or(`id.eq.${userId},user_id.eq.${userId}`);
      } else if (userEmail) {
        query = query.eq('email', userEmail);
      } else {
        query = query.eq('id', userId);
      }

      const { data, error } = await query.limit(1).single();

      if (error) {
        console.warn('⚠️ [Perfil] Error en consulta de usuario en Supabase:', error.message);
      }

      if (!error && data) {
        // Cálculo dinámico de la última operación (last_event) desde el registro de performances
        let lastEvent = 'SQUADRON-ACTIVO';
        try {
          let perfQuery = supabase
            .from('performances')
            .select('event_id, created_at')
            .order('created_at', { ascending: false })
            .limit(1);

          if (isUUID || isNumeric) {
            perfQuery = perfQuery.or(`user_id.eq.${userId},nick.eq.${data.nick || userNick}`);
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

        // Limpieza de campos sensibles y fallback para email institucional
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

    // Fallback de contingencia si la base de datos no está disponible
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

    const updateFields = {
      updated_at: new Date().toISOString()
    };

    if (data.phone !== undefined) updateFields.phone = data.phone;
    if (data.bio !== undefined) updateFields.bio = data.bio;
    if (data.nick !== undefined && data.nick.trim()) updateFields.nick = data.nick.trim();
    if (data.full_name !== undefined) updateFields.full_name = data.full_name;
    if (data.email_personal !== undefined) updateFields.email_personal = data.email_personal;
    if (data.notifications_enabled !== undefined) updateFields.notifications_enabled = data.notifications_enabled;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
    const isNumeric = /^\d+$/.test(String(userId));

    let updateQuery = supabase.from('users').update(updateFields);

    if (isUUID) {
      updateQuery = updateQuery.eq('id', userId);
    } else if (isNumeric) {
      updateQuery = updateQuery.or(`id.eq.${userId},user_id.eq.${userId}`);
    } else {
      updateQuery = updateQuery.eq('id', userId);
    }

    const { data: updated, error } = await updateQuery.select().single();

    if (error) {
      console.error('❌ [Perfil] Error al actualizar expediente en Supabase:', error);
      throw error;
    }

    const { password_hash, password, encrypted_password, ...safe } = updated || { ...req.user, ...updateFields };

    console.log(`✅ [Perfil] Expediente actualizado con éxito para ID: ${userId}`);

    return res.json({
      success: true,
      message: 'Expediente militar actualizado correctamente',
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