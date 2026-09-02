import bcrypt from 'bcryptjs';
import { getSupabase } from '../db/supabase.js';
import {
  AddMemberSchema,
  UpdateMemberStatusSchema,
  UpdateMemberRoleSchema,
  BulkUploadSchema
} from '../utils/schemas.js';
import { logAuditChange } from '../utils/audit.js';

// ============================================================
// 1. LISTAR USUARIOS / MIEMBROS
// ============================================================
export async function getUsers(req, res, next) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, user_id, nick, email, role, status, last_activity, created_at, updated_at')
      .order('nick', { ascending: true });

    if (error) {
      throw error;
    }

    const safeUsers = (data || []).map(u => ({
      id: u.id || u.user_id,
      user_id: u.user_id || u.id,
      nick: u.nick || u.email?.split('@')[0] || 'Sin Nick',
      email: u.email || '',
      role: (u.role || 'MIEMBRO').toUpperCase(),
      status: (u.status || 'ACTIVE').toUpperCase(),
      last_activity: u.last_activity || u.updated_at || u.created_at || null,
      avg_tokens: 0,
      weeks_evaluated: 0,
      perf_status: 'VERDE',
      created_at: u.created_at || null,
      updated_at: u.updated_at || null
    }));

    res.json({
      users: safeUsers,
      members: safeUsers,
      total: safeUsers.length
    });
  } catch (err) {
    next(err);
  }
}

export const getMembers = getUsers;

