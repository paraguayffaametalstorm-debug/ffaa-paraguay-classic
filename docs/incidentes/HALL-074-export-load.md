# HALL-074 - loadExportEventsList() no se invocaba en loadAdminPanel()

**Fecha:** 2026-10-08
**Severidad:** MEDIA
**Estado:** RESUELTO
**Version afectada:** v4.6.0
**Tiempo de diagnostico:** ~15 min
**Tiempo de resolucion:** ~5 min

---

## Resumen

La nueva seccion "Exportar Resultados de Evento" del panel admin se
renderizaba correctamente, pero el dropdown de eventos quedaba eternamente
en "Cargando eventos...".

## Sintomas

- La seccion HTML aparecia en el panel admin.
- El dropdown select#exportEventSelect mostraba solo el placeholder.
- La consola NO mostraba errores.
- Al ejecutar manualmente loadExportEventsList() en la consola, el dropdown
  se llenaba con los 44 eventos.

## Causa Raiz

La funcion loadExportEventsList() existia y estaba exportada a window,
pero nadie la llamaba desde loadAdminPanel().

Durante la implementacion se agrego la definicion de la funcion y la exportacion
global, pero se omitio la invocacion en el ciclo de vida del panel.

Evidencia:
findstr /N /C:"loadExportEventsList" js\views.js
7513:async function loadExportEventsList() {
7846:window.loadExportEventsList = loadExportEventsList;

Solo 2 coincidencias (definicion + export). Faltaba la tercera: la llamada.

## Solucion

En js/views.js, dentro de loadAdminPanel(), agregar la invocacion
despues de loadAdminEvents():

// Cargar eventos para el panel de eventos y Black Market
loadAdminEvents();

// v4.6.0 - Cargar eventos para el selector de exportacion
if (typeof loadExportEventsList === 'function') {
  loadExportEventsList();
}

El if (typeof ... === 'function') protege contra posibles fallos de carga
del modulo.

## Verificacion

Despues del fix, findstr debe devolver 3 coincidencias:
7513:async function loadExportEventsList() {
XXXX:    loadExportEventsList();                    <- NUEVA
7846:window.loadExportEventsList = loadExportEventsList;

Y en el navegador, el dropdown debe llenarse automaticamente al abrir el panel admin.

## Lecciones Aprendidas

1. Toda funcion nueva debe tener un test de "se invoca automaticamente".
   No basta con que la funcion exista y este exportada.
2. Agregar un smoke test en el codigo: al cargar el panel admin, verificar
   que el dropdown tenga opciones.
3. La consola no muestra error cuando una funcion simplemente no se llama.
   Es un bug silencioso - el peor tipo.

## Referencias

- Commit a722509 - fix(export): llamar loadExportEventsList en loadAdminPanel
- js/views.js lineas ~7513 y ~7846
- Feature v4.6.0 "Exportar Resultados"
