// src/controllers/discord.controller.js
//
// F1.6d — Handlers de las HTTP Interactions de Discord.
//
// Recibe los eventos firmados por Discord y responde con
// InteractionResponseType (type 1, 4, etc.). NO usa deferred (type 5)
// porque Render free puede dormir la app entre el ack y el edit.
//
// Referencia:
//   https://discord.com/developers/docs/interactions/receiving-and-responding
//
// Flujo:
//   1. verifyDiscordSignature (middleware) → req.rawBody verificado.
//   2. handleInteraction (este controller) → switch por type.
//   3. Responder SIEMPRE algo a Discord en <3s.
//
// Comandos soportados (F1.6d commit 6):
//   - /torneo status          → lista torneos activos
//   - /torneo bracket <id>    → bracket del torneo
//   - /torneo equipos <id>    → equipos registrados
//   - /torneo draft <id>      → estado del draft por partida
//
import {
  DISCORD,
  TOURNAMENT_SUBCOMMANDS,
  EMBED_COLORS
} from '../config/discord.js';
import { logger } from '../config/logger.js';
import { getSupabase } from '../db/supabase.js';

// ── Helpers de embed ─────────────────────────────────────────

function buildEmbed({ title, description, color = EMBED_COLORS.PRIMARY, fields = [] }) {
  return {
    title,
    description,
    color,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: 'PARAGUAY FFAA [PRY] — MetalStorm' }
  };
}

function respondWithEmbed(res, embed) {
  return res.status(200).json({
    type: DISCORD.responseTypes.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] }
  });
}

function respondWithError(res, message, color = EMBED_COLORS.DANGER) {
  return res.status(200).json({
    type: DISCORD.responseTypes.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      embeds: [buildEmbed({ title: '⚠️ Error', description: message, color })]
    }
  });
}

// ── Helpers de parseo ────────────────────────────────────────

function parseSubcommand(data) {
  const first = data?.options?.[0];
  if (!first || first.type !== 1) {
    return { subcommand: null, params: {} };
  }

  const params = {};
  for (const opt of first.options || []) {
    params[opt.name] = opt.value;
  }

  return { subcommand: first.name, params };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

// ── Formato de fechas ────────────────────────────────────────

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  } catch {
    return String(iso);
  }
}

// ── /torneo status ───────────────────────────────────────────

async function handleTorneoStatus() {
  const supabase = getSupabase();
  if (!supabase) {
    return buildEmbed({
      title: '🏆 Torneos activos',
      description: '⚠️ Base de datos no disponible. Reintentá en unos minutos.',
      color: EMBED_COLORS.DANGER
    });
  }

  const { data, error } = await supabase
    .from('tournaments')
    .select('id, name, format, scope, status, starts_at, ends_at, min_teams, max_teams')
    .in('status', ['REGISTRATION', 'ONGOING'])
    .order('starts_at', { ascending: true })
    .limit(10);

  if (error) {
    logger.error(`❌ [Discord] Error en /torneo status: ${error.message}`);
    return buildEmbed({
      title: '🏆 Torneos activos',
      description: '⚠️ Error consultando la base de datos.',
      color: EMBED_COLORS.DANGER
    });
  }

  if (!data || data.length === 0) {
    return buildEmbed({
      title: '🏆 Torneos activos',
      description: 'No hay torneos en curso ni en inscripción.',
      color: EMBED_COLORS.NEUTRAL
    });
  }

  const fields = data.map((t) => ({
    name: `${t.status === 'ONGOING' ? '🟢' : '🟡'} ${t.name}`,
    value: [
      `**Formato:** ${t.format} · **Scope:** ${t.scope}`,
      `**Equipos:** ${t.min_teams}–${t.max_teams}`,
      `**Inicia:** ${formatDateTime(t.starts_at)}`,
      `**ID:** \`${t.id}\``
    ].join('\n'),
    inline: false
  }));

  return buildEmbed({
    title: `🏆 Torneos activos (${data.length})`,
    description: 'Usá `/torneo bracket <id>` para ver el bracket.',
    color: EMBED_COLORS.INFO,
    fields
  });
}

