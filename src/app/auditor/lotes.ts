import { Fragmento, FuenteHtml, Rango, elegirFragmento } from './fragmentos';
import { GRAVEDADES, Gravedad, Problema } from './modelo';

// Qué se corrige con la IA y en qué orden: los nodos con problemas, ubicados en el HTML, de mayor
// a menor gravedad, en lotes de tamaño seguro (docs/ia.md del backend).

export const LIMITES_LOTE = { maxFragmentos: 8, maxCaracteres: 12_000 };
// El servidor acepta fragmentos de hasta 4000 caracteres.
export const MAX_FRAGMENTO_IA = 4000;

export interface Pendiente {
  clave: string; // "regla|selector"
  regla: string;
  ayuda: string;
  gravedad: Gravedad;
  selector: string;
  fragmento: Fragmento;
  padre: string;
  resumen: string;
}

export interface FragmentoParaIA {
  id: string;
  regla: string;
  ayuda: string;
  html: string;
  padre: string;
  resumen: string;
}

export interface Lote {
  fragmentos: FragmentoParaIA[];
  ubicaciones: Map<string, Pendiente[]>; // id → los nodos a los que se aplica su corrección
}

export const claveDe = (regla: string, selector: string) => `${regla}|${selector}`;

// Los nodos que se pueden corregir y aún no se intentaron. noCorregibles: los que no están
// escritos en el HTML (implícitos, shadow DOM, iframes) o cuyo fragmento es demasiado largo.
export function prepararPendientes(
  fuente: FuenteHtml,
  problemas: Problema[],
  intentados: ReadonlySet<string>,
): { pendientes: Pendiente[]; noCorregibles: string[] } {
  const ordenados = [...problemas].sort(
    (a, b) => GRAVEDADES.indexOf(a.gravedad) - GRAVEDADES.indexOf(b.gravedad),
  );
  const ubicados = ordenados.flatMap((p) =>
    p.nodos.map((n) => ({ p, n, el: fuente.ubicar(n.ruta, n.etiqueta) })),
  );
  const rangos: Rango[] = ubicados.flatMap((u) => (u.el ? [u.el.elemento] : []));

  const pendientes: Pendiente[] = [];
  const noCorregibles: string[] = [];
  for (const { p, n, el } of ubicados) {
    const clave = claveDe(p.regla, n.selector);
    if (intentados.has(clave)) continue;
    const fragmento = elegirFragmento(fuente, p.regla, el, rangos);
    if (!fragmento || fragmento.texto.length > MAX_FRAGMENTO_IA) {
      noCorregibles.push(clave);
      continue;
    }
    pendientes.push({
      clave,
      regla: p.regla,
      ayuda: p.descripcion,
      gravedad: p.gravedad,
      selector: n.selector,
      fragmento,
      padre: n.ruta ? fuente.aperturaPadre(n.ruta) : '',
      resumen: n.resumen ?? '',
    });
  }
  return { pendientes, noCorregibles };
}

const seSolapan = (a: Rango, b: Rango) => a.inicio < b.fin && b.inicio < a.fin;

// El siguiente lote, en el orden de los pendientes. Los nodos idénticos (misma regla, fragmento,
// padre y detalle) van una sola vez. Uno que se solapa con otro ya elegido (dos reglas sobre el
// mismo elemento) espera al lote siguiente, que se ubica sobre el documento ya corregido.
export function armarLote(pendientes: Pendiente[], limites = LIMITES_LOTE): Lote {
  const fragmentos: FragmentoParaIA[] = [];
  const ubicaciones = new Map<string, Pendiente[]>();
  const porContenido = new Map<string, string>();
  const elegidos: Rango[] = [];
  let caracteres = 0;

  for (const p of pendientes) {
    if (elegidos.some((r) => seSolapan(r, p.fragmento))) continue;
    const contenido = JSON.stringify([p.regla, p.fragmento.texto, p.padre, p.resumen]);
    let id = porContenido.get(contenido);
    if (!id) {
      const largo = p.fragmento.texto.length + p.padre.length + p.resumen.length;
      if (fragmentos.length >= limites.maxFragmentos) break;
      if (fragmentos.length && caracteres + largo > limites.maxCaracteres) break;
      id = `f${fragmentos.length + 1}`;
      porContenido.set(contenido, id);
      caracteres += largo;
      fragmentos.push({
        id,
        regla: p.regla,
        ayuda: p.ayuda,
        html: p.fragmento.texto,
        padre: p.padre,
        resumen: p.resumen,
      });
      ubicaciones.set(id, []);
    }
    elegidos.push(p.fragmento);
    ubicaciones.get(id)!.push(p);
  }
  return { fragmentos, ubicaciones };
}
