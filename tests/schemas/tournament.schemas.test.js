// tests/schemas/tournament.schemas.test.js
//
// F1.2 — Tests de los 6 schemas Zod del sistema de torneos (RFC-002 / Anexo III).
// Tests puros: sin mocks, sin Supabase, sin MSW. Solo safeParse().
//
import { describe, it, expect } from 'vitest';
import {
  TournamentCreateSchema,
  TournamentUpdateStatusSchema,
  TournamentRegisterTeamSchema,
  TournamentMatchResultSchema,
  TournamentDraftActionSchema,
  TournamentModeratorChangeSchema,
  TOURNAMENT_FORMATS,
  TOURNAMENT_SCOPES,
  TOURNAMENT_STATUSES,
  TOURNAMENT_PHASES,
  TOURNAMENT_MATCH_STATUSES,
  TOURNAMENT_DRAFT_ACTIONS,
  TOURNAMENT_BEST_OF,
} from '../../src/utils/schemas.js';

// =====================================================================
// Fixtures
// =====================================================================
const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';
const UUID_D = '44444444-4444-4444-8444-444444444444';
const UUID_E = '55555555-5555-4555-8555-555555555555';
const UUID_F = '66666666-6666-4666-8666-666666666666';
const UUID_MOD = '77777777-7777-4777-8777-777777777777';

const validTournament = () => ({
  name: 'Torneo Interno F1 #1',
  format: 'SWISS+SE',
  scope: 'F1',
  starts_at: '2026-10-17T22:00:00-03:00',
  ends_at: '2026-10-19T23:59:00-03:00',
  min_teams: 4,
  max_teams: 8,
});

const validRoster = () => [
  { user_id: UUID_A, role: 'Interceptor', is_sub: false },
  { user_id: UUID_B, role: 'Support',     is_sub: false },
  { user_id: UUID_C, role: 'Heavy',       is_sub: false },
  { user_id: UUID_D, role: 'Scout',       is_sub: false },
  { user_id: UUID_E, role: 'Sniper',      is_sub: false },
  { user_id: UUID_F, role: 'Interceptor', is_sub: true  },
];

const validRegisterTeam = () => ({
  team_name: 'Escuadrón Alpha',
  captain_user_id: UUID_A,
  roster: validRoster(),
});

// =====================================================================
// TournamentCreateSchema
// =====================================================================
describe('TournamentCreateSchema', () => {
  it('acepta payload válido mínimo (F1 4-8)', () => {
    expect(TournamentCreateSchema.safeParse(validTournament()).success).toBe(true);
  });

  it('acepta payload válido con moderator_id y metadata', () => {
    const r = TournamentCreateSchema.safeParse({
      ...validTournament(),
      moderator_id: UUID_MOD,
      metadata: { maps: ['Countdown', 'Icebound'] },
    });
    expect(r.success).toBe(true);
  });

  it('aplica defaults cuando faltan min_teams/max_teams/metadata', () => {
    const { min_teams, max_teams, ...base } = validTournament();
    const r = TournamentCreateSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.data.min_teams).toBe(4);
    expect(r.data.max_teams).toBe(8);
    expect(r.data.metadata).toEqual({});
  });

  it('rechaza name < 3 chars', () => {
    expect(TournamentCreateSchema.safeParse({ ...validTournament(), name: 'AB' }).success).toBe(false);
  });

  it('rechaza name > 120 chars', () => {
    expect(TournamentCreateSchema.safeParse({ ...validTournament(), name: 'A'.repeat(121) }).success).toBe(false);
  });

  describe.each(['SWISS', 'BO1', '', null, 42, 'swiss+se'])(
    'rechaza format inválido: %s',
    (format) => {
      it('formato no permitido', () => {
        expect(TournamentCreateSchema.safeParse({ ...validTournament(), format }).success).toBe(false);
      });
    }
  );

  describe.each(['F5', 'F0', '', null, 1])(
    'rechaza scope inválido: %s',
    (scope) => {
      it('scope no permitido', () => {
        expect(TournamentCreateSchema.safeParse({ ...validTournament(), scope }).success).toBe(false);
      });
    }
  );

  it('rechaza starts_at sin timezone', () => {
    expect(
      TournamentCreateSchema.safeParse({
        ...validTournament(),
        starts_at: '2026-10-17T22:00:00',
      }).success
    ).toBe(false);
  });

  it('rechaza ends_at <= starts_at', () => {
    expect(
      TournamentCreateSchema.safeParse({
        ...validTournament(),
        starts_at: '2026-10-19T22:00:00-03:00',
        ends_at: '2026-10-17T22:00:00-03:00',
      }).success
    ).toBe(false);
  });

  it('rechaza max_teams < min_teams', () => {
    expect(
      TournamentCreateSchema.safeParse({
        ...validTournament(),
        min_teams: 6,
        max_teams: 4,
      }).success
    ).toBe(false);
  });

  it('rechaza F1 con más de 8 equipos (Anexo III Art. 8)', () => {
    expect(
      TournamentCreateSchema.safeParse({
        ...validTournament(),
        min_teams: 4,
        max_teams: 16,
      }).success
    ).toBe(false);
  });

  it('rechaza F1 con menos de 4 equipos', () => {
    expect(
      TournamentCreateSchema.safeParse({
        ...validTournament(),
        min_teams: 2,
        max_teams: 3,
      }).success
    ).toBe(false);
  });

  it('acepta F2 con 8-16 equipos (fuera del rango F1)', () => {
    expect(
      TournamentCreateSchema.safeParse({
        ...validTournament(),
        scope: 'F2',
        min_teams: 8,
        max_teams: 16,
      }).success
    ).toBe(true);
  });

  it('rechaza moderator_id no-UUID', () => {
    expect(
      TournamentCreateSchema.safeParse({ ...validTournament(), moderator_id: 'not-a-uuid' }).success
    ).toBe(false);
  });
});

