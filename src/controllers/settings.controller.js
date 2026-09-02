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
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .or(`user_id.eq.${userId}`)
        .limit(1)
        .single();

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
      await supabase.from('user_settings').upsert({
        user_id: userId,
        ...data
      });
    }

    res.json({ message: 'Configuración guardada correctamente', settings: { ...DEFAULT_SETTINGS, ...data, user_id: userId } });
  } catch (err) {
    next(err);
  }
}
