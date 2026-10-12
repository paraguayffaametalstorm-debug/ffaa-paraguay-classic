# 🔔 Discord Setup — PARAGUAY-FFAA | METALSTORM

> **Guía paso a paso para configurar la integración con Discord.**
> **Última actualización:** 2026-10-12
> **Estado:** F1.6a + F1.6b cerrados (webhooks outbound).

---

## 📋 Índice

1. [Qué hace esta integración](#1-qué-hace-esta-integración)
2. [Requisitos previos](#2-requisitos-previos)
3. [Paso 1 — Crear aplicación en Discord](#3-paso-1--crear-aplicación-en-discord)
4. [Paso 2 — Configurar webhook](#4-paso-2--configurar-webhook)
5. [Paso 3 — Variables de entorno](#5-paso-3--variables-de-entorno)
6. [Paso 4 — Cargar webhook en Supabase](#6-paso-4--cargar-webhook-en-supabase)
7. [Paso 5 — Verificar](#7-paso-5--verificar)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Qué hace esta integración

La app notifica automáticamente a Discord cuando ocurren estos 6 eventos del Sistema de Torneos:

| Evento | Cuándo se dispara |
|---|---|
| `TOURNAMENT_CREATED` | ADMIN/OWNER crea un torneo |
| `TOURNAMENT_TEAM_REGISTERED` | Un capitán registra su equipo |
| `TOURNAMENT_MATCH_RESULT_RECORDED` | Moderador registra un resultado |
| `TOURNAMENT_DRAFT_ACTION_RECORDED` | Moderador registra ban/pick |
| `TOURNAMENT_STATUS_CHANGED` | Cambia el estado del torneo |
| `TOURNAMENT_MODERATOR_CHANGED` | ADMIN/OWNER reasigna moderador |

**Referencias:**
- ADR-012 — `docs/adr/ADR-012-integracion-discord.md`
- Anexo III §24 — `docs/normativa/ANEXO-III-torneos.md`

---

## 2. Requisitos previos

- Cuenta de Discord con permisos de **Manage Webhooks** en el canal destino.
- Acceso al SQL Editor de Supabase (para la tabla `discord_webhooks`).
- Acceso a las variables de entorno de Render (o donde esté hosteada la app).

---

## 3. Paso 1 — Crear aplicación en Discord

**Esto es OPCIONAL para webhooks outbound.** Solo lo necesitás si vas a implementar slash commands (F1.6d-f).

1. Ir a https://discord.com/developers/applications
2. Click en **New Application** → Nombre: `PARAGUAY-FFAA METALSTORM`
3. En la pestaña **General Information**, copiar:
   - `APPLICATION ID`
   - `PUBLIC KEY`
4. En la pestaña **Bot**, copiar el `BOT TOKEN`.

Guardar esos 3 valores para el paso 5 (opcional).

---

## 4. Paso 2 — Configurar webhook

**Esto es lo único OBLIGATORIO para las notificaciones.**

1. Abrir Discord, ir al canal donde querés las notificaciones (ej. `#torneo-general`).
2. Click en ⚙️ **Edit Channel** → **Integrations** → **Webhooks** → **New Webhook**.
3. Nombrar el webhook: `PARAGUAY-FFAA Notifier`.
4. Copiar la **Webhook URL** (`https://discord.com/api/webhooks/<id>/<token>`).
5. Click en **Save**.

**Canales sugeridos (Anexo III §24.2):**
- `#torneo-general` → notificaciones generales (todos los eventos).
- `#torneo-resultados` → solo `TOURNAMENT_MATCH_RESULT_RECORDED`.
- `#torneo-draft` → solo `TOURNAMENT_DRAFT_ACTION_RECORDED`.
- `#torneo-soporte` → notificaciones de soporte (futuro).

---

## 5. Paso 3 — Variables de entorno

En **Render → Environment**, agregar estas variables:

```bash
DISCORD_ENABLED=true
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/<id>/<token>

# Opcionales (F1.6d-f — slash commands):
DISCORD_BOT_TOKEN=<bot-token>
DISCORD_PUBLIC_KEY=<hex-64-chars>
DISCORD_APPLICATION_ID=<app-id>

# Opcional (default 3000ms):
DISCORD_TIMEOUT_MS=3000
```

**Notas:**
- Si `DISCORD_ENABLED` es distinto de `true`, todo el módulo Discord se saltea silenciosamente.
- `DISCORD_WEBHOOK_URL` es el **fallback** si la tabla `discord_webhooks` está vacía.

---

## 6. Paso 4 — Cargar webhook en Supabase

**Opción A — Desde la app (F1.6c):** Panel Admin → Discord → Agregar webhook. (Requiere F1.6c.)

**Opción B — Manual (SQL Editor):**

```sql
INSERT INTO public.discord_webhooks
  (channel_name, event_type, webhook_url, description, is_active)
VALUES
  ('torneo-general', '*', 'https://discord.com/api/webhooks/<id>/<token>', 'Canal principal — todos los eventos', true),
  ('torneo-resultados', 'TOURNAMENT_MATCH_RESULT_RECORDED', 'https://discord.com/api/webhooks/<otro-id>/<otro-token>', 'Solo resultados', true);
```

**Precedencia de resolución:**
1. Tabla `discord_webhooks` con `event_type` exacto.
2. Tabla con `event_type = '*'` (wildcard).
3. `ENV.DISCORD_WEBHOOK_URL` (fallback).
4. Si ninguno → log warning, no se envía nada.

---

## 7. Paso 5 — Verificar

**1. Crear un torneo de prueba:**

```bash
curl -X POST https://paraguay-ffaa-metalstorm.onrender.com/api/tournaments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{
    "name": "Torneo Test Discord",
    "format": "SWISS+SE",
    "scope": "F1",
    "starts_at": "2026-11-01T12:00:00Z",
    "ends_at": "2026-11-03T12:00:00Z",
    "min_teams": 4,
    "max_teams": 8
  }'
```

**2. Verificar el canal de Discord.** Debe aparecer un mensaje con título "🏆 Nuevo Torneo Creado".

**3. Si no aparece, revisar logs en Render:**

```
Buscar: [DiscordNotifier]
```

---

## 8. Troubleshooting

### "Discord deshabilitado. Skip TOURNAMENT_CREATED"

→ `DISCORD_ENABLED` no es `true`. Verificar la variable en Render.

### "Sin webhook configurado para TOURNAMENT_CREATED"

→ Ni la tabla `discord_webhooks` ni `DISCORD_WEBHOOK_URL` tienen una URL. Verificar el paso 4.

### "HTTP 401: Unauthorized"

→ La webhook URL es inválida o fue revocada. Regenerarla en Discord (paso 2).

### "HTTP 429: Too Many Requests"

→ Discord rate limit (30 req/min por webhook). Esperar 1 minuto. Los eventos se loguean pero no se envían.

### "Timeout después de 3000ms"

→ Discord lento o red lenta. Aumentar `DISCORD_TIMEOUT_MS` a 5000.

### "Data inválida para TOURNAMENT_CREATED"

→ Bug en el backend: algún campo no cumple el schema Zod. Revisar los logs detallados (incluyen el campo exacto).

---

## 9. Referencias

- ADR-012 — `docs/adr/ADR-012-integracion-discord.md`
- Anexo III §24 — `docs/normativa/ANEXO-III-torneos.md`
- Discord Webhooks API — https://discord.com/developers/docs/resources/webhook
- Código fuente: `src/utils/discordNotifier.js`

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Discord Setup v1.0 · 2026-10-12 · Documento vivo**
