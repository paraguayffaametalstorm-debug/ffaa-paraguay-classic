#!/usr/bin/env node
/**
 * ============================================================================
 * F1.6a — Setup base de la integración con Discord
 * ============================================================================
 * Este script crea los archivos del primer commit de F1.6:
 *
 *   1. sql/046_discord_webhooks.sql
 *   2. src/config/discord.js
 *   3. src/utils/discordSchemas.js
 *   4. docs/adr/ADR-012-integracion-discord.md
 *
 * Y actualiza:
 *
 *   5. .env.example (agrega 5 vars con default vacío)
 *
 * Uso:
 *   node scripts/f1-6a-setup-discord.cjs --dry-run   # muestra los cambios
 *   node scripts/f1-6a-setup-discord.cjs --apply     # aplica los cambios
 *
 * Es idempotente: si los archivos ya existen y su contenido coincide,
 * no los reescribe. Si difieren, hace backup y reescribe.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ─── CLI args ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const APPLY   = args.includes('--apply');

if (!DRY_RUN && !APPLY) {
  console.error('❌ Debes pasar --dry-run o --apply');
  console.error('   node scripts/f1-6a-setup-discord.cjs --dry-run');
  console.error('   node scripts/f1-6a-setup-discord.cjs --apply');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────
function log(msg) { console.log(msg); }
function ok(msg)  { console.log(`  ✅ ${msg}`); }
function skip(msg){ console.log(`  ⏭️  ${msg}`); }
function warn(msg){ console.log(`  ⚠️  ${msg}`); }
function fail(msg){ console.error(`  ❌ ${msg}`); }

function writeFile(relPath, content) {
  const abs = path.join(ROOT, relPath);
  const dir = path.dirname(abs);

  if (!fs.existsSync(dir)) {
    if (!DRY_RUN) fs.mkdirSync(dir, { recursive: true });
    ok(`crear directorio ${path.relative(ROOT, dir)}/`);
  }

  const exists = fs.existsSync(abs);
  if (exists) {
    const current = fs.readFileSync(abs, 'utf8');
    if (current === content) {
      skip(`${relPath} (sin cambios)`);
      return;
    }
    warn(`${relPath} existe con contenido distinto — se sobreescribirá`);
    if (!DRY_RUN) {
      const backup = `${abs}.bak.${Date.now()}`;
      fs.copyFileSync(abs, backup);
      ok(`backup: ${path.relative(ROOT, backup)}`);
    }
  }

  if (!DRY_RUN) {
    fs.writeFileSync(abs, content, 'utf8');
  }
  ok(`${exists ? 'actualizado' : 'creado'}: ${relPath}`);
}

// ─── Contenidos ──────────────────────────────────────────────────

const SQL_046 = `-- sql/046_discord_webhooks.sql
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
`;

const CONFIG_DISCORD_JS = `// src/config/discord.js
//
// ADR-012 — Configuración de la integración con Discord (F1.6).
//
// Carga y valida las variables de entorno. Si DISCORD_ENABLED !== 'true',
// todo el módulo se considera desactivado y los helpers devuelven
// no-op / { enabled: false }.
//
// Patrón consistente con env.js:
//   - Defaults seguros (cadena vacía).
//   - Feature flag explícito.
//   - No bloquear el arranque si falta algo (el notifier loguea y sigue).
//
import { ENV } from './env.js';

export const DISCORD = {
  /**
   * Feature flag global. Si es false, TODO el módulo Discord se saltea.
   * Configurar en Render: DISCORD_ENABLED=true
   */
  enabled: ENV.DISCORD_ENABLED === true,

  /**
   * Token del bot. Necesario para HTTP Interactions (firma Ed25519).
   * No necesario para webhooks outbound.
   */
  botToken: ENV.DISCORD_BOT_TOKEN || '',

  /**
   * Public key del bot (hex de 64 chars). Necesaria para verificar
   * la firma Ed25519 de las HTTP Interactions.
   * Se obtiene en https://discord.com/developers/applications/<app_id>/general
   */
  publicKey: ENV.DISCORD_PUBLIC_KEY || '',

  /**
   * Application ID del bot. Necesaria para registrar comandos slash.
   */
  applicationId: ENV.DISCORD_APPLICATION_ID || '',

  /**
   * URL del webhook principal (canal #torneo-general).
   * Fallback si la tabla discord_webhooks no tiene un registro para el evento.
   */
  webhookUrl: ENV.DISCORD_WEBHOOK_URL || '',

  /**
   * Timeout para las llamadas a la API de Discord (ms).
   * Discord recomienda < 3000ms para no bloquear el request original.
   */
  timeoutMs: Number(ENV.DISCORD_TIMEOUT_MS || 3000),

  /**
   * Tipos de eventos soportados (para validar en el notifier y en la UI admin).
   */
  eventTypes: [
    'TOURNAMENT_CREATED',
    'TOURNAMENT_TEAM_REGISTERED',
    'TOURNAMENT_MATCH_RESULT_RECORDED',
    'TOURNAMENT_DRAFT_ACTION_RECORDED',
    'TOURNAMENT_STATUS_CHANGED',
    'TOURNAMENT_MODERATOR_CHANGED'
  ]
};

