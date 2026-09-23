import crypto from 'crypto';
import { getSupabase } from '../db/supabase.js';

import { logger } from '../config/logger.js';
// ============================================================================
// CONFIGURACIÓN DE BACKUPS
// ============================================================================
const MAX_BACKUPS = 30;                    // Retención máxima (auto-prune)
const BACKUP_VERSION = '4.1.0';            // Versión del formato del backup

// Campos sensibles que se eliminan por completo del backup
const SENSITIVE_USER_FIELDS_DROP = [
  'password_hash',
  'password',
  'token_version',
  'google_id',
  'google_linked'
];

// Campos PII que se ofuscan parcialmente (preservan utilidad forense sin exponer)
const SENSITIVE_USER_FIELDS_OBFUSCATE = [
  'email',
  'email_institucional',
  'email_personal',
  'phone'
];

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Ofusca un email preservando el primer carácter del local-part.
 * Ejemplo: "pjpirovani@gmail.com" → "p***@gmail.com"
 */
function obfuscateEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const atIdx = email.indexOf('@');
  if (atIdx <= 0) return '***';
  const first = email[0];
  const domain = email.slice(atIdx);
  return `${first}***${domain}`;
}

/**
 * Ofusca un teléfono preservando los primeros 4 dígitos.
 * Ejemplo: "+595981123456" → "+595***3456"
 */
function obfuscatePhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  if (phone.length <= 4) return '***';
  const prefix = phone.slice(0, 4);
  const suffix = phone.slice(-4);
  return `${prefix}***${suffix}`;
}

/**
 * Sanitiza un objeto usuario del backup:
 *  - Elimina campos sensibles (password_hash, token_version, google_id, etc.).
 *  - Ofusca PII (email, phone).
 */
function sanitizeUser(user) {
  const clean = { ...user };

  for (const field of SENSITIVE_USER_FIELDS_DROP) {
    delete clean[field];
  }

  for (const field of SENSITIVE_USER_FIELDS_OBFUSCATE) {
    if (clean[field]) {
      if (field === 'phone') {
        clean[field] = obfuscatePhone(clean[field]);
      } else {
        clean[field] = obfuscateEmail(clean[field]);
      }
    }
  }

  return clean;
}

/**
 * Calcula el hash SHA-256 de un string.
 */
function computeSha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

/**
 * Aplica la política de retención: si hay más de MAX_BACKUPS,
 * elimina los más antiguos (mantiene solo los N más recientes).
 */
async function pruneOldBackups(supabase) {
  try {
    const { data, error } = await supabase
      .from('backups')
      .select('id')
      .order('created_at', { ascending: false })
      .range(MAX_BACKUPS, 999);

    if (error || !data || data.length === 0) return 0;

    const idsToDelete = data.map((row) => row.id);
    const { error: delError } = await supabase
      .from('backups')
      .delete()
      .in('id', idsToDelete);

    if (delError) {
      logger.error('⚠️ [Backup] Error al podar backups antiguos:', delError.message);
      return 0;
    }

    return idsToDelete.length;
  } catch (err) {
    logger.error('⚠️ [Backup] Excepción en pruneOldBackups:', err.message);
    return 0;
  }
}

// ============================================================================
// CONTROLADORES
// ============================================================================

export async function getAuditSummary(req, res) {
  try {
    const supabase = getSupabase();
    let totalLogs = 0;
    let recentAuditsCount = 0;
    let backupCount = 0;

    if (supabase) {
      const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      const { count: c1 } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true });
      const { count: c2 } = await supabase.from('audit_logs').select('*', { count: 'exact', head: true }).gte('created_at', oneDayAgo);
      const { count: c3 } = await supabase.from('backups').select('*', { count: 'exact', head: true });
      totalLogs = c1 || 0;
      recentAuditsCount = c2 || 0;
      backupCount = c3 || 0;
    }

    res.json({
      audits_last_24h: recentAuditsCount,
      errors_last_24h: 0,
      total_audit_logs: totalLogs,
      backup_count: backupCount
    });
  } catch (err) {
    res.json({
      audits_last_24h: 0,
      errors_last_24h: 0,
      total_audit_logs: 0,
      backup_count: 0
    });
  }
}

