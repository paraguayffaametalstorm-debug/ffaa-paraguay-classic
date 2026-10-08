# ADR-009: Migración de Fly.io a Render.com

- **Fecha:** 2026-10-08
- **Estado:** ✅ Accepted
- **Decisores:** PJPIROVANI (OWNER)
- **Relacionado con:** Factura pendiente de Fly.io (US$5.62)

## Estado

Accepted (vigente desde 2026-10-08, migración completada y verificada).

## Contexto y problema

El sistema operaba en **Fly.io** (región `gru` - São Paulo) con `min_machines_running = 1`,
lo que generaba un costo continuo de ~US$5.62/mes. La tarjeta asociada fue rechazada
por el banco emisor y el OWNER no disponía de otra tarjeta internacional.

Situación:
- **Factura impaga:** US$5.62 (2026-10-05).
- **Plazo de Fly.io:** 3 semanas hasta quedar *delinquent* (no deployable), 6 semanas hasta apagado.
- **Riesgo:** Pérdida del servicio para 28 pilotos activos.
- **Restricción:** Cero costo mensual real, sin tarjeta.

## Decisión

**Migrar la aplicación a Render.com (plan Free, $0/mes, sin tarjeta).**

### Alternativas evaluadas

| Opción | Costo | Tarjeta | Cold start | Veredicto |
|---|---|---|---|---|
| **Fly.io (min_machines=0)** | ~$1/mes | Sí | 3-5s | ❌ Requiere tarjeta |
| **Render.com (Free)** | $0 | No | 30-50s | ✅ **Elegida** |
| **Koyeb (Free)** | $0 | No | 5-10s | ⚠️ Alternativa válida |
| **Railway** | $5 crédito | Sí | 1s | ❌ Requiere tarjeta |
| **Vercel** | $0 | No | 0s | ❌ Refactor 2-3 semanas |
| **Supabase Edge Functions** | Incluido | No | 0s | ❌ Refactor 2-3 semanas |

## Consecuencias

### Positivas

- **Costo $0 real** sin tarjeta.
- **Sin riesgo de suspensión** por falta de pago.
- **Aprovechamiento del repo existente** (Dockerfile y package.json funcionan tal cual).
- **Migración simple:** 60 minutos end-to-end.

### Negativas

- **Cold start de 30-50s** después de 15 min sin uso (plan Free).
- **Rendimiento degradado** en el primer request (warm-up).
- **Render duerme la app** después de inactividad prolongada.

### Neutrales

- **URL nueva:** `https://paraguay-ffaa-metalstorm.onrender.com`
- **URL vieja de Fly.io** se apagará sola (~6 semanas después de la factura impaga).
- **22 variables de entorno** migradas exitosamente (vía `.env` copy/paste).
- **Google OAuth Callback** actualizado a `onrender.com`.

## Implementación

### Pasos ejecutados

1. **Crear cuenta en Render.com** (sin tarjeta).
2. **Conectar el repo de GitHub** `paraguayffaametalstorm-debug/ffaa-paraguay-classic`.
3. **Crear Web Service:**
   - **Name:** `paraguay-ffaa-metalstorm`
   - **Language:** `Node`
   - **Region:** `Oregon (US West)`
   - **Build Command:** `npm install --legacy-peer-deps --omit=dev`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free` ($0/mes, 0.1 CPU, 512 MB RAM)
4. **Cargar 22 variables de entorno** vía `.env` (opción "Add from .env" de Render).
5. **Primer deploy** (41.8 segundos).
6. **Actualizar Google OAuth callback** en Google Cloud Console.
7. **Actualizar `.env` local** con la nueva URL.
8. **Verificar login end-to-end** (email + Google OAuth).

### Verificación

- ✅ **App live:** `https://paraguay-ffaa-metalstorm.onrender.com`
- ✅ **Supabase conectado** (verificado en logs).
- ✅ **Login con email** funcional.
- ✅ **Login con Google** funcional (post-fix callback).
- ✅ **22 env vars** cargadas.
- ✅ **Costo mensual:** $0.

## Pendientes

- **Fly.io:** dejar que la app se apague sola (~6 semanas). No pagar la factura de US$5.62.
- **Documentación:** actualizar `DEPLOYMENT_GUIDE.md` para reflejar la migración (pendiente).
- **Cold start:** monitorear que los pilotos acepten el delay de 30-50s.

## Referencias

- `docs/adr/README.md` — índice de ADRs.
- `DEPLOYMENT_GUIDE.md` — guía de despliegue (a actualizar).
- Repo: `paraguayffaametalstorm-debug/ffaa-paraguay-classic`
- Producción: `https://paraguay-ffaa-metalstorm.onrender.com`

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Migración ejecutada por el OWNER (PJPIROVANI) el 2026-10-08.
