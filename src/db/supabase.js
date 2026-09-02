import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import bcrypt from 'bcryptjs';
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

// Default seed records for Squadron FFAA Paraguay
export const memoryStore = {
  users: [
    {
      id: 1,
      user_id: 1,
      email: 'comandante@ffaa.mil.py',
      nick: '[PRY] GUARANI',
      role: 'OWNER',
      status: 'ACTIVE',
      squad_status: 'ACTIVE',
      perf_status: 'VERDE',
      avg_tokens: 198,
      weeks_evaluated: 12,
      password_hash: DEFAULT_PASSWORD_HASH,
      must_change_password: false,
      token_version: 1,
      callsign: 'Guaraní-Líder',
      bio: 'Comandante en Jefe del Escuadrón Paraguay FFAA',
      phone: '+595 981 123456',
      discord: 'Guarani#1811',
      full_name: 'Comandante Juan Carlos Guaraní',
      email_personal: 'carlos.guarani@gmail.com',
      notifications_enabled: true,
      last_activity: new Date().toISOString()
    },
    {
      id: 2,
      user_id: 2,
      email: 'operaciones@ffaa.mil.py',
      nick: '[PRY] HALCON',
      role: 'ADMIN',
      status: 'ACTIVE',
      squad_status: 'ACTIVE',
      perf_status: 'VERDE',
      avg_tokens: 192,
      weeks_evaluated: 12,
      password_hash: DEFAULT_PASSWORD_HASH,
      must_change_password: false,
      token_version: 1,
      callsign: 'Halcón-1',
      bio: 'Oficial de Operaciones Tácticas y Logística',
      phone: '+595 982 654321',
      discord: 'Halcon#2026',
      full_name: 'Mayor Rodrigo Benítez',
      email_personal: 'rodrigo.halcon@gmail.com',
      notifications_enabled: true,
      last_activity: new Date().toISOString()
    },
    {
      id: 3,
      user_id: 3,
      email: 'veterano@ffaa.mil.py',
      nick: '[PRY] JAGUARTE',
      role: 'VETERANO',
      status: 'ACTIVE',
      squad_status: 'ACTIVE',
      perf_status: 'VERDE',
      avg_tokens: 184,
      weeks_evaluated: 12,
      password_hash: DEFAULT_PASSWORD_HASH,
      must_change_password: false,
      token_version: 1,
      callsign: 'Jaguareté-3',
      bio: 'Piloto veterano de combate e intercepción aérea',
      phone: '+595 983 777888',
      discord: 'Jagua#3333',
      full_name: 'Capitán Diego Peralta',
      email_personal: 'diego.jagua@gmail.com',
      notifications_enabled: true,
      last_activity: new Date().toISOString()
    },
    {
      id: 4,
      user_id: 4,
      email: 'piloto@ffaa.mil.py',
      nick: '[PRY] TAGUATO',
      role: 'MIEMBRO',
      status: 'ACTIVE',
      squad_status: 'ACTIVE',
      perf_status: 'VERDE',
      avg_tokens: 178,
      weeks_evaluated: 10,
      password_hash: DEFAULT_PASSWORD_HASH,
      must_change_password: false,
      token_version: 1,
      callsign: 'Taguató-7',
      bio: 'Piloto de primera línea del escuadrón',
      phone: '+595 984 555666',
      discord: 'Taguato#4444',
      full_name: 'Teniente Marcos Fleitas',
      email_personal: 'marcos.taguato@gmail.com',
      notifications_enabled: true,
      last_activity: new Date().toISOString()
    },
    {
      id: 5,
      user_id: 5,
      email: 'admin@ffaa.py',
      nick: '[PRY] CENTINELA',
      role: 'ADMIN',
      status: 'ACTIVE',
      squad_status: 'ACTIVE',
      perf_status: 'VERDE',
      avg_tokens: 188,
      weeks_evaluated: 11,
      password_hash: DEFAULT_PASSWORD_HASH,
      must_change_password: false,
      token_version: 1,
      callsign: 'Centinela-Alpha',
      bio: 'Administración táctica y control de accesos',
      phone: '+595 985 112233',
      discord: 'Centinela#5555',
      full_name: 'Teniente Primero Esteban Rojas',
      email_personal: 'esteban.rojas@gmail.com',
      notifications_enabled: true,
      last_activity: new Date().toISOString()
    }
  ],
  userSettings: {
    1: { theme: 'militar', language: 'es', notif_email: true, notif_whatsapp: true, notif_status: true, notif_reminder: true, notif_announcements: true },
    2: { theme: 'militar', language: 'es', notif_email: true, notif_whatsapp: false, notif_status: true, notif_reminder: true, notif_announcements: true },
    3: { theme: 'militar', language: 'es', notif_email: false, notif_whatsapp: false, notif_status: true, notif_reminder: true, notif_announcements: true },
    4: { theme: 'militar', language: 'es', notif_email: false, notif_whatsapp: false, notif_status: true, notif_reminder: true, notif_announcements: true }
  },
  events: [
    { id: 'SQUADRON-2026-08', type: 'SQUADRON', start_date: '2026-02-23', end_date: '2026-03-01', is_open: true, status: 'OPEN' },
    { id: 'BM-2026-07', type: 'BLACK_MARKET', start_date: '2026-02-16', end_date: '2026-02-22', is_open: false, status: 'CLOSED' },
    { id: 'SQUADRON-2026-06', type: 'SQUADRON', start_date: '2026-02-09', end_date: '2026-02-15', is_open: false, status: 'CLOSED' },
    { id: 'SQUADRON-2026-05', type: 'SQUADRON', start_date: '2026-02-02', end_date: '2026-02-08', is_open: false, status: 'CLOSED' }
  ],
  performances: [
    { id: 1, user_id: 1, event_id: 'SQUADRON-2026-08', tokens: 200, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Misión completa en escuadrilla alfa', created_at: '2026-02-24T18:00:00Z' },
    { id: 2, user_id: 2, event_id: 'SQUADRON-2026-08', tokens: 195, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Vuelo de intercepción nocturna', created_at: '2026-02-24T19:15:00Z' },
    { id: 3, user_id: 3, event_id: 'SQUADRON-2026-08', tokens: 185, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Patrulla aérea de combate', created_at: '2026-02-25T14:30:00Z' },
    { id: 4, user_id: 4, event_id: 'SQUADRON-2026-08', tokens: 180, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Formación y apoyo táctico', created_at: '2026-02-25T16:45:00Z' },
    { id: 5, user_id: 1, event_id: 'BM-2026-07', tokens: 245, days_connected: 5, flew_in_group: true, status: 'VERDE', notes: 'Black Market completado al 98%', created_at: '2026-02-18T20:00:00Z' },
    { id: 6, user_id: 2, event_id: 'BM-2026-07', tokens: 230, days_connected: 5, flew_in_group: true, status: 'VERDE', notes: 'Operaciones BM', created_at: '2026-02-18T21:30:00Z' },
    { id: 7, user_id: 3, event_id: 'BM-2026-07', tokens: 220, days_connected: 5, flew_in_group: true, status: 'VERDE', notes: 'BM con escuadrilla de caza', created_at: '2026-02-19T10:00:00Z' },
    { id: 8, user_id: 4, event_id: 'BM-2026-07', tokens: 210, days_connected: 5, flew_in_group: true, status: 'VERDE', notes: 'BM completado', created_at: '2026-02-19T11:20:00Z' },
    { id: 9, user_id: 1, event_id: 'SQUADRON-2026-06', tokens: 195, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Operación Cóndor', created_at: '2026-02-11T18:00:00Z' },
    { id: 10, user_id: 2, event_id: 'SQUADRON-2026-06', tokens: 188, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Escolta táctica', created_at: '2026-02-11T19:00:00Z' },
    { id: 11, user_id: 3, event_id: 'SQUADRON-2026-06', tokens: 180, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Defensa de base aérea', created_at: '2026-02-12T15:00:00Z' },
    { id: 12, user_id: 4, event_id: 'SQUADRON-2026-06', tokens: 175, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Patrulla de reconocimiento', created_at: '2026-02-12T16:00:00Z' },
    { id: 13, user_id: 1, event_id: 'SQUADRON-2026-05', tokens: 190, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Inicio de campaña de febrero', created_at: '2026-02-04T18:00:00Z' },
    { id: 14, user_id: 2, event_id: 'SQUADRON-2026-05', tokens: 185, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Vuelo de escuadrón', created_at: '2026-02-04T19:00:00Z' },
    { id: 15, user_id: 3, event_id: 'SQUADRON-2026-05', tokens: 178, days_connected: 4, flew_in_group: true, status: 'VERDE', notes: 'Entrenamiento táctico', created_at: '2026-02-05T14:00:00Z' },
    { id: 16, user_id: 4, event_id: 'SQUADRON-2026-05', tokens: 170, days_connected: 4, flew_in_group: true, status: 'NARANJA', notes: 'Rendimiento en advertencia', created_at: '2026-02-05T15:00:00Z' }
  ],
  planeModels: [
    { id: '101', name: 'F-4 Phantom II', type: 'Caza de Intercepción', tier: 1, special_name: 'Cortina de Fuego', passive_name: 'Empuje Forzado' },
    { id: '102', name: 'MiG-21 Fishbed', type: 'Caza Ligero Táctico', tier: 1, special_name: 'Cohete Acelerador', passive_name: 'Giro Cerrado' },
    { id: '104', name: 'A-10 Thunderbolt II', type: 'Caza de Ataque a Tierra', tier: 1, special_name: 'Refrigeración de Armas', passive_name: 'Blindaje de Titanio' },
    { id: '201', name: 'F-16 Fighting Falcon', type: 'Caza Polivalente', tier: 2, special_name: 'Refrigeración de Armas', passive_name: 'Maniobra Evasiva' },
    { id: '204', name: 'F/A-18 Hornet', type: 'Caza Embarcado Multirrol', tier: 2, special_name: 'Reabastecimiento Rápido', passive_name: 'Puntería Asistida' },
    { id: '205', name: 'MiG-29 Fulcrum', type: 'Caza de Superioridad Aérea', tier: 2, special_name: 'Combustión Acelerada', passive_name: 'Firma Térmica Reducida' },
    { id: '207', name: 'F-14 Tomcat', type: 'Caza de Intercepción Pesado', tier: 2, special_name: 'Alas de Geometría Variable', passive_name: 'Radar de Largo Alcance' },
    { id: '208', name: 'Mirage 2000', type: 'Caza Polivalente', tier: 2, special_name: 'Reflector Antirradar', passive_name: 'Ala Delta Estable' },
    { id: '501', name: 'F-22 Raptor', type: 'Caza de 5ª Generación', tier: 5, special_name: 'Zona de Interferencias', passive_name: 'Sigilo Radar Avanzado' },
    { id: '502', name: 'Su-57 Felon', type: 'Caza de 5ª Generación', tier: 5, special_name: 'Refrigeración de Armas', passive_name: 'Toberas Vectoriales 3D' },
    { id: 'f22', name: 'F-22 Raptor', type: 'Caza de 5ª Generación', tier: 5, special_name: 'Zona de Interferencias', passive_name: 'Sigilo Radar Avanzado' },
    { id: 'su57', name: 'Su-57 Felon', type: 'Caza de Superioridad Aérea', tier: 5, special_name: 'Refrigeración de Armas', passive_name: 'Toberas Vectoriales 3D' },
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
      avion_id: '501',
      model_name: 'F-22 Raptor',
      name: 'F-22 Raptor',
      type: 'Caza de 5ª Generación',
      nivel: 20,
      especial_nombre: 'Zona de Interferencias',
      pasiva_nombre: 'Sigilo Radar Avanzado',
      mod1_id: 'radar_aesa',
      mod1_nombre: 'Radar AESA Digital de Alta Potencia',
      mod1_lvl: 5,
      mod2_id: 'vector_thrust',
      mod2_nombre: 'Toberas de Empuje Vectorial 3D',
      mod2_lvl: 5,
      nivel_fuselaje: 8,
      nivel_motor: 8,
      nivel_avionica: 8,
      nivel_armas: 8,
      recursos_piezas: 12500,
      recursos_avanzadas: 850,
      sistemas: {
        fuselaje: { nivel: 8, piezas: 3500, avanzadas: 350 },
        motor: { nivel: 8, piezas: 3500, avanzadas: 350 },
        avionica: { nivel: 8, piezas: 3500, avanzadas: 350 },
        armas: { nivel: 8, piezas: 3500, avanzadas: 350 }
      },
      created_at: '2026-01-10T10:00:00Z',
      updated_at: '2026-02-20T12:00:00Z'
    },
    {
      id: 2,
      user_id: 1,
      avion_id: '502',
      model_name: 'Su-57 Felon',
      name: 'Su-57 Felon',
      type: 'Caza de 5ª Generación',
      nivel: 18,
      especial_nombre: 'Refrigeración de Armas',
      pasiva_nombre: 'Toberas Vectoriales 3D',
      mod1_id: 'ecm_jammer',
      mod1_nombre: 'Módulo de Guerra Electrónica ECM',
      mod1_lvl: 4,
      mod2_id: null,
      mod2_nombre: null,
      mod2_lvl: null,
      nivel_fuselaje: 6,
      nivel_motor: 7,
      nivel_avionica: 6,
      nivel_armas: 7,
      recursos_piezas: 6400,
      recursos_avanzadas: 320,
      sistemas: {
        fuselaje: { nivel: 6, piezas: 1800, avanzadas: 100 },
        motor: { nivel: 7, piezas: 2500, avanzadas: 200 },
        avionica: { nivel: 6, piezas: 1800, avanzadas: 100 },
        armas: { nivel: 7, piezas: 2500, avanzadas: 200 }
      },
      created_at: '2026-01-15T11:00:00Z',
      updated_at: '2026-02-22T14:00:00Z'
    },
    {
      id: 3,
      user_id: 2,
      avion_id: '207',
      model_name: 'F-14 Tomcat',
      name: 'F-14 Tomcat',
      type: 'Caza de Intercepción Pesado',
      nivel: 16,
      especial_nombre: 'Alas de Geometría Variable',
      pasiva_nombre: 'Radar de Largo Alcance',
      mod1_id: 'bvr_guidance',
      mod1_nombre: 'Sistema de Puntería Más Allá del Alcance Visual (BVR)',
      mod1_lvl: 3,
      mod2_id: null,
      mod2_nombre: null,
      mod2_lvl: null,
      nivel_fuselaje: 5,
      nivel_motor: 5,
      nivel_avionica: 6,
      nivel_armas: 5,
      recursos_piezas: 4200,
      recursos_avanzadas: 180,
      sistemas: {
        fuselaje: { nivel: 5, piezas: 1200, avanzadas: 50 },
        motor: { nivel: 5, piezas: 1200, avanzadas: 50 },
        avionica: { nivel: 6, piezas: 1800, avanzadas: 100 },
        armas: { nivel: 5, piezas: 1200, avanzadas: 50 }
      },
      created_at: '2026-01-20T09:00:00Z',
      updated_at: '2026-02-18T10:00:00Z'
    },
    {
      id: 4,
      user_id: 4,
      avion_id: '201',
      model_name: 'F-16 Fighting Falcon',
      name: 'F-16 Fighting Falcon',
      type: 'Caza Polivalente',
      nivel: 12,
      especial_nombre: 'Refrigeración de Armas',
      pasiva_nombre: 'Maniobra Evasiva',
      mod1_id: null,
      mod1_nombre: null,
      mod1_lvl: null,
      mod2_id: null,
      mod2_nombre: null,
      mod2_lvl: null,
      nivel_fuselaje: 4,
      nivel_motor: 4,
      nivel_avionica: 3,
      nivel_armas: 4,
      recursos_piezas: 2800,
      recursos_avanzadas: 90,
      sistemas: {
        fuselaje: { nivel: 4, piezas: 800, avanzadas: 25 },
        motor: { nivel: 4, piezas: 800, avanzadas: 25 },
        avionica: { nivel: 3, piezas: 500, avanzadas: 10 },
        armas: { nivel: 4, piezas: 800, avanzadas: 25 }
      },
      created_at: '2026-02-01T15:00:00Z',
      updated_at: '2026-02-23T11:00:00Z'
    }
  ],
  planeUpgrades: [],
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
  auditLogs: [],
  errorLogs: [],
  backups: [
    { name: 'backup-auto-2026-02-28-cron.json', created_at: '2026-02-28T04:00:00Z', size_bytes: 42150 }
  ],
  onlineUsers: new Set()
};

export const getSupabase = () => supabaseClient;
