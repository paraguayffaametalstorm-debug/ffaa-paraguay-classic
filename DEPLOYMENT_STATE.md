# 🚀 DEPLOYMENT STATE - PARAGUAY-FFAA | METALSTORM

> **⚠️ ESTADO CONGELADO - NO MODIFICAR SIN REVISIÓN MANUAL**  
> **Fecha de Congelamiento:** 2026-09-18  
> **Versión:** v4.3.0  
> **Entorno:** Producción (`Fly.io` región `gru` - São Paulo / Supabase PostgreSQL)  
> **Estado Operativo:** ✅ 100% OPERATIVO - POST-F3 + REDISEÑO DE EVENTOS (F2 COMPLETADA)

---

## 📑 Resumen Ejecutivo del Despliegue

Este documento maestro consolida la arquitectura en ejecución, el esquema de base de datos validado, el flujo crítico de registro y cambio de contraseña con autenticación dual y el historial de correcciones de tipos (UUID vs INTEGER) aplicadas en la versión v4.0.0 del sistema **PARAGUAY-FFAA | METALSTORM**.

### Indicadores de Salud Operativa
- **Core de Autenticación:** ✅ Operativo (Login Dual, Google OAuth 2.0 y JWT criptográfico con `token_version`).
- **Registro de Pilotos por Mando:** ✅ Operativo con auto-asignación incremental de `user_id` entero y hash temporal `MS-XXXX-XXXX`.
- **Cambio de Contraseña Forzado:** ✅ Operativo con resolución tipada dinámica (`UUID`, `INTEGER` o `email`).
- **Inactivación de Sesiones Fantasma:** ✅ Operativa mediante incremento secuencial de `token_version`.
- **Gestión Táctica de Inactivos:** ✅ Operativo con motivo obligatorio, trazabilidad de oficial/fecha, resolución batch y mensaje enriquecido de bloqueo.
- **Persistencia en Supabase:** ✅ Operativa con RLS e integridad referencial íntegra.

---

## 🗄️ 1. Estructura de Supabase (Tabla `users`)

El esquema de base de datos en PostgreSQL (Supabase) cuenta con definición tipada estricta:

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER UNIQUE NOT NULL,
    email TEXT UNIQUE,
    email_institucional TEXT,
    nick TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'MIEMBRO',
    status TEXT DEFAULT 'ACTIVE',
    must_change_password BOOLEAN DEFAULT true,
    token_version INTEGER DEFAULT 1,
    google_linked BOOLEAN DEFAULT false,
    google_id TEXT,
    full_name TEXT,
    email_personal TEXT,
    phone TEXT,
    bio TEXT,
    notifications_enabled BOOLEAN DEFAULT false,
    avg_tokens INTEGER DEFAULT 0,
    weeks_evaluated INTEGER DEFAULT 0,
    perf_status TEXT DEFAULT 'VERDE',
    inactive_reason TEXT,
    inactive_by UUID REFERENCES users(id) ON DELETE SET NULL,
    inactive_at TIMESTAMPTZ,
    temporary_password_expires_at TIMESTAMPTZ,
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### ⚠️ Reglas de Negocio Críticas

| Parámetro | Tipo / Valor por Defecto | Regla Táctica Inviolable |
|---|---|---|
| `user_id` | `INTEGER` (`UNIQUE`, `NOT NULL`) | **NUNCA UUID**. Es el identificador secuencial visible y numérico del combatiente (e.g., `1000`). |
| `id` | `UUID` (`PRIMARY KEY`) | **NUNCA INTEGER**. Identificador interno único generado por Supabase (`gen_random_uuid()`). |
| `must_change_password` | `BOOLEAN` (`DEFAULT true`) | Al crearse un usuario o resetearse administrativamente, se fuerza a `true`. |
| `token_version` | `INTEGER` (`DEFAULT 1`) | Se incrementa (`+1`) en cada cambio o reseteo de clave para invalidar tokens JWT antiguos. |
| `password_hash` | `TEXT` (`NOT NULL`) | Generado mediante `bcrypt` con factor de coste (salt rounds) 10. |
| `inactive_reason` | `TEXT` (`NULL`) | Motivo obligatorio al inactivar (10-500 chars). Se limpia a `NULL` al reactivar. |
| `inactive_by` | `UUID` (`NULL`, FK a `users.id`) | Identificador del oficial ejecutor de la baja militar. Se limpia a `NULL` al reactivar. |
| `inactive_at` | `TIMESTAMPTZ` (`NULL`) | Marca temporal de la inactivación. Se limpia a `NULL` al reactivar. |
| `temporary_password_expires_at` | `TIMESTAMPTZ` (`NULL`) | Fecha/hora UTC de vencimiento de la contraseña temporal (v4.4.0). `NULL` = sin vencimiento (legacy). Se limpia a `NULL` al cambiar la contraseña. |

---

## ✈️ SISTEMA DE AVIONES (2026-09-10)

### Estructura de Supabase

#### Tabla `plane_models` (Catálogo Maestro)

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | TEXT | ID del modelo (101, 102, 201, etc.) |
| `name` | TEXT | Nombre del avión |
| `type` | TEXT | Tipo (Ligero, Mediano, Pesado, Interceptor, Ataque) |
| `special_name` | TEXT | Nombre de la habilidad especial |
| `special_levels` | JSONB | Array de niveles de la especial (3 niveles) |
| `passive_name` | TEXT | Nombre de la habilidad pasiva |
| `passive_levels` | JSONB | Array de niveles de la pasiva (5 niveles) |
| `is_active` | BOOLEAN | ¿Está activo? |
| `stats_real` | JSONB | Estadísticas reales |
| `sistemas_disponibles` | JSONB | Sistemas y armas disponibles por avión (fuselaje, motor, avionica, canones, misiles_ir, misiles_radar, misiles_beam, misiles_manual, misiles_largo, cohetes) |
| `descripcion` | TEXT | Descripción in-game (Wiki EN) |
| `descripcion_es` | TEXT | Descripción in-game traducida (DeepL ES) |
| `historia` | TEXT | Trivia histórica (Wiki EN) |
| `historia_es` | TEXT | Trivia histórica traducida (DeepL ES) |
| `recomendaciones` | JSONB | Tips tácticos (Wiki EN) |
| `recomendaciones_es` | JSONB | Tips tácticos traducidos (DeepL ES) |
| `loadout_wiki` | JSONB | Armamento detallado (Wiki) |
| `paints` | JSONB | Array de paints (Wiki) |
| `canopies` | JSONB | Array de canopies (Wiki) |
| `general_info_wiki` | JSONB | Info general (Wiki) |
| `wiki_url` | TEXT | URL de la Wiki |
| `wiki_extracted_at` | TIMESTAMPTZ | Timestamp de extracción |

**Catálogo oficial:** 44 modelos de combate con configuración individual de armamento, subsistemas y traducción al español rioplatense.

