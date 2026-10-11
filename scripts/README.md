# 🛠️ Scripts — PARAGUAY-FFAA | METALSTORM

> **Documentación de los scripts operativos activos.**
> **Última actualización:** 2026-10-11

---

## 📌 Scripts Activos

Estos son los scripts que se usan recurrentemente en el mantenimiento del proyecto.

### `bump-version.cjs`

**Propósito:** Actualizar la versión en `package.json`, `sw.js`, y `index.html`.

**Cuándo usar:** Cuando se necesita hacer un bump de versión manual (raro, porque `release-please` lo hace automático).

**Uso:**
```bash
node scripts/bump-version.cjs