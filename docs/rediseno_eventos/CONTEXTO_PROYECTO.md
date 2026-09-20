# 🎖️ CONTEXTO DEL PROYECTO — PARAGUAY-FFAA | METALSTORM

> **Documento de contexto general del sistema táctico del escuadrón PARAGUAY FFAA.**
> **Última actualización:** 2026-09-17
> **Audiencia:** Desarrolladores, IAs asistentes, comando técnico.

---

## 1. ¿Qué es PARAGUAY-FFAA | METALSTORM?

Es una **plataforma web táctica de grado militar** diseñada para la administración, registro y supervisión del escuadrón paraguayo `PARAGUAY FFAA [PRY]` en el simulador de combate aéreo **MetalStorm**.

**Propósito principal:** digitalizar el sistema de evaluación y registro del escuadrón, reemplazando planillas Excel y registros manuales en Discord/Google Drive.

---

## 2. Historia y motivación

El escuadrón PRY se organizó formalmente en **diciembre 2025** con una normativa oficial (v2.0). La app web nació para:

1. **Digitalizar el sistema de puntos** de los eventos oficiales del juego.
2. **Automatizar el cálculo del semáforo militar** (VERDE/NARANJA/ROJO/NEGRO).
3. **Facilitar la administración** de pilotos (altas, bajas, roles, inactivos).
4. **Centralizar la documentación** del escuadrón.

**Motivación original (documento fundacional):**
- Evitar el Excel manual en Google Drive + Discord.
- Tener un único punto de verdad para el rendimiento del escuadrón.
- Profesionalizar la gestión operativa.

---

## 3. Estructura del escuadrón

### Jerarquía (según normativa oficial v2.0):

| Rol | Cuota máxima | Atribuciones |
|---|---|---|
| **OWNER** (Propietario) | 1 | Mando supremo, decisiones finales, transferencia |
| **ADMIN** (Administrador) | 5 | Altas/bajas, resets de claves, publicación de normativas |
| **VETERANO** (Anciano) | 8 | Mentoría, coordinación de eventos, reportes |
| **MIEMBRO** | hasta 30 | Registro semanal, hangar personal |

### Límite total del escuadrón:

- **Máximo 30 miembros** (limitación del juego Metalstorm).

### Sistema de pupilos:

- Cada ADMIN tiene asignado un grupo de pilotos ("pupilos").
- Los ADMIN gestionan los resets de claves de sus pupilos directamente.

---

## 4. Sistema de evaluación

### Squadron Event (semanal):

- **Frecuencia:** Jueves a domingo (4 días).
- **Requisito:** volar con al menos 1 compañero del escuadrón.
- **Meta:** 27/30 pilotos con 200/200 tokens.
- **Puntos:** máximo 200 por evento.
- **Mínimo para mantener estatus:** 175 puntos.

### Black Market Event (eventual):

- **Frecuencia:** irregular (aproximadamente cada 1-2 meses).
- **Duración:** 5 días (miércoles a domingo).
- **Reemplaza** al Squadron Event cuando ocurre.
- **Individual:** cada piloto acumula sus propios puntos.
- **Recompensa:** descuento individual sobre el avión exclusivo del evento.
- **Puntos:** máximo 250 por evento (50% descuento).

### Semáforo militar (evaluación):

| Estado | Tokens | Días | Significado |
|---|---|---|---|
| 🟢 **VERDE** | ≥ 175 | ≥ 4 | Excelente |
| 🟡 **NARANJA** | 130-174 | ≥ 3 | Advertencia |
| 🔴 **ROJO** | 100-129 | ≥ 2 | Crítico |
| ⚫ **NEGRO** | < 100 | < 2 | Inactivo/Sanción |

---

## 5. Roles y personas clave

| Persona | Rol en el sistema | Rol operativo | Notas |
|---|---|---|---|
| **PJPIROVANI** | OWNER (código) | Líder estratégico + desarrollador | Vos, el arquitecto del sistema |
| **FURTIVO** | ADMIN | Cara pública del escuadrón | Amigo del OWNER, coordina comunicación |
| **ASTARTES, GENNOMAX, RUBEN, BARBA19** | ADMINs fundacionales | Oficiales de operaciones | Staff desde la fundación |

---

## 6. Cultura y comunicación

### Canales oficiales:

- **Discord:** servidor `METALSTORM — PARAGUAY FFAA` (comunicación oficial).
- **WhatsApp:** grupo interno del escuadrón (coordinación rápida).
- **Google Drive:** `paraguayffaa.metalstorm@gmail.com` (documentación histórica).
- **App web:** `https://paraguay-ffaa-metalstorm.fly.dev` (sistema oficial).

### Estilo de comunicación:

- **Tono militar formal** (uso de jerarquía, indicativos).
- **Cultura de meritocracia** (mérito real, actividad constante).
- **Compañerismo por encima de victorias individuales**.
- **Comunicación clara y directa**.

---

## 7. Stack técnico

| Capa | Tecnología |
|---|---|
| **Backend** | Node.js 22 + Express 5 + Supabase PostgreSQL |
| **Frontend** | Vanilla JS SPA + PWA (Service Worker) |
| **Deploy** | Fly.io (región `gru` - São Paulo) |
| **Base de datos** | Supabase PostgreSQL (23 tablas) |
| **Repositorio** | GitHub: `paraguayffaametalstorm-debug/ffaa-paraguay-classic` |

---

## 8. Estado actual del sistema (2026-09-17)

- **Versión en producción:** v4.0.2
- **Fases completadas:** 0, 1, 2, 3, 3.1, 4 del Plan de Mejora Continua.
- **Fases pendientes:** 5 (Testing) y 6 (Documentación).
- **Rediseño del sistema de eventos:** pendiente (en curso el análisis).
- **Pilotos registrados:** 61 total (28 activos, 33 inactivos).

---

## 9. Documentación relacionada

| Documento | Ubicación | Propósito |
|---|---|---|
| Plan de Mejora Continua | `PLAN_MEJORA_CONTINUA.md` | Plan original de 7 fases |
| Backlog | `BACKLOG.md` | Ideas y mejoras pendientes |
| Roadmap | `ROADMAP.md` | Visión estratégica |
| Changelog | `CHANGELOG.md` | Historial de versiones |
| Current State | `CURRENT_STATE.md` | Estado congelado actual |
| Fixes Applied | `FIXES_APPLIED.md` | Historial de fixes |
| Normativa oficial | `PARAGUAY_FFAA_Normativa_Oficial_Unificada_v2.0_2025-12-18.docx` | Reglas del escuadrón |
| Wiki Metalstorm | `https://metalstorm.wiki.gg/wiki/Events` | Mecánica oficial del juego |

---

## 10. Principios rectores del desarrollo

1. **Seguridad primero.**
2. **No romper producción.**
3. **Evidencia en cada paso.**
4. **Avance incremental.**
5. **Compatibilidad hacia atrás.**
6. **Simplicidad.**
7. **Documentación continua.**

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Documento vivo · 2026-09-17**