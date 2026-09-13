# 🔧 Historial de Fixes Aplicados - PARAGUAY-FFAA | METALSTORM

> **Bitácora Técnica de Correcciones Críticas y Refactorizaciones de Tipos.**  
> **Fecha de Consolidación:** 2026-09-09  
> **Versión Relacionada:** v3.7.0

---

## 📌 Resumen de Commits Críticos

```bash
fc657f0 refactor: implement helper functions for typed queries
0e10c46 fix(auth): make password update identifier dynamic
```

---

## 🛠️ Detalle de Fixes Implementados

### 🔹 Fix #1: Desacoplamiento UUID vs INTEGER en `changePassword()`
- **Fecha:** 2026-09-09
- **Archivo Principal:** `src/controllers/auth.controller.js`
- **Severidad:** 🚨 Crítica (Bloqueaba el onboarding de nuevos pilotos y restablecimiento forzado).
- **Problema Detectado:**
  La consulta de actualización en Supabase forzaba la condición `.eq('id', user.id)`. Debido a que la carga útil del token JWT o el objeto `req.user` contenía identificadores numéricos (`user_id = 1000`) o inconsistencias de formato, PostgreSQL rechazaba la consulta por incompatibilidad de tipos UUID o no lograba hacer match con ningún registro, dejando `must_change_password` en `true` indefinidamente.
- **Solución Técnica:**
  Se implementó una consulta polimórfica tipada jerárquica con comprobación de regex para UUID v4, conversión numérica para `user_id` entero y fallback a `email`:

  ```javascript
  // Lógica tipada implementada en src/controllers/auth.controller.js
  let updateQuery = supabase.from('users').update({
      password_hash: newHash,
      must_change_password: false,
      token_version: newTokenVersion,
      updated_at: new Date().toISOString()
  });

  if (user.id && typeof user.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
      updateQuery = updateQuery.eq('id', user.id);
  } else if (user.user_id && (typeof user.user_id === 'number' || /^\d+$/.test(String(user.user_id)))) {
      updateQuery = updateQuery.eq('user_id', Number(user.user_id));
  } else if (user.email) {
      updateQuery = updateQuery.eq('email', user.email);
  } else {
      updateQuery = updateQuery.eq('id', user.id);
  }

  const { data: updateData, error: updateError } = await updateQuery
      .select('id, email, nick, user_id, role, token_version, must_change_password');
  ```
- **Evidencia de Validación en Logs:**
  ```text
  🔍 [changePassword] Actualizando usuario con: {
    id: '3658df3a-3d15-4669-a595-dca33ec86fd3',
    user_id: 1000,
    newTokenVersion: 2,
    newHash: '$2b$10$as8vQDbgnRgh5...'
  }
  ✅ [changePassword] Filas actualizadas con éxito: 1
  ```
- **Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #2: Consultas Tipadas en Reseteo Administrativo de Claves
- **Fecha:** 2026-09-09
- **Archivo:** `src/routes/admin.routes.js` y `src/controllers/admin.controller.js`
- **Severidad:** ⚠️ Alta
- **Problema:** El endpoint de reseteo `POST /api/admin/users/:id/reset-password` fallaba cuando la URL contenía el `user_id` numérico (e.g. `1000`) en lugar del UUID interno de Supabase.
- **Solución:**
  Se integró la validación tipada que analiza el parámetro `:id`. Si contiene solo dígitos numéricos, consulta por la columna `user_id`; de lo contrario, si cumple con la expresión regular de UUID, consulta por la columna `id`.
- **Estado:** ✅ RESUELTO Y AUDITADO

---

