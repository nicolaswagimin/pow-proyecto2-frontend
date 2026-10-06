import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon, NombreIcono } from '../icon/icon';

export type TipoAlerta = 'error' | 'exito' | 'info' | 'aviso';

const ICONOS: Record<TipoAlerta, NombreIcono> = {
  error: 'alerta',
  exito: 'check',
  info: 'info',
  aviso: 'alerta',
};

// Los errores se anuncian de inmediato (role="alert"); el resto, con cortesía (role="status").
@Component({
  selector: 'ui-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <span class="icono"><ui-icon [nombre]="icono()" /></span>
    <div class="cuerpo">
      @if (titulo()) {
        <strong class="titulo">{{ titulo() }}</strong>
      }
      <div><ng-content /></div>
    </div>
  `,
  styleUrl: './alert.css',
  host: {
    '[attr.role]': "tipo() === 'error' ? 'alert' : 'status'",
    '[attr.data-tipo]': 'tipo()',
  },
})
export class Alert {
  readonly tipo = input<TipoAlerta>('info');
  readonly titulo = input<string | null>(null);

  protected readonly icono = computed(() => ICONOS[this.tipo()]);
}
