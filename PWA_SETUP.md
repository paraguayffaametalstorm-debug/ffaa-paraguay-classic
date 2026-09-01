# 📱 Configuración PWA y Modo Offline - PARAGUAY-FFAA | METALSTORM

La plataforma **PARAGUAY-FFAA | METALSTORM** está construida como una **Progressive Web App (PWA)** completa de grado militar, permitiendo instalación directa y funcionalidad resiliente sin conexión.

---

## 1. Componentes de la PWA

1. **`manifest.json`:**
   - Define el nombre táctico, colores institucionales (`#0038A8`, `#D52B1E`, `#0B132B`), orientación preferida e íconos en resoluciones de 72x72 a 512x512.
   - Configura el modo `standalone` para ejecutar la aplicación sin barras de navegación del navegador.

2. **`sw.js` (Service Worker):**
   - Versionado de caché (`v3.2`).
   - Estrategia **Cache-First** para activos estáticos (HTML, CSS, Fuentes, Íconos, Scripts).
   - Estrategia **Network-First con Fallback a Caché** para llamadas a la API `/api/`.
   - Limpieza automática de versiones de caché obsoletas en el evento `activate`.

---

## 2. Instrucciones de Instalación en Dispositivos

### 🤖 En Dispositivos Android (Google Chrome / Brave / Edge)
1. Abre la aplicación en Chrome.
2. Aparecerá automáticamente un banner táctico inferior: **"Instalar aplicación PARAGUAY FFAA"**.
3. Presiona el botón de instalación o selecciona los tres puntos en la esquina superior derecha y toca **"Instalar aplicación"**.
4. El ícono del escuadrón aparecerá en tu pantalla de inicio como una app nativa independiente.

### 🍏 En Dispositivos iOS (Apple Safari)
1. Abre la URL en Safari.
2. Toca el botón **Compartir** (ícono de caja con flecha hacia arriba).
3. Desplázate hacia abajo y selecciona **"Agregar a pantalla de inicio"** (*Add to Home Screen*).
4. Asigna el nombre sugerido y presiona **Agregar**.

### 💻 En Escritorio (Windows / macOS / Linux)
1. En Google Chrome, Edge o Brave, haz clic en el ícono de instalación que aparece a la derecha de la barra de direcciones URL.
2. Haz clic en **"Instalar"**. La aplicación se abrirá en su propia ventana táctica dedicada.

---

## 3. Pruebas y Validación Offline

1. Abre las herramientas de desarrollador (`F12`) en tu navegador.
2. Dirígete a la pestaña **Application** -> **Service Workers**.
3. Marca la casilla **Offline**.
4. Recarga la página: La aplicación cargará instantáneamente desde el caché local con el indicador de estado offline visible.
