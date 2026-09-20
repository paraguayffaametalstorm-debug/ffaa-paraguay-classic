> **⚠️ DOCUMENTO HISTÓRICO — FASES 0 a 6 CERRADAS**
>
> Este documento registra el **Plan de Mejora Continua v1.0** ejecutado entre 2026-09-16 y 2026-09-17.
> Las fases 0 a 6 están **cerradas**. Los hallazgos HALL-001 a HALL-055 quedaron resueltos o documentados.
>
> Para el trabajo activo (sprints en curso), ver **[`PLAN_TRABAJO.md`](./PLAN_TRABAJO.md)**.

---

📋 PLAN DE TRABAJO DE MEJORA CONTINUA
PARAGUAY-FFAA | METALSTORM
Documento de Trabajo Oficial — Guía para Implementación de Hallazgos de Auditoría
Versión del Plan: v1.0
Basado en: Auditoría Técnica Completa (52 hallazgos)
Fecha de Emisión: 2026-09-16
Responsable: Desarrollador Principal + Asistencia de IA
Audiencia: Comando Técnico del Escuadrón PARAGUAY FFAA [PRY]

🎯 OBJETIVO DEL PLAN
Ejecutar la implementación de las mejoras identificadas en la auditoría técnica, en un orden priorizado que minimice riesgos, preserve la funcionalidad en producción y permita un avance sostenido sin sobrecargar al equipo de desarrollo (una sola persona con asistencia de IA).

Principios Rectores
Seguridad primero: Resolver los hallazgos críticos antes de cualquier mejora cosmética.

No romper producción: Cada cambio debe ser probado y revertible.

Evidencia en cada paso: Documentar el antes y el después.

Avance incremental: Fases cortas con entregables verificables.

Compatibilidad hacia atrás: No romper clientes existentes (frontend, PWA, integraciones).

Simplicidad: Preferir la solución más simple que resuelva el problema.

🗺️ VISIÓN GENERAL DEL PLAN
text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PLAN DE MEJORA CONTINUA v1.0                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FASE 0  🔒 CONTENCIÓN DE EMERGENCIA              (1-2 horas)               │
│          → Bloquear los 2 hallazgos CRÍTICOS sin código                     │
│                                                                             │
│  FASE 1  🛡️ SEGURIDAD CRÍTICA                     (1 día)                   │
│          → JWT_SECRET, Reset Password, CORS, Helmet, TLS                    │
│                                                                             │
│  FASE 2  🗄️ INFRAESTRUCTURA COMO CÓDIGO           (2-3 días)                │
│          → 20 archivos SQL de migración, password_resets.sql                │
│                                                                             │
│  FASE 3  🔧 CONSISTENCIA DE LÓGICA DE NEGOCIO     (2-3 días)                │
│          → Puntos BM, fuente de verdad, validaciones de jerarquía           │
│                                                                             │
│  FASE 4  🔐 SEGURIDAD SECUNDARIA                  (1-2 días)                │
│          → Registro, rate limiting, IDOR restantes                          │
│                                                                             │
│  FASE 5  🧪 TESTING Y OBSERVABILIDAD              (3-5 días)                │
│          → Suite de tests, logging estructurado, Dockerfile                 │
│                                                                             │
│  FASE 6  📚 DOCUMENTACIÓN Y LIMPIEZA              (1-2 días)                │
│          → Unificar versiones, sync docs/código, eliminar legacy            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
Estimación total: 10-16 días de trabajo efectivo (2-3 semanas calendario).

🔒 FASE 0 — CONTENCIÓN DE EMERGENCIA
Duración: 1-2 horas
Objetivo: Neutralizar los 2 hallazgos CRÍTICOS con cambios mínimos y reversibles.
Riesgo: MUY BAJO — No modifica código, solo configuración externa.

Contexto
Los hallazgos HALL-001 (JWT_SECRET Fallback) y HALL-022 (Reset Password sin Jerarquía) representan riesgos de explotación inmediata. Antes de modificar código, se puede mitigar parcialmente el riesgo mediante configuración.

Tareas
Tarea 0.1 — Configurar JWT_SECRET en Fly.io
Hallazgo abordado: HALL-001 (parcial)

Acción:

bash
# En la estación de mando, con flyctl autenticado:
fly secrets set JWT_SECRET="$(openssl rand -base64 48)" -a paraguay-ffaa-metalstorm

# Verificar que el secret está configurado:
fly secrets list -a paraguay-ffaa-metalstorm
Por qué mitiga parcialmente: Aunque el fallback sigue en el código, al estar JWT_SECRET definido en producción, el fallback NO se usa en runtime. Esto reduce el riesgo inmediato hasta que se aplique el fix definitivo en Fase 1.

Verificación:

Confirmar que fly secrets list muestra JWT_SECRET con un timestamp reciente.

Verificar que el servidor se reinicia correctamente tras el cambio.

Esfuerzo: 15 minutos
Dependencias: Acceso a flyctl con permisos de secrets.
Rollback: fly secrets unset JWT_SECRET (no recomendado; solo si causa problemas).

