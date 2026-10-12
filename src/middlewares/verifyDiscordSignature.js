// src/middlewares/verifyDiscordSignature.js
//
// F1.6d — Verificación de firma Ed25519 de las HTTP Interactions de Discord.
//
// Discord firma cada request con su clave privada Ed25519. Nosotros
// verificamos con la public key (32 bytes en hex, 64 chars) que está
// en DISCORD_PUBLIC_KEY.
//
// Headers obligatorios:
//   - X-Signature-Ed25519: firma en hex (128 chars).
//   - X-Signature-Timestamp: timestamp UNIX en segundos (string).
//
// El mensaje firmado es: timestamp + rawBody (concatenación de strings/bytes).
//
// Referencia:
//   https://discord.com/developers/docs/interactions/receiving-and-responding#security-and-authorization
//
// Comportamiento:
//   - 503 DISCORD_NOT_CONFIGURED  → Discord deshabilitado o falta publicKey.
//   - 401 INVALID_SIGNATURE       → firma inválida, headers faltantes, o body crudo ausente.
//
// Seguridad: NO se loguea la firma, el body, ni el motivo exacto del rechazo.
// Solo un warn genérico para detectar ataques.
//
import crypto from 'node:crypto';
import { DISCORD, isDiscordInteractionsReady } from '../config/discord.js';
import { logger } from '../config/logger.js';

// SPKI DER prefix para Ed25519 (RFC 8410).
// Discord entrega SOLO los 32 bytes raw de la public key (hex).
// Node exige un KeyObject completo; reconstruimos el DER con este prefix
// (12 bytes) + los 32 bytes raw = 44 bytes de SubjectPublicKeyInfo.
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

/**
 * Construye un KeyObject Ed25519 a partir de la public key hex de Discord.
 * Cachea el resultado para no reconstruir en cada request.
 *
 * @param {string} publicKeyHex - 64 chars hex (32 bytes raw).
 * @returns {crypto.KeyObject|null}
 */
let cachedPublicKey = null;
let cachedPublicKeyHex = null;

function getDiscordPublicKey(publicKeyHex) {
  if (cachedPublicKeyHex === publicKeyHex && cachedPublicKey) {
    return cachedPublicKey;
  }
  try {
    const rawBytes = Buffer.from(publicKeyHex, 'hex');
    if (rawBytes.length !== 32) {
      logger.error(`❌ [DiscordSignature] Public key debe ser 32 bytes (64 hex). Recibidos: ${rawBytes.length}`);
      return null;
    }
    const der = Buffer.concat([ED25519_SPKI_PREFIX, rawBytes]);
    cachedPublicKey = crypto.createPublicKey({
      key: der,
      format: 'der',
      type: 'spki'
    });
    cachedPublicKeyHex = publicKeyHex;
    return cachedPublicKey;
  } catch (err) {
    logger.error('❌ [DiscordSignature] Error construyendo KeyObject:', err.message);
    return null;
  }
}

/**
 * Middleware Express: verifica firma Ed25519 de Discord.
 *
 * Requiere que express.json({ verify }) haya seteado req.rawBody
 * para esta ruta (ver server.js, F1.6d commit 1).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function verifyDiscordSignature(req, res, next) {
  // 1. Configuración mínima.
  if (!isDiscordInteractionsReady()) {
    return res.status(503).json({
      success: false,
      error: 'Discord HTTP Interactions no está configurado.',
      code: 'DISCORD_NOT_CONFIGURED'
    });
  }

  // 2. Headers obligatorios.
  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');

  if (!signature || !timestamp) {
    // No logueamos detalles del request, solo el hecho genérico.
    logger.warn('⚠️ [DiscordSignature] Request sin headers de firma.');
    return res.status(401).json({
      success: false,
      error: 'Firma Ed25519 inválida o ausente.',
      code: 'INVALID_SIGNATURE'
    });
  }

  // 3. Body crudo (debe haberlo capturado express.json({ verify })).
  if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
    logger.error('❌ [DiscordSignature] req.rawBody ausente. Verificar express.json({ verify }) en server.js.');
    return res.status(401).json({
      success: false,
      error: 'Firma Ed25519 inválida o ausente.',
      code: 'INVALID_SIGNATURE'
    });
  }

  // 4. Construir el mensaje firmado: timestamp + rawBody.
  //    Discord concatena el timestamp (string ASCII) con el body crudo.
  let isVerified = false;
  try {
    const publicKey = getDiscordPublicKey(DISCORD.publicKey);
    if (!publicKey) {
      return res.status(503).json({
        success: false,
        error: 'Discord HTTP Interactions no está configurado.',
        code: 'DISCORD_NOT_CONFIGURED'
      });
    }

    isVerified = crypto.verify(
      null, // Ed25519 no usa algoritmo de hash externo
      Buffer.concat([Buffer.from(timestamp, 'utf8'), req.rawBody]),
      publicKey,
      Buffer.from(signature, 'hex')
    );
  } catch (err) {
    // Firma malformada (hex inválido, longitud incorrecta, etc.)
    logger.warn('⚠️ [DiscordSignature] Error parseando firma.');
    isVerified = false;
  }

  if (!isVerified) {
    logger.warn('⚠️ [DiscordSignature] Firma inválida rechazada.');
    return res.status(401).json({
      success: false,
      error: 'Firma Ed25519 inválida o ausente.',
      code: 'INVALID_SIGNATURE'
    });
  }

  // 5. Firma OK → continuar al controller.
  // Nota: NO validamos `timestamp` vs reloj actual (Discord ya lo hace
  // con su propia lógica; replicarlo puede romper reintentos legítimos).
  return next();
}

export default verifyDiscordSignature;