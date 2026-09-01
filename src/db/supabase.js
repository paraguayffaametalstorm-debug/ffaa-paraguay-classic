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

// Default seed records (Real squadron leadership only, test pilots removed)
export const memoryStore = {
  users: [],
  userSettings: {},
  events: [
    { id: 'SQUADRON-2026-08', type: 'SQUADRON', start_date: '2026-02-23', end_date: '2026-03-01', is_open: true, status: 'OPEN' },
    { id: 'BM-2026-07', type: 'BLACK_MARKET', start_date: '2026-02-16', end_date: '2026-02-22', is_open: false, status: 'CLOSED' },
    { id: 'SQUADRON-2026-06', type: 'SQUADRON', start_date: '2026-02-09', end_date: '2026-02-15', is_open: false, status: 'CLOSED' },
    { id: 'SQUADRON-2026-05', type: 'SQUADRON', start_date: '2026-02-02', end_date: '2026-02-08', is_open: false, status: 'CLOSED' }
  ],
  performances: [],
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
  userPlanes: [],
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
