import { Problema, ResultadoAuditoria } from './modelo';
import { cambioNoPermitido, compararAuditorias, quitaUOculta, verificarLote } from './verificar';

const problema = (regla: string, selectores: string[]): Problema => ({
  regla,
  gravedad: 'critico',
  descripcion: '',
  ayudaUrl: '',
  criterios: [],
  nodos: selectores.map((selector) => ({ selector, html: '' })),
});
const auditoria = (...problemas: Problema[]): ResultadoAuditoria => ({
  problemas,
  reglasAprobadas: 5,
  fecha: '',
});

const antes = auditoria(problema('image-alt', ['img']), problema('button-name', ['button']));

describe('compararAuditorias', () => {
  it('separa resueltos, sin resolver y nuevos', () => {
    const despues = auditoria(
      problema('button-name', ['button']),
      problema('color-contrast', ['p']),
    );
    expect(compararAuditorias(antes, despues)).toEqual({
      resueltos: ['image-alt|img'],
      sinResolver: ['button-name|button'],
      nuevos: ['color-contrast|p'],
    });
  });
});

describe('quitaUOculta: quitar u ocultar el elemento no es corregirlo', () => {
  const original = '<img src="a.png">';
  const trampas = [
    '',
    '<img src="a.png" hidden>',
    '<img src="a.png" style="display: none">',
    '<img src="a.png" style="visibility:hidden">',
    '<img src="a.png" aria-hidden="true">',
    '<div hidden><img src="a.png" alt="Logo"></div>',
    '<span>Logo</span>',
  ];
  for (const corregido of trampas) {
    it(`«${corregido || '(vacío)'}» quita u oculta el elemento`, () => {
      expect(quitaUOculta(original, corregido)).toBe(true);
    });
  }

  it('alt vacío (imagen decorativa) sigue siendo una corrección válida', () => {
    expect(quitaUOculta(original, '<img src="a.png" alt="">')).toBe(false);
  });

  it('si el original ya estaba oculto, mantenerlo oculto no cuenta como trampa', () => {
    expect(quitaUOculta('<img src="a.png" hidden>', '<img src="a.png" hidden alt="x">')).toBe(
      false,
    );
  });

  it('una apertura corregida con el mismo elemento es válida', () => {
    expect(quitaUOculta('<a href="/">', '<a href="/" aria-label="Inicio">')).toBe(false);
  });
});

describe('cambioNoPermitido: una corrección no puede agregar código que se ejecuta ni otros elementos', () => {
  const img = { regla: 'image-alt', original: '<img src="a.png">', tipo: 'elemento' as const };
  for (const corregido of [
    '<img src="a.png" alt="Logo"><script src="https://malo.example/x.js"></script>',
    '<img src="a.png" alt="Logo" onerror="robar()">',
    '<img src="a.png" alt="Logo"><iframe srcdoc="<p>x</p>"></iframe>',
    '<a href="javascript:robar()"><img src="a.png" alt="Logo"></a>',
    '<img src="a.png" alt="Logo"><meta http-equiv="refresh" content="0;url=https://malo.example">',
  ]) {
    it(`rechaza «${corregido.slice(0, 60)}»`, () => {
      expect(cambioNoPermitido({ ...img, corregido })).toBe(true);
    });
  }

  it('acepta una corrección que solo agrega atributos inofensivos', () => {
    expect(cambioNoPermitido({ ...img, corregido: '<img src="a.png" alt="Logo">' })).toBe(false);
  });

  it('lo peligroso que ya estaba en el original no cuenta como agregado', () => {
    const original = '<button onclick="comprar()"></button>';
    expect(
      cambioNoPermitido({
        regla: 'button-name',
        original,
        tipo: 'elemento',
        corregido: '<button onclick="comprar()">Comprar</button>',
      }),
    ).toBe(false);
  });

  it('una apertura corregida debe seguir siendo solo esa apertura', () => {
    const a = { regla: 'link-name', original: '<a href="/">', tipo: 'apertura' as const };
    expect(cambioNoPermitido({ ...a, corregido: '<a href="/" aria-label="Inicio">' })).toBe(false);
    expect(
      cambioNoPermitido({
        ...a,
        corregido: '<a href="/" aria-label="Inicio"><span>Compra ya</span>',
      }),
    ).toBe(true);
    expect(cambioNoPermitido({ ...a, corregido: '<div><a href="/">' })).toBe(true);
  });

  it('en document-title, la apertura de <head> puede agregar solo un <title>', () => {
    const head = { regla: 'document-title', original: '<head>', tipo: 'apertura' as const };
    expect(cambioNoPermitido({ ...head, corregido: '<head><title>Tienda</title>' })).toBe(false);
    expect(
      cambioNoPermitido({
        ...head,
        corregido:
          '<head><title>Tienda</title><link rel="stylesheet" href="https://malo.example/x.css">',
      }),
    ).toBe(true);
  });
});

