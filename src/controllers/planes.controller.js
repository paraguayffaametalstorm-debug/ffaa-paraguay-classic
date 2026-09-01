import { memoryStore, getSupabase } from '../db/supabase.js';
import { PlaneSchema, UpdatePlaneSystemSchema } from '../utils/schemas.js';
import { buildSanitizedCSV } from '../utils/csv.js';

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
    return res.json({ success: true, models: memoryStore.planeModels || [] });
  } catch (error) {
    console.error('❌ Error en getCatalogModels:', error);
    return res.json({ success: true, models: memoryStore.planeModels || [] });
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
    return res.json({ success: true, mods: memoryStore.planeMods || [] });
  } catch (error) {
    console.error('❌ Error en getCatalogMods:', error);
    return res.json({ success: true, mods: memoryStore.planeMods || [] });
  }
}

export async function getMyPlanes(req, res, next) {
  try {
    const supabase = getSupabase();
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
          recursos_avanzadas,
          plane_models ( id, name, type )
        `)
        .eq('user_id', req.user.user_id)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        const planes = data.map(p => {
          const nf = p.nivel_fuselaje || 0;
          const nm = p.nivel_motor || 0;
          const na = p.nivel_avionica || 0;
          const nw = p.nivel_armas || 0;
          const nivelSistemas = Math.floor((nf + nm + na + nw) / 4);

          return {
            id: p.id,
            user_id: p.user_id,
            avion_id: p.avion_id,
            model_name: p.plane_models?.name || p.avion_id,
            name: p.plane_models?.name || p.avion_id,
            type: p.plane_models?.type || 'Caza de Combate',
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
            sistemas_desbloqueados: p.nivel >= 6
          };
        });
        return res.json({ success: true, planes, total: planes.length });
      }
    }

    const planes = memoryStore.userPlanes
      .filter(p => p.user_id === req.user.user_id)
      .map(p => {
        const model = memoryStore.planeModels.find(m => String(m.id) === String(p.avion_id));
        const nf = p.nivel_fuselaje || 0;
        const nm = p.nivel_motor || 0;
        const na = p.nivel_avionica || 0;
        const nw = p.nivel_armas || 0;
        const nivelSistemas = Math.floor((nf + nm + na + nw) / 4);

        return {
          ...p,
          model_name: p.model_name || model?.name || p.name || p.avion_id,
          name: p.name || model?.name || p.avion_id,
          type: p.type || model?.type || 'Caza de Combate',
          nivel_fuselaje: nf,
          nivel_motor: nm,
          nivel_avionica: na,
          nivel_armas: nw,
          nivel_sistemas: nivelSistemas,
          recursos_piezas: p.recursos_piezas || 0,
          recursos_avanzadas: p.recursos_avanzadas || 0,
          sistemas_desbloqueados: p.nivel >= 6
        };
      });

    res.json({ success: true, planes, total: planes.length });
  } catch (err) {
    next(err);
  }
}

export async function addPlane(req, res, next) {
  try {
    const data = PlaneSchema.parse(req.body);
    const model = memoryStore.planeModels.find(m => String(m.id) === String(data.avion_id));
    const mod1 = memoryStore.planeMods.find(m => String(m.id) === String(data.mod1_id));
    const mod2 = memoryStore.planeMods.find(m => String(m.id) === String(data.mod2_id));

    const nf = data.nivel_fuselaje || 0;
    const nm = data.nivel_motor || 0;
    const na = data.nivel_avionica || 0;
    const nw = data.nivel_armas || 0;

    const newPlane = {
      id: memoryStore.userPlanes.length + 1,
      user_id: req.user.user_id,
      avion_id: data.avion_id,
      name: model ? model.name : data.avion_id,
      model_name: model ? model.name : data.avion_id,
      type: model ? model.type : 'Caza de Combate',
      nivel: data.nivel,
      especial_nombre: data.especial_nombre || null,
      especial_nivel: data.especial_nivel || null,
      pasiva_nombre: data.pasiva_nombre || null,
      pasiva_nivel: data.pasiva_nivel || null,
      mod1_id: data.mod1_id || null,
      mod1_lvl: data.mod1_lvl || null,
      mod2_id: data.mod2_id || null,
      mod2_lvl: data.mod2_lvl || null,
      mod1_nombre: mod1 ? mod1.name : null,
      mod2_nombre: mod2 ? mod2.name : null,
      nivel_fuselaje: nf,
      nivel_motor: nm,
      nivel_avionica: na,
      nivel_armas: nw,
      recursos_piezas: data.recursos_piezas || 0,
      recursos_avanzadas: data.recursos_avanzadas || 0,
      created_at: new Date().toISOString()
    };

    memoryStore.userPlanes.push(newPlane);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('planes').insert({
          user_id: newPlane.user_id,
          avion_id: newPlane.avion_id,
          nivel: newPlane.nivel,
          especial_nombre: newPlane.especial_nombre,
          especial_nivel: newPlane.especial_nivel,
          pasiva_nombre: newPlane.pasiva_nombre,
          pasiva_nivel: newPlane.pasiva_nivel,
          mod1_id: newPlane.mod1_id,
          mod1_lvl: newPlane.mod1_lvl,
          mod2_id: newPlane.mod2_id,
          mod2_lvl: newPlane.mod2_lvl,
          nivel_fuselaje: nf,
          nivel_motor: nm,
          nivel_avionica: na,
          nivel_armas: nw,
          recursos_piezas: newPlane.recursos_piezas,
          recursos_avanzadas: newPlane.recursos_avanzadas
        });
      } catch (dbErr) {
        console.warn('⚠️ [Planes insert] Error en Supabase:', dbErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Aeronave registrada en el hangar',
      plane: newPlane
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePlane(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = PlaneSchema.parse(req.body);
    const plane = memoryStore.userPlanes.find(p => p.id === id);

    if (!plane) {
      return res.status(404).json({ error: 'Aeronave no encontrada', code: 'PLANE_NOT_FOUND' });
    }

    // Ownership check: only owner or admin can update
    if (plane.user_id !== req.user.user_id && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Permisos denegados para modificar esta aeronave', code: 'FORBIDDEN' });
    }

    const model = memoryStore.planeModels.find(m => String(m.id) === String(data.avion_id));
    const mod1 = memoryStore.planeMods.find(m => String(m.id) === String(data.mod1_id));
    const mod2 = memoryStore.planeMods.find(m => String(m.id) === String(data.mod2_id));

    plane.avion_id = data.avion_id;
    plane.name = model ? model.name : plane.name;
    plane.model_name = model ? model.name : plane.name;
    plane.type = model ? model.type : plane.type;
    plane.nivel = data.nivel;
    plane.especial_nombre = data.especial_nombre || null;
    plane.pasiva_nombre = data.pasiva_nombre || null;
    plane.mod1_id = data.mod1_id || null;
    plane.mod1_lvl = data.mod1_lvl || null;
    plane.mod2_id = data.mod2_id || null;
    plane.mod2_lvl = data.mod2_lvl || null;
    plane.mod1_nombre = mod1 ? mod1.name : null;
    plane.mod2_nombre = mod2 ? mod2.name : null;

    if (data.nivel_fuselaje !== undefined) plane.nivel_fuselaje = data.nivel_fuselaje;
    if (data.nivel_motor !== undefined) plane.nivel_motor = data.nivel_motor;
    if (data.nivel_avionica !== undefined) plane.nivel_avionica = data.nivel_avionica;
    if (data.nivel_armas !== undefined) plane.nivel_armas = data.nivel_armas;
    if (data.recursos_piezas !== undefined) plane.recursos_piezas = data.recursos_piezas;
    if (data.recursos_avanzadas !== undefined) plane.recursos_avanzadas = data.recursos_avanzadas;

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('planes').update({
          avion_id: plane.avion_id,
          nivel: plane.nivel,
          especial_nombre: plane.especial_nombre,
          pasiva_nombre: plane.pasiva_nombre,
          mod1_id: plane.mod1_id,
          mod1_lvl: plane.mod1_lvl,
          mod2_id: plane.mod2_id,
          mod2_lvl: plane.mod2_lvl,
          nivel_fuselaje: plane.nivel_fuselaje,
          nivel_motor: plane.nivel_motor,
          nivel_avionica: plane.nivel_avionica,
          nivel_armas: plane.nivel_armas,
          recursos_piezas: plane.recursos_piezas,
          recursos_avanzadas: plane.recursos_avanzadas
        }).eq('id', id);
      } catch (dbErr) {
        console.warn('⚠️ [Planes update] Error en Supabase:', dbErr.message);
      }
    }

    res.json({ success: true, message: 'Aeronave actualizada correctamente', plane });
  } catch (err) {
    next(err);
  }
}

// Actualizar un sistema específico (Upgrades 2.0)
export async function updatePlaneSystem(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const parsed = UpdatePlaneSystemSchema.parse(req.body);
    const { sistema, nivel, piezas, avanzadas } = parsed;

    let plane = memoryStore.userPlanes.find(p => p.id === id);

    const supabase = getSupabase();
    if (supabase && !plane) {
      const { data, error } = await supabase
        .from('planes')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) plane = data;
    }

    if (!plane) {
      return res.status(404).json({ error: 'Aeronave no encontrada', code: 'PLANE_NOT_FOUND' });
    }

    // Ownership check
    if (plane.user_id !== req.user.user_id && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Permisos denegados para modificar esta aeronave', code: 'FORBIDDEN' });
    }

    // Validar nivel general mínimo (Nivel 6)
    if ((plane.nivel || 1) < 6) {
      return res.status(400).json({
        error: 'Los sistemas de Upgrades 2.0 requieren que la aeronave sea Nivel 6 o superior',
        code: 'UPGRADE_LOCKED_LEVEL_TOO_LOW'
      });
    }

    // Mapeo de columnas por sistema
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

    const nivelAnterior = plane[columnName] || 0;
    plane[columnName] = nivel;

    if (piezas !== undefined) plane.recursos_piezas = piezas;
    if (avanzadas !== undefined) plane.recursos_avanzadas = avanzadas;

    // Actualizar en Supabase
    if (supabase) {
      try {
        const updatePayload = {
          [columnName]: nivel
        };
        if (piezas !== undefined) updatePayload.recursos_piezas = piezas;
        if (avanzadas !== undefined) updatePayload.recursos_avanzadas = avanzadas;

        await supabase.from('planes').update(updatePayload).eq('id', id);

        // Registro en auditoría plane_upgrades
        await supabase.from('plane_upgrades').insert({
          plane_id: id,
          user_id: req.user.user_id,
          sistema,
          nivel_anterior: nivelAnterior,
          nivel_nuevo: nivel,
          piezas_usadas: piezas || 0,
          avanzadas_usadas: avanzadas || 0
        });
      } catch (dbErr) {
        console.warn('⚠️ [Planes updateSystem] Error en Supabase:', dbErr.message);
      }
    }

    // Auditoría en memoria
    if (!memoryStore.planeUpgrades) memoryStore.planeUpgrades = [];
    memoryStore.planeUpgrades.push({
      id: memoryStore.planeUpgrades.length + 1,
      plane_id: id,
      user_id: req.user.user_id,
      sistema,
      nivel_anterior: nivelAnterior,
      nivel_nuevo: nivel,
      piezas_usadas: piezas || 0,
      avanzadas_usadas: avanzadas || 0,
      created_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Sistema ${sistema.toUpperCase()} actualizado a nivel ${nivel}`,
      plane: {
        ...plane,
        nivel_fuselaje: plane.nivel_fuselaje || 0,
        nivel_motor: plane.nivel_motor || 0,
        nivel_avionica: plane.nivel_avionica || 0,
        nivel_armas: plane.nivel_armas || 0,
        nivel_sistemas: Math.floor(((plane.nivel_fuselaje || 0) + (plane.nivel_motor || 0) + (plane.nivel_avionica || 0) + (plane.nivel_armas || 0)) / 4)
      }
    });
  } catch (err) {
    next(err);
  }
}

