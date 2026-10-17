import { TestBed } from '@angular/core/testing';
import { Problema } from '../../modelo';
import { ListaProblemas } from './lista-problemas';

const problemas: Problema[] = [
  {
    regla: 'image-alt',
    gravedad: 'critico',
    descripcion: 'Las imágenes deben tener texto alternativo.',
    ayudaUrl: 'https://x/image-alt',
    criterios: [{ id: '1.1.1', nombre: 'Contenido no textual', nivel: 'A' }],
    nodos: [{ selector: 'main > img', html: '<img src="a.png">' }],
  },
  {
    regla: 'color-contrast',
    gravedad: 'serio',
    descripcion: 'El texto debe tener suficiente contraste con su fondo.',
    ayudaUrl: 'https://x/color-contrast',
    criterios: [{ id: '1.4.3', nombre: 'Contraste (mínimo)', nivel: 'AA' }],
    nodos: [{ selector: '.gris', html: '<p class="gris">x</p>' }],
  },
];

function montar(seleccionado: string | null = null) {
  const fixture = TestBed.createComponent(ListaProblemas);
  fixture.componentRef.setInput('problemas', problemas);
  fixture.componentRef.setInput('seleccionado', seleccionado);
  fixture.detectChanges();
  return { fixture, raiz: fixture.nativeElement as HTMLElement };
}

describe('ui-lista-problemas', () => {
  it('agrupa por gravedad con encabezados', () => {
    const titulos = [...montar().raiz.querySelectorAll('h3')].map((h) => h.textContent?.trim());
    expect(titulos).toEqual(['Crítico (1)', 'Serio (1)']);
  });

  it('muestra descripción, criterio WCAG, ubicación y fragmento', () => {
    const texto = montar().raiz.textContent ?? '';
    expect(texto).toContain('Las imágenes deben tener texto alternativo.');
    expect(texto).toContain('1.1.1 Contenido no textual (A)');
    expect(texto).toContain('main > img');
    expect(texto).toContain('<img src="a.png">');
  });

  it('"Ver en la lente" emite el selector y marca el seleccionado', () => {
    const { fixture, raiz } = montar('.gris');
    let elegido: string | undefined;
    fixture.componentInstance.seleccionar.subscribe((s) => (elegido = s));
    const botones = [...raiz.querySelectorAll<HTMLButtonElement>('button.ver')];
    expect(botones.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
    botones[0].click();
    expect(elegido).toBe('main > img');
  });

  it('sin problemas lo dice', () => {
    const fixture = TestBed.createComponent(ListaProblemas);
    fixture.componentRef.setInput('problemas', []);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'axe no encontró problemas',
    );
  });
});
