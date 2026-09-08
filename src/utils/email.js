import nodemailer from 'nodemailer';
import { ENV } from '../config/env.js';

let transporter = null;

/**
 * Obtiene o inicializa la instancia de transporte Nodemailer de forma lazy
 */
export function getEmailTransporter() {
    if (transporter) return transporter;

    if (!ENV.EMAIL_HOST || !ENV.EMAIL_USER || !ENV.EMAIL_PASS) {
        console.warn('⚠️ [Email] Credenciales SMTP incompletas (EMAIL_HOST, EMAIL_USER, EMAIL_PASS). Envíos en modo simulación.');
        return null;
    }

    try {
        const port = parseInt(ENV.EMAIL_PORT || '587', 10);
        const isSecure = ENV.EMAIL_SECURE === 'true' || ENV.EMAIL_SECURE === true || port === 465;

        transporter = nodemailer.createTransport({
            host: ENV.EMAIL_HOST,
            port: port,
            secure: isSecure,
            auth: {
                user: ENV.EMAIL_USER,
                pass: ENV.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        console.log(`✅ [Email] Transporte Nodemailer conectado a ${ENV.EMAIL_HOST}:${port} (SSL/TLS: ${isSecure})`);
        return transporter;
    } catch (err) {
        console.error('❌ [Email] Error inicializando transporte Nodemailer:', err.message);
        return null;
    }
}

/**
 * Envía el correo militar de restablecimiento de contraseña
 * @param {Object} params
 * @param {string} params.to - Correo destinatario
 * @param {string} params.nick - Callsign / Indicativo del combatiente
 * @param {string} params.resetUrl - URL completa de restablecimiento
 * @param {string} params.token - Token único criptoseguro
 */
export async function sendPasswordResetEmail({ to, nick, resetUrl, token }) {
    const client = getEmailTransporter();
    const fromAddress = ENV.EMAIL_FROM || '"PARAGUAY-FFAA | METALSTORM" <soporte@paraguay-ffaa.com>';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Restablecimiento de Contraseña - PARAGUAY-FFAA</title>
      <style>
        body { background-color: #0B132B; color: #E0E6ED; font-family: 'Rajdhani', 'Segoe UI', Arial, sans-serif; margin: 0; padding: 24px; }
        .container { max-width: 580px; margin: 0 auto; background: #1C2541; border: 1px solid #3A506B; border-top: 4px solid #D52B1E; border-radius: 6px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header { text-align: center; border-bottom: 1px solid #3A506B; padding-bottom: 20px; margin-bottom: 24px; }
        .header h1 { margin: 0; color: #FFFFFF; font-size: 24px; letter-spacing: 2px; }
        .badge { display: inline-block; background: #D52B1E; color: #FFFFFF; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 3px; letter-spacing: 1.5px; margin-top: 8px; }
        .content { font-size: 15px; line-height: 1.6; color: #CBD5E1; }
        .highlight { color: #F1C40F; font-weight: bold; }
        .btn-wrapper { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; background: #0038A8; color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 16px; letter-spacing: 1px; border: 1px solid #4D96FF; }
        .warning-box { background: rgba(213, 43, 30, 0.15); border-left: 3px solid #D52B1E; padding: 12px 16px; margin: 24px 0; font-size: 13px; color: #FFAAA6; border-radius: 2px; }
        .footer { border-top: 1px solid #3A506B; padding-top: 20px; margin-top: 28px; font-size: 12px; color: #718096; text-align: center; }
        .token-box { font-family: monospace; background: #0B132B; padding: 10px 14px; border-radius: 4px; border: 1px solid #3A506B; color: #64DFDF; word-break: break-all; margin-top: 6px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>PARAGUAY FFAA · METALSTORM</h1>
          <div class="badge">SISTEMA C4ISR · PROTOCOLO DE SEGURIDAD</div>
        </div>
        <div class="content">
          <p>Atención Piloto <span class="highlight">[PRY] ${nick || 'Combatiente'}</span>,</p>
          <p>Se ha emitido una solicitud de restablecimiento para la clave de acceso a tu terminal táctico del escuadrón.</p>
          <p>Para establecer tu nueva contraseña personal de combate, pulsa el siguiente botón seguro:</p>
          
          <div class="btn-wrapper">
            <a href="${resetUrl}" class="btn" target="_blank">RESTABLECER CONTRASEÑA</a>
          </div>

          <div class="warning-box">
            ⏱️ <strong>PLAZO MÁXIMO DE SEGURIDAD:</strong> Este enlace es de un solo uso y expirará en exactamente <strong>15 minutos</strong>.<br>
            Si no reconoces esta operación, no ingreses al enlace y notifica a tu oficial de operaciones de inmediato.
          </div>

          <p style="font-size: 13px; color: #94A3B8;">
            Si el botón no responde en tu cliente de correo, copia y abre este enlace:<br>
            <div class="token-box">${resetUrl}</div>
          </p>
        </div>
        <div class="footer">
          PARAGUAY FFAA [PRY] · Escuadrón Oficial MetalStorm · Versión v3.4.0<br>
          Mensaje táctico automático emitido por el sistema C4ISR. No responder a esta casilla.
        </div>
      </div>
    </body>
    </html>
    `;

    const textContent = `
PARAGUAY FFAA · METALSTORM
SISTEMA C4ISR · PROTOCOLO DE SEGURIDAD

Atención Piloto [PRY] ${nick || 'Combatiente'},

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
Ingresa al siguiente enlace para definir tu nueva contraseña (válido por 15 minutos):

${resetUrl}

Token de autorización: ${token}

Si no realizaste esta solicitud, ignora este mensaje.

PARAGUAY FFAA [PRY] · Escuadrón Oficial MetalStorm v3.4.0
    `.trim();

    if (!client) {
        console.warn(`⚠️ [Email Simulado] Servidor SMTP no configurado. Enlace de restablecimiento generado:\n${resetUrl}`);
        return {
            sent: false,
            simulated: true,
            resetUrl,
            message: 'Servicio de correo no configurado (simulado en logs)'
        };
    }

    try {
        const info = await client.sendMail({
            from: fromAddress,
            to,
            subject: '🔑 [PARAGUAY-FFAA] Restablecimiento de Credenciales de Combate',
            text: textContent,
            html: htmlContent
        });
        console.log(`📧 [Email] Correo de restablecimiento enviado exitosamente a ${to}. ID: ${info.messageId}`);
        return { sent: true, messageId: info.messageId, resetUrl };
    } catch (err) {
        console.error(`❌ [Email] Error al despachar correo a ${to}:`, err.message);
        throw err;
    }
}
