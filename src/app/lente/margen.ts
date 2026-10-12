import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { prefiereMenosMovimiento } from '../core/movimiento';
import { Inspeccion, inspeccionar, resumir } from './inspeccion';

const CLAVE = 'a11lens.anotaciones';

// El margen del informe: anota el elemento que tiene el foco con lo que la herramienta inspecciona
// (nombre accesible, rol, estados, contraste, tamaño) y lo que diría un lector de pantalla.
// No es una región aria-live: quien usa lector ya escucha el campo, y repetirlo lo duplicaría.
@Component({
  selector: 'app-margen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './margen.html',
  styleUrl: './margen.css',
})
export class Margen {
  // Parte de la página que se anota (el formulario y su encabezado).
  readonly ambito = input.required<HTMLElement>();

  protected readonly visible = signal(leerPreferencia());
  protected readonly inspeccion = signal<Inspeccion | null>(null);
  protected readonly resumen = signal<string[]>([]);
  // En escritorio la ficha baja hasta la altura del elemento enfocado.
  protected readonly desplazamiento = signal(0);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly ficha = viewChild<ElementRef<HTMLElement>>('ficha');
  private readonly lente = viewChild.required<ElementRef<HTMLElement>>('lente');
  private actual: HTMLElement | null = null;
  private cajaAnterior: DOMRect | null = null;
  private cuadro = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const ambito = this.ambito();
      this.resumen.set(resumir(ambito));

      const alEnfocar = (e: FocusEvent) => {
        const el = e.target as HTMLElement;
        if (!ambito.contains(el) && !this.host.contains(el)) return;
        this.recorrer(el);
        this.actual = el;
        this.programar();
      };
      const alSalir = (e: FocusEvent) => {
        // Si el foco sale de la página (relatedTarget nulo), se vuelve al resumen.
        if (!e.relatedTarget) {
          this.actual = null;
          this.programar();
        }
      };
      const alEscribir = () => this.programar();
      document.addEventListener('focusin', alEnfocar);
      document.addEventListener('focusout', alSalir);
      ambito.addEventListener('input', alEscribir);
      addEventListener('resize', alEscribir);

      // Los atributos ARIA cambian después de validar (aria-invalid, aria-describedby…).
      const observador = new MutationObserver(alEscribir);
      observador.observe(ambito, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
          'aria-invalid',
          'aria-describedby',
          'aria-busy',
          'disabled',
          'aria-pressed',
        ],
      });

      destroyRef.onDestroy(() => {
        document.removeEventListener('focusin', alEnfocar);
        document.removeEventListener('focusout', alSalir);
        ambito.removeEventListener('input', alEscribir);
        removeEventListener('resize', alEscribir);
        observador.disconnect();
        cancelAnimationFrame(this.cuadro);
      });
    });
  }

  protected alternar(): void {
    this.visible.update((v) => !v);
    guardarPreferencia(this.visible());
    this.programar();
  }

  // La lente se desliza del control anterior al nuevo: hace visible el orden de foco.
  // Con movimiento reducido no se anima; el anillo de foco del control basta.
  private recorrer(el: HTMLElement): void {
    const destino = el.getBoundingClientRect();
    const origen = this.cajaAnterior;
    this.cajaAnterior = destino;
    if (!origen || !this.visible() || prefiereMenosMovimiento() || !this.ambito().contains(el)) {
      return;
    }
    const caja = (r: DOMRect) => ({
      transform: `translate(${r.left}px, ${r.top}px)`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
    this.lente().nativeElement.animate(
      [
        { ...caja(origen), opacity: 1 },
        { ...caja(destino), opacity: 1, offset: 0.7 },
        { ...caja(destino), opacity: 0 },
      ],
      { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
  }

  // Agrupa las actualizaciones en un cuadro de animación: el DOM ya refleja el último cambio.
  private programar(): void {
    cancelAnimationFrame(this.cuadro);
    this.cuadro = requestAnimationFrame(() => this.actualizar());
  }

  private actualizar(): void {
    const el = this.actual;
    if (!el || !el.isConnected) {
      this.inspeccion.set(null);
      this.resumen.set(resumir(this.ambito()));
      this.desplazamiento.set(0);
      return;
    }
    this.inspeccion.set(inspeccionar(el));
    if (this.ambito().contains(el)) this.alinear(el);
  }

  private alinear(el: HTMLElement): void {
    if (!matchMedia('(min-width: 960px)').matches) {
      this.desplazamiento.set(0);
      return;
    }
    const columna = this.host.getBoundingClientRect();
    const objetivo = el.getBoundingClientRect();
    const altoFicha = this.ficha()?.nativeElement.offsetHeight ?? 0;
    const maximo = Math.max(0, columna.height - altoFicha - 40);
    const deseado = objetivo.top - columna.top - 72;
    this.desplazamiento.set(Math.round(Math.min(Math.max(deseado, 0), maximo)));
  }
}

function leerPreferencia(): boolean {
  try {
    return localStorage.getItem(CLAVE) !== 'no';
  } catch {
    return true;
  }
}

function guardarPreferencia(visible: boolean): void {
  try {
    localStorage.setItem(CLAVE, visible ? 'si' : 'no');
  } catch {
    // Sin almacenamiento, la preferencia dura esta visita.
  }
}
