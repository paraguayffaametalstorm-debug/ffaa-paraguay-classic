# 🎯 Prompt de continuación — F1.6d (HTTP Interactions)

> **Para pegar en una sesión nueva de IA con contexto fresco.**
> **Fecha de creación:** 2026-10-12
> **Estado previo:** F1.6a + F1.6b + F1.6c cerrados.

---

## 📋 Contexto del proyecto

Estoy trabajando en **PARAGUAY-FFAA | METALSTORM**, una app de gestión militar. Stack:

- Backend: Node.js + Express + Supabase (PostgreSQL) + JWT
- Frontend: Vanilla JS (SPA por hash)
- Tests: Vitest
- Deploy: Render + Cloudflare
- Repositorio: `ffaa-paraguay-classic`

**Versión actual:** v4.9.3 (F1.6c cerrado).

---

## 📋 Estado de la integración Discord

| Fase | Estado | Entregable |
|---|---|---|
| F1.6a | ✅ Cerrado | `sql/046`, `src/config/discord.js`, `src/utils/discordSchemas.js`, `ADR-012` |
| F1.6b | ✅ Cerrado | `src/utils/discordNotifier.js`, 7 hooks en `tournaments.controller.js` |
| F1.6c | ✅ Cerrado | Endpoints CRUD `/api/admin/discord/webhooks`, `DISCORD_SETUP.md` |
| **F1.6d** | ⏳ **Próximo** | `POST /api/discord/interactions` con firma Ed25519 |
| F1.6e | ⏳ | 4 slash commands (`/torneo status`, etc.) |
| F1.6f | ⏳ | Tests E2E + registro de comandos en Discord Developer Portal |

---

## 🎯 Objetivo de F1.6d

Implementar **HTTP Interactions** para recibir slash commands de Discord, **NO Gateway WebSocket**.

**Razón:** Render free duerme la app tras inactividad (HALL-072). Un WebSocket persistente 24/7 no es viable. HTTP Interactions es request/response: cero procesos vivos.

**Referencia:** `docs/adr/ADR-012-integracion-discord.md` §2 (decisión).

---

## 📦 Entregables de F1.6d

### 1. `src/middlewares/verifyDiscordSignature.js`

- Verifica firma **Ed25519** de cada request.
- Lee headers `X-Signature-Ed25519` y `X-Signature-Timestamp`.
- Usa `crypto.verify` con `DISCORD.publicKey`.
- Si firma inválida → `401 INVALID_SIGNATURE` (sin log detallado, por seguridad).
- Si `DISCORD_ENABLED !== true` o falta `DISCORD_PUBLIC_KEY` → `503 DISCORD_NOT_CONFIGURED`.

### 2. `src/controllers/discord.controller.js`

- Handler `handleInteraction(req, res)`:
  - **Type 1 (PING)** → responde `{ type: 1 }` (ack de Discord).
  - **Type 2 (APPLICATION_COMMAND)** → switch por `data.name`:
    - `/torneo status` → lista torneos activos.
    - `/torneo bracket [id]` → muestra bracket del torneo.
    - `/torneo equipos [id]` → lista equipos registrados.
    - `/torneo draft [id]` → estado del draft de un match.
- Responde con `{ type: 4, data: { embeds: [...] } }` (respuesta inmediata).
- Si tarda > 3s → responde `{ type: 5 }` (deferred) y luego edita con webhook.

### 3. `src/routes/discord.routes.js`

- `POST /api/discord/interactions` → `verifyDiscordSignature` → `handleInteraction`.
- **SIN** `requireAuth` (Discord no manda JWT).
- **SIN** `requireRole` (la firma es la autenticación).

### 4. `server.js` — mount

Antes del SPA fallback:

```javascript
import discordRoutes from './src/routes/discord.routes.js';
app.use('/api/discord', discordRoutes);
```

### 5. Tests

- `tests/middlewares/verifyDiscordSignature.test.js` (~10 casos): firma válida, firma inválida, sin firma, timestamp viejo, PING, etc.
- `tests/controllers/discord.controller.test.js` (~15 casos): PING, cada comando, errores.

---

## 📋 Prerequisitos para F1.6d

1. **App de Discord creada** en https://discord.com/developers/applications
2. **3 valores copiados:**
   - `APPLICATION ID`
   - `PUBLIC KEY`
   - `BOT TOKEN`
3. **Variables de entorno en Render:**
   ```bash
   DISCORD_ENABLED=true
   DISCORD_BOT_TOKEN=<bot-token>
   DISCORD_PUBLIC_KEY=<hex-64-chars>
   DISCORD_APPLICATION_ID=<app-id>
   ```
4. **Endpoint público:** `https://paraguay-ffaa-metalstorm.onrender.com/api/discord/interactions`
5. **Registrar la URL en Discord Developer Portal → Interactions Endpoint URL.**
   - Discord hace un PING de verificación al guardar.
   - El endpoint debe responder `{ type: 1 }` con firma válida.

---

## 🎯 Preferencias de trabajo

- **Scripts Node.js** con `--dry-run` / `--apply` (backups en `tmp/`).
- **Commits atómicos** en español: `feat(scope): descripción`.
- **`npx vitest run`** después de cada cambio. **0 regresiones.**
- **Cache busting:** `?v=4.9.X` en `index.html`, `CACHE_NAME = ...v4.9.X` en `sw.js`.
- **Sin template literals anidados con `${...}`** en scripts `.cjs` (H-F16-02). Usar arrays de strings + `.join('\n')`.
- **UUIDs válidos en tests** (patrón `XXXXXXXX-XXXX-4XXX-8XXX-XXXXXXXXXXXX`, H-F16-01).

---

## 📎 Archivos a adjuntar en la próxima sesión

- `src/config/discord.js`
- `src/utils/discordNotifier.js`
- `src/utils/discordSchemas.js`
- `src/controllers/tournaments.controller.js`
- `src/routes/tournaments.routes.js`
- `src/middlewares/auth.js`
- `server.js`
- `docs/adr/ADR-012-integracion-discord.md`
- `package.json`

---

## 🎯 Primera pregunta para la IA

> "Necesito implementar F1.6d (HTTP Interactions con firma Ed25519). ¿Qué orden de commits me recomendás para no bloquear nada, y arrancamos con el primero?"

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Prompt de continuación F1.6d · 2026-10-12**
