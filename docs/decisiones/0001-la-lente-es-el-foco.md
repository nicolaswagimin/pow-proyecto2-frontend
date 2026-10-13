# 0001 · La lente es el foco, no el cursor

- **Estado:** aceptada
- **Fecha:** 2026-10-12

## Contexto
El punto de partida era "una lente recorre el formulario y anota sus etiquetas". Una lupa que sigue al mouse es el recurso obvio, pero deja fuera a quien navega con teclado o lector de pantalla, que es justo el público que a11Lens defiende.

## Decisión
La lente es el foco. Lo que se anota es el elemento enfocado (`focusin`), sea con Tab o con un clic. El anillo de foco es la firma visual de la marca: doble, tinta y marcador, y el logo lo repite. Al tabular, un anillo viaja del control anterior al nuevo para mostrar el orden de foco.

## Consecuencias
- La demostración funciona igual con teclado, mouse y táctil.
- El orden de foco, que es un criterio de WCAG, queda a la vista.
- Sin foco, el margen resume la página en lugar de quedar vacío.
- Hay que cuidar que la ficha no tape nada al moverse: se limita su recorrido y en móvil se reduce a la frase del lector.
