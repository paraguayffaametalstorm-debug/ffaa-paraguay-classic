import bcrypt from 'bcryptjs';
import { getSupabase } from '../db/supabase.js';
import {
  AddMemberSchema,
  UpdateMemberStatusSchema,
  UpdateMemberRoleSchema,
  BulkUploadSchema
} from '../utils/schemas.js';

export async function getMembers(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('nick', { ascending: true });

    if (error) {
      throw error;
    }

    const safe = (data || []).map(({ password_hash, password, encrypted_password, ...u }) => ({
      ...u,
      user_id: u.user_id || u.id,
      squad_status: u.squad_status || u.status || 'ACTIVE',
      status: u.status || u.squad_status || 'ACTIVE'
    }));

    res.json({ members: safe, total: safe.length });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req, res, next) {
  try {
    const data = AddMemberSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('email')
      .ilike('email', data.email.toLowerCase())
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({
        error: 'Ya existe un piloto registrado con ese correo institucional',
        code: 'USER_ALREADY_EXISTS'
      });
    }

    const defaultHash = await bcrypt.hash('123456', 10);
    const newMember = {
      email: data.email.toLowerCase(),
      password_hash: defaultHash,
      nick: data.nick,
      role: data.role || 'MIEMBRO',
      must_change_password: true,
      token_version: 1,
      phone: '',
      callsign: '',
      discord: '',
      bio: '',
      joined_date: new Date().toISOString().split('T')[0],
      perf_status: 'VERDE',
      squad_status: 'ACTIVE',
      status: 'ACTIVE',
      avg_tokens: 0,
      weeks_evaluated: 0,
      trend: 'stable',
      last_activity: new Date().toISOString()
    };

    const { data: createdUser, error: insertError } = await supabase
      .from('users')
      .insert(newMember)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    const { password_hash, ...safe } = createdUser || newMember;
    res.status(201).json({ message: 'Piloto registrado con éxito', member: safe });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberStatus(req, res, next) {
  try {
    const id = req.params.id;
    const { status } = UpdateMemberStatusSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    // Check target user role for owner protection
    const { data: targetData } = await supabase
      .from('users')
      .select('role')
      .or(`id.eq.${id},user_id.eq.${id}`)
      .limit(1);

    if (targetData && targetData.length > 0 && targetData[0].role === 'OWNER' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'No tienes permiso para modificar al Comandante General', code: 'FORBIDDEN' });
    }

    const { error } = await supabase
      .from('users')
      .update({ squad_status: status, status })
      .or(`id.eq.${id},user_id.eq.${id}`);

    if (error) {
      throw error;
    }

    res.json({ message: `Estado militar actualizado a ${status}` });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req, res, next) {
  try {
    const id = req.params.id;
    const { role } = UpdateMemberRoleSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    const { error } = await supabase
      .from('users')
      .update({ role })
      .or(`id.eq.${id},user_id.eq.${id}`);

    if (error) {
      throw error;
    }

    res.json({ message: `Rango actualizado a ${role}` });
  } catch (err) {
    next(err);
  }
}

export async function bulkUploadEvent(req, res, next) {
  try {
    const { event_id, performances: bulkList } = BulkUploadSchema.parse(req.body);
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    let processed = 0;
    const defaultHash = await bcrypt.hash('123456', 10);

    for (const item of bulkList) {
      const { data: foundUsers } = await supabase
        .from('users')
        .select('id, user_id, nick, role')
        .ilike('nick', item.nick.trim())
        .limit(1);

      let targetUser = foundUsers && foundUsers.length > 0 ? foundUsers[0] : null;

      if (!targetUser) {
        const cleanNick = item.nick.toLowerCase().replace(/[^a-z0-9]/g, '');
        const { data: newUser } = await supabase
          .from('users')
          .insert({
            email: `${cleanNick}@ffaa.py`,
            password_hash: defaultHash,
            nick: item.nick,
            role: item.role || 'MIEMBRO',
            must_change_password: true,
            joined_date: new Date().toISOString().split('T')[0],
            perf_status: 'VERDE',
            squad_status: 'ACTIVE',
            status: 'ACTIVE',
            avg_tokens: item.tokens,
            weeks_evaluated: 1,
            trend: 'stable',
            last_activity: new Date().toISOString()
          })
          .select()
          .single();
        targetUser = newUser;
      }

      let status = 'VERDE';
      if (item.tokens < 100) status = 'NEGRO';
      else if (item.tokens < 130) status = 'ROJO';
      else if (item.tokens < 175) status = 'NARANJA';

      const perfRecord = {
        user_id: targetUser?.user_id || targetUser?.id,
        nick: targetUser?.nick || item.nick,
        role: targetUser?.role || item.role || 'MIEMBRO',
        event_id,
        tokens: item.tokens,
        days_connected: 4,
        flew_in_group: true,
        notes: 'Carga masiva de evento táctico',
        status,
        created_at: new Date().toISOString()
      };

      await supabase.from('performances').insert(perfRecord);
      processed++;
    }

    res.json({ message: `Carga masiva completada: ${processed} registros procesados` });
  } catch (err) {
    next(err);
  }
}

export async function activateBlackMarket(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    const { data: existingEvents } = await supabase.from('events').select('id');
    const nextSeq = (existingEvents?.length || 0) + 1;
    const bmEvent = {
      id: `BM-2026-${String(nextSeq).padStart(2, '0')}`,
      type: 'BLACK_MARKET',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      is_open: true,
      status: 'OPEN'
    };

    await supabase.from('events').update({ is_open: false, status: 'CLOSED' }).neq('id', 'NONE');
    await supabase.from('events').insert(bmEvent);

    res.json({ message: 'Operación Black Market activada exitosamente', event_id: bmEvent.id });
  } catch (err) {
    next(err);
  }
}