/**
 * Verifica si Discord está completamente configurado para webhooks.
 * @returns {boolean}
 */
export function isDiscordWebhooksReady() {
  return DISCORD.enabled && Boolean(DISCORD.webhookUrl);
}

/**
 * Verifica si Discord está completamente configurado para HTTP Interactions.
 * @returns {boolean}
 */
export function isDiscordInteractionsReady() {
  return (
    DISCORD.enabled &&
    Boolean(DISCORD.botToken) &&
    Boolean(DISCORD.publicKey) &&
    Boolean(DISCORD.applicationId)
  );
}

export default DISCORD;
`;

const DISCORD_SCHEMAS_JS = `// src/utils/discordSchemas.js
//
// ADR-012 — Schemas Zod para el payload de cada evento de Discord (F1.6).
//
// Estos schemas validan los datos que el notifier envía a la API de Discord
// (embeds). NO son los mismos que los schemas de la API REST (esos están
// en src/utils/schemas.js).
//
// Patrón: Zod 4.x, mensajes en español, .superRefine para reglas de negocio.
//
import { z } from 'zod';

// ─── Sub-schema: Embed de Discord ────────────────────────────────
// Referencia: https://discord.com/developers/docs/resources/channel#embed-object

const DiscordEmbedFieldSchema = z.object({
  name: z.string().trim().min(1).max(256),
  value: z.string().trim().min(1).max(1024),
  inline: z.boolean().optional().default(false)
});

const DiscordEmbedFooterSchema = z.object({
  text: z.string().trim().min(1).max(2048),
  icon_url: z.string().url().optional()
});

export const DiscordEmbedSchema = z.object({
  title: z.string().trim().min(1).max(256).optional(),
  description: z.string().trim().min(1).max(4096).optional(),
  url: z.string().url().optional(),
  color: z.number().int().min(0).max(0xFFFFFF).optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
  footer: DiscordEmbedFooterSchema.optional(),
  fields: z.array(DiscordEmbedFieldSchema).max(25).optional()
});

// ─── Schema raíz del payload ─────────────────────────────────────
// Acepta tanto { content } como { embeds } como ambos.

export const DiscordWebhookPayloadSchema = z.object({
  content: z.string().trim().max(2000).optional(),
  username: z.string().trim().max(80).optional(),
  avatar_url: z.string().url().optional(),
  embeds: z.array(DiscordEmbedSchema).max(10).optional(),
  // Desactiva menciones: nunca queremos pingear @everyone por accidente.
  allowed_mentions: z.object({
    parse: z.array(z.enum(['users', 'roles', 'everyone'])).optional().default([])
  }).optional().default({ parse: [] })
}).superRefine((data, ctx) => {
  const hasContent = Boolean(data.content && data.content.length > 0);
  const hasEmbeds  = Boolean(data.embeds && data.embeds.length > 0);
  if (!hasContent && !hasEmbeds) {
    ctx.addIssue({
      code: 'custom',
      path: ['content'],
      message: 'El payload debe tener al menos content o embeds'
    });
  }
});

