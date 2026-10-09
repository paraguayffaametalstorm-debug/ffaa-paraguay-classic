📋 Plan de Mejora — Panel de Administración
Documento de trabajo para el rediseño UX/UI del Panel de Comandancia.
Fecha de inicio: 2026-10-09
Responsable: Comando C4ISR
Versión objetivo: v4.7.0
Estado: ✅ **COMPLETADA** (F6 cerrada el 2026-10-09)

🎯 1. OBJETIVO
Rediseñar el Panel de Administración (components/admin-panel.html) siguiendo mejores prácticas de UX/UI para dashboards administrativos (patrones de Linear, Vercel, Stripe Dashboard, Notion).

Problemas actuales
#	Problema	Impacto
A	Todo en una sola columna vertical	Scroll excesivo, secciones ocultas
B	Sin navegación interna	Admin no encuentra secciones
C	Tabla de miembros densa	Difícil de escanear con 61 pilotos
D	Sección "Exportar Resultados" (v4.6.0) huérfana	Fácil de olvidar (HALL-074)
E	Sin indicador de frescura de datos	Admin no sabe si son actuales
F	Catálogo de aeronaves vive en otra vista	Navegación fragmentada
Objetivo final
Panel único con sidebar colapsable, 5 secciones especializadas y acciones rápidas inline, siguiendo patrones de dashboards modernos.

🏗️ 2. DECISIONES DE DISEÑO (MEJORES PRÁCTICAS)
#	Decisión	Fundamento
1	Sidebar colapsable en desktop	Da control al usuario. Patrón Linear/Vercel.
2	Sidebar dentro del panel (no reemplaza nav global)	Menos disruptivo. Patrón Stripe Dashboard.
3	Sidebar = drawer en mobile	Patrón universal mobile.
4	5 secciones especializadas	1 objetivo por sección. Principio de responsabilidad única visual.
5	Lazy loading de secciones	Performance. Solo carga secciones visitadas.
6	Persistencia en localStorage	Continuidad de sesión.
7	Skeleton screens en lugar de spinners	Percepción de velocidad.
8	Empty states con acción sugerida	Guía al usuario.
9	Modal para confirmaciones destructivas	Nunca confirm() nativo.
10	WCAG AA (contraste 4.5:1, focus visible, ARIA)	Accesibilidad.
📐 3. ARQUITECTURA VISUAL
text
┌────────────────────────────────────────────────────────────────┐
│  [HEADER GLOBAL: logo, user menu, notificaciones]              │
├──────────┬─────────────────────────────────────────────────────┤
│          │                                                     │
│ SIDEBAR  │  CONTENT AREA                                       │
│ 240px    │  (max-width: 1400px, centrado)                      │
│          │                                                     │
│  📊      │  ┌───────────────────────────────────────────┐      │
│  👥      │  │  Header de sección + acciones             │      │
│  📅      │  ├───────────────────────────────────────────┤      │
│  ✈️      │  │                                           │      │
│  ⚙️      │  │  Contenido                                │      │
│          │  │                                           │      │
│  ◀▶      │  └───────────────────────────────────────────┘      │
└──────────┴─────────────────────────────────────────────────────┘
Secciones del sidebar
#	Sección	Contenido	Acciones destacadas
1	📊 Resumen	KPIs + distribución + accesos rápidos	—
2	👥 Dotación	Tabs (Activos default) + tabla + alta de piloto	+ Registrar Piloto
3	📅 Eventos	Evento activo + lista + carga masiva + Export (sub-sección)	+ Crear Evento
4	✈️ Catálogo	CRUD de aeronaves (integrado de admin-plane-models.html)	+ Agregar Aeronave
5	⚙️ Estado	Scheduler + health + logs + versión	🔄 Forzar tick (solo OWNER)
Comportamiento responsive
Breakpoint	Sidebar	Content
< 768px	Drawer (oculto, trigger ☰)	100%
768px–1280px	Colapsado (64px, solo íconos)	Resto
> 1280px	Expandido (240px, toggle manual)	Resto
📁 4. ESTRUCTURA DE ARCHIVOS
Nuevos
text
components/
├── admin-panel.html              ← REFACTORIZADO (shell + sidebar)
├── admin-sections/               ← NUEVA CARPETA
│   ├── admin-summary.html        ← Sección Resumen
│   ├── admin-members.html        ← Sección Dotación
│   ├── admin-events.html         ← Sección Eventos (incluye Export)
│   ├── admin-catalog.html        ← Sección Catálogo (movido)
│   └── admin-status.html         ← Sección Estado (NUEVA)

css/
└── admin-layout.css              ← NUEVO: estilos del sidebar

js/
└── admin-sections.js             ← NUEVO: lógica del sidebar

docs/
└── mockups/
    └── mockup-admin-panel.html   ← NUEVO: mockup standalone
