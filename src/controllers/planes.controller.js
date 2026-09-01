import { memoryStore, getSupabase } from '../db/supabase.js';
import { PlaneSchema } from '../utils/schemas.js';
import { buildSanitizedCSV } from '../utils/csv.js';

export function getCatalogModels(req, res) {
  res.json(memoryStore.planeModels);
}

export function getCatalogMods(req, res) {
  res.json(memoryStore.planeMods);
}

export async function getMyPlanes(req, res, next) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('user_planes')
        .select('*')
        .eq('user_id', req.user.user_id)
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return res.json({ planes: data });
      }
    }

    const planes = memoryStore.userPlanes.filter(p => p.user_id === req.user.user_id);
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
      type: model ? model.type : 'Caza de Combate',
      nivel: data.nivel,
      especial_nombre: data.especial_nombre || null,
      pasiva_nombre: data.pasiva_nombre || null,
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
      await supabase.from('user_planes').insert(newPlane);
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
        await supabase.from('user_planes').update(plane).eq('id', id);
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
        await supabase.from('user_planes').delete().eq('id', id);
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
