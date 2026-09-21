#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const TARGET=path.join(ROOT,'docs','SESSION_HANDOFF.md');
const NL='\n';
function ts(){const d=new Date(),p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;}
function abort(m){console.error(`\n❌ ABORTO: ${m}\n`);process.exit(1);}
function ok(m){console.log(`✓ ${m}`);}
if(!fs.existsSync(TARGET))abort(`No existe: ${TARGET}`);
const original=fs.readFileSync(TARGET,'utf8');
console.log(`\n📄 SESSION_HANDOFF.md — ${original.length}b\n`);

const cambios=[
{a:['> **Actualizado:** 2026-09-20 (última actualización: cierre Sprint 0 Grupo F)',
'> **Última sesión completada:** Sprint 0 — Grupo F (FIX-007: submission-window en API_REFERENCE.md)',
'> **Próximo paso:** Sprint 0 — Grupo G (FIX-002, 016, 019, 020, 023, 024, 025)'].join(NL),
b:['> **Actualizado:** 2026-09-20 (última actualización: **cierre Sprint 0 COMPLETO**)',
'> **Última sesión completada:** Sprint 0 — Grupo G (FIX-002, 016, 019, 020, 023, 024, 025)',
'> **Próximo paso:** Sprint 1 — Verificación de código crítico'].join(NL)},
{a:'- **Tests:** Vitest 5.0.1 (**110 tests pasando**: 93 previos + 17 nuevos)',
b:'- **Tests:** Vitest 5.0.1 (**167 tests pasando**: 128 previos + 39 nuevos ADR-008)'},
{a:['## 🎯 SPRINT 0 — SINCRONIZACIÓN DOCUMENTAL (EN CURSO)','',
'**Objetivo:** alinear toda la documentación con la versión real (v4.3.0) y eliminar contradicciones internas.','',
'**Estado:**','SPRINT 0 — Sincronización documental urgente',
'├── ✅ Grupo A — Versiones (FIX-001, 005, 014, 015, 017, 026)',
'├── ✅ Grupo B — Cuota ADMIN 3→5 (FIX-004, 009, 011, 018)',
'├── ✅ Grupo C — BM legacy (FIX-003, 008, 010)',
'├── ✅ Grupo D — ADRs (FIX-012, 013) + FIX-209 nuevo',
'├── ✅ Grupo E — Timezone + duración SQ/BM (FIX-006, 021, 022)',
'├── ✅ Grupo F — submission-window (FIX-007) ← CERRADO 2026-09-20',
'└── ⏳ Grupo G — Ajustes menores (FIX-002, 016, 019, 020, 023, 024, 025) ← PRÓXIMO','',
'**6/7 grupos cerrados. Solo falta Grupo G.**'].join(NL),
b:['## ✅ SPRINT 0 — SINCRONIZACIÓN DOCUMENTAL (CERRADO)','',
'**Objetivo:** alinear toda la documentación con la versión real (v4.3.0) y eliminar contradicciones internas.','',
'**Estado:**','SPRINT 0 — Sincronización documental urgente',
'├── ✅ Grupo A — Versiones (FIX-001, 005, 014, 015, 017, 026)',
'├── ✅ Grupo B — Cuota ADMIN 3→5 (FIX-004, 009, 011, 018)',
'├── ✅ Grupo C — BM legacy (FIX-003, 008, 010)',
'├── ✅ Grupo D — ADRs (FIX-012, 013) + FIX-209 nuevo',
'├── ✅ Grupo E — Timezone + duración SQ/BM (FIX-006, 021, 022)',
'├── ✅ Grupo F — submission-window (FIX-007) ← CERRADO 2026-09-20',
'└── ✅ Grupo G — Ajustes menores (FIX-002, 016, 019, 020, 023, 024, 025) ← CERRADO 2026-09-20','',
'**✅ Sprint 0 COMPLETO — 7/7 grupos cerrados.**'].join(NL)},
{a:['## 2. ESTADO ACTUAL (post-Grupo F, 2026-09-20 ~23:30 UTC)','',
'| Aspecto | Valor |','|---|---|',
'| Commit HEAD | `3077dcb` (docs(sprint-0-grupoF): cerrar FIX-007 + versionar script .cjs) |',
'| Branch | `main` |','| Working tree | ✅ Limpio |','| Push | ✅ Sincronizado con origin/main |',
'| Versión runtime | v4.3.0 (sin cambios desde F5) |','| Versión docs | v4.3.1-docs (Sprint 0, no publicada) |',
'| Deploy producción | ✅ Activo en Fly.io (`gru`) |','| Tests | ✅ 167/167 passing (Vitest 5.0.1) |',
'| Service Worker | v4.3.0 |','| Offset PY en logs | ✅ UTC-3 |',
'| ADRs cerrados | ADR-001 a ADR-005 + ADR-006, ADR-007, ADR-008 |','','',
'**Últimos commits:**','```',
'3077dcb (HEAD) docs(sprint-0-grupoF): cerrar FIX-007 + versionar script .cjs',
'f734dd4 docs(sprint-0-grupoF): documentar endpoints submission-window (FIX-007)',
'fb8ff75 docs(sprint-0-grupoE): reemplazar TBD por dd5d17d + versionar scripts .cjs del Grupo E',
'dd5d17d docs(sprint-0-grupoE): timezone UTC-3 fijo + duracion SQ evento 4d / ventana 7d (FIX-006/021/022)',
'26e3bf4 docs(sprint-0-grupoD): reemplazar TBD por commit real 079889f en COMPLETADOS','```'].join(NL),
b:['## 2. ESTADO ACTUAL (post-Grupo G, 2026-09-20 — Sprint 0 COMPLETO)','',
'| Aspecto | Valor |','|---|---|',
'| Commit HEAD | `879c482` (chore(sprint-0-grupoG): versionar script DEPLOYMENT_STATE) |',
'| Branch | `main` |','| Working tree | ✅ Limpio |','| Push | ✅ Sincronizado con origin/main |',
'| Versión runtime | v4.3.0 (sin cambios desde F5) |','| Versión docs | v4.3.1-docs (Sprint 0, no publicada) |',
'| Deploy producción | ✅ Activo en Fly.io (`gru`) |','| Tests | ✅ 167/167 passing (Vitest 5.0.1) |',
'| Service Worker | v4.3.0 |','| Offset PY en logs | ✅ UTC-3 |',
'| ADRs cerrados | ADR-001 a ADR-005 + ADR-006, ADR-007, ADR-008 |','','',
'**Últimos commits:**','```',
'879c482 (HEAD) chore(sprint-0-grupoG): versionar script DEPLOYMENT_STATE (FIX-025)',
'802f0dd docs(sprint-0-grupoG): DEPLOYMENT_STATE sección legacy BM + F4.5 pendiente (FIX-025)',
'73d12b1 chore(sprint-0-grupoG): versionar script BACKLOG (FIX-019 no aplicable / FIX-020)',
'd8e88fb docs(sprint-0-grupoG): BACKLOG BL-059 limpio + hash real (FIX-020); FIX-019 no aplicable',
'68da914 chore(sprint-0-grupoG): versionar script USER_MANUAL (FIX-016)',
'd2752f3 docs(sprint-0-grupoG): USER_MANUAL v4.0.0→v4.3.0 + sección ADR-008 (FIX-016)',
'595314f chore(sprint-0-grupoG): versionar script de reparación README (FIX-002/023/024)',
'77be901 docs(sprint-0-grupoG): README — árbol SQL 2→35 + ancla + drop metadata.json (FIX-002/023/024)','```'].join(NL)},
{a:['## 10. CÓMO RETOMAR LA SESIÓN','','En una nueva conversación:','',
'1. **Adjuntar este `SESSION_HANDOFF.md`.**',
'2. **Escribir:** "Continuemos con F4.5 (DROP tablas BM legacy post-2026-09-26)".',
'3. **Opcionalmente adjuntar:**','   - `sql/032_drop_bm_legacy_tables.sql`.',
'   - `docs/adr/ADR-007-rediseno-eventos-v2.md`.','',
'**La IA leerá el handoff, entenderá el contexto y arrancará con F4.5.**'].join(NL),
b:['## 10. CÓMO RETOMAR LA SESIÓN','','En una nueva conversación:','',
'1. **Adjuntar este `SESSION_HANDOFF.md`.**',
'2. **Escribir:** "Continuemos con Sprint 1 (verificación de código crítico)".',
'3. **Opcionalmente adjuntar:**','   - `PLAN_TRABAJO.md` (sección SPRINT 1 con los 8 hallazgos FIX-101 a FIX-108).',
'   - Los archivos a verificar según el hallazgo.','',
'**La IA leerá el handoff, entenderá el contexto y arrancará con Sprint 1.**','',
'> ⚠️ **Excepciones operativas en paralelo:**',
'> - **Jueves 24-09-2026:** verificar W39 en Supabase (scheduler).',
'> - **Post-2026-09-26:** ejecutar F4.5 (DROP tablas BM legacy).'].join(NL)},
{a:['## 12. CHECKLIST DE CIERRE DE ESTA SESIÓN','',
'- [x] HALL-065 v2 identificado y diagnosticado','- [x] Fix aplicado: offset UTC-4 → UTC-3',
'- [x] W38 corregido en BD con fechas consistentes','- [x] 17 tests automatizados creados',
'- [x] 110/110 tests pasando','- [x] Deploy a producción (deployment-01M2YHNVV30YCWSKBFA3RSM5R4)',
'- [x] Log del scheduler muestra UTC-3','- [x] CHANGELOG [4.1.1] documentado',
'- [x] BACKLOG actualizado','- [x] SESSION_HANDOFF regenerado',
'- [ ] **Commit + push del mini-commit de docs**','- [ ] **Verificar W39 el jueves 24-09**',
'- [ ] **F4.5 (DROP tablas BM legacy) post-2026-09-26**','',
'**Sistema: 100% operativo con HALL-065 v2 aplicado.**'].join(NL),
b:['## 12. CHECKLIST DE CIERRE — SPRINT 0 COMPLETO','','### Grupo G (2026-09-20)','',
'- [x] FIX-002/023/024 aplicados en `README.md` (`77be901`)',
'- [x] FIX-016 aplicado en `USER_MANUAL.md` (`d2752f3`)',
'- [x] FIX-019 verificado — no aplicable (`d8e88fb`)',
'- [x] FIX-020 aplicado en `BACKLOG.md` (`d8e88fb`)',
'- [x] FIX-025 aplicado en `DEPLOYMENT_STATE.md` (`802f0dd`)',
'- [x] 4 scripts `.cjs` versionados en `scripts/`',
'- [x] Mini-commit TBD (PLAN_TRABAJO + SESSION_HANDOFF)','- [x] Push a origin/main','',
'### Pendientes operativos post-Sprint 0','',
'- [ ] **Sprint 1** — Verificación de código crítico (FIX-101 a FIX-108)',
'- [ ] **Verificar W39** el jueves 24-09 (scheduler)',
'- [ ] **F4.5** (DROP tablas BM legacy) post-2026-09-26',
'- [ ] **Reportar a Supabase** bug de tzdata (`America/Asuncion` devuelve UTC-4)','',
'**Sistema: 100% operativo — Sprint 0 COMPLETO.**'].join(NL)},
{a:['## 13. PRÓXIMOS PASOS (visión global)','','| Sub-fase | Descripción | Estimación |','|---|---|---|',
'| **Mini-commit docs** | CHANGELOG + BACKLOG + SESSION_HANDOFF | ~10 min |',
'| **Verificación W39** | Jueves 24-09 (automático) | ~10 min |',
'| **F4.5** | DROP tablas BM legacy (post-2026-09-26) | ~10 min |'].join(NL),
b:['## 13. PRÓXIMOS PASOS (visión global)','','| Sub-fase | Descripción | Estimación |','|---|---|---|',
'| **Sprint 1** | Verificación de código crítico (8 hallazgos FIX-101 a FIX-108) | 4-6 h |',
'| **Verificación W39** | Jueves 24-09 (automático) | ~10 min |',
'| **F4.5** | DROP tablas BM legacy (post-2026-09-26) | ~10 min |'].join(NL)},
{a:'**PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-09-20 · Commit 074fdc3**',
b:'**PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-09-20 · Commit 879c482**'},
];

console.log('🔎 Verificando precondiciones...\n');
cambios.forEach((c,i)=>{
  if(!original.includes(c.a))abort(`Cambio ${i+1}: no matchea.`);
  ok(`Cambio ${i+1} OK.`);
});

console.log('\n💾 Backup...\n');
const bak=`${TARGET}.bak-${ts()}`;
fs.writeFileSync(bak,original,'utf8');
ok(`Backup: ${path.basename(bak)}`);

console.log('\n🔧 Aplicando...\n');
let r=original;
cambios.forEach((c,i)=>{
  const before=r;r=r.replace(c.a,c.b);
  if(r===before)abort(`Cambio ${i+1}: replace sin efecto.`);
  ok(`Cambio ${i+1} aplicado.`);
});

console.log('\n✍️  Escribiendo...\n');
fs.writeFileSync(TARGET,r,'utf8');
ok(`Escrito (${r.length}b, delta ${r.length-original.length>0?'+':''}${r.length-original.length}).`);

console.log('\n✅ TBD SESSION_HANDOFF.md aplicado.\n');
