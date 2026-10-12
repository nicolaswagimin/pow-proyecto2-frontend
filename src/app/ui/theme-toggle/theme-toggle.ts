import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TemaService } from '../../core/tema.service';

// El símbolo de contraste (círculo mitad tinta, mitad papel): al cambiar de tema se invierte.
@Component({
  selector: 'ui-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="tema"
      [class.tema--oscuro]="oscuro()"
      [attr.aria-label]="oscuro() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      (click)="alternar()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8.5" />
        <path class="mitad" d="M12 3.5a8.5 8.5 0 0 1 0 17Z" />
      </svg>
    </button>
  `,
  styleUrl: './theme-toggle.css',
})
export class ThemeToggle {
  private readonly temaService = inject(TemaService);
  protected readonly oscuro = computed(() => this.temaService.tema() === 'oscuro');

  protected alternar(): void {
    this.temaService.alternar();
  }
}
