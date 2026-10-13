# Brief de diseño · a11Lens

## El encargo

- **Producto:** a11Lens, un autocorrector de accesibilidad web. La persona pega HTML (o una URL), la app detecta los problemas con axe-core, los explica en lenguaje simple y la IA propone el código corregido.
- **Pantallas de este trabajo:** acceso (login y registro), bienvenida de `/app` y guía `/design`.
- **Trabajo principal del acceso:** que alguien entre o cree su cuenta en segundos y, mientras lo hace, vea cómo trabaja el producto: inspeccionar y explicar la accesibilidad.
- **Quién la usa:** desarrolladores y diseñadores que quieren cumplir WCAG; en la sustentación, el profesor.
- **Qué debe sentir:** confianza (la herramienta sabe de lo que habla), claridad, precisión de auditor.
- **Restricción que define todo:** la propia app tiene que ser ejemplar en accesibilidad. WCAG 2.2 AA como mínimo y AAA en el contraste del texto.

## El problema que resuelve el rediseño

El diseño anterior ("Constructiva": póster Bauhaus con titular gigante, formas en parallax, tarjeta que se inclinaba en 3D y confeti) no tenía relación con el tema. Además, una herramienta de accesibilidad con texto gigante en mayúsculas, inclinación al cursor y confeti contradice lo que audita.

## Dirección elegida: Margen anotado

La interfaz es el **informe de un auditor**: tinta sobre papel, con anotaciones en el margen y un marcador amarillo para lo que hay que mirar. Del lado derecho de una línea de margen (como la del cuaderno) se anota cada elemento.

**La lente es el foco.** No es una lupa que persigue al cursor, porque eso dejaría fuera a quien usa teclado. El anillo de foco es la firma de la marca: un anillo doble, tinta por dentro y marcador por fuera, que se ve sobre cualquier fondo. El logo es una lupa con ese mismo anillo.

### Paleta

| Token | Claro (papel) | Oscuro (pantalla de lectura) |
|---|---|---|
| fondo / superficie | `#F4F5F7` / `#FFFFFF` | `#111219` / `#1A1C26` |
| texto | `#15161E`: 16.5:1 | `#F3F3EE`: 16.8:1 |
| texto suave | `#474B5C`: 7.9:1 | `#B4B7C6`: 9.4:1 |
| primario (tinta azul) | `#1F2A7A`, texto blanco 12.6:1 | `#A9B4FF`, texto `#111219` 9.5:1 |
| marcador | `#FFE14D` con texto `#15161E`: 13.8:1 | igual |
| error / éxito / aviso | `#B42318` 6.6:1 · `#0E6B3A` 6.6:1 · `#8A4B00` 6.8:1 | `#FF8A80` 7.4:1 · `#6EE7A0` 11:1 · `#FFC97A` 11.2:1 |

El texto principal y el secundario son AAA (7:1 o más) en ambos modos. La lista completa está en [design-system.md](design-system.md).

### Tipografía

**Atkinson Hyperlegible Next** (400 y 700) para todo y **Atkinson Hyperlegible Mono** (400 y 700) para código y atributos. La diseñó el Braille Institute para personas con baja visión: sus letras no se confunden entre sí (I l 1, O 0, rn m). En una herramienta de accesibilidad, la tipografía es parte del argumento.

### Composición

```
Escritorio                                          Móvil
┌──────────────────────────────────────────────┐    ┌──────────────────┐
│ ◎ a11Lens                               [◐]  │    │ ◎ a11Lens    [◐] │
│ ┌───────────────────────┬──────────────────┐ │    │ Anotaciones [■ ] │ ← fijo
│ │ Inicia sesión         ┃ Anotaciones [■ ] │ │    │ «Correo, campo…» │
│ │ Enfoca cualquier…     ┃ ┌──────────────┐ │ │    │━━━━━━━━━━━━━━━━━━│
│ │ Correo                ┃ │<input email> │ │ │    │ Inicia sesión    │
│ │ ╔══════════════════╗┄┄┃┄│Nombre: Correo│ │ │    │ Correo           │
│ │ ╚══════════════════╝  ┃ │Rol, estado…  │ │ │    │ [______________] │
│ │ Contraseña            ┃ │«Correo, …»   │ │ │    │ Contraseña       │
│ │ [________________]    ┃ └──────────────┘ │ │    │ [______________] │
│ │ [ Iniciar sesión ]    ┃ [Auditar página] │ │    │ [Iniciar sesión] │
│ │ ¿No tienes cuenta?    ┃                  │ │    │ [Auditar página] │
│ └───────────────────────┴──────────────────┘ │    └──────────────────┘
└──────────────────────────────────────────────┘
```

