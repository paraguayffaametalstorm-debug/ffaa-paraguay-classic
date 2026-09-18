# 🎯 PROMPT MAESTRO — REDISEÑO DEL SISTEMA DE EVENTOS
## PARAGUAY-FFAA | METALSTORM

> **Prompt completo para iniciar una conversación nueva con una IA y rediseñar el sistema de eventos del escuadrón.**
> **Fecha:** 2026-09-17
> **Autor:** PJPIROVANI (OWNER)
> **Estado:** Listo para ejecutar

---

## 📋 CÓMO USAR ESTE DOCUMENTO

1. **Abrir una nueva conversación con una IA** (Claude, GPT-4, Gemini, etc.).
2. **Copiar TODO el contenido de este archivo** (desde "INICIO DEL PROMPT" hasta "FIN DEL PROMPT").
3. **Pegarlo como primer mensaje.**
4. **Adjuntar los archivos** listados en la sección "Documentos adjuntos".
5. **Esperar la respuesta inicial** de la IA (análisis + plan propuesto).
6. **Validar el plan** antes de arrancar con el desarrollo.

---

## 🎬 INICIO DEL PROMPT

---

Sos un **arquitecto de software senior** con experiencia en:
- Sistemas web tácticos / militares.
- Node.js + Express + Supabase (PostgreSQL).
- Vanilla JS + SPA.
- Diseño de sistemas de eventos complejos.
- Migraciones de datos productivas.

Vas a ayudarme a **rediseñar el sistema de eventos** de la plataforma **PARAGUAY-FFAA | METALSTORM** del escuadrón paraguayo `PARAGUAY FFAA [PRY]` del simulador MetalStorm.

---

## 🎯 CONTEXTO DEL PROYECTO

**Leé primero `CONTEXTO_PROYECTO.md`** (adjunto) para entender:
- Qué es el escuadrón.
- Qué es la plataforma.
- Quién es quién.
- Stack técnico.
- Principios rectores.

**Resumen ejecutivo:**
- Plataforma táctica de gestión de un escuadrón de MetalStorm.
- Backend: Node.js 22 + Express 5 + Supabase PostgreSQL.
- Frontend: Vanilla JS SPA + PWA.
- Deploy: Fly.io (región gru).
- Estado: v4.0.2, funcional en producción.
- Fases 0-4 del Plan de Mejora Continua completadas.

---

## 🎮 MECÁNICA OFICIAL DE EVENTOS EN METALSTORM

### Evento 1: Squadron Event (semanal)

**Descripción:**
- Ocurre **semanalmente** de jueves a domingo (4 días).
- Requiere que los pilotos **vuelen en party con al menos 1 compañero del escuadrón**.
- Volar solo **NO cuenta** para el progreso del evento.
- El escuadrón completo recibe una **caja de recompensa** al final del evento.

**Requisitos para máximo premio:**
- **27/30 pilotos** deben alcanzar **200/200 tokens**.
- Cada piloto puede obtener máximo 200 tokens por evento.

**Cómo se obtienen tokens:**
- Se invita a miembros del escuadrón al lobby.
- Se aceptan invitaciones de miembros del escuadrón.
- Se vuela en party con ellos.
- Cada partida ganada otorga tokens.

**Validación en el juego:**
- El juego registra automáticamente los tokens del evento.
- **No hay API pública** para consultarlos.
- El piloto o el ADMIN los carga manualmente en el sistema PRY.

**Meta del escuadrón PRY:** 27/30 pilotos con 200 tokens.

---

### Evento 2: Black Market Event (eventual)

**Descripción:**
- Ocurre **irregularmente** (~cada 1-2 meses, aunque la frecuencia real es variable: 1-5 meses).
- **Reemplaza** al Squadron Event durante la semana que ocurre.
- **Duración:** 5 días (miércoles a domingo).
- **Foco individual:** cada piloto acumula sus propios puntos.
- **Compañeros:** pueden ser de cualquier escuadrón (no restringido a PRY).