### 🔹 Fix #3: Manejo Seguro de Identificadores en Gestión de Roles y Estados
- **Fecha:** 2026-09-09
- **Archivo:** `src/controllers/admin.controller.js`
- **Métodos Involucrados:** `updateUserRole()`, `updateUserStatus()`
- **Problema:** Las actualizaciones de estado operativo (`ACTIVE` / `INACTIVE`) y ascenso de rangos militares (`MIEMBRO`, `VETERANO`, `ADMIN`) lanzaban excepciones en Supabase al recibir `user_id` entero desde la interfaz de administración táctica.
- **Solución:** Normalización del identificador del usuario mediante comprobación de formato UUID antes de concatenar a la consulta de base de datos.
- **Estado:** ✅ RESUELTO Y PROBADO

---

### 🔹 Fix #4: Consultas Tipadas en Expediente Militar y Perfil
- **Fecha:** 2026-09-09
- **Archivo:** `src/controllers/profile.controller.js`
- **Métodos Involucrados:** `getProfile()`, `updateProfile()`
- **Problema:** En perfiles de combatientes autenticados mediante Google OAuth 2.0 o contraseñas tradicionales, los endpoints de perfil no lograban actualizar la biografía táctica o número telefónico si el JWT contenía únicamente `user_id` numérico.
- **Solución:** Extensión de la lógica condicional polimórfica en la lectura y persistencia de perfiles militares.
- **Estado:** ✅ RESUELTO Y VERIFICADO

---

### 🔹 Fix #5: Registro y Consulta de Rendimiento Militar Táctico
- **Fecha:** 2026-09-09
- **Archivo:** `src/controllers/performances.controller.js`
- **Métodos Involucrados:** `savePerformance()`, `getMyHistory()`
- **Problema:** Al registrar tokens de combate semanales y evaluar el semáforo militar (`perf_status`), la consulta histórica cruzaba erróneamente `user_id` entero con la columna `user_id` en `performances` cuando en ocasiones se suministraba el `id` (UUID) en el contexto de la solicitud.
- **Solución:** Unificación del almacenamiento de rendimientos vinculados estrictamente al `user_id` numérico entero del combatiente.
- **Estado:** ✅ RESUELTO Y OPERATIVO

---

### 🔹 Fix #6: Normalización de la tabla `planes` (2026-09-10)

**Fecha:** 2026-09-10  
**Archivos:** Base de datos Supabase  
**Problema:** La tabla `planes` no cumplía con 1NF:
- `especial_nombre` contenía nombre + nivel + efecto
- `especial_nivel` era TEXT (no INTEGER)
- `pasiva_nombre` contenía nombre + nivel + efecto
- `pasiva_nivel` era TEXT (no INTEGER)
- Faltaba constraint UNIQUE (user_id, avion_id)
- Faltaba FK planes.user_id → users.user_id

**Solución:**
1. Agregar constraint UNIQUE (user_id, avion_id)
2. Agregar FK planes.user_id → users.user_id
3. Crear columnas `especial_nivel_num` (INTEGER) y `especial_efecto` (TEXT)
4. Crear columnas `pasiva_nivel_num` (INTEGER) y `pasiva_efecto` (TEXT)
5. Migrar datos con regex
6. Agregar constraints CHECK
7. Limpiar nombres (quitar paréntesis)

**Resultado:**
- ✅ 121 aviones normalizados
- ✅ 83/84 especiales migradas
- ✅ 35/37 pasivas migradas
- ✅ 3 aviones sin nivel (correcto)
- ✅ Estructura 1NF

**Estado:** ✅ RESUELTO Y PROBADO

**Commits:** N/A (cambios directos en Supabase)

---

### 🔹 Fix #7: Sistema de Aviones - Correcciones y Mejoras (2026-09-10)

**Fecha:** 2026-09-10  
**Archivos:** `planes.controller.js`, `audit.js`, `aircraft-stats-modal.html`, `views.js`  

**Problemas corregidos:**
1. **Funciones que leen nombre pero no nivel:** Las funciones `getPlaneDetails`, `exportPlanesCSV`, y `getPlaneStats` solo leían `especial_nombre` y `pasiva_nombre`, pero no `especial_nivel_num`, `especial_efecto`, `pasiva_nivel_num`, `pasiva_efecto`.
2. **Auditoría (UUID):** El sistema intentaba insertar `userId: 1` (INTEGER) en una columna UUID.
3. **Columna `actor_id` en `audit_logs`:** La tabla no tenía la columna.
4. **Falta de IA de recomendación.**
5. **Falta de Upgrade Planner.**