// =====================================================================
// TournamentUpdateStatusSchema
// =====================================================================
describe('TournamentUpdateStatusSchema', () => {
  it('acepta status válido sin motivo', () => {
    expect(TournamentUpdateStatusSchema.safeParse({ status: 'ONGOING' }).success).toBe(true);
  });

  it('acepta CANCELLED con motivo >= 5 chars', () => {
    expect(
      TournamentUpdateStatusSchema.safeParse({
        status: 'CANCELLED',
        reason: 'Cancelado por falta de equipos',
      }).success
    ).toBe(true);
  });

  it('rechaza status inválido', () => {
    expect(TournamentUpdateStatusSchema.safeParse({ status: 'PAUSED' }).success).toBe(false);
  });

  it('rechaza CANCELLED sin motivo (trazabilidad Art. 22)', () => {
    expect(TournamentUpdateStatusSchema.safeParse({ status: 'CANCELLED' }).success).toBe(false);
  });

  it('rechaza reason < 5 chars', () => {
    expect(
      TournamentUpdateStatusSchema.safeParse({ status: 'CANCELLED', reason: 'abc' }).success
    ).toBe(false);
  });

  it('rechaza reason > 500 chars', () => {
    expect(
      TournamentUpdateStatusSchema.safeParse({
        status: 'CANCELLED',
        reason: 'A'.repeat(501),
      }).success
    ).toBe(false);
  });

  it('rechaza status faltante', () => {
    expect(TournamentUpdateStatusSchema.safeParse({}).success).toBe(false);
  });
});

// =====================================================================
// TournamentRegisterTeamSchema
// =====================================================================
describe('TournamentRegisterTeamSchema', () => {
  it('acepta equipo con 5 titulares + 1 suplente', () => {
    expect(TournamentRegisterTeamSchema.safeParse(validRegisterTeam()).success).toBe(true);
  });

  it('acepta equipo con 5 titulares sin suplente', () => {
    const roster = validRoster().filter((r) => !r.is_sub);
    expect(
      TournamentRegisterTeamSchema.safeParse({ ...validRegisterTeam(), roster }).success
    ).toBe(true);
  });

  it('rechaza roster con menos de 5 pilotos', () => {
    const roster = validRoster().slice(0, 4);
    expect(TournamentRegisterTeamSchema.safeParse({ ...validRegisterTeam(), roster }).success).toBe(false);
  });

  it('rechaza roster con más de 6 pilotos', () => {
    const roster = [...validRoster(), { user_id: UUID_MOD, role: 'Extra', is_sub: true }];
    expect(TournamentRegisterTeamSchema.safeParse({ ...validRegisterTeam(), roster }).success).toBe(false);
  });

  it('rechaza roster con 4 titulares + 1 suplente (faltan titulares)', () => {
    const roster = [
      { user_id: UUID_A, role: 'Interceptor', is_sub: false },
      { user_id: UUID_B, role: 'Support',     is_sub: false },
      { user_id: UUID_C, role: 'Heavy',       is_sub: false },
      { user_id: UUID_D, role: 'Scout',       is_sub: false },
      { user_id: UUID_E, role: 'Sniper',      is_sub: true  },
    ];
    expect(TournamentRegisterTeamSchema.safeParse({ ...validRegisterTeam(), roster }).success).toBe(false);
  });

  it('rechaza roster con 2 suplentes', () => {
    const roster = validRoster().map((r, i) => ({ ...r, is_sub: i >= 4 }));
    expect(TournamentRegisterTeamSchema.safeParse({ ...validRegisterTeam(), roster }).success).toBe(false);
  });

  it('rechaza roster con user_id duplicado', () => {
    const roster = validRoster().map((r, i) => ({ ...r, user_id: i === 5 ? UUID_A : r.user_id }));
    expect(TournamentRegisterTeamSchema.safeParse({ ...validRegisterTeam(), roster }).success).toBe(false);
  });

  it('rechaza team_name < 2 chars', () => {
    expect(
      TournamentRegisterTeamSchema.safeParse({ ...validRegisterTeam(), team_name: 'A' }).success
    ).toBe(false);
  });

  it('rechaza captain_user_id no-UUID', () => {
    expect(
      TournamentRegisterTeamSchema.safeParse({ ...validRegisterTeam(), captain_user_id: 'cap' }).success
    ).toBe(false);
  });

  it('rechaza user_id no-UUID en roster', () => {
    const roster = validRoster();
    roster[0].user_id = 'not-a-uuid';
    expect(TournamentRegisterTeamSchema.safeParse({ ...validRegisterTeam(), roster }).success).toBe(false);
  });
});

