import { calcularFuerza } from './fuerza';

describe('calcularFuerza', () => {
  it('vacía es 0', () => expect(calcularFuerza('')).toBe(0));
  it('corta es débil', () => expect(calcularFuerza('Ab1!')).toBe(1));
});
