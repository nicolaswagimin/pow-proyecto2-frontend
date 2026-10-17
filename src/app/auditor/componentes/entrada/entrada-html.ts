import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { Button } from '../../../ui/button/button';

type Modo = 'pegar' | 'archivo' | 'url';

const MODOS: { modo: Modo; etiqueta: string }[] = [
  { modo: 'pegar', etiqueta: 'Pegar HTML' },
  { modo: 'archivo', etiqueta: 'Subir archivo' },
  { modo: 'url', etiqueta: 'URL' },
];

// Entrada de la auditoría: pegar HTML, subir un .html o escribir una URL. Pestañas con el patrón
// de ARIA (flechas para moverse, Tab entra al panel).
@Component({
  selector: 'ui-entrada-html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  templateUrl: './entrada-html.html',
  styleUrl: './entrada-html.css',
})
export class EntradaHtml {
  readonly cargando = input(false, { transform: booleanAttribute });
  readonly pegado = output<{ html: string; pagina: string }>();
  readonly archivo = output<File>();
  readonly url = output<string>();

  protected readonly MODOS = MODOS;
  protected readonly modo = signal<Modo>('pegar');
  protected readonly html = signal('');
  protected readonly pagina = signal('');
  protected readonly direccion = signal('');
  protected readonly elegido = signal<File | null>(null);

  private readonly pestanas = viewChildren<ElementRef<HTMLButtonElement>>('pestana');

  protected elegir(modo: Modo): void {
    this.modo.set(modo);
  }

  protected moverConTeclado(evento: KeyboardEvent, indice: number): void {
    const destino = {
      ArrowRight: indice + 1,
      ArrowLeft: indice - 1,
      Home: 0,
      End: MODOS.length - 1,
    }[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    const siguiente = (destino + MODOS.length) % MODOS.length;
    this.modo.set(MODOS[siguiente].modo);
    this.pestanas()[siguiente]?.nativeElement.focus();
  }

  protected alElegirArchivo(evento: Event): void {
    this.elegido.set((evento.target as HTMLInputElement).files?.[0] ?? null);
  }

  protected enviar(evento: Event): void {
    evento.preventDefault();
    const modo = this.modo();
    if (modo === 'pegar') this.pegado.emit({ html: this.html(), pagina: this.pagina().trim() });
    else if (modo === 'url') this.url.emit(this.direccion().trim());
    else {
      const archivo = this.elegido();
      if (archivo) this.archivo.emit(archivo);
    }
  }
}
