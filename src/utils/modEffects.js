/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - MOD EFFECTS HELPER
 * Gestión de efectos numéricos de Modificaciones Tácticas (plane_mods)
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';

let cachedModEffects = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Invalida la caché en memoria de efectos de mods
 */
export function invalidateModEffectsCache() {
    cachedModEffects = null;
    cacheTimestamp = 0;
    console.log('🔄 [ModEffects] Caché de efectos de mods invalidada');
}

/**
 * Obtiene todos los efectos de mods desde Supabase o caché
 * @param {Object} supabase - Cliente de Supabase (opcional, se obtiene automáticamente)
 * @returns {Object} Efectos agrupados por mod_id y nivel
 */
export async function getModEffects(supabase = null) {
    const now = Date.now();
    if (cachedModEffects && (now - cacheTimestamp < CACHE_TTL_MS)) {
        return cachedModEffects;
    }

    const client = supabase || getSupabase();
    if (!client) {
        console.warn('⚠️ [ModEffects] Supabase no disponible, usando fallback');
        cachedModEffects = getFallbackModEffects();
        cacheTimestamp = now;
        return cachedModEffects;
    }

    try {
        const { data, error } = await client
            .from('mod_effects')
            .select('*')
            .order('mod_id', { ascending: true })
            .order('level', { ascending: true });

        if (error) {
            console.error('❌ [ModEffects] Error consultando Supabase:', error.message);
            cachedModEffects = getFallbackModEffects();
            cacheTimestamp = now;
            return cachedModEffects;
        }

        if (!data || data.length === 0) {
            console.warn('⚠️ [ModEffects] No hay datos en mod_effects, usando fallback');
            cachedModEffects = getFallbackModEffects();
            cacheTimestamp = now;
            return cachedModEffects;
        }

        // Agrupar por mod_id → level
        const effects = {};
        data.forEach(m => {
            const modKey = String(m.mod_id).toLowerCase();
            if (!effects[modKey]) {
                effects[modKey] = {
                    mod_id: m.mod_id,
                    mod_name: m.mod_name,
                    mod_type: m.mod_type,
                    levels: {}
                };
            }
            effects[modKey].levels[m.level] = m.effects || {};
        });

        console.log('✅ [ModEffects] Efectos de mods cargados desde Supabase');
        cachedModEffects = effects;
        cacheTimestamp = now;
        return effects;

    } catch (err) {
        console.error('❌ [ModEffects] Excepción cargando efectos de mods:', err.message);
        cachedModEffects = getFallbackModEffects();
        cacheTimestamp = now;
        return cachedModEffects;
    }
}

/**
 * Fallback con los 10 mods oficiales y sus 5 niveles
 */
