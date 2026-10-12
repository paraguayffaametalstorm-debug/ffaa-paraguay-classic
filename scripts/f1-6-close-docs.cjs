#!/usr/bin/env node
/**
 * ============================================================================
 * F1.6 — Cierre documental (parte 1: docs + bump version + changelog)
 * ============================================================================
 * Aplica los archivos de cierre documental de F1.6a + F1.6b.
 *
 * CREA:
 *   1. docs/DISCORD_SETUP.md                            (guía de setup)
 *   2. docs/prompts/prompt-continuacion-f1.6d.md        (handoff a F1.6d)
 *   3. CHANGELOG_APPEND.md                              (nota para el changelog)
 *
 * MODIFICA:
 *   4. BACKLOG.md                                       (3 hallazgos H-F16-00/01/02)
 *   5. docs/adr/ADR-012-integracion-discord.md          (nota Zod 4 §D5.ter)
 *   6. CURRENT_STATE.md                                 (entrada F1.6a/b)
 *
 * Uso:
 *   node scripts/f1-6-close-docs.cjs --dry-run
 *   node scripts/f1-6-close-docs.cjs --apply
 *
 * Idempotente. Backups en tmp/.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TMP_DIR = path.join(ROOT, 'tmp');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const APPLY   = args.includes('--apply');

if (!DRY_RUN && !APPLY) {
  console.error('❌ Debes pasar --dry-run o --apply');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────
function log(msg)  { console.log(msg); }
function ok(msg)   { console.log('  ✅ ' + msg); }
function skip(msg) { console.log('  ⏭️  ' + msg); }
function warn(msg) { console.log('  ⚠️  ' + msg); }
function fail(msg) { console.error('  ❌ ' + msg); }

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    if (!DRY_RUN) fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

function backup(absPath) {
  if (!fs.existsSync(absPath)) return null;
  ensureTmpDir();
  const rel = path.relative(ROOT, absPath).replace(/[\\/]/g, '_');
  const backupPath = path.join(TMP_DIR, rel + '.bak.' + Date.now());
  if (!DRY_RUN) fs.copyFileSync(absPath, backupPath);
  return backupPath;
}

function writeFile(relPath, content) {
  const abs = path.join(ROOT, relPath);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) {
    if (!DRY_RUN) fs.mkdirSync(dir, { recursive: true });
    ok('crear directorio ' + path.relative(ROOT, dir) + '/');
  }
  const exists = fs.existsSync(abs);
  if (exists) {
    const current = fs.readFileSync(abs, 'utf8');
    if (current === content) {
      skip(relPath + ' (sin cambios)');
      return;
    }
    warn(relPath + ' existe con contenido distinto');
    const bk = backup(abs);
    if (bk) ok('backup: ' + path.relative(ROOT, bk));
  }
  if (!DRY_RUN) fs.writeFileSync(abs, content, 'utf8');
  ok((exists ? 'actualizado' : 'creado') + ': ' + relPath);
}

function appendToFile(relPath, marker, content) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    fail('archivo no existe: ' + relPath);
    return;
  }
  const current = fs.readFileSync(abs, 'utf8');
  if (current.includes(marker)) {
    skip(relPath + ' ya tiene el bloque (marker: ' + marker + ')');
    return;
  }
  const bk = backup(abs);
  if (bk) ok('backup: ' + path.relative(ROOT, bk));
  if (!DRY_RUN) fs.writeFileSync(abs, current.trimEnd() + '\n\n' + content, 'utf8');
  ok('actualizado: ' + relPath + ' (append)');
}

// ─── Contenidos ──────────────────────────────────────────────────

// ── 1. docs/DISCORD_SETUP.md
const DISCORD_SETUP_MD = [
  '# 🔔 Discord Setup — PARAGUAY-FFAA | METALSTORM',
  '',
  '> **Guía paso a paso para configurar la integración con Discord.**',
  '> **Última actualización:** 2026-10-12',
  '> **Estado:** F1.6a + F1.6b cerrados (webhooks outbound).',
  '',
  '---',
  '',
  '## 📋 Índice',
  '',
  '1. [Qué hace esta integración](#1-qué-hace-esta-integración)',
  '2. [Requisitos previos](#2-requisitos-previos)',
  '3. [Paso 1 — Crear aplicación en Discord](#3-paso-1--crear-aplicación-en-discord)',
  '4. [Paso 2 — Configurar webhook](#4-paso-2--configurar-webhook)',
  '5. [Paso 3 — Variables de entorno](#5-paso-3--variables-de-entorno)',
  '6. [Paso 4 — Cargar webhook en Supabase](#6-paso-4--cargar-webhook-en-supabase)',
  '7. [Paso 5 — Verificar](#7-paso-5--verificar)',
  '8. [Troubleshooting](#8-troubleshooting)',
  '',
  '---',
  '',
  '## 1. Qué hace esta integración',
  '',
  'La app notifica automáticamente a Discord cuando ocurren estos 6 eventos del Sistema de Torneos:',
  '',
  '| Evento | Cuándo se dispara |',
  '|---|---|',
  '| `TOURNAMENT_CREATED` | ADMIN/OWNER crea un torneo |',
  '| `TOURNAMENT_TEAM_REGISTERED` | Un capitán registra su equipo |',
  '| `TOURNAMENT_MATCH_RESULT_RECORDED` | Moderador registra un resultado |',
  '| `TOURNAMENT_DRAFT_ACTION_RECORDED` | Moderador registra ban/pick |',
  '| `TOURNAMENT_STATUS_CHANGED` | Cambia el estado del torneo |',
  '| `TOURNAMENT_MODERATOR_CHANGED` | ADMIN/OWNER reasigna moderador |',
  '',
  '**Referencias:**',
  '- ADR-012 — `docs/adr/ADR-012-integracion-discord.md`',
  '- Anexo III §24 — `docs/normativa/ANEXO-III-torneos.md`',
  '',
  '---',
  '',
  '## 2. Requisitos previos',
  '',
  '- Cuenta de Discord con permisos de **Manage Webhooks** en el canal destino.',
  '- Acceso al SQL Editor de Supabase (para la tabla `discord_webhooks`).',
  '- Acceso a las variables de entorno de Render (o donde esté hosteada la app).',
  '',
  '---',
  '',
  '## 3. Paso 1 — Crear aplicación en Discord',
  '',
  '**Esto es OPCIONAL para webhooks outbound.** Solo lo necesitás si vas a implementar slash commands (F1.6d-f).',
  '',
  '1. Ir a https://discord.com/developers/applications',
  '2. Click en **New Application** → Nombre: `PARAGUAY-FFAA METALSTORM`',
  '3. En la pestaña **General Information**, copiar:',
  '   - `APPLICATION ID`',
  '   - `PUBLIC KEY`',
  '4. En la pestaña **Bot**, copiar el `BOT TOKEN`.',
  '',
  'Guardar esos 3 valores para el paso 5 (opcional).',
  '',
  '---',
  '',
  '## 4. Paso 2 — Configurar webhook',
  '',
  '**Esto es lo único OBLIGATORIO para las notificaciones.**',
  '',
  '1. Abrir Discord, ir al canal donde querés las notificaciones (ej. `#torneo-general`).',
  '2. Click en ⚙️ **Edit Channel** → **Integrations** → **Webhooks** → **New Webhook**.',
  '3. Nombrar el webhook: `PARAGUAY-FFAA Notifier`.',
  '4. Copiar la **Webhook URL** (`https://discord.com/api/webhooks/<id>/<token>`).',
  '5. Click en **Save**.',
  '',
  '**Canales sugeridos (Anexo III §24.2):**',
  '- `#torneo-general` → notificaciones generales (todos los eventos).',
  '- `#torneo-resultados` → solo `TOURNAMENT_MATCH_RESULT_RECORDED`.',
  '- `#torneo-draft` → solo `TOURNAMENT_DRAFT_ACTION_RECORDED`.',
  '- `#torneo-soporte` → notificaciones de soporte (futuro).',
  '',
  '---',
  '',
  '## 5. Paso 3 — Variables de entorno',
  '',
  'En **Render → Environment**, agregar estas variables:',
  '',
  '```bash',
  'DISCORD_ENABLED=true',
  'DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/<id>/<token>',
  '',
  '# Opcionales (F1.6d-f — slash commands):',
  'DISCORD_BOT_TOKEN=<bot-token>',
  'DISCORD_PUBLIC_KEY=<hex-64-chars>',
  'DISCORD_APPLICATION_ID=<app-id>',
  '',
  '# Opcional (default 3000ms):',
  'DISCORD_TIMEOUT_MS=3000',
  '```',
  '',
  '**Notas:**',
  '- Si `DISCORD_ENABLED` es distinto de `true`, todo el módulo Discord se saltea silenciosamente.',
  '- `DISCORD_WEBHOOK_URL` es el **fallback** si la tabla `discord_webhooks` está vacía.',
  '',
  '---',
  '',
  '## 6. Paso 4 — Cargar webhook en Supabase',
  '',
  '**Opción A — Desde la app (F1.6c):** Panel Admin → Discord → Agregar webhook. (Requiere F1.6c.)',
  '',
  '**Opción B — Manual (SQL Editor):**',
  '',
  '```sql',
  'INSERT INTO public.discord_webhooks',
  '  (channel_name, event_type, webhook_url, description, is_active)',
  'VALUES',
  '  (\'torneo-general\', \'*\', \'https://discord.com/api/webhooks/<id>/<token>\', \'Canal principal — todos los eventos\', true),',
  '  (\'torneo-resultados\', \'TOURNAMENT_MATCH_RESULT_RECORDED\', \'https://discord.com/api/webhooks/<otro-id>/<otro-token>\', \'Solo resultados\', true);',
  '```',
  '',
  '**Precedencia de resolución:**',
  '1. Tabla `discord_webhooks` con `event_type` exacto.',
  '2. Tabla con `event_type = \'*\'` (wildcard).',
  '3. `ENV.DISCORD_WEBHOOK_URL` (fallback).',
  '4. Si ninguno → log warning, no se envía nada.',
  '',
  '---',
  '',
  '## 7. Paso 5 — Verificar',
  '',
  '**1. Crear un torneo de prueba:**',
  '',
  '```bash',
  'curl -X POST https://paraguay-ffaa-metalstorm.onrender.com/api/tournaments \\',
  '  -H "Content-Type: application/json" \\',
  '  -H "Authorization: Bearer <jwt>" \\',
  '  -d \'{',
  '    "name": "Torneo Test Discord",',
  '    "format": "SWISS+SE",',
  '    "scope": "F1",',
  '    "starts_at": "2026-11-01T12:00:00Z",',
  '    "ends_at": "2026-11-03T12:00:00Z",',
  '    "min_teams": 4,',
  '    "max_teams": 8',
  '  }\'',
  '```',
  '',
  '**2. Verificar el canal de Discord.** Debe aparecer un mensaje con título "🏆 Nuevo Torneo Creado".',
  '',
  '**3. Si no aparece, revisar logs en Render:**',
  '',
  '```',
  'Buscar: [DiscordNotifier]',
  '```',
  '',
  '---',
  '',
  '## 8. Troubleshooting',
  '',
  '### "Discord deshabilitado. Skip TOURNAMENT_CREATED"',
  '',
  '→ `DISCORD_ENABLED` no es `true`. Verificar la variable en Render.',
  '',
  '### "Sin webhook configurado para TOURNAMENT_CREATED"',
  '',
  '→ Ni la tabla `discord_webhooks` ni `DISCORD_WEBHOOK_URL` tienen una URL. Verificar el paso 4.',
  '',
  '### "HTTP 401: Unauthorized"',
  '',
  '→ La webhook URL es inválida o fue revocada. Regenerarla en Discord (paso 2).',
  '',
  '### "HTTP 429: Too Many Requests"',
  '',
  '→ Discord rate limit (30 req/min por webhook). Esperar 1 minuto. Los eventos se loguean pero no se envían.',
  '',
  '### "Timeout después de 3000ms"',
  '',
  '→ Discord lento o red lenta. Aumentar `DISCORD_TIMEOUT_MS` a 5000.',
  '',
  '### "Data inválida para TOURNAMENT_CREATED"',
  '',
  '→ Bug en el backend: algún campo no cumple el schema Zod. Revisar los logs detallados (incluyen el campo exacto).',
  '',
  '---',
  '',
  '## 9. Referencias',
  '',
  '- ADR-012 — `docs/adr/ADR-012-integracion-discord.md`',
  '- Anexo III §24 — `docs/normativa/ANEXO-III-torneos.md`',
  '- Discord Webhooks API — https://discord.com/developers/docs/resources/webhook',
  '- Código fuente: `src/utils/discordNotifier.js`',
  '',
  '---',
  '',
  '**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**',
  '**Discord Setup v1.0 · 2026-10-12 · Documento vivo**',
  ''
].join('\n');

// ── 2. docs/prompts/prompt-continuacion-f1.6d.md
const PROMPT_F16D = [
  '# 🎯 Prompt de continuación — F1.6d (HTTP Interactions)',
  '',
  '> **Para pegar en una sesión nueva de IA con contexto fresco.**',
  '> **Fecha de creación:** 2026-10-12',
  '> **Estado previo:** F1.6a + F1.6b + F1.6c cerrados.',
  '',
  '---',
  '',
  '## 📋 Contexto del proyecto',
  '',
  'Estoy trabajando en **PARAGUAY-FFAA | METALSTORM**, una app de gestión militar. Stack:',
  '',
  '- Backend: Node.js + Express + Supabase (PostgreSQL) + JWT',
  '- Frontend: Vanilla JS (SPA por hash)',
  '- Tests: Vitest',
  '- Deploy: Render + Cloudflare',
  '- Repositorio: `ffaa-paraguay-classic`',
  '',
  '**Versión actual:** v4.9.3 (F1.6c cerrado).',
  '',
  '---',
  '',
  '## 📋 Estado de la integración Discord',
  '',
  '| Fase | Estado | Entregable |',
  '|---|---|---|',
  '| F1.6a | ✅ Cerrado | `sql/046`, `src/config/discord.js`, `src/utils/discordSchemas.js`, `ADR-012` |',
  '| F1.6b | ✅ Cerrado | `src/utils/discordNotifier.js`, 7 hooks en `tournaments.controller.js` |',
  '| F1.6c | ✅ Cerrado | Endpoints CRUD `/api/admin/discord/webhooks`, `DISCORD_SETUP.md` |',
  '| **F1.6d** | ⏳ **Próximo** | `POST /api/discord/interactions` con firma Ed25519 |',
  '| F1.6e | ⏳ | 4 slash commands (`/torneo status`, etc.) |',
  '| F1.6f | ⏳ | Tests E2E + registro de comandos en Discord Developer Portal |',
  '',
  '---',
  '',
  '## 🎯 Objetivo de F1.6d',
  '',
  'Implementar **HTTP Interactions** para recibir slash commands de Discord, **NO Gateway WebSocket**.',
  '',
  '**Razón:** Render free duerme la app tras inactividad (HALL-072). Un WebSocket persistente 24/7 no es viable. HTTP Interactions es request/response: cero procesos vivos.',
  '',
  '**Referencia:** `docs/adr/ADR-012-integracion-discord.md` §2 (decisión).',
  '',
  '---',
  '',
  '## 📦 Entregables de F1.6d',
  '',
  '### 1. `src/middlewares/verifyDiscordSignature.js`',
  '',
  '- Verifica firma **Ed25519** de cada request.',
  '- Lee headers `X-Signature-Ed25519` y `X-Signature-Timestamp`.',
  '- Usa `crypto.verify` con `DISCORD.publicKey`.',
  '- Si firma inválida → `401 INVALID_SIGNATURE` (sin log detallado, por seguridad).',
  '- Si `DISCORD_ENABLED !== true` o falta `DISCORD_PUBLIC_KEY` → `503 DISCORD_NOT_CONFIGURED`.',
  '',
  '### 2. `src/controllers/discord.controller.js`',
  '',
  '- Handler `handleInteraction(req, res)`:',
  '  - **Type 1 (PING)** → responde `{ type: 1 }` (ack de Discord).',
  '  - **Type 2 (APPLICATION_COMMAND)** → switch por `data.name`:',
  '    - `/torneo status` → lista torneos activos.',
  '    - `/torneo bracket [id]` → muestra bracket del torneo.',
  '    - `/torneo equipos [id]` → lista equipos registrados.',
  '    - `/torneo draft [id]` → estado del draft de un match.',
  '- Responde con `{ type: 4, data: { embeds: [...] } }` (respuesta inmediata).',
  '- Si tarda > 3s → responde `{ type: 5 }` (deferred) y luego edita con webhook.',
  '',
  '### 3. `src/routes/discord.routes.js`',
  '',
  '- `POST /api/discord/interactions` → `verifyDiscordSignature` → `handleInteraction`.',
  '- **SIN** `requireAuth` (Discord no manda JWT).',
  '- **SIN** `requireRole` (la firma es la autenticación).',
  '',
  '### 4. `server.js` — mount',
  '',
  'Antes del SPA fallback:',
  '',
  '```javascript',
  "import discordRoutes from './src/routes/discord.routes.js';",
  "app.use('/api/discord', discordRoutes);",
  '```',
  '',
  '### 5. Tests',
  '',
  '- `tests/middlewares/verifyDiscordSignature.test.js` (~10 casos): firma válida, firma inválida, sin firma, timestamp viejo, PING, etc.',
  '- `tests/controllers/discord.controller.test.js` (~15 casos): PING, cada comando, errores.',
  '',
  '---',
  '',
  '## 📋 Prerequisitos para F1.6d',
  '',
  '1. **App de Discord creada** en https://discord.com/developers/applications',
  '2. **3 valores copiados:**',
  '   - `APPLICATION ID`',
  '   - `PUBLIC KEY`',
  '   - `BOT TOKEN`',
  '3. **Variables de entorno en Render:**',
  '   ```bash',
  '   DISCORD_ENABLED=true',
  '   DISCORD_BOT_TOKEN=<bot-token>',
  '   DISCORD_PUBLIC_KEY=<hex-64-chars>',
  '   DISCORD_APPLICATION_ID=<app-id>',
  '   ```',
  '4. **Endpoint público:** `https://paraguay-ffaa-metalstorm.onrender.com/api/discord/interactions`',
  '5. **Registrar la URL en Discord Developer Portal → Interactions Endpoint URL.**',
  '   - Discord hace un PING de verificación al guardar.',
  '   - El endpoint debe responder `{ type: 1 }` con firma válida.',
  '',
  '---',
  '',
  '## 🎯 Preferencias de trabajo',
  '',
  '- **Scripts Node.js** con `--dry-run` / `--apply` (backups en `tmp/`).',
  '- **Commits atómicos** en español: `feat(scope): descripción`.',
  '- **`npx vitest run`** después de cada cambio. **0 regresiones.**',
  '- **Cache busting:** `?v=4.9.X` en `index.html`, `CACHE_NAME = ...v4.9.X` en `sw.js`.',
  '- **Sin template literals anidados con `${...}`** en scripts `.cjs` (H-F16-02). Usar arrays de strings + `.join(\'\\n\')`.',
  '- **UUIDs válidos en tests** (patrón `XXXXXXXX-XXXX-4XXX-8XXX-XXXXXXXXXXXX`, H-F16-01).',
  '',
  '---',
  '',
  '## 📎 Archivos a adjuntar en la próxima sesión',
  '',
  '- `src/config/discord.js`',
  '- `src/utils/discordNotifier.js`',
  '- `src/utils/discordSchemas.js`',
  '- `src/controllers/tournaments.controller.js`',
  '- `src/routes/tournaments.routes.js`',
  '- `src/middlewares/auth.js`',
  '- `server.js`',
  '- `docs/adr/ADR-012-integracion-discord.md`',
  '- `package.json`',
  '',
  '---',
  '',
  '## 🎯 Primera pregunta para la IA',
  '',
  '> "Necesito implementar F1.6d (HTTP Interactions con firma Ed25519). ¿Qué orden de commits me recomendás para no bloquear nada, y arrancamos con el primero?"',
  '',
  '---',
  '',
  '**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**',
  '**Prompt de continuación F1.6d · 2026-10-12**',
  ''
].join('\n');

// ── 3. Contenido a appendar al BACKLOG.md
const BACKLOG_APPEND_MARKER = '### 🐛 Hallazgos F1.6';
const BACKLOG_APPEND_CONTENT = [
  BACKLOG_APPEND_MARKER,
  '',
  '*(Registrados durante el desarrollo de F1.6a y F1.6b. Todos cerrados.)*',
  '',
  '| ID | Categoría | Título | Estado | Esfuerzo | Notas |',
  '|---|---|---|---|---|---|',
  '| **H-F16-00** | 📚 | `#` de comentarios en `cmd.exe` no funciona | ✅ Cerrado | XS | Usar `REM` o evitar comentarios en `cmd.exe`. Documentado en `docs/operations/cmd-windows-tips.md` (a crear). |',
  '| **H-F16-01** | 🧪 | Zod 4 rechaza UUIDs falsos con variante RFC inválida | ✅ Cerrado | S | **Regla:** en tests, usar UUIDs con patrón `XXXXXXXX-XXXX-4XXX-8XXX-XXXXXXXXXXXX` (versión 4, variante 8). Zod 4 aplica RFC 4122 estricto. |',
  '| **H-F16-02** | 🏗️ | Template literals anidados con `${...}` rompen el parseo de scripts `.cjs` | ✅ Cerrado | S | **Regla:** en scripts `.cjs` que generan archivos grandes, usar arrays de strings unidos con `.join(\'\\n\')`. Cero backticks internos. |',
  '',
  '### 📝 Reglas agregadas al estilo del proyecto',
  '',
  '1. **UUIDs de test:** patrón `XXXXXXXX-XXXX-4XXX-8XXX-XXXXXXXXXXXX`.',
  '2. **Scripts `.cjs`:** sin template literals anidados; usar arrays de strings.',
  '3. **Comentarios en `cmd.exe`:** evitar `#`, usar `REM` o ejecutar en PowerShell.',
  '',
  '---'
].join('\n');

// ── 4. Nota al ADR-012
const ADR_APPEND_MARKER = '### D5.ter';
const ADR_APPEND_CONTENT = [
  ADR_APPEND_MARKER + ' — Lección aprendida: Zod 4 y UUIDs en tests',
  '',
  '**Hallazgo H-F16-01 (2026-10-12):**',
  '',
  'Durante el desarrollo de los tests del notifier (`tests/utils/discordNotifier.test.js`), 11 de 18 tests fallaron porque el fixture usaba UUIDs "falsos" tipo `11111111-1111-1111-1111-111111111111`.',
  '',
  '**Causa:** Zod 4 valida UUIDs con regex **RFC 4122 estricta**:',
  '- **Versión** (13° carácter) debe ser `1`-`8`.',
  '- **Variante** (17° carácter) debe ser `8`, `9`, `a` o `b`.',
  '',
  'El UUID `1111...-1111` tiene variante `1` → **rechazado**.',
  '',
  '**Fix aplicado:** patrón `XXXXXXXX-XXXX-4XXX-8XXX-XXXXXXXXXXXX` en todos los fixtures.',
  '',
  '**Regla para tests futuros:** en cualquier test que necesite un UUID "fake" pero válido, usar el patrón anterior. **Nunca `1111...`** porque Zod 4 lo rechaza.',
  '',
  '**Referencia:** `PLAN_TRABAJO_TORNEOS.md` (hallazgo H-F13-01, mismo tipo).',
  '',
  '---'
].join('\n');

// ── 5. Entrada para CURRENT_STATE.md
const CURRENT_STATE_ENTRY = [
  '## Cambios Recientes (2026-10-12) — F1.6 Discord (v4.9.2-f1.6b)',
  '',
  '### Integración Discord — Webhooks outbound cerrados',
  '',
  'Se completaron las fases F1.6a (setup base) y F1.6b (notifier outbound) de la integración con Discord.',
  '',
  '| # | Item | Estado |',
  '|---|------|--------|',
  '| 1 | `sql/046_discord_webhooks.sql` — tabla + RLS + GRANTs | ✅ |',
  '| 2 | `sql/047_discord_webhooks_fix_grants.sql` — REVOKE de anon/authenticated | ✅ |',
  '| 3 | `src/config/discord.js` — feature flag + config | ✅ |',
  '| 4 | `src/utils/discordSchemas.js` — 6 schemas Zod | ✅ |',
  '| 5 | `src/utils/discordNotifier.js` — safeNotify + buildEmbed + caché TTL | ✅ |',
  '| 6 | 7 hooks en `tournaments.controller.js` | ✅ |',
  '| 7 | 18 tests del notifier (23 con `buildEmbed`) | ✅ |',
  '| 8 | `docs/adr/ADR-012-integracion-discord.md` | ✅ |',
  '| 9 | `docs/DISCORD_SETUP.md` — guía paso a paso | ✅ |',
  '',
  '**Commits clave:**',
  '- `682d77d` — `feat(discord): setup base F1.6a`',
  '- `ac399a0` — `chore: ignorar backups .bak.* y limpiar .env.example.bak`',
  '- `d642955` — `feat(discord): notifier outbound + 7 hooks F1.6b`',
  '- `13538e0` — `chore: ignorar tmp/ y eliminar backups del repo`',
  '',
  '**Estado del sistema:**',
  '- **678 passing / 0 failing / 2 skipped** (18 tests nuevos del notifier).',
  '- 0 regresiones.',
  '- Backend listo para notificar a Discord (requiere `DISCORD_ENABLED=true` + webhook URL).',
  '',
  '**Pendiente:**',
  '- F1.6c — Endpoints CRUD `/api/admin/discord/webhooks` (backend + tests + UI).',
  '- F1.6d-f — HTTP Interactions (firma Ed25519 + slash commands).',
  '',
  '**Referencias:**',
  '- `docs/adr/ADR-012-integracion-discord.md`',
  '- `docs/DISCORD_SETUP.md`',
  '- `docs/prompts/prompt-continuacion-f1.6d.md`',
  '',
  '---',
  ''
].join('\n');

// ── 6. Entrada para CHANGELOG.md (append)
const CHANGELOG_MARKER = '## [4.9.2-f1.6b]';
const CHANGELOG_CONTENT = [
  CHANGELOG_MARKER + ' — 2026-10-12',
  '',
  '### ✨ Features',
  '',
  '- **Discord integration (F1.6a):** Setup base con feature flag `DISCORD_ENABLED`, tabla `discord_webhooks` (RLS + GRANTs explícitos), schemas Zod para 6 eventos del sistema de torneos, ADR-012 documentando la decisión arquitectónica (webhooks outbound + HTTP Interactions).',
  '- **Discord integration (F1.6b):** Notifier outbound con `safeNotify()` fire-and-forget. 7 hooks en `tournaments.controller.js` para notificar: creación de torneo, registro de equipo, resultado de match, acción de draft, cambio de estado, cambio de moderador. Caché TTL 5min de URLs. Timeout 3s con AbortController.',
  '',
  '### 🐛 Fixes',
  '',
  '- **SQL 047:** REVOKE de `anon`/`authenticated` en `discord_webhooks` (Supabase otorga ALL PRIVILEGES por default).',
  '',
  '### 🧪 Tests',
  '',
  '- 23 tests nuevos del `discordNotifier` (18 de `safeNotify` + 5 de `buildEmbed`).',
  '- **678 passing / 0 failing / 2 skipped** (18 nuevos vs 660 previos).',
  '',
  '### 📚 Documentación',
  '',
  '- `docs/adr/ADR-012-integracion-discord.md` (nuevo).',
  '- `docs/DISCORD_SETUP.md` (nuevo).',
  '- `docs/prompts/prompt-continuacion-f1.6d.md` (handoff a HTTP Interactions).',
  '',
  '### 🔒 Seguridad',
  '',
  '- `discord_webhooks` con RLS `no_public_access` + GRANT solo a `service_role`.',
  '- `allowed_mentions: { parse: [] }` hardcodeado → nunca pingea `@everyone`.',
  '- Firma Ed25519 reservada para F1.6d.',
  '',
  '### ⚠️ Hallazgos',
  '',
  '- **H-F16-00:** `#` de comentarios en `cmd.exe` no funciona (usar `REM`).',
  '- **H-F16-01:** Zod 4 rechaza UUIDs falsos con variante RFC inválida.',
  '- **H-F16-02:** Template literals anidados con `${...}` rompen el parseo de scripts `.cjs`.',
  '',
  '### 📝 Reglas agregadas al proyecto',
  '',
  '- UUIDs de test: patrón `XXXXXXXX-XXXX-4XXX-8XXX-XXXXXXXXXXXX`.',
  '- Scripts `.cjs`: sin template literals anidados; usar arrays de strings.',
  '- Comentarios en `cmd.exe`: evitar `#`.',
  '',
  '---',
  ''
].join('\n');

// ─── Ejecución ───────────────────────────────────────────────────

log('');
log('══════════════════════════════════════════════════════════');
log('  F1.6 — Cierre documental (F1.6a + F1.6b)');
log('  Modo: ' + (DRY_RUN ? 'DRY-RUN (no escribe nada)' : 'APPLY (escribe)'));
log('══════════════════════════════════════════════════════════');
log('');

log('📚 docs/DISCORD_SETUP.md');
writeFile('docs/DISCORD_SETUP.md', DISCORD_SETUP_MD);
log('');

log('📚 docs/prompts/prompt-continuacion-f1.6d.md');
writeFile('docs/prompts/prompt-continuacion-f1.6d.md', PROMPT_F16D);
log('');

log('📋 BACKLOG.md (append hallazgos H-F16-00/01/02)');
appendToFile('BACKLOG.md', BACKLOG_APPEND_MARKER, BACKLOG_APPEND_CONTENT);
log('');

log('📋 docs/adr/ADR-012-integracion-discord.md (append §D5.ter)');
appendToFile('docs/adr/ADR-012-integracion-discord.md', ADR_APPEND_MARKER, ADR_APPEND_CONTENT);
log('');

log('📋 CURRENT_STATE.md (append entrada F1.6a/b)');
const CURRENT_STATE_MARKER = '## Cambios Recientes (2026-10-12) — F1.6 Discord';
appendToFile('CURRENT_STATE.md', CURRENT_STATE_MARKER, CURRENT_STATE_ENTRY);
log('');

log('📋 CHANGELOG.md (append sección 4.9.2-f1.6b)');
const changelogPath = path.join(ROOT, 'CHANGELOG.md');
if (fs.existsSync(changelogPath)) {
  const current = fs.readFileSync(changelogPath, 'utf8');
  if (current.includes(CHANGELOG_MARKER)) {
    skip('CHANGELOG.md ya tiene la sección ' + CHANGELOG_MARKER);
  } else {
    const bk = backup(changelogPath);
    if (bk) ok('backup: ' + path.relative(ROOT, bk));
    if (!DRY_RUN) {
      // Insertar después del header `# Changelog` y antes de la siguiente sección `##`
      const lines = current.split('\n');
      const headerIndex = lines.findIndex(l => l.startsWith('## ['));
      if (headerIndex === -1) {
        fs.writeFileSync(changelogPath, current.trimEnd() + '\n\n' + CHANGELOG_CONTENT, 'utf8');
      } else {
        const before = lines.slice(0, headerIndex).join('\n');
        const after = lines.slice(headerIndex).join('\n');
        fs.writeFileSync(changelogPath, before.trimEnd() + '\n\n' + CHANGELOG_CONTENT + '\n' + after, 'utf8');
      }
    }
    ok('actualizado: CHANGELOG.md (sección ' + CHANGELOG_MARKER + ')');
  }
} else {
  warn('CHANGELOG.md no existe. Creando con solo la sección nueva.');
  writeFile('CHANGELOG.md', '# Changelog\n\n' + CHANGELOG_CONTENT);
}
log('');

// ─── Resumen ─────────────────────────────────────────────────────
log('══════════════════════════════════════════════════════════');
if (DRY_RUN) {
  log('  ✅ Dry-run completado. No se escribió nada.');
  log('  👉 Para aplicar:');
  log('     node scripts/f1-6-close-docs.cjs --apply');
} else {
  log('  ✅ Archivos de cierre documental creados/actualizados.');
  log('');
  log('  📋 Próximos pasos manuales:');
  log('  1. Revisar diffs: git diff');
  log('  2. npx vitest run  (esperado: 678 passing / 0 failing)');
  log('  3. git add -A && git commit -m "docs: cerrar F1.6a/b (Discord) + CHANGELOG + hallazgos"');
  log('  4. git push origin main');
  log('');
  log('  📋 Después del commit:');
  log('  → F1.6c: endpoints CRUD /api/admin/discord/webhooks');
  log('  → F1.6d: prompt en docs/prompts/prompt-continuacion-f1.6d.md');
}
log('══════════════════════════════════════════════════════════');
log('');