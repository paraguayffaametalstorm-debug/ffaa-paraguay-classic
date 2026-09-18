# 🗄️ Guía de Migraciones SQL — PARAGUAY-FFAA | METALSTORM

> **Documentación oficial del versionado del esquema de base de datos en Supabase PostgreSQL.**  
> **Fase:** 2 (Infraestructura como Código) · **Hallazgo:** HALL-048  
> **Última actualización:** 2026-09-17 (v1.3 — agregado archivo 030)

---

## 📋 Índice de Archivos

| # | Archivo | Tabla / Propósito |
|---|---|---|
| 000 | `000_full_schema_dump.sql` | Índice de referencia de las 22 tablas |
| 001 | `001_users.sql` | Padrón militar de combatientes |
| 002 | `002_performances.sql` | Registro semanal de rendimiento |
| 003 | `003_events.sql` | Eventos operativos (Squadron) |
| 004 | `004_normativas.sql` | Reglamentos y circulares |
| 005 | `005_plane_models.sql` | Catálogo de 44 modelos de combate |
| 006 | `006_plane_mods.sql` | Catálogo de 10 mods oficiales |
| 007 | `007_mod_effects.sql` | Efectos numéricos de mods (50 filas) |
| 008 | `008_planes.sql` | Hangar personal de pilotos |
| 009 | `009_plane_upgrades.sql` | Auditoría de mejoras Upgrades 2.0 |
| 010 | `010_upgrade_nodes_v2.sql` | Árbol de nodos Starform 2.0 (3072 filas) |
| 011 | `011_upgrade_effects.sql` | Efectos consolidados de upgrades |
| 012 | `012_upgrade_effects_history.sql` | Historial de cambios de efectos |
| 013 | `013_password_resets.sql` | Tokens de reset de contraseña (15 min) |
| 014 | `014_recovery_codes.sql` | Códigos de recuperación alternativos |
| 015 | `015_user_settings.sql` | Preferencias de usuario |
| 016 | `016_security_events.sql` | Eventos de seguridad (login, resets) |
| 017 | `017_audit_logs.sql` | Auditoría de cambios administrativos |
| 018 | `018_error_logs.sql` | Logs de errores del sistema |
| 019 | `019_bm_events.sql` | Black Market - Eventos ⚠️ (rediseño pendiente) |
| 020 | `020_bm_missions.sql` | Black Market - Misiones ⚠️ (rediseño pendiente) |
| 021 | `021_bm_progress.sql` | Black Market - Progreso ⚠️ (rediseño pendiente) |
| 022 | `022_bm_discounts.sql` | Black Market - Descuentos ⚠️ (rediseño pendiente) |
| 023 | `023_upgrades_2_0.sql` | Migración compuesta: Upgrades 2.0 (rutas, niveles, sistemas) |
| 024 | `024_fix_users_null_user_id.sql` | Fix de datos: asignación de `user_id` a usuarios NULL |
| 025 | `025_user_id_sequence.sql` | Secuencia atómica `user_id_seq` + RPC `get_next_user_id()` |
| 026 | `026_fix_user_settings_fk.sql` | Corrección de FK de `user_settings` a `public.users` |
| 027 | `027_backups_table.sql` | Tabla `backups` con RLS `no_public_access` |
| 028 | `028_events_master.sql` | Tabla unificada de eventos (SQ, BM, futuros) — Rediseño |
| 029 | `029_event_participations.sql` | Tabla unificada de participaciones — Rediseño |
| 030 | `030_scheduler_locks.sql` | Advisory locks para scheduler de eventos |

**Archivos legacy (no ejecutar):** `legacy/updates_v3.4.0.sql` — versión obsoleta de `password_resets` con tipos incorrectos. Conservado como referencia histórica.

---

## 🚀 Orden de Ejecución

Los archivos deben ejecutarse **en orden numérico ascendente** (001, 002, 003, ...):

