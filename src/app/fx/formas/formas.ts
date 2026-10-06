import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { esTactil, prefiereMenosMovimiento } from '../../core/movimiento';

type TipoForma =
  'circulo' | 'cuadrado' | 'triangulo' | 'media-luna' | 'anillo' | 'cuarto' | 'rayas';
type ColorForma = 'rojo' | 'cobalto' | 'amarillo' | 'tinta';

interface Forma {
  tipo: TipoForma;
  color: ColorForma;
  // Posición en % del ancho/alto de la pantalla.
  x: number;
  y: number;
  tam: number;
  // Profundidad: cuánto se desplaza con el parallax (más alto = más cerca).
  prof: number;
  // Desplazamiento y giro extra cuando la escena se reacomoda (registro).
  dx: number;
  dy: number;
  giro: number;
  // Prioridad: en pantallas chicas solo se muestran las de prioridad más alta.
  prioridad: 1 | 2 | 3;
}

// Composición de póster: las formas rodean el titular y la tarjeta sin taparlos.
const FORMAS: Forma[] = [
  {
    tipo: 'circulo',
    color: 'cobalto',
    x: 4,
    y: 64,
    tam: 150,
    prof: 0.6,
    dx: 120,
    dy: -60,
    giro: 0,
    prioridad: 1,
  },
  {
    tipo: 'triangulo',
    color: 'rojo',
    x: 40,
    y: 6,
    tam: 96,
    prof: 0.9,
    dx: -80,
    dy: 120,
    giro: 120,
    prioridad: 1,
  },
  {
    tipo: 'media-luna',
    color: 'amarillo',
    x: 84,
    y: 8,
    tam: 170,
    prof: 0.4,
    dx: -140,
    dy: 30,
    giro: 180,
    prioridad: 1,
  },
  {
    tipo: 'cuadrado',
    color: 'tinta',
    x: 93,
    y: 58,
    tam: 64,
    prof: 1,
    dx: -40,
    dy: -120,
    giro: 45,
    prioridad: 2,
  },
  {
    tipo: 'anillo',
    color: 'rojo',
    x: 52,
    y: 80,
    tam: 118,
    prof: 0.7,
    dx: 140,
    dy: -40,
    giro: 0,
    prioridad: 1,
  },
  {
    tipo: 'cuarto',
    color: 'amarillo',
    x: -2,
    y: 4,
    tam: 130,
    prof: 0.5,
    dx: 60,
    dy: 80,
    giro: 90,
    prioridad: 1,
  },
  {
    tipo: 'rayas',
    color: 'cobalto',
    x: 72,
    y: 88,
    tam: 140,
    prof: 0.3,
    dx: -160,
    dy: -20,
    giro: 90,
    prioridad: 2,
  },
  {
    tipo: 'circulo',
    color: 'rojo',
    x: 36,
    y: 76,
    tam: 36,
    prof: 1.2,
    dx: 90,
    dy: -110,
    giro: 0,
    prioridad: 3,
  },
  {
    tipo: 'triangulo',
    color: 'cobalto',
    x: 78,
    y: 40,
    tam: 54,
    prof: 0.8,
    dx: -60,
    dy: 90,
    giro: -120,
    prioridad: 1,
  },
  {
    tipo: 'cuadrado',
    color: 'amarillo',
    x: 20,
    y: 88,
    tam: 48,
    prof: 0.9,
    dx: 110,
    dy: -50,
    giro: -45,
    prioridad: 2,
  },
  {
    tipo: 'media-luna',
    color: 'rojo',
    x: 46,
    y: 16,
    tam: 72,
    prof: 0.5,
    dx: -90,
    dy: -70,
    giro: -90,
    prioridad: 3,
  },
  {
    tipo: 'anillo',
    color: 'cobalto',
    x: 2,
    y: 44,
    tam: 62,
    prof: 1,
    dx: 70,
    dy: 100,
    giro: 0,
    prioridad: 2,
  },
  {
    tipo: 'circulo',
    color: 'amarillo',
    x: 64,
    y: 2,
    tam: 46,
    prof: 0.7,
    dx: -120,
    dy: 60,
    giro: 0,
    prioridad: 3,
  },
  {
    tipo: 'cuarto',
    color: 'rojo',
    x: 95,
    y: 84,
    tam: 92,
    prof: 0.6,
    dx: -50,
    dy: -90,
    giro: -90,
    prioridad: 2,
  },
];

// Fondo de formas geométricas con volumen falso: caen al cargar, flotan y giran despacio,
// y se mueven en parallax con el mouse (cada una a su profundidad).
@Component({
  selector: 'fx-formas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (forma of visibles(); track $index) {
      <span
        class="forma"
        [class]="'forma forma--' + forma.tipo + ' color--' + forma.color"
        [style.left.%]="forma.x"
        [style.top.%]="forma.y"
        [style.--tam.px]="forma.tam"
        [style.--prof]="forma.prof"
        [style.--dx.px]="forma.dx"
        [style.--dy.px]="forma.dy"
        [style.--giro.deg]="forma.giro"
        [style.--i]="$index"
      >
        <span class="paralaje">
          <span class="cae">
            <span class="flota">
              <i class="sombra"></i>
              <i class="cara"></i>
            </span>
          </span>
        </span>
      </span>
    }
  `,
  styleUrl: './formas.css',
  host: {
    'aria-hidden': 'true',
    '[class.alterna]': 'alterna()',
    '[class.pausado]': 'pausado()',
  },
})
export class Formas {
  readonly densidad = input(1);
  // Reacomoda la composición (por ejemplo al pasar de login a registro).
  readonly alterna = input(false, { transform: booleanAttribute });

  protected readonly pausado = signal(false);
  private readonly ancho = signal(innerWidth);

  // Cantidad según el ancho: 6 en móvil, 10 en tableta, 14 en escritorio (por la densidad).
  protected readonly visibles = computed(() => {
    const ancho = this.ancho();
    const maxPrioridad = ancho < 640 ? 1 : ancho < 1024 ? 2 : 3;
    const lista = FORMAS.filter((f) => f.prioridad <= maxPrioridad);
    return lista.slice(0, Math.max(4, Math.round(lista.length * this.densidad())));
  });

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const destroyRef = inject(DestroyRef);
    let cuadro = 0;
    let espera = 0;

    const alMover = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        host.style.setProperty('--px', ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
        host.style.setProperty('--py', ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
      });
    };
    const alRedimensionar = () => {
      clearTimeout(espera);
      espera = window.setTimeout(() => this.ancho.set(innerWidth), 150);
    };
    const alCambiarVisibilidad = () => this.pausado.set(document.hidden);

    // Parallax solo con mouse y sin movimiento reducido.
    const conParallax = !esTactil() && !prefiereMenosMovimiento();
    if (conParallax) addEventListener('pointermove', alMover, { passive: true });
    addEventListener('resize', alRedimensionar, { passive: true });
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    destroyRef.onDestroy(() => {
      cancelAnimationFrame(cuadro);
      clearTimeout(espera);
      removeEventListener('pointermove', alMover);
      removeEventListener('resize', alRedimensionar);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    });
  }
}