##### Estructura de `sistemas_disponibles` (JSONB)

```json
{
  "fuselaje": true,
  "motor": true,
  "avionica": true,
  "canones": "precision" | "asalto" | null,
  "misiles_ir": true | false,
  "misiles_radar": true | false,
  "misiles_beam": true | false,
  "misiles_manual": true | false,
  "misiles_largo": true | false,
  "cohetes": true | false
}
```

##### Ejemplos Reales de `sistemas_disponibles` por Aeronave

| Modelo (ID) | Fuselaje | Motor | Aviónica | Cañones | Misiles IR | Misiles Radar | Misiles Largo | Otros Sistemas |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| **F-5 Tiger (101)** | `true` | `true` | `true` | `"precision"` | `true` | `false` | `false` | Beam: `false`, Manual: `false`, Cohetes: `false` |
| **F-111 Aardvark (401)** | `true` | `true` | `true` | `null` | `false` | `true` | `true` | Beam: `false`, Manual: `false`, Cohetes: `false` |
| **J-20 Mighty Dragon (404)** | `true` | `true` | `true` | `null` | `true` | `true` | `true` | Beam: `false`, Manual: `false`, Cohetes: `false` |
| **F-14 Tomcat (402)** | `true` | `true` | `true` | `"asalto"` | `true` | `true` | `true` | Beam: `false`, Manual: `false`, Cohetes: `false` |

#### Tabla `plane_mods` (Catálogo de Modificaciones)

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | TEXT | ID del mod (m1, m2, ..., m10) |
| `name` | TEXT | Nombre del mod |
| `type` | TEXT | Tipo (Agilidad, Defensa, Motor, Señuelos, Arma) |
| `levels` | JSONB | Array de niveles (5 niveles) |
| `is_active` | BOOLEAN | ¿Está activo? |

**10 mods disponibles (5 tipos, 2 por tipo):**

| Tipo | Mods |
|------|------|
| **Agilidad** | Giro Temerario, Maniobrabilidad Ideal |
| **Defensa** | Resistencia a las Explosiones, Blindaje de Ataque |
| **Motor** | Quemadores Auxiliares Eficientes, Máxima Propulsión |
| **Señuelos** | Bengalas Disruptivas, Bengalas Más Rápidas |
| **Arma** | Armas Aniquiladoras, Guiado Mejorado |

#### Tabla `mod_effects` (Efectos Numéricos de Mods)

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | INTEGER / SERIAL | ID único del registro |
| `mod_id` | TEXT | FK o ID del mod (m1..m10) |
| `mod_name` | TEXT | Nombre oficial del mod |
| `mod_type` | TEXT | Tipo / Familia (Agilidad, Defensa, Motor, Señuelos, Arma) |
| `level` | INTEGER | Nivel del mod (1-5) |
| `effects` | JSONB | Efectos cuantitativos y descriptivos |
| `is_active` | BOOLEAN | Indicador de mod activo (default `true`) |
| `created_at` | TIMESTAMP | Fecha de inserción |
| `updated_at` | TIMESTAMP | Última actualización |

### Sistema de Mods - Efectos Numéricos (10 Mods × 5 Niveles)

| Mod ID | Nombre Oficial | Tipo | Stat Base Afectada | Tipo de Activación | Efecto por Nivel (N1 $\to$ N5) |
|:---:|---|---|:---:|:---:|---|
| **m1** | Giro Temerario (Daredevil Turning) | Agilidad | `agility` | ✅ Siempre activo | Giro: +10%, +13%, +15%, +17%, +20% |
| **m2** | Maniobrabilidad Ideal (Ideal Maneuvering) | Agilidad | `agility` | ✅ Siempre activo | Eficiencia de viraje: +15%, +20%, +25%, +30%, +35% |
| **m3** | Resistencia a las Explosiones (Blast Resistance) | Defensa | `armor` | ✅ Siempre activo | Resistencia a daño por misiles/cohetes: -10%, -13%, -15%, -17%, -20% |
| **m4** | Blindaje de Ataque / Racha (Streak Armor) | Defensa | `armor` | ⚠️ Condicional (kills) | +30, +35, +40, +45, +50 HP temporal por derribo (máx 75% HP) |
| **m5** | Quemadores Auxiliares Eficientes (Efficient Afterburners) | Motor | Consumo | ✅ Siempre activo | Consumo postquemador: -10%, -13%, -15%, -17%, -20% |
| **m6** | Máxima Propulsión (Thrust Booster) | Motor | `speed` | ⚠️ Condicional (<50% combustible) | Vel. máx: +10% fijo / Aceleración: +10%, +15%, +20%, +25%, +30% |
| **m7** | Bengalas Disruptivas (Disruptive Flares) | Señuelos | `ecm` | ✅ Siempre activo | Bloqueo enemigo / ECM: -30%, -38%, -45%, -52%, -60% |
| **m8** | Bengalas Más Rápidas (Faster Flares) | Señuelos | Cooldown | ✅ Siempre activo | Cooldown bengalas: -40%, -45%, -50%, -55%, -60% |
| **m9** | Armas Aniquiladoras (Finishing Guns) | Arma | `firepower` | ⚠️ Condicional (<30% HP enem.) | Daño cañón: +20%, +22%, +25%, +28%, +30% contra enemigos <30% HP |
| **m10** | Guiado Mejorado (Improved Targeting) | Arma | `radar` | ✅ Siempre activo | Lock Speed +10..20% / Lock Angle +15..25% / Rocket Lead Range +15..30% |

#### Flujo de Aplicación de Mods en Telemetría y Combate

