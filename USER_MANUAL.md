# 📖 Manual de Usuario y Piloto - PARAGUAY-FFAA | METALSTORM

> **Manual Operativo Oficial para Pilotos y Oficiales del Escuadrón PARAGUAY FFAA `[PRY]` en MetalStorm (Versión v3.5.0).**

---

## 1. Acceso a la Plataforma, Login Dual y Credenciales

### 1.1 Métodos de Inicio de Sesión (Login Dual)
La plataforma cuenta con modalidades seguras y flexibles de autenticación militar:

#### Opción A: Inicio de Sesión Táctica con Google (OAuth 2.0)
1. En la pantalla de bienvenida o modal de acceso, pulsa el botón **"Iniciar sesión con Google"**.
2. Selecciona tu cuenta de Google.
3. **Primer Acceso (Vinculación de Cuenta):**
   - Si tu cuenta de Google aún no ha sido vinculada, el sistema te redirigirá automáticamente a la pantalla táctica **"Vincular Cuenta Google"** (`/link-account`).
   - Introduce tu **Indicativo de Combate (Callsign)** (ej: `VIPER`) y tu **Contraseña militar actual**.
   - Presiona **"Vincular y Continuar"**. A partir de ese momento, tu cuenta de Google quedará asociada permanentemente a tu expediente del escuadrón y podrás ingresar con un solo clic.
4. **Accesos Posteriores:**
   - Al pulsar "Iniciar sesión con Google", ingresarás directamente sin necesidad de volver a ingresar contraseña.

#### Opción B: Inicio de Sesión Tradicional Dual
1. En el campo **"Correo Institucional / Gmail"**, ingresa cualquiera de tus correos reconocidos:
   - Tu correo institucional `@ffaa.py` (ej: `viper@ffaa.py`).
   - O tu dirección real de **Gmail** previamente vinculada.
2. Ingresa tu contraseña militar en el campo inferior.
3. Pulsa el botón **"Iniciar Sesión Táctica"**.

