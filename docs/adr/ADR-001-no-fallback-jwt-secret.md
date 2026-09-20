# ADR-001: No usar fallback de JWT_SECRET

- **Fecha:** 2026-09-16
- **Estado:** Accepted
- **Decisores:** PJPIROVANI (OWNER) + Comando C4ISR
- **Relacionado con:** HALL-001

## Estado

Accepted (vigente desde 2026-09-16, validado por OWNER).

## Contexto y problema

El servidor backend utiliza JSON Web Tokens (JWT) firmados con una clave secreta (`JWT_SECRET`) para autenticar todas las peticiones a la API. Originalmente el código incluía un **fallback hardcodeado** (`'ffaa_pry_metalstorm_jwt_super_secret_key_2026'`) que se usaba cuando la variable de entorno `JWT_SECRET` no estaba definida.

Este fallback representaba un **riesgo crítico de seguridad**:

1. La clave era **pública** (visible en el repositorio).
2. Cualquier persona con acceso al código fuente podía **forjar tokens JWT válidos** y suplantar a cualquier usuario, incluido el OWNER.
3. La ausencia de `JWT_SECRET` en producción **no se detectaba al arrancar** — el servidor levantaba silenciosamente con la clave insegura.

El hallazgo fue registrado como **HALL-001** durante la auditoría de seguridad de la Fase 2.

## Factores de decisión

- **Seguridad:** prioridad máxima. Cero tolerancia a claves hardcodeadas.
- **Fail-fast:** el servidor debe **abortar el arranque** si la configuración está incompleta, en lugar de operar en estado inseguro.
- **Experiencia de desarrollo:** el modo `development` no debe requerir configurar `JWT_SECRET` manualmente.
- **Compatibilidad con Fly.io:** el secreto debe poder inyectarse vía `fly secrets set`.

## Opciones consideradas

1. **Mantener el fallback hardcodeado (status quo)**
   - **Pros:** cero fricción al desarrollar en local.
   - **Contras:** riesgo crítico de seguridad en producción. Inaceptable.

2. **Eliminar el fallback y abortar si falta en cualquier entorno**
   - **Pros:** máxima seguridad.
   - **Contras:** rompe la experiencia de desarrollo local (cada dev tendría que generar un secreto antes de arrancar).

3. **Eliminar el fallback en producción, mantener uno distinto para desarrollo** *(elegida)*
   - **Pros:** seguridad en producción + cero fricción en local.
   - **Contras:** requiere que el dev-only-secret sea claramente inseguro y no se use nunca en prod.

## Decisión

**Elegimos la Opción 3.** El servidor:

1. **Aborta el arranque** si `NODE_ENV === 'production'` y `JWT_SECRET` no está definido.
2. En `development`, si `JWT_SECRET` no está definido, usa un valor **explícitamente inseguro** (`'dev-only-insecure-secret-change-me'`) que no puede confundirse con un secreto real.
3. En Fly.io, el secreto se inyecta vía `fly secrets set JWT_SECRET="$(openssl rand -base64 48)"`.

El fallback hardcodeado `'ffaa_pry_metalstorm_jwt_super_secret_key_2026'` fue **eliminado por completo**.

## Consecuencias

### Positivas

- Elimina la posibilidad de forjar tokens con una clave conocida.
- El servidor **falla rápido** (fail-fast) si falta configuración crítica en producción.
- El secreto de producción se genera con `openssl rand -base64 48` (384 bits de entropía).
- Auditoría de seguridad pasa sin hallazgos CRÍTICOS relacionados con JWT.

### Negativas

- Un deploy sin `JWT_SECRET` configurado **no arranca**. Esto es deseado, pero requiere atención en el checklist de deploy.

### Neutrales

- El modo `development` sigue siendo "plug-and-play" (sin configuración obligatoria).

## Implementación

- `src/config/env.js:5` — comentario `// HALL-001: Prevenir arranque sin JWT_SECRET en producción.`
- `src/config/env.js:9-10` — `if (process.env.NODE_ENV === 'production' && !JWT_SECRET) { console.error('FATAL...'); process.exit(1); }`
- `src/config/env.js:18` — `JWT_SECRET: JWT_SECRET || 'dev-only-insecure-secret-change-me'`
- `src/middlewares/auth.js:22` — `jwt.verify(token, ENV.JWT_SECRET)`
- `CHANGELOG.md:791-797` — sección `HALL-001 (definitivo) → Eliminación del fallback de JWT_SECRET`
- `CHANGELOG.md:928-937` — configuración del secreto en Fly.io
- Commit `e02d2a3` — HALL-036/037: backups persistentes + sanitización PII (contexto de la auditoría)

## Pendiente de verificar

Nada pendiente. Evidencia directa en código y CHANGELOG.

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Fallback hardcodeado existía | `CHANGELOG.md:795` |
| Fallback eliminado definitivamente | `CHANGELOG.md:791-797` |
| Servidor aborta si `NODE_ENV=production` sin JWT_SECRET | `src/config/env.js:9-10` |
| Polyfill solo en dev | `src/config/env.js:18` |
| Secreto de producción vía `fly secrets` | `CHANGELOG.md:928-937` |
| Verificación en código de firma JWT | `src/middlewares/auth.js:22` |

## Referencias

- `docs/adr/README.md`
- Hallazgo **HALL-001** en `CHANGELOG.md`

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Recuperado con asistencia IA a partir de evidencia verificable el 2026-09-20.
> Sin información inventada.
