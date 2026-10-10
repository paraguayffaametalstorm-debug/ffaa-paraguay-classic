// scripts/bump-version.cjs
//
// Bumpea la versión del proyecto en TODOS los archivos de una sola vez.
//
// Uso:
//   node scripts/bump-version.cjs patch    (4.8.0 → 4.8.1)
//   node scripts/bump-version.cjs minor    (4.8.0 → 4.9.0)
//   node scripts/bump-version.cjs major    (4.8.0 → 5.0.0)
//   node scripts/bump-version.cjs 4.8.2    (versión explícita)
//   node scripts/bump-version.cjs patch --dry-run

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const BUMP_TYPE = args.find(a => !a.startsWith('--'));

if (!BUMP_TYPE) {
  console.error('❌ Falta el tipo de bump.');
  console.error('   Uso: node scripts/bump-version.cjs [patch|minor|major|X.Y.Z] [--dry-run]');
  process.exit(1);
}

const PROJECT_ROOT = path.resolve(__dirname, '..');
const BACKUP_SUFFIX = '.bak-bump';

function readFile(relPath) {
  const abs = path.join(PROJECT_ROOT, relPath);
  try {
    return { abs, content: fs.readFileSync(abs, 'utf8') };
  } catch (err) {
    return { abs, content: null, error: err.message };
  }
}

function writeWithBackup(abs, newContent, originalContent) {
  if (DRY_RUN) return true;
  try {
    fs.writeFileSync(`${abs}${BACKUP_SUFFIX}`, originalContent, 'utf8');
    fs.writeFileSync(abs, newContent, 'utf8');
    return true;
  } catch (err) {
    console.error(`   ❌ ${err.message}`);
    return false;
  }
}

function calcNewVersion(current, type) {
  if (/^\d+\.\d+\.\d+$/.test(type)) return type;
  const [major, minor, patch] = current.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default:
      console.error(`❌ Tipo de bump inválido: ${type}`);
      process.exit(1);
  }
}

const pkgPath = path.join(PROJECT_ROOT, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const OLD_VERSION = pkg.version;
const NEW_VERSION = calcNewVersion(OLD_VERSION, BUMP_TYPE);

console.log('══════════════════════════════════════════════════════');
console.log(`  BUMP VERSION — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log(`  ${OLD_VERSION} → ${NEW_VERSION}`);
console.log('══════════════════════════════════════════════════════\n');

if (OLD_VERSION === NEW_VERSION) {
  console.log('⏭️  La versión no cambió. Nada que hacer.');
  process.exit(0);
}

const changes = [
  {
    file: 'package.json',
    description: `"version": "${NEW_VERSION}"`,
    apply: (c) => c.replace(`"version": "${OLD_VERSION}"`, `"version": "${NEW_VERSION}"`),
  },
  {
    file: 'sw.js',
    description: `CACHE_NAME → v${NEW_VERSION}`,
    apply: (c) => {
      const regex = new RegExp(`PARAGUAY-FFAA-METALSTORM-v${OLD_VERSION.replace(/\./g, '\\.')}`, 'g');
      return c.replace(regex, `PARAGUAY-FFAA-METALSTORM-v${NEW_VERSION}`);
    },
  },
  {
    file: 'index.html',
    description: `?v=${OLD_VERSION} → ?v=${NEW_VERSION}`,
    apply: (c) => c.split(`?v=${OLD_VERSION}`).join(`?v=${NEW_VERSION}`),
  },
  {
    file: 'src/controllers/health.controller.js',
    description: `APP_VERSION fallback (solo si está hardcodeado)`,
    apply: (c) => {
      const regex = /(const APP_VERSION = process\.env\.APP_VERSION \|\| ')\d+\.\d+\.\d+(')/;
      if (regex.test(c)) return c.replace(regex, `$1${NEW_VERSION}$2`);
      return c;
    },
  },
  {
    file: 'CHANGELOG.md',
    description: `Agregar entrada [${NEW_VERSION}]`,
    apply: (c) => {
      if (c.includes(`## [${NEW_VERSION}]`)) return c;
      const today = new Date().toISOString().split('T')[0];
      const anchor = `## [${OLD_VERSION}]`;
      if (!c.includes(anchor)) {
        console.warn(`   ⚠️  No se encontró "## [${OLD_VERSION}]" en CHANGELOG.md.`);
        return c;
      }
      const entry = `## [${NEW_VERSION}] - ${today}\n\n### Cambios\n\n- _(pendiente de documentar)_\n\n---\n\n`;
      return c.replace(anchor, entry + anchor);
    },
  },
  {
    file: 'README.md',
    description: `Badge version-v${NEW_VERSION}`,
    apply: (c) => {
      const regex = new RegExp(`version-v${OLD_VERSION.replace(/\./g, '\\.')}`, 'g');
      return c.replace(regex, `version-v${NEW_VERSION}`);
    },
  },
];

let applied = 0, skipped = 0, failed = 0;

for (const change of changes) {
  const { abs, content, error } = readFile(change.file);
  if (error) {
    console.log(`❌ [ MISSING ] ${change.file} — ${error}`);
    failed++;
    continue;
  }
  const newContent = change.apply(content);
  if (newContent === content) {
    console.log(`⏭️  [ SKIP    ] ${change.file}`);
    skipped++;
    continue;
  }
  if (writeWithBackup(abs, newContent, content)) {
    console.log(`✅ [ APPLY   ] ${change.file} → ${change.description}`);
    applied++;
  } else {
    console.log(`❌ [ FAIL    ] ${change.file}`);
    failed++;
  }
}

console.log('\n══════════════════════════════════════════════════════');
console.log(`  ✅ Aplicados:  ${applied}`);
console.log(`  ⏭️  Skipeados: ${skipped}`);
console.log(`  ❌ Fallidos:   ${failed}`);
console.log('══════════════════════════════════════════════════════\n');

if (DRY_RUN) {
  console.log('ℹ️  Simulación. Corré sin --dry-run para aplicar.\n');
} else if (applied > 0) {
  console.log('📋 PRÓXIMOS PASOS:\n');
  console.log(`  1. Revisar:  git diff`);
  console.log(`  2. Verificar: node --check sw.js`);
  console.log(`  3. Actualizar el CHANGELOG (la entrada se creó vacía)`);
  console.log(`  4. Commit:   git add . && git commit -m "chore(release): v${NEW_VERSION}"`);
  console.log(`  5. Push:     git push origin main\n`);
  console.log(`💡 Rollback: git checkout -- . (o copiar desde los *.${BACKUP_SUFFIX})\n`);
}