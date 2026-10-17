import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { MotorService } from '../../auditor/motor.service';
import { Problema, ResultadoAuditoria } from '../../auditor/modelo';
import { AuditoriasService } from '../../services/auditorias.service';
import { IaService } from '../../services/ia.service';
import { PaginasService } from '../../services/paginas.service';
import { AuditoriaEstado } from './auditoria-estado';

const imgAlt: Problema = {
  regla: 'image-alt',
  gravedad: 'critico',
  descripcion: 'Las imágenes deben tener texto alternativo.',
  ayudaUrl: '',
  criterios: [],
  nodos: [{ selector: 'img', html: '<img src="a.png">' }],
};
const conProblema: ResultadoAuditoria = { problemas: [imgAlt], reglasAprobadas: 9, fecha: '' };
const limpio: ResultadoAuditoria = { problemas: [], reglasAprobadas: 10, fecha: '' };
const HTML = '<main><img src="a.png"></main>';
const respuestaIA = {
  problemas: [
    {
      regla: 'image-alt',
      selector: 'img',
      explicacion: 'Falta el texto alternativo.',
      original: '<img src="a.png">',
      corregido: '<img src="a.png" alt="Logo">',
    },
  ],
  documento: '<main><img src="a.png" alt="Logo"></main>',
  desdeCache: false,
};

function preparar({
  auditar = async (html: string) => (html.includes('alt=') ? limpio : conProblema),
  corregir = (): Observable<typeof respuestaIA> => of(respuestaIA),
  urlFinal = 'https://ejemplo.org/',
} = {}) {
  const motor = { auditarHtml: vi.fn(auditar) };
  const ia = { corregir: vi.fn(corregir) };
  const paginas = { descargar: vi.fn(() => of({ html: HTML, urlFinal })) };
  const auditorias = { guardar: vi.fn(() => of({ id: 7 })), obtener: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      AuditoriaEstado,
      { provide: MotorService, useValue: motor },
      { provide: IaService, useValue: ia },
      { provide: PaginasService, useValue: paginas },
      { provide: AuditoriasService, useValue: auditorias },
    ],
  });
  return { estado: TestBed.inject(AuditoriaEstado), motor, ia, paginas, auditorias };
}

