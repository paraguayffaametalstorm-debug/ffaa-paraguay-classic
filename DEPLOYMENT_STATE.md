# 🚀 DEPLOYMENT STATE - PARAGUAY-FFAA | METALSTORM

> **⚠️ ESTADO CONGELADO - NO MODIFICAR SIN REVISIÓN MANUAL**  
> **Fecha de Congelamiento:** 2026-09-09  
> **Versión:** v3.7.0  
> **Entorno:** Producción (`Fly.io` región `gru` - São Paulo / Supabase PostgreSQL)  
> **Estado Operativo:** ✅ 100% OPERATIVO - AUDITADO Y PROBADO

---

## 📑 Resumen Ejecutivo del Despliegue

Este documento maestro consolida la arquitectura en ejecución, el esquema de base de datos validado, el flujo crítico de registro y cambio de contraseña con autenticación dual y el historial de correcciones de tipos (UUID vs INTEGER) aplicadas en la versión v3.7.0 del sistema **PARAGUAY-FFAA | METALSTORM**.

### Indicadores de Salud Operativa
- **Core de Autenticación:** ✅ Operativo (Login Dual, Google OAuth 2.0 y JWT criptográfico con `token_version`).
- **Registro de Pilotos por Mando:** ✅ Operativo con auto-asignación incremental de `user_id` entero y hash temporal `MS-XXXX-XXXX`.
- **Cambio de Contraseña Forzado:** ✅ Operativo con resolución tipada dinámica (`UUID`, `INTEGER` o `email`).
- **Inactivación de Sesiones Fantasma:** ✅ Operativa mediante incremento secuencial de `token_version`.
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

**Catálogo oficial:** 42 modelos de combate con configuración individual de armamento y subsistemas.

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
| `created_at` | TIMESTAMP | Fecha de inserción |
| `updated_at` | TIMESTAMP | Última actualización |

### Sistema de Mods - Efectos Numéricos (10 Mods × 5 Niveles)

| Mod ID | Nombre Oficial | Tipo | Stat Base Afectada | Tipo de Activación | Efecto por Nivel (N1 $\to$ N5) |
|:---:|---|---|:---:|:---:|---|
| **m1** | Giro Temerario (Daredevil Turning) | Agilidad | `agility` | ✅ Siempre activo | Giro: +4%, +8%, +12%, +16%, +20% |
| **m2** | Maniobrabilidad Ideal (Ideal Maneuvering) | Agilidad | `agility` | ✅ Siempre activo | Eficiencia viraje: +3%, +6%, +9%, +12%, +15% |
| **m3** | Resistencia a las Explosiones (Blast Resistance) | Defensa | `armor` | ✅ Siempre activo | Resistencia misiles: +5%, +10%, +15%, +20%, +25% |
| **m4** | Blindaje de Ataque / Racha (Streak Armor) | Defensa | `armor` | ⚠️ Condicional (kills) | +5%, +10%, +15%, +20%, +25% HP por derribo |
| **m5** | Quemadores Auxiliares Eficientes (Efficient Afterburners) | Motor | — | ❌ No altera stats visibles | Consumo postquemador: -8%, -16%, -24%, -32%, -40% |
| **m6** | Máxima Propulsión (Thrust Booster) | Motor | `speed` | ⚠️ Condicional (<50% comb.) | Vel: +3..+15% / Acel: +4..+20% bajo 50% combustible |
| **m7** | Bengalas Disruptivas (Disruptive Flares) | Señuelos | `ecm` | ✅ Siempre activo | Bloqueo enemigo / ECM: +5%, +10%, +15%, +20%, +25% |
| **m8** | Bengalas Más Rápidas (Faster Flares) | Señuelos | — | ❌ No altera stats visibles | Cooldown bengalas: -6%, -12%, -18%, -24%, -30% |
| **m9** | Armas Aniquiladoras (Finishing Guns) | Arma | `firepower` | ⚠️ Condicional (<30% HP enem.) | Daño: +5%, +10%, +15%, +20%, +25% contra enemigos <30% HP |
| **m10** | Guiado Mejorado (Improved Targeting) | Arma | `radar` | ✅ Siempre activo | Lock speed: +4..+20% / Lock angle: +3..+15% |

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

### Fixes Aplicados (2026-09-10 / 2026-09-11)

