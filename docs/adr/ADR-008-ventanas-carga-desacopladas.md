# ADR-008: Ventanas de Carga Desacopladas del Ciclo de Evento

> **Estado:** ✅ Accepted (validado por OWNER el 2026-09-20)
> **Fecha:** 2026-09-20
> **Autor:** Comando C4ISR
> **Supersede parcialmente:** Reglas de ventana de carga del ADR-007

---

## 1. Contexto

El sistema de eventos v2 (ADR-007) unificó los eventos SQ y BM sobre `events_master` + `event_participations`. Sin embargo, la **ventana de carga de performance** (cuándo el piloto registra sus tokens) quedó **atada al ciclo del evento**, generando un problema operativo serio.

### 1.1 El modelo actual (problemático)

```
📅 CICLO SEMANAL SQ:

  Jueves 09:00 PY ─── Evento SQ SEM 39 ─── Lunes 08:59 PY
  │                                              │
  │  ❌ VENTANA DE CARGA CERRADA                 │  ✅ VENTANA DE CARGA ABIERTA
  │     (no se pueden cargar los                 │     (se cargan los tokens
  │      tokens del SQ que acaba de              │      del SQ que acaba de
  │      EMPEZAR)                                │      TERMINAR)
  │                                              │
  └──────────────┐                ┌──────────────┘
                 │                │
                 ▼                ▼
         Miércoles 16:59 PY   Jueves 09:00 PY
         (deadline BM)        (arranca SQ nuevo)
```

### 1.2 Problemas detectados

| # | Problema | Impacto |
|---|---|---|
| 1 | **Ventana desfasada 1 evento** | La ventana de SEM 38 abre cuando SEM 39 arranca, no cuando SEM 38 termina |
| 2 | **Ventana corta (4 días)** | Lun 09:00 → Jue 08:59 |
| 3 | **Bloqueo por BM** | Si hay BM el miércoles 17:00, la ventana se cierra antes |
| 4 | **Pérdida de data** | Pilotos que no cargan en la ventana, pierden sus tokens |
| 5 | **Confusión operativa** | "¿Cargo el evento que terminó o el que está en curso?" |

### 1.3 Consecuencias operativas

- Pilotos que se olvidan de cargar el lunes/martes, pierden sus tokens.
- Presión innecesaria: 4 días para cargar algo que ya jugaron.
- Si hay BM, la ventana se acorta aún más.

---

## 2. Decisión

**Desacoplar la ventana de carga del ciclo del evento.**

En lugar de atar la ventana al ciclo del evento, darle **una ventana de carga independiente, configurable y más generosa**.

### 2.1 Nuevo modelo

```
📅 CICLO SQ CON VENTANA DE CARGA DESACOPLADA:

  Evento SQ SEM 39: Jue 09:00 PY ─── Lun 08:59 PY (ciclo de juego)

  Ventana de carga: Jue 09:00 PY ─── Jue 08:59 PY (+7 días para cargar)
                     │                        │
                     │  ✅ ABIERTA TODA LA SEMANA (jue a jue)
                     │     - Se puede cargar SEM 39 cuando termina (lun)
                     │     - Se puede cargar SEM 39 tarde (mié/jue)
                     │     - Se puede cargar SEM 39 hasta el próximo jue
                     │
                     └──────┐                 ┌──────────────┘
                            ▼                 ▼
                     Jue 09:00 PY       Jue 08:59 PY
                     (arranca SEM 40)   (cierra carga de SEM 39)
```

### 2.2 Reglas de negocio — SQUADRON

1. **Un evento SQ abre el Jueves 09:00 PY.**
2. **Un evento SQ cierra el Lunes 08:59 PY.**
3. **La VENTANA DE CARGA de un SQ:**
   - Abre cuando el evento **ARRANCA** (Jue 09:00 PY).
   - Cierra **7 días después** (Jue 08:59 PY).
   - Es decir: todo el ciclo del evento + 4 días extra.
4. **Solo se puede CARGAR PROGRESO si:**
   - El evento está OPEN o CLOSED (no CANCELLED).
   - La ventana de carga está abierta.
   - El piloto no tiene participación previa (o la está editando).
5. **Un piloto puede:**
   - Cargar tokens de SQ en cualquier momento dentro de la ventana.
   - Modificar su carga (PUT) dentro de la ventana.
   - Ver su carga fuera de la ventana (solo lectura).
6. **Al cerrar la ventana:**
   - Se congela la participación.
   - No se puede modificar ni borrar.
   - Queda en modo READ-ONLY.
7. **Al arrancar un BM:**
   - El SQ actual se cierra (BM_REPLACED).
   - La ventana de carga del SQ sigue abierta hasta su deadline original.

### 2.3 Reglas de negocio — BLACK_MARKET

