import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { ENV } from '../config/env.js';

// Polyfill native WebSocket in Node.js runtime if not present
if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

let supabaseClient = null;
let isConfigured = false;

if (ENV.SUPABASE_URL && ENV.SUPABASE_KEY) {
  try {
    supabaseClient = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    isConfigured = true;
    console.log(`⚡ [Supabase] Cliente inicializado apuntando a: ${ENV.SUPABASE_URL.substring(0, 30)}...`);
  } catch (err) {
    console.error('⚠️ [Supabase] Error crítico al inicializar cliente:', err.message);
  }
} else {
  console.warn('⚠️ [Supabase] Variables SUPABASE_URL o SUPABASE_KEY no detectadas.');
}

/**
 * Realiza un test de diagnóstico contra las tablas principales de Supabase
 */
export async function checkSupabaseHealth() {
  if (!supabaseClient) {
    return { ok: false, message: 'Supabase client not initialized' };
  }

  try {
    const results = {};
    
    // Check users table
    const { data: users, error: usersErr, count: userCount } = await supabaseClient
      .from('users')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (usersErr) {
      console.warn('⚠️ [Supabase Diagnostic] Error consultando tabla "users":', usersErr.message);
      results.users = { ok: false, error: usersErr.message };
    } else {
      console.log(`✅ [Supabase Diagnostic] Tabla "users" accesible. Registros recuperados: ${users?.length || 0}`);
      results.users = { ok: true, count: userCount || users?.length || 0 };
    }

    // Check performances table
    const { data: perfs, error: perfsErr } = await supabaseClient
      .from('performances')
      .select('*')
      .limit(5);

    if (perfsErr) {
      console.warn('⚠️ [Supabase Diagnostic] Error consultando tabla "performances":', perfsErr.message);
      results.performances = { ok: false, error: perfsErr.message };
    } else {
      console.log(`✅ [Supabase Diagnostic] Tabla "performances" accesible. Registros recuperados: ${perfs?.length || 0}`);
      results.performances = { ok: true, count: perfs?.length || 0 };
    }

    // Check events table
    const { data: events, error: eventsErr } = await supabaseClient
      .from('events')
      .select('*')
      .limit(5);

    if (eventsErr) {
      console.warn('⚠️ [Supabase Diagnostic] Error consultando tabla "events":', eventsErr.message);
      results.events = { ok: false, error: eventsErr.message };
    } else {
      console.log(`✅ [Supabase Diagnostic] Tabla "events" accesible. Registros recuperados: ${events?.length || 0}`);
      results.events = { ok: true, count: events?.length || 0 };
    }

    return { ok: true, results };
  } catch (e) {
    console.error('❌ [Supabase Diagnostic] Error general de conexión:', e.message);
    return { ok: false, error: e.message };
  }
}

// Execute health check asynchronously on server startup
if (supabaseClient) {
  checkSupabaseHealth().catch(err => {
    console.error('❌ [Supabase Startup Check Failed]:', err.message);
  });
}

export const supabase = supabaseClient;
export const getSupabase = () => supabaseClient;
export default supabaseClient;
