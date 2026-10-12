// tests/middlewares/verifyDiscordSignature.test.js
//
// F1.6d — Tests del middleware verifyDiscordSignature.
//
// Estrategia: generamos una keypair Ed25519 efímera en beforeAll y
// la inyectamos en DISCORD.publicKey. Firmamos requests de prueba
// con la clave privada y verificamos el comportamiento del middleware.
//
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { verifyDiscordSignature } from '../../src/middlewares/verifyDiscordSignature.js';

// ── Keypair Ed25519 efímera para toda la suite ────────────────
let rawPublicKeyHex;   // 32 bytes en hex (64 chars) — como Discord
let privateKeyObj;     // KeyObject privada para firmar

// ── Helper: construir app Express mínima con rawBody ──────────
function buildTestApp() {
  const app = express();
  app.use(express.json({
    verify: (req, _res, buf) => {
      // Simula el comportamiento de server.js (F1.6d commit 1).
      if (req.path === '/api/discord/interactions') {
        req.rawBody = buf;
      }
    }
  }));
  app.post('/api/discord/interactions', verifyDiscordSignature, (req, res) => {
    res.status(200).json({ ok: true, body: req.body });
  });
  return app;
}

// ── Helper: firmar un payload como Discord ────────────────────
function signRequest(rawBodyString, timestamp) {
  const message = Buffer.concat([
    Buffer.from(timestamp, 'utf8'),
    Buffer.from(rawBodyString, 'utf8')
  ]);
  const signature = crypto.sign(null, message, privateKeyObj);
  return {
    signatureHex: signature.toString('hex'),
    timestamp
  };
}

beforeAll(async () => {
  // Generar keypair Ed25519.
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  // Extraer los 32 bytes raw de la public key.
  // La DER SPKI completa son 44 bytes; el prefix (12 bytes) + raw (32 bytes).
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  rawPublicKeyHex = spkiDer.subarray(spkiDer.length - 32).toString('hex');
  privateKeyObj = privateKey;

  // Inyectar la public key en DISCORD (simula env var DISCORD_PUBLIC_KEY).
  const { DISCORD } = await import('../../src/config/discord.js');
  DISCORD.enabled = true;
  DISCORD.publicKey = rawPublicKeyHex;
  DISCORD.botToken = 'test-bot-token';
  DISCORD.applicationId = '1234567890';
});

// ── Tests ─────────────────────────────────────────────────────

describe('verifyDiscordSignature', () => {
  let app;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('01 — firma válida con PING → 200 y pasa al controller', async () => {
    const body = { type: 1 };
    const rawBody = JSON.stringify(body);
    const { signatureHex, timestamp } = signRequest(rawBody, '1700000000');

    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Ed25519', signatureHex)
      .set('X-Signature-Timestamp', timestamp)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.body).toEqual({ type: 1 });
  });

  it('02 — firma válida con APPLICATION_COMMAND → 200', async () => {
    const body = { type: 2, data: { name: 'torneo' } };
    const rawBody = JSON.stringify(body);
    const { signatureHex, timestamp } = signRequest(rawBody, '1700000001');

    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Ed25519', signatureHex)
      .set('X-Signature-Timestamp', timestamp)
      .send(body);

    expect(res.status).toBe(200);
  });

  it('03 — firma inválida (bytes random) → 401 INVALID_SIGNATURE', async () => {
    const body = { type: 1 };
    const fakeSignature = crypto.randomBytes(64).toString('hex');

    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Ed25519', fakeSignature)
      .set('X-Signature-Timestamp', '1700000000')
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('04 — firma válida pero timestamp alterado → 401', async () => {
    const body = { type: 1 };
    const rawBody = JSON.stringify(body);
    const { signatureHex } = signRequest(rawBody, '1700000000');

    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Ed25519', signatureHex)
      .set('X-Signature-Timestamp', '9999999999') // timestamp distinto
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('05 — firma válida pero body alterado (tampering) → 401', async () => {
    const originalBody = { type: 1 };
    const rawOriginal = JSON.stringify(originalBody);
    const { signatureHex, timestamp } = signRequest(rawOriginal, '1700000000');

    // Enviamos OTRO body con la misma firma.
    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Ed25519', signatureHex)
      .set('X-Signature-Timestamp', timestamp)
      .send({ type: 2, malicious: true });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('06 — sin header X-Signature-Ed25519 → 401', async () => {
    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Timestamp', '1700000000')
      .send({ type: 1 });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('07 — sin header X-Signature-Timestamp → 401', async () => {
    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Ed25519', crypto.randomBytes(64).toString('hex'))
      .send({ type: 1 });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('08 — sin headers de firma → 401', async () => {
    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .send({ type: 1 });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('09 — firma con hex malformado (no hex) → 401', async () => {
    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Ed25519', 'ZZZZ-not-hex-ZZZZ')
      .set('X-Signature-Timestamp', '1700000000')
      .send({ type: 1 });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });

  it('10 — DISCORD_ENABLED=false → 503 DISCORD_NOT_CONFIGURED', async () => {
    const { DISCORD } = await import('../../src/config/discord.js');
    const originalEnabled = DISCORD.enabled;
    DISCORD.enabled = false;

    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Ed25519', crypto.randomBytes(64).toString('hex'))
      .set('X-Signature-Timestamp', '1700000000')
      .send({ type: 1 });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DISCORD_NOT_CONFIGURED');

    DISCORD.enabled = originalEnabled; // restaurar
  });

  it('11 — DISCORD_PUBLIC_KEY vacía → 503 DISCORD_NOT_CONFIGURED', async () => {
    const { DISCORD } = await import('../../src/config/discord.js');
    const original = DISCORD.publicKey;
    DISCORD.publicKey = '';

    const res = await request(app)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Ed25519', crypto.randomBytes(64).toString('hex'))
      .set('X-Signature-Timestamp', '1700000000')
      .send({ type: 1 });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('DISCORD_NOT_CONFIGURED');

    DISCORD.publicKey = original; // restaurar
  });

  it('12 — rawBody ausente (express.json sin verify) → 401', async () => {
    // App SIN el verify (simula un server.js mal configurado).
    const appNoRawBody = express();
    appNoRawBody.use(express.json()); // sin verify
    appNoRawBody.post(
      '/api/discord/interactions',
      verifyDiscordSignature,
      (_req, res) => res.status(200).json({ ok: true })
    );

    const body = { type: 1 };
    const rawBody = JSON.stringify(body);
    const { signatureHex, timestamp } = signRequest(rawBody, '1700000000');

    const res = await request(appNoRawBody)
      .post('/api/discord/interactions')
      .set('Content-Type', 'application/json')
      .set('X-Signature-Ed25519', signatureHex)
      .set('X-Signature-Timestamp', timestamp)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_SIGNATURE');
  });
});