/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - CONTROLADOR DE HANGAR Y UPGRADES 2.0 v3.5.0
 * Gestión de flota aérea, modificaciones de combate y calibración de sistemas
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';
import { PlaneSchema, UpdatePlaneSystemSchema } from '../utils/schemas.js';
import { buildSanitizedCSV } from '../utils/csv.js';
import { INITIAL_PLANE_MODELS } from './plane-models.controller.js';
import { getModEffects, calculateModBonus, getModDescription } from '../utils/modEffects.js';
import { getPlaneTraitsWithInfo } from '../utils/traits.js';
import { getUpgradeNodes, getNode, calculateNodeEffects, calculateCategoryEffects, getNodesForCategory } from '../utils/upgradeNodes.js';
import { logSecurityEvent } from '../utils/audit.js';

// Catálogo oficial de modelos de aeronaves base
const DEFAULT_PLANE_MODELS = [
  { id: 1, name: 'F-22 Raptor', type: 'Caza de Superioridad Aérea', tier: 5 },
  { id: 2, name: 'Su-57 Felon', type: 'Caza Polivalente Sigiloso', tier: 5 },
  { id: 3, name: 'F-35 Lightning II', type: 'Caza Polivalente de Ataque', tier: 5 },
  { id: 4, name: 'Eurofighter Typhoon', type: 'Caza Polivalente', tier: 4 },
  { id: 5, name: 'Dassault Rafale', type: 'Caza Omnirrol', tier: 4 },
  { id: 6, name: 'J-20 Mighty Dragon', type: 'Caza de Superioridad Aérea', tier: 5 },
  { id: 7, name: 'Su-35 Flanker-E', type: 'Caza de Superioridad Aérea', tier: 4 },
  { id: 8, name: 'F-15EX Eagle II', type: 'Caza Pesado de Ataque', tier: 4 },
  { id: 9, name: 'F/A-18E Super Hornet', type: 'Caza Embarcado Multirrol', tier: 3 },
  { id: 10, name: 'MiG-35 Fulcrum-F', type: 'Caza Polivalente Ligero', tier: 3 },
  { id: 11, name: 'JAS 39 Gripen', type: 'Caza Ligero Polivalente', tier: 3 },
  { id: 12, name: 'A-10C Thunderbolt II', type: 'Avión de Ataque a Tierra (CAS)', tier: 3 }
];

/**
 * Recuperar y combinar catálogo de modelos de combate (Supabase + INITIAL_PLANE_MODELS de 39 modelos)
 */
async function getFullCatalogModels(supabase) {
  let dbModels = [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('plane_models')
        .select('*')
        .order('name');
      if (!error && data && data.length > 0) {
        dbModels = data;
      }
    } catch (e) {
      console.warn('⚠️ [Hangar] No se pudo leer plane_models en Supabase:', e.message);
    }
  }

  // Mapa combinado priorizando Supabase > INITIAL_PLANE_MODELS (39 modelos) > DEFAULT_PLANE_MODELS
  const map = new Map();
  DEFAULT_PLANE_MODELS.forEach(m => map.set(String(m.id), { ...m, id: String(m.id) }));
  INITIAL_PLANE_MODELS.forEach(m => map.set(String(m.id), m));
  dbModels.forEach(m => map.set(String(m.id), m));

  return Array.from(map.values());
}

/**
 * Búsqueda inteligente y robusta de modelo por ID, alias o nombre
 */
function findModel(catalog, avionId) {
  if (avionId === undefined || avionId === null) return null;
  const strId = String(avionId).trim();
  const lowerStr = strId.toLowerCase();

  // 1. Por ID exacto
  let found = catalog.find(m => String(m.id) === strId);
  if (found) return found;

  // 2. Por nombre exacto
  found = catalog.find(m => m.name && m.name.toLowerCase() === lowerStr);
  if (found) return found;

  // 3. Por coincidencia parcial
  const cleanStr = lowerStr.replace(/[^a-z0-9]/g, '');
  if (cleanStr.length > 1) {
    found = catalog.find(m => {
      if (!m.name) return false;
      const cleanName = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanName === cleanStr || cleanName.includes(cleanStr) || cleanStr.includes(cleanName);
    });
    if (found) return found;
  }

  return null;
}

// Catálogo oficial de modificaciones tácticas (fallback)
const DEFAULT_PLANE_MODS = [
  { id: 'm1',  name: 'Giro Temerario',                 type: 'Agilidad', type_en: 'Agility' },
  { id: 'm2',  name: 'Maniobrabilidad Ideal',          type: 'Agilidad', type_en: 'Agility' },
  { id: 'm3',  name: 'Resistencia a las Explosiones',  type: 'Defensa',  type_en: 'Defense' },
  { id: 'm4',  name: 'Blindaje de Ataque',             type: 'Defensa',  type_en: 'Defense' },
  { id: 'm5',  name: 'Quemadores Auxiliares Eficientes', type: 'Motor',  type_en: 'Engine' },
  { id: 'm6',  name: 'Máxima Propulsión',              type: 'Motor',    type_en: 'Engine' },
  { id: 'm7',  name: 'Bengalas Disruptivas',           type: 'Señuelos', type_en: 'Flare' },
  { id: 'm8',  name: 'Bengalas Más Rápidas',           type: 'Señuelos', type_en: 'Flare' },
  { id: 'm9',  name: 'Armas Aniquiladoras',            type: 'Arma',     type_en: 'Weapon' },
  { id: 'm10', name: 'Guiado Mejorado',                type: 'Arma',     type_en: 'Weapon' }
];

// Costos oficiales de recursos para Starform Upgrades 2.0 (Niveles 1 a 8)
export const UPGRADE_COSTS = {
  1: { piezas: 100, avanzadas: 0 },
  2: { piezas: 250, avanzadas: 0 },
  3: { piezas: 500, avanzadas: 10 },
  4: { piezas: 800, avanzadas: 25 },
  5: { piezas: 1200, avanzadas: 50 },
  6: { piezas: 1800, avanzadas: 100 },
  7: { piezas: 2500, avanzadas: 200 },
  8: { piezas: 3500, avanzadas: 350 }
};

/**
 * Obtener catálogo de modelos de combate disponibles
 */
export async function getCatalogModels(req, res) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('plane_models')
        .select('*')
        .neq('is_active', false)
        .order('name');
      
      if (!error && data && data.length > 0) {
        return res.json({ success: true, message: 'Catálogo de modelos recuperado', models: data, data });
      }
    }
    const fallbackModels = INITIAL_PLANE_MODELS.filter(m => m.is_active !== false);
    return res.json({ success: true, message: 'Catálogo base cargado', models: fallbackModels, data: fallbackModels });
  } catch (error) {
    console.error('❌ [Hangar] Error en getCatalogModels:', error);
    const fallbackModels = INITIAL_PLANE_MODELS.filter(m => m.is_active !== false);
    return res.json({ success: true, message: 'Catálogo de emergencia', models: fallbackModels, data: fallbackModels });
  }
}

/**
 * Obtener catálogo de modificaciones de subsistemas
 */
export async function getCatalogMods(req, res) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('plane_mods')
        .select('*')
        .order('name');
      
      if (!error && data && data.length > 0) {
        return res.json({ success: true, message: 'Catálogo de mods recuperado', mods: data, data });
      }
    }
    return res.json({ success: true, message: 'Catálogo base de mods cargado', mods: DEFAULT_PLANE_MODS, data: DEFAULT_PLANE_MODS });
  } catch (error) {
    console.error('❌ [Hangar] Error en getCatalogMods:', error);
    return res.json({ success: true, message: 'Catálogo de emergencia de mods', mods: DEFAULT_PLANE_MODS, data: DEFAULT_PLANE_MODS });
  }
}

