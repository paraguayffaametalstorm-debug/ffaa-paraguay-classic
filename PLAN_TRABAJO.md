# 🔧 PLAN DE TRABAJO — SPRINTS ACTIVOS
## PARAGUAY-FFAA | METALSTORM

> **Documento operativo de correcciones, sincronización documental y deuda técnica.**
> **Última actualización:** 2026-09-20
> **Versión de referencia:** v4.3.0
> **Responsable:** Comando C4ISR
> **Próxima revisión:** al cerrar cada Sprint

---

## 0. CÓMO USAR ESTE DOCUMENTO

Este documento **NO reemplaza** a:

- `CHANGELOG.md` → histórico de versiones publicadas.
- `BACKLOG.md` → ideas y features futuras.
- `ROADMAP.md` → visión estratégica a 12 meses.
- `PLAN_MEJORA_CONTINUA.md` → plan de fases históricas (0 a 6, cerrado).

Este documento **SÍ es la fuente única de verdad** para:

- **Fixes activos** (bugs confirmados, correcciones en curso).
- **Sincronización documental** (docs desalineados con el código real).
- **Deuda técnica priorizada** (refactors, limpiezas, mejoras).
- **Vulnerabilidades pendientes** (cuando se confirmen).

### Reglas de oro

1. **Nada entra sin verificación.** Todo ítem debe citar `archivo:línea` o `documento:sección` y un fragmento real.
2. **Un ítem = un PR.** No se agrupan fixes no relacionados.
3. **Cada ítem tiene criterio de aceptación medible.** "Mejorar doc" no es criterio. "El README dice v4.3.0 y el árbol de carpetas coincide con `ls sql/`" sí.
4. **Severidad ≠ prioridad.** Un doc desactualizado que confunde al OWNER puede ir antes que un bug teórico.
5. **Se actualiza al cerrar cada Sprint**, no al cerrar cada ítem (excepto CRÍTICOS, que se marcan al toque).
6. **Los ítems cerrados se mueven a la sección "✅ Completados"** con fecha y commit.

---

## 1. ESTADO ACTUAL DE REFERENCIA

| Campo | Valor |
|---|---|
| **Versión real** | v4.3.0 (según `CHANGELOG.md`) |
| **Commit HEAD** | `0d04571` (Sprint 0 Grupo A) |
| **Deploy producción** | ✅ Activo en Fly.io (`gru`) |
| **Timezone scheduler** | UTC-3 hardcodeado (`PY_OFFSET_HOURS = 3`) |
| **Tests** | 167/167 passing (Vitest 5.0.1) |
| **ADR cerrados** | ADR-006, ADR-007, ADR-008 |
| **Pendientes heredados** | F4.5 (DROP tablas BM legacy), verificar W39, ticket Supabase tzdata |

> ⚠️ **Si algún valor de esta tabla no coincide con la realidad, actualizalo ANTES de seguir.**
> Un roadmap sobre datos falsos es peor que no tener roadmap.

---

## 2. SPRINTS Y FASES

```
SPRINT 0  Sincronización documental urgente    ← ESTAMOS ACÁ
SPRINT 1  Verificación de código crítico
SPRINT 2  Fixes de correctitud y seguridad
SPRINT 3  Tests y observabilidad
SPRINT 4  Deuda técnica y limpieza
SPRINT 5  Features del backlog
```

Cada sprint tiene: **objetivo**, **criterio de salida**, **ítems**, **dueño**, **fecha objetivo**.

---

## SPRINT 0 — Sincronización documental urgente

**Objetivo:** alinear toda la documentación con la versión real (v4.3.0) y eliminar contradicciones internas.
**Criterio de salida:** ningún documento menciona versiones v4.0.x como "actual", ninguna contradicción interna sobrevive.
**Duración estimada:** 3-4 horas.
**Riesgo:** bajo (solo edición de markdown, no toca código).
**Dueño:** OWNER + asistencia IA.

### Por qué es urgente

Tenemos **4 versiones distintas** declaradas como "la actual" en distintos documentos (v4.0.0, v4.0.2, v4.0.5, v4.3.0). Esto genera:

