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
 * Obtiene el siguiente user_id entero incremental consultando el valor máximo actual en la tabla users
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Cliente de Supabase
 * @returns {Promise<number>} Siguiente user_id correlativo entero
 */
export async function getNextUserId(supabase) {
    if (!supabase) {
        throw new Error('Cliente Supabase no disponible para generar user_id');
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .select('user_id')
            .not('user_id', 'is', null)
            .order('user_id', { ascending: false })
            .limit(1);

        if (error) {
            console.error('⚠️ [getNextUserId] Error consultando user_id máximo:', error.message);
            return 1;
        }

        const maxUserId = (data && data.length > 0 && data[0].user_id != null)
            ? parseInt(data[0].user_id, 10)
            : 0;

        return (Number.isInteger(maxUserId) && maxUserId > 0 ? maxUserId : 0) + 1;
    } catch (err) {
        console.error('⚠️ [getNextUserId] Excepción al obtener siguiente user_id:', err);
        return 1;
    }
}
