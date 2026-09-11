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
import { getUpgradeEffects, calculateSystemBonus } from '../utils/upgradeEffects.js';
import { getModEffects, calculateModBonus, getModDescription } from '../utils/modEffects.js';
import { getPlaneTraitsWithInfo } from '../utils/traits.js';
import { getUpgradeNodes, getNode, calculateNodeEffects } from '../utils/upgradeNodes.js';

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

// Catálogo oficial de modificaciones tácticas
const DEFAULT_PLANE_MODS = [
  { id: 1, name: 'Radar AESA Longbow', type: 'Aviónica' },
  { id: 2, name: 'Pod de Guerra Electrónica ECM', type: 'Defensa' },
  { id: 3, name: 'Postquemador Vectorial 3D', type: 'Propulsión' },
  { id: 4, name: 'Blindaje de Titanio Reforzado', type: 'Estructura' },
  { id: 5, name: 'Cañón Rotativo Vulcan 20mm', type: 'Armamento' },
  { id: 6, name: 'Bahía Interna de Misiles BVR', type: 'Armamento' },
  { id: 7, name: 'Sistema Óptico IRST Cuántico', type: 'Sensores' },
  { id: 8, name: 'Recubrimiento RAM Anti-Radar', type: 'Sigilo' }
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
 * Obtener detalles y telemetría de una aeronave por ID
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

    const isUnlocked = (plane.nivel || 1) >= 6;
    const planeLvl = plane.nivel || 1;
    const nf = plane.nivel_fuselaje || 0;
    const nm = plane.nivel_motor || 0;
    const na = plane.nivel_avionica || 0;
    const nw = plane.nivel_armas || 0;

    // Cargar nodos de Upgrades 2.0 (Supabase con fallback y caché en memoria)
    const allNodes = await getUpgradeNodes(supabase);

    const sistemasDisponibles = model?.sistemas_disponibles || plane?.sistemas_disponibles || {
      fuselaje: true,
      motor: true,
      avionica: true,
      canones: 'precision',
      misiles_ir: true
    };

    // Constructor de sistema con nodos 2.0 (12 nodos, rutas A/B, nodo actual y siguiente)
    function buildSystemObject(sysKey, nodeSysKey, nombre, descripcion, nivel) {
      const allSysNodes = (allNodes && allNodes[nodeSysKey]) ? [
        ...Object.values(allNodes[nodeSysKey].base || {}),
        ...Object.values(allNodes[nodeSysKey].A || {}),
        ...Object.values(allNodes[nodeSysKey].B || {})
      ].sort((a, b) => a.nivel - b.nivel || (a.ruta === 'base' ? -1 : a.ruta.localeCompare(b.ruta))) : [];

      const rutasSys = plane[`rutas_${sysKey}`] || plane[`rutas_${nodeSysKey}`] || {};
      const currentRoute = nivel <= 4 ? 'base' : (rutasSys[nivel] || plane[`ruta_${sysKey}`] || plane[`ruta_${nodeSysKey}`] || 'A');
      const currentNode = nivel > 0 ? (allNodes?.[nodeSysKey]?.[currentRoute]?.[nivel] || null) : null;

      const nextLevel = nivel + 1;
      const nextRoute = nextLevel <= 4 ? 'base' : (rutasSys[nextLevel] || 'A');
      const nextNode = nextLevel <= 8 ? (allNodes?.[nodeSysKey]?.[nextRoute]?.[nextLevel] || null) : null;

      const rutasDisponibles = {};
      [5, 6, 7, 8].forEach(lvl => {
        const nodeA = allNodes?.[nodeSysKey]?.A?.[lvl];
        const nodeB = allNodes?.[nodeSysKey]?.B?.[lvl];
        rutasDisponibles[lvl] = [
          { ruta: 'A', node_name: nodeA?.node_name || '', effects: nodeA?.effects || {}, requirement_level: nodeA?.requirement_level || 12 },
          { ruta: 'B', node_name: nodeB?.node_name || '', effects: nodeB?.effects || {}, requirement_level: nodeB?.requirement_level || 12 }
        ];
      });

      const nodosCompletos = allSysNodes.map(n => ({
        id: n.id,
        sistema: n.sistema,
        nivel: n.nivel,
        ruta: n.ruta,
        node_name: n.node_name,
        effects: n.effects,
        requirement_level: n.requirement_level,
        cost_piezas: n.cost_piezas || 0,
        cost_avanzadas: n.cost_avanzadas || 0,
        desbloqueado: planeLvl >= (n.requirement_level || 6) && nivel >= n.nivel
      }));

      return {
        nombre,
        descripcion,
        nivel,
        max: 8,
        disponible: isUnlocked,
        costo_siguiente: UPGRADE_COSTS[nivel + 1] || null,
        nodo_actual: currentNode ? {
          nivel,
          ruta: currentRoute,
          node_name: currentNode.node_name,
          effects: currentNode.effects || {}
        } : null,
        nodo_siguiente: nextNode ? {
          nivel: nextLevel,
          ruta: nextRoute,
          node_name: nextNode.node_name,
          effects: nextNode.effects || {},
          requirement_level: nextNode.requirement_level || 6,
          desbloqueado: planeLvl >= (nextNode.requirement_level || 6)
        } : null,
        rutas_disponibles: rutasDisponibles,
        nodos_completos: nodosCompletos
      };
    }

    // Filtrar y armar los sistemas disponibles del avión
    const sistemas = {};

    if (sistemasDisponibles.fuselaje !== false) {
      sistemas.fuselaje = buildSystemObject('fuselaje', 'fuselaje', 'Fuselaje', 'Resistencia estructural, blindaje e integridad', nf);
    }

    if (sistemasDisponibles.motor !== false) {
      sistemas.motor = buildSystemObject('motor', 'motor', 'Motor', 'Empuje, aceleración, postcombustión y velocidad punta', nm);
    }

    if (sistemasDisponibles.avionica !== false) {
      sistemas.avionica = buildSystemObject('avionica', 'avionica', 'Aviónica', 'Adquisición de radar, tiempo de enganche y ECM', na);
    }

    // Armas base / compatibilidad general
    const primaryCannonSys = sistemasDisponibles.canones === 'asalto' ? 'canones_asalto' : 'canones_precision';
    if (sistemasDisponibles.canones !== null && sistemasDisponibles.armas !== false) {
      sistemas.armas = buildSystemObject('armas', primaryCannonSys, 'Armas', 'Cadencia de fuego, tiempo de recarga y daño balístico', nw);
    }

    // Armas específicas según sistemas_disponibles
    if (sistemasDisponibles.canones === 'precision' || sistemasDisponibles.canones_precision === true || (Array.isArray(sistemasDisponibles.armas) && sistemasDisponibles.armas.includes('canon_precision'))) {
      sistemas.canones_precision = buildSystemObject('canones_precision', 'canones_precision', 'Cañones de Precisión', 'Balística de alta precisión, daño crítico y disparos a distancia', plane.nivel_canones_precision || nw);
    }
    if (sistemasDisponibles.canones === 'asalto' || sistemasDisponibles.canones_asalto === true || (Array.isArray(sistemasDisponibles.armas) && sistemasDisponibles.armas.includes('canon_asalto'))) {
      sistemas.canones_asalto = buildSystemObject('canones_asalto', 'canones_asalto', 'Cañones de Asalto', 'Fuego de saturación, cadencia masiva y penetración pesada', plane.nivel_canones_asalto || nw);
    }
    if (sistemasDisponibles.misiles_ir === true || (Array.isArray(sistemasDisponibles.armas) && (sistemasDisponibles.armas.includes('misiles_ir') || sistemasDisponibles.armas.includes('misiles_corto')))) {
      sistemas.misiles_ir = buildSystemObject('misiles_ir', 'misiles_ir', 'Misiles IR (Corto Alcance)', 'Misiles térmicos de persecución y combate cercano', plane.nivel_misiles_ir || nw);
    }
    if (sistemasDisponibles.cohetes === true || (Array.isArray(sistemasDisponibles.armas) && sistemasDisponibles.armas.includes('cohetes'))) {
      sistemas.cohetes = buildSystemObject('cohetes', 'cohetes', 'Cohetes de Asalto', 'Salvas de cohetes no guiados de alto impacto', plane.nivel_cohetes || nw);
    }
    if (sistemasDisponibles.misiles_manual === true || (Array.isArray(sistemasDisponibles.armas) && (sistemasDisponibles.armas.includes('misiles_manual') || sistemasDisponibles.armas.includes('misiles_guiados')))) {
      sistemas.misiles_manual = buildSystemObject('misiles_manual', 'misiles_manual', 'Misiles Guiados Manuales', 'Misiles por comando manual para impacto quirúrgico', plane.nivel_misiles_manual || nw);
    }
    if (sistemasDisponibles.misiles_radar === true || sistemasDisponibles.misiles_largo === true || (Array.isArray(sistemasDisponibles.armas) && (sistemasDisponibles.armas.includes('misiles_radar') || sistemasDisponibles.armas.includes('misiles_bvr') || sistemasDisponibles.armas.includes('misiles_medio')))) {
      sistemas.misiles_radar = buildSystemObject('misiles_radar', 'misiles_radar', 'Misiles de Radar (Largo Alcance)', 'Misiles guiados por radar BVR más allá del alcance visual', plane.nivel_misiles_radar || nw);
    }

    const planeDetail = {
      id: plane.id,
      user_id: plane.user_id,
      avion_id: plane.avion_id,
      model_name: modelName,
      type: modelType,
      image_url: model?.image_url || null,
      nivel: plane.nivel,
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

    const labels = ['Velocidad', 'Maniobrabilidad', 'Blindaje', 'Potencia de Fuego', 'Rango de Radar', 'Defensa ECM'];
    const stat_keys = ['speed', 'agility', 'armor', 'firepower', 'radar', 'ecm'];
    const units = { speed: 'km/h', agility: '°/s', armor: 'HP', firepower: 'DPS', radar: 'km', ecm: '%' };

    const max_raw = {
      speed: baseStats.top_speed_afterburner || 1260,
      agility: baseStats.optimal_turn_rate || 39.0,
      armor: baseStats.health || 100,
      firepower: 1600, // TODO: obtener de armas (requiere stats de armas)
      radar: statsAdvanced.radar_range || 5.7,
      ecm: 90 // TODO: obtener de avionica
    };

    // Bonus por nivel de sistema (basados en la Wiki)
    const bonusFuselaje = 1 + ((plane.nivel_fuselaje || 0) * 0.03);   // +3% HP por nivel
    const bonusMotor = 1 + ((plane.nivel_motor || 0) * 0.025);       // +2.5% speed por nivel
    const bonusAvionica = 1 + ((plane.nivel_avionica || 0) * 0.03);  // +3% radar por nivel
    const bonusArmas = 1 + ((plane.nivel_armas || 0) * 0.035);       // +3.5% daño por nivel

    // Aplicar a las stats base
    const current_raw = {
      speed: Math.round(max_raw.speed * bonusMotor),
      agility: Math.round(max_raw.agility * (1 + ((plane.nivel_fuselaje || 0) * 0.015))),
      armor: Math.round(max_raw.armor * bonusFuselaje),
      firepower: Math.round(max_raw.firepower * bonusArmas),
      radar: Math.round(max_raw.radar * bonusAvionica),
      ecm: Math.round(Math.min(99, max_raw.ecm * bonusAvionica))
    };

    // ✅ CARGAR TRAITS DEL AVIÓN
    if (!plane.traits && model?.traits) {
      plane.traits = model.traits;
    }
    const planeTraits = getPlaneTraitsWithInfo(plane);

    const base_raw = { ...max_raw };
    const current = {};
    const base = {};

    stat_keys.forEach(k => {
      current[k] = Math.min(100, Math.round((current_raw[k] / max_raw[k]) * 100));
      base[k] = 100;
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
        especial: plane.especial_nombre,
        especial_nivel_num: plane.especial_nivel_num,
        especial_efecto: plane.especial_efecto,
        pasiva: plane.pasiva_nombre,
        pasiva_nivel_num: plane.pasiva_nivel_num,
        pasiva_efecto: plane.pasiva_efecto,
        mod1: mod1Obj ? mod1Obj.name : plane.mod1_id,
        mod1_type: mod1Obj?.type || null,
        mod1_lvl: plane.mod1_lvl,
        mod2: mod2Obj ? mod2Obj.name : plane.mod2_id,
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
      current_raw
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