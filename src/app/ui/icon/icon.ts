import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type NombreIcono =
  | 'triangulo'
  | 'circulo'
  | 'cuadrado'
  | 'media-luna'
  | 'alerta'
  | 'check'
  | 'info'
  | 'salir'
  | 'chispa'
  | 'papelera'
  | 'recargar'
  | 'mas'
  | 'mayus';

// Íconos propios: las formas Bauhaus (triángulo, círculo, cuadrado, media luna) van rellenas de su
// color primario; el resto es trazo grueso de 2.2 px con extremos cuadrados. Siempre decorativos.
@Component({
  selector: 'ui-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      @switch (nombre()) {
        @case ('triangulo') {
          <svg:path class="forma rojo" d="M12 3.5 21 20H3Z" />
        }
        @case ('circulo') {
          <svg:circle class="forma cobalto" cx="12" cy="12" r="8.5" />
        }
        @case ('cuadrado') {
          <svg:rect class="forma amarillo" x="4" y="4" width="16" height="16" />
        }
        @case ('media-luna') {
          <svg:path class="forma tinta" d="M3.5 16a8.5 8.5 0 0 1 17 0Z" />
        }
        @case ('alerta') {
          <svg:path d="M12 3.5 21.5 20h-19Z" />
          <svg:path d="M12 9.5v5M12 17v.2" />
        }
        @case ('check') {
          <svg:path d="m4.5 12.5 5 5L19.5 6.5" />
        }
        @case ('info') {
          <svg:rect x="3.5" y="3.5" width="17" height="17" />
          <svg:path d="M12 11v6M12 7.5v.2" />
        }
        @case ('salir') {
          <svg:path d="M14 4h6v16h-6" />
          <svg:path d="M10 8l-4 4 4 4M6 12h9" />
        }
        @case ('chispa') {
          <svg:path d="M12 2.5 14.5 9.5 21.5 12 14.5 14.5 12 21.5 9.5 14.5 2.5 12 9.5 9.5Z" />
        }
        @case ('papelera') {
          <svg:path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" />
        }
        @case ('recargar') {
          <svg:path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />
        }
        @case ('mas') {
          <svg:path d="M12 4.5v15M4.5 12h15" />
        }
        @case ('mayus') {
          <svg:path d="M12 4 4.5 12H8.5v4.5h7V12h4L12 4Z" />
          <svg:path d="M8.5 20h7" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-grid;
      width: var(--icono-tamano, 1.25em);
      height: var(--icono-tamano, 1.25em);
      flex-shrink: 0;
    }
    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.2;
      stroke-linecap: square;
      stroke-linejoin: miter;
      overflow: visible;
    }
    .forma {
      stroke: var(--color-tinta);
      stroke-width: 1.6;
    }
    .rojo {
      fill: var(--color-rojo);
    }
    .cobalto {
      fill: var(--color-cobalto);
    }
    .amarillo {
      fill: var(--color-amarillo);
    }
    .tinta {
      fill: var(--color-tinta);
    }
  `,
})
export class Icon {
  readonly nombre = input.required<NombreIcono>();
}