- Confusión al retomar el proyecto.
- Riesgo de escribir código contra documentación vieja.
- Imposibilidad de auditar el estado real.

### Ítems del Sprint 0

| ID | Severidad | Documento | Problema | Esfuerzo |
|---|---|---|---|---|
| **FIX-001** | ALTA | `README.md` | Badge dice v4.0.5, debería decir v4.3.0 | XS |
| **FIX-002** | ALTA | `README.md` | Árbol de carpetas lista solo 2 SQL, hay 34 | S |
| **FIX-003** | ALTA | `README.md` | Lista `bm.controller.js` que fue eliminado | XS |
| **FIX-004** | ALTA | `README.md` | Cuota ADMIN dice 3, es 5 | XS |
| **FIX-005** | ALTA | `CURRENT_STATE.md` | Resumen ejecutivo dice v4.0.2, header dice v4.3.0 | XS |
| **FIX-006** | ALTA | `CURRENT_STATE.md` + `ARCHITECTURE.md` + `ADR-007` | Timezone: dicen "dinámico con Intl" pero es hardcodeado UTC-3 | S |
| **FIX-007** | ALTA | `API_REFERENCE.md` | Falta endpoints `submission-window` (ADR-008) | S |
| **FIX-008** | ALTA | `API_REFERENCE.md` | Sección completa BM legacy (`/api/bm/*`) que ya no existe | M |
| **FIX-009** | ALTA | `API_REFERENCE.md` | Cuota ADMIN dice 3, es 5 | XS |
| **FIX-010** | ALTA | `ARCHITECTURE.md` | Lista `bm.controller.js` y 15 endpoints `/api/bm/*` | S |
| **FIX-011** | ALTA | `ARCHITECTURE.md` | Cuota ADMIN dice 3, es 5 | XS |
| **FIX-012** | ALTA | `docs/adr/README.md` | ADR-008 marcado `Proposed`, es `Accepted` | XS |
| **FIX-013** | ALTA | `docs/adr/README.md` | Faltan ADR-001 a ADR-005 (referenciados pero ausentes) | M |
| **FIX-014** | MEDIA | `DEPLOYMENT_STATE.md` | Versión v4.0.5 → v4.3.0. Tablas `bm_*` sin marcar DROP pendiente | S |
| **FIX-015** | MEDIA | `DEPLOYMENT_GUIDE.md` | Versión v4.0.5 → v4.3.0 | XS |
| **FIX-016** | MEDIA | `USER_MANUAL.md` | Versión v4.0.0 → v4.3.0. Falta sección ADR-008 | S |
| **FIX-017** | MEDIA | `PWA_SETUP.md` | `CACHE_NAME` dice v4.0.5, debería ser v4.1.0+ | XS |
| **FIX-018** | MEDIA | `CONTEXTO_PROYECTO.md` | Cuota ADMIN dice 3, es 5. Versión v4.0.2 → v4.3.0 | S |
| **FIX-019** | MEDIA | `BACKLOG.md` | Contador dice "7 completados", hay 8 | XS |
| **FIX-020** | MEDIA | `BACKLOG.md` | Referencia `BL-059` no definido en tabla | XS |
| **FIX-021** | MEDIA | Todos | Decidir timezone oficial y propagarlo | S |
| **FIX-022** | MEDIA | Todos | Decidir duración SQ oficial (¿4 días exactos?) y propagarlo | S |
| **FIX-023** | BAJA | `README.md` | Ancla `#resumen-ejecutivo` rota en CURRENT_STATE | XS |
| **FIX-024** | BAJA | `README.md` | Lista `metadata.json` que probablemente sobra | XS |
| **FIX-025** | BAJA | `DEPLOYMENT_STATE.md` | Confirmar si `sql/032_drop_bm_legacy_tables.sql` se ejecutó | XS |
| **FIX-026** | ALTA | `sw.js` | `CACHE_NAME` decía v4.2.5, debía ser v4.3.0 (hallazgo nuevo) | XS |

### Criterio de cierre del Sprint 0

