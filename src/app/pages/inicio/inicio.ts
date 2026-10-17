import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { Correcciones } from '../../auditor/componentes/correcciones/correcciones';
import { DiffCodigo } from '../../auditor/componentes/diff/diff-codigo';
import { EntradaHtml } from '../../auditor/componentes/entrada/entrada-html';
import { Lente } from '../../auditor/componentes/lente/lente';
import { ListaProblemas } from '../../auditor/componentes/problemas/lista-problemas';
import { Recomendaciones } from '../../auditor/componentes/recomendaciones/recomendaciones';
import { PuntajeAuditoria } from '../../auditor/componentes/puntaje/puntaje';
import { descargarTexto, nombreArchivo, reporteMarkdown } from '../../auditor/exportar';
import { APP_NOMBRE } from '../../config';
import { AuthService } from '../../core/auth.service';
import { BarraApp } from '../../layouts/barra-app/barra-app';
import { Alert } from '../../ui/alert/alert';
import { Button } from '../../ui/button/button';
import { Icon } from '../../ui/icon/icon';
import { AuditoriaEstado } from './auditoria-estado';

// /app: auditar HTML (pegado, archivo o URL), ver los problemas en la lente con sus recomendaciones
// en vivo, corregirlos con la IA verificando cada corrección, comparar antes y después, guardar y
// exportar.
@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    Alert,
    BarraApp,
    Button,
    Icon,
    EntradaHtml,
    PuntajeAuditoria,
    Lente,
    ListaProblemas,
    Correcciones,
    DiffCodigo,
    Recomendaciones,
  ],
  providers: [AuditoriaEstado],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  protected readonly auth = inject(AuthService);
  protected readonly estado = inject(AuditoriaEstado);

  protected readonly usuario = this.auth.usuario;
  protected readonly primerNombre = computed(
    () => (this.usuario()?.nombre ?? '').trim().split(/\s+/)[0] || 'de nuevo',
  );

  protected readonly auditando = computed(() => this.estado.estado() === 'auditando');
  protected readonly selectores = computed(
    () => this.estado.resultado()?.problemas.flatMap((p) => p.nodos.map((n) => n.selector)) ?? [],
  );
  protected readonly aviso = signal<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);
  // Los elementos con problemas a la vista en la vista previa (los avisa la lente al desplazarse).
  protected readonly visibles = signal<string[]>([]);
  // En escritorio las recomendaciones ocupan la columna derecha; en móvil van en el contenido.
  protected readonly escritorio = signal(false);

  constructor() {
    inject(Title).setTitle(`Inicio · ${APP_NOMBRE}`);
    if (typeof matchMedia === 'function') {
      const consulta = matchMedia('(min-width: 960px)');
      const actualizar = () => this.escritorio.set(consulta.matches);
      actualizar();
      consulta.addEventListener('change', actualizar);
      inject(DestroyRef).onDestroy(() => consulta.removeEventListener('change', actualizar));
    }
    this.auth.refrescarUsuario();
    // /app?auditoria=<id> abre una auditoría del historial.
    const id = Number(inject(ActivatedRoute).snapshot.queryParamMap.get('auditoria'));
    if (Number.isInteger(id) && id > 0) void this.estado.cargar(id);
  }

  protected seleccionar(selector: string): void {
    this.estado.seleccionado.set(selector);
  }

  // Un clic en la lente (o en una recomendación) selecciona el problema y lleva el foco a su lugar
  // en la lista.
  protected alClicEnLente(selector: string): void {
    this.estado.seleccionado.set(selector);
    queueMicrotask(() => {
      const item = document.querySelector<HTMLElement>(`[data-selector="${CSS.escape(selector)}"]`);
      item?.scrollIntoView({ block: 'center' });
      item?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    });
  }

  protected async guardar(): Promise<void> {
    this.aviso.set(null);
    const error = await this.estado.guardar();
    this.aviso.set(
      error
        ? { tipo: 'error', mensaje: error }
        : { tipo: 'exito', mensaje: 'Auditoría guardada en tu historial.' },
    );
  }

  protected exportarMarkdown(): void {
    const resultado = this.estado.resultado();
    const puntaje = this.estado.puntaje();
    if (!resultado || puntaje === null) return;
    const doc = this.estado.verificacionDocumento();
    const md = reporteMarkdown({
      pagina: this.estado.pagina(),
      fecha: resultado.fecha,
      puntaje,
      problemas: resultado.problemas,
      correcciones: this.estado.correcciones(),
      documento: doc
        ? {
            puntajeAntes: doc.puntajeAntes,
            puntajeDespues: doc.puntajeDespues,
            resueltos: doc.comparacion.resueltos.length,
            sinResolver: doc.comparacion.sinResolver.length,
            nuevos: doc.comparacion.nuevos.length,
          }
        : undefined,
    });
    descargarTexto(md, nombreArchivo(this.estado.pagina(), 'md'), 'text/markdown');
  }

  // El PDF sale de la impresión del navegador ("Guardar como PDF"): la hoja tiene estilos de
  // impresión que dejan solo el reporte (docs/decisiones/0008).
  protected exportarPdf(): void {
    window.print();
  }

  protected descargarHtml(): void {
    const documento = this.estado.documentoCorregido();
    if (documento)
      descargarTexto(documento, nombreArchivo(this.estado.pagina(), 'html'), 'text/html');
  }
}
