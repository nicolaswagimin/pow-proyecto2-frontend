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
  nodes: { target: (string | string[])[]; html: string }[];
}

const GRAVEDAD_DE: Record<string, Gravedad> = {
  critical: 'critico',
  serious: 'serio',
  moderate: 'moderado',
  minor: 'menor',
};

const MAX_FRAGMENTO = 300;

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
      descripcion: v.help,
      ayudaUrl: v.helpUrl,
      criterios: criteriosDe(v.tags),
      nodos: v.nodes.map((n) => ({
        selector: n.target.map((t) => (Array.isArray(t) ? t.join(' >> ') : t)).join(' >> '),
        html: recortar(n.html),
      })),
    }))
    .sort((a, b) => GRAVEDADES.indexOf(a.gravedad) - GRAVEDADES.indexOf(b.gravedad));
}
