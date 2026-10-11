# Scripts — PARAGUAY-FFAA | METALSTORM

> **Documentacion de los scripts operativos activos.**
> **Ultima actualizacion:** 2026-10-11

---

## Scripts Activos

Estos son los scripts que se usan recurrentemente en el mantenimiento del proyecto.

### `bump-version.cjs`

**Proposito:** Actualizar la version en `package.json`, `sw.js`, y `index.html`.

**Cuando usar:** Cuando se necesita hacer un bump de version manual (raro, porque `release-please` lo hace automatico).

**Uso:**
```bash
node scripts/bump-version.cjs [patch|minor|major|X.Y.Z] [--dry-run]