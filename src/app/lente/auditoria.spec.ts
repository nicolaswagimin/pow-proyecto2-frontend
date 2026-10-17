import { TestBed } from '@angular/core/testing';
import { Auditoria } from './auditoria';

async function montar(entradas: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(Auditoria);
  for (const [k, v] of Object.entries(entradas)) fixture.componentRef.setInput(k, v);
  const conteos: number[] = [];
  fixture.componentInstance.problemas.subscribe((n) => conteos.push(n));
  fixture.detectChanges();
  return { fixture, conteos, raiz: fixture.nativeElement as HTMLElement };
}

describe('app-auditoria', () => {
  afterEach(() => document.querySelectorAll('.prueba-auditoria').forEach((e) => e.remove()));

  it('por defecto no audita hasta que se pulsa el botón', async () => {
    const { fixture, conteos, raiz } = await montar();
    await fixture.whenStable();
    expect(conteos).toEqual([]);
    expect(raiz.querySelector('ui-button')?.textContent).toContain('Auditar esta página');
  });

  it('con auto, audita al aparecer y avisa cuántos problemas encontró', async () => {
    const imagen = document.createElement('img');
    imagen.className = 'prueba-auditoria';
    imagen.src = 'x.png';
    document.body.append(imagen);
    const { fixture, conteos } = await montar({ auto: true });
    await vi.waitFor(() => expect(conteos.length).toBe(1), { timeout: 10_000 });
    expect(conteos[0]).toBeGreaterThan(0);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toMatch(/problema/);
  });
});
