import { aProblemas, criteriosDe, pareceSpa } from './axe-a-problemas';

const violacion = (extra: object = {}) => ({
  id: 'image-alt',
  impact: 'critical',
  help: 'Images must have alternate text',
  helpUrl: 'https://dequeuniversity.com/rules/axe/4.10/image-alt',
  tags: ['cat.text-alternatives', 'wcag2a', 'wcag111', 'section508'],
  nodes: [{ target: ['main > img'], html: '<img src="a.png">' }],
  ...extra,
});

describe('aProblemas', () => {
  it('traduce gravedad, descripción, criterio y nodos', () => {
    const [p] = aProblemas([violacion()]);
    expect(p.gravedad).toBe('critico');
    expect(p.descripcion).toBe('Las imágenes deben tener texto alternativo.');
    expect(p.criterios).toEqual([{ id: '1.1.1', nombre: 'Contenido no textual', nivel: 'A' }]);
    expect(p.nodos).toEqual([
      {
        selector: 'main > img',
        html: '<img src="a.png">',
        ruta: null,
        etiqueta: '',
        resumen: '',
        huella: undefined,
      },
    ]);
  });

  it('descarta una ruta, etiqueta o huella con forma inválida (vienen del iframe)', () => {
    const malos = [
      { ruta: 'x', etiqueta: 7, huella: {} },
      { ruta: [1, -1], etiqueta: 'img', huella: 'a' },
      { ruta: [1.5], etiqueta: 'x'.repeat(65), huella: 'a' },
      { ruta: Array(600).fill(0), etiqueta: 'img', huella: 'a' },
    ];
    for (const malo of malos) {
      const [p] = aProblemas([violacion({ nodes: [{ target: ['img'], html: '', ...malo }] })]);
      expect(p.nodos[0].ruta).toBeNull();
    }
    const [p] = aProblemas([
      violacion({ nodes: [{ target: ['img'], html: '', ruta: [1], etiqueta: 'img', huella: 9 }] }),
    ]);
    expect(p.nodos[0]).toMatchObject({ ruta: [1], etiqueta: 'img', huella: undefined });
  });

  it('conserva la ruta, la etiqueta y el resumen que envía el corredor', () => {
    const nodo = {
      target: ['main > img'],
      html: '<img src="a.png">',
      ruta: [1, 0, 2],
      etiqueta: 'img',
      resumen: `Fix any of the following: ${'x'.repeat(600)}`,
      huella: 'src=a.png|0|3',
    };
    const [p] = aProblemas([violacion({ nodes: [nodo] })]);
    expect(p.nodos[0]).toMatchObject({ ruta: [1, 0, 2], etiqueta: 'img', huella: 'src=a.png|0|3' });
    expect(p.nodos[0].resumen).toHaveLength(500);
  });

  it('usa la ayuda de axe si la regla no tiene traducción', () => {
    expect(aProblemas([violacion({ id: 'regla-rara', help: 'Some help' })])[0].descripcion).toBe(
      'Some help',
    );
  });

  it('mapea las cuatro gravedades de axe (sin gravedad = menor)', () => {
    const impactos = ['critical', 'serious', 'moderate', 'minor', null];
    expect(impactos.map((impact) => aProblemas([violacion({ impact })])[0].gravedad)).toEqual([
      'critico',
      'serio',
      'moderado',
      'menor',
      'menor',
    ]);
  });

  it('recorta fragmentos largos a 300 caracteres', () => {
    const largo = `<p>${'x'.repeat(500)}</p>`;
    const [p] = aProblemas([violacion({ nodes: [{ target: ['p'], html: largo }] })]);
    expect(p.nodos[0].html.length).toBe(300);
    expect(p.nodos[0].html.endsWith('…')).toBe(true);
  });

  it('un selector dentro de un iframe o shadow DOM se une con " >> "', () => {
    const [p] = aProblemas([
      violacion({ nodes: [{ target: [['#host', 'button']], html: '<button>' }] }),
    ]);
    expect(p.nodos[0].selector).toBe('#host >> button');
  });

  it('ordena por gravedad', () => {
    const r = aProblemas([
      violacion({ id: 'a', impact: 'minor' }),
      violacion({ id: 'b', impact: 'critical' }),
    ]);
    expect(r.map((p) => p.regla)).toEqual(['b', 'a']);
  });
});

describe('criteriosDe', () => {
  it('lee criterios de varios dígitos', () => {
    expect(criteriosDe(['wcag2aa', 'wcag143'])).toEqual([
      { id: '1.4.3', nombre: 'Contraste (mínimo)', nivel: 'AA' },
    ]);
    expect(criteriosDe(['wcag2a', 'wcag1410'])[0].id).toBe('1.4.10');
  });
  it('ignora etiquetas que no son criterios', () => {
    expect(criteriosDe(['best-practice', 'cat.color'])).toEqual([]);
  });
});

describe('pareceSpa', () => {
  it('un body casi vacío con un div raíz parece una SPA', () => {
    expect(
      pareceSpa('<html><body><div id="root"></div><script src="/app.js"></script></body></html>'),
    ).toBe(true);
    expect(pareceSpa('<body><app-root></app-root></body>')).toBe(true);
    expect(pareceSpa('<div id="__next"></div><script src="x.js"></script>')).toBe(true);
  });
  it('una página con contenido no lo parece', () => {
    expect(
      pareceSpa(
        '<body><div id="root"><h1>Bienvenida</h1><p>' +
          'Texto real de la página. '.repeat(10) +
          '</p></div></body>',
      ),
    ).toBe(false);
    expect(
      pareceSpa(
        '<main><h1>Hola</h1><p>Contenido suficiente para leer en esta página de prueba.</p></main>',
      ),
    ).toBe(false);
  });
  it('un body vacío solo con scripts parece una SPA', () => {
    expect(pareceSpa('<body><script src="a.js"></script><script src="b.js"></script></body>')).toBe(
      true,
    );
  });
});
