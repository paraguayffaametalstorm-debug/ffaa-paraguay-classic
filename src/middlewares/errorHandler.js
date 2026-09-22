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

  // Log completo server-side (con stack) — SIEMPRE se loguea el detalle real
  console.error(`🚨 [ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  if (err.stack) {
    console.error('   Stack:', err.stack.split('\n').slice(0, 5).join('\n'));
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

  // FIX-104 (Sprint 2): no filtrar detalles internos de DB en errores 500.
  // Los errores de Supabase pueden incluir nombres de tablas, constraints,
  // columnas inexistentes, etc. En producción devolvemos un mensaje genérico.
  // En desarrollo mantenemos el mensaje real + stack para debugging.
  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;
  const isDev = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    error: isServerError && !isDev
      ? 'Error interno del servidor táctico'
      : (err.message || 'Error interno del servidor táctico'),
    code: err.code || (isServerError ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR'),
    ...(isDev && { stack: err.stack })
  });
}
