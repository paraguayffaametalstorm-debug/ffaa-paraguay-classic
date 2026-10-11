# 🚀 Guía de Versionado y Release — PARAGUAY-FFAA | METALSTORM

> **Fuente única de verdad sobre cómo se versiona y publica una nueva release.**
> **Última actualización:** 2026-10-11
> **Mecanismo:** `release-please` (Google) + GitHub Actions + Conventional Commits

---

## 🎯 Principio Fundamental

**Las versiones se derivan automáticamente de los mensajes de commit.**
No hay bump manual, no hay archivos de versión que editar a mano.

El bot `release-please` analiza los commits desde el último tag, calcula
la próxima versión según SemVer y abre un PR con el bump + CHANGELOG
actualizado. Cuando ese PR es mergeado, el tag y la Release se crean
automáticamente.

---

## 📐 Semantic Versioning (SemVer)

El proyecto usa **SemVer** con el formato `MAJOR.MINOR.PATCH`:

| Componente | Cuándo sube | Ejemplo |
|---|---|---|
| **MAJOR** | Breaking changes (rompe compatibilidad) | `4.8.4 → 5.0.0` |
| **MINOR** | Nuevas features compatibles | `4.8.4 → 4.9.0` |
| **PATCH** | Bug fixes compatibles | `4.8.4 → 4.8.5` |

---

## 📝 Conventional Commits

Todos los commits **deben** seguir el formato [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<scope>): <descripción>

[cuerpo opcional]

[footer opcional]
```

### Tipos soportados

| Tipo | Descripción | Bump SemVer |
|---|---|---|
| `feat` | Nueva feature | **MINOR** |
| `fix` | Bug fix | **PATCH** |
| `feat!` o `BREAKING CHANGE:` | Breaking change | **MAJOR** |
| `perf` | Mejora de performance | PATCH |
| `refactor` | Refactoring sin cambio funcional | Ninguno |
| `docs` | Documentación | Ninguno |
| `test` | Tests | Ninguno |
| `ci` | CI/CD | Ninguno |
| `chore` | Mantenimiento | Ninguno |
| `style` | Formato/estilos | Ninguno |

### Ejemplos válidos

```bash
feat(veteran): agregar endpoint de evaluaciones de mentoría
fix(auth): corregir validación de token expirado
docs(readme): actualizar URLs de Render
chore(deps): actualizar vitest a 5.0.3
feat(api)!: cambiar formato de respuesta de /api/events-v2
refactor(admin): simplificar función getUsers
test(planes): agregar tests para updatePlaneSystem
```

### Ejemplos inválidos

```bash
# ❌ Sin tipo
actualizar readme

# ❌ Tipo desconocido
update: cambiar algo

# ❌ Sin descripción
feat:

# ❌ Título en mayúsculas sin scope
FEAT: Agregar algo
```

---

## 🤖 Cómo funciona `release-please`

### Flujo automático (cada push a `main`)

```
1. Push de commits a main
   ↓
2. GitHub Actions dispara el workflow "Release Please"
   ↓
3. release-please analiza los commits desde el último tag
   ↓
4. Calcula la próxima versión (según los tipos de commits)
   ↓
5. Abre (o actualiza) un PR:
   - Título: "chore(main): release X.Y.Z"
   - Branch: release-please--branches--main
   - Cambios: package.json, CHANGELOG.md, .release-please-manifest.json
   ↓
6. Vos (humano) revisás el PR
   ↓
7. Mergeás el PR → se crea el tag vX.Y.Z + la Release en GitHub
   ↓
8. Render auto-deploya en ~2 min
```

### ¿Cuándo NO genera PR?

Si desde el último tag **no hay** commits de tipo `feat:` o `fix:`,
`release-please` no genera PR (no hay razón para un nuevo release).

**Es normal.** Los commits `docs:`, `chore:`, `ci:` no generan release.

---

## 📋 Workflow Completo de Release

### Escenario típico: publicar una nueva feature

```bash
# 1. Hacer cambios en el código
# ... (editar archivos)

# 2. Commit con Conventional Commits
git add .
git commit -m "feat(veteran): agregar filtro de pupilos por semáforo"

