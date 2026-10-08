# HALL-073 - CORS bloqueaba login en Render

**Fecha:** 2026-10-08
**Severidad:** CRITICA
**Estado:** RESUELTO
**Version afectada:** v4.5.x -> v4.6.0
**Tiempo de diagnostico:** ~30 min
**Tiempo de resolucion:** ~5 min

---

## Resumen

Tras la migracion de Fly.io a Render, el endpoint POST /api/auth/login devolvia
HTTP 500 en produccion. Ningun usuario podia iniciar sesion. En Fly.io
funcionaba perfectamente con el mismo codigo y la misma base de datos.

## Sintomas

- Login desde el navegador: status 500
- Logs del backend:
  [CORS] Origen bloqueado: https://paraguay-ffaa-metalstorm.onrender.com
  Acceso CORS bloqueado para el origen: https://paraguay-ffaa-metalstorm.onrender.com
- curl directo desde terminal SI funcionaba (sin header Origin).

## Causa Raiz

El middleware CORS en server.js valida el header Origin contra una whitelist
definida en la variable de entorno ALLOWED_ORIGINS.

La variable en Render solo incluia:
https://paraguay-ffaa-metalstorm.fly.dev,http://localhost:3000

Faltaba: https://paraguay-ffaa-metalstorm.onrender.com

Cuando el navegador hacia el login, enviaba Origin: https://paraguay-ffaa-metalstorm.onrender.com,
que no estaba en la whitelist -> el middleware lanzaba un error -> el handler global lo
convertia en HTTP 500.

## Solucion

Actualizar la variable de entorno ALLOWED_ORIGINS en Render:

https://paraguay-ffaa-metalstorm.onrender.com,https://paraguay-ffaa-metalstorm.fly.dev,http://localhost:3000

Guardar -> Render auto-deploya (~2 min) -> login funciona.

No requirio cambios de codigo.

## Lecciones Aprendidas

1. Al migrar de plataforma, auditar TODAS las env vars, no solo las criticas.
2. El health check debe incluir validacion de CORS.
3. Los errores de CORS deberian devolver 403, no 500.
4. Documentar la lista de origenes permitidos en docs/DEPLOYMENT_GUIDE.md.

## Referencias

- server.js (middleware CORS)
- src/config/env.js (ALLOWED_ORIGINS)
- Dashboard Render -> Environment
- HALL-072 (cold start de Render)
