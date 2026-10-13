# 0002 · Anotaciones leídas del DOM real, sin aria-live

- **Estado:** aceptada
- **Fecha:** 2026-10-12

## Contexto
Las anotaciones del login podían escribirse a mano ("Correo: tiene label, contraste 16:1") o calcularse. Escritas a mano serían una maqueta: si alguien rompe un label, la anotación seguiría diciendo que está bien.

## Decisión
`lente/inspeccion.ts` calcula todo desde el DOM: nombre accesible (accname simplificado), rol, estados ARIA, descripción enlazada, contraste del texto contra su fondo real y tamaño del objetivo. El margen se actualiza al escribir y cuando cambian los atributos ARIA.

El margen **no** es una región `aria-live`.

## Consecuencias
- Si un componente pierde su label o su contraste, la anotación lo muestra ("Falta", "No cumple").
- Es la misma inspección que el producto aplicará al HTML que pegue la persona.
- Quien usa lector de pantalla no escucha cada campo dos veces: la ficha está en un `<aside>` con título, para leerla cuando quiera.
- El cálculo de nombre accesible es simplificado: no cubre todos los casos de la especificación (por ejemplo, contenido CSS generado). Para el producto se usará la API de accesibilidad de axe-core.
