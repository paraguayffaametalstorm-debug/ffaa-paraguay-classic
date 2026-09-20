# 🔄 SESSION HANDOFF — PARAGUAY-FFAA | METALSTORM

> **Documento de traspaso entre sesiones de trabajo.**
> **Actualizado:** 2026-09-20
> **Última sesión completada:** F4.4 Parte 2 (ADR-007 + CHANGELOG + CURRENT_STATE + API_REFERENCE + deploy final)
> **Próximo paso:** F4.5 (post-deploy: DROP tablas BM legacy después del 2026-09-26)

---

## 1. CONTEXTO DEL PROYECTO

**PARAGUAY-FFAA | METALSTORM** es una plataforma táctica del escuadrón paraguayo `PARAGUAY FFAA [PRY]` en MetalStorm.

- **Backend:** Node.js 22 + Express 5 + Supabase PostgreSQL
- **Frontend:** Vanilla JS SPA + PWA
- **Deploy:** Fly.io (región `gru` - São Paulo)
- **Repo:** `paraguayffaametalstorm-debug/ffaa-paraguay-classic`
- **Producción:** `https://paraguay-ffaa-metalstorm.fly.dev`
- **Tests:** Vitest 5.0.1 (93 tests pasando)

**Trabajo activo:** Post-rediseño de Eventos v2 (F4.x).

---

## 2. ESTADO ACTUAL

| Aspecto | Valor |
|---|---|
| Commit HEAD | `4ab67cd` (pendiente commit de F4.4 docs) |
| Branch | `main` |
| Working tree | ⚠️ Con cambios sin commitear (ADR-007 + 4 docs actualizados) |
| Push | Pendiente push |
| Deploy producción | ⏳ **Pendiente** (F4.4) |
| Tests | ✅ 93/93 passed |
| Service Worker | v4.1.0 |
| Frontend api.js/bm.js | v4.1.0 (cache-busted) |

**Últimos commits en origin/main:**
```
4ab67cd fix(ui): BL-020 widget y formulario de evento timezone-aware
7f1ce93 fix(scheduler): HALL-065 corregir timezone PY y duracion del evento SQ
1b6b9ec docs(backlog): registrar HALL-065 (scheduler timezone) y BL-020 (widget timezone-aware)
b5d542b feat(f4.3): vistas adaptativas + UI evento activo
75ad2df docs(session): handoff post F4.2.2 (rediseno BM completo + deploy)
```

---

## 3. PROGRESO DEL REDISEÑO F4

| Fase | Descripción | Estado | Commit |
|---|---|---|---|
| **F4.1** | Auditoría frontend legacy | ✅ CERRADA | `cd77149` |
| **F4.2.1** | Cliente `apiEventsV2*` en `js/api.js` | ✅ CERRADA | `4f88d3f` |
| **F4.2.2-A** | Schemas BM + ADR-006 | ✅ CERRADA | `6b61852` |
| **F4.2.2-B** | 8 endpoints BM en `/api/events-v2/bm/*` | ✅ CERRADA | `2a6cb12` |
| **F4.2.2-C** | 93 tests con Vitest | ✅ CERRADA | `05bea21` |
| **F4.2.2-D** | Migración BM histórico (`legacy_bm: true`) | ✅ CERRADA | (SQL ejecutado) |
| **F4.2.2-E** | Refactor `js/api.js` | ✅ CERRADA | `7ca8450` |
| **F4.2.2-F** | Refactor `js/bm.js` | ✅ CERRADA | `7387d3c` + `9b8ea0e` |
| **F4.2.2-G** | DROP backend BM legacy | ✅ CERRADA | `42867fd` |
| **F4.3** | Vistas adaptativas + UI evento activo | ✅ CERRADA | `b5d542b` |
| **F4.3 (fix)** | HALL-065 (scheduler timezone) + BL-020 (widget timezone) | ✅ CERRADA | `7f1ce93` + `4ab67cd` |
| **F4.4** | ADR-007 + docs + deploy final | ✅ **CERRADA** | (pendiente commit) |
| **F4.5** | DROP tablas BM legacy (post-2026-09-26) | ⏳ Pendiente | — |