```text
┌─────────────────────────────────────────────────────────────────────────┐
│              FLUJO DE APLICACIÓN DE MODS (GET /api/planes/:id/stats)    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Consulta y Caché                                                     │
│    • getModEffects(supabase) consulta la tabla 'mod_effects'.           │
│    • Caché en memoria TTL 5 min + Fallback con los 10 mods oficiales.    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Extracción de Slots Equipados                                        │
│    • Slot 1: mod1_id (ej: 'm1') + mod1_lvl (1-5)                        │
│    • Slot 2: mod2_id (ej: 'm3') + mod2_lvl (1-5)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Discriminación de Efectos: Pasivos Permanentes vs Condicionales      │
│    • Siempre Activos (m1, m2, m3, m7, m10):                             │
│      Multiplican las estadísticas base visibles de la aeronave:         │
│      - Agility   *= (1 + m1_giro% + m2_eficiencia%)                     │
│      - Armor     *= (1 + m3_resistencia_misiles%)                       │
│      - ECM       *= (1 + m7_bloqueo_enemigo%)                           │
│      - Radar     *= (1 + m10_lock_speed%)                               │
│    • Condicionales (m4 racha, m6 <50% combustible, m9 remate cañón):    │
│      Se preservan como metadatos descriptivos en el cliente, NO se      │
│      suman a las estadísticas en reposo para evitar falsos positivos.   │
│    • Utilitarios (m5 postquemador, m8 recarga bengalas):                │
│      Afectan consumo dinámico y temporizadores en simulación táctica.   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Tabla `planes` (Hangar de Pilotos)

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | INTEGER | ID único del registro |
| `user_id` | INTEGER | FK → users.user_id |
| `avion_id` | TEXT | FK → plane_models.id |
| `nivel` | INTEGER | Nivel del avión (1-20) |
| `especial_nombre` | TEXT | Nombre de la habilidad especial |
| `especial_nivel_num` | INTEGER | Nivel de la especial (1-3) |
| `especial_efecto` | TEXT | Efecto de la especial |
| `pasiva_nombre` | TEXT | Nombre de la habilidad pasiva |
| `pasiva_nivel_num` | INTEGER | Nivel de la pasiva (1-5) |
| `pasiva_efecto` | TEXT | Efecto de la pasiva |
| `mod1_id` | TEXT | FK → plane_mods.id (Slot 1) |
| `mod1_lvl` | INTEGER | Nivel del mod 1 (1-5) |
| `mod2_id` | TEXT | FK → plane_mods.id (Slot 2) |
| `mod2_lvl` | INTEGER | Nivel del mod 2 (1-5) |
| `nivel_fuselaje` | INTEGER | Nivel del sistema Fuselaje (0-8) |
| `nivel_motor` | INTEGER | Nivel del sistema Motor (0-8) |
| `nivel_avionica` | INTEGER | Nivel del sistema Aviónica (0-8) |
| `nivel_armas` | INTEGER | Nivel del sistema Armas (0-8) |
| `recursos_piezas` | INTEGER | Piezas disponibles |
| `recursos_avanzadas` | INTEGER | Componentes avanzados |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Fecha de actualización |

#### Tabla `plane_upgrades` (Historial de Mejoras)

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | INTEGER | ID único del registro |
| `plane_id` | INTEGER | FK → planes.id |
| `sistema` | TEXT | Sistema mejorado |
| `nivel_anterior` | INTEGER | Nivel anterior |
| `nivel_nuevo` | INTEGER | Nivel nuevo |
| `recursos_usados` | INTEGER | Recursos usados |
| `created_at` | TIMESTAMP | Fecha de la mejora |

### Constraints

| Constraint | Tipo | Columnas |
|------------|------|----------|
| `planes_pkey` | PRIMARY KEY | `id` |
| `planes_user_avion_unique` | UNIQUE | `user_id, avion_id` |
| `planes_avion_id_fkey` | FOREIGN KEY | `avion_id` → `plane_models.id` |
| `planes_mod1_id_fkey` | FOREIGN KEY | `mod1_id` → `plane_mods.id` |
| `planes_mod2_id_fkey` | FOREIGN KEY | `mod2_id` → `plane_mods.id` |
| `planes_user_id_fkey` | FOREIGN KEY | `user_id` → `users.user_id` |
| `especial_nivel_num_check` | CHECK | `especial_nivel_num` (1-3) |
| `pasiva_nivel_num_check` | CHECK | `pasiva_nivel_num` (1-5) |

### Sistema de Upgrades 2.0

**Niveles:** 0-8 por sistema (Fuselaje, Motor, Aviónica, Armas)  
**Desbloqueo:** Nivel de Aeronave 6+  
**Costos oficiales (UPGRADE_COSTS):**

| Nivel Objetivo | Piezas Requeridas | Componentes Avanzados |
|:---:|:---:|:---:|
| 1 | 100 | 0 |
| 2 | 250 | 0 |
| 3 | 500 | 10 |
| 4 | 800 | 25 |
| 5 | 1,200 | 50 |
| 6 | 1,800 | 100 |
| 7 | 2,500 | 200 |
| 8 | 3,500 | 350 |

### Flujo Completo del Sistema de Aviones

```text
┌─────────────────────────────────────────────────────────────────────────┐
│              FLUJO COMPLETO DEL SISTEMA DE AVIONES                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 1: Carrusel Circular Infinito                                      │
│ Endpoint: GET /api/planes                                               │
│ ✅ Tarjeta central prominente (escala 1.0)                               │
│ ✅ Tarjetas laterales difuminadas (escala 0.85)                          │
│ ✅ Navegación: flechas ◀ ▶, swipe, teclado                              │
│ ✅ Contador: "3 de 23"                                                  │
│ ✅ Indicadores: puntos en la parte inferior                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 2: Click en Tarjeta Central                                        │
│ Endpoint: GET /api/planes/:id/stats                                     │
│ ✅ Abre el modal de datos profundos                                     │
│ ✅ Muestra el NOMBRE del avión (no el ID)                               │
│ ✅ Muestra el ID como badge (🏷️ 502)                                    │
│ ✅ Muestra las estadísticas                                             │
│ ✅ Muestra las habilidades                                              │
│ ✅ Muestra los sistemas Upgrades 2.0                                    │
│ ✅ Muestra los mods                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 3: IA de Recomendación (Tarea 7)                                   │
│ Endpoint: GET /api/planes/:id/recommendation?playstyle=agresivo         │
│ ✅ 3 estilos: Agresivo, Defensivo, Apoyo                                │
│ ✅ Recomendación de sistemas (Fuselaje, Motor, Aviónica, Armas)         │
│ ✅ Recomendación de mods                                                │
│ ✅ Cálculo del costo total                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 4: Upgrade Planner (Tarea 8)                                       │
│ Endpoint: GET /api/planes/:id/details                                   │
│ ✅ 4 sliders (Fuselaje, Motor, Aviónica, Armas)                         │
│ ✅ Cálculo de costos (piezas + avanzadas)                               │
│ ✅ Vista previa de stats (velocidad, agilidad, blindaje, potencia)      │
│ ✅ Comparación de builds (actual vs planificada)                        │
│ ✅ Guardar build (opcional)                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Fixes Aplicados (2026-09-10 / 2026-09-15)

| # | Fix | Archivo | Estado |
|---|-----|---------|--------|
| 1 | Funciones que leen nombre pero no nivel | `planes.controller.js` | ✅ RESUELTO |
| 2 | Auditoría (UUID) | `audit.js` | ✅ RESUELTO |
| 3 | Columna `actor_id` en `audit_logs` | `audit.js` | ✅ RESUELTO |
| 4 | IA de recomendación | `planes.controller.js` | ✅ IMPLEMENTADO |
| 5 | Upgrade Planner | `aircraft-stats-modal.html` | ✅ IMPLEMENTADO |
| 6 | Efectos de Mods (10 mods x 5 niveles) | `modEffects.js`, `planes.controller.js` | ✅ IMPLEMENTADO |
| 7 | Validación de sistemas disponibles (42 aviones) | `plane_models`, `planes.controller.js` | ✅ IMPLEMENTADO |
| 8 | Mensaje enriquecido al bloquear usuarios inactivos | `src/middlewares/auth.js` | ✅ RESUELTO (2026-09-15) |

