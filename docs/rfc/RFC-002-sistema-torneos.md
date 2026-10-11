# RFC-002 — Sistema de Torneos Internos

> **ID:** RFC-002 · **Estado:** 📝 Draft · **Autor:** OWNER + Comando C4ISR
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

## 8. Preguntas abiertas para el OWNER
1. Formato (eliminación / round-robin / ambos).
2. Tamaño (8, 16, variable).
3. Duración.
4. Cómo se juegan las partidas.
5. Premios.

## 9. Próximos pasos
1. Aprobación del RFC-002.
2. Respuesta a las 5 preguntas.
3. Creación de `PLAN_TRABAJO_TORNEOS.md`.
4. Implementación F1.

## 10. Referencias
- Normativa v3.0 (borrador).
- ADR-007, ADR-010.
- `PLAN_TRABAJO_TESTS_AERONAVES.md`.
