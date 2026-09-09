/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - CONTROLADOR DE MODELOS DE AERONAVES (CATÁLOGO)
 * Módulo C4ISR para gestión administrativa de aeronaves (ADMIN / OWNER) v3.6.0
 * Soporte completo CRUD: Crear, Leer, Actualizar y Desactivar (Soft-Delete)
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';
import { PlaneModelSchema, UpdatePlaneModelSchema } from '../utils/schemas.js';
import { logAuditChange } from '../utils/audit.js';

// Catálogo base predeterminado de 23 modelos tácticos oficiales
export const INITIAL_PLANE_MODELS = [
  {
    id: '1',
    name: 'F-22 Raptor',
    type: 'Caza de Superioridad Aérea',
    tier: 5,
    special_name: 'Vector Thrust BVR',
    special_levels: { '1': 'Maniobrabilidad +10%', '2': 'Maniobrabilidad +20%', '3': 'Maniobrabilidad +30%' },
    passive_name: 'Sigilo Avanzado RAM',
    passive_levels: { '1': 'Detección radar -15%', '2': 'Detección radar -30%' },
    stats_real: { velocidad: 2410, agilidad: 96, blindaje: 1400, potencia_armas: 1450 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_bvr', 'misiles_corto'] },
    is_active: true
  },
  {
    id: '2',
    name: 'Su-57 Felon',
    type: 'Caza Polivalente Sigiloso',
    tier: 5,
    special_name: 'Giro Cobra Pugachev',
    special_levels: { '1': 'Radio de giro +12%', '2': 'Radio de giro +24%', '3': 'Radio de giro +35%' },
    passive_name: 'Radar Sh-121 AESA 360',
    passive_levels: { '1': 'Rango de bloqueo +15%', '2': 'Rango de bloqueo +28%' },
    stats_real: { velocidad: 2500, agilidad: 98, blindaje: 1450, potencia_armas: 1400 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_bvr', 'misiles_guiados'] },
    is_active: true
  },
  {
    id: '3',
    name: 'F-35 Lightning II',
    type: 'Caza Polivalente de Ataque',
    tier: 5,
    special_name: 'Enlace Táctico MADL',
    special_levels: { '1': 'Precisión de armas +10%', '2': 'Precisión de armas +20%', '3': 'Precisión de armas +30%' },
    passive_name: 'Aviónica Integrada DAS',
    passive_levels: { '1': 'Alerta temprana +20%', '2': 'Alerta temprana +40%' },
    stats_real: { velocidad: 1960, agilidad: 88, blindaje: 1350, potencia_armas: 1500 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'bombas_precision', 'misiles_bvr'] },
    is_active: true
  },
  {
    id: '4',
    name: 'Eurofighter Typhoon',
    type: 'Caza Polivalente',
    tier: 4,
    special_name: 'Supercrucero Mach 1.5',
    special_levels: { '1': 'Velocidad crucero +15%', '2': 'Velocidad crucero +30%' },
    passive_name: 'Canards Dinámicos',
    passive_levels: { '1': 'Agilidad en trepada +10%', '2': 'Agilidad en trepada +20%' },
    stats_real: { velocidad: 2495, agilidad: 94, blindaje: 1300, potencia_armas: 1380 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_meteor', 'misiles_corto'] },
    is_active: true
  },
  {
    id: '5',
    name: 'Dassault Rafale',
    type: 'Caza Omnirrol',
    tier: 4,
    special_name: 'Guerra Electrónica SPECTRA',
    special_levels: { '1': 'Interferencia misiles +15%', '2': 'Interferencia misiles +30%' },
    passive_name: 'Carga Externa MICA',
    passive_levels: { '1': 'Recarga de misiles +12%', '2': 'Recarga de misiles +25%' },
    stats_real: { velocidad: 2223, agilidad: 95, blindaje: 1320, potencia_armas: 1360 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_mica', 'bombas_aasm'] },
    is_active: true
  },
  {
    id: '6',
    name: 'J-20 Mighty Dragon',
    type: 'Caza de Superioridad Aérea',
    tier: 5,
    special_name: 'Salva BVR PL-15',
    special_levels: { '1': 'Daño de misiles +15%', '2': 'Daño de misiles +30%' },
    passive_name: 'Fuselaje Canard Sigilo',
    passive_levels: { '1': 'Firma frontal -20%', '2': 'Firma frontal -35%' },
    stats_real: { velocidad: 2468, agilidad: 91, blindaje: 1420, potencia_armas: 1480 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_pl15', 'misiles_pl10'] },
    is_active: true
  },
  {
    id: '7',
    name: 'Su-35 Flanker-E',
    type: 'Caza de Superioridad Aérea',
    tier: 4,
    special_name: 'Super-Maniobrabilidad 3D',
    special_levels: { '1': 'Tasa de giro +15%', '2': 'Tasa de giro +30%' },
    passive_name: 'Radar Irbis-E PESA',
    passive_levels: { '1': 'Detección a distancia +20%', '2': 'Detección a distancia +35%' },
    stats_real: { velocidad: 2400, agilidad: 97, blindaje: 1480, potencia_armas: 1420 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_r77', 'misiles_r73'] },
    is_active: true
  },
  {
    id: '8',
    name: 'F-15EX Eagle II',
    type: 'Caza Pesado de Ataque',
    tier: 4,
    special_name: 'Arsenal Pesado de Misiles',
    special_levels: { '1': 'Capacidad de munición +25%', '2': 'Capacidad de munición +50%' },
    passive_name: 'Suite EPAWSS',
    passive_levels: { '1': 'Protección chaff/flares +20%', '2': 'Protección chaff/flares +40%' },
    stats_real: { velocidad: 2665, agilidad: 89, blindaje: 1550, potencia_armas: 1550 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon_20mm', 'misiles_aim120', 'misiles_aim9x'] },
    is_active: true
  },
  {
    id: '9',
    name: 'F/A-18E Super Hornet',
    type: 'Caza Embarcado Multirrol',
    tier: 3,
    special_name: 'Ataque Naval Quirúrgico',
    special_levels: { '1': 'Daño a blindaje +10%', '2': 'Daño a blindaje +22%' },
    passive_name: 'Tren Reforzado Carrier',
    passive_levels: { '1': 'Estabilidad de aterrizaje +25%' },
    stats_real: { velocidad: 1915, agilidad: 88, blindaje: 1380, potencia_armas: 1300 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_harpoon', 'misiles_sidewinder'] },
    is_active: true
  },
  {
    id: '10',
    name: 'MiG-35 Fulcrum-F',
    type: 'Caza Polivalente Ligero',
    tier: 3,
    special_name: 'Aceleración Postcombustión',
    special_levels: { '1': 'Velocidad de escape +15%', '2': 'Velocidad de escape +30%' },
    passive_name: 'Óptica OLS-UEM',
    passive_levels: { '1': 'Fijación pasiva infrarroja +18%' },
    stats_real: { velocidad: 2400, agilidad: 93, blindaje: 1250, potencia_armas: 1280 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_r73', 'cohetes'] },
    is_active: true
  },
  {
    id: '11',
    name: 'JAS 39 Gripen',
    type: 'Caza Ligero Polivalente',
    tier: 3,
    special_name: 'Despliegue Rápido STOL',
    special_levels: { '1': 'Tiempo de rearmado -20%', '2': 'Tiempo de rearmado -40%' },
    passive_name: 'Guerra Electrónica Arexis',
    passive_levels: { '1': 'Evasión de misiles +15%' },
    stats_real: { velocidad: 2200, agilidad: 94, blindaje: 1200, potencia_armas: 1250 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_meteor', 'misiles_iris_t'] },
    is_active: true
  },
  {
    id: '12',
    name: 'A-10C Thunderbolt II',
    type: 'Avión de Ataque a Tierra (CAS)',
    tier: 3,
    special_name: 'Barrido GAU-8 Avenger',
    special_levels: { '1': 'Daño de cañón +30%', '2': 'Daño de cañón +60%' },
    passive_name: 'Bañera de Titanio Reforzada',
    passive_levels: { '1': 'Blindaje estructural +25%', '2': 'Blindaje estructural +50%' },
    stats_real: { velocidad: 706, agilidad: 70, blindaje: 2200, potencia_armas: 1600 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon_gau8', 'misiles_maverick', 'bombas'] },
    is_active: true
  },
  {
    id: '13',
    name: 'F-16C Fighting Falcon',
    type: 'Caza Polivalente Ligero',
    tier: 3,
    special_name: 'Maniobra 9G Viper',
    special_levels: { '1': 'Resistencia a Gs +15%', '2': 'Resistencia a Gs +30%' },
    passive_name: 'Fly-by-Wire Digital',
    passive_levels: { '1': 'Respuesta al mando +12%' },
    stats_real: { velocidad: 2120, agilidad: 95, blindaje: 1240, potencia_armas: 1290 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_aim120', 'misiles_aim9'] },
    is_active: true
  },
  {
    id: '14',
    name: 'F-14D Super Tomcat',
    type: 'Interceptor Naval Pesado',
    tier: 3,
    special_name: 'Salva Phoenix AIM-54',
    special_levels: { '1': 'Rango máximo de ataque +25%', '2': 'Rango máximo de ataque +45%' },
    passive_name: 'Geometría Variable',
    passive_levels: { '1': 'Eficiencia a alta velocidad +15%' },
    stats_real: { velocidad: 2485, agilidad: 86, blindaje: 1460, potencia_armas: 1520 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_phoenix', 'misiles_sparrow'] },
    is_active: true
  },
  {
    id: '15',
    name: 'Mirage 2000-5',
    type: 'Caza Ala Delta Multirrol',
    tier: 3,
    special_name: 'Inflexión Ala Delta',
    special_levels: { '1': 'Aceleración instantánea +15%', '2': 'Aceleración instantánea +30%' },
    passive_name: 'Radar RDY Multiobjetivo',
    passive_levels: { '1': 'Fijación simultánea de blancos +1' },
    stats_real: { velocidad: 2338, agilidad: 93, blindaje: 1220, potencia_armas: 1260 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_magic', 'misiles_mica'] },
    is_active: true
  },
  {
    id: '16',
    name: 'MiG-29K Fulcrum-D',
    type: 'Caza Embarcado Naval',
    tier: 3,
    special_name: 'Lanzamiento Ski-Jump',
    special_levels: { '1': 'Trepada inicial +20%' },
    passive_name: 'Alas Plegables Reforzadas',
    passive_levels: { '1': 'Blindaje naval +10%' },
    stats_real: { velocidad: 2200, agilidad: 92, blindaje: 1320, potencia_armas: 1310 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_r77', 'misiles_kh35'] },
    is_active: true
  },
  {
    id: '17',
    name: 'Su-30SM Flanker-H',
    type: 'Caza Pesado Biplaza Multirrol',
    tier: 4,
    special_name: 'Copiloto WSO Táctico',
    special_levels: { '1': 'Velocidad de apuntado +20%', '2': 'Velocidad de apuntado +40%' },
    passive_name: 'Canards & Toberas 2D',
    passive_levels: { '1': 'Estabilidad aerodinámica +15%' },
    stats_real: { velocidad: 2120, agilidad: 94, blindaje: 1520, potencia_armas: 1450 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_r77', 'bombas_kab'] },
    is_active: true
  },
  {
    id: '18',
    name: 'AV-8B Harrier II',
    type: 'Caza de Despegue Vertical (V/STOL)',
    tier: 2,
    special_name: 'Viffing Vectoring in Forward Flight',
    special_levels: { '1': 'Frenado aerodinámico instantáneo +25%' },
    passive_name: 'Toberas Orientables Rolls-Royce',
    passive_levels: { '1': 'Evasión a baja cota +15%' },
    stats_real: { velocidad: 1083, agilidad: 82, blindaje: 1260, potencia_armas: 1200 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_sidearm', 'bombas_laser'] },
    is_active: true
  },
  {
    id: '19',
    name: 'Panavia Tornado IDS',
    type: 'Interdictor de Ataque a Baja Cota',
    tier: 2,
    special_name: 'Vuelo Rasante TFR Radar',
    special_levels: { '1': 'Inmunidad a radar de baja cota +30%' },
    passive_name: 'Inversores de Empuje',
    passive_levels: { '1': 'Frenado en pista -35%' },
    stats_real: { velocidad: 2400, agilidad: 80, blindaje: 1600, potencia_armas: 1480 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon_mauser', 'misiles_alarm', 'bombas_mw1'] },
    is_active: true
  },
  {
    id: '20',
    name: 'Saab J35 Draken',
    type: 'Interceptor Doble Delta Clásico',
    tier: 1,
    special_name: 'Maniobra Kort Parad',
    special_levels: { '1': 'Desaceleración táctica +20%' },
    passive_name: 'Ala Doble Delta',
    passive_levels: { '1': 'Estabilidad supersónica +12%' },
    stats_real: { velocidad: 2124, agilidad: 84, blindaje: 1100, potencia_armas: 1150 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_falcon', 'cohetes'] },
    is_active: true
  },
  {
    id: '21',
    name: 'F-4E Phantom II',
    type: 'Caza Pesado Interceptor Clásico',
    tier: 2,
    special_name: 'Potencia Bruta Doble J79',
    special_levels: { '1': 'Empuje sostenido +18%' },
    passive_name: 'Cañón Interno M61A1',
    passive_levels: { '1': 'Cadencia de fuego +15%' },
    stats_real: { velocidad: 2370, agilidad: 78, blindaje: 1500, potencia_armas: 1350 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon_vulcan', 'misiles_sparrow', 'misiles_sidewinder'] },
    is_active: true
  },
  {
    id: '22',
    name: 'F-5E Tiger II',
    type: 'Caza Ligero Táctico',
    tier: 1,
    special_name: 'Giro Cerrado Dogfight',
    special_levels: { '1': 'Agilidad en combate cerrado +15%' },
    passive_name: 'Mantenimiento Simplificado',
    passive_levels: { '1': 'Coste de reparaciones -20%' },
    stats_real: { velocidad: 1700, agilidad: 90, blindaje: 1050, potencia_armas: 1100 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon_pontiac', 'misiles_sidewinder', 'cohetes'] },
    is_active: true
  },
  {
    id: '23',
    name: 'Chengdu J-10C Vigorous Dragon',
    type: 'Caza Polivalente Ligero Canard',
    tier: 4,
    special_name: 'DSI Entrada Diverterless',
    special_levels: { '1': 'Respuesta de motor +15%', '2': 'Respuesta de motor +28%' },
    passive_name: 'Radar AESA Activo PL-15',
    passive_levels: { '1': 'Precisión BVR +20%' },
    stats_real: { velocidad: 2200, agilidad: 93, blindaje: 1280, potencia_armas: 1340 },
    sistemas_disponibles: { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles_pl15', 'misiles_pl10'] },
    is_active: true
  }
];

// Almacén mutable en memoria para persistencia ante desconexión o fallo de Supabase
let inMemoryPlaneModels = [...INITIAL_PLANE_MODELS];

/**
 * Función auxiliar para sanitizar/parsear objetos JSON que puedan venir como strings
 */
function parseJsonField(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Normaliza un registro de modelo de aeronave
 */
function normalizeModel(item) {
  if (!item) return null;
  return {
    id: String(item.id),
    name: item.name,
    type: item.type || 'Caza de Combate',
    tier: item.tier !== undefined && item.tier !== null ? Number(item.tier) : 3,
    special_name: item.special_name || null,
    special_levels: parseJsonField(item.special_levels, null),
    passive_name: item.passive_name || null,
    passive_levels: parseJsonField(item.passive_levels, null),
    stats_real: parseJsonField(item.stats_real, { velocidad: 2000, agilidad: 85, blindaje: 1200, potencia_armas: 1200 }),
    sistemas_disponibles: parseJsonField(item.sistemas_disponibles, { fuselaje: true, motor: true, avionica: true, armas: ['canon', 'misiles'] }),
    is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString()
  };
}

/**
 * ============================================================
 * 1. LISTAR MODELOS DE AERONAVES
 * GET /api/plane-models
 * Admite filtro ?include_inactive=true para paneles ADMIN/OWNER
 * ============================================================
 */
export async function getPlaneModels(req, res) {
  try {
    const includeInactive = req.query.include_inactive === 'true' || 
      (req.user && (req.user.role === 'ADMIN' || req.user.role === 'OWNER') && req.query.all === 'true');

    const supabase = getSupabase();
    if (supabase) {
      try {
        let query = supabase.from('plane_models').select('*').order('name');
        if (!includeInactive) {
          query = query.neq('is_active', false);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const models = data.map(normalizeModel);
          return res.json({
            success: true,
            message: 'Catálogo de modelos recuperado desde base de datos',
            models,
            data: models,
            total: models.length
          });
        }
      } catch (dbErr) {
        console.warn('⚠️ [PlaneModels] Fallback a memoria por error en Supabase:', dbErr.message);
      }
    }

    // Fallback a almacén en memoria
    let models = inMemoryPlaneModels.map(normalizeModel);
    if (!includeInactive) {
      models = models.filter(m => m.is_active !== false);
    }
    models.sort((a, b) => a.name.localeCompare(b.name));

    return res.json({
      success: true,
      message: 'Catálogo de modelos recuperado (memoria operativa)',
      models,
      data: models,
      total: models.length
    });
  } catch (error) {
    console.error('❌ [PlaneModels] Error en getPlaneModels:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al consultar catálogo de aeronaves',
      details: error.message
    });
  }
}

/**
 * ============================================================
 * 2. OBTENER MODELO ESPECÍFICO POR ID
 * GET /api/plane-models/:id
 * ============================================================
 */
export async function getPlaneModelById(req, res) {
  try {
    const { id } = req.params;
    const targetId = String(id).trim();

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('plane_models')
          .select('*')
          .eq('id', targetId)
          .maybeSingle();

        if (!error && data) {
          const model = normalizeModel(data);
          return res.json({
            success: true,
            message: 'Modelo de aeronave encontrado',
            model,
            data: model
          });
        }
      } catch (dbErr) {
        console.warn('⚠️ [PlaneModels] Consulta unitaria en memoria por error DB:', dbErr.message);
      }
    }

    const model = inMemoryPlaneModels.find(m => String(m.id) === targetId);
    if (!model) {
      return res.status(404).json({
        success: false,
        error: `No se encontró el modelo de aeronave con ID ${targetId}`,
        code: 'PLANE_MODEL_NOT_FOUND'
      });
    }

    const normalized = normalizeModel(model);
    return res.json({
      success: true,
      message: 'Modelo de aeronave recuperado',
      model: normalized,
      data: normalized
    });
  } catch (error) {
    console.error('❌ [PlaneModels] Error en getPlaneModelById:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al consultar modelo de aeronave',
      details: error.message
    });
  }
}

/**
 * ============================================================
 * 3. AGREGAR NUEVO MODELO DE AERONAVE
 * POST /api/plane-models
 * Protección: ADMIN / OWNER
 * ============================================================
 */
export async function createPlaneModel(req, res) {
  try {
    // Validar esquema de entrada
    const validatedData = PlaneModelSchema.parse(req.body);
    const targetId = String(validatedData.id).trim();

    // Procesar campos JSON
    const specialLevels = parseJsonField(validatedData.special_levels, null);
    const passiveLevels = parseJsonField(validatedData.passive_levels, null);
    const statsReal = parseJsonField(validatedData.stats_real, {
      velocidad: 2000,
      agilidad: 85,
      blindaje: 1200,
      potencia_armas: 1200
    });
    const sistemasDisponibles = parseJsonField(validatedData.sistemas_disponibles, {
      fuselaje: true,
      motor: true,
      avionica: true,
      armas: ['canon', 'misiles']
    });

    const newModelRecord = {
      id: targetId,
      name: validatedData.name.trim(),
      type: validatedData.type.trim(),
      tier: validatedData.tier || 3,
      special_name: validatedData.special_name?.trim() || null,
      special_levels: specialLevels,
      passive_name: validatedData.passive_name?.trim() || null,
      passive_levels: passiveLevels,
      stats_real: statsReal,
      sistemas_disponibles: sistemasDisponibles,
      is_active: validatedData.is_active !== undefined ? validatedData.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Verificar colisión de ID en memoria
    const existingMemory = inMemoryPlaneModels.find(m => String(m.id) === targetId);
    if (existingMemory) {
      return res.status(400).json({
        success: false,
        error: `Ya existe un modelo registrado con el identificador militar '${targetId}'`,
        code: 'PLANE_MODEL_ID_EXISTS'
      });
    }

    const supabase = getSupabase();
    let savedModel = newModelRecord;

    if (supabase) {
      // Verificar si ya existe en Supabase
      const { data: existingDb } = await supabase
        .from('plane_models')
        .select('id')
        .eq('id', targetId)
        .maybeSingle();

      if (existingDb) {
        return res.status(400).json({
          success: false,
          error: `Ya existe un modelo registrado con el ID '${targetId}' en la base de datos`,
          code: 'PLANE_MODEL_ID_EXISTS'
        });
      }

      const { data: insertedData, error: insertError } = await supabase
        .from('plane_models')
        .insert([newModelRecord])
        .select()
        .single();

      if (insertError) {
        console.error('❌ [PlaneModels] Error insertando modelo en Supabase:', insertError.message);
        // Continuamos con fallback a memoria pero registramos advertencia
      } else if (insertedData) {
        savedModel = insertedData;
      }
    }

    // Actualizar almacén en memoria
    const normalized = normalizeModel(savedModel);
    inMemoryPlaneModels.push(normalized);

    // Auditoría militar
    await logAuditChange({
      supabase,
      actorId: req.user?.id || req.user?.user_id,
      actorNick: req.user?.nick,
      targetId: normalized.id,
      targetNick: normalized.name,
      action: 'CREATE_PLANE_MODEL',
      details: {
        id: normalized.id,
        name: normalized.name,
        type: normalized.type
      }
    });

    console.log(`✈️ [PlaneModels] Nuevo modelo agregado: ${normalized.name} [ID: ${normalized.id}] por ${req.user?.nick}`);

    return res.status(201).json({
      success: true,
      message: `Modelo de aeronave '${normalized.name}' registrado exitosamente en el catálogo oficial`,
      model: normalized,
      data: normalized
    });
  } catch (error) {
    console.error('❌ [PlaneModels] Error en createPlaneModel:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Error al agregar modelo de avión',
      code: 'CREATE_PLANE_MODEL_FAILED'
    });
  }
}

/**
 * ============================================================
 * 4. EDITAR MODELO DE AERONAVE EXISTENTE
 * PUT /api/plane-models/:id
 * Protección: ADMIN / OWNER
 * ============================================================
 */
export async function updatePlaneModel(req, res) {
  try {
    const { id } = req.params;
    const targetId = String(id).trim();

    // Validar esquema parcial
    const validatedData = UpdatePlaneModelSchema.parse(req.body);

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (validatedData.name !== undefined) updatePayload.name = validatedData.name.trim();
    if (validatedData.type !== undefined) updatePayload.type = validatedData.type.trim();
    if (validatedData.tier !== undefined) updatePayload.tier = validatedData.tier;
    if (validatedData.special_name !== undefined) updatePayload.special_name = validatedData.special_name ? validatedData.special_name.trim() : null;
    if (validatedData.special_levels !== undefined) updatePayload.special_levels = parseJsonField(validatedData.special_levels, null);
    if (validatedData.passive_name !== undefined) updatePayload.passive_name = validatedData.passive_name ? validatedData.passive_name.trim() : null;
    if (validatedData.passive_levels !== undefined) updatePayload.passive_levels = parseJsonField(validatedData.passive_levels, null);
    if (validatedData.stats_real !== undefined) updatePayload.stats_real = parseJsonField(validatedData.stats_real, null);
    if (validatedData.sistemas_disponibles !== undefined) updatePayload.sistemas_disponibles = parseJsonField(validatedData.sistemas_disponibles, null);
    if (validatedData.is_active !== undefined) updatePayload.is_active = Boolean(validatedData.is_active);

    const supabase = getSupabase();
    let updatedRecord = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('plane_models')
          .update(updatePayload)
          .eq('id', targetId)
          .select()
          .single();

        if (!error && data) {
          updatedRecord = data;
        } else if (error) {
          console.warn('⚠️ [PlaneModels] Actualización DB error:', error.message);
        }
      } catch (dbErr) {
        console.warn('⚠️ [PlaneModels] Excepción al actualizar en Supabase:', dbErr.message);
      }
    }

    // Actualizar en almacén en memoria
    const memIndex = inMemoryPlaneModels.findIndex(m => String(m.id) === targetId);
    if (memIndex !== -1) {
      inMemoryPlaneModels[memIndex] = {
        ...inMemoryPlaneModels[memIndex],
        ...updatePayload
      };
      if (!updatedRecord) {
        updatedRecord = inMemoryPlaneModels[memIndex];
      }
    } else if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        error: `No se encontró el modelo con ID '${targetId}' para actualizar`,
        code: 'PLANE_MODEL_NOT_FOUND'
      });
    }

    const normalized = normalizeModel(updatedRecord);

    // Auditoría
    await logAuditChange({
      supabase,
      actorId: req.user?.id || req.user?.user_id,
      actorNick: req.user?.nick,
      targetId: normalized.id,
      targetNick: normalized.name,
      action: 'UPDATE_PLANE_MODEL',
      details: updatePayload
    });

    console.log(`✏️ [PlaneModels] Modelo actualizado: ${normalized.name} [ID: ${normalized.id}] por ${req.user?.nick}`);

    return res.json({
      success: true,
      message: `Modelo de aeronave '${normalized.name}' actualizado exitosamente`,
      model: normalized,
      data: normalized
    });
  } catch (error) {
    console.error('❌ [PlaneModels] Error en updatePlaneModel:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Error al actualizar modelo de aeronave',
      code: 'UPDATE_PLANE_MODEL_FAILED'
    });
  }
}

/**
 * ============================================================
 * 5. DESACTIVAR (ELIMINACIÓN SUAVE) MODELO DE AERONAVE
 * DELETE /api/plane-models/:id
 * Requisito: Desactivar lógicamente (is_active: false), no eliminar físicamente
 * Protección: ADMIN / OWNER
 * ============================================================
 */
export async function deletePlaneModel(req, res) {
  try {
    const { id } = req.params;
    const targetId = String(id).trim();

    const supabase = getSupabase();
    let modelName = targetId;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('plane_models')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', targetId)
          .select()
          .single();

        if (data) {
          modelName = data.name || targetId;
        }
      } catch (dbErr) {
        console.warn('⚠️ [PlaneModels] Error al desactivar en Supabase:', dbErr.message);
      }
    }

    // Desactivar en memoria
    const memIndex = inMemoryPlaneModels.findIndex(m => String(m.id) === targetId);
    if (memIndex !== -1) {
      inMemoryPlaneModels[memIndex].is_active = false;
      inMemoryPlaneModels[memIndex].updated_at = new Date().toISOString();
      modelName = inMemoryPlaneModels[memIndex].name || modelName;
    }

    // Auditoría
    await logAuditChange({
      supabase,
      actorId: req.user?.id || req.user?.user_id,
      actorNick: req.user?.nick,
      targetId: targetId,
      targetNick: modelName,
      action: 'DEACTIVATE_PLANE_MODEL',
      details: { id: targetId, is_active: false }
    });

    console.log(`🗑️ [PlaneModels] Modelo desactivado: ${modelName} [ID: ${targetId}] por ${req.user?.nick}`);

    return res.json({
      success: true,
      message: `Modelo de aeronave '${modelName}' desactivado del catálogo operativo`,
      id: targetId,
      is_active: false
    });
  } catch (error) {
    console.error('❌ [PlaneModels] Error en deletePlaneModel:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al desactivar modelo de aeronave',
      details: error.message
    });
  }
}

/**
 * ============================================================
 * 6. REACTIVAR MODELO DE AERONAVE
 * PATCH /api/plane-models/:id/restore
 * Protección: ADMIN / OWNER
 * ============================================================
 */
export async function restorePlaneModel(req, res) {
  try {
    const { id } = req.params;
    const targetId = String(id).trim();

    const supabase = getSupabase();
    let modelName = targetId;

    if (supabase) {
      try {
        const { data } = await supabase
          .from('plane_models')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', targetId)
          .select()
          .single();

        if (data) {
          modelName = data.name || targetId;
        }
      } catch (dbErr) {
        console.warn('⚠️ [PlaneModels] Error al reactivar en Supabase:', dbErr.message);
      }
    }

    // Reactivar en memoria
    const memIndex = inMemoryPlaneModels.findIndex(m => String(m.id) === targetId);
    if (memIndex !== -1) {
      inMemoryPlaneModels[memIndex].is_active = true;
      inMemoryPlaneModels[memIndex].updated_at = new Date().toISOString();
      modelName = inMemoryPlaneModels[memIndex].name || modelName;
    }

    // Auditoría
    await logAuditChange({
      supabase,
      actorId: req.user?.id || req.user?.user_id,
      actorNick: req.user?.nick,
      targetId: targetId,
      targetNick: modelName,
      action: 'RESTORE_PLANE_MODEL',
      details: { id: targetId, is_active: true }
    });

    console.log(`♻️ [PlaneModels] Modelo reactivado: ${modelName} [ID: ${targetId}] por ${req.user?.nick}`);

    const restoredModel = memIndex !== -1 ? inMemoryPlaneModels[memIndex] : null;

    return res.json({
      success: true,
      message: `Modelo de aeronave '${modelName}' reactivado en el catálogo operativo`,
      id: targetId,
      is_active: true,
      model: restoredModel,
      data: restoredModel
    });
  } catch (error) {
    console.error('❌ [PlaneModels] Error en restorePlaneModel:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al reactivar modelo de aeronave',
      details: error.message
    });
  }
}
