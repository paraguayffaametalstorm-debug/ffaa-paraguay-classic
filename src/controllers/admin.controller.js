import bcrypt from 'bcryptjs';
import { memoryStore, getSupabase } from '../db/supabase.js';
import {
  AddMemberSchema,
  UpdateMemberStatusSchema,
  UpdateMemberRoleSchema,
  BulkUploadSchema
} from '../utils/schemas.js';

export async function getMembers(req, res, next) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('user_id', { ascending: true });

      if (!error && data && data.length > 0) {
        const safe = data.map(({ password_hash, password, encrypted_password, ...u }) => ({
          ...u,
          user_id: u.user_id || u.id,
          squad_status: u.squad_status || u.status || 'ACTIVE'
        }));
        return res.json({ members: safe });
      }
    }

    const safeMembers = memoryStore.users.map(({ password_hash, ...u }) => u);
    res.json({ members: safeMembers });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req, res, next) {
  try {
    const data = AddMemberSchema.parse(req.body);
    const supabase = getSupabase();

    if (supabase) {
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
    }

    const existingMem = memoryStore.users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
    if (existingMem) {
      return res.status(409).json({
        error: 'Ya existe un piloto registrado con ese correo institucional',
        code: 'USER_ALREADY_EXISTS'
      });
    }

    const defaultHash = await bcrypt.hash('123456', 10);
    const newMember = {
      user_id: memoryStore.users.length + 1,
      email: data.email.toLowerCase(),
      password_hash: defaultHash,
      nick: data.nick,
      role: data.role,
      must_change_password: true,
      phone: '',
      callsign: '',
      discord: '',
      bio: '',
      joined_date: new Date().toISOString().split('T')[0],
      perf_status: 'PENDIENTE',
      squad_status: 'ACTIVE',
      avg_tokens: 0,
      weeks_evaluated: 0,
      trend: 'stable',
      last_activity: new Date().toISOString()
    };

    memoryStore.users.push(newMember);

    // Audit log
    memoryStore.auditLogs.unshift({
      id: memoryStore.auditLogs.length + 1,
      created_at: new Date().toISOString(),
      nick: req.user.nick,
      role: req.user.role,
      action: 'ADMIN_ADD_MEMBER',
      entity: 'USER',
      entity_id: String(newMember.user_id),
      details: JSON.stringify({ nick: newMember.nick, role: newMember.role }),
      result: 'SUCCESS',
      ip: req.ip || '127.0.0.1'
    });

    if (supabase) {
      try {
        await supabase.from('users').insert(newMember);
      } catch (dbErr) {
        console.warn('⚠️ [Admin addMember] Error insertando en Supabase:', dbErr.message);
      }
    }

    const { password_hash, ...safe } = newMember;
    res.status(201).json({ message: 'Piloto registrado con éxito', member: safe });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = UpdateMemberStatusSchema.parse(req.body);
    const member = memoryStore.users.find(u => u.user_id === id);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('users').update({ squad_status: status }).eq('user_id', id);
      } catch (dbErr) {
        console.warn('⚠️ [Admin updateMemberStatus] Error actualizando Supabase:', dbErr.message);
      }
    }

    if (member) {
      // Owner protection
      if (member.role === 'OWNER' && req.user.role !== 'OWNER') {
        return res.status(403).json({ error: 'No tienes permiso para modificar al Comandante General', code: 'FORBIDDEN' });
      }
      member.squad_status = status;
    }

    memoryStore.auditLogs.unshift({
      id: memoryStore.auditLogs.length + 1,
      created_at: new Date().toISOString(),
      nick: req.user.nick,
      role: req.user.role,
      action: 'ADMIN_UPDATE_STATUS',
      entity: 'USER',
      entity_id: String(id),
      details: JSON.stringify({ new_status: status }),
      result: 'SUCCESS',
      ip: req.ip || '127.0.0.1'
    });

    res.json({ message: `Estado militar actualizado a ${status}` });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const { role } = UpdateMemberRoleSchema.parse(req.body);
    const member = memoryStore.users.find(u => u.user_id === id);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('users').update({ role }).eq('user_id', id);
      } catch (dbErr) {
        console.warn('⚠️ [Admin updateMemberRole] Error actualizando Supabase:', dbErr.message);
      }
    }

    if (member) {
      member.role = role;
    }

    memoryStore.auditLogs.unshift({
      id: memoryStore.auditLogs.length + 1,
      created_at: new Date().toISOString(),
      nick: req.user.nick,
      role: req.user.role,
      action: 'OWNER_UPDATE_ROLE',
      entity: 'USER',
      entity_id: String(id),
      details: JSON.stringify({ new_role: role }),
      result: 'SUCCESS',
      ip: req.ip || '127.0.0.1'
    });

    res.json({ message: `Rango actualizado a ${role}` });
  } catch (err) {
    next(err);
  }
}

