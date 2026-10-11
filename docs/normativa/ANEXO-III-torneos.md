# ANEXO III — RÉGIMEN DE TORNEOS INTERNOS

> **Desarrollo del Artículo 18 bis de la Normativa Oficial PARAGUAY FFAA | METALSTORM v3.0.**
> **Aprobación por acuerdo institucional conforme al Artículo 47.**
> **Documento vivo. Versión 1.0 — 2026-10-12.**

---

## PREÁMBULO

El presente Anexo desarrolla el régimen de los **torneos internos** del escuadrón PARAGUAY FFAA, conforme al Artículo 18 bis de la Normativa v3.0.

Los torneos internos tienen carácter **recreativo** y **formativo**. Su finalidad principal es **servir como instancia de entrenamiento competitivo** para los miembros del escuadrón, replicando la estructura y mecánica de los torneos oficiales de Metalstorm Championship Series (MCS).

**No se juegan a través de Matcherino ni plataformas externas.** La organización, registros, brackets y draft se gestionan internamente conforme a los Artículos 21, 22 y 44 de la normativa principal.

---

## TÍTULO I — DISPOSICIONES GENERALES

### Artículo 1. Objeto

Este Anexo reglamenta:
- Los formatos admitidos para torneos internos.
- El tamaño y escalabilidad de los torneos.
- La duración, calendario y modalidad de partidas.
- El sistema de draft y selección de aeronaves.
- Los premios y reconocimientos.
- Las sanciones aplicables durante el torneo.
- El registro y trazabilidad de los resultados.
- Las funciones de la aplicación de control que se requieren.
- Los canales oficiales de comunicación del torneo.

### Artículo 2. Alcance

1. Los torneos internos se organizan **entre miembros del mismo escuadrón** (Art. 18 bis.1).

2. **No afectan** la evaluación, el aporte, los ascensos, los descensos, las vacantes ni los derechos de los miembros (Art. 18 bis.2).

3. La **participación es voluntaria**. La no participación no genera sanción ni consecuencia (Art. 18 bis.3).

4. **No se utilizan para** modificar evaluaciones, otorgar puntos de aporte, definir ascensos/descensos, ni priorizar vacantes (Art. 18 bis.6).

### Artículo 3. Definiciones

A los efectos de este Anexo:

| Término | Definición |
|---|---|
| **Equipo** | Grupo de 5 pilotos titulares + 1 suplente opcional (máximo 6). |
| **Swiss (Suizo)** | Sistema de emparejamiento por récord. Bracket sin corte. |
| **Single Elimination** | Sistema de eliminación directa. |
| **Bo3** | Mejor de 3 partidas. |
| **Bo5** | Mejor de 5 partidas. |
| **Ban** | Prohibición de una aeronave durante el draft. |
| **Mirrored Picks** | Permitir que ambos equipos usen la misma aeronave. |
| **Priority Target** | Modo de juego principal oficial. |
| **Draft** | Fase de selección de aeronaves previa a cada partida. |
| **Rol** | Función táctica de la aeronave según la clasificación oficial de Metalstorm. |
| **Moderador** | Administrador designado para supervisar el torneo. |

---

## TÍTULO II — FORMATO DEL TORNEO

### Artículo 4. Estructura General

1. El formato estándar replica el formato oficial de los torneos MCS:

   **Día 1 — Fase Suiza (Swiss, Uncapped Bracket)**
   - Bracket sin corte.
   - Todos los equipos juegan.
   - Emparejamientos por récord (2-0 vs 2-0, 1-1 vs 1-1, 0-2 vs 0-2).
   - Los mejores equipos clasifican al Top de eliminación.

   **Día 2 — Fase de Eliminación (Single Elimination)**
   - Se juega con el Top 8 (si hay 8 equipos o menos) o Top 16 (si hay más).
   - Bo3 en cuartos de final.
   - Bo5 en semifinales y final.

2. **Excepción para F1 con 4-6 equipos:** Si la cantidad de equipos inscriptos no justifica Swiss completo, la Administración puede optar por Round Robin (todos contra todos) en Día 1, seguido de Single Elimination en Día 2. Esta decisión debe comunicarse en la convocatoria.

### Artículo 5. Modalidad de Partida

1. **Modo principal:** Priority Target.

2. **Mapas y modos por ronda (Bo3):**
   - Priority Target en Countdown
   - Priority Target en Icebound
   - Elimination en Crimson Canyon

3. **Mapas y modos por ronda (Bo5):**
   - Priority Target en Countdown
   - Priority Target en Icebound
   - Elimination en Crimson Canyon
   - Priority Target en Stone Forest
   - Priority Target en Crucible

4. Los mapas y modos exactos se comunican en la convocatoria. No se modifican a mitad del torneo.