---

## 4. TRABAJO COMPLETADO EN ESTA SESIÓN (F4.4 Parte 2)

### 4.1 ADR-007 — Rediseño de Eventos v2

**Archivo:** `docs/adr/ADR-007-rediseno-eventos-v2.md` (NUEVO, 5794 bytes)

Reemplaza al ADR-006 (Black Market Unificado). Documenta la unificación SQ + BM sobre `events_master` + `event_participations`, el switch funcional (1 evento OPEN a la vez), el scheduler timezone-aware y las consecuencias del rediseño.

### 4.2 CHANGELOG [4.1.0]

**Archivo:** `CHANGELOG.md` (MODIFICADO, +4697 bytes)

Nueva entrada `[4.1.0] - 2026-09-20` con:
- 12 sub-fases del rediseño (F4.1 a F4.3-fix).
- HALL-065 + BL-020 documentados.
- Arquitectura nueva.
- 1666 líneas eliminadas.
- 16 endpoints unificados.
- 93 tests pasando.

### 4.3 BACKLOG

**Archivo:** `BACKLOG.md` (MODIFICADO, -439 bytes)

- HALL-065 → Completados (línea 128).
- BL-020 → Completados (línea 129).
- BL-021 → Completados (línea 130, nuevo item).
- Items activos: 17 → **15**.
- Items completados: 4 → **7**.

### 4.4 API_REFERENCE §3.5

**Archivo:** `API_REFERENCE.md` (MODIFICADO, +7148 bytes)

Completadas las 3 subsecciones faltantes:
- §3.5.2: Endpoints de eventos (línea 496).
- §3.5.3: Participaciones (línea 647).
- §3.5.4: Deprecación legacy con sunset 2026-12-16 (línea 745).

Eliminada la nota de deuda técnica `BL-018`.

### 4.5 CURRENT_STATE

**Archivo:** `CURRENT_STATE.md` (MODIFICADO, +2947 bytes)

- Header actualizado a v4.1.0, fecha 2026-09-20.
- Punto 6 agregado al resumen ejecutivo (Rediseño de Eventos v2).
- Nueva sección "🎯 Eventos v2 Unificados (v4.1.0)" en línea 27.
- Nueva fila en la tabla de módulos (línea 245).

---

## 5. PRÓXIMO PASO — F4.5 (post-deploy)

**Objetivo:** Ejecutar el DROP de tablas BM legacy después de 7 días de gracia.

**Alcance (estimado ~10 min):**

1. **Esperar hasta 2026-09-26** (7 días post-deploy F4.4).
2. **Verificar estabilidad:**
   - `fly logs -a paraguay-ffaa-metalstorm` sin errores relacionados a BM.
   - Dashboard Supabase sin picos.
   - Pilotos activos sin reportes de bugs.
3. **Ejecutar SQL:**
   - Abrir Supabase SQL Editor.
   - Pegar contenido de `sql/032_drop_bm_legacy_tables.sql`.
   - Ejecutar.
   - Verificar que las 4 tablas (`bm_events`, `bm_missions`, `bm_progress`, `bm_discounts`) fueron eliminadas.
4. **Commit del DDL** (si no estaba commiteado aún).

**Referencias:**
- `sql/032_drop_bm_legacy_tables.sql`
- `docs/adr/ADR-007-rediseno-eventos-v2.md`

---

## 6. DECISIONES CLAVE DE LA SESIÓN

### ADR-007 reemplaza a ADR-006

**Decisión:** El ADR-006 (Black Market Unificado) queda **superseded** por el ADR-007 (Rediseño de Eventos v2). El ADR-007 documenta la arquitectura final.

### Switch funcional (1 evento OPEN a la vez)

**Decisión:** Solo puede existir **1 evento `OPEN`** en todo el sistema, garantizado por índice UNIQUE parcial `idx_events_master_single_open`. Al activar un BM, el SQ se cierra con `closed_reason = 'BM_REPLACED'`.

### Scheduler timezone-aware (HALL-065)