Tarea 0.2 — Verificar Jerarquía de Usuarios Actuales
Hallazgo abordado: HALL-022 (preparación)

Acción:

sql
-- Ejecutar en SQL Editor de Supabase
SELECT 
    user_id, 
    nick, 
    role, 
    status
FROM users 
WHERE role IN ('OWNER', 'ADMIN')
ORDER BY role, nick;
Objetivo: Confirmar cuántos OWNER y ADMIN existen actualmente, y validar que las cuotas (1 OWNER, 3 ADMIN, 8 VETERANO) están respetadas.

Verificación:

Debe haber exactamente 1 OWNER.

Debe haber máximo 3 ADMIN.

Debe haber máximo 8 VETERANO.

Esfuerzo: 5 minutos
Dependencias: Acceso al SQL Editor de Supabase.

Tarea 0.3 — Comunicar al Escuadrón (Opcional)
Acción: Notificar al Alto Mando que se iniciará un ciclo de mejoras técnicas, sin impacto operativo esperado.

Esfuerzo: 5 minutos.

✅ Criterio de Cierre de Fase 0
□ JWT_SECRET configurado en Fly.io secrets.
□ Servidor reiniciado y funcionando correctamente.
□ Conteo de roles validado en Supabase.
□ Comunicación enviada al Comando Central.
🛡️ FASE 1 — SEGURIDAD CRÍTICA
Duración: 1 día (8 horas de trabajo efectivo)
Objetivo: Eliminar los 6 hallazgos de seguridad críticos/altos.
Riesgo: MEDIO — Modifica código de autenticación y configuración.

Contexto
Esta fase aborda los hallazgos de mayor impacto potencial. Cada cambio debe hacerse en una rama separada y probarse antes del merge.

Tareas
Tarea 1.1 — Eliminar Fallback de JWT_SECRET
Hallazgo: HALL-001 (definitivo)
Archivo: src/config/env.js

Acción:

javascript
// ANTES
JWT_SECRET: process.env.JWT_SECRET || 'ffaa_pry_metalstorm_jwt_super_secret_key_2026',

// DESPUÉS
const JWT_SECRET = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET no definido en producción. Abortando.');
  process.exit(1);
}

export const ENV = {
  // ...
  JWT_SECRET: JWT_SECRET || 'dev-only-insecure-secret-change-me',
  // ...
};
Test:

Desplegar sin JWT_SECRET en local con NODE_ENV=production → debe fallar al arrancar.

Desplegar con JWT_SECRET → debe funcionar normalmente.

Verificar en producción que el login sigue operativo.

Criterio de Aceptación: El servidor NO arranca si NODE_ENV=production y JWT_SECRET está vacío.

Esfuerzo: 15 minutos
Riesgo de regresión: BAJO (solo afecta arranque).

Tarea 1.2 — Validación de Jerarquía en Reset Password
Hallazgo: HALL-022
Archivo: src/routes/admin.routes.js (controlador inline)

Acción:

javascript
// Dentro del handler de POST /users/:userId/reset-password
// Agregar antes de generar la nueva contraseña:

const actorRole = (req.user.role || '').toUpperCase();
const targetRole = (user.role || '').toUpperCase();

// 1. Proteger OWNER: nadie puede resetear la contraseña del OWNER excepto él mismo
if (targetRole === 'OWNER' && String(user.id) !== String(req.user.id)) {
  return res.status(403).json({
    error: 'No se puede resetear la contraseña del Comandante General (OWNER)',
    code: 'OWNER_PROTECTED'
  });
}

// 2. ADMIN solo puede resetear a MIEMBRO y VETERANO
if (actorRole === 'ADMIN' && (targetRole === 'ADMIN' || targetRole === 'OWNER')) {
  return res.status(403).json({
    error: 'Los Administradores solo pueden resetear contraseñas de Miembros y Veteranos',
    code: 'HIERARCHY_FORBIDDEN'
  });
}
Test:

Como ADMIN, intentar resetear contraseña de un OWNER → debe fallar con 403.

Como ADMIN, intentar resetear contraseña de otro ADMIN → debe fallar con 403.

Como ADMIN, resetear contraseña de un MIEMBRO → debe funcionar.

Como OWNER, resetear contraseña de cualquiera → debe funcionar.

Criterio de Aceptación: Un ADMIN no puede resetear contraseñas de jerarquía superior.

Esfuerzo: 30 minutos
Riesgo de regresión: BAJO (solo añade validación).

Tarea 1.3 — Añadir Columna rutas_sistemas a Migración
Hallazgo: HALL-016
Archivo: sql/upgrades_2_0.sql

Acción: Añadir al inicio del archivo:

sql
-- 1.0 Agregar columna rutas_sistemas a la tabla planes
ALTER TABLE planes 
ADD COLUMN IF NOT EXISTS rutas_sistemas JSONB DEFAULT '{}'::jsonb;

