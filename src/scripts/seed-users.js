// src/scripts/seed-users.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Datos de los pilotos (solo los que faltan)
const PILOTS_TO_ADD = [
  { 
    nick: 'PRY_Aguila', 
    email: 'aguila@ffaa.py', 
    role: 'ADMIN',
    // Sin id - Supabase lo generará automáticamente como UUID
  },
  // Agrega aquí los pilotos que faltan
];

async function seedUsers() {
  console.log('🔄 Verificando usuarios en Supabase...');
  
  // Obtener emails existentes
  const { data: existing } = await supabase
    .from('users')
    .select('email');

  const existingEmails = new Set(existing?.map(u => u.email) || []);
  console.log(`📊 Usuarios existentes: ${existingEmails.size}`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  // Solo agregar los que no existen
  for (const pilot of PILOTS_TO_ADD) {
    if (existingEmails.has(pilot.email)) {
      console.log(`⏭️  Saltando: ${pilot.nick} (${pilot.email})`);
      skipped++;
      continue;
    }

    try {
      const { error } = await supabase
        .from('users')
        .insert([{
          nick: pilot.nick,
          email: pilot.email,
          role: pilot.role || 'USER',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;
      
      console.log(`✅ Creado: ${pilot.nick} (${pilot.email})`);
      created++;
    } catch (error) {
      console.error(`❌ Error con ${pilot.nick}:`, error.message);
      errors++;
    }
  }

  // Verificar total final
  const { data: final } = await supabase
    .from('users')
    .select('count');
    
  console.log('\n📊 RESUMEN FINAL:');
  console.log(`✅ Creados: ${created}`);
  console.log(`⏭️  Saltados: ${skipped}`);
  console.log(`❌ Errores: ${errors}`);
  console.log(`📊 Total en Supabase: ${final?.[0]?.count || existingEmails.size}`);
}

seedUsers().catch(console.error);