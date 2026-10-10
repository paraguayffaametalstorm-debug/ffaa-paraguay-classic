# 🔧 PLAN DE TRABAJO — Sección Veteranos

> **Plan de implementación del módulo de Veteranos (mentoría + RBAC fino).**
> **ADR de referencia:** [`docs/adr/ADR-010-seccion-veteranos.md`](./docs/adr/ADR-010-seccion-veteranos.md)
> **Fecha:** 2026-10-10
> **Versión objetivo:** v4.8.0
> **Duración estimada:** 5-7 días
> **Estado:** 📋 Planificado (esperando validación del OWNER)

---

## 1. Objetivo

Dar al rol **VETERANO** herramientas reales para cumplir sus funciones
reglamentarias (normativa v2.0 vigente + v3.0 borrador) y dar al **ADMIN/OWNER**
visibilidad sobre las mentorías activas del escuadrón.

**Alcance confirmado:**

- Vista propia del Veterano con lista de pupilos.
- Registro de contactos de mentoría.
- Evaluación consultiva (opcional).
- Auto-asignación de mentor al crear miembro.
- Sección "Veteranos" en el Panel de Comandancia (subproducto).

**Fuera de alcance:**

- "Miembro en Prueba" formal (Art. 15 bis v3.0) — espera aprobación.
- Programa de integración de 7 días (Art. 24 v3.0) — ídem.
- Ponderación de aporte (Anexo II §F) — ídem.

---

## 2. Estado actual del sistema

| Aspecto | Valor |
|---|---|
| Rol VETERANO | ✅ Existe (cupo 8) |
| `ROLE_LIMITS.VETERANO` | ✅ `= 8` |
| Tabla `mentorships` | ❌ No existe |
| Tabla `mentorship_logs` | ❌ No existe |
| Tabla `mentor_evaluations` | ❌ No existe |
| `veteran.controller.js` | ❌ No existe |
| `veteran.routes.js` | ❌ No existe |
| Vista `veteran-panel.html` | ❌ No existe |
| Sección admin "Veteranos" | ❌ No existe |
| Auto-asignación de mentor | ❌ No existe |
| RBAC fino (mentor ownership) | ❌ No existe |

---

## 3. Fases de implementación

### F1 — Validación del ADR-010 + plan

**Duración:** 30 min
**Entregable:** ADR-010 aprobado (📝 → ✅).
**Criterio de cierre:** OWNER valida las 3 decisiones (D1/D2/D3) y firma el ADR.

**Dependencias:** ninguna.
**Riesgo:** nulo (solo lectura).

---

### F2 — Migración SQL

**Duración:** 2-3 h
**Entregable:** `sql/041_mentorships.sql` ejecutado en Supabase.

**Contenido:**

- Tabla `mentorships` (con índice único parcial: 1 mentor ACTIVE por pupilo).
- Tabla `mentorship_logs`.
- Tabla `mentor_evaluations`.
- RLS + policy `no_public_access` en las 3.
- **GRANT explícito para `service_role`** (crítico post 2026-10-30).
- `REVOKE` de `anon`, `authenticated`.
- Verificación post-migración.

**Criterio de cierre:**

- ✅ 3 tablas creadas en Supabase.
- ✅ RLS habilitado en las 3.
- ✅ `service_role` con GRANT SELECT/INSERT/UPDATE/DELETE.
- ✅ `anon`/`authenticated` sin GRANT.
- ✅ Script idempotente (re-ejecutable sin error).

**Riesgo:** bajo (aditivo, no toca tablas existentes).
**Rollback:** `DROP TABLE mentorships CASCADE;` + los otros 2.

---

### F3 — Backend (controller + routes + RBAC fino)

**Duración:** 1 día
**Entregable:**

- `src/controllers/veteran.controller.js` (nuevo).
- `src/routes/veteran.routes.js` (nuevo).
- `src/middlewares/mentorOwnership.js` (nuevo).
- Mount en `server.js`.

