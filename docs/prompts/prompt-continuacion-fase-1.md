# 🚀 PROMPT DE CONTINUACIÓN — Fase 1 del Rediseño del Panel Admin

## Contexto del Proyecto

Estoy trabajando en **PARAGUAY-FFAA | METALSTORM**, una plataforma táctica para el escuadrón paraguayo `[PRY]` en el simulador MetalStorm.

**Stack:**
- Backend: Node.js 22 + Express 5 + Supabase PostgreSQL
- Frontend: Vanilla JS SPA + PWA (sin frameworks)
- Deploy: Render.com (plan Free, migrado desde Fly.io)
- Estilo: Design system táctico militar propio (colores Paraguay: `#D52B1E`, `#0038A8`, `#D4AF37`)
- Tipografía: `Rajdhani` (títulos), `Inter` (body), `JetBrains Mono` (métricas)

**Documento maestro del proyecto:** `PLAN_MEJORA_ADMIN_PANEL.md` (adjunto).

---

## Estado Actual

**Fase 0 (Auditoría previa):** ✅ COMPLETADA

Se auditaron los archivos reales del proyecto (HTML, JS, CSS). Se extrajo:

### Design Tokens reales (de `global.css` + `tactical-design.css`)

| Categoría | Valores |
|---|---|
| Fondos | `--bg-core: #0B132B`, `--bg-surface: #0F172A`, `--bg-card: rgba(15,23,42,0.88)`, `--bg-panel: #111827`, `--bg-card-secondary: #1A2235` |
| Paraguay | `--pry-red: #D52B1E`, `--pry-blue: #0038A8`, `--pry-gold: #D4AF37` |
| Estados | VERDE `#34D399`, NARANJA `#FBBF24`, ROJO `#F87171`, NEGRO `#94A3B8` |
| Spacing | `--sp-1: 4px` ... `--sp-10: 40px` (escala 4px) |
| Radii | `--radius-sm: 6px`, `--radius: 8px`, `--radius-lg: 12px`, `--radius-xl: 16px` |
| Touch target | `--touch-min: 44px` |
| Sombras HUD | `--hud-glow-green`, `--hud-glow-blue`, `--hud-glow-gold` |
| Safe areas | `--sat`, `--sar`, `--sab`, `--sal` (iOS notch) |

### Clases CSS reutilizables existentes

- `.card`, `.card-header` — contenedores base
- `.stat-card-tactical`, `.tactical-corners` — KPIs con esquinas tácticas
- `.status-badge.status-verde/naranja/rojo/negro` — semáforo militar
- `.role-badge.role-OWNER/ADMIN/VETERANO/MIEMBRO` — rangos
- `.btn-primary`, `.btn-secondary`, `.btn-danger` — botones
- `.data-table` — tablas C4ISR
- `.modal`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-footer` — modales
- `.mobile-side-drawer`, `.drawer-nav-btn` — drawer mobile
- `.badge-tag` — etiquetas C4ISR
- `.view-header-tactical` — headers de vista

### Funciones JS globales disponibles

- `showView(id)`, `showModal(id)`, `closeModal(id)`, `showToast(msg, type)`
- `escapeHtml(str)`, `refreshLucideIcons()`
- `loadAdminPanel()`, `switchMembersTab()`, `filterMembers()`
- `changeUserRole()`, `changeUserStatus()`, `resetPilotPassword()`
- `adminEventsLoad()` (módulo `admin-events.js`)
- `apiEventsV2*()` (cliente API eventos v2)
- `formatLastActivity()`, `formatInactiveDate()`

### Breakpoints reales del proyecto

- `< 768px` — mobile (bottom nav + drawer)
- `768px – 1024px` — tablet (nav desktop)
- `> 1024px` — desktop

### Patrón de tabs internos ya usado en `ownerPanelView`

```html
<button id="tabBtnAudit" onclick="switchOwnerTab('audit')" class="btn-secondary active">📋 Log de Auditoría</button>
<div id="ownerTabAudit">...</div>
Decisiones de Diseño (Aprobadas por el OWNER)
#	Decisión
1	Sidebar colapsable en desktop (240px expandido / 64px colapsado)
2	Sidebar dentro del panel (no reemplaza la navegación global del header)
3	Sidebar = drawer en mobile (< 768px)
4	5 secciones especializadas en el sidebar
5	Lazy loading de secciones (solo carga la visitada)
6	Persistencia en localStorage (sección activa + estado del sidebar)
7	Skeleton screens en lugar de spinners
8	Empty states con acción sugerida
9	Modal para confirmaciones destructivas (nunca confirm() nativo)
10	Modo compacto/expandido en tabla de Dotación
11	Dotación abre con tab "Activos" por defecto
12	Catálogo integrado como sección (movido de admin-plane-models.html)
13	Exportar Resultados integrado como sub-sección de Eventos
Secciones del sidebar
#	Sección	Icono	Contenido
1	Resumen	📊	KPIs + distribución + accesos rápidos
2	Dotación	👥	Tabs (Activos default) + tabla + modo compacto + alta piloto
3	Eventos	📅	Evento activo + lista + carga masiva + Export (sub-sección)
4	Catálogo	✈️	CRUD aeronaves (integrado)
5	Estado	⚙️	Scheduler + health + versión + logs
TAREA ACTUAL: Fase 1 — Mockup HTML Standalone
Objetivo: Crear un mockup visual standalone (un solo archivo HTML) que se pueda abrir en el navegador directamente, SIN tocar el código real de producción.

