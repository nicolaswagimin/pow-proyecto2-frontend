// Inspección de accesibilidad de un elemento, leída del DOM real (no de datos escritos a mano).
// Es una versión reducida de lo que hace el producto: nombre accesible, rol, estados, descripción,
// contraste del texto y tamaño del objetivo táctil.

export interface Inspeccion {
  etiqueta: string; // <input type="email">
  nombre: string; // nombre accesible
  rol: string; // en palabras: "campo de texto", "botón"…
  estados: string[]; // "obligatorio", "inválido"…
  descripcion: string; // texto enlazado con aria-describedby
  autocomplete: string | null;
  contraste: { ratio: number; nivel: 'AAA' | 'AA' | 'No cumple' } | null;
  objetivo: { ancho: number; alto: number; cumple: boolean };
  frase: string; // lo que diría un lector de pantalla
}

const TEXTO_SIN_ESPACIOS = (texto: string | null | undefined) =>
  (texto ?? '').replace(/\s+/g, ' ').trim();

function textoDeIds(ids: string | null): string {
  if (!ids) return '';
  return ids
    .split(/\s+/)
    .map((id) => TEXTO_SIN_ESPACIOS(document.getElementById(id)?.textContent))
    .filter(Boolean)
    .join(' ');
}

// Cálculo simplificado del nombre accesible (orden de accname): aria-labelledby, aria-label,
// <label for>, title y, para botones y enlaces, su texto.
export function nombreAccesible(el: HTMLElement): string {
  const porIds = textoDeIds(el.getAttribute('aria-labelledby'));
  if (porIds) return porIds;
  const aria = TEXTO_SIN_ESPACIOS(el.getAttribute('aria-label'));
  if (aria) return aria;
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (label) return TEXTO_SIN_ESPACIOS(label.textContent);
  }
  const envolvente = el.closest('label');
  if (envolvente) return TEXTO_SIN_ESPACIOS(envolvente.textContent);
  const titulo = TEXTO_SIN_ESPACIOS(el.getAttribute('title'));
  if (titulo) return titulo;
  if (el.matches('button, a, [role="button"], [role="link"], [role="switch"], h1, h2, h3')) {
    return TEXTO_SIN_ESPACIOS(el.textContent);
  }
  return '';
}

export function rolDe(el: HTMLElement): string {
  const explicito = el.getAttribute('role');
  const nombres: Record<string, string> = {
    switch: 'interruptor',
    button: 'botón',
    link: 'enlace',
    textbox: 'campo de texto',
    heading: 'encabezado',
  };
  if (explicito && nombres[explicito]) return nombres[explicito];
  const etiqueta = el.tagName.toLowerCase();
  if (etiqueta === 'input') {
    const tipo = (el as HTMLInputElement).type;
    if (tipo === 'password') return 'campo de contraseña';
    if (tipo === 'checkbox') return 'casilla';
    if (tipo === 'email') return 'campo de texto (correo)';
    return 'campo de texto';
  }
  if (etiqueta === 'textarea') return 'campo de texto de varias líneas';
  if (etiqueta === 'button') return 'botón';
  if (etiqueta === 'a' && el.hasAttribute('href')) return 'enlace';
  if (/^h[1-6]$/.test(etiqueta)) return `encabezado de nivel ${etiqueta[1]}`;
  return explicito ?? etiqueta;
}

export function estadosDe(el: HTMLElement): string[] {
  const estados: string[] = [];
  const control = el as HTMLInputElement;
  if (el.getAttribute('aria-required') === 'true' || control.required) estados.push('obligatorio');
  if (el.getAttribute('aria-invalid') === 'true') estados.push('inválido');
  if (control.disabled || el.getAttribute('aria-disabled') === 'true')
    estados.push('no disponible');
  if (el.getAttribute('aria-busy') === 'true') estados.push('ocupado');
  const presionado = el.getAttribute('aria-pressed');
  if (presionado) estados.push(presionado === 'true' ? 'presionado' : 'no presionado');
  const marcado = el.getAttribute('aria-checked');
  if (marcado) estados.push(marcado === 'true' ? 'activado' : 'desactivado');
  return estados;
}

// Etiqueta corta del elemento, como la escribiría un auditor: <input type="email">.
export function etiquetaDe(el: HTMLElement): string {
  const etiqueta = el.tagName.toLowerCase();
  const tipo = el.getAttribute('type');
  const rol = el.getAttribute('role');
  return `<${etiqueta}${tipo ? ` type="${tipo}"` : ''}${rol ? ` role="${rol}"` : ''}>`;
}

