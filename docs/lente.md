# La lente y el motor aislado

El HTML que audita a11Lens lo escribe cualquiera: puede traer scripts, formularios que envían datos, redirecciones o estilos que intenten tapar la app. Se audita en un iframe que no puede tocar nada de a11Lens.

## Las capas

1. **`sanear()`** (`auditor/aislar.ts`) quita del HTML `script`, `noscript`, `iframe`, `frame`, `frameset`, `object`, `embed`, `applet`, `base` y todo `meta[http-equiv]` (incluido `refresh`); los atributos `on*` y `srcdoc`; y las URL `javascript:` en `href`, `src`, `action`, `formaction`, `xlink:href`, `data` y `poster` (también con espacios o caracteres de control delante). **Se repite hasta que el resultado deja de cambiar**: serializar y volver a parsear puede convertir texto en elementos (mutation XSS con MathML/SVG y `<style>`), así que lo que parsea el iframe es exactamente lo que se revisó. Después, `documentoAislado()` vuelve a parsear el documento final y lo rechaza si tiene algo más que nuestra CSP, nuestro `<base>` y nuestros dos scripts, o algún atributo peligroso.
2. **`sandbox="allow-scripts"`** y nada más. Sin `allow-same-origin`, el documento tiene un origen opaco: no lee cookies, `localStorage` ni el DOM de la app. Sin `allow-forms`, `allow-popups` ni `allow-top-navigation`, no envía formularios, no abre ventanas ni navega la pestaña. Una prueba verifica que el atributo sea exactamente ese.
3. **CSP por meta** con un nonce nuevo en cada carga:
   ```
   default-src 'none'; script-src 'nonce-X'; style-src https: 'unsafe-inline';
   font-src https: data:; img-src https: data:; media-src https: data:
   ```
   Solo corren los dos scripts con el nonce: `auditor/axe.min.js` y `auditor/corredor.js`. Los estilos, fuentes e imágenes https de la página sí cargan, para que el contraste se calcule con su apariencia real ([ADR 0009](decisiones/0009-csp-y-base-para-paginas-por-url.md)).
4. **`<base href>`** con la URL final, solo para páginas descargadas por URL: así sus rutas relativas (`/css/estilos.css`) resuelven contra el sitio original. Los dos scripts propios se cargan con URL absoluta para no depender de esa base.
5. **El corredor** detiene todos los clics y envíos dentro de la vista previa, y solo acepta mensajes cuyo `event.source` sea la ventana padre. La app, a su vez, solo acepta mensajes cuyo `event.source` sea la ventana de ESE iframe (con origen opaco no hay origen que comparar) **y que traigan el token de esa carga**: el corredor lo recibe en `data-sesion` de su `<script>` y lo agrega a cada mensaje. Si la página lograra navegar el iframe, la nueva página tendría la misma ventana pero no el token, y sus mensajes se descartan.

`axe.min.js` se copia desde `node_modules/axe-core` al compilar (`angular.json`, assets); no se sirve desde un CDN.

## Protocolo de mensajes

Todos con `postMessage(mensaje, '*')`: el destino tiene origen opaco, así que la protección es comparar ventanas, no orígenes.

### De la app al iframe

| `tipo` | Campos | Qué hace el corredor |
|---|---|---|
| `auditar` | `id` | Corre `axe.run` con las etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa` y `elementRef: true`, excluye `[data-a11lens]` y, en un fragmento, desactiva las reglas de documento |
| `resaltar` | `selectores`, `seleccionado` | Marca cada elemento con `data-a11lens-marca` (`problema` o `seleccionado`) y `data-a11lens-selector`, y empieza a observarlos (ver `visibles`). No contornea `html`, `head` ni `body` |
| `enfocar` | `selector` | Pasa ese elemento a `seleccionado` y lo desplaza al centro |

### Del iframe a la app

Todos llevan además `sesion` (el token de la carga).

| `tipo` | Campos | Cuándo |
|---|---|---|
| `listo` | — | El corredor cargó; la app ya puede enviar mensajes (espera hasta 15 s) |
| `resultado` | `id`, `violaciones`, `aprobadas` | Terminó `auditar` (espera hasta 20 s). Solo datos: `id`, `impact`, `help`, `helpUrl`, `tags` y `nodes[{ target, html, ruta, etiqueta, resumen }]` |
| `error` | `id`, `mensaje` | axe falló |
| `clic` | `selector` | Clic sobre un elemento resaltado (o dentro de él) |
| `visibles` | `selectores` | Cambió qué elementos resaltados están a la vista. Usa un `IntersectionObserver`, avisa como mucho una vez por cuadro de animación y los ordena según la página. Alimenta la columna de recomendaciones |

Los resaltados son atributos más un `<style data-a11lens>` con el nonce, no elementos nuevos: no cambian el layout de la página. El `<style>` se excluye de la auditoría.

Los selectores con ` >> ` (elementos dentro de iframes o shadow DOM) se listan pero no se resaltan.

### Ruta de cada nodo

Para corregir por fragmentos, la app necesita la posición exacta de cada elemento en el **texto** del HTML original. El `html` que da axe no sirve para buscarlo: viene recortado (`<div class="…" ...>`) y con el formato del DOM (comillas, mayúsculas, atributos), no con el del archivo. Por eso el corredor manda, por nodo:

- `ruta`: los índices de hijos-elemento desde `<html>` hasta el elemento. No cuenta los nodos que agregó a11Lens: `script`, `base`, `meta[http-equiv]` y `[data-a11lens]`. Como el saneador quitó todos los de la página, los que quedan son nuestros. Es `null` en shadow DOM o en otro documento.
- `etiqueta`: el nombre del elemento, para comprobar que la ruta llegó al correcto.
- `resumen`: el `failureSummary` de axe (hasta 500 caracteres), que para contraste trae los colores y la razón.

La app recorre la misma ruta en un árbol de **parse5** del HTML original (`auditor/fragmentos.ts`), con las posiciones de origen y `scriptingEnabled: false` como `DOMParser`. Al recorrerla salta lo mismo que quita `sanear()`. Si la etiqueta no coincide o el elemento no está escrito en la fuente, el nodo queda como no corregible. Ver la [ADR 0010](decisiones/0010-ubicar-fragmentos-con-parse5.md).

## Dos usos del motor

- **`MotorService.abrir(iframe, html, baseHref?)`** carga el HTML en un iframe visible (la lente, `ui-lente`) y devuelve una `SesionAislada` con `auditar`, `resaltar`, `enfocar`, `alClic`, `alVisibles` y `cerrar`. Cada HTML nuevo abre una sesión nueva; la anterior se cierra.
- **`MotorService.auditarHtml(html, baseHref?)`** audita en un iframe oculto de 1280 × 800 px fuera de la pantalla (`aria-hidden`, `tabindex=-1`) y lo elimina al terminar. Se usa para la auditoría inicial y para verificar las correcciones, una vez por lote, o una por corrección si aparecen problemas nuevos.

## Lo que no hace

- No ejecuta el JavaScript de la página: una SPA se audita casi vacía (la interfaz lo avisa).
- No carga recursos `http:` (solo `https:` y `data:`), ni hojas de estilo `@import` de otros esquemas.
- No audita el contenido de iframes de la página: se eliminan al sanear.