// ─── Constantes de color ─────────────────────────────────────────
// Inspirados en la paleta institucional (--pry-red, --pry-blue, gold).

export const DISCORD_COLORS = Object.freeze({
  GOLD:   0xD4AF37, // #d4af37 — Torneo creado / celebración
  BLUE:   0x38BDF8, // #38bdf8 — Equipo registrado / info
  GREEN:  0x10B981, // #10b981 — Resultado / éxito
  RED:    0xEF4444, // #ef4444 — Cancelación / error
  YELLOW: 0xF59E0B  // #f59e0b — Draft / advertencia
});

// ─── Sub-schemas de cada evento ──────────────────────────────────

/**
 * TOURNAMENT_CREATED — cuando se crea un torneo.
 * Campos obligatorios: tournament_id (uuid), name, format, scope, starts_at.
 */
export const TournamentCreatedDataSchema = z.object({
  tournament_id: z.string().uuid('tournament_id debe ser UUID'),
  name: z.string().trim().min(3).max(120),
  format: z.string().trim().min(2).max(40),
  scope: z.string().trim().min(2).max(10),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }).optional().nullable(),
  min_teams: z.number().int().min(2).max(32),
  max_teams: z.number().int().min(2).max(32),
  moderator_id: z.string().uuid().optional().nullable(),
  created_by_nick: z.string().trim().max(80).optional().nullable()
});

/**
 * TOURNAMENT_TEAM_REGISTERED — cuando se registra un equipo.
 */
export const TournamentTeamRegisteredDataSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_name: z.string().trim().min(3).max(120),
  team_id: z.string().uuid(),
  team_name: z.string().trim().min(2).max(40),
  captain_user_id: z.string().uuid(),
  captain_nick: z.string().trim().max(80).optional().nullable(),
  roster_size: z.number().int().min(5).max(6)
});

/**
 * TOURNAMENT_MATCH_RESULT_RECORDED — cuando se registra un resultado.
 */
export const TournamentMatchResultDataSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_name: z.string().trim().min(3).max(120),
  match_id: z.string().uuid(),
  phase: z.string().trim().max(20).optional().nullable(),
  best_of: z.union([z.literal(3), z.literal(5)]),
  score_a: z.number().int().min(0).max(5),
  score_b: z.number().int().min(0).max(5),
  winner_id: z.string().uuid().optional().nullable(),
  winner_name: z.string().trim().max(80).optional().nullable(),
  recorded_by_nick: z.string().trim().max(80).optional().nullable()
});

/**
 * TOURNAMENT_DRAFT_ACTION_RECORDED — cuando se registra una acción de draft.
 */
export const TournamentDraftActionDataSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_name: z.string().trim().min(3).max(120),
  match_id: z.string().uuid(),
  game_number: z.number().int().min(1).max(5),
  order_index: z.number().int().min(1),
  action: z.enum(['BAN', 'PICK']),
  aircraft_id: z.string().trim().min(1).max(50),
  aircraft_name: z.string().trim().max(120).optional().nullable(),
  team_id: z.string().uuid(),
  team_label: z.enum(['A', 'B']).optional(),
  recorded_by_nick: z.string().trim().max(80).optional().nullable()
});

/**
 * TOURNAMENT_STATUS_CHANGED — cuando cambia el estado del torneo.
 */
export const TournamentStatusChangedDataSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_name: z.string().trim().min(3).max(120),
  from_status: z.enum(['DRAFT', 'REGISTRATION', 'ONGOING', 'FINISHED', 'CANCELLED']),
  to_status:   z.enum(['DRAFT', 'REGISTRATION', 'ONGOING', 'FINISHED', 'CANCELLED']),
  reason: z.string().trim().max(500).optional().nullable(),
  changed_by_nick: z.string().trim().max(80).optional().nullable()
});

