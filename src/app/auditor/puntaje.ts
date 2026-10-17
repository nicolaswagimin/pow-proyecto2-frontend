import { GRAVEDADES, Gravedad, Problema } from './modelo';

// Puntaje de 0 a 100: se parte de 100 y cada regla incumplida resta el peso de su gravedad más 1
// por cada elemento afectado después del primero (como mucho 5 extra por regla). La misma fórmula
// está en docs/analisis-accesibilidad.md y en el "¿Cómo se calcula?" de la interfaz.

export const PESOS: Record<Gravedad, number> = { critico: 15, serio: 8, moderado: 4, menor: 1 };
export const MAX_EXTRA_POR_REGLA = 5;

export function penalizacion(problema: Problema): number {
  const extra = Math.min(MAX_EXTRA_POR_REGLA, Math.max(0, problema.nodos.length - 1));
  return PESOS[problema.gravedad] + extra;
}

export function calcularPuntaje(problemas: Problema[]): number {
  const total = problemas.reduce((suma, p) => suma + penalizacion(p), 0);
  return Math.max(0, 100 - total);
}

export function resumir(problemas: Problema[]): Record<Gravedad, number> {
  const resumen = Object.fromEntries(GRAVEDADES.map((g) => [g, 0])) as Record<Gravedad, number>;
  for (const p of problemas) resumen[p.gravedad]++;
  return resumen;
}
