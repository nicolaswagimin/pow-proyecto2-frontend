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

// Resuelto solo si el par regla+selector desaparece Y la regla afecta a menos elementos que antes
// (si la corrección cambió el selector pero el problema sigue, no cuenta como resuelto).
export async function verificarPorProblema(
  htmlOriginal: string,
  auditoriaOriginal: ResultadoAuditoria,
  correccion: CorreccionProblema,
  auditar: Auditar,
): Promise<CorreccionVerificada> {
  const corregido = aplicarCorreccion(htmlOriginal, correccion.original, correccion.corregido);
  if (corregido === null) return { ...correccion, estado: 'no-aplicable', nuevos: [] };

  const despues = await auditar(corregido);
  const { nuevos } = compararAuditorias(auditoriaOriginal, despues);
  const sigue =
    claves(despues).has(clave(correccion.regla, correccion.selector)) ||
    nodosDe(despues, correccion.regla) >= nodosDe(auditoriaOriginal, correccion.regla);
  const estado: EstadoCorreccion = sigue
    ? 'no-resolvio'
    : nuevos.length
      ? 'introdujo-problemas'
      : 'resuelto';
  return { ...correccion, estado, nuevos };
}

export interface VerificacionDocumento {
  auditoria: ResultadoAuditoria;
  comparacion: Comparacion;
  puntajeAntes: number;
  puntajeDespues: number;
}

export async function verificarDocumento(
  auditoriaOriginal: ResultadoAuditoria,
  documento: string,
  auditar: Auditar,
): Promise<VerificacionDocumento> {
  const auditoria = await auditar(documento);
  return {
    auditoria,
    comparacion: compararAuditorias(auditoriaOriginal, auditoria),
    puntajeAntes: calcularPuntaje(auditoriaOriginal.problemas),
    puntajeDespues: calcularPuntaje(auditoria.problemas),
  };
}
