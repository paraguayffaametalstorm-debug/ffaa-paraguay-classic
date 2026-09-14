/**
 * Script de traducción EN → ES para plane_models
 * Traduce: historia → historia_es, recomendaciones → recomendaciones_es
 * Usa la librería oficial de DeepL (deepl-node)
 *
 * Uso:
 *   node scripts/traducir-aviones.cjs
 *   node scripts/traducir-aviones.cjs --force   (re-traduce todo)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const deepl = require('deepl-node');

// ── Configuración ────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.SUPABASE_SERVICE_KEY
                  || process.env.SUPABASE_KEY;
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}
if (!DEEPL_API_KEY) {
  console.error('❌ Falta DEEPL_API_KEY en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const translator = new deepl.Translator(DEEPL_API_KEY);
const FORCE = process.argv.includes('--force');

let charsUsados = 0;

// ============================================================
// Traducción con DeepL
// ============================================================
async function traducirTexto(texto) {
  if (!texto || texto.trim().length === 0) return '';

  const MAX_CHARS = 40000;

  if (texto.length <= MAX_CHARS) {
    const result = await translator.translateText(texto, 'en', 'es');
    charsUsados += texto.length;
    return result.text;
  }

  const partes = partirTexto(texto, MAX_CHARS);
  const traducciones = [];
  for (const parte of partes) {
    const result = await translator.translateText(parte, 'en', 'es');
    charsUsados += parte.length;
    traducciones.push(result.text);
    await sleep(200);
  }
  return traducciones.join(' ');
}

function partirTexto(texto, maxChars) {
  const oraciones = texto.split(/(?<=[.!?])\s+/);
  const partes = [];
  let actual = '';
  for (const or of oraciones) {
    if ((actual + ' ' + or).length > maxChars && actual.length > 0) {
      partes.push(actual.trim());
      actual = or;
    } else {
      actual = actual ? actual + ' ' + or : or;
    }
  }
  if (actual.trim()) partes.push(actual.trim());
  return partes;
}

async function traducirJSON(valor) {
  if (typeof valor === 'string') {
    return await traducirTexto(valor);
  }
  if (Array.isArray(valor)) {
    const out = [];
    for (const item of valor) {
      out.push(await traducirJSON(item));
    }
    return out;
  }
  if (valor && typeof valor === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(valor)) {
      out[k] = await traducirJSON(v);
    }
    return out;
  }
  return valor;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function jsonTieneContenido(obj) {
  if (!obj) return false;
  if (Array.isArray(obj)) return obj.some(x => jsonTieneContenido(x));
  if (typeof obj === 'object') return Object.values(obj).some(v => jsonTieneContenido(v));
  if (typeof obj === 'string') return obj.trim().length > 0;
  return false;
}

async function main() {
  console.log('🚀 Iniciando traducción EN → ES con DeepL');
  console.log(`📌 Modo: ${FORCE ? 'FORCE (re-traduce todo)' : 'NORMAL (solo sin traducir)'}`);
  console.log('');

  try {
    const usage = await translator.getUsage();
    if (usage.character) {
      console.log(`📊 Caracteres usados: ${usage.character.count.toLocaleString()} / ${usage.character.limit.toLocaleString()}`);
      console.log(`📊 Restante: ${(usage.character.limit - usage.character.count).toLocaleString()}`);
      console.log('');
    }
  } catch (e) {
    console.warn('⚠️ No se pudo obtener el uso de la cuenta:', e.message);
  }

  const { data: aviones, error } = await supabase
    .from('plane_models')
    .select('id, name, descripcion, descripcion_es, historia, historia_es, recomendaciones, recomendaciones_es');

  if (error) {
    console.error('❌ Error consultando Supabase:', error.message);
    process.exit(1);
  }

  console.log(`📦 Aviones encontrados: ${aviones.length}`);
  console.log('');

  let procesados = 0;
  let saltados = 0;
  let errores = 0;

  for (const avion of aviones) {
    const necesitaDescripcion = avion.descripcion && (FORCE || !avion.descripcion_es);
    const necesitaHistoria = avion.historia && (FORCE || !avion.historia_es);
    const necesitaRecs = jsonTieneContenido(avion.recomendaciones) && (FORCE || !jsonTieneContenido(avion.recomendaciones_es));

    if (!necesitaDescripcion && !necesitaHistoria && !necesitaRecs) {
      saltados++;
      console.log(`⏭️  [${avion.id}] ${avion.name} — ya traducido`);
      continue;
    }

    console.log(`🌐 [${avion.id}] ${avion.name}`);
    const update = {};

    try {
      if (necesitaDescripcion) {
        console.log(`   📝 Traduciendo descripción (${avion.descripcion.length} chars)...`);
        update.descripcion_es = await traducirTexto(avion.descripcion);
        console.log(`   ✅ Descripción traducida`);
        await sleep(200);
      }

      if (necesitaHistoria) {
        console.log(`   📜 Traduciendo historia (${avion.historia.length} chars)...`);
        update.historia_es = await traducirTexto(avion.historia);
        console.log(`   ✅ Historia traducida`);
        await sleep(200);
      }

      if (necesitaRecs) {
        console.log(`   💡 Traduciendo recomendaciones...`);
        update.recomendaciones_es = await traducirJSON(avion.recomendaciones);
        console.log(`   ✅ Recomendaciones traducidas`);
        await sleep(200);
      }

      if (Object.keys(update).length > 0) {
        const { error: upErr } = await supabase
          .from('plane_models')
          .update(update)
          .eq('id', avion.id);

        if (upErr) throw upErr;
        procesados++;
      }

    } catch (err) {
      errores++;
      console.error(`   ❌ Error en [${avion.id}] ${avion.name}:`, err.message);
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════');
  console.log(`✅ Procesados: ${procesados}`);
  console.log(`⏭️  Saltados: ${saltados}`);
  console.log(`❌ Errores: ${errores}`);
  console.log(`📊 Caracteres usados en esta corrida: ${charsUsados.toLocaleString()}`);
  console.log('═══════════════════════════════════════════');
}

main().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});