-- Comentario: Almacena las rutas A/B elegidas por nivel (5-8) para cada sistema
-- Ejemplo: {"fuselaje": {"5": "A", "6": "B", "7": "A", "8": "B"}, "motor": {...}}
Test:

Ejecutar la migración en Supabase (en un entorno de prueba o directamente en producción con IF NOT EXISTS).

Verificar que la columna existe:

sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'planes' AND column_name = 'rutas_sistemas';
Probar PUT /api/planes/:id/systems con un payload que incluya rutas A/B.

Verificar que las rutas se persisten correctamente.

Criterio de Aceptación: La columna rutas_sistemas existe y las rutas A/B se persisten.

Esfuerzo: 30 minutos (incluye verificación)
Riesgo de regresión: BAJO (el código ya tiene fallback).

Nota: El código actual tiene un fallback que ignora silenciosamente la columna si no existe. Al añadirla, el fallback ya no se activará y la funcionalidad de rutas A/B operará correctamente.

Tarea 1.4 — Restringir CORS a Orígenes Explícitos
Hallazgo: HALL-002
Archivo: server.js

Acción:

javascript
// ANTES: Lógica permisiva con .endsWith() e .includes()
// DESPUÉS: Lista blanca estricta

const allowedOrigins = [
  'https://paraguay-ffaa-metalstorm.fly.dev',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (mobile, curl, PWA same-origin)
      if (!origin) return callback(null, true);

      // Verificar contra la lista blanca estricta
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`⚠️ [CORS] Origen bloqueado: ${origin}`);
      return callback(new Error(`Acceso CORS bloqueado para el origen: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  })
);
Test:

Desde https://paraguay-ffaa-metalstorm.fly.dev → debe funcionar.

Desde https://malicioso.fly.dev → debe ser bloqueado.

Desde https://algun-subdominio.fly.dev → debe ser bloqueado.

Desde Postman/curl sin origen → debe funcionar.

Criterio de Aceptación: Solo los orígenes de la lista blanca pueden hacer peticiones.

Esfuerzo: 30 minutos
Riesgo de regresión: MEDIO (podría romper integraciones legítimas no listadas).

Mitigación: Antes de aplicar, revisar logs de CORS de las últimas 2 semanas para identificar orígenes legítimos.

Tarea 1.5 — Activar frameguard y contentSecurityPolicy en Helmet
Hallazgo: HALL-003
Archivo: server.js

Acción:

javascript
app.use(
  helmet({
    frameguard: { action: 'sameorigin' }, // Antes: false
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Necesario si hay scripts inline
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://*.supabase.co"],
        frameAncestors: ["'self'"], // O ['none'] si no se necesita iframe
        objectSrc: ["'none'"],
        baseUri: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false // Mantener en false para PWA
  })
);
Test:

Verificar que las cabeceras X-Frame-Options y Content-Security-Policy están presentes:

bash
curl -I https://paraguay-ffaa-metalstorm.fly.dev/
Verificar que la aplicación sigue funcionando:

Login

Carga de imágenes desde Cloudinary

Carga de fuentes de Google Fonts

PWA offline

Verificar que el iframe de AI Studio sigue funcionando (si aplica).

Criterio de Aceptación: Las cabeceras están activas y la aplicación sigue funcionando.

Esfuerzo: 1 hora (incluye ajustes iterativos)
Riesgo de regresión: MEDIO-ALTO (CSP es propenso a romper cosas).

Mitigación:

Aplicar primero en un entorno de staging.

Usar Content-Security-Policy-Report-Only para detectar violaciones sin bloquear.

Ajustar las directivas iterativamente.

Tarea 1.6 — Eliminar tls.rejectUnauthorized: false
Hallazgo: HALL-023
Archivo: src/utils/email.js

Acción:

javascript
// ANTES
transporter = nodemailer.createTransport({
  host: ENV.EMAIL_HOST,
  port: port,
  secure: isSecure,
  auth: {
    user: ENV.EMAIL_USER,
    pass: ENV.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false  // ❌ ELIMINAR ESTA LÍNEA
  }
});

// DESPUÉS
transporter = nodemailer.createTransport({
  host: ENV.EMAIL_HOST,
  port: port,
  secure: isSecure,
  auth: {
    user: ENV.EMAIL_USER,
    pass: ENV.EMAIL_PASS
  }
  // TLS se maneja con los valores por defecto (rejectUnauthorized: true)
});
Test:

Enviar un correo de prueba con POST /api/auth/forgot-password.

Verificar que el correo llega correctamente.

Si falla, verificar que el servidor SMTP de Gmail tiene un certificado válido (Gmail siempre lo tiene).

Criterio de Aceptación: El correo de restablecimiento se envía sin errores TLS.

Esfuerzo: 15 minutos
Riesgo de regresión: BAJO (Gmail tiene certificados válidos).

✅ Criterio de Cierre de Fase 1
□ HALL-001: Fallback eliminado. Servidor no arranca sin JWT_SECRET en producción.
□ HALL-022: Jerarquía validada en reset-password.
□ HALL-016: Columna rutas_sistemas creada y funcional.
□ HALL-002: CORS restringido a lista blanca.
□ HALL-003: Helmet con frameguard y CSP activos.
□ HALL-023: tls.rejectUnauthorized eliminado.
□ Todos los tests manuales pasan.
□ Deploy exitoso en Fly.io.
□ Monitoreo de logs durante 24 horas sin errores nuevos.
Entregable: Rama feature/security-critical-fixes mergeada a main y desplegada.

🗄️ FASE 2 — INFRAESTRUCTURA COMO CÓDIGO
Duración: 2-3 días
Objetivo: Versionar el esquema completo de la base de datos en el repositorio.
Riesgo: BAJO — No modifica producción, solo agrega archivos.

Contexto
Solo existe sql/upgrades_2_0.sql en el repositorio, pero Supabase tiene 22 tablas activas. Las 20 tablas restantes no tienen archivos de migración. Esto viola el principio de infraestructura como código y hace imposible recrear la BD desde cero.

Tareas
Tarea 2.1 — Generar Dump Completo del Esquema
Hallazgo: HALL-048 (base)

Acción:

Opción A: Usando pg_dump (recomendado)

bash
# Obtener la cadena de conexión desde Supabase Dashboard → Settings → Database
pg_dump --schema-only --no-owner --no-privileges \
  "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  > sql/000_full_schema_dump.sql
Opción B: Usando el SQL Editor de Supabase
Ejecutar consultas para obtener el DDL de cada tabla:

sql
SELECT 
  'CREATE TABLE ' || tablename || ' (' || 
  string_agg(column_name || ' ' || data_type, ', ') || 
  ');' AS ddl
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY tablename;
Esfuerzo: 30 minutos

Tarea 2.2 — Organizar Archivos de Migración por Tabla
Hallazgo: HALL-048

Acción: Crear archivos individuales organizados por dominio:

text
sql/
├── 000_full_schema_dump.sql        # Dump completo (referencia)
├── 001_users.sql                    # Tabla users + columnas de inactivación
├── 002_performances.sql             # Tabla performances
├── 003_events.sql                   # Tabla events
├── 004_normativas.sql               # Tabla normativas
├── 005_plane_models.sql             # Catálogo de aviones
├── 006_plane_mods.sql               # Catálogo de mods
├── 007_mod_effects.sql              # Efectos de mods
├── 008_planes.sql                   # Hangar de pilotos
├── 009_plane_upgrades.sql           # Auditoría de mejoras
├── 010_upgrade_nodes_v2.sql         # Árbol de nodos 2.0
├── 011_upgrade_effects.sql          # Efectos de upgrades
├── 012_upgrade_effects_history.sql  # Historial de efectos
├── 013_password_resets.sql          # Tokens de reset (ya tengo el código)
├── 014_recovery_codes.sql           # Códigos de recuperación
├── 015_user_settings.sql            # Preferencias de usuario
├── 016_security_events.sql          # Eventos de seguridad
├── 017_audit_logs.sql               # Logs de auditoría
├── 018_error_logs.sql               # Logs de errores
├── 019_bm_events.sql                # Black Market - Eventos
├── 020_bm_missions.sql              # Black Market - Misiones
├── 021_bm_progress.sql              # Black Market - Progreso
├── 022_bm_discounts.sql             # Black Market - Descuentos
├── upgrades_2_0.sql                 # Migración existente (renombrar a 023)
└── README.md                        # Guía de migraciones
Esfuerzo: 1-2 días (generar cada DDL, verificar constraints, índices, RLS).

Tarea 2.3 — Crear password_resets.sql (Código Ya Disponible)
Hallazgo: HALL-030

Acción: Usar el código SQL ya redactado en la auditoría (basado en evidencia real de Supabase).

Esfuerzo: 15 minutos.

Tarea 2.4 — Crear README.md en sql/
Acción: Documentar el proceso de migración:

markdown
# Guía de Migraciones SQL

## Orden de Ejecución
Los archivos deben ejecutarse en orden numérico (001, 002, ...).

## Recrear la Base de Datos desde Cero
1. Crear un proyecto nuevo en Supabase.
2. Ejecutar los archivos en orden desde el SQL Editor.
3. Verificar que las políticas RLS estén activas.

## Verificar el Estado Actual
Consultar la tabla de tracking de migraciones (si existe).
Esfuerzo: 30 minutos.

Tarea 2.5 — Documentar Proceso en DEPLOYMENT_GUIDE.md
Hallazgo: HALL-048 (documentación)

Acción: Añadir una sección sobre cómo recrear la BD.

Esfuerzo: 30 minutos.

✅ Criterio de Cierre de Fase 2
□ Dump completo del esquema generado.
□ 22 archivos .sql creados (uno por tabla).
□ sql/password_resets.sql creado.
□ sql/README.md documentado.
□ DEPLOYMENT_GUIDE.md actualizado.
□ Verificación: ejecutar los .sql en un proyecto Supabase de prueba y confirmar que la BD se recrea correctamente.
Entregable: Rama feature/sql-migrations mergeada a main.

🔧 FASE 3 — CONSISTENCIA DE LÓGICA DE NEGOCIO
Duración: 2-3 días
Objetivo: Resolver inconsistencias en la lógica de negocio y eliminar fuentes de verdad duales.
Riesgo: MEDIO-ALTO — Modifica lógica central de BM, planes y performances.

Tareas
Tarea 3.1 — Unificar Lógica de Puntos BM
Hallazgo: HALL-011
Archivos: src/controllers/bm.controller.js, src/utils/schemas.js

Decisión de Negocio (Recomendada): Usar la lógica documentada (25+25) porque:

Es la que se comunica al escuadrón.

Es más generosa con los pilotos.

Coincide con el default: 25 de BmMissionSchema.

Acción:

javascript
// bm.controller.js - generateDefaultMissions
// Cambiar todos los `points: 15` y `points: 10` a `points: 25`.

// bm.controller.js - recalculatePilotDiscount
// Cambiar `const dayBonus = count >= 3 ? 10 : 0;` a `const dayBonus = count >= 3 ? 25 : 0;`

// bm.controller.js - completeBmMission
// Eliminar el fallback `|| 25`. Usar siempre `mission.points`.
const pointsEarned = isCompleted ? (mission.points || 25) : 0;
// Nota: mantener `|| 25` solo como salvaguarda si mission.points es null.
Test:

Crear un evento BM de prueba.

Completar 1 misión → verificar +25 puntos.

Completar las 3 misiones del día → verificar +75 puntos (25+25+25) + 25 bonus = 100.

Completar 5 días completos → verificar 250 puntos máximos.

Esfuerzo: 2-4 horas (incluye tests).
Riesgo de regresión: MEDIO (afecta lógica de puntos).

Mitigación: Los eventos BM actuales están vacíos (bm_events tiene 0 filas). No hay datos en producción que migrar.

Tarea 3.2 — Eliminar Estado en Memoria en BM
Hallazgo: HALL-012
Archivo: src/controllers/bm.controller.js

Acción:

Eliminar las variables:

javascript
// ELIMINAR
let inMemoryBmEvents = [...];
let inMemoryBmMissions = generateDefaultMissions(1);
let inMemoryBmProgress = [];
let inMemoryBmDiscounts = [];
Refactorizar cada función para usar Supabase como única fuente:

javascript
export async function getBmEvents(req, res) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: 'Servicio de base de datos no disponible',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    const { data, error } = await supabase
      .from('bm_events')
      .select('*, plane_models(id, name, type, tier, stats_real)')
      .order('start_date', { ascending: false });

    if (error) throw error;

    return res.json({
      success: true,
      data: data || [],
      events: data || [],
      total: data?.length || 0
    });
  } catch (error) {
    console.error('❌ [BM] Error en getBmEvents:', error);
    return res.status(500).json({ success: false, error: 'Error al consultar eventos BM' });
  }
}
Refactorizar recalculatePilotDiscount para consultar Supabase en lugar de inMemoryBmProgress.

Test:

Simular caída de Supabase → la API debe devolver 503, no datos en memoria.

Crear evento BM → verificar que se persiste en Supabase.

Completar misión → verificar que bm_progress tiene el registro.

Reiniciar el servidor → verificar que los datos persisten.

Esfuerzo: 1-2 días (refactorización completa + tests).
Riesgo de regresión: ALTO (cambia arquitectura del módulo).

Mitigación:

Los eventos BM están vacíos → sin datos en producción que se pierdan.

Hacer el cambio en una rama y probar exhaustivamente.

Tarea 3.3 — Validación de Jerarquía en savePerformance
Hallazgo: HALL-013
Archivo: src/controllers/performances.controller.js

Acción: Añadir validación después de obtener el targetUser:

javascript
if (String(targetUserId) !== String(callerId)) {
  // Solo ADMIN/OWNER pueden guardar para otros
  if (!isAdminOrOwner) {
    return res.status(403).json({ error: 'Permiso denegado' });
  }

  // Validar jerarquía
  const targetRole = (targetUser.role || 'MIEMBRO').toUpperCase();
  const callerRole = (req.user.role || 'MIEMBRO').toUpperCase();

  if (callerRole === 'ADMIN' && (targetRole === 'ADMIN' || targetRole === 'OWNER')) {
    return res.status(403).json({
      error: 'Los Administradores solo pueden registrar rendimientos de Miembros y Veteranos',
      code: 'HIERARCHY_FORBIDDEN'
    });
  }
}
Test:

Como ADMIN, intentar guardar rendimiento para un OWNER → debe fallar con 403.

Como ADMIN, guardar rendimiento para un MIEMBRO → debe funcionar.

Como OWNER, guardar rendimiento para cualquiera → debe funcionar.

Esfuerzo: 2-4 horas (incluye tests).
Riesgo de regresión: BAJO.

Tarea 3.4 — Validación de user_id en PerformanceSchema
Hallazgo: HALL-028

Acción: Añadir validación adicional en el controlador para verificar que user_id sea numérico o UUID válido.

Esfuerzo: 1 hora.

Tarea 3.5 — Race Condition en getNextUserId
Hallazgo: HALL-024
Archivo: src/utils/security.js

Opción A (Recomendada): Usar secuencia PostgreSQL

Crear una secuencia en Supabase:

sql
CREATE SEQUENCE IF NOT EXISTS user_id_seq START WITH 1000;
Modificar getNextUserId:

javascript
export async function getNextUserId(supabase) {
  if (!supabase) throw new Error('Cliente Supabase no disponible');
  
  const { data, error } = await supabase.rpc('get_next_user_id');
  if (error) throw error;
  return data;
}
Crear la función RPC:

sql
CREATE OR REPLACE FUNCTION get_next_user_id()
RETURNS INTEGER AS $$
BEGIN
  RETURN nextval('user_id_seq');
END;
$$ LANGUAGE plpgsql;
Opción B (Más simple): Reintentar en caso de conflicto
Mantener la lógica actual pero con retry hasta 3 veces si el user_id ya existe.

Esfuerzo: 2-4 horas.
Riesgo de regresión: MEDIO.

Tarea 3.6 — getNextUserId Retorna 1 en Error
Hallazgo: HALL-025

Acción: Cambiar el return 1 por throw new Error(...) en caso de error.

Esfuerzo: 15 minutos.

Tarea 3.7 — Validación de userId Numérico en Settings
Hallazgo: HALL-044
Archivo: src/controllers/settings.controller.js

Acción: Aplicar la misma lógica tipada del resto del código (UUID vs INTEGER).

Esfuerzo: 1 hora.

Tarea 3.8 — onConflict en Upsert de Settings
Hallazgo: HALL-045

Acción:

javascript
await supabase.from('user_settings').upsert(
  { user_id: userId, ...data },
  { onConflict: 'user_id' }
);
Esfuerzo: 15 minutos.

Tarea 3.9 — Inconsistencias Documentales de Mods y Traits
Hallazgos: HALL-050, HALL-051, HALL-052

Acción:

Actualizar DEPLOYMENT_STATE.md con los valores correctos de m1 a m10 (los de modEffects.js).

Añadir el trait Expert Cannons a TRAITS_CATALOG si es necesario.

Aclarar en ARCHITECTURE.md que upgrade_nodes_v2 tiene 3072 filas específicas por avión.

Esfuerzo: 1-2 horas.

✅ Criterio de Cierre de Fase 3
□ HALL-011: Puntos BM consistentes (25+25).
□ HALL-012: Supabase como única fuente de verdad en BM.
□ HALL-013: Validación de jerarquía en savePerformance.
□ HALL-024: Race condition resuelta.
□ HALL-025: Excepción en lugar de return 1.
□ HALL-028: Validación de user_id.
□ HALL-044: Validación tipada en settings.
□ HALL-045: onConflict especificado.
□ HALL-050, 051, 052: Documentación sincronizada.
□ Tests manuales y unitarios pasan.
Entregable: Rama feature/business-logic-consistency mergeada a main.

🔐 FASE 4 — SEGURIDAD SECUNDARIA
Duración: 1-2 días
Objetivo: Resolver los hallazgos de seguridad de severidad MEDIA.
Riesgo: BAJO-MEDIO.

Tareas
Tarea 4.1 — Proteger /register
Hallazgo: HALL-004

Acción:

javascript
// auth.routes.js
import { requireAuth, requireRole } from '../middlewares/auth.js';

router.post('/register', requireAuth, requireRole('ADMIN', 'OWNER'), register);
Test: Sin token → 401. Con token MIEMBRO → 403. Con token ADMIN → funciona.

Esfuerzo: 30 minutos.

Tarea 4.2 — Rate Limiting en /register
Hallazgo: HALL-009

Acción:

javascript
router.post('/register', authLimiter, requireAuth, requireRole('ADMIN', 'OWNER'), register);
Esfuerzo: 15 minutos.

Tarea 4.3 — Verificar Catálogo Público
Hallazgo: HALL-018

Acción: Decidir si el catálogo de aviones debe ser público o privado. Si es público, documentarlo. Si es privado, añadir requireAuth.

Esfuerzo: 30 minutos (decisión + cambio).

Tarea 4.4 — Verificar BM Público
Hallazgo: HALL-019

Acción: Igual que 4.3.

Esfuerzo: 30 minutos.

Tarea 4.5 — Verificar Plane-Models GET Público
Hallazgo: HALL-034

Acción: Igual que 4.3.

Esfuerzo: 30 minutos.

Tarea 4.6 — Endpoint /active de Presence
Hallazgo: HALL-033

Acción: Añadir requireAuth a GET /api/presence/active.

Esfuerzo: 15 minutos.

Tarea 4.7 — Backup en Memoria en Owner
Hallazgo: HALL-036

Acción: Persistir los backups en Supabase o en un bucket.

Esfuerzo: 4 horas.

Tarea 4.8 — Backup No Sanitiza
Hallazgo: HALL-037

Acción: Ampliar la lista de campos sensibles a eliminar.

Esfuerzo: 30 minutos.

✅ Criterio de Cierre de Fase 4
□ HALL-004: /register protegido.
□ HALL-009: authLimiter en /register.
□ HALL-018, 019, 034: Decisiones documentadas y aplicadas.
□ HALL-033: /active protegido.
□ HALL-036, 037: Backups persistidos y sanitizados.
Entregable: Rama feature/security-secondary mergeada a main.

🧪 FASE 5 — TESTING Y OBSERVABILIDAD
Duración: 3-5 días
Objetivo: Establecer una base de tests automatizados y mejorar la observabilidad.
Riesgo: BAJO (principalmente añade código nuevo).

Tareas
Tarea 5.1 — Configurar Suite de Tests
Hallazgo: HALL-010, HALL-017

Acción:

bash
npm install --save-dev jest supertest @types/jest
Añadir a package.json:

json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
Crear jest.config.js:

javascript
export default {
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: ['.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};
Esfuerzo: 4 horas.

Tarea 5.2 — Tests de Autenticación
Acción: Crear tests para:

Login exitoso

Login fallido (usuario no existe, contraseña incorrecta)

Login de usuario inactivo

Cambio de contraseña (forzado y voluntario)

Validación de token_version

Esfuerzo: 1 día.

Tarea 5.3 — Tests de Lógica BM
Acción: Crear tests para:

Cálculo de puntos (misión individual, día completo, evento completo)

Bonus diario

Tope de 250 puntos

Cálculo de descuento

Esfuerzo: 1 día.

Tarea 5.4 — Tests de Autorización
Acción: Crear tests para:

requireAuth con token válido/inválido

requireRole con roles correctos/incorrectos

Validación de jerarquía en savePerformance y reset-password

Esfuerzo: 1 día.

Tarea 5.5 — Logging Estructurado
Hallazgo: HALL-015, HALL-021

Acción:

bash
npm install pino pino-http
Reemplazar console.error y console.warn con logger.error y logger.warn.

Esfuerzo: 1 día.

Tarea 5.6 — Dockerfile con Usuario No Root
Hallazgo: HALL-047

Acción:

dockerfile
# ... después de COPY . .
USER node
CMD ["node", "server.js"]
Esfuerzo: 15 minutos.

Tarea 5.7 — Auditoría con Ambos IDs
Hallazgo: HALL-029

Acción: Almacenar tanto user_id (INTEGER) como id (UUID) en audit_logs para evitar consultas extra.

Esfuerzo: 2 horas.

✅ Criterio de Cierre de Fase 5
□ Suite de tests configurada.
□ Cobertura > 60% en módulos críticos.
□ Logging estructurado implementado.
□ Dockerfile sin root.
□ Auditoría con ambos IDs.
Entregable: Rama feature/testing-observability mergeada a main.

📚 FASE 6 — DOCUMENTACIÓN Y LIMPIEZA
Duración: 1-2 días
Objetivo: Unificar la documentación y eliminar deuda técnica acumulada.
Riesgo: BAJO.

Tareas
Tarea 6.1 — Unificar Versionado
Hallazgo: HALL-006

Acción:

Actualizar package.json de 3.7.0 a 4.0.0.

Actualizar sw.js para que use v4.0.0 (actualmente dice v3.9.8 en README.md).

Verificar que index.html usa ?v=4.0.0.

Esfuerzo: 30 minutos.

Tarea 6.2 — Eliminar Rutas de Compatibilidad
Hallazgo: HALL-007

Acción: Eliminar app.use('/auth', authRoutes) y app.use('/api/catalog', planesRoutes) si no se usan.

Verificación previa: Revisar logs de Fly.io para confirmar que no hay tráfico a esas rutas.

Esfuerzo: 1 hora.

Tarea 6.3 — Sincronizar Referencias de Archivos en .md
Hallazgo: HALL-049

Acción: Auditar todos los .md y corregir referencias a archivos inexistentes.

Esfuerzo: 2 horas.

Tarea 6.4 — Exposición de error.message
Hallazgo: HALL-005, HALL-039

Acción: Reemplazar error.message con mensajes genéricos en respuestas 500.

Esfuerzo: 2 horas.

Tarea 6.5 — Estado en Memoria en Presence
Hallazgo: HALL-032

Acción: Migrar el estado de presencia a Supabase.

Esfuerzo: 4 horas.

Tarea 6.6 — Dashboard Sin Autorización
Hallazgo: HALL-038

Acción: Verificar si el dashboard debe ser accesible para todos los autenticados. Si es así, documentar. Si no, añadir restricción.

Esfuerzo: 30 minutos.

Tarea 6.7 — plane-models In-Memory Fallback
Hallazgo: HALL-035

Acción: Eliminar el fallback en memoria y usar Supabase como única fuente.

Esfuerzo: 1 día.

Tarea 6.8 — Fallback de rutas_sistemas (Limpieza)
Hallazgo: HALL-016 (limpieza)

Acción: Una vez confirmado que la columna rutas_sistemas existe en producción (Tarea 1.3), eliminar el fallback de updatePlaneSystems.

Esfuerzo: 1 hora.

Tarea 6.9 — CompleteBmMissionSchema y ChangePasswordSchema
Hallazgos: HALL-026, HALL-027

Acción: Usar los schemas Zod existentes o eliminarlos si están obsoletos.

Esfuerzo: 1 hora.

✅ Criterio de Cierre de Fase 6
□ HALL-005, 006, 007, 015, 026, 027, 032, 035, 038, 039, 049: Todos resueltos.
□ Documentación sincronizada con el código.
□ Versionado unificado.
□ Código legacy eliminado.
Entregable: Rama feature/docs-cleanup mergeada a main.

📅 CRONOGRAMA SUGERIDO
Semana	Fase	Tareas	Entregable
Semana 1	Fase 0 + Fase 1	Contención + Seguridad Crítica	Producción segura
Semana 2	Fase 2	Infraestructura como Código	22 archivos SQL versionados
Semana 3	Fase 3	Consistencia de Lógica	BM y planes consistentes
Semana 4	Fase 4 + Fase 5 (inicio)	Seguridad Secundaria + Testing	Tests configurados
Semana 5	Fase 5 (fin) + Fase 6	Testing completo + Documentación	Proyecto limpio
Total estimado: 4-6 semanas calendario (con dedicación parcial).

📊 MÉTRICAS DE PROGRESO
Antes del Plan
Métrica	Valor
Hallazgos críticos	2
Hallazgos altos	12
Hallazgos medios	18
Hallazgos bajos	15
Cobertura de tests	0%
Archivos SQL versionados	1 de 22
Versionado consistente	❌
Después del Plan (Objetivo)
Métrica	Valor
Hallazgos críticos	0
Hallazgos altos	0-2
Hallazgos medios	0-4
Hallazgos bajos	0-5
Cobertura de tests	>60%
Archivos SQL versionados	22 de 22
Versionado consistente	✅
🎯 REGLAS DE EJECUCIÓN
Una fase a la vez. No iniciar Fase N+1 sin cerrar Fase N.

Una tarea a la vez. No mezclar cambios de múltiples tareas en un mismo commit.

Rama por fase. Cada fase en su propia rama (feature/fase-N).

Commit descriptivo. Formato: fix(hall-XXX): descripción breve.

Test antes de merge. Cada tarea debe tener al menos un test manual documentado.

Deploy tras cada fase. No acumular cambios sin desplegar.

Rollback preparado. Documentar cómo revertir cada cambio.

Documentar cada cierre de fase. Actualizar CHANGELOG.md y CURRENT_STATE.md.

🚨 PLAN DE CONTINGENCIA
Si algo sale mal en producción
Rollback inmediato: fly releases → fly deploy --image <versión-previa>.

Notificar al Comando Central: WhatsApp/Discord del escuadrón.

Diagnóstico: fly logs -a paraguay-ffaa-metalstorm.

Fix en caliente: Rama hotfix/ desde main con el fix mínimo.

Re-deploy y verificación.

Si un hallazgo requiere más investigación
Marcar como BLOQUEADO en el plan.

Documentar la pregunta específica que necesita respuesta.

Continuar con el siguiente hallazgo no bloqueado.

Volver al hallazgo bloqueado cuando se tenga la respuesta.

📖 DOCUMENTOS DE REFERENCIA
Documento	Propósito
Informe de Auditoría Completo	Detalle de los 52 hallazgos
API_REFERENCE.md	Endpoints y contratos
ARCHITECTURE.md	Arquitectura del sistema
DEPLOYMENT_STATE.md	Estado de la BD en Supabase
FIXES_APPLIED.md	Historial de fixes previos
CHANGELOG.md	Historial de versiones
POLITICA_INACTIVACION.md	Normativa de bajas
✅ CHECKLIST FINAL DEL PLAN
□ Fase 0 completada (contención de emergencia).
□ Fase 1 completada (seguridad crítica).
□ Fase 2 completada (infraestructura como código).
□ Fase 3 completada (consistencia de lógica).
□ Fase 4 completada (seguridad secundaria).
□ Fase 5 completada (testing y observabilidad).
□ Fase 6 completada (documentación y limpieza).
□ Todos los hallazgos críticos resueltos.
□ Todos los hallazgos altos resueltos.
□ Documentación sincronizada con el código.
□ Suite de tests con cobertura >60%.
□ Versionado unificado.
□ Proyecto en estado "producción limpia".
🎖️ FIRMA Y APROBACIÓN
Rol	Nombre	Fecha	Firma
Comandante en Jefe (OWNER)			
Oficial de Operaciones (ADMIN)			
Desarrollador Principal			
PARAGUAY FFAA [PRY] — Escuadrón Oficial MetalStorm
Plan de Mejora Continua v1.0 · 2026-09-16
Documento vivo — Actualizar tras cada fase completada.