import { CorreccionProblema } from '../services/ia.service';
import { ResultadoAuditoria } from './modelo';
import { calcularPuntaje } from './puntaje';

// Verificación de las correcciones: se aplican y se vuelve a auditar con axe. Una corrección que
// no resuelve su problema nunca se presenta como solución (docs/decisiones/0007).

export type EstadoCorreccion = 'resuelto' | 'no-resolvio' | 'introdujo-problemas' | 'no-aplicable';

export interface CorreccionVerificada extends CorreccionProblema {
  estado: EstadoCorreccion;
  nuevos: string[]; // "regla|selector" que aparecieron con la corrección
}

export interface Comparacion {
  resueltos: string[];
  sinResolver: string[];
  nuevos: string[];
}

export type Auditar = (html: string) => Promise<ResultadoAuditoria>;

const clave = (regla: string, selector: string) => `${regla}|${selector}`;

function claves(r: ResultadoAuditoria): Set<string> {
  return new Set(r.problemas.flatMap((p) => p.nodos.map((n) => clave(p.regla, n.selector))));
}

function nodosDe(r: ResultadoAuditoria, regla: string): number {
  return r.problemas.find((p) => p.regla === regla)?.nodos.length ?? 0;
}

// Reemplaza la primera aparición exacta del fragmento; null si no está (no se puede aplicar).
export function aplicarCorreccion(
  html: string,
  original: string,
  corregido: string,
): string | null {
  const i = html.indexOf(original);
  return i === -1 ? null : html.slice(0, i) + corregido + html.slice(i + original.length);
}

export function compararAuditorias(
  antes: ResultadoAuditoria,
  despues: ResultadoAuditoria,
): Comparacion {
  const a = claves(antes);
  const d = claves(despues);
  return {
    resueltos: [...a].filter((k) => !d.has(k)),
    sinResolver: [...a].filter((k) => d.has(k)),
    nuevos: [...d].filter((k) => !a.has(k)),
  };
}
