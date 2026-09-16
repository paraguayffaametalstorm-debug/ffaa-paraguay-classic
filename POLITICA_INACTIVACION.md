# 🎖️ Política Oficial de Inactivación de Pilotos — PARAGUAY-FFAA | METALSTORM

> **Documento normativo oficial del Escuadrón PARAGUAY FFAA `[PRY]` en MetalStorm.**  
> **Versión:** v1.0 · **Fecha de aprobación:** 2026-09-16 · **Autoridad emisora:** Comandancia General

---

## 1. Objetivo
Establecer los criterios, plazos y procedimientos oficiales para la inactivación y reactivación de pilotos del escuadrón, garantizando trazabilidad, auditoría y trato justo conforme a la doctrina militar del `[PRY]`.

## 2. Marco Normativo
Esta política se sustenta en los siguientes artículos del Reglamento Interno del Escuadrón:
- **Artículo 12:** Disciplina operativa y rendimiento mínimo
- **Artículo 26:** Semáforo operacional (VERDE / NARANJA / ROJO / NEGRO)
- **Artículo 31:** Procedimiento disciplinario
- **Artículo 44:** Bajas temporales y reactivación

## 3. Causales de Inactivación
Un piloto puede ser inactivado por alguna de las siguientes causales:

### 3.1 Baja Temporal
- **Descripción:** El piloto solicita una pausa temporal por motivos personales justificados.
- **Duración máxima:** 90 días.
- **Requiere aprobación:** Sí (`ADMIN` u `OWNER`).
- **Motivo obligatorio:** `"Baja temporal: [detalle del motivo]"`.

### 3.2 Bajo Rendimiento
- **Descripción:** El piloto mantiene un semáforo ROJO o NEGRO por 3 o más eventos consecutivos.
- **Requiere aprobación:** Sí (`ADMIN` u `OWNER`).
- **Aviso previo:** Notificación al piloto por canal oficial antes de proceder.
- **Motivo obligatorio:** `"Bajo rendimiento: [detalle]"`.

### 3.3 Inactividad Prolongada
- **Descripción:** El piloto no registra actividad ni tokens por 60 o más días corridos.
- **Requiere aprobación:** Sí (`ADMIN` u `OWNER`).
- **Aviso previo:** Notificación al piloto por canal oficial antes de proceder.
- **Motivo obligatorio:** `"Inactividad prolongada: [detalle]"`.

### 3.4 Expulsión Disciplinaria
- **Descripción:** El piloto incurre en una falta grave conforme al Artículo 31 del Reglamento Interno.
- **Requiere aprobación:** Solo `OWNER`.
- **Aviso previo:** No (sanción inmediata).
- **Motivo obligatorio:** `"Expulsión disciplinaria: [detalle de la falta]"`.

### 3.5 Renuncia Voluntaria
- **Descripción:** El piloto presenta renuncia formal al escuadrón.
- **Requiere aprobación:** Sí (`ADMIN` u `OWNER`).
- **Motivo obligatorio:** `"Renuncia voluntaria: [detalle]"`.

## 4. Autoridades Competentes

| Rol | Puede inactivar a | Puede reactivar a |
|:---:|---|---|
| **OWNER** | Cualquiera excepto a sí mismo | Cualquiera |
| **ADMIN** | Solo `MIEMBRO` y `VETERANO` | Solo `MIEMBRO` y `VETERANO` |
| **VETERANO** | Nadie | Nadie |
| **MIEMBRO** | Nadie | Nadie |

**Reglas adicionales:**
- Nadie puede inactivar al `OWNER` (protección del mando).
- Nadie puede inactivarse a sí mismo.
- Toda inactivación queda registrada en `audit_logs` con actor, fecha, motivo y rol.

## 5. Procedimiento de Inactivación
1. El oficial competente identifica la causal aplicable.
2. Si corresponde aviso previo (ver §3), se notifica al piloto por canal oficial.
3. El oficial accede al Panel de Comandancia $\to$ pestaña **"🟢 Activos"** o **"📋 Todos"**.
4. Hace click en **"🔴 Inactivar"** sobre el piloto objetivo.
5. Completa el modal táctico:
   - Selecciona el motivo principal del dropdown
   - Detalla el motivo en texto libre (mínimo 10 caracteres, máximo 500)
