# Animaciones

En una herramienta de accesibilidad, el movimiento tiene que justificarse dos veces: debe contar algo y no puede estorbar a nadie. Regla: solo se anima lo que responde a una acción de la persona. No hay movimiento al cargar la página, ni efectos de cursor, ni nada en bucle salvo una carga en curso.

Con `prefers-reduced-motion: reduce`, `base.css` lleva toda duración a 1 ms, y la lente lo comprueba en TypeScript para no lanzar su recorrido.

| Animación | Dónde | Qué comunica | Duración | Con movimiento reducido |
|---|---|---|---|---|
| La lente recorre el foco | `app-margen` | El orden de foco: un anillo viaja del control anterior al nuevo y se desvanece sobre el anillo real | 420 ms | No se anima; queda el anillo de foco del control |
| La ficha se desliza | `app-margen` | Qué elemento se está anotando: la ficha baja hasta su altura | `--duracion-lenta` | Cambia de lugar sin desplazarse |
| Marcador bajo el error | `campo.css` | Lo que hay que corregir: el marcador subraya el mensaje de izquierda a derecha | `--duracion-lenta` | El subrayado aparece completo |
| Interruptor | `app-margen` | Anotaciones activadas o no (además, la pista se rellena con el marcador) | `--duracion-media` | Cambio instantáneo |
| Línea de escaneo del botón | `ui-button` | La petición o la auditoría está en curso; acompaña al texto que cambia | Bucle de 1.1 s solo mientras carga | Línea quieta; el texto sigue cambiando |
| Registro nuevo | `/app` | Qué cambió en la lista: el registro aparece con el marcador, que se desvanece | 1.2 s | Sin transición |
| Registro que sale | `/app` | Se borró | `--duracion-media` | Sin transición |
| Símbolo de contraste | `ui-theme-toggle` | El contraste se invierte: la mitad rellena gira media vuelta | `--duracion-lenta` | Cambio instantáneo |
| Ojo de la contraseña | `ui-password-field` | Contraseña visible u oculta | `--duracion-lenta` | Cambio instantáneo |
| Cambio de tema | `TemaService` (View Transitions) | Fundido entre los dos temas | `--duracion-media` | Sin transición |

## Qué se quitó del diseño anterior y por qué

| Antes | Motivo |
|---|---|
| Formas geométricas en parallax que seguían al cursor | Efecto de cursor sin información; el movimiento de fondo distrae a quien tiene dificultades de atención |
| Tarjeta que se inclinaba en 3D y giraba al cambiar de modo | Efecto de cursor; el giro desorienta, y la página no cambia de lugar |
| Sacudida al fallar el envío | El error ya se anuncia y el foco va al primer campo inválido; la sacudida no agrega información y puede molestar a personas con trastornos vestibulares |
| Confeti al entrar | Decorativo |
| Barra tricolor que se trazaba bajo el título y entrada en cascada | Movimiento sin acción que lo provoque |
| Saludo letra por letra en `/app` | Decorativo; además, un lector de pantalla necesitaba un `aria-label` aparte |
| Cuartos del avatar que llegaban volando | Decorativo |
