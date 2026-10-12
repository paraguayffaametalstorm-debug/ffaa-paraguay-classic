// src/utils/discordNotifier.js
//
// F1.6b — Discord Notifier (outbound webhooks).
//
// ADR-012 — Integración con Discord.
//
// API pública:
//   - safeNotify(eventType, data, options)     → fire-and-forget
//   - invalidateWebhookCache()                 → limpia caché de URLs
//   - buildEmbed(eventType, data)              → construye embed (exportado para tests)
//
// Diseño:
//   - Nunca lanza. Errores se loguean y se sigue.
//   - Si DISCORD_ENABLED !== true → no-op silencioso.
//   - Resolución de URL: tabla discord_webhooks (por event_type, luego "*")
//     con fallback a ENV.DISCORD_WEBHOOK_URL. Caché TTL 5 min.
//   - Validación Zod del payload con DISCORD_EVENT_SCHEMAS.
//   - Timeout 3s con AbortController.
//   - allowed_mentions: { parse: [] } → nunca pingea @everyone/@here.
//
// Patrón consistente con:
//   - safeAudit() en tournaments.controller.js (fire-and-forget).
//   - getActiveBmAircraft() en tournaments.controller.js (caché TTL).
//   - logger.warn/error de src/config/logger.js.
//
import { logger } from '../config/logger.js';
import { getSupabase } from '../db/supabase.js';
import { DISCORD } from '../config/discord.js';
import {
  DISCORD_COLORS,
  DISCORD_EVENT_SCHEMAS,
  validateDiscordEventData,
  DiscordWebhookPayloadSchema
} from './discordSchemas.js';

// ============================================================
// CACHÉ DE URLs (TTL 5 min)
// ============================================================
// Estructura: Map<eventType, { url: string|null, fetched_at: number }>
// null se cachea para evitar pegarle a Supabase cuando no hay webhook.
// ============================================================

const WEBHOOK_CACHE_TTL_MS = 5 * 60 * 1000;
const _webhookUrlCache = new Map();

/**
 * Invalida la caché de URLs. Llamar cuando se modifica la tabla
 * 'discord_webhooks' (create/update/delete/disable).
 */
export function invalidateWebhookCache() {
  _webhookUrlCache.clear();
  logger.info('🔄 [DiscordNotifier] Caché de webhooks invalidada.');
}

/**
 * Resuelve la URL del webhook para un event_type.
 * Precedencia:
 *   1. Tabla discord_webhooks WHERE event_type = <specific> AND is_active
 *   2. Tabla discord_webhooks WHERE event_type = '*' AND is_active
 *   3. ENV.DISCORD_WEBHOOK_URL (fallback)
 *   4. null → no notificar
 *
 * @param {string} eventType
 * @returns {Promise<string|null>}
 */
async function resolveWebhookUrl(eventType) {
  // 1. Caché
  const cached = _webhookUrlCache.get(eventType);
  if (cached && Date.now() - cached.fetched_at < WEBHOOK_CACHE_TTL_MS) {
    return cached.url;
  }

  // 2. Feature flag
  if (!DISCORD.enabled) {
    _webhookUrlCache.set(eventType, { url: null, fetched_at: Date.now() });
    return null;
  }

  // 3. Tabla
  let urlFromTable = null;
  const supabase = getSupabase();
  if (supabase) {
    try {
      // 3.a — Evento específico
      const { data: specific, error: specificErr } = await supabase
        .from('discord_webhooks')
        .select('webhook_url')
        .eq('event_type', eventType)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (specificErr) {
        logger.warn('⚠️ [DiscordNotifier] Error consultando webhook específico:', specificErr.message);
      } else if (specific?.webhook_url) {
        urlFromTable = specific.webhook_url;
      }

      // 3.b — Comodín '*'
      if (!urlFromTable) {
        const { data: wildcard, error: wildcardErr } = await supabase
          .from('discord_webhooks')
          .select('webhook_url')
          .eq('event_type', '*')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (wildcardErr) {
          logger.warn('⚠️ [DiscordNotifier] Error consultando webhook wildcard:', wildcardErr.message);
        } else if (wildcard?.webhook_url) {
          urlFromTable = wildcard.webhook_url;
        }
      }
    } catch (err) {
      logger.warn('⚠️ [DiscordNotifier] Excepción consultando tabla:', err.message);
    }
  }

  // 4. Fallback a env var
  const url = urlFromTable || DISCORD.webhookUrl || null;

  // 5. Cachear (incluso null)
  _webhookUrlCache.set(eventType, { url, fetched_at: Date.now() });

  return url;
}

// ============================================================
// BUILDERS DE EMBEDS (uno por event_type)
// ============================================================

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-PY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Asuncion'
    });
  } catch {
    return iso;
  }
}