export async function bulkUploadEvent(req, res, next) {
  try {
    const { event_id, performances: bulkList } = BulkUploadSchema.parse(req.body);
    const defaultHash = await bcrypt.hash('123456', 10);
    let processed = 0;

    bulkList.forEach(item => {
      let target = memoryStore.users.find(u => u.nick.toLowerCase() === item.nick.toLowerCase());
      if (!target) {
        target = {
          user_id: memoryStore.users.length + 1,
          email: `${item.nick.toLowerCase().replace(/[^a-z0-9]/g, '')}@ffaa.py`,
          password_hash: defaultHash,
          nick: item.nick,
          role: item.role || 'MIEMBRO',
          must_change_password: true,
          joined_date: new Date().toISOString().split('T')[0],
          perf_status: 'VERDE',
          squad_status: 'ACTIVE',
          avg_tokens: item.tokens,
          weeks_evaluated: 1,
          trend: 'stable',
          last_activity: new Date().toISOString()
        };
        memoryStore.users.push(target);
      }

      let status = 'VERDE';
      if (item.tokens < 100) status = 'NEGRO';
      else if (item.tokens < 130) status = 'ROJO';
      else if (item.tokens < 175) status = 'NARANJA';

      target.perf_status = status;

      memoryStore.performances.unshift({
        id: memoryStore.performances.length + 1,
        user_id: target.user_id,
        nick: target.nick,
        role: target.role,
        event_id,
        tokens: item.tokens,
        days_connected: 4,
        flew_in_group: true,
        notes: 'Carga masiva de evento táctico',
        status,
        created_at: new Date().toISOString()
      });
      processed++;
    });

    memoryStore.auditLogs.unshift({
      id: memoryStore.auditLogs.length + 1,
      created_at: new Date().toISOString(),
      nick: req.user.nick,
      role: req.user.role,
      action: 'ADMIN_BULK_UPLOAD',
      entity: 'EVENT',
      entity_id: event_id,
      details: JSON.stringify({ count: processed }),
      result: 'SUCCESS',
      ip: req.ip || '127.0.0.1'
    });

    const supabase = getSupabase();
    if (supabase) {
      try {
        const perfBatch = bulkList.map(item => ({
          nick: item.nick,
          event_id,
          tokens: item.tokens,
          days_connected: 4,
          flew_in_group: true,
          notes: 'Carga masiva de evento táctico',
          status: item.tokens < 100 ? 'NEGRO' : item.tokens < 130 ? 'ROJO' : item.tokens < 175 ? 'NARANJA' : 'VERDE',
          created_at: new Date().toISOString()
        }));
        await supabase.from('performances').insert(perfBatch);
      } catch (dbErr) {
        console.warn('⚠️ [Admin bulkUploadEvent] Error en Supabase:', dbErr.message);
      }
    }

    res.json({ message: `Carga masiva completada: ${processed} registros procesados` });
  } catch (err) {
    next(err);
  }
}

export async function activateBlackMarket(req, res) {
  memoryStore.events.forEach(e => { e.is_open = false; e.status = 'CLOSED'; });
  const bmEvent = {
    id: `BM-2026-${String(memoryStore.events.length + 1).padStart(2, '0')}`,
    type: 'BLACK_MARKET',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    is_open: true,
    status: 'OPEN'
  };
  memoryStore.events.unshift(bmEvent);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('events').update({ is_open: false, status: 'CLOSED' }).neq('id', 'NONE');
      await supabase.from('events').insert(bmEvent);
    } catch (dbErr) {
      console.warn('⚠️ [Admin activateBlackMarket] Error en Supabase:', dbErr.message);
    }
  }

  memoryStore.auditLogs.unshift({
    id: memoryStore.auditLogs.length + 1,
    created_at: new Date().toISOString(),
    nick: req.user.nick,
    role: req.user.role,
    action: 'ADMIN_ACTIVATE_BM',
    entity: 'EVENT',
    entity_id: bmEvent.id,
    details: JSON.stringify({ id: bmEvent.id }),
    result: 'SUCCESS',
    ip: req.ip || '127.0.0.1'
  });

  res.json({ message: 'Operación Black Market activada exitosamente', event_id: bmEvent.id });
}
