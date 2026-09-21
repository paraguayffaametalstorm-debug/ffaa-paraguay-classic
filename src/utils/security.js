// Utilidades de seguridad: generación de contraseñas temporales
import crypto from 'crypto';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excluye I, O, 0, 1 para evitar confusiones

/**
 * Genera contraseña temporal aleatoria de 12 caracteres
 * Formato: MS-XXXX-XXXX (ej: MS-4K7P-X9Q2)
 * Usa crypto.randomInt para RNG criptográficamente seguro
 */
export function generateTemporaryPassword() {
    const chars = CHARSET;
    let result = 'MS-';
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 4; j++) {
            const randomIndex = crypto.randomInt(0, chars.length);
            result += chars[randomIndex];
        }
        if (i < 1) result += '-';
    }
    // Evitar "123456" en la contraseña
    if (result.includes('123456')) {
        return generateTemporaryPassword();
    }
    return result;
}

/**
 * Genera código de recuperación de 12 caracteres
 * Formato: XXXX-XXXX-XXXX (ej: 7K4P-92QX-8F3M)
 * Usa crypto.randomInt para RNG criptográficamente seguro
 */
export function generateRecoveryCode() {
    const chars = CHARSET;
    let result = '';
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
            const randomIndex = crypto.randomInt(0, chars.length);
            result += chars[randomIndex];
        }
        if (i < 2) result += '-';
    }
    return result;
}

/**
 * Obtiene el siguiente user_id entero incremental de forma ATÓMICA
 * consultando la secuencia PostgreSQL `user_id_seq` vía RPC.
 *
 * HALL-024: Elimina race condition (ya no hace SELECT max + INSERT).
 * HALL-025: Lanza excepción en error (ya no retorna 1).
 *
 * Depende de:
 *   - Secuencia `user_id_seq` en Supabase (creada en sql/025_user_id_sequence.sql).
 *   - Función RPC `get_next_user_id()` en Supabase.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @returns {Promise<number>} Siguiente user_id correlativo entero (atómico)
 * @throws {Error} Si Supabase no está disponible o la RPC falla
 */

/**
 * Calcula la fecha de vencimiento de una credencial temporal.
 * @param {number} days - Días de vigencia (default: 7)
 * @returns {string} ISO 8601 en UTC
 */
export function getTemporaryPasswordExpiry(days = 7) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString();
}

export async function getNextUserId(supabase) {

    if (!supabase) {
        throw new Error('Cliente Supabase no disponible para generar user_id');
    }

    const { data, error } = await supabase.rpc('get_next_user_id');

    if (error) {
        console.error('❌ [getNextUserId] Error invocando RPC get_next_user_id:', error.message);
        throw new Error(`No se pudo obtener el siguiente user_id: ${error.message}`);
    }

    // La RPC devuelve un entero; validación defensiva por si el driver lo envuelve en string
    const nextId = typeof data === 'number' ? data : parseInt(data, 10);

    if (!Number.isInteger(nextId) || nextId <= 0) {
        console.error('❌ [getNextUserId] RPC devolvió un valor inválido:', data);
        throw new Error(`Valor inválido recibido de get_next_user_id(): ${data}`);
    }

    return nextId;
}