**Endpoints:**

| Método | Endpoint | Middleware | Función |
|---|---|---|---|
| GET | `/api/veteran/my-pupilos` | `requireAuth` + `requireRole('VETERANO','ADMIN','OWNER')` | Lista pupilos del Veterano |
| GET | `/api/veteran/my-mentorships` | Ídem | Historial |
| GET | `/api/veteran/mentorship/:id` | Ídem + `requireMentorOwnership` | Detalle |
| POST | `/api/veteran/mentorship/:id/log` | Ídem + `requireMentorOwnership` | Registrar contacto |
| POST | `/api/veteran/mentorship/:id/evaluate` | Ídem + `requireMentorOwnership` | Evaluación consultiva |

**RBAC fino (`requireMentorOwnership`):**

```javascript
export async function requireMentorOwnership(req, res, next) {
  const mentorshipId = req.params.id;
  const userId = req.user.id;
  const role = req.user.role;

  const { data, error } = await getSupabase()
    .from('mentorships')
    .select('mentor_id')
    .eq('id', mentorshipId)
    .single();

  if (error || !data) {
    return res.status(404).json({ code: 'MENTORSHIP_NOT_FOUND' });
  }

  // ADMIN/OWNER pueden ver cualquiera
  if (role === 'ADMIN' || role === 'OWNER') return next();

  // VETERANO solo si es su mentoría
  if (role === 'VETERANO' && String(data.mentor_id) === String(userId)) {
    return next();
  }

  return res.status(403).json({ code: 'MENTORSHIP_FORBIDDEN' });
}
```

**Criterio de cierre:**

- ✅ 5 endpoints operativos con RBAC fino.
- ✅ Test: un Veterano NO puede ver mentorías ajenas (403).
- ✅ Test: un ADMIN puede ver cualquiera (200).
- ✅ Test: un MIEMBRO recibe 403 en todos los endpoints.

**Riesgo:** medio (RBAC fino es sensible).
**Rollback:** `git revert` del commit + desmontar la ruta en `server.js`.

---

### F4 — Refactor `admin.controller.js` (auto-asignación)

**Duración:** 2-3 h
**Entregable:** `addMember()` crea automáticamente la mentoría.

**Cambio en `addMember()`:**