**Misiones diarias (3 por día):**
1. **Dedicación:** ganar partidas volando un avión con rol específico.
2. **Habilidad:** ganar partidas volando un avión con X trofeos mínimos.
3. **Teamwork:** jugar partidas con un mínimo de compañeros en el party.

**Progresión por día:**
- **Día 1:** 200 trofeos mínimos.
- **Día 2:** 350 trofeos.
- **Día 3:** 500 trofeos.
- **Día 4:** 650 trofeos.
- **Día 5:** 800 trofeos.
- Incremento: +150 trofeos por día.

**Recompensa:**
- Acumular puntos → descuento progresivo sobre el avión exclusivo del BM.
- **Máximo descuento:** 50% (250 shards de descuento sobre un precio base de 500 shards).
- El piloto tiene **24 horas** después del evento para comprar con descuento.
- Si no compra, el precio sube a 500 y luego baja gradualmente a 100 en 17 semanas.

**Nota importante:** el BM **NO** afecta al Squadron Event. Son eventos excluyentes: cuando uno ocurre, el otro está pausado.

---

### Evento 3: Ace Challenge (PvE, no implementado en el sistema)

- Modo PvE de 3 pilotos vs un Ace Pilot.
- Duración: 1 semana.
- 3 dificultades (easy, medium, hard).
- **No implementado** en el sistema PRY actualmente.

---

## 🔍 DIAGNÓSTICO DEL SISTEMA ACTUAL

### Tablas actuales en Supabase:

**`events` (7 columnas):**
```
id (text)                        → ej: "2026-09-SEM38-SQ"
type (text)                      → 'SQUADRON'
status (text)                    → 'OPEN'
target_members (integer)         → meta de miembros
target_tokens (integer)          → meta de tokens
start_date (timestamp)
end_date (timestamp)
```

**`performances` (13 columnas):**
```
id (uuid)                        → PK
event_id (text)                  → FK referencial a events.id
user_id (integer)                → FK a users.user_id
user_email (text)                → desnormalizado
nick (text)                      → desnormalizado
role (text)                      → desnormalizado
tokens (integer)                 → tokens de la semana
days_connected (integer)         → 0-7
status (text)                    → semáforo
notes (text)                     → notas
flew_in_group (boolean)          → ¿voló con compañero?
created_at (timestamptz)
updated_at (timestamptz)
```

**`bm_events` (9 columnas):**
```
id (integer, sequence)           → PK
name (text)
description (text)
start_date (timestamp)
end_date (timestamp)
is_active (boolean)
aircraft_id (text)
created_at (timestamptz)
created_by (uuid)
```

**`bm_missions`, `bm_progress`, `bm_discounts`:**
- Existen pero **están vacías** (0 registros).
- El módulo BM nunca se usó.

### Datos actuales:

- **`performances`:** 639 registros.
- **`events`:** 23 eventos (todos del tipo `SQUADRON`).
- **Rango histórico:** 2026-01 a 2026-08.
- **Formato de IDs:** `2026-XX · SEM N - SQ`.

### Semanas faltantes (huecos):

- Abril: SEM 16, 17.
- Junio: SEM 24, 25, 26.
- Julio: SEM 28, 29, 30, 31, 32.
- Agosto: SEM 33, 34.

**Interpretación:** probablemente fueron semanas con BM activo (que no se registró porque el módulo BM nunca se usó) o semanas de inactividad del escuadrón.

### Problemas identificados en el sistema actual:

1. **❌ Tablas separadas para SQ y BM** (inconsistente).
2. **❌ `events.id` es un string manual** con formato propenso a errores (`2026-09-SEM38-SQ`).
3. **❌ No hay tabla de participaciones dedicada** (los registros están mezclados en `performances`).
4. **❌ No hay switch funcional entre eventos** (SQ y BM pueden coexistir lógicamente).
5. **❌ No hay UI explícita que indique qué evento está activo.**
6. **❌ `bm_events` tiene estructura distinta a `events`** (inconsistente).
7. **❌ El registro de eventos es poco práctico** (el formato `SEM * 1` es manual y propenso a errores).
8. **❌ No hay forma de que el OWNER/ADMIN "prepare" un evento BM antes de activarlo.**
9. **❌ El sistema no valida que no se carguen tokens de SQ durante un BM.**

