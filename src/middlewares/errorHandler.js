import { ZodError } from 'zod';

/**
 * ============================================================
 * Error Handler Centralizado — FIX-104 + FIX-307
 * ============================================================
 * FIX-104 (Sprint 2): no filtrar detalles internos de DB en 500.
 * FIX-307 (Sprint 3): incluir req.id en logs y respuestas.
 * ============================================================
 */
export function errorHandler(err, req, res, next) {
  // FIX-307: ID de correlación (seteado por correlationIdMiddleware).
  // Si el middleware no corrió (ej. error antes de montarlo), fallback.
  const requestId = req.id || 'no-request-id';

  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;
  const isDev = process.env.NODE_ENV === 'development';

  // FIX-307: log estructurado con req.id (antes se armaba pero no se usaba).
  const errorLogEntry = {
    timestamp: new Date().toISOString(),
    request_id: requestId,
    route: req.originalUrl || req.url,
    method: req.method,
    status: statusCode,
    ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
    user_id: req.user ? req.user.user_id : null,
    level: isServerError ? 'error' : 'warn',
    code: err.code || null,
    message: err.message || 'Error interno no especificado'
  };

  // Log estructurado server-side (JSON one-liner, fácil de parsear).
  console.error(`[ERR] ${JSON.stringify(errorLogEntry)}`);
  if (isServerError && err.stack) {
    console.error(`[ERR-STACK] id=${requestId} ${err.stack.split('\n').slice(0, 5).join(' | ')}`);
  }

  // Error de validación Zod
  if (err instanceof ZodError) {
    const issues = err.issues.map(i => ({
      field: i.path.join('.'),
      message: i.message
    }));
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: issues,
      request_id: requestId // FIX-307
    });
  }

  // Error sintaxis JSON en el body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'El cuerpo de la petición no tiene un formato JSON válido',
      code: 'INVALID_JSON_BODY',
      request_id: requestId // FIX-307
    });
  }

  // FIX-104: no filtrar detalles internos de DB en errores 500.
  // FIX-307: incluir request_id en todas las respuestas de error.
  res.status(statusCode).json({
    error: isServerError && !isDev
      ? 'Error interno del servidor táctico'
      : (err.message || 'Error interno del servidor táctico'),
    code: err.code || (isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
    request_id: requestId, // FIX-307
    ...(isDev && { stack: err.stack })
  });
}