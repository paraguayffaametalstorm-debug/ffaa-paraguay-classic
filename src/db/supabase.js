import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { ENV } from '../config/env.js';

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
  console.log('ℹ️ [Supabase] Variables SUPABASE_URL o SUPABASE_KEY no detectadas. Usando repositorio táctico en memoria.');
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

// Initial seed password hash ('123456' hashed with bcrypt)
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('123456', 10);

// Default seed records
export const memoryStore = {
  users: [
    {
      user_id: 1,
      email: 'admin@ffaa.py',
      password_hash: DEFAULT_PASSWORD_HASH,
      nick: 'PRY_Comandante',
      role: 'OWNER',
      must_change_password: false,
      phone: '+595 981 123456',
      callsign: 'VIPER-01',
      discord: 'Viper#1234',
      bio: 'Comandante en Jefe del Escuadrón Paraguay FFAA',
      joined_date: '2025-01-01',
      perf_status: 'VERDE',
      squad_status: 'ACTIVE',
      avg_tokens: 195,
      weeks_evaluated: 16,
      trend: 'up',
      last_activity: new Date().toISOString()
    },
    {
      user_id: 2,
      email: 'falcon@ffaa.py',
      password_hash: DEFAULT_PASSWORD_HASH,
      nick: 'PRY_Falcon',
      role: 'ADMIN',
      must_change_password: false,
      phone: '+595 982 654321',
      callsign: 'FALCON-02',
      discord: 'Falcon#5678',
      bio: 'Oficial Táctico y Administrador de Escuadrón',
      joined_date: '2025-02-10',
      perf_status: 'VERDE',
      squad_status: 'ACTIVE',
      avg_tokens: 188,
      weeks_evaluated: 14,
      trend: 'stable',
      last_activity: new Date(Date.now() - 86400000).toISOString()
    },
    {
      user_id: 3,
      email: 'veterano@ffaa.py',
      password_hash: DEFAULT_PASSWORD_HASH,
      nick: 'PRY_Condor',
      role: 'VETERANO',
      must_change_password: false,
      phone: '+595 983 778899',
      callsign: 'CONDOR-03',
      discord: 'Condor#9900',
      bio: 'Piloto veterano de combate aéreo',
      joined_date: '2025-03-01',
      perf_status: 'NARANJA',
      squad_status: 'ACTIVE',
      avg_tokens: 162,
      weeks_evaluated: 12,
      trend: 'up',
      last_activity: new Date(Date.now() - 172800000).toISOString()
    },
    {
      user_id: 4,
      email: 'piloto@ffaa.py',
      password_hash: DEFAULT_PASSWORD_HASH,
      nick: 'PRY_Jaguar',
      role: 'MIEMBRO',
      must_change_password: false,
      phone: '+595 984 112233',
      callsign: 'JAGUAR-04',
      discord: 'Jaguar#3344',
      bio: 'Piloto activo de escuadrón',
      joined_date: '2025-05-15',
      perf_status: 'ROJO',
      squad_status: 'ACTIVE',
      avg_tokens: 118,
      weeks_evaluated: 8,
      trend: 'down',
      last_activity: new Date(Date.now() - 259200000).toISOString()
    },
    {
      user_id: 5,
      email: 'novato@ffaa.py',
      password_hash: DEFAULT_PASSWORD_HASH,
      nick: 'PRY_Tornado',
      role: 'MIEMBRO',
      must_change_password: false,
      phone: '+595 985 445566',
      callsign: 'TORNADO-05',
      discord: 'Tornado#5566',
      bio: 'Piloto recién graduado',
      joined_date: '2025-08-01',
      perf_status: 'VERDE',
      squad_status: 'ACTIVE',
      avg_tokens: 180,
      weeks_evaluated: 4,
      trend: 'up',
      last_activity: new Date().toISOString()
    }
  ],
  userSettings: {
    1: { theme: 'militar', language: 'es', notif_email: true, notif_whatsapp: false, notif_status: true, notif_reminder: true, notif_announcements: true }
  },
  events: [
    { id: 'SQUADRON-2026-08', type: 'SQUADRON', start_date: '2026-02-23', end_date: '2026-03-01', is_open: true, status: 'OPEN' },
    { id: 'BM-2026-07', type: 'BLACK_MARKET', start_date: '2026-02-16', end_date: '2026-02-22', is_open: false, status: 'CLOSED' },
    { id: 'SQUADRON-2026-06', type: 'SQUADRON', start_date: '2026-02-09', end_date: '2026-02-15', is_open: false, status: 'CLOSED' },
    { id: 'SQUADRON-2026-05', type: 'SQUADRON', start_date: '2026-02-02', end_date: '2026-02-08', is_open: false, status: 'CLOSED' }
  ],
  performances: [
    { id: 1, user_id: 1, nick: 'PRY_Comandante', role: 'OWNER', event_id: 'SQUADRON-2026-08', tokens: 195, days_connected: 4, flew_in_group: true, notes: 'Patrullaje completo', status: 'VERDE', created_at: new Date().toISOString() },
    { id: 2, user_id: 2, nick: 'PRY_Falcon', role: 'ADMIN', event_id: 'SQUADRON-2026-08', tokens: 190, days_connected: 4, flew_in_group: true, notes: 'Escolta táctica', status: 'VERDE', created_at: new Date().toISOString() },
    { id: 3, user_id: 3, nick: 'PRY_Condor', role: 'VETERANO', event_id: 'SQUADRON-2026-08', tokens: 165, days_connected: 3, flew_in_group: true, notes: 'Misiones de intercepción', status: 'NARANJA', created_at: new Date().toISOString() },
    { id: 4, user_id: 4, nick: 'PRY_Jaguar', role: 'MIEMBRO', event_id: 'SQUADRON-2026-08', tokens: 115, days_connected: 2, flew_in_group: true, notes: 'Conexión parcial', status: 'ROJO', created_at: new Date().toISOString() },
    { id: 5, user_id: 5, nick: 'PRY_Tornado', role: 'MIEMBRO', event_id: 'SQUADRON-2026-08', tokens: 180, days_connected: 4, flew_in_group: true, notes: 'Excelente desempeño novato', status: 'VERDE', created_at: new Date().toISOString() }
  ],
  planeModels: [
    { id: 'f22', name: 'F-22 Raptor', type: 'Caza de 5ª Generación', tier: 5, special_name: 'Vector Thrust Overdrive', passive_name: 'Radar Stealth Cloak' },
    { id: 'su57', name: 'Su-57 Felon', type: 'Caza de Superioridad Aérea', tier: 5, special_name: 'Plasma Shield Generator', passive_name: 'Infrared Jammer' },
    { id: 'f35', name: 'F-35 Lightning II', type: 'Caza Táctico Multirrol', tier: 5, special_name: 'Precision Strike Lock', passive_name: 'Data-Link Sensor Fusion' },
    { id: 'typhoon', name: 'Eurofighter Typhoon', type: 'Caza de Intercepción', tier: 4, special_name: 'Supercruise Surge', passive_name: 'Pirate IRST Tracking' },
    { id: 'rafale', name: 'Dassault Rafale', type: 'Caza Omnirrol', tier: 4, special_name: 'SPECTRA Defense Flare', passive_name: 'Meteor BVR Guidance' },
    { id: 'f15ex', name: 'F-15EX Eagle II', type: 'Caza de Ataque Pesado', tier: 4, special_name: 'Heavy Payload Barrage', passive_name: 'Advanced Fly-by-Wire' },
    { id: 'gripen', name: 'JAS 39 Gripen E', type: 'Caza Ligero Táctico', tier: 4, special_name: 'Rapid Turn Maneuver', passive_name: 'Electronic Warfare Suite' },
    { id: 'mig35', name: 'MiG-35 Fulcrum-F', type: 'Caza Polivalente', tier: 3, special_name: 'Afterburner Boost', passive_name: 'Optical Laser Rangefinder' }
  ],
  planeMods: [
    { id: 'radar_aesa', name: 'Radar AESA Digital de Alta Potencia', type: 'Aviónica' },
    { id: 'vector_thrust', name: 'Toberas de Empuje Vectorial 3D', type: 'Propulsión' },
    { id: 'titanium_armor', name: 'Blindaje Compuesto de Titanio', type: 'Defensa' },
    { id: 'ecm_jammer', name: 'Módulo de Guerra Electrónica ECM', type: 'Guerra Electrónica' },
    { id: 'bvr_guidance', name: 'Sistema de Puntería Más Allá del Alcance Visual (BVR)', type: 'Armamento' },
    { id: 'cooling_system', name: 'Sistema de Refrigeración Criogénico para Armas', type: 'Soporte' }
  ],
  userPlanes: [
    {
      id: 1,
      user_id: 1,
      avion_id: 'f22',
      name: 'F-22 Raptor',
      type: 'Caza de 5ª Generación',
      nivel: 20,
      especial_nombre: 'Vector Thrust Overdrive',
      pasiva_nombre: 'Radar Stealth Cloak',
      mod1_id: 'radar_aesa',
      mod1_lvl: 5,
      mod2_id: 'vector_thrust',
      mod2_lvl: 5,
      mod1_nombre: 'Radar AESA Digital de Alta Potencia',
      mod2_nombre: 'Toberas de Empuje Vectorial 3D',
      created_at: '2025-01-15T00:00:00Z'
    },
    {
      id: 2,
      user_id: 1,
      avion_id: 'su57',
      name: 'Su-57 Felon',
      type: 'Caza de Superioridad Aérea',
      nivel: 18,
      especial_nombre: 'Plasma Shield Generator',
      pasiva_nombre: 'Infrared Jammer',
      mod1_id: 'titanium_armor',
      mod1_lvl: 4,
      mod2_id: null,
      mod2_lvl: null,
      mod1_nombre: 'Blindaje Compuesto de Titanio',
      mod2_nombre: null,
      created_at: '2025-02-01T00:00:00Z'
    }
  ],
  normativas: [
    {
      id: 1,
      titulo: 'Reglamento Disciplinario y Operativo de Vuelo en Escuadrón',
      codigo: 'NOR-2026-001',
      tipo_documento: 'REGLAMENTO',
      categoria: 'OPERACIONES',
      ambito_aplicacion: 'ESCUADRON_GENERAL',
      fecha_aprobacion: '2026-01-01',
      fecha_entrada_vigor: '2026-01-05',
      resumen: 'Establece la obligatoriedad del vuelo en escuadrilla, protocolo de comunicaciones y umbrales de puntuación semanal.',
      nivel_confidencialidad: 'PUBLICO',
      file_name: 'NOR-2026-001-Reglamento-Operativo.pdf'
    },
    {
      id: 2,
      titulo: 'Criterios de Evaluación Táctica y Requisitos de Ascenso a Oficialidad',
      codigo: 'NOR-2026-002',
      tipo_documento: 'DIRECTIVA',
      categoria: 'PERSONAL',
      ambito_aplicacion: 'OFICIALES',
      fecha_aprobacion: '2026-01-15',
      fecha_entrada_vigor: '2026-01-20',
      resumen: 'Define los requerimientos de promedio de tokens acumulados durante 8 semanas consecutivas.',
      nivel_confidencialidad: 'RESTRINGIDO',
      file_name: 'NOR-2026-002-Directiva-Ascensos.pdf'
    }
  ],
  auditLogs: [
    { id: 1, created_at: new Date(Date.now() - 3600000).toISOString(), nick: 'PRY_Comandante', role: 'OWNER', action: 'LOGIN', entity: 'AUTH', entity_id: '1', details: JSON.stringify({ method: 'PASSWORD' }), result: 'SUCCESS', ip: '127.0.0.1' }
  ],
  errorLogs: [],
  backups: [
    { name: 'backup-auto-2026-02-28-cron.json', created_at: '2026-02-28T04:00:00Z', size_bytes: 42150 }
  ],
  onlineUsers: new Set([1, 2])
};

export const getSupabase = () => supabaseClient;