Entregable: docs/mockups/mockup-admin-panel.html

Contenido del mockup
Sidebar con las 5 secciones + toggle colapsable (funcional).

Sección Resumen (default): 4 KPIs dummy + distribución de rendimiento + accesos rápidos.

Sección Dotación: tabs (Activos default) + tabla dummy con 5 pilotos + modo compacto (toggle).

Sección Eventos: card de evento activo + tabs internas (Lista / Carga masiva / Export).

Sección Catálogo: grid simplificado de 3 aeronaves dummy.

Sección Estado: health + scheduler + versión (dummy).

Responsive: 3 breakpoints (mobile <768 / tablet 768-1024 / desktop >1024).

Interactividad JS vanilla: toggle sidebar + cambio de sección + toggle modo compacto + persistencia en localStorage.

Estilo visual
Usar los colores reales del proyecto (no inventar).

Usar la tipografía real (Rajdhani, Inter, JetBrains Mono desde Google Fonts).

Usar las clases CSS reales cuando aplique (.card, .status-badge, .role-badge, .btn-primary, etc.).

Efectos tácticos: esquinas biseladas, HUD glow, scanlines sutiles.

Estructura del sidebar
text
┌─────────────────────┐
│  🛡️ COMANDANCIA     │  ← Header del sidebar
│  ──────────────     │
│                     │
│  📊 Resumen         │  ← Sección activa (borde dorado izquierdo)
│  👥 Dotación   (28) │  ← Badge con contador
│  📅 Eventos         │
│  ✈️ Catálogo        │
│  ⚙️ Estado          │
│                     │
│  ──────────────     │
│  ◀ Colapsar         │  ← Toggle al final
└─────────────────────┘
Comportamiento
Click en sección: cambia el contenido + persiste en localStorage.

Click en toggle: colapsa/expande el sidebar + persiste.

En mobile (<768px): sidebar oculto, botón ☰ en el header de sección lo muestra como drawer.

Modo compacto: toggle en la tabla de Dotación reduce la altura de las filas (32px vs 48px).

Archivos a Adjuntar en la Nueva Conversación
Obligatorios:

PLAN_MEJORA_ADMIN_PANEL.md (documento maestro)

components/admin-panel.html (estructura actual)

js/views.js (funciones admin existentes)

css/views.css (estilos actuales del admin)

css/global.css (design tokens)