- [ ] Ningún documento declara una versión distinta a v4.3.0 como "actual".
- [ ] Ningún documento menciona `bm.controller.js` como existente.
- [ ] Ningún documento dice "máximo 3 ADMIN".
- [ ] Timezone unificado en los 5 documentos que lo mencionan.
- [ ] Duración SQ unificada en los documentos que la mencionan.
- [ ] `API_REFERENCE.md` refleja los endpoints reales (con `submission-window`).
- [ ] `docs/adr/README.md` marca ADR-008 como Accepted.
- [ ] No quedan contradicciones internas.

---

## SPRINT 1 — Verificación de código crítico

**Objetivo:** confirmar o descartar los hallazgos de la auditoría externa (Gemini) sobre código real, antes de invertir tiempo en fixes.
**Criterio de salida:** cada hallazgo reportado tiene estado `CONFIRMADO`, `DESCARTADO` o `NO VERIFICABLE`, con evidencia pegada.
**Duración estimada:** 4-6 horas (depende de cuántos archivos haya que revisar).
**Riesgo:** bajo (solo lectura, no se modifica nada).
**Dueño:** OWNER + asistencia IA con archivos reales.

### Contexto

Una auditoría externa reportó **22 hallazgos** sin acceso verificado al repo. Varios tienen señales de alucinación (rangos de línea imposibles, contradicciones internas). **No se toca código hasta confirmar qué es real.**

### Ítems del Sprint 1

| ID | Archivo a verificar | Hallazgo reportado | Estado |
|---|---|---|---|
| **FIX-101** | `src/controllers/auth.controller.js` | Reset password no atómico + falta invalidar sesiones | ⏳ Pendiente |
| **FIX-102** | `src/controllers/planes.controller.js` | IDOR en delete/update de aviones | ⏳ Pendiente |
| **FIX-103** | `server.js` | CSP con `unsafe-inline` / `unsafe-eval` | ⏳ Pendiente |
| **FIX-104** | `src/middlewares/errorHandler.js` | Fuga de detalles de DB en respuestas 500 | ⏳ Pendiente |
| **FIX-105** | `src/controllers/events-v2.controller.js` | Race condition al abrir evento | ⏳ Pendiente |
| **FIX-106** | `js/performance.js`, `js/views.js` | XSS por `innerHTML` sin escape | ⏳ Pendiente |
| **FIX-107** | `sql/028_events_master.sql` | RLS permisivo / falta bloqueo a `anon` | ⏳ Pendiente |
| **FIX-108** | `src/controllers/performances.controller.js` | N+1 en stats del escuadrón | ⏳ Pendiente |

### Cómo verificar

Para cada ítem:

1. Abrir el archivo en VS Code.
2. Localizar el fragmento citado.
3. Pegar el fragmento real en la columna "Evidencia" del ítem.
4. Marcar estado:
   - **CONFIRMADO** → el hallazgo es real.
   - **DESCARTADO** → el hallazgo es falso, con razón.
   - **NO VERIFICABLE** → el archivo no existe o el fragmento no se puede localizar.

### Criterio de cierre del Sprint 1

- [ ] Los 8 ítems tienen estado asignado.
- [ ] Los confirmados pasan a Sprint 2 con severidad real.
- [ ] Los descartados se documentan (para no volver a reportarlos).

---

## SPRINT 2 — Fixes de correctitud y seguridad

**Objetivo:** resolver los hallazgos confirmados en Sprint 1, priorizando seguridad.
**Criterio de salida:** cada fix tiene test de regresión + deploy + smoke test.
**Duración estimada:** depende de cuántos hallazgos se confirmen.
**Riesgo:** medio (toca código productivo).
**Dueño:** OWNER + asistencia IA.

### Estructura de cada ítem

```markdown
### [FIX-2XX] Título corto y descriptivo
- **Severidad:** CRÍTICA / ALTA / MEDIA / BAJA
- **Categoría:** Seguridad / Correctitud / Performance / Arquitectura
- **Ubicación:** archivo:línea (verificado el YYYY-MM-DD)
- **Descripción:** qué está mal y por qué importa (2-4 líneas)
- **Evidencia:** fragmento real (máx. 10 líneas)
- **Impacto:** qué pasa si no se corrige
- **Propuesta:** cómo corregirlo (concreto)
- **Criterio de aceptación:** cómo sabemos que quedó bien
- **Esfuerzo:** XS / S / M / L / XL
- **Riesgo de la corrección:** bajo / medio / alto
- **PR:** #NNN (cuando exista)
```

