#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARAGUAY-FFAA | METALSTORM
Script de documentacion automatica - Sesion v4.6.0
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
INCIDENTES = DOCS / "incidentes"

VERSION = "4.6.0"
FECHA_HOY = "2026-10-08"
TIMESTAMP = "2026-10-08 13:30 UTC"


def log(msg, level="INFO"):
    icons = {"INFO": "[i]", "OK": "[OK]", "WARN": "[!]", "ERR": "[X]", "SKIP": "[skip]"}
    print(f"{icons.get(level, '-')} [{level}] {msg}")


def write_if_missing(path: Path, content: str, force: bool = False, dry: bool = False) -> bool:
    if path.exists() and not force:
        log(f"Ya existe: {path.relative_to(ROOT)} - salteando", "SKIP")
        return False
    if dry:
        log(f"[DRY-RUN] Crearia: {path.relative_to(ROOT)}", "INFO")
        return True
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    log(f"Creado: {path.relative_to(ROOT)}", "OK")
    return True


def insert_before(path: Path, marker_regex: str, content: str,
                  idempotent_key: str = None, dry: bool = False) -> bool:
    if not path.exists():
        log(f"No existe: {path.relative_to(ROOT)}", "ERR")
        return False
    text = path.read_text(encoding="utf-8")
    if idempotent_key and idempotent_key in text:
        log(f"Contenido ya presente en {path.relative_to(ROOT)} - salteando", "SKIP")
        return False
    m = re.search(marker_regex, text, re.MULTILINE)
    if not m:
        log(f"Marcador '{marker_regex}' no encontrado en {path.relative_to(ROOT)}", "ERR")
        return False
    if dry:
        log(f"[DRY-RUN] Insertaria en {path.relative_to(ROOT)}", "INFO")
        return True
    new_text = text[:m.start()] + content + "\n" + text[m.start():]
    path.write_text(new_text, encoding="utf-8")
    log(f"Actualizado: {path.relative_to(ROOT)}", "OK")
    return True


HALL_073 = f"""# HALL-073 - CORS bloqueaba login en Render

**Fecha:** {FECHA_HOY}
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
"""


HALL_074 = f"""# HALL-074 - loadExportEventsList() no se invocaba en loadAdminPanel()

**Fecha:** {FECHA_HOY}
**Severidad:** MEDIA
**Estado:** RESUELTO
**Version afectada:** v4.6.0
**Tiempo de diagnostico:** ~15 min
**Tiempo de resolucion:** ~5 min

---

## Resumen

La nueva seccion "Exportar Resultados de Evento" del panel admin se
renderizaba correctamente, pero el dropdown de eventos quedaba eternamente
en "Cargando eventos...".

## Sintomas

- La seccion HTML aparecia en el panel admin.
- El dropdown select#exportEventSelect mostraba solo el placeholder.
- La consola NO mostraba errores.
- Al ejecutar manualmente loadExportEventsList() en la consola, el dropdown
  se llenaba con los 44 eventos.

## Causa Raiz

La funcion loadExportEventsList() existia y estaba exportada a window,
pero nadie la llamaba desde loadAdminPanel().

Durante la implementacion se agrego la definicion de la funcion y la exportacion
global, pero se omitio la invocacion en el ciclo de vida del panel.

Evidencia:
findstr /N /C:"loadExportEventsList" js\\views.js
7513:async function loadExportEventsList() {{
7846:window.loadExportEventsList = loadExportEventsList;

Solo 2 coincidencias (definicion + export). Faltaba la tercera: la llamada.

## Solucion

En js/views.js, dentro de loadAdminPanel(), agregar la invocacion
despues de loadAdminEvents():

// Cargar eventos para el panel de eventos y Black Market
loadAdminEvents();

// v4.6.0 - Cargar eventos para el selector de exportacion
if (typeof loadExportEventsList === 'function') {{
  loadExportEventsList();
}}

El if (typeof ... === 'function') protege contra posibles fallos de carga
del modulo.

## Verificacion

Despues del fix, findstr debe devolver 3 coincidencias:
7513:async function loadExportEventsList() {{
XXXX:    loadExportEventsList();                    <- NUEVA
7846:window.loadExportEventsList = loadExportEventsList;

Y en el navegador, el dropdown debe llenarse automaticamente al abrir el panel admin.

## Lecciones Aprendidas

1. Toda funcion nueva debe tener un test de "se invoca automaticamente".
   No basta con que la funcion exista y este exportada.
2. Agregar un smoke test en el codigo: al cargar el panel admin, verificar
   que el dropdown tenga opciones.
3. La consola no muestra error cuando una funcion simplemente no se llama.
   Es un bug silencioso - el peor tipo.

## Referencias

- Commit a722509 - fix(export): llamar loadExportEventsList en loadAdminPanel
- js/views.js lineas ~7513 y ~7846
- Feature v4.6.0 "Exportar Resultados"
"""


