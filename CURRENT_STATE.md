# 📊 CURRENT STATE - PARAGUAY-FFAA | METALSTORM

> **⚠️ NO MODIFICAR - ESTADO CONGELADO**  
> **Fecha de Congelamiento:** 2026-09-09  
> **Versión Activa:** v3.7.0  
> **Ambiente:** Producción Fly.io (`gru`) & Supabase PostgreSQL  
> **Responsable:** Mando C4ISR Escuadrón PARAGUAY FFAA `[PRY]`

---

## 🎯 Resumen Ejecutivo

El sistema **PARAGUAY-FFAA | METALSTORM** está funcionando al 100% de su capacidad operativa en el entorno de producción. Los módulos críticos de autenticación, control de mando RBAC, registro de rendimiento semanal y gestión de la base de datos han sido auditados exhaustivamente.

Específicamente, el **flujo de registro y cambio de contraseña forzado** ha sido resuelto y validado de extremo a extremo tras implementar la **lógica tipada polimórfica** (resolución UUID vs INTEGER vs email) en el backend de Express y Supabase.

---

## 🏆 Última Prueba Exitosa de Validación

| Parámetro | Detalle Militar |
|---|---|
| **Piloto Evaluado** | `TestPilot` (Indicativo de pruebas operacionales) |
| **Identificador Numérico (`user_id`)** | `1000` (INTEGER) |
| **Identificador Interno (`id`)** | `3658df3a-3d15-4669-a595-dca33ec86fd3` (UUID) |
| **Correo Institucional** | `testpilot@ffaa.py` |
| **Contraseña Temporal Asignada** | `MS-MJWT-SU3U` (Generada por Administrador) |
| **Nueva Contraseña Reglamentaria** | `Dni32355353` (Definida por el piloto) |
| **Fecha y Hora de la Prueba** | `2026-09-09 23:54:52 UTC` |
| **Token Version Resultante** | `2` (Incrementado desde `1`) |
| **Estado de Cambio Obligatorio** | `must_change_password: false` |
| **Resultado Global** | **✅ COMPLETO Y VALIDADO EN PRODUCCIÓN** |

---

## 🏛️ Reglas de Arquitectura y Negocio Vigentes

1. **Dualidad de Identificadores en `users`:**
   - `user_id` es siempre de tipo **`INTEGER`** (incremental, visible en reportes tácticos, selector de pilotos y telemetría).
   - `id` es siempre de tipo **`UUID`** (clave primaria interna en PostgreSQL / Supabase).
2. **Ciclo de Vida de Credenciales:**
   - Todo nuevo usuario creado por el oficial `ADMIN` nace con `must_change_password = true` y `token_version = 1`.
   - La contraseña temporal responde estrictamente al formato `MS-XXXX-XXXX`.
   - El endpoint `/api/auth/change-password` soporta tanto el modo forzado (`isForced: true` o `must_change_password: true`) como el cambio voluntario desde el perfil.
3. **Invalidación Criptográfica Anti-Sesión Fantasma:**
   - Cada cambio de contraseña incrementa `token_version` en `+1`, invalidando inmediatamente cualquier JWT anterior en circulación.
4. **Resolución de Consultas Tipadas:**
   - Todos los controladores (`auth`, `admin`, `profile`, `performances`) implementan filtros dinámicos que diferencian UUID regex de números enteros para prevenir fallos de casting en PostgreSQL.

---

## 🛡️ Estado de Módulos (Actualizado 2026-09-11)

| Módulo | Estado | Detalle |
|--------|--------|---------|
| **Autenticación Dual** | ✅ Funcional | Login con email o Gmail |
| **Cambio de Contraseña** | ✅ Funcional | Lógica tipada UUID/INTEGER |
| **Registro de Rendimiento** | ✅ Funcional | Guarda `role` histórico |
| **Black Market** | ✅ Funcional | Misiones, progreso, descuentos |
| **Catálogo de Aviones** | ✅ Normalizado | 42 modelos con armas específicas |
| **Hangar de Pilotos** | ✅ Normalizado | UNIQUE + FK + CHECK |
| **Validación de Sistemas** | ✅ Funcional | Sistema disponible por avión |
| **Carrusel Circular** | ✅ Funcional | Navegación infinita |
| **Modal de Datos Profundos** | ✅ Funcional | Muestra nombre + ID |
| **IA de Recomendación** | ✅ Funcional | 3 estilos de combate |
| **Upgrade Planner** | ✅ Funcional | Previsualización de builds |
| **Efectos de Mods** | ✅ Funcional | 10 mods x 5 niveles aplicados a stats |
| **Descarga de Credencial** | ✅ Funcional | Imagen JPG |
| **PWA Offline** | ✅ Funcional | Service Worker v3.7.0 |

## 🛠️ Sistema de Aviones (Actualizado 2026-09-11)

El sistema de aviones fue normalizado, calibrado y dotado de validación técnica de armamento:

- ✅ 42 modelos en el catálogo maestro con armas y subsistemas específicos (`sistemas_disponibles` en JSONB)
- ✅ Validación previa en `updatePlaneSystem` (`src/controllers/planes.controller.js`) que impide calibrar sistemas no soportados (ej: cañones en F-111 / J-20)
- ✅ 10 mods disponibles con efectos numéricos (m1..m10 en 5 niveles)
- ✅ 4 subsistemas mejorables (Fuselaje, Motor, Aviónica, Armas/Cañones según disponibilidad)
- ✅ Habilidades Especiales (3 niveles) y Pasivas (5 niveles)
- ✅ IA de Recomendación (3 estilos de combate)
- ✅ Upgrade Planner (previsualización cuantitativa de builds)
- ✅ Integración de efectos de mods en telemetría de combate (`getPlaneStats`)

### 🎯 Estructura de `sistemas_disponibles` (42 Aviones)
Cada modelo en `plane_models` define detalladamente su arquitectura:
- `fuselaje`: `true`
- `motor`: `true`
- `avionica`: `true`
- `canones`: `"precision"` | `"asalto"` | `null`
- `misiles_ir`, `misiles_radar`, `misiles_beam`, `misiles_manual`, `misiles_largo`, `cohetes`: `true` | `false`

### ⚡ Efectos de Mods (10 Mods × 5 Niveles)
- **Siempre Activos en Stats:**
  - `m1` (Daredevil Turning) & `m2` (Ideal Maneuvering) $\to$ `agility`
  - `m3` (Blast Resistance) $\to$ `armor`
  - `m7` (Disruptive Flares) $\to$ `ecm`
  - `m10` (Improved Targeting) $\to$ `radar`
- **Condicionales & Utilitarios:** `m4` (kills), `m5` (postquemador), `m6` (<50% comb.), `m8` (cooldown), `m9` (<30% HP enem.) registrados para telemetría dinámica.

---

## ⚠️ Nota Operativa y Bug de UI Detectado

> **Bug de Interfaz:** En ciertos navegadores y resoluciones compactas, el modal de cambio forzado de contraseña no despliega con claridad los botones de acción inferior.  
> **Instrucción al Combatiente:** El formulario responde y procesa la actualización presionando la tecla **`ENTER`** directamente en el campo de confirmación de contraseña.  
> **Fix Programado:** Ajuste de layout CSS en `components/change-password-modal.html` para asegurar visibilidad constante del botón *"Actualizar Credencial"*.