| # | Fix | Archivo | Estado |
|---|-----|---------|--------|
| 1 | Funciones que leen nombre pero no nivel | `planes.controller.js` | ✅ RESUELTO |
| 2 | Auditoría (UUID) | `audit.js` | ✅ RESUELTO |
| 3 | Columna `actor_id` en `audit_logs` | `audit.js` | ✅ RESUELTO |
| 4 | IA de recomendación | `planes.controller.js` | ✅ IMPLEMENTADO |
| 5 | Upgrade Planner | `aircraft-stats-modal.html` | ✅ IMPLEMENTADO |
| 6 | Efectos de Mods (10 mods x 5 niveles) | `modEffects.js`, `planes.controller.js` | ✅ IMPLEMENTADO |
| 7 | Validación de sistemas disponibles (42 aviones) | `plane_models`, `planes.controller.js` | ✅ IMPLEMENTADO |

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
| `id` | INTEGER | PK auto-incremental (`nextval('error_logs_id_seq')`) |
| `level` | TEXT | Nivel de severidad (`info`, `warn`, `error`, `fatal`) |
| `route` | TEXT | Ruta/endpoint donde ocurrió la incidencia táctica |
| `created_at` | TIMESTAMPTZ | Marca temporal del incidente (`default now()`) |
| `message` | TEXT | Detalle o mensaje de error capturado *(no verificado)* |
| `stack` | TEXT | Traza de ejecución / stack trace técnico *(no verificado)* |
| `metadata` | JSONB | Contexto de cabeceras, payload o IP *(no verificado)* |

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
| `codigo` | TEXT | Código táctico único de la normativa (ej: `CIRC-001`, `REG-001`, `UNIQUE`) |
| `titulo` | TEXT | Título oficial del documento *(no verificado / probable)* |
| `tipo_documento` | TEXT | Tipo documental (`Reglamento`, `Protocolo`, `Circular`) *(no verificado)* |
| `categoria` | TEXT | Categoría de operación o disciplina (`Operativa`, `Evaluación`, etc.) *(no verificado)* |
| `ambito_aplicacion` | TEXT | Alcance del reglamento (ej: `Escuadrón General`, `Todos los Pilotos`) *(no verificado)* |
| `fecha_aprobacion` | DATE / TEXT | Fecha formal de homologación por comandancia *(no verificado)* |
| `fecha_entrada_vigor` | DATE / TEXT | Entrada en vigor reglamentaria *(no verificado)* |
| `resumen` | TEXT | Resumen ejecutivo del reglamento *(no verificado)* |
| `nivel_confidencialidad` | TEXT | Clasificación táctica (`PUBLICO`, `RESTRINGIDO`, `SECRETO`) *(no verificado)* |
| `archivo_url` | TEXT | URL o ruta de almacenamiento del archivo PDF adjunto *(no verificado)* |
| `created_at` | TIMESTAMPTZ | Fecha de publicación en plataforma *(no verificado)* |

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

### 📋 Tabla `recovery_codes`

**Propósito:** Códigos de recuperación de cuenta y resguardo de identidad (alternativa al restablecimiento convencional por correo electrónico).

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | INTEGER | PK auto-incremental (`nextval('recovery_codes_id_seq')`) |
| `user_id` | INTEGER | FK al combatiente (`users.user_id`) |
| `expires_at` | TIMESTAMPTZ | Fecha/hora límite de expiración táctica del código |
| `used_at` | TIMESTAMPTZ | Fecha/hora de consumo (`NULL` si no ha sido utilizado) |
| `code_hash` | TEXT | Hash criptográfico seguro del código de emergencia *(no verificado / probable)* |
| `created_at` | TIMESTAMPTZ | Fecha de generación del código *(no verificado / probable)* |

**Índices:**
- `recovery_codes_pkey` (`id`)
- `idx_recovery_codes_user_id` (`user_id`)
- `idx_recovery_codes_expires_at` (`expires_at`)
- `idx_recovery_codes_used_at` (`used_at`)

**Relaciones FK:**
- `user_id` → `users.user_id` (`INTEGER` referencial).

**Notas operativas:**
- Provee un canal de contingencia militar cuando los pilotos pierden acceso a sus correos o credenciales primarias.
- El índice `idx_recovery_codes_used_at` permite invalidar instantáneamente códigos consumidos evitando ataques de repetición (anti-replay).

---

### 📋 Tabla `user_settings`

**Propósito:** Preferencias tácticas individuales de combatientes (tema visual militar, idioma y canales de alerta operativa).

| Columna | Tipo | Propósito |
|---------|------|-----------|
| `id` | INTEGER | PK auto-incremental (`nextval('user_settings_id_seq')`) |
| `user_id` | INTEGER | FK al piloto (`users.user_id`, `UNIQUE`) |
| `theme` | TEXT | Perfil visual táctico (`'militar'`, `'ops'`, `'clasico'`) *(no verificado / probable)* |
| `language` | TEXT | Lenguaje de interfaz (`'es'`, `'en'`, `'pt'`) *(no verificado / probable)* |
| `notif_email` | BOOLEAN | Alertas por correo institucional *(no verificado / probable)* |
| `notif_whatsapp` | BOOLEAN | Alertas directas vía canal WhatsApp *(no verificado / probable)* |
| `notif_status` | BOOLEAN | Notificaciones de cambio de estado operativo *(no verificado / probable)* |
| `notif_reminder` | BOOLEAN | Recordatorios de torneos y misiones *(no verificado / probable)* |
| `notif_announcements` | BOOLEAN | Anuncios oficiales de comandancia *(no verificado / probable)* |
| `created_at` | TIMESTAMPTZ | Fecha de creación del registro *(no verificado)* |
| `updated_at` | TIMESTAMPTZ | Última sincronización de preferencias *(no verificado)* |

