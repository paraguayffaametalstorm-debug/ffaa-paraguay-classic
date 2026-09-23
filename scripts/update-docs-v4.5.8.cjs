#!/usr/bin/env node
/**
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT: Actualización documental a v4.5.8
 *
 * Uso:
 *   node scripts\update-docs-v4.5.8.cjs           (DRY-RUN)
 *   node scripts\update-docs-v4.5.8.cjs --apply   (APLICAR + COMMIT + PUSH)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m'
};

function log(color, prefix, msg) { console.log(`${color}${prefix}${C.reset} ${msg}`); }
function abort(msg) {
  console.error(`\n${C.red}${C.bold}❌ ABORTADO:${C.reset} ${msg}\n`);
  process.exit(1);
}

function readFile(relPath) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(absPath)) abort(`Archivo no encontrado: ${relPath}`);
  return { absPath, content: fs.readFileSync(absPath, 'utf8') };
}

function safeReplace(content, oldBlock, newBlock, label) {
  const hasCRLF = content.includes('\r\n');
  const nc = hasCRLF ? content.replace(/\r\n/g, '\n') : content;
  const no = oldBlock.replace(/\r\n/g, '\n');
  const nn = newBlock.replace(/\r\n/g, '\n');

  if (nc.includes(nn)) {
    log(C.yellow, '[SKIP]', `${label}: ya aplicado.`);
    return { changed: false, content };
  }

  const count = nc.split(no).length - 1;
  if (count === 0) {
    log(C.red, '[FAIL]', `${label}: bloque original no encontrado.`);
    return { changed: false, content, error: 'NOT_FOUND' };
  }
  if (count > 1) {
    log(C.red, '[FAIL]', `${label}: ${count} ocurrencias ambiguas.`);
    return { changed: false, content, error: 'AMBIGUOUS' };
  }

  log(C.green, '[MATCH]', `${label}: 1 ocurrencia.`);
  let result = nc.replace(no, nn);
  if (hasCRLF) result = result.replace(/\n/g, '\r\n');
  return { changed: true, content: result };
}

function writeFile(relPath, newContent, oldContent) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (newContent === oldContent) {
    log(C.yellow, '[SKIP]', `${relPath} — sin cambios`);
    return false;
  }
  if (!APPLY) {
    log(C.yellow, '[DRY-RUN]', `NO se modificará: ${relPath}`);
    return true;
  }
  const backupPath = absPath + '.bak-docs-v458';
  fs.writeFileSync(backupPath, oldContent, 'utf8');
  log(C.gray, '[BACKUP]', `Creado: ${path.relative(ROOT_DIR, backupPath)}`);
  fs.writeFileSync(absPath, newContent, 'utf8');
  log(C.green, '[WRITE]', `Modificado: ${relPath}`);
  return true;
}

// ============================================================================
// [1/8] README.md — badge + footer
// ============================================================================
function fixReadme() {
  log(C.bold + C.blue, '\n[1/8]', 'README.md — badge + footer...');
  const { content } = readFile('README.md');
  let current = content;
  let didChange = false;

  // 1.1 Badge
  {
    const oldBlock = `[![Version](https://img.shields.io/badge/version-v4.5.3-gold)](https://paraguay-ffaa-metalstorm.fly.dev/)`;
    const newBlock = `[![Version](https://img.shields.io/badge/version-v4.5.8-gold)](https://paraguay-ffaa-metalstorm.fly.dev/)`;
    const r = safeReplace(current, oldBlock, newBlock, 'README.md badge');
    if (r.error) abort(`README.md (badge): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // 1.2 Footer
  {
    const oldBlock = `*Versión: v4.5.3 · Actualizado: 2026-09-22*`;
    const newBlock = `*Versión: v4.5.8 · Actualizado: 2026-09-22*`;
    const r = safeReplace(current, oldBlock, newBlock, 'README.md footer');
    if (r.error) abort(`README.md (footer): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('README.md', current, content);
}

// ============================================================================
// [2/8] CURRENT_STATE.md — header
// ============================================================================
function fixCurrentState() {
  log(C.bold + C.blue, '\n[2/8]', 'CURRENT_STATE.md — header versión activa...');
  const { content } = readFile('CURRENT_STATE.md');

  const oldBlock = `> **Versión Activa:** v4.5.6 (HALL-S2-02: dropdown de roles frontend)`;
  const newBlock = `> **Versión Activa:** v4.5.8 (FIX-101 + FIX-105: RPCs atómicas con fallback)`;

  const r = safeReplace(content, oldBlock, newBlock, 'CURRENT_STATE.md header');
  if (r.error) abort(`CURRENT_STATE.md: ${r.error}`);
  if (r.changed) writeFile('CURRENT_STATE.md', r.content, content);
}

// ============================================================================
// [3/8] DEPLOYMENT_STATE.md — header
// ============================================================================
function fixDeploymentState() {
  log(C.bold + C.blue, '\n[3/8]', 'DEPLOYMENT_STATE.md — header versión...');
  const { content } = readFile('DEPLOYMENT_STATE.md');

  const oldBlock = `> **Versión:** v4.5.2-hotfix  `;
  const newBlock = `> **Versión:** v4.5.8  `;

  const r = safeReplace(content, oldBlock, newBlock, 'DEPLOYMENT_STATE.md header');
  if (r.error) abort(`DEPLOYMENT_STATE.md: ${r.error}`);
  if (r.changed) writeFile('DEPLOYMENT_STATE.md', r.content, content);
}

// ============================================================================
// [4/8] DEPLOYMENT_GUIDE.md — footer
// ============================================================================
function fixDeploymentGuide() {
  log(C.bold + C.blue, '\n[4/8]', 'DEPLOYMENT_GUIDE.md — footer versión...');
  const { content } = readFile('DEPLOYMENT_GUIDE.md');

  const oldBlock = `*Versión: v4.5.2-hotfix · Actualizado: 2026-09-22*`;
  const newBlock = `*Versión: v4.5.8 · Actualizado: 2026-09-22*`;

  const r = safeReplace(content, oldBlock, newBlock, 'DEPLOYMENT_GUIDE.md footer');
  if (r.error) abort(`DEPLOYMENT_GUIDE.md: ${r.error}`);
  if (r.changed) writeFile('DEPLOYMENT_GUIDE.md', r.content, content);
}

// ============================================================================
// [5/8] PWA_SETUP.md — header + footer
// ============================================================================
function fixPwaSetup() {
  log(C.bold + C.blue, '\n[5/8]', 'PWA_SETUP.md — header + footer...');
  const { content } = readFile('PWA_SETUP.md');
  let current = content;
  let didChange = false;

  // 5.1 Header
  {
    const oldBlock = `> **Especificación y Guía de Despliegue de la Progressive Web App (PWA) Táctica y Service Worker v4.5.2-hotfix.**`;
    const newBlock = `> **Especificación y Guía de Despliegue de la Progressive Web App (PWA) Táctica y Service Worker v4.5.8.**`;
    const r = safeReplace(current, oldBlock, newBlock, 'PWA_SETUP.md header');
    if (r.error) abort(`PWA_SETUP.md (header): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // 5.2 Footer
  {
    const oldBlock = `*Versión: v4.5.2-hotfix · Actualizado: 2026-09-22*`;
    const newBlock = `*Versión: v4.5.8 · Actualizado: 2026-09-22*`;
    const r = safeReplace(current, oldBlock, newBlock, 'PWA_SETUP.md footer');
    if (r.error) abort(`PWA_SETUP.md (footer): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('PWA_SETUP.md', current, content);
}

// ============================================================================
// [6/8] USER_MANUAL.md — header + footer
// ============================================================================
function fixUserManual() {
  log(C.bold + C.blue, '\n[6/8]', 'USER_MANUAL.md — header + footer...');
  const { content } = readFile('USER_MANUAL.md');
  let current = content;
  let didChange = false;

  // 6.1 Header
  {
    const oldBlock = `> **Manual Operativo Oficial para Pilotos y Oficiales del Escuadrón PARAGUAY FFAA \`[PRY]\` en MetalStorm (Versión v4.5.2-hotfix).**`;
    const newBlock = `> **Manual Operativo Oficial para Pilotos y Oficiales del Escuadrón PARAGUAY FFAA \`[PRY]\` en MetalStorm (Versión v4.5.8).**`;
    const r = safeReplace(current, oldBlock, newBlock, 'USER_MANUAL.md header');
    if (r.error) abort(`USER_MANUAL.md (header): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // 6.2 Footer
  {
    const oldBlock = `*Versión: v4.5.2-hotfix · Actualizado: 2026-09-22*`;
    const newBlock = `*Versión: v4.5.8 · Actualizado: 2026-09-22*`;
    const r = safeReplace(current, oldBlock, newBlock, 'USER_MANUAL.md footer');
    if (r.error) abort(`USER_MANUAL.md (footer): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('USER_MANUAL.md', current, content);
}

// ============================================================================
// [7/8] API_REFERENCE.md — header + footer
// ============================================================================
function fixApiReference() {
  log(C.bold + C.blue, '\n[7/8]', 'API_REFERENCE.md — header + footer...');
  const { content } = readFile('API_REFERENCE.md');
  let current = content;
  let didChange = false;

  // 7.1 Header
  {
    const oldBlock = `> **Documentación exhaustiva de endpoints, parámetros, cabeceras de autorización y esquemas de respuesta para la versión v4.3.0 del núcleo táctico.**`;
    const newBlock = `> **Documentación exhaustiva de endpoints, parámetros, cabeceras de autorización y esquemas de respuesta para la versión v4.5.8 del núcleo táctico.**`;
    const r = safeReplace(current, oldBlock, newBlock, 'API_REFERENCE.md header');
    if (r.error) abort(`API_REFERENCE.md (header): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // 7.2 Footer
  {
    const oldBlock = `*Versión: v4.5.2-hotfix · Actualizado: 2026-09-22*`;
    const newBlock = `*Versión: v4.5.8 · Actualizado: 2026-09-22*`;
    const r = safeReplace(current, oldBlock, newBlock, 'API_REFERENCE.md footer');
    if (r.error) abort(`API_REFERENCE.md (footer): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('API_REFERENCE.md', current, content);
}

// ============================================================================
// [8/8] ARCHITECTURE.md — header + footer
// ============================================================================
function fixArchitecture() {
  log(C.bold + C.blue, '\n[8/8]', 'ARCHITECTURE.md — header + footer...');
  const { content } = readFile('ARCHITECTURE.md');
  let current = content;
  let didChange = false;

  // 8.1 Header
  {
    const oldBlock = `> **Especificación Técnica de Arquitectura de Software, Seguridad C4ISR, Modelado de Datos, Resiliencia y Flujos Operativos (Versión v4.5.2-hotfix).**`;
    const newBlock = `> **Especificación Técnica de Arquitectura de Software, Seguridad C4ISR, Modelado de Datos, Resiliencia y Flujos Operativos (Versión v4.5.8).**`;
    const r = safeReplace(current, oldBlock, newBlock, 'ARCHITECTURE.md header');
    if (r.error) abort(`ARCHITECTURE.md (header): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  // 8.2 Footer
  {
    const oldBlock = `*Versión: v4.5.2-hotfix · Actualizado: 2026-09-22*`;
    const newBlock = `*Versión: v4.5.8 · Actualizado: 2026-09-22*`;
    const r = safeReplace(current, oldBlock, newBlock, 'ARCHITECTURE.md footer');
    if (r.error) abort(`ARCHITECTURE.md (footer): ${r.error}`);
    if (r.changed) { current = r.content; didChange = true; }
  }

  if (didChange) writeFile('ARCHITECTURE.md', current, content);
}

// ============================================================================
// GIT PUSH AUTOMÁTICO
// ============================================================================
function gitPush() {
  const files = [
    'README.md',
    'CURRENT_STATE.md',
    'DEPLOYMENT_STATE.md',
    'DEPLOYMENT_GUIDE.md',
    'PWA_SETUP.md',
    'USER_MANUAL.md',
    'API_REFERENCE.md',
    'ARCHITECTURE.md',
    'scripts/update-docs-v4.5.8.cjs'
  ];

  log(C.bold + C.cyan, '\n[git]', 'Agregando archivos al stage...');
  files.forEach(f => {
    try {
      execSync(`git add "${f}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
      log(C.gray, '[git add]', f);
    } catch (e) {
      log(C.red, '[git add FAIL]', f);
      throw e;
    }
  });

  log(C.bold + C.cyan, '\n[git]', 'Creando commit...');
  const commitMsg = 'docs: actualizar headers de version a v4.5.8 (FIX-101 + FIX-105)';
  try {
    execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch (e) {
    log(C.yellow, '[git commit]', 'Sin cambios o ya commiteado. Continuando.');
  }

  log(C.bold + C.cyan, '\n[git]', 'Push a origin/main...');
  try {
    execSync('git push origin main', { cwd: ROOT_DIR, stdio: 'inherit' });
  } catch (e) {
    log(C.red, '[git push FAIL]', 'Error en push. Revisá manualmente.');
    throw e;
  }

  log(C.green, '\n[git]', '✅ Push exitoso.');
}

// ============================================================================
// MAIN
// ============================================================================
console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════════════════════════╗
║  PARAGUAY-FFAA | METALSTORM — Docs v4.5.8 (8 archivos)           ║
╚══════════════════════════════════════════════════════════════════╝${C.reset}`);

log(C.gray, '[MODE]', APPLY ? 'APPLY + COMMIT + PUSH' : 'DRY-RUN (sin cambios)');

try {
  fixReadme();
  fixCurrentState();
  fixDeploymentState();
  fixDeploymentGuide();
  fixPwaSetup();
  fixUserManual();
  fixApiReference();
  fixArchitecture();
} catch (err) {
  abort(`Error durante la aplicación: ${err.message}`);
}

if (!APPLY) {
  console.log(`\n${C.yellow}${C.bold}MODO DRY-RUN — No se modificó nada.${C.reset}`);
  console.log(`\n${C.bold}SIGUIENTE PASO (aplicar + commit + push):${C.reset}`);
  console.log(`  node scripts\\update-docs-v4.5.8.cjs --apply`);
  process.exit(0);
}

// Modo APPLY: commit y push automático
gitPush();

console.log(`\n${C.green}${C.bold}✅ DOCUMENTACIÓN ACTUALIZADA Y SUBIDA A GITHUB.${C.reset}`);
console.log(`\n${C.bold}Rollback si algo falla:${C.reset}`);
console.log(`  git revert HEAD && git push origin main`);
console.log(`\n${C.bold}Backups de seguridad (por si acaso):${C.reset}`);
console.log(`  *.bak-docs-v458`);
console.log(`\n${C.bold}Limpiar backups tras verificar:${C.reset}`);
console.log(`  del /s *.bak-docs-v458`);