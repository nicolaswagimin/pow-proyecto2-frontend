import { ChangeDetectionStrategy, Component, booleanAttribute, input } from '@angular/core';

// Avatar construido con cuatro cuartos de círculo de colores primarios y las iniciales al centro.
// Con [ensamblar], los cuartos llegan volando desde las esquinas y encajan.
@Component({
  selector: 'ui-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="cuarto cuarto--1" aria-hidden="true"></span>
    <span class="cuarto cuarto--2" aria-hidden="true"></span>
    <span class="cuarto cuarto--3" aria-hidden="true"></span>
    <span class="cuarto cuarto--4" aria-hidden="true"></span>
    <span class="centro" aria-hidden="true">{{ iniciales() }}</span>
  `,
  styleUrl: './avatar.css',
  host: { '[class.ensamblar]': 'ensamblar()' },
})
export class Avatar {
  readonly iniciales = input.required<string>();
  readonly ensamblar = input(false, { transform: booleanAttribute });
}