### Ítems placeholder (se llenan tras Sprint 1)

- [ ] **FIX-201** — _(pendiente confirmación FIX-101)_
- [ ] **FIX-202** — _(pendiente confirmación FIX-102)_
- [ ] **FIX-203** — _(pendiente confirmación FIX-103)_
- [ ] **FIX-204** — _(pendiente confirmación FIX-104)_
- [ ] **FIX-205** — _(pendiente confirmación FIX-105)_
- [ ] **FIX-206** — _(pendiente confirmación FIX-106)_
- [ ] **FIX-207** — _(pendiente confirmación FIX-107)_
- [ ] **FIX-208** — _(pendiente confirmación FIX-108)_
- [ ] **FIX-209** — **Presence en memoria no escala** (ADR-005). El router usa un `Set` local que no se comparte entre las 2 réplicas de Fly.io y se pierde en redeploys. Requiere migrar a tabla `presence` en Supabase.

### Criterio de cierre del Sprint 2

- [ ] Todos los fixes CRÍTICOS mergeados y desplegados.
- [ ] Todos los fixes ALTOS mergeados o con PR abierto.
- [ ] Tests de regresión pasando (167 + nuevos).
- [ ] `CHANGELOG.md` actualizado con nueva versión (v4.4.0).

---

## SPRINT 3 — Tests y observabilidad

**Objetivo:** cerrar brechas de cobertura en áreas críticas y mejorar visibilidad operativa.
**Criterio de salida:** cobertura > 60% en módulos críticos (auth, admin, owner, RBAC).
**Duración estimada:** 3-5 días.
**Riesgo:** bajo (solo agrega código nuevo).
**Dueño:** OWNER + asistencia IA.

### Ítems del Sprint 3

| ID | Categoría | Descripción | Esfuerzo |
|---|---|---|---|
| **FIX-301** | Testing | Suite de tests para `auth.controller.js` (login, reset, change-password, verify) | L |
| **FIX-302** | Testing | Suite de tests para RBAC (matriz OWNER/ADMIN/VETERANO/MIEMBRO) | M |
| **FIX-303** | Testing | Suite de tests para `owner.controller.js` (backups, auditoría, sanitización PII) | M |
| **FIX-304** | Testing | Suite de tests para `admin.controller.js` (promociones, jerarquía, cuotas) | L |
| **FIX-305** | Testing | Tests de integración con Postgres real (Testcontainers o Supabase local en CI) | L |
| **FIX-306** | Observabilidad | Health checks separados: `/health` (liveness) vs `/api/health` (readiness) | S |
| **FIX-307** | Observabilidad | Correlation IDs en logs (UUID por request, inyectado en middleware) | M |
| **FIX-308** | Observabilidad | Logging estructurado con Pino (nivel, contexto, sin PII) | M |
| **FIX-309** | Observabilidad | Manejadores globales `unhandledRejection` y `uncaughtException` en `server.js` | S |

### Criterio de cierre del Sprint 3

- [ ] Cobertura de tests > 60% en módulos críticos.
- [ ] Health checks separados operativos.
- [ ] Logs con correlation ID en producción.
- [ ] Manejadores globales de errores en `server.js`.

---

## SPRINT 4 — Deuda técnica y limpieza

**Objetivo:** retirar código legacy, unificar lógica duplicada, mejorar Docker.
**Criterio de salida:** 0 referencias a módulos legacy, Dockerfile no-root, docs alineados.
**Duración estimada:** 2-3 días.
**Riesgo:** medio (toca código de arranque y estructura).
**Dueño:** OWNER + asistencia IA.

### Ítems del Sprint 4

