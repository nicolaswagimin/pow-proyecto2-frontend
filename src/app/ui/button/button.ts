import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  input,
  viewChild,
} from '@angular/core';

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

  // Mientras carga, el clic no hace nada (evita envíos dobles) pero el botón conserva el foco.
  protected alHacerClic(evento: MouseEvent): void {
    if (this.cargando()) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
    }
  }

  enfocar(): void {
    this.boton().nativeElement.focus();
  }
}
