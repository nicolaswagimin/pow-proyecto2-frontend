import { AuditoriaResumen } from '../../services/auditorias.service';
import { agruparPorPagina, puntosEvolucion } from './agrupar';

const a = (
  id: number,
  pagina: string,
  puntaje: number,
  fecha: string,
  corregido: number | null = null,
): AuditoriaResumen => ({
  id,
  pagina,
  origen: 'url',
  puntaje,
  puntaje_corregido: corregido,
  creado_en: fecha,
  resumen: { critico: 0, serio: 0, moderado: 0, menor: 0 },
});

describe('agruparPorPagina', () => {
  const lista = [
    a(3, 'https://ejemplo.org/', 90, '2026-10-17T12:00:00Z'),
    a(2, 'contacto.html', 50, '2026-10-16T12:00:00Z'),
    a(1, 'https://ejemplo.org/', 60, '2026-10-15T12:00:00Z', 85),
  ];

  it('agrupa por página, de la más reciente a la más antigua', () => {
    expect(agruparPorPagina(lista).map((g) => g.pagina)).toEqual([
      'https://ejemplo.org/',
      'contacto.html',
    ]);
  });

  it('dentro de cada página, las auditorías van en orden cronológico para ver la evolución', () => {
    const [ejemplo] = agruparPorPagina(lista);
    expect(ejemplo.auditorias.map((x) => x.puntaje)).toEqual([60, 90]);
    expect(ejemplo.ultima.id).toBe(3);
    expect(ejemplo.cambio).toBe(30);
  });

  it('una sola auditoría no tiene cambio', () => {
    expect(agruparPorPagina(lista)[1].cambio).toBeNull();
  });
});

describe('puntosEvolucion', () => {
  it('convierte los puntajes en puntos del SVG (100 arriba, 0 abajo)', () => {
    expect(puntosEvolucion([0, 50, 100], 200, 100)).toBe('0,100 100,50 200,0');
  });
  it('con un solo puntaje dibuja un punto en el medio', () => {
    expect(puntosEvolucion([80], 200, 100)).toBe('100,20');
  });
});