/**
 * Obtener la flota de aeronaves del combatiente autenticado
 * Soporta UUID como clave primaria y selecciona todos los campos del hangar
 */
export async function getMyPlanes(req, res, next) {
  try {
    const supabase = getSupabase();
    const userId = req.user.user_id || req.user.id;
    const userNick = req.user.nick;

    console.log(`🛩️ [Hangar] Consultando flota de combate para combatiente: ID=${userId}, Nick=${userNick || 'Piloto'}`);

    if (supabase) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
      const isNumeric = /^\d+$/.test(String(userId));

      let query = supabase.from('planes').select('*');

      // Búsqueda robusta compatible con UUID y números
      if (isUUID) {
        query = query.eq('user_id', userId);
      } else if (isNumeric) {
        query = query.or(`user_id.eq.${userId}`);
      } else {
        query = query.eq('user_id', userId);
      }

      query = query.order('id', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('❌ [Hangar] Error en consulta de aeronaves en Supabase:', error.message);
      }

      if (!error && data) {
        console.log(`✅ [Hangar] Flota recuperada con éxito: ${data.length} aeronaves encontradas`);

        const catalog = await getFullCatalogModels(supabase);
        const planes = data.map(p => {
          const nf = p.nivel_fuselaje || 0;
          const nm = p.nivel_motor || 0;
          const na = p.nivel_avionica || 0;
          const nw = p.nivel_armas || 0;
          const nivelSistemas = Math.floor((nf + nm + na + nw) / 4);
          const model = findModel(catalog, p.avion_id);

          const resolvedName = model?.name 
            || (p.model_name && !/^\d+$/.test(String(p.model_name).trim()) ? p.model_name : null)
            || (p.name && !/^\d+$/.test(String(p.name).trim()) ? p.name : null)
            || p.model_name 
            || p.name 
            || p.avion_id;

          const resolvedType = model?.type || p.type || 'Caza de Combate';

          return {
            id: p.id,
            user_id: p.user_id,
            avion_id: p.avion_id,
            model_name: resolvedName,
            name: resolvedName,
            type: resolvedType,
            image_url: model?.image_url || null,
            nivel: p.nivel,
            especial_nombre: p.especial_nombre || null,
            especial_nivel_num: p.especial_nivel_num || null,
            especial_efecto: p.especial_efecto || null,
            pasiva_nombre: p.pasiva_nombre || null,
            pasiva_nivel_num: p.pasiva_nivel_num || null,
            pasiva_efecto: p.pasiva_efecto || null,
            mod1_id: p.mod1_id || null,
            mod1_lvl: p.mod1_lvl || null,
            mod2_id: p.mod2_id || null,
            mod2_lvl: p.mod2_lvl || null,
            nivel_fuselaje: nf,
            nivel_motor: nm,
            nivel_avionica: na,
            nivel_armas: nw,
            nivel_sistemas: nivelSistemas,
            recursos_piezas: p.recursos_piezas || 0,
            recursos_avanzadas: p.recursos_avanzadas || 0,
            sistemas_desbloqueados: (p.nivel || 1) >= 6
          };
        });

        return res.json({
          success: true,
          message: 'Flota de combate recuperada exitosamente',
          planes,
          total: planes.length,
          data: {
            planes,
            total: planes.length
          }
        });
      }
    }

    console.warn('⚠️ [Hangar] No se encontraron aeronaves registradas o base de datos offline');
    return res.json({
      success: true,
      message: 'Hangar vacío o sin telemetría disponible',
      planes: [],
      total: 0,
      data: { planes: [], total: 0 }
    });

  } catch (err) {
    console.error('❌ [Hangar] Error crítico en getMyPlanes:', err);
    return res.status(500).json({
      success: false,
      message: 'Error al cargar las aeronaves del hangar',
      error: err.message,
      planes: [],
      total: 0
    });
  }
}

/**
 * Registrar una nueva aeronave en el hangar militar
 */
export async function addPlane(req, res, next) {
  try {
    const data = PlaneSchema.parse(req.body);
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();
    const catalog = await getFullCatalogModels(supabase);
    const model = findModel(catalog, data.avion_id);
    const resolvedName = model?.name || (data.name && !/^\d+$/.test(data.name) ? data.name : null) || data.avion_id;
    const resolvedType = model?.type || data.type || 'Caza de Combate';

    console.log(`➕ [Hangar] Registrando nueva aeronave (${resolvedName} [${data.avion_id}]) para usuario ID: ${userId}`);

    const nf = data.nivel_fuselaje || 0;
    const nm = data.nivel_motor || 0;
    const na = data.nivel_avionica || 0;
    const nw = data.nivel_armas || 0;

    const planePayload = {
      user_id: userId,
      avion_id: data.avion_id,
      nivel: data.nivel,
      especial_nombre: data.especial_nombre || null,
      especial_nivel_num: data.especial_nivel_num || null,
      especial_efecto: data.especial_efecto || null,
      pasiva_nombre: data.pasiva_nombre || null,
      pasiva_nivel_num: data.pasiva_nivel_num || null,
      pasiva_efecto: data.pasiva_efecto || null,
      mod1_id: data.mod1_id || null,
      mod1_lvl: data.mod1_lvl || null,
      mod2_id: data.mod2_id || null,
      mod2_lvl: data.mod2_lvl || null,
      nivel_fuselaje: nf,
      nivel_motor: nm,
      nivel_avionica: na,
      nivel_armas: nw,
      recursos_piezas: data.recursos_piezas || 0,
      recursos_avanzadas: data.recursos_avanzadas || 0,
      created_at: new Date().toISOString()
    };

    if (!supabase) {
      return res.status(500).json({
        success: false,
        message: 'Base de datos militar inaccesible',
        error: 'DATABASE_UNAVAILABLE'
      });
    }

    const { data: createdPlane, error: insertError } = await supabase
      .from('planes')
      .insert(planePayload)
      .select()
      .single();

    if (insertError) {
      console.error('❌ [Hangar] Error insertando aeronave:', insertError);
      throw insertError;
    }

    const planeData = {
      ...(createdPlane || planePayload),
      model_name: resolvedName,
      name: resolvedName,
      type: resolvedType,
      sistemas_desbloqueados: (data.nivel || 1) >= 6
    };

    return res.status(201).json({
      success: true,
      message: 'Aeronave asignada y registrada con éxito en el hangar',
      plane: planeData,
      data: planeData
    });

  } catch (err) {
    console.error('❌ [Hangar] Error en addPlane:', err);
    return res.status(400).json({
      success: false,
      message: 'No se pudo registrar la aeronave',
      error: err.message
    });
  }
}

/**
 * Actualizar configuración de aeronave existente
 */
