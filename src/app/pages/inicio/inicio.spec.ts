import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MotorService } from '../../auditor/motor.service';
import { IaService } from '../../services/ia.service';
import { PaginasService } from '../../services/paginas.service';
import { auditorFalso } from '../../../testing/pagina-grande.spec-util';
import { Inicio } from './inicio';

const HTML = '<main><img src="a.png"></main>';

function montar({ escritorio = true } = {}) {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('960px') ? escritorio : false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  let avisarVisibles: (s: string[]) => void = () => {};
  const sesion = {
    resaltar: vi.fn(),
    enfocar: vi.fn(),
    cerrar: vi.fn(),
    alClic: vi.fn(() => () => {}),
    alVisibles: vi.fn((f: (s: string[]) => void) => {
      avisarVisibles = f;
      return () => {};
    }),
  };
  const motor = {
    auditarHtml: vi.fn(async (h: string) => auditorFalso(h)),
    abrir: vi.fn(async () => sesion),
  };
  const paginas = { descargar: vi.fn(() => of({ html: HTML, urlFinal: 'https://www.w3.org/x' })) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MotorService, useValue: motor },
      { provide: PaginasService, useValue: paginas },
      { provide: IaService, useValue: {} },
    ],
  });
  const fixture = TestBed.createComponent(Inicio);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  return { fixture, raiz, paginas, visibles: (s: string[]) => avisarVisibles(s) };
}

async function estable(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

describe('/app (Inicio)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ya no tiene el panel de anotaciones de la propia app', () => {
    const { raiz } = montar();
    expect(raiz.querySelector('app-margen')).toBeNull();
    expect(raiz.textContent).not.toContain('Anotaciones');
  });

  it('la autoauditoría de a11Lens es una insignia en el pie de página', () => {
    const { raiz } = montar();
    const pie = raiz.querySelector('footer')!;
    expect(pie.querySelector('button.insignia')?.textContent).toContain(
      'Esta app: 0 problemas WCAG 2.2 AA',
    );
    expect(raiz.querySelectorAll('app-auditoria')).toHaveLength(0);
  });

  it('en escritorio, la columna derecha muestra las recomendaciones con su estado vacío', () => {
    const { raiz } = montar();
    const aside = raiz.querySelector('aside.margen')!;
    expect(aside.getAttribute('aria-labelledby')).toBe('titulo-recomendaciones');
    expect(aside.querySelector('ui-recomendaciones .encontrara')).not.toBeNull();
    // La columna se desplaza sola (sticky con scroll): se puede enfocar para recorrerla con teclado.
    expect(aside.querySelector('.columna')?.getAttribute('tabindex')).toBe('0');
  });

  it('un ejemplo del estado vacío audita esa URL', async () => {
    const { fixture, raiz, paginas } = montar();
    raiz.querySelector<HTMLButtonElement>('.ejemplos button')!.click();
    await estable(fixture);
    expect(paginas.descargar).toHaveBeenCalledWith(
      'https://www.w3.org/WAI/demos/bad/before/home.html',
    );
  });

  it('en móvil no hay columna: las recomendaciones van en el contenido', () => {
    const { raiz } = montar({ escritorio: false });
    expect(raiz.querySelector('aside')).toBeNull();
    expect(raiz.querySelector('main ui-recomendaciones')).not.toBeNull();
  });

  it('después de auditar, la columna sigue lo que está a la vista en la vista previa', async () => {
    const { fixture, raiz, visibles } = montar();
    const textarea = raiz.querySelector<HTMLTextAreaElement>('textarea')!;
    textarea.value = HTML;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    raiz.querySelector<HTMLButtonElement>('ui-entrada-html button[type=submit]')!.click();
    await estable(fixture);
    const selector = 'html:nth-child(1) > body:nth-child(2) > main:nth-child(1) > img:nth-child(1)';
    visibles([selector]);
    await estable(fixture);
    const aside = raiz.querySelector('aside.margen')!;
    expect(aside.querySelector('.contador')?.textContent).toContain('1 a la vista de 1');
    expect(aside.querySelector('.a-la-vista code')?.textContent).toBe(selector);
  });
});
