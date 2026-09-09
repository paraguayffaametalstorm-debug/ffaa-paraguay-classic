import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { getSupabase } from '../db/supabase.js';
import { logSecurityEvent } from '../utils/audit.js';
import { generateTemporaryPassword } from '../utils/security.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import passport, { isGoogleConfigured } from '../config/passport.js';

// ========== LOGIN (DUAL: TRADICIONAL + GOOGLE OAUTH) ==========
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

        const cleanEmail = email.trim().toLowerCase();

        // 1. Buscar en Supabase por email O email_institucional
        let users = [];
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .or(`email.ilike.${cleanEmail},email_institucional.ilike.${cleanEmail}`)
                .limit(1);

            if (!error && data) {
                users = data;
            } else {
                // Fallback de retrocompatibilidad si la columna email_institucional aún no existe
                const fallback = await supabase
                    .from('users')
                    .select('*')
                    .ilike('email', cleanEmail)
                    .limit(1);
                users = fallback.data || [];
            }
        } catch (queryErr) {
            const fallback = await supabase
                .from('users')
                .select('*')
                .ilike('email', cleanEmail)
                .limit(1);
            users = fallback.data || [];
        }

        if (!users || users.length === 0) {
            await logSecurityEvent({
                supabase,
                userId: null,
                nick: email || null,
                event: 'LOGIN_FAILED',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'user_not_found', email: cleanEmail }
            });
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];

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
        res.json({ 
            user: {
                ...safeUser,
                must_change_password: Boolean(safeUser.must_change_password)
            }
        });
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
            avg_tokens: 0,
            weeks_evaluated: 0,
            perf_status: 'VERDE',
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

// ========== CAMBIO DE CONTRASEÑA (SISTEMA MILITAR TÁCTICO) ==========
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, isForced } = req.body;
        const userId = req.user?.user_id || req.user?.id;
        const supabase = getSupabase();

        // Validar nueva contraseña reglamentaria (mínimo 8 caracteres, mayúscula, minúscula y número)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!newPassword || !passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'La nueva contraseña debe tener al menos 8 caracteres e incluir 1 mayúscula, 1 minúscula y 1 número.',
                data: null,
                error: 'Requisitos de seguridad mínimos no alcanzados: 8 caracteres, 1 mayúscula, 1 minúscula y 1 número'
            });
        }
        if (!supabase) {
            return res.status(500).json({
                success: false,
                message: 'Servicio de base de datos táctico no disponible',
                data: null,
                error: 'Base de datos no disponible'
            });
        }

        // 1. Obtener usuario militar completo
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('password_hash, must_change_password, token_version, nick, id, user_id, role, email')
            .or(`id.eq.${userId},user_id.eq.${userId}`)
            .limit(1);

        if (userError || !userData || userData.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Combatiente no localizado en el registro militar',
                data: null,
                error: 'Usuario no encontrado'
            });
        }

        const user = userData[0];

        // 2. Verificar contraseña actual SOLO si NO es cambio forzado
        const isForcedChange = Boolean(user.must_change_password) || Boolean(isForced) || Boolean(req.body.force);
        if (!isForcedChange) {
            if (!currentPassword) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Debes indicar tu contraseña actual de combate',
                    data: null,
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
                return res.status(401).json({
                    success: false,
                    message: 'Contraseña actual incorrecta. Acceso denegado.',
                    data: null,
                    error: 'Contraseña actual incorrecta'
                });
            }
        }

        // 3. Hashear nueva contraseña con bcrypt
        const newHash = await bcrypt.hash(newPassword, 10);
        const newTokenVersion = (user.token_version || 0) + 1;

        // 4. Actualizar en Supabase e invalidar sesiones previas incrementando token_version
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: newHash,
                must_change_password: false,
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

        const updatedUser = {
            ...user,
            must_change_password: false,
            token_version: newTokenVersion
        };
        delete updatedUser.password_hash;

        return res.json({
            success: true,
            message: 'Contraseña táctica actualizada correctamente. Sesiones previas invalidadas.',
            data: {
                token: newToken,
                token_version: newTokenVersion,
                user: updatedUser
            },
            token: newToken,
            user: updatedUser,
            error: null
        });

    } catch (error) {
        console.error('❌ Error en changePassword:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al actualizar contraseña',
            data: null,
            error: error.message || 'Error interno del servidor'
        });
    }
};

