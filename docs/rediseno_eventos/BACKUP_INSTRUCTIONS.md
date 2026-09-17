# 💾 INSTRUCCIONES DE BACKUP — Pre-Rediseño de Eventos

> **Guía paso a paso para respaldar la base de datos antes de iniciar el rediseño.**
> **Fecha:** 2026-09-17
> **Ejecutor:** OWNER (PJPIROVANI)
> **Duración estimada:** 30 minutos

---

## 🎯 Objetivo

Respaldar **TODOS** los datos del sistema de eventos antes de empezar el rediseño, para garantizar la reversibilidad total.

### Tablas a respaldar:

1. `performances` (639 registros — crítico)
2. `events` (23 eventos — crítico)
3. `bm_events` (0 registros — por documentación)
4. `bm_missions` (por documentación)
5. `bm_progress` (por documentación)
6. `bm_discounts` (por documentación)

---

## 📋 Procedimiento

### PASO 1: Exportar las tablas desde Supabase

**1.1. Ir al SQL Editor de Supabase:**

`https://supabase.com/dashboard/project/<PROJECT_ID>/editor`

**1.2. Ejecutar query de exportación para `performances`:**

```sql
SELECT * FROM performances ORDER BY event_id, user_id;
```

**1.3. Hacer clic en "Export" → "CSV"** (botón arriba a la derecha del resultado).

**1.4. Guardar el archivo como:**
`backup_2026-09-17_performances.csv`

**1.5. Repetir para cada tabla:**

```sql
SELECT * FROM events ORDER BY start_date DESC;
SELECT * FROM bm_events ORDER BY id DESC;
SELECT * FROM bm_missions ORDER BY id DESC;
SELECT * FROM bm_progress ORDER BY id DESC;
SELECT * FROM bm_discounts ORDER BY id DESC;
```

**Guardar cada una como:**
- `backup_2026-09-17_events.csv`
- `backup_2026-09-17_bm_events.csv`
- `backup_2026-09-17_bm_missions.csv`
- `backup_2026-09-17_bm_progress.csv`
- `backup_2026-09-17_bm_discounts.csv`

---

### PASO 2: Crear carpeta en Google Drive

**2.1. Ir a:** `https://drive.google.com`

**2.2. Iniciar sesión con:** `paraguayffaa.metalstorm@gmail.com`

**2.3. Navegar a la carpeta raíz** "Registros Oficiales PARAGUAY FFAA".

**2.4. Crear subcarpeta:**

Nombre: `Backups/2026-09-17-PreRedisenoEventos/`

**2.5. Subir los 6 archivos CSV** dentro de esa carpeta.

---

### PASO 3: Crear archivo README del backup

**3.1. En la misma carpeta de Drive, crear un Google Doc:**

Nombre: `README.md`

**3.2. Contenido:**

```
BACKUP PRE-REDISEÑO DE EVENTOS
Fecha: 2026-09-17
Ejecutor: PJPIROVANI (OWNER)
Motivo: Respaldo previo al rediseño del sistema de eventos.

CONTENIDO:
- backup_2026-09-17_performances.csv (639 registros)
- backup_2026-09-17_events.csv (23 eventos)
- backup_2026-09-17_bm_events.csv (0 registros)
- backup_2026-09-17_bm_missions.csv (? registros)
- backup_2026-09-17_bm_progress.csv (? registros)
- backup_2026-09-17_bm_discounts.csv (? registros)

VERIFICACIÓN DE INTEGRIDAD:
- performances: 639 filas
- events: 23 filas
- bm_events: 0 filas

ROLLBACK:
En caso de necesitar revertir el rediseño, estos CSV contienen el estado completo previo.
```

---

### PASO 4: Verificar integridad de los backups

**4.1. Abrir cada CSV en Excel/Google Sheets.**

**4.2. Verificar los conteos:**

| Tabla | Conteo esperado |
|---|---|
| `performances` | **639** |
| `events` | **23** |
| `bm_events` | **0** |
| `bm_missions` | (verificar) |
| `bm_progress` | (verificar) |
| `bm_discounts` | (verificar) |

**4.3. Si algún conteo NO coincide con lo esperado:**
- **NO continuar con el rediseño.**
- Reportar al OWNER.
- Investigar antes de proceder.

---

### PASO 5: Confirmar el backup

**5.1. Ejecutar esta query en Supabase (verificación en vivo):**

```sql
SELECT 
  (SELECT COUNT(*) FROM performances) AS performances_count,
  (SELECT COUNT(*) FROM events) AS events_count,
  (SELECT COUNT(*) FROM bm_events) AS bm_events_count,
  (SELECT COUNT(*) FROM bm_missions) AS bm_missions_count,
  (SELECT COUNT(*) FROM bm_progress) AS bm_progress_count,
  (SELECT COUNT(*) FROM bm_discounts) AS bm_discounts_count;
```

**5.2. Comparar con los conteos de los CSV.**

**5.3. Si todo coincide:** ✅ Backup confirmado. Continuar con el rediseño.

**5.4. Si algo NO coincide:** ⚠️ Repetir el backup.

---

## 🔒 Reglas de seguridad

1. **NO modificar** los archivos CSV después de crear el backup.
2. **NO compartir** la carpeta de Drive con personas externas al escuadrón.
3. **NO eliminar** el backup hasta que el rediseño esté 100% validado (mínimo 30 días post-deploy).
4. **Mantener** los archivos en formato CSV (no convertir a otro formato).

---

## 📅 Cronograma sugerido

| Hora | Acción |
|---|---|
| **+0:00** | Exportar las 6 tablas a CSV |
| **+0:15** | Crear carpeta en Drive y subir archivos |
| **+0:25** | Verificar integridad |
| **+0:30** | Backup completo ✅ |

---

## ✅ Checklist de cierre

- [ ] `performances.csv` exportado y verificado (639 filas).
- [ ] `events.csv` exportado y verificado (23 filas).
- [ ] `bm_events.csv` exportado y verificado (0 filas).
- [ ] `bm_missions.csv` exportado y verificado.
- [ ] `bm_progress.csv` exportado y verificado.
- [ ] `bm_discounts.csv` exportado y verificado.
- [ ] Todos los archivos subidos a Google Drive.
- [ ] README.md creado en la carpeta de Drive.
- [ ] Conteos verificados (CSV = Supabase).
- [ ] Backup confirmado por el OWNER.

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Backup v1.0 · 2026-09-17**