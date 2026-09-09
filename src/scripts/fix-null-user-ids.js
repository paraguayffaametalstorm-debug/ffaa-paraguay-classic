// src/scripts/fix-null-user-ids.js
// PARAGUAY-FFAA | METALSTORM v3.7.0
// Script de utilidad para asignar user_id a usuarios existentes con user_id NULL
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables SUPABASE_URL o SUPABASE_KEY no configuradas en el entorno.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNullUserIds() {
  console.log('🔄 Iniciando auditoría y corrección de user_id en tabla users...');
  
  // 1. Obtener el user_id numérico más alto
  const { data: maxUserData, error: maxError } = await supabase
    .from('users')
    .select('user_id')
    .not('user_id', 'is', null)
    .order('user_id', { ascending: false })
    .limit(1);

  if (maxError) {
    console.error('❌ Error al consultar user_id máximo:', maxError);
    process.exit(1);
  }

  const initialMax = (maxUserData && maxUserData.length > 0 && maxUserData[0].user_id != null)
    ? parseInt(maxUserData[0].user_id, 10)
    : 0;

  let currentUserId = (Number.isInteger(initialMax) && initialMax > 0 ? initialMax : 0);
  console.log(`📊 user_id numérico actual máximo: ${currentUserId}`);

  // 2. Obtener usuarios con user_id NULL
  const { data: nullUsers, error: fetchError } = await supabase
    .from('users')
    .select('id, nick, email, role, created_at')
    .is('user_id', null)
    .order('created_at', { ascending: true, nullsFirst: false });

  if (fetchError) {
    console.error('❌ Error al obtener usuarios con user_id NULL:', fetchError);
    process.exit(1);
  }

  if (!nullUsers || nullUsers.length === 0) {
    console.log('✅ Excelente: No hay usuarios con user_id NULL. Todo el sistema está sincronizado.');
    process.exit(0);
  }

  console.log(`⚠️ Se encontraron ${nullUsers.length} usuario(s) con user_id NULL. Asignando correlativos...`);

  let updatedCount = 0;
  for (const user of nullUsers) {
    currentUserId++;
    const { error: updateError } = await supabase
      .from('users')
      .update({
        user_id: currentUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ Error actualizando usuario ${user.nick} (${user.id}):`, updateError.message);
    } else {
      console.log(`  ✅ [user_id: ${currentUserId}] ${user.nick} (${user.email || 'sin email'})`);
      updatedCount++;
    }
  }

  console.log(`\n🎉 Migración finalizada: ${updatedCount}/${nullUsers.length} pilotos corregidos.`);
  console.log(`📈 Nuevo user_id máximo en el sistema: ${currentUserId}`);
}

fixNullUserIds().catch(err => {
  console.error('❌ Error no controlado en migración:', err);
  process.exit(1);
});
