# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Los commits siguen Conventional Commits.

## [Sin publicar] · 2026-10-12

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