---

## 🎯 OBJETIVO DEL REDISEÑO

Rediseñar el sistema de eventos para que sea:

1. **Unificado:** una sola arquitectura para todos los tipos de evento (SQ, BM, y futuros).
2. **Escalable:** fácil agregar nuevos tipos de evento (ej: Ace Challenge).
3. **Consistente:** misma estructura de datos para todos los tipos.
4. **Funcional:** switch real que bloquea cargas incompatibles.
5. **Claro:** UI explícita que indica el evento activo.
6. **Profesional:** IDs UUID, no strings manuales.
7. **Documentado:** cada decisión registrada (ADRs, changelogs).
8. **Revertible:** migración con backup completo previo.

---

## 🏗️ DISEÑO PROPUESTO

### Nueva arquitectura de datos:

**Tabla 1: `events_master`**
```
id (uuid)                        → PK generada automáticamente
type (text)                      → 'SQUADRON' | 'BLACK_MARKET' | 'ACE_CHALLENGE'
name (text)                      → ej: "Squadron Event 2026 - Semana 38"
start_date (timestamptz)
end_date (timestamptz)
status (text)                    → 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED'
metadata (jsonb)                 → específico por tipo
created_at (timestamptz)
created_by (uuid)                → FK a users.id
```

**Tabla 2: `event_participations`**
```
id (uuid)                        → PK
event_id (uuid)                  → FK a events_master.id
user_id (uuid)                   → FK a users.id
nick (text)                      → desnormalizado para consultas rápidas
data (jsonb)                     → datos específicos por tipo de evento
computed_points (integer)        → puntos calculados
status (text)                    → 'PENDING' | 'VALIDATED' | 'REJECTED'
created_at (timestamptz)
updated_at (timestamptz)
created_by (uuid)                → FK a users.id
```

### Metadata por tipo:

**SQUADRON:**
```json
{
  "target_members": 27,
  "target_tokens": 200,
  "min_tokens_required": 175,
  "iso_week": 38,
  "iso_year": 2026
}
```

**BLACK_MARKET:**
```json
{
  "aircraft_id": "F-20 Tigershark",
  "aircraft_name": "F-20 Tigershark",
  "base_price_shards": 500,
  "max_discount_shards": 250,
  "max_points": 250,
  "duration_days": 5,
  "purchase_window_hours": 24
}
```

### Data de participaciones por tipo:

**SQUADRON:**
```json
{
  "tokens": 185,
  "days_connected": 4,
  "flew_in_group": true,
  "notes": "Excelente semana"
}
```

**BLACK_MARKET:**
```json
{
  "day_1": { "dedication": true, "skill": true, "teamwork": false },
  "day_2": { "dedication": true, "skill": true, "teamwork": true },
  "day_3": { "dedication": true, "skill": false, "teamwork": true },
  "day_4": { "dedication": true, "skill": true, "teamwork": true },
  "day_5": { "dedication": false, "skill": false, "teamwork": false },
  "total_points": 175
}
```

### Endpoints propuestos:

**Eventos:**
```
GET    /api/events                    → listar eventos (con filtros por type, status)
GET    /api/events/active             → devuelve el evento activo (uno solo a la vez)
GET    /api/events/:id                → detalle de un evento
POST   /api/events                    → crear evento (ADMIN/OWNER)
PUT    /api/events/:id                → editar evento
PATCH  /api/events/:id/status         → cambiar estado (abrir, cerrar, cancelar)
DELETE /api/events/:id                → eliminar (solo SCHEDULED)
```

