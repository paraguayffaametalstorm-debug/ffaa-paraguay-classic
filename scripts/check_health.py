#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PARAGUAY-FFAA | METALSTORM
Script de verificacion de salud de la app en Render.

Uso:
    python scripts/check_health.py
    python scripts/check_health.py --url https://paraguay-ffaa-metalstorm.onrender.com
    python scripts/check_health.py --json
    python scripts/check_health.py --watch

Requiere: Python 3.8+ (usa solo stdlib).
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

# ---------------------------------------------------------------------------
# CONFIGURACION
# ---------------------------------------------------------------------------
DEFAULT_URL = "https://paraguay-ffaa-metalstorm.onrender.com"
HEALTH_PATH = "/api/health"
LIVENESS_PATH = "/health"
TIMEOUT_SECONDS = 30

# Umbrales de alerta
STALE_THRESHOLD_HOURS = 2
LOW_UPTIME_THRESHOLD_SECONDS = 300


# ---------------------------------------------------------------------------
# COLORES (ANSI)
# ---------------------------------------------------------------------------
class C:
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"


def supports_color() -> bool:
    """Detecta si la terminal soporta ANSI."""
    if sys.platform == "win32":
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
            return True
        except Exception:
            return False
    return sys.stdout.isatty()


def colorize(text: str, color: str) -> str:
    if not supports_color():
        return text
    return f"{color}{text}{C.RESET}"


def header(title: str):
    width = 70
    print()
    print(colorize("=" * width, C.DIM))
    print(colorize(f"  {title}", C.BOLD + C.CYAN))
    print(colorize("=" * width, C.DIM))


def line(label: str, value: str, status: str = "info"):
    icons = {
        "ok": colorize("[OK]", C.GREEN),
        "warn": colorize("[!]", C.YELLOW),
        "err": colorize("[X]", C.RED),
        "info": colorize("[i]", C.BLUE),
    }
    icon = icons.get(status, "[?]")
    print(f"  {icon} {label:<28} {value}")


# ---------------------------------------------------------------------------
# HTTP HELPERS
# ---------------------------------------------------------------------------
def http_get(url: str, timeout: int = TIMEOUT_SECONDS) -> dict:
    """
    Hace GET a la URL y devuelve {ok, status, data, error, elapsed_ms}.
    """
    start = time.time()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PARAGUAY-FFAA-HEALTH-CHECK/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed_ms = int((time.time() - start) * 1000)
            body = resp.read().decode("utf-8", errors="replace")
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                data = {"raw": body[:500]}
            return {
                "ok": 200 <= resp.status < 300,
                "status": resp.status,
                "data": data,
                "error": None,
                "elapsed_ms": elapsed_ms,
            }
    except urllib.error.HTTPError as e:
        elapsed_ms = int((time.time() - start) * 1000)
        try:
            body = e.read().decode("utf-8", errors="replace")
            data = json.loads(body)
        except Exception:
            data = {"raw": str(e)}
        return {
            "ok": False,
            "status": e.code,
            "data": data,
            "error": f"HTTP {e.code}",
            "elapsed_ms": elapsed_ms,
        }
    except urllib.error.URLError as e:
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "ok": False,
            "status": None,
            "data": {},
            "error": f"URLError: {e.reason}",
            "elapsed_ms": elapsed_ms,
        }
    except Exception as e:
        elapsed_ms = int((time.time() - start) * 1000)
        return {
            "ok": False,
            "status": None,
            "data": {},
            "error": f"{type(e).__name__}: {e}",
            "elapsed_ms": elapsed_ms,
        }


# ---------------------------------------------------------------------------
# VERIFICACIONES
# ---------------------------------------------------------------------------
def check_liveness(base_url: str) -> dict:
    """Verifica la probe ligera /health (texto plano)."""
    url = base_url.rstrip("/") + LIVENESS_PATH
    result = http_get(url, timeout=15)
    result["url"] = url
    return result


def check_readiness(base_url: str) -> dict:
    """Verifica /api/health (telemetria completa)."""
    url = base_url.rstrip("/") + HEALTH_PATH
    result = http_get(url, timeout=TIMEOUT_SECONDS)
    result["url"] = url
    return result