HALL_075 = f"""# HALL-075 - Nick incorrecto en event_participations

**Fecha:** {FECHA_HOY}
**Severidad:** ALTA
**Estado:** RESUELTO (fix en reporte) / PENDIENTE (auditoria global)
**Version afectada:** Historico (desde F2) -> v4.6.0
**Tiempo de diagnostico:** ~20 min
**Tiempo de resolucion:** ~5 min

---

## Resumen

El reporte visual de rendimiento (v4.6.0) mostraba todos los pilotos con el
nick del OWNER (PJPIROVANI) en lugar de sus nicks reales. Los tokens, dias
y semaforos estaban correctos; solo el nick estaba mal.

## Sintomas

Reporte generado para Squadron Event 2026-W40:

#   Piloto      Tokens  Dias  Estado
1   PJPIROVANI  200     4     VERDE
2   PJPIROVANI  200     4     VERDE
3   PJPIROVANI  200     4     VERDE
...
29  PJPIROVANI  0       0     NEGRO

29 pilotos distintos, todos con el mismo nick.

## Causa Raiz

El campo event_participations.nick guarda el nick del cargador de la
participacion, no el nick del piloto objetivo.

Historico: El endpoint legacy POST /api/performances guardaba el nick
del usuario que ejecutaba la carga (ADMIN/OWNER). Cuando un ADMIN cargaba la
performance de otro piloto, se persistia su propio nick en el registro
del piloto objetivo.

Al migrar de performances a event_participations (Fase F2), ese nick
desnormalizado se preservo tal cual.

Evidencia (query Supabase):
SELECT ep.nick AS nick_guardado, u.nick AS nick_real
FROM event_participations ep
LEFT JOIN users u ON u.id = ep.user_id
WHERE ep.event_id = '4ada9ec7-...' -- W40
LIMIT 5;

| nick_guardado | nick_real |
|---------------|-----------|
| PJPIROVANI    | PABLOFF   |
| PJPIROVANI    | MERWEBO   |
| PJPIROVANI    | RUBEN     |
| PJPIROVANI    | REMASTER  |
| PJPIROVANI    | DARKEDEN  |

Todos los nick_guardado son PJPIROVANI, pero los nick_real son correctos.

## Solucion Aplicada (v4.6.0 - Reporte)

En src/controllers/export.controller.js, invertir la prioridad del nick:

Antes:
nick: p.nick || user?.nick || 'Piloto',

Despues:
nick: user?.nick || p.nick || 'Piloto',

Ahora el reporte siempre resuelve el nick desde users (fuente de verdad),
y solo cae al nick desnormalizado si el usuario no existe.

## Pendiente - Auditoria Global (BL-025)

El bug de event_participations.nick puede afectar otros lugares:

- Vista de historial personal (/api/performances/history).
- Listado de participaciones por evento.
- Dashboards de rendimiento.
- Cualquier lugar que lea nick de event_participations.

Decision de arquitectura sugerida:
event_participations.nick debe considerarse deprecado para lectura.
Siempre resolver el nick via JOIN con users.nick.
Considerar eliminar la columna en una migracion futura (F5+).

Documentado como BL-025 en BACKLOG.md.

## Lecciones Aprendidas

1. No desnormalizar datos sin estrategia de sincronizacion. El nick
   desnormalizado en performances/event_participations nunca se actualizo.
2. Siempre resolver entidades desde su fuente de verdad (users.nick),
   no desde copias.
3. Auditar campos desnormalizados al migrar de tabla (F2 -> F5).
4. Los tests de reportes deben verificar que los nicks sean unicos
   (o al menos distintos entre si) - un test trivial hubiera detectado esto.

## Referencias

- Commit fe0294c - fix(export): priorizar nick real de users
- BL-025 - Auditoria de event_participations.nick
- src/controllers/export.controller.js lineas ~135
"""