**Decisión:** El scheduler SQ calcula el offset de Paraguay (`America/Asuncion`, UTC-4/UTC-3) dinámicamente vía `Intl.DateTimeFormat`. Duración: +4 días (jueves 09:00 PY - lunes 09:00 PY).

### Widget timezone-aware (BL-020)

**Decisión:** El widget de evento activo usa `undefined` en `toLocaleDateString` (locale del navegador), con referencia UTC explícita.

### Deprecación legacy SQ

**Decisión:** `/api/events/*` queda deprecado con sunset **2026-12-16** (90 días desde F4.3). Los endpoints legacy BM (`/api/bm/*`) fueron eliminados en F4.2.2-G.

---

## 7. ARCHIVOS RELEVANTES

### Docs (modificados/creados en esta sesión)

- ➕ `docs/adr/ADR-007-rediseno-eventos-v2.md` (NUEVO)
- ✏️ `CHANGELOG.md` (MODIFICADO)
- ✏️ `BACKLOG.md` (MODIFICADO)
- ✏️ `API_REFERENCE.md` (MODIFICADO)
- ✏️ `CURRENT_STATE.md` (MODIFICADO)
- ✏️ `SESSION_HANDOFF.md` (REGENERADO — este documento)

### SQL (pendiente post-deploy)

- ⏳ `sql/032_drop_bm_legacy_tables.sql` (NUEVO — **NO ejecutado todavía**, pendiente post-2026-09-26)

### Backend (de sesiones anteriores)

- ✅ `src/controllers/events-v2.controller.js`
- ✅ `src/controllers/events-v2-bm.controller.js`
- ✅ `src/routes/events-v2.routes.js`
- ✅ `src/routes/events-v2-bm.routes.js`
- ✅ `src/utils/eventScheduler.js` (HALL-065)
- ❌ `src/controllers/bm.controller.js` (ELIMINADO)
- ❌ `src/routes/bm.routes.js` (ELIMINADO)

### Frontend (de sesiones anteriores)

- ✅ `js/api.js` (11 wrappers `apiEventsV2Bm*`)
- ✅ `js/bm.js` (refactor completo)
- ✅ `js/views.js` (BL-020)
- ✅ `sw.js` (CACHE_NAME v4.1.0)

---

## 8. REGLAS DE TRABAJO

### Sistema operativo

- OS: **Windows 10 con CMD**.
- **NO usar comandos Linux/macOS** (grep, cat, ls, sed, awk).
- SÍ usar: `findstr`, `type`, `dir`, `node --check`, `git`, `curl`, `del`, `type nul >`.
- Para UTF-8: usar PowerShell.
- **Para archivos grandes (>100 líneas)**: usar **scripts Node `.cjs`** en vez de copy-paste manual.

### Comandos críticos

- Crear archivos vacíos: `type nul > ruta\archivo.js`
- Borrar archivo: `del archivo.js`
- Verificar sintaxis: `node --check ruta\archivo.js`
- Buscar string: `findstr /N "texto" archivo.js`
- Commit multilínea: `git commit -m "titulo" -m "detalle 1" -m "detalle 2"`
- **Push:** `git push origin main`

### Proceso

1. **Una tarea a la vez.** No mezclar.
2. **Verificar antes de avanzar** (`node --check`, `npm test`).
3. **Bloques <100 líneas** (evita truncamiento).
4. **Para archivos grandes**: usar **script Node `.cjs`**.
5. **Commits descriptivos:** `tipo(scope): descripción`.
6. **NO pegar bloques de git en CMD si no empiezan con `git`**.
7. **Deploy tras cada fase grande.**

### Desarrollo

- **NO romper producción** (28 pilotos activos).
- **`node --check`** obligatorio antes de cada commit.
- **`npm test`** antes de cada commit (debe pasar 93/93).
- **`git diff --stat`** para verificar cambios.

### Lecciones aprendidas (esta sesión)