### Validación de Sistemas en `updatePlaneSystem`

Mecanismo de control operativo incorporado en `src/controllers/planes.controller.js` para evitar la calibración de subsistemas o armamento no disponible en el diseño de fábrica del avión:

1. **Mapeo de Subsistemas:** El subsistema solicitado en el endpoint `PUT /api/planes/:id/system` se traduce a la columna de armamento o estructura en `plane_models.sistemas_disponibles`:
   - `fuselaje` $\to$ `fuselaje`
   - `motor` $\to$ `motor`
   - `avionica` $\to$ `avionica`
   - `armas` $\to$ `canones`
2. **Validación de Disponibilidad:** Se consulta `plane_models` mediante `avion_id`. Si el valor es `null`, `false` o no definido, se rechaza la solicitud con código HTTP **400** (`SYSTEM_NOT_AVAILABLE`).
3. **Respuesta de Error Estructurada:**
   ```json
   {
     "success": false,
     "message": "Esta aeronave (F-111 Aardvark) no tiene el sistema ARMAS disponible",
     "error": "SYSTEM_NOT_AVAILABLE",
     "details": {
       "sistema_solicitado": "armas",
       "sistema_key": "canones",
       "avion_id": "401",
       "avion_name": "F-111 Aardvark",
       "sistemas_disponibles": ["fuselaje", "motor", "avionica", "misiles_radar", "misiles_largo"]
     }
   }
   ```
4. **Validación en Producción:** Verificado en Fly.io con log táctico `✅ [Upgrade] Sistema armas disponible para F/A-18 Hornet` y retorno exitoso en mejoras válidas (`PUT /api/planes/4/system` $\to$ `success: true`).

---

## 🗄️ 1.5. Estructura Completa de Tablas Adicionales de Supabase

Auditoría y relevamiento técnico del esquema de base de datos en Supabase (ejecutado el 2026-09-11). Se identifican y formalizan cuatro (4) tablas operativas existentes que complementan el núcleo del C4ISR táctico, la gestión institucional, la seguridad operativa y la personalización de interfaz:

---

### 📋 Tabla `error_logs`

**Propósito:** Registro centralizado de errores del sistema para diagnóstico y auditoría post-mortem en tiempo de ejecución.

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | BIGINT | PK auto-incremental (`nextval('error_logs_id_seq')`) |
| `level` | TEXT | Nivel de severidad (default `'error'`) |
| `message` | TEXT | Detalle o mensaje de error capturado (NOT NULL) |
| `stack` | TEXT | Traza de ejecución / stack trace técnico |
| `route` | TEXT | Ruta/endpoint donde ocurrió la incidencia táctica |
| `user_id` | TEXT | Identificador del usuario (texto, no UUID) |
| `nick` | TEXT | Indicativo del combatiente afectado |
| `meta` | JSONB | Contexto de cabeceras, payload o IP |
| `created_at` | TIMESTAMPTZ | Marca temporal del incidente (default `now()`) |

**Índices:**
- `error_logs_pkey` (`id`)
- `idx_error_logs_created_at` (`created_at DESC`)
- `idx_error_logs_level` (`level`)
- `idx_error_logs_route` (`route`)

**Relaciones FK:**
- Sin claves foráneas directas (módulo desacoplado para asegurar captura de fallos sin bloqueos de integridad referencial).

**Notas operativas:**
- Permite la supervisión continua del estado de salud del servidor y trazabilidad forense tras fallos en peticiones API o excepciones no controladas.
- Los índices compuestos y ordenados por `created_at DESC` facilitan el filtrado en tiempo real desde consolas de administración militar.

---

### 📋 Tabla `normativas`

**Propósito:** Repositorio de reglamentos, circulares y protocolos oficiales de la comandancia del escuadrón.

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | INTEGER | PK auto-incremental (`nextval('normativas_id_seq')`) |
| `titulo` | TEXT | Título oficial del documento |
| `codigo` | TEXT | Código táctico único (ej: `CIRC-001`, `REG-001`, UNIQUE) |
| `tipo_documento` | TEXT | Tipo documental (`Reglamento`, `Protocolo`, `Circular`) |
| `categoria` | TEXT | Categoría de operación o disciplina |
| `version` | TEXT | Versión del documento |
| `version_anterior_id` | INTEGER | FK referencial a versión previa |
| `es_version_vigente` | BOOLEAN | Indicador de vigencia actual |
| `fecha_aprobacion` | DATE / TEXT | Fecha formal de homologación |
| `fecha_entrada_vigor` | DATE / TEXT | Entrada en vigor reglamentaria |
| `fecha_vencimiento` | DATE / TEXT | Fecha de vencimiento del documento |
| `archivo_nombre` | TEXT | Nombre original del archivo adjunto |
| `archivo_extension` | TEXT | Extensión del archivo |
| `archivo_tamano` | INTEGER | Tamaño del archivo en bytes |
| `archivo_url` | TEXT | URL o ruta del archivo PDF adjunto |
| `archivo_hash` | TEXT | Hash de integridad del archivo |
| `emitido_por` | TEXT | Autoridad emisora |
| `aprobado_por` | TEXT | Autoridad aprobadora |
| `ambito_aplicacion` | TEXT | Alcance del reglamento |
| `resumen` | TEXT | Resumen ejecutivo del reglamento |
| `palabras_clave` | JSONB | Palabras clave de búsqueda |
| `referencias_legales` | JSONB | Referencias a otras normativas |
| `observaciones` | TEXT | Observaciones adicionales |
| `requiere_firma_digital` | BOOLEAN | Indicador de firma digital requerida |
| `nivel_confidencialidad` | TEXT | Clasificación táctica (`PUBLICO`, `RESTRINGIDO`, `SECRETO`) |
| `created_at` | TIMESTAMPTZ | Fecha de publicación en plataforma |
| `updated_at` | TIMESTAMPTZ | Última actualización del documento |
| `created_by` | UUID / TEXT | Identificador del creador |

**Índices:**
- `normativas_pkey` (`id`)
- `normativas_codigo_key` (`codigo`, UNIQUE)
- `idx_normativas_codigo` (`codigo`)

**Relaciones FK:**
- Sin dependencia foránea estricta; vinculación documental por código referencial de doctrina.

**Notas operativas:**
- Sirve como repositorio legal y normativo consultado por el componente `normativas-view` y administrado vía `normativas.controller.js`.
- La unicidad en `codigo` impide colisiones en la nomenclatura militar de circulares y órdenes de escuadrón.

---

### 📋 Tabla `password_resets`

