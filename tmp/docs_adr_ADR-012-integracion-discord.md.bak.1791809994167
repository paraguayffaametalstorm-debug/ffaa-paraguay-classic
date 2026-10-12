# ADR-012 — Integración con Discord

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
| `#torneo-general` | Coordinación general, anuncios, horarios |
| `#torneo-draft` | Sala de draft por equipo (bans + picks) |
| `#torneo-resultados` | Publicación de resultados |
| `#torneo-soporte` | Consultas y resolución de incidencias |

La **F1.6** del Plan de Trabajo de Torneos requiere integrar la app con Discord
para automatizar notificaciones y (opcionalmente) exponer comandos de consulta.

**Restricciones técnicas reales:**

1. **Render free duerme la app** tras inactividad (HALL-072). Un bot con
   Gateway WebSocket requiere un proceso persistente 24/7 → no viable.
2. **El backend no mantiene WebSocket abierto.** Los health checks de Render
   asumen request/response puro.
3. **La app ya tiene un scheduler con `cron.schedule`** (eventScheduler.js v2.0).
   Ese es el patrón que funciona en Render.

**Problema:** definir la arquitectura de integración sin violar las
restricciones técnicas ni duplicar infraestructura.

---

## 2. Decisión

Se implementa la integración en **dos fases desacopladas**:

### F1.6a–F1.6c — Webhooks outbound (primero, más simple, más valor)

- El backend hace `POST` a URLs de webhooks de Discord cuando ocurren
  eventos del sistema de torneos.
- Los webhooks se almacenan en la tabla `discord_webhooks` con RLS
  `no_public_access` y `GRANT` explícito a `service_role`.
- El envío es **fire-and-forget** con timeout de 3s y logs de error
  (patrón `safeAudit`).
- **Feature flag:** si `DISCORD_ENABLED !== 'true'`, el módulo entero se
  saltea silenciosamente (sin romper el arranque).

### F1.6d–F1.6f — HTTP Interactions (después, para slash commands)

- Endpoint `POST /api/discord/interactions` recibe eventos de Discord
  (firma Ed25519 en headers `X-Signature-Ed25519` + `X-Signature-Timestamp`).
- **NO** usa Gateway WebSocket.
- **NO** usa `requireAuth` (Discord no manda JWT). Firma propia.
- Comandos: `/torneo status`, `/torneo bracket [id]`, `/torneo equipos [id]`,
  `/torneo draft [id]`.

---

## 3. Consecuencias

### Positivas

- **Compatible con Render free.** Cero procesos persistentes.
- **Aditivo y desactivable.** Si Discord falla, el flujo del torneo sigue.
- **Multi-canal sin tocar código.** La tabla permite configurar
  `#torneo-resultados` para resultados y `#torneo-general` para todo lo demás.
- **Consistente con el patrón existente.** `safeAudit` ya es fire-and-forget.
- **Cierra BL-030** para `discord_webhooks` (GRANTs explícitos).
- **Auditoría completa.** Cada notificación exitosa/fallida se loguea.

### Negativas

- **1 tabla más** (`discord_webhooks`). Mitigación: 9 columnas, sin lógica.
- **1 archivo de config más** (`src/config/discord.js`). Mitigación:
  consistente con `env.js`.
- **Rate limit de Discord:** 30 requests/min por webhook. Para F1 (4-8 equipos,
  ~20-30 eventos por torneo) es holgado. Mitigación futura: cola de reintentos.

### Neutras

- **No requiere token de bot para webhooks.** Solo para HTTP Interactions.
- **Compatible con la estructura del Anexo III §24.2.**

---

## 4. Alternativas consideradas

### Alternativa A — Gateway WebSocket (bot tradicional)

Un proceso Node corriendo `discord.js` con conexión persistente a Discord.

**Rechazada:**
- Render free duerme la app → la conexión WS se cae.
- Requiere worker dedicado (`render.yaml` con dos servicios).
- Heartbeats, reconexión, sharding: mini-proyecto.
- Contradice HALL-072 (lección aprendida: cron externo, no proceso persistente).

### Alternativa B — Solo HTTP Interactions, sin webhooks

Saltar los webhooks y exponer todo por `/api/discord/interactions`.

**Rechazada:**
- Los webhooks cubren 5 de los 5 casos de uso pedidos (crear torneo,
  registrar equipo, registrar resultado, completar draft, cambiar estado).