# 3. Push a main
git push origin main
```

**Eso es todo.** No hay más pasos manuales.

### Qué pasa después del push

1. **Segundos después:** GitHub Actions dispara `release-please`.
2. **~15 segundos:** `release-please` abre un PR `chore(main): release X.Y.0`.
3. **Vos:** entrás al PR y revisás el diff.
4. **Vos:** click en "Merge pull request" → "Confirm merge".
5. **~10 segundos:** se crea el tag `vX.Y.0` y la Release en GitHub.
6. **~2 minutos:** Render auto-deploya la nueva versión.
7. **Verificación:** `curl https://paraguay-ffaa-metalstorm.onrender.com/api/health`.

---

## 🔒 Reglas de Oro

1. **Nunca edites `version` en `package.json` a mano.** Lo maneja `release-please`.
2. **Nunca edites `.release-please-manifest.json` a mano.** Lo maneja `release-please`.
3. **Nunca edites `CHANGELOG.md` a mano** (excepto para anotaciones puntuales).
4. **Siempre usá Conventional Commits.** Si no, el release no se genera.
5. **Revisá el PR de `release-please` antes de mergear.** Es tu última línea de defensa.
6. **No crees tags manualmente.** `release-please` los crea al mergear el PR.

---

## 🛠️ Herramientas de Rescate

### Rollback del último release

Si mergeaste un PR de release por error:

```bash
# 1. Borrar el tag local
git tag -d vX.Y.Z

# 2. Borrar el tag remoto
git push origin :refs/tags/vX.Y.Z

# 3. Borrar la Release en GitHub (manual, desde la web)
# https://github.com/.../releases → Editar → Delete

# 4. Revertir el commit de release en main
git revert <hash-del-commit-de-release>
git push origin main
```

### Forzar un release manualmente

Si `release-please` no genera el PR esperado:

```bash
# 1. Hacer un commit vacío de tipo feat: o fix:
git commit --allow-empty -m "fix: trigger release"
git push origin main
```

Esto fuerza un nuevo análisis de commits.

### Saltarse el análisis automático

Si necesitás publicar una versión explícita:

1. Mergeá un PR de `release-please` con el bump propuesto.
2. O bien, creá el tag manualmente:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   git push origin vX.Y.Z
   ```
   ⚠️ Esto **saltea** `release-please`. Usalo solo en emergencias.

---

## 📚 Recursos Externos

- **Semantic Versioning:** https://semver.org/lang/es/
- **Conventional Commits:** https://www.conventionalcommits.org/es/
- **release-please (Google):** https://github.com/googleapis/release-please
- **release-please-action:** https://github.com/googleapis/release-please-action

---

## 📁 Archivos Relacionados

| Archivo | Propósito |
|---|---|
| `.github/workflows/release-please.yml` | Action que dispara `release-please` en cada push |
| `release-please-config.json` | Configuración del bot (secciones del CHANGELOG, tipos de commits) |
| `.release-please-manifest.json` | Estado actual de la versión (lo maneja el bot) |
| `CHANGELOG.md` | Historial de versiones (lo maneja el bot) |
| `package.json` | Fuente de verdad de la versión (lo maneja el bot) |

---

## 🚨 Solución de Problemas Comunes

### "No aparece el PR de release-please"

**Causa más probable:** los últimos commits no incluyen `feat:` ni `fix:`.

**Solución:** hacé un commit real de tipo `feat:` o `fix:`.

### "El workflow falla con 'not permitted to create pull requests'"

**Causa:** falta habilitar permisos en GitHub.

**Solución:**
1. Andá a: `Settings → Actions → General`.
2. Sección "Workflow permissions".
3. Marcar **"Read and write permissions"**.
4. Marcar **"Allow GitHub Actions to create and approve pull requests"**.
5. Save.

### "El tag vX.Y.Z no se creó después del merge"

**Causa:** el workflow post-merge falló o no corrió.

**Solución:** revisá `Actions` en GitHub. Si falló, click en "Re-run all jobs".

---

## ✅ Checklist de Release

Antes de mergear un PR de `release-please`, verificá:

- [ ] El PR dice `chore(main): release X.Y.Z`.
- [ ] El autor es `github-actions[bot]`.
- [ ] El label es `autorelease: pending`.
- [ ] Los cambios en `package.json` son solo el bump de versión.
- [ ] Los cambios en `.release-please-manifest.json` son solo el bump.
- [ ] El `CHANGELOG.md` refleja los commits nuevos.
- [ ] No hay conflictos con `main`.
- [ ] El workflow pre-merge pasó (✅ verde).

---

**PARAGUAY FFAA [PRY]** — Comandancia General C4ISR
**RELEASE.md v1.0 · 2026-10-11 · Documento vivo**