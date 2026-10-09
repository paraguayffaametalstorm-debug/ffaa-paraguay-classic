import { getSupabase } from '../db/supabase.js';
import { NormativaSchema } from '../utils/schemas.js';

const DEFAULT_NORMATIVAS = [
  {
    id: 1,
    titulo: 'Reglamento General de Vuelo y Disciplina Táctica',
    codigo: 'REG-001',
    tipo_documento: 'Reglamento',
    categoria: 'Operativa',
    ambito_aplicacion: 'Escuadrón General',
    fecha_aprobacion: '2026-01-15',
    fecha_entrada_vigor: '2026-01-20',
    resumen: 'Normativa fundamental de disciplina, jerarquía y asistencia en eventos oficiales.',
    nivel_confidencialidad: 'Público',
    file_name: 'REG-001.pdf'
  },
  {
    id: 2,
    titulo: 'Protocolo de Rendimiento y Evaluación Semanal',
    codigo: 'PRO-002',
    tipo_documento: 'Protocolo',
    categoria: 'Evaluación',
    ambito_aplicacion: 'Todos los Pilotos',
    fecha_aprobacion: '2026-02-01',
    fecha_entrada_vigor: '2026-02-05',
    resumen: 'Estándares de tokens mínimos, días de actividad y consecuencias por inactividad.',
    nivel_confidencialidad: 'Interno',
    file_name: 'PRO-002.pdf'
  }
];

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

    res.json({ normativas: DEFAULT_NORMATIVAS });
  } catch (err) {
    next(err);
  }
}

export async function uploadNormativa(req, res, next) {
  try {
    const data = NormativaSchema.parse(req.body);
    const newNorm = {
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

    const supabase = getSupabase();
    if (supabase) {
      const { data: inserted } = await supabase.from('normativas').insert(newNorm).select().single();
      return res.status(201).json({ message: 'Normativa oficial publicada', normativa: inserted || newNorm });
    }

    res.status(201).json({ message: 'Normativa oficial publicada', normativa: newNorm });
  } catch (err) {
    next(err);
  }
}

export async function downloadNormativa(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const supabase = getSupabase();
    let norm = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('normativas')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) norm = data;
    }

    if (!norm) {
      norm = DEFAULT_NORMATIVAS.find(n => n.id === id);
    }

    if (!norm) {
      return res.status(404).json({ error: 'Normativa no encontrada' });
    }

    // Si hay archivo_url, traer el archivo real desde Supabase Storage
    if (norm.archivo_url) {
      const fileRes = await fetch(norm.archivo_url);
      if (!fileRes.ok) {
        return res.status(502).json({ error: 'No se pudo recuperar el archivo desde el storage' });
      }

      const buffer = Buffer.from(await fileRes.arrayBuffer());
      const fileName = norm.archivo_nombre || `normativa-${id}.pdf`;
      const mimeType = norm.archivo_extension === 'pdf' ? 'application/pdf'
                     : norm.archivo_extension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                     : 'application/octet-stream';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    // Fallback si no hay archivo_url
    const fallbackDoc = `PARAGUAY-FFAA | METALSTORM
Documento Oficial: ${norm.codigo || 'DOC-001'}
Título: ${norm.titulo || 'Normativa de Escuadrón'}
Ámbito: ${norm.ambito_aplicacion || 'General'}

Resumen Operativo:
${norm.resumen || 'Contenido normativo oficial del Escuadrón Paraguay FFAA.'}

Fecha de Vigor: ${norm.fecha_entrada_vigor || new Date().toISOString()}
Aprobado por: Comandancia General del Escuadrón.

[NOTA: El archivo original no está disponible. Contactar a la Comandancia.]`;

    const fallbackName = norm.archivo_nombre || `${norm.codigo || 'normativa'}.txt`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fallbackName}"`);
    res.send(fallbackDoc);
  } catch (err) {
    next(err);
  }
}