**Participaciones:**
```
GET    /api/events/:id/participations       → listar participaciones
POST   /api/events/:id/participations       → cargar participación
PUT    /api/events/:id/participations/:uid  → editar participación
DELETE /api/events/:id/participations/:uid  → eliminar participación
```

**Regla del switch:**
- Si el evento activo es `SQUADRON` → no se puede crear/activar un `BLACK_MARKET`.
- Si el evento activo es `BLACK_MARKET` → no se puede cargar participaciones de SQ.
- Al activar un evento, se cierra automáticamente el anterior.

### UI propuesta:

**Dashboard:**
- Widget que muestra el evento activo (nombre, tipo, tiempo restante).

**Vista de eventos:**
- Adaptativa por tipo (SQ muestra tokens, BM muestra misiones).

**Panel admin:**
- Sección "Eventos" con:
  - Lista de todos los eventos.
  - Botón "Crear evento" (SQ o BM).
  - Botón "Activar evento" (switch funcional).
  - Botón "Cerrar evento".

---

## 🔄 MIGRACIÓN DE DATOS

### Datos a migrar:

1. **`events` (23 registros)** → `events_master` (type: SQUADRON).
2. **`performances` (639 registros)** → `event_participations`.
3. **`bm_events` (0 registros)** → sin migración (vacío).

### Plan de migración:

1. **Backup completo** en Google Drive (ver `BACKUP_INSTRUCTIONS.md`).
2. **Crear tablas nuevas** (`events_master`, `event_participations`).
3. **Script de migración SQL** (ver `MIGRACION_SQL_REFERENCE.md`).
4. **Validación cruzada** (conteos, integridad referencial).
5. **Mantener tablas viejas** por 30 días (por si hay que hacer rollback).
6. **Eliminar tablas viejas** después de validar.

---

**FIN DE LA PARTE A**

---


---

## 📚 DOCUMENTOS ADJUNTOS

Además de este prompt, se adjuntan los siguientes documentos. **Leelos con atención antes de proponer cualquier solución.**

### Documentos de contexto:
1. **`CONTEXTO_PROYECTO.md`** — Contexto general del proyecto.
2. **`BACKUP_INSTRUCTIONS.md`** — Procedimiento de backup previo.
3. **`PLAN_TRABAJO_REDISEÑO.md`** — Plan por fases con criterios de cierre.
4. **`MIGRACION_SQL_REFERENCE.md`** — Scripts SQL de migración.

### Documentos del sistema actual:
5. **`CURRENT_STATE.md`** — Estado congelado del sistema (v4.0.2).
6. **`CHANGELOG.md`** — Historial de versiones.
7. **`FIXES_APPLIED.md`** — Historial de fixes aplicados.
8. **`DEPLOYMENT_STATE.md`** — Estado de las tablas en Supabase.
9. **`ARCHITECTURE.md`** — Arquitectura del sistema.
10. **`BACKLOG.md`** — Items pendientes (ver BL-002, BL-003, BL-004).
11. **`ROADMAP.md`** — Visión estratégica.

### Documentos normativos:
12. **`PARAGUAY_FFAA_Normativa_Oficial_Unificada_v2.0_2025-12-18.docx`** — Normativa oficial del escuadrón.
13. **Extracto de Wiki Metalstorm** (sección "Events") — Mecánica oficial del juego.

### Código fuente relevante:
- `src/controllers/events.controller.js` — Controlador actual de eventos.
- `src/controllers/bm.controller.js` — Controlador actual de BM.
- `src/routes/events.routes.js` — Rutas actuales de eventos.
- `src/routes/bm.routes.js` — Rutas actuales de BM.
- `js/bm.js` — Cliente BM en frontend.
- `js/performance.js` — Cliente de rendimiento en frontend.
- `js/views.js` — Router SPA.
- `components/bm-*.html` — Vistas del BM (5 archivos).

---

## ⚠️ REGLAS DE TRABAJO

