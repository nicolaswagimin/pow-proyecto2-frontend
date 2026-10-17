import type { DefaultTreeAdapterTypes as T } from 'parse5';

// Ubicar en el texto del HTML original los elementos con problemas, para corregirlos con la IA
// por fragmentos (docs/decisiones/0010). El corredor manda la ruta del elemento en el DOM del
// iframe; aquí se recorre la misma ruta en un árbol de parse5 con posiciones de origen.
//
// El iframe parsea el HTML ya saneado, así que la ruta no cuenta lo que quita sanear() (aislar.ts)
// ni lo que agrega a11Lens (el corredor salta sus propios nodos). parse5 sigue el estándar de
// parseo de HTML, como el navegador; con scriptingEnabled: false, igual que DOMParser.

export interface Rango {
  inicio: number;
  fin: number;
}

export interface ElementoFuente {
  etiqueta: string;
  elemento: Rango; // de la apertura al cierre (o hasta donde el parser lo cerró)
  apertura: Rango; // solo la etiqueta de apertura
}

export interface Fragmento extends Rango {
  tipo: 'elemento' | 'apertura';
  texto: string;
}

export interface FuenteHtml {
  readonly html: string;
  readonly idioma: string;
  readonly titulo: string;
  ubicar(
    ruta: number[] | null | undefined,
    etiqueta: string | undefined,
    huella?: string,
  ): ElementoFuente | null;
  aperturaPadre(ruta: number[]): string;
  huella(ruta: number[]): string | null;
  head(): ElementoFuente | null;
}

// Lo mismo que quita sanear(): esos elementos (y lo que tienen dentro) no existen en el iframe.
const QUITADOS = new Set([
  'script',
  'noscript',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'base',
]);

// Un fragmento completo como mucho de este tamaño; si no, va solo la etiqueta de apertura.
export const MAX_ELEMENTO = 1500;
const MAX_PADRE = 300;
const SOLO_APERTURA = new Set(['html', 'head', 'body']);

function esElemento(n: T.ChildNode): n is T.Element {
  return 'tagName' in n;
}

const ATRIBUTOS_URL = ['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster'];

function quitado(el: T.Element): boolean {
  return (
    QUITADOS.has(el.tagName) ||
    (el.tagName === 'meta' && el.attrs.some((a) => a.name === 'http-equiv')) ||
    // El corredor no cuenta nada con data-a11lens (lo trata como suyo).
    el.attrs.some((a) => a.name === 'data-a11lens')
  );
}

// Los atributos que sanear() quita (aislar.ts): no están en el iframe, no van en la huella.
function atributoQuitado(nombre: string, valor: string): boolean {
  return (
    nombre.startsWith('on') ||
    nombre === 'srcdoc' ||
    nombre.startsWith('data-a11lens') ||
    (ATRIBUTOS_URL.includes(nombre) && /^javascript:/i.test(valor.replace(/[\u0000- ]/g, '')))
  );
}

// La misma huella que calcula el corredor (corredor.js, huellaDe): si no coincide, la ruta llegó a
// otro elemento (el árbol del iframe no es igual al del original, por ejemplo en modo quirks).
function huellaDe(el: T.Element, padre: T.Element | null): string {
  const atributos = el.attrs
    .filter((a) => !atributoQuitado(a.name, a.value))
    .map((a) => `${a.prefix ? `${a.prefix}:` : ''}${a.name}=${a.value.slice(0, 100)}`)
    .sort();
  return `${atributos.join('\n')}|${hijos(el).length}|${padre ? hijos(padre).length : -1}`;
}

function hijos(el: T.Element): T.Element[] {
  return el.childNodes.filter(esElemento).filter((h) => !quitado(h));
}

function textoDe(n: T.ParentNode): string {
  return n.childNodes
    .map((h) =>
      'value' in h && h.nodeName === '#text' ? h.value : esElemento(h) ? textoDe(h) : '',
    )
    .join('');
}