css/components.css (clases de botones, cards, modales)

css/tactical-design.css (clases tácticas)

index.html (para ver carga de componentes)

components/header.html (navegación global)

js/utils.js (helpers)

js/main.js (orquestador)

js/admin-events.js (módulo de eventos v2)

Opcionales (referencia):

components/owner-panel.html (patrón de tabs internos)

components/dashboard.html (patrón de layout)

components/profile-view.html (patrón de form)

components/admin-plane-models.html (sección Catálogo actual)

components/help-modal.html (patrón de modal)

Reglas de Trabajo (Estilo del OWNER)
OS: Windows 10 con CMD (no usar grep/cat/sed; sí findstr/type/dir).

Editor: Visual Studio Code.

Backups: script con extensión .bak antes de modificar archivos críticos.

Verificación: node --check después de cada archivo JS modificado.

Commits: formato tipo(scope): mensaje.

Documentación: actualizar .md en cada fase.

Rollback: documentado con git revert.

Idioma: español rioplatense.

Tono: directo, sin sobre-explicar.

Protocolo de Advertencia de Tokens
Cuando la IA detecte que está al 95% de tokens:

Avisar al OWNER con:

text
⚠️ ADVERTENCIA: Tokens al 95%.
📄 Generando prompt de continuación: docs/prompts/prompt-continuacion-fase-N.md
Generar el prompt de continuación para la próxima sesión (con contexto + estado + próximo paso).

Guardar en docs/prompts/prompt-continuacion-fase-N.md.

Criterios de Cierre de Fase 1
□ docs/mockups/mockup-admin-panel.html creado.
□ Sidebar funcional con 5 secciones.
□ Toggle colapsable funcional.
□ Persistencia en localStorage.
□ Las 5 secciones con contenido dummy.
□ Responsive en 3 breakpoints.
□ Modo compacto de tabla funcional.
□ Aprobación visual del OWNER.
□ Si hay ajustes, iteración en el mockup antes de pasar a F2.
Próximo Paso Inmediato
Arrancá con la Fase 1:

Generá el archivo docs/mockups/mockup-admin-panel.html completo.

Incluí HTML + CSS + JS en un solo archivo standalone.

Usá los colores, tipografía y clases reales del proyecto (adjuntos).

Al final, dame las instrucciones para abrirlo en el navegador.

Esperá mi feedback visual antes de continuar.

Si te acercás al 95% de tokens antes de terminar, seguí el protocolo de advertencia.

PARAGUAY FFAA [PRY] — Escuadrón Oficial MetalStorm
Prompt de continuación Fase 1 · 2026-10-09

text

---

## 🔼 FIN DEL PROMPT

---

## 📋 Checklist para Vos

- [ ] Copiar el bloque de código de arriba.
- [ ] Guardarlo en `docs/prompts/prompt-continuacion-fase-1.md` (con el mismo contenido).
- [ ] Abrir nueva conversación.
- [ ] Pegar el prompt como primer mensaje.
- [ ] Adjuntar los 12 archivos obligatorios.
- [ ] Esperar la respuesta de la IA.

---

## 🎯 Próximos Pasos (Sesión Nueva)

| Paso | Acción |
|:---:|---|
| **1** | Nueva conversación con el prompt pegado |
| **2** | IA genera `mockup-admin-panel.html` |
| **3** | Vos lo abrís en el navegador |
| **4** | Feedback visual |
| **5** | Ajustes si es necesario |
| **6** | Aprobación → arrancar F2 (refactor real) |

---

## ⚠️ Estado Final de esta Sesión

| Aspecto | Estado |
|---|---|
| **Fase 0 (Auditoría)** | ✅ Completada |
| **Fase 1 (Mockup)** | 🟡 Pendiente (arranca en nueva conversación) |
| **Tokens consumidos** | ~85% |
| **Prompt de continuación** | ✅ Generado |
| **Margen disponible** | Insuficiente para el mockup completo |

---