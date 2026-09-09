import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { ENV } from './env.js';
import { getSupabase } from '../db/supabase.js';
import { logSecurityEvent } from '../utils/audit.js';

let isGoogleOAuthConfigured = false;

/**
 * Configura la estrategia de Google OAuth 2.0 en Passport de forma stateless
 */
export function configurePassport() {
    if (!ENV.GOOGLE_CLIENT_ID || !ENV.GOOGLE_CLIENT_SECRET) {
        console.warn('⚠️ [Passport] GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados. Google OAuth deshabilitado temporalmente.');
        return false;
    }

    try {
        const callbackURL = ENV.GOOGLE_CALLBACK_URL || '/api/auth/google/callback';

        passport.use(new GoogleStrategy({
            clientID: ENV.GOOGLE_CLIENT_ID,
            clientSecret: ENV.GOOGLE_CLIENT_SECRET,
            callbackURL: callbackURL,
            passReqToCallback: true
        }, async (req, accessToken, refreshToken, profile, done) => {
            try {
                const supabase = getSupabase();
                const email = profile?.emails?.[0]?.value?.trim().toLowerCase();

                if (!email) {
                    return done(null, false, { 
                        message: 'No se pudo obtener la dirección de correo desde la cuenta de Google' 
                    });
                }

                if (!supabase) {
                    return done(new Error('Servicio de base de datos no disponible'));
                }

                // 1. Verificar si el email existe en la tabla users
                let users = [];
                try {
                    const { data: userData, error: userError } = await supabase
                        .from('users')
                        .select('*')
                        .or(`email.ilike.${email},email_institucional.ilike.${email}`)
                        .limit(1);
                    if (!userError && userData) {
                        users = userData;
                    } else {
                        // Fallback si email_institucional aún no existe en supabase
                        const fallback = await supabase
                            .from('users')
                            .select('*')
                            .ilike('email', email)
                            .limit(1);
                        users = fallback.data || [];
                    }
                } catch (e) {
                    const fallback = await supabase
                        .from('users')
                        .select('*')
                        .ilike('email', email)
                        .limit(1);
                    users = fallback.data || [];
                }

                // Si NO existe en users -> Redirigir al flujo de vinculación táctica
                if (!users || users.length === 0) {
                    console.log(`ℹ️ [Passport Google] Gmail ${email} no registrado. Procediendo a vinculación de cuenta.`);
                    return done(null, false, { 
                        code: 'NOT_LINKED',
                        email: email,
                        message: 'Cuenta de Google no vinculada. Redirigiendo a vinculación táctica.' 
                    });
                }

                const user = users[0];

                // 2. Verificar si el usuario está inactivo
                const userStatus = (user.status || '').toUpperCase();
                if (userStatus === 'INACTIVE' || userStatus === 'INACTIVO') {
                    await logSecurityEvent({
                        supabase,
                        userId: user.id || user.user_id,
                        nick: user.nick,
                        event: 'LOGIN_GOOGLE_DENIED_INACTIVE',
                        ip: req.ip,
                        userAgent: req.headers['user-agent'],
                        metadata: { 
                            email, 
                            reason: 'user_inactive',
                            google_id: profile.id 
                        }
                    });

                    return done(null, false, { 
                        code: 'ACCOUNT_INACTIVE',
                        message: '⚠️ Cuenta desactivada. Contacta a tu oficial de operaciones.' 
                    });
                }

                // 3. Usuario registrado y activo
                return done(null, user);

            } catch (err) {
                console.error('❌ [Passport Google] Excepción en verificación de usuario:', err);
                return done(err);
            }
        }));

        isGoogleOAuthConfigured = true;
        console.log(`✅ [Passport] Estrategia Google OAuth 2.0 registrada exitosamente (Callback: ${callbackURL})`);
        return true;
    } catch (err) {
        console.error('❌ [Passport] Error inicializando Google Strategy:', err.message);
        return false;
    }
}

/**
 * Retorna si Google OAuth está listo para procesar autenticaciones
 */
export function isGoogleConfigured() {
    return isGoogleOAuthConfigured;
}

export default passport;
