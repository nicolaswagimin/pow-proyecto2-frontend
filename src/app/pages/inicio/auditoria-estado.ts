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
const MAX_PROBLEMAS_IA = 30;

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
      await this.auditar(html, 'url', urlFinal, urlFinal);
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
    return (this.resultado()?.problemas ?? []).slice(0, MAX_PROBLEMAS_IA).map((p: Problema) => ({
      regla: p.regla,
      ayuda: p.descripcion,
      nodos: p.nodos,
    }));
  }

  // Pide a la IA la explicación y la corrección, y verifica cada una volviendo a auditar.
  async corregir(): Promise<void> {
    const resultado = this.resultado();
    if (!resultado || !resultado.problemas.length || this.corrigiendo()) return;
    const problemas = this.problemasParaIA();
    const clave = JSON.stringify([this.html(), problemas]);
    if (clave === this.ultimaClaveIA && this.documentoCorregido()) return;

    this.corrigiendo.set(true);
    this.errorIA.set(null);
    this.progresoIA.set('Pidiendo la explicación y la corrección a la IA…');
    try {
      const respuesta: RespuestaCorreccion = await firstValueFrom(
        this.ia.corregir(this.html(), problemas),
      );
      this.ultimaClaveIA = clave;
      const auditar = (html: string) => this.motor.auditarHtml(html, this.baseHref());
      const verificadas: CorreccionVerificada[] = [];
      for (const [i, c] of respuesta.problemas.entries()) {
        this.progresoIA.set(`Verificando la corrección ${i + 1} de ${respuesta.problemas.length}…`);
        verificadas.push(await verificarPorProblema(this.html(), resultado, c, auditar));
      }
      this.progresoIA.set('Verificando el documento corregido completo…');
      this.correcciones.set(verificadas);
      this.verificacionDocumento.set(
        await verificarDocumento(resultado, respuesta.documento, auditar),
      );
      this.documentoCorregido.set(respuesta.documento);
    } catch (err) {
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
}