CHANGELOG_V460 = f"""## [{VERSION}] - {FECHA_HOY}

### Agregado
- Feature "Exportar Resultados de Evento": nueva seccion en el panel admin
  para generar imagenes (JPG/PNG/PDF) del reporte de rendimiento de un evento.
  - Backend: GET /api/admin/results/:eventId/export (src/controllers/export.controller.js).
  - Frontend: seccion en components/admin-panel.html + funciones en js/views.js.
  - API client: apiExportEventResults() en js/api.js.
  - Estilos del reporte en css/views.css (report-header, badge-verde, etc.).
  - Mockup de referencia: docs/mockups/mockup-resultados.html.

### Corregido
- HALL-073: CORS bloqueaba el login en Render. Se actualizo ALLOWED_ORIGINS
  para incluir la URL de onrender.com. (Config, sin cambios de codigo).
- HALL-074: loadExportEventsList() no se invocaba en loadAdminPanel().
  El dropdown de eventos quedaba en "Cargando eventos..." eternamente.
- HALL-075: El reporte de exportacion mostraba todos los pilotos con el
  nick del OWNER. Ahora se prioriza users.nick sobre event_participations.nick.

### Cambiado
- Bump de assets: v4.4.0 -> v4.6.0 en index.html.
- Bump de Service Worker: CACHE_NAME -> v4.6.0 en sw.js.

### Documentacion
- HALL-073, HALL-074, HALL-075 documentados en docs/incidentes/.
- BL-025 agregado a BACKLOG.md (auditoria de event_participations.nick).

---
"""


BL_025_ROW = """| **BL-025** | SEG | Auditoria de event_participations.nick (HALL-075) | PRIORIZADO | M (1 dia) | El campo nick de event_participations guarda el nick del cargador, no del piloto. Auditar todos los lugares que lo leen: historial, listados, dashboards. Considerar deprecar la columna y resolver siempre via JOIN con users.nick. Ref: HALL-075. |
"""


PLAN_ENTRADA = f"""
## FEATURE v4.6.0 - Exportacion de Resultados + Fixes Render ({FECHA_HOY})

**Estado:** CERRADO

**Contexto:** Feature completa de exportacion de resultados en imagen + 3 bugs
resueltos tras la migracion a Render.

**Feature implementada:**
- Backend: GET /api/admin/results/:eventId/export.
- Frontend: nueva seccion en panel admin + preview + descarga JPG/PNG/PDF.
- Mockup: docs/mockups/mockup-resultados.html.

**Bugs resueltos:**
- HALL-073 (CORS Render): env var ALLOWED_ORIGINS actualizada.
- HALL-074 (loadExportEventsList): invocacion faltante en loadAdminPanel().
- HALL-075 (nick incorrecto): priorizar users.nick sobre event_participations.nick.

**Commits:**
- 480bb0e - feat(export): endpoint de exportacion de resultados
- 53a679f - feat(export): UI + mockup
- 54f428d - chore(cache): bump assets y SW cache a v4.6.0
- a722509 - fix(export): llamar loadExportEventsList en loadAdminPanel
- fe0294c - fix(export): priorizar nick real de users

**Referencias:**
- docs/incidentes/HALL-073-cors-render.md
- docs/incidentes/HALL-074-export-load.md
- docs/incidentes/HALL-075-nick-participation.md
- CHANGELOG.md - [4.6.0]
"""


