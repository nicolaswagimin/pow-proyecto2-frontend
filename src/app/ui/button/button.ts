import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  input,
  viewChild,
} from '@angular/core';
import { esTactil } from '../../core/movimiento';

export type VarianteBoton = 'primario' | 'secundario' | 'fantasma' | 'peligro';

@Component({
  selector: 'ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.html',
  styleUrl: './button.css',
  host: { '[class.ancho-completo]': 'anchoCompleto()' },
})
export class Button {
  readonly variante = input<VarianteBoton>('primario');
  readonly tipo = input<'button' | 'submit'>('button');
  readonly tamano = input<'normal' | 'compacto'>('normal');
  readonly cargando = input(false, { transform: booleanAttribute });
  readonly textoCargando = input('Cargando…');
  readonly deshabilitado = input(false, { transform: booleanAttribute });
  readonly anchoCompleto = input(false, { transform: booleanAttribute });
  // Etiqueta accesible para botones de solo ícono.
  readonly etiqueta = input<string | null>(null);

  private readonly boton = viewChild.required<ElementRef<HTMLButtonElement>>('boton');
  private cuadro = 0;
  private readonly magnetico = !esTactil();

  // Mientras carga, el clic no hace nada (evita envíos dobles) pero el botón conserva el foco.
  protected alHacerClic(evento: MouseEvent): void {
    if (this.cargando()) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
    }
  }

  // Magnetismo: el botón se acerca al cursor (solo con mouse, dentro de un rAF).
  protected seguir(evento: PointerEvent): void {
    if (
      !this.magnetico ||
      this.variante() !== 'primario' ||
      this.cargando() ||
      evento.pointerType !== 'mouse'
    ) {
      return;
    }
    const elemento = this.boton().nativeElement;
    const caja = elemento.getBoundingClientRect();
    const dx = (evento.clientX - (caja.left + caja.width / 2)) * 0.22;
    const dy = (evento.clientY - (caja.top + caja.height / 2)) * 0.35;
    cancelAnimationFrame(this.cuadro);
    this.cuadro = requestAnimationFrame(() => {
      elemento.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    });
  }

  protected soltar(): void {
    cancelAnimationFrame(this.cuadro);
    this.boton().nativeElement.style.translate = '';
  }

  // Centro del botón en pantalla: origen de las celebraciones.
  centro(): { x: number; y: number } {
    const caja = this.boton().nativeElement.getBoundingClientRect();
    return { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 };
  }

  enfocar(): void {
    this.boton().nativeElement.focus();
  }
}