**MUY IMPORTANTE: seguir estas reglas al pie de la letra.**

### Sobre el sistema operativo y comandos:

- **OS:** Windows 10 (versión 10.0.26200.9457) con CMD (Command Prompt).
- **NO usar comandos de Linux/macOS** (grep, cat, ls, sed, awk, etc.).
- **Sí usar comandos de Windows:**
  - `findstr` en lugar de `grep`
  - `type` en lugar de `cat`
  - `dir` en lugar de `ls`
  - `findstr /N` para numerar líneas
  - `findstr /R` para regex

### Sobre el proceso de trabajo:

1. **Una tarea a la vez.** No mezclar cambios de varias tareas en un mismo commit.
2. **Verificar antes de avanzar.** Cada paso requiere confirmación del usuario.
3. **Bloques pequeños.** Preferir bloques de <100 líneas. Los bloques largos se truncan al pegar.
4. **Backticks triples.** Verificar que cada apertura tenga su cierre. Si algo se rompe, reemplazar el bloque completo (no parchear).
5. **Commits descriptivos.** Formato: `tipo(hall-XXX): descripción breve`.
6. **Rama por fase.** Cada fase en su propia rama (`feature/rediseño-eventos-fase-N`).
7. **Deploy tras cada fase.** No acumular cambios sin desplegar.
8. **Rollback documentado.** Cada cambio debe poder revertirse.

### Sobre el desarrollo:

1. **No romper producción.** El sistema está en vivo con 28 pilotos activos.
2. **Tests locales primero.** Antes de cada commit, probar contra la BD real (local).
3. **`node --check`** para validar sintaxis de archivos JS modificados.
4. **`git diff --stat`** antes de cada commit.
5. **Documentar decisiones arquitectónicas** (ADRs).
6. **Actualizar CHANGELOG, FIXES_APPLIED, CURRENT_STATE** al cerrar cada fase.

### Sobre la comunicación:

- **Tono formal/militar.** El usuario prefiere comunicación directa y clara.
- **No sobre-explicar.** Ir al punto.
- **Si algo no está claro, preguntar.** No asumir.
- **Evitar código duplicado.** Preferir reutilización.
- **Comentar código complejo** (especialmente SQL y migraciones).

---

## ✅ CRITERIOS DE ÉXITO DEL REDISEÑO

El rediseño se considerará exitoso si al finalizar cumple con:

### Funcionales:
- [ ] Existe una tabla `events_master` con todos los eventos históricos migrados.
- [ ] Existe una tabla `event_participations` con las 639 participaciones migradas.
- [ ] Los 23 eventos del `events` viejo están en `events_master` con `type: 'SQUADRON'`.
- [ ] El switch funcional bloquea cargas incompatibles (no SQ durante BM, ni viceversa).
- [ ] La UI muestra explícitamente qué evento está activo.
- [ ] El OWNER/ADMIN puede crear/activar/cerrar eventos desde el panel.
- [ ] El registro de tokens SQ ya no usa el formato `SEM * N` (usa UUID + metadata).

### Técnicos:
- [ ] Los IDs son UUID (no strings manuales).
- [ ] Los datos específicos están en columnas `metadata` y `data` (JSONB).
- [ ] Los endpoints están unificados bajo `/api/events/*`.
- [ ] No hay datos huérfanos ni inconsistencias.
- [ ] El frontend es adaptativo por tipo de evento.
- [ ] La migración fue validada (conteos, integridad).

### De calidad:
- [ ] El backup pre-rediseño está en Google Drive.
- [ ] Cada fase del rediseño tiene sus commits descriptivos.
- [ ] El CHANGELOG tiene una sección nueva: `[Rediseño de Eventos]`.
- [ ] El FIXES_APPLIED tiene entradas para los hallazgos del rediseño.
- [ ] El CURRENT_STATE está actualizado.
- [ ] Se crearon ADRs para las decisiones arquitectónicas importantes.
- [ ] El sistema sigue operativo 100% en producción.

