import { getSupabase } from '../db/supabase.js';

export const getEvents = async (req, res) => {
    try {
        const supabase = getSupabase();
        let events = [];
        if (supabase) {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('start_date', { ascending: false })
                .limit(20);
            
            if (!error && data && data.length > 0) {
                events = data;
            }
        }

        const activeEvent = events.find(e => e.is_open || e.status === 'OPEN') || events[0] || null;
        const now = Date.now();
        const endDate = activeEvent?.end_date ? new Date(activeEvent.end_date).getTime() : now + 86400000;
        const inWindow = Boolean(activeEvent?.is_open || activeEvent?.status === 'OPEN' || !activeEvent);
        const windowCloseMs = Math.max(0, endDate - now);

        res.json({ 
            success: true, 
            events: events || [],
            event: activeEvent,
            inWindow,
            windowCloseMs
        });
    } catch (error) {
        console.error('❌ Error en getEvents:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            events: [], 
            event: null, 
            inWindow: true, 
            windowCloseMs: 86400000 
        });
    }
};

export const getOpenEvent = async (req, res) => {
    try {
        const supabase = getSupabase();
        let events = [];
        if (supabase) {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .order('start_date', { ascending: false })
                .limit(20);
            if (!error && data && data.length > 0) {
                events = data;
            }
        }

        const active = events.find(e => e.is_open || e.status === 'OPEN') || events[0] || null;
        const now = Date.now();
        const endDate = active?.end_date ? new Date(active.end_date).getTime() : now + 86400000;
        const inWindow = Boolean(active?.is_open || active?.status === 'OPEN' || !active);
        const windowCloseMs = Math.max(0, endDate - now);

        res.json({ 
            success: true, 
            event: active, 
            inWindow, 
            windowCloseMs, 
            events 
        });
    } catch (error) {
        console.error('❌ Error en getOpenEvent:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            event: null, 
            inWindow: true, 
            windowCloseMs: 86400000, 
            events: [] 
        });
    }
};

// ============================================================
// Obtiene todos los miembros activos para el selector y listas
// ============================================================
export const getActiveMembers = async (req, res) => {
    try {
        const supabase = getSupabase();
        let activeMembers = [];
        if (supabase) {
            const { data, error } = await supabase
                .from('users')
                .select('id, user_id, email, nick, role, perf_status, status, squad_status, last_activity, avg_tokens')
                .order('nick', { ascending: true });
            
            if (!error && data && data.length > 0) {
                activeMembers = data
                    .filter(u => 
                        (u.squad_status && u.squad_status.toUpperCase() === 'ACTIVE') || 
                        (u.status && u.status.toUpperCase() === 'ACTIVE') ||
                        (!u.squad_status && !u.status)
                    )
                    .map(u => ({
                        id: u.id || u.user_id,
                        user_id: u.user_id || u.id,
                        email: u.email,
                        nick: u.nick || u.email?.split('@')[0],
                        role: (u.role || 'MIEMBRO').toUpperCase(),
                        perf_status: u.perf_status || u.status || 'VERDE',
                        status: u.status || u.squad_status || 'ACTIVE',
                        avg_tokens: typeof u.avg_tokens === 'number' ? u.avg_tokens : 0
                    }));
            }
        }

        res.json({ 
            success: true, 
            activeMembers: activeMembers || [], 
            members: activeMembers || [] 
        });
    } catch (error) {
        console.error('❌ Error en getActiveMembers:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            activeMembers: [], 
            members: [] 
        });
    }
};
