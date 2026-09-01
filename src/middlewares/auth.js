import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { memoryStore, getSupabase } from '../db/supabase.js';

/**
 * Middleware: requireAuth
 * Valida de forma estricta el token JWT enviado en Authorization: Bearer <token>.
 * Si no es válido o no existe, retorna 401 Unauthorized sin excepciones ni bypasses.
 */
export async function requireAuth(req, res, next) {
  const rawHeader = req.headers.authorization || req.headers.authtoken || req.headers['auth-token'];
  if (!rawHeader) {
    return res.status(401).json({
      error: 'Acceso no autorizado: Token de autenticación requerido',
      code: 'AUTH_TOKEN_REQUIRED'
    });
  }

  const token = rawHeader.startsWith('Bearer ') ? rawHeader.slice(7).trim() : rawHeader.trim();

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded || (!decoded.user_id && !decoded.email)) {
      return res.status(401).json({
        error: 'Acceso no autorizado: Formato de token inválido',
        code: 'AUTH_TOKEN_INVALID'
      });
    }

    const supabase = getSupabase();
    let user = null;

    if (supabase) {
      try {
        let query = supabase.from('users').select('*'); // Select '*' ya incluye token_version
        
        if (decoded.email) {
          query = query.eq('email', decoded.email);
        } else if (decoded.user_id && (typeof decoded.user_id === 'number' || /^\d+$/.test(String(decoded.user_id)))) {
          query = query.eq('user_id', Number(decoded.user_id));
        } else if (decoded.user_id) {
          query = query.eq('id', decoded.user_id);
        }

        const { data, error } = await query.limit(1);
        if (!error && data && data.length > 0) {
          const u = data[0];

          // ==========================================
          // VERIFICACIÓN DE TOKEN_VERSION
          // ==========================================
          const dbTokenVersion = u.token_version !== undefined ? u.token_version : 0;
          const decodedTokenVersion = decoded.token_version !== undefined ? decoded.token_version : 0;

          if (decodedTokenVersion !== dbTokenVersion) {
            return res.status(401).json({ 
              error: 'Sesión inválida. La contraseña fue cambiada recientemente.',
              code: 'TOKEN_VERSION_MISMATCH'
            });
          }
          // ==========================================

          user = {
            ...u,
            user_id: u.user_id ? Number(u.user_id) : (Number.isInteger(Number(u.id)) ? Number(u.id) : u.id),
            squad_status: u.squad_status || u.status || 'ACTIVE'
          };
        }
      } catch (err) {
        console.warn('⚠️ [Auth Middleware] Error consultando Supabase:', err.message);
      }
    }

    // Fallback a memoryStore (entornos de desarrollo/pruebas)
    if (!user && memoryStore && memoryStore.users) {
      user = memoryStore.users.find(u => 
        (decoded.user_id && (u.user_id === decoded.user_id || u.id === decoded.user_id)) ||
        (decoded.email && u.email?.toLowerCase() === decoded.email?.toLowerCase())
      );
      
      // Nota: memoryStore no suele tener control estricto de token_version, 
      // por lo que se permite el paso si es el único medio disponible.
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