// ---------- Contraste ----------

type Rgba = [number, number, number, number];

// Acepta rgb()/rgba() y color(srgb …), que es lo que devuelve el navegador para color-mix().
function leerColor(valor: string): Rgba | null {
  const rgb = valor.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const [r, g, b, a = '1'] = rgb[1].split(/[\s,/]+/).filter(Boolean);
    return [+r, +g, +b, +a];
  }
  const srgb = valor.match(/color\(srgb ([^)]+)\)/);
  if (srgb) {
    const [r, g, b, a = '1'] = srgb[1].split(/[\s/]+/).filter(Boolean);
    return [+r * 255, +g * 255, +b * 255, +a];
  }
  return null;
}

function mezclar(arriba: Rgba, abajo: Rgba): Rgba {
  const a = arriba[3];
  return [
    arriba[0] * a + abajo[0] * (1 - a),
    arriba[1] * a + abajo[1] * (1 - a),
    arriba[2] * a + abajo[2] * (1 - a),
    1,
  ];
}

// Fondo real detrás del elemento: se suben los ancestros mezclando los fondos semitransparentes.
function fondoDe(el: Element | null): Rgba {
  const capas: Rgba[] = [];
  for (let actual = el; actual; actual = actual.parentElement) {
    const color = leerColor(getComputedStyle(actual).backgroundColor);
    if (color && color[3] > 0) {
      capas.push(color);
      if (color[3] >= 1) break;
    }
  }
  return capas.reduceRight<Rgba>((abajo, arriba) => mezclar(arriba, abajo), [255, 255, 255, 1]);
}

function luminancia([r, g, b]: Rgba): number {
  const canal = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

export function contrasteDe(el: HTMLElement): Inspeccion['contraste'] {
  const estilo = getComputedStyle(el);
  const texto = leerColor(estilo.color);
  if (!texto) return null;
  const fondo = fondoDe(el);
  const [a, b] = [luminancia(mezclar(texto, fondo)), luminancia(fondo)].sort((x, y) => y - x);
  const ratio = (a + 0.05) / (b + 0.05);
  const tamano = parseFloat(estilo.fontSize);
  const grande = tamano >= 24 || (tamano >= 18.66 && +estilo.fontWeight >= 700);
  const nivel =
    ratio >= (grande ? 4.5 : 7) ? 'AAA' : ratio >= (grande ? 3 : 4.5) ? 'AA' : 'No cumple';
  return { ratio: Math.round(ratio * 10) / 10, nivel };
}

// ---------- Todo junto ----------

export function inspeccionar(el: HTMLElement): Inspeccion {
  const nombre = nombreAccesible(el);
  const rol = rolDe(el);
  const estados = estadosDe(el);
  const descripcion = textoDeIds(el.getAttribute('aria-describedby'));
  const caja = el.getBoundingClientRect();
  const valor =
    el instanceof HTMLInputElement && el.type !== 'password' && el.value
      ? el.value
      : el instanceof HTMLInputElement && el.type === 'password' && el.value
        ? `${el.value.length} caracteres`
        : '';
  const frase = [nombre || 'sin nombre', rol, ...estados, valor, descripcion]
    .filter(Boolean)
    .join(', ');
  return {
    etiqueta: etiquetaDe(el),
    nombre,
    rol,
    estados,
    descripcion,
    autocomplete: el.getAttribute('autocomplete'),
    contraste: contrasteDe(el),
    objetivo: {
      ancho: Math.round(caja.width),
      alto: Math.round(caja.height),
      cumple: caja.width >= 24 && caja.height >= 24,
    },
    frase,
  };
}

// Resumen del ámbito cuando nada tiene el foco.
export function resumir(ambito: HTMLElement): string[] {
  const controles = Array.from(
    ambito.querySelectorAll<HTMLElement>('input, textarea, select, button, a[href]'),
  ).filter((el) => !el.closest('[aria-hidden="true"]'));
  const sinNombre = controles.filter((el) => !nombreAccesible(el)).length;
  const titulos = ambito.querySelectorAll('h1, h2, h3').length;
  const campos = controles.filter((el) => el.matches('input, textarea, select')).length;
  return [
    `Idioma de la página: ${document.documentElement.lang || 'sin declarar'}.`,
    `${titulos} ${titulos === 1 ? 'título' : 'títulos'} y ${campos} ${campos === 1 ? 'campo' : 'campos'}.`,
    sinNombre
      ? `${sinNombre} de ${controles.length} controles no tienen nombre accesible.`
      : `Los ${controles.length} controles tienen nombre accesible.`,
  ];
}
