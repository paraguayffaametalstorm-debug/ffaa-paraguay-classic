/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - FIX-209
 * presence.controller.js
 * ============================================================================
 * PROPÓSITO:
 *   Controlador de presencia de pilotos. Reemplaza el Set en memoria
 *   del router original por operaciones Supabase (persistente,
 *   multi-réplica compatible).
 *
 * ENDPOINTS:
 *   POST /api/presence/online   → UPSERT (status=ONLINE, last_seen=NOW())
 *   POST /api/presence/offline  → UPDATE (status=OFFLINE, last_seen=NOW())
 *   GET  /api/presence/active   → COUNT ONLINE con last_seen reciente
 *
 * REGLAS DE NEGOCIO:
 *   - TTL: 5 minutos. Un piloto con last_seen > NOW() - 5min es ONLINE.
 *   - Cleanup: cron cada 5 min borra registros con last_seen < NOW() - 1h.
 *   - Upsert: usa ON CONFLICT (user_id) para idempotencia.
 *
 * FECHA: 2026-09-23
 * REF: ADR-005-presence-en-supabase.md
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';

// ========== CONSTANTES DE NEGOCIO ==========
const PRESENCE_TTL_MINUTES = 5;
const CLEANUP_AFTER_MINUTES = 60;

// ========== HELPERS ==========

/**
 * Calcula el timestamp de "hace X minutos" en ISO string.
 */
function minutesAgo(minutes) {
    return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

/**
 * Resuelve el UUID del usuario desde req.user.
 * Acepta tanto `id` (UUID) como `user_id` (INTEGER).
 * Si es INTEGER, hace una consulta a Supabase para resolver el UUID.
 */
async function resolveUserUUID(supabase, user) {
    if (!user) return null;

    // Caso 1: ya tenemos un UUID válido
    if (user.id && typeof user.id === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
        return user.id;
    }

    // Caso 2: tenemos user_id INTEGER → resolver a UUID
    if (user.user_id) {
        const numericId = typeof user.user_id === 'number'
            ? user.user_id
            : (/^\d+$/.test(String(user.user_id)) ? Number(user.user_id) : null);

        if (numericId) {
            const { data, error } = await supabase
                .from('users')
                .select('id')
                .eq('user_id', numericId)
                .limit(1)
                .single();

            if (!error && data?.id) return data.id;
        }
    }

    // Caso 3: resolver por email (último recurso)
    if (user.email) {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .limit(1)
            .single();

        if (!error && data?.id) return data.id;
    }

    return null;
}

// ========== ENDPOINTS ==========

/**
 * POST /api/presence/online
 * Marca al piloto como ONLINE (UPSERT).
 */
export async function markOnline(req, res) {
    try {
        const supabase = getSupabase();
        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Base de datos no disponible',
                code: 'DB_UNAVAILABLE'
            });
        }

        const uuid = await resolveUserUUID(supabase, req.user);
        if (!uuid) {
            return res.status(400).json({
                success: false,
                error: 'No se pudo resolver el UUID del piloto',
                code: 'USER_NOT_FOUND'
            });
        }

        const nowIso = new Date().toISOString();

        // UPSERT: insert o update según exista la fila
        const { error: upsertError } = await supabase
            .from('presence')
            .upsert(
                {
                    user_id: uuid,
                    last_seen: nowIso,
                    status: 'ONLINE',
                    updated_at: nowIso
                },
                { onConflict: 'user_id' }
            );

        if (upsertError) {
            console.error('❌ [presence.markOnline] Error:', upsertError);
            return res.status(500).json({
                success: false,
                error: 'Error al registrar presencia',
                code: 'UPSERT_FAILED'
            });
        }

        // Devolver conteo actualizado (opcional, útil para el cliente)
        const { count } = await supabase
            .from('presence')
            .select('user_id', { count: 'exact', head: true })
            .eq('status', 'ONLINE')
            .gt('last_seen', minutesAgo(PRESENCE_TTL_MINUTES));

        return res.json({
            success: true,
            count: count || 0,
            message: 'Presencia registrada como ONLINE'
        });
    } catch (err) {
        console.error('❌ [presence.markOnline] Excepción:', err);
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
}

