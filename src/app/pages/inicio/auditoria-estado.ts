import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { pareceSpa } from '../../auditor/axe-a-problemas';
import { Problema, ResultadoAuditoria } from '../../auditor/modelo';
import { MotorService } from '../../auditor/motor.service';
import { calcularPuntaje, resumir } from '../../auditor/puntaje';
import {
  CorreccionVerificada,
  VerificacionDocumento,
  verificarDocumento,
  verificarPorProblema,
} from '../../auditor/verificar';
import { mapearError } from '../../core/errores';
import { AuditoriasService, Origen } from '../../services/auditorias.service';
import { IaService, ProblemaParaIA, RespuestaCorreccion } from '../../services/ia.service';
import { PaginasService } from '../../services/paginas.service';

export type EstadoPagina = 'vacio' | 'auditando' | 'listo' | 'error';

export const MAX_HTML = 2_000_000;
// Total de elementos (regla + selector) que se mandan a la IA: es lo que limita su respuesta.
const MAX_NODOS_IA = 30;
const MAX_PAGINA = 300;

// El nombre de una página por URL: la URL entera, o sin la consulta si no cabe en el historial.
function nombreDeUrl(url: string): string {
  if (url.length <= MAX_PAGINA) return url;
  return url.replace(/[?#].*$/, '').slice(0, MAX_PAGINA);
}

// Estado y lógica de /app: entrada, auditoría, corrección con IA, verificación y guardado.
// Se provee en el componente de la página.
@Injectable()
export class AuditoriaEstado {
  private readonly motor = inject(MotorService);
  private readonly ia = inject(IaService);
  private readonly paginas = inject(PaginasService);
  private readonly auditorias = inject(AuditoriasService);

  readonly html = signal('');
  readonly origen = signal<Origen>('pegado');
  readonly pagina = signal('');
  readonly baseHref = signal<string | undefined>(undefined);

  readonly estado = signal<EstadoPagina>('vacio');
  readonly error = signal<string | null>(null);
  readonly resultado = signal<ResultadoAuditoria | null>(null);
  readonly pareceSpa = signal(false);
  readonly seleccionado = signal<string | null>(null);

  readonly corrigiendo = signal(false);
  readonly progresoIA = signal('');
  readonly errorIA = signal<string | null>(null);
  readonly correcciones = signal<CorreccionVerificada[]>([]);
  readonly verificacionDocumento = signal<VerificacionDocumento | null>(null);
  readonly documentoCorregido = signal<string | null>(null);

  readonly guardando = signal(false);
  readonly guardadaId = signal<number | null>(null);

  readonly puntaje = computed(() => {
    const r = this.resultado();
    return r ? calcularPuntaje(r.problemas) : null;
  });
  readonly resumen = computed(() => resumir(this.resultado()?.problemas ?? []));

  // Clave de la última corrección pedida: la misma entrada no se vuelve a pedir.
  private ultimaClaveIA: string | null = null;
  // Sube con cada auditoría: una corrección que termina después pertenece a otra página.
  private generacion = 0;

  async auditarPegado(html: string, pagina: string): Promise<void> {
    if (!html.trim()) return this.fallar('Pega algo de HTML para auditar.');
    await this.auditar(html, 'pegado', pagina.trim() || 'HTML pegado');
  }

  async auditarArchivo(archivo: File): Promise<void> {
    if (!/\.html?$/i.test(archivo.name)) return this.fallar('Elige un archivo .html o .htm.');
    if (archivo.size > MAX_HTML)
      return this.fallar('El archivo supera 2 MB, el máximo que se puede auditar.');
    const html = await archivo.text();
    if (!html.trim()) return this.fallar('El archivo está vacío.');
    await this.auditar(html, 'archivo', archivo.name);
  }

  async auditarUrl(url: string): Promise<void> {
    if (!url.trim()) return this.fallar('Escribe la dirección de la página.');
    this.estado.set('auditando');
    this.error.set(null);
    try {
      const { html, urlFinal } = await firstValueFrom(this.paginas.descargar(url.trim()));
      await this.auditar(html, 'url', nombreDeUrl(urlFinal), urlFinal);
    } catch (err) {
      this.fallar(mapearError(err).mensaje);
    }
  }

  private async auditar(
    html: string,
    origen: Origen,
    pagina: string,
    baseHref?: string,
  ): Promise<void> {
    this.estado.set('auditando');
    this.error.set(null);
    this.generacion++;
    this.limpiarCorreccion();
    this.html.set(html);
    this.origen.set(origen);
    this.pagina.set(pagina);
    this.baseHref.set(baseHref);
    this.guardadaId.set(null);
    this.seleccionado.set(null);
    this.pareceSpa.set(pareceSpa(html));
    try {
      this.resultado.set(await this.motor.auditarHtml(html, baseHref));
      this.estado.set('listo');
    } catch (err) {
      this.fallar(err instanceof Error ? err.message : 'No se pudo auditar la página.');
    }
  }

  private fallar(mensaje: string): void {
    this.error.set(mensaje);
    this.estado.set('error');
  }

  private limpiarCorreccion(): void {
    this.correcciones.set([]);
    this.verificacionDocumento.set(null);
    this.documentoCorregido.set(null);
    this.errorIA.set(null);
  }

  private problemasParaIA(): ProblemaParaIA[] {
    let quedan = MAX_NODOS_IA;
    const enviados: ProblemaParaIA[] = [];
    for (const p of (this.resultado()?.problemas ?? []) as Problema[]) {
      if (quedan <= 0) break;
      const nodos = p.nodos.slice(0, quedan);
      quedan -= nodos.length;
      enviados.push({ regla: p.regla, ayuda: p.descripcion, nodos });
    }
    return enviados;
  }

  // Pide a la IA la explicación y la corrección, y verifica cada una volviendo a auditar.
  async corregir(): Promise<void> {
    const resultado = this.resultado();
    if (!resultado || !resultado.problemas.length || this.corrigiendo()) return;
    const problemas = this.problemasParaIA();
    const html = this.html();
    const baseHref = this.baseHref();
    const generacion = this.generacion;
    const vigente = () => generacion === this.generacion;
    const clave = JSON.stringify([html, problemas]);
    if (clave === this.ultimaClaveIA && this.documentoCorregido()) return;

    this.corrigiendo.set(true);
    this.errorIA.set(null);
    this.progresoIA.set('Pidiendo la explicación y la corrección a la IA…');
    try {
      const respuesta: RespuestaCorreccion = await firstValueFrom(
        this.ia.corregir(html, problemas),
      );
      if (!vigente()) return;
      this.ultimaClaveIA = clave;
      const auditar = (h: string) => this.motor.auditarHtml(h, baseHref);
      const verificadas: CorreccionVerificada[] = [];
      for (const [i, c] of respuesta.problemas.entries()) {
        this.progresoIA.set(`Verificando la corrección ${i + 1} de ${respuesta.problemas.length}…`);
        verificadas.push(await verificarPorProblema(html, resultado, c, auditar));
        if (!vigente()) return;
      }
      this.progresoIA.set('Verificando el documento corregido completo…');
      const documento = await verificarDocumento(resultado, respuesta.documento, auditar);
      if (!vigente()) return;
      this.correcciones.set(verificadas);
      this.verificacionDocumento.set(documento);
      this.documentoCorregido.set(respuesta.documento);
    } catch (err) {
      if (!vigente()) return;
      this.errorIA.set(
        err instanceof HttpErrorResponse
          ? mapearError(err).mensaje
          : 'No se pudo verificar la corrección.',
      );
    } finally {
      this.corrigiendo.set(false);
      this.progresoIA.set('');
    }
  }

  async guardar(): Promise<string | null> {
    const resultado = this.resultado();
    const puntaje = this.puntaje();
    if (!resultado || puntaje === null || this.guardando()) return null;
    this.guardando.set(true);
    try {
      const doc = this.verificacionDocumento();
      const guardada = await firstValueFrom(
        this.auditorias.guardar({
          pagina: this.pagina(),
          origen: this.origen(),
          html: this.html(),
          puntaje,
          resumen: this.resumen(),
          problemas: resultado.problemas,
          htmlCorregido: this.documentoCorregido(),
          puntajeCorregido: doc ? doc.puntajeDespues : null,
        }),
      );
      this.guardadaId.set(guardada.id);
      return null;
    } catch (err) {
      return mapearError(err).mensaje;
    } finally {
      this.guardando.set(false);
    }
  }

  // Abre una auditoría del historial y la vuelve a auditar (la lente necesita los resultados vivos).
  async cargar(id: number): Promise<void> {
    this.estado.set('auditando');
    try {
      const a = await firstValueFrom(this.auditorias.obtener(id));
      const baseHref = a.origen === 'url' ? a.pagina : undefined;
      await this.auditar(a.html, a.origen, a.pagina, baseHref);
      this.guardadaId.set(a.id);
    } catch (err) {
      this.fallar(mapearError(err).mensaje);
    }
  }
}