- **Los emojis en los headers pueden tener variaciones de code points (U+FE0F, ZWJ).** Buscar por **texto plano sin emojis** es más robusto.
- **CMD no renderiza UTF-8 bien.** Lo que ves como `≡ƒÄ»` está bien en el archivo. Verificar siempre con PowerShell.
- **Cuando un marker aparece múltiples veces**, usar regex con anclaje (`^## `) para garantizar match correcto.
- **Scripts Node `.cjs` con logs de diagnóstico** son la mejor herramienta para verificar antes de escribir.
- **Revertir con `git checkout --`** cuando un script falla y deja el archivo inconsistente.
- **`fs.readFileSync(file, 'utf8')` + `fs.writeFileSync(file, content, 'utf8')`** preserva UTF-8 sin corromper.

---

## 9. CÓMO RETOMAR LA SESIÓN

En una nueva conversación:

1. **Adjuntar este `SESSION_HANDOFF.md`.**
2. **Escribir:** "Continuemos con F4.5 (DROP tablas BM legacy post-2026-09-26)".
3. **Opcionalmente adjuntar:**
   - `sql/032_drop_bm_legacy_tables.sql`.
   - `docs/adr/ADR-007-rediseno-eventos-v2.md`.

**La IA leerá el handoff, entenderá el contexto y arrancará con F4.5.**

---

## 10. COMANDOS DE VERIFICACIÓN RÁPIDA

```cmd
cd C:\Users\pirov\paraguay-ffaa
git log --oneline -10
git status
npm test
curl -s https://paraguay-ffaa-metalstorm.fly.dev/health
```

**Esperado:**

- **Log:** commit de F4.4 en top (o `4ab67cd` si aún no commiteado).
- **Status:** working tree limpio (después del commit de F4.4).
- **Tests:** 93/93 passed.
- **Health:** `OK`.

---

## 11. CHECKLIST DE CIERRE DE ESTA SESIÓN

- [x] ADR-007 creado (5794 bytes)
- [x] CHANGELOG [4.1.0] insertado (+4697 bytes)
- [x] BACKLOG actualizado (-439 bytes, HALL-065 + BL-020 + BL-021 movidos)
- [x] API_REFERENCE §3.5 completado (+7148 bytes)
- [x] CURRENT_STATE actualizado (+2947 bytes)
- [x] SESSION_HANDOFF regenerado
- [ ] **Commit consolidado de F4.4**
- [ ] **Deploy a producción**
- [ ] **Smoke test post-deploy**
- [ ] **Push a origin/main**

**Sistema: docs de F4.4 completados. Pendiente commit + deploy.**

---

## 12. PRÓXIMOS PASOS (visión global)

| Sub-fase | Descripción | Estimación |
|---|---|---|
| **Commit F4.4** | Agregar todos los docs + ADR-007 y commitear | ~10 min |
| **Deploy F4.4** | `fly deploy` + smoke test | ~15 min |
| **Push** | `git push origin main` | ~1 min |
| **F4.5** | DROP tablas BM legacy (post-2026-09-26) | ~10 min |

**Total: ~35 min de trabajo efectivo + 7 días de espera para F4.5.**

---

## 13. NOTAS POST-DEPLOY

### Monitoreo 24-48h

Verificar:

- `fly logs -a paraguay-ffaa-metalstorm` sin errores.
- Dashboard Supabase sin picos.
- Pilotos activos sin reportes de bugs.
- Endpoint `GET /api/events-v2/active` respondiendo OK.

### DROP de tablas (7 días)

Una vez confirmada estabilidad (después del **2026-09-26**):

1. Abrir Supabase SQL Editor.
2. Pegar contenido de `sql/032_drop_bm_legacy_tables.sql`.
3. Ejecutar.

**Riesgo:** bajo. Tablas vacías.

### Rollback de emergencia

Si algo se rompe en producción:

```cmd
fly releases -a paraguay-ffaa-metalstorm
fly deploy --image <IMAGEN_PREVIA>
```

**Imagen previa:** `deployment-01M2XE2FXSAFWXTKBWM3DBNKFR` (versión pre-F4.3).

---

**PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-09-20 · Commit 4ab67cd + cambios sin commitear**
