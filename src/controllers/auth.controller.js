import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ENV } from '../config/env.js';
import { getSupabase } from '../db/supabase.js';
import { logSecurityEvent } from '../utils/audit.js';
import { generateTemporaryPassword } from '../utils/security.js';
import passport, { isGoogleConfigured } from '../config/passport.js';
import { sendPasswordResetEmail } from '../utils/email.js';

// Almacén en memoria de respaldo para tokens de restablecimiento si Supabase no está conectado
const memoryPasswordResets = new Map();

// ========== LOGIN ==========
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const supabase = getSupabase();

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }
        if (!supabase) {
            return res.status(500).json({ error: 'Servicio de base de datos no disponible' });
        }

        // 1. Buscar en Supabase
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('email', email.trim())
            .limit(1);

        if (error || !data || data.length === 0) {
            await logSecurityEvent({
                supabase,
                userId: null,
                nick: email || null,
                event: 'LOGIN_FAILED',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'user_not_found' }
            });
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = data[0];

        // 2. Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash || '');
        if (!validPassword) {
            await logSecurityEvent({
                supabase,
                userId: user.id || user.user_id,
                nick: user.nick,
                event: 'LOGIN_FAILED',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'invalid_password' }
            });
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 3. Verificar estado del usuario
        const userStatus = (user.status || '').toUpperCase();
        if (userStatus === 'INACTIVE' || userStatus === 'INACTIVO' || user.is_active === false) {
            await logSecurityEvent({
                supabase,
                userId: user.id || user.user_id,
                nick: user.nick,
                event: 'LOGIN_FAILED_INACTIVE',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'user_inactive' }
            });
            return res.status(403).json({ error: '⚠️ Tu cuenta ha sido desactivada. Contacta a un administrador.' });
        }

        // 4. Generar JWT con token_version
        const token = jwt.sign(
            { 
                user_id: user.user_id || user.id,
                email: user.email,
                role: user.role,
                token_version: user.token_version || 0 
            },
            ENV.JWT_SECRET,
            { expiresIn: ENV.JWT_EXPIRES_IN || '7d' }
        );

        await logSecurityEvent({
            supabase,
            userId: user.id || user.user_id,
            nick: user.nick,
            event: 'LOGIN_SUCCESS',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { role: user.role }
        });

        // 5. Actualizar last_activity
        try {
            await supabase
                .from('users')
                .update({ last_activity: new Date().toISOString() })
                .or(`id.eq.${user.id},user_id.eq.${user.user_id || user.id}`);
        } catch (err) {
            console.warn('⚠️ [Auth] Error actualizando last_activity:', err.message);
        }

        // 6. Preparar respuesta
        const { password_hash, password: _p, encrypted_password: _ep, ...safeUser } = user;
        
        const userResponse = {
            ...safeUser,
            user_id: user.user_id || user.id,
            must_change_password: Boolean(user.must_change_password)
        };

        res.json({
            token,
            user: userResponse
        });

    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ========== VERIFICAR TOKEN ==========
