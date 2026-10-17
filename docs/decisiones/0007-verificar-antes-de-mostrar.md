# 0007 · Ninguna corrección se presenta como solución sin verificarla

- **Estado:** aceptada · **Fecha:** 2026-10-17

## Contexto
Gemini propone correcciones verosímiles que a veces no resuelven nada: un `alt` en el elemento equivocado, un color «más oscuro» que sigue sin llegar a 4.5:1, o un fragmento reformateado que ya no coincide con el original. Mostrarlas como solución en una herramienta de accesibilidad enseña lo contrario de lo que promete.

## Decisión
Cada corrección se aplica sola sobre el HTML original y se vuelve a auditar con axe. Es **resuelta** solo si:
1. el par regla + selector desaparece,
2. esa regla afecta a menos elementos que antes (un cambio de selector no cuenta), y
3. no aparece ningún problema nuevo.

Además, la corrección **no puede quitar ni ocultar el elemento**: si el mismo tipo de elemento desaparece del fragmento o queda con `hidden`, `aria-hidden="true"`, `display:none` o `visibility:hidden` (y el original no lo estaba), axe deja de verlo pero no está corregido.

Si no, queda como «no resolvió», «resolvió pero introdujo otros», «quitó u ocultó el elemento» o «no se pudo aplicar» (el fragmento no está en el HTML). Esas van aparte, en «Sin solución verificada», y su código queda dentro de un `<details>` cerrado. En el reporte Markdown, el código solo aparece para las resueltas.

El documento completo corregido también se re-audita, y se muestra su puntaje real; si trae problemas nuevos o baja el puntaje, se avisa antes de ofrecer el diff y la descarga.

## Consecuencias
- Lo que la app llama solución está comprobado con la misma herramienta que encontró el problema.
- Una corrección puede no verificarse sola y sí resolverse en el documento completo (dos cambios que dependen uno del otro); la interfaz muestra ambos resultados sin contradecirse.
- Verificar cuesta una auditoría por corrección (unos cientos de milisegundos cada una, con progreso visible). No gasta cuota de Gemini.
- La verificación solo cubre lo que axe detecta.
