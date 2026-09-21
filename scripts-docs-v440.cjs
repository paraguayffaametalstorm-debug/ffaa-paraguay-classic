/**
 * scripts-docs-v440.cjs
 * Aplica los cambios de documentación de v4.4.0 en 6 archivos.
 * Uso: node scripts-docs-v440.cjs
 * 
 * Normaliza EOL, hace backup, verifica idempotencia.
 * Reporta éxito/fallo por bloque.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

function readFile(file) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) return { ok: false, error: `No existe: ${file}` };
    return { ok: true, content: fs.readFileSync(full, 'utf8') };
}

function normalize(str) {
    return str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function backup(file, content) {
    const full = path.join(ROOT, file);
    const bkp = `${full}.bak-${TIMESTAMP}`;
    fs.writeFileSync(bkp, content, 'utf8');
    return path.basename(bkp);
}

function applyChange({ file, id, search, replace }) {
    console.log(`\n━━━ [${file}] → ${id} ━━━`);
    
    const r = readFile(file);
    if (!r.ok) { console.error(`  ❌ ${r.error}`); return false; }

    const original = r.content;
    const normOrig = normalize(original);
    const normSearch = normalize(search);
    const normReplace = normalize(replace);

    // Idempotencia: si el bloque ya fue aplicado, saltear
    if (normOrig.includes(normReplace)) {
        console.log('  ⏭️  Ya aplicado. Salteando.');
        return true;
    }

    // Verificar que exista el bloque de búsqueda
    if (!normOrig.includes(normSearch)) {
        console.error('  ❌ Bloque de búsqueda no encontrado.');
        console.error('  → Primeros 200 chars buscados:');
        console.error(normSearch.substring(0, 200));
        return false;
    }

    // Backup + escribir
    const bkp = backup(file, original);
    console.log(`  💾 Backup: ${bkp}`);

    const newContent = normOrig.replace(normSearch, normReplace);
    fs.writeFileSync(path.join(ROOT, file), newContent, 'utf8');
    console.log('  ✅ Modificado.');
    return true;
}

// ============================================================================
// BLOQUES
// ============================================================================

const CHANGES = [

    // ─────────────────────────────────────────────────────────────────────
    // 1. CHANGELOG.md — Agregar entrada [4.4.0]
    // ─────────────────────────────────────────────────────────────────────
    {
        file: 'CHANGELOG.md',
        id: 'Agregar entrada [4.4.0]',
        search: `El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## 📌 [4.3.1] - 2026-09-21`,
        replace: `El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## 📌 [4.4.0] - 2026-09-21

### 🔐 Credenciales temporales con vencimiento + QR de acceso rápido

#### Objetivo Cumplido

Añadir **vencimiento de 7 días** a las contraseñas temporales \`MS-XXXX-XXXX\` y un **código QR** en la credencial JPG que permite al piloto abrir la app con el nick y la contraseña temporal precargados. Además, ampliar el login para aceptar el **nick** como identificador válido.

#### Cambios Backend

| Archivo | Cambio |
|---|---|
| \`sql/035_temporary_password_expiry.sql\` | NUEVO. Columna \`temporary_password_expires_at\` en \`users\`. |
| \`src/config/env.js\` | Nuevo \`TEMP_PASSWORD_EXPIRY_DAYS\` (default: 7). |
| \`src/utils/security.js\` | Nueva función \`getTemporaryPasswordExpiry(days)\`. |
| \`src/controllers/admin.controller.js\` | \`addMember()\` persiste \`temporary_password_expires_at\` + auditoría \`INITIAL_CREDENTIAL_GENERATED\`. |
| \`src/routes/admin.routes.js\` | \`/reset-password\` persiste \`temporary_password_expires_at\` + auditoría \`ADMIN_PASSWORD_RESET\` + devuelve \`expiresAt\`. |
| \`src/controllers/auth.controller.js\` | Login rechaza credencial vencida (\`TEMPORARY_CREDENTIAL_EXPIRED\`). Login acepta \`nick\` como identificador. \`changePassword()\` limpia \`temporary_password_expires_at\`. |

#### Cambios Frontend

| Archivo | Cambio |
|---|---|
| \`index.html\` | Carga \`qrcode.min.js\`. \`?v=4.2.6\` → \`?v=4.4.0\`. |
| \`js/views.js\` | \`showTemporaryPasswordModal()\` renderiza QR + línea de vencimiento. \`downloadCredentialImage()\` captura el QR. |
| \`js/auth.js\` | IIFE \`prefillLoginFromQr()\` precarga nick + contraseña desde URL. \`showLoginModal()\` respeta la precarga. \`login()\` limpia \`sessionStorage\`. |
| \`sw.js\` | \`CACHE_NAME\` → \`v4.4.0-credential-qr\`. |

#### Flujo QR

\`\`\`
ESCANEAR QR → ABRIR APP con /?nick={nick}&temp_pass={pass}
→ FRONTEND precarga los campos (NO auto-login)
→ USUARIO pulsa "Iniciar Sesión Táctica"
→ BACKEND valida credencial (no vencida)
→ FUERZA cambio de contraseña
\`\`\`

#### Auditoría

Nuevos eventos en \`audit_logs\`:
- \`INITIAL_CREDENTIAL_GENERATED\` — al crear un nuevo piloto.
- \`ADMIN_PASSWORD_RESET\` — al resetear desde el panel admin.

Campos: \`actor_user_id\`, \`target_user_id\`, \`credential_type\`, \`credential_version\`, \`expires_at\`. **No se registra la contraseña en texto plano.**

#### Fix adicional: login acepta nick

El login ahora busca por \`email\`, \`email_institucional\` **o \`nick\`**. Esto permite que el QR use el nick (más legible) y simplifica el login en general.

#### Verificación

- ✅ QR abre la app y precarga los campos.
- ✅ Credencial temporal funciona 7 días.
- ✅ Cambio obligatorio tras primer login.
- ✅ Invalidación post-cambio (\`token_version\`).
- ✅ Login con email, email institucional, Gmail vinculado o nick.
- ✅ Auditoría completa sin exponer contraseñas.

---

## 📌 [4.3.1] - 2026-09-21`
    },

    // ─────────────────────────────────────────────────────────────────────
    // 2. API_REFERENCE.md — Login acepta nick (nota)
    // ─────────────────────────────────────────────────────────────────────
    {
        file: 'API_REFERENCE.md',
        id: 'Login acepta nick (nota)',
        search: `- **Request Body:**
  \`\`\`json
  {
    "email": "piloto@ffaa.py",
    "password": "PasswordSeguro2026!"
  }
  \`\`\`
- **Response Exitosa (200 OK):**`,
        replace: `- **Request Body:**
  \`\`\`json
  {
    "email": "piloto@ffaa.py",
    "password": "PasswordSeguro2026!"
  }
  \`\`\`
  *(El campo \`email\` acepta también el **nick** del piloto, su email institucional \`@ffaa.py\` o su Gmail vinculado. Añadido en v4.4.0 para soportar el login asistido por QR.)*

- **Errores Posibles (v4.4.0):**
  - \`401 Unauthorized\` con \`code: 'TEMPORARY_CREDENTIAL_EXPIRED'\` si la contraseña temporal venció (7 días por defecto).

- **Response Exitosa (200 OK):**`
    },

    // ─────────────────────────────────────────────────────────────────────
    // 3. ARCHITECTURE.md — Sección 6.6b
    // ─────────────────────────────────────────────────────────────────────
    {
        file: 'ARCHITECTURE.md',
        id: 'Nueva sección §6.6b (pipeline credenciales)',
        search: `**Auditoría:** Todos los eventos se registran en \`security_events\` (\`PASSWORD_RESET_REQUESTED\`, \`PASSWORD_RESET_SUCCESS\`).

### 6.7 Mensaje Enriquecido al Bloquear Usuarios Inactivos`,
        replace: `**Auditoría:** Todos los eventos se registran en \`security_events\` (\`PASSWORD_RESET_REQUESTED\`, \`PASSWORD_RESET_SUCCESS\`).

### 6.6b Ciclo de Vida de Credenciales Temporales (v4.4.0)

A partir de v4.4.0, las contraseñas temporales \`MS-XXXX-XXXX\` tienen **vencimiento de 7 días** (configurable con \`TEMP_PASSWORD_EXPIRY_DAYS\`).

**Pipeline completo:**

\`\`\`
1. ADMIN crea usuario o resetea contraseña
   POST /api/admin/members  o  /api/admin/users/:id/reset-password
   ✅ Genera tempPassword = MS-XXXX-XXXX
   ✅ Calcula expires_at = NOW() + 7 días
   ✅ bcrypt.hash(tempPassword, 10)
   ✅ UPDATE users: password_hash, must_change_password=true,
                    temporary_password_expires_at, token_version++
   ✅ Auditoría: INITIAL_CREDENTIAL_GENERATED o ADMIN_PASSWORD_RESET
   ✅ Respuesta incluye tempPassword + expiresAt
        ↓
2. FRONTEND genera credencial con QR
   ✅ Modal muestra tempPassword + fecha de vencimiento
   ✅ QRCode.js genera QR con /?nick={nick}&temp_pass={pass}
   ✅ html2canvas captura el JPG con el QR embebido
        ↓
3. PILOTO escanea el QR
   ✅ Abre /?nick={nick}&temp_pass={pass}
   ✅ IIFE prefillLoginFromQr() precarga los inputs (NO auto-login)
   ✅ Usuario pulsa "Iniciar Sesión Táctica"
        ↓
4. BACKEND valida el login
   ✅ Busca por email, email_institucional o nick
   ✅ bcrypt.compare(tempPassword, password_hash)
   ✅ Verifica must_change_password + temporary_password_expires_at
   ⚠️ Si NOW() > expires_at → 401 TEMPORARY_CREDENTIAL_EXPIRED
        ↓
5. PILOTO cambia la contraseña
   POST /api/auth/change-password
   ✅ UPDATE users: password_hash, must_change_password=false,
                    temporary_password_expires_at=NULL, token_version++
        ↓
6. TEMPORAL INVALIDADA
   ✅ password_hash ya no corresponde a la temporal
   ✅ must_change_password = false
   ✅ temporary_password_expires_at = NULL
\`\`\`

**Seguridad:**
- Contraseña temporal hasheada con bcrypt (nunca en texto plano).
- El QR contiene la pass en URL — se limpia con \`history.replaceState\`.
- Backend rechaza credenciales vencidas **antes** de emitir JWT.
- \`audit_logs\` NO guarda la contraseña, solo \`credential_type\`, \`credential_version\`, \`expires_at\`.

### 6.7 Mensaje Enriquecido al Bloquear Usuarios Inactivos`
    },

    // ─────────────────────────────────────────────────────────────────────
    // 4. CURRENT_STATE.md — 3 filas nuevas
    // ─────────────────────────────────────────────────────────────────────
    {
        file: 'CURRENT_STATE.md',
        id: '3 filas nuevas (módulos v4.4.0)',
        search: `| **Ventanas de Carga (ADR-008)** | ✅ Funcional | \`submission_opens_at/closes_at\` desacoplados. SQ 7d / BM 6d. 39 tests. |`,
        replace: `| **Ventanas de Carga (ADR-008)** | ✅ Funcional | \`submission_opens_at/closes_at\` desacoplados. SQ 7d / BM 6d. 39 tests. |
| **Credenciales Temporales con Vencimiento (v4.4.0)** | ✅ Funcional | Contraseñas \`MS-XXXX-XXXX\` vencen en 7 días. Login rechaza credenciales expiradas con \`TEMPORARY_CREDENTIAL_EXPIRED\`. Auditoría \`INITIAL_CREDENTIAL_GENERATED\` / \`ADMIN_PASSWORD_RESET\`. |
| **QR de Acceso Rápido (v4.4.0)** | ✅ Funcional | La credencial JPG incluye QR con \`nick\` + \`temp_pass\` precargados. El piloto debe pulsar "Iniciar Sesión Táctica" (NO auto-login). |
| **Login con Nick (v4.4.0)** | ✅ Funcional | El login acepta email, email institucional, Gmail vinculado o nick como identificador. |`
    },

    // ─────────────────────────────────────────────────────────────────────
    // 5. DEPLOYMENT_STATE.md — Columna + regla
    // ─────────────────────────────────────────────────────────────────────
    {
        file: 'DEPLOYMENT_STATE.md',
        id: 'Columna temporary_password_expires_at (DDL)',
        search: `    inactive_at TIMESTAMPTZ,
    last_activity TIMESTAMP,`,
        replace: `    inactive_at TIMESTAMPTZ,
    temporary_password_expires_at TIMESTAMPTZ,
    last_activity TIMESTAMP,`
    },
    {
        file: 'DEPLOYMENT_STATE.md',
        id: 'Regla de temporary_password_expires_at (tabla)',
        search: `| \`inactive_at\` | \`TIMESTAMPTZ\` (\`NULL\`) | Marca temporal de la inactivación. Se limpia a \`NULL\` al reactivar. |`,
        replace: `| \`inactive_at\` | \`TIMESTAMPTZ\` (\`NULL\`) | Marca temporal de la inactivación. Se limpia a \`NULL\` al reactivar. |
| \`temporary_password_expires_at\` | \`TIMESTAMPTZ\` (\`NULL\`) | Fecha/hora UTC de vencimiento de la contraseña temporal (v4.4.0). \`NULL\` = sin vencimiento (legacy). Se limpia a \`NULL\` al cambiar la contraseña. |`
    },

    // ─────────────────────────────────────────────────────────────────────
    // 6. USER_MANUAL.md — §1.4 + §1.7
    // ─────────────────────────────────────────────────────────────────────
    {
        file: 'USER_MANUAL.md',
        id: 'QR + vencimiento en §1.4',
        search: `   - **Contraseña Temporal:** Formato militar criptoseguro de alta entropía \`MS-XXXX-XXXX\` (ejemplo real entregado por el ADMIN: \`MS-MJWT-SU3U\`).`,
        replace: `   - **Contraseña Temporal:** Formato militar criptoseguro de alta entropía \`MS-XXXX-XXXX\` (ejemplo real entregado por el ADMIN: \`MS-MJWT-SU3U\`).
   - **📱 Acceso Rápido por QR:** La credencial JPG incluye un código QR. Al escanearlo con la cámara del celular, la app se abre con tu **Nick** y **contraseña temporal** ya precargados. **Vos** debés pulsar **"Iniciar Sesión Táctica"**. El QR **no inicia sesión automáticamente**.
   - **⏱ Vencimiento:** La contraseña temporal tiene una validez de **7 días** desde su emisión. Si no la usás antes de ese plazo, caduca y debe solicitarse una nueva al Comando.`
    },
    {
        file: 'USER_MANUAL.md',
        id: 'Nueva §1.7 (formas de login)',
        search: `**Nota:** Si tu cuenta fue inactivada por error, contactá inmediatamente al Comando Central para corregirlo.`,
        replace: `**Nota:** Si tu cuenta fue inactivada por error, contactá inmediatamente al Comando Central para corregirlo.

### 1.7 Formas de Iniciar Sesión (v4.4.0)

A partir de v4.4.0 podés iniciar sesión con **cualquiera** de estos identificadores en el campo "Correo Institucional / Gmail":

- 📧 Tu **correo institucional** (\`tu_nick@ffaa.py\`).
- 📧 Tu **Gmail real** (si lo vinculaste previamente con \`/link-account\`).
- 🎖️ Tu **nick de combate** (ej: \`VIPER\`, \`FALCON-01\`).

En todos los casos, la contraseña debe ser tu clave de combate vigente (o la temporal \`MS-XXXX-XXXX\` si es tu primer acceso o tras un reseteo).`
    }

];

// ============================================================================
// Ejecución
// ============================================================================

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   Script de documentación v4.4.0 — PARAGUAY-FFAA           ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log(`Root:      ${ROOT}`);
console.log(`Timestamp: ${TIMESTAMP}`);
console.log(`Bloques:   ${CHANGES.length}`);

let ok = 0, fail = 0;
for (const c of CHANGES) {
    (applyChange(c) ? ok++ : fail++);
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║   RESUMEN                                                  ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log(`✅ Aplicados: ${ok}`);
console.log(`❌ Fallidos:  ${fail}`);
console.log(`Total:       ${CHANGES.length}`);

if (fail === 0) {
    console.log('\n✅ Todos los cambios aplicados.');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. git diff --stat');
    console.log('   2. git diff           (revisión manual)');
    console.log('   3. git add .');
    console.log('   4. git commit -m "docs(v4.4.0): credenciales con vencimiento + QR + login con nick"');
    console.log('   5. git push origin main');
    console.log(`   6. del *.bak-${TIMESTAMP}`);
} else {
    console.log('\n⚠️  Revisar output arriba. Los backups están en .bak-<timestamp>.');
}