import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ESTADO_CORRECCION } from '../../exportar';
import { Gravedad, NOMBRE_GRAVEDAD, Problema } from '../../modelo';
import { queHacer } from '../../recomendaciones';
import { CorreccionVerificada } from '../../verificar';

export type EstadoAuditoria = 'vacio' | 'auditando' | 'listo' | 'error';

// Páginas de ejemplo para probar con un clic: la demo "before" del W3C (llena de problemas) y su
// versión corregida.
export const EJEMPLOS = [
  {
    nombre: 'Página inaccesible de demostración del W3C',
    url: 'https://www.w3.org/WAI/demos/bad/before/home.html',
  },
  {
    nombre: 'La misma página, corregida',
    url: 'https://www.w3.org/WAI/demos/bad/after/home.html',
  },
];

interface Recomendacion {
  selector: string;
  regla: string;
  gravedad: Gravedad;
  nombreGravedad: string;
  descripcion: string;
  queHacer: string;
  ia: string | null; // "Estado: explicación" si ya hay una corrección
}

// El documento entero: no se resalta en la vista previa, así que nunca "está a la vista".
const DE_TODA_LA_PAGINA = new Set(['html', 'head', 'body']);

// La columna derecha de /app: recomendaciones en vivo de la página auditada. Muestra los
// elementos con problemas que están a la vista en la vista previa (siguen su scroll) y, antes de
// auditar, qué va a encontrar a11Lens con dos ejemplos. No es aria-live: cambiaría en cada scroll.
@Component({
  selector: 'ui-recomendaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './recomendaciones.html',
  styleUrl: './recomendaciones.css',
})
export class Recomendaciones {
  readonly estado = input.required<EstadoAuditoria>();
  readonly problemas = input<Problema[] | null>(null);
  readonly visibles = input<string[]>([]);
  readonly seleccionado = input<string | null>(null);
  readonly correcciones = input<CorreccionVerificada[]>([]);
  readonly seleccionar = output<string>();
  readonly probar = output<string>();

  protected readonly EJEMPLOS = EJEMPLOS;

  private readonly todas = computed<Recomendacion[]>(() => {
    const ia = new Map(this.correcciones().map((c) => [`${c.regla}|${c.selector}`, c]));
    return (this.problemas() ?? []).flatMap((p) =>
      p.nodos.map((n) => {
        const c = ia.get(`${p.regla}|${n.selector}`);
        return {
          selector: n.selector,
          regla: p.regla,
          gravedad: p.gravedad,
          nombreGravedad: NOMBRE_GRAVEDAD[p.gravedad],
          descripcion: p.descripcion,
          queHacer: queHacer(p.regla),
          ia: c?.explicacion ? `${ESTADO_CORRECCION[c.estado]}: ${c.explicacion}` : null,
        };
      }),
    );
  });

  protected readonly total = computed(() => this.todas().length);
  protected readonly aLaVista = computed(() => {
    const orden = this.visibles();
    return this.todas()
      .filter((r) => orden.includes(r.selector))
      .sort((a, b) => orden.indexOf(a.selector) - orden.indexOf(b.selector));
  });
  protected readonly deTodaLaPagina = computed(() =>
    this.todas().filter((r) => DE_TODA_LA_PAGINA.has(r.selector)),
  );
}