export async function updatePlane(req, res, next) {
  try {
    const rawId = req.params.id;
    const planeId = /^\d+$/.test(String(rawId)) ? parseInt(rawId, 10) : rawId;
    const data = PlaneSchema.parse(req.body);
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Base de datos no disponible', error: 'DATABASE_UNAVAILABLE' });
    }

    const { data: existing, error: findError } = await supabase
      .from('planes')
      .select('*')
      .eq('id', planeId)
      .single();

    if (findError || !existing) {
      return res.status(404).json({ success: false, message: 'Aeronave no encontrada en el hangar', error: 'PLANE_NOT_FOUND' });
    }

    if (String(existing.user_id) !== String(userId) && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ success: false, message: 'Permisos insuficientes para modificar esta aeronave', error: 'FORBIDDEN' });
    }

    const updatePayload = {
      avion_id: data.avion_id,
      nivel: data.nivel,
      especial_nombre: data.especial_nombre || null,
      especial_nivel_num: data.especial_nivel_num || null,
      especial_efecto: data.especial_efecto || null,
      pasiva_nombre: data.pasiva_nombre || null,
      pasiva_nivel_num: data.pasiva_nivel_num || null,
      pasiva_efecto: data.pasiva_efecto || null,
      mod1_id: data.mod1_id || null,
      mod1_lvl: data.mod1_lvl || null,
      mod2_id: data.mod2_id || null,
      mod2_lvl: data.mod2_lvl || null,
      nivel_fuselaje: data.nivel_fuselaje !== undefined ? data.nivel_fuselaje : existing.nivel_fuselaje,
      nivel_motor: data.nivel_motor !== undefined ? data.nivel_motor : existing.nivel_motor,
      nivel_avionica: data.nivel_avionica !== undefined ? data.nivel_avionica : existing.nivel_avionica,
      nivel_armas: data.nivel_armas !== undefined ? data.nivel_armas : existing.nivel_armas,
      recursos_piezas: data.recursos_piezas !== undefined ? data.recursos_piezas : existing.recursos_piezas,
      recursos_avanzadas: data.recursos_avanzadas !== undefined ? data.recursos_avanzadas : existing.recursos_avanzadas
    };

    const { data: updated, error: updateErr } = await supabase
      .from('planes')
      .update(updatePayload)
      .eq('id', planeId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const catalog = await getFullCatalogModels(supabase);
    const model = findModel(catalog, data.avion_id);
    const resolvedName = model?.name || (data.name && !/^\d+$/.test(data.name) ? data.name : null) || data.avion_id;
    const resolvedType = model?.type || data.type || 'Caza de Combate';

    const resultPlane = {
      ...(updated || updatePayload),
      model_name: resolvedName,
      name: resolvedName,
      type: resolvedType
    };

    return res.json({
      success: true,
      message: 'Aeronave actualizada correctamente en el hangar',
      plane: resultPlane,
      data: resultPlane
    });

  } catch (err) {
    console.error('❌ [Hangar] Error en updatePlane:', err);
    return res.status(400).json({ success: false, message: 'Error actualizando aeronave', error: err.message });
  }
}

/**
 * Calibrar y mejorar un subsistema de Upgrades 2.0 (Fuselaje, Motor, Aviónica, Armas)
 */
export async function updatePlaneSystem(req, res, next) {
  try {
    const rawId = req.params.id;
    const planeId = /^\d+$/.test(String(rawId)) ? parseInt(rawId, 10) : rawId;
    const parsed = UpdatePlaneSystemSchema.parse(req.body);
    const { sistema, nivel, piezas, avanzadas } = parsed;
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Base de datos no disponible', error: 'DATABASE_UNAVAILABLE' });
    }

    const { data: plane, error: findError } = await supabase
      .from('planes')
      .select('*')
      .eq('id', planeId)
      .single();

    if (findError || !plane) {
      return res.status(404).json({ success: false, message: 'Aeronave no encontrada', error: 'PLANE_NOT_FOUND' });
    }

    if (String(plane.user_id) !== String(userId) && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ success: false, message: 'Permiso denegado para mejorar esta unidad', error: 'FORBIDDEN' });
    }

    if ((plane.nivel || 1) < 6) {
      return res.status(400).json({
        success: false,
        message: 'Los subsistemas Upgrades 2.0 requieren que la aeronave sea Nivel 6 o superior',
        error: 'UPGRADE_LOCKED_LEVEL_TOO_LOW'
      });
    }

    // ✅ VALIDACIÓN DE SISTEMA DISPONIBLE
    // Verificar que el avión tenga el sistema solicitado según plane_models.sistemas_disponibles
    const sistemaKeyMap = {
      fuselaje: 'fuselaje',
      motor: 'motor',
      avionica: 'avionica',
      armas: 'canones'
    };

    const sistemaKey = sistemaKeyMap[sistema];

    if (sistemaKey) {
      const { data: modelData, error: modelError } = await supabase
        .from('plane_models')
        .select('sistemas_disponibles, name')
        .eq('id', plane.avion_id)
        .single();

      if (!modelError && modelData) {
        const sistemasDisponibles = modelData.sistemas_disponibles || {};
        const sistemaDisponible = sistemasDisponibles[sistemaKey];

        // Verificar si el sistema está disponible
        // Caso 1: null o false → No disponible
        if (sistemaDisponible === null || sistemaDisponible === false || sistemaDisponible === undefined) {
          console.warn(`⚠️ [Upgrade] Sistema ${sistema} no disponible para ${modelData.name}`);
          
          return res.status(400).json({
            success: false,
            message: `Esta aeronave (${modelData.name}) no tiene el sistema ${sistema.toUpperCase()} disponible`,
            error: 'SYSTEM_NOT_AVAILABLE',
            details: {
              sistema_solicitado: sistema,
              sistema_key: sistemaKey,
              avion_id: plane.avion_id,
              avion_name: modelData.name,
              sistemas_disponibles: Object.keys(sistemasDisponibles).filter(
                k => sistemasDisponibles[k] === true || 
                     (typeof sistemasDisponibles[k] === 'string')
              )
            }
          });
        }

        // Log de confirmación
        console.log(`✅ [Upgrade] Sistema ${sistema} disponible para ${modelData.name}`);
      } else {
        console.warn(`⚠️ [Upgrade] No se pudo verificar sistemas_disponibles para avion_id=${plane.avion_id}`);
      }
    }

    const systemColumnMap = {
      fuselaje: 'nivel_fuselaje',
      motor: 'nivel_motor',
      avionica: 'nivel_avionica',
      armas: 'nivel_armas'
    };

    const columnName = systemColumnMap[sistema];
    if (!columnName) {
      return res.status(400).json({ success: false, message: 'Subsistema militar inválido', error: 'INVALID_SYSTEM' });
    }

    const updatePayload = {
      [columnName]: nivel
    };
    if (piezas !== undefined) updatePayload.recursos_piezas = piezas;
    if (avanzadas !== undefined) updatePayload.recursos_avanzadas = avanzadas;

    const { data: updatedPlane, error: updateErr } = await supabase
      .from('planes')
      .update(updatePayload)
      .eq('id', planeId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const finalPlane = updatedPlane || { ...plane, ...updatePayload };
    const nf = finalPlane.nivel_fuselaje || 0;
    const nm = finalPlane.nivel_motor || 0;
    const na = finalPlane.nivel_avionica || 0;
    const nw = finalPlane.nivel_armas || 0;

    const enrichedPlane = {
      ...finalPlane,
      nivel_fuselaje: nf,
      nivel_motor: nm,
      nivel_avionica: na,
      nivel_armas: nw,
      nivel_sistemas: Math.floor((nf + nm + na + nw) / 4)
    };

    return res.json({
      success: true,
      message: `Subsistema ${sistema.toUpperCase()} calibrado con éxito a nivel ${nivel}`,
      plane: enrichedPlane,
      data: enrichedPlane
    });

  } catch (err) {
    console.error('❌ [Hangar] Error en updatePlaneSystem:', err);
    return res.status(400).json({ success: false, message: 'Error calibrando subsistema', error: err.message });
  }
}

/**
 * Actualizar múltiples subsistemas y rutas A/B de Upgrades 2.0 para una aeronave
 * PUT /api/planes/:id/systems
 */
