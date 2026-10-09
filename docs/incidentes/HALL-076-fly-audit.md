# HALL-076 - Auditoria de recursos Fly.io y reduccion de costos

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
