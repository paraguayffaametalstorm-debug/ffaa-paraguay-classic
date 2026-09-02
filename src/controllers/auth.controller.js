import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { getSupabase } from '../db/supabase.js';
import { logSecurityEvent } from '../utils/audit.js';
import { generateTemporaryPassword } from '../utils/security.js';

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
        if (userStatus === 'INACTIVE' || userStatus === 'INACTIVO') {
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

        const { password_hash, password, encrypted_password, ...safeUser } = user;
        res.json({ user: safeUser });
    } catch (error) {
        console.error('❌ Error en verifyMe:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ========== REGISTRO (SOLO ADMIN) ==========
export const register = async (req, res) => {
    try {
        const { email, nick, role } = req.body;
        const supabase = getSupabase();

        if (!email || !nick) {
            return res.status(400).json({ error: 'Email y nick son requeridos' });
        }
        if (!supabase) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id, email')
            .ilike('email', email.trim())
            .limit(1);

        if (checkError) {
            console.error('Error verificando usuario en Supabase:', checkError);
        } else if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // ✅ GENERAR CONTRASEÑA TEMPORAL ALEATORIA
        const tempPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newUser = {
            email: email.trim().toLowerCase(),
            nick: nick.trim(),
            role: role || 'MIEMBRO',
            password_hash: hashedPassword,
            must_change_password: true,
            token_version: 1,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: createdData, error: insertError } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        const { password_hash, ...safeUser } = createdData || newUser;
        res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente. Contraseña temporal generada.',
            temporaryPassword: tempPassword,
            user: safeUser
        });

    } catch (error) {
        console.error('❌ Error en register:', error);
        res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
};

// ========== CAMBIO DE CONTRASEÑA ==========
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, isForced } = req.body;
        const userId = req.user.user_id || req.user.id;
        const supabase = getSupabase();

        // Validar nueva contraseña (mínimo 8 caracteres)
        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({
                error: 'La nueva contraseña debe tener al menos 8 caracteres'
            });
        }
        if (!supabase) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        // 1. Obtener usuario completo
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('password_hash, must_change_password, token_version, nick, id, user_id, role, email')
            .or(`id.eq.${userId},user_id.eq.${userId}`)
            .limit(1);

        if (userError || !userData || userData.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = userData[0];

        // 2. Verificar contraseña actual SOLO si NO es cambio forzado
        const isForcedChange = Boolean(user.must_change_password) || Boolean(isForced) || Boolean(req.body.force);
        if (!isForcedChange) {
            if (!currentPassword) {
                return res.status(400).json({ 
                    error: 'Debes indicar tu contraseña actual',
                    code: 'CURRENT_PASSWORD_REQUIRED'
                });
            }
            const valid = await bcrypt.compare(currentPassword, user.password_hash || '');
            if (!valid) {
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

        // 3. Hashear nueva contraseña
        const newHash = await bcrypt.hash(newPassword, 10);
        const newTokenVersion = (user.token_version || 0) + 1;

        // 4. Actualizar en Supabase
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: newHash,
                must_change_password: false,
                password_changed_at: new Date().toISOString(),
                token_version: newTokenVersion,
                updated_at: new Date().toISOString()
            })
            .or(`id.eq.${user.id},user_id.eq.${user.user_id || user.id}`);

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

        // 5. Generar nuevo JWT con token_version actualizado
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

// ========== OLVIDO DE CONTRASEÑA ==========
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const supabase = getSupabase();

        if (!email) {
            return res.status(400).json({ error: 'El correo es requerido' });
        }
        if (!supabase) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, nick, email, token_version')
            .ilike('email', email.trim())
            .limit(1)
            .single();

        if (userError || !user) {
            return res.json({
                success: true,
                message: 'Si el correo existe, se enviarán instrucciones'
            });
        }

        // ✅ USAR CONTRASEÑA TEMPORAL ALEATORIA
        const tempPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const newTokenVersion = (user.token_version || 0) + 1;

        await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                must_change_password: true,
                password_changed_at: new Date().toISOString(),
                token_version: newTokenVersion
            })
            .eq('id', user.id);

        res.json({
            success: true,
            message: `Contraseña de ${user.nick} reseteada. Deberá cambiarla al iniciar sesión.`,
            temporaryPassword: tempPassword
        });

    } catch (error) {
        console.error('❌ Error en forgotPassword:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
