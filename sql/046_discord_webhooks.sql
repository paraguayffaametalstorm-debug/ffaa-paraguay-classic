-- sql/046_discord_webhooks.sql
-- ============================================================================
-- F1.6 — Integración con Discord (webhooks outbound).
-- ============================================================================
-- Propósito:
--   Almacenar las URLs de los webhooks de Discord a los que se notificarán
--   los eventos del sistema de torneos (creación, registro, resultado,
--   draft, cambio de estado).
--
-- Referencias:
--   - docs/adr/ADR-012-integracion-discord.md
--   - docs/planning/PLAN_TRABAJO_TORNEOS.md §F1.6
--   - docs/normativa/ANEXO-III-torneos.md §24 (canales oficiales)
--   - BL-030 (GRANTs explícitos post 2026-10-30)
--
-- Idempotente: usa IF NOT EXISTS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.discord_webhooks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name    TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  webhook_url     TEXT NOT NULL,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un canal por (channel_name, event_type). No puede haber dos webhooks
-- activos para el mismo tipo de evento en el mismo canal.
CREATE UNIQUE INDEX IF NOT EXISTS idx_discord_webhooks_channel_event_active
  ON public.discord_webhooks (channel_name, event_type)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_discord_webhooks_event_type
  ON public.discord_webhooks (event_type)
  WHERE is_active = TRUE;

-- GRANTs explícitos (BL-030, Supabase post 2026-10-30)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discord_webhooks TO service_role;

-- RLS
ALTER TABLE public.discord_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS no_public_access ON public.discord_webhooks;
CREATE POLICY no_public_access ON public.discord_webhooks
  FOR ALL TO public
  USING (false)
  WITH CHECK (false);

-- Comentarios
COMMENT ON TABLE  public.discord_webhooks IS
  'F1.6 — URLs de webhooks de Discord para notificaciones del sistema de torneos. Solo service_role accede.';
COMMENT ON COLUMN public.discord_webhooks.channel_name IS
  'Nombre del canal de Discord (informativo). Ej: torneo-general, torneo-resultados.';
COMMENT ON COLUMN public.discord_webhooks.event_type IS
  'Tipo de evento que dispara el webhook. Ej: TOURNAMENT_CREATED, TOURNAMENT_MATCH_RESULT_RECORDED, * (comodín).';
COMMENT ON COLUMN public.discord_webhooks.webhook_url IS
  'URL del webhook de Discord (https://discord.com/api/webhooks/<id>/<token>).';
