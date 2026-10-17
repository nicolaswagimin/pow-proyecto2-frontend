import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

// Explicación en español simple y corrección propuesta por Gemini (validada en el servidor).
@Injectable({ providedIn: 'root' })
export class IaService {
  private readonly http = inject(HttpClient);

  corregir(html: string, problemas: ProblemaParaIA[]): Observable<RespuestaCorreccion> {
    return this.http.post<RespuestaCorreccion>(`${environment.apiUrl}/ia/corregir`, {
      html,
      problemas,
    });
  }
}