**Índices:**
- `user_settings_pkey` (`id`)
- `user_settings_user_id_idx` (`user_id`, UNIQUE)

**Relaciones FK:**
- `user_id` → `users.user_id` (`INTEGER`, relación 1:1 estricta garantizada por el índice único).

**Notas operativas:**
- Utilizada en producción por `src/controllers/settings.controller.js` con soporte para creación/actualización mediante `upsert`.
- Garantiza que cada piloto mantenga sus configuraciones operativas sincronizadas en todos los dispositivos de despliegue.

---

### 🗺️ Diagrama de Relaciones de Tablas Adicionales

```text
┌─────────────────────────────────────────────────────────────────────────┐
│              INTEGRACIÓN DE TABLAS ADICIONALES DE SUPABASE              │
└─────────────────────────────────────────────────────────────────────────┘

                     ┌───────────────────────────┐
                     │           users           │
                     │───────────────────────────│
                     │ PK id (UUID)              │
                     │ UQ user_id (INTEGER)      │◄──────────┐
                     │    email                  │           │
                     │    nick                   │           │
                     │    role                   │           │
                     └─────────────┬─────────────┘           │
                                   │ 1:1                     │ 1:N
                                   ▼                         │
                     ┌───────────────────────────┐           │
                     │       user_settings       │           │
                     │───────────────────────────│           │
                     │ PK id (INTEGER)           │           │
                     │ FK user_id (INTEGER, UQ) ─┼───────────┘ (FK users.user_id)
                     │    theme                  │
                     │    language               │
                     │    notif_* (BOOLEAN)      │
                     └───────────────────────────┘
                                   ▲
                                   │
                                   │ (Seguridad / Contingencia)
                                   │
                     ┌───────────────────────────┐
                     │      recovery_codes       │
                     │───────────────────────────│
                     │ PK id (INTEGER)           │
                     │ FK user_id (INTEGER) ─────┼───────────► (FK users.user_id)
                     │    expires_at (TIMESTAMPTZ)│
                     │    used_at (TIMESTAMPTZ)  │
                     └───────────────────────────┘

  ┌────────────────────────────────┐       ┌────────────────────────────────┐
  │           error_logs           │       │           normativas           │
  │────────────────────────────────│       │────────────────────────────────│
  │ PK id (INTEGER)                │       │ PK id (INTEGER)                │
  │    level (TEXT)                │       │ UQ codigo (TEXT)               │
  │    route (TEXT)                │       │    titulo                      │
  │    created_at (TIMESTAMPTZ)    │       │    categoria                   │
  │    (Auditoría Desacoplada)     │       │    (Doctrina Institucional)    │
  └────────────────────────────────┘       └────────────────────────────────┘
```

---

### 📊 Resumen Consolidado de Tablas del Sistema

| Tabla | Categoría | Registros Estimados | Estado |
|-------|-----------|---------------------|--------|
| users | Core | ~5 | ✅ Documentada |
| performances | Core | - | ✅ Documentada |
| plane_models | Hangar | 42 | ✅ Documentada |
| plane_mods | Hangar | 10 | ✅ Documentada |
| mod_effects | Hangar | 50 | ✅ Documentada |
| planes | Hangar | ~121 | ✅ Documentada |
| plane_upgrades | Hangar | - | ✅ Documentada |
| upgrade_effects | Hangar | ~20+ | ✅ Documentada |
| upgrade_effects_history | Auditoría | - | ✅ Documentada |
| events | Eventos | - | ✅ Documentada |
| bm_events | Black Market | - | ✅ Documentada |
| bm_missions | Black Market | - | ✅ Documentada |
| bm_progress | Black Market | - | ✅ Documentada |
| bm_discounts | Black Market | - | ✅ Documentada |
| security_events | Auditoría | - | ✅ Documentada |
| audit_logs | Auditoría | - | ✅ Documentada |
| password_resets | Seguridad | - | ✅ Documentada |
| error_logs | Diagnóstico | - | 🆕 NUEVA |
| normativas | Institucional | - | 🆕 NUEVA |
| recovery_codes | Seguridad | - | 🆕 NUEVA |
| user_settings | Configuración | - | 🆕 NUEVA |

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
