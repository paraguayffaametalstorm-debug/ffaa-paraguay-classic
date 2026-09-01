import { memoryStore, getSupabase } from '../db/supabase.js';
import { PerformanceSchema } from '../utils/schemas.js';
import { buildSanitizedCSV } from '../utils/csv.js';

export function calculateStatus(tokens, daysConnected) {
  if (tokens < 100 || daysConnected === 0) return 'NEGRO';
  if (tokens < 130) return 'ROJO';
  if (tokens < 175) return 'NARANJA';
  return 'VERDE';
}

export async function savePerformance(req, res, next) {
  try {
    const data = PerformanceSchema.parse(req.body);
    const targetUserId = (req.user.role === 'ADMIN' || req.user.role === 'OWNER') && data.user_id
      ? data.user_id
      : req.user.user_id;

    const targetUser = memoryStore.users.find(u => u.user_id === targetUserId) || req.user;
    const status = calculateStatus(data.tokens, data.days_connected);

    const existingIdx = memoryStore.performances.findIndex(
      p => p.user_id === targetUserId && p.event_id === data.event_id
    );

    const record = {
      id: existingIdx >= 0 ? memoryStore.performances[existingIdx].id : memoryStore.performances.length + 1,
      user_id: targetUserId,
      nick: targetUser.nick,
      role: targetUser.role,
      event_id: data.event_id,
      tokens: data.tokens,
      days_connected: data.days_connected,
      flew_in_group: !!data.flew_in_group,
      notes: data.notes || null,
      status,
      created_at: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      memoryStore.performances[existingIdx] = record;
    } else {
      memoryStore.performances.unshift(record);
    }

    targetUser.perf_status = status;

    // Recalculate average
    const userPerfs = memoryStore.performances.filter(p => p.user_id === targetUserId);
    if (userPerfs.length > 0) {
      targetUser.avg_tokens = Math.round(userPerfs.reduce((s, p) => s + p.tokens, 0) / userPerfs.length);
      targetUser.weeks_evaluated = userPerfs.length;
    }

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('performances').upsert(record);
    }

    res.status(existingIdx >= 0 ? 200 : 201).json({
      message: 'Rendimiento registrado exitosamente',
      action: existingIdx >= 0 ? 'sobrescrito' : 'creado',
      status,
      performance: record
    });
  } catch (err) {
    next(err);
  }
}

export function getMyHistory(req, res) {
  const myPerfs = memoryStore.performances.filter(p => p.user_id === req.user.user_id);
  res.json({ history: myPerfs, performances: myPerfs });
}

export function getStats(req, res) {
  const myPerfs = memoryStore.performances.filter(p => p.user_id === req.user.user_id);
  const totalActives = memoryStore.users.filter(u => u.squad_status === 'ACTIVE').length;
  const avgSquad = Math.round(
    memoryStore.users.reduce((acc, u) => acc + (u.avg_tokens || 0), 0) / (memoryStore.users.length || 1)
  );

  res.json({
    userStats: {
      avg_tokens: req.user.avg_tokens || 0,
      weeks_evaluated: req.user.weeks_evaluated || myPerfs.length,
      trend: req.user.trend || 'stable',
      perf_status: req.user.perf_status || 'VERDE'
    },
    squadStats: {
      total_members: memoryStore.users.length,
      active_members: totalActives,
      avg_tokens: avgSquad,
      at_risk_count: memoryStore.users.filter(u => u.perf_status === 'ROJO' || u.perf_status === 'NEGRO').length
    }
  });
}

export function getAllPerformances(req, res) {
  const { event_id, status, nick } = req.query;
  let list = [...memoryStore.performances];

  if (event_id) list = list.filter(p => p.event_id === event_id);
  if (status) list = list.filter(p => p.status === status);
  if (nick) list = list.filter(p => (p.nick || '').toLowerCase().includes(nick.toLowerCase()));

  res.json({
    performances: list,
    total: list.length
  });
}

export function exportPerformancesCSV(req, res) {
  const headers = ['ID', 'Piloto', 'Rol', 'Evento', 'Tokens', 'Dias_Conectados', 'Vuelo_Grupo', 'Estado', 'Notas', 'Fecha_Registro'];
  const rows = memoryStore.performances.map(p => [
    p.id,
    p.nick,
    p.role,
    p.event_id,
    p.tokens,
    p.days_connected,
    p.flew_in_group ? 'SI' : 'NO',
    p.status,
    p.notes || '',
    p.created_at
  ]);

  const csvContent = buildSanitizedCSV(headers, rows);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="rendimientos_escuadron.csv"');
  res.send(csvContent);
}
