import { Problema } from './modelo';
import { calcularPuntaje, resumir } from './puntaje';

const problema = (
  gravedad: Problema['gravedad'],
  nodos = 1,
  regla = `r-${gravedad}-${nodos}`,
): Problema => ({
  regla,
  gravedad,
  descripcion: '',
  ayudaUrl: '',
  criterios: [],
  nodos: Array.from({ length: nodos }, (_, i) => ({ selector: `#n${i}`, html: '' })),
});

describe('calcularPuntaje', () => {
  it('sin problemas es 100', () => expect(calcularPuntaje([])).toBe(100));
  it('un crítico con un nodo resta 15', () =>
    expect(calcularPuntaje([problema('critico')])).toBe(85));
  it('un serio con 4 nodos resta 8 + 3', () =>
    expect(calcularPuntaje([problema('serio', 4)])).toBe(89));
  it('el extra por nodos tiene un tope de 5 por regla', () =>
    expect(calcularPuntaje([problema('moderado', 40)])).toBe(91));
  it('un menor resta 1', () => expect(calcularPuntaje([problema('menor')])).toBe(99));
  it('suma todas las reglas', () =>
    expect(
      calcularPuntaje([
        problema('critico'),
        problema('serio'),
        problema('moderado'),
        problema('menor'),
      ]),
    ).toBe(72));
  it('nunca baja de 0', () =>
    expect(
      calcularPuntaje(Array.from({ length: 10 }, (_, i) => problema('critico', 1, `r${i}`))),
    ).toBe(0));
});

describe('resumir', () => {
  it('cuenta las reglas por gravedad', () => {
    expect(resumir([problema('critico'), problema('critico', 3), problema('menor')])).toEqual({
      critico: 2,
      serio: 0,
      moderado: 0,
      menor: 1,
    });
  });
});
