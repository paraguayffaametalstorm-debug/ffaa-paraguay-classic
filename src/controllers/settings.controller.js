import { getSupabase } from '../db/supabase.js';
import { SettingsUpdateSchema } from '../utils/schemas.js';

const DEFAULT_SETTINGS = {
  theme: 'militar',
  language: 'es',
  notif_email: false,
  notif_whatsapp: false,
  notif_status: true,
  notif_reminder: true,
  notif_announcements: true
};

export async function getSettings(req, res, next) {
  try {
    const supabase = getSupabase();
    const userId = req.user.user_id || req.user.id;

    if (supabase) {
      // HALL-044: Consulta tipada (UUID vs INTEGER) para user_settings.user_id
      // La columna user_settings.user_id es UUID (FK a users.id).
      // Si el token trae user_id INTEGER, hay que resolver primero el UUID real.
      let realUserId = userId;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));

      if (!isUUID) {
        // userId es INTEGER → buscar el UUID correspondiente en users
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('user_id', Number(userId))
          .limit(1)
          .single();
        if (userData?.id) {
          realUserId = userData.id;
        }
      }

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', realUserId)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return res.json({ settings: data });
      }
    }

    res.json({ settings: { ...DEFAULT_SETTINGS, user_id: userId } });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const data = SettingsUpdateSchema.parse(req.body);
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();

    if (supabase) {
      // HALL-044: Resolver UUID real si el token trae user_id INTEGER
      // HALL-045: onConflict: 'user_id' para evitar duplicados en el upsert
      let realUserId = userId;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));

      if (!isUUID) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('user_id', Number(userId))
          .limit(1)
          .single();
        if (userData?.id) {
          realUserId = userData.id;
        }
      }

      await supabase.from('user_settings').upsert(
        {
          user_id: realUserId,
          ...data
        },
        { onConflict: 'user_id' }
      );
    }

    res.json({ message: 'Configuración guardada correctamente', settings: { ...DEFAULT_SETTINGS, ...data, user_id: userId } });
  } catch (err) {
    next(err);
  }
}
