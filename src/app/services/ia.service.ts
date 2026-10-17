import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { FragmentoParaIA } from '../auditor/lotes';

export interface ProblemaParaIA {
  regla: string;
  ayuda: string;
  nodos: { selector: string; html: string }[];
}

export interface CorreccionProblema {
  regla: string;
  selector: string;
  explicacion: string;
  original: string;
  corregido: string;
}

export interface RespuestaCorreccion {
  problemas: CorreccionProblema[];
  documento: string;
  desdeCache: boolean;
}

export interface PaginaParaIA {
  idioma: string;
  titulo: string;
}

export interface CorreccionFragmento {
  id: string;
  explicacion: string;
  corregido: string;
  desdeCache: boolean;
}

export interface RespuestaFragmentos {
  fragmentos: CorreccionFragmento[];
  sinRespuesta: string[]; // ids que la IA no devolvió bien ni al reintentar
}

// Explicación en español simple y corrección propuesta por Gemini (validada en el servidor).
@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly http = inject(HttpClient);

  // Un lote de fragmentos (docs/ia.md del backend): el documento nunca viaja.
  corregirFragmentos(
    pagina: PaginaParaIA,
    fragmentos: FragmentoParaIA[],
  ): Observable<RespuestaFragmentos> {
    return this.http.post<RespuestaFragmentos>(`${environment.apiUrl}/ia/fragmentos`, {
      pagina,
      fragmentos,
    });
  }

  corregir(html: string, problemas: ProblemaParaIA[]): Observable<RespuestaCorreccion> {
    return this.http.post<RespuestaCorreccion>(`${environment.apiUrl}/ia/corregir`, {
      html,
      problemas,
    });
  }
}
