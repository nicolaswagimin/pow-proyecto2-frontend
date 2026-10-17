# Funcionalidades

Qué puede hacer una persona en a11Lens, de principio a fin. Todo vive en `/app` salvo el historial (`/historial`). Las dos rutas exigen sesión.

## 1. Auditar

Tres formas de entrada, en pestañas (se cambian también con las flechas del teclado):

| Pestaña | Qué hace | Límites |
|---|---|---|
| **Pegar HTML** | Un documento completo o un fragmento. Nombre de la página opcional. | 2 MB |
| **Subir archivo** | Un `.html` o `.htm` del equipo. Se lee en el navegador, no se sube al servidor. | 2 MB |
| **URL** | El backend descarga la página con protección contra SSRF (`POST /api/paginas/descargar`). Una URL de más de 300 caracteres se guarda en el historial sin la consulta. | http/https, puertos 80/443, 8 s, 2 MB |

axe-core corre **en el navegador**, dentro de un iframe aislado donde los scripts de la página nunca se ejecutan (ver [lente.md](lente.md) y [ADR 0006](decisiones/0006-axe-en-iframe-con-csp-y-nonce.md)). Por eso pegar HTML y subir un archivo funcionan aunque el backend esté apagado.

En un fragmento (sin `<html>`) se desactivan las reglas que solo tienen sentido en un documento completo: idioma, título, regiones, `h1` y salto al contenido.

**Aviso de SPA.** Si la página parece necesitar JavaScript para mostrarse (body casi sin texto con un contenedor típico como `#root`, `#app` o `app-root`, o casi solo scripts), aparece una alerta: a11Lens auditaría una página casi vacía; conviene pegar el HTML ya renderizado (en el navegador: *Inspeccionar → Copiar outerHTML* de `<html>`).

## 2. Resultado

- **Puntaje de 0 a 100** con su calificación (Excelente, Bueno, Necesita mejoras, Deficiente) y el conteo por gravedad.
- **«¿Cómo se calcula?»**: un `<details>` con la fórmula (ver [reporte.md](reporte.md)).
- **Problemas agrupados por gravedad** (crítico, serio, moderado, menor). Cada uno lleva:
  - descripción en español,
  - regla de axe y enlace a su documentación,
  - criterio WCAG con número, nombre oficial y nivel (por ejemplo, *1.4.3 Contraste (mínimo) · AA*),
  - cada elemento afectado con su selector y su fragmento de HTML,
  - el botón **«Ver en la lente»** (`aria-pressed`).

## 3. Lente

La página tal como se ve, con los elementos con problemas contorneados. Sincronizada en los dos sentidos:

- «Ver en la lente» en la lista → el elemento se resalta con más fuerza y se desplaza al centro de la vista previa.
- Clic en un elemento resaltado de la vista previa → se selecciona su problema y el foco va a su botón en la lista.

En la vista previa no se navega ni se envía nada: todos los clics y envíos se detienen. Todo lo de la lente se puede hacer también desde la lista, así que el iframe no es obligatorio para usar la app con teclado o lector de pantalla.

La vista previa se ve como una **ventana de navegador**: una barra con tres puntos decorativos y la dirección de la página (la URL, el nombre del archivo o el de lo pegado).

## 3b. Recomendaciones en vivo (columna derecha)

La columna derecha de `/app` habla de la página auditada, no de a11Lens ([ADR 0011](decisiones/0011-columna-de-recomendaciones-en-vivo.md)). Antes ocupaba ese lugar el panel «Anotaciones», que sigue en el acceso y en `/design`.