// =====================================================================
// TournamentMatchResultSchema
// =====================================================================
describe('TournamentMatchResultSchema', () => {
  it('acepta Bo3 2-1 sin best_of explícito', () => {
    expect(TournamentMatchResultSchema.safeParse({ score_a: 2, score_b: 1 }).success).toBe(true);
  });

  it('acepta Bo3 2-0 con best_of explícito', () => {
    expect(
      TournamentMatchResultSchema.safeParse({ score_a: 2, score_b: 0, best_of: 3 }).success
    ).toBe(true);
  });

  it('acepta Bo5 3-2 con best_of explícito', () => {
    expect(
      TournamentMatchResultSchema.safeParse({ score_a: 3, score_b: 2, best_of: 5 }).success
    ).toBe(true);
  });

  it('rechaza empate 1-1', () => {
    expect(TournamentMatchResultSchema.safeParse({ score_a: 1, score_b: 1 }).success).toBe(false);
  });

  it('rechaza score negativo', () => {
    expect(TournamentMatchResultSchema.safeParse({ score_a: -1, score_b: 2 }).success).toBe(false);
  });

  it('rechaza score > 5', () => {
    expect(TournamentMatchResultSchema.safeParse({ score_a: 6, score_b: 0 }).success).toBe(false);
  });

  it('rechaza score_a > best_of', () => {
    expect(
      TournamentMatchResultSchema.safeParse({ score_a: 4, score_b: 0, best_of: 3 }).success
    ).toBe(false);
  });

  it('rechaza Bo3 sin ganador alcanzando 2 (1-0)', () => {
    expect(
      TournamentMatchResultSchema.safeParse({ score_a: 1, score_b: 0, best_of: 3 }).success
    ).toBe(false);
  });

  it('rechaza Bo5 sin ganador alcanzando 3 (2-1)', () => {
    expect(
      TournamentMatchResultSchema.safeParse({ score_a: 2, score_b: 1, best_of: 5 }).success
    ).toBe(false);
  });

  it('rechaza best_of distinto de 3/5', () => {
    expect(
      TournamentMatchResultSchema.safeParse({ score_a: 2, score_b: 0, best_of: 7 }).success
    ).toBe(false);
  });

  it('rechaza scores no enteros', () => {
    expect(TournamentMatchResultSchema.safeParse({ score_a: 1.5, score_b: 0 }).success).toBe(false);
  });

  it('rechaza winner_id no-UUID', () => {
    expect(
      TournamentMatchResultSchema.safeParse({ score_a: 2, score_b: 0, winner_id: 'x' }).success
    ).toBe(false);
  });

  it('acepta winner_id null', () => {
    expect(
      TournamentMatchResultSchema.safeParse({ score_a: 2, score_b: 0, winner_id: null }).success
    ).toBe(true);
  });
});

