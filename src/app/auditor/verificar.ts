import { CorreccionProblema } from '../services/ia.service';
import { Rango } from './fragmentos';
import { ResultadoAuditoria } from './modelo';
import { calcularPuntaje } from './puntaje';
import { aplicarReemplazos } from './reemplazos';

// Verificación de las correcciones: se aplican y se vuelve a auditar con axe. Una corrección que
// no resuelve su problema nunca se presenta como solución (docs/decisiones/0007).

export type EstadoCorreccion =
  | 'resuelto'
  | 'no-resolvio'
  | 'introdujo-problemas'
  | 'quita-elemento'
  | 'no-aplicable'
  | 'sin-respuesta';

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

function oculto(el: Element): boolean {
  const estilo = (el.getAttribute('style') ?? '').replace(/\s+/g, '').toLowerCase();
  return (
    el.hasAttribute('hidden') ||
    el.getAttribute('aria-hidden') === 'true' ||
    /display:none|visibility:hidden|visibility:collapse|opacity:0(?![.\d])/.test(estilo)
  );
}

function ocultoEnFragmento(el: Element | null): boolean {
  for (let actual = el; actual; actual = actual.parentElement) if (oculto(actual)) return true;
  return false;
}

function primerElemento(html: string, etiqueta?: string): Element | null {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = html;
  return plantilla.content.querySelector(etiqueta ?? '*');
}

// axe deja de ver un problema si el elemento desaparece o se oculta: eso no es corregirlo. Se
// busca en la corrección el mismo tipo de elemento que el original y se revisa que no quede
// oculto (si el original ya lo estaba, no cuenta).
export function quitaUOculta(original: string, corregido: string): boolean {
  const antes = primerElemento(original);
  if (!antes) return false;
  const despues = primerElemento(corregido, antes.tagName.toLowerCase());
  if (!despues) return true;
  return ocultoEnFragmento(despues) && !ocultoEnFragmento(antes);
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
  if (quitaUOculta(correccion.original, correccion.corregido))
    return { ...correccion, estado: 'quita-elemento', nuevos: [] };

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

// ---------- Verificación por lote (corrección por fragmentos) ----------

// Una corrección de la IA con el rango de su fragmento en el documento base.
export interface Candidata extends CorreccionProblema, Rango {}

// El documento sobre el que se corrige y su auditoría.
export interface Base {
  html: string;
  auditoria: ResultadoAuditoria;
}

function estadoAislado(
  base: ResultadoAuditoria,
  despues: ResultadoAuditoria,
  c: Candidata,
): { estado: EstadoCorreccion; nuevos: string[] } {
  const { nuevos } = compararAuditorias(base, despues);
  const sigue =
    claves(despues).has(clave(c.regla, c.selector)) ||
    nodosDe(despues, c.regla) >= nodosDe(base, c.regla);
  return {
    estado: sigue ? 'no-resolvio' : nuevos.length ? 'introdujo-problemas' : 'resuelto',
    nuevos,
  };
}

// Verifica un lote con la menor cantidad de auditorías: se aplican todas juntas y se audita una
// vez. Una corrección queda resuelta si su regla+selector desaparece y la regla bajó al menos en
// tantos elementos como correcciones suyas desaparecieron. Si aparecen problemas nuevos, se audita
// cada una por separado para saber cuál los causó. La base nueva solo incorpora las resueltas.
export async function verificarLote(
  base: Base,
  candidatas: Candidata[],
  auditar: Auditar,
): Promise<{ verificadas: CorreccionVerificada[]; base: Base }> {
  const estados = new Map<Candidata, { estado: EstadoCorreccion; nuevos: string[] }>();
  const aplicables = candidatas.filter((c) => {
    if (!quitaUOculta(c.original, c.corregido)) return true;
    estados.set(c, { estado: 'quita-elemento', nuevos: [] });
    return false;
  });
  const auditadas = new Map<string, ResultadoAuditoria>();
  const auditarUna = async (html: string) => {
    if (!auditadas.has(html)) auditadas.set(html, await auditar(html));
    return auditadas.get(html)!;
  };
  const aplicar = (cs: Candidata[]) =>
    aplicarReemplazos(
      base.html,
      cs.map((c) => ({ inicio: c.inicio, fin: c.fin, texto: c.corregido })),
    );

  if (aplicables.length) {
    const todas = await auditarUna(aplicar(aplicables));
    const presentes = claves(todas);
    if (compararAuditorias(base.auditoria, todas).nuevos.length === 0) {
      const desaparecidas = aplicables.filter((c) => !presentes.has(clave(c.regla, c.selector)));
      for (const c of aplicables) {
        const deSuRegla = desaparecidas.filter((d) => d.regla === c.regla).length;
        const bajo = nodosDe(base.auditoria, c.regla) - nodosDe(todas, c.regla);
        const resuelto = desaparecidas.includes(c) && bajo >= deSuRegla;
        estados.set(c, { estado: resuelto ? 'resuelto' : 'no-resolvio', nuevos: [] });
      }
    } else {
      for (const c of aplicables) {
        estados.set(c, estadoAislado(base.auditoria, await auditarUna(aplicar([c])), c));
      }
    }
  }

  const resueltas = aplicables.filter((c) => estados.get(c)!.estado === 'resuelto');
  let nueva = base;
  if (resueltas.length) {
    const html = aplicar(resueltas);
    nueva = { html, auditoria: await auditarUna(html) };
  }
  return {
    verificadas: candidatas.map((c) => {
      const { inicio: _i, fin: _f, ...correccion } = c;
      return { ...correccion, ...estados.get(c)! };
    }),
    base: nueva,
  };
}
