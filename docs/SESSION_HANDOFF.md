# 🔄 SESSION HANDOFF — PARAGUAY-FFAA | METALSTORM

> **Documento de traspaso entre sesiones de trabajo.**
> **Actualizado:** 2026-09-20
> **Última sesión completada:** F4.4 v4 (fix views timezone + W38 + BM cargados)
> **Próximo paso:** Auditoría y normalización de la DB de Supabase (SQ históricos + gaps + BM)

---

## 1. CONTEXTO DEL PROYECTO

**PARAGUAY-FFAA | METALSTORM** es una plataforma táctica del escuadrón paraguayo `PARAGUAY FFAA [PRY]` en MetalStorm.

- **Backend:** Node.js 22 + Express 5 + Supabase PostgreSQL
- **Frontend:** Vanilla JS SPA + PWA
- **Deploy:** Fly.io (región `gru` - São Paulo)
- **Repo:** `paraguayffaametalstorm-debug/ffaa-paraguay-classic`
- **Producción:** `https://paraguay-ffaa-metalstorm.fly.dev`
- **Tests:** Vitest 5.0.1 (**110 tests pasando**: 93 previos + 17 nuevos)

**Trabajo activo:** Post-rediseño de Eventos v2 (F4.x).

---

## 2. ESTADO ACTUAL

| Aspecto | Valor |
|---|---|
| Commit HEAD | `bc01972` (fix views timezone) |
| Branch | `main` |
| Working tree | ✅ Limpio |
| Push | ✅ Sincronizado con origin/main |
| Deploy producción | ✅ `deployment-01M2ZJ5CETFMN3Y3E86DDMPYVG` |
| Tests | ✅ 110/110 passed |
| Service Worker | v4.1.0 |
| Offset PY en logs | ✅ UTC-3 |

**Últimos commits:**
```
074fdc3 fix(hall-065): corregir timezone PY de UTC-4 a UTC-3 + tests
a7af951 docs(f4.4): cerrar documentacion del rediseno de Eventos v2
4ab67cd fix(ui): BL-020 widget y formulario de evento timezone-aware
7f1ce93 fix(scheduler): HALL-065 corregir timezone PY y duracion del evento SQ
b5d542b feat(f4.3): vistas adaptativas + UI evento activo
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
| **F4.3 (fix 1)** | HALL-065 v1 (scheduler) + BL-020 (widget) | ✅ CERRADA | `7f1ce93` + `4ab67cd` |
| **F4.4** | ADR-007 + docs + deploy | ✅ CERRADA | `a7af951` |
| **F4.4 v2** | HALL-065 v2 (offset UTC-3) + tests + W38 corregido | ✅ CERRADA | `074fdc3` |
| **F4.5** | DROP tablas BM legacy (post-2026-09-26) | ⏳ Pendiente | — |

---

## 4. TRABAJO COMPLETADO EN ESTA SESIÓN (F4.4 Parte 3)

### 4.1 HALL-065 v2 — Offset PY corregido (UTC-4 → UTC-3)

**Bug detectado:** el scheduler asumía `PY_OFFSET_HOURS = 4`, cuando Paraguay abolió el DST en octubre 2024 y usa **UTC-3 permanente**.

**Impacto:** los eventos SQ abrían 1 hora más tarde de lo esperado (10:00 PY en vez de 09:00 PY).

**Fix aplicado (commit `074fdc3`):**
- `src/utils/eventScheduler.js`: `PY_OFFSET_HOURS: 4 → 3`.
- Comentarios actualizados.
- Bloque `export` agregado para tests.

### 4.2 Tests Automatizados del Scheduler

**Archivo nuevo:** `tests/utils/eventScheduler.test.js` (17 tests).

**Cobertura:**
- Constantes de timezone (3 tests).
- `getISOWeek` / `getISOYear` (3 tests).
- Fechas W38 2026 (3 tests).
- Fechas W39 2026 (2 tests).
- Invariantes (6 tests): start=jueves, end=lunes, PY=09:00/08:59, no solapamiento, cambio de año.

**Resultado:** **110/110 tests pasando** (93 previos + 17 nuevos).

### 4.3 Evento W38 corregido en producción

**SQL ejecutado en Supabase:**

```sql
UPDATE events_master
SET
  start_date = '2026-09-17 12:00:00+00',
  end_date = '2026-09-21 11:59:59+00',
  ...