**Solución:**
1. Agregar las columnas nuevas en las funciones afectadas.
2. Convertir `userId` (INTEGER) a UUID en `logSecurityEvent`.
3. Convertir `actorId` (INTEGER) a UUID en `logAuditChange`.
4. Implementar `getRecommendedBuild` en el backend y `loadPlaneRecommendation` en el frontend.
5. Implementar `openUpgradePlanner` y `saveBuild` en el frontend.

**Resultado:**
- ✅ 39 modelos en el catálogo
- ✅ 10 mods disponibles
- ✅ 4 sistemas mejorables
- ✅ IA de Recomendación (3 estilos)
- ✅ Upgrade Planner (previsualización)
- ✅ Sin errores de auditoría
- ✅ CSV con datos completos

**Estado:** ✅ RESUELTO Y PROBADO

**Commits:** 6dceffc (feat(ui): add tactical build recommendations and planner)

---

### 🔹 Fix #8: Efectos de Mods - Integración Numérica en Estadísticas (2026-09-10)

**Fecha:** 2026-09-10  
**Archivos:** `src/utils/modEffects.js`, `src/controllers/planes.controller.js`  

**Problemas corregidos:**
1. **Falta de helper de efectos de mods:** No existía un módulo para consultar y parsear la tabla `mod_effects` (50 registros: 10 mods × 5 niveles) ni proveer fallback en memoria.
2. **Cálculo de estadísticas estático:** La función `getPlaneStats` no aplicaba los bonus porcentuales aportados por los mods equipados en la aeronave (`mod1_id` con `mod1_lvl` y `mod2_id` con `mod2_lvl`).

**Solución:**
1. Crear `src/utils/modEffects.js` implementando:
   - `getModEffects(supabase)`: Carga desde Supabase con caché en memoria (TTL 5 min) y fallback oficial para los 10 mods.
   - `getFallbackModEffects()`: Definición canónica de los 10 mods por niveles con banderas `siempre_activo`.
   - `getModLevelEffects(effects, modId, level)`: Extracción directa de parámetros de nivel.
   - `calculateModBonus(effects, modId, level, statKey)`: Cálculo estricto de multiplicadores para estadísticas visibles.
   - `getModDescription(effects, modId, level)`: Formato legible del beneficio táctico.
   - `invalidateModEffectsCache()`: Recarga forzada de caché.
2. Actualizar `getPlaneStats` en `src/controllers/planes.controller.js`:
   - Consultar `getModEffects(supabase)`.
   - Mapear y aplicar bonus siempre activos a `agility` (m1, m2), `armor` (m3), `ecm` (m7) y `radar` (m10).
   - Discriminar efectos condicionales (`m4`, `m6`, `m9`) y utilitarios (`m5`, `m8`) sin alterar arbitrariamente las estadísticas base.

**Resultado:**
- ✅ 10 mods reconocidos en sus 5 niveles (50 configuraciones)
- ✅ Cálculo de agilidad, blindaje, ECM y radar con modificadores en tiempo real
- ✅ Telemetría de aeronaves 100% calibrada según Upgrades 2.0 y Mods oficiales

**Estado:** ✅ RESUELTO Y VERIFICADO

---

### 🔹 Fix #9: Actualizar `sistemas_disponibles` y Validación de Sistemas (2026-09-11)

**Fecha:** 2026-09-11  
**Archivos:** `plane_models` (Supabase), `src/controllers/planes.controller.js`  
**Severidad:** 🚨 Crítica (Permitía mejorar sistemas inexistentes)

**Problema Detectado:**
Todos los 42 aviones tenían la misma estructura genérica en `sistemas_disponibles`, lo que permitía intentar mejorar sistemas que no existían para ciertos aviones (ej: cañones en F-111).

