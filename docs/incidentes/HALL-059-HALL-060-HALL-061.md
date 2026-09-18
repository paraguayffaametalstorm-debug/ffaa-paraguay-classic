DOCUMENTO DE INCIDENTE - HALL-059, HALL-060, HALL-061

=======================================================



Bitacora tecnica del incidente de vinculacion Google OAuth.

Fecha: 2026-09-18

Responsable: Comando C4ISR



\-------------------------------------------------------



HALL-059 - Inconsistencia de Claves localStorage en Vinculacion Google OAuth

\-------------------------------------------------------



Fecha: 2026-09-17

Fase: Hotfix Post-Fase 4 (v4.0.3)

Archivos: link-account.html, js/api.js, sw.js

Commits: a82b5b0, b69a1c2, 0d5867e, e8e6dc8, b56e86f, 71fbda2

Severidad: ALTA

Estado: RESUELTO



PROBLEMA DETECTADO

\------------------

Durante pruebas del flujo de vinculacion de cuentas Google OAuth (/link-account)

se detecto un error 404 en consola sobre /api/auth/link-account. Tras auditoria

de los archivos involucrados se determino que el endpoint NUNCA estuvo roto.

El problema real eran DOS bugs independientes en el frontend:



1\. Inconsistencia de claves en localStorage:

&#x20;  - link-account.html guardaba el token con auth\_token (snake\_case), token y current\_user.

&#x20;  - La SPA (js/api.js y js/auth.js) busca el token con authToken (camelCase) y currentUser.

&#x20;  - Consecuencia: aunque la vinculacion era exitosa, quedaba una clave huerfana

&#x20;    en localStorage y la sesion dependia del parametro de URL ?auth\_token=...



2\. Falso positivo del 404:

&#x20;  - El error 404 era de recursos estaticos de la SPA (componentes HTML) servidos

&#x20;    desde cache del Service Worker con version obsoleta (v3.9.8).

&#x20;  - No provenia del endpoint /api/auth/link-account.



SOLUCION APLICADA

\-----------------

1\. link-account.html: Token guardado como authToken (camelCase) y usuario como

&#x20;  currentUser. Token ya no se pasa por URL.



2\. js/api.js: Nueva funcion apiLinkAccount(payload) que centraliza la llamada.



3\. sw.js: Bump de CACHE\_NAME de v3.9.8 a v4.0.3.



FIX DEFINITIVO (71fbda2)

\------------------------

En link-account.html, antes de api.js, agregar:



&#x20; <script>

&#x20;   const API\_BASE = '';

&#x20;   window.API\_BASE = '';

&#x20; </script>

&#x20; <script src="/js/api.js?v=4.0.5"></script>



VERIFICACION

\------------

\- ReferenceError eliminado en consola.

\- Peticion POST /api/auth/link-account llega al backend.



ROLLBACK

\--------

git revert 71fbda2





\-------------------------------------------------------



HALL-060 - 500 Internal Server Error al vincular cuenta Google

\-------------------------------------------------------



Fecha: 2026-09-18

Fase: Hotfix Post-Fase 4

Archivos: src/controllers/auth.controller.js

Commit: 9678d98

Severidad: ALTA

Estado: RESUELTO



PROBLEMA DETECTADO

\------------------

Despues de resolver HALL-059, el endpoint POST /api/auth/link-account devolvia

500 Internal Server Error:



&#x20; Error en apiLinkAccount: Error al actualizar el registro militar de vinculacion en base de datos



CAUSA RAIZ

\----------

El codigo de linkAccount incluia google\_id en el .select():



&#x20; .select('id, email, nick, user\_id, role, token\_version, must\_change\_password, google\_id, google\_linked');



La columna google\_id NO existe en la tabla users de Supabase (aunque el DDL

sql/001\_users.sql si la declara). PostgreSQL rechazaba la consulta con

column "google\_id" does not exist.



VERIFICACION DEL ESQUEMA REAL

\-----------------------------

SELECT column\_name FROM information\_schema.columns

WHERE table\_schema = 'public' AND table\_name = 'users';



Resultado: 25 columnas. google\_id ausente.



FIX APLICADO (9678d98)

\----------------------

ANTES:

&#x20; .select('... must\_change\_password, google\_id, google\_linked');



DESPUES:

&#x20; .select('... must\_change\_password, google\_linked');



VERIFICACION

\------------

\- POST /api/auth/link-account con usuario inexistente: 404.

\- POST /api/auth/link-account con usuario real: 200 OK.

\- Vinculacion de TestPilot: exitosa.



ROLLBACK

\--------

git revert 9678d98





\-------------------------------------------------------



HALL-061 - Discrepancia entre DDL sql/001\_users.sql y BD real

\-------------------------------------------------------



Fecha: 2026-09-18

Fase: Hotfix Post-Fase 4

Archivos: sql/001\_users.sql

Severidad: MEDIA

Estado: DETECTADO - Pendiente



PROBLEMA DETECTADO

\------------------

El DDL declara google\_id TEXT, pero la BD real no la tiene. Viola el principio

de "infraestructura como codigo".



OPCIONES

\--------

1\. Agregar google\_id a la BD:



&#x20;  ALTER TABLE users ADD COLUMN IF NOT EXISTS google\_id TEXT;

&#x20;  CREATE INDEX IF NOT EXISTS idx\_users\_google\_id ON users(google\_id);



2\. Eliminar google\_id del DDL sql/001\_users.sql.



RECOMENDACION

\-------------

Opcion 1 (agregar la columna a la BD) para mantener el DDL como fuente de

verdad completa.



ACCION PENDIENTE

\----------------

Crear sql/030\_add\_google\_id.sql.





\-------------------------------------------------------



RESUMEN

\-------------------------------------------------------



Hallazgo   | Severidad | Estado

\-----------|-----------|------------------------------------

HALL-059   | ALTA      | Resuelto (71fbda2)

HALL-060   | ALTA      | Resuelto (9678d98)

HALL-061   | MEDIA     | Detectado



RESULTADO FINAL

\---------------

El flujo de vinculacion Google OAuth funciona end-to-end.

El backend responde correctamente.

La documentacion esta centralizada en este archivo.

