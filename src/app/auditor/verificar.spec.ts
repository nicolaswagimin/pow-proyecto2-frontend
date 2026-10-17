import { Problema, ResultadoAuditoria } from './modelo';
import {
  aplicarCorreccion,
  compararAuditorias,
  verificarDocumento,
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
      { ...correccion, original: '<img src="a.png" hidden>', corregido: '<img src="a.png" hidden alt="x">' },
      sinImagen,
    );
    expect(r.estado).toBe('resuelto');
  });
});
