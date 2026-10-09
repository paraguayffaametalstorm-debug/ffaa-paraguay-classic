#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARAGUAY-FFAA | METALSTORM
Script de documentacion automatica - Auditoria Fly.io 2026-10-09
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
INCIDENTES = DOCS / "incidentes"

VERSION = "4.6.1"
FECHA_HOY = "2026-10-09"
TIMESTAMP = "2026-10-09 13:30 UTC"


def log(msg, level="INFO"):
    icons = {"INFO": "[i]", "OK": "[OK]", "WARN": "[!]", "ERR": "[X]", "SKIP": "[skip]"}
    print(f"{icons.get(level, '-')} [{level}] {msg}")


def write_if_missing(path, content, force=False, dry=False):
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


def insert_before(path, marker_regex, content, idempotent_key=None, dry=False):
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


HALL_076 = """# HALL-076 - Auditoria de recursos Fly.io y reduccion de costos

**Fecha:** 2026-10-09
**Severidad:** MEDIA (costos recurrentes)
**Estado:** RESUELTO
**Version afectada:** v4.5.x -> v4.6.1
**Tiempo de diagnostico:** ~1 hora
**Tiempo de resolucion:** ~30 min

---

## Resumen

Tras la migracion a Render.com, la infraestructura de Fly.io seguia generando
costos recurrentes (~$9.75/mes). Se auditoriaron todos los recursos y se
redujo el costo a ~$0.15/mes (solo rootfs de maquinas detenidas).

## Sintomas

- Email de Fly.io indicando que la app paraguay-ffaa-metalstorm tenia una
  maquina corriendo 24/7 desde el 2026-09-01.
- Factura mensual de ~$5.62 USD.
- Sospecha de otros recursos fantasma (apps, volumenes, IPs).

## Diagnostico

Se ejecuto una auditoria completa con flyctl.

### Apps encontradas

- paraguay-ffaa-metalstorm: deployed (app principal)
- ffaa-monitor-v2: suspended (app fantasma, no usada)

### Maquinas de paraguay-ffaa-metalstorm

- 287e355a0e9458: started, ~$5/mes (24/7)
- 2874de1b10e698: stopped, ~$0.15/mes (rootfs)

### Maquinas de ffaa-monitor-v2

- 7817963c940598: stopped, ~$0.15/mes (rootfs)

### Volumenes

- paraguay-ffaa-metalstorm: 0 volumenes
- ffaa-monitor-v2: 3 volumenes (3GB), ~$0.45/mes

### IPs dedicadas

- paraguay-ffaa-metalstorm: 2a09:8280:1::d8:f287:0, ~$2/mes
- ffaa-monitor-v2: 2a09:8280:1::c2:10e7:0, ~$2/mes

### Costo total estimado

- CPU/RAM 24/7: ~$5/mes
- Rootfs de maquinas detenidas (3): ~$0.45/mes
- IPv6 dedicada x 2: ~$4/mes
- Volumenes (3GB): ~$0.45/mes
- TOTAL: ~$9.75/mes

## Causa Raiz

1. min_machines_running = 1 en fly.toml obligaba a tener 1 maquina corriendo
   24/7, incluso sin trafico.
2. ffaa-monitor-v2 quedo como app fantasma con volumenes y IP activos.
3. IPs IPv6 dedicadas seguian activas aunque las apps ya no las usaran.

## Solucion Aplicada

### Paso 1 - Modificar fly.toml

Se cambio min_machines_running de 1 a 0.
Commit: 0138373.

### Paso 2 - Deploy

Se ejecuto: fly deploy -a paraguay-ffaa-metalstorm

Las maquinas se mantuvieron detenidas despues del deploy.

### Paso 3 - Liberar IPs IPv6 dedicadas

Se ejecutaron:
- fly ips release 2a09:8280:1::d8:f287:0 -a paraguay-ffaa-metalstorm
- fly ips release 2a09:8280:1::c2:10e7:0 -a ffaa-monitor-v2

### Paso 4 - Eliminar ffaa-monitor-v2

Se ejecuto: fly apps destroy ffaa-monitor-v2

Esto elimino automaticamente la app, su maquina y sus 3 volumenes.

### Paso 5 - Verificacion final

- fly apps list: solo paraguay-ffaa-metalstorm (suspended)
- fly volumes list --all: vacio
- fly ips list -a paraguay-ffaa-metalstorm: solo IPv4 compartida (gratis)

## Resultado

- Apps activas: 2 -> 1 (con maquinas detenidas)
- Maquinas corriendo: 1 -> 0
- IPs IPv6 dedicadas: 2 -> 0
- Volumenes: 3 (3GB) -> 0
- Costo mensual: ~$9.75 -> ~$0.15

Ahorro: ~$9.60/mes (~$115/ano)

## Decisiones Tomadas

- NO eliminar paraguay-ffaa-metalstorm. Se mantiene como backup con
  maquinas detenidas. Reactivable con fly deploy en 3 minutos.
- SI eliminar ffaa-monitor-v2. Era una app fantasma sin uso.
- Mantener los 19 secretos en Fly.io. Sirven como backup de la config
  de produccion.

## Lecciones Aprendidas

1. Auditar periodicamente los recursos en la nube.
2. min_machines_running = 1 es causa comun de costos inesperados.
3. IPs dedicadas se facturan independientemente de si la app corre.
4. Volumenes huerfanos se facturan igual.
5. Cambiar fly.toml en GitHub NO aplica el cambio. Requiere fly deploy.

## Referencias

- fly.toml (commit 0138373)
- Dashboard Fly.io: https://fly.io/dashboard/personal/billing
- ADR-009 (migracion a Render)
- HALL-072 (scheduler en Render)
- BL-026 (eliminacion final de Fly.io)
"""


