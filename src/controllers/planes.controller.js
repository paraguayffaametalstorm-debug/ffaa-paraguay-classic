import { getSupabase } from '../db/supabase.js';
import { PlaneSchema, UpdatePlaneSystemSchema } from '../utils/schemas.js';
import { buildSanitizedCSV } from '../utils/csv.js';

// Default static models catalog
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

// Costos oficiales de recursos para Upgrades 2.0 (Niveles 1 a 8)
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

export async function getCatalogModels(req, res) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('plane_models')
        .select('*')
        .order('name');
      
      if (!error && data && data.length > 0) {
        return res.json({ success: true, models: data });
      }
    }
    return res.json({ success: true, models: DEFAULT_PLANE_MODELS });
  } catch (error) {
    console.error('❌ Error en getCatalogModels:', error);
    return res.json({ success: true, models: DEFAULT_PLANE_MODELS });
  }
}

export async function getCatalogMods(req, res) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('plane_mods')
        .select('*')
        .order('name');
      
      if (!error && data && data.length > 0) {
        return res.json({ success: true, mods: data });
      }
    }
    return res.json({ success: true, mods: DEFAULT_PLANE_MODS });
  } catch (error) {
    console.error('❌ Error en getCatalogMods:', error);
    return res.json({ success: true, mods: DEFAULT_PLANE_MODS });
  }
}