**Propósito:** Almacenamiento de tokens criptográficos de un solo uso para el restablecimiento de contraseñas vía correo electrónico (vigencia estricta de 15 minutos).

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | UUID | PK auto-generada (`gen_random_uuid()`) |
| `user_id` | UUID | FK a `users.id` (`ON DELETE CASCADE`) |
| `token` | TEXT | Token único criptográfico (`crypto.randomBytes(32)`) |
| `expires_at` | TIMESTAMPTZ | Fecha/hora de expiración (15 min desde creación) |
| `used` | BOOLEAN | Indicador de consumo del token (default `false`) |
| `created_at` | TIMESTAMPTZ | Fecha de generación (default `now()`) |

**Índices:**
- `idx_password_resets_token` (`token`)
- `idx_password_resets_user_id` (`user_id`)
- `idx_password_resets_expires_at` (`expires_at`)
- `idx_password_resets_used` (`used`)

**Relaciones FK:**
- `user_id` → `users.id` (UUID, `ON DELETE CASCADE`)

**Seguridad RLS:**
- Política `no_public_access`: solo `service_role` puede leer/escribir.
- Bloquea cualquier acceso anónimo o autenticado estándar.

**Notas operativas:**
- Creada el 2026-09-15 para reparar el flujo de "¿Olvidaste tu clave?".
- Usada por `forgotPassword()` y `resetPassword()` en `src/controllers/auth.controller.js`.

---

### 📋 Tabla `upgrade_nodes_v2`

**Propósito:** Catálogo maestro del árbol de nodos de mejoras **Starform Upgrades 2.0**. Almacena las configuraciones de nodos técnicos que definen la progresión de Fuselaje, Motor, Aviónica y Armas (niveles 0 a 8).

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | INTEGER | PK auto-incremental (`nextval('upgrade_nodes_v2_id_seq'::regclass)`) |
| `avion_id` | TEXT | FK referencial a `plane_models.id` |
| `sistema_web` | TEXT | Sistema base (fuselaje, motor, avionica, armas) |
| `sistema_categoria` | TEXT | Categoría específica (canones, misiles_ir, etc.) |
| `nivel` | INTEGER | Nivel del nodo (0-8) |
| `ruta` | TEXT | Ruta A/B (niveles 5-8) o null |
| `node_name` | TEXT | Nombre táctico del nodo |
| `requirement_level` | INTEGER | Nivel de aeronave requerido |
| `effects` | JSONB | Efectos cuantitativos del nodo |
| `stats_afectadas` | JSONB | Stats impactadas (velocidad, agilidad, etc.) |
| `cost_piezas` | INTEGER | Costo en piezas estándar |
| `cost_avanzadas` | INTEGER | Costo en componentes avanzados |
| `created_at` | TIMESTAMP | Fecha de inserción (sin timezone, default `now()`) |

**Índices:**
- `upgrade_nodes_v2_pkey` (`id`, UNIQUE)

**Uso en código:**
- `src/utils/upgradeNodes.js` (consulta con caché TTL 5 min + fallback)
- `src/controllers/planes.controller.js` (cálculo de Upgrades 2.0)

**Notas operativas:**
- Consultada con caché en memoria (TTL 5 min) para evitar sobrecarga.
- Fallback automático si Supabase falla.
- 3072 filas en base de datos.

---

### 📋 Tabla `recovery_codes`

**Propósito:** Códigos de recuperación de cuenta y resguardo de identidad (alternativa al restablecimiento convencional por correo electrónico).

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | UUID | PK con `gen_random_uuid()` |
| `user_id` | UUID | FK a `users.id` |
| `code_hash` | TEXT | Hash criptográfico seguro del código de emergencia |
| `created_at` | TIMESTAMPTZ | Fecha de generación del código (default `now()`) |
| `expires_at` | TIMESTAMPTZ | Fecha/hora límite de expiración táctica del código |
| `used_at` | TIMESTAMPTZ | Fecha/hora de consumo (`NULL` si no ha sido utilizado) |
| `created_by` | UUID | Identificador del oficial que generó el código (nullable) |
| `note` | TEXT | Nota o comentario del oficial (nullable) |

**Índices:**
- `recovery_codes_pkey` (`id`)
- `idx_recovery_codes_user_id` (`user_id`)
- `idx_recovery_codes_expires_at` (`expires_at`)
- `idx_recovery_codes_used_at` (`used_at`)

**Relaciones FK:**
- `user_id` → `users.id` (UUID).

**Notas operativas:**
- Provee un canal de contingencia militar cuando los pilotos pierden acceso a sus correos o credenciales primarias.
- El índice `idx_recovery_codes_used_at` permite invalidar instantáneamente códigos consumidos evitando ataques de repetición (anti-replay).

---

### 📋 Tabla `user_settings`

**Propósito:** Preferencias tácticas individuales de combatientes (tema visual militar, idioma y canales de alerta operativa).

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | UUID | PK con `gen_random_uuid()` |
| `user_id` | UUID | FK a `users.id` (UNIQUE) |
| `theme` | TEXT | Perfil visual táctico (default `'militar'`) |
| `language` | TEXT | Lenguaje de interfaz (default `'es'`) |
| `notif_email` | BOOLEAN | Alertas por correo institucional (default `false`) |
| `notif_whatsapp` | BOOLEAN | Alertas directas vía canal WhatsApp (default `false`) |
| `notif_status` | BOOLEAN | Notificaciones de cambio de estado operativo (default `true`) |
| `notif_reminder` | BOOLEAN | Recordatorios de torneos y misiones (default `true`) |
| `notif_announcements` | BOOLEAN | Anuncios oficiales de comandancia (default `true`) |
| `created_at` | TIMESTAMPTZ | Fecha de creación del registro (default `now()`) |
| `updated_at` | TIMESTAMPTZ | Última sincronización de preferencias (default `now()`) |

**Índices:**
- `user_settings_pkey` (`id`)
- `user_settings_user_id_idx` (`user_id`, UNIQUE)

**Relaciones FK:**
- `user_id` → `users.id` (UUID).

**Notas operativas:**
- Utilizada en producción por `src/controllers/settings.controller.js` con soporte para creación/actualización mediante `upsert`.
- Garantiza que cada piloto mantenga sus configuraciones operativas sincronizadas en todos los dispositivos de despliegue.
---

### ⚠️ Regla crítica de FKs (UUID vs INTEGER)

- **Tablas Black Market** (`bm_events`, `bm_missions`, `bm_progress`, `bm_discounts`), `recovery_codes`, `security_events` y `password_resets` usan `user_id → users.id` (UUID).
- **Excepción:** `planes.user_id → users.user_id` (INTEGER). Es la única tabla que usa el user_id entero.
- Al escribir consultas SQL o código backend, respetar esta distinción para evitar errores de cast.

---

### 🗺️ Diagrama de Relaciones de Tablas Adicionales

