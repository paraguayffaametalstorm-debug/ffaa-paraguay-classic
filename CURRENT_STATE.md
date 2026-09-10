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

## 🚦 Estado de Módulos del Sistema

| Módulo | Versión | Estado | Observaciones |
|---|---|:---:|---|
| **Auth & Login Dual** | v3.5.0 | 🟢 Activo | Soporte dual `@ffaa.py` y Gmail vinculado. |
| **Cambio de Clave Táctico** | v3.7.0 | 🟢 Activo | Lógica tipada confirmada con `.select()`. |
| **Dashboard C4ISR** | v3.6.0 | 🟢 Activo | Telemetría, Top 5, meta 175 tokens. |
| **Registro de Rendimiento** | v3.6.0 | 🟢 Activo | Selector de pilotos (`#performanceTarget`) activo para Oficiales. |
| **Black Market (BM)** | v3.7.0 | 🟢 Activo | Eventos de 5 días, cálculo de descuentos y misiones diarias. |
| **Hangar Upgrades 2.0** | v3.4.0 | 🟢 Activo | 23 cazas, niveles 0-8 en 4 subsistemas mecánicos. |
| **Service Worker PWA** | v3.7.0 | 🟢 Activo | Cache-first táctico y modo standalone. |

---

## ⚠️ Nota Operativa y Bug de UI Detectado

> **Bug de Interfaz:** En ciertos navegadores y resoluciones compactas, el modal de cambio forzado de contraseña no despliega con claridad los botones de acción inferior.  
> **Instrucción al Combatiente:** El formulario responde y procesa la actualización presionando la tecla **`ENTER`** directamente en el campo de confirmación de contraseña.  
> **Fix Programado:** Ajuste de layout CSS en `components/change-password-modal.html` para asegurar visibilidad constante del botón *"Actualizar Credencial"*.
