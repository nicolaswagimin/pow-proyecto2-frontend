import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ETIQUETAS_FUERZA, calcularFuerza, pistaFuerza } from '../../core/fuerza';

const FORMAS = ['triangulo', 'media-luna', 'cuadrado', 'circulo'] as const;

// Medidor de fortaleza: cuatro casillas que se llenan con una forma cada una, con un pop.
@Component({
  selector: 'ui-strength-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="casillas" aria-hidden="true">
      @for (forma of formas; track forma; let i = $index) {
        <span class="casilla" [class.llena]="nivel() > i">
          <i [class]="'forma forma--' + forma"></i>
        </span>
      }
    </div>
    <p class="texto" aria-live="polite">
      @if (nivel() > 0) {
        <strong>Fortaleza: {{ etiqueta() }}.</strong> {{ pista() }}
      }
    </p>
  `,
  styleUrl: './strength-meter.css',
})
export class StrengthMeter {
  readonly password = input('');

  protected readonly formas = FORMAS;
  protected readonly nivel = computed(() => calcularFuerza(this.password()));
  protected readonly etiqueta = computed(() => ETIQUETAS_FUERZA[this.nivel()]);
  protected readonly pista = computed(() => pistaFuerza(this.password(), this.nivel()));
}
