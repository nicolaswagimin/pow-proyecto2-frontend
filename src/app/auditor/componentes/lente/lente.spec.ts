import { TestBed } from '@angular/core/testing';
import { MotorService } from '../../motor.service';
import { Lente } from './lente';

function sesionFalsa() {
  let alClic: (s: string) => void = () => {};
  let alVisibles: (s: string[]) => void = () => {};
  return {
    alVisibles: vi.fn((f: (s: string[]) => void) => {
      alVisibles = f;
      return () => {};
    }),
    visibles: (s: string[]) => alVisibles(s),
    resaltar: vi.fn(),
    enfocar: vi.fn(),
    cerrar: vi.fn(),
    alClic: vi.fn((f: (s: string) => void) => {
      alClic = f;
      return () => {};
    }),
    clic: (s: string) => alClic(s),
  };
}

async function montar() {
  const sesion = sesionFalsa();
  const motor = { abrir: vi.fn(async () => sesion) };
  TestBed.configureTestingModule({ providers: [{ provide: MotorService, useValue: motor }] });
  const fixture = TestBed.createComponent(Lente);
  fixture.componentRef.setInput('html', '<main><img src="a.png"></main>');
  fixture.componentRef.setInput('baseHref', 'https://ejemplo.org/');
  fixture.componentRef.setInput('selectores', ['main > img', '.gris']);
  fixture.componentRef.setInput('seleccionado', null);
  fixture.componentRef.setInput('direccion', 'https://ejemplo.org/');
  fixture.detectChanges();
  await fixture.whenStable();
  // La sesión se abre de forma asíncrona: una detección más para que corra el efecto de resaltado.
  fixture.detectChanges();
  await fixture.whenStable();
  return { fixture, sesion, motor, raiz: fixture.nativeElement as HTMLElement };
}

describe('ui-lente', () => {
  it('se ve como una ventana de navegador con la dirección de la página', async () => {
    const { raiz } = await montar();
    expect(raiz.querySelector('.ventana__direccion')?.textContent?.trim()).toBe(
      'https://ejemplo.org/',
    );
    expect(raiz.querySelector('.ventana__puntos')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('avisa qué elementos con problemas están a la vista', async () => {
    const { fixture, sesion } = await montar();
    const avisos: string[][] = [];
    fixture.componentInstance.visibles.subscribe((v) => avisos.push(v));
    sesion.visibles(['.gris']);
    expect(avisos).toEqual([['.gris']]);
  });

  it('abre el HTML en el iframe con título accesible', async () => {
    const { motor, raiz } = await montar();
    const iframe = raiz.querySelector('iframe')!;
    expect(motor.abrir).toHaveBeenCalledWith(
      iframe,
      '<main><img src="a.png"></main>',
      'https://ejemplo.org/',
    );
    expect(iframe.title).toBe('Vista previa aislada de la página auditada');
  });

  it('resalta todos los elementos con problemas', async () => {
    const { sesion } = await montar();
    expect(sesion.resaltar).toHaveBeenLastCalledWith(['main > img', '.gris'], null);
  });

  it('al seleccionar un problema enfoca su elemento', async () => {
    const { fixture, sesion } = await montar();
    fixture.componentRef.setInput('seleccionado', '.gris');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(sesion.enfocar).toHaveBeenCalledWith('.gris');
    expect(sesion.resaltar).toHaveBeenLastCalledWith(['main > img', '.gris'], '.gris');
  });

  it('un clic en la vista previa emite el selector', async () => {
    const { fixture, sesion } = await montar();
    let elegido: string | undefined;
    fixture.componentInstance.clic.subscribe((s) => (elegido = s));
    sesion.clic('main > img');
    expect(elegido).toBe('main > img');
  });
});
