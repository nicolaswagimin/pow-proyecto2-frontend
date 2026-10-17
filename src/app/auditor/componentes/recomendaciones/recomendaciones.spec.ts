import { TestBed } from '@angular/core/testing';
import { Problema } from '../../modelo';
import { CorreccionVerificada } from '../../verificar';
import { EJEMPLOS, Recomendaciones } from './recomendaciones';

const problemas: Problema[] = [
  {
    regla: 'image-alt',
    gravedad: 'critico',
    descripcion: 'Las imágenes deben tener texto alternativo.',
    ayudaUrl: '',
    criterios: [],
    nodos: [
      { selector: 'header > img', html: '' },
      { selector: 'footer > img', html: '' },
    ],
  },
  {
    regla: 'html-has-lang',
    gravedad: 'serio',
    descripcion: 'La página debe declarar su idioma.',
    ayudaUrl: '',
    criterios: [],
    nodos: [{ selector: 'html', html: '' }],
  },
];

function montar(entradas: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(Recomendaciones);
  const valores = {
    estado: 'listo',
    problemas,
    visibles: [],
    seleccionado: null,
    correcciones: [],
    ...entradas,
  };
  for (const [k, v] of Object.entries(valores)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  const textos = (sel: string) =>
    [...raiz.querySelectorAll(sel)].map((e) => e.textContent!.replace(/\s+/g, ' ').trim());
  return { fixture, raiz, textos };
}

describe('ui-recomendaciones', () => {
  it('antes de auditar: qué va a encontrar a11Lens y dos ejemplos que se auditan con un clic', () => {
    const { fixture, raiz, textos } = montar({ estado: 'vacio', problemas: null });
    expect(textos('.encontrara li').length).toBeGreaterThanOrEqual(5);
    expect(textos('.encontrara li').join(' ')).toMatch(/contraste/i);
    const urls: string[] = [];
    fixture.componentInstance.probar.subscribe((u) => urls.push(u));
    const botones = raiz.querySelectorAll<HTMLButtonElement>('.ejemplos button');
    expect(botones).toHaveLength(2);
    botones.forEach((b) => b.click());
    expect(urls).toEqual(EJEMPLOS.map((e) => e.url));
    expect(urls[0]).toBe('https://www.w3.org/WAI/demos/bad/before/home.html');
  });

  it('mientras audita lo dice', () => {
    const { textos } = montar({ estado: 'auditando', problemas: null });
    expect(textos('.pista').join(' ')).toMatch(/Auditando/);
  });

  it('solo muestra los elementos con problemas que están a la vista, con qué hacer', () => {
    const { textos } = montar({ visibles: ['footer > img'] });
    expect(textos('.a-la-vista .recomendacion__descripcion')).toEqual([
      'Las imágenes deben tener texto alternativo.',
    ]);
    expect(textos('.a-la-vista .recomendacion__que-hacer')[0]).toMatch(/alt/);
    expect(textos('.contador')[0]).toBe('1 a la vista de 3 elementos con problemas');
  });

  it('los problemas de toda la página van aparte y siempre se ven', () => {
    const { textos } = montar({ visibles: [] });
    expect(textos('.toda-la-pagina .recomendacion__descripcion')).toEqual([
      'La página debe declarar su idioma.',
    ]);
    expect(textos('.a-la-vista-vacio')[0]).toMatch(/Desplázate/);
  });

  it('un clic en una recomendación la selecciona', () => {
    const { fixture, raiz } = montar({ visibles: ['header > img'], seleccionado: 'header > img' });
    const elegidos: string[] = [];
    fixture.componentInstance.seleccionar.subscribe((s) => elegidos.push(s));
    const boton = raiz.querySelector<HTMLButtonElement>('.a-la-vista button')!;
    expect(boton.getAttribute('aria-pressed')).toBe('true');
    boton.click();
    expect(elegidos).toEqual(['header > img']);
  });

  it('si ya hay una corrección verificada, muestra la explicación de la IA y su estado', () => {
    const correccion: CorreccionVerificada = {
      regla: 'image-alt',
      selector: 'header > img',
      explicacion: 'Quien usa lector de pantalla no sabe qué muestra el logo.',
      original: '',
      corregido: '',
      estado: 'resuelto',
      nuevos: [],
    };
    const { textos } = montar({ visibles: ['header > img'], correcciones: [correccion] });
    expect(textos('.recomendacion__ia')[0]).toBe(
      'Resuelto (verificado con axe): Quien usa lector de pantalla no sabe qué muestra el logo.',
    );
  });

  it('sin problemas no hay nada que recomendar', () => {
    const { textos } = montar({ problemas: [] });
    expect(textos('.limpio')[0]).toMatch(/no encontró problemas/);
  });
});
