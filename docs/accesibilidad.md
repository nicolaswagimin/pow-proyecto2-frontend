# Accesibilidad

a11Lens audita accesibilidad, así que la propia app tiene que ser ejemplar. Objetivo: **WCAG 2.2 AA en todo y AAA en el contraste del texto principal**, en claro y oscuro, en escritorio y móvil.

## Decisiones

### Foco
- Anillo doble (`--anillo-foco`): 2 px interiores y 4 px exteriores de colores opuestos, así que siempre contrasta con el fondo (WCAG 2.4.7 y 2.4.13). En claro, la tinta del anillo interior tiene 18:1.
- Se suma un `outline` transparente: en el modo de alto contraste de Windows las sombras desaparecen y el navegador pinta ese outline con el color del sistema.
- Los campos llevan el anillo en todo el recuadro, no solo en el `<input>`.
- Orden de tabulación del acceso: logo, tema, correo, contraseña, mostrar contraseña, botón, enlace a registro, interruptor de anotaciones, auditar. Enter envía.
- Al cambiar entre login y registro, el foco va al título, salvo que la persona ya esté escribiendo.

### Formularios
- Labels visibles arriba, en negrita. Ningún placeholder reemplaza un label.
- `aria-required="true"` en los campos obligatorios (y la anotación lo muestra).
- `autocomplete`: `email`, `current-password`, `new-password`, `name`. `type="email"` con `inputmode="email"`.
- Los errores aparecen al salir del campo la primera vez y se actualizan al escribir. Se enlazan con `aria-describedby`, marcan `aria-invalid` y llevan ícono, texto y subrayado de marcador.
- Al enviar con errores, el foco va al primer campo inválido y un `aria-live` resume qué revisar.
- El botón de mostrar contraseña tiene `aria-label` y `aria-pressed`, y no saca el foco del campo.
- Bloq Mayús y la fortaleza de la contraseña se anuncian con `aria-live`.

### Las anotaciones
- El margen es un `<aside>` con su título (`aria-labelledby`), fuera de `<main>`.
- **No es una región `aria-live`.** Quien usa lector de pantalla ya escucha el campo al enfocarlo; anunciar además la anotación duplicaría todo. La ficha se puede leer navegando al margen.
- El interruptor usa `role="switch"` con `aria-checked`. Su nombre accesible ("Mostrar anotaciones") empieza por el texto visible (WCAG 2.5.3) y la elección se recuerda.
- Lo que falla en una ficha se marca con texto ("Falta", "No cumple", "menos de 24 × 24") y con subrayado ondulado, no solo con color.
- En móvil el margen fijo muestra solo la frase del lector para no tapar el formulario.
- La línea guía y la lente son `aria-hidden`.

### Contraste, color y texto
- Texto principal, secundario y de acciones a 7:1 o más (AAA); estados a 4.5:1 o más; bordes de control a 5:1 sobre la hoja. Tabla en [design-system.md](design-system.md), y medida en vivo en `/design`.
- Los estados del sistema en `/app` se dicen con texto ("Responde", "No responde", "Sin configurar") además del ícono y el color.
- El botón deshabilitado y el campo deshabilitado suman un borde discontinuo o un rayado, no solo opacidad.
- Atkinson Hyperlegible Next, tamaños en `rem` e interlineado de 1.6.

### Movimiento
- Solo se anima lo que responde a una acción ([animaciones.md](animaciones.md)). No hay sacudida al fallar: el error se anuncia y el foco se mueve.
- `prefers-reduced-motion` desactiva la lente que recorre el foco y todas las transiciones.
- Nada depende del cursor.

### Táctil
- Objetivos de 44 × 44 px o más (WCAG 2.5.8 pide 24 × 24, y la ficha lo mide en cada control).

## Verificación

Fecha: 2026-10-12. Herramientas: axe-core 4.14 (reglas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` y `best-practice`) con Playwright sobre Chrome, más pruebas de teclado, de movimiento reducido y con el backend apagado.

| Ruta | Claro 1440 px | Claro 390 px | Oscuro 1440 px | Oscuro 390 px |
|---|---|---|---|---|
| `/login` | 0 violaciones | 0 | 0 | 0 |
| `/registro` | 0 | 0 | 0 | 0 |
| `/app` (con sesión) | 0 | 0 | 0 | 0 |
| `/design` | 0 | 0 | 0 | 0 |

Estados de interacción auditados aparte (claro y oscuro):

| Estado | Resultado |
|---|---|
| Registro enviado vacío: tres errores visibles y la ficha abierta | 0 violaciones |
| Anotaciones ocultas con el interruptor | 0 violaciones |

Además, el botón "Auditar esta página" corre axe dentro de la app sobre el propio login: "0 problemas. 27 reglas de WCAG 2.2 A y AA superadas".

- **Teclado:** el recorrido con Tab sigue el orden de arriba. Al enviar vacío con Enter, el foco queda en Correo con `aria-invalid="true"`.
- **Problemas encontrados y corregidos al verificar:** el interruptor se anunciaba solo como "Mostrar" (corregido a "Mostrar anotaciones"); en móvil el margen fijo tapaba el formulario (ahora muestra solo la frase del lector); la ficha podía quedar encima del botón de auditar (ahora se detiene antes).

axe no reemplaza una prueba con lector de pantalla real. Queda pendiente recorrer el acceso con VoiceOver y NVDA.
