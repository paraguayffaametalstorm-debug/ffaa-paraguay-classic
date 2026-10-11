#!/usr/bin/env node
// scripts/dev-quickwins.cjs — Sprint 7 quick wins
// BL-023 (encoding LF) + BL-033 (drift user_id) + FIX-316 (código muerto)
// Patrón: DRY-RUN por defecto, --apply para ejecutar.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APPLY = process.argv.includes('--apply');
const NO_PUSH = process.argv.includes('--no-push');
const ROOT = process.cwd();
const TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const log = (msg, kind = 'info') => {
  const icons = { info: '·', ok: '✅', warn: '⚠️', err: '❌', step: '🔹' };
  console.log(`${icons[kind] || '·'} ${msg}`);
};

const readFile = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error(`No existe: ${rel}`);
  return fs.readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
};

const backup = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return;
  fs.copyFileSync(abs, `${abs}.bak-quickwins-${TS}`);
};

const writeFile = (rel, content) => {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs)) backup(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  log(`Escrito: ${rel}`, 'ok');
};

// ─── Checks previos ─────────────────────────────────────────
log('Verificando estado del repo...', 'step');
const status = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' });
if (status.trim()) {
  log('Hay cambios sin commitear:', 'warn');
  console.log(status);
  if (APPLY) {
    log('Abortando. Limpiá el working tree primero.', 'err');
    process.exit(1);
  }
}

// ─── BL-023: encoding LF ────────────────────────────────────
const gitattributes = `# Normalizar line endings a LF en todo el repo
# Ref: BL-023 · HALL-068
* text=auto eol=lf

# Forzar LF en archivos específicos
*.js   text eol=lf
*.cjs  text eol=lf
*.mjs  text eol=lf
*.json text eol=lf
*.md   text eol=lf
*.yml  text eol=lf
*.yaml text eol=lf
*.sql  text eol=lf
*.css  text eol=lf
*.html text eol=lf

# Binarios (sin tocar)
*.png  binary
*.jpg  binary
*.jpeg binary
*.gif  binary
*.ico  binary
*.webp binary
*.woff binary
*.woff2 binary
*.ttf  binary
*.pdf  binary
*.zip  binary
`;

const editorconfig = `# Configuración de editor para todo el repo
# Ref: BL-023 · HALL-068
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_size = 2

[Makefile]
indent_style = tab
`;

// ─── BL-033: drift user_id ──────────────────────────────────
let sql001Path = 'sql/001_users.sql';
let sql001Content = null;
try {
  sql001Content = readFile(sql001Path);
} catch (e) {
  log(`No se encontró ${sql001Path}. Ajustar ruta si cambió.`, 'warn');
}

const sqlFixContent = `-- ============================================================
-- PARAGUAY-FFAA | METALSTORM
-- FIX: BL-033 — Drift DDL vs BD real
-- Archivo: sql/044_fix_users_user_id_nullable.sql
-- Fecha: ${new Date().toISOString().slice(0, 10)}
-- ============================================================
-- PROPÓSITO:
--   Alinear el DDL con la realidad de la BD.
--   El DDL declaraba user_id INTEGER UNIQUE NOT NULL,
--   pero la BD real lo tiene como nullable (verificado 2026-10-11).
--
-- DECISIÓN:
--   Se mantiene el DDL como fuente de verdad.
--   Se elimina el constraint NOT NULL en la BD para alinear.
-- ============================================================

-- Verificación previa
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'user_id';

-- Eliminar NOT NULL si existe (idempotente)
ALTER TABLE users
  ALTER COLUMN user_id DROP NOT NULL;

-- Verificación post-cambio
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'user_id';
`;

// ─── FIX-316: eliminar código muerto ────────────────────────
const deadCodePath = 'src/routes/admin.users.routes.js';
const deadCodeExists = fs.existsSync(path.join(ROOT, deadCodePath));

// ─── Reporte ────────────────────────────────────────────────
log('', 'info');
log('Resumen de acciones:', 'step');
log(`  BL-023: crear .gitattributes + .editorconfig`, 'info');
log(`  BL-033: crear sql/044_fix_users_user_id_nullable.sql`, 'info');
log(`  FIX-316: ${deadCodeExists ? 'eliminar' : 'no existe (skip)'} ${deadCodePath}`, 'info');
log('', 'info');

if (!APPLY) {
  log('DRY-RUN. Para aplicar:', 'warn');
  log('  node scripts/dev-quickwins.cjs --apply', 'warn');
  process.exit(0);
}

// ─── Aplicar ────────────────────────────────────────────────
log('Aplicando cambios...', 'step');

writeFile('.gitattributes', gitattributes);
writeFile('.editorconfig', editorconfig);
writeFile('sql/044_fix_users_user_id_nullable.sql', sqlFixContent);

if (deadCodeExists) {
  backup(deadCodePath);
  fs.unlinkSync(path.join(ROOT, deadCodePath));
  log(`Eliminado: ${deadCodePath}`, 'ok');
}

// ─── Verificación post-cambio ───────────────────────────────
log('', 'info');
log('Verificando...', 'step');
const checks = [
  [' .gitattributes existe', fs.existsSync(path.join(ROOT, '.gitattributes'))],
  ['.editorconfig existe', fs.existsSync(path.join(ROOT, '.editorconfig'))],
  ['sql/044 existe', fs.existsSync(path.join(ROOT, 'sql/044_fix_users_user_id_nullable.sql'))],
  ['código muerto eliminado', !fs.existsSync(path.join(ROOT, deadCodePath))],
];
let allOk = true;
for (const [name, ok] of checks) {
  log(`${name}: ${ok ? '✅' : '❌'}`, ok ? 'ok' : 'err');
  if (!ok) allOk = false;
}
if (!allOk) {
  log('Verificación falló. Abortando commit.', 'err');
  process.exit(2);
}

// ─── Git ────────────────────────────────────────────────────
log('', 'info');
log('Commiteando...', 'step');

try {
  execSync('git add -A', { cwd: ROOT, stdio: 'inherit' });
  const msg = 'chore(sprint7): quick wins — encoding LF + drift user_id + código muerto';
  execSync(`git commit -m "${msg}"`, { cwd: ROOT, stdio: 'inherit' });

  if (!NO_PUSH) {
    log('Pusheando...', 'step');
    try {
      execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' });
      log('Push OK', 'ok');
    } catch (e) {
      log('Push rechazado (probablemente release-please). Corré:', 'warn');
      log('  git pull --rebase origin main && git push origin main', 'warn');
    }
  } else {
    log('Push omitido (--no-push)', 'warn');
  }

  const hash = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  log('', 'info');
  log(`✅ Completado. Commit local: ${hash}`, 'ok');

} catch (e) {
  log(`Error git: ${e.message}`, 'err');
  process.exit(2);
}