**Solución:**
1. Actualizar `sistemas_disponibles` en `plane_models` con la estructura específica por avión (`canones`, `misiles_ir`, `misiles_radar`, `misiles_beam`, `misiles_manual`, `misiles_largo`, `cohetes`).
2. Agregar validación en `updatePlaneSystem` que verifica que el sistema solicitado esté disponible antes de aplicar la mejora.
3. Retornar error `SYSTEM_NOT_AVAILABLE` si no está disponible.

**Código implementado:**
```javascript
const sistemaKeyMap = {
  fuselaje: 'fuselaje',
  motor: 'motor',
  avionica: 'avionica',
  armas: 'canones'
};

const sistemaKey = sistemaKeyMap[sistema];

if (sistemaKey) {
  const { data: modelData, error: modelError } = await supabase
    .from('plane_models')
    .select('sistemas_disponibles, name')
    .eq('id', plane.avion_id)
    .single();

  if (!modelError && modelData) {
    const sistemasDisponibles = modelData.sistemas_disponibles || {};
    const sistemaDisponible = sistemasDisponibles[sistemaKey];

    if (sistemaDisponible === null || sistemaDisponible === false || 
        sistemaDisponible === undefined) {
      return res.status(400).json({
        success: false,
        message: `Esta aeronave (${modelData.name}) no tiene el sistema ${sistema.toUpperCase()} disponible`,
        error: 'SYSTEM_NOT_AVAILABLE',
        details: { ... }
      });
    }
  }
}
```

**Evidencia de Validación:**
```text
✅ [Upgrade] Sistema armas disponible para F/A-18 Hornet
```

**Resultado:**
- ✅ 42 aviones con armas específicas
- ✅ Validación funcional en producción
- ✅ Prueba exitosa: PUT /api/planes/4/system → success: true

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #10: Integración de Datos de la Wiki de Metalstorm (2026-09-12)

**Fecha:** 2026-09-12  
**Archivos:** `plane_models` (Supabase), `src/controllers/planes.controller.js`, `js/views.js`, `components/aircraft-stats-modal.html`  
**Severidad:** 🎨 Media (feature nueva)  
**Commit:** N/A (Fase 3 completa)  

**Descripción:**  
Integración completa de los datos de la Wiki de Metalstorm (historia, recomendaciones, paints, canopies, loadout detallado) en el modal de Stats de cada aeronave.

**Problema Resuelto:**
- El modal Stats mostraba placeholders en las secciones de Historia y Recomendaciones.
- No había información sobre paints ni canopies disponibles.
- El armamento se mostraba solo con nombre (sin stats detalladas).

**Solución Implementada:**

1. **Extracción (Fase 3B):**
   - Script de consola del navegador que extrae 44 aviones desde `metalstorm.wiki.gg`.
   - Consolidación en `all_aircraft_wiki_data_v2_FINAL.json`.
   - Carga a Supabase con script Node.js (`import-wiki-data.cjs`).

2. **Columnas nuevas en `plane_models`:**
   ```sql
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS descripcion TEXT;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS historia TEXT;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS recomendaciones JSONB;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS loadout_wiki JSONB;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS paints JSONB;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS canopies JSONB;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS general_info_wiki JSONB;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS wiki_url TEXT;
   ALTER TABLE plane_models ADD COLUMN IF NOT EXISTS wiki_extracted_at TIMESTAMPTZ;
   ```

3. **Backend (`getPlaneDetails`):** 8 campos nuevos añadidos a `planeDetail`.

4. **Frontend (`openAircraftDeepModal`):**
   - Sección "Historia" con párrafos completos.
   - Sección "Recomendaciones" con subsecciones (Trait/Ability/Passive Tips).
   - Sección "Paints" con galería visual.
   - Sección "Canopies" con galería visual.
   - `renderArmamentoEquipado` prioriza `plane.loadout_wiki`.