def main():
    parser = argparse.ArgumentParser(description="Documentar sesion v4.6.0")
    parser.add_argument("--force", action="store_true", help="Sobreescribir archivos existentes")
    parser.add_argument("--dry-run", action="store_true", help="Solo mostrar que haria")
    args = parser.parse_args()

    print(f"\n{'=' * 70}")
    print(f"  DOCUMENTACION AUTOMATICA - v{VERSION}")
    print(f"  {TIMESTAMP}")
    print(f"{'=' * 70}\n")

    print("HALLs / Incidentes")
    print("-" * 70)
    write_if_missing(INCIDENTES / "HALL-073-cors-render.md", HALL_073, args.force, args.dry_run)
    write_if_missing(INCIDENTES / "HALL-074-export-load.md", HALL_074, args.force, args.dry_run)
    write_if_missing(INCIDENTES / "HALL-075-nick-participation.md", HALL_075, args.force, args.dry_run)

    print("\nCHANGELOG.md")
    print("-" * 70)
    changelog = ROOT / "CHANGELOG.md"
    insert_before(
        changelog,
        r"^## \[",
        CHANGELOG_V460,
        idempotent_key=f"## [{VERSION}]",
        dry=args.dry_run
    )

    print("\nBACKLOG.md")
    print("-" * 70)
    backlog = ROOT / "BACKLOG.md"
    insert_before(
        backlog,
        r"^### . Prioridad Baja",
        BL_025_ROW,
        idempotent_key="BL-025",
        dry=args.dry_run
    )
    if not args.dry_run and backlog.exists():
        text = backlog.read_text(encoding="utf-8")
        if "| Items activos | 18 |" in text:
            text = text.replace("| Items activos | 18 |", "| Items activos | 19 |")
            backlog.write_text(text, encoding="utf-8")
            log("Metricas actualizadas: items activos 18 -> 19", "OK")

    print("\nPLAN_TRABAJO.md")
    print("-" * 70)
    plan = ROOT / "PLAN_TRABAJO.md"
    if plan.exists():
        text = plan.read_text(encoding="utf-8")
        if "FEATURE v4.6.0" in text:
            log("Seccion ya presente en PLAN_TRABAJO.md - salteando", "SKIP")
        else:
            markers = ["## 16b. HOTFIX v4.5.3", "## 16. HOTFIX v4.5.2", "## 15. REFERENCIAS"]
            inserted = False
            for marker in markers:
                if marker in text:
                    if args.dry_run:
                        log(f"[DRY-RUN] Insertaria seccion en PLAN_TRABAJO.md", "INFO")
                    else:
                        text = text.replace(marker, PLAN_ENTRADA + "\n" + marker, 1)
                        plan.write_text(text, encoding="utf-8")
                        log(f"Actualizado: PLAN_TRABAJO.md", "OK")
                    inserted = True
                    break
            if not inserted:
                log("No se encontro marcador en PLAN_TRABAJO.md", "ERR")

    print(f"\n{'=' * 70}")
    print(f"  Documentacion v{VERSION} completada")
    print(f"{'=' * 70}\n")
    print("Archivos modificados/creados:")
    print("   - docs/incidentes/HALL-073-cors-render.md")
    print("   - docs/incidentes/HALL-074-export-load.md")
    print("   - docs/incidentes/HALL-075-nick-participation.md")
    print("   - CHANGELOG.md (+ entrada v4.6.0)")
    print("   - BACKLOG.md (+ BL-025)")
    print("   - PLAN_TRABAJO.md (+ seccion feature v4.6.0)")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nCancelado por el usuario")
        sys.exit(130)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)