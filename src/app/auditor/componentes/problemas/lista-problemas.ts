import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { GRAVEDADES, NOMBRE_GRAVEDAD, Problema } from '../../modelo';

// Problemas agrupados por gravedad. Cada elemento afectado tiene su ubicación (selector), su
// fragmento y un botón para verlo resaltado en la lente.
@Component({
  selector: 'ui-lista-problemas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lista-problemas.html',
  styleUrl: './lista-problemas.css',
})
export class ListaProblemas {
  readonly problemas = input.required<Problema[]>();
  readonly seleccionado = input<string | null>(null);
  readonly seleccionar = output<string>();

  protected readonly grupos = computed(() =>
    GRAVEDADES.map((g) => ({
      gravedad: g,
      nombre: NOMBRE_GRAVEDAD[g],
      problemas: this.problemas().filter((p) => p.gravedad === g),
    })).filter((grupo) => grupo.problemas.length),
  );
}