### Artículo 6. Requisitos de Equipo

1. **Composición:**
   - 5 pilotos titulares.
   - 1 suplente opcional (total máximo 6).

2. **Equipo incompleto:** Si un equipo no tiene 5 titulares confirmados antes del inicio del torneo, es removido del bracket.

3. **Unique Roles:** Cada equipo debe cubrir los roles oficiales de Metalstorm sin repetir. La verificación se realiza contra el campo `type` de `plane_models` en la aplicación de control.

4. **Cliente de juego:** Las partidas se juegan en el cliente de producción de Metalstorm. Los pilotos solo tienen acceso a sus hangares actuales.

### Artículo 7. Sistema de Draft

1. **1 ban por equipo.**

2. **Mirrored Picks permitidos** (ambos equipos pueden usar la misma aeronave).

3. **El último avión de Black Market está baneado automáticamente.**

4. **Herramienta de draft:** Interna. La Administración provee un formulario o sala de Discord moderada. **No se usa Matcherino ni `metalstormdraft.gg`** (aunque este último es la herramienta oficial de MCS, no se requiere para torneos internos).

5. **Tiempo límite por draft:** 5 minutos por equipo.

6. **Incumplimiento:** Si un equipo no completa el draft en el tiempo límite, se le asigna la aeronave por defecto del rol correspondiente.

---

## TÍTULO III — TAMAÑO Y ESCALABILIDAD

### Artículo 8. Fases de Escalamiento

1. El tamaño del torneo es **escalable por fases**:

| Fase | Alcance | Equipos mínimo | Equipos máximo | Jugadores (máx.) |
|---|---|---|---|---|
| **F1** | Escuadrón principal | 4 | 8 | 48 |
| **F2** | Principal + anexos | 8 | 16 | 96 |
| **F3** | Conjunto + aliados | 16 | 32 | 192 |
| **F4** | Partner oficial | A definir | A definir | A definir |

2. **Requisitos de promoción:** La promoción de una fase a la siguiente requiere:
   - Suficientes pilotos activos para cubrir el mínimo de equipos.
   - Disponibilidad de slots de tiempo en el calendario.
   - Acuerdo institucional (Art. 47).

3. **Desescalamiento:** Si no se alcanza el mínimo de equipos en una fase, se juega la fase inmediata anterior o se cancela la edición, sin sanción para los inscriptos.

4. **F1 (escuadrón principal):** Aplica cuando el torneo es exclusivamente para miembros del escuadrón principal.

5. **F2 (con anexos):** Aplica cuando se incorporan escuadrones anexos (Art. 7 ter).

6. **F3 (con aliados):** Aplica cuando se incorporan escuadrones aliados (Art. 7 quater). Requiere autorización del Propietario (Art. 42).

---

## TÍTULO IV — DURACIÓN Y CALENDARIO

### Artículo 9. Duración Estándar

1. **F1 (4-8 equipos):** 1 fin de semana.
   - Día 1 (sábado): Fase Swiss completa.
   - Día 2 (domingo): Fase de eliminación.

2. **F2 (8-16 equipos):** 1 fin de semana extendido (viernes noche a domingo).

3. **F3 (16-32 equipos):** 2 fines de semana consecutivos.

### Artículo 10. Calendario y Plazos

1. **Convocatoria:** publicada al menos 7 días corridos antes del inicio.

2. **Cierre de registro:** 48 horas antes del inicio.

3. **Publicación del bracket:** 24 horas antes del inicio.

4. **Horarios:** definidos por la Administración en cada convocatoria, con confirmación de los capitanes.

5. **Duración máxima por partida:** según el formato del juego (partidas de 6 minutos aproximadamente).

### Artículo 11. Suspensión y Reprogramación

1. **Suspensión por causa de fuerza mayor:** Si el servidor del juego no está disponible, el torneo se suspende y se reprograma.

2. **Reprogramación:** la nueva fecha se comunica por los canales oficiales con al menos 48 horas de antelación.

3. **Cancelación:** si no se puede reprogramar, la edición se cancela sin sanción para los participantes.

---

## TÍTULO V — PREMIOS Y RECONOCIMIENTOS

### Artículo 12. Premios por Fase

1. **F1 (escuadrón principal):**
   - **Sin premio material.**
   - **Reconocimiento interno:** badge en el perfil del piloto ganador ("🏆 Campeón Torneo Interno F1") durante un (1) período evaluable.
   - **Mención honorífica** en el canal oficial del escuadrón.

2. **F2 (con anexos):**
   - **Sin premio material.**
   - **Reconocimiento interno** por equipo ganador.
   - **Registro en el historial** de torneos internos (Art. 22).