```text
┌─────────────────────────────────────────────────────────────────────────┐
│              INTEGRACIÓN DE TABLAS ADICIONALES DE SUPABASE              │
└─────────────────────────────────────────────────────────────────────────┘

                     ┌───────────────────────────┐
                     │           users           │
                     │───────────────────────────│
                     │ PK id (UUID)              │◄──────────┐
                     │ UQ user_id (INTEGER)      │◄─┐        │
                     │    email                  │  │        │
                     │    nick                   │  │        │
                     │    role                   │  │        │
                     └─────────────┬─────────────┘  │        │
                                   │ 1:1            │ 1:N    │ 1:N
                                   ▼                │        │
                     ┌───────────────────────────┐  │        │
                     │       user_settings       │  │        │
                     │───────────────────────────│  │        │
                     │ PK id (UUID)              │  │        │
                     │ FK user_id (UUID, UQ) ────┼──┘        │
                     │    theme, language        │ (UUID)    │
                     │    notif_* (BOOLEAN)      │           │
                     └───────────────────────────┘           │
                                                             │
                     ┌───────────────────────────┐           │
                     │      recovery_codes       │           │
                     │───────────────────────────│           │
                     │ PK id (UUID)              │           │
                     │ FK user_id (UUID) ────────┼───────────┤
                     │    code_hash (TEXT)       │           │
                     │    expires_at, used_at    │           │
                     │    created_by (UUID)      │           │
                     │    note (TEXT)            │           │
                     └───────────────────────────┘           │
                                                             │
                     ┌───────────────────────────┐           │
                     │      password_resets      │           │
                     │───────────────────────────│           │
                     │ PK id (UUID)              │           │
                     │ FK user_id (UUID) ────────┼───────────┘
                     │    token (TEXT UNIQUE)    │ (UUID)
                     │    expires_at, used       │
                     └───────────────────────────┘

  ┌────────────────────────────────┐       ┌────────────────────────────────┐
  │           error_logs           │       │           normativas           │
  │────────────────────────────────│       │────────────────────────────────│
  │ PK id (BIGINT)                 │       │ PK id (INTEGER)                │
  │    level (TEXT)                │       │ UQ codigo (TEXT)               │
  │    route (TEXT)                │       │    titulo                      │
  │    created_at (TIMESTAMPTZ)    │       │    categoria                   │
  │    (Auditoría Desacoplada)     │       │    (Doctrina Institucional)    │
  └────────────────────────────────┘       └────────────────────────────────┘

  ┌────────────────────────────────┐
  │        upgrade_nodes_v2        │
  │────────────────────────────────│
  │ PK id (INTEGER)                │
  │    avion_id (TEXT)             │
  │    sistema_web, nivel, ruta    │
  │    effects, stats_afectadas    │
  │    (3.072 filas)               │
  └────────────────────────────────┘
```

---

### 📊 Resumen Consolidado de Tablas del Sistema (Verificado 2026-09-18)

| Tabla | Categoría | Registros | Estado |
|-------|-----------|-----------|--------|
| `users` | Core | **61** (28 activos, 33 inactivos) | ✅ Documentada |
| `planes` | Hangar | 122 | ✅ Documentada |
| `plane_models` | Hangar | 44 | ✅ Documentada |
| `plane_mods` | Hangar | 10 | ✅ Documentada |
| `mod_effects` | Hangar | 50 | ✅ Documentada |
| `upgrade_effects` | Hangar | 44 | ✅ Documentada |
| `upgrade_nodes_v2` | Hangar | 3072 | ✅ Documentada |
| **`events_master`** | **Eventos (Nuevo)** | **36** | ✅ **Documentada (F2)** |
| **`event_participations`** | **Eventos (Nuevo)** | **639** | ✅ **Documentada (F2)** |
| `events` | Eventos (Legacy) | 35 | ✅ Preservada |
| `performances` | Core (Legacy) | **639** | ✅ Preservada |
| `security_events` | Auditoría | 214 | ✅ Documentada |
| `audit_logs` | Auditoría | 6 | ✅ Documentada |
| `error_logs` | Diagnóstico | 3 | ✅ Documentada |
| `normativas` | Institucional | 1 | ✅ Documentada |
| `password_resets` | Seguridad | 0 | ✅ Documentada |
| `plane_upgrades` | Hangar | 0 | ✅ Documentada |
| `recovery_codes` | Seguridad | 0 | ✅ Documentada |
| `user_settings` | Configuración | 0 | ✅ Documentada |

#### 🗑️ Tablas Legacy — DROP Planificado

Las siguientes tablas son **legacy** del módulo Black Market pre-rediseño (F4.x).
Están **vacías (0 filas)** y su DROP está planificado para **post-2026-09-26**
(7 días de gracia post-deploy F4.4 v4.3.0), según ADR-006.

| Tabla | Origen | Filas | Estado |
|---|---|---|---|
| `bm_events` | Black Market legacy | 0 | 🗑️ DROP pendiente |
| `bm_missions` | Black Market legacy | 0 | 🗑️ DROP pendiente |
| `bm_progress` | Black Market legacy | 0 | 🗑️ DROP pendiente |
| `bm_discounts` | Black Market legacy | 0 | 🗑️ DROP pendiente |

> **Script de DROP:** `sql/032_drop_bm_legacy_tables.sql`
> **Referencia:** ADR-006, fases F4.2.2-A a F4.2.2-G
> **Rollback:** No aplica — las tablas pueden recrearse desde `sql/019-022_*.sql` (aunque su contenido está vacío).

| `upgrade_effects_history` | Auditoría | 0 | ✅ Documentada |
| **`backups`** | **Auditoría** | **0** | ✅ **Documentada (F4)** |

**Notas operativas (post-F3):**
- **`events_master` (36 filas):** 35 migrados de `events` + 1 auto-creado por el scheduler (SEM 38, `auto_created: true`).
- **`event_participations` (639 filas):** Migradas de `performances`. 482 VALIDATED, 52 PENDING, 105 REJECTED. Total: 98,750 tokens.
- **`events` (35 filas) y `performances` (639 filas):** Preservadas intactas para rollback. No se tocan.
- **`backups`:** Tabla nueva de Fase 4 (HALL-036/037). Persistencia de backups del OWNER con sanitización de PII.
- **Tablas del Black Market:** Siguen vacías (el módulo será rediseñado en F3 del rediseño).

---

## 🗓️ 1.6. Scheduler de Eventos SQ (F2.8 - F2.9)

A partir de la Fase 2 del rediseño, el sistema cuenta con un **scheduler automático** que garantiza la existencia de eventos SQ según el calendario oficial (jueves 00:00 UTC).

### Componente: `src/utils/eventScheduler.js`

**Características:**
- Cron job cada 1 hora (`0 * * * *`).
- Advisory Lock multi-réplica (vía RPC `acquire_scheduler_lock`).
- Idempotencia por `legacy_event_id` (no duplica eventos).
- Sin backfill (decisión F2.9: no inventar datos históricos).