| ID | Categoría | Descripción | Esfuerzo |
|---|---|---|---|
| **FIX-401** | Deuda técnica | Retirar rutas legacy `/api/events/*` (sunset 2026-12-16) | M |
| **FIX-402** | Deuda técnica | Ejecutar `sql/032_drop_bm_legacy_tables.sql` (post-2026-09-26) | XS |
| **FIX-403** | DevOps | `USER node` en Dockerfile (usuario no-root) | XS |
| **FIX-404** | DevOps | `min_machines_running = 1` en `fly.toml` (evaluar cold starts) | XS |
| **FIX-405** | Deuda técnica | Alinear `API_REFERENCE.md` con Zod schemas reales | S |
| **FIX-406** | Deuda técnica | Eliminar `metadata.json` si sobra (AI Studio legacy) | XS |
| **FIX-407** | Deuda técnica | Unificar manejo de errores: código, mensaje, correlation ID | M |

### Criterio de cierre del Sprint 4

- [ ] 0 referencias a `/api/bm/*` en código y docs.
- [ ] Dockerfile corre como `node`.
- [ ] `fly.toml` evaluado y ajustado.
- [ ] Documentación alineada con Zod schemas.

---

## SPRINT 5 — Features del backlog

**Objetivo:** implementar features de valor para el escuadrón.
**Criterio de salida:** cada feature con test + deploy + actualización de docs.
**Duración estimada:** variable.
**Riesgo:** variable.
**Dueño:** OWNER + asistencia IA.

### Ítems del Sprint 5 (desde `BACKLOG.md`)

| ID | Categoría | Descripción | Esfuerzo |
|---|---|---|---|
| **FIX-501** | Feature | QR de credenciales temporales (BL-001) | S |
| **FIX-502** | Feature | Auto-login con link prellenado (BL-005) | M |
| **FIX-503** | UX | Rediseño del registro de eventos (BL-002) | M |
| **FIX-504** | Fix UI | Modal de cambio de contraseña: botón visible (BL-011) | XS |
| **FIX-505** | Feature | Notificaciones push para BM (BL-010) | M |

### Criterio de cierre del Sprint 5

- [ ] Features mergeadas y desplegadas.
- [ ] Docs actualizadas.
- [ ] Backlog actualizado con ítems movidos a "Completados".

---

## 3. DOCUMENTOS FALTANTES (crear en Sprint 0)

| ID | Documento | Contenido mínimo | Esfuerzo |
|---|---|---|---|
| **FIX-DOC-01** | `CONTRIBUTING.md` | Cómo clonar, correr, testear, commitear, deployar. Convención de ramas y commits. | M |
| **FIX-DOC-02** | `SECURITY.md` | Cómo reportar vulnerabilidades. Política de divulgación. Contacto. | S |
| **FIX-DOC-03** | `docs/adr/ADR-001` a `ADR-005` | Recuperar o escribir los ADRs referenciados pero ausentes. | M |
| **FIX-DOC-04** | `docs/rfc/RFC-001.md` | QR de credenciales temporales. | S |
| **FIX-DOC-05** | `docs/incidentes/HALL-062.md` | Documentar el hallazgo `ON CONFLICT` con índices parciales. | S |

---

## 4. PLANTILLA DE ÍTEM (obligatoria)

Al agregar un ítem nuevo a cualquier sprint, usar este formato:

```markdown
### [FIX-XXX] Título corto y descriptivo
- **Severidad:** CRÍTICA / ALTA / MEDIA / BAJA / INFO
- **Categoría:** Seguridad / Correctitud / Performance / Arquitectura / Testing / Observabilidad / Deuda técnica / UX / Documentación
- **Ubicación:** archivo:línea (verificado el YYYY-MM-DD)
- **Descripción:** qué está mal y por qué importa (2-4 líneas)
- **Evidencia:** fragmento real del código o documento (máx. 10 líneas)
- **Impacto:** qué pasa si no se corrige
- **Propuesta:** cómo corregirlo (concreto, con snippet si aplica)
- **Criterio de aceptación:** cómo sabemos que quedó bien
- **Esfuerzo:** XS / S / M / L / XL
- **Riesgo de la corrección:** bajo / medio / alto
- **PR:** #NNN (cuando exista)
- **Estado:** ⏳ Pendiente / 🔄 En curso / 🧪 En revisión / ✅ Cerrado / ❌ Descartado / 🚫 Bloqueado
```