export async function updatePlaneSystems(req, res) {
  try {
    const rawId = req.params.id;
    const planeId = /^\d+$/.test(String(rawId)) ? parseInt(rawId, 10) : rawId;
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Base de datos no disponible', error: 'DATABASE_UNAVAILABLE' });
    }

    const { data: plane, error: findError } = await supabase
      .from('planes')
      .select('*')
      .eq('id', planeId)
      .single();

    if (findError || !plane) {
      return res.status(404).json({ success: false, message: 'Aeronave no encontrada', error: 'PLANE_NOT_FOUND' });
    }

    if (String(plane.user_id) !== String(userId) && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ success: false, message: 'Permiso denegado para modificar esta aeronave', error: 'FORBIDDEN' });
    }

    const planeLevel = plane.nivel || 1;
    if (planeLevel < 6) {
      return res.status(400).json({
        success: false,
        message: 'Los subsistemas Upgrades 2.0 requieren que la aeronave sea Nivel 6 o superior',
        error: 'UPGRADE_LOCKED_LEVEL_TOO_LOW'
      });
    }

    const { sistemas } = req.body;
    if (!sistemas || typeof sistemas !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Estructura de sistemas no provista o inválida',
        error: 'INVALID_SYSTEMS_PAYLOAD'
      });
    }

    // ✅ VALIDACIÓN DE SISTEMAS DISPONIBLES (H-04)
    // Verificar que el avión tenga los sistemas solicitados según plane_models.sistemas_disponibles
    let modelData = null;
    const { data: dbModel, error: modelError } = await supabase
      .from('plane_models')
      .select('sistemas_disponibles, name')
      .eq('id', plane.avion_id)
      .single();

    if (!modelError && dbModel) {
      modelData = dbModel;
    } else {
      const catalog = await getFullCatalogModels(supabase);
      const fallbackModel = findModel(catalog, plane.avion_id);
      if (fallbackModel) {
        modelData = {
          name: fallbackModel.name,
          sistemas_disponibles: fallbackModel.sistemas_disponibles
        };
      }
    }

    if (modelData) {
      let sistemasDisponibles = modelData.sistemas_disponibles || {};
      if (typeof sistemasDisponibles === 'string') {
        try { sistemasDisponibles = JSON.parse(sistemasDisponibles); } catch (_) { sistemasDisponibles = {}; }
      }

      // Mapeo de claves de sistema del payload → claves de sistemas_disponibles
      const sistemaKeyMap = {
        fuselaje: 'fuselaje',
        motor: 'motor',
        avionica: 'avionica',
        canones: 'canones',
        misiles_ir: 'misiles_ir',
        misiles_radar: 'misiles_radar',
        cohetes: 'cohetes'
      };

      for (const [sysKey, sysData] of Object.entries(sistemas)) {
        const sistemaKey = sistemaKeyMap[sysKey];
        if (!sistemaKey) continue;

        const sistemaDisponible = sistemasDisponibles[sistemaKey];

        // Validar que el sistema esté disponible (boolean === true)
        if (sistemaDisponible !== true) {
          return res.status(400).json({
            success: false,
            message: `Esta aeronave (${modelData.name}) no tiene el sistema ${sysKey.toUpperCase()} disponible`,
            error: 'SYSTEM_NOT_AVAILABLE',
            details: {
              sistema_solicitado: sysKey,
              sistema_key: sistemaKey,
              avion_id: plane.avion_id,
              avion_name: modelData.name,
              sistemas_disponibles: Object.keys(sistemasDisponibles).filter(
                k => sistemasDisponibles[k] === true
              )
            }
          });
        }
      }
    }

    // Cargar catálogo de nodos para validar requirement_level
    const allNodes = await getUpgradeNodes(supabase);
    const planeNodes = allNodes[plane.avion_id] || allNodes[String(plane.avion_id)] || {};

    // Preparar objeto de rutas existente
    let currentRutasSistemas = plane.rutas_sistemas || {};
    if (typeof currentRutasSistemas === 'string') {
      try { currentRutasSistemas = JSON.parse(currentRutasSistemas); } catch (_) { currentRutasSistemas = {}; }
    }
    const updatedRutas = { ...currentRutasSistemas };

    const updatePayload = {};

    const systemColumnMap = {
      fuselaje:      'nivel_fuselaje',
      motor:         'nivel_motor',
      avionica:      'nivel_avionica',
      canones:       'nivel_armas',
      misiles_ir:    'nivel_armas',
      misiles_radar: 'nivel_armas',
      cohetes:       'nivel_armas'
    };

    // Validar y procesar cada sistema
    for (const [sysKey, sysData] of Object.entries(sistemas)) {
      if (!sysData || typeof sysData !== 'object') continue;

      const targetNivel = Math.min(8, Math.max(0, parseInt(sysData.nivel, 10) || 0));
      const targetRutas = (sysData.rutas && typeof sysData.rutas === 'object') ? sysData.rutas : {};

      // Validar requisito de nivel de aeronave para cada nivel activo
      const sysNodes = planeNodes[sysKey] || allNodes?.[sysKey];

      if (sysNodes) {
        for (let l = 1; l <= targetNivel; l++) {
          const ruta = l <= 4 ? 'base' : (targetRutas[l] || targetRutas[String(l)] || 'A');
          const nodeObj = sysNodes[ruta]?.[l];
          if (nodeObj && planeLevel < (nodeObj.requirement_level || 6)) {
            return res.status(400).json({
              success: false,
              message: `El nodo Nivel ${l} (${nodeObj.node_name || sysKey}) requiere que el avión sea Nivel ${nodeObj.requirement_level}`,
              error: 'REQUIREMENT_LEVEL_NOT_MET',
              details: { sistema: sysKey, nivel: l, requirement_level: nodeObj.requirement_level, plane_level: planeLevel }
            });
          }
        }
      }

      // Mapear a columnas de la base de datos
      const col = systemColumnMap[sysKey];
      if (col) {
        if (col === 'nivel_armas') {
          updatePayload[col] = Math.max(updatePayload[col] || 0, targetNivel);
        } else {
          updatePayload[col] = targetNivel;
        }
      }

      // Actualizar rutas para el sistema
      updatedRutas[sysKey] = { ...targetRutas };
    }

    updatePayload.rutas_sistemas = updatedRutas;

    // Ejecutar actualización en Supabase
    const { data: updatedPlane, error: updateErr } = await supabase
      .from('planes')
      .update(updatePayload)
      .eq('id', planeId)
      .select()
      .single();

    if (updateErr) {
      console.error('❌ [Hangar] Error actualizando planes en Supabase:', updateErr.message);
      // Fallback si la columna rutas_sistemas aún no existiese en la BD
      if (updateErr.message && updateErr.message.includes('rutas_sistemas')) {
        const fallbackPayload = { ...updatePayload };
        delete fallbackPayload.rutas_sistemas;
        const { data: fbPlane, error: fbErr } = await supabase
          .from('planes')
          .update(fallbackPayload)
          .eq('id', planeId)
          .select()
          .single();
        if (fbErr) throw fbErr;
      } else {
        throw updateErr;
      }
    }

    // Auditoría en plane_upgrades
    try {
      const auditEntries = [];
      Object.entries(sistemas).forEach(([sistema, data]) => {
        const col = systemColumnMap[sistema] || `nivel_${sistema}`;
        const prevNivel = plane[col] || 0;
        const newNivel = data.nivel !== undefined ? data.nivel : prevNivel;
        if (prevNivel !== newNivel) {
          auditEntries.push({
            plane_id: planeId,
            user_id: plane.user_id,
            sistema,
            nivel_anterior: prevNivel,
            nivel_nuevo: newNivel,
            piezas_usadas: 0,
            avanzadas_usadas: 0
          });
        }
      });
      if (auditEntries.length > 0) {
        await supabase.from('plane_upgrades').insert(auditEntries);
      }
    } catch (auditErr) {
      console.warn('⚠️ [Hangar] Advertencia registrando auditoría en plane_upgrades:', auditErr.message);
    }

    // Registrar en auditoría de seguridad
    try {
      await logSecurityEvent({
        supabase,
        userId,
        nick: req.user.nick || req.user.username,
        event: 'PLANE_SYSTEMS_UPDATED',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { planeId, sistemas }
      });
    } catch (_) {}

    console.log(`✅ [Hangar] Subsistemas Upgrades 2.0 actualizados para avión ${planeId}`);

    return res.json({
      success: true,
      message: 'Sistemas actualizados correctamente',
      plane: updatedPlane || { ...plane, ...updatePayload }
    });

  } catch (err) {
    console.error('❌ [Hangar] Error en updatePlaneSystems:', err);
    return res.status(500).json({ success: false, message: 'Error al actualizar sistemas', error: err.message });
  }
}