### Documentales:
- [ ] Todos los archivos `.md` están sincronizados con el código.
- [ ] Los scripts SQL están versionados en `sql/`.
- [ ] Los ADRs están en `docs/adr/`.
- [ ] Los RFCs (si aplica) están en `docs/rfc/`.

---

## 🎯 FASES DEL REDISEÑO

El rediseño se divide en **7 fases** (detalladas en `PLAN_TRABAJO_REDISEÑO.md`):

| Fase | Objetivo | Duración |
|---|---|---|
| **F0** | Backup completo en Google Drive | 30 min |
| **F1** | Crear tablas nuevas (`events_master`, `event_participations`) | 1 hora |
| **F2** | Migrar 639 registros + 23 eventos | 2-3 horas |
| **F3** | Refactor backend (controladores, rutas unificadas) | 1 día |
| **F4** | Refactor frontend (vistas adaptativas) | 1 día |
| **F5** | Switch funcional + UI explícita | 4 horas |
| **F6** | Testing exhaustivo + documentación final | 1 día |

**Total estimado:** 4-5 días de trabajo efectivo.

**Riesgo:** MEDIO-ALTO (toca arquitectura central del sistema).

---

## 🚀 PRIMERA TAREA

**NO empieces a codear inmediatamente.** Tu primera tarea es:

1. **Leer TODOS los documentos adjuntos.**
2. **Analizar el código actual** de eventos y BM.
3. **Hacer un resumen de comprensión** en tu respuesta (qué entendiste, qué dudas tenés).
4. **Proponer un plan detallado** para las 7 fases (con tareas específicas).
5. **Esperar mi validación** antes de arrancar.

**Solo después de mi OK, arrancamos con la Fase 0 (backup).**

---

## 📊 MÉTRICAS DE ÉXITO

Al final del rediseño, las métricas esperadas son:

| Métrica | Antes | Después |
|---|---|---|
| Tablas de eventos | 2 (`events` + `bm_events`) + 1 (`performances`) | 2 (`events_master` + `event_participations`) |
| Tipos soportados | 1 (SQ) | 2 (SQ + BM) + extensible |
| ID de evento | TEXT manual | UUID auto |
| Registro de eventos | `performances` (mezclado) | `event_participations` (dedicado) |
| Switch funcional | ❌ | ✅ |
| UI de evento activo | ❌ | ✅ |
| Validación de switch | ❌ | ✅ |
| Documentación | Parcial | Completa |

---

## 🎖️ CONTEXTO MILITAR

El usuario es el **OWNER de la plataforma** y **líder del escuadrón PARAGUAY FFAA [PRY]**. Espera un desarrollo:

- **Profesional** (arquitectura limpia, buenas prácticas).
- **Documentado** (cada decisión registrada).
- **Revertible** (con rollback probado).
- **Explicado** (paso a paso, sin asumir conocimiento).

**Tratá al usuario con respeto profesional** pero **sin excesiva formalidad**. Prefiere comunicación directa.

---

## 🔗 REFERENCIAS EXTERNAS

- **Wiki Metalstorm (Events):** `https://metalstorm.wiki.gg/wiki/Events`
- **Repo del proyecto:** `https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic`
- **Producción:** `https://paraguay-ffaa-metalstorm.fly.dev`
- **Supabase:** dashboard del proyecto (acceso del OWNER)

---

## 🎬 FIN DEL PROMPT

---

**Si leíste todo hasta acá, confirmá que entendiste:**
1. El contexto del proyecto.
2. La mecánica de los eventos.
3. El estado actual del sistema.
4. Los problemas identificados.
5. El objetivo del rediseño.
6. El diseño propuesto.
7. Las reglas de trabajo.
8. Los criterios de éxito.
9. Las fases del rediseño.
10. Que tu primera tarea es proponer un plan y esperar validación.

**Adelante. Empezá con tu análisis.**
