# 0003 · Tipografía Atkinson Hyperlegible Next y Mono

- **Estado:** aceptada
- **Fecha:** 2026-10-12

## Contexto
El diseño anterior usaba Unbounded (titular gigante de póster) y Archivo. Para una herramienta de accesibilidad, la tipografía es parte de lo que se evalúa.

## Decisión
Usar **Atkinson Hyperlegible Next** (400 y 700) para todo y **Atkinson Hyperlegible Mono** para código y atributos. El Braille Institute la diseñó para personas con baja visión: diferencia claramente I, l y 1; O y 0; rn y m.

## Consecuencias
- La elección tiene un motivo que se puede explicar en la sustentación.
- Se cargan cuatro archivos desde Google Fonts con `display=swap` y respaldo `system-ui`.
- Tamaños en `rem` e interlineado de 1.6: el texto acompaña la configuración de la persona.
