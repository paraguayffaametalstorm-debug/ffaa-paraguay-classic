// tests/controllers/health.controller.test.js
//
// FIX-306 — Tests de health checks (liveness + readiness)
//
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { liveness, readiness } from '../../src/controllers/health.controller.js';
import { getSupabase } from '../../src/db/supabase.js';

vi.mock('../../src/db/supabase.js');

vi.mock('../../src/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.status = vi.fn(function (code) { this.statusCode = code; return this; });
    res.json = vi.fn().mockReturnThis();
    res.send = vi.fn().mockReturnThis();
    res.type = vi.fn().mockReturnThis();
    return res;
};

describe('Health Controller — Sprint 3 (FIX-306)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('liveness', () => {
        it('debe responder 200 con texto OK', () => {
            const req = {};
            const res = mockRes();
            liveness(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.type).toHaveBeenCalledWith('text/plain');
            expect(res.send).toHaveBeenCalledWith('OK');
        });

        it('NO debe consultar Supabase', () => {
            const req = {};
            const res = mockRes();
            liveness(req, res);

            expect(getSupabase).not.toHaveBeenCalled();
        });

        it('debe responder instantáneamente (sin I/O)', () => {
            const req = {};
            const res = mockRes();
            const start = Date.now();
            liveness(req, res);
            const elapsed = Date.now() - start;

            expect(elapsed).toBeLessThan(50); // Sin I/O, debe ser <50ms
        });
    });

    describe('readiness', () => {
        it('debe responder 200 healthy cuando Supabase está OK', async () => {
            const mockQuery = {
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({ error: null, count: 61 }),
            };
            getSupabase.mockReturnValue(mockQuery);

            const req = {};
            const res = mockRes();
            await readiness(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            const payload = res.json.mock.calls[0][0];
            expect(payload.status).toBe('healthy');
            expect(payload.checks.supabase.status).toBe('ok');
            expect(payload.checks.supabase.latency_ms).toBeGreaterThanOrEqual(0);
        });

        it('debe responder 503 degraded si Supabase devuelve error', async () => {
            const mockQuery = {
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({
                    error: { message: 'Connection refused' },
                    count: null,
                }),
            };
            getSupabase.mockReturnValue(mockQuery);

            const req = {};
            const res = mockRes();
            await readiness(req, res);

            expect(res.status).toHaveBeenCalledWith(503);
            const payload = res.json.mock.calls[0][0];
            expect(payload.status).toBe('degraded');
            expect(payload.checks.supabase.status).toBe('error');
        });

        it('debe responder 503 si Supabase no está inicializado', async () => {
            getSupabase.mockReturnValue(null);

            const req = {};
            const res = mockRes();
            await readiness(req, res);

            expect(res.status).toHaveBeenCalledWith(503);
            const payload = res.json.mock.calls[0][0];
            expect(payload.checks.supabase.status).toBe('unavailable');
        });

        it('debe incluir version, timestamp y uptime_seconds', async () => {
            const mockQuery = {
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                limit: vi.fn().mockResolvedValue({ error: null }),
            };
            getSupabase.mockReturnValue(mockQuery);

            const req = {};
            const res = mockRes();
            await readiness(req, res);

            const payload = res.json.mock.calls[0][0];
            expect(payload.version).toBeDefined();
            expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
            expect(payload.uptime_seconds).toBeGreaterThanOrEqual(0);
            expect(payload.service).toContain('PARAGUAY-FFAA');
        });

        it('debe medir latencia de Supabase en ms', async () => {
            const mockQuery = {
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                limit: vi.fn().mockImplementation(() =>
                    new Promise(resolve => setTimeout(() => resolve({ error: null }), 20))
                ),
            };
            getSupabase.mockReturnValue(mockQuery);

            const req = {};
            const res = mockRes();
            await readiness(req, res);

            const payload = res.json.mock.calls[0][0];
            expect(payload.checks.supabase.latency_ms).toBeGreaterThanOrEqual(20);
        });
    });
});