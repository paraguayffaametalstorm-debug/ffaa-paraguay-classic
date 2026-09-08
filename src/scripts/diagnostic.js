// src/scripts/diagnostic.js
// Script profesional de diagnóstico
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function diagnostic() {
  console.log('🔍 DIAGNÓSTICO DEL SISTEMA');
  console.log('═'.repeat(50));
  
  // 1. Verificar conexión
  console.log('\n📡 Conexión a Supabase:');
  const { data: test, error: testError } = await supabase
    .from('users')
    .select('count', { count: 'exact' });
  
  if (testError) {
    console.log('❌ Error de conexión:', testError.message);
    return;
  }
  console.log('✅ Conexión exitosa');
  
  // 2. Usuarios
  console.log('\n👥 USUARIOS:');
  const { data: users } = await supabase
    .from('users')
    .select('nick, email, role')
    .order('nick');
  
  console.log(`Total: ${users.length}`);
  console.log('Roles:', users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {}));
  
  // 3. Pilotos activos (con contraseña)
  const { data: active } = await supabase
    .from('users')
    .select('nick')
    .not('password_hash', 'is', null);
  
  console.log(`\n✈️  Pilotos activos: ${active.length}`);
  
  // 4. Verificar últimos registros
  console.log('\n📊 Últimos 5 pilotos registrados:');
  users.slice(-5).forEach(u => {
    console.log(`  ${u.nick} (${u.role})`);
  });
  
  // 5. Recomendaciones
  console.log('\n💡 RECOMENDACIONES:');
  if (users.length < 57) {
    console.log('⚠️  Faltan pilotos por registrar');
  }
  if (active.length < users.length) {
    console.log('⚠️  Algunos pilotos no tienen contraseña');
  }
  
  console.log('\n✅ Diagnóstico completado');
}

diagnostic().catch(console.error);