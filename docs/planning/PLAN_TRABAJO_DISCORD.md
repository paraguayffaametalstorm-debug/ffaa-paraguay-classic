# 🤖 PLAN DE TRABAJO — Integración Discord (post-F1.6f)

> **Plan de mejoras pendientes tras el cierre del HITO F1.6f.**
> **ADR de referencia:** [`docs/adr/ADR-012-integracion-discord.md`](../adr/ADR-012-integracion-discord.md)
> **RFC de referencia:** [`docs/rfc/RFC-002-sistema-torneos.md`](../rfc/RFC-002-sistema-torneos.md)
> **Reglamento:** [`docs/normativa/ANEXO-III-torneos.md`](../normativa/ANEXO-III-torneos.md)
> **Fecha:** 2026-10-12
> **Versión objetivo:** v4.9.5 (patch) o v4.10.0 (minor)
> **Duración estimada:** 4-8 horas
> **Estado:** 📋 Planificado

---

## 1. Contexto

El **HITO F1.6f** quedó cerrado el 2026-10-12. Estado actual:

- App `PARAGUAY-FFAA TORNEOS` creada y configurada en Discord Developer Portal.
- Bot invitado al servidor `METALSTORM — PARAGUAY FFAA`.
- Endpoint `/api/discord/interactions` verificado por Discord (PING 200).
- Slash command `/torneo` registrado **globalmente** con 4 subcomandos:
  - `/torneo status`
  - `/torneo bracket <id>`
  - `/torneo equipos <id>`
  - `/torneo draft <id>`
- Backend con `verifyDiscordSignature` (Ed25519) + `handleInteraction` operativos.
- 711 tests passing / 2 skipped / 0 failing.

**Lo que funciona:** los 4 comandos responden con embeds vía Supabase.

**Lo que falta:** optimizaciones, seguridad y features menores. Este documento las centraliza.

---

## 2. Mejoras categorizadas

### 🟠 Prioridad Media (Should Have)

| ID | Categoría | Título | Estado | Esfuerzo |
|---|---|---|---|---|
| **DISC-001** | 🔧 | Re-registrar comando con descripciones ricas | 💡 Idea | XS (15 min) |
| **DISC-002** | 🔐 | Restringir `dm_permission: false` + `contexts: [0]` | 💡 Idea | XS (15 min) |
| **DISC-003** | 🏗️ | Agregar comando guild-scoped (registro instantáneo) | 💡 Idea | XS (30 min) |
| **DISC-004** | 🔐 | Comando `/torneo-admin` para ADMIN/OWNER  | 💡 Idea | M (2-3 h) |
| **DISC-005** | ✨ | Notificación automática a `#torneo-general` al crear torneo | 💡 Idea | M (3-4 h) |
| **DISC-006** | ✨ | Notificación a `#torneo-resultados` al registrar resultado | 💡 Idea | M (3-4 h) |
| **DISC-007** | 🤪 | Tests del `discord.controller.js` extendidos | 💡 Idea | S (1-2 h) |

### 🟡 Prioridad Baja (Could Have)

| ID | Categoría | Título | Estado | Esfuerzo |
|---|---|---|---|---|
| **DISC-010** | 🎨 | Comando `/help` con lista de comandos disponibles | 💡 Idea | S (1 h) |
| **DISC-011** | ✨ | Comando `/torneo-link <uuid>` para generar link al bracket web | 💡 Idea | XS (30 min) |
| **DISC-012** | 🎨 | Cooldown de 3s por usuario en `/torneo` (rate limit blando) | 💡 Idea | S (1 h) |
| **DISC-013** | 🎨 | Mensajes ephemeral (solo usuario) en `/torneo status` | 💡 Idea | XS (30 min) |
| **DISC-014** | ✨ | Comando `/torneo-draft-publico` para anunciar draft en `#torneo-draft` | 💡 Idea | M (3 h) |

### ⚪ Prioridad Lejana (Won't Have — por ahora)

| ID | Categoría | Título | Estado | Esfuerzo |
|---|---|---|---|---|
| **DISC-020** | ✨ | Auto-registro de equipos vía Discord (reacciones) | 💡 Idea | L (1-2 días) |
| **DISC-021** | ✨ | Slash commands para eventos SQ/BM `/sq`, `/bm` | 💡 Idea | L (2 días) |
| **DISC-022** | ✨ | Webhook saliente a canal por cada evento del torneo | 💡 Idea | M (4-6 h) |
| **DISC-023** | 🔐 | OAuth2 para vincular cuenta Discord ↔ app web | 💡 Idea | L (2-3 días) |

---

## 3. Detalle de mejoras prioritarias

