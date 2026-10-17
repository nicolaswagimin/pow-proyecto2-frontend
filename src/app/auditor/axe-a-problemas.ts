import { CRITERIOS_WCAG } from './criterios-wcag';
import { CriterioWcag, GRAVEDADES, Gravedad, Problema } from './modelo';

// Convierte el resultado de axe-core al modelo de a11Lens: gravedad en español, descripción en
// español para las reglas más comunes, criterios WCAG con su nombre y la ubicación de cada nodo.

// Lo mínimo que se usa de una violación de axe (así no se depende de sus tipos).
export interface ViolacionAxe {
  id: string;
  impact?: string | null;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: {
    target: (string | string[])[];
    html: string;
    ruta?: number[] | null;
    etiqueta?: string;
    resumen?: string;
  }[];
}

const GRAVEDAD_DE: Record<string, Gravedad> = {
  critical: 'critico',
  serious: 'serio',
  moderate: 'moderado',
  minor: 'menor',
};

const DESCRIPCIONES: Record<string, string> = {
  'image-alt': 'Las imágenes deben tener texto alternativo.',
  'input-image-alt': 'Los botones de imagen deben tener texto alternativo.',
  'area-alt': 'Las zonas de un mapa de imagen deben tener texto alternativo.',
  'svg-img-alt': 'Los SVG con función de imagen deben tener un nombre accesible.',
  'role-img-alt': 'Los elementos con rol de imagen deben tener texto alternativo.',
  'button-name': 'Los botones deben tener un nombre que se pueda leer.',
  'link-name': 'Los enlaces deben tener un texto que diga a dónde llevan.',
  label: 'Los campos de formulario deben tener una etiqueta.',
  'select-name': 'Las listas desplegables deben tener una etiqueta.',
  'color-contrast': 'El texto debe tener suficiente contraste con su fondo.',
  'html-has-lang': 'La página debe declarar su idioma.',
  'html-lang-valid': 'El idioma declarado en la página debe ser válido.',
  'valid-lang': 'Los cambios de idioma deben usar un código válido.',
  'document-title': 'La página debe tener un título.',
  'frame-title': 'Los marcos (iframe) deben tener un título.',
  'heading-order': 'Los niveles de encabezado deben ir en orden, sin saltos.',
  'empty-heading': 'Los encabezados no deben estar vacíos.',
  'page-has-heading-one': 'La página debe tener un encabezado principal (h1).',
  'landmark-one-main': 'La página debe tener una región principal (main).',
  region: 'Todo el contenido debe estar dentro de regiones (main, nav, header…).',
  list: 'Las listas solo deben contener elementos de lista.',
  listitem: 'Los elementos de lista deben estar dentro de una lista.',
  'duplicate-id-aria': 'Los ids usados por ARIA no deben repetirse.',
  'aria-allowed-attr': 'Los atributos ARIA deben estar permitidos para ese rol.',
  'aria-required-attr': 'Los roles ARIA deben tener los atributos que requieren.',
  'aria-valid-attr': 'Los atributos ARIA deben existir.',
  'aria-valid-attr-value': 'Los atributos ARIA deben tener valores válidos.',
  'aria-roles': 'Los roles ARIA deben ser válidos.',
  'aria-hidden-focus': 'Lo oculto con aria-hidden no debe poder recibir el foco.',
  'nested-interactive': 'Los controles interactivos no deben estar anidados.',
  'meta-viewport': 'La página no debe impedir hacer zoom.',
  'link-in-text-block': 'Los enlaces dentro de un texto deben distinguirse sin depender del color.',
  'target-size': 'Los controles táctiles deben medir al menos 24 × 24 píxeles.',
  tabindex: 'No se debe usar tabindex mayor que 0.',
  'autocomplete-valid': 'El autocompletado de los campos debe ser válido.',
  'td-headers-attr': 'Las celdas de una tabla deben referirse a encabezados de esa tabla.',
  'th-has-data-cells': 'Los encabezados de una tabla deben tener celdas de datos.',
  'video-caption': 'Los videos deben tener subtítulos.',
  bypass: 'La página debe ofrecer una forma de saltar al contenido principal.',
};

const MAX_FRAGMENTO = 300;
const MAX_RESUMEN = 500;

function recortar(texto: string): string {
  return texto.length > MAX_FRAGMENTO ? `${texto.slice(0, MAX_FRAGMENTO - 1)}…` : texto;
}

// "wcag143" → 1.4.3; las etiquetas de nivel ("wcag2aa", "wcag21aa") no son criterios.
export function criteriosDe(tags: string[]): CriterioWcag[] {
  return tags.flatMap((tag) => {
    const m = tag.match(/^wcag(\d)(\d)(\d+)$/);
    if (!m) return [];
    const id = `${m[1]}.${m[2]}.${m[3]}`;
    return [CRITERIOS_WCAG.get(id) ?? { id, nombre: `Criterio ${id}`, nivel: '' }];
  });
}

export function aProblemas(violaciones: ViolacionAxe[]): Problema[] {
  return violaciones
    .map((v) => ({
      regla: v.id,
      gravedad: GRAVEDAD_DE[v.impact ?? ''] ?? 'menor',
      descripcion: DESCRIPCIONES[v.id] ?? v.help,
      ayudaUrl: v.helpUrl,
      criterios: criteriosDe(v.tags),
      nodos: v.nodes.map((n) => ({
        selector: n.target.map((t) => (Array.isArray(t) ? t.join(' >> ') : t)).join(' >> '),
        html: recortar(n.html),
        ruta: n.ruta ?? null,
        etiqueta: n.etiqueta ?? '',
        resumen: (n.resumen ?? '').slice(0, MAX_RESUMEN),
      })),
    }))
    .sort((a, b) => GRAVEDADES.indexOf(a.gravedad) - GRAVEDADES.indexOf(b.gravedad));
}

const RAICES_SPA =
  '#root, #app, #__next, #__nuxt, #svelte, app-root, [data-reactroot], [ng-version]';
const MIN_TEXTO = 80;

// ¿La página necesita JavaScript para mostrar su contenido? Body con muy poco texto y un
// contenedor raíz típico de frameworks, o casi solo scripts. a11Lens no ejecuta esos scripts, así
// que auditaría una página casi vacía: la interfaz lo avisa.
export function pareceSpa(html: string): boolean {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const scripts = doc.querySelectorAll('script').length;
  doc.querySelectorAll('script, style, noscript, template').forEach((el) => el.remove());
  const texto = (doc.body?.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (texto.length >= MIN_TEXTO) return false;
  return Boolean(doc.querySelector(RAICES_SPA)) || (scripts > 0 && texto.length < 20);
}