### Funciones RPC (`sql/030_scheduler_locks.sql`)

| Función | Retorno | Propósito |
|---|---|---|
| `acquire_scheduler_lock()` | BOOLEAN | Adquiere advisory lock (ID 12345) |
| `release_scheduler_lock()` | BOOLEAN | Libera advisory lock |

### Evidencia en Producción (2026-09-17)

El scheduler creó automáticamente el evento **SEM 38** el jueves 2026-09-17 a las 09:00 UTC:
- `type`: `SQUADRON`
- `status`: `OPEN`
- `metadata.auto_created`: `true`
- `metadata.source`: `SCHEDULER`
- `legacy_event_id`: `2026-09 · SEM 38 - SQ`

**El switch funcional funcionó:** al crear SEM 38, cerró automáticamente SEM 35 (`closed_reason: NORMAL`).

### Documentación Relacionada

- `MIGRACION_SQL_REFERENCE.md` — Secciones F2.8 y F2.9.
- `sql/030_scheduler_locks.sql` — DDL de advisory locks.
- `sql/031_verify_events_system.sql` — Script de verificación idempotente.

---

## 🔄 2. Flujo Completo de Registro y Cambio de Contraseña

```text
┌─────────────────────────────────────────────────────────────────────────┐
│              FLUJO DE REGISTRO Y CAMBIO DE CONTRASEÑA                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 1: ADMIN crea un nuevo usuario                                    │
│                                                                         │
│   Endpoint: POST /api/admin/members                                     │
│   Datos: { email, nick, role }                                         │
│                                                                         │
│   ✅ user_id: INTEGER (auto-incremental)                               │
│   ✅ password_hash: bcrypt(MS-XXXX-XXXX)                               │
│   ✅ must_change_password: true                                        │
│   ✅ token_version: 1                                                  │
│                                                                         │
│   Respuesta: { temporaryPassword: "MS-XXXX-XXXX" }                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 2: Usuario recibe contraseña temporal                             │
│                                                                         │
│   "MS-MJWT-SU3U" (ejemplo real)                                        │
│                                                                         │
│   📝 El ADMIN debe entregar la contraseña por canal seguro              │
│      (WhatsApp, Discord, etc.)                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 3: Usuario hace login con contraseña temporal                     │
│                                                                         │
│   Endpoint: POST /api/auth/login                                        │
│   Datos: { email, password: "MS-XXXX-XXXX" }                          │
│                                                                         │
│   ✅ Busca por email O email_institucional                             │
│   ✅ Verifica bcrypt(password_hash)                                    │
│   ✅ Responde con token JWT y must_change_password: true              │
│                                                                         │
│   Respuesta: { token, user: { must_change_password: true } }          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 4: Modal de cambio forzado aparece                                │
│                                                                         │
│   🔴 NOTA: El modal NO muestra botones visibles                        │
│   ✅ Pero funciona presionando ENTER en el campo de contraseña         │
│                                                                         │
│   ⚠️ Este es un bug de UI que no afecta la funcionalidad               │
│   💡 Fix pendiente: Agregar botón "Actualizar Credencial"              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 5: Usuario cambia contraseña (FORZADO)                            │
│                                                                         │
│   Endpoint: POST /api/auth/change-password                             │
│   Headers: Authorization: Bearer <TOKEN>                              │
│   Datos: { newPassword: "Dni32355353", isForced: true }               │
│                                                                         │
│   ✅ Busca usuario con LÓGICA TIPADA:                                   │
│      - Si id es UUID → eq('id', user.id)                              │
│      - Si user_id es INTEGER → eq('user_id', Number(user.user_id))   │
│      - Si email disponible → eq('email', user.email)                  │
│                                                                         │
│   ✅ Actualiza:                                                         │
│      - password_hash = bcrypt(newPassword)                            │
│      - must_change_password = false                                   │
│      - token_version = token_version + 1                              │
│      - updated_at = NOW()                                             │
│                                                                         │
│   ✅ Usa .select() después de .update() para confirmar                 │
│                                                                         │
│   Respuesta: { success: true, token_version: 2 }                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 6: Verificación en Supabase                                       │
│                                                                         │
│   SELECT must_change_password, token_version FROM users                │
│   WHERE email = 'testpilot@ffaa.py'                                   │
│                                                                         │
│   ✅ must_change_password: false                                       │
│   ✅ token_version: 2                                                  │
│   ✅ password_hash: Hash de "Dni32355353"                             │
│   ✅ updated_at: Fecha/hora actual                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PASO 7: Usuario login con nueva contraseña                             │
│                                                                         │
│   Endpoint: POST /api/auth/login                                        │
│   Datos: { email, password: "Dni32355353" }                           │
│                                                                         │
│   ✅ 200 OK con token                                                  │
│   ✅ must_change_password: false                                       │
│   ✅ token_version: 2                                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ 3. El Fix de Lógica Tipada en `changePassword()`

### Diagnóstico del Problema Original
En versiones anteriores, el controlador asumía que la clave primaria o el identificador en memoria era invariablemente un UUID. Al pasar un `user_id` de tipo entero o una estructura mixta procedente de sesiones tokenizadas, la consulta en Supabase fallaba con error de cast de tipo o no actualizaba ninguna fila:

```javascript
// ❌ IMPLEMENTACIÓN ANTERIOR: FORZABA UUID SIEMPRE
const { data: updateData, error: updateError } = await supabase
    .from('users')
    .update({ ... })
    .eq('id', user.id)  // ⚠️ FALLABA CUANDO user_id ERA INTEGER O NO COINCIDÍA FORMATO UUID
    .select(...);
```

### Solución Implementada (Lógica Tipada y Polimórfica)
Se implementó una evaluación jerárquica y validada por expresiones regulares que detecta si el identificador es UUID válido, número entero (`user_id`), o utiliza como salvaguarda el correo electrónico:

```javascript
// ✅ SOLUCIÓN ACTUAL: LÓGICA TIPADA POLIMÓRFICA
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

### Logs de Confirmación en Runtime
```text
🔍 [changePassword] Actualizando usuario con: {
  id: '3658df3a-3d15-4669-a595-dca33ec86fd3',
  user_id: 1000,
  newTokenVersion: 2,
  newHash: '$2b$10$as8vQDbgnRgh5...'
}
✅ [changePassword] Filas actualizadas con éxito: 1
```

---

## 📂 4. Archivos Modificados y Commits de Referencia

| Archivo | Cambio Realizado | Fecha |
|---|---|:---:|
| `src/controllers/auth.controller.js` | Lógica tipada en `changePassword()`, logs de depuración y select post-update | 2026-09-09 |
| `src/routes/admin.routes.js` | Consultas tipadas en endpoint de reseteo administrativo `reset-password` | 2026-09-09 |
| `src/controllers/admin.controller.js` | Consultas tipadas en `updateUserRole` y `updateUserStatus` | 2026-09-09 |
| `src/controllers/profile.controller.js` | Consultas tipadas polimórficas en `getProfile` y `updateProfile` | 2026-09-09 |
| `src/controllers/performances.controller.js` | Consultas tipadas en `savePerformance` y `getMyHistory` | 2026-09-09 |

