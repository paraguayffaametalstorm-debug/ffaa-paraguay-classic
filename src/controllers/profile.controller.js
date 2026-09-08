import { getSupabase } from '../db/supabase.js';
import { ProfileUpdateSchema } from '../utils/schemas.js';

export async function getProfile(req, res, next) {
  try {
    const supabase = getSupabase();
    const userId = req.user.user_id || req.user.id;

    if (supabase) {
      const { data, error } = await supabase
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
        `)
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .limit(1)
        .single();

      if (!error && data) {
        // ✅ Calcula last_event dinámicamente desde performances
        let lastEvent = 'SQUADRON-ACTIVO';
        try {
          const { data: perfData } = await supabase
            .from('performances')
            .select('event_id, created_at')
            .or(`user_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (perfData?.event_id) {
            lastEvent = perfData.event_id;
          }
        } catch (e) {
          console.warn('⚠️ No se encontró último evento del usuario');
        }

        const { password_hash, password, encrypted_password, ...safe } = data;
        return res.json({ 
          profile: { ...safe, last_event: lastEvent }, 
          user: { ...safe, last_event: lastEvent } 
        });
      }
    }

    // Fallback si Supabase no está disponible
    const { password_hash, password, encrypted_password, ...safe } = req.user;
    res.json({ 
      profile: { ...safe, last_event: 'SQUADRON-ACTIVO' }, 
      user: { ...safe, last_event: 'SQUADRON-ACTIVO' } 
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const data = ProfileUpdateSchema.parse(req.body);
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }

    const updateFields = {};
    if (data.phone !== undefined) updateFields.phone = data.phone;
    if (data.callsign !== undefined) updateFields.callsign = data.callsign;
    if (data.discord !== undefined) updateFields.discord = data.discord;
    if (data.bio !== undefined) updateFields.bio = data.bio;
    if (data.nick !== undefined && data.nick.trim()) updateFields.nick = data.nick.trim();
    if (data.full_name !== undefined) updateFields.full_name = data.full_name;
    if (data.email_personal !== undefined) updateFields.email_personal = data.email_personal;
    if (data.notifications_enabled !== undefined) updateFields.notifications_enabled = data.notifications_enabled;

    const { data: updated, error } = await supabase
      .from('users')
      .update(updateFields)
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .select()
      .single();

    if (error) throw error;

    const { password_hash, password, encrypted_password, ...safe } = updated || { ...req.user, ...updateFields };
    res.json({ message: 'Perfil actualizado con éxito', profile: safe, user: safe });
  } catch (err) {
    next(err);
  }
}
