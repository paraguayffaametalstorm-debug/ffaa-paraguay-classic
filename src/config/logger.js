import pino from 'pino';
import { ENV } from './env.js';

// En development: formato legible con colores.
// En production: JSON puro (parseable por fly logs, agregadores, etc.).
const transport = ENV.NODE_ENV === 'development'
  ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
  : undefined;

export const logger = pino({
  level: ENV.LOG_LEVEL || 'info',
  transport,
  base: {
    service: 'paraguay-ffaa',
    env: ENV.NODE_ENV,
    pid: process.pid
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'newPassword',
      'currentPassword',
      'token',
      '*.password_hash',
      '*.google_id',
      '*.access_token',
      '*.refresh_token'
    ],
    censor: '[REDACTED]'
  }
});

// Helper para child logger con request_id (FIX-307)
export function loggerForRequest(req) {
  return req?.id
    ? logger.child({ request_id: req.id })
    : logger;
}

export default logger;
