/**
 * logSecurityEvent - registra eventos en la tabla security_events
 */
export async function logSecurityEvent({ supabase, userId, nick, event, ip, userAgent, metadata = {} }) {
    try {
        if (!supabase) {
            console.warn('⚠️ [Audit] Supabase no disponible, evento no registrado:', event);
            return;
        }

        const { data, error } = await supabase
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
            console.error('❌ [Audit] Error registrando evento:', error);
        }
    } catch (err) {
        console.error('❌ [Audit] Excepción:', err);
    }
}