Alineación a la izquierda. La línea del margen separa el contenido de las anotaciones; una línea guía discontinua une el campo enfocado con su ficha.

### El login es una demostración del producto

1. El formulario se anota a sí mismo. Al enfocar un campo (con Tab o con un clic), el margen muestra una ficha de marcador con lo que la herramienta inspecciona, **calculado en vivo desde el DOM**: la etiqueta del elemento, su nombre accesible, el rol, los estados (obligatorio, inválido), el autocompletar, la descripción enlazada, el contraste real de su texto y el tamaño del objetivo (WCAG 2.5.8).
2. Debajo, **lo que diría un lector de pantalla**: «Correo, campo de texto (correo), obligatorio, ana@ejemplo.com».
3. Al tabular, un anillo viaja del control anterior al nuevo: se ve el orden de foco.
4. Si hay un error, la ficha muestra "inválido" y el mensaje enlazado con `aria-describedby`. Así se ve que el error también se anuncia.
5. "Auditar esta página" carga axe-core bajo demanda y lo corre sobre el propio login: el resultado real es "0 problemas".
6. Un interruptor (`role="switch"`) oculta las anotaciones y recuerda la elección.

### Extensión a `/app`

`/app` es la misma hoja anotada: el contenido a la izquierda y el margen a la derecha, que anota cualquier control enfocado y permite auditar la página. El estado del sistema es una lista de verificación con resultado en texto ("Responde", "No responde", "Sin configurar"). Lo que falla se resalta con el marcador. Las secciones son apartados con regla, no tarjetas.

## Revisión contra lo genérico

| Default genérico | Qué se hizo |
|---|---|
| Lupa que sigue al cursor | La lente es el foco: funciona con teclado y no depende del mouse. |
| Tarjeta 3D, confeti, partículas | Nada de eso. El único elemento móvil es la anotación del elemento enfocado. |
| Tarjetas redondeadas idénticas | Apartados de informe con regla bajo el título. La única "tarjeta" es la ficha de marcador, y tiene un motivo. |
| Fondo casi negro con acento ácido | El amarillo es un marcador real sobre papel. En oscuro es una pantalla de lectura con el mismo marcador. |
| Monoespaciado de adorno | Solo en código y atributos (`<input type="email">`, `current-password`, la frase del lector). |

## Direcciones descartadas

- **Laboratorio óptico:** lentes, aberración cromática y escalas de dioptrías. Se descartó porque la aberración cromática daña el contraste y la estética de "óptica" no dice nada de WCAG.
- **Terminal de auditoría:** salida de consola con líneas `PASS` / `FAIL`. Se descartó porque deja fuera a los diseñadores, que también usan la herramienta, y se acerca al cliché de fondo negro con acento verde.

## Textos

- Login: "Inicia sesión" / "Enfoca cualquier campo: las anotaciones muestran lo que anuncia un lector de pantalla." Botón "Iniciar sesión". Enlace "¿No tienes cuenta? Crea una".
- Registro: "Crea tu cuenta" / "Cada campo nuevo trae su anotación: compruébalo con Tab." Botón "Crear cuenta".
- Margen: "Anotaciones", "Mostrar anotaciones", "Un lector de pantalla diría", "Auditar esta página", "0 problemas. N reglas de WCAG 2.2 A y AA superadas."
- Errores: "El correo o la contraseña no coinciden.", "Ese correo ya tiene una cuenta.", "Escribe un correo válido, como nombre@dominio.com.", "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo."
