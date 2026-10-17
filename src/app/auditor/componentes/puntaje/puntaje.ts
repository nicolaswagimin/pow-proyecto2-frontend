import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { GRAVEDADES, Gravedad } from '../../modelo';
import { MAX_EXTRA_POR_REGLA, PESOS } from '../../puntaje';

const PLURALES: Record<Gravedad, [string, string]> = {
  critico: ['crítico', 'críticos'],
  serio: ['serio', 'serios'],
  moderado: ['moderado', 'moderados'],
  menor: ['menor', 'menores'],
};

// Puntaje de la auditoría: número, calificación en palabras, barra y la fórmula a la vista.
@Component({
  selector: 'ui-puntaje',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './puntaje.html',
  styleUrl: './puntaje.css',
})
export class PuntajeAuditoria {
  readonly puntaje = input.required<number>();
  readonly resumen = input.required<Record<Gravedad, number>>();
  readonly titulo = input('Puntaje de accesibilidad');

  protected readonly PESOS = PESOS;
  protected readonly MAX_EXTRA = MAX_EXTRA_POR_REGLA;

  protected readonly calificacion = computed(() => {
    const p = this.puntaje();
    if (p >= 95) return 'Excelente';
    if (p >= 80) return 'Bueno';
    if (p >= 50) return 'Necesita mejoras';
    return 'Deficiente';
  });

  protected readonly conteo = computed(() =>
    GRAVEDADES.map((g) => {
      const n = this.resumen()[g];
      return { gravedad: g, n, texto: `${n} ${PLURALES[g][n === 1 ? 0 : 1]}` };
    }),
  );
}
