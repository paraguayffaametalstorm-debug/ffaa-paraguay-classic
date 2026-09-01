import { memoryStore, getSupabase } from '../db/supabase.js';
import { PlaneSchema } from '../utils/schemas.js';
import { buildSanitizedCSV } from '../utils/csv.js';

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
          plane_models ( id, name, type )
        `)
        .eq('user_id', req.user.user_id)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        const planes = data.map(p => ({
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
          mod2_lvl: p.mod2_lvl || null
        }));
        return res.json({ planes });
      }
    }

    const planes = memoryStore.userPlanes
      .filter(p => p.user_id === req.user.user_id)
      .map(p => {
        const model = memoryStore.planeModels.find(m => String(m.id) === String(p.avion_id));
        return {
          ...p,
          model_name: p.model_name || model?.name || p.name || p.avion_id,
          name: p.name || model?.name || p.avion_id,
          type: p.type || model?.type || 'Caza de Combate'
        };
      });

    res.json({ planes });
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
          mod2_lvl: newPlane.mod2_lvl
        });
      } catch (dbErr) {
        console.warn('⚠️ [Planes insert] Error en Supabase:', dbErr.message);
      }
    }

    res.status(201).json({
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
          mod2_lvl: plane.mod2_lvl
        }).eq('id', id);
      } catch (dbErr) {
        console.warn('⚠️ [Planes update] Error en Supabase:', dbErr.message);
      }
    }

    res.json({ message: 'Aeronave actualizada correctamente', plane });
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
    res.json({ message: 'Aeronave eliminada del hangar' });
  } catch (err) {
    next(err);
  }
}

export function exportPlanesCSV(req, res) {
  const userPlanes = memoryStore.userPlanes.filter(p => p.user_id === req.user.user_id);
  const headers = ['ID', 'Modelo', 'Tipo', 'Nivel', 'Habilidad_Especial', 'Habilidad_Pasiva', 'Mod1', 'Mod1_Nivel', 'Mod2', 'Mod2_Nivel'];
  const rows = userPlanes.map(p => [
    p.id,
    p.name,
    p.type,
    p.nivel,
    p.especial_nombre || '',
    p.pasiva_nombre || '',
    p.mod1_nombre || '',
    p.mod1_lvl || '',
    p.mod2_nombre || '',
    p.mod2_lvl || ''
  ]);

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
          mod2_lvl: data.mod2_lvl || null
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
    const current_raw = {
      speed: Math.round(max_raw.speed * (0.6 + 0.4 * levelFactor)),
      agility: Math.round(max_raw.agility * (0.6 + 0.4 * levelFactor)),
      armor: Math.round(max_raw.armor * (0.5 + 0.5 * levelFactor)),
      firepower: Math.round(max_raw.firepower * (0.5 + 0.5 * levelFactor)),
      radar: Math.round(max_raw.radar * (0.6 + 0.4 * levelFactor)),
      ecm: Math.round(max_raw.ecm * (0.4 + 0.6 * levelFactor))
    };

    const base_raw = { ...max_raw };

    const current = {};
    const base = {};
    stat_keys.forEach(k => {
      current[k] = Math.round((current_raw[k] / max_raw[k]) * 100);
      base[k] = 100;
    });

    const mod1Obj = memoryStore.planeMods.find(m => String(m.id) === String(plane.mod1_id));
    const mod2Obj = memoryStore.planeMods.find(m => String(m.id) === String(plane.mod2_id));

    res.json({
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
        mod2_lvl: plane.mod2_lvl
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