WHERE name = 'Squadron Event 2026-W38';
```

**Verificación:**
- `start_date = 2026-09-17 12:00:00+00`
- `end_date = 2026-09-21 11:59:59+00`
- `duracion = 3 days 23:59:59`

### 4.4 Hallazgo: tzdata de Supabase desactualizado

**Bug detectado durante el diagnóstico:**

```sql
SELECT NOW() AT TIME ZONE 'America/Asuncion';
-- Devuelve 04:42-4h = 00:42 (UTC-4), pero debería ser 01:42 (UTC-3).
```

**Impacto:** solo afecta a queries SQL manuales con `AT TIME ZONE 'America/Asuncion'`.

**Acción recomendada:** abrir ticket con Supabase.

**Workaround:** `AT TIME ZONE 'UTC' - INTERVAL '3 hours'` en queries manuales.

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

**Referencias:**
- `sql/032_drop_bm_legacy_tables.sql`
- `docs/adr/ADR-007-rediseno-eventos-v2.md`

---

## 6. VERIFICACIÓN POST-JUEVES 24-09 (importante)

**El jueves 24-09 a las 12:00 UTC**, el scheduler creará W39 con las fechas correctas.

**Verificar en Supabase:**

```sql
SELECT
  name,
  start_date,
  end_date,
  (end_date - start_date) AS duracion