describe('verificarLote', () => {
  const html = '<main><img src="a.png"><img src="b.png"><button></button></main>';
  const base = {
    html,
    auditoria: auditoria(problema('image-alt', ['#a', '#b']), problema('button-name', ['button'])),
  };
  const candidata = (
    selector: string,
    original: string,
    corregido: string,
    regla = 'image-alt',
  ) => ({
    regla,
    selector,
    explicacion: 'x',
    original,
    corregido,
    inicio: html.indexOf(original),
    fin: html.indexOf(original) + original.length,
  });
  const a = candidata('#a', '<img src="a.png">', '<img src="a.png" alt="A">');
  const b = candidata('#b', '<img src="b.png">', '<img src="b.png" alt="B">');
  const auditorDe = (respuestas: Record<string, ResultadoAuditoria>) => {
    const auditados: string[] = [];
    const auditar = async (h: string) => {
      auditados.push(h);
      const r = respuestas[h];
      if (!r) throw new Error(`auditoría inesperada: ${h}`);
      return r;
    };
    return { auditar, auditados };
  };
  const ambas = '<main><img src="a.png" alt="A"><img src="b.png" alt="B"><button></button></main>';
  const soloB = '<main><img src="a.png"><img src="b.png" alt="B"><button></button></main>';
  const soloA = '<main><img src="a.png" alt="A"><img src="b.png"><button></button></main>';

  it('todo resuelto: una sola auditoría y el documento nuevo las incluye a todas', async () => {
    const { auditar, auditados } = auditorDe({
      [ambas]: auditoria(problema('button-name', ['button'])),
    });
    const r = await verificarLote(base, [a, b], auditar);
    expect(r.verificadas.map((v) => v.estado)).toEqual(['resuelto', 'resuelto']);
    expect(auditados).toEqual([ambas]);
    expect(r.base.html).toBe(ambas);
    expect(r.base.auditoria.problemas.map((p) => p.regla)).toEqual(['button-name']);
  });

  it('si el selector cambia pero la regla sigue con los mismos elementos, no cuenta como resuelto', async () => {
    // El selector nuevo aparece como problema nuevo: se audita cada corrección por separado.
    const { auditar } = auditorDe({
      [ambas]: auditoria(
        problema('image-alt', ['main > img', 'main > img + img']),
        problema('button-name', ['button']),
      ),
      [soloA]: auditoria(
        problema('image-alt', ['main > img', '#b']),
        problema('button-name', ['button']),
      ),
      [soloB]: auditoria(
        problema('image-alt', ['#a', 'main > img']),
        problema('button-name', ['button']),
      ),
    });
    const r = await verificarLote(base, [a, b], auditar);
    expect(r.verificadas.map((v) => v.estado)).toEqual(['no-resolvio', 'no-resolvio']);
    expect(r.base).toBe(base);
  });

  it('con problemas nuevos audita cada corrección por separado para saber cuál fue', async () => {
    const { auditar, auditados } = auditorDe({
      [ambas]: auditoria(problema('button-name', ['button']), problema('color-contrast', ['#a'])),
      [soloA]: auditoria(
        problema('image-alt', ['#b']),
        problema('button-name', ['button']),
        problema('color-contrast', ['#a']),
      ),
      [soloB]: auditoria(problema('image-alt', ['#a']), problema('button-name', ['button'])),
    });
    const r = await verificarLote(base, [a, b], auditar);
    expect(r.verificadas.map((v) => v.estado)).toEqual(['introdujo-problemas', 'resuelto']);
    expect(r.verificadas[0].nuevos).toEqual(['color-contrast|#a']);
    // La base solo incorpora la resuelta (su auditoría ya está hecha: no se repite).
    expect(r.base.html).toBe(soloB);
    expect(auditados).toEqual([ambas, soloA, soloB]);
  });

  it('una corrección que quita el elemento no se aplica ni se audita', async () => {
    const quita = candidata('#a', '<img src="a.png">', '<span></span>');
    const { auditar, auditados } = auditorDe({});
    const r = await verificarLote(base, [quita], auditar);
    expect(r.verificadas[0].estado).toBe('quita-elemento');
    expect(auditados).toEqual([]);
    expect(r.base).toBe(base);
  });

  it('una corrección que agrega un script no se aplica: queda como cambio no permitido', async () => {
    const mala = candidata(
      '#a',
      '<img src="a.png">',
      '<img src="a.png" alt="A"><script src="https://malo.example/x.js"></script>',
    );
    const { auditar, auditados } = auditorDe({});
    const r = await verificarLote(base, [mala], auditar);
    expect(r.verificadas[0].estado).toBe('cambio-no-permitido');
    expect(auditados).toEqual([]);
    expect(r.base).toBe(base);
  });

  it('una corrección de apertura que cambia de elemento cuenta como quitarlo', async () => {
    const apertura = candidata('button', '<button>', '<div>', 'button-name');
    const { auditar } = auditorDe({});
    expect((await verificarLote(base, [apertura], auditar)).verificadas[0].estado).toBe(
      'quita-elemento',
    );
  });

  it('resueltas en parte sin problemas nuevos: se vuelve a auditar el documento con las resueltas', async () => {
    const otraB = candidata('#b', '<img src="b.png">', '<img src="b.png" alt="">');
    const conB = '<main><img src="a.png" alt="A"><img src="b.png" alt=""><button></button></main>';
    const { auditar, auditados } = auditorDe({
      [conB]: auditoria(problema('image-alt', ['#b']), problema('button-name', ['button'])),
      [soloA]: auditoria(problema('image-alt', ['#b']), problema('button-name', ['button'])),
    });
    const r = await verificarLote(base, [a, otraB], auditar);
    expect(r.verificadas.map((v) => v.estado)).toEqual(['resuelto', 'no-resolvio']);
    expect(r.base.html).toBe(soloA);
    expect(auditados).toEqual([conB, soloA]);
  });
});
