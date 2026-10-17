import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ESTADO_CORRECCION } from '../../exportar';
import { CorreccionVerificada, VerificacionDocumento } from '../../verificar';

// Resultado de la corrección con IA ya verificado con axe: las que funcionan se presentan como
// correcciones; las que no, aparte y sin código a la vista (docs/decisiones/0007).
@Component({
  selector: 'ui-correcciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './correcciones.html',
  styleUrl: './correcciones.css',
})
export class Correcciones {
  readonly correcciones = input.required<CorreccionVerificada[]>();
  readonly verificacion = input<VerificacionDocumento | null>(null);

  protected readonly ESTADO = ESTADO_CORRECCION;
  protected readonly verificadas = computed(() =>
    this.correcciones().filter((c) => c.estado === 'resuelto'),
  );
  protected readonly fallidas = computed(() =>
    this.correcciones().filter((c) => c.estado !== 'resuelto'),
  );

  protected plural(n: number, uno: string, varios: string): string {
    return `${n} ${n === 1 ? uno : varios}`;
  }
}
