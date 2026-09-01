import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

import { ENV } from './src/config/env.js';
import { apiLimiter } from './src/middlewares/rateLimiter.js';
import { errorHandler } from './src/middlewares/errorHandler.js';

// Route imports
import authRoutes from './src/routes/auth.routes.js';
import performancesRoutes from './src/routes/performances.routes.js';
import planesRoutes from './src/routes/planes.routes.js';
import normativasRoutes from './src/routes/normativas.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import ownerRoutes from './src/routes/owner.routes.js';
import profileRoutes from './src/routes/profile.routes.js';
import settingsRoutes from './src/routes/settings.routes.js';
import eventsRoutes from './src/routes/events.routes.js';
import presenceRoutes from './src/routes/presence.routes.js';
import dashboardRoutes from './src/routes/dashboard.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for reverse proxies (Fly.io, Cloud Run, Nginx) so rate limiter and HTTPS detection work correctly
app.set('trust proxy', 1);

// ============================================================
// SECURITY & PERFORMANCE MIDDLEWARES
// ============================================================

// Helmet HTTP Security Headers (Allowing AI Studio iframe embedding)
app.use(
  helmet({
    frameguard: false,
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Gzip / Deflate Compression
app.use(compression());

// CORS Whitelist Protection
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
      if (!origin) return callback(null, true);
      const isAllowed =
        ENV.ALLOWED_ORIGINS.includes(origin) ||
        origin.endsWith('.fly.dev') ||
        origin.endsWith('.run.app') ||
        origin.endsWith('.google.com') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Acceso CORS bloqueado para el origen: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// JSON Body Parser with safe limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Global API rate limiter
app.use('/api/', apiLimiter);

// ============================================================
// API ROUTES MOUNTING
// ============================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'PARAGUAY-FFAA | METALSTORM Tactical Core',
    version: '3.1.0',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/performances', performancesRoutes);
app.use('/api/planes', planesRoutes);
app.use('/api/normativas', normativasRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Compatibility aliases
app.use('/api/catalog', planesRoutes);

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

// SPA fallback for all remaining client routes
app.get('*all', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server
app.listen(ENV.PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor PARAGUAY-FFAA | METALSTORM activo en puerto ${ENV.PORT} (0.0.0.0:${ENV.PORT})`);
});
