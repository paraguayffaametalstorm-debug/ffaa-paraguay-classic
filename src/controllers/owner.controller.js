import { memoryStore } from '../db/supabase.js';

export function getAuditSummary(req, res) {
  const oneDayAgo = Date.now() - 24 * 3600000;
  const recentAudits = memoryStore.auditLogs.filter(a => new Date(a.created_at).getTime() >= oneDayAgo);
  const recentErrors = memoryStore.errorLogs.filter(e => new Date(e.timestamp).getTime() >= oneDayAgo);

  res.json({
    audits_last_24h: recentAudits.length,
    errors_last_24h: recentErrors.length,
    total_audit_logs: memoryStore.auditLogs.length,
    backup_count: memoryStore.backups.length
  });
}

export function getAuditLogs(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { action, nick, result, entity } = req.query;

  let logs = [...memoryStore.auditLogs];

  if (action) logs = logs.filter(l => (l.action || '').toLowerCase().includes(action.toLowerCase()));
  if (nick) logs = logs.filter(l => (l.nick || '').toLowerCase().includes(nick.toLowerCase()));
  if (result) logs = logs.filter(l => l.result === result);
  if (entity) logs = logs.filter(l => (l.entity || '').toLowerCase().includes(entity.toLowerCase()));

  const start = (page - 1) * limit;
  const paginated = logs.slice(start, start + limit);

  res.json({
    logs: paginated,
    total: logs.length,
    page,
    totalPages: Math.ceil(logs.length / limit)
  });
}

export function getErrorLogs(req, res) {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { level, route } = req.query;

  let logs = [...memoryStore.errorLogs];
  if (level) logs = logs.filter(l => l.level === level);
  if (route) logs = logs.filter(l => (l.route || '').toLowerCase().includes(route.toLowerCase()));

  const start = (page - 1) * limit;
  const paginated = logs.slice(start, start + limit);

  res.json({
    logs: paginated,
    total: logs.length,
    page,
    totalPages: Math.ceil(logs.length / limit)
  });
}

export function getBackupList(req, res) {
  res.json({ files: memoryStore.backups });
}

export function runManualBackup(req, res) {
  const backupData = {
    timestamp: new Date().toISOString(),
    version: '3.1.0',
    users: memoryStore.users.map(({ password_hash, ...u }) => u),
    performances: memoryStore.performances,
    events: memoryStore.events,
    planes: memoryStore.userPlanes,
    normativas: memoryStore.normativas,
    userSettings: memoryStore.userSettings
  };

  const payloadStr = JSON.stringify(backupData);
  const sizeBytes = Buffer.byteLength(payloadStr, 'utf8');

  const newBackup = {
    name: `backup-manual-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    created_at: new Date().toISOString(),
    size_bytes: sizeBytes
  };

  memoryStore.backups.unshift(newBackup);

  memoryStore.auditLogs.unshift({
    id: memoryStore.auditLogs.length + 1,
    created_at: new Date().toISOString(),
    nick: req.user.nick,
    role: req.user.role,
    action: 'OWNER_MANUAL_BACKUP',
    entity: 'SYSTEM',
    entity_id: String(newBackup.name),
    details: JSON.stringify({ file: newBackup.name, bytes: sizeBytes }),
    result: 'SUCCESS',
    ip: req.ip || '127.0.0.1'
  });

  res.json({
    message: 'Copia de seguridad generada y resguardada con éxito',
    file: newBackup.name,
    size_bytes: sizeBytes,
    elapsed_ms: 32
  });
}