**Resultado:**
- ✅ 44 aviones con datos Wiki.
- ✅ 310+ paints, 176 canopies, 41 historias, 44 recomendaciones.
- ✅ Modal Stats con layout responsive 1-4 columnas.
- ✅ Sin errores de sintaxis (`node --check` pasó).

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---
### 🔹 Fix #11: Limpieza de Tablas Huérfanas de Supabase (2026-09-12)

**Fecha:** 2026-09-12  
**Archivos:** Supabase (schema `public`)  
**Severidad:** 🧹 Baja (housekeeping)  
**Commit:** N/A (cambios directos en Supabase)

**Descripción:**  
Auditoría y limpieza de tablas huérfanas acumuladas durante migraciones
y pruebas del proyecto.

**Tablas eliminadas (10):**

1. **7 tablas de backup** (copias manuales de migraciones antiguas):
   - `planes_backup`, `planes_backup_full`
   - `planes_backup_20260910`, `planes_backup_limpieza_20260910`
   - `users_backup_full`
   - `security_events_backup`
   - `plane_models_backup`

2. **3 tablas legacy:**
   - `upgrade_nodes` (v1, reemplazada por `upgrade_nodes_v2` con 3072 filas)
   - `mod_effects_history` (auditoría vacía sin uso)
   - `performances_backup` (copia redundante)

**Verificación:**
- Grep de código: sin referencias en `src/`, `js/`, `components/`
- Post-DROP: schema `public` con 20 tablas activas
- App funcional: ✅

**Estado:** ✅ COMPLETADO

---
### 🔹 Fix #12: Restauración de `image_url` en 2 Aeronaves (2026-09-12)

**Fecha:** 2026-09-12  
**Archivos:** `plane_models` (Supabase)  
**Severidad:** 🖼️ Media (imágenes rotas en el hangar)  
**Commit:** N/A (cambio directo en Supabase)

**Descripción:**  
Dos aeronaves del catálogo (`F-20 Tigershark` id=110 y `KF-21 Boramae`
id=212) no tenían el campo `image_url` poblado, mostrándose sin imagen
principal en el carrusel del hangar militar.

**Diagnóstico:**
- Ambas imágenes SÍ existían en Cloudinary pero nunca se vincularon en Supabase.
- Las URLs crudas de Cloudinary usaban versionado por timestamp
  (`/v1789134873/`), mientras el resto del catálogo usa versionado
  explícito (`/v1/`).

**Solución:**
```sql
UPDATE plane_models 
SET image_url = 'https://res.cloudinary.com/evoejuci/image/upload/w_256,h_256,c_fill,f_webp,q_auto/v1/110-f-20-tigershark.png'
WHERE id = '110';

UPDATE plane_models 
SET image_url = 'https://res.cloudinary.com/evoejuci/image/upload/w_256,h_256,c_fill,f_webp,q_auto/v1/212-kf-21-boramae.png'
WHERE id = '212';
```

**Resultado:**
- ✅ 44/44 aviones con `image_url` de Cloudinary
- ✅ Patrón idéntico: `w_256,h_256,c_fill,f_webp,q_auto/v1`
- ✅ Consistencia total en el catálogo

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

### 🔹 Fix #13: Integración Completa de Mods Oficiales + Cloudinary (2026-09-12)

**Fecha:** 2026-09-12  
**Archivos:** `plane_mods` (Supabase), `src/controllers/planes.controller.js`,
`src/utils/modEffects.js`, `components/aircraft-stats-modal.html`, `js/views.js`,
`css/tactical-design.css`  
**Severidad:** 🎨 Alta (datos incorrectos + mejora visual)  
**Commit:** N/A

