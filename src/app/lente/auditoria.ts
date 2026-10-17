import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  input,
  output,
  signal,
} from '@angular/core';
import { Button } from '../ui/button/button';

interface Problema {
  id: string;
  ayuda: string;
  impacto: string;
  nodos: number;
  enlace: string;
}

type Resultado =
  { tipo: 'ok'; reglas: number; problemas: Problema[] } | { tipo: 'error'; mensaje: string };

const IMPACTOS: Record<string, string> = {
  critical: 'crítico',
  serious: 'grave',
  moderate: 'moderado',
  minor: 'menor',
};

// Ejecuta axe-core sobre la página actual, con las reglas de WCAG 2.2 A y AA. axe-core se carga
// solo al pulsar el botón (chunk diferido), así no pesa en la carga inicial.
@Component({
  selector: 'app-auditoria',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  template: `
    <ui-button
      variante="secundario"
      anchoCompleto
      [cargando]="auditando()"
      textoCargando="Auditando…"
      (click)="auditar()"
    >
      {{ resultado() ? 'Auditar de nuevo' : textoBoton() }}
    </ui-button>

    <div class="resultado" role="status">
      @if (resultado(); as r) {
        @if (r.tipo === 'error') {
          <p>{{ r.mensaje }}</p>
        } @else if (r.problemas.length === 0) {
          <p class="limpio">
            <strong>0 problemas.</strong> {{ r.reglas }} reglas de WCAG 2.2 A y AA superadas.
          </p>
        } @else {
          <p>
            <strong
              >{{ r.problemas.length }}
              {{ r.problemas.length === 1 ? 'problema' : 'problemas' }}</strong
            >
            en {{ r.reglas + r.problemas.length }} reglas revisadas.
          </p>
          <ul>
            @for (p of r.problemas; track p.id) {
              <li>
                <span class="impacto">{{ p.impacto }}</span>
                {{ p.ayuda }} ({{ p.nodos }})
                <a [href]="p.enlace" target="_blank" rel="noopener"
                  >Qué es <span class="visually-hidden">{{ p.id }}</span></a
                >
              </li>
            }
          </ul>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--space-3);
    }
    .resultado:empty {
      display: none;
    }
    .resultado {
      font-size: var(--text-sm);
    }
    .limpio strong {
      color: var(--color-exito);
    }
    ul {
      display: grid;
      gap: var(--space-2);
      margin: var(--space-2) 0 0;
      padding-left: var(--space-5);
    }
    .impacto {
      font-weight: var(--peso-fuerte);
    }
  `,
})
export class Auditoria {
  readonly textoBoton = input('Auditar esta página');
  // Audita apenas aparece (la insignia del pie de /app); por defecto espera al botón.
  readonly auto = input(false);
  // Avisa al terminar: el texto del botón cambió y quien lo anota debe releerlo.
  readonly termino = output<void>();
  // Cuántos problemas encontró (no se emite si el auditor no cargó).
  readonly problemas = output<number>();

  constructor() {
    afterNextRender(() => {
      if (this.auto()) void this.auditar();
    });
  }

  protected readonly auditando = signal(false);
  protected readonly resultado = signal<Resultado | null>(null);

  protected async auditar(): Promise<void> {
    if (this.auditando()) return;
    this.auditando.set(true);
    try {
      const { default: axe } = await import('axe-core');
      // iframes: false. La vista previa de /app es un iframe con su propio axe: sus problemas son
      // de la página auditada, no de a11Lens.
      const r = await axe.run(document, {
        iframes: false,
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      });
      this.resultado.set({
        tipo: 'ok',
        reglas: r.passes.length,
        problemas: r.violations.map((v) => ({
          id: v.id,
          ayuda: v.help,
          impacto: IMPACTOS[v.impact ?? ''] ?? 'sin clasificar',
          nodos: v.nodes.length,
          enlace: v.helpUrl,
        })),
      });
      this.problemas.emit(r.violations.length);
    } catch {
      this.resultado.set({
        tipo: 'error',
        mensaje: 'No se pudo cargar el auditor. Revisa tu conexión e inténtalo de nuevo.',
      });
    } finally {
      this.auditando.set(false);
      this.termino.emit();
    }
  }
}