```javascript
// Después de crear el miembro, asignar mentor
async function assignMentorAuto(supabase, menteeId, createdBy) {
  // 1. Buscar Veteranos ACTIVE
  const { data: veterans } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'VETERANO')
    .eq('status', 'ACTIVE');

  if (!veterans || veterans.length === 0) return null;

  // 2. Contar pupilos ACTIVE de cada uno
  const counts = await Promise.all(veterans.map(async v => {
    const { count } = await supabase
      .from('mentorships')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', v.id)
      .eq('status', 'ACTIVE');
    return { mentor_id: v.id, count: count || 0 };
  }));

  // 3. Ordenar y elegir el de menos pupilos
  counts.sort((a, b) => a.count - b.count);
  const chosen = counts[0].mentor_id;

  // 4. Insertar mentoría
  const { data, error } = await supabase
    .from('mentorships')
    .insert({
      mentor_id: chosen,
      mentee_id: menteeId,
      status: 'ACTIVE',
      created_by: createdBy
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

**Fallback:** si no hay Veterano disponible, se crea el miembro sin mentor.
El ADMIN puede asignar manualmente después.

**Criterio de cierre:**

- ✅ Al crear un miembro con Veteranos disponibles, se crea mentoría.
- ✅ Al crear un miembro sin Veteranos, no falla (mentoría queda pendiente).
- ✅ Al crear un miembro, se elige el Veterano con menos pupilos.
- ✅ Auditoría en `audit_logs` (`MENTORSHIP_AUTO_ASSIGNED`).

**Riesgo:** bajo (aditivo, no rompe `addMember` existente).
**Rollback:** `git revert` del commit.

---

### F5 — Frontend: vista propia del Veterano

**Duración:** 1.5 días
**Entregable:**

- `components/veteran-panel.html` (nuevo).
- `js/veteran.js` (nuevo).
- Modificación en `js/views.js`: mostrar entrada al menú si `role === 'VETERANO'`.
- Widget "Mis Pupilos" en `components/dashboard.html`.

**Estructura de la vista:**

```
┌────────────────────────────────────────────────┐
│  🎖️ Panel del Veterano — [NICK]                │
│  ─────────────────────────────────────────────  │
│                                                 │
│  📊 RESUMEN                                     │
│  • Pupilos activos: 3                           │
│  • Contactos este mes: 12                       │
│  • Evaluaciones pendientes: 1                   │
│                                                 │
│  👥 MIS PUPILOS                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ [NICK] · Desde: 2026-09-15                │ │
│  │ Tokens: 185 · Días: 5 · Estado: 🟢 VERDE   │ │
│  │ [Registrar Contacto] [Evaluar]             │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  📜 HISTORIAL DE CONTACTOS                      │
│  ...                                            │
│                                                 │
└────────────────────────────────────────────────┘
```

**Criterio de cierre:**

- ✅ Vista accesible solo para VETERANO.
- ✅ Lista de pupilos con datos reales (tokens, días, semáforo).
- ✅ Botón "Registrar Contacto" abre modal.
- ✅ Botón "Evaluar" abre modal.
- ✅ Responsive (mobile <768px, tablet, desktop).
- ✅ Reutiliza `.card`, `.data-table`, `.status-badge`.

**Riesgo:** bajo (vista nueva, no toca existentes).
**Rollback:** `git revert` + eliminar archivos nuevos.

---

### F6 — Frontend: sección admin "Veteranos"

**Duración:** 4-6 h
**Entregable:**

- `components/admin-sections/admin-veterans.html` (nuevo).
- Entrada en `ADMIN_SECTIONS` de `admin-sections.js`.
- `initAdminVeteransSection()`.

**Contenido:**

- Lista de Veteranos con # pupilos activos.
- Lista de mentorías activas (mentor → pupilo).
- Filtro por Veterano.
- Botón "Reasignar mentor" (abre modal).
- Auditoría de evaluaciones.

**Criterio de cierre:**

- ✅ Sección visible en el sidebar del Panel de Comandancia.
- ✅ Lazy loading funciona.
- ✅ Reutiliza infraestructura de F6.
- ✅ Mobile responsive.

**Riesgo:** nulo (aditivo, infraestructura ya probada).
**Rollback:** `git revert` + eliminar archivo nuevo.

---

### F7 — Tests + Docs + Deploy

**Duración:** 1 día
**Entregable:**

- Tests unitarios (Vitest).
- Tests de RBAC fino.
- Documentación actualizada.
- Deploy a producción.

**Tests:**

| # | Test | Capa |
|---|---|---|
| 1 | `GET /my-pupilos` devuelve solo los del Veterano | integración |
| 2 | `GET /mentorship/:id` de otro Veterano → 403 | integración |
| 3 | `POST /log` en mentoría propia → 201 | integración |
| 4 | `POST /evaluate` en mentoría ajena → 403 | integración |
| 5 | `addMember()` con Veteranos → crea mentoría | unitario |
| 6 | `addMember()` sin Veteranos → no falla | unitario |
| 7 | Auto-asignación elige el de menos pupilos | unitario |
| 8 | Índice único parcial: 2 mentorías ACTIVE para mismo pupilo → error | SQL |
| 9 | MIEMBRO en cualquier endpoint → 403 | integración |
| 10 | ADMIN puede ver mentorías de cualquier Veterano | integración |

**Documentación:**

- `CHANGELOG.md` — entrada `[4.8.0]`.
- `API_REFERENCE.md` — sección `/api/veteran/*`.
- `ARCHITECTURE.md` — §nueva sobre mentorías.
- `CURRENT_STATE.md` — 1 fila nueva.
- `DEPLOYMENT_STATE.md` — 3 tablas nuevas.
- `USER_MANUAL.md` — sección "Mentoría".
- `BACKLOG.md` — BL-031 movido a Completados.
- `docs/adr/ADR-010-seccion-veteranos.md` — 📝 → ✅.

**Criterio de cierre:**

- ✅ 10 tests nuevos pasan.
- ✅ 0 regresiones en tests existentes.
- ✅ 7 documentos actualizados.
- ✅ Deploy exitoso en Render.
- ✅ Smoke test OK.

**Riesgo:** bajo (fase de cierre).

---

## 4. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| RBAC fino con bug (Veterano ve ajeno) | Media | Alto | Tests de integración exhaustivos |
| Auto-asignación elige mal mentor | Baja | Bajo | Test unitario de orden |
| GRANT olvidado en la migración | Media | **Alto** | Checklist obligatorio en `sql/041_*.sql` |
| Race condition al crear mentoría | Baja | Medio | Índice único parcial (garantía BD) |
| Service Worker cachea JS viejo | Alta | Medio | Bump `CACHE_NAME` + unregister |
| Normativa v3.0 cambia el modelo | Media | Medio | ADR deja explícito "v3.0 fuera de alcance" |
| Tokens IA al 95% a mitad de fase | Alta | Bajo | Protocolo de continuación al 95% |

---

## 5. Lo que NO se toca

- `src/controllers/admin.controller.js` — solo se agrega `assignMentorAuto()`.
  El resto de las funciones no cambia.
- `src/middlewares/auth.js` — sin cambios. `requireRole` sigue igual.
- Endpoints existentes — sin cambios de contrato.
- Tablas existentes — 0 migraciones.
- Panel de Comandancia existente — solo se agrega una sección.
- Modal de cambio de contraseña, formulario de rendimiento, hangar, etc. —
  sin cambios.

---

## 6. Cronograma

| Día | Fase | Entregable |
|---|---|---|
| D+0 | F1 | ADR-010 aprobado |
| D+0 | F2 | Migración SQL ejecutada |
| D+1 | F3 | Backend operativo |
| D+1 | F4 | Auto-asignación funcionando |
| D+2 | F5 | Vista Veterano |
| D+3 | F6 | Sección admin |
| D+4 | F7 | Tests + Docs + Deploy |

**Total:** 5-7 días con dedicación parcial.

---

## 7. Protocolo al 95% de tokens

Si durante la implementación la sesión de IA llega al 95% de tokens:

1. La IA debe avisar: `⚠️ Tokens al 95%. Generando prompt de continuación.`
2. Generar `docs/prompts/prompt-continuacion-veteranos-fase-N.md`.
3. Incluir: contexto, fase actual, próximo paso, archivos a adjuntar.
4. Guardar en `docs/prompts/`.

---

## 8. Referencias

- [`docs/adr/ADR-010-seccion-veteranos.md`](./docs/adr/ADR-010-seccion-veteranos.md)
- [`BACKLOG.md`](./BACKLOG.md) — BL-031
- [`PLAN_TRABAJO.md`](./PLAN_TRABAJO.md) — Sprint 6
- [`docs/adr/ADR-002-politica-endpoints-publico-privado.md`](./docs/adr/ADR-002-politica-endpoints-publico-privado.md)
- [`docs/adr/ADR-004-cuota-admin.md`](./docs/adr/ADR-004-cuota-admin.md)
- [`admin-sections.template.js`](./admin-sections.template.js)
- [`normativa-v3.0-borrador.md`](./normativa-v3.0-borrador.md)

---

**PARAGUAY FFAA \`[PRY]\` — Escuadrón Oficial MetalStorm**
**Plan de Trabajo Veteranos v1.0 · 2026-10-10 · Documento vivo**