FROM events_master
WHERE name = 'Squadron Event 2026-W39';
```

**Esperado:**
| Campo | Valor |
|---|---|
| `start_date` | `2026-09-24 12:00:00+00` |
| `end_date` | `2026-09-28 11:59:59+00` |
| `duracion` | `3 days 23:59:59` |

**Si NO coincide**, revisar logs:
```cmd
fly logs -a paraguay-ffaa-metalstorm | findstr /I "Scheduler"
```

---

## 7. DECISIONES CLAVE DE LA SESIÓN

### HALL-065 v2 — Offset UTC-3 hardcodeado

**Decisión:** Paraguay usa UTC-3 todo el año (post-octubre 2024, DST abolido). Se hardcodea `PY_OFFSET_HOURS = 3` en lugar de calcular dinámicamente.

**Razón:** Paraguay ya no tiene DST, así que el offset es constante. Si en el futuro vuelve el DST, se cambia el valor.

### Tests automatizados del scheduler

**Decisión:** exportar las funciones internas del scheduler (`getISOWeek`, `getISOYear`, `getSquadronEventDates`, constantes) solo para testing.

**Razón:** validar la lógica de cálculo de fechas y prevenir regresiones futuras.

### W38 corregido en BD

**Decisión:** corregir W38 (creado antes del fix) para que sea consistente con la nueva regla.

**Razón:** mantener data histórica consistente para futuras auditorías.

### tzdata de Supabase

**Decisión:** documentar el problema pero no bloquear el proyecto.

**Razón:** el sistema operativo (backend + frontend) usa UTC internamente y offsets hardcodeados correctos. Solo afecta a queries manuales.

---

## 8. ARCHIVOS RELEVANTES

### Código (modificados/creados en esta sesión)

- ✏️ `src/utils/eventScheduler.js` (offset 4→3, comentarios, exports)
- ➕ `tests/utils/eventScheduler.test.js` (NUEVO, 17 tests)
- ✏️ `CHANGELOG.md` (entrada [4.1.1])
- ✏️ `BACKLOG.md` (HALL-065 actualizado + nota Prioridad Alta)

### SQL (pendiente post-deploy)

- ⏳ `sql/032_drop_bm_legacy_tables.sql` (pendiente post-2026-09-26)

### Docs (referencia)

- `docs/adr/ADR-007-rediseno-eventos-v2.md`
- `docs/SESSION_HANDOFF.md` (este documento)

---

## 9. REGLAS DE TRABAJO

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
- **`npm test`** antes de cada commit (debe pasar **110/110**).
- **`git diff --stat`** para verificar cambios.

### Lecciones aprendidas (esta sesión)

- **Paraguay usa UTC-3 todo el año desde octubre 2024.** No confundir con la regla pre-2024 (UTC-4 en verano).
- **Supabase tiene tzdata desactualizado.** `AT TIME ZONE 'America/Asuncion'` devuelve UTC-4 en vez de UTC-3.
- **Exportar funciones internas solo para testing** es una práctica aceptable en Node.js con ESM.
- **Los eventos existentes NO se actualizan automáticamente** cuando cambia un offset. Hay que corregirlos manualmente.
- **`git ls-files | findstr`** es útil para descubrir dónde está trackeado un archivo.

---

## 10. CÓMO RETOMAR LA SESIÓN

En una nueva conversación:

1. **Adjuntar este `SESSION_HANDOFF.md`.**
2. **Escribir:** "Continuemos con F4.5 (DROP tablas BM legacy post-2026-09-26)".
3. **Opcionalmente adjuntar:**
   - `sql/032_drop_bm_legacy_tables.sql`.
   - `docs/adr/ADR-007-rediseno-eventos-v2.md`.

**La IA leerá el handoff, entenderá el contexto y arrancará con F4.5.**

---

## 11. COMANDOS DE VERIFICACIÓN RÁPIDA

```cmd
cd C:\Users\pirov\paraguay-ffaa
git log --oneline -5
git status
npm test
curl -s https://paraguay-ffaa-metalstorm.fly.dev/health
fly logs -a paraguay-ffaa-metalstorm | findstr /I "Timezone"
```

**Esperado:**

- **Log:** `074fdc3` en top.
- **Status:** working tree limpio (después del mini-commit de docs).
- **Tests:** 110/110 passed.
- **Health:** `OK`.
- **Timezone:** `UTC-3`.

---

## 12. CHECKLIST DE CIERRE DE ESTA SESIÓN

- [x] HALL-065 v2 identificado y diagnosticado
- [x] Fix aplicado: offset UTC-4 → UTC-3
- [x] W38 corregido en BD con fechas consistentes
- [x] 17 tests automatizados creados
- [x] 110/110 tests pasando
- [x] Deploy a producción (deployment-01M2YHNVV30YCWSKBFA3RSM5R4)
- [x] Log del scheduler muestra UTC-3
- [x] CHANGELOG [4.1.1] documentado
- [x] BACKLOG actualizado
- [x] SESSION_HANDOFF regenerado
- [ ] **Commit + push del mini-commit de docs**
- [ ] **Verificar W39 el jueves 24-09**
- [ ] **F4.5 (DROP tablas BM legacy) post-2026-09-26**

**Sistema: 100% operativo con HALL-065 v2 aplicado.**

---

## 13. PRÓXIMOS PASOS (visión global)

| Sub-fase | Descripción | Estimación |
|---|---|---|
| **Mini-commit docs** | CHANGELOG + BACKLOG + SESSION_HANDOFF | ~10 min |
| **Verificación W39** | Jueves 24-09 (automático) | ~10 min |
| **F4.5** | DROP tablas BM legacy (post-2026-09-26) | ~10 min |

---

**PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-09-20 · Commit 074fdc3**


---

## 📝 TRABAJO COMPLETADO HOY (2026-09-20) — RESUMEN

### Commits realizados

| Commit | Descripción |
|---|---|
| `a7af951` | F4.4 docs (ADR-007 + CHANGELOG + CURRENT_STATE + API_REFERENCE + SESSION_HANDOFF + BACKLOG) |
| `7f1ce93` | HALL-065 v1 (scheduler SQ timezone + duración) |
| `074fdc3` | HALL-065 v2 (offset UTC-4 → UTC-3) + 17 tests automatizados |
| `53f8277` | Docs F4.4 v2 (CHANGELOG [4.1.1] + BACKLOG + SESSION_HANDOFF) |
| `93eb1c3` | Fix mojibake (index.html, sw.js, js/main.js) + scripts de diagnóstico |
| `bc01972` | Fix views timezone (PY_OFFSET_MS 4→3 + descripciones ventana) |

### Cambios en BD (SQL manual)

| Item | Descripción |
|---|---|
| **W38** | start_date: 2026-09-17 09:00 UTC → 2026-09-17 12:00 UTC; end_date: 2026-09-20 08:59:59 → 2026-09-21 11:59:59 |
| **BM KF-21** | Corregido: nombre, start_date (15-04 20:00 UTC), end_date (20-04 19:59:59 UTC), metadata completa |
| **BM F-20** | Insertado: start_date (09-09 20:00 UTC), end_date (14-09 19:59:59 UTC), aircraft_id: 110 |

### Pendientes para la próxima sesión

1. **Auditar y normalizar los SQ históricos de 2026:**
   - 35 eventos con 3 horarios diferentes (13:00 UTC, 09:00 UTC, 12:00 UTC).
   - Todos deberían ser: **jueves 12:00 UTC → lunes 12:00 UTC** (4 días exactos).
   - **Decisión de duración:** `4 days` exactos (12:00 → 12:00) vs `3d 23h 59m 59s` (12:00 → 11:59:59). **Pendiente definir** con criterio de negocio (los pilotos cargan tokens de 4 días).

2. **Agregar gaps SQ:**
   - SEM 8 (jueves 19-02-2026).
   - SEM 16 (jueves 16-04-2026).
   - SEM 37 (jueves 10-09-2026).

3. **Investigar más BM históricos** (si existen).

4. **Reportar a Supabase:** bug de tzdata desactualizado (`America/Asuncion` devuelve UTC-4).

### Verificaciones pendientes

- **Jueves 24-09-2026:** verificar que el scheduler cree W39 con las fechas correctas (`start_date = 2026-09-24 12:00:00+00`, `end_date = 2026-09-28 11:59:59+00`).
- **Post-2026-09-26:** F4.5 — DROP tablas BM legacy.

