import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { pareceSpa } from '../../auditor/axe-a-problemas';
import { analizarFuente } from '../../auditor/fragmentos';
import { armarLote, claveDe, prepararPendientes } from '../../auditor/lotes';
import { ResultadoAuditoria } from '../../auditor/modelo';
import { MotorService } from '../../auditor/motor.service';
import { calcularPuntaje, resumir } from '../../auditor/puntaje';
import {
  Base,
  Candidata,
  CorreccionVerificada,
  VerificacionDocumento,
  compararAuditorias,
  verificarLote,
} from '../../auditor/verificar';
import { mapearError } from '../../core/errores';
import { AuditoriasService, Origen } from '../../services/auditorias.service';
import { IaService } from '../../services/ia.service';
import { PaginasService } from '../../services/paginas.service';

export type EstadoPagina = 'vacio' | 'auditando' | 'listo' | 'error';

export const MAX_HTML = 2_000_000;
// Lotes que procesa un clic en «Explicar y corregir» o «Corregir más» (cuida la cuota de Gemini).
export const LOTES_POR_RONDA = 3;
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
  // Elementos que aún se pueden corregir con IA (null hasta la primera ronda) y los que no se
  // pueden (no están escritos en el HTML original o su fragmento es demasiado largo).
  readonly quedan = signal<number | null>(null);
  readonly noCorregibles = signal(0);
  // Texto del botón de la IA; null cuando ya no queda nada que corregir.
  readonly textoCorregir = computed(() => {
    const n = this.quedan();
    if (n === null) return 'Explicar y corregir';
    if (n === 0) return null;
    return `Corregir más (quedan ${n} ${n === 1 ? 'elemento' : 'elementos'})`;
  });

  readonly guardando = signal(false);
  readonly guardadaId = signal<number | null>(null);

  readonly puntaje = computed(() => {
    const r = this.resultado();
    return r ? calcularPuntaje(r.problemas) : null;
  });
  readonly resumen = computed(() => resumir(this.resultado()?.problemas ?? []));
  // El documento completo de la IA introdujo problemas o bajó el puntaje: se avisa antes de
  // ofrecerlo (el diff y la descarga muestran el documento entero, no solo lo verificado).
  readonly documentoEmpeora = computed(() => {
    const doc = this.verificacionDocumento();
    return !!doc && (doc.comparacion.nuevos.length > 0 || doc.puntajeDespues < doc.puntajeAntes);
  });

  // El documento acumulado (original + correcciones verificadas) y su auditoría.
  private base: Base | null = null;
  // regla|selector ya enviados a la IA: no se vuelven a pedir.
  private readonly intentados = new Set<string>();
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
    // El resultado anterior es de otra página: si esta auditoría falla, no debe quedar a la vista
    // ni usarse para corregir el HTML nuevo.
    this.resultado.set(null);
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
    // Una corrección en curso de la página anterior se descarta (generacion) y deja de mostrarse.
    this.corrigiendo.set(false);
    this.progresoIA.set('');
    this.base = null;
    this.intentados.clear();
    this.quedan.set(null);
    this.noCorregibles.set(0);
    this.correcciones.set([]);
    this.verificacionDocumento.set(null);
    this.documentoCorregido.set(null);
    this.errorIA.set(null);
  }

  // Una ronda de corrección por fragmentos (docs/ia.md del backend): hasta 3 lotes, de mayor a menor
  // gravedad. Cada lote se ubica sobre el documento acumulado, se pide a la IA, se aplica como
  // reemplazos de texto y se verifica con axe; solo lo resuelto entra al documento.
  async corregir(): Promise<void> {
    const resultado = this.resultado();
    if (
      !resultado ||
      this.estado() !== 'listo' ||
      !resultado.problemas.length ||
      this.corrigiendo() ||
      this.quedan() === 0
    ) {
      return;
    }
    const baseHref = this.baseHref();
    const generacion = this.generacion;
    const vigente = () => generacion === this.generacion;
    const auditar = (h: string) => this.motor.auditarHtml(h, baseHref);
    let base = this.base ?? { html: this.html(), auditoria: resultado };
    const originales = new Set(
      resultado.problemas.flatMap((p) => p.nodos.map((n) => claveDe(p.regla, n.selector))),
    );

    this.corrigiendo.set(true);
    this.errorIA.set(null);
    try {
      let lotes = 0;
      for (let i = 0; i < LOTES_POR_RONDA; i++) {
        const fuente = await analizarFuente(base.html);
        if (!vigente()) return;
        const { pendientes, noCorregibles } = prepararPendientes(
          fuente,
          base.auditoria.problemas,
          this.intentados,
          originales,
        );
        this.quedan.set(pendientes.length);
        this.noCorregibles.set(noCorregibles.length);
        if (!pendientes.length) break;
        lotes ||= Math.min(LOTES_POR_RONDA, Math.ceil(pendientes.length / 8));
        const etiqueta = `Lote ${i + 1} de ${Math.max(lotes, i + 1)}`;

        const lote = armarLote(pendientes);
        this.progresoIA.set(`${etiqueta}: pidiendo la explicación y la corrección a la IA…`);
        const respuesta = await firstValueFrom(
          this.ia.corregirFragmentos(
            { idioma: fuente.idioma, titulo: fuente.titulo },
            lote.fragmentos,
          ),
        );
        if (!vigente()) return;

        const candidatas: Candidata[] = respuesta.fragmentos.flatMap((r) =>
          (lote.ubicaciones.get(r.id) ?? []).map((p) => ({
            regla: p.regla,
            selector: p.selector,
            explicacion: r.explicacion,
            original: p.fragmento.texto,
            corregido: r.corregido,
            inicio: p.fragmento.inicio,
            fin: p.fragmento.fin,
            tipo: p.fragmento.tipo,
          })),
        );
        const sinRespuesta: CorreccionVerificada[] = respuesta.sinRespuesta.flatMap((id) =>
          (lote.ubicaciones.get(id) ?? []).map((p) => ({
            regla: p.regla,
            selector: p.selector,
            explicacion: '',
            original: p.fragmento.texto,
            corregido: '',
            estado: 'sin-respuesta' as const,
            nuevos: [],
          })),
        );

        this.progresoIA.set(`${etiqueta}: verificando las correcciones con axe…`);
        const verificado = await verificarLote(base, candidatas, auditar);
        if (!vigente()) return;
        // Solo cuenta como intentado lo que la IA respondió y se verificó: si la petición o la
        // verificación fallan, «Corregir más» vuelve a pedirlo.
        for (const ps of lote.ubicaciones.values())
          for (const p of ps) this.intentados.add(p.clave);
        base = verificado.base;
        this.base = base;
        this.correcciones.update((cs) => [...cs, ...verificado.verificadas, ...sinRespuesta]);
        this.publicarDocumento(resultado, base);
      }
      if (vigente() && this.quedan()) {
        const fuente = await analizarFuente(base.html);
        if (vigente()) {
          const r = prepararPendientes(
            fuente,
            base.auditoria.problemas,
            this.intentados,
            originales,
          );
          this.quedan.set(r.pendientes.length);
        }
      }
    } catch (err) {
      if (!vigente()) return;
      this.errorIA.set(
        err instanceof HttpErrorResponse
          ? mapearError(err).mensaje
          : 'No se pudo verificar la corrección.',
      );
    } finally {
      if (vigente()) {
        this.corrigiendo.set(false);
        this.progresoIA.set('');
      }
    }
  }

  // El documento corregido es el acumulado; se compara con la auditoría original sin volver a
  // auditar (la auditoría de la base ya está hecha).
  private publicarDocumento(original: ResultadoAuditoria, base: Base): void {
    this.documentoCorregido.set(base.html !== this.html() ? base.html : null);
    this.verificacionDocumento.set({
      auditoria: base.auditoria,
      comparacion: compararAuditorias(original, base.auditoria),
      puntajeAntes: calcularPuntaje(original.problemas),
      puntajeDespues: calcularPuntaje(base.auditoria.problemas),
    });
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
