# 📖 Manual de Usuario y Piloto - PARAGUAY-FFAA | METALSTORM

> **Manual Operativo Oficial para Pilotos y Oficiales del Escuadrón PARAGUAY FFAA `[PRY]` en MetalStorm (Versión v3.4.0).**

---

## 1. Acceso a la Plataforma y Credenciales

### 1.1 Métodos de Autenticación de Combate
La plataforma ofrece dos mecanismos de acceso táctico seguro:

#### A. Autenticación con Credenciales Directas (Email y Contraseña)
1. Abre el enlace oficial de combate: [https://paraguay-ffaa-metalstorm.fly.dev/](https://paraguay-ffaa-metalstorm.fly.dev/).
2. Ingresa tus credenciales oficiales proporcionadas por tu Oficial de Mando:
   - **Correo Institucional o Personal:** Tu correo registrado en el escuadrón.
   - **Contraseña:** Tu contraseña asignada o establecida previamente.
3. **Reclutas con Clave Temporal:** Si es tu primer ingreso con una clave militar temporal `MS-XXXX-XXXX`, el sistema exigirá de forma obligatoria cambiar la clave por una personal de **al menos 8 caracteres**.

#### B. Autenticación con Google (Gmail Restringido)
1. En la pantalla principal de inicio de sesión, presiona el botón **"Continuar con Google"**.
2. Se abrirá una ventana emergente segura donde podrás seleccionar o iniciar sesión con tu cuenta de Google.
3. **Restricción Militar por Lista Blanca:**
   - **Solo pueden ingresar correos que ya estén registrados en la nómina del escuadrón.**
   - Si tu correo no figura en el sistema, recibirás la alerta:  
     `❌ Acceso denegado. Tu correo no está registrado en el escuadrón. Contacta a un administrador.`
   - Si tu cuenta militar se encuentra desactivada:  
     `⚠️ Cuenta desactivada. Contacta a tu oficial de operaciones.`
4. Si el correo es reconocido y está activo, la sesión se iniciará de forma automática y la ventana emergente se cerrará, cargando tu Cuadro de Mando Operacional.

### 1.2 Recuperación Autónoma de Contraseña por Correo
Si olvidaste tu clave de acceso o necesitas restaurarla:
1. En el formulario de inicio de sesión, presiona **"¿Olvidaste tu contraseña?"**.
2. Se desplegará el modal táctico de recuperación: ingresa tu correo electrónico registrado y presiona **"Enviar Enlace de Recuperación"**.
3. Revisa tu bandeja de entrada (y la carpeta de spam si es necesario). Recibirás un correo oficial del escuadrón con un **enlace táctico de un solo uso válido por 15 minutos**.
4. Haz clic en el enlace o cópialo en tu navegador. Se abrirá la interfaz táctica de restablecimiento (`/reset-password.html`).
5. Ingresa tu nueva contraseña militar (mínimo 8 caracteres), confírmala y presiona **"Actualizar Contraseña"**.
6. **Medida de Seguridad C4ISR:** Al guardar la nueva clave, el sistema incrementa el control `token_version` e **invalida al instante cualquier sesión activa** en todos tus dispositivos. A continuación, podrás iniciar sesión normalmente.

### 1.3 Asistencia Administrativa de Clave
En caso de no tener acceso a tu correo:
1. Contacta a un **Oficial ADMIN** o al **Comandante OWNER** por los canales seguros del escuadrón.
2. El oficial ejecutará el comando de reseteo administrativo (`Reset Pass`).
3. El sistema emitirá una clave temporal `MS-XXXX-XXXX`. Al iniciar sesión con ella, deberás configurar una nueva contraseña obligatoriamente.

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

**¿Por qué recibo error al intentar ingresar con Google?**  
Por razones de seguridad operacional, el acceso vía Google está restringido estrictamente a las cuentas registradas en la nómina del escuadrón. Si utilizas un correo distinto o personal que no fue dado de alta por el oficial de operaciones, el acceso será rechazado.

**¿Cuánto tiempo tengo para usar el enlace de restablecimiento de contraseña?**  
El token criptográfico expira tras **15 minutos** de haber sido emitido. Si transcurre más tiempo, deberás volver a solicitar el enlace desde el formulario de recuperación.

**¿Qué debo hacer si no puedo ingresar con mi clave temporal?**  
Verifica que estás respetando las mayúsculas y el guión (ej: `MS-XXXX-XXXX`). Si persiste, solicita a un Oficial que genere una nueva clave temporal.

**¿Por qué mi sesión se cerró sola al cambiar de clave?**  
Por la directiva de seguridad anti-sesión fantasma: cada cambio de clave revoca todos los tokens JWT previos en todos los dispositivos para evitar accesos no autorizados.

**¿Puedo instalar la aplicación en mi teléfono Android o iPhone?**  
Sí. En Chrome para Android presiona el menú de 3 puntos y pulsa **"Instalar aplicación"**. En Safari para iOS presiona el botón **Compartir** y pulsa **"Agregar a la pantalla de inicio"**. La app funcionará en pantalla completa y en modo offline gracias al Service Worker v3.4.0.

---

**PARAGUAY FFAA `[PRY]` — Escuadrón Oficial MetalStorm**  
*Versión: v3.4.0 · Actualizado: Septiembre 2026*