export async function getMyPlanes(req, res, next) {
  try {
    const supabase = getSupabase();
    const userId = req.user.user_id || req.user.id;

    if (supabase) {
      const { data, error } = await supabase
        .from('planes')
        .select(`
          id,
          user_id,
          avion_id,
          nivel,
          especial_nombre,
          especial_nivel,
          pasiva_nombre,
          pasiva_nivel,
          mod1_id,
          mod1_lvl,
          mod2_id,
          mod2_lvl,
          nivel_fuselaje,
          nivel_motor,
          nivel_avionica,
          nivel_armas,
          recursos_piezas,
          recursos_avanzadas
        `)
        .or(`user_id.eq.${userId}`)
        .order('id', { ascending: true });

      if (!error && data) {
        const planes = data.map(p => {
          const nf = p.nivel_fuselaje || 0;
          const nm = p.nivel_motor || 0;
          const na = p.nivel_avionica || 0;
          const nw = p.nivel_armas || 0;
          const nivelSistemas = Math.floor((nf + nm + na + nw) / 4);
          const model = DEFAULT_PLANE_MODELS.find(m => String(m.id) === String(p.avion_id));

          return {
            id: p.id,
            user_id: p.user_id,
            avion_id: p.avion_id,
            model_name: model?.name || p.avion_id,
            name: model?.name || p.avion_id,
            type: model?.type || 'Caza de Combate',
            nivel: p.nivel,
            especial_nombre: p.especial_nombre || null,
            especial_nivel: p.especial_nivel || null,
            pasiva_nombre: p.pasiva_nombre || null,
            pasiva_nivel: p.pasiva_nivel || null,
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
        return res.json({ success: true, planes, total: planes.length });
      }
    }

    res.json({ success: true, planes: [], total: 0 });
  } catch (err) {
    next(err);
  }
}

export async function addPlane(req, res, next) {
  try {
    const data = PlaneSchema.parse(req.body);
    const userId = req.user.user_id || req.user.id;
    const model = DEFAULT_PLANE_MODELS.find(m => String(m.id) === String(data.avion_id));

    const nf = data.nivel_fuselaje || 0;
    const nm = data.nivel_motor || 0;
    const na = data.nivel_avionica || 0;
    const nw = data.nivel_armas || 0;

    const planePayload = {
      user_id: userId,
      avion_id: data.avion_id,
      nivel: data.nivel,
      especial_nombre: data.especial_nombre || null,
      especial_nivel: data.especial_nivel || null,
      pasiva_nombre: data.pasiva_nombre || null,
      pasiva_nivel: data.pasiva_nivel || null,
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

    const supabase = getSupabase();
    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    const { data: createdPlane, error: insertError } = await supabase
      .from('planes')
      .insert(planePayload)
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({
      success: true,
      message: 'Aeronave registrada en el hangar',
      plane: {
        ...(createdPlane || planePayload),
        model_name: model?.name || data.avion_id,
        name: model?.name || data.avion_id,
        type: model?.type || 'Caza de Combate',
        sistemas_desbloqueados: (data.nivel || 1) >= 6
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePlane(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = PlaneSchema.parse(req.body);
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    const { data: existing, error: findError } = await supabase
      .from('planes')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !existing) {
      return res.status(404).json({ error: 'Aeronave no encontrada', code: 'PLANE_NOT_FOUND' });
    }

    if (String(existing.user_id) !== String(userId) && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Permisos denegados para modificar esta aeronave', code: 'FORBIDDEN' });
    }

    const updatePayload = {
      avion_id: data.avion_id,
      nivel: data.nivel,
      especial_nombre: data.especial_nombre || null,
      pasiva_nombre: data.pasiva_nombre || null,
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
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const model = DEFAULT_PLANE_MODELS.find(m => String(m.id) === String(data.avion_id));

    res.json({
      success: true,
      message: 'Aeronave actualizada correctamente',
      plane: {
        ...(updated || updatePayload),
        model_name: model?.name || data.avion_id,
        name: model?.name || data.avion_id,
        type: model?.type || 'Caza de Combate'
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePlaneSystem(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const parsed = UpdatePlaneSystemSchema.parse(req.body);
    const { sistema, nivel, piezas, avanzadas } = parsed;
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    const { data: plane, error: findError } = await supabase
      .from('planes')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !plane) {
      return res.status(404).json({ error: 'Aeronave no encontrada', code: 'PLANE_NOT_FOUND' });
    }

    if (String(plane.user_id) !== String(userId) && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Permisos denegados para modificar esta aeronave', code: 'FORBIDDEN' });
    }

    if ((plane.nivel || 1) < 6) {
      return res.status(400).json({
        error: 'Los sistemas de Upgrades 2.0 requieren que la aeronave sea Nivel 6 o superior',
        code: 'UPGRADE_LOCKED_LEVEL_TOO_LOW'
      });
    }

    const systemColumnMap = {
      fuselaje: 'nivel_fuselaje',
      motor: 'nivel_motor',
      avionica: 'nivel_avionica',
      armas: 'nivel_armas'
    };

    const columnName = systemColumnMap[sistema];
    if (!columnName) {
      return res.status(400).json({ error: 'Sistema inválido especificado' });
    }

    const updatePayload = {
      [columnName]: nivel
    };
    if (piezas !== undefined) updatePayload.recursos_piezas = piezas;
    if (avanzadas !== undefined) updatePayload.recursos_avanzadas = avanzadas;

    const { data: updatedPlane, error: updateErr } = await supabase
      .from('planes')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    const finalPlane = updatedPlane || { ...plane, ...updatePayload };

    res.json({
      success: true,
      message: `Sistema ${sistema.toUpperCase()} actualizado a nivel ${nivel}`,
      plane: {
        ...finalPlane,
        nivel_fuselaje: finalPlane.nivel_fuselaje || 0,
        nivel_motor: finalPlane.nivel_motor || 0,
        nivel_avionica: finalPlane.nivel_avionica || 0,
        nivel_armas: finalPlane.nivel_armas || 0,
        nivel_sistemas: Math.floor(((finalPlane.nivel_fuselaje || 0) + (finalPlane.nivel_motor || 0) + (finalPlane.nivel_avionica || 0) + (finalPlane.nivel_armas || 0)) / 4)
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getPlaneDetails(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(404).json({ error: 'Aeronave no encontrada' });
    }

    const { data: plane, error } = await supabase
      .from('planes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !plane) {
      return res.status(404).json({ error: 'Aeronave no encontrada', code: 'PLANE_NOT_FOUND' });
    }

    const model = DEFAULT_PLANE_MODELS.find(m => String(m.id) === String(plane.avion_id));
    const modelName = model?.name || plane.avion_id;
    const modelType = model?.type || 'Caza de Combate';

    const isUnlocked = (plane.nivel || 1) >= 6;
    const nf = plane.nivel_fuselaje || 0;
    const nm = plane.nivel_motor || 0;
    const na = plane.nivel_avionica || 0;
    const nw = plane.nivel_armas || 0;

    res.json({
      success: true,
      plane: {
        id: plane.id,
        user_id: plane.user_id,
        avion_id: plane.avion_id,
        model_name: modelName,
        type: modelType,
        nivel: plane.nivel,
        especial_nombre: plane.especial_nombre,
        pasiva_nombre: plane.pasiva_nombre,
        mod1_id: plane.mod1_id,
        mod1_lvl: plane.mod1_lvl,
        mod2_id: plane.mod2_id,
        mod2_lvl: plane.mod2_lvl,
        desbloqueado_upgrades: isUnlocked,
        recursos_piezas: plane.recursos_piezas || 0,
        recursos_avanzadas: plane.recursos_avanzadas || 0,
        sistemas: {
          fuselaje: {
            nombre: 'Fuselaje',
            descripcion: 'Resistencia estructural, blindaje e integridad del fuselaje',
            nivel: nf,
            max: 8,
            disponible: isUnlocked,
            costo_siguiente: UPGRADE_COSTS[nf + 1] || null
          },
          motor: {
            nombre: 'Motor',
            descripcion: 'Empuje, aceleración, postcombustión y velocidad punta',
            nivel: nm,
            max: 8,
            disponible: isUnlocked,
            costo_siguiente: UPGRADE_COSTS[nm + 1] || null
          },
          avionica: {
            nombre: 'Aviónica',
            descripcion: 'Adquisición de radar, tiempo de enganche y contramedidas ECM',
            nivel: na,
            max: 8,
            disponible: isUnlocked,
            costo_siguiente: UPGRADE_COSTS[na + 1] || null
          },
          armas: {
            nombre: 'Armas',
            descripcion: 'Cadencia de fuego, tiempo de recarga y daño balístico/misiles',
            nivel: nw,
            max: 8,
            disponible: isUnlocked,
            costo_siguiente: UPGRADE_COSTS[nw + 1] || null
          }
        },
        upgrade_costs: UPGRADE_COSTS
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function deletePlane(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const userId = req.user.user_id || req.user.id;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: 'Database client unavailable' });
    }

    const { data: plane, error: findError } = await supabase
      .from('planes')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !plane) {
      return res.status(404).json({ error: 'Aeronave no encontrada', code: 'PLANE_NOT_FOUND' });
    }

    if (String(plane.user_id) !== String(userId) && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Permisos denegados para eliminar esta aeronave', code: 'FORBIDDEN' });
    }

    await supabase.from('planes').delete().eq('id', id);

    res.json({ success: true, message: 'Aeronave eliminada del hangar' });
  } catch (err) {
    next(err);
  }
}

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
      'Habilidad_Especial', 'Habilidad_Pasiva', 'Mod1', 'Mod1_Nivel', 'Mod2', 'Mod2_Nivel'
    ];
    const rows = userPlanes.map(p => {
      const nf = p.nivel_fuselaje || 0;
      const nm = p.nivel_motor || 0;
      const na = p.nivel_avionica || 0;
      const nw = p.nivel_armas || 0;
      const avg = ((nf + nm + na + nw) / 4).toFixed(1);
      const model = DEFAULT_PLANE_MODELS.find(m => String(m.id) === String(p.avion_id));

      return [
        p.id,
        model?.name || p.avion_id,
        model?.type || 'Caza de Combate',
        p.nivel,
        nf,
        nm,
        na,
        nw,
        avg,
        p.especial_nombre || '',
        p.pasiva_nombre || '',
        p.mod1_id || '',
        p.mod1_lvl || '',
        p.mod2_id || '',
        p.mod2_lvl || ''
      ];
    });

    const csv = buildSanitizedCSV(headers, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="hangar_escuadron.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function getPlaneStats(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(404).json({ error: 'Aeronave no encontrada' });
    }

    const { data: plane, error } = await supabase
      .from('planes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !plane) {
      return res.status(404).json({ error: 'Aeronave no encontrada' });
    }

    const model = DEFAULT_PLANE_MODELS.find(m => String(m.id) === String(plane.avion_id));
    const modelName = model?.name || plane.avion_id;
    const modelType = model?.type || 'Caza de Combate';

    const labels = ['Velocidad', 'Maniobrabilidad', 'Blindaje', 'Potencia de Fuego', 'Rango de Radar', 'Defensa ECM'];
    const stat_keys = ['speed', 'agility', 'armor', 'firepower', 'radar', 'ecm'];
    const units = { speed: 'km/h', agility: '°/s', armor: 'HP', firepower: 'DPS', radar: 'km', ecm: '%' };

    const max_raw = {
      speed: 2800,
      agility: 42,
      armor: 3200,
      firepower: 1600,
      radar: 180,
      ecm: 90
    };

    const levelFactor = (plane.nivel || 1) / 20;

    const bonusMotor = 1 + ((plane.nivel_motor || 0) * 0.025);
    const bonusFuselaje = 1 + ((plane.nivel_fuselaje || 0) * 0.03);
    const bonusArmas = 1 + ((plane.nivel_armas || 0) * 0.035);
    const bonusAvionica = 1 + ((plane.nivel_avionica || 0) * 0.03);

    const current_raw = {
      speed: Math.round(max_raw.speed * (0.6 + 0.4 * levelFactor) * bonusMotor),
      agility: Math.round(max_raw.agility * (0.6 + 0.4 * levelFactor) * (1 + ((plane.nivel_fuselaje || 0) * 0.015))),
      armor: Math.round(max_raw.armor * (0.5 + 0.5 * levelFactor) * bonusFuselaje),
      firepower: Math.round(max_raw.firepower * (0.5 + 0.5 * levelFactor) * bonusArmas),
      radar: Math.round(max_raw.radar * (0.6 + 0.4 * levelFactor) * bonusAvionica),
      ecm: Math.round(Math.min(99, max_raw.ecm * (0.4 + 0.6 * levelFactor) * bonusAvionica))
    };

    const base_raw = { ...max_raw };

    const current = {};
    const base = {};
    stat_keys.forEach(k => {
      current[k] = Math.min(100, Math.round((current_raw[k] / max_raw[k]) * 100));
      base[k] = 100;
    });

    const mod1Obj = DEFAULT_PLANE_MODS.find(m => String(m.id) === String(plane.mod1_id));
    const mod2Obj = DEFAULT_PLANE_MODS.find(m => String(m.id) === String(plane.mod2_id));

    res.json({
      success: true,
      plane: {
        id: plane.id,
        model_name: modelName,
        type: modelType,
        nivel: plane.nivel,
        especial: plane.especial_nombre,
        pasiva: plane.pasiva_nombre,
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
        sistemas_desbloqueados: (plane.nivel || 1) >= 6
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
    next(err);
  }
}
