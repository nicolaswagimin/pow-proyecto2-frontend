import { TestBed } from '@angular/core/testing';
import { DiffCodigo, filasLadoALado } from './diff-codigo';
import { diffLineas } from '../../diff';

describe('filasLadoALado', () => {
  it('empareja quitadas con agregadas en la misma fila', () => {
    const filas = filasLadoALado(
      diffLineas('a\n<img src="x">\nc', 'a\n<img src="x" alt="Logo">\nc'),
    );
    expect(
      filas.map((f) => (f.tipo === 'fila' ? [f.izq?.texto ?? null, f.der?.texto ?? null] : f.tipo)),
    ).toEqual([
      ['a', 'a'],
      ['<img src="x">', '<img src="x" alt="Logo">'],
      ['c', 'c'],
    ]);
  });

  it('resume las zonas iguales largas con 3 líneas de contexto', () => {
    const antes = Array.from({ length: 20 }, (_, i) => `l${i}`).join('\n');
    const filas = filasLadoALado(diffLineas(antes, antes.replace('l10', 'cambio')));
    expect(filas[0]).toEqual({ tipo: 'omitidas', cantidad: 7 });
    expect(filas.at(-1)).toEqual({ tipo: 'omitidas', cantidad: 6 });
    expect(filas.filter((f) => f.tipo === 'fila').length).toBe(7);
  });
});

describe('ui-diff-codigo', () => {
  it('marca las líneas con texto (+ y −), no solo con color', () => {
    const fixture = TestBed.createComponent(DiffCodigo);
    fixture.componentRef.setInput('antes', 'a\nb');
    fixture.componentRef.setInput('despues', 'a\nc');
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.celda--quitada .marca')?.textContent).toContain('−');
    expect(raiz.querySelector('.celda--agregada .marca')?.textContent).toContain('+');
    expect(raiz.querySelector('table caption')?.textContent).toContain('Antes y después');
  });
});