6. Confirma la inactivación.
7. El sistema registra:
   - `status = 'INACTIVE'`
   - `inactive_reason`, `inactive_by`, `inactive_at`
   - Entrada en `audit_logs` con action `USER_DEACTIVATED`

## 6. Procedimiento de Reactivación
1. El piloto contacta al Comando Central por canal oficial.
2. Un `ADMIN` u `OWNER` evalúa el caso.
3. Si corresponde reactivación:
   - Accede a pestaña **"🔴 Inactivos"**
   - Click en **"🟢 Activar"**
   - Ingresa motivo de reactivación (opcional, máximo 300 caracteres)
   - Confirma
4. El sistema registra:
   - `status = 'ACTIVE'`
   - Limpia `inactive_reason`, `inactive_by`, `inactive_at` a `NULL`
   - Entrada en `audit_logs` con action `USER_ACTIVATED`
5. Todos los datos del piloto se conservan intactos durante la inactivación.
6. El piloto puede iniciar sesión de forma inmediata con sus credenciales habituales.

## 7. Plazos y Avisos

| Causal | Aviso previo | Plazo de aviso | Duración máxima |
|---|:---:|:---:|:---:|
| **Baja temporal** | No aplica | — | 90 días |
| **Bajo rendimiento** | Sí | 7 días | Indefinida |
| **Inactividad prolongada** | Sí | 14 días | Indefinida |
| **Expulsión disciplinaria** | No | — | Indefinida |
| **Renuncia voluntaria** | No aplica | — | Indefinida |

## 8. Notificación al Piloto
- **Canal principal:** WhatsApp del escuadrón.
- **Canal secundario:** Discord.
- **Canal terciario (si tiene Gmail vinculado):** Correo electrónico.
- **Contenido del mensaje:**
  - Causa de la inactivación
  - Motivo detallado
  - Fecha de la baja
  - Canal de apelación: `comando.central@ffaa.py`

## 9. Reactivación de Inactivos Históricos
Los pilotos inactivados antes de la implementación del sistema de motivos (v4.0.0) pueden tener `inactive_reason = NULL`. En esos casos:
1. Un `ADMIN` u `OWNER` puede usar el botón **"✏️ Completar"** en la pestaña **"🔴 Inactivos"**.
2. Se registra el motivo histórico en `inactive_reason`.
3. Se conserva la fecha original de inactivación.
4. Se registra en `audit_logs` con action `USER_INACTIVE_REASON_UPDATED`.

## 10. Auditoría y Trazabilidad
Toda inactivación, reactivación y completado de motivo queda registrada en:
- **`audit_logs` (tabla de auditoría):**
  - `actor_id`, `actor_nick`, `target_id`, `target_nick`, `action`, `details`, `created_at`
  - Actions: `USER_DEACTIVATED`, `USER_ACTIVATED`, `USER_INACTIVE_REASON_UPDATED`
- **`security_events` (eventos de seguridad):**
  - Redundancia con IP y User-Agent del actor
- **`users` (estado actual):**
  - `inactive_reason`, `inactive_by`, `inactive_at`

**Consultas de auditoría disponibles (vía Supabase SQL Editor):**

```sql
-- Historial de inactivaciones
SELECT * FROM audit_logs
WHERE action IN ('USER_DEACTIVATED', 'USER_ACTIVATED', 'USER_INACTIVE_REASON_UPDATED')
ORDER BY created_at DESC;

-- Inactivos actuales con motivo
SELECT user_id, nick, inactive_reason, inactive_at, inactive_by
FROM users WHERE status = 'INACTIVE' ORDER BY inactive_at DESC;
```

## 11. Apelaciones
El piloto inactivado puede apelar la decisión:
1. Contacta al Comando Central por canal oficial.
2. Expone los motivos de la apelación.
3. El `OWNER` evalúa la apelación.
4. Si procede, se reactiva y se documenta la apelación en `audit_logs`.

## 12. Vigencia y Modificaciones
- **Vigencia:** A partir del 2026-09-16.
- **Modificaciones:** Solo el `OWNER` puede modificar esta política.
- **Revisión:** Anual o ante cambios significativos del sistema.

---

**Autoridad emisora:** Comandancia General del Escuadrón PARAGUAY FFAA `[PRY]`  
**Fecha:** 2026-09-16  
**Versión:** v1.0
