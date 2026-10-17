import { DestroyRef, Injectable, inject } from '@angular/core';
import { ViolacionAxe, aProblemas } from './axe-a-problemas';
import { documentoAislado } from './aislar';
import { ResultadoAuditoria } from './modelo';

// Motor de auditoría: el HTML del usuario se carga en un iframe con sandbox="allow-scripts" (origen
// opaco, sin acceso a la app) y una CSP con nonce que solo deja correr axe y el corredor
// (public/auditor/corredor.js). Se comunican por postMessage. Ver docs/lente.md.

const SANDBOX = 'allow-scripts';
const ESPERA_LISTO_MS = 15_000;
const ESPERA_AUDITORIA_MS = 20_000;

interface MensajeCorredor {
  tipo: 'listo' | 'resultado' | 'error' | 'clic';
  sesion?: string;
  id?: number;
  violaciones?: ViolacionAxe[];
  aprobadas?: number;
  selector?: string;
  mensaje?: string;
}

function aleatorio(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return btoa(String.fromCharCode(...bytes)).replace(
    /[+/=]/g,
    (c) => ({ '+': '-', '/': '_', '=': '' })[c]!,
  );
}

function urlAbsoluta(ruta: string): string {
  return new URL(ruta, document.baseURI).href;
}

// Una página cargada en un iframe aislado: se puede auditar, resaltar y enfocar.
export class SesionAislada {
  private siguienteId = 1;
  private readonly oyentes = new Set<(m: MensajeCorredor) => void>();
  private readonly alRecibir = (evento: MessageEvent) => {
    // Solo cuentan los mensajes de ESTE iframe (el origen es opaco: se compara la ventana) y de
    // ESTA carga: si la página lograra navegar el iframe, la nueva no conoce el token.
    if (evento.source !== this.iframe.contentWindow || !evento.data?.tipo) return;
    if (evento.data.sesion !== this.token) return;
    for (const oyente of this.oyentes) oyente(evento.data as MensajeCorredor);
  };

  constructor(
    readonly iframe: HTMLIFrameElement,
    private readonly token: string,
  ) {
    window.addEventListener('message', this.alRecibir);
  }

  escuchar(oyente: (m: MensajeCorredor) => void): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  private enviar(mensaje: object): void {
    this.iframe.contentWindow?.postMessage(mensaje, '*');
  }

  auditar(esperaMs = ESPERA_AUDITORIA_MS): Promise<ResultadoAuditoria> {
    const id = this.siguienteId++;
    return new Promise((resolver, rechazar) => {
      const plazo = setTimeout(() => {
        dejar();
        rechazar(new Error('La auditoría tardó demasiado. Prueba con un HTML más corto.'));
      }, esperaMs);
      const dejar = this.escuchar((m) => {
        if (m.id !== id) return;
        clearTimeout(plazo);
        dejar();
        if (m.tipo === 'error') rechazar(new Error(`axe no pudo auditar la página: ${m.mensaje}`));
        else
          resolver({
            problemas: aProblemas(m.violaciones ?? []),
            reglasAprobadas: m.aprobadas ?? 0,
            fecha: new Date().toISOString(),
          });
      });
      this.enviar({ tipo: 'auditar', id });
    });
  }

  resaltar(selectores: string[], seleccionado: string | null): void {
    this.enviar({ tipo: 'resaltar', selectores, seleccionado });
  }

  enfocar(selector: string): void {
    this.enviar({ tipo: 'enfocar', selector });
  }

  alClic(oyente: (selector: string) => void): () => void {
    return this.escuchar((m) => m.tipo === 'clic' && m.selector && oyente(m.selector));
  }

  cerrar(): void {
    window.removeEventListener('message', this.alRecibir);
    this.oyentes.clear();
  }
}

@Injectable({ providedIn: 'root' })
export class MotorService {
  // Carga el HTML en el iframe dado (visible, para la lente) y espera a que el corredor esté listo.
  abrir(iframe: HTMLIFrameElement, html: string, baseHref?: string): Promise<SesionAislada> {
    const token = aleatorio();
    let documento: string;
    try {
      documento = documentoAislado(html, {
        nonce: aleatorio(),
        sesion: token,
        urlAxe: urlAbsoluta('auditor/axe.min.js'),
        urlCorredor: urlAbsoluta('auditor/corredor.js'),
        baseHref,
      });
    } catch (err) {
      return Promise.reject(err);
    }
    iframe.setAttribute('sandbox', SANDBOX);
    const sesion = new SesionAislada(iframe, token);
    const listo = new Promise<SesionAislada>((resolver, rechazar) => {
      const plazo = setTimeout(() => {
        dejar();
        sesion.cerrar();
        rechazar(new Error('No se pudo preparar la vista aislada de la página.'));
      }, ESPERA_LISTO_MS);
      const dejar = sesion.escuchar((m) => {
        if (m.tipo !== 'listo') return;
        clearTimeout(plazo);
        dejar();
        resolver(sesion);
      });
    });
    iframe.setAttribute('srcdoc', documento);
    return listo;
  }

  // Audita un HTML en un iframe oculto que se elimina al terminar (para verificar correcciones).
  async auditarHtml(html: string, baseHref?: string): Promise<ResultadoAuditoria> {
    const iframe = document.createElement('iframe');
    iframe.title = 'Auditoría en segundo plano';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    // Tamaño de escritorio fuera de la pantalla: el contraste y el layout se calculan como en una
    // ventana real.
    Object.assign(iframe.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      width: '1280px',
      height: '800px',
    });
    document.body.append(iframe);
    try {
      const sesion = await this.abrir(iframe, html, baseHref);
      try {
        return await sesion.auditar();
      } finally {
        sesion.cerrar();
      }
    } finally {
      iframe.remove();
    }
  }
}

// Para usar en componentes: cierra la sesión cuando el componente se destruye.
export function cerrarAlDestruir(sesion: SesionAislada): void {
  inject(DestroyRef).onDestroy(() => sesion.cerrar());
}