// Obtener detalles completos de aeronave incluyendo sistemas y matriz de costos (Upgrades 2.0)
export async function getPlaneDetails(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    let plane = memoryStore.userPlanes.find(p => p.id === id);

    const supabase = getSupabase();
    if (supabase && !plane) {
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
          recursos_avanzadas,
          plane_models ( id, name, type )
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        plane = {
          id: data.id,
          user_id: data.user_id,
          avion_id: data.avion_id,
          model_name: data.plane_models?.name || data.avion_id,
          type: data.plane_models?.type || 'Caza de Combate',
          nivel: data.nivel,
          especial_nombre: data.especial_nombre || null,
          pasiva_nombre: data.pasiva_nombre || null,
          mod1_id: data.mod1_id || null,
          mod1_lvl: data.mod1_lvl || null,
          mod2_id: data.mod2_id || null,
          mod2_lvl: data.mod2_lvl || null,
          nivel_fuselaje: data.nivel_fuselaje || 0,
          nivel_motor: data.nivel_motor || 0,
          nivel_avionica: data.nivel_avionica || 0,
          nivel_armas: data.nivel_armas || 0,
          recursos_piezas: data.recursos_piezas || 0,
          recursos_avanzadas: data.recursos_avanzadas || 0
        };
      }
    }

    if (!plane) {
      return res.status(404).json({ error: 'Aeronave no encontrada', code: 'PLANE_NOT_FOUND' });
    }

    const model = memoryStore.planeModels.find(m => String(m.id) === String(plane.avion_id));
    const modelName = plane.model_name || model?.name || plane.name || plane.avion_id;
    const modelType = plane.type || model?.type || 'Caza de Combate';

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
    const plane = memoryStore.userPlanes.find(p => p.id === id);

    if (!plane) {
      return res.status(404).json({ error: 'Aeronave no encontrada', code: 'PLANE_NOT_FOUND' });
    }

    if (plane.user_id !== req.user.user_id && req.user.role !== 'ADMIN' && req.user.role !== 'OWNER') {
      return res.status(403).json({ error: 'Permisos denegados para eliminar esta aeronave', code: 'FORBIDDEN' });
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('planes').delete().eq('id', id);
      } catch (dbErr) {
        console.warn('⚠️ [Planes delete] Error en Supabase:', dbErr.message);
      }
    }

    memoryStore.userPlanes = memoryStore.userPlanes.filter(p => p.id !== id);
    res.json({ success: true, message: 'Aeronave eliminada del hangar' });
  } catch (err) {
    next(err);
  }
}

