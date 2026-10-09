/**
 * FASE 6 — Generador de documentación v4.7.0
 * Uso: node scripts/fase-f6-docs.cjs [--dry-run]
 *
 * Genera:
 *   - CHANGELOG.md (inserta entrada [4.7.0] al inicio)
 *   - CURRENT_STATE.md (inserta sección F6 al inicio)
 *   - docs/HANDOFF-v4.7.0.md (nuevo)
 *   - PLAN_MEJORA_ADMIN_PANEL.md (marca F6 como completada)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');
const FECHA = new Date().toISOString().slice(0, 10);
const VERSION = '4.7.0';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function backup(file) {
  if (!fs.existsSync(file)) return;
  const bak = file + '.bak-f6-docs';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(file, bak);
    console.log(`  📦 Backup: ${path.basename(bak)}`);
  }
}

function write(file, content) {
  if (DRY_RUN) {
    console.log(`  🔍 DRY-RUN: escribiría ${path.basename(file)} (${content.length} bytes)`);
    return;
  }
  fs.writeFileSync(file, content, 'utf8');
  console.log(`  ✅ ${path.basename(file)} (${content.length} bytes)`);
}

function readOrEmpty(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

// ─────────────────────────────────────────────────────────────
// 1. CHANGELOG.md — insertar entrada [4.7.0]
// ─────────────────────────────────────────────────────────────

function updateChangelog() {
  console.log('\n📝 [1/4] CHANGELOG.md');
  const file = path.join(ROOT, 'CHANGELOG.md');
  const current = readOrEmpty(file);

  const entry = `## [4.7.0] - ${FECHA}

### ✨ Añadido — Panel de Comandancia (F6)

- **Sidebar colapsable** con 5 secciones: Resumen, Dotación, Eventos, Catálogo, Estado.
- **Navegación interna** con lazy loading de secciones.
- **Persistencia en localStorage**: sección activa + estado del sidebar.
- **KPIs en tiempo real** en la sección Resumen (Pilotos Activos, Promedio, Riesgo, Última Sync).
- **Distribución de Rendimiento** (Semáforo Militar: VERDE/NARANJA/ROJO/NEGRO).
- **Tabs internos** en Dotación (Activos/Inactivos/Todos) con contadores.
- **Modo compacto** de tabla.
- **Sub-tabs** en Eventos (Lista/Carga Masiva/Exportar Resultados).
- **Sección Estado** con scheduler + health + versión.
- **Mobile drawer** para el sidebar en <768px.

### 🐛 Corregido

- **IDs de KPIs unificados** (\`adminTotalMembers\`, \`adminAtRiskMembers\`, \`adminLastUpdate\`, \`adminActiveDetail\`).
- **\`renderPilotsByStatus()\`** ahora usa \`adminPilotsByStatus\` con fallback al ID viejo.
- **\`renderAdminStats()\`** actualiza los IDs correctos.
- **\`window.adminMembersCache\`** expuesto para que admin-sections.js acceda a los datos.
- **Race condition** en \`initAdminSummarySection()\`: espera activa hasta 3s por el cache.

### 🔧 Infraestructura

- **Migración completa a Render** como único entorno de producción.
- **Fly.io app destruida** para evitar costos y confusión.
- **Bump \`CACHE_NAME\`** a \`v4.7.1\` en \`sw.js\`.
- **Backup de 19 variables** de entorno en Bitwarden.

### ⚠️ URL oficial

- **Nueva:** \`https://paraguay-ffaa-metalstorm.onrender.com\`
- **Vieja (deprecada):** \`https://paraguay-ffaa-metalstorm.fly.dev\` (ya no existe)

### 📋 Pendiente

- Documentación de arquitectura F7.
- Tests automatizados.

---

`;

  if (current.includes('## [4.7.0]')) {
    console.log('  ⚠️  Entrada [4.7.0] ya existe, saltando');
    return;
  }

  // Buscar el primer "---" y la primera entrada de versión
  const firstEntry = current.match(/^## \[\d+\.\d+\.\d+\]/m);
  if (!firstEntry) {
    console.log('  ⚠️  No encontré ninguna entrada de versión previa');
    console.log('  → Insertando al final del header');
    write(file, current + '\n---\n\n' + entry);
    return;
  }

  const idx = firstEntry.index;
  const newContent = current.slice(0, idx) + entry + current.slice(idx);
  backup(file);
  write(file, newContent);
}

// ─────────────────────────────────────────────────────────────
// 2. CURRENT_STATE.md — insertar sección F6
// ─────────────────────────────────────────────────────────────

function updateCurrentState() {
  console.log('\n📝 [2/4] CURRENT_STATE.md');
  const file = path.join(ROOT, 'CURRENT_STATE.md');
  const current = readOrEmpty(file);

  const section = `## Cambios Recientes (${FECHA}) — F6 Panel Admin v4.7.0

### Rediseño Completo del Panel de Comandancia

Se completó el rediseño del Panel Admin (F6) con las siguientes mejoras:

| # | Item | Estado |
|---|------|--------|
| 1 | Sidebar colapsable con 5 secciones | ✅ |
| 2 | Navegación interna con lazy loading | ✅ |
| 3 | Persistencia en localStorage | ✅ |
| 4 | KPIs en tiempo real (Activos/Promedio/Riesgo/Sync) | ✅ |
| 5 | Distribución de Rendimiento (Semáforo Militar) | ✅ |
| 6 | Tabs internos (Activos/Inactivos/Todos) | ✅ |
| 7 | Modo compacto de tabla | ✅ |
| 8 | Sub-tabs Eventos (Lista/Carga/Export) | ✅ |
| 9 | Sección Estado (scheduler/health/versión) | ✅ |
| 10 | Mobile drawer | ✅ |
| 11 | Deploy en Render | ✅ Live |
| 12 | Fly.io destruida | ✅ Sin costo |
| 13 | Backup de secrets en Bitwarden | ✅ |

**Commits clave:**
- \`3468fd1\` fix(admin): renderPilotsByStatus usa ID adminPilotsByStatus (fix definitivo)
- \`cbbf3a2\` fix(admin): exponer adminMembersCache + esperar carga para distribución
- \`d2e0d12\` chore(cache): bump CACHE_NAME a v4.7.1
- \`55c3f48\` feat(admin): rediseño del Panel de Comandancia v4.7.0

**URL oficial:** https://paraguay-ffaa-metalstorm.onrender.com

**Referencias:**
- \`docs/HANDOFF-v4.7.0.md\` — handoff completo
- \`CHANGELOG.md\` — entrada [4.7.0]

---

`;

  if (current.includes('F6 Panel Admin v4.7.0')) {
    console.log('  ⚠️  Sección ya existe, saltando');
    return;
  }

  backup(file);
  write(file, section + current);
}

// ─────────────────────────────────────────────────────────────
// 3. docs/HANDOFF-v4.7.0.md — crear nuevo
// ─────────────────────────────────────────────────────────────

function createHandoff() {
  console.log('\n📝 [3/4] docs/HANDOFF-v4.7.0.md');
  const dir = path.join(ROOT, 'docs');
  if (!fs.existsSync(dir)) {
    if (DRY_RUN) { console.log('  🔍 DRY-RUN: crearía docs/'); }
    else { fs.mkdirSync(dir, { recursive: true }); }
  }

  const file = path.join(dir, 'HANDOFF-v4.7.0.md');

  const content = `# Handoff — v4.7.0 (Panel de Comandancia F6)

**Fecha:** ${FECHA}
**Commit final:** \`3468fd1\`
**Deploy:** Render (live)
**URL:** https://paraguay-ffaa-metalstorm.onrender.com

---

## 1. Qué se hizo en F6

### Rediseño del Panel Admin

- Sidebar colapsable con 5 secciones.
- Lazy loading de secciones.
- Persistencia de estado en localStorage.
- KPIs en tiempo real con render dinámico.
- Distribución de rendimiento (semáforo 4 cuadrantes).
- Tabs internos y modo compacto.
- Mobile drawer responsive.

### 5 bugs corregidos

| # | Bug | Fix |
|---|-----|-----|
| 1 | IDs de KPIs sin prefijo admin | commit \`643a14d\` |
| 2 | \`renderPilotsByStatus\` buscaba ID viejo | commit \`3468fd1\` |
| 3 | \`window.adminMembersCache\` no expuesto | commit \`cbbf3a2\` |
| 4 | Race condition en init de sección | commit \`cbbf3a2\` |
| 5 | Service Worker cacheaba assets viejos | Unregister manual + bump a v4.7.1 |

---

## 2. Commits de F6

\`\`\`
3468fd1 fix(admin): renderPilotsByStatus usa ID adminPilotsByStatus (fix definitivo)
cbbf3a2 fix(admin): exponer adminMembersCache + esperar carga para distribución
d2e0d12 chore(cache): bump CACHE_NAME a v4.7.1
a7d9d2e fix(admin): mover scripts embebidos a admin-sections.js
643a14d fix(admin): IDs de KPIs en sección Resumen
55c3f48 feat(admin): rediseño del Panel de Comandancia v4.7.0
\`\`\`

---

## 3. Migración fuera de Fly.io

**Motivo:** app quedó activa de un deploy anterior, riesgo de costo.

**Acciones:**
1. Backup de 19 variables de entorno → Bitwarden.
2. \`fly apps destroy paraguay-ffaa-metalstorm\`
3. URL \`fly.dev\` deprecada.
4. Pilotos deben usar Render.

**Verificación:**
\`\`\`cmd
fly apps list
\`\`\`
**Esperado:** \`paraguay-ffaa-metalstorm\` ya no aparece.

---

## 4. Lecciones aprendidas

### ⚠️ Orden correcto de operaciones

**MAL:**
\`\`\`
git add → git commit → node script-fix.cjs → git push
\`\`\`

**BIEN:**
\`\`\`
node script-fix.cjs → findstr (verificar) → git status → git add → git commit → git push
\`\`\`

### ⚠️ Service Worker + desarrollo activo

Al hacer cambios en JS durante desarrollo activo:
1. Unregister SW en F12 → Application → Service Workers
2. Clear site data en F12 → Application → Storage
3. Ctrl+Shift+R
4. Recién entonces verificar

### ⚠️ Verificar commits antes de pushear

Antes de \`git push\`:
\`\`\`cmd
git show HEAD:archivo.js | findstr /C:"string-que-deberia-estar"
\`\`\`

---

## 5. Pendientes

- [ ] Comunicar nueva URL al escuadrón.
- [ ] Documentación de arquitectura F7.
- [ ] Tests automatizados.
- [ ] Migrar \`FRONTEND_URL\` a dominio propio (opcional).

---

**PARAGUAY FFAA [PRY] · HANDOFF v4.7.0 · ${FECHA}**
`;

  if (fs.existsSync(file)) {
    console.log('  ⚠️  Ya existe, saltando');
    return;
  }
  write(file, content);
}

// ─────────────────────────────────────────────────────────────
// 4. PLAN_MEJORA_ADMIN_PANEL.md — marcar F6 como completada
// ─────────────────────────────────────────────────────────────

function updatePlan() {
  console.log('\n📝 [4/4] PLAN_MEJORA_ADMIN_PANEL.md');
  const file = path.join(ROOT, 'PLAN_MEJORA_ADMIN_PANEL.md');

  if (!fs.existsSync(file)) {
    console.log('  ⚠️  No existe, saltando');
    return;
  }

  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('F6 — ✅ COMPLETADA')) {
    console.log('  ⚠️  F6 ya marcada como completada, saltando');
    return;
  }

  // Actualizar el header
  content = content.replace(
    /Estado:\s*🟡 En planificación \(Fase 1: Mockup\)/,
    'Estado: ✅ **COMPLETADA** (F6 cerrada el ' + FECHA + ')'
  );

  // Anexar sección de cierre
  const cierre = `

---

## ✅ 16. CIERRE F6 — ${FECHA}

F6 quedó completada y desplegada en producción.

### Criterios de cierre cumplidos

- [x] Sidebar funcional con 5 secciones.
- [x] Colapsable en desktop, drawer en mobile.
- [x] Persistencia de sección activa en localStorage.
- [x] Sección Dotación abre con tab "Activos" por defecto.
- [x] Modo compacto de tabla funcional.
- [x] Catálogo integrado como sección.
- [x] Export integrado en Eventos.
- [x] Sección Estado operativa (scheduler + health + logs).
- [x] Acciones rápidas inline en tabla.
- [x] Skeleton screens en carga.
- [x] Empty states con acción.
- [x] CACHE_NAME bumpeado.
- [x] Deploy exitoso.
- [x] Smoke test OK.
- [x] Documentación sincronizada.
- [x] Handoff generado.

### Bugs corregidos en F6

1. IDs de KPIs sin prefijo admin.
2. \`renderPilotsByStatus\` buscaba ID viejo.
3. \`window.adminMembersCache\` no expuesto.
4. Race condition en init de sección.
5. Service Worker cacheaba assets viejos.

### Commits clave

\`\`\`
3468fd1 fix(admin): renderPilotsByStatus usa ID adminPilotsByStatus
cbbf3a2 fix(admin): exponer adminMembersCache + esperar carga
d2e0d12 chore(cache): bump CACHE_NAME a v4.7.1
55c3f48 feat(admin): rediseño del Panel de Comandancia v4.7.0
\`\`\`

### Estado final

| Item | Estado |
|------|--------|
| Panel Admin | ✅ Live en Render |
| KPIs | ✅ Con datos reales |
| Distribución | ✅ 4 cuadrantes |
| Fly.io | ☠️ Destruida |
| Costo mensual | $0 |
`;

  backup(file);
  write(file, content + cierre);
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

function main() {
  console.log(`\n🔧 FASE 6 — Generador de documentación v${VERSION}`);
  console.log(`📁 ROOT: ${ROOT}`);
  console.log(`📅 Fecha: ${FECHA}`);
  if (DRY_RUN) console.log('🔍 MODO DRY-RUN (no escribe nada)\n');
  else console.log('');

  if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
    console.error('❌ No estoy en la raíz del proyecto (falta package.json)');
    process.exit(1);
  }

  try {
    updateChangelog();
    updateCurrentState();
    createHandoff();
    updatePlan();

    console.log('\n═══════════════════════════════════════════════');
    if (DRY_RUN) {
      console.log('  🔍 DRY-RUN completado — nada escrito');
      console.log('  → Corré sin --dry-run para aplicar');
    } else {
      console.log('  ✅ Documentación generada');
      console.log('  → Revisar con: git status');
      console.log('  → Commit: git add *.md docs/ && git commit -m "docs: cerrar F6 v4.7.0"');
    }
    console.log('═══════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('Rollback: copiar los .bak-f6-docs sobre los originales');
    process.exit(1);
  }
}

main();