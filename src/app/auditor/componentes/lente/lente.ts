import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MotorService, SesionAislada } from '../../motor.service';

// La lente: la página auditada en el iframe aislado, con sus elementos con problemas resaltados.
// Seleccionar un problema enfoca su elemento; un clic en un elemento resaltado lo selecciona.
// Todo lo que hace la lente también se puede hacer desde la lista (el iframe no es obligatorio).
@Component({
  selector: 'ui-lente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lente.html',
  styleUrl: './lente.css',
})
export class Lente {
  readonly html = input.required<string>();
  readonly baseHref = input<string | undefined>(undefined);
  readonly selectores = input<string[]>([]);
  readonly seleccionado = input<string | null>(null);
  readonly clic = output<string>();

  private readonly motor = inject(MotorService);
  private readonly iframe = viewChild.required<ElementRef<HTMLIFrameElement>>('marco');
  private readonly sesion = signal<SesionAislada | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Cada HTML nuevo se abre en una sesión nueva.
    effect((alLimpiar) => {
      const html = this.html();
      const base = this.baseHref();
      const iframe = this.iframe().nativeElement;
      let actual: SesionAislada | null = null;
      let vigente = true;
      this.error.set(null);
      this.motor
        .abrir(iframe, html, base)
        .then((sesion) => {
          if (!vigente) return sesion.cerrar();
          actual = sesion;
          sesion.alClic((selector) => this.clic.emit(selector));
          this.sesion.set(sesion);
        })
        .catch((err: Error) => vigente && this.error.set(err.message));
      alLimpiar(() => {
        vigente = false;
        actual?.cerrar();
        untracked(() => this.sesion.set(null));
      });
    });

    // Resaltados y foco siguen a la selección.
    effect(() => {
      const sesion = this.sesion();
      const seleccionado = this.seleccionado();
      if (!sesion) return;
      sesion.resaltar(this.selectores(), seleccionado);
      if (seleccionado) sesion.enfocar(seleccionado);
    });

    inject(DestroyRef).onDestroy(() => this.sesion()?.cerrar());
  }
}
