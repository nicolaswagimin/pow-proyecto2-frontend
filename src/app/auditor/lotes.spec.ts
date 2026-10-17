import { analizarFuente } from './fragmentos';
import { armarLote, prepararPendientes } from './lotes';
import { Gravedad, Problema } from './modelo';

const problema = (
  regla: string,
  gravedad: Gravedad,
  nodos: { selector: string; ruta: number[] | null; etiqueta: string; resumen?: string }[],
): Problema => ({
  regla,
  gravedad,
  descripcion: `Ayuda de ${regla}`,
  ayudaUrl: '',
  criterios: [],
  nodos: nodos.map((n) => ({ html: '', resumen: '', ...n })),
});

// body > main > (a, img, img, img, p)
const HTML =
  '<html lang="es"><head><title>T</title></head><body><main>' +
  '<a href="/"><img src="logo.png"></a>' +
  '<img src="x.png"><img src="x.png"><img src="x.png">' +
  '<p style="color:#aaa">Texto gris</p>' +
  '</main></body></html>';

describe('prepararPendientes', () => {
  it('ordena por gravedad, ubica cada nodo y separa los que no se pueden corregir', async () => {
    const fuente = await analizarFuente(HTML);
    const problemas = [
      problema('color-contrast', 'serio', [{ selector: 'p', ruta: [1, 0, 4], etiqueta: 'p' }]),
      problema('image-alt', 'critico', [
        { selector: 'a > img', ruta: [1, 0, 0, 0], etiqueta: 'img' },
        { selector: '#sombra >> img', ruta: null, etiqueta: 'img' },
      ]),
      problema('region', 'moderado', [{ selector: 'html', ruta: [], etiqueta: 'html' }]),
    ];
    const r = prepararPendientes(fuente, problemas, new Set());
    expect(r.pendientes.map((p) => p.clave)).toEqual([
      'image-alt|a > img',
      'color-contrast|p',
      'region|html',
    ]);
    expect(r.pendientes[0]).toMatchObject({
      regla: 'image-alt',
      ayuda: 'Ayuda de image-alt',
      padre: '<a href="/">',
      fragmento: { tipo: 'elemento', texto: '<img src="logo.png">' },
    });
    expect(r.pendientes[2].fragmento).toMatchObject({
      tipo: 'apertura',
      texto: '<html lang="es">',
    });
    expect(r.noCorregibles).toEqual(['image-alt|#sombra >> img']);
  });

  it('no repite lo que ya se intentó', async () => {
    const fuente = await analizarFuente(HTML);
    const problemas = [
      problema('image-alt', 'critico', [
        { selector: 'a > img', ruta: [1, 0, 0, 0], etiqueta: 'img' },
      ]),
    ];
    expect(
      prepararPendientes(fuente, problemas, new Set(['image-alt|a > img'])).pendientes,
    ).toEqual([]);
  });

  it('un elemento que contiene otro con problemas va solo con su apertura', async () => {
    const fuente = await analizarFuente(HTML);
    const problemas = [
      problema('link-name', 'serio', [{ selector: 'a', ruta: [1, 0, 0], etiqueta: 'a' }]),
      problema('image-alt', 'critico', [
        { selector: 'a > img', ruta: [1, 0, 0, 0], etiqueta: 'img' },
      ]),
    ];
    const [img, a] = prepararPendientes(fuente, problemas, new Set()).pendientes;
    expect(img.fragmento.tipo).toBe('elemento');
    expect(a.fragmento).toMatchObject({ tipo: 'apertura', texto: '<a href="/">' });
  });

  it('una apertura de más de 4000 caracteres (por ejemplo, un data: enorme) no se puede corregir', async () => {
    const enorme = `<img src="data:image/png;base64,${'A'.repeat(5000)}">`;
    const fuente = await analizarFuente(`<main>${enorme}</main>`);
    const r = prepararPendientes(
      fuente,
      [problema('image-alt', 'critico', [{ selector: 'img', ruta: [1, 0, 0], etiqueta: 'img' }])],
      new Set(),
    );
    expect(r.pendientes).toEqual([]);
    expect(r.noCorregibles).toEqual(['image-alt|img']);
  });
});

describe('armarLote', () => {
  async function pendientesDe(cuantos: number, html = (i: number) => `<img src="${i}.png">`) {
    const cuerpo = Array.from({ length: cuantos }, (_, i) => html(i)).join('');
    const fuente = await analizarFuente(`<main>${cuerpo}</main>`);
    const nodos = Array.from({ length: cuantos }, (_, i) => ({
      selector: `img:nth-child(${i + 1})`,
      ruta: [1, 0, i],
      etiqueta: 'img',
    }));
    return prepararPendientes(fuente, [problema('image-alt', 'critico', nodos)], new Set())
      .pendientes;
  }

  it('como mucho 8 fragmentos únicos por lote, en orden', async () => {
    const lote = armarLote(await pendientesDe(12));
    expect(lote.fragmentos.map((f) => f.id)).toEqual([
      'f1',
      'f2',
      'f3',
      'f4',
      'f5',
      'f6',
      'f7',
      'f8',
    ]);
    expect(lote.fragmentos[0]).toEqual({
      id: 'f1',
      regla: 'image-alt',
      ayuda: 'Ayuda de image-alt',
      html: '<img src="0.png">',
      padre: '<main>',
      resumen: '',
    });
  });

  it('corta antes de pasar 12 000 caracteres', async () => {
    const largo = (i: number) => `<img src="${i}.png" title="${'x'.repeat(2900)}">`;
    const lote = armarLote(await pendientesDe(6, largo));
    expect(lote.fragmentos).toHaveLength(4);
    const total = lote.fragmentos.reduce(
      (t, f) => t + f.html.length + f.padre.length + f.resumen.length,
      0,
    );
    expect(total).toBeLessThanOrEqual(12_000);
  });

  it('los elementos idénticos van una sola vez y se aplican a todos', async () => {
    const lote = armarLote(await pendientesDe(3, () => '<img src="x.png">'));
    expect(lote.fragmentos).toHaveLength(1);
    expect(lote.ubicaciones.get('f1')!.map((p) => p.selector)).toEqual([
      'img:nth-child(1)',
      'img:nth-child(2)',
      'img:nth-child(3)',
    ]);
  });

  it('dos problemas del mismo elemento no van en el mismo lote (el segundo espera al siguiente)', async () => {
    const fuente = await analizarFuente('<main><img src="a.png"></main>');
    const pendientes = prepararPendientes(
      fuente,
      [
        problema('image-alt', 'critico', [{ selector: 'img', ruta: [1, 0, 0], etiqueta: 'img' }]),
        problema('target-size', 'serio', [{ selector: 'img', ruta: [1, 0, 0], etiqueta: 'img' }]),
      ],
      new Set(),
    ).pendientes;
    const lote = armarLote(pendientes);
    expect(lote.fragmentos.map((f) => f.regla)).toEqual(['image-alt']);
  });

  it('sin pendientes, el lote está vacío', () => {
    expect(armarLote([]).fragmentos).toEqual([]);
  });
});
