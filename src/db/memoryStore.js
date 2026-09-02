// src/db/memoryStore.js
// Datos de los 57 pilotos de FFAA Paraguay

export const memoryStore = {
  users: [
    { id: 1, nick: 'PRY_Comandante', email: 'pjpirovani@ffaa.py', role: 'OWNER', password_hash: 'hashed_password_here' },
    { id: 2, nick: 'PRY_Aguila', email: 'aguila@ffaa.py', role: 'ADMIN', password_hash: 'hashed_password_here' },
    // ... 55 pilotos más
    // (La lista completa debería estar aquí)
  ],
  performances: [],
  events: [],
  planes: []
};