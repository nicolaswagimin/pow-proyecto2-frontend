import { TestBed } from '@angular/core/testing';
import { CorreccionVerificada } from '../../verificar';
import { Correcciones } from './correcciones';

const base = {
  explicacion: 'Explicación simple.',
  original: '<img src="a.png">',
  corregido: '<img src="a.png" alt="Logo">',
  nuevos: [],
};
const correcciones: CorreccionVerificada[] = [
  { ...base, regla: 'image-alt', selector: 'img', estado: 'resuelto' },
  {
    ...base,
    regla: 'color-contrast',
    selector: '.gris',
    estado: 'no-resolvio',
    explicacion: 'El gris es muy claro.',
  },
  { ...base, regla: 'button-name', selector: 'button', estado: 'no-aplicable' },
];

function montar() {
  const fixture = TestBed.createComponent(Correcciones);
  fixture.componentRef.setInput('correcciones', correcciones);
  fixture.componentRef.setInput('verificacion', {
    auditoria: { problemas: [], reglasAprobadas: 0, fecha: '' },
    comparacion: {
      resueltos: ['image-alt|img'],
      sinResolver: ['color-contrast|.gris'],
      nuevos: [],
    },
    puntajeAntes: 72,
    puntajeDespues: 92,
  });
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('ui-correcciones', () => {
  it('muestra el puntaje antes y después del documento corregido', () => {
    const texto = montar().textContent ?? '';
    expect(texto).toMatch(/72\s*→\s*92/);
    expect(texto).toMatch(/1 resuelto/);
    expect(texto).toMatch(/1 sin resolver/);
  });

  it('solo las verificadas aparecen como correcciones, con su código', () => {
    const verificadas = montar().querySelector('[data-seccion="verificadas"]')!;
    expect(verificadas.textContent).toContain('image-alt');
    expect(verificadas.textContent).toContain('alt="Logo"');
    expect(verificadas.textContent).not.toContain('color-contrast');
  });

  it('las que no resolvieron van aparte, sin presentarse como solución', () => {
    const fallidas = montar().querySelector('[data-seccion="fallidas"]')!;
    expect(fallidas.textContent).toContain('No resolvió el problema');
    expect(fallidas.textContent).toContain('No se pudo aplicar');
    expect(fallidas.textContent).toContain('El gris es muy claro.');
    // el código propuesto queda dentro de un <details> cerrado, como intento, no como solución
    const propuesta = fallidas.querySelector('details');
    expect(propuesta?.open).toBe(false);
  });
});
