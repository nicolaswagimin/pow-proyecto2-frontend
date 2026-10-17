# 0006 · axe-core dentro de un iframe aislado con CSP por nonce

- **Estado:** aceptada · **Fecha:** 2026-10-17
- Relacionada: [0004 axe-core bajo demanda](0004-axe-core-bajo-demanda.md) (la herramienta sobre la propia app, que sigue igual) y la decisión 0001 del backend.

## Contexto
a11Lens audita HTML que escribe cualquiera. Para que la regla de contraste funcione hace falta render real, así que el HTML tiene que cargarse en un documento del navegador; y ese documento no puede ejecutar los scripts de la página ni tocar la app (sesión en `localStorage`, DOM, navegación).

Se probaron dos caminos en Chrome:

| Camino | Resultado |
|---|---|
| **A.** iframe `sandbox="allow-same-origin"` sin scripts y `axe.run(iframe.contentDocument)` desde la app | No funciona: axe rechaza nodos de otro documento. Y `allow-same-origin` deja al iframe con el origen de la app |
| **B.** iframe `sandbox="allow-scripts"` (origen opaco), axe y un corredor propio **dentro**, cargados con un nonce de CSP | Funciona: detecta contraste, `alt` y nombres; los `<script>`, `on*` y `javascript:` del HTML no corren |

## Decisión
Camino B, con dos defensas independientes:
1. `sanear()` quita elementos y atributos que ejecutan código, navegan o pisarían la CSP (incluidos `meta[http-equiv]` y `base` de la página). Se repite hasta que el resultado no cambia, y el documento final se vuelve a revisar tal como lo parsea el iframe (mutation XSS).
2. CSP en un `<meta>` al principio del `<head>`: `default-src 'none'; script-src 'nonce-X'` con un nonce aleatorio por carga. Aunque algo escapara al saneado, sin el nonce no corre.

El sandbox es exactamente `allow-scripts`; una prueba lo fija. La app y el corredor se comunican por `postMessage` y cada lado comprueba que el mensaje venga de la ventana esperada; la app exige además el token de esa carga, que una página que navegara el iframe no conoce ([lente.md](../lente.md)).

## Consecuencias
- Se audita el render real sin servidor de navegadores y sin exponer la app.
- `allow-scripts` sin `allow-same-origin` es la combinación segura: con las dos juntas, el iframe podría quitarse su propio sandbox.
- Los scripts de la página nunca corren: las SPA se auditan casi vacías (la interfaz lo avisa).
- El corredor y `axe.min.js` se sirven desde el propio frontend con URL absoluta.
