// El HTML del usuario se audita dentro de un iframe sandbox="allow-scripts" (origen opaco). Aquí
// se prepara ese documento con dos defensas independientes:
// 1. sanear(): quita todo lo que podría ejecutar código, navegar o pisar nuestra CSP.
// 2. CSP por nonce: solo corren axe y el corredor; estilos, fuentes e imágenes pueden venir de
//    https (para que el contraste se calcule con los estilos reales de la página).
// Ver docs/decisiones/0006 y 0009.

export const CSP_AISLADA = (nonce: string) =>
  [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    "style-src https: 'unsafe-inline'",
    'font-src https: data:',
    'img-src https: data:',
    'media-src https: data:',
  ].join('; ');

const ELEMENTOS_PELIGROSOS =
  'script, noscript, iframe, frame, frameset, object, embed, applet, base, meta[http-equiv]';
const ATRIBUTOS_URL = ['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster'];

function esJavascript(valor: string): boolean {
  // Los navegadores ignoran espacios y caracteres de control antes del esquema.
  return /^javascript:/i.test(valor.replace(/[\u0000- ]/g, ''));
}

export function esFragmento(html: string): boolean {
  return !/<html[\s>]/i.test(html);
}

function atributoPeligroso(atributo: Attr): boolean {
  const nombre = atributo.name.toLowerCase();
  return (
    nombre.startsWith('on') ||
    nombre === 'srcdoc' ||
    (ATRIBUTOS_URL.includes(nombre) && esJavascript(atributo.value))
  );
}

function sanearUnaVez(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(ELEMENTOS_PELIGROSOS).forEach((el) => el.remove());
  for (const el of doc.querySelectorAll('*')) {
    for (const atributo of [...el.attributes]) {
      if (atributoPeligroso(atributo)) el.removeAttribute(atributo.name);
    }
  }
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

const MAX_PASADAS = 5;

// Mutation XSS: serializar y volver a parsear puede convertir texto en elementos (trucos con
// MathML/SVG y <style>). Se sanea hasta que el resultado deja de cambiar; así lo que parsea el
// iframe es exactamente lo que se revisó.
export function sanear(html: string): string {
  let actual = html;
  for (let i = 0; i < MAX_PASADAS; i++) {
    const siguiente = sanearUnaVez(actual);
    if (siguiente === actual) return actual;
    actual = siguiente;
  }
  throw new Error('El HTML no se pudo aislar de forma segura.');
}

// Revisa el documento final tal como lo parseará el iframe: solo nuestra CSP y nuestro <base>,
// solo nuestros dos scripts y ningún atributo peligroso.
function esSeguro(final: string, opciones: OpcionesAislado): boolean {
  const doc = new DOMParser().parseFromString(final, 'text/html');
  const metas = [...doc.querySelectorAll('meta[http-equiv]')];
  const bases = [...doc.querySelectorAll('base')];
  const scripts = [...doc.querySelectorAll('script')];
  return (
    metas.length === 1 &&
    metas[0].getAttribute('content') === CSP_AISLADA(opciones.nonce) &&
    bases.length === (opciones.baseHref ? 1 : 0) &&
    scripts.length === 2 &&
    scripts.every((sc) => sc.getAttribute('nonce') === opciones.nonce) &&
    !doc.querySelector('noscript, iframe, frame, frameset, object, embed, applet') &&
    ![...doc.querySelectorAll('*')].some((el) => [...el.attributes].some(atributoPeligroso))
  );
}

export interface OpcionesAislado {
  nonce: string;
  sesion: string; // token que el corredor incluye en cada mensaje (docs/lente.md)
  urlAxe: string; // URL absoluta: con <base>, una relativa apuntaría a la página auditada
  urlCorredor: string;
  baseHref?: string; // URL original de una página descargada, para sus rutas relativas
}

export function documentoAislado(html: string, opciones: OpcionesAislado): string {
  const fragmento = esFragmento(html);
  const doc = new DOMParser().parseFromString(sanear(html), 'text/html');

  const csp = doc.createElement('meta');
  csp.setAttribute('http-equiv', 'Content-Security-Policy');
  csp.setAttribute('content', CSP_AISLADA(opciones.nonce));
  const extras: Element[] = [csp];
  if (opciones.baseHref) {
    const base = doc.createElement('base');
    base.setAttribute('href', opciones.baseHref);
    extras.push(base);
  }
  doc.head.prepend(...extras);

  for (const [src, esCorredor] of [
    [opciones.urlAxe, false],
    [opciones.urlCorredor, true],
  ] as const) {
    const script = doc.createElement('script');
    script.setAttribute('src', src);
    script.setAttribute('nonce', opciones.nonce);
    if (esCorredor) {
      script.dataset['fragmento'] = fragmento ? 'si' : 'no';
      script.dataset['sesion'] = opciones.sesion;
    }
    doc.body.append(script);
  }
  const final = `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
  if (!esSeguro(final, opciones)) throw new Error('El HTML no se pudo aislar de forma segura.');
  return final;
}
