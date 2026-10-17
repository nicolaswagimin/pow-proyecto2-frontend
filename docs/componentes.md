# Componentes

Todos son standalone, con `ChangeDetectionStrategy.OnPush`, `input()` / `output()` y signals. Solo usan tokens de `tokens.css`. Se ven en todos sus estados en `/design`, donde además se pueden anotar y auditar.

## La lente (`app/lente/`)

### `inspeccion.ts` (funciones)

| Función | Qué devuelve |
|---|---|
| `inspeccionar(el)` | `Inspeccion`: etiqueta (`<input type="email">`), nombre accesible, rol en palabras, estados, descripción enlazada, autocompletar, contraste del texto con su nivel, tamaño del objetivo y la frase del lector de pantalla |
| `nombreAccesible(el)` | Nombre en el orden de accname simplificado: `aria-labelledby`, `aria-label`, `<label for>`, `<label>` envolvente, `title` y, en botones, enlaces y títulos, su texto |
| `rolDe(el)` | "campo de texto (correo)", "campo de contraseña", "botón", "enlace", "interruptor", "encabezado de nivel 1"… |
| `estadosDe(el)` | "obligatorio", "inválido", "no disponible", "ocupado", "presionado", "activado"… |
| `contrasteDe(el)` | Contraste del color del texto contra su fondo real (sube por los ancestros mezclando fondos semitransparentes) y su nivel: AAA, AA o "No cumple", según si el texto es grande |
| `contrasteEntre(a, b)` | Contraste entre dos colores CSS (`#rrggbb`, `rgb()`, `color(srgb …)`) |
| `resumir(ambito)` | Idioma de la página, cantidad de títulos y campos, y cuántos controles no tienen nombre accesible |

### `app-margen`

| Input | Tipo | Descripción |
|---|---|---|
| `ambito` | `HTMLElement` (requerido) | Parte de la página que se anota |

- Escucha `focusin` y `focusout` en el documento; anota los elementos del ámbito y los del propio margen.
- Se actualiza al escribir y cuando cambian `aria-invalid`, `aria-describedby`, `aria-busy`, `disabled` o `aria-pressed` (MutationObserver), agrupando los cambios en un `requestAnimationFrame`.
- Sin foco, muestra el resumen de la página.
- **Interruptor** "Mostrar anotaciones" (`role="switch"`, `aria-checked`), recordado en `localStorage` (`a11lens.anotaciones`).
- **Ficha:** en escritorio se desliza hasta la altura del campo enfocado sin pasar de la auditoría, y una línea guía discontinua la une con el campo. En móvil el margen queda fijo arriba y solo muestra la frase del lector.
- **Lente:** al tabular, un anillo viaja del control anterior al nuevo y se desvanece.
- No es `aria-live`: quien usa lector ya escucha el campo, y repetirlo lo duplicaría.

### `app-auditoria`

| Input / output | Tipo | Descripción |
|---|---|---|
| `textoBoton` | `string` | Por defecto "Auditar esta página" |
| `auto` | `boolean` | Audita apenas aparece, sin esperar al botón. Por defecto `false`; lo usa la insignia de `/app` |
| `termino` (output) | `void` | Al terminar, para que el margen relea el botón (su texto cambió) |
| `problemas` (output) | `number` | Cuántas reglas fallaron. No se emite si axe no pudo cargar |

Importa `axe-core` solo al auditar y corre, con `iframes: false`, las reglas de WCAG 2.2 A y AA sobre el documento. El resultado va en un `role="status"`: "0 problemas. N reglas superadas", o la lista de problemas con su impacto (crítico, grave, moderado, menor), la cantidad de elementos y el enlace a la explicación. Si no puede cargar axe, lo dice.

## Auditoría (`app/auditor/componentes/`)

### `ui-lente`

| Input / output | Tipo | Descripción |
|---|---|---|
| `html`, `baseHref` | `string` | La página auditada, en el iframe aislado ([lente.md](lente.md)) |
| `selectores`, `seleccionado` | `string[]`, `string \| null` | Qué resaltar y cuál enfocar |
| `direccion` | `string` | Lo que muestra la barra de la ventana: la URL, el archivo o el nombre de lo pegado |
| `clic` (output) | `string` | Selector del elemento resaltado en el que se hizo clic |
| `visibles` (output) | `string[]` | Selectores de los elementos resaltados que están a la vista, en el orden de la página |

Se ve como una ventana de navegador: barra con tres puntos (`aria-hidden`) y la dirección.

### `ui-recomendaciones`

| Input / output | Tipo | Descripción |
|---|---|---|
| `estado` | `'vacio' \| 'auditando' \| 'listo' \| 'error'` | Para el estado vacío y «Auditando…» |
| `problemas` | `Problema[] \| null` | `null` antes de auditar |
| `visibles` | `string[]` | Lo que avisa `ui-lente` |
| `seleccionado` | `string \| null` | Marca la recomendación con `aria-pressed` |
| `correcciones` | `CorreccionVerificada[]` | Si hay, muestra la explicación de la IA y su estado |
| `seleccionar` (output) | `string` | Clic en una recomendación |
| `probar` (output) | `string` | Clic en un ejemplo del estado vacío (su URL) |

