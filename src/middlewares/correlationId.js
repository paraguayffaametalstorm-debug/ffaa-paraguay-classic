/**
 * ============================================================
 * FIX-307: Middleware de Correlation ID
 * ============================================================
 * Asigna un UUID único por request para trazabilidad end-to-end.
 *
 * Responsabilidades:
 *   1. Generar req.id (o reusar X-Request-Id del cliente).
 *   2. Devolver X-Request-Id en la respuesta (para correlacionar
 *      frontend ↔ backend ↔ logs).
 *   3. Loguear [REQ] al entrar y [RES] al terminar, con duración.
 *
 * Regla: NUNCA lanzar excepciones. Este middleware corre en TODAS
 * las requests. Si falla, se usa un ID fallback.
 *
 * Uso: app.use(correlationIdMiddleware) ANTES de apiLimiter y rutas.
 * ============================================================
 */

import { randomUUID } from 'crypto';

import { logger } from '../config/logger.js';
/**
 * Genera un ID único. Fallback si crypto.randomUUID no está
 * disponible (Node < 14.17 o entornos exóticos).
 */
function generateRequestId() {
  try {
    return randomUUID();
  } catch {
    // Fallback: timestamp + random. No es UUID v4 pero es único.
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function correlationIdMiddleware(req, res, next) {
  // 1. Generar o reusar el ID
  const incoming = req.headers['x-request-id'];
  // Sanitizar: solo aceptar strings cortos (evita log injection).
  const requestId =
    (typeof incoming === 'string' && incoming.length > 0 && incoming.length <= 128)
      ? incoming
      : generateRequestId();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  // 2. Log de entrada
  const startTime = process.hrtime.bigint();
  logger.info(`[REQ] ${req.method} ${req.originalUrl || req.url} id=${requestId}`);

  // 3. Log de salida (se dispara cuando la respuesta termina)
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    const status = res.statusCode;
    logger.info(
      `[RES] ${req.method} ${req.originalUrl || req.url} status=${status} duration=${durationMs.toFixed(1)}ms id=${requestId}`
    );
  });

  next();
}