### 1.2 Primer Acceso y Reclutas
1. Abre el enlace oficial de combate: [https://paraguay-ffaa-metalstorm.fly.dev/](https://paraguay-ffaa-metalstorm.fly.dev/).
2. Ingresa tus credenciales oficiales proporcionadas por tu Oficial de Mando:
   - **Correo Institucional:** Tu correo registrado (ej: `callsign@ffaa.py` o correo personal).
   - **Contraseña Temporal:** Formato militar criptoseguro de alta entropía `MS-XXXX-XXXX` (ejemplo: `MS-8K3P-Q7W2`).
3. **Cambio Obligatorio:** Al autenticarte por primera vez con una clave temporal, el sistema desplegará de inmediato el modal de cambio forzado:
   - Tu nueva contraseña personal debe tener **al menos 8 caracteres**.
   - No utilices secuencias débiles o predecibles.
4. Al guardar tu nueva clave, el sistema registrará tu sesión segura e ingresarás directamente al **Cuadro de Mando Operacional (Dashboard)**.

### 1.3 Recuperación Autónoma de Contraseña (15 Minutos)
Si has olvidado tu contraseña de combate, puedes restablecerla por ti mismo mediante canal seguro:
1. En el modal de inicio de sesión, pulsa en el enlace **"¿Olvidaste tu clave?"**.
2. Ingresa tu correo electrónico registrado (puedes utilizar tu correo institucional `@ffaa.py` o tu Gmail vinculado).
3. Presiona **"Enviar Enlace Táctico"**.
4. Recibirás en tu bandeja de entrada un correo con diseño C4ISR militar con un **enlace de autorización de un solo uso válido por 15 minutos**.
5. Abre el enlace (te llevará a `/reset-password?token=...`), introduce tu nueva contraseña (mínimo 8 caracteres), confírmala y presiona **"Actualizar Contraseña"**.
6. **Seguridad Anti-Sesión Fantasma:** Al completarse el restablecimiento, todas las sesiones activas previas quedarán invalidadas inmediatamente.

### 1.4 Asistencia de Mando y Reseteo Administrativo
1. Si no tienes acceso a tu correo electrónico, contacta a un **Oficial ADMIN** o al **Comandante OWNER** a través del grupo oficial de WhatsApp o Discord.
2. El oficial ingresará al panel administrativo y ejecutará el comando de reseteo (`Reset Pass`).
3. El sistema generará una contraseña temporal única `MS-XXXX-XXXX` que el oficial te entregará por canal privado.
4. Al iniciar sesión con dicha clave, deberás definir obligatoriamente tu nueva contraseña.

---

## 2. Guía Operativa de Módulos y Vistas

### 2.1 📊 Cuadro de Mando Táctico (Dashboard C4ISR)
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

### 2.3 ✈️ Hangar Militar & Starform Upgrades 2.0
El módulo de Hangar te permite registrar tus cazas de combate (F-22 Raptor, Su-57 Felon, F-35 Lightning, Eurofighter Typhoon, Rafale, Gripen, etc.) y gestionar sus especificaciones:
- **Nivel de Aeronave:** Rango de 1 a 20.
- **Módulos Pasivos y Habilidades Especiales:** Selección de configuraciones según el catálogo oficial.
- **Sistemas Mecánicos Upgrades 2.0 (Niveles 0 a 8):**
  - 🛡️ **Fuselaje:** Blindaje, reducción de firma de radar y resistencia estructural.
  - 🚀 **Motor:** Empuje vectorial, aceleración con posquemador y velocidad máxima.
  - 📡 **Aviónica:** Radar AESA, bloqueo de misiles y contramedidas electrónicas (ECM).
  - 💥 **Armas:** Cadencia de cañón rotativo y letalidad de misiles aire-aire.
- **Gestión de Recursos de Taller:** Control de piezas estándar (`recursos_piezas`) y componentes avanzados (`recursos_avanzadas`) requeridos para cada mejora.
- **Ficha Técnica (Modal):** Presiona sobre cualquier caza para abrir la ventana de telemetría completa y especificaciones de combate.

### 2.4 👤 Expediente Militar y Perfil del Piloto
- Visualiza tu Callsign oficial, correo y rango asignado.
- Actualiza tus datos de contacto (teléfono para alertas tácticas, bio de combate y discord).
- **Cambio Voluntario de Contraseña:**
  1. Ve a la sección **"Seguridad de la Cuenta"**.
  2. Introduce tu **contraseña actual**.
  3. Escribe tu **nueva contraseña** (mínimo 8 caracteres).
  4. Confirma la nueva contraseña y presiona **"Actualizar Contraseña"**.

### 2.5 📚 Centro de Normativas y Protocolos
- Consulta reglamentos disciplinarios, códigos de conducta y protocolos de combate aprobados por la Comandancia.
- Descarga en tu dispositivo las directivas operativas oficiales emitidas en formato textual/PDF.

### 2.6 📥 Centro de Exportación de Datos (Admin & Owner)
- Disponible para oficiales en el menú superior. Permite descargar reportes completos de actividad en formato CSV sanitizado contra inyecciones de fórmulas, listo para análisis en Excel o Google Sheets.

---

## 3. Escala Oficial del Semáforo Militar

La evaluación del combatiente se determina en el servidor considerando **tanto los tokens como los días de conexión**:

| Distintivo | Requisito de Tokens | Días Conectado | Dictamen Militar |
|:---:|:---:|:---:|:---|
| 🟢 **VERDE** | $\ge 175$ tokens | $\ge 4$ días | **Sobresaliente:** Cumplimiento impecable de la meta. Prioridad para ascensos. |
| 🟡 **NARANJA** | $130 - 174$ tokens | $\ge 3$ días | **Advertencia:** Por debajo del estándar del escuadrón. Intensificar patrullas. |
| 🔴 **ROJO** | $100 - 129$ tokens | $\ge 2$ días | **Crítico:** Estado en riesgo. Sujeto a revisión por la Junta de Oficiales. |
| ⚫ **NEGRO** | $< 100$ tokens | $< 2$ días | **Inactivo / Sanción:** Falta grave. Sujeto a pase a retiro o baja inmediata. |

---

## 4. Estructura Jerárquica y Cuotas Militares (RBAC)

Para preservar la disciplina y el orden de mando, el sistema aplica cuotas máximas de oficiales:

- **👑 OWNER (Comandante en Jefe):** Máximo **1**. Comandancia absoluta, auditoría C4ISR, gestión de respaldos y nombramiento de oficiales.
- **⭐ ADMIN (Oficial de Operaciones):** Máximo **3**. Altas y bajas de combatientes, activación de eventos Black Market, carga masiva de tokens y reseteo de claves.
- **🎖️ VETERANO (Piloto Distinguido):** Máximo **8**. Pilotos de élite con preferencia en escuadrilla y acceso completo a estadísticas.
- **✈️ MIEMBRO (Piloto de Escuadrón):** Base de combate regular. Registro semanal y gestión de hangar.

---

## 5. Preguntas Frecuentes (FAQ)

**¿Qué debo hacer si no puedo ingresar con mi clave temporal?**  
Verifica que estás respetando las mayúsculas y el guión (ej: `MS-XXXX-XXXX`). Si persiste, solicita a un Oficial que genere una nueva clave temporal.

**¿Por qué mi sesión se cerró sola al cambiar de clave?**  
Por la directiva de seguridad anti-sesión fantasma: cada cambio de clave revoca todos los tokens JWT previos en todos los dispositivos para evitar accesos no autorizados.

**¿Puedo instalar la aplicación en mi teléfono Android o iPhone?**  
Sí. En Chrome para Android presiona el menú de 3 puntos y pulsa **"Instalar aplicación"**. En Safari para iOS presiona el botón **Compartir** y pulsa **"Agregar a la pantalla de inicio"**. La app funcionará en pantalla completa y en modo offline gracias al Service Worker v3.3.2.

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**  
*Versión: v3.5.0 · Actualizado: Septiembre 2026*
