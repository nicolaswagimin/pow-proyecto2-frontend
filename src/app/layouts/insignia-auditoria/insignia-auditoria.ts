import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Auditoria } from '../../lente/auditoria';
import { Icon } from '../../ui/icon/icon';

// Resultado de la última verificación de la app con axe (docs/accesibilidad.md): 0 problemas en
// todas sus vistas. Al abrir el detalle se audita de verdad y la insignia muestra lo que dé.
const VERIFICADO = 0;

// La autoauditoría de a11Lens, pequeña y al pie de /app: una insignia que se despliega.
@Component({
  selector: 'app-insignia-auditoria',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Auditoria, Icon],
  templateUrl: './insignia-auditoria.html',
  styleUrl: './insignia-auditoria.css',
})
export class InsigniaAuditoria {
  protected readonly abierta = signal(false);
  // El detalle se crea al abrirlo por primera vez (ahí corre la auditoría) y luego se conserva.
  protected readonly creada = signal(false);
  protected readonly problemas = signal(VERIFICADO);
  protected readonly texto = computed(() => {
    const n = this.problemas();
    return `Esta app: ${n} ${n === 1 ? 'problema' : 'problemas'} WCAG 2.2 AA`;
  });

  protected alternar(): void {
    this.abierta.update((a) => !a);
    this.creada.set(true);
  }

  protected contar(n: number): void {
    this.problemas.set(n);
  }
}