1. **Un evento BM abre el Miércoles 17:00 PY.**
2. **Un evento BM cierra el Lunes 17:00 PY.**
3. **La VENTANA DE CARGA de un BM:**
   - Abre cuando el evento ARRANCA (Mié 17:00 PY).
   - Cierra **6 días después** (Mar 16:59 PY).
   - Es decir: los 5 días del BM + 24h extra de gracia.
4. **Solo se puede CARGAR PROGRESO si:**
   - El evento está OPEN (no legacy, no CLOSED).
   - La ventana de carga está abierta.
5. **Al cerrar la ventana:**
   - Se congela la participación.
   - No se puede modificar ni borrar.
   - Queda en modo READ-ONLY.

### 2.4 Excepción — Compra de aeronave BM

**El endpoint `POST /api/events-v2/bm/:eventId/purchase` NO valida la ventana de carga.**

**Razón:** el BM es un evento **opcional**. Los pilotos pueden no participar en el juego o no cargar sus misiones en la app, y aún así comprar la aeronave con el descuento que hayan acumulado (que puede ser 0%).

**El BM no es determinante para el escuadrón** (a diferencia del SQ).

**Reglas del purchase:**
- Requiere que el evento exista y sea de tipo `BLACK_MARKET`.
- Requiere que el piloto tenga una participación previa (aunque sea vacía).
- **NO** requiere `total_points > 0`.
- **NO** requiere ventana abierta.
- Marca `data.purchased = true` con `purchased_at` para auditoría.

---

## 3. Arquitectura técnica

### 3.1 Cambios en `events_master`

```sql
ALTER TABLE events_master
  ADD COLUMN IF NOT EXISTS submission_opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submission_closes_at TIMESTAMPTZ;
```

**Semántica:**
- `start_date` / `end_date`: cuándo se **JUEGA** el evento (ventana de combate).
- `submission_opens_at` / `submission_closes_at`: cuándo se **CARGA** la performance.

### 3.2 Índices

```sql
CREATE INDEX IF NOT EXISTS idx_events_master_submission_window
  ON events_master (submission_opens_at, submission_closes_at)
  WHERE status IN ('OPEN', 'CLOSED');
```

### 3.3 Scheduler — calculateSubmissionWindow()

Función agregada a `src/utils/eventScheduler.js`:

```js
function calculateSubmissionWindow(startDate, eventType) {
  const start = new Date(startDate);

  if (eventType === 'SQUADRON') {
    const closes = new Date(start);
    closes.setUTCDate(closes.getUTCDate() + 7);
    return {
      submission_opens_at: start.toISOString(),
      submission_closes_at: closes.toISOString()
    };
  }

  if (eventType === 'BLACK_MARKET') {
    const closes = new Date(start);
    closes.setUTCDate(closes.getUTCDate() + 6);
    return {
      submission_opens_at: start.toISOString(),
      submission_closes_at: closes.toISOString()
    };
  }

  // Fallback: 7 días desde el inicio
  const closes = new Date(start);
  closes.setUTCDate(closes.getUTCDate() + 7);
  return {
    submission_opens_at: start.toISOString(),
    submission_closes_at: closes.toISOString()
  };
}
```

### 3.4 Helper de validación

Nuevo módulo `src/utils/submissionWindow.js` con 2 funciones puras:

- `validateSubmissionWindow(event)` → `{ valid, code, message, details }`
- `getSubmissionWindowStatus(event)` → `{ status, seconds_remaining, seconds_until_open, can_submit }`

### 3.5 Endpoints modificados

| Endpoint | Aplica ventana | Motivo |
|---|---|---|
| `POST /api/events-v2/:id/participations` (SQ) | ✅ SÍ | Carga de tokens SQ |
| `PUT /api/events-v2/:id/participations/:uid` (SQ) | ✅ SÍ | Edición de tokens SQ |
| `PUT /api/events-v2/bm/:eventId/progress` (BM) | ✅ SÍ | Carga de misiones BM |
| `POST /api/events-v2/bm/:eventId/purchase` (BM) | ❌ NO | Compra opcional (§2.4) |

### 3.6 Nuevos endpoints

| Endpoint | Método | Descripción |
|---|---|---|
| `GET /api/events-v2/:id/submission-window` | GET | Info de la ventana de carga (SQ) |
| `GET /api/events-v2/bm/:eventId/submission-window` | GET | Info de la ventana de carga (BM) |

**Ejemplo de respuesta:**

```json
{
  "success": true,
  "event_id": "a1b2c3d4-...",
  "event_type": "SQUADRON",
  "submission_opens_at": "2026-09-24T12:00:00Z",
  "submission_closes_at": "2026-10-01T11:59:59Z",
  "status": "OPEN",
  "seconds_remaining": 432000,
  "can_submit": true
}
```

### 3.7 Frontend

Actualizar el widget de evento activo para mostrar:
- Estado de la ventana de carga (abierta/cerrada).
- Countdown al cierre.
- Botón "Cargar performance" (solo si `can_submit: true`).