function truncate(str, max) {
  if (!str) return '';
  const s = String(str);
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/**
 * Construye el embed para un event_type.
 * @param {string} eventType
 * @param {object} data — payload ya validado
 * @returns {object} — { content?, embeds: [...] }
 */
export function buildEmbed(eventType, data) {
  const footer = { text: '🏆 PARAGUAY-FFAA | METALSTORM · Torneos' };

  switch (eventType) {
    case 'TOURNAMENT_CREATED':
      return {
        embeds: [{
          title: '🏆 Nuevo Torneo Creado',
          description: '**' + truncate(data.name, 200) + '**',
          color: DISCORD_COLORS.GOLD,
          timestamp: new Date().toISOString(),
          footer,
          fields: [
            { name: '📋 Formato', value: data.format, inline: true },
            { name: '📊 Alcance', value: data.scope, inline: true },
            { name: '👥 Equipos', value: data.min_teams + '-' + data.max_teams, inline: true },
            { name: '📅 Inicio', value: fmtDate(data.starts_at), inline: true },
            { name: '📅 Cierre', value: data.ends_at ? fmtDate(data.ends_at) : '—', inline: true },
            { name: '🎖️ Creado por', value: data.created_by_nick || '—', inline: true }
          ]
        }]
      };

    case 'TOURNAMENT_TEAM_REGISTERED':
      return {
        embeds: [{
          title: '👥 Equipo Registrado',
          description: '**' + truncate(data.team_name, 100) + '** en *' + truncate(data.tournament_name, 100) + '*',
          color: DISCORD_COLORS.BLUE,
          timestamp: new Date().toISOString(),
          footer,
          fields: [
            { name: '🎖️ Capitán', value: data.captain_nick || data.captain_user_id.substring(0, 8), inline: true },
            { name: '👥 Roster', value: data.roster_size + ' miembros', inline: true }
          ]
        }]
      };

    case 'TOURNAMENT_MATCH_RESULT_RECORDED':
      return {
        embeds: [{
          title: '🎯 Resultado Registrado',
          description: '**' + truncate(data.tournament_name, 100) + '**' + (data.phase ? ' · ' + data.phase : ''),
          color: DISCORD_COLORS.GREEN,
          timestamp: new Date().toISOString(),
          footer,
          fields: [
            { name: '📊 Score', value: '**' + data.score_a + ' — ' + data.score_b + '** (Bo' + data.best_of + ')', inline: false },
            { name: '🏆 Ganador', value: data.winner_name || (data.winner_id ? data.winner_id.substring(0, 8) : '—'), inline: true },
            { name: '⚖️ Registrado por', value: data.recorded_by_nick || '—', inline: true }
          ]
        }]
      };

    case 'TOURNAMENT_DRAFT_ACTION_RECORDED': {
      const actionIcon = data.action === 'BAN' ? '🚫' : '✈️';
      return {
        embeds: [{
          title: actionIcon + ' Acción de Draft',
          description: '**' + truncate(data.tournament_name, 100) + '** · Partida ' + data.game_number,
          color: DISCORD_COLORS.YELLOW,
          timestamp: new Date().toISOString(),
          footer,
          fields: [
            { name: '⚡ Acción', value: data.action + ' #' + data.order_index, inline: true },
            { name: '👥 Equipo', value: data.team_label || data.team_id.substring(0, 8), inline: true },
            { name: '✈️ Aeronave', value: truncate(data.aircraft_name || data.aircraft_id, 100), inline: false }
          ]
        }]
      };
    }

    case 'TOURNAMENT_STATUS_CHANGED': {
      const isCancelled = data.to_status === 'CANCELLED';
      const isFinished  = data.to_status === 'FINISHED';
      const icon = isCancelled ? '❌' : isFinished ? '🏁' : '🔄';
      const color = isCancelled ? DISCORD_COLORS.RED : isFinished ? DISCORD_COLORS.GREEN : DISCORD_COLORS.YELLOW;
      const fields = [
        { name: '📊 Transición', value: data.from_status + ' → **' + data.to_status + '**', inline: false }
      ];
      if (data.reason) {
        fields.push({ name: '💬 Motivo', value: truncate(data.reason, 500), inline: false });
      }
      if (data.changed_by_nick) {
        fields.push({ name: '⚖️ Por', value: data.changed_by_nick, inline: true });
      }
      return {
        embeds: [{
          title: icon + ' Estado del Torneo',
          description: '**' + truncate(data.tournament_name, 100) + '**',
          color,
          timestamp: new Date().toISOString(),
          footer,
          fields
        }]
      };
    }

    case 'TOURNAMENT_MODERATOR_CHANGED':
      return {
        embeds: [{
          title: '🎖️ Moderador Reasignado',
          description: '**' + truncate(data.tournament_name, 100) + '**',
          color: DISCORD_COLORS.BLUE,
          timestamp: new Date().toISOString(),
          footer,
          fields: [
            { name: '📤 Anterior', value: data.previous_moderator_nick || (data.previous_moderator_id ? data.previous_moderator_id.substring(0, 8) : '—'), inline: true },
            { name: '📥 Nuevo',    value: data.new_moderator_nick || data.new_moderator_id.substring(0, 8), inline: true },
            { name: '💬 Motivo',   value: truncate(data.reason, 500), inline: false }
          ]
        }]
      };

    default:
      logger.warn('⚠️ [DiscordNotifier] buildEmbed: event_type desconocido: ' + eventType);
      return { content: "ℹ️ Evento '" + eventType + "' (sin template específico)." };
  }
}

// ============================================================
// POST A DISCORD
// ============================================================

/**
 * Hace POST a la URL con timeout.
 * @param {string} url
 * @param {object} payload
 * @returns {Promise<{ ok: boolean, status?: number, error?: string }>}
 */
async function postToDiscord(url, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DISCORD.timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      return {
        ok: false,
        status: res.status,
        error: 'HTTP ' + res.status + ': ' + truncate(bodyText, 200)
      };
    }

    return { ok: true, status: res.status };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, error: 'Timeout después de ' + DISCORD.timeoutMs + 'ms' };
    }
    return { ok: false, error: err.message || String(err) };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================