export async function getAuditLogs(req, res) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { action, nick, result, entity } = req.query;
    const supabase = getSupabase();

    if (supabase) {
      let query = supabase.from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      if (action) query = query.ilike('action', `%${action}%`);
      if (nick) query = query.ilike('nick', `%${nick}%`);
      if (result) query = query.eq('result', result);
      if (entity) query = query.ilike('entity', `%${entity}%`);

      const start = (page - 1) * limit;
      const { data, count, error } = await query.range(start, start + limit - 1);

      if (!error) {
        return res.json({
          logs: data || [],
          total: count || 0,
          page,
          totalPages: Math.ceil((count || 0) / limit) || 1
        });
      }
    }

    res.json({
      logs: [],
      total: 0,
      page: 1,
      totalPages: 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message, logs: [], total: 0 });
  }
}

export async function getErrorLogs(req, res) {
  res.json({
    logs: [],
    total: 0,
    page: 1,
    totalPages: 1
  });
}

// ----------------------------------------------------------------------------
// GET /api/owner/backup/list
// ----------------------------------------------------------------------------
export async function getBackupList(req, res) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({
        error: 'Servicio de base de datos no disponible',
        code: 'DATABASE_UNAVAILABLE',
        files: []
      });
    }

    const { data, error } = await supabase
      .from('backups')
      .select('id, name, created_at, created_by_nick, size_bytes, hash_sha256, version, tables_included, users_count, performances_count, events_count, notes')
      .order('created_at', { ascending: false })
      .limit(MAX_BACKUPS);

    if (error) {
      logger.error('❌ [Backup] Error al listar:', error.message);
      return res.status(500).json({ error: 'Error al consultar backups', files: [] });
    }

    res.json({
      files: data || [],
      total: (data || []).length,
      max_allowed: MAX_BACKUPS
    });
  } catch (err) {
    logger.error('❌ [Backup] Excepción en getBackupList:', err.message);
    res.status(500).json({ error: err.message, files: [] });
  }
}

