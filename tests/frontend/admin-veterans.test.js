// tests/frontend/admin-veterans.test.js
//
// ADR-010 — Tests de la lógica del frontend `js/admin-veterans.js`.
// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function setupDom() {
  document.body.innerHTML = `
    <div id="adminVeteransStatsGrid">
      <span id="veteranStatActive">—</span>
      <span id="veteranStatVeterans">—</span>
      <span id="veteranStatPupilos">—</span>
      <span id="veteranStatContacts">—</span>
    </div>
    <select id="veteranFilterMentor"><option value="">— Todos —</option></select>
    <select id="veteranFilterStatus"><option value="ACTIVE" selected>🟢 Activas</option></select>
    <div id="adminVeteransTableContainer"></div>
  `;
}

// ─── GLOBALS que el IIFE de admin-veterans.js espera encontrar ────
window.showToast = vi.fn();
window.showModal = vi.fn();
window.closeModal = vi.fn();
window.refreshLucideIcons = vi.fn();
window.apiAdminListMentorships = vi.fn();
window.apiVeteranMyStats = vi.fn();
window.apiAdminUpdateMentorship = vi.fn();
window.apiAdminCreateMentorship = vi.fn();

// ─── Cargar el script una sola vez (es un IIFE que se ejecuta al import) ────
const scriptPath = resolve(__dirname, '../../js/admin-veterans.js');
const scriptContent = readFileSync(scriptPath, 'utf8');

// eslint-disable-next-line no-eval
eval(scriptContent);

beforeEach(() => {
  vi.clearAllMocks();
  setupDom();
});

// ═══════════════════════════════════════════════════════════════
describe('admin-veterans.js — API pública (ADR-010)', () => {
  it('1. expone las funciones esperadas en window', () => {
    expect(typeof window.adminVeteransLoad).toBe('function');
    expect(typeof window.adminVeteransReload).toBe('function');
    expect(typeof window.adminVeteransFilterMentor).toBe('function');
    expect(typeof window.adminVeteransFilterStatus).toBe('function');
    expect(typeof window.adminVeteransClearFilters).toBe('function');
    expect(typeof window.adminVeteransOpenAssignModal).toBe('function');
    expect(typeof window.adminVeteransOpenReassignModal).toBe('function');
    expect(typeof window.adminVeteransOpenCloseModal).toBe('function');
    expect(typeof window.adminVeteransSubmitReassign).toBe('function');
    expect(typeof window.adminVeteransSubmitClose).toBe('function');
  });

  it('2. loadAdminVeteransSection consulta la API y renderiza', async () => {
    window.apiVeteranMyStats.mockResolvedValue({
      success: true,
      stats: {
        active_veteranos: 3,
        active_pupilos: 5,
        logs_this_month: 12,
        evaluations_this_month: 2
      }
    });
    window.apiAdminListMentorships.mockResolvedValue({
      success: true,
      mentorships: [
        {
          id: 'm1',
          mentor_id: 'v1',
          mentor_nick: 'VIEJO',
          mentee_id: 'p1',
          mentee_nick: 'PUPILO',
          status: 'ACTIVE',
          started_at: '2026-09-01T00:00:00Z',
          ended_at: null,
          ended_reason: null
        }
      ]
    });

    await window.adminVeteransLoad();

    expect(document.getElementById('veteranStatVeterans').textContent).toBe('3');
    expect(document.getElementById('veteranStatPupilos').textContent).toBe('5');
    expect(document.getElementById('veteranStatContacts').textContent).toBe('12');

    const container = document.getElementById('adminVeteransTableContainer');
    expect(container.innerHTML).toContain('VIEJO');
    expect(container.innerHTML).toContain('PUPILO');
  });

  it('3. empty state cuando no hay mentorías', async () => {
    window.apiVeteranMyStats.mockResolvedValue({
      success: true,
      stats: { active_veteranos: 0, active_pupilos: 0, logs_this_month: 0, evaluations_this_month: 0 }
    });
    window.apiAdminListMentorships.mockResolvedValue({
      success: true,
      mentorships: []
    });

    await window.adminVeteransLoad();

    const container = document.getElementById('adminVeteransTableContainer');
    expect(container.innerHTML).toMatch(/Sin resultados|No hay mentorías/i);
  });

  it('4. error state cuando falla la API', async () => {
    window.apiVeteranMyStats.mockResolvedValue({ success: true, stats: {} });
    window.apiAdminListMentorships.mockResolvedValue({
      success: false,
      error: 'DB_UNAVAILABLE'
    });

    await window.adminVeteransLoad();

    const container = document.getElementById('adminVeteransTableContainer');
    expect(container.innerHTML).toMatch(/Error al cargar/i);
  });
});