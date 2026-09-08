import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  const errorLogEntry = {
    timestamp: new Date().toISOString(),
    route: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
    user_id: req.user ? req.user.user_id : null,
    level: err.status >= 500 || !err.status ? 'error' : 'warn',
    message: err.message || 'Error interno no especificado'
  };

  console.error(`🚨 [ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  // Error de validación Zod
  if (err instanceof ZodError) {
    const issues = err.issues.map(i => ({
      field: i.path.join('.'),
      message: i.message
    }));
    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      code: 'VALIDATION_ERROR',
      details: issues
    });
  }

  // Error sintaxis JSON en el body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'El cuerpo de la petición no tiene un formato JSON válido',
      code: 'INVALID_JSON_BODY'
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'Error interno del servidor táctico',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