CHANGELOG_V461 = """## [4.6.1] - 2026-10-09

### Cambiado
- Infraestructura Fly.io: min_machines_running reducido de 1 a 0.
  Las maquinas de paraguay-ffaa-metalstorm ahora permanecen detenidas.
- Limpieza de recursos Fly.io: eliminada la app fantasma ffaa-monitor-v2
  y sus 3 volumenes (3GB), liberadas 2 direcciones IPv6 dedicadas.

### Agregado
- Script check_health.py: verificacion de salud de la app en Render.
- HALL-076: documentacion completa de la auditoria de recursos Fly.io.

### Corregido
- Costos recurrentes de Fly.io reducidos de ~$9.75/mes a ~$0.15/mes.

### Documentacion
- docs/incidentes/HALL-076-fly-audit.md creado.
- BL-026 agregado a BACKLOG.md.

---
"""


BL_026_ROW = """| **BL-026** | INFRA | Eliminacion final de Fly.io (post 2-3 meses sin uso) | IDEA | XS (30 min) | Si en 2-3 meses no se usa Fly.io como backup, eliminar la app paraguay-ffaa-metalstorm para ahorrar ~$0.15/mes residuales. Requiere backup previo de los 19 secretos. Ref: HALL-076. |
"""


PLAN_ENTRADA = """
## AUDITORIA FLY.IO - Reduccion de Costos (2026-10-09)

**Estado:** CERRADO

**Contexto:** Tras la migracion a Render (2026-10-08), Fly.io seguia generando
~$9.75/mes por recursos no eliminados (maquina 24/7, IPv6 dedicadas, app
fantasma con volumenes).

**Acciones ejecutadas:**
- fly.toml: min_machines_running 1 -> 0 (commit 0138373).
- fly deploy para aplicar la config.
- Liberacion de 2 IPv6 dedicadas (una por app).
- Eliminacion de app fantasma ffaa-monitor-v2.
- Eliminacion automatica de 3 volumenes (3GB).

**Resultado:**
- Costo Fly.io: de ~$9.75/mes a ~$0.15/mes.
- Ahorro: ~$9.60/mes (~$115/ano).
- paraguay-ffaa-metalstorm conservado como backup (maquinas detenidas).

**Referencias:**
- docs/incidentes/HALL-076-fly-audit.md
- CHANGELOG.md - [4.6.1]
- BL-026 (eliminacion final post 2-3 meses)

"""


def main():
    parser = argparse.ArgumentParser(description="Documentar auditoria Fly.io")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print()
    print("=" * 70)
    print("  DOCUMENTACION FLY AUDIT - v" + VERSION)
    print("  " + TIMESTAMP)
    print("=" * 70)
    print()

    print("HALLs / Incidentes")
    print("-" * 70)
    write_if_missing(INCIDENTES / "HALL-076-fly-audit.md", HALL_076, args.force, args.dry_run)

    print()
    print("CHANGELOG.md")
    print("-" * 70)
    insert_before(
        ROOT / "CHANGELOG.md",
        r"^## \[",
        CHANGELOG_V461,
        idempotent_key="## [4.6.1]",
        dry=args.dry_run
    )

    print()
    print("BACKLOG.md")
    print("-" * 70)
    insert_before(
        ROOT / "BACKLOG.md",
        r"^### . Prioridad Baja",
        BL_026_ROW,
        idempotent_key="BL-026",
        dry=args.dry_run
    )

    print()
    print("PLAN_TRABAJO.md")
    print("-" * 70)
    plan = ROOT / "PLAN_TRABAJO.md"
    if plan.exists():
        text = plan.read_text(encoding="utf-8")
        if "AUDITORIA FLY.IO" in text:
            log("Seccion ya presente en PLAN_TRABAJO.md - salteando", "SKIP")
        else:
            markers = ["## 16b. HOTFIX v4.5.3", "## 16. HOTFIX v4.5.2", "## 15. REFERENCIAS"]
            inserted = False
            for marker in markers:
                if marker in text:
                    if args.dry_run:
                        log("[DRY-RUN] Insertaria seccion en PLAN_TRABAJO.md", "INFO")
                    else:
                        text = text.replace(marker, PLAN_ENTRADA + "\n" + marker, 1)
                        plan.write_text(text, encoding="utf-8")
                        log("Actualizado: PLAN_TRABAJO.md", "OK")
                    inserted = True
                    break
            if not inserted:
                log("No se encontro marcador en PLAN_TRABAJO.md", "ERR")

    print()
    print("=" * 70)
    print("  Documentacion Fly Audit v" + VERSION + " completada")
    print("=" * 70)
    print()
    print("Archivos modificados/creados:")
    print("   - docs/incidentes/HALL-076-fly-audit.md")
    print("   - CHANGELOG.md (+ entrada v4.6.1)")
    print("   - BACKLOG.md (+ BL-026)")
    print("   - PLAN_TRABAJO.md (+ seccion auditoria Fly.io)")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nCancelado por el usuario")
        sys.exit(130)
    except Exception as e:
        print("\nError: " + str(e))
        import traceback
        traceback.print_exc()
        sys.exit(1)