def analyze_scheduler(scheduler: dict) -> dict:
    """Analiza el estado del scheduler y devuelve un veredicto."""
    if not scheduler:
        return {"verdict": "err", "msg": "Sin datos del scheduler", "recommendation": ""}

    status = scheduler.get("status", "UNKNOWN")
    started = scheduler.get("started", False)
    uptime = scheduler.get("uptime_seconds", 0) or 0
    last_tick_at = scheduler.get("last_tick_at")
    last_ago = scheduler.get("last_tick_ago_seconds")

    if not started:
        return {
            "verdict": "err",
            "msg": "Scheduler NO iniciado",
            "recommendation": "Revisar logs de server.js al arrancar",
        }

    if status == "OK" and last_tick_at and last_ago is not None and last_ago < 3700:
        return {
            "verdict": "ok",
            "msg": f"Corriendo OK (ultimo tick hace {format_seconds(last_ago)})",
            "recommendation": "",
        }

    if status == "STALE":
        if last_tick_at is None:
            msg = f"STALE — Nunca corrio (uptime {format_seconds(uptime)})"
            rec = (
                "El primer tick no se ejecuto. Render puede haber dormido la app. "
                "Configurar cron-job.org apuntando a /health cada 5-10 min."
            )
        else:
            hours_stale = (last_ago or 0) / 3600 if last_ago else 0
            msg = f"STALE — Ultimo tick hace {format_seconds(last_ago)}"
            rec = (
                f"El tick supero el umbral de {STALE_THRESHOLD_HOURS}h. "
                "Verificar cron-job.org."
            )
        return {"verdict": "warn", "msg": msg, "recommendation": rec}

    return {
        "verdict": "warn",
        "msg": f"Estado desconocido: {status}",
        "recommendation": "Revisar logs del scheduler",
    }


def analyze_uptime(uptime_seconds: int) -> dict:
    """Detecta cold starts recientes."""
    if uptime_seconds is None:
        return {"verdict": "info", "msg": "Uptime no disponible"}
    if uptime_seconds < LOW_UPTIME_THRESHOLD_SECONDS:
        return {
            "verdict": "warn",
            "msg": (
                f"Reinicio reciente ({format_seconds(uptime_seconds)}). "
                "Posible cold start."
            ),
        }
    return {"verdict": "ok", "msg": f"{format_seconds(uptime_seconds)} activa"}


def format_seconds(seconds) -> str:
    if seconds is None:
        return "N/A"
    seconds = int(seconds)
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m {seconds % 60}s"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    return f"{hours}h {minutes}m"


