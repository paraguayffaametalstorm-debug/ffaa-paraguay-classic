/**
 * ============================================================================
 * PARAGUAY-FFAA | METALSTORM - UPGRADE EFFECTS HELPER
 * Gestión de efectos numéricos de Upgrades 2.0
 * ============================================================================
 */

import { getSupabase } from '../db/supabase.js';

/**
 * Obtiene todos los efectos de Upgrades 2.0 desde Supabase
 * @param {Object} supabase - Cliente de Supabase (opcional, se obtiene automáticamente)
 * @returns {Object} Efectos agrupados por sistema
 */
export async function getUpgradeEffects(supabase = null) {
    const client = supabase || getSupabase();
    if (!client) {
        console.warn('⚠️ [UpgradeEffects] Supabase no disponible, usando fallback');
        return getFallbackEffects();
    }

    try {
        const { data, error } = await client
            .from('upgrade_effects')
            .select('*')
            .eq('is_active', true)
            .order('sistema', { ascending: true })
            .order('nivel', { ascending: true })
            .order('ruta', { ascending: true });

        if (error) {
            console.error('❌ [UpgradeEffects] Error consultando Supabase:', error.message);
            return getFallbackEffects();
        }

        if (!data || data.length === 0) {
            console.warn('⚠️ [UpgradeEffects] No hay datos en Supabase, usando fallback');
            return getFallbackEffects();
        }

        // Agrupar por sistema → nivel → ruta
        const effects = {};
        data.forEach(e => {
            if (!effects[e.sistema]) effects[e.sistema] = {};
            if (!effects[e.sistema][e.nivel]) effects[e.sistema][e.nivel] = {};
            
            effects[e.sistema][e.nivel][e.ruta] = {
                efecto: e.efecto,
                valor: parseFloat(e.valor),
                unidad: e.unidad,
                penalizacion: e.penalizacion,
                penalizacion_valor: e.penalizacion_valor !== null ? parseFloat(e.penalizacion_valor) : null,
                penalizacion_unidad: e.penalizacion_unidad,
                descripcion: e.descripcion
            };
        });

        console.log('✅ [UpgradeEffects] Efectos cargados desde Supabase');
        return effects;

    } catch (err) {
        console.error('❌ [UpgradeEffects] Excepción:', err.message);
        return getFallbackEffects();
    }
}

/**
 * Fallback de efectos (en caso de que Supabase no esté disponible)
 */
