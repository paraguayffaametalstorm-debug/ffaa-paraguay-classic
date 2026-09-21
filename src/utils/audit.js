/**
 * logSecurityEvent - registra eventos en la tabla security_events
 */
export async function logSecurityEvent({ supabase, userId, nick, event, ip, userAgent, metadata = {} }) {
    try {
        if (!supabase) {
            console.warn('⚠️ [Audit] Supabase no disponible, evento no registrado:', event);
            return;
        }

        // Convertir userId (INTEGER) a UUID
        let userUUID = null;
        if (userId) {
            if (typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
                userUUID = userId;
            } else {
                try {
                    const { data } = await supabase
                        .from('users')
                        .select('id')
                        .eq('user_id', userId)
                        .single();
                    userUUID = data?.id || null;
                } catch (e) {
                    // Si falla, dejar null
                }
            }
        }

        const { error } = await supabase
            .from('security_events')
            .insert({
                user_id: userUUID,  // ← UUID en lugar de INTEGER
                nick: nick || null,
                event_type: event,
                ip: ip || null,
                user_agent: userAgent || null,
                metadata: metadata || {}
            });

        if (error) {
            console.error('❌ [Audit] Error registrando security event:', error.message);
        }
    } catch (err) {
        console.error('❌ [Audit] Excepción en logSecurityEvent:', err);
    }
}

/**
 * logAuditChange - registra cambios de rol, status o gestión en audit_logs y security_events
 */
export async function logAuditChange({ supabase, actorId, actorNick, targetId, targetNick, action, details = {} }) {
    try {
        if (!supabase) return;

        // Convertir actorId (INTEGER) a UUID
        let actorUUID = null;
        if (actorId) {
            if (typeof actorId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actorId)) {
                actorUUID = actorId;
            } else {
                try {
                    const { data } = await supabase
                        .from('users')
                        .select('id')
                        .eq('user_id', actorId)
                        .single();
                    actorUUID = data?.id || null;
                } catch (e) {
                    // Si falla, dejar null
                }
            }
        }

        const auditEntry = {
            actor_id: actorUUID,  // ← UUID
            actor_nick: actorNick || null,
            target_id: targetId || null,
            target_nick: targetNick || null,
            action: action,
            details: details,
            created_at: new Date().toISOString()
        };

        // Intentar registrar en audit_logs
        try {
            const { error: auditErr } = await supabase
                .from('audit_logs')
                .insert(auditEntry);
            if (auditErr) {
                console.warn('⚠️ [Audit] Info audit_logs insert:', auditErr.message);
            }
        } catch (e) {
            console.warn('⚠️ [Audit] Tabla audit_logs no disponible o esquema diferente:', e.message);
        }

        // También registrar en security_events para redundancia
        await logSecurityEvent({
            supabase,
            userId: actorId,
            nick: actorNick,
            event: action,
            metadata: {
                target_id: targetId,
                target_nick: targetNick,
                ...details
            }
        });
    } catch (err) {
        console.error('❌ [Audit] Error en logAuditChange:', err);
    }
}

/**
 * v4.5.0 — Registra un cambio de nick en la tabla `user_nick_changes`.
 *
 * @param {Object} params
 * @param {Object} params.supabase           - Cliente Supabase
 * @param {string} params.userId             - UUID del usuario (users.id)
 * @param {string} params.previousNick       - Nick anterior
 * @param {string} params.newNick            - Nick nuevo
 * @param {string} [params.previousEmail]    - Email institucional anterior (opcional)
 * @param {string} [params.newEmail]         - Email institucional nuevo (opcional)
 * @param {string} params.changeType         - 'SELF' | 'ADMIN'
 * @param {string} [params.changedBy]        - UUID del admin (solo si changeType === 'ADMIN')
 * @param {string} [params.reason]           - Razón del cambio (solo si changeType === 'ADMIN')
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function logNickChange({
    supabase,
    userId,
    previousNick,
    newNick,
    previousEmail = null,
    newEmail = null,
    changeType,
    changedBy = null,
    reason = null
}) {
    try {
        if (!supabase) {
            console.warn('⚠️ [Audit] Supabase no disponible, cambio de nick no registrado');
            return { ok: false, error: 'SUPABASE_UNAVAILABLE' };
        }

        if (!userId || !previousNick || !newNick || !changeType) {
            console.warn('⚠️ [Audit] logNickChange: faltan parámetros requeridos');
            return { ok: false, error: 'MISSING_PARAMS' };
        }

        if (changeType !== 'SELF' && changeType !== 'ADMIN') {
            console.warn('⚠️ [Audit] logNickChange: changeType inválido:', changeType);
            return { ok: false, error: 'INVALID_CHANGE_TYPE' };
        }

        const entry = {
            user_id: userId,
            previous_nick: previousNick,
            new_nick: newNick,
            previous_institutional_email: previousEmail,
            new_institutional_email: newEmail,
            change_type: changeType,
            changed_by: changedBy,
            reason: reason,
            created_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('user_nick_changes')
            .insert(entry);

        if (error) {
            console.error('❌ [Audit] Error registrando nick change:', error.message);
            return { ok: false, error: error.message };
        }

        return { ok: true };
    } catch (err) {
        console.error('❌ [Audit] Excepción en logNickChange:', err);
        return { ok: false, error: err.message };
    }
}