### Commits Realizados
```bash
fc657f0 refactor: implement helper functions for typed queries
0e10c46 fix(auth): make password update identifier dynamic
```

---

## 📊 5. Estado Actual de Supabase (Prueba Real TestPilot)

Registro extraído de la tabla `users` confirmando el ciclo de vida completo:

```json
{
  "id": "3658df3a-3d15-4669-a595-dca33ec86fd3",
  "user_id": 1000,
  "email": "testpilot@ffaa.py",
  "nick": "TestPilot",
  "role": "MIEMBRO",
  "status": "ACTIVE",
  "must_change_password": false,
  "token_version": 2,
  "password_hash": "$2b$10$as8vQDbgnRgh5...",
  "created_at": "2026-09-09T19:24:35.51+00:00",
  "updated_at": "2026-09-09T23:54:52.571+00:00"
}
```

---

## 🧪 6. Matriz de Pruebas Realizadas

| # | Prueba Operativa | Método / Endpoint | Resultado Esperado | Resultado Real |
|:---:|---|---|---|:---:|
| 1 | Login con contraseña temporal | `POST /api/auth/login` | 200 OK, JWT emitido, `must_change_password: true` | ✅ PASS |
| 2 | Apertura de modal de cambio obligatorio | Frontend SPA | Despliegue de modal bloqueante | ✅ PASS |
| 3 | Envío de nueva contraseña reglamentaria | `POST /api/auth/change-password` | 200 OK, `token_version: 2`, `must_change_password: false` | ✅ PASS |
| 4 | Verificación de persistencia en Supabase | Consulta SQL `SELECT` | Hash actualizado, flag `false`, version `2` | ✅ PASS |
| 5 | Re-autenticación con nueva contraseña | `POST /api/auth/login` | 200 OK con nuevo JWT | ✅ PASS |
| 6 | Verificación de rechazo de clave temporal vieja | `POST /api/auth/login` | 401 Credenciales inválidas | ✅ PASS |
| 7 | Flujo integral desde cliente web | Navegador (Web SPA) | Acceso fluido a Dashboard tras cambio | ✅ PASS |

---

## ⚠️ 7. Incidencias Detectadas y Tareas Pendientes

### Bug de UI Detectado
- **Descripción:** En determinadas resoluciones o estados del modal de cambio forzado, los botones de acción inferior pueden no mostrarse visibles en el viewport.
- **Solución Alternativa (Workaround Actual):** La funcionalidad es 100% operativa presionando la tecla **`ENTER`** dentro de cualquiera de los campos de contraseña del formulario.
- **Fix Planificado:** Revisar los estilos en `components/change-password-modal.html` asegurando que el botón `btnChangePasswordSubmit` ("Actualizar Credencial") mantenga visibilidad sticky en dispositivos móviles y resoluciones compactas.

### 🗑️ F4.5 — DROP tablas BM legacy

- **Descripción:** Eliminar las 4 tablas legacy del Black Market (`bm_events`, `bm_missions`, `bm_progress`, `bm_discounts`), ahora que el módulo BM opera 100% sobre `events_master` + `event_participations`.
- **Script:** `sql/032_drop_bm_legacy_tables.sql`.
- **Fecha:** post-2026-09-26 (7 días de gracia post-deploy F4.4).
- **Estado:** ⏳ Pendiente.
- **Referencia:** ADR-006, F4.2.2-G.

---

## 🔒 8. Protocolo de Congelamiento y Salvaguarda

Para prevenir que futuras tareas de mantenimiento o despliegues automáticos alteren este estado:
1. `CURRENT_STATE.md` se mantendrá como el resumen ejecutivo inmutable.
2. Todo script de despliegue debe contemplar el hook:
   ```json
   {
     "scripts": {
       "predeploy": "cp CURRENT_STATE.md BACKUP_CURRENT_STATE_$(date +%Y%m%d).md"
     }
   }
   ```
3. Cualquier cambio estructural en `users` requerirá una migración SQL versionada en `/sql`.

---

## ✈️ Datos de la Wiki Cargados (2026-09-12)

### Fuente y Método
- **URL:** https://metalstorm.wiki.gg/wiki/Aircraft
- **Extracción:** Script de consola del navegador.
- **Importación:** Script Node.js con `service_role_key`.
- **Registros afectados:** 44 aviones del catálogo.

### Distribución de Datos

| Recurso | Cantidad | Notas |
|---------|----------|-------|
| Descripciones | 44 | 100% de los aviones |
| Historias | 41 | 3 sin trivia: KF-21, A-6, A-10 |
| Recomendaciones | 44 | Con Trait/Ability/Passive Tips |
| Loadouts | 44 | Con cañones y misiles detallados |
| Paints | 310+ | Promedio de 7 por avión |
| Canopies | 176 | 4 por avión (uniforme) |

### Modal Stats y Pantalla Dedicada — Estado de Secciones (v3.9.9)

| Sección | Fuente | Idioma | Estado |
|---------|--------|:---:|:---:|
| 📊 Estadísticas | stats_real + nodos + mods | ES | ✅ Validado |
| 🎯 Armamento Equipado | sistemas + loadout_wiki | ES | ✅ Validado |
| 🎯 Habilidad Especial | especial_nombre + especial_image_url | ES | ✅ Validado (Re-render fix v3.9.8) |
| 🛡️ Habilidad Pasiva | pasiva_nombre + pasiva_image_url | ES | ✅ Validado (Re-render fix v3.9.8) |
| 🔧 Sistemas Upgrades 2.0 | sistemas + enlaces a edición | ES | ✅ Validado |
| 🤖 Recomendación Táctica | Reglas locales | ES | ✅ Validado |
| 🔩 Mods | mod1_*, mod2_* | ES | ✅ Validado |
| 🎯 Traits | traits + traducción oficial (`TRAITS_ES`) | ES | ✅ Validado (13 traits) |
| 🎨 Paints | paints (Wiki) | EN / ES | ✅ Validado |
| 🪟 Canopies | canopies (Wiki) | EN / ES | ✅ Validado |
| 📜 Historia | `historia_es` (DeepL) / fallback `historia` | **ES** | ✅ Validado (Fallback EN) |
| 💡 Recomendaciones | `recomendaciones_es` (DeepL) / fallback | **ES** | ✅ Validado (Fallback EN) |
| 🔙 Header de Navegación | Botón sticky "← VOLVER AL HANGAR" | ES | ✅ Validado (Vista 2) |
| 📱 Grid de Cazas | `overrideCarouselCardClick` | ES | ✅ Validado (Vista 1) |
