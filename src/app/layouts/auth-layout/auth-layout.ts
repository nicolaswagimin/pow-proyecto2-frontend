import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NOMBRE } from '../../config';
import { esTactil, esperar, prefiereMenosMovimiento } from '../../core/movimiento';
import { Confeti } from '../../fx/confeti/confeti';
import { Formas } from '../../fx/formas/formas';
import { ThemeToggle } from '../../ui/theme-toggle/theme-toggle';

const GOLPE = 'cubic-bezier(0.2, 1.8, 0.45, 0.9)';
const SALIDA = 'cubic-bezier(0.16, 1, 0.3, 1)';
const ENTRADA = 'cubic-bezier(0.7, 0, 0.84, 0)';
const PERSPECTIVA = 'perspective(1100px)';

const POSTER = {
  login: { palabras: ['HOLA', 'DE', 'NUEVO.'], lema: 'Tu espacio te espera.' },
  registro: { palabras: ['EMPIEZA', 'AQUÍ.'], lema: 'Crea tu cuenta en segundos.' },
} as const;

// Plantilla de acceso tipo póster Bauhaus: titular gigante, formas geométricas en parallax y una
// tarjeta con sombra dura que se inclina en 3D y gira sobre sí misma al cambiar de modo.
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Formas, ThemeToggle, Confeti],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {
  readonly modo = input<'login' | 'registro'>('login');

  protected readonly nombreApp = APP_NOMBRE;
  protected readonly poster = computed(() => POSTER[this.modo()]);
  protected readonly cascada = signal(true);

  private readonly tarjeta = viewChild.required<ElementRef<HTMLElement>>('tarjeta');
  private readonly inclinacion = viewChild.required<ElementRef<HTMLElement>>('inclinacion');
  private readonly cara = viewChild.required<ElementRef<HTMLElement>>('cara');
  private readonly sombra = viewChild.required<ElementRef<HTMLElement>>('sombra');
  private readonly destello = viewChild.required<ElementRef<HTMLElement>>('destello');
  private readonly titular = viewChild.required<ElementRef<HTMLElement>>('titular');
  private readonly confeti = viewChild.required(Confeti);
  private readonly injector = inject(Injector);
  private readonly tactil = esTactil();
  private cuadro = 0;

  constructor() {
    const fin = setTimeout(() => this.cascada.set(false), 1600);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(fin);
      cancelAnimationFrame(this.cuadro);
    });
  }

  // Inclinación 3D que sigue al cursor; la sombra dura se desplaza en sentido contrario.
  protected inclinar(evento: PointerEvent): void {
    if (this.tactil || evento.pointerType !== 'mouse' || prefiereMenosMovimiento()) return;
    const caja = this.tarjeta().nativeElement.getBoundingClientRect();
    const rx = -((evento.clientY - caja.top) / caja.height - 0.5) * 10;
    const ry = ((evento.clientX - caja.left) / caja.width - 0.5) * 12;
    cancelAnimationFrame(this.cuadro);
    this.cuadro = requestAnimationFrame(() => {
      this.inclinacion().nativeElement.style.transform = `${PERSPECTIVA} rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      this.sombra().nativeElement.style.translate = `${(10 - ry * 1.2).toFixed(1)}px ${(10 + rx * 1.2).toFixed(1)}px`;
    });
  }

  protected enderezar(): void {
    cancelAnimationFrame(this.cuadro);
    this.inclinacion().nativeElement.style.transform = '';
    this.sombra().nativeElement.style.translate = '';
  }

  // Giro 3D de dos caras: la tarjeta gira 90°, cambia de contenido de canto y termina el giro
  // con rebote. Durante la segunda mitad la cara y su sombra animan su altura (de la vieja a la
  // nueva) para que ningún contenido quede cortado.
  async transformar(cambiar: () => void): Promise<void> {
    const tarjeta = this.tarjeta().nativeElement;
    const cara = this.cara().nativeElement;
    const sombra = this.sombra().nativeElement;

    if (prefiereMenosMovimiento()) {
      await cara.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' })
        .finished;
      cambiar();
      await this.trasRender();
      cara.getAnimations().forEach((a) => a.cancel());
      await cara.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 }).finished;
      return;
    }

    this.enderezar();
    const altoAntes = cara.offsetHeight;
    const arribaAntes = tarjeta.getBoundingClientRect().top;

    // 1. Media vuelta: la cara se pone de canto; la sombra y el titular se van.
    const palabras = Array.from(this.titular().nativeElement.children) as HTMLElement[];
    palabras.forEach((el, i) =>
      el.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(-40px) rotate(-8deg)' },
        ],
        { duration: 220, delay: i * 40, easing: ENTRADA, fill: 'forwards' },
      ),
    );
    const sombraFuera = sombra.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 200,
      fill: 'forwards',
    });
    const mediaVuelta = cara.animate(
      [
        { transform: `${PERSPECTIVA} rotateY(0deg)` },
        { transform: `${PERSPECTIVA} rotateY(90deg)` },
      ],
      { duration: 300, easing: ENTRADA, fill: 'forwards' },
    );
    await mediaVuelta.finished;

    cambiar();
    await this.trasRender();
    const altoDespues = cara.offsetHeight;
    const arribaDespues = tarjeta.getBoundingClientRect().top;
    const escala = (altoAntes / altoDespues).toFixed(3);

    // 2. Termina el giro desde el otro lado con rebote, ajustando la altura.
    tarjeta.animate(
      [{ transform: `translateY(${arribaAntes - arribaDespues}px)` }, { transform: 'none' }],
      {
        duration: 640,
        easing: SALIDA,
      },
    );
    mediaVuelta.cancel();
    cara.style.transformOrigin = '50% 0';
    sombra.style.transformOrigin = '50% 0';
    sombraFuera.cancel();
    sombra.animate(
      [
        { opacity: 0, transform: `scaleY(${escala})` },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: 560,
        delay: 120,
        easing: GOLPE,
        fill: 'backwards',
      },
    );
    await cara.animate(
      [
        { transform: `${PERSPECTIVA} rotateY(-90deg) scaleY(${escala})` },
        { transform: `${PERSPECTIVA} rotateY(14deg) scaleY(1.02)`, offset: 0.6 },
        { transform: `${PERSPECTIVA} rotateY(-5deg)`, offset: 0.82 },
        { transform: `${PERSPECTIVA} rotateY(0deg)` },
      ],
      { duration: 680, easing: SALIDA },
    ).finished;
    cara.style.transformOrigin = '';
    sombra.style.transformOrigin = '';
  }

  // Error: sacudida seca con inclinación y un marco rojo que destella.
  sacudir(): void {
    this.destello().nativeElement.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 700,
      easing: SALIDA,
    });
    if (prefiereMenosMovimiento()) return;
    this.tarjeta().nativeElement.animate(
      [
        { transform: 'none' },
        { transform: 'translateX(-16px) rotate(-2deg)' },
        { transform: 'translateX(14px) rotate(1.6deg)' },
        { transform: 'translateX(-9px) rotate(-1deg)' },
        { transform: 'translateX(5px) rotate(0.5deg)' },
        { transform: 'none' },
      ],
      { duration: 380, easing: 'linear' },
    );
  }

  // Éxito: confeti geométrico, el sello golpea la tarjeta y la tarjeta cae fuera de escena.
  async celebrar(origen: { x: number; y: number }): Promise<void> {
    const tarjeta = this.tarjeta().nativeElement;
    const caja = tarjeta.getBoundingClientRect();
    const celebracion = this.confeti().lanzar(origen, {
      x: caja.left + caja.width / 2,
      y: caja.top + caja.height / 2,
    });
    if (!prefiereMenosMovimiento()) {
      // El golpe del sello hunde la tarjeta un instante.
      tarjeta.animate(
        [{ transform: 'none' }, { transform: 'scale(0.96)' }, { transform: 'none' }],
        {
          duration: 320,
          delay: 300,
          easing: GOLPE,
        },
      );
    }
    await celebracion;
    if (prefiereMenosMovimiento()) return;
    await tarjeta.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(120px) rotate(6deg)' },
      ],
      { duration: 320, easing: ENTRADA, fill: 'forwards' },
    ).finished;
  }

  private async trasRender(): Promise<void> {
    await new Promise<void>((resolver) =>
      afterNextRender(() => resolver(), { injector: this.injector }),
    );
    await esperar(0);
  }
}