// =====================================================================
// TournamentDraftActionSchema
// =====================================================================
describe('TournamentDraftActionSchema', () => {
  it('acepta BAN válido', () => {
    expect(
      TournamentDraftActionSchema.safeParse({
        action: 'BAN',
        aircraft_id: 'f-22-raptor',
        game_number: 1,
        team_id: UUID_A,
        order_index: 1,
      }).success
    ).toBe(true);
  });

  it('acepta PICK con aircraft_id numérico (coerce a string)', () => {
    const r = TournamentDraftActionSchema.safeParse({
      action: 'PICK',
      aircraft_id: 42,
      game_number: 3,
      team_id: UUID_B,
      order_index: 5,
    });
    expect(r.success).toBe(true);
    expect(r.data.aircraft_id).toBe('42');
  });

  it('rechaza action inválida', () => {
    expect(
      TournamentDraftActionSchema.safeParse({
        action: 'SWAP',
        aircraft_id: 'x',
        game_number: 1,
        team_id: UUID_A,
        order_index: 1,
      }).success
    ).toBe(false);
  });

  it('rechaza game_number fuera de 1-5', () => {
    expect(
      TournamentDraftActionSchema.safeParse({
        action: 'BAN',
        aircraft_id: 'x',
        game_number: 6,
        team_id: UUID_A,
        order_index: 1,
      }).success
    ).toBe(false);
  });

  it('rechaza order_index < 1', () => {
    expect(
      TournamentDraftActionSchema.safeParse({
        action: 'BAN',
        aircraft_id: 'x',
        game_number: 1,
        team_id: UUID_A,
        order_index: 0,
      }).success
    ).toBe(false);
  });

  it('rechaza aircraft_id vacío', () => {
    expect(
      TournamentDraftActionSchema.safeParse({
        action: 'BAN',
        aircraft_id: '   ',
        game_number: 1,
        team_id: UUID_A,
        order_index: 1,
      }).success
    ).toBe(false);
  });

  it('rechaza team_id no-UUID', () => {
    expect(
      TournamentDraftActionSchema.safeParse({
        action: 'BAN',
        aircraft_id: 'x',
        game_number: 1,
        team_id: 'team-1',
        order_index: 1,
      }).success
    ).toBe(false);
  });
});

// =====================================================================
// TournamentModeratorChangeSchema
// =====================================================================
describe('TournamentModeratorChangeSchema', () => {
  it('acepta cambio válido con motivo >= 5 chars', () => {
    expect(
      TournamentModeratorChangeSchema.safeParse({
        moderator_id: UUID_MOD,
        reason: 'Reasignado por indisponibilidad del titular',
      }).success
    ).toBe(true);
  });

  it('rechaza moderator_id no-UUID', () => {
    expect(
      TournamentModeratorChangeSchema.safeParse({
        moderator_id: 'mod-1',
        reason: 'Motivo válido de prueba',
      }).success
    ).toBe(false);
  });

  it('rechaza reason < 5 chars', () => {
    expect(
      TournamentModeratorChangeSchema.safeParse({ moderator_id: UUID_MOD, reason: 'abc' }).success
    ).toBe(false);
  });

  it('rechaza reason > 500 chars', () => {
    expect(
      TournamentModeratorChangeSchema.safeParse({
        moderator_id: UUID_MOD,
        reason: 'A'.repeat(501),
      }).success
    ).toBe(false);
  });

  it('rechaza payload sin reason', () => {
    expect(
      TournamentModeratorChangeSchema.safeParse({ moderator_id: UUID_MOD }).success
    ).toBe(false);
  });
});

// =====================================================================
// Constantes exportadas
// =====================================================================
describe('Constantes exportadas', () => {
  it('TOURNAMENT_FORMATS coincide con el CHECK de 045_tournaments.sql', () => {
    expect(TOURNAMENT_FORMATS).toEqual(['SWISS+SE', 'ROUND_ROBIN+SE']);
  });
  it('TOURNAMENT_SCOPES coincide con el CHECK', () => {
    expect(TOURNAMENT_SCOPES).toEqual(['F1', 'F2', 'F3', 'F4']);
  });
  it('TOURNAMENT_STATUSES coincide con el CHECK', () => {
    expect(TOURNAMENT_STATUSES).toEqual(['DRAFT', 'REGISTRATION', 'ONGOING', 'FINISHED', 'CANCELLED']);
  });
  it('TOURNAMENT_PHASES coincide con el CHECK', () => {
    expect(TOURNAMENT_PHASES).toEqual(['SWISS', 'QF', 'SF', 'FINAL']);
  });
  it('TOURNAMENT_MATCH_STATUSES coincide con el CHECK', () => {
    expect(TOURNAMENT_MATCH_STATUSES).toEqual(['SCHEDULED', 'LIVE', 'FINISHED', 'CANCELLED']);
  });
  it('TOURNAMENT_DRAFT_ACTIONS coincide con el CHECK', () => {
    expect(TOURNAMENT_DRAFT_ACTIONS).toEqual(['BAN', 'PICK']);
  });
  it('TOURNAMENT_BEST_OF coincide con el CHECK', () => {
    expect(TOURNAMENT_BEST_OF).toEqual([3, 5]);
  });
});