1. `001_users.sql` (tabla raíz)
2. `002_performances.sql` (depende de `users` y `events`)
3. `003_events.sql` (tabla raíz)
4. `004_normativas.sql`
5. `005_plane_models.sql` (tabla raíz para catálogo)
6. `006_plane_mods.sql`
7. `007_mod_effects.sql`
8. `008_planes.sql` (depende de `users`, `plane_models`, `plane_mods`)
9. `009_plane_upgrades.sql` (depende de `planes`)
10. `010_upgrade_nodes_v2.sql` (depende de `plane_models`)
11. `011_upgrade_effects.sql`
12. `012_upgrade_effects_history.sql`
13. `013_password_resets.sql` (depende de `users`)
14. `014_recovery_codes.sql` (depende de `users`)
15. `015_user_settings.sql` (depende de `users`)
16. `016_security_events.sql` (depende de `users`)
17. `017_audit_logs.sql`
18. `018_error_logs.sql`
19. `019_bm_events.sql`
20. `020_bm_missions.sql`
21. `021_bm_progress.sql`
22. `022_bm_discounts.sql`
23. `023_upgrades_2_0.sql` (idempotente; puede ejecutarse antes o después)
24. `024_fix_users_null_user_id.sql` (fix de datos, ejecutar solo si hay `user_id` NULL)
25. `025_user_id_sequence.sql` (crear secuencia y RPC para `user_id`)
26. `026_fix_user_settings_fk.sql` (corregir FK de `user_settings`)
27. `027_backups_table.sql` (tabla de backups, independiente)
28. `028_events_master.sql` (tabla unificada de eventos)
29. `029_event_participations.sql` (depende de `events_master` y `users`)
30. `030_scheduler_locks.sql` (advisory locks para el scheduler)

---

## 🔄 Recrear la Base de Datos desde Cero

**Procedimiento completo:**

1. **Crear un proyecto nuevo en Supabase.**
2. **Abrir el SQL Editor** del proyecto.
3. **Ejecutar los archivos en orden** (001, 002, ..., 029):
   - Copiar el contenido de cada archivo.
   - Pegar en el SQL Editor.
   - Presionar **RUN**.
   - Verificar que no haya errores.
4. **Verificar las políticas RLS:**
   - Tabla `password_resets`: debe tener RLS habilitado con política `no_public_access`.
   - Tabla `backups`: debe tener RLS habilitado con política `no_public_access`.
   - Otras tablas: revisar según corresponda.
5. **Ejecutar el script de verificación de tablas:**

```sql
-- Verificar que las 25 tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

**Resultado esperado:** 25 tablas listadas.

6. **Verificar las políticas RLS:**

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

**Resultado esperado:** al menos las tablas `password_resets`, `backups` y `recovery_codes` con `rowsecurity = true`.

7. **Verificar la secuencia y RPC de `user_id`:**

```sql
-- Verificar que la secuencia existe
SELECT sequencename FROM pg_sequences WHERE schemaname = 'public';

