# 📋 BACKLOG DE MEJORAS — PARAGUAY-FFAA | METALSTORM

> **Documento vivo de propuestas, mejoras y deuda técnica.**
> **Última actualización:** 2026-09-17
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

*(Sin items actualmente — los críticos ya están en el Plan de Mejora Continua)*

### 🟠 Prioridad Media (Should Have)

| ID | Categoría | Título | Estado | Esfuerzo | Notas |
|---|---|---|---|---|---|
| **BL-001** | ✨ | QR de credenciales temporales para acceso rápido | 💡 Idea | S (2-4h) | Genera QR con user + pass temp; el piloto escanea y entra directo. Ver RFC-001. |
| **BL-002** | 🔧 | Rediseño del registro de eventos (SEM * 1 — no gusta) | 💡 Idea | M (1 día) | Actualmente el registro de eventos es poco práctico. Rediseñar UX + lógica. |
| **BL-003** | 🔧 | Verificar/rediseñar semanas de escuadrón y Black Market | 💡 Idea | L (2-3 días) | Revisar cómo se cuentan las semanas, especialmente el BM. Actualmente puede quedar desincronizado. |
| **BL-004** | 🐛 | Desincronización temporal cuando no se cargan registros | 💡 Idea | M (1 día) | Si nadie carga registros por semanas, el sistema queda desconfigurado. Verificar lógica de tiempo. |
| **BL-005** | ✨ | Auto-login con link prellenado | 💡 Idea | M (1 día) | El link del QR prellena user + pass y auto-loguea. Complementa a BL-001. |

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
| **BL-000** | 🔐 | Proteger `/register` con auth + rate limiting | 2026-09-17 (Fase 4) | `20934e2` |

---

## 📊 Métricas del Backlog

| Métrica | Valor |
|---|---|
| Items activos | 15 |
| Items completados | 1 |
| Items bloqueados | 0 |
| Items descartados | 0 |
| Velocidad promedio (últimos 7 días) | ~3 items/día (con IA) |

---

## 🔗 Referencias

- [`ROADMAP.md`](./ROADMAP.md) — Visión estratégica
- [`PLAN_MEJORA_CONTINUA.md`](./PLAN_MEJORA_CONTINUA.md) — Plan de fases activas
- [`CHANGELOG.md`](./CHANGELOG.md) — Historial de cambios publicados
- [`docs/rfc/`](./docs/rfc/) — Propuestas formales (Request for Comments)
- [`docs/adr/`](./docs/adr/) — Decisiones arquitectónicas

---

## 📝 Notas de Gobierno

- **Revisión semanal:** cada domingo el Comando C4ISR revisa el backlog y reprioriza.
- **Criterio de admisión:** cualquier miembro del escuadrón puede proponer items.
- **Criterio de priorización:** impacto (alto/medio/bajo) × urgencia (alta/media/baja).
- **Movimiento entre estados:** todo item debe pasar por `Idea → Analizando → Backlog → En Progreso → Testing → Completado`.
- **Ítems recurrentes:** si una idea se descarta pero vuelve, se reactiva el ID original (no se crea uno nuevo).

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Backlog v1.0 · 2026-09-17 · Documento vivo**