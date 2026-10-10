# ADR-010: Sección Veteranos (mentoría + RBAC fino)

- **Fecha:** 2026-10-10
- **Estado:** 📝 Proposed (pendiente de validación del OWNER)
- **Decisores:** PJPIROVANI (OWNER) + Comando C4ISR
- **Relacionado con:** ADR-002 (RBAC), ADR-004 (cuotas), normativa v2.0, normativa v3.0 (borrador)

## Estado

**📝 Proposed** — pendiente de validación del OWNER.
No se toca código de producción hasta que pase a `Accepted`.

## Contexto y problema

El rol **VETERANO** existe en el sistema desde la fundación del escuadrón y
está definido en la **Normativa v2.0 (aprobada, vigente)** con las siguientes
funciones:

- Mentoría de nuevos miembros.
- Enseñanza de estrategias y prácticas de juego.
- Acompañamiento en eventos.
- Reporte de dificultades a la Administración.

Sin embargo, el sistema **no ofrece ninguna herramienta específica** para que
el Veterano ejerza estas funciones:

1. **No existe vista propia del Veterano.** Solo tiene acceso a las vistas
   comunes (dashboard, hangar, perfil).
2. **No hay forma de asignar formalmente un mentor** a un miembro nuevo.
3. **No hay registro de mentorías** (contactos, evaluaciones, historial).
4. **No hay visibilidad de los pupilos** asignados a cada Veterano.
5. **El Panel de Comandancia no tiene sección "Veteranos"** para supervisar
   cupos, asignaciones y evaluaciones.

La **Normativa v3.0 (borrador)** refuerza el rol: Art. 13 (naturaleza),
Art. 14 (límites), Art. 24-27 (mentoría), Art. 27 (evaluación de Veteranos).
**Pero la v3.0 no está aprobada todavía** (Art. 47 requiere 2/3 de Admin + Owner).

**Decisión clave:** las piezas que ya estaban en v2.0 (mentoría, límites,
cupos, ascensos) son implementables **ya**. Las piezas nuevas de v3.0
("Miembro en Prueba" formal, programa de integración de 7 días) quedan
fuera de este ADR y se agregan después.

## Factores de decisión

- **Normativa vigente:** la mentoría ya es reglamentaria en v2.0.
- **Aditivo:** no romper nada existente; sumar funcionalidad sobre lo actual.
- **RBAC fino:** el Veterano solo debe ver SUS pupilos, no los de otros.
- **Supabase post-2026-10-30:** tablas nuevas requieren GRANT explícito.
- **Mantenibilidad:** 1 sola fuente de verdad para mentorías.
- **Extensibilidad:** el diseño debe permitir agregar "Miembro en Prueba"
  formal cuando se apruebe la v3.0, sin refactor.

## Opciones consideradas

1. **No hacer nada (status quo)**
   - **Pros:** cero esfuerzo.
   - **Contras:** el rol Veterano queda subutilizado. La normativa se cumple
     "de palabra" pero no hay trazabilidad.

2. **Solo sección admin "Veteranos" (Interpretación A)**
   - **Pros:** 4-6 h de trabajo. Trivial. Reutiliza infraestructura de F6.
   - **Contras:** no resuelve el problema del Veterano (él sigue sin poder
     gestionar sus pupilos). Solo sirve al ADMIN.

3. **Vista propia del Veterano + sección admin como subproducto (Interpretación B)**
   - **Pros:** resuelve el problema real. Aditivo. 5-7 días.
     Extensible a "Miembro en Prueba" cuando se apruebe v3.0.
   - **Contras:** requiere tabla nueva (`mentorships`) + RBAC fino.

## Decisión

**Elegimos la Opción 3 (Interpretación B).**

El alcance es:

### Modelo de datos

**Tabla nueva `mentorships`** (relación mentor ↔ pupilo):

| Columna | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | Identificador único |
| `mentor_id` | UUID FK → `users.id` | El Veterano mentor |
| `mentee_id` | UUID FK → `users.id` | El miembro pupilo |
| `started_at` | TIMESTAMPTZ | Inicio de la mentoría |
| `ended_at` | TIMESTAMPTZ NULL | Fin (si terminó) |
| `status` | TEXT | `'ACTIVE'` \| `'ENDED'` \| `'REASSIGNED'` |
| `ended_reason` | TEXT NULL | Motivo del fin |
| `created_by` | UUID FK → `users.id` | Quién asignó (auto o admin) |
| `created_at` | TIMESTAMPTZ | Fecha de creación |

