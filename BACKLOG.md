# 📋 BACKLOG DE MEJORAS — PARAGUAY-FFAA | METALSTORM

> **Documento vivo de propuestas, mejoras y deuda técnica.**
> **Última actualización:** 2026-09-21
> **Responsable:** Comando C4ISR

---

## 📖 Cómo usar este documento

Este backlog centraliza **todas las ideas, mejoras, bugs y deuda técnica** del sistema PARAGUAY-FFAA | METALSTORM. Cada item tiene un ID único (`BL-XXX`), un estado, una prioridad y una categoría.

### Nomenclatura

**Estados:**
| Símbolo | Significado |
|---|---|
| 💡 | Idea cruda, sin analizar |
| 📝 | En análisis técnico |
| 🎨 | En diseño (puede requerir RFC) |
| 📋 | Priorizado, listo para trabajar |
| 🔨 | En progreso (tiene rama asignada) |
| 🧪 | En testing |
| ✅ | Completado |
| 🚫 | Bloqueado (esperando algo) |
| ❌ | Descartado |

**Prioridades (MoSCoW):**
| Símbolo | Significado |
|---|---|
| 🔴 | Must have (crítico) |
| 🟠 | Should have (importante) |
| 🟡 | Could have (deseable) |
| ⚪ | Won't have (futuro lejano) |

**Categorías:**
| Símbolo | Categoría |
|---|---|
| ✨ | Feature nueva |
| 🔧 | Mejora de feature existente |
| 🐛 | Bug / fix |
| 🔐 | Seguridad |
| ⚡ | Performance |
| 🎨 | UX / UI |
| 📚 | Documentación |
| 🏗️ | Infraestructura |
| 🧪 | Testing |

**Esfuerzo estimado:**
| Código | Significado |
|---|---|
| XS | < 1 hora |
| S | 1-4 horas |
| M | 1 día |
| L | 2-3 días |
| XL | 4+ días |

---

## 🎯 Backlog Activo

### 🔴 Prioridad Alta (Must Have)

| ID | Categoria | Titulo | Estado | Esfuerzo | Notas |
|---|---|---|---|---|---|

*(Sin items críticos al 2026-09-20)*

### 🟠 Prioridad Media (Should Have)

| ID | Categoría | Título | Estado | Esfuerzo | Notas |
|---|---|---|---|---|---|
| **BL-001** | ✨ | QR de credenciales temporales para acceso rápido | 💡 Idea | S (2-4h) | Genera QR con user + pass temp; el piloto escanea y entra directo. Ver RFC-001. |
| **BL-002** | 🔧 | Rediseño del registro de eventos (SEM * 1 — no gusta) | 💡 Idea | M (1 día) | Actualmente el registro de eventos es poco práctico. Rediseñar UX + lógica. |
| **BL-003** | 🔧 | Verificar/rediseñar semanas de escuadrón y Black Market | 💡 Idea | L (2-3 días) | Revisar cómo se cuentan las semanas, especialmente el BM. Actualmente puede quedar desincronizado. |
| **BL-004** | 🐛 | Desincronización temporal cuando no se cargan registros | 💡 Idea | M (1 día) | Si nadie carga registros por semanas, el sistema queda desconfigurado. Verificar lógica de tiempo. |
| **BL-005** | ✨ | Auto-login con link prellenado | 💡 Idea | M (1 día) | El link del QR prellena user + pass y auto-loguea. Complementa a BL-001. |
| **BL-016** | 🐛 | Auditoría completa de claves `localStorage` en todo el frontend | 📋 Priorizado | S (4h) |
| **BL-017** | 🏗️ | Sincronizar DDL `sql/001_users.sql` con BD real (HALL-061) | 📋 Priorizado | S (4h) | Agregar `google_id` a la BD real o eliminarlo del DDL. Documentar decisión. | HALL-059 reveló que existían inconsistencias puntuales. Auditar todos los archivos JS y HTML que escriben en `localStorage` para garantizar nomenclatura única y evitar futuras regresiones. |
| **BL-018** | 📚 | Completar §3.5.2, §3.5.3 y §3.5.4 en `API_REFERENCE.md` | 📋 Priorizado | M (4h) | Agregar endpoints faltantes de events-v2 (GET /active, POST, PATCH, participaciones) y sección de deprecación legacy con sunset 2026-12-16. |
| **BL-022** | 🧪 | Tests de integración para /api/dashboard/summary | 📋 Priorizado | S (4h) | Evitaría recurrencia de HALL-067. Cubrir: status 200, campos obligatorios (meta_tokens_sq, pilots_without_load, eventType), caso usuario sin perfil. |
| **BL-023** | 🏗️ | Unificar encoding de archivos JS a LF (.editorconfig + .gitattributes) | 📋 Priorizado | XS (1h) | Causa raíz de HALL-068. Agregar * text=auto eol=lf en .gitattributes y end_of_line = lf en .editorconfig. |
| **BL-024** | 🔐 | Eliminar `'unsafe-inline'` del CSP (FIX-103) | 📋 Diferido | L (2-3 días) | Requiere migrar ~200 `onclick` inline a `addEventListener` + nonce/hash. Diferido del Sprint 2 al Sprint 3 por bajo riesgo residual y mayor valor del Sprint 3 (tests + observabilidad). |
| **BL-025** | 🧪 | Re-implementar tests de admin/owner/auth/rbac con schemas reales | 📋 Priorizado | M (1 día) | 69 tests skipeados en Sprint 3 (FIX-301/302/303/304) porque asumen schemas de respuesta que no coinciden con el controller real (ej: `backup.users_count` vs `backup.file`, `400` vs `409` en conflictos, supertest+MSW no matchea con `127.0.0.1:PORT`). Requiere mapear el contrato real de cada controller y actualizar los `expect()`. Ref: Sprint 3. |

