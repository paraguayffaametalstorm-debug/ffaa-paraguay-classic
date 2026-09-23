/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM
 * MIDDLEWARE DE DEPRECACIÓN
 * ============================================================================
 * Propósito:
 *   Marcar endpoints como deprecados con headers HTTP estándar.
 *   Loguear uso para detectar quién sigue llamando.
 *
 * Estándares aplicados:
 *   - RFC 8594 (Sunset Header)
 *   - Deprecation Header (draft-dalal-deprecation-header)
 *
 * Versión: v1.0
 * Fecha: 2026-09-17
 * Autor: PJPIROVANI (OWNER)
 * ============================================================================
 */
import { logger } from '../config/logger.js';


/**
 * Crea un middleware de deprecación para una ruta específica.
 * @param {object} options
 * @param {string} options.sunsetDate - Fecha ISO de sunset (ej: '2026-12-16T00:00:00Z')
 * @param {string} options.successorVersion - URL de la versión sucesora (ej: '/api/events-v2')
 * @param {string} options.name - Nombre del módulo deprecado (para logs)
 * @returns {Function} Middleware Express
 */
export function deprecationMiddleware({ sunsetDate, successorVersion, name }) {
  return (req, res, next) => {
    // 1. Headers HTTP estándar
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunsetDate);
    if (successorVersion) {
      res.setHeader('Link', `<${successorVersion}>; rel="successor-version"`);
    }

    // 2. Log de uso (para detectar quién sigue llamando)
    const timestamp = new Date().toISOString();
    const user = req.user ? `${req.user.nick || req.user.email || req.user.id}` : 'anónimo';
    const method = req.method;
    const path = req.originalUrl;
    const ip = req.ip || req.headers['x-forwarded-for'] || 'desconocida';

    logger.warn(
      `⚠️ [DEPRECATION] [${name}] ${timestamp} | ${method} ${path} | ` +
      `Usuario: ${user} | IP: ${ip} | Sunset: ${sunsetDate} | ` +
      `Sucesor: ${successorVersion || 'N/A'}`
    );

    next();
  };
}

/**
 * Constantes de deprecación (reutilizables).
 */
export const DEPRECATION_CONFIG = {
  BM: {
    name: 'Black Market (BM)',
    sunsetDate: '2026-12-16T00:00:00Z',
    successorVersion: '/api/events-v2'
  }
};

export default { deprecationMiddleware, DEPRECATION_CONFIG };