**Índice único parcial:** solo 1 mentor ACTIVE por pupilo.

**Tabla nueva `mentorship_logs`** (registro de contactos):

| Columna | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | Identificador |
| `mentorship_id` | UUID FK → `mentorships.id` | Mentoría asociada |
| `note` | TEXT | Nota del contacto |
| `created_at` | TIMESTAMPTZ | Fecha |
| `created_by` | UUID FK → `users.id` | Quién registró |

**Tabla nueva `mentor_evaluations`** (evaluaciones consultivas):

| Columna | Tipo | Propósito |
|---|---|---|
| `id` | UUID PK | Identificador |
| `mentorship_id` | UUID FK → `mentorships.id` | Mentoría |
| `criteria` | JSONB | Criterios de Art. 25.4 (participación, cooperación, conducta, integración, disposición) |
| `summary` | TEXT | Resumen fundamentado |
| `created_at` | TIMESTAMPTZ | Fecha |
| `created_by` | UUID FK → `users.id` | El mentor |

### Permisos (RBAC fino)

| Rol | Puede ver | Puede asignar | Puede evaluar |
|---|---|---|---|
| **VETERANO** | Solo sus pupilos | No | Sí (evaluación consultiva) |
| **ADMIN** | Todos los Veteranos + pupilos | Sí (reasignar) | No |
| **OWNER** | Todos | Sí | No |
| **MIEMBRO** | Nada | No | No |

### Endpoints nuevos (`/api/veteran/*`)

- `GET /api/veteran/my-pupilos` — lista de pupilos del Veterano autenticado.
- `GET /api/veteran/my-mentorships` — historial.
- `POST /api/veteran/mentorship/:id/log` — registrar contacto.
- `POST /api/veteran/mentorship/:id/evaluate` — emitir evaluación consultiva.
- `GET /api/veteran/mentorship/:id` — detalle de una mentoría.

**Endpoints admin** (agregar a `/api/admin/*`):

- `POST /api/admin/mentorships` — asignar mentor manualmente.
- `PATCH /api/admin/mentorships/:id` — reasignar o cerrar.
- `GET /api/admin/mentorships` — listar todas las mentorías.

### Auto-asignación

Al crear un miembro (`POST /api/admin/members`):

1. Buscar Veteranos con `role = 'VETERANO'` y `status = 'ACTIVE'`.
2. Ordenar por cantidad de pupilos ACTIVE (ascendente).
3. Asignar al Veterano con menos pupilos.
4. Si no hay Veterano disponible, dejar mentoría sin asignar.
5. Registrar en `mentorships` con `created_by = req.user.id`.

### Frontend

- **Vista nueva `components/veteran-panel.html`** — solo visible para VETERANO.
- **Widget "Mis Pupilos"** en el dashboard (si el rol es VETERANO).
- **Sección "Veteranos"** en el Panel de Comandancia (subproducto).

### Decisiones validadas por el OWNER

| # | Decisión | Valor |
|---|---|---|
| D1 | Asignación de mentor | **Mixto**: automático + override manual |
| D2 | Evaluación consultiva obligatoria | **Opcional** |
| D3 | Visibilidad del semáforo | **Completo** (tokens, días, estado) |

## Consecuencias

### Positivas

- El rol Veterano pasa a tener herramientas reales para cumplir la normativa.
- Trazabilidad completa de mentorías.
- Base extensible para "Miembro en Prueba" (v3.0).
- Aditivo: no rompe nada existente.

### Negativas

- 3 tablas nuevas + endpoints nuevos + vista nueva.
- RBAC fino requiere middleware nuevo (`requireMentorOwnership`).
- Aumenta la superficie de mantenimiento.

### Neutrales

- No requiere migrar datos existentes (los miembros actuales no tienen mentor).
- El "Miembro en Prueba" formal queda fuera (depende de v3.0).

## Implementación

**Estado actual:** 📝 Proposed. No hay código implementado.

