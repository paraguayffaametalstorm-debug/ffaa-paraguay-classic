// src/routes/discord.routes.js
//
// F1.6d — Router de Discord HTTP Interactions.
//
// Expone:
//   POST /api/discord/interactions → verifyDiscordSignature → handleInteraction
//
// SIN requireAuth: Discord no manda JWT.
// SIN requireRole: la firma Ed25519 es la autenticación.
// SIN apiLimiter: la firma ya es autenticación criptográfica. El limiter
// global (600 req/15min) es suficiente si algún día se necesita, pero
// montamos este router ANTES del limiter para no bloquear reintentos
// legítimos de Discord.
//
// Referencia:
//   https://discord.com/developers/docs/interactions/receiving-and-responding
//
import express from 'express';
import { verifyDiscordSignature } from '../middlewares/verifyDiscordSignature.js';
import { handleInteraction } from '../controllers/discord.controller.js';

const router = express.Router();

// POST /api/discord/interactions
//   1. verifyDiscordSignature → valida firma Ed25519 (401/503 si falla).
//   2. handleInteraction → responde al PING o ejecuta el slash command.
router.post(
  '/interactions',
  verifyDiscordSignature,
  handleInteraction
);

export default router;