// src/config/discord.js
//
// ADR-012 — Configuración de la integración con Discord (F1.6).
//
// Carga y valida las variables de entorno. Si DISCORD_ENABLED !== 'true',
// todo el módulo se considera desactivado y los helpers devuelven
// no-op / { enabled: false }.
//
// Patrón consistente con env.js:
//   - Defaults seguros (cadena vacía).
//   - Feature flag explícito.
//   - No bloquear el arranque si falta algo (el notifier loguea y sigue).
//
import { ENV } from './env.js';

export const DISCORD = {
  /**
   * Feature flag global. Si es false, TODO el módulo Discord se saltea.
   * Configurar en Render: DISCORD_ENABLED=true
   */
  enabled: ENV.DISCORD_ENABLED === true,

  /**
   * Token del bot. Necesario para HTTP Interactions (firma Ed25519).
   * No necesario para webhooks outbound.
   */
  botToken: ENV.DISCORD_BOT_TOKEN || '',

  /**
   * Public key del bot (hex de 64 chars). Necesaria para verificar
   * la firma Ed25519 de las HTTP Interactions.
   * Se obtiene en https://discord.com/developers/applications/<app_id>/general
   */
  publicKey: ENV.DISCORD_PUBLIC_KEY || '',

  /**
   * Application ID del bot. Necesaria para registrar comandos slash.
   */
  applicationId: ENV.DISCORD_APPLICATION_ID || '',

  /**
   * URL del webhook principal (canal #torneo-general).
   * Fallback si la tabla discord_webhooks no tiene un registro para el evento.
   */
  webhookUrl: ENV.DISCORD_WEBHOOK_URL || '',

  /**
   * Timeout para las llamadas a la API de Discord (ms).
   * Discord recomienda < 3000ms para no bloquear el request original.
   */
  timeoutMs: Number(ENV.DISCORD_TIMEOUT_MS || 3000),

  /**
   * Tipos de eventos soportados (para validar en el notifier y en la UI admin).
   */
  eventTypes: [
    'TOURNAMENT_CREATED',
    'TOURNAMENT_TEAM_REGISTERED',
    'TOURNAMENT_MATCH_RESULT_RECORDED',
    'TOURNAMENT_DRAFT_ACTION_RECORDED',
    'TOURNAMENT_STATUS_CHANGED',
    'TOURNAMENT_MODERATOR_CHANGED'
  ],

  /**
   * Tipos de interacción de Discord (InteractionType).
   * Referencia: https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object-interaction-type
   */
  interactionTypes: {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
    APPLICATION_COMMAND_AUTOCOMPLETE: 4,
    MODAL_SUBMIT: 5
  },

  /**
   * Tipos de respuesta de interacción (InteractionResponseType).
   * Referencia: https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-response-object-interaction-callback-type
   */
  responseTypes: {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
    DEFERRED_UPDATE_MESSAGE: 6,
    UPDATE_MESSAGE: 7,
    APPLICATION_COMMAND_AUTOCOMPLETE_RESULT: 8,
    MODAL: 9
  },

  /**
   * Flags de respuesta (bitmask).
   * EPHEMERAL = solo el usuario que invocó el comando ve la respuesta.
   * Referencia: https://discord.com/developers/docs/resources/message#message-object-message-flags
   */
  responseFlags: {
    EPHEMERAL: 1 << 6  // 64
  }
};

/**
 * Verifica si Discord está completamente configurado para webhooks.
 * @returns {boolean}
 */
export function isDiscordWebhooksReady() {
  return DISCORD.enabled && Boolean(DISCORD.webhookUrl);
}

/**
 * Verifica si Discord está completamente configurado para HTTP Interactions.
 * @returns {boolean}
 */
export function isDiscordInteractionsReady() {
  return (
    DISCORD.enabled &&
    Boolean(DISCORD.botToken) &&
    Boolean(DISCORD.publicKey) &&
    Boolean(DISCORD.applicationId)
  );
}

/**
 * Lista de subcomandos válidos de /torneo (Opción A — 1 comando con subcomandos).
 * Usado por el controller para hacer dispatch.
 * Ver Q1 del plan F1.6d.
 */
export const TOURNAMENT_SUBCOMMANDS = Object.freeze([
  'status',
  'bracket',
  'equipos',
  'draft'
]);

/**
 * Colores de embed institucionales (alineados con :root de global.css).
 */
export const EMBED_COLORS = Object.freeze({
  PRIMARY: 0xD52B1E,   // --pry-red
  INFO:    0x0038A8,   // --pry-blue
  SUCCESS: 0x28A745,
  WARNING: 0xFFC107,
  DANGER:  0xDC3545,
  NEUTRAL: 0x6C757D
});

export default DISCORD;
