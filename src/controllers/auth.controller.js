import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { getSupabase, memoryStore } from '../db/supabase.js';
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

        let user = null;

        // 1. Buscar en Supabase
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .limit(1);

                if (!error && data && data.length > 0) {
                    user = data[0];
                }
            } catch (err) {
                console.warn('⚠️ [Auth] Error consultando Supabase:', err.message);
            }
        }

        // 2. Fallback a memoryStore
        if (!user) {
            user = memoryStore.users.find(u => u.email === email);
        }

        if (!user) {
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

        // 3. Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            await logSecurityEvent({
                supabase,
                userId: user.id,
                nick: user.nick,
                event: 'LOGIN_FAILED',
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                metadata: { reason: 'invalid_password' }
            });
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 4. Verificar estado del usuario
        if (user.squad_status === 'INACTIVE' || user.status === 'INACTIVE') {
            return res.status(403).json({ error: 'Cuenta inactiva. Contacta a un administrador.' });
        }

        // 5. Generar JWT con token_version
        const token = jwt.sign(
            { 
                user_id: user.user_id || user.id,
                token_version: user.token_version || 0 
            },
            ENV.JWT_SECRET,
            { expiresIn: ENV.JWT_EXPIRES_IN || '7d' }
        );

        await logSecurityEvent({
            supabase,
            userId: user.id,
            nick: user.nick,
            event: 'LOGIN_SUCCESS',
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            metadata: { role: user.role }
        });

        // 6. Actualizar last_activity
        if (supabase) {
            try {
                await supabase
                    .from('users')
                    .update({ last_activity: new Date().toISOString() })
                    .eq('id', user.id);
            } catch (err) {
                console.warn('⚠️ [Auth] Error actualizando last_activity:', err.message);
            }
        }

        // 7. Preparar respuesta
        const { password_hash, ...safeUser } = user;
        
        const userResponse = {
            ...safeUser,
            user_id: user.user_id || user.id,
            must_change_password: user.must_change_password || false
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

        const { password_hash, ...safeUser } = user;
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

        let existing = null;
        if (supabase) {
            try {
                const { data, error: checkError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('email', email)
                    .limit(1);

                if (checkError) {
                    console.error('Error verificando usuario en Supabase:', checkError);
                } else if (data && data.length > 0) {
                    existing = data;
                }
            } catch (err) {
                console.warn('⚠️ Error al conectar con Supabase en registro:', err.message);
            }
        }

        if (!existing) {
            const memoryUser = memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (memoryUser) {
                existing = [memoryUser];
            }
        }

        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // ✅ GENERAR CONTRASEÑA TEMPORAL ALEATORIA (no 123456)
        const tempPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newUserId = memoryStore.users.length > 0 
            ? Math.max(...memoryStore.users.map(u => u.user_id || u.id || 0)) + 1 
            : 1;

        const newUser = {
            id: newUserId,
            user_id: newUserId,
            email,
            nick,
            role: role || 'MIEMBRO',
            password_hash: hashedPassword,
            must_change_password: true,
            token_version: 1,
            status: 'ACTIVE',
            squad_status: 'ACTIVE',
            avg_tokens: 0,
            weeks_evaluated: 0,
            perf_status: 'VERDE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .insert(newUser)
                    .select()
                    .single();

                if (!error && data) {
                    memoryStore.users.push(data);
                    const { password_hash, ...safeUser } = data;
                    return res.status(201).json({
                        success: true,
                        message: 'Usuario creado correctamente. Contraseña temporal generada.',
                        temporaryPassword: tempPassword,
                        user: safeUser
                    });
                }
            } catch (err) {
                console.warn('⚠️ Supabase insert falló, guardando en memoria:', err.message);
            }
        }

        memoryStore.users.push(newUser);
        const { password_hash, ...safeUser } = newUser;
        res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente en el registro del escuadrón.',
            temporaryPassword: tempPassword,
            user: safeUser
        });

    } catch (error) {
        console.error('❌ Error en register:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ========== CAMBIO DE CONTRASEÑA (CORREGIDO) ==========
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

        // 1. Obtener usuario completo
        let user = null;
        if (supabase) {
            try {
                const { data, error: userError } = await supabase
                    .from('users')
                    .select('password_hash, must_change_password, token_version, nick, id, user_id')
                    .or(`id.eq.${userId},user_id.eq.${userId}`)
                    .limit(1);

                if (!userError && data && data.length > 0) {
                    user = data[0];
                }
            } catch (err) {
                console.warn('⚠️ Error al consultar usuario en Supabase:', err.message);
            }
        }

        if (!user) {
            user = memoryStore.users.find(u => u.user_id === userId || u.id === userId);
        }

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // 2. Verificar contraseña actual SOLO si NO es cambio forzado
        const isForcedChange = Boolean(user.must_change_password) || Boolean(isForced) || Boolean(req.body.force);
        if (!isForcedChange) {
            if (!currentPassword) {
                return res.status(400).json({ 
                    error: 'Debes indicar tu contraseña actual',
                    code: 'CURRENT_PASSWORD_REQUIRED'
                });
            }
            const valid = await bcrypt.compare(currentPassword, user.password_hash);
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

        // 4. Actualizar en Supabase si está disponible
        if (supabase) {
            try {
                await supabase
                    .from('users')
                    .update({
                        password_hash: newHash,
                        must_change_password: false,
                        password_changed_at: new Date().toISOString(),
                        token_version: newTokenVersion,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);
            } catch (err) {
                console.warn('⚠️ Error actualizando password en Supabase:', err.message);
            }
        }

        // Actualizar en memoria
        const memUser = memoryStore.users.find(u => u.user_id === userId || u.id === userId);
        if (memUser) {
            memUser.password_hash = newHash;
            memUser.must_change_password = false;
            memUser.token_version = newTokenVersion;
            memUser.updated_at = new Date().toISOString();
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
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ========== OLVIDO DE CONTRASEÑA (DEPRECADO - USAR RECOVERY) ==========
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const supabase = getSupabase();

        if (!email) {
            return res.status(400).json({ error: 'El correo es requerido' });
        }

        let user = null;
        if (supabase) {
            try {
                const { data, error: userError } = await supabase
                    .from('users')
                    .select('id, nick, email, token_version')
                    .eq('email', email)
                    .single();

                if (!userError && data) {
                    user = data;
                }
            } catch (err) {
                console.warn('⚠️ Supabase lookup falló en forgotPassword:', err.message);
            }
        }

        if (!user) {
            user = memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        }

        if (!user) {
            return res.json({
                success: true,
                message: 'Si el correo existe, se enviarán instrucciones'
            });
        }

        // ✅ USAR CONTRASEÑA TEMPORAL ALEATORIA
        const tempPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        const newTokenVersion = (user.token_version || 0) + 1;

        if (supabase) {
            try {
                await supabase
                    .from('users')
                    .update({
                        password_hash: hashedPassword,
                        must_change_password: true,
                        password_changed_at: new Date().toISOString(),
                        token_version: newTokenVersion
                    })
                    .eq('id', user.id);
            } catch (err) {
                console.warn('⚠️ Error al actualizar usuario en Supabase:', err.message);
            }
        }

        const memUser = memoryStore.users.find(u => u.id === user.id || u.email === user.email);
        if (memUser) {
            memUser.password_hash = hashedPassword;
            memUser.must_change_password = true;
            memUser.token_version = newTokenVersion;
        }

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