**Plan completo:** ver [`PLAN_TRABAJO_VETERANOS.md`](../../PLAN_TRABAJO_VETERANOS.md).

**Archivos planeados:**

- `sql/041_mentorships.sql` — migración.
- `src/controllers/veteran.controller.js` — nuevo.
- `src/routes/veteran.routes.js` — nuevo.
- `src/middlewares/mentorOwnership.js` — nuevo.
- `src/controllers/admin.controller.js` — modificar (`addMember` con auto-asignación).
- `components/veteran-panel.html` — nuevo.
- `js/veteran.js` — nuevo.
- `js/views.js` — modificar (entrada al menú, widget dashboard).
- `admin-sections.js` — modificar (nueva sección "Veteranos").

## Requisitos Supabase post-2026-10-30

**⚠️ Crítico:** a partir del **30 de octubre de 2026**, Supabase deja de
otorgar automáticamente permisos (`GRANT`) a tablas nuevas en el schema
`public` para los roles `anon`, `authenticated` y `service_role`.

Las **tablas existentes no se tocan** (mantienen sus grants materializados).
Pero las **tablas nuevas creadas después del 30/10** deben incluir `GRANT`
explícito o **el backend (service_role) recibirá `42501 permission denied`**.

**Toda migración nueva debe incluir:**

```sql
-- 1. Crear tabla
CREATE TABLE public.mentorships (...);

-- 2. RLS + policy (patrón existente)
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS no_public_access ON public.mentorships;
CREATE POLICY no_public_access ON public.mentorships
  FOR ALL TO public USING (false) WITH CHECK (false);

-- 3. GRANT explícito (NUEVO — requerido post 2026-10-30)
REVOKE ALL ON public.mentorships FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.mentorships FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorships TO service_role;
```

**Reglas adicionales:**

- Usar `GENERATED ALWAYS AS IDENTITY` en lugar de `SERIAL` (evita GRANT
  separado para la secuencia).
- `service_role` bypassa RLS pero **no GRANT**. El error es `42501`, no
  un error de policy.
- Agregar migración "catch-up" si se re-ejecutan migraciones históricas en
  un Supabase limpio (`sql/0NN_catchup_grants.sql`).

**Referencia:** Supabase Changelog — "Auto-expose new tables" (2026-04-28 → 2026-10-30).

## Pendiente de verificar

- [ ] Validación del OWNER: D1/D2/D3 confirmadas.
- [ ] Aprobación del ADR-010 (📝 Proposed → ✅ Accepted).
- [ ] Revisión del plan por parte del OWNER.
- [ ] Confirmación de que la normativa v2.0 sigue vigente (no fue reemplazada).
- [ ] Estimación de impacto en las tablas existentes: ninguna.
- [ ] Verificar que `admin.controller.js:addMember()` es el único punto de
      creación de miembros (para no dejar huecos de auto-asignación).

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Rol VETERANO existe con cupo 8 | `src/controllers/admin.controller.js` — `ROLE_LIMITS.VETERANO = 8` |
| Mentoría es reglamentaria | Normativa v2.0 (aprobada) + `normativa-v3.0-borrador.md` Art. 13-14 |
| No existe tabla `mentorships` | `dir sql\*mentorship*` → vacío |
| No existe `veteran.controller.js` | `findstr veteran src/controllers` → vacío |
| `addMember()` es el punto de creación | `src/controllers/admin.controller.js` — verificado |
| Auto-expose de tablas cambia el 30/10 | Supabase Changelog (2026) |
| Panel de Comandancia tiene sidebar de 5 secciones | `docs/HANDOFF-v4.7.0.md` + `admin-sections.template.js` |
| RBAC actual es por rol, no por recurso | `src/middlewares/auth.js` — `requireRole` |

## Referencias

- `docs/adr/README.md`
- `docs/adr/TEMPLATE.md`
- `PLAN_TRABAJO_VETERANOS.md`
- `normativa-v3.0-borrador.md` — Art. 13, 14, 24, 25, 26, 27
- `admin-sections.template.js` — infraestructura del sidebar
- `docs/HANDOFF-v4.7.0.md` — Panel de Comandancia F6

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Estado **Proposed** — pendiente de validación del OWNER.
> Documento vivo — actualizar al implementar.
