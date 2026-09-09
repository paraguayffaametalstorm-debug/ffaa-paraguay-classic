-- ============================================================================
-- PARAGUAY-FFAA | METALSTORM v3.7.0
-- MIGRACIÓN DE DATOS: ASIGNACIÓN DE user_id NUMÉRICO A USUARIOS EXISTENTES
-- ============================================================================
-- Objetivo:
-- Asignar user_id (INTEGER) único y secuencial a todos los usuarios que actualmente
-- tienen user_id en NULL, sin modificar la estructura DDL de la base de datos
-- (sin ALTER TABLE, sin agregar DEFAULT ni secuencias permanentes a la tabla).
-- ============================================================================

DO $$
DECLARE
    current_max_id INTEGER;
    user_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    -- 1. Obtener el user_id numérico más alto registrado actualmente en la tabla users
    SELECT COALESCE(MAX(user_id), 0) INTO current_max_id FROM users;
    
    RAISE NOTICE '⚡ Iniciando asignación de user_id correlativo militar. user_id actual máximo: %', current_max_id;

    -- 2. Recorrer en orden cronológico a los usuarios con user_id NULL
    FOR user_record IN 
        SELECT id, nick, email 
        FROM users 
        WHERE user_id IS NULL 
        ORDER BY created_at ASC NULLS LAST, id ASC
    LOOP
        current_max_id := current_max_id + 1;
        updated_count := updated_count + 1;
        
        UPDATE users 
        SET user_id = current_max_id,
            updated_at = NOW()
        WHERE id = user_record.id;
        
        RAISE NOTICE '✅ Piloto % (%) asignado con user_id: %', user_record.nick, user_record.email, current_max_id;
    END LOOP;

    RAISE NOTICE '🎯 Migración completada exitosamente. Total registros corregidos: %. Nuevo user_id máximo: %', updated_count, current_max_id;
END $$;

-- ============================================================================
-- VERIFICACIÓN DE RESULTADOS
-- Ejecutar para comprobar que ya no existen pilotos con user_id NULL
-- ============================================================================
SELECT 
    id, 
    user_id, 
    nick, 
    email, 
    role, 
    status, 
    created_at 
FROM users 
ORDER BY user_id ASC;
