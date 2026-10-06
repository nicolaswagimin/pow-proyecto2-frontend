# Brief de diseño · Proyecto 2 · Constructiva

## Encargo
- **Pantalla:** acceso (login y registro). Trabajo principal: que alguien entre o cree su cuenta en segundos, y que la primera impresión sea espectacular.
- **Quién la usa:** un profesor evaluando el proyecto (escritorio) y cualquier persona desde el móvil.
- **Qué debe sentir:** contundencia, juego, precisión (todo encaja con peso).
- **Restricciones:** contraste AA, `prefers-reduced-motion`, 60 fps (solo `transform`/`opacity`), modo claro/oscuro, sin librerías de UI. El tema del proyecto aún no se conoce: el nombre vive en `nombreApp`.
- **Prioridad del usuario:** muchas animaciones en todos los elementos (sustituye la regla de "un solo momento memorable").

## Dirección elegida: Constructiva
Un póster Bauhaus que cobra vida: geometría pura (círculos, triángulos, medias lunas), colores primarios, sombras duras y tipografía gigante.

### Paleta (contraste verificado)
| Token | Claro (papel) | Oscuro (tinta) |
|---|---|---|
| fondo | `#ECEEF2` | `#111318` |
| superficie | `#FFFFFF` | `#1C1F27` |
| texto | `#111318` (16:1) | `#F2F2EE` (16.6:1) |
| texto-2 | `#4A4F5C` (8.2:1) | `#A8ADBA` (7.3:1) |
| primario | Cobalto `#1D46C9`, texto botón `#FFFFFF` (7.6:1) | Amarillo `#FFD23F`, texto botón `#111318` (12.9:1) |
| rojo | `#D62B1E` (5:1) | `#FF5A4A` |
| amarillo / cobalto deco | `#FFC21A` (solo decoración) | `#6E8DFF` (5.4:1) |
| sombra dura | `#111318` | `#000000` |
| error | `#B3261E` | `#FF8A80` |
| éxito | `#1E7B3A` | `#5FD38A` |

### Tipografía (solo estos pesos)
- **Unbounded** 600 y 800: titular-póster y títulos.
- **Archivo** 400, 500 y 700: texto, labels y botones.

### Composición
Escritorio (asimétrica)
```
┌──────────────────────────────────────────────────────────────┐
│  ▲ nombreApp                                    ◐ [tema]     │
│        ●                         ┌─────────────────────────┐ │
│  HOLA                    ■       │ Iniciar sesión          │█│
│  DE                              │ ━━━━━━━━━━━━━━━━━━━━━━━ │█│
│  NUEVO.      ◗                   │ Correo                  │█│
│                                  │ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │█│
│  ▲     Tu espacio te espera.     │ Contraseña          ◎   │█│
│                    ●             │ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁ │█│
│     ◐                 ■          │ [██ Iniciar sesión ██]  │█│
│                                  │ ¿Sin cuenta? Crear una  │█│
│   ▲          ●                   └─────────────────────────┘█│
│                                    ██████████████████████████│
└──────────────────────────────────────────────────────────────┘
```
Móvil
```
┌────────────────────┐
│ ▲ nombreApp  [◐]   │
│ HOLA DE    ●       │
│ NUEVO.        ■    │
│┌──────────────────┐│
││ Iniciar sesión   │█
││ Correo           │█
││ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁   │█
││ Contraseña   ◎   │█
││ ▁▁▁▁▁▁▁▁▁▁▁▁▁▁   │█
││[█Iniciar sesión█]│█
││ Crear una cuenta │█
│└──────────────────┘█
│  ███████████████████
└────────────────────┘
```

### Animaciones
- **Fondo:** formas geométricas en SVG con volumen falso que flotan, giran y se mueven en parallax según el mouse, cada capa a su profundidad. Hay unas 14 formas en escritorio y unas 6 en móvil.
- **Entrada:** las formas caen y rebotan al aterrizar, el titular se arma palabra por palabra con un golpe seco, y la tarjeta se desliza mientras su sombra dura aterriza después.
- **Tarjeta:** inclinación 3D que sigue al cursor, con la sombra dura desplazándose en sentido contrario.
- **Login ↔ registro:** giro 3D de dos caras (rotateY 180° con un leve rebote). **La altura de la tarjeta se anima durante el giro**: se mide cada cara y la altura del contenedor interpola entre las dos, para que el registro (con más campos) no quede cortado. Las formas del fondo se reacomodan al mismo tiempo.
- **Campos:** el label sube y se reduce, el subrayado se dibuja como bloque grueso de color, y el ícono geométrico gira 90°.
- **Botón:** magnético; la sombra dura crece al pasar el mouse y se hunde al hacer clic. Al enviar se convierte en círculo, cuadrado y triángulo que saltan en secuencia.
- **Medidor de contraseña:** cuatro bloques que aparecen con pop y cambian de forma: triángulo rojo, media luna, cuadrado y círculo cobalto.
- **Mostrar contraseña:** ojo con iris de diafragma de cámara que se abre en láminas.
- **Error:** sacudida seca con inclinación, y el mensaje entra deslizándose sobre una franja roja.
- **Éxito:** confeti de formas geométricas primarias con giro, y un check que cae como sello estampado.
- **Bienvenida en `/app`:** las formas se ensamblan en el avatar y el nombre se arma con letras que caen.
- **Tema:** un disco que gira y revela su mitad oscura (media luna Bauhaus) con un rebote seco.

### Rendimiento y accesibilidad
- Las animaciones del fondo se pausan con `visibilitychange` (`animation-play-state` y parada del rAF de parallax).
- La cantidad de formas depende del ancho de pantalla, y el parallax se actualiza dentro de `requestAnimationFrame`.
- En dispositivos táctiles se desactivan la inclinación 3D, el botón magnético y el parallax del cursor.
- Con `prefers-reduced-motion`, el giro pasa a un fundido, las formas quedan quietas y no hay confeti.
- El tema recuerda la elección en `localStorage`; la primera vez usa `prefers-color-scheme`.

## Textos
- Titular: "HOLA DE NUEVO." / registro: "EMPIEZA AQUÍ."
- Login: botón "Iniciar sesión", enlace "¿Sin cuenta? Crear una".
- Registro: botón "Crear cuenta", enlace "¿Ya tienes cuenta? Inicia sesión".
- Errores: los mismos mensajes que en el resto del sistema (credenciales, correo duplicado, contraseña corta, correo inválido, servidor caído, demasiados intentos).

## Direcciones de los otros proyectos (no reutilizar aquí)
- **Bioluminiscencia (Proyecto 1):** océano nocturno con plancton en canvas, vidrio cáustico, morph líquido y burbujas.
- **Hora Dorada (Proyecto 3):** atardecer en el desierto con brillo holográfico, panel solar con rebote y estallido solar.

## Cómo re-tematizar
- Cambia los tres primarios (`--color-rojo`, `--color-primario` y `--color-amarillo`) y la tinta en `src/styles/tokens.css`. Las formas del fondo y el confeti usan esos tokens.
- Cambia las familias en `--font-display` y `--font-texto`.
- Cambia `nombreApp` y el titular-póster.
