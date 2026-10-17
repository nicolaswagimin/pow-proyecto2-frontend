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

### Las anotaciones (acceso y `/design`)
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

### Las pantallas de auditoría (`/app` e `/historial`)
- Cada bloque de `/app` es una `<section>` con su `h2` (`aria-labelledby`): Auditar, Resultado, Lente, Problemas, Corregir con IA, Antes y después, Guardar y exportar.
- Las pestañas de entrada siguen el patrón de ARIA (`tablist`, `tab`, `tabpanel`, `aria-selected`) y se recorren con las flechas, Inicio y Fin.
- La gravedad se dice con texto («Crítico», «Serio»…), además del color; el diff marca las líneas con − y + además del fondo.
- **Todo lo de la lente se puede hacer desde la lista.** «Ver en la lente» lleva `aria-pressed`; un clic en la vista previa devuelve el foco al botón del problema en la lista. El iframe tiene título («Vista previa aislada de la página auditada»). El iframe oculto que verifica correcciones es `aria-hidden` y `tabindex="-1"`.
- La corrección con IA anuncia su progreso en una región `role="status"` («Lote 2 de 3: verificando las correcciones con axe…») y el botón queda en estado de carga con texto visible. Al terminar la ronda, el botón dice cuántos elementos quedan («Corregir más (quedan 13 elementos)»).
- **La columna de recomendaciones** es un `<aside aria-labelledby="titulo-recomendaciones">` fuera de `<main>` (en móvil, una `<section>` dentro del contenido).
  - Como las anotaciones, **no es `aria-live`**: cambia con cada scroll de la vista previa y hablaría sin parar.
  - Un contador en texto dice cuántos elementos hay a la vista del total.
  - Cada recomendación es un botón con `aria-pressed` que selecciona el problema y lleva el foco a la lista.
  - La gravedad se dice con texto, además del borde de color.
- **La insignia de autoauditoría** del pie es un botón con `aria-expanded` y `aria-controls` hacia su detalle, que está siempre en el DOM y se oculta con `hidden`.
  - El resultado se dice con texto («0 problemas»), y el ícono es decorativo.
  - La autoauditoría corre con `iframes: false`: la vista previa es la página auditada, no a11Lens.
- En el historial, la línea de evolución es decorativa (`aria-hidden`): los puntajes y su cambio están en texto. Borrar pide confirmación en línea, sin diálogo modal.
- «¿Cómo se calcula?» es un `<details>` nativo.

### Táctil
- Objetivos de 44 × 44 px o más (WCAG 2.5.8 pide 24 × 24, y la ficha lo mide en cada control).

## Verificación

### 2026-10-17 · Corrección por fragmentos y columna de recomendaciones

axe-core 4.14 (reglas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`) con Playwright sobre Chrome, en 1440 y 390 px, claro y oscuro: **29 de 29 auditorías con 0 violaciones**.

| Vista | Claro 1440 px | Claro 390 px | Oscuro 1440 px | Oscuro 390 px |
|---|---|---|---|---|
| `/login` | 0 violaciones | 0 | 0 | 0 |
| `/registro` | 0 | 0 | 0 | 0 |
| `/design` | 0 | 0 | 0 | 0 |
| `/app` vacío (estado vacío de recomendaciones) | 0 | 0 | 0 | 0 |
| `/app` con la insignia abierta | 0 | 0 | 0 | 0 |
| `/app` con resultado, lente y recomendaciones | 0 | 0 | 0 | 0 |
| `/app` con correcciones de la IA (Gemini real) | 0 | — | — | — |
| `/historial` | 0 | 0 | 0 | 0 |

Además, en las cuatro combinaciones:
- la autoauditoría en vivo de la insignia dio «0 problemas»;
- al desplazarse por la vista previa, el contador de la columna pasó a mostrar elementos a la vista.

### 2026-10-17 · Funcionalidad de auditoría

axe-core 4.14 (reglas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`) con Playwright sobre Chrome, en 1440 y 390 px, claro y oscuro: **24 de 24 vistas con 0 violaciones**.

| Vista | Claro 1440 px | Claro 390 px | Oscuro 1440 px | Oscuro 390 px |
|---|---|---|---|---|
| `/login` | 0 violaciones | 0 | 0 | 0 |
| `/registro` | 0 | 0 | 0 | 0 |
| `/app` vacío | 0 | 0 | 0 | 0 |
| `/app` con resultados, lente y problemas | 0 | 0 | 0 | 0 |
| `/app`, pestaña URL | 0 | 0 | 0 | 0 |
| `/historial` | 0 | 0 | 0 | 0 |

El contenido del iframe de la lente es la página auditada (con sus propios problemas, a propósito): se excluye de la auditoría de la app.

### 2026-10-12 · Identidad y acceso

Herramientas: axe-core 4.14 (reglas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` y `best-practice`) con Playwright sobre Chrome, más pruebas de teclado, de movimiento reducido y con el backend apagado.

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
