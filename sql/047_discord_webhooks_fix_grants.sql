-- sql/047_discord_webhooks_fix_grants.sql
-- ============================================================================
-- F1.6b — Fix de GRANTs por default de Supabase en discord_webhooks.
-- ============================================================================
-- Problema detectado 2026-10-12:
--   Al crear discord_webhooks (046), Supabase otorgó ALL PRIVILEGES
--   automáticamente a anon, authenticated, postgres y service_role
--   (comportamiento por default del rol postgres en Postgres 15+ vía
--   ALTER DEFAULT PRIVILEGES).
--
--   El GRANT SELECT/INSERT/UPDATE/DELETE TO service_role de 046 fue
--   ADITIVO: no revocó los privilegios otorgados a anon/authenticated.
--
-- Solución:
--   REVOKE ALL de anon, authenticated y service_role; RE-GRANT solo
--   SELECT/INSERT/UPDATE/DELETE a service_role. postgres conserva su
--   rol de owner (imposible revocar sin DROP TABLE).
--
-- Referencias:
--   - BL-030 (auditar GRANTs explícitos post 2026-10-30)
--   - docs/adr/ADR-012-integracion-discord.md §D5.bis
--
-- Idempotente: ejecutar N veces deja el mismo estado.
-- ============================================================================

REVOKE ALL ON public.discord_webhooks FROM anon;
REVOKE ALL ON public.discord_webhooks FROM authenticated;
REVOKE ALL ON public.discord_webhooks FROM service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discord_webhooks TO service_role;

COMMENT ON TABLE public.discord_webhooks IS
  'F1.6 — URLs de webhooks de Discord. Solo service_role (backend). RLS no_public_access. Ver ADR-012.';
