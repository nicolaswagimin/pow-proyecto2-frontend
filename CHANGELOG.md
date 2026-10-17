# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Los commits siguen Conventional Commits.

## [Sin publicar] · Corrección por fragmentos y columna de recomendaciones

### Agregado
- **Corrección con IA por fragmentos.** A Gemini solo van los elementos con problemas, con su contexto mínimo (`POST /api/ia/fragmentos`), nunca el documento. Sirve para páginas reales de cualquier tamaño.
  - El corredor manda la ruta, la etiqueta y el resumen de cada nodo, y parse5 (bajo demanda) ubica cada elemento en el texto del HTML original.
  - Lotes de 8 fragmentos y 12 000 caracteres, por gravedad y con deduplicación.
  - Rondas de 3 lotes con progreso y «Corregir más (quedan N elementos)».
  - Las correcciones se aplican como reemplazos de texto y se verifican por lote. El documento corregido incluye solo las verificadas.
  - Estado nuevo: «La IA no devolvió una corrección válida». Aviso de los elementos que no se pueden corregir con IA.
- **Columna de recomendaciones en vivo** (`ui-recomendaciones`): qué falla y qué hacer en los elementos a la vista de la vista previa, en el orden de la página. Antes de auditar muestra un estado vacío con dos ejemplos de un clic (la demo del W3C).
- **La vista previa se ve como una ventana de navegador** con la dirección de la página.
- **Insignia de autoauditoría** en el pie de `/app` («Esta app: 0 problemas WCAG 2.2 AA»), que al abrirse audita la app en vivo.
- `app-auditoria`: entrada `auto` y salida `problemas`. Ya no entra en iframes.
- Pruebas con una **página grande de ejemplo** generada (más de 300 KB y más de 150 problemas). En total, 191 pruebas.
- Documentación: ADR 0010 y 0011; actualizados `funcionalidades.md`, `lente.md`, `accesibilidad.md` (29 de 29 auditorías sin violaciones), `componentes.md`, `arquitectura-frontend.md`, `reporte.md`, la ADR 0007 y las capturas.

### Cambiado
- El panel «Anotaciones» sale de `/app`; sigue en el acceso y en `/design`.
- Una auditoría nueva descarta al instante la corrección en curso de la página anterior y deja de mostrar su progreso.

### Eliminado
- La corrección del documento completo (`IaService.corregir`, `verificarPorProblema`, `verificarDocumento`) y el límite de 30 elementos.

### Corregido
- Si la IA falla a mitad de ronda, esos elementos se vuelven a pedir con «Corregir más».

## 2026-10-17 · Funcionalidad de auditoría

La función propia de a11Lens: auditar HTML ajeno, explicarlo, corregirlo con IA y verificar cada corrección.

### Agregado
- Entrada por **HTML pegado, archivo `.html` o URL** (descargada por el backend con protección contra SSRF), en pestañas navegables con flechas.
- **Motor aislado** (`auditor/`): axe-core y un corredor propio dentro de un iframe `sandbox="allow-scripts"` con CSP por nonce y `<base href>` para las páginas por URL. Los scripts de la página nunca corren.
- **Resultado**: puntaje de 0 a 100 con calificación y «¿Cómo se calcula?», problemas por gravedad con descripción en español, regla, criterio WCAG 2.2 con su nombre, selector y fragmento.
- **Lente**: vista previa con los elementos con problemas resaltados, sincronizada en los dos sentidos con la lista.
- Aviso cuando la página parece necesitar JavaScript para mostrarse (SPA).
- **Corrección con IA** verificada: cada corrección se aplica y se re-audita; solo las que resuelven su problema sin crear otros se muestran como solución. El documento completo también se re-audita (puntaje antes → después).
- **Antes y después**: diff lado a lado con − y +.
- **Guardar y exportar**: historial, reporte en Markdown, PDF por la impresión del navegador y descarga del HTML corregido.
- **`/historial`**: auditorías agrupadas por página con la evolución del puntaje; abrir y borrar.
- `BarraApp`: la barra de `/app`, extraída sin cambios visuales y con el enlace a Historial.
- Mensajes para `413` (HTML demasiado grande) y `503` (IA no disponible).
- Defensas del motor aislado contra mutation XSS (saneado hasta punto fijo y revisión del documento final) y token por carga en cada mensaje del corredor.
- Una corrección que quita u oculta el elemento no cuenta como verificada; aviso cuando el documento corregido trae problemas nuevos o baja el puntaje.
- 125 pruebas con Vitest y jsdom (`npm test`).
- Documentación: `funcionalidades.md`, `lente.md`, `reporte.md` y las decisiones 0006 a 0009; actualizados `accesibilidad.md` (24 de 24 vistas sin violaciones) y `arquitectura-frontend.md`.

### Cambiado
- `/app` deja de ser el informe de ejemplo (estado del sistema, items y pregunta a la IA) y pasa a ser la auditoría.

### Eliminado
- `services/api.service.ts` (items y la pregunta genérica a la IA).

### Sin cambios
- Diseño existente: tokens, colores, tipografía, animaciones, login, registro y auth-layout. Las pantallas nuevas usan solo los tokens y componentes que ya existían.

## 2026-10-12 · Identidad a11Lens

Rediseño de identidad: de "Constructiva" (póster Bauhaus sin relación con el tema) a **a11Lens**, con la dirección "Margen anotado".

### Agregado
- `lente/inspeccion.ts`: nombre accesible, rol, estados, descripción, contraste real del texto, tamaño del objetivo y frase del lector de pantalla, leídos del DOM.
- `app-margen`: anotaciones del elemento enfocado en una ficha de marcador, resumen de la página sin foco, interruptor recordado, lente que recorre el orden de foco y línea guía del campo a su ficha.
- `app-auditoria`: "Auditar esta página" con axe-core cargado bajo demanda (dependencia nueva).
- Login como demostración: el formulario se anota a sí mismo y explica cómo probarlo.
- `/app` como informe anotado con una lista de verificación del sistema.
- `/design` con el contraste de cada token medido en vivo.
- Documentación en `docs/`: brief, design system, componentes, animaciones, accesibilidad, arquitectura, cinco ADR y capturas.

### Cambiado
- Tokens: tinta sobre papel, tinta azul y marcador amarillo; texto principal AAA en ambos modos.
- Anillo de foco doble (`--anillo-foco`) en todos los controles, con outline transparente para alto contraste.
- Tipografía: Atkinson Hyperlegible Next y Mono.
- Nombre, título, descripción y `theme-color`.
- Campos: label fijo arriba, `aria-required`, error subrayado con marcador, deshabilitado con rayado.
- Botón: carga con texto visible y línea de escaneo; deshabilitado con borde discontinuo.
- Íconos de función en lugar de figuras geométricas.
- Medidor de contraseña, alerta, avatar y botón de tema (ahora el símbolo de contraste).
- Auth-layout: hoja de informe con formulario y margen.

### Eliminado
- Formas en parallax, tarjeta con inclinación 3D y giro, sacudida, confeti, barra tricolor, entrada en cascada, saludo letra por letra y avatar en cuartos.
- Alias de tokens del póster y tokens sin uso.

### Corregido
- En móvil el margen fijo tapaba el formulario.
- La ficha podía quedar encima del botón de auditar.
- La línea guía apuntaba mal si la ficha estaba a mitad de su transición.
- El interruptor se anunciaba solo como "Mostrar".
- Las filas de la ficha no estaban alineadas.

## 2026-10-06

- Login y registro con la dirección visual "Constructiva".
- Preparación del despliegue en Vercel.
- Base inicial: frontend y backend conectados con base de datos e IA.
