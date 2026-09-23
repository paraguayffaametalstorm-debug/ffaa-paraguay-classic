import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

import { ENV } from './src/config/env.js';
import { apiLimiter } from './src/middlewares/rateLimiter.js';
import { errorHandler } from './src/middlewares/errorHandler.js';
import passport, { configurePassport } from './src/config/passport.js';

// Route imports
import authRoutes from './src/routes/auth.routes.js';
import performancesRoutes from './src/routes/performances.routes.js';
import planesRoutes from './src/routes/planes.routes.js';
import planeModelsRoutes from './src/routes/plane-models.routes.js';
import normativasRoutes from './src/routes/normativas.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import ownerRoutes from './src/routes/owner.routes.js';
import profileRoutes from './src/routes/profile.routes.js';
import settingsRoutes from './src/routes/settings.routes.js';
import eventsRoutes from './src/routes/events.routes.js';
import eventsV2Routes from './src/routes/events-v2.routes.js';
import eventsV2BmRoutes from './src/routes/events-v2-bm.routes.js';
import presenceRoutes from './src/routes/presence.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';
import { startEventScheduler, getSchedulerStatus } from './src/utils/eventScheduler.js';
import { cleanupPresence } from './src/controllers/presence.controller.js';
import { checkReadiness } from './src/db/supabase.js';
import cron from 'node-cron';

// ============================================================
// GLOBAL ERROR HANDLERS (FIX-309)
// ============================================================
// Política: un error NO manejado deja el proceso en estado indefinido.
// La respuesta correcta es loguear con contexto y SALIR para que Fly.io
// reinicie la máquina en estado limpio. NO seguir operando.
//
// Referencia: https://nodejs.org/api/process.html#warning-using-uncaughtexception-correctly
// ============================================================

/**
 * Formatea un error para logging estructurado.
 * Evita "[object Object]" y expone stack + tipo + contexto.
 */
function formatProcessError(label, err) {
  const timestamp = new Date().toISOString();
  const type = err?.constructor?.name || typeof err;
  const message = err?.message || String(err);
  const stack = err?.stack || '(sin stack disponible)';
  return {
    timestamp,
    label,
    type,
    message,
    stack,
    pid: process.pid,
    uptime: Math.round(process.uptime()),
    node_version: process.version
  };
}

/**
 * Loguea el error y sale con código 1 tras un tick (flush de stdout/stderr).
 * El setImmediate garantiza que el log llegue a Fly.io antes de morir.
 */
function logAndExit(label, err) {
  const payload = formatProcessError(label, err);
  console.error(`❌ [Process] ${label}:`);
  console.error(JSON.stringify(payload, null, 2));
  // Flush async: esperar un tick antes de salir.
  setImmediate(() => process.exit(1));
}

// Unhandled Rejection: promesa rechazada sin catch.
// Node 15+ default: mata el proceso. Nosotros hacemos lo mismo pero con log.
process.on('unhandledRejection', (reason) => {
  logAndExit('Unhandled Rejection', reason);
});

// Uncaught Exception: error síncrono no capturado.
// El proceso queda en estado indefinido. Salir es la única opción segura.
process.on('uncaughtException', (err) => {
  logAndExit('Uncaught Exception', err);
});

// ============================================================
// GRACEFUL SHUTDOWN (FIX-309)
// ============================================================
// Fly.io envía SIGTERM en cada deploy (rolling). Cerramos el HTTP server
// y salimos limpio para evitar conexiones colgadas.
// ============================================================

let httpServer = null; // Se asigna en app.listen()

