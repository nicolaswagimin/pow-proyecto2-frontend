# Design system · Margen anotado

Todos los valores viven en `src/styles/tokens.css`. Ningún componente usa un color, tamaño o duración fuera de estos tokens. La guía `/design` muestra cada color con su contraste **medido en vivo** contra el fondo y la superficie, en el tema activo.

El modo oscuro se aplica siguiendo al sistema (`prefers-color-scheme: dark`) y por elección manual (`[data-theme='dark']`, que guarda el botón de contraste). Por eso los valores oscuros aparecen dos veces.

## Color

| Token | Uso | Claro | Oscuro |
|---|---|---|---|
| `--color-fondo` | Fondo de la página, alrededor de la hoja | `#F4F5F7` | `#111219` |
| `--color-superficie` | La hoja: formulario, informe, margen | `#FFFFFF` | `#1A1C26` |
| `--color-texto` | Texto principal, anillo interior del foco en claro | `#15161E` | `#F3F3EE` |
| `--color-texto-suave` | Texto secundario | `#474B5C` | `#B4B7C6` |
| `--color-borde` | Borde de campos y controles | `#6B6F80` | `#8A8EA3` |
| `--color-regla` | Separadores finos (decorativos) | `#D9DBE3` | `#2B2E3B` |
| `--color-linea-margen` | La línea roja del margen (decorativa) | `#E3A3A3` | `#6B3A42` |
| `--color-primario` | Tinta azul: botón principal | `#1F2A7A` | `#A9B4FF` |
| `--color-primario-contraste` | Texto sobre el primario | `#FFFFFF` | `#111219` |
| `--color-enlace` | Enlaces | `#1F2A7A` | `#A9B4FF` |
| `--color-marcador` | Fichas de anotación, anillo exterior del foco, lo que falla | `#FFE14D` | `#FFE14D` |
| `--color-marcador-texto` | Texto sobre el marcador | `#15161E` | `#15161E` |
| `--color-error` | Errores | `#B42318` | `#FF8A80` |
| `--color-exito` | Lo que cumple | `#0E6B3A` | `#6EE7A0` |
| `--color-aviso` | Avisos | `#8A4B00` | `#FFC97A` |
| `--color-foco` | Anillo interior del foco | `#15161E` | `#FFE14D` |
| `--color-foco-exterior` | Anillo exterior del foco | `#FFE14D` | `#111219` |

### Contraste verificado (WCAG 2.2)

| Par | Claro | Oscuro | Meta |
|---|---|---|---|
| texto / fondo | 16.5:1 | 16.8:1 | 7:1 (AAA) |
| texto / superficie | 18.0:1 | 15.2:1 | 7:1 (AAA) |
| texto suave / fondo | 7.9:1 | 9.4:1 | 7:1 (AAA) |
| texto suave / superficie | 8.7:1 | 8.5:1 | 7:1 (AAA) |
| primario / superficie | 12.6:1 | 8.6:1 | 7:1 (AAA) |
| texto del botón / primario | 12.6:1 | 9.5:1 | 7:1 (AAA) |
| texto / marcador | 13.8:1 | 13.8:1 | 7:1 (AAA) |
| error / superficie | 6.6:1 | 7.4:1 | 4.5:1 (AA) |
| éxito / superficie | 6.6:1 | 11.0:1 | 4.5:1 (AA) |
| aviso / superficie | 6.8:1 | 11.2:1 | 4.5:1 (AA) |
| borde de control / superficie | 5.0:1 | 5.2:1 | 3:1 |
| anillo interior del foco / superficie | 18.0:1 | 13.0:1 | 3:1 |

El texto principal, el secundario y el de las acciones son AAA. Error, éxito y aviso son AA y siempre van acompañados de ícono y texto.

## El anillo de foco

```css
--anillo-foco: 0 0 0 2px var(--color-foco), 0 0 0 6px var(--color-foco-exterior);
```

Un anillo interior de 2 px y uno exterior de 4 px. En claro: tinta por dentro y marcador por fuera. En oscuro: marcador por dentro y fondo por fuera. Por eso siempre hay un anillo que contrasta con lo que hay alrededor.

`base.css` lo aplica a todo `:focus-visible` junto con un `outline` transparente. En el modo de alto contraste de Windows las sombras desaparecen, y el navegador pinta ese outline con el color del sistema. Los componentes que ya usan `box-shadow` (campos, botones) suman `var(--anillo-foco)` a su sombra.

## Tipografía

| Token | Valor |
|---|---|
| `--font-display`, `--font-texto` | Atkinson Hyperlegible Next, con respaldo `system-ui` |
| `--font-codigo` | Atkinson Hyperlegible Mono, con respaldo `ui-monospace` |
| Pesos | `--peso-normal` 400, `--peso-fuerte` 700, `--peso-display` 700 |
| Interlineado | `--leading-ajustado` 1.15, `--leading-normal` 1.6 (lectura cómoda, WCAG 1.4.12) |

Escala: `--text-xs` 0.75rem, `--text-sm` 0.875rem, `--text-base` 1rem, `--text-lg` 1.125rem, `--text-xl` 1.375rem, `--text-2xl` clamp(1.45rem → 1.9rem), `--text-3xl` clamp(2rem → 3.1rem).

Todo el tamaño está en `rem`: respeta el tamaño de letra que elija la persona en su navegador.

## Espaciado

Escala de 4 px: `--space-1` (4 px), `-2` (8), `-3` (12), `-4` (16), `-5` (20), `-6` (24), `-8` (32), `-10` (40), `-12` (48), `-16` (64).

## Radios

| Token | Valor | Dónde |
|---|---|---|
| `--radius-control` | 4 px | Botones, campos, alertas, ficha de anotación |
| `--radius-panel` | 8 px | La hoja |

## Sombras

Un solo nivel: `--shadow-elevacion-2` separa la hoja del fondo en escritorio. Todo lo demás se separa con bordes y reglas de 1–2 px, como en un documento impreso.

## Movimiento

| Token | Valor | Uso |
|---|---|---|
| `--duracion-rapida` | 120 ms | Opacidad del ojo de la contraseña |
| `--duracion-media` | 220 ms | Interruptor, hover, fundido de tema |
| `--duracion-lenta` | 420 ms | Ficha que se desliza, marcador que subraya un error, giro del símbolo de contraste |
| `--easing-salida` | `cubic-bezier(0.16, 1, 0.3, 1)` | Casi todo |
| `--easing-entrada` | `cubic-bezier(0.7, 0, 0.84, 0)` | Un registro que sale de la lista |
| `--easing-resorte` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Ojo de la contraseña |
| `--easing-suave` | `cubic-bezier(0.45, 0, 0.55, 1)` | Línea de escaneo del botón |

Detalle en [animaciones.md](animaciones.md).
