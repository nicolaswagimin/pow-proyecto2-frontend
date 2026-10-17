# 0008 · El PDF se genera con la impresión del navegador

- **Estado:** aceptada · **Fecha:** 2026-10-17

## Contexto
El reporte en PDF puede salir de una librería en el navegador (jsPDF, pdfmake: 100 a 400 kB más, y el texto queda como dibujo o con fuentes propias), de un servicio en el backend (Chromium en Render: la misma memoria que se descartó en la decisión 0001 del backend) o de la impresión del navegador.

## Decisión
«Reporte en PDF» llama a `window.print()`. Unos estilos `@media print` en `/app` dejan solo el reporte: se ocultan la barra, la entrada, la lente, la sección de guardar, los botones y el margen; el fondo queda blanco y cada panel evita partirse entre páginas. La persona elige «Guardar como PDF».

## Consecuencias
- Cero dependencias nuevas y cero carga en el servidor.
- El PDF conserva texto real, seleccionable y legible por lectores de pantalla, con la tipografía de la app.
- Hay un paso más para la persona (elegir «Guardar como PDF»); la interfaz lo explica junto al botón.
- El resultado puede variar un poco entre navegadores.
