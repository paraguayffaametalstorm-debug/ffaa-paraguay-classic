[1mdiff --git a/README.md b/README.md[m
[1mindex b03c2b4..8799ebd 100644[m
[1m--- a/README.md[m
[1m+++ b/README.md[m
[36m@@ -630,26 +630,26 @@[m [mLa asignación del estado de combate se evalúa matemáticamente en el servidor[m
 [m
 ### Documentos de gestión del proyecto[m
 [m
[31m-- 🗺️ **[Visión Estratégica a 12 meses (Roadmap)](./ROADMAP.md)**[m
[31m-- 📋 **[Backlog de Ideas y Features](./BACKLOG.md)**[m
[31m-- 🔧 **[Plan de Trabajo — Sprints Activos](./PLAN_TRABAJO.md)**[m
[32m+[m[32m- 🗺️ **[Visión Estratégica a 12 meses (Roadmap)](./docs/planning/ROADMAP.md)**[m
[32m+[m[32m- 📋 **[Backlog de Ideas y Features](./docs/planning/BACKLOG.md)**[m
[32m+[m[32m- 🔧 **[Plan de Trabajo — Sprints Activos](./docs/planning/PLAN_TRABAJO.md)**[m
 - 📝 **[Histórico de Versiones (Changelog)](./CHANGELOG.md)**[m
 [m
 ### Documentos técnicos[m
 [m
[31m-- 🚀 **[Estado Congelado del Despliegue (Deployment State)](./DEPLOYMENT_STATE.md)**[m
[31m-- 📊 **[Resumen Ejecutivo de Estado Actual (Current State)](./CURRENT_STATE.md#resumen-ejecutivo)**[m
[31m-- 🔧 **[Historial de Fixes Aplicados y Lógica Tipada](./FIXES_APPLIED.md)**[m
[31m-- 📡 **[Referencia Completa de la API RESTful](./API_REFERENCE.md)**[m
[31m-- 🏛️ **[Arquitectura de Sistemas y Seguridad C4ISR](./ARCHITECTURE.md)**[m
[31m-- 🚀 **[Guía de Despliegue en Producción (Fly.io / Docker)](./DEPLOYMENT_GUIDE.md)**[m
[31m-- 📖 **[Manual de Usuario y Operaciones de Vuelo](./USER_MANUAL.md)**[m
[31m-- 📱 **[Configuración PWA, Service Worker y Modo Offline](./PWA_SETUP.md)**[m
[31m-- 🛡️ **[Política Oficial de Inactivación y Retiro Militar](./POLITICA_INACTIVACION.md)**[m
[32m+[m[32m- 🚀 **[Estado Congelado del Despliegue (Deployment State)](./docs/deployment/DEPLOYMENT_STATE.md)**[m
[32m+[m[32m- 📊 **[Resumen Ejecutivo de Estado Actual (Current State)](./docs/planning/CURRENT_STATE.md#resumen-ejecutivo)**[m
[32m+[m[32m- 🔧 **[Historial de Fixes Aplicados y Lógica Tipada](./docs/operations/FIXES_APPLIED.md)**[m
[32m+[m[32m- 📡 **[Referencia Completa de la API RESTful](./docs/architecture/API_REFERENCE.md)**[m
[32m+[m[32m- 🏛️ **[Arquitectura de Sistemas y Seguridad C4ISR](./docs/architecture/ARCHITECTURE.md)**[m
[32m+[m[32m- 🚀 **[Guía de Despliegue en Producción (Fly.io / Docker)](./docs/deployment/DEPLOYMENT_GUIDE.md)**[m
[32m+[m[32m- 📖 **[Manual de Usuario y Operaciones de Vuelo](./docs/operations/USER_MANUAL.md)**[m
[32m+[m[32m- 📱 **[Configuración PWA, Service Worker y Modo Offline](./docs/deployment/PWA_SETUP.md)**[m
[32m+[m[32m- 🛡️ **[Política Oficial de Inactivación y Retiro Militar](./docs/operations/POLITICA_INACTIVACION.md)**[m
 [m
 ### Documentos normativos e históricos[m
 [m
[31m-- 📜 **[Plan de Mejora Continua v1.0 (Histórico, cerrado)](./PLAN_MEJORA_CONTINUA.md)**[m
[32m+[m[32m- 📜 **[Plan de Mejora Continua v1.0 (Histórico, cerrado)](./docs/planning/PLAN_MEJORA_CONTINUA.md)**[m
 - 🎖️ **[Decisiones Arquitectónicas (ADRs)](./docs/adr/)**[m
 - 📄 **[Propuestas Formales (RFCs)](./docs/rfc/)**[m
 - 🔄 **[Handoff entre Sesiones](./docs/SESSION_HANDOFF.md)**[m
[36m@@ -668,7 +668,7 @@[m [mEl proyecto usa **versionado automático** basado en [Conventional Commits](http[m
 4. Al mergear el PR, se crea el tag y la Release automáticamente.[m
 5. Render auto-deploya la nueva versión.[m
 [m
[31m-**Guía completa:** [`RELEASE.md`](./RELEASE.md)[m
[32m+[m[32m**Guía completa:** [`RELEASE.md`](./docs/deployment/RELEASE.md)[m
 [m
 ---[m
 [m
