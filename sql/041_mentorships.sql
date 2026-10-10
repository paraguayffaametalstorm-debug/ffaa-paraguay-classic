-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM - ADR-010
-- 041_mentorships.sql
-- ============================================================================
-- PROPÓSITO:
--   Implementar el modelo de datos del módulo Sección Veteranos (mentoría +
--   RBAC fino), dando al rol VETERANO herramientas reales para cumplir sus
--   funciones reglamentarias (normativa v2.0 vigente).
--
-- RESUELVE:
--   - No existe tabla `mentorships` (mentor ↔ pupilo).
--   - No hay registro de contactos de mentoría.
--   - No hay evaluaciones consultivas del mentor.
--   - No hay trazabilidad de asignaciones/reasignaciones.
--
-- ALCANCE:
--   - Tabla `mentorships` (relación mentor ↔ pupilo).
--   - Tabla `mentorship_logs` (registro de contactos).
--   - Tabla `mentor_evaluations` (evaluaciones consultivas, Art. 25.4).
--
-- FUERA DE ALCANCE (depende de v3.0 aprobada):
--   - "Miembro en Prueba" formal (Art. 15 bis).
--   - Programa de integración de 7 días (Art. 24).
--   - Ponderación de aporte (Anexo II §F).
--
-- IDEMPOTENTE: Sí (usa IF NOT EXISTS en todo).
-- TRANSACCIONAL: Sí (BEGIN/COMMIT — todo o nada).
-- ROLLBACK: Ver al final del archivo.
-- FECHA: 2026-10-10
-- AUTOR: Comando C4ISR
-- REF: docs/adr/ADR-010-seccion-veteranos.md
-- ============================================================================

-- ============================================================================
-- ⚠️  CRÍTICO POST 2026-10-30:
--   Supabase deja de otorgar GRANT automático a tablas nuevas en schema
--   `public` para `anon`, `authenticated`, `service_role`.
--   SIN el GRANT explícito → el backend (service_role) recibe 42501.
--   Este script incluye GRANT explícito para las 3 tablas.
-- ============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLA MENTORSHIPS (relación mentor ↔ pupilo)
-- ─────────────────────────────────────────────────────────────────────────────
-- Diseño:
--   - mentor_id FK → users.id  (el VETERANO mentor).
--   - mentee_id FK → users.id  (el miembro pupilo).
--   - status TEXT: ACTIVE | ENDED | REASSIGNED.
--   - ended_at / ended_reason: trazabilidad del cierre.
--   - created_by FK → users.id: quién asignó (auto o admin).
--
-- Índice único parcial: garantiza que un pupilo tenga 1 solo mentor ACTIVE
-- (defensa en BD contra race conditions de auto-asignación).
--
-- Nota: se usa UUID (no INTEGER) por consistencia con las tablas modernas
-- (password_resets, recovery_codes, user_settings, event_participations).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mentorships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    mentee_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ NULL,
    status          TEXT NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'ENDED', 'REASSIGNED')),
    ended_reason    TEXT NULL,
    created_by      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Invariante: un mentor no puede ser su propio pupilo.
    CONSTRAINT mentorships_no_self_mentor CHECK (mentor_id <> mentee_id),

    -- Invariante: si status != ACTIVE, debe tener ended_at.
    CONSTRAINT mentorships_ended_consistency CHECK (
        (status = 'ACTIVE' AND ended_at IS NULL)
        OR
        (status IN ('ENDED', 'REASSIGNED') AND ended_at IS NOT NULL)
    )
);

-- Índice único parcial: solo 1 mentor ACTIVE por pupilo.
-- Es la garantía de BD contra race conditions de auto-asignación.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mentorships_one_active_per_mentee
    ON public.mentorships(mentee_id)
    WHERE status = 'ACTIVE';

-- Índice para "mis pupilos" del Veterano (query más frecuente).
CREATE INDEX IF NOT EXISTS idx_mentorships_mentor_status
    ON public.mentorships(mentor_id, status);

-- Índice para historial (ended_at DESC).
CREATE INDEX IF NOT EXISTS idx_mentorships_mentee_started
    ON public.mentorships(mentee_id, started_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABLA MENTORSHIP_LOGS (registro de contactos)
-- ─────────────────────────────────────────────────────────────────────────────
-- Diseño:
--   - mentorship_id FK → mentorships.id (CASCADE: si se borra la mentoría,
--     se borran sus logs).
--   - note TEXT: descripción del contacto.
--   - created_by FK → users.id: quién registró (el mentor).
--
-- No hay UPDATE: los logs son inmutables (append-only).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mentorship_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorship_id   UUID NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
    note            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,

    CONSTRAINT mentorship_logs_note_not_empty CHECK (length(trim(note)) > 0)
);