/**
 * POST /api/presence/offline
 * Marca al piloto como OFFLINE (UPDATE).
 */
export async function markOffline(req, res) {
    try {
        const supabase = getSupabase();
        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Base de datos no disponible',
                code: 'DB_UNAVAILABLE'
            });
        }

        const uuid = await resolveUserUUID(supabase, req.user);
        if (!uuid) {
            return res.status(400).json({
                success: false,
                error: 'No se pudo resolver el UUID del piloto',
                code: 'USER_NOT_FOUND'
            });
        }

        const nowIso = new Date().toISOString();

        // UPDATE (no UPSERT, porque si el piloto nunca estuvo online,
        // no tiene sentido crear una fila OFFLINE)
        const { error: updateError } = await supabase
            .from('presence')
            .update({
                status: 'OFFLINE',
                last_seen: nowIso,
                updated_at: nowIso
            })
            .eq('user_id', uuid);

        if (updateError) {
            console.error('❌ [presence.markOffline] Error:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Error al actualizar presencia',
                code: 'UPDATE_FAILED'
            });
        }

        const { count } = await supabase
            .from('presence')
            .select('user_id', { count: 'exact', head: true })
            .eq('status', 'ONLINE')
            .gt('last_seen', minutesAgo(PRESENCE_TTL_MINUTES));

        return res.json({
            success: true,
            count: count || 0,
            message: 'Presencia registrada como OFFLINE'
        });
    } catch (err) {
        console.error('❌ [presence.markOffline] Excepción:', err);
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
}

/**
 * GET /api/presence/active
 * Devuelve el conteo de pilotos ONLINE con last_seen reciente (< TTL).
 */
export async function getActiveCount(req, res) {
    try {
        const supabase = getSupabase();
        if (!supabase) {
            return res.status(500).json({
                success: false,
                error: 'Base de datos no disponible',
                code: 'DB_UNAVAILABLE'
            });
        }

        const { count, error } = await supabase
            .from('presence')
            .select('user_id', { count: 'exact', head: true })
            .eq('status', 'ONLINE')
            .gt('last_seen', minutesAgo(PRESENCE_TTL_MINUTES));

        if (error) {
            console.error('❌ [presence.getActiveCount] Error:', error);
            return res.status(500).json({
                success: false,
                error: 'Error al consultar presencia',
                code: 'QUERY_FAILED'
            });
        }

        return res.json({
            count: count || 0,
            ttl_minutes: PRESENCE_TTL_MINUTES
        });
    } catch (err) {
        console.error('❌ [presence.getActiveCount] Excepción:', err);
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR'
        });
    }
}

// ========== CLEANUP ==========

/**
 * Función de cleanup: borra registros con last_seen < NOW() - 1h.
 * Se invoca desde el cron en server.js.
 */
export async function cleanupPresence() {
    try {
        const supabase = getSupabase();
        if (!supabase) {
            console.warn('⚠️ [presence.cleanup] Supabase no disponible');
            return { deleted: 0 };
        }

        const { error, count } = await supabase
            .from('presence')
            .delete({ count: 'exact' })
            .lt('last_seen', minutesAgo(CLEANUP_AFTER_MINUTES));

        if (error) {
            console.error('❌ [presence.cleanup] Error:', error);
            return { deleted: 0, error: error.message };
        }

        if (count > 0) {
            console.log(`🧹 [presence.cleanup] ${count} registros obsoletos eliminados`);
        }
        return { deleted: count || 0 };
    } catch (err) {
        console.error('❌ [presence.cleanup] Excepción:', err);
        return { deleted: 0, error: err.message };
    }
}