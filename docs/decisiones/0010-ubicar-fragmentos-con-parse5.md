# 0010 · Ubicar los fragmentos en el HTML original con la ruta del DOM y parse5

- **Estado:** aceptada · **Fecha:** 2026-10-17 · Acompaña a la [ADR 0005 del backend](../../../backend/docs/decisiones/0005-ia-por-fragmentos.md) (la IA corrige fragmentos, no el documento).

## Contexto
Para corregir por fragmentos, cada corrección tiene que reemplazar **exactamente** el texto del elemento en el HTML original. Si no, el documento corregido no se puede armar, o el diff muestra cambios que nadie hizo.

Lo que da axe no alcanza:
- `node.html` viene del DOM, no del archivo. Las comillas, mayúsculas y atributos están normalizados (`<IMG SRC=a.gif>` se vuelve `<img src="a.gif">`), y si pasa de 300 caracteres axe lo recorta a `<div class="…" ...>`.
- El selector (`target`) apunta al documento **saneado** del iframe. El saneado quita scripts, iframes y otros elementos, y además el selector puede depender de clases o de `:nth-child`.

## Opciones
1. **Buscar `node.html` con `indexOf`.** Falla con cualquier formato distinto al del DOM: en la demo del W3C, todas las etiquetas están en mayúsculas y sin comillas.
2. **Serializar el DOM corregido** (DOMParser + `outerHTML`). Siempre encuentra el elemento, pero reformatea el documento entero: el diff sería todo el archivo.
3. **Ruta en el DOM + parser con posiciones de origen.** El corredor manda la ruta de índices de cada nodo, y la app la recorre sobre un árbol de parse5 del HTML original, que sabe en qué carácter empieza y termina cada elemento.

## Decisión
Opción 3.

- **El corredor** (con `elementRef: true`) manda `ruta`, `etiqueta`, `resumen` y `huella`. No cuenta los nodos que agregó a11Lens: `script`, `base`, `meta[http-equiv]` y `[data-a11lens]`.
- **`analizarFuente`** (`auditor/fragmentos.ts`) parsea con parse5:
  - usa `sourceCodeLocationInfo` y `scriptingEnabled: false`, igual que el `DOMParser` del saneador;
  - recorre la ruta sin contar lo que quita `sanear()`;
  - comprueba que la etiqueta y la **huella** (atributos ordenados, y cuántos hijos tienen el elemento y su padre) coincidan. Si no coinciden, o si el elemento no está escrito en la fuente (implícito), lo marca como no corregible.
  - La huella existe porque el árbol del iframe no siempre es igual al del original. La revisión final encontró tres casos: en modo quirks `<p><table>` anida; un `</form>` mal anidado deja un `<form>` vacío solo en un árbol; y el `<select>` personalizado de Chrome conserva `<div>` que parse5 descarta. En todos, la ruta caía en otro elemento con la misma etiqueta.
- **El fragmento** es:
  - el elemento completo, si mide ≤ 1500 caracteres, no contiene otro elemento con problemas y no es `html`, `head` ni `body`;
  - si no, su etiqueta de apertura;
  - para `document-title`, la apertura de `<head>`.

  Así dos fragmentos de un mismo lote no se pisan.
- **Cada lote se ubica sobre el documento acumulado**, re-parseado y con la auditoría que ya se hizo de él, no sobre el original. Si dos reglas caen en el mismo elemento, la segunda espera al lote siguiente y se corrige sobre el texto ya corregido.
- **Las correcciones se aplican como reemplazos de texto** (`aplicarReemplazos`), de atrás hacia adelante. Un solape es un error, no un reemplazo silencioso.
- **parse5** (^8.0.1, ya en el árbol por Angular y jsdom) pasa a ser dependencia directa y se carga con `import()` solo al corregir: es un chunk aparte de unos 37 kB comprimido.

## Consecuencias
- Funciona con HTML real, aunque tenga mayúsculas, atributos sin comillas, `<p>` sin cierre o scripts en cualquier lugar. Se comprobó con la demo «before» del W3C: 43 de 43 elementos corregidos y verificados, puntaje 28 → 100.
- El diff solo muestra los fragmentos corregidos; el resto del documento queda byte a byte igual.
- Hay que mantener en sincronía tres listas: lo que quita `sanear()`, lo que salta el corredor y lo que salta `fragmentos.ts`. Las pruebas de `fragmentos.spec.ts` y `corredor.spec.ts` cubren los casos con `script`, `noscript`, `iframe` y `meta refresh`.
- No se corrigen con IA los elementos implícitos, los de shadow DOM o iframes, ni los de apertura mayor de 4000 caracteres. La interfaz dice cuántos son.
- Si el árbol cambia (quirks, mXSS, formularios anidados), la huella no coincide y el nodo queda como no corregible. El riesgo que queda es el de dos elementos idénticos, con los mismos atributos y los mismos hijos que su padre; ahí corregir uno por el otro da el mismo texto.
- Las correcciones de la IA son dato no confiable: no pueden agregar nada que el saneador quitaría ni, si son de apertura, otros elementos. Ver la [ADR 0007](0007-verificar-antes-de-mostrar.md).