function aFuente(el: T.Element): ElementoFuente | null {
  const loc = el.sourceCodeLocation;
  if (!loc?.startTag) return null; // implícito: no está escrito en el HTML
  return {
    etiqueta: el.tagName,
    elemento: { inicio: loc.startOffset, fin: loc.endOffset },
    apertura: { inicio: loc.startTag.startOffset, fin: loc.startTag.endOffset },
  };
}

function buscar(raiz: T.Element, ruta: number[]): T.Element | null {
  let actual: T.Element | undefined = raiz;
  for (const i of ruta) {
    actual = actual && hijos(actual)[i];
    if (!actual) return null;
  }
  return actual;
}

let parse5: Promise<typeof import('parse5')> | null = null;

// parse5 se carga solo al corregir con IA (chunk aparte).
export async function analizarFuente(html: string): Promise<FuenteHtml> {
  parse5 ??= import('parse5');
  const { parse } = await parse5;
  const documento = parse(html, { sourceCodeLocationInfo: true, scriptingEnabled: false });
  const raiz = documento.childNodes.find(
    (n): n is T.Element => esElemento(n) && n.tagName === 'html',
  )!;
  const head = hijos(raiz).find((h) => h.tagName === 'head');
  const titulo = head && hijos(head).find((h) => h.tagName === 'title');

  return {
    html,
    idioma: raiz.attrs.find((a) => a.name === 'lang')?.value.trim() ?? '',
    titulo: titulo ? textoDe(titulo).replace(/\s+/g, ' ').trim() : '',
    ubicar(ruta, etiqueta, huella) {
      if (!ruta) return null;
      const el = buscar(raiz, ruta);
      if (!el || el.tagName !== etiqueta) return null;
      if (
        huella !== undefined &&
        huella !== huellaDe(el, ruta.length ? buscar(raiz, ruta.slice(0, -1)) : null)
      ) {
        return null;
      }
      return aFuente(el);
    },
    huella(ruta) {
      const el = buscar(raiz, ruta);
      return el ? huellaDe(el, ruta.length ? buscar(raiz, ruta.slice(0, -1)) : null) : null;
    },
    aperturaPadre(ruta) {
      const padre = ruta.length ? buscar(raiz, ruta.slice(0, -1)) : null;
      const apertura = padre && aFuente(padre)?.apertura;
      return apertura ? html.slice(apertura.inicio, apertura.fin).slice(0, MAX_PADRE) : '';
    },
    head: () => (head ? aFuente(head) : null),
  };
}

const contiene = (afuera: Rango, adentro: Rango) =>
  adentro.inicio >= afuera.inicio &&
  adentro.fin <= afuera.fin &&
  (adentro.inicio !== afuera.inicio || adentro.fin !== afuera.fin);

// Qué se manda a la IA de un elemento: completo si es corto y no contiene a otro elemento con
// problemas; si no, solo su apertura (así dos fragmentos nunca se pisan). Para document-title, la
// apertura del <head>, porque la corrección agrega el <title> justo después.
export function elegirFragmento(
  fuente: FuenteHtml,
  regla: string,
  el: ElementoFuente | null,
  otros: Rango[],
): Fragmento | null {
  if (regla === 'document-title') {
    const head = fuente.head();
    return head ? fragmento(fuente, head.apertura, 'apertura') : null;
  }
  if (!el) return null;
  const completo =
    !SOLO_APERTURA.has(el.etiqueta) &&
    el.elemento.fin - el.elemento.inicio <= MAX_ELEMENTO &&
    !otros.some((o) => contiene(el.elemento, o));
  return completo
    ? fragmento(fuente, el.elemento, 'elemento')
    : fragmento(fuente, el.apertura, 'apertura');
}

function fragmento(fuente: FuenteHtml, r: Rango, tipo: Fragmento['tipo']): Fragmento {
  return { ...r, tipo, texto: fuente.html.slice(r.inicio, r.fin) };
}