describe('AuditoriaEstado', () => {
  it('audita HTML pegado y calcula el puntaje', async () => {
    const { estado } = preparar();
    await estado.auditarPegado(HTML, 'Mi página');
    expect(estado.estado()).toBe('listo');
    expect(estado.puntaje()).toBe(85);
    expect(estado.pagina()).toBe('Mi página');
  });

  it('HTML vacío: error sin auditar', async () => {
    const { estado, motor } = preparar();
    await estado.auditarPegado('   ', 'x');
    expect(estado.error()).toBe('Pega algo de HTML para auditar.');
    expect(motor.auditarHtml).not.toHaveBeenCalled();
  });

  it('archivo que no es .html o de más de 2 MB: error', async () => {
    const { estado } = preparar();
    await estado.auditarArchivo(new File(['x'], 'foto.png', { type: 'image/png' }));
    expect(estado.error()).toMatch(/\.html/);
    await estado.auditarArchivo(
      new File(['x'.repeat(2_000_001)], 'grande.html', { type: 'text/html' }),
    );
    expect(estado.error()).toMatch(/2 MB/);
  });

  it('archivo .html: usa su nombre como página', async () => {
    const { estado } = preparar();
    await estado.auditarArchivo(new File([HTML], 'contacto.html', { type: 'text/html' }));
    expect(estado.pagina()).toBe('contacto.html');
    expect(estado.origen()).toBe('archivo');
  });

  it('URL: descarga en el backend, audita con la base de la URL final', async () => {
    const { estado, motor } = preparar();
    await estado.auditarUrl('https://ejemplo.org');
    expect(estado.pagina()).toBe('https://ejemplo.org/');
    expect(estado.baseHref()).toBe('https://ejemplo.org/');
    expect(motor.auditarHtml).toHaveBeenCalledWith(HTML, 'https://ejemplo.org/');
  });

  it('avisa si la página parece necesitar JavaScript', async () => {
    const { estado } = preparar();
    await estado.auditarPegado(
      '<body><div id="root"></div><script src="app.js"></script></body>',
      'spa',
    );
    expect(estado.pareceSpa()).toBe(true);
  });

  it('corrige con la IA y verifica cada corrección y el documento', async () => {
    const { estado } = preparar();
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    expect(estado.correcciones()[0].estado).toBe('resuelto');
    expect(estado.verificacionDocumento()?.puntajeDespues).toBe(100);
  });

  it('la misma entrada no vuelve a pedir la corrección', async () => {
    const { estado, ia } = preparar();
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    await estado.corregir();
    expect(ia.corregir).toHaveBeenCalledTimes(1);
  });

  it('error 429 de la IA: mensaje claro', async () => {
    const { estado } = preparar({
      corregir: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 429,
              error: { error: 'La IA está saturada en este momento.' },
            }),
        ),
    });
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    expect(estado.errorIA()).toBe('La IA está saturada en este momento.');
  });

  it('guardar envía puntajes antes y después', async () => {
    const { estado, auditorias } = preparar();
    await estado.auditarPegado(HTML, 'Mi página');
    await estado.corregir();
    await estado.guardar();
    expect(auditorias.guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        pagina: 'Mi página',
        origen: 'pegado',
        puntaje: 85,
        puntajeCorregido: 100,
        htmlCorregido: respuestaIA.documento,
      }),
    );
    expect(estado.guardadaId()).toBe(7);
  });

  it('una corrección que termina después de una auditoría nueva se descarta', async () => {
    const respuesta = new Subject<typeof respuestaIA>();
    const { estado } = preparar({ corregir: () => respuesta });
    await estado.auditarPegado(HTML, 'A');
    const corrigiendo = estado.corregir();
    await estado.auditarPegado('<main><img src="b.png"></main>', 'B');
    respuesta.next(respuestaIA);
    respuesta.complete();
    await corrigiendo;
    expect(estado.pagina()).toBe('B');
    expect(estado.documentoCorregido()).toBeNull();
    expect(estado.correcciones()).toEqual([]);
    expect(estado.verificacionDocumento()).toBeNull();
    expect(estado.corrigiendo()).toBe(false);
  });

  it('a la IA se mandan como máximo 30 elementos en total', async () => {
    const nodos = (n: number, tag: string) =>
      Array.from({ length: n }, (_, i) => ({ selector: `${tag}:nth-child(${i + 1})`, html: `<${tag}>` }));
    const muchos: ResultadoAuditoria = {
      problemas: [
        { ...imgAlt, nodos: nodos(12, 'img') },
        { ...imgAlt, regla: 'color-contrast', gravedad: 'serio', nodos: nodos(25, 'p') },
      ],
      reglasAprobadas: 3,
      fecha: '',
    };
    const { estado, ia } = preparar({ auditar: async () => muchos });
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    const enviados = (ia.corregir.mock.calls[0] as unknown[])[1] as { nodos: unknown[] }[];
    expect(enviados.reduce((t, p) => t + p.nodos.length, 0)).toBe(30);
    expect(enviados.map((p) => p.nodos.length)).toEqual([12, 18]);
  });

  it('una URL de más de 300 caracteres se guarda sin la consulta', async () => {
    const larga = 'https://ejemplo.org/buscar?q=' + 'a'.repeat(400) + '#arriba';
    const { estado } = preparar({ urlFinal: larga });
    await estado.auditarUrl(larga);
    expect(estado.pagina()).toBe('https://ejemplo.org/buscar');
    expect(estado.baseHref()).toBe(larga);
  });

  it('avisa si el documento corregido tiene problemas nuevos o baja el puntaje', async () => {
    const otro: Problema = { ...imgAlt, regla: 'button-name', nodos: [{ selector: 'button', html: '' }] };
    const { estado } = preparar({
      auditar: async (html: string) =>
        html.includes('alt=') ? { ...limpio, problemas: [otro] } : conProblema,
    });
    await estado.auditarPegado(HTML, 'x');
    expect(estado.documentoEmpeora()).toBe(false);
    await estado.corregir();
    expect(estado.documentoEmpeora()).toBe(true);
  });

  it('sin problemas nuevos ni baja de puntaje, no avisa', async () => {
    const { estado } = preparar();
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    expect(estado.documentoEmpeora()).toBe(false);
  });
});
