// src/controllers/health.controller.js
//
// FIX-306 — Health checks separados (liveness vs readiness)
// - liveness:  ¿el proceso está vivo? Respuesta inmediata, sin I/O.
// - readiness: ¿podemos atender tráfico? Verifica Supabase con timeout.
//
import { getSupabase } from '../db/supabase.js';
import { logger } from '../config/logger.js';
import { getSchedulerStatus } from '../utils/eventScheduler.js';

const SERVER_START_TIME = Date.now();
const APP_VERSION = process.env.APP_VERSION || '4.5.9';

/**
 * Liveness probe — /health
 * Respuesta INSTANTÁNEA en texto plano. NO toca la BD ni dependencias.
 * Si responde 200, el contenedor está vivo y no debe reiniciarse.
 * Se usa en `fly.toml` para el http_service.checks.
 */
export const liveness = (req, res) => {
    res.status(200).type('text/plain').send('OK');
};

/**
 * Readiness probe — /api/health
 * Verifica dependencias críticas (Supabase) con timeout de 3s.
 * Devuelve 200 si el sistema puede atender tráfico; 503 si no.
 */
export const readiness = async (req, res) => {
    const startTime = Date.now();
    const uptimeMs = Date.now() - SERVER_START_TIME;
    const uptimeSec = Math.floor(uptimeMs / 1000);

    const health = {
        status: 'unknown',
        service: 'PARAGUAY-FFAA | METALSTORM',
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        uptime_seconds: uptimeSec,
        checks: {
            supabase: { status: 'unknown', latency_ms: null },
            scheduler: buildSchedulerCheck()
        }
    };

    // Verificar Supabase con timeout
    const supabase = getSupabase();
    if (!supabase) {
        health.status = 'degraded';
        health.checks.supabase.status = 'unavailable';
        logger.warn('⚠️ [Health] Readiness: Supabase no inicializado');
        return res.status(503).json(health);
    }

    try {
        // Query trivial con timeout
        const sbStart = Date.now();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), 3000)
        );

        const queryPromise = supabase
            .from('users')
            .select('user_id', { count: 'exact', head: true })
            .limit(1);

        const { error } = await Promise.race([queryPromise, timeoutPromise]);

        const sbLatency = Date.now() - sbStart;
        health.checks.supabase.latency_ms = sbLatency;

        if (error) {
            health.status = 'degraded';
            health.checks.supabase.status = 'error';
            health.checks.supabase.error = error.message;
            logger.error('❌ [Health] Readiness: Supabase error', { error: error.message });
            return res.status(503).json(health);
        }

        health.checks.supabase.status = 'ok';
        health.status = 'healthy';
        health.response_time_ms = Date.now() - startTime;

        return res.status(200).json(health);
    } catch (err) {
        health.status = 'degraded';
        health.checks.supabase.status = 'timeout';
        health.checks.supabase.error = err.message;
        logger.error('❌ [Health] Readiness: timeout', { error: err.message });
        return res.status(503).json(health);
    }
};

// ============================================================
// HALL-072 — Health check del scheduler
// ============================================================
// El scheduler reporta su estado en /api/health pero NO bloquea el
// readiness (es una tarea de mantenimiento, no de servicio al usuario).
//
// Reglas:
//   - Si el scheduler no arrancó → status: 'starting' (warning).
//   - Si el último tick fue hace más de 2h → status: 'STALE' (warning).
//   - Si el último tick fue OK → status: 'OK'.
//   - Si el último tick fue ERROR → status: 'ERROR'.
// ============================================================

const SCHEDULER_STALE_THRESHOLD_SECONDS = 2 * 60 * 60; // 2 horas

function buildSchedulerCheck() {
    try {
        const status = getSchedulerStatus();

        // Scheduler no arrancó todavía
        if (!status.started) {
            return {
                status: 'starting',
                started: false,
                last_tick_at: null,
                last_tick_ago_seconds: null,
                last_tick_status: null
            };
        }

        // Calcular cuánto hace del último tick
        const lastTickAgo = status.last_tick_at
            ? Math.round((Date.now() - new Date(status.last_tick_at).getTime()) / 1000)
            : null;

        // Determinar status
        let schedulerStatus = 'OK';
        if (status.last_tick_status === 'ERROR') {
            schedulerStatus = 'ERROR';
        } else if (lastTickAgo === null || lastTickAgo > SCHEDULER_STALE_THRESHOLD_SECONDS) {
            schedulerStatus = 'STALE';
        }

        return {
            status: schedulerStatus,
            started: true,
            started_at: status.started_at,
            uptime_seconds: status.uptime_seconds,
            last_tick_at: status.last_tick_at,
            last_tick_ago_seconds: lastTickAgo,
            last_tick_status: status.last_tick_status,
            last_tick_error: status.last_tick_error
        };
    } catch (err) {
        logger.warn('⚠️ [Health] No se pudo obtener estado del scheduler:', err.message);
        return {
            status: 'unknown',
            error: err.message
        };
    }
}