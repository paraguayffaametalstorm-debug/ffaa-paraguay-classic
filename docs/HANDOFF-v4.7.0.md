# Handoff — v4.7.0 (Panel de Comandancia F6)

**Fecha:** 2026-10-09
**Commit final:** `3468fd1`
**Deploy:** Render (live)
**URL:** https://paraguay-ffaa-metalstorm.onrender.com

---

## 1. Qué se hizo en F6

### Rediseño del Panel Admin

- Sidebar colapsable con 5 secciones.
- Lazy loading de secciones.
- Persistencia de estado en localStorage.
- KPIs en tiempo real con render dinámico.
- Distribución de rendimiento (semáforo 4 cuadrantes).
- Tabs internos y modo compacto.
- Mobile drawer responsive.

### 5 bugs corregidos

| # | Bug | Fix |
|---|-----|-----|
| 1 | IDs de KPIs sin prefijo admin | commit `643a14d` |
| 2 | `renderPilotsByStatus` buscaba ID viejo | commit `3468fd1` |
| 3 | `window.adminMembersCache` no expuesto | commit `cbbf3a2` |
| 4 | Race condition en init de sección | commit `cbbf3a2` |
| 5 | Service Worker cacheaba assets viejos | Unregister manual + bump a v4.7.1 |

---

## 2. Commits de F6

```
3468fd1 fix(admin): renderPilotsByStatus usa ID adminPilotsByStatus (fix definitivo)
cbbf3a2 fix(admin): exponer adminMembersCache + esperar carga para distribución
d2e0d12 chore(cache): bump CACHE_NAME a v4.7.1
a7d9d2e fix(admin): mover scripts embebidos a admin-sections.js
643a14d fix(admin): IDs de KPIs en sección Resumen
55c3f48 feat(admin): rediseño del Panel de Comandancia v4.7.0
```

---

## 3. Migración fuera de Fly.io

**Motivo:** app quedó activa de un deploy anterior, riesgo de costo.

**Acciones:**
1. Backup de 19 variables de entorno → Bitwarden.
2. `fly apps destroy paraguay-ffaa-metalstorm`
3. URL `fly.dev` deprecada.
4. Pilotos deben usar Render.

**Verificación:**
```cmd
fly apps list
```
**Esperado:** `paraguay-ffaa-metalstorm` ya no aparece.

---

## 4. Lecciones aprendidas

### ⚠️ Orden correcto de operaciones

**MAL:**
```
git add → git commit → node script-fix.cjs → git push
```

**BIEN:**
```
node script-fix.cjs → findstr (verificar) → git status → git add → git commit → git push
```

### ⚠️ Service Worker + desarrollo activo

Al hacer cambios en JS durante desarrollo activo:
1. Unregister SW en F12 → Application → Service Workers
2. Clear site data en F12 → Application → Storage
3. Ctrl+Shift+R
4. Recién entonces verificar

### ⚠️ Verificar commits antes de pushear

Antes de `git push`:
```cmd
git show HEAD:archivo.js | findstr /C:"string-que-deberia-estar"
```

---

## 5. Pendientes

- [ ] Comunicar nueva URL al escuadrón.
- [ ] Documentación de arquitectura F7.
- [ ] Tests automatizados.
- [ ] Migrar `FRONTEND_URL` a dominio propio (opcional).

---

**PARAGUAY FFAA [PRY] · HANDOFF v4.7.0 · 2026-10-09**
