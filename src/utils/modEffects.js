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
 * Datos oficiales extraídos de https://metalstorm.wiki.gg/wiki/Aircraft_Mods
 * Fecha de extracción: 2026-09-12
 */
export function getFallbackModEffects() {
    console.warn('⚠️ [ModEffects] Usando datos de respaldo de mods');

    return {
        m1: {
            mod_id: 'm1',
            mod_name: 'Giro Temerario (Daredevil Turning)',
            mod_type: 'Agilidad',
            levels: {
                1: { giro: 10.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Velocidad de giro +10%' },
                2: { giro: 13.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Velocidad de giro +13%' },
                3: { giro: 15.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Velocidad de giro +15%' },
                4: { giro: 17.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Velocidad de giro +17%' },
                5: { giro: 20.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Velocidad de giro +20%' }
            }
        },
        m2: {
            mod_id: 'm2',
            mod_name: 'Maniobrabilidad Ideal (Ideal Maneuvering)',
            mod_type: 'Agilidad',
            levels: {
                1: { eficiencia: 15.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Eficiencia de viraje +15%' },
                2: { eficiencia: 20.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Eficiencia de viraje +20%' },
                3: { eficiencia: 25.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Eficiencia de viraje +25%' },
                4: { eficiencia: 30.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Eficiencia de viraje +30%' },
                5: { eficiencia: 35.0, unidad: '%', stat: 'agility', siempre_activo: true, desc: 'Eficiencia de viraje +35%' }
            }
        },
        m3: {
            mod_id: 'm3',
            mod_name: 'Resistencia a las Explosiones (Blast Resistance)',
            mod_type: 'Defensa',
            levels: {
                1: { resistencia_misiles: 10.0, unidad: '%', stat: 'armor', siempre_activo: true, desc: 'Resistencia a daño por misiles -10%' },
                2: { resistencia_misiles: 13.0, unidad: '%', stat: 'armor', siempre_activo: true, desc: 'Resistencia a daño por misiles -13%' },
                3: { resistencia_misiles: 15.0, unidad: '%', stat: 'armor', siempre_activo: true, desc: 'Resistencia a daño por misiles -15%' },
                4: { resistencia_misiles: 17.0, unidad: '%', stat: 'armor', siempre_activo: true, desc: 'Resistencia a daño por misiles -17%' },
                5: { resistencia_misiles: 20.0, unidad: '%', stat: 'armor', siempre_activo: true, desc: 'Resistencia a daño por misiles -20%' }
            }
        },
        m4: {
            mod_id: 'm4',
            mod_name: 'Blindaje de Ataque / Racha (Streak Armor)',
            mod_type: 'Defensa',
            levels: {
                1: { armadura_por_kill: 30, unidad: 'HP', stat: 'armor', siempre_activo: false, condicional: 'solo con kills', desc: '+30 HP temporal por derribo' },
                2: { armadura_por_kill: 35, unidad: 'HP', stat: 'armor', siempre_activo: false, condicional: 'solo con kills', desc: '+35 HP temporal por derribo' },
                3: { armadura_por_kill: 40, unidad: 'HP', stat: 'armor', siempre_activo: false, condicional: 'solo con kills', desc: '+40 HP temporal por derribo' },
                4: { armadura_por_kill: 45, unidad: 'HP', stat: 'armor', siempre_activo: false, condicional: 'solo con kills', desc: '+45 HP temporal por derribo' },
                5: { armadura_por_kill: 50, unidad: 'HP', stat: 'armor', siempre_activo: false, condicional: 'solo con kills', desc: '+50 HP temporal por derribo' }
            }
        },
        m5: {
            mod_id: 'm5',
            mod_name: 'Quemadores Auxiliares Eficientes (Efficient Afterburners)',
            mod_type: 'Motor',
            levels: {
                1: { consumo_combustible: -10.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Consumo de postcombustión -10%' },
                2: { consumo_combustible: -13.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Consumo de postcombustión -13%' },
                3: { consumo_combustible: -15.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Consumo de postcombustión -15%' },
                4: { consumo_combustible: -17.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Consumo de postcombustión -17%' },
                5: { consumo_combustible: -20.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Consumo de postcombustión -20%' }
            }
        },
        m6: {
            mod_id: 'm6',
            mod_name: 'Máxima Propulsión (Thrust Booster)',
            mod_type: 'Motor',
            levels: {
                1: { velocidad_max: 10.0, aceleracion: 10.0, unidad: '%', stat: 'speed', siempre_activo: false, condicional: 'bajo 50% combustible', desc: '+10% Vel y +10% Acel bajo 50% de combustible' },
                2: { velocidad_max: 10.0, aceleracion: 15.0, unidad: '%', stat: 'speed', siempre_activo: false, condicional: 'bajo 50% combustible', desc: '+10% Vel y +15% Acel bajo 50% de combustible' },
                3: { velocidad_max: 10.0, aceleracion: 20.0, unidad: '%', stat: 'speed', siempre_activo: false, condicional: 'bajo 50% combustible', desc: '+10% Vel y +20% Acel bajo 50% de combustible' },
                4: { velocidad_max: 10.0, aceleracion: 25.0, unidad: '%', stat: 'speed', siempre_activo: false, condicional: 'bajo 50% combustible', desc: '+10% Vel y +25% Acel bajo 50% de combustible' },
                5: { velocidad_max: 10.0, aceleracion: 30.0, unidad: '%', stat: 'speed', siempre_activo: false, condicional: 'bajo 50% combustible', desc: '+10% Vel y +30% Acel bajo 50% de combustible' }
            }
        },
        m7: {
            mod_id: 'm7',
            mod_name: 'Bengalas Disruptivas (Disruptive Flares)',
            mod_type: 'Señuelos',
            levels: {
                1: { bloqueo_enemigo: 30.0, unidad: '%', stat: 'ecm', siempre_activo: true, desc: 'Bloqueo enemigo -30% mientras usás bengalas' },
                2: { bloqueo_enemigo: 38.0, unidad: '%', stat: 'ecm', siempre_activo: true, desc: 'Bloqueo enemigo -38% mientras usás bengalas' },
                3: { bloqueo_enemigo: 45.0, unidad: '%', stat: 'ecm', siempre_activo: true, desc: 'Bloqueo enemigo -45% mientras usás bengalas' },
                4: { bloqueo_enemigo: 52.0, unidad: '%', stat: 'ecm', siempre_activo: true, desc: 'Bloqueo enemigo -52% mientras usás bengalas' },
                5: { bloqueo_enemigo: 60.0, unidad: '%', stat: 'ecm', siempre_activo: true, desc: 'Bloqueo enemigo -60% mientras usás bengalas' }
            }
        },
        m8: {
            mod_id: 'm8',
            mod_name: 'Bengalas Más Rápidas (Faster Flares)',
            mod_type: 'Señuelos',
            levels: {
                1: { cooldown: -40.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Tiempo de recarga de bengalas -40%' },
                2: { cooldown: -45.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Tiempo de recarga de bengalas -45%' },
                3: { cooldown: -50.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Tiempo de recarga de bengalas -50%' },
                4: { cooldown: -55.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Tiempo de recarga de bengalas -55%' },
                5: { cooldown: -60.0, unidad: '%', stat: null, siempre_activo: true, desc: 'Tiempo de recarga de bengalas -60%' }
            }
        },
        m9: {
            mod_id: 'm9',
            mod_name: 'Armas Aniquiladoras (Finishing Guns)',
            mod_type: 'Arma',
            levels: {
                1: { dano: 20.0, unidad: '%', stat: 'firepower', siempre_activo: false, condicional: 'bajo 30% HP enemigo', desc: '+20% daño contra aeronaves con <30% HP' },
                2: { dano: 22.0, unidad: '%', stat: 'firepower', siempre_activo: false, condicional: 'bajo 30% HP enemigo', desc: '+22% daño contra aeronaves con <30% HP' },
                3: { dano: 25.0, unidad: '%', stat: 'firepower', siempre_activo: false, condicional: 'bajo 30% HP enemigo', desc: '+25% daño contra aeronaves con <30% HP' },
                4: { dano: 28.0, unidad: '%', stat: 'firepower', siempre_activo: false, condicional: 'bajo 30% HP enemigo', desc: '+28% daño contra aeronaves con <30% HP' },
                5: { dano: 30.0, unidad: '%', stat: 'firepower', siempre_activo: false, condicional: 'bajo 30% HP enemigo', desc: '+30% daño contra aeronaves con <30% HP' }
            }
        },
        m10: {
            mod_id: 'm10',
            mod_name: 'Guiado Mejorado (Improved Targeting)',
            mod_type: 'Arma',
            levels: {
                1: { lock_speed: 10.0, lock_angle: 15.0, rocket_lead_range: 15.0, unidad: '%', stat: 'radar', siempre_activo: true, desc: 'Lock Speed +10%, Lock Angle +15%, Rocket Lead +15%' },
                2: { lock_speed: 13.0, lock_angle: 17.0, rocket_lead_range: 17.0, unidad: '%', stat: 'radar', siempre_activo: true, desc: 'Lock Speed +13%, Lock Angle +17%, Rocket Lead +17%' },
                3: { lock_speed: 15.0, lock_angle: 20.0, rocket_lead_range: 25.0, unidad: '%', stat: 'radar', siempre_activo: true, desc: 'Lock Speed +15%, Lock Angle +20%, Rocket Lead +25%' },
                4: { lock_speed: 17.0, lock_angle: 22.0, rocket_lead_range: 28.0, unidad: '%', stat: 'radar', siempre_activo: true, desc: 'Lock Speed +17%, Lock Angle +22%, Rocket Lead +28%' },
                5: { lock_speed: 20.0, lock_angle: 25.0, rocket_lead_range: 30.0, unidad: '%', stat: 'radar', siempre_activo: true, desc: 'Lock Speed +20%, Lock Angle +25%, Rocket Lead +30%' }
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
