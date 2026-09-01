import { memoryStore, getSupabase } from '../db/supabase.js';
import { ProfileUpdateSchema } from '../utils/schemas.js';

export function getProfile(req, res) {
  const user = memoryStore.users.find(u => u.user_id === req.user.user_id) || req.user;
  const { password_hash, ...safe } = user;
  res.json({ profile: safe, user: safe });
}

export async function updateProfile(req, res, next) {
  try {
    const data = ProfileUpdateSchema.parse(req.body);
    const user = memoryStore.users.find(u => u.user_id === req.user.user_id);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' });
    }

    if (data.phone !== undefined) user.phone = data.phone;
    if (data.callsign !== undefined) user.callsign = data.callsign;
    if (data.discord !== undefined) user.discord = data.discord;
    if (data.bio !== undefined) user.bio = data.bio;
    if (data.nick !== undefined && data.nick.trim()) user.nick = data.nick.trim();
    if (data.full_name !== undefined) user.full_name = data.full_name;
    if (data.email_personal !== undefined) user.email_personal = data.email_personal;
    if (data.notifications_enabled !== undefined) user.notifications_enabled = data.notifications_enabled;

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('users').update({
        phone: user.phone,
        callsign: user.callsign,
        discord: user.discord,
        bio: user.bio,
        nick: user.nick,
        full_name: user.full_name,
        email_personal: user.email_personal,
        notifications_enabled: user.notifications_enabled
      }).eq('user_id', user.user_id);
    }

    const { password_hash, ...safe } = user;
    res.json({ message: 'Perfil táctico actualizado correctamente', profile: safe, user: safe });
  } catch (err) {
    next(err);
  }
}
