# 📖 Manual de Usuario y Piloto - PARAGUAY-FFAA | METALSTORM

> **Manual Operativo Oficial para Pilotos y Oficiales del Escuadrón PARAGUAY FFAA `[PRY]` en MetalStorm (Versión v4.5.8).**

---

## 1. Acceso a la Plataforma, Login Dual y Credenciales

### 1.1 Inicio de Sesión con Google (OAuth 2.0)
La plataforma permite autenticación táctica federada de alta seguridad mediante Google:
1. En la pantalla de bienvenida o en el modal de inicio de sesión, pulsa el botón táctico **"Iniciar sesión con Google"**.
2. Serás redirigido a la pantalla oficial de selección de cuentas de Google.
3. Autoriza el acceso con tu cuenta de Google habitual.
4. **Si tu cuenta ya está vinculada:** El sistema te autenticará instantáneamente, emitiendo tu token JWT militar y dirigiéndote al Dashboard de combate.
5. **Si es tu primer acceso con esa cuenta:** El sistema activará de forma automática el flujo de **Vinculación de Cuenta**.

### 1.2 Vinculación de Cuenta de Combate (Terminal `/link-account`)
Para asociar una cuenta de Google a tu expediente existente en el escuadrón `[PRY]`:
1. Tras seleccionar tu cuenta en Google por primera vez, el sistema te redirigirá a la terminal táctica **"Vincular Cuenta Google"** (`https://paraguay-ffaa-metalstorm.fly.dev/link-account`).
2. En el formulario militar de vinculación:
   - El campo **"Correo de Google"** mostrará de forma protegida tu dirección de Gmail detectada.
   - En el campo **"Indicativo Militar (Callsign)"**, ingresa tu nick de combate registrado en el escuadrón (por ejemplo: `VIPER`).
   - En el campo **"Contraseña Militar Actual"**, escribe la contraseña que usas habitualmente en la plataforma.
3. Pulsa **"Vincular y Continuar"**.
4. **Validación C4ISR:** El servidor verificará tus credenciales institucionales. Al comprobarse la autenticidad, asociará tu `google_id` y tu correo de Gmail de manera permanente a tu expediente (`google_linked: true`).
5. A partir de ese momento, podrás ingresar con **un solo clic** mediante el botón de Google o mediante el login tradicional dual.

### 1.3 Inicio de Sesión Tradicional Dual
Si prefieres ingresar con correo y contraseña:
1. En el campo **"Correo Institucional / Gmail"**, ingresa cualquiera de tus correos reconocidos:
   - Tu correo institucional `@ffaa.py` (ej: `viper@ffaa.py`).
   - O tu dirección real de **Gmail** previamente vinculada.
2. Ingresa tu contraseña militar en el campo inferior.
3. Pulsa el botón **"Iniciar Sesión Táctica"**.

