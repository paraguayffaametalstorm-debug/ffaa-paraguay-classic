import dotenv from 'dotenv';
dotenv.config();

// ========== VALIDACIÓN CRÍTICA DE SEGURIDAD ==========
// HALL-001: Prevenir arranque sin JWT_SECRET en producción.
// Este bloque DEBE ejecutarse antes de exportar ENV.
const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET no definido en producción. Abortando.');
  process.exit(1);
}

// ========== CONFIGURACIÓN DE ENTORNO ==========
export const ENV = {
  // FIX-308: Nivel de logging (trace, debug, info, warn, error, fatal).
  // Default: info. Override en prod: fly secrets set LOG_LEVEL=debug
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'production',
  JWT_SECRET: JWT_SECRET || 'dev-only-insecure-secret-change-me',

  // FIX-101: Feature flag para reset password atómico (RPC reset_password_atomic).
  // Default: true (usa la RPC). Si algo falla: fly secrets set USE_ATOMIC_RESET=false
  USE_ATOMIC_RESET: process.env.USE_ATOMIC_RESET !== 'false',

  // FIX-105: Feature flag para cambio de status de evento atómico (RPC change_event_status_atomic).
  // Default: true (usa la RPC). Si algo falla: fly secrets set USE_ATOMIC_EVENT_STATUS=false
  USE_ATOMIC_EVENT_STATUS: process.env.USE_ATOMIC_EVENT_STATUS !== 'false',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  TEMP_PASSWORD_EXPIRY_DAYS: parseInt(process.env.TEMP_PASSWORD_EXPIRY_DAYS || '7', 10),
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_DATABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://paraguay-ffaa-metalstorm.fly.dev',
  EMAIL_HOST: process.env.EMAIL_HOST || '',
  EMAIL_PORT: process.env.EMAIL_PORT || '587',
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '"PARAGUAY-FFAA | METALSTORM" <soporte@paraguay-ffaa.com>',
  EMAIL_SECURE: process.env.EMAIL_SECURE || 'false',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN)
    ? (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN).split(',').map(s => s.trim()).filter(Boolean)
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://paraguay-ffaa-metalstorm.fly.dev'
      ]
};