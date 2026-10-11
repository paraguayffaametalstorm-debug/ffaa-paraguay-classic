#!/usr/bin/env node
/**
 * PARAGUAY-FFAA | METALSTORM
 * SCRIPT: FIX-PARTICIPATION-EDIT — Edición de participaciones existentes
 *
 * Uso:
 *   node scripts\apply-fix-participation-edit.cjs           (DRY-RUN)
 *   node scripts\apply-fix-participation-edit.cjs --apply   (APLICAR — sin commit)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const APPLY = process.argv.includes('--apply');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m'
};

function log(color, prefix, msg) { console.log(`${color}${prefix}${C.reset} ${msg}`); }
function abort(msg) {
  console.error(`\n${C.red}${C.bold}❌ ABORTADO:${C.reset} ${msg}\n`);
  process.exit(1);
}

function readFile(relPath) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (!fs.existsSync(absPath)) abort(`Archivo no encontrado: ${relPath}`);
  return { absPath, content: fs.readFileSync(absPath, 'utf8') };
}

function safeReplace(content, oldBlock, newBlock, label) {
  const hasCRLF = content.includes('\r\n');
  const nc = hasCRLF ? content.replace(/\r\n/g, '\n') : content;
  const no = oldBlock.replace(/\r\n/g, '\n');
  const nn = newBlock.replace(/\r\n/g, '\n');

  if (nc.includes(nn)) {
    log(C.yellow, '[SKIP]', `${label}: ya aplicado.`);
    return { changed: false, content };
  }

  const count = nc.split(no).length - 1;
  if (count === 0) {
    log(C.red, '[FAIL]', `${label}: bloque original no encontrado.`);
    return { changed: false, content, error: 'NOT_FOUND' };
  }
  if (count > 1) {
    log(C.red, '[FAIL]', `${label}: ${count} ocurrencias ambiguas.`);
    return { changed: false, content, error: 'AMBIGUOUS' };
  }

  log(C.green, '[MATCH]', `${label}: 1 ocurrencia.`);
  let result = nc.replace(no, nn);
  if (hasCRLF) result = result.replace(/\n/g, '\r\n');
  return { changed: true, content: result };
}

function writeFile(relPath, newContent, oldContent) {
  const absPath = path.join(ROOT_DIR, relPath);
  if (newContent === oldContent) {
    log(C.yellow, '[SKIP]', `${relPath} — sin cambios`);
    return false;
  }
  if (!APPLY) {
    log(C.yellow, '[DRY-RUN]', `NO se modificará: ${relPath}`);
    return true;
  }
  const backupPath = absPath + '.bak-participation-edit';
  fs.writeFileSync(backupPath, oldContent, 'utf8');
  log(C.gray, '[BACKUP]', `Creado: ${path.relative(ROOT_DIR, backupPath)}`);
  fs.writeFileSync(absPath, newContent, 'utf8');
  log(C.green, '[WRITE]', `Modificado: ${relPath}`);
  return true;
}

// ============================================================================
// CAMBIO 1 — Backend: 409 devuelve el registro existente
// ============================================================================
function fixCreateParticipation() {
  log(C.bold + C.blue, '\n[1/3]', 'events-v2.controller.js — 409 con registro existente...');
  const { content } = readFile('src/controllers/events-v2.controller.js');

  const oldBlock = `    if (error) {
      // Manejar conflicto de duplicado (UNIQUE event_id + user_id)
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'Ya existe una participación para este piloto en este evento.',
          code: 'PARTICIPATION_EXISTS'
        });
      }
      throw error;
    }`;

  const newBlock = `    if (error) {
      // Manejar conflicto de duplicado (UNIQUE event_id + user_id)
      if (error.code === '23505') {
        // FIX-PARTICIPATION-EDIT: devolver el registro existente completo para
        // que el frontend pueda mostrar el conflicto y ofrecer resolverlo
        // (sobrescribir con PUT o cancelar). RFC 9110 §15.5.10.
        const { data: existingRows, error: fetchErr } = await supabase
          .from('event_participations')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', targetUserId)
          .limit(1);

        if (fetchErr || !existingRows || existingRows.length === 0) {
          // Fallback: devolver 409 sin datos si el fetch falla
          return res.status(409).json({
            success: false,
            error: 'Ya existe una participación para este piloto en este evento.',
            code: 'PARTICIPATION_EXISTS'
          });
        }

        return res.status(409).json({
          success: false,
          error: 'Ya existe una participación para este piloto en este evento.',
          code: 'PARTICIPATION_EXISTS',
          existing: existingRows[0]
        });
      }
      throw error;
    }`;

  const r = safeReplace(content, oldBlock, newBlock, 'events-v2.controller.js createParticipation');
  if (r.error) abort(`createParticipation: ${r.error}`);
  if (r.changed) writeFile('src/controllers/events-v2.controller.js', r.content, content);
}

// ============================================================================
// CAMBIO 2 — Backend: updateParticipation con SELF_MODIFICATION_FORBIDDEN
// ============================================================================
function fixUpdateParticipation() {
  log(C.bold + C.blue, '\n[2/3]', 'events-v2.controller.js — self-mod forbidden + ownership...');
  const { content } = readFile('src/controllers/events-v2.controller.js');

  const oldBlock = `    // Verificar que la participación existe
    const { data: existing, error: queryErr } = await supabase
      .from('event_participations')
      .select('id, data, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .limit(1);

    if (queryErr) throw queryErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participación no encontrada',
        code: 'PARTICIPATION_NOT_FOUND'
      });
    }`;

  const newBlock = `    // FIX-PARTICIPATION-EDIT: validación de jerarquía y self-modification
    // - Solo ADMIN y OWNER pueden modificar participaciones existentes.
    // - Ni siquiera un ADMIN/OWNER puede modificar su propio registro
    //   (por principio de Separación de Deberes).
    const callerRole = (req.user?.role || '').toUpperCase();
    const callerId = req.user?.id;
    const isPrivileged = callerRole === 'ADMIN' || callerRole === 'OWNER';

    if (!isPrivileged) {
      return res.status(403).json({
        success: false,
        error: 'Los pilotos no pueden modificar registros existentes. Contactá a un ADMIN.',
        code: 'UPDATE_FORBIDDEN'
      });
    }

    // Self-modification check: si el target es el propio caller, rechazar.
    // Necesitamos resolver el caller_id vs target_user_id (que puede ser UUID o user_id INTEGER).
    let callerUUID = callerId;
    if (callerId && typeof callerId === 'string' && /^\\d+$/.test(callerId)) {
      // El JWT contiene user_id INTEGER — resolver a UUID
      const { data: callerRows } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', Number(callerId))
        .limit(1);
      if (callerRows && callerRows.length > 0) callerUUID = callerRows[0].id;
    }

    if (String(callerUUID) === String(userId)) {
      return res.status(403).json({
        success: false,
        error: 'No podés modificar tu propio registro. Pedile a otro ADMIN que lo haga.',
        code: 'SELF_MODIFICATION_FORBIDDEN'
      });
    }

    // Verificar que la participación existe
    const { data: existing, error: queryErr } = await supabase
      .from('event_participations')
      .select('id, data, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .limit(1);

    if (queryErr) throw queryErr;
    if (!existing || existing.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participación no encontrada',
        code: 'PARTICIPATION_NOT_FOUND'
      });
    }`;

  const r = safeReplace(content, oldBlock, newBlock, 'events-v2.controller.js updateParticipation');
  if (r.error) abort(`updateParticipation: ${r.error}`);
  if (r.changed) writeFile('src/controllers/events-v2.controller.js', r.content, content);
}

// ============================================================================
// CAMBIO 3 — Frontend: manejar 409 y ofrecer reemplazar
// ============================================================================
function fixSavePerformance() {
  log(C.bold + C.blue, '\n[3/3]', 'js/performance.js — manejo 409 + confirm + PUT...');

  const { content } = readFile('js/performance.js');

  const oldBlock = `        const res = await fetch(\`/api/events-v2/\${encodeURIComponent(_eventId)}/participations\`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(participationPayload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || data.message || 'Error al guardar rendimiento');
        }

        showToast('✅ Rendimiento registrado correctamente', 'success');

        // Limpiar formulario y restablecer "Voló en grupo" por defecto
        resetPerformanceForm();

        // Redirigir al dashboard
        setTimeout(() => {
            if (typeof window.showView === 'function') {
                window.showView('appView');
            }
        }, 1200);`;

  const newBlock = `        const res = await fetch(\`/api/events-v2/\${encodeURIComponent(_eventId)}/participations\`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(participationPayload)
        });

        const data = await res.json();

        // FIX-PARTICIPATION-EDIT: manejar 409 PARTICIPATION_EXISTS con resolución.
        // Best practice (RFC 9110): el 409 incluye el registro existente y el
        // frontend ofrece al usuario decidir si reemplazar (PUT) o cancelar.
        if (res.status === 409 && data.code === 'PARTICIPATION_EXISTS') {
            const existing = data.existing || {};
            const existingData = existing.data || {};
            const existingTokens = existingData.tokens ?? existing.computed_points ?? '—';
            const existingDays = existingData.days_connected ?? '—';
            const existingGroup = existingData.flew_in_group ? 'Sí' : 'No';
            const existingStatus = existing.status || 'PENDING';
            const existingNotes = existingData.notes || '(sin notas)';
            const existingCreated = existing.created_at
                ? new Date(existing.created_at).toLocaleString('es-PY', { hour12: false })
                : '—';
            const existingUpdated = existing.updated_at && existing.updated_at !== existing.created_at
                ? new Date(existing.updated_at).toLocaleString('es-PY', { hour12: false })
                : existingCreated;

            // Toast informativo (no bloqueante)
            showToast('⚠️ Ya existe un registro previo para este piloto en este evento.', 'warning');

            // Confirmación con contexto completo
            const confirmMsg = [
                '⚠️ REGISTRO YA EXISTENTE',
                '',
                '📊 Registro actual:',
                \`   • Tokens:       \${existingTokens}\`,
                \`   • Días:         \${existingDays}\`,
                \`   • Grupo:        \${existingGroup}\`,
                \`   • Estado:       \${existingStatus}\`,
                \`   • Creado:       \${existingCreated}\`,
                \`   • Actualizado:  \${existingUpdated}\`,
                \`   • Notas:        \${existingNotes}\`,
                '',
                '🆕 Datos nuevos a cargar:',
                \`   • Tokens:       \${tokens}\`,
                \`   • Días:         \${days}\`,
                \`   • Grupo:        \${flewInGroup ? 'Sí' : 'No'}\`,
                \`   • Notas:        \${notes || '(sin notas)'}\`,
                '',
                '¿Reemplazar el registro anterior con los nuevos datos?'
            ].join('\\n');

            const confirmed = confirm(confirmMsg);

            if (!confirmed) {
                showToast('ℹ️ Registro no modificado. Los datos anteriores siguen intactos.', 'info');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = '💾 Guardar Rendimiento';
                }
                return;
            }

            // Usuario confirmó → PUT para reemplazar
            // El userId a usar en la URL es el UUID del piloto target (existing.user_id)
            const targetUuid = existing.user_id;
            if (!targetUuid) {
                throw new Error('No se pudo resolver el UUID del piloto para actualizar.');
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Actualizando...';
            }

            const putRes = await fetch(
                \`/api/events-v2/\${encodeURIComponent(_eventId)}/participations/\${encodeURIComponent(targetUuid)}\`,
                {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(participationPayload)
                }
            );

            const putData = await putRes.json();

            if (!putRes.ok) {
                if (putData.code === 'SELF_MODIFICATION_FORBIDDEN') {
                    throw new Error('No podés modificar tu propio registro. Pedile a otro ADMIN que lo haga.');
                }
                if (putData.code === 'UPDATE_FORBIDDEN') {
                    throw new Error('No tenés permisos para modificar registros existentes.');
                }
                throw new Error(putData.error || putData.message || 'Error al actualizar rendimiento');
            }

            showToast('✅ Registro actualizado correctamente.', 'success');

            resetPerformanceForm();

            setTimeout(() => {
                if (typeof window.showView === 'function') {
                    window.showView('appView');
                }
            }, 1200);
            return;
        }

        if (!res.ok) {
            throw new Error(data.error || data.message || 'Error al guardar rendimiento');
        }

        showToast('✅ Rendimiento registrado correctamente', 'success');

        // Limpiar formulario y restablecer "Voló en grupo" por defecto
        resetPerformanceForm();

        // Redirigir al dashboard
        setTimeout(() => {
            if (typeof window.showView === 'function') {
                window.showView('appView');
            }
        }, 1200);`;

  const r = safeReplace(content, oldBlock, newBlock, 'js/performance.js savePerformance');
  if (r.error) abort(`performance.js: ${r.error}. Adjuntá el archivo actual si difiere.`);
  if (r.changed) writeFile('js/performance.js', r.content, content);
}

// ============================================================================
// MAIN
// ============================================================================
console.log(`${C.bold}${C.cyan}
╔══════════════════════════════════════════════════════════════════╗
║  PARAGUAY-FFAA | METALSTORM — FIX-PARTICIPATION-EDIT             ║
╚══════════════════════════════════════════════════════════════════╝${C.reset}`);

log(C.gray, '[MODE]', APPLY ? 'APPLY (sin commit)' : 'DRY-RUN (sin cambios)');

try {
  fixCreateParticipation();
  fixUpdateParticipation();
  fixSavePerformance();
} catch (err) {
  abort(`Error durante la aplicación: ${err.message}`);
}

if (!APPLY) {
  console.log(`\n${C.yellow}${C.bold}MODO DRY-RUN — No se modificó nada.${C.reset}`);
  console.log(`\n${C.bold}SIGUIENTE PASO:${C.reset}`);
  console.log(`  node scripts\\apply-fix-participation-edit.cjs --apply`);
  process.exit(0);
}

console.log(`\n${C.green}${C.bold}✅ CAMBIOS APLICADOS (SIN COMMIT).${C.reset}`);
console.log(`\n${C.bold}Verificar diff:${C.reset}`);
console.log(`  git diff --stat`);
console.log(`\n${C.bold}Verificar sintaxis:${C.reset}`);
console.log(`  node --check src\\controllers\\events-v2.controller.js`);
console.log(`  node --check js\\performance.js`);
console.log(`\n${C.bold}Si está OK, commitear:${C.reset}`);
console.log(`  git add src/controllers/events-v2.controller.js js/performance.js scripts/apply-fix-participation-edit.cjs`);
console.log(`  git commit -m "feat(participation): edicion de registros existentes con jerarquia y self-mod check"`);
console.log(`  git push origin main`);
console.log(`  fly deploy`);