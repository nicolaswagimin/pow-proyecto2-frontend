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

export function sanear(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(ELEMENTOS_PELIGROSOS).forEach((el) => el.remove());
  for (const el of doc.querySelectorAll('*')) {
    for (const atributo of [...el.attributes]) {
      const nombre = atributo.name.toLowerCase();
      const peligroso =
        nombre.startsWith('on') ||
        nombre === 'srcdoc' ||
        (ATRIBUTOS_URL.includes(nombre) && esJavascript(atributo.value));
      if (peligroso) el.removeAttribute(atributo.name);
    }
  }
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export interface OpcionesAislado {
  nonce: string;
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

  for (const [src, fragmentoAttr] of [
    [opciones.urlAxe, null],
    [opciones.urlCorredor, fragmento ? 'si' : 'no'],
  ] as const) {
    const script = doc.createElement('script');
    script.setAttribute('src', src);
    script.setAttribute('nonce', opciones.nonce);
    if (fragmentoAttr) script.dataset['fragmento'] = fragmentoAttr;
    doc.body.append(script);
  }
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}