- **Estados:** vacío (qué va a encontrar a11Lens y dos ejemplos), «Auditando…», sin problemas, y con problemas.
- **Con problemas:** un contador, la lista de los que están a la vista y aparte «En toda la página». Cada recomendación tiene gravedad, descripción, qué hacer (`queHacer(regla)` de `auditor/recomendaciones.ts`), la explicación de la IA si hay, y la ubicación.
- No es `aria-live`.

## Base (`app/ui/`)

### `ui-button`

| Input | Tipo | Por defecto |
|---|---|---|
| `variante` | `'primario' \| 'secundario' \| 'fantasma' \| 'peligro'` | `'primario'` |
| `tipo` | `'button' \| 'submit'` | `'button'` |
| `tamano` | `'normal' \| 'compacto'` | `'normal'` (48 px; compacto 44 px) |
| `cargando` | `boolean` | `false` |
| `textoCargando` | `string` | `'Cargando…'` |
| `deshabilitado` | `boolean` | `false` |
| `anchoCompleto` | `boolean` | `false` |
| `etiqueta` | `string \| null` | Para botones de solo ícono |

Estados: hover (solo con puntero), foco (anillo doble), presionado (baja 1 px), deshabilitado (55 % y borde discontinuo, para no depender solo de la opacidad), cargando (el texto cambia a `textoCargando` dentro de un `role="status"`, una línea de marcador recorre la base, `aria-busy` y el clic no hace nada). El fantasma va subrayado, como un enlace.

Método público: `enfocar()`.

### `ui-text-field`

Compatible con Reactive Forms (`ControlValueAccessor`).

| Input | Tipo | Descripción |
|---|---|---|
| `label` | `string` (requerido) | Visible, arriba y en negrita |
| `tipo` | `'text' \| 'email'` | `email` agrega `inputmode="email"` |
| `autocomplete` | `string` | |
| `icono` | `NombreIcono \| null` | Decorativo |
| `ayuda` | `string \| null` | Enlazada con `aria-describedby` |
| `error` | `string \| null` | Activa `aria-invalid`, reemplaza la ayuda y se subraya con el marcador |
| `requerido` | `boolean` | `aria-required="true"` |
| `multilinea`, `opcional`, `maxlength` | | |

Estados: reposo (borde de 2 px), hover, foco (borde de tinta y anillo doble en todo el campo), error (borde rojo, ícono y mensaje con ícono), deshabilitado (rayado diagonal además de la opacidad).

### `ui-password-field`

Igual que el campo de texto (`label`, `autocomplete`, `ayuda`, `error`, `requerido`) más `conMedidor`. Botón de mostrar u ocultar con `aria-label` y `aria-pressed`, sin perder el foco ni el cursor. Aviso de Bloq Mayús con `aria-live`.

### `ui-strength-meter`

`password: string`. Cuatro tramos con borde que se rellenan según el nivel; el débil usa el color de error. El texto ("Fortaleza: Fuerte. …") es la información y se anuncia con `aria-live`; los tramos son `aria-hidden`.

### `ui-alert`

`tipo: 'error' | 'exito' | 'info' | 'aviso'`, `titulo: string | null`. Anotación con borde lateral de 6 px, ícono y texto. Errores con `role="alert"`; el resto, `role="status"`.

### `ui-avatar`

`iniciales: string`. Círculo de tinta. `aria-hidden`: el nombre se muestra al lado.

### `ui-icon`

`nombre: NombreIcono`. Íconos de función (correo, candado, usuario, alerta, check…), siempre decorativos.

### `ui-theme-toggle`

El símbolo de contraste: un círculo mitad tinta, mitad papel. Al cambiar de tema, la mitad rellena gira media vuelta. `aria-label` dice a qué modo cambia.

## Plantilla

### `app-auth-layout`

Slots: `[auth-encabezado]`, contenido por defecto y `[auth-pie]`, todos dentro de `<main>`, que es el ámbito del margen. Al lado, un `<aside aria-labelledby="titulo-anotaciones">` con `app-margen`. En móvil suma una `app-auditoria` al pie del formulario.

### `app-insignia-auditoria`

La autoauditoría de a11Lens en el pie de `/app`.

- Muestra un botón pequeño, «Esta app: 0 problemas WCAG 2.2 AA», con `aria-expanded` y `aria-controls`.
- El 0 es el de la última verificación documentada en [accesibilidad.md](accesibilidad.md).
- Al abrirlo por primera vez crea su detalle con `app-auditoria [auto]="true"`, y el texto pasa a mostrar el resultado real («1 problema», «2 problemas»).
- El detalle se conserva al cerrarlo (`hidden`).