### 🟡 Prioridad Baja (Could Have)

| ID | Categoría | Título | Estado | Esfuerzo | Notas |
|---|---|---|---|---|---|
| **BL-006** | 🎨 | Landing pública sin login | 💡 Idea | M (1 día) | Mostrar catálogo de aviones a público general antes de login. |
| **BL-007** | 🎨 | Dashboard con WebSockets (tiempo real) | 💡 Idea | L (2 días) | Actualizar stats del dashboard sin recargar. |
| **BL-008** | ✨ | Exportación PDF de credenciales | 💡 Idea | S (4h) | Generar PDF con credencial + QR para imprimir. |
| **BL-009** | ✨ | 2FA para OWNER/ADMIN | 💡 Idea | L (1 día) | Autenticación de doble factor (Google Authenticator). |
| **BL-010** | 🔧 | Notificaciones push para eventos BM | 💡 Idea | M (1 día) | Avisar al piloto cuando arranca un evento BM. |
| **BL-011** | 🎨 | Rediseño del Panel Owner (UX) | 💡 Idea | M (1 día) | Mejorar navegación y presentación del panel Owner. |
| **BL-012** | ✨ | Modo oscuro/claro (toggle) | 💡 Idea | S (4h) | Actualmente solo modo militar oscuro. |

### ⚪ Prioridad Lejana (Won't Have — por ahora)

| ID | Categoría | Título | Estado | Esfuerzo | Notas |
|---|---|---|---|---|---|
| **BL-013** | ✨ | App móvil nativa (iOS/Android) | 💡 Idea | XL (2+ semanas) | PWA actual puede ser suficiente. Revisar demanda. |
| **BL-014** | ✨ | Bot de Discord con comandos | 💡 Idea | L (2-3 días) | Consultar stats desde Discord. |
| **BL-015** | ✨ | Integración con la API oficial de Metalstorm | 💡 Idea | ❓ Desconocido | ¿Existe API oficial? Verificar. |

---

## 🚫 Bloqueados

*(Items que esperan algo externo para avanzar)*

| ID | Título | Bloqueado por |
|---|---|---|
| — | — | — |

---

## ❌ Descartados

*(Items evaluados y decidido NO hacer. Se mantienen para trazabilidad.)*

| ID | Título | Razón del descarte | Fecha |
|---|---|---|---|
| — | — | — | — |

