# Helpers de tests — PARAGUAY-FFAA | METALSTORM

> **Guía de uso de los mocks y helpers del proyecto.**
> **Última actualización:** 2026-10-12 (BL-032)

Este directorio contiene los helpers reutilizables por los tests.
Cada uno tiene un **propósito específico** y **no son intercambiables**.

---

## 📚 Catálogo de helpers

| Archivo | Propósito | Cuándo usarlo |
|---|---|---|
| **`mockSupabaseHybrid.js`** | Mock in-memory por DB | Cuando necesitás simular una **base de datos real** que resuelve queries por filtros (`.eq()`, `.ilike()`, `.or()`, `.in()`, `count`, etc.) |
| **`mockSupabaseMSW.js`** | Cliente fluido + MSW | Cuando necesitás interceptar `fetch` para devolver **respuestas HTTP customizadas** (handlers MSW) |
| **`mockSupabaseQueue.js`** | Mock por cola de respuestas | Cuando el test es **lineal** y necesitás forzar la **secuencia exacta** de respuestas que el controller consume |
| **`express.js`** | Helpers `req`/`res`/`next` | Para tests **unit puro** de middlewares y controllers sin levantar Express |

---

## 🎯 Cuándo usar cada uno

### `mockSupabaseHybrid.js` — Mock por DB (RECOMENDADO POR DEFECTO)

**Uso:**
```js
import { createHybridSupabase } from './mockSupabaseHybrid.js';

const DB = {
  users: [
    { id: 'uuid-1', user_id: 1, nick: 'TestPilot', role: 'MIEMBRO', status: 'ACTIVE' },
  ],
};

getSupabase.mockReturnValue(createHybridSupabase(DB));
```

**Cómo funciona:**
- Definís un objeto `DB` con las tablas y filas.
- Cada método del builder (`.eq()`, `.ilike()`, `.or()`, `.in()`, `.order()`, `.limit()`) filtra el `DB` real.
- Soporta `.select()`, `.insert()`, `.update()`, `.delete()`, `.single()`, `.maybeSingle()`.
- Soporta `count` con `.select('id', { count: 'exact', head: true })`.
- Soporta RPC mínima (`get_next_user_id`).

**Cuándo usarlo:**
- Tests de controllers con **queries filtradas complejas**.
- Cuando querés "simular una DB" y no te importa el orden de las queries.
- **Estándar del proyecto** para tests de controllers nuevos.

**Archivos que lo usan:**
- `tests/controllers/planes.controller.test.js`
- `tests/controllers/plane-models.controller.test.js`
- `tests/controllers/planes.catalog.test.js`
- `tests/controllers/admin.controller.test.js`
- `tests/middlewares/rbac.test.js`

---

### `mockSupabaseMSW.js` — Cliente fluido + MSW

**Uso:**
```js
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createMockSupabase } from './mockSupabaseMSW.js';

const handlers = [
  http.get('*/users', ({ request }) => {
    // ... despacho por query param
    return HttpResponse.json([/* ... */]);
  }),
];

const server = setupServer(...handlers);

beforeEach(() => {
  getSupabase.mockReturnValue(createMockSupabase());
});
```

**Cómo funciona:**
- El mock devuelve un cliente "fluido" que hace `fetch()` real cuando se lo awaitea.
- MSW intercepta esos `fetch` y devuelve los handlers configurados.
- Los tests definen las respuestas como **handlers HTTP**.

**Cuándo usarlo:**
- Cuando necesitás **simular respuestas HTTP específicas**.
- Cuando la lógica de respuesta es **compleja y condicional**.

**Archivos que lo usan:**
- `tests/controllers/auth.controller.test.js`
- `tests/controllers/admin.controller.test.js`
- `tests/controllers/owner.controller.test.js`

---

### `mockSupabaseQueue.js` — Mock por cola de respuestas

**Uso:**
```js
import { createSupabaseMock, queueResponse, supaOk, supaError } from './mockSupabaseQueue.js';

const supa = createSupabaseMock();
queueResponse(supa, 'events_master', supaOk([{ id: 'e1', name: 'Event 1' }]));
queueResponse(supa, 'event_participations', supaOk([{ id: 'p1' }]));

vi.mock('../../src/db/supabase.js', () => ({
  getSupabase: () => supa,
}));
```

**Cómo funciona:**
- Cada `.from('tabla')` **consume** la próxima respuesta encolada para esa tabla.
- No aplica filtros — devuelve exactamente lo que pusiste en la cola.

**Cuándo usarlo:**
- Tests de **flujos lineales**.
- Cuando el controller hace queries en un orden específico.

**Archivos que lo usan:**
- `tests/events-v2-bm/*.test.js` (8 archivos)

---

### `express.js` — Helpers req/res/next

**Uso:**
```js
import { mockReq, mockRes } from './express.js';

const req = mockReq({ params: { id: 'abc' }, user: { role: 'ADMIN' } });
const res = mockRes();
await myController(req, res);
expect(res.statusCode).toBe(200);
```

**Cómo funciona:**
- `mockReq(overrides)` → objeto `req` con `params`, `query`, `body`, `user`, `headers`.
- `mockRes()` → objeto `res` con `statusCode`, `body`, `headers` + spies.

**Cuándo usarlo:**
- Tests unit de middlewares.
- Tests unit de controllers sin HTTP real.

**Archivos que lo usan:**
- `tests/events-v2-bm/*.test.js` (8 archivos)

---

## 🔄 Regla de decisión

```
1. ¿Testeás un middleware o controller sin queries?
   → express.js (mockReq/mockRes)

2. ¿Testeás un controller con queries filtradas complejas?
   → mockSupabaseHybrid.js (DB in-memory)

3. ¿Testeás un controller que necesita respuestas HTTP específicas?
   → mockSupabaseMSW.js (handlers MSW)

4. ¿Testeás un flujo lineal donde importa el orden exacto de las queries?
   → mockSupabaseQueue.js (cola de respuestas)
```

---

## 📜 Historia

- **2026-10-12:** BL-032. Reorganización de `tests/mocks/` → `tests/helpers/`.
  Renombrado de los 3 archivos con nombres descriptivos.
  Este README documenta la política de uso.

---

**PARAGUAY FFAA \`[PRY]\` — Escuadrón Oficial MetalStorm**
**Helpers de tests v1.0 · 2026-10-12 · Documento vivo**