3. **F3 (con aliados):**
   - **Premio a definir** por acuerdo institucional (Art. 47).
   - Posibilidad de premio simbólico, oro del juego, o reconocimiento externo.

4. **F4 (partner oficial):**
   - **Premio a definir** en la convocatoria específica.

### Artículo 13. Regla General de Premios

1. Ningún premio material afecta la evaluación, el aporte, los ascensos, los descensos, las vacantes ni los derechos de los miembros (Art. 18 bis.2 y Art. 18 bis.6).

2. La entrega de premios es **informativa y recreativa**. No genera derechos adquiridos ni expectativas de repetición.

3. Los premios simbólicos (badges, menciones) se registran en el perfil del piloto o en el historial del torneo.

---

## TÍTULO VI — CONDUCTA Y SANCIONES

### Artículo 14. Conducta Esperada

1. El torneo está sujeto a las reglas de convivencia del Art. 37 (conducta y respeto).

2. Todos los participantes deben:
   - Respetar a rivales, compañeros y organizadores.
   - Utilizar lenguaje adecuado en canales oficiales.
   - Cumplir los horarios establecidos.
   - Reportar resultados de buena fe.

### Artículo 15. Faltas Específicas del Torneo

1. **Ausencia sin aviso** de un equipo en una partida programada.

2. **Uso de aeronaves baneadas** o fuera del draft.

3. **Manipulación de resultados** o colusión con el equipo rival.

4. **Conducta antideportiva** (insultos, provocación sistemática, etc.).

5. **Incumplimiento del draft** (no completar bans/picks en tiempo).

### Artículo 16. Medidas Aplicables

Conforme al Art. 39 de la normativa principal:

| Medida | Aplicación |
|---|---|
| **Orientación** | Aviso por canal oficial. |
| **Advertencia formal** | Registro en auditoría. |
| **Descalificación del equipo** | Medida grave. Decisión conjunta del Propietario y los Administradores. |
| **Inhabilitación temporal** | Máximo un (1) período evaluable para torneos futuros. |

### Artículo 17. Procedimiento

1. Se aplican las garantías del Art. 40: derecho a presentar versión, revisión por autoridad distinta.

2. **Plazo para presentar versión:** 3 días corridos desde la notificación.

3. **Plazo para solicitar revisión:** 5 días corridos desde la decisión.

4. **Resolución de revisión:** 10 días corridos desde la solicitud.

5. **Registro:** todas las sanciones se registran conforme al Art. 22.

---

## TÍTULO VII — REGISTRO Y TRAZABILIDAD

### Artículo 18. Registros Mínimos

1. **Por torneo:**
   - Nombre del torneo y fase (F1/F2/F3/F4).
   - Fechas y horarios.
   - Equipos inscriptos y pilotos por equipo.
   - Bracket completo con resultados.
   - Drafts por partida.
   - Sanciones aplicadas (si las hubo).
   - Ganador final y reconocimiento otorgado.

2. **Fuente válida:** la aplicación de control del escuadrón. Si la app no soporta alguna función, se aplica el procedimiento manual provisional del Art. 46.

3. **Conservación:** los registros se conservan durante al menos un (1) año (Art. 50).

### Artículo 19. Publicación

1. Al finalizar el torneo, la Administración publica en el canal oficial:
   - Bracket final.
   - Ganador y reconocimientos.
   - Estadísticas básicas (si la app las permite).

2. La publicación no requiere aprobación adicional.

---

## TÍTULO VIII — FUNCIONES DE LA APLICACIÓN

### Artículo 20. Funciones Requeridas

Las siguientes funciones del torneo requieren desarrollo en la app de control. Mientras no estén implementadas, se usa el procedimiento manual del Art. 46.

| Función | Estado actual | Alternativa manual |
|---|---|---|
| Registro de torneos | ❌ No implementado | Planilla + canal oficial |
| Registro de equipos y pilotos | ❌ No implementado | Planilla |
| Bracket Swiss (automático) | ❌ No implementado | Planilla + sorteo |
| Bracket Eliminación | ❌ No implementado | Planilla |
| Draft (bans + picks) | ❌ No implementado | Sala de Discord con moderador |
| Registro de resultados por partida | ❌ No implementado | Planilla + screenshot |
| Reconocimiento (badge) | ❌ No implementado | Mención en canal oficial |
| Historial de torneos | ❌ No implementado | Repositorio oficial |

### Artículo 21. Roadmap de Implementación

1. El plan de implementación técnica por fases se documenta en `docs/rfc/RFC-002-sistema-torneos.md`.

2. La app debe exponer el campo `type` de `plane_models` para verificar los roles en el draft.

3. La app debe permitir el registro de equipos, el bracket y los resultados.

