import { diffLineas } from './diff';

const tipos = (a: string, b: string) => diffLineas(a, b).map((l) => `${l.tipo[0]} ${l.texto}`);

describe('diffLineas', () => {
  it('textos iguales: todo igual', () => {
    expect(tipos('a\nb', 'a\nb')).toEqual(['i a', 'i b']);
  });
  it('línea agregada', () => {
    expect(tipos('a\nc', 'a\nb\nc')).toEqual(['i a', 'a b', 'i c']);
  });
  it('línea quitada', () => {
    expect(tipos('a\nb\nc', 'a\nc')).toEqual(['i a', 'q b', 'i c']);
  });
  it('línea cambiada: quitada y agregada', () => {
    expect(tipos('<img src="a">', '<img src="a" alt="Logo">')).toEqual([
      'q <img src="a">',
      'a <img src="a" alt="Logo">',
    ]);
  });
  it('numera las líneas de cada lado', () => {
    const r = diffLineas('a\nb', 'a\nx\nb');
    expect(r.map((l) => [l.numA ?? null, l.numB ?? null])).toEqual([
      [1, 1],
      [null, 2],
      [2, 3],
    ]);
  });
  it('documentos grandes con un cambio pequeño no explotan', () => {
    const base = Array.from({ length: 20_000 }, (_, i) => `<p>${i}</p>`);
    const cambiado = [...base];
    cambiado[10_000] = '<p>cambiado</p>';
    const r = diffLineas(base.join('\n'), cambiado.join('\n'));
    expect(r.filter((l) => l.tipo !== 'igual').map((l) => l.texto)).toEqual([
      '<p>10000</p>',
      '<p>cambiado</p>',
    ]);
  });
});