- Las HTTP Interactions solo cubren los 4 comandos de consulta.
- Implementar HTTP Interactions primero bloquearía el valor de las
  notificaciones automáticas.

### Alternativa C — Módulo sin feature flag

Activar Discord siempre que exista `DISCORD_WEBHOOK_URL`.

**Rechazada:**
- Si la URL se filtra por error o queda obsoleta, el backend intentaría
  notificar en cada request.
- El feature flag explícito (`DISCORD_ENABLED=true`) es consistente con
  `USE_ATOMIC_RESET` y `USE_ATOMIC_EVENT_STATUS` de `env.js`.

### Alternativa D — Webhook URL hardcodeada en código

Poner la URL del canal `#torneo-general` directamente en el código.

**Rechazada:**
- Las URLs de webhook son secretos (cualquiera con la URL puede postear).
- Rotar la URL requiere redeploy.
- No permite múltiples canales (`#torneo-resultados`, `#torneo-draft`).
- Contradice el principio de configuración en env/tabla, no en código.

---

## 5. Impacto en el sistema

### Nuevas tablas (1)

| Tabla | Filas estimadas F1 | Uso |
|---|---|---|
| `discord_webhooks` | 2-4 | URLs por (channel_name, event_type) |

### Nuevos archivos

| Archivo | Propósito |
|---|---|
| `sql/046_discord_webhooks.sql` | Migración SQL |
| `src/config/discord.js` | Config + validación |
| `src/utils/discordSchemas.js` | Schemas Zod del payload |
| `src/utils/discordNotifier.js` | Envío de webhooks (F1.6b) |
| `src/middlewares/verifyDiscordSignature.js` | Firma Ed25519 (F1.6d) |
| `src/controllers/discord.controller.js` | Handlers HTTP Interactions (F1.6d) |
| `src/routes/discord.routes.js` | Router (F1.6d) |

### Nuevas variables de entorno (5)

| Var | Ejemplo | Requerida para |
|---|---|---|
| `DISCORD_ENABLED` | `true` | Todo el módulo |
| `DISCORD_BOT_TOKEN` | `MTxxx...` | HTTP Interactions |
| `DISCORD_PUBLIC_KEY` | `a1b2...` (64 hex) | HTTP Interactions |
| `DISCORD_APPLICATION_ID` | `1234567890` | HTTP Interactions |
| `DISCORD_WEBHOOK_URL` | `https://discord.com/api/webhooks/...` | Webhooks (fallback) |

### Endpoints nuevos

- `POST /api/discord/interactions` (F1.6d) — sin `requireAuth`,
  con `verifyDiscordSignature`.
- `GET /api/admin/discord/webhooks` (F1.6c) — ADMIN/OWNER.
- `POST /api/admin/discord/webhooks` (F1.6c) — ADMIN/OWNER.

### Hooks en código existente

En `src/controllers/tournaments.controller.js`, 6 llamadas a `safeNotify()`:

| Handler | Evento |
|---|---|
| `createTournament` | `TOURNAMENT_CREATED` |
| `registerTeam` | `TOURNAMENT_TEAM_REGISTERED` |
| `registerMatchResult` | `TOURNAMENT_MATCH_RESULT_RECORDED` |
| `registerDraftAction` | `TOURNAMENT_DRAFT_ACTION_RECORDED` |
| `updateTournamentStatus` | `TOURNAMENT_STATUS_CHANGED` |
| `changeModerator` | `TOURNAMENT_MODERATOR_CHANGED` |

---

## 6. Referencias

- **Anexo III:** `docs/normativa/ANEXO-III-torneos.md` §24
- **ADR-011:** `docs/adr/ADR-011-sistema-torneos.md`
- **RFC-002:** `docs/rfc/RFC-002-sistema-torneos.md`
- **HALL-072:** `docs/incidentes/HALL-072-scheduler-render.md`
- **BL-030:** Auditar GRANTs explícitos en tablas `public/`
- **Discord docs:** https://discord.com/developers/docs/interactions/receiving-and-responding

---

## 7. Estado

**✅ Accepted — 2026-10-12.**

La F1.6 se ejecuta en dos sub-fases:

- **F1.6a–F1.6c:** webhooks outbound (este ADR).
- **F1.6d–F1.6f:** HTTP Interactions (futuro prompt de continuación).

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**ADR-012 · Integración con Discord · 2026-10-12**
