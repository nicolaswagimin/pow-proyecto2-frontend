import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// Iniciales del usuario en un círculo de tinta. Decorativo: el nombre se muestra al lado.
@Component({
  selector: 'ui-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span aria-hidden="true">{{ iniciales() }}</span>`,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      width: var(--avatar-tamano, 44px);
      height: var(--avatar-tamano, 44px);
      border-radius: 50%;
      background: var(--color-texto);
      color: var(--color-superficie);
      font-weight: var(--peso-fuerte);
      font-size: calc(var(--avatar-tamano, 44px) * 0.38);
      flex-shrink: 0;
    }
  `,
})
export class Avatar {
  readonly iniciales = input.required<string>();
}