// ========== VINCULACIÓN DE CUENTA GOOGLE (LINK ACCOUNT) ==========
export const linkAccount = async (req, res) => {
    try {
        const { callsign, nick, password, email } = req.body;
        const targetNick = (callsign || nick || '').trim();
        const supabase = getSupabase();

        if (!targetNick || !password || !email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Indicativo/Callsign, contraseña de combate y correo de Google son obligatorios' 
            });
        }

        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Servicio de base de datos no disponible' });
        }

        const cleanEmail = email.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
            return res.status(400).json({ success: false, error: 'Formato de correo electrónico inválido' });
        }

        // 1. Regla de negocio: Un Gmail solo puede estar vinculado a UN usuario
        let existingEmailUsers = [];
        try {
            const { data } = await supabase
                .from('users')
                .select('id, nick, email')
                .ilike('email', cleanEmail)
                .limit(1);
            existingEmailUsers = data || [];
        } catch (e) {
            // Error consultando
        }

        if (existingEmailUsers.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Este correo de Google ya se encuentra vinculado a un combatiente del escuadrón.'
            });
        }

        // 2. Buscar al combatiente por indicativo/callsign (nick)
        const { data: nickUsers, error: nickError } = await supabase
            .from('users')
            .select('*')
            .ilike('nick', targetNick)
            .limit(1);

        if (nickError || !nickUsers || nickUsers.length === 0) {
            return res.status(404).json({
                success: false,
                error: `No se encontró ningún piloto registrado con el indicativo "${targetNick}".`
            });
        }

        const user = nickUsers[0];

        // 3. Verificar estado de la cuenta
        const userStatus = (user.status || '').toUpperCase();
        if (userStatus === 'INACTIVE' || userStatus === 'INACTIVO') {
            return res.status(403).json({
                success: false,
                error: '⚠️ La cuenta de este combatiente se encuentra inactiva. Contacta a un administrador.'
            });
        }

        // 4. Regla de negocio: Un usuario solo puede tener UN Gmail vinculado
        if (user.google_linked === true) {
            return res.status(400).json({
                success: false,
                error: 'Este combatiente ya tiene una cuenta de Google vinculada. Contacta a un administrador para modificarla.'
            });
        }

        // 5. Validar contraseña militar existente
        const isPasswordValid = await bcrypt.compare(password, user.password_hash || '');
        if (!isPasswordValid) {
            await logSecurityEvent({
                supabase,
                userId: user.id || user.user_id,
                nick: user.nick,
                event: 'LOGIN_GOOGLE_LINK_FAILED_PASSWORD',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { attempted_email: cleanEmail, nick: targetNick }
            });
            return res.status(401).json({
                success: false,
                error: 'Contraseña de combate incorrecta. Acceso de vinculación denegado.'
            });
        }

        // 6. Preparar datos de actualización
        // Respaldar email_institucional si no estaba guardado previamente
        const institutionalEmail = user.email_institucional || user.email || `${user.nick.toLowerCase()}@ffaa.py`;

        const updatePayload = {
            email: cleanEmail,
            google_linked: true,
            email_institucional: institutionalEmail,
            updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Error vinculando cuenta Google en Supabase:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Error al actualizar el registro militar de vinculación en base de datos'
            });
        }

        // 7. Registrar evento de seguridad
        await logSecurityEvent({
            supabase,
            userId: user.id || user.user_id,
            nick: user.nick,
            event: 'ACCOUNT_GOOGLE_LINKED',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
                linked_email: cleanEmail,
                previous_email: user.email,
                email_institucional: institutionalEmail
            }
        });

        // 8. Generar JWT para inicio inmediato de sesión táctica
        const token = jwt.sign(
            { 
                user_id: user.user_id || user.id,
                email: cleanEmail,
                role: user.role,
                token_version: user.token_version || 0 
            },
            ENV.JWT_SECRET,
            { expiresIn: ENV.JWT_EXPIRES_IN || '7d' }
        );

        return res.json({
            success: true,
            message: `¡Cuenta de Google (${cleanEmail}) vinculada exitosamente a [PRY] ${user.nick}!`,
            token,
            user: {
                id: user.id,
                nick: user.nick,
                email: cleanEmail,
                email_institucional: institutionalEmail,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Error en linkAccount:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Error interno al procesar vinculación de cuenta'
        });
    }
};

