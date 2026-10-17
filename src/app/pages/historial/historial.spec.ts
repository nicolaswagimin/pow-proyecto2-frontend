import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuditoriasService } from '../../services/auditorias.service';
import { Historial } from './historial';

beforeAll(() => {
  window.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});

const fila = (id: number, pagina: string, puntaje: number, fecha: string) => ({
  id,
  pagina,
  origen: 'url' as const,
  puntaje,
  puntaje_corregido: null,
  creado_en: fecha,
  resumen: { critico: 1, serio: 0, moderado: 0, menor: 0 },
});

async function montar(servicio: object) {
  TestBed.configureTestingModule({
    imports: [Historial],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      { provide: AuditoriasService, useValue: servicio },
    ],
  });
  const fixture = TestBed.createComponent(Historial);
  await fixture.whenStable();
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  const boton = (texto: string) =>
    [...raiz.querySelectorAll('button')].find((b) => b.textContent?.includes(texto))!;
  return { fixture, raiz, boton };
}

describe('Historial', () => {
  it('muestra cada página con su evolución en texto', async () => {
    const { raiz } = await montar({
      listar: () =>
        of([
          fila(2, 'https://ejemplo.org/', 90, '2026-10-17T10:00:00Z'),
          fila(1, 'https://ejemplo.org/', 60, '2026-10-16T10:00:00Z'),
        ]),
    });
    expect(raiz.textContent).toContain('https://ejemplo.org/');
    expect(raiz.textContent).toMatch(/60\s*→\s*90/);
    expect(raiz.textContent).toContain('+30');
  });

  it('vacío y error', async () => {
    expect((await montar({ listar: () => of([]) })).raiz.textContent).toContain(
      'Todavía no guardaste auditorías',
    );
    TestBed.resetTestingModule();
    const conError = await montar({
      listar: () => throwError(() => new HttpErrorResponse({ status: 0 })),
    });
    expect(conError.raiz.textContent).toContain('No pudimos conectar');
  });

  it('abrir lleva a /app con la auditoría', async () => {
    const { boton } = await montar({
      listar: () => of([fila(7, 'x.html', 80, '2026-10-17T10:00:00Z')]),
    });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    boton('Abrir').click();
    expect(navegar).toHaveBeenCalledWith(['/app'], { queryParams: { auditoria: 7 } });
  });

  it('eliminar pide confirmación', async () => {
    const eliminar = vi.fn(() => of(undefined));
    const { fixture, raiz, boton } = await montar({
      listar: () => of([fila(7, 'x.html', 80, '2026-10-17T10:00:00Z')]),
      eliminar,
    });
    boton('Eliminar').click();
    fixture.detectChanges();
    expect(eliminar).not.toHaveBeenCalled();
    boton('Sí, eliminar').click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(eliminar).toHaveBeenCalledWith(7);
    expect(raiz.textContent).toContain('Todavía no guardaste auditorías');
  });
});
