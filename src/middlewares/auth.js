import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { memoryStore, getSupabase } from '../db/supabase.js';

/**
 * Middleware: requireAuth
 * Valida de forma estricta el token JWT enviado en Authorization: Bearer <token>.
 * Si no es válido o no existe, retorna 401 Unauthorized sin excepciones ni bypasses.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token de autenticación requerido',
      code: 'AUTH_TOKEN_REQUIRED'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded || !decoded.user_id) {
      return res.status(401).json({
        error: 'Acceso no autorizado: Formato de token inválido',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    const supabase = getSupabase();
    let user = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`user_id.eq.${decoded.user_id},id.eq.${decoded.user_id}`)
          .limit(1);
        if (!error && data && data.length > 0) {
          const u = data[0];
          user = {
            ...u,
            user_id: u.user_id || u.id,
            squad_status: u.squad_status || u.status || 'ACTIVE'
          };
        }
      } catch (err) {
        console.warn('⚠️ [Auth Middleware] Error consultando Supabase:', err.message);
      }
    }

    if (!user) {
      user = memoryStore.users.find(u => u.user_id === decoded.user_id);
    }

    if (!user) {
      return res.status(401).json({
        error: 'Usuario no encontrado o sesión expirada',
        code: 'USER_NOT_FOUND'
      });
    }

    if (user.squad_status && user.squad_status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Acceso restringido: Cuenta de piloto inactiva',
        code: 'USER_INACTIVE'
      });
    }

    // Attach user to request (without password_hash)
    const { password_hash, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Token inválido o expirado',
      code: 'AUTH_TOKEN_EXPIRED',
      details: err.message
    });
  }
}

/**
 * Middleware: requireRole
 * Verifica que el usuario autenticado tenga uno de los roles militares requeridos.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        code: 'UNAUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permiso denegado: Se requiere rol militar [${allowedRoles.join(' o ')}]`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
}