// API PÚBLICA — safeNotify
// ============================================================

/**
 * Notifica a Discord de forma fire-and-forget.
 *
 * NUNCA lanza. Errores se loguean como warn/error y se sigue.
 *
 * @param {string} eventType — ej: 'TOURNAMENT_CREATED'
 * @param {object} data      — payload validado contra DISCORD_EVENT_SCHEMAS[eventType]
 * @param {object} [options] — { skipIfDisabled?: boolean }
 * @returns {Promise<{ sent: boolean, reason?: string }>}
 */
export async function safeNotify(eventType, data, options = {}) {
  const { skipIfDisabled = true } = options;

  // 1. Feature flag
  if (!DISCORD.enabled) {
    if (!skipIfDisabled) {
      logger.info('ℹ️ [DiscordNotifier] Discord deshabilitado. Skip ' + eventType + '.');
    }
    return { sent: false, reason: 'DISCORD_DISABLED' };
  }

  // 2. Validar event_type conocido
  if (!DISCORD_EVENT_SCHEMAS[eventType]) {
    logger.warn('⚠️ [DiscordNotifier] event_type desconocido: ' + eventType + '. Skip.');
    return { sent: false, reason: 'UNKNOWN_EVENT_TYPE' };
  }

  // 3. Validar data
  const validation = validateDiscordEventData(eventType, data);
  if (!validation.ok) {
    logger.warn(
      '⚠️ [DiscordNotifier] Data inválida para ' + eventType + ':',
      JSON.stringify(validation.error).slice(0, 300)
    );
    return { sent: false, reason: 'VALIDATION_ERROR' };
  }

  // 4. Resolver URL
  let url;
  try {
    url = await resolveWebhookUrl(eventType);
  } catch (err) {
    logger.warn('⚠️ [DiscordNotifier] Error resolviendo URL:', err.message);
    return { sent: false, reason: 'RESOLVE_ERROR' };
  }

  if (!url) {
    logger.info('ℹ️ [DiscordNotifier] Sin webhook configurado para ' + eventType + '. Skip.');
    return { sent: false, reason: 'NO_WEBHOOK_CONFIGURED' };
  }

  // 5. Construir payload
  let payload;
  try {
    payload = buildEmbed(eventType, validation.data);
    // Agregar allowed_mentions para evitar ping accidental
    payload.allowed_mentions = { parse: [] };

    // Validar payload contra el schema raíz
    const payloadCheck = DiscordWebhookPayloadSchema.safeParse(payload);
    if (!payloadCheck.success) {
      logger.warn(
        '⚠️ [DiscordNotifier] Payload inválido para ' + eventType + ':',
        JSON.stringify(payloadCheck.error.issues).slice(0, 300)
      );
      return { sent: false, reason: 'PAYLOAD_INVALID' };
    }
    payload = payloadCheck.data;
  } catch (err) {
    logger.warn('⚠️ [DiscordNotifier] Error construyendo embed:', err.message);
    return { sent: false, reason: 'BUILD_ERROR' };
  }

  // 6. POST a Discord
  let result;
  try {
    result = await postToDiscord(url, payload);
  } catch (err) {
    logger.warn('⚠️ [DiscordNotifier] Excepción inesperada:', err.message);
    return { sent: false, reason: 'POST_EXCEPTION' };
  }

  if (!result.ok) {
    // Rate limit (429) → warn, no error
    if (result.status === 429) {
      logger.warn('⚠️ [DiscordNotifier] Rate limit en ' + eventType + '. Se reintentará en el próximo evento.');
    } else {
      logger.error('❌ [DiscordNotifier] Error enviando ' + eventType + ': ' + result.error);
    }
    return { sent: false, reason: 'POST_FAILED', error: result.error };
  }

  logger.info('✅ [DiscordNotifier] ' + eventType + ' notificado (HTTP ' + result.status + ').');
  return { sent: true };
}

export default { safeNotify, buildEmbed, invalidateWebhookCache };