// ----------------------------------------------------------------------------
// POST /api/owner/backup/run
// Body opcional: { notes: "texto libre" }
// ----------------------------------------------------------------------------
export async function runManualBackup(req, res) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({
        error: 'Servicio de base de datos no disponible',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 500) : null;

    // ---------- Recolectar datos ----------
    const { data: u } = await supabase.from('users').select('*');
    const { data: p } = await supabase.from('performances').select('*');
    const { data: e } = await supabase.from('events').select('*');

    const sanitizedUsers = (u || []).map(sanitizeUser);

    const backupData = {
      timestamp: new Date().toISOString(),
      version: BACKUP_VERSION,
      users: sanitizedUsers,
      performances: p || [],
      events: e || []
    };

    // ---------- Serializar + hash ----------
    const payloadStr = JSON.stringify(backupData);
    const sizeBytes = Buffer.byteLength(payloadStr, 'utf8');
    const hashSha256 = computeSha256(payloadStr);

    // ---------- Nombre único ----------
    const fileName = `backup-manual-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    // ---------- Persistir ----------
    const record = {
      name: fileName,
      created_by: req.user?.id || null,
      created_by_nick: req.user?.nick || null,
      size_bytes: sizeBytes,
      hash_sha256: hashSha256,
      content: backupData,
      version: BACKUP_VERSION,
      tables_included: ['users', 'performances', 'events'],
      users_count: sanitizedUsers.length,
      performances_count: (p || []).length,
      events_count: (e || []).length,
      notes
    };

    const { data: inserted, error: insertError } = await supabase
      .from('backups')
      .insert(record)
      .select('id, name, created_at, size_bytes, hash_sha256')
      .single();

    if (insertError) {
      logger.error('❌ [Backup] Error al insertar:', insertError.message);
      return res.status(500).json({
        error: 'Error al persistir la copia de seguridad',
        code: 'BACKUP_INSERT_FAILED'
      });
    }

    // ---------- Auto-prune ----------
    const pruned = await pruneOldBackups(supabase);

    // ---------- Auditoría ----------
    try {
      await supabase.from('audit_logs').insert({
        action: 'BACKUP_CREATED',
        actor_id: req.user?.id || null,
        actor_nick: req.user?.nick || null,
        target_type: 'backup',
        target_id: inserted.id,
        result: 'SUCCESS',
        meta: {
          name: fileName,
          size_bytes: sizeBytes,
          hash_sha256: hashSha256,
          pruned_count: pruned,
          notes
        }
      });
    } catch (auditErr) {
      logger.warn('⚠️ [Backup] Auditoría no registrada:', auditErr.message);
    }

    res.json({
      message: 'Copia de seguridad generada y persistida con éxito',
      id: inserted.id,
      file: inserted.name,
      size_bytes: inserted.size_bytes,
      hash_sha256: inserted.hash_sha256,
      created_at: inserted.created_at,
      pruned_old_backups: pruned
    });
  } catch (err) {
    logger.error('❌ [Backup] Excepción en runManualBackup:', err.message);
    res.status(500).json({ error: err.message, code: 'BACKUP_INTERNAL_ERROR' });
  }
}

// ----------------------------------------------------------------------------
// GET /api/owner/backup/download/:id
// ----------------------------------------------------------------------------
export async function downloadBackup(req, res) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({ error: 'Servicio de base de datos no disponible' });
    }

    const { id } = req.params;

    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: 'Backup no encontrado',
        code: 'BACKUP_NOT_FOUND'
      });
    }

    // Verificar integridad del contenido
    const payloadStr = JSON.stringify(data.content);
    const computedHash = computeSha256(payloadStr);

    if (computedHash !== data.hash_sha256) {
      logger.error(`❌ [Backup] Hash mismatch para ${id}: esperado=${data.hash_sha256} calculado=${computedHash}`);
      return res.status(500).json({
        error: 'Integridad del backup comprometida',
        code: 'BACKUP_INTEGRITY_FAILED'
      });
    }

    // Auditoría de descarga
    try {
      await supabase.from('audit_logs').insert({
        action: 'BACKUP_DOWNLOADED',
        actor_id: req.user?.id || null,
        actor_nick: req.user?.nick || null,
        target_type: 'backup',
        target_id: id,
        result: 'SUCCESS',
        meta: { name: data.name, size_bytes: data.size_bytes }
      });
    } catch (auditErr) {
      logger.warn('⚠️ [Backup] Auditoría no registrada:', auditErr.message);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${data.name}"`);
    res.send(payloadStr);
  } catch (err) {
    logger.error('❌ [Backup] Excepción en downloadBackup:', err.message);
    res.status(500).json({ error: err.message });
  }
}

// ----------------------------------------------------------------------------
// DELETE /api/owner/backup/:id
// ----------------------------------------------------------------------------
export async function deleteBackup(req, res) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({ error: 'Servicio de base de datos no disponible' });
    }

    const { id } = req.params;

    // Verificar existencia
    const { data: existing, error: fetchErr } = await supabase
      .from('backups')
      .select('id, name, size_bytes')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({
        error: 'Backup no encontrado',
        code: 'BACKUP_NOT_FOUND'
      });
    }

    const { error: delErr } = await supabase
      .from('backups')
      .delete()
      .eq('id', id);

    if (delErr) {
      logger.error('❌ [Backup] Error al eliminar:', delErr.message);
      return res.status(500).json({ error: 'Error al eliminar backup', code: 'BACKUP_DELETE_FAILED' });
    }

    // Auditoría
    try {
      await supabase.from('audit_logs').insert({
        action: 'BACKUP_DELETED',
        actor_id: req.user?.id || null,
        actor_nick: req.user?.nick || null,
        target_type: 'backup',
        target_id: id,
        result: 'SUCCESS',
        meta: { name: existing.name, size_bytes: existing.size_bytes }
      });
    } catch (auditErr) {
      logger.warn('⚠️ [Backup] Auditoría no registrada:', auditErr.message);
    }

    res.json({
      message: 'Backup eliminado exitosamente',
      id,
      name: existing.name
    });
  } catch (err) {
    logger.error('❌ [Backup] Excepción en deleteBackup:', err.message);
    res.status(500).json({ error: err.message });
  }
}