# 📱 Configuración PWA y Modo Offline - PARAGUAY-FFAA | METALSTORM

> **Especificación y Guía de Despliegue de la Progressive Web App (PWA) Táctica y Service Worker v3.4.0.**

---

## 1. Arquitectura de la PWA

La plataforma **PARAGUAY-FFAA | METALSTORM** implementa un diseño PWA militar de alta disponibilidad, permitiendo instalación como aplicación de escritorio/móvil nativa (modo *standalone*) y capacidad de operación sin conexión (*offline-first*).

### 1.1 Manifiesto Web (`manifest.json`)
- **Identidad Militar:**
  - `name`: `PARAGUAY FFAA - METALSTORM`
  - `short_name`: `PRY-FFAA`
  - `description`: Sistema de gestión y control del escuadrón militar paraguayo en MetalStorm.
- **Visualización:** Modo `standalone` sin marcos de navegador, con orientación `portrait-primary`.
- **Paleta de Identidad Nacional:**
  - `theme_color`: `#0038A8` (Azul Armada)
  - `background_color`: `#0B132B` (Azul Táctico Nocturno)
- **Iconografía:** Íconos adaptativos en resoluciones 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384 y 512x512 con propósito `any maskable`.

### 1.2 Estrategia de Caché del Service Worker (`sw.js` v3.4.0)
El Service Worker implementa la versión de caché `PARAGUAY-FFAA-METALSTORM-v3.4.0` con estrategias diferenciadas por tipo de tráfico:

| Tipo de Recurso | Estrategia de Caché | Justificación Técnica |
|---|:---:|---|
| **Navegación (`index.html`, `/reset-password`)** | **Network-First** con Fallback | Prioriza servir siempre la última versión desplegada. Si el dispositivo está sin cobertura, entrega la versión en caché local. |
| **Activos Estáticos (`CSS`, `JS`, `Imágenes`)** | **Cache-First** con clonado | Carga instantánea de hojas de estilo, scripts de vistas y componentes HTML modulares. |
| **Llamadas a la API (`/api/*`) y Supabase** | **Network-Only** (Pass-Through) | Las peticiones dinámicas de combate, OAuth y autenticación nunca son bloqueadas ni servidas con datos rancios del caché. |

### 1.3 Precaché de Activos Críticos (`STATIC_ASSETS`)
El evento `install` descarga y almacena de forma preventiva 27 recursos tácticos esenciales:
- Páginas y vistas: `/reset-password.html`.
- Hojas de estilo: `/css/global.css`, `/css/components.css`, `/css/views.css`.
- Lógica de cliente: `/js/utils.js`, `/js/auth.js`, `/js/api.js`, `/js/views.js`, `/js/performance.js`, `/js/profile.js`, `/js/settings.js`, `/js/main.js`.
- Identidad visual: `/logo-escuadron.png`.
- Componentes HTML: `/components/header.html`, `/components/footer.html`, `/components/dashboard.html`, `/components/performance-form.html`, `/components/planes-view.html`, `/components/historial-view.html`, `/components/profile-view.html`, `/components/normativas-view.html`, `/components/admin-panel.html`, `/components/all-performances.html`, `/components/settings-view.html`, `/components/help-modal.html`, `/components/session-warning.html`, `/components/forgot-password-modal.html`, `/components/aircraft-stats-modal.html`.

---

## 2. Instrucciones de Instalación en Dispositivos

### 🤖 En Dispositivos Android (Chrome / Brave / Edge)
1. Ingresa a [https://paraguay-ffaa-metalstorm.fly.dev/](https://paraguay-ffaa-metalstorm.fly.dev/).
2. La plataforma disparará el evento `beforeinstallprompt`, mostrando el banner inferior **"Instalar aplicación PARAGUAY FFAA"**.
3. Si el banner no aparece, presiona el menú de los tres puntos verticales en la esquina superior derecha y selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
4. El acceso directo se instalará con el escudo oficial del escuadrón y abrirá en ventana dedicada sin barra de navegación.

### 🍏 En Dispositivos iOS / iPadOS (Apple Safari)
1. Abre [https://paraguay-ffaa-metalstorm.fly.dev/](https://paraguay-ffaa-metalstorm.fly.dev/) en Safari.
2. Presiona el botón táctico **Compartir** (icono de cuadro con flecha vertical hacia arriba en la barra inferior).
3. Desliza hacia abajo en el menú de opciones y pulsa **"Agregar a pantalla de inicio"** (*Add to Home Screen*).
4. Confirma el nombre `PRY-FFAA` y presiona **Agregar**.

### 💻 En Escritorio (Windows / macOS / Linux)
1. Desde Google Chrome, Brave o Microsoft Edge, observa el ícono de pantalla con una flecha hacia abajo ubicado en el extremo derecho de la barra de direcciones URL.
2. Haz clic en el ícono y presiona **"Instalar"**.
3. La aplicación se integrará al menú de inicio y a la barra de tareas como un programa ejecutable independiente.

---

## 3. Procedimiento de Actualización y Despliegue de Versión

Cuando se despliega una nueva versión del sistema (por ejemplo de v3.3.2 a v3.3.3):
1. **Actualizar Identificador en `sw.js`:**
   ```javascript
   const CACHE_NAME = 'PARAGUAY-FFAA-METALSTORM-v3.3.3';
   ```
2. **Ciclo de Activación:**
   - El evento `activate` detecta automáticamente que el nombre de caché cambió.
   - Elimina de forma inmediata todas las versiones obsoletas (`PARAGUAY-FFAA-METALSTORM-v3.3.2`, etc.) liberando memoria en el dispositivo.
   - Invoca `self.clients.claim()` para tomar el control de todas las pestañas abiertas sin necesidad de recargar manualmente.
3. **Cache-Busting en `index.html`:**
   - Todas las hojas de estilo cuentan con el sufijo `?v=3.3.0` (o versión superior) para forzar la invalidación inmediata de caché en proxies y navegadores de dispositivos móviles.

---

## 4. Verificación y Pruebas del Modo Offline

1. En tu navegador de escritorio, presiona `F12` para abrir las herramientas de desarrollador.
2. Ve a la pestaña **Application** $\rightarrow$ **Service Workers**.
3. Confirma que el Service Worker se encuentra en estado `Activated and is running`.
4. Marca la casilla **Offline** (o desconecta la red Wi-Fi en un teléfono móvil).
5. Recarga la página: La aplicación cargará al 100% de manera instantánea desde la memoria local en caché.
