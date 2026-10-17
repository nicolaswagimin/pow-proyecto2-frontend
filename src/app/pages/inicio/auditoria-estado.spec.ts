import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, of, throwError } from 'rxjs';
import { MotorService } from '../../auditor/motor.service';
import type { FragmentoParaIA } from '../../auditor/lotes';
import { AuditoriasService } from '../../services/auditorias.service';
import { IaService, RespuestaFragmentos } from '../../services/ia.service';
import {
  auditorFalso,
  corregirFalso,
  paginaGrande,
} from '../../../testing/pagina-grande.spec-util';
import { PaginasService } from '../../services/paginas.service';
import { AuditoriaEstado } from './auditoria-estado';

const HTML = '<main><img src="a.png"></main>';

function preparar({
  auditar = async (html: string) => auditorFalso(html),
  corregir = (_p: unknown, fragmentos: FragmentoParaIA[]): Observable<RespuestaFragmentos> =>
    of(corregirFalso(fragmentos)),
  urlFinal = 'https://ejemplo.org/',
} = {}) {
  const motor = { auditarHtml: vi.fn(auditar) };
  const ia = { corregirFragmentos: vi.fn(corregir) };
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

const enviadosEn = (ia: { corregirFragmentos: { mock: { calls: unknown[][] } } }) =>
  ia.corregirFragmentos.mock.calls.map((c) => c[1] as FragmentoParaIA[]);

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

  it('una URL de más de 300 caracteres se guarda sin la consulta', async () => {
    const larga = 'https://ejemplo.org/buscar?q=' + 'a'.repeat(400) + '#arriba';
    const { estado } = preparar({ urlFinal: larga });
    await estado.auditarUrl(larga);
    expect(estado.pagina()).toBe('https://ejemplo.org/buscar');
    expect(estado.baseHref()).toBe(larga);
  });

  it('corrige con la IA por fragmentos y verifica el documento', async () => {
    const { estado, ia } = preparar();
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    expect(enviadosEn(ia)).toEqual([
      [
        {
          id: 'f1',
          regla: 'image-alt',
          ayuda: 'Las imágenes deben tener texto alternativo.',
          html: '<img src="a.png">',
          padre: '<main>',
          resumen: '',
        },
      ],
    ]);
    expect(ia.corregirFragmentos.mock.calls[0][0]).toEqual({ idioma: '', titulo: '' });
    expect(estado.correcciones().map((c) => c.estado)).toEqual(['resuelto']);
    expect(estado.documentoCorregido()).toBe('<main><img alt="Producto" src="a.png"></main>');
    expect(estado.verificacionDocumento()?.puntajeDespues).toBe(100);
    expect(estado.quedan()).toBe(0);
  });

  it('lo que ya se intentó no se vuelve a pedir', async () => {
    const { estado, ia } = preparar();
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    await estado.corregir();
    expect(ia.corregirFragmentos).toHaveBeenCalledTimes(1);
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
    expect(estado.corrigiendo()).toBe(false);
  });

  it('si la IA falla, «Corregir más» vuelve a pedir los mismos elementos', async () => {
    let fallar = true;
    const { estado, ia } = preparar({
      corregir: (_p: unknown, fragmentos: FragmentoParaIA[]) =>
        fallar
          ? throwError(
              () => new HttpErrorResponse({ status: 502, error: { error: 'Gemini caído.' } }),
            )
          : of(corregirFalso(fragmentos)),
    });
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    expect(estado.errorIA()).toBe('Gemini caído.');
    expect(estado.textoCorregir()).toBe('Corregir más (quedan 1 elemento)');
    fallar = false;
    await estado.corregir();
    expect(enviadosEn(ia)).toHaveLength(2);
    expect(enviadosEn(ia)[1]).toEqual(enviadosEn(ia)[0]);
    expect(estado.correcciones().map((c) => c.estado)).toEqual(['resuelto']);
  });

  it('un fragmento sin respuesta de la IA queda como «sin respuesta» y no se aplica', async () => {
    const { estado } = preparar({
      corregir: () => of({ fragmentos: [], sinRespuesta: ['f1'] }),
    });
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    expect(estado.correcciones()).toEqual([
      expect.objectContaining({
        regla: 'image-alt',
        estado: 'sin-respuesta',
        original: '<img src="a.png">',
      }),
    ]);
    expect(estado.documentoCorregido()).toBeNull();
  });

  it('una corrección que introduce problemas no entra al documento', async () => {
    const { estado } = preparar({
      corregir: (_p: unknown, fragmentos: FragmentoParaIA[]) =>
        of({
          fragmentos: fragmentos.map((f) => ({
            id: f.id,
            explicacion: 'x',
            corregido: '<img alt="Logo" src="a.png"><button></button>',
            desdeCache: false,
          })),
          sinRespuesta: [],
        }),
    });
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    expect(estado.correcciones()[0].estado).toBe('introdujo-problemas');
    expect(estado.documentoCorregido()).toBeNull();
    expect(estado.documentoEmpeora()).toBe(false);
  });

  it('guardar envía el documento corregido y los puntajes antes y después', async () => {
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
        htmlCorregido: '<main><img alt="Producto" src="a.png"></main>',
      }),
    );
    expect(estado.guardadaId()).toBe(7);
  });

  it('una corrección que termina después de una auditoría nueva se descarta', async () => {
    const respuesta = new Subject<RespuestaFragmentos>();
    const { estado } = preparar({ corregir: () => respuesta });
    await estado.auditarPegado(HTML, 'A');
    const corrigiendo = estado.corregir();
    await vi.waitFor(() => expect(estado.progresoIA()).toMatch(/pidiendo/));
    await estado.auditarPegado('<main><img src="b.png"></main>', 'B');
    respuesta.next({
      fragmentos: [
        { id: 'f1', explicacion: 'x', corregido: '<img alt="A" src="a.png">', desdeCache: false },
      ],
      sinRespuesta: [],
    });
    respuesta.complete();
    await corrigiendo;
    expect(estado.pagina()).toBe('B');
    expect(estado.documentoCorregido()).toBeNull();
    expect(estado.correcciones()).toEqual([]);
    expect(estado.verificacionDocumento()).toBeNull();
    expect(estado.corrigiendo()).toBe(false);
  });

  it('el botón pasa de «Explicar y corregir» a «Corregir más» y desaparece al terminar', async () => {
    const { estado } = preparar();
    await estado.auditarPegado(paginaGrande(100), 'Tienda');
    expect(estado.textoCorregir()).toBe('Explicar y corregir');
    await estado.corregir();
    expect(estado.textoCorregir()).toBe(`Corregir más (quedan ${estado.quedan()} elementos)`);
    while ((estado.quedan() ?? 0) > 0) await estado.corregir();
    expect(estado.textoCorregir()).toBeNull();
  });

  it('cuenta los elementos que no se pueden corregir con IA', async () => {
    const sinRuta = async (html: string) => {
      const r = auditorFalso(html);
      return {
        ...r,
        problemas: r.problemas.map((p) => ({
          ...p,
          nodos: p.nodos.map((n) => ({ ...n, ruta: null })),
        })),
      };
    };
    const { estado, ia } = preparar({ auditar: sinRuta });
    await estado.auditarPegado(HTML, 'x');
    await estado.corregir();
    expect(ia.corregirFragmentos).not.toHaveBeenCalled();
    expect(estado.noCorregibles()).toBe(1);
    expect(estado.textoCorregir()).toBeNull();
  });

  describe('página grande de ejemplo', () => {
    const grande = paginaGrande(400);

    it('la página pesa más de 300 KB y tiene más de 60 problemas', () => {
      expect(grande.length).toBeGreaterThan(300_000);
      const nodos = auditorFalso(grande).problemas.reduce((t, p) => t + p.nodos.length, 0);
      expect(nodos).toBeGreaterThan(60);
    });

    it('una ronda: 3 lotes de hasta 8 fragmentos, los críticos primero, sin mandar el documento', async () => {
      const { estado, ia } = preparar();
      await estado.auditarPegado(grande, 'Tienda');
      const total = estado.resultado()!.problemas.reduce((t, p) => t + p.nodos.length, 0);
      await estado.corregir();

      const lotes = enviadosEn(ia);
      expect(lotes).toHaveLength(3);
      for (const lote of lotes) {
        expect(lote.length).toBeLessThanOrEqual(8);
        for (const f of lote) expect(f.html.length).toBeLessThan(200);
      }
      expect(lotes[0].every((f) => f.regla === 'image-alt' || f.regla === 'button-name')).toBe(
        true,
      );
      expect(ia.corregirFragmentos.mock.calls[0][0]).toEqual({
        idioma: 'es',
        titulo: 'Tienda de ejemplo',
      });

      expect(estado.correcciones()).toHaveLength(24);
      expect(estado.correcciones().every((c) => c.estado === 'resuelto')).toBe(true);
      expect(estado.quedan()).toBe(total - 24);
      expect(estado.progresoIA()).toBe('');
    });

    it('el documento corregido solo difiere en los fragmentos corregidos', async () => {
      const { estado } = preparar();
      await estado.auditarPegado(grande, 'Tienda');
      await estado.corregir();
      const corregido = estado.documentoCorregido()!;
      expect(corregido).not.toBe(grande);
      expect(
        corregido.replaceAll(' alt="Producto"', '').replaceAll(' aria-label="Comprar"', ''),
      ).toBe(grande);
    });

    it('«Corregir más» sigue con los siguientes hasta terminar', async () => {
      const { estado, ia } = preparar();
      await estado.auditarPegado(grande, 'Tienda');
      await estado.corregir();
      const primera = new Set(
        enviadosEn(ia)
          .flat()
          .map((f) => f.html + f.padre),
      );
      await estado.corregir();
      const segunda = enviadosEn(ia).slice(3).flat();
      expect(segunda).toHaveLength(24);
      expect(segunda.some((f) => primera.has(f.html + f.padre))).toBe(false);
      while ((estado.quedan() ?? 0) > 0) await estado.corregir();
      expect(estado.verificacionDocumento()?.puntajeDespues).toBe(100);
      expect(auditorFalso(estado.documentoCorregido()!).problemas).toEqual([]);
    });
  });
});