export function getFallbackModEffects() {
    console.warn('⚠️ [ModEffects] Usando datos de respaldo de mods');

    return {
        m1: {
            mod_id: 'm1',
            mod_name: 'Giro Temerario (Daredevil Turning)',
            mod_type: 'Agilidad',
            levels: {
                1: { giro: 4.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Velocidad de giro +4%' },
                2: { giro: 8.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Velocidad de giro +8%' },
                3: { giro: 12.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Velocidad de giro +12%' },
                4: { giro: 16.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Velocidad de giro +16%' },
                5: { giro: 20.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Velocidad de giro +20%' }
            }
        },
        m2: {
            mod_id: 'm2',
            mod_name: 'Maniobrabilidad Ideal (Ideal Maneuvering)',
            mod_type: 'Agilidad',
            levels: {
                1: { eficiencia: 3.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Eficiencia de viraje +3%' },
                2: { eficiencia: 6.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Eficiencia de viraje +6%' },
                3: { eficiencia: 9.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Eficiencia de viraje +9%' },
                4: { eficiencia: 12.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Eficiencia de viraje +12%' },
                5: { eficiencia: 15.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Eficiencia de viraje +15%' }
            }
        },
        m3: {
            mod_id: 'm3',
            mod_name: 'Resistencia a las Explosiones (Blast Resistance)',
            mod_type: 'Defensa',
            levels: {
                1: { resistencia_misiles: 5.0, unidad: '%', stat: 'armor', siempre_activo: true, desc: 'Resistencia a daño por misiles +5%' },
                2: { resistencia_misiles: 10.0, unidad: '%', stat: 'armor', siempre_activo: true, desc: 'Resistencia a daño por misiles +10%' },
                3: { resistencia_misiles: 15.0, unidad: '%', stat: 'armor', siempre_activo: true, desc: 'Resistencia a daño por misiles +15%' },
                4: { resistencia_misiles: 20.0, unidad: '%', stat: 'armor', siempre_activo: true, desc: 'Resistencia a daño por misiles +20%' },
                5: { resistencia_misiles: 25.0, unidad: '%', stat: 'armor', siempre_activo: true, desc: 'Resistencia a daño por misiles +25%' }
            }
        },
        m4: {
            mod_id: 'm4',
            mod_name: 'Blindaje de Ataque / Racha (Streak Armor)',
            mod_type: 'Defensa',
            levels: {
                1: { armadura_por_kill: 5.0, unidad: '%', stat: 'armor', siempre_activo: false, condicional: 'solo con kills', desc: '+5% HP temporal por derribo' },
                2: { armadura_por_kill: 10.0, unidad: '%', stat: 'armor', siempre_activo: false, condicional: 'solo con kills', desc: '+10% HP temporal por derribo' },
                3: { armadura_por_kill: 15.0, unidad: '%', stat: 'armor', siempre_activo: false, condicional: 'solo con kills', desc: '+15% HP temporal por derribo' },
                4: { armadura_por_kill: 20.0, unidad: '%', stat: 'armor', siempre_activo: false, condicional: 'solo con kills', desc: '+20% HP temporal por derribo' },
                5: { armadura_por_kill: 25.0, unidad: '%', stat: 'armor', siempre_activo: false, condicional: 'solo con kills', desc: '+25% HP temporal por derribo' }
            }
        },
        m5: {
            mod_id: 'm5',
            mod_name: 'Quemadores Auxiliares Eficientes (Efficient Afterburners)',
            mod_type: 'Motor',
            levels: {
                1: { consumo_combustible: -8.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Consumo de postcombustión -8%' },
                2: { consumo_combustible: -16.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Consumo de postcombustión -16%' },
                3: { consumo_combustible: -24.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Consumo de postcombustión -24%' },
                4: { consumo_combustible: -32.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Consumo de postcombustión -32%' },
                5: { consumo_combustible: -40.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Consumo de postcombustión -40%' }
            }
        },
        m6: {
            mod_id: 'm6',
            mod_name: 'Máxima Propulsión (Thrust Booster)',
            mod_type: 'Motor',
            levels: {
                1: { velocidad_max: 3.0, aceleracion: 4.0, unidad: '%', stat: 'speed', siempre_activo: false, condicional: 'bajo 50% combustible', desc: '+3% Vel y +4% Acel bajo 50% de combustible' },
                2: { velocidad_max: 6.0, aceleracion: 8.0, unidad: '%', stat: 'speed', siempre_activo: false, condicional: 'bajo 50% combustible', desc: '+6% Vel y +8% Acel bajo 50% de combustible' },
                3: { velocidad_max: 9.0, aceleracion: 12.0, unidad: '%', stat: 'speed', siempre_activo: false, condicional: 'bajo 50% combustible', desc: '+9% Vel y +12% Acel bajo 50% de combustible' },
                4: { velocidad_max: 12.0, aceleracion: 16.0, unidad: '%', stat: 'speed', siempre_activo: false, condicional: 'bajo 50% combustible', desc: '+12% Vel y +16% Acel bajo 50% de combustible' },
                5: { velocidad_max: 15.0, aceleracion: 20.0, unidad: '%', stat: 'speed', siempre_activo: false, condicional: 'bajo 50% combustible', desc: '+15% Vel y +20% Acel bajo 50% de combustible' }
            }
        },
        m7: {
            mod_id: 'm7',
            mod_name: 'Bengalas Disruptivas (Disruptive Flares)',
            mod_type: 'Señuelos',
            levels: {
                1: { bloqueo_enemigo: 5.0, unidad: '%', stat: 'ecm', siempre_activo: true, desc: 'Disrupción ECM en bengalas +5%' },
                2: { bloqueo_enemigo: 10.0, unidad: '%', stat: 'ecm', siempre_activo: true, desc: 'Disrupción ECM en bengalas +10%' },
                3: { bloqueo_enemigo: 15.0, unidad: '%', stat: 'ecm', siempre_activo: true, desc: 'Disrupción ECM en bengalas +15%' },
                4: { bloqueo_enemigo: 20.0, unidad: '%', stat: 'ecm', siempre_activo: true, desc: 'Disrupción ECM en bengalas +20%' },
                5: { bloqueo_enemigo: 25.0, unidad: '%', stat: 'ecm', siempre_activo: true, desc: 'Disrupción ECM en bengalas +25%' }
            }
        },
        m8: {
            mod_id: 'm8',
            mod_name: 'Bengalas Más Rápidas (Faster Flares)',
            mod_type: 'Señuelos',
            levels: {
                1: { cooldown: -6.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Tiempo de recarga de bengalas -6%' },
                2: { cooldown: -12.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Tiempo de recarga de bengalas -12%' },
                3: { cooldown: -18.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Tiempo de recarga de bengalas -18%' },
                4: { cooldown: -24.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Tiempo de recarga de bengalas -24%' },
                5: { cooldown: -30.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Tiempo de recarga de bengalas -30%' }
            }
        },
        m9: {
            mod_id: 'm9',
            mod_name: 'Armas Aniquiladoras (Finishing Guns)',
            mod_type: 'Arma',
            levels: {
                1: { dano: 5.0, unidad: '%', stat: 'firepower', siempre_activo: false, condicional: 'bajo 30% HP enemigo', desc: '+5% daño contra aeronaves con <30% HP' },
                2: { dano: 10.0, unidad: '%', stat: 'firepower', siempre_activo: false, condicional: 'bajo 30% HP enemigo', desc: '+10% daño contra aeronaves con <30% HP' },
                3: { dano: 15.0, unidad: '%', stat: 'firepower', siempre_activo: false, condicional: 'bajo 30% HP enemigo', desc: '+15% daño contra aeronaves con <30% HP' },
                4: { dano: 20.0, unidad: '%', stat: 'firepower', siempre_activo: false, condicional: 'bajo 30% HP enemigo', desc: '+20% daño contra aeronaves con <30% HP' },
                5: { dano: 25.0, unidad: '%', stat: 'firepower', siempre_activo: false, condicional: 'bajo 30% HP enemigo', desc: '+25% daño contra aeronaves con <30% HP' }
            }
        },
        m10: {
            mod_id: 'm10',
            mod_name: 'Guiado Mejorado (Improved Targeting)',
            mod_type: 'Arma',
            levels: {
                1: { lock_speed: 4.0, lock_angle: 3.0, unidad: '%', stat: 'radar', siempre_activo: true, desc: 'Velocidad de enganche radar +4% y ángulo +3%' },
                2: { lock_speed: 8.0, lock_angle: 6.0, unidad: '%', stat: 'radar', siempre_activo: true, desc: 'Velocidad de enganche radar +8% y ángulo +6%' },
                3: { lock_speed: 12.0, lock_angle: 9.0, unidad: '%', stat: 'radar', siempre_activo: true, desc: 'Velocidad de enganche radar +12% y ángulo +9%' },
                4: { lock_speed: 16.0, lock_angle: 12.0, unidad: '%', stat: 'radar', siempre_activo: true, desc: 'Velocidad de enganche radar +16% y ángulo +12%' },
                5: { lock_speed: 20.0, lock_angle: 15.0, unidad: '%', stat: 'radar', siempre_activo: true, desc: 'Velocidad de enganche radar +20% y ángulo +15%' }
            }
        }
    };
}

/**
 * Obtiene los efectos de un mod específico en un nivel dado
 * @param {Object} effects - Catálogo de efectos de mods
 * @param {string} modId - Identificador del mod (ej: 'm1', 'm3')
 * @param {number} level - Nivel del mod (1-5)
 * @returns {Object|null}
 */
export function getModLevelEffects(effects, modId, level) {
    if (!effects || !modId || !level || level < 1) return null;
    const modKey = String(modId).toLowerCase();
    const modEntry = effects[modKey];
    if (!modEntry || !modEntry.levels) return null;
    return modEntry.levels[level] || null;
}

/**
 * Calcula el multiplicador de bonus que un mod aporta a una estadística específica
 * Solo aplica si el efecto es SIEMPRE ACTIVO y mapea a la estadística consultada.
 * 
 * @param {Object} effects - Catálogo de efectos de mods
 * @param {string} modId - Identificador del mod (ej: 'm1', 'm10')
 * @param {number} level - Nivel del mod (1-5)
 * @param {string} statKey - 'speed', 'agility', 'armor', 'firepower', 'radar', 'ecm'
 * @returns {number} Multiplicador (ej: 1.08 para +8%)
 */
export function calculateModBonus(effects, modId, level, statKey) {
    if (!effects || !modId || !level || level < 1 || !statKey) return 1.0;

    const modLevel = getModLevelEffects(effects, modId, level);
    if (!modLevel) return 1.0;

    // Regla: Los efectos condicionales NO se suman directamente a las stats visibles
    const modKey = String(modId).toLowerCase();

    // Mapeo oficial
    // m1: Giro Temerario → agility (giro %)
    // m2: Maniobrabilidad Ideal → agility (eficiencia %)
    // m3: Resistencia a Explosiones → armor (resistencia_misiles %)
    // m7: Bengalas Disruptivas → ecm (bloqueo_enemigo %)
    // m10: Guiado Mejorado → radar (lock_speed %)
    if (statKey === 'agility') {
        if (modKey === 'm1') {
            const val = modLevel.giro || (typeof modLevel.effects === 'object' ? modLevel.effects.giro : 0) || 0;
            return 1 + (Number(val) / 100);
        }
        if (modKey === 'm2') {
            const val = modLevel.eficiencia || (typeof modLevel.effects === 'object' ? modLevel.effects.eficiencia : 0) || 0;
            return 1 + (Number(val) / 100);
        }
    }

    if (statKey === 'armor') {
        if (modKey === 'm3') {
            const val = modLevel.resistencia_misiles || (typeof modLevel.effects === 'object' ? modLevel.effects.resistencia_misiles : 0) || 0;
            return 1 + (Number(val) / 100);
        }
    }

    if (statKey === 'ecm') {
        if (modKey === 'm7') {
            const val = modLevel.bloqueo_enemigo || (typeof modLevel.effects === 'object' ? modLevel.effects.bloqueo_enemigo : 0) || 0;
            return 1 + (Number(val) / 100);
        }
    }

    if (statKey === 'radar') {
        if (modKey === 'm10') {
            const val = modLevel.lock_speed || (typeof modLevel.effects === 'object' ? modLevel.effects.lock_speed : 0) || 0;
            return 1 + (Number(val) / 100);
        }
    }

    return 1.0;
}

/**
 * Obtiene la descripción legible del efecto de un mod en un nivel
 * @param {Object} effects - Catálogo de efectos
 * @param {string} modId - Identificador del mod
 * @param {number} level - Nivel del mod
 * @returns {string}
 */
export function getModDescription(effects, modId, level) {
    const modLevel = getModLevelEffects(effects, modId, level);
    if (!modLevel) return 'Sin datos de efecto';
    return modLevel.desc || modLevel.description || 'Efecto de combate activo';
}

console.log('✅ [ModEffects] Módulo de efectos de mods inicializado');