// ========== SOLICITUD DE RESTABLECIMIENTO POR CORREO (FORGOT PASSWORD) ==========
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const supabase = getSupabase();

        if (!email) {
            return res.status(400).json({ success: false, error: 'El correo electrónico es requerido' });
        }
        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Base de datos no disponible' });
        }

        const cleanEmail = email.trim().toLowerCase();

        // 1. Buscar en email O email_institucional
        let user = null;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, nick, email, email_institucional, token_version, status')
                .or(`email.ilike.${cleanEmail},email_institucional.ilike.${cleanEmail}`)
                .limit(1);
            if (!error && data && data.length > 0) user = data[0];
        } catch (e) {
            const fallback = await supabase
                .from('users')
                .select('id, nick, email, token_version, status')
                .ilike('email', cleanEmail)
                .limit(1);
            if (fallback.data && fallback.data.length > 0) user = fallback.data[0];
        }

        // Si no existe, responder con mensaje neutro por seguridad (anti-enumeración de cuentas)
        if (!user) {
            return res.json({
                success: true,
                message: 'Si el correo está registrado en el escuadrón, se enviarán instrucciones de restablecimiento.'
            });
        }

        // 2. Verificar estado de la cuenta
        const userStatus = (user.status || '').toUpperCase();
        if (userStatus === 'INACTIVE' || userStatus === 'INACTIVO') {
            return res.json({
                success: true,
                message: 'Si el correo está registrado en el escuadrón, se enviarán instrucciones de restablecimiento.'
            });
        }

        // 3. Generar token criptoseguro (crypto.randomBytes, 32 bytes)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // 4. Guardar token en tabla password_resets
        const { error: resetError } = await supabase
            .from('password_resets')
            .insert({
                user_id: user.id,
                token: token,
                expires_at: expiresAt.toISOString(),
                used: false
            });

        if (resetError) {
            console.error('❌ Error guardando token en password_resets:', resetError);
            return res.status(500).json({ 
                success: false, 
                error: 'Error al registrar solicitud de restablecimiento militar. Verifique la tabla password_resets.' 
            });
        }

        // 5. Construir enlace seguro de restablecimiento
        const baseUrl = ENV.FRONTEND_URL || 'https://paraguay-ffaa-metalstorm.fly.dev';
        const resetUrl = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`;
        const destinationEmail = user.email || cleanEmail;

        // 6. Enviar correo militar táctico
        let emailResult = null;
        try {
            emailResult = await sendPasswordResetEmail({
                to: destinationEmail,
                nick: user.nick,
                resetUrl,
                token
            });
        } catch (mailErr) {
            console.error('❌ Error enviando email de restablecimiento:', mailErr.message);
        }

        // 7. Registrar evento en security_events
        await logSecurityEvent({
            supabase,
            userId: user.id,
            nick: user.nick,
            event: 'PASSWORD_RESET_REQUESTED',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: {
                destination: destinationEmail,
                expires_at: expiresAt.toISOString(),
                simulated: emailResult?.simulated || false
            }
        });

        return res.json({
            success: true,
            message: 'Si el correo está registrado en el escuadrón, se enviaron las instrucciones de restablecimiento (válidas por 15 minutos).',
            data: {
                expiresInMinutes: 15,
                simulated: emailResult?.simulated || false
            }
        });

    } catch (error) {
        console.error('❌ Error en forgotPassword:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
};

// ========== CONFIRMAR RESTABLECIMIENTO DE CONTRASEÑA (RESET PASSWORD) ==========
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword, password } = req.body;
        const targetPassword = newPassword || password;
        const supabase = getSupabase();

        if (!token || !targetPassword) {
            return res.status(400).json({ success: false, error: 'Token y nueva contraseña son requeridos' });
        }

        if (targetPassword.length < 8) {
            return res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al minímo 8 caracteres' });
        }

        if (!supabase) {
            return res.status(500).json({ success: false, error: 'Servicio de base de datos no disponible' });
        }

        // 1. Buscar token en password_resets
        const { data: resets, error: resetErr } = await supabase
            .from('password_resets')
            .select('*')
            .eq('token', token.trim())
            .limit(1);

        if (resetErr || !resets || resets.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'El token de restablecimiento es inválido o inexistente.'
            });
        }

        const resetRecord = resets[0];

        // 2. Validar que no haya sido utilizado
        if (resetRecord.used) {
            return res.status(400).json({
                success: false,
                error: 'Este enlace de restablecimiento ya ha sido utilizado previamente.'
            });
        }

        // 3. Validar vigencia temporal (máximo 15 minutos)
        const now = new Date();
        const expiresAt = new Date(resetRecord.expires_at);
        if (now > expiresAt) {
            return res.status(400).json({
                success: false,
                error: 'El enlace de restablecimiento ha expirado (plazo máximo de 15 minutos superado).'
            });
        }

        // 4. Obtener usuario correspondiente
        const { data: users, error: userErr } = await supabase
            .from('users')
            .select('id, nick, email, token_version')
            .eq('id', resetRecord.user_id)
            .limit(1);

        if (userErr || !users || users.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Combatiente asociado al token no encontrado.'
            });
        }

        const user = users[0];

        // 5. Cifrar nueva contraseña y aumentar token_version (invalidar sesiones activas)
        const hashedPassword = await bcrypt.hash(targetPassword, 10);
        const newTokenVersion = (user.token_version || 0) + 1;

        // 6. Actualizar usuario en users
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                must_change_password: false,
                token_version: newTokenVersion,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Error actualizando contraseña en Supabase:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Error al actualizar las credenciales en la base militar.'
            });
        }

        // 7. Marcar token como utilizado para prevenir ataques de repetición
        await supabase
            .from('password_resets')
            .update({ used: true })
            .eq('id', resetRecord.id);

        // 8. Registrar evento en security_events
        await logSecurityEvent({
            supabase,
            userId: user.id,
            nick: user.nick,
            event: 'PASSWORD_RESET_SUCCESS',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { method: 'token_email', reset_id: resetRecord.id }
        });

        return res.json({
            success: true,
            message: 'Contraseña táctica actualizada exitosamente. Ya puedes iniciar sesión con tu nueva clave.'
        });

    } catch (error) {
        console.error('❌ Error en resetPassword:', error);
        return res.status(500).json({ success: false, error: 'Error interno del servidor al restablecer contraseña' });
    }
};

// ========== GOOGLE OAUTH 2.0 ==========
export const googleStatus = async (req, res) => {
    try {
        const enabled = isGoogleConfigured();
        const { email } = req.query;

        if (!email) {
            return res.json({
                success: true,
                enabled
            });
        }

        const supabase = getSupabase();
        if (!supabase) {
            return res.json({ success: true, enabled, linked: false });
        }

        const cleanEmail = email.trim().toLowerCase();
        let user = null;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, nick, email, email_institucional, google_linked')
                .or(`email.ilike.${cleanEmail},email_institucional.ilike.${cleanEmail}`)
                .limit(1);
            if (!error && data && data.length > 0) user = data[0];
        } catch (e) {
            const fallback = await supabase
                .from('users')
                .select('id, nick, email, google_linked')
                .ilike('email', cleanEmail)
                .limit(1);
            if (fallback.data && fallback.data.length > 0) user = fallback.data[0];
        }

        return res.json({
            success: true,
            enabled,
            linked: Boolean(user?.google_linked),
            user: user ? { nick: user.nick, email: user.email } : null
        });
    } catch (err) {
        console.error('❌ Error en googleStatus:', err);
        return res.json({ success: false, enabled: isGoogleConfigured(), linked: false });
    }
};

export const googleAuth = (req, res, next) => {
    if (!isGoogleConfigured()) {
        return res.redirect('/?auth_error=' + encodeURIComponent('El inicio de sesión con Google no está habilitado actualmente en el servidor.'));
    }
    passport.authenticate('google', { 
        scope: ['profile', 'email'], 
        session: false 
    })(req, res, next);
};

export const googleCallback = (req, res, next) => {
    if (!isGoogleConfigured()) {
        return res.redirect('/?auth_error=' + encodeURIComponent('El inicio de sesión con Google no está habilitado actualmente.'));
    }

    passport.authenticate('google', { session: false }, async (err, user, info) => {
        if (err) {
            console.error('❌ [Google Callback Error]:', err);
            const msg = err.message || 'Error en la autenticación con Google';
            return res.redirect(`/?auth_error=${encodeURIComponent(msg)}`);
        }

        // Si el usuario no fue autenticado
        if (!user) {
            // Si el correo no está registrado en el escuadrón -> Redirigir a página de vinculación táctica
            if (info?.code === 'NOT_LINKED' && info?.email) {
                console.log(`🔗 [Google Callback] Redirigiendo a /link-account para el correo ${info.email}`);
                return res.redirect(`/link-account?email=${encodeURIComponent(info.email)}`);
            }

            const errorMsg = info?.message || 'Acceso táctico denegado con Google';
            return res.redirect(`/?auth_error=${encodeURIComponent(errorMsg)}`);
        }

        try {
            const supabase = getSupabase();
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

            if (supabase) {
                await logSecurityEvent({
                    supabase,
                    userId: user.id || user.user_id,
                    nick: user.nick,
                    event: 'LOGIN_SUCCESS_GOOGLE',
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                    metadata: { role: user.role, auth_provider: 'google' }
                });

                await supabase
                    .from('users')
                    .update({ last_activity: new Date().toISOString() })
                    .or(`id.eq.${user.id},user_id.eq.${user.user_id || user.id}`);
            }

            const mustChangeParam = user.must_change_password ? '&must_change_password=true' : '';
            return res.redirect(`/?auth_token=${encodeURIComponent(token)}${mustChangeParam}`);
        } catch (tokenErr) {
            console.error('❌ [Google Callback Token Error]:', tokenErr);
            return res.redirect('/?auth_error=' + encodeURIComponent('Error interno procesando sesión militar'));
        }
    })(req, res, next);
};
