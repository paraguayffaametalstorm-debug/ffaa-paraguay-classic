# ADR-004: Cuota de ADMIN de 3 a 5

- **Fecha:** 2026-09-16
- **Estado:** Accepted
- **Decisores:** PJPIROVANI (OWNER) + Comando C4ISR
- **Relacionado con:** HALL-053, HALL-054

## Estado

Accepted (vigente desde 2026-09-16, validado por OWNER).

## Contexto y problema

El sistema aplica **cuotas institucionales estrictas** por rango militar para reflejar la estructura real del escuadrón:

- **1 OWNER** (Comandante en Jefe).
- **N ADMIN** (Oficiales de Operaciones).
- **8 VETERANO** (Pilotos Experimentados).

Históricamente, la cuota de ADMIN estaba fijada en **3**. Durante la auditoría de Fase 2 se detectaron dos problemas:

1. **HALL-053:** la cuota real de ADMIN era inconsistente entre documentación y realidad. El código, la doc pública y las decisiones del OWNER no coincidían.
2. **HALL-054:** los límites de roles estaban **hardcodeados en múltiples ubicaciones** de `admin.controller.js` sin constante centralizada, lo que dificultaba su mantenimiento.

Adicionalmente, el OWNER determinó que **el límite de 3 era arbitrario** y no reflejaba la estructura real del escuadrón — la realidad operativa demanda **5 oficiales ADMIN**.

## Factores de decisión

- **Alineación con la realidad:** la cuota debe reflejar la estructura real del escuadrón.
- **Mantenibilidad:** los límites deben estar en una **constante centralizada** para evitar inconsistencias futuras.
- **Auditoría:** los cambios de cuota deben generar eventos auditables.
- **Errores claros:** cuando se supera la cuota, el sistema debe devolver un error específico (`ROLE_LIMIT_REACHED`).

## Opciones consideradas

1. **Mantener cuota en 3 y documentar la realidad por separado**
   - **Pros:** cero cambios de código.
   - **Contras:** la doc seguiría siendo falsa. La estructura real del escuadrón no se refleja.

2. **Subir cuota a 5 sin centralizar la constante**
   - **Pros:** solución rápida.
   - **Contras:** perpetúa HALL-054. El próximo cambio tendría que tocar múltiples lugares.

3. **Subir cuota a 5 + centralizar en constante `ROLE_LIMITS`** *(elegida)*
   - **Pros:** resuelve HALL-053 y HALL-054 simultáneamente.
   - **Contras:** requiere refactor de `admin.controller.js`.

## Decisión

**Elegimos la Opción 3.**

1. **Cuota de ADMIN sube de 3 a 5.**
2. Se crea la constante centralizada **`ROLE_LIMITS`** en `admin.controller.js`:

   ```js
   const ROLE_LIMITS = {
     OWNER: 1,
     ADMIN: 5,
     VETERANO: 8
   };
   ```

3. Los errores al superar la cuota devuelven `code: 'ROLE_LIMIT_REACHED'` con **mensaje dinámico** que indica el rol y la cuota.

4. Se actualiza la documentación pública (`README.md`, `API_REFERENCE.md`, `ARCHITECTURE.md`) y `docs/rediseno_eventos/CONTEXTO_PROYECTO.md`.

## Consecuencias

### Positivas

- La cuota refleja la realidad operativa del escuadrón.
- Los límites viven en **un solo lugar** (`ROLE_LIMITS`).
- Cualquier cambio futuro es **1 línea + redeploy**.
- Los mensajes de error son **dinámicos** (indican el rol y la cuota actual).
- Auditoría: el cambio de cuota está registrado en el historial de versiones.

### Negativas

- Requirió actualizar la documentación pública (12 archivos entre código y docs).
- Los tests existentes que asumían `ADMIN = 3` debieron actualizarse.

### Neutrales

- La cuota de VETERANO (8) y OWNER (1) no cambian.

## Implementación

- `src/controllers/admin.controller.js:242, 254` — `code: 'ROLE_LIMIT_REACHED'`.
- `src/controllers/admin.controller.js` — constante `ROLE_LIMITS` (usada en ascensos).
- `CHANGELOG.md:440` — contexto del cambio (auditoría Fase 2).
- `CHANGELOG.md:475` — `Constante ROLE_LIMITS + cuota ADMIN 5 + mensajes dinámicos`.
- `CHANGELOG.md:906` — `El límite de 3 era arbitrario y no reflejaba la estructura real del escuadrón.`
- `CHANGELOG.md:916` — HALL-053.
- `CHANGELOG.md:917` — HALL-054.
- `ARCHITECTURE.md:464` — `ADMIN: Máximo 5 (actualizado desde 3 por decisión del OWNER, 2026-09-16).`
- **Sprint 0 Grupo B** (commits `fbf4852` + `0b92605`) — sincronización de cuota en docs: `README.md`, `API_REFERENCE.md`, `CONTEXTO_PROYECTO.md`.

## Pendiente de verificar

Nada pendiente. Evidencia directa en código y CHANGELOG.

## Fuentes y trazabilidad

| Afirmación | Fuente |
|---|---|
| Auditoría Fase 2 resuelve inconsistencias | `CHANGELOG.md:440` |
| Constante `ROLE_LIMITS` + cuota ADMIN 5 | `CHANGELOG.md:475` |
| El límite 3 era arbitrario | `CHANGELOG.md:906` |
| HALL-053 (cuota inconsistente) | `CHANGELOG.md:916` |
| HALL-054 (límites hardcodeados) | `CHANGELOG.md:917` |
| Código devuelve `ROLE_LIMIT_REACHED` | `src/controllers/admin.controller.js:242, 254` |
| Cuota actual documentada en ARCHITECTURE | `ARCHITECTURE.md:464` |

## Referencias

- `docs/adr/README.md`
- `ARCHITECTURE.md` — sección jerarquía militar
- `PLAN_TRABAJO.md` — FIX-004, FIX-009, FIX-011, FIX-018 (Sprint 0 Grupo B)

---

> ADR redactado según formato **MADR 4.0** (https://adr.github.io/madr/).
> Recuperado con asistencia IA a partir de evidencia verificable el 2026-09-20.
> Sin información inventada.
