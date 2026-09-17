# 🗺️ ROADMAP — PARAGUAY-FFAA | METALSTORM

> **Visión estratégica del sistema a mediano plazo.**
> **Última actualización:** 2026-09-17
> **Responsable:** Comando C4ISR

---

## 🎯 Visión General

Consolidar el sistema **PARAGUAY-FFAA | METALSTORM** como plataforma táctica de referencia para la gestión operativa del escuadrón en Metalstorm, con:

- **Seguridad de grado militar** (auditoría, RLS, JWT con token_version).
- **UX de excelencia** (acceso rápido, credenciales con QR, dashboard en tiempo real).
- **Observabilidad profesional** (tests automatizados, logging estructurado, monitoreo).
- **Documentación viva** (roadmap, backlog, ADRs, RFCs).
- **Escalabilidad** (listo para crecer a 200+ pilotos si el escuadrón lo requiere).

---

## 📅 Timeline

### ✅ 2026 Q3 (Jul-Sep) — COMPLETADO

**Objetivo:** Seguridad y estabilización del sistema.

- [x] Autenticación dual (email institucional + Gmail OAuth).
- [x] Flujo de recuperación de contraseña.
- [x] Sistema de gestión de pilotos inactivos.
- [x] Auditoría técnica completa (52 hallazgos).
- [x] **Plan de Mejora Continua v1.0 — Fases 0, 1, 2, 3, 3.1, 4 completadas.**

**Entregables clave:**
- v4.0.2 en producción.
- 8 hallazgos de seguridad resueltos.
- 26 archivos SQL versionados.
- Backups persistentes con sanitización.

---

### 🎯 2026 Q4 (Oct-Dic) — OBJETIVO ACTUAL

**Objetivo:** Consolidación técnica y mejoras de UX.

**Fase 5 — Testing y Observabilidad (3-5 días):**
- [ ] Suite de tests con Jest + Supertest.
- [ ] Cobertura > 60% en módulos críticos.
- [ ] Logging estructurado con Pino.
- [ ] Dockerfile con usuario no-root.
- [ ] Auditoría con ambos IDs.

**Fase 6 — Documentación y Limpieza (1-2 días):**
- [ ] Versionado unificado (v4.0.3).
- [ ] Migración de `presence` a Supabase (HALL-032).
- [ ] Eliminar fallback de `plane-models`.
- [ ] Sincronización documental completa.

**Fase 7 — UX de Credenciales (propuesta, 1-2 días):**
- [ ] QR de credenciales temporales (BL-001).
- [ ] Auto-login con link prellenado (BL-005).
- [ ] Exportación PDF de credenciales (BL-008).

**Features del Backlog (prioridad media):**
- [ ] Rediseño del registro de eventos (BL-002).
- [ ] Verificar semanas de escuadrón + BM (BL-003).
- [ ] Fix de desincronización temporal (BL-004).

**Entregables:**
- v4.1.0 en producción.
- Cobertura de tests > 60%.
- UX de credenciales implementada.
- Documentación `docs/` completa (roadmap, backlog, ADRs, RFCs).

---

### 🔮 2027 Q1 (Ene-Mar) — VISIÓN

**Objetivo:** Features de valor agregado.

**Features planificadas:**
- [ ] Rediseño completo del Black Market (BL-003 derivado).
- [ ] Notificaciones push para eventos BM (BL-010).
- [ ] Bot de Discord con comandos (BL-014).
- [ ] 2FA para OWNER/ADMIN (BL-009).
- [ ] Landing pública (BL-006).
- [ ] Dashboard en tiempo real con WebSockets (BL-007).

**Objetivos técnicos:**
- Deploy multi-región (si el escuadrón crece).
- Migrar de Supabase a self-hosted (si los costos lo requieren).

---

### 🌟 2027 Q2+ (Abril en adelante) — LARGO PLAZO

**Objetivo:** Consolidación y expansión.

- Evaluación de app móvil nativa (BL-013).
- Integración con API oficial de Metalstorm (BL-015, si existe).
- Sistema de analytics avanzado para el Comando.
- Backups automáticos diarios.

---

## 🎯 Principios Rectores del Roadmap

1. **Seguridad primero.** Ninguna feature avanza si compromete la seguridad.
2. **No romper producción.** Cada cambio es testeado y revertible.
3. **Evidencia en cada paso.** Documentar antes, durante y después.
4. **Simplicidad.** La solución más simple que resuelva el problema.
5. **Compatibilidad hacia atrás.** No romper clientes existentes.
6. **Documentación viva.** El roadmap se actualiza trimestralmente.

---

## 📊 Métricas Objetivo

| Métrica | Actual | Q4 2026 | Q1 2027 |
|---|---|---|---|
| Cobertura de tests | 0% | > 60% | > 75% |
| Hallazgos críticos | 0 | 0 | 0 |
| Hallazgos altos | 0-2 | 0 | 0 |
| Uptime | 99%+ | 99.5%+ | 99.9%+ |
| Tiempo de respuesta API (p95) | ~200ms | < 150ms | < 100ms |
| Pilotos activos soportados | 28 | 50 | 200 |
| Tamaño del repo (MB) | ~15 | ~20 | ~25 |

---

## 🔗 Documentos Relacionados

- [`BACKLOG.md`](./BACKLOG.md) — Lista detallada de items.
- [`PLAN_MEJORA_CONTINUA.md`](./PLAN_MEJORA_CONTINUA.md) — Plan de fases activas.
- [`CHANGELOG.md`](./CHANGELOG.md) — Historial publicado.
- [`docs/rfc/`](./docs/rfc/) — Propuestas formales.
- [`docs/adr/`](./docs/adr/) — Decisiones arquitectónicas.

---

## 📝 Notas de Gobierno

- **Revisión trimestral:** el roadmap se actualiza cada 3 meses o cuando hay cambios estratégicos.
- **Alcance del roadmap:** 12 meses hacia adelante.
- **Aprobación:** los cambios al roadmap requieren aprobación del OWNER.
- **Comunicación:** cualquier cambio se comunica al escuadrón vía Discord.

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Roadmap v1.0 · 2026-09-17 · Documento vivo**