4. Mientras no esté implementado, la Administración usa planillas y el canal oficial.

---

## TÍTULO IX — ESCALAMIENTO Y MODIFICACIONES

### Artículo 22. Escalamiento

1. Este Anexo contempla el escalamiento por fases (F1 → F2 → F3 → F4).

2. Cada promoción de fase requiere:
   - Acuerdo institucional (Art. 47).
   - Actualización de este Anexo con las particularidades de la fase.

### Artículo 23. Modificaciones

1. Cualquier modificación sustancial de este Anexo sigue el procedimiento del Art. 51.

2. **Revisión periódica:** al menos cada seis (6) meses o al cerrar cada ciclo anual de torneos.

3. **Derogación de reglas anteriores:** toda práctica previa incompatible con este Anexo queda derogada desde su entrada en vigor.

---

## TÍTULO X — CANALES OFICIALES DEL TORNEO

### Artículo 24. Canales oficiales

1. Los canales oficiales del torneo son:

   a) **Discord del escuadrón** — canal principal de coordinación, comunicación y draft.
   b) **Aplicación de control** — fuente válida para registros, brackets y resultados.
   c) **Canal oficial del escuadrón** — para publicación de convocatorias y resultados finales.

2. **Estructura mínima de Discord para torneos:** la Administración habilita una categoría específica con los siguientes canales:

   | Canal | Propósito |
   |---|---|
   | `#torneo-general` | Coordinación general, anuncios, horarios |
   | `#torneo-draft` | Sala de draft por equipo (bans + picks) |
   | `#torneo-resultados` | Publicación de resultados (complementario a la app) |
   | `#torneo-soporte` | Consultas y resolución de incidencias |

3. **Moderación:** la Administración designa un **moderador por torneo** en la convocatoria. El moderador es responsable de:
   - Coordinar los horarios.
   - Supervisar los drafts.
   - Verificar los resultados reportados.
   - Escalar incidencias al Propietario o a los Administradores.

4. **Fuente válida:** la **aplicación de control es la fuente válida** en caso de discrepancia entre Discord y la app (Art. 21).

5. **Caída de Discord:** si Discord no está disponible, se usa el canal oficial alternativo designado en la convocatoria (ej. WhatsApp del escuadrón) y se registra la incidencia conforme al Art. 22.

6. **Registro de comunicaciones:** las comunicaciones relevantes del torneo (drafts, resultados, sanciones) se registran en la app o, si no está disponible, en el repositorio oficial designado (Art. 21).

7. **Confidencialidad:** los canales del torneo son de acceso restringido a miembros del escuadrón. No se divulga información interna fuera del escuadrón sin autorización del Propietario (Art. 37 y Art. 42).

### Artículo 25. Coordinación de horarios

1. Los horarios se publican en `#torneo-general` al menos 48 horas antes del inicio.

2. Los capitanes confirman disponibilidad en `#torneo-general` dentro de las 24 horas posteriores a la publicación.

3. Si un equipo no confirma, se le asigna el horario por defecto definido en la convocatoria.

4. Cambios de horario requieren acuerdo entre los dos capitanes y notificación al moderador.

---

## DISPOSICIONES TRANSITORIAS

### Primera. Entrada en vigor

Este Anexo entra en vigor junto con la Normativa v3.0, conforme al Art. 47.

### Segunda. Primer torneo (F1)

1. El primer torneo interno se organiza conforme a F1 (escuadrón principal).

2. El formato es Swiss + Single Elimination (Art. 4).

3. Tamaño: mínimo 4, máximo 8 equipos.

4. Duración: 1 fin de semana.

5. Premios: sin premio material (badge + mención).

### Tercera. Regularización de torneos previos

1. Los torneos organizados informalmente antes de la entrada en vigor de este Anexo no se invalidan.

2. Se registran en el historial como "torneos pre-reglamentarios".

---

## ANEXO — REFERENCIAS NORMATIVAS

- **Normativa v3.0:** Art. 6 bis (Anexos), Art. 18 bis (Torneos), Art. 21 (Registro), Art. 22 (Trazabilidad), Art. 37 (Conducta), Art. 39 (Medidas), Art. 40 (Revisión), Art. 42 (Representación externa), Art. 43 (Canales oficiales), Art. 44 (Aplicación de control), Art. 46 (Limitación tecnológica), Art. 47 (Aprobación), Art. 50 (Conservación), Art. 51 (Modificaciones).
- **RFC-002:** Sistema de Torneos Internos.
- **Fuente oficial MCS:** Matcherino (formato Swiss + Single Elimination, 5v5, Unique Roles, 1 ban, Mirrored Picks, Priority Target).

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**
**Anexo III — Régimen de Torneos Internos v1.0 · 2026-10-12 · Documento vivo**