// scripts/fix-readme-tree.cjs
//
// Reemplaza el arbol de carpetas del README por la version compacta
// post-refactor de docs/ (v4.8.10). Elimina fly.toml, .md de raiz
// y comprime components/ + js/ a una linea por carpeta.

const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const FILE = path.resolve(__dirname, '..', 'README.md');

console.log('═'.repeat(56));
console.log(`  FIX README TREE — ${DRY_RUN ? '🔍 SIMULACIÓN' : '🚀 APLICAR'}`);
console.log('═'.repeat(56) + '\n');

let content = fs.readFileSync(FILE, 'utf8');

// ───────────────────────────────────────────────────────────────────────────
// 1. Detectar bloque actual (entre .dockerignore y audit.js)
// ───────────────────────────────────────────────────────────────────────────

const START_MARKER = '.dockerignore';
const END_MARKER = 'audit.js';

const startIdx = content.indexOf(START_MARKER);
const endIdx = content.indexOf(END_MARKER);

if (startIdx === -1) {
  console.error(`❌ No se encontro "${START_MARKER}" en README.md`);
  process.exit(1);
}
if (endIdx === -1) {
  console.error(`❌ No se encontro "${END_MARKER}" en README.md`);
  process.exit(1);
}

// Retroceder al inicio de la linea del START_MARKER
const lineStartIdx = content.lastIndexOf('\n', startIdx) + 1;

// Avanzar al final de la linea del END_MARKER
const lineEndIdx = content.indexOf('\n', endIdx);
if (lineEndIdx === -1) {
  console.error(`❌ No se encontro el fin de linea de "${END_MARKER}"`);
  process.exit(1);
}

const bloqueActual = content.slice(lineStartIdx, lineEndIdx);
const lineasBloque = bloqueActual.split('\n').length;

console.log(`🔎 Bloque detectado: ${lineasBloque} lineas`);
console.log(`   Inicio: "${bloqueActual.split('\n')[0].trim().slice(0, 60)}"`);
console.log(`   Fin:    "${bloqueActual.split('\n').slice(-1)[0].trim().slice(0, 60)}"\n`);

// ───────────────────────────────────────────────────────────────────────────
// 2. Verificar idempotencia (si ya tiene el marcador nuevo, skip)
// ───────────────────────────────────────────────────────────────────────────

if (bloqueActual.includes('release-please.yml') && bloqueActual.includes('docs/')) {
  console.log('⏭️  [SKIP] El arbol ya fue actualizado.\n');
  process.exit(0);
}

// ───────────────────────────────────────────────────────────────────────────
// 3. Nuevo arbol
// ───────────────────────────────────────────────────────────────────────────

const nuevoArbol = `├── .github/
│   └── workflows/
│       └── release-please.yml    # CI/CD de versionado automatico
├── components/                   # 24 vistas/modales HTML inyectados en runtime
├── css/                          # Sistema de diseno militar (5 archivos)
├── docs/                         # Documentacion (14 subcarpetas tematicas)
│   ├── adr/                      # Decisiones arquitectonicas (ADR-001 a ADR-010)
│   ├── architecture/             # ARCHITECTURE.md, API_REFERENCE.md, MIGRACION_SQL_REFERENCE.md
│   ├── auditorias/               # Auditorias externas (frontend legacy, sprint 1)
│   ├── deployment/               # DEPLOYMENT_GUIDE, DEPLOYMENT_STATE, PWA_SETUP, RELEASE
│   ├── handoffs/                 # Handoffs entre sesiones (SESSION_HANDOFF + historicos)
│   ├── incidentes/               # Post-mortems de hallazgos (HALL-xxx)
│   ├── mockups/                  # Mockups HTML de features
│   ├── operations/               # USER_MANUAL, POLITICA_INACTIVACION, FIXES_APPLIED
│   ├── planning/                 # ROADMAP, BACKLOG, PLAN_TRABAJO, CURRENT_STATE
│   ├── rfc/                      # Propuestas formales (RFC-001)
│   └── README.md                 # Indice maestro de docs/
├── js/                           # Logica del cliente (11 archivos ES6+)
├── scripts/                      # Scripts de mantenimiento (3 activos)
│   └── archive/                  # 96 scripts one-shot archivados
├── sql/                          # Migraciones DDL (000_* a 039_*)
├── src/                          # Backend Express (ES Modules)
│   ├── config/                   # env.js, logger.js, passport.js
│   ├── controllers/              # Controladores de logica de negocio
│   ├── db/                       # Cliente Supabase y healthchecks
│   ├── middlewares/              # Auth, errorHandler, rateLimiter, correlationId
│   ├── routes/                   # Enrutadores Express modulares
│   ├── scripts/                  # Utilidades CLI de diagnostico
│   └── utils/                    # Security, audit, schemas, csv, email, modEffects
├── tests/                        # Suite Vitest (287 passing / 69 skipped)
├── .env.example                  # Plantilla de variables de entorno
├── .gitignore                    # Exclusiones de control de versiones
├── CHANGELOG.md                  # Historial de releases (gestionado por release-please)
├── Dockerfile                    # Contenedor de produccion (usuario no-root)
├── README.md                     # Este archivo
├── index.html                    # SPA loader dinamico
├── link-account.html             # Terminal de vinculacion Google OAuth
├── reset-password.html           # Terminal de reset de contrasena
├── server.js                     # Servidor Express y middlewares
├── sw.js                         # Service Worker (Cache-First, v4.8.10)
└── package.json                  # Dependencias y scripts`;

// ───────────────────────────────────────────────────────────────────────────
// 4. Aplicar
// ───────────────────────────────────────────────────────────────────────────

const changed = content.slice(0, lineStartIdx) + nuevoArbol + content.slice(lineEndIdx);

if (changed === content) {
  console.log('⏭️  [SKIP] Nada que cambiar.\n');
  process.exit(0);
}

const lineasAntes = content.split('\n').length;
const lineasDespues = changed.split('\n').length;
console.log(`📊 Impacto: ${lineasAntes} → ${lineasDespues} lineas (${lineasDespues - lineasAntes})`);
console.log(`   Bytes:   ${content.length} → ${changed.length} (${changed.length - content.length})\n`);

if (DRY_RUN) {
  console.log('⏭️  Simulacion. Corré sin --dry-run para aplicar.\n');
  process.exit(0);
}

// ───────────────────────────────────────────────────────────────────────────
// 5. Backup + escritura
// ───────────────────────────────────────────────────────────────────────────

const backupPath = `${FILE}.bak-fixtree`;
fs.writeFileSync(backupPath, content, 'utf8');
fs.writeFileSync(FILE, changed, 'utf8');

console.log('✅ README.md actualizado.');
console.log(`   Backup: ${path.basename(backupPath)}\n`);
console.log('📋 PRÓXIMOS PASOS:');
console.log('   1. Verificar:  findstr /n "dockerignore" README.md');
console.log('   2. Ver diff:   git diff --stat README.md');
console.log('   3. Commit:     git add README.md');
console.log('                  git commit -m "docs(readme): actualizar arbol de carpetas post-refactor"');
console.log('   4. Push:       git push origin main\n');