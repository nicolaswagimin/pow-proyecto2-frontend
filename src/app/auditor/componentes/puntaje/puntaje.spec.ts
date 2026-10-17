import { TestBed } from '@angular/core/testing';
import { PuntajeAuditoria } from './puntaje';

function montar(puntaje: number) {
  const fixture = TestBed.createComponent(PuntajeAuditoria);
  fixture.componentRef.setInput('puntaje', puntaje);
  fixture.componentRef.setInput('resumen', { critico: 1, serio: 2, moderado: 0, menor: 3 });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ui-puntaje', () => {
  it('muestra el puntaje con texto, no solo con color', () => {
    const raiz = montar(72);
    expect(raiz.textContent).toContain('72');
    expect(raiz.textContent).toContain('de 100');
    expect(raiz.textContent).toContain('Necesita mejoras');
  });

  it('muestra el conteo por gravedad', () => {
    const texto = montar(72).textContent ?? '';
    expect(texto).toMatch(/1\s*crítico/i);
    expect(texto).toMatch(/2\s*serios/i);
    expect(texto).toMatch(/3\s*menores/i);
  });

  it('explica la fórmula en "¿Cómo se calcula?"', () => {
    const detalles = montar(72).querySelector('details')!;
    expect(detalles.querySelector('summary')?.textContent).toContain('¿Cómo se calcula?');
    expect(detalles.textContent).toContain('15');
    expect(detalles.textContent).toContain('8');
    expect(detalles.textContent).toContain('máximo 5');
  });

  it('califica los rangos', () => {
    expect(montar(100).textContent).toContain('Excelente');
    expect(montar(40).textContent).toContain('Deficiente');
  });
});