**Un ítem sin `Evidencia` NO entra al roadmap.**

---

## 5. CRITERIOS DE SEVERIDAD

| Severidad | Cuándo aplica |
|---|---|
| **CRÍTICA** | Explotable remotamente sin auth, pérdida de datos, bypass de auth/RBAC, secreto expuesto, RCE, SQLi, XSS almacenado, IDOR masivo |
| **ALTA** | Escalada de privilegios, bypass de validación, DoS trivial, race condition con impacto real, falta de validación en endpoints sensibles |
| **MEDIA** | Correctitud que afecta a algunos usuarios, performance degradada bajo carga, manejo de errores que filtra info |
| **BAJA** | Calidad, nombres, duplicación, logs poco útiles, bugs de UX menores |
| **INFO** | Observaciones, sugerencias, cosas a monitorear |

---

## 6. WORKFLOW DE TRABAJO

```
1. Identificar ítem (bug, doc desactualizado, deuda técnica)
   ↓
2. Verificar (confirmar que es real, con evidencia)
   ↓
3. Registrar en este roadmap con ID único (FIX-XXX)
   ↓
4. Abrir issue o rama con criterio de aceptación
   ↓
5. PR pequeño y enfocado (1 ítem = 1 PR)
   ↓
6. Test que cubra el fix (si aplica)
   ↓
7. Deploy a staging / preview
   ↓
8. Smoke test
   ↓
9. Merge a main → deploy producción
   ↓
10. Marcar ítem como ✅ y actualizar CHANGELOG.md
```

**Reglas:**

- No se mergea a `main` sin test (para fixes de código).
- No se deploya a producción sin smoke test.
- No se cierra un ítem sin actualizar `CHANGELOG.md`.
- Un PR puede cerrar varios ítems **solo si son del mismo archivo y misma naturaleza**.

---

## 7. ESTADOS DE UN ÍTEM

| Estado | Símbolo | Significado |
|---|---|---|
| Pendiente | ⏳ | Verificado, no arrancado |
| En curso | 🔄 | PR abierto |
| En revisión | 🧪 | PR en review o staging |
| Cerrado | ✅ | Mergeado + deploy + test |
| Descartado | ❌ | No aplica (con justificación) |
| Bloqueado | 🚫 | Depende de otro ítem o decisión externa |

---

## 8. ✅ COMPLETADOS

| ID | Descripción | Fecha | Commit |
|---|---|---|---|
| **FIX-001** | `README.md` badge v4.0.5 → v4.3.0 | 2026-09-20 | `f32ed11` |
| **FIX-005** | `CURRENT_STATE.md` resumen v4.0.2 → v4.3.0 | 2026-09-20 | `f32ed11` |
| **FIX-014** | `DEPLOYMENT_STATE.md` v4.0.5 → v4.3.0 | 2026-09-20 | `f32ed11` |
| **FIX-015** | `DEPLOYMENT_GUIDE.md` v4.0.5 → v4.3.0 + cache invalidation | 2026-09-20 | `f32ed11` |
| **FIX-017** | `PWA_SETUP.md` v4.0.5 → v4.3.0 + CACHE_NAME real | 2026-09-20 | `f32ed11` |
| **FIX-026** | `sw.js` CACHE_NAME v4.2.5 → v4.3.0 (hallazgo nuevo) | 2026-09-20 | `f32ed11` |
| **FIX-004** | `README.md` cuota ADMIN 3 → 5 | 2026-09-20 | `fbf4852` |
| **FIX-009** | `API_REFERENCE.md` cuota ADMIN 3 → 5 | 2026-09-20 | `fbf4852` |
| **FIX-011** | `ARCHITECTURE.md` cuota ADMIN ya estaba en 5 (verificado) | 2026-09-20 | `f32ed11` |
| **FIX-018** | `CONTEXTO_PROYECTO.md` cuota ADMIN simplificada a 5 | 2026-09-20 | `fbf4852` |
| **FIX-003** | `README.md` eliminar `bm.controller.js` del árbol + agregar v2 | 2026-09-20 | `e10c204` |
| **FIX-008** | `API_REFERENCE.md` banner ELIMINADO en sección legacy `/api/bm/*` | 2026-09-20 | `e10c204` |
| **FIX-010** | `ARCHITECTURE.md` reformular estado endpoints legacy | 2026-09-20 | `e10c204` |
| **FIX-012** | `docs/adr/README.md` ADR-008 marcado como Accepted | 2026-09-20 | `079889f` |
| **FIX-013** | 5 ADRs creados (001-005) en formato MADR 4.0 + TEMPLATE | 2026-09-20 | `079889f` |

