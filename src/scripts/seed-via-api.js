// src/scripts/seed-via-api.js
import dotenv from 'dotenv';
dotenv.config();

// Datos de los pilotos que quieres agregar
const PILOTS_TO_ADD = [
  { nick: 'PRY_Aguila', email: 'aguila@ffaa.py', role: 'ADMIN' },
  // Agrega aquí los pilotos que falten
];

async function seedViaAPI() {
  // Primero obtener token de admin
  const loginRes = await fetch('https://paraguay-ffaa-metalstorm.fly.dev/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'pjpirovani@ffaa.py',
      password: process.env.ADMIN_PASSWORD || 'tu_contraseña'
    })
  });
  
  const { token } = await loginRes.json();
  
  for (const pilot of PILOTS_TO_ADD) {
    try {
      const res = await fetch('https://paraguay-ffaa-metalstorm.fly.dev/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pilot)
      });
      
      if (res.ok) {
        console.log(`✅ Creado: ${pilot.nick}`);
      } else {
        const error = await res.json();
        console.log(`⏭️  ${pilot.nick}: ${error.message || 'Ya existe'}`);
      }
    } catch (e) {
      console.error(`❌ Error con ${pilot.nick}:`, e.message);
    }
  }
}

seedViaAPI();