# ---------------------------------------------------------------------------
# OUTPUT
# ---------------------------------------------------------------------------
def print_report(base_url: str, liveness: dict, readiness: dict, verbose: bool = False):
    header(f"HEALTH CHECK - {base_url}")
    print(f"  {colorize('Timestamp:', C.DIM)} {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print()

    # ---- 1. Liveness ----
    print(colorize("  1. LIVENESS (/health)", C.BOLD))
    if liveness["ok"]:
        line("Respondio", f"{liveness['elapsed_ms']}ms", "ok")
    else:
        line("Fallo", liveness.get("error") or "sin respuesta", "err")
    print()

    # ---- 2. Readiness ----
    print(colorize("  2. READINESS (/api/health)", C.BOLD))
    if not readiness["ok"]:
        line("Fallo", readiness.get("error") or "sin respuesta", "err")
        print()
        print(colorize("  La app NO responde al health check completo.", C.RED))
        print(colorize("  Recomendacion: Revisar logs en Render dashboard.", C.YELLOW))
        return

    data = readiness["data"]
    line("Status global", data.get("status", "?"),
         "ok" if data.get("status") == "healthy" else "warn")
    line("Servicio", data.get("service", "?"))
    line("Version", data.get("version", "?"))
    line("Latencia", f"{readiness['elapsed_ms']}ms")
    print()

    # ---- 3. Uptime ----
    print(colorize("  3. UPTIME", C.BOLD))
    uptime = data.get("uptime_seconds", 0)
    uptime_analysis = analyze_uptime(uptime)
    line("Uptime total", format_seconds(uptime), uptime_analysis["verdict"])
    if uptime_analysis["verdict"] == "warn":
        print(f"     {colorize('-> ' + uptime_analysis['msg'], C.YELLOW)}")
    print()

    # ---- 4. Supabase ----
    print(colorize("  4. SUPABASE", C.BOLD))
    checks = data.get("checks", {})
    supa = checks.get("supabase", {})
    supa_status = supa.get("status", "unknown")
    supa_latency = supa.get("latency_ms", 0)
    line("Estado", supa_status,
         "ok" if supa_status == "ok" else "err")
    line("Latencia DB", f"{supa_latency}ms",
         "ok" if supa_latency < 1000 else "warn")
    print()

    # ---- 5. Scheduler ----
    print(colorize("  5. SCHEDULER", C.BOLD))
    scheduler = checks.get("scheduler", {})
    sched_analysis = analyze_scheduler(scheduler)
    line("Estado", scheduler.get("status", "?"), sched_analysis["verdict"])
    line("Iniciado", str(scheduler.get("started", False)))
    line("Iniciado desde", scheduler.get("started_at", "N/A"))
    line("Ultimo tick", scheduler.get("last_tick_at") or colorize("NUNCA", C.RED))
    if scheduler.get("last_tick_ago_seconds") is not None:
        line("Hace", format_seconds(scheduler["last_tick_ago_seconds"]))
    line("Resultado ultimo tick", scheduler.get("last_tick_status") or "N/A")

    if sched_analysis["verdict"] != "ok":
        print()
        print(f"     {colorize('-> ' + sched_analysis['msg'], C.YELLOW)}")
        if sched_analysis.get("recommendation"):
            print(f"     {colorize('-> ' + sched_analysis['recommendation'], C.YELLOW)}")
    print()

    # ---- 6. Veredicto ----
    print(colorize("=" * 70, C.DIM))
    veredicts = [uptime_analysis["verdict"], sched_analysis["verdict"]]
    if supa_status != "ok":
        veredicts.append("err")

    if "err" in veredicts:
        final = colorize("  FALLA CRITICA — App con problemas", C.BOLD + C.RED)
        exit_code = 2
    elif "warn" in veredicts:
        final = colorize("  ADVERTENCIA — App OK con avisos", C.BOLD + C.YELLOW)
        exit_code = 1
    else:
        final = colorize("  TODO OK — App funcionando correctamente", C.BOLD + C.GREEN)
        exit_code = 0

    print(final)
    print(colorize("=" * 70, C.DIM))
    print()

    if verbose:
        print(colorize("  Datos crudos:", C.DIM))
        print(json.dumps(data, indent=2, ensure_ascii=False))

    return exit_code


# ---------------------------------------------------------------------------
# WATCH MODE
# ---------------------------------------------------------------------------
def watch_mode(base_url: str, interval_seconds: int):
    print(colorize(f"\nModo WATCH activado (cada {interval_seconds}s). Ctrl+C para salir.\n", C.CYAN))
    try:
        while True:
            check_and_report(base_url, verbose=False)
            print(colorize(f"\nEsperando {interval_seconds}s...\n", C.DIM))
            time.sleep(interval_seconds)
    except KeyboardInterrupt:
        print(colorize("\n\nWATCH detenido por el usuario.\n", C.YELLOW))


def check_and_report(base_url: str, verbose: bool = False) -> int:
    liveness = check_liveness(base_url)
    readiness = check_readiness(base_url)
    return print_report(base_url, liveness, readiness, verbose=verbose) or 0


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Verificacion de salud de PARAGUAY-FFAA | METALSTORM en Render"
    )
    parser.add_argument(
        "--url",
        default=DEFAULT_URL,
        help=f"URL base del backend (default: {DEFAULT_URL})",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Mostrar datos crudos del JSON",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Salida en JSON puro (para scripting)",
    )
    parser.add_argument(
        "--watch",
        type=int,
        metavar="SEGUNDOS",
        help="Modo watch: re-verifica cada N segundos (ej: --watch 60)",
    )

    args = parser.parse_args()
    base_url = args.url.rstrip("/")

    if args.watch:
        watch_mode(base_url, args.watch)
        return 0

    liveness = check_liveness(base_url)
    readiness = check_readiness(base_url)

    if args.json:
        out = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "url": base_url,
            "liveness": {
                "ok": liveness["ok"],
                "status": liveness.get("status"),
                "elapsed_ms": liveness.get("elapsed_ms"),
                "error": liveness.get("error"),
            },
            "readiness": {
                "ok": readiness["ok"],
                "status": readiness.get("status"),
                "elapsed_ms": readiness.get("elapsed_ms"),
                "error": readiness.get("error"),
                "data": readiness.get("data", {}),
            },
        }
        print(json.dumps(out, indent=2, ensure_ascii=False))
        return 0 if readiness["ok"] else 2

    exit_code = print_report(base_url, liveness, readiness, verbose=args.verbose)
    return exit_code


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(colorize("\n\nCancelado por el usuario.\n", C.YELLOW))
        sys.exit(130)
    except Exception as e:
        print(colorize(f"\nError inesperado: {e}\n", C.RED))
        import traceback
        traceback.print_exc()
        sys.exit(1)