/**
 * TOURNAMENT_MODERATOR_CHANGED — cuando se reasigna el moderador.
 */
export const TournamentModeratorChangedDataSchema = z.object({
  tournament_id: z.string().uuid(),
  tournament_name: z.string().trim().min(3).max(120),
  previous_moderator_id: z.string().uuid().optional().nullable(),
  previous_moderator_nick: z.string().trim().max(80).optional().nullable(),
  new_moderator_id: z.string().uuid(),
  new_moderator_nick: z.string().trim().max(80).optional().nullable(),
  reason: z.string().trim().min(5).max(500),
  changed_by_nick: z.string().trim().max(80).optional().nullable()
});

// ─── Mapa event_type → schema ────────────────────────────────────

export const DISCORD_EVENT_SCHEMAS = Object.freeze({
  TOURNAMENT_CREATED:                  TournamentCreatedDataSchema,
  TOURNAMENT_TEAM_REGISTERED:          TournamentTeamRegisteredDataSchema,
  TOURNAMENT_MATCH_RESULT_RECORDED:    TournamentMatchResultDataSchema,
  TOURNAMENT_DRAFT_ACTION_RECORDED:    TournamentDraftActionDataSchema,
  TOURNAMENT_STATUS_CHANGED:           TournamentStatusChangedDataSchema,
  TOURNAMENT_MODERATOR_CHANGED:        TournamentModeratorChangedDataSchema
});

/**
 * Valida los datos de un evento específico contra su schema.
 * @param {string} eventType
 * @param {object} data
 * @returns {{ ok: true, data: object } | { ok: false, error: object }}
 */