-- Índice para historial de una mentoría (query: logs de X mentoría).
CREATE INDEX IF NOT EXISTS idx_mentorship_logs_mentorship_created
    ON public.mentorship_logs(mentorship_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TABLA MENTOR_EVALUATIONS (evaluaciones consultivas)
-- ─────────────────────────────────────────────────────────────────────────────
-- Diseño:
--   - criteria JSONB: criterios de Art. 25.4 (participación, cooperación,
--     conducta, integración, disposición).
--   - summary TEXT: resumen fundamentado del mentor.
--   - created_by FK → users.id: el mentor que evalúa.
--
-- Las evaluaciones son consultivas, no vinculantes (Art. 26 v3.0).
-- El esquema de `criteria` queda abierto (JSONB) para no atarse a v3.0.
--
-- Esquema sugerido de `criteria` (no enforced por BD, sí por API):
--   {
--     "participacion":  "ALTA" | "MEDIA" | "BAJA",
--     "cooperacion":    "ALTA" | "MEDIA" | "BAJA",
--     "conducta":       "ALTA" | "MEDIA" | "BAJA",
--     "integracion":    "ALTA" | "MEDIA" | "BAJA",
--     "disposicion":    "ALTA" | "MEDIA" | "BAJA"
--   }
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mentor_evaluations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentorship_id   UUID NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
    criteria        JSONB NOT NULL,
    summary         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by      UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,

    CONSTRAINT mentor_evaluations_summary_not_empty
        CHECK (length(trim(summary)) > 0),
    CONSTRAINT mentor_evaluations_criteria_is_object
        CHECK (jsonb_typeof(criteria) = 'object')
);

