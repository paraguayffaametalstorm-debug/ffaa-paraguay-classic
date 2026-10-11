# 📚 Documentación — PARAGUAY-FFAA | METALSTORM

> **Índice maestro de la documentación técnica, operativa y de gestión del escuadrón PARAGUAY FFAA `[PRY]` en MetalStorm.**
>
> **Última actualización:** 2026-10-11
> **Versión del sistema:** v4.8.4

---

## 🏛️ Arquitectura

Documentación técnica del diseño del sistema, API y estructura de datos.

| Documento | Descripción |
|---|---|
| [🏛️ Arquitectura de Sistemas](./architecture/ARCHITECTURE.md) | Diseño de capas, seguridad C4ISR, modelado de datos y flujos operativos. |
| [📡 Referencia de la API RESTful](./architecture/API_REFERENCE.md) | Endpoints, parámetros, cabeceras de autenticación y esquemas de respuesta. |
| [🔄 Referencia de Migración SQL](./architecture/MIGRACION_SQL_REFERENCE.md) | Documentación técnica del proceso de migración de datos del rediseño de eventos. |

---

## 🚀 Despliegue

Guías para desplegar, configurar y mantener el sistema en producción.

| Documento | Descripción |
|---|---|
| [🚀 Guía de Despliegue en Producción](./deployment/DEPLOYMENT_GUIDE.md) | Manual táctico de operaciones de despliegue, configuración de entornos y validación. |
| [📊 Estado del Despliegue](./deployment/DEPLOYMENT_STATE.md) | Estado congelado del despliegue, esquema de base de datos y flujos críticos. |
| [📱 Configuración PWA](./deployment/PWA_SETUP.md) | Service Worker, caché offline y configuración para instalación standalone. |
| [🚀 Guía de Release y Versionado](./deployment/RELEASE.md) | Versionado automático con `release-please` y Conventional Commits. |

---

## 🎯 Operaciones

Manuales y políticas operativas del escuadrón.

| Documento | Descripción |
|---|---|
| [📖 Manual de Usuario](./operations/USER_MANUAL.md) | Guía operativa para pilotos y oficiales del escuadrón. |
| [🛡️ Política de Inactivación](./operations/POLITICA_INACTIVACION.md) | Criterios, plazos y procedimientos para inactivación y reactivación de pilotos. |
| [🔧 Historial de Fixes Aplicados](./operations/FIXES_APPLIED.md) | Bitácora técnica de correcciones críticas y refactorizaciones. |

---

## 🗺️ Planificación

Roadmap, backlog y planes de trabajo.

| Documento | Descripción |
|---|---|
| [🗺️ Roadmap a 12 meses](./planning/ROADMAP.md) | Visión estratégica del sistema a mediano plazo. |
| [📋 Backlog de Ideas y Features](./planning/BACKLOG.md) | Documento vivo de propuestas, mejoras y deuda técnica. |
| [📊 Estado Actual](./planning/CURRENT_STATE.md) | Resumen ejecutivo del estado del sistema. |
| [🔧 Plan de Trabajo — Sprints Activos](./planning/PLAN_TRABAJO.md) | Documento operativo de correcciones, sincronización y deuda técnica. |
| [🎨 Plan de Mejora del Panel Admin](./planning/PLAN_MEJORA_ADMIN_PANEL.md) | Plan histórico del rediseño UX/UI del Panel de Comandancia. |
| [📜 Plan de Mejora Continua v1.0](./planning/PLAN_MEJORA_CONTINUA.md) | Plan histórico de las fases 0-6 (cerrado). |
| [🎖️ Plan de Trabajo — Veteranos](./planning/PLAN_TRABAJO_VETERANOS.md) | Plan de implementación del módulo de Veteranos (mentoría + RBAC). |

---

## 🎖️ Decisiones Arquitectónicas (ADRs)

Registro de decisiones arquitectónicas significativas (formato MADR 4.0).

| ADR | Título | Estado |
|---|---|---|
| [ADR-001](./adr/ADR-001-no-fallback-jwt-secret.md) | No fallback de JWT_SECRET | ✅ Accepted |
| [ADR-002](./adr/ADR-002-politica-endpoints-publico-privado.md) | Política de endpoints público/privado | ✅ Accepted |
| [ADR-003](./adr/ADR-003-backups-en-supabase.md) | Backups en Supabase | ✅ Accepted |
| [ADR-004](./adr/ADR-004-cuota-admin.md) | Cuota de ADMIN | ✅ Accepted |
| [ADR-005](./adr/ADR-005-presence-en-supabase.md) | Presence en Supabase | ✅ Accepted |
| [ADR-006](./adr/ADR-006-black-market-unificado.md) | Black Market unificado | ✅ Accepted |
| [ADR-007](./adr/ADR-007-rediseno-eventos-v2.md) | Rediseño de eventos v2 | ✅ Accepted |
| [ADR-008](./adr/ADR-008-ventanas-carga-desacopladas.md) | Ventanas de carga desacopladas | ✅ Accepted |
| [ADR-009](./adr/ADR-009-migracion-render.md) | Migración a Render.com | ✅ Accepted |
| [ADR-010](./adr/ADR-010-seccion-veteranos.md) | Sección Veteranos (mentoría + RBAC fino) | ✅ Accepted |

**Índice completo:** [`adr/README.md`](./adr/README.md)

---

## 📄 Propuestas Formales (RFCs)

Documentos de propuestas formales para cambios significativos.

- [RFC Index](./rfc/README.md)

---

## 🚨 Incidentes (Post-mortems)

Análisis post-mortem de incidentes técnicos significativos.

- [Incidentes Index](./incidentes/)

---

## 🔄 Handoffs entre Sesiones

Documentos de transferencia entre sesiones de desarrollo.

- [Handoff Index](./handoffs/)

---

## 📚 Otros Recursos

| Carpeta | Descripción |
|---|---|
| [`mockups/`](./mockups/) | Mockups HTML standalone de referencia. |
| [`normativa/`](./normativa/) | Normativa v3.0 (borrador). |
| [`prompts/`](./prompts/) | Prompts de continuación para sesiones de IA. |
| [`rediseno_eventos/`](./rediseno_eventos/) | Contexto y plan del rediseño de eventos. |
| [`templates/`](./templates/) | Templates reutilizables (admin-sections, etc.). |

---

## 🔗 Enlaces Rápidos

- [README principal del proyecto](../README.md)
- [CHANGELOG](../CHANGELOG.md)
- [Repositorio en GitHub](https://github.com/paraguayffaametalstorm-debug/ffaa-paraguay-classic)
- [Producción (Render)](https://paraguay-ffaa-metalstorm.onrender.com/)

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Índice maestro v1.0 · 2026-10-11**