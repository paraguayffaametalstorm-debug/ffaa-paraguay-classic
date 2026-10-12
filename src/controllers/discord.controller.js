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
import {
  DISCORD,
  TOURNAMENT_SUBCOMMANDS,
  EMBED_COLORS
} from '../config/discord.js';
import { logger } from '../config/logger.js';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Devuelve el embed estándar del escuadrón para un mensaje informativo.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {number} [opts.color]
 * @returns {object} Embed listo para `data.embeds[0]`.
 */
function buildEmbed({ title, description, color = EMBED_COLORS.PRIMARY }) {
  return {
    title,
    description,
    color,
    timestamp: new Date().toISOString(),
    footer: { text: 'PARAGUAY FFAA [PRY] — MetalStorm' }
  };
}

/**
 * Respuesta tipo 4 (CHANNEL_MESSAGE_WITH_SOURCE).
 * Es la respuesta inmediata estándar.
 */
function respondWithEmbed(res, embed) {
  return res.status(200).json({
    type: DISCORD.responseTypes.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { embeds: [embed] }
  });
}

/**
 * Respuesta tipo 4 con mensaje de error efímero (solo lo ve quien invocó).
 */
function respondWithError(res, message) {
  return res.status(200).json({
    type: DISCORD.responseTypes.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: `⚠️ ${message}`,
      flags: DISCORD.responseFlags.EPHEMERAL
    }
  });
}

// ── Subcomandos de /torneo (stubs hasta F1.6e) ───────────────

/**
 * Extrae los subcomandos y sus opciones del payload de Discord.
 *
 * Discord con subcomandos manda:
 *   data.options = [
 *     { name: 'status', type: 1, options: [] },
 *     { name: 'bracket', type: 1, options: [{ name: 'id', type: 3, value: 'uuid' }] }
 *   ]
 *
 * @param {object} data
 * @returns {{ subcommand: string|null, params: object }}
 */
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

/**
 * Handler de `/torneo status` — STUB.
 * En F1.6e consultará Supabase para listar torneos activos.
 */
async function handleTorneoStatus(_params) {
  return buildEmbed({
    title: '🏆 Torneos activos',
    description: 'Consulta en construcción. Disponible en F1.6e.',
    color: EMBED_COLORS.INFO
  });
}

/**
 * Handler de `/torneo bracket <id>` — STUB.
 * En F1.6e mostrará el bracket del torneo.
 */
async function handleTorneoBracket(params) {
  return buildEmbed({
    title: '📊 Bracket del torneo',
    description: params.id
      ? `Torneo: \`${params.id}\`\nConsulta en construcción. Disponible en F1.6e.`
      : 'Falta el parámetro `id`.',
    color: EMBED_COLORS.INFO
  });
}

/**
 * Handler de `/torneo equipos <id>` — STUB.
 * En F1.6e mostrará los equipos registrados.
 */
async function handleTorneoEquipos(params) {
  return buildEmbed({
    title: '👥 Equipos registrados',
    description: params.id
      ? `Torneo: \`${params.id}\`\nConsulta en construcción. Disponible en F1.6e.`
      : 'Falta el parámetro `id`.',
    color: EMBED_COLORS.INFO
  });
}

/**
 * Handler de `/torneo draft <id>` — STUB.
 * En F1.6e mostrará el estado del draft de un match.
 */
async function handleTorneoDraft(params) {
  return buildEmbed({
    title: '🎯 Estado del draft',
    description: params.id
      ? `Match: \`${params.id}\`\nConsulta en construcción. Disponible en F1.6e.`
      : 'Falta el parámetro `id`.',
    color: EMBED_COLORS.INFO
  });
}

// ── Dispatch de /torneo ──────────────────────────────────────

/**
 * Dispatch de subcomandos de /torneo.
 *
 * @param {string} subcommand - Uno de TOURNAMENT_SUBCOMMANDS.
 * @param {object} params
 * @returns {Promise<object>} Embed de respuesta.
 */
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

/**
 * Handler de POST /api/discord/interactions.
 *
 * Requiere que verifyDiscordSignature haya pasado (firma válida).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
export async function handleInteraction(req, res) {
  try {
    const interaction = req.body;

    // ── Type 1: PING (verificación de endpoint por Discord) ──
    if (interaction.type === DISCORD.interactionTypes.PING) {
      return res.status(200).json({ type: DISCORD.responseTypes.PONG });
    }

    // ── Type 2: APPLICATION_COMMAND ──
    if (interaction.type === DISCORD.interactionTypes.APPLICATION_COMMAND) {
      const commandName = interaction.data?.name;

      if (commandName === 'torneo') {
        const { subcommand, params } = parseSubcommand(interaction.data);

        if (!subcommand || !TOURNAMENT_SUBCOMMANDS.includes(subcommand)) {
          return respondWithError(
            res,
            `Subcomando inválido. Usá: ${TOURNAMENT_SUBCOMMANDS.join(', ')}.`
          );
        }

        const embed = await dispatchTorneo(subcommand, params);
        return respondWithEmbed(res, embed);
      }

      // Comando desconocido → error efímero (no debería pasar si está bien registrado)
      logger.warn(`⚠️ [Discord] Comando desconocido: ${commandName}`);
      return respondWithError(res, `Comando desconocido: \`${commandName}\`.`);
    }

    // ── Otros tipos (MESSAGE_COMPONENT, MODAL_SUBMIT, etc.) ──
    // No los soportamos en F1.6d. Respondemos genérico para no colgar a Discord.
    logger.warn(`⚠️ [Discord] Interaction type no soportado: ${interaction.type}`);
    return respondWithError(
      res,
      `Tipo de interacción no soportada todavía (type=${interaction.type}).`
    );
  } catch (err) {
    logger.error(`❌ [Discord] Error en handleInteraction: ${err.message}`);
    // Respondemos algo a Discord para no dejarlo colgado (timeout = 3s).
    return respondWithError(
      res,
      'Error interno procesando el comando. Intentá de nuevo en unos segundos.'
    );
  }
}

export default handleInteraction;