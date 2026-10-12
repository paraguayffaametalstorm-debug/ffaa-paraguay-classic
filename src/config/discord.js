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
  ]
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

export default DISCORD;