-- Índice para historial de evaluaciones de una mentoría.
CREATE INDEX IF NOT EXISTS idx_mentor_evaluations_mentorship_created
    ON public.mentor_evaluations(mentorship_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
-- Bloquea todo acceso anónimo/autenticado estándar. Solo el backend con
-- service_role (que bypasea RLS) puede leer/escribir.
-- Mismo patrón que presence, password_resets, recovery_codes y backups.
--
-- IMPORTANTE: service_role bypasea RLS pero NO bypasea GRANT (ver §5).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no_public_access" ON public.mentorships;
CREATE POLICY "no_public_access" ON public.mentorships
    FOR ALL USING (false) WITH CHECK (false);

ALTER TABLE public.mentorship_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no_public_access" ON public.mentorship_logs;
CREATE POLICY "no_public_access" ON public.mentorship_logs
    FOR ALL USING (false) WITH CHECK (false);

ALTER TABLE public.mentor_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no_public_access" ON public.mentor_evaluations;
CREATE POLICY "no_public_access" ON public.mentor_evaluations
    FOR ALL USING (false) WITH CHECK (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. GRANTS EXPLÍCITOS (NUEVO — requerido post 2026-10-30)
-- ─────────────────────────────────────────────────────────────────────────────
-- A partir del 2026-10-30, Supabase deja de otorgar GRANT automático a
-- tablas nuevas del schema `public`. SIN esto, el backend recibe:
--   ERROR: 42501 permission denied for table mentorships
--
-- Estrategia:
--   - REVOKE ALL de anon, authenticated (no deben tocar nada).
--   - REVOKE TRUNCATE, REFERENCES, TRIGGER de anon, authenticated
--     (por si acaso, defensa en profundidad).
--   - GRANT SELECT, INSERT, UPDATE, DELETE a service_role.
--
-- NO se hace GRANT de TRUNCATE a service_role (operación destructiva que
-- no usamos desde el backend).
--
-- Nota: usamos `gen_random_uuid()` (pgcrypto, built-in en Supabase) en lugar
-- de SERIAL, así no hay secuencia que requiera GRANT separado.
-- ─────────────────────────────────────────────────────────────────────────────

-- mentorships
REVOKE ALL ON public.mentorships FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.mentorships FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorships TO service_role;

-- mentorship_logs
REVOKE ALL ON public.mentorship_logs FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.mentorship_logs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorship_logs TO service_role;

-- mentor_evaluations
REVOKE ALL ON public.mentor_evaluations FROM anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.mentor_evaluations FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_evaluations TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. COMENTARIOS
-- ─────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.mentorships IS
    'ADR-010: Relación mentor (VETERANO) ↔ pupilo (miembro). 1 mentor ACTIVE por pupilo (índice único parcial).';

COMMENT ON COLUMN public.mentorships.status IS
    'Estado: ACTIVE (en curso), ENDED (finalizada), REASSIGNED (reasignada a otro mentor).';

COMMENT ON COLUMN public.mentorships.ended_reason IS
    'Motivo del cierre. Obligatorio si status IN (ENDED, REASSIGNED).';

COMMENT ON TABLE public.mentorship_logs IS
    'ADR-010: Registro append-only de contactos del mentor con su pupilo.';

COMMENT ON TABLE public.mentor_evaluations IS
    'ADR-010: Evaluaciones consultivas del mentor (Art. 25.4 v3.0). No vinculantes.';

COMMENT ON COLUMN public.mentor_evaluations.criteria IS
    'JSONB con criterios de Art. 25.4: participacion, cooperacion, conducta, integracion, disposicion.';

COMMIT;

-- ============================================================================
-- 7. VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================
-- Estos SELECT van FUERA de la transacción (son solo lectura).
-- Ejecutalos uno por uno después del COMMIT y pegame la salida.
-- ============================================================================

-- 7.1 — Columnas de las 3 tablas
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('mentorships', 'mentorship_logs', 'mentor_evaluations')
ORDER BY table_name, ordinal_position;

-- 7.2 — RLS habilitado en las 3 (CRÍTICO)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('mentorships', 'mentorship_logs', 'mentor_evaluations')
ORDER BY tablename;
-- Esperado: rowsecurity = true en las 3.

-- 7.3 — Políticas no_public_access creadas
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('mentorships', 'mentorship_logs', 'mentor_evaluations')
ORDER BY tablename;
-- Esperado: 3 filas, cada una con policyname = 'no_public_access',
-- qual = 'false', with_check = 'false'.

-- 7.4 — GRANTs efectivos (EL MÁS CRÍTICO post 2026-10-30)
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('mentorships', 'mentorship_logs', 'mentor_evaluations')
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;
-- Esperado:
--   - anon: sin filas.
--   - authenticated: sin filas.
--   - service_role: SELECT, INSERT, UPDATE, DELETE por cada tabla (12 filas).

-- 7.5 — Índice único parcial (1 mentor ACTIVE por pupilo)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'mentorships'
  AND indexname = 'idx_mentorships_one_active_per_mentee';
-- Esperado: indexdef contiene 'UNIQUE' y 'WHERE (status = ''ACTIVE'')'.

-- 7.6 — Constraints de integridad
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.mentorships'::regclass
ORDER BY conname;
-- Esperado: mentorships_no_self_mentor, mentorships_ended_consistency,
-- mentorships_status_check, mentorships_pkey, FKs.

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. SMOKE TEST FUNCIONAL (opcional — solo si hay users disponibles)
-- ─────────────────────────────────────────────────────────────────────────────
-- Descomentar SOLO para prueba manual. NO ejecutar en producción sin querer.
--
-- INSERT INTO public.mentorships (mentor_id, mentee_id, created_by)
-- VALUES (
--     '<uuid-de-un-veterano>',
--     '<uuid-de-un-miembro>',
--     '<uuid-del-admin>'
-- );
--
-- -- Debe fallar (violación de índice único parcial):
-- INSERT INTO public.mentorships (mentor_id, mentee_id, created_by)
-- VALUES (
--     '<uuid-de-otro-veterano>',
--     '<uuid-del-mismo-miembro>',  -- ya tiene mentor ACTIVE
--     '<uuid-del-admin>'
-- );
-- -- Esperado: ERROR: duplicate key value violates unique constraint
-- --           "idx_mentorships_one_active_per_mentee"
--
-- -- Cleanup:
-- DELETE FROM public.mentorships WHERE mentee_id = '<uuid-de-un-miembro>';

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (por si hay que revertir TODO)
-- ─────────────────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.mentor_evaluations CASCADE;
-- DROP TABLE IF EXISTS public.mentorship_logs CASCADE;
-- DROP TABLE IF EXISTS public.mentorships CASCADE;
-- ============================================================================