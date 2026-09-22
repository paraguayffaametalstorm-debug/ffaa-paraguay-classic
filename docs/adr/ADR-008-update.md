# ADR-008 — Anexo: Lecciones del Hotfix v4.5.2 (HALL-066)

> **Fecha:** 2026-09-22
> **ADR original:** ADR-008 (Ventanas de Carga Desacopladas)
> **Contexto:** HALL-066 (cadena de 6 bugs)
> **Estado:** Anexo aplicado, sin cambios a la decisión original

---

## 1. Decisión Original (ADR-008)

> Desacoplar la ventana de carga del ciclo del evento. Cada evento tiene su
> propia ventana configurable:
> - SQUADRON: 7 días
> - BLACK_MARKET: 6 días
> La ventana manda, no el status.

---

## 2. Qué Falló en la Implementación

La decisión arquitectónica de ADR-008 **es correcta**. Pero la
**implementación** dejó 6 bugs en cascada que se manifestaron cuando el
piloto intentó cargar W38 en período de gracia.

### Bug de fondo

El endpoint `createParticipation` aplicaba `validateSubmissionWindow(event)`
pero **con un evento incompleto** (le faltaban `submission_opens_at` y
`submission_closes_at` en el `.select()`). El helper devolvía
`SUBMISSION_WINDOW_NOT_SET` silenciosamente.

---

## 3. Lecciones Aprendidas

### ✅ Lección 1: "La ventana manda, no el status"

**Antes:**

```js
if (event.status !== 'OPEN') {
  return res.status(409).json({ code: 'EVENT_NOT_OPEN' });
}
```

**Después:**

```js
const windowCheck = validateSubmissionWindow(event);
if (!windowCheck.valid) {
  return res.status(409).json({
    code: windowCheck.code,
    error: windowCheck.message
  });
}
```

**Regla:** un evento `CLOSED` con ventana de carga abierta (grace period)
**SÍ acepta** participaciones. El status es cosmético; la ventana es la
fuente de verdad.

### ✅ Lección 2: "Los .select() deben traer todo lo que el validador necesita"

**Antes:**

```js
.select('id, type, status, name')  // ← falta submission_opens_at/closes_at
```

**Después:**

```js
.select('id, type, status, name, submission_opens_at, submission_closes_at')
```

**Regla:** cuando pasás un objeto a un validador, ese objeto debe tener
**todos** los campos que el validador lee. Documentar el contrato implícito.

### ✅ Lección 3: "Los schemas Zod deben tolerar ambos identificadores"

**Antes:**

```js
user_id: z.string().uuid()
```

**Después:**

```js
user_id: z.union([
  z.string().uuid(),
  z.number().int().positive()
])
```

**Regla:** el proyecto tiene `users.user_id` (INTEGER, visible) y
`users.id` (UUID, técnico). Los schemas deben aceptar ambos y el controller
resuelve. Esto evita romper clientes viejos.

### ✅ Lección 4: "Un CACHE_NAME nuevo por cada hotfix de frontend"

**Regla:** cuando cambiás JS del frontend servido por el SW, **siempre**
bumpear `CACHE_NAME` en `sw.js`. Si no, el piloto sigue con el código
viejo hasta que el SW expire (24h+).

### ✅ Lección 5: "La migración de tablas requiere migrar TODOS los clientes"

**Regla:** si vas a deprecar `performances` y usar `event_participations`,
hay que **migrar el frontend en el mismo release**. Dejar la mitad migrada
es una bomba de tiempo.

---

## 4. Consecuencias para v4.6.0

1. **Deprecar** `performances` (legacy) — eliminar el endpoint
   `POST /api/performances` una vez confirmado que ningún cliente lo usa.
2. **Migrar** los 639 registros históricos de `performances` a
   `event_participations`.
3. **Eliminar** `events` (legacy) cuando ya no tenga FK entrante.
4. **Documentar** el contrato de `CreateParticipationSchema` como
   "acepta user_id INTEGER | UUID".

---

## 5. Referencias

- `docs/adr/ADR-008-ventanas-carga-desacopladas.md` (original)
- `docs/incidentes/HALL-066-completo.md` (post-mortem)
- `docs/HANDOFF-v4.5.2-hotfix.md` (handoff)

---

**PARAGUAY FFAA [PRY] · ADR-008 Anexo v4.5.2 · 2026-09-22**