function getFallbackEffects() {
    console.warn('⚠️ [UpgradeEffects] Usando datos de fallback');
    
    return {
        fuselaje: {
            1: { base: { efecto: 'hp', valor: 1.5, unidad: '%' } },
            2: { base: { efecto: 'hp', valor: 3.0, unidad: '%' } },
            3: { base: { efecto: 'hp', valor: 4.5, unidad: '%' } },
            4: { base: { efecto: 'hp', valor: 6.0, unidad: '%' } },
            5: { 
                A: { efecto: 'hp', valor: 8.0, unidad: '%' },
                B: { efecto: 'turn_rate', valor: 1.0, unidad: '°/s', penalizacion: 'hp', penalizacion_valor: -3.0, penalizacion_unidad: '%' }
            },
            6: { base: { efecto: 'hp', valor: 9.5, unidad: '%' } },
            7: {
                A: { efecto: 'hp', valor: 12.0, unidad: '%' },
                B: { efecto: 'turn_rate', valor: 1.5, unidad: '°/s', penalizacion: 'hp', penalizacion_valor: -5.0, penalizacion_unidad: '%' }
            },
            8: { base: { efecto: 'hp', valor: 14.0, unidad: '%' } }
        },
        motor: {
            1: { base: { efecto: 'speed', valor: 1.0, unidad: '%', efecto2: 'accel', valor2: 1.0 } },
            2: { base: { efecto: 'speed', valor: 2.0, unidad: '%', efecto2: 'accel', valor2: 2.0 } },
            3: { base: { efecto: 'speed', valor: 3.0, unidad: '%', efecto2: 'accel', valor2: 3.0 } },
            4: { base: { efecto: 'speed', valor: 4.0, unidad: '%', efecto2: 'accel', valor2: 4.0 } },
            5: {
                A: { efecto: 'afterburner_speed', valor: 6.0, unidad: '%' },
                B: { efecto: 'fuel_regen', valor: 10.0, unidad: '%' }
            },
            6: { base: { efecto: 'speed', valor: 5.5, unidad: '%' } },
            7: {
                A: { efecto: 'speed', valor: 8.0, unidad: '%', penalizacion: 'accel', penalizacion_valor: -4.0 },
                B: { efecto: 'afterburner_capacity', valor: 20.0, unidad: '%' }
            },
            8: { base: { efecto: 'efficiency', valor: 10.0, unidad: '%' } }
        },
        avionica: {
            1: { base: { efecto: 'radar_range', valor: 5.0, unidad: '%' } },
            2: { base: { efecto: 'radar_range', valor: 10.0, unidad: '%' } },
            3: { base: { efecto: 'radar_range', valor: 15.0, unidad: '%' } },
            4: { base: { efecto: 'radar_range', valor: 20.0, unidad: '%' } },
            5: {
                A: { efecto: 'radar_range', valor: 25.0, unidad: '%' },
                B: { efecto: 'missile_warning', valor: 12.5, unidad: '%' }
            },
            6: { base: { efecto: 'radar_range', valor: 30.0, unidad: '%' } },
            7: {
                A: { efecto: 'lock_resistance', valor: 10.0, unidad: '%' },
                B: { efecto: 'flare_cooldown', valor: -15.0, unidad: '%' }
            },
            8: { base: { efecto: 'lock_warning', valor: 50.0, unidad: '%' } }
        },
        armas: {
            1: { base: { efecto: 'dps', valor: 2.0, unidad: '%' } },
            2: { base: { efecto: 'dps', valor: 4.0, unidad: '%' } },
            3: { base: { efecto: 'dps', valor: 6.0, unidad: '%' } },
            4: { base: { efecto: 'dps', valor: 8.0, unidad: '%' } },
            5: {
                A: { efecto: 'damage', valor: 12.0, unidad: '%', penalizacion: 'overheat', penalizacion_valor: 15.0 },
                B: { efecto: 'lock_time', valor: -20.0, unidad: '%' }
            },
            6: { base: { efecto: 'projectile_speed', valor: 10.0, unidad: '%' } },
            7: {
                A: { efecto: 'lock_range', valor: 15.0, unidad: '%' },
                B: { efecto: 'spread', valor: -25.0, unidad: '%' }
            },
            8: { base: { efecto: 'dps', valor: 15.0, unidad: '%' } }
        }
    };
}

/**
 * Calcula el bonus total de un sistema según el nivel y la ruta.
 * Los niveles 1-4 son acumulativos (siempre base).
 * Los niveles 5 y 7 son de elección (A o B), NO acumulativos entre sí.
 * El nivel 6 es acumulativo (base).
 * El nivel 8 es acumulativo (base).
 * 
 * @param {Object} effects - Efectos cargados
 * @param {string} sistema - 'fuselaje', 'motor', 'avionica', 'armas'
 * @param {number} nivel - Nivel actual (0-8)
 * @param {string} ruta - 'A' o 'B' (ruta elegida para niveles 5 y 7)
 * @returns {number} Multiplicador total (ej: 1.14 para +14%)
 */
export function calculateSystemBonus(effects, sistema, nivel, ruta = 'A') {
    if (!effects || !effects[sistema] || !nivel || nivel === 0) {
        return 1.0;
    }

    const sistemaEffects = effects[sistema];
    let totalBonus = 0;

    for (let i = 1; i <= nivel; i++) {
        const levelEffects = sistemaEffects[i];
        if (!levelEffects) continue;

        // Niveles 5 y 7: elegir ruta A o B (NO acumulativo entre rutas)
        if (i === 5 || i === 7) {
            const routeEffects = levelEffects[ruta];
            if (routeEffects) {
                totalBonus += routeEffects.valor || 0;
            }
        } else {
            // Niveles 1-4, 6, 8: acumulativo base
            const baseEffects = levelEffects.base;
            if (baseEffects) {
                totalBonus += baseEffects.valor || 0;
                // Si tiene efecto2 (como motor con speed + accel), también sumar
                if (baseEffects.efecto2 && baseEffects.valor2) {
                    totalBonus += baseEffects.valor2 || 0;
                }
            }
        }
    }

    return 1 + (totalBonus / 100);
}

console.log('✅ [UpgradeEffects] Módulo inicializado');
