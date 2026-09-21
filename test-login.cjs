/**
 * test-login.cjs — Diagnóstico del flujo de login.
 * Uso: node test-login.cjs <nick-o-email> <password>
 */

const IDENTIFIER = process.argv[2];
const PASSWORD = process.argv[3];

if (!IDENTIFIER || !PASSWORD) {
  console.error('❌ Uso: node test-login.cjs <nick-o-email> <password>');
  console.error('   Ejemplo: node test-login.cjs TestPilot MS-MZGP-S5D9');
  process.exit(1);
}

const API_URL = 'https://paraguay-ffaa-metalstorm.fly.dev';

(async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 TEST DE LOGIN — Diagnóstico C4ISR');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Identificador:', IDENTIFIER);
  console.log('Password length:', PASSWORD.length);
  console.log('Password prefix:', PASSWORD.substring(0, 8) + '...');
  console.log('API:', API_URL);
  console.log('');

  console.log('[TEST] POST /api/auth/login');
  console.log('');

  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: IDENTIFIER, password: PASSWORD })
    });
    const data = await res.json();

    console.log('  → HTTP Status:', res.status);
    console.log('  → Response Body:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (res.ok && data.token) {
      console.log('  ✅ LOGIN EXITOSO');
      console.log('  → user_id:', data.user?.user_id);
      console.log('  → nick:', data.user?.nick);
      console.log('  → role:', data.user?.role);
      console.log('  → must_change_password:', data.user?.must_change_password);
      console.log('  → token_version:', data.user?.token_version);
      console.log('  → temporary_password_expires_at:', data.user?.temporary_password_expires_at);
      console.log('  → token (primeros 40 chars):', data.token?.substring(0, 40) + '...');
    } else {
      console.log('  ❌ LOGIN FALLÓ');
      console.log('  → error:', data.error || data.message || '(sin mensaje)');
      console.log('  → code:', data.code || '(sin código)');
    }
  } catch (e) {
    console.log('  ❌ Error de red:', e.message);
    console.log('  Stack:', e.stack);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
})();