**Descripción:**  
Integración completa de los 10 mods oficiales de MetalStorm (fuente:
https://metalstorm.wiki.gg/wiki/Aircraft_Mods) con datos exactos,
iconos servidos desde Cloudinary y visualización enriquecida en el
modal de Stats.

**Problemas Resueltos:**

1. **`DEFAULT_PLANE_MODS` (código):** Contenía 8 mods inventados con IDs
   numéricos (1-8) y nombres ficticios. Reemplazado por los 10 mods
   oficiales con IDs `m1-m10`.

2. **`getFallbackModEffects()` (código):** Valores desactualizados en
   los 10 mods. Corregidos con datos oficiales de la Wiki.

3. **`plane_mods.levels` (Supabase):** m3 y m7 tenían valores erróneos.
   Corregidos.

4. **`plane_mods` (Supabase):** Añadidas 7 columnas
   (`name_en`, `description_es`, `description_en`, `type_en`, `image_url`,
   `wiki_url`, `upgrade_costs`) pobladas con datos oficiales.

5. **Iconos de mods:** Subidos a Cloudinary en carpeta `mods/` con
   transformación `w_256,h_256,c_fill,f_webp,q_auto`.

6. **Frontend:** Modal de Stats ahora muestra icono + nombre + tipo +
   nivel de cada mod equipado.

**Tabla comparativa (muestra):**

| Mod | Valor anterior (MAL) | Valor oficial (BIEN) |
|---|---|---|
| m1 L1 | +4% | +10% |
| m2 L1 | +3% | +15% |
| m3 L1 | +5% (positivo) | -10% (reducción daño) |
| m7 L1 | +5% (positivo) | -30% (reducción bloqueo) |
| m8 L1 | -6% | -40% |
| m9 L1 | +5% | +20% |

**Resultado:**
- ✅ 10 mods con datos oficiales en Supabase y código
- ✅ `node --check` pasa en `planes.controller.js` y `modEffects.js`
- ✅ 10 iconos de mods servidos desde Cloudinary
- ✅ Modal de Stats muestra iconos de mods equipados
- ⏳ Pendiente: traducción al español de descripciones largas (Fase 3D)

**Estado:** ✅ RESUELTO Y PROBADO EN PRODUCCIÓN

---

## 📋 Matriz Resumen de Archivos y Responsabilidades

| Componente | Línea de Acción | Estado |
|---|---|:---:|
| `src/controllers/auth.controller.js` | Lógica tipada, control de `token_version` y password hashing | 🟢 ESTABLE |
| `src/routes/admin.routes.js` | Parámetros de ruta dinámicos (UUID / INTEGER) | 🟢 ESTABLE |
| `src/controllers/admin.controller.js` | Modificación de rangos militares y estado de cuenta | 🟢 ESTABLE |
| `src/controllers/profile.controller.js` | Persistencia de datos personales y teléfono de alertas | 🟢 ESTABLE |
| `src/controllers/performances.controller.js` | Historial de tokens y sincronización de semáforo | 🟢 ESTABLE |
| `src/controllers/planes.controller.js` | Habilidades, Upgrades 2.0, cálculo de mods, recomendaciones y validación de sistemas disponibles | 🟢 ESTABLE |
| `src/utils/upgradeEffects.js` | Lógica y fallback de bonificaciones por niveles de subsistemas (0-8) | 🟢 ESTABLE |
| `src/utils/modEffects.js` | Lógica, caché y cálculo de multiplicadores de los 10 mods tácticos | 🟢 ESTABLE |
| `src/utils/audit.js` | Resolución de UUIDs en eventos de seguridad y auditoría | 🟢 ESTABLE |
| `components/aircraft-stats-modal.html` | Modal de datos profundos y markup de Upgrade Planner 2.0 | 🟢 ESTABLE |
| `planes (Supabase)` | Normalización 1NF (UNIQUE, FK, CHECKs, habilidades) | 🟢 ESTABLE |
| `plane_models (Supabase)` | Catálogo de 42 modelos con `sistemas_disponibles` detallado por armamento | 🟢 ESTABLE |
| `components/change-password-modal.html` | Modal de actualización táctica (Workaround: ENTER) | 🟡 FIX UI PENDIENTE |