/**
 * Obtiene los detalles completos y telemetría de una aeronave por ID.
 * Busca primero en `planes` (hangar del usuario) y si no encuentra, en `plane_models` (catálogo).
 * Enriquece la respuesta con datos de Upgrades 2.0, mods y datos de la Wiki de Metalstorm (Fase 3).
 *
 * @route GET /api/planes/:id/details
 * @param {import('express').Request} req - Express request con req.params.id (ID numérico o de modelo)
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next middleware
 * @returns {Promise<void>} JSON con { success: true, plane: { ...detalles, ...datosWiki } }
 *
 * @description
 * Campos de la Wiki incluidos en la respuesta (Fase 3):
 * - descripcion {string} - Descripción in-game
 * - historia {string} - Trivia histórica multi-párrafo
 * - recomendaciones {object} - Tips tácticos (Trait, Ability, Passive Tips)
 * - loadout_wiki {object} - Armamento detallado con stats (cañones, misiles)
 * - paints {Array} - Lista de pinturas con nombre, imagen, raridad, requisito
 * - canopies {Array} - Lista de cabinas con nombre, imagen, raridad, nivel
 * - general_info_wiki {object} - Info general (rol, fabricante, generación)
 * - wiki_url {string} - URL de la página del avión en metalstorm.wiki.gg
 *
 * @since v2.0.0
 * @updated v3.9.0 - Añadidos 8 campos de datos de la Wiki de Metalstorm
 */
export async function getPlaneDetails(req, res, next) {
  try {
    const rawId = req.params.id;
    const planeId = /^\d+$/.test(String(rawId)) ? parseInt(rawId, 10) : rawId;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(404).json({ success: false, message: 'Aeronave no encontrada', error: 'DATABASE_UNAVAILABLE' });
    }

    const { data: plane, error } = await supabase
      .from('planes')
      .select('*')
      .eq('id', planeId)
      .single();

    if (error || !plane) {
      return res.status(404).json({ success: false, message: 'Aeronave no encontrada', error: 'PLANE_NOT_FOUND' });
    }

    const catalog = await getFullCatalogModels(supabase);
    const model = findModel(catalog, plane.avion_id);
    const modelName = model?.name || (plane.name && !/^\d+$/.test(plane.name) ? plane.name : null) || plane.avion_id;
    const modelType = model?.type || plane.type || 'Caza de Combate';

    let systemNames = model?.system_names || {};
    if (typeof systemNames === 'string') {
      try { systemNames = JSON.parse(systemNames); } catch (_) { systemNames = {}; }
    }

    let rutasSistemas = plane.rutas_sistemas || {};
    if (typeof rutasSistemas === 'string') {
      try { rutasSistemas = JSON.parse(rutasSistemas); } catch (_) { rutasSistemas = {}; }
    }

    const isUnlocked = (plane.nivel || 1) >= 6;
    const planeLvl = plane.nivel || 1;
    const nf = plane.nivel_fuselaje || 0;
    const nm = plane.nivel_motor || 0;
    const na = plane.nivel_avionica || 0;
    const nw = plane.nivel_armas || 0;

    // Cargar nodos de Upgrades 2.0 (Supabase con fallback y caché en memoria)
    const allNodes = await getUpgradeNodes(supabase);
    const planeNodes = allNodes[plane.avion_id] || allNodes[String(plane.avion_id)] || {};

    let sistemasDisponibles = model?.sistemas_disponibles || plane?.sistemas_disponibles || {
      fuselaje: true,
      motor: true,
      avionica: true,
      canones: true,
      misiles_ir: true
    };
    if (typeof sistemasDisponibles === 'string') {
      try { sistemasDisponibles = JSON.parse(sistemasDisponibles); } catch (_) { sistemasDisponibles = {}; }
    }

    // Constructor de sistema con nodos 2.0 (12 nodos, rutas A/B, nodo actual y siguiente)
    function buildSystemObject(sysKey, categoria, defaultNombre, descripcion, nivel) {
      const catNodes = planeNodes[categoria] || allNodes?.[categoria] || {};
      const allSysNodes = [
        ...Object.values(catNodes.base || {}),
        ...Object.values(catNodes.A || {}),
        ...Object.values(catNodes.B || {})
      ].sort((a, b) => a.nivel - b.nivel || (a.ruta === 'base' ? -1 : a.ruta.localeCompare(b.ruta)));

      const rutasSys = rutasSistemas[sysKey] || rutasSistemas[categoria] || plane[`rutas_${sysKey}`] || {};
      const currentRoute = nivel <= 4 ? 'base' : (rutasSys[nivel] || 'A');
      const currentNode = nivel > 0 ? (catNodes[currentRoute]?.[nivel] || null) : null;

      const nextLevel = nivel + 1;
      const nextRoute = nextLevel <= 4 ? 'base' : (rutasSys[nextLevel] || 'A');
      const nextNode = nextLevel <= 8 ? (catNodes[nextRoute]?.[nextLevel] || null) : null;

      const rutasDisponibles = {};
      [5, 6, 7, 8].forEach(lvl => {
        const nodeA = catNodes.A?.[lvl];
        const nodeB = catNodes.B?.[lvl];
        rutasDisponibles[lvl] = [
          { ruta: 'A', node_name: nodeA?.node_name || '', effects: nodeA?.effects || {}, stats_afectadas: nodeA?.stats_afectadas || {}, requirement_level: nodeA?.requirement_level || 12 },
          { ruta: 'B', node_name: nodeB?.node_name || '', effects: nodeB?.effects || {}, stats_afectadas: nodeB?.stats_afectadas || {}, requirement_level: nodeB?.requirement_level || 12 }
        ];
      });

      const nodosCompletos = allSysNodes.map(n => ({
        id: n.id,
        avion_id: n.avion_id,
        sistema_web: n.sistema_web,
        sistema_categoria: n.sistema_categoria || categoria,
        sistema: categoria,
        nivel: n.nivel,
        ruta: n.ruta,
        node_name: n.node_name,
        effects: n.effects,
        stats_afectadas: n.stats_afectadas,
        requirement_level: n.requirement_level,
        cost_piezas: n.cost_piezas || 0,
        cost_avanzadas: n.cost_avanzadas || 0,
        desbloqueado: planeLvl >= (n.requirement_level || 6) && nivel >= n.nivel
      }));

      const sysNamesVal = systemNames[sysKey] || systemNames[categoria];
      const sysDisplayName = Array.isArray(sysNamesVal)
        ? sysNamesVal.join(' / ')
        : (sysNamesVal || defaultNombre);

      return {
        sistema: sysKey,
        nombre: sysDisplayName,
        descripcion,
        nivel,
        max: 8,
        rutas: rutasSys,
        disponible: isUnlocked,
        costo_siguiente: UPGRADE_COSTS[nivel + 1] || null,
        nodo_actual: currentNode ? {
          nivel,
          ruta: currentRoute,
          node_name: currentNode.node_name,
          effects: currentNode.effects || {},
          stats_afectadas: currentNode.stats_afectadas || {}
        } : null,
        nodo_siguiente: nextNode ? {
          nivel: nextLevel,
          ruta: nextRoute,
          node_name: nextNode.node_name,
          effects: nextNode.effects || {},
          stats_afectadas: nextNode.stats_afectadas || {},
          requirement_level: nextNode.requirement_level || 6,
          desbloqueado: planeLvl >= (nextNode.requirement_level || 6)
        } : null,
        rutas_disponibles: rutasDisponibles,
        nodos_completos: nodosCompletos
      };
    }

    // Filtrar y armar los sistemas disponibles del avión (7 categorías oficiales)
    const systemTitles = {
      fuselaje: 'Fuselaje',
      motor: 'Motor',
      avionica: 'Aviónica',
      canones: 'Cañones',
      misiles_ir: 'Misiles Infrarrojos',
      misiles_radar: 'Misiles de Radar',
      cohetes: 'Cohetes'
    };
    const systemDescriptions = {
      fuselaje: 'Resistencia estructural, blindaje e integridad',
      motor: 'Empuje, aceleración, postcombustión y velocidad punta',
      avionica: 'Adquisición de radar, tiempo de enganche y ECM',
      canones: 'Cadencia de fuego, tiempo de recarga y daño balístico',
      misiles_ir: 'Misiles térmicos de persecución y combate cercano',
      misiles_radar: 'Misiles guiados por radar BVR más allá del alcance visual',
      cohetes: 'Salvas de cohetes no guiados de alto impacto'
    };

    const sistemas = {};
    ['fuselaje', 'motor', 'avionica', 'canones', 'misiles_ir', 'misiles_radar', 'cohetes'].forEach(cat => {
      if (sistemasDisponibles[cat] === true) {
        const nivel = cat === 'fuselaje' ? nf
                    : cat === 'motor'    ? nm
                    : cat === 'avionica' ? na
                    : nw;
        sistemas[cat] = buildSystemObject(cat, cat, systemTitles[cat], systemDescriptions[cat], nivel);
      }
    });

    const planeDetail = {
      id: plane.id,
      user_id: plane.user_id,
      avion_id: plane.avion_id,
      model_name: modelName,
      type: modelType,
      image_url: model?.image_url || null,
      nivel: plane.nivel,
      system_names: systemNames,
      rutas_sistemas: rutasSistemas,
      stats_real: model?.stats_real || null,
      descripcion: model?.descripcion || null,
      historia: model?.historia || null,
      recomendaciones: model?.recomendaciones || null,
      loadout_wiki: model?.loadout_wiki || null,
      paints: model?.paints || null,
      canopies: model?.canopies || null,
      general_info_wiki: model?.general_info_wiki || null,
      wiki_url: model?.wiki_url || null,
      especial_nombre: plane.especial_nombre,
      especial_nivel_num: plane.especial_nivel_num,
      especial_efecto: plane.especial_efecto,
      pasiva_nombre: plane.pasiva_nombre,
      pasiva_nivel_num: plane.pasiva_nivel_num,
      pasiva_efecto: plane.pasiva_efecto,
      mod1_id: plane.mod1_id,
      mod1_lvl: plane.mod1_lvl,
      mod2_id: plane.mod2_id,
      mod2_lvl: plane.mod2_lvl,
      desbloqueado_upgrades: isUnlocked,
      recursos_piezas: plane.recursos_piezas || 0,
      recursos_avanzadas: plane.recursos_avanzadas || 0,
      sistemas_disponibles: sistemasDisponibles,
      sistemas,
      upgrade_costs: UPGRADE_COSTS
    };

    return res.json({
      success: true,
      message: 'Telemetría de combate obtenida',
      plane: planeDetail,
      data: planeDetail
    });

  } catch (err) {
    console.error('❌ [Hangar] Error en getPlaneDetails:', err);
    return res.status(500).json({ success: false, message: 'Error interno en telemetría', error: err.message });
  }
}

