/**
 * logSecurityEvent - registra eventos en la tabla security_events
 */
export async function logSecurityEvent({ supabase, userId, nick, event, ip, userAgent, metadata = {} }) {
    try {
        if (!supabase) {
            console.warn('⚠️ [Audit] Supabase no disponible, evento no registrado:', event);
            return;
        }

        const { error } = await supabase
            .from('security_events')
            .insert({
                user_id: userId || null,
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

        const auditEntry = {
            actor_id: actorId || null,
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
