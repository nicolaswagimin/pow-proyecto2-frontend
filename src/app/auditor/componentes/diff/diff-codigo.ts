import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LineaDiff, diffLineas } from '../../diff';

export type FilaDiff =
  { tipo: 'fila'; izq?: LineaDiff; der?: LineaDiff } | { tipo: 'omitidas'; cantidad: number };

const CONTEXTO = 3;

// Pasa el diff a filas de dos columnas: las quitadas se emparejan con las agregadas que siguen, y
// las zonas iguales lejos de un cambio se resumen ("N líneas iguales").
export function filasLadoALado(lineas: LineaDiff[], contexto = CONTEXTO): FilaDiff[] {
  const filas: { izq?: LineaDiff; der?: LineaDiff; igual: boolean }[] = [];
  for (let i = 0; i < lineas.length;) {
    if (lineas[i].tipo === 'igual') {
      filas.push({ izq: lineas[i], der: lineas[i], igual: true });
      i++;
      continue;
    }
    const quitadas: LineaDiff[] = [];
    const agregadas: LineaDiff[] = [];
    while (i < lineas.length && lineas[i].tipo === 'quitada') quitadas.push(lineas[i++]);
    while (i < lineas.length && lineas[i].tipo === 'agregada') agregadas.push(lineas[i++]);
    for (let k = 0; k < Math.max(quitadas.length, agregadas.length); k++) {
      filas.push({ izq: quitadas[k], der: agregadas[k], igual: false });
    }
  }

  const cerca = filas.map((_, i) =>
    filas.slice(Math.max(0, i - contexto), i + contexto + 1).some((f) => !f.igual),
  );
  const salida: FilaDiff[] = [];
  let omitidas = 0;
  filas.forEach((f, i) => {
    if (cerca[i]) {
      if (omitidas) salida.push({ tipo: 'omitidas', cantidad: omitidas });
      omitidas = 0;
      salida.push({ tipo: 'fila', izq: f.izq, der: f.der });
    } else omitidas++;
  });
  if (omitidas) salida.push({ tipo: 'omitidas', cantidad: omitidas });
  return salida;
}

// Antes/después del HTML, lado a lado. Cada línea cambiada lleva "−" o "+" además del color.
@Component({
  selector: 'ui-diff-codigo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diff-codigo.html',
  styleUrl: './diff-codigo.css',
})
export class DiffCodigo {
  readonly antes = input.required<string>();
  readonly despues = input.required<string>();

  protected readonly filas = computed(() =>
    filasLadoALado(diffLineas(this.antes(), this.despues())),
  );
  protected readonly sinCambios = computed(() => this.antes() === this.despues());
}
