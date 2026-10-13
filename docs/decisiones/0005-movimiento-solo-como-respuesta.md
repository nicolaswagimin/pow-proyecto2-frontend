# 0005 · Movimiento solo como respuesta, sin sacudida ni efectos de cursor

- **Estado:** aceptada
- **Fecha:** 2026-10-12

## Contexto
El diseño anterior tenía parallax al cursor, una tarjeta que se inclinaba y giraba, una sacudida al fallar y confeti. En una herramienta de accesibilidad, ese movimiento contradice lo que se audita (WCAG 2.3.3, 2.2.2).

## Decisión
1. Solo se anima lo que responde a una acción: el foco que viaja, la ficha que se desliza, el marcador bajo un error, el interruptor, la línea de carga.
2. Nada al cargar la página y nada que dependa del cursor.
3. Sin sacudida al fallar: el error se anuncia y el foco va al primer campo inválido.
4. Con `prefers-reduced-motion` no hay recorrido de la lente ni transiciones.

## Consecuencias
- Se eliminaron `fx/formas`, `fx/confeti`, la inclinación 3D, el giro entre login y registro y la entrada en cascada.
- La pantalla está quieta hasta que la persona actúa.