/**
 * Eliminar una aeronave del hangar
 */
export async function deletePlane(req, res, next) {
  try {
    const rawId = req.params.id;
    const planeId = /^\d+$/.test(String(rawId)) ? parseInt(rawId, 10) : rawId;
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ success: false, message: 'Base de datos no disponible', error: 'DATABASE_UNAVAILABLE' });
    }

    const { data: plane, error: findError } = await supabase
      .from('planes')
      .select('user_id')
      .eq('id', planeId)
      .single();

    if (findError || !plane) {
      return res.status(404).json({ success: false, message: 'Aeronave no encontrada', error: 'PLANE_NOT_FOUND' });
    }

    if (String(plane.user_id) !== String(userId) && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ success: false, message: 'Permiso denegado para eliminar esta aeronave', error: 'FORBIDDEN' });
    }

    await supabase.from('planes').delete().eq('id', planeId);

    console.log(`🗑️ [Hangar] Aeronave con ID ${planeId} eliminada del hangar militar`);

    return res.json({
      success: true,
      message: 'Aeronave retirada y eliminada del hangar militar'
    });

  } catch (err) {
    console.error('❌ [Hangar] Error en deletePlane:', err);
    return res.status(500).json({ success: false, message: 'Error al eliminar aeronave', error: err.message });
  }
}

/**
 * Exportar reporte de flota de combate en formato CSV militar
 */
