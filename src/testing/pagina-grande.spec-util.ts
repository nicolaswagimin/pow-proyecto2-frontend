import { Gravedad, Problema, ResultadoAuditoria } from '../app/auditor/modelo';
import type { FragmentoParaIA } from '../app/auditor/lotes';
import type { RespuestaFragmentos } from '../app/services/ia.service';

// Una página grande de ejemplo y dobles de axe y de la IA para probar la corrección por fragmentos
// de punta a punta sin navegador ni Gemini.

// Una tienda con `productos` artículos: pesa más de 300 KB con 400 y tiene problemas de tres
// reglas (imágenes sin alt, botones sin nombre y texto gris de bajo contraste).
export function paginaGrande(productos = 400): string {
  const articulos = Array.from({ length: productos }, (_, i) => {
    const imagen =
      i % 6 === 0
        ? `<img src="/fotos/${i}.jpg">`
        : `<img src="/fotos/${i}.jpg" alt="Producto ${i}">`;
    const boton =
      i % 8 === 0
        ? '<button class="comprar"></button>'
        : '<button class="comprar">Comprar</button>';
    const precio = i % 10 === 0 ? `<p style="color:#aaa">Precio ${i}</p>` : `<p>Precio ${i}</p>`;
    return (
      `    <article class="producto" id="p${i}">\n` +
      `      <h2>Producto número ${i}</h2>\n` +
      `      ${imagen}\n` +
      `      <p>${'Una descripción larga del producto para que la página pese como una real. '.repeat(8)}</p>\n` +
      `      ${precio}\n` +
      `      ${boton}\n` +
      `    </article>`
    );
  });
  return [
    '<!DOCTYPE html>',
    '<html lang="es">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <title>Tienda de ejemplo</title>',
    '  <script src="/analitica.js"></script>',
    '</head>',
    '<body>',
    '  <header><a href="/"><img src="/logo.png"></a></header>',
    '  <main>',
    ...articulos,
    '  </main>',
    '</body>',
    '</html>',
  ].join('\n');
}

// Lo que el saneador quita (y el corredor no cuenta): igual que en fragmentos.ts.
const QUITADOS =
  'script, noscript, iframe, frame, frameset, object, embed, applet, base, meta[http-equiv]';

function cuenta(el: Element): boolean {
  return !el.matches(QUITADOS);
}

function rutaDe(el: Element): number[] {
  const ruta: number[] = [];
  for (let actual = el; actual.parentElement; actual = actual.parentElement) {
    const hermanos = [...actual.parentElement.children].filter(cuenta);
    ruta.unshift(hermanos.indexOf(actual));
  }
  return ruta;
}

// La huella como la calcula el corredor sobre el documento saneado (sin on*, srcdoc ni data-a11lens).
function huellaDe(el: Element): string {
  const atributos = [...el.attributes]
    .filter(
      (a) => !a.name.startsWith('on') && a.name !== 'srcdoc' && !a.name.startsWith('data-a11lens'),
    )
    .map((a) => `${a.name}=${a.value.slice(0, 100)}`)
    .sort();
  const hijos = (e: Element | null) => (e ? [...e.children].filter(cuenta).length : -1);
  return `${atributos.join('\n')}|${hijos(el)}|${hijos(el.parentElement)}`;
}

function selectorDe(el: Element): string {
  const partes: string[] = [];
  for (let actual: Element | null = el; actual; actual = actual.parentElement) {
    const i = actual.parentElement ? [...actual.parentElement.children].indexOf(actual) + 1 : 1;
    partes.unshift(`${actual.localName}:nth-child(${i})`);
  }
  return partes.join(' > ');
}

const REGLAS: {
  regla: string;
  gravedad: Gravedad;
  descripcion: string;
  falla: (el: Element) => boolean;
}[] = [
  {
    regla: 'image-alt',
    gravedad: 'critico',
    descripcion: 'Las imágenes deben tener texto alternativo.',
    falla: (el) => el.localName === 'img' && !el.hasAttribute('alt'),
  },
  {
    regla: 'button-name',
    gravedad: 'critico',
    descripcion: 'Los botones deben tener un nombre que se pueda leer.',
    falla: (el) =>
      el.localName === 'button' && !el.textContent?.trim() && !el.hasAttribute('aria-label'),
  },
  {
    regla: 'color-contrast',
    gravedad: 'serio',
    descripcion: 'El texto debe tener suficiente contraste con su fondo.',
    falla: (el) => (el.getAttribute('style') ?? '').includes('color:#aaa'),
  },
];

// Un axe de juguete: las tres reglas de arriba, con la ruta y el selector de cada elemento.
export function auditorFalso(html: string): ResultadoAuditoria {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const elementos = [...doc.querySelectorAll('*')].filter((el) => !el.closest(QUITADOS));
  const problemas: Problema[] = REGLAS.flatMap(({ regla, gravedad, descripcion, falla }) => {
    const nodos = elementos.filter(falla).map((el) => ({
      selector: selectorDe(el),
      html: el.outerHTML.slice(0, 300),
      ruta: rutaDe(el),
      etiqueta: el.localName,
      huella: huellaDe(el),
      resumen: regla === 'color-contrast' ? 'Element has insufficient color contrast of 2.32' : '',
    }));
    return nodos.length
      ? [{ regla, gravedad, descripcion, ayudaUrl: '', criterios: [], nodos }]
      : [];
  });
  return { problemas, reglasAprobadas: 20, fecha: '' };
}

// Una IA de juguete que corrige bien las tres reglas con cambios mínimos.
export function corregirFalso(fragmentos: FragmentoParaIA[]): RespuestaFragmentos {
  const arreglos: Record<string, (html: string) => string> = {
    'image-alt': (h) => h.replace('<img', '<img alt="Producto"'),
    'button-name': (h) => h.replace('<button', '<button aria-label="Comprar"'),
    'color-contrast': (h) => h.replace('color:#aaa', 'color:#595959'),
  };
  return {
    fragmentos: fragmentos.map((f) => ({
      id: f.id,
      explicacion: `Explicación de ${f.regla}.`,
      corregido: arreglos[f.regla]?.(f.html) ?? `${f.html} `,
      desdeCache: false,
    })),
    sinRespuesta: [],
  };
}
