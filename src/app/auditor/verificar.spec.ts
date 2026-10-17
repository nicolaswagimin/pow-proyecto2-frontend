import { Problema, ResultadoAuditoria } from './modelo';
import {
  aplicarCorreccion,
  compararAuditorias,
  verificarDocumento,
  verificarLote,
  verificarPorProblema,
} from './verificar';

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

const original = '<main><img src="a.png"><button></button></main>';
const antes = auditoria(problema('image-alt', ['img']), problema('button-name', ['button']));
const correccion = {
  regla: 'image-alt',
  selector: 'img',
  explicacion: 'x',
  original: '<img src="a.png">',
  corregido: '<img src="a.png" alt="Logo">',
};

describe('aplicarCorreccion', () => {
  it('reemplaza la primera aparición exacta', () => {
    expect(aplicarCorreccion(original, correccion.original, correccion.corregido)).toBe(
      '<main><img src="a.png" alt="Logo"><button></button></main>',
    );
  });
  it('si el fragmento original no está, devuelve null', () => {
    expect(aplicarCorreccion(original, '<img src="b.png">', 'x')).toBeNull();
  });
});

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

describe('verificarPorProblema', () => {
  it('resuelto: la regla desaparece de ese elemento y no hay problemas nuevos', async () => {
    const r = await verificarPorProblema(original, antes, correccion, async () =>
      auditoria(problema('button-name', ['button'])),
    );
    expect(r.estado).toBe('resuelto');
  });

  it('no resolvió: el problema sigue en el mismo elemento', async () => {
    const r = await verificarPorProblema(original, antes, correccion, async () => antes);
    expect(r.estado).toBe('no-resolvio');
  });

  it('no resolvió: el selector cambió pero la regla tiene los mismos elementos', async () => {
    const r = await verificarPorProblema(original, antes, correccion, async () =>
      auditoria(problema('image-alt', ['main > img']), problema('button-name', ['button'])),
    );
    expect(r.estado).toBe('no-resolvio');
  });

  it('introdujo problemas: se resolvió pero aparecieron otros', async () => {
    const r = await verificarPorProblema(original, antes, correccion, async () =>
      auditoria(problema('button-name', ['button']), problema('color-contrast', ['img'])),
    );
    expect(r.estado).toBe('introdujo-problemas');
    expect(r.nuevos).toEqual(['color-contrast|img']);
  });

  it('no aplicable: el fragmento original no está en el HTML (no se audita)', async () => {
    const auditar = vi.fn();
    const r = await verificarPorProblema(
      original,
      antes,
      { ...correccion, original: '<img src="otra.png">' },
      auditar,
    );
    expect(r.estado).toBe('no-aplicable');
    expect(auditar).not.toHaveBeenCalled();
  });
});

describe('verificarDocumento', () => {
  it('compara las auditorías y calcula el puntaje antes y después', async () => {
    const r = await verificarDocumento(antes, '<main>…</main>', async () =>
      auditoria(problema('button-name', ['button'])),
    );
    expect(r.comparacion.resueltos).toEqual(['image-alt|img']);
    expect(r.puntajeAntes).toBe(70);
    expect(r.puntajeDespues).toBe(85);
  });
});

describe('verificarPorProblema: quitar u ocultar el elemento no es corregirlo', () => {
  const sinImagen = async () => auditoria(problema('button-name', ['button']));
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
    it(`«${corregido || '(vacío)'}» queda como quita-elemento`, async () => {
      const r = await verificarPorProblema(
        original,
        antes,
        { ...correccion, corregido },
        sinImagen,
      );
      expect(r.estado).toBe('quita-elemento');
    });
  }

  it('alt vacío (imagen decorativa) sigue siendo una corrección válida', async () => {
    const r = await verificarPorProblema(
      original,
      antes,
      { ...correccion, corregido: '<img src="a.png" alt="">' },
      sinImagen,
    );
    expect(r.estado).toBe('resuelto');
  });

  it('si el original ya estaba oculto, mantenerlo oculto no cuenta como trampa', async () => {
    const html = '<main><img src="a.png" hidden><button></button></main>';
    const r = await verificarPorProblema(
      html,
      antes,
      {
        ...correccion,
        original: '<img src="a.png" hidden>',
        corregido: '<img src="a.png" hidden alt="x">',
      },
      sinImagen,
    );
    expect(r.estado).toBe('resuelto');
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
