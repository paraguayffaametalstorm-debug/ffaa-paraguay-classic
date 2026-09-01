import { memoryStore, getSupabase } from '../db/supabase.js';
import { SettingsUpdateSchema } from '../utils/schemas.js';

export async function getSettings(req, res, next) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', req.user.user_id)
        .single();

      if (!error && data) {
        return res.json({ settings: data });
      }
    }

    const settings = memoryStore.userSettings[req.user.user_id] || {
      theme: 'militar',
      language: 'es',
      notif_email: false,
      notif_whatsapp: false,
      notif_status: true,
      notif_reminder: true,
      notif_announcements: true
    };
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const data = SettingsUpdateSchema.parse(req.body);
    memoryStore.userSettings[req.user.user_id] = {
      ...(memoryStore.userSettings[req.user.user_id] || {}),
      ...data
    };

    const updated = memoryStore.userSettings[req.user.user_id];

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('user_settings').upsert({
        user_id: req.user.user_id,
        ...updated
      });
    }

    res.json({ message: 'Configuración guardada correctamente', settings: updated });
  } catch (err) {
    next(err);
  }
}
