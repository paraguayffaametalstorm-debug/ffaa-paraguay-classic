import { memoryStore, getSupabase } from '../db/supabase.js';
import { NormativaSchema } from '../utils/schemas.js';

export async function getNormativas(req, res, next) {
  try {
    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('normativas')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        return res.json({ normativas: data });
      }
    }

    res.json({ normativas: memoryStore.normativas });
  } catch (err) {
    next(err);
  }
}

export async function uploadNormativa(req, res, next) {
  try {
    const data = NormativaSchema.parse(req.body);
    const newNorm = {
      id: memoryStore.normativas.length + 1,
      titulo: data.titulo,
      codigo: data.codigo,
      tipo_documento: data.tipo_documento,
      categoria: data.categoria,
      ambito_aplicacion: data.ambito_aplicacion,
      fecha_aprobacion: data.fecha_aprobacion,
      fecha_entrada_vigor: data.fecha_entrada_vigor,
      resumen: data.resumen,
      nivel_confidencialidad: data.nivel_confidencialidad,
      file_name: `${data.codigo}.pdf`
    };

    memoryStore.normativas.unshift(newNorm);

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('normativas').insert(newNorm);
    }

    res.status(201).json({ message: 'Normativa oficial publicada', normativa: newNorm });
  } catch (err) {
    next(err);
  }
}

export function downloadNormativa(req, res) {
  const id = parseInt(req.params.id, 10);
  const norm = memoryStore.normativas.find(n => n.id === id);

  const sampleDoc = `PARAGUAY-FFAA | METALSTORM
Documento Oficial: ${norm ? norm.codigo : 'DOC-001'}
Título: ${norm ? norm.titulo : 'Normativa de Escuadrón'}
Ámbito: ${norm ? norm.ambito_aplicacion : 'General'}

Resumen Operativo:
${norm ? norm.resumen : 'Contenido normativo oficial del Escuadrón Paraguay FFAA.'}

Fecha de Vigor: ${norm ? norm.fecha_entrada_vigor : new Date().toISOString()}
Aprobado por: Comandancia General del Escuadrón.`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${norm ? norm.file_name : 'normativa.txt'}"`);
  res.send(sampleDoc);
}
