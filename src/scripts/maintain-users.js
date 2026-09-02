// src/scripts/maintain-users.js
// Script profesional de mantenimiento de usuarios
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const DEFAULT_PASSWORD = 'MetalStorm2026!';

async function maintainUsers() {
  console.log('🔄 INICIANDO MANTENIMIENTO DE USUARIOS');
  console.log('═'.repeat(50));
  
  // 1. Obtener todos los usuarios
  const { data: users, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) throw error;
  
  console.log(`📊 Total usuarios: ${users.length}`);
  
  // 2. Verificar integridad
  let needsPassword = 0;
  let needsRole = 0;
  let validUsers = 0;
  
  for (const user of users) {
    if (!user.password_hash) {
      needsPassword++;
      console.log(`⚠️  ${user.nick}: sin contraseña`);
    }
    if (!user.role) {
      needsRole++;
      console.log(`⚠️  ${user.nick}: sin rol`);
    }
    if (user.password_hash && user.role) {
      validUsers++;
    }
  }
  
  console.log('\n📊 ESTADÍSTICAS:');
  console.log(`✅ Usuarios válidos: ${validUsers}`);
  console.log(`⚠️  Sin contraseña: ${needsPassword}`);
  console.log(`⚠️  Sin rol: ${needsRole}`);
  
  // 3. Generar reporte
  console.log('\n📋 REPORTE DE ROLES:');
  const roles = {};
  users.forEach(u => {
    const role = u.role || 'SIN_ROLE';
    roles[role] = (roles[role] || 0) + 1;
  });
  Object.entries(roles).forEach(([role, count]) => {
    console.log(`  ${role}: ${count}`);
  });
  
  console.log('\n✅ Mantenimiento completado');
}

maintainUsers().catch(console.error);