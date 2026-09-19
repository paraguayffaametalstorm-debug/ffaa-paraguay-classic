# 🔄 SESSION HANDOFF — PARAGUAY-FFAA | METALSTORM

> **Documento de traspaso entre sesiones de trabajo.**
> **Actualizado:** 2026-09-19
> **Última sesión completada:** F4.2.2-A
> **Próximo paso:** F4.2.2-B, bloque B1

---

## 1. CONTEXTO DEL PROYECTO

**PARAGUAY-FFAA | METALSTORM** es una plataforma táctica del escuadrón paraguayo `PARAGUAY FFAA [PRY]` en MetalStorm.

- **Backend:** Node.js 22 + Express 5 + Supabase PostgreSQL
- **Frontend:** Vanilla JS SPA + PWA
- **Deploy:** Fly.io (región `gru` - São Paulo)
- **Repo:** `paraguayffaametalstorm-debug/ffaa-paraguay-classic`
- **Producción:** `https://paraguay-ffaa-metalstorm.fly.dev`

**Trabajo activo:** Rediseño de Eventos (Fases F4.1 a F4.4).

---

## 2. ESTADO ACTUAL

| Aspecto | Valor |
|---|---|
| Commit HEAD | `6b61852` |
| Branch | `main` |
| Working tree | Limpio, todo pusheado |
| Deploy producción | ✅ OK |
| Última verificación | `curl -s https://paraguay-ffaa-metalstorm.fly.dev/health` → `OK` |

---

## 3. PROGRESO DEL REDISEÑO F4

| Fase | Descripción | Estado | Commit |
|---|---|---|---|
| **F4.1** | Auditoría frontend legacy | ✅ CERRADA | `cd77149` |
| **F4.2.1** | Cliente `apiEventsV2*` en `js/api.js` | ✅ CERRADA | `4f88d3f` |
| **F4.2.2-A** | Schemas BM + ADR-006 | ✅ CERRADA | `6b61852` |
| **F4.2.2-B** | Endpoints BM en `/api/events-v2/bm/*` | ⏳ **SIGUIENTE** | — |
| **F4.2.2-C** | Tests de endpoints BM | ⏳ Pendiente | — |
| **F4.2.2-D** | Migración BM histórico (marcar `legacy_bm: true`) | ⏳ Pendiente | — |
| **F4.2.2-E** | Refactor `js/api.js` (eliminar `apiGetBm*`) | ⏳ Pendiente | — |
| **F4.2.2-F** | Refactor `js/bm.js` (consumir `apiEventsV2*`) | ⏳ Pendiente | — |
| **F4.2.2-G** | DROP tablas BM legacy + eliminar `bm.controller.js` | ⏳ Pendiente | — |
| **F4.3** | Vistas adaptativas + UI evento activo | ⏳ Pendiente | — |
| **F4.4** | Deprecación formal + limpieza | ⏳ Pendiente | — |

---

## 4. PRÓXIMO PASO — F4.2.2-B

**Objetivo:** crear 8 endpoints BM en `/api/events-v2/bm/*`.

**Entregables:**
- `src/controllers/events-v2-bm.controller.js` (nuevo archivo).
- Modificación de `src/routes/events-v2.routes.js` (agregar 8 rutas).

**Los 8 endpoints:**

| # | Método | Endpoint | Propósito |
|---|---|---|---|
| 1 | `GET` | `/api/events-v2/bm/active` | Evento BM activo |
| 2 | `GET` | `/api/events-v2/bm/:id/missions` | Misiones agrupadas por día |
| 3 | `POST` | `/api/events-v2/bm/:id/missions/:day/:type/complete` | Marcar/desmarcar misión |
| 4 | `GET` | `/api/events-v2/bm/:id/progress` | Progreso individual |
| 5 | `GET` | `/api/events-v2/bm/:id/discount` | Descuento acumulado |
| 6 | `POST` | `/api/events-v2/bm/:id/purchase` | Adquirir avión |
| 7 | `GET` | `/api/events-v2/bm/:id/leaderboard` | Tabla de posiciones |
| 8 | `GET` | `/api/events-v2/bm/:id/stats` | Estadísticas globales |

**Plan de bloques:**

| Bloque | Contenido |
|---|---|
| **B1** | Header + imports + helpers privados |
| **B2** | `GET /api/events-v2/bm/active` |
| **B3** | `GET /api/events-v2/bm/:id/missions` |
| **B4** | `POST /api/events-v2/bm/:id/missions/:day/:type/complete` |
| **B5** | `GET /api/events-v2/bm/:id/progress` |
| **B6** | `GET /api/events-v2/bm/:id/discount` |
| **B7** | `POST /api/events-v2/bm/:id/purchase` |
| **B8** | `GET /api/events-v2/bm/:id/leaderboard` |
| **B9** | `GET /api/events-v2/bm/:id/stats` |
| **B10** | Modificación de `events-v2.routes.js` |

**Estado:** ⏳ Bloque B1 es el siguiente.

---

## 5. DECISIONES CLAVE DE LA SESIÓN

### ADR-006 — Black Market Unificado

**Archivo:** `docs/adr/ADR-006-black-market-unificado.md`

**Decisión:** migrar BM al modelo unificado `events_master` + `event_participations`. Eliminar 4 tablas legacy (`bm_events`, `bm_missions`, `bm_progress`, `bm_discounts`) y 18 endpoints `/api/bm/*`.

### Modelo de datos BM

