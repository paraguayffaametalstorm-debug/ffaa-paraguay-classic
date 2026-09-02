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
    const supabase = getSupabase();
    let norm = null;

    if (supabase) {
      const { data } = await supabase.from('normativas').select('*').eq('id', id).single();
      if (data) norm = data;
    }
    if (!norm) {
      norm = DEFAULT_NORMATIVAS.find(n => n.id === id);
    }

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
  } catch (err) {
    next(err);
  }
}
