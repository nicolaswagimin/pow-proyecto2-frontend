import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TemaService } from '../../core/tema.service';

// Un disco Bauhaus partido en dos mitades: gira 180° con un rebote seco y muestra su otra cara.
@Component({
  selector: 'ui-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="tema"
      [class.tema--oscuro]="oscuro()"
      [attr.aria-label]="oscuro() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      (click)="alternar($event)"
    >
      <span class="sombra" aria-hidden="true"></span>
      <span class="cara" aria-hidden="true">
        <span class="disco">
          <span class="mitad mitad--sol"></span>
          <span class="mitad mitad--noche"></span>
        </span>
      </span>
    </button>
  `,
  styleUrl: './theme-toggle.css',
})
export class ThemeToggle {
  private readonly temaService = inject(TemaService);
  protected readonly oscuro = computed(() => this.temaService.tema() === 'oscuro');

  protected alternar(evento: MouseEvent): void {
    const caja = (evento.currentTarget as HTMLElement).getBoundingClientRect();
    this.temaService.alternar({ x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 });
  }
}
