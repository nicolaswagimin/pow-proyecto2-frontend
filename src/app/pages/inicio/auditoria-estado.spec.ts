import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
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
  corregir = () => of(respuestaIA),
} = {}) {
  const motor = { auditarHtml: vi.fn(auditar) };
  const ia = { corregir: vi.fn(corregir) };
  const paginas = { descargar: vi.fn(() => of({ html: HTML, urlFinal: 'https://ejemplo.org/' })) };
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
});
