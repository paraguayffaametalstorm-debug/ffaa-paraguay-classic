# 🚀 PROMPT DE CONTINUACIÓN — Fase 2 del Módulo Veteranos

## Contexto

Estoy trabajando en **PARAGUAY-FFAA | METALSTORM**, plataforma táctica del
escuadrón paraguayo `PARAGUAY FFAA [PRY]` en MetalStorm.

**Estamos implementando el módulo Sección Veteranos** (mentoría + RBAC fino),
documentado en:

- `docs/adr/ADR-010-seccion-veteranos.md` (ADR completo)
- `PLAN_TRABAJO_VETERANOS.md` (plan de 7 fases)

## Estado actual

- **F1 (Validación del ADR-010):** ✅ Completada.
  - ADR-010 aprobado por el OWNER.
  - Decisiones D1/D2/D3 confirmadas: Mixto, Opcional, Completo.

- **F2 (Migración SQL):** 🟡 En curso (0%).
  - A crear: `sql/041_mentorships.sql` con:
    - Tabla `mentorships` (con índice único parcial).
    - Tabla `mentorship_logs`.
    - Tabla `mentor_evaluations`.
    - RLS + policy `no_public_access` en las 3.
    - **GRANT explícito para `service_role`** (crítico post 2026-10-30).
    - REVOKE de `anon`, `authenticated`.

## Próximo paso

Ejecutar la Fase 2: crear `sql/041_mentorships.sql` con las 3 tablas + RLS +
GRANTs, ejecutarlo en Supabase, y verificar la creación.

## Archivos a adjuntar

Obligatorios:

- `docs/adr/ADR-010-seccion-veteranos.md`
- `PLAN_TRABAJO_VETERANOS.md`
- `docs/SESSION_HANDOFF.md` (contexto general)
- `sql/040_presence_table.sql` (patrón de referencia más reciente)

Opcionales:

- `src/controllers/admin.controller.js` (para ver `addMember`)
- `sql/027_backups_table.sql` (otro patrón de referencia)

## Comandos de verificación

```cmd
cd C:\Users\Admin\proyectos\ffaa-paraguay-classic
git log --oneline -5
git status
dir sql\041_mentorships.sql
```

## Recordatorios críticos

1. **Post 2026-10-30:** toda tabla nueva requiere GRANT explícito para `service_role`.
2. Usar `GENERATED ALWAYS AS IDENTITY` en lugar de `SERIAL` (evita GRANT separado).
3. Script idempotente (`IF NOT EXISTS` en todo).
4. Backfill NO aplica (no hay datos históricos que migrar).
5. Verificar RLS con `SELECT relrowsecurity FROM pg_tables WHERE tablename = '...'`.

## Siguiente fase (F3)

Después de F2 cerrada:

- Crear `src/controllers/veteran.controller.js`.
- Crear `src/routes/veteran.routes.js`.
- Crear `src/middlewares/mentorOwnership.js`.
- Mount en `server.js`.

---

**PARAGUAY FFAA \`[PRY]\` — Prompt de continuación Veteranos F2**
