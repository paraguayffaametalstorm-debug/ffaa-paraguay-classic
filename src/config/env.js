import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'production',
  JWT_SECRET: process.env.JWT_SECRET || 'ffaa_pry_metalstorm_jwt_super_secret_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_DATABASE_URL || '',
  SUPABASE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN)
    ? (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN).split(',').map(s => s.trim()).filter(Boolean)
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://paraguay-ffaa-metalstorm.fly.dev'
      ]
};
