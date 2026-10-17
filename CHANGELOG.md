# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Los commits siguen Conventional Commits.

## [Sin publicar] · 2026-10-17

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
- 105 pruebas con Vitest y jsdom (`npm test`).
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
