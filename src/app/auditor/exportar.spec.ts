import { Problema } from './modelo';
import { ESTADO_CORRECCION, nombreArchivo, reporteMarkdown } from './exportar';

const problema: Problema = {
  regla: 'image-alt',
  gravedad: 'critico',
  descripcion: 'Las imágenes deben tener texto alternativo.',
  ayudaUrl: 'https://dequeuniversity.com/rules/axe/image-alt',
  criterios: [{ id: '1.1.1', nombre: 'Contenido no textual', nivel: 'A' }],
  nodos: [{ selector: 'main > img', html: '<img src="a.png">' }],
};

describe('reporteMarkdown', () => {
  const md = reporteMarkdown({
    pagina: 'https://ejemplo.org/',
    fecha: '2026-10-17T10:00:00Z',
    puntaje: 85,
    problemas: [problema],
    correcciones: [
      {
        regla: 'image-alt',
        selector: 'main > img',
        explicacion: 'Quien usa lector de pantalla no sabe qué muestra.',
        original: '<img src="a.png">',
        corregido: '<img src="a.png" alt="Logo">',
        estado: 'resuelto',
        nuevos: [],
      },
    ],
    documento: { puntajeAntes: 85, puntajeDespues: 100, resueltos: 1, sinResolver: 0, nuevos: 0 },
  });

  it('incluye página, puntaje y fórmula', () => {
    expect(md).toContain('# Reporte de accesibilidad');
    expect(md).toContain('https://ejemplo.org/');
    expect(md).toContain('**Puntaje:** 85 / 100');
  });
  it('agrupa por gravedad con criterio, ubicación y fragmento', () => {
    expect(md).toContain('## Crítico (1)');
    expect(md).toContain('1.1.1 Contenido no textual (A)');
    expect(md).toContain('`main > img`');
    expect(md).toContain('<img src="a.png">');
  });
  it('incluye la explicación y el resultado de la verificación', () => {
    expect(md).toContain('Quien usa lector de pantalla no sabe qué muestra.');
    expect(md).toContain('Resuelto');
    expect(md).toContain('85 → 100');
  });
  it('sin problemas lo dice', () => {
    expect(
      reporteMarkdown({ pagina: 'x', fecha: '2026-10-17T10:00:00Z', puntaje: 100, problemas: [] }),
    ).toContain('axe no encontró problemas');
  });
});

describe('nombreArchivo', () => {
  it('convierte la página en un nombre de archivo', () => {
    expect(nombreArchivo('https://ejemplo.org/contacto?x=1', 'md')).toBe(
      'a11lens-ejemplo-org-contacto-x-1.md',
    );
    expect(nombreArchivo('  ', 'html')).toBe('a11lens-pagina.html');
  });

  it('cada estado de corrección tiene su texto, incluido sin respuesta de la IA', () => {
    expect(ESTADO_CORRECCION['sin-respuesta']).toBe('La IA no devolvió una corrección válida');
  });
});