Modificados
text
components/admin-panel.html       ← Shell + sidebar (contenido delegado)
js/views.js                       ← Funciones admin refactorizadas
css/views.css                     ← Estilos generales + modo compacto
sw.js                             ← Bump CACHE_NAME
index.html                        ← Bump assets
🚦 5. FASES DE IMPLEMENTACIÓN
Fase	Descripción	Entregable	Duración
F1	Mockup HTML estático standalone	docs/mockups/mockup-admin-panel.html	45 min
F2	Refactor admin-panel.html (shell + sidebar)	HTML base funcionando	1.5h
F3	Crear las 5 secciones en admin-sections/	5 archivos HTML	2h
F4	CSS del layout (sidebar + responsive + compacto)	admin-layout.css	1.5h
F5	JS: switchAdminSection() + persistencia + Estado	admin-sections.js + funciones	2h
F6	Testing mobile/desktop + deploy	Deploy + smoke test	1h
Total			~8.5h
📝 6. DETALLE DE FASES
F1 — Mockup HTML Estático
Objetivo: validar visualmente el diseño antes de tocar código real.

Entregable: docs/mockups/mockup-admin-panel.html (standalone, abrible en navegador).

Contenido:

Sidebar con las 5 secciones + toggle colapsable.

Sección Resumen con KPIs dummy.

Sección Dotación con tabla dummy (5 filas).

Simulación responsive (media queries).

Sin JS de backend, solo JS de interacción visual.

Criterio de cierre: aprobación visual del OWNER.

F2 — Refactor de admin-panel.html
Objetivo: crear el shell del panel con sidebar + contenedor de secciones.

Estructura:

html
<div id="adminPanel" class="view">
  <div class="admin-layout">
    <aside class="admin-sidebar" id="adminSidebar">
      <!-- Sidebar con las 5 secciones -->
    </aside>
    <main class="admin-content" id="adminContent">
      <div id="adminSectionContent"></div>
    </main>
  </div>
</div>
Criterio de cierre: shell funcional, secciones cargan vía switchAdminSection().

F3 — Crear las 5 secciones
Objetivo: mover el contenido del panel actual a los 5 archivos de sección.

Sección	Contenido movido desde
admin-summary.html	Cards de KPIs + distribución + accesos rápidos
admin-members.html	Tabs + filtros + tabla + alta de piloto
admin-events.html	Card evento activo + lista + carga masiva + Export
admin-catalog.html	Contenido de admin-plane-models.html
admin-status.html	NUEVO — scheduler + health + logs
Criterio de cierre: cada sección funciona de forma aislada.

F4 — CSS del Layout
Objetivo: estilos del sidebar + responsive + modo compacto.

Archivos:

css/admin-layout.css (nuevo).

css/views.css (agregar .table-compact).

Clases clave:

css
.admin-layout            /* Grid container */
.admin-sidebar           /* Sidebar (240px o 64px colapsado) */
.admin-sidebar-btn       /* Botón de sección */
.admin-sidebar-btn.active /* Sección activa (borde dorado) */
.admin-content           /* Área de contenido */
.admin-section-header    /* Header sticky de sección */
.table-compact           /* Modo compacto de tabla */
Criterio de cierre: layout responsive en los 3 breakpoints.

F5 — JS del Sidebar + Lógica
Objetivo: funcionalidad del sidebar + persistencia + sección Estado.

Funciones nuevas:

javascript
switchAdminSection(sectionId)      // Cambia de sección
toggleAdminSidebar()                // Colapsa/expande sidebar
initAdminSummarySection()           // Init de Resumen
initAdminMembersSection()           // Init de Dotación
initAdminEventsSection()            // Init de Eventos
initAdminCatalogSection()           // Init de Catálogo
initAdminStatusSection()            // Init de Estado
renderAdminStatusSection()          // Carga health + scheduler
Persistencia:

localStorage.admin_active_section → última sección visitada.

localStorage.admin_sidebar_collapsed → estado del sidebar.

Criterio de cierre: funcionalidad completa end-to-end.

F6 — Testing + Deploy
Checklist:

□ Test de cada sección en desktop.
□ Test responsive en 3 breakpoints.
□ Test de persistencia (recargar página mantiene sección).
□ Test de acciones rápidas.
□ Bump CACHE_NAME en sw.js.
□ Bump assets en index.html.
□ Deploy a Render.
□ Smoke test.
Criterio de cierre: deploy exitoso + smoke test OK.

🛠️ 7. HERRAMIENTAS Y WORKFLOW
7.1 Estilo de trabajo del OWNER
El OWNER usa Visual Studio Code con CMD de Windows y prefiere:

Scripts automatizados para aplicar cambios masivos (ej: scripts/*.cjs).

Documentación en .md actualizada en cada fase.

Commits descriptivos con formato tipo(scope): mensaje.

Rollback documentado para cada cambio crítico.

node --check después de cada archivo modificado.

7.2 Scripts automatizados previstos
Script	Propósito
scripts/fase-f2-admin-shell.cjs	Aplicar el shell HTML de forma quirúrgica
scripts/fase-f3-admin-sections.cjs	Crear los 5 archivos de sección
scripts/fase-f4-admin-layout-css.cjs	Insertar CSS en views.css
scripts/fase-f5-admin-js.cjs	Agregar funciones a views.js
scripts/bump-version.cjs	Actualizar versión en todos los archivos
Reglas para scripts:

✅ Leer archivos, aplicar cambios, escribir.

✅ Backup automático .bak-faseN antes de modificar.

✅ node --check después de modificar JS.

✅ Rollback con git revert documentado.

❌ No usar grep/cat/sed (Windows).

❌ No usar anchors frágiles sin normalizar line endings (HALL-068).

7.3 Documentación a actualizar por fase
Documento	Fase	Cambios
CHANGELOG.md	F6	Entrada [4.7.0]
CURRENT_STATE.md	F6	Nueva versión + features
ARCHITECTURE.md	F6	Sección panel admin
PLAN_TRABAJO.md	F6	Fase cerrada
BACKLOG.md	F6	Items movidos
docs/HANDOFF-v4.7.0.md	F6	Handoff para próxima sesión
7.4 Advertencia de IA — 95% de tokens
Cuando la IA detecte que está cerca del 95% de su capacidad de tokens:

Avisar al OWNER en un mensaje claro:

text
⚠️ ADVERTENCIA: Tokens al 95%. Generando prompt de continuación.
Generar un prompt completo para continuar en una nueva conversación:

Contexto del proyecto.

Estado actual de la fase.

Fase siguiente a ejecutar.

Archivos relevantes a adjuntar.

Comandos de verificación rápida.

Guardar el prompt en docs/prompts/prompt-continuacion-fase-N.md.

Formato del prompt de continuación:

markdown
# 🚀 PROMPT DE CONTINUACIÓN — Fase N del Rediseño del Panel Admin

## Contexto
Estoy trabajando en el rediseño del Panel de Administración de PARAGUAY-FFAA | METALSTORM.
Fase N: [nombre de la fase].

## Estado actual
- Fase N-1: ✅ Completada (commit abc1234).
- Fase N: 🟡 En curso (50% completado).
- Archivos modificados: [lista].

## Próximo paso
Continuar con la Fase N desde el punto [X].

## Archivos a adjuntar
- components/admin-panel.html
- js/views.js
- css/views.css
- [otros]

## Comandos de verificación
...
📊 8. MÉTRICAS DE ÉXITO
Métrica	Antes	Después (objetivo)
Scroll necesario para acceder a Export	~8 pantallas	0 (está en Eventos)
Clicks para reset password de un piloto	3	1 (acción inline)
Tiempo para encontrar un piloto	~10s	~3s (búsqueda + filtro activos)
Secciones visibles sin scroll	1-2	5 (sidebar)
Mobile usability (Lighthouse)	~70	> 90
Tiempo de carga inicial del panel	~2s	< 1s (lazy loading)
🚫 9. LO QUE NO SE TOCA
Componente	Razón
Backend (src/controllers/admin.controller.js)	Refactor solo frontend. Sin cambios de API.
Endpoints (/api/admin/*)	Sin cambios de contrato.
Base de datos	Sin migraciones.
Funciones existentes (changeUserRole, resetPilotPassword, etc.)	Se mantienen intactas, solo se reubican.
Modales tácticos (inactivar, reactivar, completar motivo)	Se mantienen sin cambios.
Estilos globales (global.css, tactical-design.css)	Sin cambios. Solo views.css y nuevo admin-layout.css.
🔄 10. RIESGOS Y MITIGACIONES
Riesgo	Probabilidad	Mitigación
Romper funcionalidad existente	Media	Refactor incremental + mantener IDs
Tests existentes fallan	Baja	No se toca backend
Cache del SW sirve HTML viejo	Alta	Bump CACHE_NAME obligatorio
Pérdida de la sección Export	Baja	Ya integrada en Eventos (F3)
Mobile roto con sidebar	Media	Test en cada breakpoint
Confusión del OWNER con el cambio	Media	Mockup previo (F1) + aprobación
Tokens de IA agotados a mitad	Alta	Generar prompt de continuación al 95%
📅 11. CRONOGRAMA
Día	Fase	Entregable
D+0	F1	Mockup standalone aprobado
D+1	F2	Shell + sidebar funcional
D+1	F3	5 secciones creadas
D+2	F4	CSS del layout
D+2	F5	JS del sidebar + Estado
D+3	F6	Deploy + smoke test
D+3	Docs	Documentación actualizada
Total: ~3 días de trabajo efectivo (con dedicación parcial).

✅ 12. CRITERIOS DE CIERRE
Del proyecto (todos los criterios deben cumplirse)
□ Sidebar funcional con 5 secciones.
□ Colapsable en desktop, drawer en mobile.
□ Persistencia de sección activa en localStorage.
□ Sección Dotación abre con tab "Activos" por defecto.
□ Modo compacto de tabla funcional.
□ Catálogo integrado como sección.
□ Export integrado en Eventos.
□ Sección Estado operativa (scheduler + health + logs).
□ Acciones rápidas inline en tabla.
□ Skeleton screens en carga.
□ Empty states con acción.
□ CACHE_NAME bumpeado.
□ Deploy exitoso.
□ Smoke test OK.
□ Documentación sincronizada.
□ Handoff generado.
📎 13. REFERENCIAS
Documentos del proyecto
API_REFERENCE.md — Endpoints admin.

ARCHITECTURE.md — Arquitectura general.

CHANGELOG.md — Historial de versiones.

PLAN_TRABAJO.md — Sprints activos.

BACKLOG.md — Items pendientes.

Documentos de diseño
docs/mockups/mockup-admin-panel.html — Mockup (F1).

docs/HANDOFF-v4.7.0.md — Handoff al cierre.

ADRs relacionados
docs/adr/ADR-002-politica-endpoints-publico-privado.md — RBAC.

docs/adr/ADR-009-migracion-render.md — Hosting.

📢 14. COMUNICACIÓN AL OWNER
Al inicio de cada fase
text
🎯 INICIANDO FASE [N] — [Nombre]
Duración estimada: [X] min
Entregable: [descripción]
Al cierre de cada fase
text
✅ FASE [N] COMPLETADA
Commit: [hash]
Archivos modificados: [N]
Próximo paso: Fase [N+1]
Al 95% de tokens
text
⚠️ ADVERTENCIA: Tokens al 95%.
📄 Prompt de continuación generado: docs/prompts/prompt-continuacion-fase-[N].md
👤 Por favor, abrí nueva conversación y pegá el prompt.
🎯 15. PRÓXIMO PASO INMEDIATO
Fase 1 — Mockup HTML Standalone

Arranco con la creación de docs/mockups/mockup-admin-panel.html:

Sidebar con las 5 secciones y toggle colapsable.

Sección Resumen con KPIs dummy.

Sección Dotación con tabla dummy (5 pilotos).

Simulación responsive.

Todo estático (sin backend).

Cuando esté listo, te lo paso para que lo abras en el navegador y me des tu feedback visual.

Si te gusta, arrancamos con la Fase 2 (refactor real). Si querés ajustes, los hacemos en el mockup antes de tocar código de producción.

PARAGUAY FFAA [PRY] — Escuadrón Oficial MetalStorm
Plan de Mejora v1.0 · 2026-10-09 · Documento vivo

---

## ✅ 16. CIERRE F6 — 2026-10-09

F6 quedó completada y desplegada en producción.

### Criterios de cierre cumplidos

- [x] Sidebar funcional con 5 secciones.
- [x] Colapsable en desktop, drawer en mobile.
- [x] Persistencia de sección activa en localStorage.
- [x] Sección Dotación abre con tab "Activos" por defecto.
- [x] Modo compacto de tabla funcional.
- [x] Catálogo integrado como sección.
- [x] Export integrado en Eventos.
- [x] Sección Estado operativa (scheduler + health + logs).
- [x] Acciones rápidas inline en tabla.
- [x] Skeleton screens en carga.
- [x] Empty states con acción.
- [x] CACHE_NAME bumpeado.
- [x] Deploy exitoso.
- [x] Smoke test OK.
- [x] Documentación sincronizada.
- [x] Handoff generado.

### Bugs corregidos en F6

1. IDs de KPIs sin prefijo admin.
2. `renderPilotsByStatus` buscaba ID viejo.
3. `window.adminMembersCache` no expuesto.
4. Race condition en init de sección.
5. Service Worker cacheaba assets viejos.

### Commits clave

```
3468fd1 fix(admin): renderPilotsByStatus usa ID adminPilotsByStatus
cbbf3a2 fix(admin): exponer adminMembersCache + esperar carga
d2e0d12 chore(cache): bump CACHE_NAME a v4.7.1
55c3f48 feat(admin): rediseño del Panel de Comandancia v4.7.0
```

### Estado final

| Item | Estado |
|------|--------|
| Panel Admin | ✅ Live en Render |
| KPIs | ✅ Con datos reales |
| Distribución | ✅ 4 cuadrantes |
| Fly.io | ☠️ Destruida |
| Costo mensual | $0 |