export function exportPlanesCSV(req, res) {
  const userPlanes = memoryStore.userPlanes.filter(p => p.user_id === req.user.user_id);
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

    return [
      p.id,
      p.name || p.model_name || p.avion_id,
      p.type || 'Caza de Combate',
      p.nivel,
      nf,
      nm,
      na,
      nw,
      avg,
      p.especial_nombre || '',
      p.pasiva_nombre || '',
      p.mod1_nombre || '',
      p.mod1_lvl || '',
      p.mod2_nombre || '',
      p.mod2_lvl || ''
    ];
  });

  const csv = buildSanitizedCSV(headers, rows);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="hangar_escuadron.csv"');
  res.send(csv);
}

export async function getPlaneStats(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    let plane = memoryStore.userPlanes.find(p => p.id === id);

    const supabase = getSupabase();
    if (supabase && !plane) {
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
          recursos_avanzadas,
          plane_models ( id, name, type )
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        plane = {
          id: data.id,
          user_id: data.user_id,
          avion_id: data.avion_id,
          model_name: data.plane_models?.name || data.avion_id,
          type: data.plane_models?.type || 'Caza de Combate',
          nivel: data.nivel,
          especial_nombre: data.especial_nombre || null,
          pasiva_nombre: data.pasiva_nombre || null,
          mod1_id: data.mod1_id || null,
          mod1_lvl: data.mod1_lvl || null,
          mod2_id: data.mod2_id || null,
          mod2_lvl: data.mod2_lvl || null,
          nivel_fuselaje: data.nivel_fuselaje || 0,
          nivel_motor: data.nivel_motor || 0,
          nivel_avionica: data.nivel_avionica || 0,
          nivel_armas: data.nivel_armas || 0,
          recursos_piezas: data.recursos_piezas || 0,
          recursos_avanzadas: data.recursos_avanzadas || 0
        };
      }
    }

    if (!plane) {
      return res.status(404).json({ error: 'Aeronave no encontrada' });
    }

    const model = memoryStore.planeModels.find(m => String(m.id) === String(plane.avion_id));
    const modelName = plane.model_name || model?.name || plane.name || plane.avion_id;
    const modelType = plane.type || model?.type || 'Caza de Combate';

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

    // Upgrades 2.0 system bonuses (Nivel 0-8)
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

    const mod1Obj = memoryStore.planeMods.find(m => String(m.id) === String(plane.mod1_id));
    const mod2Obj = memoryStore.planeMods.find(m => String(m.id) === String(plane.mod2_id));

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
