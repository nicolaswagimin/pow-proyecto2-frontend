import { ELEMENTOS_PELIGROSOS, atributoPeligroso } from './aislar';
import { Fragmento, Rango } from './fragmentos';
import { ResultadoAuditoria } from './modelo';
import { aplicarReemplazos } from './reemplazos';

// Verificación de las correcciones: se aplican y se vuelve a auditar con axe. Una corrección que
// no resuelve su problema nunca se presenta como solución (docs/decisiones/0007).

export type EstadoCorreccion =
  | 'resuelto'
  | 'no-resolvio'
  | 'introdujo-problemas'
  | 'quita-elemento'
  | 'no-aplicable'
  | 'sin-respuesta'
  | 'cambio-no-permitido';

// Lo que propone la IA para un elemento: el fragmento original y su corrección.
export interface CorreccionProblema {
  regla: string;
  selector: string;
  explicacion: string;
  original: string;
  corregido: string;
}

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

export interface VerificacionDocumento {
  auditoria: ResultadoAuditoria;
  comparacion: Comparacion;
  puntajeAntes: number;
  puntajeDespues: number;
}

// ---------- Verificación por lote (corrección por fragmentos) ----------

// Una corrección de la IA con el rango de su fragmento en el documento base.
export interface Candidata extends CorreccionProblema, Rango {
  tipo?: Fragmento['tipo'];
}

function elementosDe(html: string): Element[] {
  const plantilla = document.createElement('template');
  plantilla.innerHTML = html;
  return [...plantilla.content.querySelectorAll('*')];
}

function peligrosos(html: string): number {
  return elementosDe(html).reduce(
    (total, el) =>
      total +
      (el.matches(ELEMENTOS_PELIGROSOS) ? 1 : 0) +
      [...el.attributes].filter(atributoPeligroso).length,
    0,
  );
}

// Lo que propone la IA es dato no confiable (también llega de la caché compartida): no puede
// agregar nada que el saneador quitaría (scripts, marcos, on*, javascript:, meta refresh). El iframe
// audita la versión saneada, así que axe nunca lo vería y la corrección pasaría como verificada.
// Una corrección de apertura debe seguir siendo esa apertura, sin elementos nuevos; en
// document-title, la de <head> puede agregar solo un <title>.
export function cambioNoPermitido(
  c: Pick<Candidata, 'regla' | 'original' | 'corregido' | 'tipo'>,
): boolean {
  if (peligrosos(c.corregido) > peligrosos(c.original)) return true;
  if (c.tipo !== 'apertura') return false;
  const etiqueta = c.original.match(/^<([a-zA-Z][\w:-]*)/)?.[1].toLowerCase();
  if (!etiqueta || !new RegExp(`^<${etiqueta}(?=[\\s/>])`, 'i').test(c.corregido.trim()))
    return true;
  const elementos = elementosDe(c.corregido);
  const nuevos = elementos.filter((el, i) => i > 0 || el.localName !== etiqueta);
  if (c.regla === 'document-title') {
    return nuevos.length > 1 || nuevos.some((el) => el.localName !== 'title');
  }
  return nuevos.length > 0;
}

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
    if (cambioNoPermitido(c)) estados.set(c, { estado: 'cambio-no-permitido', nuevos: [] });
    else if (quitaUOculta(c.original, c.corregido))
      estados.set(c, { estado: 'quita-elemento', nuevos: [] });
    else return true;
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
      const { inicio: _i, fin: _f, tipo: _t, ...correccion } = c;
      return { ...correccion, ...estados.get(c)! };
    }),
    base: nueva,
  };
}