export async function exportPlanesCSV(req, res, next) {
  try {
    const supabase = getSupabase();
    const userId = req.user.user_id || req.user.id;
    let userPlanes = [];

    if (supabase) {
      const { data } = await supabase
        .from('planes')
        .select('*')
        .eq('user_id', userId);
      if (data) userPlanes = data;
    }

    const headers = [
      'ID', 'Modelo', 'Tipo', 'Nivel', 
      'Fuselaje_Nv', 'Motor_Nv', 'Avionica_Nv', 'Armas_Nv', 'Promedio_Sistemas',
      'Habilidad_Especial', 'Especial_Nivel', 'Especial_Efecto',
      'Habilidad_Pasiva', 'Pasiva_Nivel', 'Pasiva_Efecto',
      'Mod1', 'Mod1_Nivel', 'Mod2', 'Mod2_Nivel'
    ];

    const catalog = await getFullCatalogModels(supabase);
    const rows = userPlanes.map(p => {
      const nf = p.nivel_fuselaje || 0;
      const nm = p.nivel_motor || 0;
      const na = p.nivel_avionica || 0;
      const nw = p.nivel_armas || 0;
      const avg = ((nf + nm + na + nw) / 4).toFixed(1);
      const model = findModel(catalog, p.avion_id);
      const planeName = model?.name || (p.name && !/^\d+$/.test(p.name) ? p.name : null) || p.avion_id;
      const planeType = model?.type || p.type || 'Caza de Combate';

      return [
        p.id,
        planeName,
        planeType,
        p.nivel,
        nf,
        nm,
        na,
        nw,
        avg,
        p.especial_nombre || '',
        p.especial_nivel_num || '',
        p.especial_efecto || '',
        p.pasiva_nombre || '',
        p.pasiva_nivel_num || '',
        p.pasiva_efecto || '',
        p.mod1_id || '',
        p.mod1_lvl || '',
        p.mod2_id || '',
        p.mod2_lvl || ''
      ];
    });

    const csv = buildSanitizedCSV(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hangar_escuadron.csv"');
    return res.send(csv);

  } catch (err) {
    console.error('❌ [Hangar] Error exportando flota a CSV:', err);
    return res.status(500).json({ success: false, message: 'Error exportando flota', error: err.message });
  }
}

/**
 * Obtener estadísticas de combate y rendimiento de una aeronave
 */
export async function getPlaneStats(req, res, next) {
  try {
    const rawId = req.params.id;
    const planeId = /^\d+$/.test(String(rawId)) ? parseInt(rawId, 10) : rawId;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(404).json({ success: false, message: 'Aeronave no encontrada', error: 'DATABASE_UNAVAILABLE' });
    }

    const { data: plane, error } = await supabase
      .from('planes')
      .select('*')
      .eq('id', planeId)
      .single();

    if (error || !plane) {
      return res.status(404).json({ success: false, message: 'Aeronave no encontrada', error: 'PLANE_NOT_FOUND' });
    }

    const catalog = await getFullCatalogModels(supabase);
    const model = findModel(catalog, plane.avion_id);
    const modelName = model?.name || (plane.name && !/^\d+$/.test(plane.name) ? plane.name : null) || plane.avion_id;
    const modelType = model?.type || plane.type || 'Caza de Combate';

    // Obtener las estadísticas reales del modelo desde Supabase
    let statsBase = {};
    let statsAdvanced = {};

    if (supabase && model) {
      const { data: modelData, error: modelError } = await supabase
        .from('plane_models')
        .select('stats_real')
        .eq('id', model.id)
        .single();

      const rawStats = (!modelError && modelData?.stats_real) ? modelData.stats_real : (model?.stats_real || null);
      if (rawStats) {
        const parsed = typeof rawStats === 'string' ? (() => { try { return JSON.parse(rawStats); } catch (_) { return null; } })() : rawStats;
        if (parsed) {
          statsBase = parsed.base_statistics || {};
          statsAdvanced = parsed.advanced_statistics || {};
        }
      }
    }

    const defaultStats = {
      health: 100,
      top_speed_afterburner: 1260,
      optimal_turning_speed: 648,
      acceleration_afterburner: 45,
      optimal_turn_rate: 39.0,
      afterburner_fuel: 12,
      flare_count: 3
    };

    const baseStats = Object.keys(statsBase).length > 0 ? statsBase : defaultStats;

    const levelFactor = 1 + ((plane.nivel || 1) - 1) / 19;

    // Cargar catálogo de nodos upgrade_nodes_v2
    const allNodes = await getUpgradeNodes(supabase);
    const planeNodes = allNodes[plane.avion_id] || allNodes[String(plane.avion_id)] || {};

    let rutasSistemas = plane.rutas_sistemas || {};
    if (typeof rutasSistemas === 'string') {
      try { rutasSistemas = JSON.parse(rutasSistemas); } catch (_) { rutasSistemas = {}; }
    }

    // Calcular efectos acumulados por categoría
    const efectos = {
      fuselaje:      calculateCategoryEffects(planeNodes, 'fuselaje',      plane.nivel_fuselaje  || 0, rutasSistemas.fuselaje      || {}),
      motor:         calculateCategoryEffects(planeNodes, 'motor',         plane.nivel_motor     || 0, rutasSistemas.motor         || {}),
      avionica:      calculateCategoryEffects(planeNodes, 'avionica',      plane.nivel_avionica  || 0, rutasSistemas.avionica      || {}),
      canones:       calculateCategoryEffects(planeNodes, 'canones',       plane.nivel_armas     || 0, rutasSistemas.canones       || {}),
      misiles_ir:    calculateCategoryEffects(planeNodes, 'misiles_ir',    plane.nivel_armas     || 0, rutasSistemas.misiles_ir    || {}),
      misiles_radar: calculateCategoryEffects(planeNodes, 'misiles_radar', plane.nivel_armas     || 0, rutasSistemas.misiles_radar || {}),
      cohetes:       calculateCategoryEffects(planeNodes, 'cohetes',       plane.nivel_armas     || 0, rutasSistemas.cohetes       || {})
    };

    // Firepower base por rol
    const rol = plane.type || modelType || '';
    let firepowerBase = 1400;
    if (/ligero/i.test(rol)) firepowerBase = 1200;
    else if (/pesado/i.test(rol)) firepowerBase = 1600;
    else if (/interceptor/i.test(rol)) firepowerBase = 1500;
    else if (/ataque/i.test(rol)) firepowerBase = 1800;
    else if (/mediano/i.test(rol)) firepowerBase = 1400;

    // Efectos de Mods
    const modEffects = await getModEffects(supabase);

    const modAgility = calculateModBonus(modEffects, plane.mod1_id, plane.mod1_lvl, 'agility')
                     * calculateModBonus(modEffects, plane.mod2_id, plane.mod2_lvl, 'agility');
    const modArmor   = calculateModBonus(modEffects, plane.mod1_id, plane.mod1_lvl, 'armor')
                     * calculateModBonus(modEffects, plane.mod2_id, plane.mod2_lvl, 'armor');
    const modEcm     = calculateModBonus(modEffects, plane.mod1_id, plane.mod1_lvl, 'ecm')
                     * calculateModBonus(modEffects, plane.mod2_id, plane.mod2_lvl, 'ecm');
    const modRadar   = calculateModBonus(modEffects, plane.mod1_id, plane.mod1_lvl, 'radar')
                     * calculateModBonus(modEffects, plane.mod2_id, plane.mod2_lvl, 'radar');

    const agilityMods = Math.round((modAgility - 1) * 100 * 10) / 10;
    const armorMods   = Math.round((modArmor - 1) * 100 * 10) / 10;
    const ecmMods     = Math.round((modEcm - 1) * 100 * 10) / 10;
    const radarMods   = Math.round((modRadar - 1) * 100 * 10) / 10;

    // Cálculo de estadísticas finales
    // 1. Velocidad: base + efectos motor
    const speedBase = baseStats.top_speed_afterburner || 1260;
    const speedNodos = efectos.motor.velocidad || 0;
    const speedMods = 0;
    const speedTotal = Math.round(speedBase * (1 + speedNodos / 100) * (1 + speedMods / 100));

    // 2. Agilidad: base + efectos fuselaje.agilidad + mods
    const agilityBase = baseStats.optimal_turn_rate || 39.0;
    const agilityNodos = efectos.fuselaje.agilidad || 0;
    const agilityTotal = Math.round((agilityBase * (1 + agilityNodos / 100) * modAgility) * 10) / 10;

    // 3. Blindaje: base × levelFactor + efectos fuselaje.blindaje + mods
    const armorBase = baseStats.health || 100;
    const armorNodos = efectos.fuselaje.blindaje || 0;
    const armorTotal = Math.round(armorBase * levelFactor * (1 + armorNodos / 100) * modArmor);

    // 4. Potencia de Fuego: firepowerBase × levelFactor + efectos armas
    const firepowerNodos = (efectos.canones.potencia || 0) + (efectos.misiles_ir.potencia || 0) + (efectos.misiles_radar.potencia || 0) + (efectos.cohetes.potencia || 0);
    const firepowerTotal = Math.round(firepowerBase * levelFactor * (1 + firepowerNodos / 100));

    // 5. Rango de Radar: base + efectos avionica.radar + mods
    const radarBase = statsAdvanced.radar_range || 5.7;
    const radarNodos = efectos.avionica.radar || 0;
    const radarTotal = Math.round((radarBase * (1 + radarNodos / 100) * modRadar) * 10) / 10;

    // 6. Defensa ECM (base 0)
    const ecmBase = 0;
    const ecmNodos = efectos.avionica.ecm || 0;
    const ecmTotal = Math.round(Math.min(99, ecmNodos * modEcm));

    // 7. Postquemador: base + efectos motor.postquemador
    const afterburnerBase = baseStats.afterburner_fuel || 12;
    const afterburnerNodos = efectos.motor.postquemador || 0;
    const afterburnerTotal = Math.round((afterburnerBase * (1 + afterburnerNodos / 100)) * 10) / 10;

    // 8. Aceleración: base + efectos motor.aceleracion
    const accelerationBase = baseStats.acceleration_afterburner || 45;
    const accelerationNodos = efectos.motor.aceleracion || 0;
    const accelerationTotal = Math.round((accelerationBase * (1 + accelerationNodos / 100)) * 10) / 10;

    // Traits del avión
    if (!plane.traits && model?.traits) {
      plane.traits = model.traits;
    }
    const planeTraits = getPlaneTraitsWithInfo(plane);

    const labels = ['Velocidad', 'Agilidad', 'Blindaje', 'Potencia de Fuego', 'Rango de Radar', 'Defensa ECM', 'Postquemador', 'Aceleración'];
    const stat_keys = ['speed', 'agility', 'armor', 'firepower', 'radar', 'ecm', 'afterburner', 'acceleration'];
    const units = {
      speed: 'km/h',
      agility: '°/s',
      armor: 'HP',
      firepower: 'DPS',
      radar: 'km',
      ecm: '%',
      afterburner: 's',
      acceleration: 'm/s²'
    };

    const max_reference = {
      speed: 2500,
      agility: 60.0,
      armor: 2500,
      firepower: 3500,
      radar: 15.0,
      ecm: 100,
      afterburner: 30.0,
      acceleration: 80.0
    };

    const base_raw = {
      speed: speedBase,
      agility: agilityBase,
      armor: armorBase,
      firepower: firepowerBase,
      radar: radarBase,
      ecm: ecmBase,
      afterburner: afterburnerBase,
      acceleration: accelerationBase
    };

    const current_raw = {
      speed: speedTotal,
      agility: agilityTotal,
      armor: armorTotal,
      firepower: firepowerTotal,
      radar: radarTotal,
      ecm: ecmTotal,
      afterburner: afterburnerTotal,
      acceleration: accelerationTotal
    };

    const current = {};
    const base = {};
    stat_keys.forEach(k => {
      current[k] = Math.min(100, Math.round((current_raw[k] / max_reference[k]) * 100));
      base[k] = Math.min(100, Math.round((base_raw[k] / max_reference[k]) * 100));
    });

    const mod1Obj = DEFAULT_PLANE_MODS.find(m => String(m.id) === String(plane.mod1_id));
    const mod2Obj = DEFAULT_PLANE_MODS.find(m => String(m.id) === String(plane.mod2_id));

    return res.json({
      success: true,
      message: 'Estadísticas de aeronave calculadas',
      plane: {
        id: plane.id,
        model_name: modelName,
        type: modelType,
        nivel: plane.nivel,
        especial_nombre: plane.especial_nombre,
        especial_nivel_num: plane.especial_nivel_num,
        especial_efecto: plane.especial_efecto,
        pasiva_nombre: plane.pasiva_nombre,
        pasiva_nivel_num: plane.pasiva_nivel_num,
        pasiva_efecto: plane.pasiva_efecto,
        mod1: mod1Obj ? mod1Obj.name : plane.mod1_id,
        mod1_id: plane.mod1_id,
        mod1_type: mod1Obj?.type || null,
        mod1_lvl: plane.mod1_lvl,
        mod2: mod2Obj ? mod2Obj.name : plane.mod2_id,
        mod2_id: plane.mod2_id,
        mod2_type: mod2Obj?.type || null,
        mod2_lvl: plane.mod2_lvl,
        nivel_fuselaje: plane.nivel_fuselaje || 0,
        nivel_motor: plane.nivel_motor || 0,
        nivel_avionica: plane.nivel_avionica || 0,
        nivel_armas: plane.nivel_armas || 0,
        sistemas_desbloqueados: (plane.nivel || 1) >= 6,
        traits: planeTraits,
        stats_real: {
          base_statistics: baseStats,
          advanced_statistics: statsAdvanced
        }
      },
      labels,
      stat_keys,
      units,
      base,
      current,
      base_raw,
      current_raw,
      breakdown: {
        speed:        { base: speedBase, nodos: speedNodos, mods: speedMods, level_factor: 1.0, total: speedTotal },
        agility:      { base: agilityBase, nodos: agilityNodos, mods: agilityMods, level_factor: 1.0, total: agilityTotal },
        armor:        { base: armorBase, nodos: armorNodos, mods: armorMods, level_factor: levelFactor, total: armorTotal },
        firepower:    { base: firepowerBase, nodos: firepowerNodos, mods: 0, level_factor: levelFactor, total: firepowerTotal },
        radar:        { base: radarBase, nodos: radarNodos, mods: radarMods, level_factor: 1.0, total: radarTotal },
        ecm:          { base: ecmBase, nodos: ecmNodos, mods: ecmMods, level_factor: 1.0, total: ecmTotal },
        afterburner:  { base: afterburnerBase, nodos: afterburnerNodos, mods: 0, level_factor: 1.0, total: afterburnerTotal },
        acceleration: { base: accelerationBase, nodos: accelerationNodos, mods: 0, level_factor: 1.0, total: accelerationTotal }
      }
    });

  } catch (err) {
    console.error('❌ [Hangar] Error calculando estadísticas de aeronave:', err);
    return res.status(500).json({ success: false, message: 'Error interno en estadísticas', error: err.message });
  }
}

