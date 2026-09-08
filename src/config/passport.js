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
                const { data: users, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .ilike('email', email)
                    .limit(1);

                if (userError) {
                    console.error('❌ [Passport Google] Error consultando usuario:', userError);
                    return done(userError);
                }

                // Si NO existe en users -> Denegar acceso
                if (!users || users.length === 0) {
                    await logSecurityEvent({
                        supabase,
                        userId: null,
                        nick: email,
                        event: 'LOGIN_GOOGLE_DENIED_NOT_FOUND',
                        ip: req.ip,
                        userAgent: req.headers['user-agent'],
                        metadata: { 
                            email, 
                            reason: 'email_not_registered',
                            google_id: profile.id 
                        }
                    });

                    return done(null, false, { 
                        code: 'EMAIL_NOT_REGISTERED',
                        message: '❌ Acceso denegado. Tu correo no está registrado en el escuadrón. Contacta a un administrador.' 
                    });
                }

                const user = users[0];

                // 2. Verificar si el usuario está inactivo
                const userStatus = (user.status || '').toUpperCase();
                if (userStatus === 'INACTIVE' || userStatus === 'INACTIVO' || user.is_active === false) {
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