### 1.4 Primer Acceso y Reclutas (Flujo de Contraseña Temporal y Cambio Forzado)
1. Abre el enlace oficial de combate: [https://paraguay-ffaa-metalstorm.fly.dev/](https://paraguay-ffaa-metalstorm.fly.dev/).
2. Ingresa tus credenciales oficiales proporcionadas por tu Oficial de Mando:
   - **Correo Institucional / Identificador:** Tu correo registrado (ej: `callsign@ffaa.py` o correo personal).
   - **Contraseña Temporal:** Formato militar criptoseguro de alta entropía `MS-XXXX-XXXX` (ejemplo real entregado por el ADMIN: `MS-MJWT-SU3U`).
   - **📱 Acceso Rápido por QR:** La credencial JPG incluye un código QR. Al escanearlo con la cámara del celular, la app se abre con tu **Nick** y **contraseña temporal** ya precargados. **Vos** debés pulsar **"Iniciar Sesión Táctica"**. El QR **no inicia sesión automáticamente**.
   - **⏱ Vencimiento:** La contraseña temporal tiene una validez de **7 días** desde su emisión. Si no la usás antes de ese plazo, caduca y debe solicitarse una nueva al Comando.
3. **Cambio Obligatorio de Contraseña:** Al autenticarte por primera vez con una clave temporal, el sistema detecta `must_change_password: true` y desplegará de inmediato el modal táctico de **Actualización de Clave Táctica**:
   - Tu nueva contraseña debe cumplir con los requisitos reglamentarios militares: **mínimo 8 caracteres, al menos 1 letra mayúscula (A-Z), 1 letra minúscula (a-z) y 1 número (0-9)**.
   - El formulario valida en tiempo real la fortaleza de la clave ingresada.
4. **⚠️ NOTA OPERATIVA SOBRE EL MODAL (Pulsar ENTER para Confirmar):**
   - **Aviso:** El modal de cambio de contraseña forzado puede no mostrar los botones de pie de página de forma visible en ciertas resoluciones o navegadores.
   - **Instrucción:** Esta incidencia visual no afecta la funcionalidad del sistema. Una vez completados los campos de **"Nueva Clave Militar Cifrada"** y **"Confirmar Nueva Clave"**, simplemente **presiona la tecla `ENTER`** en el teclado para procesar y registrar el cambio de contraseña de inmediato.
   - *(Fix de interfaz pendiente: Integración de botón persistente "Actualizar Credencial" en el pie del modal).*
5. **Confirmación y Acceso Operacional:** Al procesarse la nueva clave, el servidor actualiza tu registro en la base de datos Supabase (`must_change_password = false`, `token_version` incrementa a `2`), emite tu credencial de sesión definitiva e ingresarás directamente al **Cuadro de Mando Operacional (Dashboard)**.
6. A partir de ese instante, tu clave temporal queda revocada y tus próximos inicios de sesión deberán realizarse con tu nueva contraseña personal.

### 1.5 Recuperación Autónoma de Contraseña (15 Minutos)
Si has olvidado tu contraseña de combate, puedes restablecerla por ti mismo mediante canal seguro:

1. En el modal de inicio de sesión, pulsa en el enlace **"¿Olvidaste tu clave?"**.
2. Ingresa tu correo electrónico registrado (puedes utilizar tu correo institucional `@ffaa.py` o tu Gmail vinculado).
3. Presiona **"Enviar Enlace Táctico"**.
4. Recibirás en tu bandeja de entrada un correo con diseño C4ISR militar con un **enlace de autorización de un solo uso válido por 15 minutos**.
5. Abre el enlace (te llevará a `/reset-password?token=...`), introduce tu nueva contraseña (mínimo 8 caracteres), confírmala y presiona **"Actualizar Contraseña"**.
6. **Seguridad Anti-Sesión Fantasma:** Al completarse el restablecimiento, todas las sesiones activas previas quedarán invalidadas inmediatamente.

> **⚠️ LIMITACIÓN CRÍTICA — LEER ANTES DE USAR:**
> Este flujo **solo funciona si tu cuenta tiene un Gmail real vinculado** (`email = @gmail.com` + `google_linked: true`).
>
> - **Si vinculaste tu Gmail:** Podrás recibir el correo y restablecer tu clave por ti mismo.
> - **Si NO vinculaste tu Gmail:** El sistema intentará enviar el correo a tu dirección `@ffaa.py`, pero rebotará porque el dominio no existe. **No podrás recuperar tu clave por email.**
>
> **En ese caso, el camino es:**
> - Contactar a un oficial `ADMIN` u `OWNER` por WhatsApp/Discord.
> - El oficial te entregará una clave temporal `MS-XXXX-XXXX`.
> - Deberás cambiarla al ingresar (ver §1.4).
>
> **Recomendación:** Vinculá tu Gmail real cuanto antes desde `/link-account` para poder recuperar tu clave por ti mismo en el futuro.

### 1.6 Si tu cuenta fue inactivada

Si un oficial `ADMIN` u `OWNER` ha inactivado tu cuenta, **no podrás ingresar al sistema por ningún medio** (login tradicional, Google OAuth, vinculación, ni sesiones JWT vigentes).

Al intentar ingresar, verás un mensaje detallado:

> *"⚠️ ACCESO DENEGADO: Su cuenta ha sido inactivada por el Comandante [NICK] el [FECHA]. No tiene acceso a la plataforma del escuadrón. Comuníquese con el Comando Central para más información."*

**El mensaje incluye:**
- 👤 El indicativo del oficial que ejecutó la baja.
- 📅 La fecha de inactivación.
- 📧 El canal de contacto oficial: `comando.central@ffaa.py`.

**¿Qué hacer si tu cuenta fue inactivada?**
1. **Contactar al Comando Central** por los canales oficiales (WhatsApp/Discord del escuadrón).
2. **Solicitar la reactivación** explicando el motivo.
3. Un oficial `ADMIN` u `OWNER` evaluará tu caso y, si corresponde, reactivará tu cuenta.
4. **Al reactivarse, todos tus datos se conservan** (hangar, historial, rango, tokens). No perdés nada.

**Nota:** Si tu cuenta fue inactivada por error, contactá inmediatamente al Comando Central para corregirlo.

### 1.7 Formas de Iniciar Sesión (v4.4.0)

A partir de v4.4.0 podés iniciar sesión con **cualquiera** de estos identificadores en el campo "Correo Institucional / Gmail":

- 📧 Tu **correo institucional** (`tu_nick@ffaa.py`).
- 📧 Tu **Gmail real** (si lo vinculaste previamente con `/link-account`).
- 🎖️ Tu **nick de combate** (ej: `VIPER`, `FALCON-01`).

En todos los casos, la contraseña debe ser tu clave de combate vigente (o la temporal `MS-XXXX-XXXX` si es tu primer acceso o tras un reseteo).

### 1.7 Asistencia de Mando y Reseteo Administrativo
1. Si no tienes acceso a tu correo electrónico, contacta a un **Oficial ADMIN** o al **Comandante OWNER** a través del grupo oficial de WhatsApp o Discord.
2. El oficial ingresará al panel administrativo y ejecutará el comando de reseteo (`Reset Pass`).
3. El sistema generará una contraseña temporal única `MS-XXXX-XXXX` que el oficial te entregará por canal privado.
4. Al iniciar sesión con dicha clave, deberás definir obligatoriamente tu nueva contraseña.

---

## 2. Guía Operativa de Módulos y Vistas

### 2.1 📊 Cuadro de Mando Táctico (Dashboard C4ISR)

> **Nota:** Si tu cuenta fue inactivada por un oficial, verás el mensaje enriquecido descripto en §1.6 y no podrás acceder al Dashboard hasta que el Comando Central reactive tu cuenta.

- **Semáforo Operacional:** Tu distintivo militar actual (`VERDE`, `NARANJA`, `ROJO`, `NEGRO`).
- **Promedio Personal:** Promedio acumulado de tokens en las últimas semanas evaluadas.
- **Meta del Escuadrón:** Barra de progreso hacia la cuota institucional de **175 tokens promedio** por piloto.
- **Alerta de Pilotos en Riesgo:** Conteo de camaradas en estado rojo o negro que requieren apoyo inmediato.
- **Gráfico de Tendencia Histórica:** Curva de rendimiento personal en contraste con el promedio general.
- **Clasificación Top 5:** Los cinco pilotos más destacados de la semana con mayor contribución al escuadrón.

### 2.2 📝 Registro Semanal de Rendimiento y Tokens
1. Accede a **"Registrar Tokens"** desde el menú táctico o el botón de acción rápida del dashboard.
2. Selecciona el **Evento Activo** (ej: `SQUADRON-2026-36` o evento `BLACK_MARKET`).
3. Ingresa la cantidad de **Tokens Obtenidos** (validado estrictamente hasta 300 tokens).
4. Indica la cantidad de **Días Conectado** durante la semana operativa (de 0 a 7 días).
5. Marca la casilla si volaste en patrulla o formación coordinada (*Vuelo en Grupo*).
6. Opcionalmente añade notas de misión (aeronave utilizada, sector de patrulla o incidencias).
7. Presiona **"Registrar Rendimiento"**. El servidor calculará al instante tu nuevo estado y actualizará tu expediente.

> ⚠️ **Corrección de Datos:** Si te equivocas en el registro, simplemente vuelve a enviar el formulario para el mismo evento. El sistema actualizará tu registro anterior sin duplicados.

#### Selector Táctico de Pilotos para ADMIN y OWNER (Modo Oficial)
Cuando un oficial con rango **`ADMIN`** o **`OWNER`** accede al formulario de rendimiento:
- El sistema consulta automáticamente el endpoint `/api/performances/pilots` y despliega el menú desplegable **"Combatiente Asignado"** (`#performanceTarget`).
- Muestra la dotación completa de combatientes activos (`status = 'ACTIVE'`) del escuadrón ordenados alfabéticamente por su Callsign.
- **Alerta de Modo Oficial:** Al elegir a otro piloto, la interfaz despliega un banner táctico de alta visibilidad:
  `⚠️ Modo Oficial Activo: Estás cargando datos para [CALLSIGN]`.
- **Aislamiento y Trazabilidad:** Esto permite a los mandos registrar o ajustar las marcas de pilotos ausentes sin perder la trazabilidad de la auditoría.
- **Acceso Regular:** Para pilotos `MIEMBRO` o `VETERANO`, el selector permanece restringido a su propia identidad para garantizar la privacidad y prevenir registros cruzados no autorizados.

#### Ventanas de Carga de Performance (ADR-008)

A partir de la versión **v4.3.0**, las **ventanas de carga de performance** están
desacopladas del ciclo del evento. Esto significa que un evento puede figurar
como cerrado y aun así permitir la carga de performance hasta su deadline.

**Reglas operativas:**

| Tipo de evento | Duración de la ventana | Cuándo cierra |
|---|---|---|
| **SQUADRON (SQ)** | 7 días | Jueves 09:00 PY (una semana después del inicio) |
| **BLACK_MARKET (BM)** | 6 días | Martes 17:00 PY (seis días después del inicio) |

**Comportamiento:**

- **Durante la ventana:** podés cargar y editar tu performance con normalidad.
- **Después del cierre:** tu participación queda en **READ-ONLY** (solo lectura).
  No vas a poder modificar los datos ya cargados.
- **Evento SQ cerrado por BM:** si un evento BM reemplaza al SQ (switch funcional),
  la ventana de carga del SQ **sigue abierta** hasta su deadline original. Podés
  seguir cargando performance del SQ aunque el evento ya no esté activo.

**Cómo consultar tu ventana:**

En la vista de eventos activos verás un indicador con el **tiempo restante** para
cargar tu performance. También podés consultar la info detallada vía los endpoints:

- `GET /api/events-v2/:id/submission-window` — ventana de un evento SQ.
- `GET /api/events-v2/bm/:eventId/submission-window` — ventana de un evento BM.

**Excepción — reclamo BM:**

El reclamo (purchase) de un descuento BM **NO valida la ventana**. Esto significa
que podés reclamar tu descuento independientemente del deadline de carga.

**Referencias:**

- ADR-008: `docs/adr/ADR-008-ventanas-carga-desacopladas.md`
- API: `API_REFERENCE.md` §3.5.5

### 2.3 ✈️ Hangar Militar & Starform Upgrades 2.0 (Rediseño v3.9.9)
El módulo de Hangar te permite registrar y calibrar tus cazas seleccionando entre el **catálogo oficial de 44 aeronaves de combate** (F-22 Raptor, Su-57 Felon, F-35 Lightning II, Eurofighter Typhoon, Dassault Rafale, JAS 39 Gripen, J-20, Su-35, A-10C Thunderbolt II, MiG-29, Mirage 2000, etc.) y gestionar sus especificaciones:

#### Árbol de Nodos de Upgrades 2.0

El sistema de Upgrades 2.0 se apoya en un árbol de nodos técnicos almacenado en la tabla `upgrade_nodes_v2` (3.072 configuraciones). Cada nodo define:

- **Sistema base:** Fuselaje, Motor, Aviónica o Armas.
- **Nivel:** de 0 a 8.
- **Ruta:** A o B (a partir del nivel 5).
- **Efectos cuantitativos:** bonus aplicados a stats (velocidad, agilidad, blindaje, etc.).
- **Costo:** piezas estándar + componentes avanzados.

**Cómo se refleja en tu Hangar:**
- Al seleccionar una aeronave, el sistema consulta los nodos disponibles en `upgrade_nodes_v2`.
- Los sliders del **Upgrade Planner** te permiten simular subidas de nivel y ver el impacto en stats.
- Los bonos se aplican automáticamente a la telemetría de combate (`GET /api/planes/:id/stats`).

**Ejemplo de nodo:**
- Sistema: Motor
- Nivel: 6
- Ruta: B
- Efecto: +15% aceleración con postcombustión
- Costo: 1.800 piezas + 100 componentes avanzados

#### Rediseño de Navegación del Hangar:
- **Vista 1 — Cuadrícula Táctica de Cazas (Grid View):**
  - Despliegue de los 44 cazas en un grid de tarjetas adaptativo (`overrideCarouselCardClick`).
  - Cada tarjeta presenta el identificador militar, silueta, modelo y nivel actual.
  - Al hacer clic sobre cualquier tarjeta, accedes directamente a la vista en profundidad del caza sin rotaciones innecesarias.
- **Vista 2 — Pantalla de Detalle Dedicada (Dedicated View):**
  - Al seleccionar un caza (`openAircraftDetailView`), la interfaz activa la pantalla en profundidad `.aircraft-detail-mode`.
  - **Cabecera Táctica de Navegación:** Dispone de un botón destacado **`← VOLVER AL HANGAR`** para retornar instantáneamente a la cuadrícula general.
  - **Acceso Rápido a Upgrades 2.0:** Cada tarjeta de subsistema (Fuselaje, Motor, Aviónica, Armas) cuenta con botones directos `IR A EDICIÓN DE [SECCIÓN]`, abriendo la calibración del sistema específico sin salir de la ficha.

#### Gestión de Sistemas Mecánicos y Mods:
- **Nivel de Aeronave:** Rango de 1 a 20.
- **Módulos Pasivos y Habilidades Especiales:** Selección de configuraciones según el catálogo oficial con previsualización gráfica de iconos de habilidades.
- **Sistemas Mecánicos Upgrades 2.0 (Niveles 0 a 8):**
  - 🛡️ **Fuselaje:** Blindaje, reducción de firma de radar y resistencia estructural.
  - 🚀 **Motor:** Empuje vectorial, aceleración con posquemador y velocidad máxima.
  - 📡 **Aviónica:** Radar AESA, bloqueo de misiles y contramedidas electrónicas (ECM).
  - 💥 **Armas:** Cadencia de cañón rotativo y letalidad de misiles aire-aire.
- **10 Mods Tácticos Oficiales (m1 a m10 en 5 niveles):** Giro Temerario, Maniobrabilidad Ideal, Resistencia a Explosiones, etc., con telemetría visual de bonificaciones porcentuales.
- **Gestión de Recursos de Taller:** Control de piezas estándar (`recursos_piezas`) y componentes avanzados (`recursos_avanzadas`) requeridos para cada mejora.

#### Información de la Wiki y Traducción Oficial al Español (i18n):
- 📜 **Historia de la Aeronave:** Trivia y contexto histórico de combate traducido al **español** (`historia_es`, con degradación suave a inglés si fuese necesario).
- 💡 **Recomendaciones de Uso:** Consejos tácticos completos (Trait Tips, Ability Tips y Passive Tips) traducidos al **español** (`recomendaciones_es`).
- 🎯 **Traducción de Rasgos de Combate (13 Traits):** Mapeo de términos oficiales (`Blindaje Reforzado`, `Motores Fríos`, `Altitud de Crucero`, `Ala Delta`, `Cañones Expertos`, `Autoridad Total`, `Dispara y Olvida`, `Ala Leal`, `Sigilo`, `Ala Variable`, `Inversor de Empuje`, `Cañones Inestables`, `Motores Inestables`).
- 🎨 **Galería de Paints:** Galería visual con más de 310 pinturas oficiales clasificadas por rareza y desbloqueo.
- 🪟 **Galería de Canopies:** 176 cabinas tácticas visuales con requisitos de nivel.
- 🎯 **Armamento Detallado:** Ficha balística completa con DPS, alcance, tiempos de lock-on y dotación de misiles.

### 2.4 👤 Expediente Militar y Perfil del Piloto
- Visualiza tu Callsign oficial, correo y rango asignado.
- Actualiza tus datos de contacto (teléfono para alertas tácticas, bio de combate y discord).
- **Cambio Voluntario de Contraseña:**
  1. Ve a la sección **"Seguridad de la Cuenta"**.
  2. Introduce tu **contraseña actual**.
  3. Escribe tu **nueva contraseña** (mínimo 8 caracteres).
  4. Confirma la nueva contraseña y presiona **"Actualizar Contraseña"**.

### 2.4b Cambio de Nick desde Mi Perfil (v4.5.0)

A partir de la v4.5.0, podés cambiar tu **nick** (indicativo de combate) directamente desde **Mi Perfil**.

#### ¿Cuántas veces puedo cambiar mi nick?

Depende de tu rango:

| Rango | Cambios permitidos |
|---|---|
| **MIEMBRO** | 1 cambio autogestionado (después queda fijo). |
| **VETERANO** | 1 cambio autogestionado (después queda fijo). |
| **ADMIN** | Ilimitado (cada cambio se audita). |
| **OWNER** | Ilimitado (cada cambio se audita). |

#### Formato válido del nick

Podés usar **letras (incluye tildes y ñ), números, espacios, punto, guión bajo y guión medio**. Longitud: 3 a 30 caracteres.

**Ejemplos válidos:**
- `Luqueño`
- `TestPiloñ`
- `José Ángel`
- `Comandante_Ríos-01`
- `Test.Pilot 2026`

**Ejemplos inválidos:**
- `AB` (muy corto).
- `Test@Pilot` (@ no permitido).
- `[PRY]Test` (corchetes no permitidos).
- Nombres de 31+ caracteres.

#### ¿Cómo cambio mi nick?

1. Andá a **Mi Perfil** (menú superior o drawer móvil).
2. En el formulario **"Datos Personales"**, encontrá el campo **"Nickname / Indicativo de Combate"**.
3. Si tenés cambios disponibles, verás el mensaje: *"💡 Podés cambiar tu nick una vez. Elegí bien: después queda fijo."*
4. Editá el campo con tu nuevo nick.
5. Aparecerá el botón **"💾 Guardar Nick"**.
6. Hacé click y confirmá el cambio en el diálogo.
7. El sistema valida el formato, la unicidad y tu límite de cambios, y aplica el cambio.

#### ¿Qué pasa con mi nick viejo?

- **Perfil y login:** pasan a usar el nuevo nick.
- **Login con nick viejo:** deja de funcionar.
- **Histórico de rendimiento (`performances.nick`):** **NUNCA se toca**. Los eventos que volaste con el nick viejo siguen mostrando ese nick en tu historial. Es un snapshot inmutable.

#### ¿Qué pasa con mi email institucional?

Si tu email institucional había sido **auto-generado desde tu nick viejo** (ej: nick `TestPilot` → email `testpilot@ffaa.py`), el sistema lo actualiza automáticamente al nuevo nick.

Si el email fue **editado manualmente por un admin** (ej: `comando@ffaa.py` para el nick `TestPilot`), **NO se toca**.

#### ¿Qué pasa si ya usé mi cambio y quiero otro?

Contactá a un **Administrador**. Los ADMIN/OWNER pueden ejecutar cambios adicionales desde el panel administrativo (auditados).

#### Códigos de error que podés encontrar

- **NICK_FORMAT_INVALID:** el formato del nick no cumple las reglas.
- **NICK_TAKEN:** el nick ya está en uso por otro piloto.
- **NICK_CHANGE_LIMIT_REACHED:** ya usaste tu cambio autogestionado.

---

### 2.5 📚 Centro de Normativas y Protocolos
- Consulta reglamentos disciplinarios, códigos de conducta y protocolos de combate aprobados por la Comandancia.
- Descarga en tu dispositivo las directivas operativas oficiales emitidas en formato textual/PDF.

### 2.6 📥 Centro de Exportación de Datos (Admin & Owner)
- Disponible para oficiales en el menú superior. Permite descargar reportes completos de actividad en formato CSV sanitizado contra inyecciones de fórmulas, listo para análisis en Excel o Google Sheets.

### 2.7 🛡️ Panel de Administración Militar (Oficiales ADMIN y OWNER)
La consola de administración permite supervisar y gestionar a toda la dotación militar del escuadrón:
- **Pestañas Tácticas de Estado (v4.0.0):**
  - `🟢 Activos (N)`: Lista exclusivamente a los pilotos operativos en servicio activo.
  - `🔴 Inactivos (N)`: Padrón de pilotos dados de baja con visualización directa del motivo, comandante ejecutor y fecha.
  - `📋 Todos (N)`: Dotación militar total consolidada del escuadrón.
  - Los contadores numéricos se actualizan en vivo con cada cambio de estado.
- **Métricas C4ISR en Tiempo Real:** Cada piloto cuenta con:
  - **Promedio de Tokens (`avg_tokens`):** Promedio acumulado de todas las semanas evaluadas.
  - **Semanas Evaluadas (`weeks_evaluated`):** Total de eventos en los que el combatiente ha reportado tokens.
  - **Estado Semáforo Militar (`perf_status`):** Distintivo en tiempo real (`VERDE`, `NARANJA`, `ROJO`, `NEGRO` o `PENDIENTE`) calculado conforme al Artículo 26 del Reglamento.
- **Gestión Reglamentaria de Bajas y Reactivaciones (v4.0.0):**
  - **Dar de Baja / Inactivar:** Al pulsar el botón de baja, el sistema despliega el **Modal Táctico de Inactivación**. Es obligatorio registrar un motivo justificado (mínimo 10 caracteres, máximo 500) seleccionando una causa reglamentaria estándar (baja voluntaria, bajo rendimiento reiterado, inactividad prolongada, sanción disciplinaria) o ingresando una descripción personalizada. *(Ver detalles y protocolos en `POLITICA_INACTIVACION.md`)*.
  - **Reincorporar / Reactivar:** Al pulsar reactivar, se abre el **Modal Táctico de Reactivación** donde se puede registrar un motivo opcional de retorno (hasta 300 caracteres). Al confirmar, el piloto recupera inmediatamente el acceso a la plataforma.
  - **Regularización de Motivos Históricos:** En la pestaña de Inactivos, si un piloto veterano no cuenta con motivo documentado, se resalta la advertencia `⚠️ Sin motivo` junto a un botón `✏️ Completar` que permite asentar el motivo correspondiente en su legajo.
  - **Protección de Jerarquía:** El `OWNER` está blindado contra toda inactivación; los `ADMIN` solo pueden gestionar a `MIEMBRO` y `VETERANO`.
- **Filtros Operativos:** Filtrado instantáneo por Rango (`OWNER`, `ADMIN`, `VETERANO`, `MIEMBRO`) y por Estado del Semáforo.
- **Acciones Rápidas Complementarias:**
  - **Reseteo Táctico de Clave:** Generación de clave temporal `MS-XXXX-XXXX` criptosegura.
  - **Ascensos y Descensos de Rango:** Ajuste jerárquico sujeto a cuotas militares.

### 2.8 ✈️ Gestión del Catálogo de Aeronaves (ADMIN y OWNER)
Los Oficiales `ADMIN` y el Comandante `OWNER` disponen de la consola táctica de **Catálogo de Cazas**:
- **Acceso:** Desde la barra de navegación superior (**Catálogo Cazas**), el menú lateral táctico (**Catálogo de Cazas**), o desde el Panel de Administración / Centro de Control Owner.
- **Visualización y Métricas:**
  - Métricas de flota: Total de modelos, modelos activos en servicio, modelos en reserva/desactivados y cazas de alta gama (Tier 4 y 5).
  - Tarjetas de aeronaves con estadísticas reales: Velocidad máxima, agilidad de maniobra, blindaje estructural, potencia de fuego, habilidad especial con descripción por nivel y habilidad pasiva.
- **Agregar Nuevo Modelo:**
  1. Pulsa el botón **"+ Nueva Aeronave"**.
  2. Completa los datos: ID único del modelo (ej: `125`), Nombre oficial (ej: `F-15EX Eagle II`), Tipo/Rol militar, Tier (1 al 5).
  3. Parámetros de combate: Velocidad (km/h), Agilidad, Blindaje, Potencia de Armas.
  4. Habilidades: Nombre de la Habilidad Especial y Pasiva con sus descripciones de progresión por niveles (Nivel 1 y Nivel 2).
  5. Pulsa **"Guardar Aeronave"**. El modelo quedará disponible inmediatamente para todos los pilotos del escuadrón.
- **Editar Modelo:**
  - En la tarjeta del caza, pulsa el botón **"✏️ Editar"**. Permite recalibrar estadísticas de vuelo, nombres y habilidades sin alterar el historial de los pilotos.
- **Desactivar Aeronave (Soft-Delete):**
  - Pulsa **"🚫 Desactivar"**. El avión dejará de aparecer en la lista de compras del hangar de los pilotos regulares, pero se conservará intacto en los hangares y registros de quienes ya lo hayan adquirido.
- **Reactivar Aeronave:**
  - Filtrando por "Solo Inactivos", pulsa **"✅ Reactivar"** para devolver la aeronave al servicio activo de inmediato.

---

## 3. Operación Black Market (BM) - v3.7.0

El **Black Market** es un evento táctico especial de alta prioridad que se celebra cada 1 a 2 meses en reemplazo temporal del Squadron Event regular.

### 3.1 Reglas Generales y Calendario
- **Duración:** Exactamente **5 días continuos de combate** (iniciando el miércoles y concluyendo el domingo a las 23:59:59).
- **Puntuación Máxima:** **250 puntos BM** acumulables (máximo 50 puntos por día).
- **Descuento Máximo:** **50% de descuento** en la adquisición del caza táctico exclusivo en oferta.
- **Relación de Canje:** Cada punto BM acumulado otorga un **0.2% de descuento** ($250 \text{ pts} \times 0.2\% = 50\%$).

### 3.2 Tipos de Misiones Diarias (3 por Día)
Cada día se activan 3 misiones simultáneas:
1. **✈️ Dedicación:** Volar aviones con roles específicos del escuadrón (por ejemplo, *Caza de Superioridad Aérea*, *Interceptor* o *Bombardero Táctico*).
2. **🏆 Habilidad:** Alcanzar o volar aviones con una cantidad mínima de trofeos de combate (escala progresiva de 100 a 800 trofeos, con incremento de +150 por día).
3. **👥 Trabajo en Equipo:** Volar en formación con compañeros del escuadrón (de 2 a 6 compañeros, sumando +1 compañero por día).

### 3.3 Sistema de Puntos y Bonificación Diaria
- **Puntaje Base:** Cada misión cumplida otorga **+25 puntos BM**.
- **Bonus Diario:** Al completar **las 3 misiones del día**, el piloto recibe un **Bonus de +25 puntos adicionales**, alcanzando el tope diario de **50 puntos**.
- Cumplir los 5 días al 100% asegura los 250 puntos y el descuento total del 50%.

### 3.4 Procedimiento de Reclamo y Descuento
1. Ingresa a la sección **Black Market** desde el menú principal o el botón táctico en el Dashboard.
2. En la pestaña **"🎯 Misiones"**, revisa los objetivos del día actual y marca como cumplidas las misiones realizadas.
3. En la pestaña **"📊 Mi Progreso"**, consulta el desglose día por día, tus puntos acumulados y el porcentaje de descuento desbloqueado.
4. En la pestaña **"✈️ Oferta & Descuento"**, visualiza la ficha técnica completa del caza en promoción, el precio base en tokens y el precio final descontado.
5. Al decidir la compra, presiona **"⚡ Reclamar Aeronave con Descuento Militar"**. La aeronave se registrará automáticamente en tu Hangar personal.

### 3.5 Consola de Gestión para Oficiales (ADMIN / OWNER)
Los Oficiales con rango ADMIN o OWNER disponen de la pestaña **"⚙️ Consola Oficial BM"**:
- **Creación de Eventos:** Programar nuevas fechas de inicio/fin, nombre clave de la operación y asignación del caza en oferta desde el catálogo.
- **Activación / Desactivación:** Alternar el estado activo con un solo clic.
- **Configuración de Misiones:** Agregar, modificar requerimientos o desactivar misiones específicas con soft-delete.
- **Telemetría del Evento:** Monitorear en tiempo real la cantidad de pilotos participantes, puntos totales acumulados y aeronaves adquiridas.

---

## 4. Escala Oficial del Semáforo Militar

La evaluación del combatiente se determina en el servidor considerando **tanto los tokens como los días de conexión**:

| Distintivo | Requisito de Tokens | Días Conectado | Dictamen Militar |
|:---:|:---:|:---:|:---|
| 🟢 **VERDE** | $\ge 175$ tokens | $\ge 4$ días | **Sobresaliente:** Cumplimiento impecable de la meta. Prioridad para ascensos. |
| 🟡 **NARANJA** | $130 - 174$ tokens | $\ge 3$ días | **Advertencia:** Por debajo del estándar del escuadrón. Intensificar patrullas. |
| 🔴 **ROJO** | $100 - 129$ tokens | $\ge 2$ días | **Crítico:** Estado en riesgo. Sujeto a revisión por la Junta de Oficiales. |
| ⚫ **NEGRO** | $< 100$ tokens | $< 2$ días | **Inactivo / Sanción:** Falta grave. Sujeto a pase a retiro o baja inmediata. |

---

## 5. Estructura Jerárquica y Cuotas Militares (RBAC)

Para preservar la disciplina y el orden de mando, el sistema aplica cuotas máximas de oficiales:

- **👑 OWNER (Comandante en Jefe):** Máximo **1**. Comandancia absoluta, auditoría C4ISR, gestión de respaldos, nombramiento de oficiales **y transferencia del mando**.
- **⭐ ADMIN (Oficial de Operaciones):** Máximo **5**. Altas y bajas de combatientes (**incluidos otros ADMIN**), ascensos y descensos de rango (**incluidos ADMIN**), activación de eventos Black Market, carga masiva de tokens y reseteo de claves (**incluidas las de otros ADMIN**). **No puede tocar al OWNER ni transferir el mando.**
- **🎖️ VETERANO (Piloto Distinguido):** Máximo **8**. Pilotos de élite con preferencia en escuadrilla y acceso completo a estadísticas.
- **✈️ MIEMBRO (Piloto de Escuadrón):** Base de combate regular. Registro semanal y gestión de hangar.

---

## 6. Preguntas Frecuentes (FAQ)

**¿Qué debo hacer si no puedo ingresar con mi clave temporal?**  
Verifica que estás respetando las mayúsculas y el guión (ej: `MS-XXXX-XXXX`). Si persiste, solicita a un Oficial que genere una nueva clave temporal.

**¿Por qué mi sesión se cerró sola al cambiar de clave?**  
Por la directiva de seguridad anti-sesión fantasma: cada cambio de clave revoca todos los tokens JWT previos en todos los dispositivos para evitar accesos no autorizados.

**¿Puedo instalar la aplicación en mi teléfono Android o iPhone?**  
Sí. En Chrome para Android presiona el menú de 3 puntos y pulsa **"Instalar aplicación"**. En Safari para iOS presiona el botón **Compartir** y pulsa **"Agregar a la pantalla de inicio"**. La app funcionará en pantalla completa y en modo offline gracias al Service Worker v4.0.0.

**¿Qué ocurre si mi cuenta militar es inactivada?**  
Si tu cuenta es pasada a situación de inactividad, al intentar ingresar el sistema bloqueará el acceso y te informará qué comandante ejecutó la baja militar, la fecha exacta y el motivo reglamentario asentado en tu legajo militar, junto con los canales de contacto de la Comandancia para solicitar audiencia de reincorporación.

**¿Puedo ver la historia y las curiosidades de mi avión?**  
Sí. En la pantalla dedicada o modal de cualquier aeronave encontrarás la sección "📜 Historia de la Aeronave" con la trivia completa traducida al español.

**¿En qué idioma están disponibles la Historia, Recomendaciones y Rasgos de combate?**  
A partir de la versión v3.9.9, las descripciones in-game, historias y recomendaciones tácticas han sido traducidas al español rioplatense mediante DeepL (`_es`), con fallback automático al inglés si faltara algún registro. Además, los 13 rasgos tácticos de combate (*traits*) disponen de terminología militar estandarizada en español (`TRAITS_ES`).

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**  
*Versión: v4.5.8 · Actualizado: 2026-09-22*