-- Verificar que la RPC funciona (debe devolver un número)
SELECT get_next_user_id();
```

**Resultado esperado:** la secuencia `user_id_seq` existe y la RPC devuelve un número correlativo.

---

## 📝 Notas de Idempotencia

La mayoría de los archivos usan `CREATE TABLE IF NOT EXISTS` e `CREATE INDEX IF NOT EXISTS`, por lo que pueden ejecutarse múltiples veces sin error.

**Excepciones importantes:**

- `ALTER TABLE ... ADD CONSTRAINT`: **no son idempotentes**. Pueden fallar en la segunda ejecución si la constraint ya existe.
- `CREATE POLICY`: usar `DROP POLICY IF EXISTS` antes del `CREATE POLICY` para evitar errores en re-ejecución.
- `CREATE SEQUENCE`: usar `CREATE SEQUENCE IF NOT EXISTS` para idempotencia.
- `CREATE OR REPLACE FUNCTION`: idempotente por diseño.

**Recomendación:** ejecutar cada archivo **una sola vez** en el orden indicado. Si hay que re-ejecutar, revisar el archivo para confirmar que es idempotente.

---

## ⚠️ Notas sobre el Black Market

Las tablas `bm_events`, `bm_missions`, `bm_progress` y `bm_discounts` (archivos 019-022) están marcadas con **`TODO: REDISEÑO BM PENDIENTE`**.

**Motivo:** el módulo Black Market será rediseñado en una fase posterior (ver `BACKLOG.md` — items BL-001 a BL-005 y `docs/rediseno_eventos/`). Los archivos SQL 019-022 se mantienen por compatibilidad, pero la lógica cambiará sustancialmente.

**Estado actual:**
- Las tablas están vacías (0 registros).
- El módulo nunca se usó en producción.
- El rediseño está planificado con el paquete `docs/rediseno_eventos/`.

---

## 🗂️ Estructura del Directorio `sql/`

```
sql/
├── 000_full_schema_dump.sql          # Índice de referencia
├── 001_users.sql                     # Padrón militar
├── 002_performances.sql              # Rendimiento semanal
├── 003_events.sql                    # Eventos operativos (Squadron)
├── 004_normativas.sql                # Reglamentos
├── 005_plane_models.sql              # Catálogo de 44 modelos
├── 006_plane_mods.sql                # 10 mods oficiales
├── 007_mod_effects.sql               # 50 efectos de mods
├── 008_planes.sql                    # Hangar personal
├── 009_plane_upgrades.sql            # Auditoría de mejoras
├── 010_upgrade_nodes_v2.sql          # Árbol Starform 2.0
├── 011_upgrade_effects.sql           # Efectos de upgrades
├── 012_upgrade_effects_history.sql   # Historial de efectos
├── 013_password_resets.sql           # Tokens de reset (15 min)
├── 014_recovery_codes.sql            # Códigos de recuperación
├── 015_user_settings.sql             # Preferencias
├── 016_security_events.sql           # Eventos de seguridad
├── 017_audit_logs.sql                # Auditoría administrativa
├── 018_error_logs.sql                # Logs de errores
├── 019_bm_events.sql                 # BM - Eventos (⚠️ rediseño pendiente)
├── 020_bm_missions.sql               # BM - Misiones (⚠️ rediseño pendiente)
├── 021_bm_progress.sql               # BM - Progreso (⚠️ rediseño pendiente)
├── 022_bm_discounts.sql              # BM - Descuentos (⚠️ rediseño pendiente)
├── 023_upgrades_2_0.sql              # Migración compuesta Upgrades 2.0
├── 024_fix_users_null_user_id.sql    # Fix de datos
├── 025_user_id_sequence.sql          # Secuencia atómica de user_id
├── 026_fix_user_settings_fk.sql      # Fix de FK de user_settings
├── 027_backups_table.sql             # Tabla de backups con RLS
├── 028_events_master.sql             # Tabla unificada de eventos (rediseño)
├── 029_event_participations.sql      # Participaciones unificadas (rediseño)
├── 030_scheduler_locks.sql           # Advisory locks del scheduler
├── README.md                          # Este archivo
└── legacy/
    └── updates_v3.4.0.sql            # (Histórico, no ejecutar)
```

---

## 🔗 Referencias Relacionadas

| Documento | Propósito |
|---|---|
| `DEPLOYMENT_GUIDE.md` (sección 5.1) | Procedimiento de recreación desde cero |
| `DEPLOYMENT_STATE.md` | Estado actual de las tablas en Supabase |
| `CHANGELOG.md` | Historial de cambios del esquema |
| `docs/rediseno_eventos/` | Paquete completo de rediseño del sistema de eventos |
| `BACKLOG.md` | Items BL-002, BL-003, BL-004 relacionados con eventos |
| `CURRENT_STATE.md` | Estado congelado del sistema (v4.0.2) |

---

## 📜 Changelog del README

| Versión | Fecha | Cambios |
|---|---|---|
| **v1.0** | 2026-09-16 | Creación inicial (Fase 2 — HALL-048) con 24 archivos (000-024). |
| **v1.1** | 2026-09-17 | Agregados archivos 025, 026, 027. Notas de idempotencia ampliadas. Sección de estructura de directorio. Referencias actualizadas. |
| **v1.2** | 2026-09-17 | Agregados archivos 028, 029 (rediseño de eventos). |
| **v1.3** | 2026-09-17 | Agregado archivo 030 (advisory locks del scheduler). |

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**  
**Guía de Migraciones v1.3 · 2026-09-17 · Documento vivo**