**`events_master.metadata` (evento BM):**
```json
{
  "aircraft_id": "125",
  "aircraft_name": "F-15EX Eagle II",
  "base_price_shards": 500,
  "max_discount_shards": 250,
  "max_points": 250,
  "discount_per_point": 0.2,
  "duration_days": 5,
  "purchase_window_hours": 24,
  "trophy_progression": { "day_1": 200, ..., "day_5": 800 },
  "missions": [...15 misiones...],
  "announced_at": "...",
  "created_by": "...",
  "notes": null
}
event_participations.data (progreso individual):

json
{
  "day_1": { "dedication": true, "skill": true, "teamwork": false },
  "day_2": { ... },
  "day_3": { ... },
  "day_4": { ... },
  "day_5": { ... },
  "total_points": 175,
  "discount_percentage": 35,
  "completed_missions": 11,
  "bonus_points": 75,
  "screenshot_urls": [],
  "verified_by": null,
  "verified_at": null,
  "notes": null
}
Reglas de negocio BM
Duración: 5 días (miércoles a domingo).

Misiones por día: 3 (dedication, skill, teamwork).

Puntos por misión: 25.

Bonus diario: +25 al completar 3/día.

Máx puntos: 250.

Descuento por punto: 0.2%.

Máx descuento: 50%.

Progresión de trofeos: 200 → 350 → 500 → 650 → 800 (+150/día).

Implementación: calculateBmPoints(dayProgress) en src/utils/eventSchemas.js.

BM histórico
ID: d7cbf035-c861-458d-93b6-68e8ba5fb5f4

Nombre: Squadron Event 2026-04 · SEM 16 - BM

Estado: Artefacto de migración F2.1 (metadata incompleto).

Decisión: marcarlo como legacy_bm: true en F4.2.2-D. NO normalizar con datos inventados.

6. ARCHIVOS RELEVANTES
Modificados/Creados en la sesión
✅ src/utils/eventSchemas.js (extendido con schemas BM).

✅ docs/adr/ADR-006-black-market-unificado.md (nuevo).

✅ js/api.js (F4.2.1 — cliente apiEventsV2*).

✅ docs/auditoria-frontend-legacy.md (F4.1 — auditoría).

Archivos relevantes para F4.2.2-B
src/controllers/events-v2.controller.js (controlador existente de events-v2).

src/routes/events-v2.routes.js (rutas existentes).

src/utils/eventSchemas.js (schemas + helper calculateBmPoints).

src/controllers/bm.controller.js (controlador legacy — NO tocar).

src/routes/bm.routes.js (rutas legacy — NO tocar).

7. REGLAS DE TRABAJO
Sistema operativo
OS: Windows 10 con CMD.

NO usar comandos Linux/macOS (grep, cat, ls, sed, awk).

SÍ usar: findstr, type, dir, node --check, git, curl.

Para UTF-8: usar powershell -Command "Get-Content 'archivo' -Encoding UTF8".

Proceso
Una tarea a la vez. No mezclar cambios.

Verificar antes de avanzar.

Bloques <100 líneas (evita truncamiento).

Commits descriptivos: tipo(scope): descripción.

Rama por fase (o commit directo en main para cambios pequeños).

Deploy tras cada fase.

Rollback documentado.

Desarrollo
NO romper producción (28 pilotos activos).

node --check para validar sintaxis JS.

git diff --stat antes de cada commit.

curl /health tras cada deploy.

Auditar archivos completos antes de entregar bloques (evita colisiones).

Lecciones aprendidas (de esta sesión)
CMD findstr corrompe visualmente UTF-8 → usar PowerShell.

Notepad puede no guardar con UTF-8 → usar VSCode.

Los visores de chat procesan Markdown y "comen" los # visualmente.

node --check es la autoridad final sobre sintaxis.

git diff --stat + findstr confirman integridad.

Auditar el archivo completo antes de entregar bloques para insertar.

Verificar Ctrl+S después de cada edición (Notepad, VSCode, etc.).

8. CÓMO RETOMAR LA SESIÓN
En una nueva conversación:

Adjuntar este archivo (SESSION_HANDOFF.md).

Escribir: "Continuemos con F4.2.2-B, bloque B1".

La IA leerá el handoff, entenderá el contexto y arrancará.

Opcionalmente, adjuntar también:

docs/adr/ADR-006-black-market-unificado.md

src/utils/eventSchemas.js

src/controllers/events-v2.controller.js

src/routes/events-v2.routes.js

Con esos archivos, la IA tiene todo el contexto necesario.

9. COMANDOS DE VERIFICACIÓN RÁPIDA
cmd
cd C:\Users\pirov\paraguay-ffaa
git log --oneline -5
git status
node --check src\utils\eventSchemas.js
curl -s https://paraguay-ffaa-metalstorm.fly.dev/health
Resultado esperado:

6b61852 en el log.

up to date with 'origin/main'.

Silencio (éxito en node --check).

OK.

10. ESTADO FINAL DE LA SESIÓN
Commits en origin/main durante esta sesión:

Hash	Descripción
cd77149	Auditoría frontend legacy (F4.1)
4f88d3f	Cliente apiEventsV2* (F4.2.1)
6b61852	Schemas BM + ADR-006 (F4.2.2-A)
Sistema: 100% operativo en producción.

Working tree: limpio.

Próxima acción: F4.2.2-B, bloque B1.

PARAGUAY FFAA [PRY] · SESSION HANDOFF · 2026-09-19

text

**Fin del contenido.**

---