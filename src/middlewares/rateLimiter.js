import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // Máximo 30 intentos de login por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos de acceso desde esta IP. Por favor, reintenta en 15 minutos.',
    code: 'RATE_LIMIT_AUTH'
  }
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600, // 600 peticiones cada 15 min por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Límite de solicitudes de API excedido. Intenta más tarde.',
    code: 'RATE_LIMIT_API'
  }
});

export const bulkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Límite de operaciones masivas alcanzado. Intenta nuevamente en unos minutos.',
    code: 'RATE_LIMIT_BULK'
  }
});
