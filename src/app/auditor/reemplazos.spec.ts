import { aplicarReemplazos } from './reemplazos';

describe('aplicarReemplazos', () => {
  const html = '<main>\n  <img src="a.png">\n  <IMG  src=b.png >\n  <button></button>\n</main>';
  const rango = (texto: string) => ({
    inicio: html.indexOf(texto),
    fin: html.indexOf(texto) + texto.length,
  });

  it('reemplaza cada rango sin tocar nada más, en cualquier orden', () => {
    const r = aplicarReemplazos(html, [
      { ...rango('<button></button>'), texto: '<button>Enviar</button>' },
      { ...rango('<img src="a.png">'), texto: '<img src="a.png" alt="A">' },
    ]);
    expect(r).toBe(
      '<main>\n  <img src="a.png" alt="A">\n  <IMG  src=b.png >\n  <button>Enviar</button>\n</main>',
    );
  });

  it('respeta el formato original (mayúsculas, espacios, atributos sin comillas)', () => {
    const r = aplicarReemplazos(html, [
      { ...rango('<IMG  src=b.png >'), texto: '<IMG  src=b.png alt="" >' },
    ]);
    expect(r.replace('<IMG  src=b.png alt="" >', '<IMG  src=b.png >')).toBe(html);
  });

  it('sin reemplazos devuelve el mismo texto', () => {
    expect(aplicarReemplazos(html, [])).toBe(html);
  });

  it('dos reemplazos que se pisan son un error', () => {
    const a = rango('<img src="a.png">');
    expect(() =>
      aplicarReemplazos(html, [
        { ...a, texto: 'x' },
        { inicio: a.inicio + 2, fin: a.fin + 3, texto: 'y' },
      ]),
    ).toThrow(/se pisan/);
  });

  it('un rango fuera del texto es un error', () => {
    expect(() =>
      aplicarReemplazos(html, [{ inicio: 5, fin: html.length + 1, texto: 'x' }]),
    ).toThrow();
  });
});
