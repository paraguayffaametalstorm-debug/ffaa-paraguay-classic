import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { getSupabase, memoryStore } from '../db/supabase.js';

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
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 3. Verificar contraseña
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // 4. Verificar estado del usuario
        if (user.squad_status === 'INACTIVE' || user.status === 'INACTIVE') {
            return res.status(403).json({ error: 'Cuenta inactiva. Contacta a un administrador.' });
        }

        // 5. Generar JWT
        const token = jwt.sign(
            { user_id: user.user_id || user.id },
            ENV.JWT_SECRET,
            { expiresIn: ENV.JWT_EXPIRES_IN || '7d' }
        );

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

        // 7. Preparar respuesta (sin password_hash)
        const { password_hash, ...safeUser } = user;
        
        // Asegurar que user_id es INTEGER
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

        // Verificar si el usuario ya existe
        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .limit(1);

        if (checkError) {
            console.error('Error verificando usuario:', checkError);
            return res.status(500).json({ error: 'Error al verificar usuario' });
        }

        if (existing && existing.length > 0) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Crear usuario con contraseña temporal
        const tempPassword = '123456';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const newUser = {
            email,
            nick,
            role: role || 'MIEMBRO',
            password_hash: hashedPassword,
            must_change_password: true,
            status: 'ACTIVE',
            squad_status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();

        if (error) {
            console.error('Error creando usuario:', error);
            return res.status(500).json({ error: 'Error al crear usuario' });
        }

        const { password_hash, ...safeUser } = data;
        res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente. Contraseña temporal: 123456',
            user: safeUser
        });

    } catch (error) {
        console.error('❌ Error en register:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ========== CAMBIO DE CONTRASEÑA ==========
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;
        const supabase = getSupabase();

        if (!supabase) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        // Validar nueva contraseña
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                error: 'La nueva contraseña debe tener al menos 6 caracteres'
            });
        }

        // 1. Obtener usuario con su contraseña actual
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // 2. Verificar contraseña actual
        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        // 3. Hashear nueva contraseña
        const newHash = await bcrypt.hash(newPassword, 10);

        // 4. Actualizar en Supabase
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: newHash,
                must_change_password: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error actualizando contraseña:', updateError);
            return res.status(500).json({ error: 'Error al actualizar la contraseña' });
        }

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });

    } catch (error) {
        console.error('❌ Error en changePassword:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ========== OLVIDO DE CONTRASEÑA (SIN EMAIL) ==========
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const supabase = getSupabase();

        if (!supabase) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        if (!email) {
            return res.status(400).json({ error: 'El correo es requerido' });
        }

        // Buscar usuario por email
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, nick, email')
            .eq('email', email)
            .single();

        if (userError || !user) {
            // No revelar si el usuario existe o no (seguridad)
            return res.json({
                success: true,
                message: 'Si el correo existe, se enviarán instrucciones'
            });
        }

        // Resetear a '123456' y forzar cambio
        const tempPassword = '123456';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: hashedPassword,
                must_change_password: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Error reseteando contraseña:', updateError);
            return res.status(500).json({ error: 'Error al resetear la contraseña' });
        }

        res.json({
            success: true,
            message: `Contraseña de ${user.nick} reseteada a '123456'. Deberá cambiarla al iniciar sesión.`
        });

    } catch (error) {
        console.error('❌ Error en forgotPassword:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};