- **Antes de auditar** explica qué va a encontrar a11Lens: imágenes sin texto alternativo, poco contraste, campos sin etiqueta, enlaces y botones sin nombre, y estructura (encabezados, regiones, idioma y título). También ofrece dos ejemplos de un clic, que se auditan por URL:
  - la [página inaccesible de demostración del W3C](https://www.w3.org/WAI/demos/bad/before/home.html);
  - [la misma página, corregida](https://www.w3.org/WAI/demos/bad/after/home.html).
- **Después de auditar** sigue el scroll de la vista previa. Por cada elemento con problemas que está a la vista, muestra:
  - su gravedad y la descripción;
  - **qué hacer**, en una frase fija por regla (`auditor/recomendaciones.ts`);
  - si ya se corrigió con IA, la explicación de la IA y el estado de la verificación;
  - su ubicación.

  Los problemas de toda la página (`html`, `head`, `body`, que no se resaltan) van aparte, en «En toda la página». Un contador dice cuántos hay a la vista del total. Un clic en una recomendación la selecciona en la lente y en la lista.
- **Escritorio y móvil.** En escritorio, la columna acompaña el scroll de la hoja (`position: sticky`). En móvil no hay columna: el estado vacío va debajo de «Auditar» y las recomendaciones, debajo de la vista previa.

La autoauditoría de a11Lens queda en el **pie**, como una insignia discreta: «Esta app: 0 problemas WCAG 2.2 AA».

- El dato es el de la última verificación (ver [accesibilidad.md](accesibilidad.md)).
- Al hacer clic se despliega el detalle y se audita la app en ese momento, sin contar la vista previa. La insignia pasa a mostrar el resultado real.

## 4. Corregir con IA (por fragmentos)

A la IA **no** va el documento: van solo los fragmentos de los elementos con problemas. Así sirve para páginas reales de cualquier tamaño, hasta los 2 MB que se pueden auditar. La decisión está en la [ADR 0005 del backend](../../backend/docs/decisiones/0005-ia-por-fragmentos.md) y en la [ADR 0010](decisiones/0010-ubicar-fragmentos-con-parse5.md).

1. **Ubicar.** Cada elemento con problemas se ubica en el texto del HTML con parse5, usando la ruta que manda el corredor ([lente.md](lente.md#ruta-de-cada-nodo)). El fragmento es el elemento completo si mide ≤ 1500 caracteres y no contiene otro elemento con problemas; si no, es su etiqueta de apertura. Para `document-title` se usa la apertura de `<head>`.
2. **Lotes por gravedad.** Los críticos y serios van primero. Cada lote lleva hasta 8 fragmentos únicos y 12 000 caracteres, con contexto mínimo: la apertura del padre, el detalle de axe, y el idioma y título de la página. Los elementos idénticos se envían una vez, y dos problemas del mismo elemento van en lotes distintos.
3. **Pedir.** `POST /api/ia/fragmentos` devuelve, por fragmento, una explicación en lenguaje simple y el fragmento corregido, validados con Zod. El backend guarda cada fragmento en caché.
4. **Aplicar y verificar.** Cada corrección se aplica **como reemplazo de texto** en su lugar exacto, así que el resto del documento queda byte a byte igual. Después se audita con axe (ver la tabla).
5. **Rondas.** Un clic procesa hasta 3 lotes con el progreso visible («Lote 2 de 3: verificando las correcciones con axe…»). Después, el botón pasa a **«Corregir más (quedan N elementos)»** y desaparece cuando no queda nada. Si la IA falla, esos elementos se vuelven a pedir en la siguiente ronda.

Algunos elementos no se pueden corregir con IA y la sección lo avisa con su número:
- no están escritos en el HTML (el navegador los agrega, como un `<html>` implícito);
- están en shadow DOM o en otro marco;
- su apertura pasa de 4000 caracteres.

**Nada se muestra como solución sin verificarlo** ([ADR 0007](decisiones/0007-verificar-antes-de-mostrar.md)). Las correcciones de un lote se aplican juntas y se auditan una vez. Si aparecen problemas nuevos, se audita cada una por separado para saber cuál los causó.

| Estado | Cuándo |
|---|---|
| **Resuelto** | El par regla + selector desaparece, la regla bajó al menos en tantos elementos como correcciones suyas desaparecieron, y no aparece ningún problema nuevo |
| Resolvió pero introdujo otros | Se resolvió, pero aparecieron problemas que antes no estaban |
| No resolvió | El problema sigue |
| Quitó u ocultó el elemento | La corrección borra el elemento, lo cambia por otro o lo oculta (`hidden`, `aria-hidden`, `display:none`, `visibility:hidden`): axe deja de verlo, pero no está corregido |
| No se pudo aplicar | El fragmento no está en el HTML |
| La IA no devolvió una corrección válida | El fragmento quedó en `sinRespuesta` tras el reintento del servidor |

Las verificadas aparecen primero, con su explicación y el código. Las demás van en «Sin solución verificada», con la explicación y el motivo; lo que propuso la IA queda dentro de un `<details>` cerrado («Ver lo que propuso la IA») y nunca se ofrece como solución.

**El documento corregido** es el HTML original con **solo las correcciones resueltas**. Se compara con la auditoría original: puntaje antes → después y cuántos problemas se resolvieron, siguen y aparecieron. Si aun así trae problemas nuevos o baja el puntaje, un aviso lo dice en «Antes y después» y junto a la descarga.

**Cuota de Gemini.**
- Lo que ya se intentó no se vuelve a pedir, y el backend guarda cada fragmento en caché.
- Si Gemini está muy solicitado (`503`), el backend reintenta una vez. Si sigue así, el mensaje pide esperar unos segundos y pulsar «Corregir más».
- Si se agota la cuota (`429`), el mensaje lo dice claramente.

## 5. Antes y después

Diff del HTML original contra el documento corregido, lado a lado. Como las correcciones son reemplazos de texto, solo cambian las líneas de los fragmentos corregidos. Las líneas quitadas (−) y agregadas (+) se marcan con símbolo y no solo con color.

## 6. Guardar y exportar

| Acción | Resultado |
|---|---|
| **Guardar en el historial** | `POST /api/auditorias` con el HTML, el puntaje, los problemas y, si hay, el HTML corregido y su puntaje |
| **Reporte en Markdown** | `a11lens-<página>.md` con puntaje, fórmula, problemas por gravedad, criterios, ubicaciones y correcciones con su estado |
| **Reporte en PDF** | La impresión del navegador sobre una vista de impresión que deja solo el reporte ([ADR 0008](decisiones/0008-pdf-con-impresion-del-navegador.md)) |
| **Descargar HTML corregido** | `a11lens-<página>-corregido.html`: el HTML original con las correcciones verificadas |

## 7. Historial

`/historial` agrupa las auditorías guardadas por página. Cada grupo muestra:

- el último puntaje y su cambio respecto del anterior (+/−, con signo y no solo con color), y una línea de evolución decorativa (`aria-hidden`: los mismos datos están en la lista),
- cada auditoría con fecha, origen, puntaje y, si se corrigió, el puntaje corregido,
- **Abrir**: vuelve a `/app?auditoria=<id>` y re-audita ese HTML (la lente necesita los resultados vivos),
- **Borrar**, con confirmación.