/**
 * Recomendar build militar táctica según estilo de juego (Tarea 7)
 */
export async function getRecommendedBuild(req, res) {
  try {
    const rawId = req.params.planeId || req.params.id;
    const planeId = /^\d+$/.test(String(rawId)) ? parseInt(rawId, 10) : rawId;
    const { playstyle } = req.query; // 'agresivo', 'defensivo', 'apoyo'
    const supabase = getSupabase();
    
    // Obtener datos del avión
    let plane = null;
    if (supabase) {
      const { data } = await supabase
        .from('planes')
        .select('*')
        .eq('id', planeId)
        .single();
      plane = data;
    }
    
    // Lógica de recomendación
    const recommendations = {
      agresivo: {
        fuselaje: 4,
        motor: 8,
        avionica: 2,
        armas: 7,
        mods: ['m1', 'm9'] // Giro Temerario, Armas Aniquiladoras
      },
      defensivo: {
        fuselaje: 8,
        motor: 4,
        avionica: 6,
        armas: 3,
        mods: ['m3', 'm7'] // Resistencia a Explosiones, Bengalas Disruptivas
      },
      apoyo: {
        fuselaje: 5,
        motor: 5,
        avionica: 8,
        armas: 4,
        mods: ['m2', 'm10'] // Maniobrabilidad Ideal, Guiado Mejorado
      }
    };
    
    const build = recommendations[playstyle] || recommendations.agresivo;
    
    // Calcular costos
    const UPGRADE_COSTS = {
      1: { piezas: 100, avanzadas: 0 },
      2: { piezas: 250, avanzadas: 0 },
      3: { piezas: 500, avanzadas: 10 },
      4: { piezas: 800, avanzadas: 25 },
      5: { piezas: 1200, avanzadas: 50 },
      6: { piezas: 1800, avanzadas: 100 },
      7: { piezas: 2500, avanzadas: 200 },
      8: { piezas: 3500, avanzadas: 350 }
    };
    
    let totalPiezas = 0;
    let totalAvanzadas = 0;
    
    ['fuselaje', 'motor', 'avionica', 'armas'].forEach(sistema => {
      const nivel = build[sistema];
      for (let i = 1; i <= nivel; i++) {
        totalPiezas += UPGRADE_COSTS[i].piezas;
        totalAvanzadas += UPGRADE_COSTS[i].avanzadas;
      }
    });
    
    return res.json({
      success: true,
      playstyle: playstyle || 'agresivo',
      plane,
      build,
      cost: {
        piezas: totalPiezas,
        avanzadas: totalAvanzadas
      }
    });
  } catch (err) {
    console.error('❌ Error en getRecommendedBuild:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}