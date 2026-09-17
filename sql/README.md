# 🗄️ Guía de Migraciones SQL — PARAGUAY-FFAA | METALSTORM

> **Documentación oficial del versionado del esquema de base de datos en Supabase PostgreSQL.**  
> **Fase:** 2 (Infraestructura como Código) · **Hallazgo:** HALL-048

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

---

## 🔄 Recrear la Base de Datos desde Cero

**Procedimiento completo:**

1. **Crear un proyecto nuevo en Supabase.**
2. **Abrir el SQL Editor** del proyecto.
3. **Ejecutar los archivos en orden** (001, 002, ..., 024):
   - Copiar el contenido de cada archivo.
   - Pegar en el SQL Editor.
   - Presionar **RUN**.
   - Verificar que no haya errores.
4. **Verificar las políticas RLS:**
   - Tabla `password_resets`: debe tener RLS habilitado con política `no_public_access`.
   - Otras tablas: revisar según corresponda.
5. **Ejecutar el script de verificación final:**

```sql
-- Verificar que las 22 tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;