export function validateDiscordEventData(eventType, data) {
  const schema = DISCORD_EVENT_SCHEMAS[eventType];
  if (!schema) {
    return {
      ok: false,
      error: {
        code: 'UNKNOWN_EVENT_TYPE',
        message: \`event_type desconocido: \${eventType}\`,
        valid: Object.keys(DISCORD_EVENT_SCHEMAS)
      }
    };
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos de evento Discord inválidos',
        issues: parsed.error.issues.map(i => ({
          path: i.path,
          message: i.message
        }))
      }
    };
  }
  return { ok: true, data: parsed.data };
}
`;

const ADR_012 = `# ADR-012 — Integración con Discord

> **ID:** ADR-012 · **Estado:** ✅ Accepted
> **Fecha:** 2026-10-12
> **Decisores:** OWNER + Comando C4ISR
> **Relacionado con:** RFC-002, Anexo III, ADR-011, HALL-072

---

## 1. Contexto

El **Anexo III §24** formaliza los canales oficiales del torneo:

- **Discord del escuadrón** — canal principal de coordinación, comunicación y draft.
- **Aplicación de control** — fuente válida para registros, brackets y resultados.

Estructura mínima requerida:

| Canal | Propósito |
|---|---|
| \`#torneo-general\` | Coordinación general, anuncios, horarios |
| \`#torneo-draft\` | Sala de draft por equipo (bans + picks) |
| \`#torneo-resultados\` | Publicación de resultados |
| \`#torneo-soporte\` | Consultas y resolución de incidencias |

La **F1.6** del Plan de Trabajo de Torneos requiere integrar la app con Discord
para automatizar notificaciones y (opcionalmente) exponer comandos de consulta.

**Restricciones técnicas reales:**

1. **Render free duerme la app** tras inactividad (HALL-072). Un bot con
   Gateway WebSocket requiere un proceso persistente 24/7 → no viable.
2. **El backend no mantiene WebSocket abierto.** Los health checks de Render
   asumen request/response puro.
3. **La app ya tiene un scheduler con \`cron.schedule\`** (eventScheduler.js v2.0).
   Ese es el patrón que funciona en Render.

**Problema:** definir la arquitectura de integración sin violar las
restricciones técnicas ni duplicar infraestructura.

---

## 2. Decisión

Se implementa la integración en **dos fases desacopladas**:

### F1.6a–F1.6c — Webhooks outbound (primero, más simple, más valor)

- El backend hace \`POST\` a URLs de webhooks de Discord cuando ocurren
  eventos del sistema de torneos.
- Los webhooks se almacenan en la tabla \`discord_webhooks\` con RLS
  \`no_public_access\` y \`GRANT\` explícito a \`service_role\`.
- El envío es **fire-and-forget** con timeout de 3s y logs de error
  (patrón \`safeAudit\`).
- **Feature flag:** si \`DISCORD_ENABLED !== 'true'\`, el módulo entero se
  saltea silenciosamente (sin romper el arranque).

### F1.6d–F1.6f — HTTP Interactions (después, para slash commands)

- Endpoint \`POST /api/discord/interactions\` recibe eventos de Discord
  (firma Ed25519 en headers \`X-Signature-Ed25519\` + \`X-Signature-Timestamp\`).
- **NO** usa Gateway WebSocket.
- **NO** usa \`requireAuth\` (Discord no manda JWT). Firma propia.
- Comandos: \`/torneo status\`, \`/torneo bracket [id]\`, \`/torneo equipos [id]\`,
  \`/torneo draft [id]\`.

---

## 3. Consecuencias

### Positivas

- **Compatible con Render free.** Cero procesos persistentes.
- **Aditivo y desactivable.** Si Discord falla, el flujo del torneo sigue.
- **Multi-canal sin tocar código.** La tabla permite configurar
  \`#torneo-resultados\` para resultados y \`#torneo-general\` para todo lo demás.
- **Consistente con el patrón existente.** \`safeAudit\` ya es fire-and-forget.
- **Cierra BL-030** para \`discord_webhooks\` (GRANTs explícitos).
- **Auditoría completa.** Cada notificación exitosa/fallida se loguea.

### Negativas

- **1 tabla más** (\`discord_webhooks\`). Mitigación: 9 columnas, sin lógica.
- **1 archivo de config más** (\`src/config/discord.js\`). Mitigación:
  consistente con \`env.js\`.
- **Rate limit de Discord:** 30 requests/min por webhook. Para F1 (4-8 equipos,
  ~20-30 eventos por torneo) es holgado. Mitigación futura: cola de reintentos.

### Neutras

- **No requiere token de bot para webhooks.** Solo para HTTP Interactions.
- **Compatible con la estructura del Anexo III §24.2.**

---

## 4. Alternativas consideradas

### Alternativa A — Gateway WebSocket (bot tradicional)

Un proceso Node corriendo \`discord.js\` con conexión persistente a Discord.

**Rechazada:**
- Render free duerme la app → la conexión WS se cae.
- Requiere worker dedicado (\`render.yaml\` con dos servicios).
- Heartbeats, reconexión, sharding: mini-proyecto.
- Contradice HALL-072 (lección aprendida: cron externo, no proceso persistente).

### Alternativa B — Solo HTTP Interactions, sin webhooks

Saltar los webhooks y exponer todo por \`/api/discord/interactions\`.

**Rechazada:**
- Los webhooks cubren 5 de los 5 casos de uso pedidos (crear torneo,
  registrar equipo, registrar resultado, completar draft, cambiar estado).
- Las HTTP Interactions solo cubren los 4 comandos de consulta.
- Implementar HTTP Interactions primero bloquearía el valor de las
  notificaciones automáticas.

### Alternativa C — Módulo sin feature flag

Activar Discord siempre que exista \`DISCORD_WEBHOOK_URL\`.

**Rechazada:**
- Si la URL se filtra por error o queda obsoleta, el backend intentaría
  notificar en cada request.
- El feature flag explícito (\`DISCORD_ENABLED=true\`) es consistente con
  \`USE_ATOMIC_RESET\` y \`USE_ATOMIC_EVENT_STATUS\` de \`env.js\`.

### Alternativa D — Webhook URL hardcodeada en código

Poner la URL del canal \`#torneo-general\` directamente en el código.

**Rechazada:**
- Las URLs de webhook son secretos (cualquiera con la URL puede postear).
- Rotar la URL requiere redeploy.
- No permite múltiples canales (\`#torneo-resultados\`, \`#torneo-draft\`).
- Contradice el principio de configuración en env/tabla, no en código.

---

## 5. Impacto en el sistema

### Nuevas tablas (1)

| Tabla | Filas estimadas F1 | Uso |
|---|---|---|
| \`discord_webhooks\` | 2-4 | URLs por (channel_name, event_type) |

### Nuevos archivos

| Archivo | Propósito |
|---|---|
| \`sql/046_discord_webhooks.sql\` | Migración SQL |
| \`src/config/discord.js\` | Config + validación |
| \`src/utils/discordSchemas.js\` | Schemas Zod del payload |
| \`src/utils/discordNotifier.js\` | Envío de webhooks (F1.6b) |
| \`src/middlewares/verifyDiscordSignature.js\` | Firma Ed25519 (F1.6d) |
| \`src/controllers/discord.controller.js\` | Handlers HTTP Interactions (F1.6d) |
| \`src/routes/discord.routes.js\` | Router (F1.6d) |

### Nuevas variables de entorno (5)

| Var | Ejemplo | Requerida para |
|---|---|---|
| \`DISCORD_ENABLED\` | \`true\` | Todo el módulo |
| \`DISCORD_BOT_TOKEN\` | \`MTxxx...\` | HTTP Interactions |
| \`DISCORD_PUBLIC_KEY\` | \`a1b2...\` (64 hex) | HTTP Interactions |
| \`DISCORD_APPLICATION_ID\` | \`1234567890\` | HTTP Interactions |
| \`DISCORD_WEBHOOK_URL\` | \`https://discord.com/api/webhooks/...\` | Webhooks (fallback) |

### Endpoints nuevos

- \`POST /api/discord/interactions\` (F1.6d) — sin \`requireAuth\`,
  con \`verifyDiscordSignature\`.
- \`GET /api/admin/discord/webhooks\` (F1.6c) — ADMIN/OWNER.
- \`POST /api/admin/discord/webhooks\` (F1.6c) — ADMIN/OWNER.

### Hooks en código existente

En \`src/controllers/tournaments.controller.js\`, 6 llamadas a \`safeNotify()\`:

| Handler | Evento |
|---|---|
| \`createTournament\` | \`TOURNAMENT_CREATED\` |
| \`registerTeam\` | \`TOURNAMENT_TEAM_REGISTERED\` |
| \`registerMatchResult\` | \`TOURNAMENT_MATCH_RESULT_RECORDED\` |
| \`registerDraftAction\` | \`TOURNAMENT_DRAFT_ACTION_RECORDED\` |
| \`updateTournamentStatus\` | \`TOURNAMENT_STATUS_CHANGED\` |
| \`changeModerator\` | \`TOURNAMENT_MODERATOR_CHANGED\` |

---

## 6. Referencias

- **Anexo III:** \`docs/normativa/ANEXO-III-torneos.md\` §24
- **ADR-011:** \`docs/adr/ADR-011-sistema-torneos.md\`
- **RFC-002:** \`docs/rfc/RFC-002-sistema-torneos.md\`
- **HALL-072:** \`docs/incidentes/HALL-072-scheduler-render.md\`
- **BL-030:** Auditar GRANTs explícitos en tablas \`public/\`
- **Discord docs:** https://discord.com/developers/docs/interactions/receiving-and-responding

---

## 7. Estado

**✅ Accepted — 2026-10-12.**

La F1.6 se ejecuta en dos sub-fases:

- **F1.6a–F1.6c:** webhooks outbound (este ADR).
- **F1.6d–F1.6f:** HTTP Interactions (futuro prompt de continuación).

---

**PARAGUAY FFAA \`[PRY]\` — Escuadrón Oficial MetalStorm**
**ADR-012 · Integración con Discord · 2026-10-12**
`;

// ─── .env.example (versión nueva) ────────────────────────────────

const ENV_EXAMPLE_APPEND = `
# ============================================================
# DISCORD INTEGRATION (F1.6 — ADR-012)
# ============================================================
# Feature flag global. Si no es "true", el módulo Discord se
# saltea silenciosamente y NO rompe el arranque.
#
# Doc: docs/adr/ADR-012-integracion-discord.md
# Setup: docs/DISCORD_SETUP.md (F1.6c)
# ============================================================
DISCORD_ENABLED=
DISCORD_BOT_TOKEN=
DISCORD_PUBLIC_KEY=
DISCORD_APPLICATION_ID=
DISCORD_WEBHOOK_URL=
DISCORD_TIMEOUT_MS=3000
`;

// ─── Ejecución ───────────────────────────────────────────────────

log('');
log('══════════════════════════════════════════════════════════');
log(`  F1.6a — Setup base de la integración con Discord`);
log(`  Modo: ${DRY_RUN ? 'DRY-RUN (no escribe nada)' : 'APPLY (escribe)'}`);
log('══════════════════════════════════════════════════════════');
log('');

// 1. sql/046_discord_webhooks.sql
log('📄 sql/046_discord_webhooks.sql');
writeFile('sql/046_discord_webhooks.sql', SQL_046);
log('');

// 2. src/config/discord.js
log('⚙️  src/config/discord.js');
writeFile('src/config/discord.js', CONFIG_DISCORD_JS);
log('');

// 3. src/utils/discordSchemas.js
log('📋 src/utils/discordSchemas.js');
writeFile('src/utils/discordSchemas.js', DISCORD_SCHEMAS_JS);
log('');

// 4. docs/adr/ADR-012-integracion-discord.md
log('📚 docs/adr/ADR-012-integracion-discord.md');
writeFile('docs/adr/ADR-012-integracion-discord.md', ADR_012);
log('');

// 5. .env.example (append)
log('🔐 .env.example');
const envPath = path.join(ROOT, '.env.example');
if (fs.existsSync(envPath)) {
  const current = fs.readFileSync(envPath, 'utf8');
  if (current.includes('DISCORD_ENABLED=')) {
    skip('.env.example ya tiene las vars de Discord');
  } else {
    if (!DRY_RUN) {
      const backup = `${envPath}.bak.${Date.now()}`;
      fs.copyFileSync(envPath, backup);
      ok(`backup: .env.example.bak.${Date.now()}`);
      fs.writeFileSync(envPath, current.trimEnd() + '\n' + ENV_EXAMPLE_APPEND, 'utf8');
    }
    ok(`actualizado: .env.example (+${ENV_EXAMPLE_APPEND.trim().split('\n').length} líneas)`);
  }
} else {
  warn('.env.example no existe — se crea con solo las vars de Discord');
  if (!DRY_RUN) fs.writeFileSync(envPath, ENV_EXAMPLE_APPEND.trimStart(), 'utf8');
  ok('creado: .env.example');
}
log('');

// ─── Resumen ─────────────────────────────────────────────────────
log('══════════════════════════════════════════════════════════');
if (DRY_RUN) {
  log('  ✅ Dry-run completado. No se escribió nada.');
  log('  👉 Para aplicar:');
  log('     node scripts/f1-6a-setup-discord.cjs --apply');
} else {
  log('  ✅ Archivos creados/actualizados.');
  log('');
  log('  📋 Próximos pasos manuales (F1.6a):');
  log('  1. Aplicar sql/046_discord_webhooks.sql en Supabase.');
  log('  2. Verificar: SELECT * FROM information_schema.tables');
  log('                WHERE table_name = \'discord_webhooks\';');
  log('  3. npx vitest run  (esperado: 655 passing / 0 failing)');
  log('  4. git add -A && git commit -m "feat(discord): setup base F1.6a"');
}
log('══════════════════════════════════════════════════════════');
log('');