export const verifyMe = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        const supabase = getSupabase();
        let freshUser = user;

        if (supabase) {
            const { data } = await supabase
                .from('users')
                .select('*')
                .or(`id.eq.${user.id || user.user_id},user_id.eq.${user.user_id || user.id}`)
                .limit(1)
                .single();
            if (data) {
                freshUser = data;
            }
        }

        const { password_hash, password: _p, encrypted_password: _ep, ...safeUser } = freshUser;

        res.json({
            user: {
                ...safeUser,
                user_id: freshUser.user_id || freshUser.id,
                must_change_password: Boolean(freshUser.must_change_password)
            }
        });
    } catch (error) {
        console.error('❌ Error en verifyMe:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ========== REGISTRO DE USUARIO (ADMIN/PUBLIC) ==========
export const register = async (req, res) => {
    try {
        const { email, password, nick, role = 'MIEMBRO' } = req.body;
        const supabase = getSupabase();

        if (!email || !password || !nick) {
            return res.status(400).json({ error: 'Email, contraseña y nick son requeridos' });
        }
        if (!supabase) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        // Verificar si ya existe
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .or(`email.ilike.${email.trim()},nick.ilike.${nick.trim()}`)
            .limit(1);

        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'El email o nick ya está en uso' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert({
                email: email.trim(),
                nick: nick.trim(),
                password_hash,
                role,
                status: 'ACTIVE',
                token_version: 1,
                must_change_password: false,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                id: newUser.id,
                user_id: newUser.user_id || newUser.id,
                email: newUser.email,
                nick: newUser.nick,
                role: newUser.role
            }
        });

    } catch (error) {
        console.error('❌ Error en register:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
};

// ========== CAMBIO DE CONTRASEÑA VOLUNTARIO O OBLIGATORIO ==========
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = req.user;
        const supabase = getSupabase();

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
        }
        if (!supabase) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const isForcedChange = Boolean(user.must_change_password);

        if (!isForcedChange) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'La contraseña actual es requerida' });
            }

            const { data: dbUser } = await supabase
                .from('users')
                .select('password_hash')
                .or(`id.eq.${user.id || user.user_id},user_id.eq.${user.user_id || user.id}`)
                .single();

            const isValid = await bcrypt.compare(currentPassword, dbUser?.password_hash || '');
            if (!isValid) {
                await logSecurityEvent({
                    supabase,
                    userId: user.id || user.user_id,
                    nick: user.nick,
                    event: 'PASSWORD_CHANGE_FAILED',
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    metadata: { reason: 'wrong_current_password' }
                });
                return res.status(401).json({ error: 'Contraseña actual incorrecta' });
            }
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        const newTokenVersion = (user.token_version || 0) + 1;

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: newHash,
                must_change_password: false,
                password_changed_at: new Date().toISOString(),
                token_version: newTokenVersion,
                updated_at: new Date().toISOString()
            })
            .or(`id.eq.${user.id || user.user_id},user_id.eq.${user.user_id || user.id}`);

        if (updateError) {
            throw updateError;
        }

        await logSecurityEvent({
            supabase,
            userId: user.id || user.user_id,
            nick: user.nick,
            event: 'PASSWORD_CHANGED',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { forced_change: isForcedChange }
        });

        const newToken = jwt.sign(
            { 
                user_id: user.user_id || user.id,
                email: user.email,
                role: user.role,
                token_version: newTokenVersion 
            },
            ENV.JWT_SECRET,
            { expiresIn: ENV.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente',
            token: newToken
        });

    } catch (error) {
        console.error('❌ Error en changePassword:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
};

// ========== RESTABLECIMIENTO DE CONTRASEÑA: SOLICITAR TOKEN POR EMAIL ==========
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const supabase = getSupabase();

        if (!email) {
            return res.status(400).json({ success: false, error: 'El correo es requerido' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Buscar usuario en users
        let user = null;
        if (supabase) {
            const { data, error: userError } = await supabase
                .from('users')
                .select('id, user_id, nick, email, status, token_version, is_active')
                .ilike('email', normalizedEmail)
                .limit(1);

            if (!userError && data && data.length > 0) {
                user = data[0];
            }
        }

        // Si el usuario no existe en la base de datos
        if (!user) {
            await logSecurityEvent({
                supabase,
                userId: null,
                nick: normalizedEmail,
                event: 'PASSWORD_RESET_NOT_FOUND',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { email: normalizedEmail }
            });

            // Respuesta uniforme por seguridad para evitar enumeración de usuarios
            return res.json({
                success: true,
                message: 'Si el correo está registrado en el escuadrón, recibirás un enlace de restablecimiento (válido por 15 minutos).'
            });
        }

        // 2. Generar token criptoseguro con crypto.randomBytes(32)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutos

        // 3. Almacenar token en la tabla password_resets
        let savedInDb = false;
        if (supabase) {
            const { error: resetErr } = await supabase
                .from('password_resets')
                .insert({
                    user_id: user.id || user.user_id,
                    email: user.email,
                    token: token,
                    expires_at: expiresAt,
                    used: false,
                    ip: req.ip,
                    user_agent: req.headers['user-agent']
                });

            if (!resetErr) {
                savedInDb = true;
            } else {
                console.warn('⚠️ [Auth] No se pudo insertar en password_resets (usando fallback en memoria):', resetErr.message);
            }
        }

        // Fallback en memoria si la BD no está lista o la tabla está pendiente de migración
        if (!savedInDb) {
            memoryPasswordResets.set(token, {
                userId: user.id || user.user_id,
                email: user.email,
                token: token,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).getTime(),
                used: false
            });
        }

        // 4. Construir URL de restablecimiento
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
        const host = req.get('host') || 'paraguay-ffaa-metalstorm.fly.dev';
        const resetUrl = `${protocol}://${host}/reset-password.html?token=${token}`;

        // 5. Enviar correo táctico con Nodemailer
        try {
            await sendPasswordResetEmail({
                to: user.email,
                nick: user.nick,
                resetUrl,
                token
            });
        } catch (emailErr) {
            console.error('❌ [Auth] Error despachando correo de restablecimiento:', emailErr.message);
        }

        // 6. Registrar en security_events
        await logSecurityEvent({
            supabase,
            userId: user.id || user.user_id,
            nick: user.nick,
            event: 'PASSWORD_RESET_REQUESTED',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { email: user.email, expires_at: expiresAt }
        });

        res.json({
            success: true,
            message: 'Si el correo está registrado en el escuadrón, recibirás un enlace de restablecimiento (válido por 15 minutos).'
        });

    } catch (error) {
        console.error('❌ Error en forgotPassword:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

// ========== RESTABLECIMIENTO DE CONTRASEÑA: CONFIRMAR CON TOKEN ==========
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const supabase = getSupabase();

        if (!token || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Token y nueva contraseña son obligatorios' 
            });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ 
                success: false, 
                error: 'La nueva contraseña debe tener al menos 8 caracteres' 
            });
        }

        let resetRecord = null;

        // 1. Buscar token en Supabase
        if (supabase) {
            const { data, error } = await supabase
                .from('password_resets')
                .select('*')
                .eq('token', token.trim())
                .limit(1);

            if (!error && data && data.length > 0) {
                resetRecord = data[0];
            }
        }

        // Fallback en memoria si no está en Supabase
        if (!resetRecord && memoryPasswordResets.has(token.trim())) {
            const mem = memoryPasswordResets.get(token.trim());
            resetRecord = {
                user_id: mem.userId,
                email: mem.email,
                token: mem.token,
                expires_at: new Date(mem.expiresAt).toISOString(),
                used: mem.used
            };
        }

        if (!resetRecord) {
            return res.status(400).json({ 
                success: false, 
                error: 'Token de restablecimiento inválido o no encontrado' 
            });
        }

        // 2. Verificar que no haya sido utilizado previamente
        if (resetRecord.used) {
            return res.status(400).json({ 
                success: false, 
                error: 'Este enlace de restablecimiento ya ha sido utilizado previamente' 
            });
        }

        // 3. Verificar expiración de 15 minutos
        const now = new Date();
        const expiresAt = new Date(resetRecord.expires_at);
        if (now > expiresAt) {
            return res.status(400).json({ 
                success: false, 
                error: 'El enlace de restablecimiento ha expirado (límite 15 minutos). Solicita uno nuevo.' 
            });
        }

        // 4. Buscar usuario para actualizar
        let user = null;
        if (supabase) {
            const { data: users, error: uErr } = await supabase
                .from('users')
                .select('*')
                .ilike('email', resetRecord.email)
                .limit(1);

            if (!uErr && users && users.length > 0) {
                user = users[0];
            }
        }

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Usuario asociado al token no encontrado en el escuadrón' 
            });
        }

        // 5. Hashear nueva contraseña con bcrypt
        const newHash = await bcrypt.hash(newPassword, 10);
        const newTokenVersion = (user.token_version || 0) + 1;

        // 6. Actualizar usuario e invalidar sesiones previas incrementando token_version
        if (supabase) {
            const { error: updateErr } = await supabase
                .from('users')
                .update({
                    password_hash: newHash,
                    must_change_password: false,
                    password_changed_at: new Date().toISOString(),
                    token_version: newTokenVersion,
                    updated_at: new Date().toISOString()
                })
                .or(`id.eq.${user.id},user_id.eq.${user.user_id || user.id}`);

            if (updateErr) {
                throw updateErr;
            }

            // 7. Marcar token como consumido
            await supabase
                .from('password_resets')
                .update({
                    used: true,
                    used_at: new Date().toISOString()
                })
                .eq('token', token.trim());
        }

        // Marcar en memoria también
        if (memoryPasswordResets.has(token.trim())) {
            const mem = memoryPasswordResets.get(token.trim());
            mem.used = true;
        }

        // 8. Registrar evento de auditoría en security_events
        await logSecurityEvent({
            supabase,
            userId: user.id || user.user_id,
            nick: user.nick,
            event: 'PASSWORD_RESET_SUCCESS',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { 
                email: user.email, 
                token_version: newTokenVersion,
                method: 'email_reset_token' 
            }
        });

        res.json({
            success: true,
            message: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva clave de combate.'
        });

    } catch (error) {
        console.error('❌ Error en resetPassword:', error);
        res.status(500).json({ success: false, error: error.message || 'Error interno al restablecer contraseña' });
    }
};