---

## ✅ Completados

*(Historial de items cerrados. Se archivan aquí al completarse.)*

| ID | Categoría | Título | Completado | Commit |
|---|---|---|---|---|
| **HALL-065** | 🐛 | Scheduler SQ: timezone PY + duración 4 días | 2026-09-20 (F4.3 + F4.4 v2) | `7f1ce93` + `074fdc3` |
| **BL-020** | 🎨 | Widget evento activo timezone-aware | 2026-09-20 (F4.3) | `4ab67cd` |
| **BL-021** | ✨ | Vistas adaptativas + UI evento activo | 2026-09-20 (F4.3) | `b5d542b` |

| **BL-000** | 🔐 | Proteger `/register` con auth + rate limiting | 2026-09-17 (Fase 4) | `20934e2` |
| **HALL-059** | 🐛 | `ReferenceError: API_BASE is not defined` en `/link-account` | 2026-09-17 (Hotfix) | `71fbda2` |
| **HALL-060** | 🐛 | `500` en `linkAccount` por columna `google_id` inexistente | 2026-09-18 (Hotfix) | `9678d98` |
| **BL-059** | 🐛 | Inconsistencia claves `localStorage` en vinculación Google | 2026-09-17 (Hotfix) | `a82b5b0` |

---

## 📊 Métricas del Backlog

| Métrica | Valor |
|---|---|
| Items activos | 18 |
| Items completados | 9 |
| Items bloqueados | 0 |
| Items descartados | 0 |
| Velocidad promedio (últimos 7 días) | ~3 items/día (con IA) |

---

## 🔗 Referencias

### Documentos de gestión

- [`ROADMAP.md`](./ROADMAP.md) — Visión estratégica a 12 meses.
- [`PLAN_TRABAJO.md`](./PLAN_TRABAJO.md) — Sprints activos (qué se hace ahora).
- [`PLAN_MEJORA_CONTINUA.md`](./PLAN_MEJORA_CONTINUA.md) — Plan histórico (fases 0-6, cerrado).
- [`CHANGELOG.md`](./CHANGELOG.md) — Historial de versiones publicadas.

### Documentos técnicos y normativos

- [`docs/rfc/`](./docs/rfc/) — Propuestas formales (Request for Comments).
- [`docs/adr/`](./docs/adr/) — Decisiones arquitectónicas.
- [`docs/SESSION_HANDOFF.md`](./docs/SESSION_HANDOFF.md) — Handoff entre sesiones.

## 📝 Notas de Gobierno

- **Revisión semanal:** cada domingo el Comando C4ISR revisa el backlog y reprioriza.
- **Criterio de admisión:** cualquier miembro del escuadrón puede proponer items.
- **Criterio de priorización:** impacto (alto/medio/bajo) × urgencia (alta/media/baja).
- **Movimiento entre estados:** todo item debe pasar por `Idea → Analizando → Backlog → En Progreso → Testing → Completado`.
- **Ítems recurrentes:** si una idea se descarta pero vuelve, se reactiva el ID original (no se crea uno nuevo).

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Backlog v1.0 · 2026-09-17 · Documento vivo**
| **HALL-066** | 🐛 | Cadena de 6 bugs bloqueando carga de W38 (v4.5.2-hotfix) | 2026-09-22 | `7157492` |
| **HALL-S2-02** | 🐛 | Dropdown de rol frontend no permitía seleccionar ADMIN | 2026-09-22 | `13501af` |
| **FIX-PARTICIPATION-EDIT** | ✨ | Edición de participaciones existentes con jerarquía + self-mod check | 2026-09-22 | `ed6b45e` |
| **HALL-070** | 🐛 | Script de migración inserta imports dentro de imports multilínea | 2026-09-23 | (resuelto en FIX-308) |
| **FIX-306** | 🧪 | Health checks separados (liveness vs readiness) | 2026-09-23 | (Sprint 3) |
| **Sprint 3 (parcial)** | 🧪 | 287 tests pasando · 69 skipeados (BL-025) | 2026-09-23 | (Sprint 3) |