function gracefulShutdown(signal) {
  console.log(`🛑 [Process] ${signal} recibido. Iniciando apagado ordenado...`);

  if (!httpServer) {
    console.log('🛑 [Process] HTTP server no inicializado. Saliendo directo.');
    process.exit(0);
  }

  // Timeout de seguridad: si en 10s no cerró, forzar exit.
  const forceExit = setTimeout(() => {
    console.error('⚠️ [Process] Timeout de apagado (10s). Forzando exit.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  httpServer.close((err) => {
    if (err) {
      console.error('❌ [Process] Error cerrando HTTP server:', err.message);
      process.exit(1);
    }
    console.log('✅ [Process] HTTP server cerrado limpiamente. Saliendo.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for reverse proxies (Fly.io, Cloud Run, Nginx)
app.set('trust proxy', 1);

// ============================================================
// IMMEDIATE FAST HEALTH CHECKS (Before heavy middlewares)
// ============================================================

// Lightweight plain text probe for Fly.io
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ============================================================
// READINESS HEALTHCHECK (FIX-306)
// ============================================================
// Diferencia con /health:
//   - /health       → liveness puro (200 si el proceso responde).
//   - /api/health   → readiness real. Chequea Supabase.
//                     Si Supabase falla → 503 (Fly.io saca del LB).
//
// Query params:
//   ?deep=false     → omite el chequeo de Supabase (respuesta rápida).
//
// El estado del scheduler se reporta pero NO bloquea el readiness
// (es una tarea de mantenimiento, no de servicio al usuario).
// ============================================================
app.get('/api/health', async (req, res) => {
  const startedAt = Date.now();
  const deep = req.query.deep !== 'false';

  const health = {
    status: 'online',
    system: 'PARAGUAY-FFAA | METALSTORM Tactical Core',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {}
  };

  if (deep) {
    // Supabase: readiness real
    const supa = await checkReadiness();
    health.checks.supabase = {
      ok: supa.ok,
      reason: supa.reason || null,
      message: supa.message || null,
      duration_ms: Date.now() - startedAt
    };

    // Scheduler: informativo, no bloqueante
    health.checks.scheduler = getSchedulerStatus();

    // Supabase caído → readiness degradado
    if (!supa.ok) {
      health.status = 'degraded';
      return res.status(503).json(health);
    }
  }

  return res.status(200).json(health);
});

// ============================================================
// SECURITY & PERFORMANCE MIDDLEWARES
// ============================================================

// Helmet HTTP Security Headers
// HALL-003: frameguard + contentSecurityPolicy activados.
// Se mantiene AI Studio iframe embedding en frame-ancestors.
app.use(
  helmet({
    frameguard: false, // AI Studio iframe depende de esto
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "data:"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:"
        ],
        connectSrc: [
          "'self'",
          "https://*.supabase.co",
          "https://api.cloudinary.com",
          "https://res.cloudinary.com",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
          "wss://*.supabase.co"
        ],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: [
          "'self'",
          "https://*.fly.dev",
          "https://aistudio.google.com",
          "https://*.google.com"
        ],
        frameAncestors: [
          "*",
          "https://*.fly.dev",
          "https://aistudio.google.com",
          "https://*.google.com"
        ],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        workerSrc: ["'self'", "blob:"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'no-referrer' }
  })
);

// Gzip / Deflate Compression
app.use(compression());

// CORS Whitelist Protection (HALL-002: whitelist estricta)
// Los orígenes permitidos se definen en src/config/env.js vía ALLOWED_ORIGINS
// (o el default hardcodeado que incluye la app de producción y localhost de dev).
const allowedOrigins = new Set(
  ENV.ALLOWED_ORIGINS.map(o => o.replace(/\/+$/, '').toLowerCase())
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin, PWA)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, '').toLowerCase();

      if (allowedOrigins.has(normalizedOrigin)) {
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

// JSON Body Parser with safe limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Global API rate limiter
app.use('/api', apiLimiter);

// Passport OAuth Initialization
configurePassport();
app.use(passport.initialize());

// ============================================================
// API ROUTES MOUNTING
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/performances', performancesRoutes);
app.use('/api/planes', planesRoutes);
app.use('/api/plane-models', planeModelsRoutes);
app.use('/api/normativas', normativasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/events', eventsRoutes);
// ============================================================
// ORDEN CRÍTICO DE MONTAJE (F4.2.2-B)
// ============================================================
// eventsV2BmRoutes DEBE ir ANTES que eventsV2Routes.
// Razón: el handler GET /api/events-v2/:id captura cualquier path
// bajo /api/events-v2/* como un evento con id=<segmento>. Si se
// montara primero, /api/events-v2/bm/active matchearía contra /:id
// con id="bm" y devolvería 404 en vez de llegar al handler BM.
// ============================================================
app.use('/api/events-v2/bm', eventsV2BmRoutes);
app.use('/api/events-v2', eventsV2Routes);
app.use('/api/presence', presenceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Compatibility aliases
app.use('/auth', authRoutes);
app.use('/api/catalog', planesRoutes);

// Explicit 404 handler for unmatched API routes - guarantees JSON, NEVER HTML
app.use(['/api', '/auth'], (req, res) => {
  res.status(404).json({
    success: false,
    error: `Ruta de API no encontrada: ${req.method} ${req.originalUrl}`,
    code: 'API_ENDPOINT_NOT_FOUND'
  });
});

// ============================================================
// STATIC FILES & SPA SERVING
// ============================================================

app.use(
  express.static(__dirname, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  })
);

// Explicit routes for tactical auth pages
app.get('/link-account', (req, res) => {
  res.sendFile(path.join(__dirname, 'link-account.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'reset-password.html'));
});

// SPA fallback for all remaining client routes
app.get('*all', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================

httpServer = app.listen(ENV.PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor PARAGUAY-FFAA | METALSTORM activo en puerto ${ENV.PORT} (0.0.0.0:${ENV.PORT})`);

  // ============================================================
  // START EVENT SCHEDULER (F2.9)
  // ============================================================
  // Auto-crea eventos SQ cada jueves 00:00 UTC.
  // Ejecuta backfill de las últimas 12 semanas al arrancar.
  // Advisory lock garantiza que solo 1 réplica de Fly.io ejecute.
  // ============================================================
  try {
    startEventScheduler();
    console.log('✅ [Server] Event Scheduler iniciado.');
  } catch (err) {
    console.error('❌ [Server] Error iniciando Event Scheduler:', err.message);
    // No bloquea el arranque del servidor.
  }

  // ============================================================
  // START PRESENCE CLEANUP CRON (FIX-209)
  // ============================================================
  // Cada 5 minutos: elimina registros de presence con last_seen < NOW() - 1h.
  // Evita acumulacion infinita de filas en la tabla `presence`.
  // Advisory lock NO es necesario: DELETE es idempotente.
  // ============================================================
  try {
    cron.schedule('*/5 * * * *', async () => {
      try {
        await cleanupPresence();
      } catch (err) {
        // FIX-309: catch explícito para evitar unhandledRejection → exit(1).
        // Si el cleanup falla, logueamos y seguimos. El próximo tick reintenta.
        console.error('⚠️ [Presence] Error en cleanup cron:', err?.message || err);
      }
    });
    console.log('✅ [Server] Presence cleanup cron iniciado (cada 5 min).');
  } catch (err) {
    console.error('❌ [Server] Error iniciando Presence cron:', err.message);
    // No bloquea el arranque del servidor.
  }
});