// ========== HELPER PARA RENDERIZAR RESULTADO DE OAUTH (POPUP O REDIRECCIÓN) ==========
function renderAuthResult(res, { success, token = null, user = null, error = null }) {
    const safeError = error ? String(error).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const safeNick = user?.nick ? String(user.nick).replace(/</g, '&lt;').replace(/>/g, '&gt;') : (user?.email || 'Combatiente');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${success ? 'Acceso Autorizado' : 'Acceso Denegado'} - PARAGUAY FFAA</title>
  <style>
    body { background: #0B132B; color: #E0E6ED; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; box-sizing: border-box; }
    .card { background: #1C2541; border: 1px solid #3A506B; border-top: 4px solid ${success ? '#2ECC71' : '#D52B1E'}; border-radius: 8px; padding: 2rem; max-width: 460px; width: 100%; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
    h2 { margin: 0 0 1rem; font-size: 1.3rem; color: ${success ? '#2ECC71' : '#FFAAA6'}; }
    p { font-size: 0.95rem; line-height: 1.5; color: #CBD5E1; margin: 0 0 1.5rem; }
    .btn { display: inline-block; padding: 0.75rem 1.5rem; background: #0038A8; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold; border: none; cursor: pointer; }
    .spinner { display: inline-block; width: 32px; height: 32px; border: 3px solid rgba(255,255,255,0.2); border-radius: 50%; border-top-color: #2ECC71; animation: spin 0.8s linear infinite; margin-bottom: 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    ${success ? `
      <div class="spinner"></div>
      <h2>✅ IDENTIDAD VERIFICADA</h2>
      <p>Bienvenido de vuelta, <strong>[PRY] ${safeNick}</strong>.<br>Sincronizando sesión táctica con el escuadrón...</p>
    ` : `
      <h2>❌ ACCESO DENEGADO</h2>
      <p>${safeError}</p>
      <button onclick="window.close()" class="btn">Cerrar Ventana</button>
    `}
  </div>
  <script>
    const payload = ${JSON.stringify({ success, token, user, error })};
    
    // Si se abrió mediante popup
    if (window.opener && !window.opener.closed) {
      if (payload.success) {
        window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token: payload.token, user: payload.user }, '*');
        setTimeout(() => window.close(), 600);
      } else {
        window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: payload.error }, '*');
      }
    } else {
      // Si fue redirección directa en la misma ventana
      if (payload.success) {
        window.location.href = '/?token=' + encodeURIComponent(payload.token) + '&auth_success=true';
      } else {
        window.location.href = '/?auth_error=' + encodeURIComponent(payload.error || 'Error de autenticación');
      }
    }
  </script>
</body>
</html>`);
}

// ========== GOOGLE OAUTH INITIATOR ==========
export const googleAuth = (req, res, next) => {
    if (!isGoogleConfigured()) {
        return res.status(503).json({
            success: false,
            error: 'El servicio de Google OAuth no está configurado en el servidor. Configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET.',
            code: 'GOOGLE_OAUTH_NOT_CONFIGURED'
        });
    }

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        prompt: 'select_account'
    })(req, res, next);
};

// ========== GOOGLE OAUTH CALLBACK ==========
export const googleAuthCallback = (req, res, next) => {
    if (!isGoogleConfigured()) {
        return renderAuthResult(res, {
            success: false,
            error: 'Google OAuth no está configurado en el servidor'
        });
    }

    passport.authenticate('google', { session: false }, async (err, user, info) => {
        const supabase = getSupabase();

        if (err) {
            console.error('❌ [Google Auth] Error en autenticación:', err);
            return renderAuthResult(res, {
                success: false,
                error: err.message || 'Error en el proceso de autenticación con Google'
            });
        }

        if (!user) {
            const errorMsg = info?.message || '❌ Acceso denegado. Tu correo no está registrado en el escuadrón. Contacta a un administrador.';
            return renderAuthResult(res, {
                success: false,
                error: errorMsg
            });
        }

        try {
            // Generar token JWT con token_version
            const token = jwt.sign(
                {
                    user_id: user.user_id || user.id,
                    email: user.email,
                    role: user.role,
                    token_version: user.token_version || 0
                },
                ENV.JWT_SECRET,
                { expiresIn: ENV.JWT_EXPIRES_IN || '7d' }
            );

            // Registrar evento de auditoría
            await logSecurityEvent({
                supabase,
                userId: user.id || user.user_id,
                nick: user.nick,
                event: 'LOGIN_GOOGLE_SUCCESS',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { email: user.email, role: user.role }
            });

            // Actualizar last_activity
            try {
                if (supabase) {
                    await supabase
                        .from('users')
                        .update({ last_activity: new Date().toISOString() })
                        .or(`id.eq.${user.id},user_id.eq.${user.user_id || user.id}`);
                }
            } catch (actErr) {
                console.warn('⚠️ [Google Auth] Error actualizando last_activity:', actErr.message);
            }

            // Preparar usuario seguro para frontend
            const { password_hash, password: _p, encrypted_password: _ep, ...safeUser } = user;
            const userResponse = {
                ...safeUser,
                user_id: user.user_id || user.id,
                must_change_password: Boolean(user.must_change_password)
            };

            return renderAuthResult(res, {
                success: true,
                token,
                user: userResponse
            });

        } catch (procErr) {
            console.error('❌ [Google Auth] Error procesando sesión de usuario:', procErr);
            return renderAuthResult(res, {
                success: false,
                error: 'Error interno generando sesión de usuario'
            });
        }
    })(req, res, next);
};