---

## 9. ❌ DESCARTADOS

| ID | Descripción | Razón | Fecha |
|---|---|---|---|
| _(vacío al inicio)_ | | | |

---

## 10. 🚫 BLOQUEADOS

| ID | Descripción | Bloqueado por | Fecha |
|---|---|---|---|
| _(vacío al inicio)_ | | | |

---

## 11. MÉTRICAS DE PROGRESO

| Métrica | Actual | Sprint 0 | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 |
|---|---|---|---|---|---|---|
| Docs alineados con versión real | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| Hallazgos confirmados | 0 | 0 | 8 | 8 | 8 | 8 |
| Fixes cerrados | 0 | 25 | 25 | 33+ | 42+ | 49+ |
| Cobertura de tests (críticos) | ~34% | ~34% | ~34% | ~50% | >60% | >60% |
| Deuda técnica (horas estimadas) | ~40h | ~36h | ~28h | ~16h | ~8h | ~2h |

---

## 12. CRONOGRAMA SUGERIDO

| Sprint | Duración | Entregable |
|---|---|---|
| **Sprint 0** | 3-4 h | Documentación sincronizada |
| **Sprint 1** | 4-6 h | Hallazgos verificados |
| **Sprint 2** | 1-2 días | Fixes críticos desplegados |
| **Sprint 3** | 3-5 días | Cobertura >60%, observabilidad |
| **Sprint 4** | 2-3 días | Deuda técnica limpia |
| **Sprint 5** | 1-2 semanas | Features del backlog |

**Total estimado:** 3-4 semanas calendario (con dedicación parcial).

---

## 13. REGLAS DE GOBIERNO

- **Una fase a la vez.** No iniciar Sprint N+1 sin cerrar Sprint N.
- **Una tarea a la vez.** No mezclar cambios de varios ítems en un commit.
- **Rama por sprint.** Cada sprint en su rama (`fix/sprint-N`).
- **Commit descriptivo.** Formato: `fix(fix-XXX): descripción breve`.
- **Deploy tras cada sprint.** No acumular cambios sin desplegar.
- **Rollback preparado.** Documentar cómo revertir cada cambio.
- **`CHANGELOG.md` actualizado** al cerrar cada sprint.

---

## 14. SECCIÓN DE CORRECCIONES

Si algún valor de la sección 1 (Estado Actual de Referencia) resulta incorrecto:

| Campo | Valor declarado | Valor real | Fecha corrección |
|---|---|---|---|
| _(vacío al inicio)_ | | | |

---

## 15. REFERENCIAS

- [`CHANGELOG.md`](./CHANGELOG.md) — Histórico de versiones.
- [`BACKLOG.md`](./BACKLOG.md) — Ideas y features futuras.
- [`ROADMAP.md`](./ROADMAP.md) — Visión estratégica.
- [`PLAN_MEJORA_CONTINUA.md`](./PLAN_MEJORA_CONTINUA.md) — Plan histórico (cerrado).
- [`docs/adr/`](./docs/adr/) — Decisiones arquitectónicas.
- [`docs/rfc/`](./docs/rfc/) — Propuestas formales.
- [`docs/SESSION_HANDOFF.md`](./docs/SESSION_HANDOFF.md) — Handoff entre sesiones.

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Plan de Trabajo v1.0 · 2026-09-20 · Documento vivo**
