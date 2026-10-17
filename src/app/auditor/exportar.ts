import { GRAVEDADES, NOMBRE_GRAVEDAD, Problema } from './modelo';
import { CorreccionVerificada, EstadoCorreccion } from './verificar';

// Exportación del reporte. El PDF se genera con la impresión del navegador (vista de impresión de
// /app, docs/decisiones/0008); aquí está el Markdown y la descarga de archivos.

export const ESTADO_CORRECCION: Record<EstadoCorreccion, string> = {
  resuelto: 'Resuelto (verificado con axe)',
  'no-resolvio': 'No resolvió el problema',
  'introdujo-problemas': 'Resolvió el problema pero introdujo otros',
  'no-aplicable': 'No se pudo aplicar (el fragmento no está en el HTML)',
};

export interface DatosReporte {
  pagina: string;
  fecha: string;
  puntaje: number;
  problemas: Problema[];
  correcciones?: CorreccionVerificada[];
  documento?: {
    puntajeAntes: number;
    puntajeDespues: number;
    resueltos: number;
    sinResolver: number;
    nuevos: number;
  };
}

export function reporteMarkdown(d: DatosReporte): string {
  const lineas = [
    '# Reporte de accesibilidad',
    '',
    `- **Página:** ${d.pagina}`,
    `- **Fecha:** ${new Date(d.fecha).toLocaleString('es')}`,
    `- **Puntaje:** ${d.puntaje} / 100`,
    '- **Cómo se calcula:** 100 menos, por cada regla incumplida, su gravedad (crítico 15, serio 8, moderado 4, menor 1) más 1 por cada elemento afectado después del primero (máximo 5 extra por regla).',
    '- **Herramienta:** axe-core, reglas de WCAG 2.2 niveles A y AA.',
    '',
  ];
  if (!d.problemas.length)
    lineas.push('axe no encontró problemas con las reglas de WCAG 2.2 A y AA.', '');

  const correccionDe = (regla: string, selector: string) =>
    d.correcciones?.find((c) => c.regla === regla && c.selector === selector);

  for (const gravedad of GRAVEDADES) {
    const grupo = d.problemas.filter((p) => p.gravedad === gravedad);
    if (!grupo.length) continue;
    lineas.push(`## ${NOMBRE_GRAVEDAD[gravedad]} (${grupo.length})`, '');
    for (const p of grupo) {
      lineas.push(`### ${p.descripcion}`, '');
      lineas.push(`- **Regla:** \`${p.regla}\` ([más información](${p.ayudaUrl}))`);
      if (p.criterios.length) {
        lineas.push(
          `- **Criterio WCAG:** ${p.criterios.map((c) => `${c.id} ${c.nombre} (${c.nivel})`).join(', ')}`,
        );
      }
      for (const n of p.nodos) {
        lineas.push(`- **Ubicación:** \`${n.selector}\``, '', '  ```html', `  ${n.html}`, '  ```');
        const c = correccionDe(p.regla, n.selector);
        if (c) {
          lineas.push(
            '',
            `  **Explicación:** ${c.explicacion}`,
            '',
            `  **Corrección:** ${ESTADO_CORRECCION[c.estado]}`,
          );
          if (c.estado === 'resuelto') lineas.push('', '  ```html', `  ${c.corregido}`, '  ```');
        }
      }
      lineas.push('');
    }
  }

  if (d.documento) {
    lineas.push(
      '## Documento corregido',
      '',
      `- **Puntaje:** ${d.documento.puntajeAntes} → ${d.documento.puntajeDespues}`,
      `- **Problemas resueltos:** ${d.documento.resueltos}`,
      `- **Sin resolver:** ${d.documento.sinResolver}`,
      `- **Nuevos:** ${d.documento.nuevos}`,
      '',
    );
  }
  return lineas.join('\n');
}