// ── /torneo bracket <id> ─────────────────────────────────────

async function handleTorneoBracket(params) {
  if (!params.id) {
    return buildEmbed({
      title: '📊 Bracket del torneo',
      description: 'Falta el parámetro `id`. Usá `/torneo status` para ver los IDs.',
      color: EMBED_COLORS.WARNING
    });
  }
  if (!isValidUUID(params.id)) {
    return buildEmbed({
      title: '📊 Bracket del torneo',
      description: 'El `id` no es un UUID válido.',
      color: EMBED_COLORS.WARNING
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return buildEmbed({
      title: '📊 Bracket del torneo',
      description: '⚠️ Base de datos no disponible.',
      color: EMBED_COLORS.DANGER
    });
  }

  // 1. Datos del torneo.
  const { data: torneo, error: errTorneo } = await supabase
    .from('tournaments')
    .select('id, name, format, scope, status')
    .eq('id', params.id)
    .maybeSingle();

  if (errTorneo) {
    logger.error(`❌ [Discord] Error en /torneo bracket (torneo): ${errTorneo.message}`);
    return buildEmbed({
      title: '📊 Bracket del torneo',
      description: '⚠️ Error consultando el torneo.',
      color: EMBED_COLORS.DANGER
    });
  }
  if (!torneo) {
    return buildEmbed({
      title: '📊 Bracket del torneo',
      description: `No existe un torneo con id \`${params.id}\`.`,
      color: EMBED_COLORS.WARNING
    });
  }

  // 2. Matches del torneo.
  const { data: matches, error: errMatches } = await supabase
    .from('tournament_matches')
    .select('id, phase, round, status, team_a_id, team_b_id, score_a, score_b, winner_id, best_of')
    .eq('tournament_id', params.id)
    .order('phase', { ascending: true })
    .order('round', { ascending: true })
    .order('id', { ascending: true });

  if (errMatches) {
    logger.error(`❌ [Discord] Error en /torneo bracket (matches): ${errMatches.message}`);
    return buildEmbed({
      title: '📊 Bracket del torneo',
      description: '⚠️ Error consultando los matches.',
      color: EMBED_COLORS.DANGER
    });
  }

  if (!matches || matches.length === 0) {
    return buildEmbed({
      title: `📊 Bracket — ${torneo.name}`,
      description: 'El bracket aún no fue generado.',
      color: EMBED_COLORS.NEUTRAL
    });
  }

  // 3. Agrupación por fase.
  const byPhase = {};
  for (const m of matches) {
    const phase = m.phase || 'UNKNOWN';
    if (!byPhase[phase]) byPhase[phase] = [];
    byPhase[phase].push(m);
  }

  const fields = Object.entries(byPhase).map(([phase, list]) => {
    const lines = list.slice(0, 10).map((m) => {
      const score = m.status === 'FINISHED'
        ? `${m.score_a ?? 0}-${m.score_b ?? 0}`
        : 'vs';
      const emoji = m.status === 'FINISHED' ? '✅' : (m.status === 'ONGOING' ? '🟢' : '⏳');
      return `${emoji} R${m.round} · \`${String(m.id).slice(0, 8)}\` · ${score}`;
    });
    const suffix = list.length > 10 ? `\n… y ${list.length - 10} más` : '';
    return {
      name: `📌 ${phase} (${list.length})`,
      value: lines.join('\n') + suffix,
      inline: false
    };
  });

  return buildEmbed({
    title: `📊 Bracket — ${torneo.name}`,
    description: [
      `**Formato:** ${torneo.format} · **Scope:** ${torneo.scope}`,
      `**Estado:** ${torneo.status} · **Matches:** ${matches.length}`
    ].join('\n'),
    color: EMBED_COLORS.INFO,
    fields
  });
}

// ── /torneo equipos <id> ─────────────────────────────────────

async function handleTorneoEquipos(params) {
  if (!params.id) {
    return buildEmbed({
      title: '👥 Equipos registrados',
      description: 'Falta el parámetro `id`.',
      color: EMBED_COLORS.WARNING
    });
  }
  if (!isValidUUID(params.id)) {
    return buildEmbed({
      title: '👥 Equipos registrados',
      description: 'El `id` no es un UUID válido.',
      color: EMBED_COLORS.WARNING
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return buildEmbed({
      title: '👥 Equipos registrados',
      description: '⚠️ Base de datos no disponible.',
      color: EMBED_COLORS.DANGER
    });
  }

  const { data: torneo, error: errTorneo } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .eq('id', params.id)
    .maybeSingle();

  if (errTorneo) {
    logger.error(`❌ [Discord] Error en /torneo equipos (torneo): ${errTorneo.message}`);
    return buildEmbed({
      title: '👥 Equipos registrados',
      description: '⚠️ Error consultando el torneo.',
      color: EMBED_COLORS.DANGER
    });
  }
  if (!torneo) {
    return buildEmbed({
      title: '👥 Equipos registrados',
      description: `No existe un torneo con id \`${params.id}\`.`,
      color: EMBED_COLORS.WARNING
    });
  }

  const { data: teams, error: errTeams } = await supabase
    .from('tournament_participants')
    .select('id, team_name, captain_user_id, roster, seed, created_at')
    .eq('tournament_id', params.id)
    .order('seed', { ascending: true })
    .order('team_name', { ascending: true });

  if (errTeams) {
    logger.error(`❌ [Discord] Error en /torneo equipos (teams): ${errTeams.message}`);
    return buildEmbed({
      title: '👥 Equipos registrados',
      description: '⚠️ Error consultando los equipos.',
      color: EMBED_COLORS.DANGER
    });
  }

  if (!teams || teams.length === 0) {
    return buildEmbed({
      title: `👥 Equipos — ${torneo.name}`,
      description: 'No hay equipos registrados todavía.',
      color: EMBED_COLORS.NEUTRAL
    });
  }

  const lines = teams.map((t, i) => {
    const rosterSize = Array.isArray(t.roster) ? t.roster.length : 0;
    const seed = t.seed != null ? `#${t.seed}` : `#${i + 1}`;
    return `${seed} **${t.team_name}** · ${rosterSize} pilotos`;
  });

  return buildEmbed({
    title: `👥 Equipos — ${torneo.name} (${teams.length})`,
    description: lines.join('\n'),
    color: EMBED_COLORS.INFO
  });
}

// ── /torneo draft <id> ───────────────────────────────────────

async function handleTorneoDraft(params) {
  if (!params.id) {
    return buildEmbed({
      title: '🎯 Estado del draft',
      description: 'Falta el parámetro `id` (ID del **match**, no del torneo).',
      color: EMBED_COLORS.WARNING
    });
  }
  if (!isValidUUID(params.id)) {
    return buildEmbed({
      title: '🎯 Estado del draft',
      description: 'El `id` no es un UUID válido.',
      color: EMBED_COLORS.WARNING
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return buildEmbed({
      title: '🎯 Estado del draft',
      description: '⚠️ Base de datos no disponible.',
      color: EMBED_COLORS.DANGER
    });
  }

  // 1. Verificar que el match exista.
  const { data: match, error: errMatch } = await supabase
    .from('tournament_matches')
    .select('id, tournament_id, phase, round, best_of, status, team_a_id, team_b_id')
    .eq('id', params.id)
    .maybeSingle();

  if (errMatch) {
    logger.error(`❌ [Discord] Error en /torneo draft (match): ${errMatch.message}`);
    return buildEmbed({
      title: '🎯 Estado del draft',
      description: '⚠️ Error consultando el match.',
      color: EMBED_COLORS.DANGER
    });
  }
  if (!match) {
    return buildEmbed({
      title: '🎯 Estado del draft',
      description: `No existe un match con id \`${params.id}\`.`,
      color: EMBED_COLORS.WARNING
    });
  }

  // 2. Drafts del match.
  const { data: drafts, error: errDrafts } = await supabase
    .from('tournament_drafts')
    .select('id, game_number, team_id, action, aircraft_id, order_index, created_at')
    .eq('match_id', params.id)
    .order('game_number', { ascending: true })
    .order('order_index', { ascending: true });

  if (errDrafts) {
    logger.error(`❌ [Discord] Error en /torneo draft (drafts): ${errDrafts.message}`);
    return buildEmbed({
      title: '🎯 Estado del draft',
      description: '⚠️ Error consultando los drafts.',
      color: EMBED_COLORS.DANGER
    });
  }

  if (!drafts || drafts.length === 0) {
    return buildEmbed({
      title: `🎯 Draft — Match ${String(match.id).slice(0, 8)}`,
      description: `Sin acciones de draft todavía.\n**Fase:** ${match.phase} · **Ronda:** ${match.round} · **Bo${match.best_of}**`,
      color: EMBED_COLORS.NEUTRAL
    });
  }

  // 3. Agrupar por game_number.
  const byGame = {};
  for (const d of drafts) {
    const g = String(d.game_number);
    if (!byGame[g]) byGame[g] = [];
    byGame[g].push(d);
  }

  const fields = Object.entries(byGame).map(([game, list]) => {
    const lines = list.slice(0, 15).map((d) => {
      const action = d.action === 'BAN' ? '🚫 BAN' : '✅ PICK';
      const team = String(d.team_id).slice(0, 8);
      return `${action} \`${d.aircraft_id}\` por team \`${team}\``;
    });
    const suffix = list.length > 15 ? `\n… y ${list.length - 15} más` : '';
    return {
      name: `🎮 Partida ${game} (${list.length})`,
      value: lines.join('\n') + suffix,
      inline: false
    };
  });

  return buildEmbed({
    title: `🎯 Draft — Match ${String(match.id).slice(0, 8)}`,
    description: `**Fase:** ${match.phase} · **Ronda:** ${match.round} · **Bo${match.best_of}** · **Estado:** ${match.status}`,
    color: EMBED_COLORS.INFO,
    fields
  });
}

// ── Dispatch de /torneo ──────────────────────────────────────

async function dispatchTorneo(subcommand, params) {
  switch (subcommand) {
    case 'status':
      return handleTorneoStatus(params);
    case 'bracket':
      return handleTorneoBracket(params);
    case 'equipos':
      return handleTorneoEquipos(params);
    case 'draft':
      return handleTorneoDraft(params);
    default:
      throw new Error(`Subcomando desconocido: ${subcommand}`);
  }
}

// ── Handler principal ────────────────────────────────────────

export async function handleInteraction(req, res) {
  try {
    const interaction = req.body;

    // Type 1: PING (verificación de endpoint por Discord)
    if (interaction.type === DISCORD.interactionTypes.PING) {
      return res.status(200).json({ type: DISCORD.responseTypes.PONG });
    }

    // Type 2: APPLICATION_COMMAND
    if (interaction.type === DISCORD.interactionTypes.APPLICATION_COMMAND) {
      const commandName = interaction.data?.name;

      if (commandName === 'torneo') {
        const { subcommand, params } = parseSubcommand(interaction.data);

        if (!subcommand || !TOURNAMENT_SUBCOMMANDS.includes(subcommand)) {
          return respondWithError(
            res,
            `Subcomando inválido. Usá: ${TOURNAMENT_SUBCOMMANDS.join(', ')}.`,
            EMBED_COLORS.WARNING
          );
        }

        const embed = await dispatchTorneo(subcommand, params);
        return respondWithEmbed(res, embed);
      }

      logger.warn(`⚠️ [Discord] Comando desconocido: ${commandName}`);
      return respondWithError(res, `Comando desconocido: \`${commandName}\`.`);
    }

    logger.warn(`⚠️ [Discord] Interaction type no soportado: ${interaction.type}`);
    return respondWithError(
      res,
      `Tipo de interacción no soportada todavía (type=${interaction.type}).`,
      EMBED_COLORS.WARNING
    );
  } catch (err) {
    logger.error(`❌ [Discord] Error en handleInteraction: ${err.message}`);
    return respondWithError(
      res,
      'Error interno procesando el comando. Intentá de nuevo en unos segundos.'
    );
  }
}

export default handleInteraction;