---

## 4. Consecuencias

### Positivas

- ✅ **Ventana más amplia:** 7 días (SQ) / 6 días (BM) en lugar de 4 días.
- ✅ **Desacoplada del ciclo:** la ventana no depende de cuándo arranca el próximo evento.
- ✅ **Sin pérdida de data:** pilotos tienen tiempo suficiente para cargar.
- ✅ **Sin bloqueo por BM:** la ventana del SQ sigue abierta durante el BM.
- ✅ **BM desacoplado del escuadrón:** la compra es posible sin haber participado.
- ✅ **Predecible:** deadlines claros y documentados.
- ✅ **Backward compatible:** los eventos existentes se backfillean con ventanas razonables.

### Negativas / Riesgos

- ⚠️ **Migración de esquema:** agregar 2 columnas a `events_master`.
- ⚠️ **Backfill de 40 eventos históricos:** calcular ventanas retroactivamente.
- ⚠️ **Refactor del scheduler:** nueva lógica de cálculo.
- ⚠️ **Refactor del endpoint de participación:** validación adicional.
- ⚠️ **Refactor del frontend:** nuevo widget + countdown.

**Mitigación:** migración idempotente + tests exhaustivos + deploy incremental.

---

## 5. Alternativas consideradas

### Alternativa A: Mantener el modelo actual (ventana atada al ciclo)

- ❌ Rechazada: sigue teniendo el problema del desfase de 1 evento.

### Alternativa B: Ventana de carga de 2 días (Lun-Mar)

- ❌ Rechazada: demasiado corta, no resuelve el problema.

### Alternativa C: Ventana de carga manual (el OWNER la abre cuando quiere)

- ❌ Rechazada: requiere intervención humana constante, propenso a errores.

### Alternativa D: Ventana de carga = 14 días (2 semanas)

- ❌ Rechazada: demasiado larga, complica la contabilidad.

---

## 6. Plan de ejecución

| Sub-fase | Descripción | Duración |
|---|---|---|
| 5.1 | Documentación (este ADR) + validación | 1 día |
| 5.2 | Migración de esquema (`sql/034_submission_windows.sql`) | 1 día |
| 5.3 | Refactor del scheduler (`eventScheduler.js`) | 1 día |
| 5.4 | Refactor del endpoint (`events-v2.controller.js`, `events-v2-bm.controller.js`) | 1 día |
| 5.5 | Refactor del frontend (`js/views.js`, `js/performance.js`) | 1 día |
| 5.6 | Migración de eventos históricos (backfill) | 0.5 día |
| 5.7 | Testing + Deploy + Docs | 0.5 día |

**Total estimado:** 6 días.

---

## 7. Criterios de cierre

- [ ] Columnas `submission_opens_at` y `submission_closes_at` en `events_master`.
- [ ] Scheduler calcula las ventanas correctamente (SQ: +7d, BM: +6d).
- [ ] Helper `submissionWindow.js` con 2 funciones puras.
- [ ] Endpoints de carga validan la ventana.
- [ ] Purchase de BM NO valida la ventana (§2.4).
- [ ] Nuevos endpoints `GET /:id/submission-window` operativos.
- [ ] Widget de evento activo muestra el estado de la ventana.
- [ ] 40 eventos históricos backfilleados con ventanas.
- [ ] Tests: 128+ passing (los existentes + nuevos).
- [ ] Deploy a producción sin downtime.
- [ ] Documentación actualizada (CHANGELOG, API_REFERENCE, CURRENT_STATE).

---

## 8. Decisiones validadas por el OWNER

| # | Decisión | Valor aprobado |
|---|---|---|
| 1 | Ventana SQ | **7 días** (Jue 09:00 PY → Jue 08:59 PY) |
| 2 | Ventana BM | **6 días** (Mié 17:00 PY → Mar 16:59 PY) |
| 3 | SQ cerrado por BM (BM_REPLACED) | **La ventana del SQ sigue abierta** hasta su deadline original |
| 4 | Edición de participación | **Sí, dentro de la ventana** (mientras no se cierre) |
| 5 | Cierre de ventana | **Automático** por deadline (`submission_closes_at`) |
| 6 | Purchase de BM | **NO** valida la ventana (BM es opcional, §2.4) |

---

## 9. Referencias

- `docs/adr/ADR-007-rediseno-eventos-v2.md` (arquitectura base)
- `src/utils/eventScheduler.js` (scheduler)
- `src/utils/submissionWindow.js` (helper de validación)
- `src/controllers/events-v2.controller.js` (endpoints SQ)
- `src/controllers/events-v2-bm.controller.js` (endpoints BM)
- `js/views.js` (widget de evento activo)
- `BACKLOG.md` (HALL-065, BL-020)

---

**PARAGUAY FFAA [PRY] · ADR-008 · 2026-09-20**
