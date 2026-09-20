# 🏛️ ADR — Architecture Decision Records

> **Registro de decisiones arquitectónicas del sistema.**
> **Última actualización:** 2026-09-17

## ¿Qué es un ADR?

Un ADR (Architecture Decision Record) es un documento que registra una **decisión arquitectónica importante** junto con su contexto, justificación y consecuencias. Sirve para:

- Documentar el "por qué" de las decisiones.
- Evitar repetir discusiones.
- Onboarding de nuevos desarrolladores.
- Trazabilidad histórica de cambios arquitectónicos.

## Nomenclatura

- **ADR-XXX** → ID único secuencial.

## Estados

| Estado | Significado |
|---|---|
| 📝 Proposed | Propuesto, en discusión |
| ✅ Accepted | Aceptado, en vigor |
| 🔄 Superseded | Reemplazado por otro ADR |
| ❌ Deprecated | Ya no aplica |

## Listado

| ID | Título | Fecha | Estado |
|---|---|---|---|
| ADR-001 | No usar fallback de JWT_SECRET | 2026-09-16 | ✅ Accepted |
| ADR-002 | Política público/privado en endpoints GET | 2026-09-17 | ✅ Accepted |
| ADR-003 | Persistencia de backups en Supabase | 2026-09-17 | ✅ Accepted |
| ADR-004 | Cuota de ADMIN: 3 → 5 | 2026-09-16 | ✅ Accepted |
| ADR-005 | Migración de presence a Supabase | 2026-09-17 | 📝 Proposed |
| ADR-006 | Black Market Unificado sobre events_master | 2026-09-19 | ✅ Accepted |
| ADR-007 | Rediseño de Eventos v2 (Unificación SQ + BM) | 2026-09-20 | ✅ Accepted |
| ADR-008 | Ventanas de Carga Desacopladas del Ciclo de Evento | 2026-09-20 | ✅ Accepted |

## Cómo crear un nuevo ADR

1. Copiar `TEMPLATE.md` a `ADR-XXX-slug-corto.md` (donde XXX es el siguiente número secuencial).
2. Completar todas las secciones del template (**MADR 4.0**).
3. Agregar la fila correspondiente a la tabla de **Listado** en este documento.
4. Si el ADR cambia el estado de otro, actualizar el estado del original a `Superseded by ADR-XXX`.
5. Commit con mensaje `docs(adr-XXX): <descripción breve>`.
6. Si el ADR está `Proposed`, mantenerlo así hasta que sea validado por el OWNER.

**Reglas:**

- Un ADR es **inmutable** una vez aceptado. Los cambios se hacen creando un ADR nuevo que lo supersede.
- Los ADRs se numeran secuencialmente sin saltos.
- Los ADRs deben citar **fuentes verificables** (archivo:línea, CHANGELOG, commits).

---

## Próximos ADRs Planificados

| ID | Título | Prioridad |
|---|---|---|
| — | (Sin ADRs planificados al 2026-09-20) | — |

---

**PARAGUAY FFAA `[PRY]` · ADRs · Documento vivo**