// ============================================================
// 2. CAMBIAR ROL (CON LÍMITES POR NORMATIVA)
// ============================================================
export async function updateUserRole(req, res, next) {
  try {
    const id = req.params.id;
    const body = UpdateMemberRoleSchema.parse(req.body);
    const newRole = body.role.toUpperCase();
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    // 1. Buscar usuario objetivo
    const { data: targetData, error: targetErr } = await supabase
      .from('users')
      .select('id, user_id, nick, email, role, status')
      .or(`id.eq.${id},user_id.eq.${id}`)
      .limit(1);

    if (targetErr || !targetData || targetData.length === 0) {
      return res.status(404).json({ error: 'Piloto no encontrado', code: 'USER_NOT_FOUND' });
    }

    const targetUser = targetData[0];
    const currentRole = (targetUser.role || 'MIEMBRO').toUpperCase();
    const actorRole = (req.user.role || 'MIEMBRO').toUpperCase();
    const actorId = req.user.user_id || req.user.id;
    const actorNick = req.user.nick || req.user.email;

    // 2. Validar jerarquía y permisos de quien ejecuta la acción
    if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Permiso denegado: Se requiere rol de Administración o Comandancia' });
    }

    // Solo OWNER puede modificar al OWNER o nombrar a otro ADMIN / OWNER
    if (currentRole === 'OWNER' && actorRole !== 'OWNER') {
      return res.status(403).json({ error: 'No tienes permiso para modificar al Comandante General (OWNER)' });
    }

    if ((newRole === 'ADMIN' || newRole === 'OWNER') && actorRole !== 'OWNER') {
      return res.status(403).json({ error: 'Solo el Comandante General (OWNER) puede nombrar Administradores o transferir el mando' });
    }

    // Si el rol ya es el mismo
    if (currentRole === newRole) {
      return res.json({ message: `El usuario ya posee el rango ${newRole}`, role: newRole });
    }

    // 3. Validar límites según normativa militar
    // - Máximo 1 OWNER
    // - Máximo 3 ADMIN
    // - Máximo 8 VETERANO
    if (newRole === 'OWNER') {
      const { count: ownerCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'OWNER');

      if ((ownerCount || 0) >= 1 && currentRole !== 'OWNER') {
        // Degradar al OWNER anterior a ADMIN para mantener máximo 1 OWNER
        await supabase
          .from('users')
          .update({ role: 'ADMIN', updated_at: new Date().toISOString() })
          .eq('role', 'OWNER');
      }
    } else if (newRole === 'ADMIN') {
      const { count: adminCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'ADMIN');

      if ((adminCount || 0) >= 3 && currentRole !== 'ADMIN') {
        return res.status(400).json({
          error: '⚠️ Límite alcanzado: Máximo 3 Administradores permitidos según la normativa militar.',
          code: 'ROLE_LIMIT_REACHED'
        });
      }
    } else if (newRole === 'VETERANO') {
      const { count: vetCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'VETERANO');

      if ((vetCount || 0) >= 8 && currentRole !== 'VETERANO') {
        return res.status(400).json({
          error: '⚠️ Límite alcanzado: Máximo 8 Veteranos permitidos según la normativa militar.',
          code: 'ROLE_LIMIT_REACHED'
        });
      }
    }

    // 4. Actualizar rol en la base de datos
    const targetUserId = targetUser.id || targetUser.user_id;
    const { error: updateError } = await supabase
      .from('users')
      .update({
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .or(`id.eq.${id},user_id.eq.${id}`);

    if (updateError) {
      throw updateError;
    }

    // 5. Registrar en auditoría
    await logAuditChange({
      supabase,
      actorId,
      actorNick,
      targetId: targetUserId,
      targetNick: targetUser.nick,
      action: 'ROLE_CHANGE',
      details: {
        previous_role: currentRole,
        new_role: newRole,
        actor_role: actorRole
      }
    });

    res.json({
      success: true,
      message: `Rango de ${targetUser.nick} actualizado a ${newRole}`,
      role: newRole,
      user_id: targetUserId
    });

  } catch (err) {
    next(err);
  }
}

export const updateMemberRole = updateUserRole;

// ============================================================
// 3. CAMBIAR ESTADO (ACTIVE ↔ INACTIVE)
// ============================================================
export async function updateUserStatus(req, res, next) {
  try {
    const id = req.params.id;
    const body = UpdateMemberStatusSchema.parse(req.body);
    const newStatus = body.status.toUpperCase();
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    // 1. Buscar usuario objetivo
    const { data: targetData, error: targetErr } = await supabase
      .from('users')
      .select('id, user_id, nick, email, role, status')
      .or(`id.eq.${id},user_id.eq.${id}`)
      .limit(1);

    if (targetErr || !targetData || targetData.length === 0) {
      return res.status(404).json({ error: 'Piloto no encontrado', code: 'USER_NOT_FOUND' });
    }

    const targetUser = targetData[0];
    const targetRole = (targetUser.role || 'MIEMBRO').toUpperCase();
    const actorRole = (req.user.role || 'MIEMBRO').toUpperCase();
    const actorId = req.user.user_id || req.user.id;
    const actorNick = req.user.nick || req.user.email;

    // 2. Proteger al OWNER
    if (targetRole === 'OWNER') {
      return res.status(403).json({ error: 'No se puede desactivar la cuenta del Comandante General (OWNER)' });
    }

    // Si es ADMIN, solo el OWNER puede desactivarlo
    if (targetRole === 'ADMIN' && actorRole !== 'OWNER') {
      return res.status(403).json({ error: 'Solo el Comandante General (OWNER) puede desactivar a un Administrador' });
    }

    // 3. Actualizar status en Supabase
    const targetUserId = targetUser.id || targetUser.user_id;
    const { error: updateError } = await supabase
      .from('users')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .or(`id.eq.${id},user_id.eq.${id}`);

    if (updateError) {
      throw updateError;
    }

    // 4. Registrar en auditoría
    await logAuditChange({
      supabase,
      actorId,
      actorNick,
      targetId: targetUserId,
      targetNick: targetUser.nick,
      action: newStatus === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      details: {
        previous_status: targetUser.status || 'ACTIVE',
        new_status: newStatus,
        actor_role: actorRole
      }
    });

    res.json({
      success: true,
      message: `Estado de ${targetUser.nick} actualizado a ${newStatus}`,
      status: newStatus,
      user_id: targetUserId
    });

  } catch (err) {
    next(err);
  }
}

export const updateMemberStatus = updateUserStatus;

// ============================================================
// 4. REGISTRAR NUEVO PILOTO
// ============================================================
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

    // Validar límites si se intenta registrar como ADMIN o VETERANO
    const assignedRole = (data.role || 'MIEMBRO').toUpperCase();
    if (assignedRole === 'ADMIN') {
      const { count: adminCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'ADMIN');
      if ((adminCount || 0) >= 3) {
        return res.status(400).json({ error: 'Límite alcanzado: Máximo 3 Administradores permitidos.' });
      }
    } else if (assignedRole === 'VETERANO') {
      const { count: vetCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'VETERANO');
      if ((vetCount || 0) >= 8) {
        return res.status(400).json({ error: 'Límite alcanzado: Máximo 8 Veteranos permitidos.' });
      }
    }

    const defaultHash = await bcrypt.hash('123456', 10);
    const newMember = {
      email: data.email.toLowerCase().trim(),
      password_hash: defaultHash,
      nick: data.nick.trim(),
      role: assignedRole,
      must_change_password: true,
      token_version: 1,
      status: 'ACTIVE',
      last_activity: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdUser, error: insertError } = await supabase
      .from('users')
      .insert(newMember)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Registrar en auditoría
    await logAuditChange({
      supabase,
      actorId: req.user.user_id || req.user.id,
      actorNick: req.user.nick,
      targetId: createdUser?.id || createdUser?.user_id,
      targetNick: newMember.nick,
      action: 'USER_CREATED',
      details: { role: assignedRole, email: newMember.email }
    });

    const { password_hash, ...safe } = createdUser || newMember;
    res.status(201).json({ message: 'Piloto registrado con éxito', member: safe });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// 5. CARGA MASIVA DE EVENTO
// ============================================================
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
        .select('id, user_id, nick, email, role')
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
            token_version: 1,
            status: 'ACTIVE',
            last_activity: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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
        user_email: targetUser?.email || `${item.nick.toLowerCase().replace(/[^a-z0-9]/g, '')}@ffaa.py`,
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

// ============================================================
// 6. ACTIVAR OPERACIÓN BLACK MARKET
// ============================================================
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
      status: 'OPEN'
    };

    await supabase.from('events').update({ status: 'CLOSED' }).neq('id', 'NONE');
    await supabase.from('events').insert(bmEvent);

    res.json({ message: 'Operación Black Market activada exitosamente', event_id: bmEvent.id });
  } catch (err) {
    next(err);
  }
}
