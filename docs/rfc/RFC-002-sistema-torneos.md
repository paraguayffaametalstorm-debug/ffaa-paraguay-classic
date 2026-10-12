# RFC-002 — Sistema de Torneos Internos

> **ID:** RFC-002 · **Estado:** ✅ Accepted · **Autor:** OWNER + Comando C4ISR
> **Fecha:** 2026-10-11
> **Relacionado con:** Normativa v3.0 Art. 18 bis, 7 ter, 7 quater, 42

## 1. Contexto
El escuadrón organiza torneos informalmente. La Normativa v3.0 los formaliza.
Matcherino es la plataforma oficial de Metalstorm (MCS).

## 2. Objetivo
Sistema de torneos recreativos con draft de aeronaves, incremental por fases.

## 3. Alcance por fases
- **F1:** torneo interno del principal (5v5, brackets, draft).
- **F2:** torneo del conjunto (principal + anexos).
- **F3:** torneo abierto (aliados + terceros).
- **F4:** partner oficial (visión).

## 4. Modelo de datos propuesto (F1)
- `tournaments` (id, name, format, scope, status, starts_at, ends_at).
- `tournament_participants` (user_id nullable, guest_identifier nullable).
- `tournament_matches` (bracket, scores).
- `tournament_drafts` (pick/ban de aeronaves).

## 5. Endpoints propuestos (F1)
- `GET/POST /api/tournaments`
- `GET /api/tournaments/:id`
- `PATCH /api/tournaments/:id/status`
- `POST /api/tournaments/:id/register`
- `POST /api/tournaments/:id/matches/:mid/result`
- `POST /api/tournaments/:id/matches/:mid/draft`

## 6. Restricciones (Normativa Art. 18 bis)
- ❌ No afecta evaluación, aporte, ascensos, vacantes.
- ✅ Participación voluntaria.
- ✅ Reglas publicadas antes.

## 7. Prerequisitos
1. Tests de aeronaves verdes.
2. Decisión OWNER: formato, tamaño, duración, premios.

## 8. Decisiones del OWNER

1. **Formato:** Swiss (Día 1) + Single Elimination (Día 2). Réplica del formato oficial MCS.
2. **Tamaño:** Escalable por fases — F1: 4-8 equipos; F2: 8-16; F3: 16-32.
3. **Duración:** 1 fin de semana (sáb Swiss + dom eliminación). F3+: 2 fines de semana.
4. **Partidas:** 5v5. Bo3 en Swiss y cuartos. Bo5 en semis y final. Modo Priority Target. Draft con 1 ban/equipo, Mirrored Picks, último BM baneado.
5. **Premios:** F1 sin premio material (badge + mención). F2-F3 a definir por acuerdo institucional.
6. **Canales oficiales:** Discord del escuadrón + app de control.

**Todas las reglas operativas están formalizadas en `docs/normativa/ANEXO-III-torneos.md`.**

## 9. Próximos pasos
1. Aprobación del RFC-002.
2. Respuesta a las 5 preguntas.
3. Creación de `PLAN_TRABAJO_TORNEOS.md`.
4. Implementación F1.

## 10. Referencias
- Normativa v3.0 (borrador).
- ADR-007, ADR-010.
- `PLAN_TRABAJO_TESTS_AERONAVES.md`.
