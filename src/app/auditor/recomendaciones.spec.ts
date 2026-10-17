import { DESCRIPCIONES } from './axe-a-problemas';
import { queHacer } from './recomendaciones';

describe('queHacer', () => {
  it('dice qué hacer con las reglas más comunes, en español', () => {
    expect(queHacer('image-alt')).toMatch(/alt/);
    expect(queHacer('color-contrast')).toMatch(/4\.5:1/);
    expect(queHacer('label')).toMatch(/<label>/);
  });

  it('cada regla con descripción en español también tiene recomendación', () => {
    const sin = Object.keys(DESCRIPCIONES).filter(
      (r) => queHacer(r) === queHacer('regla-desconocida'),
    );
    expect(sin).toEqual([]);
  });

  it('una regla desconocida tiene una recomendación general', () => {
    expect(queHacer('regla-desconocida')).toMatch(/Más información/);
  });
});