| Mejora | Titulo | Esfuerzo | Descripción |
|---|---|---|---|
| DISC-001 | Re-registrar comando con descripciones ricas | XS (15 min) | Actualizar `description` de cada subcomando al match rico del controller |
| DISC-002 | Restringir `dm_permission: false` | XS (15 min) | Patch con `contexts: [0]` (GUILD) para evitar DMs |
| DISC-003 | Agregar comando guild-scoped | XS (30 min) | Put a `/guilds/{guild_id}/commands` para registro instantáneo |
| DISC-004 | Comando `/torneo-admin` para ADMIN/OWNER | M (2-3 h) | Requiere validación de rol en el handler |
|`DISC-005` | Notificación al crear torneo | M (3-4 h) | Requiere implementar webhook outbound (F1.6a-c) |
| DISC-006 | Notificación al registrar resultado | M (3-4 h) | Igual a DISC-005, pero para resultados |
| DISC-007 | Tests extendidos del controller | S (1-2 h) | 10+ tests nuevos para edge cases |

---

## 4. Lo que NO se toca

-  `verifyDiscordSignature` — ya está correcto (Ed25519 puro).
-  El mount del router ANTES de `apiLimiter` — es intencional (firma es la auth).
-  Los 4 comandos actuales — funcionan bien.
-  Los embeds actuales — ya siguen la identidad visual del escuadrón.
-  La configuración de la app en Developer Portal — ya está completa.

---

## 5. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| Rotación de token olvidada | Media | Alto | Recordatorio: rotar al cambiar de máquina |
| Discord cambia la API v10 | Baja | Alto | Suscribirse a changelog de Discord |
| Rate limit de Discord (30 req/min por webhook) | Media | Bajo | Cola de reintentos (futuro) |
| Token filtrado en logs de Render | Baja | Alto | NUNCA loguear `DISCORD_BOT_TOKEN` |
| Re-registrar comando borra metadata | Media | Bajo | Usar PATCH (no PUT) para modificar |

---

## 6. Cronograma sugerido

| Día | Tarea | Entregable |
|---|---|---|
| D+0 | DISC-001 (descripciones) | Comando con descripciones ricas |
| D+0 | DISC-002 (dm_permission) | Comando solo-guild |
| D+0 | DISC-003 (guild-scoped) | Comando guild instantáneo |
| D+1 | DISC-007 (tests) | 30+ tests passing |
| D+2-3 | DISC-004 (torneo-admin) | Requiere diseño con OWNER  |
| D+4-5 | DISC-005 + DISC-006 (webhooks) | Bloqueado por F1.6a-c |
| D+6 | Deploy + verificación | v4.9.5 cerrada |

**Total:** 6-8 horas efectivas (sin DISC-004/005/006).

---

## 7. Prerequisitos

- ✅ App `PARAGUAY-FFAA TORNEOS` configurada en Developer Portal.
- ✅ Endpoint verificado por Discord.
- ✅ Slash command registrado con 4 subcomandos.
- ✅ Bot invitado al servidor.
- ✅ Variables `DISCORD_*` en Render.
- ⏳ Webhooks outbound (F1.6a-c) — pendiente para DISC-005/006.

---

## 8. Criterios de cierre del plan completo

- [ ] DISC-001 completada (descripciones ricas).
- [ ] DISC-002 completada (`dm_permission: false`).
- [ ] DISC-003 completada (guild-scoped registrado).
- [ ] DISC-004 diseñada y validada por el OWNER.
- [ ] DISC-005/006 dependientes de F1.6a-c (webhooks).
- [ ] DISC-007 completada (tests extendidos).
- [ ] Documentación actualizada `CHANGELOG.md`, `CURRENT_STATE.md`, `API_REFERENCE.md`.
- [ ] Deploy exitoso en Render.
- [ ] Smoke test OK.

---

## 9. Referencias

-  [`docs/adr/ADR-012-integracion-discord.md`](../adr/ADR-012-integracion-discord.md) — ADR de la integración.
-  [`docs/rfc/RFC-002-sistema-torneos.md`](../rfc/RFC-002-sistema-torneos.md) — RFC del sistema de torneos.
-  [`docs/normativa/ANEXO-III-torneos.md`](../normativa/ANEXO-III-torneos.md) — Reglamento del torneo (§24).
-  [`docs/planning/PLAN_TRABAJO_TORNEOS.md`](./PLAN_TRABAJO_TORNEOS.md) — F1.6 en el plan original.
-  [`src/config/discord.js`](../../src/config/discord.js) — Configuración actual.
-  [`src/controllers/discord.controller.js`](../../src/controllers/discord.controller.js) — Controller actual.
-  [`src/middlewares/verifyDiscordSignature.js`](../../src/middlewares/verifyDiscordSignature.js) — Middleware Ed25519.
-  [`src/routes/discord.routes.js`](../../src/routes/discord.routes.js) — Router.

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Plan de Trabajo Discord v1.0 · 2026-10-12 · Documento vivo**
