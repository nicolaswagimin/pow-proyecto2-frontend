import { AuditoriaResumen } from '../../services/auditorias.service';

// El historial agrupado por página: así se ve cómo evoluciona el puntaje de una misma página.

export interface GrupoPagina {
  pagina: string;
  auditorias: AuditoriaResumen[]; // de la más antigua a la más reciente
  ultima: AuditoriaResumen;
  cambio: number | null; // puntaje de la última menos el de la primera
}

const tiempo = (a: AuditoriaResumen) => Date.parse(a.creado_en);

export function agruparPorPagina(lista: AuditoriaResumen[]): GrupoPagina[] {
  const grupos = new Map<string, AuditoriaResumen[]>();
  for (const a of lista) grupos.set(a.pagina, [...(grupos.get(a.pagina) ?? []), a]);
  return [...grupos.entries()]
    .map(([pagina, auditorias]) => {
      const ordenadas = [...auditorias].sort((x, y) => tiempo(x) - tiempo(y) || x.id - y.id);
      const ultima = ordenadas[ordenadas.length - 1];
      return {
        pagina,
        auditorias: ordenadas,
        ultima,
        cambio: ordenadas.length > 1 ? ultima.puntaje - ordenadas[0].puntaje : null,
      };
    })
    .sort((x, y) => tiempo(y.ultima) - tiempo(x.ultima));
}

// Puntos de la línea de evolución en un SVG de ancho × alto (puntaje 100 arriba).
export function puntosEvolucion(puntajes: number[], ancho: number, alto: number): string {
  const paso = puntajes.length > 1 ? ancho / (puntajes.length - 1) : 0;
  return puntajes
    .map((p, i) => {
      const x = puntajes.length > 1 ? i * paso : ancho / 2;
      return `${Math.round(x)},${Math.round(alto - (p / 100) * alto)}`;
    })
    .join(' ');
}
