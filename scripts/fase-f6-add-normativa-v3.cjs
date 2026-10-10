/**
 * FASE 6 — Guardar normativa V3.0 borrador en docs/normativa/
 * Uso: node scripts/fase-f6-add-normativa-v3.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIR_NORMATIVA = path.join(ROOT, 'docs', 'normativa');
const FILE_ORIGEN = path.join(ROOT, 'Normativa_PARAGUAY_FFAA_METALSTORM_V3_BORRADOR.txt');
const FILE_DESTINO_TXT = path.join(DIR_NORMATIVA, 'normativa-v3.0-borrador.txt');
const FILE_DESTINO_MD = path.join(DIR_NORMATIVA, 'normativa-v3.0-borrador.md');

function log(msg)   { console.log(msg); }
function ok(msg)    { console.log(`   ✅ ${msg}`); }
function warn(msg)  { console.log(`   ⚠️  ${msg}`); }
function err(msg)   { console.error(`   ❌ ${msg}`); }

function main() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  📄 Guardar normativa V3.0 borrador');
  console.log('═══════════════════════════════════════════════════════\n');

  // 1. Crear carpeta
  if (!fs.existsSync(DIR_NORMATIVA)) {
    fs.mkdirSync(DIR_NORMATIVA, { recursive: true });
    ok(`Carpeta creada: docs\\normativa`);
  } else {
    warn(`La carpeta ya existía: docs\\normativa`);
  }

  // 2. ¿Existe el archivo origen?
  if (!fs.existsSync(FILE_ORIGEN)) {
    err(`No existe el archivo origen: Normativa_PARAGUAY_FFAA_METALSTORM_V3_BORRADOR.txt`);
    process.exit(1);
  }

  const contenido = fs.readFileSync(FILE_ORIGEN, 'utf8');
  const bytes = Buffer.byteLength(contenido, 'utf8');
  ok(`Leído: Normativa_PARAGUAY_FFAA_METALSTORM_V3_BORRADOR.txt (${bytes} bytes)`);

  // 3. Copiar TXT a docs/normativa/
  fs.writeFileSync(FILE_DESTINO_TXT, contenido, 'utf8');
  ok(`Copiado a: docs\\normativa\\normativa-v3.0-borrador.txt`);

  // 4. Convertir a Markdown (versión simple)
  const lineas = contenido.split('\n');
  const salida = [];
  let saltandoSep = false;

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const t = linea.trim();

    // Saltar separadores =====
    if (/^={70,}$/.test(t)) {
      if (salida.length > 0 && salida[salida.length - 1].trim() === '') salida.pop();
      saltandoSep = true;
      continue;
    }

    // Títulos tras separador
    if (saltandoSep && t.length > 0) {
      if (/^(TÍTULO\s+[IVXLCDM]+|ANEXO\s+[IVXLCDM]+|ÍNDICE|CONTROL DE CAMBIOS)/i.test(t)) {
        salida.push('');
        salida.push('# ' + t);
        salida.push('');
        saltandoSep = false;
        continue;
      }
      saltandoSep = false;
    }

    // Artículos
    if (/^Artículo\s+\d+(\s+(bis|ter|quater))?\.\s+/i.test(t)) {
      salida.push('');
      salida.push('## ' + t);
      salida.push('');
      continue;
    }

    salida.push(linea);
  }

  const md = salida.join('\n').replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(FILE_DESTINO_MD, md, 'utf8');
  const bytesMd = Buffer.byteLength(md, 'utf8');
  ok(`Markdown generado: docs\\normativa\\normativa-v3.0-borrador.md (${bytesMd} bytes)`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ✅ Normativa V3.0 guardada');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('  🚀 Próximo paso:');
  console.log('     git add docs/normativa/');
  console.log('     git commit -m "docs(normativa): agregar borrador V3.0"');
  console.log('     git push origin main');
  console.log('');
}

main();